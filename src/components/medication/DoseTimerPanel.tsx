"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { DoseOccurrence, MedicationSchedule } from "@/types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useMedicationStore } from "@/stores/useMedicationStore";
import { useToast } from "@/components/ui/Toast";
import { ReminderEditor } from "@/components/medication/ReminderEditor";
import {
  cancelOccurrenceTimer,
  formatClockTime,
  formatCountdown,
  notificationsSupported,
  requestNotificationPermission,
} from "@/lib/notifications";
import { armScheduleTimers, cancelAllTimers } from "@/lib/notifications";
import {
  describeDateRange,
  describeDoseLine,
  describeSchedule,
  noteOf,
  toISODate,
} from "@/lib/reminder-format";
import {
  AlertTriangle,
  Bell,
  Check,
  ChevronRight,
  Pause,
  Pill,
  Play,
  Plus,
  SkipForward,
} from "lucide-react";

/**
 * The medicine reminder page.
 *
 * ── The shape of it ─────────────────────────────────────────────────
 *   1. The NEXT dose, large, with one tap to mark it taken. This is the
 *      only thing a patient opens the app for, so it comes first.
 *   2. TODAY, as a simple timeline of what is still to come.
 *   3. ALL REMINDERS, one card each, showing the schedule in words.
 *   4. Tap a card to change it; tap pause to stop it without losing it.
 *
 * ── Why it is shaped this way ───────────────────────────────────────
 *   • The next dose is the only thing that needs action RIGHT NOW.
 *   • A medicine list is a catalogue, not a schedule — the schedule is
 *     the sentence under each name ("Every day · 8:30 AM").
 *   • The patient's own note ("Take with food") sits with the dose,
 *     because that is where it is needed.
 */
