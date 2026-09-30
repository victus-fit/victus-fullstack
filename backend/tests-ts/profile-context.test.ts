import assert from "node:assert/strict";
import test from "node:test";

process.env.SECRET_KEY ??= "test-secret-key-that-is-at-least-32-characters";
process.env.DATABASE_URL ??= "postgresql://victus:victus@127.0.0.1:5432/victus_test";
process.env.APP_ENV = "test";
process.env.VICTUS_DEMO_AGENT_API_TOKEN = "profile-test-token";

const { createProfileContextRoutes } = await import("../src/routes/profileContext.js");

class FakeDb {
  calls: Array<{ text: string; values: unknown[] | undefined }> = [];
  async query(text: string, values?: unknown[]) {
    this.calls.push({ text, values });
    if (text.includes("FROM app_users")) return { rows: [{ display_name: "David" }], rowCount: 1 };
    if (text.includes("WITH latest_day")) return { rows: [{ consumed_on: "2026-09-28", meal_type: "lunch", description_snapshot: "Rice", quantity: "1", serving_grams: "150", calories_kcal: "195", protein_g: "4", fat_g: "0.5", carbohydrate_g: "42" }], rowCount: 1 };
    if (text.includes("DISTINCT ON")) return { rows: [{ metric_type: "weight", label: "Peso", value_number: "82", unit: "kg", recorded_at: "2026-09-28T00:00:00Z" }], rowCount: 1 };
    return { rows: [], rowCount: 0 };
  }
}

test("profile context maps demo:david to its persisted user and returns only requested data", async () => {
  const db = new FakeDb();
  const response = await createProfileContextRoutes(db as never).request("/internal/agent/profile", {
    method: "POST",
    headers: { authorization: "Bearer profile-test-token", "content-type": "application/json" },
    body: JSON.stringify({ subject: "demo:david", section: "current_diet" }),
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.display_name, "David");
  assert.equal(body.current_diet.entries[0].calories_kcal, 195);
  assert.equal("biometrics" in body, false);
  assert.equal(db.calls[0]?.values?.[0], "00000000-0000-4000-8000-000000000002");
});

test("profile context rejects unauthenticated and arbitrary subjects", async () => {
  const app = createProfileContextRoutes(new FakeDb() as never);
  const unauthorized = await app.request("/internal/agent/profile", { method: "POST" });
  assert.equal(unauthorized.status, 401);
  const arbitrary = await app.request("/internal/agent/profile", {
    method: "POST",
    headers: { authorization: "Bearer profile-test-token", "content-type": "application/json" },
    body: JSON.stringify({ subject: "not-a-user" }),
  });
  assert.equal(arbitrary.status, 422);
});
