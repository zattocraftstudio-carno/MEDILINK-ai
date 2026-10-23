/* ═══════════════════════════════════════════════════════════════════
   MediLink — shared data models.

   Every interface in this file is the single source of truth for the
   shapes used across stores, API routes and components. The v3 feature
   pack (PRD §6.1) extends the original v2 models without changing the
   meaning of any existing field, so persisted localStorage state from
   v2 keeps working untouched.
   ═══════════════════════════════════════════════════════════════════ */

/* ────────────────────────────────────────────────────────────────────
   1. Catalog — medicines
   ──────────────────────────────────────────────────────────────────── */

export type RxClass =
  | "antibiotic"
  | "controlled"
  | "psychotropic"
  | "anticoagulant"
  | "other";

export interface MedicineRxPolicy {
  /** A photo/scan of the prescription is mandatory before checkout. */
  requireImage: boolean;
  /** Guard against bulk resale through the storefront. */
  maxQuantityPerOrder?: number;
  requirePrescriberName?: boolean;
  notes?: string;
}

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

  /* ── v3 ── */
  rxClass?: RxClass;
  rxPolicy?: MedicineRxPolicy;
  /** Brand/generic aliases used to match an OCR'd prescription. */
  rxAliases?: string[];
  /** Label-level frequency hint surfaced in the dose-timer UI. */
  labelFrequency?: string;
}

/* ────────────────────────────────────────────────────────────────────
   2. Catalog — doctors
   ──────────────────────────────────────────────────────────────────── */

export interface DoctorReview {
  userName: string;
  area: string;
  rating: number;
  comment: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  experienceYears: number;
  feeWhatsapp: number;
  feeVideo: number;
  whatsappNumber: string;
  area: string;
  city: string;
  latitude: number;
  longitude: number;
  rating: number;
  reviewCount: number;
  bio: string;
  education: string[];
  availability: string;
  reviews: DoctorReview[];
  photo?: string;
}

/* ────────────────────────────────────────────────────────────────────
   3. Catalog — hospitals (v3: emergency + ambulance metadata)
   ──────────────────────────────────────────────────────────────────── */

export interface Hospital {
  id: string;
  name: string;
  address: string;
  phone: string;
  latitude: number;
  longitude: number;

  /* ── v3 ── */
  /** Emergency Department direct line. `null` when not verified. */
  emergencyPhone?: string | null;
  emergency24x7?: boolean;
  /** Ambulance / emergency transport contact. `null` when not verified. */
  ambulancePhone?: string | null;
  ambulanceProvider?: string;
  ambulance24x7?: boolean;
  /** Accepts referrals from the national 999 ambulance service. */
  nationalEmergency?: boolean;
  traumaCenter?: boolean;
  icuAvailable?: boolean;
  emergencyBeds?: number;
  departments?: string[];
  facilities?: string[];
  /** Google Places ID, used to build precise Directions deep links.
   *  `null` is used by the hospital dataset for entries without a
   *  Google Maps place, so the type must allow it explicitly. */
  mapPlaceId?: string | null;
  directionsNote?: string;
}

/* ────────────────────────────────────────────────────────────────────
   4. Patient
   ──────────────────────────────────────────────────────────────────── */

export interface Profile {
  name: string;
  phone: string;
  area: string;
  diseases: string[];
  allergies: string[];
  bloodGroup?: string;
  ageGroup?: string;
  gender?: string;
  emergencyContact?: {
    name: string;
    phone: string;
  };
  consentGiven: boolean;
}

export type PlanType = "free" | "premium";

export interface Subscription {
  plan: PlanType;
  activatedAt?: string;
}

/* ────────────────────────────────────────────────────────────────────
   4b. Dr MediLink memory (v4)
   ──────────────────────────────────────────────────────────────────── */

export type MemoryCategory =
  | "condition"
  | "allergy"
  | "medication"
  | "personal"
  | "preference"
  | "other";

export type MemorySource = "user" | "auto" | "import";

/**
 * One durable fact the patient wants Dr MediLink to remember across chats.
 *
 * Memory is deliberately separate from `Profile`: a profile is structured
 * demographic data, while memory is a free-text, editable list the patient
 * can add to, import from another AI, or delete at any time.
 */
export interface MemoryItem {
  id: string;
  text: string;
  category: MemoryCategory;
  source: MemorySource;
  createdAt: number;
  updatedAt: number;
}

/**
 * User-defined persistent instruction or fact injected into every future conversation.
 * Unlike MemoryItem (which are extracted facts), MemoryPrompts are explicit instructions
 * the user wants the AI to always follow (e.g., "Always reply in Banglish", "I prefer
 * generic medicine names", "Remind me to take meds with food").
 */
export interface MemoryPrompt {
  id: string;                    // mpt_<uuid>
  text: string;                  // the instruction/fact
  isActive: boolean;             // can be toggled without deleting
  priority: number;              // injection order (higher = first)
  createdAt: number;
  updatedAt: number;
}

export function createMemoryPromptId(): string {
  const random =
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  return `mpt_${random}`;
}

