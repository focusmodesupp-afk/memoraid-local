import React, { FormEvent, useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useI18n } from '../i18n';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../lib/api';
import { Edit, Heart, Pill, Users, Phone, MapPin, Plus, X, FlaskConical, ArrowRightLeft, ClipboardList, Brain, ChevronDown, CheckCircle2, Lock, Info, BookOpen } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { PageLayout, PageHeader, SmartSection, DataRow, BadgeRow, ListCompact } from '../components/ui';
import AIInsightsPanel from '../components/AIInsightsPanel';

type CareStage = 'genetic_awareness' | 'suspicion' | 'bridge' | 'certainty';

const CARE_STAGES: Array<{ id: CareStage; emoji: string; labelHe: string; labelEn: string; descHe: string; descEn: string; colorClass: string; bgClass: string; borderClass: string }> = [
  { id: 'genetic_awareness', emoji: '🧬', labelHe: 'מודעות גנטית', labelEn: 'Genetic Awareness', descHe: 'יש היסטוריה משפחתית — המטופל תקין כיום', descEn: 'Family history — patient currently healthy', colorClass: 'text-blue-700', bgClass: 'bg-blue-50', borderClass: 'border-blue-300' },
  { id: 'suspicion', emoji: '🔍', labelHe: 'שלב החשד', labelEn: 'Suspicion Stage', descHe: 'שמים לב לשינויים — עדיין ללא אבחנה', descEn: 'Noticing changes — no diagnosis yet', colorClass: 'text-amber-700', bgClass: 'bg-amber-50', borderClass: 'border-amber-300' },
  { id: 'bridge', emoji: '🏥', labelHe: 'גשר לקשר', labelEn: 'Bridge Stage', descHe: 'בירור נוירולוגי — בדיקות ותורים', descEn: 'Neurological evaluation — tests & appointments', colorClass: 'text-purple-700', bgClass: 'bg-purple-50', borderClass: 'border-purple-300' },
  { id: 'certainty', emoji: '📋', labelHe: 'שלב הוודאות', labelEn: 'Certainty Stage', descHe: 'יש אבחנה רשמית — מנהלים חיים עם המחלה', descEn: 'Official diagnosis — managing life with the disease', colorClass: 'text-red-700', bgClass: 'bg-red-50', borderClass: 'border-red-300' },
];

type Patient = {
  id: string;
  familyId: string;
  fullName: string | null;
  dateOfBirth: string | null;
  gender?: string | null;
  idNumber?: string | null;
  insuranceNumber?: string | null;
  primaryDiagnosis: string | null;
  emergencyContact: string | null;
  emergencyContactPhone: string | null;
  primaryDoctorName: string | null;
  primaryDoctorPhone: string | null;
  healthFundName: string | null;
  notes: string | null;
  careStage?: string | null;
  stageUpdatedAt?: string | null;
  // Extended fields
  chronicConditions?: string[] | null;
  allergies?: Array<{ name: string; severity?: string }> | null;
  mobilityStatus?: string | null;
  cognitiveStatus?: string | null;
  careLevel?: string | null;
  bloodType?: string | null;
  lastAssessmentDate?: string | null;
  adlScore?: number | null;
  iadlScore?: number | null;
  fallRiskLevel?: string | null;
  specialists?: Array<{ name: string; specialty: string; phone?: string; lastVisit?: string }> | null;
};

type Medication = { id: string; name: string; dosage: string | null; isActive: boolean };
type Task = { id: string; title: string; priority: string; status: string; dueDate: string | null };

