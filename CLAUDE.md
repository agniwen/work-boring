# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is "Boring Work" - an Electron desktop application built with React 19 and TypeScript. The app features extensive AI-related UI components and follows a modern architecture with TanStack Router, TanStack Query, and Tailwind CSS v4.

## Development Commands

```bash
# Development
pnpm dev              # Start Electron app in development mode with HMR
pnpm start            # Preview production build

# Code Quality
pnpm lint             # Format code with oxfmt, then run oxlint with auto-fix
pnpm check            # Check code formatting with oxfmt (no changes)

# Building
pnpm build            # Check formatting and build for production
pnpm build:mac        # Check formatting, build, and package for macOS
pnpm build:win        # Build and package for Windows
pnpm build:linux      # Check formatting, build, and package for Linux
pnpm build:unpack     # Build without packaging (for testing)
```

## Architecture

### Three-Process Model

Electron apps run in three separate processes:

1. **Main Process** (`src/main/index.ts`)
   - Node.js environment
   - Manages app lifecycle, window creation, and native APIs
   - Handles IPC communication with renderer
   - App name: "Boring Work" (app ID: `com.boringwork.app`)

2. **Preload Script** (`src/preload/index.ts`)
   - Bridge between main and renderer processes
   - Exposes safe APIs to renderer via `contextBridge`
   - Currently exposes `window.electron` and `window.api`

3. **Renderer Process** (`src/renderer/`)
   - React 19 application running in Chromium
   - Uses TanStack Router for routing
   - Uses TanStack Query for data fetching
   - Styled with Tailwind CSS v4

### Key Architectural Patterns

- **File-based Routing**: Routes are defined in `src/renderer/src/routes/` and auto-generate `routeTree.gen.ts`
- **Router Context**: QueryClient is passed through router context for data fetching integration
- **Import Alias**: Use `@renderer` alias for imports within renderer code (configured in `electron.vite.config.ts`)
- **Type Safety**: Full TypeScript coverage with type-aware linting via oxlint

### Naming Conventions

- **Files and Folders**: Use kebab-case for all file and folder names
  - Components: `sidebar.tsx`, `chat-input.tsx`
  - Folders: `-components`, `ai-elements`, `query-client.ts`
  - Route-specific component folders use `-components` prefix (e.g., `routes/_dashboard/-components/`)

## Project Structure

```
src/
├── main/           # Electron main process (Node.js)
│   └── index.ts    # App lifecycle, window management, IPC handlers
├── preload/        # Preload scripts (security bridge)
│   ├── index.ts    # Context bridge API exposure
│   └── index.d.ts  # Type definitions for exposed APIs
└── renderer/       # React application (Chromium)
    └── src/
        ├── main.tsx              # Entry point
        ├── router.tsx            # Router configuration
        ├── routes/               # File-based routes (auto-generates routeTree.gen.ts)
        │   ├── __root.tsx        # Root layout
        │   ├── index.tsx         # Home route
        │   └── dashboard/        # Nested routes
        ├── components/
        │   ├── ui/               # Reusable UI components
        │   └── ai-elements/      # AI-specific components (agent, artifact, canvas, etc.)
        └── lib/
            ├── query-client.ts   # TanStack Query configuration
            └── utils.ts          # Utility functions
```

## Important Technical Details

### Routing

- Uses TanStack Router with file-based routing
- Routes in `src/renderer/src/routes/` auto-generate `routeTree.gen.ts` (do not edit manually)
- Router context includes QueryClient for seamless data fetching integration
- Default preload strategy: `intent` (preload on hover/focus)

### IPC Communication

- Main ↔ Renderer communication happens through preload script
- Use `contextBridge.exposeInMainWorld()` to safely expose APIs
- Currently exposes: `window.electron` (electron-toolkit APIs) and `window.api` (custom APIs)

### Code Quality Tools

- **oxlint**: Type-aware linting with React, TypeScript, import, jsx-a11y, unicorn, promise, node, and oxc plugins
- **oxfmt**: Code formatting (check with `pnpm check`)
- Linting ignores: `dist/`, `.output/`, `src/generated/`, `src/renderer/src/routeTree.gen.ts`

### Build Configuration

- Uses `electron-vite` for fast builds with Vite
- Separate configurations for main, preload, and renderer processes
- Renderer uses TanStack Router plugin and Tailwind CSS plugin
- Build outputs to `out/` directory

## Component Library

The project includes two component sets:

1. **UI Components** (`components/ui/`): Standard UI primitives (button, input, dialog, etc.)
2. **AI Elements** (`components/ai-elements/`): Specialized AI interface components including:
   - Agent, artifact, canvas, chain-of-thought
   - Code blocks, terminals, test results
   - Conversation, message, prompt input
   - File trees, schemas, sandboxes
   - And many more AI-specific UI patterns
