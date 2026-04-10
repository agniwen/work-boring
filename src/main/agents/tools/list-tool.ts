import { readdir } from 'fs/promises';
import { join, relative } from 'path';

import { tool } from 'ai';
import { z } from 'zod';

import {
  DEFAULT_LIST_IGNORE_PATTERNS,
  DEFAULT_LIST_MAX_RESULTS,
  MAX_LIST_MAX_RESULTS,
  resolveWorkspacePath,
  toWorkspaceRelativePath,
  type WorkspaceToolContext,
} from './shared';

export interface ListEntry {
  path: string; // workspace-relative
  kind: 'file' | 'dir';
}

// Normalize user-provided ignore globs to directory-name prefixes the walker can match against.
// Accepts "node_modules", "node_modules/", or "node_modules/**" — all collapse to "node_modules".
function normalizeIgnoreEntry(entry: string) {
  return entry.replace(/\/\*\*$/, '').replace(/\/$/, '');
}

export function createListTool(context: WorkspaceToolContext) {
  return tool({
    description:
      'List files and directories under a workspace path. Returns workspace-relative entries (up to a configurable limit) while skipping vendored folders like node_modules, dist, .git, etc. Prefer this over running bash with `ls` or `find`. For name-based pattern matching, prefer the glob tool.',
    inputSchema: z.object({
      path: z
        .string()
        .min(1)
        .optional()
        .describe('Workspace-relative directory to list. Defaults to the workspace root.'),
      recursive: z
        .boolean()
        .optional()
        .describe(
          'Whether to walk subdirectories. Defaults to true. Set false for a shallow listing.',
        ),
      ignore: z
        .array(z.string())
        .optional()
        .describe(
          'Additional directory names or globs to skip, merged with the default ignore list.',
        ),
      maxResults: z
        .number()
        .int()
        .positive()
        .max(MAX_LIST_MAX_RESULTS)
        .optional()
        .describe(`Maximum entries to return. Defaults to ${DEFAULT_LIST_MAX_RESULTS}.`),
    }),
    execute: async ({
      path = '.',
      recursive = true,
      ignore,
      maxResults = DEFAULT_LIST_MAX_RESULTS,
    }) => {
      const searchRoot = await resolveWorkspacePath(context.workspaceRoot, path);

      // Build the effective ignore set from defaults + caller-provided entries.
      const ignoreSet = new Set<string>([
        ...DEFAULT_LIST_IGNORE_PATTERNS.map(normalizeIgnoreEntry),
        ...(ignore?.map(normalizeIgnoreEntry) ?? []),
      ]);

      const entries: ListEntry[] = [];
      let truncated = false;

      // Breadth-first walk so shallow paths appear first in the output — matches what users
      // expect when they ask "what's in this folder".
      const queue: string[] = [searchRoot];

      while (queue.length > 0) {
        if (entries.length >= maxResults) {
          truncated = true;
          break;
        }

        const currentDir = queue.shift() as string;
        let dirEntries;

        try {
          dirEntries = await readdir(currentDir, { withFileTypes: true });
        } catch {
          // Silently skip directories the process cannot read; the walk should still surface the rest.
          continue;
        }

        dirEntries.sort((a, b) => a.name.localeCompare(b.name));

        for (const dirEntry of dirEntries) {
          if (entries.length >= maxResults) {
            truncated = true;
            break;
          }

          const absolute = join(currentDir, dirEntry.name);
          const relativePath = toWorkspaceRelativePath(context.workspaceRoot, absolute);

          if (dirEntry.isDirectory()) {
            if (ignoreSet.has(dirEntry.name)) {
              continue;
            }

            entries.push({ path: relativePath, kind: 'dir' });

            if (recursive) {
              queue.push(absolute);
            }
          } else if (dirEntry.isFile()) {
            entries.push({ path: relativePath, kind: 'file' });
          }
        }
      }

      return {
        path: relative(context.workspaceRoot, searchRoot) || '.',
        recursive,
        truncated,
        entries,
      };
    },
  });
}
