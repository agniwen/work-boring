import { tool } from 'ai';
import { z } from 'zod';

// Icon tags the UI knows how to render as a colored file chip. Keeping the list closed makes the
// model's output predictable; unknown icons still render as a neutral badge on the client.
export const PLAN_FILE_ICONS = [
  'react',
  'typescript',
  'javascript',
  'css',
  'html',
  'json',
  'markdown',
  'shell',
  'sql',
  'python',
  'go',
  'rust',
  'image',
  'other',
] as const;

export const planItemSchema = z.object({
  type: z
    .enum(['text', 'file'])
    .describe('"text" for a plain description line, "file" when the item references a file.'),
  text: z
    .string()
    .min(1)
    .describe(
      'Short human-readable description of this step. Required for both text and file items; for file items this is the prose that accompanies the file chip.',
    ),
  file: z
    .object({
      name: z.string().min(1).describe('File name or workspace-relative path to display.'),
      icon: z
        .enum(PLAN_FILE_ICONS)
        .describe('Icon category derived from the file type.'),
      color: z
        .string()
        .optional()
        .describe('Optional CSS color (e.g. "#61dafb") to tint the file chip.'),
    })
    .optional()
    .describe('Required when type === "file". Omit for text items.'),
});

export type PlanItem = z.infer<typeof planItemSchema>;

export const planTaskSchema = z.object({
  title: z
    .string()
    .min(1)
    .describe(
      'Short title for this task group (e.g. "Implement dark mode toggle"). Shown as the Task card header.',
    ),
  items: z
    .array(planItemSchema)
    .min(1)
    .describe('Ordered sub-steps that together complete this task. 2–6 items is a good target.'),
  status: z
    .enum(['pending', 'in_progress', 'completed'])
    .describe('Current status of the task. Only ONE task should be in_progress at a time.'),
});

export type PlanTask = z.infer<typeof planTaskSchema>;

// The plan tool does not need a workspace context. It simply echoes the structured plan back so
// the assistant message's parts_json stores every snapshot of the plan. The chat UI only renders
// the most recent plan call within a message, giving the illusion of in-place updates.
export function createPlanTool() {
  return tool({
    description: [
      'Create and maintain a structured plan of work for the current session. The plan is a LIST OF TASKS, where each task has a title, a status, and a list of sub-items that show the progression of that task. Sub-items can be plain text lines OR references to files involved in the task.',
      '',
      '## Schema',
      '',
      'Each call REPLACES the previous plan. Always pass the complete tasks array.',
      '',
      '- `tasks[].title`: short phrase summarizing the task group (e.g. "Add dark mode toggle").',
      '- `tasks[].status`: one of `pending`, `in_progress`, `completed`. Exactly ONE task should be `in_progress` at a time.',
      '- `tasks[].items`: 2–6 sub-steps, ordered.',
      '  - `items[].type = "text"` — free-form prose describing the step. Only `text` field used.',
      '  - `items[].type = "file"` — a step that touches a specific file. Set `text` to the prose (e.g. "Update theme provider in") AND `file = { name, icon, color? }`. Pick an icon from: react, typescript, javascript, css, html, json, markdown, shell, sql, python, go, rust, image, other.',
      '',
      '## When to use',
      '',
      "Call this tool as your FIRST action on any request that will take 3 or more tool calls. Typical triggers:",
      '- "implement / add / build" a feature.',
      '- "refactor / rename / migrate" across multiple files.',
      '- "fix a bug" when diagnosis, patch, and verification are all needed.',
      '- Requests that involve editing, then running tests/lints/builds.',
      '- Any time the user lists multiple deliverables ("A, then B, then C").',
      '',
      'Skip the tool for single-step or purely informational requests (one file read, one comment, one shell command, factual questions).',
      '',
      '## Rules for maintaining the plan',
      '',
      '- Create the initial plan BEFORE doing real work, so the user sees the roadmap upfront.',
      '- Call the tool again every time a task changes state. Pass the ENTIRE tasks array, not a delta.',
      "- Keep exactly ONE task `in_progress` at a time. Mark it `completed` the instant it's done — before moving to the next.",
      '- Add new tasks if you discover extra work along the way.',
      '- When EXECUTING a task, batch independent tool calls in one turn (e.g. multiple `read` calls, or `glob`+`grep`+`list` together). Do NOT inspect files one at a time when you can inspect them in parallel.',
      '',
      '## Good example (2 tasks, mixed item types)',
      '',
      '```',
      '{',
      '  tasks: [',
      '    {',
      '      title: "Add dark mode toggle",',
      '      status: "in_progress",',
      '      items: [',
      '        { type: "text", text: "Explore current theme setup" },',
      '        { type: "file", text: "Add toggle component in", file: { name: "settings-page.tsx", icon: "react" } },',
      '        { type: "file", text: "Wire theme state in", file: { name: "theme-provider.tsx", icon: "react" } }',
      '      ]',
      '    },',
      '    {',
      '      title: "Verify",',
      '      status: "pending",',
      '      items: [',
      '        { type: "text", text: "Run pnpm lint" },',
      '        { type: "text", text: "Run pnpm test" }',
      '      ]',
      '    }',
      '  ]',
      '}',
      '```',
    ].join('\n'),
    inputSchema: z.object({
      tasks: z
        .array(planTaskSchema)
        .min(1)
        .describe(
          'Complete list of tasks for the plan. Always pass the full list on every call; this replaces the previous plan.',
        ),
    }),
    execute: async ({ tasks }) => {
      return { tasks };
    },
  });
}
