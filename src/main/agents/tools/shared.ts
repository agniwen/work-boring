import { realpath } from 'fs/promises';
import { basename, dirname, isAbsolute, relative, resolve } from 'path';

export interface WorkspaceToolContext {
  workspaceRoot: string;
}

export const DEFAULT_BASH_TIMEOUT_MS = 20_000;
export const DEFAULT_GLOB_MAX_RESULTS = 100;
export const DEFAULT_GREP_MAX_RESULTS = 50;
export const DEFAULT_LIST_MAX_RESULTS = 200;
export const DEFAULT_READ_MAX_CHARACTERS = 20_000;
export const DEFAULT_READ_WINDOW_LINES = 200;
export const MAX_BASH_TIMEOUT_MS = 60_000;
export const MAX_GLOB_MAX_RESULTS = 500;
export const MAX_GREP_RESULTS = 200;
export const MAX_LIST_MAX_RESULTS = 1_000;
export const MAX_TOOL_OUTPUT_CHARACTERS = 12_000;

// Directories skipped by default when listing files. Mirrors opencode's list tool so large vendored
// trees do not flood the agent's context.
export const DEFAULT_LIST_IGNORE_PATTERNS = [
  'node_modules/',
  '.git/',
  'dist/',
  'build/',
  'out/',
  'target/',
  'vendor/',
  '.next/',
  '.turbo/',
  '.cache/',
  'coverage/',
  '.venv/',
  'venv/',
  '__pycache__/',
  '.idea/',
  '.vscode/',
  'tmp/',
  'temp/',
];

export interface ResolvedToolPath {
  absolutePath: string;
  isWithinWorkspace: boolean;
  realCandidatePath: string;
  realWorkspaceRoot: string;
}

function isWithinRoot(rootPath: string, candidatePath: string) {
  const relativePath = relative(rootPath, candidatePath);
  return relativePath === '' || (!relativePath.startsWith('..') && !isAbsolute(relativePath));
}

async function resolveAgainstNearestExistingParent(candidatePath: string) {
  // When the target does not exist yet, resolve the nearest real parent so workspace checks still
  // honor symlinks instead of trusting the raw string path.
  const segments = [basename(candidatePath)];
  let currentPath = dirname(candidatePath);

  while (true) {
    try {
      const realCurrentPath = await realpath(currentPath);
      return resolve(realCurrentPath, ...segments.toReversed());
    } catch {
      const nextSegment = basename(currentPath);

      if (!nextSegment || nextSegment === currentPath) {
        throw new Error(`Unable to resolve path inside workspace: ${candidatePath}`);
      }

      segments.push(nextSegment);
      currentPath = dirname(currentPath);
    }
  }
}

export async function resolveWorkspacePath(
  workspaceRoot: string,
  requestedPath: string,
  options?: { allowMissing?: boolean },
) {
  // Bash and grep stay workspace-only, so they use the strict resolver.
  const resolvedPath = await resolveToolPath(workspaceRoot, requestedPath, options);

  if (!resolvedPath.isWithinWorkspace) {
    throw new Error(`Path escapes the workspace root: ${requestedPath}`);
  }

  return resolvedPath.absolutePath;
}

export async function resolveToolPath(
  workspaceRoot: string,
  requestedPath: string,
  options?: { allowMissing?: boolean },
): Promise<ResolvedToolPath> {
  // Read and write use the looser resolver so approval can be decided before rejecting paths that
  // sit outside the workspace root.
  const normalizedPath = requestedPath.trim();

  if (!normalizedPath) {
    throw new Error('Path is required.');
  }

  const absolutePath = isAbsolute(normalizedPath)
    ? resolve(normalizedPath)
    : resolve(workspaceRoot, normalizedPath);
  const realWorkspaceRoot = await realpath(workspaceRoot);

  let realCandidatePath: string;

  try {
    realCandidatePath = await realpath(absolutePath);
  } catch (error) {
    if (!options?.allowMissing) {
      throw error;
    }

    realCandidatePath = await resolveAgainstNearestExistingParent(absolutePath);
  }

  return {
    absolutePath,
    isWithinWorkspace: isWithinRoot(realWorkspaceRoot, realCandidatePath),
    realCandidatePath,
    realWorkspaceRoot,
  };
}

export function toWorkspaceRelativePath(workspaceRoot: string, absolutePath: string) {
  const relativePath = relative(workspaceRoot, absolutePath);
  return relativePath || '.';
}

export function toToolDisplayPath(
  workspaceRoot: string,
  absolutePath: string,
  isWithinWorkspace: boolean,
) {
  // Preserve absolute paths in tool output when the file lives outside the workspace.
  if (!isWithinWorkspace) {
    return absolutePath;
  }

  return toWorkspaceRelativePath(workspaceRoot, absolutePath);
}

export function truncateText(value: string, maxCharacters = MAX_TOOL_OUTPUT_CHARACTERS) {
  if (value.length <= maxCharacters) {
    return { text: value, truncated: false };
  }

  return {
    text: `${value.slice(0, maxCharacters)}\n... [truncated ${value.length - maxCharacters} chars]`,
    truncated: true,
  };
}

export function formatNumberedLines(lines: string[], startLine: number) {
  return lines
    .map((line, index) => `${String(startLine + index).padStart(4, ' ')} | ${line}`)
    .join('\n');
}
