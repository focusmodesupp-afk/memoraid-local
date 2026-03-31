import React, { useState, useMemo } from 'react';
import { X, Users, Clock, CheckCircle2, Calendar, ChevronRight, ChevronLeft, List, LayoutGrid } from 'lucide-react';

type BusySlot = { start: string; end: string };
export type UserBusySlots = { userId: string; fullName: string; busy: BusySlot[] };

export type CommonSlot = { start: Date; end: Date };

interface MeetingFinderModalProps {
  open: boolean;
  availability: UserBusySlots[];
  weekStart: Date;
  weekEnd: Date;
  onClose: () => void;
  onSlotSelected: (slot: CommonSlot, participantIds: string[]) => void;
  dir?: 'rtl' | 'ltr';
  lang?: string;
}

const DURATIONS_HE = [
  { value: 30,  label: '30 דקות' },
  { value: 60,  label: 'שעה' },
  { value: 90,  label: 'שעה וחצי' },
  { value: 120, label: 'שעתיים' },
];
const DURATIONS_EN = [
  { value: 30,  label: '30 min' },
  { value: 60,  label: '1 hour' },
  { value: 90,  label: '1.5 hours' },
  { value: 120, label: '2 hours' },
];

const DAY_START_H = 7;
const DAY_END_H = 22;
const HOURS_IN_DAY = DAY_END_H - DAY_START_H;

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

function addWeeks(d: Date, n: number): Date {
  return addDays(d, n * 7);
}

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function findCommonFreeSlots(
  participants: UserBusySlots[],
  rangeStart: Date,
  rangeEnd: Date,
  durationMin: number
): CommonSlot[] {
  if (participants.length === 0) return [];
  const durationMs = durationMin * 60 * 1000;
  const STEP_MS = 30 * 60 * 1000;
  const results: CommonSlot[] = [];

  const cursor = new Date(rangeStart);
  cursor.setHours(DAY_START_H, 0, 0, 0);
  const end = new Date(rangeEnd);
  end.setHours(DAY_END_H, 0, 0, 0);

  const allBusy = participants.flatMap((p) =>
    p.busy.map((b) => ({ start: new Date(b.start).getTime(), end: new Date(b.end).getTime() }))
  );

  let windowStart: number | null = null;

  while (cursor.getTime() < end.getTime()) {
    const t = cursor.getTime();
    const h = cursor.getHours();

    if (h < DAY_START_H || h >= DAY_END_H) {
      cursor.setTime(t + STEP_MS);
      const newH = cursor.getHours();
      if (newH < DAY_START_H) cursor.setHours(DAY_START_H, 0, 0, 0);
      continue;
    }

    const anyBusy = allBusy.some((b) => b.start < t + STEP_MS && b.end > t);

    if (!anyBusy) {
      if (windowStart === null) windowStart = t;
    } else {
      if (windowStart !== null) {
        const windowDuration = t - windowStart;
        if (windowDuration >= durationMs) {
          results.push({ start: new Date(windowStart), end: new Date(windowStart + durationMs) });
        }
        windowStart = null;
      }
    }

    cursor.setTime(t + STEP_MS);
    if (cursor.getHours() === 0) {
      cursor.setHours(DAY_START_H, 0, 0, 0);
    }

    if (results.length >= 20) break;
  }

  if (windowStart !== null && results.length < 20) {
    const windowDuration = cursor.getTime() - windowStart;
    if (windowDuration >= durationMs) {
      results.push({ start: new Date(windowStart), end: new Date(windowStart + durationMs) });
    }
  }

  return results;
}

