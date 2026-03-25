import { createBashTool } from './bash-tool';
import { createGrepTool } from './grep-tool';
import { createReadTool } from './read-tool';
import type { WorkspaceToolContext } from './shared';
import { createWriteTool } from './write-tool';

export function createWorkspaceTools(context: WorkspaceToolContext) {
  return {
    bash: createBashTool(context),
    grep: createGrepTool(context),
    read: createReadTool(context),
    write: createWriteTool(context),
  };
}

export type WorkspaceTools = ReturnType<typeof createWorkspaceTools>;
