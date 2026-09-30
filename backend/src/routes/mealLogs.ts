import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import type { Context } from "hono";
import { pool, transaction, type DbClient } from "../db.js";
import { HttpError, requireCsrf } from "../security.js";
import { currentUser } from "../session.js";

type RequireUser = (c: Context) => Promise<unknown>;
type MealType = "breakfast" | "lunch" | "dinner" | "snack";
type TransactionRunner = <T>(work: (db: DbClient) => Promise<T>) => Promise<T>;

const mealTypes = new Set<MealType>(["breakfast", "lunch", "dinner", "snack"]);
const nutrientIds = { energy: 38, protein: 2, fat: 1, carbohydrate: 3, fiber: 5 } as const;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function requiredDate(value: string | undefined, label = "date"): string {
  if (!value || !datePattern.test(value) || Number.isNaN(new Date(`${value}T12:00:00Z`).getTime())) throw new HttpError(422, `Invalid ${label}`);
  return value;
}

function positiveNumber(value: unknown, label: string): number {
  const parsed = typeof value === "number" || typeof value === "string" ? Number(value) : Number.NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) throw new HttpError(422, `${label} must be greater than zero`);
  return parsed;
}

function optionalText(value: unknown, label: string): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") throw new HttpError(422, `${label} must be text`);
  return value.trim() || null;
}

function asNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function serializeEntry(row: Record<string, unknown>) {
  return {
    ...row,
    quantity: asNumber(row.quantity),
    serving_grams: asNumber(row.serving_grams),
    calories_kcal: asNumber(row.calories_kcal),
    protein_g: asNumber(row.protein_g),
    fat_g: asNumber(row.fat_g),
    carbohydrate_g: asNumber(row.carbohydrate_g),
    fiber_g: asNumber(row.fiber_g),
    sugars_g: 0,
  };
}

function dayTotals(entries: Array<Record<string, unknown>>, nutrients: Array<Record<string, unknown>>) {
  const sum = (field: string) => entries.reduce((total, entry) => total + asNumber(entry[field]), 0);
  return {
    calories_kcal: sum("calories_kcal"), protein_g: sum("protein_g"), fat_g: sum("fat_g"),
    carbohydrate_g: sum("carbohydrate_g"), fiber_g: sum("fiber_g"), sugars_g: 0,
    nutrients: nutrients.map((nutrient) => ({ ...nutrient, total_amount: asNumber(nutrient.total_amount) })),
  };
}

