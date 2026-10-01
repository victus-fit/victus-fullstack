import assert from "node:assert/strict";
import test from "node:test";

process.env.SECRET_KEY ??= "test-secret-key-that-is-at-least-32-characters";
process.env.DATABASE_URL ??= "postgresql://victus:victus@127.0.0.1:5432/victus_test";
process.env.APP_ENV = "test";

const { resultFromAgent } = await import("../src/routes/chat.js");

test("preserves an agent confirmation interrupt while extracting its user message", () => {
  const result = resultFromAgent(JSON.stringify({
    message: "¿Confirmas ejecutar diet_plan?",
    interrupt: { id: "interrupt-1", kind: "confirmation", question: "¿Confirmas ejecutar diet_plan?", details: { tool_name: "diet_plan" } },
  }));
  assert.equal(result.message, "¿Confirmas ejecutar diet_plan?");
  assert.deepEqual(result.interrupt, { id: "interrupt-1", kind: "confirmation", question: "¿Confirmas ejecutar diet_plan?", details: { tool_name: "diet_plan" } });
});
