# Victus WebApp

Monorepo V1 for the Victus web application.

The first face of the product is the public demo at `/`. Registration opens the protected app at `/app`, where the frontend talks to FastAPI using secure browser cookies.

## Stack

```txt
frontend/   Vite + React + TypeScript + Motion
backend/    FastAPI + SQLAlchemy async + Postgres
infra/      Docker Compose local development
scripts/    Professional up/down/logs/reset workflow
```

## What is included

- Public demo landing at `/`.
- Register and login screens.
- Protected `/app` workspace.
- Sidebar with Chat, Dietas, Biometrics, Profile and About.
- Collapsible sidebar.
- Dark/light mode.
- Chat animation demo.
- Backend-connected protected chat stream.
- FastAPI auth with HttpOnly cookies.
- Access and refresh JWTs.
- Refresh token rotation.
- CSRF token for unsafe requests.
- Postgres database model for the webapp.
- Docker Compose for frontend, backend and postgres.
- Operational script: `./scripts/victus`.

Payments are intentionally excluded.

## Run locally

```bash
./scripts/victus up
```

Open:

```txt
http://localhost:5173
```

Backend health:

```txt
http://localhost:8000/health
```

Backend OpenAPI:

```txt
http://localhost:8000/docs
```

## Stop

```bash
./scripts/victus down
```

## Logs

```bash
./scripts/victus logs
./scripts/victus logs backend
./scripts/victus logs frontend
./scripts/victus logs postgres
```

## Reset local development database

```bash
./scripts/victus reset
```

## Development auth flow

1. Open `http://localhost:5173`.
2. The public demo loads first.
3. Click `Registrarse`.
4. Use the prefilled local demo credentials or replace them.
5. After registration, the frontend navigates to `/app`.
6. `/app` uses `/api/chat/stream` with cookies and CSRF.

## Boundaries

The webapp database owns product-visible state: users, sessions, settings, workspaces, conversations, messages, artifacts, files and request logs.

The LangGraph agent database remains separate and owns events, turns, node runs and projections. This repo references the agent through logical identifiers only: `agent_user_id`, `agent_conversation_id`, and `agent_turn_id`.

## Production notes

Before a real deployment:

- Set `COOKIE_SECURE=true` behind HTTPS.
- Replace `ENABLE_DB_CREATE_ALL=true` with Alembic migrations.
- Add Google OAuth.
- Add rate limiting.
- Add request tracing and structured logging.
- Add reverse proxy/TLS.
- Connect `/api/chat/stream` to the real LangGraph service.

## V0.2.1 Docker frontend fix

The frontend Docker image now pins Node to `20.19.0-bookworm-slim`, uses `npm ci`, disables audit/fund/update-notifier during container builds, and forces the public npm registry. This avoids the npm 10.9.x Docker failure `Exit handler never called` and removes non-portable sandbox registry URLs from the lockfile.


## V0.2.2 backend + responsive fix

The backend container now starts through `backend/scripts/start.sh`. The script prints a redacted `DATABASE_URL`, waits for Docker DNS to resolve the Postgres service name, waits for port `5432`, and only then launches Uvicorn. This prevents FastAPI startup from failing with:

```txt
socket.gaierror: [Errno -2] Name or service not known
```

The expected Docker Compose database URL is:

```txt
postgresql+asyncpg://victus:victus@postgres:5432/victus_app
```

Inside Docker, the host must be `postgres`, because that is the Compose service name. When running the backend outside Docker, use `localhost` instead.

The frontend also includes mobile/responsive corrections:

- Sidebar is hidden as a drawer on small screens instead of moving above the chat.
- There is only one sidebar toggle, in the main header.
- The Victus compass mark keeps a fixed size during sidebar transitions.
- Workspace pages also expose the sidebar toggle on mobile.


## V0.3 — App Core Data UX

This version starts turning the protected app into a complete product shell before the LangGraph integration.

What was added:

- Persistent user metric entries in Postgres (`user_metric_entries`).
- Persistent user preference items in Postgres (`user_preference_items`).
- Protected endpoint: `GET /api/users/me/health-overview`.
- Protected write endpoints: `POST /api/users/me/metrics` and `POST /api/users/me/preferences`.
- Demo seed data per authenticated user when the overview is first opened.
- Biometrics dashboard with weight, sleep, energy and adherence charts.
- Diets dashboard with nutrition priorities, adherence trend and preference table.
- Profile dashboard with user identity, locale/timezone/status and stable preference memory.

The purpose is to make the webapp look and behave like a real product while keeping LangGraph behind a future `AgentGateway` boundary.

## V0.4 — App Core Persistence + Demo Profile + Google OAuth boundary

This version completes the first product core needed before wiring the real LangGraph service.

What was added:

- Real conversation history in the sidebar from Postgres.
- Selectable persisted threads with `/api/conversations` and `/api/conversations/{id}/messages`.
- New chat flow resets the local workspace without deleting prior persisted threads.
- `AgentGateway` interface with `MockAgentGateway` and `LangGraphHttpGateway` boundary stub.
- `/api/chat/stream` now logs `AgentRequest`, creates user/assistant messages, updates conversation timestamps and streams through the gateway boundary.
- Seeded read-only demo user: `demo@victus.health` / `victus-demo-2026`.
- Demo profile represents a normal adult male with standard weight and typical habits.
- Demo user gets seeded biometrics, diet preferences and one pinned conversation.
- Demo personal data writes are blocked with `403`.
- Register form now uses a valid public-style email domain to avoid the previous `422` from `EmailStr` rejecting `*.local`.
- Error rendering now shows Pydantic validation details clearly in the frontend.
- Google OAuth endpoints are present:
  - `GET /api/auth/google/start`
  - `GET /api/auth/google/callback`

### Google OAuth local setup

Create OAuth credentials in Google Cloud Console and set this redirect URI:

```txt
http://localhost:8000/api/auth/google/callback
```

Then update `.env`:

```txt
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback
```

Restart the backend:

```bash
./scripts/victus restart
```

If the variables are empty, the frontend button still appears, but the backend returns a clear `503` explaining that Google OAuth is not configured.