export function createMealLogRoutes(db: DbClient = pool, requireUser: RequireUser = currentUser, transactionRunner?: TransactionRunner): Hono {
  const routes = new Hono();
  const runInTransaction: TransactionRunner = transactionRunner ?? (async (work) => db === pool ? transaction(work) : work(db));
  routes.onError((error, c) => {
    if (error instanceof HttpError) return c.json({ detail: error.message }, error.status as 400);
    throw error;
  });

  routes.get("/api/meal-logs", async (c) => {
    const user = await requireUser(c) as { user_id: string };
    const from = requiredDate(c.req.query("from"), "from date");
    const to = requiredDate(c.req.query("to"), "to date");
    if (from > to) throw new HttpError(422, "from date must be before to date");
    const result = await db.query(
      `WITH entry_totals AS (
        SELECT e.meal_log_entry_id,e.consumed_on,
          COALESCE(MAX(n.amount_per_100g) FILTER (WHERE n.nutrient_id=${nutrientIds.energy}),0) * e.serving_grams * e.quantity / 100 calories_kcal,
          COALESCE(MAX(n.amount_per_100g) FILTER (WHERE n.nutrient_id=${nutrientIds.protein}),0) * e.serving_grams * e.quantity / 100 protein_g,
          COALESCE(MAX(n.amount_per_100g) FILTER (WHERE n.nutrient_id=${nutrientIds.fat}),0) * e.serving_grams * e.quantity / 100 fat_g,
          COALESCE(MAX(n.amount_per_100g) FILTER (WHERE n.nutrient_id=${nutrientIds.carbohydrate}),0) * e.serving_grams * e.quantity / 100 carbohydrate_g
         FROM user_meal_log_entries e LEFT JOIN foodb_food_nutrients n ON n.food_id=e.food_id
         WHERE e.user_id=$1 AND e.consumed_on BETWEEN $2 AND $3
         GROUP BY e.meal_log_entry_id,e.consumed_on,e.serving_grams,e.quantity
       )
       SELECT consumed_on,COUNT(*)::int entry_count,COALESCE(SUM(calories_kcal),0) calories_kcal,
         COALESCE(SUM(protein_g),0) protein_g,COALESCE(SUM(fat_g),0) fat_g,COALESCE(SUM(carbohydrate_g),0) carbohydrate_g
       FROM entry_totals GROUP BY consumed_on ORDER BY consumed_on`,
      [user.user_id, from, to],
    );
    return c.json({ from, to, days: result.rows.map((row) => ({
      ...row, entry_count: Number(row.entry_count), calories_kcal: asNumber(row.calories_kcal),
      protein_g: asNumber(row.protein_g), fat_g: asNumber(row.fat_g), carbohydrate_g: asNumber(row.carbohydrate_g),
    })) });
  });

  routes.get("/api/meal-logs/:date", async (c) => {
    const user = await requireUser(c) as { user_id: string };
    const consumedOn = requiredDate(c.req.param("date"));
    const [entriesResult, nutrientsResult] = await Promise.all([
      db.query(
        `SELECT e.meal_log_entry_id,e.consumed_on,e.meal_type,e.food_id,e.description_snapshot,e.quantity,e.serving_grams,e.notes,e.created_at,e.updated_at,
          COALESCE(MAX(n.amount_per_100g) FILTER (WHERE n.nutrient_id=${nutrientIds.energy}),0) * e.serving_grams * e.quantity / 100 calories_kcal,
          COALESCE(MAX(n.amount_per_100g) FILTER (WHERE n.nutrient_id=${nutrientIds.protein}),0) * e.serving_grams * e.quantity / 100 protein_g,
          COALESCE(MAX(n.amount_per_100g) FILTER (WHERE n.nutrient_id=${nutrientIds.fat}),0) * e.serving_grams * e.quantity / 100 fat_g,
          COALESCE(MAX(n.amount_per_100g) FILTER (WHERE n.nutrient_id=${nutrientIds.carbohydrate}),0) * e.serving_grams * e.quantity / 100 carbohydrate_g,
          COALESCE(MAX(n.amount_per_100g) FILTER (WHERE n.nutrient_id=${nutrientIds.fiber}),0) * e.serving_grams * e.quantity / 100 fiber_g
         FROM user_meal_log_entries e
         LEFT JOIN foodb_food_nutrients n ON n.food_id=e.food_id
         WHERE e.user_id=$1 AND e.consumed_on=$2
         GROUP BY e.meal_log_entry_id
         ORDER BY e.meal_type,e.created_at`,
        [user.user_id, consumedOn],
      ),
      db.query(
        `SELECT n.nutrient_id,
          CASE n.nutrient_id
            WHEN ${nutrientIds.energy} THEN 'Energía'
            WHEN ${nutrientIds.protein} THEN 'Proteínas'
            WHEN ${nutrientIds.fat} THEN 'Grasas'
            WHEN ${nutrientIds.carbohydrate} THEN 'Carbohidratos'
            WHEN ${nutrientIds.fiber} THEN 'Fibra'
          END name,
          m.unit_name,
          SUM(n.amount_per_100g * e.serving_grams * e.quantity / 100) total_amount
         FROM user_meal_log_entries e
         JOIN foodb_food_nutrients n ON n.food_id=e.food_id
         JOIN foodb_nutrients m ON m.nutrient_id=n.nutrient_id
         WHERE e.user_id=$1 AND e.consumed_on=$2
           AND n.nutrient_id IN (${nutrientIds.energy},${nutrientIds.protein},${nutrientIds.fat},${nutrientIds.carbohydrate},${nutrientIds.fiber})
         GROUP BY n.nutrient_id,m.unit_name
         ORDER BY CASE n.nutrient_id
           WHEN ${nutrientIds.energy} THEN 1
           WHEN ${nutrientIds.protein} THEN 2
           WHEN ${nutrientIds.carbohydrate} THEN 3
           WHEN ${nutrientIds.fat} THEN 4
           WHEN ${nutrientIds.fiber} THEN 5
         END`,
        [user.user_id, consumedOn],
      ),
    ]);
    const entries = entriesResult.rows.map((row) => serializeEntry(row as Record<string, unknown>));
    return c.json({ consumed_on: consumedOn, entries, totals: dayTotals(entries, nutrientsResult.rows as Array<Record<string, unknown>>) });
  });

  routes.post("/api/meal-logs/:date/entries", async (c) => {
    requireCsrf(c);
    const user = await requireUser(c) as { user_id: string };
    const consumedOn = requiredDate(c.req.param("date"));
    const body = await c.req.json<Record<string, unknown>>();
    const mealType = body.meal_type;
    if (typeof mealType !== "string" || !mealTypes.has(mealType as MealType)) throw new HttpError(422, "Invalid meal type");
    const foodId = Number(body.food_id);
    if (!Number.isSafeInteger(foodId) || foodId <= 0) throw new HttpError(422, "Invalid food id");
    const quantity = positiveNumber(body.quantity ?? 1, "quantity");
    const servingGrams = positiveNumber(body.serving_grams, "serving_grams");
    const notes = optionalText(body.notes, "notes");
    const externalMealId = randomUUID();
    const messageId = randomUUID();
    const occurredAt = new Date().toISOString();
    const entry = await runInTransaction(async (tx) => {
      const food = await tx.query<{ food_id: number; name: string }>("SELECT food_id,name FROM foodb_nutrition_foods WHERE food_id=$1", [foodId]);
      if (!food.rows[0]) throw new HttpError(404, "Food not found");
      const result = await tx.query(
        `INSERT INTO user_meal_log_entries(user_id,external_meal_id,consumed_on,meal_type,food_id,description_snapshot,quantity,serving_grams,notes)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING meal_log_entry_id,external_meal_id,consumed_on,meal_type,food_id,description_snapshot,quantity,serving_grams,notes,created_at,updated_at`,
        [user.user_id, externalMealId, consumedOn, mealType, foodId, food.rows[0].name, quantity, servingGrams, notes],
      );
      const created = result.rows[0] as Record<string, unknown>;
      const payload = {
        message_id: messageId, occurred_at: occurredAt, user_id: user.user_id, external_meal_id: externalMealId, meal_type: mealType,
        items: [{ external_item_id: created.meal_log_entry_id, description_snapshot: created.description_snapshot, quantity: { value: quantity, unit: "serving" }, serving_grams: servingGrams }],
      };
      await tx.query("INSERT INTO meal_import_outbox(message_id,user_id,external_meal_id,payload) VALUES($1,$2,$3,$4::jsonb)", [messageId, user.user_id, externalMealId, JSON.stringify(payload)]);
      return created;
    });
    return c.json(serializeEntry(entry), 201);
  });

  routes.patch("/api/meal-log-entries/:id", async (c) => {
    requireCsrf(c);
    const user = await requireUser(c) as { user_id: string };
    const entryId = c.req.param("id");
    const body = await c.req.json<Record<string, unknown>>();
    const existing = await db.query<{ meal_type: MealType; quantity: unknown; serving_grams: unknown; notes: string | null }>(
      "SELECT meal_type,quantity,serving_grams,notes FROM user_meal_log_entries WHERE meal_log_entry_id=$1 AND user_id=$2", [entryId, user.user_id],
    );
    const entry = existing.rows[0];
    if (!entry) throw new HttpError(404, "Meal log entry not found");
    const mealType = body.meal_type === undefined ? entry.meal_type : body.meal_type;
    if (typeof mealType !== "string" || !mealTypes.has(mealType as MealType)) throw new HttpError(422, "Invalid meal type");
    const quantity = body.quantity === undefined ? asNumber(entry.quantity) : positiveNumber(body.quantity, "quantity");
    const servingGrams = body.serving_grams === undefined ? asNumber(entry.serving_grams) : positiveNumber(body.serving_grams, "serving_grams");
    const notes = body.notes === undefined ? entry.notes : optionalText(body.notes, "notes");
    const result = await db.query(
      `UPDATE user_meal_log_entries SET meal_type=$3,quantity=$4,serving_grams=$5,notes=$6,updated_at=now()
       WHERE meal_log_entry_id=$1 AND user_id=$2
       RETURNING meal_log_entry_id,consumed_on,meal_type,food_id,description_snapshot,quantity,serving_grams,notes,created_at,updated_at`,
      [entryId, user.user_id, mealType, quantity, servingGrams, notes],
    );
    return c.json(serializeEntry(result.rows[0] as Record<string, unknown>));
  });

  routes.delete("/api/meal-log-entries/:id", async (c) => {
    requireCsrf(c);
    const user = await requireUser(c) as { user_id: string };
    const result = await db.query("DELETE FROM user_meal_log_entries WHERE meal_log_entry_id=$1 AND user_id=$2", [c.req.param("id"), user.user_id]);
    if (!result.rowCount) throw new HttpError(404, "Meal log entry not found");
    return c.body(null, 204);
  });

  return routes;
}

export const mealLogRoutes = createMealLogRoutes();
