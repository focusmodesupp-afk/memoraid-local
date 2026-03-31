import React, { useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import { apiFetch } from '../lib/api';
import { PageHeader } from '../components/ui';
import { ArrowRightLeft, Plus, X, Calendar, CheckCircle2, Clock, AlertTriangle, Ban } from 'lucide-react';

type ReferralStatus = 'pending' | 'scheduled' | 'completed' | 'cancelled' | 'expired';

type Referral = {
  id: string;
  specialty: string;
  reason: string;
  urgency: 'routine' | 'soon' | 'urgent';
  status: ReferralStatus;
  referringDoctor: string | null;
  scheduledDate: string | null;
  completedDate: string | null;
  notes: string | null;
  sourceDocumentId: string | null;
  linkedTaskId: string | null;
  createdAt: string;
};

type Patient = { id: string; fullName: string };

const STATUS_META: Record<ReferralStatus, { labelHe: string; labelEn: string; badge: string; icon: React.ElementType }> = {
  pending:   { labelHe: 'ממתין לתיאום', labelEn: 'Pending',   badge: 'badge-warning',     icon: Clock },
  scheduled: { labelHe: 'נקבע תור',      labelEn: 'Scheduled', badge: 'badge-primary',     icon: Calendar },
  completed: { labelHe: 'הושלם',          labelEn: 'Completed', badge: 'badge-success',     icon: CheckCircle2 },
  cancelled: { labelHe: 'בוטל',           labelEn: 'Cancelled', badge: 'badge-secondary',   icon: Ban },
  expired:   { labelHe: 'פג תוקף',        labelEn: 'Expired',   badge: 'badge-secondary',   icon: AlertTriangle },
};

const URGENCY_META: Record<string, { labelHe: string; labelEn: string; badge: string }> = {
  urgent:  { labelHe: 'דחוף',   labelEn: 'Urgent',  badge: 'badge-destructive' },
  soon:    { labelHe: 'בקרוב',  labelEn: 'Soon',    badge: 'badge-warning' },
  routine: { labelHe: 'שגרתי',  labelEn: 'Routine', badge: 'badge-secondary' },
};

export default function ReferralsPage() {
  const { dir, lang } = useI18n();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<ReferralStatus | 'all'>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    specialty: '',
    reason: '',
    urgency: 'routine' as 'routine' | 'soon' | 'urgent',
    referringDoctor: '',
    notes: '',
  });

  useEffect(() => {
    apiFetch<Patient>('/patients/primary')
      .then((p) => {
        setPatient(p);
        return apiFetch<Referral[]>(`/patients/${p.id}/referrals`);
      })
      .then(setReferrals)
      .catch(() => setReferrals([]))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.specialty || !form.reason || !patient) return;
    setSubmitting(true);
    setError(null);
    try {
      const created = await apiFetch<Referral>(`/patients/${patient.id}/referrals`, {
        method: 'POST',
        body: JSON.stringify({
          specialty: form.specialty.trim(),
          reason: form.reason.trim(),
          urgency: form.urgency,
          referringDoctor: form.referringDoctor.trim() || null,
          notes: form.notes.trim() || null,
        }),
      });
      setReferrals((prev) => [created, ...prev]);
      setForm({ specialty: '', reason: '', urgency: 'routine', referringDoctor: '', notes: '' });
      setShowForm(false);
    } catch (err) {
      setError((err as Error)?.message ?? 'Failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function updateStatus(id: string, status: ReferralStatus, extraFields?: Record<string, string>) {
    setUpdatingId(id);
    try {
      const updated = await apiFetch<Referral>(`/referrals/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, ...extraFields }),
      });
      setReferrals((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch {
      // ignore
    } finally {
      setUpdatingId(null);
    }
  }

  const filtered = referrals.filter((r) => activeFilter === 'all' || r.status === activeFilter);

  const counts = referrals.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  const filterOptions: Array<{ key: ReferralStatus | 'all'; labelHe: string; labelEn: string }> = [
    { key: 'all',       labelHe: 'הכל',             labelEn: 'All' },
    { key: 'pending',   labelHe: 'ממתין',            labelEn: 'Pending' },
    { key: 'scheduled', labelHe: 'נקבע תור',         labelEn: 'Scheduled' },
    { key: 'completed', labelHe: 'הושלם',             labelEn: 'Completed' },
    { key: 'cancelled', labelHe: 'בוטל / פג תוקף', labelEn: 'Cancelled / Expired' },
  ];

  return (
    <div dir={dir} className="space-y-6">
      <PageHeader
        title={lang === 'he' ? 'הפניות רפואיות' : 'Referrals'}
        subtitle={lang === 'he' ? 'מעקב אחר הפניות לרופאים מומחים' : 'Track specialist referrals from pending to done'}
        actions={
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="btn-primary gap-1.5"
          >
            <Plus className="w-4 h-4" />
            {lang === 'he' ? 'הוסף הפניה' : 'Add referral'}
          </button>
        }
      />

      {/* Filter tabs */}
      <div className={`flex gap-2 flex-wrap ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
        {filterOptions.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setActiveFilter(f.key === 'cancelled' ? ('cancelled' as ReferralStatus) : f.key)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              activeFilter === f.key
                ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] border-[hsl(var(--primary))]'
                : 'border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))]'
            }`}
          >
            {lang === 'he' ? f.labelHe : f.labelEn}
            {f.key !== 'all' && f.key !== 'cancelled' && counts[f.key] ? ` (${counts[f.key]})` : ''}
            {f.key === 'all' && referrals.length > 0 ? ` (${referrals.length})` : ''}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-[hsl(var(--destructive))]/20 bg-[hsl(var(--destructive))]/10 px-4 py-3 text-sm text-[hsl(var(--destructive))]">
          {error}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="section-card space-y-4">
          <div className={`flex items-center justify-between ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
            <h3 className="section-title">{lang === 'he' ? 'הוספת הפניה רפואית' : 'Add referral'}</h3>
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost h-8 w-8 p-0 justify-center" aria-label={lang === 'he' ? 'סגור' : 'Close'}>
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label-base">{lang === 'he' ? 'תחום התמחות' : 'Specialty'} *</label>
              <input
                type="text"
                value={form.specialty}
                onChange={(e) => setForm((f) => ({ ...f, specialty: e.target.value }))}
                className="input-base"
                placeholder={lang === 'he' ? 'למשל: קרדיולוג' : 'e.g. Cardiologist'}
                required
              />
            </div>
            <div>
              <label className="label-base">{lang === 'he' ? 'דחיפות' : 'Urgency'}</label>
              <select
                value={form.urgency}
                onChange={(e) => setForm((f) => ({ ...f, urgency: e.target.value as any }))}
                className="input-base"
              >
                <option value="routine">{lang === 'he' ? 'שגרתי' : 'Routine'}</option>
                <option value="soon">{lang === 'he' ? 'בקרוב' : 'Soon'}</option>
                <option value="urgent">{lang === 'he' ? 'דחוף' : 'Urgent'}</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label-base">{lang === 'he' ? 'סיבת ההפניה' : 'Reason'} *</label>
              <textarea
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                className="input-base min-h-[72px] resize-none"
                rows={2}
                required
              />
            </div>
            <div>
              <label className="label-base">{lang === 'he' ? 'רופא מפנה' : 'Referring doctor'}</label>
              <input
                type="text"
                value={form.referringDoctor}
                onChange={(e) => setForm((f) => ({ ...f, referringDoctor: e.target.value }))}
                className="input-base"
              />
            </div>
            <div>
              <label className="label-base">{lang === 'he' ? 'הערות' : 'Notes'}</label>
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="input-base"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-50">
              {submitting ? (lang === 'he' ? 'שומר...' : 'Saving...') : (lang === 'he' ? 'שמור הפניה' : 'Save referral')}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">
              {lang === 'he' ? 'ביטול' : 'Cancel'}
            </button>
          </div>
        </form>
      )}

      {/* Referrals list */}
      <div className="section-card">
        {loading ? (
          <p className="text-sm text-[hsl(var(--muted-foreground))]">{lang === 'he' ? 'טוען...' : 'Loading...'}</p>
        ) : filtered.length === 0 ? (
          <div className="empty-block">
            <ArrowRightLeft className="h-10 w-10 text-[hsl(var(--muted-foreground))]/40" />
            <p className="font-medium">{lang === 'he' ? 'אין הפניות רפואיות' : 'No referrals'}</p>
            <p className="text-xs">
              {activeFilter !== 'all'
                ? (lang === 'he' ? 'אין הפניות בקטגוריה זו' : 'No referrals in this category')
                : (lang === 'he' ? 'הפניות ייווצרו אוטומטית מניתוח מסמכים רפואיים' : 'Referrals are auto-created from medical document analysis')}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[hsl(var(--border))]">
            {filtered.map((r) => {
              const statusMeta = STATUS_META[r.status];
              const urgencyMeta = URGENCY_META[r.urgency] ?? URGENCY_META.routine;
              const StatusIcon = statusMeta.icon;
              const isUpdating = updatingId === r.id;

              return (
                <li key={r.id} className="py-4">
                  <div className={`flex items-start gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${r.urgency === 'urgent' ? 'bg-[hsl(var(--destructive))]/10' : 'bg-[hsl(var(--primary))]/10'}`}>
                      <StatusIcon className={`w-4 h-4 ${r.urgency === 'urgent' ? 'text-[hsl(var(--destructive))]' : 'text-[hsl(var(--primary))]'}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={`flex items-center gap-2 flex-wrap ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                        <span className="font-semibold text-sm">{r.specialty}</span>
                        <span className={`badge ${urgencyMeta.badge}`}>
                          {lang === 'he' ? urgencyMeta.labelHe : urgencyMeta.labelEn}
                        </span>
                        <span className={`badge ${statusMeta.badge}`}>
                          {lang === 'he' ? statusMeta.labelHe : statusMeta.labelEn}
                        </span>
                      </div>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">{r.reason}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                        {r.referringDoctor && `${lang === 'he' ? 'ד"ר' : 'Dr.'} ${r.referringDoctor} · `}
                        {new Date(r.createdAt).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en')}
                        {r.scheduledDate && ` · ${lang === 'he' ? 'תור' : 'Appt'}: ${new Date(r.scheduledDate).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en')}`}
                      </p>
                      {r.notes && (
                        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5 italic">{r.notes}</p>
                      )}

                      {/* Action buttons based on status */}
                      {(r.status === 'pending' || r.status === 'scheduled') && (
                        <div className={`flex gap-2 mt-2 flex-wrap ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                          {r.status === 'pending' && (
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => updateStatus(r.id, 'scheduled')}
                              className="btn-outline h-7 text-xs gap-1 px-2"
                            >
                              <Calendar className="w-3 h-3" />
                              {lang === 'he' ? 'סמן כנקבע תור' : 'Mark scheduled'}
                            </button>
                          )}
                          {r.status === 'scheduled' && (
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => updateStatus(r.id, 'completed', { completedDate: new Date().toISOString().split('T')[0] })}
                              className="btn-outline h-7 text-xs gap-1 px-2"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              {lang === 'he' ? 'סמן כהושלם' : 'Mark done'}
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => updateStatus(r.id, 'cancelled')}
                            className="btn-ghost h-7 text-xs gap-1 px-2 text-[hsl(var(--muted-foreground))]"
                          >
                            <Ban className="w-3 h-3" />
                            {lang === 'he' ? 'בטל' : 'Cancel'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
