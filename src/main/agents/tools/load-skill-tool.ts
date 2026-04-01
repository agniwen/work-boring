import { tool } from 'ai';
import { z } from 'zod';

import type { InstalledSkillRecord, SkillService } from '../../services/skill-service';

export interface SkillToolContext {
  skillService: SkillService;
  skills: InstalledSkillRecord[];
}

// Loads specialized instructions from a discovered SKILL.md file.
// The agent calls this when the user's request matches an available skill.
export function createLoadSkillTool(context: SkillToolContext) {
  return tool({
    description:
      'Load a skill to get specialized instructions. Use this when the user request would benefit from a skill listed in the system prompt.',
    inputSchema: z.object({
      name: z.string().describe('The skill name to load (case-insensitive).'),
    }),
    execute: async ({ name }) => {
      const result = await context.skillService.readSkillContent(context.skills, name);

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
