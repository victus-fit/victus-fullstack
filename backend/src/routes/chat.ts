import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import { streamText } from "hono/streaming";
import { settings } from "../config.js";
import { pool, transaction } from "../db.js";
import { cookie, HttpError, requireCsrf } from "../security.js";
import { currentUser } from "../session.js";
import { injectTraceHeaders, setSpanAttributes, withSpan } from "../telemetry.js";

export const chatRoutes = new Hono();

function messageTextFromAgent(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      "message" in parsed &&
      typeof (parsed as { message?: unknown }).message === "string"
    ) {
      return (parsed as { message: string }).message;
    }
  } catch {
    return raw;
  }

  return raw;
}

chatRoutes.post("/api/chat/stream", async (c) => {
  return withSpan("webapp.chat.stream", { "victus.route": "/api/chat/stream" }, async (span) => {
    requireCsrf(c);
    const user = await currentUser(c);
    const body = await c.req.json<Record<string, unknown>>();
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const workspaceId = typeof body.workspace_id === "string" ? body.workspace_id : "chat";
    const language = body.language === "es" ? "es" : "en";
    if (!message || message.length > 8000) throw new HttpError(422, "Message is required");
    setSpanAttributes(span, {
      "victus.workspace_id": workspaceId,
      "victus.input.characters": message.length,
      "victus.has_conversation_id": typeof body.conversation_id === "string",
    });

    const state = await transaction(async (db) => {
      let conversation;
      if (typeof body.conversation_id === "string") {
        const result = await db.query(
          `SELECT * FROM app_conversations WHERE conversation_id=$1 AND user_id=$2 AND archived_at IS NULL`,
          [body.conversation_id, user.user_id],
        );
        conversation = result.rows[0];
        if (!conversation) throw new HttpError(404, "Conversation not found");
      } else {
        const workspace = await db.query(
          `SELECT 1 FROM app_workspaces WHERE workspace_id=$1 AND status='active'`, [workspaceId],
        );
        if (!workspace.rowCount) throw new HttpError(404, "Workspace not found");
        const result = await db.query(
          `INSERT INTO app_conversations(user_id,workspace_id,title,agent_conversation_id)
           VALUES($1,$2,$3,$4) RETURNING *`,
          [user.user_id, workspaceId, message.replace(/\s+/g, " ").slice(0, 70), `web-${randomUUID()}`],
        );
        conversation = result.rows[0];
      }

      const userMessage = await db.query(
        `INSERT INTO app_messages(conversation_id,user_id,role,status,content_text,metadata_json)
         VALUES($1,$2,'user','completed',$3,$4) RETURNING message_id`,
        [conversation.conversation_id, user.user_id, message, JSON.stringify({ source: "webapp" })],
      );
      const turnId = randomUUID();
      const assistantMessage = await db.query(
        `INSERT INTO app_messages(conversation_id,user_id,agent_turn_id,role,status,content_text,metadata_json)
         VALUES($1,$2,$3,'assistant','streaming','',$4) RETURNING message_id`,
        [conversation.conversation_id, user.user_id, turnId, JSON.stringify({ source: "victus_agent", agent_turn_id: turnId })],
      );
      const request = await db.query(
        `INSERT INTO agent_requests(user_id,conversation_id,message_id,agent_user_id,agent_conversation_id,agent_turn_id,status,idempotency_key,request_payload)
         VALUES($1,$2,$3,$4,$5,$6,'running',$7,$8) RETURNING request_id`,
        [user.user_id, conversation.conversation_id, userMessage.rows[0].message_id, `webapp:${user.user_id}`,
          conversation.agent_conversation_id, turnId, randomUUID(), JSON.stringify({ message, workspace_id: workspaceId })],
      );
      return {
        conversationId: conversation.conversation_id as string,
        agentConversationId: conversation.agent_conversation_id as string,
        assistantMessageId: assistantMessage.rows[0].message_id as string,
        requestId: request.rows[0].request_id as string,
        turnId,
      };
    });
    setSpanAttributes(span, {
      "victus.conversation_id": state.conversationId,
      "victus.agent_conversation_id": state.agentConversationId,
      "victus.request_id": state.requestId,
      "victus.agent_turn_id": state.turnId,
    });

    const accessToken = cookie(c, settings.accessCookie);
    if (!accessToken) throw new HttpError(401, "Missing session");
    const agentResponse = await withSpan(
      "gateway.agent.request",
      {
        "victus.conversation_id": state.conversationId,
        "victus.agent_conversation_id": state.agentConversationId,
        "victus.request_id": state.requestId,
        "victus.agent_turn_id": state.turnId,
        "victus.agent.sent_as": "message",
      },
      async (requestSpan) => {
        const response = await fetch(`${settings.agentBaseUrl}/chat`, {
          method: "POST",
          headers: injectTraceHeaders(new Headers({
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          })),
          body: JSON.stringify({
            conversation_id: state.agentConversationId,
            request_id: state.turnId,
            message,
            locale: language,
            timezone: user.timezone,
          }),
          signal: AbortSignal.timeout(settings.agentTimeoutMs),
        }).catch((error) => {
          throw new HttpError(502, `Victus Agent unavailable: ${String(error)}`);
        });
        requestSpan.setAttribute("http.response.status_code", response.status);
        return response;
      },
    );
    span.setAttribute("victus.agent.status_code", agentResponse.status);
    if (!agentResponse.ok || !agentResponse.body) {
      const detail = await agentResponse.text().catch(() => "");
      span.setAttribute("victus.agent.error_body", detail.slice(0, 2000));
      throw new HttpError(502, detail || `Victus Agent returned ${agentResponse.status}`);
    }

    c.header("X-Victus-Conversation-Id", state.conversationId);
    c.header("X-Victus-Agent-Turn-Id", state.turnId);
    c.header("Cache-Control", "no-cache");
    return streamText(c, async (stream) => {
      await withSpan(
        "gateway.stream.finalize",
        {
          "victus.conversation_id": state.conversationId,
          "victus.agent_conversation_id": state.agentConversationId,
          "victus.request_id": state.requestId,
          "victus.agent_turn_id": state.turnId,
        },
        async (streamSpan) => {
          const reader = agentResponse.body!.getReader();
          const decoder = new TextDecoder();
          let rawText = "";
          let finalText = "";
          try {
            while (true) {
              const { value, done } = await reader.read();
              if (done) break;
              const chunk = decoder.decode(value, { stream: true });
              rawText += chunk;
            }
            rawText += decoder.decode();
            finalText = messageTextFromAgent(rawText);
            streamSpan.setAttribute("victus.agent.raw_response.characters", rawText.length);
            streamSpan.setAttribute("victus.final_ui_message.characters", finalText.length);
            streamSpan.setAttribute("victus.final_ui_message.preview", finalText.slice(0, 500));
            await stream.write(finalText);
            await pool.query(`UPDATE app_messages SET content_text=$2,status='completed',updated_at=now() WHERE message_id=$1`, [state.assistantMessageId, finalText]);
            await pool.query(`UPDATE agent_requests SET status='completed',completed_at=now(),response_summary=$2 WHERE request_id=$1`, [state.requestId, JSON.stringify({ source: "victus_agent", characters: finalText.length })]);
            await pool.query(`UPDATE app_conversations SET updated_at=now() WHERE conversation_id=$1`, [state.conversationId]);
          } catch (error) {
            const failedText = finalText || messageTextFromAgent(rawText);
            streamSpan.setAttribute("victus.final_ui_message.characters", failedText.length);
            streamSpan.setAttribute("victus.final_ui_message.preview", failedText.slice(0, 500));
            await pool.query(`UPDATE app_messages SET content_text=$2,status='failed',updated_at=now() WHERE message_id=$1`, [state.assistantMessageId, failedText]);
            await pool.query(`UPDATE agent_requests SET status='failed',completed_at=now(),error_code=$2,error_message=$3 WHERE request_id=$1`, [state.requestId, error instanceof Error ? error.name : "Error", String(error)]);
            throw error;
          }
        },
      );
    });
  });
});
