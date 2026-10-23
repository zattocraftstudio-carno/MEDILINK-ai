/**
 * Unit tests for the dose schedule builder and safety-warning engine.
 *
 * These cover the safety half of F-3 (Dose Timer): the rules that decide
 * whether a reminder may exist at all (PRD §3.3.4).
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  buildSchedule,
  deriveOccurrences,
  deriveSeverity,
  detectRiskSignals,
  evaluateWarnings,
  getMissedOccurrences,
  getUpcomingOccurrences,
  markOccurrence,
  minutesToClock,
  clockToMinutes,
} from "../../src/lib/dose-schedule.ts";

/* ────────────────────────────────────────────────────────────────────
   W-1 Allergy — hard block
   ──────────────────────────────────────────────────────────────────── */

test("W-1: an allergy in the same family blocks the reminder", () => {
  const { warnings, blocked } = evaluateWarnings(
    { name: "Amoxicillin", generic: "Amoxicillin" },
    { allergies: ["Penicillin"] },
  );
  assert.equal(blocked, true);
  const allergy = warnings.find((w) => w.code === "ALLERGY");
  assert.ok(allergy);
  assert.equal(allergy.severity, "block");
});

test("W-1: an unrelated allergy does not block", () => {
  const { blocked } = evaluateWarnings(
    { name: "Napa", generic: "Paracetamol" },
    { allergies: ["Penicillin"] },
  );
  assert.equal(blocked, false);
});

/* ────────────────────────────────────────────────────────────────────
   W-2 Dengue
   ──────────────────────────────────────────────────────────────────── */

test("W-2: suspected dengue blocks ibuprofen", () => {
  const { warnings, blocked } = evaluateWarnings(
    { name: "Ibuprofen", generic: "Ibuprofen" },
    { conversationText: "jore 3 din, dengue hote pare" },
  );
  assert.equal(blocked, true);
  assert.equal(warnings.find((w) => w.code === "DENGUE")?.severity, "block");
});

test("W-2: a fever alone only warns, it does not block", () => {
  const { warnings, blocked } = evaluateWarnings(
    { name: "Ibuprofen", generic: "Ibuprofen" },
    { conversationText: "2 din dhore jor ase" },
  );
  assert.equal(blocked, false);
  assert.equal(warnings.find((w) => w.code === "DENGUE")?.severity, "acknowledge");
});

test("W-2: paracetamol is never blocked by the dengue rule", () => {
  const { blocked } = evaluateWarnings(
    { name: "Napa", generic: "Paracetamol" },
    { conversationText: "jore 3 din, dengue hote pare" },
  );
  assert.equal(blocked, false);
});

test("detectRiskSignals separates fever from dengue suspicion", () => {
  const feverOnly = detectRiskSignals(
    { name: "Ibuprofen" },
    { conversationText: "3 din dhore jor" },
  );
  assert.equal(feverOnly.fever, true);
  assert.equal(feverOnly.dengueSuspected, false);

  const dengue = detectRiskSignals(
    { name: "Ibuprofen" },
    { conversationText: "jore 3 din ar black stool" },
  );
  assert.equal(dengue.dengueSuspected, true);
});

/* ────────────────────────────────────────────────────────────────────
   W-3 / W-4 / W-5 / W-6 — acknowledgement warnings
   ──────────────────────────────────────────────────────────────────── */

test("W-3: an NSAID with a recorded condition must be acknowledged", () => {
  const { warnings, blocked } = evaluateWarnings(
    { name: "Ibuprofen", generic: "Ibuprofen" },
    { conditions: ["Asthma"] },
  );
  assert.equal(blocked, false);
  assert.equal(warnings.find((w) => w.code === "NSAID_CONDITION")?.severity, "acknowledge");
});

