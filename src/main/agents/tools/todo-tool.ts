import { tool } from 'ai';
import { z } from 'zod';

export const todoStatusSchema = z.enum(['pending', 'in_progress', 'completed']);
export type TodoStatus = z.infer<typeof todoStatusSchema>;

export const todoItemSchema = z.object({
  id: z.string().describe('Stable identifier for the todo item.'),
  content: z.string().describe('Short task description shown to the user.'),
  status: todoStatusSchema.describe(
    'Current status. Only ONE todo should be in_progress at any time.',
  ),
});

export type TodoItem = z.infer<typeof todoItemSchema>;

// Pure-presentational tool: writes nothing, but its part history acts as the durable
// task list so the renderer can show progress over time. Each call REPLACES the prior
// list (mirroring the open-agents semantics).
export function createTodoWriteTool() {
  return tool({
    description: [
      'Create and manage a structured task list for the current session.',
      '',
      'WHEN TO USE:',
      '- Multi-step tasks with 3+ distinct steps',
      '- The user provided multiple requirements or a checklist',
      '- After receiving new instructions, immediately capture them as todos',
      '- Mark a todo in_progress BEFORE you start working on it',
      '- Mark a todo completed IMMEDIATELY after finishing it',
      '',
      'WHEN NOT TO USE:',
      '- Trivial single-step tasks',
      '- Purely conversational replies',
      '',
      'IMPORTANT:',
      '- Each call REPLACES the entire list. Always send the full, updated list.',
      '- Only ONE todo may be in_progress at a time.',
    ].join('\n'),
    inputSchema: z.object({
      todos: z
        .array(todoItemSchema)
        .describe('The complete todo list. Replaces any existing list.'),
    }),
    execute: async ({ todos }) => {
      return {
        success: true,
        count: todos.length,
        todos,
      };
    },
  });
}
