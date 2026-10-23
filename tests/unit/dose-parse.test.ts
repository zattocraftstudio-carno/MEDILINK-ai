/**
 * Unit tests for the medication & frequency parser.
 *
 * These cover the extraction half of F-3 (Dose Timer). The safety
 * half lives in dose-schedule.test.ts.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  extractMedicationMentions,
  extractMedicationDraft,
  extractMedicineContext,
  matchesAllergyFamily,
  normaliseDigits,
  normaliseText,
  parseDose,
  parseDuration,
  parseFrequency,
  resolveClockTimes,
} from "../../src/lib/dose-parse.ts";

/* ────────────────────────────────────────────────────────────────────
   Normalisation
   ──────────────────────────────────────────────────────────────────── */

test("normaliseDigits converts Bangla numerals", () => {
  assert.equal(normaliseDigits("৩ দিন"), "3 দিন");
  assert.equal(normaliseDigits("১২৩"), "123");
});

test("normaliseText collapses whitespace and lowercases", () => {
  assert.equal(normaliseText("  Napa   500mg  "), "napa 500mg");
});

/* ────────────────────────────────────────────────────────────────────
   Medication detection
   ──────────────────────────────────────────────────────────────────── */

test("extracts a brand and preserves its original casing", () => {
  const mentions = extractMedicationMentions("Take Napa 500mg after food.");
  assert.equal(mentions.length, 1);
  assert.equal(mentions[0].rawText, "Napa");
  assert.equal(mentions[0].generic, "Paracetamol");
  assert.equal(mentions[0].brand, "Napa");
});

test("merges brand and generic aliases of the same medicine", () => {
  const mentions = extractMedicationMentions("Napa/Paracetamol 500mg khte paren.");
  assert.equal(mentions.length, 1);
  assert.equal(mentions[0].generic, "Paracetamol");
  assert.equal(mentions[0].rawText, "Napa/Paracetamol");
});

test("keeps comma-separated products of the same generic apart", () => {
  const mentions = extractMedicationMentions("I have Napa 500mg and Ace 500mg in my bag.");
  assert.equal(mentions.length, 2);
  assert.deepEqual(
    mentions.map((m) => m.generic),
    ["Paracetamol", "Paracetamol"],
  );
});

test("rejects an ambiguous brand without a dose signal", () => {
  assert.equal(extractMedicationMentions("I will ace this exam tomorrow.").length, 0);
  assert.equal(extractMedicationMentions("Take Ace 500mg today.").length, 1);
});

test("does not match a brand inside a longer word", () => {
  const mentions = extractMedicationMentions("I will ace this exam tomorrow.");
  assert.equal(mentions.length, 0);
});

test("requires a dose signal before accepting an ambiguous brand", () => {
  assert.equal(extractMedicationMentions("Take zinc daily.").length, 1);
  assert.equal(extractMedicationMentions("The zinc of the roof is rusting.").length, 0);
});

test("finds the ORS brands Dr MediLink actually recommends", () => {
  const mentions = extractMedicationMentions("dab ar khabar saline cholte thakuk");
  assert.equal(mentions.length, 1);
  assert.equal(mentions[0].generic, "Oral Rehydration Saline");
});

test("one product described two ways is still one medicine", () => {
  // "Orsaline-N 1 sachet khabar saline" is a single sachet of ORS,
  // not two products — otherwise the duplicate-therapy warning fires
  // on the patient's own single dose.
  const mentions = extractMedicationMentions(
    "Orsaline-N 1 sachet khabar saline thakte paren",
  );
  assert.equal(mentions.length, 1);
  assert.equal(mentions[0].generic, "Oral Rehydration Saline");
});

test("finds a prescription-only antibiotic", () => {
  const mentions = extractMedicationMentions("Amoxicillin 500mg three times a day");
  assert.equal(mentions.length, 1);
  assert.equal(mentions[0].generic, "Amoxicillin");
});

/* ────────────────────────────────────────────────────────────────────
   Frequency parsing
   ──────────────────────────────────────────────────────────────────── */

test("parses doctor shorthand 1+0+1 as twice daily", () => {
  const hint = parseFrequency("1+0+1");
  assert.equal(hint.timesPerDay, 2);
  assert.deepEqual(resolveClockTimes(hint), ["08:00", "20:00"]);
});

test("parses 0+1+0+1 as twice daily", () => {
  const hint = parseFrequency("0+1+0+1");
  assert.equal(hint.timesPerDay, 2);
});

test("parses 'twice daily' with an after-meal anchor", () => {
  const hint = parseFrequency("Napa twice daily after meals");
  assert.equal(hint.timesPerDay, 2);
  assert.equal(hint.anchor, "after_meal");
  // After-meal times are shifted 30 minutes past the base slot.
  assert.deepEqual(resolveClockTimes(hint), ["08:30", "20:30"]);
});

test("parses 'three times a day'", () => {
  assert.equal(parseFrequency("three times a day").timesPerDay, 3);
});

test("parses 'every 6 hours' as an interval schedule", () => {
  const hint = parseFrequency("every 6 hours");
  assert.equal(hint.intervalHours, 6);
  assert.equal(hint.anchor, "interval");
  assert.equal(resolveClockTimes(hint).length, 4);
});

test("parses the Bangla word for twice a day", () => {
  assert.equal(parseFrequency("দুইবার দিনে খাবেন").timesPerDay, 2);
});

test("detects a before-bed anchor", () => {
  assert.equal(parseFrequency("before bed, once").anchor, "before_bed");
});