export default function PatientPage() {
  const { dir, lang } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [stageSaving, setStageSaving] = useState(false);
  const [stageInfoOpen, setStageInfoOpen] = useState(false);
  const [completionScore, setCompletionScore] = useState(0);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [diagnoses, setDiagnoses] = useState<Array<{ id: string; condition: string; status: string; severity: string | null; diagnosedDate: string | null }>>([]);
  const [patientAllergies, setPatientAllergies] = useState<Array<{ id: string; allergen: string; allergenType: string | null; reaction: string | null; severity: string | null; status: string }>>([]);
  const [pendingReferrals, setPendingReferrals] = useState<Array<{ id: string; specialty: string; urgency: string; status: string }>>([]);
  // Inline tag editing
  const [newCondition, setNewCondition] = useState('');
  const [newAllergy, setNewAllergy] = useState('');

  const [form, setForm] = useState<{
    fullName: string;
    dateOfBirth: string;
    gender: string;
    idNumber: string;
    insuranceNumber: string;
    primaryDiagnosis: string;
    emergencyContact: string;
    emergencyContactPhone: string;
    primaryDoctorName: string;
    primaryDoctorPhone: string;
    healthFundName: string;
    notes: string;
    mobilityStatus: string;
    cognitiveStatus: string;
    careLevel: string;
    bloodType: string;
    lastAssessmentDate: string;
  }>({
    fullName: '',
    dateOfBirth: '',
    gender: '',
    idNumber: '',
    insuranceNumber: '',
    primaryDiagnosis: '',
    emergencyContact: '',
    emergencyContactPhone: '',
    primaryDoctorName: '',
    primaryDoctorPhone: '',
    healthFundName: '',
    notes: '',
    mobilityStatus: '',
    cognitiveStatus: '',
    careLevel: '',
    bloodType: '',
    lastAssessmentDate: '',
  });

  const measurementsDescriptionHe =
    'כאן יוצגו מדדי לחץ דם, סוכר ומשקל מהימים האחרונים.';
  const measurementsDescriptionEn =
    'Here we will show blood pressure, sugar and weight from recent days.';

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
          gender: p.gender ?? '',
          idNumber: p.idNumber ?? '',
          insuranceNumber: p.insuranceNumber ?? '',
          primaryDiagnosis: p.primaryDiagnosis ?? '',
          emergencyContact: p.emergencyContact ?? '',
          emergencyContactPhone: p.emergencyContactPhone ?? '',
          primaryDoctorName: p.primaryDoctorName ?? '',
          primaryDoctorPhone: p.primaryDoctorPhone ?? '',
          healthFundName: p.healthFundName ?? '',
          notes: p.notes ?? '',
          mobilityStatus: p.mobilityStatus ?? '',
          cognitiveStatus: p.cognitiveStatus ?? '',
          careLevel: p.careLevel ?? '',
          bloodType: p.bloodType ?? '',
          lastAssessmentDate: p.lastAssessmentDate ? p.lastAssessmentDate.slice(0, 10) : '',
        });
        setError(null);
        if (p?.id) {
          apiFetch<{ completionScore: number; onboardingStep: number }>(`/patients/${p.id}/completion-score`)
            .then(({ completionScore: s, onboardingStep: st }) => {
              if (!cancelled) {
                setCompletionScore(s);
                setOnboardingStep(st);
              }
            })
            .catch(() => {});
          // Load medications for this patient
          apiFetch<Medication[]>(`/patients/${p.id}/medications`)
            .then((meds) => { if (!cancelled) setMedications(meds.filter((m) => m.isActive)); })
            .catch(() => {});
          // Load clinical data
          apiFetch<Array<{ id: string; condition: string; status: string; severity: string | null; diagnosedDate: string | null }>>(`/patients/${p.id}/diagnoses`)
            .then((d) => { if (!cancelled) setDiagnoses(d.filter((x) => x.status === 'active')); })
            .catch(() => {});
          apiFetch<Array<{ id: string; allergen: string; allergenType: string | null; reaction: string | null; severity: string | null; status: string }>>(`/patients/${p.id}/allergies`)
            .then((a) => { if (!cancelled) setPatientAllergies(a.filter((x) => x.status === 'active')); })
            .catch(() => {});
          apiFetch<Array<{ id: string; specialty: string; urgency: string; status: string }>>(`/patients/${p.id}/referrals`)
            .then((r) => { if (!cancelled) setPendingReferrals(r.filter((x) => x.status === 'pending' || x.status === 'scheduled')); })
            .catch(() => {});
        }
        // Load today's tasks
        apiFetch<Task[]>('/tasks')
          .then((all) => {
            if (cancelled) return;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const due = all.filter((t) => {
              if (t.status === 'done' || t.status === 'cancelled') return false;
              if (!t.dueDate) return false;
              const d = new Date(t.dueDate);
              return d >= today && d < tomorrow;
            });
            setTodayTasks(due.slice(0, 5));
          })
          .catch(() => {});
      } catch (err: any) {
        if (cancelled) return;
        const msg = err?.message ?? '';
        // 404 "No patient found" or 500 – show create form, don't scare user
        if (msg.includes('No patient') || msg.includes('Failed to fetch') || err?.statusCode === 404) {
          setPatient(null);
          setError(null);
        } else {
          setError(msg || (lang === 'he' ? 'שגיאה בטעינת פרופיל' : 'Failed to load patient'));
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
          gender: form.gender || null,
          idNumber: form.idNumber || null,
          insuranceNumber: form.insuranceNumber || null,
          primaryDiagnosis: form.primaryDiagnosis || null,
          emergencyContact: form.emergencyContact || null,
          emergencyContactPhone: form.emergencyContactPhone || null,
          primaryDoctorName: form.primaryDoctorName || null,
          primaryDoctorPhone: form.primaryDoctorPhone || null,
          healthFundName: form.healthFundName || null,
          notes: form.notes || null,
          mobilityStatus: form.mobilityStatus || null,
          cognitiveStatus: form.cognitiveStatus || null,
          careLevel: form.careLevel || null,
          bloodType: form.bloodType || null,
          lastAssessmentDate: form.lastAssessmentDate || null,
        }),
      });
      setPatient(updated);
      if ((updated as { profileCompletionScore?: number })?.profileCompletionScore != null) {
        setCompletionScore((updated as { profileCompletionScore: number }).profileCompletionScore);
      }
      if ((updated as { onboardingStep?: number })?.onboardingStep != null) {
        setOnboardingStep((updated as { onboardingStep: number }).onboardingStep);
      }
      setForm({
        fullName: updated.fullName ?? '',
        dateOfBirth: updated.dateOfBirth ?? '',
        gender: updated.gender ?? '',
        idNumber: updated.idNumber ?? '',
        insuranceNumber: updated.insuranceNumber ?? '',
        primaryDiagnosis: updated.primaryDiagnosis ?? '',
        emergencyContact: updated.emergencyContact ?? '',
        emergencyContactPhone: updated.emergencyContactPhone ?? '',
        primaryDoctorName: updated.primaryDoctorName ?? '',
        primaryDoctorPhone: updated.primaryDoctorPhone ?? '',
        healthFundName: updated.healthFundName ?? '',
        notes: updated.notes ?? '',
        mobilityStatus: updated.mobilityStatus ?? '',
        cognitiveStatus: updated.cognitiveStatus ?? '',
        careLevel: updated.careLevel ?? '',
        bloodType: updated.bloodType ?? '',
        lastAssessmentDate: updated.lastAssessmentDate ? updated.lastAssessmentDate.slice(0, 10) : '',
      });
      setError(null);
      setEditDialogOpen(false);
    } catch (err: any) {
      setError(err.message ?? 'Failed to save patient');
    } finally {
      setSaving(false);
    }
  }

  async function saveStage(stage: CareStage) {
    if (!patient) return;
    setStageSaving(true);
    try {
      const updated = await apiFetch<Patient>(`/patients/${patient.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ careStage: stage }),
      });
      setPatient(updated);
    } catch (_) {}
    setStageSaving(false);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────────────────────

  if (!authLoading && !user) {
    return (
      <div dir={dir} className="flex min-h-[60vh] items-center justify-center">
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-8 py-6 text-center max-w-md">
          <h2 className="mb-2 text-lg font-semibold text-[hsl(var(--foreground))]">
            {lang === 'he' ? 'נדרש להתחבר' : 'Please sign in'}
          </h2>
          <p className="mb-4 text-sm text-[hsl(var(--muted-foreground))]">
            {lang === 'he'
              ? 'כדי להגדיר פרופיל מטופל, יש להתחבר או ליצור קבוצה חדשה.'
              : 'To set up a patient profile, please sign in or create a new family.'}
          </p>
          <button
            className="btn-primary px-5 py-2 text-sm"
            onClick={() => navigate('/login')}
          >
            {lang === 'he' ? 'מעבר למסך כניסה' : 'Go to login'}
          </button>
        </div>
      </div>
    );
  }

  const onboardingSteps = [
    lang === 'he' ? 'פרטים בסיסיים' : 'Basic details',
    lang === 'he' ? 'מידע רפואי' : 'Medical info',
    lang === 'he' ? 'תרופות' : 'Medications',
    lang === 'he' ? 'אנשי קשר' : 'Contacts',
    lang === 'he' ? 'ביטוח' : 'Insurance',
    lang === 'he' ? 'העדפות' : 'Preferences',
  ];

  return (
    <div dir={dir} className="space-y-6">
      {/* Edit dialog - triggered by buttons in patient view */}
      {patient && (
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {lang === 'he' ? 'עריכת פרופיל מטופל' : 'Edit patient profile'}
                </DialogTitle>
                <DialogDescription>
                  {lang === 'he'
                    ? 'עדכן את פרטי המטופל. לחץ על שמור כדי לשמור את השינויים.'
                    : 'Update patient details. Click save to save changes.'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[hsl(var(--muted-foreground))]">
                      {lang === 'he' ? 'שם מלא של המטופל' : 'Patient full name'}
                    </label>
                    <input
                      className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:border-[hsl(var(--ring))]"
                      value={form.fullName}
                      onChange={(e) => onChange('fullName', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[hsl(var(--muted-foreground))]">
                      {lang === 'he' ? 'תאריך לידה' : 'Date of birth'}
                    </label>
                    <input
                      type="date"
                      className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:border-[hsl(var(--ring))]"
                      value={form.dateOfBirth}
                      onChange={(e) => onChange('dateOfBirth', e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[hsl(var(--muted-foreground))]">
                      {lang === 'he' ? 'מין' : 'Gender'}
                    </label>
                    <select
                      className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:border-[hsl(var(--ring))]"
                      value={form.gender}
                      onChange={(e) => onChange('gender', e.target.value)}
                    >
                      <option value="">{lang === 'he' ? 'בחר...' : 'Select...'}</option>
                      <option value="male">{lang === 'he' ? 'זכר' : 'Male'}</option>
                      <option value="female">{lang === 'he' ? 'נקבה' : 'Female'}</option>
                      <option value="other">{lang === 'he' ? 'אחר' : 'Other'}</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[hsl(var(--muted-foreground))]">
                      {lang === 'he' ? 'מספר זהות' : 'ID number'}
                    </label>
                    <input
                      className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:border-[hsl(var(--ring))]"
                      value={form.idNumber}
                      onChange={(e) => onChange('idNumber', e.target.value)}
                      placeholder="000000000"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[hsl(var(--muted-foreground))]">
                      {lang === 'he' ? 'מספר ביטוח' : 'Insurance number'}
                    </label>
                    <input
                      className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:border-[hsl(var(--ring))]"
                      value={form.insuranceNumber}
                      onChange={(e) => onChange('insuranceNumber', e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[hsl(var(--muted-foreground))]">
                    {lang === 'he' ? 'אבחנה ראשית' : 'Primary diagnosis'}
                  </label>
                  <input
                    className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:border-[hsl(var(--ring))]"
                    value={form.primaryDiagnosis}
                    onChange={(e) => onChange('primaryDiagnosis', e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[hsl(var(--muted-foreground))]">
                    {lang === 'he' ? 'הערות כלליות' : 'General notes'}
                  </label>
                  <textarea
                    rows={4}
                    className="w-full resize-none rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:border-[hsl(var(--ring))]"
                    value={form.notes}
                    onChange={(e) => onChange('notes', e.target.value)}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[hsl(var(--muted-foreground))]">
                      {lang === 'he' ? 'שם איש קשר לחירום' : 'Emergency contact name'}
                    </label>
                    <input
                      className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:border-[hsl(var(--ring))]"
                      value={form.emergencyContact}
                      onChange={(e) => onChange('emergencyContact', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[hsl(var(--muted-foreground))]">
                      {lang === 'he' ? 'טלפון לחירום' : 'Emergency phone'}
                    </label>
                    <input
                      className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:border-[hsl(var(--ring))]"
                      value={form.emergencyContactPhone}
                      onChange={(e) => onChange('emergencyContactPhone', e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[hsl(var(--muted-foreground))]">
                      {lang === 'he' ? 'שם רופא ראשי' : 'Primary doctor name'}
                    </label>
                    <input
                      className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:border-[hsl(var(--ring))]"
                      value={form.primaryDoctorName}
                      onChange={(e) => onChange('primaryDoctorName', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[hsl(var(--muted-foreground))]">
                      {lang === 'he' ? 'טלפון רופא' : 'Doctor phone'}
                    </label>
                    <input
                      className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:border-[hsl(var(--ring))]"
                      value={form.primaryDoctorPhone}
                      onChange={(e) => onChange('primaryDoctorPhone', e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[hsl(var(--muted-foreground))]">
                    {lang === 'he' ? 'קופת חולים' : 'Health fund'}
                  </label>
                  <input
                    className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:border-[hsl(var(--ring))]"
                    value={form.healthFundName}
                    onChange={(e) => onChange('healthFundName', e.target.value)}
                  />
                </div>

                {/* Functional / Clinical fields */}
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[hsl(var(--muted-foreground))]">
                      {lang === 'he' ? 'ניידות' : 'Mobility'}
                    </label>
                    <input
                      className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                      value={form.mobilityStatus}
                      onChange={(e) => onChange('mobilityStatus', e.target.value)}
                      placeholder={lang === 'he' ? 'עצמאי / חלקי...' : 'Independent / Assisted...'}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[hsl(var(--muted-foreground))]">
                      {lang === 'he' ? 'מצב קוגניטיבי' : 'Cognitive status'}
                    </label>
                    <input
                      className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                      value={form.cognitiveStatus}
                      onChange={(e) => onChange('cognitiveStatus', e.target.value)}
                      placeholder={lang === 'he' ? 'קל / בינוני...' : 'Mild / Moderate...'}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[hsl(var(--muted-foreground))]">
                      {lang === 'he' ? 'סוג דם' : 'Blood type'}
                    </label>
                    <input
                      className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                      value={form.bloodType}
                      onChange={(e) => onChange('bloodType', e.target.value)}
                      placeholder="A+, B-, O+..."
                    />
                  </div>
                </div>

                {/* Care stage change — intentional, buried at the bottom */}
                <div className="rounded-xl border border-[hsl(var(--warning))]/40 bg-[hsl(var(--warning))]/6 p-3 space-y-2">
                  <div className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                    <Brain className="w-4 h-4 text-[hsl(var(--warning))] shrink-0" />
                    <p className="text-xs font-semibold text-[hsl(var(--foreground))]">
                      {lang === 'he' ? 'שינוי שלב טיפול (שינוי זה משפיע על כל המערכת)' : 'Change care stage (affects the entire system)'}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                    {CARE_STAGES.map((s) => {
                      const isActive = patient.careStage === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          disabled={stageSaving}
                          onClick={async () => { await saveStage(s.id); }}
                          className={`flex flex-col items-center gap-1 rounded-lg border-2 px-2 py-2 text-center transition-all disabled:opacity-60 text-[10px] ${
                            isActive
                              ? `${s.borderClass} ${s.bgClass} font-bold`
                              : 'border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-[hsl(var(--primary))]/40'
                          }`}
                        >
                          <span>{s.emoji}</span>
                          <span className={isActive ? s.colorClass : 'text-[hsl(var(--muted-foreground))]'}>
                            {lang === 'he' ? s.labelHe : s.labelEn}
                          </span>
                          {isActive && <CheckCircle2 className={`h-3 w-3 ${s.colorClass}`} />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {error && <p className="text-xs text-[hsl(var(--destructive))]">{error}</p>}
                <DialogFooter>
                  <button
                    type="button"
                    onClick={() => setEditDialogOpen(false)}
                    className="btn-outline px-4 py-2 text-sm"
                  >
                    {lang === 'he' ? 'ביטול' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary px-4 py-2 text-sm disabled:opacity-60"
                  >
                    {saving
                      ? lang === 'he'
                        ? 'שומר...'
                        : 'Saving…'
                      : lang === 'he'
                        ? 'שמור'
                        : 'Save'}
                  </button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}

      {loading ? (
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 text-sm text-[hsl(var(--muted-foreground))]">
          {lang === 'he' ? 'טוען פרטי מטופל...' : 'Loading patient details…'}
        </div>
      ) : !patient ? (
        <div className="space-y-4">
          {/* כרטיסי מצב עליון גם לפני שיש פרופיל */}
          <div className="grid gap-3 md:grid-cols-3">
            <div className="section-compact">
              <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">
                {lang === 'he' ? 'מתחילים בקטן' : 'Getting started'}
              </p>
              <p className="text-sm font-semibold">
                {lang === 'he' ? 'עדיין לא הוגדר פרופיל מטופל' : 'No patient profile yet'}
              </p>
              <p className="mt-2 text-[11px] text-[hsl(var(--muted-foreground))]">
                {lang === 'he'
                  ? 'נגדיר עכשיו את הפרטים הבסיסיים כדי שכל המשפחה תדבר על אותו אדם.'
                  : 'We’ll define the basic details so everyone talks about the same person.'}
              </p>
            </div>
            <div className="section-compact">
              <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">
                {lang === 'he' ? 'תרופות ומשימות' : 'Meds & tasks'}
              </p>
              <p className="text-sm font-semibold">
                {lang === 'he' ? 'נגדיר אותן אחרי הפרופיל' : 'We’ll set them after the profile'}
              </p>
              <p className="mt-2 text-[11px] text-[hsl(var(--muted-foreground))]">
                {lang === 'he'
                  ? 'אחרי יצירת הפרופיל נוכל להוסיף תרופות, תורים ומשימות טיפול.'
                  : 'After the profile is ready, we’ll add meds, appointments and tasks.'}
              </p>
            </div>
            <div className="section-compact">
              <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">
                {lang === 'he' ? 'שיתוף בני משפחה' : 'Invite family'}
              </p>
              <p className="text-sm font-semibold">
                {lang === 'he' ? 'אפשר יהיה לשתף אחרי ההקמה' : 'You can invite after setup'}
              </p>
              <p className="mt-2 text-[11px] text-[hsl(var(--muted-foreground))]">
                {lang === 'he'
                  ? 'אחרי שהפרופיל מוכן, נשתמש בקוד המשפחה כדי לצרף אחים וקרובים.'
                  : 'Once the profile is ready, use the family code to invite siblings.'}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border-2 border-dashed border-[hsl(var(--primary))]/30 bg-gradient-to-br from-[hsl(var(--primary))]/5 to-[hsl(var(--card))] p-6 md:flex md:items-center md:justify-between md:gap-6">
            <div className="space-y-2 md:w-1/2">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-sm font-bold text-white">1</span>
                <h3 className="text-base font-semibold text-[hsl(var(--foreground))]">
                  {lang === 'he' ? 'שלב ראשון: צור פרופיל מטופל' : 'Step 1: Create patient profile'}
                </h3>
              </div>
              <p className="text-sm text-[hsl(var(--muted-foreground))] pr-10">
                {lang === 'he'
                  ? 'נתחיל מפרופיל בסיסי: שם המטופל, תאריך לידה ואבחנה ראשית (אם ידועה).'
                  : 'Let’s start with a basic profile: name, date of birth and primary diagnosis.'}
              </p>
            </div>
            <form onSubmit={handleCreate} className="mt-4 space-y-3 md:mt-0 md:w-1/2">
              <div>
                <label className="mb-1 block text-xs font-medium text-[hsl(var(--muted-foreground))]">
                  {lang === 'he' ? 'שם מלא של המטופל' : 'Patient full name'}
                </label>
                <input
                  className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:border-[hsl(var(--ring))]"
                  value={form.fullName}
                  onChange={(e) => onChange('fullName', e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[hsl(var(--muted-foreground))]">
                    {lang === 'he' ? 'תאריך לידה' : 'Date of birth'}
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:border-[hsl(var(--ring))]"
                    value={form.dateOfBirth}
                    onChange={(e) => onChange('dateOfBirth', e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[hsl(var(--muted-foreground))]">
                    {lang === 'he' ? 'אבחנה ראשית (אופציונלי)' : 'Primary diagnosis (optional)'}
                  </label>
                  <input
                    className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:border-[hsl(var(--ring))]"
                    value={form.primaryDiagnosis}
                    onChange={(e) => onChange('primaryDiagnosis', e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[hsl(var(--muted-foreground))]">
                  {lang === 'he' ? 'הערות (אופציונלי)' : 'Notes (optional)'}
                </label>
                <textarea
                  rows={3}
                  className="w-full resize-none rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:border-[hsl(var(--ring))]"
                  value={form.notes}
                  onChange={(e) => onChange('notes', e.target.value)}
                />
              </div>
              {error && <p className="text-xs text-[hsl(var(--destructive))]">{error}</p>}
              <button
                type="submit"
                disabled={saving}
                className="btn-primary px-5 py-2 text-sm disabled:opacity-60"
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
        </div>
      ) : (
        <div className="space-y-6">
          <PageHeader
            title={lang === 'he' ? 'פרופיל מטופל' : 'Patient profile'}
            subtitle={lang === 'he' ? 'כל המידע הבסיסי במקום אחד' : 'All core info in one place'}
          />

          {/* ─── Care Stage ──────────────────────────────────────────────── */}
          {(() => {
            const current = CARE_STAGES.find((s) => s.id === patient.careStage);

            // Stage already set → read-only locked view
            if (current) {
              return (
                <div className={`section-card p-0 overflow-hidden border ${current.borderClass}`}>
                  <div className={`flex items-center gap-3 px-4 py-4 ${current.bgClass}`}>
                    <span className="text-2xl shrink-0">{current.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className={`flex items-center gap-2 flex-wrap ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                        <p className={`text-sm font-bold ${current.colorClass}`}>
                          {lang === 'he' ? `שלב טיפול: ${current.labelHe}` : `Care Stage: ${current.labelEn}`}
                        </p>
                        <span className={`flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${current.bgClass} border ${current.borderClass} ${current.colorClass}`}>
                          <Lock className="w-2.5 h-2.5" />
                          {lang === 'he' ? 'נעול' : 'Locked'}
                        </span>
                      </div>
                      <p className={`text-xs mt-1 ${current.colorClass} opacity-80`}>
                        {lang === 'he' ? current.descHe : current.descEn}
                      </p>
                    </div>
                    <div className={`flex flex-col items-end gap-1.5 shrink-0 ${dir === 'rtl' ? 'items-start' : ''}`}>
                      <button
                        type="button"
                        onClick={() => setStageInfoOpen(true)}
                        className={`flex items-center gap-1 text-xs font-medium hover:underline ${current.colorClass} opacity-70 hover:opacity-100`}
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        {lang === 'he' ? 'מה כל שלב אומר?' : 'About care stages'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditDialogOpen(true)}
                        className={`text-[10px] hover:underline ${current.colorClass} opacity-50 hover:opacity-80`}
                      >
                        {lang === 'he' ? 'לשינוי שלב — ערוך פרופיל' : 'To change stage — edit profile'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            // No stage set → full picker with descriptions
            return (
              <div className="section-card p-0 overflow-hidden border-2 border-dashed border-[hsl(var(--primary))]/30">
                <div className={`flex items-center gap-3 px-4 py-3 bg-[hsl(var(--muted))]/40 border-b border-[hsl(var(--border))]`}>
                  <Brain className="h-5 w-5 shrink-0 text-[hsl(var(--muted-foreground))]" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[hsl(var(--foreground))]">
                      {lang === 'he' ? 'באיזה שלב טיפול אתם?' : 'What care stage are you in?'}
                    </p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                      {lang === 'he'
                        ? 'בחרו פעם אחת — המערכת תתאים את עצמה. לא בטוחים?'
                        : 'Choose once — the system will adapt. Not sure?'}
                      {' '}
                      <button
                        type="button"
                        onClick={() => setStageInfoOpen(true)}
                        className="text-[hsl(var(--primary))] hover:underline font-medium"
                      >
                        {lang === 'he' ? 'קראו על כל שלב ←' : 'Read about each stage →'}
                      </button>
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4">
                  {CARE_STAGES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      disabled={stageSaving}
                      onClick={() => saveStage(s.id)}
                      className="flex flex-col items-center gap-1.5 rounded-xl border-2 border-[hsl(var(--border))] bg-[hsl(var(--card))] px-2 py-3 text-center hover:border-[hsl(var(--primary))]/40 hover:bg-[hsl(var(--primary))]/5 transition-all disabled:opacity-60 group"
                    >
                      <span className="text-2xl">{s.emoji}</span>
                      <span className="text-[11px] font-bold text-[hsl(var(--foreground))] leading-tight group-hover:text-[hsl(var(--primary))]">
                        {lang === 'he' ? s.labelHe : s.labelEn}
                      </span>
                      <span className="text-[10px] text-[hsl(var(--muted-foreground))] leading-tight">
                        {lang === 'he' ? s.descHe : s.descEn}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* ─── Care Stage Info Modal ────────────────────────────────────── */}
          <Dialog open={stageInfoOpen} onOpenChange={setStageInfoOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                  <Brain className="w-5 h-5 text-[hsl(var(--primary))]" />
                  {lang === 'he' ? 'ארבעת שלבי הטיפול' : 'The Four Care Stages'}
                </DialogTitle>
                <DialogDescription>
                  {lang === 'he'
                    ? 'כל שלב מייצג נקודה שונה במסע — המערכת מתאימה את עצמה לפי השלב שלכם'
                    : 'Each stage represents a different point in the journey — the system adapts accordingly'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                {[
                  {
                    ...CARE_STAGES[0],
                    detailsHe: [
                      'יש היסטוריה משפחתית של דמנציה או מחלה נוירולוגית',
                      'המטופל תקין כיום — אין סימנים משמעותיים',
                      'הזמן הטוב ביותר להכין ייפוי כוח ומסמכים משפטיים',
                      'כדאי לקבוע הערכה קוגניטיבית בסיסית לבנצ\'מארק',
                    ],
                    detailsEn: [
                      'Family history of dementia or neurological disease exists',
                      'Patient is currently healthy — no significant signs',
                      'Best time to prepare power of attorney and legal documents',
                      'Consider scheduling a baseline cognitive assessment',
                    ],
                  },
                  {
                    ...CARE_STAGES[1],
                    detailsHe: [
                      'מבחינים בשינויים קטנים — שכחה, בלבול, שינויי מצב רוח',
                      'עדיין אין אבחנה רשמית מהרופא',
                      'חשוב מאוד לתעד כל תצפית עם תאריך ושעה',
                      'מומלץ לפנות לרופא משפחה ולשקול הפניה לנוירולוג',
                    ],
                    detailsEn: [
                      'Noticing small changes — forgetfulness, confusion, mood shifts',
                      'No official diagnosis yet from a doctor',
                      'Very important to document every observation with date and time',
                      'Recommended to see family doctor and consider neurologist referral',
                    ],
                  },
                  {
                    ...CARE_STAGES[2],
                    detailsHe: [
                      'בתהליך בירור אצל נוירולוג — בדיקות MRI, בדיקות דם, הערכות',
                      'השלב הדורש הכי הרבה תיאום בין בני משפחה',
                      'חתמו על ייפוי כוח עכשיו — לפני שהמצב מתקדם',
                      'הכינו שאלות לרופא לפני כל ביקור',
                    ],
                    detailsEn: [
                      'In neurological evaluation — MRI, blood tests, assessments',
                      'Stage requiring most family coordination',
                      'Sign power of attorney now — before condition advances',
                      'Prepare questions for the doctor before each visit',
                    ],
                  },
                  {
                    ...CARE_STAGES[3],
                    detailsHe: [
                      'יש אבחנה רשמית — דמנציה, אלצהיימר, פרקינסון וכו\'',
                      'המיקוד עובר לניהול שגרה יומיומית, תרופות ובטיחות',
                      'בדקו זכאות לקצבת סיעוד דרך ביטוח לאומי',
                      'חשבו על הסדרי מגורים ותמיכה ארוכת טווח',
                    ],
                    detailsEn: [
                      'Official diagnosis confirmed — dementia, Alzheimer\'s, Parkinson\'s, etc.',
                      'Focus shifts to daily routine management, medications and safety',
                      'Check eligibility for nursing allowance through social security',
                      'Consider long-term living arrangements and support',
                    ],
                  },
                ].map((s) => (
                  <div
                    key={s.id}
                    className={`rounded-xl border-2 p-4 ${s.borderClass} ${s.bgClass} ${
                      patient.careStage === s.id ? 'ring-2 ring-offset-1 ring-[hsl(var(--primary))]/40' : ''
                    }`}
                  >
                    <div className={`flex items-center gap-2 mb-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                      <span className="text-2xl">{s.emoji}</span>
                      <div>
                        <p className={`font-bold text-sm ${s.colorClass}`}>
                          {lang === 'he' ? s.labelHe : s.labelEn}
                          {patient.careStage === s.id && (
                            <span className="ms-2 text-[10px] font-medium opacity-70">
                              {lang === 'he' ? '← השלב שלכם' : '← Your stage'}
                            </span>
                          )}
                        </p>
                        <p className={`text-xs ${s.colorClass} opacity-75`}>
                          {lang === 'he' ? s.descHe : s.descEn}
                        </p>
                      </div>
                    </div>
                    <ul className={`space-y-1 mt-2 ${dir === 'rtl' ? 'me-2' : 'ms-2'}`}>
                      {(lang === 'he' ? s.detailsHe : s.detailsEn).map((d, i) => (
                        <li key={i} className={`flex items-start gap-1.5 text-xs ${s.colorClass} opacity-90 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current mt-1 shrink-0" />
                          {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <DialogFooter>
                <button
                  type="button"
                  onClick={() => setStageInfoOpen(false)}
                  className="btn-primary px-5 py-2 text-sm"
                >
                  {lang === 'he' ? 'הבנתי' : 'Got it'}
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Patient identity card */}
          <div className="section-card bg-gradient-to-l from-[hsl(var(--primary))]/8 to-[hsl(var(--card))] p-5">
            <div className={`flex items-start gap-4 flex-wrap ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
              {/* Avatar */}
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] text-2xl font-bold text-white shadow-md">
                {patient.fullName ? patient.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() : '🧑'}
              </div>
              {/* Name + meta */}
              <div className="min-w-0 flex-1 space-y-1">
                <h2 className="text-xl font-bold text-[hsl(var(--foreground))] truncate">
                  {patient.fullName || (lang === 'he' ? 'ללא שם' : 'No name')}
                </h2>
                <div className={`flex items-center gap-3 flex-wrap text-xs text-[hsl(var(--muted-foreground))] ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                  {patient.dateOfBirth && (
                    <span>
                      {lang === 'he' ? 'נולד/ה: ' : 'DOB: '}
                      {new Date(patient.dateOfBirth).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en', { day: 'numeric', month: 'long', year: 'numeric' })}
                      {calcAge(patient.dateOfBirth) && ` (${lang === 'he' ? 'גיל' : 'age'} ${calcAge(patient.dateOfBirth)})`}
                    </span>
                  )}
                  {patient.gender && (
                    <span>
                      {patient.gender === 'male' ? (lang === 'he' ? 'זכר' : 'Male') :
                       patient.gender === 'female' ? (lang === 'he' ? 'נקבה' : 'Female') :
                       (lang === 'he' ? 'אחר' : 'Other')}
                    </span>
                  )}
                  {patient.idNumber && <span>{lang === 'he' ? 'ת.ז: ' : 'ID: '}{patient.idNumber}</span>}
                </div>
                <div className={`flex items-center gap-2 flex-wrap ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                  {patient.primaryDiagnosis && (
                    <span className="badge badge-primary text-xs">{patient.primaryDiagnosis}</span>
                  )}
                  {patient.healthFundName && (
                    <span className="badge text-xs">{patient.healthFundName}</span>
                  )}
                </div>
              </div>
              {/* Edit button */}
              <button
                type="button"
                onClick={() => setEditDialogOpen(true)}
                className="btn-primary gap-1.5 shrink-0"
              >
                <Edit className="h-4 w-4" />
                {lang === 'he' ? 'ערוך פרופיל' : 'Edit profile'}
              </button>
            </div>

            {/* KPI strip */}
            <div className={`mt-4 pt-4 border-t border-[hsl(var(--border))] grid grid-cols-3 gap-3 ${dir === 'rtl' ? 'direction-rtl' : ''}`}>
              <div className="text-center">
                <div className={`text-lg font-bold ${completionScore >= 80 ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--primary))]'}`}>
                  {completionScore}%
                </div>
                <div className="text-[10px] text-[hsl(var(--muted-foreground))]">{lang === 'he' ? 'השלמת פרופיל' : 'Profile complete'}</div>
              </div>
              <div className="text-center border-x border-[hsl(var(--border))]">
                <div className={`text-lg font-bold ${medications.length > 0 ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))]'}`}>
                  {medications.length || '—'}
                </div>
                <div className="text-[10px] text-[hsl(var(--muted-foreground))]">{lang === 'he' ? 'תרופות פעילות' : 'Active meds'}</div>
              </div>
              <div className="text-center">
                <div className={`text-lg font-bold ${todayTasks.length > 0 ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))]'}`}>
                  {todayTasks.length || '—'}
                </div>
                <div className="text-[10px] text-[hsl(var(--muted-foreground))]">{lang === 'he' ? 'משימות היום' : "Today's tasks"}</div>
              </div>
            </div>
          </div>

          {/* Profile completion progress */}
          <section className="section-card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="section-title">{lang === 'he' ? 'השלמת פרופיל' : 'Profile completion'}</h3>
              <span className={`text-sm font-bold ${completionScore >= 100 ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--primary))]'}`}>
                {completionScore}%
              </span>
            </div>
            <div className="progress-bar mb-3">
              <div
                className="progress-bar-fill"
                style={{ width: `${completionScore}%` }}
              />
            </div>
            {completionScore >= 100 ? (
              <p className="text-xs font-semibold text-[hsl(var(--success))]">
                ✓ {lang === 'he' ? 'הפרופיל מלא ועדכני' : 'Profile is complete'}
              </p>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  {lang === 'he' ? 'חסר: ' : 'Missing: '}
                  <span className="font-medium text-[hsl(var(--foreground))]">
                    {[
                      !patient?.fullName?.trim() && (lang === 'he' ? 'שם מלא' : 'Full name'),
                      !patient?.dateOfBirth && (lang === 'he' ? 'תאריך לידה' : 'Date of birth'),
                      !patient?.gender && (lang === 'he' ? 'מין' : 'Gender'),
                      !patient?.idNumber?.trim() && (lang === 'he' ? 'מספר זהות' : 'ID number'),
                      !patient?.primaryDiagnosis?.trim() && (lang === 'he' ? 'אבחנה' : 'Diagnosis'),
                      !patient?.emergencyContact?.trim() && (lang === 'he' ? 'איש קשר לחירום' : 'Emergency contact'),
                      !patient?.emergencyContactPhone?.trim() && (lang === 'he' ? 'טלפון לחירום' : 'Emergency phone'),
                      !patient?.primaryDoctorName?.trim() && (lang === 'he' ? 'רופא ראשי' : 'Primary doctor'),
                      !patient?.insuranceNumber?.trim() && (lang === 'he' ? 'מספר ביטוח' : 'Insurance number'),
                    ]
                      .filter(Boolean)
                      .slice(0, 3)
                      .join(' · ')}
                  </span>
                </p>
                <button
                  type="button"
                  onClick={() => setEditDialogOpen(true)}
                  className="btn-primary shrink-0 text-xs h-8 px-3"
                >
                  {lang === 'he' ? 'השלם פרופיל' : 'Complete profile'}
                </button>
              </div>
            )}
          </section>

          {/* AI Health Insights */}
          <AIInsightsPanel patientId={patient.id} compact />

          {/* Pending referrals alert */}
          {pendingReferrals.length > 0 && (
            <div className="rounded-xl border border-[hsl(var(--warning))]/30 bg-[hsl(var(--warning))]/8 p-3">
              <div className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                <ArrowRightLeft className="w-4 h-4 text-[hsl(var(--warning))] shrink-0" />
                <p className="text-sm font-medium">
                  {pendingReferrals.length} {lang === 'he' ? 'הפניות רפואיות ממתינות לתיאום תור' : 'referrals pending scheduling'}
                </p>
                <a href="/referrals" className="text-xs text-[hsl(var(--primary))] hover:underline ms-auto shrink-0">
                  {lang === 'he' ? 'לניהול הפניות ←' : '→ Manage'}
                </a>
              </div>
            </div>
          )}

          {/* Content grid - 2–3 columns depending on screen width */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* Tasks - compact list */}
          <section className="section-card">
            <h3 className="section-title mb-2">{lang === 'he' ? 'משימות היום' : "Today's Tasks"}</h3>
            <ListCompact>
              {todayTasks.length === 0 ? (
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  {lang === 'he' ? 'אין משימות להיום' : 'No tasks for today'}
                </p>
              ) : todayTasks.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between py-1.5 px-2 -mx-2 rounded-md hover:bg-[hsl(var(--muted))]/50 gap-2"
                >
                  <span className="text-xs text-[hsl(var(--foreground))] truncate">{t.title}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
                    t.priority === 'urgent' || t.priority === 'high' ? 'badge-destructive' : 'badge-muted'
                  }`}>
                    {t.priority === 'urgent' ? (lang === 'he' ? 'דחוף' : 'Urgent')
                      : t.priority === 'high' ? (lang === 'he' ? 'גבוה' : 'High')
                      : (lang === 'he' ? 'בינוני' : 'Med')}
                  </span>
                </div>
              ))}
            </ListCompact>
          </section>

          {/* Measurements - compact badge row – linked to vitals */}
          <SmartSection title={lang === 'he' ? 'מדדים אחרונים' : 'Latest measurements'} variant="card">
            <BadgeRow
              items={[
                { label: lang === 'he' ? 'לחץ דם' : 'BP', value: '—', variant: 'muted' },
                { label: lang === 'he' ? 'שתייה' : 'Hydration', value: '—', variant: 'muted' },
                { label: lang === 'he' ? 'דופק' : 'Pulse', value: '—', variant: 'muted' },
              ]}
            />
            <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-2">
              <a href="/vitals" className="text-[hsl(var(--primary))] hover:underline">
                {lang === 'he' ? 'למדדים ← ' : '→ View vitals'}
              </a>
            </p>
          </SmartSection>

          {/* Medications - real data */}
          <SmartSection title={lang === 'he' ? 'סיכום תרופות' : 'Medication Summary'} variant="card">
            <ListCompact>
              {medications.length === 0 ? (
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  {lang === 'he' ? 'אין תרופות פעילות' : 'No active medications'}
                </p>
              ) : medications.slice(0, 4).map((m) => (
                <div key={m.id} className="flex items-center gap-2 py-1">
                  <Pill className="h-3.5 w-3.5 text-[hsl(var(--primary))] shrink-0" />
                  <span className="text-xs truncate">{m.name}{m.dosage ? ` · ${m.dosage}` : ''}</span>
                </div>
              ))}
              {medications.length > 4 && (
                <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1">
                  +{medications.length - 4} {lang === 'he' ? 'נוספות' : 'more'}
                </p>
              )}
            </ListCompact>
          </SmartSection>

          {/* Family involvement */}
          <section className="section-card">
            <h3 className="section-title mb-1.5">{lang === 'he' ? 'מעורבות משפחתית' : 'Family Involvement'}</h3>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              {lang === 'he' ? 'משפחת ' : 'Family '}{patient.fullName?.split(' ').slice(-1)[0] || '—'}
            </p>
          </section>

          {/* Personal details - DataRow */}
          <SmartSection title={lang === 'he' ? 'פרטים אישיים' : 'Personal Details'} variant="card">
            <div className="list-compact">
              <DataRow label={lang === 'he' ? 'מצב רפואי' : 'Condition'} value={patient.primaryDiagnosis || '—'} empty={!patient.primaryDiagnosis} />
              <DataRow
                label={lang === 'he' ? 'איש קשר לחירום' : 'Emergency contact'}
                value={patient.emergencyContact ? `${patient.emergencyContact} ${patient.emergencyContactPhone || ''}`.trim() : '—'}
                empty={!patient.emergencyContact}
              />
              {patient.primaryDoctorName && (
                <DataRow label={lang === 'he' ? 'רופא ראשי' : 'Primary doctor'} value={patient.primaryDoctorName} />
              )}
              {patient.healthFundName && (
                <DataRow label={lang === 'he' ? 'קופת חולים' : 'Health fund'} value={patient.healthFundName} />
              )}
              <DataRow label={lang === 'he' ? 'הערות' : 'Notes'} value={patient.notes || '—'} empty={!patient.notes} />
            </div>
          </SmartSection>

          {/* Medical info - compact DataRows */}
          <SmartSection title={lang === 'he' ? 'מידע רפואי' : 'Medical Information'} variant="card" collapsible defaultCollapsed>
            <div className="list-compact">
              <DataRow label={lang === 'he' ? 'אבחנה' : 'Diagnosis'} value={patient.primaryDiagnosis || '—'} empty={!patient.primaryDiagnosis} />
              {patient.bloodType && <DataRow label={lang === 'he' ? 'סוג דם' : 'Blood type'} value={patient.bloodType} />}
              {patient.lastAssessmentDate && (
                <DataRow
                  label={lang === 'he' ? 'הערכה אחרונה' : 'Last assessment'}
                  value={new Date(patient.lastAssessmentDate).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en')}
                />
              )}
              <DataRow
                label={lang === 'he' ? 'מחלות רקע' : 'Background conditions'}
                value={patient.chronicConditions?.length ? patient.chronicConditions.join(', ') : '—'}
                empty={!patient.chronicConditions?.length}
              />
              <DataRow
                label={lang === 'he' ? 'אלרגיות' : 'Allergies'}
                value={patient.allergies?.length ? patient.allergies.map((a) => a.name).join(', ') : '—'}
                empty={!patient.allergies?.length}
              />
            </div>
          </SmartSection>

          {/* Functional capabilities - real data from DB */}
          <SmartSection title={lang === 'he' ? 'יכולות תפקודיות' : 'Functional Capabilities'} variant="card" collapsible defaultCollapsed>
            <div className="list-compact">
              <DataRow label={lang === 'he' ? 'ניידות' : 'Mobility'} value={patient.mobilityStatus || '—'} empty={!patient.mobilityStatus} />
              <DataRow label={lang === 'he' ? 'מצב קוגניטיבי' : 'Cognitive status'} value={patient.cognitiveStatus || '—'} empty={!patient.cognitiveStatus} />
              <DataRow label={lang === 'he' ? 'רמת תלות' : 'Care level'} value={patient.careLevel || '—'} empty={!patient.careLevel} />
              {patient.adlScore != null && <DataRow label="ADL" value={`${patient.adlScore} / 6`} />}
              {patient.iadlScore != null && <DataRow label="IADL" value={`${patient.iadlScore} / 8`} />}
              {patient.fallRiskLevel && <DataRow label={lang === 'he' ? 'סיכון נפילה' : 'Fall risk'} value={patient.fallRiskLevel} />}
            </div>
            {!patient.mobilityStatus && !patient.cognitiveStatus && !patient.careLevel && (
              <button type="button" onClick={() => setEditDialogOpen(true)} className="mt-2 text-xs text-[hsl(var(--primary))] hover:underline">
                {lang === 'he' ? '+ הוסף מידע תפקודי' : '+ Add functional info'}
              </button>
            )}
            <a href="/assessments" className="block mt-2 text-xs text-[hsl(var(--primary))] hover:underline">
              <ClipboardList className="inline w-3 h-3 me-0.5" />
              {lang === 'he' ? 'לכל ההערכות ←' : '→ View all assessments'}
            </a>
          </SmartSection>

          {/* Active diagnoses from new diagnoses registry */}
          {diagnoses.length > 0 && (
            <section className="section-card">
              <h3 className="section-title mb-2">{lang === 'he' ? 'מאגר אבחנות' : 'Diagnoses Registry'}</h3>
              <ul className="space-y-1.5">
                {diagnoses.slice(0, 5).map((d) => (
                  <li key={d.id} className={`flex items-center gap-2 text-xs ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${d.severity === 'severe' ? 'bg-[hsl(var(--destructive))]' : d.severity === 'moderate' ? 'bg-[hsl(var(--warning))]' : 'bg-[hsl(var(--success))]'}`} />
                    <span className="font-medium">{d.condition}</span>
                    {d.severity && <span className="text-[hsl(var(--muted-foreground))]">({d.severity})</span>}
                  </li>
                ))}
                {diagnoses.length > 5 && (
                  <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1">+{diagnoses.length - 5} {lang === 'he' ? 'נוספות' : 'more'}</p>
                )}
              </ul>
            </section>
          )}

          {/* Active allergies from new allergies registry */}
          {patientAllergies.length > 0 && (
            <section className="section-card border-[hsl(var(--destructive))]/20">
              <h3 className="section-title mb-2 text-[hsl(var(--destructive))]">{lang === 'he' ? 'אלרגיות פעילות' : 'Active Allergies'}</h3>
              <ul className="space-y-1.5">
                {patientAllergies.map((a) => (
                  <li key={a.id} className={`flex items-start gap-2 text-xs ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--destructive))] mt-1 shrink-0" />
                    <div>
                      <span className="font-medium">{a.allergen}</span>
                      {a.allergenType && <span className="text-[hsl(var(--muted-foreground))] ms-1">({a.allergenType})</span>}
                      {a.reaction && <p className="text-[hsl(var(--muted-foreground))] mt-0.5">{a.reaction}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Specialists */}
          {patient.specialists && patient.specialists.length > 0 && (
            <section className="section-card">
              <h3 className="section-title mb-2">{lang === 'he' ? 'רופאים מומחים' : 'Specialists'}</h3>
              <ul className="space-y-2">
                {patient.specialists.map((s, idx) => (
                  <li key={idx} className="text-xs">
                    <p className="font-medium">{s.name}</p>
                    <p className="text-[hsl(var(--muted-foreground))]">{s.specialty}</p>
                    {s.phone && <a href={`tel:${s.phone}`} className="text-[hsl(var(--primary))] hover:underline">{s.phone}</a>}
                    {s.lastVisit && <span className="text-[hsl(var(--muted-foreground))] ms-1">· {new Date(s.lastVisit).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en')}</span>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Quick links to clinical sections */}
          <section className="section-card">
            <h3 className="section-title mb-2">{lang === 'he' ? 'קיצורי דרך' : 'Quick links'}</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { href: '/lab-results', icon: FlaskConical, he: 'בדיקות מעבדה', en: 'Lab results' },
                { href: '/referrals', icon: ArrowRightLeft, he: 'הפניות', en: 'Referrals' },
                { href: '/assessments', icon: ClipboardList, he: 'הערכות', en: 'Assessments' },
                { href: '/vitals', icon: Heart, he: 'מדדים', en: 'Vitals' },
              ].map((link) => {
                const Icon = link.icon;
                return (
                  <a key={link.href} href={link.href} className="flex items-center gap-2 rounded-lg border border-[hsl(var(--border))] p-2.5 text-xs font-medium hover:bg-[hsl(var(--muted))]/50 transition-colors">
                    <Icon className="w-3.5 h-3.5 text-[hsl(var(--primary))] shrink-0" />
                    {lang === 'he' ? link.he : link.en}
                  </a>
                );
              })}
            </div>
          </section>
          </div>
        </div>
      )}
    </div>
  );
}

