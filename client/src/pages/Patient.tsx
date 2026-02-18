import { FormEvent, useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useI18n } from '../i18n';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../lib/api';

type Patient = {
  id: string;
  familyId: string;
  fullName: string | null;
  dateOfBirth: string | null;
  primaryDiagnosis: string | null;
  emergencyContact: string | null;
  emergencyContactPhone: string | null;
  primaryDoctorName: string | null;
  primaryDoctorPhone: string | null;
  healthFundName: string | null;
  notes: string | null;
};

export default function PatientPage() {
  const { dir, lang } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);

  const [form, setForm] = useState<{
    fullName: string;
    dateOfBirth: string;
    primaryDiagnosis: string;
    emergencyContact: string;
    emergencyContactPhone: string;
    primaryDoctorName: string;
    primaryDoctorPhone: string;
    healthFundName: string;
    notes: string;
  }>({
    fullName: '',
    dateOfBirth: '',
    primaryDiagnosis: '',
    emergencyContact: '',
    emergencyContactPhone: '',
    primaryDoctorName: '',
    primaryDoctorPhone: '',
    healthFundName: '',
    notes: '',
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const p = await apiFetch<Patient>('/patients/primary');
        if (cancelled) return;
        setPatient(p);
        setForm({
          fullName: p.fullName ?? '',
          dateOfBirth: p.dateOfBirth ?? '',
          primaryDiagnosis: p.primaryDiagnosis ?? '',
          emergencyContact: p.emergencyContact ?? '',
          emergencyContactPhone: p.emergencyContactPhone ?? '',
          primaryDoctorName: p.primaryDoctorName ?? '',
          primaryDoctorPhone: p.primaryDoctorPhone ?? '',
          healthFundName: p.healthFundName ?? '',
          notes: p.notes ?? '',
        });
        setError(null);
      } catch (err: any) {
        if (cancelled) return;
        if (err?.message?.includes('No patient')) {
          setPatient(null);
          setError(null);
        } else {
          setError(err.message ?? 'Failed to load patient');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  function onChange(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function calcAge(dateStr: string | null): string | null {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return null;
    const diff = Date.now() - d.getTime();
    const ageDate = new Date(diff);
    const age = Math.abs(ageDate.getUTCFullYear() - 1970);
    return `${age}`;
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!form.fullName.trim()) return;
    try {
      setSaving(true);
      const created = await apiFetch<Patient>('/patients', {
        method: 'POST',
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          dateOfBirth: form.dateOfBirth || null,
          primaryDiagnosis: form.primaryDiagnosis || null,
          notes: form.notes || null,
        }),
      });
      setPatient(created);
      setError(null);
    } catch (err: any) {
      setError(err.message ?? 'Failed to create patient');
    } finally {
      setSaving(false);
    }
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!patient) return;
    try {
      setSaving(true);
      const updated = await apiFetch<Patient>(`/patients/${patient.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          dateOfBirth: form.dateOfBirth || null,
          primaryDiagnosis: form.primaryDiagnosis || null,
          emergencyContact: form.emergencyContact || null,
          emergencyContactPhone: form.emergencyContactPhone || null,
          primaryDoctorName: form.primaryDoctorName || null,
          primaryDoctorPhone: form.primaryDoctorPhone || null,
          healthFundName: form.healthFundName || null,
          notes: form.notes || null,
        }),
      });
      setPatient(updated);
      setError(null);
    } catch (err: any) {
      setError(err.message ?? 'Failed to save patient');
    } finally {
      setSaving(false);
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────────────────────

  if (!authLoading && !user) {
    return (
      <div dir={dir} className="flex min-h-[60vh] items-center justify-center">
        <div className="rounded-2xl border border-slate-200 bg-white px-8 py-6 text-center max-w-md">
          <h2 className="mb-2 text-lg font-semibold text-slate-900">
            {lang === 'he' ? 'נדרש להתחבר' : 'Please sign in'}
          </h2>
          <p className="mb-4 text-sm text-slate-600">
            {lang === 'he'
              ? 'כדי להגדיר פרופיל מטופל, יש להתחבר או ליצור קבוצה חדשה.'
              : 'To set up a patient profile, please sign in or create a new family.'}
          </p>
          <button
            className="rounded-full bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-800"
            onClick={() => navigate('/login')}
          >
            {lang === 'he' ? 'מעבר למסך כניסה' : 'Go to login'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div dir={dir} className="space-y-4">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            {lang === 'he' ? 'פרופיל מטופל' : 'Patient profile'}
          </h2>
          <p className="text-sm text-slate-600">
            {lang === 'he'
              ? 'כאן מרוכז כל המידע הבסיסי על המטופל המשפחתי.'
              : 'All core information about the family patient in one place.'}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          {lang === 'he' ? 'טוען פרטי מטופל...' : 'Loading patient details…'}
        </div>
      ) : !patient ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-6 md:flex md:items-center md:justify-between md:gap-6">
          <div className="space-y-2 md:w-1/2">
            <h3 className="text-base font-semibold text-slate-900">
              {lang === 'he' ? 'עדיין לא הוגדר מטופל' : 'No patient profile yet'}
            </h3>
            <p className="text-sm text-slate-600">
              {lang === 'he'
                ? 'נתחיל מפרופיל בסיסי: שם המטופל, תאריך לידה ואבחנה ראשית (אם ידועה).'
                : 'Let’s start with a basic profile: name, date of birth and primary diagnosis.'}
            </p>
          </div>
          <form onSubmit={handleCreate} className="mt-4 space-y-3 md:mt-0 md:w-1/2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                {lang === 'he' ? 'שם מלא של המטופל' : 'Patient full name'}
              </label>
              <input
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                value={form.fullName}
                onChange={(e) => onChange('fullName', e.target.value)}
                required
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  {lang === 'he' ? 'תאריך לידה' : 'Date of birth'}
                </label>
                <input
                  type="date"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                  value={form.dateOfBirth}
                  onChange={(e) => onChange('dateOfBirth', e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  {lang === 'he' ? 'אבחנה ראשית (אופציונלי)' : 'Primary diagnosis (optional)'}
                </label>
                <input
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                  value={form.primaryDiagnosis}
                  onChange={(e) => onChange('primaryDiagnosis', e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                {lang === 'he' ? 'הערות (אופציונלי)' : 'Notes (optional)'}
              </label>
              <textarea
                rows={3}
                className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                value={form.notes}
                onChange={(e) => onChange('notes', e.target.value)}
              />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-[#1E3A5F] px-5 py-2 text-sm font-medium text-white hover:bg-[#162844] disabled:opacity-60"
            >
              {saving
                ? lang === 'he'
                  ? 'שומר...'
                  : 'Saving…'
                : lang === 'he'
                  ? 'צור פרופיל מטופל'
                  : 'Create patient profile'}
            </button>
          </form>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            {/* פרופיל ראשי */}
            <div className="space-y-4">
              <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#1E3A5F] to-[#27AE60] text-xl font-semibold text-white">
                  {form.fullName ? form.fullName.charAt(0) : '🧑‍🦳'}
                </div>
                <div className="space-y-1">
                  <input
                    className="w-full rounded-lg border border-transparent bg-transparent px-0 py-1 text-lg font-semibold text-slate-900 focus:border-slate-300 focus:bg-slate-50 focus:outline-none"
                    value={form.fullName}
                    onChange={(e) => onChange('fullName', e.target.value)}
                  />
                  <p className="text-xs text-slate-600">
                    {lang === 'he' ? 'שם מלא של המטופל' : 'Full name of the patient'}
                  </p>
                  <div className="flex flex-wrap gap-3 text-xs text-slate-600">
                    <div>
                      {lang === 'he' ? 'גיל: ' : 'Age: '}
                      <span className="font-medium">
                        {calcAge(patient.dateOfBirth) ?? (lang === 'he' ? 'לא ידוע' : 'Unknown')}
                      </span>
                    </div>
                    <div>
                      {lang === 'he' ? 'תאריך לידה:' : 'Date of birth:'}{' '}
                      <input
                        type="date"
                        className="rounded border border-slate-300 bg-white px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-900"
                        value={form.dateOfBirth}
                        onChange={(e) => onChange('dateOfBirth', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    {lang === 'he' ? 'אבחנה ראשית' : 'Primary diagnosis'}
                  </label>
                  <input
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                    value={form.primaryDiagnosis}
                    onChange={(e) => onChange('primaryDiagnosis', e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    {lang === 'he' ? 'הערות כלליות' : 'General notes'}
                  </label>
                  <textarea
                    rows={4}
                    className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                    value={form.notes}
                    onChange={(e) => onChange('notes', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* צד ימין – חירום / רופא / קופ"ח */}
            <aside className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                <h3 className="text-sm font-semibold text-slate-900">
                  {lang === 'he' ? 'פרטי חירום' : 'Emergency contact'}
                </h3>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    {lang === 'he' ? 'שם איש קשר לחירום' : 'Emergency contact name'}
                  </label>
                  <input
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                    value={form.emergencyContact}
                    onChange={(e) => onChange('emergencyContact', e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    {lang === 'he' ? 'טלפון לחירום' : 'Emergency phone'}
                  </label>
                  <input
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                    value={form.emergencyContactPhone}
                    onChange={(e) => onChange('emergencyContactPhone', e.target.value)}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                <h3 className="text-sm font-semibold text-slate-900">
                  {lang === 'he' ? 'רופא מטפל וקופת חולים' : 'Primary doctor & health fund'}
                </h3>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    {lang === 'he' ? 'שם רופא ראשי' : 'Primary doctor name'}
                  </label>
                  <input
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                    value={form.primaryDoctorName}
                    onChange={(e) => onChange('primaryDoctorName', e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    {lang === 'he' ? 'טלפון רופא' : 'Doctor phone'}
                  </label>
                  <input
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                    value={form.primaryDoctorPhone}
                    onChange={(e) => onChange('primaryDoctorPhone', e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    {lang === 'he' ? 'קופת חולים' : 'Health fund'}
                  </label>
                  <input
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                    value={form.healthFundName}
                    onChange={(e) => onChange('healthFundName', e.target.value)}
                  />
                </div>
              </div>
            </aside>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-[#1E3A5F] px-6 py-2 text-sm font-medium text-white hover:bg-[#162844] disabled:opacity-60"
          >
            {saving
              ? lang === 'he'
                ? 'שומר...'
                : 'Saving…'
              : lang === 'he'
                ? 'שמור פרופיל מטופל'
                : 'Save patient profile'}
          </button>
        </form>
      )}
    </div>
  );
}

