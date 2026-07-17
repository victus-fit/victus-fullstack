from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import auth, chat, conversations, oauth, personal_data, users, v1, workspaces
from app.core.config import get_settings
from app.db import AsyncSessionLocal, create_database_schema, engine
from app.models import AppWorkspace

settings = get_settings()


async def seed_workspaces(session: AsyncSession) -> None:
    workspaces = [
        AppWorkspace(workspace_id="chat", label="Chat", route="/app/chat", icon="message-square-text", sort_order=10),
        AppWorkspace(workspace_id="diets", label="Dietas", route="/app/diets", icon="apple", sort_order=20),
        AppWorkspace(workspace_id="biometrics", label="Biometrics", route="/app/biometrics", icon="activity", sort_order=30),
        AppWorkspace(workspace_id="profile", label="Profile", route="/app/profile", icon="user-round", sort_order=40),
        AppWorkspace(workspace_id="about", label="About", route="/app/about", icon="file-text", sort_order=50),
    ]
    for workspace in workspaces:
        existing = await session.get(AppWorkspace, workspace.workspace_id)
        if existing is None:
            session.add(workspace)
    await session.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.enable_db_create_all:
        await create_database_schema()
        async with AsyncSessionLocal() as session:
            await seed_workspaces(session)
            await auth.ensure_demo_user(session, settings)
            await session.commit()
    yield


app = FastAPI(title=settings.app_name, version="0.4.0", lifespan=lifespan)

app.add_middleware(
    SessionMiddleware,
    secret_key=settings.secret_key,
    same_site=settings.cookie_samesite,
    https_only=settings.cookie_secure,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "X-CSRF-Token", "Authorization"],
    expose_headers=["X-Victus-Conversation-Id", "X-Victus-Agent-Turn-Id"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    return response


@app.get("/health")
async def health() -> dict[str, str]:
    async with engine.connect() as connection:
        await connection.execute(text("SELECT 1"))
    return {"status": "ok", "service": "victus-webapp-backend"}


app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(workspaces.router, prefix="/api")
app.include_router(conversations.router, prefix="/api")
app.include_router(personal_data.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(v1.router)
app.include_router(oauth.router)
