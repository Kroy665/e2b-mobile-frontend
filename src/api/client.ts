import { API_V1 } from './config';
import { clearStoredTokens, getStoredTokens, setStoredTokens } from '@/utils/storage';
import type { ApiErrorShape } from '@/types/api';

export class ApiError extends Error {
  code: string;
  status: number;
  details?: Record<string, unknown>;
  requestId?: string;

  constructor(status: number, shape: ApiErrorShape['error']) {
    super(shape.message);
    this.name = 'ApiError';
    this.status = status;
    this.code = shape.code;
    this.details = shape.details;
    this.requestId = shape.requestId;
  }
}

type Listener = () => void;
const unauthorizedListeners = new Set<Listener>();
export function onUnauthorized(listener: Listener): () => void {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}
function notifyUnauthorized() {
  unauthorizedListeners.forEach((l) => l());
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const { refreshToken } = await getStoredTokens();
    if (!refreshToken) return null;

    try {
      const res = await fetch(`${API_V1}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) {
        await clearStoredTokens();
        notifyUnauthorized();
        return null;
      }
      const body = await res.json();
      const data = body?.data ?? body;
      const accessToken: string | undefined = data.accessToken;
      const newRefreshToken: string = data.refreshToken ?? refreshToken;
      if (!accessToken) {
        await clearStoredTokens();
        notifyUnauthorized();
        return null;
      }
      await setStoredTokens(accessToken, newRefreshToken);
      return accessToken;
    } catch {
      return null;
    }
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  auth?: boolean;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(`${API_V1}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function performRequest<T>(path: string, opts: RequestOptions, accessToken: string | null): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...opts.headers,
  };
  if (opts.auth !== false && accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const res = await fetch(buildUrl(path, opts.query), {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  const body = text ? JSON.parse(text) : undefined;

  if (!res.ok) {
    const shape: ApiErrorShape['error'] = body?.error ?? {
      code: 'UNKNOWN_ERROR',
      message: res.statusText || 'Request failed',
    };
    throw new ApiError(res.status, shape);
  }

  // Successful responses are consistently wrapped as { data: <payload> }.
  return (body?.data ?? body) as T;
}

export async function apiRequest<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { accessToken } = await getStoredTokens();

  if (opts.auth === false) {
    return performRequest<T>(path, opts, null);
  }

  try {
    return await performRequest<T>(path, opts, accessToken);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401 && accessToken) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        return performRequest<T>(path, opts, newToken);
      }
    }
    throw err;
  }
}

export const api = {
  get: <T>(path: string, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...opts, method: 'GET' }),
  post: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...opts, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...opts, method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...opts, method: 'PUT', body }),
  delete: <T>(path: string, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...opts, method: 'DELETE' }),
};