test("detects an empty-stomach anchor from Banglish", () => {
  assert.equal(parseFrequency("khali pete noy").anchor, "before_meal");
});

test("SAFETY S-1: no timing signal yields no schedule at all", () => {
  const hint = parseFrequency("Napa khte paren");
  assert.equal(hint.timesPerDay, undefined);
  assert.deepEqual(resolveClockTimes(hint), []);
});

/* ────────────────────────────────────────────────────────────────────
   Duration parsing
   ──────────────────────────────────────────────────────────────────── */

test("parses an English duration", () => {
  assert.equal(parseDuration("for 3 days").days, 3);
});

test("parses a Banglish duration", () => {
  assert.equal(parseDuration("tini din").days, 3);
});

test("parses a Bangla-numeral duration", () => {
  assert.equal(parseDuration("৩ দিন").days, 3);
});

test("parses a week and a month", () => {
  assert.equal(parseDuration("for 1 week").days, 7);
  assert.equal(parseDuration("2 months").days, 60);
});

test("returns nothing when no duration is stated", () => {
  assert.deepEqual(parseDuration("take it after food"), {});
});

/* ────────────────────────────────────────────────────────────────────
   Dose text
   ──────────────────────────────────────────────────────────────────── */

test("extracts a dose expression", () => {
  assert.equal(parseDose("1 tablet twice daily"), "1 tablet");
  assert.equal(parseDose("1 sachet in water"), "1 sachet");
});

test("does not mistake a strength for a dose", () => {
  assert.equal(parseDose("Amoxicillin 500mg three times a day"), undefined);
});

/* ────────────────────────────────────────────────────────────────────
   Allergy families
   ──────────────────────────────────────────────────────────────────── */

test("matches an allergy family member", () => {
  assert.equal(matchesAllergyFamily("Amoxicillin", "Penicillin"), true);
  assert.equal(matchesAllergyFamily("Ibuprofen", "NSAID"), true);
});

test("does not match an unrelated medicine", () => {
  assert.equal(matchesAllergyFamily("Napa", "Penicillin"), false);
  assert.equal(matchesAllergyFamily("Orsaline-N", "Penicillin"), false);
});

/* ────────────────────────────────────────────────────────────────────
   One-shot draft
   ──────────────────────────────────────────────────────────────────── */

test("extracts a complete draft from a single sentence", () => {
  const draft = extractMedicationDraft("Napa 1 tablet twice daily after meals for 3 days");
  assert.equal(draft.mentions.length, 1);
  assert.equal(draft.mentions[0].generic, "Paracetamol");
  assert.equal(draft.frequency.timesPerDay, 2);
  assert.equal(draft.duration.days, 3);
  assert.equal(draft.dose, "1 tablet");
});

/* ────────────────────────────────────────────────────────────────────
   Per-medicine context
   ──────────────────────────────────────────────────────────────────── */

test("each medicine keeps its OWN frequency from a multi-medicine message", () => {
  // SAFETY: reading the frequency from the message as a whole gave every
  // medicine the same regimen, so a 4-times-a-day saline became a
  // 2-times-a-day reminder and the patient would have been UNDER-DOSED.
  const text =
    "Napa/Paracetamol 500mg 1 tablet, twice a day after meals, for 3 days. " +
    "Orsaline-N 1 sachet in half a glass of water, 4 times daily.";

  const mentions = extractMedicationDraft(text).mentions;
  assert.equal(mentions.length, 2);

  const napa = extractMedicineContext(text, mentions[0], mentions);
  const ors = extractMedicineContext(text, mentions[1], mentions);

  assert.equal(napa.frequency.timesPerDay, 2);
  assert.equal(ors.frequency.timesPerDay, 4);

  assert.equal(napa.dose, "1 tablet");
  assert.equal(ors.dose, "1 sachet");

  assert.equal(napa.duration.days, 3);
});

test("the duration of each medicine is read from its own text", () => {
  const text = "Napa 1 tablet twice daily for 3 days. Amoxicillin 1 capsule twice daily for 10 days.";
  const mentions = extractMedicationDraft(text).mentions;
  assert.equal(mentions.length, 2);

  const napa = extractMedicineContext(text, mentions[0], mentions);
  const amox = extractMedicineContext(text, mentions[1], mentions);

  assert.equal(napa.duration.days, 3);
  assert.equal(amox.duration.days, 10);
});

test("a later medicine never inherits the first medicine's frequency", () => {
  // SAFETY: "twice a day" belongs to Napa. Letting Orsaline-N inherit it
  // would schedule the saline on the wrong regimen.
  const text = "Take Napa 1 tablet twice a day. Also take Orsaline-N 1 sachet.";
  const mentions = extractMedicationDraft(text).mentions;
  assert.equal(mentions.length, 2);

  const napa = extractMedicineContext(text, mentions[0], mentions);
  const ors = extractMedicineContext(text, mentions[1], mentions);

  assert.equal(napa.frequency.timesPerDay, 2);
  assert.equal(
    ors.frequency.timesPerDay,
    undefined,
    "the second medicine must not inherit the first medicine's regimen",
  );
  assert.equal(ors.duration.days, undefined);
});

test("the first medicine may fall back to the message as a whole", () => {
  const text = "Take twice a day: Napa 1 tablet.";
  const mentions = extractMedicationDraft(text).mentions;
  assert.equal(mentions.length, 1);

  const context = extractMedicineContext(text, mentions[0], mentions);
  assert.equal(context.frequency.timesPerDay, 2);
});
