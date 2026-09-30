import { createHash, randomUUID } from "node:crypto";
import { Hono } from "hono";
import { settings } from "../config.js";
import { pool, transaction } from "../db.js";
import { HttpError, issueAccessToken, randomToken, sha256, signJwt, verifyJwt } from "../security.js";
import { currentUser, type User } from "../session.js";

export const oauthRoutes = new Hono();
const CLIENT_ID = "victus-cli";
const SCOPE = "openid profile email offline_access";

const oauthError = (status: number, error: string, description: string) => new HttpError(status, description, { error, error_description: description });
const requireClient = (id: unknown) => { if (id !== CLIENT_ID) throw oauthError(400, "invalid_client", "Unknown OAuth client"); };

function redirectUri(value: unknown): string {
  if (typeof value !== "string") throw oauthError(400, "invalid_request", "redirect_uri is required");
  let url: URL;
  try { url = new URL(value); } catch { throw oauthError(400, "invalid_request", "Invalid redirect_uri"); }
  if (url.protocol !== "http:" || url.hostname !== "127.0.0.1" || !url.port || url.pathname !== "/callback" || url.search || url.hash) {
    throw oauthError(400, "invalid_request", "redirect_uri must use http://127.0.0.1:<port>/callback");
  }
  return value;
}

function normalizeScope(value: unknown): string {
  const requested = typeof value === "string" ? value.split(/\s+/).filter(Boolean) : SCOPE.split(" ");
  const allowed = SCOPE.split(" ");
  if (requested.some((scope) => !allowed.includes(scope))) throw oauthError(400, "invalid_scope", "Unsupported OAuth scope");
  return allowed.filter((scope) => requested.includes(scope)).join(" ");
}

oauthRoutes.get("/oauth/authorize", async (c) => {
  if (c.req.query("response_type") !== "code") throw oauthError(400, "unsupported_response_type", "Only response_type=code is supported");
  requireClient(c.req.query("client_id"));
  const target = redirectUri(c.req.query("redirect_uri"));
  const state = c.req.query("state");
  const challenge = c.req.query("code_challenge");
  if (!state || !challenge || c.req.query("code_challenge_method") !== "S256") throw oauthError(400, "invalid_request", "state and S256 PKCE are required");
  let user: User;
  try { user = await currentUser(c); }
  catch { return c.redirect(`${settings.frontendOrigin}/login?${new URLSearchParams({ return_to: c.req.url })}`); }
  const code = randomToken();
  await pool.query(
    `INSERT INTO oauth_authorization_codes(code_hash,client_id,user_id,redirect_uri,scope,code_challenge,code_challenge_method,expires_at)
     VALUES($1,$2,$3,$4,$5,$6,'S256',now()+interval '10 minutes')`,
    [sha256(code), CLIENT_ID, user.user_id, target, normalizeScope(c.req.query("scope")), challenge],
  );
  const url = new URL(target); url.searchParams.set("code", code); url.searchParams.set("state", state);
  return c.redirect(url.toString());
});

async function issueCliTokens(db: import("../db.js").DbClient, c: Parameters<typeof currentUser>[0], user: User, scope = SCOPE) {
  const sid = randomUUID(), jti = randomToken(), now = Math.floor(Date.now() / 1000);
  const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
  await db.query(`INSERT INTO web_sessions(session_id,user_id,session_hash,ip_hash,user_agent_hash,expires_at)
    VALUES($1,$2,$3,$4,$5,now()+($6 || ' days')::interval)`,
    [sid, user.user_id, sha256(jti), sha256(ip), sha256(c.req.header("user-agent") || ""), settings.refreshDays]);
  return { access_token: issueAccessToken(user.user_id,sid,3600,now),
    refresh_token: signJwt({ sub:user.user_id,sid,typ:"refresh",iat:now,exp:now+settings.refreshDays*86400,jti }),
    expires_in: 3600, token_type: "Bearer", scope };
}

