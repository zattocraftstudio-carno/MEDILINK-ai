# MediLink — Feature Enhancement PRD & Technical Specification (v3.0)

**Project Name:** MediLink
**Version:** 3.0 (Feature pack on top of Master PRD v2.0 / Technical Architecture Spec v1.0)
**Date:** October 20, 2026
**Development Team:** Sylhet Robotics Club
**Target Platform:** Web (Mobile-First Responsive)
**Status:** Approved for build — implementation-ready

---

## 0. Document Control

### 0.1 Supersession Notice

| Source Document | Section | Status | Reason |
|---|---|---|---|
| `prds/MediLink_PRD_v2.md` | §5.1 — *"Text-only. **No image upload.**"* | **SUPERSEDED** | Image/OCR ingestion is now a first-class feature (F-1). Text-only constraint is lifted for the chat composer and pharmacy checkout. |
| `prds/MediLink_PRD_v2.md` | §5.2 — Pharmacy checkout steps | **AMENDED** | Checkout gains a conditional `prescription` step (F-4). |
| `prds/MediLink-Technical-Architecture-Spec.md` | §4.1 — `medicines.json` schema | **AMENDED** | `requiresRx` (already implemented) is extended with Rx classification + verification policy fields (§6.1.1). |
| `prds/MediLink-Technical-Architecture-Spec.md` | §4.3 — `hospitals.json` schema | **AMENDED** | Hospital model expanded with ED / ambulance / facility metadata (§6.1.3). |
| `prds/MediLink-Technical-Architecture-Spec.md` | §4.2 `doctors.json`, §12 Content Sheet | **UNCHANGED** | Doctor booking templates are extended at runtime, not restructured (§3.2.5). |
| `prds/MediLink-Technical-Architecture-Spec.md` | §2 — "No backend database" | **RETAINED (unchanged)** | No database is introduced. All new persistence uses IndexedDB (blob store) + Zustand `persist` (localStorage metadata). Next.js API routes act as **stateless proxies**, exactly like `/api/chat` already does. |

### 0.2 Non-Goals (Explicitly Out of Scope)

- No real payment gateway, no eRx (e-prescription) integration with DGDA, no insurer/claims API.
- No hospital bed-booking, no ambulance dispatch booking (the app **calls**, it does not dispatch).
- No server-side push-notification scheduler with guaranteed background delivery in v1 (see §3.3.5 Tier 2 for the upgrade path).
- No AI-generated clinical diagnosis, no AI-authored dosing regimen (see §0.3, non-negotiable).

### 0.3 Non-Negotiable Safety Invariants (Binding on All Features)

These invariants override any model output, any optimization, and any "nice UX" argument in this document.

| # | Invariant | Enforcement point |
|---|---|---|
| **S-1** | **MediLink never prescribes.** Dose reminders may only reproduce information already present in the user's own chat (or OCR-extracted from the user's own prescription), phrased as *"as stated in the prescription / as you described"*. No dose, duration, or frequency may ever be inferred by the model. | `src/lib/dose-schedule.ts` — `buildSchedule()` accepts only pre-parsed, user-confirmed values. |
| **S-2** | **OCR output is never authoritative.** Every extracted value is shown to the user with a confidence indicator and requires explicit confirmation before it is used in a doctor handover, an order, or a reminder. | `Attachment.verified` flag; UI lock until user confirms. |
| **S-3** | **Emergency UI never blocks on a network call.** Google Maps Directions may *enhance* the emergency screen; it may never gate, delay, or hide the SOS button, the `tel:` links, or the hospital list. | §5.2.5 Progressive enhancement contract. |
| **S-4** | **No message is ever sent without an explicit user tap.** WhatsApp handoffs always show a full preview before opening `wa.me`. No background sends in v1. | `src/lib/whatsapp.ts` — all generators return text; a single `openWhatsApp()` performs the launch. |
| **S-5** | **Allergy/condition warnings are hard gates, not soft text.** If a medication conflicts with a recorded allergy or condition, the reminder cannot be enabled until the user acknowledges the warning. | `src/lib/dose-schedule.ts` — `evaluateWarnings()`. |
| **S-6** | **PHI handling.** Uploaded prescriptions, lab reports, and clinical summaries are PHI. They are stored **locally only** in v1 (IndexedDB + localStorage). They are never sent to a third-party service other than the configured model provider (Tencent Vision) for extraction, and never included in analytics, logs, or error reports. | §6.5 Privacy & PHI controls. |

---

## 1. Executive Summary — The Problem Set

The v2 platform has four disconnected surfaces. A patient gets advice in one, books in another, buys medicine in a third, and needs emergency help in a fourth. Nothing carries over.

| # | Disconnection | Current state (verified in code) | Feature that closes it |
|---|---|---|---|
| **P-1** | **Consultation → continuity of care.** A patient's context lives only inside a chat session that ends at the browser tab. | `useChatStore` holds `ChatSession[]` in localStorage. `DoctorDetailDrawer.handleBookWhatsApp()` calls `generateDoctorBookingMessage()` with **no chat context at all** — `symptoms` is always `undefined` → renders literally `*Symptoms:* General Consultation`. | **F-2 Chat-to-Doctor Handover** (§3.2) |
| **P-2** | **Advice → adherence.** Dr MediLink names a medicine ("Napa", "Orsaline-N") in a sentence, and the sentence evaporates. Nothing reminds the patient to take it. | No medication model, no schedule, no notification code exists anywhere in `src/`. | **F-3 Medication Dose Scheduling** (§3.3) |
| **P-3** | **Paper → data.** Patients hold handwritten prescriptions and lab reports on paper. The app cannot read them. | `PRD v2 §5.1`: "Text-only. No image upload." | **F-1 OCR & Image Analysis** (§3.1) |
| **P-4** | **Rx medicines sold like candy.** `med_010` (Amoxicillin 500mg) carries `requiresRx: true`, but `CheckoutModal` never reads that flag. It renders an "Rx" badge on the card and then sells it to anyone. | `useCartStore.addItem` copies `requiresRx` onto the cart item — and **nothing downstream consumes it**. `CheckoutModal` has no branch on `requiresRx`. | **F-4 Prescription-Controlled Sales** (§4) |
| **P-5** | **"Nearest hospital" is a lie.** The emergency screen sorts by Haversine straight-line distance across a river-divided city. | `src/lib/geo.ts` → `calculateDistanceKm()` (great-circle). `HospitalList` renders `"1.4 km away"` as if it were travel distance. | **F-5 Enhanced Hospital Profiles + F-6 Real-World Navigation** (§5) |

**Product thesis:** MediLink v3 turns the platform from *"four separate tools that share a logo"* into *"one continuous care episode"* — a patient photographs a prescription, discusses it with Dr MediLink, gets a structured summary handed to a doctor over WhatsApp, gets dose reminders for what they were told to take, buys only what they are allowed to buy, and — in an emergency — gets to the *right* hospital by *road*, not by ruler.

---

## 2. Roles, Personas & Entitlements

| Actor | Definition | New capabilities granted by v3 |
|---|---|---|
| **Guest** (unregistered) | No profile in `localStorage` | F-1 image upload (2/day), F-2 summary generation, F-3 dose reminders, F-5/F-6 emergency navigation, F-6 Directions ETA. **No change** to emergency access (always free). |
| **Registered Patient** | Profile exists (`useProfileStore.profile !== null`) | All guest capabilities **plus** cross-feature linking: allergies/conditions from the profile feed the dose-warning engine (S-5) and the OCR allergy cross-check; the profile's allergies are auto-merged into the doctor handover summary. |
| **Premium Patient** | `useSubscriptionStore.isPremium()` | Unbounded OCR, unlimited summaries, unlimited dose schedules, full history of attachments/summaries/schedules, PDF export includes the clinical summary. |
| **Pharmacy Operator** | Human on WhatsApp, verifying Rx orders | Receives order messages carrying the prescription reference and the pharmacy-side verification workflow is documented in §4.5. |

**Plan gating summary**

| Capability | Free | Premium |
|---|---|---|
| Image upload + OCR | 2 documents/day | Unlimited |
| "Summarize for Doctor" | 3/day | Unlimited |
| Active dose schedules | 1 schedule, 3 medications | Unlimited |
| Prescription upload for Rx cart | Unlimited (required by law/ethics — never paywalled) | Unlimited |
| Directions API ETA | Unlimited | Unlimited |
| Attachment/summary history retention | Last 3 | All |

> **Design rule:** Emergency features (F-5, F-6), prescription upload (F-4) and Rx safety warnings are **never** paywalled. Charging a patient to see a drug allergy warning is unacceptable.

---

## 3. Feature Enhancements & Logic

### 3.1 F-1 — OCR & Image Analysis (Prescriptions & Test Reports)

**Model:** `tencent/hy-image-v3.5-preview` (Tencent Hunyuan vision model) — designated for **all** image understanding in MediLink: handwritten prescription OCR, printed lab-report OCR, medicine-list extraction, and prescriber/clinic metadata extraction.

> **Availability note (must be verified at build time).** `tencent/hy-image-v3.5-preview` was **not present in the OpenRouter model catalogue snapshot taken 2026-10-20** (only `tencent/hy3`, `hy3-preview`, `hy4-preview`, `hy-mt2-*`, `hunyuan-a13b-instruct` are listed, all `text->text`). The build must therefore treat the model ID as **configuration, not code**: the vision client (§6.2.1) is provider-agnostic and reads the model ID from `VISION_MODEL_ID`, defaulting to `tencent/hy-image-v3.5-preview`. If the ID is unavailable on the configured gateway, the client falls back per §6.2.1.4 and the UI shows an honest "image reading is temporarily unavailable" state — **never a fake result**. Track as Open Question **Q-1**.

#### 3.1.1 Supported document types

| Type key | User-facing label | Typical inputs | Primary extraction targets |
|---|---|---|---|
| `prescription` | Prescription | Handwritten Bangla/English prescriptions, printed OPD prescriptions | Prescriber name, clinic, date, patient name, medicine list (name + strength + dose + frequency + duration), handwritten notes |
| `report` | Test Report | CBC, lipid, LFT/KFT, thyroid, USG, X-ray reports, pathology invoices | Test name, result value, unit, reference range, flag (H/L/N), report date, lab name, advised-by |
| `auto` | Auto-detect | Anything | Model classifies into `prescription` or `report`; confidence recorded |

#### 3.1.2 End-to-end workflow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ 1. CAPTURE                                                                  │
│  ChatInput → 📎 button → <input type="file" accept="image/*" capture>        │
│  Mobile camera roll OR rear-camera capture (capture attr)                    │
└───────────────────────────────┬──────────────────────────────────────────────┘
                                ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ 2. CLIENT VALIDATION & NORMALISATION  (src/lib/attachments.ts)               │
│  • MIME ∈ {image/jpeg, image/png, image/webp, image/heic→jpeg}                │
│  • Size ≤ 8 MB raw                                                            │
│  • Decode via createImageBitmap → downscale longest edge ≤ 2000 px            │
│  • Re-encode JPEG q=0.85 (PNG only if transparency is meaningful)             │
│  • EXIF stripped (location/date metadata is PHI-adjacent — never persisted)   │
│  • Produce data URL + client-side SHA-ish id                                │
└───────────────────────────────┬──────────────────────────────────────────────┘
                                ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ 3. PERSIST BLOB → IndexedDB ("medilink_blobs")   [never localStorage]         │
│  Key = attachment id. localStorage holds only metadata (URL, type, timestamp)  │
└───────────────────────────────┬──────────────────────────────────────────────┘
                                ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ 4. EXTRACT → POST /api/vision/ocr  { image: dataUrl, task, hint? }            │
│  Server: 4a. validate size/MIME  4b. call tencent/hy-image-v3.5-preview       │
│          4c. enforce JSON-only output  4d. validate against schema           │
│          4e. repair-retry once on parse failure  4f. return typed result     │
└───────────────────────────────┬──────────────────────────────────────────────┘
                                ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ 5. RENDER — AttachmentCard in the chat thread                                │
│  thumbnail │ type badge │ confidence meter │ extracted key-value rows        │
│  [✓ Confirm & Use]  [✎ Edit]  [🔄 Re-scan]  [🗑 Remove]                     │
│  ⚠️ "Machine-read. Please check against the original before sharing."       │
└───────────────────────────────┬──────────────────────────────────────────────┘
                                ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ 6. USE — confirmed text is injected into Dr MediLink context as a             │
