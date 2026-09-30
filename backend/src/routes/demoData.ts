import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import type { DbClient } from "../db.js";
import { pool } from "../db.js";
import { HttpError } from "../security.js";
import { FoodSearchService } from "../nutrition/search/foodSearchService.js";
import { FoodNameResolver, type ResolvedFoodName } from "../nutrition/search/foodNameResolver.js";
import { settings } from "../config.js";
import { loadDemoDavidTemplate, type DemoTemplate } from "../demoTemplate.js";

type MealType = "breakfast" | "lunch" | "dinner" | "snack";
type Nutrients = { calories_kcal: number; protein_g: number; fat_g: number; carbohydrate_g: number; fiber_g: number; sugars_g: number };
type DemoMeal = Nutrients & { meal_log_entry_id: string; consumed_on: string; meal_type: MealType; food_id: number; description_snapshot: string; quantity: number; serving_grams: number; notes: string | null; source: "demo_template" | "demo" };
type DemoMetric = { metric_entry_id: string; metric_type: string; label: string; recorded_at: string; value_number: number | null; value_text: string | null; unit: string | null; source: string; notes: string | null; metadata_json: Record<string, unknown> };
type DemoSession = { expires_at: number; meals: Map<string, DemoMeal>; metrics: DemoMetric[]; preferences: DemoTemplate["preferences"] };
type AgentMealItem = { name?: unknown; quantity?: unknown; unit?: unknown };

const sessions = new Map<string, DemoSession>();
let demoTemplate: DemoTemplate = { metrics: [], preferences: [], meals: [] };
const sessionTtlMs = 30 * 60 * 1000;
const mealTypes = new Set<MealType>(["breakfast", "lunch", "dinner", "snack"]);
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const nutrientIds = { energy: 38, protein: 2, fat: 1, carbohydrate: 3, fiber: 5 } as const;

