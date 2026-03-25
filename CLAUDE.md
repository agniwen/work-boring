# CLAUDE.md

This file provides project-specific context for coding agents working in this repository.

## Project Summary

This repository is **Boring Work**, an Electron desktop AI agent application built with:

- Electron 39
- React 19
- TypeScript
- Vite / electron-vite
- TanStack Router
- TanStack Query
- Vercel AI SDK
- oRPC over `MessagePort`
- local-first persistence with SQLite via `node:sqlite` + Drizzle ORM beta

The current product direction is:

- desktop-first
- local-first
- AI-agent oriented
- optimized for chat-driven workflows first
- designed to keep application data in the local app data directory instead of relying on a remote backend

## What The App Does

The app currently includes:

- a dashboard shell
- a chat page powered by AI SDK streaming
- a library of AI-centric UI components
- main/renderer communication through oRPC
- local persistence for chat sessions and chat messages

The persistence model is currently focused on:

- `chat_sessions`
- `chat_messages`

This is the first durable local state in the app and is intended to be the foundation for later agent memory, run history, checkpoints, or tool logs.

## Core Architecture

### Process Boundaries

The app follows the normal Electron three-process split:

1. `src/main/`
   - Electron main process
   - owns SQLite access
   - runs migrations on startup
   - hosts oRPC handlers
   - talks to the model provider

2. `src/preload/`
   - bridges renderer and main
   - upgrades a `MessagePort` connection for oRPC

3. `src/renderer/`
   - React application
   - never talks to SQLite directly
   - uses oRPC client utilities and AI SDK hooks

### Persistence Rule

**SQLite is main-process only.**

Do not add direct database access in renderer code. Renderer state is UI state only; persisted state must go through main-process APIs.

### Chat Data Flow

Current chat flow:

1. renderer loads or creates a session
2. renderer fetches persisted messages for that session
3. `useChat` renders and streams messages in-memory
4. message submission goes through oRPC to main
5. main persists the user message
6. main creates an assistant placeholder row
7. main streams model output
8. main finalizes the assistant row as `done`, `error`, or `aborted`

This means the database is the source of truth for chat history, not the React hook.

## Important Directories

### Main Process

- `src/main/index.ts`
  - app startup
  - migration execution
  - window creation
  - oRPC server wiring

- `src/main/orpc/router.ts`
  - main-process procedures exposed to renderer

- `src/main/db/`
  - Drizzle schema
  - DB client bootstrap
  - runtime migration
  - repositories

- `src/main/services/`
  - business logic that should not live in route handlers

### Renderer

- `src/renderer/src/routes/_dashboard/chat/route.tsx`
  - current chat UI
  - session selection
  - history restore
  - streaming interaction

- `src/renderer/src/lib/orpc.ts`
  - renderer oRPC client
  - AI SDK transport bridge to main process

- `src/renderer/src/components/ai-elements/`
  - reusable AI-oriented UI building blocks

### Shared Types

- `src/orpc/app-router.ts`
  - shared router type for renderer/main typing

## Database Notes

The app now uses:

- `node:sqlite`
- `drizzle-orm`
- `drizzle-kit`

### Migration Workflow

When schema changes:

1. edit `src/main/db/schema.ts`
2. run `pnpm db:generate`
3. commit the generated `drizzle/` migration output
4. app startup applies migrations automatically

Do not treat `push` as the normal production migration flow.

### Database File Location

The runtime DB file is created under:

- `app.getPath('userData')/app.db`

Do not move this into the repo, build output, or install directory.

## Commands

### Development

```bash
pnpm install
pnpm dev
pnpm start
```

### Quality

```bash
pnpm check
pnpm lint
pnpm exec tsc -p tsconfig.node.json --noEmit
pnpm exec tsc -p tsconfig.web.json --noEmit
```

### Database

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:studio
```

### Build

```bash
pnpm build
pnpm build:unpack
pnpm build:mac
pnpm build:win
pnpm build:linux
```

## Coding Guidance For This Repo

### Prefer These Patterns

- keep persistence logic in `src/main/services` and `src/main/db`
- keep route handlers thin
- keep renderer focused on UI/query/state orchestration
- use TanStack Query for persisted data reads and cache invalidation
- preserve the file-based route structure
- use the `@renderer/*` alias in renderer code

### Avoid These Mistakes

- do not import SQLite or Drizzle directly in renderer code
- do not put long business workflows straight into React components
- do not make the AI SDK hook the persistence source of truth
- do not edit `src/renderer/src/routeTree.gen.ts` manually
- do not store app data inside the repo working tree

### Session/Message Semantics

The current chat persistence assumptions are:

- multiple sessions
- one active session in the UI at a time
- messages ordered by `sequence`
- `parts_json` stores AI SDK message parts as JSON
- assistant rows are finalized after streaming, not token-by-token

If later work adds:

- tool calls
- attachments
- checkpoints
- runs
- vector memory

prefer evolving the schema deliberately instead of overloading the current chat tables.

## Packaging Notes

The build must preserve access to the `drizzle/` migration folder at runtime. If packaging changes break startup migration resolution, update the migration path resolver and electron-builder resource config together.

## Good First Places To Look

If you are debugging product behavior:

- startup and app wiring: `src/main/index.ts`
- main RPC surface: `src/main/orpc/router.ts`
- database schema and migration logic: `src/main/db/`
- chat UX and session restore: `src/renderer/src/routes/_dashboard/chat/route.tsx`
- renderer/main transport wiring: `src/renderer/src/lib/orpc.ts`
