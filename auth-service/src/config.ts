export function env(name: string, fallback?: string): string {
  const value = process.env[name];
  if (value && value.trim()) return value.trim();
  if (fallback !== undefined) return fallback;
  throw new Error(`${name} is required`);
}

export function databaseUrl(): string {
  return env("DATABASE_URL").replace("postgresql+asyncpg://", "postgresql://");
}

export const settings = {
  port: Number(env("AUTH_SERVICE_PORT", "8001")),
  betterAuthUrl: env("BETTER_AUTH_URL", "http://localhost:8001"),
  betterAuthSecret: env("BETTER_AUTH_SECRET", env("SECRET_KEY")),
  frontendOrigin: env("FRONTEND_ORIGIN", "http://localhost:5173"),
  backendOrigin: env("BACKEND_ORIGIN", "http://localhost:8000"),
  jwtSecret: env("SECRET_KEY"),
  jwtAlgorithm: env("JWT_ALGORITHM", "HS256"),
  accessCookieName: env("ACCESS_COOKIE_NAME", "victus_access"),
  refreshCookieName: env("REFRESH_COOKIE_NAME", "victus_refresh"),
  csrfCookieName: env("CSRF_COOKIE_NAME", "victus_csrf"),
  cookieDomain: process.env.COOKIE_DOMAIN?.trim() || undefined,
  cookieSecure: env("COOKIE_SECURE", "false") === "true",
  cookieSameSite: env("COOKIE_SAMESITE", "lax") as "lax" | "strict" | "none",
  accessTokenMinutes: Number(env("ACCESS_TOKEN_MINUTES", "15")),
  refreshTokenDays: Number(env("REFRESH_TOKEN_DAYS", "7")),
  googleClientId: env("GOOGLE_CLIENT_ID", "missing-google-client-id"),
  googleClientSecret: env("GOOGLE_CLIENT_SECRET", "missing-google-client-secret")
};
