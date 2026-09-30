---
id: 016-agent-profile-context-boundary
title: WebApp owns persisted profile context for the agent
status: accepted
date: 2026-09-28
---

# Context

The agent and WebApp have separate PostgreSQL databases. The public demo's David profile is now
seeded in the WebApp database, so serializing a duplicate fixture into the agent prompt would make
the fixture a second source of truth.

# Decision

The WebApp exposes `POST /internal/agent/profile`, authenticated with the existing agent service
token. The agent submits only its authenticated subject and a constrained read section. The WebApp
maps `demo:david` to the seeded David user and resolves normal subjects as UUID user IDs.

The response is deliberately limited to the latest meal-log day and basic biometric values (weight,
sleep, energy, and adherence). It never accepts a user ID from browser or LLM tool arguments.

# Consequences

The `profile` agent tool works uniformly for authenticated users and the demo without a direct
connection to the WebApp database. Missing meal logs are represented as an empty diet. The agent
service token and WebApp availability are required to answer profile questions.
