import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import { createInterface } from "node:readline";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool, transaction } from "../src/db.js";
import { initializeSchema } from "../src/schema.js";

function csv(line: string) { const out: string[] = []; let value = "", quoted = false; for (let i = 0; i < line.length; i += 1) { const c = line[i]; if (c === '"') { if (quoted && line[i + 1] === '"') { value += c; i += 1; } else quoted = !quoted; } else if (c === "," && !quoted) { out.push(value); value = ""; } else value += c; } out.push(value); return out; }
function amount(value: string, unit: string) { const n = Number(value); const u = unit.toLowerCase().replace(/\s/g, ""); if (!Number.isFinite(n)) return null; if (u.includes("mg/100g")) return n / 1000; if (u.includes("ug/100g") || u.includes("µg/100g")) return n / 1_000_000; if (u.includes("g/100g") || u === "g") return n; if (u.includes("kcal")) return n; return null; }
const data = path.resolve(process.argv[2] ?? path.join(path.dirname(fileURLToPath(import.meta.url)), "../../data/foodb_2020_04_07_csv"));
const foods = new Map<number, string[]>(); const foodRows = (await readFile(path.join(data, "Food.csv"), "utf8")).split(/\r?\n/).filter(Boolean).map(csv); const foodHeader = foodRows.shift()!; const foodIndex = new Map(foodHeader.map((v, i) => [v, i]));
for (const row of foodRows) { const id = Number(row[foodIndex.get("id")!]); if (Number.isSafeInteger(id) && row[foodIndex.get("name")!]?.trim()) foods.set(id, row); }
const nutrientRows = (await readFile(path.join(data, "Nutrient.csv"), "utf8")).split(/\r?\n/).filter(Boolean).map(csv); const nutrientHeader = nutrientRows.shift()!; const nutrientIndex = new Map(nutrientHeader.map((v, i) => [v, i]));
const nutrients = new Map<number, string>();
for (const row of nutrientRows) { const id = Number(row[nutrientIndex.get("id")!]); const name = row[nutrientIndex.get("name")!]?.trim(); if (Number.isSafeInteger(id) && name) nutrients.set(id, name); }
const stats = new Map<string, { total: number; count: number; rawTotal: number; rawCount: number }>();
const stream = createInterface({ input: createReadStream(path.join(data, "Content.csv"), { encoding: "utf8" }), crlfDelay: Infinity });
let index: Map<string, number> | undefined;
for await (const line of stream) {
  if (!index) { index = new Map(csv(line).map((value, position) => [value, position])); continue; }
  const row = csv(line);
  if (row[index.get("source_type")!] !== "Nutrient") continue;
  const foodId = Number(row[index.get("food_id")!]); const nutrientId = Number(row[index.get("source_id")!]);
  const value = amount(row[index.get("standard_content")!] || row[index.get("orig_content")!] || "", row[index.get("orig_unit")!] || "");
  if (!foods.has(foodId) || !Number.isSafeInteger(nutrientId) || value === null) continue;
  const key = `${foodId}:${nutrientId}`; const current = stats.get(key) ?? { total: 0, count: 0, rawTotal: 0, rawCount: 0 };
  current.total += value; current.count += 1;
  if (row[index.get("preparation_type")!]?.toLowerCase() === "raw") { current.rawTotal += value; current.rawCount += 1; }
  stats.set(key, current);
}
const covered = new Set([...stats.keys()].map((key) => Number(key.split(":")[0])));
console.log(JSON.stringify({ phase: "aggregated", foods: foods.size, with_nutrients: covered.size, nutrient_rows: stats.size }));
async function insertBatch(db: import("pg").PoolClient, table: string, columns: string[], rows: unknown[][], onConflict = "") {
  for (let start = 0; start < rows.length; start += 500) {
    const batch = rows.slice(start, start + 500);
    const values = batch.flat();
    const placeholders = batch.map((_row, row) => `(${columns.map((_column, column) => `$${row * columns.length + column + 1}`).join(",")})`).join(",");
    await db.query(`INSERT INTO ${table}(${columns.join(",")}) VALUES ${placeholders} ${onConflict}`, values);
  }
}
await initializeSchema(); await transaction(async (db) => {
  await db.query("TRUNCATE foodb_food_nutrients,foodb_foods_without_nutrients,foodb_nutrients");
  const withRows: unknown[][] = []; const withoutRows: unknown[][] = [];
  for (const [id, row] of foods) (covered.has(id) ? withRows : withoutRows).push([id,row[foodIndex.get("name")!],row[foodIndex.get("food_group")!],row[foodIndex.get("food_subgroup")!],row[foodIndex.get("category")!],row[foodIndex.get("public_id")!]]);
  await insertBatch(db, "foodb_nutrition_foods", ["food_id","name","food_group","food_subgroup","category","public_id"], withRows, "ON CONFLICT(food_id) DO UPDATE SET name=EXCLUDED.name,food_group=EXCLUDED.food_group,food_subgroup=EXCLUDED.food_subgroup,category=EXCLUDED.category,public_id=EXCLUDED.public_id,imported_at=now()");
  await insertBatch(db, "foodb_foods_without_nutrients", ["food_id","name","food_group","food_subgroup","category","public_id"], withoutRows);
  await insertBatch(db, "foodb_food_nutrients", ["food_id","nutrient_id","amount_per_100g","observation_count","raw_observation_count"], [...stats].map(([key,value]) => { const [foodId,nutrientId] = key.split(":").map(Number); return [foodId,nutrientId,value.rawCount ? value.rawTotal/value.rawCount : value.total/value.count,value.count,value.rawCount]; }));
  await insertBatch(db, "foodb_nutrients", ["nutrient_id","name","unit_name"], [...new Set([...stats.keys()].map((key) => Number(key.split(":")[1])))].flatMap((id) => nutrients.has(id) ? [[id, nutrients.get(id)!, id === 38 ? "kcal" : "g"]] : []));
}); console.log(JSON.stringify({ phase: "persisted", foods: foods.size, with_nutrients: covered.size, nutrient_rows: stats.size },null,2)); await pool.end();
