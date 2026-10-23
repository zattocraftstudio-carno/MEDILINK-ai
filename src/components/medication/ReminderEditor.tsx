"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { MedicationSchedule, ReminderFrequency } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import {
  DAY_NAMES,
  DAY_NAMES_SHORT,
  NOTE_PRESETS,
  formatClock,
  formatClockList,
  formatDateLabel,
  fromISODate,
  toISODate,
} from "@/lib/reminder-format";
import {
  CalendarDays,
  Check,
  Clock,
  Plus,
  Repeat,
  StickyNote,
  Trash2,
  X,
} from "lucide-react";

interface ReminderEditorProps {
  isOpen: boolean;
  onClose: () => void;
  /** The reminder being edited. Null when creating a new one. */
  schedule: MedicationSchedule | null;
  /** Called with the edited values when the patient saves. */
  onSave: (id: string, patch: Partial<MedicationSchedule>) => void;
  /** Called when the patient creates a new reminder. */
  onCreate?: (draft: Omit<MedicationSchedule, "id" | "createdAt" | "updatedAt" | "occurrences">) => void;
  /** Called when the patient deletes the reminder. */
  onDelete?: (id: string) => void;
}

const FREQUENCIES: { value: ReminderFrequency; label: string }[] = [
  { value: "daily", label: "Every day" },
  { value: "weekly", label: "Weekly" },
  { value: "interval", label: "Every N days" },
];

/**
 * The reminder editor.
 *
 * Design principles:
 *   • Every field is labelled and every control has an accessible name.
 *   • Touch targets are at least 44 px.
 *   • Nothing is hidden behind a mystery — the current schedule is
 *     summarised in words at the top, and the controls below edit it.
 *   • The dose is the one field that is NOT freely retyped from scratch
 *     without a reason: it starts from what the doctor said, and it is
 *     still the patient's to correct.
 */
