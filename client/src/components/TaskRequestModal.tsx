import React, { useState, useEffect, useMemo } from 'react';
import { X, Calendar, Clock, User, AlertCircle, Tag, FileText, Loader2, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useActiveFamily } from '../hooks/useActiveFamily';

type FamilyMember = { userId: string; fullName: string; role: string };
type Patient = { id: string; fullName: string };
type BusySlot = { start: string; end: string };

export type TaskRequestPayload = {
  title: string;
  description?: string;
  scheduledStart: string;
  scheduledEnd: string;
  assignedToUserId?: string;
  patientId?: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  category: string;
  status: 'todo' | 'requested';
};

export type UserBusySlots = { userId: string; fullName: string; busy: BusySlot[] };

interface TaskRequestModalProps {
  open: boolean;
  initialDate?: Date;
  initialHour?: number;
  initialMinute?: number;
  currentUserRole?: string;
  members?: FamilyMember[];
  busySlots?: UserBusySlots[];
  weekStart?: Date;
  weekEnd?: Date;
  onClose: () => void;
  onSubmit: (payload: TaskRequestPayload) => Promise<void>;
  dir?: 'rtl' | 'ltr';
  lang?: string;
}

const DURATIONS = [
  { value: 30,  label: '30 דקות' },
  { value: 60,  label: 'שעה' },
  { value: 90,  label: 'שעה וחצי' },
  { value: 120, label: 'שעתיים' },
  { value: 180, label: '3 שעות' },
];

const DURATIONS_EN = [
  { value: 30,  label: '30 min' },
  { value: 60,  label: '1 hour' },
  { value: 90,  label: '1.5 hours' },
  { value: 120, label: '2 hours' },
  { value: 180, label: '3 hours' },
];

const CATEGORIES_HE = [
  { value: 'medical',        label: 'רפואי' },
  { value: 'personal',       label: 'אישי' },
  { value: 'administrative', label: 'מינהלי' },
  { value: 'shopping',       label: 'קניות' },
  { value: 'transport',      label: 'הסעות' },
  { value: 'other',          label: 'אחר' },
];

const CATEGORIES_EN = [
  { value: 'medical',        label: 'Medical' },
  { value: 'personal',       label: 'Personal' },
  { value: 'administrative', label: 'Administrative' },
  { value: 'shopping',       label: 'Shopping' },
  { value: 'transport',      label: 'Transport' },
  { value: 'other',          label: 'Other' },
];

function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function slotsOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && aEnd > bStart;
}

type FreeSlot = { start: Date; end: Date };

function findFreeSlots(
  busySlots: BusySlot[],
  rangeStart: Date,
  rangeEnd: Date,
  durationMin: number
): FreeSlot[] {
  const slots = [...busySlots]
    .map((s) => ({ start: new Date(s.start), end: new Date(s.end) }))
    .filter((s) => s.start < rangeEnd && s.end > rangeStart)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const result: FreeSlot[] = [];
  const DAY_START_H = 7;
  const DAY_END_H = 22;
  const durationMs = durationMin * 60 * 1000;

  // Walk day-by-day within range
  const cursor = new Date(rangeStart);
  const end = new Date(rangeEnd);
  while (cursor < end) {
    const dayStart = new Date(cursor);
    dayStart.setHours(DAY_START_H, 0, 0, 0);
    const dayEnd = new Date(cursor);
    dayEnd.setHours(DAY_END_H, 0, 0, 0);

    const effective = new Date(Math.max(cursor.getTime(), dayStart.getTime()));
    const dayBusy = slots.filter((s) => s.start < dayEnd && s.end > dayStart);

    // Find gaps
    let ptr = effective;
    for (const b of dayBusy) {
      if (ptr < b.start && b.start.getTime() - ptr.getTime() >= durationMs) {
        result.push({ start: new Date(ptr), end: new Date(b.start) });
      }
      if (b.end > ptr) ptr = new Date(b.end);
    }
    if (ptr < dayEnd && dayEnd.getTime() - ptr.getTime() >= durationMs) {
      result.push({ start: new Date(ptr), end: new Date(dayEnd) });
    }

    cursor.setDate(cursor.getDate() + 1);
    cursor.setHours(0, 0, 0, 0);
  }
  return result.slice(0, 8);
}

