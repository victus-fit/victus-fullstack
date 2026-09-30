import assert from "node:assert/strict";
import test from "node:test";

process.env.SECRET_KEY ??= "test-secret-key-that-is-at-least-32-characters";
process.env.DATABASE_URL ??= "postgresql://victus:victus@127.0.0.1:5432/victus_test";
process.env.APP_ENV = "test";

const { FoodNameResolver, normalizeFoodName } = await import("../src/nutrition/search/foodNameResolver.js");

test("normalizes Spanish food names independently of accents and punctuation", () => {
  assert.equal(normalizeFoodName("  Pechúga-de POLLO!  "), "pechuga de pollo");
});

test("resolves one localized Spanish food name without asking the agent to guess", async () => {
  const resolver = new FoodNameResolver({ async query() {
    return { rows: [{ food_id: 334, name: "Pollo", source_name: "Chicken", category: "specific" }], rowCount: 1 };
  } } as never);

  assert.deepEqual(await resolver.resolve("POLLO"), {
    status: "resolved", food: { food_id: 334, name: "Pollo", source_name: "Chicken", category: "specific" },
  });
});

test("returns ambiguity when an alias maps to more than one food", async () => {
  const resolver = new FoodNameResolver({ async query() {
    return { rows: [
      { food_id: 334, name: "Pollo", source_name: "Chicken", category: "specific" },
      { food_id: 335, name: "Pollo asado", source_name: "Roast chicken", category: "specific" },
    ], rowCount: 2 };
  } } as never);

  const result = await resolver.resolve("pollo");
  assert.equal(result.status, "ambiguous");
  if (result.status === "ambiguous") assert.equal(result.candidates.length, 2);
});
