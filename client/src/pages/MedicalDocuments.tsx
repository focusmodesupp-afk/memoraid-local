import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { useI18n } from '../i18n';
import { apiFetch } from '../lib/api';
import { useActiveFamily } from '../hooks/useActiveFamily';
import {
  FileText, Plus, X, Upload, Brain, ChevronDown, ChevronUp,
  AlertTriangle, Clock, CheckCircle2, Pill,
  Stethoscope, Sparkles, UserRound, Users, Info, Loader2,
  Wand2, Calendar, Phone, Building2, User, FlaskConical,
  ArrowRightLeft, Activity, Check, Trash2, Pencil,
  ShieldAlert, Save, RefreshCw, Archive,
} from 'lucide-react';
import DocumentDetailDrawer, { type DocForDrawer } from '../components/DocumentDetailDrawer';

// ─── Types ───────────────────────────────────────────────────────────────────

type TaskFor = 'patient' | 'caregiver' | 'note';

type AllergyWarning = {
  substance: string;
  reactionType: string;
  severity: 'mild' | 'moderate' | 'severe' | 'life_threatening';
  notes?: string;
};

type AiAnalysis = {
  documentTitle: string;
  documentType: string;
  documentDate: string | null;
  issuingDoctor: string | null;
  doctorPhone: string | null;
  doctorFax: string | null;
  hospitalName: string | null;
  documentDescription: string | null;
  extractedAllergyWarnings: AllergyWarning[];
  simplifiedDiagnosis: string;
  keyFindings: string[];
  extractedMedications: Array<{
    name: string;
    dosage?: string;
    form?: string;
    frequency?: string;
    duration?: string;
    instructions?: string;
  }>;
  extractedMedicalHistory?: Array<{
    condition: string;
    status: 'active' | 'past';
    diagnosisDate?: string;
  }>;
  extractedTasks: Array<{ title: string; description?: string; taskFor: TaskFor; dueDate?: string | null }>;
  extractedVitals: Array<{ type: string; value: number; value2?: number; unit: string; isAbnormal?: boolean; notes?: string }>;
  extractedLabValues: Array<{ name: string; value: string; unit?: string; referenceRange?: string; isAbnormal: boolean }>;
  extractedReferrals: Array<{ specialty: string; reason: string; urgency: string; doctorName?: string; phone?: string }>;
  followUpRequired: boolean;
  followUpDate?: string | null;
  urgencyLevel: 'routine' | 'soon' | 'urgent';
  doctorNotes: string;
};

type SyncStatus = 'pending' | 'complete' | 'partial' | 'failed' | null;

type MedicalDoc = {
  id: string;
  title: string;
  description: string | null;
  documentType: string | null;
  fileUrl: string | null;
  issuingDoctor: string | null;
  hospitalName: string | null;
  patientId: string | null;
  aiAnalysisStatus: 'processing' | 'done' | 'failed' | null;
  aiAnalysisResult: AiAnalysis | null;
  extractedMedications: Array<{ name: string; dosage?: string }> | null;
  extractedTasks: Array<{ title: string; description?: string; taskFor: TaskFor }> | null;
  simplifiedDiagnosis: string | null;
  syncStatus: SyncStatus;
  createdAt: string;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const DOC_TYPES_HE: Record<string, string> = {
  discharge: 'מכתב שחרור',
  referral: 'הפניה',
  lab_results: 'תוצאות מעבדה',
  prescription: 'מרשם',
  consultation: 'סיכום ביקור',
  imaging: 'דימות / צילום',
  other: 'אחר',
};

const URGENCY_CONFIG: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  urgent: { label: 'דחוף',   cls: 'badge-destructive', icon: <AlertTriangle className="w-3 h-3" /> },
  soon:   { label: 'בהקדם',  cls: 'badge-warning',     icon: <Clock className="w-3 h-3" /> },
  routine:{ label: 'שגרתי',  cls: 'badge-success',     icon: <CheckCircle2 className="w-3 h-3" /> },
};

const VITAL_LABELS: Record<string, string> = {
  blood_pressure: 'לחץ דם', blood_sugar: 'סוכר בדם', weight: 'משקל',
  heart_rate: 'דופק', temperature: 'חום', oxygen_saturation: 'ריווי חמצן',
};

