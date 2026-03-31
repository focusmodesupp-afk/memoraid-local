import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, MessageSquare, Clock, Calendar as CalendarIcon, Tag, User, AlertTriangle, FileText, ChevronDown, ChevronUp, Copy, Check as CheckIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './AdminDialog';
import { apiFetch } from '../../lib/api';
import MarkdownRenderer from './MarkdownRenderer';

type DevTask = {
  id: string;
  title: string;
  description: string | null;
  columnId: string | null;
  priority: 'low' | 'medium' | 'high';
  category: string | null;
  assignee: string | null;
  labels: string[] | null;
  estimateHours: number | null;
  actualHours: number | null;
  dueDate: string | null;
  riskLevel: string | null;
  createdAt: string;
  updatedAt: string;
};

type Comment = {
  id: string;
  comment: string;
  createdAt: string;
  adminUser: { id: string; username: string } | null;
};

type TaskEditModalProps = {
  task: DevTask | null;
  open: boolean;
  onClose: () => void;
  onSave: (task: DevTask) => void;
  onDelete: (taskId: string) => void;
};

const CATEGORIES = ['plans', 'email', 'calendar', 'admin', 'testing', 'optimization', 'ai', 'mobile', 'security', 'performance'];
const PRIORITIES = ['low', 'medium', 'high'];
const RISK_LEVELS = [
  { value: '', label: 'ללא סיכון' },
  { value: 'low', label: 'נמוך' },
  { value: 'medium', label: 'בינוני' },
  { value: 'high', label: 'גבוה' },
  { value: 'critical', label: 'קריטי' },
];

type NexusDoc = {
  id: string;
  doc_type: string;
  title: string | null;
  content: string;
  created_at: string;
};

type NexusDocsResult = {
  briefId: string | null;
  briefTitle: string | null;
  ideaPrompt: string | null;
  docs: NexusDoc[];
};

