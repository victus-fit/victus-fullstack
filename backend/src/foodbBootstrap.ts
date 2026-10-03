import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type pg from "pg";
import { transaction, type DbClient } from "./db.js";
import { normalizeFoodName } from "./nutrition/search/foodNameResolver.js";

const bundleDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../data");
const requiredDavidFoodIds = new Set([4, 11, 12, 16, 21, 22, 25, 125, 175, 334, 634]);

type Food = { foodId: number; name: string; normalizedName: string; foodGroup: string | null; foodSubgroup: string | null; category: string | null; publicId: string | null };
type FoodNutrient = { foodId: number; nutrientId: number; amountPer100g: number; observationCount: number; rawObservationCount: number };
type FoodWithoutNutrients = Food & { exclusionReason: string };
type Localization = { foodId: number; displayName: string; normalizedName: string };
type Bundle = { foods: Food[]; nutrients: FoodNutrient[]; foodsWithoutNutrients: FoodWithoutNutrients[]; nutrientNames: Map<number, string>; localizations: Localization[]; localizationSha256: string };

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
  if (quoted) throw new Error("FoodB CSV contains an unterminated quoted value");
  values.push(value);
  return values;
}

function csvRecords(source: string, requiredHeaders: string[]): Record<string, string>[] {
  const lines = source.split(/\r?\n/).filter(Boolean);
  const headers = parseCsvLine(lines.shift() ?? "").map((value) => value.trim());
  for (const header of requiredHeaders) if (!headers.includes(header)) throw new Error(`FoodB CSV is missing ${header}`);
  return lines.map((line, rowIndex) => {
    const values = parseCsvLine(line);
    if (values.length !== headers.length) throw new Error(`FoodB CSV row ${rowIndex + 2} has an unexpected column count`);
    return Object.fromEntries(headers.map((header, index) => [header, values[index]!.trim()]));
  });
}

function positiveInteger(value: string, label: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error(`FoodB ${label} must be a positive integer`);
  return parsed;
}

function finiteNumber(value: string, label: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`FoodB ${label} must be numeric`);
  return parsed;
}

function text(value: string, label: string): string {
  if (!value) throw new Error(`FoodB ${label} is required`);
  return value;
}

function optionalText(value: string): string | null { return value || null; }

export async function loadFoodbBootstrapBundle(directory = bundleDirectory): Promise<Bundle> {
  const [foodsSource, nutrientsSource, excludedSource, nutrientDefinitionsSource, localizationsSource] = await Promise.all([
    readFile(path.join(directory, "foodb_nutrition_foods.csv"), "utf8"),
    readFile(path.join(directory, "foodb_food_nutrients.csv"), "utf8"),
    readFile(path.join(directory, "foodb_foods_without_nutrients.csv"), "utf8"),
    readFile(path.join(directory, "Nutrient.csv"), "utf8"),
    readFile(path.join(directory, "foodb_es_localizations.csv")),
  ]);
  const foodRows = csvRecords(foodsSource, ["food_id", "name", "food_group", "food_subgroup", "category", "public_id"]);
  const foods = foodRows.map((row) => {
    const name = text(row.name!, "food name");
    return { foodId: positiveInteger(row.food_id!, "food_id"), name, normalizedName: text(normalizeFoodName(name), "normalized food name"), foodGroup: optionalText(row.food_group!), foodSubgroup: optionalText(row.food_subgroup!), category: optionalText(row.category!), publicId: optionalText(row.public_id!) };
  });
  const nutrients = csvRecords(nutrientsSource, ["food_id", "nutrient_id", "amount_per_100g", "observation_count", "raw_observation_count"]).map((row) => ({
    foodId: positiveInteger(row.food_id!, "food nutrient food_id"), nutrientId: positiveInteger(row.nutrient_id!, "nutrient_id"), amountPer100g: finiteNumber(row.amount_per_100g!, "amount_per_100g"), observationCount: positiveInteger(row.observation_count!, "observation_count"), rawObservationCount: Number(row.raw_observation_count!),
  }));
  const foodsWithoutNutrients = csvRecords(excludedSource, ["food_id", "name", "food_group", "food_subgroup", "category", "public_id", "exclusion_reason"]).map((row) => {
    const name = text(row.name!, "excluded food name");
    return { foodId: positiveInteger(row.food_id!, "excluded food_id"), name, normalizedName: text(normalizeFoodName(name), "normalized excluded food name"), foodGroup: optionalText(row.food_group!), foodSubgroup: optionalText(row.food_subgroup!), category: optionalText(row.category!), publicId: optionalText(row.public_id!), exclusionReason: text(row.exclusion_reason!, "exclusion_reason") };
  });
  const nutrientNames = new Map(csvRecords(nutrientDefinitionsSource, ["id", "name"]).map((row) => [positiveInteger(row.id!, "nutrient definition id"), text(row.name!, "nutrient definition name")]));
  const localizations = csvRecords(localizationsSource.toString("utf8"), ["food_id", "display_name"]).map((row) => {
    const displayName = text(row.display_name!, "localized display_name");
    return { foodId: positiveInteger(row.food_id!, "localized food_id"), displayName, normalizedName: text(normalizeFoodName(displayName), "normalized localized display_name") };
  });
  const foodIds = new Set(foods.map((food) => food.foodId));
  for (const foodId of requiredDavidFoodIds) {
    if (!foodIds.has(foodId)) throw new Error("FoodB bootstrap bundle is missing foods required by David's template");
  }
  return { foods, nutrients, foodsWithoutNutrients, nutrientNames, localizations, localizationSha256: createHash("sha256").update(localizationsSource).digest("hex") };
}

