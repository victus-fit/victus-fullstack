from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import BigInteger, Boolean, DateTime, Float, ForeignKey, Index, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class AppUser(Base, TimestampMixin):
    __tablename__ = "app_users"

    user_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    primary_email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    display_name: Mapped[str | None] = mapped_column(String(160))
    avatar_url: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(32), default="active", nullable=False)
    locale: Mapped[str] = mapped_column(String(24), default="es-CL", nullable=False)
    timezone: Mapped[str] = mapped_column(String(64), default="America/Santiago", nullable=False)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    identities: Mapped[list[AuthIdentity]] = relationship(back_populates="user", cascade="all, delete-orphan")
    sessions: Mapped[list[WebSession]] = relationship(back_populates="user", cascade="all, delete-orphan")
    settings: Mapped[UserSettings | None] = relationship(back_populates="user", cascade="all, delete-orphan")


class AuthIdentity(Base, TimestampMixin):
    __tablename__ = "auth_identities"
    __table_args__ = (UniqueConstraint("provider", "provider_subject", name="uq_auth_identities_provider_subject"),)

    auth_identity_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("app_users.user_id", ondelete="CASCADE"), index=True)
    provider: Mapped[str] = mapped_column(String(64), nullable=False)
    provider_subject: Mapped[str] = mapped_column(String(320), nullable=False)
    email: Mapped[str] = mapped_column(String(320), index=True, nullable=False)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    password_hash: Mapped[str | None] = mapped_column(Text)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)

    user: Mapped[AppUser] = relationship(back_populates="identities")


class WebSession(Base, TimestampMixin):
    __tablename__ = "web_sessions"

    session_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("app_users.user_id", ondelete="CASCADE"), index=True)
    session_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="active", nullable=False)
    ip_hash: Mapped[str | None] = mapped_column(String(128))
    user_agent_hash: Mapped[str | None] = mapped_column(String(128))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    user: Mapped[AppUser] = relationship(back_populates="sessions")


class OAuthAuthorizationCode(Base, TimestampMixin):
    __tablename__ = "oauth_authorization_codes"

    code_hash: Mapped[str] = mapped_column(String(128), primary_key=True)
    client_id: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("app_users.user_id", ondelete="CASCADE"), index=True)
    redirect_uri: Mapped[str] = mapped_column(Text, nullable=False)
    scope: Mapped[str] = mapped_column(Text, nullable=False)
    code_challenge: Mapped[str] = mapped_column(String(160), nullable=False)
    code_challenge_method: Mapped[str] = mapped_column(String(16), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class UserSettings(Base):
    __tablename__ = "user_settings"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("app_users.user_id", ondelete="CASCADE"), primary_key=True)
    theme: Mapped[str] = mapped_column(String(16), default="dark", nullable=False)
    sidebar_collapsed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    default_workspace_id: Mapped[str] = mapped_column(String(64), default="chat", nullable=False)
    density: Mapped[str] = mapped_column(String(32), default="comfortable", nullable=False)
    preferred_language: Mapped[str] = mapped_column(String(16), default="es", nullable=False)
    ui_preferences: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user: Mapped[AppUser] = relationship(back_populates="settings")


class AgentAccountLink(Base, TimestampMixin):
    __tablename__ = "agent_account_links"
    __table_args__ = (UniqueConstraint("user_id", "agent_user_id", name="uq_agent_account_links_user_agent"),)

    agent_link_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("app_users.user_id", ondelete="CASCADE"), index=True)
    agent_user_id: Mapped[str] = mapped_column(Text, index=True, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="active", nullable=False)
    synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class AppWorkspace(Base):
    __tablename__ = "app_workspaces"

    workspace_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    label: Mapped[str] = mapped_column(String(120), nullable=False)
    route: Mapped[str] = mapped_column(String(160), nullable=False)
    icon: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="active", nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class UserWorkspaceState(Base):
    __tablename__ = "user_workspace_state"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("app_users.user_id", ondelete="CASCADE"), primary_key=True)
    workspace_id: Mapped[str] = mapped_column(ForeignKey("app_workspaces.workspace_id"), primary_key=True)
    last_opened_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    pinned: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    local_state: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class AppConversation(Base, TimestampMixin):
    __tablename__ = "app_conversations"

    conversation_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("app_users.user_id", ondelete="CASCADE"), index=True)
    workspace_id: Mapped[str] = mapped_column(ForeignKey("app_workspaces.workspace_id"), default="chat", nullable=False)
    agent_conversation_id: Mapped[str | None] = mapped_column(Text, index=True)
    title: Mapped[str] = mapped_column(String(220), default="New conversation", nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="active", nullable=False)
    pinned: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    messages: Mapped[list[AppMessage]] = relationship(back_populates="conversation", cascade="all, delete-orphan")


class AppMessage(Base, TimestampMixin):
    __tablename__ = "app_messages"

    message_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("app_conversations.conversation_id", ondelete="CASCADE"), index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("app_users.user_id", ondelete="CASCADE"), index=True)
    parent_message_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("app_messages.message_id", ondelete="SET NULL"))
    agent_turn_id: Mapped[uuid.UUID | None] = mapped_column(PG_UUID(as_uuid=True), index=True)
    role: Mapped[str] = mapped_column(String(32), nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="completed", nullable=False)
    content_text: Mapped[str] = mapped_column(Text, nullable=False)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)

    conversation: Mapped[AppConversation] = relationship(back_populates="messages")


