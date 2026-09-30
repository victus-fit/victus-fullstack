import { assertDevAuthEnvironment } from "./devAuthPolicy.js";

function env(name: string, fallback?: string): string {
  const value = process.env[name]?.trim();
  if (value) return value;
  if (fallback !== undefined) return fallback;
  throw new Error(`${name} is required`);
}

function bool(name: string, fallback: boolean): boolean {
  return env(name, String(fallback)) === "true";
}

function featureFlag(name: string, fallback = false): boolean {
  const value = env(name, String(fallback)).toLowerCase();
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`${name} must be true or false`);
}

function positiveInteger(name: string, fallback: number): number {
  const parsed = Number.parseInt(env(name, String(fallback)), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`${name} must be a positive integer`);
  return parsed;
}

function fixedInteger(name: string, value: number): number {
  const parsed = positiveInteger(name, value);
  if (parsed !== value) throw new Error(`${name} must be ${value}`);
  return parsed;
}

const secretKey = env("SECRET_KEY");
if (secretKey.length < 32) throw new Error("SECRET_KEY must contain at least 32 characters");
const appEnv = env("APP_ENV", "development").toLowerCase();
const enableDevAuth = featureFlag("ENABLE_DEV_AUTH");
assertDevAuthEnvironment(appEnv, enableDevAuth);
const demoPrivateKeyBase64 = process.env.VICTUS_DEMO_JWT_PRIVATE_KEY_PEM_BASE64?.trim();
const demoPrivateKeyPem = demoPrivateKeyBase64
  ? Buffer.from(demoPrivateKeyBase64, "base64").toString("utf8").trim()
  : process.env.VICTUS_DEMO_JWT_PRIVATE_KEY_PEM?.replace(/\\n/g, "\n").trim() || undefined;

export const settings = {
  port: Number(env("BACKEND_PORT", "8000")),
  appEnv,
  enableDevAuth,
  databaseUrl: env("DATABASE_URL").replace("postgresql+asyncpg://", "postgresql://"),
  frontendOrigin: env("FRONTEND_ORIGIN", "http://localhost:5173"),
  backendOrigin: env("BACKEND_ORIGIN", "http://localhost:8000"),
  corsOrigins: env("CORS_ALLOW_ORIGINS", "http://localhost:5173").split(",").map((v) => v.trim()).filter(Boolean),
  secretKey,
  demoJwtPrivateKeyPem: demoPrivateKeyPem,
  demoJwtKeyId: env("VICTUS_DEMO_JWT_KID", "demo-es256-2026-01"),
  demoJwtIssuer: env("VICTUS_DEMO_JWT_ISSUER", "victus-webapp"),
  demoJwtTtlSeconds: fixedInteger("VICTUS_DEMO_JWT_TTL_SECONDS", 30),
  demoAgentApiToken: process.env.VICTUS_DEMO_AGENT_API_TOKEN?.trim() || undefined,
  jwtAlgorithm: env("JWT_ALGORITHM", "HS256"),
  accessMinutes: Number(env("ACCESS_TOKEN_MINUTES", "15")),
  refreshDays: Number(env("REFRESH_TOKEN_DAYS", "7")),
  accessCookie: env("ACCESS_COOKIE_NAME", "victus_access"),
  refreshCookie: env("REFRESH_COOKIE_NAME", "victus_refresh"),
  csrfCookie: env("CSRF_COOKIE_NAME", "victus_csrf"),
  cookieDomain: process.env.COOKIE_DOMAIN?.trim() || undefined,
  cookieSecure: bool("COOKIE_SECURE", false),
  cookieSameSite: env("COOKIE_SAMESITE", "lax") as "lax" | "strict" | "none",
  betterAuthUrl: env("BETTER_AUTH_URL", env("BACKEND_ORIGIN", "http://localhost:8000")),
  betterAuthSecret: env("BETTER_AUTH_SECRET", secretKey),
  googleClientId: env("GOOGLE_CLIENT_ID", "missing-google-client-id"),
  googleClientSecret: env("GOOGLE_CLIENT_SECRET", "missing-google-client-secret"),
  agentBaseUrl: env("VICTUS_AGENT_BASE_URL", "http://host.docker.internal:8766"),
  agentTimeoutMs: Number(env("VICTUS_AGENT_TIMEOUT_SECONDS", "60")) * 1000,
  phoenixTracingEnabled: featureFlag("PHOENIX_TRACING_ENABLED"),
  phoenixCollectorEndpoint: process.env.PHOENIX_COLLECTOR_ENDPOINT?.trim() || undefined,
  phoenixProjectName: env("PHOENIX_PROJECT_NAME", "victus-local"),
  phoenixApiKey: process.env.PHOENIX_API_KEY?.trim() || undefined,
};
