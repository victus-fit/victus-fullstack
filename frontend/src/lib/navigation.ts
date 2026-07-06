import { useEffect, useState } from 'react';

export type AppRoute = 'landing' | 'login' | 'register' | 'app';

function routeFromPath(pathname: string): AppRoute {
  if (pathname.startsWith('/login')) return 'login';
  if (pathname.startsWith('/register')) return 'register';
  if (pathname.startsWith('/app')) return 'app';
  return 'landing';
}

export function navigate(path: string) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function useRoute(): AppRoute {
  const [route, setRoute] = useState<AppRoute>(() => routeFromPath(window.location.pathname));

  useEffect(() => {
    const onPopState = () => setRoute(routeFromPath(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  return route;
}
