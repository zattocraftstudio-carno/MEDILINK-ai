/* ═══════════════════════════════════════════════════════════════════
   MediLink — dose schedule construction & safety warnings.

   Pure functions, no I/O, no framework imports. Everything the UI
   needs to build a reminder and everything the safety rules need to
   decide whether that reminder may exist lives here, so it can be unit
   tested without a browser.

   SAFETY INVARIANTS (PRD §0.3)
   ----------------------------
   S-1  Schedules are built only from values the patient confirmed.
        `buildSchedule()` never invents a dose, a time or a duration.
   S-5  Allergy and dengue conflicts are hard blocks: they cannot be
        acknowledged away, so the schedule is refused outright.
        A block is raised only for a REAL conflict: a dengue mention
        that is negated, ruled out or hypothetical ("dengue is unlikely",
        "avoid ibuprofen in case of dengue") is advisory, because a
        block the patient cannot acknowledge leaves them permanently
        unable to remind a legitimately prescribed NSAID.
   S-7  A corrupt value (a broken "HH:mm" left in localStorage) must
        never crash the app: parsers return a safe default and a bad
        occurrence is skipped instead of thrown.
   ═══════════════════════════════════════════════════════════════════ */

import type {
  DoseAnchor,
  DoseOccurrence,
  DoseWarning,
  MedicationSchedule,
  Severity,
} from "@/types";
import {
  DENGUE_RISK_MEDICINES,
  NSAID_MEDICINES,
  NSAID_RISK_CONDITIONS,
  matchesAllergyFamily,
  normaliseText,
  parseFrequency,
  resolveClockTimes,
} from "./dose-parse";
import { FEVER_RE as SHARED_FEVER_RE } from "./dose-parse";

/* ────────────────────────────────────────────────────────────────────
   Input shapes
   ──────────────────────────────────────────────────────────────────── */

export interface ScheduleSubject {
  name: string;
  generic?: string;
  brand?: string;
  /** True when the medicine is prescription-only in medicines.json. */
  requiresRx?: boolean;
}

export interface SafetyContext {
  /** Profile allergies, e.g. ["Penicillin"]. */
  allergies?: string[];
  /** Profile conditions, e.g. ["Asthma", "Kidney disease"]. */
  conditions?: string[];
  /** Free text of the conversation (used for dengue / fever detection). */
  conversationText?: string;
  /** Explicit dengue suspicion supplied by the caller. */
  dengueSuspected?: boolean;
  /** Other medicines in the same schedule (duplicate-therapy check). */
  siblings?: ScheduleSubject[];
}

/* ────────────────────────────────────────────────────────────────────
   1. Risk detection
   ──────────────────────────────────────────────────────────────────── */

const DENGUE_EXPLICIT_RE = /(dengue|ডেঙ্গু|dengee|ডেঙ্গু জ্বর|breakbone fever)/;
const DENGUE_SIGN_RE =
  /(bleeding gum|black stool|melena|continuous vomiting|cold clammy|severe abdominal pain|তীব্র পেটব্যথা|কালো পায়খানা|বমি বমি)/;
// SAFETY: a bare number is NOT a fever — "101" can be a phone number, a price
// or a house number. The shared pattern requires a temperature marker
// ("102°F") or a fever word next to the number ("fever 102").
const FEVER_RE = SHARED_FEVER_RE;

/**
 * Wordings that turn a dengue mention into "this is NOT dengue".
 *
 * SAFETY: the AI's own caution text ("dengue is unlikely", "avoid
 * ibuprofen in case of dengue") used to hard-block the schedule. A block
 * cannot be acknowledged away, so the patient could never set a reminder
 * for a valid prescription and the UI showed "resolve the safety warning"
 * for a warning that had no way to be resolved.
 */
