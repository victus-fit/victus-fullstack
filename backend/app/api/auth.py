from __future__ import annotations

import uuid
from datetime import timedelta
from typing import Any

from fastapi import APIRouter, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select

from app.api.deps import CsrfGuard, CurrentUser, DbSession, SettingsDep
from app.core.cookies import clear_auth_cookies, set_auth_cookies
from app.core.security import create_jwt, hash_password, hash_secret, new_secret_token, utcnow, verify_password
from app.models import AppConversation, AppMessage, AppUser, AuthIdentity, OnboardingState, UserSettings, WebSession
from app.schemas import AuthResponse, LoginRequest, RegisterRequest, SessionResponse, UserPublic

router = APIRouter(prefix="/auth", tags=["auth"])
oauth = None
_google_registered = False


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _is_demo_user(user: AppUser, settings: SettingsDep) -> bool:
    return _normalize_email(user.primary_email) == _normalize_email(settings.demo_user_email)


def _public_user(user: AppUser, settings: SettingsDep) -> UserPublic:
    return UserPublic(
        user_id=user.user_id,
        primary_email=user.primary_email,
        display_name=user.display_name,
        avatar_url=user.avatar_url,
        status=user.status,
        locale=user.locale,
        timezone=user.timezone,
        is_demo=_is_demo_user(user, settings),
    )


def _request_hashes(request: Request) -> tuple[str | None, str | None]:
    client_host = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    return (hash_secret(client_host) if client_host else None, hash_secret(user_agent) if user_agent else None)


async def _ensure_user_defaults(db: DbSession, user: AppUser) -> None:
    settings = await db.get(UserSettings, user.user_id)
    if settings is None:
        db.add(UserSettings(user_id=user.user_id, theme="dark"))
    onboarding = await db.get(OnboardingState, user.user_id)
    if onboarding is None:
        db.add(OnboardingState(user_id=user.user_id, status="not_started"))


async def _issue_session(db: DbSession, request: Request, response: Response, user: AppUser, settings: SettingsDep) -> str:
    refresh_jti = new_secret_token()
    csrf_token = new_secret_token()
    ip_hash, user_agent_hash = _request_hashes(request)
    session = WebSession(
        user_id=user.user_id,
        session_hash=hash_secret(refresh_jti),
        ip_hash=ip_hash,
        user_agent_hash=user_agent_hash,
        expires_at=utcnow() + timedelta(days=settings.refresh_token_days),
    )
    db.add(session)
    await db.flush()

    access_token = create_jwt(user_id=user.user_id, session_id=session.session_id, token_type="access")
    refresh_token = create_jwt(user_id=user.user_id, session_id=session.session_id, token_type="refresh", jti=refresh_jti)
    set_auth_cookies(
        response,
        settings=settings,
        access_token=access_token,
        refresh_token=refresh_token,
        csrf_token=csrf_token,
    )
    return csrf_token


async def ensure_demo_user(db: DbSession, settings: SettingsDep) -> AppUser:
    email = _normalize_email(settings.demo_user_email)
    user = await db.scalar(select(AppUser).where(AppUser.primary_email == email))
    if user is None:
        user = AppUser(
            primary_email=email,
            display_name=settings.demo_user_display_name,
            avatar_url=None,
            locale="es-CL",
            timezone="America/Santiago",
            status="active",
        )
        db.add(user)
        await db.flush()

    identity = await db.scalar(
        select(AuthIdentity).where(AuthIdentity.provider == "email_password", AuthIdentity.provider_subject == email)
    )
    if identity is None:
        db.add(
            AuthIdentity(
                user_id=user.user_id,
                provider="email_password",
                provider_subject=email,
                email=email,
                email_verified=True,
                password_hash=hash_password(settings.demo_user_password),
                metadata_json={"demo": True, "read_only": True},
            )
        )
    else:
        identity.password_hash = hash_password(settings.demo_user_password)
        identity.email_verified = True
        identity.metadata_json = {**(identity.metadata_json or {}), "demo": True, "read_only": True}

    await _ensure_user_defaults(db, user)
    await ensure_demo_conversations(db, user)
    return user


