from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select

from app.api.deps import CsrfGuard, CurrentUser, DbSession
from app.core.security import utcnow
from app.models import AgentAccountLink, AgentRequest, AppConversation, AppMessage, AppWorkspace
from app.schemas import ChatStreamRequest
from app.services.agent_gateway import AgentStreamInput, get_agent_gateway

router = APIRouter(prefix="/chat", tags=["chat"])


def _conversation_title(message: str) -> str:
    clean = " ".join(message.split())
    return clean[:70] + ("…" if len(clean) > 70 else "")


async def _get_or_create_conversation(db: DbSession, current_user: CurrentUser, payload: ChatStreamRequest) -> AppConversation:
    if payload.conversation_id:
        conversation = await db.get(AppConversation, payload.conversation_id)
        if conversation is None or conversation.user_id != current_user.user_id or conversation.archived_at is not None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
        return conversation

    workspace = await db.get(AppWorkspace, payload.workspace_id)
    if workspace is None or workspace.status != "active":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")

    conversation = AppConversation(
        user_id=current_user.user_id,
        workspace_id=payload.workspace_id,
        title=_conversation_title(payload.message),
        agent_conversation_id=f"web-{uuid.uuid4()}",
    )
    db.add(conversation)
    await db.flush()
    return conversation


async def _get_agent_user_id(db: DbSession, user_id: uuid.UUID) -> str:
    link = await db.scalar(
        select(AgentAccountLink).where(AgentAccountLink.user_id == user_id, AgentAccountLink.status == "active")
    )
    if link is not None:
        return link.agent_user_id

    agent_user_id = f"webapp:{user_id}"
    db.add(AgentAccountLink(user_id=user_id, agent_user_id=agent_user_id, status="active"))
    await db.flush()
    return agent_user_id


@router.post("/stream")
async def stream_chat(
    payload: ChatStreamRequest,
    _csrf: CsrfGuard,
    current_user: CurrentUser,
    db: DbSession,
) -> StreamingResponse:
    conversation = await _get_or_create_conversation(db, current_user, payload)

    user_message = AppMessage(
        conversation_id=conversation.conversation_id,
        user_id=current_user.user_id,
        role="user",
        status="completed",
        content_text=payload.message,
        metadata_json={"source": "webapp"},
    )
    db.add(user_message)
    await db.flush()

    agent_turn_id = uuid.uuid4()
    assistant_message = AppMessage(
        conversation_id=conversation.conversation_id,
        user_id=current_user.user_id,
        agent_turn_id=agent_turn_id,
        role="assistant",
        status="streaming",
        content_text="",
        metadata_json={"source": "agent_gateway_mock", "agent_turn_id": str(agent_turn_id)},
    )
    db.add(assistant_message)

    agent_user_id = await _get_agent_user_id(db, current_user.user_id)
    agent_request = AgentRequest(
        user_id=current_user.user_id,
        conversation_id=conversation.conversation_id,
        message_id=user_message.message_id,
        agent_user_id=agent_user_id,
        agent_conversation_id=conversation.agent_conversation_id,
        agent_turn_id=agent_turn_id,
        status="running",
        idempotency_key=str(uuid.uuid4()),
        request_payload={"message": payload.message, "workspace_id": payload.workspace_id},
        response_summary={},
    )
    db.add(agent_request)
    conversation.updated_at = utcnow()
    await db.commit()

    gateway = get_agent_gateway()
    stream_input = AgentStreamInput(
        user_id=str(current_user.user_id),
        agent_user_id=agent_user_id,
        conversation_id=str(conversation.conversation_id),
        agent_conversation_id=conversation.agent_conversation_id,
        message=payload.message,
        workspace_id=payload.workspace_id,
    )

    async def token_stream():
        final_text = ""
        try:
            async for chunk in gateway.stream_chat(stream_input):
                final_text += chunk
                yield chunk

            assistant_message.content_text = final_text
            assistant_message.status = "completed"
            agent_request.status = "completed"
            agent_request.completed_at = utcnow()
            agent_request.response_summary = {"mode": "mock_gateway", "characters": len(final_text)}
            conversation.updated_at = utcnow()
            await db.commit()
        except Exception as exc:
            assistant_message.content_text = final_text or "No pude completar la respuesta del agente."
            assistant_message.status = "failed"
            agent_request.status = "failed"
            agent_request.error_code = exc.__class__.__name__
            agent_request.error_message = str(exc)
            agent_request.completed_at = utcnow()
            conversation.updated_at = utcnow()
            await db.commit()
            yield "\n\nNo pude completar la respuesta del agente en esta ejecución."

    headers = {
        "X-Victus-Conversation-Id": str(conversation.conversation_id),
        "X-Victus-Agent-Turn-Id": str(agent_turn_id),
        "Cache-Control": "no-cache",
    }
    return StreamingResponse(token_stream(), media_type="text/plain; charset=utf-8", headers=headers)
