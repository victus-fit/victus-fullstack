---
id: 012-foodb-v1-catalog
title: FoodB lexical nutrition catalog
status: accepted
date: 2026-08-19
---

# Context

V1 needs a small, inspectable food catalog with nutrient values and no embedding or USDA ingestion dependency.

# Decision

Use FoodB `Food.csv` as the food source and search its English `Name` field lexically. Materialize only foods with usable nutrient content into `foodb_nutrition_foods`, nutrient values into `foodb_food_nutrients`, and excluded foods into `foodb_foods_without_nutrients`. Use `food_id` as the catalog identifier throughout the meal-log API. Require manually entered grams because FoodB has no compatible portion model.

# Consequences

The USDA catalog, search aliases, localizations, portions, and vector search tables are removed. Meal-log snapshots retain the displayed FoodB name, and the outbox does not expose FoodB IDs as agent identities.
