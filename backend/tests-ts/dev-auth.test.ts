import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { assertDevAuthEnvironment } from "../src/devAuthPolicy.js";
import type { DbClient } from "../src/db.js";

process.env.SECRET_KEY ??= "test-secret-key-that-is-at-least-32-characters";
process.env.DATABASE_URL ??= "postgresql://victus:victus@127.0.0.1:5432/victus_test";
process.env.APP_ENV = "test";
process.env.ENABLE_DEV_AUTH = "true";

const { DEV_ACCESS_TOKEN_SECONDS, DEV_USER_EMAIL, DEV_USER_ID, initializeDevAuth, issueDevAccessToken } = await import("../src/devAuth.js");
const { createDevAuthRoutes } = await import("../src/routes/devAuth.js");
const { verifyJwt } = await import("../src/security.js");

class FakeDb {
  queries: Array<{ text: string; values: unknown[] | undefined }> = [];

  async query<T = unknown>(text: string, values?: unknown[]): Promise<{ rows: T[]; rowCount: number }> {
    this.queries.push({ text, values });
    const rows = text.includes("SELECT user_id FROM app_users") ? [{ user_id: DEV_USER_ID } as T] : [];
    return { rows, rowCount: rows.length };
  }
}

test("dev auth is allowed only in local environments", () => {
  for (const environment of ["local", "development", "test"]) {
    assert.doesNotThrow(() => assertDevAuthEnvironment(environment, true));
  }
  for (const environment of ["staging", "production"]) {
    assert.throws(() => assertDevAuthEnvironment(environment, true), /ENABLE_DEV_AUTH/);
    assert.doesNotThrow(() => assertDevAuthEnvironment(environment, false));
  }
});

test("invalid production configuration fails while loading settings", () => {
  const result = spawnSync(
    process.execPath,
    ["--import", "tsx", "--input-type=module", "--eval", "await import('./src/config.ts')"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        APP_ENV: "production",
        ENABLE_DEV_AUTH: "true",
      },
    },
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /ENABLE_DEV_AUTH can only be enabled/);
});

test("disabled dev auth does not register the route", async () => {
  const response = await createDevAuthRoutes(false).request("/oauth/dev-token", { method: "POST" });
  assert.equal(response.status, 404);
});

test("enabled route returns only the access token response", async () => {
  const expected = { access_token: "opaque-for-route-test", token_type: "Bearer" as const, expires_in: 3600 };
  const response = await createDevAuthRoutes(true, async () => expected).request("/oauth/dev-token", { method: "POST" });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), expected);
});

test("development user seed is stable and minimal", async () => {
  const db = new FakeDb();
  await initializeDevAuth(db as unknown as DbClient);
  assert.equal(db.queries.length, 2);
  assert.deepEqual(db.queries[0]?.values, [DEV_USER_ID, DEV_USER_EMAIL, "Victus Dev User"]);
  assert.deepEqual(db.queries[1]?.values, [DEV_USER_ID]);
});

test("dev token uses the normal access-token claims and a real session", async () => {
  const db = new FakeDb();
  const response = await issueDevAccessToken(db as unknown as DbClient);
  const payload = verifyJwt(response.access_token, "access");

  assert.deepEqual(Object.keys(response).sort(), ["access_token", "expires_in", "token_type"]);
  assert.equal(response.token_type, "Bearer");
  assert.equal(response.expires_in, DEV_ACCESS_TOKEN_SECONDS);
  assert.equal(payload.sub, DEV_USER_ID);
  assert.equal(payload.typ, "access");
  assert.equal(payload.exp - payload.iat, DEV_ACCESS_TOKEN_SECONDS);
  assert.ok(payload.sid);
  assert.equal(db.queries.length, 2);
  assert.match(db.queries[1]?.text ?? "", /INSERT INTO web_sessions/);
  assert.equal(db.queries[1]?.values?.[1], DEV_USER_ID);
  assert.equal(db.queries[1]?.values?.[3], DEV_ACCESS_TOKEN_SECONDS);
});