const DENGUE_NEGATION_RES: RegExp[] = [
  // "no dengue", "not dengue", "without dengue", "ruled out dengue"
  /\b(?:no|not|never|without|excluding|excluded|exclude|ruled\s*out|rule\s*out|eliminated|absent|negative|denied|deny|unlikely|improbable|doubtful|nahi|nai|na)\b[^.!?]{0,24}dengue/i,
  // "dengue is unlikely", "dengue was ruled out", "dengue na"
  /\bdengue\b[^.!?]{0,16}\b(?:is|are|was|were|be|been)?\s*(?:not|never|unlikely|improbable|unconfirmed|ruled\s*out|excluded|absent|negative|nahi|nai|na)\b/i,
  // "dengue is not confirmed", "dengue is out of the question"
  /\bdengue\b[^.!?]{0,16}\b(?:is|are|was|were)\s+(?:not|unlikely|improbable|unconfirmed|ruled\s*out|excluded|absent|negative|out\s+of\s+the\s+question)\b/i,
  // Bangla: "ডেঙ্গু নয়", "ডেঙ্গু হবে না", "ডেঙ্গুর সম্ভাবনা কম"
  /ডেঙ্গু[^।]{0,20}(নয়|নেই|হবে না|হওয়ার সম্ভাবনা কম|সম্ভাবনা কম|নিশ্চিত নয়|বাদে)/,
  /(নয়|নেই|বাদে|সম্ভাবনা কম|হবে না)[^।]{0,12}ডেঙ্গু/,
];

/**
 * Conditional / hypothetical framing ("in case of dengue", "if dengue").
 * The medicine is not being prescribed FOR dengue — the AI is explaining
 * a risk — so the mention must not hard-block the schedule.
 */
const DENGUE_HYPOTHETICAL_RES: RegExp[] = [
  /\b(?:in\s+case\s+of|in\s+case|if|should|unless|what\s+if|suppose|even\s+if|as\s+if|worried\s+about|scenario\s+of|in\s+the\s+event\s+of)\b[^.!?]{0,24}dengue/i,
  /(যদি|জয়)[^।]{0,20}ডেঙ্গু/,
];

/** Negation that sits right before a symptom phrase ("no black stool"). */
const NEGATION_BEFORE_RE =
  /\b(?:no|not|never|without|denied|deny|absent|ruled\s*out|rule\s*out|nahi|nai)\b/;
/** The Bangla equivalents, which have no word boundary to anchor on. */
const NEGATION_BANGLA_RE = /(নেই|নয়|বাদে|হবে না)\s*$/;

export interface RiskSignals {
  fever: boolean;
  dengueSuspected: boolean;
  mentionsNsaid: boolean;
  /**
   * True when dengue appears in the conversation at all — even when it is
   * negated or hypothetical. Lets the warning engine say "dengue was only
   * mentioned as a possibility" instead of staying silent.
   */
  dengueMentioned?: boolean;
}

/**
 * How the conversation talks about dengue.
 *
 * "confirmed"  — the patient's own condition is asserted ("you have
 *                dengue", "dengue is confirmed", "আপনার ডেঙ্গু") or the
 *                word simply stands on its own. Hard block.
 * "mentioned"  — dengue is negated, ruled out or hypothetical. Advisory
 *                and acknowledgeable.
 * "none"       — dengue is not mentioned at all.
 */
type DengueMention = "confirmed" | "mentioned" | "none";

function classifyDengue(text: string): DengueMention {
  const re = new RegExp(DENGUE_EXPLICIT_RE.source, "gi");
  let match: RegExpExecArray | null;
  let mentioned = false;

  while ((match = re.exec(text)) !== null) {
    mentioned = true;
    const window = text.slice(
      Math.max(0, match.index - 64),
      match.index + match[0].length + 64,
    );
    const negated = DENGUE_NEGATION_RES.some((pattern) => pattern.test(window));
    const hypothetical = DENGUE_HYPOTHETICAL_RES.some((pattern) => pattern.test(window));
    if (negated || hypothetical) continue;
    return "confirmed";
  }

  return mentioned ? "mentioned" : "none";
}

/**
 * True when a symptom pattern appears WITHOUT a negation in front of it.
 * "no black stool" is not a bleeding sign.
 */
