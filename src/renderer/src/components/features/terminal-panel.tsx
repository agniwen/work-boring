import { PlusIcon, XIcon } from '@phosphor-icons/react';
import { terminalHeightAtom, terminalOpenAtom } from '@renderer/atom/app';
import { Button } from '@renderer/components/ui/button';
import { orpcClient } from '@renderer/lib/orpc';
import { cn } from '@renderer/lib/utils';
import { Terminal, useTerminal } from '@wterm/react';
import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai';
import { motion } from 'motion/react';
import { nanoid } from 'nanoid';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const MIN_HEIGHT = 160;
const MIN_WIDTH = 360;

interface TerminalTab {
  id: string;
  title: string;
}

const terminalTabsAtom = atom<TerminalTab[]>([]);
const activeTerminalTabIdAtom = atom<string | null>(null);

// Ensures one tab exists when the panel opens; returns helpers for tab CRUD.
function useTerminalTabs() {
  const [tabs, setTabs] = useAtom(terminalTabsAtom);
  const [activeId, setActiveId] = useAtom(activeTerminalTabIdAtom);

  const newTab = useCallback(() => {
    const id = nanoid();
    const title = `bash ${tabs.length + 1}`;
    setTabs((prev) => [...prev, { id, title }]);
    setActiveId(id);
    return id;
  }, [tabs.length, setTabs, setActiveId]);

  const closeTab = useCallback(
    (id: string) => {
      // Tear down the PTY in main; renderer cleanup happens via the
      // tab component's unmount effect once it leaves the tabs list.
      void orpcClient.terminal.dispose({ id }).catch(() => {});
      setTabs((prev) => {
        const next = prev.filter((t) => t.id !== id);
        if (activeId === id) {
          // Pick a sibling tab if we just closed the active one.
          setActiveId(next[next.length - 1]?.id ?? null);
        }
        return next;
      });
    },
    [activeId, setTabs, setActiveId],
  );

  return { tabs, activeId, setActiveId, newTab, closeTab };
}

