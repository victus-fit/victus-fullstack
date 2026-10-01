import assert from "node:assert/strict";
import test from "node:test";

process.env.SECRET_KEY ??= "test-secret-key-that-is-at-least-32-characters";
process.env.DATABASE_URL ??= "postgresql://victus:victus@127.0.0.1:5432/victus_test";
process.env.APP_ENV = "test";

const { createEvidenceStatsRoutes } = await import("../src/routes/evidenceStats.js");

test("proxies the validated live evidence corpus counts without exposing its token", async () => {
  let authorization = "";
  const routes = createEvidenceStatsRoutes({
    ragApiUrl: "http://rag:8080/",
    ragApiToken: "private-rag-token",
    fetchImpl: async (input, init) => {
      authorization = new Headers(init?.headers).get("authorization") ?? "";
      assert.equal(input, "http://rag:8080/v1/evidence/stats");
      return new Response(
        JSON.stringify({ collection: "canonical_evidence_bge_m3_v1", evidence_count: 128, paper_count: 16 }),
        { headers: { "Content-Type": "application/json" } },
      );
    },
  });

  const response = await routes.request("/api/evidence/stats");

  assert.equal(response.status, 200);
  assert.equal(authorization, "Bearer private-rag-token");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { collection: "canonical_evidence_bge_m3_v1", evidence_count: 128, paper_count: 16 });
});

test("returns unavailable when the RAG token is not configured", async () => {
  const routes = createEvidenceStatsRoutes({ ragApiToken: "" });
  const response = await routes.request("/api/evidence/stats");
  assert.equal(response.status, 503);
});
