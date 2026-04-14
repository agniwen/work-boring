import { InferAgentUIMessage, stepCountIs, ToolLoopAgent, type LanguageModel } from 'ai';
import { z } from 'zod';

import type { InstalledSkillRecord, SkillService } from '../services/skill-service';
import { buildSkillsPrompt, buildWorkspaceAgentInstructions } from './prompt';
import { createMainLanguageModel, getMainLanguageModelName } from './provider';
import { createSubagentRegistry, type SubagentRegistry } from './subagents';
import type { SubagentExecutionContext } from './subagents/types';
import { createWorkspaceTools } from './tools';

// Call options flow in per-stream-invocation. Skills are rediscovered each turn.
// `subagentModel` is reserved for a future config UI — today subagents inherit
// the main model automatically.
const callOptionsSchema = z.object({
  skills: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      location: z.string(),
    }),
  ),
  subagentModel: z.any().optional(),
});

type MainAgentCallOptions = z.infer<typeof callOptionsSchema> & {
  subagentModel?: LanguageModel;
};

function createAgent(input: {
  mainModel: LanguageModel;
  skillService: SkillService;
  skills: InstalledSkillRecord[];
  subagents: SubagentRegistry;
  workspaceRoot: string;
  instructions: string;
}) {
  return new ToolLoopAgent({
    model: input.mainModel,
    instructions: input.instructions,
    tools: createWorkspaceTools({
      workspaceRoot: input.workspaceRoot,
      skillService: input.skillService,
      skills: input.skills,
      subagents: input.subagents,
    }),
    // Single-step loop: each .stream() call advances by one model turn so the
    // outer chat-service loop controls continuation, persists per step, and can
    // pause cleanly for approvals or ask-user-question. This mirrors the
    // open-agents external-loop pattern.
    stopWhen: stepCountIs(1),
    callOptionsSchema,
    prepareCall: ({ options, ...settings }) => {
      const typedOptions = options as MainAgentCallOptions;
      const base = typeof settings.instructions === 'string' ? settings.instructions : '';
      const skillsSection = buildSkillsPrompt(typedOptions.skills);

      // Expose the configured model (and optional subagent override) to tools via
      // experimental_context. The task tool forwards this to whichever subagent
      // it invokes so the whole hierarchy stays on one provider without refetching.
      const execContext: SubagentExecutionContext = {
        model: typedOptions.subagentModel ?? input.mainModel,
      };

      return {
        ...settings,
        instructions: skillsSection ? `${base}\n\n${skillsSection}` : base,
        experimental_context: execContext,
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
  const mainModel = createMainLanguageModel();
  const subagents = createSubagentRegistry({
    defaultModel: mainModel,
    toolContext: { workspaceRoot },
  });

  return {
    agent: createAgent({
      mainModel,
      skillService: input.skillService,
      skills: input.skills,
      subagents,
      workspaceRoot,
      instructions,
    }),
    instructions,
    modelName: getMainLanguageModelName(),
    skillService: input.skillService,
    workspaceRoot,
  };
}