│  [DOCUMENT EXTRACT] block, clearly attributed as machine-extracted.          │
│  Never injected before the user confirms (S-2).                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### 3.1.3 Extraction contract (server-enforced schema)

`POST /api/vision/ocr` → `200 OK`

```jsonc
{
  "ok": true,
  "attachmentId": "att_7f3a91c2",
  "model": "tencent/hy-image-v3.5-preview",
  "modelLabel": "Hunyuan Vision v3.5 (preview)",
  "task": "prescription",            // auto-classified if not supplied
  "confidence": 0.82,                // 0..1, model-reported + heuristic-adjusted
  "language": "bn",                  // bn | en | mixed | unknown
  "document": {
    "doctorName": "ডাঃ মোঃ রফিকুল ইসলাম",
    "clinic": "Popular Diagnostic, Dhanmondi",
    "date": "2026-10-18",
    "patientName": "Karim Mia",
    "notes": "খাবারের পরে ৩ দিন",
    "medicines": [
      {
        "rawText": "Napa 500mg (1+0+1)",
        "brand": "Napa",
        "generic": "Paracetamol",
        "strength": "500mg",
        "dose": "1 tablet",
        "frequency": "twice daily, after meals",
        "timesPerDay": 2,
        "duration": "3 days",
        "confidence": 0.91
      }
    ]
  },
  "lab": {                            // only when task === "report"
    "labName": "Popular Diagnostic",
    "orderedBy": "Dr. R. Islam",
    "reportDate": "2026-10-18",
    "tests": [
      { "name": "Hemoglobin", "value": "11.2", "unit": "g/dL", "ref": "12.0-15.0", "flag": "L", "confidence": 0.97 }
    ]
  },
  "rawText": "…full extracted text, verbatim, for audit…",
  "warnings": [
    { "code": "LOW_CONFIDENCE", "message": "Handwriting was partly unclear — verify the dose line." }
  ],
  "processingMs": 4820
}
```

`POST /api/vision/ocr` → `200 OK` (degraded, not an error)

```jsonc
{ "ok": false, "reason": "unreadable", "message": "We could not read this image clearly. Try a brighter photo, keep the page flat, or enter the details manually.",
  "fallback": { "manualEntry": true } }
```

#### 3.1.4 Manual-entry fallback (mandatory, not optional)

Bangladesh reality: prescriptions are frequently written on torn paper, in faint pencil, or photographed at night. A product that dead-ends on a failed scan loses the user permanently.

When `ok:false`:
1. Show a **"Enter details manually"** form pre-structured for prescriptions (rows of: medicine / dose / frequency / duration) or reports (rows of: test / value / unit).
2. The manually entered document is stored as an `Attachment` with `source: "manual"` and `ocrConfidence: null`.
3. Manual entries carry the **same** downstream capability as OCR entries (doctor handover, Rx verification, dose reminders) — they are first-class documents, not a degraded fallback.

#### 3.1.5 Interaction rules

- **FR-1.1** The composer shows at most **one** pending attachment at a time (PRD v2 §4 "The Button Law" — no button clusters). Adding a second replaces the first after a confirm toast.
- **FR-1.2** The attachment preview is a **chip inside the composer**, not a separate panel: thumbnail + filename/type + remove ✕.
- **FR-1.3** Scanning is **asynchronous** — the user's text message streams immediately; the document scan runs in parallel and inserts its `AttachmentCard` when ready. The user is never blocked.
- **FR-1.4** If a scan fails, the chat message that carried it is **not deleted**; a retry action appears on the card.
- **FR-1.5** Attachments are **per-message**, referenced by id. `ChatMessage` gains `attachmentIds?: string[]`.
- **FR-1.6** A confirmed attachment can be **forwarded to a doctor** (§3.2) and **attached to an Rx order** (§4).
- **FR-1.7** The extracted text is added to the Dr MediLink context **only after confirmation**, and is always prefixed with a machine-extraction marker so the model treats it as data, not as an instruction.

```
[ATTACHED DOCUMENT — machine-extracted by MediLink OCR, patient-confirmed on 2026-10-20]
Type: Prescription | Prescriber: ডাঃ মোঃ রফিকুল ইসলাম | Date: 2026-10-18
Medicines: Napa (Paracetamol) 500mg, 1 tablet, twice daily after meals, 3 days
--- END DOCUMENT ---
```

#### 3.1.6 Data & API impact

| Item | Change |
|---|---|
| `src/types/index.ts` | Add `Attachment`, `AttachmentKind`, `OcrPrescription`, `OcrLabReport`, `OcrResult` (§6.1.4) |
| `src/stores/useAttachmentStore.ts` | **New.** Metadata in localStorage; blobs in IndexedDB (§6.3.2) |
| `src/lib/attachments.ts` | **New.** Normalisation, IndexedDB helpers, data-URL ↔ blob conversion |
| `src/app/api/vision/ocr/route.ts` | **New.** Server proxy (§6.2.1) |
| `src/components/chat/AttachmentCard.tsx` | **New.** Result renderer with confirm/edit/rescan |
| `src/components/chat/ChatInput.tsx` | **Modified** — 📎 button + attachment chip |
| `src/stores/useChatStore.ts` | **Modified** — `ChatMessage.attachmentIds` |

---

### 3.2 F-2 — Chat-to-Doctor Handover ("Summarize for Doctor")

#### 3.2.1 Problem statement

Today, booking a doctor via WhatsApp produces:

```
*MediLink Doctor Booking*
*Patient:* Karim Mia
*Phone:* 01712345678
*Doctor:* Dr. Nusrat Jahan
*Specialty:* General Physician
*Consultation Type:* WhatsApp Chat
*Fee:* ৳300
*Preferred Time:* Any time
*Symptoms:* General Consultation          ← always this
*Known Allergies:* None
*Plan:* Free
Please confirm my appointment.
```

The doctor receives **zero** clinical information about a patient who has already had a full consultation with Dr MediLink — possibly 15 messages of symptom detail, medication history, fever readings, and duration. The patient is asked to retype everything by hand, which is exactly where continuity is lost.

#### 3.2.2 The "Summarize for Doctor" feature

A single action, available in the chat, that converts an entire conversation into a structured, doctor-readable handover summary, which is then appended to the WhatsApp booking message.

**Entry points (exactly two, to respect The Button Law):**

| # | Location | Behaviour |
|---|---|---|
| **E-1** | ChatHeader action row (right side, next to the PDF export button) | "Summarize for Doctor" — summarises the **active session**. Disabled with tooltip when the session has < 2 user messages. |
| **E-2** | Doctor Detail Drawer → "Book via WhatsApp" | If a summary exists for the most recent chat session, a **toggle** appears in the drawer footer above the two buttons: `Include chat summary` (default **ON** when a summary exists). |

#### 3.2.3 Summary generation

`POST /api/consult/summary`

```jsonc
// Request
{ "sessionId": "s_8ac1", "messages": [{ "role": "user", "content": "…" }, …], "profile": { … } }

// Response
{
  "ok": true,
  "summaryId": "sum_41d9",
  "generatedAt": "2026-10-20T09:14:22.000Z",
  "chiefComplaint": "Fever with headache and body ache for 3 days",
  "symptoms": [
    { "name": "Fever", "severity": "moderate", "duration": "3 days", "detail": "102°F reported on day 2" },
    { "name": "Headache", "severity": "mild", "duration": "3 days", "detail": "" },
    { "name": "Body ache", "severity": "mild", "duration": "3 days", "detail": "" }
  ],
  "duration": "3 days",
  "severity": "moderate",
  "redFlags": [],
  "currentMedications": [
    { "name": "Napa (Paracetamol) 500mg", "dose": "1 tablet", "frequency": "twice daily after meals", "since": "2 days ago", "source": "chat" }
  ],
  "allergies": ["Penicillin"],
  "knownConditions": ["Asthma"],
  "medicationAlreadyTried": ["Paracetamol"],
  "investigations": [],
  "suggestedSpecialty": "General Physician",
  "patientQuestions": ["Is this viral or dengue?", "Do I need a CBC test?"],
  "confidence": 0.86,
  "sources": { "messageIds": ["m_1", "m_3", "m_5"] },
  "disclaimer": "Generated from your chat with Dr MediLink. Confirm before sharing."
}
```

**Extraction rules (server prompt + deterministic post-processing):**

| Field | Rule |
|---|---|
| `chiefComplaint` | ≤ 120 chars, one sentence, no diagnosis language. |
| `symptoms[]` | Only symptoms **explicitly stated by the patient**. Never infer. `severity` ∈ `mild\|moderate\|severe` — derived from the patient's own words ("ব্যথা অনেক" → severe) or a numeric scale they gave. If no severity signal → `unknown`. |
| `duration` | From the patient's own statement ("3 din", "২ সপ্তাহ"). Default `"not stated"`. |
| `currentMedications` | From the patient's messages **and** confirmed attachments. Each carries `source: "chat" \| "attachment"`. |
| `allergies` | **Union** of profile `allergies` and allergies mentioned in chat. Profile wins on conflicts. |
| `redFlags` | If any symptom matches the emergency patterns already implemented in `src/lib/model-router.ts` (`EMERGENCY_PATTERNS`), the summary must include it and the UI must show a red-flag banner with a 999 button. Never silently swallow a red flag. |
| `suggestedSpecialty` | Mapped to the exact `specialty` strings present in `doctors.json`. If no match, fall back to `"General Physician"`. |
| `confidence` | Model-reported, clamped 0–1. `< 0.6` ⇒ UI renders "Quick summary — please check" and requires a second confirmation before sending to a doctor. |

#### 3.2.4 User flow

```
[Chat screen]  ──"Summarize for Doctor"──▶
      │
      ▼
┌──────────────────────────────────────────────┐
│ Modal: "Summary for Dr. …"                   │
│  ┌────────────────────────────────────────┐  │
│  │ ⚠️ Red flag banner (if any)           │  │
│  ├────────────────────────────────────────┤  │
│  │ Chief complaint   [editable]          │  │
│  │ Symptoms          [editable list]     │  │
│  │ Duration          [editable]          │  │
│  │ Severity          [editable]          │  │
│  │ Current meds      [editable list]     │  │
│  │ Allergies         [editable list]     │  │
│  │ Suggested specialty: General Physician│  │
│  └────────────────────────────────────────┘  │
│  [ ] Attach my uploaded prescription         │
│  ─────────────────────────────────────────   │
│  [Copy]        [Find a doctor →]             │
└──────────────────────────────────────────────┘
      │
      ▼  (Find a doctor →)
┌──────────────────────────────────────────────┐
│ Doctor list filtered by suggestedSpecialty   │
│  [Dr. Nusrat Jahan — General Physician]     │
│  [Dr. Rahim — General Physician]             │
│  Each row: ONE "Book" button                 │
└──────────────────────────────────────────────┘
      │
      ▼  (Book →)
┌──────────────────────────────────────────────┐
│ WhatsApp preview modal (full message shown)  │
│  ONE button: "Open WhatsApp"                 │
└──────────────────────────────────────────────┘
```

**Editing rules:**
- Every extracted field is **editable inline**. The model proposes; the patient disposes.
- Adding a symptom/medication/allergy is a one-tap "+ Add".
- Removing a row is a ✕ on the row.
- The edited summary is what gets stored and what gets sent. The raw model output is never transmitted.
- Editing is mandatory for red-flag summaries (user must tick "I understand, send anyway" or cancel).

#### 3.2.5 WhatsApp message integration

`generateDoctorBookingMessage()` and `generateDoctorVideoBookingMessage()` gain one optional parameter:

```ts
generateDoctorBookingMessage({
  profile, doctor, selectedTime, symptoms, isPremium,
  clinicalSummary?: ConsultationSummary,   // NEW
  attachmentRef?: { label: string; type: string },  // NEW — text marker only, v1
})
```

The rendered message (full example):

