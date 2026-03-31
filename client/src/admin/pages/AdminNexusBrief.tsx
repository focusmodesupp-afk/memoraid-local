import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useRoute } from 'wouter';
import {
  Cpu,
  ArrowRight,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Play,
  Globe,
  Brain,
  Star,
  ChevronDown,
  ChevronUp,
  Edit3,
  ThumbsUp,
  ThumbsDown,
  Copy,
  FileDown,
  Printer,
  Sparkles,
  ListChecks,
  Zap,
  ToggleLeft,
  ToggleRight,
  RotateCcw,
  GitFork,
  MessageSquare,
  Rss,
  FileText,
  Database,
  Shield,
  Megaphone,
  Scale,
  Layers,
  GitBranch,
  Palette,
  Terminal,
} from 'lucide-react';
import { apiFetch } from '../../lib/api';
import MarkdownRenderer from '../components/MarkdownRenderer';
import { downloadAsPdf, downloadAsWord, downloadAllDocsAsZip } from '../utils/documentDownload';

// ── Types ──────────────────────────────────────────────────────────────────────
type NexusBriefStatus =
  | 'draft'
  | 'researching'
  | 'review'
  | 'approved'
  | 'rejected'
  | 'in_progress'
  | 'done';

type Brief = {
  id: string;
  title: string;
  ideaPrompt: string;
  status: NexusBriefStatus;
  selectedDepartments: string[];
  selectedModels: string[];
  assembledBrief: string | null;
  reviewNotes: string | null;
  contextNotes: string | null;
  targetPlatforms: string[];
  codebaseDepth: string;
  codebaseScope: string;
  totalCostUsd: string;
  totalTokensUsed: number;
  adminFullName: string | null;
  createdAt: string;
  researchCompletedAt: string | null;
  approvedAt: string | null;
};

type DepartmentRecord = {
  id: string;
  department: string;
  status: string;
  output: string | null;
  promptSnapshot: string | null;
  modelUsed: string | null;
  tokensUsed: number;
  costUsd: string;
  errorMessage: string | null;
};

type WebSource = {
  id: string;
  sourceType: string;
  url: string | null;
  title: string | null;
  snippet: string | null;
  trustScore: number;
  githubStars: number | null;
  redditScore: number | null;
  contributorCount: number | null;
  rawPayload: Record<string, unknown> | null;
};

type ExtractedTask = {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  estimateHours: number | null;
  category: string | null;
  skillTags: string[] | null;
  sourceDepartment: string | null;
  accepted: boolean | null;
};

type Phase = { id: string; name: string };

type AIModelInfo = { id: string; label: string; available: boolean };

type DeptConfig = {
  id: string;
  hebrewName: string;
  emoji: string;
  systemPrompt: string;
  outputSections: string[];
};

type GeneratedDoc = {
  docType: string;
  title: string;
  content: string;
  tokensUsed: number;
  costUsd: number;
  model: string;
};

type SSEEvent =
  | { type: 'start'; briefId: string; departments: string[]; totalDepts: number }
  | { type: 'codebase_ready'; linesScanned: number; depth: string; scope: string }
  | { type: 'web_intelligence_start'; query: string }
  | { type: 'web_source_found'; sourceType: string; title: string; trustScore: number }
  | { type: 'web_intelligence_done'; sourceCount: number; topSources: { title: string; trustScore: number; sourceType: string }[] }
  | { type: 'department_start'; department: string; hebrewName: string }
  | { type: 'department_done'; department: string; tokensUsed: number; costUsd: number; outputPreview: string }
  | { type: 'department_error'; department: string; error: string }
  | { type: 'assembly_start' }
  | { type: 'assembly_done'; briefId: string; assembledLength: number }
  | { type: 'done'; totalCostUsd: number; totalTokens: number; durationMs: number }
  | { type: 'error'; message: string; retryable: boolean };

// ── Constants ──────────────────────────────────────────────────────────────────
const ALL_DEPARTMENTS = [
  { id: 'ceo',      hebrewName: 'מנכ"ל (CEO)',           emoji: '👔', description: 'כדאיות עסקית, שוק, תחרות' },
  { id: 'cto',      hebrewName: 'מנמ"ר טכנולוגיה (CTO)', emoji: '⚙️', description: 'ארכיטקטורה, tech stack, integration' },
  { id: 'cpo',      hebrewName: 'מנהל מוצר (CPO)',       emoji: '🎯', description: 'אסטרטגיה, UX, MoSCoW' },
  { id: 'rd',       hebrewName: 'מחקר ופיתוח (R&D)',     emoji: '🔬', description: 'ספריות, repos, POC' },
  { id: 'design',   hebrewName: 'עיצוב UX/UI',            emoji: '🎨', description: 'Design System, accessibility' },
  { id: 'product',  hebrewName: 'ניהול מוצר',             emoji: '📋', description: 'User Stories, Sprint' },
  { id: 'security', hebrewName: 'אבטחת מידע',             emoji: '🔒', description: 'OWASP, Threat Model, GDPR' },
  { id: 'legal',    hebrewName: 'משפטי ורגולציה',         emoji: '⚖️', description: 'רישיונות, GDPR, סיכונים' },
  { id: 'marketing',hebrewName: 'שיווק וצמיחה',           emoji: '📣', description: 'GTM, SEO, positioning' },
  { id: 'finance',  hebrewName: 'פיננסים ו-BI (CFO)',     emoji: '💰', description: 'ROI, unit economics, Stage-Gate' },
];

const DEPTH_OPTIONS = [
  { value: 'quick', label: 'מהיר', desc: 'package.json, מבנה, DB בלבד' },
  { value: 'deep',  label: 'מעמיק', desc: 'API routes, components. מומלץ' },
  { value: 'full',  label: 'מלא',  desc: 'כל קבצי הליבה' },
] as const;

const SCOPE_OPTIONS = [
  { value: 'all',    label: 'כל הפרויקט' },
  { value: 'client', label: 'Client בלבד' },
  { value: 'server', label: 'Server בלבד' },
] as const;

// ── Trust Score badge ──────────────────────────────────────────────────────────
function TrustBadge({ score }: { score: number }) {
  const color = score >= 70 ? 'bg-green-500/20 text-green-300 border border-green-500/30' : score >= 40 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30';
  return <span className={`px-2 py-0.5 rounded text-xs font-mono font-semibold ${color}`}>{score}/100</span>;
}

// ── Source type icon ───────────────────────────────────────────────────────────
const SOURCE_EMOJIS: Record<string, string> = {
  github: '🐙', reddit: '🤖', rss: '📰', perplexity: '🌐',
};

const RSS_CATEGORY_ICONS: Record<string, string> = {
  youtube: '▶️', ai: '🤖', security: '🛡️', design: '🎨', product: '📋',
  marketing: '📣', healthcare: '🏥', devops: '🔧', frontend: '💻',
  backend: '⚙️', tech: '📰',
};

// ── Priority sort order ────────────────────────────────────────────────────────
const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
const DEFAULT_TASKS_PER_SPRINT = 10;
// Legacy — kept so old references don't break at runtime; not used for rendering
const SPRINT_GROUPS = [
  { id: 'high',   label: 'ספרינט 1 — דחוף וגבוה',  nameSuffix: 'עדיפות גבוהה',  priorities: ['urgent', 'high'],   colorClass: 'border-red-500/40 bg-red-500/5',    badgeClass: 'bg-red-500/20 text-red-400' },
  { id: 'medium', label: 'ספרינט 2 — בינוני',       nameSuffix: 'עדיפות בינונית', priorities: ['medium'],           colorClass: 'border-amber-500/40 bg-amber-500/5', badgeClass: 'bg-amber-500/20 text-amber-400' },
  { id: 'low',    label: 'ספרינט 3 — נמוך / רצוי',  nameSuffix: 'עדיפות נמוכה',  priorities: ['low'],              colorClass: 'border-slate-600/50 bg-slate-800/20', badgeClass: 'bg-slate-600/20 text-slate-400' },
] as const;

