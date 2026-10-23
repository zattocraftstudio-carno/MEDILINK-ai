/* ═══════════════════════════════════════════════════════════════════
   MediLink — reminder formatting helpers.

   Pure functions that turn a `MedicationSchedule` into the short,
   plain-language lines a patient reads on a phone.

   The rule everywhere here: **say it the way a person would say it.**
   "Every day · 8:30 AM" beats "DAILY;freq=DAILY;times=08:30".
   ═══════════════════════════════════════════════════════════════════ */

import type { MedicationSchedule, ReminderFrequency } from "@/types";

/* ────────────────────────────────────────────────────────────────────
   Days
   ──────────────────────────────────────────────────────────────────── */

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export const DAY_NAMES_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** The weekday of a timestamp, 0 = Sunday. */
export function weekdayOf(timestamp: number): number {
  return new Date(timestamp).getDay();
}

/* ────────────────────────────────────────────────────────────────────
   Dates
   ──────────────────────────────────────────────────────────────────── */

/** "YYYY-MM-DD" for a timestamp, in LOCAL time. */
export function toISODate(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** The timestamp of local midnight on an "YYYY-MM-DD" string. */
export function fromISODate(iso: string): number {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return Date.now();
  return new Date(year, month - 1, day, 0, 0, 0, 0).getTime();
}

/** "21 Oct 2026" */
export function formatDateLabel(iso: string): string {
  const timestamp = fromISODate(iso);
  if (!Number.isFinite(timestamp)) return "";
  return new Date(timestamp).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** "Today" / "Tomorrow" / "21 Oct 2026" */
export function formatRelativeDateLabel(iso: string, now: number = Date.now()): string {
  const timestamp = fromISODate(iso);
  const today = toISODate(now);
  const tomorrow = toISODate(now + 86_400_000);

  if (iso === today) return "Today";
  if (iso === tomorrow) return "Tomorrow";
  return formatDateLabel(iso);
}

/* ────────────────────────────────────────────────────────────────────
   Times
   ──────────────────────────────────────────────────────────────────── */

/** "08:30" → "8:30 AM" */
export function formatClock(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

/** "08:30, 20:30" → "8:30 AM and 8:30 PM" */
export function formatClockList(times: string[] | undefined): string {
  if (!times?.length) return "";
  const labels = times.map(formatClock);
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}

/* ────────────────────────────────────────────────────────────────────
   Frequency
   ──────────────────────────────────────────────────────────────────── */

/** The effective repetition of a schedule. */
export function frequencyKindOf(schedule: MedicationSchedule): ReminderFrequency {
  if (schedule.frequencyKind) return schedule.frequencyKind;
  if (schedule.daysOfWeek?.length) return "weekly";
  if (schedule.everyDays && schedule.everyDays > 1) return "interval";
  return "daily";
}

/**
 * "Every day" / "Mon, Wed, Fri" / "Every 3 days".
 */
export function describeRepetition(schedule: MedicationSchedule): string {
  const kind = frequencyKindOf(schedule);

  if (kind === "weekly") {
    const days = [...(schedule.daysOfWeek ?? [])].sort((a, b) => a - b);
    if (!days.length) return "Every day";
    if (days.length === 7) return "Every day";
    if (days.length === 5 && days.join() === "1,2,3,4,5") return "Weekdays";
    if (days.length === 2 && days.join() === "0,6") return "Weekends";
    return days.map((day) => DAY_NAMES_SHORT[day]).join(", ");
  }

  if (kind === "interval") {
    const every = schedule.everyDays ?? 1;
    return every <= 1 ? "Every day" : `Every ${every} days`;
  }

  return "Every day";
}

/**
 * The one-line summary of a whole reminder, as shown on a card.
 * "Every day · 8:30 AM" · "Mon, Wed, Fri · 2:00 PM and 8:00 PM"
 */
export function describeSchedule(schedule: MedicationSchedule): string {
  const repetition = describeRepetition(schedule);
  const times = formatClockList(schedule.clockTimes);
  return times ? `${repetition} · ${times}` : repetition;
}

/**
 * The secondary line of a card — the dose plus the patient's own note.
 */
export function describeDoseLine(schedule: MedicationSchedule): string {
  const parts: string[] = [];
  if (schedule.dose) parts.push(schedule.dose);
  if (schedule.note) parts.push(schedule.note);
  return parts.join(" · ");
}

/**
 * The range line — "Until 21 Nov 2026" / "Starts 21 Oct 2026".
 */
export function describeDateRange(
  schedule: MedicationSchedule,
  now: number = Date.now(),
): string {
  const start = schedule.startDate ? formatRelativeDateLabel(schedule.startDate, now) : "";
  const end = schedule.endDate ? formatRelativeDateLabel(schedule.endDate, now) : "";

  if (start && end) return `${start} – ${end}`;
  if (end) return `Until ${end}`;
  if (start) return `From ${start}`;
  return "";
}

/* ────────────────────────────────────────────────────────────────────
   Notes
   ──────────────────────────────────────────────────────────────────── */

/** Quick-fill notes a patient is likely to want. */
export const NOTE_PRESETS = [
  "Take with food",
  "Take after food",
  "Take on an empty stomach",
  "Take before bed",
  "Take with a full glass of water",
  "Do not take with milk",
];

/**
 * The note shown to the patient, preferring their own words.
 */
export function noteOf(schedule: MedicationSchedule): string {
  return schedule.note?.trim() || schedule.preparationNote?.trim() || "";
}
