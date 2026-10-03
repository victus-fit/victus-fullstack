import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { auth, initializeAuthSchema } from "./auth.js";
import { settings } from "./config.js";
import { pool } from "./db.js";
import { HttpError } from "./security.js";
import { initializeSchema } from "./schema.js";
import { initializeDevAuth } from "./devAuth.js";
import { authRoutes } from "./routes/auth.js";
import { agentMealCaptureRoutes } from "./routes/agentMealCapture.js";
import { chatRoutes } from "./routes/chat.js";
import { devAuthRoutes } from "./routes/devAuth.js";
import { demoChatRoutes } from "./routes/demoChat.js";
import { demoDataRoutes, initializeDemoTemplate } from "./routes/demoData.js";
import { dietPlanRoutes } from "./routes/dietPlans.js";
import { evidenceStatsRoutes } from "./routes/evidenceStats.js";
import { foodRoutes } from "./routes/foods.js";
import { mealLogRoutes } from "./routes/mealLogs.js";
import { oauthRoutes } from "./routes/oauth.js";
import { productRoutes } from "./routes/products.js";
import { profileContextRoutes } from "./routes/profileContext.js";
import { initializeTelemetry } from "./telemetry.js";

initializeTelemetry();

const app = new Hono();

app.use("*", cors({
  origin: (origin) => settings.corsOrigins.includes(origin) ? origin : settings.frontendOrigin,
  allowHeaders: ["Content-Type", "X-CSRF-Token", "X-Demo-Session-Id", "Authorization"],
  allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  exposeHeaders: ["X-Victus-Conversation-Id", "X-Victus-Agent-Turn-Id"],
  credentials: true,
  maxAge: 600,
}));

app.use("*", async (c, next) => {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header("X-Frame-Options", "DENY");
  c.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
});

app.route("/", authRoutes);
app.route("/", agentMealCaptureRoutes);
app.route("/", chatRoutes);
app.route("/", devAuthRoutes);
app.route("/", demoChatRoutes);
app.route("/", demoDataRoutes);
app.route("/", dietPlanRoutes);
app.route("/", evidenceStatsRoutes);
app.route("/", foodRoutes);
app.route("/", mealLogRoutes);
app.route("/", oauthRoutes);
app.route("/", productRoutes);
app.route("/", profileContextRoutes);
app.get("/health", async (c) => { await pool.query("SELECT 1"); return c.json({ status: "ok", service: "victus-webapp-backend" }); });
app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.notFound((c) => c.json({ detail: "Not Found" }, 404));
app.onError((error, c) => {
  if (error instanceof HttpError) {
    if (error.body) return c.json({ detail: error.body }, error.status as 400);
    return c.json({ detail: error.message }, error.status as 400);
  }
  console.error(error);
  return c.json({ detail: "Internal Server Error" }, 500);
});

await initializeAuthSchema();
await initializeSchema();
await initializeDemoTemplate();
await initializeDevAuth();

serve({ fetch: app.fetch, port: settings.port }, (info) => {
  console.log(`Victus unified backend listening on http://0.0.0.0:${info.port}`);
});

async function shutdown() {
  await pool.end();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
