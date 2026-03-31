import React, { useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../lib/api';
import { Pill, Plus, X, Edit2, CheckCircle2, AlertTriangle, Clock, History } from 'lucide-react';

type Medication = {
  id: string;
  name: string;
  genericName: string | null;
  dosage: string | null;
  frequency: string | null;
  timing: string[] | null;
  startDate: string | null;
  endDate: string | null;
  prescribingDoctor: string | null;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
};

type DoseLog = {
  medicationId: string;
  takenAt: string;
  takenByName: string;
  status: 'taken' | 'skipped';
};

type Patient = { id: string; fullName: string };

const RECENT_DOSE_WINDOW_MS = 3 * 60 * 60 * 1000; // 3 hours

export default function MedicationsPage() {
  const { dir, lang } = useI18n();
  const { user } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [list, setList] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    dosage: '',
    frequency: '',
    prescribingDoctor: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doseLogs, setDoseLogs] = useState<DoseLog[]>([]);
  const [markingId, setMarkingId] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Patient>('/patients/primary')
      .then((p) => {
        setPatient(p);
        return apiFetch<Medication[]>(`/patients/${p.id}/medications`);
      })
      .then(setList)
      .catch(() => {
        setPatient(null);
        setList([]);
      })
      .finally(() => setLoading(false));
  }, []);

  function getRecentLog(medicationId: string): DoseLog | undefined {
    const now = Date.now();
    return doseLogs
      .filter((l) => l.medicationId === medicationId && Date.now() - new Date(l.takenAt).getTime() < RECENT_DOSE_WINDOW_MS)
      .sort((a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime())[0];
  }

  async function markDose(medicationId: string, status: 'taken' | 'skipped') {
    setMarkingId(medicationId);
    try {
      await apiFetch(`/medications/${medicationId}/log`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      });
    } catch {
      // API may not exist yet – record locally only
    } finally {
      const newLog: DoseLog = {
        medicationId,
        takenAt: new Date().toISOString(),
        takenByName: user?.fullName ?? (lang === 'he' ? 'לא ידוע' : 'Unknown'),
        status,
      };
      setDoseLogs((prev) => [newLog, ...prev]);
      setMarkingId(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!patient || !form.name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      if (editingId) {
        const updated = await apiFetch<Medication>(`/medications/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: form.name.trim(),
            dosage: form.dosage.trim() || null,
            frequency: form.frequency.trim() || null,
            prescribingDoctor: form.prescribingDoctor.trim() || null,
            notes: form.notes.trim() || null,
          }),
        });
        setList((prev) => prev.map((m) => (m.id === editingId ? updated : m)));
        setEditingId(null);
      } else {
        const created = await apiFetch<Medication>(`/patients/${patient.id}/medications`, {
          method: 'POST',
          body: JSON.stringify({
            name: form.name.trim(),
            dosage: form.dosage.trim() || null,
            frequency: form.frequency.trim() || null,
            prescribingDoctor: form.prescribingDoctor.trim() || null,
            notes: form.notes.trim() || null,
          }),
        });
        setList((prev) => [created, ...prev]);
      }
      setForm({ name: '', dosage: '', frequency: '', prescribingDoctor: '', notes: '' });
      setShowForm(false);
    } catch (err) {
      setError((err as Error)?.message ?? 'Failed');
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(m: Medication) {
    setForm({
      name: m.name,
      dosage: m.dosage || '',
      frequency: m.frequency || '',
      prescribingDoctor: m.prescribingDoctor || '',
      notes: m.notes || '',
    });
    setEditingId(m.id);
    setShowForm(true);
  }

  async function handleDelete(id: string) {
    if (!confirm(lang === 'he' ? 'למחוק תרופה זו?' : 'Delete this medication?')) return;
    try {
      await apiFetch(`/medications/${id}`, { method: 'DELETE' });
      setList((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      setError((err as Error)?.message ?? 'Failed to delete');
    }
  }

  if (loading) {
    return (
      <div dir={dir} className="flex min-h-[200px] items-center justify-center">
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          {lang === 'he' ? 'טוען...' : 'Loading...'}
        </p>
      </div>
    );
  }

  if (!patient) {
    return (
      <div dir={dir} className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 text-center">
        <p className="text-[hsl(var(--muted-foreground))]">
          {lang === 'he' ? 'אין מטופל ראשי. הוסף מטופל בדף פרופיל מטופל.' : 'No primary patient. Add one on the Patient profile page.'}
        </p>
      </div>
    );
  }

  return (
    <div dir={dir} className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--primary))]/10 shrink-0">
            <Pill className="h-5 w-5 text-[hsl(var(--primary))]" />
          </div>
          <div>
            <h2 className="page-title">{lang === 'he' ? 'תרופות' : 'Medications'}</h2>
            <p className="page-subtitle">
              {lang === 'he' ? `רשימת תרופות קבועות עבור ${patient.fullName}` : `Medication list for ${patient.fullName}`}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setForm({ name: '', dosage: '', frequency: '', prescribingDoctor: '', notes: '' });
            setEditingId(null);
            setShowForm(true);
          }}
          className="btn-primary gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          {lang === 'he' ? 'הוסף תרופה' : 'Add medication'}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-[hsl(var(--destructive))]/20 bg-[hsl(var(--destructive))]/10 px-4 py-3 text-sm text-[hsl(var(--destructive))]">
          {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="section-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="section-title">
              {editingId ? (lang === 'he' ? 'עריכת תרופה' : 'Edit medication') : (lang === 'he' ? 'תרופה חדשה' : 'New medication')}
            </h3>
            <button
              type="button"
              onClick={() => { setShowForm(false); setEditingId(null); }}
              className="btn-ghost h-8 w-8 p-0 justify-center"
              aria-label={lang === 'he' ? 'סגור' : 'Close'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label-base">{lang === 'he' ? 'שם התרופה' : 'Medication name'} *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="input-base"
                placeholder={lang === 'he' ? 'לדוגמה: אספירין 100mg' : 'e.g. Aspirin 100mg'}
                required
              />
            </div>
            <div>
              <label className="label-base">{lang === 'he' ? 'מינון' : 'Dosage'}</label>
              <input
                type="text"
                value={form.dosage}
                onChange={(e) => setForm((f) => ({ ...f, dosage: e.target.value }))}
                className="input-base"
                placeholder="100mg"
              />
            </div>
            <div>
              <label className="label-base">{lang === 'he' ? 'תדירות' : 'Frequency'}</label>
              <input
                type="text"
                value={form.frequency}
                onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value }))}
                className="input-base"
                placeholder={lang === 'he' ? 'פעמיים ביום' : 'Twice daily'}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label-base">{lang === 'he' ? 'רופא ממליץ' : 'Prescribing doctor'}</label>
              <input
                type="text"
                value={form.prescribingDoctor}
                onChange={(e) => setForm((f) => ({ ...f, prescribingDoctor: e.target.value }))}
                className="input-base"
                placeholder={lang === 'he' ? 'שם הרופא' : 'Doctor name'}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-50">
              {submitting ? (lang === 'he' ? 'שומר...' : 'Saving...') : (lang === 'he' ? 'שמור תרופה' : 'Save medication')}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="btn-ghost">
              {lang === 'he' ? 'ביטול' : 'Cancel'}
            </button>
          </div>
        </form>
      )}

      {list.length === 0 && !showForm ? (
        <div className="section-card">
          <div className="empty-block">
            <Pill className="h-10 w-10 text-[hsl(var(--muted-foreground))]/40" />
            <p className="font-medium">{lang === 'he' ? 'אין תרופות רשומות' : 'No medications listed'}</p>
            <p className="text-xs">{lang === 'he' ? 'לחץ על "הוסף תרופה" כדי להתחיל' : 'Click "Add medication" to get started'}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((m) => {
            const recentLog = getRecentLog(m.id);
            const takenRecently = recentLog?.status === 'taken';
            const isMarking = markingId === m.id;

            return (
              <div
                key={m.id}
                className={`rounded-xl border bg-[hsl(var(--card))] overflow-hidden hover:shadow-sm transition-shadow ${
                  takenRecently
                    ? 'border-[hsl(var(--success))]/40'
                    : 'border-[hsl(var(--border))]'
                }`}
              >
                {/* Double-dose warning */}
                {takenRecently && (
                  <div className={`flex items-center gap-2 px-4 py-2 bg-[hsl(var(--warning))]/10 border-b border-[hsl(var(--warning))]/20 text-xs font-medium text-[hsl(var(--warning))] ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {lang === 'he'
                        ? `ניתנה לאחרונה על ידי ${recentLog.takenByName} · ${new Date(recentLog.takenAt).toLocaleTimeString(lang === 'he' ? 'he-IL' : 'en', { hour: '2-digit', minute: '2-digit' })}`
                        : `Last given by ${recentLog.takenByName} · ${new Date(recentLog.takenAt).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}`}
                    </span>
                  </div>
                )}

                <div className={`flex items-center gap-4 p-4 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${takenRecently ? 'bg-[hsl(var(--success))]/15' : 'bg-[hsl(var(--primary))]/10'}`}>
                    {takenRecently
                      ? <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" />
                      : <Pill className="h-4 w-4 text-[hsl(var(--primary))]" />
                    }
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className={`flex items-center gap-2 flex-wrap ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                      <span className="font-semibold text-sm text-[hsl(var(--foreground))]">{m.name}</span>
                      {!m.isActive && (
                        <span className="badge badge-muted">{lang === 'he' ? 'לא פעיל' : 'Inactive'}</span>
                      )}
                      {m.isActive && !takenRecently && (
                        <span className="badge badge-success">{lang === 'he' ? 'פעיל' : 'Active'}</span>
                      )}
                      {takenRecently && (
                        <span className="badge badge-success">{lang === 'he' ? 'ניתנה היום' : 'Given today'}</span>
                      )}
                    </div>
                    {(m.dosage || m.frequency) && (
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                        {[m.dosage, m.frequency].filter(Boolean).join(' · ')}
                      </p>
                    )}
                    {m.prescribingDoctor && (
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                        {lang === 'he' ? 'ד"ר' : 'Dr.'} {m.prescribingDoctor}
                      </p>
                    )}
                  </div>

                  <div className={`flex items-center gap-1.5 shrink-0 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                    {m.isActive && (
                      <>
                        <button
                          type="button"
                          onClick={() => markDose(m.id, 'taken')}
                          disabled={isMarking}
                          title={lang === 'he' ? 'סמן כניתנה' : 'Mark as given'}
                          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                            takenRecently
                              ? 'bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))] border border-[hsl(var(--warning))]/30'
                              : 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border border-[hsl(var(--success))]/30 hover:bg-[hsl(var(--success))]/20'
                          }`}
                        >
                          {isMarking ? (
                            <Clock className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          {takenRecently
                            ? (lang === 'he' ? 'ניתנה' : 'Given')
                            : (lang === 'he' ? 'סמן כניתנה' : 'Mark given')}
                        </button>
                        <button
                          type="button"
                          onClick={() => markDose(m.id, 'skipped')}
                          disabled={isMarking}
                          title={lang === 'he' ? 'דלגתי' : 'Skipped'}
                          className="btn-ghost h-8 w-8 p-0 justify-center text-[hsl(var(--muted-foreground))]"
                          aria-label={lang === 'he' ? 'דלגתי על מנה זו' : 'Skip this dose'}
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => startEdit(m)}
                      className="btn-ghost h-8 w-8 p-0 justify-center"
                      aria-label={lang === 'he' ? 'ערוך' : 'Edit'}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(m.id)}
                      className="btn-ghost h-8 w-8 p-0 justify-center text-[hsl(var(--destructive))]"
                      aria-label={lang === 'he' ? 'מחק' : 'Delete'}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