test("W-4: a prescription-only medicine must be acknowledged", () => {
  const { warnings, blocked } = evaluateWarnings(
    { name: "Amoxicillin", generic: "Amoxicillin", requiresRx: true },
    {},
  );
  assert.equal(blocked, false);
  assert.equal(warnings.find((w) => w.code === "RX_ONLY")?.severity, "acknowledge");
});

test("W-5: two products of the same generic must be acknowledged", () => {
  const { warnings } = evaluateWarnings(
    { name: "Napa", generic: "Paracetamol" },
    { siblings: [{ name: "Ace", generic: "Paracetamol" }] },
  );
  assert.equal(warnings.find((w) => w.code === "DUPLICATE")?.severity, "acknowledge");
});

test("W-6: more than four doses a day must be acknowledged", () => {
  const { warnings } = evaluateWarnings(
    { name: "Napa", generic: "Paracetamol" },
    {},
    { timesPerDay: 6 },
  );
  assert.equal(warnings.find((w) => w.code === "OVER_FREQUENCY")?.severity, "acknowledge");
});

test("W-7: the missed-dose rule is always present and informational", () => {
  const { warnings } = evaluateWarnings({ name: "Napa", generic: "Paracetamol" }, {});
  const missed = warnings.find((w) => w.code === "MISSED_DOSE_RULE");
  assert.ok(missed);
  assert.equal(missed.severity, "info");
});

/* ────────────────────────────────────────────────────────────────────
   Schedule construction
   ──────────────────────────────────────────────────────────────────── */

const safeWarnings = [
  {
    code: "MISSED_DOSE_RULE" as const,
    severity: "info" as const,
    message: "If you miss a dose, skip it — never double up the next one.",
    acknowledged: true,
  },
];

test("buildSchedule refuses to build while a block warning stands", () => {
  assert.throws(
    () =>
      buildSchedule({
        id: "sch_1",
        subject: { name: "Amoxicillin", generic: "Amoxicillin" },
        dose: "1 capsule",
        frequency: "three times a day",
        timesPerDay: 3,
        source: "chat",
        warnings: [
          {
            code: "ALLERGY",
            severity: "block",
            message: "Allergy conflict.",
            acknowledged: false,
          },
        ],
      }),
    /blocking safety warning/i,
  );
});

test("buildSchedule materialises occurrences from the confirmed times", () => {
  const now = localTime(2026, 10, 20, 6);
  const schedule = buildSchedule({
    id: "sch_2",
    subject: { name: "Napa", generic: "Paracetamol" },
    dose: "1 tablet",
    frequency: "twice daily after meals",
    timesPerDay: 2,
    anchor: "after_meal",
    durationDays: 3,
    startAt: now,
    source: "chat",
    warnings: safeWarnings,
    now,
  });

  assert.equal(schedule.clockTimes?.length, 2);
  assert.ok(schedule.occurrences.length > 0);
  assert.equal(schedule.occurrences[0].scheduleId, "sch_2");
});

test("buildSchedule never invents times when none were confirmed", () => {
  const now = Date.now();
  const schedule = buildSchedule({
    id: "sch_3",
    subject: { name: "Napa", generic: "Paracetamol" },
    dose: "1 tablet",
    frequency: "as stated in your chat",
    source: "chat",
    warnings: safeWarnings,
    now,
  });

  assert.deepEqual(schedule.clockTimes, []);
  assert.deepEqual(schedule.occurrences, []);
});

/* ────────────────────────────────────────────────────────────────────
   Occurrences
   ──────────────────────────────────────────────────────────────────── */

/**
 * Occurrences fire at a LOCAL wall-clock time ("08:00" means 8 AM on
 * the patient's own clock), so the fixtures are built in local time
 * rather than UTC.
 */
function localTime(
  year: number,
  month: number,
  day: number,
  hours = 0,
  minutes = 0,
): number {
  return new Date(year, month - 1, day, hours, minutes, 0, 0).getTime();
}

