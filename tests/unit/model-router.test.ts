import { test } from "node:test";
import assert from "node:assert/strict";
import {
  detectLanguage,
  detectTaskType,
  EMERGENCY_PATTERNS,
} from "../../src/lib/model-router.ts";

/**
 * The router is the first thing every message passes through, and a wrong
 * answer here is a safety problem: a red flag that is not detected is a
 * patient who is never told to call 999, and a language mis-detection means
 * the patient reads an answer in a language they did not ask for.
 */

test("common Banglish is detected as Banglish", () => {
  assert.equal(detectLanguage("ami nijeke dekhte pari"), "banglish");
  assert.equal(detectLanguage("ami ajke hospital e giyechi"), "banglish");
  assert.equal(detectLanguage("jor hole ki khabo"), "banglish");
  assert.equal(detectLanguage("matha betha hocche"), "banglish");
  assert.equal(detectLanguage("amar matha betha hocche"), "banglish");
});

test("English is not misdetected as Banglish", () => {
  assert.equal(detectLanguage("Mon I have a sore throat"), "en");
  assert.equal(detectLanguage("My chest hurts a lot"), "en");
  assert.equal(detectLanguage("I need money for the medicine"), "en");
  assert.equal(detectLanguage("What is the dosage for paracetamol?"), "en");
  assert.equal(detectLanguage("I have been feeling tired for a week"), "en");
});

test("Bangla script is Bangla; Assamese-only characters are not", () => {
  assert.equal(detectLanguage("বুকে জ্বালাপোড়া হচ্ছে"), "bn");
  // ৰ (U+09F0) and ৱ (U+09F1) are Assamese-only. Treating them as Bangla
  // made every Assamese message come back as "all models are busy".
  assert.equal(detectLanguage("সৰ বুলি কৰা"), "en");
});

test("emergency red flags are detected in the ways patients phrase them", () => {
  assert.equal(detectTaskType("my chest hurts badly"), "emergency");
  assert.equal(detectTaskType("I'm bleeding a lot"), "emergency");
  assert.equal(detectTaskType("I passed out at work"), "emergency");
  assert.equal(detectTaskType("having convulsions now"), "emergency");
  assert.equal(detectTaskType("can't breathe properly"), "emergency");
  assert.equal(detectTaskType("shash nite kosto hocche"), "emergency");
  assert.equal(detectTaskType("শ্বাস নিতে কষ্ট হচ্ছে"), "emergency");
  assert.equal(detectTaskType("I feel suicidal"), "emergency");
  assert.equal(detectTaskType("someone fainted and is not waking up"), "emergency");
});

test("ordinary complaints are not escalated", () => {
  assert.notEqual(detectTaskType("mild fever for two days"), "emergency");
  assert.notEqual(detectTaskType("what is the dosage for paracetamol"), "emergency");
  assert.notEqual(detectTaskType("my knee hurts after running"), "emergency");
});

test("every emergency pattern is a valid regular expression", () => {
  assert.ok(EMERGENCY_PATTERNS.length > 0);
  for (const pattern of EMERGENCY_PATTERNS) {
    assert.ok(pattern instanceof RegExp);
    assert.doesNotThrow(() => new RegExp(pattern.source, pattern.flags));
  }
});