function number(value: unknown): number { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
function date(value: string | undefined, label = "date"): string { if (!value || !datePattern.test(value) || Number.isNaN(new Date(`${value}T12:00:00Z`).getTime())) throw new HttpError(422, `Invalid ${label}`); return value; }
function positive(value: unknown, label: string): number { const parsed = number(value); if (parsed <= 0) throw new HttpError(422, `${label} must be greater than zero`); return parsed; }
function sessionId(header: string | undefined): string { if (!header || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(header)) throw new HttpError(401, "Missing demo session"); return header; }
function getSessionById(id: string): DemoSession {
  const now = Date.now();
  for (const [key, value] of sessions) if (value.expires_at <= now) sessions.delete(key);
  const existing = sessions.get(id);
  if (existing) { existing.expires_at = now + sessionTtlMs; return existing; }
  const created = {
    expires_at: now + sessionTtlMs,
    meals: new Map(demoTemplate.meals.map((meal) => {
      const mealLogEntryId = randomUUID();
      return [mealLogEntryId, { ...meal, meal_log_entry_id: mealLogEntryId, sugars_g: 0, source: "demo_template" as const }];
    })),
    metrics: demoTemplate.metrics.map((metric) => ({
      metric_entry_id: randomUUID(), metric_type: metric.metric_type, label: metric.label,
      recorded_at: String(metric.recorded_at), value_number: metric.value_number, value_text: null,
      unit: metric.unit, source: "demo_template", notes: null, metadata_json: { profile_version: "david-v1" },
    })),
    preferences: demoTemplate.preferences.map((preference) => ({ ...preference, metadata_json: { ...preference.metadata_json } })),
  };
  sessions.set(id, created); return created;
}
export async function initializeDemoTemplate(db: DbClient = pool): Promise<void> { demoTemplate = await loadDemoDavidTemplate(db); }
function getSession(header: string | undefined): DemoSession { return getSessionById(sessionId(header)); }
function demoMealType(occurredAtText: string): MealType {
  const value = occurredAtText.toLowerCase();
  if (/(morning|mañana|breakfast|desayuno)/.test(value)) return "breakfast";
  if (/(lunch|almuerzo|comida)/.test(value)) return "lunch";
  if (/(dinner|cena)/.test(value)) return "dinner";
  return "snack";
}
function totals(entries: DemoMeal[]): Nutrients { return entries.reduce<Nutrients>((sum, entry) => ({ calories_kcal: sum.calories_kcal + entry.calories_kcal, protein_g: sum.protein_g + entry.protein_g, fat_g: sum.fat_g + entry.fat_g, carbohydrate_g: sum.carbohydrate_g + entry.carbohydrate_g, fiber_g: sum.fiber_g + entry.fiber_g, sugars_g: 0 }), { calories_kcal: 0, protein_g: 0, fat_g: 0, carbohydrate_g: 0, fiber_g: 0, sugars_g: 0 }); }
function rounded(entry: DemoMeal): DemoMeal { return { ...entry, calories_kcal: Number(entry.calories_kcal.toFixed(2)), protein_g: Number(entry.protein_g.toFixed(2)), fat_g: Number(entry.fat_g.toFixed(2)), carbohydrate_g: Number(entry.carbohydrate_g.toFixed(2)), fiber_g: Number(entry.fiber_g.toFixed(2)) }; }

async function foodWithNutrients(db: DbClient, foodId: number, displayName?: string) {
  const result = await db.query<{ food_id: number; name: string; category: string | null; nutrient_id: number; amount_per_100g: unknown }>(
    `SELECT f.food_id,f.name,f.category,n.nutrient_id,n.amount_per_100g FROM foodb_nutrition_foods f LEFT JOIN foodb_food_nutrients n ON n.food_id=f.food_id WHERE f.food_id=$1`, [foodId],
  );
  if (!result.rows.length) throw new HttpError(404, "Food not found");
  const first = result.rows[0]!; const byId = new Map(result.rows.map((row) => [row.nutrient_id, number(row.amount_per_100g)]));
  return { food_id: first.food_id, name: displayName ?? first.name, category: first.category, per100: { calories_kcal: byId.get(nutrientIds.energy) ?? 0, protein_g: byId.get(nutrientIds.protein) ?? 0, fat_g: byId.get(nutrientIds.fat) ?? 0, carbohydrate_g: byId.get(nutrientIds.carbohydrate) ?? 0, fiber_g: byId.get(nutrientIds.fiber) ?? 0, sugars_g: 0 } };
}

function candidateLabel(candidate: ResolvedFoodName): string {
  return candidate.name === candidate.source_name ? candidate.name : `${candidate.name} (${candidate.source_name})`;
}

function unresolvedQuestion(items: Array<{ name: string; candidates: ResolvedFoodName[] }>): string {
  return items.map(({ name, candidates }) => {
    if (candidates.length) return `No puedo distinguir “${name}”. ¿Cuál fue: ${candidates.map(candidateLabel).join(", ")}?`;
    return `No encontré “${name}” en el catálogo. Indica un nombre más específico.`;
  }).join(" ");
}

export function demoSessionSnapshot(sessionIdValue: string) {
  const store = getSessionById(sessionId(sessionIdValue));
  return {
    meals: [...store.meals.values()].filter((meal) => meal.source === "demo").map(rounded),
    metrics: store.metrics.filter((metric) => metric.source === "demo").map((metric) => ({ ...metric })),
  };
}

export async function captureDemoAgentMeal(
  db: DbClient,
  input: { session_id?: unknown; items?: unknown; occurred_at_text?: unknown },
) {
  const sessionValue = typeof input.session_id === "string" ? input.session_id : undefined;
  const store = getSessionById(sessionId(sessionValue));
  const items = Array.isArray(input.items) ? input.items as AgentMealItem[] : [];
  if (!items.length) throw new HttpError(422, "items are required");
  const occurredAtText = typeof input.occurred_at_text === "string" ? input.occurred_at_text : "today";
  const unresolved: Array<{ name: string; candidates: ResolvedFoodName[] }> = [];
  const foods = [];
  const resolver = new FoodNameResolver(db);
  for (const item of items) {
    const name = typeof item.name === "string" ? item.name.trim() : "";
    const quantity = positive(item.quantity, "quantity");
    if (!name || item.unit !== "g") {
      unresolved.push({ name: name || "alimento", candidates: [] });
      continue;
    }
    const resolution = await resolver.resolve(name);
    if (resolution.status === "resolved") {
      foods.push({ food: await foodWithNutrients(db, resolution.food.food_id, resolution.food.name), quantity });
    } else {
      unresolved.push({ name, candidates: resolution.candidates });
    }
  }
  if (unresolved.length) {
    return {
      status: "needs_clarification" as const,
      question: unresolvedQuestion(unresolved),
      unresolved_items: unresolved.map((item) => ({ name: item.name, candidates: item.candidates.map((candidate) => ({ food_id: candidate.food_id, name: candidate.name, source_name: candidate.source_name })) })),
    };
  }
  const consumedOn = new Date().toISOString().slice(0, 10);
  const mealType = demoMealType(occurredAtText);
  const entries = foods.map(({ food, quantity }) => {
    const factor = quantity / 100;
    const entry: DemoMeal = rounded({ meal_log_entry_id: randomUUID(), consumed_on: consumedOn, meal_type: mealType, food_id: food.food_id, description_snapshot: food.name, quantity: 1, serving_grams: quantity, notes: "Captured by Victus demo chat", calories_kcal: food.per100.calories_kcal * factor, protein_g: food.per100.protein_g * factor, fat_g: food.per100.fat_g * factor, carbohydrate_g: food.per100.carbohydrate_g * factor, fiber_g: food.per100.fiber_g * factor, sugars_g: 0, source: "demo" });
    store.meals.set(entry.meal_log_entry_id, entry);
    return entry;
  });
  return { status: "success" as const, entries };
}

function isAuthorizedDemoAgent(authorization: string | undefined): boolean {
  return Boolean(settings.demoAgentApiToken && authorization === `Bearer ${settings.demoAgentApiToken}`);
}

export function createDemoDataRoutes(db: DbClient = pool): Hono {
  const routes = new Hono();
  const search = new FoodSearchService(db);
  routes.onError((error, c) => error instanceof HttpError ? c.json({ detail: error.message }, error.status as 400) : Promise.reject(error));

  routes.post("/internal/demo/meal-captures", async (c) => {
    if (!isAuthorizedDemoAgent(c.req.header("authorization"))) throw new HttpError(401, "Unauthorized demo agent");
    return c.json(await captureDemoAgentMeal(db, await c.req.json()));
  });

  routes.get("/api/demo/foods/search", async (c) => {
    getSession(c.req.header("x-demo-session-id"));
    const query = c.req.query("q")?.trim() ?? ""; if (query.length < 2 || query.length > 100) throw new HttpError(422, "q must contain between 2 and 100 characters");
    return c.json(await search.search({ query, limit: Math.min(Number(c.req.query("limit")) || 12, 24) }));
  });
  routes.get("/api/demo/foods/:id", async (c) => {
    getSession(c.req.header("x-demo-session-id")); const foodId = Number(c.req.param("id")); if (!Number.isSafeInteger(foodId) || foodId <= 0) throw new HttpError(422, "Invalid food id");
    const food = await foodWithNutrients(db, foodId);
    return c.json({ food_id: food.food_id, name: food.name, category: food.category, ...food.per100, nutrients: [] });
  });
  routes.get("/api/demo/meal-logs", async (c) => {
    const store = getSession(c.req.header("x-demo-session-id")); const from = date(c.req.query("from"), "from date"); const to = date(c.req.query("to"), "to date"); if (from > to) throw new HttpError(422, "from date must be before to date");
    const grouped = new Map<string, DemoMeal[]>(); for (const entry of store.meals.values()) if (entry.consumed_on >= from && entry.consumed_on <= to) grouped.set(entry.consumed_on, [...(grouped.get(entry.consumed_on) ?? []), entry]);
    return c.json({ from, to, days: [...grouped].sort(([a], [b]) => a.localeCompare(b)).map(([consumed_on, entries]) => ({ consumed_on, entry_count: entries.length, ...totals(entries) })) });
  });
  routes.get("/api/demo/meal-logs/:date", async (c) => {
    const store = getSession(c.req.header("x-demo-session-id")); const consumedOn = date(c.req.param("date")); const entries = [...store.meals.values()].filter((entry) => entry.consumed_on === consumedOn).map(rounded);
    const sum = totals(entries); return c.json({ consumed_on: consumedOn, entries, totals: { ...sum, nutrients: [{ nutrient_id: nutrientIds.energy, name: "Energía", unit_name: "kcal", display_rank: 1, total_amount: sum.calories_kcal }, { nutrient_id: nutrientIds.protein, name: "Proteínas", unit_name: "g", display_rank: 2, total_amount: sum.protein_g }, { nutrient_id: nutrientIds.carbohydrate, name: "Carbohidratos", unit_name: "g", display_rank: 3, total_amount: sum.carbohydrate_g }, { nutrient_id: nutrientIds.fat, name: "Grasas", unit_name: "g", display_rank: 4, total_amount: sum.fat_g }, { nutrient_id: nutrientIds.fiber, name: "Fibra", unit_name: "g", display_rank: 5, total_amount: sum.fiber_g }] } });
  });
  routes.post("/api/demo/meal-logs/:date/entries", async (c) => {
    const store = getSession(c.req.header("x-demo-session-id")); const consumedOn = date(c.req.param("date")); const body = await c.req.json<Record<string, unknown>>(); const mealType = body.meal_type;
    if (typeof mealType !== "string" || !mealTypes.has(mealType as MealType)) throw new HttpError(422, "Invalid meal type"); const foodId = Number(body.food_id); if (!Number.isSafeInteger(foodId) || foodId <= 0) throw new HttpError(422, "Invalid food id");
    const quantity = positive(body.quantity ?? 1, "quantity"); const servingGrams = positive(body.serving_grams, "serving_grams"); const food = await foodWithNutrients(db, foodId); const factor = quantity * servingGrams / 100;
    const entry: DemoMeal = rounded({ meal_log_entry_id: randomUUID(), consumed_on: consumedOn, meal_type: mealType as MealType, food_id: food.food_id, description_snapshot: food.name, quantity, serving_grams: servingGrams, notes: typeof body.notes === "string" ? body.notes.trim() || null : null, calories_kcal: food.per100.calories_kcal * factor, protein_g: food.per100.protein_g * factor, fat_g: food.per100.fat_g * factor, carbohydrate_g: food.per100.carbohydrate_g * factor, fiber_g: food.per100.fiber_g * factor, sugars_g: 0, source: "demo" });
    store.meals.set(entry.meal_log_entry_id, entry); return c.json(entry, 201);
  });
  routes.patch("/api/demo/meal-log-entries/:id", async (c) => {
    const store = getSession(c.req.header("x-demo-session-id")); const entry = store.meals.get(c.req.param("id")); if (!entry) throw new HttpError(404, "Meal log entry not found"); const body = await c.req.json<Record<string, unknown>>();
    const quantity = body.quantity === undefined ? entry.quantity : positive(body.quantity, "quantity"); const servingGrams = body.serving_grams === undefined ? entry.serving_grams : positive(body.serving_grams, "serving_grams"); const ratio = (quantity * servingGrams) / (entry.quantity * entry.serving_grams); const mealType = body.meal_type === undefined ? entry.meal_type : body.meal_type;
    if (typeof mealType !== "string" || !mealTypes.has(mealType as MealType)) throw new HttpError(422, "Invalid meal type"); const next = rounded({ ...entry, meal_type: mealType as MealType, quantity, serving_grams: servingGrams, notes: body.notes === undefined ? entry.notes : typeof body.notes === "string" ? body.notes.trim() || null : null, calories_kcal: entry.calories_kcal * ratio, protein_g: entry.protein_g * ratio, fat_g: entry.fat_g * ratio, carbohydrate_g: entry.carbohydrate_g * ratio, fiber_g: entry.fiber_g * ratio });
    store.meals.set(next.meal_log_entry_id, next); return c.json(next);
  });
  routes.delete("/api/demo/meal-log-entries/:id", (c) => { const store = getSession(c.req.header("x-demo-session-id")); if (!store.meals.delete(c.req.param("id"))) throw new HttpError(404, "Meal log entry not found"); return c.body(null, 204); });
  routes.get("/api/demo/users/me/health-overview", (c) => {
    const store = getSession(c.req.header("x-demo-session-id")); const metrics = [...new Map(store.metrics.map((item) => [item.metric_type, item])).values()].map((item) => ({ metric_type: item.metric_type, label: item.label, unit: item.unit, trend_label: "Registro temporal", change_label: "solo esta sesión", points: [{ x: item.recorded_at, value: item.value_number ?? 0, recorded_at: item.recorded_at }] }));
    const byType = new Map(metrics.map((item) => [item.metric_type, item])); const cardDefinitions: Array<[string, string, string]> = [["Peso", "weight", "neutral"], ["Sueño", "sleep", "positive"], ["Adherencia", "adherence", "positive"], ["Energía", "energy", "neutral"]]; const cards = cardDefinitions.map(([label, metricType, tone]) => { const metric = byType.get(metricType); const point = metric?.points.at(-1); return { label, value: point ? `${point.value}${metric?.unit ?? ""}` : "—", detail: point ? "Registro temporal" : "Sin datos todavía", tone }; });
    const preferenceGroups = [...store.preferences.reduce((groups, preference) => { const items = groups.get(preference.category) ?? []; items.push(preference); groups.set(preference.category, items); return groups; }, new Map<string, DemoTemplate["preferences"]>())].map(([category, items]) => ({ category, title: category === "nutrition" ? "Preferencias alimentarias" : category === "schedule" ? "Rutina y adherencia" : category, items }));
    return c.json({ summary_cards: cards, metrics, preference_groups: preferenceGroups, nutrition_focus: [{ title: "Sesión privada", detail: "Tus cambios se eliminan al reiniciar la demo.", status: "active" }], read_only: false, profile_label: "David · demo temporal", profile_note: "Perfil base desde la plantilla persistida; los cambios no se guardan." });
  });
  routes.post("/api/demo/users/me/metrics", async (c) => {
    const store = getSession(c.req.header("x-demo-session-id")); const body = await c.req.json<Record<string, unknown>>(); if (typeof body.metric_type !== "string" || typeof body.label !== "string") throw new HttpError(422, "metric_type and label are required");
    const valueNumber = body.value_number === undefined || body.value_number === null ? null : Number(body.value_number); if (valueNumber !== null && !Number.isFinite(valueNumber)) throw new HttpError(422, "value_number must be numeric"); const entry: DemoMetric = { metric_entry_id: randomUUID(), metric_type: body.metric_type, label: body.label, recorded_at: typeof body.recorded_at === "string" ? body.recorded_at : new Date().toISOString(), value_number: valueNumber, value_text: typeof body.value_text === "string" ? body.value_text : null, unit: typeof body.unit === "string" ? body.unit : null, source: "demo", notes: typeof body.notes === "string" ? body.notes : null, metadata_json: {} };
    store.metrics.push(entry); return c.json(entry, 201);
  });
  return routes;
}

export const demoDataRoutes = createDemoDataRoutes();
