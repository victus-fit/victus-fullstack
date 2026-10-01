import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import type { DbClient } from "../db.js";
import { pool, transaction } from "../db.js";
import { settings } from "../config.js";
import { HttpError } from "../security.js";
import { FoodNameResolver, type ResolvedFoodName } from "../nutrition/search/foodNameResolver.js";

type MealType = "breakfast" | "lunch" | "dinner" | "snack";
type AgentItem = { name?: unknown; quantity?: unknown; unit?: unknown };
const subjectPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function authorized(value: string | undefined) { return Boolean(settings.demoAgentApiToken && value === `Bearer ${settings.demoAgentApiToken}`); }
function positive(value: unknown) { const parsed = Number(value); if (!Number.isFinite(parsed) || parsed <= 0) throw new HttpError(422, "quantity must be greater than zero"); return parsed; }
function mealType(value: string): MealType { if (/(morning|mañana|breakfast|desayuno)/i.test(value)) return "breakfast"; if (/(lunch|almuerzo|comida)/i.test(value)) return "lunch"; if (/(dinner|cena)/i.test(value)) return "dinner"; return "snack"; }
function question(unresolved: Array<{ name: string; candidates: ResolvedFoodName[] }>) { return unresolved.map(({ name, candidates }) => candidates.length ? `No puedo distinguir “${name}”. ¿Cuál fue: ${candidates.map((item) => item.name === item.source_name ? item.name : `${item.name} (${item.source_name})`).join(", ")}?` : `No encontré “${name}” en el catálogo. Indica un nombre más específico.`).join(" "); }

export async function captureAgentMeal(db: DbClient, input: { subject?: unknown; items?: unknown; occurred_at_text?: unknown }) {
  if (typeof input.subject !== "string" || !subjectPattern.test(input.subject)) throw new HttpError(422, "Invalid profile subject");
  const items = Array.isArray(input.items) ? input.items as AgentItem[] : [];
  if (!items.length) throw new HttpError(422, "items are required");
  const resolver = new FoodNameResolver(db); const resolved: Array<{ food: ResolvedFoodName; quantity: number }> = []; const unresolved: Array<{ name: string; candidates: ResolvedFoodName[] }> = [];
  for (const item of items) {
    const name = typeof item.name === "string" ? item.name.trim() : "";
    if (!name || (item.unit !== "g" && item.unit !== "ml")) { unresolved.push({ name: name || "alimento", candidates: [] }); continue; }
    const match = await resolver.resolve(name);
    if (match.status === "resolved") resolved.push({ food: match.food, quantity: positive(item.quantity) }); else unresolved.push({ name, candidates: match.candidates });
  }
  if (unresolved.length) return { status: "needs_clarification" as const, question: question(unresolved) };
  const occurredAtText = typeof input.occurred_at_text === "string" ? input.occurred_at_text : "today";
  const write = async (tx: DbClient) => Promise.all(resolved.map(async ({ food, quantity }) => {
    const result = await tx.query(`INSERT INTO user_meal_log_entries(user_id,external_meal_id,consumed_on,meal_type,food_id,description_snapshot,quantity,serving_grams,notes) VALUES($1,$2,(CURRENT_TIMESTAMP AT TIME ZONE COALESCE((SELECT timezone FROM app_users WHERE user_id=$1),'UTC'))::date,$3,$4,$5,1,$6,$7) RETURNING meal_log_entry_id,consumed_on,meal_type,food_id,description_snapshot,quantity,serving_grams,notes`, [input.subject, randomUUID(), mealType(occurredAtText), food.food_id, food.name, quantity, "Registrado por Victus"]);
    return result.rows[0];
  }));
  const entries = await (db === pool ? transaction(write) : write(db));
  return { status: "success" as const, entries };
}

export function createAgentMealCaptureRoutes(db: DbClient = pool) {
  const routes = new Hono();
  routes.post("/internal/agent/meal-captures", async (c) => { if (!authorized(c.req.header("authorization"))) throw new HttpError(401, "Unauthorized agent"); return c.json(await captureAgentMeal(db, await c.req.json())); });
  return routes;
}
export const agentMealCaptureRoutes = createAgentMealCaptureRoutes();
