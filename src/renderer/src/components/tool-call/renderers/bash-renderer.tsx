import { Terminal } from 'lucide-react';

import { ToolLayout } from '../tool-layout';
import type { ToolRendererProps } from './types';

// Ported bash renderer. codez's bash tool returns
// {command, cwd, exitCode, failed, timedOut, stdout, stderr, ...} — no
// `success` field, so we derive error state from `failed` or a non-zero
// exitCode and surface `exit N` in the error meta slot.
export function BashRenderer({ part, state, onApprove, onDeny }: ToolRendererProps) {
  const input = (part.input ?? {}) as { command?: string; cwd?: string; timeoutMs?: number };
  const command = input.command ?? '';
  const cwd = input.cwd;
  const timeoutMs = input.timeoutMs;

  const output =
    part.state === 'output-available'
      ? (part.output as {
          exitCode?: number;
          failed?: boolean;
          timedOut?: boolean;
          stdout?: string;
          stderr?: string;
        })
      : undefined;

  const exitCode = output?.exitCode;
  const stdout = output?.stdout ?? '';
  const stderr = output?.stderr ?? '';
  const hasOutput = Boolean(stdout || stderr);
  const isError = Boolean(output?.failed) || (typeof exitCode === 'number' && exitCode !== 0);
  const combinedOutput = [stdout, stderr].filter(Boolean).join('\n').trim();

  const mergedState =
    isError && !state.error
      ? {
          ...state,
          error: output?.timedOut ? 'Command timed out' : `Exit code ${exitCode ?? 'unknown'}`,
        }
      : state;

  const meta =
    cwd && cwd !== '.' ? (
      <span className='font-mono'>cwd {cwd}</span>
    ) : timeoutMs ? (
      <span className='font-mono'>{timeoutMs}ms</span>
    ) : undefined;

  const errorMeta =
    isError && exitCode !== undefined
      ? `exit ${exitCode}`
      : output?.timedOut
        ? 'timeout'
        : undefined;

  const expandedContent = output ? (
    isError ? (
      hasOutput ? (
        <pre className='max-h-64 overflow-auto rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2 font-mono text-xs leading-relaxed whitespace-pre-wrap text-red-400'>
          {combinedOutput}
        </pre>
      ) : undefined
    ) : (
      <pre className='max-h-64 overflow-auto rounded-md border border-border bg-muted/50 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground'>
        {hasOutput ? combinedOutput : '(No output)'}
      </pre>
    )
  ) : undefined;

  return (
    <ToolLayout
      errorMeta={errorMeta}
      expandedContent={expandedContent}
      icon={<Terminal className='h-3.5 w-3.5' />}
      meta={meta}
      name='Bash'
      onApprove={onApprove}
      onDeny={onDeny}
      state={mergedState}
      summary={command || '...'}
      summaryClassName='font-mono'
    />
  );
}
