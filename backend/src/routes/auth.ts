import argon2 from "argon2";
import { Hono } from "hono";
import { auth } from "../auth.js";
import { settings } from "../config.js";
import { pool, transaction } from "../db.js";
import { clearSessionCookies, cookie, HttpError, issueAccessToken, randomToken, requireCsrf, setSessionCookies, sha256, signJwt, verifyJwt } from "../security.js";
import { currentUser, ensureDefaults, issueSession, markOnboardingPending, publicUser, upsertGoogleSession, type User } from "../session.js";

export const authRoutes = new Hono();

function validEmail(value: unknown): value is string {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

authRoutes.post("/api/auth/register", async (c) => {
  const body = await c.req.json<Record<string, unknown>>();
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const displayName = typeof body.display_name === "string" ? body.display_name.trim() : "";
  if (!validEmail(email) || password.length < 10 || password.length > 256 || !displayName || displayName.length > 160) {
    throw new HttpError(422, "Invalid registration fields");
  }
  const result = await transaction(async (db) => {
    const existing = await db.query(`SELECT 1 FROM app_users WHERE primary_email=$1`, [email]);
    if (existing.rowCount) throw new HttpError(409, "Email already registered");
    const users = await db.query<User>(`INSERT INTO app_users(primary_email,display_name) VALUES($1,$2) RETURNING *`, [email, displayName]);
    const user = users.rows[0]!;
    await db.query(`INSERT INTO auth_identities(user_id,provider,provider_subject,email,email_verified,password_hash)
      VALUES($1,'email_password',$2,$2,false,$3)`, [user.user_id, email, await argon2.hash(password)]);
    await ensureDefaults(db, user.user_id);
    await markOnboardingPending(db, user.user_id);
    const csrf = await issueSession(c, db, user);
    return { user, csrf };
  });
  return c.json({ user: publicUser(result.user), csrf_token: result.csrf }, 201);
});

authRoutes.post("/api/auth/login", async (c) => {
  const body = await c.req.json<Record<string, unknown>>();
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const result = await pool.query<User & { password_hash: string | null }>(
    `SELECT u.*,i.password_hash FROM auth_identities i JOIN app_users u ON u.user_id=i.user_id
     WHERE i.provider='email_password' AND i.provider_subject=$1`, [email],
  );
  const user = result.rows[0];
  if (!user?.password_hash || !(await argon2.verify(user.password_hash, password).catch(() => false))) throw new HttpError(401, "Invalid email or password");
  if (user.status !== "active") throw new HttpError(401, "Inactive user");
  const csrf = await issueSession(c, pool, user);
  return c.json({ user: publicUser(user), csrf_token: csrf });
});

authRoutes.post("/api/auth/refresh", async (c) => {
  const token = cookie(c, settings.refreshCookie);
  if (!token) throw new HttpError(401, "Missing refresh token");
  let payload;
  try { payload = verifyJwt(token, "refresh"); } catch { throw new HttpError(401, "Invalid refresh token"); }
  if (!payload.jti) throw new HttpError(401, "Invalid refresh token");
  const result = await pool.query<User & { session_hash: string; session_status: string; expires_at: Date }>(
    `SELECT u.*,s.session_hash,s.status session_status,s.expires_at FROM web_sessions s JOIN app_users u ON u.user_id=s.user_id WHERE s.session_id=$1`, [payload.sid],
  );
  const user = result.rows[0];
  if (!user || user.user_id !== payload.sub || user.status !== "active" || user.session_status !== "active") throw new HttpError(401, "Inactive session");
  if (new Date(user.expires_at).getTime() <= Date.now()) throw new HttpError(401, "Session expired");
  if (user.session_hash !== sha256(payload.jti)) {
    await pool.query(`UPDATE web_sessions SET status='revoked',revoked_at=now() WHERE session_id=$1`, [payload.sid]);
    throw new HttpError(401, "Refresh token reuse detected");
  }
  const jti = randomToken(); const csrf = randomToken(); const now = Math.floor(Date.now() / 1000);
  await pool.query(`UPDATE web_sessions SET session_hash=$2,expires_at=now()+($3 || ' days')::interval,updated_at=now() WHERE session_id=$1`, [payload.sid, sha256(jti), settings.refreshDays]);
  setSessionCookies(c,
    issueAccessToken(user.user_id, payload.sid, settings.accessMinutes * 60, now),
    signJwt({ sub: user.user_id, sid: payload.sid, typ: "refresh", iat: now, exp: now + settings.refreshDays * 86400, jti }), csrf);
  return c.json({ user: publicUser(user), csrf_token: csrf });
});

authRoutes.post("/api/auth/logout", async (c) => {
  requireCsrf(c);
  const token = cookie(c, settings.refreshCookie) || cookie(c, settings.accessCookie);
  if (token) {
    try {
      const payload = verifyJwt(token, cookie(c, settings.refreshCookie) ? "refresh" : "access");
      await pool.query(`UPDATE web_sessions SET status='revoked',revoked_at=now() WHERE session_id=$1`, [payload.sid]);
    } catch { /* logout remains idempotent */ }
  }
  clearSessionCookies(c);
  return c.body(null, 204);
});

authRoutes.delete("/api/auth/account", async (c) => {
  requireCsrf(c);
  const user = await currentUser(c);
  const body = await c.req.json<Record<string, unknown>>();
  if (body.confirmation !== "ELIMINAR") throw new HttpError(422, "Confirmation must be ELIMINAR");
  await pool.query("DELETE FROM app_users WHERE user_id=$1", [user.user_id]);
  clearSessionCookies(c);
  return c.body(null, 204);
});

authRoutes.get("/api/auth/me", async (c) => {
  try { return c.json({ user: publicUser(await currentUser(c)), authenticated: true }); }
  catch { return c.json({ user: null, authenticated: false }); }
});

authRoutes.post("/api/victus/session", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers }) as { user?: { id?: string; email?: string; name?: string | null; image?: string | null } } | null;
  if (!session?.user?.email) throw new HttpError(401, "Missing Better Auth session");
  const result = await upsertGoogleSession(c, session.user);
  return c.json({ authenticated: true, user: publicUser(result.user) });
});

authRoutes.get("/api/victus/session/complete", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers }) as { user?: { id?: string; email?: string; name?: string | null; image?: string | null } } | null;
  if (!session?.user?.email) return c.redirect(`${settings.frontendOrigin}/login`);
  await upsertGoogleSession(c, session.user);
  const requested = c.req.query("return_to");
  let target = `${settings.frontendOrigin}/app`;
  if (requested) {
    try { if ([settings.frontendOrigin, settings.backendOrigin].includes(new URL(requested).origin)) target = requested; } catch { /* default */ }
  }
  return c.redirect(target);
});
