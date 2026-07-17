# Victus WebApp — Local Runbook

## Start

```bash
./scripts/victus up
```

## Stop

```bash
./scripts/victus down
```

## Logs

```bash
./scripts/victus logs
./scripts/victus logs backend
./scripts/victus logs auth-service
./scripts/victus logs frontend
./scripts/victus logs postgres
```

## Reset local database

```bash
./scripts/victus reset
```

## Open services

- Frontend: http://localhost:5173
- Backend health: http://localhost:8000/health
- Auth service health: http://localhost:8001/health
- Backend OpenAPI: http://localhost:8000/docs

## Google login with Better Auth

Set these values in `.env`:

```bash
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
BETTER_AUTH_URL=http://localhost:8001
VITE_AUTH_BASE_URL=http://localhost:8001
```

In Google Cloud Console, add this authorized redirect URI:

```text
http://localhost:8001/api/auth/callback/google
```

Then rebuild and start:

```bash
./scripts/victus up
```

The frontend login page uses Better Auth for Google sign-in, then the auth service creates a
FastAPI-compatible session cookie so the existing app APIs keep working.

If this is a fresh database, create Better Auth tables once:

```bash
cd auth-service
DATABASE_URL=postgresql://victus:victus@127.0.0.1:5432/victus_app \
SECRET_KEY=... \
BETTER_AUTH_URL=http://localhost:8001 \
GOOGLE_CLIENT_ID=... \
GOOGLE_CLIENT_SECRET=... \
npm run db:migrate
```
