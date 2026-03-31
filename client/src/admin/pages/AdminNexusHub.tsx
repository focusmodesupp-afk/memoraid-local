import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import {
  Cpu,
  Plus,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  FlaskConical,
  Eye,
  Trash2,
  ChevronRight,
  Zap,
  Settings,
} from 'lucide-react';
import { apiFetch } from '../../lib/api';

// ── Types ──────────────────────────────────────────────────────────────────────
type NexusBriefStatus =
  | 'draft'
  | 'researching'
  | 'review'
  | 'approved'
  | 'rejected'
  | 'in_progress'
  | 'done';

type NexusBriefSummary = {
  id: string;
  title: string;
  ideaPrompt: string;
  status: NexusBriefStatus;
  selectedDepartments: string[];
  selectedModels: string[];
  totalCostUsd: string;
  totalTokensUsed: number;
  adminFullName: string | null;
  createdAt: string;
  researchCompletedAt: string | null;
};

// ── Status config ──────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<NexusBriefStatus, { label: string; color: string; icon: React.ReactNode }> = {
  draft:       { label: 'טיוטה',     color: 'bg-slate-600 text-slate-200',   icon: <Clock className="w-3 h-3" /> },
  researching: { label: 'חוקר...',   color: 'bg-blue-600 text-blue-100',     icon: <Loader2 className="w-3 h-3 animate-spin" /> },
  review:      { label: 'בסקירה',   color: 'bg-amber-500 text-amber-900',   icon: <Eye className="w-3 h-3" /> },
  approved:    { label: 'אושר',      color: 'bg-green-600 text-green-100',   icon: <CheckCircle className="w-3 h-3" /> },
  rejected:    { label: 'נדחה',      color: 'bg-red-600 text-red-100',       icon: <XCircle className="w-3 h-3" /> },
  in_progress: { label: 'בפיתוח',   color: 'bg-indigo-600 text-indigo-100', icon: <Zap className="w-3 h-3" /> },
  done:        { label: 'הושלם',     color: 'bg-emerald-600 text-emerald-100', icon: <CheckCircle className="w-3 h-3" /> },
};

const DEPT_EMOJIS: Record<string, string> = {
  ceo: '👔', cto: '⚙️', cpo: '🎯', rd: '🔬',
  design: '🎨', product: '📋', security: '🔒', legal: '⚖️', marketing: '📣',
};

const STATUS_TABS: { value: NexusBriefStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'הכל' },
  { value: 'draft', label: 'טיוטה' },
  { value: 'researching', label: 'חוקר' },
  { value: 'review', label: 'בסקירה' },
  { value: 'approved', label: 'אושר' },
  { value: 'rejected', label: 'נדחה' },
  { value: 'done', label: 'הושלם' },
];

