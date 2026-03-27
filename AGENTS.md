# AGENTS.md

This repository is an Electron desktop AI agent application with local-first persistence.

## Project Intent

The app is designed around:

- desktop-native delivery
- local-first storage
- chat-first AI workflows
- main-process ownership of persistence and model execution

Current persisted scope is intentionally narrow:

- chat sessions
- chat messages

Treat this as the base layer for future agent memory and execution state, not as a throwaway demo store.

## Hard Boundaries

### SQLite Access

- SQLite lives in the main process only.
- Do not add Drizzle or `node:sqlite` usage to renderer code.
- Renderer persistence must go through oRPC.

### Data Flow

- renderer owns presentation and interaction state
- main owns persistence and workflow state
- database is the source of truth for chat history

### Routing

- routes are file-based under `src/renderer/src/routes/`
- do not edit `src/renderer/src/routeTree.gen.ts` manually

### UI Components

- when adding or replacing renderer UI components, prefer HeroUI first
- avoid introducing new shadcn/ui primitives when an equivalent HeroUI component already fits the use case
- keep existing shadcn/ui usage only when there is no practical HeroUI replacement or the surrounding code already depends on that primitive pattern

## Important Files

- `src/main/index.ts`
  - startup
  - window creation
  - migration execution
  - oRPC bootstrapping

- `src/main/orpc/router.ts`
  - main-process RPC surface

- `src/main/db/schema.ts`
  - Drizzle schema

- `src/main/db/client.ts`
  - SQLite bootstrap and Drizzle client

- `src/main/services/chat-service.ts`
  - chat persistence + streaming lifecycle

- `src/renderer/src/lib/orpc.ts`
  - renderer RPC client and AI SDK transport bridge

- `src/renderer/src/routes/_dashboard/chat/route.tsx`
  - current chat UI and session orchestration

## Preferred Change Pattern

When adding product behavior:

1. update or add main-process service logic
2. expose a thin oRPC procedure
3. consume it from renderer with TanStack Query or explicit actions
4. keep React components focused on UI orchestration

## Agents Module Commenting

When editing `src/main/agents/**`, add or update concise comments for non-obvious helper functions and workflow branches.

This includes:

- safety checks and blocked-command guards
- path resolution and workspace-boundary logic
- approval, continuation, retry, and fallback branches
- cross-process handoff points when agent flow changes reach adjacent files

If the same change touches agent workflow integration outside `src/main/agents/**` such as `src/main/services/chat-service.ts`, `src/main/orpc/router.ts`, or the chat transport/UI files, add matching flow comments there too.

Do not add comments for trivial assignments or obvious JSX. Keep comments short, accurate, and updated with the code.

## Database Workflow

For schema changes:

1. edit `src/main/db/schema.ts`
2. run `pnpm db:generate`
3. commit the generated `drizzle/` files
4. verify startup migration still works

Do not treat `drizzle-kit push` as the primary production workflow.

## Validation Before Finishing

For meaningful changes, prefer to validate with:

```bash
pnpm exec tsc -p tsconfig.node.json --noEmit
pnpm exec tsc -p tsconfig.web.json --noEmit
pnpm build
```

If the change touches schema:

```bash
pnpm db:generate
```

## Things To Avoid

- mixing renderer state with persistence state
- token-by-token DB writes during model streaming
- moving runtime app data into the repo
- putting nontrivial business logic straight into route components
- bypassing the main process for durable data writes
