import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch, apiUploadAdminFile } from '../../lib/api';
import {
  Brain,
  Copy,
  Loader2,
  Archive,
  Lightbulb,
  Search,
  MessageCircle,
  Upload,
  X,
  FileText,
  Image,
  Star,
  Sparkles,
  ChevronDown,
  FileDown,
  Printer,
} from 'lucide-react';
import MarkdownRenderer from '../components/MarkdownRenderer';
import { downloadAsPdf, downloadAsWord } from '../utils/documentDownload';

type ProcessSpeed = 'very_slow' | 'slow' | 'medium' | 'fast' | 'very_fast';

type RatingData = {
  outputQuality: number | null;
  devQuality: number | null;
  processSpeed: ProcessSpeed | null;
};

type AnalysisResult = {
  id?: string;
  report: string;
  model: string;
  tokensUsed: number;
  costUsd: number;
  outputQuality?: number | null;
  devQuality?: number | null;
  processSpeed?: ProcessSpeed | null;
  ratedAt?: string | null;
};

type AIModelInfo = { id: string; label: string; desc: string; available: boolean };

type ArchiveItem = {
  id: string;
  type: string;
  query: string | null;
  report: string;
  depth: string | null;
  scope: string | null;
  model: string | null;
  tokensUsed: number | null;
  costUsd: string | null;
  adminUserEmail: string | null;
  adminUserFullName: string | null;
  attachedFileIds?: string[] | null;
  createdAt: string;
  outputQuality?: number | null;
  devQuality?: number | null;
  processSpeed?: ProcessSpeed | null;
  ratedAt?: string | null;
};

type AttachedFile = {
  mediaId: string;
  url: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  type: string;
};

const DEPTH_OPTIONS = [
  { value: 'quick', label: 'מהיר', longDesc: 'סורק רק את הדברים הבסיסיים: package.json, מבנה תיקיות, סכמת DB. הכי מהיר.' },
  { value: 'deep',  label: 'מעמיק', longDesc: 'מוסיף: קונפיגורציות (Vite, Tailwind), נתיבי API, קומפוננטות React ראשיות. מומלץ.' },
  { value: 'full',  label: 'מלא', longDesc: 'הכי מקיף: קורא גם קבצי ליבה (index, multiProviderAI, אינטגרציות). כש"מעמיק" לא מספיק.' },
] as const;

const SCOPE_OPTIONS = [
  { value: 'all',    label: 'כל הפרויקט', desc: 'מנתח את כל הקוד – client ו-server' },
  { value: 'client', label: 'Client בלבד', desc: 'רק החלק של הממשק (React, דפים, קומפוננטות)' },
  { value: 'server', label: 'Server בלבד', desc: 'רק השרת (API, מסד נתונים, לוגיקה)' },
] as const;

const PROCESS_SPEED_OPTIONS: { value: ProcessSpeed; label: string }[] = [
  { value: 'very_slow', label: 'איטי מאוד' },
  { value: 'slow',      label: 'איטי' },
  { value: 'medium',    label: 'בינוני' },
  { value: 'fast',      label: 'מהיר' },
  { value: 'very_fast', label: 'מהיר מאוד' },
];

const TYPE_LABELS: Record<string, string> = {
  project_analysis: 'ניתוח פרויקט',
  feature_planning: "תכנון פיצ'ר",
  ask_question:     'שאלה ל-AI',
  synthesis:        'סינתזה',
};

// ── Helper: build doc title ────────────────────────────────────────────────
function buildDocTitle(type: string, query?: string | null): string {
  const base = TYPE_LABELS[type] ?? type;
  if (query) return `${base} – ${query.slice(0, 60)}`;
  return `${base} – MemorAId`;
}

