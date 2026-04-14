import type { Dirent } from 'fs';
import { readdir, stat } from 'fs/promises';
import { join, resolve } from 'path';

import { tool } from 'ai';
import { z } from 'zod';

import { resolveWorkspacePath, toWorkspaceRelativePath, type WorkspaceToolContext } from './shared';

const DEFAULT_GLOB_LIMIT = 100;
const MAX_GLOB_LIMIT = 500;
const SKIP_DIR_NAMES = new Set([
  '.git',
  'node_modules',
  '.next',
  '.turbo',
  '.cache',
  'dist',
  'out',
  'build',
]);

interface GlobMatch {
  path: string;
  size: number;
  modifiedAt: string;
}

// Convert a glob name pattern (single segment, supports * and ?) into a RegExp.
function nameGlobToRegExp(pattern: string) {
  let regex = '^';

  for (const ch of pattern) {
    if (ch === '*') {
      regex += '[^/]*';
    } else if (ch === '?') {
      regex += '[^/]';
    } else if ('.+^$()[]{}|\\'.includes(ch)) {
      regex += `\\${ch}`;
    } else {
      regex += ch;
    }
  }

  regex += '$';
  return new RegExp(regex);
}

interface GlobPlan {
  baseDir: string;
  namePattern: RegExp;
  recursive: boolean;
  maxDepth?: number;
}

// Decompose the glob into:
//   - a literal directory prefix to descend into
//   - a final-segment name pattern
//   - whether ** appears in the directory portion (recursive)
//   - if not recursive, how many directory levels of wildcard remain
function planGlob(workspaceRoot: string, pattern: string, basePath?: string): GlobPlan {
  const segments = pattern.split('/').filter(Boolean);
  const namePattern = segments[segments.length - 1] ?? '*';
  const literalPrefix: string[] = [];

  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index] ?? '';

    if (segment.includes('*') || segment.includes('?') || segment.includes('[')) {
      break;
    }

    literalPrefix.push(segment);
  }

  const remainingDirSegments = segments.slice(literalPrefix.length, segments.length - 1);
  const recursive = remainingDirSegments.includes('**') || namePattern === '**';
  const maxDepth = recursive ? undefined : remainingDirSegments.length + 1;

  const baseDir = resolve(basePath ?? workspaceRoot, ...literalPrefix);

  return {
    baseDir,
    namePattern: nameGlobToRegExp(namePattern),
    recursive,
    maxDepth,
  };
}

async function walkAndMatch(plan: GlobPlan, limit: number): Promise<GlobMatch[]> {
  const matches: { absolutePath: string; size: number; mtimeMs: number }[] = [];

  async function walk(directory: string, depth: number) {
    if (matches.length >= limit) {
      return;
    }

    let entries: Dirent[];

    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.name.startsWith('.')) {
        continue;
      }

      const absolutePath = join(directory, entry.name);

      if (entry.isDirectory()) {
        if (SKIP_DIR_NAMES.has(entry.name)) {
          continue;
        }

        if (plan.recursive || depth + 1 < (plan.maxDepth ?? Infinity)) {
          await walk(absolutePath, depth + 1);
        }

        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      if (!plan.namePattern.test(entry.name)) {
        continue;
      }

      try {
        const fileStat = await stat(absolutePath);
        matches.push({ absolutePath, size: fileStat.size, mtimeMs: fileStat.mtimeMs });
      } catch {
        // Skip files we can't stat (race conditions, permission errors).
      }

      if (matches.length >= limit * 2) {
        // Collect a bit more than `limit` so the mtime sort below has options, then bail.
        return;
      }
    }
  }

  await walk(plan.baseDir, 0);

  matches.sort((a, b) => b.mtimeMs - a.mtimeMs);

  return matches.slice(0, limit).map((entry) => ({
    path: entry.absolutePath,
    size: entry.size,
    modifiedAt: new Date(entry.mtimeMs).toISOString(),
  }));
}

export function createGlobTool(context: WorkspaceToolContext) {
  return tool({
    description: [
      'Find files matching a glob pattern, sorted by modification time (newest first).',
      '',
      'WHEN TO USE:',
      '- Locate files by extension or name pattern (e.g. "**/*.test.ts")',
      '- Discover where components, configs, or migrations live before reading them',
      '',
      'WHEN NOT TO USE:',
      '- Searching inside file contents (use grep)',
      '- Reading file contents (use read)',
      '',
      'USAGE NOTES:',
      '- Patterns support * (any chars except /), ? (single char), and ** (any depth)',
      '- Hidden files and common build dirs (node_modules, .git, dist, build, .next) are skipped',
      '- Use workspace-relative paths for the optional base path',
    ].join('\n'),
    inputSchema: z.object({
      pattern: z.string().min(1).describe('Glob pattern, for example "**/*.ts" or "src/*.json".'),
      path: z
        .string()
        .min(1)
        .optional()
        .describe('Optional workspace-relative directory to search from. Defaults to root.'),
      limit: z
        .number()
        .int()
        .positive()
        .max(MAX_GLOB_LIMIT)
        .optional()
        .describe(`Maximum results to return. Defaults to ${DEFAULT_GLOB_LIMIT}.`),
    }),
    execute: async ({ pattern, path, limit = DEFAULT_GLOB_LIMIT }) => {
      const basePath = path
        ? await resolveWorkspacePath(context.workspaceRoot, path)
        : context.workspaceRoot;
      const plan = planGlob(context.workspaceRoot, pattern, basePath);
      const rawMatches = await walkAndMatch(plan, limit);

      const matches = rawMatches.map((match) => ({
        path: toWorkspaceRelativePath(context.workspaceRoot, match.path),
        size: match.size,
        modifiedAt: match.modifiedAt,
      }));

      return {
        pattern,
        baseDir: toWorkspaceRelativePath(context.workspaceRoot, plan.baseDir),
        count: matches.length,
        truncated: matches.length >= limit,
        matches,
      };
    },
  });
}
