import { createAuthClient } from 'better-auth/react';

export const AUTH_BASE_URL = import.meta.env.VITE_AUTH_BASE_URL ?? 'http://localhost:8001';

export const authClient = createAuthClient({
  baseURL: AUTH_BASE_URL,
});
