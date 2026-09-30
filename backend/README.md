# Victus backend

Unified TypeScript/Hono backend for the Victus web application. See the [repository overview](../docs/Overview.md) and [ADR 003](../docs/adr/003-unified-typescript-backend.md).

## Responsibilities

- User registration, login, and Google identity integration.
- HttpOnly cookie sessions.
- Access JWT and rotating refresh JWT.
- CSRF protection for unsafe browser requests.
- User settings.
- Workspaces.
- Conversations and messages.
- Chat streaming gateway.

## Run without Docker

```bash
npm install
npm run dev
```

Use Docker Compose for the recommended local flow.

## Startup behavior

Docker starts the backend through `scripts/start.sh`. It waits for PostgreSQL, applies Better Auth migrations, and starts the Hono server. Inside Compose, `DATABASE_URL` must use host `postgres`; when running directly on the host, use `localhost`.

The complete linked route catalog is in [`docs/Overview.md`](../docs/Overview.md#api-routes).
