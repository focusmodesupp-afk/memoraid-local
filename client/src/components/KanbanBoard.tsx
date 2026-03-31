import React, { useState } from 'react';
import { CheckCircle, Circle, Clock, XCircle, Plus, Trash2, Check } from 'lucide-react';

type TaskStatus = 'todo' | 'in_progress' | 'done' | 'stuck' | 'postponed' | 'cancelled' | 'scheduled' | 'requested';

export type KanbanTask = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: string | null;
  assignedToUserId?: string | null;
  assignedToName?: string | null;
  assignedToColor?: string | null;
  coAssignees?: { id: string; name: string; color: string }[];
  checklistTotal?: number;
  checklistDone?: number;
};

type KanbanBoardProps = {
  tasks: KanbanTask[];
  onTaskMove?: (taskId: string, newStatus: TaskStatus) => void;
  onTaskClick?: (task: KanbanTask) => void;
  onAddTask?: (status: TaskStatus) => void;
  onDeleteTask?: (taskId: string) => void;
  // Bulk select
  selectedIds?: Set<string>;
  onSelectTask?: (taskId: string) => void;
};

const COLUMNS: { status: TaskStatus; label: string; icon: React.ComponentType<any>; color: string }[] = [
  { status: 'todo',        label: 'לביצוע',   icon: Circle,      color: 'slate' },
  { status: 'in_progress', label: 'בביצוע',   icon: Clock,       color: 'blue'  },
  { status: 'done',        label: 'הושלם',    icon: CheckCircle, color: 'green' },
  { status: 'stuck',       label: 'תקוע',     icon: XCircle,     color: 'red'   },
];