export const ReminderEditor: React.FC<ReminderEditorProps> = ({
  isOpen,
  onClose,
  schedule,
  onSave,
  onCreate,
  onDelete,
}) => {
  const { showToast } = useToast();
  const isCreating = !schedule;

  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [label, setLabel] = useState("");
  const [note, setNote] = useState("");
  const [frequencyKind, setFrequencyKind] = useState<ReminderFrequency>("daily");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const [everyDays, setEveryDays] = useState(2);
  const [times, setTimes] = useState<string[]>([]);
  const [newTime, setNewTime] = useState("08:00");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Load the reminder into the form every time the sheet opens.
  useEffect(() => {
    if (!isOpen) return;

    if (!schedule) {
      // Create mode — a blank, sensible starting point.
      setName("");
      setDose("");
      setLabel("");
      setNote("");
      setFrequencyKind("daily");
      setDaysOfWeek([]);
      setEveryDays(2);
      setTimes(["08:00"]);
      setNewTime("08:00");
      setStartDate(toISODate(Date.now()));
      setEndDate("");
      return;
    }

    setDose(schedule.dose ?? "");
    setLabel(schedule.label ?? "");
    setNote(schedule.note ?? schedule.preparationNote ?? "");
    setFrequencyKind(
      schedule.frequencyKind ??
        (schedule.daysOfWeek?.length
          ? "weekly"
          : schedule.everyDays && schedule.everyDays > 1
            ? "interval"
            : "daily"),
    );
    setDaysOfWeek([...(schedule.daysOfWeek ?? [])]);
    setEveryDays(schedule.everyDays && schedule.everyDays > 1 ? schedule.everyDays : 2);
    setTimes([...(schedule.clockTimes ?? [])]);
    setNewTime(schedule.clockTimes?.[0] ?? "08:00");
    setStartDate(schedule.startDate ?? "");
    setEndDate(schedule.endDate ?? "");
  }, [isOpen, schedule]);

  const toggleDay = (day: number) => {
    setDaysOfWeek((current) =>
      current.includes(day)
        ? current.filter((d) => d !== day)
        : [...current, day].sort((a, b) => a - b),
    );
  };

  const addTime = () => {
    if (!newTime) return;
    setTimes((current) =>
      current.includes(newTime)
        ? current
        : [...current, newTime].sort((a, b) => a.localeCompare(b)),
    );
  };

  const removeTime = (time: string) => {
    setTimes((current) => current.filter((t) => t !== time));
  };

  /** The patient must pick at least one time, and a weekly reminder at
   *  least one day. Nothing is saved half-configured. */
  const canSave =
    (isCreating ? name.trim().length > 0 : true) &&
    dose.trim().length > 0 &&
    times.length > 0 &&
    (frequencyKind !== "weekly" || daysOfWeek.length > 0);

  const summary = useMemo(() => {
    if (!schedule) return "";
    const parts: string[] = [];
    if (frequencyKind === "weekly") {
      parts.push(
        daysOfWeek.length
          ? daysOfWeek.map((d) => DAY_NAMES_SHORT[d]).join(", ")
          : "pick the days",
      );
    } else if (frequencyKind === "interval") {
      parts.push(`Every ${everyDays} days`);
    } else {
      parts.push("Every day");
    }
    if (times.length) parts.push(formatClockList(times));
    return parts.join(" · ");
  }, [schedule, frequencyKind, daysOfWeek, everyDays, times]);

  const handleSave = () => {
    if (!canSave) return;

    if (!schedule) {
      onCreate?.({
        name: name.trim(),
        dose: dose.trim(),
        label: label.trim() || undefined,
        note: note.trim() || undefined,
        frequency: `${times.length}× daily`,
        timesPerDay: times.length,
        anchor: "morning",
        clockTimes: times,
        frequencyKind,
        daysOfWeek: frequencyKind === "weekly" ? daysOfWeek : undefined,
        everyDays: frequencyKind === "interval" ? everyDays : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        durationDays: undefined,
        startAt: Date.now(),
        preparationNote: note.trim() || undefined,
        warnings: [],
        source: "manual",
        status: "active",
      });
      showToast("Reminder added.", "success");
      onClose();
      return;
    }

    onSave(schedule.id, {
      dose: dose.trim(),
      label: label.trim() || undefined,
      note: note.trim() || undefined,
      frequencyKind,
      daysOfWeek: frequencyKind === "weekly" ? daysOfWeek : undefined,
      everyDays: frequencyKind === "interval" ? everyDays : undefined,
      clockTimes: times,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      timesPerDay: times.length,
      durationDays:
        startDate && endDate
          ? Math.max(
              1,
              Math.round(
                (fromISODate(endDate) - fromISODate(startDate)) / 86_400_000,
              ) + 1,
            )
          : schedule.durationDays,
    });

    showToast("Reminder updated.", "success");
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isCreating ? "Add reminder" : "Edit reminder"}
      maxWidth="max-w-[520px]"
      footer={
        <div className="w-full flex items-center gap-3">
          {onDelete && schedule && (
            <Button
              variant="ghost"
              size="m"
              onClick={() => {
                onDelete(schedule.id);
                onClose();
              }}
              leftIcon={<Trash2 className="w-4 h-4" />}
              className="text-emergency"
            >
              Delete
            </Button>
          )}
          <Button size="m" className="flex-1" onClick={handleSave} disabled={!canSave}>
            Save reminder
          </Button>
        </div>
      }
    >
      <div className="space-y-6 max-h-[65vh] overflow-y-auto pr-1">
        {/* What this reminder currently is */}
        {!isCreating && (
          <div className="p-3.5 rounded-[12px] bg-brand-light/50 border border-brand-soft">
            <div className="text-[14px] font-bold text-text-primary">
              {schedule.label || schedule.name}
            </div>
            <div className="text-[13px] text-text-muted mt-0.5">{summary}</div>
          </div>
        )}

        {/* ── Medicine (create mode only) ── */}
        {isCreating && (
          <section>
            <h3 className="text-[12px] font-bold uppercase tracking-wider text-text-muted mb-2">
              Medicine
            </h3>
            <label htmlFor="reminder-name" className="sr-only">
              Medicine name
            </label>
            <input
              id="reminder-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Napa"
              className="w-full h-12 px-3.5 rounded-[12px] border border-border-soft bg-white text-[15px] text-text-primary focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
            />
          </section>
        )}

        {/* ── Dose ── */}
        <section>
          <h3 className="text-[12px] font-bold uppercase tracking-wider text-text-muted mb-2">
            How much
          </h3>
          <label htmlFor="reminder-dose" className="sr-only">
            Dose
          </label>
          <input
            id="reminder-dose"
            value={dose}
            onChange={(e) => setDose(e.target.value)}
            placeholder="e.g. 1 tablet"
            className="w-full h-12 px-3.5 rounded-[12px] border border-border-soft bg-white text-[15px] text-text-primary focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          />
          <p className="text-[12px] text-text-muted mt-1.5">
            This is what your doctor wrote. Keep it exactly as on the label.
          </p>
        </section>

        {/* ── How often ── */}
        <section>
          <h3 className="text-[12px] font-bold uppercase tracking-wider text-text-muted mb-2">
            How often
          </h3>
          <div role="group" aria-label="How often" className="flex gap-2">
            {FREQUENCIES.map((option) => {
              const active = frequencyKind === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFrequencyKind(option.value)}
                  aria-pressed={active}
                  className={`h-11 px-3 flex-1 rounded-[12px] text-[13px] font-bold border transition-colors ${
                    active
                      ? "bg-brand text-white border-brand"
                      : "bg-white text-text-muted border-border-soft hover:border-brand"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          {/* Weekly — day picker */}
          {frequencyKind === "weekly" && (
            <div className="mt-3">
              <div
                role="group"
                aria-label="Days of the week"
                className="grid grid-cols-7 gap-1.5"
              >
                {DAY_NAMES_SHORT.map((day, index) => {
                  const active = daysOfWeek.includes(index);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(index)}
                      aria-pressed={active}
                      aria-label={DAY_NAMES[index]}
                      title={DAY_NAMES[index]}
                      className={`h-11 rounded-[10px] text-[12px] font-bold border transition-colors ${
                        active
                          ? "bg-brand text-white border-brand"
                          : "bg-white text-text-muted border-border-soft hover:border-brand"
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
              <p className="text-[12px] text-text-muted mt-1.5">
                {daysOfWeek.length
                  ? `${daysOfWeek.length} day${daysOfWeek.length === 1 ? "" : "s"} a week`
                  : "Choose at least one day."}
              </p>
            </div>
          )}

          {/* Interval — stepper */}
          {frequencyKind === "interval" && (
            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setEveryDays((n) => Math.max(2, n - 1))}
                aria-label="Fewer days between doses"
                className="w-12 h-12 rounded-[12px] border border-border-soft bg-white text-text-primary text-xl font-bold hover:border-brand transition-colors"
              >
                −
              </button>
              <div className="flex-1 text-center">
                <div className="text-[17px] font-bold text-text-primary">
                  Every {everyDays} days
                </div>
                <div className="text-[12px] text-text-muted">
                  measured from the start date
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEveryDays((n) => Math.min(30, n + 1))}
                aria-label="More days between doses"
                className="w-12 h-12 rounded-[12px] border border-border-soft bg-white text-text-primary text-xl font-bold hover:border-brand transition-colors"
              >
                +
              </button>
            </div>
          )}
        </section>

        {/* ── Times ── */}
        <section>
          <h3 className="text-[12px] font-bold uppercase tracking-wider text-text-muted mb-2 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" aria-hidden="true" />
            Times
          </h3>

          {times.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {times.map((time) => (
                <span
                  key={time}
                  className="inline-flex items-center gap-1.5 h-11 pl-3.5 pr-1.5 rounded-full bg-brand text-white text-[13px] font-bold"
                >
                  {formatClock(time)}
                  <button
                    type="button"
                    onClick={() => removeTime(time)}
                    aria-label={`Remove ${formatClock(time)}`}
                    className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <label htmlFor="reminder-time" className="sr-only">
              Add a dose time
            </label>
            <input
              id="reminder-time"
              type="time"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className="h-12 px-3.5 rounded-[12px] border border-border-soft bg-white text-[15px] text-text-primary focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
            />
            <Button
              size="m"
              variant="secondary"
              onClick={addTime}
              leftIcon={<Plus className="w-4 h-4" />}
              disabled={!newTime || times.includes(newTime)}
            >
              Add time
            </Button>
          </div>
        </section>

        {/* ── Dates ── */}
        <section>
          <h3 className="text-[12px] font-bold uppercase tracking-wider text-text-muted mb-2 flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5" aria-hidden="true" />
            Dates
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="reminder-start"
                className="block text-[12px] font-semibold text-text-muted mb-1"
              >
                Starts
              </label>
              <input
                id="reminder-start"
                type="date"
                value={startDate}
                min={toISODate(Date.now())}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-12 px-3.5 rounded-[12px] border border-border-soft bg-white text-[14px] text-text-primary focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
              />
            </div>
            <div>
              <label
                htmlFor="reminder-end"
                className="block text-[12px] font-semibold text-text-muted mb-1"
              >
                Ends
              </label>
              <input
                id="reminder-end"
                type="date"
                value={endDate}
                min={startDate || toISODate(Date.now())}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full h-12 px-3.5 rounded-[12px] border border-border-soft bg-white text-[14px] text-text-primary focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
              />
            </div>
          </div>
          {startDate && endDate && fromISODate(endDate) < fromISODate(startDate) && (
            <p className="text-[12px] font-semibold text-emergency-dark mt-2">
              The end date is before the start date.
            </p>
          )}
          {(startDate || endDate) && (
            <p className="text-[12px] text-text-muted mt-1.5">
              {startDate ? `Starts ${formatDateLabel(startDate)}` : ""}
              {startDate && endDate ? " · " : ""}
              {endDate ? `ends ${formatDateLabel(endDate)}` : ""}
            </p>
          )}
        </section>

        {/* ── Label & note ── */}
        <section>
          <h3 className="text-[12px] font-bold uppercase tracking-wider text-text-muted mb-2 flex items-center gap-1.5">
            <StickyNote className="w-3.5 h-3.5" aria-hidden="true" />
            Reminder
          </h3>

          <label
            htmlFor="reminder-label"
            className="block text-[12px] font-semibold text-text-muted mb-1"
          >
            Name
          </label>
          <input
            id="reminder-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Morning dose"
            className="w-full h-12 px-3.5 rounded-[12px] border border-border-soft bg-white text-[15px] text-text-primary focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent mb-3"
          />

          <label
            htmlFor="reminder-note"
            className="block text-[12px] font-semibold text-text-muted mb-1"
          >
            Note
          </label>
          <input
            id="reminder-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Take with food"
            className="w-full h-12 px-3.5 rounded-[12px] border border-border-soft bg-white text-[15px] text-text-primary focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent mb-2.5"
          />

          {/* Quick-fill notes */}
          <div className="flex flex-wrap gap-1.5">
            {NOTE_PRESETS.map((preset) => {
              const active = note === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setNote(active ? "" : preset)}
                  aria-pressed={active}
                  className={`h-11 px-3 rounded-full text-[12px] font-semibold border transition-colors inline-flex items-center gap-1 ${
                    active
                      ? "bg-brand text-white border-brand"
                      : "bg-white text-text-muted border-border-soft hover:border-brand"
                  }`}
                >
                  {active && <Check className="w-3.5 h-3.5" aria-hidden="true" />}
                  {preset}
                </button>
              );
            })}
          </div>
        </section>

        {/* Why this matters */}
        <p className="text-[12px] text-text-muted leading-relaxed flex items-start gap-2">
          <Repeat className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
          Changes apply from the next dose onwards. Always follow your
          prescription &mdash; this reminder never changes what your doctor
          told you to take.
        </p>
      </div>
    </Modal>
  );
};
