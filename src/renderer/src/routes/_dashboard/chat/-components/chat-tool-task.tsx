import {
  CaretDownIcon as ChevronDownIcon,
  CheckCircleIcon,
  CircleDashedIcon,
  CircleNotchIcon,
} from '@phosphor-icons/react';
import {
  Task,
  TaskContent,
  TaskItem,
  TaskItemFile,
  TaskTrigger,
} from '@renderer/components/ai-elements/task';
import { cn } from '@renderer/lib/utils';
import type { ToolPart } from '@renderer/components/ai-elements/tool';
import { getToolTitle } from './tool-summary';

// Tools that should render as a compact `Task` card (retrieval-style actions).
// Other tools fall back to the existing `Tool` card in chat-message-part.tsx.
const TASK_TOOL_NAMES = new Set([
  'read',
  'grep',
  'glob',
  'list',
  'bash',
  'loadSkill',
  'plan',
]);

const BASH_TITLE_MAX_LENGTH = 80;
const BASH_OUTPUT_PREVIEW_LINES = 20;

function truncateForTitle(value: string) {
  const singleLine = value.replace(/\s+/g, ' ').trim();
  return singleLine.length > BASH_TITLE_MAX_LENGTH
    ? `${singleLine.slice(0, BASH_TITLE_MAX_LENGTH - 1)}…`
    : singleLine;
}

function takeOutputPreview(value: string) {
  const lines = value.split('\n');
  if (lines.length <= BASH_OUTPUT_PREVIEW_LINES) {
    return { text: value, truncated: false };
  }
  return {
    text: lines.slice(0, BASH_OUTPUT_PREVIEW_LINES).join('\n'),
    truncated: true,
  };
}

function getObjectValue(input: unknown, key: string) {
  if (input && typeof input === 'object' && key in input) {
    return (input as Record<string, unknown>)[key];
  }
  return undefined;
}

// Map tool state → human-readable verb for the Task title.
// Keeps the "in progress" vs "done" vs "error" distinction without the Tool card's state icon.
function getTaskStatusPrefix(
  state: ToolPart['state'],
  verbs: { streaming: string; done: string; error: string },
) {
  if (state === 'output-error') {
    return verbs.error;
  }
  if (state === 'output-available' || state === 'output-denied') {
    return verbs.done;
  }
  return verbs.streaming;
}

function renderReadTask(part: ToolPart) {
  const path = getObjectValue(part.input, 'path');
  if (typeof path !== 'string') {
    return null;
  }

  const startLine = getObjectValue(part.input, 'startLine');
  const endLine = getObjectValue(part.input, 'endLine');
  const rangeLabel =
    typeof startLine === 'number' && typeof endLine === 'number'
      ? ` (L${startLine}–${endLine})`
      : typeof startLine === 'number'
        ? ` (from L${startLine})`
        : '';

  const prefix = getTaskStatusPrefix(part.state, {
    streaming: 'Reading',
    done: 'Read',
    error: 'Failed to read',
  });

  return (
    <Task>
      <TaskTrigger title={`${prefix} ${path}${rangeLabel}`} />
      <TaskContent>
        <TaskItem>
          <TaskItemFile>
            <span className='font-mono'>{path}</span>
          </TaskItemFile>
        </TaskItem>
        {part.state === 'output-error' && part.errorText ? (
          <TaskItem className='text-destructive'>{part.errorText}</TaskItem>
        ) : null}
      </TaskContent>
    </Task>
  );
}

interface GrepMatch {
  path: string;
  lineNumber: number;
  content: string;
}

function getGrepMatches(part: ToolPart): GrepMatch[] {
  if (part.state !== 'output-available' || !part.output || typeof part.output !== 'object') {
    return [];
  }
  const matches = (part.output as { matches?: unknown }).matches;
  return Array.isArray(matches) ? (matches as GrepMatch[]) : [];
}