export default function MeetingFinderModal({
  open,
  availability,
  weekStart,
  weekEnd,
  onClose,
  onSlotSelected,
  dir = 'rtl',
  lang = 'he',
}: MeetingFinderModalProps) {
  const isHe = lang === 'he';

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(availability.map((a) => a.userId)));
  const [duration, setDuration] = useState(60);
  const [weekOffset, setWeekOffset] = useState(0);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  const durations = isHe ? DURATIONS_HE : DURATIONS_EN;

  // Re-initialize selection when availability changes
  React.useEffect(() => {
    if (open) {
      setSelectedIds(new Set(availability.map((a) => a.userId)));
      setWeekOffset(0);
    }
  }, [open, availability]);

  function toggleParticipant(userId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  const effectiveWeekStart = useMemo(() => addWeeks(weekStart, weekOffset), [weekStart, weekOffset]);
  const effectiveWeekEnd = useMemo(() => addWeeks(weekEnd, weekOffset), [weekEnd, weekOffset]);

  const selectedParticipants = availability.filter((a) => selectedIds.has(a.userId));

  const commonSlots = useMemo(
    () => findCommonFreeSlots(selectedParticipants, effectiveWeekStart, effectiveWeekEnd, duration),
    [selectedParticipants, effectiveWeekStart, effectiveWeekEnd, duration]
  );

  if (!open) return null;

  function formatSlot(slot: CommonSlot): { day: string; time: string } {
    const locale = isHe ? 'he-IL' : 'en';
    const day = slot.start.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'short' });
    const startT = slot.start.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    const endT = slot.end.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    return { day, time: `${startT}–${endT}` };
  }

  function formatWeekRange(): string {
    const locale = isHe ? 'he-IL' : 'en';
    const s = effectiveWeekStart.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
    const e = effectiveWeekEnd.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
    return `${s} – ${e}`;
  }

  // Build 7-day grid for calendar view
  const days = Array.from({ length: 7 }, (_, i) => addDays(effectiveWeekStart, i));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={isHe ? 'מצא זמן משותף' : 'Find common time'}
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        dir={dir}
        className="relative z-10 w-full max-w-lg rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))] shrink-0">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[hsl(var(--primary))]" />
            <div>
              <h2 className="font-semibold text-[hsl(var(--foreground))] text-sm">
                {isHe ? 'מצא זמן פנוי לכולם' : 'Find a time for everyone'}
              </h2>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                {isHe ? 'בחר משתתפים ומשך – המערכת תמצא חלונות פנויים' : 'Select participants & duration'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={isHe ? 'סגור' : 'Close'}
            className="p-1 rounded-md hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {/* Duration picker */}
          <div>
            <label className="block text-xs font-medium text-[hsl(var(--foreground))] mb-2">
              <Clock className="inline w-3 h-3 me-1" />
              {isHe ? 'משך הפגישה' : 'Meeting duration'}
            </label>
            <div className="flex flex-wrap gap-2">
              {durations.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setDuration(d.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    duration === d.value
                      ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                      : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]/70'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Participant selector */}
          <div>
            <label className="block text-xs font-medium text-[hsl(var(--foreground))] mb-2">
              <Users className="inline w-3 h-3 me-1" />
              {isHe ? 'משתתפים' : 'Participants'}
              <span className="text-[hsl(var(--muted-foreground))] font-normal ms-1">
                ({selectedIds.size}/{availability.length})
              </span>
            </label>
            <div className="space-y-1.5">
              {availability.map((a) => {
                const selected = selectedIds.has(a.userId);
                return (
                  <button
                    key={a.userId}
                    type="button"
                    onClick={() => toggleParticipant(a.userId)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-start transition-colors ${
                      selected
                        ? 'bg-[hsl(var(--primary))]/10 border border-[hsl(var(--primary))]/30 text-[hsl(var(--foreground))]'
                        : 'bg-[hsl(var(--muted))]/40 border border-transparent text-[hsl(var(--muted-foreground))]'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${
                      selected ? 'bg-[hsl(var(--primary))]' : 'border border-[hsl(var(--border))] bg-[hsl(var(--background))]'
                    }`}>
                      {selected && <CheckCircle2 className="w-3 h-3 text-[hsl(var(--primary-foreground))]" />}
                    </div>
                    <span className="flex-1 font-medium">{a.fullName}</span>
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">
                      {a.busy.length > 0
                        ? `${a.busy.length} ${isHe ? 'חסימות' : 'busy slots'}`
                        : (isHe ? 'פנוי לחלוטין' : 'fully free')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Week navigation + view toggle */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setWeekOffset((o) => o - 1)}
                className="p-1.5 rounded-md hover:bg-[hsl(var(--muted))] transition-colors"
                aria-label={isHe ? 'שבוע קודם' : 'Previous week'}
              >
                {dir === 'rtl' ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
              <span className="text-xs font-medium text-[hsl(var(--foreground))] min-w-[120px] text-center">
                {formatWeekRange()}
              </span>
              <button
                type="button"
                onClick={() => setWeekOffset((o) => o + 1)}
                className="p-1.5 rounded-md hover:bg-[hsl(var(--muted))] transition-colors"
                aria-label={isHe ? 'שבוע הבא' : 'Next week'}
              >
                {dir === 'rtl' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex items-center rounded-lg border border-[hsl(var(--border))] overflow-hidden">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`px-2.5 py-1.5 text-xs flex items-center gap-1 transition-colors ${viewMode === 'list' ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'}`}
              >
                <List className="w-3 h-3" />
                {isHe ? 'רשימה' : 'List'}
              </button>
              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className={`px-2.5 py-1.5 text-xs flex items-center gap-1 transition-colors border-s border-[hsl(var(--border))] ${viewMode === 'calendar' ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'}`}
              >
                <LayoutGrid className="w-3 h-3" />
                {isHe ? 'לוח' : 'Calendar'}
              </button>
            </div>
          </div>

          {/* Results */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Calendar className="w-3.5 h-3.5 text-[hsl(var(--success))]" />
              <span className="text-xs font-medium text-[hsl(var(--foreground))]">
                {isHe
                  ? `${commonSlots.length === 0 ? 'אין' : commonSlots.length} חלונות פנויים לכל המשתתפים`
                  : `${commonSlots.length === 0 ? 'No' : commonSlots.length} common free slots`
                }
              </span>
            </div>

            {selectedIds.size < 2 ? (
              <p className="text-xs text-[hsl(var(--muted-foreground))] py-3 text-center">
                {isHe ? 'בחר לפחות 2 משתתפים' : 'Select at least 2 participants'}
              </p>
            ) : commonSlots.length === 0 ? (
              <div className="rounded-lg bg-[hsl(var(--muted))]/40 px-4 py-5 text-center space-y-1">
                <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                  {isHe ? 'לא נמצאו חלונות פנויים בשבוע זה' : 'No common free slots this week'}
                </p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  {isHe ? 'נסה להפחית משתתפים או לנווט לשבוע אחר' : 'Try fewer participants or navigate to another week'}
                </p>
              </div>
            ) : viewMode === 'list' ? (
              <div className="space-y-1.5">
                {commonSlots.map((slot, i) => {
                  const { day, time } = formatSlot(slot);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => onSlotSelected(slot, Array.from(selectedIds))}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-[hsl(var(--success))]/25 bg-[hsl(var(--success))]/5 hover:bg-[hsl(var(--success))]/12 transition-colors text-start group"
                    >
                      <CheckCircle2 className="w-4 h-4 text-[hsl(var(--success))] shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[hsl(var(--foreground))]">{day}</p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">{time}</p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--primary))] transition-colors rtl:-scale-x-100" />
                    </button>
                  );
                })}
              </div>
            ) : (
              /* Calendar view – 7-column mini week grid */
              <CalendarGrid
                days={days}
                commonSlots={commonSlots}
                duration={duration}
                isHe={isHe}
                lang={lang}
                onSlotSelected={(slot) => onSlotSelected(slot, Array.from(selectedIds))}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Mini calendar grid component ── */
interface CalendarGridProps {
  days: Date[];
  commonSlots: CommonSlot[];
  duration: number;
  isHe: boolean;
  lang: string;
  onSlotSelected: (slot: CommonSlot) => void;
}

function CalendarGrid({ days, commonSlots, isHe, lang, onSlotSelected }: CalendarGridProps) {
  const locale = isHe ? 'he-IL' : 'en';
  const GRID_HEIGHT = 300;
  const PX_PER_HOUR = GRID_HEIGHT / HOURS_IN_DAY;

  const slotsByDay = useMemo(() => {
    const map = new Map<string, CommonSlot[]>();
    for (const slot of commonSlots) {
      const key = startOfDay(slot.start).toISOString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(slot);
    }
    return map;
  }, [commonSlots]);

  const hourLabels = Array.from({ length: HOURS_IN_DAY + 1 }, (_, i) => DAY_START_H + i);

  return (
    <div className="rounded-lg border border-[hsl(var(--border))] overflow-hidden">
      {/* Day header row */}
      <div className="grid bg-[hsl(var(--muted))]/50" style={{ gridTemplateColumns: `28px repeat(7, 1fr)` }}>
        <div />
        {days.map((d, i) => (
          <div key={i} className="text-center py-1.5 border-s border-[hsl(var(--border))] first:border-s-0">
            <p className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase">
              {d.toLocaleDateString(locale, { weekday: 'short' })}
            </p>
            <p className="text-xs font-semibold text-[hsl(var(--foreground))]">
              {d.toLocaleDateString(locale, { day: 'numeric' })}
            </p>
          </div>
        ))}
      </div>

      {/* Time grid */}
      <div className="flex overflow-y-auto" style={{ maxHeight: GRID_HEIGHT + 20 }}>
        {/* Hour labels */}
        <div className="shrink-0 w-7 relative" style={{ height: GRID_HEIGHT }}>
          {hourLabels.map((h) => (
            <div
              key={h}
              className="absolute w-full text-[9px] text-[hsl(var(--muted-foreground))] leading-none text-center"
              style={{ top: `${(h - DAY_START_H) * PX_PER_HOUR - 4}px` }}
            >
              {h < 10 ? `0${h}` : h}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map((day, di) => {
          const key = startOfDay(day).toISOString();
          const daySlots = slotsByDay.get(key) ?? [];
          return (
            <div
              key={di}
              className="flex-1 relative border-s border-[hsl(var(--border))]"
              style={{ height: GRID_HEIGHT }}
            >
              {/* Hour lines */}
              {hourLabels.map((h) => (
                <div
                  key={h}
                  className="absolute w-full border-t border-[hsl(var(--border))]/40"
                  style={{ top: `${(h - DAY_START_H) * PX_PER_HOUR}px` }}
                />
              ))}

              {/* Free slots */}
              {daySlots.map((slot, si) => {
                const startH = slot.start.getHours() + slot.start.getMinutes() / 60;
                const endH = slot.end.getHours() + slot.end.getMinutes() / 60;
                const top = (startH - DAY_START_H) * PX_PER_HOUR;
                const height = (endH - startH) * PX_PER_HOUR;
                const startT = slot.start.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
                return (
                  <button
                    key={si}
                    type="button"
                    onClick={() => onSlotSelected(slot)}
                    title={startT}
                    className="absolute inset-x-0.5 rounded text-[9px] font-semibold text-white flex items-center justify-center overflow-hidden transition-opacity hover:opacity-90 active:opacity-75"
                    style={{
                      top: `${top}px`,
                      height: `${Math.max(height, 16)}px`,
                      backgroundColor: 'hsl(var(--success))',
                    }}
                  >
                    {height > 20 ? startT : ''}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
