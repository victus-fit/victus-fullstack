from __future__ import annotations

import uuid
from datetime import timedelta
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.security import decode_jwt, hash_secret, utcnow
from app.db import get_db
from app.models import AppUser, WebSession

DbSession = Annotated[AsyncSession, Depends(get_db)]
SettingsDep = Annotated[Settings, Depends(get_settings)]


async def get_current_user(request: Request, db: DbSession, settings: SettingsDep) -> AppUser:
    token = request.cookies.get(settings.access_cookie_name)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing session")

    payload = decode_jwt(token, expected_type="access")
    try:
        user_id = uuid.UUID(payload["sub"])
        session_id = uuid.UUID(payload["sid"])
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session identifiers") from exc

    user = await db.get(AppUser, user_id)
    session = await db.get(WebSession, session_id)

    if user is None or user.status != "active":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Inactive user")

    if session is None or session.user_id != user.user_id or session.status != "active":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Inactive session")

    if session.expires_at <= utcnow():
        session.status = "expired"
        await db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired")

    user.last_seen_at = utcnow()
    await db.commit()
    return user


CurrentUser = Annotated[AppUser, Depends(get_current_user)]


def require_csrf(request: Request, settings: SettingsDep) -> None:
    if request.method.upper() in {"GET", "HEAD", "OPTIONS"}:
        return

    header_token = request.headers.get("x-csrf-token")
    cookie_token = request.cookies.get(settings.csrf_cookie_name)
    if not header_token or not cookie_token or not hash_secret(header_token) == hash_secret(cookie_token):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid CSRF token")


CsrfGuard = Annotated[None, Depends(require_csrf)]
