/**
 * Unit tests for the reminder customisation rules.
 *
 * These cover the patient-facing surface of F-3: how a schedule reads
 * back in words, and — most importantly — that the occurrence engine
 * honours the days and dates the patient chose.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  DAY_NAMES_SHORT,
  describeDateRange,
  describeDoseLine,
  describeRepetition,
  describeSchedule,
  formatClock,
  formatClockList,
  formatDateLabel,
  fromISODate,
  noteOf,
  toISODate,
} from "../../src/lib/reminder-format.ts";
import { deriveOccurrences } from "../../src/lib/dose-schedule.ts";
import type { MedicationSchedule } from "../../src/types/index.ts";

/* ────────────────────────────────────────────────────────────────────
   Formatting
   ──────────────────────────────────────────────────────────────────── */

test("clock times read the way a person says them", () => {
  assert.equal(formatClock("08:30"), "8:30 AM");
  assert.equal(formatClock("12:00"), "12:00 PM");
  assert.equal(formatClock("00:05"), "12:05 AM");
  assert.equal(formatClock("20:30"), "8:30 PM");
});

test("two times join with 'and', more than two with commas", () => {
  assert.equal(formatClockList(["08:30", "20:30"]), "8:30 AM and 8:30 PM");
  assert.equal(
    formatClockList(["08:00", "12:00", "20:00"]),
    "8:00 AM, 12:00 PM and 8:00 PM",
  );
  assert.equal(formatClockList([]), "");
});

test("dates round-trip through the ISO day format", () => {
  const timestamp = new Date(2026, 9, 21, 13, 45).getTime();
  const iso = toISODate(timestamp);
  assert.equal(iso, "2026-10-21");
  assert.equal(fromISODate(iso), new Date(2026, 9, 21, 0, 0, 0, 0).getTime());
});

test("a date is shown in plain words", () => {
  assert.equal(formatDateLabel("2026-10-21"), "21 Oct 2026");
});

/* ────────────────────────────────────────────────────────────────────
   Repetition wording
   ──────────────────────────────────────────────────────────────────── */

function makeSchedule(patch: Partial<MedicationSchedule> = {}): MedicationSchedule {
  return {
    id: "sch_test",
    createdAt: 0,
    updatedAt: 0,
    name: "Napa",
    dose: "1 tablet",
    frequency: "2× daily",
    timesPerDay: 1,
    anchor: "morning",
    clockTimes: ["08:00"],
    startAt: Date.now(),
    warnings: [],
    source: "manual",
    status: "active",
    occurrences: [],
    ...patch,
  };
}

test("the repetition reads as a sentence", () => {
  assert.equal(describeRepetition(makeSchedule()), "Every day");
  assert.equal(
    describeRepetition(makeSchedule({ frequencyKind: "weekly", daysOfWeek: [1, 3, 5] })),
    "Mon, Wed, Fri",
  );
  assert.equal(
    describeRepetition(makeSchedule({ frequencyKind: "interval", everyDays: 3 })),
    "Every 3 days",
  );
});

test("a full week is called every day, and Mon-Fri is called weekdays", () => {
  assert.equal(
    describeRepetition(makeSchedule({ frequencyKind: "weekly", daysOfWeek: [0, 1, 2, 3, 4, 5, 6] })),
    "Every day",
  );
  assert.equal(
    describeRepetition(makeSchedule({ frequencyKind: "weekly", daysOfWeek: [1, 2, 3, 4, 5] })),
    "Weekdays",
  );
  assert.equal(
    describeRepetition(makeSchedule({ frequencyKind: "weekly", daysOfWeek: [0, 6] })),
    "Weekends",
  );
});

test("the schedule summary joins the repetition and the times", () => {
  assert.equal(
    describeSchedule(makeSchedule({ clockTimes: ["08:30", "20:30"] })),
    "Every day · 8:30 AM and 8:30 PM",
  );
});

test("the dose line carries the patient's own note", () => {
  assert.equal(
    describeDoseLine(makeSchedule({ dose: "1 tablet", note: "Take with food" })),
    "1 tablet · Take with food",
  );
});