```
*MediLink Doctor Booking*
*Patient:* Karim Mia
*Phone:* 01712345678
*Doctor:* Dr. Nusrat Jahan
*Specialty:* General Physician
*Consultation Type:* WhatsApp Chat
*Fee:* ৳300
*Preferred Time:* Any time
*Symptoms:* Fever with headache and body ache for 3 days
*Known Allergies:* Penicillin
*Plan:* Free
─────
*CHAT SUMMARY (prepared by Dr MediLink)*
*Chief complaint:* Fever with headache and body ache for 3 days
*Duration:* 3 days
*Severity:* Moderate
*Symptoms:*
• Fever — moderate (3 days)
• Headache — mild (3 days)
• Body ache — mild (3 days)
*Current medications:*
• Napa (Paracetamol) 500mg — 1 tab, twice daily after meals, since 2 days ago
*Allergies:* Penicillin
*Known conditions:* Asthma
*Attached document:* Prescription (patient can send the photo in this chat)
*Prepared by:* MediLink AI chat — please verify with the patient.
─────
Please confirm my appointment.
```

> **Note:** v1 sends a **text marker** that an attached prescription exists; it does not transmit the image over `wa.me` (no attachment support in the deep-link URL). The prescription image is shown in the MediLink app and can be shared manually. Upgrade path in §6.2.2.

#### 3.2.6 Storage

```ts
interface ConsultationSummary { /* §6.1.5 */ }
```

- Stored per `sessionId` inside `useChatStore` (`summaries: Record<sessionId, ConsultationSummary[]>`), keeping the last 3 (Free) / all (Premium).
- The **latest** summary is what E-2's toggle picks up. The drawer shows a mini-preview of exactly what will be sent.
- The summary is also attached to the resulting `Order` if the patient later buys the prescribed medicine (cross-feature continuity).

#### 3.2.7 Acceptance criteria

| # | Criterion |
|---|---|
| AC-2.1 | A 6-message chat containing "3 din dhore jor, matha betha, Napa khachhi" produces a summary with `chiefComplaint` mentioning fever + headache, `duration = "3 days"`, and `currentMedications` containing Napa. |
| AC-2.2 | The WhatsApp message contains a `CHAT SUMMARY` block with all six required clinical fields present. |
| AC-2.3 | Editing a field in the modal changes the WhatsApp message text exactly. |
| AC-2.4 | A chat containing "buke betha, shash nite kosto" produces a summary with a non-empty `redFlags[]` and the modal shows the 999 banner. |
| AC-2.5 | Profile allergy "Penicillin" appears in `summary.allergies` even if never mentioned in chat. |
| AC-2.6 | Free-plan user sees a soft limit notice after 3 summaries/day; Premium is unaffected. |

---

### 3.3 F-3 — Medication Dose Scheduling ("Dose Timer")

#### 3.3.1 Problem statement

Dr MediLink's Tier-1 guidance names specific products — *"Napa/Paracetamol 500mg label er niyome khete paren"*, *"khabor saline cholte thakuk"* — but says nothing about **when**. In the Bangladeshi context (heat, humidity, long commutes, fasting, shift work), a patient who is told "twice daily" frequently takes it twice in the evening and zero times in the morning. The advisory is lost within a day.

#### 3.3.2 Trigger & extraction

**Trigger:** after an assistant message finishes streaming, run `extractMedicationMentions(text)` (deterministic, local, regex + brand lexicon). If ≥1 medicine is mentioned, a **"Set dose reminders"** chip appears beneath that assistant message.

**Brand lexicon** (seeded from the brands already named in `src/lib/openrouter.ts` Tier 1, plus common BD OTC brands):

| Generic | Brands recognised |
|---|---|
| Paracetamol | Napa, Ace, paracetamol, ফেভারিল |
| ORS | Orsaline-N, ORS saline, খাবার স্যালাইন |
| Omeprazole / Esomeprazole | Sergel, Seclo, omeprazole |
| Antacid | Entacyd, Ambee |
| Cetirizine | Alatrol, cetirizine |
| Loratadine | Loratin |
| Zinc | Zinkid, zinc |
| Ibuprofen | Brufen, ibuprofen |
| Amoxicillin | Amoxicillin, Mox, amoxycillin |
|ORS + paracetamol combinations and saline sachets | — |

**Frequency grammar** parsed (Bangla, Banglish, English):

| Signal in text | Parsed schedule |
|---|---|
| "3 din", "3 days", "তিন দিন" | `durationDays = 3` |
| "1+0+1", "twice daily", "দুইবার" | `timesPerDay = 2`, anchor `morning + evening` |
| "0+1+0+1", "3 times", "তিনবার" | `timesPerDay = 3`, anchor `morning + afternoon + night` |
| "every 6 hours", "৬ ঘণ্টা পরপর" | `intervalHours = 6` |
| "after meal(s)", "খাবারের পরে" | `anchor = "after_meal"` (offset +30 min after meal times) |
| "before meal", "empty stomach", "খালি পেটে" | `anchor = "before_meal"` (−30 min) |
| "before bed", "রাতে ঘুমানোর আগে" | `anchor = "before_bed"` (22:00) |
| "sachet in half glass of water", "আধা গ্লাস পানিতে" | `preparationNote` (displayed only, never reworded) |

**Hard constraint (S-1):** the parser may only *locate* a schedule the user already has. If a medicine is named but no timing signal is present, the reminder is created with **no times** and the user must pick times manually. The system **never** invents "twice daily" for an unnamed frequency.

#### 3.3.3 The reminder sheet — one decision, pre-filled

**Design principle.** Dr MediLink has *already said* when to take the medicine. The
patient's job is not to re-enter that — it is to agree with it. So the sheet
**reads the details back, pre-filled**, and asks for exactly one answer: *"yes,
remind me"*.

**Only what is genuinely unknown is asked for.** A medicine the chat fully
described shows a read-only summary; the editor opens by itself only when the
dose or the frequency is missing, and only for that medicine.

```
┌──────────────────────────────────────────────────────┐
│ Set reminder                                           │
├──────────────────────────────────────────────────────┤
│  Napa (Paracetamol)                    [Change]        │
│  1 tablet · twice a day · from the chat                │
│  8:30 AM · 8:30 PM                                    │
│  for 3 days                                            │
├──────────────────────────────────────────────────────┤
│  Orsaline-N                            [Change]        │
│  1 sachet · 4 times a day · from the chat             │
│  8:00 AM · 12:00 PM · 4:00 PM · 8:00 PM               │
│  until you stop it                                     │
├──────────────────────────────────────────────────────┤
│  [ ] I have checked these against my medicine label.   │
│         [Not now]        [Set 2 reminders]             │
└──────────────────────────────────────────────────────┘
```

