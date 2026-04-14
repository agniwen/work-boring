import type { LanguageModel } from 'ai';
import { z } from 'zod';

// Subagent types declared centrally so registry, task tool, and UI stay in sync.
export const subagentTypeSchema = z.enum(['explorer', 'executor']);
export type SubagentType = z.infer<typeof subagentTypeSchema>;

// Call options every subagent accepts. The parent agent injects these via
// `experimental_context` and the subagent `prepareCall` folds them into the
// final system prompt.
export interface SubagentCallOptions {
  task: string;
  instructions: string;
  // Subagents inherit the parent's model so subagent cost and capability follow
  // whatever was selected at the application level. We deliberately do not add
  // a sandbox concept yet — the Electron main process IS the execution host.
  model?: LanguageModel;
}

// Shape the subagent `experimental_context` carries while it runs. Today it is
// just the model; sandbox, skills, or other services can be added here later
// without touching every subagent registration.
export interface SubagentExecutionContext {
  model?: LanguageModel;
}