function renderGrepTask(part: ToolPart) {
  const pattern = getObjectValue(part.input, 'pattern');
  if (typeof pattern !== 'string') {
    return null;
  }

  const searchPath = getObjectValue(part.input, 'path');
  const matches = getGrepMatches(part);

  // Group matches by file so each file becomes a single TaskItemFile chip with a hit count.
  const matchesByFile = new Map<string, number>();
  for (const match of matches) {
    matchesByFile.set(match.path, (matchesByFile.get(match.path) ?? 0) + 1);
  }

  const truncated =
    part.state === 'output-available' &&
    part.output &&
    typeof part.output === 'object' &&
    (part.output as { truncated?: boolean }).truncated === true;

  const prefix = getTaskStatusPrefix(part.state, {
    streaming: 'Searching for',
    done: 'Searched for',
    error: 'Failed searching for',
  });

  const titleSuffix =
    part.state === 'output-available'
      ? matchesByFile.size === 0
        ? ' — no matches'
        : ` — ${matches.length} match${matches.length === 1 ? '' : 'es'} in ${matchesByFile.size} file${matchesByFile.size === 1 ? '' : 's'}${truncated ? '+' : ''}`
      : '';

  return (
    <Task>
      <TaskTrigger
        title={`${prefix} "${pattern}"${typeof searchPath === 'string' ? ` in ${searchPath}` : ''}${titleSuffix}`}
      />
      <TaskContent>
        {matchesByFile.size === 0 ? (
          part.state === 'output-available' ? (
            <TaskItem>No matches.</TaskItem>
          ) : null
        ) : (
          <TaskItem className='flex flex-wrap gap-1.5'>
            {Array.from(matchesByFile.entries()).map(([path, count]) => (
              <TaskItemFile key={path}>
                <span className='font-mono'>{path}</span>
                {count > 1 ? (
                  <span className='text-muted-foreground'>×{count}</span>
                ) : null}
              </TaskItemFile>
            ))}
          </TaskItem>
        )}
        {part.state === 'output-error' && part.errorText ? (
          <TaskItem className='text-destructive'>{part.errorText}</TaskItem>
        ) : null}
      </TaskContent>
    </Task>
  );
}

function renderLoadSkillTask(part: ToolPart) {
  const name = getObjectValue(part.input, 'name');
  if (typeof name !== 'string') {
    return null;
  }

  const skillDirectory =
    part.state === 'output-available' && part.output && typeof part.output === 'object'
      ? (part.output as { skillDirectory?: unknown }).skillDirectory
      : undefined;

  const outputError =
    part.state === 'output-available' && part.output && typeof part.output === 'object'
      ? (part.output as { error?: unknown }).error
      : undefined;

  const prefix = getTaskStatusPrefix(part.state, {
    streaming: 'Loading skill',
    done: typeof outputError === 'string' ? 'Skill not found' : 'Loaded skill',
    error: 'Failed loading skill',
  });

  return (
    <Task>
      <TaskTrigger title={`${prefix} ${name}`} />
      <TaskContent>
        {typeof skillDirectory === 'string' ? (
          <TaskItem>
            <TaskItemFile>
              <span className='font-mono'>{skillDirectory}</span>
            </TaskItemFile>
          </TaskItem>
        ) : null}
        {typeof outputError === 'string' ? (
          <TaskItem className='text-destructive'>{outputError}</TaskItem>
        ) : null}
        {part.state === 'output-error' && part.errorText ? (
          <TaskItem className='text-destructive'>{part.errorText}</TaskItem>
        ) : null}
      </TaskContent>
    </Task>
  );
}

interface GlobMatch {
  path: string;
  mtimeMs: number;
}

function renderGlobTask(part: ToolPart) {
  const pattern = getObjectValue(part.input, 'pattern');
  if (typeof pattern !== 'string') {
    return null;
  }

  const searchPath = getObjectValue(part.input, 'path');
  const matches =
    part.state === 'output-available' &&
    part.output &&
    typeof part.output === 'object' &&
    Array.isArray((part.output as { matches?: unknown }).matches)
      ? ((part.output as { matches: GlobMatch[] }).matches)
      : [];

  const truncated =
    part.state === 'output-available' &&
    part.output &&
    typeof part.output === 'object' &&
    (part.output as { truncated?: boolean }).truncated === true;

  const prefix = getTaskStatusPrefix(part.state, {
    streaming: 'Finding files',
    done: 'Found files',
    error: 'Failed finding files',
  });

  const titleSuffix =
    part.state === 'output-available'
      ? matches.length === 0
        ? ' — no matches'
        : ` — ${matches.length} file${matches.length === 1 ? '' : 's'}${truncated ? '+' : ''}`
      : '';

  return (
    <Task>
      <TaskTrigger
        title={`${prefix} matching "${pattern}"${typeof searchPath === 'string' ? ` in ${searchPath}` : ''}${titleSuffix}`}
      />
      <TaskContent>
        {matches.length === 0 ? (
          part.state === 'output-available' ? (
            <TaskItem>No files matched.</TaskItem>
          ) : null
        ) : (
          <TaskItem className='flex flex-wrap gap-1.5'>
            {matches.map((match) => (
              <TaskItemFile key={match.path}>
                <span className='font-mono'>{match.path}</span>
              </TaskItemFile>
            ))}
          </TaskItem>
        )}
        {part.state === 'output-error' && part.errorText ? (
          <TaskItem className='text-destructive'>{part.errorText}</TaskItem>
        ) : null}
      </TaskContent>
    </Task>
  );
}

