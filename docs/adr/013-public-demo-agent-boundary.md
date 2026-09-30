---
id: 013-public-demo-agent-boundary
title: Public David demo agent boundary
status: accepted
date: 2026-09-15
---

# Context

The landing page exposes a public, interactive demonstration of Victus. It must not use a visitor identity, write application data, or access a real user's context.

# Decision

The WebApp exposes a separate rate-limited `/api/demo/chat/stream` gateway. It signs a 60-second JWT for `demo:david`, with `demo: true`, `demo:chat`, `demo:read`, and `profile_version: david-v1`, then calls the agent's dedicated `/demo/chat` endpoint. The browser never receives this token. The agent must restrict this identity to the immutable David fixture and read-only tools.

# Consequences

- Demo messages and responses are not persisted by the WebApp.
- The normal authenticated chat endpoint and user data remain unchanged.
- The agent must implement the documented demo endpoint and deny all non-read tools for demo identities.
