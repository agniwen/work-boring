import { glob, stat } from 'fs/promises';
import { relative, resolve } from 'path';

import { tool } from 'ai';
import { z } from 'zod';

import {
  DEFAULT_GLOB_MAX_RESULTS,
  DEFAULT_LIST_IGNORE_PATTERNS,
  MAX_GLOB_MAX_RESULTS,
  resolveWorkspacePath,
  toWorkspaceRelativePath,
  type WorkspaceToolContext,
} from './shared';

export function createGlobTool(context: WorkspaceToolContext) {
  return tool({
    description:
      'Fast file-name pattern matching. Use this to find files by name or path pattern (e.g. "**/*.ts", "src/**/route.tsx"). Returns workspace-relative paths sorted by mtime (most recently modified first). Prefer this over running bash with `find` or `ls`.',
    inputSchema: z.object({
      pattern: z
        .string()
        .min(1)
        .describe('Glob pattern to match file paths against, e.g. "**/*.ts" or "src/**/*.tsx".'),
      path: z
        .string()
        .min(1)
        .optional()
        .describe(
          'Optional workspace-relative directory to search in. Defaults to the workspace root.',
        ),
      maxResults: z
        .number()
        .int()
        .positive()
        .max(MAX_GLOB_MAX_RESULTS)
        .optional()
        .describe(`Maximum matches to return. Defaults to ${DEFAULT_GLOB_MAX_RESULTS}.`),
    }),
    execute: async ({ pattern, path = '.', maxResults = DEFAULT_GLOB_MAX_RESULTS }) => {
      // Glob searches stay inside the workspace root so the agent cannot enumerate unrelated disk contents.
      const searchRoot = await resolveWorkspacePath(context.workspaceRoot, path);

      // Wrap node:fs.glob so we can honor a hard result ceiling and skip vendored trees by default.
      const iterator = glob(pattern, {
        cwd: searchRoot,
        exclude: DEFAULT_LIST_IGNORE_PATTERNS.map((dir) => dir.replace(/\/$/, '')),
      });

      // Collect absolute paths and their mtimes so we can sort most-recently-modified first.
      const hits: Array<{ absolutePath: string; mtimeMs: number }> = [];
      let truncated = false;

      for await (const entry of iterator) {
        if (hits.length >= maxResults) {
          truncated = true;
          break;
        }

        const absolutePath = resolve(searchRoot, entry);

        try {
          const fileStat = await stat(absolutePath);

          if (!fileStat.isFile()) {
            continue;
          }

          hits.push({ absolutePath, mtimeMs: fileStat.mtimeMs });
        } catch {
          // Symlinks pointing to missing targets or permission errors are silently skipped.
        }
      }

      hits.sort((a, b) => b.mtimeMs - a.mtimeMs);

      const matches = hits.map((hit) => ({
        path: toWorkspaceRelativePath(context.workspaceRoot, hit.absolutePath),
        mtimeMs: hit.mtimeMs,
      }));

      return {
        pattern,
        path: relative(context.workspaceRoot, searchRoot) || '.',
        truncated,
        matches,
      };
    },
  });
}