/* ────────────────────────────────────────────────────────────────────
   5. Chat
   ──────────────────────────────────────────────────────────────────── */

export type ChatAction =
  | { type: "set_dose_reminder"; payload: unknown }
  | { type: "summarize_for_doctor" }
  | { type: "find_doctor"; specialty: string };

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;

  /* ── v3 ── */
  /** Attachments (scans, uploads) that belong to this message. */
  attachmentIds?: string[];
  /** Structured follow-up actions the assistant offers. */
  actions?: ChatAction[];
}

export interface ChatSession {
  id: string;
  title: string;
  modelUsed: "med1-flash" | "med1-pro";
  messages: ChatMessage[];
  createdAt: number;
}

/* ────────────────────────────────────────────────────────────────────
   6. Attachments — OCR'd prescriptions & test reports (v3)
   ──────────────────────────────────────────────────────────────────── */

export type AttachmentKind = "prescription" | "report" | "photo";
export type AttachmentSource = "ocr" | "manual";

export interface OcrMedicineLine {
  /** Exactly what was written on the document. Never paraphrased. */
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

export type OcrLabFlag = "H" | "L" | "N" | "A";

export interface OcrLabTest {
  name: string;
  value?: string;
  unit?: string;
  referenceRange?: string;
  flag?: OcrLabFlag;
  confidence: number;
}

export interface OcrLabReport {
  labName?: string;
  orderedBy?: string;
  reportDate?: string;
  tests: OcrLabTest[];
}

export type OcrDocument = OcrPrescription | OcrLabReport;

export interface OcrWarning {
  code: string;
  message: string;
}

export interface OcrResult {
  attachmentId: string;
  model: string;
  task: AttachmentKind;
  confidence: number;
  language: "bn" | "en" | "mixed" | "unknown";
  document: OcrDocument;
  rawText: string;
  warnings: OcrWarning[];
  processingMs: number;
}

export interface Attachment {
  /** Stable id, e.g. "att_7f3a91c2". */
  id: string;
  /** URL of the stored file (object URL, or a remote URL in production). */
  url: string;
  /** MIME type of the file — "image/jpeg", "image/png", "application/pdf". */
  type: string;
  /** Epoch ms — when the attachment was created. */
  timestamp: number;

  /* ── v3 ── */
  kind: AttachmentKind;
  source: AttachmentSource;
  fileName?: string;
  sizeBytes?: number;
  model?: string;
  ocrConfidence?: number | null;
  /**
   * Safety invariant S-2: machine output is never authoritative. The
   * patient must confirm the extraction before it is used downstream.
   */
  verified: boolean;
  messageId?: string | null;
  orderId?: string | null;
  document?: OcrDocument | null;
  rawText?: string;
  warnings?: OcrWarning[];
}

/* ────────────────────────────────────────────────────────────────────
   7. Consultation summary — chat → doctor handover (v3)
   ──────────────────────────────────────────────────────────────────── */

export type Severity = "mild" | "moderate" | "severe" | "unknown";

export interface SummarySymptom {
  name: string;
  severity: Severity;
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
  severity: Severity;
  redFlags: string[];
  currentMedications: SummaryMedication[];
  allergies: string[];
  knownConditions: string[];
  investigations: string[];
  suggestedSpecialty: string;
  patientQuestions: string[];
  confidence: number;
  /** True once the patient has edited the generated summary. */
  edited?: boolean;
  /** Attachments the patient chose to include with the handover. */
  attachmentIds?: string[];
}

/* ────────────────────────────────────────────────────────────────────
   8. Medication dose scheduling (v3)
   ──────────────────────────────────────────────────────────────────── */

export type DoseAnchor =
  | "morning"
  | "afternoon"
  | "evening"
  | "night"
  | "after_meal"
  | "before_meal"
  | "before_bed"
  | "interval";

export type DoseOccurrenceStatus =
  | "pending"
  | "taken"
  | "skipped"
  | "missed"
  | "snoozed";

export type DoseWarningCode =
  | "ALLERGY"
  | "DENGUE"
  | "NSAID_CONDITION"
  | "RX_ONLY"
  | "DUPLICATE"
  | "OVER_FREQUENCY"
  | "MISSED_DOSE_RULE";

export interface DoseWarning {
  code: DoseWarningCode;
  /** "block" cannot be acknowledged away; "acknowledge" can. */
  severity: "block" | "acknowledge" | "info";
  message: string;
  acknowledged: boolean;
}

export interface DoseOccurrence {
  /** Deterministic id: `${scheduleId}_${ISO-instant}` — the dedupe key. */
  id: string;
  scheduleId: string;
  scheduledAt: number;
  status: DoseOccurrenceStatus;
  actedAt?: number;
  notifiedAt?: number;
}

/**
 * How often a reminder repeats.
 *
 * `daily`    — every day (the default).
 * `weekly`   — on the chosen weekdays only.
 * `interval` — every N days.
 */
export type ReminderFrequency = "daily" | "weekly" | "interval";

export interface MedicationSchedule {
  id: string;
  createdAt: number;
  updatedAt: number;
  medicineId?: string;
  name: string;
  generic?: string;
  brand?: string;
  /** Verbatim from the chat or the label — never inferred (S-1). */
  dose: string;
  /** Human-readable frequency, e.g. "twice daily after meals". */
  frequency: string;
  timesPerDay: number;
  anchor: DoseAnchor;
  intervalHours?: number;
  /** User-editable wall-clock times, "HH:mm". */
  clockTimes?: string[];
  durationDays?: number;
  startAt: number;
  preparationNote?: string;
  warnings: DoseWarning[];
  source: "chat" | "attachment" | "manual";
  sourceMessageId?: string;
  status: "active" | "paused" | "completed" | "deleted";
  occurrences: DoseOccurrence[];
  lastNotifiedAt?: number;