const ALLERGY_SEVERITY_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  life_threatening: { label: 'סכנת חיים',  bg: 'bg-red-100 dark:bg-red-950/40',   text: 'text-red-700 dark:text-red-300',   border: 'border-red-400' },
  severe:           { label: 'חמורה',       bg: 'bg-red-50 dark:bg-red-950/20',    text: 'text-red-600 dark:text-red-400',   border: 'border-red-300' },
  moderate:         { label: 'בינונית',     bg: 'bg-orange-50 dark:bg-orange-950/20', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-300' },
  mild:             { label: 'קלה',         bg: 'bg-amber-50 dark:bg-amber-950/20', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-300' },
};

type Phase = 'idle' | 'analyzing' | 'review' | 'saving';
type QueueItem = { file: File; status: 'pending' | 'uploading' | 'done' | 'error'; error?: string };
type LinkedData = {
  tasks: Array<{ id: string; title: string; status: string; source: string | null }>;
  professionals: Array<{ id: string; name: string; specialty: string | null }>;
  referrals: Array<{ id: string; specialty: string; reason: string; status: string }>;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function MedicalDocumentsPage() {
  const { dir } = useI18n();
  const [rawLocation] = useLocation();
  const { activeFamilyId } = useActiveFamily();
  const [list, setList] = useState<MedicalDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const [drawerDoc, setDrawerDoc] = useState<DocForDrawer | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete confirmation modal
  const [deleteConfirmDoc, setDeleteConfirmDoc] = useState<{ id: string; title: string } | null>(null);
  const [linkedData, setLinkedData] = useState<LinkedData | null>(null);
  const [linkedDataLoading, setLinkedDataLoading] = useState(false);
  const [deleteTaskIds, setDeleteTaskIds] = useState<Set<string>>(new Set());
  const [deleteProfIds, setDeleteProfIds] = useState<Set<string>>(new Set());
  const [deleteRefIds, setDeleteRefIds] = useState<Set<string>>(new Set());

  // Edit mode for existing docs
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editDocTitle, setEditDocTitle] = useState('');
  const [editDocType, setEditDocType] = useState('');
  const [editDocDoctor, setEditDocDoctor] = useState('');
  const [editDocHospital, setEditDocHospital] = useState('');
  const [savingEditId, setSavingEditId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Tab filter: 'all' | 'analyzed' | 'archive'
  const [docTab, setDocTab] = useState<'all' | 'analyzed' | 'archive'>('all');

  // Upload / analysis
  const [archiveMode, setArchiveMode] = useState(false); // true = skip AI
  const [phase, setPhase] = useState<Phase>('idle');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AiAnalysis | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editType, setEditType] = useState('');
  const [editDoctor, setEditDoctor] = useState('');
  const [editHospital, setEditHospital] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDate, setEditDate] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);

  // Task / referral adding
  const [addingKey, setAddingKey] = useState<string | null>(null);
  const [addedKeys, setAddedKeys] = useState<Set<string>>(new Set());
  const [addingRefKey, setAddingRefKey] = useState<string | null>(null);
  const [addedRefKeys, setAddedRefKeys] = useState<Set<string>>(new Set());
  // Assignee picker for review panel
  const [taskAssignees, setTaskAssignees] = useState<Record<string, string>>({}); // key → userId
  const [familyMembers, setFamilyMembers] = useState<Array<{ userId: string; fullName: string; role: string }>>([]);

  // Editable items in review
  const [reviewTasks, setReviewTasks] = useState<AiAnalysis['extractedTasks']>([]);
  const [reviewReferrals, setReviewReferrals] = useState<AiAnalysis['extractedReferrals']>([]);
  const [editingTaskIdx, setEditingTaskIdx] = useState<number | null>(null);
  const [editingRefIdx, setEditingRefIdx] = useState<number | null>(null);

  // Multi-file queue state
  const [fileQueue, setFileQueue] = useState<QueueItem[]>([]);
  const [processingQueue, setProcessingQueue] = useState(false);
  const fileQueueRef = useRef<QueueItem[]>([]);

  // Analyze-all state
  const [analyzingAll, setAnalyzingAll] = useState(false);

  useEffect(() => {
    loadDocs();
    apiFetch<{ members?: Array<{ userId: string; fullName: string; role: string }> }>('/families/me')
      .then((r) => { if (r.members?.length) setFamilyMembers(r.members); })
      .catch(() => {});
  }, []);

  // Scroll to and expand a specific doc when ?docId=... is in the URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const docId = params.get('docId');
    if (!docId || loading) return;
    setExpandedIds((s) => new Set(s).add(docId));
    // Wait for render then scroll
    setTimeout(() => {
      const el = document.getElementById(`doc-card-${docId}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
  }, [loading, rawLocation]);

  async function loadDocs() {
    try {
      const res = await apiFetch<{ data: MedicalDoc[] } | MedicalDoc[]>('/medical-documents');
      setList(Array.isArray(res) ? res : (res as { data: MedicalDoc[] }).data ?? []);
    }
    catch { setList([]); }
    finally { setLoading(false); }
  }

  function resetUpload() {
    setPhase('idle'); setFileUrl(null); setAnalysis(null);
    setEditTitle(''); setEditType(''); setEditDoctor('');
    setEditHospital(''); setEditDescription(''); setEditDate('');
    setSaveError(null); setReviewTasks([]); setReviewReferrals([]);
    setEditingTaskIdx(null); setEditingRefIdx(null);
    setUploadProgress(0); setArchiveMode(false);
    setFileQueue([]); fileQueueRef.current = [];
  }

  // ── Multi-file entry point ────────────────────────────────────────────────
  function handleFilesFromInput(files: File[]) {
    if (!files.length) return;
    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
    const valid = files.filter(f => allowed.includes(f.type) && f.size <= 25 * 1024 * 1024);
    const invalid = files.filter(f => !allowed.includes(f.type) || f.size > 25 * 1024 * 1024);
    if (invalid.length > 0) {
      setSaveError(`${invalid.length} קובץ/ים נדחו — רק PDF, JPEG, PNG עד 25MB`);
    }
    if (!valid.length) return;

    if (valid.length === 1 && !archiveMode) {
      // Single file + AI mode: use existing single-file flow (shows review panel)
      handleFile(valid[0]);
      return;
    }

    // Multiple files OR archive mode → batch queue
    const items: QueueItem[] = valid.map(f => ({ file: f, status: 'pending' as const }));
    setFileQueue(items);
    fileQueueRef.current = items;
    processBatchQueue(items);
  }

  async function processBatchQueue(initialItems: QueueItem[]) {
    if (processingQueue) return;
    setProcessingQueue(true);
    const queue = [...initialItems];

    for (let i = 0; i < queue.length; i++) {
      queue[i] = { ...queue[i], status: 'uploading' };
      setFileQueue([...queue]);
      fileQueueRef.current = [...queue];

      try {
        const f = queue[i].file;

        // Step 1: Fast file upload — no AI (just saves file, returns fileUrl instantly)
        const formData = new FormData();
        formData.append('file', f);
        const uploadRes = await new Promise<{ fileUrl: string }>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', '/api/medical-documents/upload-file');
          xhr.withCredentials = true;
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try { resolve(JSON.parse(xhr.responseText)); }
              catch { reject(new Error('תשובה לא תקינה מהשרת')); }
            } else {
              try { reject(new Error(JSON.parse(xhr.responseText).error || `שגיאה ${xhr.status}`)); }
              catch { reject(new Error(`שגיאה ${xhr.status}`)); }
            }
          };
          xhr.onerror = () => reject(new Error('שגיאת רשת'));
          xhr.send(formData);
        });

        // Step 2: Save document record
        const docTitle = f.name.replace(/\.[^.]+$/, '') || 'מסמך רפואי';
        const created = await apiFetch<MedicalDoc>('/medical-documents', {
          method: 'POST',
          body: JSON.stringify({
            title: docTitle,
            documentType: editType || null,
            fileUrl: uploadRes.fileUrl,
            isArchiveOnly: archiveMode,
          }),
        });

        queue[i] = { ...queue[i], status: 'done' };
        setFileQueue([...queue]);
        fileQueueRef.current = [...queue];

        // No auto-analyze — user will trigger analysis manually per doc or with "Analyze All"
        await loadDocs();
      } catch (err: any) {
        queue[i] = { ...queue[i], status: 'error', error: err?.message ?? 'שגיאה' };
        setFileQueue([...queue]);
        fileQueueRef.current = [...queue];
      }
    }

    setProcessingQueue(false);
  }

  // ── Upload + full analyze in one shot (or archive-only) ──────────────────
  async function handleFile(f: File | null) {
    if (!f) return;
    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowed.includes(f.type)) { setSaveError('סוג קובץ לא נתמך. PDF, JPEG, PNG בלבד.'); return; }
    if (f.size > 25 * 1024 * 1024) { setSaveError('קובץ גדול מדי. מקסימום 25MB.'); return; }
    setSaveError(null);
    setUploadProgress(0);

    // Archive mode: upload file then jump straight to review with empty analysis
    if (archiveMode) {
      setPhase('analyzing');
      const formData = new FormData();
      formData.append('file', f);
      if (editType) formData.append('documentType', editType);
      try {
        // Just save the file – use quick-scan to get fileUrl
        const data = await new Promise<{ fileUrl: string }>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', '/api/medical-documents/analyze-preview');
          xhr.withCredentials = true;
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try { resolve(JSON.parse(xhr.responseText)); }
              catch { reject(new Error('תשובה לא תקינה מהשרת')); }
            } else {
              try { reject(new Error(JSON.parse(xhr.responseText).error || `שגיאה ${xhr.status}`)); }
              catch { reject(new Error(`שגיאה ${xhr.status}`)); }
            }
          };
          xhr.onerror = () => reject(new Error('שגיאת רשת — נסה שוב'));
          xhr.send(formData);
        });
        setFileUrl(data.fileUrl);
        setAnalysis(null);
        setEditTitle(f.name.replace(/\.[^.]+$/, '') || '');
        setEditType('');
        setEditDoctor('');
        setEditHospital('');
        setEditDescription('');
        setEditDate('');
        setReviewTasks([]);
        setReviewReferrals([]);
        setPhase('review');
      } catch (err) {
        setSaveError((err as Error)?.message ?? 'שגיאה. נסה שוב.');
        setPhase('idle');
      }
      return;
    }

    setPhase('analyzing');
    const formData = new FormData();
    formData.append('file', f);
    if (editType) formData.append('documentType', editType);
    try {
      // Use XMLHttpRequest to get upload progress
      const data = await new Promise<{ fileUrl: string; analysis: AiAnalysis }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/medical-documents/analyze-preview');
        xhr.withCredentials = true;
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try { resolve(JSON.parse(xhr.responseText)); }
            catch { reject(new Error('תשובה לא תקינה מהשרת')); }
          } else {
            try {
              const parsed = JSON.parse(xhr.responseText);
              reject(new Error(parsed.error || `שגיאה ${xhr.status}`));
            } catch { reject(new Error(`שגיאה ${xhr.status}`)); }
          }
        };
        xhr.onerror = () => reject(new Error('שגיאת רשת — נסה שוב'));
        xhr.send(formData);
      });
      setFileUrl(data.fileUrl);
      setAnalysis(data.analysis);
      setEditTitle(data.analysis.documentTitle || '');
      setEditType(data.analysis.documentType || 'other');
      setEditDoctor(data.analysis.issuingDoctor || '');
      setEditHospital(data.analysis.hospitalName || '');
      setEditDescription(data.analysis.documentDescription || '');
      setEditDate(data.analysis.documentDate || '');
      setReviewTasks(data.analysis.extractedTasks || []);
      setReviewReferrals(data.analysis.extractedReferrals || []);
      setPhase('review');
    } catch (err) {
      setSaveError((err as Error)?.message ?? 'שגיאה. נסה שוב.');
      setPhase('idle');
    }
  }

  // ── Confirm save ──────────────────────────────────────────────────────────
  async function handleConfirm() {
    if (!fileUrl) return;
    if (!editTitle.trim()) { setSaveError('נדרשת כותרת'); return; }
    setPhase('saving'); setSaveError(null);
    try {
      const created = await apiFetch<MedicalDoc>('/medical-documents', {
        method: 'POST',
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim() || null,
          documentType: editType || null,
          issuingDoctor: editDoctor.trim() || null,
          hospitalName: editHospital.trim() || null,
          fileUrl,
          isArchiveOnly: archiveMode,
          // Pass the preview analysis so the server embeds it + runs sync without re-running AI
          aiAnalysisResult: (!archiveMode && analysis) ? analysis : undefined,
        }),
      });
      setList((prev) => [created, ...prev]);
      // No autoAnalyze — analysis was already done during preview and synced on save
      resetUpload();
      setShowUpload(false);
    } catch (err) {
      setSaveError((err as Error)?.message ?? 'שגיאה בשמירה. נסה שוב.');
      setPhase('review');
    }
  }

  // ── Background sync analysis ─────────────────────────────────────────────
  async function autoAnalyze(docId: string) {
    setAnalyzingIds((s) => new Set(s).add(docId));
    setList((p) => p.map((d) => d.id === docId ? { ...d, aiAnalysisStatus: 'processing' } : d));
    try {
      const result = await apiFetch<AiAnalysis>(`/medical-documents/${docId}/analyze`, { method: 'POST' });
      setList((p) => p.map((d) => d.id === docId ? {
        ...d, aiAnalysisStatus: 'done', aiAnalysisResult: result,
        simplifiedDiagnosis: result.simplifiedDiagnosis,
        extractedMedications: result.extractedMedications,
        extractedTasks: result.extractedTasks,
      } : d));
      setExpandedIds((s) => new Set(s).add(docId));
    } catch {
      setList((p) => p.map((d) => d.id === docId ? { ...d, aiAnalysisStatus: 'failed' } : d));
    } finally {
      setAnalyzingIds((s) => { const ns = new Set(s); ns.delete(docId); return ns; });
    }
  }

  // ── Analyze all unanalyzed docs sequentially ──────────────────────────────
  async function analyzeAllPending() {
    const pending = list.filter(
      (d) => !d.aiAnalysisStatus && d.fileUrl && !(d as any).isArchiveOnly
    );
    if (!pending.length) return;
    setAnalyzingAll(true);
    for (const doc of pending) {
      await autoAnalyze(doc.id);
    }
    setAnalyzingAll(false);
  }

  // ── Add task to board ─────────────────────────────────────────────────────
  async function addTask(
    doc: MedicalDoc,
    task: { title: string; description?: string; taskFor: TaskFor; dueDate?: string | null },
    taskKey: string,
    assignedToUserId?: string,
    sourceTitle?: string,
  ) {
    if (!activeFamilyId) {
      setSaveError('לא ניתן להוסיף משימה — זהות משפחה לא נמצאה. רענן את הדף.');
      return;
    }
    setAddingKey(taskKey);
    try {
      const dueDateVal = task.dueDate || null;
      await apiFetch('/tasks', {
        method: 'POST',
        body: JSON.stringify({
          familyId: activeFamilyId,
          title: task.title,
          description: task.description || null,
          priority: 'medium',
          category: 'medical',
          status: 'todo',
          dueDate: dueDateVal,
          taskFor: task.taskFor,
          sourceDocTitle: sourceTitle || doc.title || editTitle,
          sourceEntityId: doc.id || undefined,
          assignedToUserId: assignedToUserId || null,
          ...(task.taskFor === 'patient' && doc.patientId ? { patientId: doc.patientId } : {}),
        }),
      });
      setAddedKeys((s) => new Set(s).add(taskKey));
    } catch (err: any) {
      setSaveError(err?.message ?? 'שגיאה בהוספת המשימה. נסה שוב.');
    } finally {
      setAddingKey(null);
    }
  }

  // ── Add referral ──────────────────────────────────────────────────────────
  async function addReferral(ref: AiAnalysis['extractedReferrals'][0], patientId: string | null, docId: string) {
    if (!activeFamilyId || !patientId) return;
    const key = `ref-${docId}-${ref.specialty}`;
    setAddingRefKey(key);
    try {
      await apiFetch(`/patients/${patientId}/referrals`, {
        method: 'POST',
        body: JSON.stringify({
          specialty: ref.specialty,
          reason: ref.reason,
          urgency: ref.urgency,
          referringDoctor: ref.doctorName || null,
          status: 'pending',
          familyId: activeFamilyId,
        }),
      });
      setAddedRefKeys((s) => new Set(s).add(key));
    } catch { /* logged */ }
    finally { setAddingRefKey(null); }
  }

  // ── Edit existing doc ─────────────────────────────────────────────────────
  function startEdit(doc: MedicalDoc) {
    setEditingDocId(doc.id);
    setEditDocTitle(doc.title);
    setEditDocType(doc.documentType || '');
    setEditDocDoctor(doc.issuingDoctor || '');
    setEditDocHospital(doc.hospitalName || '');
  }

  async function saveEdit(doc: MedicalDoc) {
    setSavingEditId(doc.id);
    try {
      const updated = await apiFetch<MedicalDoc>(`/medical-documents/${doc.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: editDocTitle.trim(),
          documentType: editDocType || null,
          issuingDoctor: editDocDoctor.trim() || null,
          hospitalName: editDocHospital.trim() || null,
        }),
      });
      setList((p) => p.map((d) => d.id === doc.id ? { ...d, ...updated } : d));
      setEditingDocId(null);
    } catch { /* logged */ }
    finally { setSavingEditId(null); }
  }

  async function openDeleteConfirm(doc: MedicalDoc) {
    setDeleteConfirmDoc({ id: doc.id, title: doc.title });
    setLinkedData(null);
    setLinkedDataLoading(true);
    setDeleteTaskIds(new Set());
    setDeleteProfIds(new Set());
    setDeleteRefIds(new Set());
    try {
      const data = await apiFetch<LinkedData>(`/medical-documents/${doc.id}/linked-data`);
      setLinkedData(data);
      // Pre-select all AI-created tasks for deletion
      setDeleteTaskIds(new Set(data.tasks.filter(t => t.source === 'ai').map(t => t.id)));
      // Pre-select all professionals linked only to this doc
      setDeleteProfIds(new Set(data.professionals.map(p => p.id)));
      // Pre-select all pending referrals
      setDeleteRefIds(new Set(data.referrals.filter(r => r.status === 'pending').map(r => r.id)));
    } catch {
      setLinkedData({ tasks: [], professionals: [], referrals: [] });
    } finally {
      setLinkedDataLoading(false);
    }
  }

  async function confirmDeleteDoc() {
    if (!deleteConfirmDoc) return;
    setDeletingId(deleteConfirmDoc.id);
    try {
      await apiFetch(`/medical-documents/${deleteConfirmDoc.id}`, {
        method: 'DELETE',
        body: JSON.stringify({
          deleteTaskIds: Array.from(deleteTaskIds),
          deleteProfessionalIds: Array.from(deleteProfIds),
          deleteReferralIds: Array.from(deleteRefIds),
        }),
      });
      setList((p) => p.filter((d) => d.id !== deleteConfirmDoc.id));
      setDeleteConfirmDoc(null);
      setLinkedData(null);
    } catch (err: any) {
      setSaveError(err?.message ?? 'שגיאה במחיקה');
    } finally {
      setDeletingId(null);
    }
  }

  async function openFile(docId: string) {
    const res = await fetch(`/api/medical-documents/${docId}/serve`, { credentials: 'include' });
    if (!res.ok) { alert('שגיאה בפתיחת הקובץ'); return; }
    const url = URL.createObjectURL(await res.blob());
    window.open(url, '_blank') || Object.assign(document.createElement('a'), { href: url, download: 'document' }).click();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  if (loading) return (
    <div dir={dir} className="flex min-h-[200px] items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--muted-foreground))]" />
    </div>
  );

  const urgConf = analysis ? (URGENCY_CONFIG[analysis.urgencyLevel] ?? URGENCY_CONFIG.routine) : null;

  return (
    <div dir={dir} className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--primary))]/10 shrink-0">
            <FileText className="h-5 w-5 text-[hsl(var(--primary))]" />
          </div>
          <div>
            <h2 className="page-title">מסמכים רפואיים</h2>
            <p className="page-subtitle">העלה מסמך — AI יקרא, יסווג וישלים הכל אוטומטית</p>
          </div>
        </div>
        <button type="button" onClick={() => { setShowUpload((v) => !v); if (showUpload) resetUpload(); }} className="btn-primary gap-2 shrink-0">
          <Plus className="w-4 h-4" /> הוסף מסמך
        </button>
      </div>

      {/* ── Upload Panel ── */}
      {showUpload && (
        <div className="section-card space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-[hsl(var(--primary))]" />
              <h3 className="section-title mb-0">
                {phase === 'idle' && 'העלה מסמך רפואי'}
                {phase === 'analyzing' && 'AI מנתח את המסמך...'}
                {phase === 'review' && 'סקירת ניתוח AI — ערוך ואשר'}
                {phase === 'saving' && 'שומר ומסנכרן...'}
              </h3>
            </div>
            <button type="button" onClick={() => { setShowUpload(false); resetUpload(); }} className="btn-ghost h-8 w-8 p-0 justify-center">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* idle */}
          {phase === 'idle' && (
            <>
              {/* Mode toggle — prominent two-button style */}
              <div className="flex gap-1 p-1 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30">
                <button
                  type="button"
                  onClick={() => setArchiveMode(false)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${!archiveMode ? 'bg-[hsl(var(--primary))] text-white shadow-sm' : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'}`}
                >
                  <Brain className="w-4 h-4" />
                  ניתוח AI אוטומטי
                </button>
                <button
                  type="button"
                  onClick={() => setArchiveMode(true)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${archiveMode ? 'bg-[hsl(var(--muted-foreground))] text-white shadow-sm' : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'}`}
                >
                  <Archive className="w-4 h-4" />
                  ארכיון בלבד (ללא ניתוח)
                </button>
              </div>

              {/* Document type pre-selector — helps AI and allows archive without analysis */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">
                  סוג מסמך (אופציונלי — משפר דיוק הניתוח)
                </label>
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value)}
                  className="input-base text-sm w-full"
                >
                  <option value="">זהה אוטומטית לפי תוכן</option>
                  {Object.entries(DOC_TYPES_HE).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
                {archiveMode && (
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    בחירת סוג מסמך תעזור לסינון ולמיון בארכיון
                  </p>
                )}
              </div>

              <div
                className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-12 text-center transition-colors cursor-pointer ${dragOver ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/5' : 'border-[hsl(var(--border))] hover:border-[hsl(var(--primary))]/50'}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFilesFromInput(Array.from(e.dataTransfer.files)); }}
              >
                <div className={`flex h-16 w-16 items-center justify-center rounded-full ${archiveMode ? 'bg-[hsl(var(--muted))]' : 'bg-[hsl(var(--primary))]/10'}`}>
                  {archiveMode
                    ? <Archive className="w-8 h-8 text-[hsl(var(--muted-foreground))]" />
                    : <Upload className="w-8 h-8 text-[hsl(var(--primary))]" />}
                </div>
                <div>
                  <p className="text-base font-semibold">גרור קבצים לכאן או לחץ לבחירה</p>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">PDF, JPEG, PNG · עד 25MB · ניתן לבחור כמה קבצים</p>
                  {!archiveMode && (
                    <p className="text-xs text-[hsl(var(--primary))] mt-2 font-medium flex items-center justify-center gap-1">
                      <Wand2 className="w-3.5 h-3.5" /> AI ימלא הכל אוטומטית — תאריך, רופא, תרופות, משימות, הפניות ועוד
                    </p>
                  )}
                  {archiveMode && (
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-2">מסמכים יישמרו בארכיון ללא ניתוח AI</p>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" multiple className="hidden" onChange={(e) => handleFilesFromInput(Array.from(e.target.files ?? []))} />
              </div>
              {saveError && <p className="text-sm text-[hsl(var(--destructive))] rounded-lg border border-[hsl(var(--destructive))]/20 bg-[hsl(var(--destructive))]/5 px-3 py-2">{saveError}</p>}

              {/* Multi-file queue */}
              {fileQueue.length > 0 && (
                <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 space-y-2">
                  <p className="text-sm font-semibold flex items-center gap-2">
                    {processingQueue ? <Loader2 className="w-4 h-4 animate-spin text-[hsl(var(--primary))]" /> : <CheckCircle2 className="w-4 h-4 text-[hsl(var(--success))]" />}
                    {processingQueue ? `מעלה קבצים... (${fileQueue.filter(f => f.status === 'done').length}/${fileQueue.length})` : 'העלאה הושלמה'}
                  </p>
                  <div className="space-y-1.5">
                    {fileQueue.map((item, i) => (
                      <div key={i} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${item.status === 'done' ? 'bg-[hsl(var(--success))]/10 border border-[hsl(var(--success))]/20' : item.status === 'error' ? 'bg-[hsl(var(--destructive))]/10 border border-[hsl(var(--destructive))]/20' : item.status === 'uploading' ? 'bg-[hsl(var(--primary))]/10 border border-[hsl(var(--primary))]/20' : 'border border-[hsl(var(--border))]'}`}>
                        {item.status === 'done' && <CheckCircle2 className="w-4 h-4 text-[hsl(var(--success))] shrink-0" />}
                        {item.status === 'error' && <AlertTriangle className="w-4 h-4 text-[hsl(var(--destructive))] shrink-0" />}
                        {item.status === 'uploading' && <Loader2 className="w-4 h-4 animate-spin text-[hsl(var(--primary))] shrink-0" />}
                        {item.status === 'pending' && <Clock className="w-4 h-4 text-[hsl(var(--muted-foreground))] shrink-0" />}
                        <span className="flex-1 truncate">{item.file.name}</span>
                        {item.error && <span className="text-xs text-[hsl(var(--destructive))]">{item.error}</span>}
                      </div>
                    ))}
                  </div>
                  {!processingQueue && (
                    <button type="button" onClick={() => { setFileQueue([]); fileQueueRef.current = []; }} className="btn-ghost text-xs">
                      סגור
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {/* analyzing */}
          {phase === 'analyzing' && (
            <div className="flex flex-col items-center justify-center gap-5 py-12">
              <div className="relative">
                <div className="h-20 w-20 rounded-full border-4 border-[hsl(var(--primary))]/20 border-t-[hsl(var(--primary))] animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Brain className="w-8 h-8 text-[hsl(var(--primary))]" />
                </div>
              </div>
              <div className="text-center w-full max-w-xs">
                <p className="font-semibold">
                  {uploadProgress < 100 ? `מעלה קובץ... ${uploadProgress}%` : 'AI קורא ומנתח את המסמך'}
                </p>
                <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                  {uploadProgress < 100
                    ? 'ממתין לסיום העלאה...'
                    : 'מחלץ תרופות, רגישויות, משימות, בדיקות, הפניות, תאריכים ועוד...'}
                </p>
                {uploadProgress < 100 && (
                  <div className="mt-3 w-full bg-[hsl(var(--muted))] rounded-full h-2 overflow-hidden" role="progressbar" aria-valuenow={uploadProgress} aria-valuemin={0} aria-valuemax={100} aria-label={`העלאה: ${uploadProgress}%`}>
                    <div
                      className="bg-[hsl(var(--primary))] h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* review */}
          {(phase === 'review' || phase === 'saving') && analysis && (
            <div className="space-y-5">

              {/* Urgency banner */}
              {analysis.urgencyLevel !== 'routine' && (
                <div className={`flex items-center gap-2 rounded-lg px-4 py-3 border ${analysis.urgencyLevel === 'urgent' ? 'bg-[hsl(var(--destructive))]/10 border-[hsl(var(--destructive))]/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
                  <AlertTriangle className={`w-5 h-5 shrink-0 ${analysis.urgencyLevel === 'urgent' ? 'text-[hsl(var(--destructive))]' : 'text-amber-500'}`} />
                  <p className={`text-sm font-semibold ${analysis.urgencyLevel === 'urgent' ? 'text-[hsl(var(--destructive))]' : 'text-amber-700 dark:text-amber-400'}`}>
                    {analysis.urgencyLevel === 'urgent' ? 'מסמך דחוף — נדרשת פעולה מיידית!' : 'נדרשת טיפול בהקדם'}
                  </p>
                </div>
              )}

              {/* ── CRITICAL: Allergy Warnings ── */}
              {analysis.extractedAllergyWarnings?.length > 0 && (
                <div className="rounded-xl border-2 border-red-400 bg-red-50 dark:bg-red-950/30 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400" />
                    <span className="text-sm font-bold text-red-700 dark:text-red-300 uppercase tracking-wide">⚠️ אזהרות רגישות / אלרגיות — קריטי</span>
                  </div>
                  <p className="text-xs text-red-600 dark:text-red-400">תרופות/חומרים אלו אסורים למתן למטופל!</p>
                  <div className="space-y-2">
                    {analysis.extractedAllergyWarnings.map((a, i) => {
                      const conf = ALLERGY_SEVERITY_CONFIG[a.severity] ?? ALLERGY_SEVERITY_CONFIG.moderate;
                      return (
                        <div key={i} className={`flex items-start gap-3 rounded-lg border-2 ${conf.border} ${conf.bg} px-3 py-2.5`}>
                          <ShieldAlert className={`w-5 h-5 shrink-0 mt-0.5 ${conf.text}`} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className={`text-sm font-bold ${conf.text}`}>{a.substance}</p>
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${conf.border} ${conf.bg} ${conf.text}`}>{conf.label}</span>
                            </div>
                            <p className={`text-xs mt-0.5 ${conf.text}`}>{a.reactionType}</p>
                            {a.notes && <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{a.notes}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Document Metadata (editable) ── */}
              <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30 p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Wand2 className="w-4 h-4 text-[hsl(var(--primary))]" />
                  <span className="text-xs font-semibold text-[hsl(var(--primary))] uppercase tracking-wide">פרטי מסמך — ניתן לעריכה</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="label-base">כותרת *</label>
                    <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="input-base" required />
                  </div>
                  <div>
                    <label className="label-base">סוג מסמך</label>
                    <select value={editType} onChange={(e) => setEditType(e.target.value)} className="input-base">
                      {Object.entries(DOC_TYPES_HE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label-base flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> תאריך מסמך</label>
                    <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="input-base" />
                  </div>
                  <div>
                    <label className="label-base flex items-center gap-1"><User className="w-3.5 h-3.5" /> שם הרופא</label>
                    <input value={editDoctor} onChange={(e) => setEditDoctor(e.target.value)} className="input-base" placeholder='ד"ר...' />
                  </div>
                  <div>
                    <label className="label-base flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> בית חולים / קופה</label>
                    <input value={editHospital} onChange={(e) => setEditHospital(e.target.value)} className="input-base" />
                  </div>
                  {(analysis.doctorPhone || analysis.doctorFax) && (
                    <div className="sm:col-span-2 flex flex-wrap gap-3">
                      {analysis.doctorPhone && (
                        <div className="flex items-center gap-1.5 text-sm text-[hsl(var(--muted-foreground))]">
                          <Phone className="w-3.5 h-3.5" /> {analysis.doctorPhone}
                        </div>
                      )}
                      {analysis.doctorFax && (
                        <div className="flex items-center gap-1.5 text-sm text-[hsl(var(--muted-foreground))]">
                          <Phone className="w-3.5 h-3.5 opacity-60" /> פקס: {analysis.doctorFax}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="sm:col-span-2">
                    <label className="label-base">תיאור</label>
                    <input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="input-base" />
                  </div>
                </div>
              </div>

              {/* ── AI Summary ── */}
              {(analysis.simplifiedDiagnosis || analysis.keyFindings?.length > 0) && (
                <div className="rounded-xl border border-[hsl(var(--primary))]/20 bg-[hsl(var(--primary))]/5 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-[hsl(var(--primary))]" />
                    <span className="text-xs font-semibold text-[hsl(var(--primary))] uppercase tracking-wide">סיכום AI</span>
                  </div>
                  {analysis.simplifiedDiagnosis && <p className="text-sm">{analysis.simplifiedDiagnosis}</p>}
                  {analysis.keyFindings?.length > 0 && (
                    <ul className="space-y-1 mt-1">
                      {analysis.keyFindings.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[hsl(var(--primary))] shrink-0" />{f}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* ── Medical History ── */}
              {(analysis as any).extractedMedicalHistory?.length > 0 && (
                <ReviewSection icon={<Activity className="w-4 h-4 text-teal-500" />} title={`היסטוריה רפואית (${(analysis as any).extractedMedicalHistory.length})`} border="border-teal-200 dark:border-teal-900">
                  <div className="space-y-2">
                    {(['active', 'past'] as const).map(status => {
                      const items = (analysis as any).extractedMedicalHistory.filter((h: any) => h.status === status);
                      if (!items.length) return null;
                      return (
                        <div key={status}>
                          <p className="text-xs font-semibold text-teal-600 dark:text-teal-400 mb-1.5">
                            {status === 'active' ? '🔵 בעיות פעילות' : '⬜ בעיות בעבר / היסטוריה'}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {items.map((h: any, i: number) => (
                              <span key={i} className={`inline-flex items-center gap-1 text-xs rounded-full px-2.5 py-0.5 border font-medium ${status === 'active' ? 'bg-teal-50 dark:bg-teal-950/20 border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-200' : 'bg-gray-50 dark:bg-gray-800/30 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}>
                                {h.condition}
                                {h.diagnosisDate && <span className="opacity-60 text-[10px]">({h.diagnosisDate.slice(0,4)})</span>}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ReviewSection>
              )}

              {/* ── Medications ── */}
              {analysis.extractedMedications?.length > 0 && (
                <ReviewSection icon={<Pill className="w-4 h-4 text-purple-500" />} title={`תרופות לנטילה (${analysis.extractedMedications.length})`} border="border-purple-200 dark:border-purple-900">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-purple-200 dark:border-purple-800 text-xs text-purple-600 dark:text-purple-400">
                          <th className="text-right py-1.5 pr-2 font-semibold">שם תרופה</th>
                          <th className="text-right py-1.5 px-2 font-semibold">מינון</th>
                          <th className="text-right py-1.5 px-2 font-semibold">צורה</th>
                          <th className="text-right py-1.5 px-2 font-semibold">תדירות</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysis.extractedMedications.map((m, i) => (
                          <tr key={i} className={`border-b border-purple-100 dark:border-purple-900/50 ${i % 2 === 0 ? 'bg-purple-50/30 dark:bg-purple-950/10' : ''}`}>
                            <td className="py-1.5 pr-2 font-medium text-purple-900 dark:text-purple-200">{m.name}</td>
                            <td className="py-1.5 px-2 text-purple-700 dark:text-purple-300 whitespace-nowrap">{m.dosage || '—'}</td>
                            <td className="py-1.5 px-2 text-purple-700 dark:text-purple-300 whitespace-nowrap">{m.form || '—'}</td>
                            <td className="py-1.5 px-2 text-purple-700 dark:text-purple-300 whitespace-nowrap">{m.frequency || (m.duration ? m.duration : '—')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {analysis.extractedMedications.some(m => m.instructions) && (
                    <div className="mt-2 space-y-1">
                      {analysis.extractedMedications.filter(m => m.instructions).map((m, i) => (
                        <p key={i} className="text-xs text-purple-600 dark:text-purple-400 flex items-start gap-1">
                          <Info className="w-3 h-3 mt-0.5 shrink-0" />
                          <span><strong>{m.name}:</strong> {m.instructions}</span>
                        </p>
                      ))}
                    </div>
                  )}
                </ReviewSection>
              )}

              {/* ── Patient Tasks (editable + addable) ── */}
              {reviewTasks.filter(t => t.taskFor === 'patient').length > 0 && (
                <ReviewSection icon={<UserRound className="w-4 h-4 text-blue-500" />} title={`משימות למטופל (${reviewTasks.filter(t => t.taskFor === 'patient').length})`} border="border-blue-200 dark:border-blue-900">
                  <div className="space-y-2">
                    {reviewTasks.map((task, i) => task.taskFor !== 'patient' ? null : (
                      <EditableTaskRow
                        key={i}
                        task={task}
                        taskKey={`preview-${i}-${task.title}`}
                        addingKey={addingKey}
                        addedKeys={addedKeys}
                        isEditing={editingTaskIdx === i}
                        familyMembers={familyMembers}
                        assignedUserId={taskAssignees[`preview-${i}`] ?? ''}
                        onAssign={(uid) => setTaskAssignees(prev => ({ ...prev, [`preview-${i}`]: uid }))}
                        onEdit={() => setEditingTaskIdx(editingTaskIdx === i ? null : i)}
                        onSave={(updated) => { setReviewTasks(prev => prev.map((t, idx) => idx === i ? { ...t, ...updated } : t)); setEditingTaskIdx(null); }}
                        onDelete={() => setReviewTasks(prev => prev.filter((_, idx) => idx !== i))}
                        onAdd={() => {
                          const tKey = `preview-${i}-${task.title}`;
                          const uid = taskAssignees[`preview-${i}`];
                          addTask({ id: '', title: editTitle, description: null, documentType: null, fileUrl: null, issuingDoctor: null, hospitalName: null, patientId: null, aiAnalysisStatus: null, aiAnalysisResult: null, extractedMedications: null, extractedTasks: null, simplifiedDiagnosis: null, syncStatus: null, createdAt: '' }, { ...task, dueDate: (task as any).dueDate }, tKey, uid, editTitle);
                        }}
                        addLabel="הוסף למשימות מטופל"
                        color="blue"
                      />
                    ))}
                  </div>
                </ReviewSection>
              )}

              {/* ── Caregiver Tasks (editable + addable) ── */}
              {reviewTasks.filter(t => t.taskFor === 'caregiver').length > 0 && (
                <ReviewSection icon={<Users className="w-4 h-4 text-green-500" />} title={`משימות למטפל/משפחה (${reviewTasks.filter(t => t.taskFor === 'caregiver').length})`} border="border-green-200 dark:border-green-900">
                  <div className="space-y-2">
                    {reviewTasks.map((task, i) => task.taskFor !== 'caregiver' ? null : (
                      <EditableTaskRow
                        key={i}
                        task={task}
                        taskKey={`preview-${i}-${task.title}`}
                        addingKey={addingKey}
                        addedKeys={addedKeys}
                        isEditing={editingTaskIdx === i}
                        familyMembers={familyMembers}
                        assignedUserId={taskAssignees[`preview-${i}`] ?? ''}
                        onAssign={(uid) => setTaskAssignees(prev => ({ ...prev, [`preview-${i}`]: uid }))}
                        onEdit={() => setEditingTaskIdx(editingTaskIdx === i ? null : i)}
                        onSave={(updated) => { setReviewTasks(prev => prev.map((t, idx) => idx === i ? { ...t, ...updated } : t)); setEditingTaskIdx(null); }}
                        onDelete={() => setReviewTasks(prev => prev.filter((_, idx) => idx !== i))}
                        onAdd={() => {
                          const tKey = `preview-${i}-${task.title}`;
                          const uid = taskAssignees[`preview-${i}`];
                          addTask({ id: '', title: editTitle, description: null, documentType: null, fileUrl: null, issuingDoctor: null, hospitalName: null, patientId: null, aiAnalysisStatus: null, aiAnalysisResult: null, extractedMedications: null, extractedTasks: null, simplifiedDiagnosis: null, syncStatus: null, createdAt: '' }, { ...task, dueDate: (task as any).dueDate }, tKey, uid, editTitle);
                        }}
                        addLabel="הוסף ללוח משימות"
                        color="green"
                      />
                    ))}
                  </div>
                </ReviewSection>
              )}

              {/* ── Notes + Allergy Warnings ── */}
              {(reviewTasks.filter(t => t.taskFor === 'note').length > 0 || (analysis?.extractedAllergyWarnings?.length ?? 0) > 0) && (
                <ReviewSection icon={<AlertTriangle className="w-4 h-4 text-amber-500" />} title={`אזהרות והערות (${reviewTasks.filter(t => t.taskFor === 'note').length + (analysis?.extractedAllergyWarnings?.length ?? 0)})`} border="border-amber-200 dark:border-amber-900">
                  <div className="space-y-2">
                    {/* Allergies pinned at the top */}
                    {(analysis?.extractedAllergyWarnings ?? []).map((a, i) => (
                      <div key={`allergy-${i}`} className="rounded-lg border-2 border-red-300 dark:border-red-700 bg-red-50/80 dark:bg-red-950/30 px-3 py-2 flex items-start gap-2">
                        <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-bold text-red-700 dark:text-red-300">⚠️ רגישות: {a.substance}</p>
                          <p className="text-xs text-red-600 dark:text-red-400">{a.reactionType}{a.notes ? ` · ${a.notes}` : ''}</p>
                        </div>
                      </div>
                    ))}
                    {reviewTasks.filter(t => t.taskFor === 'note').map((t, i) => (
                      <div key={i} className="rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20 px-3 py-2">
                        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">{t.title}</p>
                        {t.description && <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">{t.description}</p>}
                      </div>
                    ))}
                  </div>
                </ReviewSection>
              )}

              {/* ── Vitals ── */}
              {analysis.extractedVitals?.length > 0 && (
                <ReviewSection icon={<Activity className="w-4 h-4 text-red-500" />} title={`מדדים חיוניים (${analysis.extractedVitals.length})`} border="border-red-200 dark:border-red-900">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {analysis.extractedVitals.map((v, i) => (
                      <div key={i} className={`rounded-lg border px-3 py-2 ${v.isAbnormal ? 'border-red-300 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20' : 'border-[hsl(var(--border))] bg-[hsl(var(--card))]'}`}>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">{VITAL_LABELS[v.type] ?? v.type}</p>
                        <p className={`text-base font-bold ${v.isAbnormal ? 'text-red-600 dark:text-red-400' : ''}`}>
                          {v.value2 != null ? `${v.value}/${v.value2}` : v.value} <span className="text-xs font-normal">{v.unit}</span>
                        </p>
                        {v.isAbnormal && <p className="text-[10px] text-red-500 font-medium">חריג</p>}
                      </div>
                    ))}
                  </div>
                </ReviewSection>
              )}

              {/* ── Lab Results ── */}
              {analysis.extractedLabValues?.length > 0 && (
                <ReviewSection icon={<FlaskConical className="w-4 h-4 text-cyan-500" />} title={`תוצאות מעבדה (${analysis.extractedLabValues.length})`} border="border-cyan-200 dark:border-cyan-900">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[hsl(var(--border))]">
                          {['בדיקה','ערך','טווח','סטטוס'].map(h => <th key={h} className="text-start py-1.5 px-2 text-xs text-[hsl(var(--muted-foreground))] font-medium">{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {analysis.extractedLabValues.map((l, i) => (
                          <tr key={i} className="border-b border-[hsl(var(--border))]/50 last:border-0">
                            <td className="py-1.5 px-2 font-medium">{l.name}</td>
                            <td className={`py-1.5 px-2 font-mono ${l.isAbnormal ? 'text-red-600 dark:text-red-400 font-bold' : ''}`}>{l.value}{l.unit ? ` ${l.unit}` : ''}</td>
                            <td className="py-1.5 px-2 text-[hsl(var(--muted-foreground))] text-xs">{l.referenceRange || '—'}</td>
                            <td className="py-1.5 px-2">{l.isAbnormal ? <span className="badge badge-destructive text-[10px]">חריג</span> : <span className="badge badge-success text-[10px]">תקין</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </ReviewSection>
              )}

              {/* ── Referrals (editable + addable) ── */}
              {reviewReferrals?.length > 0 && (
                <ReviewSection icon={<ArrowRightLeft className="w-4 h-4 text-orange-500" />} title={`הפניות לרופאים (${reviewReferrals.length})`} border="border-orange-200 dark:border-orange-900">
                  <div className="space-y-2">
                    {reviewReferrals.map((r, i) => {
                      const urg = URGENCY_CONFIG[r.urgency] ?? URGENCY_CONFIG.routine;
                      const refKey = `preview-ref-${r.specialty}-${i}`;
                      const isEditingRef = editingRefIdx === i;
                      return (
                        <div key={i} className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 space-y-2">
                          {isEditingRef ? (
                            <div className="space-y-2">
                              <input className="input-base text-sm" defaultValue={r.specialty} id={`ref-spec-${i}`} placeholder="התמחות" />
                              <input className="input-base text-sm" defaultValue={r.reason} id={`ref-reason-${i}`} placeholder="סיבה" />
                              <select className="input-base text-sm" defaultValue={r.urgency} id={`ref-urg-${i}`}>
                                {Object.entries(URGENCY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                              </select>
                              <div className="flex gap-2">
                                <button type="button" className="btn-primary text-xs px-3 py-1.5 gap-1" onClick={() => {
                                  const spec = (document.getElementById(`ref-spec-${i}`) as HTMLInputElement)?.value;
                                  const reason = (document.getElementById(`ref-reason-${i}`) as HTMLInputElement)?.value;
                                  const urg2 = (document.getElementById(`ref-urg-${i}`) as HTMLSelectElement)?.value;
                                  setReviewReferrals(prev => prev.map((ref, idx) => idx === i ? { ...ref, specialty: spec, reason, urgency: urg2 } : ref));
                                  setEditingRefIdx(null);
                                }}>
                                  <Save className="w-3 h-3" /> שמור
                                </button>
                                <button type="button" className="btn-ghost text-xs px-3 py-1.5" onClick={() => setEditingRefIdx(null)}>ביטול</button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold">{r.specialty}</p>
                                <p className="text-xs text-[hsl(var(--muted-foreground))]">{r.reason}</p>
                                {(r.doctorName || r.phone) && <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{[r.doctorName, r.phone].filter(Boolean).join(' · ')}</p>}
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                                <span className={`badge ${urg.cls} text-[10px] flex items-center gap-1`}>{urg.icon}{urg.label}</span>
                                <button type="button" onClick={() => setEditingRefIdx(i)} className="btn-ghost h-6 w-6 p-0 justify-center"><Pencil className="w-3 h-3" /></button>
                                <button type="button" onClick={() => setReviewReferrals(prev => prev.filter((_, idx) => idx !== i))} className="btn-ghost h-6 w-6 p-0 justify-center text-[hsl(var(--destructive))]"><Trash2 className="w-3 h-3" /></button>
                              </div>
                            </div>
                          )}
                          {!isEditingRef && (
                            addedRefKeys.has(refKey) ? (
                              <span className="inline-flex items-center gap-1 text-xs text-[hsl(var(--success))] font-medium"><CheckCircle2 className="w-3 h-3" /> נוספה לרשימת הפניות</span>
                            ) : (
                              <button type="button" disabled={addingRefKey === refKey}
                                onClick={() => {
                                  setAddingRefKey(refKey);
                                  // Add as caregiver task
                                  apiFetch('/tasks', { method: 'POST', body: JSON.stringify({ familyId: activeFamilyId, title: `קבע תור — ${r.specialty}`, description: r.reason, priority: r.urgency === 'urgent' ? 'high' : 'medium', category: 'medical', status: 'todo' }) })
                                    .then(() => setAddedRefKeys(s => new Set(s).add(refKey)))
                                    .finally(() => setAddingRefKey(null));
                                }}
                                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-orange-500/10 text-orange-700 dark:text-orange-400 hover:bg-orange-500/20 border border-orange-300 dark:border-orange-700 font-medium disabled:opacity-50">
                                {addingRefKey === refKey ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                                הוסף כמשימה "קבע תור"
                              </button>
                            )
                          )}
                        </div>
                      );
                    })}
                    <button type="button" onClick={() => setReviewReferrals(prev => [...prev, { specialty: '', reason: '', urgency: 'routine' }])}
                      className="text-xs text-[hsl(var(--primary))] hover:underline flex items-center gap-1">
                      <Plus className="w-3 h-3" /> הוסף הפניה
                    </button>
                  </div>
                </ReviewSection>
              )}

              {/* ── Doctor Notes / Follow-up ── */}
              {(analysis.doctorNotes || analysis.followUpRequired) && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20 p-4 space-y-2">
                  {analysis.doctorNotes && (
                    <div>
                      <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">הערות רופא</p>
                      <p className="text-sm">{analysis.doctorNotes}</p>
                    </div>
                  )}
                  {analysis.followUpRequired && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                      <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                        נדרש מעקב רפואי{analysis.followUpDate ? ` — ${analysis.followUpDate}` : ''}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {saveError && <p className="text-sm text-[hsl(var(--destructive))] rounded-lg border border-[hsl(var(--destructive))]/20 bg-[hsl(var(--destructive))]/5 px-3 py-2">{saveError}</p>}

              <div className="flex gap-3 pt-2 border-t border-[hsl(var(--border))]">
                <button type="button" onClick={handleConfirm} disabled={phase === 'saving' || !editTitle.trim()} className="btn-primary gap-2 flex-1 disabled:opacity-50 justify-center">
                  {phase === 'saving' ? <><Loader2 className="w-4 h-4 animate-spin" /> שומר ומסנכרן...</> : <><Check className="w-4 h-4" /> אשר ושמור הכל</>}
                </button>
                <button type="button" onClick={() => { setShowUpload(false); resetUpload(); }} className="btn-ghost" disabled={phase === 'saving'}>ביטול</button>
              </div>
              <p className="text-xs text-[hsl(var(--muted-foreground))] text-center">
                <Sparkles className="w-3 h-3 inline mr-1" />
                לאחר האישור, כל הנתונים יסונכרנו לפרופיל המטופל, תרופות, מדדים ומשימות
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Tab filter ── */}
      {list.length > 0 && (
        <div className="flex gap-1 border-b border-[hsl(var(--border))] pb-0">
          {([
            { id: 'all', label: 'הכל', icon: null },
            { id: 'analyzed', label: 'מנותחים', icon: <Brain className="w-3 h-3" /> },
            { id: 'archive', label: 'ארכיון', icon: <Archive className="w-3 h-3" /> },
          ] as const).map(({ id, label, icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setDocTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                docTab === id
                  ? 'border-[hsl(var(--primary))] text-[hsl(var(--primary))]'
                  : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
              }`}
            >
              {icon}{label}
              <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                ({id === 'all' ? list.length : id === 'analyzed' ? list.filter((d) => !(d as any).isArchiveOnly).length : list.filter((d) => (d as any).isArchiveOnly).length})
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ── Document List ── */}
      {(() => {
        const filteredList = docTab === 'all' ? list : docTab === 'analyzed' ? list.filter((d) => !(d as any).isArchiveOnly) : list.filter((d) => (d as any).isArchiveOnly);
        if (filteredList.length === 0 && list.length > 0) return (
          <div className="section-card">
            <div className="empty-block">
              <Archive className="h-10 w-10 text-[hsl(var(--muted-foreground))]/40" />
              <p className="font-medium">{docTab === 'archive' ? 'אין מסמכי ארכיון' : 'אין מסמכים מנותחים'}</p>
            </div>
          </div>
        );
        return null; // real rendering below handled by existing code
      })()}
      {/* ── Pending-analysis banner ── */}
      {(() => {
        const pendingCount = list.filter(d => !d.aiAnalysisStatus && d.fileUrl && !(d as any).isArchiveOnly && !analyzingIds.has(d.id)).length;
        if (pendingCount === 0) return null;
        return (
          <div className="rounded-xl border border-[hsl(var(--primary))]/30 bg-[hsl(var(--primary))]/5 px-4 py-3 flex items-center gap-3">
            <Brain className="w-5 h-5 text-[hsl(var(--primary))] shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[hsl(var(--primary))]">
                {pendingCount} {pendingCount === 1 ? 'מסמך ממתין' : 'מסמכים ממתינים'} לניתוח AI
              </p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                לחץ על "נתח עם AI" לכל מסמך בנפרד, או על "נתח הכל" להפעיל ביחד
              </p>
            </div>
            <button
              type="button"
              onClick={analyzeAllPending}
              disabled={analyzingAll}
              className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] text-sm font-medium hover:opacity-90 disabled:opacity-60 transition-opacity"
            >
              {analyzingAll
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />מנתח...</>
                : <><Sparkles className="w-4 h-4" />נתח הכל</>}
            </button>
          </div>
        );
      })()}

      {list.length === 0 ? (
        <div className="section-card">
          <div className="empty-block">
            <FileText className="h-10 w-10 text-[hsl(var(--muted-foreground))]/40" />
            <p className="font-medium">אין עדיין מסמכים</p>
            <p className="text-xs">לחץ "הוסף מסמך" כדי להעלות. ניתן לנתח עם AI לאחר מכן.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {(docTab === 'all' ? list : docTab === 'analyzed' ? list.filter((d) => !(d as any).isArchiveOnly) : list.filter((d) => (d as any).isArchiveOnly)).map((doc) => {
            const isExpanded = expandedIds.has(doc.id);
            const isAnalyzing = analyzingIds.has(doc.id) || doc.aiAnalysisStatus === 'processing';
            const hasDone = doc.aiAnalysisStatus === 'done';
            const hasFailed = doc.aiAnalysisStatus === 'failed';
            const result = doc.aiAnalysisResult;
            const urgency = result?.urgencyLevel ?? null;
            const isEditing = editingDocId === doc.id;
            const isDeleting = deletingId === doc.id;
            const isSavingEdit = savingEditId === doc.id;

            return (
              <div key={doc.id} id={`doc-card-${doc.id}`} className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden">
                <div className="flex items-start gap-3 p-4">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--primary))]/10 hover:bg-[hsl(var(--primary))]/20 transition-colors cursor-pointer"
                    onClick={() => !isEditing && setDrawerDoc({ id: doc.id, title: doc.title, description: doc.description, documentType: doc.documentType, fileUrl: doc.fileUrl, issuingDoctor: doc.issuingDoctor, hospitalName: doc.hospitalName, patientId: doc.patientId, aiAnalysisStatus: doc.aiAnalysisStatus, aiAnalysisResult: doc.aiAnalysisResult as any, createdAt: doc.createdAt })}
                  >
                    <FileText className="h-5 w-5 text-[hsl(var(--primary))]" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    {isEditing ? (
                      <div className="space-y-2">
                        <input value={editDocTitle} onChange={(e) => setEditDocTitle(e.target.value)} className="input-base text-sm font-semibold" />
                        <div className="grid grid-cols-2 gap-2">
                          <select value={editDocType} onChange={(e) => setEditDocType(e.target.value)} className="input-base text-xs">
                            <option value="">סוג מסמך</option>
                            {Object.entries(DOC_TYPES_HE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                          </select>
                          <input value={editDocDoctor} onChange={(e) => setEditDocDoctor(e.target.value)} className="input-base text-xs" placeholder='שם רופא' />
                          <input value={editDocHospital} onChange={(e) => setEditDocHospital(e.target.value)} className="input-base text-xs col-span-2" placeholder='בית חולים / קופה' />
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => saveEdit(doc)} disabled={isSavingEdit} className="btn-primary text-xs px-3 py-1.5 gap-1 disabled:opacity-50">
                            {isSavingEdit ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} שמור
                          </button>
                          <button type="button" onClick={() => setEditingDocId(null)} className="btn-ghost text-xs px-3 py-1.5 gap-1"><RefreshCw className="w-3 h-3" /> ביטול</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-sm">{doc.title}</span>
                          {(doc as any).isArchiveOnly && (
                            <span className="badge badge-muted text-[10px] flex items-center gap-1"><Archive className="w-2.5 h-2.5" />ארכיון</span>
                          )}
                          {doc.documentType && <span className="badge badge-muted text-[10px]">{DOC_TYPES_HE[doc.documentType] ?? doc.documentType}</span>}
                          {urgency && (
                            <span className={`badge ${URGENCY_CONFIG[urgency]?.cls ?? 'badge-muted'} text-[10px] flex items-center gap-1`}>
                              {URGENCY_CONFIG[urgency]?.icon}{URGENCY_CONFIG[urgency]?.label}
                            </span>
                          )}
                          {isAnalyzing && <span className="badge badge-primary text-[10px] flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> AI מנתח...</span>}
                          {!isAnalyzing && doc.syncStatus === 'complete' && (
                            <span className="badge badge-success text-[10px] flex items-center gap-1" title="סנכרון הושלם">
                              <CheckCircle2 className="w-3 h-3" /> סונכרן
                            </span>
                          )}
                          {!isAnalyzing && doc.syncStatus === 'partial' && (
                            <span className="badge badge-warning text-[10px] flex items-center gap-1" title="סנכרון חלקי">
                              <AlertTriangle className="w-3 h-3" /> סנכרון חלקי
                            </span>
                          )}
                          {!isAnalyzing && doc.syncStatus === 'failed' && (
                            <span className="badge badge-destructive text-[10px] flex items-center gap-1" title="סנכרון נכשל">
                              <AlertTriangle className="w-3 h-3" /> שגיאת סנכרון
                            </span>
                          )}
                          {!isAnalyzing && doc.syncStatus === 'pending' && (
                            <span className="badge badge-muted text-[10px] flex items-center gap-1" title="ממתין לסנכרון">
                              <Clock className="w-3 h-3" /> ממתין
                            </span>
                          )}
                        </div>
                        {(doc.issuingDoctor || doc.hospitalName) && (
                          <p className="text-xs text-[hsl(var(--muted-foreground))]">{[doc.issuingDoctor, doc.hospitalName].filter(Boolean).join(' · ')}</p>
                        )}
                        {doc.description && <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">{doc.description}</p>}
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">{new Date(doc.createdAt).toLocaleDateString('he-IL')}</p>
                      </>
                    )}
                  </div>

                  {/* Action buttons */}
                  {!isEditing && (
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                      {doc.fileUrl && (
                        <button type="button" onClick={() => openFile(doc.id)} className="text-xs font-medium text-[hsl(var(--primary))] hover:underline px-1">פתח קובץ</button>
                      )}
                      {!hasDone && !isAnalyzing && doc.fileUrl && (
                        <button
                          type="button"
                          onClick={() => autoAnalyze(doc.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:opacity-90 font-semibold shadow-sm transition-opacity"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          {hasFailed ? 'נסה שוב' : 'נתח עם AI'}
                        </button>
                      )}
                      {hasDone && (
                        <button type="button" onClick={() => setExpandedIds((s) => { const ns = new Set(s); ns.has(doc.id) ? ns.delete(doc.id) : ns.add(doc.id); return ns; })}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/20 border border-[hsl(var(--success))]/20 font-medium">
                          <Brain className="w-3.5 h-3.5" /> תוצאות {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      )}
                      <button type="button" onClick={() => startEdit(doc)} className="btn-ghost h-8 w-8 p-0 justify-center" title="ערוך">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" onClick={() => openDeleteConfirm(doc)} disabled={isDeleting} className="btn-ghost h-8 w-8 p-0 justify-center text-[hsl(var(--destructive))] disabled:opacity-50" title="מחק">
                        {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  )}
                </div>

                {/* Inline AI results (existing docs) */}
                {hasDone && isExpanded && result && (
                  <div className="border-t border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30 p-4 space-y-4">
                    {/* Allergy warnings */}
                    {result.extractedAllergyWarnings?.length > 0 && (
                      <div className="rounded-lg border-2 border-red-400 bg-red-50 dark:bg-red-950/30 p-3 space-y-2">
                        <p className="text-xs font-bold text-red-700 dark:text-red-300 flex items-center gap-1"><ShieldAlert className="w-4 h-4" /> ⚠️ רגישויות / אלרגיות</p>
                        {result.extractedAllergyWarnings.map((a, i) => {
                          const conf = ALLERGY_SEVERITY_CONFIG[a.severity] ?? ALLERGY_SEVERITY_CONFIG.moderate;
                          return (
                            <div key={i} className={`flex items-center gap-2 rounded px-2 py-1 border ${conf.border} ${conf.bg}`}>
                              <span className={`text-sm font-bold ${conf.text}`}>{a.substance}</span>
                              <span className={`text-xs ${conf.text}`}>— {a.reactionType} ({conf.label})</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {result.simplifiedDiagnosis && (
                      <div className="flex items-start gap-2">
                        <Stethoscope className="w-4 h-4 mt-0.5 text-[hsl(var(--primary))] shrink-0" />
                        <p className="text-sm">{result.simplifiedDiagnosis}</p>
                      </div>
                    )}
                    {result.extractedMedications?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] mb-1.5 flex items-center gap-1"><Pill className="w-3.5 h-3.5" /> תרופות</p>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs border-collapse">
                            <thead>
                              <tr className="text-[hsl(var(--muted-foreground))] border-b border-[hsl(var(--border))]">
                                <th className="text-right py-1 pr-1 font-semibold">שם תרופה</th>
                                <th className="text-right py-1 px-1 font-semibold">מינון</th>
                                <th className="text-right py-1 px-1 font-semibold">תדירות</th>
                              </tr>
                            </thead>
                            <tbody>
                              {result.extractedMedications.map((m: any, i: number) => (
                                <tr key={i} className={`border-b border-[hsl(var(--border))]/50 ${i % 2 === 0 ? 'bg-[hsl(var(--muted))]/20' : ''}`}>
                                  <td className="py-1 pr-1 font-medium">{m.name}</td>
                                  <td className="py-1 px-1 text-[hsl(var(--muted-foreground))]">{m.dosage || '—'}</td>
                                  <td className="py-1 px-1 text-[hsl(var(--muted-foreground))] whitespace-nowrap">{m.frequency || (m.form ? m.form : '—')}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                    {result.extractedTasks?.length > 0 && (
                      <div className="space-y-2">
                        {result.extractedTasks.map((task, i) => {
                          const key = `${doc.id}-${task.title}`;
                          const isAdded = addedKeys.has(key);
                          const isAdding2 = addingKey === key;
                          const isPatient = task.taskFor === 'patient';
                          if (task.taskFor === 'note') {
                            return (
                              <div key={i} className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20 px-3 py-2">
                                <Info className="w-3.5 h-3.5 mt-0.5 text-amber-500 shrink-0" />
                                <p className="text-sm text-amber-700 dark:text-amber-300">{task.title}</p>
                              </div>
                            );
                          }
                          return (
                            <div key={i} className={`flex items-start justify-between gap-3 rounded-lg border px-3 py-2 ${isPatient ? 'border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20' : 'border-[hsl(var(--border))] bg-[hsl(var(--card))]'}`}>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium">{task.title}</p>
                                {task.description && <p className="text-xs text-[hsl(var(--muted-foreground))]">{task.description}</p>}
                              </div>
                              {isAdded ? (
                                <span className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border border-[hsl(var(--success))]/20 font-medium">
                                  <CheckCircle2 className="w-3 h-3" /> נוסף!
                                </span>
                              ) : (
                                <button type="button" onClick={() => addTask(doc, task, key)} disabled={isAdding2}
                                  className={`shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium disabled:opacity-50 border ${isPatient ? 'bg-blue-500/10 text-blue-700 hover:bg-blue-500/20 border-blue-300 dark:text-blue-400 dark:border-blue-700' : 'bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/20 border-[hsl(var(--primary))]/20'}`}>
                                  {isAdding2 ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                                  {isPatient ? 'למטופל' : 'למשימות'}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {result.doctorNotes && (
                      <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 px-3 py-2">
                        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-0.5">הערות רופא</p>
                        <p className="text-xs">{result.doctorNotes}</p>
                      </div>
                    )}
                    {result.followUpRequired && (
                      <div className="flex items-center gap-2 rounded-lg bg-[hsl(var(--destructive))]/10 border border-[hsl(var(--destructive))]/20 px-3 py-2">
                        <AlertTriangle className="w-4 h-4 text-[hsl(var(--destructive))] shrink-0" />
                        <p className="text-xs font-medium text-[hsl(var(--destructive))]">נדרש מעקב רפואי</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {drawerDoc && (
        <DocumentDetailDrawer doc={drawerDoc} activeFamilyId={activeFamilyId} onClose={() => setDrawerDoc(null)}
          onDocUpdated={(updated) => {
            setDrawerDoc(updated);
            setList((prev) => prev.map((d) => d.id === updated.id ? { ...d, aiAnalysisResult: updated.aiAnalysisResult as any } : d));
          }}
        />
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteConfirmDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-[hsl(var(--card))] rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="p-5 border-b border-[hsl(var(--border))]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--destructive))]/10">
                    <Trash2 className="w-5 h-5 text-[hsl(var(--destructive))]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base">מחיקת מסמך</h3>
                    <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5 break-all">{deleteConfirmDoc.title}</p>
                  </div>
                </div>
                <button type="button" onClick={() => { setDeleteConfirmDoc(null); setLinkedData(null); }}
                  className="btn-ghost h-7 w-7 p-0 justify-center shrink-0"><X className="w-4 h-4" /></button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {linkedDataLoading ? (
                <div className="flex items-center justify-center py-8 gap-2 text-[hsl(var(--muted-foreground))]">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">בודק נתונים מקושרים...</span>
                </div>
              ) : linkedData && (linkedData.tasks.length > 0 || linkedData.professionals.length > 0 || linkedData.referrals.length > 0) ? (
                <>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    הנתונים הבאים נוצרו מהמסמך הזה. בחר מה ברצונך למחוק יחד איתו:
                  </p>

                  {/* Tasks */}
                  {linkedData.tasks.length > 0 && (
                    <div className="rounded-xl border border-[hsl(var(--border))] overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2 bg-[hsl(var(--muted))]/40 border-b border-[hsl(var(--border))]">
                        <span className="text-xs font-semibold flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[hsl(var(--primary))]" />
                          משימות ({linkedData.tasks.length})
                        </span>
                        <button type="button" className="text-xs text-[hsl(var(--primary))] hover:underline"
                          onClick={() => setDeleteTaskIds(s => s.size === linkedData.tasks.length ? new Set() : new Set(linkedData.tasks.map(t => t.id)))}>
                          {deleteTaskIds.size === linkedData.tasks.length ? 'בטל הכל' : 'בחר הכל'}
                        </button>
                      </div>
                      {linkedData.tasks.map(t => (
                        <label key={t.id} className="flex items-center gap-3 px-3 py-2.5 border-b last:border-0 border-[hsl(var(--border))]/50 cursor-pointer hover:bg-[hsl(var(--muted))]/20">
                          <input type="checkbox" checked={deleteTaskIds.has(t.id)}
                            onChange={e => setDeleteTaskIds(s => { const n = new Set(s); e.target.checked ? n.add(t.id) : n.delete(t.id); return n; })}
                            className="rounded" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm truncate">{t.title}</p>
                            <p className="text-xs text-[hsl(var(--muted-foreground))]">
                              {t.source === 'ai' ? '🤖 נוצר על ידי AI' : '👤 נוצר ידנית'} · {t.status}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* Professionals */}
                  {linkedData.professionals.length > 0 && (
                    <div className="rounded-xl border border-[hsl(var(--border))] overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2 bg-[hsl(var(--muted))]/40 border-b border-[hsl(var(--border))]">
                        <span className="text-xs font-semibold flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-[hsl(var(--primary))]" />
                          אנשי מקצוע ({linkedData.professionals.length})
                        </span>
                        <button type="button" className="text-xs text-[hsl(var(--primary))] hover:underline"
                          onClick={() => setDeleteProfIds(s => s.size === linkedData.professionals.length ? new Set() : new Set(linkedData.professionals.map(p => p.id)))}>
                          {deleteProfIds.size === linkedData.professionals.length ? 'בטל הכל' : 'בחר הכל'}
                        </button>
                      </div>
                      {linkedData.professionals.map(p => (
                        <label key={p.id} className="flex items-center gap-3 px-3 py-2.5 border-b last:border-0 border-[hsl(var(--border))]/50 cursor-pointer hover:bg-[hsl(var(--muted))]/20">
                          <input type="checkbox" checked={deleteProfIds.has(p.id)}
                            onChange={e => setDeleteProfIds(s => { const n = new Set(s); e.target.checked ? n.add(p.id) : n.delete(p.id); return n; })}
                            className="rounded" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium">{p.name}</p>
                            {p.specialty && <p className="text-xs text-[hsl(var(--muted-foreground))]">{p.specialty}</p>}
                          </div>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* Referrals */}
                  {linkedData.referrals.length > 0 && (
                    <div className="rounded-xl border border-[hsl(var(--border))] overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2 bg-[hsl(var(--muted))]/40 border-b border-[hsl(var(--border))]">
                        <span className="text-xs font-semibold flex items-center gap-1.5">
                          <ArrowRightLeft className="w-3.5 h-3.5 text-[hsl(var(--primary))]" />
                          הפניות ({linkedData.referrals.length})
                        </span>
                        <button type="button" className="text-xs text-[hsl(var(--primary))] hover:underline"
                          onClick={() => setDeleteRefIds(s => s.size === linkedData.referrals.length ? new Set() : new Set(linkedData.referrals.map(r => r.id)))}>
                          {deleteRefIds.size === linkedData.referrals.length ? 'בטל הכל' : 'בחר הכל'}
                        </button>
                      </div>
                      {linkedData.referrals.map(r => (
                        <label key={r.id} className="flex items-center gap-3 px-3 py-2.5 border-b last:border-0 border-[hsl(var(--border))]/50 cursor-pointer hover:bg-[hsl(var(--muted))]/20">
                          <input type="checkbox" checked={deleteRefIds.has(r.id)}
                            onChange={e => setDeleteRefIds(s => { const n = new Set(s); e.target.checked ? n.add(r.id) : n.delete(r.id); return n; })}
                            className="rounded" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium">{r.specialty}</p>
                            <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">{r.reason} · {r.status}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-xl border border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/5 px-4 py-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[hsl(var(--success))] shrink-0" />
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">אין נתונים מקושרים — ניתן למחוק בבטחה</p>
                </div>
              )}

              <div className="flex gap-3 pt-2 border-t border-[hsl(var(--border))]">
                <button type="button" onClick={confirmDeleteDoc} disabled={!!deletingId}
                  className="btn-danger flex-1 gap-2 justify-center disabled:opacity-50">
                  {deletingId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  {deletingId ? 'מוחק...' : `מחק מסמך${(deleteTaskIds.size + deleteProfIds.size + deleteRefIds.size) > 0 ? ` + ${deleteTaskIds.size + deleteProfIds.size + deleteRefIds.size} פריטים` : ''}`}
                </button>
                <button type="button" onClick={() => { setDeleteConfirmDoc(null); setLinkedData(null); }} disabled={!!deletingId}
                  className="btn-ghost">ביטול</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ReviewSection({ icon, title, border, children }: {
  icon: React.ReactNode; title: string; border: string; children: React.ReactNode;
}) {
  return (
    <div className={`rounded-xl border ${border} bg-[hsl(var(--card))] p-4 space-y-3`}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-semibold">{title}</span>
      </div>
      {children}
    </div>
  );
}

function EditableTaskRow({ task, taskKey, addingKey, addedKeys, isEditing, onEdit, onSave, onDelete, onAdd, addLabel, color, familyMembers, assignedUserId, onAssign }: {
  task: { title: string; description?: string; dueDate?: string | null };
  taskKey: string;
  addingKey: string | null;
  addedKeys: Set<string>;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (updated: { title: string; description: string }) => void;
  onDelete: () => void;
  onAdd: () => void;
  addLabel: string;
  color: 'blue' | 'green';
  familyMembers?: Array<{ userId: string; fullName: string; role: string }>;
  assignedUserId?: string;
  onAssign?: (uid: string) => void;
}) {
  const [localTitle, setLocalTitle] = useState(task.title);
  const [localDesc, setLocalDesc] = useState(task.description || '');
  const isAdded = addedKeys.has(taskKey);
  const isAdding = addingKey === taskKey;

  const borderCls = color === 'blue' ? 'border-blue-200 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-950/10' : 'border-green-200 dark:border-green-900 bg-green-50/30 dark:bg-green-950/10';
  const addBtnCls = color === 'blue' ? 'bg-blue-500/10 text-blue-700 hover:bg-blue-500/20 border-blue-300 dark:text-blue-400 dark:border-blue-700' : 'bg-green-500/10 text-green-700 hover:bg-green-500/20 border-green-300 dark:text-green-400 dark:border-green-700';

  return (
    <div className={`rounded-lg border ${borderCls} px-3 py-2.5 space-y-2`}>
      {isEditing ? (
        <div className="space-y-2">
          <input className="input-base text-sm" value={localTitle} onChange={(e) => setLocalTitle(e.target.value)} placeholder="כותרת משימה" />
          <input className="input-base text-sm" value={localDesc} onChange={(e) => setLocalDesc(e.target.value)} placeholder="תיאור (אופציונלי)" />
          <div className="flex gap-2">
            <button type="button" onClick={() => onSave({ title: localTitle, description: localDesc })} className="btn-primary text-xs px-3 py-1.5 gap-1"><Save className="w-3 h-3" /> שמור</button>
            <button type="button" onClick={onEdit} className="btn-ghost text-xs px-3 py-1.5">ביטול</button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{task.title}</p>
            {task.description && <p className="text-xs text-[hsl(var(--muted-foreground))]">{task.description}</p>}
            {task.dueDate && <p className="text-xs text-[hsl(var(--primary))] flex items-center gap-1 mt-0.5"><Calendar className="w-3 h-3" />{task.dueDate}</p>}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button type="button" onClick={onEdit} className="btn-ghost h-6 w-6 p-0 justify-center"><Pencil className="w-3 h-3" /></button>
            <button type="button" onClick={onDelete} className="btn-ghost h-6 w-6 p-0 justify-center text-[hsl(var(--destructive))]"><Trash2 className="w-3 h-3" /></button>
          </div>
        </div>
      )}
      {!isEditing && (
        isAdded ? (
          <span className="inline-flex items-center gap-1 text-xs text-[hsl(var(--success))] font-medium"><CheckCircle2 className="w-3 h-3" /> נוספה!</span>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            {familyMembers && familyMembers.length > 0 && onAssign && (
              <select
                value={assignedUserId ?? ''}
                onChange={(e) => onAssign(e.target.value)}
                className="text-xs border border-[hsl(var(--border))] rounded-md px-2 py-1.5 bg-[hsl(var(--background))] text-[hsl(var(--foreground))]"
                onClick={(e) => e.stopPropagation()}
              >
                <option value="">שייך ל...</option>
                {familyMembers.map((m) => (
                  <option key={m.userId} value={m.userId}>{m.fullName}</option>
                ))}
              </select>
            )}
            <button type="button" onClick={onAdd} disabled={isAdding}
              className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border font-medium disabled:opacity-50 ${addBtnCls}`}>
              {isAdding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
              {addLabel}
            </button>
          </div>
        )
      )}
    </div>
  );
}
