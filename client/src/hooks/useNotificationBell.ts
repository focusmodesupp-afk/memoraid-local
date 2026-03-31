import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';

export type NotificationItem = {
  id: string;
  title: string;
  body: string | null;
  type: string;
  readAt: string | null;
  createdAt: string;
};

type Summary = {
  unreadCount: number;
  recent: NotificationItem[];
};

export function useNotificationBell() {
  const [summary, setSummary] = useState<Summary>({ unreadCount: 0, recent: [] });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await apiFetch<Summary>('/notifications/summary');
      setSummary(data);
    } catch {
      setSummary({ unreadCount: 0, recent: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, [refresh]);

  async function markAsRead(id: string) {
    try {
      await apiFetch('/notifications/' + id + '/read', { method: 'PATCH' });
      setSummary((s) => ({
        unreadCount: Math.max(0, s.unreadCount - 1),
        recent: s.recent.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
      }));
    } catch {}
  }

  return { unreadCount: summary.unreadCount, recent: summary.recent, loading, refresh, markAsRead };
}
