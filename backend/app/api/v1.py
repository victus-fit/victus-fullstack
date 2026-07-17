from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy import select

from app.api.deps import DbSession
from app.core.security import decode_jwt, utcnow
from app.models import AppUser, UserPreferenceItem, WebSession
from app.schemas import RelayMeResponse, RelayProfile

router = APIRouter(prefix="/v1", tags=["mcp-relay"])

UNAUTHORIZED_BODY = {"error": "unauthorized", "message": "Invalid or expired token"}
SERVER_ERROR_BODY = {"error": "server_error", "message": "Unable to load profile"}


class BearerAuthError(Exception):
    pass


def _unauthorized_response() -> JSONResponse:
    return JSONResponse(status_code=status.HTTP_401_UNAUTHORIZED, content=UNAUTHORIZED_BODY)


def _server_error_response() -> JSONResponse:
    return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content=SERVER_ERROR_BODY)


def _extract_bearer_token(request: Request) -> str:
    authorization = request.headers.get("authorization")
    if not authorization:
        raise BearerAuthError

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        raise BearerAuthError
    return token.strip()


async def _get_bearer_user(request: Request, db: DbSession) -> AppUser:
    token = _extract_bearer_token(request)
    try:
        payload = decode_jwt(token, expected_type="access")
        user_id = uuid.UUID(str(payload["sub"]))
        session_id = uuid.UUID(str(payload["sid"]))
    except (HTTPException, KeyError, TypeError, ValueError) as exc:
        raise BearerAuthError from exc

    user = await db.get(AppUser, user_id)
    session = await db.get(WebSession, session_id)
    if user is None or user.status != "active":
        raise BearerAuthError
    if session is None or session.user_id != user.user_id or session.status != "active":
        raise BearerAuthError
    if session.expires_at <= utcnow():
        session.status = "expired"
        await db.commit()
        raise BearerAuthError

    user.last_seen_at = utcnow()
    await db.commit()
    return user


def _append_unique(target: list[str], value: str) -> None:
    normalized = value.strip()
    if normalized and normalized not in target:
        target.append(normalized)


def _profile_from_preferences(items: list[UserPreferenceItem]) -> RelayProfile:
    goals: list[str] = []
    restrictions: list[str] = []
    preferences: list[str] = []
    goal_categories = {"goal", "goals", "objective", "objectives"}
    restriction_categories = {"restriction", "restrictions", "allergy", "allergies", "medical"}

    for item in items:
        category = item.category.strip().lower()
        value = item.value.strip() or item.label.strip()
        if category in goal_categories:
            _append_unique(goals, value)
        elif category in restriction_categories:
            _append_unique(restrictions, value)
        else:
            _append_unique(preferences, value)

    return RelayProfile(goals=goals, restrictions=restrictions, preferences=preferences)


async def _load_profile(db: DbSession, user: AppUser) -> RelayProfile:
    preferences = (
        await db.scalars(
            select(UserPreferenceItem)
            .where(UserPreferenceItem.user_id == user.user_id, UserPreferenceItem.status == "active")
            .order_by(UserPreferenceItem.category, UserPreferenceItem.label)
        )
    ).all()
    return _profile_from_preferences(list(preferences))


@router.get("/me", response_model=RelayMeResponse)
async def relay_me(request: Request, db: DbSession):
    try:
        user = await _get_bearer_user(request, db)
        profile = await _load_profile(db, user)
    except BearerAuthError:
        return _unauthorized_response()
    except Exception:
        return _server_error_response()

    display_name = user.display_name or user.primary_email.split("@")[0]
    return RelayMeResponse(
        id=str(user.user_id),
        email=user.primary_email,
        name=display_name,
        display_name=display_name,
        plan="free",
        profile=profile,
    )
