# Victus Backend

FastAPI backend for Victus WebApp.

## Responsibilities

- User registration and login.
- HttpOnly cookie sessions.
- Access JWT and rotating refresh JWT.
- CSRF protection for unsafe browser requests.
- User settings.
- Workspaces.
- Conversations and messages.
- Chat streaming gateway.

## Run without Docker

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Use Docker Compose for the recommended local flow.

## Startup behavior

Docker starts the backend through `scripts/start.sh`. It waits for the Postgres service DNS name and port before launching Uvicorn. If the backend is run inside Compose, `DATABASE_URL` must use host `postgres`. If it is run directly on the host machine, use `localhost`.
