---
id: 014-ephemeral-interactive-demo-sessions
title: Ephemeral interactive demo sessions
status: accepted
date: 2026-09-27
---

# Context

The public demo must let a visitor modify meals and biometrics without an
account, database persistence, or state shared with another browser tab.

# Decision

The browser creates a UUID in module memory when the landing preview mounts.
It sends that identifier in `X-Demo-Session-Id` only to `/api/demo/*` data
routes. The backend stores table-shaped meal and metric records in an
in-process, TTL-bound map keyed by that UUID. Demo routes return the same
response shapes as the authenticated meal and health APIs, while food catalog
reads continue to use the canonical FoodB tables.

# Consequences

- A reload creates a new identifier, so previous demo state is unreachable.
- Separate tabs use different identifiers and cannot read or mutate one
  another's state.
- Demo state is lost on a backend restart and is unsuitable for multi-instance
  deployment until the store is moved to a shared TTL cache.
- The upstream read-only `demo:david` agent remains unchanged; its responses
  are not yet personalized from this temporary state.
