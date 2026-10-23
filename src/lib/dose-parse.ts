/* ═══════════════════════════════════════════════════════════════════
   MediLink — medication & frequency extraction from free text.

   Pure, dependency-free, deterministic. Given the raw text of a Dr
   MediLink reply (or a patient's own message) it answers three
   questions:

     1. Which medicines were named?          → extractMedicationMentions()
     2. How often should they be taken?      → parseFrequency()
     3. For how long?                        → parseDuration()

   SAFETY INVARIANT S-1 (PRD §0.3)
   ----------------------------------
   This module may only *locate* a schedule that the user already has.
   It never invents one. A medicine named with no timing signal yields
   `timesPerDay: undefined` and the UI forces the patient to choose
   times manually. We never default "twice daily" for an unnamed
   frequency — that would be the model prescribing.
   ═══════════════════════════════════════════════════════════════════ */

import type { DoseAnchor } from "@/types";

/* ────────────────────────────────────────────────────────────────────
   Lexicon
   ──────────────────────────────────────────────────────────────────── */

export interface LexiconEntry {
  /** Canonical generic name. */
  generic: string;
  /** Brand names commonly sold in Bangladesh. */
  brands: string[];
  /**
   * Ambiguous tokens are also ordinary English/Bangla words ("ace",
   * "zinc"). They only count when a dose/frequency signal appears
   * nearby, so "I ace this exam" never becomes a medication.
   */
  ambiguous?: boolean;
}

export const MEDICATION_LEXICON: LexiconEntry[] = [
  {
    generic: "Paracetamol",
    brands: ["Napa", "Napa Extra", "Ace", "Paracetamol", "Paracep", "Fevarinil", "Paracetamol 500mg"],
  },
  {
    generic: "Oral Rehydration Saline",
    brands: [
      "Orsaline-N",
      "Orsaline",
      "ORS Saline",
      "ORS",
      "Oral Rehydration Saline",
      "Khabar Saline",
      "Saline",
    ],
  },
  {
    generic: "Omeprazole",
    brands: ["Sergel", "Seclo", "Omeprazole", "Esomeprazole", "Esomeprazol"],
  },
  {
    generic: "Antacid",
    brands: ["Entacyd", "Ambee", "Antacid", "Antacid Suspension", "Digene"],
  },
  {
    generic: "Cetirizine",
    brands: ["Alatrol", "Cetirizine", "Zyrtec"],
  },
  {
    generic: "Loratadine",
    brands: ["Loratin", "Loratadine"],
  },
  {
    generic: "Zinc",
    brands: ["Zinkid", "Zinc", "Zincovit"],
    ambiguous: true,
  },
  {
    generic: "Ibuprofen",
    brands: ["Ibuprofen", "Brufen", "Naproxen", "Naproxen BD", "Naproxen-XR"],
  },
  {
    generic: "Diclofenac",
    brands: ["Diclofenac", "Voltaren", "Difen", "Dicloran"],
  },
  {
    generic: "Aspirin",
    brands: ["Aspirin", "Ecosprin", "Loprin", "Cavalet"],
  },
  {
    generic: "Amoxicillin",
    brands: ["Amoxicillin", "Amoxycillin", "Mox", "Amoxil", "Moxicip"],
  },
  {
    generic: "Azithromycin",
    brands: ["Azithromycin", "Zithromax", "Zindac", "Azin"],
  },
  {
    generic: "Metformin",
    brands: ["Metformin", "Glucomet", "Glucophage", "Comet"],
  },
  {
    generic: "Calamine",
    brands: ["Calamine", "Caladryl", "Calamine Lotion"],
  },
  {
    generic: "Povidone Iodine",
    brands: ["Viodin", "Povidone Iodine", "Povidone-Iodine", "Betadine"],
  },
  {
    generic: "Salbutamol",
    brands: ["Salbutamol", "Ventolin", "Ventolin Inhaler", "Becotide"],
  },
  {
    generic: "Domperidone",
    brands: ["Domistat", "Domperidone", "Motilium"],
  },
  {
    generic: "Chlorpheniramine",
    brands: ["Chlorpheniramine", "Piriton", "Histinil"],
  },
  { generic: "Pantoprazole", brands: ["Pantoprazole", "Pan-40", "Protonix"] },
  { generic: "Esomeprazole", brands: ["Esomeprazole", "Nexpro", "Sompraz"] },
  { generic: "Montelukast", brands: ["Montelukast", "Singulair"] },
  { generic: "Losartan", brands: ["Losartan", "Coversil", "Losa"] },
  { generic: "Amlodipine", brands: ["Amlodipine", "Norvasc", "Amlosafe"] },
  { generic: "Atorvastatin", brands: ["Atorvastatin", "Lipitor", "Tonact"] },
  { generic: "Clotrimazole", brands: ["Clotrimazole", "Canesten"] },
];

