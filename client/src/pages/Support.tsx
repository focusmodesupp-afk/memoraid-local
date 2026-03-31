import React, { useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../lib/api';
import { PageHeader } from '../components/ui';
import { Headphones, Plus, X, Send, ChevronLeft, ChevronRight, MessageCircle } from 'lucide-react';

type TicketStatus = 'open' | 'in_progress' | 'waiting_customer' | 'waiting_for_customer' | 'resolved' | 'closed';
type Priority = 'low' | 'normal' | 'high' | 'urgent';

type Ticket = {
  id: string;
  subject: string;
  category: string;
  description: string;
  status: TicketStatus;
  priority: Priority;
  createdAt: string;
  updatedAt: string;
};

type TicketMessage = {
  id: string;
  body: string;
  authorName: string;
  isStaff: boolean;
  createdAt: string;
};

const STATUS_HE: Record<string, string> = {
  open: 'פתוח', in_progress: 'בטיפול',
  waiting_customer: 'ממתין לתשובתך', waiting_for_customer: 'ממתין לתשובתך',
  resolved: 'נפתר', closed: 'סגור',
};
const STATUS_EN: Record<string, string> = {
  open: 'Open', in_progress: 'In progress',
  waiting_customer: 'Awaiting reply', waiting_for_customer: 'Awaiting reply',
  resolved: 'Resolved', closed: 'Closed',
};
const STATUS_BADGE: Record<string, string> = {
  open: 'badge-primary', in_progress: 'badge-muted',
  waiting_customer: 'badge-primary', waiting_for_customer: 'badge-primary',
  resolved: 'badge-success', closed: 'badge-muted',
};
const PRIORITY_HE: Record<Priority, string> = { low: 'נמוכה', normal: 'רגילה', high: 'גבוהה', urgent: 'דחוף' };
const PRIORITY_EN: Record<Priority, string> = { low: 'Low', normal: 'Normal', high: 'High', urgent: 'Urgent' };
const CATEGORIES_HE = [
  { value: 'general', label: 'כללי' },
  { value: 'billing', label: 'חיוב ותשלום' },
  { value: 'technical', label: 'בעיה טכנית' },
  { value: 'feature', label: 'בקשת תכונה' },
  { value: 'account', label: 'חשבון ופרופיל' },
];
const CATEGORIES_EN = [
  { value: 'general', label: 'General' },
  { value: 'billing', label: 'Billing & Payment' },
  { value: 'technical', label: 'Technical issue' },
  { value: 'feature', label: 'Feature request' },
  { value: 'account', label: 'Account & Profile' },
];

export default function SupportPage() {
  const { dir, lang } = useI18n();
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newForm, setNewForm] = useState({
    subject: '', category: 'general', description: '', priority: 'normal' as Priority,
  });

  useEffect(() => {
    apiFetch<Ticket[]>('/support')
      .then(setTickets)
      .catch(() => setTickets([]))
      .finally(() => setLoading(false));
  }, []);

  async function openTicket(t: Ticket) {
    setSelectedTicket(t);
    setMessagesLoading(true);
    try {
      const msgs = await apiFetch<TicketMessage[]>(`/support/${t.id}/messages`);
      setMessages(msgs);
    } catch {
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  }

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicket) return;
    setSendingReply(true);
    try {
      const msg = await apiFetch<TicketMessage>(`/support/${selectedTicket.id}/reply`, {
        method: 'POST',
        body: JSON.stringify({ body: replyText.trim() }),
      });
      setMessages((prev) => [...prev, msg]);
      setReplyText('');
    } catch {
      // ignore
    } finally {
      setSendingReply(false);
    }
  }

  async function createTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!newForm.subject.trim() || !newForm.description.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const created = await apiFetch<Ticket>('/support', {
        method: 'POST',
        body: JSON.stringify(newForm),
      });
      setTickets((prev) => [created, ...prev]);
      setShowNewForm(false);
      setNewForm({ subject: '', category: 'general', description: '', priority: 'normal' });
    } catch (err) {
      setError((err as Error)?.message ?? 'Failed');
    } finally {
      setSubmitting(false);
    }
  }

  const categories = lang === 'he' ? CATEGORIES_HE : CATEGORIES_EN;
  const statusLabels = lang === 'he' ? STATUS_HE : STATUS_EN;
  const priorityLabels = lang === 'he' ? PRIORITY_HE : PRIORITY_EN;
  const BackIcon = dir === 'rtl' ? ChevronRight : ChevronLeft;

  return (
    <div dir={dir} className="space-y-6">
      {!selectedTicket ? (
        <>
          <PageHeader
            title={lang === 'he' ? 'מרכז תמיכה' : 'Support Center'}
            subtitle={lang === 'he' ? 'פניות ותמיכה טכנית' : 'Get help from our support team'}
            actions={
              <button type="button" onClick={() => setShowNewForm(true)} className="btn-primary gap-1.5">
                <Plus className="w-4 h-4" />
                {lang === 'he' ? 'פנייה חדשה' : 'New ticket'}
              </button>
            }
          />

          {error && (
            <div className="rounded-lg border border-[hsl(var(--destructive))]/20 bg-[hsl(var(--destructive))]/10 px-4 py-3 text-sm text-[hsl(var(--destructive))]">
              {error}
            </div>
          )}

          {showNewForm && (
            <form onSubmit={createTicket} className="section-card space-y-4">
              <div className={`flex items-center justify-between ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                <h3 className="section-title">{lang === 'he' ? 'פנייה חדשה לתמיכה' : 'New support ticket'}</h3>
                <button type="button" onClick={() => setShowNewForm(false)} className="btn-ghost h-8 w-8 p-0 justify-center" aria-label="Close">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="label-base">{lang === 'he' ? 'נושא *' : 'Subject *'}</label>
                  <input
                    type="text"
                    value={newForm.subject}
                    onChange={(e) => setNewForm((f) => ({ ...f, subject: e.target.value }))}
                    className="input-base"
                    placeholder={lang === 'he' ? 'תאר בקצרה את הבעיה' : 'Briefly describe the issue'}
                    required
                  />
                </div>
                <div>
                  <label className="label-base">{lang === 'he' ? 'קטגוריה' : 'Category'}</label>
                  <select
                    value={newForm.category}
                    onChange={(e) => setNewForm((f) => ({ ...f, category: e.target.value }))}
                    className="input-base"
                  >
                    {categories.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label-base">{lang === 'he' ? 'עדיפות' : 'Priority'}</label>
                  <select
                    value={newForm.priority}
                    onChange={(e) => setNewForm((f) => ({ ...f, priority: e.target.value as Priority }))}
                    className="input-base"
                  >
                    {(Object.keys(PRIORITY_HE) as Priority[]).map((p) => (
                      <option key={p} value={p}>{lang === 'he' ? PRIORITY_HE[p] : PRIORITY_EN[p]}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="label-base">{lang === 'he' ? 'תיאור מפורט *' : 'Detailed description *'}</label>
                  <textarea
                    value={newForm.description}
                    onChange={(e) => setNewForm((f) => ({ ...f, description: e.target.value }))}
                    className="input-base min-h-[100px] resize-y"
                    placeholder={lang === 'he' ? 'תאר את הבעיה בפירוט, כולל שלבים לשחזור...' : 'Describe the issue in detail, including steps to reproduce...'}
                    required
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-50">
                  {submitting ? (lang === 'he' ? 'שולח...' : 'Sending...') : (lang === 'he' ? 'שלח פנייה' : 'Submit ticket')}
                </button>
                <button type="button" onClick={() => setShowNewForm(false)} className="btn-ghost">
                  {lang === 'he' ? 'ביטול' : 'Cancel'}
                </button>
              </div>
            </form>
          )}

          {/* Ticket list */}
          <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center p-10">
                <p className="text-sm text-[hsl(var(--muted-foreground))]">{lang === 'he' ? 'טוען...' : 'Loading...'}</p>
              </div>
            ) : tickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-10 text-center">
                <div className="w-14 h-14 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center mb-3">
                  <Headphones className="w-7 h-7 text-[hsl(var(--muted-foreground))]/40" />
                </div>
                <p className="font-medium text-[hsl(var(--foreground))] mb-1">
                  {lang === 'he' ? 'אין פניות עדיין' : 'No tickets yet'}
                </p>
                <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
                  {lang === 'he' ? 'נתקלת בבעיה? הצוות שלנו כאן לעזור' : 'Need help? Our team is here'}
                </p>
                <button type="button" onClick={() => setShowNewForm(true)} className="btn-primary text-sm">
                  {lang === 'he' ? 'פתח פנייה ראשונה' : 'Open first ticket'}
                </button>
              </div>
            ) : (
              <ul className="divide-y divide-[hsl(var(--border))]">
                {tickets.map((t) => {
                  const needsReply = t.status === 'waiting_customer' || t.status === 'waiting_for_customer';
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => openTicket(t)}
                        className={`w-full px-4 py-4 text-start hover:bg-[hsl(var(--muted))]/30 transition-colors ${needsReply ? 'bg-[hsl(var(--primary))]/5' : ''}`}
                      >
                        <div className={`flex items-start gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                          <div className="w-9 h-9 rounded-lg bg-[hsl(var(--muted))]/50 flex items-center justify-center shrink-0 mt-0.5">
                            <MessageCircle className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className={`flex items-center gap-2 flex-wrap mb-0.5 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                              <span className="font-medium text-sm text-[hsl(var(--foreground))]">{t.subject}</span>
                              <span className={`badge ${STATUS_BADGE[t.status] ?? 'badge-muted'}`}>
                                {statusLabels[t.status] ?? t.status}
                              </span>
                              {t.priority === 'high' || t.priority === 'urgent' ? (
                                <span className="badge badge-destructive">{priorityLabels[t.priority]}</span>
                              ) : null}
                            </div>
                            {needsReply && (
                              <p className="text-xs font-medium text-[hsl(var(--primary))] mb-0.5">
                                {lang === 'he' ? 'הצוות ממתין לתשובתך' : 'Team awaiting your reply'}
                              </p>
                            )}
                            <p className="text-xs text-[hsl(var(--muted-foreground))]">
                              {lang === 'he' ? 'עודכן' : 'Updated'}:{' '}
                              {new Date(t.updatedAt).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en')}
                            </p>
                          </div>
                          <BackIcon className="w-4 h-4 text-[hsl(var(--muted-foreground))] shrink-0 mt-1" />
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      ) : (
        /* Thread view */
        <>
          <div className={`flex items-center gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
            <button
              type="button"
              onClick={() => setSelectedTicket(null)}
              className="btn-ghost gap-1.5 text-sm"
            >
              <BackIcon className="w-4 h-4" />
              {lang === 'he' ? 'חזרה לרשימה' : 'Back to list'}
            </button>
          </div>

          <div className="section-card space-y-1">
            <div className={`flex items-start justify-between gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
              <div>
                <h2 className="font-bold text-lg text-[hsl(var(--foreground))]">{selectedTicket.subject}</h2>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  {categories.find((c) => c.value === selectedTicket.category)?.label ?? selectedTicket.category}
                  {' · '}
                  {lang === 'he' ? 'עדיפות' : 'Priority'}: {priorityLabels[selectedTicket.priority]}
                </p>
              </div>
              <span className={`badge ${STATUS_BADGE[selectedTicket.status] ?? 'badge-muted'} shrink-0`}>
                {statusLabels[selectedTicket.status] ?? selectedTicket.status}
              </span>
            </div>
            <div className="pt-2 border-t border-[hsl(var(--border))]">
              <p className="text-sm text-[hsl(var(--foreground))]">{selectedTicket.description}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-2">
                {new Date(selectedTicket.createdAt).toLocaleString(lang === 'he' ? 'he-IL' : 'en', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            </div>
          </div>

          {/* Messages thread */}
          <div className="space-y-3">
            {messagesLoading ? (
              <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-4">
                {lang === 'he' ? 'טוען הודעות...' : 'Loading messages...'}
              </p>
            ) : messages.length === 0 ? (
              <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-4">
                {lang === 'he' ? 'אין תגובות עדיין' : 'No replies yet'}
              </p>
            ) : (
              messages.map((m) => {
                const isUser = !m.isStaff;
                return (
                  <div
                    key={m.id}
                    className={`flex gap-3 ${isUser
                      ? (dir === 'rtl' ? 'flex-row' : 'flex-row-reverse')
                      : (dir === 'rtl' ? 'flex-row-reverse' : 'flex-row')
                    }`}
                  >
                    <div className={`max-w-[80%] rounded-xl px-4 py-3 text-sm ${
                      isUser
                        ? 'bg-[hsl(var(--primary))] text-white rounded-tr-sm'
                        : 'bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] rounded-tl-sm'
                    }`}>
                      {m.isStaff && (
                        <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] mb-1">
                          {m.authorName} · {lang === 'he' ? 'צוות תמיכה' : 'Support team'}
                        </p>
                      )}
                      <p className="whitespace-pre-wrap">{m.body}</p>
                      <p className={`text-xs mt-1.5 ${isUser ? 'text-white/70' : 'text-[hsl(var(--muted-foreground))]'}`}>
                        {new Date(m.createdAt).toLocaleString(lang === 'he' ? 'he-IL' : 'en', { timeStyle: 'short', dateStyle: 'short' })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Reply box */}
          {selectedTicket.status !== 'closed' && selectedTicket.status !== 'resolved' && (
            <form onSubmit={sendReply} className="section-card">
              <label className="label-base mb-2">{lang === 'he' ? 'הוסף תגובה' : 'Add reply'}</label>
              <div className={`flex gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="input-base flex-1 min-h-[72px] resize-y"
                  placeholder={lang === 'he' ? 'כתוב תגובה...' : 'Write a reply...'}
                  rows={3}
                />
                <button
                  type="submit"
                  disabled={sendingReply || !replyText.trim()}
                  aria-label={lang === 'he' ? 'שלח' : 'Send'}
                  className="btn-primary h-10 w-10 p-0 justify-center self-end shrink-0 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}
