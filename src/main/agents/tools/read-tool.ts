import { readFile, stat } from 'fs/promises';

import { tool } from 'ai';
import { z } from 'zod';

import {
  DEFAULT_READ_MAX_CHARACTERS,
  DEFAULT_READ_WINDOW_LINES,
  formatNumberedLines,
  resolveWorkspacePath,
  toWorkspaceRelativePath,
  truncateText,
  type WorkspaceToolContext,
} from './shared';

function getLineCount(content: string) {
  if (!content) {
    return 0;
  }

  return content.split(/\r?\n/).length;
}

export function createReadTool(context: WorkspaceToolContext) {
  return tool({
    description:
      'Read a UTF-8 text file from the workspace. Returns numbered lines so the agent can reason about exact locations.',
    inputSchema: z.object({
      path: z.string().min(1).describe('Workspace-relative file path to read.'),
      startLine: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('1-based start line. Defaults to 1.'),
      endLine: z
        .number()
        .int()
        .positive()
        .optional()
        .describe(`1-based end line. Defaults to a ${DEFAULT_READ_WINDOW_LINES}-line window.`),
      maxCharacters: z
        .number()
        .int()
        .positive()
        .max(DEFAULT_READ_MAX_CHARACTERS)
        .optional()
        .describe(`Maximum characters to return. Defaults to ${DEFAULT_READ_MAX_CHARACTERS}.`),
    }),
    execute: async ({
      path,
      startLine = 1,
      endLine,
      maxCharacters = DEFAULT_READ_MAX_CHARACTERS,
    }) => {
      const absolutePath = await resolveWorkspacePath(context.workspaceRoot, path);
      const fileStat = await stat(absolutePath);

      if (!fileStat.isFile()) {
        throw new Error(`Path is not a file: ${path}`);
      }

      const content = await readFile(absolutePath, 'utf8');

      if (content.includes('\u0000')) {
        throw new Error(`Binary files are not supported by read: ${path}`);
      }

      const allLines = content.split(/\r?\n/);
      const totalLines = getLineCount(content);
      const boundedStartLine = Math.max(1, Math.min(startLine, Math.max(totalLines, 1)));
      const boundedEndLine = Math.max(
        boundedStartLine,
        Math.min(
          endLine ?? boundedStartLine + DEFAULT_READ_WINDOW_LINES - 1,
          Math.max(totalLines, 1),
        ),
      );
      const selectedLines = allLines.slice(boundedStartLine - 1, boundedEndLine);
      const numberedContent = formatNumberedLines(selectedLines, boundedStartLine);
      const truncatedContent = truncateText(numberedContent, maxCharacters);

      return {
        path: toWorkspaceRelativePath(context.workspaceRoot, absolutePath),
        startLine: boundedStartLine,
        endLine: boundedEndLine,
        totalLines,
        sizeBytes: fileStat.size,
        truncated: truncatedContent.truncated,
        content: truncatedContent.text,
      };
    },
  });
}
