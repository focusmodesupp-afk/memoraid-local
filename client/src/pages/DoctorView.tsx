import React, { useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import { apiFetch } from '../lib/api';
import {
  Stethoscope, User, ClipboardList, Phone, FileText, Pill, BookOpen,
  Activity, FlaskConical, ArrowRightLeft, AlertTriangle, CheckCircle2,
  Brain, Calendar, Clock, ChevronRight,
} from 'lucide-react';
import AIInsightsPanel from '../components/AIInsightsPanel';

type Patient = {
  id: string;
  fullName: string | null;
  dateOfBirth: string | null;
  primaryDiagnosis: string | null;
  emergencyContact: string | null;
  emergencyContactPhone: string | null;
  primaryDoctorName: string | null;
  primaryDoctorPhone: string | null;
  healthFundName: string | null;
  notes: string | null;
  mobilityStatus: string | null;
  cognitiveStatus: string | null;
  careLevel: string | null;
  adlScore: number | null;
  iadlScore: number | null;
  fallRiskLevel: string | null;
};

type CognitiveTimelineStage = {
  stage: string;
  count: number;
  avgSeverity: number | null;
  unreportedCount: number;
  firstDate: string | null;
  lastDate: string | null;
  recentEntries: Array<{
    id: string;
    title: string;
    content: string | null;
    occurredAt: string | null;
    createdAt: string;
    severity: number | null;
    tags: string[] | null;
    isReportedToDoctor: boolean;
    careStage: string | null;
  }>;
};

type DoctorSummary = {
  patient: Patient;
  recentMemories: Array<{ id: string; title: string; content: string | null; occurredAt: string | null }>;
  medicalDocuments: Array<{ id: string; title: string; documentType: string | null }>;
  medications: Array<{ id: string; name: string; dosage: string | null; frequency: string | null }>;
  recentTasks: Array<{ id: string; title: string; status: string; priority: string; dueDate: string | null }>;
  recentVitals: Array<{ id: string; type: string; value: string; value2: string | null; unit: string; isAbnormal: boolean; recordedAt: string }>;
  recentLabResults: Array<{ id: string; testName: string; value: string; unit: string | null; isAbnormal: boolean; testDate: string | null }>;
  pendingReferrals: Array<{ id: string; specialty: string; reason: string; urgency: string; status: string; createdAt: string }>;
  recentAssessments: Array<{ id: string; assessmentType: string; score: number; maxScore: number | null; assessedAt: string }>;
  alerts: Array<{ id: string; title: string; content: string; severity: string }>;
  cognitiveTimeline: CognitiveTimelineStage[];
  totalUnreportedObservations: number;
  totalObservations: number;
  aiSummary: { insights: string[]; patterns: string[]; alerts: string[] } | null;
};

const STAGE_META: Record<string, { labelHe: string; labelEn: string; colorClass: string; borderClass: string; bgClass: string }> = {
  genetic_awareness: { labelHe: 'מודעות גנטית', labelEn: 'Genetic Awareness', colorClass: 'text-blue-700', borderClass: 'border-blue-200', bgClass: 'bg-blue-50/60' },
  suspicion: { labelHe: 'שלב החשד', labelEn: 'Suspicion Stage', colorClass: 'text-amber-700', borderClass: 'border-amber-200', bgClass: 'bg-amber-50/60' },
  bridge: { labelHe: 'גשר לקשר', labelEn: 'Bridge', colorClass: 'text-purple-700', borderClass: 'border-purple-200', bgClass: 'bg-purple-50/60' },
  certainty: { labelHe: 'שלב הוודאות', labelEn: 'Certainty', colorClass: 'text-red-700', borderClass: 'border-red-200', bgClass: 'bg-red-50/60' },
};

const SEVERITY_COLOR = (s: number | null) => {
  if (!s) return 'bg-[hsl(var(--muted-foreground))]';
  if (s >= 4) return 'bg-red-500';
  if (s === 3) return 'bg-amber-500';
  if (s === 2) return 'bg-yellow-400';
  return 'bg-emerald-400';
};

function calcAge(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return String(Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000)));
}

