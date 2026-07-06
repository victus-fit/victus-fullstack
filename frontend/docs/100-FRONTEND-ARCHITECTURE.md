# Frontend Architecture

## Decision

Use Vite + React + TypeScript.

Do not use Next.js for V1 because FastAPI is intended to own backend concerns such as auth, sessions, entitlements, rate limits, logging and LangGraph proxying.

## Current runtime model

```txt
Browser
  -> Vite React app
  -> local mock chat stream
```

## Future runtime model

```txt
Browser
  -> React chat UI
  -> AI SDK transport
  -> FastAPI /api/chat
  -> LangGraph remote service
```

## UI principles

- Chat is primary.
- Evidence and trace appear beside the chat.
- No decorative gradients.
- No artificial glow effects.
- Palette is professional and semantic.
- Motion is restrained and functional.

## State split

Current V1:

- `useMockVictusChat` owns demo chat state.
- `useTheme` owns persisted light/dark mode.

Future:

- AI SDK `useChat` should own chat stream state.
- TanStack Query can own server state when threads, user, billing and profile are added.
- Zustand can be added only for small UI state if needed.
