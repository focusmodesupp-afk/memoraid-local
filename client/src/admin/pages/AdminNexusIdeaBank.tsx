/**
 * AdminNexusIdeaBank.tsx
 * NEXUS Idea Bank — collect, vote, prioritize, and manage product ideas.
 */

import React, { useState, useEffect } from 'react';
import {
  Lightbulb, Plus, ThumbsUp, ThumbsDown, Star, Clock, Tag,
  ChevronDown, ChevronUp, Loader2, CheckCircle, XCircle, AlertCircle,
  ArrowRight, Calendar, Edit3, Trash2, MessageSquare, Filter,
} from 'lucide-react';
import { apiFetch } from '../../lib/api';

type Idea = {
  id: string;
  title: string;
  description: string;
  category: string;
  sourceType: string;
  sourceBriefId?: string;
  sourceDepartment?: string;
  sourceEmployeeName?: string;
  priority: string;
  score: number;
  upvotes: number;
  downvotes: number;
  ceoRecommendation?: string;
  executiveNotes?: string;
  status: string;
  targetQuarter?: string;
  estimatedHours?: number;
  tags: string[];
  createdAt: string;
};

type Comment = {
  id: string;
  authorType: string;
  authorName: string;
  content: string;
  createdAt: string;
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/40',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
  low: 'bg-green-500/20 text-green-400 border-green-500/40',
  future: 'bg-slate-500/20 text-slate-400 border-slate-500/40',
};

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-500/20 text-blue-400',
  under_review: 'bg-amber-500/20 text-amber-400',
  approved: 'bg-green-500/20 text-green-400',
  in_sprint: 'bg-purple-500/20 text-purple-400',
  deferred: 'bg-slate-500/20 text-slate-400',
  rejected: 'bg-red-500/20 text-red-400',
};

const CEO_REC_LABELS: Record<string, { label: string; color: string }> = {
  must_do: { label: 'חובה', color: 'text-red-400' },
  should_do: { label: 'מומלץ', color: 'text-orange-400' },
  nice_to_have: { label: 'נחמד', color: 'text-yellow-400' },
  reject: { label: 'דחה', color: 'text-slate-500' },
  defer: { label: 'דחה לעתיד', color: 'text-blue-400' },
};

const SOURCE_ICONS: Record<string, string> = {
  brief: '📋',
  admin: '👤',
  employee: '👥',
};

