# MediLink — Medicine Reminder Experience: Design Concept

**Project:** MediLink (Next.js 16 App Router · mobile-first web)
**Scope:** The `/medications` reminder page and the reminder editor
**Status:** Implemented and verified in the browser
**Companion document:** `prds/MediLink-PRD-v3-Feature-Enhancements.md` §3.3

---

## 1. The problem with the page as it was

The reminder page was a catalogue. It listed every schedule as a card, sorted
alphabetically by medicine, with the next dose buried in the middle of a
technical block:

```
Napa
1 tablet · 08:30, 20:30
For 3 days
Next 8:30 PM · due in 42 min
[Pause] [🗑]
```

Three failures, in order of how much they hurt a patient:

| # | Failure | Consequence |
|---|---|---|
| **1** | **Nothing said *when*.** A list of medicines with clock times is not a schedule. The patient has to reconstruct the plan themselves. | People stop taking the medicine because they forget *which* reminder is for today. |
| **2** | **The next dose was not first.** The one thing worth acting on was buried mid-card. | The app gets opened, scrolled, and abandoned. |
| **3** | **Customisation was impossible.** Times were editable only inside the chat's reminder sheet, and there was no way to set a weekday, a date range, or a note. | A patient prescribed "Mondays and Thursdays" could not express it, so they either took the medicine every day or not at all. |

---

## 2. The concept in one sentence

> **A reminder page is a timeline, not a catalogue.** Lead with the next thing
> that must happen, show today as a schedule, and keep the catalogue below for
> the times you need to change something.

Everything below follows from that.

---

## 3. Information architecture

```
┌─────────────────────────────────────────────┐
│ 1. NEXT DOSE          — act now             │  1 hero, always first
│ 2. Enable browser alerts (only if not on)   │  contextual
│ 3. Missed doses        — only if any        │  contextual
│ 4. TODAY               — a timeline         │  always
│ 5. ALL REMINDERS       — the catalogue      │  always
│ 6. PAUSED              — collapsed          │  only if any
└─────────────────────────────────────────────┘
```

The order is a priority order, not a visual one. The page answers
"what do I do now?" before "what is my regimen?" and "what do I own?".

---

## 4. Wireframes

### 4.1 The page

```
┌──────────────────────────────────────────────┐
│ ←  My reminders  ②                           │  sticky header
├──────────────────────────────────────────────┤
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ NEXT DOSE                              │  │  hero — brand teal
│  │ Morning & night dose                   │  │  label, or the medicine name
│  │ 1 tablet · 8:30 PM                     │  │  dose + exact time
│  │ due in 2 hr 33 min · Take with food    │  │  countdown + the patient's note
│  │ ┌──────────────┐  ┌──────────────────┐  │  │
│  │ │   ✓ Taken    │  │      Skip        │  │  │  44 px targets
│  │ └──────────────┘  └──────────────────┘  │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ 🔔 Turn on browser alerts so reminders │  │  only when not granted
│  │    reach you when MediLink is in the   │  │
│  │    background.               Enable    │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  TODAY                            1 dose left│
│  ● 8:30 PM  Morning & night dose             │  timeline
│              1 tablet · Take with food   [✓] │  tap the tick to log it
│                                              │
│  ALL REMINDERS                                │
│  ┌────────────────────────────────────────┐  │
│  │ 💊 Morning & night dose            ›   │  │  whole card opens the editor
│  │    Every day · 8:30 AM and 8:30 PM      │  │  the schedule in words
│  │    1 tablet · Take with food            │  │  dose + note
│  │    Next 8:30 PM · due in 2 hr 33 min    │  │
│  │    [ Pause ]                            │  │
│  └────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────┐  │
│  │ 💊 Hydration top-up                ›   │  │
│  │    Mon, Wed, Fri, Sat · 8:00 AM, …      │  │
│  │    1 sachet · Take with food · Until 21 Nov 2026 │
│  │    [ Pause ]                            │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  PAUSED (1)                                   │
└──────────────────────────────────────────────┘
```

**Design decisions**

| Decision | Why |
|---|---|
| The **next dose** is a filled, coloured hero | It is the only element with a background colour — the eye finds it without reading. |
| The countdown is shown next to the **note** | "Take with food" is the actionable half of the reminder; it belongs beside the timer. |
| **Today** is a timeline, not cards | A vertical line with dots reads as a sequence. Cards read as a list of separate things. |
| Each dose in Today has an **icon-only tick** | 44 px tap target, no text. The row is already the label. |
| A reminder card **is** the schedule | "Every day · 8:30 AM and 8:30 PM" is one sentence. The patient never has to translate "2× daily" into a mental model. |
| The **note** sits on the dose line | `1 tablet · Take with food` — the two things you need at the moment you take it. |
| **Pause** is a text link, delete is not on the card | Deleting is destructive and irreversible; it lives in the editor where there is a confirmation step. Pausing is the reversible, everyday action. |
| Paused reminders are **collapsed** | A paused reminder is not part of today's plan; it should not compete for attention. |

