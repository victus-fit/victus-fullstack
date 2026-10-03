import { pool } from "../src/db.js";
import { initializeSchema } from "../src/schema.js";

try {
  await initializeSchema();
  const result = await pool.query<{ foods: string; david_template_meals: string }>(
    `SELECT
       (SELECT count(*) FROM foodb_nutrition_foods)::text AS foods,
       (SELECT count(*) FROM user_meal_log_entries WHERE user_id='00000000-0000-4000-8000-000000000002' AND notes LIKE '%plantilla David%')::text AS david_template_meals`,
  );
  console.log(JSON.stringify(result.rows[0]));
} finally {
  await pool.end();
}
