import { Hono } from "hono";
import { issueDevAccessToken, type DevTokenResponse } from "../devAuth.js";
import { settings } from "../config.js";

type TokenIssuer = () => Promise<DevTokenResponse>;

export function createDevAuthRoutes(enabled = settings.enableDevAuth, issueToken: TokenIssuer = issueDevAccessToken): Hono {
  const routes = new Hono();
  if (enabled) {
    routes.post("/oauth/dev-token", async (c) => c.json(await issueToken()));
  }
  return routes;
}

export const devAuthRoutes = createDevAuthRoutes();
