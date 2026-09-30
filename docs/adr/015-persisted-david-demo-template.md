---
id: 015-persisted-david-demo-template
title: Persisted David demo template
status: accepted
date: 2026-09-28
---

# Context

The anonymous demo needs a stable, inspectable baseline without allowing a
visitor to alter the shared David profile.

# Decision

Seed David as a reserved application user with baseline metric and preference
records in the existing PostgreSQL tables. When an anonymous demo session is
created, the backend clones those records into its TTL-bound in-memory session
state. Visitor updates remain only in that session.

# Consequences

- The stable profile is managed and auditable through the normal application
  data structures.
- Demo visitors cannot write to David's persisted records.
- The recipe-like weekly plan remains in the agent fixture because the webapp
  currently has meal logs but no persistent diet-plan/recipe model.
