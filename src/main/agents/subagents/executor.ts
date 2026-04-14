import { stepCountIs, ToolLoopAgent, type LanguageModel } from 'ai';
import { z } from 'zod';

import { createBashTool } from '../tools/bash-tool';
import { createEditTool } from '../tools/edit-tool';
import { createGlobTool } from '../tools/glob-tool';
import { createGrepTool } from '../tools/grep-tool';
import { createReadTool } from '../tools/read-tool';
import type { WorkspaceToolContext } from '../tools/shared';
import { createWriteTool } from '../tools/write-tool';
import { SUBAGENT_RESPONSE_REMINDER, SUBAGENT_STEP_LIMIT } from './constants';
import type { SubagentExecutionContext } from './types';

const EXECUTOR_SYSTEM_PROMPT = [
  'You are the "executor" subagent. Your job is to carry out a focused implementation task end-to-end and report what you did.',
  '',
  'Hard rules:',
  '- Never ask the user questions — the user is not available to you.',
  '- Do not spawn further subagents; you must do the work yourself.',
  '- Prefer edit for small, precise changes; use write only when creating a file or rewriting it wholesale.',
  '- Verify your work with grep/read/bash before declaring the task complete.',
  '- When finished, stop and return a concise final message.',
].join('\n');

const executorCallOptionsSchema = z.object({
  task: z.string(),
  instructions: z.string(),
  model: z.any().optional(),
});

type ExecutorCallOptions = z.infer<typeof executorCallOptionsSchema> & {
  model?: LanguageModel;
};

function buildTools(context: WorkspaceToolContext) {
  return {
    read: createReadTool(context),
    grep: createGrepTool(context),
    glob: createGlobTool(context),
    write: createWriteTool(context),
    edit: createEditTool(context),
    bash: createBashTool(context),
  };
}

// Executor gets the full write/edit/bash kit but no task or ask-user-question tools —
// subagents must not recurse into more subagents, and they cannot block on the user.
export function createExecutorSubagent(
  toolContext: WorkspaceToolContext,
  defaultModel: LanguageModel,
) {
  return new ToolLoopAgent({
    model: defaultModel,
    instructions: EXECUTOR_SYSTEM_PROMPT,
    tools: buildTools(toolContext),
    stopWhen: stepCountIs(SUBAGENT_STEP_LIMIT),
    callOptionsSchema: executorCallOptionsSchema,
    prepareCall: ({ options, ...settings }) => {
      const typedOptions = options as ExecutorCallOptions;
      const sections = [
        EXECUTOR_SYSTEM_PROMPT,
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
