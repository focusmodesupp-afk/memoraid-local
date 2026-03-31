import React, { useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import { apiFetch } from '../lib/api';
import { PageHeader } from '../components/ui';
import {
  Activity, Plus, X, AlertTriangle, CheckCircle2,
  Heart, Thermometer, Wind, Droplets, Gauge, ZapOff,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

type VitalType =
  | 'blood_pressure'
  | 'blood_sugar'
  | 'weight'
  | 'heart_rate'
  | 'temperature'
  | 'oxygen_saturation'
  | 'respiratory_rate'
  | 'pain_level';

type VitalReading = {
  id: string;
  type: VitalType;
  value: number;
  value2?: number | null;
  unit: string;
  notes?: string | null;
  recordedAt: string;
  isAbnormal?: boolean;
};

type Patient = { id: string; fullName: string };

const VITAL_META: Record<VitalType, {
  labelHe: string; labelEn: string;
  unit: string; icon: React.ElementType;
  normalHe: string; normalEn: string;
  color: string;
  check: (v: number, v2?: number) => boolean;
}> = {
  blood_pressure: {
    labelHe: 'לחץ דם', labelEn: 'Blood Pressure', unit: 'mmHg',
    icon: Activity, color: 'text-[hsl(var(--primary))]',
    normalHe: 'סיסטולי < 140, דיאסטולי < 90', normalEn: 'Systolic <140, Diastolic <90',
    check: (v, v2) => v < 140 && (v2 == null || v2 < 90),
  },
  blood_sugar: {
    labelHe: 'סוכר בדם', labelEn: 'Blood Sugar', unit: 'mg/dL',
    icon: Droplets, color: 'text-[hsl(var(--warning))]',
    normalHe: '70–130 (צום)', normalEn: '70–130 (fasting)',
    check: (v) => v >= 70 && v <= 130,
  },
  weight: {
    labelHe: 'משקל', labelEn: 'Weight', unit: 'ק"ג',
    icon: Activity, color: 'text-[hsl(var(--success))]',
    normalHe: 'לפי BMI', normalEn: 'Per BMI',
    check: () => true,
  },
  heart_rate: {
    labelHe: 'דופק', labelEn: 'Heart Rate', unit: 'bpm',
    icon: Heart, color: 'text-[hsl(var(--destructive))]',
    normalHe: '60–100', normalEn: '60–100',
    check: (v) => v >= 60 && v <= 100,
  },
  temperature: {
    labelHe: 'חום', labelEn: 'Temperature', unit: '°C',
    icon: Thermometer, color: 'text-[hsl(var(--accent))]',
    normalHe: '36.1–37.2', normalEn: '36.1–37.2',
    check: (v) => v >= 36.1 && v <= 37.2,
  },
  oxygen_saturation: {
    labelHe: 'רוויון חמצן', labelEn: 'O₂ Saturation', unit: '%',
    icon: Wind, color: 'text-[hsl(var(--info))]',
    normalHe: '> 95%', normalEn: '> 95%',
    check: (v) => v > 95,
  },
  respiratory_rate: {
    labelHe: 'קצב נשימה', labelEn: 'Respiratory Rate', unit: 'נשימות/דקה',
    icon: Gauge, color: 'text-[hsl(var(--muted-foreground))]',
    normalHe: '12–20', normalEn: '12–20',
    check: (v) => v >= 12 && v <= 20,
  },
  pain_level: {
    labelHe: 'רמת כאב', labelEn: 'Pain Level', unit: '/10',
    icon: ZapOff, color: 'text-[hsl(var(--warning))]',
    normalHe: '0–3 קל', normalEn: '0–3 mild',
    check: (v) => v <= 3,
  },
};

const VITAL_TYPES = Object.keys(VITAL_META) as VitalType[];

export default function VitalsPage() {
  const { dir, lang } = useI18n();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [readings, setReadings] = useState<VitalReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chartType, setChartType] = useState<VitalType>('blood_pressure');

  const [form, setForm] = useState({
    type: 'blood_pressure' as VitalType,
    value: '',
    value2: '',
    notes: '',
    recordedAt: new Date().toISOString().slice(0, 16),
  });

  useEffect(() => {
    apiFetch<Patient>('/patients/primary')
      .then((p) => {
        setPatient(p);
        return apiFetch<VitalReading[]>(`/patients/${p.id}/vitals`);
      })
      .then(setReadings)
      .catch(() => setReadings([]))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.value || !patient) return;
    setSubmitting(true);
    setError(null);
    try {
      const meta = VITAL_META[form.type];
      const payload: Record<string, unknown> = {
        type: form.type,
        value: parseFloat(form.value),
        unit: meta.unit,
        notes: form.notes.trim() || null,
        recordedAt: new Date(form.recordedAt).toISOString(),
      };
      if (form.type === 'blood_pressure' && form.value2) {
        payload.value2 = parseFloat(form.value2);
      }
      const created = await apiFetch<VitalReading>(`/patients/${patient.id}/vitals`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setReadings((prev) => [created, ...prev]);
      setForm({ type: 'blood_pressure', value: '', value2: '', notes: '', recordedAt: new Date().toISOString().slice(0, 16) });
      setShowForm(false);
    } catch (err) {
      setError((err as Error)?.message ?? 'Failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!patient) return;
    try {
      await apiFetch(`/vitals/${id}`, { method: 'DELETE' });
      setReadings((prev) => prev.filter((r) => r.id !== id));
    } catch {
      // ignore
    }
  }

  const latestByType = VITAL_TYPES.reduce<Partial<Record<VitalType, VitalReading>>>((acc, t) => {
    const found = readings.find((r) => r.type === t);
    if (found) acc[t] = found;
    return acc;
  }, {});

  const chartData = readings
    .filter((r) => r.type === chartType)
    .slice(0, 14)
    .reverse()
    .map((r) => ({
      date: new Date(r.recordedAt).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en', { month: 'short', day: 'numeric' }),
      value: r.value,
      value2: r.value2,
    }));

  return (
    <div dir={dir} className="space-y-6">
      <PageHeader
        title={lang === 'he' ? 'מדדים רפואיים' : 'Vitals'}
        subtitle={lang === 'he' ? 'תיעוד ומעקב מדדים בריאותיים' : 'Track and monitor health vitals'}
        actions={
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="btn-primary gap-1.5"
          >
            <Plus className="w-4 h-4" />
            {lang === 'he' ? 'הוסף מדד' : 'Add reading'}
          </button>
        }
      />

      {error && (
        <div className="rounded-lg border border-[hsl(var(--destructive))]/20 bg-[hsl(var(--destructive))]/10 px-4 py-3 text-sm text-[hsl(var(--destructive))]">
          {error}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="section-card space-y-4">
          <div className={`flex items-center justify-between ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
            <h3 className="section-title">{lang === 'he' ? 'רישום מדד חדש' : 'Record new reading'}</h3>
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost h-8 w-8 p-0 justify-center" aria-label={lang === 'he' ? 'סגור' : 'Close'}>
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label-base">{lang === 'he' ? 'סוג מדד' : 'Vital type'}</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as VitalType, value: '', value2: '' }))}
                className="input-base"
              >
                {VITAL_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {lang === 'he' ? VITAL_META[t].labelHe : VITAL_META[t].labelEn}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-base">
                {form.type === 'blood_pressure'
                  ? (lang === 'he' ? 'סיסטולי (mmHg)' : 'Systolic (mmHg)')
                  : `${lang === 'he' ? 'ערך' : 'Value'} (${VITAL_META[form.type].unit})`}
              </label>
              <input
                type="number"
                value={form.value}
                onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                className="input-base"
                placeholder={form.type === 'blood_pressure' ? '120' : ''}
                required
                step="0.1"
              />
            </div>
            {form.type === 'blood_pressure' && (
              <div>
                <label className="label-base">{lang === 'he' ? 'דיאסטולי (mmHg)' : 'Diastolic (mmHg)'}</label>
                <input
                  type="number"
                  value={form.value2}
                  onChange={(e) => setForm((f) => ({ ...f, value2: e.target.value }))}
                  className="input-base"
                  placeholder="80"
                  step="0.1"
                />
              </div>
            )}
            <div>
              <label className="label-base">{lang === 'he' ? 'תאריך ושעה' : 'Date & time'}</label>
              <input
                type="datetime-local"
                value={form.recordedAt}
                onChange={(e) => setForm((f) => ({ ...f, recordedAt: e.target.value }))}
                className="input-base"
                required
              />
            </div>
            <div className={form.type === 'blood_pressure' ? '' : 'sm:col-span-2'}>
              <label className="label-base">{lang === 'he' ? 'הערות' : 'Notes'}</label>
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="input-base"
                placeholder={lang === 'he' ? 'אופציונלי' : 'Optional'}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-50">
              {submitting ? (lang === 'he' ? 'שומר...' : 'Saving...') : (lang === 'he' ? 'שמור מדד' : 'Save reading')}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">
              {lang === 'he' ? 'ביטול' : 'Cancel'}
            </button>
          </div>
        </form>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {VITAL_TYPES.map((t) => {
          const meta = VITAL_META[t];
          const Icon = meta.icon;
          const latest = latestByType[t];
          const isNormal = latest ? meta.check(latest.value, latest.value2 ?? undefined) : null;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setChartType(t)}
              className={`rounded-xl border p-4 text-start transition-all hover:shadow-sm ${
                chartType === t
                  ? 'border-[hsl(var(--primary))]/40 bg-[hsl(var(--primary))]/5 shadow-sm'
                  : 'border-[hsl(var(--border))] bg-[hsl(var(--card))]'
              }`}
            >
              <div className={`flex items-center gap-2 mb-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                <Icon className={`w-4 h-4 shrink-0 ${meta.color}`} />
                <span className="text-xs font-medium text-[hsl(var(--muted-foreground))] truncate">
                  {lang === 'he' ? meta.labelHe : meta.labelEn}
                </span>
              </div>
              {latest ? (
                <>
                  <p className="text-lg font-bold text-[hsl(var(--foreground))]">
                    {latest.value}
                    {t === 'blood_pressure' && latest.value2 != null && `/${latest.value2}`}
                    <span className="text-xs font-normal text-[hsl(var(--muted-foreground))] ms-1">{meta.unit}</span>
                  </p>
                  <div className={`flex items-center gap-1 mt-1 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                    {isNormal ? (
                      <CheckCircle2 className="w-3 h-3 text-[hsl(var(--success))]" />
                    ) : (
                      <AlertTriangle className="w-3 h-3 text-[hsl(var(--warning))]" />
                    )}
                    <span className={`text-xs ${isNormal ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--warning))]'}`}>
                      {isNormal ? (lang === 'he' ? 'תקין' : 'Normal') : (lang === 'he' ? 'בדוק' : 'Check')}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  {lang === 'he' ? 'אין נתונים' : 'No data'}
                </p>
              )}
            </button>
          );
        })}
      </div>

      {/* Chart */}
      {chartData.length > 1 && (
        <div className="section-card">
          <h3 className="section-title mb-4">
            {lang === 'he' ? `מגמת ${VITAL_META[chartType].labelHe}` : `${VITAL_META[chartType].labelEn} trend`}
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" dot={{ r: 3 }} strokeWidth={2} />
              {chartType === 'blood_pressure' && (
                <Line type="monotone" dataKey="value2" stroke="hsl(var(--accent))" dot={{ r: 3 }} strokeWidth={2} />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* History list */}
      <div className="section-card">
        <h3 className="section-title mb-3">{lang === 'he' ? 'היסטוריית מדידות' : 'Reading history'}</h3>
        {loading ? (
          <p className="text-sm text-[hsl(var(--muted-foreground))]">{lang === 'he' ? 'טוען...' : 'Loading...'}</p>
        ) : readings.length === 0 ? (
          <div className="empty-block">
            <Activity className="h-10 w-10 text-[hsl(var(--muted-foreground))]/40" />
            <p className="font-medium">{lang === 'he' ? 'אין מדידות עדיין' : 'No readings yet'}</p>
            <p className="text-xs">{lang === 'he' ? 'לחץ על "הוסף מדד" כדי להתחיל' : 'Click "Add reading" to get started'}</p>
          </div>
        ) : (
          <ul className="divide-y divide-[hsl(var(--border))]">
            {readings.slice(0, 30).map((r) => {
              const meta = VITAL_META[r.type] ?? VITAL_META['blood_pressure'];
              const Icon = meta.icon;
              const isAbnormal = r.isAbnormal || !meta.check(r.value, r.value2 ?? undefined);
              return (
                <li key={r.id} className="py-3">
                  <div className={`flex items-center gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isAbnormal ? 'bg-[hsl(var(--destructive))]/10' : 'bg-[hsl(var(--muted))]/50'}`}>
                      <Icon className={`w-4 h-4 ${isAbnormal ? 'text-[hsl(var(--destructive))]' : meta.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={`flex items-center gap-2 flex-wrap ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                        <span className="font-semibold text-sm text-[hsl(var(--foreground))]">
                          {lang === 'he' ? meta.labelHe : meta.labelEn}
                        </span>
                        <span className={`badge ${!isAbnormal ? 'badge-success' : 'badge-destructive'}`}>
                          {!isAbnormal ? (lang === 'he' ? 'תקין' : 'Normal') : (lang === 'he' ? 'חריג' : 'Abnormal')}
                        </span>
                      </div>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                        {new Date(r.recordedAt).toLocaleString(lang === 'he' ? 'he-IL' : 'en', { dateStyle: 'short', timeStyle: 'short' })}
                        {r.notes && ` · ${r.notes}`}
                      </p>
                    </div>
                    <span className="text-lg font-bold text-[hsl(var(--foreground))] shrink-0">
                      {r.value}{r.value2 != null ? `/${r.value2}` : ''}
                      <span className="text-xs font-normal text-[hsl(var(--muted-foreground))] ms-0.5">{meta.unit}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDelete(r.id)}
                      className="btn-ghost h-7 w-7 p-0 justify-center opacity-40 hover:opacity-100 shrink-0"
                      aria-label={lang === 'he' ? 'מחק מדידה' : 'Delete reading'}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
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