export const DoseTimerPanel: React.FC = () => {
  const { showToast } = useToast();
  const schedules = useMedicationStore((s) => s.schedules);
  const markOccurrence = useMedicationStore((s) => s.markOccurrence);
  const updateSchedule = useMedicationStore((s) => s.updateSchedule);
  const deleteSchedule = useMedicationStore((s) => s.deleteSchedule);
  const addSchedule = useMedicationStore((s) => s.addSchedule);
  const refreshOccurrences = useMedicationStore((s) => s.refreshOccurrences);

  const [now, setNow] = useState(() => Date.now());
  const timers = useRef<ReturnType<typeof setInterval>[]>([]);
  const [editing, setEditing] = useState<MedicationSchedule | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [showPaused, setShowPaused] = useState(false);

  // Keep the countdown fresh and re-derive the occurrence window.
  // `hydrate()` first: a write before the persisted state is read back
  // would persist the empty initial state over the saved schedules.
  useEffect(() => {
    let cancelled = false;

    void useMedicationStore.getState().hydrate().then(() => {
      if (cancelled) return;
      const timer = setInterval(() => {
        setNow(Date.now());
        useMedicationStore.getState().refreshOccurrences();
      }, 60_000);
      timers.current.push(timer);
    });

    return () => {
      cancelled = true;
      timers.current.forEach(clearInterval);
      timers.current = [];
    };
  }, []);

  // (Re)arm the notification timers whenever the schedules change.
  useEffect(() => {
    cancelAllTimers();
    armScheduleTimers(schedules);
  }, [schedules]);

  const active = useMemo(
    () => schedules.filter((schedule) => schedule.status === "active"),
    [schedules],
  );
  const paused = useMemo(
    () => schedules.filter((schedule) => schedule.status === "paused"),
    [schedules],
  );

  const todayKey = toISODate(now);

  /** Every occurrence still to come today, across all reminders. */
  const todayUpcoming = useMemo(() => {
    const list: { schedule: MedicationSchedule; occurrence: DoseOccurrence }[] = [];
    for (const schedule of active) {
      for (const occurrence of schedule.occurrences) {
        if (occurrence.status !== "pending") continue;
        if (toISODate(occurrence.scheduledAt) !== todayKey) continue;
        list.push({ schedule, occurrence });
      }
    }
    return list.sort((a, b) => a.occurrence.scheduledAt - b.occurrence.scheduledAt);
  }, [active, todayKey]);

  const nextDose = useMemo(() => {
    let best: { schedule: MedicationSchedule; occurrence: DoseOccurrence } | null = null;
    for (const schedule of active) {
      for (const occurrence of schedule.occurrences) {
        if (occurrence.status !== "pending") continue;
        if (occurrence.scheduledAt < now - 60 * 60_000) continue;
        if (!best || occurrence.scheduledAt < best.occurrence.scheduledAt) {
          best = { schedule, occurrence };
        }
      }
    }
    return best;
  }, [active, now]);

  const missed = useMemo(() => {
    const list: { schedule: MedicationSchedule; at: number }[] = [];
    for (const schedule of active) {
      for (const occurrence of schedule.occurrences) {
        if (occurrence.status === "missed") list.push({ schedule, at: occurrence.scheduledAt });
      }
    }
    return list.sort((a, b) => b.at - a.at).slice(0, 3);
  }, [active]);

  const handleEnableNotifications = async () => {
    const permission = await requestNotificationPermission();
    if (permission === "granted") {
      showToast("Browser reminders are on.", "success");
      armScheduleTimers(active);
    } else if (permission === "denied") {
      showToast(
        "Browser alerts are blocked — reminders will still appear inside MediLink.",
        "info",
      );
    } else {
      showToast("This browser does not support notifications.", "info");
    }
  };

  const handleTaken = (schedule: MedicationSchedule, occurrenceId: string) => {
    markOccurrence(schedule.id, occurrenceId, "taken");
    cancelOccurrenceTimer(occurrenceId);
    showToast(`${schedule.name} marked as taken.`, "success");
  };

  const handleSkip = (schedule: MedicationSchedule, occurrenceId: string) => {
    markOccurrence(schedule.id, occurrenceId, "skipped");
    cancelOccurrenceTimer(occurrenceId);
  };

  const openEditor = (schedule: MedicationSchedule) => {
    setEditing(schedule);
    setIsEditorOpen(true);
  };

  /** Build a reminder the patient made by hand, outside the chat. */
  const handleCreate = (
    draft: Omit<MedicationSchedule, "id" | "createdAt" | "updatedAt" | "occurrences">,
  ) => {
    const id = `sch_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    addSchedule({
      ...draft,
      id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      occurrences: [],
    });
    // Materialise the first window of occurrences straight away.
    useMedicationStore.getState().refreshOccurrences();
  };

  /* ── Empty state ─────────────────────────────────────────────────── */
  if (!schedules.length) {
    return (
      <div className="text-center py-12 px-6">
        <div className="w-16 h-16 rounded-full bg-brand-light flex items-center justify-center mx-auto mb-4">
          <Pill className="w-8 h-8 text-brand" aria-hidden="true" />
        </div>
        <h3 className="text-[18px] font-heading font-bold text-text-primary mb-2">
          No reminders yet
        </h3>
        <p className="text-[14px] text-text-muted max-w-xs mx-auto mb-6">
          When Dr MediLink suggests a medicine, tap &ldquo;Set reminder&rdquo; in
          the chat and we will remind you when to take it.
        </p>
        <Button
          variant="primary"
          size="m"
          onClick={() => setIsCreateOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Add a reminder
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-7 pb-24">
      {/* ── 1. Next dose ─────────────────────────────────────────── */}
      {nextDose ? (
        <section
          aria-labelledby="next-dose-heading"
          className="rounded-[20px] bg-brand text-white p-5 shadow-md"
        >
          <h2
            id="next-dose-heading"
            className="text-[11px] font-bold uppercase tracking-[0.12em] opacity-90"
          >
            Next dose
          </h2>
          <p className="font-heading font-extrabold text-[24px] mt-1 leading-tight">
            {nextDose.schedule.label || nextDose.schedule.name}
          </p>
          <p className="text-[14px] opacity-95 mt-1">
            {nextDose.schedule.dose} · {formatClockTime(nextDose.occurrence.scheduledAt)}
          </p>
          <p className="text-[13px] opacity-85 mt-0.5">
            {formatCountdown(nextDose.occurrence.scheduledAt, now)}
            {noteOf(nextDose.schedule) ? ` · ${noteOf(nextDose.schedule)}` : ""}
          </p>

          <div className="flex items-center gap-2 mt-4">
            <Button
              size="m"
              variant="secondary"
              onClick={() => handleTaken(nextDose.schedule, nextDose.occurrence.id)}
              leftIcon={<Check className="w-4 h-4" />}
              className="flex-1"
            >
              Taken
            </Button>
            <Button
              size="m"
              variant="ghost"
              onClick={() => handleSkip(nextDose.schedule, nextDose.occurrence.id)}
              leftIcon={<SkipForward className="w-4 h-4" />}
              className="text-white hover:bg-white/15 flex-1"
            >
              Skip
            </Button>
          </div>
        </section>
      ) : (
        <section className="rounded-[20px] bg-success-soft/60 border border-success/25 p-5">
          <h2 className="text-[14px] font-bold text-success-dark">All caught up</h2>
          <p className="text-[13px] text-text-muted mt-0.5">
            No doses are due right now. Your next reminder will appear here.
          </p>
        </section>
      )}

      {/* ── Notification permission ──────────────────────────────── */}
      {notificationsSupported() && (
        <button
          type="button"
          onClick={handleEnableNotifications}
          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-[14px] bg-bg-soft border border-border-soft hover:border-brand-soft transition-colors text-left"
        >
          <Bell className="w-4 h-4 text-brand shrink-0" aria-hidden="true" />
          <span className="text-[13px] text-text-primary flex-1">
            Turn on browser alerts so reminders reach you when MediLink is in the
            background.
          </span>
          <span className="text-[12px] font-bold text-brand shrink-0">Enable</span>
        </button>
      )}

      {/* ── Missed doses ─────────────────────────────────────────── */}
      {missed.length > 0 && (
        <section
          aria-labelledby="missed-heading"
          className="rounded-[16px] bg-accent-soft/60 border border-accent/25 p-4"
        >
          <h2
            id="missed-heading"
            className="flex items-center gap-2 text-[14px] font-bold text-text-primary"
          >
            <AlertTriangle className="w-4 h-4 text-accent" aria-hidden="true" />
            Missed doses
          </h2>
          <p className="text-[12px] text-text-muted mt-1 mb-3">
            Skip a missed dose &mdash; never double up.
          </p>
          <ul className="space-y-1.5">
            {missed.map((entry) => (
              <li
                key={`${entry.schedule.id}_${entry.at}`}
                className="text-[13px] text-text-primary flex items-center justify-between gap-3"
              >
                <span className="truncate">{entry.schedule.name}</span>
                <span className="text-text-muted text-[12px] shrink-0">
                  {formatClockTime(entry.at)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── 2. Today ─────────────────────────────────────────────── */}
      <section aria-labelledby="today-heading">
        <div className="flex items-baseline justify-between mb-3">
          <h2
            id="today-heading"
            className="text-[12px] font-bold uppercase tracking-[0.12em] text-text-muted"
          >
            Today
          </h2>
          <span className="text-[12px] text-text-muted">
            {todayUpcoming.length} dose{todayUpcoming.length === 1 ? "" : "s"} left
          </span>
        </div>

        {todayUpcoming.length === 0 ? (
          <p className="text-[13px] text-text-muted py-2">
            Nothing else is due today.
          </p>
        ) : (
          <ul className="space-y-2">
            {todayUpcoming.map(({ schedule, occurrence }) => (
              <li
                key={occurrence.id}
                className="flex items-center gap-3 py-1.5"
              >
                <span className="text-[14px] font-bold text-text-primary tabular-nums w-[74px] shrink-0">
                  {formatClockTime(occurrence.scheduledAt)}
                </span>
                <span
                  className="w-2 h-2 rounded-full bg-brand shrink-0"
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold text-text-primary truncate">
                    {schedule.label || schedule.name}
                  </span>
                  <span className="block text-[12px] text-text-muted truncate">
                    {schedule.dose}
                    {noteOf(schedule) ? ` · ${noteOf(schedule)}` : ""}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => handleTaken(schedule, occurrence.id)}
                  aria-label={`Mark ${schedule.name} at ${formatClockTime(occurrence.scheduledAt)} as taken`}
                  className="w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-text-muted hover:bg-success-soft hover:text-success-dark transition-colors"
                >
                  <Check className="w-5 h-5" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── 3. All reminders ─────────────────────────────────────── */}
      <section aria-labelledby="all-heading">
        <h2
          id="all-heading"
          className="text-[12px] font-bold uppercase tracking-[0.12em] text-text-muted mb-3"
        >
          All reminders
        </h2>

        <ul className="space-y-2.5">
          {active.map((schedule) => {
            const pending = schedule.occurrences
              .filter((occurrence) => occurrence.status === "pending")
              .sort((a, b) => a.scheduledAt - b.scheduledAt);
            const next = pending[0];
            const dateRange = describeDateRange(schedule, now);

            return (
              <li key={schedule.id}>
                <div className="bg-white border border-border-soft rounded-[16px] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => openEditor(schedule)}
                    className="w-full text-left p-4 flex items-center gap-3 hover:bg-bg-soft/50 transition-colors"
                  >
                    <span
                      className="w-10 h-10 rounded-[12px] bg-brand-light flex items-center justify-center shrink-0"
                      aria-hidden="true"
                    >
                      <Pill className="w-5 h-5 text-brand" />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 flex-wrap">
                        <span className="text-[15px] font-bold text-text-primary truncate">
                          {schedule.label || schedule.name}
                        </span>
                        {schedule.warnings.some((w) => w.severity === "block") && (
                          <Badge variant="danger">Blocked</Badge>
                        )}
                        {schedule.warnings.some(
                          (w) => w.severity === "acknowledge" && !w.acknowledged,
                        ) && (
                          <Badge variant="warn">Check warning</Badge>
                        )}
                      </span>
                      <span className="block text-[13px] text-text-primary mt-0.5 truncate">
                        {describeSchedule(schedule)}
                      </span>
                      <span className="block text-[12px] text-text-muted truncate">
                        {describeDoseLine(schedule) || schedule.dose}
                        {dateRange ? ` · ${dateRange}` : ""}
                      </span>
                      {next && (
                        <span className="block text-[12px] text-brand font-semibold mt-1">
                          Next {formatClockTime(next.scheduledAt)} ·{" "}
                          {formatCountdown(next.scheduledAt, now)}
                        </span>
                      )}
                    </span>

                    <ChevronRight
                      className="w-5 h-5 text-text-muted shrink-0"
                      aria-hidden="true"
                    />
                  </button>

                  <div className="flex items-center gap-1 px-2 pb-2 -mt-0.5">
                    <button
                      type="button"
                      onClick={() => updateSchedule(schedule.id, { status: "paused" })}
                      aria-label={`Pause ${schedule.name}`}
                      className="h-11 px-3 rounded-[10px] text-[12px] font-semibold text-text-muted hover:bg-bg-soft hover:text-text-primary transition-colors inline-flex items-center gap-1.5"
                    >
                      <Pause className="w-3.5 h-3.5" aria-hidden="true" />
                      Pause
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {paused.length > 0 && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowPaused((prev) => !prev)}
              aria-expanded={showPaused}
              className="text-[12px] font-bold uppercase tracking-[0.12em] text-text-muted hover:text-text-primary transition-colors"
            >
              Paused ({paused.length})
            </button>

            {showPaused && (
              <ul className="space-y-2.5 mt-3">
                {paused.map((schedule) => (
                  <li
                    key={schedule.id}
                    className="bg-white border border-border-soft rounded-[16px] p-4 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-[14px] font-bold text-text-muted truncate">
                        {schedule.label || schedule.name}
                      </div>
                      <div className="text-[12px] text-text-muted truncate">
                        {describeSchedule(schedule)}
                      </div>
                    </div>
                    <Button
                      size="s"
                      variant="secondary"
                      onClick={() => updateSchedule(schedule.id, { status: "active" })}
                      leftIcon={<Play className="w-4 h-4" />}
                    >
                      Resume
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      {/* ── The editor ───────────────────────────────────────────── */}
      <ReminderEditor
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        schedule={editing}
        onSave={(id, patch) => updateSchedule(id, patch)}
        onDelete={(id) => {
          deleteSchedule(id);
          showToast("Reminder deleted.", "info");
        }}
      />

      {/* ── Creating a reminder by hand ───────────────────────────── */}
      <ReminderEditor
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        schedule={null}
        onCreate={handleCreate}
        onSave={() => {}}
      />
    </div>
  );
};
