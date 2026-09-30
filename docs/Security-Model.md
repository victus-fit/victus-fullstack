# Victus security model

## Current controls

- Access and refresh JWTs are stored in HttpOnly cookies.
- Refresh tokens are rotated and backed by a server-side `web_sessions` row.
- The backend stores only a hash of the refresh token identifier.
- Browser JavaScript never receives the JWT value.
- Unsafe browser requests send an `X-CSRF-Token` header matching a non-HttpOnly CSRF cookie.
- CORS allows credentials only from configured frontend origins.
- Password identities are hashed with Argon2 in the unified TypeScript backend.
- The webapp database uses logical references to the agent database, not cross-db foreign keys.
- Local dev-token issuance is disabled by default, registers no route while disabled, and fails startup if enabled outside `local`, `development`, or `test`.
- Dev tokens use the normal access-token signer and an active short-lived database session; they provide no refresh token or client-selected identity.

## Production changes before launch

- Set `COOKIE_SECURE=true` behind HTTPS.
- Replace startup schema creation with versioned PostgreSQL migrations.
- Add rate limits and request quotas.
- Add structured logs and tracing.
- Add file scanning before enabling uploads.