export default function TaskRequestModal({
  open,
  initialDate,
  initialHour = 9,
  initialMinute = 0,
  currentUserRole = 'caregiver',
  members = [],
  busySlots = [],
  weekStart,
  weekEnd,
  onClose,
  onSubmit,
  dir = 'rtl',
  lang = 'he',
}: TaskRequestModalProps) {
  const isHe = lang === 'he';
  const { activeFamilyId } = useActiveFamily();

  const buildInitialStart = () => {
    const d = initialDate ? new Date(initialDate) : new Date();
    d.setHours(initialHour, initialMinute, 0, 0);
    return d;
  };

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDt, setStartDt] = useState<string>(() => toDatetimeLocal(buildInitialStart()));
  const [duration, setDuration] = useState(60);
  const [assignedToUserId, setAssignedToUserId] = useState('');
  const [patientId, setPatientId] = useState('');
  const [priority, setPriority] = useState<'urgent' | 'high' | 'medium' | 'low'>('medium');
  const [category, setCategory] = useState('other');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [showFreeSlots, setShowFreeSlots] = useState(false);

  useEffect(() => {
    if (open) {
      setStartDt(toDatetimeLocal(buildInitialStart()));
      setTitle('');
      setDescription('');
      setError(null);
      setShowFreeSlots(false);
    }
  }, [open, initialDate, initialHour, initialMinute]);

  useEffect(() => {
    if (!activeFamilyId || !open) return;
    apiFetch<Patient[]>('/patients/primary')
      .then((data) => {
        if (Array.isArray(data)) setPatients(data);
        else if (data && (data as any).id) setPatients([data as any]);
      })
      .catch(() => setPatients([]));
  }, [activeFamilyId, open]);

  // Conflict detection
  const conflictInfo = useMemo(() => {
    if (!assignedToUserId || !startDt) return null;
    const userBusy = busySlots.find((b) => b.userId === assignedToUserId);
    if (!userBusy || userBusy.busy.length === 0) return null;
    const start = new Date(startDt);
    const end = new Date(start.getTime() + duration * 60 * 1000);
    const conflict = userBusy.busy.find((slot) =>
      slotsOverlap(start, end, new Date(slot.start), new Date(slot.end))
    );
    if (!conflict) return null;
    const assignee = members.find((m) => m.userId === assignedToUserId);
    return { assigneeName: assignee?.fullName ?? '', conflictEnd: new Date(conflict.end) };
  }, [assignedToUserId, startDt, duration, busySlots, members]);

  // Free slot suggestions for assigned user
  const freeSlots = useMemo(() => {
    if (!assignedToUserId || !weekStart || !weekEnd) return [];
    const userBusy = busySlots.find((b) => b.userId === assignedToUserId);
    if (!userBusy) return [];
    return findFreeSlots(userBusy.busy, weekStart, weekEnd, duration);
  }, [assignedToUserId, weekStart, weekEnd, busySlots, duration]);

  if (!open) return null;

  const isManager = currentUserRole === 'manager';
  const durations = isHe ? DURATIONS : DURATIONS_EN;
  const categories = isHe ? CATEGORIES_HE : CATEGORIES_EN;

  function applyFreeSlot(slot: FreeSlot) {
    setStartDt(toDatetimeLocal(slot.start));
    setShowFreeSlots(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError(isHe ? 'כותרת המשימה היא שדה חובה' : 'Task title is required');
      return;
    }
    if (!startDt) {
      setError(isHe ? 'יש לבחור תאריך ושעה' : 'Please select a date and time');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const scheduledStart = new Date(startDt).toISOString();
      const scheduledEnd = new Date(new Date(startDt).getTime() + duration * 60 * 1000).toISOString();
      const payload: TaskRequestPayload = {
        title: title.trim(),
        description: description.trim() || undefined,
        scheduledStart,
        scheduledEnd,
        priority,
        category,
        status: isManager ? 'todo' : 'requested',
      };
      if (assignedToUserId) payload.assignedToUserId = assignedToUserId;
      if (patientId) payload.patientId = patientId;
      await onSubmit(payload);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isHe ? 'שגיאה בשמירת המשימה. נסה שוב.' : 'Failed to save task. Try again.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  const labelClass = 'block text-xs font-medium text-[hsl(var(--foreground))] mb-1';
  const inputClass = 'w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--input))] px-3 py-2 text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]';
  const selectClass = inputClass;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={isHe ? 'הוסף משימה ליומן' : 'Add task to calendar'}
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        dir={dir}
        className="relative z-10 w-full max-w-lg rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))]">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[hsl(var(--primary))]" />
            <h2 className="font-semibold text-[hsl(var(--foreground))]">
              {isManager
                ? (isHe ? 'הוסף משימה ליומן' : 'Add task to calendar')
                : (isHe ? 'שלח בקשת משימה' : 'Send task request')}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label={isHe ? 'סגור' : 'Close'}
            className="p-1 rounded-md hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {!isManager && (
            <div className="flex items-start gap-2 rounded-lg bg-[hsl(var(--warning))]/10 border border-[hsl(var(--warning))]/30 px-3 py-2.5 text-xs text-[hsl(var(--warning))]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                {isHe
                  ? 'הבקשה תישלח לאישור מנהל המשפחה לפני שתופיע בלוח המשימות'
                  : 'This request will be sent for manager approval before appearing on the kanban board'}
              </span>
            </div>
          )}

          {/* Title */}
          <div>
            <label htmlFor="task-title" className={labelClass}>
              {isHe ? 'כותרת המשימה *' : 'Task title *'}
            </label>
            <input
              id="task-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
              placeholder={isHe ? 'לדוגמה: ביקור רופא, נסיעה לבית חולים...' : 'e.g., Doctor visit, Hospital trip...'}
              required
              autoFocus
            />
          </div>

          {/* Date + Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="task-start" className={labelClass}>
                <Clock className="inline w-3 h-3 me-1" />
                {isHe ? 'תאריך ושעה *' : 'Start date & time *'}
              </label>
              <input
                id="task-start"
                type="datetime-local"
                value={startDt}
                onChange={(e) => { setStartDt(e.target.value); setShowFreeSlots(false); }}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label htmlFor="task-duration" className={labelClass}>
                {isHe ? 'משך הזמן' : 'Duration'}
              </label>
              <select
                id="task-duration"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className={selectClass}
              >
                {durations.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Conflict warning */}
          {conflictInfo && (
            <div className="rounded-lg border border-[hsl(var(--destructive))]/30 bg-[hsl(var(--destructive))]/8 px-3 py-2.5 space-y-2">
              <div className="flex items-start gap-2 text-xs text-[hsl(var(--destructive))]">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  {isHe
                    ? `${conflictInfo.assigneeName} תפוס/ה בשעה זו (עד ${conflictInfo.conflictEnd.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })})`
                    : `${conflictInfo.assigneeName} is busy at this time (until ${conflictInfo.conflictEnd.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })})`
                  }
                </span>
              </div>
              {freeSlots.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowFreeSlots((v) => !v)}
                  className="flex items-center gap-1.5 text-xs font-medium text-[hsl(var(--primary))] hover:underline"
                >
                  <Lightbulb className="w-3.5 h-3.5" />
                  {isHe ? 'הצג זמנים פנויים' : 'Show free slots'}
                  {showFreeSlots ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              )}
              {showFreeSlots && freeSlots.length > 0 && (
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  {freeSlots.map((slot, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => applyFreeSlot(slot)}
                      className="text-left text-xs rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2 py-1.5 hover:bg-[hsl(var(--primary))]/10 hover:border-[hsl(var(--primary))]/40 transition-colors"
                    >
                      <span className="font-medium block text-[hsl(var(--foreground))]">
                        {slot.start.toLocaleDateString(isHe ? 'he-IL' : 'en', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </span>
                      <span className="text-[hsl(var(--muted-foreground))]">
                        {slot.start.toLocaleTimeString(isHe ? 'he-IL' : 'en', { hour: '2-digit', minute: '2-digit' })}–{slot.end.toLocaleTimeString(isHe ? 'he-IL' : 'en', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* No conflict – show suggest button if there are free slots */}
          {!conflictInfo && assignedToUserId && freeSlots.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowFreeSlots((v) => !v)}
                className="flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors"
              >
                <Lightbulb className="w-3.5 h-3.5" />
                {isHe ? 'הצג חלונות פנויים השבוע' : 'Show free slots this week'}
                {showFreeSlots ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              {showFreeSlots && (
                <div className="grid grid-cols-2 gap-1.5 mt-2">
                  {freeSlots.map((slot, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => applyFreeSlot(slot)}
                      className="text-left text-xs rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2 py-1.5 hover:bg-[hsl(var(--primary))]/10 hover:border-[hsl(var(--primary))]/40 transition-colors"
                    >
                      <span className="font-medium block text-[hsl(var(--foreground))]">
                        {slot.start.toLocaleDateString(isHe ? 'he-IL' : 'en', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </span>
                      <span className="text-[hsl(var(--muted-foreground))]">
                        {slot.start.toLocaleTimeString(isHe ? 'he-IL' : 'en', { hour: '2-digit', minute: '2-digit' })}–{slot.end.toLocaleTimeString(isHe ? 'he-IL' : 'en', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Priority + Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="task-priority" className={labelClass}>
                <AlertCircle className="inline w-3 h-3 me-1" />
                {isHe ? 'עדיפות' : 'Priority'}
              </label>
              <select
                id="task-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as typeof priority)}
                className={selectClass}
              >
                <option value="urgent">{isHe ? 'דחוף' : 'Urgent'}</option>
                <option value="high">{isHe ? 'גבוהה' : 'High'}</option>
                <option value="medium">{isHe ? 'בינונית' : 'Medium'}</option>
                <option value="low">{isHe ? 'נמוכה' : 'Low'}</option>
              </select>
            </div>
            <div>
              <label htmlFor="task-category" className={labelClass}>
                <Tag className="inline w-3 h-3 me-1" />
                {isHe ? 'קטגוריה' : 'Category'}
              </label>
              <select
                id="task-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={selectClass}
              >
                {categories.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Assigned to */}
          {members.length > 0 && (
            <div>
              <label htmlFor="task-assignee" className={labelClass}>
                <User className="inline w-3 h-3 me-1" />
                {isHe ? 'הקצה למשתמש' : 'Assign to'}
              </label>
              <select
                id="task-assignee"
                value={assignedToUserId}
                onChange={(e) => { setAssignedToUserId(e.target.value); setShowFreeSlots(false); }}
                className={selectClass}
              >
                <option value="">{isHe ? 'לא הוקצה' : 'Unassigned'}</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>{m.fullName}</option>
                ))}
              </select>
            </div>
          )}

          {/* Patient */}
          {patients.length > 0 && (
            <div>
              <label htmlFor="task-patient" className={labelClass}>
                {isHe ? 'מטופל קשור' : 'Related patient'}
              </label>
              <select
                id="task-patient"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                className={selectClass}
              >
                <option value="">{isHe ? 'ללא מטופל ספציפי' : 'No specific patient'}</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>{p.fullName}</option>
                ))}
              </select>
            </div>
          )}

          {/* Notes */}
          <div>
            <label htmlFor="task-notes" className={labelClass}>
              <FileText className="inline w-3 h-3 me-1" />
              {isHe ? 'הערות' : 'Notes'}
            </label>
            <textarea
              id="task-notes"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={`${inputClass} resize-none`}
              placeholder={isHe ? 'פרטים נוספים, הוראות, מיקום...' : 'Additional details, instructions, location...'}
            />
          </div>

          {error && (
            <div className="rounded-lg bg-[hsl(var(--destructive))]/10 border border-[hsl(var(--destructive))]/30 px-3 py-2.5 text-xs text-[hsl(var(--destructive))] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[hsl(var(--border))]">
          <button
            type="button"
            onClick={onClose}
            className="btn-outline px-4 py-2 text-sm"
            disabled={submitting}
          >
            {isHe ? 'ביטול' : 'Cancel'}
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            className="btn-primary px-4 py-2 text-sm inline-flex items-center gap-1.5"
            disabled={submitting}
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isManager
              ? (isHe ? 'הוסף משימה' : 'Add task')
              : (isHe ? 'שלח בקשה' : 'Send request')}
          </button>
        </div>
      </div>
    </div>
  );
}
