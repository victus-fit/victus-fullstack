from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.api.deps import CsrfGuard, CurrentUser, DbSession
from app.models import UserSettings
from app.schemas import UserSettingsResponse, UserSettingsUpdate

router = APIRouter(prefix="/users", tags=["users"])


def _settings_response(settings: UserSettings) -> UserSettingsResponse:
    return UserSettingsResponse(
        theme=settings.theme,
        sidebar_collapsed=settings.sidebar_collapsed,
        default_workspace_id=settings.default_workspace_id,
        density=settings.density,
        preferred_language=settings.preferred_language,
        ui_preferences=settings.ui_preferences,
    )


@router.get("/me/settings", response_model=UserSettingsResponse)
async def get_my_settings(current_user: CurrentUser, db: DbSession) -> UserSettingsResponse:
    settings = await db.get(UserSettings, current_user.user_id)
    if settings is None:
        settings = UserSettings(user_id=current_user.user_id)
        db.add(settings)
        await db.commit()
        await db.refresh(settings)
    return _settings_response(settings)


@router.patch("/me/settings", response_model=UserSettingsResponse)
async def update_my_settings(
    payload: UserSettingsUpdate,
    _csrf: CsrfGuard,
    current_user: CurrentUser,
    db: DbSession,
) -> UserSettingsResponse:
    settings = await db.get(UserSettings, current_user.user_id)
    if settings is None:
        settings = UserSettings(user_id=current_user.user_id)
        db.add(settings)

    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        if value is not None:
            setattr(settings, field, value)

    await db.commit()
    await db.refresh(settings)
    return _settings_response(settings)