export default function AdminNexusIdeaBank() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [filter, setFilter] = useState<{ status?: string; priority?: string; category?: string }>({});
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ title: '', description: '', category: 'feature', priority: 'medium' });

  // Load ideas
  useEffect(() => {
    loadIdeas();
  }, []);

  const loadIdeas = async () => {
    try {
      const data = await apiFetch<{ ideas: Idea[] }>('/admin/nexus/ideas');
      setIdeas(data.ideas ?? []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const loadComments = async (ideaId: string) => {
    try {
      const data = await apiFetch<{ idea: Idea; comments: Comment[] }>(`/admin/nexus/ideas/${ideaId}`);
      setComments(data.comments ?? []);
    } catch { /* ignore */ }
  };

  const handleVote = async (ideaId: string, vote: 'up' | 'down') => {
    try {
      await apiFetch(`/admin/nexus/ideas/${ideaId}/vote`, {
        method: 'POST',
        body: JSON.stringify({ vote }),
      });
      await loadIdeas();
    } catch { /* ignore */ }
  };

  const handleStatusChange = async (ideaId: string, status: string) => {
    try {
      await apiFetch(`/admin/nexus/ideas/${ideaId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await loadIdeas();
      if (selectedIdea?.id === ideaId) setSelectedIdea(prev => prev ? { ...prev, status } : null);
    } catch { /* ignore */ }
  };

  const handleCeoRec = async (ideaId: string, rec: string) => {
    try {
      await apiFetch(`/admin/nexus/ideas/${ideaId}`, {
        method: 'PATCH',
        body: JSON.stringify({ ceoRecommendation: rec }),
      });
      await loadIdeas();
    } catch { /* ignore */ }
  };

  const handleCreate = async () => {
    if (!createForm.title) return;
    try {
      await apiFetch('/admin/nexus/ideas', {
        method: 'POST',
        body: JSON.stringify(createForm),
      });
      setShowCreate(false);
      setCreateForm({ title: '', description: '', category: 'feature', priority: 'medium' });
      await loadIdeas();
    } catch { /* ignore */ }
  };

  const handleDelete = async (ideaId: string) => {
    if (!confirm('למחוק את הרעיון?')) return;
    try {
      await apiFetch(`/admin/nexus/ideas/${ideaId}`, { method: 'DELETE' });
      setSelectedIdea(null);
      await loadIdeas();
    } catch { /* ignore */ }
  };

  const handleAddComment = async () => {
    if (!selectedIdea || !newComment.trim()) return;
    try {
      await apiFetch(`/admin/nexus/ideas/${selectedIdea.id}/comment`, {
        method: 'POST',
        body: JSON.stringify({ content: newComment }),
      });
      setNewComment('');
      await loadComments(selectedIdea.id);
    } catch { /* ignore */ }
  };

  // Filter
  const filtered = ideas.filter(idea => {
    if (filter.status && idea.status !== filter.status) return false;
    if (filter.priority && idea.priority !== filter.priority) return false;
    if (filter.category && idea.category !== filter.category) return false;
    return true;
  });

  // Stats
  const stats = {
    total: ideas.length,
    approved: ideas.filter(i => i.status === 'approved').length,
    inSprint: ideas.filter(i => i.status === 'in_sprint').length,
    deferred: ideas.filter(i => i.status === 'deferred').length,
  };

  if (loading) return <div className="flex items-center justify-center p-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-400" /></div>;

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Lightbulb className="w-7 h-7 text-amber-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-100">בנק רעיונות NEXUS</h1>
            <p className="text-sm text-slate-400">רעיונות מכל הניירות, מנהלים ועובדים — תעדף, הצבע, והחלט</p>
          </div>
        </div>
        <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold flex items-center gap-2">
          <Plus className="w-4 h-4" /> רעיון חדש
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'סה"כ', value: stats.total, color: 'text-slate-100' },
          { label: 'מאושרים', value: stats.approved, color: 'text-green-400' },
          { label: 'בספרינט', value: stats.inSprint, color: 'text-purple-400' },
          { label: 'נדחו לעתיד', value: stats.deferred, color: 'text-slate-400' },
        ].map(s => (
          <div key={s.label} className="admin-card text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Filter className="w-4 h-4 text-slate-400" />
        {['new', 'under_review', 'approved', 'in_sprint', 'deferred', 'rejected'].map(s => (
          <button key={s} onClick={() => setFilter(f => f.status === s ? { ...f, status: undefined } : { ...f, status: s })}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filter.status === s ? STATUS_COLORS[s] + ' border-current' : 'border-slate-600 text-slate-400 hover:text-slate-200'}`}>
            {s === 'new' ? 'חדש' : s === 'under_review' ? 'בבדיקה' : s === 'approved' ? 'מאושר' : s === 'in_sprint' ? 'בספרינט' : s === 'deferred' ? 'נדחה' : 'דחוי'}
          </button>
        ))}
      </div>

      {/* Ideas grid */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <Lightbulb className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>אין רעיונות {filter.status ? 'בסטטוס הזה' : 'עדיין'}</p>
          </div>
        )}

        {filtered.map(idea => (
          <div key={idea.id}
            onClick={() => { setSelectedIdea(idea); loadComments(idea.id); }}
            className="admin-card cursor-pointer hover:border-indigo-500/50 transition-all flex items-start gap-4">
            {/* Vote column */}
            <div className="flex flex-col items-center gap-1 shrink-0">
              <button onClick={(e) => { e.stopPropagation(); handleVote(idea.id, 'up'); }}
                className="p-1 hover:bg-green-500/20 rounded transition-colors">
                <ThumbsUp className="w-4 h-4 text-green-400" />
              </button>
              <span className={`text-sm font-bold ${idea.score > 0 ? 'text-green-400' : idea.score < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                {idea.score}
              </span>
              <button onClick={(e) => { e.stopPropagation(); handleVote(idea.id, 'down'); }}
                className="p-1 hover:bg-red-500/20 rounded transition-colors">
                <ThumbsDown className="w-4 h-4 text-red-400" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="text-sm font-bold text-slate-100">{idea.title}</h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${PRIORITY_COLORS[idea.priority] ?? ''}`}>
                  {idea.priority}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLORS[idea.status] ?? ''}`}>
                  {idea.status}
                </span>
                {idea.ceoRecommendation && CEO_REC_LABELS[idea.ceoRecommendation] && (
                  <span className={`text-[10px] font-bold ${CEO_REC_LABELS[idea.ceoRecommendation].color}`}>
                    ★ {CEO_REC_LABELS[idea.ceoRecommendation].label}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 line-clamp-2 mb-2">{idea.description?.slice(0, 150)}</p>
              <div className="flex items-center gap-3 text-[10px] text-slate-500">
                <span>{SOURCE_ICONS[idea.sourceType]} {idea.sourceType === 'brief' ? 'ניירת' : idea.sourceType === 'admin' ? 'ידני' : idea.sourceEmployeeName ?? 'עובד'}</span>
                {idea.sourceDepartment && <span>📂 {idea.sourceDepartment}</span>}
                {idea.estimatedHours && <span><Clock className="w-3 h-3 inline" /> {idea.estimatedHours}h</span>}
                {idea.tags?.length > 0 && <span><Tag className="w-3 h-3 inline" /> {idea.tags.slice(0, 3).join(', ')}</span>}
              </div>
            </div>

            {/* Quick actions */}
            <div className="flex flex-col gap-1 shrink-0">
              <button onClick={(e) => { e.stopPropagation(); handleStatusChange(idea.id, 'approved'); }}
                className="p-1.5 hover:bg-green-500/20 rounded transition-colors" title="אשר">
                <CheckCircle className="w-4 h-4 text-green-400" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); handleStatusChange(idea.id, 'rejected'); }}
                className="p-1.5 hover:bg-red-500/20 rounded transition-colors" title="דחה">
                <XCircle className="w-4 h-4 text-red-400" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Detail modal */}
      {selectedIdea && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/60" onClick={() => setSelectedIdea(null)}>
          <div className="bg-slate-800 rounded-2xl border border-slate-600 p-6 w-full max-w-2xl max-h-[70vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-100">{selectedIdea.title}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${PRIORITY_COLORS[selectedIdea.priority]}`}>{selectedIdea.priority}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[selectedIdea.status]}`}>{selectedIdea.status}</span>
                  <span className="text-xs text-slate-500">{SOURCE_ICONS[selectedIdea.sourceType]} {selectedIdea.sourceDepartment ?? selectedIdea.sourceType}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleDelete(selectedIdea.id)} className="p-2 hover:bg-red-500/20 rounded-lg">
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            </div>

            <p className="text-sm text-slate-300 mb-4 whitespace-pre-wrap">{selectedIdea.description}</p>

            {/* CEO Recommendation */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-slate-400 mb-2">המלצת CEO:</p>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(CEO_REC_LABELS).map(([key, { label, color }]) => (
                  <button key={key}
                    onClick={() => handleCeoRec(selectedIdea.id, key)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${selectedIdea.ceoRecommendation === key ? 'border-amber-500 bg-amber-500/20' : 'border-slate-600 hover:border-slate-500'} ${color}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Status actions */}
            <div className="flex gap-2 mb-4 flex-wrap">
              <button onClick={() => handleStatusChange(selectedIdea.id, 'approved')} className="px-3 py-1.5 text-xs font-semibold bg-green-600 hover:bg-green-500 text-white rounded-lg">אשר → לספרינט</button>
              <button onClick={() => { handleStatusChange(selectedIdea.id, 'deferred'); }}
                className="px-3 py-1.5 text-xs font-semibold bg-slate-600 hover:bg-slate-500 text-white rounded-lg">דחה לעתיד</button>
              <button onClick={() => handleStatusChange(selectedIdea.id, 'rejected')} className="px-3 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-500 text-white rounded-lg">דחה</button>
            </div>

            {/* Comments */}
            <div className="border-t border-slate-700 pt-4">
              <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" /> הערות ({comments.length})
              </h3>
              {comments.map(c => (
                <div key={c.id} className="mb-2 p-2 rounded-lg bg-slate-700/50">
                  <p className="text-xs text-slate-400 mb-1">{c.authorName} • {new Date(c.createdAt).toLocaleDateString('he-IL')}</p>
                  <p className="text-sm text-slate-200">{c.content}</p>
                </div>
              ))}
              <div className="flex gap-2 mt-2">
                <input value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="הוסף הערה..."
                  className="flex-1 px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-sm text-slate-100" dir="rtl"
                  onKeyDown={e => e.key === 'Enter' && handleAddComment()} />
                <button onClick={handleAddComment} className="px-3 py-2 bg-indigo-600 rounded-lg text-sm text-white">שלח</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowCreate(false)}>
          <div className="bg-slate-800 rounded-2xl border border-slate-600 p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-100 mb-4 text-right">רעיון חדש</h3>
            <input value={createForm.title} onChange={e => setCreateForm(f => ({ ...f, title: e.target.value }))}
              placeholder="כותרת הרעיון" className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-slate-100 mb-3 text-right" dir="rtl" />
            <textarea value={createForm.description} onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))}
              placeholder="תיאור מפורט..." rows={4} className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-slate-100 mb-3 text-right resize-none" dir="rtl" />
            <div className="grid grid-cols-2 gap-3 mb-4">
              <select value={createForm.category} onChange={e => setCreateForm(f => ({ ...f, category: e.target.value }))}
                className="px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-slate-100 text-sm">
                <option value="feature">Feature</option>
                <option value="improvement">Improvement</option>
                <option value="ux">UX</option>
                <option value="security">Security</option>
                <option value="infrastructure">Infrastructure</option>
                <option value="research">Research</option>
              </select>
              <select value={createForm.priority} onChange={e => setCreateForm(f => ({ ...f, priority: e.target.value }))}
                className="px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-slate-100 text-sm">
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
                <option value="future">Future</option>
              </select>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-slate-400">ביטול</button>
              <button onClick={handleCreate} className="px-5 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg">צור רעיון</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