/** Allergy families — a match anywhere in the family is an allergy match. */
export const ALLERGY_FAMILIES: Record<string, string[]> = {
  penicillin: [
    "penicillin",
    "amoxicillin",
    "amoxycillin",
    "ampicillin",
    "amoxiclav",
    "cloxacillin",
    "flucloxacillin",
    "piperacillin",
  ],
  "cephalosporin": ["cephalexin", "cefixime", "ceftriaxone", "cefuroxime", "ceftriaxone"],
  sulfa: ["sulfamethoxazole", "co-trimoxazole", "cotrimoxazole", "sulfasalazine"],
  aspirin: ["aspirin", "ecosprin", "loprin", "asa"],
  "nsaid": ["ibuprofen", "brufen", "diclofenac", "naproxen", "ketoprofen", "aspirin"],
  macrolide: ["azithromycin", "erythromycin", "clarithromycin"],
};

/**
 * Medicines that worsen bleeding — blocked when dengue is possible.
 * Lower-case and sorted: "difen" (diclofenac) and "loprin" (aspirin) are
 * extremely common Bangladeshi brands and must warn like their generics.
 */
export const DENGUE_RISK_MEDICINES = [
  "aspirin",
  "brufen",
  "diclofenac",
  "difen",
  "ecosprin",
  "ibuprofen",
  "ketoprofen",
  "loprin",
  "naproxen",
  "voltaren",
];

/**
 * NSAIDs — require an extra check against certain conditions.
 * Lower-case and sorted.
 */
export const NSAID_MEDICINES = [
  "aspirin",
  "brufen",
  "diclofenac",
  "difen",
  "ecosprin",
  "ibuprofen",
  "ketoprofen",
  "loprin",
  "naproxen",
  "voltaren",
];

export const NSAID_RISK_CONDITIONS = [
  "asthma",
  "kidney",
  "renal",
  "ulcer",
  "gastric",
  "stomach ulcer",
  "heart failure",
  "blood thinner",
  "warfarin",
];

/* ────────────────────────────────────────────────────────────────────
   Numeric normalisation
   ──────────────────────────────────────────────────────────────────── */

const BANGLA_DIGITS = "০১২৩৪৫৬৭৮৯";

/** Converts Bangla numerals to ASCII so one set of parsers covers both. */
export function normaliseDigits(input: string): string {
  let out = "";
  for (const ch of input) {
    const idx = BANGLA_DIGITS.indexOf(ch);
    out += idx === -1 ? ch : String(idx);
  }
  return out;
}

