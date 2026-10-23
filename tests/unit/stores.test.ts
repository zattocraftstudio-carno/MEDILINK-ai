/**
 * Store persistence round-trip tests.
 *
 * Gate G-0 exit criterion: the new stores must survive a reload —
 * write a value, read the raw persisted JSON back out, then rehydrate
 * the store from storage and confirm the state came back intact.
 */

import "./setup.ts";

import test from "node:test";
import assert from "node:assert/strict";

import { useMedicationStore } from "../../src/stores/useMedicationStore.ts";
import { useAttachmentStore } from "../../src/stores/useAttachmentStore.ts";
import { useHealthLogStore } from "../../src/stores/useHealthLogStore.ts";
import { useAppointmentStore } from "../../src/stores/useAppointmentStore.ts";
import type { Attachment, MedicationSchedule } from "../../src/types/index.ts";

/* ────────────────────────────────────────────────────────────────────
   Medication schedules
   ──────────────────────────────────────────────────────────────────── */

const sampleSchedule: MedicationSchedule = {
  id: "sch_persist_1",
  createdAt: 1_700_000_000_000,
  updatedAt: 1_700_000_000_000,
  name: "Napa",
  generic: "Paracetamol",
  brand: "Napa",
  dose: "1 tablet",
  frequency: "twice daily after meals",
  timesPerDay: 2,
  anchor: "after_meal",
  clockTimes: ["08:30", "20:30"],
  durationDays: 3,
  startAt: 1_700_000_000_000,
  warnings: [],
  source: "chat",
  status: "active",
  occurrences: [
    {
      id: "sch_persist_1_2026-11-17T02:30:00.000Z",
      scheduleId: "sch_persist_1",
      scheduledAt: 1_700_000_000_000,
      status: "pending",
    },
  ],
};

test("a medication schedule is written to localStorage", () => {
  useMedicationStore.getState().clear();
  useMedicationStore.getState().addSchedule(sampleSchedule);

  const raw = globalThis.localStorage.getItem("medilink_schedules");
  assert.ok(raw, "expected the schedule to be persisted");

  const parsed = JSON.parse(raw) as { state: { schedules: MedicationSchedule[] } };
  assert.equal(parsed.state.schedules.length, 1);
  assert.equal(parsed.state.schedules[0].id, "sch_persist_1");
  assert.equal(parsed.state.schedules[0].dose, "1 tablet");
  assert.deepEqual(parsed.state.schedules[0].clockTimes, ["08:30", "20:30"]);
});

test("a medication schedule survives a simulated reload", async () => {
  useMedicationStore.getState().clear();

  // Simulate a previous session having written this schedule, then a
  // page reload: the in-memory store is rebuilt from storage alone.
  globalThis.localStorage.setItem(
    "medilink_schedules",
    JSON.stringify({ state: { schedules: [sampleSchedule] }, version: 0 }),
  );

  await useMedicationStore.persist.rehydrate();

  const restored = useMedicationStore.getState().schedules;
  assert.equal(restored.length, 1);
  assert.equal(restored[0].name, "Napa");
  assert.equal(restored[0].frequency, "twice daily after meals");
  assert.equal(restored[0].occurrences.length, 1);
});

test("marking a dose as taken is persisted", () => {
  useMedicationStore.getState().clear();
  useMedicationStore.getState().addSchedule(sampleSchedule);

  const occurrenceId = sampleSchedule.occurrences[0].id;
  useMedicationStore.getState().markOccurrence("sch_persist_1", occurrenceId, "taken");

  const raw = globalThis.localStorage.getItem("medilink_schedules");
  const parsed = JSON.parse(raw as string) as { state: { schedules: MedicationSchedule[] } };
  assert.equal(parsed.state.schedules[0].occurrences[0].status, "taken");
});

test("old missed occurrences are pruned so storage cannot grow forever", () => {
  useMedicationStore.getState().clear();

  const stale: MedicationSchedule = {
    ...sampleSchedule,
    id: "sch_stale",
    occurrences: [
      {
        id: "sch_stale_old",
        scheduleId: "sch_stale",
        scheduledAt: Date.now() - 30 * 86_400_000,
        status: "missed",
      },
    ],
  };
  useMedicationStore.getState().addSchedule(stale);

  const raw = globalThis.localStorage.getItem("medilink_schedules");
  const parsed = JSON.parse(raw as string) as { state: { schedules: MedicationSchedule[] } };
  assert.equal(parsed.state.schedules[0].occurrences.length, 0);
});

