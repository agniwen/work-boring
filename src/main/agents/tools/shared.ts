import { realpath } from 'fs/promises';
import { basename, dirname, isAbsolute, relative, resolve } from 'path';

export interface WorkspaceToolContext {
  workspaceRoot: string;
}

export const DEFAULT_BASH_TIMEOUT_MS = 20_000;
export const DEFAULT_GREP_MAX_RESULTS = 50;
export const DEFAULT_READ_MAX_CHARACTERS = 20_000;
export const DEFAULT_READ_WINDOW_LINES = 200;
export const MAX_BASH_TIMEOUT_MS = 60_000;
export const MAX_GREP_RESULTS = 200;
export const MAX_TOOL_OUTPUT_CHARACTERS = 12_000;

function isWithinRoot(rootPath: string, candidatePath: string) {
  const relativePath = relative(rootPath, candidatePath);
  return relativePath === '' || (!relativePath.startsWith('..') && !isAbsolute(relativePath));
}

async function resolveAgainstNearestExistingParent(candidatePath: string) {
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
  const normalizedPath = requestedPath.trim();

  if (!normalizedPath) {
    throw new Error('Path is required.');
  }

  const absolutePath = resolve(workspaceRoot, normalizedPath);
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

  if (!isWithinRoot(realWorkspaceRoot, realCandidatePath)) {
    throw new Error(`Path escapes the workspace root: ${requestedPath}`);
  }

  return absolutePath;
}

export function toWorkspaceRelativePath(workspaceRoot: string, absolutePath: string) {
  const relativePath = relative(workspaceRoot, absolutePath);
  return relativePath || '.';
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
