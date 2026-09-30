---
id: 017-foodb-spanish-localizations
title: Spanish FoodB localizations and curated aliases
status: accepted
date: 2026-09-29
---

# Context

FoodB is the source of nutrient values and stable food identifiers, but its
canonical names are English. A user-facing Spanish name must be searchable by
the application and resolvable by the meal-capture tool without asking the
language model to infer a nutritional equivalence.

# Decision

Keep `foodb_nutrition_foods` as the unmodified FoodB source table. Store one
canonical display name per FoodB record and locale in
`foodb_food_localizations`. Store additional reviewed user expressions in
`foodb_food_aliases`. Both tables are keyed by `food_id`; they are not a
second nutrition catalog.

The backend owns resolution. It normalizes input, tries exact aliases and
localized names, and either returns one food or a bounded candidate list. A
write is never chosen by fuzzy search or the LLM. The agent presents the
backend clarification and retries only after the user selects a candidate.

The localization importer accepts a versioned CSV with stable `food_id` and
`display_name` fields. It validates every identifier against the current FoodB
catalog, derives normalized search text server-side, upserts transactionally,
and stores the source checksum in `foodb_localization_imports`.

# Consequences

The Spanish workbook is converted into an auditable CSV before import. FoodB
refreshes upsert canonical foods rather than truncating the parent table, so
localizations and aliases for still-valid FoodB IDs survive a refresh. Alias
quality remains a curation process; ambiguous aliases intentionally produce a
question instead of a silent write.
