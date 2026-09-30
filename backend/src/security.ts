import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { settings } from "./config.js";

export type TokenType = "access" | "refresh";
export type JwtPayload = { sub: string; sid: string; typ: TokenType; iat: number; exp: number; jti?: string };

const base64Url = (value: string | Buffer) => Buffer.from(value).toString("base64url");
export const randomToken = () => randomBytes(32).toString("base64url");
export const sha256 = (value: string) => createHash("sha256").update(value, "utf8").digest("hex");

export function signJwt(payload: JwtPayload): string {
  if (settings.jwtAlgorithm !== "HS256") throw new Error("Only JWT_ALGORITHM=HS256 is supported");
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64Url(JSON.stringify(payload));
  const signature = createHmac("sha256", settings.secretKey).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

export function issueAccessToken(subject: string, sessionId: string, expiresInSeconds: number, issuedAt = Math.floor(Date.now() / 1000)): string {
  return signJwt({ sub: subject, sid: sessionId, typ: "access", iat: issuedAt, exp: issuedAt + expiresInSeconds });
}

export function verifyJwt(token: string, expectedType: TokenType): JwtPayload {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid token");
  const [header, body, signature] = parts as [string, string, string];
  const expected = createHmac("sha256", settings.secretKey).update(`${header}.${body}`).digest();
  const actual = Buffer.from(signature, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error("Invalid token");
  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as JwtPayload;
  if (payload.typ !== expectedType || !payload.sub || !payload.sid || payload.exp <= Math.floor(Date.now() / 1000)) {
    throw new Error("Invalid or expired token");
  }
  return payload;
}

const cookieOptions = (httpOnly: boolean, maxAge: number) => ({
  httpOnly,
  secure: settings.cookieSecure,
  sameSite: settings.cookieSameSite,
  domain: settings.cookieDomain,
  path: "/",
  maxAge,
} as const);

export function setSessionCookies(c: Context, accessToken: string, refreshToken: string, csrfToken: string): void {
  setCookie(c, settings.accessCookie, accessToken, cookieOptions(true, settings.accessMinutes * 60));
  setCookie(c, settings.refreshCookie, refreshToken, cookieOptions(true, settings.refreshDays * 86400));
  setCookie(c, settings.csrfCookie, csrfToken, cookieOptions(false, settings.refreshDays * 86400));
}

export function clearSessionCookies(c: Context): void {
  for (const name of [settings.accessCookie, settings.refreshCookie, settings.csrfCookie]) {
    deleteCookie(c, name, { path: "/", domain: settings.cookieDomain, secure: settings.cookieSecure });
  }
}

export function cookie(c: Context, name: string): string | undefined {
  return getCookie(c, name);
}

export function requireCsrf(c: Context): void {
  if (["GET", "HEAD", "OPTIONS"].includes(c.req.method)) return;
  const header = c.req.header("x-csrf-token");
  const token = cookie(c, settings.csrfCookie);
  if (!header || !token || sha256(header) !== sha256(token)) throw new HttpError(403, "Invalid CSRF token");
}

export class HttpError extends Error {
  constructor(public status: number, message: string, public body?: unknown) { super(message); }
}