test("a write before hydration must not wipe the persisted schedules", () => {
  // Regression: the dose-timer panel refreshes the occurrence window on
  // mount. If that write lands before the persisted state is read back,
  // it persists the EMPTY initial state and silently deletes the
  // patient's reminders.
  useMedicationStore.getState().clear();
  useMedicationStore.getState().addSchedule(sampleSchedule);

  // Simulate the pre-hydration window.
  useMedicationStore.setState({ hydrated: false });

  useMedicationStore.getState().refreshOccurrences();

  const raw = globalThis.localStorage.getItem("medilink_schedules");
  const parsed = JSON.parse(raw as string) as { state: { schedules: MedicationSchedule[] } };
  assert.equal(
    parsed.state.schedules.length,
    1,
    "the persisted schedule must survive a pre-hydration refresh",
  );
  assert.equal(parsed.state.schedules[0].name, "Napa");
});

test("after hydration the occurrence window is derived", () => {
  useMedicationStore.getState().clear();
  const now = Date.now();
  useMedicationStore.getState().addSchedule({
    ...sampleSchedule,
    // A course that is still running — a 3-day course that started
    // months ago is over and must NOT keep reminding.
    startAt: now,
    createdAt: now,
    updatedAt: now,
    durationDays: 3,
    occurrences: [],
  });

  useMedicationStore.setState({ hydrated: true });
  useMedicationStore.getState().refreshOccurrences();

  const restored = useMedicationStore.getState().schedules;
  assert.equal(restored.length, 1);
  assert.ok(restored[0].occurrences.length > 0, "occurrences should be materialised");
});

test("a finished course stops reminding", () => {
  useMedicationStore.getState().clear();
  const longAgo = Date.now() - 30 * 86_400_000;
  useMedicationStore.getState().addSchedule({
    ...sampleSchedule,
    id: "sch_finished",
    startAt: longAgo,
    createdAt: longAgo,
    updatedAt: longAgo,
    durationDays: 3,
    occurrences: [],
  });

  useMedicationStore.setState({ hydrated: true });
  useMedicationStore.getState().refreshOccurrences();

  const restored = useMedicationStore
    .getState()
    .schedules.find((schedule) => schedule.id === "sch_finished");
  assert.ok(restored);
  assert.equal(restored.occurrences.length, 0, "a 3-day course from a month ago is over");
});

/* ────────────────────────────────────────────────────────────────────
   Attachments
   ──────────────────────────────────────────────────────────────────── */

const sampleAttachment: Attachment = {
  id: "att_persist_1",
  url: "blob:mock-url",
  type: "image/jpeg",
  timestamp: 1_700_000_000_000,
  kind: "prescription",
  source: "ocr",
  fileName: "prescription.jpg",
  sizeBytes: 128_000,
  model: "tencent/hy-image-v3.5-preview",
  ocrConfidence: 0.82,
  verified: false,
  document: {
    doctorName: "ডাঃ মোঃ রফিকুল ইসলাম",
    clinic: "Popular Diagnostic",
    date: "2026-10-18",
    medicines: [
      {
        rawText: "Napa 500mg (1+0+1)",
        brand: "Napa",
        generic: "Paracetamol",
        strength: "500mg",
        dose: "1 tablet",
        frequency: "twice daily, after meals",
        timesPerDay: 2,
        duration: "3 days",
        confidence: 0.91,
      },
    ],
  },
  rawText: "Napa 500mg (1+0+1)",
  warnings: [],
};

test("an attachment is written to localStorage with url, type and timestamp", () => {
  useAttachmentStore.getState().clear();
  useAttachmentStore.getState().addAttachment(sampleAttachment);

  const raw = globalThis.localStorage.getItem("medilink_attachments");
  assert.ok(raw);

  const parsed = JSON.parse(raw) as { state: { attachments: Attachment[] } };
  const stored = parsed.state.attachments[0];

  assert.equal(stored.id, "att_persist_1");
  assert.equal(stored.url, "blob:mock-url");
  assert.equal(stored.type, "image/jpeg");
  assert.equal(stored.timestamp, 1_700_000_000_000);
  assert.equal(stored.model, "tencent/hy-image-v3.5-preview");
  assert.equal(stored.verified, false);
});

