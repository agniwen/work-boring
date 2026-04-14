import { stepCountIs, ToolLoopAgent, type LanguageModel } from 'ai';
import { z } from 'zod';

import { createBashTool } from '../tools/bash-tool';
import { createGlobTool } from '../tools/glob-tool';
import { createGrepTool } from '../tools/grep-tool';
import { createReadTool } from '../tools/read-tool';
import type { WorkspaceToolContext } from '../tools/shared';
import { SUBAGENT_RESPONSE_REMINDER, SUBAGENT_STEP_LIMIT } from './constants';
import type { SubagentExecutionContext } from './types';

const EXPLORER_SYSTEM_PROMPT = [
  'You are the "explorer" subagent. Your only job is to investigate the workspace and report findings.',
  '',
  'Hard rules:',
  '- You may only read and search. Never modify files.',
  '- Never ask the user questions — the user is not available to you.',
  '- Work until you can produce a concise, useful answer, then stop.',
  '- Use grep and glob to locate things; read files to confirm; bash is allowed only for read-only commands (ls, cat, wc, git status/log/diff, etc.).',
].join('\n');

const explorerCallOptionsSchema = z.object({
  task: z.string(),
  instructions: z.string(),
  // Subagents inherit the parent's model unless an override is provided; we accept
  // it via callOptions so the task tool can forward experimental_context.model.
  model: z.any().optional(),
});

type ExplorerCallOptions = z.infer<typeof explorerCallOptionsSchema> & {
  model?: LanguageModel;
};

function buildTools(context: WorkspaceToolContext) {
  return {
    read: createReadTool(context),
    grep: createGrepTool(context),
    glob: createGlobTool(context),
    bash: createBashTool(context),
  };
}

// Explorer is intentionally restricted to read-only tools. The broad bash tool is
// included because many exploration tasks rely on git/ls/cat style shell commands;
// the system prompt forbids state-changing bash use. Approval-gated path access in
// the underlying tools is the real enforcement layer.
export function createExplorerSubagent(
  toolContext: WorkspaceToolContext,
  defaultModel: LanguageModel,
) {
  return new ToolLoopAgent({
    model: defaultModel,
    instructions: EXPLORER_SYSTEM_PROMPT,
    tools: buildTools(toolContext),
    stopWhen: stepCountIs(SUBAGENT_STEP_LIMIT),
    callOptionsSchema: explorerCallOptionsSchema,
    // Build the step-specific system prompt from the parent's task + instructions
    // so each invocation stays scoped. The parent's model overrides the default
    // when provided.
    prepareCall: ({ options, ...settings }) => {
      const typedOptions = options as ExplorerCallOptions;
      const sections = [
        EXPLORER_SYSTEM_PROMPT,
        '',
        '## Your Task',
        typedOptions.task,
        '',
        '## Detailed Instructions',
        typedOptions.instructions,
        SUBAGENT_RESPONSE_REMINDER,
      ];

      const execContext: SubagentExecutionContext = {
        model: typedOptions.model,
      };

      return {
        ...settings,
        model: typedOptions.model ?? settings.model,
        instructions: sections.join('\n'),
        experimental_context: execContext,
      };
    },
  });
}
