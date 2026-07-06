export const aiSdkIntegrationNotes = {
  status: 'prepared-not-active-in-demo',
  reason:
    'The visual demo uses a local mock stream so the frontend can run without FastAPI. When FastAPI exposes an AI-SDK-compatible /api/chat endpoint, replace useMockVictusChat with useChat from @ai-sdk/react and DefaultChatTransport from ai.',
  futureTransport: {
    package: '@ai-sdk/react + ai',
    endpoint: '/api/chat',
    credentials: 'include',
  },
} as const;
