import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n';
import { apiFetch } from '../lib/api';
import {
  X, FileText, Brain, Pill, ClipboardList, Stethoscope,
  AlertTriangle, CheckCircle2, Clock, Plus, Trash2, Edit2,
  Save, UserRound, Users, Info, RefreshCw, Sparkles,
  ArrowUpCircle, ChevronRight, Activity, FlaskConical, CalendarPlus,
} from 'lucide-react';

type TaskFor = 'patient' | 'caregiver' | 'note';

type ExtractedTask    = { title: string; description?: string; taskFor: TaskFor };
type ExtractedMed = {
  name: string;
  dosage?: string;
  form?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
};
type ExtractedVital   = { type: string; value: number; value2?: number; unit: string; notes?: string };
type ExtractedLabVal  = { name: string; value: string; unit?: string; isAbnormal: boolean };
type ExtractedReferral = { specialty: string; reason: string; urgency: 'routine' | 'soon' | 'urgent' };

type AllergyWarning = {
  substance: string;
  reactionType: string;
  severity: 'mild' | 'moderate' | 'severe' | 'life_threatening';
  notes?: string;
};

type AiAnalysis = {
  simplifiedDiagnosis: string;
  keyFindings: string[];
  extractedAllergyWarnings?: AllergyWarning[];
  extractedMedications: ExtractedMed[];
  extractedTasks: ExtractedTask[];
  extractedVitals?: ExtractedVital[];
  extractedLabValues?: ExtractedLabVal[];
  extractedReferrals?: ExtractedReferral[];
  followUpRequired: boolean;
  urgencyLevel: 'routine' | 'soon' | 'urgent';
  doctorNotes: string;
  doctorPhone?: string | null;
  doctorFax?: string | null;
  autoCreated?: { medicationsCreated: number; medicationsSkipped: number; tasksCreated: number };
  extractedMedicalHistory?: Array<{
    condition: string;
    status: 'active' | 'past';
    diagnosisDate?: string;
  }>;
};

export type DocForDrawer = {
  id: string;
  title: string;
  description: string | null;
  documentType: string | null;
  fileUrl: string | null;
  issuingDoctor: string | null;
  hospitalName: string | null;
  patientId: string | null;
  patientName?: string | null;
  aiAnalysisStatus: 'processing' | 'done' | 'failed' | null;
  aiAnalysisResult: AiAnalysis | null;
  createdAt: string;
};

