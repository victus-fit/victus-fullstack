import { randomUUID } from "node:crypto";
import type { Context } from "hono";
import type { DbClient } from "./db.js";
import { pool, transaction } from "./db.js";
import { settings } from "./config.js";
import { cookie, HttpError, issueAccessToken, randomToken, setSessionCookies, sha256, signJwt, verifyJwt } from "./security.js";

export type User = {
  user_id: string; primary_email: string; display_name: string | null; avatar_url: string | null;
  status: string; locale: string; timezone: string; last_seen_at?: Date | null;
};

export const publicUser = (user: User) => ({
  user_id: user.user_id, primary_email: user.primary_email, display_name: user.display_name,
  avatar_url: user.avatar_url, status: user.status, locale: user.locale, timezone: user.timezone,
});

export async function ensureDefaults(db: DbClient, userId: string): Promise<void> {
  await db.query(`INSERT INTO user_settings(user_id) VALUES($1) ON CONFLICT(user_id) DO NOTHING`, [userId]);
}

export async function issueSession(c: Context, db: DbClient, user: User): Promise<string> {
  const sid = randomUUID();
  const jti = randomToken();
  const csrf = randomToken();
  const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
  const ua = c.req.header("user-agent") || "";
  await db.query(
    `INSERT INTO web_sessions(session_id,user_id,session_hash,status,ip_hash,user_agent_hash,expires_at)
     VALUES($1,$2,$3,'active',$4,$5,now()+($6 || ' days')::interval)`,
    [sid, user.user_id, sha256(jti), sha256(ip), sha256(ua), settings.refreshDays],
  );
  const now = Math.floor(Date.now() / 1000);
  const access = issueAccessToken(user.user_id, sid, settings.accessMinutes * 60, now);
  const refresh = signJwt({ sub: user.user_id, sid, typ: "refresh", iat: now, exp: now + settings.refreshDays * 86400, jti });
  setSessionCookies(c, access, refresh, csrf);
  return csrf;
}

export async function currentUser(c: Context, bearer = false): Promise<User> {
  let token: string | undefined;
  if (bearer) {
    const [scheme, value] = (c.req.header("authorization") || "").split(" ");
    if (scheme?.toLowerCase() === "bearer") token = value;
  } else token = cookie(c, settings.accessCookie);
  if (!token) throw new HttpError(401, "Missing session");
  let payload;
  try { payload = verifyJwt(token, "access"); } catch { throw new HttpError(401, "Invalid or expired token"); }
  const result = await pool.query<User & { session_status: string; session_user_id: string; expires_at: Date }>(
    `SELECT u.*,s.status session_status,s.user_id session_user_id,s.expires_at FROM app_users u
     JOIN web_sessions s ON s.session_id=$2 WHERE u.user_id=$1`, [payload.sub, payload.sid],
  );
  const user = result.rows[0];
  if (!user || user.status !== "active" || user.session_status !== "active" || user.session_user_id !== user.user_id) {
    throw new HttpError(401, "Inactive session");
  }
  if (new Date(user.expires_at).getTime() <= Date.now()) {
    await pool.query(`UPDATE web_sessions SET status='expired' WHERE session_id=$1`, [payload.sid]);
    throw new HttpError(401, "Session expired");
  }
  await pool.query(`UPDATE app_users SET last_seen_at=now(),updated_at=now() WHERE user_id=$1`, [user.user_id]);
  return user;
}

export async function upsertGoogleSession(c: Context, identity: { id?: string; email?: string; name?: string | null; image?: string | null }) {
  const email = identity.email?.trim().toLowerCase();
  if (!email) throw new HttpError(401, "Better Auth session is missing email");
  return transaction(async (db) => {
    const users = await db.query<User>(
      `INSERT INTO app_users(primary_email,display_name,avatar_url) VALUES($1,$2,$3)
       ON CONFLICT(primary_email) DO UPDATE SET display_name=COALESCE(app_users.display_name,EXCLUDED.display_name),
       avatar_url=COALESCE(EXCLUDED.avatar_url,app_users.avatar_url),updated_at=now() RETURNING *`,
      [email, identity.name || email.split("@")[0], identity.image || null],
    );
    const user = users.rows[0]!;
    await db.query(
      `INSERT INTO auth_identities(user_id,provider,provider_subject,email,email_verified,password_hash,metadata_json)
       VALUES($1,'google',$2,$3,true,NULL,$4) ON CONFLICT(provider,provider_subject) DO UPDATE SET
       user_id=EXCLUDED.user_id,email=EXCLUDED.email,email_verified=true,metadata_json=EXCLUDED.metadata_json,updated_at=now()`,
      [user.user_id, identity.id || email, email, JSON.stringify({ better_auth_user_id: identity.id || email, image: identity.image || null })],
    );
    await ensureDefaults(db, user.user_id);
    const csrf = await issueSession(c, db, user);
    return { user, csrf };
  });
}
