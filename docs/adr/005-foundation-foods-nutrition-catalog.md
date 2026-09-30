---
id: 005-foundation-foods-nutrition-catalog
title: FoodData Central nutrition catalog
status: accepted
date: 2026-07-21
---

# Context

Victus needs a searchable food catalog with calories, macronutrients, micronutrients, and portion weights. The initial local USDA Foundation Foods CSV export was too small for practical food logging. A full FoodData Central CSV dump is now available under `data/FoodData_Central_csv_2026-04-30`.

The full dump includes Foundation Foods, Survey/FNDDS foods, branded foods, legacy foods, lab/acquisition traceability tables, sample/sub-sample tables, and update logs.

# Decision

Use a curated FoodData Central V1 import surface:

- include `food.data_type='foundation_food'`
- include `food.data_type='survey_fndds_food'`
- include `food.data_type='branded_food'`
- exclude `food.data_type='sr_legacy_food'`

Move old or traceability-only CSVs out of the active dump root into `_excluded_from_catalog_v1/`. This keeps the files recoverable while making the active catalog source explicit.

Store the catalog in `nutrition_*` PostgreSQL tables:

- `nutrition_foods`
- `nutrition_food_categories`
- `nutrition_nutrients`
- `nutrition_food_nutrients`
- `nutrition_measure_units`
- `nutrition_food_portions`

Preserve every nutrient from `nutrient.csv` and every available nutrient amount for imported catalog foods. Nutrient values are stored as `amount_per_100g`.

Keep duplicate food descriptions as separate `fdc_id` rows. For generic datasets, mark the newest publication per normalized description and data type with `is_latest_duplicate=true`. For branded foods, keep each `fdc_id` searchable because different brands can legitimately share the same product description.

# Consequences

- The app can search generic and branded foods and inspect full nutrition without loading traceability tables.
- USDA `fdc_id` remains the stable external identifier.
- The V1 import is idempotent and can be rerun after refreshing CSVs.
- The full nutrient file is large, so the importer streams large CSVs instead of loading them fully into memory.
- Startup DDL remains acceptable for local V1, but production should move nutrition schema changes into versioned migrations before the catalog is edited by users or enriched beyond USDA.
