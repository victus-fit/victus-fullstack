import type { DbClient } from "../../db.js";

const macroIds = { energy: 38, protein: 2, fat: 1, carbohydrate: 3, fiber: 5 } as const;

export interface FoodSearchOptions { query: string; limit: number; }
export interface FoodSearchResult {
  food_id: number; name: string; source_name: string; category: string | null;
  calories_kcal: number | string | null; protein_g: number | string | null; fat_g: number | string | null;
  carbohydrate_g: number | string | null; fiber_g: number | string | null; sugars_g: null;
}
export interface FoodSearchResponse { mode: "lexical"; results: FoodSearchResult[]; }

function escapedQuery(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[\\%_]/g, "\\$&");
}

export class FoodSearchService {
  constructor(private readonly db: DbClient) {}

  async search(options: FoodSearchOptions): Promise<FoodSearchResponse> {
    const query = escapedQuery(options.query);
    const result = await this.db.query<FoodSearchResult>(
      `SELECT f.food_id,COALESCE(l.display_name,f.name) AS name,f.name AS source_name,f.category,
        MAX(n.amount_per_100g) FILTER (WHERE n.nutrient_id=${macroIds.energy}) calories_kcal,
        MAX(n.amount_per_100g) FILTER (WHERE n.nutrient_id=${macroIds.protein}) protein_g,
        MAX(n.amount_per_100g) FILTER (WHERE n.nutrient_id=${macroIds.fat}) fat_g,
        MAX(n.amount_per_100g) FILTER (WHERE n.nutrient_id=${macroIds.carbohydrate}) carbohydrate_g,
        MAX(n.amount_per_100g) FILTER (WHERE n.nutrient_id=${macroIds.fiber}) fiber_g,
        NULL::numeric sugars_g
       FROM foodb_nutrition_foods f
       LEFT JOIN foodb_food_localizations l ON l.food_id=f.food_id AND l.locale='es'
       LEFT JOIN foodb_food_aliases a ON a.food_id=f.food_id AND a.locale='es' AND a.status='active'
       LEFT JOIN foodb_food_nutrients n ON n.food_id=f.food_id
       WHERE f.normalized_name LIKE $1 ESCAPE '\\' OR l.normalized_name LIKE $1 ESCAPE '\\' OR a.normalized_alias LIKE $1 ESCAPE '\\'
       GROUP BY f.food_id,l.display_name,f.name,f.category
       ORDER BY MIN(CASE WHEN a.normalized_alias=$2 THEN 0 WHEN l.normalized_name=$2 THEN 1 WHEN f.normalized_name=$2 THEN 2 WHEN a.normalized_alias LIKE $3 ESCAPE '\\' THEN 3 WHEN l.normalized_name LIKE $3 ESCAPE '\\' THEN 4 ELSE 5 END),name
       LIMIT $4`,
      [`%${query}%`, query, `${query}%`, options.limit],
    );
    return { mode: "lexical", results: result.rows };
  }
}
