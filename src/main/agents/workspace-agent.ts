import { InferAgentUIMessage, ToolLoopAgent } from 'ai';

import { buildWorkspaceAgentInstructions } from './prompt';
import { createMainLanguageModel, getMainLanguageModelName } from './provider';
import { createWorkspaceTools, type WorkspaceTools } from './tools';

export type WorkspaceAgent = ToolLoopAgent<never, WorkspaceTools, any>;
export type WorkspaceAgentUIMessage = InferAgentUIMessage<WorkspaceAgent>;

export interface WorkspaceAgentRuntime {
  agent: WorkspaceAgent;
  instructions: string;
  modelName: string;
  workspaceRoot: string;
}

export function createWorkspaceAgentRuntime(input?: {
  workspaceRoot?: string;
}): WorkspaceAgentRuntime {
  // Bind prompt, tools, and model selection to a single workspace root for the whole runtime.
  const workspaceRoot = input?.workspaceRoot ?? process.cwd();
  const instructions = buildWorkspaceAgentInstructions({ workspaceRoot });

  return {
    agent: new ToolLoopAgent({
      model: createMainLanguageModel(),
      instructions,
      tools: createWorkspaceTools({ workspaceRoot }),
    }),
    instructions,
    modelName: getMainLanguageModelName(),
    workspaceRoot,
  };
}
