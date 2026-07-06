from __future__ import annotations

from datetime import timedelta

from fastapi import Response

from app.core.config import Settings


def _cookie_kwargs(settings: Settings, *, http_only: bool, max_age: int | None = None) -> dict:
    return {
        "httponly": http_only,
        "secure": settings.cookie_secure,
        "samesite": settings.cookie_samesite,
        "domain": settings.cookie_domain,
        "path": "/",
        "max_age": max_age,
    }


def set_auth_cookies(
    response: Response,
    *,
    settings: Settings,
    access_token: str,
    refresh_token: str,
    csrf_token: str,
) -> None:
    response.set_cookie(
        settings.access_cookie_name,
        access_token,
        **_cookie_kwargs(settings, http_only=True, max_age=settings.access_token_minutes * 60),
    )
    response.set_cookie(
        settings.refresh_cookie_name,
        refresh_token,
        **_cookie_kwargs(settings, http_only=True, max_age=int(timedelta(days=settings.refresh_token_days).total_seconds())),
    )
    response.set_cookie(
        settings.csrf_cookie_name,
        csrf_token,
        **_cookie_kwargs(settings, http_only=False, max_age=int(timedelta(days=settings.refresh_token_days).total_seconds())),
    )


def clear_auth_cookies(response: Response, *, settings: Settings) -> None:
    for cookie_name in (settings.access_cookie_name, settings.refresh_cookie_name, settings.csrf_cookie_name):
        response.delete_cookie(cookie_name, path="/", domain=settings.cookie_domain)
