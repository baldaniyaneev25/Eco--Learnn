import { API_URL } from './config';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

let authToken: string | null = null;

/** Set by the auth state; attached to every request as a Bearer token. */
export function setAuthToken(token: string | null) {
  authToken = token;
}

/**
 * Calls the EcoLearn web backend. The app never talks to the database directly.
 * Network failures and timeouts become ApiError with status 0.
 */
export async function api<T>(path: string, init: { method?: string; json?: unknown; timeoutMs?: number } = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), init.timeoutMs ?? 15_000);
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: init.method ?? 'GET',
      headers: {
        accept: 'application/json',
        ...(init.json !== undefined ? { 'content-type': 'application/json' } : {}),
        ...(authToken ? { authorization: `Bearer ${authToken}` } : {}),
      },
      body: init.json !== undefined ? JSON.stringify(init.json) : undefined,
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(`Cannot reach the server at ${API_URL}`, 0);
  } finally {
    clearTimeout(timer);
  }
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new ApiError(data.error ?? `Request failed (${res.status})`, res.status);
  return data as T;
}

export function query(params: Record<string, string | number | undefined | null>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  return entries.length ? `?${entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&')}` : '';
}
