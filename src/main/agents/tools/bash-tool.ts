import { tool } from 'ai';
import { execaCommand } from 'execa';
import { z } from 'zod';

import {
  DEFAULT_BASH_TIMEOUT_MS,
  MAX_BASH_TIMEOUT_MS,
  resolveWorkspacePath,
  toWorkspaceRelativePath,
  truncateText,
  type WorkspaceToolContext,
} from './shared';

const COMMAND_BOUNDARY = String.raw`(^|[;&|()\n])\s*`;

const BLOCKED_COMMAND_RULES: Array<{ pattern: RegExp; reason: string }> = [
  {
    pattern: new RegExp(`${COMMAND_BOUNDARY}(?:sudo|su|doas)\\b`, 'i'),
    reason: 'Privilege escalation commands are blocked.',
  },
  {
    pattern: new RegExp(`${COMMAND_BOUNDARY}rm\\b`, 'i'),
    reason: 'File deletion commands are blocked.',
  },
  {
    pattern: /\bfind\b[^\n]*\s-delete\b/i,
    reason: 'Destructive find -delete usage is blocked.',
  },
  {
    pattern: new RegExp(
      `${COMMAND_BOUNDARY}(?:dd|mkfs(?:\\.[a-z0-9_+-]+)?|fdisk|sfdisk|parted|diskutil|newfs|mount|umount)\\b`,
      'i',
    ),
    reason: 'Disk and filesystem mutation commands are blocked.',
  },
  {
    pattern: new RegExp(`${COMMAND_BOUNDARY}(?:shutdown|reboot|halt|poweroff)\\b`, 'i'),
    reason: 'System power control commands are blocked.',
  },
  {
    pattern: new RegExp(`${COMMAND_BOUNDARY}(?:kill|pkill|killall)\\b`, 'i'),
    reason: 'Process termination commands are blocked.',
  },
  {
    pattern: /\bgit\s+reset\s+--hard\b/i,
    reason: 'Destructive git reset is blocked.',
  },
  {
    pattern: /\bgit\s+clean\b[^\n]*\b-f\b/i,
    reason: 'git clean with force flags is blocked.',
  },
  {
    pattern: /\bgit\s+checkout\s+--\b/i,
    reason: 'Destructive git checkout restore syntax is blocked.',
  },
  {
    pattern: /\bgit\s+restore\b[^\n]*\b(?:--source|--staged|--worktree)\b/i,
    reason: 'Destructive git restore usage is blocked.',
  },
  {
    pattern: /\b(?:curl|wget)\b[^\n|]*\|\s*(?:sh|bash|zsh)\b/i,
    reason: 'Piping downloaded scripts into a shell is blocked.',
  },
  {
    pattern: /:\s*\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\};\s*:/,
    reason: 'Fork bombs are blocked.',
  },
];

function assertSafeCommand(command: string) {
  const normalizedCommand = command.trim();

  for (const rule of BLOCKED_COMMAND_RULES) {
    if (rule.pattern.test(normalizedCommand)) {
      throw new Error(`Blocked bash command: ${rule.reason}`);
    }
  }
}

export function createBashTool(context: WorkspaceToolContext) {
  return tool({
    description:
      'Run a bash command inside the workspace and return stdout, stderr, exit code, and timeout information.',
    inputSchema: z.object({
      command: z.string().min(1).describe('Bash command to execute.'),
      cwd: z
        .string()
        .min(1)
        .optional()
        .describe('Optional workspace-relative working directory. Defaults to the workspace root.'),
      timeoutMs: z
        .number()
        .int()
        .positive()
        .max(MAX_BASH_TIMEOUT_MS)
        .optional()
        .describe(`Command timeout in milliseconds. Defaults to ${DEFAULT_BASH_TIMEOUT_MS}.`),
    }),
    execute: async ({ command, cwd = '.', timeoutMs = DEFAULT_BASH_TIMEOUT_MS }) => {
      assertSafeCommand(command);

      const absoluteCwd = await resolveWorkspacePath(context.workspaceRoot, cwd);
      const result = await execaCommand(command, {
        cwd: absoluteCwd,
        reject: false,
        shell: '/bin/bash',
        stderr: 'pipe',
        stdout: 'pipe',
        timeout: timeoutMs,
      });
      const stdout = truncateText(result.stdout);
      const stderr = truncateText(result.stderr);

      return {
        command,
        cwd: toWorkspaceRelativePath(context.workspaceRoot, absoluteCwd),
        exitCode: result.exitCode,
        failed: result.failed,
        timedOut: result.timedOut,
        stdout: stdout.text,
        stdoutTruncated: stdout.truncated,
        stderr: stderr.text,
        stderrTruncated: stderr.truncated,
      };
    },
  });
}