  /* ── v3.1 — patient customisation of the reminder ── */
  /** How the reminder repeats. Defaults to "daily". */
  frequencyKind?: ReminderFrequency;
  /** 0 = Sunday … 6 = Saturday. Only used when frequencyKind is "weekly". */
  daysOfWeek?: number[];
  /** Repeat every N days. Only used when frequencyKind is "interval". */
  everyDays?: number;
  /** "YYYY-MM-DD" — the first day the reminder can fire. */
  startDate?: string;
  /** "YYYY-MM-DD" — the last day the reminder can fire. */
  endDate?: string;
  /** The patient's own name for this reminder, e.g. "Morning dose". */
  label?: string;
  /** The patient's own note, e.g. "Take with food". */
  note?: string;
}

/* ────────────────────────────────────────────────────────────────────
   9. Pharmacy — cart, orders, prescription verification (v3)
   ──────────────────────────────────────────────────────────────────── */

export interface CartItem {
  medicineId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  requiresRx?: boolean;
  /** Units the pharmacy had in stock when the item was added. */
  stock?: number;
}

export type PaymentMethod = "bkash" | "nagad" | "card" | "cod";

export type PrescriptionMatchBasis = "generic" | "brand" | "alias";

export interface PrescriptionMatchedItem {
  medicineId: string;
  matchedOn: PrescriptionMatchBasis;
}

export interface PrescriptionVerification {
  attachmentId: string;
  status: "matched" | "partial" | "manual-review" | "failed";
  matchedItems: PrescriptionMatchedItem[];
  /** Cart item names that were not found on the prescription. */
  unmatchedItems: string[];
  verifiedAt: string;
  pharmacistNote?: string;
}

export type OrderStatus =
  | "paid"
  | "pending"
  | "awaiting-verification"
  | "cancelled";

export interface Order {
  id: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  createdAt: string;
  /** Demo payment metadata (no real gateway is involved) */
  paymentMethod?: PaymentMethod;
  paymentMethodLabel?: string;
  transactionId?: string;
  status?: OrderStatus;

  /* ── v3 ── */
  prescription?: PrescriptionVerification;
  /** The doctor summary this order followed, if any. */
  summaryId?: string;
}

/* ────────────────────────────────────────────────────────────────────
   10. Maps — travel time (v3)
   ──────────────────────────────────────────────────────────────────── */

export type RouteSource = "routes-api" | "directions-api" | "osrm" | "haversine-fallback";

export interface RouteLeg {
  id: string;
  /** null when the API failed and we fell back to straight-line. */
  durationMinutes: number | null;
  durationText: string | null;
  distanceMeters: number | null;
  distanceText: string | null;
  /** Always present — the Haversine great-circle distance. */
  straightLineKm: number | null;
  trafficNote?: string;
  stale?: boolean;
}

export interface RouteMatrix {
  source: RouteSource;
  origin: { lat: number; lng: number };
  results: RouteLeg[];
  cachedAt: string;
}

/* ────────────────────────────────────────────────────────────────────
   11. Health Log & Vitals (v4)
   ──────────────────────────────────────────────────────────────────── */

export type HealthLogType =
  | "bp"
  | "sugar"
  | "temp"
  | "weight"
  | "pulse"
  | "spo2";

export interface HealthLogEntry {
  id: string;
  type: HealthLogType;
  systolic?: number;       // for BP (mmHg)
  diastolic?: number;      // for BP (mmHg)
  value?: number;          // for sugar (mmol/L), temp (°F), weight (kg), pulse (bpm), spo2 (%)
  context?: "fasting" | "post_meal" | "random" | "resting";
  measuredAt: number;      // timestamp (ms)
  note?: string;
}

/* ────────────────────────────────────────────────────────────────────
   12. Appointments & Reminders (v4)
   ──────────────────────────────────────────────────────────────────── */

export interface Appointment {
  id: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  type: "chat" | "video";
  date: string;       // YYYY-MM-DD
  time: string;       // HH:mm (e.g. "10:30")
  status: "upcoming" | "completed" | "cancelled";
  remind1DayBefore: boolean;
  remind1HourBefore: boolean;
  note?: string;
  fee: number;
  createdAt: number;
}

