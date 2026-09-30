import type { DbClient } from "./db.js";

export const DEMO_DAVID_USER_ID = "00000000-0000-4000-8000-000000000002";

export type DemoTemplateMetric = { metric_type: string; label: string; recorded_at: string; value_number: number; unit: string | null };
export type DemoTemplatePreference = { category: string; label: string; value: string; importance: number; status: string; source: string; metadata_json: Record<string, unknown> };
export type DemoTemplateMeal = { consumed_on: string; meal_type: "breakfast" | "lunch" | "dinner" | "snack"; food_id: number; description_snapshot: string; quantity: number; serving_grams: number; notes: string | null; calories_kcal: number; protein_g: number; fat_g: number; carbohydrate_g: number; fiber_g: number };
export type DemoTemplate = { metrics: DemoTemplateMetric[]; preferences: DemoTemplatePreference[]; meals: DemoTemplateMeal[] };

const metrics: Array<[string, string, number, string]> = [
  ["weight", "Peso", 82, "kg"], ["sleep", "Sueño", 7.1, "h"], ["energy", "Energía", 7, "/10"], ["adherence", "Adherencia", 84, "%"],
];
const preferences: Array<[string, string, string, number, Record<string, unknown>]> = [
  ["nutrition", "Objetivo", "Mejorar composición corporal con alimentación sostenible.", 5, { profile_version: "david-v1" }],
  ["nutrition", "Preferencias", "Comidas simples, alta adherencia y lista de compras repetible.", 4, {}],
  ["nutrition", "Restricciones", "Sin alergias alimentarias críticas.", 5, {}],
  ["schedule", "Rutina", "Entrenamiento de fuerza tres tardes por semana.", 4, {}],
  ["nutrition", "Objetivos diarios", "2400 kcal · 170 g proteína · 270 g carbohidratos · 75 g grasas.", 4, { calories: 2400, protein_g: 170, carbohydrates_g: 270, fat_g: 75 }],
];
const meals: Array<[number, "breakfast" | "lunch" | "dinner" | "snack", number, string]> = [
  [22, "breakfast", 80, "Avena · plantilla David"],
  [334, "lunch", 250, "Pollo · plantilla David"],
  [125, "lunch", 200, "Arroz · plantilla David"],
  [175, "dinner", 300, "Papas · plantilla David"],
  [634, "snack", 200, "Yogur · plantilla David"],
];

export async function seedDemoDavid(db: DbClient): Promise<void> {
  await db.query(
    `INSERT INTO app_users(user_id,primary_email,display_name,status,locale,timezone)
     VALUES($1,$2,$3,'active','es-CL','America/Santiago')
     ON CONFLICT(user_id) DO UPDATE SET display_name=EXCLUDED.display_name,updated_at=now()`,
    [DEMO_DAVID_USER_ID, "demo-david@victus.invalid", "David"],
  );
  await db.query("INSERT INTO user_settings(user_id,preferred_language) VALUES($1,'en') ON CONFLICT(user_id) DO NOTHING", [DEMO_DAVID_USER_ID]);
  for (const [metricType, label, value, unit] of metrics) {
    await db.query(
      `INSERT INTO user_metric_entries(user_id,metric_type,label,recorded_at,value_number,unit,source,metadata_json)
       SELECT $1::uuid,$2::varchar(64),$3::varchar(120),now(),$4::double precision,$5::varchar(32),'demo_template'::varchar(40),$6::jsonb
       WHERE NOT EXISTS (SELECT 1 FROM user_metric_entries WHERE user_id=$1::uuid AND metric_type=$2::varchar(64) AND source='demo_template')`,
      [DEMO_DAVID_USER_ID, metricType, label, value, unit, JSON.stringify({ profile_version: "david-v1" })],
    );
  }
  for (const [category, label, value, importance, metadata] of preferences) {
    await db.query(
      `INSERT INTO user_preference_items(user_id,category,label,value,importance,status,source,metadata_json)
       VALUES($1,$2,$3,$4,$5,'active','demo_template',$6::jsonb)
       ON CONFLICT(user_id,category,label) DO UPDATE SET value=EXCLUDED.value,importance=EXCLUDED.importance,status='active',source='demo_template',metadata_json=EXCLUDED.metadata_json,updated_at=now()`,
      [DEMO_DAVID_USER_ID, category, label, value, importance, JSON.stringify(metadata)],
    );
  }
  for (const [foodId, mealType, servingGrams, note] of meals) {
    await db.query(
      `INSERT INTO user_meal_log_entries(user_id,consumed_on,meal_type,food_id,description_snapshot,quantity,serving_grams,notes)
       SELECT $1::uuid,CURRENT_DATE,$2::varchar(32),f.food_id,f.name,1,$3::numeric,$4::text
       FROM foodb_nutrition_foods f
       WHERE f.food_id=$5::integer
         AND NOT EXISTS (SELECT 1 FROM user_meal_log_entries WHERE user_id=$1::uuid AND notes=$4::text)`,
      [DEMO_DAVID_USER_ID, mealType, servingGrams, note, foodId],
    );
  }
}

export async function loadDemoDavidTemplate(db: DbClient): Promise<DemoTemplate> {
  const [metricResult, preferenceResult, mealResult] = await Promise.all([
    db.query<DemoTemplateMetric>("SELECT metric_type,label,recorded_at,value_number,unit FROM user_metric_entries WHERE user_id=$1 AND source='demo_template' ORDER BY metric_type,recorded_at", [DEMO_DAVID_USER_ID]),
    db.query<DemoTemplatePreference>("SELECT category,label,value,importance,status,source,metadata_json FROM user_preference_items WHERE user_id=$1 AND source='demo_template' AND status='active' ORDER BY category,label", [DEMO_DAVID_USER_ID]),
    db.query<DemoTemplateMeal>(
      `SELECT e.consumed_on,e.meal_type,e.food_id,e.description_snapshot,e.quantity,e.serving_grams,e.notes,
        COALESCE(MAX(n.amount_per_100g) FILTER (WHERE n.nutrient_id=38),0) * e.serving_grams * e.quantity / 100 calories_kcal,
        COALESCE(MAX(n.amount_per_100g) FILTER (WHERE n.nutrient_id=2),0) * e.serving_grams * e.quantity / 100 protein_g,
        COALESCE(MAX(n.amount_per_100g) FILTER (WHERE n.nutrient_id=1),0) * e.serving_grams * e.quantity / 100 fat_g,
        COALESCE(MAX(n.amount_per_100g) FILTER (WHERE n.nutrient_id=3),0) * e.serving_grams * e.quantity / 100 carbohydrate_g,
        COALESCE(MAX(n.amount_per_100g) FILTER (WHERE n.nutrient_id=5),0) * e.serving_grams * e.quantity / 100 fiber_g
       FROM user_meal_log_entries e LEFT JOIN foodb_food_nutrients n ON n.food_id=e.food_id
       WHERE e.user_id=$1 AND e.notes LIKE '%plantilla David%'
       GROUP BY e.meal_log_entry_id ORDER BY e.meal_type,e.description_snapshot`,
      [DEMO_DAVID_USER_ID],
    ),
  ]);
  return { metrics: metricResult.rows.map((row) => ({ ...row, value_number: Number(row.value_number) })), preferences: preferenceResult.rows, meals: mealResult.rows.map((row) => ({ ...row, quantity: Number(row.quantity), serving_grams: Number(row.serving_grams), calories_kcal: Number(row.calories_kcal), protein_g: Number(row.protein_g), fat_g: Number(row.fat_g), carbohydrate_g: Number(row.carbohydrate_g), fiber_g: Number(row.fiber_g) })) };
}
