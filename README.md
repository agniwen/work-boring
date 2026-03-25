# Boring Work

`Boring Work` is a local-first Electron desktop AI agent application.

It is built with:

- Electron 39
- React 19
- TypeScript
- Vite / electron-vite
- TanStack Router
- TanStack Query
- Vercel AI SDK
- oRPC
- SQLite via `node:sqlite`
- Drizzle ORM beta

The current product focus is a desktop chat-driven AI workflow app with persistent local sessions and messages.

## Current Scope

The app currently includes:

- a desktop shell built on Electron
- a React renderer app
- AI SDK streaming chat
- main/renderer RPC over `MessagePort`
- local-first chat persistence

The first durable data model covers:

- chat sessions
- chat messages

This persistence layer is intended to be the base for future agent memory, execution logs, checkpoints, and other local data.

## Local-First Architecture

The app uses a strict boundary for persistence:

- renderer does not access SQLite directly
- main process owns the database
- renderer reads and mutates persisted state through oRPC only

### Process Model

1. `src/main/`
   - Electron main process
   - app lifecycle
   - window creation
   - oRPC server
   - SQLite access
   - migration execution
   - model calls

2. `src/preload/`
   - secure bridge between renderer and main
   - upgrades the oRPC `MessagePort` channel

3. `src/renderer/`
   - React application
   - route-driven UI
   - TanStack Query data fetching
   - AI SDK chat hook usage

### Chat Persistence Flow

Current chat behavior:

1. renderer loads or creates a chat session
2. renderer fetches persisted messages for that session
3. user sends a message
4. main process persists the user message
5. main creates an assistant placeholder row
6. model output streams back to renderer
7. main finalizes the assistant message as `done`, `error`, or `aborted`

The database is the source of truth for history. The React chat state is only the active UI state.

## Database

The app uses:

- `node:sqlite`
- `drizzle-orm`
- `drizzle-kit`

### Runtime Database Location

The SQLite file is created under the Electron user data directory:

- `app.getPath('userData')/app.db`

Do not store runtime app data inside the repo.

### Migration Workflow

Schema changes should follow this flow:

1. edit `src/main/db/schema.ts`
2. run `pnpm db:generate`
3. review the generated SQL in `drizzle/`
4. commit the migration files
5. start the app and let main process apply migrations automatically

## Project Structure

```text
.
├── drizzle/                     # generated SQL migrations and snapshots
├── src/
│   ├── main/
│   │   ├── db/                  # schema, client, migrations, repositories
│   │   ├── services/            # main-process business logic
│   │   ├── index.ts             # Electron startup and runtime wiring
│   │   └── orpc/router.ts       # renderer-facing RPC surface
│   ├── preload/                 # secure Electron bridge
│   ├── orpc/                    # shared router typing/channel constants
│   └── renderer/
│       └── src/
│           ├── routes/          # TanStack file-based routes
│           ├── components/      # UI and AI elements
│           ├── lib/             # query client, RPC client, utilities
│           └── main.tsx         # renderer entry
├── drizzle.config.ts
├── electron-builder.yml
└── CLAUDE.md / AGENTS.md        # repo guidance for coding agents
```

## Commands

### Install

```bash
pnpm install
```

### Development

```bash
pnpm dev
pnpm start
```

### Database

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:studio
```

### Quality

```bash
pnpm check
pnpm lint
pnpm exec tsc -p tsconfig.node.json --noEmit
pnpm exec tsc -p tsconfig.web.json --noEmit
```

### Build

```bash
pnpm build
pnpm build:unpack
pnpm build:mac
pnpm build:win
pnpm build:linux
```

## Notes For Contributors

- Do not edit `src/renderer/src/routeTree.gen.ts` manually.
- Keep SQLite and Drizzle imports out of renderer code.
- Keep route handlers thin; put workflow logic in `src/main/services`.
- Prefer evolving the schema explicitly instead of overloading the current chat tables with unrelated concepts.
- If packaging changes affect migrations, update the runtime migration path resolution and build resource configuration together.