export default function TaskEditModal({ task, open, onClose, onSave, onDelete }: TaskEditModalProps) {
  const [tab, setTab] = useState<'details' | 'planning' | 'activity' | 'nexus'>('details');
  const [formData, setFormData] = useState<Partial<DevTask>>({});
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [nexusDocs, setNexusDocs] = useState<NexusDocsResult | null>(null);
  const [loadingNexus, setLoadingNexus] = useState(false);
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
  const [copiedDocId, setCopiedDocId] = useState<string | null>(null);

  useEffect(() => {
    if (task) {
      setFormData(task);
      if (tab === 'activity') {
        loadComments();
      }
      if (tab === 'nexus' && !nexusDocs) {
        loadNexusDocs();
      }
    }
  }, [task, tab]);

  async function loadNexusDocs() {
    if (!task) return;
    setLoadingNexus(true);
    try {
      const data = await apiFetch<NexusDocsResult>(`/admin/dev/tasks/${task.id}/nexus-docs`);
      setNexusDocs(data);
      if (data.docs.length > 0) {
        setExpandedDoc(data.docs[0].id);
      }
    } catch (err) {
      console.error(err);
      setNexusDocs({ briefId: null, briefTitle: null, ideaPrompt: null, docs: [] });
    } finally {
      setLoadingNexus(false);
    }
  }

  async function copyDocContent(doc: NexusDoc) {
    try {
      await navigator.clipboard.writeText(doc.content);
      setCopiedDocId(doc.id);
      setTimeout(() => setCopiedDocId(null), 2000);
    } catch {
      // ignore
    }
  }

  async function loadComments() {
    if (!task) return;
    setLoadingComments(true);
    try {
      const data = await apiFetch<Comment[]>(`/admin/dev/tasks/${task.id}/comments`);
      setComments(data);
    } catch (err) {
      console.error(err);
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  }

  async function handleSave() {
    if (!task) return;
    setSaving(true);
    try {
      const updated = await apiFetch<DevTask>(`/admin/dev/tasks/${task.id}`, {
        method: 'PATCH',
        body: JSON.stringify(formData),
      });
      onSave(updated);
      onClose();
    } catch (err) {
      console.error(err);
      alert('שגיאה בשמירה');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!task) return;
    if (!confirm('למחוק משימה זו?')) return;
    try {
      await apiFetch(`/admin/dev/tasks/${task.id}`, { method: 'DELETE' });
      onDelete(task.id);
      onClose();
    } catch (err) {
      console.error(err);
      alert('שגיאה במחיקה');
    }
  }

  async function handleAddComment() {
    if (!task || !newComment.trim()) return;
    try {
      await apiFetch(`/admin/dev/tasks/${task.id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ comment: newComment.trim() }),
      });
      setNewComment('');
      loadComments();
    } catch (err) {
      console.error(err);
      alert('שגיאה בהוספת תגובה');
    }
  }

  function updateField(field: keyof DevTask, value: any) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>עריכת משימה</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 border-b border-slate-600 mb-4">
          {[
            { id: 'details', label: 'פרטים', icon: null },
            { id: 'planning', label: 'תכנון', icon: CalendarIcon },
            { id: 'nexus', label: '📄 Nexus', icon: null },
            { id: 'activity', label: 'פעילות', icon: MessageSquare },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              {t.icon && <t.icon className="w-4 h-4 inline-block ml-2" />}
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-1">
          {tab === 'details' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">כותרת</label>
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={(e) => updateField('title', e.target.value)}
                  className="admin-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">תיאור</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => updateField('description', e.target.value)}
                  rows={6}
                  className="admin-input"
                  placeholder="תאר את המשימה..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">עדיפות</label>
                  <select
                    value={formData.priority || 'medium'}
                    onChange={(e) => updateField('priority', e.target.value)}
                    className="admin-input"
                  >
                    <option value="low">נמוכה (Low)</option>
                    <option value="medium">בינונית (Medium)</option>
                    <option value="high">גבוהה (High)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">קטגוריה</label>
                  <select
                    value={formData.category || ''}
                    onChange={(e) => updateField('category', e.target.value)}
                    className="admin-input"
                  >
                    <option value="">ללא קטגוריה</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {tab === 'planning' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  אחראי (Assignee)
                </label>
                <input
                  type="text"
                  value={formData.assignee || ''}
                  onChange={(e) => updateField('assignee', e.target.value)}
                  placeholder="שם המפתח..."
                  className="admin-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  תאריך יעד
                </label>
                <input
                  type="date"
                  value={formData.dueDate ? new Date(formData.dueDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => updateField('dueDate', e.target.value || null)}
                  className="admin-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    הערכת שעות
                  </label>
                  <input
                    type="number"
                    value={formData.estimateHours || ''}
                    onChange={(e) => updateField('estimateHours', e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="0"
                    min="0"
                    className="admin-input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    שעות בפועל
                  </label>
                  <input
                    type="number"
                    value={formData.actualHours || ''}
                    onChange={(e) => updateField('actualHours', e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="0"
                    min="0"
                    className="admin-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  תגיות (Labels)
                </label>
                <input
                  type="text"
                  value={(formData.labels || []).join(', ')}
                  onChange={(e) => updateField('labels', e.target.value.split(',').map((l) => l.trim()).filter(Boolean))}
                  placeholder="bug, feature, flag:blocked, flag:needs-review..."
                  className="admin-input"
                />
                <p className="text-xs text-slate-500 mt-1">הפרד בפסיקים. דגלים: flag:blocked, flag:needs-review</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  רמת סיכון
                </label>
                <select
                  value={formData.riskLevel || ''}
                  onChange={(e) => updateField('riskLevel', e.target.value || null)}
                  className="admin-input"
                >
                  {RISK_LEVELS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {tab === 'nexus' && (
            <div className="space-y-3">
              {loadingNexus ? (
                <div className="flex items-center gap-2 text-slate-400 py-8 justify-center">
                  <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">טוען מסמכי Nexus...</span>
                </div>
              ) : !nexusDocs || !nexusDocs.briefId ? (
                <div className="text-center py-12 text-slate-500">
                  <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">משימה זו לא מקושרת למחקר Nexus</p>
                  <p className="text-xs mt-1 opacity-60">רק משימות שנוצרו דרך Nexus Brief מכילות מסמכים</p>
                </div>
              ) : (
                <>
                  <div className="p-3 rounded-lg bg-indigo-900/20 border border-indigo-500/30 mb-3">
                    <p className="text-xs text-indigo-400 font-semibold mb-1">📋 מקור: מחקר Nexus</p>
                    <p className="text-sm text-slate-200 font-medium">{nexusDocs.briefTitle}</p>
                    {nexusDocs.ideaPrompt && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{nexusDocs.ideaPrompt}</p>
                    )}
                  </div>
                  {nexusDocs.docs.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">אין מסמכים שנוצרו עדיין</p>
                  ) : (
                    <div className="space-y-2">
                      {nexusDocs.docs.map((doc) => (
                        <div key={doc.id} className="border border-slate-700 rounded-lg overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setExpandedDoc(expandedDoc === doc.id ? null : doc.id)}
                            className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/60 hover:bg-slate-700/60 transition-colors text-left"
                          >
                            <span className="text-sm font-medium text-slate-200">
                              {doc.title || doc.doc_type}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); copyDocContent(doc); }}
                                className="p-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-slate-200 transition-colors"
                                title="העתק תוכן"
                              >
                                {copiedDocId === doc.id ? <CheckIcon className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                              {expandedDoc === doc.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                            </div>
                          </button>
                          {expandedDoc === doc.id && (
                            <div className="max-h-96 overflow-y-auto p-4 bg-slate-900/50">
                              <MarkdownRenderer content={doc.content} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {tab === 'activity' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">הוסף תגובה</label>
                <div className="flex gap-2">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                    placeholder="כתוב תגובה..."
                    className="flex-1 admin-input"
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={!newComment.trim()}
                    className="px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                  >
                    שלח
                  </button>
                </div>
              </div>

              <div className="border-t border-slate-600 pt-4">
                <h3 className="text-sm font-medium text-slate-300 mb-3">תגובות ({comments.length})</h3>
                {loadingComments ? (
                  <p className="text-sm text-slate-500">טוען...</p>
                ) : comments.length === 0 ? (
                  <p className="text-sm text-slate-500">אין תגובות עדיין</p>
                ) : (
                  <div className="space-y-3">
                    {comments.map((comment) => (
                      <div key={comment.id} className="p-3 rounded-lg bg-slate-700/50 border border-slate-600">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-xs text-white">
                            {comment.adminUser?.username?.[0]?.toUpperCase() || '?'}
                          </div>
                          <span className="text-sm font-medium text-slate-300">
                            {comment.adminUser?.username || 'Unknown'}
                          </span>
                          <span className="text-xs text-slate-500 mr-auto">
                            {new Date(comment.createdAt).toLocaleString('he-IL')}
                          </span>
                        </div>
                        <p className="text-sm text-slate-400 whitespace-pre-wrap">{comment.comment}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-600">
          <button
            onClick={handleDelete}
            className="px-4 py-2.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 flex items-center gap-2 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            מחק
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="admin-btn-secondary"
            >
              ביטול
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2.5 rounded-lg bg-indigo-500 text-white hover:bg-indigo-400 flex items-center gap-2 disabled:opacity-50 shadow-md transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving ? 'שומר...' : 'שמור'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
