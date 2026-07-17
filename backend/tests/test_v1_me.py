from __future__ import annotations

import unittest
import uuid
from datetime import timedelta
import json
from pathlib import Path
import sys

from starlette.requests import Request
from starlette.responses import JSONResponse

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.security import create_jwt, utcnow  # noqa: E402
from app.models import AppUser, UserPreferenceItem, WebSession  # noqa: E402
from app.api.v1 import relay_me  # noqa: E402


class FakeScalarResult:
    def __init__(self, rows):
        self._rows = rows

    def all(self):
        return self._rows


class FakeDb:
    def __init__(
        self,
        *,
        users: dict[uuid.UUID, AppUser] | None = None,
        sessions: dict[uuid.UUID, WebSession] | None = None,
        preferences: list[UserPreferenceItem] | None = None,
    ):
        self.users = users or {}
        self.sessions = sessions or {}
        self.preferences = preferences or []
        self.loaded_user_id: uuid.UUID | None = None

    async def get(self, model, key):
        if model is AppUser:
            self.loaded_user_id = key
            return self.users.get(key)
        if model is WebSession:
            return self.sessions.get(key)
        return None

    async def scalars(self, _statement):
        rows = [
            item
            for item in self.preferences
            if item.user_id == self.loaded_user_id and item.status == "active"
        ]
        return FakeScalarResult(rows)

    async def commit(self):
        return None


async def empty_receive():
    return {"type": "http.request", "body": b"", "more_body": False}


def make_request(token: str | None = None) -> Request:
    headers: list[tuple[bytes, bytes]] = [(b"host", b"testserver")]
    if token is not None:
        headers.append((b"authorization", f"Bearer {token}".encode("ascii")))
    scope = {
        "type": "http",
        "method": "GET",
        "path": "/v1/me",
        "root_path": "",
        "scheme": "http",
        "server": ("testserver", 80),
        "client": ("127.0.0.1", 50100),
        "headers": headers,
        "query_string": b"",
    }
    return Request(scope, empty_receive)


def response_json(response) -> dict:
    if isinstance(response, JSONResponse):
        return json.loads(response.body.decode("utf-8"))
    return response.model_dump(mode="json")


def make_user(email: str, display_name: str) -> AppUser:
    return AppUser(
        user_id=uuid.uuid4(),
        primary_email=email,
        display_name=display_name,
        status="active",
        locale="es-CL",
        timezone="America/Santiago",
    )


def make_session(user: AppUser) -> WebSession:
    return WebSession(
        session_id=uuid.uuid4(),
        user_id=user.user_id,
        session_hash="not-returned",
        status="active",
        expires_at=utcnow() + timedelta(hours=1),
    )


def make_preference(user: AppUser, category: str, label: str, value: str) -> UserPreferenceItem:
    return UserPreferenceItem(
        preference_id=uuid.uuid4(),
        user_id=user.user_id,
        category=category,
        label=label,
        value=value,
        importance=3,
        status="active",
        source="test",
        metadata_json={"internal": "not-returned"},
    )


class V1MeContractTest(unittest.IsolatedAsyncioTestCase):
    async def call_relay_me(self, fake_db: FakeDb, token: str | None = None):
        return await relay_me(make_request(token), db=fake_db)

    async def test_get_v1_me_without_token_returns_401(self):
        response = await self.call_relay_me(FakeDb())

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response_json(response), {"error": "unauthorized", "message": "Invalid or expired token"})

    async def test_get_v1_me_with_invalid_token_returns_401(self):
        response = await self.call_relay_me(FakeDb(), "invalid-token")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response_json(response), {"error": "unauthorized", "message": "Invalid or expired token"})

    async def test_get_v1_me_with_valid_token_returns_profile_json(self):
        user = make_user("carlos@example.com", "Carlos")
        session = make_session(user)
        fake_db = FakeDb(
            users={user.user_id: user},
            sessions={session.session_id: session},
            preferences=[
                make_preference(user, "goals", "Goal", "nutrition_tracking"),
                make_preference(user, "restrictions", "Restriction", "lactose_intolerance"),
                make_preference(user, "nutrition", "Preference", "high_protein"),
            ],
        )
        token = create_jwt(user_id=user.user_id, session_id=session.session_id, token_type="access")

        response = await self.call_relay_me(fake_db, token)

        self.assertFalse(isinstance(response, JSONResponse))
        self.assertEqual(
            response_json(response),
            {
                "id": str(user.user_id),
                "email": "carlos@example.com",
                "name": "Carlos",
                "display_name": "Carlos",
                "plan": "free",
                "profile": {
                    "goals": ["nutrition_tracking"],
                    "restrictions": ["lactose_intolerance"],
                    "preferences": ["high_protein"],
                },
            },
        )

    async def test_get_v1_me_does_not_expose_secrets_or_internal_claims(self):
        user = make_user("carlos@example.com", "Carlos")
        session = make_session(user)
        fake_db = FakeDb(users={user.user_id: user}, sessions={session.session_id: session})
        token = create_jwt(user_id=user.user_id, session_id=session.session_id, token_type="access")

        response = await self.call_relay_me(fake_db, token)
        payload = response_json(response)
        serialized = json.dumps(payload)

        for forbidden in ["sid", "jti", "typ", "session_hash", "password_hash", "metadata_json", "not-returned"]:
            self.assertNotIn(forbidden, serialized)
        self.assertEqual(set(payload.keys()), {"id", "email", "name", "display_name", "plan", "profile"})

    async def test_get_v1_me_uses_jwt_sub_to_load_correct_profile(self):
        first_user = make_user("first@example.com", "First")
        second_user = make_user("second@example.com", "Second")
        first_session = make_session(first_user)
        second_session = make_session(second_user)
        fake_db = FakeDb(
            users={first_user.user_id: first_user, second_user.user_id: second_user},
            sessions={first_session.session_id: first_session, second_session.session_id: second_session},
            preferences=[
                make_preference(first_user, "nutrition", "Preference", "first_profile"),
                make_preference(second_user, "nutrition", "Preference", "second_profile"),
            ],
        )
        token = create_jwt(user_id=second_user.user_id, session_id=second_session.session_id, token_type="access")

        response = await self.call_relay_me(fake_db, token)

        self.assertEqual(response_json(response)["id"], str(second_user.user_id))
        self.assertEqual(response_json(response)["profile"]["preferences"], ["second_profile"])


if __name__ == "__main__":
    unittest.main()
