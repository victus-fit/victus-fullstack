import { Hono } from "hono";
import type { Context } from "hono";
import { pool, type DbClient } from "../db.js";
import { FoodSearchService, type FoodSearchResponse } from "../nutrition/search/foodSearchService.js";
import { HttpError } from "../security.js";
import { currentUser } from "../session.js";

type RequireUser = (c: Context) => Promise<unknown>;
type FoodSearcher = { search(options: { query: string; limit: number }): Promise<FoodSearchResponse> };

const macroIds = { energy: 38, protein: 2, fat: 1, carbohydrate: 3, fiber: 5 } as const;

function limitParam(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "25", 10);
  if (!Number.isFinite(parsed)) return 25;
  return Math.min(Math.max(parsed, 1), 50);
}

export function createFoodRoutes(db: DbClient = pool, requireUser: RequireUser = currentUser, foodSearcher?: FoodSearcher): Hono {
  const routes = new Hono();
  const searchService = foodSearcher ?? new FoodSearchService(db);

  routes.get("/api/foods/search", async (c) => {
    await requireUser(c);
    const query = c.req.query("q")?.trim() ?? "";
    if (query.length < 2 || query.length > 200) throw new HttpError(422, "q must contain between 2 and 200 characters");
    return c.json(await searchService.search({ query, limit: limitParam(c.req.query("limit")) }));
  });

  routes.get("/api/foods/:foodId", async (c) => {
    await requireUser(c);
    const foodId = Number.parseInt(c.req.param("foodId"), 10);
    if (!Number.isSafeInteger(foodId) || foodId <= 0) throw new HttpError(422, "Invalid food id");
    const food = await db.query(
      `SELECT f.food_id,COALESCE(l.display_name,f.name) AS name,f.name AS source_name,f.normalized_name,f.food_group,f.food_subgroup,f.category,f.public_id,
        MAX(n.amount_per_100g) FILTER (WHERE n.nutrient_id=${macroIds.energy}) calories_kcal,
        MAX(n.amount_per_100g) FILTER (WHERE n.nutrient_id=${macroIds.protein}) protein_g,
        MAX(n.amount_per_100g) FILTER (WHERE n.nutrient_id=${macroIds.fat}) fat_g,
        MAX(n.amount_per_100g) FILTER (WHERE n.nutrient_id=${macroIds.carbohydrate}) carbohydrate_g,
        MAX(n.amount_per_100g) FILTER (WHERE n.nutrient_id=${macroIds.fiber}) fiber_g,
        NULL::numeric sugars_g
       FROM foodb_nutrition_foods f
       LEFT JOIN foodb_food_localizations l ON l.food_id=f.food_id AND l.locale='es'
       LEFT JOIN foodb_food_nutrients n ON n.food_id=f.food_id
       WHERE f.food_id=$1
       GROUP BY f.food_id`,
      [foodId],
    );
    if (!food.rows[0]) throw new HttpError(404, "Food not found");

    const nutrients = await db.query(
      `SELECT n.nutrient_id,m.name,m.unit_name,n.amount_per_100g,n.observation_count,n.raw_observation_count
       FROM foodb_food_nutrients n
       JOIN foodb_nutrients m ON m.nutrient_id=n.nutrient_id
       WHERE n.food_id=$1
       ORDER BY m.name`,
      [foodId],
    );
    return c.json({ ...food.rows[0], nutrients: nutrients.rows });
  });

  return routes;
}

export const foodRoutes = createFoodRoutes();