const URGENCY: Record<string, { label: string; icon: React.ReactNode; bg: string; text: string; border: string }> = {
  urgent: { label: 'דחוף',   icon: <AlertTriangle className="w-3.5 h-3.5" />, bg: 'bg-red-50 dark:bg-red-950/40',    text: 'text-red-700 dark:text-red-300',    border: 'border-red-200 dark:border-red-800' },
  soon:   { label: 'בהקדם',  icon: <Clock         className="w-3.5 h-3.5" />, bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
  routine:{ label: 'שגרתי', icon: <CheckCircle2  className="w-3.5 h-3.5" />, bg: 'bg-green-50 dark:bg-green-950/40', text: 'text-green-700 dark:text-green-300',  border: 'border-green-200 dark:border-green-800' },
};

const DOC_TYPES_HE: Record<string, string> = {
  discharge: 'מכתב שחרור', referral: 'הפניה', lab_results: 'תוצאות מעבדה',
  prescription: 'מרשם', consultation: 'סיכום ביקור', imaging: 'דימות / צילום', other: 'אחר',
};

const VITAL_LABELS_HE: Record<string, string> = {
  blood_pressure:    'לחץ דם',
  blood_sugar:       'סוכר בדם',
  weight:            'משקל',
  heart_rate:        'דופק',
  temperature:       'חום',
  oxygen_saturation: 'ריווי חמצן',
};

interface Props {
  doc: DocForDrawer | null;
  activeFamilyId: string | null;
  onClose: () => void;
  onDocUpdated: (doc: DocForDrawer) => void;
}

export default function DocumentDetailDrawer({ doc, activeFamilyId, onClose, onDocUpdated }: Props) {
  const { lang, dir } = useI18n();
  const [analysis, setAnalysis] = useState<AiAnalysis | null>(null);
  const [saving, setSaving]     = useState(false);
  const [syncing, setSyncing]   = useState(false);
  const [syncDone, setSyncDone] = useState(false);
  const [addingKey, setAddingKey]       = useState<string | null>(null);
  const [addedKeys, setAddedKeys]       = useState<Set<string>>(new Set());
  const [addedVitals, setAddedVitals]   = useState<Set<number>>(new Set());
  const [addedReferrals, setAddedReferrals] = useState<Set<number>>(new Set());

  const [editDiag, setEditDiag]   = useState(false);
  const [diagText, setDiagText]   = useState('');
  const [editNotes, setEditNotes] = useState(false);
  const [notesText, setNotesText] = useState('');
  const [addFinding, setAddFinding] = useState('');
  const [addMedName, setAddMedName] = useState('');
  const [addMedDose, setAddMedDose] = useState('');
  const [addTaskTitle, setAddTaskTitle] = useState('');
  const [addTaskFor, setAddTaskFor] = useState<TaskFor>('caregiver');

  useEffect(() => {
    if (doc?.aiAnalysisResult) {
      setAnalysis({ ...doc.aiAnalysisResult });
      setDiagText(doc.aiAnalysisResult.simplifiedDiagnosis ?? '');
      setNotesText(doc.aiAnalysisResult.doctorNotes ?? '');
    } else {
      setAnalysis(null);
    }
    setSyncDone(false);
    setAddedKeys(new Set());
    setAddedVitals(new Set());
    setAddedReferrals(new Set());
    setEditDiag(false);
    setEditNotes(false);
  }, [doc?.id]);

  if (!doc) return null;

  async function patch(p: Partial<AiAnalysis>) {
    if (!analysis) return;
    const next = { ...analysis, ...p };
    setSaving(true);
    try {
      await apiFetch(`/medical-documents/${doc!.id}/analysis`, {
        method: 'PATCH',
        body: JSON.stringify(p),
      });
      setAnalysis(next);
      onDocUpdated({ ...doc!, aiAnalysisResult: next });
    } finally { setSaving(false); }
  }

  async function syncToPatient(opts: Record<string, boolean>) {
    setSyncing(true);
    try {
      await apiFetch(`/medical-documents/${doc!.id}/sync-to-patient`, {
        method: 'POST', body: JSON.stringify(opts),
      });
      setSyncDone(true);
    } finally { setSyncing(false); }
  }

  async function addToBoard(task: ExtractedTask) {
    if (!activeFamilyId) return;
    setAddingKey(task.title);
    try {
      await apiFetch('/tasks', {
        method: 'POST',
        body: JSON.stringify({
          familyId: activeFamilyId,
          title: task.title,
          description: task.description || null,
          priority: 'medium', category: 'medical', status: 'todo',
          ...(task.taskFor === 'patient' && doc!.patientId ? { patientId: doc!.patientId } : {}),
        }),
      });
      setAddedKeys(p => new Set(p).add(task.title));
    } catch { /* apiFetch logs it */ }
    finally { setAddingKey(null); }
  }

  async function addVitalToSystem(vital: ExtractedVital, idx: number) {
    try {
      await apiFetch('/vitals', {
        method: 'POST',
        body: JSON.stringify({
          type: vital.type,
          value: vital.value,
          value2: vital.value2 ?? null,
          unit: vital.unit,
          notes: vital.notes ?? null,
          recordedAt: new Date().toISOString(),
        }),
      });
      setAddedVitals(p => new Set(p).add(idx));
    } catch { /* logged by apiFetch */ }
  }

  async function addReferralToSystem(referral: ExtractedReferral, idx: number) {
    const daysAhead = referral.urgency === 'urgent' ? 7 : referral.urgency === 'soon' ? 30 : 90;
    const visitDate = new Date();
    visitDate.setDate(visitDate.getDate() + daysAhead);
    try {
      await apiFetch('/visits', {
        method: 'POST',
        body: JSON.stringify({
          doctorName: lang === 'he' ? 'לא נקבע עדיין' : 'TBD',
          specialty: referral.specialty,
          date: visitDate.toISOString(),
          summary: referral.reason || null,
          status: 'scheduled',
        }),
      });
      setAddedReferrals(p => new Set(p).add(idx));
    } catch { /* logged by apiFetch */ }
  }

  const urgCfg = analysis ? URGENCY[analysis.urgencyLevel] : null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={onClose} aria-hidden />

      {/* Full-screen panel */}
      <div
        dir={dir}
        className="fixed inset-0 z-50 flex flex-col bg-[hsl(var(--background))] overflow-hidden"
        role="dialog" aria-modal
      >
        {/* ═══════ TOP HEADER BAR ═══════ */}
        <header className="shrink-0 flex items-center gap-4 px-6 py-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[hsl(var(--primary))]/12 shrink-0">
            <FileText className="w-5 h-5 text-[hsl(var(--primary))]" />
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-lg text-[hsl(var(--foreground))] truncate leading-tight">{doc.title}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">
              {doc.documentType && <span className="font-medium">{DOC_TYPES_HE[doc.documentType] ?? doc.documentType}</span>}
              {doc.issuingDoctor && <><span>·</span><span>{doc.issuingDoctor}</span></>}
              {doc.hospitalName  && <><span>·</span><span>{doc.hospitalName}</span></>}
              {doc.patientName   && <><span>·</span><span className="font-semibold text-[hsl(var(--primary))]">{doc.patientName}</span></>}
              <span>·</span>
              <span>{new Date(doc.createdAt).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
          </div>

          {/* Status pills */}
          <div className="flex items-center gap-2 shrink-0">
            {urgCfg && (
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${urgCfg.bg} ${urgCfg.text} ${urgCfg.border}`}>
                {urgCfg.icon}{urgCfg.label}
              </span>
            )}
            {analysis?.followUpRequired && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800">
                <AlertTriangle className="w-3.5 h-3.5" />
                {lang === 'he' ? 'נדרש מעקב' : 'Follow-up required'}
              </span>
            )}
            {saving && (
              <span className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />{lang === 'he' ? 'שומר...' : 'Saving...'}
              </span>
            )}
          </div>

          <button
            type="button" onClick={onClose}
            className="shrink-0 flex items-center justify-center w-9 h-9 rounded-xl border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
            aria-label="סגור"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* ═══════ BODY ═══════ */}
        {!analysis ? (
          /* ── Empty state ── */
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
            <div className="w-20 h-20 rounded-2xl bg-[hsl(var(--muted))] flex items-center justify-center">
              <Brain className="w-10 h-10 text-[hsl(var(--muted-foreground))]/40" />
            </div>
            <div>
              <p className="font-semibold text-lg">{lang === 'he' ? 'המסמך לא נותח עדיין' : 'Document not analyzed yet'}</p>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                {lang === 'he' ? 'סגור וכלל "נתח עם AI" בכרטיס המסמך' : 'Close and click "Analyze with AI" on the document card'}
              </p>
            </div>
            {doc.fileUrl && (
              <button type="button" onClick={async () => {
                const res = await fetch(`/api/medical-documents/${doc.id}/serve`, { credentials: 'include' });
                if (res.ok) { const blob = await res.blob(); window.open(URL.createObjectURL(blob), '_blank'); }
              }} className="btn-outline flex items-center gap-2">
                <FileText className="w-4 h-4" />{lang === 'he' ? 'פתח קובץ' : 'Open file'}
              </button>
            )}
          </div>
        ) : (
          /* ── Two-column layout ── */
          <div className="flex-1 overflow-hidden flex">

            {/* ── LEFT SIDEBAR ── */}
            <aside className="w-72 shrink-0 border-e border-[hsl(var(--border))] bg-[hsl(var(--card))]/50 overflow-y-auto flex flex-col gap-0">

              {/* File action */}
              {doc.fileUrl && (
                <div className="px-5 py-4 border-b border-[hsl(var(--border))]">
                  <button type="button" onClick={async () => {
                    const res = await fetch(`/api/medical-documents/${doc.id}/serve`, { credentials: 'include' });
                    if (res.ok) { const blob = await res.blob(); window.open(URL.createObjectURL(blob), '_blank'); }
                  }} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] hover:bg-[hsl(var(--muted))] transition-colors text-sm font-medium">
                    <FileText className="w-4 h-4 text-[hsl(var(--primary))]" />
                    {lang === 'he' ? 'פתח קובץ מקורי' : 'Open original file'}
                  </button>
                </div>
              )}

              {/* Diagnosis card */}
              <div className="px-5 py-4 border-b border-[hsl(var(--border))]">
                <SideLabel icon={<Stethoscope className="w-3.5 h-3.5" />} title={lang === 'he' ? 'אבחנה' : 'Diagnosis'} />
                {editDiag ? (
                  <div className="space-y-2 mt-2">
                    <textarea value={diagText} onChange={e => setDiagText(e.target.value)} rows={4} className="input-base text-sm resize-none" />
                    <div className="flex gap-2">
                      <button onClick={async () => { await patch({ simplifiedDiagnosis: diagText }); setEditDiag(false); }} className="btn-primary-xs gap-1"><Save className="w-3 h-3" />{lang === 'he' ? 'שמור' : 'Save'}</button>
                      <button onClick={() => { setEditDiag(false); setDiagText(analysis.simplifiedDiagnosis); }} className="btn-ghost-xs">{lang === 'he' ? 'ביטול' : 'Cancel'}</button>
                    </div>
                  </div>
                ) : (
                  <div className="group flex items-start justify-between gap-1 mt-2">
                    <p className="text-sm leading-relaxed text-[hsl(var(--foreground))]">
                      {analysis.simplifiedDiagnosis || <em className="text-[hsl(var(--muted-foreground))]">{lang === 'he' ? 'לא זוהתה' : 'Not identified'}</em>}
                    </p>
                    <button onClick={() => setEditDiag(true)} className="shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[hsl(var(--muted))] transition-all">
                      <Edit2 className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
                    </button>
                  </div>
                )}
              </div>

              {/* Doctor notes */}
              {(analysis.doctorNotes || editNotes) && (
                <div className="px-5 py-4 border-b border-[hsl(var(--border))]">
                  <SideLabel icon={<Info className="w-3.5 h-3.5" />} title={lang === 'he' ? 'הערות רופא' : "Doctor's notes"} />
                  {editNotes ? (
                    <div className="space-y-2 mt-2">
                      <textarea value={notesText} onChange={e => setNotesText(e.target.value)} rows={3} className="input-base text-sm resize-none" />
                      <div className="flex gap-2">
                        <button onClick={async () => { await patch({ doctorNotes: notesText }); setEditNotes(false); }} className="btn-primary-xs gap-1"><Save className="w-3 h-3" />{lang === 'he' ? 'שמור' : 'Save'}</button>
                        <button onClick={() => { setEditNotes(false); setNotesText(analysis.doctorNotes); }} className="btn-ghost-xs">{lang === 'he' ? 'ביטול' : 'Cancel'}</button>
                      </div>
                    </div>
                  ) : (
                    <div className="group flex items-start justify-between gap-1 mt-2">
                      <p className="text-sm leading-relaxed text-amber-700 dark:text-amber-300">{analysis.doctorNotes}</p>
                      <button onClick={() => setEditNotes(true)} className="shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[hsl(var(--muted))] transition-all">
                        <Edit2 className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Sync section */}
              {doc.patientId && (
                <div className="px-5 py-4 mt-auto">
                  <SyncPanel
                    lang={lang}
                    syncing={syncing}
                    syncDone={syncDone}
                    medCount={(analysis.extractedMedications ?? []).length}
                    hasDiagnosis={!!analysis.simplifiedDiagnosis}
                    hasFindings={(analysis.keyFindings ?? []).length > 0}
                    vitalCount={(analysis.extractedVitals ?? []).length}
                    referralCount={(analysis.extractedReferrals ?? []).length}
                    onSync={syncToPatient}
                  />
                </div>
              )}
            </aside>

            {/* ── MAIN CONTENT ── */}
            <main className="flex-1 overflow-y-auto">
              <div className="max-w-4xl mx-auto px-8 py-6 space-y-6">

                {/* Key Findings */}
                <Card title={lang === 'he' ? 'ממצאים עיקריים' : 'Key Findings'} icon={<Brain className="w-4 h-4" />}>
                  {(analysis.keyFindings ?? []).length === 0 ? (
                    <p className="text-sm text-[hsl(var(--muted-foreground))] italic">{lang === 'he' ? 'אין ממצאים' : 'No findings'}</p>
                  ) : (
                    <ul className="space-y-2">
                      {analysis.keyFindings.map((f, i) => (
                        <li key={i} className="group flex items-start gap-3">
                          <span className="mt-2 h-2 w-2 rounded-full bg-[hsl(var(--primary))] shrink-0" />
                          <span className="text-sm flex-1 leading-relaxed">{f}</span>
                          <button onClick={() => patch({ keyFindings: analysis.keyFindings.filter((_, j) => j !== i) })}
                            className="shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 transition-all">
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <AddRow
                    value={addFinding} onChange={setAddFinding}
                    placeholder={lang === 'he' ? 'הוסף ממצא...' : 'Add finding...'}
                    onAdd={() => {
                      if (!addFinding.trim()) return;
                      patch({ keyFindings: [...(analysis.keyFindings ?? []), addFinding.trim()] });
                      setAddFinding('');
                    }}
                  />
                </Card>

                {/* Allergy Warnings */}
                {(analysis.extractedAllergyWarnings ?? []).length > 0 && (
                  <div className="rounded-xl border-2 border-red-400 bg-red-50 dark:bg-red-950/30 p-4 space-y-2">
                    <p className="text-sm font-bold text-red-700 dark:text-red-300 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      ⚠️ {lang === 'he' ? 'אזהרות רגישות / אלרגיות — אסור לתת!' : 'Allergy Warnings — Do NOT administer!'}
                    </p>
                    {(analysis.extractedAllergyWarnings ?? []).map((a, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-100/50 dark:bg-red-950/40 px-3 py-2">
                        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                        <div>
                          <span className="text-sm font-bold text-red-700 dark:text-red-300">{a.substance}</span>
                          <span className="text-xs text-red-600 dark:text-red-400 ml-2">— {a.reactionType}</span>
                          {a.notes && <p className="text-xs text-red-500 mt-0.5">{a.notes}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Medications */}
                <Card title={lang === 'he' ? 'תרופות שזוהו' : 'Identified Medications'} icon={<Pill className="w-4 h-4" />}>
                  {(analysis.extractedMedications ?? []).length === 0 ? (
                    <p className="text-sm text-[hsl(var(--muted-foreground))] italic">{lang === 'he' ? 'לא זוהו תרופות' : 'No medications identified'}</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="border-b border-[hsl(var(--border))] text-xs text-[hsl(var(--muted-foreground))]">
                            <th className="text-right py-1.5 pr-2 font-semibold">{lang === 'he' ? 'שם תרופה' : 'Medication'}</th>
                            <th className="text-right py-1.5 px-2 font-semibold">{lang === 'he' ? 'מינון' : 'Dose'}</th>
                            <th className="text-right py-1.5 px-2 font-semibold">{lang === 'he' ? 'צורה' : 'Form'}</th>
                            <th className="text-right py-1.5 px-2 font-semibold">{lang === 'he' ? 'תדירות' : 'Frequency'}</th>
                            <th className="py-1.5 px-1 w-6"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {analysis.extractedMedications.map((med, i) => (
                            <tr key={i} className={`border-b border-[hsl(var(--border))]/50 group ${i % 2 === 0 ? 'bg-[hsl(var(--muted))]/20' : ''}`}>
                              <td className="py-1.5 pr-2 font-medium text-[hsl(var(--primary))]">{med.name}</td>
                              <td className="py-1.5 px-2 text-[hsl(var(--muted-foreground))] whitespace-nowrap">{med.dosage || '—'}</td>
                              <td className="py-1.5 px-2 text-[hsl(var(--muted-foreground))] whitespace-nowrap">{med.form || '—'}</td>
                              <td className="py-1.5 px-2 text-[hsl(var(--muted-foreground))] whitespace-nowrap">{med.frequency || (med.duration || '—')}</td>
                              <td className="py-1.5 px-1">
                                <button onClick={() => patch({ extractedMedications: analysis.extractedMedications.filter((_, j) => j !== i) })}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity">
                                  <X className="w-3 h-3 text-[hsl(var(--muted-foreground))] hover:text-red-500" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <div className="flex gap-2 mt-3">
                    <input type="text" value={addMedName} onChange={e => setAddMedName(e.target.value)}
                      placeholder={lang === 'he' ? 'שם תרופה...' : 'Medication name...'}
                      className="input-base flex-1 text-sm" />
                    <input type="text" value={addMedDose} onChange={e => setAddMedDose(e.target.value)}
                      placeholder={lang === 'he' ? 'מינון...' : 'Dosage...'}
                      className="input-base w-28 text-sm" />
                    <button onClick={() => {
                      if (!addMedName.trim()) return;
                      patch({ extractedMedications: [...(analysis.extractedMedications ?? []), { name: addMedName.trim(), dosage: addMedDose.trim() || undefined }] });
                      setAddMedName(''); setAddMedDose('');
                    }} className="btn-primary-xs"><Plus className="w-3.5 h-3.5" /></button>
                  </div>
                </Card>

                {/* Medical History */}
                {(analysis.extractedMedicalHistory ?? []).length > 0 && (
                  <Card title={lang === 'he' ? 'היסטוריה רפואית' : 'Medical History'} icon={<Activity className="w-4 h-4" />}>
                    <div className="space-y-3">
                      {(['active', 'past'] as const).map(status => {
                        const items = (analysis.extractedMedicalHistory ?? []).filter(h => h.status === status);
                        if (!items.length) return null;
                        return (
                          <div key={status}>
                            <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] mb-1.5 uppercase tracking-wide">
                              {status === 'active'
                                ? (lang === 'he' ? '🔵 בעיות פעילות' : '🔵 Active Problems')
                                : (lang === 'he' ? '⬜ היסטוריה / בעבר' : '⬜ Past History')}
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {items.map((h, i) => (
                                <span key={i} className={`inline-flex items-center gap-1 text-xs rounded-full px-2.5 py-0.5 border font-medium ${status === 'active' ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200' : 'bg-[hsl(var(--muted))]/40 border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]'}`}>
                                  {h.condition}
                                  {h.diagnosisDate && <span className="opacity-60">({h.diagnosisDate.slice(0, 4)})</span>}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                )}

                {/* Tasks */}
                <Card title={lang === 'he' ? 'משימות ופעולות' : 'Tasks & Actions'} icon={<ClipboardList className="w-4 h-4" />}>
                  <TasksPanel
                    tasks={analysis.extractedTasks ?? []}
                    addingKey={addingKey}
                    addedKeys={addedKeys}
                    lang={lang}
                    onAddToBoard={addToBoard}
                    onRemove={i => patch({ extractedTasks: analysis.extractedTasks.filter((_, j) => j !== i) })}
                    allergyWarnings={analysis.extractedAllergyWarnings}
                  />
                  {/* Add task row */}
                  <div className="pt-4 mt-4 border-t border-[hsl(var(--border))] space-y-2">
                    <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">
                      {lang === 'he' ? 'הוסף משימה' : 'Add task'}
                    </p>
                    <div className="flex gap-2">
                      <input type="text" value={addTaskTitle} onChange={e => setAddTaskTitle(e.target.value)}
                        placeholder={lang === 'he' ? 'כותרת משימה...' : 'Task title...'}
                        className="input-base flex-1 text-sm"
                        onKeyDown={e => { if (e.key === 'Enter' && addTaskTitle.trim()) { patch({ extractedTasks: [...(analysis.extractedTasks ?? []), { title: addTaskTitle.trim(), taskFor: addTaskFor }] }); setAddTaskTitle(''); } }}
                      />
                      <select value={addTaskFor} onChange={e => setAddTaskFor(e.target.value as TaskFor)} className="input-base text-sm w-40">
                        <option value="patient">{lang === 'he' ? 'למטופל' : 'Patient'}</option>
                        <option value="caregiver">{lang === 'he' ? 'לצוות/משפחה' : 'Caregiver'}</option>
                        <option value="note">{lang === 'he' ? 'הערה' : 'Note'}</option>
                      </select>
                      <button onClick={() => {
                        if (!addTaskTitle.trim()) return;
                        patch({ extractedTasks: [...(analysis.extractedTasks ?? []), { title: addTaskTitle.trim(), taskFor: addTaskFor }] });
                        setAddTaskTitle('');
                      }} className="btn-primary-xs"><Plus className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </Card>

                {/* Vitals & Measurements */}
                {((analysis.extractedVitals ?? []).length > 0) && (
                  <Card title={lang === 'he' ? 'מדדים ומדידות' : 'Vitals & Measurements'} icon={<Activity className="w-4 h-4" />}>
                    <div className="space-y-2">
                      {(analysis.extractedVitals ?? []).map((v, i) => (
                        <div key={i} className="group flex items-center gap-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-3">
                          <Activity className="w-4 h-4 text-[hsl(var(--primary))] shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{VITAL_LABELS_HE[v.type] ?? v.type}</p>
                            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                              {v.value2 != null ? `${v.value} / ${v.value2}` : v.value} {v.unit}
                              {v.notes ? ` · ${v.notes}` : ''}
                            </p>
                          </div>
                          <div className="shrink-0">
                            {addedVitals.has(i) ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 font-medium">
                                <CheckCircle2 className="w-3 h-3" />{lang === 'he' ? 'נוסף' : 'Added'}
                              </span>
                            ) : (
                              <button onClick={() => addVitalToSystem(v, i)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] border-[hsl(var(--primary))]/20 hover:bg-[hsl(var(--primary))]/20 transition-colors">
                                <Plus className="w-3 h-3" />{lang === 'he' ? 'הוסף למדדים' : 'Add to Vitals'}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Lab Values */}
                {((analysis.extractedLabValues ?? []).length > 0) && (
                  <Card title={lang === 'he' ? 'בדיקות מעבדה' : 'Lab Results'} icon={<FlaskConical className="w-4 h-4" />}>
                    <div className="space-y-2">
                      {(analysis.extractedLabValues ?? []).map((lab, i) => (
                        <div key={i} className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                          lab.isAbnormal
                            ? 'border-red-200 dark:border-red-800 bg-red-50/60 dark:bg-red-950/20'
                            : 'border-[hsl(var(--border))] bg-[hsl(var(--background))]'
                        }`}>
                          {lab.isAbnormal
                            ? <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                            : <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${lab.isAbnormal ? 'text-red-700 dark:text-red-300' : ''}`}>{lab.name}</p>
                            <p className={`text-xs mt-0.5 ${lab.isAbnormal ? 'text-red-600 dark:text-red-400' : 'text-[hsl(var(--muted-foreground))]'}`}>
                              {lab.value}{lab.unit ? ` ${lab.unit}` : ''}
                              {lab.isAbnormal ? (lang === 'he' ? ' · חריג' : ' · Abnormal') : ''}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Referrals */}
                {((analysis.extractedReferrals ?? []).length > 0) && (
                  <Card title={lang === 'he' ? 'הפניות לרופאים מומחים' : 'Specialist Referrals'} icon={<CalendarPlus className="w-4 h-4" />}>
                    <div className="space-y-2">
                      {(analysis.extractedReferrals ?? []).map((ref, i) => {
                        const urgMap = { urgent: URGENCY.urgent, soon: URGENCY.soon, routine: URGENCY.routine };
                        const urg = urgMap[ref.urgency];
                        return (
                          <div key={i} className="group flex items-start gap-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-medium">{ref.specialty}</p>
                                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${urg.bg} ${urg.text} ${urg.border}`}>
                                  {urg.icon}{urg.label}
                                </span>
                              </div>
                              {ref.reason && <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{ref.reason}</p>}
                            </div>
                            <div className="shrink-0">
                              {addedReferrals.has(i) ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 font-medium">
                                  <CheckCircle2 className="w-3 h-3" />{lang === 'he' ? 'נוסף' : 'Added'}
                                </span>
                              ) : (
                                <button onClick={() => addReferralToSystem(ref, i)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] border-[hsl(var(--primary))]/20 hover:bg-[hsl(var(--primary))]/20 transition-colors">
                                  <Plus className="w-3 h-3" />{lang === 'he' ? 'הוסף לתורים' : 'Add to Visits'}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                )}

              </div>
            </main>
          </div>
        )}
      </div>
    </>
  );
}

// ── Helper components ─────────────────────────────────────────────────────────

function SideLabel({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
      {icon}{title}
    </p>
  );
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-sm font-bold text-[hsl(var(--foreground))] mb-4">
        <span className="flex items-center justify-center w-6 h-6 rounded-md bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]">{icon}</span>
        {title}
      </h2>
      {children}
    </div>
  );
}

function AddRow({ value, onChange, placeholder, onAdd }: {
  value: string; onChange: (v: string) => void; placeholder: string; onAdd: () => void;
}) {
  return (
    <div className="flex gap-2 mt-3">
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="input-base flex-1 text-sm"
        onKeyDown={e => e.key === 'Enter' && onAdd()} />
      <button type="button" onClick={onAdd} className="btn-primary-xs"><Plus className="w-3.5 h-3.5" /></button>
    </div>
  );
}

function TasksPanel({ tasks, addingKey, addedKeys, lang, onAddToBoard, onRemove, allergyWarnings }: {
  tasks: ExtractedTask[]; addingKey: string | null; addedKeys: Set<string>;
  lang: string; onAddToBoard: (t: ExtractedTask) => void; onRemove: (i: number) => void;
  allergyWarnings?: AllergyWarning[];
}) {
  const withIdx = tasks.map((t, i) => ({ ...t, _i: i }));
  const patientTasks   = withIdx.filter(t => t.taskFor === 'patient');
  // treat missing/unknown taskFor as caregiver (backward compat with pre-taskFor analyses)
  const caregiverTasks = withIdx.filter(t => t.taskFor === 'caregiver' || !t.taskFor);
  const notes          = withIdx.filter(t => t.taskFor === 'note');

  if (tasks.length === 0) {
    return <p className="text-sm text-[hsl(var(--muted-foreground))] italic py-2">{lang === 'he' ? 'אין משימות עדיין' : 'No tasks yet'}</p>;
  }

  const renderTask = (t: ExtractedTask & { _i: number }) => {
    const isNote    = t.taskFor === 'note';
    const isPatient = t.taskFor === 'patient';
    const adding    = addingKey === t.title;
    const added     = addedKeys.has(t.title);

    if (isNote) {
      return (
        <div key={t._i} className="group flex items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/20 px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">{t.title}</p>
            {t.description && <p className="text-xs text-amber-700/70 dark:text-amber-400/70 mt-0.5">{t.description}</p>}
          </div>
          <button onClick={() => onRemove(t._i)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30 transition-all shrink-0">
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
          </button>
        </div>
      );
    }

    return (
      <div key={t._i} className={`group flex items-start gap-3 rounded-xl border px-4 py-3 ${
        isPatient
          ? 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20'
          : 'border-[hsl(var(--border))] bg-[hsl(var(--background))]'
      }`}>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{t.title}</p>
          {t.description && <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{t.description}</p>}
        </div>
        <div className="shrink-0 flex items-center gap-1.5">
          {added ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 font-medium">
              <CheckCircle2 className="w-3 h-3" />{lang === 'he' ? 'נוסף' : 'Added'}
            </span>
          ) : (
            <button onClick={() => onAddToBoard(t)} disabled={!!adding}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 ${
                isPatient
                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40'
                  : 'bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] border-[hsl(var(--primary))]/20 hover:bg-[hsl(var(--primary))]/20'
              }`}
            >
              <Plus className="w-3 h-3" />
              {adding ? '...' : isPatient ? (lang === 'he' ? 'הוסף למטופל' : 'Patient') : (lang === 'he' ? 'הוסף ללוח' : 'Board')}
            </button>
          )}
          <button onClick={() => onRemove(t._i)} className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 transition-all">
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {patientTasks.length > 0 && (
        <div>
          <p className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 mb-2 uppercase tracking-wide">
            <UserRound className="w-3.5 h-3.5" />{lang === 'he' ? 'משימות למטופל' : 'Patient tasks'}
          </p>
          <div className="space-y-2">{patientTasks.map(renderTask)}</div>
        </div>
      )}
      {caregiverTasks.length > 0 && (
        <div>
          <p className="flex items-center gap-1.5 text-xs font-bold text-[hsl(var(--muted-foreground))] mb-2 uppercase tracking-wide">
            <Users className="w-3.5 h-3.5" />{lang === 'he' ? 'משימות לצוות / משפחה' : 'Caregiver tasks'}
          </p>
          <div className="space-y-2">{caregiverTasks.map(renderTask)}</div>
        </div>
      )}
      {(notes.length > 0 || (allergyWarnings && allergyWarnings.length > 0)) && (
        <div>
          <p className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 mb-2 uppercase tracking-wide">
            <Info className="w-3.5 h-3.5" />{lang === 'he' ? 'הערות ואזהרות' : 'Notes & Warnings'}
          </p>
          <div className="space-y-2">
            {/* Show allergy warnings at the top of the notes section for visibility */}
            {(allergyWarnings ?? []).map((a, i) => (
              <div key={`allergy-${i}`} className="flex items-start gap-3 rounded-xl border-2 border-red-300 dark:border-red-700 bg-red-50/80 dark:bg-red-950/30 px-4 py-3">
                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-red-700 dark:text-red-300">
                    ⚠️ {lang === 'he' ? `רגישות: ${a.substance}` : `Allergy: ${a.substance}`}
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{a.reactionType}{a.notes ? ` · ${a.notes}` : ''}</p>
                </div>
              </div>
            ))}
            {notes.map(renderTask)}
          </div>
        </div>
      )}
    </div>
  );
}

function SyncPanel({ lang, syncing, syncDone, medCount, hasDiagnosis, hasFindings, vitalCount, referralCount, onSync }: {
  lang: string; syncing: boolean; syncDone: boolean;
  medCount: number; hasDiagnosis: boolean; hasFindings: boolean;
  vitalCount: number; referralCount: number;
  onSync: (opts: Record<string, boolean>) => void;
}) {
  const [syncMeds, setSyncMeds]       = useState(true);
  const [syncDiag, setSyncDiag]       = useState(false);
  const [syncConds, setSyncConds]     = useState(false);
  const [syncVitals, setSyncVitals]   = useState(false);
  const [syncRefs, setSyncRefs]       = useState(false);

  const nothingSelected = !syncMeds && !syncDiag && !syncConds && !syncVitals && !syncRefs;

  if (syncDone) return (
    <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20 p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-green-600 dark:text-green-400" />
        <p className="text-sm font-bold text-green-700 dark:text-green-300">
          {lang === 'he' ? 'פרופיל עודכן!' : 'Profile synced!'}
        </p>
      </div>
    </div>
  );

  return (
    <div className="rounded-xl border border-[hsl(var(--primary))]/30 bg-[hsl(var(--primary))]/6 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <ArrowUpCircle className="w-4 h-4 text-[hsl(var(--primary))]" />
        <p className="text-sm font-bold text-[hsl(var(--primary))]">
          {lang === 'he' ? 'סנכרון למערכת' : 'Sync to System'}
        </p>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 font-semibold">
          {lang === 'he' ? 'קריטי' : 'Critical'}
        </span>
      </div>
      <div className="space-y-2">
        {medCount > 0 && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={syncMeds} onChange={e => setSyncMeds(e.target.checked)} className="rounded accent-[hsl(var(--primary))]" />
            <span className="text-xs"><Pill className="inline w-3 h-3 me-1" />{lang === 'he' ? `${medCount} תרופות` : `${medCount} medications`}</span>
          </label>
        )}
        {hasDiagnosis && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={syncDiag} onChange={e => setSyncDiag(e.target.checked)} className="rounded accent-[hsl(var(--primary))]" />
            <span className="text-xs"><Stethoscope className="inline w-3 h-3 me-1" />{lang === 'he' ? 'אבחנה ראשית' : 'Primary diagnosis'}</span>
          </label>
        )}
        {hasFindings && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={syncConds} onChange={e => setSyncConds(e.target.checked)} className="rounded accent-[hsl(var(--primary))]" />
            <span className="text-xs"><Brain className="inline w-3 h-3 me-1" />{lang === 'he' ? 'ממצאים → מצבים רפואיים' : 'Findings → Conditions'}</span>
          </label>
        )}
        {vitalCount > 0 && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={syncVitals} onChange={e => setSyncVitals(e.target.checked)} className="rounded accent-[hsl(var(--primary))]" />
            <span className="text-xs"><Activity className="inline w-3 h-3 me-1" />{lang === 'he' ? `${vitalCount} מדדים → עמוד מדדים` : `${vitalCount} vitals → Vitals page`}</span>
          </label>
        )}
        {referralCount > 0 && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={syncRefs} onChange={e => setSyncRefs(e.target.checked)} className="rounded accent-[hsl(var(--primary))]" />
            <span className="text-xs"><CalendarPlus className="inline w-3 h-3 me-1" />{lang === 'he' ? `${referralCount} הפניות → תורים` : `${referralCount} referrals → Visits`}</span>
          </label>
        )}
      </div>
      <button
        type="button"
        disabled={syncing || nothingSelected}
        onClick={() => onSync({ syncMedications: syncMeds, syncDiagnosis: syncDiag, syncConditions: syncConds, syncVitals, syncReferrals: syncRefs })}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold bg-[hsl(var(--primary))] text-white hover:bg-[hsl(var(--primary))]/90 disabled:opacity-50 transition-colors"
      >
        {syncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowUpCircle className="w-4 h-4" />}
        {syncing ? (lang === 'he' ? 'מסנכרן...' : 'Syncing...') : (lang === 'he' ? 'סנכרן עכשיו' : 'Sync Now')}
      </button>
    </div>
  );
}