class MessagePart(Base):
    __tablename__ = "message_parts"

    message_part_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    message_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("app_messages.message_id", ondelete="CASCADE"), index=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    part_type: Mapped[str] = mapped_column(String(64), nullable=False)
    text_content: Mapped[str | None] = mapped_column(Text)
    json_content: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class MessageArtifact(Base):
    __tablename__ = "message_artifacts"

    artifact_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("app_conversations.conversation_id", ondelete="CASCADE"), index=True)
    message_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("app_messages.message_id", ondelete="CASCADE"), index=True)
    artifact_type: Mapped[str] = mapped_column(String(64), nullable=False)
    title: Mapped[str] = mapped_column(String(220), nullable=False)
    source: Mapped[str] = mapped_column(String(80), default="agent", nullable=False)
    payload: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class EvidenceReferenceSnapshot(Base):
    __tablename__ = "evidence_reference_snapshots"

    evidence_snapshot_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    artifact_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("message_artifacts.artifact_id", ondelete="CASCADE"), index=True)
    canonical_evidence_id: Mapped[str | None] = mapped_column(Text, index=True)
    paper_id: Mapped[str | None] = mapped_column(Text, index=True)
    study_id: Mapped[str | None] = mapped_column(Text)
    confidence: Mapped[str | None] = mapped_column(String(32))
    source_quote: Mapped[str | None] = mapped_column(Text)
    payload: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class UserFile(Base, TimestampMixin):
    __tablename__ = "user_files"

    file_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("app_users.user_id", ondelete="CASCADE"), index=True)
    storage_provider: Mapped[str] = mapped_column(String(64), default="local", nullable=False)
    storage_key: Mapped[str] = mapped_column(Text, nullable=False)
    original_filename: Mapped[str] = mapped_column(Text, nullable=False)
    mime_type: Mapped[str] = mapped_column(String(160), nullable=False)
    size_bytes: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    checksum_sha256: Mapped[str | None] = mapped_column(String(128))
    status: Mapped[str] = mapped_column(String(32), default="uploaded", nullable=False)


class MessageFile(Base):
    __tablename__ = "message_files"
    __table_args__ = (UniqueConstraint("message_id", "file_id", name="uq_message_files_message_file"),)

    message_file_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    message_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("app_messages.message_id", ondelete="CASCADE"), index=True)
    file_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("user_files.file_id", ondelete="CASCADE"), index=True)
    attachment_role: Mapped[str] = mapped_column(String(64), default="user_upload", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class AgentRequest(Base):
    __tablename__ = "agent_requests"

    request_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("app_users.user_id", ondelete="CASCADE"), index=True)
    conversation_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("app_conversations.conversation_id", ondelete="CASCADE"), index=True)
    message_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("app_messages.message_id", ondelete="CASCADE"), index=True)
    agent_user_id: Mapped[str | None] = mapped_column(Text, index=True)
    agent_conversation_id: Mapped[str | None] = mapped_column(Text, index=True)
    agent_turn_id: Mapped[uuid.UUID | None] = mapped_column(PG_UUID(as_uuid=True), index=True)
    status: Mapped[str] = mapped_column(String(32), default="completed", nullable=False)
    idempotency_key: Mapped[str | None] = mapped_column(String(160), index=True)
    request_payload: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    response_summary: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    error_code: Mapped[str | None] = mapped_column(String(80))
    error_message: Mapped[str | None] = mapped_column(Text)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class UserMetricEntry(Base, TimestampMixin):
    __tablename__ = "user_metric_entries"

    metric_entry_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("app_users.user_id", ondelete="CASCADE"), index=True)
    metric_type: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    label: Mapped[str] = mapped_column(String(120), nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True, nullable=False)
    value_number: Mapped[float | None] = mapped_column(Float)
    value_text: Mapped[str | None] = mapped_column(String(220))
    unit: Mapped[str | None] = mapped_column(String(32))
    source: Mapped[str] = mapped_column(String(40), default="manual", nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)


class UserPreferenceItem(Base, TimestampMixin):
    __tablename__ = "user_preference_items"
    __table_args__ = (UniqueConstraint("user_id", "category", "label", name="uq_user_preference_category_label"),)

    preference_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("app_users.user_id", ondelete="CASCADE"), index=True)
    category: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    label: Mapped[str] = mapped_column(String(160), nullable=False)
    value: Mapped[str] = mapped_column(String(260), nullable=False)
    importance: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    status: Mapped[str] = mapped_column(String(40), default="active", nullable=False)
    source: Mapped[str] = mapped_column(String(40), default="user", nullable=False)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)


class OnboardingState(Base):
    __tablename__ = "onboarding_state"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("app_users.user_id", ondelete="CASCADE"), primary_key=True)
    status: Mapped[str] = mapped_column(String(32), default="not_started", nullable=False)
    current_step: Mapped[str | None] = mapped_column(String(80))
    completed_steps: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    answers_snapshot: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class AppAuditLog(Base):
    __tablename__ = "app_audit_logs"

    audit_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("app_users.user_id", ondelete="SET NULL"), index=True)
    actor_type: Mapped[str] = mapped_column(String(32), default="user", nullable=False)
    action: Mapped[str] = mapped_column(String(120), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(120), nullable=False)
    entity_id: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)


Index("ix_app_messages_conversation_created", AppMessage.conversation_id, AppMessage.created_at)
Index("ix_app_conversations_user_updated", AppConversation.user_id, AppConversation.updated_at)
Index("ix_user_metric_entries_user_type_recorded", UserMetricEntry.user_id, UserMetricEntry.metric_type, UserMetricEntry.recorded_at)
Index("ix_user_preference_items_user_category", UserPreferenceItem.user_id, UserPreferenceItem.category)
