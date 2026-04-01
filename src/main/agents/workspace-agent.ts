import { InferAgentUIMessage, ToolLoopAgent } from 'ai';
import { z } from 'zod';

import type { InstalledSkillRecord, SkillService } from '../services/skill-service';
import { buildSkillsPrompt, buildWorkspaceAgentInstructions } from './prompt';
import { createMainLanguageModel, getMainLanguageModelName } from './provider';
import { createWorkspaceTools } from './tools';

// Call options let the router inject freshly discovered skills per request
// so the agent prompt stays current without recreating the agent instance.
const callOptionsSchema = z.object({
  skills: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      location: z.string(),
    }),
  ),
});

function createAgent(input: {
  skillService: SkillService;
  skills: InstalledSkillRecord[];
  workspaceRoot: string;
  instructions: string;
}) {
  return new ToolLoopAgent({
    model: createMainLanguageModel(),
    instructions: input.instructions,
    tools: createWorkspaceTools({
      workspaceRoot: input.workspaceRoot,
      skillService: input.skillService,
      skills: input.skills,
    }),
    callOptionsSchema,
    // Append the skills catalogue to the system prompt at call time so newly
    // discovered skills appear without restarting the agent.
    prepareCall: ({ options, ...settings }) => {
      const base = typeof settings.instructions === 'string' ? settings.instructions : '';
      const skillsSection = buildSkillsPrompt(options.skills);
      return {
        ...settings,
        instructions: skillsSection ? `${base}\n\n${skillsSection}` : base,
      };
    },
  });
}

export type WorkspaceAgent = ReturnType<typeof createAgent>;
export type WorkspaceAgentUIMessage = InferAgentUIMessage<WorkspaceAgent>;

export interface WorkspaceAgentRuntime {
  agent: WorkspaceAgent;
  instructions: string;
  modelName: string;
  skillService: SkillService;
  workspaceRoot: string;
}

export function createWorkspaceAgentRuntime(input: {
  skillService: SkillService;
  skills: InstalledSkillRecord[];
  workspaceRoot?: string;
}): WorkspaceAgentRuntime {
  const workspaceRoot = input.workspaceRoot ?? process.cwd();
  const instructions = buildWorkspaceAgentInstructions({ workspaceRoot });

  return {
    agent: createAgent({
      skillService: input.skillService,
      skills: input.skills,
      workspaceRoot,
      instructions,
    }),
    instructions,
    modelName: getMainLanguageModelName(),
    skillService: input.skillService,
    workspaceRoot,
  };
}
