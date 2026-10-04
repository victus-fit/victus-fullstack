import assert from "node:assert/strict";
import test from "node:test";

process.env.SECRET_KEY ??= "test-secret-key-that-is-at-least-32-characters";
process.env.DATABASE_URL ??= "postgresql://victus:victus@127.0.0.1:5432/victus_test";
process.env.APP_ENV = "test";
process.env.VICTUS_DEMO_AGENT_API_TOKEN = "profile-test-token";

const { createProfileContextRoutes } = await import("../src/routes/profileContext.js");

const weekDays = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

function weeklyPlan() {
  return {
    description: "Plan semanal alto en proteína",
    targets: { calories_kcal: 2200, protein_g: 160, carbohydrate_g: 220, fat_g: 70 },
    days: weekDays.map((day) => ({
      day,
      focus: "Alimentación equilibrada",
      calories: 2200,
      meals: [
        { name: "Desayuno", food_items: [{ name: "Huevos", portion: "2 unidades" }] },
        { name: "Cena", food_items: [{ name: "Pollo", portion: "180 g" }] },
      ],
    })),
  };
}

class FakeDb {
  calls: Array<{ text: string; values: unknown[] | undefined }> = [];
  async query(text: string, values?: unknown[]) {
    this.calls.push({ text, values });
    if (text.includes("FROM app_users")) return { rows: [{ display_name: "David" }], rowCount: 1 };
    if (text.includes("WITH latest_day")) return { rows: [{ consumed_on: "2026-09-28", meal_type: "lunch", description_snapshot: "Rice", quantity: "1", serving_grams: "150", calories_kcal: "195", protein_g: "4", fat_g: "0.5", carbohydrate_g: "42" }], rowCount: 1 };
    if (text.includes("DISTINCT ON")) return { rows: [{ metric_type: "weight", label: "Peso", value_number: "82", unit: "kg", recorded_at: "2026-09-28T00:00:00Z" }], rowCount: 1 };
    if (text.includes("FROM user_preference_items")) return { rows: [{ category: "restriction", label: "Alergia", value: "Maní", importance: 5, metadata_json: {} }], rowCount: 1 };
    if (text.includes("SELECT plan_id,status FROM user_diet_plans")) return { rows: [{ plan_id: "plan-existing", status: "draft" }], rowCount: 1 };
    if (text.includes("INSERT INTO user_diet_plans")) return { rows: [{ plan_id: "plan-1" }], rowCount: 1 };
    if (text.includes("INSERT INTO user_diet_plan_revisions")) return { rows: [{ revision_id: "revision-1", revision_number: 1, created_at: "2026-09-28T12:00:00Z" }], rowCount: 1 };
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

test("profile overview includes active preferences for diet-plan intake", async () => {
  const response = await createProfileContextRoutes(new FakeDb() as never).request("/internal/agent/profile", {
    method: "POST",
    headers: { authorization: "Bearer profile-test-token", "content-type": "application/json" },
    body: JSON.stringify({ subject: "demo:david", section: "overview" }),
  });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.preferences[0].value, "Maní");
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

test("diet-plan revisions persist a server-owned profile snapshot", async () => {
  const db = new FakeDb();
  const response = await createProfileContextRoutes(db as never).request("/internal/agent/diet-plans", {
    method: "POST",
    headers: { authorization: "Bearer profile-test-token", "content-type": "application/json" },
    body: JSON.stringify({ subject: "demo:david", action: "create", plan_json: weeklyPlan() }),
  });

  assert.equal(response.status, 201);
  assert.equal((await response.clone().json()).status, "draft");
  assert.equal(db.calls.some((call) => call.text.includes("status='archived'")), false);
  const revisionCall = db.calls.find((call) => call.text.includes("INSERT INTO user_diet_plan_revisions"));
  const snapshot = JSON.parse(String(revisionCall?.values?.[1]));
  assert.match(snapshot.captured_at, /^\d{4}-\d{2}-\d{2}T/);
  assert.deepEqual(snapshot.biometrics, [{ metric_type: "weight", label: "Peso", value_number: 82, unit: "kg", recorded_at: "2026-09-28T00:00:00Z" }]);
  assert.deepEqual(snapshot.preferences, [{ category: "restriction", label: "Alergia", value: "Maní", importance: 5, metadata_json: {} }]);
  assert.equal(snapshot.current_diet.totals.calories_kcal, 195);
});

test("diet-plan refinements also refresh the profile snapshot", async () => {
  const db = new FakeDb();
  const response = await createProfileContextRoutes(db as never).request("/internal/agent/diet-plans", {
    method: "POST",
    headers: { authorization: "Bearer profile-test-token", "content-type": "application/json" },
    body: JSON.stringify({ subject: "demo:david", action: "refine", plan_id: "plan-existing", plan_json: weeklyPlan() }),
  });

  assert.equal(response.status, 201);
  const revisionCall = db.calls.find((call) => call.text.includes("INSERT INTO user_diet_plan_revisions"));
  const snapshot = JSON.parse(String(revisionCall?.values?.[1]));
  assert.equal(snapshot.preferences[0].value, "Maní");
  assert.equal(snapshot.current_diet.entries[0].description_snapshot, "Rice");
});

test("diet-plan revisions reject abbreviated weekly documents", async () => {
  const db = new FakeDb();
  const response = await createProfileContextRoutes(db as never).request("/internal/agent/diet-plans", {
    method: "POST",
    headers: { authorization: "Bearer profile-test-token", "content-type": "application/json" },
    body: JSON.stringify({
      subject: "demo:david",
      action: "create",
      plan_json: { description: "Incompleto", targets: { calories_kcal: 2200, protein_g: 160, carbohydrate_g: 220, fat_g: 70 }, days: [] },
    }),
  });

  assert.equal(response.status, 422);
  assert.equal(db.calls.some((call) => call.text.includes("INSERT INTO user_diet_plan_revisions")), false);
});
