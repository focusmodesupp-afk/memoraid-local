import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'wouter';
import { useI18n } from '../i18n';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../lib/api';
import { PageHeader } from '../components/ui';
import { Inbox, Info, Headphones, AlertTriangle, ExternalLink, Plus } from 'lucide-react';

type SystemMessage = {
  id: string;
  title: string;
  body: string | null;
  type: string;
  createdAt: string;
};

type SupportTicket = {
  id: string;
  subject: string;
  status: string;
  priority: string;
  category: string;
  createdAt: string;
  updatedAt: string;
};

const TICKET_STATUS_HE: Record<string, string> = {
  open: 'פתוח',
  in_progress: 'בטיפול',
  waiting_customer: 'ממתין לתשובתך',
  waiting_for_customer: 'ממתין לתשובתך',
  resolved: 'נפתר',
  closed: 'סגור',
};
const TICKET_STATUS_EN: Record<string, string> = {
  open: 'Open',
  in_progress: 'In progress',
  waiting_customer: 'Awaiting reply',
  waiting_for_customer: 'Awaiting reply',
  resolved: 'Resolved',
  closed: 'Closed',
};
const TICKET_STATUS_BADGE: Record<string, string> = {
  open: 'badge-primary',
  in_progress: 'badge-muted',
  waiting_customer: 'badge-primary',
  waiting_for_customer: 'badge-primary',
  resolved: 'badge-success',
  closed: 'badge-muted',
};