function matchesUnnegated(pattern: RegExp, text: string): boolean {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  const re = new RegExp(pattern.source, flags);
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    const before = text.slice(Math.max(0, match.index - 24), match.index);
    const after = text.slice(
      match.index + match[0].length,
      match.index + match[0].length + 16,
    );
    // The English negation sits in front of the phrase ("no black stool").
    // The Bangla one sits behind it ("কালো পায়খানা নেই"), so the tail of
    // the match is checked as well — but only for Bangla, so that
    // "bleeding gums, no fever" is not read as a denial.
    if (NEGATION_BEFORE_RE.test(before)) continue;
    if (NEGATION_BANGLA_RE.test(before) || NEGATION_BANGLA_RE.test(after)) continue;
    return true;
  }

  return false;
}

function isNsaid(name: string): boolean {
  const n = normaliseText(name);
  return NSAID_MEDICINES.some((med) => n.includes(med));
}

function isDengueRiskMedicine(name: string): boolean {
  const n = normaliseText(name);
  return DENGUE_RISK_MEDICINES.some((med) => n.includes(med));
}

/**
 * Derives the risk signals that drive the warning engine.
 *
 * A hard dengue block requires ACTUAL dengue suspicion — an affirmed
 * mention or the classic warning-sign cluster (bleeding gums, black
 * stool, continuous vomiting). A fever on its own downgrades the warning
 * to "acknowledge" (still worth saying, but not worth refusing a valid
 * medicine over), and so does a dengue mention that is negated or
 * hypothetical.
 */
export function detectRiskSignals(
  subject: ScheduleSubject,
  context: SafetyContext = {},
): RiskSignals {
  const text = normaliseText(context.conversationText ?? "");
  const fever = FEVER_RE.test(text);
  const dengue = classifyDengue(text);
  const dengueSuspected =
    Boolean(context.dengueSuspected) ||
    dengue === "confirmed" ||
    matchesUnnegated(DENGUE_SIGN_RE, text);

  const names = [subject.name, subject.generic, subject.brand].filter(Boolean) as string[];

  return {
    fever,
    dengueSuspected,
    mentionsNsaid: names.some((n) => isNsaid(n)),
    dengueMentioned: dengue !== "none",
  };
}

/* ────────────────────────────────────────────────────────────────────
   2. Warning engine
   ──────────────────────────────────────────────────────────────────── */

export interface WarningEvaluation {
  warnings: DoseWarning[];
  /** True when at least one warning blocks the schedule outright. */
  blocked: boolean;
}

/**
 * The highest number of doses a day a medicine label is expected to
 * carry. Anything above this is a regimen that needs a second pair of
 * eyes (a doctor or a pharmacist), not a silent auto-confirmation.
 */
export const MAX_DOSES_PER_DAY = 4;

/**
 * True when two medicines are the same molecule.
 *
 * SAFETY: the comparison uses the GENERIC name whenever both sides have
 * one, so "Napa" and "Paracetamol" are recognised as the same drug sold
 * under two names. Comparing the names only would let a patient take
 * both and double their dose; requiring a generic on both sides would
 * make the duplicate-therapy warning unreachable.
 */
function sameMolecule(subject: ScheduleSubject, sibling: ScheduleSubject): boolean {
  const subjectGeneric = subject.generic ? normaliseText(subject.generic) : "";
  const siblingGeneric = sibling.generic ? normaliseText(sibling.generic) : "";

  if (subjectGeneric && siblingGeneric) return subjectGeneric === siblingGeneric;

  // One side has no generic: compare the generic against the other name.
  if (subjectGeneric) return subjectGeneric === normaliseText(sibling.name);
  if (siblingGeneric) return siblingGeneric === normaliseText(subject.name);

  return normaliseText(subject.name) === normaliseText(sibling.name);
}

/**
 * Evaluates a medicine against the patient's allergies, conditions and
 * the conversation so far, and returns the warning list.
 */