// ── Helper: extract short display title ───────────────────────────────────
// Priority: 1) first H1 from report  2) first sentence of query  3) type+date
function extractShortTitle(item: { type: string; query?: string | null; report?: string | null; createdAt: string }): string {
  // 1. Try first # heading from the report
  if (item.report) {
    const h1 = item.report.match(/^#\s+(.+)$/m);
    if (h1?.[1]) {
      const title = h1[1].replace(/[*_`]/g, '').trim();
      if (title.length > 4) return title.slice(0, 72);
    }
  }
  // 2. First sentence/clause of the query (up to first period, newline, or 55 chars)
  if (item.query) {
    const firstLine = item.query.split(/[\n.!?]/)[0].trim();
    if (firstLine.length > 4) return firstLine.slice(0, 65);
  }
  // 3. Fallback
  return `${TYPE_LABELS[item.type] ?? item.type} – ${new Date(item.createdAt).toLocaleDateString('he-IL')}`;
}

// ── Star rating ────────────────────────────────────────────────────────────
function StarRating({ value, onChange, label }: { value: number | null; onChange: (v: number) => void; label: string }) {
  const [hover, setHover] = useState<number | null>(null);
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-slate-400">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(null)}
            className="p-0.5 transition-transform hover:scale-110"
            aria-label={`${star} כוכבים`}
          >
            <Star className={`w-5 h-5 transition-colors ${star <= (hover ?? value ?? 0) ? 'text-amber-400 fill-amber-400' : 'text-slate-500'}`} />
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Compact rating bar (shown at top of result) ────────────────────────────
function RatingBar({
  analysisId,
  initial,
  onSaved,
}: {
  analysisId: string;
  initial: RatingData;
  onSaved?: (data: RatingData) => void;
}) {
  const [outputQuality, setOutputQuality] = useState<number | null>(initial.outputQuality ?? null);
  const [devQuality, setDevQuality]       = useState<number | null>(initial.devQuality ?? null);
  const [processSpeed, setProcessSpeed]   = useState<ProcessSpeed | null>(initial.processSpeed ?? null);
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  useEffect(() => {
    setOutputQuality(initial.outputQuality ?? null);
    setDevQuality(initial.devQuality ?? null);
    setProcessSpeed(initial.processSpeed ?? null);
  }, [analysisId, initial.outputQuality, initial.devQuality, initial.processSpeed]);

  const handleSave = async () => {
    setSaving(true); setSaved(false);
    try {
      await apiFetch<{ ok: boolean }>(`/admin/ai/analyses/${analysisId}/rate`, {
        method: 'PATCH',
        body: JSON.stringify({ outputQuality, devQuality, processSpeed }),
      });
      setSaved(true);
      onSaved?.({ outputQuality, devQuality, processSpeed });
      setTimeout(() => setSaved(false), 3000);
    } catch { /* silent */ }
    finally { setSaving(false); }
  };

  return (
    <div className="flex flex-wrap items-center gap-4 px-4 py-3 bg-slate-800/60 border-b border-slate-700/60 rounded-t-xl">
      <span className="text-xs font-medium text-slate-400 shrink-0">דרג תוצר:</span>
      <StarRating value={outputQuality} onChange={setOutputQuality} label="איכות תוצר" />
      <StarRating value={devQuality}    onChange={setDevQuality}    label="איכות פיתוח" />
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-slate-400">מהירות</span>
        <select
          value={processSpeed ?? ''}
          onChange={(e) => setProcessSpeed((e.target.value || null) as ProcessSpeed | null)}
          className="px-2 py-1 rounded bg-slate-700 border border-slate-600 text-slate-200 text-xs"
        >
          <option value="">—</option>
          {PROCESS_SPEED_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
      <button
        onClick={handleSave}
        disabled={saving}
        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium ml-auto"
      >
        {saving ? 'שומר...' : saved ? '✓ נשמר' : 'שמור דירוג'}
      </button>
    </div>
  );
}

// ── Download buttons bar ───────────────────────────────────────────────────
function DownloadBar({
  report,
  model,
  tokensUsed,
  costUsd,
  title,
  onCopy,
  copied,
}: {
  report: string;
  model: string;
  tokensUsed: number;
  costUsd: number;
  title: string;
  onCopy: () => void;
  copied: boolean;
}) {
  const meta = {
    title,
    model,
    tokens: tokensUsed,
    cost: costUsd,
    date: new Date().toLocaleString('he-IL'),
  };

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-2 bg-slate-800/40 border-b border-slate-700/60">
      <div className="flex items-center gap-3 text-xs text-slate-400 ml-auto">
        <span className="font-mono text-slate-300">{model}</span>
        <span>{tokensUsed.toLocaleString()} tokens</span>
        <span className="text-green-400">${typeof costUsd === 'number' ? costUsd.toFixed(4) : costUsd}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs transition-colors"
        >
          <Copy className="w-3.5 h-3.5" />
          {copied ? 'הועתק!' : 'העתק ל-Cursor'}
        </button>
        <button
          onClick={() => downloadAsPdf(report, meta)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-700/70 hover:bg-red-600/70 text-red-200 text-xs transition-colors"
          title="הורד כ-PDF (חלון הדפסה)"
        >
          <Printer className="w-3.5 h-3.5" />
          PDF
        </button>
        <button
          onClick={() => downloadAsWord(report, meta)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-700/70 hover:bg-blue-600/70 text-blue-200 text-xs transition-colors"
          title="הורד כ-Word (.doc)"
        >
          <FileDown className="w-3.5 h-3.5" />
          Word
        </button>
      </div>
    </div>
  );
}

// ── Single model result card ───────────────────────────────────────────────
function ModelResultCard({
  result,
  label,
  docTitle,
  onCopy,
  copied,
}: {
  result: AnalysisResult;
  label: string;
  docTitle: string;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-slate-700 bg-slate-900/30 overflow-hidden">
      {/* Rating bar at TOP */}
      {result.id && (
        <RatingBar
          key={result.id}
          analysisId={result.id}
          initial={{ outputQuality: result.outputQuality ?? null, devQuality: result.devQuality ?? null, processSpeed: result.processSpeed ?? null }}
        />
      )}
      {/* Title row */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-800/40 border-b border-slate-700/40">
        <Brain className="w-4 h-4 text-indigo-400 shrink-0" />
        <span className="font-semibold text-slate-100 text-sm">{label}</span>
        <span className="text-xs font-mono text-slate-400 bg-slate-700 px-2 py-0.5 rounded truncate max-w-[160px]">{result.model}</span>
      </div>
      {/* Download / copy bar */}
      <DownloadBar
        report={result.report}
        model={result.model}
        tokensUsed={result.tokensUsed}
        costUsd={result.costUsd}
        title={docTitle}
        onCopy={onCopy}
        copied={copied}
      />
      {/* Content */}
      <div className="p-5">
        <MarkdownRenderer content={result.report} />
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
type Tab = 'analyze' | 'feature' | 'ask' | 'archive';

export default function AdminProjectAnalyze() {
  const [tab, setTab]               = useState<Tab>('analyze');
  const [depth, setDepth]           = useState<'quick' | 'deep' | 'full'>('deep');
  const [scope, setScope]           = useState<'all' | 'client' | 'server'>('all');
  const [focus, setFocus]           = useState('');
  const [query, setQuery]           = useState('');
  const [question, setQuestion]     = useState('');
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState<AnalysisResult | null>(null);
  const [results, setResults]       = useState<AnalysisResult[] | null>(null);
  const [error, setError]           = useState<string | null>(null);
  const [copiedIdx, setCopiedIdx]   = useState<number | null>(null);
  const [models, setModels]         = useState<AIModelInfo[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);

  // Synthesis
  const [synthesisModel, setSynthesisModel]           = useState<string>('');
  const [synthLoading, setSynthLoading]               = useState(false);
  const [synthResult, setSynthResult]                 = useState<AnalysisResult | null>(null);
  const [synthError, setSynthError]                   = useState<string | null>(null);
  const [synthCopied, setSynthCopied]                 = useState(false);
  const [showSynthModelPicker, setShowSynthModelPicker] = useState(false);

  // Archive
  const [archive, setArchive]               = useState<ArchiveItem[]>([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveFilter, setArchiveFilter]   = useState<string>('');
  const [archiveSearch, setArchiveSearch]   = useState('');
  const [selectedArchive, setSelectedArchive] = useState<ArchiveItem | null>(null);
  const [archiveCopied, setArchiveCopied]   = useState(false);

  const [creatingTable, setCreatingTable] = useState(false);
  const [successMsg, setSuccessMsg]       = useState<string | null>(null);

  // Attachments
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [uploading, setUploading]     = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'text/csv', 'application/json', 'video/mp4'];

  const handleFileAdd = useCallback(async (files: FileList | null) => {
    if (!files?.length) return;
    setUploadError(null);
    for (const f of Array.from(files).slice(0, 5 - attachments.length)) {
      if (attachments.length >= 5) break;
      if (f.size > 50 * 1024 * 1024) { setUploadError(`קובץ גדול מדי: ${f.name}`); continue; }
      if (!ALLOWED_TYPES.includes(f.type)) { setUploadError(`סוג לא נתמך: ${f.name}`); continue; }
      setUploading(true);
      try {
        const r = await apiUploadAdminFile('/admin/ai/upload-attachment', f);
        setAttachments((prev) => [...prev, r]);
      } catch (err: unknown) {
        setUploadError(err instanceof Error ? err.message : 'העלאה נכשלה');
      } finally { setUploading(false); }
    }
  }, [attachments.length]);

  const removeAttachment = (mediaId: string) => setAttachments((prev) => prev.filter((a) => a.mediaId !== mediaId));

  const FileUploadZone = () => (
    <div className="mt-4">
      <label className="block text-slate-300 text-sm font-medium mb-2">קבצים מצורפים (אופציונלי)</label>
      <div
        onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-indigo-500'); }}
        onDragLeave={(e) => { e.currentTarget.classList.remove('border-indigo-500'); }}
        onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-indigo-500'); handleFileAdd(e.dataTransfer.files); }}
        className="border-2 border-dashed border-slate-600 rounded-lg p-4 text-center hover:border-slate-500 transition-colors"
      >
        <input type="file" multiple accept={ALLOWED_TYPES.join(',')} className="hidden" id="file-upload" onChange={(e) => handleFileAdd(e.target.files)} />
        <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-2">
          <Upload className="w-8 h-8 text-slate-400" />
          <span className="text-slate-400 text-sm">גרור קבצים או לחץ לבחירה (תמונות, PDF, CSV, JSON – עד 50MB, 5 קבצים)</span>
        </label>
      </div>
      {uploadError && <p className="text-red-400 text-xs mt-1">{uploadError}</p>}
      {uploading  && <p className="text-slate-400 text-xs mt-1">מעלה...</p>}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {attachments.map((a) => (
            <span key={a.mediaId} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-700 text-slate-200 text-sm">
              {a.type === 'image' ? <Image className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
              <span className="max-w-[180px] truncate">{a.originalName}</span>
              <button type="button" onClick={() => removeAttachment(a.mediaId)} className="text-slate-400 hover:text-red-400"><X className="w-4 h-4" /></button>
            </span>
          ))}
        </div>
      )}
    </div>
  );

  const isTableMissingError = error && typeof error === 'string' && (error.includes('admin_ai_analyses') || error.includes('does not exist'));

  async function createTables() {
    setCreatingTable(true); setError(null);
    try {
      await apiFetch<{ ok: boolean }>('/admin/ai/create-tables', { method: 'POST', body: JSON.stringify({}) });
      setSuccessMsg('הטבלה נוצרה! נסה שוב.');
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) { setError(err?.message ?? 'יצירה נכשלה'); }
    finally { setCreatingTable(false); }
  }

  function clearResults() {
    setResult(null); setResults(null);
    setSynthResult(null); setSynthError(null); setError(null);
  }

  // ── Run actions ────────────────────────────────────────────────────────
  async function runAnalysis() {
    setLoading(true); clearResults();
    try {
      const data = await apiFetch<AnalysisResult | { results: AnalysisResult[] }>('/admin/ai/project-analyze', {
        method: 'POST',
        body: JSON.stringify({ depth, scope, focus: focus.trim() || undefined, models: selectedModels.length ? selectedModels : undefined, attachmentIds: attachments.map((a) => a.mediaId) }),
      });
      setAttachments([]);
      if ('results' in data) { setResults(data.results); }
      else { setResult(data); }
      loadArchive();
    } catch (err: any) { setError(err?.message ?? 'הניתוח נכשל'); }
    finally { setLoading(false); }
  }

  async function runAskQuestionAction() {
    setLoading(true); clearResults();
    try {
      const data = await apiFetch<AnalysisResult | { results: AnalysisResult[] }>('/admin/ai/ask-question', {
        method: 'POST',
        body: JSON.stringify({ query: question.trim(), depth, scope, models: selectedModels.length ? selectedModels : undefined, attachmentIds: attachments.map((a) => a.mediaId) }),
      });
      setAttachments([]);
      if ('results' in data) { setResults(data.results); }
      else { setResult(data); }
      loadArchive();
    } catch (err: any) { setError(err?.message ?? 'השאלה נכשלה'); }
    finally { setLoading(false); }
  }

  async function runFeaturePlanningAction() {
    setLoading(true); clearResults();
    try {
      const data = await apiFetch<AnalysisResult | { results: AnalysisResult[] }>('/admin/ai/feature-planning', {
        method: 'POST',
        body: JSON.stringify({ query: query.trim(), depth, scope, models: selectedModels.length ? selectedModels : undefined, attachmentIds: attachments.map((a) => a.mediaId) }),
      });
      setAttachments([]);
      if ('results' in data) { setResults(data.results); }
      else { setResult(data); }
      loadArchive();
    } catch (err: any) { setError(err?.message ?? "תכנון הפיצ'ר נכשל"); }
    finally { setLoading(false); }
  }

  async function runSynthesisAction() {
    if (!results || results.length < 2) return;
    const targetModel = synthesisModel || models.find((m) => m.available)?.id || 'claude';
    setSynthLoading(true); setSynthResult(null); setSynthError(null);
    try {
      const originalQuery = query.trim() || question.trim() || focus.trim() || undefined;
      const data = await apiFetch<AnalysisResult>('/admin/ai/synthesize', {
        method: 'POST',
        body: JSON.stringify({
          reports: results.map((r) => ({ content: r.report, model: r.model })),
          synthesisModel: targetModel,
          originalQuery,
        }),
      });
      setSynthResult(data);
      loadArchive();
    } catch (err: any) { setSynthError(err?.message ?? 'הסינתזה נכשלה'); }
    finally { setSynthLoading(false); }
  }

  async function loadArchive() {
    setArchiveLoading(true);
    try {
      const params = archiveFilter ? `?type=${archiveFilter}` : '';
      const list = await apiFetch<ArchiveItem[]>(`/admin/ai/analyses${params}`);
      setArchive(list);
    } catch { setArchive([]); }
    finally { setArchiveLoading(false); }
  }

  const filteredArchive = archiveSearch.trim()
    ? archive.filter((a) => (a.query ?? '').toLowerCase().includes(archiveSearch.toLowerCase()) || (a.report ?? '').toLowerCase().includes(archiveSearch.toLowerCase()))
    : archive;

  function exportAsMarkdown(item: ArchiveItem) {
    const md = `# ${buildDocTitle(item.type, item.query)}\n\n**תאריך:** ${new Date(item.createdAt).toLocaleString('he-IL')}\n**מודל:** ${item.model ?? '-'}\n**Tokens:** ${(item.tokensUsed ?? 0).toLocaleString()}\n\n${item.report}`;
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `analysis-${item.id.slice(0, 8)}.md`; a.click();
    URL.revokeObjectURL(url);
  }

  useEffect(() => { if (tab === 'archive') loadArchive(); }, [tab, archiveFilter]);

  useEffect(() => {
    apiFetch<{ models?: AIModelInfo[] }>('/admin/ai/providers')
      .then((p) => {
        const m = p.models ?? [];
        setModels(m);
        const first = m.find((x) => x.available);
        if (first) setSynthesisModel(first.id);
      })
      .catch(() => setModels([]));
  }, []);

  function toggleModel(id: string) {
    setSelectedModels((prev) => {
      if (prev.includes(id)) return prev.filter((m) => m !== id);
      if (prev.length >= 2) return prev;
      return [...prev, id];
    });
  }

  async function copyText(text: string, idx: number) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    } catch { /* silent */ }
  }

  const hasDualResults = results && results.length >= 2;
  // If only 1 result came back in results array, treat as single
  const singleFromResults = results && results.length === 1 ? results[0] : null;

  const currentTabType: string =
    tab === 'analyze' ? 'project_analysis' :
    tab === 'feature' ? 'feature_planning' :
    tab === 'ask'     ? 'ask_question'     : 'ask_question';

  // Current question/focus for doc title
  const currentQuery = query.trim() || question.trim() || focus.trim();

  return (
    <div className="space-y-6" dir="rtl">
      <h1 className="text-2xl font-bold text-slate-100">ניתוח ותכנון עם AI</h1>
      <p className="text-slate-500 text-sm -mt-1">המודל בפועל מוצג בתוצאה – לפי המפתחות ב-.env</p>

      {/* ── Tab bar ────────────────────────────────────────────────────── */}
      <div className="flex gap-2 border-b border-slate-700 pb-2">
        {[
          { id: 'analyze' as Tab, label: 'ניתוח פרויקט',   Icon: Search,        color: 'bg-indigo-600' },
          { id: 'feature' as Tab, label: "תכנון פיצ'ר חדש", Icon: Lightbulb,     color: 'bg-amber-600' },
          { id: 'ask'     as Tab, label: 'שאלה ל-AI',       Icon: MessageCircle, color: 'bg-emerald-600' },
          { id: 'archive' as Tab, label: 'ארכיון',           Icon: Archive,       color: 'bg-slate-600' },
        ].map(({ id, label, Icon, color }) => (
          <button
            key={id}
            onClick={() => { setTab(id); setSelectedArchive(null); clearResults(); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${tab === id ? `${color} text-white` : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
          >
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {/* ── Model selector ─────────────────────────────────────────────── */}
      {tab !== 'archive' && models.length > 0 && (
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Brain className="w-4 h-4 text-indigo-400" />
            <label className="text-slate-300 text-sm font-medium">בחירת מודל AI</label>
            {selectedModels.length === 2 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-900/50 text-indigo-300 border border-indigo-500/30">2 מודלים במקביל – תוצאות זה לצד זה</span>
            )}
          </div>
          <p className="text-slate-500 text-xs mb-3">בחר 1 מודל, או 2 מודלים להשוואה זה לצד זה ואז סינתזה. ללא בחירה: fallback אוטומטי.</p>
          <div className="flex flex-wrap gap-3">
            {models.map((m) => (
              <label
                key={m.id}
                className={`flex items-start gap-2 px-4 py-3 rounded-lg border cursor-pointer transition max-w-sm ${
                  selectedModels.includes(m.id) ? 'border-indigo-500 bg-indigo-900/30' :
                  m.available ? 'border-slate-600 bg-slate-900/50 hover:bg-slate-700/50' :
                  'border-slate-700 bg-slate-900/30 opacity-60 cursor-not-allowed'
                }`}
              >
                <input type="checkbox" checked={selectedModels.includes(m.id)} onChange={() => m.available && toggleModel(m.id)} disabled={!m.available} className="mt-1 rounded" />
                <div>
                  <span className="text-slate-200 font-medium">{m.label}</span>
                  {!m.available && <span className="text-red-400 text-xs mr-1"> (לא זמין)</span>}
                  <p className="text-slate-500 text-xs mt-0.5">{m.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* ── Analyze tab ───────────────────────────────────────────────── */}
      {tab === 'analyze' && (
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 space-y-4">
          <p className="text-slate-400 text-sm">שליחת נתוני הפרויקט ל-AI: באגים, חוסר סנכרון, חסרים, שיפורים. התוצאות נשמרות בארכיון.</p>
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">מיקוד (אופציונלי)</label>
            <textarea value={focus} onChange={(e) => setFocus(e.target.value)}
              placeholder="נושאים שמעניינים אותך – למשל: 'התמקד בבאגים של התחברות'"
              className="w-full h-20 px-4 py-2 rounded-lg bg-slate-900 border border-slate-600 text-slate-200 placeholder-slate-500 text-sm resize-none" />
          </div>
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">עומק</label>
            <div className="flex flex-wrap gap-2">
              {DEPTH_OPTIONS.map((opt) => (
                <button key={opt.value} onClick={() => setDepth(opt.value)}
                  className={`px-4 py-2 rounded-lg text-sm ${depth === opt.value ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}>{opt.label}</button>
              ))}
            </div>
            <p className="text-slate-500 text-xs mt-1.5">{DEPTH_OPTIONS.find((o) => o.value === depth)?.longDesc}</p>
          </div>
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">היקף</label>
            <div className="flex flex-wrap gap-2">
              {SCOPE_OPTIONS.map((opt) => (
                <button key={opt.value} onClick={() => setScope(opt.value)}
                  className={`px-4 py-2 rounded-lg text-sm ${scope === opt.value ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}>{opt.label}</button>
              ))}
            </div>
          </div>
          <FileUploadZone />
          <button onClick={runAnalysis} disabled={loading}
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium">
            {loading ? <><Loader2 className="w-5 h-5 animate-spin" />מריץ ניתוח...</> : <><Brain className="w-5 h-5" />הפעל ניתוח</>}
          </button>
        </div>
      )}

      {/* ── Feature planning tab ──────────────────────────────────────── */}
      {tab === 'feature' && (
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 space-y-4">
          <p className="text-slate-400 text-sm">אפיון מלא: PRD, ERD, עלויות, אבטחה, תוכנית יישום.</p>
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">שאילתא / רעיון</label>
            <textarea value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="לדוגמה: רוצים לוח שנה משותף לכל המשפחה עם שיתוף הרשאות"
              className="w-full h-32 px-4 py-3 rounded-lg bg-slate-900 border border-slate-600 text-slate-200 placeholder-slate-500 resize-none" />
          </div>
          <div className="flex flex-wrap gap-2">
            {DEPTH_OPTIONS.map((opt) => (
              <button key={opt.value} onClick={() => setDepth(opt.value)}
                className={`px-4 py-2 rounded-lg text-sm ${depth === opt.value ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}>{opt.label}</button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {SCOPE_OPTIONS.map((opt) => (
              <button key={opt.value} onClick={() => setScope(opt.value)}
                className={`px-4 py-2 rounded-lg text-sm ${scope === opt.value ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}>{opt.label}</button>
            ))}
          </div>
          <FileUploadZone />
          <button onClick={runFeaturePlanningAction} disabled={loading}
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-medium">
            {loading ? <><Loader2 className="w-5 h-5 animate-spin" />מריץ תכנון...</> : <><Lightbulb className="w-5 h-5" />הפעל תכנון פיצ'ר</>}
          </button>
        </div>
      )}

      {/* ── Ask question tab ──────────────────────────────────────────── */}
      {tab === 'ask' && (
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 space-y-4">
          <p className="text-slate-400 text-sm">שאל שאלה – ה-AI יחקור, יסיק מסקנות ויתן פתרונות מעמיקים.</p>
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">שאלה</label>
            <textarea value={question} onChange={(e) => setQuestion(e.target.value)}
              placeholder="לדוגמה: מה צריך לשפר בתפריט הניווט של האדמין? Backend + Frontend?"
              className="w-full h-36 px-4 py-3 rounded-lg bg-slate-900 border border-slate-600 text-slate-200 placeholder-slate-500 resize-none" />
          </div>
          <div className="flex flex-wrap gap-2">
            {DEPTH_OPTIONS.map((opt) => (
              <button key={opt.value} onClick={() => setDepth(opt.value)}
                className={`px-4 py-2 rounded-lg text-sm ${depth === opt.value ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}>{opt.label}</button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {SCOPE_OPTIONS.map((opt) => (
              <button key={opt.value} onClick={() => setScope(opt.value)}
                className={`px-4 py-2 rounded-lg text-sm ${scope === opt.value ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}>{opt.label}</button>
            ))}
          </div>
          <FileUploadZone />
          <button onClick={runAskQuestionAction} disabled={loading || !question.trim()}
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium">
            {loading ? <><Loader2 className="w-5 h-5 animate-spin" />שולח...</> : <><MessageCircle className="w-5 h-5" />שאל שאלה</>}
          </button>
        </div>
      )}

      {/* ── Archive tab ───────────────────────────────────────────────── */}
      {tab === 'archive' && (
        <div className="flex flex-col w-full min-h-[calc(100vh-280px)] rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 border-b border-slate-700 bg-slate-900/50 shrink-0">
            <h2 className="text-lg font-semibold text-slate-200">ארכיון ניתוחים ותכנונים</h2>
            <div className="flex flex-wrap gap-2">
              <input type="text" placeholder="חיפוש..." value={archiveSearch} onChange={(e) => setArchiveSearch(e.target.value)}
                className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 text-sm border border-slate-600 w-56" />
              <select value={archiveFilter} onChange={(e) => setArchiveFilter(e.target.value)}
                className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 text-sm border border-slate-600">
                <option value="">הכל</option>
                <option value="project_analysis">ניתוח פרויקט</option>
                <option value="feature_planning">תכנון פיצ'ר</option>
                <option value="ask_question">שאלה ל-AI</option>
                <option value="synthesis">סינתזה</option>
              </select>
            </div>
          </div>

          <div className="flex flex-1 min-h-0 w-full">
            {/* List panel */}
            <div className="w-full md:w-[400px] lg:w-[420px] flex flex-col border-l border-slate-700 shrink-0">
              {archiveLoading ? (
                <div className="flex items-center justify-center gap-2 text-slate-400 py-16"><Loader2 className="w-6 h-6 animate-spin" /> טוען...</div>
              ) : filteredArchive.length === 0 ? (
                <div className="flex items-center justify-center py-16 text-slate-500">{archiveSearch ? 'לא נמצאו תוצאות' : 'אין עדיין ניתוחים.'}</div>
              ) : (
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {filteredArchive.map((item) => (
                    <button key={item.id} onClick={() => setSelectedArchive(item)}
                      className={`w-full text-right px-4 py-3 rounded-lg border transition-all hover:border-slate-500 ${selectedArchive?.id === item.id ? 'border-indigo-500 bg-indigo-900/40 ring-2 ring-indigo-500/50' : 'border-slate-600 bg-slate-900/50'}`}>
                      {/* Row 1: type badge + date */}
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded shrink-0 ${
                          item.type === 'feature_planning' ? 'bg-amber-900/50 text-amber-400' :
                          item.type === 'ask_question'     ? 'bg-emerald-900/50 text-emerald-400' :
                          item.type === 'synthesis'        ? 'bg-purple-900/50 text-purple-400' :
                          'bg-indigo-900/50 text-indigo-400'
                        }`}>{TYPE_LABELS[item.type] ?? item.type}</span>
                        <span className="text-xs text-slate-500 shrink-0">{new Date(item.createdAt).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' })}</span>
                      </div>
                      {/* Row 2: title */}
                      <p className="text-slate-100 text-sm font-semibold mt-2 line-clamp-2 leading-snug">
                        {extractShortTitle(item)}
                      </p>
                      {/* Row 3: model + tokens + developer */}
                      <div className="flex items-center justify-between gap-2 mt-1.5">
                        <span className="text-slate-500 text-xs truncate">{item.model ?? '-'} • {(item.tokensUsed ?? 0).toLocaleString()} tokens</span>
                        {(item.adminUserFullName || item.adminUserEmail) && (
                          <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded shrink-0 truncate max-w-[120px]" title={item.adminUserEmail ?? ''}>
                            {item.adminUserFullName ?? item.adminUserEmail}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Detail panel */}
            <div className="flex-1 min-w-0 flex flex-col bg-slate-900/30">
              {selectedArchive ? (
                <div className="flex-1 overflow-y-auto">
                  {/* Rating bar at TOP */}
                  {selectedArchive.id && (
                    <RatingBar
                      key={selectedArchive.id}
                      analysisId={selectedArchive.id}
                      initial={{ outputQuality: selectedArchive.outputQuality ?? null, devQuality: selectedArchive.devQuality ?? null, processSpeed: selectedArchive.processSpeed ?? null }}
                      onSaved={(data) => {
                        setSelectedArchive((prev) => prev ? { ...prev, ...data } : null);
                        setArchive((prev) => prev.map((a) => a.id === selectedArchive.id ? { ...a, ...data } : a));
                      }}
                    />
                  )}
                  {/* Meta header */}
                  <div className="flex flex-wrap items-start justify-between gap-4 p-5 border-b border-slate-700/50">
                    <div className="flex-1 min-w-0">
                      {/* Type badge */}
                      <span className={`inline-block text-xs px-2 py-0.5 rounded mb-2 ${
                        selectedArchive.type === 'feature_planning' ? 'bg-amber-900/50 text-amber-400' :
                        selectedArchive.type === 'ask_question'     ? 'bg-emerald-900/50 text-emerald-400' :
                        selectedArchive.type === 'synthesis'        ? 'bg-purple-900/50 text-purple-400' :
                        'bg-indigo-900/50 text-indigo-400'
                      }`}>{TYPE_LABELS[selectedArchive.type] ?? selectedArchive.type}</span>
                      {/* Title */}
                      <h3 className="text-lg font-bold text-slate-100 leading-snug">
                        {extractShortTitle(selectedArchive)}
                      </h3>
                      {/* Meta row */}
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-400">
                        <span>{new Date(selectedArchive.createdAt).toLocaleString('he-IL')}</span>
                        <span>{selectedArchive.model ?? '-'}</span>
                        <span>{(selectedArchive.tokensUsed ?? 0).toLocaleString()} tokens</span>
                        <span className="text-green-400">${selectedArchive.costUsd ?? '0'}</span>
                        {(selectedArchive.adminUserFullName || selectedArchive.adminUserEmail) && (
                          <span className="text-slate-300 font-medium">
                            👤 {selectedArchive.adminUserFullName ?? selectedArchive.adminUserEmail}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => { navigator.clipboard.writeText(selectedArchive.report); setArchiveCopied(true); setTimeout(() => setArchiveCopied(false), 2000); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs">
                        <Copy className="w-3.5 h-3.5" />{archiveCopied ? 'הועתק!' : 'העתק'}
                      </button>
                      <button onClick={() => exportAsMarkdown(selectedArchive)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs">
                        <FileText className="w-3.5 h-3.5" />Markdown
                      </button>
                      <button
                        onClick={() => downloadAsPdf(selectedArchive.report, {
                          title: buildDocTitle(selectedArchive.type, selectedArchive.query),
                          model: selectedArchive.model ?? '-',
                          tokens: selectedArchive.tokensUsed ?? 0,
                          cost: parseFloat(selectedArchive.costUsd ?? '0'),
                          date: new Date(selectedArchive.createdAt).toLocaleString('he-IL'),
                        })}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-700/70 hover:bg-red-600/70 text-red-200 text-xs">
                        <Printer className="w-3.5 h-3.5" />PDF
                      </button>
                      <button
                        onClick={() => downloadAsWord(selectedArchive.report, {
                          title: buildDocTitle(selectedArchive.type, selectedArchive.query),
                          model: selectedArchive.model ?? '-',
                          tokens: selectedArchive.tokensUsed ?? 0,
                          cost: parseFloat(selectedArchive.costUsd ?? '0'),
                          date: new Date(selectedArchive.createdAt).toLocaleString('he-IL'),
                        })}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-700/70 hover:bg-blue-600/70 text-blue-200 text-xs">
                        <FileDown className="w-3.5 h-3.5" />Word
                      </button>
                    </div>
                  </div>

                  {selectedArchive.query && (
                    <div className="mx-5 mt-4 p-4 rounded-xl bg-slate-800/80 border border-slate-600">
                      <span className="text-slate-500 text-xs font-medium">שאלה מקורית</span>
                      <p className="text-slate-200 text-sm mt-2 whitespace-pre-wrap">{selectedArchive.query}</p>
                    </div>
                  )}

                  <div className="p-5">
                    <MarkdownRenderer content={selectedArchive.report} />
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-slate-500 p-8">
                  <div className="text-center">
                    <Archive className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                    <p className="text-lg font-medium">בחר פריט מהרשימה</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Messages ──────────────────────────────────────────────────── */}
      {successMsg && <div className="rounded-xl border border-emerald-500/50 bg-emerald-900/20 p-4 text-emerald-400">{successMsg}</div>}
      {error && (
        <div className="rounded-xl border border-red-500/50 bg-red-900/20 p-4">
          <p className="text-red-400">{error}</p>
          {isTableMissingError && (
            <div className="mt-3 space-y-2">
              <button onClick={createTables} disabled={creatingTable}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm">
                {creatingTable ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {creatingTable ? 'יוצר...' : 'יצור טבלת ארכיון'}
              </button>
              <p className="text-slate-500 text-xs">או: <code className="bg-slate-800 px-1 rounded">npm run fix:ai-schema</code></p>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          RESULTS
          ══════════════════════════════════════════════════════════════════ */}

      {/* Dual results (side by side) */}
      {hasDualResults && !selectedArchive && (
        <div className="space-y-6">
          {/* Step indicator */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-900/40 border border-indigo-500/30 text-indigo-300 text-sm font-medium">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">1</span>
              תוצרי 2 המודלים
            </div>
            <div className="h-px flex-1 bg-slate-700" />
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-900/20 border border-purple-500/20 text-purple-400/70 text-sm">
              <span className="w-5 h-5 rounded-full bg-purple-900/50 text-purple-400 text-xs flex items-center justify-center font-bold">2</span>
              סינתזה (אופציונלי)
            </div>
          </div>

          {/* Side-by-side cards */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {results!.map((r, i) => (
              <ModelResultCard
                key={i}
                result={r}
                label={`תוצר ${i + 1}`}
                docTitle={buildDocTitle(currentTabType, currentQuery || null)}
                onCopy={() => copyText(r.report, i)}
                copied={copiedIdx === i}
              />
            ))}
          </div>

          {/* Synthesis panel */}
          {!synthResult && (
            <div className="rounded-xl border-2 border-dashed border-purple-500/40 bg-purple-950/10 p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    שלב 2 – צור מסמך מאוחד עם AI
                  </h2>
                  <p className="text-slate-400 text-sm mt-1 max-w-2xl">
                    AI ינתח את שתי התוצאות, ישלב רעיונות משלימים, יבחר את הגישה הטובה יותר בקונפליקטים, ויכתוב מסמך אחד שעולה על כל אחד מהתוצרים בנפרד.
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {/* Model picker */}
                  <div className="relative">
                    <button
                      onClick={() => setShowSynthModelPicker((v) => !v)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-300 text-sm hover:bg-slate-700 min-w-[160px]"
                      aria-label="בחר מודל לסינתזה"
                    >
                      <Brain className="w-4 h-4 text-purple-400 shrink-0" />
                      <span className="flex-1 text-right truncate">{models.find((m) => m.id === synthesisModel)?.label ?? 'בחר מודל'}</span>
                      <ChevronDown className="w-4 h-4 shrink-0" />
                    </button>
                    {showSynthModelPicker && (
                      <div className="absolute left-0 top-full mt-1 w-64 rounded-xl border border-slate-600 bg-slate-800 shadow-2xl z-20 py-1">
                        {models.filter((m) => m.available).map((m) => (
                          <button key={m.id} onClick={() => { setSynthesisModel(m.id); setShowSynthModelPicker(false); }}
                            className={`w-full text-right px-4 py-2.5 text-sm hover:bg-slate-700 ${synthesisModel === m.id ? 'text-purple-400 bg-slate-700/50' : 'text-slate-200'}`}>
                            <span className="font-medium">{m.label}</span>
                            <p className="text-xs text-slate-500 mt-0.5">{m.desc}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button onClick={runSynthesisAction} disabled={synthLoading}
                    className="flex items-center gap-2 px-6 py-3 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold text-sm">
                    {synthLoading ? <><Loader2 className="w-5 h-5 animate-spin" />מאחד...</> : <><Sparkles className="w-5 h-5" />צור מסמך מאוחד</>}
                  </button>
                </div>
              </div>
              {synthError && <p className="mt-3 text-red-400 text-sm">{synthError}</p>}
            </div>
          )}

          {/* Synthesis result */}
          {synthResult && (
            <div className="rounded-xl border-2 border-purple-500/40 bg-slate-900/50 overflow-hidden">
              {/* Rating at TOP */}
              {synthResult.id && (
                <RatingBar key={synthResult.id} analysisId={synthResult.id} initial={{ outputQuality: null, devQuality: null, processSpeed: null }} />
              )}
              {/* Header */}
              <div className="flex items-center justify-between gap-4 px-6 py-4 bg-purple-950/30 border-b border-purple-500/30">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  <div>
                    <h2 className="font-bold text-slate-100">מסמך מאוחד – תוצר הסינתזה</h2>
                    <div className="flex gap-3 mt-0.5 text-xs text-slate-400">
                      <span>מודל: {synthResult.model}</span>
                      <span>{synthResult.tokensUsed.toLocaleString()} tokens</span>
                      <span className="text-green-400">${typeof synthResult.costUsd === 'number' ? synthResult.costUsd.toFixed(4) : synthResult.costUsd}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0 flex-wrap">
                  <button onClick={() => { navigator.clipboard.writeText(synthResult.report); setSynthCopied(true); setTimeout(() => setSynthCopied(false), 2000); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm">
                    <Copy className="w-4 h-4" />{synthCopied ? 'הועתק!' : 'העתק'}
                  </button>
                  <button onClick={() => downloadAsPdf(synthResult.report, { title: 'סינתזה – ' + buildDocTitle(currentTabType, currentQuery || null), model: synthResult.model, tokens: synthResult.tokensUsed, cost: synthResult.costUsd, date: new Date().toLocaleString('he-IL') })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-700/70 hover:bg-red-600/70 text-red-200 text-sm">
                    <Printer className="w-4 h-4" />PDF
                  </button>
                  <button onClick={() => downloadAsWord(synthResult.report, { title: 'סינתזה – ' + buildDocTitle(currentTabType, currentQuery || null), model: synthResult.model, tokens: synthResult.tokensUsed, cost: synthResult.costUsd, date: new Date().toLocaleString('he-IL') })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-700/70 hover:bg-blue-600/70 text-blue-200 text-sm">
                    <FileDown className="w-4 h-4" />Word
                  </button>
                  <button onClick={() => { setSynthResult(null); setSynthError(null); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-400 text-sm" aria-label="נסה שוב">
                    <X className="w-4 h-4" />נסה שוב
                  </button>
                </div>
              </div>
              <div className="p-6"><MarkdownRenderer content={synthResult.report} /></div>
            </div>
          )}
        </div>
      )}

      {/* Single result (from results array with length 1 — edge case) */}
      {singleFromResults && !selectedArchive && (
        <div className="rounded-xl border border-amber-600/30 bg-amber-950/10 p-3 text-amber-400 text-sm mb-2 flex items-center gap-2">
          <span>⚠️</span>
          <span>רק מודל אחד הצליח לרוץ – התוצאה מוצגת מטה. בדוק שהמפתחות של שני המודלים מוגדרים ב-.env.</span>
        </div>
      )}

      {/* Single result */}
      {(result || singleFromResults) && !selectedArchive && (() => {
        const r = result ?? singleFromResults!;
        return (
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden">
            {/* Rating at TOP */}
            {r.id && (
              <RatingBar
                key={r.id}
                analysisId={r.id}
                initial={{ outputQuality: r.outputQuality ?? null, devQuality: r.devQuality ?? null, processSpeed: r.processSpeed ?? null }}
                onSaved={(data) => {
                  if (result) setResult((prev) => prev ? { ...prev, ...data } : null);
                  else if (singleFromResults) setResults((prev) => prev ? [{ ...prev[0], ...data }] : null);
                }}
              />
            )}
            {/* Download bar */}
            <DownloadBar
              report={r.report}
              model={r.model}
              tokensUsed={r.tokensUsed}
              costUsd={r.costUsd}
              title={buildDocTitle(currentTabType, currentQuery || null)}
              onCopy={() => copyText(r.report, -1)}
              copied={copiedIdx === -1}
            />
            <div className="p-6"><MarkdownRenderer content={r.report} /></div>
          </div>
        );
      })()}
    </div>
  );
}