oauthRoutes.post("/oauth/token", async (c) => {
  const body = await c.req.json<Record<string, unknown>>(); requireClient(body.client_id);
  if (body.grant_type === "authorization_code") {
    const verifier = typeof body.code_verifier === "string" ? body.code_verifier : "";
    if (!/^[A-Za-z0-9._~-]{43,128}$/.test(verifier) || typeof body.code !== "string") throw oauthError(400,"invalid_grant","Invalid code_verifier");
    const target = redirectUri(body.redirect_uri);
    return c.json(await transaction(async (db) => {
      const result = await db.query<{ user_id:string;client_id:string;redirect_uri:string;scope:string;code_challenge:string;expires_at:Date;used_at:Date|null }>(
        `SELECT * FROM oauth_authorization_codes WHERE code_hash=$1 FOR UPDATE`, [sha256(body.code as string)]);
      const grant = result.rows[0];
      const challenge = createHash("sha256").update(verifier,"ascii").digest("base64url");
      if (!grant || grant.used_at || new Date(grant.expires_at).getTime()<=Date.now() || grant.client_id!==CLIENT_ID || grant.redirect_uri!==target || grant.code_challenge!==challenge) {
        throw oauthError(400,"invalid_grant","Invalid, expired, or mismatched authorization code");
      }
      const users = await db.query<User>(`SELECT * FROM app_users WHERE user_id=$1 AND status='active'`,[grant.user_id]);
      if (!users.rows[0]) throw oauthError(400,"invalid_grant","User is not active");
      await db.query(`UPDATE oauth_authorization_codes SET used_at=now() WHERE code_hash=$1`,[sha256(body.code as string)]);
      return issueCliTokens(db,c,users.rows[0],grant.scope);
    }));
  }
  if (body.grant_type === "refresh_token") {
    if (typeof body.refresh_token !== "string") throw oauthError(400,"invalid_request","refresh_token is required");
    let payload; try { payload=verifyJwt(body.refresh_token,"refresh"); } catch { throw oauthError(400,"invalid_grant","Invalid refresh token"); }
    if (!payload.jti) throw oauthError(400,"invalid_grant","Invalid refresh token");
    const result=await pool.query<User & {session_hash:string;session_status:string;expires_at:Date}>(
      `SELECT u.*,s.session_hash,s.status session_status,s.expires_at FROM web_sessions s JOIN app_users u ON u.user_id=s.user_id WHERE s.session_id=$1`,[payload.sid]);
    const user=result.rows[0];
    if(!user||user.user_id!==payload.sub||user.status!=="active"||user.session_status!=="active"||user.session_hash!==sha256(payload.jti)) throw oauthError(400,"invalid_grant","Inactive or invalid session");
    const jti=randomToken(),now=Math.floor(Date.now()/1000);
    await pool.query(`UPDATE web_sessions SET session_hash=$2,expires_at=now()+($3 || ' days')::interval,updated_at=now() WHERE session_id=$1`,[payload.sid,sha256(jti),settings.refreshDays]);
    return c.json({access_token:issueAccessToken(user.user_id,payload.sid,3600,now),refresh_token:signJwt({sub:user.user_id,sid:payload.sid,typ:"refresh",iat:now,exp:now+settings.refreshDays*86400,jti}),expires_in:3600,token_type:"Bearer",scope:SCOPE});
  }
  throw oauthError(400,"unsupported_grant_type","Unsupported grant_type");
});

oauthRoutes.post("/oauth/revoke", async (c) => {
  const body=await c.req.json<Record<string,unknown>>(); requireClient(body.client_id);
  if(typeof body.token==="string") try { const payload=verifyJwt(body.token,"refresh"); await pool.query(`UPDATE web_sessions SET status='revoked',revoked_at=now() WHERE session_id=$1`,[payload.sid]); } catch { /* RFC 7009 idempotency */ }
  return c.body(null,200);
});