/** Lower-cases, normalises digits, and collapses whitespace. */
export function normaliseText(input: string): string {
  return normaliseDigits(input)
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Normalises text for matching while keeping a map back to the
 * original string, so a matched medicine can be shown with its
 * original casing ("Napa", not "napa").
 */
export function normaliseWithMap(input: string): { text: string; map: number[] } {
  let text = "";
  const map: number[] = [];
  let pendingSpace = false;

  for (let i = 0; i < input.length; i += 1) {
    let ch = input[i];

    const digitIndex = BANGLA_DIGITS.indexOf(ch);
    if (digitIndex !== -1) {
      ch = String(digitIndex);
    } else if (ch >= "\u2010" && ch <= "\u2015") {
      ch = "-";
    } else if (ch >= "\u2018" && ch <= "\u201B") {
      ch = "'";
    } else if (ch === "\u201C" || ch === "\u201D") {
      ch = '"';
    }

    if (/\s/.test(ch)) {
      if (pendingSpace) continue;
      ch = " ";
      pendingSpace = true;
    } else {
      pendingSpace = false;
    }

    const lowered = ch.toLowerCase();
    if (lowered.length !== 1) continue; // skip pathological characters

    text += lowered;
    map.push(i);
  }

  return { text, map };
}

/* ────────────────────────────────────────────────────────────────────
   1. Medication detection
   ──────────────────────────────────────────────────────────────────── */

export interface MedicationMention {
  /** The token exactly as it appeared in the source text. */
  rawText: string;
  generic: string;
  brand?: string;
  /** 0..1 — lower when the token is ambiguous or uncorroborated. */
  confidence: number;
  /** True when the token is a common word and needs a nearby dose signal. */
  ambiguous: boolean;
  /** Character offset of the match in the source text. */
  index: number;
}

/** Signals that a medicine token is really being used as a medicine. */
const DOSE_CONTEXT_RE =
  /(tablet|tab\b|ট্যাবলেট|capsule|ক্যাপসুল|sachet|স্যাচেট|syrup|সিরাপ|drops|ড্রপ|injection|ইনজেকশন|mg|ml|dose|দিনে|times|daily|after meal|before bed|khali pete|khabor pori|empty stomach|twice|thrice|once|\b\d\s*\+\s*\d)/;

/**
 * Brand names that are also ordinary English words ("Ace"). They only
 * count as a medicine when a dose/frequency signal corroborates them,
 * so "I will ace this exam" never becomes a prescription.
 *
 * "ors", "saline" and "antacid" belong to the same bucket: they are
 * everyday words a free-text message can contain without naming a
 * medicine — a stand-alone "ors" must not become an Oral Rehydration
 * Saline reminder.
 */
const AMBIGUOUS_BRANDS = new Set(["ace", "antacid", "ors", "saline"]);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Finds every medicine mentioned in the text.
 *
 * Matching is whole-token (so "place" never matches the brand "Ace")
 * and Bangla is matched without word boundaries because Bangla script
 * has no whitespace word segmentation.
 *
 * Aliases of the same medicine are merged: "Napa/Paracetamol 500mg" is
 * one medicine written two ways, not two medicines. A list separated by
 * a comma or "and" is treated as separate products.
 */
export function extractMedicationMentions(text: string): MedicationMention[] {
  if (!text || !text.trim()) return [];

  const source = normaliseWithMap(text);
  const haystack = source.text;
  // Each candidate keeps the END offset in NORMALISED coordinates so the
  // alias merge below can measure the gap in the same space it was found in.
  const candidates: { mention: MedicationMention; end: number }[] = [];
  const claimed: { start: number; end: number }[] = [];

  const overlaps = (start: number, end: number) =>
    claimed.some((c) => start < c.end && end > c.start);

  for (const entry of MEDICATION_LEXICON) {
    for (const brand of entry.brands) {
      const needle = normaliseText(brand);
      if (!needle) continue;

      const isBangla = /[\u0980-\u09FF]/.test(needle);
      const pattern = isBangla
        ? new RegExp(escapeRegExp(needle), "g")
        : new RegExp(`(?<![a-z0-9])${escapeRegExp(needle)}(?![a-z0-9])`, "g");

      let match: RegExpExecArray | null;
      while ((match = pattern.exec(haystack)) !== null) {
        const start = match.index;
        const end = start + match[0].length;
        if (overlaps(start, end)) continue;

        // Ambiguous brands need a dose/frequency signal within 60 chars.
        let confidence = 0.95;
        const window = haystack.slice(Math.max(0, start - 60), Math.min(haystack.length, end + 60));
        const corroborated = DOSE_CONTEXT_RE.test(window);
        const isAmbiguous = Boolean(entry.ambiguous) || AMBIGUOUS_BRANDS.has(needle);

        if (isAmbiguous) {
          if (!corroborated) continue;
          confidence = 0.65;
        } else if (!corroborated) {
          confidence = 0.8;
        }

        claimed.push({ start, end });
        candidates.push({
          mention: {
            rawText: originalSlice(text, source.map, start, end),
            generic: entry.generic,
            brand: originalSlice(text, source.map, start, end),
            confidence,
            ambiguous: isAmbiguous,
            index: start,
          },
          end,
        });
      }
    }
  }

  candidates.sort((a, b) => a.mention.index - b.mention.index);
  return mergeAliases(candidates, haystack, text, source.map);
}

/** Slices the ORIGINAL string using the normalised-text index map. */
function originalSlice(
  original: string,
  map: number[],
  start: number,
  end: number,
): string {
  if (!map.length) return original.slice(start, end);
  const from = map[start] ?? start;
  const to = (map[end - 1] ?? end - 1) + 1;
  return original.slice(from, to).trim();
}

/**
 * Slices the ORIGINAL string between two NORMALISED offsets, without
 * trimming — the gap between two mentions must keep its original spacing.
 */
function originalRange(
  original: string,
  map: number[],
  start: number,
  end: number,
): string {
  if (end <= start) return "";
  if (!map.length) return original.slice(start, end);
  const from = map[start] ?? start;
  const to = (map[end - 1] ?? end - 1) + 1;
  return original.slice(from, to);
}

/** Gaps made only of these characters continue the SAME medicine name. */
/**
 * Phrases that mean "a different product", so two mentions separated by
 * one of these are NOT the same medicine.
 *
 * "Napa/Paracetamol" and "Orsaline-N 1 sachet khabar saline" are each a
 * single medicine written two ways. "Napa and Ace" are two products, and
 * a comma separates two products too.
 */
const SPLIT_GAP_RE = /(,|;|\band\b|\bor\b|\bar\b|ও|।|\.)/;

/**
 * Merges consecutive mentions of the same generic that are separated
 * only by a joining character ("Napa/Paracetamol" → one mention).
 *
 * SAFETY: the gap is measured between two offsets of the NORMALISED
 * text. Using the original (longer, differently-cased) mention text for
 * the end offset used to slice the wrong region, which could merge two
 * genuinely different medicines into one reminder.
 */
function mergeAliases(
  candidates: { mention: MedicationMention; end: number }[],
  haystack: string,
  original: string,
  map: number[],
): MedicationMention[] {
  const merged: MedicationMention[] = [];
  const mergedEnds: number[] = [];

  for (const { mention, end } of candidates) {
    const previous = merged[merged.length - 1];

    if (previous && previous.generic === mention.generic) {
      const previousEnd = mergedEnds[mergedEnds.length - 1];
      const gap = haystack.slice(previousEnd, mention.index);

      if (!SPLIT_GAP_RE.test(gap)) {
        const originalGap = originalRange(original, map, previousEnd, mention.index);
        previous.rawText = `${previous.rawText}${originalGap}${mention.rawText}`.trim();
        previous.confidence = Math.max(previous.confidence, mention.confidence);
        mergedEnds[mergedEnds.length - 1] = end;
        continue;
      }
    }

    merged.push({ ...mention });
    mergedEnds.push(end);
  }

  return merged;
}

/* ────────────────────────────────────────────────────────────────────
   2. Frequency parsing
   ──────────────────────────────────────────────────────────────────── */

export interface FrequencyHint {
  /** Undefined when the text gives no timing signal at all (S-1). */
  timesPerDay?: number;
  anchor: DoseAnchor;
  intervalHours?: number;
  /** Suggested clock times for the anchor. */
  suggestedTimes: string[];
  /** The raw fragment the signal was read from, for display. */
  raw?: string;
}

const MEAL_SLOTS: Record<number, string[]> = {
  1: ["08:00"],
  2: ["08:00", "20:00"],
  3: ["08:00", "14:00", "20:00"],
  4: ["08:00", "12:00", "16:00", "20:00"],
};

const AFTER_MEAL_OFFSET_MIN = 30;

/** Anchor is derived from the strongest meal/bed signal in the text. */
function detectAnchor(text: string): DoseAnchor {
  if (/(before bed|before sleeping|rat(e)? (ghume|ghumate)[\s\S]{0,12}(age|por)|রাতে\s*ঘুমা)/.test(text)) {
    return "before_bed";
  }
  if (/(empty stomach|khali pete|khali pet(e)?|before (meal|food)|khabe age|khale age)/.test(text)) {
    return "before_meal";
  }
  if (
    // SAFETY: "khaite" on its own is just the Banglish verb "to eat" and
    // appears in almost every sentence. It only means "after a meal" when a
    // meal noun follows it ("khaite khobor", "khaite rashoi").
    /(after (meal|food|eating)|khabor por(e|i)?|khabe tar por|khaite\s+(?:khobor|khabe|rashoi|mach|khabar)\b|after lunch|after dinner|after breakfast)/.test(
      text,
    )
  ) {
    return "after_meal";
  }
  return "morning";
}

/**
 * Converts a "HH:MM" clock time into minutes since midnight.
 *
 * SAFETY: out-of-range values are clamped ("25:00" → 23:59) and anything
 * unparseable becomes 0, so a bad clock time can never be read as a dose
 * that is many hours in the future.
 */
export function clockToMinutes(hhmm: string): number {
  const match = /^(\d{1,2}):(\d{1,2})$/.exec(String(hhmm ?? "").trim());
  if (!match) return 0;

  const hours = Math.min(23, Math.max(0, Number(match[1])));
  const minutes = Math.min(59, Math.max(0, Number(match[2])));
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return 0;

  return hours * 60 + minutes;
}

/** Shifts a clock time by a number of minutes, wrapping past midnight. */
function shiftClock(hhmm: string, minutes: number): string {
  const total = (clockToMinutes(hhmm) + minutes + 24 * 60) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/**
 * Parses "how often" from free text.
 *
 * Recognises doctor shorthand (1+0+1, 0+1+0+1), English (twice daily,
 * every 6 hours) and Bangla/Banglish ("দুইবার দিনে", "৬ ঘণ্টা পরপর").
 */
export function parseFrequency(text: string): FrequencyHint {
  const source = normaliseText(text);
  const anchor = detectAnchor(source);

  // ── "every N hours" ──
  const intervalMatch = source.match(
    /(?:every|each|prati|প্রতি)\s*(\d{1,2})\s*(?:hour|hours|ghonta|ghanter|ঘণ্টা)/,
  );
  if (intervalMatch) {
    const hours = Number(intervalMatch[1]);
    if (hours >= 1 && hours <= 24) {
      return {
        timesPerDay: Math.min(8, Math.round(24 / hours)),
        anchor: "interval",
        intervalHours: hours,
        suggestedTimes: MEAL_SLOTS[3],
        raw: intervalMatch[0],
      };
    }
  }

  // ── doctor shorthand: 1+0+1 ──
  const shorthand = source.match(/(?<![0-9])([0-9])\s*\+\s*([0-9])\s*\+\s*([0-9])(?:\s*\+\s*([0-9]))?(?![0-9])/);
  if (shorthand) {
    const slots = [shorthand[1], shorthand[2], shorthand[3], shorthand[4]].filter(
      (v): v is string => typeof v === "string",
    );
    const count = slots.reduce((sum, slot) => sum + Number(slot), 0);
    if (count > 0) {
      const slotNames: DoseAnchor[] = ["morning", "afternoon", "evening", "night"];
      const active = slots
        .map((slot, idx) => (Number(slot) > 0 ? slotNames[idx] : null))
        .filter((v): v is DoseAnchor => v !== null);
      const resolvedAnchor = anchor === "morning" && active.length > 1 ? active[0] : anchor;
      const times = MEAL_SLOTS[Math.min(4, Math.max(1, count))];
      return {
        timesPerDay: count,
        anchor: resolvedAnchor,
        suggestedTimes: times,
        raw: shorthand[0],
      };
    }
  }

  // ── "twice/thrice/once a day" ──
  const wordCount =
    source.match(/\b(twice|2 times|three times|3 times|thrice|once|1 time|four times|4 times)\b/) ||
    source.match(/(দুইবার|তিনবার|একবার|চারবার)/);
  if (wordCount) {
    const raw = wordCount[0];
    let count: number | undefined;
    if (/(twice|2 times|দুইবার)/.test(raw)) count = 2;
    else if (/(thrice|three times|3 times|তিনবার)/.test(raw)) count = 3;
    else if (/(four times|4 times|চারবার)/.test(raw)) count = 4;
    else if (/(once|1 time|একবার)/.test(raw)) count = 1;
    if (count) {
      return {
        timesPerDay: count,
        anchor,
        suggestedTimes: MEAL_SLOTS[Math.min(4, count)],
        raw,
      };
    }
  }

  // ── "N times a day" ──
  const perDay = source.match(/(\d{1,2})\s*(?:times|bar)\s*(?:a\s*day|in a day|per day|dinete|de)/);
  if (perDay) {
    const count = Number(perDay[1]);
    if (count >= 1 && count <= 8) {
      return {
        timesPerDay: count,
        anchor,
        suggestedTimes: MEAL_SLOTS[Math.min(4, count)],
        raw: perDay[0],
      };
    }
  }

  // ── "daily" / "each day" ──
  if (/(daily|each day|every day|protidin|প্রতিদিন)/.test(source)) {
    return { timesPerDay: 1, anchor, suggestedTimes: MEAL_SLOTS[1], raw: "daily" };
  }

  // No timing signal at all. Deliberately return no timesPerDay (S-1).
  return { anchor, suggestedTimes: [] };
}

/**
 * Converts a frequency hint into concrete clock times, honouring the
 * meal anchors by shifting the base slot time.
 *
 * Returns an empty array when the source text carried no timing signal
 * at all — the schedule must never invent one (S-1).
 */
export function resolveClockTimes(hint: FrequencyHint): string[] {
  if (hint.anchor === "interval") {
    const hours = hint.intervalHours ?? 6;
    const start = 8;
    const times: string[] = [];
    for (let i = 0; i < Math.min(8, Math.round(24 / hours)); i += 1) {
      const h = (start + i * hours) % 24;
      times.push(`${String(h).padStart(2, "0")}:00`);
    }
    return times;
  }

  const count = hint.timesPerDay ?? hint.suggestedTimes.length;
  if (!count) return [];

  const base = hint.suggestedTimes.length
    ? hint.suggestedTimes
    : MEAL_SLOTS[Math.min(4, Math.max(1, count))];

  if (hint.anchor === "after_meal") {
    return base.map((t) => shiftClock(t, AFTER_MEAL_OFFSET_MIN));
  }
  if (hint.anchor === "before_meal") {
    return base.map((t) => shiftClock(t, -AFTER_MEAL_OFFSET_MIN));
  }
  if (hint.anchor === "before_bed") {
    return beforeBedSlots(count, base);
  }
  return base;
}

/**
 * Builds the clock times for a day whose last dose is "before bed".
 *
 * SAFETY: a bedtime anchor must never collapse a multi-dose day into a
 * single reminder. "1+0+1, one at bedtime" is still TWO doses, so the
 * earlier doses keep their meal slot and only the final one moves to
 * 22:00. The number of slots always equals `timesPerDay`.
 */
function beforeBedSlots(count: number, base: string[]): string[] {
  const bedtime = "22:00";
  if (count <= 1) return [bedtime];

  const source = base.length >= count ? base.slice(0, count) : spreadSlots(count);
  const slots: string[] = [];

  for (const slot of source) {
    if (slots.length >= count - 1) break;
    if (slot === bedtime) continue; // never two reminders at the same minute
    slots.push(slot);
  }

  // Top-up for very high doses-per-day (rare) with distinct early hours.
  for (let h = 6; slots.length < count - 1; h = (h + 1) % 24) {
    const time = `${String(h).padStart(2, "0")}:00`;
    if (time !== bedtime && !slots.includes(time)) slots.push(time);
  }

  slots.push(bedtime);
  return slots;
}

/** Clock times spread over the day — the meal slots for 1–4 doses. */
function spreadSlots(count: number, startHour = 8): string[] {
  if (count <= 0) return [];
  if (count <= 4) return [...MEAL_SLOTS[count]];

  const step = 24 / count;
  const times: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const h = Math.round((startHour + i * step) % 24);
    times.push(`${String(h).padStart(2, "0")}:00`);
  }
  return times;
}

/* ────────────────────────────────────────────────────────────────────
   3. Duration parsing
   ──────────────────────────────────────────────────────────────────── */

export interface DurationHint {
  days?: number;
  raw?: string;
}

/**
 * Bangla number words (written in Latin letters) that patients use
 * instead of a numeral: "tini din", "ek soptahe", "chahti mas".
 */
const BANGLA_NUMBER_WORDS: Record<string, number> = {
  ek: 1,
  dui: 2,
  tin: 3,
  tini: 3,
  char: 4,
  chahti: 4,
  pach: 5,
  choy: 6,
  sat: 7,
  aat: 8,
  aath: 8,
  noy: 9,
  das: 10,
};

/** The number words as one alternation, longest first ("tini" before "tin"). */
const BANGLA_NUMBER_WORD_RE = Object.keys(BANGLA_NUMBER_WORDS)
  .sort((a, b) => b.length - a.length)
  .join("|");

/**
 * Parses "for how long". Supports English, Bangla numerals and the
 * Bangla words for day/week/month.
 */
export function parseDuration(text: string): DurationHint {
  const source = normaliseText(text);

  const weeks = source.match(/(\d{1,2})\s*(?:week|weeks|soptah|hafta|সপ্তাহ)/);
  if (weeks) {
    const n = Number(weeks[1]);
    if (n >= 1 && n <= 12) return { days: n * 7, raw: weeks[0] };
  }

  const months = source.match(/(\d{1,2})\s*(?:month|months|mash|মাস)/);
  if (months) {
    const n = Number(months[1]);
    if (n >= 1 && n <= 12) return { days: n * 30, raw: months[0] };
  }

  const days = source.match(/(\d{1,3})\s*(?:days|day|din|দিন)/);
  if (days) {
    const n = Number(days[1]);
    if (n >= 1 && n <= 365) return { days: n, raw: days[0] };
  }

  // Bangla words without a numeral: "tini din", "ek soptahe", "chahti mas".
  const banglaWord = source.match(
    new RegExp(
      `\\b(${BANGLA_NUMBER_WORD_RE})(?:ta|ti|te|o|i|a)?\\s*` +
        "(soptahe|sopta|hafta|hafte|weeks?|months?|mas|days?|din)\\b",
    ),
  );
  if (banglaWord) {
    const n = BANGLA_NUMBER_WORDS[banglaWord[1]];
    const unit = banglaWord[2];
    if (n) {
      if (/^(soptahe|sopta|hafta|hafte|weeks?)$/.test(unit)) {
        if (n >= 1 && n <= 12) return { days: n * 7, raw: banglaWord[0] };
      } else if (/^(months?|mas)$/.test(unit)) {
        if (n >= 1 && n <= 12) return { days: n * 30, raw: banglaWord[0] };
      } else if (n >= 1 && n <= 365) {
        return { days: n, raw: banglaWord[0] };
      }
    }
  }

  const singleDay = source.match(/\b(?:ek din|one day|1 day)\b/);
  if (singleDay) return { days: 1, raw: singleDay[0] };

  return {};
}

/* ────────────────────────────────────────────────────────────────────
   4. Dose text
   ──────────────────────────────────────────────────────────────────── */

const DOSE_PATTERNS: RegExp[] = [
  // The plural forms are listed first so the raw fragment keeps the exact
  // wording the doctor wrote ("2 tablets", not "2 tablet").
  /(?<![0-9])(\d{1,2}(?:\.\d)?)\s*(?:tablets|tablet|tab\b|ট্যাবলেট|ট্যাবলেটস)/,
  /(?<![0-9])(\d{1,2}(?:\.\d)?)\s*(?:capsules|capsule|cap\b|ক্যাপসুল)/,
  /(?<![0-9])(\d{1,2}(?:\.\d)?)\s*(?:sachets|sachet|স্যাচেট)/,
  /(?<![0-9])(\d{1,2}(?:\.\d)?)\s*ml\b/,
  // NOTE: "glass"/"গ্লাস" is a preparation instruction ("in half a glass of
  // water"), never a dose. Keeping it out of the dose patterns means
  // "ORS 1 sachet in half glass of water" yields the real dose, "1 sachet".
  /(half|adho|আধা)\s*(?:tablet|tab\b|ট্যাবলেট|sachet|স্যাচেট)/,
];

/**
 * Extracts the dose expression ("1 tablet", "1 sachet").
 *
 * SAFETY: when a message names several medicines, the dose belongs to
 * the medicine it is written next to, so the EARLIEST dose in the text
 * wins. Choosing by pattern order instead ("Azin 1 capsule, Napa 2
 * tablets" → the tablet pattern) applies the wrong dose to every
 * medicine in the message.
 *
 * The fragment is returned exactly as it was written — same casing, same
 * words — because it is shown to the patient and read out by a doctor.
 */
export function parseDose(text: string): string | undefined {
  const source = normaliseWithMap(text);
  const haystack = source.text;

  let bestIndex = Number.POSITIVE_INFINITY;
  let bestLength = 0;

  for (const pattern of DOSE_PATTERNS) {
    const match = haystack.match(pattern);
    if (!match || match.index === undefined) continue;

    // Earliest match wins; a tie keeps the earlier pattern in the list.
    if (match.index < bestIndex) {
      bestIndex = match.index;
      bestLength = match[0].length;
    }
  }

  if (!bestLength) return undefined;

  // Slice the ORIGINAL text so the dose keeps its original casing.
  return originalSlice(text, source.map, bestIndex, bestIndex + bestLength);
}

/** Extracts a preparation note ("in half a glass of water"). */
export function parsePreparationNote(text: string): string | undefined {
  const source = normaliseText(text);
  const match = source.match(
    /(?:in|with) (?:a |half |adho )?(?:glass|cup|paani|water|গ্লাস)(?: of (?:water|paani))?/,
  );
  if (match) return match[0].trim();
  return undefined;
}

/* ────────────────────────────────────────────────────────────────────
   5. Convenience — everything at once
   ──────────────────────────────────────────────────────────────────── */

export interface MedicationDraft {
  mentions: MedicationMention[];
  frequency: FrequencyHint;
  duration: DurationHint;
  dose?: string;
  preparationNote?: string;
}

/**
 * One-shot extraction over a text blob. Used by the chat message
 * post-processor and by the attachment scanner.
 */
export function extractMedicationDraft(text: string): MedicationDraft {
  return {
    mentions: extractMedicationMentions(text),
    frequency: parseFrequency(text),
    duration: parseDuration(text),
    dose: parseDose(text),
    preparationNote: parsePreparationNote(text),
  };
}

/* ────────────────────────────────────────────────────────────────────
   6. Per-medicine context
   ──────────────────────────────────────────────────────────────────── */

/**
 * The part of the message that belongs to one medicine — the text between
 * this mention and the next one.
 */
export function medicineWindow(
  text: string,
  mention: MedicationMention,
  mentions: MedicationMention[],
): string {
  const start = Math.max(0, Math.min(mention.index, text.length));
  const next = mentions.find((other) => other.index > start);
  const end = next ? Math.min(next.index, text.length) : text.length;
  return text.slice(start, Math.max(start, end));
}

/**
 * The text in front of the FIRST medicine ("For 5 days, take Napa and
 * Azin"). Only the first medicine may look backwards — for the others
 * the text in front of them belongs to the medicine before.
 */
export function medicinePrefix(
  text: string,
  mention: MedicationMention,
  mentions: MedicationMention[],
): string {
  const isFirst = !mentions.some((other) => other.index < mention.index);
  if (!isFirst) return "";
  return text.slice(0, Math.max(0, Math.min(mention.index, text.length)));
}

export interface MedicineContext {
  /** The medicine's own part of the message. */
  window: string;
  /** The text in front of the first medicine. */
  prefix: string;
  /** Frequency read from the medicine's OWN text. */
  frequency: FrequencyHint;
  /** Dose read from the medicine's own text. */
  dose?: string;
  /** Duration read from the medicine's own text. */
  duration: DurationHint;
}

/**
 * Extracts the context that belongs to ONE medicine.
 *
 * SAFETY: a message can carry several different regimens — "Napa … twice
 * a day. Orsaline-N … 4 times daily". Reading the frequency from the
 * message as a whole gave every medicine the same regimen, so a
 * 4-times-a-day saline became a 2-times-a-day reminder and the patient
 * would have been UNDER-DOSED. Everything here is therefore read from
 * the medicine's own slice of the text first.
 */
export function extractMedicineContext(
  text: string,
  mention: MedicationMention,
  mentions: MedicationMention[],
): MedicineContext {
  const window = medicineWindow(text, mention, mentions);
  const prefix = medicinePrefix(text, mention, mentions);

  const ownFrequency = parseFrequency(window);
  const ownDose = parseDose(window);
  const ownDuration = parseDuration(window);

  const prefixFrequency = prefix ? parseFrequency(prefix) : undefined;
  const prefixDose = prefix ? parseDose(prefix) : undefined;
  const prefixDuration = prefix ? parseDuration(prefix) : undefined;

  const whole = extractMedicationDraft(text);

  // Only the FIRST medicine may fall back to the message as a whole. For
  // any later medicine the message-level frequency belongs to the
  // medicine before it — "Napa … twice a day. Orsaline-N … 1 sachet."
  // would otherwise put Orsaline-N on Napa's regimen.
  const isFirst =
    mentions.length === 1 || !mentions.some((other) => other.index < mention.index);

  const frequency: FrequencyHint =
    ownFrequency.timesPerDay && ownFrequency.timesPerDay > 0
      ? ownFrequency
      : prefixFrequency?.timesPerDay
        ? prefixFrequency
        : isFirst
          ? whole.frequency
          : { anchor: "morning", suggestedTimes: [] };

  const dose =
    ownDose ??
    prefixDose ??
    (isFirst ? whole.dose : undefined);

  const duration: DurationHint =
    ownDuration.days !== undefined
      ? ownDuration
      : prefixDuration?.days !== undefined
        ? prefixDuration
        : isFirst
          ? whole.duration
          : {};

  return { window, prefix, frequency, dose, duration };
}

/* ────────────────────────────────────────────────────────────────────
   7. Allergy family matching (shared with the warning engine)
   ──────────────────────────────────────────────────────────────────── */

/**
 * Spellings a patient may type for a known allergy family.
 *
 * The allergy is free text: the register page offers "Penicillin" and
 * "Sulfa Drugs" chips and also accepts anything the patient types
 * ("Penicillin allergy", "PCN", "Amoxycillin", "Penicilin"). Keys are
 * looked up after lower-casing and stripping punctuation/whitespace, so
 * both "Sulfa Drugs" and "sulfa-drugs" resolve to the same family.
 */
const ALLERGY_SYNONYMS: Record<string, string> = {
  pcn: "penicillin",
  penicillin: "penicillin",
  penicillins: "penicillin",
  penicillinallergy: "penicillin",
  amoxicillin: "penicillin",
  amoxycillin: "penicillin",
  ampicillin: "penicillin",
  penicilin: "penicillin",
  sulfa: "sulfa",
  sulfas: "sulfa",
  sulfadrug: "sulfa",
  sulfadrugs: "sulfa",
  sulfonamide: "sulfa",
  sulfonamides: "sulfa",
  asa: "aspirin",
  aspirin: "aspirin",
  aspirins: "aspirin",
  aspirinallergy: "aspirin",
  ecosprin: "aspirin",
  loprin: "aspirin",
  nsaid: "nsaid",
  nsaids: "nsaid",
  ibuprofen: "nsaid",
  diclofenac: "nsaid",
  naproxen: "nsaid",
  ketoprofen: "nsaid",
  cephalosporin: "cephalosporin",
  cephalosporins: "cephalosporin",
  macrolide: "macrolide",
  macrolides: "macrolide",
  azithromycin: "macrolide",
};

/** Words that describe the reaction, not the allergen. */
const ALLERGY_NOISE_RE = /(allergy|allergic|allergies|reaction|hypersensitivity|intolerance)/g;

/** Minimum length before the reverse ("member inside allergy") test runs. */
const REVERSE_TOKEN_MIN_LENGTH = 4;

/**
 * Substring test in BOTH directions, used for allergy/medicine names.
 * The reverse direction needs a long enough needle so that a short
 * fragment ("asa", "a") cannot match half the families.
 */
function containsToken(haystack: string, needle: string): boolean {
  if (!haystack || !needle) return false;
  if (haystack.includes(needle)) return true;
  if (needle.length < REVERSE_TOKEN_MIN_LENGTH) return false;
  if (haystack.length < REVERSE_TOKEN_MIN_LENGTH) return false;
  return needle.includes(haystack);
}

/**
 * Normalises a free-text allergy into a lookup key: lower-case, no
 * punctuation or whitespace, and known spellings mapped onto the
 * canonical family key ("PCN" → "penicillin", "Sulfa Drugs" → "sulfa").
 */
function normaliseAllergyKey(allergy: string): string {
  const stripped = allergy.toLowerCase().replace(ALLERGY_NOISE_RE, " ");
  const compact = stripped.replace(/[^a-z0-9\u0980-\u09FF]/g, "");
  const spaced = stripped.replace(/[^a-z0-9\u0980-\u09FF]+/g, " ").trim();

  for (const candidate of [spaced, compact]) {
    const synonym = ALLERGY_SYNONYMS[candidate];
    if (synonym) return synonym;
  }
  return compact;
}

/** Every family the given (normalised) allergy belongs to. */
function allergyFamilies(key: string): string[] {
  const families: string[] = [];

  for (const [family, members] of Object.entries(ALLERGY_FAMILIES)) {
    if (key === family) {
      families.push(family);
      continue;
    }
    if (members.some((member) => containsToken(key, member))) {
      families.push(family);
    }
  }

  return families;
}

/**
 * True when `medicineName` belongs to the same family as `allergy`.
 *
 * SAFETY: a miss here hands a patient with a recorded penicillin allergy
 * an amoxicillin — an anaphylaxis-class risk. The patient's allergy is
 * therefore normalised (lower-case, no punctuation, synonyms mapped) and
 * resolved to every family it belongs to; the medicine is then tested
 * against EVERY member of those families in both directions.
 */
export function matchesAllergyFamily(medicineName: string, allergy: string): boolean {
  const med = normaliseText(medicineName);
  const alg = normaliseText(allergy);
  if (!med || !alg) return false;

  const key = normaliseAllergyKey(alg);
  if (!key) return false;

  const families = allergyFamilies(key);

  const familyHit = families.some((family) =>
    ALLERGY_FAMILIES[family].some((member) => containsToken(med, member)),
  );
  if (familyHit) return true;

  // SAFETY: a penicillin allergy also blocks the cephalosporins — the two
  // classes share side chains, so a penicillin-allergic patient can have
  // an anaphylactic reaction to a cephalosporin.
  if (families.includes("penicillin")) {
    if (ALLERGY_FAMILIES.cephalosporin.some((member) => containsToken(med, member))) {
      return true;
    }
  }

  // Fall back to a plain comparison against the normalised allergy.
  return containsToken(med, key);
}

/**
 * Fever context for the warning engine.
 *
 * SAFETY: a bare number is NOT a fever — "101" can be a phone number, a
 * price or a house number. The numeric forms need a temperature marker
 * ("102°F") or a fever word next to them ("fever 102").
 */
export const FEVER_RE =
  /(fever|জ্বর|\bjore?\b|beshirbhag jor|\b(?:fever|jor|jore)\D{0,8}\b10[123]\b|\b10[123]\s*(?:f\b|degrees|deg\b|°))/;