test("an attachment survives a simulated reload", async () => {
  useAttachmentStore.getState().clear();

  globalThis.localStorage.setItem(
    "medilink_attachments",
    JSON.stringify({ state: { attachments: [sampleAttachment] }, version: 0 }),
  );

  await useAttachmentStore.persist.rehydrate();

  const restored = useAttachmentStore.getState().attachments;
  assert.equal(restored.length, 1);
  assert.equal(restored[0].kind, "prescription");
  assert.equal(
    (restored[0].document as { medicines: unknown[] }).medicines.length,
    1,
  );
});

test("confirming an attachment persists the verified flag", () => {
  useAttachmentStore.getState().clear();
  useAttachmentStore.getState().addAttachment(sampleAttachment);
  useAttachmentStore.getState().updateAttachment("att_persist_1", { verified: true });

  const raw = globalThis.localStorage.getItem("medilink_attachments");
  const parsed = JSON.parse(raw as string) as { state: { attachments: Attachment[] } };
  assert.equal(parsed.state.attachments[0].verified, true);
  assert.equal(useAttachmentStore.getState().getConfirmed().length, 1);
});

test("an OCR result is persisted with the attachment, not held in memory only", () => {
  useAttachmentStore.getState().clear();
  useAttachmentStore.getState().addAttachment({ ...sampleAttachment, document: null });

  // This is exactly what the scan callback does.
  useAttachmentStore.getState().updateAttachment("att_persist_1", {
    kind: "prescription",
    document: sampleAttachment.document,
    ocrConfidence: 0.82,
    rawText: "Napa 500mg (1+0+1)",
    warnings: [],
    model: "tencent/hy-image-v3.5-preview",
  });

  const raw = localStorage.getItem("medilink_attachments");
  const parsed = JSON.parse(raw as string) as { state: { attachments: Attachment[] } };
  const stored = parsed.state.attachments[0];

  assert.notEqual(stored.document, null);
  assert.equal((stored.document as { medicines: unknown[] }).medicines.length, 1);
  assert.equal(stored.ocrConfidence, 0.82);
  assert.equal(stored.model, "tencent/hy-image-v3.5-preview");
});

test("an OCR result survives a simulated reload", async () => {
  const withDocument = { ...sampleAttachment, document: sampleAttachment.document };

  globalThis.localStorage.setItem(
    "medilink_attachments",
    JSON.stringify({ state: { attachments: [withDocument] }, version: 0 }),
  );

  await useAttachmentStore.persist.rehydrate();

  const restored = useAttachmentStore.getState().attachments[0];
  assert.notEqual(restored.document, null);
  assert.equal(restored.ocrConfidence, 0.82);
  assert.equal((restored.document as { medicines: unknown[] }).medicines.length, 1);
});

/* ────────────────────────────────────────────────────────────────────
   Health Logs & Vitals
   ──────────────────────────────────────────────────────────────────── */

test("a health log entry is stored and formats summary for prompt", () => {
  useHealthLogStore.getState().clearLogs();
  assert.equal(useHealthLogStore.getState().logs.length, 0);

  useHealthLogStore.getState().addLog({
    type: "bp",
    systolic: 120,
    diastolic: 80,
    note: "Normal reading",
  });

  useHealthLogStore.getState().addLog({
    type: "sugar",
    value: 6.2,
    context: "fasting",
  });

  assert.equal(useHealthLogStore.getState().logs.length, 2);

  const promptSummary = useHealthLogStore.getState().formatSummaryForPrompt(5);
  assert.ok(promptSummary.includes("BP: 120/80 mmHg"));
  assert.ok(promptSummary.includes("Blood Glucose: 6.2 mmol/L [fasting]"));

  const raw = localStorage.getItem("medilink_health_logs");
  assert.ok(raw);
  assert.ok(raw.includes("120"));
});

/* ────────────────────────────────────────────────────────────────────
   Appointments & Reminders
   ──────────────────────────────────────────────────────────────────── */

