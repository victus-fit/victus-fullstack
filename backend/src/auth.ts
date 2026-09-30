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