**Interaction budget (the redesign's whole point):**

| | Before | After |
|---|---|---|
| Text inputs to fill | 2 per medicine (dose, duration) | **0** — both are pre-filled and read-only |
| Required checkboxes | 2 per medicine (times + label) | **1** for the whole sheet |
| Time chips visible | 4 per medicine, always | 0 — only inside the collapsed "Change" editor |
| "What's still missing" checklist | up to 4 lines per medicine | **removed** — the hint names only what is actually missing |
| Interactions to set a reminder | 4–6 | **2** (tick the label box, tap the button) |

**Rules:**

- **FR-3.3.1** The dose, the times and the duration are **read-only by default**.
  The "Change" control opens the editor for that medicine alone.
- **FR-3.3.2** The editor **auto-opens** for a medicine whose dose or frequency
  the chat did not state. Only those fields are shown; everything else stays
  collapsed.
- **FR-3.3.3** One checkbox — *"I have checked these against my medicine label"* —
  covers the whole sheet. It appears only once every required field is present.
- **FR-3.3.4** With several medicines, each row has a checkbox to include or
  exclude it. The button reads `Set N reminders`.
- **FR-3.3.5** Warnings appear **only when they exist**, inline on the medicine
  they belong to. A blocking warning disables the button and states why.
- **FR-3.3.6** Times are shown in plain language (`twice a day`, `8:30 AM`), never
  as `1+0+1` or `08:30`.
- **FR-3.3.7** The duration defaults to **"until you stop it"** when the chat
  gave no course length. It is never guessed.
- **FR-3.3.8** The in-chat trigger is one line: `🔔 Remind me: Napa` + a
  **Set reminder** button. Nothing else is shown before the patient asks for it.

**Safety invariants after the redesign:**

- **S-1** is now satisfied by *explicit confirmation of visible values* rather
  than by re-typing them. The verbatim dose and times are on screen, and the
  patient must tick the label box before the reminder can be switched on. An
  unknown frequency is still **never** turned into a schedule.
- **L2** (the AI must not prescribe) is unchanged in substance: the dose is
  still the chat's *proposal*, it is labelled `from the chat`, it stays
  editable, and it is only persisted after the patient confirms it on screen.
  A dose the chat never stated is never pre-filled.
- **S-5** is unchanged: a blocking warning disables the button outright.

#### 3.3.4 Warning engine (`evaluateWarnings`)

| Rule | Trigger | Warning text |
|---|---|---|
| **W-1 Allergy** | Medicine generic or brand matches a profile allergy (fuzzy: `penicillin` ↔ `amoxicillin` via penicillin-class map) | "You recorded an allergy to **{x}**. This medicine is in the same family — **do not take it** until a doctor confirms." → **Hard block** unless a doctor-verified flag is set. |
| **W-2 Dengue** | Medicine is ibuprofen/aspirin/naproxen **and** dengue is suspected — an explicit "dengue" mention, or a dengue warning-sign cluster (bleeding gums, black stool, continuous vomiting, cold clammy skin) | "Dengue is possible here. Ibuprofen, aspirin and naproxen can worsen bleeding — use paracetamol and fluids only until a doctor advises otherwise." → **Hard block.** |
| **W-2b Dengue (advisory)** | Medicine is ibuprofen/aspirin/naproxen and the patient has a **fever only**, with no dengue sign | "You have a fever. If dengue turns out to be possible, ibuprofen and similar painkillers can worsen bleeding — paracetamol is the safer choice. Confirm with a doctor." → **Acknowledgement required** (not a block — a fever alone is not grounds for refusing a valid medicine). |
| **W-3 NSAID + condition** | ibuprofen/diclofenac + asthma/kidney disease/ulcer in profile | "Ibuprofen can worsen asthma attacks and stomach ulcers. Ask a doctor first." → **Acknowledgement required.** |
| **W-4 Rx medicine** | Medicine matches a `requiresRx: true` item in `medicines.json` | "This is a prescription medicine. Take it only as prescribed by your doctor." → **Acknowledgement required.** |
| **W-5 Duplicate therapy** | Two medicines with the same generic in one schedule | "You have two paracetamol products scheduled. Taking both may double your dose." → **Acknowledgement required.** |
| **W-6 Over-frequency** | `timesPerDay > 4` or `intervalHours < 4` | "That is more often than the usual label limit. Confirm with a pharmacist." → **Acknowledgement required.** |
| **W-7 Missed-dose rule** | Any reminder | "If you miss a dose, skip it — **never double up**." → Informational, always shown. |

**W-1 and W-2 are hard blocks** (S-5): the reminder cannot be enabled at all while the conflict stands.

#### 3.3.5 Notification delivery

Browser Notification API + a Service Worker, in three tiers:

| Tier | Mechanism | Reliability | When used |
|---|---|---|---|
| **T0 — In-app** | `useToast` + a "Next dose in 42 min" pill on the chat screen and a sticky bar on the pharmacy page | 100% while a tab is open | Always on, in addition to T1/T2 |
| **T1 — Web Notification** | `Notification.requestPermission()` + `new Notification()` | Works while the tab is open; on Android Chrome the tab must be alive | Default tier. Permission requested **only** from a user gesture (the "Enable reminders" button) |
| **T2 — Service Worker + Web Push** | `public/sw.js` → `registration.showNotification()`; true background delivery requires Web Push (VAPID) with a server-side scheduler | Survives tab close **only** with a push backend | **v1: in-browser scheduling via the Service Worker while the app is open**; **v1.5+ : Web Push with VAPID for closed-tab delivery** (see §6.2.5) |

**Permission UX (must not be a wall):**
1. User taps **"Enable reminders"** → the system permission dialog appears **immediately** in that gesture (browser requirement).
2. If denied → the schedule is still created and T0 in-app reminders continue. A quiet line reads "Browser alerts are off — we'll remind you inside MediLink."
3. If unsupported (iOS Safari < 16.4, Firefox) → T0 only; no error dialog.

**Notification content:**

```
🔔 Time for Napa (Paracetamol) 500mg
1 tablet — as stated in your chat.
Notes: khali pete noy (empty stomach)

[ Taken ]  [ Snooze 15 min ]  [ Skip ]
```

```
⚠️ Missed dose — Napa (Paracetamol) 500mg
Your 8:00 AM dose was not marked as taken. Follow the label rule — skip it, do not double up.
```

**Scheduling rules:**
- Doses are expanded into concrete timestamps for the next **72 hours** and persisted (`nextDoseAt`, `occurrences[]`).
- The scheduler re-arms on page load by recomputing from the stored schedule (stateless-safe).
- **No retrospective notifications**: a dose missed by more than 60 minutes is listed in the "Missed" tab, not pushed as a notification.
- **No double-dose protection**: the "Taken" action marks the occurrence; a second notification for the same occurrence is impossible (occurrence id is the dedupe key).
- If the browser clock jumps, occurrences are re-derived, not duplicated.
- **Snooze** re-fires in 15 minutes, once, then expires.
- **Take-off / stop**: a schedule can be paused (snoozes suppressed) or deleted.

#### 3.3.7 Reminder page and editor (v3.1)

The `/medications` page is a **timeline, not a catalogue**. Full concept and
wireframes: `prds/MediLink-Reminder-Experience-Design.md`.

```
1. NEXT DOSE        — the hero: label, dose, time, countdown, note, Taken/Skip
2. Enable alerts    — shown only when browser notifications are not granted
3. Missed doses     — shown only when there are any
4. TODAY            — a vertical timeline with a tap-to-log tick per dose
5. ALL REMINDERS     — one card each; the schedule in words, e.g.
                       "Mon, Wed, Fri, Sat · 8:00 AM, 12:00 PM, 4:00 PM and 8:00 PM"
6. PAUSED            — collapsed by default
```

**Patient customisation** (the editor sheet, opened by tapping a card):

| Control | Type | Stored as |
|---|---|---|
| Dose | text | `dose` |
| How often | segmented: Every day / Weekly / Every N days | `frequencyKind` |
| Days | Sun–Sat pills (weekly only) | `daysOfWeek` |
| Interval | stepper (every-N-days only) | `everyDays` |
| Times | native time input + removable chips | `clockTimes` |
| Starts / Ends | native date inputs | `startDate` / `endDate` |
| Name | text | `label` |
| Note | text + quick presets | `note` |

**FR-3.7.1** The **engine** enforces the patient's choices, not the UI:
`deriveOccurrences` never produces an occurrence on an excluded weekday,
before `startDate`, or after `endDate`.
**FR-3.7.2** Every new field is optional, so reminders created before v3.1
keep working unchanged (they behave as "Every day" with no date range).
**FR-3.7.3** The note falls back to the chat's `preparationNote` when the
patient has not written one, so a chat-created reminder keeps the doctor's
wording.

#### 3.3.8 Medication schedule data model

See §6.1.6 for the full `MedicationSchedule` / `DoseOccurrence` definitions.

#### 3.3.7 Acceptance criteria

| # | Criterion |
|---|---|
| AC-3.1 | A chat reply containing "Napa … twice daily … 3 days" produces a suggestion card with `timesPerDay=2`, `durationDays=3`, both timestamps editable. |
| AC-3.2 | A reply naming "Ibuprofen" while the chat contains "jor" and the profile has no dengue flag still produces W-2 only if a dengue keyword is present; with `dengueSuspected` absent it produces no hard block. |
| AC-3.3 | A reply naming "Amoxicillin" with profile allergy "Penicillin" produces W-1 hard block — the enable button is disabled and the schedule cannot be saved. |
| AC-3.4 | Enabling a schedule with notifications granted fires a Notification containing the medicine name and dose at the scheduled time (verified via DevTools). |
| AC-3.5 | Tapping "Taken" marks the occurrence; reloading the page does not re-fire the same occurrence. |
| AC-3.6 | A dose 2 hours in the past appears under "Missed" and does **not** fire a notification. |

---

## 4. F-4 — Pharmacy & Order Management: Prescription-Controlled Sales

### 4.1 Current state (gap analysis)

| Layer | Today | Problem |
|---|---|---|
| `src/data/medicines.json` | `med_010` Amoxicillin 500mg has `requiresRx: true` | Only one Rx item; no classification |
| `src/components/pharmacy/MedicineCard.tsx` | Renders a red `Rx` **Badge** | Informational only — cosmetic |
| `src/stores/useCartStore.ts` | `addItem()` copies `requiresRx` onto `CartItem` | Dead data — never read again |
| `src/components/pharmacy/CheckoutModal.tsx` | Steps: `details → payment → processing` | **No Rx branch at all.** Rx items are sold with no prescription. |
| `src/components/pharmacy/CartDrawer.tsx` | Cart + totals | No Rx state, no banner |
| `src/lib/whatsapp.ts` | `generatePharmacyOrderMessage()` | Order message has no prescription line |

**The compliance requirement is not optional.** Selling a prescription-only antibiotic without a prescription is illegal in Bangladesh (Drugs & Cosmetics Act / DGDA rules) and unsafe. The current code makes MediLink a non-compliant pharmacy.

### 4.2 Medicine model extension

```jsonc
{
  "id": "med_010",
  "name": "Amoxicillin 500mg",
  "genericName": "Amoxicillin",
  "category": "Infection",
  "price": 10.0,
  "stock": 50,
  "requiresRx": true,
  "rxClass": "antibiotic",              // NEW: antibiotic | controlled | psychotropic | anticoagulant | other | null
  "rxPolicy": {                        // NEW
    "requireImage": true,              // a photo/scan of the prescription is mandatory
    "maxQuantityPerOrder": 30,         // guards against bulk resale
    "requirePrescriberName": true,
    "notes": "Prescription must show prescriber name, date and signature."
  },
  "rxAliases": ["amoxycillin", "amox", "mox", "amoxil", "অ্যামোক্সিসিলিন"],  // NEW: OCR matching
  "image": "/assets/medicines/amoxicillin.jpg",
  "description": "Bacterial infection, throat infection, requires prescription."
}
```

Non-Rx medicines get `requiresRx: false, rxClass: null, rxPolicy: null`.

### 4.3 The "Prescription Verification Required" banner (mandatory UI)

**FR-4.1** Whenever the cart contains ≥1 item with `requiresRx: true`, a persistent banner must appear at the **top** of:
- the `CartDrawer` (desktop drawer / mobile bottom sheet), and
- the `CheckoutModal`.

**FR-4.2** The banner must be visible in the collapsed cart summary bar (`CartSummaryBar`) as an `Rx` badge with a count.

**FR-4.3** The banner text is exactly:

> **Prescription Verification Required**
> *Amoxicillin 500mg* is a prescription-only medicine. Upload a photo of your prescription to continue — our pharmacist will verify it before dispatch.

**FR-4.4** Banner visual specification:

| Property | Value |
|---|---|
| Container | `bg-accent-soft/60`, `border border-accent/30`, `rounded-[12px]`, `p-3.5` |
| Icon | `lucide-react` `FileWarning` (or `Rx`), `text-accent`, `w-4 h-4` |
| Title | `text-[14px] font-bold text-text-primary` |
| Body | `text-[13px] text-text-muted`, medicine names in `font-bold text-text-primary` |
| Action | ONE button — `variant="primary"`, label **"Upload Prescription"**, `leftIcon={<Upload />}` |
| Extra action | Text link only: "Why is this needed?" → opens a 3-line explainer modal |
| Aria | `role="alert"`, `aria-live="polite"` |

**FR-4.5** When a prescription has been uploaded but **not yet verified**, the banner changes to an *amber pending* state:

> **Prescription uploaded — awaiting verification**
> We've read your prescription. A pharmacist will confirm it before dispatch. You can still complete your order.

**FR-4.6** When the Rx items are matched against the OCR'd prescription, the banner shows the match result:

> **Prescription matched ✓** — Amoxicillin 500mg found on your prescription.

**FR-4.7** If an Rx cart item is **not** found on the uploaded prescription:

> ⚠️ *Metformin 500mg* was not found on the uploaded prescription. Remove it to continue, or request manual verification via WhatsApp.

**FR-4.8** The checkout's **Pay** button is `disabled` while `prescriptionStatus === "required"`. It is enabled in `matched` and `manual-review` states.

### 4.4 Checkout flow with prescription step

```
  Cart contains an Rx medicine
            │
            ▼
   ┌─────────────────────────┐   Banner visible in cart + checkout
   │ Rx Verification banner  │   [Upload Prescription] → opens file picker
   └─────────────────────────┘
            │ upload
            ▼
   ┌──────────────────────────────────────────────┐
   │ MODAL: "Prescription verification"            │
   │  Step 1 — Upload: drag/drop or pick image     │
   │  Step 2 — OCR (tencent/hy-image-v3.5-preview)  │
   │          progress: "Reading your prescription…"│
   │  Step 3 — Match result per cart item:          │
   │     ✓ Amoxicillin 500mg — matched              │
   │     ✗ <unmatched item> — not on prescription   │
   │  Step 4 — Confirm                             │
   │   [ ] I confirm this prescription is mine and  │
   │       the details above are correct            │
   │   [Ask a pharmacist on WhatsApp]  (secondary   │
   │    text link → manual verification path)       │
   └──────────────────────────────────────────────┘
            │ confirm
            ▼
   Checkout steps become: details → [prescription] → payment → processing
   Order saved with status "awaiting-verification"
   WhatsApp order message gains a Prescription line
```

### 4.5 Order + message model changes

```ts
interface PrescriptionVerification {
  attachmentId: string;
  status: "matched" | "partial" | "manual-review" | "failed";
  matchedItems: { medicineId: string; matchedOn: "generic" | "brand" | "alias" }[];
  unmatchedItems: string[];         // cart item names
  verifiedAt: string;
  pharmacistNote?: string;
}

interface Order {
  // …existing fields…
  prescription?: PrescriptionVerification;   // NEW
  status?: "paid" | "pending" | "awaiting-verification" | "cancelled";  // EXTENDED
}
```

`generatePharmacyOrderMessage()` gains a prescription block:

```
*MediLink Pharmacy Order*
*Name:* Karim Mia
*Phone:* 01712345678
*Address:* Dhanmondi, Dhaka
*Items:*
• Amoxicillin 500mg (x1) = ৳10.00
• Napa 500mg (x10) = ৳25.00
*Prescription:* Attached — Amoxicillin 500mg verified on prescription. Pharmacist confirmation required before dispatch.
*Subtotal:* ৳35.00
*Discount (0%):* -৳0.00
*Delivery:* ৳30
*Total:* ৳65.00
Please confirm availability and delivery time.
```

### 4.6 Pharmacy-side workflow (documented for the operator)

1. Operator receives the WhatsApp order containing the Prescription line.
2. Operator opens the MediLink order detail (or the customer sends the prescription photo in the same WhatsApp thread).
3. Operator confirms the medicine, dose, and quantity match the prescription.
4. Operator sets the order to "confirmed" in the pharmacy system and dispatches.
5. **MediLink (the app) never auto-approves an Rx order.** OCR matching is a *pre-check that reduces friction*, not an authorisation. The order status remains `awaiting-verification` until a human confirms (S-2).

### 4.7 Anti-abuse & edge cases

| Case | Behaviour |
|---|---|
| Cart has an Rx item and an OTC item | Only the Rx item requires the prescription. OTC items proceed normally. |
| User removes the Rx item | Banner disappears immediately; prescription step is skipped at checkout. |
| User adds an Rx item *after* uploading | Existing prescription is re-matched against the new cart; a mismatch re-opens the banner. |
| Same prescription reused for a different medicine later | The prescription is bound to the specific `Order.id`; reuse against a different order is blocked unless the new order contains only medicines that appear on that prescription. |
| `maxQuantityPerOrder` exceeded | Quantity is clamped in the cart UI with an inline note: "Prescription-only medicines are limited to 30 units per order." |
| OCR succeeds but finds nothing matching | `status: "failed"` → banner shows the "not found" state, and the manual/WhatsApp path is offered. |
| OCR fails entirely (unreadable) | `status: "failed"` → **manual entry fallback** (§3.1.4) or WhatsApp path. The checkout is never hard-blocked without an escape hatch. |
| Guest (unregistered) | Allowed to upload. The prescription is used for verification only; it is not attached to a profile. |

### 4.8 Acceptance criteria

| # | Criterion |
|---|---|
| AC-4.1 | Adding Amoxicillin to the cart immediately shows the "Prescription Verification Required" banner in both the cart drawer and the checkout modal. |
| AC-4.2 | The Pay button is disabled while no prescription is uploaded. |
| AC-4.3 | Uploading a prescription image containing "Amoxicillin 500mg" results in `status: "matched"` and the banner switching to the confirmed state. |
| AC-4.4 | Uploading a prescription image containing only "Napa" while Amoxicillin is in the cart results in `status: "partial"` and the Amoxicillin line is flagged as not on the prescription. |
| AC-4.5 | The saved order has `prescription.status` set and `status === "awaiting-verification"`. |
| AC-4.6 | The WhatsApp order message contains a `*Prescription:*` line when a prescription exists and no such line when it does not. |

---

## 5. F-5 / F-6 — Emergency Services & Navigation

### 5.1 F-5 — Enhanced Hospital Profiles

#### 5.1.1 Expanded `hospitals.json` schema

```jsonc
{
  "id": "hos_001",
  "name": "Dhaka Medical College Hospital",
  "address": "Secretariat Road, Dhaka",
  "phone": "02-55165088",                    // existing — general hotline
  "latitude": 23.7256,
  "longitude": 90.3987,

  // ── NEW: emergency & ambulance ──
  "emergencyPhone": "02-55165088",          // Emergency Department direct line
  "emergency24x7": true,
  "ambulancePhone": "01712345678",          // ambulance / emergency transport
  "ambulanceProvider": "City Ambulance Service",
  "ambulance24x7": true,
  "nationalEmergency": true,                // accepts 999 national emergency referrals

  // ── NEW: capability metadata ──
  "traumaCenter": true,
  "icuAvailable": true,
  "emergencyBeds": 12,
  "departments": ["Emergency", "Cardiology", "Orthopaedics", "Gynaecology", "Paediatrics", "Burn Unit"],
  "facilities": ["24/7 Pharmacy", "Blood Bank", "ICU", "Ambulance", "Dialysis", "MRI"],

  // ── NEW: maps ──
  "mapPlaceId": "ChIJ...",                  // optional Google Places ID
  "directionsNote": "Use the Emergency Department entrance on the north side."
}
```

Every hospital in `hospitals.json` must be populated with **verified** `emergencyPhone` and `ambulancePhone`. Where a number cannot be verified, the field is `null` and the UI renders the *general hotline* instead of inventing a number. **Never fabricate a phone number.**

#### 5.1.2 Hospital card UI

```
┌───────────────────────────────────────────────────────────────┐
│ Dhaka Medical College Hospital            [24/7 Emergency]    │
│ Secretariat Road, Dhaka                                       │
│                                                               │
│ 🏥 Emergency Dept   ☎ 02-55165088      [ Call Emergency ]     │
│ 🚑 Ambulance       ☎ 01712345678      [ Call Ambulance ]     │
│                                                               │
│ Straight-line 1.4 km  →  🚗 9 min (12.6 km)      [ Directions ]│
│ Trauma centre · ICU · Blood Bank · 24/7 Pharmacy               │
│ ⌄ Show departments & facilities                               │
└───────────────────────────────────────────────────────────────┘
```

**Requirements:**
- **FR-5.1** Click-to-Call: `<a href="tel:{emergencyPhone}">` — with `emergencyPhone` preferred, falling back to `phone`. The link MUST use a digits-only, `+`-prefixed international or local form that the dialler can use. A 2-tap confirm ("Call 999 / Call Dhaka Medical?") is **not** used — in an emergency, a confirmation tap is a delay. Single tap = call.
- **FR-5.2** The Emergency call button uses `variant="emergency"` (red) and is the **largest** control on the card. The Ambulance button is `variant="secondary"`.
- **FR-5.3** **Directions**: a Google Maps deep link that carries the user's current location as the origin:
  ```
  https://www.google.com/maps/dir/?api=1
    &origin={userLat},{userLng}
    &destination={hospitalLat},{hospitalLng}
    &destination_place_id={placeId?}
    &travelmode=driving
  ```
  Falls back to a destination-only link when the user's location is unknown. Always opens in a new tab with `rel="noopener noreferrer"`.
- **FR-5.4** The card expands (accordion, one tap) to show departments and facilities.
- **FR-5.5** The distance label must state its basis. Until the Directions API resolves: `"~1.4 km straight-line"`. After it resolves: `"🚗 9 min · 12.6 km"`. The two are **never** presented identically (this is the P-5 fix).
- **FR-5.6** The hospital list remains sorted by road travel time when available, falling back to straight-line distance during loading.

#### 5.1.3 Emergency actions (existing `EmergencyActions`)

The current grid is three cards — **Call 999** / **Send Location SMS** / **Share on WhatsApp** (`src/components/emergency/EmergencyActions.tsx`). v3 adds a fourth card, **Call Ambulance**, which calls the nearest hospital's `ambulancePhone` (falling back to the nearest hospital's `emergencyPhone`, then to `tel:999`).

