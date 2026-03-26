import { appendFile, mkdir, stat, writeFile } from 'fs/promises';
import { dirname } from 'path';

import { tool } from 'ai';
import { z } from 'zod';

import { resolveToolPath, toToolDisplayPath, type WorkspaceToolContext } from './shared';

export function createWriteTool(context: WorkspaceToolContext) {
  return tool({
    description:
      'Write or append UTF-8 text files. Workspace paths run immediately; paths outside the workspace require user approval. Creates missing parent directories automatically.',
    inputSchema: z.object({
      path: z
        .string()
        .min(1)
        .describe(
          'File path to write. Workspace-relative paths are preferred. Paths outside the workspace require approval.',
        ),
      content: z.string().describe('Complete UTF-8 file content to write.'),
      mode: z
        .enum(['overwrite', 'append'])
        .optional()
        .describe(
          "Write mode. Use 'overwrite' for full replacement or 'append' to add to the end.",
        ),
    }),
    needsApproval: async ({ path }) => {
      const resolvedPath = await resolveToolPath(context.workspaceRoot, path, {
        allowMissing: true,
      });

      return !resolvedPath.isWithinWorkspace;
    },
    execute: async ({ path, content, mode = 'overwrite' }) => {
      const resolvedPath = await resolveToolPath(context.workspaceRoot, path, {
        allowMissing: true,
      });
      const { absolutePath, isWithinWorkspace } = resolvedPath;

      await mkdir(dirname(absolutePath), { recursive: true });

      if (mode === 'append') {
        await appendFile(absolutePath, content, 'utf8');
      } else {
        await writeFile(absolutePath, content, 'utf8');
      }

      const fileStat = await stat(absolutePath);

      return {
        path: toToolDisplayPath(context.workspaceRoot, absolutePath, isWithinWorkspace),
        mode,
        bytesWritten: Buffer.byteLength(content, 'utf8'),
        sizeBytes: fileStat.size,
      };
    },
  });
}
