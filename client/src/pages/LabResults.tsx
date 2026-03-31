import React, { useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import { apiFetch } from '../lib/api';
import { PageHeader } from '../components/ui';
import { FlaskConical, Plus, X, AlertTriangle, CheckCircle2, FileText } from 'lucide-react';

type LabResult = {
  id: string;
  testName: string;
  value: string;
  unit: string | null;
  referenceRangeLow: string | null;
  referenceRangeHigh: string | null;
  isAbnormal: boolean;
  testDate: string | null;
  orderingDoctor: string | null;
  labName: string | null;
  sourceDocumentId: string | null;
  notes: string | null;
  createdAt: string;
};

type Patient = { id: string; fullName: string };

export default function LabResultsPage() {
  const { dir, lang } = useI18n();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [results, setResults] = useState<LabResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterAbnormal, setFilterAbnormal] = useState(false);
  const [search, setSearch] = useState('');

  const [form, setForm] = useState({
    testName: '',
    value: '',
    unit: '',
    referenceRangeLow: '',
    referenceRangeHigh: '',
    isAbnormal: false,
    testDate: '',
    orderingDoctor: '',
    labName: '',
    notes: '',
  });

  useEffect(() => {
    apiFetch<Patient>('/patients/primary')
      .then((p) => {
        setPatient(p);
        return apiFetch<LabResult[]>(`/patients/${p.id}/lab-results`);
      })
      .then(setResults)
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.testName || !form.value || !patient) return;
    setSubmitting(true);
    setError(null);
    try {
      const created = await apiFetch<LabResult>(`/patients/${patient.id}/lab-results`, {
        method: 'POST',
        body: JSON.stringify({
          testName: form.testName.trim(),
          value: form.value.trim(),
          unit: form.unit.trim() || null,
          referenceRangeLow: form.referenceRangeLow.trim() || null,
          referenceRangeHigh: form.referenceRangeHigh.trim() || null,
          isAbnormal: form.isAbnormal,
          testDate: form.testDate || null,
          orderingDoctor: form.orderingDoctor.trim() || null,
          labName: form.labName.trim() || null,
          notes: form.notes.trim() || null,
        }),
      });
      setResults((prev) => [created, ...prev]);
      setForm({ testName: '', value: '', unit: '', referenceRangeLow: '', referenceRangeHigh: '', isAbnormal: false, testDate: '', orderingDoctor: '', labName: '', notes: '' });
      setShowForm(false);
    } catch (err) {
      setError((err as Error)?.message ?? 'Failed');
    } finally {
      setSubmitting(false);
    }
  }

  // Group by test name for overview
  const groupedByTest = results.reduce<Record<string, LabResult[]>>((acc, r) => {
    if (!acc[r.testName]) acc[r.testName] = [];
    acc[r.testName].push(r);
    return acc;
  }, {});

  const filteredResults = results.filter((r) => {
    if (filterAbnormal && !r.isAbnormal) return false;
    if (search && !r.testName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const abnormalCount = results.filter((r) => r.isAbnormal).length;

  return (
    <div dir={dir} className="space-y-6">
      <PageHeader
        title={lang === 'he' ? 'בדיקות מעבדה' : 'Lab Results'}
        subtitle={lang === 'he' ? 'תוצאות בדיקות דם ומעבדה' : 'Blood tests and laboratory results'}
        actions={
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="btn-primary gap-1.5"
          >
            <Plus className="w-4 h-4" />
            {lang === 'he' ? 'הוסף תוצאה' : 'Add result'}
          </button>
        }
      />

      {/* Summary bar */}
      {results.length > 0 && (
        <div className={`flex items-center gap-4 flex-wrap ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <div className="flex items-center gap-1.5">
            <FlaskConical className="w-4 h-4 text-[hsl(var(--primary))]" />
            <span className="text-sm font-medium">{results.length} {lang === 'he' ? 'תוצאות' : 'results'}</span>
          </div>
          {abnormalCount > 0 && (
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-[hsl(var(--destructive))]" />
              <span className="text-sm font-medium text-[hsl(var(--destructive))]">
                {abnormalCount} {lang === 'he' ? 'חריגות' : 'abnormal'}
              </span>
            </div>
          )}
          <div className={`flex items-center gap-2 ms-auto ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={lang === 'he' ? 'חיפוש בדיקה...' : 'Search test...'}
              className="input-base h-8 text-sm w-40"
            />
            <button
              type="button"
              onClick={() => setFilterAbnormal(!filterAbnormal)}
              className={`btn-outline h-8 text-xs gap-1 ${filterAbnormal ? 'border-[hsl(var(--destructive))]/40 bg-[hsl(var(--destructive))]/5 text-[hsl(var(--destructive))]' : ''}`}
            >
              <AlertTriangle className="w-3 h-3" />
              {lang === 'he' ? 'חריגות בלבד' : 'Abnormal only'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-[hsl(var(--destructive))]/20 bg-[hsl(var(--destructive))]/10 px-4 py-3 text-sm text-[hsl(var(--destructive))]">
          {error}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="section-card space-y-4">
          <div className={`flex items-center justify-between ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
            <h3 className="section-title">{lang === 'he' ? 'הוספת תוצאת בדיקה' : 'Add lab result'}</h3>
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost h-8 w-8 p-0 justify-center" aria-label={lang === 'he' ? 'סגור' : 'Close'}>
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label-base">{lang === 'he' ? 'שם הבדיקה' : 'Test name'} *</label>
              <input
                type="text"
                value={form.testName}
                onChange={(e) => setForm((f) => ({ ...f, testName: e.target.value }))}
                className="input-base"
                placeholder={lang === 'he' ? 'למשל: המוגלובין' : 'e.g. Hemoglobin'}
                required
              />
            </div>
            <div>
              <label className="label-base">{lang === 'he' ? 'ערך' : 'Value'} *</label>
              <div className={`flex gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                <input
                  type="text"
                  value={form.value}
                  onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                  className="input-base flex-1"
                  placeholder="12.5"
                  required
                />
                <input
                  type="text"
                  value={form.unit}
                  onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                  className="input-base w-24"
                  placeholder={lang === 'he' ? 'יחידה' : 'Unit'}
                />
              </div>
            </div>
            <div>
              <label className="label-base">{lang === 'he' ? 'טווח תקין (מ-)' : 'Normal range (low)'}</label>
              <input
                type="text"
                value={form.referenceRangeLow}
                onChange={(e) => setForm((f) => ({ ...f, referenceRangeLow: e.target.value }))}
                className="input-base"
                placeholder="11"
              />
            </div>
            <div>
              <label className="label-base">{lang === 'he' ? 'טווח תקין (-עד)' : 'Normal range (high)'}</label>
              <input
                type="text"
                value={form.referenceRangeHigh}
                onChange={(e) => setForm((f) => ({ ...f, referenceRangeHigh: e.target.value }))}
                className="input-base"
                placeholder="16"
              />
            </div>
            <div>
              <label className="label-base">{lang === 'he' ? 'תאריך הבדיקה' : 'Test date'}</label>
              <input
                type="date"
                value={form.testDate}
                onChange={(e) => setForm((f) => ({ ...f, testDate: e.target.value }))}
                className="input-base"
              />
            </div>
            <div>
              <label className="label-base">{lang === 'he' ? 'מרשם רופא' : 'Ordering doctor'}</label>
              <input
                type="text"
                value={form.orderingDoctor}
                onChange={(e) => setForm((f) => ({ ...f, orderingDoctor: e.target.value }))}
                className="input-base"
              />
            </div>
            <div>
              <label className="label-base">{lang === 'he' ? 'שם מעבדה' : 'Lab name'}</label>
              <input
                type="text"
                value={form.labName}
                onChange={(e) => setForm((f) => ({ ...f, labName: e.target.value }))}
                className="input-base"
              />
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input
                id="isAbnormal"
                type="checkbox"
                checked={form.isAbnormal}
                onChange={(e) => setForm((f) => ({ ...f, isAbnormal: e.target.checked }))}
                className="w-4 h-4 accent-[hsl(var(--destructive))]"
              />
              <label htmlFor="isAbnormal" className="label-base mb-0 cursor-pointer">
                {lang === 'he' ? 'ערך חריג' : 'Abnormal value'}
              </label>
            </div>
            <div className="sm:col-span-2">
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
              {submitting ? (lang === 'he' ? 'שומר...' : 'Saving...') : (lang === 'he' ? 'שמור תוצאה' : 'Save result')}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">
              {lang === 'he' ? 'ביטול' : 'Cancel'}
            </button>
          </div>
        </form>
      )}

      {/* Results list */}
      <div className="section-card">
        <h3 className="section-title mb-3">
          {lang === 'he' ? 'תוצאות בדיקות' : 'Lab results'}
          {filterAbnormal && (
            <span className="ms-2 badge badge-destructive">{lang === 'he' ? 'חריגות בלבד' : 'Abnormal only'}</span>
          )}
        </h3>
        {loading ? (
          <p className="text-sm text-[hsl(var(--muted-foreground))]">{lang === 'he' ? 'טוען...' : 'Loading...'}</p>
        ) : filteredResults.length === 0 ? (
          <div className="empty-block">
            <FlaskConical className="h-10 w-10 text-[hsl(var(--muted-foreground))]/40" />
            <p className="font-medium">{lang === 'he' ? 'אין תוצאות בדיקה' : 'No lab results yet'}</p>
            <p className="text-xs">{lang === 'he' ? 'לחץ על "הוסף תוצאה" כדי להתחיל' : 'Click "Add result" to get started'}</p>
          </div>
        ) : (
          <ul className="divide-y divide-[hsl(var(--border))]">
            {filteredResults.map((r) => (
              <li key={r.id} className="py-3">
                <div className={`flex items-start gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${r.isAbnormal ? 'bg-[hsl(var(--destructive))]/10' : 'bg-[hsl(var(--success))]/10'}`}>
                    {r.isAbnormal
                      ? <AlertTriangle className="w-4 h-4 text-[hsl(var(--destructive))]" />
                      : <CheckCircle2 className="w-4 h-4 text-[hsl(var(--success))]" />
                    }
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={`flex items-center gap-2 flex-wrap ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                      <span className="font-semibold text-sm">{r.testName}</span>
                      <span className={`badge ${r.isAbnormal ? 'badge-destructive' : 'badge-success'}`}>
                        {r.isAbnormal ? (lang === 'he' ? 'חריג' : 'Abnormal') : (lang === 'he' ? 'תקין' : 'Normal')}
                      </span>
                    </div>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                      {r.testDate ? new Date(r.testDate).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en') : ''}
                      {r.orderingDoctor && ` · ${lang === 'he' ? 'ד"ר' : 'Dr.'} ${r.orderingDoctor}`}
                      {r.labName && ` · ${r.labName}`}
                      {r.referenceRangeLow && r.referenceRangeHigh && ` · ${lang === 'he' ? 'נורמה' : 'Range'}: ${r.referenceRangeLow}–${r.referenceRangeHigh}${r.unit ? ' ' + r.unit : ''}`}
                    </p>
                    {r.notes && (
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5 italic">{r.notes}</p>
                    )}
                  </div>
                  <div className={`flex flex-col items-end gap-1 shrink-0 ${dir === 'rtl' ? 'items-start' : ''}`}>
                    <span className={`text-lg font-bold ${r.isAbnormal ? 'text-[hsl(var(--destructive))]' : 'text-[hsl(var(--foreground))]'}`}>
                      {r.value}
                      {r.unit && <span className="text-xs font-normal text-[hsl(var(--muted-foreground))] ms-0.5">{r.unit}</span>}
                    </span>
                    {r.sourceDocumentId && (
                      <span className="flex items-center gap-0.5 text-xs text-[hsl(var(--muted-foreground))]">
                        <FileText className="w-3 h-3" />
                        {lang === 'he' ? 'ממסמך' : 'From doc'}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Summary by test name (unique tests) */}
      {Object.keys(groupedByTest).length > 1 && (
        <div className="section-card">
          <h3 className="section-title mb-3">{lang === 'he' ? 'סיכום לפי בדיקה' : 'Summary by test'}</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Object.entries(groupedByTest).map(([testName, rows]) => {
              const latest = rows[0];
              const hasAbnormal = rows.some((r) => r.isAbnormal);
              return (
                <div
                  key={testName}
                  className={`rounded-xl border p-3 ${hasAbnormal ? 'border-[hsl(var(--destructive))]/30 bg-[hsl(var(--destructive))]/5' : 'border-[hsl(var(--border))] bg-[hsl(var(--card))]'}`}
                >
                  <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] truncate">{testName}</p>
                  <p className={`text-base font-bold mt-1 ${hasAbnormal ? 'text-[hsl(var(--destructive))]' : 'text-[hsl(var(--foreground))]'}`}>
                    {latest.value}
                    {latest.unit && <span className="text-xs font-normal ms-0.5">{latest.unit}</span>}
                  </p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                    {rows.length > 1 ? `${rows.length} ${lang === 'he' ? 'מדידות' : 'readings'}` : lang === 'he' ? 'מדידה אחת' : '1 reading'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
