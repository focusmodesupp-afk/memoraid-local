import React, { useState, useEffect } from 'react';
import { Save, Calendar, Target } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './AdminDialog';
import { apiFetch } from '../../lib/api';

type Sprint = {
  id: string;
  name: string;
  goal: string | null;
  startDate: string;
  endDate: string;
  status: 'planning' | 'active' | 'completed';
  velocity: string | null;
  phaseId?: string | null;
};

type EditSprintModalProps = {
  open: boolean;
  sprint: Sprint | null;
  onClose: () => void;
  onSuccess: () => void;
};

type Phase = { id: string; name: string; status: string };

export default function EditSprintModal({ open, sprint, onClose, onSuccess }: EditSprintModalProps) {
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<'planning' | 'active' | 'completed'>('planning');
  const [phaseId, setPhaseId] = useState<string>('');
  const [phases, setPhases] = useState<Phase[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      apiFetch<Phase[]>('/admin/phases').then(setPhases).catch(() => setPhases([]));
    }
  }, [open]);

  useEffect(() => {
    if (sprint) {
      setName(sprint.name);
      setGoal(sprint.goal || '');
      setStartDate(sprint.startDate.slice(0, 10));
      setEndDate(sprint.endDate.slice(0, 10));
      setStatus(sprint.status);
      setPhaseId(sprint.phaseId || '');
    }
  }, [sprint, open]);

  function handleClose() {
    onClose();
  }

  async function handleSave() {
    if (!sprint || !name || !startDate || !endDate) {
      alert('נא למלא שם, תאריך התחלה וסיום');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end <= start) {
      alert('תאריך הסיום חייב להיות אחרי תאריך ההתחלה');
      return;
    }

    setSaving(true);
    try {
      await apiFetch(`/admin/sprints/${sprint.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: name.trim(),
          goal: goal.trim() || null,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          status,
          phaseId: phaseId || null,
        }),
      });
      handleClose();
      onSuccess();
    } catch (err) {
      console.error(err);
      alert('שגיאה בעדכון ספרינט');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>עריכת ספרינט</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">שם הספרינט *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sprint 12: Calendar Integration"
              className="admin-input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
              <Target className="w-4 h-4" />
              מטרת הספרינט
            </label>
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              rows={3}
              placeholder="להשלים אינטגרציה עם Google Calendar..."
              className="admin-input"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                תאריך התחלה *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="admin-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                תאריך סיום *
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="admin-input"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">סטטוס</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'planning' | 'active' | 'completed')}
              className="admin-input"
            >
              <option value="planning">בתכנון</option>
              <option value="active">פעיל</option>
              <option value="completed">הושלם</option>
            </select>
          </div>

          {phases.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Phase מקושר (מתוכנית עבודה)</label>
              <select
                value={phaseId}
                onChange={(e) => setPhaseId(e.target.value)}
                className="admin-input"
              >
                <option value="">— ללא —</option>
                {phases.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">קישור Phase 5b לספרינט Plans יאפשר ניווט נכון מתוכנית עבודה</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-600">
          <button
            onClick={handleClose}
            className="admin-btn-secondary"
          >
            ביטול
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name || !startDate || !endDate}
            className="px-4 py-2.5 rounded-lg bg-indigo-500 text-white hover:bg-indigo-400 shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? 'שומר...' : 'שמור שינויים'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