### 4.2 The editor

Tapping a reminder card — or **Add a reminder** on an empty page — opens one
sheet. It has five sections, in the order a patient thinks about them.

```
┌──────────────────────────────────────────────┐
│ ✕                                     Delete  │
│ Edit reminder                               │
│                                              │
│ ┌────────────────────────────────────────┐   │
│ │ Hydration top-up                        │   │  live summary of what it
│ │ Mon, Wed, Fri, Sat · 8:00 AM, 12:00 PM… │   │  currently is
│ └────────────────────────────────────────┘   │
│                                              │
│ HOW MUCH                                     │
│ [ 1 sachet                            ]      │
│ This is what your doctor wrote. Keep it      │
│ exactly as on the label.                      │
│                                              │
│ HOW OFTEN                                    │
│ ┌──────────┐┌────────┐┌───────────────┐    │
│ │Every day ││ Weekly ││ Every N days  │    │  segmented, aria-pressed
│ └──────────┘└────────┘└───────────────┘    │
│                                              │
│  Sun Mon Tue Wed Thu Fri Sat                 │  only for "Weekly"
│  ▢   ▢   ▢   ▣   ▢   ▢   ▣                  │  44 px pills, aria-pressed
│  4 days a week                               │
│                                              │
│  ─  or, for "Every N days"  ─                │
│  ┌────┐   Every 3 days        ┌────┐        │  stepper
│  │ −  │   measured from the    │ +  │        │
│  └────┘   start date          └────┘        │
│                                              │
│ TIMES                                        │
│ ┌──────────────────────────────────────┐    │
│ │ 8:00 AM  ✕  12:00 PM  ✕  4:00 PM  ✕  │    │  removable chips
│ └──────────────────────────────────────┘    │
│ [ 08:00 ▾ ]              [ + Add time ]      │  native time input
│                                              │
│ DATES                                        │
│ Starts [ 21 Oct 2026 ▾ ]  Ends [ 21 Nov ▾ ]  │  native date inputs
│                                              │
│ REMINDER                                     │
│ Name [ Hydration top-up                 ]    │  the patient's own label
│ Note [ Take with food                  ]    │  the patient's own note
│ ┌────────────────┐┌──────────────────────┐   │
│ │ Take with food ││ Take after food      │   │  quick-fill presets
│ └────────────────┘└──────────────────────┘   │
│                                              │
│ ℹ Changes apply from the next dose onwards.  │
│   Always follow your prescription.           │
│                                              │
│         [ Delete ]   [ Save reminder ]        │
└──────────────────────────────────────────────┘
```

**Design decisions**

| Decision | Why |
|---|---|
| The **live summary card** at the top | The patient can see the effect of every change without scrolling back up. It also states the current value in words, so the form below is a *refinement*, not a blank page. |
| **Frequency is a segmented control** | Three options, one row, always visible. A dropdown would hide the choice. |
| The **day picker** appears only for "Weekly" | Asking about weekdays when the reminder is daily is noise. |
| The day picker is **S M T W T F S pills**, Sunday first | Matches the Bangladeshi calendar convention (Sunday = প্রথম বার). |
| Times are **removable chips** + one native time input | Native pickers are what the phone already does well; the chips make the current set editable in place. |
| **Note presets** fill the note field rather than being separate toggles | A patient taps "Take with food" and the note reads exactly that in the notification. One source of truth. |
| The hint is **informational, never blocking** | "Always follow your prescription" reminds without nagging. |
| **Save is disabled until the form is coherent** | Dose present, at least one time, and at least one weekday for a weekly reminder. Nothing is saved half-configured. |

---

## 5. The three requested customisations

### 5.1 Precise times and dates

| Control | Type | Stored as |
|---|---|---|
| Dose times | Native `time` input + removable chips | `clockTimes: string[]` (`"HH:mm"`) |
| Start date | Native `date` input | `startDate: "YYYY-MM-DD"` |
| End date | Native `date` input | `endDate: "YYYY-MM-DD"` |

The occurrence engine (`deriveOccurrences` in `src/lib/dose-schedule.ts`) honours
both: **no occurrence is ever generated before `startDate` or after `endDate`.**

### 5.2 Frequency

| Option | Stored as | Engine behaviour |
|---|---|---|
| **Every day** | `frequencyKind: "daily"` | Every calendar day |
| **Weekly** | `frequencyKind: "weekly"`, `daysOfWeek: number[]` | Only the chosen weekdays (0 = Sunday) |
| **Every N days** | `frequencyKind: "interval"`, `everyDays: number` | Only days where `(day − startDate) mod N === 0` |

