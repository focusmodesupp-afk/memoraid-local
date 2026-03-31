import React from 'react';
import { MessageSquare, Calendar, Clock, User, Sparkles, Flag, Check } from 'lucide-react';

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
  dueDate: string | null;
  position: number;
  sprintName?: string | null;
  phaseName?: string | null;
  riskLevel?: string | null;
  aiGenerated?: boolean | null;
};

type TaskCardProps = {
  task: DevTask;
  onClick: () => void;
  onStartDev: (task: DevTask) => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
  highlightAsSprintTask?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  selectionMode?: boolean;
};

export default function TaskCard({
  task,
  onClick,
  onStartDev,
  draggable = true,
  onDragStart,
  onDragEnd,
  isDragging = false,
  highlightAsSprintTask = false,
  isSelected = false,
  onSelect,
  selectionMode = false,
}: TaskCardProps) {
  function getPriorityBadge(priority: string) {
    if (priority === 'high') return 'bg-red-500/20 text-red-400 border-red-500/30';
    if (priority === 'medium') return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    return 'bg-slate-600/20 text-slate-400 border-slate-600/30';
  }

  function getCategoryColor(category: string | null) {
    if (!category) return 'bg-slate-500/20 text-slate-400';
    const colors: Record<string, string> = {
      plans: 'bg-teal-500/20 text-teal-400',
      email: 'bg-purple-500/20 text-purple-400',
      calendar: 'bg-blue-500/20 text-blue-400',
      admin: 'bg-green-500/20 text-green-400',
      testing: 'bg-amber-500/20 text-amber-400',
      optimization: 'bg-cyan-500/20 text-cyan-400',
      ai: 'bg-pink-500/20 text-pink-400',
      mobile: 'bg-indigo-500/20 text-indigo-400',
      security: 'bg-red-500/20 text-red-400',
      performance: 'bg-orange-500/20 text-orange-400',
    };
    return colors[category] || 'bg-slate-500/20 text-slate-400';
  }

  function handleStartDev(e: React.MouseEvent) {
    e.stopPropagation();
    onStartDev(task);
  }

  function getDaysUntilDue(): { days: number; isOverdue: boolean; isUrgent: boolean } | null {
    if (!task.dueDate) return null;
    const due = new Date(task.dueDate);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return {
      days: Math.abs(diffDays),
      isOverdue: diffDays < 0,
      isUrgent: diffDays >= 0 && diffDays <= 2,
    };
  }

  const dueDateInfo = getDaysUntilDue();

  const displaySprint = task.sprintName || task.phaseName;
  const flagLabels = (task.labels ?? []).filter((l) => String(l).startsWith('flag:'));
  const regularLabels = (task.labels ?? []).filter((l) => !String(l).startsWith('flag:'));

  return (
    <div
      draggable={draggable && !selectionMode}
      onDragStart={!selectionMode ? onDragStart : undefined}
      onDragEnd={!selectionMode ? onDragEnd : undefined}
      onClick={selectionMode ? () => onSelect?.(task.id) : undefined}
      className={`group relative p-3 rounded-lg bg-slate-900 border-2 transition-all ${
        isSelected
          ? 'border-indigo-500 bg-indigo-900/20 ring-1 ring-indigo-500/40'
          : highlightAsSprintTask
          ? 'border-purple-500/60 bg-purple-900/10 ring-1 ring-purple-500/30'
          : dueDateInfo?.isOverdue
          ? 'border-red-500/50 bg-red-900/10'
          : dueDateInfo?.isUrgent
          ? 'border-amber-500/50 bg-amber-900/10'
          : 'border-slate-700'
      } ${isDragging ? 'opacity-50 scale-95' : 'opacity-100 hover:border-slate-600'} ${selectionMode ? 'cursor-pointer' : ''}`}
    >
      {/* Selection circle */}
      {onSelect && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onSelect(task.id); }}
          className={`absolute top-2 right-2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all z-20 ${
            isSelected
              ? 'bg-indigo-500 border-indigo-400 opacity-100'
              : 'bg-slate-800 border-slate-500 opacity-0 group-hover:opacity-100'
          } ${selectionMode ? 'opacity-100' : ''}`}
          title={isSelected ? 'בטל בחירה' : 'בחר'}
        >
          {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
        </button>
      )}
      {/* Deadline Badge - Outside card, top right */}
      {dueDateInfo && (
        <div className={`absolute -top-2 -right-2 px-2 py-1 rounded-full text-xs font-bold shadow-lg ${
          dueDateInfo.isOverdue 
            ? 'bg-red-500 text-white animate-pulse' 
            : dueDateInfo.isUrgent 
            ? 'bg-amber-500 text-white'
            : 'bg-blue-500 text-white'
        }`}>
          {dueDateInfo.isOverdue ? `🔥 +${dueDateInfo.days}d` : `⏰ ${dueDateInfo.days}d`}
        </div>
      )}

      {/* Priority indicator - left edge */}
      <div className={`absolute right-0 top-0 bottom-0 w-1 rounded-r-lg ${
        task.priority === 'high' ? 'bg-red-500' : task.priority === 'medium' ? 'bg-amber-500' : 'bg-slate-600'
      }`} />

      {/* Nexus AI badge */}
      {task.aiGenerated && (
        <div className="absolute -top-2 -left-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-600 text-white shadow-lg z-10">
          <Sparkles className="w-3 h-3" />
          Nexus
        </div>
      )}

      {/* Main clickable area */}
      <div onClick={onClick} className="cursor-pointer">
        <div className={`flex items-start justify-between mb-2 ${onSelect ? 'pr-6' : ''}`}>
          <h4 className="font-medium text-sm text-slate-100 flex-1 pr-1">
            {(task as any)._displayIndex && (
              <span className="text-[10px] font-mono text-slate-500 mr-1">#{(task as any)._displayIndex}</span>
            )}
            {task.title}
          </h4>
          {task.estimateHours && (
            <div className="flex items-center gap-1 text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
              <Clock className="w-3 h-3" />
              <span>{task.estimateHours}h</span>
            </div>
          )}
        </div>

        {task.description && (
          <p className="text-xs text-slate-400 mb-3 line-clamp-2">{task.description}</p>
        )}

        {(displaySprint || task.riskLevel) && (
          <div className="flex items-center gap-2 flex-wrap mb-2">
            {displaySprint && (
              <span className="px-2 py-0.5 rounded text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {task.sprintName || task.phaseName}
              </span>
            )}
            {task.riskLevel && (
              <span className="px-2 py-0.5 rounded text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30">
                סיכון: {task.riskLevel}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            {task.category && (
              <span className={`px-2 py-0.5 rounded text-xs ${getCategoryColor(task.category)}`}>
                {task.category}
              </span>
            )}
            {regularLabels.map((label) => (
              <span key={label} className="px-2 py-0.5 rounded text-xs bg-slate-600/30 text-slate-300">
                {label}
              </span>
            ))}
            {flagLabels.map((label) => (
              <span key={label} className="px-2 py-0.5 rounded text-xs bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center gap-1">
                <Flag className="w-3 h-3" />
                {String(label).replace(/^flag:/, '')}
              </span>
            ))}
          </div>
          
          {task.assignee && (
            <div className="flex items-center gap-1 text-xs font-medium text-slate-200 bg-slate-700/80 px-2.5 py-1 rounded border border-slate-600/50">
              <User className="w-3.5 h-3.5" />
              <span>{task.assignee}</span>
            </div>
          )}
        </div>
      </div>

      {/* Start Dev button — always visible */}
      <button
        onClick={handleStartDev}
        className="w-full mt-2 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-500/40 border border-indigo-500/30 text-indigo-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
      >
        🚀 התחל פיתוח
      </button>
    </div>
  );
}
