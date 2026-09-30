import assert from "node:assert/strict";
import test from "node:test";

process.env.SECRET_KEY ??= "test-secret-key-that-is-at-least-32-characters";
process.env.DATABASE_URL ??= "postgresql://victus:victus@127.0.0.1:5432/victus_test";
process.env.APP_ENV = "test";

const { FoodSearchService } = await import("../src/nutrition/search/foodSearchService.js");
const { createFoodRoutes } = await import("../src/routes/foods.js");

test("FoodB search returns lexical matches and escapes LIKE metacharacters", async () => {
  const queries: Array<{ text: string; values?: unknown[] }> = [];
  const db = { async query(text: string, values?: unknown[]) {
    queries.push({ text, values });
    return { rows: [{ food_id: 4, name: "Kiwi", source_name: "Kiwi", category: "specific", calories_kcal: "61" }], rowCount: 1 };
  } };
  const service = new FoodSearchService(db as never);
  assert.deepEqual(await service.search({ query: "Kiwi", limit: 20 }), {
    mode: "lexical", results: [{ food_id: 4, name: "Kiwi", source_name: "Kiwi", category: "specific", calories_kcal: "61" }],
  });
  await service.search({ query: "50%_", limit: 20 });
  assert.equal(queries[1]?.values?.[0], "%50\\%\\_%");
  assert.match(queries[1]?.text ?? "", /LIKE \$1 ESCAPE '\\'/);
  assert.match(queries[0]?.text ?? "", /foodb_nutrition_foods/);
  assert.match(queries[0]?.text ?? "", /foodb_food_localizations/);
});

test("food route exposes only lexical FoodB search", async () => {
  let received: Record<string, unknown> | undefined;
  const app = createFoodRoutes({} as never, async () => ({ user_id: "test" }), { async search(options) {
    received = options;
    return { mode: "lexical", results: [] };
  } });
  const response = await app.request("/api/foods/search?q=kiwi&limit=100");
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { mode: "lexical", results: [] });
  assert.deepEqual(received, { query: "kiwi", limit: 50 });
});