**Layout rule:** the grid becomes `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`. The **Call 999** card stays first and stays visually dominant (it remains the largest, topmost element, unchanged per PRD v2 §5.4). The ambulance card uses the `emergency` colour treatment, not the `brand` treatment, so it reads as urgent without competing with 999.

> The ambulance card is a **dialer**, not a dispatcher. It must not display a booking form, a price, or an ETA promise — MediLink does not run an ambulance fleet.

### 5.2 F-6 — Real-World Navigation (Google Maps Directions API)

#### 5.2.1 Why replace/augment Haversine

Haversine gives the great-circle distance between two points: the shortest path over the earth's surface, **ignoring rivers, flyovers, one-way systems, traffic, ferry crossings, and the physical impossibility of driving across the Buriganga**. In Dhaka — a river city with 3 major bridges and severe congestion — a "1.4 km" straight-line rating can correspond to a 9 km, 40-minute road journey. Sorting emergency hospitals by Haversine can put the *wrong* hospital first. **Haversine is retained as an instant first-paint approximation and as the offline fallback, but never as the primary signal.**

#### 5.2.2 Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│ CLIENT (emergency/page.tsx)                                          │
│  1. Resolve location (geolocation → profile area → Dhaka fallback)   │
│  2. IMMEDIATELY sort hospitals by Haversine and render the list      │
│     with "straight-line" labels  ← zero-latency first paint          │
│  3. Fire GET /api/maps/route-matrix?origin=lat,lng                  │
│  4. On response, upgrade each card to "🚗 N min · X km" and re-sort   │
│  5. On error/timeout → keep Haversine, show a quiet note            │
└───────────────────────────────┬──────────────────────────────────────┘
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│ SERVER (/api/maps/route-matrix)                                      │
│  • Validates origin/destination                                       │
│  • Calls Google Maps Routes API (preferred) or Directions API        │
│  • One call for the whole hospital list (batch) — not N calls         │
│  • Applies an in-memory TTL cache (15 min) keyed on a rounded grid   │
│  • Returns a per-destination table + a `source` field                │
└───────────────────────────────┬──────────────────────────────────────┘
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│ GOOGLE MAPS                                                         │
│  Routes API: POST https://routes.googleapis.com/directions/v2       │
│  Headers: X-Goog-Api-Key, X-Goog-FieldMask                          │
│  Body: { origin, destination, travelMode: "DRIVE", routingPreference │
│          "TRAFFIC_AWARE" }                                           │
│  Fallback: GET https://maps.googleapis.com/maps/api/directions/json │
│            ?origin=&destination=&mode=driving&key=                  │
└──────────────────────────────────────────────────────────────────────┘
```

#### 5.2.3 API contract

`GET /api/maps/route-matrix?origin={lat,lng}&destinations={lat,lng|lat,lng|...}`

```jsonc
{
  "ok": true,
  "source": "routes-api",          // "routes-api" | "directions-api" | "haversine-fallback"
  "origin": { "lat": 23.8103, "lng": 90.4125 },
  "results": [
    {
      "id": "hos_001",
      "durationMinutes": 14,       // null on fallback
      "durationText": "14 mins",
      "distanceMeters": 12600,     // null on fallback
      "distanceText": "12.6 km",
      "straightLineKm": 1.4,
      "trafficNote": "Moderate traffic via Khilgaon flyover",
      "polyline": "…encoded…",     // optional, for a future map preview
      "stale": false
    }
  ],
  "cachedAt": "2026-10-20T09:20:11.000Z"
}
```

**Server behaviour:**
- **Batch, not per-hospital.** One Routes API `computeRouteMatrix` call for all hospitals → 1 request instead of N. This is both cheaper and faster.
- **Timeout: 3.5 s hard.** Exceeding it returns `source: "haversine-fallback"` with `durationMinutes: null`. The emergency screen is never held hostage (S-3).
- **Cache:** in-memory `Map` with TTL 15 min, key = `${origin.lat.toFixed(3)},${origin.lng.toFixed(3)}` (≈110 m grid) → avoids recomputation as the user drifts.
- **Quota guard:** max 1 batch call per origin per 15 min; a global per-minute cap to protect the free tier.
- **Key handling:** `GOOGLE_MAPS_API_KEY` is server-only. Never prefixed with `NEXT_PUBLIC_`.
- **Graceful degradation chain:** Routes API → Directions API → Haversine fallback → straight-line label + "Open in Google Maps" deep link (always available and always works).

#### 5.2.4 What changes in `src/lib/geo.ts`

`calculateDistanceKm()` is **kept** (used by the doctors page and as the fallback) but renamed in role, not in code:
- New `src/lib/maps.ts` exports `getRouteMatrix()`, `buildDirectionsUrl()`, `formatTravelTime()`.
- `src/lib/geo.ts` gains a deprecation comment: *straight-line only — never present as travel time.*
- The emergency page switches its sort to `durationMinutes ?? straightLineKm` with an explicit `distanceBasis: "road" | "straight"` per card.

#### 5.2.5 Progressive-enhancement contract (binding, per S-3)

| Guarantee | Implementation |
|---|---|
| The SOS button renders on first paint | It is above the hospital list and does not depend on any map API. |
| The hospital list is populated with **zero** network dependency | Haversine sort runs synchronously on mount. |
| Travel time never causes a layout jump that hides a control | The ETA slot has a fixed min-height; the label swaps in place. |
| A failure is visible but not alarming | A quiet inline line: "Live traffic unavailable — showing straight-line distance." |
| The Directions deep link always works | It is a plain URL built from coordinates, independent of any API response. |

#### 5.2.6 Acceptance criteria

| # | Criterion |
|---|---|
| AC-6.1 | With the Maps API reachable, each hospital card shows both the road time and the straight-line distance, clearly distinguished. |
| AC-6.2 | With the Maps API returning 500, the list still renders, sorted by straight-line distance, with the "Live traffic unavailable" note, and the Directions button still opens Maps. |
| AC-6.3 | The Directions deep link contains both `origin` (user location) and `destination` (hospital) plus `travelmode=driving`. |
| AC-6.4 | Two hospital rows sorted by road time differ from the Haversine order in at least one fixture test (proving the API actually drives the sort). |
| AC-6.5 | The API key never appears in any client-side bundle or `NEXT_PUBLIC_*` variable. |

---

## 6. Technical Specifications

### 6.1 Data Models

All types live in `src/types/index.ts` (the repo's single source of truth for interfaces).

#### 6.1.1 `Medicine` (extended)

```ts
export interface Medicine {
  id: string;
  name: string;
  genericName: string;
  category: string;
  price: number;
  stock: number;
  requiresRx: boolean;
  image: string;
  description: string;

  // ── NEW (v3) ──
  rxClass?: "antibiotic" | "controlled" | "psychotropic" | "anticoagulant" | "other";
  rxPolicy?: {
    requireImage: boolean;
    maxQuantityPerOrder?: number;
    requirePrescriberName?: boolean;
    notes?: string;
  };
  rxAliases?: string[];        // OCR/fuzzy-match aliases
  /** Standard label-level frequency hints used by the dose timer fallback UI */
  labelFrequency?: string;     // e.g. "1 tablet twice daily after meals"
}
```

#### 6.1.2 `Hospital` (extended)

```ts
export interface Hospital {
  id: string;
  name: string;
  address: string;
  phone: string;
  latitude: number;
  longitude: number;