interface ListEntry {
  path: string;
  kind: 'file' | 'dir';
}

function renderListTask(part: ToolPart) {
  const searchPath = getObjectValue(part.input, 'path');
  const entries =
    part.state === 'output-available' &&
    part.output &&
    typeof part.output === 'object' &&
    Array.isArray((part.output as { entries?: unknown }).entries)
      ? ((part.output as { entries: ListEntry[] }).entries)
      : [];

  const truncated =
    part.state === 'output-available' &&
    part.output &&
    typeof part.output === 'object' &&
    (part.output as { truncated?: boolean }).truncated === true;

  const fileCount = entries.filter((entry) => entry.kind === 'file').length;
  const dirCount = entries.length - fileCount;

  const prefix = getTaskStatusPrefix(part.state, {
    streaming: 'Listing',
    done: 'Listed',
    error: 'Failed listing',
  });

  const target = typeof searchPath === 'string' && searchPath.length > 0 ? searchPath : '.';
  const titleSuffix =
    part.state === 'output-available'
      ? ` — ${fileCount} file${fileCount === 1 ? '' : 's'}, ${dirCount} dir${dirCount === 1 ? '' : 's'}${truncated ? '+' : ''}`
      : '';

  return (
    <Task>
      <TaskTrigger title={`${prefix} ${target}${titleSuffix}`} />
      <TaskContent>
        {entries.length === 0 ? (
          part.state === 'output-available' ? (
            <TaskItem>Empty directory.</TaskItem>
          ) : null
        ) : (
          <TaskItem className='flex flex-wrap gap-1.5'>
            {entries.map((entry) => (
              <TaskItemFile key={`${entry.kind}:${entry.path}`}>
                <span className='font-mono'>
                  {entry.path}
                  {entry.kind === 'dir' ? '/' : ''}
                </span>
              </TaskItemFile>
            ))}
          </TaskItem>
        )}
        {part.state === 'output-error' && part.errorText ? (
          <TaskItem className='text-destructive'>{part.errorText}</TaskItem>
        ) : null}
      </TaskContent>
    </Task>
  );
}

interface BashOutput {
  exitCode?: number | null;
  failed?: boolean;
  timedOut?: boolean;
  stdout?: string;
  stdoutTruncated?: boolean;
  stderr?: string;
  stderrTruncated?: boolean;
}

function getBashOutput(part: ToolPart): BashOutput | null {
  if (part.state !== 'output-available' || !part.output || typeof part.output !== 'object') {
    return null;
  }
  return part.output as BashOutput;
}

