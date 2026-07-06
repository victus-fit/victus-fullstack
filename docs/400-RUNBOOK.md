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
- Backend OpenAPI: http://localhost:8000/docs
