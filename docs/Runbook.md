# Victus local runbook

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
- Phoenix: http://localhost:6006

## Phoenix chat observability

The webapp backend can emit Phoenix/OpenTelemetry spans for `/api/chat/stream`. Local Compose uses
the Phoenix service name as the collector host:

```bash
PHOENIX_TRACING_ENABLED=true
PHOENIX_COLLECTOR_ENDPOINT=http://victus-phoenix:6006
PHOENIX_PROJECT_NAME=victus-local
```

For a local browser or host process, use `http://localhost:6006` instead of the Compose service
name. Set `PHOENIX_API_KEY` only for authenticated Phoenix deployments.

After changing these values, rebuild the backend:

```bash
docker compose up -d --build victus-backend
```

In Phoenix, inspect project `victus-local`. A successful chat turn is one trace with this shape:

- `webapp.chat.stream`
- `gateway.agent.request`
- `agent.http.chat`
- LangGraph nodes such as `agent_decision`, `execute_tool`, and `clarification_interrupt`
- `gateway.stream.finalize`

Phoenix keeps LLM inputs, messages, and outputs visible locally. Read the concise `victus.*`
attributes on each node; use the agent's authenticated debug route or local Phoenix lookup scripts
when deeper forensic detail is required.

## Google login with Better Auth

Set these values in `.env`:

```bash
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
BETTER_AUTH_URL=http://localhost:8000
VITE_AUTH_BASE_URL=http://localhost:8000
```

In Google Cloud Console, add this authorized redirect URI:

```text
http://localhost:8000/api/auth/callback/google
```

Then rebuild and start:

```bash
./scripts/victus up
```

The frontend login page uses Better Auth for Google sign-in, then the auth boundary creates a
Victus application session so the existing product APIs keep working.

The unified backend applies the Better Auth migrations during container startup. To run the migration manually from `backend/`:

```bash
cd backend
DATABASE_URL=postgresql://victus:victus@127.0.0.1:5432/victus_app \
SECRET_KEY=... \
BETTER_AUTH_URL=http://localhost:8000 \
GOOGLE_CLIENT_ID=... \
GOOGLE_CLIENT_SECRET=... \
npm run db:migrate:auth
```

## Local development access token

Follow [Dev testing](runbooks/dev-testing.md) to obtain a short-lived local token, validate its identity, and send an authenticated request to `victus-agent`.

The route remains disabled by default, and the backend refuses to start if dev auth is enabled outside `local`, `development`, or `test`.

## Food search

`GET /api/foods/search` uses PostgreSQL lexical matching over the English `Name` field in FoodB.
It does not use embeddings, USDA aliases, language fallback, or portion tables.

Materialize the FoodB catalog and its normalized nutrients:

```bash
npm run materialize:foodb-content --prefix backend
```

To prepare `market_acquistion` records for human/LLM review without importing them, generate a
deduplicated CSV. It groups by normalized description and category, and chooses the representative
with the most nutrient rows; publication date and FDC ID break ties. The source CSVs remain unchanged.

```bash
npm run export:market-acquisition-review --prefix backend
```

The output is `data/FoodData_Central_csv_2026-04-30/_review/market_acquisition_deduplicated_for_review.csv`.
Fill only `display_name_es` and `aliases_es`; do not change the canonical FDC ID or source description.
