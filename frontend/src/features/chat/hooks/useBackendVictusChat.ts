import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch, apiStream } from '../../../lib/api';
import { openingAssistantMessage } from '../data/chatContent';
import type { ChatInterrupt, ChatMessageModel, ChatStatus, ConversationListItem, TraceStep, VictusChatController } from '../types';
import { baseTrace, makeId, nowLabel, traceWith } from './chatShared';
import { useLanguage } from '../../../i18n/LanguageContext';

interface MessageResponse {
  message_id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  status: string;
  content_text: string;
  created_at: string;
  updated_at: string;
  metadata_json: Record<string, unknown>;
}

function openingMessage(language: 'es' | 'en'): ChatMessageModel {
  return {
    id: 'assistant-opening',
    role: 'assistant',
    text: openingAssistantMessage(language),
    createdAt: nowLabel(),
  };
}

function messageFromApi(message: MessageResponse): ChatMessageModel {
  const date = new Date(message.created_at);
  return {
    id: message.message_id,
    role: message.role,
    text: message.content_text,
    createdAt: Number.isNaN(date.getTime()) ? nowLabel() : new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit' }).format(date),
    interrupt: message.metadata_json.interrupt as ChatInterrupt | undefined,
  };
}

export function useBackendVictusChat(): VictusChatController {
  const { language } = useLanguage();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [messages, setMessages] = useState<ChatMessageModel[]>(() => [openingMessage(language)]);
  const [status, setStatus] = useState<ChatStatus>('ready');
  const [trace, setTrace] = useState<TraceStep[]>(baseTrace);
  const [pendingInterrupt, setPendingInterrupt] = useState<ChatInterrupt | null>(null);
  const activeRunRef = useRef(0);
  const openingLanguageRef = useRef(language);

  useEffect(() => {
    if (openingLanguageRef.current === language) return;
    openingLanguageRef.current = language;
    setMessages((current) => current.map((message) => (
      message.id === 'assistant-opening' ? { ...message, text: openingAssistantMessage(language) } : message
    )));
  }, [language]);

  const refreshConversations = useCallback(async () => {
    const rows = await apiFetch<ConversationListItem[]>('/api/conversations');
    setConversations(rows);
  }, []);

  useEffect(() => {
    void refreshConversations().catch(() => undefined);
  }, [refreshConversations]);

  const selectConversation = useCallback(async (conversationId: string) => {
    activeRunRef.current += 1;
    setStatus('ready');
    setTrace(baseTrace);
    setIsLoadingHistory(true);
    try {
      const rows = await apiFetch<MessageResponse[]>(`/api/conversations/${conversationId}/messages`);
      setActiveConversationId(conversationId);
      const mapped = rows.length ? rows.map(messageFromApi) : [openingMessage(language)];
      setMessages(mapped);
      const latestAssistant = [...mapped].reverse().find((message) => message.role === 'assistant');
      setPendingInterrupt(
        latestAssistant?.interrupt
          ?? (latestAssistant && /^¿Confirmas ejecutar /.test(latestAssistant.text)
            ? { id: '', kind: 'confirmation', question: latestAssistant.text }
            : null),
      );
    } finally {
      setIsLoadingHistory(false);
    }
  }, [language]);

  const startNewConversation = useCallback(() => {
    activeRunRef.current += 1;
    setActiveConversationId(null);
    setStatus('ready');
    setTrace(baseTrace);
    setMessages([openingMessage(language)]);
    setPendingInterrupt(null);
  }, [language]);

  const deleteConversation = useCallback(async (conversationId: string) => {
    await apiFetch<void>(`/api/conversations/${conversationId}`, { method: 'DELETE' });
    setConversations((current) => current.filter((conversation) => conversation.conversation_id !== conversationId));
    if (activeConversationId === conversationId) {
      startNewConversation();
    }
  }, [activeConversationId, startNewConversation]);

  const sendMessage = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed || status !== 'ready') return;

    const runId = activeRunRef.current + 1;
    activeRunRef.current = runId;
    const assistantId = makeId('assistant');

    setMessages((current) => [
      ...current.filter((message) => message.id !== 'assistant-opening'),
      { id: makeId('user'), role: 'user', text: trimmed, createdAt: nowLabel() },
      { id: assistantId, role: 'assistant', text: '', createdAt: nowLabel() },
    ]);
    setStatus('submitted');
    setTrace(traceWith(0));

    void (async () => {
      try {
        setTrace(traceWith(1));
        const response = await apiStream('/api/chat/stream', {
          message: trimmed,
          conversation_id: activeConversationId,
          workspace_id: 'chat',
          language,
        });

        const nextConversationId = response.headers.get('X-Victus-Conversation-Id');
        if (nextConversationId) setActiveConversationId(nextConversationId);
        const encodedInterrupt = response.headers.get('X-Victus-Interrupt');
        if (encodedInterrupt) {
          try { setPendingInterrupt(JSON.parse(atob(encodedInterrupt.replace(/-/g, '+').replace(/_/g, '/'))) as ChatInterrupt); } catch { /* restored from message metadata on reload */ }
        }

        if (!response.body) throw new Error('Streaming body unavailable');

        setStatus('streaming');
        setTrace(traceWith(2));
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let finalText = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (activeRunRef.current !== runId) break;
          finalText += decoder.decode(value, { stream: true });
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantId ? { ...message, text: finalText } : message,
            ),
          );
        }

        setMessages((current) => current.map((message) => message.id === assistantId ? { ...message, text: finalText } : message));
        if (!encodedInterrupt && /^¿Confirmas ejecutar /.test(finalText)) setPendingInterrupt({ id: '', kind: 'confirmation', question: finalText });
        setTrace(baseTrace.map((step) => ({ ...step, state: 'done' })));
        await refreshConversations();
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : 'Backend stream failed';
        setMessages((current) =>
          current.map((item) =>
            item.id === assistantId
              ? {
                  ...item,
                  text: `No pude completar el stream del backend: ${message}`,
                }
              : item,
          ),
        );
        setTrace(baseTrace);
      } finally {
        if (activeRunRef.current === runId) setStatus('ready');
      }
    })();
  }, [activeConversationId, language, refreshConversations, status]);

  const respondToConfirmation = useCallback((accepted: boolean) => {
    if (!pendingInterrupt || pendingInterrupt.kind !== 'confirmation' || !activeConversationId || status !== 'ready') return;
    setPendingInterrupt(null);
    const label = accepted ? 'Confirmado' : 'Cancelado';
    const assistantId = makeId('assistant');
    setMessages((current) => [...current, { id: makeId('user'), role: 'user', text: label, createdAt: nowLabel() }, { id: assistantId, role: 'assistant', text: '', createdAt: nowLabel() }]);
    setStatus('submitted');
    void (async () => {
      try {
        const response = await apiStream('/api/chat/stream', { conversation_id: activeConversationId, workspace_id: 'chat', language, resume: { value: { accepted } } });
        if (!response.body) throw new Error('Streaming body unavailable');
        setStatus('streaming');
        const reader = response.body.getReader(); const decoder = new TextDecoder(); let finalText = '';
        while (true) { const { value, done } = await reader.read(); if (done) break; finalText += decoder.decode(value, { stream: true }); setMessages((current) => current.map((item) => item.id === assistantId ? { ...item, text: finalText } : item)); }
        setMessages((current) => current.map((item) => item.id === assistantId ? { ...item, text: finalText } : item));
        await refreshConversations();
      } catch (caught) {
        const error = caught instanceof Error ? caught.message : 'No se pudo confirmar la acción';
        setMessages((current) => current.map((item) => item.id === assistantId ? { ...item, text: error } : item));
      } finally { setStatus('ready'); }
    })();
  }, [activeConversationId, language, pendingInterrupt, refreshConversations, status]);

  const reset = useCallback(() => {
    startNewConversation();
  }, [startNewConversation]);

  return {
    messages,
    status,
    trace,
    latestEvidence: [],
    conversations,
    activeConversationId,
    isLoadingHistory,
    sendMessage,
    respondToConfirmation,
    pendingInterrupt,
    reset,
    refreshConversations,
    selectConversation,
    deleteConversation,
    startNewConversation,
  };
}