const URGENCY_BADGE: Record<string, string> = {
  urgent: 'badge-destructive',
  soon: 'badge-warning',
  routine: 'badge-secondary',
};

const URGENCY_LABEL: Record<string, { he: string; en: string }> = {
  urgent: { he: 'דחוף', en: 'Urgent' },
  soon: { he: 'בקרוב', en: 'Soon' },
  routine: { he: 'שגרתי', en: 'Routine' },
};

const ASSESSMENT_SHORT: Record<string, { he: string; en: string }> = {
  adl: { he: 'ADL', en: 'ADL' },
  iadl: { he: 'IADL', en: 'IADL' },
  mmse: { he: 'MMSE', en: 'MMSE' },
  gds: { he: 'GDS', en: 'GDS' },
  falls_risk: { he: 'נפילה', en: 'Falls' },
  pain: { he: 'כאב', en: 'Pain' },
  nutrition: { he: 'תזונה', en: 'Nutrition' },
  frailty: { he: 'שבריריות', en: 'Frailty' },
};

export default function DoctorViewPage() {
  const { dir, lang } = useI18n();
  const [loading, setLoading] = useState(true);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [summary, setSummary] = useState<DoctorSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const patient = await apiFetch<{ id: string }>('/patients/primary').catch(() => null);
        if (cancelled || !patient) { setSummary(null); return; }
        setPatientId(patient.id);
        const data = await apiFetch<DoctorSummary>(`/patients/${patient.id}/doctor-summary`).catch(() => null);
        if (cancelled) return;
        setSummary(data ?? null);
      } catch (err: unknown) {
        if (cancelled) return;
        setError((err as Error)?.message ?? 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div dir={dir} className="flex min-h-[200px] items-center justify-center">
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          {lang === 'he' ? 'טוען סיכום לרופא...' : 'Loading doctor summary...'}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div dir={dir} className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
        <p className="text-sm text-amber-700 dark:text-amber-400">{error}</p>
      </div>
    );
  }

  const patient = summary?.patient ?? null;
  const tasks = summary?.recentTasks ?? [];
  const medications = summary?.medications ?? [];
  const documents = summary?.medicalDocuments ?? [];
  const recentVitals = summary?.recentVitals ?? [];
  const recentLabs = summary?.recentLabResults ?? [];
  const pendingReferrals = summary?.pendingReferrals ?? [];
  const assessments = summary?.recentAssessments ?? [];
  const alerts = summary?.alerts ?? [];
  const cognitiveTimeline = summary?.cognitiveTimeline ?? [];
  const totalObs = summary?.totalObservations ?? 0;
  const totalUnreported = summary?.totalUnreportedObservations ?? 0;

  const tasksByStatus = tasks.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const latestVitalByType = recentVitals.reduce<Record<string, (typeof recentVitals)[0]>>((acc, v) => {
    if (!acc[v.type]) acc[v.type] = v;
    return acc;
  }, {});

  const latestAssessmentByType = assessments.reduce<Record<string, (typeof assessments)[0]>>((acc, a) => {
    if (!acc[a.assessmentType]) acc[a.assessmentType] = a;
    return acc;
  }, {});

  return (
    <div dir={dir} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-[hsl(var(--primary))]" />
            {lang === 'he' ? 'מבט רופא LIVE' : 'Doctor View LIVE'}
          </h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            {lang === 'he' ? 'סיכום מטופל לקריאה מהירה לפני הביקור' : 'Quick patient summary for the visit'}
          </p>
        </div>
      </div>

      {!patient ? (
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] p-6 text-center">
          <p className="text-[hsl(var(--muted-foreground))]">
            {lang === 'he' ? 'עדיין לא הוגדר מטופל.' : 'No patient defined yet.'}
          </p>
        </div>
      ) : (
        <>
          {/* AI Health Insights — critical only */}
          {patientId && <AIInsightsPanel patientId={patientId} compact />}

          {/* Critical alerts summary bar */}
          {alerts.length > 0 && (
            <div className="rounded-xl border border-[hsl(var(--destructive))]/30 bg-[hsl(var(--destructive))]/8 p-3">
              <div className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                <AlertTriangle className="w-4 h-4 text-[hsl(var(--destructive))] shrink-0" />
                <p className="text-sm font-medium text-[hsl(var(--destructive))]">
                  {alerts.length} {lang === 'he' ? 'תובנות קריטיות לא נקראו' : 'unread critical insights'}
                </p>
              </div>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="space-y-6">
              {/* Patient info */}
              <section className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
                  <User className="w-4 h-4" />
                  {lang === 'he' ? 'פרטי מטופל' : 'Patient details'}
                </h3>
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-[hsl(var(--muted-foreground))]">{lang === 'he' ? 'שם' : 'Name'}</dt>
                    <dd className="font-medium">{patient.fullName ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-[hsl(var(--muted-foreground))]">{lang === 'he' ? 'גיל' : 'Age'}</dt>
                    <dd className="font-medium">{calcAge(patient.dateOfBirth) ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-[hsl(var(--muted-foreground))]">{lang === 'he' ? 'אבחנה ראשית' : 'Primary diagnosis'}</dt>
                    <dd className="font-medium">{patient.primaryDiagnosis ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-[hsl(var(--muted-foreground))]">{lang === 'he' ? 'קופת חולים' : 'Health fund'}</dt>
                    <dd className="font-medium">{patient.healthFundName ?? '—'}</dd>
                  </div>
                  {patient.mobilityStatus && (
                    <div>
                      <dt className="text-[hsl(var(--muted-foreground))]">{lang === 'he' ? 'ניידות' : 'Mobility'}</dt>
                      <dd className="font-medium">{patient.mobilityStatus}</dd>
                    </div>
                  )}
                  {patient.cognitiveStatus && (
                    <div>
                      <dt className="text-[hsl(var(--muted-foreground))]">{lang === 'he' ? 'קוגניציה' : 'Cognition'}</dt>
                      <dd className="font-medium">{patient.cognitiveStatus}</dd>
                    </div>
                  )}
                  {patient.fallRiskLevel && (
                    <div>
                      <dt className="text-[hsl(var(--muted-foreground))]">{lang === 'he' ? 'סיכון נפילה' : 'Fall risk'}</dt>
                      <dd className="font-medium capitalize">{patient.fallRiskLevel}</dd>
                    </div>
                  )}
                  {patient.careLevel && (
                    <div>
                      <dt className="text-[hsl(var(--muted-foreground))]">{lang === 'he' ? 'רמת טיפול' : 'Care level'}</dt>
                      <dd className="font-medium">{patient.careLevel}</dd>
                    </div>
                  )}
                </dl>
                {patient.notes && (
                  <div className="mt-3 rounded-lg bg-[hsl(var(--muted)/0.5)] p-3">
                    <dt className="text-[hsl(var(--muted-foreground))] text-xs mb-1">{lang === 'he' ? 'הערות' : 'Notes'}</dt>
                    <dd className="text-sm">{patient.notes}</dd>
                  </div>
                )}
              </section>

              {/* Assessment scores */}
              {Object.keys(latestAssessmentByType).length > 0 && (
                <section className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-sm">
                  <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
                    <Brain className="w-4 h-4" />
                    {lang === 'he' ? 'ציוני הערכה תפקודית' : 'Functional assessment scores'}
                  </h3>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {Object.entries(latestAssessmentByType).map(([type, a]) => {
                      const label = ASSESSMENT_SHORT[type];
                      return (
                        <div key={type} className="rounded-lg border border-[hsl(var(--border))] p-2 text-center">
                          <p className="text-xs text-[hsl(var(--muted-foreground))]">{label ? (lang === 'he' ? label.he : label.en) : type}</p>
                          <p className="text-lg font-bold">{a.score}{a.maxScore != null && <span className="text-xs font-normal">/{a.maxScore}</span>}</p>
                          <p className="text-xs text-[hsl(var(--muted-foreground))]">
                            {new Date(a.assessedAt).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en', { month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* ── Cognitive decline timeline ── */}
              {(cognitiveTimeline.length > 0 || totalObs > 0) && (
                <section className="rounded-xl border border-[hsl(var(--primary))]/20 bg-[hsl(var(--card))] p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <h3 className="flex items-center gap-2 text-sm font-semibold">
                      <Brain className="w-4 h-4 text-[hsl(var(--primary))]" />
                      {lang === 'he' ? 'ציר זמן ירידה קוגניטיבית' : 'Cognitive Decline Timeline'}
                    </h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      {totalUnreported > 0 && (
                        <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                          <AlertTriangle className="w-3 h-3" />
                          {totalUnreported} {lang === 'he' ? 'לא דווחו' : 'unreported'}
                        </span>
                      )}
                      <a href="/memories" className="flex items-center gap-1 text-xs text-[hsl(var(--primary))] hover:underline">
                        {lang === 'he' ? 'לכל התצפיות' : 'All observations'}
                        <ChevronRight className="w-3 h-3 rtl:-scale-x-100" />
                      </a>
                    </div>
                  </div>

                  {/* Stage progress bar */}
                  <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1">
                    {['genetic_awareness', 'suspicion', 'bridge', 'certainty'].map((stage, idx) => {
                      const stageData = cognitiveTimeline.find((s) => s.stage === stage);
                      const meta = STAGE_META[stage];
                      const active = !!stageData;
                      return (
                        <React.Fragment key={stage}>
                          {idx > 0 && <div className="w-4 h-px bg-[hsl(var(--border))] shrink-0" />}
                          <div className={`rounded-lg border px-2.5 py-1.5 text-center shrink-0 ${active ? `${meta.bgClass} ${meta.borderClass}` : 'border-[hsl(var(--border))] opacity-40'}`}>
                            <p className={`text-xs font-semibold ${active ? meta.colorClass : 'text-[hsl(var(--muted-foreground))]'}`}>
                              {lang === 'he' ? meta.labelHe : meta.labelEn}
                            </p>
                            {active && stageData && (
                              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                                {stageData.count} {lang === 'he' ? 'תצפיות' : 'obs'}
                                {stageData.avgSeverity != null && ` · ⌀${stageData.avgSeverity}`}
                              </p>
                            )}
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>

                  {/* Recent entries across all stages */}
                  {cognitiveTimeline.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-2">
                        {lang === 'he' ? 'תצפיות אחרונות' : 'Recent observations'}
                      </p>
                      {cognitiveTimeline.flatMap((s) => s.recentEntries.map((e) => ({ ...e, stageMeta: STAGE_META[s.stage] }))).slice(0, 6).map((entry) => {
                        const meta = entry.stageMeta;
                        return (
                          <div key={entry.id} className={`rounded-lg border p-3 flex items-start gap-2 ${meta ? `${meta.bgClass} ${meta.borderClass}` : 'border-[hsl(var(--border))]'}`}>
                            <div className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${SEVERITY_COLOR(entry.severity)}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                {meta && (
                                  <span className={`text-xs font-medium ${meta.colorClass}`}>
                                    {lang === 'he' ? meta.labelHe : meta.labelEn}
                                  </span>
                                )}
                                {entry.isReportedToDoctor && (
                                  <span className="flex items-center gap-0.5 text-xs text-emerald-600">
                                    <CheckCircle2 className="w-3 h-3" />
                                    {lang === 'he' ? 'דווח' : 'Reported'}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm font-medium leading-snug mt-0.5">{entry.title}</p>
                              {entry.content && (
                                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5 line-clamp-1">{entry.content}</p>
                              )}
                              <div className="flex items-center gap-1 mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                                <Clock className="w-3 h-3" />
                                {new Date(entry.occurredAt ?? entry.createdAt).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en', { dateStyle: 'medium' })}
                                {entry.severity != null && (
                                  <span className="ms-1">· {lang === 'he' ? 'עוצמה' : 'Severity'} {entry.severity}/5</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}

              {/* ── AI pattern summary ── */}
              {summary?.aiSummary && (summary.aiSummary.insights.length > 0 || summary.aiSummary.patterns.length > 0 || summary.aiSummary.alerts.length > 0) && (
                <section className="rounded-xl border border-[hsl(var(--primary))]/15 bg-gradient-to-br from-[hsl(var(--primary))]/3 to-transparent p-4">
                  <h3 className="flex items-center gap-2 text-sm font-semibold mb-3">
                    <Brain className="w-4 h-4 text-[hsl(var(--primary))]" />
                    {lang === 'he' ? 'ניתוח דפוסים — תובנות אוטומטיות' : 'Pattern Analysis — Auto Insights'}
                  </h3>
                  <div className="space-y-3">
                    {summary.aiSummary.alerts.length > 0 && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3">
                        <p className="text-xs font-semibold text-amber-700 mb-1.5">
                          {lang === 'he' ? 'התראות' : 'Alerts'}
                        </p>
                        <ul className="space-y-1">
                          {summary.aiSummary.alerts.map((a, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-xs text-amber-800">
                              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-600" />
                              {a}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {summary.aiSummary.patterns.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-[hsl(var(--foreground))] mb-1.5">
                          {lang === 'he' ? 'דפוסים שזוהו' : 'Identified patterns'}
                        </p>
                        <ul className="space-y-1">
                          {summary.aiSummary.patterns.map((p, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-xs text-[hsl(var(--muted-foreground))]">
                              <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[hsl(var(--primary))]" />
                              {p}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {summary.aiSummary.insights.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-[hsl(var(--foreground))] mb-1.5">
                          {lang === 'he' ? 'תובנות נוספות' : 'Additional insights'}
                        </p>
                        <ul className="space-y-1">
                          {summary.aiSummary.insights.map((ins, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-xs text-[hsl(var(--muted-foreground))]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--primary))]/60 mt-1 shrink-0" />
                              {ins}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Recent vitals */}
              {Object.keys(latestVitalByType).length > 0 && (
                <section className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-sm">
                  <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
                    <Activity className="w-4 h-4" />
                    {lang === 'he' ? 'מדדים אחרונים' : 'Recent vitals'}
                  </h3>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {Object.entries(latestVitalByType).map(([type, v]) => (
                      <div key={type} className={`rounded-lg border p-3 ${v.isAbnormal ? 'border-[hsl(var(--destructive))]/30 bg-[hsl(var(--destructive))]/5' : 'border-[hsl(var(--border))]'}`}>
                        <p className="text-xs text-[hsl(var(--muted-foreground))] capitalize">{type.replace('_', ' ')}</p>
                        <p className={`text-base font-bold ${v.isAbnormal ? 'text-[hsl(var(--destructive))]' : ''}`}>
                          {v.value}{v.value2 ? `/${v.value2}` : ''}
                          <span className="text-xs font-normal ms-0.5">{v.unit}</span>
                        </p>
                        {v.isAbnormal && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <AlertTriangle className="w-3 h-3 text-[hsl(var(--destructive))]" />
                            <span className="text-xs text-[hsl(var(--destructive))]">{lang === 'he' ? 'חריג' : 'Abnormal'}</span>
                          </div>
                        )}
                        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                          {new Date(v.recordedAt).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Lab results */}
              {recentLabs.length > 0 && (
                <section className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-sm">
                  <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
                    <FlaskConical className="w-4 h-4" />
                    {lang === 'he' ? 'בדיקות מעבדה אחרונות' : 'Recent lab results'}
                    {recentLabs.filter((l) => l.isAbnormal).length > 0 && (
                      <span className="badge badge-destructive ms-auto">
                        {recentLabs.filter((l) => l.isAbnormal).length} {lang === 'he' ? 'חריגות' : 'abnormal'}
                      </span>
                    )}
                  </h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-[hsl(var(--muted-foreground))] border-b border-[hsl(var(--border))]">
                        <th className="pb-2 text-start font-medium">{lang === 'he' ? 'בדיקה' : 'Test'}</th>
                        <th className="pb-2 text-start font-medium">{lang === 'he' ? 'ערך' : 'Value'}</th>
                        <th className="pb-2 text-start font-medium">{lang === 'he' ? 'תאריך' : 'Date'}</th>
                        <th className="pb-2 text-start font-medium">{lang === 'he' ? 'סטטוס' : 'Status'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentLabs.slice(0, 12).map((l) => (
                        <tr key={l.id} className="border-b border-[hsl(var(--border))]/50 last:border-0">
                          <td className="py-2 font-medium">{l.testName}</td>
                          <td className={`py-2 ${l.isAbnormal ? 'text-[hsl(var(--destructive))] font-semibold' : ''}`}>
                            {l.value}{l.unit ? ` ${l.unit}` : ''}
                          </td>
                          <td className="py-2 text-[hsl(var(--muted-foreground))]">
                            {l.testDate ? new Date(l.testDate).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en', { month: 'short', day: 'numeric' }) : '—'}
                          </td>
                          <td className="py-2">
                            {l.isAbnormal
                              ? <span className="flex items-center gap-0.5 text-[hsl(var(--destructive))]"><AlertTriangle className="w-3 h-3" />{lang === 'he' ? 'חריג' : 'Abnormal'}</span>
                              : <span className="flex items-center gap-0.5 text-[hsl(var(--success))]"><CheckCircle2 className="w-3 h-3" />{lang === 'he' ? 'תקין' : 'Normal'}</span>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              )}

              {/* Pending referrals */}
              {pendingReferrals.length > 0 && (
                <section className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-sm">
                  <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
                    <ArrowRightLeft className="w-4 h-4" />
                    {lang === 'he' ? 'הפניות ממתינות' : 'Pending referrals'}
                  </h3>
                  <ul className="space-y-2">
                    {pendingReferrals.map((r) => {
                      const urg = URGENCY_LABEL[r.urgency] ?? URGENCY_LABEL.routine;
                      return (
                        <li key={r.id} className="flex items-center justify-between rounded-lg border border-[hsl(var(--border))] px-3 py-2">
                          <div>
                            <p className="text-sm font-medium">{r.specialty}</p>
                            <p className="text-xs text-[hsl(var(--muted-foreground))]">{r.reason.slice(0, 60)}{r.reason.length > 60 ? '...' : ''}</p>
                          </div>
                          <span className={`badge ${URGENCY_BADGE[r.urgency] ?? 'badge-secondary'} shrink-0 ms-2`}>
                            {lang === 'he' ? urg.he : urg.en}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}

              {/* Medications */}
              {medications.length > 0 && (
                <section className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-sm">
                  <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
                    <Pill className="w-4 h-4" />
                    {lang === 'he' ? `תרופות פעילות (${medications.length})` : `Active medications (${medications.length})`}
                  </h3>
                  <ul className="space-y-2">
                    {medications.map((m) => (
                      <li key={m.id} className="flex justify-between text-sm">
                        <span className="font-medium">{m.name}</span>
                        <span className="text-[hsl(var(--muted-foreground))]">
                          {[m.dosage, m.frequency].filter(Boolean).join(' · ')}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Tasks summary */}
              <section className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
                  <ClipboardList className="w-4 h-4" />
                  {lang === 'he' ? 'משימות טיפול' : 'Care tasks'}
                </h3>
                {tasks.length === 0 ? (
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">{lang === 'he' ? 'אין משימות' : 'No tasks'}</p>
                ) : (
                  <ul className="space-y-1.5">
                    {tasks.slice(0, 8).map((t) => (
                      <li key={t.id} className="flex items-center justify-between rounded-lg border border-[hsl(var(--border))] px-3 py-2">
                        <span className="text-sm truncate">{t.title}</span>
                        <span className="badge badge-secondary text-xs shrink-0 ms-2">{t.status}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Medical documents */}
              {documents.length > 0 && (
                <section className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-sm">
                  <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
                    <BookOpen className="w-4 h-4" />
                    {lang === 'he' ? 'מסמכים רפואיים' : 'Medical documents'}
                  </h3>
                  <ul className="space-y-1 text-sm">
                    {documents.map((d) => (
                      <li key={d.id} className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))] shrink-0" />
                        <span>{d.title}</span>
                        {d.documentType && <span className="text-[hsl(var(--muted-foreground))]">({d.documentType})</span>}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>

            {/* Sidebar */}
            <aside className="space-y-4">
              {/* Contacts */}
              <section className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-sm">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <Phone className="w-4 h-4" />
                  {lang === 'he' ? 'אנשי קשר' : 'Contacts'}
                </h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">{lang === 'he' ? 'קשר חירום' : 'Emergency'}</p>
                    <p className="font-medium">{patient.emergencyContact ?? '—'}</p>
                    {patient.emergencyContactPhone && (
                      <a href={`tel:${patient.emergencyContactPhone}`} className="text-[hsl(var(--primary))] hover:underline text-xs">{patient.emergencyContactPhone}</a>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">{lang === 'he' ? 'רופא ראשי' : 'Primary doctor'}</p>
                    <p className="font-medium">{patient.primaryDoctorName ?? '—'}</p>
                    {patient.primaryDoctorPhone && (
                      <a href={`tel:${patient.primaryDoctorPhone}`} className="text-[hsl(var(--primary))] hover:underline text-xs">{patient.primaryDoctorPhone}</a>
                    )}
                  </div>
                </div>
              </section>

              {/* Task stats */}
              <section className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-sm">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <FileText className="w-4 h-4" />
                  {lang === 'he' ? 'סטטיסטיקות' : 'Stats'}
                </h3>
                <ul className="space-y-1 text-sm">
                  <li className="flex justify-between">
                    <span className="text-[hsl(var(--muted-foreground))]">{lang === 'he' ? 'תרופות פעילות' : 'Active meds'}</span>
                    <span className="font-medium">{medications.length}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-[hsl(var(--muted-foreground))]">{lang === 'he' ? 'הפניות ממתינות' : 'Pending referrals'}</span>
                    <span className="font-medium">{pendingReferrals.length}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-[hsl(var(--muted-foreground))]">{lang === 'he' ? 'בדיקות חריגות' : 'Abnormal labs'}</span>
                    <span className={`font-medium ${recentLabs.filter((l) => l.isAbnormal).length > 0 ? 'text-[hsl(var(--destructive))]' : ''}`}>
                      {recentLabs.filter((l) => l.isAbnormal).length}
                    </span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-[hsl(var(--muted-foreground))]">{lang === 'he' ? 'מדדים חריגים' : 'Abnormal vitals'}</span>
                    <span className={`font-medium ${recentVitals.filter((v) => v.isAbnormal).length > 0 ? 'text-[hsl(var(--warning))]' : ''}`}>
                      {recentVitals.filter((v) => v.isAbnormal).length}
                    </span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-[hsl(var(--muted-foreground))]">{lang === 'he' ? 'סה"כ משימות' : 'Total tasks'}</span>
                    <span className="font-medium">{tasks.length}</span>
                  </li>
                  {Object.entries(tasksByStatus).map(([status, count]) => (
                    <li key={status} className="flex justify-between ps-2">
                      <span className="text-[hsl(var(--muted-foreground))] text-xs">{status}</span>
                      <span className="font-medium text-xs">{count}</span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Upcoming / next assessments */}
              {assessments.filter((a) => a.assessmentType).length > 0 && (
                <section className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-sm">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <Calendar className="w-4 h-4" />
                    {lang === 'he' ? 'הערכות אחרונות' : 'Latest assessments'}
                  </h3>
                  <ul className="space-y-1.5 text-sm">
                    {Object.values(latestAssessmentByType).map((a) => {
                      const label = ASSESSMENT_SHORT[a.assessmentType];
                      return (
                        <li key={a.id} className="flex justify-between">
                          <span className="text-[hsl(var(--muted-foreground))]">{label ? (lang === 'he' ? label.he : label.en) : a.assessmentType}</span>
                          <span className="font-medium">{a.score}{a.maxScore != null ? `/${a.maxScore}` : ''}</span>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
