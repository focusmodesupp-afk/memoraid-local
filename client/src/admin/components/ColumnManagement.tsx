import React, { useState } from 'react';
import { Plus, Edit2, Trash2, GripVertical, Check, X } from 'lucide-react';
import { apiFetch } from '../../lib/api';

type DevColumn = {
  id: string;
  name: string;
  position: number;
  color: string | null;
};

type ColumnManagementProps = {
  columns: DevColumn[];
  onColumnsChange: () => void;
};

const COLORS = [
  { name: 'slate', label: 'אפור', class: 'bg-slate-600' },
  { name: 'blue', label: 'כחול', class: 'bg-blue-600' },
  { name: 'green', label: 'ירוק', class: 'bg-green-600' },
  { name: 'amber', label: 'כתום', class: 'bg-amber-600' },
  { name: 'red', label: 'אדום', class: 'bg-red-600' },
  { name: 'purple', label: 'סגול', class: 'bg-purple-600' },
  { name: 'cyan', label: 'תכלת', class: 'bg-cyan-600' },
  { name: 'pink', label: 'ורוד', class: 'bg-pink-600' },
];

export default function ColumnManagement({ columns, onColumnsChange }: ColumnManagementProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('slate');
  const [draggedId, setDraggedId] = useState<string | null>(null);

  async function handleAddColumn() {
    if (!newName.trim()) return;
    try {
      await apiFetch('/admin/dev/columns', {
        method: 'POST',
        body: JSON.stringify({ name: newName.trim(), color: newColor }),
      });
      setNewName('');
      setNewColor('slate');
      setShowAdd(false);
      onColumnsChange();
    } catch (err) {
      console.error(err);
      alert('שגיאה בהוספת עמודה');
    }
  }

  async function handleEditColumn(id: string, name: string, color: string) {
    try {
      await apiFetch(`/admin/dev/columns/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name, color }),
      });
      setEditingId(null);
      onColumnsChange();
    } catch (err) {
      console.error(err);
      alert('שגיאה בעדכון עמודה');
    }
  }

  async function handleDeleteColumn(id: string) {
    if (!confirm('למחוק עמודה זו? המשימות בה יועברו ל-Backlog')) return;
    try {
      await apiFetch(`/admin/dev/columns/${id}`, { method: 'DELETE' });
      onColumnsChange();
    } catch (err) {
      console.error(err);
      alert('שגיאה במחיקת עמודה');
    }
  }

  function handleDragStart(e: React.DragEvent, id: string) {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  async function handleDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    const draggedIndex = columns.findIndex((c) => c.id === draggedId);
    const targetIndex = columns.findIndex((c) => c.id === targetId);

    const reordered = [...columns];
    const [removed] = reordered.splice(draggedIndex, 1);
    reordered.splice(targetIndex, 0, removed);

    const order = reordered.map((c) => c.id);

    try {
      await apiFetch('/admin/dev/columns/reorder', {
        method: 'POST',
        body: JSON.stringify({ order }),
      });
      onColumnsChange();
    } catch (err) {
      console.error(err);
      alert('שגיאה בסידור מחדש');
    } finally {
      setDraggedId(null);
    }
  }

  return (
    <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-100">ניהול עמודות</h3>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-3 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-sm flex items-center gap-2 shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          הוסף עמודה
        </button>
      </div>

      {showAdd && (
        <div className="mb-4 p-3 rounded-lg bg-slate-900 border border-slate-700">
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="שם העמודה..."
              className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => e.key === 'Enter' && handleAddColumn()}
            />
            <select
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {COLORS.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddColumn}
              disabled={!newName.trim()}
              className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setShowAdd(false);
                setNewName('');
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {columns.map((col) => (
          <div
            key={col.id}
            draggable
            onDragStart={(e) => handleDragStart(e, col.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.id)}
            className={`p-3 rounded-lg bg-slate-900 border border-slate-700 flex items-center gap-3 cursor-move hover:border-slate-600 transition-colors ${
              draggedId === col.id ? 'opacity-50' : ''
            }`}
          >
            <GripVertical className="w-5 h-5 text-slate-500" />
            <div
              className={`w-3 h-3 rounded-full ${
                COLORS.find((c) => c.name === col.color)?.class || 'bg-slate-600'
              }`}
            />
            {editingId === col.id ? (
              <>
                <input
                  type="text"
                  defaultValue={col.name}
                  id={`edit-${col.id}`}
                  className="flex-1 px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-100 text-sm"
                />
                <select
                  defaultValue={col.color || 'slate'}
                  id={`color-${col.id}`}
                  className="px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-100 text-sm"
                >
                  {COLORS.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    const nameInput = document.getElementById(`edit-${col.id}`) as HTMLInputElement;
                    const colorSelect = document.getElementById(`color-${col.id}`) as HTMLSelectElement;
                    handleEditColumn(col.id, nameInput.value, colorSelect.value);
                  }}
                  className="p-1.5 rounded bg-green-600 hover:bg-green-500 text-white"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="p-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm text-slate-200">{col.name}</span>
                <button
                  onClick={() => setEditingId(col.id)}
                  className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-300"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteColumn(col.id)}
                  className="p-1.5 rounded hover:bg-red-600/20 text-red-400 hover:text-red-300"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
