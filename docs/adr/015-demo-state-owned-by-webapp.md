---
id: 015-demo-state-owned-by-webapp
title: WebApp owns temporary public-demo state
status: accepted
date: 2026-09-27
---

# Context

The public demo originally had two independent temporary stores: WebApp state
for the interactive preview and an in-process event sink in `victus-agent`.
They shared a browser session identifier but not their data, so a meal captured
in chat could not appear in the preview.

# Decision

The WebApp's existing UUID-keyed, 30-minute in-memory demo store is the sole
owner of temporary meals and biometrics. The agent receives a read snapshot on
each demo turn and sends validated meal captures to a WebApp internal endpoint.
That endpoint requires a service token and resolves only exact FoodB names;
unresolved names require clarification instead of being guessed.

The agent retains only LangGraph checkpoints and conversational memory per
signed `sid`; it no longer owns an event store for demo meal capture.

# Consequences

- Chat and preview observe the same temporary meal state.
- Reloading the page or expiring the UUID continues to discard all demo data.
- The agent and WebApp must share the internal endpoint URL and service token.
- Synonym and semantic food matching remain future tooling work.
