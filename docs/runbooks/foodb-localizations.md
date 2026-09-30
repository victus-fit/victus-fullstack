# FoodB localizations

## Purpose

Import reviewed Spanish FoodB display names without changing the FoodB source
catalog or its nutrient data.

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