// ── Dept status tracking during SSE ───────────────────────────────────────────
type DeptLiveStatus = 'pending' | 'running' | 'done' | 'error';

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function AdminNexusBrief() {
  const [, navigate] = useLocation();
  const [, params] = useRoute('/admin/nexus/briefs/:id');
  const briefId = params?.id ?? '';

  // ── Data ──────────────────────────────────────────────────────────────────
  const [brief, setBrief] = useState<Brief | null>(null);
  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  const [webSources, setWebSources] = useState<WebSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Wizard state ──────────────────────────────────────────────────────────
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [codebaseDepth, setCodebaseDepth] = useState<'quick' | 'deep' | 'full'>('deep');
  const [codebaseScope, setCodebaseScope] = useState<'all' | 'client' | 'server'>('all');
  const [availableModels, setAvailableModels] = useState<AIModelInfo[]>([]);
  const [launching, setLaunching] = useState(false);
  const [deptDefaultModels, setDeptDefaultModels] = useState<Record<string, string | null>>({});

  // ── SSE / live research state ─────────────────────────────────────────────
  const [streaming, setStreaming] = useState(false);
  const [deptLiveStatus, setDeptLiveStatus] = useState<Record<string, DeptLiveStatus>>({});
  const [liveTopSources, setLiveTopSources] = useState<{ title: string; trustScore: number; sourceType: string }[]>([]);
  const [liveCost, setLiveCost] = useState(0);
  const [liveTokens, setLiveTokens] = useState(0);
  const [completedDepts, setCompletedDepts] = useState(0);
  const [totalDepts, setTotalDepts] = useState(0);
  const [webDone, setWebDone] = useState(false);
  const [assemblyDone, setAssemblyDone] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  // ── Context notes + platform state ───────────────────────────────────────
  const [contextNotes, setContextNotes] = useState('');
  const [targetPlatforms, setTargetPlatforms] = useState<string[]>([]);
  const [isExistingProject, setIsExistingProject] = useState(false);
  const [codebasePreview, setCodebasePreview] = useState<{ preview: string; lines: number; chars: number } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  async function loadCodebasePreview() {
    setLoadingPreview(true);
    try {
      const data = await apiFetch<{ preview: string; lines: number; chars: number }>(
        `/admin/nexus/codebase-preview?depth=${codebaseDepth}&scope=${codebaseScope}`
      );
      setCodebasePreview(data);
    } catch {
      alert('שגיאה בטעינת preview');
    } finally {
      setLoadingPreview(false);
    }
  }

  function toggleExistingProject() {
    const next = !isExistingProject;
    setIsExistingProject(next);
    if (next) {
      setCodebaseDepth('full');
      setCodebaseScope('all');
    }
  }

  // ── File upload state ─────────────────────────────────────────────────────
  type UploadedFile = { filename: string; type: string; text: string; chars: number };
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingFiles(true);
    try {
      const formData = new FormData();
      for (const f of Array.from(files)) formData.append('files', f);
      const resp = await fetch('/api/admin/nexus/extract-text', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (!resp.ok) throw new Error(await resp.text());
      const data: { files: UploadedFile[] } = await resp.json();
      setUploadedFiles((prev) => [...prev, ...data.files]);
    } catch (err: any) {
      alert('שגיאה בהעלאת קבצים: ' + (err.message ?? err));
    } finally {
      setUploadingFiles(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };
  const [refineModal, setRefineModal] = useState(false);
  const [refineNotes, setRefineNotes] = useState('');
  const [refining, setRefining] = useState(false);

  // ── Review tabs state ────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<string>('summary');

  // ── Review state ──────────────────────────────────────────────────────────
  const [editingBrief, setEditingBrief] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedDept, setExpandedDept] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // ── Reset state ───────────────────────────────────────────────────────────
  const [resetting, setResetting] = useState(false);

  // ── Idea prompt expand ────────────────────────────────────────────────────
  const [ideaExpanded, setIdeaExpanded] = useState(false);

  // ── Dept configs (system prompts) ─────────────────────────────────────────
  const [deptConfigs, setDeptConfigs] = useState<Record<string, DeptConfig>>({});
  const [showSystemPrompt, setShowSystemPrompt] = useState<string | null>(null);

  // ── Generated documents ───────────────────────────────────────────────────
  const [generatedDocs, setGeneratedDocs] = useState<Record<string, GeneratedDoc>>({});
  const [generatingDoc, setGeneratingDoc] = useState<string | null>(null);
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);

  // ── Task extraction state ─────────────────────────────────────────────────
  const [extractedTasks, setExtractedTasks] = useState<ExtractedTask[] | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [taskAccepted, setTaskAccepted] = useState<Record<string, boolean>>({});
  const [phases, setPhases] = useState<Phase[]>([]);
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null);
  // Dynamic sprint splitting state
  const [tasksPerSprint, setTasksPerSprint] = useState(DEFAULT_TASKS_PER_SPRINT);
  const [sprintConfigs, setSprintConfigs] = useState<Record<number, { name: string; goal: string }>>({});
  const [creatingSprintIdx, setCreatingSprintIdx] = useState<number | null>(null);
  const [createdSprints, setCreatedSprints] = useState<Record<number, { sprintId: string; taskCount: number }>>({});
  // Legacy aliases — keep so nothing blows up
  const sprintGroupConfigs = sprintConfigs as any;
  const setSprintGroupConfigs = setSprintConfigs as any;
  const creatingGroup = creatingSprintIdx !== null ? String(creatingSprintIdx) : null;
  const createdGroups = createdSprints as any;

  // ── Load brief ─────────────────────────────────────────────────────────────
  const loadBrief = useCallback(async () => {
    if (!briefId) return;
    try {
      const data = await apiFetch<{ brief: Brief; departments: DepartmentRecord[]; webSources: WebSource[] }>(
        `/admin/nexus/briefs/${briefId}`
      );
      setBrief(data.brief);
      setDepartments(data.departments);
      setWebSources(data.webSources);
      setSelectedDepts(data.brief.selectedDepartments ?? []);
      setSelectedModels(data.brief.selectedModels ?? []);
      setCodebaseDepth((data.brief.codebaseDepth as 'quick' | 'deep' | 'full') ?? 'deep');
      setCodebaseScope((data.brief.codebaseScope as 'all' | 'client' | 'server') ?? 'all');
      const notes = data.brief.contextNotes ?? '';
      setContextNotes(notes.replace('[EXISTING_PROJECT] ', ''));
      setIsExistingProject(notes.startsWith('[EXISTING_PROJECT]'));
      setTargetPlatforms(data.brief.targetPlatforms ?? []);
    } catch (e) {
      setError('לא ניתן לטעון את הניירת');
    } finally {
      setLoading(false);
    }
  }, [briefId]);

  useEffect(() => { void loadBrief(); }, [loadBrief]);

  // Auto-poll when brief is researching but no active SSE connection
  // (handles: page refresh mid-research, navigating away and back, dropped SSE)
  useEffect(() => {
    if (!brief) return;
    if (brief.status !== 'researching') return;
    if (streaming) return; // SSE is active, no need to poll
    const interval = setInterval(() => void loadBrief(), 4000);
    return () => clearInterval(interval);
  }, [brief?.status, streaming, loadBrief]);

  // Load available models + phases + dept configs
  useEffect(() => {
    apiFetch<{ models: AIModelInfo[] }>('/admin/nexus/models')
      .then((d) => setAvailableModels(d.models ?? []))
      .catch(() => {});
    apiFetch<Phase[]>('/admin/nexus/phases')
      .then((d) => setPhases(Array.isArray(d) ? d : []))
      .catch(() => {});
    apiFetch<{ departments: DeptConfig[] }>('/admin/nexus/dept-configs')
      .then((d) => {
        const map: Record<string, DeptConfig> = {};
        for (const dc of d.departments ?? []) map[dc.id] = dc;
        setDeptConfigs(map);
      })
      .catch(() => {});
    apiFetch<{ department: string; defaultModel: string | null }[]>('/admin/nexus/dept-settings')
      .then((d) => {
        const map: Record<string, string | null> = {};
        if (Array.isArray(d)) d.forEach((s) => { map[s.department] = s.defaultModel; });
        setDeptDefaultModels(map);
      })
      .catch(() => {});
  }, []);

  // Load extracted tasks from DB whenever component mounts (regardless of brief status)
  useEffect(() => {
    if (briefId && extractedTasks === null && !extracting) {
      apiFetch<{ tasks: ExtractedTask[] }>(`/admin/nexus/briefs/${briefId}/extracted-tasks`)
        .then((d) => {
          const tasks = d.tasks ?? [];
          if (tasks.length > 0) {
            setExtractedTasks(tasks);
            setTaskAccepted(Object.fromEntries(tasks.map((t) => [t.id, t.accepted !== false])));
          }
        })
        .catch(() => {});
    }
  }, [briefId]);

  // Persist sprint configs to localStorage per brief
  useEffect(() => {
    if (!briefId || Object.keys(sprintConfigs).length === 0) return;
    try { localStorage.setItem(`nexus-sc-${briefId}`, JSON.stringify({ c: sprintConfigs, p: selectedPhaseId, tps: tasksPerSprint })); } catch { /* ignore */ }
  }, [sprintConfigs, selectedPhaseId, tasksPerSprint, briefId]);

  // Restore sprint configs from localStorage when tasks load
  useEffect(() => {
    if (!briefId || !extractedTasks || extractedTasks.length === 0) return;
    try {
      const saved = localStorage.getItem(`nexus-sc-${briefId}`);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (parsed.c) setSprintConfigs(parsed.c);
      if (parsed.p) setSelectedPhaseId(parsed.p);
      if (parsed.tps) setTasksPerSprint(parsed.tps);
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [briefId, extractedTasks?.length]);

  // ── SSE connection ─────────────────────────────────────────────────────────
  const connectStream = useCallback(() => {
    if (esRef.current) { esRef.current.close(); }
    setStreaming(true);
    setStreamError(null);
    setCompletedDepts(0);
    setWebDone(false);
    setAssemblyDone(false);
    setLiveCost(0);
    setLiveTokens(0);
    setLiveTopSources([]);
    setDeptLiveStatus({});

    const es = new EventSource(`/api/admin/nexus/briefs/${briefId}/stream`, { withCredentials: true });
    esRef.current = es;

    const handle = (type: string) => (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as SSEEvent;
        handleSSEEvent(data);
      } catch { /* ignore */ }
    };

    const eventTypes: SSEEvent['type'][] = [
      'start', 'codebase_ready', 'web_intelligence_start', 'web_source_found',
      'web_intelligence_done', 'department_start', 'department_done', 'department_error',
      'assembly_start', 'assembly_done', 'done', 'error',
    ];
    for (const t of eventTypes) es.addEventListener(t, handle(t) as EventListenerOrEventListenerObject);

    es.onerror = () => {
      setStreaming(false);
      es.close();
    };
  }, [briefId]);

  const handleSSEEvent = (event: SSEEvent) => {
    switch (event.type) {
      case 'start':
        setTotalDepts(event.totalDepts);
        setDeptLiveStatus(Object.fromEntries(event.departments.map((d) => [d, 'pending' as DeptLiveStatus])));
        break;
      case 'web_source_found':
        setLiveTopSources((prev) => [...prev, { title: event.title, trustScore: event.trustScore, sourceType: event.sourceType }]);
        break;
      case 'web_intelligence_done':
        setWebDone(true);
        if (event.topSources.length > 0) setLiveTopSources(event.topSources);
        break;
      case 'department_start':
        setDeptLiveStatus((prev) => ({ ...prev, [event.department]: 'running' }));
        break;
      case 'department_done':
        setDeptLiveStatus((prev) => ({ ...prev, [event.department]: 'done' }));
        setCompletedDepts((n) => n + 1);
        setLiveCost((c) => c + event.costUsd);
        setLiveTokens((t) => t + event.tokensUsed);
        break;
      case 'department_error':
        setDeptLiveStatus((prev) => ({ ...prev, [event.department]: 'error' }));
        setCompletedDepts((n) => n + 1);
        break;
      case 'assembly_done':
        setAssemblyDone(true);
        break;
      case 'done':
        setStreaming(false);
        esRef.current?.close();
        void loadBrief();
        break;
      case 'error':
        setStreamError(event.message);
        setStreaming(false);
        esRef.current?.close();
        void loadBrief();
        break;
    }
  };

  // ── Launch research ────────────────────────────────────────────────────────
  const handleLaunch = async () => {
    if (selectedDepts.length === 0) { alert('בחר לפחות מחלקה אחת'); return; }
    setLaunching(true);
    try {
      // Merge uploaded file texts into contextNotes
      let mergedNotes = (isExistingProject ? '[EXISTING_PROJECT] ' : '') + (contextNotes || '');
      if (uploadedFiles.length > 0) {
        const filesSection = uploadedFiles
          .filter((f) => f.text && !f.text.startsWith('['))
          .map((f) => `\n\n---\n📎 תוכן קובץ: ${f.filename} (${f.type})\n${f.text.slice(0, 15000)}`)
          .join('');
        if (filesSection) mergedNotes = (mergedNotes ? mergedNotes + '\n\n' : '') + filesSection.trim();
      }
      await apiFetch(`/admin/nexus/briefs/${briefId}`, {
        method: 'PATCH',
        body: JSON.stringify({ selectedDepartments: selectedDepts, selectedModels, codebaseDepth, codebaseScope, contextNotes: mergedNotes || null, targetPlatforms }),
      });
      await apiFetch(`/admin/nexus/briefs/${briefId}/run`, { method: 'POST', body: JSON.stringify({}) });
      connectStream();
      // Optimistically set status
      setBrief((b) => b ? { ...b, status: 'researching' } : b);
    } catch (e) {
      alert('שגיאה בהפעלת המחקר');
    } finally {
      setLaunching(false);
    }
  };

  // ── Review actions ─────────────────────────────────────────────────────────
  const handleApprove = async () => {
    setActionLoading('approve');
    try {
      const data = await apiFetch<{ brief: Brief }>(`/admin/nexus/briefs/${briefId}/approve`, { method: 'POST', body: JSON.stringify({}) });
      setBrief(data.brief);
    } catch { alert('שגיאה באישור'); }
    finally { setActionLoading(null); }
  };

  const handleReject = async () => {
    setActionLoading('reject');
    try {
      const data = await apiFetch<{ brief: Brief }>(`/admin/nexus/briefs/${briefId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reviewNotes: rejectNotes }),
      });
      setBrief(data.brief);
      setRejectModal(false);
    } catch { alert('שגיאה בדחייה'); }
    finally { setActionLoading(null); }
  };

  const handleSaveEdit = async () => {
    setSavingEdit(true);
    try {
      await apiFetch(`/admin/nexus/briefs/${briefId}`, {
        method: 'PATCH',
        body: JSON.stringify({ assembledBrief: editedContent }),
      });
      setBrief((b) => b ? { ...b, assembledBrief: editedContent } : b);
      setEditingBrief(false);
    } catch { alert('שגיאה בשמירה'); }
    finally { setSavingEdit(false); }
  };

  const handleCopy = () => {
    if (brief?.assembledBrief) {
      navigator.clipboard.writeText(brief.assembledBrief);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReset = async () => {
    if (!briefId) return;
    setResetting(true);
    try {
      const data = await apiFetch<{ brief: Brief }>(`/admin/nexus/briefs/${briefId}/reset`, { method: 'POST', body: '{}' });
      setBrief(data.brief);
      setStreaming(false);
    } catch (e: any) {
      alert(e.message ?? 'שגיאה באיפוס הניירת');
    } finally {
      setResetting(false);
    }
  };

  const handleRefine = async () => {
    if (!briefId) return;
    setRefining(true);
    try {
      await apiFetch(`/admin/nexus/briefs/${briefId}/reset`, {
        method: 'POST',
        body: JSON.stringify({ contextNotes: refineNotes || null }),
      });
      setContextNotes(refineNotes);
      setRefineModal(false);
      setRefineNotes('');
      // Reload brief to get updated state
      const data = await apiFetch<{ brief: Brief; departments: DepartmentRecord[]; webSources: WebSource[] }>(`/admin/nexus/briefs/${briefId}`);
      setBrief(data.brief);
      setDepartments(data.departments);
      setWebSources(data.webSources);
    } catch (e: any) {
      alert(e.message ?? 'שגיאה בחידוד הניירת');
    } finally {
      setRefining(false);
    }
  };

  const handleExtractTasks = async () => {
    if (!briefId) return;
    setExtracting(true);
    setExtractionError(null);
    try {
      const data = await apiFetch<{ tasks: ExtractedTask[] }>(`/admin/nexus/briefs/${briefId}/extract-tasks`, { method: 'POST', body: '{}' });
      const tasks = data.tasks ?? [];
      if (tasks.length === 0) {
        setExtractionError('AI לא הצליח לחלץ משימות — ייתכן שהניירת קצרה מדי או שנדרש מפתח API תקין. נסה שוב.');
      }
      setExtractedTasks(tasks);
      setTaskAccepted(Object.fromEntries(tasks.map((t) => [t.id, true])));
      // Auto-fill sprint names if empty
      if (brief) {
        const t = brief.title.slice(0, 32);
        const numSprints = Math.ceil(tasks.length / tasksPerSprint);
        setSprintConfigs((prev) => {
          const next = { ...prev };
          for (let i = 0; i < numSprints; i++) {
            if (!next[i]?.name) {
              next[i] = {
                name: `Sprint ${i + 1} — ${t}`,
                goal: i === 0 ? `יישום ממצאי מחקר Nexus: ${brief.ideaPrompt.slice(0, 60)}` : '',
              };
            }
          }
          return next;
        });
        if (!selectedPhaseId && phases.length === 1) setSelectedPhaseId(phases[0].id);
      }
    } catch (e: any) {
      const msg = e.message ?? 'שגיאה בחילוץ משימות';
      setExtractionError(msg);
    } finally {
      setExtracting(false);
    }
  };

  const handleToggleTask = (taskId: string) => {
    const newVal = taskAccepted[taskId] !== false ? false : true;
    setTaskAccepted((prev) => ({ ...prev, [taskId]: newVal }));
    void apiFetch(`/admin/nexus/briefs/${briefId}/extracted-tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify({ accepted: newVal }),
    }).catch(() => {});
  };

  const handleGenerateDoc = async (docType: string) => {
    if (!briefId) return;
    setGeneratingDoc(docType);
    try {
      const data = await apiFetch<GeneratedDoc>(`/admin/nexus/briefs/${briefId}/generate-doc`, {
        method: 'POST',
        body: JSON.stringify({ docType }),
      });
      setGeneratedDocs((prev) => ({ ...prev, [docType]: data }));
      setExpandedDoc(docType);
    } catch (e: any) {
      alert(e.message ?? 'שגיאה בייצור מסמך');
    } finally {
      setGeneratingDoc(null);
    }
  };

  const [downloadingAllDocs, setDownloadingAllDocs] = useState(false);
  const [downloadAllProgress, setDownloadAllProgress] = useState(0);

  const handleDownloadAllDocs = async () => {
    if (!brief) return;
    const ALL_DOC_TYPES = ['prd', 'erd', 'blueprint', 'cicd', 'design', 'security', 'marketing', 'legal'];
    setDownloadingAllDocs(true);
    setDownloadAllProgress(0);
    try {
      const results: Record<string, { content: string; docType: string }> = { ...generatedDocs };
      const missing = ALL_DOC_TYPES.filter((t) => !results[t]);
      let done = ALL_DOC_TYPES.length - missing.length;
      setDownloadAllProgress(done);

      await Promise.all(
        missing.map(async (docType) => {
          try {
            const data = await apiFetch<GeneratedDoc>(`/admin/nexus/briefs/${briefId}/generate-doc`, {
              method: 'POST',
              body: JSON.stringify({ docType }),
            });
            results[docType] = data;
            setGeneratedDocs((prev) => ({ ...prev, [docType]: data }));
          } catch {
            // include empty placeholder so ZIP still works
            results[docType] = { content: `שגיאה בייצור מסמך ${docType}`, docType, title: docType, tokensUsed: 0, costUsd: 0 };
          } finally {
            done++;
            setDownloadAllProgress(done);
          }
        }),
      );

      await downloadAllDocsAsZip(results, brief.title);
    } catch (e: any) {
      alert(e.message ?? 'שגיאה בהורדת ZIP');
    } finally {
      setDownloadingAllDocs(false);
      setDownloadAllProgress(0);
    }
  };

  // ── Dynamic sprint split (sorted by priority) ────────────────────────────
  const sortedTasksForSprint = [...(extractedTasks ?? [])].sort(
    (a, b) => (PRIORITY_ORDER[a.priority] ?? 4) - (PRIORITY_ORDER[b.priority] ?? 4),
  );
  const dynamicSprintGroups: { tasks: typeof sortedTasksForSprint; idx: number }[] = [];
  for (let i = 0; i < sortedTasksForSprint.length; i += tasksPerSprint) {
    dynamicSprintGroups.push({ tasks: sortedTasksForSprint.slice(i, i + tasksPerSprint), idx: dynamicSprintGroups.length });
  }

  const handleCreateSprintGroup = async (idx: number) => {
    if (!briefId) return;
    const group = dynamicSprintGroups[idx];
    if (!group) return;
    const config = sprintConfigs[idx];
    const name = config?.name?.trim() || `Sprint ${idx + 1}`;
    const taskIds = group.tasks.filter((t) => taskAccepted[t.id] !== false).map((t) => t.id);
    if (taskIds.length === 0) { alert('אין משימות מאושרות בספרינט זה'); return; }
    setCreatingSprintIdx(idx);
    try {
      const data = await apiFetch<{ sprintId: string; taskCount: number }>(`/admin/nexus/briefs/${briefId}/generate-sprint`, {
        method: 'POST',
        body: JSON.stringify({ sprintName: name, sprintGoal: config?.goal?.trim() || undefined, phaseId: selectedPhaseId || undefined, taskIds }),
      });
      setCreatedSprints((prev) => ({ ...prev, [idx]: data }));
    } catch (e: any) {
      alert(e.message ?? 'שגיאה ביצירת ספרינט');
    } finally {
      setCreatingSprintIdx(null);
    }
  };

  const handleCreateAllSprints = async () => {
    for (const group of dynamicSprintGroups) {
      if (createdSprints[group.idx]) continue;
      await handleCreateSprintGroup(group.idx);
    }
  };

  // ── Progress calculation ──────────────────────────────────────────────────
  const progress = Math.min(100,
    (completedDepts / Math.max(totalDepts, 1)) * 80 +
    (webDone ? 10 : 0) +
    (assemblyDone ? 10 : 0)
  );

  // ── Render states ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (error || !brief) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle className="w-8 h-8 text-red-400" />
        <p className="text-slate-400">{error ?? 'לא נמצאה הניירת'}</p>
        <button onClick={() => navigate('/admin/nexus')} className="text-indigo-400 hover:text-indigo-300 text-sm">
          חזרה לרשימה
        </button>
      </div>
    );
  }

  const isResearching = brief.status === 'researching' || streaming;
  const isReview = ['review', 'approved', 'rejected', 'in_progress', 'done'].includes(brief.status);

  return (
    <div className="p-6 max-w-5xl mx-auto" dir="rtl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400 mb-5">
        <button onClick={() => navigate('/admin/nexus')} className="hover:text-slate-200 flex items-center gap-1">
          <Cpu className="w-3.5 h-3.5" /> ניירות Nexus
        </button>
        <ArrowRight className="w-3.5 h-3.5 rotate-180" />
        <span className="text-slate-200 truncate max-w-xs">{brief.title}</span>
      </div>

      {/* Title + status */}
      <div className="flex items-start gap-4 mb-6">
        <div className="flex-1">
          <h1 className="admin-page-title leading-tight">{brief.title}</h1>
          <div className="mt-1">
            <p className={`text-sm admin-muted ${ideaExpanded ? '' : 'line-clamp-2'}`}>{brief.ideaPrompt}</p>
            {brief.ideaPrompt && brief.ideaPrompt.length > 120 && (
              <button
                onClick={() => setIdeaExpanded((v) => !v)}
                className="text-xs text-indigo-400 hover:text-indigo-300 mt-0.5 font-medium"
              >
                {ideaExpanded ? '▲ סגור' : '▼ קרא עוד'}
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {brief.totalTokensUsed > 0 && (
            <span className="text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded-lg">
              ${Number(brief.totalCostUsd).toFixed(4)}
            </span>
          )}
          {brief.status === 'researching' && !streaming && (
            <button
              onClick={handleReset}
              disabled={resetting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500/50 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 text-xs font-medium transition-colors"
              title="המחקר תקוע? אפס לטיוטה"
            >
              {resetting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
              אפס מחקר
            </button>
          )}
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
            brief.status === 'review' ? 'bg-amber-500 text-amber-900' :
            brief.status === 'approved' ? 'bg-green-600 text-white' :
            brief.status === 'rejected' ? 'bg-red-600 text-white' :
            brief.status === 'researching' ? 'bg-blue-600 text-white' :
            'bg-slate-600 text-slate-200'
          }`}>
            {brief.status === 'draft' ? 'טיוטה' : brief.status === 'researching' ? 'חוקר...' :
             brief.status === 'review' ? 'בסקירה' : brief.status === 'approved' ? 'אושר' :
             brief.status === 'rejected' ? 'נדחה' : brief.status}
          </span>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          WIZARD MODE (draft)
          ════════════════════════════════════════════════════════ */}
      {brief.status === 'draft' && !streaming && (
        <div className="space-y-5">
          {/* Step 1: Department selection */}
          <div className="admin-card">
            <h2 className="text-base font-semibold text-slate-100 mb-4 flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-indigo-600 text-white text-sm flex items-center justify-center font-bold">1</span>
              בחר מחלקות לחקור
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {ALL_DEPARTMENTS.map((dept) => {
                const active = selectedDepts.includes(dept.id);
                return (
                  <button
                    key={dept.id}
                    onClick={() =>
                      setSelectedDepts((prev) =>
                        active ? prev.filter((d) => d !== dept.id) : [...prev, dept.id]
                      )
                    }
                    className={`flex flex-col gap-1.5 p-4 rounded-xl border text-right transition-all ${
                      active
                        ? 'border-indigo-500 bg-indigo-500/10 text-slate-100'
                        : 'border-slate-600 bg-slate-800/40 text-slate-300 hover:border-slate-500 hover:text-slate-100'
                    }`}
                  >
                    <span className="text-2xl">{dept.emoji}</span>
                    <span className="text-sm font-semibold leading-tight">{dept.hebrewName}</span>
                    <span className="text-xs admin-muted leading-tight">{dept.description}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={() => setSelectedDepts(ALL_DEPARTMENTS.map((d) => d.id))}
                className="text-sm text-indigo-400 hover:text-indigo-300 font-medium"
              >
                בחר הכל
              </button>
              <span className="text-slate-600">|</span>
              <button onClick={() => setSelectedDepts([])} className="text-sm admin-muted hover:text-slate-300">
                נקה
              </button>
              <span className="text-sm admin-muted mr-auto font-medium">{selectedDepts.length} מחלקות נבחרו</span>
            </div>
          </div>

          {/* Step 2: Model selection */}
          {availableModels.length > 0 && (
            <div className="admin-card">
              <h2 className="text-base font-semibold text-slate-100 mb-4 flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-indigo-600 text-white text-sm flex items-center justify-center font-bold">2</span>
                מודל AI (בחר עד 2)
              </h2>
              <div className="flex flex-wrap gap-3">
                {availableModels.filter((m) => m.available).map((model) => {
                  const active = selectedModels.includes(model.id);
                  return (
                    <button
                      key={model.id}
                      onClick={() =>
                        setSelectedModels((prev) =>
                          active
                            ? prev.filter((m) => m !== model.id)
                            : prev.length < 2
                            ? [...prev, model.id]
                            : prev
                        )
                      }
                      className={`px-4 py-2 rounded-lg border text-sm font-mono transition-all ${
                        active
                          ? 'border-indigo-500 bg-indigo-500/15 text-indigo-300'
                          : 'border-slate-600 text-slate-300 hover:border-slate-500 hover:text-slate-100'
                      }`}
                    >
                      {model.label}
                    </button>
                  );
                })}
              </div>
              {selectedModels.length === 0 && (
                <p className="text-sm admin-muted mt-3">ברירת מחדל: Claude (מומלץ)</p>
              )}
            </div>
          )}

          {/* Step 3: Codebase context */}
          <div className="admin-card">
            <h2 className="text-base font-semibold text-slate-100 mb-4 flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-indigo-600 text-white text-sm flex items-center justify-center font-bold">3</span>
              הקשר קוד הפרויקט
            </h2>
            <div className="flex gap-5">
              <div className="flex-1">
                <label className="block text-sm admin-muted mb-2 font-medium">עומק סריקה</label>
                <div className="flex gap-2">
                  {DEPTH_OPTIONS.map((d) => (
                    <button
                      key={d.value}
                      onClick={() => setCodebaseDepth(d.value)}
                      className={`flex-1 px-3 py-2.5 rounded-lg border text-sm text-center transition-all ${
                        codebaseDepth === d.value
                          ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                          : 'border-slate-600 text-slate-300 hover:border-slate-500 hover:text-slate-100'
                      }`}
                    >
                      <span className="font-semibold block">{d.label}</span>
                      <span className="text-xs admin-muted">{d.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm admin-muted mb-2 font-medium">טווח</label>
                <div className="flex flex-col gap-2">
                  {SCOPE_OPTIONS.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => setCodebaseScope(s.value)}
                      className={`px-4 py-2 rounded-lg border text-sm transition-all ${
                        codebaseScope === s.value
                          ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                          : 'border-slate-600 text-slate-300 hover:border-slate-500 hover:text-slate-100'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Codebase preview */}
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={loadCodebasePreview}
                disabled={loadingPreview}
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-300 transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {loadingPreview ? '⏳ סורק...' : '👁 תצוגה מקדימה של מה שייסרק'}
              </button>
              {codebasePreview && (
                <span className="text-xs text-slate-500">{codebasePreview.lines.toLocaleString()} שורות | {Math.round(codebasePreview.chars / 1024)}KB</span>
              )}
            </div>
            {codebasePreview && (
              <div className="mt-2 relative">
                <pre className="text-xs font-mono text-slate-400 bg-slate-900/60 rounded-lg p-3 max-h-48 overflow-y-auto border border-slate-700/50 whitespace-pre-wrap">
                  {codebasePreview.preview}
                </pre>
                <button
                  type="button"
                  onClick={() => setCodebasePreview(null)}
                  className="absolute top-2 left-2 text-slate-500 hover:text-slate-300 text-xs"
                >✕</button>
              </div>
            )}
          </div>

          {/* Step 4: Target Platforms */}
          <div className="admin-card">
            <h2 className="text-base font-semibold text-slate-100 mb-3 flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-slate-600 text-white text-sm flex items-center justify-center font-bold">4</span>
              פלטפורמות יעד
              <span className="text-xs text-slate-500 font-normal mr-1">(בחר לפחות אחת)</span>
            </h2>

            {/* Existing project toggle */}
            <div className={`mb-3 p-3 rounded-xl border flex items-center justify-between transition-all ${
              isExistingProject
                ? 'border-amber-500/50 bg-amber-500/8'
                : 'border-slate-700/50 bg-slate-800/30'
            }`}>
              <div>
                <p className="text-sm font-semibold text-slate-200">🏗️ פרויקט קיים</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isExistingProject
                    ? 'Claude יסרוק את כל הקבצים והספריות — משימות יכילו נתיבים אמיתיים מהcodebase'
                    : 'מפתחים על מוצר קיים? הפעל כדי שהמחקר יתבסס על הקוד הקיים'}
                </p>
              </div>
              <button
                type="button"
                onClick={toggleExistingProject}
                className={`px-4 py-2 rounded-lg border text-sm font-semibold transition-all ${
                  isExistingProject
                    ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                    : 'border-slate-600 text-slate-400 hover:border-amber-500/50 hover:text-slate-300'
                }`}
              >
                {isExistingProject ? '✓ פעיל' : 'הפעל'}
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {(['Web', 'iOS', 'Android', 'PWA', 'Desktop', 'API / Backend only'] as const).map((p) => {
                const icons: Record<string, string> = { 'Web': '🌐', 'iOS': '🍎', 'Android': '🤖', 'PWA': '📲', 'Desktop': '💻', 'API / Backend only': '⚙️' };
                const active = targetPlatforms.includes(p);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setTargetPlatforms(active ? targetPlatforms.filter((x) => x !== p) : [...targetPlatforms, p])}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${active ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-slate-400'}`}
                  >
                    <span>{icons[p]}</span> {p}
                  </button>
                );
              })}
            </div>
            {targetPlatforms.length > 0 && (
              <p className="text-xs text-indigo-400 mt-2 flex items-center gap-1">
                <span>🖥️</span> כל ה-agents יידעו לחקור בהקשר של: {targetPlatforms.join(', ')}
              </p>
            )}
          </div>

          {/* Step 5: File upload */}
          <div className="admin-card">
            <h2 className="text-base font-semibold text-slate-100 mb-3 flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-slate-600 text-white text-sm flex items-center justify-center font-bold">5</span>
              העלאת מסמכים
              <span className="text-xs text-slate-500 font-normal mr-1">(אופציונלי) — PDF, Word, TXT, MD, תמונות</span>
            </h2>

            {/* Drop zone */}
            <div
              className="border-2 border-dashed border-slate-600 hover:border-indigo-500 rounded-xl p-6 text-center cursor-pointer transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const dt = e.dataTransfer;
                if (dt.files.length > 0) {
                  const fakeEvent = { target: { files: dt.files } } as unknown as React.ChangeEvent<HTMLInputElement>;
                  void handleFileUpload(fakeEvent);
                }
              }}
            >
              {uploadingFiles ? (
                <div className="flex items-center justify-center gap-2 text-indigo-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">מחלץ טקסט מהקבצים...</span>
                </div>
              ) : (
                <div className="text-slate-400">
                  <FileText className="w-8 h-8 mx-auto mb-2 text-slate-500" />
                  <p className="text-sm font-medium text-slate-300">גרור קבצים לכאן או לחץ להעלאה</p>
                  <p className="text-xs mt-1">PDF · Word (.docx) · TXT · MD · PNG · JPG · WebP · עד 20MB לקובץ</p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.doc,.txt,.md,.png,.jpg,.jpeg,.webp"
              className="hidden"
              onChange={handleFileUpload}
            />

            {/* Uploaded files list */}
            {uploadedFiles.length > 0 && (
              <div className="mt-3 space-y-2">
                {uploadedFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-slate-800 border border-slate-700">
                    <span className="text-lg shrink-0">
                      {f.type === 'PDF' ? '📄' : f.type === 'Word' ? '📝' : f.type === 'Image' ? '🖼️' : '📃'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-100 truncate">{f.filename}</p>
                      <p className="text-xs text-slate-400">{f.type} · {f.chars.toLocaleString()} תווים</p>
                    </div>
                    <button
                      onClick={() => setUploadedFiles((prev) => prev.filter((_, idx) => idx !== i))}
                      className="text-slate-500 hover:text-red-400 text-xs shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <p className="text-xs text-green-400 flex items-center gap-1">
                  <span>✅</span> {uploadedFiles.length} קבצים יוזרקו כהקשר לכל ה-agents
                </p>
              </div>
            )}
          </div>

          {/* Step 6: Context notes */}
          <div className="admin-card">
            <h2 className="text-base font-semibold text-slate-100 mb-3 flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-slate-600 text-white text-sm flex items-center justify-center font-bold">6</span>
              הקשר / הבהרות לAgents
              <span className="text-xs text-slate-500 font-normal mr-1">(אופציונלי)</span>
            </h2>
            <textarea
              value={contextNotes}
              onChange={(e) => setContextNotes(e.target.value)}
              placeholder={`לדוגמה: הפרויקט הוא פלטפורמת בריאות דיגיטלית לטיפול בחולי אלצהיימר ומשפחותיהם. אל תחפש מידע על memoraid.com (תחרויות זיכרון) — זה לא קשור. התמקד ב-Digital Health / Senior Care.`}
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg bg-slate-900 border border-slate-600 text-slate-200 text-sm resize-none focus:outline-none focus:border-indigo-500 placeholder:text-slate-600 leading-relaxed"
              dir="rtl"
            />
            {contextNotes && (
              <p className="text-xs text-indigo-400 mt-1.5 flex items-center gap-1">
                <span>⚡</span> הוראות אלו יוזרקו לכל 10 ה-agents לפני הניתוח
              </p>
            )}
          </div>

          {/* Launch button */}
          <button
            onClick={handleLaunch}
            disabled={selectedDepts.length === 0 || launching}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-base transition-all shadow-lg shadow-indigo-500/20"
          >
            {launching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
            הפעל מחקר Nexus ({selectedDepts.length} מחלקות)
          </button>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          LIVE RESEARCH MODE
          ════════════════════════════════════════════════════════ */}
      {isResearching && (
        <div className="space-y-5">
          {/* Progress bar */}
          <div className="admin-card">
            <div className="flex items-center justify-between mb-4">
              <span className="text-base font-semibold text-slate-100 flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                מחקר Nexus בתהליך...
              </span>
              <span className="text-lg font-mono font-bold text-indigo-300">{Math.round(progress)}%</span>
            </div>
            <div className="h-3 rounded-full bg-slate-700 overflow-hidden mb-4">
              <div
                className="h-full bg-gradient-to-r from-indigo-600 to-purple-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-lg font-bold text-green-400">${liveCost.toFixed(4)}</p>
                <p className="text-xs admin-muted">עלות צבורה</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-slate-100">{completedDepts}/{totalDepts}</p>
                <p className="text-xs admin-muted">מחלקות הושלמו</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-indigo-300">{liveTokens.toLocaleString()}</p>
                <p className="text-xs admin-muted">tokens</p>
              </div>
            </div>
          </div>

          {/* Web sources */}
          {(liveTopSources.length > 0 || !webDone) && (
            <div className="admin-card">
              <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2 mb-4">
                <Globe className="w-5 h-5 text-blue-400" />
                אינטליגנציה מהרשת {!webDone && <Loader2 className="w-4 h-4 animate-spin text-blue-400" />}
                {webDone && <CheckCircle className="w-4 h-4 text-green-400" />}
              </h3>
              {liveTopSources.length > 0 && (
                <div className="space-y-2">
                  {liveTopSources.map((s, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <span>{SOURCE_EMOJIS[s.sourceType] ?? '🔗'}</span>
                      <span className="flex-1 text-slate-200 truncate">{s.title}</span>
                      <TrustBadge score={s.trustScore} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Department grid */}
          <div className="grid grid-cols-3 gap-3">
            {ALL_DEPARTMENTS.filter((d) => brief.selectedDepartments.includes(d.id) || Object.keys(deptLiveStatus).includes(d.id)).map((dept) => {
              const status = deptLiveStatus[dept.id] ?? 'pending';
              return (
                <div
                  key={dept.id}
                  className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
                    status === 'running' ? 'border-blue-500/60 bg-blue-500/10' :
                    status === 'done' ? 'border-green-500/50 bg-green-500/8' :
                    status === 'error' ? 'border-red-500/50 bg-red-500/8' :
                    'border-slate-600 bg-slate-800/50'
                  }`}
                >
                  <span className="text-xl">{dept.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-100 leading-tight">{dept.hebrewName}</p>
                    {(() => {
                      const effectiveModel = deptDefaultModels[dept.id] ?? selectedModels[0] ?? null;
                      if (!effectiveModel) return null;
                      const short = effectiveModel.replace('claude-', '').replace('-latest', '').replace('-4-5', ' Haiku').replace('-4-6', ' Sonnet').replace('gpt-4o-mini', 'GPT-4o Mini').slice(0, 16);
                      return <span className="text-[9px] font-mono text-purple-400 opacity-80">{short}</span>;
                    })()}
                  </div>
                  <div className="shrink-0">
                    {status === 'running' && <Loader2 className="w-5 h-5 animate-spin text-blue-400" />}
                    {status === 'done' && <CheckCircle className="w-5 h-5 text-green-400" />}
                    {status === 'error' && <XCircle className="w-5 h-5 text-red-400" />}
                    {status === 'pending' && <div className="w-5 h-5 rounded-full border-2 border-slate-400 bg-slate-700" />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Assembly phase */}
          {assemblyDone && (
            <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-300 text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              הניירת הואמרה בהצלחה! טוען...
            </div>
          )}

          {streamError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
              <AlertCircle className="w-4 h-4 inline ml-2" />
              {streamError}
              <button onClick={handleLaunch} className="text-indigo-400 hover:text-indigo-300 mr-3 text-xs">
                נסה שוב
              </button>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          REVIEW MODE
          ════════════════════════════════════════════════════════ */}
      {isReview && !isResearching && brief.assembledBrief && (
        <div className="space-y-5">
          {/* Action bar (only for 'review' status) */}
          {brief.status === 'review' && (
            <div className="flex items-center gap-3 p-5 rounded-xl border border-amber-500/40 bg-amber-500/8">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
              <span className="text-base text-amber-200 flex-1 font-medium">הניירת מוכנה לסקירה. עיין בתוכן ואשר / ערוך / דחה.</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setRefineNotes(brief.contextNotes ?? ''); setRefineModal(true); }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-cyan-500/50 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 text-sm font-medium transition-colors"
                  title="הוסף הוראות וחזור לחקור מחדש"
                >
                  🔁 חדד וחקור שוב
                </button>
                <button
                  onClick={() => { setEditingBrief(true); setEditedContent(brief.assembledBrief ?? ''); }}
                  className="admin-btn-secondary flex items-center gap-2"
                >
                  <Edit3 className="w-4 h-4" /> ערוך
                </button>
                <button
                  onClick={() => setRejectModal(true)}
                  className="admin-btn-danger flex items-center gap-2"
                >
                  <ThumbsDown className="w-4 h-4" /> דחה
                </button>
                <button
                  onClick={handleApprove}
                  disabled={actionLoading === 'approve'}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold transition-colors"
                >
                  {actionLoading === 'approve' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsUp className="w-4 h-4" />}
                  אשר ניירת
                </button>
              </div>
            </div>
          )}

          {brief.status === 'approved' && (
            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/40 text-green-300 flex items-center gap-4">
              <CheckCircle className="w-5 h-5 shrink-0" />
              <span className="text-base font-medium flex-1">הניירת אושרה ב-{brief.approvedAt ? new Date(brief.approvedAt).toLocaleDateString('he-IL') : '—'}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/admin/dev/kanban')}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-600/30 border border-purple-500/40 text-purple-300 text-sm hover:bg-purple-600/50 transition-colors"
                >
                  <ArrowRight className="w-4 h-4 rotate-180" /> Kanban
                </button>
                <button
                  onClick={() => navigate('/admin/sprints')}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-sm hover:bg-indigo-600/50 transition-colors"
                >
                  <ArrowRight className="w-4 h-4 rotate-180" /> Sprints
                </button>
              </div>
            </div>
          )}

          {/* ── Step 4: Task Extraction → Multi-Sprint (approved only) ── */}
          {brief.status === 'approved' && (
            <div className="admin-card space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-purple-600 text-white text-sm flex items-center justify-center font-bold">4</span>
                  חלץ משימות וצור Sprints
                </h2>
                <div className="flex items-center gap-2">
                  {extractedTasks && extractedTasks.length > 0 && Object.keys(createdSprints).length === 0 && (
                    <button
                      onClick={handleCreateAllSprints}
                      disabled={creatingSprintIdx !== null}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 text-xs transition-colors disabled:opacity-50"
                    >
                      <Zap className="w-3.5 h-3.5" /> צור את כל הספרינטים
                    </button>
                  )}
                  <button
                    onClick={handleExtractTasks}
                    disabled={extracting}
                    className="admin-btn-primary flex items-center gap-2"
                  >
                    {extracting
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> מחלץ... (1-3 דק׳)</>
                      : <><Sparkles className="w-4 h-4" /> {extractedTasks && extractedTasks.length > 0 ? 'חלץ מחדש' : 'חלץ משימות'}</>
                    }
                  </button>
                </div>
              </div>

              {/* Phase selector — shared across all sprints (hidden when no phases defined) */}
              {extractedTasks && extractedTasks.length > 0 && phases.length > 0 && (
                <div className="flex items-center gap-3">
                  <label className="text-xs text-slate-400 shrink-0">Phase לכל הספרינטים (אופציונלי):</label>
                  <select
                    value={selectedPhaseId ?? ''}
                    onChange={(e) => setSelectedPhaseId(e.target.value || null)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-600 text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">ללא Phase</option>
                    {phases.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}

              {/* Extraction error */}
              {extractionError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2">
                  <span className="text-red-400 text-lg leading-none shrink-0">⚠️</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-red-300 mb-0.5">שגיאה בחילוץ משימות</p>
                    <p className="text-xs text-red-400">{extractionError}</p>
                  </div>
                  <button onClick={() => setExtractionError(null)} className="text-red-500 hover:text-red-300 text-xs shrink-0">✕</button>
                </div>
              )}

              {/* Empty state */}
              {(!extractedTasks || extractedTasks.length === 0) && !extracting && !extractionError && (
                <p className="text-sm admin-muted">לחץ "חלץ משימות" כדי לנתח את הניירת ולהפיק משימות לפיתוח.</p>
              )}

              {/* Tasks-per-sprint control */}
              {extractedTasks && extractedTasks.length > 0 && (
                <div className="flex items-center gap-3 flex-wrap">
                  <label className="text-xs text-slate-400 shrink-0">משימות לספרינט:</label>
                  <input
                    type="number"
                    min={3}
                    max={30}
                    value={tasksPerSprint}
                    onChange={(e) => setTasksPerSprint(Math.max(3, Math.min(30, Number(e.target.value) || DEFAULT_TASKS_PER_SPRINT)))}
                    className="w-16 px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-200 text-sm text-center focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-xs text-slate-500">
                    → {dynamicSprintGroups.length} ספרינטים מתוך {extractedTasks.length} משימות
                  </span>
                </div>
              )}

              {/* Dynamic sprint cards */}
              {extractedTasks && extractedTasks.length > 0 && dynamicSprintGroups.map(({ tasks: groupTasks, idx }) => {
                const acceptedCount = groupTasks.filter((t) => taskAccepted[t.id] !== false).length;
                const config = sprintConfigs[idx] ?? { name: `Sprint ${idx + 1}`, goal: '' };
                const created = createdSprints[idx];
                const isCreating = creatingSprintIdx === idx;

                // Determine dominant priority for badge color
                const hasPriority = (p: string) => groupTasks.some((t) => t.priority === p);
                const badgeClass = hasPriority('urgent') ? 'bg-red-500/20 text-red-400' :
                  hasPriority('high') ? 'bg-orange-500/20 text-orange-400' :
                  hasPriority('medium') ? 'bg-amber-500/20 text-amber-400' :
                  'bg-slate-500/20 text-slate-400';

                return (
                  <div key={idx} className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 overflow-hidden">
                    {/* Header */}
                    <div className="px-4 py-2.5 flex items-center gap-2 bg-slate-800/50 border-b border-slate-700/50">
                      <span className="text-sm font-semibold text-slate-100">ספרינט {idx + 1}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${badgeClass}`}>{groupTasks.length} משימות</span>
                      {acceptedCount < groupTasks.length && (
                        <span className="text-xs text-slate-400">{acceptedCount} נבחרו</span>
                      )}
                      {created && <CheckCircle className="w-4 h-4 text-green-400 mr-auto" />}
                    </div>

                    {/* Task list */}
                    <div className="divide-y divide-slate-700/30 max-h-56 overflow-y-auto">
                      {groupTasks.map((task, taskIdx) => {
                        const isAccepted = taskAccepted[task.id] !== false;
                        const globalIdx = idx * tasksPerSprint + taskIdx + 1;
                        return (
                          <div
                            key={task.id}
                            onClick={() => !created && handleToggleTask(task.id)}
                            className={`flex items-start gap-3 px-4 py-2.5 transition-colors ${!created ? 'cursor-pointer' : ''} ${isAccepted ? 'hover:bg-slate-800/30' : 'opacity-40 hover:opacity-60'}`}
                          >
                            <span className="mt-0.5 shrink-0 w-6 text-center text-[10px] text-slate-500 font-mono">#{globalIdx}</span>
                            <div className="mt-0.5 shrink-0">
                              {isAccepted
                                ? <ToggleRight className="w-4 h-4 text-indigo-400" />
                                : <ToggleLeft className="w-4 h-4 text-slate-500" />
                              }
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-slate-200 leading-snug">{task.title}</p>
                              {task.description && <p className="text-xs admin-muted mt-0.5 line-clamp-1">{task.description}</p>}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 text-xs">
                              {task.estimateHours && <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">{task.estimateHours}h</span>}
                              <span className={`px-1.5 py-0.5 rounded ${
                                task.priority === 'urgent' ? 'bg-red-500/20 text-red-400' :
                                task.priority === 'high'   ? 'bg-orange-500/20 text-orange-400' :
                                task.priority === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                                'bg-slate-600/20 text-slate-400'
                              }`}>{task.priority}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Sprint config + create */}
                    {created ? (
                      <div className="px-4 py-3 bg-green-500/10 border-t border-green-500/20 flex items-center gap-3">
                        <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                        <span className="text-sm text-green-300">Sprint נוצר בהצלחה — {created.taskCount} משימות</span>
                      </div>
                    ) : (
                      <div className="px-4 py-3 bg-slate-800/40 border-t border-slate-700/40 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            value={config.name}
                            onChange={(e) => setSprintConfigs((prev) => ({ ...prev, [idx]: { ...prev[idx], name: e.target.value } }))}
                            placeholder={`שם Sprint ${idx + 1}`}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-600 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                            dir="rtl"
                          />
                          <input
                            value={config.goal}
                            onChange={(e) => setSprintConfigs((prev) => ({ ...prev, [idx]: { ...prev[idx], goal: e.target.value } }))}
                            placeholder="מטרת Sprint (אופציונלי)"
                            className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-600 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                            dir="rtl"
                          />
                        </div>
                        <button
                          onClick={() => handleCreateSprintGroup(idx)}
                          disabled={isCreating || acceptedCount === 0}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-300 text-sm transition-colors disabled:opacity-50"
                        >
                          {isCreating
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> יוצר Sprint...</>
                            : <><Zap className="w-4 h-4" /> צור Sprint ({acceptedCount} משימות)</>
                          }
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Navigation after creation */}
              {Object.keys(createdSprints).length > 0 && (
                <div className="flex items-center gap-3 pt-2">
                  <button onClick={() => navigate('/admin/sprints')} className="admin-btn-secondary flex items-center gap-2 text-sm">
                    <Zap className="w-4 h-4" /> פתח Sprints
                  </button>
                  <button onClick={() => navigate('/admin/dev/kanban')} className="admin-btn-secondary flex items-center gap-2 text-sm">
                    <ListChecks className="w-4 h-4" /> פתח Kanban
                  </button>
                </div>
              )}
            </div>
          )}

          {brief.status === 'rejected' && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/40 text-red-300 flex items-start gap-3">
              <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span className="text-base">הניירת נדחתה{brief.reviewNotes ? `: ${brief.reviewNotes}` : ''}</span>
            </div>
          )}

          {/* Download bar */}
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={handleCopy} className="admin-btn-secondary flex items-center gap-2 text-sm">
              <Copy className="w-4 h-4" /> {copied ? 'הועתק!' : 'העתק ל-Cursor'}
            </button>
            <button
              onClick={() => downloadAsPdf(brief.assembledBrief!, { title: brief.title, model: brief.selectedModels.join(', '), tokens: brief.totalTokensUsed, cost: Number(brief.totalCostUsd), date: new Date().toLocaleString('he-IL') })}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-700/60 hover:bg-red-600/60 text-red-200 text-sm transition-colors"
            >
              <Printer className="w-4 h-4" /> PDF
            </button>
            <button
              onClick={() => downloadAsWord(brief.assembledBrief!, { title: brief.title, model: brief.selectedModels.join(', '), tokens: brief.totalTokensUsed, cost: Number(brief.totalCostUsd), date: new Date().toLocaleString('he-IL') })}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-700/60 hover:bg-blue-600/60 text-blue-200 text-sm transition-colors"
            >
              <FileDown className="w-4 h-4" /> Word
            </button>
            <div className="text-sm admin-muted mr-auto font-mono">
              {brief.totalTokensUsed.toLocaleString()} tokens | ${Number(brief.totalCostUsd).toFixed(4)}
            </div>
          </div>

          {/* Brief content — tabbed view */}
          {editingBrief ? (
            <div className="admin-card overflow-hidden p-0">
              <textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="w-full h-[60vh] p-5 bg-slate-900 text-slate-200 text-sm font-mono resize-none focus:outline-none"
                dir="rtl"
              />
              <div className="flex gap-3 p-4 bg-slate-800 border-t border-slate-600">
                <button onClick={() => setEditingBrief(false)} className="admin-btn-secondary">ביטול</button>
                <button onClick={handleSaveEdit} disabled={savingEdit} className="admin-btn-primary">
                  {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  שמור שינויים
                </button>
              </div>
            </div>
          ) : (
            <div className="admin-card overflow-hidden">
              {/* Model roles legend */}
              <div className="flex flex-wrap gap-3 mb-4 pb-4 border-b border-slate-700">
                <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-violet-400 inline-block" />
                  Claude / Gemini — ניתוח וסינתזה
                </span>
                <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
                  Perplexity Sonar — חיפוש רשת (רקע בלבד)
                </span>
                <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                  Claude Haiku — כותרת חכמה
                </span>
              </div>

              {/* Tab bar */}
              <div className="flex gap-1 flex-wrap mb-5 overflow-x-auto pb-1">
                <button
                  onClick={() => setActiveTab('summary')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${activeTab === 'summary' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                >
                  📋 סיכום
                </button>
                {departments.map((d) => {
                  const dept = ALL_DEPARTMENTS.find((x) => x.id === d.department);
                  const isActive = activeTab === d.department;
                  const hasError = !!d.errorMessage;
                  const modelColor = d.modelUsed?.includes('gemini') ? 'text-emerald-400' : d.modelUsed?.includes('sonar') ? 'text-cyan-400' : 'text-violet-400';
                  return (
                    <button
                      key={d.id}
                      onClick={() => setActiveTab(d.department)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${isActive ? 'bg-indigo-600 text-white' : hasError ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                    >
                      <span>{dept?.emoji ?? '📌'}</span>
                      <span>{dept?.hebrewName?.split(' ')[0] ?? d.department}</span>
                      {!hasError && d.modelUsed && (
                        <span className={`text-[10px] ${isActive ? 'text-indigo-200' : modelColor} font-mono`}>
                          {d.modelUsed.replace('claude-', '').replace('-20251001', '').replace('claude-', '').slice(0, 14)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Tab content */}
              {activeTab === 'summary' && (
                <div>
                  {/* Meta stats */}
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <div className="p-3 rounded-lg bg-slate-800 border border-slate-700">
                      <p className="text-xs text-slate-400 mb-1">מחלקות שחקרו</p>
                      <p className="text-lg font-bold text-slate-100">{departments.filter(d => !d.errorMessage).length}/{departments.length}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-800 border border-slate-700">
                      <p className="text-xs text-slate-400 mb-1">עלות כוללת</p>
                      <p className="text-lg font-bold text-slate-100">${Number(brief.totalCostUsd).toFixed(4)}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-800 border border-slate-700">
                      <p className="text-xs text-slate-400 mb-1">Tokens בשימוש</p>
                      <p className="text-lg font-bold text-slate-100">{brief.totalTokensUsed.toLocaleString()}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-800 border border-slate-700">
                      <p className="text-xs text-slate-400 mb-1">פלטפורמות יעד</p>
                      <p className="text-sm font-semibold text-slate-100">{brief.targetPlatforms?.length > 0 ? brief.targetPlatforms.join(', ') : 'לא הוגדרו'}</p>
                    </div>
                  </div>
                  {/* Department summary list */}
                  <div className="space-y-2">
                    {departments.map((d) => {
                      const dept = ALL_DEPARTMENTS.find((x) => x.id === d.department);
                      return (
                        <button
                          key={d.id}
                          onClick={() => setActiveTab(d.department)}
                          className="w-full flex items-center gap-3 p-3 rounded-lg bg-slate-800/60 border border-slate-700 hover:border-indigo-500/50 hover:bg-slate-800 transition-all text-right"
                        >
                          <span className="text-xl shrink-0">{dept?.emoji ?? '📌'}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-100">{dept?.hebrewName ?? d.department}</p>
                            {d.errorMessage ? (
                              <p className="text-xs text-red-400 truncate">{d.errorMessage}</p>
                            ) : (
                              <p className="text-xs text-slate-400 truncate">{d.output?.slice(0, 120)?.replace(/#+\s/g, '') ?? ''}</p>
                            )}
                          </div>
                          <div className="shrink-0 text-left">
                            <p className="text-xs font-mono text-violet-400">{d.modelUsed?.replace('claude-', '').replace('-20251001', '').slice(0, 16)}</p>
                            <p className="text-xs text-slate-500 font-mono">{d.tokensUsed?.toLocaleString()} tok</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeTab !== 'summary' && (() => {
                const deptRecord = departments.find((d) => d.department === activeTab);
                const deptMeta = ALL_DEPARTMENTS.find((x) => x.id === activeTab);
                if (!deptRecord) return <p className="text-slate-400 text-sm">מחלקה לא נמצאה</p>;
                return (
                  <div>
                    {/* Dept header */}
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-700">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{deptMeta?.emoji ?? '📌'}</span>
                        <div>
                          <h3 className="text-base font-semibold text-slate-100">{deptMeta?.hebrewName ?? activeTab}</h3>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs font-mono text-violet-400 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 inline-block" />
                              {deptRecord.modelUsed}
                            </span>
                            <span className="text-xs text-slate-500 font-mono">{deptRecord.tokensUsed?.toLocaleString()} tokens</span>
                            <span className="text-xs text-slate-500 font-mono">${Number(deptRecord.costUsd ?? 0).toFixed(4)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Fallback warning: selected Claude but ran on other model */}
                    {brief.selectedModels.includes('claude') &&
                      deptRecord.modelUsed &&
                      !deptRecord.modelUsed.startsWith('claude') && (
                      <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                        <span>⚠️</span>
                        <span>Claude נבחר אך לא הצליח לרוץ — רץ במקומו על <strong>{deptRecord.modelUsed}</strong>.
                          {deptRecord.errorMessage?.includes('credit balance')
                            ? ' סיבה: אין קרדיט בחשבון Anthropic — יש להוסיף קרדיט ב-console.anthropic.com'
                            : deptRecord.errorMessage?.includes('rate')
                              ? ' סיבה: חריגת rate limit — נסה שוב בעוד דקה'
                              : deptRecord.errorMessage
                                ? ` סיבה: ${deptRecord.errorMessage.slice(0, 120)}`
                                : ' בדוק שגיאות בלוג השרת (ANTHROPIC_API_KEY, credits, rate-limit).'}
                        </span>
                      </div>
                    )}
                    {deptRecord.errorMessage ? (
                      <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
                        <AlertCircle className="w-4 h-4 inline ml-2" />
                        {deptRecord.errorMessage}
                      </div>
                    ) : (
                      <MarkdownRenderer content={deptRecord.output ?? ''} />
                    )}
                    {deptRecord.promptSnapshot && (
                      <details className="mt-4 border border-slate-700 rounded-lg">
                        <summary className="px-4 py-2 text-xs text-slate-400 cursor-pointer hover:text-slate-300 select-none">
                          💭 מה נשאל ה-Agent (הצג/הסתר)
                        </summary>
                        <pre className="p-4 text-xs text-slate-400 font-mono whitespace-pre-wrap overflow-auto max-h-80 bg-slate-900/50">
                          {deptRecord.promptSnapshot}
                        </pre>
                      </details>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Web sources — rich grouped display */}
          {webSources.length > 0 && (() => {
            const byType: Record<string, WebSource[]> = {};
            for (const s of webSources) (byType[s.sourceType] ??= []).push(s);
            const github = byType.github ?? [];
            const reddit = byType.reddit ?? [];
            const articles = [...(byType.rss ?? []), ...(byType.perplexity ?? [])];
            return (
              <div className="admin-card space-y-5">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-blue-400" />
                  <span className="text-base font-semibold text-slate-100">מקורות מהרשת ({webSources.length})</span>
                </div>

                {/* GitHub Repos */}
                {github.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <span>🐙</span> GitHub Repos
                    </h4>
                    <div className="space-y-2">
                      {github.map((s) => (
                        <div key={s.id} className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/60 border border-slate-700/50 hover:border-slate-600 transition-colors">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {s.url ? (
                                <a href={s.url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-indigo-300 hover:text-indigo-200 truncate">
                                  {s.title ?? s.url}
                                </a>
                              ) : (
                                <span className="text-sm font-semibold text-slate-200">{s.title}</span>
                              )}
                              {(s.rawPayload as any)?.language && (
                                <span className="px-1.5 py-0.5 rounded text-xs bg-slate-700 text-slate-300 font-mono">{(s.rawPayload as any).language}</span>
                              )}
                            </div>
                            {s.snippet && <p className="text-xs admin-muted mt-1 line-clamp-2">{s.snippet}</p>}
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {s.githubStars != null && (
                              <span className="flex items-center gap-1 text-xs text-amber-400 font-mono font-semibold">
                                <Star className="w-3 h-3" />{s.githubStars.toLocaleString()}
                              </span>
                            )}
                            {s.contributorCount != null && (
                              <span className="flex items-center gap-1 text-xs admin-muted">
                                <GitFork className="w-3 h-3" />{s.contributorCount}
                              </span>
                            )}
                            <TrustBadge score={s.trustScore} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reddit Threads */}
                {reddit.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <span>🤖</span> Reddit — דיונים קהילתיים
                    </h4>
                    <div className="space-y-2">
                      {reddit.map((s) => (
                        <div key={s.id} className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/60 border border-slate-700/50 hover:border-slate-600 transition-colors">
                          <div className="flex-1 min-w-0">
                            {s.url ? (
                              <a href={s.url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-orange-300 hover:text-orange-200 line-clamp-2 block">
                                {s.title ?? s.url}
                              </a>
                            ) : (
                              <span className="text-sm font-semibold text-slate-200">{s.title}</span>
                            )}
                            {s.snippet && <p className="text-xs admin-muted mt-1 line-clamp-2">{s.snippet}</p>}
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {s.redditScore != null && (
                              <span className="flex items-center gap-1 text-xs text-orange-400 font-mono font-semibold">
                                <MessageSquare className="w-3 h-3" />🔺 {s.redditScore.toLocaleString()}
                              </span>
                            )}
                            {(s.rawPayload as any)?.upvote_ratio != null && (
                              <span className="text-xs admin-muted">{Math.round((s.rawPayload as any).upvote_ratio * 100)}% upvote</span>
                            )}
                            <TrustBadge score={s.trustScore} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Articles & Blogs */}
                {articles.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Rss className="w-3.5 h-3.5" /> מאמרים, בלוגים ו-YouTube ({articles.length})
                    </h4>
                    <div className="space-y-2">
                      {articles.map((s) => {
                        const cat = String((s.rawPayload as any)?.category ?? 'tech');
                        const catIcon = RSS_CATEGORY_ICONS[cat] ?? '📄';
                        const isYouTube = cat === 'youtube';
                        return (
                        <div key={s.id} className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/60 border border-slate-700/50 hover:border-slate-600 transition-colors">
                          <span className="text-lg mt-0.5">{s.sourceType === 'perplexity' ? '🌐' : catIcon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                              {s.url ? (
                                <a href={s.url} target="_blank" rel="noreferrer" className={`text-sm font-semibold line-clamp-2 block ${isYouTube ? 'text-red-300 hover:text-red-200' : 'text-blue-300 hover:text-blue-200'}`}>
                                  {s.title ?? s.url}
                                </a>
                              ) : (
                                <span className="text-sm font-semibold text-slate-200">{s.title}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {(s.rawPayload as any)?.site && (
                                <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${isYouTube ? 'bg-red-500/20 text-red-300' : 'bg-slate-700 text-slate-300'}`}>{(s.rawPayload as any).site}</span>
                              )}
                              {cat !== 'tech' && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">{cat}</span>
                              )}
                              {(s.rawPayload as any)?.author && (
                                <span className="text-xs text-emerald-400 font-medium">by {(s.rawPayload as any).author}</span>
                              )}
                            </div>
                            {s.snippet && <p className="text-xs admin-muted mt-1 line-clamp-2">{s.snippet.slice(0, 200)}</p>}
                          {/* Perplexity citations */}
                          {s.sourceType === 'perplexity' && Array.isArray((s.rawPayload as any)?.citations) && (s.rawPayload as any).citations.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              {((s.rawPayload as any).citations as string[]).map((cite, i) => {
                                let domain = cite;
                                try { domain = new URL(cite).hostname.replace(/^www\./, ''); } catch { /* keep raw */ }
                                return (
                                  <a key={i} href={cite} target="_blank" rel="noreferrer"
                                    className="text-xs px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 hover:text-cyan-100 hover:bg-cyan-500/25 transition-colors font-mono truncate max-w-[180px]"
                                    title={cite}>
                                    [{i + 1}] {domain}
                                  </a>
                                );
                              })}
                            </div>
                          )}
                          </div>
                          <TrustBadge score={s.trustScore} />
                        </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── Document Generation ───────────────────────────────────────── */}
          <div className="admin-card">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-semibold text-slate-100">מסמכי אפיון ופיתוח</h2>
              <span className="text-xs admin-muted">כל מסמך נוצר ע"י AI בהתבסס על ממצאי הניירת</span>
              <button
                onClick={handleDownloadAllDocs}
                disabled={downloadingAllDocs}
                className="mr-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs transition-colors disabled:opacity-60"
              >
                {downloadingAllDocs ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{downloadAllProgress}/8 מסמכים...</span>
                  </>
                ) : (
                  <>
                    <FileDown className="w-3.5 h-3.5" />
                    <span>הורד הכל (ZIP)</span>
                  </>
                )}
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[
                { type: 'prd',       label: 'PRD',       sub: 'Product Requirements',  icon: <FileText className="w-4 h-4" />,  color: 'indigo' },
                { type: 'erd',       label: 'ERD',       sub: 'Database Schema',        icon: <Database className="w-4 h-4" />, color: 'blue' },
                { type: 'blueprint', label: 'Blueprint', sub: 'System Architecture',    icon: <Layers className="w-4 h-4" />,   color: 'purple' },
                { type: 'cicd',      label: 'CI/CD',     sub: 'Pipeline Spec',          icon: <GitBranch className="w-4 h-4" />,color: 'amber' },
                { type: 'design',    label: 'Design',    sub: 'UX/UI Specification',    icon: <Palette className="w-4 h-4" />,  color: 'pink' },
                { type: 'security',  label: 'Security',  sub: 'Assessment Report',      icon: <Shield className="w-4 h-4" />,   color: 'red' },
                { type: 'marketing', label: 'Marketing', sub: 'GTM Strategy',           icon: <Megaphone className="w-4 h-4" />,color: 'orange' },
                { type: 'legal',     label: 'Legal',     sub: 'Compliance Summary',     icon: <Scale className="w-4 h-4" />,    color: 'slate' },
              ].map((doc) => {
                const generated = generatedDocs[doc.type];
                const isGenerating = generatingDoc === doc.type;
                const colorMap: Record<string, string> = {
                  indigo: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20',
                  blue:   'border-blue-500/40 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20',
                  purple: 'border-purple-500/40 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20',
                  amber:  'border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20',
                  pink:   'border-pink-500/40 bg-pink-500/10 text-pink-300 hover:bg-pink-500/20',
                  red:    'border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20',
                  orange: 'border-orange-500/40 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20',
                  slate:  'border-slate-500/40 bg-slate-700/40 text-slate-300 hover:bg-slate-700/60',
                };
                return (
                  <button
                    key={doc.type}
                    onClick={() => generated ? setExpandedDoc(expandedDoc === doc.type ? null : doc.type) : handleGenerateDoc(doc.type)}
                    disabled={isGenerating || (generatingDoc !== null && !generated)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all ${colorMap[doc.color]} ${generated ? 'ring-1 ring-green-500/30' : ''} disabled:opacity-50`}
                  >
                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : doc.icon}
                    <span className="text-xs font-semibold">{doc.label}</span>
                    <span className="text-xs opacity-70 leading-tight">{doc.sub}</span>
                    {generated && <span className="text-xs text-green-400 font-mono">✓ מוכן</span>}
                    {isGenerating && <span className="text-xs opacity-70">יוצר...</span>}
                  </button>
                );
              })}
            </div>

            {/* Expanded doc content */}
            {expandedDoc && generatedDocs[expandedDoc] && (
              <div className="border border-slate-700/50 rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 bg-slate-800/60 border-b border-slate-700/50">
                  <span className="text-sm font-semibold text-slate-100">{generatedDocs[expandedDoc].title}</span>
                  <span className="text-xs admin-muted font-mono mr-auto">{generatedDocs[expandedDoc].tokensUsed.toLocaleString()} tokens · ${generatedDocs[expandedDoc].costUsd.toFixed(4)}</span>
                  <button
                    onClick={() => {
                      const doc = generatedDocs[expandedDoc];
                      const blob = new Blob([doc.content], { type: 'text/markdown' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url; a.download = `${doc.docType}-${brief.title.slice(0, 30)}.md`; a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs transition-colors"
                  >
                    <FileDown className="w-3.5 h-3.5" /> הורד MD
                  </button>
                  <button onClick={() => setExpandedDoc(null)} className="p-1.5 rounded hover:bg-slate-700 text-slate-500 hover:text-slate-300">
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-5 max-h-[60vh] overflow-y-auto">
                  <MarkdownRenderer content={generatedDocs[expandedDoc].content} />
                </div>
              </div>
            )}
          </div>

          {/* Department accordion */}
          {departments.length > 0 && (
            <div className="admin-table-card">
              <div className="px-5 py-4 border-b border-slate-700 flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-400" />
                <span className="text-base font-semibold text-slate-100">שיחות ומחקר מחלקות ({departments.length})</span>
                <span className="text-xs admin-muted mr-auto">לחץ על מחלקה לצפייה בשיחה המלאה</span>
              </div>
              {departments.map((dept) => {
                const deptInfo = ALL_DEPARTMENTS.find((d) => d.id === dept.department);
                const deptConfig = deptConfigs[dept.department];
                const isExpanded = expandedDept === dept.id;
                return (
                  <div key={dept.id} className="border-t border-slate-700/50 first:border-0">
                    <button
                      onClick={() => setExpandedDept(isExpanded ? null : dept.id)}
                      className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-800/40 transition-colors text-right"
                    >
                      <span className="text-xl">{deptInfo?.emoji ?? '🔹'}</span>
                      <div className="flex-1 text-right">
                        <p className="text-base font-semibold text-slate-100">{deptInfo?.hebrewName ?? dept.department}</p>
                        {deptConfig?.outputSections && (
                          <p className="text-xs admin-muted mt-0.5">{deptConfig.outputSections.join(' · ')}</p>
                        )}
                      </div>
                      {dept.status === 'error' && <XCircle className="w-5 h-5 text-red-400" />}
                      {dept.status === 'done' && <CheckCircle className="w-5 h-5 text-green-400" />}
                      <span className="text-xs admin-muted font-mono">{dept.tokensUsed.toLocaleString()} tokens · ${Number(dept.costUsd).toFixed(4)}</span>
                      {isExpanded ? <ChevronUp className="w-5 h-5 admin-muted" /> : <ChevronDown className="w-5 h-5 admin-muted" />}
                    </button>
                    {isExpanded && (
                      <div className="border-t border-slate-700/50 bg-slate-900/30">
                        {/* Tab bar: System Prompt | Output */}
                        <div className="flex gap-0 border-b border-slate-700/50">
                          <button
                            onClick={(e) => { e.stopPropagation(); setShowSystemPrompt(showSystemPrompt === dept.id ? null : dept.id); }}
                            className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 ${showSystemPrompt === dept.id ? 'border-purple-500 text-purple-300 bg-purple-500/5' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                          >
                            🤖 System Prompt (הנחיות לסוכן)
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setShowSystemPrompt(null); }}
                            className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 ${showSystemPrompt !== dept.id ? 'border-indigo-500 text-indigo-300 bg-indigo-500/5' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                          >
                            📄 תוצאת המחקר
                          </button>
                        </div>

                        {/* System Prompt view */}
                        {showSystemPrompt === dept.id && deptConfig?.systemPrompt ? (
                          <div className="p-5">
                            <div className="mb-3 flex items-center gap-2">
                              <span className="text-xs px-2 py-1 rounded bg-purple-500/20 text-purple-300 font-mono">SYSTEM</span>
                              <span className="text-xs admin-muted">ההנחיות שקיבל הסוכן — מגדירות את תפקידו, פורמט הפלט, ומיקוד המחקר</span>
                            </div>
                            <pre className="text-sm text-slate-300 bg-slate-900/60 rounded-xl p-4 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed border border-slate-700/50" dir="rtl">
                              {deptConfig.systemPrompt}
                            </pre>
                            <p className="text-xs admin-muted mt-3">מודל: <span className="font-mono text-slate-300">{dept.modelUsed}</span></p>
                          </div>
                        ) : (
                          /* Output view */
                          <div className="px-5 pb-5 pt-4">
                            {dept.output ? (
                              <>
                                <MarkdownRenderer content={dept.output} />
                                <p className="text-sm admin-muted mt-3 font-mono">מודל: {dept.modelUsed} | tokens: {dept.tokensUsed.toLocaleString()} | ${Number(dept.costUsd).toFixed(4)}</p>
                              </>
                            ) : dept.status === 'error' ? (
                              <p className="text-sm text-red-400">{dept.errorMessage ?? 'שגיאה לא ידועה'}</p>
                            ) : (
                              <p className="text-sm admin-muted">לא הופקה תוצאה</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Refine Modal */}
      {refineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg mx-4 rounded-2xl border border-cyan-500/40 bg-slate-900 p-6">
            <h3 className="text-lg font-bold text-slate-100 mb-1">🔁 חדד וחקור מחדש</h3>
            <p className="text-sm admin-muted mb-4">הניירת תאופס לטיוטה. ההוראות שתוסיף יוזרקו לכל ה-agents בחקירה הבאה.</p>
            <label className="block text-sm font-medium text-slate-300 mb-2">הוראות / הבהרות לחקירה הבאה</label>
            <textarea
              value={refineNotes}
              onChange={(e) => setRefineNotes(e.target.value)}
              rows={5}
              placeholder={`לדוגמה:\n- הפרויקט הוא פלטפורמת בריאות דיגיטלית — לא קשור ל-memoraid.com\n- התמקד בפתרונות לטיפול בקשישים בבית\n- אל תחפש כלים לאימון זיכרון`}
              className="w-full px-3 py-2.5 rounded-lg bg-slate-950 border border-slate-600 text-slate-200 text-sm resize-none focus:outline-none focus:border-cyan-500 placeholder:text-slate-600 leading-relaxed"
              dir="rtl"
              autoFocus
            />
            <div className="flex gap-3 justify-end mt-5">
              <button onClick={() => setRefineModal(false)} className="admin-btn-secondary">ביטול</button>
              <button
                onClick={handleRefine}
                disabled={refining}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold transition-colors"
              >
                {refining ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>🔁</span>}
                חדד וחזור לטיוטה
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md mx-4 rounded-2xl border border-slate-600 bg-slate-900 p-6">
            <h3 className="text-lg font-bold text-slate-100 mb-4">דחיית ניירת</h3>
            <label className="block text-sm admin-muted mb-2 font-medium">נימוק (אופציונלי)</label>
            <textarea
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              rows={4}
              className="admin-input text-sm resize-none"
              dir="rtl"
            />
            <div className="flex gap-3 justify-end mt-5">
              <button onClick={() => setRejectModal(false)} className="admin-btn-secondary">ביטול</button>
              <button
                onClick={handleReject}
                disabled={actionLoading === 'reject'}
                className="admin-btn-danger flex items-center gap-2"
              >
                {actionLoading === 'reject' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                דחה ניירת
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