function renderBashTask(part: ToolPart) {
  const command = getObjectValue(part.input, 'command');
  if (typeof command !== 'string') {
    return null;
  }

  const cwd = getObjectValue(part.input, 'cwd');
  const output = getBashOutput(part);
  const succeeded = output ? output.exitCode === 0 && !output.failed && !output.timedOut : false;

  // Status suffix gives a quick at-a-glance result without expanding the card.
  const statusSuffix = (() => {
    if (part.state === 'output-error') {
      return ' — error';
    }
    if (part.state === 'output-denied') {
      return ' — denied';
    }
    if (!output) {
      return '';
    }
    if (output.timedOut) {
      return ' — timed out';
    }
    if (succeeded) {
      return '';
    }
    return ` — exit ${output.exitCode ?? '?'}`;
  })();

  const prefix = getTaskStatusPrefix(part.state, {
    streaming: 'Running',
    done: succeeded ? 'Ran' : 'Ran',
    error: 'Failed running',
  });

  const titleCommand = truncateForTitle(command);

  const stdoutPreview = output?.stdout ? takeOutputPreview(output.stdout) : null;
  const stderrPreview = output?.stderr ? takeOutputPreview(output.stderr) : null;

  return (
    <Task>
      <TaskTrigger title={`${prefix} \`${titleCommand}\`${statusSuffix}`} />
      <TaskContent>
        <TaskItem>
          <pre className='overflow-x-auto rounded-md bg-muted/5 px-2.5 py-2 font-mono text-xs leading-4.5 whitespace-pre-wrap text-foreground/88'>
            {command}
          </pre>
        </TaskItem>
        {typeof cwd === 'string' && cwd !== '.' ? (
          <TaskItem className='text-[11px]'>
            <span className='font-mono'>cwd {cwd}</span>
          </TaskItem>
        ) : null}
        {stdoutPreview && stdoutPreview.text.length > 0 ? (
          <TaskItem>
            <div className='mb-1 text-[11px] font-medium tracking-wide text-muted-foreground/80 uppercase'>
              stdout
            </div>
            <pre className='overflow-x-auto rounded-md bg-muted/5 px-2.5 py-2 font-mono text-xs leading-4.5 whitespace-pre-wrap text-foreground/88'>
              {stdoutPreview.text}
              {stdoutPreview.truncated || output?.stdoutTruncated ? '\n…' : null}
            </pre>
          </TaskItem>
        ) : null}
        {stderrPreview && stderrPreview.text.length > 0 ? (
          <TaskItem>
            <div className='mb-1 text-[11px] font-medium tracking-wide text-muted-foreground/80 uppercase'>
              stderr
            </div>
            <pre className='overflow-x-auto rounded-md bg-muted/5 px-2.5 py-2 font-mono text-xs leading-4.5 whitespace-pre-wrap text-destructive/90'>
              {stderrPreview.text}
              {stderrPreview.truncated || output?.stderrTruncated ? '\n…' : null}
            </pre>
          </TaskItem>
        ) : null}
        {part.state === 'output-error' && part.errorText ? (
          <TaskItem className='text-destructive'>{part.errorText}</TaskItem>
        ) : null}
      </TaskContent>
    </Task>
  );
}

type PlanTaskStatus = 'pending' | 'in_progress' | 'completed';

interface PlanItemFile {
  name: string;
  icon: string;
  color?: string;
}

interface PlanItem {
  type: 'text' | 'file';
  text: string;
  file?: PlanItemFile;
}

interface PlanTask {
  title: string;
  status: PlanTaskStatus;
  items: PlanItem[];
}

// Icon tag → tint for the file chip dot. Uses Tailwind tokens that exist at build time so the
// class names are statically detectable.
const PLAN_ICON_COLORS: Record<string, string> = {
  react: 'bg-sky-400',
  typescript: 'bg-blue-500',
  javascript: 'bg-yellow-400',
  css: 'bg-purple-500',
  html: 'bg-orange-500',
  json: 'bg-emerald-500',
  markdown: 'bg-slate-400',
  shell: 'bg-zinc-500',
  sql: 'bg-cyan-500',
  python: 'bg-amber-400',
  go: 'bg-teal-400',
  rust: 'bg-orange-600',
  image: 'bg-pink-400',
  other: 'bg-muted-foreground/60',
};

function PlanTaskStatusIcon({ status }: { status: PlanTaskStatus }) {
  const className = 'size-4 shrink-0';
  if (status === 'completed') {
    return <CheckCircleIcon className={cn(className, 'text-emerald-500')} weight='fill' />;
  }
  if (status === 'in_progress') {
    return <CircleNotchIcon className={cn(className, 'animate-spin text-sky-500')} />;
  }
  return <CircleDashedIcon className={cn(className, 'text-muted-foreground/60')} />;
}

function PlanFileChip({ file }: { file: PlanItemFile }) {
  // Custom color wins over the icon lookup so the model can override the palette per file.
  const dotClass = file.color ? undefined : PLAN_ICON_COLORS[file.icon] ?? PLAN_ICON_COLORS.other;
  const dotStyle = file.color ? { backgroundColor: file.color } : undefined;

  return (
    <TaskItemFile>
      <span className={cn('inline-block size-2 rounded-full', dotClass)} style={dotStyle} />
      <span className='font-mono'>{file.name}</span>
    </TaskItemFile>
  );
}

