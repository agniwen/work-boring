import { tool, type LanguageModel, type LanguageModelUsage } from 'ai';
import { z } from 'zod';

import { SUBAGENT_METADATA, subagentTypeSchema, type SubagentRegistry } from '../subagents';
import type { SubagentExecutionContext } from '../subagents/types';

const taskInputSchema = z.object({
  subagentType: subagentTypeSchema.describe(
    'Which subagent should run the task. explorer = read-only exploration, executor = read/write implementation.',
  ),
  task: z.string().min(1).describe('Short one-line description of the task for UI display.'),
  instructions: z
    .string()
    .min(1)
    .describe(
      'Full instructions for the subagent: goals, files of interest, constraints. The subagent cannot ask questions.',
    ),
});

// Partial output shape yielded from the async generator. The last yield is
// returned as the tool result; intermediate yields update the tool UI in place.
export interface TaskPartialOutput {
  subagentType: z.infer<typeof taskInputSchema>['subagentType'];
  stepCount: number;
  toolCallCount: number;
  pending?: { name: string; input: unknown };
  summary?: string;
  done: boolean;
  aborted?: boolean;
  usage?: LanguageModelUsage;
  startedAt: number;
  finishedAt?: number;
}

function addTokens(l?: number, r?: number) {
  return l === undefined && r === undefined ? undefined : (l ?? 0) + (r ?? 0);
}

function sumUsage(a: LanguageModelUsage, b?: LanguageModelUsage): LanguageModelUsage {
  if (!b) return a;
  return {
    cachedInputTokens: addTokens(a.cachedInputTokens, b.cachedInputTokens),
    inputTokens: addTokens(a.inputTokens, b.inputTokens),
    outputTokens: addTokens(a.outputTokens, b.outputTokens),
    reasoningTokens: addTokens(a.reasoningTokens, b.reasoningTokens),
    totalTokens: addTokens(a.totalTokens, b.totalTokens),
  } as LanguageModelUsage;
}

// Builds the final summary text the PARENT agent sees as the tool result.
// The subagent's inner tool calls are NOT exposed — this is the central
// context-isolation benefit of the subagent pattern.
function extractSubagentSummary(responseMessages: Array<{ role: string; content: unknown }>) {
  for (let i = responseMessages.length - 1; i >= 0; i -= 1) {
    const message = responseMessages[i];

    if (message.role !== 'assistant' || !Array.isArray(message.content)) {
      continue;
    }

    for (let j = message.content.length - 1; j >= 0; j -= 1) {
      const part = message.content[j] as { type?: string; text?: string };

      if (part?.type === 'text' && typeof part.text === 'string' && part.text.trim()) {
        return part.text.trim();
      }
    }
  }

  return '';
}

export interface TaskToolDeps {
  subagents: SubagentRegistry;
}

export function createTaskTool(deps: TaskToolDeps) {
  return tool({
    description: [
      'Delegate a focused sub-task to a specialized subagent.',
      '',
      'WHEN TO USE:',
      '- Large exploration that would flood your own context (use "explorer")',
      '- Self-contained implementation work you can describe precisely (use "executor")',
      '',
      'WHEN NOT TO USE:',
      '- Tasks that need the user to answer questions — subagents cannot ask',
      '- Trivial reads/edits you can do in one tool call yourself',
      '- As a way to parallelize: each task call runs to completion serially',
      '',
      'NOTES:',
      "- You only see the subagent's final summary, not its internal tool calls",
      '- Each subagent is capped at a fixed step budget',
      '- Give the subagent enough context in `instructions` — it cannot ask you either',
    ].join('\n'),
    inputSchema: taskInputSchema,
    // The executor runs as an async generator: each yield becomes a tool UI
    // progress update, and the final yield is the structured tool result.
    execute: async function* (
      { subagentType, task, instructions },
      { experimental_context, abortSignal },
    ) {
      const subagent = deps.subagents[subagentType];
      const meta = SUBAGENT_METADATA[subagentType];
      const startedAt = Date.now();
      let aggregatedUsage: LanguageModelUsage = {} as LanguageModelUsage;
      let toolCallCount = 0;
      let stepCount = 0;

      // Forward the parent's model to the subagent so subagents inherit whatever
      // was configured at the app level without constructing a second provider.
      const parentContext = (experimental_context ?? {}) as SubagentExecutionContext;
      const model: LanguageModel | undefined = parentContext.model;

      const yieldProgress = (overrides: Partial<TaskPartialOutput>): TaskPartialOutput => ({
        subagentType,
        stepCount,
        toolCallCount,
        done: false,
        usage: aggregatedUsage,
        startedAt,
        ...overrides,
      });

      yield yieldProgress({
        pending: { name: '__starting__', input: { task, purpose: meta.purpose } },
      });

      try {
        const result = await subagent.stream({
          prompt: 'Complete the assigned task and return a concise final message.',
          options: { task, instructions, model },
          abortSignal,
        });

        // Walk the subagent's full event stream so we can surface live progress
        // (tool calls + step finishes) to the parent UI without exposing the raw
        // inner messages to the model.
        for await (const part of result.fullStream) {
          if (part.type === 'tool-call') {
            toolCallCount += 1;
            yield yieldProgress({ pending: { name: part.toolName, input: part.input } });
          } else if (part.type === 'finish-step') {
            stepCount += 1;
            aggregatedUsage = sumUsage(aggregatedUsage, part.usage);
            yield yieldProgress({});
          }
        }

        const response = await result.response;
        const summary = extractSubagentSummary(response.messages);

        // IMPORTANT: must be `yield`, not `return`. AI SDK's executeTool iterates
        // the async generator with `for await...of`, which discards the return
        // value — only the last yielded value becomes the tool's final output.
        yield {
          subagentType,
          stepCount,
          toolCallCount,
          summary,
          done: true,
          usage: aggregatedUsage,
          startedAt,
          finishedAt: Date.now(),
        } satisfies TaskPartialOutput;
      } catch (error) {
        const aborted = abortSignal?.aborted ?? false;
        const message = error instanceof Error ? error.message : String(error);
        yield {
          subagentType,
          stepCount,
          toolCallCount,
          summary: aborted ? '[subagent aborted]' : `[subagent failed] ${message}`,
          done: true,
          aborted,
          usage: aggregatedUsage,
          startedAt,
          finishedAt: Date.now(),
        } satisfies TaskPartialOutput;
      }
    },
    // Only surface the subagent's final text to the parent model. Its intermediate
    // tool calls, reasoning, and step timings stay in the UI but never pollute the
    // parent's conversation history — this is the core context-isolation benefit.
    toModelOutput: ({ output }) => {
      if (!output || typeof output !== 'object' || !('summary' in output)) {
        return { type: 'text', value: '[subagent returned no output]' };
      }

      const typed = output;

      if (typed.aborted) {
        return { type: 'text', value: '[subagent aborted]' };
      }

      return {
        type: 'text',
        value: typed.summary || '[subagent returned no summary]',
      };
    },
  });
}
