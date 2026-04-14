// Upper bound on steps any single subagent invocation may take. This protects the caller
// from runaway loops and keeps subagent cost bounded even if the model misbehaves.
export const SUBAGENT_STEP_LIMIT = 50;

// Formatted reminder appended to every subagent prompt so the final message follows
// a predictable **Summary** / **Answer** structure that the task tool can surface to
// the parent agent as the tool result.
export const SUBAGENT_RESPONSE_REMINDER = [
  '',
  '## Response Format',
  '',
  'When you have completed the task, respond with a final assistant message that uses:',
  '',
  '**Summary**: one or two sentences describing what you did.',
  '',
  '**Answer**: the concrete result (file paths, findings, changes, conclusions).',
  '',
  'Do not wrap this in code fences. Keep the final message concise — the parent agent',
  'only sees this final message, not your intermediate tool calls.',
].join('\n');
