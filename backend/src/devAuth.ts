import { randomUUID } from "node:crypto";
import type { DbClient } from "./db.js";
import { pool } from "./db.js";
import { settings } from "./config.js";
import { issueAccessToken, randomToken, sha256 } from "./security.js";

export const DEV_USER_ID = "00000000-0000-4000-8000-000000000001";
export const DEV_USER_EMAIL = "dev-user@victus.invalid";
export const DEV_ACCESS_TOKEN_SECONDS = 3600;

export interface DevTokenResponse {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
}

export async function initializeDevAuth(db: DbClient = pool): Promise<void> {
  if (!settings.enableDevAuth) return;

  await db.query(
    `INSERT INTO app_users(user_id,primary_email,display_name,status,locale,timezone)
     VALUES($1,$2,$3,'active','es-CL','America/Santiago')
     ON CONFLICT(user_id) DO UPDATE SET
       primary_email=EXCLUDED.primary_email,
       display_name=EXCLUDED.display_name,
       status='active',
       updated_at=now()`,
    [DEV_USER_ID, DEV_USER_EMAIL, "Victus Dev User"],
  );
  await db.query(`INSERT INTO user_settings(user_id) VALUES($1) ON CONFLICT(user_id) DO NOTHING`, [DEV_USER_ID]);
}

export async function issueDevAccessToken(db: DbClient = pool): Promise<DevTokenResponse> {
  const users = await db.query<{ user_id: string }>(
    `SELECT user_id FROM app_users WHERE user_id=$1 AND primary_email=$2 AND status='active'`,
    [DEV_USER_ID, DEV_USER_EMAIL],
  );
  const user = users.rows[0];
  if (!user) throw new Error("Development user is unavailable");

  const sessionId = randomUUID();
  await db.query(
    `INSERT INTO web_sessions(session_id,user_id,session_hash,status,expires_at)
     VALUES($1,$2,$3,'active',now()+($4 * interval '1 second'))`,
    [sessionId, user.user_id, sha256(randomToken()), DEV_ACCESS_TOKEN_SECONDS],
  );

  return {
    access_token: issueAccessToken(user.user_id, sessionId, DEV_ACCESS_TOKEN_SECONDS),
    token_type: "Bearer",
    expires_in: DEV_ACCESS_TOKEN_SECONDS,
  };
}