test("the note falls back to the preparation note from the chat", () => {
  assert.equal(noteOf(makeSchedule({ preparationNote: "khali pete noy" })), "khali pete noy");
  assert.equal(noteOf(makeSchedule({ note: "Take with food", preparationNote: "x" })), "Take with food");
  assert.equal(noteOf(makeSchedule()), "");
});

test("the date range reads as a range", () => {
  const schedule = makeSchedule({ startDate: "2026-10-21", endDate: "2026-11-21" });
  assert.ok(describeDateRange(schedule).includes("–"));
});

/* ────────────────────────────────────────────────────────────────────
   The engine honours the patient's choices
   ──────────────────────────────────────────────────────────────────── */

/** A fixed "now" so the test never depends on the wall clock. */
const NOW = new Date(2026, 9, 21, 9, 0, 0, 0).getTime(); // Wed 21 Oct 2026, 9am

function timesOf(occurrences: { scheduledAt: number }[]): string[] {
  return occurrences.map((o) => toISODate(o.scheduledAt));
}

test("a weekly reminder only fires on the chosen days", () => {
  // Wednesday only.
  const schedule = makeSchedule({
    frequencyKind: "weekly",
    daysOfWeek: [3],
    clockTimes: ["08:00"],
    startAt: NOW,
  });

  const occurrences = deriveOccurrences(schedule, NOW, 24 * 7);
  const days = timesOf(occurrences);

  assert.ok(days.length > 0);
  assert.ok(
    days.every((day) => new Date(day + "T00:00:00").getDay() === 3),
    `every occurrence should be a Wednesday, got ${[...new Set(days)].join(", ")}`,
  );
});

test("an every-N-days reminder skips the days in between", () => {
  const schedule = makeSchedule({
    frequencyKind: "interval",
    everyDays: 3,
    clockTimes: ["08:00"],
    startDate: toISODate(NOW),
    startAt: NOW,
  });

  const occurrences = deriveOccurrences(schedule, NOW, 24 * 14);
  const days = [...new Set(timesOf(occurrences))];

  assert.ok(days.length >= 2);
  for (let i = 1; i < days.length; i += 1) {
    const gap = Math.round(
      (fromISODate(days[i]) - fromISODate(days[i - 1])) / 86_400_000,
    );
    assert.equal(gap % 3, 0, `the gap between doses should be a multiple of 3 days`);
  }
});

test("a reminder never fires before its start date", () => {
  const schedule = makeSchedule({
    clockTimes: ["08:00"],
    startDate: toISODate(NOW + 3 * 86_400_000),
    startAt: NOW + 3 * 86_400_000,
  });

  const occurrences = deriveOccurrences(schedule, NOW, 24 * 7);
  for (const occurrence of occurrences) {
    assert.ok(occurrence.scheduledAt >= NOW + 2 * 86_400_000);
  }
});

test("a reminder never fires after its end date", () => {
  const endDate = toISODate(NOW + 2 * 86_400_000);
  const schedule = makeSchedule({
    clockTimes: ["08:00"],
    endDate,
    startAt: NOW,
  });

  const occurrences = deriveOccurrences(schedule, NOW, 24 * 14);
  for (const occurrence of occurrences) {
    assert.ok(
      occurrence.scheduledAt <= fromISODate(endDate) + 86_399_999,
      "no occurrence may land after the end date",
    );
  }
});

test("a daily reminder is unaffected by the new fields", () => {
  const schedule = makeSchedule({ clockTimes: ["08:00"], startAt: NOW });
  const occurrences = deriveOccurrences(schedule, NOW, 24 * 3);
  const days = [...new Set(timesOf(occurrences))];
  assert.ok(days.length >= 3, "a daily reminder should cover three days");
});

test("the day names are Sunday-first", () => {
  assert.equal(DAY_NAMES_SHORT[0], "Sun");
  assert.equal(DAY_NAMES_SHORT[6], "Sat");
});
