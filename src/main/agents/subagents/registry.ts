import type { LanguageModel } from 'ai';

import type { WorkspaceToolContext } from '../tools/shared';
import { createExecutorSubagent } from './executor';
import { createExplorerSubagent } from './explorer';
import type { SubagentType } from './types';

export interface SubagentRegistry {
  explorer: ReturnType<typeof createExplorerSubagent>;
  executor: ReturnType<typeof createExecutorSubagent>;
}

// Single source of truth for subagent instances. Exposed as a registry so the task
// tool can dispatch by string name while TypeScript still checks the call options
// and the available set.
export function createSubagentRegistry(input: {
  defaultModel: LanguageModel;
  toolContext: WorkspaceToolContext;
}): SubagentRegistry {
  return {
    explorer: createExplorerSubagent(input.toolContext, input.defaultModel),
    executor: createExecutorSubagent(input.toolContext, input.defaultModel),
  };
}

export const SUBAGENT_METADATA: Record<SubagentType, { purpose: string; writeAccess: boolean }> = {
  explorer: {
    purpose:
      'Read-only exploration of the workspace. Use when you need to locate code, understand structure, or summarize findings without modifying anything.',
    writeAccess: false,
  },
  executor: {
    purpose:
      'Focused implementation. Use when you already know what needs to happen and want a subagent to execute read/write/edit/bash end-to-end.',
    writeAccess: true,
  },
};
