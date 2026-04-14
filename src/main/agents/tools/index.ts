import type { SubagentRegistry } from '../subagents';
import { createAskUserQuestionTool } from './ask-user-question-tool';
import { createBashTool } from './bash-tool';
import { createEditTool } from './edit-tool';
import { createGlobTool } from './glob-tool';
import { createGrepTool } from './grep-tool';
import { createLoadSkillTool, type SkillToolContext } from './load-skill-tool';
import { createReadTool } from './read-tool';
import type { WorkspaceToolContext } from './shared';
import { createTaskTool } from './task-tool';
import { createTodoWriteTool } from './todo-tool';
import { createWebFetchTool } from './web-fetch-tool';
import { createWriteTool } from './write-tool';

export type WorkspaceToolsContext = WorkspaceToolContext &
  SkillToolContext & {
    subagents: SubagentRegistry;
  };

export function createWorkspaceTools(context: WorkspaceToolsContext) {
  return {
    askUserQuestion: createAskUserQuestionTool(),
    bash: createBashTool(context),
    edit: createEditTool(context),
    glob: createGlobTool(context),
    grep: createGrepTool(context),
    loadSkill: createLoadSkillTool(context),
    read: createReadTool(context),
    task: createTaskTool({ subagents: context.subagents }),
    todoWrite: createTodoWriteTool(),
    webFetch: createWebFetchTool(),
    write: createWriteTool(context),
  };
}

export type WorkspaceTools = ReturnType<typeof createWorkspaceTools>;