export default function InboxPage() {
  const { dir, lang } = useI18n();
  const { user } = useAuth();
  const [tab, setTab] = useState<'system' | 'support'>('system');

  const [systemMessages, setSystemMessages] = useState<SystemMessage[]>([]);
  const [systemLoading, setSystemLoading] = useState(false);

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);

  const loadSystem = useCallback(async () => {
    if (!user) return;
    setSystemLoading(true);
    try {
      const data = await apiFetch<SystemMessage[]>('/system-messages');
      setSystemMessages(data);
    } catch {
      setSystemMessages([]);
    } finally {
      setSystemLoading(false);
    }
  }, [user]);

  const loadTickets = useCallback(async () => {
    if (!user) return;
    setTicketsLoading(true);
    try {
      const data = await apiFetch<SupportTicket[]>('/support');
      setTickets(data);
    } catch {
      setTickets([]);
    } finally {
      setTicketsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (tab === 'system') loadSystem();
    if (tab === 'support') loadTickets();
  }, [tab, loadSystem, loadTickets]);

  const pendingTickets = tickets.filter(
    (t) => t.status === 'open' || t.status === 'waiting_customer' || t.status === 'waiting_for_customer'
  ).length;

  return (
    <div dir={dir} className="space-y-6">
      <PageHeader
        title={lang === 'he' ? 'הודעות' : 'Inbox'}
        subtitle={lang === 'he' ? 'הודעות מערכת ופניות תמיכה' : 'System messages and support tickets'}
      />

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-[hsl(var(--muted)/0.4)] border border-[hsl(var(--border))] w-fit">
        <button
          type="button"
          onClick={() => setTab('system')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'system'
              ? 'bg-[hsl(var(--background))] text-[hsl(var(--primary))] shadow-sm'
              : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted)/0.5)]'
          }`}
        >
          <Info className="w-4 h-4" />
          {lang === 'he' ? 'הודעות מערכת' : 'System messages'}
        </button>
        <button
          type="button"
          onClick={() => setTab('support')}
          className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'support'
              ? 'bg-[hsl(var(--background))] text-[hsl(var(--primary))] shadow-sm'
              : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted)/0.5)]'
          }`}
        >
          <Headphones className="w-4 h-4" />
          {lang === 'he' ? 'פניות תמיכה' : 'Support tickets'}
          {pendingTickets > 0 && (
            <span className="min-w-[18px] h-[18px] rounded-full bg-[hsl(var(--destructive))] text-[10px] font-bold text-white flex items-center justify-center px-1">
              {pendingTickets}
            </span>
          )}
        </button>
      </div>

      {/* System messages */}
      {tab === 'system' && (
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] min-h-[320px] flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30">
            <p className="text-sm font-medium text-[hsl(var(--foreground))]">
              {lang === 'he' ? 'הודעות ועדכונים מ-MEMORAID' : 'Updates and messages from MEMORAID'}
            </p>
          </div>
          {systemLoading ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <p className="text-sm text-[hsl(var(--muted-foreground))]">{lang === 'he' ? 'טוען...' : 'Loading...'}</p>
            </div>
          ) : systemMessages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-14 h-14 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center mb-3">
                <Info className="w-7 h-7 text-[hsl(var(--muted-foreground))] opacity-40" />
              </div>
              <p className="font-medium text-[hsl(var(--foreground))] mb-1">
                {lang === 'he' ? 'אין הודעות מערכת' : 'No system messages'}
              </p>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                {lang === 'he' ? 'עדכונים ושינויים בפלטפורמה יופיעו כאן' : 'Platform updates will appear here'}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-[hsl(var(--border))]">
              {systemMessages.map((m) => (
                <li key={m.id} className="px-4 py-4">
                  <div className={`flex items-start gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                    <div className="w-9 h-9 rounded-lg bg-[hsl(var(--primary))]/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Info className="w-4 h-4 text-[hsl(var(--primary))]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm text-[hsl(var(--foreground))]">{m.title}</p>
                      {m.body && <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">{m.body}</p>}
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1.5">
                        {new Date(m.createdAt).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en')}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Support tickets */}
      {tab === 'support' && (
        <div className="space-y-4">
          <div className={`flex items-center justify-between gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              {lang === 'he' ? 'פניות שפתחת לצוות התמיכה' : 'Your open requests to the support team'}
            </p>
            <Link href="/support">
              <span className={`inline-flex items-center gap-1.5 text-sm font-medium text-[hsl(var(--primary))] hover:underline ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                <Plus className="w-3.5 h-3.5" />
                {lang === 'he' ? 'פנייה חדשה' : 'New ticket'}
              </span>
            </Link>
          </div>

          <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] min-h-[280px] flex flex-col overflow-hidden">
            {ticketsLoading ? (
              <div className="flex-1 flex items-center justify-center p-8">
                <p className="text-sm text-[hsl(var(--muted-foreground))]">{lang === 'he' ? 'טוען...' : 'Loading...'}</p>
              </div>
            ) : tickets.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-14 h-14 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center mb-3">
                  <Headphones className="w-7 h-7 text-[hsl(var(--muted-foreground))] opacity-40" />
                </div>
                <p className="font-medium text-[hsl(var(--foreground))] mb-1">
                  {lang === 'he' ? 'אין פניות פתוחות' : 'No open tickets'}
                </p>
                <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
                  {lang === 'he' ? 'נתקלת בבעיה? הצוות שלנו כאן לעזור' : 'Need help? Our team is here'}
                </p>
                <Link href="/support">
                  <span className="btn-primary text-sm px-4 py-2 inline-flex items-center gap-1.5 rounded-lg">
                    {lang === 'he' ? 'פתח פנייה חדשה' : 'Open a ticket'}
                    <ExternalLink className="w-3.5 h-3.5" />
                  </span>
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-[hsl(var(--border))]">
                {tickets.map((t) => {
                  const statusLabels = lang === 'he' ? TICKET_STATUS_HE : TICKET_STATUS_EN;
                  const badgeClass = TICKET_STATUS_BADGE[t.status] ?? 'badge-muted';
                  const needsReply = t.status === 'waiting_customer' || t.status === 'waiting_for_customer';
                  return (
                    <li key={t.id} className={`px-4 py-4 ${needsReply ? 'bg-[hsl(var(--primary))]/5' : ''}`}>
                      <div className={`flex items-start gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                        {needsReply && <AlertTriangle className="w-4 h-4 text-[hsl(var(--warning))] shrink-0 mt-0.5" />}
                        <div className="min-w-0 flex-1">
                          <div className={`flex items-center gap-2 flex-wrap mb-1 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                            <p className="font-medium text-sm text-[hsl(var(--foreground))]">{t.subject}</p>
                            <span className={`badge ${badgeClass}`}>{statusLabels[t.status] ?? t.status}</span>
                          </div>
                          {needsReply && (
                            <p className="text-xs font-medium text-[hsl(var(--warning))] mb-1">
                              {lang === 'he' ? 'הצוות ממתין לתשובתך' : 'Team is waiting for your reply'}
                            </p>
                          )}
                          <p className="text-xs text-[hsl(var(--muted-foreground))]">
                            {lang === 'he' ? 'עודכן' : 'Updated'}:{' '}
                            {new Date(t.updatedAt).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en')}
                          </p>
                        </div>
                        <Link href="/support">
                          <span className="text-xs text-[hsl(var(--primary))] hover:underline shrink-0">
                            {lang === 'he' ? 'צפה' : 'View'}
                          </span>
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
