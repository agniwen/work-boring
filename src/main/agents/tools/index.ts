import { createBashTool } from './bash-tool';
import { createGrepTool } from './grep-tool';
import { createLoadSkillTool, type SkillToolContext } from './load-skill-tool';
import { createReadTool } from './read-tool';
import type { WorkspaceToolContext } from './shared';
import { createWriteTool } from './write-tool';

export type WorkspaceToolsContext = WorkspaceToolContext & SkillToolContext;

export function createWorkspaceTools(context: WorkspaceToolsContext) {
  return {
    bash: createBashTool(context),
    grep: createGrepTool(context),
    loadSkill: createLoadSkillTool(context),
    read: createReadTool(context),
    write: createWriteTool(context),
  };
}

export type WorkspaceTools = ReturnType<typeof createWorkspaceTools>;