  // ── NEW (v3) ──
  emergencyPhone?: string | null;
  emergency24x7?: boolean;
  ambulancePhone?: string | null;
  ambulanceProvider?: string;
  ambulance24x7?: boolean;
  nationalEmergency?: boolean;
  traumaCenter?: boolean;
  icuAvailable?: boolean;
  emergencyBeds?: number;
  departments?: string[];
  facilities?: string[];
  mapPlaceId?: string;
  directionsNote?: string;
}
```

#### 6.1.3 `Attachment` (new) — the `attachments` field

```ts
export type AttachmentKind = "prescription" | "report" | "photo";
export type AttachmentSource = "ocr" | "manual";

export interface Attachment {
  /** Stable id, e.g. "att_7f3a91c2" */
  id: string;
  /** URL of the stored file (object URL from IndexedDB, or a remote URL in prod) */
  url: string;
  /** MIME type of the file — "image/jpeg" | "image/png" | "application/pdf" */
  type: string;
  /** Epoch ms — when the attachment was created/ingested */
  timestamp: number;

  // ── NEW (v3) metadata ──
  kind: AttachmentKind;
  source: AttachmentSource;
  fileName?: string;
  sizeBytes?: number;
  model?: string;              // "tencent/hy-image-v3.5-preview"
  ocrConfidence?: number | null;
  /** S-2: has the patient confirmed the extraction? */
  verified: boolean;
  /** Which chat message it belongs to (null until attached) */
  messageId?: string | null;
  /** Which order it belongs to (null until attached) */
  orderId?: string | null;
  /** Extracted payload — shape depends on `kind` */
  document?: OcrPrescription | OcrLabReport | null;
  rawText?: string;
  warnings?: { code: string; message: string }[];
}
```

**Persistence split (mandatory):**

| Part | Store | Why |
|---|---|---|
| `Attachment` metadata (the fields above) | `useAttachmentStore` → `localStorage` key `medilink_attachments` | Small, serialisable, fast to list |
| The **binary** image | IndexedDB database `medilink_blobs`, object store `blobs`, key = `Attachment.id` | `localStorage` has a ~5 MB total quota — a single 2 MB prescription photo would evict the entire app's state. **This is a hard architectural constraint, not a preference.** |
| The `url` field | `URL.createObjectURL(blob)` regenerated on load | Object URLs die on reload; the store re-creates them from IndexedDB on hydration |

#### 6.1.4 OCR result types (new)

```ts
export interface OcrMedicineLine {
  rawText: string;
  brand?: string;
  generic?: string;
  strength?: string;
  dose?: string;
  frequency?: string;
  timesPerDay?: number;
  duration?: string;
  confidence: number;
}

export interface OcrPrescription {
  doctorName?: string;
  clinic?: string;
  date?: string;
  patientName?: string;
  notes?: string;
  medicines: OcrMedicineLine[];
}

export interface OcrLabTest {
  name: string;
  value?: string;
  unit?: string;
  referenceRange?: string;
  flag?: "H" | "L" | "N" | "A";
  confidence: number;
}

export interface OcrLabReport {
  labName?: string;
  orderedBy?: string;
  reportDate?: string;
  tests: OcrLabTest[];
}

export interface OcrResult {
  attachmentId: string;
  model: string;
  task: AttachmentKind;
  confidence: number;
  language: "bn" | "en" | "mixed" | "unknown";
  document: OcrPrescription | OcrLabReport;
  rawText: string;
  warnings: { code: string; message: string }[];
  processingMs: number;
}
```

#### 6.1.5 `ConsultationSummary` (new)

```ts
export interface SummarySymptom {
  name: string;
  severity: "mild" | "moderate" | "severe" | "unknown";
  duration?: string;
  detail?: string;
}

export interface SummaryMedication {
  name: string;
  dose?: string;
  frequency?: string;
  since?: string;
  source: "chat" | "attachment";
}

export interface ConsultationSummary {
  id: string;
  sessionId: string;
  createdAt: number;
  chiefComplaint: string;
  symptoms: SummarySymptom[];
  duration: string;
  severity: "mild" | "moderate" | "severe" | "unknown";
  redFlags: string[];
  currentMedications: SummaryMedication[];
  allergies: string[];
  knownConditions: string[];
  investigations: string[];
  suggestedSpecialty: string;
  patientQuestions: string[];
  confidence: number;
  /** Set when the patient edits the generated summary */
  edited?: boolean;
  /** Attachment ids the patient chose to include */
  attachmentIds?: string[];
}
```

#### 6.1.6 `MedicationSchedule` (new)

```ts
export type DoseAnchor = "morning" | "afternoon" | "evening" | "night" | "after_meal" | "before_meal" | "before_bed" | "interval";
export type DoseOccurrenceStatus = "pending" | "taken" | "skipped" | "missed" | "snoozed";

export interface DoseWarning {
  code: "ALLERGY" | "DENGUE" | "NSAID_CONDITION" | "RX_ONLY" | "DUPLICATE" | "OVER_FREQUENCY" | "MISSED_DOSE_RULE";
  severity: "block" | "acknowledge" | "info";
  message: string;
  acknowledged: boolean;
}

export interface DoseOccurrence {
  id: string;                 // deterministic: `${scheduleId}_${ISO-instant}`
  scheduleId: string;
  scheduledAt: number;        // epoch ms
  status: DoseOccurrenceStatus;
  actedAt?: number;
  notifiedAt?: number;
}

export interface MedicationSchedule {
  id: string;
  createdAt: number;
  updatedAt: number;
  medicineId?: string;                 // link to medicines.json when known
  name: string;
  generic?: string;
  brand?: string;
  dose: string;                        // verbatim from chat / label
  frequency: string;                   // human-readable, e.g. "twice daily after meals"
  timesPerDay: number;
  anchor: DoseAnchor;
  intervalHours?: number;
  clockTimes?: string[];               // ["08:00", "20:00"] user-editable
  durationDays?: number;
  startAt: number;
  preparationNote?: string;            // displayed verbatim, never reworded
  warnings: DoseWarning[];
  source: "chat" | "attachment" | "manual";
  sourceMessageId?: string;
  status: "active" | "paused" | "completed" | "deleted";
  occurrences: DoseOccurrence[];
  lastNotifiedAt?: number;
}
```

#### 6.1.7 `ChatMessage` (extended)

```ts
export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  attachmentIds?: string[];    // NEW
  /** Structured actions the assistant offers, e.g. set a dose reminder */
  actions?: ChatAction[];      // NEW
}

export type ChatAction =
  | { type: "set_dose_reminder"; scheduleDraft: unknown }
  | { type: "summarize_for_doctor" }
  | { type: "find_doctor"; specialty: string };
```

#### 6.1.8 `Order` (extended)

```ts
export interface Order {
  // …existing fields unchanged…
  prescription?: PrescriptionVerification;   // NEW
  summaryId?: string;                        // NEW — the doctor summary this order followed
  status?: "paid" | "pending" | "awaiting-verification" | "cancelled";  // EXTENDED
}

export interface PrescriptionVerification {
  attachmentId: string;
  status: "matched" | "partial" | "manual-review" | "failed";
  matchedItems: { medicineId: string; matchedOn: "generic" | "brand" | "alias" }[];
  unmatchedItems: string[];
  verifiedAt: string;
  pharmacistNote?: string;
}
```

#### 6.1.9 Store map (Zustand)

| Store | Key | Contents | Gating |
|---|---|---|---|
| `useAttachmentStore` *(new)* | `medilink_attachments` | `Attachment[]` (metadata) + blob helpers | Free: 3 retained; Premium: all |
| `useMedicationStore` *(new)* | `medilink_schedules` | `MedicationSchedule[]` | Free: 1 active schedule, 3 meds; Premium: unlimited |
| `useSummaryStore` *(new)* — or fold into `useChatStore` | `medilink_summaries` | `ConsultationSummary[]` | Free: 3/day; Premium: unlimited |
| `useChatStore` *(modified)* | `medilink_chat_history` | + `attachmentIds` on messages, + `summaries` map | existing |
| `useCartStore` *(modified)* | `medilink_cart` | + `prescription?: PrescriptionVerification` | existing |
| `useOrderStore` *(modified)* | `medilink_orders` | + `prescription`, `summaryId`, extended `status` | existing |

**Store shape (new stores):**

```ts
interface AttachmentState {
  attachments: Attachment[];
  addAttachment: (a: Attachment) => void;
  updateAttachment: (id: string, patch: Partial<Attachment>) => void;
  removeAttachment: (id: string) => void;
  getById: (id: string) => Attachment | undefined;
  getByMessageId: (messageId: string) => Attachment[];
  clear: () => void;
}

interface MedicationState {
  schedules: MedicationSchedule[];
  addSchedule: (s: MedicationSchedule) => void;
  updateSchedule: (id: string, patch: Partial<MedicationSchedule>) => void;
  deleteSchedule: (id: string) => void;
  markOccurrence: (scheduleId: string, occurrenceId: string, status: DoseOccurrenceStatus) => void;
  getUpcoming: () => DoseOccurrence[];
  getMissed: () => DoseOccurrence[];
}
```

### 6.2 API Integrations

#### 6.2.1 Tencent Vision — `tencent/hy-image-v3.5-preview`

**Endpoint:** `POST /api/vision/ocr` (Next.js route handler, `runtime = "nodejs"`).

**Why a server route:** the model credentials must never reach the browser. This mirrors the existing `/api/chat` proxy pattern exactly.

**Client configuration (`src/lib/vision.ts`, server-only):**

```ts
export const VISION_MODEL_ID = process.env.VISION_MODEL_ID || "tencent/hy-image-v3.5-preview";
export const VISION_BASE_URL = process.env.VISION_BASE_URL || "https://openrouter.ai/api/v1";
export const VISION_API_KEY = process.env.VISION_API_KEY || process.env.OPENROUTER_API_KEY;
```

**Request (OpenAI-compatible chat-completions shape):**

```jsonc
{
  "model": "tencent/hy-image-v3.5-preview",
  "messages": [
    { "role": "system", "content": "<extraction prompt — see below>" },
    { "role": "user", "content": [
        { "type": "text", "text": "Extract this document as JSON. Task: prescription." },
        { "type": "image_url", "image_url": { "url": "data:image/jpeg;base64,…" } }
    ]}
  ],
  "temperature": 0.1,          // low — we want faithful extraction, not creativity
  "max_tokens": 2000,
  "response_format": { "type": "json_object" }   // if the gateway supports it
}
```

**Extraction system prompt (contract):**

```
You are a medical-document OCR engine for the MediLink app (Bangladesh).
Read the attached image. It is a handwritten or printed medical document.

Return ONLY a JSON object. No prose, no markdown fences.

Schema:
{
  "task": "prescription" | "report",
  "confidence": 0.0-1.0,
  "language": "bn" | "en" | "mixed" | "unknown",
  "doctorName": string|null,
  "clinic": string|null,
  "date": "YYYY-MM-DD"|null,
  "patientName": string|null,
  "notes": string|null,
  "medicines": [
    { "rawText": string, "brand": string|null, "generic": string|null,
      "strength": string|null, "dose": string|null, "frequency": string|null,
      "timesPerDay": int|null, "duration": string|null, "confidence": 0.0-1.0 }
  ],
  "tests": [ { "name": string, "value": string|null, "unit": string|null,
      "referenceRange": string|null, "flag": "H"|"L"|"N"|"A"|null, "confidence": 0.0-1.0 } ],
  "rawText": string
}

Rules:
- Transcribe EXACTLY what is written. Never guess a medicine name, a dose or a number.
- If a value is illegible, use null — never a plausible default.
- Keep original Bangla/English spelling of medicine names.
- A doctor's handwriting shorthand ("1+0+1") is preserved verbatim in rawText AND parsed into timesPerDay.
- Set confidence LOW (below 0.5) for any field you are unsure about.
```

**Response handling (server-side):**
1. Parse the model output as JSON. Strip markdown fences if present.
2. Validate against the schema; drop unknown fields; coerce types; clamp confidence to 0–1.
3. On parse failure → **one** repair retry with `"Return valid JSON only. Previous output was invalid."`.
4. On second failure → `200 { ok:false, reason:"unreadable" }` (a degraded success, not a 500 — the client renders the manual-entry fallback).
5. Enforce a 25 s hard timeout and a 12 MB request-body cap.

**Fallback chain (per §3.1, Q-1):**

```
tencent/hy-image-v3.5-preview
  ↓ (model ID unavailable on the gateway / 404)
