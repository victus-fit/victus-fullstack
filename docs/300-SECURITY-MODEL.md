# Victus WebApp — Security Model

## V1 choices

- Access and refresh JWTs are stored in HttpOnly cookies.
- Refresh tokens are rotated and backed by a server-side `web_sessions` row.
- The backend stores only a hash of the refresh token identifier.
- Browser JavaScript never receives the JWT value.
- Unsafe browser requests send an `X-CSRF-Token` header matching a non-HttpOnly CSRF cookie.
- CORS allows credentials only from configured frontend origins.
- Passwords are hashed with `pwdlib.PasswordHash.recommended()`.
- The webapp database uses logical references to the agent database, not cross-db foreign keys.

## Production changes before launch

- Set `COOKIE_SECURE=true` behind HTTPS.
- Replace `ENABLE_DB_CREATE_ALL=true` with Alembic migrations.
- Add Google OAuth identity flow.
- Add rate limits and request quotas.
- Add structured logs and tracing.
- Add file scanning before enabling uploads.
