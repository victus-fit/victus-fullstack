import assert from "node:assert/strict";
import test from "node:test";

process.env.SECRET_KEY ??= "test-secret-key-that-is-at-least-32-characters";
process.env.DATABASE_URL ??= "postgresql://victus:victus@127.0.0.1:5432/victus_test";
process.env.APP_ENV = "test";

const { captureDemoAgentMeal, createDemoDataRoutes, demoSessionSnapshot } = await import("../src/routes/demoData.js");

class FakeDb {
  async query(text: string) {
    if (text.includes("foodb_food_localizations")) {
      return { rows: [{ food_id: 4, name: "Kiwi", source_name: "Kiwi", category: "Fruit" }], rowCount: 1 };
    }
    if (text.includes("FROM foodb_nutrition_foods f LEFT JOIN foodb_food_nutrients")) {
      return { rows: [
        { food_id: 4, name: "Kiwi", category: "Fruit", nutrient_id: 38, amount_per_100g: "61" },
        { food_id: 4, name: "Kiwi", category: "Fruit", nutrient_id: 2, amount_per_100g: "1.1" },
        { food_id: 4, name: "Kiwi", category: "Fruit", nutrient_id: 3, amount_per_100g: "14.7" },
      ], rowCount: 3 };
    }
    return { rows: [], rowCount: 0 };
  }
}

const sessionA = "00000000-0000-4000-8000-000000000001";
const sessionB = "00000000-0000-4000-8000-000000000002";
const headers = (session: string) => ({ "content-type": "application/json", "x-demo-session-id": session });

test("demo meal state is private to its page-lifetime session", async () => {
  const app = createDemoDataRoutes(new FakeDb() as never);
  const created = await app.request("/api/demo/meal-logs/2026-09-27/entries", { method: "POST", headers: headers(sessionA), body: JSON.stringify({ meal_type: "breakfast", food_id: 4, quantity: 1, serving_grams: 100 }) });
  assert.equal(created.status, 201);
  assert.equal((await created.json()).description_snapshot, "Kiwi");

  const ownDay = await app.request("/api/demo/meal-logs/2026-09-27", { headers: headers(sessionA) });
  assert.equal((await ownDay.json()).entries.length, 1);

  const otherDay = await app.request("/api/demo/meal-logs/2026-09-27", { headers: headers(sessionB) });
  const otherBody = await otherDay.json();
  assert.equal(otherBody.entries.length, 0);
  assert.equal(otherBody.totals.calories_kcal, 0);
});

test("demo metrics use the normal health overview response shape", async () => {
  const app = createDemoDataRoutes(new FakeDb() as never);
  const created = await app.request("/api/demo/users/me/metrics", { method: "POST", headers: headers(sessionA), body: JSON.stringify({ metric_type: "weight", label: "Peso", value_number: 72.4, unit: "kg" }) });
  assert.equal(created.status, 201);
  const overview = await app.request("/api/demo/users/me/health-overview", { headers: headers(sessionA) });
  const body = await overview.json();
  assert.equal(body.read_only, false);
  assert.equal(body.metrics[0].metric_type, "weight");
  assert.equal(body.summary_cards.find((card: { label: string }) => card.label === "Peso").value, "72.4kg");
});

test("agent meal capture writes into the same UUID-scoped demo state as the preview", async () => {
  const result = await captureDemoAgentMeal(new FakeDb() as never, {
    session_id: sessionA,
    items: [{ name: "kiwi", quantity: 100, unit: "g" }],
    occurred_at_text: "today",
  });

  assert.equal(result.status, "success");
  assert.equal(demoSessionSnapshot(sessionA).meals.at(-1)?.description_snapshot, "Kiwi");
});

test("agent meal capture requests clarification instead of guessing a FoodB match", async () => {
  const result = await captureDemoAgentMeal({ async query(text: string) {
    if (text.includes("foodb_food_localizations")) return { rows: [], rowCount: 0 };
    return { rows: [], rowCount: 0 };
  } } as never, {
    session_id: sessionB,
    items: [{ name: "unknown food", quantity: 100, unit: "g" }],
  });

  assert.equal(result.status, "needs_clarification");
});

test("agent meal capture returns candidate names when a Spanish food name is ambiguous", async () => {
  const result = await captureDemoAgentMeal({ async query(text: string) {
    if (text.includes("foodb_food_localizations")) {
      return { rows: [
        { food_id: 334, name: "Pollo", source_name: "Chicken", category: "specific" },
        { food_id: 335, name: "Pollo asado", source_name: "Roast chicken", category: "specific" },
      ], rowCount: 2 };
    }
    return { rows: [], rowCount: 0 };
  } } as never, {
    session_id: sessionB,
    items: [{ name: "pollo", quantity: 100, unit: "g" }],
  });

  assert.equal(result.status, "needs_clarification");
  assert.match(result.question, /Pollo \(Chicken\)/);
});
