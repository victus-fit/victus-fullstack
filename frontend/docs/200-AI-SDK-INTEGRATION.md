# AI SDK Integration Plan

AI SDK is not an animation library. It manages chat state and streaming transport. Chat animations are handled by Motion.

## Why not active in this demo?

The frontend must run without backend configuration. AI SDK expects a backend endpoint compatible with its chat stream protocol. Until FastAPI implements that route, this V1 uses a local mock stream.

## Target frontend hook

Future replacement for `useMockVictusChat`:

```ts
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';

const chat = useChat({
  transport: new DefaultChatTransport({
    api: '/api/chat',
    credentials: 'include',
  }),
});
```

## Target backend endpoint

FastAPI should expose an endpoint that can send AI-SDK-compatible UI message streams, or FastAPI should adapt LangGraph streaming events into that shape.

## Required UX states

- ready
- submitted
- streaming
- error
- stopped
- regenerated