configured fallback model (VISION_FALLBACK_MODEL_ID, vision-capable)
  ↓ (no vision model available at all)
ok:false → manual entry form   ← never a fabricated result
```

**Cost & rate control:** `CHAT_RATE_LIMIT_PER_MIN` extends to the vision route via a separate `VISION_RATE_LIMIT_PER_HOUR` (default 60/hour/IP). Upload quota per plan (§2) is enforced client-side and server-side.

#### 6.2.2 WhatsApp

| Mode | Mechanism | Status |
|---|---|---|
| **Current (v2)** | `https://wa.me/{number}?text={urlencoded}` deep link, opens WhatsApp with a prefilled message | **Unchanged**, remains the primary path for all 5 templates |
| **Proposed (v3.1)** | WhatsApp Business API — Cloud API, `POST https://graph.facebook.com/v21.0/{phone-number-id}/messages` with `type: "template"` | Deferred; requires a verified Business account, a message template approval, and a server-side sender. |

**Proposed WhatsApp Business API contract (for the record):**

```jsonc
// POST /api/whatsapp/send
{ "to": "8801712345678", "template": "doctor_booking_summary", "parameters": ["Karim Mia", "Dr. Nusrat Jahan", "…summary…"] }
```

**Key constraint:** WhatsApp **Cloud API does not support sending free-form media to the doctor as part of a pre-approved template**, and template messages are limited to 1024 characters of parameters. Therefore:
- The clinical summary must be **condensed** to fit the template budget (the generator truncates symptom lists to 5 and adds "…+N more").
- Prescription images must be sent as a **separate** media message (`type: "image"`) *after* the template is accepted, or uploaded to a public URL and referenced in the text.
- **Every send must be user-initiated and previewed** (S-4).

**Templates to add/extend:**

| ID | Purpose | Change |
|---|---|---|
| `doctor_booking` | WhatsApp consultation booking | + `clinicalSummary` parameter (§3.2.5) |
| `doctor_video_booking` | Video consultation | + `clinicalSummary` parameter |
| `pharmacy_order` | Pharmacy order | + `prescription` parameter (§4.5) |
| `consultation_summary` | Standalone summary share (v3.1) | NEW — sends the summary to a doctor number without a booking |

#### 6.2.3 Google Maps

| API | Purpose | Endpoint | Env var |
|---|---|---|---|
| **Routes API** (preferred) | Batch travel time/distance for the hospital list | `POST https://routes.googleapis.com/directions/v2:computeRouteMatrix` | `GOOGLE_MAPS_API_KEY` |
| **Directions API** (fallback) | Per-route distance/duration | `GET https://maps.googleapis.com/maps/api/directions/json` | `GOOGLE_MAPS_API_KEY` |
| **Geocoding API** (optional) | Turn a free-text area into coordinates (better than the static `AREA_COORDINATES` map) | `GET https://maps.googleapis.com/maps/api/geocode/json` | `GOOGLE_MAPS_API_KEY` |
| **Places API** (optional, v3.1) | Autocomplete for hospital/doctor search | `POST https://places.googleapis.com/v1/places:autocomplete` | `GOOGLE_MAPS_API_KEY` |

Enable in the Google Cloud console: **Routes API**, **Directions API**, and (optional) **Geocoding API** + **Places API**.

**Deep links (no API key required, always available):**
```
https://www.google.com/maps/dir/?api=1&origin={lat},{lng}&destination={lat},{lng}&travelmode=driving
https://www.google.com/maps/search/?api=1&query={lat},{lng}&query_place_id={placeId}
https://www.google.com/maps/dir/?api=1&destination_place_id={placeId}&directionsmode=driving
```

#### 6.2.4 Browser Notification API

| API | Purpose |
|---|---|
| `Notification.requestPermission()` | Permission, requested **only** inside a user gesture |
| `new Notification(title, options)` | Tier-1 delivery while the app is open |
| `ServiceWorkerRegistration.showNotification()` | Tier-2 delivery, survives the tab closing |
| **Web Push** (`PushManager` + VAPID) | Tier-2.5 — true background delivery when the app is closed. Requires a push-subscription store and a server-side scheduler. **v3.1** |
| `setTimeout` / `setInterval` | Tier-0/1 scheduling inside the open app |

**Required env for v3.1 Web Push:** `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (client) + `VAPID_PRIVATE_KEY` (server) + `WEB_PUSH_SUBJECT`.

**Service Worker (`public/sw.js`) — minimal v1:**

```js
self.addEventListener("install", (e) => e.waitUntil(self.skipWaiting()));
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const target = clients.find((c) => c.url.includes("/chat"));
      return target ? target.focus() : self.clients.openWindow("/chat");
    })
  );
});
self.addEventListener("push", (event) => {
  // v3.1 — parse payload, call self.registration.showNotification(...)
});
```

`next.config.js` needs no change for the SW, but the registration must be gated to production or explicitly enabled:
```ts
if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
  navigator.serviceWorker.register("/sw.js");
}
```

#### 6.2.5 Integration summary table

| # | Integration | Provider | Transport | Auth | New env var(s) | Server-side? |
|---|---|---|---|---|---|---|
| 1 | **Vision / OCR** | `tencent/hy-image-v3.5-preview` | `POST /api/vision/ocr` → OpenAI-compatible `chat/completions` | Bearer API key | `VISION_MODEL_ID`, `VISION_BASE_URL`, `VISION_API_KEY` | ✅ Yes |
| 2 | **Chat LLM** | OpenRouter (existing) | `POST /api/chat` (streaming) | Bearer | *(existing)* | ✅ Yes |
| 3 | **Summary extraction** | OpenRouter (existing chat models) | `POST /api/consult/summary` | Bearer | *(existing)* | ✅ Yes |
| 4 | **WhatsApp** | `wa.me` deep link (v2) / WhatsApp Business Cloud API (v3.1) | URL / `graph.facebook.com` | none / `Bearer {token}` | `NEXT_PUBLIC_WHATSAPP_NUMBER`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_TEMPLATE_*` | v2 ❌ / v3.1 ✅ |
| 5 | **Maps — travel time** | Google Routes / Directions API | `POST /api/maps/route-matrix` | `X-Goog-Api-Key` / `key=` | `GOOGLE_MAPS_API_KEY` | ✅ Yes |
| 6 | **Maps — deep links** | Google Maps | Browser navigation | none | — | ❌ Client (no key needed) |
| 7 | **Maps — geocoding** (opt.) | Google Geocoding API | `GET /api/maps/geocode` | `key=` | `GOOGLE_MAPS_API_KEY` | ✅ Yes |
| 8 | **Notifications (in-app)** | Browser Notification API | `Notification` / SW | none | — | ❌ Client |
| 9 | **Notifications (push)** (v3.1) | Web Push + VAPID | `PushManager` | VAPID keys | `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | ✅ Partly |

#### 6.2.6 Environment variables (`.env.example` additions)

```bash
# ── Vision / OCR (Tencent Hunyuan Vision) ─────────────────────────
# Model used for prescription & report image understanding.
VISION_MODEL_ID=tencent/hy-image-v3.5-preview
# OpenAI-compatible gateway that serves the vision model.
VISION_BASE_URL=https://openrouter.ai/api/v1
# Key for the vision gateway. Falls back to OPENROUTER_API_KEY if unset.
VISION_API_KEY=
# Optional fallback model if the primary vision model is unavailable.
VISION_FALLBACK_MODEL_ID=
# Max vision calls per hour per IP (default 60).
VISION_RATE_LIMIT_PER_HOUR=60

# ── Google Maps ────────────────────────────────────────────────────
# Server-only. Enables Routes/Directions/Geocoding APIs.
GOOGLE_MAPS_API_KEY=
# Optional: default travel mode for hospital routing (DRIVE|DRIVING|WALK|BICYCLE)
GOOGLE_MAPS_TRAVEL_MODE=DRIVE

# ── WhatsApp Business API (optional, v3.1) ────────────────────────
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_TEMPLATE_DOCTOR_BOOKING=doctor_booking

# ── Web Push (optional, v3.1) ─────────────────────────────────────
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
WEB_PUSH_SUBJECT=mailto:dev@medilink.com.bd
```

> `GOOGLE_MAPS_API_KEY` **must not** be `NEXT_PUBLIC_`-prefixed. It is only ever used inside API route handlers.

### 6.3 Client-Side Architecture

#### 6.3.1 New/changed file map

| File | Status | Purpose |
|---|---|---|
| `src/types/index.ts` | Modify | All new interfaces (§6.1) |
| `src/data/medicines.json` | Modify | `rxClass`, `rxPolicy`, `rxAliases`, `labelFrequency` |
| `src/data/hospitals.json` | Modify | Emergency/ambulance/facility metadata |
| `src/lib/vision.ts` | **New** | Server-only Tencent Vision client + prompt + validation |
| `src/lib/attachments.ts` | **New** | Client-side image normalisation + IndexedDB blob store |
| `src/lib/dose-parse.ts` | **New** | Brand lexicon + frequency grammar parser |
| `src/lib/dose-schedule.ts` | **New** | Schedule expansion + warning engine + occurrence derivation |
| `src/lib/notifications.ts` | **New** | Permission, scheduling, SW registration, notification payloads |
| `src/lib/consult-summary.ts` | **New** | Summary prompt + schema validation + WhatsApp rendering |
| `src/lib/maps.ts` | **New** | Route-matrix client, Directions deep-link builder, formatting |
| `src/lib/whatsapp.ts` | Modify | + `clinicalSummary`, + `prescription` blocks |
| `src/lib/geo.ts` | Modify | Deprecation note; keep Haversine as fallback only |
| `src/stores/useAttachmentStore.ts` | **New** | Attachment metadata |
| `src/stores/useMedicationStore.ts` | **New** | Dose schedules |
| `src/stores/useChatStore.ts` | Modify | `attachmentIds`, `summaries` |
| `src/stores/useCartStore.ts` | Modify | `prescription` state |
| `src/stores/useOrderStore.ts` | Modify | Order fields |
| `src/app/api/vision/ocr/route.ts` | **New** | Vision proxy |
| `src/app/api/consult/summary/route.ts` | **New** | Summary proxy |
| `src/app/api/maps/route-matrix/route.ts` | **New** | Maps proxy + cache |
| `public/sw.js` | **New** | Service worker |
| `src/components/chat/ChatInput.tsx` | Modify | 📎 attach |
| `src/components/chat/AttachmentCard.tsx` | **New** | OCR result card |
| `src/components/chat/SummarizeModal.tsx` | **New** | Editable handover summary |
| `src/components/chat/ChatHeader.tsx` | Modify | "Summarize for Doctor" action |
| `src/components/chat/DoseReminderCard.tsx` | **New** | Suggested dose reminder |
| `src/components/medication/DoseTimerPanel.tsx` | **New** | Active schedules + upcoming doses |
| `src/components/pharmacy/PrescriptionBanner.tsx` | **New** | Rx banner |
| `src/components/pharmacy/PrescriptionUploadModal.tsx` | **New** | Upload + match UI |
| `src/components/pharmacy/CartDrawer.tsx` | Modify | Banner |
| `src/components/pharmacy/CartSummaryBar.tsx` | Modify | Rx badge |
| `src/components/pharmacy/CheckoutModal.tsx` | Modify | Prescription step + disabled Pay |
| `src/components/emergency/HospitalCard.tsx` | **New** | Enhanced card (replaces inline card in `HospitalList`) |
| `src/components/emergency/HospitalList.tsx` | Modify | Pass route data |
| `src/app/(main)/emergency/page.tsx` | Modify | Route-matrix fetch + progressive enhancement |
| `src/app/(main)/chat/page.tsx` | Modify | Attachments, summaries, dose cards |
| `src/app/(main)/pharmacy/page.tsx` | Modify | Prescription state |
| `src/app/(main)/doctors/page.tsx` | Modify | Include-summary toggle |
| `src/app/(main)/medications/page.tsx` | **New** | Dose Timer page (also linked from `MobileBottomNav`) |
| `src/lib/pdf-generator.ts` | Modify | Include the clinical summary + medication list in the PDF |

#### 6.3.2 IndexedDB blob store (`src/lib/attachments.ts`)

```ts
const DB_NAME = "medilink_blobs";
const STORE = "blobs";