export function evaluateWarnings(
  subject: ScheduleSubject,
  context: SafetyContext = {},
  options: { timesPerDay?: number; clockTimes?: string[] } = {},
): WarningEvaluation {
  const warnings: DoseWarning[] = [];
  const names = [subject.name, subject.generic, subject.brand]
    .filter(Boolean)
    .map((n) => String(n));

  // ── W-1 Allergy — hard block ──
  const allergies = context.allergies ?? [];
  for (const allergy of allergies) {
    const hit = names.find((n) => matchesAllergyFamily(n, allergy));
    if (hit) {
      warnings.push({
        code: "ALLERGY",
        severity: "block",
        message:
          `You recorded an allergy to ${allergy}. ${subject.name} belongs to the same ` +
          `family — do not take it until a doctor confirms it is safe for you.`,
        acknowledged: false,
      });
      break; // one allergy warning is enough
    }
  }

  // ── W-2 Dengue — hard block for a REAL dengue case, else advisory ──
  const signals = detectRiskSignals(subject, context);
  if (isDengueRiskMedicine(names.join(" "))) {
    if (signals.dengueSuspected) {
      warnings.push({
        code: "DENGUE",
        severity: "block",
        message:
          "Dengue is possible here. Ibuprofen, aspirin and naproxen can worsen bleeding — " +
          "use paracetamol and fluids only until a doctor advises otherwise.",
        acknowledged: false,
      });
    } else if (signals.dengueMentioned) {
      // The chat only MENTIONED dengue, negated or hypothetically
      // ("dengue is unlikely", "in case of dengue"). A block here would be
      // permanent, so the warning is advisory and can be acknowledged.
      warnings.push({
        code: "DENGUE",
        severity: "acknowledge",
        message:
          "Dengue was only mentioned as a possibility in this chat, not as your condition. " +
          "If dengue turns out to be the cause, ibuprofen and similar painkillers can worsen " +
          "bleeding — paracetamol and fluids are the safer choice until a doctor advises.",
        acknowledged: false,
      });
    } else if (signals.fever) {
      warnings.push({
        code: "DENGUE",
        severity: "acknowledge",
        message:
          "You have a fever. If dengue turns out to be possible, ibuprofen and similar " +
          "painkillers can worsen bleeding — paracetamol is the safer choice. Confirm with a doctor.",
        acknowledged: false,
      });
    }
  }

  // ── W-3 NSAID + condition — acknowledge ──
  if (signals.mentionsNsaid) {
    const conditions = (context.conditions ?? []).map((c) => normaliseText(c));
    const risky = conditions.find((c) =>
      NSAID_RISK_CONDITIONS.some((risk) => c.includes(risk)),
    );
    if (risky) {
      warnings.push({
        code: "NSAID_CONDITION",
        severity: "acknowledge",
        message:
          `You recorded "${risky}". Anti-inflammatory painkillers (ibuprofen, diclofenac, naproxen) ` +
          "can make this worse. Ask a doctor or pharmacist before taking it.",
        acknowledged: false,
      });
    }
  }

  // ── W-4 Prescription-only medicine — acknowledge ──
  if (subject.requiresRx) {
    warnings.push({
      code: "RX_ONLY",
      severity: "acknowledge",
      message:
        "This is a prescription-only medicine. Take it only as prescribed by your doctor, " +
        "and only for the full prescribed course.",
      acknowledged: false,
    });
  }

  // ── W-5 Duplicate therapy — acknowledge ──
  const siblings = context.siblings ?? [];
  for (const sibling of siblings) {
    // Compare on the GENERIC name whenever both sides have one: "Napa" and
    // "Paracetamol" are one molecule under two brands and the patient would
    // take both. Fall back to the name when a generic is missing, otherwise
    // this warning could never fire.
    if (!sameMolecule(subject, sibling)) continue;
    // The same product written twice in one message is not duplicate therapy.
    if (normaliseText(sibling.name) === normaliseText(subject.name)) continue;
    const molecule = subject.generic ?? subject.name;
    warnings.push({
      code: "DUPLICATE",
      severity: "acknowledge",
      message:
        `${subject.name} and ${sibling.name} are both ${molecule}. Taking both may ` +
        "double your dose — check with a pharmacist.",
      acknowledged: false,
    });
    break;
  }

  // ── W-6 Over-frequency — acknowledge ──
  // SAFETY: the check uses the REAL number of doses that was asked for.
  // The parser's meal ladder only covers four doses a day, so a 5–8×/day
  // regimen used to be truncated to four — which under-dosed the patient
  // AND made this warning unreachable (the caller passed the truncated
  // count, never a number above four).
  const requested =
    typeof options.timesPerDay === "number" && Number.isFinite(options.timesPerDay)
      ? options.timesPerDay
      : 0;
  const confirmed = Array.isArray(options.clockTimes) ? options.clockTimes.length : 0;
  const dosesPerDay = Math.max(requested, confirmed);
  if (dosesPerDay > MAX_DOSES_PER_DAY) {
    warnings.push({
      code: "OVER_FREQUENCY",
      severity: "acknowledge",
      message:
        requested > confirmed
          ? `The chat asks for ${requested} doses a day — more often than the usual label ` +
            `limit of ${MAX_DOSES_PER_DAY}. You have set ${confirmed} time(s): make sure your ` +
            "label agrees, and confirm the schedule with a doctor or pharmacist before you start."
          : `That is ${dosesPerDay} doses in a day, which is more often than the usual label ` +
            `limit of ${MAX_DOSES_PER_DAY}. Confirm the schedule with a doctor or pharmacist ` +
            "before you start.",
      acknowledged: false,
    });
  }

  // ── W-7 Missed-dose rule — informational, always present ──
  warnings.push({
    code: "MISSED_DOSE_RULE",
    severity: "info",
    message: "If you miss a dose, skip it — never double up the next one.",
    acknowledged: true,
  });

  return {
    warnings,
    blocked: warnings.some((w) => w.severity === "block"),
  };
}

