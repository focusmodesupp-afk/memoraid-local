import React, { useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import { apiFetch } from '../lib/api';
import { PageHeader } from '../components/ui';
import { Calendar, Plus, X, Edit2, Trash2, MapPin, FileText, User, ChevronDown, ChevronUp, ShieldAlert, AlertTriangle } from 'lucide-react';

type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled';

type Appointment = {
  id: string;
  doctorName: string;
  specialty?: string | null;
  date: string;
  location?: string | null;
  summary?: string | null;
  nextSteps?: string | null;
  status: AppointmentStatus;
  createdAt: string;
};

const STATUS_BADGE: Record<AppointmentStatus, string> = {
  scheduled: 'badge-primary',
  completed: 'badge-success',
  cancelled: 'badge-muted',
};
const STATUS_HE: Record<AppointmentStatus, string> = {
  scheduled: 'מתוזמן',
  completed: 'הושלם',
  cancelled: 'בוטל',
};
const STATUS_EN: Record<AppointmentStatus, string> = {
  scheduled: 'Scheduled',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const EMPTY_FORM = {
  doctorName: '',
  specialty: '',
  date: '',
  location: '',
  summary: '',
  nextSteps: '',
  status: 'scheduled' as AppointmentStatus,
};

export default function AppointmentsPage() {
  const { dir, lang } = useI18n();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | AppointmentStatus>('all');

  // Allergy conflict modal
  const [allergyAlerts, setAllergyAlerts] = useState<Array<{ allergen: string; message: string; recommendation: string }>>([]);
  const [showAllergyModal, setShowAllergyModal] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState<(() => void) | null>(null);
  const [activePatientId, setActivePatientId] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Appointment[]>('/visits')
      .then(setAppointments)
      .catch(() => setAppointments([]))
      .finally(() => setLoading(false));
  }, []);

  function openNew() {
    setEditId(null);
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
    setError(null);
  }

  function openEdit(a: Appointment) {
    setEditId(a.id);
    setForm({
      doctorName: a.doctorName,
      specialty: a.specialty ?? '',
      date: a.date.slice(0, 16),
      location: a.location ?? '',
      summary: a.summary ?? '',
      nextSteps: a.nextSteps ?? '',
      status: a.status,
    });
    setShowForm(true);
    setError(null);
  }

  // Keywords that indicate a surgical/procedure appointment
  const SURGICAL_KEYWORDS = ['ניתוח', 'כירורג', 'surgery', 'operation', 'הרדמה', 'anesthesia', 'עקירה', 'extraction', 'CT', 'קתטר', 'catheter', 'אנדוסקופיה', 'endoscopy', 'קולונוסקופיה', 'colonoscopy', 'ביופסיה', 'biopsy', 'פרוצדורה', 'procedure'];

  function isSurgicalAppointment(specialty: string, doctorName: string): boolean {
    const text = (specialty + ' ' + doctorName).toLowerCase();
    return SURGICAL_KEYWORDS.some((kw) => text.includes(kw.toLowerCase()));
  }

  async function checkAllergyConflictsForAppointment(specialty: string, doctorName: string): Promise<boolean> {
    if (!isSurgicalAppointment(specialty, doctorName)) return false;
    if (!activePatientId) return false;
    try {
      const alerts = await apiFetch<Array<{ allergen: string; message: string; recommendation: string }>>(
        `/patients/${activePatientId}/allergy-procedure-check?appointmentType=${encodeURIComponent(specialty + ' ' + doctorName)}`
      );
      if (alerts.length > 0) {
        setAllergyAlerts(alerts);
        return true;
      }
    } catch {
      // Endpoint might not exist yet — safe to ignore
    }
    return false;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.doctorName.trim() || !form.date) return;
    setError(null);

    // Check for allergy conflicts on surgical appointments
    const hasConflict = await checkAllergyConflictsForAppointment(form.specialty, form.doctorName);
    if (hasConflict) {
      // Show modal — user must confirm before proceeding
      setPendingSubmit(() => () => doSubmit());
      setShowAllergyModal(true);
      return;
    }

    doSubmit();
  }

  async function doSubmit() {
    setShowAllergyModal(false);
    setPendingSubmit(null);
    setSubmitting(true);
    try {
      const payload = {
        doctorName: form.doctorName.trim(),
        specialty: form.specialty.trim() || null,
        date: new Date(form.date).toISOString(),
        location: form.location.trim() || null,
        summary: form.summary.trim() || null,
        nextSteps: form.nextSteps.trim() || null,
        status: form.status,
      };
      if (editId) {
        const updated = await apiFetch<Appointment>(`/visits/${editId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setAppointments((prev) => prev.map((a) => (a.id === editId ? updated : a)));
      } else {
        const created = await apiFetch<Appointment>('/visits', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setAppointments((prev) => [created, ...prev]);
      }
      setShowForm(false);
      setEditId(null);
    } catch (err) {
      setError((err as Error)?.message ?? 'Failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteAppointment(id: string) {
    if (!window.confirm(lang === 'he' ? 'למחוק את הביקור?' : 'Delete this appointment?')) return;
    setDeletingId(id);
    try {
      await apiFetch(`/visits/${id}`, { method: 'DELETE' });
      setAppointments((prev) => prev.filter((a) => a.id !== id));
    } catch {
      // ignore
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = appointments.filter((a) => statusFilter === 'all' || a.status === statusFilter);
  const upcoming = appointments.filter((a) => a.status === 'scheduled' && new Date(a.date) > new Date()).length;
  const statusLabels = lang === 'he' ? STATUS_HE : STATUS_EN;

  return (
    <div dir={dir} className="space-y-6">
      {/* Allergy Conflict Modal */}
      {showAllergyModal && allergyAlerts.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="allergy-modal-title">
          <div className="bg-[hsl(var(--card))] rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-[hsl(var(--destructive))]/10">
                <ShieldAlert className="w-6 h-6 text-[hsl(var(--destructive))]" />
              </div>
              <h2 id="allergy-modal-title" className="text-lg font-bold text-[hsl(var(--destructive))]">
                ⚠️ התראת אלרגיה — פרוצדורה/ניתוח
              </h2>
            </div>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              נמצאו אלרגיות ידועות שעלולות להיות רלוונטיות לפרוצדורה/ניתוח המתוכנן/ת. יש לוודא שהצוות הרפואי מודע לאלרגיות אלו.
            </p>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {allergyAlerts.map((alert, i) => (
                <div key={i} className="rounded-lg border border-[hsl(var(--destructive))]/30 bg-[hsl(var(--destructive))]/5 p-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-[hsl(var(--destructive))] shrink-0" />
                    <p className="text-sm font-semibold text-[hsl(var(--destructive))]">{alert.message}</p>
                  </div>
                  {alert.recommendation && (
                    <p className="text-xs text-[hsl(var(--muted-foreground))] ps-6">{alert.recommendation}</p>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setShowAllergyModal(false); setPendingSubmit(null); setAllergyAlerts([]); }}
                className="btn-outline flex-1"
              >
                ביטול — בדוק תחילה
              </button>
              <button
                type="button"
                onClick={() => { setAllergyAlerts([]); pendingSubmit?.(); }}
                className="flex-1 px-4 py-2 rounded-md bg-[hsl(var(--destructive))] text-white text-sm font-medium hover:bg-[hsl(var(--destructive))]/90"
              >
                המשך בכל זאת — ידעתי את הצוות
              </button>
            </div>
          </div>
        </div>
      )}

      <PageHeader
        title={lang === 'he' ? 'ביקורי רופא ותורים' : 'Doctor Visits'}
        subtitle={
          upcoming > 0
            ? (lang === 'he' ? `${upcoming} ביקורים קרובים` : `${upcoming} upcoming appointments`)
            : (lang === 'he' ? 'ניהול ביקורים ופגישות רפואיות' : 'Manage doctor visits and appointments')
        }
        actions={
          <button type="button" onClick={openNew} className="btn-primary gap-1.5">
            <Plus className="w-4 h-4" />
            {lang === 'he' ? 'הוסף ביקור' : 'Add visit'}
          </button>
        }
      />

      {error && (
        <div className="rounded-lg border border-[hsl(var(--destructive))]/20 bg-[hsl(var(--destructive))]/10 px-4 py-3 text-sm text-[hsl(var(--destructive))]">
          {error}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="section-card space-y-4">
          <div className={`flex items-center justify-between ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
            <h3 className="section-title">
              {editId ? (lang === 'he' ? 'עריכת ביקור' : 'Edit visit') : (lang === 'he' ? 'ביקור חדש' : 'New visit')}
            </h3>
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost h-8 w-8 p-0 justify-center" aria-label="Close">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label-base">{lang === 'he' ? 'שם הרופא *' : 'Doctor name *'}</label>
              <input
                type="text"
                value={form.doctorName}
                onChange={(e) => setForm((f) => ({ ...f, doctorName: e.target.value }))}
                className="input-base"
                placeholder={lang === 'he' ? 'ד"ר ישראל ישראלי' : 'Dr. Smith'}
                required
              />
            </div>
            <div>
              <label className="label-base">{lang === 'he' ? 'התמחות' : 'Specialty'}</label>
              <input
                type="text"
                value={form.specialty}
                onChange={(e) => setForm((f) => ({ ...f, specialty: e.target.value }))}
                className="input-base"
                placeholder={lang === 'he' ? 'קרדיולוג, נוירולוג...' : 'Cardiologist, Neurologist...'}
              />
            </div>
            <div>
              <label className="label-base">{lang === 'he' ? 'תאריך ושעה *' : 'Date & time *'}</label>
              <input
                type="datetime-local"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="input-base"
                required
              />
            </div>
            <div>
              <label className="label-base">{lang === 'he' ? 'מיקום / מוסד' : 'Location / Clinic'}</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                className="input-base"
                placeholder={lang === 'he' ? 'בית חולים שיבא, קופת חולים...' : 'Hospital, clinic...'}
              />
            </div>
            <div>
              <label className="label-base">{lang === 'he' ? 'סטטוס' : 'Status'}</label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as AppointmentStatus }))}
                className="input-base"
              >
                {(Object.keys(STATUS_HE) as AppointmentStatus[]).map((s) => (
                  <option key={s} value={s}>{lang === 'he' ? STATUS_HE[s] : STATUS_EN[s]}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label-base">{lang === 'he' ? 'סיכום הביקור' : 'Visit summary'}</label>
              <textarea
                value={form.summary}
                onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
                className="input-base min-h-[72px] resize-y"
                placeholder={lang === 'he' ? 'מה דיברו, מה מצאו...' : 'What was discussed, findings...'}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label-base">{lang === 'he' ? 'צעדים הבאים / המלצות' : 'Next steps / Recommendations'}</label>
              <textarea
                value={form.nextSteps}
                onChange={(e) => setForm((f) => ({ ...f, nextSteps: e.target.value }))}
                className="input-base min-h-[56px] resize-y"
                placeholder={lang === 'he' ? 'תרופות שנרשמו, בדיקות נוספות...' : 'Prescribed medications, follow-up tests...'}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-50">
              {submitting ? (lang === 'he' ? 'שומר...' : 'Saving...') : (lang === 'he' ? 'שמור ביקור' : 'Save visit')}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">
              {lang === 'he' ? 'ביטול' : 'Cancel'}
            </button>
          </div>
        </form>
      )}

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'scheduled', 'completed', 'cancelled'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === s
                ? 'bg-[hsl(var(--primary))] text-white'
                : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]/70'
            }`}
          >
            {s === 'all'
              ? (lang === 'he' ? 'הכל' : 'All')
              : (lang === 'he' ? STATUS_HE[s] : STATUS_EN[s])}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-10">
            <p className="text-sm text-[hsl(var(--muted-foreground))]">{lang === 'he' ? 'טוען...' : 'Loading...'}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-10 text-center">
            <div className="w-14 h-14 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center mb-3">
              <Calendar className="w-7 h-7 text-[hsl(var(--muted-foreground))]/40" />
            </div>
            <p className="font-medium text-[hsl(var(--foreground))] mb-1">
              {lang === 'he' ? 'אין ביקורים' : 'No appointments'}
            </p>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              {lang === 'he' ? 'לחץ "הוסף ביקור" כדי להוסיף ביקור רופא' : 'Click "Add visit" to add a doctor visit'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[hsl(var(--border))]">
            {filtered.map((a) => {
              const isExpanded = expandedId === a.id;
              const isPast = new Date(a.date) < new Date();
              return (
                <li key={a.id} className="px-4 py-4">
                  <div className={`flex items-start gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      a.status === 'scheduled' && !isPast
                        ? 'bg-[hsl(var(--primary))]/10'
                        : 'bg-[hsl(var(--muted))]/50'
                    }`}>
                      <Calendar className={`w-5 h-5 ${
                        a.status === 'scheduled' && !isPast ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))]'
                      }`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={`flex items-center gap-2 flex-wrap mb-0.5 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                        <span className="font-semibold text-sm text-[hsl(var(--foreground))]">
                          {a.doctorName}
                          {a.specialty && <span className="font-normal text-[hsl(var(--muted-foreground))] ms-1">· {a.specialty}</span>}
                        </span>
                        <span className={`badge ${STATUS_BADGE[a.status]}`}>
                          {statusLabels[a.status]}
                        </span>
                      </div>
                      <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[hsl(var(--muted-foreground))] ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                        <span className={`flex items-center gap-1 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                          <Calendar className="w-3 h-3 shrink-0" />
                          {new Date(a.date).toLocaleString(lang === 'he' ? 'he-IL' : 'en', { dateStyle: 'medium', timeStyle: 'short' })}
                        </span>
                        {a.location && (
                          <span className={`flex items-center gap-1 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                            <MapPin className="w-3 h-3 shrink-0" />
                            {a.location}
                          </span>
                        )}
                      </div>
                      {isExpanded && (
                        <div className="mt-3 space-y-2 text-sm text-[hsl(var(--foreground))]">
                          {a.summary && (
                            <div className={`flex gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                              <FileText className="w-4 h-4 shrink-0 text-[hsl(var(--muted-foreground))] mt-0.5" />
                              <div>
                                <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-0.5">
                                  {lang === 'he' ? 'סיכום' : 'Summary'}
                                </p>
                                <p>{a.summary}</p>
                              </div>
                            </div>
                          )}
                          {a.nextSteps && (
                            <div className={`flex gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                              <User className="w-4 h-4 shrink-0 text-[hsl(var(--muted-foreground))] mt-0.5" />
                              <div>
                                <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-0.5">
                                  {lang === 'he' ? 'צעדים הבאים' : 'Next steps'}
                                </p>
                                <p>{a.nextSteps}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className={`flex items-center gap-1 shrink-0 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                      {(a.summary || a.nextSteps) && (
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : a.id)}
                          aria-label={isExpanded ? 'Collapse' : 'Expand'}
                          className="btn-ghost h-8 w-8 p-0 justify-center"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openEdit(a)}
                        aria-label={lang === 'he' ? 'ערוך' : 'Edit'}
                        className="btn-ghost h-8 w-8 p-0 justify-center"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteAppointment(a.id)}
                        disabled={deletingId === a.id}
                        aria-label={lang === 'he' ? 'מחק' : 'Delete'}
                        className="btn-ghost h-8 w-8 p-0 justify-center text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