test("occurrence ids are deterministic so a reload cannot duplicate a dose", () => {
  const startAt = localTime(2026, 10, 20);
  const schedule = {
    id: "sch_4",
    clockTimes: ["08:00", "20:00"],
    startAt,
    durationDays: 2,
  };

  const first = deriveOccurrences(schedule, localTime(2026, 10, 20, 7));
  const second = deriveOccurrences(schedule, localTime(2026, 10, 20, 7, 5), 72, first);

  assert.deepEqual(
    first.map((o) => o.id),
    second.map((o) => o.id),
  );
  assert.equal(new Set(second.map((o) => o.id)).size, second.length);
});

test("a dose more than an hour late is marked missed, not pending", () => {
  const startAt = localTime(2026, 10, 20);
  const schedule = { id: "sch_5", clockTimes: ["08:00"], startAt, durationDays: 2 };

  const twoHoursLater = localTime(2026, 10, 20, 10);
  const occurrences = deriveOccurrences(schedule, twoHoursLater);

  assert.equal(occurrences[0].status, "missed");
});

test("a dose that is merely overdue by a few minutes is still pending", () => {
  const startAt = localTime(2026, 10, 20);
  const schedule = { id: "sch_6", clockTimes: ["08:00"], startAt, durationDays: 2 };

  const tenMinutesLater = localTime(2026, 10, 20, 8, 10);
  const occurrences = deriveOccurrences(schedule, tenMinutesLater);

  assert.equal(occurrences[0].status, "pending");
});

test("occurrences land on the requested local wall-clock time", () => {
  const startAt = localTime(2026, 10, 20);
  const schedule = { id: "sch_9", clockTimes: ["08:00", "20:00"], startAt, durationDays: 1 };

  const occurrences = deriveOccurrences(schedule, localTime(2026, 10, 20, 7));
  const first = new Date(occurrences[0].scheduledAt);

  assert.equal(first.getHours(), 8);
  assert.equal(first.getMinutes(), 0);
});

test("markOccurrence records the action", () => {
  const startAt = localTime(2026, 10, 20);
  const schedule = {
    id: "sch_7",
    clockTimes: ["08:00", "20:00"],
    startAt,
    durationDays: 2,
  };
  const occurrences = deriveOccurrences(schedule, localTime(2026, 10, 20, 7));

  const target = occurrences[0];
  const updated = markOccurrence(
    { id: "sch_7", occurrences } as never,
    target.id,
    "taken",
    localTime(2026, 10, 20, 8, 1),
  );

  assert.equal(updated.occurrences[0].status, "taken");
  assert.ok(updated.occurrences[0].actedAt);
  assert.equal(updated.occurrences[1].status, "pending");
});

test("upcoming and missed queries split the schedule correctly", () => {
  const startAt = localTime(2026, 10, 20);
  const schedule = {
    id: "sch_8",
    clockTimes: ["08:00", "20:00"],
    startAt,
    durationDays: 2,
    status: "active" as const,
  };
  const now = localTime(2026, 10, 20, 10);
  const occurrences = deriveOccurrences(schedule, now);

  const full = { ...schedule, occurrences } as never;
  const upcoming = getUpcomingOccurrences([full], now);
  const missed = getMissedOccurrences([full], now);

  assert.equal(missed.length, 1);
  assert.ok(missed[0].scheduledAt < now);
  assert.ok(upcoming.every((o) => o.status === "pending"));
});

/* ────────────────────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────────────────────── */

test("clock helpers round-trip", () => {
  assert.equal(clockToMinutes("08:30"), 510);
  assert.equal(minutesToClock(510), "08:30");
  assert.equal(minutesToClock(1440 + 60), "01:00");
});

test("severity is derived from the patient's own words only", () => {
  assert.equal(deriveSeverity("the pain is very bad"), "severe");
  assert.equal(deriveSeverity("ektu hat dhore ache"), "mild");
  assert.equal(deriveSeverity("everything is fine"), "unknown");
});