The `everyDays` count is measured **from the start date**, so "every 3 days"
means the same thing on the 1st, the 4th, the 7th — not "every 3rd of each
month".

### 5.3 Custom label and note

| Field | Stored as | Appears in |
|---|---|---|
| Name | `label` | The card heading, the next-dose hero, the notification |
| Note | `note` | Under the dose, and beside the countdown in the hero |

The note falls back to the chat's `preparationNote` when the patient has not
written one, so a reminder created in the chat keeps its doctor's wording
("khali pete noy") unless the patient overrides it.

---

## 6. Accessibility

| Rule | Implementation |
|---|---|
| **Every control has an accessible name** | Native `<label for>` on every input; `aria-label` on the day pills; `aria-label` on the icon-only tick in the Today timeline. |
| **Selected state is never colour-only** | `aria-pressed` on the frequency segments, day pills and note presets, plus a filled/checked visual. |
| **44 px minimum touch target** | Every button in the editor is `h-11` (44 px) or larger. The day pills are 44 px squares. |
| **Heading structure** | `h1` for the page, `h2` for each section with `aria-labelledby` linking the section to its heading. |
| **Live regions** | The Today count and the section headings are plain text so a screen reader reads them in order; no `aria-live` spam on every minute tick. |
| **Colour contrast** | Body text uses the app's `text-text-primary` on `bg-bg-main` (≈12:1). Muted metadata uses `text-text-muted` (≈4.9:1). The hero is white on brand teal (≈5.1:1). |
| **Reduced motion** | No animation is used on the page beyond the existing 200 ms fades; the hero and cards do not move. |
| **Keyboard** | Everything is reachable in DOM order: frequency → days → times → dates → label → note → presets → save. The save button is last. |
| **Focus** | The editor uses the shared `Modal`, which traps focus and restores it to the invoking card on close. |

---

## 7. Data model

```ts
export type ReminderFrequency = "daily" | "weekly" | "interval";

export interface MedicationSchedule {
  // …unchanged v3 fields…

  /* ── patient customisation ── */
  frequencyKind?: ReminderFrequency;   // default "daily"
  daysOfWeek?: number[];               // 0 = Sunday, weekly only
  everyDays?: number;                  // interval only
  startDate?: string;                   // "YYYY-MM-DD"
  endDate?: string;                     // "YYYY-MM-DD"
  label?: string;                       // "Morning & night dose"
  note?: string;                        // "Take with food"
}
```

All fields are optional, so **every schedule created before this change keeps
working untouched** — a v3 reminder created in the chat behaves as "Every day"
with no dates, exactly as before.

---

## 8. Engineering notes

| Concern | Decision |
|---|---|
| **Formatting is pure and separate** | `src/lib/reminder-format.ts` holds every word the patient reads. It has no React dependency and is unit-tested. |
| **The engine, not the UI, enforces the rule** | `deriveOccurrences` filters by weekday, interval and date range. The UI cannot produce a notification on a day the patient excluded. |
| **Deterministic occurrence ids** | `scheduleId_ISO` — re-deriving a window can never create a duplicate, so a reload cannot fire the same dose twice. |
| **Forward-only derivation** | The window is anchored on *today*, not on the original start date, so a reminder created months ago still materialises its next doses. |
| **Finished courses stop** | A course whose end has passed derives no new occurrences. |
| **Degradation** | A corrupt entry (`"25:99"`) is dropped rather than taking the page down. |
| **Persistence** | Metadata in `localStorage`, hydrated before the first write. A pre-hydration write would persist the empty initial state and delete the patient's reminders — guarded by `useMedicationStore.hydrate()`. |

---

## 9. Verified in the browser

| Check | Result |
|---|---|
| Next dose hero with countdown and note | ✅ |
| Today timeline with tap-to-log | ✅ |
| Reminder cards showing the schedule in words | ✅ |
| Custom label persisted and shown | ✅ "Hydration top-up" |
| Custom note persisted and shown | ✅ "Take with food" |
| Weekly weekday picker | ✅ Mon, Wed, Fri, Sat |
| Every-N-days stepper | ✅ "Every 2 days" |
| Date range shown on the card | ✅ "Until 21 Nov 2026" |
| Engine honours weekdays | ✅ Orsaline-N fired only Wed + Fri while Napa fired daily |
| Engine honours the date range | ✅ no occurrence after the end date |
| Allergy block still disables saving | ✅ |

**115 unit tests** cover the wording helpers and the repetition rules,
including "a weekly reminder only fires on the chosen days", "never fires
before its start date" and "never fires after its end date".
