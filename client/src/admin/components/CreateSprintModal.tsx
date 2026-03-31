import React, { useState } from 'react';
import { X, Save, Calendar, Target } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './AdminDialog';
import { apiFetch } from '../../lib/api';

type CreateSprintModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export default function CreateSprintModal({ open, onClose, onSuccess }: CreateSprintModalProps) {
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);

  function handleClose() {
    setName('');
    setGoal('');
    setStartDate('');
    setEndDate('');
    onClose();
  }

  async function handleSave() {
    if (!name || !startDate || !endDate) {
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
      await apiFetch('/admin/sprints', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          goal: goal.trim() || null,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        }),
      });
      handleClose();
      onSuccess();
    } catch (err) {
      console.error(err);
      alert('שגיאה ביצירת ספרינט');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>ספרינט חדש</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              שם הספרינט *
            </label>
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
              placeholder="להשלים אינטגרציה עם Google Calendar ו-Outlook..."
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

          <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/30">
            <p className="text-sm text-indigo-300">
              💡 טיפ: ספרינט טיפוסי הוא 2 שבועות (14 ימים)
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-700">
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
            {saving ? 'יוצר...' : 'צור ספרינט'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