export function TerminalPanel() {
  const [open, setOpen] = useAtom(terminalOpenAtom);
  const [height, setHeight] = useAtom(terminalHeightAtom);
  const { tabs, activeId, setActiveId, newTab, closeTab } = useTerminalTabs();

  // Lazily create the first tab when the panel is first opened.
  useEffect(() => {
    if (open && tabs.length === 0) newTab();
  }, [open, tabs.length, newTab]);

  // Drag-to-resize: compare pointer Y against the height at drag start.
  const dragStateRef = useRef<{ startY: number; startHeight: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const onHandlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      dragStateRef.current = { startY: e.clientY, startHeight: height };
      setDragging(true);
    },
    [height],
  );

  const onHandlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragStateRef.current;
      if (!drag) return;
      const delta = drag.startY - e.clientY; // dragging up grows height
      const next = Math.max(MIN_HEIGHT, drag.startHeight + delta);
      setHeight(next);
    },
    [setHeight],
  );

  const onHandlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    dragStateRef.current = null;
    setDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }, []);

  return (
    // Outer is the animating clipper: it grows in flex-flow so the content
    // above (e.g. chat composer) gets pushed up. The inner is absolutely
    // anchored at the bottom with a stable height — wterm sees a real size
    // from the moment it mounts, so its ResizeObserver wires up correctly.
    <motion.div
      initial={false}
      animate={{ height: open ? height : 0 }}
      transition={
        dragging ? { duration: 0 } : { type: 'spring', stiffness: 320, damping: 36, mass: 0.9 }
      }
      style={{ minWidth: MIN_WIDTH }}
      className={cn('relative z-30 shrink-0 overflow-hidden', !open && 'pointer-events-none')}
      aria-hidden={!open}
      aria-label='Terminal panel'
    >
      <div
        // Anchored to the bottom with explicit height — slides into view as
        // the outer clipper grows.
        style={{ height }}
        className='absolute right-0 bottom-0 left-0 flex flex-col bg-background'
      >
        <div
          role='separator'
          aria-orientation='horizontal'
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
          onPointerCancel={onHandlePointerUp}
          className='relative h-px w-full cursor-ns-resize touch-none'
        >
          <div className='absolute inset-x-0 top-0 h-px bg-border' />
        </div>

        <div className='flex h-9 items-center gap-1 border-b border-border/60 px-2'>
          <div className='flex min-w-0 flex-1 items-center gap-1 overflow-x-auto'>
            {tabs.map((tab) => (
              <TerminalTabPill
                key={tab.id}
                tab={tab}
                active={tab.id === activeId}
                onSelect={() => setActiveId(tab.id)}
                onClose={() => closeTab(tab.id)}
              />
            ))}
            <Button
              size='icon-xs'
              variant='ghost'
              onClick={() => newTab()}
              aria-label='New terminal tab'
            >
              <PlusIcon />
            </Button>
          </div>
          <Button
            size='icon-xs'
            variant='ghost'
            onClick={() => setOpen(false)}
            aria-label='Close terminal'
          >
            <XIcon />
          </Button>
        </div>

        {/* Keep all tab instances mounted so PTY sessions and scrollback are
            preserved when switching. Visibility toggled via display. */}
        <div className='relative min-h-0 flex-1'>
          {tabs.map((tab) => (
            <TerminalTabContent key={tab.id} tabId={tab.id} active={tab.id === activeId} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function TerminalTabPill({
  tab,
  active,
  onSelect,
  onClose,
}: {
  tab: TerminalTab;
  active: boolean;
  onSelect: () => void;
  onClose: () => void;
}) {
  return (
    <div
      role='tab'
      aria-selected={active}
      onClick={onSelect}
      className={cn(
        'group/tab inline-flex h-6 cursor-default items-center gap-1 rounded-md px-2 text-xs',
        active
          ? 'bg-muted text-foreground'
          : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
      )}
    >
      <span className='max-w-[120px] truncate'>{tab.title}</span>
      <button
        type='button'
        aria-label={`Close ${tab.title}`}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className='inline-flex size-3.5 items-center justify-center rounded text-muted-foreground opacity-0 group-hover/tab:opacity-100 hover:bg-foreground/10 aria-[selected=true]:opacity-100'
      >
        <XIcon className='size-3' />
      </button>
    </div>
  );
}

// One PTY session + one wterm instance per tab. Stays mounted across tab
// switches; toggled via display:none so the WTerm DOM, scrollback, and
// PTY subscription survive.
function TerminalTabContent({ tabId, active }: { tabId: string; active: boolean }) {
  const open = useAtomValue(terminalOpenAtom);
  const { ref, write, focus } = useTerminal();
  const initialSize = useMemo(() => ({ cols: 80, rows: 24 }), []);
  const readyRef = useRef(false);

  // Send keystrokes to the PTY. We don't wait on the promise — fire & forget
  // is fine for high-frequency input.
  const onData = useCallback(
    (data: string) => {
      void orpcClient.terminal.write({ id: tabId, data }).catch(() => {});
    },
    [tabId],
  );

  // Aligns the wterm element's effective inner height to an exact multiple
  // of rowHeight by absorbing the leftover into padding-bottom. Without
  // this, wterm's _scrollToBottom (which floors to a row boundary) leaves
  // ~`leftover` px of space, which (a) cuts the cursor row's bottom and
  // (b) exceeds wterm's 5px isAtBottom threshold, making it think the user
  // scrolled up so it stops auto-scrolling. Removing the leftover makes
  // wterm's own math exact and the visible scroll stable on each keystroke.
  const alignHeightToRow = useCallback(() => {
    const wt = ref.current?.instance;
    if (!wt) return;
    // _rowHeight is wterm-private but stable after first measure.
    const rh = (wt as unknown as { _rowHeight?: number })._rowHeight || 17;
    const el = wt.element;
    const leftover = el.clientHeight % rh;
    const next = `${leftover}px`;
    if (el.style.paddingBottom !== next) el.style.paddingBottom = next;
  }, [ref]);

  // Debounce resize handling. Window-edge drags fire wterm's ResizeObserver
  // dozens of times per second; we don't want to send an IPC + recompute
  // padding for every micro-step. Coalesce to the trailing edge — only the
  // final dimensions get applied once the user stops resizing.
  const resizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingResizeRef = useRef<{ cols: number; rows: number } | null>(null);

  const onResize = useCallback(
    (cols: number, rows: number) => {
      pendingResizeRef.current = { cols, rows };
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
      resizeTimerRef.current = setTimeout(() => {
        resizeTimerRef.current = null;
        const next = pendingResizeRef.current;
        pendingResizeRef.current = null;
        if (!next) return;
        void orpcClient.terminal
          .resize({ id: tabId, cols: next.cols, rows: next.rows })
          .catch(() => {});
        alignHeightToRow();
      }, 120);
    },
    [tabId, alignHeightToRow],
  );

  // Make sure pending resize doesn't fire after unmount.
  useEffect(() => {
    return () => {
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
    };
  }, []);

  // Create the PTY and subscribe to its output stream once per tab. The
  // subscription is torn down via AbortController on unmount — that triggers
  // the main-side generator to exit cleanly.
  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    (async () => {
      try {
        await orpcClient.terminal.create({
          id: tabId,
          cols: initialSize.cols,
          rows: initialSize.rows,
        });
      } catch (err) {
        console.error('terminal.create failed', err);
        return;
      }

      try {
        const iter = await orpcClient.terminal.output({ id: tabId }, { signal: controller.signal });
        for await (const ev of iter) {
          if (cancelled) break;
          if (ev.type === 'data') {
            write(ev.payload);
          } else if (ev.type === 'exit') {
            write(`\r\n[process exited with code ${ev.payload.exitCode}]\r\n`);
            break;
          }
        }
      } catch (err) {
        if (!controller.signal.aborted) console.error('terminal.output failed', err);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
      // Intentionally do NOT dispose the PTY here. React StrictMode in dev
      // double-invokes effects (mount → unmount → remount), and disposing on
      // unmount would kill the shell on every dev re-render. Disposal happens
      // explicitly via closeTab when the user hits the tab × button. The
      // service's `create` is idempotent on existing ids so a remount just
      // re-attaches the subscription to the same PTY.
    };
  }, [tabId, initialSize.cols, initialSize.rows, write]);

  // Refocus the active tab when shown (panel-open or tab-switch). wterm's
  // input textarea only exists after wasm init resolves, so we also refocus
  // on onReady. Both paths are needed: onReady covers the first-mount race,
  // this effect covers tab switches after the instance is already ready.
  useEffect(() => {
    if (active && open && readyRef.current) requestAnimationFrame(() => focus());
  }, [active, open, focus]);

  return (
    <div
      // Use `visibility` instead of `display` to hide inactive tabs.
      // display:none collapses the box to 0×0, which makes wterm's
      // autoResize ResizeObserver fire with 0 dims → wterm.resize(1, 1)
      // → the bridge's terminal grid (and its scrollback) is destroyed.
      // visibility:hidden keeps layout dimensions stable so wterm's
      // geometry — and the on-screen state — survives tab switches.
      // pointer-events: none on inactive prevents stray click capture
      // by the stacked-but-hidden tab. z-index bumps the active tab on
      // top so wterm's own click-to-focus still works.
      style={{
        visibility: active ? 'visible' : 'hidden',
        pointerEvents: active ? 'auto' : 'none',
        zIndex: active ? 1 : 0,
      }}
      // Click anywhere in the wrapper to refocus the hidden textarea.
      onMouseDown={() => focus()}
      className='absolute inset-0 overflow-hidden p-2'
    >
      <Terminal
        ref={ref}
        autoResize
        cursorBlink
        onData={onData}
        onResize={onResize}
        onReady={() => {
          readyRef.current = true;
          alignHeightToRow();
          if (active) requestAnimationFrame(() => focus());
        }}
        cols={initialSize.cols}
        rows={initialSize.rows}
        className='h-full w-full'
      />
    </div>
  );
}

export function useToggleTerminal() {
  const setOpen = useSetAtom(terminalOpenAtom);
  return useCallback(() => setOpen((v) => !v), [setOpen]);
}