async def ensure_demo_conversations(db: DbSession, user: AppUser) -> None:
    existing = await db.scalar(select(AppConversation.conversation_id).where(AppConversation.user_id == user.user_id).limit(1))
    if existing is not None:
        return

    conversation = AppConversation(
        user_id=user.user_id,
        workspace_id="chat",
        title="Revisión inicial de dieta y biometrics",
        agent_conversation_id=f"demo-{uuid.uuid4()}",
        pinned=True,
    )
    db.add(conversation)
    await db.flush()

    db.add_all([
        AppMessage(
            conversation_id=conversation.conversation_id,
            user_id=user.user_id,
            role="user",
            status="completed",
            content_text="Quiero entender si mi dieta y sueño están bien para bajar un poco de peso sin perder energía.",
            metadata_json={"demo": True},
        ),
        AppMessage(
            conversation_id=conversation.conversation_id,
            user_id=user.user_id,
            role="assistant",
            status="completed",
            content_text=(
                "Para este perfil demo, el peso está estable con leve descenso semanal, el sueño se mantiene cerca "
                "de 7 horas y la adherencia está sobre 80%. La primera recomendación sería mantener proteína diaria, "
                "evitar cambios agresivos y usar las métricas de Biometrics como control de energía y recuperación."
            ),
            metadata_json={"demo": True, "source": "seeded_demo_thread"},
        ),
    ])


def _google_client(settings: SettingsDep):
    global oauth, _google_registered
    if not settings.google_auth_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.",
        )
    if oauth is None:
        try:
            from authlib.integrations.starlette_client import OAuth
        except ModuleNotFoundError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Google OAuth dependency authlib is not installed in the backend image.",
            ) from exc
        oauth = OAuth()
    if not _google_registered:
        oauth.register(
            name="google",
            client_id=settings.google_client_id,
            client_secret=settings.google_client_secret,
            server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
            client_kwargs={"scope": "openid email profile"},
        )
        _google_registered = True
    return oauth.google


def _redirect_uri(request: Request, settings: SettingsDep) -> str:
    if settings.google_redirect_uri:
        return settings.google_redirect_uri
    return str(request.url_for("google_callback"))


async def _extract_google_userinfo(google: Any, request: Request) -> dict[str, Any]:
    try:
        token = await google.authorize_access_token(request)
    except Exception as exc:
        error = getattr(exc, "error", exc.__class__.__name__)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Google OAuth failed: {error}") from exc

    userinfo = token.get("userinfo")
    if userinfo:
        return dict(userinfo)

    response = await google.get("https://openidconnect.googleapis.com/v1/userinfo", token=token)
    data = response.json()
    if not data:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Google did not return user info")
    return dict(data)


async def _upsert_google_user(db: DbSession, userinfo: dict[str, Any]) -> AppUser:
    subject = str(userinfo.get("sub") or "").strip()
    email = _normalize_email(str(userinfo.get("email") or ""))
    if not subject or not email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Google profile is missing subject or email")

    identity = await db.scalar(select(AuthIdentity).where(AuthIdentity.provider == "google", AuthIdentity.provider_subject == subject))
    if identity is not None:
        user = await db.get(AppUser, identity.user_id)
        if user is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Linked user no longer exists")
        identity.email = email
        identity.email_verified = bool(userinfo.get("email_verified", False))
        identity.metadata_json = {"google": {k: userinfo.get(k) for k in ["name", "picture", "locale"] if userinfo.get(k)}}
        user.display_name = user.display_name or userinfo.get("name")
        user.avatar_url = user.avatar_url or userinfo.get("picture")
        await _ensure_user_defaults(db, user)
        return user

    user = await db.scalar(select(AppUser).where(AppUser.primary_email == email))
    if user is None:
        user = AppUser(
            primary_email=email,
            display_name=userinfo.get("name") or email.split("@")[0],
            avatar_url=userinfo.get("picture"),
            locale=userinfo.get("locale") or "es-CL",
            timezone="America/Santiago",
            status="active",
        )
        db.add(user)
        await db.flush()

    db.add(
        AuthIdentity(
            user_id=user.user_id,
            provider="google",
            provider_subject=subject,
            email=email,
            email_verified=bool(userinfo.get("email_verified", False)),
            password_hash=None,
            metadata_json={"google": {k: userinfo.get(k) for k in ["name", "picture", "locale"] if userinfo.get(k)}},
        )
    )
    await _ensure_user_defaults(db, user)
    return user


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, request: Request, response: Response, db: DbSession, settings: SettingsDep) -> AuthResponse:
    email = _normalize_email(str(payload.email))
    if email == _normalize_email(settings.demo_user_email):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Demo account already exists. Use Entrar como demo.")

    existing = await db.scalar(select(AppUser).where(AppUser.primary_email == email))
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = AppUser(primary_email=email, display_name=payload.display_name)
    db.add(user)
    await db.flush()

    identity = AuthIdentity(
        user_id=user.user_id,
        provider="email_password",
        provider_subject=email,
        email=email,
        email_verified=False,
        password_hash=hash_password(payload.password),
    )
    db.add(identity)
    await _ensure_user_defaults(db, user)

    csrf_token = await _issue_session(db, request, response, user, settings)
    await db.commit()
    await db.refresh(user)
    return AuthResponse(user=_public_user(user, settings), csrf_token=csrf_token)


