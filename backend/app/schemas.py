from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator


class UserPublic(BaseModel):
    user_id: uuid.UUID
    primary_email: EmailStr
    display_name: str | None = None
    avatar_url: str | None = None
    status: str
    locale: str
    timezone: str
    is_demo: bool = False


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=10, max_length=256)
    display_name: str = Field(min_length=1, max_length=160)

    @field_validator("display_name")
    @classmethod
    def strip_display_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Display name is required")
        return value


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=256)


class AuthResponse(BaseModel):
    user: UserPublic
    csrf_token: str


class SessionResponse(BaseModel):
    user: UserPublic | None
    authenticated: bool


class RelayProfile(BaseModel):
    goals: list[str] = Field(default_factory=list)
    restrictions: list[str] = Field(default_factory=list)
    preferences: list[str] = Field(default_factory=list)


class RelayMeResponse(BaseModel):
    id: str
    email: EmailStr
    name: str | None = None
    display_name: str | None = None
    plan: str = "free"
    profile: RelayProfile


class OAuthTokenRequest(BaseModel):
    grant_type: str
    client_id: str
    code: str | None = None
    redirect_uri: str | None = None
    code_verifier: str | None = None
    refresh_token: str | None = None


class OAuthTokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    expires_in: int
    token_type: str = "Bearer"
    scope: str


class OAuthRevokeRequest(BaseModel):
    client_id: str
    token: str
    token_type_hint: str | None = None


class UserSettingsResponse(BaseModel):
    theme: str
    sidebar_collapsed: bool
    default_workspace_id: str
    density: str
    preferred_language: str
    ui_preferences: dict


class UserSettingsUpdate(BaseModel):
    theme: str | None = None
    sidebar_collapsed: bool | None = None
    default_workspace_id: str | None = None
    density: str | None = None
    preferred_language: str | None = None
    ui_preferences: dict | None = None


class WorkspaceResponse(BaseModel):
    workspace_id: str
    label: str
    route: str
    icon: str
    status: str
    sort_order: int


class ConversationResponse(BaseModel):
    conversation_id: uuid.UUID
    workspace_id: str
    title: str
    status: str
    pinned: bool
    created_at: datetime
    updated_at: datetime


class CreateConversationRequest(BaseModel):
    workspace_id: str = "chat"
    title: str = "New conversation"


class ConversationUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=220)
    pinned: bool | None = None
    status: str | None = Field(default=None, max_length=32)


class MessageResponse(BaseModel):
    message_id: uuid.UUID
    conversation_id: uuid.UUID
    role: str
    status: str
    content_text: str
    created_at: datetime
    updated_at: datetime
    metadata_json: dict


class ChatStreamRequest(BaseModel):
    message: str = Field(min_length=1, max_length=8000)
    conversation_id: uuid.UUID | None = None
    workspace_id: str = "chat"

    @field_validator("message")
    @classmethod
    def strip_message(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Message is required")
        return value


class MetricEntryCreate(BaseModel):
    metric_type: str = Field(min_length=1, max_length=64)
    label: str = Field(min_length=1, max_length=120)
    recorded_at: datetime | None = None
    value_number: float | None = None
    value_text: str | None = Field(default=None, max_length=220)
    unit: str | None = Field(default=None, max_length=32)
    source: str = Field(default="manual", max_length=40)
    notes: str | None = None
    metadata_json: dict = Field(default_factory=dict)


class MetricEntryResponse(BaseModel):
    metric_entry_id: uuid.UUID
    metric_type: str
    label: str
    recorded_at: datetime
    value_number: float | None
    value_text: str | None
    unit: str | None
    source: str
    notes: str | None
    metadata_json: dict


class PreferenceItemCreate(BaseModel):
    category: str = Field(min_length=1, max_length=80)
    label: str = Field(min_length=1, max_length=160)
    value: str = Field(min_length=1, max_length=260)
    importance: int = Field(default=3, ge=1, le=5)
    status: str = Field(default="active", max_length=40)
    source: str = Field(default="user", max_length=40)
    metadata_json: dict = Field(default_factory=dict)


class PreferenceItemResponse(BaseModel):
    preference_id: uuid.UUID
    category: str
    label: str
    value: str
    importance: int
    status: str
    source: str
    metadata_json: dict


class MetricPoint(BaseModel):
    x: str
    value: float
    recorded_at: datetime


class MetricSeries(BaseModel):
    metric_type: str
    label: str
    unit: str | None
    trend_label: str
    change_label: str
    points: list[MetricPoint]


class PreferenceGroup(BaseModel):
    category: str
    title: str
    items: list[PreferenceItemResponse]


class DashboardSummaryCard(BaseModel):
    label: str
    value: str
    detail: str
    tone: str = "neutral"


class NutritionFocusItem(BaseModel):
    title: str
    detail: str
    status: str


class HealthOverviewResponse(BaseModel):
    summary_cards: list[DashboardSummaryCard]
    metrics: list[MetricSeries]
    preference_groups: list[PreferenceGroup]
    nutrition_focus: list[NutritionFocusItem]
    read_only: bool = False
    profile_label: str | None = None
    profile_note: str | None = None
