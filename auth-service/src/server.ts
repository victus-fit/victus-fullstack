import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { auth } from "./auth.js";
import { settings } from "./config.js";
import { syncFastApiSession, syncFastApiSessionAndRedirect } from "./fastapi-session.js";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: [settings.frontendOrigin, settings.backendOrigin],
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["POST", "GET", "OPTIONS"],
    credentials: true,
    maxAge: 600
  })
);

app.get("/health", (c) => c.json({ status: "ok", service: "victus-auth-service" }));
app.post("/api/victus/session", syncFastApiSession);
app.get("/api/victus/session/complete", syncFastApiSessionAndRedirect);
app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

serve({ fetch: app.fetch, port: settings.port }, (info) => {
  console.log(`Victus auth service listening on http://0.0.0.0:${info.port}`);
});
