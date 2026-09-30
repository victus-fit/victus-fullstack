import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool, transaction } from "../src/db.js";
import { normalizeFoodName } from "../src/nutrition/search/foodNameResolver.js";
import { initializeSchema } from "../src/schema.js";

type LocalizationRow = { foodId: number; displayName: string; normalizedName: string };

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]!;
    if (character === '"') {
      if (quoted && line[index + 1] === '"') { value += character; index += 1; }
      else quoted = !quoted;
    } else if (character === "," && !quoted) { values.push(value); value = ""; }
    else value += character;
  }
  if (quoted) throw new Error("CSV contains an unterminated quoted value");
  values.push(value);
  return values;
}

function parseLocalizations(csv: string): LocalizationRow[] {
  const lines = csv.split(/\r?\n/).filter(Boolean);
  const headers = parseCsvLine(lines.shift() ?? "").map((value) => value.trim());
  const foodIdIndex = headers.indexOf("food_id");
  const displayNameIndex = headers.indexOf("display_name");
  if (foodIdIndex < 0 || displayNameIndex < 0) throw new Error("CSV must contain food_id and display_name columns");
  const seen = new Set<number>();
  return lines.map((line, lineIndex) => {
    const row = parseCsvLine(line);
    const foodId = Number(row[foodIdIndex]?.trim());
    const displayName = row[displayNameIndex]?.trim() ?? "";
    if (!Number.isSafeInteger(foodId) || foodId <= 0) throw new Error(`Row ${lineIndex + 2}: food_id must be a positive integer`);
    if (!displayName) throw new Error(`Row ${lineIndex + 2}: display_name is required`);
    if (seen.has(foodId)) throw new Error(`Row ${lineIndex + 2}: duplicate food_id ${foodId}`);
    seen.add(foodId);
    const normalizedName = normalizeFoodName(displayName);
    if (!normalizedName) throw new Error(`Row ${lineIndex + 2}: display_name is invalid`);
    return { foodId, displayName, normalizedName };
  });
}

const inputPath = path.resolve(process.argv[2] ?? path.join(path.dirname(fileURLToPath(import.meta.url)), "../data/foodb_es_localizations.csv"));
const locale = process.argv[3] ?? "es";
if (!/^[a-z]{2,3}(?:-[A-Z]{2})?$/u.test(locale)) throw new Error("locale must use a BCP 47 language tag such as es or es-CL");
const source = await readFile(inputPath);
const rows = parseLocalizations(source.toString("utf8"));
if (!rows.length) throw new Error("CSV contains no localizations");
const sourceSha256 = createHash("sha256").update(source).digest("hex");

await initializeSchema();
const result = await transaction(async (db) => {
  const known = await db.query<{ food_id: number }>("SELECT food_id FROM foodb_nutrition_foods WHERE food_id = ANY($1::int[])", [rows.map((row) => row.foodId)]);
  const knownIds = new Set(known.rows.map((row) => row.food_id));
  const unknownIds = rows.map((row) => row.foodId).filter((foodId) => !knownIds.has(foodId));
  if (unknownIds.length) throw new Error(`CSV references FoodB IDs not in the current catalog: ${unknownIds.slice(0, 10).join(", ")}`);

  const imported = await db.query<{ import_id: string }>(
    `INSERT INTO foodb_localization_imports(locale,source_filename,source_sha256,row_count)
     VALUES($1,$2,$3,$4) RETURNING import_id`,
    [locale, path.basename(inputPath), sourceSha256, rows.length],
  );
  const importId = imported.rows[0]?.import_id;
  if (!importId) throw new Error("Could not create localization import record");
  for (let start = 0; start < rows.length; start += 250) {
    const batch = rows.slice(start, start + 250);
    const values = batch.flatMap((row) => [row.foodId, locale, row.displayName, row.normalizedName, importId]);
    const placeholders = batch.map((_row, index) => `($${index * 5 + 1},$${index * 5 + 2},$${index * 5 + 3},$${index * 5 + 4},$${index * 5 + 5})`).join(",");
    await db.query(
      `INSERT INTO foodb_food_localizations(food_id,locale,display_name,normalized_name,import_id)
       VALUES ${placeholders}
       ON CONFLICT(food_id,locale) DO UPDATE SET display_name=EXCLUDED.display_name,normalized_name=EXCLUDED.normalized_name,import_id=EXCLUDED.import_id,updated_at=now()`,
      values,
    );
  }
  return { import_id: importId, locale, source_sha256: sourceSha256, row_count: rows.length };
});
console.log(JSON.stringify(result));
await pool.end();
