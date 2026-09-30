import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import test from "node:test";

process.env.SECRET_KEY ??= "test-secret-key-that-is-at-least-32-characters";
process.env.DATABASE_URL ??= "postgresql://victus:victus@127.0.0.1:5432/victus_test";
process.env.APP_ENV = "test";
const keyPair = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
process.env.VICTUS_DEMO_JWT_PRIVATE_KEY_PEM = keyPair.privateKey.export({
  type: "pkcs8",
  format: "pem",
}).toString();

const { demoChatRoutes } = await import("../src/routes/demoChat.js");

test("demo chat signs the browser demo session into the agent token", async () => {
  const sessionId = "00000000-0000-4000-8000-000000000001";
  const originalFetch = globalThis.fetch;
  let authorization = "";
  let agentPayload: Record<string, unknown> = {};
  globalThis.fetch = async (_input, init) => {
    authorization = new Headers(init?.headers).get("authorization") ?? "";
    agentPayload = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return new Response(
      JSON.stringify({ message: "Recorded for this demo session.", profile_version: "david-v1", read_only: true }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  try {
    const response = await demoChatRoutes.request("/api/demo/chat/stream", {
      method: "POST",
      headers: { "content-type": "application/json", "x-demo-session-id": sessionId },
      body: JSON.stringify({ message: "I ate 100 g of chicken", conversation_id: "browser-conversation" }),
    });

    assert.equal(response.status, 200);
    const token = authorization.replace(/^Bearer\s+/, "");
    const payload = JSON.parse(Buffer.from(token.split(".")[1]!, "base64url").toString("utf8"));
    assert.equal(payload.sid, sessionId);
    assert.equal("demo_state" in agentPayload, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
