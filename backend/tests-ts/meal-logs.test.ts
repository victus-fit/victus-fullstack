import assert from "node:assert/strict";
import test from "node:test";

process.env.SECRET_KEY ??= "test-secret-key-that-is-at-least-32-characters";
process.env.DATABASE_URL ??= "postgresql://victus:victus@127.0.0.1:5432/victus_test";
process.env.APP_ENV = "test";

const { createMealLogRoutes } = await import("../src/routes/mealLogs.js");

class FakeDb {
  queries: Array<{ text: string; values: unknown[] | undefined }> = [];
  async query(text: string, values?: unknown[]) {
    this.queries.push({ text, values });
    if (text.includes("WITH entry_totals")) return { rows: [{ consumed_on: "2026-07-22", entry_count: "2", calories_kcal: "238.5", protein_g: "6", fat_g: "1", carbohydrate_g: "53" }], rowCount: 1 };
    if (text.includes("GROUP BY e.meal_log_entry_id")) return { rows: [{ meal_log_entry_id: "entry-1", meal_type: "breakfast", food_id: 4, description_snapshot: "Kiwi", quantity: "1", serving_grams: "150", calories_kcal: "147", protein_g: "1.1", fat_g: "0.4", carbohydrate_g: "34", fiber_g: "3" }], rowCount: 1 };
    if (text.includes("JOIN foodb_nutrients")) return { rows: [{ nutrient_id: 2, name: "Protein", unit_name: "g", total_amount: "1.1" }], rowCount: 1 };
    if (text.includes("SELECT food_id,name FROM foodb_nutrition_foods")) return { rows: [{ food_id: 4, name: "Kiwi" }], rowCount: 1 };
    if (text.includes("INSERT INTO user_meal_log_entries")) return { rows: [{ meal_log_entry_id: "entry-2", external_meal_id: values?.[1], consumed_on: values?.[2], meal_type: values?.[3], food_id: values?.[4], description_snapshot: values?.[5], quantity: values?.[6], serving_grams: values?.[7], notes: values?.[8], created_at: "2026-07-22T00:00:00Z", updated_at: "2026-07-22T00:00:00Z" }], rowCount: 1 };
    return { rows: [], rowCount: 0 };
  }
}

const user = async () => ({ user_id: "user-1" });

test("meal log calendar returns numeric daily summaries", async () => {
  const response = await createMealLogRoutes(new FakeDb() as never, user).request("/api/meal-logs?from=2026-07-20&to=2026-07-26");
  assert.equal(response.status, 200);
  assert.equal((await response.json()).days[0].calories_kcal, 238.5);
});

test("meal log day requests only the V1 nutrient summary", async () => {
  const db = new FakeDb();
  const response = await createMealLogRoutes(db as never, user).request("/api/meal-logs/2026-07-22");
  assert.equal(response.status, 200);
  const nutrientQuery = db.queries.find((query) => query.text.includes("JOIN foodb_nutrients"));
  assert.match(nutrientQuery?.text ?? "", /n\.nutrient_id IN \(38,2,1,3,5\)/);
  assert.match(nutrientQuery?.text ?? "", /WHEN 38 THEN 'Energía'/);
});

test("meal log creation uses FoodB food_id and emits the agent contract", async () => {
  const db = new FakeDb();
  const app = createMealLogRoutes(db as never, user);
  const response = await app.request("/api/meal-logs/2026-07-22/entries", { method: "POST", headers: { "content-type": "application/json", cookie: "victus_csrf=test-csrf", "x-csrf-token": "test-csrf" }, body: JSON.stringify({ meal_type: "breakfast", food_id: 4, serving_grams: 150, quantity: 2 }) });
  assert.equal(response.status, 201);
  const body = await response.json();
  assert.equal(body.food_id, 4);
  const outbox = db.queries.find((query) => query.text.includes("INSERT INTO meal_import_outbox"));
  const message = JSON.parse(String(outbox?.values?.[3]));
  assert.equal(message.items[0].description_snapshot, "Kiwi");
  assert.equal(message.items[0].serving_grams, 150);
  assert.equal("fdc_id" in message.items[0], false);
});

test("meal log rejects invalid dates before querying storage", async () => {
  const db = new FakeDb();
  const response = await createMealLogRoutes(db as never, user).request("/api/meal-logs/not-a-date");
  assert.equal(response.status, 422);
  assert.equal(db.queries.length, 0);
});