/* ────────────────────────────────────────────────────────────────────
   3. Occurrence derivation
   ──────────────────────────────────────────────────────────────────── */

/** How far ahead reminders are materialised. */
export const SCHEDULE_HORIZON_HOURS = 72;

/** A dose unacknowledged for longer than this is marked "missed". */
export const MISSED_AFTER_MINUTES = 60;

/** The shape of a real wall-clock time. */
const CLOCK_RE = /^(\d{1,2}):(\d{1,2})$/;

/**
 * Parses a "HH:mm" string into minutes past midnight.
 *
 * Returns null when the value is not a real clock time. SAFETY: the old
 * implementation used `Number.isNaN`, which is FALSE for `undefined`, so
 * `clockToMinutes("")` and `clockToMinutes("8")` returned NaN. NaN passes
 * every comparison guard and reached `new Date(NaN).toISOString()`, which
 * throws a RangeError inside the store's `set` and unmounted the whole
 * medication panel.
 */
function parseClockMinutes(hhmm: string): number | null {
  if (typeof hhmm !== "string") return null;

  const match = CLOCK_RE.exec(hhmm.trim());
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  return hours * 60 + minutes;
}

/**
 * Parses a "HH:mm" string into minutes past midnight.
 *
 * Invalid input yields 0 — never NaN, which would slip through every
 * comparison guard and crash the occurrence builder.
 */
export function clockToMinutes(hhmm: string): number {
  return parseClockMinutes(hhmm) ?? 0;
}

