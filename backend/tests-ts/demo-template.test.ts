import assert from "node:assert/strict";
import test from "node:test";

process.env.SECRET_KEY ??= "test-secret-key-that-is-at-least-32-characters";
process.env.DATABASE_URL ??= "postgresql://victus:victus@127.0.0.1:5432/victus_test";
process.env.APP_ENV = "test";

const { createDemoDataRoutes, demoSessionSnapshot, initializeDemoTemplate } = await import("../src/routes/demoData.js");

class TemplateDb {
  async query(text: string) {
    if (text.includes("FROM user_metric_entries")) return { rows: [{ metric_type: "weight", label: "Peso", recorded_at: "2026-09-28T00:00:00Z", value_number: 82, unit: "kg" }], rowCount: 1 };
    if (text.includes("FROM user_preference_items")) return { rows: [{ category: "nutrition", label: "Objetivo", value: "Mejorar composición corporal.", importance: 5, status: "active", source: "demo_template", metadata_json: { profile_version: "david-v1" } }], rowCount: 1 };
    if (text.includes("FROM user_diet_plans")) return { rows: [{ plan_id: "00000000-0000-4000-8000-000000000010" }], rowCount: 1 };
    return { rows: [], rowCount: 0 };
  }
}

test("a new demo session clones David's persisted template", async () => {
  const db = new TemplateDb();
  await initializeDemoTemplate(db as never);
  const app = createDemoDataRoutes(db as never);
  const response = await app.request("/api/demo/users/me/health-overview", { headers: { "x-demo-session-id": "00000000-0000-4000-8000-000000000099" } });
  const body = await response.json();
  assert.equal(body.summary_cards.find((card: { label: string }) => card.label === "Peso").value, "82kg");
  assert.equal(body.preference_groups[0].items[0].label, "Objetivo");
  assert.deepEqual(demoSessionSnapshot("00000000-0000-4000-8000-000000000099"), { meals: [], metrics: [] });
});
