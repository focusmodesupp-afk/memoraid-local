import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiFetch } from '../api';

describe('apiFetch', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('throws when response is not ok', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Unauthorized' }),
    } as Response);

    await expect(apiFetch('/test')).rejects.toThrow();
  });

  it('returns data when response is ok', async () => {
    const mockFetch = vi.mocked(fetch);
    const expected = { id: 1, name: 'test' };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => expected,
    } as Response);

    const result = await apiFetch<typeof expected>('/test');
    expect(result).toEqual(expected);
  });
});
