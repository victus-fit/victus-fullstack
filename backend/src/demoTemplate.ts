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
  ["cooking_style", "Preparación", "Recetas simples, repetibles y de hasta 25 minutos.", 4, {}],
  ["budget", "Compra", "Priorizar alimentos accesibles y una lista de compras corta.", 3, {}],
  ["communication", "Acompañamiento", "Sugerencias prácticas, sin perfeccionismo ni dietas extremas.", 4, {}],
];
const davidPlan = {
  title: "Plan semanal de David · composición corporal",
  targets: { calories_kcal: 2400, protein_g: 170, carbohydrate_g: 270, fat_g: 75 },
  rationale: "Basado en 82 kg, fuerza tres tardes por semana y preferencia por comidas simples y sostenibles.",
  days: [
    { day: "Lunes", focus: "Fuerza", meals: ["Avena con yogur", "Pollo con arroz", "Papas con proteína", "Yogur"] },
    { day: "Martes", focus: "Recuperación", meals: ["Avena con yogur", "Pollo con arroz", "Papas con proteína", "Yogur"] },
    { day: "Miércoles", focus: "Fuerza", meals: ["Avena con yogur", "Pollo con arroz", "Papas con proteína", "Yogur"] },
    { day: "Jueves", focus: "Recuperación", meals: ["Avena con yogur", "Pollo con arroz", "Papas con proteína", "Yogur"] },
    { day: "Viernes", focus: "Fuerza", meals: ["Avena con yogur", "Pollo con arroz", "Papas con proteína", "Yogur"] },
    { day: "Sábado", focus: "Flexible", meals: ["Avena con yogur", "Pollo con arroz", "Papas con proteína", "Yogur"] },
    { day: "Domingo", focus: "Recuperación", meals: ["Avena con yogur", "Pollo con arroz", "Papas con proteína", "Yogur"] },
  ],
};
const meals: Array<[number, "breakfast" | "lunch" | "dinner" | "snack", number, string, number, string]> = [
  [22, "breakfast", 80, "Avena · plantilla David", 0, "Avena con yogur"],
  [334, "lunch", 250, "Pollo · plantilla David", 0, "Pollo al limón"],
  [125, "lunch", 160, "Arroz · plantilla David", 0, "Arroz integral"],
  [175, "dinner", 300, "Papas · plantilla David", 0, "Papas asadas"],
  [634, "snack", 200, "Yogur · plantilla David", 0, "Yogur griego"],
  [12, "breakfast", 180, "Piña · plantilla David", 1, "Piña fresca"],
  [334, "lunch", 220, "Pollo con verduras · plantilla David", 1, "Pollo con verduras"],
  [21, "dinner", 180, "Espárragos · plantilla David", 1, "Espárragos salteados"],
  [175, "dinner", 220, "Papas recuperación · plantilla David", 1, "Papas cocidas"],
  [11, "snack", 30, "Castañas · plantilla David", 1, "Castañas de cajú"],
  [4, "breakfast", 150, "Kiwi · plantilla David", 2, "Kiwi"],
  [125, "lunch", 180, "Arroz fuerza · plantilla David", 2, "Bowl de arroz"],
  [334, "dinner", 220, "Pollo cena · plantilla David", 2, "Pollo al horno"],
  [25, "dinner", 180, "Betarraga · plantilla David", 2, "Betarraga asada"],
  [16, "snack", 25, "Maní · plantilla David", 2, "Maní natural"],
];

export async function seedDemoDavid(db: DbClient): Promise<void> {
  await db.query(
    `INSERT INTO app_users(user_id,primary_email,display_name,status,locale,timezone)
     VALUES($1,$2,$3,'active','es-CL','America/Santiago')
     ON CONFLICT(user_id) DO UPDATE SET display_name=EXCLUDED.display_name,updated_at=now()`,
    [DEMO_DAVID_USER_ID, "demo-david@victus.invalid", "David"],
  );
  await db.query("INSERT INTO user_settings(user_id,preferred_language) VALUES($1,'es') ON CONFLICT(user_id) DO NOTHING", [DEMO_DAVID_USER_ID]);
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
  const activePlan = await db.query<{ plan_id: string }>("SELECT plan_id FROM user_diet_plans WHERE user_id=$1 AND status='active' LIMIT 1", [DEMO_DAVID_USER_ID]);
  if (!activePlan.rows[0]) {
    const created = await db.query<{ plan_id: string }>("INSERT INTO user_diet_plans(user_id,status) VALUES($1,'active') RETURNING plan_id", [DEMO_DAVID_USER_ID]);
    const planId = created.rows[0]!.plan_id;
    const revision = await db.query<{ revision_id: string }>("INSERT INTO user_diet_plan_revisions(plan_id,revision_number,profile_snapshot,plan_json) VALUES($1,1,$2::jsonb,$3::jsonb) RETURNING revision_id", [planId, JSON.stringify({ biometrics: { weight_kg: 82, sleep_hours: 7.1, energy: 7 }, preferences: preferences.map(([, label, value]) => ({ label, value })) }), JSON.stringify(davidPlan)]);
    await db.query("UPDATE user_diet_plans SET active_revision_id=$2 WHERE plan_id=$1", [planId, revision.rows[0]!.revision_id]);
  } else {
    await db.query(
      `UPDATE user_diet_plan_revisions SET profile_snapshot=$2::jsonb,plan_json=$3::jsonb
       WHERE revision_id=(SELECT active_revision_id FROM user_diet_plans WHERE plan_id=$1)`,
      [activePlan.rows[0].plan_id, JSON.stringify({ biometrics: { weight_kg: 82, sleep_hours: 7.1, energy: 7 }, preferences: preferences.map(([, label, value]) => ({ label, value })) }), JSON.stringify(davidPlan)],
    );
  }
  await db.query("DELETE FROM user_meal_log_entries WHERE user_id=$1 AND notes LIKE '%plantilla David%'", [DEMO_DAVID_USER_ID]);
  for (const [foodId, mealType, servingGrams, note, dayOffset, description] of meals) {
    await db.query(
      `INSERT INTO user_meal_log_entries(user_id,consumed_on,meal_type,food_id,description_snapshot,quantity,serving_grams,notes)
       SELECT $1::uuid,CURRENT_DATE - $5::integer,$2::varchar(32),f.food_id,$6::text,1,$3::numeric,$4::text
       FROM foodb_nutrition_foods f WHERE f.food_id=$7::integer`,
      [DEMO_DAVID_USER_ID, mealType, servingGrams, note, dayOffset, description, foodId],
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
  return { metrics: metricResult.rows.map((row) => ({ ...row, value_number: Number(row.value_number) })), preferences: preferenceResult.rows, meals: mealResult.rows.map((row) => { const consumedOn: unknown = row.consumed_on; return { ...row, consumed_on: consumedOn instanceof Date ? consumedOn.toISOString().slice(0, 10) : String(consumedOn).slice(0, 10), quantity: Number(row.quantity), serving_grams: Number(row.serving_grams), calories_kcal: Number(row.calories_kcal), protein_g: Number(row.protein_g), fat_g: Number(row.fat_g), carbohydrate_g: Number(row.carbohydrate_g), fiber_g: Number(row.fiber_g) }; }) };
}
