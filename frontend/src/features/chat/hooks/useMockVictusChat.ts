import { useCallback, useMemo, useRef, useState } from 'react';
import { buildDemoAnswer, openingAssistantMessage } from '../data/demoResponses';
import type { ChatMessageModel, ChatStatus, TraceStep, VictusChatController } from '../types';
import { baseTrace, makeId, nowLabel, traceWith } from './chatShared';

export function useMockVictusChat(): VictusChatController {
  const [messages, setMessages] = useState<ChatMessageModel[]>([
    {
      id: 'assistant-opening',
      role: 'assistant',
      text: openingAssistantMessage,
      createdAt: nowLabel(),
    },
  ]);
  const [status, setStatus] = useState<ChatStatus>('ready');
  const [trace, setTrace] = useState<TraceStep[]>(baseTrace);
  const activeRunRef = useRef(0);

  const sendMessage = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed || status !== 'ready') return;

    const runId = activeRunRef.current + 1;
    activeRunRef.current = runId;
    const answer = buildDemoAnswer(trimmed);
    const assistantId = makeId('assistant');

    setMessages((current) => [
      ...current,
      {
        id: makeId('user'),
        role: 'user',
        text: trimmed,
        createdAt: nowLabel(),
      },
    ]);

    setStatus('submitted');
    setTrace(traceWith(0));

    window.setTimeout(() => {
      if (activeRunRef.current !== runId) return;
      setTrace(traceWith(1));
    }, 260);

    window.setTimeout(() => {
      if (activeRunRef.current !== runId) return;
      setTrace(traceWith(2));
      setStatus('streaming');
      setMessages((current) => [
        ...current,
        {
          id: assistantId,
          role: 'assistant',
          text: '',
          createdAt: nowLabel(),
        },
      ]);

      const tokens = answer.text.split(/(\s+)/);
      let index = 0;

      const interval = window.setInterval(() => {
        if (activeRunRef.current !== runId) {
          window.clearInterval(interval);
          return;
        }

        index += 2;
        const partial = tokens.slice(0, index).join('');

        setMessages((current) =>
          current.map((message) =>
            message.id === assistantId
              ? {
                  ...message,
                  text: partial,
                  evidence: index >= tokens.length ? answer.evidence : undefined,
                }
              : message,
          ),
        );

        if (index >= tokens.length) {
          window.clearInterval(interval);
          setStatus('ready');
          setTrace(baseTrace.map((step) => ({ ...step, state: 'done' })));
        }
      }, 24);
    }, 540);
  }, [status]);

  const reset = useCallback(() => {
    activeRunRef.current += 1;
    setStatus('ready');
    setTrace(baseTrace);
    setMessages([
      {
        id: 'assistant-opening',
        role: 'assistant',
        text: openingAssistantMessage,
        createdAt: nowLabel(),
      },
    ]);
  }, []);

  const latestEvidence = useMemo(() => {
    return [...messages].reverse().find((message) => message.evidence?.length)?.evidence ?? [];
  }, [messages]);

  return {
    messages,
    status,
    trace,
    latestEvidence,
    conversations: [],
    activeConversationId: null,
    isLoadingHistory: false,
    sendMessage,
    reset,
    refreshConversations: async () => undefined,
    selectConversation: async () => undefined,
    startNewConversation: reset,
  };
}
