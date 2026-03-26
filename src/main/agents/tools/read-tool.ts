import { readFile, stat } from 'fs/promises';

import { tool } from 'ai';
import { z } from 'zod';

import {
  DEFAULT_READ_MAX_CHARACTERS,
  DEFAULT_READ_WINDOW_LINES,
  formatNumberedLines,
  resolveToolPath,
  toToolDisplayPath,
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
      'Read a UTF-8 text file. Workspace paths run immediately; paths outside the workspace require user approval. Returns numbered lines so the agent can reason about exact locations.',
    inputSchema: z.object({
      path: z
        .string()
        .min(1)
        .describe(
          'File path to read. Workspace-relative paths are preferred. Paths outside the workspace require approval.',
        ),
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
    needsApproval: async ({ path }) => {
      // Approval depends only on path location; missing files should still fail during execution.
      const resolvedPath = await resolveToolPath(context.workspaceRoot, path, {
        allowMissing: true,
      });

      return !resolvedPath.isWithinWorkspace;
    },
    execute: async ({
      path,
      startLine = 1,
      endLine,
      maxCharacters = DEFAULT_READ_MAX_CHARACTERS,
    }) => {
      const resolvedPath = await resolveToolPath(context.workspaceRoot, path);
      const { absolutePath, isWithinWorkspace } = resolvedPath;
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
      // Clamp the requested window so the model always receives a valid slice of the file.
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
        path: toToolDisplayPath(context.workspaceRoot, absolutePath, isWithinWorkspace),
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
