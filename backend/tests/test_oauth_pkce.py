from __future__ import annotations

import unittest
import uuid
from datetime import timedelta
from pathlib import Path
import sys
from urllib.parse import parse_qs, urlencode, urlparse

from fastapi import HTTPException
from starlette.requests import Request

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.api.oauth import _pkce_challenge, authorize, revoke, token  # noqa: E402
from app.core.config import get_settings  # noqa: E402
from app.core.security import create_jwt, hash_secret, utcnow  # noqa: E402
from app.models import AppUser, OAuthAuthorizationCode, WebSession  # noqa: E402
from app.schemas import OAuthRevokeRequest, OAuthTokenRequest  # noqa: E402


class FakeDb:
    def __init__(self):
        self.users: dict[uuid.UUID, AppUser] = {}
        self.sessions: dict[uuid.UUID, WebSession] = {}
        self.authorization_codes: dict[str, OAuthAuthorizationCode] = {}
        self.added: list[object] = []

    async def get(self, model, key):
        if model is AppUser:
            return self.users.get(key)
        if model is WebSession:
            return self.sessions.get(key)
        if model is OAuthAuthorizationCode:
            return self.authorization_codes.get(key)
        return None

    def add(self, item):
        self.added.append(item)
        if isinstance(item, AppUser):
            self.users[item.user_id] = item
        if isinstance(item, WebSession):
            if item.session_id is None:
                item.session_id = uuid.uuid4()
            self.sessions[item.session_id] = item
        if isinstance(item, OAuthAuthorizationCode):
            self.authorization_codes[item.code_hash] = item

    async def flush(self):
        for item in self.added:
            if isinstance(item, WebSession) and item.session_id is None:
                item.session_id = uuid.uuid4()

    async def commit(self):
        return None


async def empty_receive():
    return {"type": "http.request", "body": b"", "more_body": False}


def make_request(*, query: dict[str, str] | None = None, cookies: dict[str, str] | None = None) -> Request:
    headers: list[tuple[bytes, bytes]] = [(b"host", b"testserver")]
    if cookies:
        headers.append((b"cookie", "; ".join(f"{key}={value}" for key, value in cookies.items()).encode("ascii")))
    scope = {
        "type": "http",
        "method": "GET",
        "path": "/oauth/authorize",
        "root_path": "",
        "scheme": "http",
        "server": ("testserver", 80),
        "client": ("127.0.0.1", 50100),
        "headers": headers,
        "query_string": urlencode(query or {}).encode("ascii"),
    }
    return Request(scope, empty_receive)


def make_user() -> AppUser:
    return AppUser(
        user_id=uuid.uuid4(),
        primary_email="carlos@example.com",
        display_name="Carlos",
        status="active",
        locale="es-CL",
        timezone="America/Santiago",
    )


def make_session(user: AppUser, *, refresh_jti: str = "refresh-jti") -> WebSession:
    return WebSession(
        session_id=uuid.uuid4(),
        user_id=user.user_id,
        session_hash=hash_secret(refresh_jti),
        status="active",
        expires_at=utcnow() + timedelta(days=1),
    )


class OAuthPkceContractTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.fake_db = FakeDb()
        self.settings = get_settings()

    def authorize_params(self, *, verifier: str = "A" * 64, method: str = "S256") -> dict[str, str]:
        return {
            "response_type": "code",
            "client_id": "victus-cli",
            "redirect_uri": "http://127.0.0.1:49152/callback",
            "scope": "openid profile email offline_access",
            "state": "state-123",
            "code_challenge": _pkce_challenge(verifier),
            "code_challenge_method": method,
        }

    def login_cookie_for(self, user: AppUser, session: WebSession) -> dict[str, str]:
        access_token = create_jwt(user_id=user.user_id, session_id=session.session_id, token_type="access")
        return {self.settings.access_cookie_name: access_token}

    def add_authorization_code(self, user: AppUser, *, code: str, verifier: str = "A" * 64) -> OAuthAuthorizationCode:
        authorization = OAuthAuthorizationCode(
            code_hash=hash_secret(code),
            client_id="victus-cli",
            user_id=user.user_id,
            redirect_uri="http://127.0.0.1:49152/callback",
            scope="openid profile email offline_access",
            code_challenge=_pkce_challenge(verifier),
            code_challenge_method="S256",
            expires_at=utcnow() + timedelta(minutes=10),
        )
        self.fake_db.add(authorization)
        return authorization

    async def call_authorize(self, params: dict[str, str], cookies: dict[str, str] | None = None):
        return await authorize(
            make_request(query=params, cookies=cookies),
            db=self.fake_db,
            settings=self.settings,
            response_type=params["response_type"],
            client_id=params["client_id"],
            redirect_uri=params["redirect_uri"],
            state=params["state"],
            code_challenge=params.get("code_challenge"),
            code_challenge_method=params.get("code_challenge_method"),
            scope=params.get("scope"),
        )

    async def call_token(self, payload: dict[str, str]):
        return await token(
            OAuthTokenRequest(**payload),
            make_request(),
            db=self.fake_db,
            settings=self.settings,
        )

    async def test_authorize_rejects_missing_code_challenge(self):
        params = self.authorize_params()
        params.pop("code_challenge")

        with self.assertRaises(HTTPException) as raised:
            await self.call_authorize(params)

        self.assertEqual(raised.exception.status_code, 400)
        self.assertEqual(raised.exception.detail["error"], "invalid_request")

    async def test_authorize_rejects_non_s256_pkce_method(self):
        with self.assertRaises(HTTPException) as raised:
            await self.call_authorize(self.authorize_params(method="plain"))

        self.assertEqual(raised.exception.status_code, 400)
        self.assertEqual(raised.exception.detail["error_description"], "code_challenge_method must be S256")

    async def test_authorize_accepts_dynamic_loopback_redirect_and_returns_code_state(self):
        user = make_user()
        session = make_session(user)
        self.fake_db.add(user)
        self.fake_db.add(session)

        response = await self.call_authorize(self.authorize_params(), cookies=self.login_cookie_for(user, session))

        self.assertEqual(response.status_code, 302)
        location = response.headers["location"]
        parsed = urlparse(location)
        self.assertEqual(f"{parsed.scheme}://{parsed.netloc}{parsed.path}", "http://127.0.0.1:49152/callback")
        self.assertEqual(parse_qs(parsed.query)["state"], ["state-123"])
        self.assertTrue(parse_qs(parsed.query)["code"][0])
        self.assertEqual(len(self.fake_db.authorization_codes), 1)

    async def test_token_rejects_wrong_code_verifier(self):
        user = make_user()
        self.fake_db.add(user)
        self.add_authorization_code(user, code="auth-code", verifier="A" * 64)

        with self.assertRaises(HTTPException) as raised:
            await self.call_token(
                {
                    "grant_type": "authorization_code",
                    "client_id": "victus-cli",
                    "code": "auth-code",
                    "redirect_uri": "http://127.0.0.1:49152/callback",
                    "code_verifier": "B" * 64,
                }
            )

        self.assertEqual(raised.exception.status_code, 400)
        self.assertEqual(raised.exception.detail["error"], "invalid_grant")

    async def test_token_rejects_reuse_of_authorization_code(self):
        user = make_user()
        self.fake_db.add(user)
        authorization = self.add_authorization_code(user, code="auth-code")
        authorization.used_at = utcnow()

        with self.assertRaises(HTTPException) as raised:
            await self.call_token(
                {
                    "grant_type": "authorization_code",
                    "client_id": "victus-cli",
                    "code": "auth-code",
                    "redirect_uri": "http://127.0.0.1:49152/callback",
                    "code_verifier": "A" * 64,
                }
            )

        self.assertEqual(raised.exception.status_code, 400)
        self.assertEqual(raised.exception.detail["error_description"], "Authorization code was already used")

    async def test_token_issues_access_and_refresh_token_with_offline_access(self):
        user = make_user()
        self.fake_db.add(user)
        authorization = self.add_authorization_code(user, code="auth-code")

        response = await self.call_token(
            {
                "grant_type": "authorization_code",
                "client_id": "victus-cli",
                "code": "auth-code",
                "redirect_uri": "http://127.0.0.1:49152/callback",
                "code_verifier": "A" * 64,
            }
        )

        self.assertTrue(response.access_token)
        self.assertTrue(response.refresh_token)
        self.assertEqual(response.expires_in, 3600)
        self.assertEqual(response.token_type, "Bearer")
        self.assertIn("offline_access", response.scope)
        self.assertIsNotNone(authorization.used_at)

    async def test_token_refresh_rotates_refresh_token(self):
        user = make_user()
        session = make_session(user, refresh_jti="old-refresh")
        self.fake_db.add(user)
        self.fake_db.add(session)
        refresh_token = create_jwt(user_id=user.user_id, session_id=session.session_id, token_type="refresh", jti="old-refresh")

        response = await self.call_token(
            {"grant_type": "refresh_token", "client_id": "victus-cli", "refresh_token": refresh_token}
        )

        self.assertTrue(response.access_token)
        self.assertEqual(response.expires_in, 3600)
        self.assertNotEqual(response.refresh_token, refresh_token)
        self.assertNotEqual(session.session_hash, hash_secret("old-refresh"))

    async def test_revoke_prevents_future_refresh(self):
        user = make_user()
        session = make_session(user, refresh_jti="to-revoke")
        self.fake_db.add(user)
        self.fake_db.add(session)
        refresh_token = create_jwt(user_id=user.user_id, session_id=session.session_id, token_type="refresh", jti="to-revoke")

        revoke_response = await revoke(
            OAuthRevokeRequest(client_id="victus-cli", token=refresh_token, token_type_hint="refresh_token"),
            db=self.fake_db,
        )
        with self.assertRaises(HTTPException) as raised:
            await self.call_token({"grant_type": "refresh_token", "client_id": "victus-cli", "refresh_token": refresh_token})

        self.assertEqual(revoke_response.status_code, 200)
        self.assertEqual(raised.exception.status_code, 400)
        self.assertEqual(session.status, "revoked")


if __name__ == "__main__":
    unittest.main()
