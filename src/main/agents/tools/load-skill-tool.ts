import { tool } from 'ai';
import { z } from 'zod';

import type { SkillService } from '../../services/skill-service';

export interface SkillToolContext {
  skillService: SkillService;
}

// Loads specialized instructions from a discovered SKILL.md file.
// The agent calls this when the user's request matches an available skill.
//
// Discovery is re-run on every invocation rather than relying on a list
// captured at tool-creation time. The tool is created once at app startup,
// so a captured list would be stale (and previously was empty, since the
// runtime is wired with `skills: []` before discovery completes). Each
// loadSkill call is user-initiated via the model, so the extra fs scan is
// negligible and guarantees we always see skills installed after startup.
export function createLoadSkillTool(context: SkillToolContext) {
  return tool({
    description:
      'Load a skill to get specialized instructions. Use this when the user request would benefit from a skill listed in the system prompt.',
    inputSchema: z.object({
      name: z.string().describe('The skill name to load (case-insensitive).'),
    }),
    execute: async ({ name }) => {
      const { skills } = await context.skillService.listInstalledSkills();
      const result = await context.skillService.readSkillContent(skills, name);

      if (!result) {
        return { error: `Skill '${name}' not found.` };
      }

      return {
        skillDirectory: result.skillDirectory,
        content: result.content,
      };
    },
  });
}
