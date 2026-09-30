---
id: 011
title: Transactional outbox for manual meal imports
status: accepted
date: 2026-07-29
supersedes: [008, 009]
---

# Context

The webapp owns manual meal entries and the food catalog. Victus Agent owns accepted
`meal.logged` events and nutrition projections. A local meal entry must not be written directly to
the agent database, and creating an entry cannot lose its agent delivery if the process fails.

# Decision

Each newly created manual meal entry receives a UUID `external_meal_id`. The current UI creates
one item per meal, so its `meal_log_entry_id` becomes the stable `external_item_id`.

The same database transaction inserts the local meal entry and a `meal_import_outbox` row. Its
JSON payload implements `ManualMealRecorded`: it contains an immutable `message_id`, producer
timestamp, authenticated `user_id`, stable meal/item identifiers, the description snapshot, and
optional catalog references. The outbox is the only source for a future authenticated publisher.

Updates and deletions do not emit agent events until versioned `meal.edited` and `meal.deleted`
contracts are implemented. The transport URL and integration credential are intentionally not
guessed because they are outside the supplied contract.

# Consequences

- The local write and pending delivery are atomic and can be retried without regenerating the
  producer message ID.
- Existing entries receive generated external meal IDs during schema initialization.
- The outbox does not duplicate agent events or projections and never writes agent storage.
- Enabling dispatch requires a separately reviewed authenticated agent ingestion boundary.
