import assert from "node:assert/strict";
import test from "node:test";

process.env.SECRET_KEY ??= "test-secret-key-that-is-at-least-32-characters";
process.env.DATABASE_URL ??= "postgresql://victus:victus@127.0.0.1:5432/victus_test";
process.env.APP_ENV = "test";

const { loadFoodbBootstrapBundle } = await import("../src/foodbBootstrap.js");

test("the packaged FoodB bundle contains David's foods and Spanish localizations", async () => {
  const bundle = await loadFoodbBootstrapBundle();
  const foodIds = new Set(bundle.foods.map((food) => food.foodId));
  for (const foodId of [4, 11, 12, 16, 21, 22, 25, 125, 175, 334, 634]) assert.equal(foodIds.has(foodId), true);
  assert.equal(bundle.foods.length, 769);
  assert.equal(bundle.nutrients.length, 13015);
  assert.equal(bundle.localizations.length, 769);
});
