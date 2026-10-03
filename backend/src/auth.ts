import { betterAuth } from "better-auth";
import { pool } from "./db.js";
import { settings } from "./config.js";

export const auth = betterAuth({
  appName: "Victus",
  baseURL: settings.betterAuthUrl,
  secret: settings.betterAuthSecret,
  database: pool,
  trustedOrigins: [settings.frontendOrigin, settings.backendOrigin, settings.betterAuthUrl],
  socialProviders: {
    google: { clientId: settings.googleClientId, clientSecret: settings.googleClientSecret },
  },
});

/**
 * Applies Better Auth's additive, idempotent schema migration before requests
 * can create OAuth state or sessions. Keeping this beside the auth config
 * guarantees the generated schema stays aligned with the installed library.
 */
export async function initializeAuthSchema(): Promise<void> {
  const context = await auth.$context;
  await context.runMigrations();
}
