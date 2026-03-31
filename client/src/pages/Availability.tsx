import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, RefreshCw, Settings, Users } from 'lucide-react';
import { Link } from 'wouter';
import { apiFetch } from '../lib/api';
import { useActiveFamily } from '../hooks/useActiveFamily';
import { useAuth } from '../hooks/useAuth';
import { useI18n } from '../i18n';
import WeekCalendar, { AvailabilityEntry, CalendarTask, SlotClickPayload, TaskDropPayload } from '../components/WeekCalendar';
import TaskRequestModal, { TaskRequestPayload, UserBusySlots } from '../components/TaskRequestModal';
import MeetingFinderModal, { CommonSlot } from '../components/MeetingFinderModal';

type FamilyMember = { userId: string; fullName: string; role: string };

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay()); // Sunday-based week
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function AvailabilityPage() {
  const { dir, lang } = useI18n();
  const { activeFamilyId } = useActiveFamily();
  const { user } = useAuth();
  const isHe = lang === 'he';

  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [availability, setAvailability] = useState<AvailabilityEntry[]>([]);
  const [tasks, setTasks] = useState<CalendarTask[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loadingAvail, setLoadingAvail] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Task modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [clickedSlot, setClickedSlot] = useState<SlotClickPayload | null>(null);

  // Meeting finder state
  const [meetingFinderOpen, setMeetingFinderOpen] = useState(false);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const loadAvailability = useCallback(async () => {
    if (!activeFamilyId) return;
    try {
      const data = await apiFetch<{ availability: AvailabilityEntry[] }>(
        `/integrations/google/family-availability?from=${weekStart.toISOString()}&to=${weekEnd.toISOString()}`
      );
      setAvailability(data.availability ?? []);
    } catch {
      setAvailability([]);
    }
  }, [activeFamilyId, weekStart]);

  const loadTasks = useCallback(async () => {
    if (!activeFamilyId) return;
    try {
      const data = await apiFetch<CalendarTask[]>('/tasks');
      setTasks(data ?? []);
    } catch {
      setTasks([]);
    }
  }, [activeFamilyId]);

  const loadMembers = useCallback(async () => {
    if (!activeFamilyId) return;
    try {
      const data = await apiFetch<{ members: FamilyMember[] }>('/families/me');
      setMembers(data.members ?? []);
    } catch {
      setMembers([]);
    }
  }, [activeFamilyId]);

  useEffect(() => {
    if (!activeFamilyId) return;
    setLoadingAvail(true);
    setLoadingTasks(true);
    Promise.all([
      loadAvailability().finally(() => setLoadingAvail(false)),
      loadTasks().finally(() => setLoadingTasks(false)),
      loadMembers(),
    ]);
  }, [activeFamilyId, weekStart]);

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([loadAvailability(), loadTasks()]);
    setRefreshing(false);
  }

  function handlePrevWeek() {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  }

  function handleNextWeek() {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  }

  function handleToday() {
    setWeekStart(getWeekStart(new Date()));
  }

  function handleSlotClick(payload: SlotClickPayload) {
    setClickedSlot(payload);
    setModalOpen(true);
  }

  async function handleTaskSubmit(payload: TaskRequestPayload) {
    if (!activeFamilyId) throw new Error('No family');
    await apiFetch('/tasks', {
      method: 'POST',
      body: JSON.stringify({ ...payload, familyId: activeFamilyId }),
    });
    await loadTasks();
  }

  async function handleTaskDrop({ taskId, newStart, newEnd }: TaskDropPayload) {
    try {
      await apiFetch(`/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          scheduledStart: newStart.toISOString(),
          scheduledEnd: newEnd.toISOString(),
        }),
      });
      // Optimistically update local state
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, scheduledStart: newStart.toISOString(), scheduledEnd: newEnd.toISOString() }
            : t
        )
      );
    } catch {
      // Silently revert – reload from server
      await loadTasks();
    }
  }

  // When meeting finder picks a slot → open task modal with that time pre-filled
  function handleMeetingSlotSelected(slot: CommonSlot) {
    setMeetingFinderOpen(false);
    setClickedSlot({ date: slot.start, hour: slot.start.getHours(), minute: slot.start.getMinutes() });
    setModalOpen(true);
  }

  const isLoading = loadingAvail || loadingTasks;

  // Build UserBusySlots merging ALL family members (not just those with Google Calendar)
  const busySlotsForModal: UserBusySlots[] = members.map((m) => {
    const avail = availability.find((a) => a.userId === m.userId);
    return {
      userId: m.userId,
      fullName: m.fullName,
      busy: avail?.busy ?? [],
    };
  });

  const connectedCount = availability.length;

  return (
    <div dir={dir} className="space-y-5">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--info))]/10 shrink-0">
            <Calendar className="h-5 w-5 text-[hsl(var(--info))]" />
          </div>
          <div>
            <h1 className="page-title">{isHe ? 'יומן זמינות' : 'Availability Calendar'}</h1>
            <p className="page-subtitle">
              {isHe
                ? 'יומן משפחתי – חסימות, משימות ותיאום זמנים'
                : 'Family calendar – busy slots, tasks and time coordination'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {connectedCount > 0 && (
            <button
              onClick={() => setMeetingFinderOpen(true)}
              className="btn-outline inline-flex items-center gap-1.5 text-sm px-3 py-2"
            >
              <Users className="w-4 h-4" />
              {isHe ? 'מצא זמן לכולם' : 'Find time for all'}
            </button>
          )}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            aria-label={isHe ? 'רענן' : 'Refresh'}
            className="p-2 rounded-lg hover:bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <Link href="/settings">
            <span className="btn-outline gap-2 inline-flex items-center text-sm px-3 py-2">
              <Settings className="w-4 h-4" />
              {isHe ? 'חבר יומן Google' : 'Connect Google Calendar'}
            </span>
          </Link>
        </div>
      </div>

      {/* Calendar */}
      <WeekCalendar
        weekStart={weekStart}
        availability={availability}
        tasks={tasks}
        loading={isLoading}
        onSlotClick={handleSlotClick}
        onTaskDrop={handleTaskDrop}
        onPrevWeek={handlePrevWeek}
        onNextWeek={handleNextWeek}
        onToday={handleToday}
        dir={dir}
        lang={lang}
      />

      {/* Empty state for no calendars connected */}
      {!isLoading && availability.length === 0 && (
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 text-center space-y-2">
          <Calendar className="w-10 h-10 mx-auto text-[hsl(var(--muted-foreground))] opacity-40" />
          <p className="font-medium text-[hsl(var(--foreground))]">
            {isHe ? 'אין יומני Google מחוברים' : 'No Google Calendars connected'}
          </p>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            {isHe
              ? 'חברו את יומן Google בהגדרות כדי לראות חסימות זמן של חברי המשפחה'
              : "Connect Google Calendar in settings to see family members' busy slots"}
          </p>
          <Link href="/settings">
            <button className="mt-2 btn-primary px-4 py-2 text-sm">
              {isHe ? 'הגדרות יומן' : 'Calendar settings'}
            </button>
          </Link>
        </div>
      )}

      {/* Task request modal */}
      <TaskRequestModal
        open={modalOpen}
        initialDate={clickedSlot?.date}
        initialHour={clickedSlot?.hour}
        initialMinute={clickedSlot?.minute}
        currentUserRole={user?.role}
        members={members}
        busySlots={busySlotsForModal}
        weekStart={weekStart}
        weekEnd={weekEnd}
        onClose={() => setModalOpen(false)}
        onSubmit={handleTaskSubmit}
        dir={dir}
        lang={lang}
      />

      {/* Meeting finder modal */}
      <MeetingFinderModal
        open={meetingFinderOpen}
        availability={busySlotsForModal}
        weekStart={weekStart}
        weekEnd={weekEnd}
        onClose={() => setMeetingFinderOpen(false)}
        onSlotSelected={handleMeetingSlotSelected}
        dir={dir}
        lang={lang}
      />
    </div>
  );
}