@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginRequest, request: Request, response: Response, db: DbSession, settings: SettingsDep) -> AuthResponse:
    email = _normalize_email(str(payload.email))
    identity = await db.scalar(
        select(AuthIdentity).where(AuthIdentity.provider == "email_password", AuthIdentity.provider_subject == email)
    )
    if identity is None or identity.password_hash is None or not verify_password(payload.password, identity.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    user = await db.get(AppUser, identity.user_id)
    if user is None or user.status != "active":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Inactive user")

    csrf_token = await _issue_session(db, request, response, user, settings)
    await db.commit()
    return AuthResponse(user=_public_user(user, settings), csrf_token=csrf_token)


@router.post("/demo", response_model=AuthResponse)
async def login_demo(request: Request, response: Response, db: DbSession, settings: SettingsDep) -> AuthResponse:
    user = await ensure_demo_user(db, settings)
    csrf_token = await _issue_session(db, request, response, user, settings)
    await db.commit()
    await db.refresh(user)
    return AuthResponse(user=_public_user(user, settings), csrf_token=csrf_token)


@router.get("/google/start")
async def google_start(request: Request, settings: SettingsDep):
    google = _google_client(settings)
    return await google.authorize_redirect(request, _redirect_uri(request, settings))


@router.get("/google/callback", name="google_callback")
async def google_callback(request: Request, db: DbSession, settings: SettingsDep):
    google = _google_client(settings)
    userinfo = await _extract_google_userinfo(google, request)
    user = await _upsert_google_user(db, userinfo)
    response = RedirectResponse(url=f"{settings.frontend_origin}/app", status_code=status.HTTP_302_FOUND)
    await _issue_session(db, request, response, user, settings)
    await db.commit()
    return response


@router.post("/refresh", response_model=AuthResponse)
async def refresh(request: Request, response: Response, db: DbSession, settings: SettingsDep) -> AuthResponse:
    from app.core.security import decode_jwt

    token = request.cookies.get(settings.refresh_cookie_name)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing refresh token")

    payload = decode_jwt(token, expected_type="refresh")
    jti = payload.get("jti")
    if not jti:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    session = await db.get(WebSession, uuid.UUID(payload["sid"]))
    user = await db.get(AppUser, uuid.UUID(payload["sub"]))
    if session is None or user is None or session.user_id != user.user_id or session.status != "active":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Inactive session")

    if session.expires_at <= utcnow():
        session.status = "expired"
        await db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired")

    if session.session_hash != hash_secret(jti):
        session.status = "revoked"
        session.revoked_at = utcnow()
        await db.commit()
        clear_auth_cookies(response, settings=settings)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token reuse detected")

    refresh_jti = new_secret_token()
    csrf_token = new_secret_token()
    session.session_hash = hash_secret(refresh_jti)
    session.expires_at = utcnow() + timedelta(days=settings.refresh_token_days)
    access_token = create_jwt(user_id=user.user_id, session_id=session.session_id, token_type="access")
    refresh_token = create_jwt(user_id=user.user_id, session_id=session.session_id, token_type="refresh", jti=refresh_jti)
    set_auth_cookies(response, settings=settings, access_token=access_token, refresh_token=refresh_token, csrf_token=csrf_token)
    await db.commit()
    return AuthResponse(user=_public_user(user, settings), csrf_token=csrf_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(_csrf: CsrfGuard, current_user: CurrentUser, request: Request, response: Response, db: DbSession, settings: SettingsDep) -> Response:
    from app.core.security import decode_jwt

    token = request.cookies.get(settings.access_cookie_name)
    if token:
        payload = decode_jwt(token, expected_type="access")
        session = await db.get(WebSession, uuid.UUID(payload["sid"]))
        if session and session.user_id == current_user.user_id:
            session.status = "revoked"
            session.revoked_at = utcnow()
            await db.commit()
    clear_auth_cookies(response, settings=settings)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.get("/me", response_model=SessionResponse)
async def me(current_user: CurrentUser, settings: SettingsDep) -> SessionResponse:
    return SessionResponse(user=_public_user(current_user, settings), authenticated=True)