// ── Brief Card ─────────────────────────────────────────────────────────────────
function BriefCard({
  brief,
  onClick,
  onDelete,
}: {
  brief: NexusBriefSummary;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const sc = STATUS_CONFIG[brief.status];
  const canDelete = true; // Always show delete button — server enforces confirmation for non-draft

  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col gap-3 p-4 rounded-xl border border-slate-700 bg-slate-800/60 hover:bg-slate-800 hover:border-indigo-500/50 cursor-pointer transition-all"
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 shrink-0">
          <Cpu className="w-4 h-4 text-indigo-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-100 text-sm leading-tight line-clamp-2">
            {brief.title}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{brief.ideaPrompt}</p>
        </div>
        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${sc.color}`}>
          {sc.icon}
          {sc.label}
        </span>
      </div>

      {/* Departments row */}
      {brief.selectedDepartments.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {brief.selectedDepartments.map((d) => (
            <span key={d} className="text-sm" title={d}>{DEPT_EMOJIS[d] ?? '🔹'}</span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{new Date(brief.createdAt).toLocaleDateString('he-IL')}</span>
        <div className="flex items-center gap-3">
          {Number(brief.totalCostUsd) > 0 && (
            <span className="text-green-400">${Number(brief.totalCostUsd).toFixed(4)}</span>
          )}
          {canDelete && (
            <button
              onClick={onDelete}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-red-400 transition-opacity"
              title="מחק"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronRight className="w-4 h-4 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </div>
  );
}

// ── New Brief Modal ────────────────────────────────────────────────────────────
function NewBriefModal({ onClose, onCreate }: { onClose: () => void; onCreate: (id: string) => void }) {
  const [ideaPrompt, setIdeaPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!ideaPrompt.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ brief: { id: string } }>('/admin/nexus/briefs', {
        method: 'POST',
        body: JSON.stringify({ ideaPrompt: ideaPrompt.trim() }),
      });
      onCreate(data.brief.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה ביצירת הניירת');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-4 rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center gap-2 mb-4">
          <Cpu className="w-5 h-5 text-indigo-400" />
          <h2 className="text-lg font-bold text-slate-100">ניירת Nexus חדשה</h2>
        </div>

        <label className="block text-xs text-slate-400 mb-1.5">תאר את הרעיון שלך *</label>
        <textarea
          value={ideaPrompt}
          onChange={(e) => setIdeaPrompt(e.target.value)}
          rows={5}
          placeholder="לדוגמה: מערכת תזכורות חכמה לנטילת תרופות עם AI שמנתח דפוסים והתרעות חריגות..."
          className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-600 text-slate-200 text-sm placeholder-slate-500 resize-none focus:outline-none focus:border-indigo-500 transition-colors"
          dir="rtl"
        />
        <div className="flex justify-between items-center mt-1 mb-4">
          <span className="text-xs text-slate-500">{ideaPrompt.length} תווים</span>
          <span className="text-xs text-slate-500">תוכל לבחור מחלקות ומודלים בשלב הבא</span>
        </div>

        {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
          >
            ביטול
          </button>
          <button
            onClick={handleCreate}
            disabled={!ideaPrompt.trim() || loading}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            צור ניירת
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function AdminNexusHub() {
  const [, navigate] = useLocation();
  const [briefs, setBriefs] = useState<NexusBriefSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState<NexusBriefStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);

  const loadBriefs = async () => {
    setLoading(true);
    try {
      const params = activeStatus !== 'all' ? `?status=${activeStatus}` : '';
      const data = await apiFetch<{ briefs: NexusBriefSummary[] }>(`/admin/nexus/briefs${params}`);
      setBriefs(data.briefs ?? []);
    } catch {
      setBriefs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadBriefs(); }, [activeStatus]);

  const handleDelete = async (e: React.MouseEvent, id: string, status: string) => {
    e.stopPropagation();
    const isDraftOrRejected = status === 'draft' || status === 'rejected';
    const msg = isDraftOrRejected
      ? 'האם למחוק את הניירת?'
      : 'הניירת אינה בסטטוס טיוטה או דחויה.\nהאם למחוק בכל זאת? פעולה זו בלתי הפיכה.';
    if (!confirm(msg)) return;
    try {
      await apiFetch(`/admin/nexus/briefs/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({ confirmed: true }),
      });
      setBriefs((prev) => prev.filter((b) => b.id !== id));
    } catch {
      alert('שגיאה במחיקה');
    }
  };

  const filtered = briefs.filter(
    (b) =>
      !search ||
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.ideaPrompt.toLowerCase().includes(search.toLowerCase())
  );

  // Stats
  const stats = {
    total: briefs.length,
    review: briefs.filter((b) => b.status === 'review').length,
    approved: briefs.filter((b) => b.status === 'approved').length,
    researching: briefs.filter((b) => b.status === 'researching').length,
  };

  return (
    <div className="p-6 max-w-6xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
            <Cpu className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Nexus – בית תוכנה וירטואלי</h1>
            <p className="text-sm text-slate-400">מחקר רב-מחלקתי מבוסס AI לכל רעיון פיתוח</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/admin/nexus/settings')}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-slate-600 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm transition-colors"
            title="הגדרות Nexus"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors shadow-lg shadow-indigo-500/20"
          >
            <Plus className="w-4 h-4" />
            ניירת חדשה
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'סה"כ ניירות', value: stats.total, color: 'text-slate-200' },
          { label: 'בסקירה', value: stats.review, color: 'text-amber-400' },
          { label: 'חוקרות', value: stats.researching, color: 'text-blue-400' },
          { label: 'אושרו', value: stats.approved, color: 'text-green-400' },
        ].map((s) => (
          <div key={s.label} className="p-3 rounded-xl border border-slate-700 bg-slate-800/40 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs + search */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex gap-1 p-1 rounded-lg bg-slate-800 border border-slate-700">
          {STATUS_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setActiveStatus(t.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeStatus === t.value
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex-1 relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש ניירות..."
            className="w-full pr-9 pl-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FlaskConical className="w-12 h-12 text-slate-600 mb-3" />
          <p className="text-slate-400 font-medium">אין ניירות מחקר עדיין</p>
          <p className="text-slate-500 text-sm mt-1">לחץ "ניירת חדשה" כדי להתחיל מחקר Nexus</p>
          <button
            onClick={() => setShowNewModal(true)}
            className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            צור ניירת ראשונה
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((brief) => (
            <BriefCard
              key={brief.id}
              brief={brief}
              onClick={() => navigate(`/admin/nexus/briefs/${brief.id}`)}
              onDelete={(e) => void handleDelete(e, brief.id, brief.status)}
            />
          ))}
        </div>
      )}

      {showNewModal && (
        <NewBriefModal
          onClose={() => setShowNewModal(false)}
          onCreate={(id) => {
            setShowNewModal(false);
            navigate(`/admin/nexus/briefs/${id}`);
          }}
        />
      )}
    </div>
  );
}
