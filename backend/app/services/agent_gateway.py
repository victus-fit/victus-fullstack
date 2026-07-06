from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from dataclasses import dataclass


@dataclass(frozen=True)
class AgentStreamInput:
    user_id: str
    agent_user_id: str
    conversation_id: str
    agent_conversation_id: str | None
    message: str
    workspace_id: str


class AgentGateway:
    async def stream_chat(self, payload: AgentStreamInput) -> AsyncIterator[str]:
        raise NotImplementedError


class MockAgentGateway(AgentGateway):
    async def stream_chat(self, payload: AgentStreamInput) -> AsyncIterator[str]:
        text = self._answer(payload.message)
        for index, token in enumerate(text.split(" ")):
            yield token + (" " if index < len(text.split(" ")) - 1 else "")
            await asyncio.sleep(0.018)

    def _answer(self, message: str) -> str:
        normalized = message.lower()
        if any(word in normalized for word in ["dieta", "diet", "comida", "meal", "proteina", "proteína"]):
            focus = "dieta, adherencia y restricciones alimentarias"
        elif any(word in normalized for word in ["peso", "sueño", "biometric", "presion", "presión"]):
            focus = "biometrics, tendencia y señales de recuperación"
        else:
            focus = "evidencia científica, contexto del usuario y siguiente acción segura"

        return (
            "Esta respuesta viene desde el AgentGateway mock de FastAPI. "
            f"Para esta demo clasifiqué la consulta como foco en {focus}. "
            "La webapp ya conserva conversación, mensajes y request log en Postgres, mientras el gateway mantiene "
            "el contrato que después permitirá conectar LangGraph sin exponerlo al navegador.\n\n"
            "La recomendación visible para el usuario debe mantenerse breve y accionable. Las referencias, evidencia, "
            "tool calls y trazabilidad deberían renderizarse como artifacts separados para no ensuciar el chat principal."
        )


class LangGraphHttpGateway(AgentGateway):
    def __init__(self, base_url: str, timeout_seconds: float = 45.0) -> None:
        self.base_url = base_url.rstrip("/")
        self.timeout_seconds = timeout_seconds

    async def stream_chat(self, payload: AgentStreamInput) -> AsyncIterator[str]:
        # This is intentionally left as a clean integration boundary for the next repository connection.
        # The webapp should call LangGraph only through this service, never from React.
        raise RuntimeError("LangGraphHttpGateway is configured as a boundary but not wired yet.")


def get_agent_gateway() -> AgentGateway:
    return MockAgentGateway()
