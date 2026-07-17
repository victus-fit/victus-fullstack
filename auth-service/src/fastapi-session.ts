import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import type { Context } from "hono";
import { setCookie } from "hono/cookie";
import { pool } from "./db.js";
import { settings } from "./config.js";
import { auth } from "./auth.js";

type BetterAuthSession = {
  user?: {
    id?: string;
    email?: string;
    name?: string | null;
    image?: string | null;
  };
};

function base64Url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function signJwt(payload: Record<string, unknown>): string {
  if (settings.jwtAlgorithm !== "HS256") {
    throw new Error("auth-service currently supports JWT_ALGORITHM=HS256");
  }
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64Url(JSON.stringify(header));
  const encodedPayload = base64Url(JSON.stringify(payload));
  const signature = createHmac("sha256", settings.jwtSecret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64url");
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function tokenUrlSafe(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

function cookieOptions(httpOnly: boolean, maxAge: number) {
  return {
    httpOnly,
    secure: settings.cookieSecure,
    sameSite: settings.cookieSameSite,
    domain: settings.cookieDomain,
    path: "/",
    maxAge
  } as const;
}

function originFromRequest(c: Context): string {
  const origin = c.req.header("origin");
  if (origin) return origin;
  return settings.frontendOrigin;
}

function redirectTarget(c: Context): string {
  const returnTo = c.req.query("return_to");
  if (returnTo?.startsWith(settings.backendOrigin) || returnTo?.startsWith(settings.frontendOrigin)) {
    return returnTo;
  }
  return `${settings.frontendOrigin}/app`;
}

async function currentBetterAuthSession(c: Context): Promise<BetterAuthSession | null> {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  return session as BetterAuthSession | null;
}

async function upsertFastApiSession(user: Required<BetterAuthSession>["user"], c: Context) {
  const email = String(user.email || "").trim().toLowerCase();
  if (!email) throw new Error("Better Auth session is missing email");

  const displayName = user.name || email.split("@")[0];
  const avatarUrl = user.image || null;
  const googleSubject = String(user.id || email);
  const refreshJti = tokenUrlSafe();
  const csrfToken = tokenUrlSafe();
  const sessionId = randomUUID();

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const userResult = await client.query<{ user_id: string }>(
      `
      INSERT INTO app_users (primary_email, display_name, avatar_url, status, locale, timezone)
      VALUES ($1, $2, $3, 'active', 'es-CL', 'America/Santiago')
      ON CONFLICT (primary_email)
      DO UPDATE SET
        display_name = COALESCE(app_users.display_name, EXCLUDED.display_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, app_users.avatar_url),
        updated_at = now()
      RETURNING user_id
      `,
      [email, displayName, avatarUrl]
    );
    const userId = userResult.rows[0]?.user_id;
    if (!userId) throw new Error("Unable to upsert app user");

    await client.query(
      `
      INSERT INTO auth_identities (
        user_id, provider, provider_subject, email, email_verified, password_hash, metadata_json
      )
      VALUES ($1, 'google', $2, $3, true, NULL, $4::jsonb)
      ON CONFLICT (provider, provider_subject)
      DO UPDATE SET
        user_id = EXCLUDED.user_id,
        email = EXCLUDED.email,
        email_verified = true,
        metadata_json = EXCLUDED.metadata_json,
        updated_at = now()
      `,
      [userId, googleSubject, email, JSON.stringify({ better_auth_user_id: googleSubject, image: avatarUrl })]
    );

    const requestIp = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const userAgent = c.req.header("user-agent") || "";
    await client.query(
      `
      INSERT INTO web_sessions (
        session_id, user_id, session_hash, status, ip_hash, user_agent_hash, expires_at
      )
      VALUES ($1, $2, $3, 'active', $4, $5, now() + ($6 || ' days')::interval)
      `,
      [sessionId, userId, sha256(refreshJti), sha256(requestIp), sha256(userAgent), settings.refreshTokenDays]
    );

    await client.query("COMMIT");

    const nowSeconds = Math.floor(Date.now() / 1000);
    const accessExp = nowSeconds + settings.accessTokenMinutes * 60;
    const refreshExp = nowSeconds + settings.refreshTokenDays * 24 * 60 * 60;
    const accessToken = signJwt({ sub: userId, sid: sessionId, typ: "access", iat: nowSeconds, exp: accessExp });
    const refreshToken = signJwt({ sub: userId, sid: sessionId, typ: "refresh", iat: nowSeconds, exp: refreshExp, jti: refreshJti });

    setCookie(c, settings.accessCookieName, accessToken, cookieOptions(true, settings.accessTokenMinutes * 60));
    setCookie(c, settings.refreshCookieName, refreshToken, cookieOptions(true, settings.refreshTokenDays * 24 * 60 * 60));
    setCookie(c, settings.csrfCookieName, csrfToken, cookieOptions(false, settings.refreshTokenDays * 24 * 60 * 60));

    return { userId, email, displayName, redirectTo: redirectTarget(c), origin: originFromRequest(c) };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function syncFastApiSession(c: Context) {
  const session = await currentBetterAuthSession(c);
  if (!session?.user?.email) {
    return c.json({ error: "unauthorized", message: "Missing Better Auth session" }, 401);
  }
  const result = await upsertFastApiSession(session.user, c);
  return c.json({
    authenticated: true,
    redirect_to: result.redirectTo,
    user: {
      user_id: result.userId,
      primary_email: result.email,
      display_name: result.displayName
    }
  });
}

export async function syncFastApiSessionAndRedirect(c: Context) {
  const session = await currentBetterAuthSession(c);
  if (!session?.user?.email) {
    return c.redirect(`${settings.frontendOrigin}/login`);
  }
  const result = await upsertFastApiSession(session.user, c);
  return c.redirect(result.redirectTo || `${settings.frontendOrigin}/app`);
}
