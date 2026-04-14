import { readFile, stat, writeFile } from 'fs/promises';

import { tool } from 'ai';
import { z } from 'zod';

import { resolveToolPath, toToolDisplayPath, type WorkspaceToolContext } from './shared';

// Precise string-replacement editor. Safer than the write tool because it preserves
// surrounding content and refuses ambiguous matches unless the caller opts in to
// replaceAll. Approval is required when the file lives outside the workspace.
export function createEditTool(context: WorkspaceToolContext) {
  return tool({
    description: [
      'Perform an exact string replacement inside an existing UTF-8 text file.',
      '',
      'WHEN TO USE:',
      '- Small, precise edits to a file you already read',
      '- Renaming a symbol consistently within a single file (use replaceAll)',
      '',
      'WHEN NOT TO USE:',
      '- Creating new files (use write)',
      '- Wholesale rewrites where overwrite is simpler (use write)',
      '',
      'USAGE NOTES:',
      '- Read the file first so oldString matches exact whitespace and indentation',
      '- oldString must be unique unless replaceAll is true; the tool fails on ambiguous matches',
      '- Do NOT include the read tool line-number prefixes ("  42 | ...") in oldString or newString',
      '- newString must differ from oldString',
    ].join('\n'),
    inputSchema: z.object({
      path: z
        .string()
        .min(1)
        .describe(
          'File to edit. Workspace-relative paths are preferred. Paths outside the workspace require approval.',
        ),
      oldString: z
        .string()
        .describe('Exact text to replace, including whitespace and indentation.'),
      newString: z.string().describe('Replacement text. Must differ from oldString.'),
      replaceAll: z
        .boolean()
        .optional()
        .describe('Replace every occurrence of oldString. Defaults to false.'),
    }),
    needsApproval: async ({ path }) => {
      const resolvedPath = await resolveToolPath(context.workspaceRoot, path, {
        allowMissing: true,
      });

      return !resolvedPath.isWithinWorkspace;
    },
    execute: async ({ path, oldString, newString, replaceAll = false }) => {
      if (oldString === newString) {
        throw new Error('oldString and newString must be different.');
      }

      const resolvedPath = await resolveToolPath(context.workspaceRoot, path);
      const { absolutePath, isWithinWorkspace } = resolvedPath;
      const fileStat = await stat(absolutePath);

      if (!fileStat.isFile()) {
        throw new Error(`Path is not a file: ${path}`);
      }

      const content = await readFile(absolutePath, 'utf8');

      if (!content.includes(oldString)) {
        throw new Error('oldString not found in file. Match exact whitespace and indentation.');
      }

      const occurrences = content.split(oldString).length - 1;

      if (occurrences > 1 && !replaceAll) {
        throw new Error(
          `oldString matched ${occurrences} times. Provide more surrounding context to make it unique, or pass replaceAll=true.`,
        );
      }

      // Compute the line where the first match starts so the UI can render a nice diff anchor.
      const matchIndex = content.indexOf(oldString);
      const startLine = content.slice(0, matchIndex).split(/\r?\n/).length;

      const updatedContent = replaceAll
        ? content.split(oldString).join(newString)
        : content.replace(oldString, newString);

      await writeFile(absolutePath, updatedContent, 'utf8');

      return {
        path: toToolDisplayPath(context.workspaceRoot, absolutePath, isWithinWorkspace),
        replacements: replaceAll ? occurrences : 1,
        startLine,
        bytesWritten: Buffer.byteLength(updatedContent, 'utf8'),
      };
    },
  });
}