async function insertBatch(db: pg.PoolClient, table: string, columns: string[], rows: unknown[][], onConflict = "") {
  for (let start = 0; start < rows.length; start += 500) {
    const batch = rows.slice(start, start + 500);
    const values = batch.flat();
    const placeholders = batch.map((_row, row) => `(${columns.map((_column, column) => `$${row * columns.length + column + 1}`).join(",")})`).join(",");
    await db.query(`INSERT INTO ${table}(${columns.join(",")}) VALUES ${placeholders} ${onConflict}`, values);
  }
}

export async function ensureFoodbCatalog(db: DbClient): Promise<{ bootstrapped: boolean; foods: number }> {
  const existing = await db.query<{ count: string }>("SELECT count(*)::text AS count FROM foodb_nutrition_foods");
  if (Number(existing.rows[0]?.count ?? 0) > 0) return { bootstrapped: false, foods: Number(existing.rows[0]?.count ?? 0) };
  const bundle = await loadFoodbBootstrapBundle();
  return transaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(742718)");
    const locked = await client.query<{ count: string }>("SELECT count(*)::text AS count FROM foodb_nutrition_foods");
    if (Number(locked.rows[0]?.count ?? 0) > 0) return { bootstrapped: false, foods: Number(locked.rows[0]?.count ?? 0) };
    await insertBatch(client, "foodb_nutrition_foods", ["food_id", "name", "normalized_name", "food_group", "food_subgroup", "category", "public_id"], bundle.foods.map((food) => [food.foodId, food.name, food.normalizedName, food.foodGroup, food.foodSubgroup, food.category, food.publicId]));
    await insertBatch(client, "foodb_foods_without_nutrients", ["food_id", "name", "food_group", "food_subgroup", "category", "public_id", "exclusion_reason"], bundle.foodsWithoutNutrients.map((food) => [food.foodId, food.name, food.foodGroup, food.foodSubgroup, food.category, food.publicId, food.exclusionReason]));
    await insertBatch(client, "foodb_food_nutrients", ["food_id", "nutrient_id", "amount_per_100g", "observation_count", "raw_observation_count"], bundle.nutrients.map((nutrient) => [nutrient.foodId, nutrient.nutrientId, nutrient.amountPer100g, nutrient.observationCount, nutrient.rawObservationCount]));
    const nutrientIds = new Set(bundle.nutrients.map((nutrient) => nutrient.nutrientId));
    await insertBatch(client, "foodb_nutrients", ["nutrient_id", "name", "unit_name"], [...nutrientIds].flatMap((nutrientId) => {
      const name = bundle.nutrientNames.get(nutrientId);
      return name ? [[nutrientId, name, nutrientId === 38 ? "kcal" : "g"]] : [];
    }));
    const imported = await client.query<{ import_id: string }>("INSERT INTO foodb_localization_imports(locale,source_filename,source_sha256,row_count) VALUES('es','foodb_es_localizations.csv',$1,$2) RETURNING import_id", [bundle.localizationSha256, bundle.localizations.length]);
    const importId = imported.rows[0]?.import_id;
    if (!importId) throw new Error("FoodB localization import did not return an ID");
    await insertBatch(client, "foodb_food_localizations", ["food_id", "locale", "display_name", "normalized_name", "import_id"], bundle.localizations.map((localization) => [localization.foodId, "es", localization.displayName, localization.normalizedName, importId]));
    return { bootstrapped: true, foods: bundle.foods.length };
  });
}
