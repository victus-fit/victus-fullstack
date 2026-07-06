from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.api.deps import CsrfGuard, CurrentUser, DbSession
from app.core.security import utcnow
from app.models import AppConversation, AppMessage, AppWorkspace
from app.schemas import ConversationResponse, ConversationUpdateRequest, CreateConversationRequest, MessageResponse

router = APIRouter(prefix="/conversations", tags=["conversations"])


def _conversation_response(conversation: AppConversation) -> ConversationResponse:
    return ConversationResponse(
        conversation_id=conversation.conversation_id,
        workspace_id=conversation.workspace_id,
        title=conversation.title,
        status=conversation.status,
        pinned=conversation.pinned,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
    )


def _message_response(message: AppMessage) -> MessageResponse:
    return MessageResponse(
        message_id=message.message_id,
        conversation_id=message.conversation_id,
        role=message.role,
        status=message.status,
        content_text=message.content_text,
        created_at=message.created_at,
        updated_at=message.updated_at,
        metadata_json=message.metadata_json,
    )


async def _get_owned_conversation(db: DbSession, current_user: CurrentUser, conversation_id: uuid.UUID) -> AppConversation:
    conversation = await db.get(AppConversation, conversation_id)
    if conversation is None or conversation.user_id != current_user.user_id or conversation.archived_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    return conversation


@router.get("", response_model=list[ConversationResponse])
async def list_conversations(current_user: CurrentUser, db: DbSession) -> list[ConversationResponse]:
    rows = await db.scalars(
        select(AppConversation)
        .where(AppConversation.user_id == current_user.user_id, AppConversation.archived_at.is_(None))
        .order_by(AppConversation.pinned.desc(), AppConversation.updated_at.desc())
        .limit(80)
    )
    return [_conversation_response(conversation) for conversation in rows.all()]


@router.post("", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    payload: CreateConversationRequest,
    _csrf: CsrfGuard,
    current_user: CurrentUser,
    db: DbSession,
) -> ConversationResponse:
    workspace = await db.get(AppWorkspace, payload.workspace_id)
    if workspace is None or workspace.status != "active":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")

    conversation = AppConversation(user_id=current_user.user_id, workspace_id=payload.workspace_id, title=payload.title)
    db.add(conversation)
    await db.commit()
    await db.refresh(conversation)
    return _conversation_response(conversation)


@router.patch("/{conversation_id}", response_model=ConversationResponse)
async def update_conversation(
    conversation_id: uuid.UUID,
    payload: ConversationUpdateRequest,
    _csrf: CsrfGuard,
    current_user: CurrentUser,
    db: DbSession,
) -> ConversationResponse:
    conversation = await _get_owned_conversation(db, current_user, conversation_id)
    if payload.title is not None:
        conversation.title = payload.title.strip()
    if payload.pinned is not None:
        conversation.pinned = payload.pinned
    if payload.status is not None:
        conversation.status = payload.status
    conversation.updated_at = utcnow()
    await db.commit()
    await db.refresh(conversation)
    return _conversation_response(conversation)


@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def archive_conversation(
    conversation_id: uuid.UUID,
    _csrf: CsrfGuard,
    current_user: CurrentUser,
    db: DbSession,
) -> None:
    conversation = await _get_owned_conversation(db, current_user, conversation_id)
    conversation.archived_at = utcnow()
    conversation.status = "archived"
    conversation.updated_at = utcnow()
    await db.commit()


@router.get("/{conversation_id}/messages", response_model=list[MessageResponse])
async def list_messages(conversation_id: uuid.UUID, current_user: CurrentUser, db: DbSession) -> list[MessageResponse]:
    await _get_owned_conversation(db, current_user, conversation_id)
    rows = await db.scalars(
        select(AppMessage)
        .where(AppMessage.conversation_id == conversation_id)
        .order_by(AppMessage.created_at.asc())
        .limit(240)
    )
    return [_message_response(message) for message in rows.all()]
