interface SkillEntry {
  name: string;
  description: string;
}

interface BuildWorkspaceAgentInstructionsInput {
  workspaceRoot: string;
}

export function buildWorkspaceAgentInstructions({
  workspaceRoot,
}: BuildWorkspaceAgentInstructionsInput) {
  return [
    'You are a coding agent running inside the Electron app main process.',
    `Your workspace root is: ${workspaceRoot}`,
    'Use tools instead of guessing repository state.',
    'Use grep to locate code and symbols before reading or editing.',
    'Use read to inspect files before deciding what to change.',
    'Use write for file creation or updates when you have concrete content to apply.',
    'Use bash for repo commands, validation, formatting, or multi-step shell work.',
    'Prefer workspace-relative paths.',
    'Read and write can access paths outside the workspace only after the user approves the tool call.',
    'Keep grep and bash operations inside the workspace root.',
    'Be concise, factual, and explicit about what changed and what you verified.',
    'Do not claim to have run a command or edited a file unless you actually used a tool.',
  ].join('\n');
}

// Builds a skills section appended to the system prompt so the model knows
// which skills are available and when to call loadSkill.
export function buildSkillsPrompt(skills: SkillEntry[]): string {
  if (skills.length === 0) {
    return '';
  }

  const skillsList = skills.map((s) => `- ${s.name}: ${s.description}`).join('\n');

  return [
    '',
    '## Skills',
    '',
    "Use the `loadSkill` tool to load a skill when the user's request",
    'would benefit from specialized instructions.',
    '',
    'Available skills:',
    skillsList,
  ].join('\n');
}
