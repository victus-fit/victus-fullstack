import { createPrivateKey, randomUUID, sign } from "node:crypto";
import { Hono } from "hono";
import { streamText } from "hono/streaming";
import { settings } from "../config.js";
import { HttpError } from "../security.js";
import { FoodSearchService } from "../nutrition/search/foodSearchService.js";
import { pool } from "../db.js";
import { demoSessionSnapshot } from "./demoData.js";

export const demoChatRoutes = new Hono();
interface DemoAgentResponse { message?: unknown; profile_version?: unknown; read_only?: unknown; }
const requestsByIp = new Map<string, number[]>();
const maxRequests = 12;
const windowMs = 60 * 60 * 1000;
const foodSearch = new FoodSearchService(pool);

function base64Url(value: string) { return Buffer.from(value).toString("base64url"); }
function issueDemoToken(sessionId: string) {
  if (!settings.demoJwtPrivateKeyPem) throw new HttpError(503, "Demo unavailable");
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "ES256", kid: settings.demoJwtKeyId, typ: "JWT" }));
  const payload = base64Url(JSON.stringify({ iss: settings.demoJwtIssuer, sub: "demo:david", aud: "victus-agent", scope: ["demo:chat", "demo:read"], demo: true, profile_version: "david-v1", sid: sessionId, iat: now, exp: now + settings.demoJwtTtlSeconds, jti: randomUUID() }));
  const signature = sign("sha256", Buffer.from(`${header}.${payload}`), { key: createPrivateKey(settings.demoJwtPrivateKeyPem), dsaEncoding: "ieee-p1363" }).toString("base64url");
  return `${header}.${payload}.${signature}`;
}
function allowRequest(ip: string) {
  const now = Date.now();
  const recent = (requestsByIp.get(ip) ?? []).filter((time) => now - time < windowMs);
  if (recent.length >= maxRequests) return false;
  recent.push(now); requestsByIp.set(ip, recent); return true;
}

function demoSessionId(value: string | undefined): string {
  if (!value || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new HttpError(401, "Missing demo session");
  }
  return value;
}

demoChatRoutes.post("/api/demo/chat/stream", async (c) => {
  const origin = c.req.header("origin");
  if (origin && origin !== settings.frontendOrigin) throw new HttpError(403, "Invalid origin");
  const sessionId = demoSessionId(c.req.header("x-demo-session-id"));
  const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!allowRequest(ip)) throw new HttpError(429, "Demo limit reached. Please try again later.");
  const body = await c.req.json<Record<string, unknown>>();
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const language = body.language === "es" ? "es" : "en";
  if (!message || message.length > 1_500) throw new HttpError(422, "A demo message between 1 and 1500 characters is required");
  const demoState = demoSessionSnapshot(sessionId);
  const response = await fetch(`${settings.agentBaseUrl}/demo/chat`, {
    method: "POST",
    headers: { Authorization: `Bearer ${issueDemoToken(sessionId)}`, "Content-Type": "application/json" },
    body: JSON.stringify({ conversation_id: typeof body.conversation_id === "string" ? body.conversation_id.slice(0, 120) : randomUUID(), request_id: randomUUID(), message, language, ...(demoState.meals.length || demoState.metrics.length ? { demo_state: demoState } : {}) }),
    signal: AbortSignal.timeout(settings.agentTimeoutMs),
  }).catch((error) => { throw new HttpError(502, `Demo agent unavailable: ${String(error)}`); });
  if (!response.ok || !response.body) throw new HttpError(502, "Demo agent unavailable");
  const raw = await response.text();
  let agentResult: DemoAgentResponse;
  try { agentResult = JSON.parse(raw) as DemoAgentResponse; } catch { throw new HttpError(502, "Invalid demo agent response"); }
  if (typeof agentResult.message !== "string" || agentResult.profile_version !== "david-v1" || agentResult.read_only !== true) throw new HttpError(502, "Invalid demo agent response");
  const messageText = agentResult.message;
  c.header("Cache-Control", "no-store");
  return streamText(c, async (stream) => { await stream.write(messageText); });
});

demoChatRoutes.get("/api/demo/foods/search", async (c) => {
  const query = c.req.query("q")?.trim() ?? "";
  if (query.length < 2 || query.length > 100) throw new HttpError(422, "q must contain between 2 and 100 characters");
  const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!allowRequest(ip)) throw new HttpError(429, "Demo limit reached. Please try again later.");
  c.header("Cache-Control", "no-store");
  return c.json(await foodSearch.search({ query, limit: 8 }));
});
