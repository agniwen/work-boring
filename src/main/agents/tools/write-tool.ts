import { appendFile, mkdir, stat, writeFile } from 'fs/promises';
import { dirname } from 'path';

import { tool } from 'ai';
import { z } from 'zod';

import { resolveWorkspacePath, toWorkspaceRelativePath, type WorkspaceToolContext } from './shared';

export function createWriteTool(context: WorkspaceToolContext) {
  return tool({
    description:
      'Write or append UTF-8 text files inside the workspace. Creates missing parent directories automatically.',
    inputSchema: z.object({
      path: z.string().min(1).describe('Workspace-relative file path to write.'),
      content: z.string().describe('Complete UTF-8 file content to write.'),
      mode: z
        .enum(['overwrite', 'append'])
        .optional()
        .describe(
          "Write mode. Use 'overwrite' for full replacement or 'append' to add to the end.",
        ),
    }),
    execute: async ({ path, content, mode = 'overwrite' }) => {
      const absolutePath = await resolveWorkspacePath(context.workspaceRoot, path, {
        allowMissing: true,
      });

      await mkdir(dirname(absolutePath), { recursive: true });

      if (mode === 'append') {
        await appendFile(absolutePath, content, 'utf8');
      } else {
        await writeFile(absolutePath, content, 'utf8');
      }

      const fileStat = await stat(absolutePath);

      return {
        path: toWorkspaceRelativePath(context.workspaceRoot, absolutePath),
        mode,
        bytesWritten: Buffer.byteLength(content, 'utf8'),
        sizeBytes: fileStat.size,
      };
    },
  });
}