function getPlanTasks(part: ToolPart): PlanTask[] {
  // Prefer the output copy so completed/in_progress state matches what the tool echoed.
  // Fall back to the streaming input while the tool call is still in flight.
  if (
    part.state === 'output-available' &&
    part.output &&
    typeof part.output === 'object' &&
    Array.isArray((part.output as { tasks?: unknown }).tasks)
  ) {
    return (part.output as { tasks: PlanTask[] }).tasks;
  }

  const inputTasks = getObjectValue(part.input, 'tasks');
  return Array.isArray(inputTasks) ? (inputTasks as PlanTask[]) : [];
}

function renderPlanTask(part: ToolPart) {
  const tasks = getPlanTasks(part);
  if (tasks.length === 0) {
    return null;
  }

  return (
    <div className='flex flex-col gap-2'>
      {tasks.map((task, taskIndex) => (
        <Task
          // Auto-expand the in-progress task so the user always sees live activity;
          // completed/pending tasks collapse by default to keep the plan scannable.
          defaultOpen={task.status === 'in_progress'}
          key={`${taskIndex}-${task.title}`}
        >
          <TaskTrigger title=''>
            <div className='group flex w-full cursor-pointer items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-foreground'>
              <PlanTaskStatusIcon status={task.status} />
              <p
                className={cn(
                  'flex-1 text-left text-sm',
                  task.status === 'completed' && 'text-muted-foreground/60 line-through',
                  task.status === 'in_progress' && 'text-foreground',
                )}
              >
                {task.title}
              </p>
              <ChevronDownIcon className='size-4 transition-transform group-data-[state=open]:rotate-180' />
            </div>
          </TaskTrigger>
          <TaskContent>
            {task.items.map((item, itemIndex) => (
              <TaskItem
                className='flex flex-wrap items-center gap-1.5'
                key={`${itemIndex}-${item.text}`}
              >
                <span className='whitespace-normal'>{item.text}</span>
                {item.type === 'file' && item.file ? <PlanFileChip file={item.file} /> : null}
              </TaskItem>
            ))}
          </TaskContent>
        </Task>
      ))}
    </div>
  );
}

// Renders a retrieval-style tool as a Task card. Returns null so the caller
// can fall back to the regular Tool card for unsupported tools or when an
// approval decision is still pending (the approval UX lives in the Tool path).
export function renderToolAsTask(part: ToolPart) {
  const toolName = getToolTitle(part);
  if (!TASK_TOOL_NAMES.has(toolName)) {
    return null;
  }

  // Keep the full Tool card whenever approval is in the loop so the
  // approve/deny buttons and approval history stay visible.
  if ('approval' in part && part.approval) {
    return null;
  }

  if (toolName === 'read') {
    return renderReadTask(part);
  }
  if (toolName === 'grep') {
    return renderGrepTask(part);
  }
  if (toolName === 'glob') {
    return renderGlobTask(part);
  }
  if (toolName === 'list') {
    return renderListTask(part);
  }
  if (toolName === 'bash') {
    return renderBashTask(part);
  }
  if (toolName === 'loadSkill') {
    return renderLoadSkillTask(part);
  }
  if (toolName === 'plan') {
    return renderPlanTask(part);
  }
  return null;
}

// Helpers for messages-pane to collapse repeated plan snapshots within one message.
// The assistant often calls `plan` several times per turn to update task statuses — we only want
// to render the LATEST snapshot and hide the earlier ones, so the plan appears to "update in place".
const PLAN_PART_TYPE = 'tool-plan';

export function computeSkippedPartIndices(
  parts: ReadonlyArray<{ type: string }>,
): ReadonlySet<number> {
  let lastPlanIndex = -1;

  for (let index = 0; index < parts.length; index += 1) {
    if (parts[index].type === PLAN_PART_TYPE) {
      lastPlanIndex = index;
    }
  }

  if (lastPlanIndex === -1) {
    return new Set();
  }

  const skipped = new Set<number>();
  for (let index = 0; index < parts.length; index += 1) {
    if (parts[index].type === PLAN_PART_TYPE && index !== lastPlanIndex) {
      skipped.add(index);
    }
  }
  return skipped;
}