test("an appointment is saved and tracked as upcoming", () => {
  useAppointmentStore.setState({ appointments: [] });
  assert.equal(useAppointmentStore.getState().appointments.length, 0);

  const apt = useAppointmentStore.getState().addAppointment({
    doctorId: "doc_1",
    doctorName: "Dr. Karim Ahmed",
    specialty: "Cardiology",
    type: "chat",
    date: "2099-12-31",
    time: "10:30 AM",
    remind1DayBefore: true,
    remind1HourBefore: true,
    fee: 400,
  });

  assert.equal(apt.status, "upcoming");
  assert.equal(useAppointmentStore.getState().appointments.length, 1);

  const upcoming = useAppointmentStore.getState().getUpcomingAppointments();
  assert.equal(upcoming.length, 1);
  assert.equal(upcoming[0].doctorName, "Dr. Karim Ahmed");

  useAppointmentStore.getState().cancelAppointment(apt.id);
  assert.equal(useAppointmentStore.getState().appointments[0].status, "cancelled");
  assert.equal(useAppointmentStore.getState().getUpcomingAppointments().length, 0);
});


/* ────────────────────────────────────────────────────────────────────
   Memory Store — auto-extraction and persistence
   ──────────────────────────────────────────────────────────────────── */

import { useMemoryStore } from "../../src/stores/useMemoryStore.ts";

test("a memory is extracted from a user message about a condition", () => {
  useMemoryStore.setState({ memories: [] });
  assert.equal(useMemoryStore.getState().memories.length, 0);

  useMemoryStore.getState().processUserMessage("I have diabetes and I am allergic to penicillin");

  const memories = useMemoryStore.getState().memories;
  assert.ok(memories.length >= 2, `Expected at least 2 memories, got ${memories.length}`);

  const texts = memories.map((m) => m.text.toLowerCase());
  assert.ok(texts.some((t) => t.includes("diabetes")), "Should extract diabetes condition");
  assert.ok(texts.some((t) => t.includes("penicillin")), "Should extract penicillin allergy");
});

test("duplicate memories are not stored twice", () => {
  useMemoryStore.setState({ memories: [] });

  useMemoryStore.getState().processUserMessage("I have diabetes");
  useMemoryStore.getState().processUserMessage("I have diabetes");

  const memories = useMemoryStore.getState().memories;
  const diabetesCount = memories.filter((m) =>
    m.text.toLowerCase().includes("diabetes"),
  ).length;
  assert.equal(diabetesCount, 1, "Duplicate memory should not be stored");
});

test("memory store persists to localStorage", () => {
  useMemoryStore.setState({ memories: [] });
  useMemoryStore.getState().addMemory("Has high blood pressure", "condition", "auto");

  const raw = globalThis.localStorage.getItem("medilink_memories");
  assert.ok(raw, "Memory should be persisted");
  assert.ok(raw.includes("high blood pressure"), "Persisted data should contain the memory text");
});

test("Bangla memory extraction works", () => {
  useMemoryStore.setState({ memories: [] });

  useMemoryStore.getState().processUserMessage("আমি ডায়াবেটিস রোগী");

  const memories = useMemoryStore.getState().memories;
  assert.ok(memories.length >= 1, "Should extract at least one memory from Bangla");
  assert.ok(
    memories.some((m) => m.category === "condition"),
    "Should categorize as a condition",
  );
});

test("explicit remember command creates a memory", () => {
  useMemoryStore.setState({ memories: [] });

  useMemoryStore.getState().processUserMessage("Remember that I take metformin every morning");

  const memories = useMemoryStore.getState().memories;
  assert.ok(memories.length >= 1, "Should extract a memory from explicit remember command");
});

/* ────────────────────────────────────────────────────────────────────
   Language Store — i18n persistence and toggle
   ──────────────────────────────────────────────────────────────────── */

import { useLanguageStore } from "../../src/stores/useLanguageStore.ts";

test("language store toggles between English and Bangla", () => {
  useLanguageStore.getState().setLanguage("en");
  assert.equal(useLanguageStore.getState().language, "en");
  assert.equal(useLanguageStore.getState().t.nav.chat, "Chat");

  useLanguageStore.getState().toggleLanguage();
  assert.equal(useLanguageStore.getState().language, "bn");
  assert.equal(useLanguageStore.getState().t.nav.chat, "চ্যাট");

  useLanguageStore.getState().toggleLanguage();
  assert.equal(useLanguageStore.getState().language, "en");
  assert.equal(useLanguageStore.getState().t.nav.chat, "Chat");
});

test("language store persists to localStorage", () => {
  useLanguageStore.getState().setLanguage("bn");
  const raw = globalThis.localStorage.getItem("medilink_language");
  assert.ok(raw, "Language should be persisted in localStorage");
  assert.ok(raw.includes('"bn"'), "Persisted data should contain 'bn'");
});
