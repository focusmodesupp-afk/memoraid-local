export type ApiErrorResponse = { error: string };

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const API_BASE = '/api';

/** Bypass כבוי – עובד עם אימות ו-DB אמיתיים (Supabase). */
export function isDevBypassActive(): boolean {
  return false;
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> ?? {}),
  };
  if (typeof window !== 'undefined' && path !== '/auth/login' && path !== '/auth/register') {
    const activeFamily = localStorage.getItem('mr_active_family');
    if (activeFamily) headers['X-Active-Family'] = activeFamily;
  }
  if (isDevBypassActive()) {
    if (path.startsWith('/admin')) headers['X-Dev-Bypass'] = '1';
    else headers['X-Dev-Bypass-User'] = '1';
  }
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers,
    ...options,
  });

  const data = (await res.json().catch(() => ({}))) as T | ApiErrorResponse;

  if (!res.ok) {
    const message = (data as ApiErrorResponse)?.error ?? res.statusText ?? 'Request failed';
    // Don't spam console for expected 401 on session-check endpoints
    if (!(res.status === 401 && (path.endsWith('/auth/me') || path.endsWith('/admin/auth/me')))) {
      console.error('API error', path, data);
    }
    throw new ApiError(message, res.status, data);
  }
  return data as T;
}

/**
 * Raw fetch that returns the Response object without consuming the body.
 * Use for SSE/streaming endpoints where you need resp.body.getReader().
 */
export async function apiFetchRaw(path: string, options?: RequestInit): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> ?? {}),
  };
  if (typeof window !== 'undefined') {
    const activeFamily = localStorage.getItem('mr_active_family');
    if (activeFamily) headers['X-Active-Family'] = activeFamily;
  }
  if (isDevBypassActive() && path.startsWith('/admin')) {
    headers['X-Dev-Bypass'] = '1';
  }
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers,
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new ApiError(text || res.statusText || 'Request failed', res.status);
  }
  return res;
}

/** Upload file to admin AI – multipart/form-data, returns { mediaId, url, originalName, mimeType, sizeBytes, type } */
export async function apiUploadAdminFile(path: string, file: File): Promise<{
  mediaId: string;
  url: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  type: string;
}> {
  const formData = new FormData();
  formData.append('file', file);
  const headers: Record<string, string> = {};
  if (typeof window !== 'undefined') {
    const activeFamily = localStorage.getItem('mr_active_family');
    if (activeFamily) headers['X-Active-Family'] = activeFamily;
    if (path.startsWith('/admin') && isDevBypassActive()) {
      headers['X-Dev-Bypass'] = '1';
    }
  }
  const res = await fetch(`/api${path}`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError((data as ApiErrorResponse)?.error ?? 'Upload failed', res.status, data);
  return data as { mediaId: string; url: string; originalName: string; mimeType: string; sizeBytes: number; type: string };
}

