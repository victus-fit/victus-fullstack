import type { DbClient } from "../../db.js";

export type ResolvedFoodName = {
  food_id: number;
  name: string;
  source_name: string;
  category: string | null;
};

export type FoodNameResolution =
  | { status: "resolved"; food: ResolvedFoodName }
  | { status: "ambiguous"; candidates: ResolvedFoodName[] }
  | { status: "not_found"; candidates: ResolvedFoodName[] };

export function normalizeFoodName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function escapedLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

const selectFood = `
  SELECT f.food_id,COALESCE(l.display_name,f.name) AS name,f.name AS source_name,f.category,
    MIN(CASE
      WHEN a.normalized_alias=$1 THEN 0
      WHEN l.normalized_name=$1 THEN 1
      WHEN f.normalized_name=$1 THEN 2
      WHEN a.normalized_alias LIKE $3 ESCAPE '\\' THEN 3
      WHEN l.normalized_name LIKE $3 ESCAPE '\\' THEN 4
      ELSE 5
    END) AS match_rank
  FROM foodb_nutrition_foods f
  LEFT JOIN foodb_food_localizations l ON l.food_id=f.food_id AND l.locale='es'
  LEFT JOIN foodb_food_aliases a ON a.food_id=f.food_id AND a.locale='es' AND a.status='active'
  WHERE a.normalized_alias=$1 OR l.normalized_name=$1 OR f.normalized_name=$1
  GROUP BY f.food_id,l.display_name,f.name,f.category
  ORDER BY match_rank,name
  LIMIT $2
`;

const suggestFood = `
  SELECT f.food_id,COALESCE(l.display_name,f.name) AS name,f.name AS source_name,f.category,
    MIN(CASE
      WHEN a.normalized_alias=$1 THEN 0
      WHEN l.normalized_name=$1 THEN 1
      WHEN f.normalized_name=$1 THEN 2
      WHEN a.normalized_alias LIKE $2 ESCAPE '\\' THEN 3
      WHEN l.normalized_name LIKE $2 ESCAPE '\\' THEN 4
      WHEN f.normalized_name LIKE $2 ESCAPE '\\' THEN 5
      ELSE 6
    END) AS match_rank
  FROM foodb_nutrition_foods f
  LEFT JOIN foodb_food_localizations l ON l.food_id=f.food_id AND l.locale='es'
  LEFT JOIN foodb_food_aliases a ON a.food_id=f.food_id AND a.locale='es' AND a.status='active'
  WHERE a.normalized_alias LIKE $2 ESCAPE '\\'
     OR l.normalized_name LIKE $2 ESCAPE '\\'
     OR f.normalized_name LIKE $2 ESCAPE '\\'
  GROUP BY f.food_id,l.display_name,f.name,f.category
  ORDER BY match_rank,name
  LIMIT $3
`;

export class FoodNameResolver {
  constructor(private readonly db: DbClient) {}

  async resolve(value: string): Promise<FoodNameResolution> {
    const normalized = normalizeFoodName(value);
    if (!normalized) return { status: "not_found", candidates: [] };
    const exact = await this.db.query<ResolvedFoodName>(selectFood, [normalized, 4, `${escapedLike(normalized)}%`]);
    if (exact.rows.length === 1) return { status: "resolved", food: exact.rows[0]! };
    if (exact.rows.length > 1) return { status: "ambiguous", candidates: exact.rows };
    const suggestions = await this.suggest(normalized);
    return { status: "not_found", candidates: suggestions };
  }

  async suggest(value: string, limit = 3): Promise<ResolvedFoodName[]> {
    const normalized = normalizeFoodName(value);
    if (!normalized) return [];
    const prefix = `${escapedLike(normalized)}%`;
    const result = await this.db.query<ResolvedFoodName>(suggestFood, [normalized, prefix, limit]);
    return result.rows;
  }
}
