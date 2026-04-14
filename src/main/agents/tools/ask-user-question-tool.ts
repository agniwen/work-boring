import { tool } from 'ai';
import { z } from 'zod';

// Tightly bounded option shape — the UI renders these as compact chips.
const optionSchema = z.object({
  label: z.string().describe('Short label shown on the choice chip (1–5 words).'),
  description: z
    .string()
    .optional()
    .describe('Optional longer explanation of the trade-off behind this choice.'),
});

const questionSchema = z.object({
  id: z.string().describe('Stable identifier for this question within the call.'),
  question: z.string().describe('Full question text shown to the user. End with "?".'),
  header: z
    .string()
    .max(20)
    .describe('Very short label shown as the tab/chip header for this question.'),
  options: z.array(optionSchema).min(2).max(5),
  multiSelect: z
    .boolean()
    .optional()
    .describe('Whether the user may select multiple options. Defaults to false.'),
});

const askUserQuestionInputSchema = z.object({
  questions: z.array(questionSchema).min(1).max(4),
});

// Client-side output: the renderer submits one of these shapes via addToolResult.
const answerValueSchema = z.union([z.string(), z.array(z.string())]);
const askUserQuestionOutputSchema = z.union([
  z.object({
    answers: z.record(z.string(), answerValueSchema),
  }),
  z.object({
    declined: z.literal(true),
  }),
]);

export type AskUserQuestionInput = z.infer<typeof askUserQuestionInputSchema>;
export type AskUserQuestionOutput = z.infer<typeof askUserQuestionOutputSchema>;

// Client-side tool: no `execute`. When the agent emits this tool call, the
// AI SDK tool loop naturally pauses — the renderer picks up the
// `input-available` state, shows choices, and calls addToolResult() with the
// user's answer. The follow-up request resumes the agent with the tool result.
export function createAskUserQuestionTool() {
  return tool({
    description: [
      'Ask the user one or more multiple-choice questions during execution.',
      '',
      'WHEN TO USE:',
      '- Clarify ambiguous requirements you cannot safely decide on your own',
      '- Let the user pick between implementation trade-offs',
      '',
      'USAGE NOTES:',
      '- Provide 2–5 concrete options per question; keep labels short and concrete',
      '- Put the recommended option first and suffix its label with " (Recommended)"',
      '- Questions appear to the user as a compact form; answering unblocks the agent',
      '- The user may decline; handle that by continuing with a reasonable default',
    ].join('\n'),
    inputSchema: askUserQuestionInputSchema,
    outputSchema: askUserQuestionOutputSchema,
    // Collapse the user's answer into a terse text the model can reason about.
    toModelOutput: ({ output }) => {
      if (!output) {
        return { type: 'text', value: 'User did not respond to the question.' };
      }

      if ('declined' in output && output.declined) {
        return {
          type: 'text',
          value:
            'User declined to answer. Continue without their input or ask a different way if essential.',
        };
      }

      if ('answers' in output) {
        const formatted = Object.entries(output.answers)
          .map(([questionId, answer]) => {
            const rendered = Array.isArray(answer) ? answer.join(', ') : answer;
            return `${questionId}: ${rendered}`;
          })
          .join(' | ');

        return {
          type: 'text',
          value: `User answered — ${formatted}. Continue with these answers in mind.`,
        };
      }

      return { type: 'text', value: 'User responded.' };
    },
  });
}
