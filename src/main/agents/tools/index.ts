import { createBashTool } from './bash-tool';
import { createGlobTool } from './glob-tool';
import { createGrepTool } from './grep-tool';
import { createListTool } from './list-tool';
import { createLoadSkillTool, type SkillToolContext } from './load-skill-tool';
import { createPlanTool } from './plan-tool';
import { createReadTool } from './read-tool';
import type { WorkspaceToolContext } from './shared';
import { createWriteTool } from './write-tool';

export type WorkspaceToolsContext = WorkspaceToolContext & SkillToolContext;

export function createWorkspaceTools(context: WorkspaceToolsContext) {
  return {
    bash: createBashTool(context),
    glob: createGlobTool(context),
    grep: createGrepTool(context),
    list: createListTool(context),
    loadSkill: createLoadSkillTool(context),
    plan: createPlanTool(),
    read: createReadTool(context),
    write: createWriteTool(context),
  };
}

export type WorkspaceTools = ReturnType<typeof createWorkspaceTools>;
