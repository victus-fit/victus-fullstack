const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(status: number, message: string, payload: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

function readCookie(name: string): string | null {
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${encodeURIComponent(name)}=`));
  if (!match) return null;
  return decodeURIComponent(match.split('=').slice(1).join('='));
}

function csrfToken(): string | null {
  return readCookie('victus_csrf');
}

function readableDetail(detail: unknown): string {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === 'object' && item !== null && 'loc' in item && 'msg' in item) {
          const loc = Array.isArray((item as { loc?: unknown }).loc) ? (item as { loc: unknown[] }).loc.join('.') : 'request';
          return `${loc}: ${String((item as { msg?: unknown }).msg)}`;
        }
        return JSON.stringify(item);
      })
      .join(' · ');
  }
  if (detail && typeof detail === 'object') return JSON.stringify(detail);
  return 'Request failed';
}

async function parseError(response: Response): Promise<ApiError> {
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = await response.text().catch(() => null);
  }

  const message =
    typeof payload === 'object' && payload !== null && 'detail' in payload
      ? readableDetail((payload as { detail?: unknown }).detail)
      : `Request failed with status ${response.status}`;

  return new ApiError(response.status, message, payload);
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = init.method?.toUpperCase() ?? 'GET';
  const headers = new Headers(init.headers);

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrf = csrfToken();
    if (csrf) headers.set('X-CSRF-Token', csrf);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    method,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function apiStream(path: string, payload: unknown): Promise<Response> {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  const csrf = csrfToken();
  if (csrf) headers.set('X-CSRF-Token', csrf);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    credentials: 'include',
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  return response;
}

export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}
