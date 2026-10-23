"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import type { DoseWarning, MedicationSchedule } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useProfileStore } from "@/stores/useProfileStore";
import { useMedicationStore } from "@/stores/useMedicationStore";
import {
  evaluateWarnings,
  buildSchedule,
  evenlySpacedClockTimes,
  MAX_DOSES_PER_DAY,
} from "@/lib/dose-schedule";
import {
  extractMedicineContext,
  extractMedicationDraft,
  normaliseText,
  resolveClockTimes,
  type FrequencyHint,
  type MedicationMention,
} from "@/lib/dose-parse";
import {
  armScheduleTimers,
  notificationsSupported,
  requestNotificationPermission,
} from "@/lib/notifications";
import { Bell, Check, ChevronDown, ChevronUp, Loader2, X } from "lucide-react";

interface DoseReminderCardProps {
  /** The assistant message the suggestion came from. */
  messageId: string;
  /** The raw text the medicines were extracted from. */
  text: string;
  /** Pre-extracted mentions (avoids re-parsing on every render). */
  mentions?: MedicationMention[];
  onDismiss?: () => void;
}

/* ────────────────────────────────────────────────────────────────────
   Copy helpers — plain words, no abbreviations
   ──────────────────────────────────────────────────────────────────── */

/** "once a day" / "twice a day" / "3 times a day" */
function frequencyLabel(count: number): string {
  if (count <= 0) return "";
  if (count === 1) return "once a day";
  if (count === 2) return "twice a day";
  return `${count} times a day`;
}

