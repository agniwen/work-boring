import { tool } from 'ai';
import { execa } from 'execa';
import { z } from 'zod';

import {
  DEFAULT_GREP_MAX_RESULTS,
  MAX_GREP_RESULTS,
  resolveWorkspacePath,
  toWorkspaceRelativePath,
  type WorkspaceToolContext,
} from './shared';

export interface GrepMatch {
  path: string;
  lineNumber: number;
  content: string;
}

function parseRipgrepMatches(stdout: string, maxResults: number) {
  const matches: GrepMatch[] = [];
  let truncated = false;

  for (const line of stdout.split('\n')) {
    if (!line.trim()) {
      continue;
    }

    const parsedLine = JSON.parse(line) as {
      type?: string;
      data?: {
        line_number?: number;
        path?: { text?: string };
        lines?: { text?: string };
      };
    };

    if (parsedLine.type !== 'match') {
      continue;
    }

    if (matches.length >= maxResults) {
      truncated = true;
      continue;
    }

    matches.push({
      path: parsedLine.data?.path?.text ?? '',
      lineNumber: parsedLine.data?.line_number ?? 0,
      content: (parsedLine.data?.lines?.text ?? '').replace(/\n$/, ''),
    });
  }

  return { matches, truncated };
}

function parseGrepMatches(stdout: string, maxResults: number) {
  const matches: GrepMatch[] = [];
  let truncated = false;

  for (const line of stdout.split('\n')) {
    if (!line.trim()) {
      continue;
    }

    if (matches.length >= maxResults) {
      truncated = true;
      continue;
    }

    const match = line.match(/^(.*?):(\d+):(.*)$/);

    if (!match) {
      continue;
    }

    matches.push({
      path: match[1],
      lineNumber: Number(match[2]),
      content: match[3],
    });
  }

  return { matches, truncated };
}

async function runRipgrepSearch(input: {
  caseSensitive: boolean;
  glob?: string;
  literal: boolean;
  maxResults: number;
  pattern: string;
  searchTarget: string;
  workspaceRoot: string;
}) {
  const args = ['--json', '--line-number', '--color', 'never'];

  if (!input.caseSensitive) {
    args.push('--ignore-case');
  }

  if (input.literal) {
    args.push('--fixed-strings');
  }

  if (input.glob) {
    args.push('-g', input.glob);
  }

  args.push(input.pattern, input.searchTarget);

  const result = await execa('rg', args, {
    cwd: input.workspaceRoot,
    reject: false,
    stderr: 'pipe',
    stdout: 'pipe',
  });

  if (result.exitCode !== 0 && result.exitCode !== 1) {
    throw new Error(result.stderr || `rg exited with code ${result.exitCode}`);
  }

  return parseRipgrepMatches(result.stdout, input.maxResults);
}

async function runGrepFallback(input: {
  caseSensitive: boolean;
  literal: boolean;
  maxResults: number;
  pattern: string;
  searchTarget: string;
  workspaceRoot: string;
}) {
  const args = ['-RIn'];

  if (!input.caseSensitive) {
    args.push('-i');
  }

  if (input.literal) {
    args.push('-F');
  }

  args.push('--', input.pattern, input.searchTarget);

  const result = await execa('grep', args, {
    cwd: input.workspaceRoot,
    reject: false,
    stderr: 'pipe',
    stdout: 'pipe',
  });

  if (result.exitCode !== 0 && result.exitCode !== 1) {
    throw new Error(result.stderr || `grep exited with code ${result.exitCode}`);
  }

  return parseGrepMatches(result.stdout, input.maxResults);
}

export function createGrepTool(context: WorkspaceToolContext) {
  return tool({
    description:
      'Search workspace files with ripgrep when available. Returns matched file paths, line numbers, and line content.',
    inputSchema: z.object({
      pattern: z.string().min(1).describe('Search pattern. Regex by default.'),
      path: z
        .string()
        .min(1)
        .optional()
        .describe(
          'Optional workspace-relative directory or file to search. Defaults to the workspace root.',
        ),
      glob: z
        .string()
        .min(1)
        .optional()
        .describe('Optional ripgrep glob filter, for example "*.ts".'),
      literal: z
        .boolean()
        .optional()
        .describe('Treat the pattern as a literal string instead of a regex.'),
      caseSensitive: z
        .boolean()
        .optional()
        .describe('Whether the search should be case-sensitive.'),
      maxResults: z
        .number()
        .int()
        .positive()
        .max(MAX_GREP_RESULTS)
        .optional()
        .describe(`Maximum matches to return. Defaults to ${DEFAULT_GREP_MAX_RESULTS}.`),
    }),
    execute: async ({
      pattern,
      path = '.',
      glob,
      literal = false,
      caseSensitive = true,
      maxResults = DEFAULT_GREP_MAX_RESULTS,
    }) => {
      const absoluteSearchPath = await resolveWorkspacePath(context.workspaceRoot, path);
      const searchTarget = toWorkspaceRelativePath(context.workspaceRoot, absoluteSearchPath);
      const baseInput = {
        caseSensitive,
        literal,
        maxResults,
        pattern,
        searchTarget,
        workspaceRoot: context.workspaceRoot,
      };

      try {
        const result = await runRipgrepSearch({ ...baseInput, glob });

        return {
          pattern,
          path: searchTarget,
          engine: 'rg',
          truncated: result.truncated,
          matches: result.matches,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : '';

        if (!message.includes('ENOENT')) {
          throw error;
        }

        const fallback = await runGrepFallback(baseInput);

        return {
          pattern,
          path: searchTarget,
          engine: 'grep',
          truncated: fallback.truncated,
          matches: fallback.matches,
        };
      }
    },
  });
}
