---
id: 010-localized-market-acquisition-catalog
title: Localized V1 foods and derived Market Acquisition nutrients
status: superseded
date: 2026-07-28
---

# Context

> Superseded by [ADR 012](012-foodb-v1-catalog.md). This record remains as historical context for the removed USDA catalog.

Foundation and curated Market Acquisition foods have reviewed Spanish display names. Market Acquisition FDC IDs do not directly own `food_nutrient` rows; their measured nutrients belong to descendant sample and sub-sample foods.

# Decision

Keep the USDA English description immutable in `nutrition_foods`. Store English and Spanish display names separately in `nutrition_food_localizations` and searchable terms in `nutrition_food_search_aliases`.

Import only the curated Market canonical rows. For every canonical group, traverse acquisition-to-sample-to-sub-sample links and aggregate each descendant `food_nutrient.amount` as the mean per 100g, retaining min, max, and number of observations.

Use the account `preferred_language` setting for food search and display. Embeddings are not refreshed as part of this import.

# Tradeoffs

Market values are a derived aggregate, not a single retail package analysis. This is appropriate for the curated generic V1 rows but preserves neither every acquisition nor lab-method detail in the main nutrition table.

# Consequences

Future Market refreshes must rerun the importer. Search aliases and localized display names can change without changing USDA source descriptions. Vector documents remain an independently refreshed derived index.
