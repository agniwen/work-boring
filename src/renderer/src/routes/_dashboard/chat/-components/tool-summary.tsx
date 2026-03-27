import type { ToolPart } from '@renderer/components/ai-elements/tool';
import type { ReactNode } from 'react';

export function getToolTitle(part: ToolPart) {
  return part.type === 'dynamic-tool' ? part.toolName : part.type.split('-').slice(1).join('-');
}

function getObjectValue(input: unknown, key: string) {
  if (input && typeof input === 'object' && key in input) {
    return (input as Record<string, unknown>)[key];
  }

  return undefined;
}

function formatSummaryValue(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value === 'string') {
    return value.length > 140 ? `${value.slice(0, 137)}...` : value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.join(', ');
  }

  return null;
}

type ToolSummaryRenderer = (part: ToolPart) => ReactNode | null;

function quoteShellValue(value: string) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

const renderBashSummary: ToolSummaryRenderer = (part) => {
  const command = getObjectValue(part.input, 'command');
  const cwd = getObjectValue(part.input, 'cwd');
  const timeoutMs = getObjectValue(part.input, 'timeoutMs');

  if (getToolTitle(part) !== 'bash' || typeof command !== 'string') {
    return null;
  }

  return (
    <div className='space-y-1.5 rounded-md bg-muted/3 px-2.5 py-2'>
      <div className='flex flex-wrap items-center gap-1.5 text-[11px] leading-4.5 text-muted-foreground/80'>
        {typeof cwd === 'string' ? <span className='font-mono'>cwd {cwd}</span> : null}
        {typeof timeoutMs === 'number' ? <span className='font-mono'>{timeoutMs}ms</span> : null}
      </div>
      <pre className='overflow-x-auto font-mono text-xs leading-4.5 whitespace-pre-wrap text-foreground/88'>
        {command}
      </pre>
    </div>
  );
};

const renderReadSummary: ToolSummaryRenderer = (part) => {
  const path = getObjectValue(part.input, 'path');

  if (getToolTitle(part) !== 'read' || typeof path !== 'string') {
    return null;
  }

  return (
    <div className='rounded-md bg-muted/3 px-2.5 py-2'>
      <div className='mb-1 text-[11px] leading-4.5 font-medium tracking-wide text-muted-foreground/80 uppercase'>
        Reading
      </div>
      <div className='font-mono text-xs leading-4.5 break-all text-foreground/88'>{path}</div>
    </div>
  );
};

const renderWriteSummary: ToolSummaryRenderer = (part) => {
  const path = getObjectValue(part.input, 'path');
  const content = getObjectValue(part.input, 'content');
  const mode = getObjectValue(part.input, 'mode');

  if (getToolTitle(part) !== 'write' || typeof path !== 'string') {
    return null;
  }

  return (
    <div className='space-y-1.5 rounded-md bg-muted/3 px-2.5 py-2'>
      <div className='flex flex-wrap items-center gap-1.5 text-[11px] leading-4.5 text-muted-foreground/80'>
        <span className='font-medium uppercase'>Writing</span>
        {typeof mode === 'string' ? <span className='font-mono'>{mode}</span> : null}
      </div>
      <div className='font-mono text-xs leading-4.5 break-all text-foreground/88'>{path}</div>
      {typeof content === 'string' ? (
        <pre className='max-h-64 overflow-auto rounded-sm bg-background/45 px-2 py-1.5 font-mono text-xs leading-4.5 whitespace-pre-wrap text-foreground/88'>
          {content}
        </pre>
      ) : null}
    </div>
  );
};

const renderGrepSummary: ToolSummaryRenderer = (part) => {
  const pattern = getObjectValue(part.input, 'pattern');
  const path = getObjectValue(part.input, 'path');
  const glob = getObjectValue(part.input, 'glob');
  const literal = getObjectValue(part.input, 'literal');
  const caseSensitive = getObjectValue(part.input, 'caseSensitive');

  if (getToolTitle(part) !== 'grep' || typeof pattern !== 'string') {
    return null;
  }

  const commandParts = ['rg', '--line-number'];

  if (caseSensitive === false) {
    commandParts.push('--ignore-case');
  }

  if (literal === true) {
    commandParts.push('--fixed-strings');
  }

  if (typeof glob === 'string') {
    commandParts.push('-g', quoteShellValue(glob));
  }

  commandParts.push(quoteShellValue(pattern));

  if (typeof path === 'string') {
    commandParts.push(quoteShellValue(path));
  }

  return (
    <div className='space-y-1.5 rounded-md bg-muted/3 px-2.5 py-2'>
      <div className='flex flex-wrap items-center gap-1.5 text-[11px] leading-4.5 text-muted-foreground/80'>
        <span className='font-medium uppercase'>Search</span>
        {typeof path === 'string' ? <span className='font-mono'>{path}</span> : null}
        {typeof glob === 'string' ? <span className='font-mono'>{glob}</span> : null}
        {typeof literal === 'boolean' ? (
          <span className='font-mono'>{literal ? 'literal' : 'regex'}</span>
        ) : null}
        {typeof caseSensitive === 'boolean' ? (
          <span className='font-mono'>{caseSensitive ? 'case-sensitive' : 'ignore-case'}</span>
        ) : null}
      </div>
      <pre className='overflow-x-auto font-mono text-xs leading-4.5 whitespace-pre-wrap text-foreground/88'>
        {commandParts.join(' ')}
      </pre>
    </div>
  );
};

const summaryRenderers: ToolSummaryRenderer[] = [
  renderBashSummary,
  renderReadSummary,
  renderWriteSummary,
  renderGrepSummary,
];

function renderFallbackSummary(part: ToolPart) {
  if (!part.input || typeof part.input !== 'object') {
    return null;
  }

  const entries = Object.entries(part.input)
    .map(([key, value]) => ({ key, value: formatSummaryValue(value) }))
    .filter((entry) => entry.value !== null);

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className='rounded-md bg-muted/3 px-2.5 py-2'>
      <div className='space-y-1'>
        {entries.map((entry) => (
          <div className='flex items-start gap-2 text-xs leading-4.5' key={entry.key}>
            <span className='shrink-0 font-medium text-muted-foreground/80'>{entry.key}</span>
            <span className='break-all text-foreground/88'>{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ToolSummary({ part }: { part: ToolPart }) {
  for (const renderSummary of summaryRenderers) {
    const summary = renderSummary(part);

    if (summary) {
      return summary;
    }
  }

  return renderFallbackSummary(part);
}
