import { spawn, type IPty } from 'node-pty';
import { EventEmitter } from 'node:events';
import os from 'node:os';

// Manages OS-level PTY processes keyed by client-supplied id. Renderer owns
// the lifecycle (create on tab open, dispose on tab close); main owns the
// process and fans out data via per-session EventEmitters.
interface Session {
  id: string;
  proc: IPty;
  emitter: EventEmitter;
}

export type PtyEvent =
  | { type: 'data'; payload: string }
  | { type: 'exit'; payload: { exitCode: number; signal?: number } };

export class PtyService {
  private sessions = new Map<string, Session>();

  create(input: { id: string; cols: number; rows: number; cwd?: string }): { id: string } {
    if (this.sessions.has(input.id)) return { id: input.id };

    // Pick the user's login shell on POSIX, fall back to bash. On Windows
    // prefer powershell — node-pty maps that to ConPTY automatically.
    const shell =
      process.platform === 'win32'
        ? process.env.ComSpec || 'powershell.exe'
        : process.env.SHELL || '/bin/bash';

    const proc = spawn(shell, [], {
      name: 'xterm-256color',
      cols: Math.max(1, input.cols),
      rows: Math.max(1, input.rows),
      cwd: input.cwd || os.homedir(),
      env: process.env as Record<string, string>,
    });

    const emitter = new EventEmitter();
    const session: Session = { id: input.id, proc, emitter };

    proc.onData((data) => {
      emitter.emit('event', { type: 'data', payload: data } satisfies PtyEvent);
    });
    // Only delete the map entry on exit if THIS session is still the one
    // registered under this id — otherwise a torn-down proc's late onExit
    // callback would clobber a newly-created session that happens to share
    // the same id (e.g. React StrictMode double-mount).
    proc.onExit(({ exitCode, signal }) => {
      emitter.emit('event', {
        type: 'exit',
        payload: { exitCode, signal },
      } satisfies PtyEvent);
      if (this.sessions.get(input.id) === session) {
        this.sessions.delete(input.id);
      }
    });

    this.sessions.set(input.id, session);
    return { id: input.id };
  }

  write(id: string, data: string): void {
    this.sessions.get(id)?.proc.write(data);
  }

  resize(id: string, cols: number, rows: number): void {
    const s = this.sessions.get(id);
    if (!s) return;
    try {
      s.proc.resize(Math.max(1, cols), Math.max(1, rows));
    } catch {
      // Resize can throw if the proc just exited; safe to ignore.
    }
  }

  dispose(id: string): void {
    const s = this.sessions.get(id);
    if (!s) return;
    try {
      s.proc.kill();
    } catch {
      // Already exited.
    }
    this.sessions.delete(id);
  }

  // Async generator that yields PTY events for a session until the process
  // exits or the consumer aborts. Used by the oRPC streaming endpoint so the
  // renderer gets a long-lived event stream per terminal tab.
  async *subscribe(id: string, signal?: AbortSignal): AsyncGenerator<PtyEvent> {
    const s = this.sessions.get(id);
    if (!s) return;

    const queue: PtyEvent[] = [];
    let resolveNext: (() => void) | null = null;
    const onEvent = (ev: PtyEvent) => {
      queue.push(ev);
      resolveNext?.();
      resolveNext = null;
    };
    s.emitter.on('event', onEvent);

    const onAbort = () => {
      resolveNext?.();
      resolveNext = null;
    };
    signal?.addEventListener('abort', onAbort);

    try {
      while (!signal?.aborted) {
        if (queue.length === 0) {
          await new Promise<void>((resolve) => {
            resolveNext = resolve;
          });
          continue;
        }
        const ev = queue.shift()!;
        yield ev;
        if (ev.type === 'exit') return;
      }
    } finally {
      s.emitter.off('event', onEvent);
      signal?.removeEventListener('abort', onAbort);
    }
  }

  disposeAll(): void {
    for (const id of [...this.sessions.keys()]) this.dispose(id);
  }
}
