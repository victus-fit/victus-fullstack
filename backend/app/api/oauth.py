from __future__ import annotations

import base64
import hashlib
import re
import uuid
from datetime import timedelta
from urllib.parse import urlencode, urlparse

from fastapi import APIRouter, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse

from app.api.deps import DbSession, SettingsDep, get_current_user
from app.core.security import create_jwt, decode_jwt, hash_secret, new_secret_token, utcnow
from app.models import AppUser, OAuthAuthorizationCode, WebSession
from app.schemas import OAuthRevokeRequest, OAuthTokenRequest, OAuthTokenResponse

router = APIRouter(prefix="/oauth", tags=["oauth"])

CLI_CLIENT_ID = "victus-cli"
CLI_SCOPE = "openid profile email offline_access"
AUTH_CODE_TTL_MINUTES = 10
CLI_ACCESS_TOKEN_SECONDS = 3600
PKCE_VERIFIER_RE = re.compile(r"^[A-Za-z0-9._~-]{43,128}$")


def _oauth_error(status_code: int, error: str, description: str) -> HTTPException:
    return HTTPException(status_code=status_code, detail={"error": error, "error_description": description})


def _require_cli_client(client_id: str) -> None:
    if client_id != CLI_CLIENT_ID:
        raise _oauth_error(status.HTTP_400_BAD_REQUEST, "invalid_client", "Unknown OAuth client")


def _normalize_scope(scope: str | None) -> str:
    requested = [part for part in (scope or "").split() if part]
    allowed = CLI_SCOPE.split()
    if not requested:
        return CLI_SCOPE
    unknown = [part for part in requested if part not in allowed]
    if unknown:
        raise _oauth_error(status.HTTP_400_BAD_REQUEST, "invalid_scope", "Unsupported OAuth scope")
    return " ".join(part for part in allowed if part in requested)


def _validate_loopback_redirect_uri(redirect_uri: str) -> str:
    parsed = urlparse(redirect_uri)
    if parsed.scheme != "http" or parsed.hostname != "127.0.0.1":
        raise _oauth_error(status.HTTP_400_BAD_REQUEST, "invalid_request", "redirect_uri must use http://127.0.0.1")
    if parsed.port is None or parsed.port < 1 or parsed.port > 65535:
        raise _oauth_error(status.HTTP_400_BAD_REQUEST, "invalid_request", "redirect_uri must include a dynamic port")
    if parsed.path != "/callback" or parsed.query or parsed.fragment or parsed.username or parsed.password:
        raise _oauth_error(status.HTTP_400_BAD_REQUEST, "invalid_request", "redirect_uri must be /callback without query or fragment")
    return redirect_uri


def _validate_code_challenge(code_challenge: str | None, code_challenge_method: str | None) -> str:
    if not code_challenge:
        raise _oauth_error(status.HTTP_400_BAD_REQUEST, "invalid_request", "code_challenge is required")
    if code_challenge_method != "S256":
        raise _oauth_error(status.HTTP_400_BAD_REQUEST, "invalid_request", "code_challenge_method must be S256")
    return code_challenge


def _pkce_challenge(code_verifier: str) -> str:
    digest = hashlib.sha256(code_verifier.encode("ascii")).digest()
    return base64.urlsafe_b64encode(digest).decode("ascii").rstrip("=")


def _validate_code_verifier(code_verifier: str | None) -> str:
    if not code_verifier or not PKCE_VERIFIER_RE.match(code_verifier):
        raise _oauth_error(status.HTTP_400_BAD_REQUEST, "invalid_grant", "Invalid code_verifier")
    return code_verifier


async def _browser_user_or_redirect(request: Request, db: DbSession, settings: SettingsDep) -> AppUser | RedirectResponse:
    try:
        return await get_current_user(request, db, settings)
    except HTTPException:
        return_to = str(request.url)
        query = urlencode({"return_to": return_to})
        return RedirectResponse(url=f"{settings.frontend_origin}/login?{query}", status_code=status.HTTP_302_FOUND)


