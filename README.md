# Victus fullstack

Victus is a diet and wellbeing web product with an authenticated React experience, a TypeScript product API, PostgreSQL persistence, and a controlled boundary to the external Victus Agent.

The canonical repository map, runtime flows, frontend routes, and linked API catalog are in [`docs/Overview.md`](docs/Overview.md).

## Quick start

```bash
./scripts/victus up
```

Open `http://localhost:5173`. The backend health endpoint is `http://localhost:8000/health`.

Use the local runbook for logs, database reset, and Google login configuration: [`docs/Runbook.md`](docs/Runbook.md).

## Repository areas

- `frontend/`: React, TypeScript, Vite, and product UI.
- `backend/`: unified TypeScript/Hono backend.
- `contracts/`: stable cross-component JSON contracts.
- `docs/`: architecture, schema, security, design, decisions, and operations.

## Documentation

- [Repository overview and API routes](docs/Overview.md)
- [Architecture](docs/Architecture.md)
- [PostgreSQL schema](docs/PostgreSQL-Schema.md)
- [Security model](docs/Security-Model.md)
- [Local runbook](docs/Runbook.md)
- [Frontend design system](docs/design/VICTUS-UI.md)
- [Architecture decisions](docs/adr/)

## Ownership boundary

This repository owns the browser product, authentication/session boundary, product API, and product-visible PostgreSQL data. Victus Agent remains a separate system responsible for graph execution and internal agent state.
