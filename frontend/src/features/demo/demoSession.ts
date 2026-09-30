let activeDemoSessionId: string | null = null;

export function startDemoSession(): string {
  activeDemoSessionId = crypto.randomUUID();
  return activeDemoSessionId;
}

export function endDemoSession(sessionId: string): void {
  if (activeDemoSessionId === sessionId) activeDemoSessionId = null;
}

export function demoRequest(path: string): { path: string; sessionId: string } | null {
  if (!activeDemoSessionId || !path.startsWith('/api/')) return null;
  if (path === '/api/demo/chat/stream') return { path, sessionId: activeDemoSessionId };
  const demoPath = path
    .replace(/^\/api\/users\/me\/(health-overview|metrics)/, '/api/demo/users/me/$1')
    .replace(/^\/api\/meal-logs/, '/api/demo/meal-logs')
    .replace(/^\/api\/meal-log-entries/, '/api/demo/meal-log-entries')
    .replace(/^\/api\/foods/, '/api/demo/foods');
  return demoPath === path ? null : { path: demoPath, sessionId: activeDemoSessionId };
}