async def _issue_cli_tokens(db: DbSession, request: Request, user: AppUser, settings: SettingsDep) -> OAuthTokenResponse:
    refresh_jti = new_secret_token()
    client_host = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    session = WebSession(
        user_id=user.user_id,
        session_hash=hash_secret(refresh_jti),
        ip_hash=hash_secret(client_host) if client_host else None,
        user_agent_hash=hash_secret(user_agent) if user_agent else None,
        expires_at=utcnow() + timedelta(days=settings.refresh_token_days),
    )
    db.add(session)
    await db.flush()

    access_token = create_jwt(
        user_id=user.user_id,
        session_id=session.session_id,
        token_type="access",
        expires_delta=timedelta(seconds=CLI_ACCESS_TOKEN_SECONDS),
    )
    refresh_token = create_jwt(user_id=user.user_id, session_id=session.session_id, token_type="refresh", jti=refresh_jti)
    return OAuthTokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=CLI_ACCESS_TOKEN_SECONDS,
        scope=CLI_SCOPE,
    )


@router.get("/authorize")
async def authorize(
    request: Request,
    db: DbSession,
    settings: SettingsDep,
    response_type: str,
    client_id: str,
    redirect_uri: str,
    state: str,
    code_challenge: str | None = None,
    code_challenge_method: str | None = None,
    scope: str | None = None,
):
    if response_type != "code":
        raise _oauth_error(status.HTTP_400_BAD_REQUEST, "unsupported_response_type", "Only response_type=code is supported")
    _require_cli_client(client_id)
    redirect_uri = _validate_loopback_redirect_uri(redirect_uri)
    granted_scope = _normalize_scope(scope)
    code_challenge = _validate_code_challenge(code_challenge, code_challenge_method)

    user_or_redirect = await _browser_user_or_redirect(request, db, settings)
    if isinstance(user_or_redirect, RedirectResponse):
        return user_or_redirect

    authorization_code = new_secret_token()
    db.add(
        OAuthAuthorizationCode(
            code_hash=hash_secret(authorization_code),
            client_id=client_id,
            user_id=user_or_redirect.user_id,
            redirect_uri=redirect_uri,
            scope=granted_scope,
            code_challenge=code_challenge,
            code_challenge_method="S256",
            expires_at=utcnow() + timedelta(minutes=AUTH_CODE_TTL_MINUTES),
        )
    )
    await db.commit()

    separator = "&" if "?" in redirect_uri else "?"
    return RedirectResponse(
        url=f"{redirect_uri}{separator}{urlencode({'code': authorization_code, 'state': state})}",
        status_code=status.HTTP_302_FOUND,
    )


async def _exchange_authorization_code(
    payload: OAuthTokenRequest,
    request: Request,
    db: DbSession,
    settings: SettingsDep,
) -> OAuthTokenResponse:
    if not payload.code or not payload.redirect_uri:
        raise _oauth_error(status.HTTP_400_BAD_REQUEST, "invalid_request", "code and redirect_uri are required")
    code_verifier = _validate_code_verifier(payload.code_verifier)
    redirect_uri = _validate_loopback_redirect_uri(payload.redirect_uri)

    authorization = await db.get(OAuthAuthorizationCode, hash_secret(payload.code))
    if authorization is None:
        raise _oauth_error(status.HTTP_400_BAD_REQUEST, "invalid_grant", "Invalid authorization code")
    if authorization.used_at is not None:
        raise _oauth_error(status.HTTP_400_BAD_REQUEST, "invalid_grant", "Authorization code was already used")
    if authorization.expires_at <= utcnow():
        raise _oauth_error(status.HTTP_400_BAD_REQUEST, "invalid_grant", "Authorization code expired")
    if authorization.client_id != payload.client_id or authorization.redirect_uri != redirect_uri:
        raise _oauth_error(status.HTTP_400_BAD_REQUEST, "invalid_grant", "Authorization code does not match request")
    if authorization.code_challenge_method != "S256" or _pkce_challenge(code_verifier) != authorization.code_challenge:
        raise _oauth_error(status.HTTP_400_BAD_REQUEST, "invalid_grant", "PKCE verification failed")

    user = await db.get(AppUser, authorization.user_id)
    if user is None or user.status != "active":
        raise _oauth_error(status.HTTP_400_BAD_REQUEST, "invalid_grant", "User is not active")

    authorization.used_at = utcnow()
    token_response = await _issue_cli_tokens(db, request, user, settings)
    token_response.scope = authorization.scope
    await db.commit()
    return token_response