function UserAvatar({ name, color, size = 'sm' }: { name: string; color: string; size?: 'sm' | 'xs' }) {
  const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  const dim = size === 'xs' ? 'w-4 h-4 text-[9px]' : 'w-5 h-5 text-[10px]';
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-bold text-white shrink-0 ${dim}`}
      style={{ backgroundColor: color }}
      title={name}
    >
      {initials}
    </span>
  );
}

export default function KanbanBoard({
  tasks, onTaskMove, onTaskClick, onAddTask, onDeleteTask,
  selectedIds, onSelectTask,
}: KanbanBoardProps) {
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const hasSelection = (selectedIds?.size ?? 0) > 0;

  function handleDragStart(e: React.DragEvent, taskId: string) {
    if (hasSelection) return; // disable drag when in select mode
    setDraggedTask(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
  }

  function handleDragEnd() {
    setDraggedTask(null);
    setDragOverColumn(null);
  }

  function handleDragOver(e: React.DragEvent, status: TaskStatus) {
    if (hasSelection) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(status);
  }

  function handleDragLeave() {
    setDragOverColumn(null);
  }

  function handleDrop(e: React.DragEvent, newStatus: TaskStatus) {
    e.preventDefault();
    if (hasSelection) return;
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId && taskId !== draggedTask) return;
    if (draggedTask) {
      const task = tasks.find((t) => t.id === draggedTask);
      if (task && task.status !== newStatus) {
        onTaskMove?.(draggedTask, newStatus);
      }
    }
    setDraggedTask(null);
    setDragOverColumn(null);
  }

  function getPriorityStripe(priority: string) {
    if (priority === 'urgent') return 'border-r-4 border-r-red-600';
    if (priority === 'high')   return 'border-r-4 border-r-orange-500';
    if (priority === 'medium') return 'border-r-4 border-r-amber-400';
    return 'border-r-4 border-r-slate-300';
  }

  function handleDeleteClick(e: React.MouseEvent, taskId: string) {
    e.stopPropagation();
    setConfirmDeleteId(taskId);
  }

  function confirmDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (confirmDeleteId && onDeleteTask) onDeleteTask(confirmDeleteId);
    setConfirmDeleteId(null);
  }

  function cancelDelete(e: React.MouseEvent) {
    e.stopPropagation();
    setConfirmDeleteId(null);
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {COLUMNS.map((column) => {
        const columnTasks = tasks.filter((t) => t.status === column.status);
        const Icon = column.icon;
        const isOver = dragOverColumn === column.status;

        return (
          <div
            key={column.status}
            className={`rounded-xl border transition-colors ${
              isOver ? 'border-blue-500 bg-blue-500/5' : 'border-[hsl(var(--border))] bg-[hsl(var(--card))]'
            }`}
            onDragOver={(e) => handleDragOver(e, column.status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.status)}
          >
            {/* Column header */}
            <div className="p-4 border-b border-[hsl(var(--border))]">
              <div className="flex items-center gap-2">
                <Icon className={`w-5 h-5 text-${column.color}-500`} />
                <h3 className="font-semibold text-[hsl(var(--foreground))]">{column.label}</h3>
                <span className="text-sm text-[hsl(var(--muted-foreground))]">{columnTasks.length}</span>
                {onAddTask && !hasSelection && (
                  <button
                    type="button"
                    onClick={() => onAddTask(column.status)}
                    className="mr-auto h-6 w-6 flex items-center justify-center rounded-md text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] transition-colors"
                    aria-label={`הוסף משימה ל${column.label}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Cards */}
            <div className="p-3 space-y-2 min-h-[200px]">
              {columnTasks.length === 0 && (
                <p className="text-center text-sm text-[hsl(var(--muted-foreground))] py-8">אין משימות</p>
              )}

              {columnTasks.map((task) => {
                const isDeleting = confirmDeleteId === task.id;
                const isSelected = selectedIds?.has(task.id) ?? false;
                const allAssignees = [
                  ...(task.assignedToUserId && task.assignedToName
                    ? [{ id: task.assignedToUserId, name: task.assignedToName, color: task.assignedToColor ?? '#6366f1' }]
                    : []),
                  ...(task.coAssignees ?? []),
                ];
                const hasChecklist = (task.checklistTotal ?? 0) > 0;
                const checkPct = hasChecklist
                  ? Math.round(((task.checklistDone ?? 0) / (task.checklistTotal ?? 1)) * 100)
                  : 0;

                return (
                  <div
                    key={task.id}
                    draggable={!isDeleting && !hasSelection}
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => {
                      if (isDeleting) return;
                      // If anything is selected, clicking the body also toggles
                      if (hasSelection) { onSelectTask?.(task.id); return; }
                      onTaskClick?.(task);
                    }}
                    className={`group relative p-3 rounded-lg border transition-all ${getPriorityStripe(task.priority)} ${
                      isSelected
                        ? 'bg-[hsl(var(--primary))]/8 border-[hsl(var(--primary))]/40'
                        : 'bg-[hsl(var(--background))] border-[hsl(var(--border))] hover:shadow-md'
                    } ${
                      draggedTask === task.id ? 'opacity-50 scale-95' : 'opacity-100'
                    } ${!isDeleting ? (hasSelection ? 'cursor-pointer' : 'cursor-move') : 'cursor-default'}`}
                  >
                    {/* ── Circle select button (always accessible on hover, always visible when selected) ── */}
                    {!isDeleting && onSelectTask && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onSelectTask(task.id); }}
                        className={`absolute top-2.5 left-2.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all z-10 ${
                          isSelected
                            ? 'bg-[hsl(var(--primary))] border-[hsl(var(--primary))] opacity-100'
                            : 'bg-[hsl(var(--background))] border-[hsl(var(--muted-foreground))]/40 opacity-0 group-hover:opacity-100'
                        } ${hasSelection ? 'opacity-100' : ''}`}
                        title={isSelected ? 'בטל בחירה' : 'בחר משימה'}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 text-white font-bold" />}
                      </button>
                    )}

                    {isDeleting ? (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-[hsl(var(--destructive))]">מחק משימה זו?</p>
                        <p className="text-[11px] text-[hsl(var(--muted-foreground))] line-clamp-1">{task.title}</p>
                        <div className="flex gap-2">
                          <button type="button" onClick={confirmDelete}
                            className="flex-1 text-[11px] bg-[hsl(var(--destructive))] text-white rounded px-2 py-1 hover:opacity-90">
                            מחק
                          </button>
                          <button type="button" onClick={cancelDelete}
                            className="flex-1 text-[11px] border border-[hsl(var(--border))] rounded px-2 py-1 hover:bg-[hsl(var(--muted))]">
                            בטל
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Title row — padded right to leave room for circle on hover */}
                        <div className={`flex items-start justify-between gap-1 mb-1 ${onSelectTask ? 'ps-1' : ''}`}>
                          <h4 className={`font-medium text-sm leading-snug flex-1 transition-colors ${
                            isSelected ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--foreground))]'
                          }`}>
                            {task.title}
                          </h4>
                          {!hasSelection && onDeleteTask && (
                            <button
                              type="button"
                              onClick={(e) => handleDeleteClick(e, task.id)}
                              className="opacity-0 group-hover:opacity-100 h-5 w-5 flex items-center justify-center rounded text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))]/10 shrink-0 transition-all"
                              title="מחק משימה"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        {task.description && (
                          <p className="text-xs text-[hsl(var(--muted-foreground))] line-clamp-2 mb-2">
                            {task.description.replace(/\[.*?\]/g, '').trim()}
                          </p>
                        )}

                        {/* Checklist progress */}
                        {hasChecklist && (
                          <div className="mb-2">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                                {task.checklistDone}/{task.checklistTotal} פריטים
                              </span>
                              <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{checkPct}%</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-[hsl(var(--muted))]">
                              <div
                                className="h-1.5 rounded-full bg-[hsl(var(--primary))] transition-all"
                                style={{ width: `${checkPct}%` }}
                              />
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          {allAssignees.length > 0 ? (
                            <div className="flex items-center -space-x-1 rtl:space-x-reverse">
                              {allAssignees.slice(0, 3).map((a) => (
                                <UserAvatar key={a.id} name={a.name} color={a.color} size="xs" />
                              ))}
                              {allAssignees.length > 3 && (
                                <span className="text-[9px] text-[hsl(var(--muted-foreground))] mr-1">+{allAssignees.length - 3}</span>
                              )}
                            </div>
                          ) : <span />}
                          {task.dueDate && (
                            <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
                              {new Date(task.dueDate).toLocaleDateString('he-IL')}
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
