---
name: agents-commenting-rules
description: Require concise comments when modifying the agents module or adjacent agent workflow code. Use when changing files under src/main/agents, or when agent/tool/approval flow changes touch chat-service, oRPC, or chat UI integration.
---

# Agents Commenting Rules

Apply this skill whenever work touches the repository's agent runtime, tools, or agent workflow wiring.

## Scope

Use this skill when editing:

- `src/main/agents/**`
- adjacent flow files that change agent execution behavior, such as:
  - `src/main/services/chat-service.ts`
  - `src/main/orpc/router.ts`
  - `src/renderer/src/routes/_dashboard/chat/{-$sessionId}.tsx`
  - `src/renderer/src/lib/orpc.ts`

## Required Commenting Rule

For touched agent-related code, add or update concise comments on:

- helper functions with non-obvious behavior
- safety guards and fallback paths
- approval, continuation, or retry flow branches
- cross-process or persistence handoff points
- tool execution rules and path-resolution constraints

Keep comments short and specific. Explain the constraint, intent, or reason. Do not narrate obvious assignments or restate the code mechanically.

## Good Targets

Typical places that should carry comments after edits:

- path normalization and workspace-boundary checks
- blocked command filters and execution safeguards
- `rg` to `grep` fallback logic
- provider/env resolution rules
- assistant message continuation vs new-turn persistence
- approval-requested to approval-responded resume flow

## Comment Style

- Prefer one short comment directly above the function or block it explains.
- Focus on "why this branch exists" or "what invariant this preserves".
- Update stale comments in the same change whenever logic moves.
- If a touched helper or flow branch is still hard to understand without reading multiple files, it probably needs a comment.

## Before Finishing

For every changed agent-related file:

1. Re-read the touched helper functions and flow branches.
2. Check that non-obvious behavior has a concise comment.
3. Remove or rewrite comments that no longer match the code.