export async function putBlob(id: string, blob: Blob): Promise<void>;
export async function getBlob(id: string): Promise<Blob | null>;
export async function deleteBlob(id: string): Promise<void>;
export async function listBlobIds(): Promise<string[]>;
```

```ts
export async function normaliseImage(file: File): Promise<{
  blob: Blob; dataUrl: string; width: number; height: number; sizeBytes: number;
}> {
  // 1. reject non-images
  // 2. createImageBitmap(file)
  // 3. scale to max edge 2000px (canvas)
  // 4. canvas.toBlob("image/jpeg", 0.85)
  // 5. strip EXIF by re-encoding (step 4 does this implicitly)
}
```

**Failure modes handled explicitly:**
| Condition | Behaviour |
|---|---|
| `createImageBitmap` unsupported | Fall back to `FileReader` + original bytes, warn the user about size. |
| Image > 12 MB after encoding | Reject with a clear message before any network call. |
| IndexedDB unavailable (private mode in some browsers) | Fall back to keeping the data URL in memory for the session only; the attachment is usable but not persisted. Show a quiet notice. |

### 6.4 Health, Safety & Privacy Engineering

| # | Control | Implementation |
|---|---|---|
| **HP-1** | No diagnosis from OCR | The extraction prompt forbids inference; the UI labels OCR output "machine-read"; the summary schema forbids diagnosis language (`chiefComplaint` describes, never names a condition). |
| **HP-2** | No AI dosing | The dose parser only locates user-stated schedules (S-1). The `MedicationSchedule` carries `source: "chat"` so the UI can say "as stated in your chat". |
| **HP-3** | Allergy hard-block | W-1/W-2 cannot be acknowledged away (S-5). |
| **HP-4** | Emergency escalation preserved | The red-flag detection reuses `EMERGENCY_PATTERNS` from `src/lib/model-router.ts` — one source of truth for what counts as an emergency. |
| **HP-5** | No PHI in logs | Server routes log **status codes and durations only** — never image bytes, extracted text, or patient content. Mirrors the existing rule in `/api/chat` ("logs the reason, never the content"). |
| **HP-6** | No PHI in analytics | No analytics SDK is present; none may be added without a PHI review. |
| **HP-7** | Local-first storage | All PHI stays in the browser (IndexedDB + localStorage) in v1. Clearing site data removes it completely. The register page must state this in the consent copy. |
| **HP-8** | Redaction before sharing | The WhatsApp summary excludes anything the user did not confirm, and the user sees the **exact** message text before it opens WhatsApp (S-4). |
| **HP-9** | Consent | Uploading a prescription implies consent to send that image to the configured model provider for extraction — stated in the upload modal. |

### 6.5 Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Performance** | Emergency page first paint < 1.5 s (no API dependency). Route matrix resolves < 3.5 s or falls back. OCR round trip < 12 s (25 s hard timeout). |
| **Bundle** | Vision/Maps code is server-side only — `tencent/hy-image-v3.5-preview` and `GOOGLE_MAPS_API_KEY` must not appear in the client bundle. Verified by grepping `.next/static` in the build gate. |
| **Offline** | Dose reminders, the emergency list, and the cart work offline (localStorage/IndexedDB). Maps and OCR degrade gracefully. |
| **Accessibility** | The Rx banner uses `role="alert"`. All new controls are ≥44 px tap targets with `aria-label`s. Notification permission prompts are keyboard-reachable. Contrast ≥ 4.5:1 for banner text. |
| **Mobile** | Camera capture via `capture="environment"`; the file picker filters `image/*`. The dose reminder card is usable one-handed. |
| **i18n** | All new UI strings are Bangla-first with English secondary, matching the existing bilingual pattern (the UI is currently English with Bangla AI output — new *system* strings must include a Bangla variant). |
| **Browser support** | Chrome/Edge/Safari/Firefox current 2 versions. Notification API is capability-detected; absence degrades to Tier 0. |

### 6.6 Build Plan (Gates)

Per PRD v2 §9 (max ~15 files per agent pass, human browser test between gates):

| Gate | Scope | Files (approx.) | Exit criteria | Status |
|---|---|---|---|---|
| **G-0** | Foundation: types, stores, `lib/` utilities, env template | 11 | `tsc --noEmit` clean; stores round-trip through localStorage; unit tests for the dose parser and warning engine pass | ✅ **Done** |
| **G-1** | Vision OCR: `/api/vision/ocr`, `vision.ts`, `attachments.ts` (IndexedDB), `AttachmentCard`, ChatInput attach button | 9 | A photographed prescription yields a structured result; a garbage image yields the manual-entry fallback; the API key is absent from the client bundle | ✅ **Done** — upload → scan → structured card → confirm → survives a reload; client bundle verified key-free |
| **G-2** | Chat-to-Doctor handover: `/api/consult/summary`, `consult-summary.ts`, `SummarizeModal`, ChatHeader action, WhatsApp templates | 8 | The generated WhatsApp message contains all six clinical fields; edited fields round-trip into the message | ✅ **Done** — The summary carries all six clinical fields and the preview is the exact message sent. |
| **G-3** | Dose Timer: `dose-parse.ts`, `dose-schedule.ts`, `notifications.ts`, `sw.js`, `DoseReminderCard`, `DoseTimerPanel`, medications page | 10 | A reminder fires a Notification at the scheduled minute; marking "Taken" prevents a re-fire after reload; W-1 hard-block verified | ✅ **Done** — Reminder card, warning gate and the /medications panel all verified in the browser. |
| **G-4** | Pharmacy Rx: `medicines.json` metadata, `useCartStore.prescription`, `PrescriptionBanner`, `PrescriptionUploadModal`, `CheckoutModal` step, order + message changes | 9 | AC-4.1 → AC-4.6 pass | ✅ **Done** — Banner copy matches §4.3 exactly; the Pay button is gated on the prescription. |
| **G-5** | Emergency + Maps: `hospitals.json` metadata, `/api/maps/route-matrix`, `maps.ts`, `HospitalCard`, emergency page wiring | 9 | AC-6.1 → AC-6.5 pass; the emergency page renders identically with the API blocked | ✅ **Done** — Straight-line and road time are worded differently; the Maps fallback degrades honestly. |
| **G-6** | Cross-feature integration + PDF + docs | 6 | Upload → summarise → book → buy → remind works end-to-end; PDF contains the summary; PRD/Content Sheet updated | ✅ **Done** — Print export now carries the handover summary and the dose reminders. |

### 6.7 Deviations from the original plan

| # | Planned | Actual | Why |
|---|---|---|---|
| 1 | `/medications` linked from `MobileBottomNav` | Linked from the chat sidebar and the reminder card instead | The bottom nav already carries 5 items; a 6th would break the 44 px tap-target rule the project's own accessibility audit (AX-007) requires. |
| 2 | `medicines.json` unchanged | Two prescription-only medicines added (`med_011` Ciprofloxacin, `med_012` Montelukast) | With a single Rx item the whole prescription workflow is indistinguishable from a normal checkout. |
| 3 | A single vision model | `tencent/hy-image-v3.5-preview` with a configurable fallback chain | The specified model is not on the current gateway (Q-1). The chain never fabricates a result — it degrades to the manual-entry path. |
| 4 | Summary generated by the model only | A deterministic fallback summariser runs when the model is unavailable | The handover must still work when the quota is exhausted — a doctor receives the symptoms, duration and medications that can be read straight out of the chat. |
| 5 | `hospitals.json` ambulance numbers | Left `null`; the ambulance button dials the national 999 service | No hospital ambulance line was independently verified. **A fabricated number in an emergency is worse than the national service** (Q-2). |

---

## 7. Open Questions

| # | Question | Owner | Needed by | Default if unanswered |
|---|---|---|---|---|
| **Q-1** | Is `tencent/hy-image-v3.5-preview` reachable on the configured gateway (and is it a *vision* model there)? It was absent from the OpenRouter catalogue snapshot of 2026-10-20. | Platform | Gate G-1 | Ship with `VISION_MODEL_ID` configurable + a documented fallback + the manual-entry path. **Never fabricate OCR output.** |
| **Q-2** | Where are the emergency department and ambulance numbers published for each of the 5 hospitals? | Ops | Gate G-5 | Leave `emergencyPhone: null` and fall back to the existing `phone`. No invented numbers. |
| **Q-3** | Does the pharmacy partner have a pharmacist available to verify Rx orders, and by what SLA? | Ops | Gate G-4 | Manual verification via WhatsApp (already in the flow). |
| **Q-4** | Are prescription photos stored in the cloud (with a signed URL) or strictly on-device after v1? | Product + Legal | Post-v3 | On-device (IndexedDB). Cloud storage requires a data-protection review. |
| **Q-5** | WhatsApp Business API approval timeline and template review status? | Growth | v3.1 | Continue with `wa.me` deep links. |
| **Q-6** | Should the free plan limit OCR to 2/day, and is a document-count limit acceptable UX for elderly users? | Product | Gate G-1 | Ship with 2/day + a visible counter. |
| **Q-7** | **OpenRouter free tier is capped at 50 requests/day per account.** Both the chat models and the vision fallback share that quota, so a busy demo can exhaust it mid-session. A 429 now degrades honestly ("we have reached our reading limit for now") rather than blaming the user's photo. Should MediLink add credits, or should the platform move the vision model to a gateway with a separate quota? | Platform + Product | Before G-3 | Ship the honest degradation message + the manual-entry path. |
| **Q-8** | **The chat page raced with persist rehydration**, creating an empty session on every load and orphaning the real conversation. Fixed by waiting for `persist.onFinishHydration` before creating a session. The same class of bug was found in the medication store — a pre-hydration write persisted the empty initial state and deleted the patient's reminders. Do the cart, profile and order stores need the same treatment? | Engineering | Gate G-4 | Apply the same guard to any store whose rehydrated value changes what the user sees on first paint. |
| **Q-9** | **Two under-dosing bugs were found while redesigning the reminder sheet.** (a) A message with two different regimens ("Napa … twice a day. Orsaline-N … 4 times daily") gave *both* medicines the message-level frequency, so the saline was scheduled twice a day instead of four. (b) Two rapid taps on the time chips read stale state and collapsed "Morning + Evening" into "Evening". Both are fixed and covered by regression tests. **Any future change to dose extraction must be re-checked against a multi-medicine message.** | Engineering | Closed | Shipped with the G-3 redesign. |

---

## 8. Traceability Matrix

| Requirement | Source | Feature | Gate |
|---|---|---|---|
| Image upload for prescriptions / reports | P-3 | F-1 §3.1 | G-1 |
| `attachments` field with URL, type, timestamp | Explicit | §6.1.3 | G-0/G-1 |
| Extract text + summarise medical data | Explicit | F-1 §3.1.3 | G-1 |
| "Summarize for Doctor" → symptoms, duration, severity, meds, allergies | Explicit | F-2 §3.2 | G-2 |
| Append summary to WhatsApp booking messages | Explicit | F-2 §3.2.5 | G-2 |
| Dose Timer from chat-identified meds (Napa, Orsaline-N) | Explicit | F-3 §3.3 | G-3 |
| Save dosage, timing, warnings | Explicit | §6.1.6, §3.3.4 | G-3 |
| Browser notifications | Explicit | §6.2.4 | G-3 |
| `requiresRx: true` prescription workflow at cart/checkout | Explicit | F-4 §4 | G-4 |
| "Prescription Verification Required" banner | Explicit | §4.3 | G-4 |
| Emergency Department numbers + ambulance contact | Explicit | F-5 §5.1 | G-5 |
| Click-to-Call | Explicit | FR-5.1 | G-5 |
| Google Maps "Directions" links | Explicit | FR-5.3 | G-5 |
| Replace/augment Haversine with Directions API for road travel time | Explicit | F-6 §5.2 | G-5 |
| `tencent/hy-image-v3.5-preview` for all image analysis/OCR | Explicit | §3.1, §6.2.1 | G-1 |
| WhatsApp Business API, Google Maps API, Browser Notification API, Tencent Vision | Explicit | §6.2 | G-1/G-3/G-5 |

---

**End of document.**