/** Renders minutes past midnight as "HH:mm". */
export function minutesToClock(minutes: number): string {
  const safe = Number.isFinite(minutes) ? minutes : 0;
  const total = ((safe % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/**
 * Clock times spread evenly across the waking day.
 *
 * Used when a regimen asks for more doses than the meal ladder covers.
 * The parser's ladder only has slots for one to four doses a day, so a
 * 5–8×/day regimen was silently cut down to four — the patient was
 * under-dosed. These times are a starting point the patient confirms;
 * they never replace a frequency the doctor wrote.
 */
export function evenlySpacedClockTimes(count: number, firstHour = 8, lastHour = 22): string[] {
  const doses = Math.max(1, Math.min(24, Math.floor(Number.isFinite(count) ? count : 1)));
  if (doses === 1) return [minutesToClock(firstHour * 60)];

  const start = firstHour * 60;
  const end = lastHour * 60;
  const step = (end - start) / (doses - 1);
  const times: string[] = [];

  for (let i = 0; i < doses; i += 1) {
    const minutes = Math.round((start + i * step) / 5) * 5;
    times.push(minutesToClock(minutes));
  }

  return [...new Set(times)];
}

/** Local midnight of a "YYYY-MM-DD" string, or null when it is not a date. */
function parseLocalDate(iso: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!year || !month || !day) return null;
  const timestamp = new Date(year, month - 1, day, 0, 0, 0, 0).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

/**
 * ISO string for a timestamp, or null when the timestamp is not a real
 * instant. An invalid date must never throw inside the store's `set`.
 */
function safeIsoString(timestamp: number): string | null {
  if (!Number.isFinite(timestamp)) return null;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return null;
  try {
    return date.toISOString();
  } catch {
    return null;
  }
}

/**
 * Materialises concrete dose occurrences for a window of time.
 *
 * Occurrence ids are deterministic (`scheduleId_ISO`) so that
 * re-deriving the same window can never create a duplicate — the
 * notification layer uses the id as its dedupe key.
 */
export function deriveOccurrences(
  schedule: Pick<
    MedicationSchedule,
    | "id"
    | "clockTimes"
    | "startAt"
    | "durationDays"
    | "frequencyKind"
    | "daysOfWeek"
    | "everyDays"
    | "startDate"
    | "endDate"
  >,
  now: number = Date.now(),
  horizonHours: number = SCHEDULE_HORIZON_HOURS,
  existing: DoseOccurrence[] = [],
): DoseOccurrence[] {
  const times = Array.isArray(schedule.clockTimes) ? schedule.clockTimes : [];

  // No confirmed times → no occurrences. A schedule never invents one.
  if (!times.length) return existing;

  // A corrupt entry in localStorage is dropped instead of being turned
  // into NaN — one broken "25:99" must not take the panel down.
  const minutes = times
    .map(parseClockMinutes)
    .filter((value): value is number => value !== null)
    .sort((a, b) => a - b);
  if (!minutes.length) return existing;

  const baseNow = Number.isFinite(now) ? now : Date.now();
  const startAt = Number.isFinite(schedule.startAt) ? schedule.startAt : baseNow;
  const horizonEnd = baseNow + horizonHours * 3600_000;
  const durationDays =
    typeof schedule.durationDays === "number" &&
    Number.isFinite(schedule.durationDays) &&
    schedule.durationDays > 0
      ? schedule.durationDays
      : 0;
  // The course ends `durationDays` after the start — a 3-day course must
  // not keep reminding after the third day.
  const durationEnd = durationDays ? startAt + durationDays * 86_400_000 : Infinity;

  const byId = new Map(existing.map((o) => [o.id, o]));
  const generated: DoseOccurrence[] = [];

  /* ── Patient-defined repetition rules ───────────────────────────
     The patient can narrow a reminder down to specific weekdays, to
     every N days, and to an exact date range. All three are honoured
     here so the notification layer never fires on a day the patient
     excluded. */

  const daysOfWeek = Array.isArray(schedule.daysOfWeek)
    ? schedule.daysOfWeek.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
    : [];
  const everyDays =
    typeof schedule.everyDays === "number" &&
    Number.isFinite(schedule.everyDays) &&
    schedule.everyDays > 1
      ? Math.round(schedule.everyDays)
      : 0;

  const startDateStart = schedule.startDate
    ? parseLocalDate(schedule.startDate)
    : null;
  const endDateStart = schedule.endDate ? parseLocalDate(schedule.endDate) : null;
  const endDateEnd = endDateStart === null ? null : endDateStart + 86_399_999;

  /** True when the reminder is allowed to fire on this calendar day. */
  const dayAllowed = (dayStart: number): boolean => {
    if (startDateStart !== null && dayStart < startDateStart) return false;
    if (endDateEnd !== null && dayStart > endDateEnd) return false;

    if (daysOfWeek.length && !daysOfWeek.includes(new Date(dayStart).getDay())) {
      return false;
    }

    if (everyDays > 0 && startDateStart !== null) {
      const daysSince = Math.round((dayStart - startDateStart) / 86_400_000);
      if (daysSince % everyDays !== 0) return false;
    }

    return true;
  };

  const firstDay = new Date(startAt);
  if (Number.isNaN(firstDay.getTime())) return existing;
  firstDay.setHours(0, 0, 0, 0);
  const firstDayStart = firstDay.getTime();
  if (!Number.isFinite(firstDayStart)) return existing;

  for (let dayOffset = 0; dayOffset < 400; dayOffset += 1) {
    const dayStart = firstDayStart + dayOffset * 86_400_000;
    if (!Number.isFinite(dayStart)) break;
    if (dayStart > durationEnd) break;
    if (dayStart > horizonEnd) break;
    if (!dayAllowed(dayStart)) continue;

    for (const minuteOfDay of minutes) {
      const scheduledAt = dayStart + minuteOfDay * 60_000;
      if (!Number.isFinite(scheduledAt)) continue;
      if (scheduledAt < startAt) continue;
      if (scheduledAt > horizonEnd) continue;
      if (scheduledAt > durationEnd) continue;

      const iso = safeIsoString(scheduledAt);
      if (!iso) continue; // skip the occurrence rather than throw

      const id = `${schedule.id}_${iso}`;
      const previous = byId.get(id);

      if (previous) {
        generated.push(previous);
        continue;
      }

      const overdueBy = baseNow - scheduledAt;
      const status: DoseOccurrence["status"] =
        overdueBy > MISSED_AFTER_MINUTES * 60_000 ? "missed" : "pending";

      generated.push({
        id,
        scheduleId: schedule.id,
        scheduledAt,
        status,
        actedAt: status === "missed" ? baseNow : undefined,
      });
    }
  }

  return generated.sort((a, b) => a.scheduledAt - b.scheduledAt);
}

/* ────────────────────────────────────────────────────────────────────
   4. Schedule construction
   ──────────────────────────────────────────────────────────────────── */

export interface BuildScheduleParams {
  id: string;
  subject: ScheduleSubject;
  /** Verbatim from the chat/label — required, never invented. */
  dose: string;
  /** Verbatim frequency string for display, e.g. "twice daily after meals". */
  frequency: string;
  /** Undefined when the chat gave no timing signal (S-1). */
  timesPerDay?: number;
  anchor?: "morning" | "afternoon" | "evening" | "night" | "after_meal" | "before_meal" | "before_bed" | "interval";
  intervalHours?: number;
  clockTimes?: string[];
  durationDays?: number;
  startAt?: number;
  preparationNote?: string;
  source: MedicationSchedule["source"];
  sourceMessageId?: string;
  warnings: DoseWarning[];
  now?: number;
}

/**
 * Builds a persisted schedule from patient-confirmed values.
 *
 * Throws when the safety engine has issued a blocking warning — the
 * UI must never be able to create such a schedule.
 */
export function buildSchedule(params: BuildScheduleParams): MedicationSchedule {
  if (params.warnings.some((w) => w.severity === "block")) {
    throw new Error(
      "Cannot build a schedule while a blocking safety warning is unacknowledged.",
    );
  }

  const now = params.now ?? Date.now();
  const startAt = params.startAt ?? now;

  const confirmedTimes = normaliseClockTimes(params.clockTimes);
  const clockTimes = confirmedTimes.length
    ? confirmedTimes
    : params.timesPerDay
      ? resolveScheduleTimes(
          params.timesPerDay,
          params.anchor ?? "morning",
          params.intervalHours,
        )
      : [];

  const schedule: MedicationSchedule = {
    id: params.id,
    createdAt: now,
    updatedAt: now,
    medicineId: undefined,
    name: params.subject.name,
    generic: params.subject.generic,
    brand: params.subject.brand,
    dose: params.dose,
    frequency: params.frequency,
    timesPerDay: params.timesPerDay ?? clockTimes.length,
    anchor: params.anchor ?? "morning",
    intervalHours: params.intervalHours,
    clockTimes,
    durationDays: params.durationDays,
    startAt,
    preparationNote: params.preparationNote,
    warnings: params.warnings,
    source: params.source,
    sourceMessageId: params.sourceMessageId,
    status: "active",
    occurrences: [],
  };

  schedule.occurrences = deriveOccurrences(schedule, now);
  return schedule;
}

/**
 * Cleans the clock times before they are persisted: invalid entries are
 * dropped, duplicates collapse and the list is ordered by the day.
 *
 * SAFETY: a corrupt "HH:mm" must never reach the occurrence builder, where
 * it used to become NaN and crash the medication panel.
 */
function normaliseClockTimes(times?: string[]): string[] {
  if (!Array.isArray(times)) return [];

  const seen = new Set<string>();
  for (const time of times) {
    const minutes = parseClockMinutes(time);
    if (minutes === null) continue;
    seen.add(minutesToClock(minutes));
  }

  return [...seen].sort((a, b) => clockToMinutes(a) - clockToMinutes(b));
}

/**
 * Fallback clock times for a confirmed frequency that carries no times.
 *
 * SAFETY: the parser's meal ladder only covers one to four doses a day.
 * Anything above four is spread across the day instead of being silently
 * cut down to four doses — a 6×/day antibiotic must not become a 4×/day
 * reminder, which would under-dose the patient.
 */
function resolveScheduleTimes(
  timesPerDay: number,
  anchor: DoseAnchor,
  intervalHours?: number,
): string[] {
  const count = Math.max(1, Math.min(24, Math.floor(timesPerDay)));

  if (count <= 4 || anchor === "interval") {
    return resolveClockTimes({
      timesPerDay: count,
      anchor,
      intervalHours,
      suggestedTimes: [],
    });
  }

  return evenlySpacedClockTimes(count);
}

/* ────────────────────────────────────────────────────────────────────
   5. Queries used by the notification layer
   ──────────────────────────────────────────────────────────────────── */

/** Occurrences that are due now or in the near future. */
export function getUpcomingOccurrences(
  schedules: MedicationSchedule[],
  now: number = Date.now(),
  withinMs: number = 60 * 60_000,
): DoseOccurrence[] {
  return schedules
    .filter((s) => s.status === "active")
    .flatMap((s) => s.occurrences)
    .filter((o) => o.status === "pending" && o.scheduledAt >= now && o.scheduledAt <= now + withinMs)
    .sort((a, b) => a.scheduledAt - b.scheduledAt);
}

/** Occurrences that were never acknowledged. */
export function getMissedOccurrences(
  schedules: MedicationSchedule[],
  now: number = Date.now(),
): DoseOccurrence[] {
  return schedules
    .filter((s) => s.status === "active")
    .flatMap((s) => s.occurrences)
    .filter((o) => o.status === "missed")
    .sort((a, b) => a.scheduledAt - b.scheduledAt);
}

/** Marks one occurrence with a new status, keeping the schedule immutable. */
export function markOccurrence(
  schedule: MedicationSchedule,
  occurrenceId: string,
  status: DoseOccurrence["status"],
  now: number = Date.now(),
): MedicationSchedule {
  return {
    ...schedule,
    updatedAt: now,
    occurrences: schedule.occurrences.map((o) =>
      o.id === occurrenceId ? { ...o, status, actedAt: now } : o,
    ),
  };
}

/* ────────────────────────────────────────────────────────────────────
   6. Severity helper for the doctor handover
   ──────────────────────────────────────────────────────────────────── */

/**
 * Derives a severity label from the patient's own words.
 * Used by the summary generator; never invents a severity.
 */
export function deriveSeverity(text: string): Severity {
  const source = normaliseText(text);
  if (/(severe|very bad|worst|intense|unbearable|extreme|khub kharap)/.test(source)) {
    return "severe";
  }
  if (/(moderate|medium|kttho)/.test(source)) return "moderate";
  if (/(mild|slight|a little|light|halka|hat dhore)/.test(source)) return "mild";
  return "unknown";
}
