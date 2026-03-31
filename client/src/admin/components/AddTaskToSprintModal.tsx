import React, { useState, useEffect } from 'react';
import { Plus, ListTodo } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './AdminDialog';
import { apiFetch } from '../../lib/api';

type DevTask = {
  id: string;
  title: string;
  description: string | null;
  columnId: string | null;
  priority: string;
  category: string | null;
};

type AddTaskToSprintModalProps = {
  open: boolean;
  sprintId: string;
  sprintName: string;
  existingTaskIds: string[];
  onClose: () => void;
  onSuccess: () => void;
};

export default function AddTaskToSprintModal({
  open,
  sprintId,
  sprintName,
  existingTaskIds,
  onClose,
  onSuccess,
}: AddTaskToSprintModalProps) {
  const [tasks, setTasks] = useState<DevTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => {
    if (open) loadTasks();
  }, [open, sprintId]);

  async function loadTasks() {
    setLoading(true);
    try {
      const all = await apiFetch<DevTask[]>('/admin/dev/tasks');
      setTasks(all);
    } catch (err) {
      console.error(err);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(taskId: string) {
    setAdding(taskId);
    try {
      await apiFetch(`/admin/sprints/${sprintId}/tasks`, {
        method: 'POST',
        body: JSON.stringify({ taskId }),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      alert(err?.message || 'שגיאה בהוספת משימה');
    } finally {
      setAdding(null);
    }
  }

  const availableTasks = tasks.filter((t) => !existingTaskIds.includes(t.id));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListTodo className="w-5 h-5" />
            הוסף משימה לספרינט: {sprintName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-2">
          {loading ? (
            <p className="text-slate-400 text-center py-8">טוען משימות...</p>
          ) : availableTasks.length === 0 ? (
            <div className="text-center py-8 rounded-lg admin-card">
              <p className="text-slate-400">אין משימות זמינות להוספה</p>
              <p className="text-sm text-slate-500 mt-1">
                כל המשימות כבר בספרינט, או צור משימה חדשה בקנבאן
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {availableTasks.map((task) => (
                <li
                  key={task.id}
                  className="flex items-center justify-between p-3 rounded-lg admin-card hover:border-slate-600 transition-colors"
                >
                  <div>
                    <span className="font-medium text-slate-200">{task.title}</span>
                    {task.category && (
                      <span className="mr-2 text-xs text-slate-500">• {task.category}</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleAdd(task.id)}
                    disabled={adding === task.id}
                    className="px-3 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-sm flex items-center gap-2 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    {adding === task.id ? 'מוסיף...' : 'הוסף'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-sm text-slate-500 mt-2">
          💡 אפשר גם ליצור משימה חדשה בקנבאן ולאחר מכן להוסיף אותה לספרינט מכאן
        </p>
      </DialogContent>
    </Dialog>
  );
}
