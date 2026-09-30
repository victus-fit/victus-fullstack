import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiStream } from '../../../lib/api';
import { useLanguage } from '../../../i18n/LanguageContext';
import type { ChatMessageModel, ChatStatus, TraceStep, VictusChatController } from '../types';
import { baseTrace, makeId, nowLabel, traceWith } from './chatShared';

function opening(language: 'en' | 'es'): ChatMessageModel {
  return {
    id: 'demo-opening',
    role: 'assistant',
    text: language === 'es'
      ? 'Soy Victus. El perfil base de David es fijo, pero puedo registrar comidas con gramos o mililitros durante esta sesión temporal.'
      : 'I am Victus. David’s base profile is fixed, but I can record meals in grams or milliliters for this temporary session.',
    createdAt: nowLabel(),
  };
}

export function useDemoVictusChat(): VictusChatController {
  const { language } = useLanguage();
  const [messages, setMessages] = useState<ChatMessageModel[]>([opening(language)]);
  const [status, setStatus] = useState<ChatStatus>('ready');
  const [trace, setTrace] = useState<TraceStep[]>(baseTrace);
  const conversationId = useRef(`demo-${crypto.randomUUID()}`);
  useEffect(() => {
    setMessages((current) => current.map((message) => {
      if (message.id !== 'demo-opening') return message;
      return { ...opening(language), createdAt: message.createdAt };
    }));
  }, [language]);
  const sendMessage = useCallback((text: string) => {
    const message = text.trim(); if (!message || status !== 'ready') return;
    const assistantId = makeId('assistant');
    setMessages((current) => [...current, { id: makeId('user'), role: 'user', text: message, createdAt: nowLabel() }, { id: assistantId, role: 'assistant', text: '', createdAt: nowLabel() }]);
    setStatus('submitted'); setTrace(traceWith(1));
    void (async () => {
      try {
        const response = await apiStream('/api/demo/chat/stream', { message, conversation_id: conversationId.current, language });
        if (!response.body) throw new Error('Demo stream unavailable');
        setStatus('streaming'); let result = ''; const reader = response.body.getReader(); const decoder = new TextDecoder();
        while (true) { const { value, done } = await reader.read(); if (done) break; result += decoder.decode(value, { stream: true }); setMessages((current) => current.map((item) => item.id === assistantId ? { ...item, text: result } : item)); }
      } catch (error) {
        const detail = error instanceof Error ? error.message : 'Demo agent unavailable';
        setMessages((current) => current.map((item) => item.id === assistantId ? { ...item, text: `The demo could not respond: ${detail}` } : item));
      } finally { setStatus('ready'); setTrace(baseTrace); }
    })();
  }, [language, status]);
  const startNewConversation = useCallback(() => { conversationId.current = `demo-${crypto.randomUUID()}`; setMessages([{ ...opening(language), id: makeId('assistant') }]); setStatus('ready'); }, [language]);
  const empty = useCallback(async () => undefined, []);
  return { messages, status, trace, latestEvidence: useMemo(() => [], []), conversations: [], activeConversationId: null, isLoadingHistory: false, sendMessage, reset: startNewConversation, refreshConversations: empty, selectConversation: empty, deleteConversation: empty, startNewConversation };
}