/** "08:30" → "8:30 AM" */
function clockLabel(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

/** "for 3 days" / "until you stop it" */
function durationLabel(days?: number): string {
  if (!days || days <= 0) return "until you stop it";
  if (days === 1) return "for 1 day";
  return `for ${days} days`;
}

const TIME_PRESETS = [
  { label: "Morning", value: "08:00" },
  { label: "Noon", value: "14:00" },
  { label: "Evening", value: "20:00" },
  { label: "Night", value: "22:00" },
];

const DURATION_OPTIONS = [1, 3, 5, 7, 10, 14, 30];

/**
 * Local copy of the meal ladder.
 *
 * SAFETY: the parser's ladder only has slots for one to four doses a day,
 * so a 5–8×/day regimen was cut down to four — the patient would have
 * been silently under-dosed. This ladder keeps the count the doctor asked
 * for, and the patient confirms every time.
 */
const MEAL_SLOTS: Record<number, string[]> = {
  1: ["08:00"],
  2: ["08:00", "20:00"],
  3: ["08:00", "14:00", "20:00"],
  4: ["08:00", "12:00", "16:00", "20:00"],
};

/** The bedtime slot — the last dose of a "before bed" regimen. */
const BEDTIME_SLOT = "22:00";

/**
 * "At bedtime" in the shorthand doctors use ("1 tab HS", "1+0+1, one at
 * bedtime"). The parser may not always recognise it, so the card checks
 * for itself: a bedtime regimen must end with the 22:00 slot.
 */
const BEDTIME_RE =
  /(\bhs\b|before\s*bed|at\s*bedtime|bed\s*time|before\s*sleep|night\s*time|রাতে\s*ঘুমা|ঘুমানোর\s*আগে|নাশত)/;

interface MedicineDraft {
  key: string;
  name: string;
  generic?: string;
  brand?: string;
  /** The dose, pre-filled from the chat. Editable, never invented. */
  dose: string;
  /** True when the dose came from the chat rather than the patient's label. */
  doseFromChat: boolean;
  clockTimes: string[];
  /** The number of doses a day the chat asked for — never reduced. */
  timesPerDay: number;
  anchor: FrequencyHint["anchor"];
  intervalHours?: number;
  durationDays?: number;
  /** Whether this medicine gets a reminder when several are suggested. */
  included: boolean;
  acknowledged: string[];
}

function mentionsBedtime(text: string): boolean {
  return BEDTIME_RE.test(normaliseText(text));
}

/**
 * The clock times to OFFER the patient.
 *
 * SAFETY: when the frequency could not be parsed this returns NOTHING.
 * The card then asks the patient for the times instead of inventing
 * "08:00/20:00" — that invention turned a once-daily medicine into a
 * twice-daily reminder with the pills pre-selected.
 */
function suggestedTimesFor(frequency: FrequencyHint, text: string): string[] {
  const count = frequency.timesPerDay;
  if (!count || count < 1) return [];

  const bedtime = frequency.anchor === "before_bed" || mentionsBedtime(text);
  const resolved = resolveClockTimes(frequency);

  // The parser truncates anything above four doses to the four meal slots
  // and collapses a bedtime regimen to a single slot. Rebuild the list
  // locally so the number of doses is never silently reduced.
  const times = resolved.length === count ? resolved : buildSlots(count);

  return bedtime ? withBedtimeSlot(times) : times;
}

function buildSlots(count: number): string[] {
  if (count <= 4) return [...(MEAL_SLOTS[count] ?? MEAL_SLOTS[1])];
  return evenlySpacedClockTimes(count);
}

/** Keeps the bedtime dose last, at 22:00. */
function withBedtimeSlot(times: string[]): string[] {
  if (times.length <= 1) return [BEDTIME_SLOT];
  const out = [...times];
  out[out.length - 1] = BEDTIME_SLOT;
  return [...new Set(out)].sort();
}

function toDraft(
  mention: MedicationMention,
  text: string,
  index: number,
  mentions: MedicationMention[],
  frequency: FrequencyHint,
): MedicineDraft {
  // SAFETY: every value is read from THIS medicine's own slice of the
  // message. A message can carry two different regimens — "Napa … twice
  // a day. Orsaline-N … 4 times daily" — and reading the message-level
  // frequency gave both medicines the same one, so a 4-times-a-day
  // saline became a 2-times-a-day reminder and the patient would have
  // been UNDER-DOSED.
  const context = extractMedicineContext(text, mention, mentions);
  const effectiveFrequency = context.frequency;
  const requested = effectiveFrequency.timesPerDay ?? frequency.timesPerDay ?? 0;

  const suggestion = context.dose;

  return {
    key: `${mention.generic}-${index}`,
    name: mention.brand || mention.generic || mention.rawText,
    generic: mention.generic,
    brand: mention.brand,
    // Pre-filled from the chat so the patient reads it instead of
    // retyping it. It is still the patient's to correct, and it is never
    // persisted without their explicit confirmation.
    dose: suggestion ?? "",
    doseFromChat: Boolean(suggestion),
    // SAFETY: a regimen of more than four doses a day is never seeded
    // from a truncated list — the patient enters every time themselves.
    clockTimes:
      requested > MAX_DOSES_PER_DAY ? [] : suggestedTimesFor(effectiveFrequency, text),
    timesPerDay: requested,
    anchor: effectiveFrequency.anchor,
    intervalHours: effectiveFrequency.intervalHours,
    durationDays: context.duration.days,
    included: true,
    acknowledged: [],
  };
}

/**
 * "Set a reminder" — the suggestion that appears under a Dr MediLink
 * reply that names a medicine.
 *
 * ── The design principle ──────────────────────────────────────────────
 * Dr MediLink has already said when to take the medicine. The patient's
 * job is not to re-enter that, it is to agree with it. So the sheet
 * READS the details back, pre-filled, and asks for exactly one answer:
 * "yes, remind me".
 *
 * Only what is genuinely unknown is asked for:
 *   • no dose in the chat  → the dose field is shown, empty
 *   • no frequency in the chat → the time chips are shown, unselected
 * Everything else stays collapsed and one tap away.
 *
 * SAFETY INVARIANTS
 *   S-1  Nothing is saved that the patient did not confirm. A frequency
 *        the chat could not parse is NOT turned into a schedule.
 *   L2   The dose that is persisted is the one the patient confirmed on
 *        screen — the AI's value is only ever a pre-filled proposal.
 *   S-5  An allergy or a confirmed dengue conflict blocks the reminder
 *        outright. A hypothetical dengue mention is advisory.
 */
export const DoseReminderCard: React.FC<DoseReminderCardProps> = ({
  messageId,
  text,
  mentions: providedMentions,
  onDismiss,
}) => {
  const { showToast } = useToast();
  const profile = useProfileStore((s) => s.profile);
  const addSchedule = useMedicationStore((s) => s.addSchedule);
  const schedules = useMedicationStore((s) => s.schedules);

  const [isOpen, setIsOpen] = useState(false);
  const [drafts, setDrafts] = useState<MedicineDraft[]>([]);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [labelChecked, setLabelChecked] = useState(false);

  const mentions = useMemo(
    () => providedMentions ?? extractMedicationDraft(text).mentions,
    [providedMentions, text],
  );

  const alreadyScheduled = schedules.some(
    (schedule) => schedule.sourceMessageId === messageId,
  );

  const openSheet = () => {
    const parsed = extractMedicationDraft(text);
    const next = mentions.map((mention, index) =>
      toDraft(mention, text, index, mentions, parsed.frequency),
    );
    setDrafts(next);
    setLabelChecked(false);

    // Open the editor ONLY for a medicine we genuinely cannot fill in.
    const needsInput = next.find(
      (draft) => !draft.dose.trim() || !draft.clockTimes.length,
    );
    setExpandedKey(needsInput?.key ?? null);
    setIsOpen(true);
  };

  const updateDraft = (key: string, patch: Partial<MedicineDraft>) => {
    setDrafts((current) =>
      current.map((draft) => (draft.key === key ? { ...draft, ...patch } : draft)),
    );
  };

  /**
   * Toggles one dose time.
   *
   * SAFETY / CORRECTNESS: this reads the CURRENT times out of the
   * updater rather than out of the render closure. Two taps in the same
   * tick used the stale array and the second tap replaced the first, so
   * "Morning + Evening" collapsed to "Evening" — the patient would have
   * been under-dosed.
   */
  const toggleTime = (key: string, time: string) => {
    setDrafts((current) =>
      current.map((draft) => {
        if (draft.key !== key) return draft;
        const has = draft.clockTimes.includes(time);
        const clockTimes = has
          ? draft.clockTimes.filter((t) => t !== time)
          : [...draft.clockTimes, time].sort();
        return { ...draft, clockTimes, labelChecked: false, acknowledged: [] };
      }),
    );
    setLabelChecked(false);
  };

  /** The next free whole hour, so a new time never collides. */
  const nextFreeTime = (times: string[]): string => {
    for (let hour = 8; hour < 24; hour += 1) {
      const value = `${String(hour).padStart(2, "0")}:00`;
      if (!times.includes(value)) return value;
    }
    return "23:00";
  };

  const addTime = (key: string) => {
    setDrafts((current) =>
      current.map((draft) => {
        if (draft.key !== key) return draft;
        return {
          ...draft,
          clockTimes: [...draft.clockTimes, nextFreeTime(draft.clockTimes)].sort(),
          labelChecked: false,
          acknowledged: [],
        };
      }),
    );
    setLabelChecked(false);
  };

  const removeTime = (key: string, time: string) => {
    setDrafts((current) =>
      current.map((draft) =>
        draft.key === key
          ? {
              ...draft,
              clockTimes: draft.clockTimes.filter((t) => t !== time),
              labelChecked: false,
              acknowledged: [],
            }
          : draft,
      ),
    );
    setLabelChecked(false);
  };

  /**
   * Safety evaluation for one draft. Blocked drafts cannot be enabled.
   *
   * The other drafts of the same reply are passed as siblings so the
   * duplicate-therapy warning can fire: "Napa" and "Paracetamol" are one
   * molecule under two names, and taking both doubles the dose.
   */
  const evaluation = useMemo(() => {
    return drafts.map((draft) => {
      const siblings = drafts
        .filter((other) => other.key !== draft.key)
        .map((other) => ({
          name: other.name,
          generic: other.generic,
          brand: other.brand,
        }));

      const result = evaluateWarnings(
        {
          name: draft.name,
          generic: draft.generic,
          brand: draft.brand,
        },
        {
          allergies: profile?.allergies,
          conditions: profile?.diseases,
          conversationText: text,
          siblings,
        },
        {
          // The REAL number of doses that was asked for — never the
          // truncated suggestion — so the over-frequency guard can fire.
          timesPerDay: Math.max(draft.timesPerDay, draft.clockTimes.length),
          clockTimes: draft.clockTimes,
        },
      );
      return { key: draft.key, warnings: result.warnings, blocked: result.blocked };
    });
  }, [drafts, profile, text]);

  const warningsByKey = useMemo(() => {
    const map = new Map<string, DoseWarning[]>();
    for (const entry of evaluation) map.set(entry.key, entry.warnings);
    return map;
  }, [evaluation]);

  const included = drafts.filter((draft) => draft.included);
  const blocked = evaluation.some(
    (entry) => entry.blocked && drafts.find((d) => d.key === entry.key)?.included,
  );

  /**
   * Everything the patient had to supply is present: the dose, the times
   * and every safety warning. The label check on top of this is the one
   * deliberate act that switches the reminder on.
   */
  const readyToConfirm =
    included.length > 0 &&
    included.every((draft) => {
      const warnings = warningsByKey.get(draft.key) ?? [];
      const needsAck = warnings.filter(
        (warning) => warning.severity === "acknowledge" && !draft.acknowledged,
      );
      return (
        draft.dose.trim().length > 0 &&
        draft.clockTimes.length > 0 &&
        needsAck.length === 0
      );
    });

  const allChecked = readyToConfirm && labelChecked;

  /**
   * What is genuinely still missing — stated precisely, so the hint never
   * asks for something the patient has already given.
   */
  const missingHint = useMemo(() => {
    const needsDose = included.some((draft) => !draft.dose.trim());
    const needsTimes = included.some((draft) => !draft.clockTimes.length);
    if (needsDose && needsTimes) return "Add the dose and choose the times to continue.";
    if (needsDose) return "Add the dose to continue.";
    if (needsTimes) return "Choose the times to continue.";
    return "";
  }, [included]);

  const handleEnable = async () => {
    if (!allChecked || blocked) return;

    const created: MedicationSchedule[] = [];

    for (const draft of included) {
      const warnings = (warningsByKey.get(draft.key) ?? []).map((warning) => ({
        ...warning,
        acknowledged:
          warning.severity === "info" ? true : draft.acknowledged.includes(warning.code),
      }));

      try {
        const schedule = buildSchedule({
          id: `sch_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
          subject: { name: draft.name, generic: draft.generic, brand: draft.brand },
          // The dose that is persisted is the one the patient confirmed on
          // screen. The AI's value is only ever a pre-filled proposal,
          // so the lock-screen notification can only ever show a dose the
          // patient agreed to.
          dose: draft.dose.trim(),
          frequency: `${draft.clockTimes.length}× daily`,
          timesPerDay: draft.clockTimes.length,
          anchor: draft.anchor,
          intervalHours: draft.anchor === "interval" ? draft.intervalHours : undefined,
          clockTimes: draft.clockTimes,
          durationDays: draft.durationDays,
          source: "chat",
          sourceMessageId: messageId,
          warnings,
        });
        created.push(schedule);
      } catch {
        // A blocking warning slipped through — skip this medicine.
      }
    }

    if (!created.length) {
      showToast("Could not create the reminder. Please check the warnings.", "error");
      return;
    }

    for (const schedule of created) addSchedule(schedule);

    // Permission must be requested from a user gesture — this click is it.
    if (notificationsSupported()) {
      const permission = await requestNotificationPermission();
      if (permission === "denied") {
        showToast(
          "Browser alerts are off — we will still remind you inside MediLink.",
          "info",
        );
      }
    }

    armScheduleTimers(created);
    setIsOpen(false);
    showToast(
      created.length === 1
        ? `Reminder set for ${created[0].name}.`
        : `${created.length} reminders set.`,
      "success",
    );
  };

  /* ──────────────────────────────────────────────────────────────
     Collapsed — one line in the chat thread
     ────────────────────────────────────────────────────────────── */
  if (!mentions.length) return null;

  const previewName =
    mentions.length === 1
      ? mentions[0].brand || mentions[0].generic
      : `${mentions.length} medicines`;

  return (
    <>
      <div className="mt-2 inline-flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-full bg-brand-light/60 border border-brand-soft">
        <Bell className="w-4 h-4 text-brand shrink-0" aria-hidden="true" />
        <span className="text-[13px] font-semibold text-text-primary">
          Remind me: {previewName}
        </span>
        {alreadyScheduled ? (
          <Link
            href="/medications"
            className="h-8 px-3 rounded-full bg-brand-light text-brand text-[12px] font-bold inline-flex items-center hover:bg-brand/10 transition-colors"
          >
            View reminders
          </Link>
        ) : (
          <button
            type="button"
            onClick={openSheet}
            className="h-8 px-3 rounded-full bg-brand text-white text-[12px] font-bold hover:bg-brand-dark transition-colors"
          >
            Set reminder
          </button>
        )}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss reminder suggestion"
            className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:bg-white transition-colors"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* ──────────────────────────────────────────────────────────
         The sheet — one decision, pre-filled
         ────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Set reminder"
        maxWidth="max-w-[440px]"
        footer={
          <div className="w-full flex items-center gap-3">
            <Button variant="ghost" size="m" onClick={() => setIsOpen(false)}>
              Not now
            </Button>
            <Button size="m" className="flex-1" onClick={handleEnable} disabled={!allChecked || blocked}>
              {included.length > 1 ? `Set ${included.length} reminders` : "Set reminder"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {drafts.map((draft) => {
            const warnings = warningsByKey.get(draft.key) ?? [];
            const blocking = warnings.filter((w) => w.severity === "block");
            const acknowledgements = warnings.filter((w) => w.severity === "acknowledge");
            const isExpanded = expandedKey === draft.key;
            const needsDose = !draft.dose.trim();
            const needsTimes = !draft.clockTimes.length;

            return (
              <div
                key={draft.key}
                className={`rounded-[14px] border ${
                  blocking.length
                    ? "border-emergency/30 bg-emergency-soft/40"
                    : "border-border-soft"
                } ${draft.included ? "" : "opacity-50"}`}
              >
                {/* Summary row */}
                <div className="flex items-start gap-3 p-4">
                  {drafts.length > 1 && (
                    <input
                      type="checkbox"
                      checked={draft.included}
                      onChange={(e) =>
                        updateDraft(draft.key, { included: e.target.checked })
                      }
                      aria-label={`Remind me about ${draft.name}`}
                      className="mt-1 w-4 h-4 accent-[#17786F] shrink-0"
                    />
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-bold text-text-primary">
                      {draft.name}
                    </div>

                    {/* The details, read back — the patient confirms, not types */}
                    <div className="mt-1 space-y-0.5 text-[13px] text-text-muted">
                      {draft.dose.trim() ? (
                        <div>
                          <span className="font-semibold text-text-primary">
                            {draft.dose.trim()}
                          </span>
                          {draft.timesPerDay > 0 && (
                            <span> · {frequencyLabel(draft.timesPerDay)}</span>
                          )}
                          {draft.doseFromChat && (
                            <span className="text-text-muted/80"> · from the chat</span>
                          )}
                        </div>
                      ) : (
                        <div className="text-accent font-semibold">
                          Dose needed — tap Change to add it
                        </div>
                      )}

                      {draft.clockTimes.length > 0 && (
                        <div>{draft.clockTimes.map(clockLabel).join(" · ")}</div>
                      )}

                      <div>{durationLabel(draft.durationDays)}</div>
                    </div>

                    {/* Warnings — only when there are any */}
                    {blocking.map((warning, index) => (
                      <div
                        key={`b${index}`}
                        className="mt-2 text-[12px] font-semibold text-emergency-dark leading-relaxed"
                      >
                        {warning.message}
                      </div>
                    ))}

                    {acknowledgements.map((warning, index) => (
                      <label
                        key={`a${index}`}
                        className="mt-2 flex items-start gap-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={draft.acknowledged.includes(warning.code)}
                          onChange={(e) =>
                            updateDraft(draft.key, {
                              acknowledged: e.target.checked
                                ? [...draft.acknowledged, warning.code]
                                : draft.acknowledged.filter(
                                    (code) => code !== warning.code,
                                  ),
                            })
                          }
                          className="mt-0.5 w-4 h-4 accent-[#17786F] shrink-0"
                        />
                        <span className="text-[12px] text-text-primary leading-relaxed">
                          {warning.message}
                        </span>
                      </label>
                    ))}
                  </div>

                  {/* Change — collapsed by default */}
                  <button
                    type="button"
                    onClick={() => setExpandedKey(isExpanded ? null : draft.key)}
                    className="shrink-0 text-[12px] font-bold text-brand hover:underline flex items-center gap-0.5 h-8"
                    aria-expanded={isExpanded}
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                    {isExpanded ? "Close" : "Change"}
                  </button>
                </div>

                {/* Editor — only for what we could not fill in */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-4 border-t border-border-soft pt-3">
                    {needsDose && (
                      <div>
                        <label
                          htmlFor={`dose-${draft.key}`}
                          className="block text-[12px] font-bold text-text-muted mb-1"
                        >
                          Dose from your label
                        </label>
                        <input
                          id={`dose-${draft.key}`}
                          value={draft.dose}
                          onChange={(e) =>
                            updateDraft(draft.key, { dose: e.target.value })
                          }
                          placeholder="e.g. 1 tablet"
                          className="w-full h-11 px-3 rounded-md border border-border-soft bg-white text-[14px] text-text-primary focus:outline-none focus:ring-1 focus:ring-brand"
                        />
                      </div>
                    )}

                    {needsTimes && (
                      <div>
                        <span className="block text-[12px] font-bold text-text-muted mb-1.5">
                          When do you take it?
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {TIME_PRESETS.map((preset) => (
                            <button
                              key={preset.value}
                              type="button"
                              onClick={() => toggleTime(draft.key, preset.value)}
                              className={`h-11 px-3.5 rounded-full text-[12px] font-bold border transition-colors ${
                                draft.clockTimes.includes(preset.value)
                                  ? "bg-brand text-white border-brand"
                                  : "bg-white text-text-muted border-border-soft hover:border-brand"
                              }`}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Time + duration editor, only when the user asked for it */}
                    {!needsTimes && (
                      <div>
                        <span className="block text-[12px] font-bold text-text-muted mb-1.5">
                          Times
                        </span>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {draft.clockTimes.map((time) => (
                            <button
                              key={time}
                              type="button"
                              onClick={() => removeTime(draft.key, time)}
                              className="h-11 px-3 rounded-full text-[12px] font-bold bg-brand text-white hover:bg-brand-dark transition-colors inline-flex items-center gap-1"
                            >
                              {clockLabel(time)}
                              <X className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => addTime(draft.key)}
                            className="h-11 px-3.5 rounded-full text-[12px] font-bold border border-border-soft text-text-muted hover:border-brand transition-colors"
                          >
                            + Add time
                          </button>
                        </div>

                        <span className="block text-[12px] font-bold text-text-muted mb-1.5">
                          For
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              updateDraft(draft.key, { durationDays: undefined })
                            }
                            className={`h-11 px-3.5 rounded-full text-[12px] font-bold border transition-colors ${
                              !draft.durationDays
                                ? "bg-brand text-white border-brand"
                                : "bg-white text-text-muted border-border-soft hover:border-brand"
                            }`}
                          >
                            Until I stop
                          </button>
                          {DURATION_OPTIONS.map((days) => (
                            <button
                              key={days}
                              type="button"
                              onClick={() =>
                                updateDraft(draft.key, { durationDays: days })
                              }
                              className={`h-11 px-3.5 rounded-full text-[12px] font-bold border transition-colors ${
                                draft.durationDays === days
                                  ? "bg-brand text-white border-brand"
                                  : "bg-white text-text-muted border-border-soft hover:border-brand"
                              }`}
                            >
                              {days} {days === 1 ? "day" : "days"}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* The one confirmation the whole flow exists for */}
          {readyToConfirm && !blocked ? (
            <label className="flex items-start gap-2.5 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={labelChecked}
                onChange={(e) => setLabelChecked(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-[#17786F] shrink-0"
              />
              <span className="text-[13px] text-text-primary leading-relaxed">
                I have checked these against my medicine label.
              </span>
            </label>
          ) : missingHint ? (
            <p className="text-[13px] text-text-muted leading-relaxed pt-1">
              {missingHint}
            </p>
          ) : null}
        </div>
      </Modal>
    </>
  );
};
