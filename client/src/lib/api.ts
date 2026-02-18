export type ApiError = { error: string };

const API_BASE = '/api';

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
    ...options,
  });

  const data = (await res.json().catch(() => ({}))) as T | ApiError;

  if (!res.ok) {
    const message = (data as ApiError)?.error ?? 'Request failed';
    throw new Error(message);
  }

  return data as T;
}