async def _refresh_access_token(payload: OAuthTokenRequest, db: DbSession, settings: SettingsDep) -> OAuthTokenResponse:
    if not payload.refresh_token:
        raise _oauth_error(status.HTTP_400_BAD_REQUEST, "invalid_request", "refresh_token is required")
    try:
        token_payload = decode_jwt(payload.refresh_token, expected_type="refresh")
        session_id = uuid.UUID(str(token_payload["sid"]))
        user_id = uuid.UUID(str(token_payload["sub"]))
    except (HTTPException, KeyError, TypeError, ValueError) as exc:
        raise _oauth_error(status.HTTP_400_BAD_REQUEST, "invalid_grant", "Invalid refresh token") from exc

    jti = token_payload.get("jti")
    if not jti:
        raise _oauth_error(status.HTTP_400_BAD_REQUEST, "invalid_grant", "Invalid refresh token")

    session = await db.get(WebSession, session_id)
    user = await db.get(AppUser, user_id)
    if session is None or user is None or session.user_id != user.user_id or user.status != "active":
        raise _oauth_error(status.HTTP_400_BAD_REQUEST, "invalid_grant", "Inactive session")
    if session.expires_at <= utcnow():
        session.status = "expired"
        await db.commit()
        raise _oauth_error(status.HTTP_400_BAD_REQUEST, "invalid_grant", "Session expired")
    if session.status != "active":
        raise _oauth_error(status.HTTP_400_BAD_REQUEST, "invalid_grant", "Inactive session")
    if session.session_hash != hash_secret(str(jti)):
        session.status = "revoked"
        session.revoked_at = utcnow()
        await db.commit()
        raise _oauth_error(status.HTTP_400_BAD_REQUEST, "invalid_grant", "Refresh token reuse detected")

    refresh_jti = new_secret_token()
    session.session_hash = hash_secret(refresh_jti)
    session.expires_at = utcnow() + timedelta(days=settings.refresh_token_days)
    access_token = create_jwt(
        user_id=user.user_id,
        session_id=session.session_id,
        token_type="access",
        expires_delta=timedelta(seconds=CLI_ACCESS_TOKEN_SECONDS),
    )
    refresh_token = create_jwt(user_id=user.user_id, session_id=session.session_id, token_type="refresh", jti=refresh_jti)
    await db.commit()
    return OAuthTokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=CLI_ACCESS_TOKEN_SECONDS,
        scope=CLI_SCOPE,
    )


@router.post("/token", response_model=OAuthTokenResponse)
async def token(payload: OAuthTokenRequest, request: Request, db: DbSession, settings: SettingsDep) -> OAuthTokenResponse:
    _require_cli_client(payload.client_id)
    if payload.grant_type == "authorization_code":
        return await _exchange_authorization_code(payload, request, db, settings)
    if payload.grant_type == "refresh_token":
        return await _refresh_access_token(payload, db, settings)
    raise _oauth_error(status.HTTP_400_BAD_REQUEST, "unsupported_grant_type", "Unsupported grant_type")


@router.post("/revoke", status_code=status.HTTP_200_OK)
async def revoke(payload: OAuthRevokeRequest, db: DbSession) -> Response:
    _require_cli_client(payload.client_id)
    if payload.token_type_hint and payload.token_type_hint != "refresh_token":
        return Response(status_code=status.HTTP_200_OK)
    try:
        token_payload = decode_jwt(payload.token, expected_type="refresh")
        session_id = uuid.UUID(str(token_payload["sid"]))
    except (HTTPException, KeyError, TypeError, ValueError):
        return Response(status_code=status.HTTP_200_OK)

    session = await db.get(WebSession, session_id)
    if session is not None and session.status == "active":
        session.status = "revoked"
        session.revoked_at = utcnow()
        await db.commit()
    return Response(status_code=status.HTTP_200_OK)
