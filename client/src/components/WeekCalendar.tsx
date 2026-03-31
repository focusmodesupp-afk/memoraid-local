import React, { useMemo, useRef, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react';

export type BusySlot = { start: string; end: string };
export type AvailabilityEntry = { userId: string; fullName: string; busy: BusySlot[] };
export type CalendarTask = {
  id: string;
  title: string;
  status: string;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  dueDate?: string | null;
  assignedToUserId?: string | null;
};

export type SlotClickPayload = {
  date: Date;
  hour: number;
  minute: number;
};

export type TaskDropPayload = {
  taskId: string;
  newStart: Date;
  newEnd: Date;
};

interface WeekCalendarProps {
  weekStart: Date;
  availability: AvailabilityEntry[];
  tasks: CalendarTask[];
  loading?: boolean;
  onSlotClick: (payload: SlotClickPayload) => void;
  onTaskDrop?: (payload: TaskDropPayload) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  dir?: 'rtl' | 'ltr';
  lang?: string;
}

// Palette for up to 8 users (hsl values matching the design tokens style)
const USER_COLORS = [
  { bg: 'rgba(124,58,237,0.18)', border: 'rgba(124,58,237,0.6)', text: '#6d28d9' },
  { bg: 'rgba(6,182,212,0.18)',  border: 'rgba(6,182,212,0.6)',  text: '#0e7490' },
  { bg: 'rgba(234,88,12,0.18)',  border: 'rgba(234,88,12,0.6)',  text: '#c2410c' },
  { bg: 'rgba(22,163,74,0.18)',  border: 'rgba(22,163,74,0.6)',  text: '#15803d' },
  { bg: 'rgba(219,39,119,0.18)', border: 'rgba(219,39,119,0.6)', text: '#be185d' },
  { bg: 'rgba(37,99,235,0.18)',  border: 'rgba(37,99,235,0.6)',  text: '#1d4ed8' },
  { bg: 'rgba(202,138,4,0.18)',  border: 'rgba(202,138,4,0.6)',  text: '#a16207' },
  { bg: 'rgba(20,184,166,0.18)', border: 'rgba(20,184,166,0.6)', text: '#0f766e' },
];

const TASK_COLOR = { bg: 'rgba(124,58,237,0.25)', border: 'rgba(124,58,237,0.8)', text: '#5b21b6' };
const REQUESTED_COLOR = { bg: 'rgba(234,179,8,0.2)', border: 'rgba(234,179,8,0.7)', text: '#92400e' };

const DAY_START_H = 7;
const DAY_END_H = 22;
const SLOT_MIN = 30;
const TOTAL_SLOTS = ((DAY_END_H - DAY_START_H) * 60) / SLOT_MIN;
const SLOT_PX = 44;

function timeToSlot(date: Date): number {
  const h = date.getHours();
  const m = date.getMinutes();
  return ((h - DAY_START_H) * 60 + m) / SLOT_MIN;
}

function formatHour(hour: number) {
  return `${String(hour).padStart(2, '0')}:00`;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

export default function WeekCalendar({
  weekStart,
  availability,
  tasks,
  loading,
  onSlotClick,
  onTaskDrop,
  onPrevWeek,
  onNextWeek,
  onToday,
  dir = 'rtl',
  lang = 'he',
}: WeekCalendarProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const isHe = lang === 'he';

  // Build the 7 days of the week
  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  // Map userId → color index
  const userColorMap = useMemo(() => {
    const map: Record<string, number> = {};
    availability.forEach((entry, idx) => {
      map[entry.userId] = idx % USER_COLORS.length;
    });
    return map;
  }, [availability]);

  // Hidden user state
  const [hiddenUsers, setHiddenUsers] = useState<Set<string>>(new Set());

  // Drag-and-drop state
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<{ dayIdx: number; slotIdx: number } | null>(null);
  const dragOffsetSlots = useRef(0); // how many slots into the task was the grab point

  function toggleUser(userId: string) {
    setHiddenUsers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  const handleTaskDragStart = useCallback((e: React.DragEvent, task: CalendarTask) => {
    setDragTaskId(task.id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id);

    // Calculate offset: how many slots from task start was the grab
    const startStr = task.scheduledStart || task.dueDate;
    if (startStr) {
      const taskStart = new Date(startStr);
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const offsetY = e.clientY - rect.top;
      dragOffsetSlots.current = Math.floor(offsetY / SLOT_PX);
    } else {
      dragOffsetSlots.current = 0;
    }
  }, []);

  const handleCellDragOver = useCallback((e: React.DragEvent, dayIdx: number, slotIdx: number) => {
    if (!dragTaskId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverSlot({ dayIdx, slotIdx });
  }, [dragTaskId]);

  const handleCellDrop = useCallback((e: React.DragEvent, dayDate: Date, slotIdx: number) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || dragTaskId;
    if (!taskId || !onTaskDrop) return;

    const task = tasks.find((t) => t.id === taskId);
    const adjustedSlot = Math.max(0, slotIdx - dragOffsetSlots.current);
    const newStartHour = DAY_START_H + Math.floor((adjustedSlot * SLOT_MIN) / 60);
    const newStartMinute = (adjustedSlot * SLOT_MIN) % 60;

    const newStart = new Date(dayDate);
    newStart.setHours(newStartHour, newStartMinute, 0, 0);

    // Preserve task duration or default 1 hour
    let durationMs = 60 * 60 * 1000;
    if (task?.scheduledStart && task?.scheduledEnd) {
      durationMs = new Date(task.scheduledEnd).getTime() - new Date(task.scheduledStart).getTime();
    }
    const newEnd = new Date(newStart.getTime() + Math.max(durationMs, SLOT_MIN * 60 * 1000));

    onTaskDrop({ taskId, newStart, newEnd });
    setDragTaskId(null);
    setDragOverSlot(null);
  }, [dragTaskId, tasks, onTaskDrop]);

  const handleDragEnd = useCallback(() => {
    setDragTaskId(null);
    setDragOverSlot(null);
  }, []);

  const weekLabel = useMemo(() => {
    const locale = isHe ? 'he-IL' : 'en';
    const from = days[0].toLocaleDateString(locale, { day: 'numeric', month: 'short' });
    const to = days[6].toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
    return `${from} – ${to}`;
  }, [days, isHe]);

  const today = new Date();

  function handleCellClick(day: Date, slotIdx: number) {
    const hour = DAY_START_H + Math.floor((slotIdx * SLOT_MIN) / 60);
    const minute = (slotIdx * SLOT_MIN) % 60;
    const date = new Date(day);
    date.setHours(hour, minute, 0, 0);
    onSlotClick({ date, hour, minute });
  }

  // Build positioned blocks for busy slots
  function renderBusyBlocks(dayDate: Date, colIdx: number) {
    const blocks: React.ReactNode[] = [];

    availability.forEach((entry) => {
      if (hiddenUsers.has(entry.userId)) return;
      const colorIdx = userColorMap[entry.userId] ?? 0;
      const color = USER_COLORS[colorIdx];

      entry.busy.forEach((slot, slotI) => {
        const start = new Date(slot.start);
        const end = new Date(slot.end);
        if (!isSameDay(start, dayDate) && !isSameDay(end, dayDate)) return;
        // Clamp to day boundaries
        const clampStart = isSameDay(start, dayDate) ? start : new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), DAY_START_H, 0);
        const clampEnd = isSameDay(end, dayDate) ? end : new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), DAY_END_H, 0);

        const topSlot = Math.max(0, timeToSlot(clampStart));
        const endSlot = Math.min(TOTAL_SLOTS, timeToSlot(clampEnd));
        const height = (endSlot - topSlot) * SLOT_PX;
        if (height <= 0) return;

        blocks.push(
          <div
            key={`busy-${entry.userId}-${slotI}`}
            className="absolute inset-x-0.5 rounded-md overflow-hidden z-10 pointer-events-none select-none"
            style={{
              top: topSlot * SLOT_PX,
              height,
              backgroundColor: color.bg,
              borderLeft: `3px solid ${color.border}`,
            }}
          >
            <span className="text-[10px] font-medium px-1 leading-tight truncate block" style={{ color: color.text }}>
              {entry.fullName}
            </span>
          </div>
        );
      });
    });

    // Render tasks with scheduled times
    tasks.forEach((task) => {
      const startStr = task.scheduledStart || task.dueDate;
      if (!startStr) return;
      const start = new Date(startStr);
      if (!isSameDay(start, dayDate)) return;

      const endStr = task.scheduledEnd;
      const end = endStr ? new Date(endStr) : new Date(start.getTime() + 60 * 60 * 1000);

      const topSlot = Math.max(0, timeToSlot(start));
      const endSlot = Math.min(TOTAL_SLOTS, timeToSlot(end));
      const height = Math.max(SLOT_PX * 0.8, (endSlot - topSlot) * SLOT_PX);

      const isRequested = task.status === 'requested';
      const color = isRequested ? REQUESTED_COLOR : TASK_COLOR;
      const isDragging = dragTaskId === task.id;

      blocks.push(
        <div
          key={`task-${task.id}`}
          draggable={!!onTaskDrop}
          onDragStart={onTaskDrop ? (e) => handleTaskDragStart(e, task) : undefined}
          onDragEnd={onTaskDrop ? handleDragEnd : undefined}
          className={`absolute inset-x-0.5 rounded-md overflow-hidden z-20 select-none transition-opacity ${
            onTaskDrop ? 'cursor-grab active:cursor-grabbing pointer-events-auto' : 'pointer-events-none'
          } ${isDragging ? 'opacity-40' : ''}`}
          style={{
            top: topSlot * SLOT_PX,
            height,
            backgroundColor: color.bg,
            borderLeft: `3px solid ${color.border}`,
          }}
          title={isHe ? 'גרור כדי לשנות זמן' : 'Drag to reschedule'}
        >
          <span className="text-[10px] font-semibold px-1 leading-tight truncate block" style={{ color: color.text }}>
            {isRequested ? `⏳ ${task.title}` : `✓ ${task.title}`}
          </span>
        </div>
      );
    });

    return blocks;
  }

  return (
    <div dir={dir} className="flex flex-col gap-3">
      {/* Header: nav + legend */}
      <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 flex flex-wrap items-center gap-3">
        {/* Week navigation */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={dir === 'rtl' ? onNextWeek : onPrevWeek}
            aria-label={isHe ? 'שבוע קודם' : 'Previous week'}
            className="p-1.5 rounded-lg hover:bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="font-medium text-sm text-[hsl(var(--foreground))] min-w-[180px] text-center">
            {weekLabel}
          </span>
          <button
            onClick={dir === 'rtl' ? onPrevWeek : onNextWeek}
            aria-label={isHe ? 'שבוע הבא' : 'Next week'}
            className="p-1.5 rounded-lg hover:bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={onToday}
            className="px-2.5 py-1 rounded-lg text-xs bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:opacity-90"
          >
            {isHe ? 'היום' : 'Today'}
          </button>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-2 ms-auto">
          {availability.map((entry) => {
            const colorIdx = userColorMap[entry.userId] ?? 0;
            const color = USER_COLORS[colorIdx];
            const hidden = hiddenUsers.has(entry.userId);
            return (
              <button
                key={entry.userId}
                onClick={() => toggleUser(entry.userId)}
                aria-label={`${hidden ? (isHe ? 'הצג' : 'Show') : (isHe ? 'הסתר' : 'Hide')} ${entry.fullName}`}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs transition-opacity ${hidden ? 'opacity-40' : ''}`}
                style={{ backgroundColor: color.bg, border: `1px solid ${color.border}`, color: color.text }}
              >
                {hidden
                  ? <EyeOff className="w-3 h-3" />
                  : <Eye className="w-3 h-3" />
                }
                {entry.fullName}
                <span className="font-medium">
                  ({entry.busy.length})
                </span>
              </button>
            );
          })}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs" style={{ backgroundColor: TASK_COLOR.bg, border: `1px solid ${TASK_COLOR.border}`, color: TASK_COLOR.text }}>
            ✓ {isHe ? 'משימה' : 'Task'}
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs" style={{ backgroundColor: REQUESTED_COLOR.bg, border: `1px solid ${REQUESTED_COLOR.border}`, color: REQUESTED_COLOR.text }}>
            ⏳ {isHe ? 'בקשה' : 'Request'}
          </div>
        </div>
      </div>

      {/* Calendar grid */}
      <div
        className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-auto"
        style={{ maxHeight: '70vh' }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-16 text-[hsl(var(--muted-foreground))] text-sm gap-2">
            <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
            {isHe ? 'טוען...' : 'Loading...'}
          </div>
        ) : (
          <div
            ref={gridRef}
            className="grid"
            style={{ gridTemplateColumns: `52px repeat(7, minmax(100px, 1fr))` }}
          >
            {/* Day header row */}
            <div className="sticky top-0 z-30 bg-[hsl(var(--card))] border-b border-[hsl(var(--border))]" />
            {days.map((day, di) => {
              const isToday = isSameDay(day, today);
              return (
                <div
                  key={di}
                  className="sticky top-0 z-30 bg-[hsl(var(--card))] border-b border-s border-[hsl(var(--border))] p-1.5 text-center"
                >
                  <div className={`text-[11px] font-medium ${isToday ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))]'}`}>
                    {day.toLocaleDateString(isHe ? 'he-IL' : 'en', { weekday: 'short' })}
                  </div>
                  <div className={`text-base font-bold leading-tight ${isToday ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--foreground))]'}`}>
                    {day.getDate()}
                  </div>
                  {isToday && (
                    <div className="w-1.5 h-1.5 bg-[hsl(var(--primary))] rounded-full mx-auto mt-0.5" />
                  )}
                </div>
              );
            })}

            {/* Time slots */}
            {Array.from({ length: TOTAL_SLOTS }, (_, slotIdx) => {
              const hour = DAY_START_H + Math.floor((slotIdx * SLOT_MIN) / 60);
              const minute = (slotIdx * SLOT_MIN) % 60;
              const showLabel = minute === 0;

              return (
                <React.Fragment key={slotIdx}>
                  {/* Time label */}
                  <div
                    className="border-b border-[hsl(var(--border))]/50 text-[10px] text-[hsl(var(--muted-foreground))] text-end pe-1.5 pt-0.5 select-none"
                    style={{ height: SLOT_PX }}
                  >
                    {showLabel ? formatHour(hour) : ''}
                  </div>

                  {/* Day columns */}
                  {days.map((day, di) => {
                    const isToday = isSameDay(day, today);
                    const isPast = day < today && !isToday;
                    const isDragTarget = dragOverSlot?.dayIdx === di && dragOverSlot?.slotIdx === slotIdx;
                    return (
                      <div
                        key={di}
                        onClick={() => !isPast && !dragTaskId && handleCellClick(day, slotIdx)}
                        onDragOver={(e) => !isPast && handleCellDragOver(e, di, slotIdx)}
                        onDrop={(e) => !isPast && handleCellDrop(e, day, slotIdx)}
                        className={`relative border-b border-s border-[hsl(var(--border))]/50 transition-colors ${
                          isDragTarget
                            ? 'bg-[hsl(var(--primary))]/15 ring-1 ring-inset ring-[hsl(var(--primary))]/40'
                            : isPast
                            ? 'opacity-50 cursor-default'
                            : dragTaskId
                            ? 'cursor-copy hover:bg-[hsl(var(--primary))]/8'
                            : 'cursor-pointer hover:bg-[hsl(var(--primary))]/5'
                        } ${isToday && !isDragTarget ? 'bg-[hsl(var(--primary))]/3' : ''}`}
                        style={{ height: SLOT_PX }}
                        title={
                          isPast
                            ? undefined
                            : isHe
                            ? `${day.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'short' })} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
                            : `${day.toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'short' })} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
                        }
                      >
                        {/* Only render blocks on slot 0 to avoid duplicates – use absolute positioning */}
                        {slotIdx === 0 && (
                          <div
                            className="absolute inset-0 pointer-events-none"
                            style={{ height: TOTAL_SLOTS * SLOT_PX, top: 0, zIndex: 5 }}
                          >
                            {renderBusyBlocks(day, di)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>

      {/* Helper hint */}
      <p className="text-xs text-[hsl(var(--muted-foreground))] text-center">
        {isHe
          ? 'לחץ על תא פנוי להוספת משימה · גרור משימה לשינוי שעה · לוח האירועים הקבוע (מהמייל) נשאר נעול'
          : 'Click empty slot to add task · Drag task to reschedule · Fixed calendar events stay locked'}
      </p>
    </div>
  );
}
