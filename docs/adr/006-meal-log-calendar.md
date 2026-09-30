---
id: 006-meal-log-calendar
title: Calendar-based meal logging
status: accepted
date: 2026-07-22
---

# Context

Victus needs a user-controlled record of meals by day. The USDA Foundation Foods catalog already provides food identities, portions, and nutrient values per 100 g, but it does not represent food actually consumed by a user.

# Decision

Store each food served as one `user_meal_log_entries` row owned by the authenticated user. Each entry records a local `consumed_on` date, meal slot, USDA `fdc_id`, immutable food-description snapshot, quantity, grams served, optional catalog portion, and optional note.

The server derives daily calories, macros, and every available nutrient on read using:

`amount_per_100g * serving_grams * quantity / 100`

Energy uses the existing catalog fallback order: nutrient `2048`, then `2047`, then `1008`.

The `Plan semanal` UI displays a weekly calendar, selected-day meal slots, and daily totals. It does not calculate targets, assess adherence, or produce dietary recommendations.

# Consequences

- Meal logs retain their original food description even if catalog text is later refreshed.
- Nutrient totals always reflect the recorded grams and quantity without duplicating nutrition data into each entry.
- Access is constrained by `user_id` in every meal-log query; unsafe mutations require CSRF.
- Catalog deletion is restricted while it is referenced by a meal-log entry.

# Alternatives considered

- Storing daily aggregate totals was rejected because it would drift when entries are edited or removed.
- Storing an absolute timestamp was rejected for V1 because the required workflow is calendar-day registration, not time-of-day analysis.
- Adding meal recommendations or nutrient targets was excluded because that is a separate future product capability.
