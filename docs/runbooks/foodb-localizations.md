# FoodB localizations

## Purpose

Import reviewed Spanish FoodB display names without changing the FoodB source
catalog or its nutrient data.

## Catalog bootstrap

The backend image packages the compact FoodB catalog inputs used in production:
nutrition foods, nutrient values, foods excluded for missing nutrient content,
nutrient definitions, and the reviewed Spanish localizations. The large raw
FoodB export is a development-only materialization input and is not required
at runtime.

On startup, the backend loads this bundle only when
`foodb_nutrition_foods` is empty, then seeds David's persisted demo template.
It never overwrites a populated catalog. To run the same idempotent bootstrap
explicitly after deploying an image, use:

```bash
npm run bootstrap:foodb-catalog --prefix backend
```

The command prints the catalog and David-template meal counts. It must report
non-zero values before enabling the anonymous demo.

## Input contract

Use UTF-8 CSV with exactly these required columns:

```csv
food_id,display_name
334,Pollo
```

`food_id` is immutable. `display_name` is the canonical label shown to users.
Aliases such as regional vocabulary belong in `foodb_food_aliases`, not in this
file.

## Import

Build or start the backend with the updated schema, then run:

```bash
npm run import:foodb-localizations --prefix backend
```

To review a replacement file before its deployment, run it against the target
database explicitly:

```bash
npm run import:foodb-localizations --prefix backend -- /path/to/foodb_es_localizations.csv es
```

The command rejects malformed rows, duplicate IDs, blank names, and IDs absent
from the current FoodB catalog. It performs all writes in one transaction and
prints its import ID, row count, and SHA-256 source hash.

## Verification

```sql
SELECT
  (SELECT count(*) FROM foodb_nutrition_foods) AS catalog_foods,
  (SELECT count(*) FROM foodb_food_nutrients) AS nutrient_values,
  (SELECT count(*) FROM user_meal_log_entries
   WHERE user_id = '00000000-0000-4000-8000-000000000002'
     AND notes LIKE '%plantilla David%') AS david_template_meals;
```

Expected initial values are 769 catalog foods, 13,015 nutrient values, and 15
David template meals.

```sql
SELECT locale, row_count, source_sha256, imported_at
FROM foodb_localization_imports
WHERE locale = 'es'
ORDER BY imported_at DESC
LIMIT 1;

SELECT f.food_id, l.display_name, f.name AS foodb_name
FROM foodb_food_localizations l
JOIN foodb_nutrition_foods f USING(food_id)
WHERE l.locale = 'es' AND l.normalized_name = 'pollo';
```

Then submit a demo meal such as `Comí 100 g de pollo` and confirm it records
the localized display name. If a name maps to multiple food IDs, the expected
result is a candidate clarification rather than a registration.

## Rollback

Do not delete the catalog. Restore a previous reviewed CSV by importing it
again. The importer records provenance for each run; aliases can be disabled
individually with `status='disabled'` when needed.
