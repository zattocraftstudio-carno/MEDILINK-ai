/* ═══════════════════════════════════════════════════════════════════
   MediLink — Vision client (SERVER ONLY).

   Model chain:
     1. VISION_MODEL_ID            — MiniMax M3.1 Flash (free)
     2. VISION_FALLBACK_MODEL_ID   — NVIDIA Nemotron 3.5 VL (free)
     3. a degraded "unreadable" result — never a fabricated one

   Used for every image-understanding task in MediLink: handwritten
   prescription OCR, printed lab-report OCR, and the medicine-list /
   prescriber extraction used by the Rx-verification flow.

   Text chat does NOT use this module. It is routed by model-router.ts,
   so changing the vision model can never change a chat answer.

   This module runs inside Next.js route handlers only. It must never
   be imported by a client component — the API key would be bundled.

   SAFETY INVARIANT S-2 (PRD §0.3)
   ------------------------------
   The model is asked to transcribe, never to infer. Unreadable fields
   must come back as `null`, and the pipeline returns a degraded
   "unreadable" result rather than a plausible guess.
   ═══════════════════════════════════════════════════════════════════ */

import type {
  AttachmentKind,
  OcrLabReport,
  OcrLabTest,
  OcrMedicineLine,
  OcrPrescription,
  OcrResult,
  OcrWarning,
} from "@/types";

/* ────────────────────────────────────────────────────────────────────
   Configuration
   ──────────────────────────────────────────────────────────────────── */

export const VISION_MODEL_ID =
  process.env.VISION_MODEL_ID || "nvidia/nemotron-3.5-super-vl:free";

export const VISION_FALLBACK_MODEL_ID =
  process.env.VISION_FALLBACK_MODEL_ID || "nvidia/nemotron-3.5-super-vl:free";

export const VISION_BASE_URL =
  process.env.VISION_BASE_URL || "https://openrouter.ai/api/v1";

export const VISION_API_KEY =
  process.env.VISION_API_KEY ||
  process.env.OPENROUTER_API_KEY_1 ||
  process.env.OPENROUTER_API_KEY ||
  "";

/** Hard ceiling for a single vision call. */
export const VISION_TIMEOUT_MS = 25_000;

/** Maximum accepted request payload (base64 data URL included). */
export const VISION_MAX_PAYLOAD_BYTES = 12 * 1024 * 1024;

/* ────────────────────────────────────────────────────────────────────
   Prompt
   ──────────────────────────────────────────────────────────────────── */

export const VISION_SYSTEM_PROMPT = `You are a medical-document OCR engine for the MediLink app (Bangladesh).
Read the attached image. It is a handwritten or printed medical document: a prescription, a diagnostic test report, or a pharmacy invoice.

Return ONLY a JSON object. No prose, no markdown fences, no explanation.

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
  "tests": [
    { "name": string, "value": string|null, "unit": string|null,
      "referenceRange": string|null, "flag": "H"|"L"|"N"|"A"|null, "confidence": 0.0-1.0 }
  ],
  "rawText": string
}

Rules:
- Transcribe EXACTLY what is written. Never guess a medicine name, a dose, a number or a date.
- If a value is illegible or absent, use null. Never supply a plausible default.
- Keep the original spelling of medicine names, including Bangla brand names.
- A doctor's shorthand such as "1+0+1" is preserved verbatim in rawText AND parsed into timesPerDay.
- Flag values: "H" high, "L" low, "N" normal, "A" abnormal.
- Set confidence BELOW 0.5 for any field you are unsure about.
- rawText must contain the full visible text of the document, line by line.`;

function buildUserPrompt(task: AttachmentKind | "auto"): string {
  if (task === "prescription") {
    return "Extract this prescription as JSON. Task: prescription.";
  }
  if (task === "report") {
    return "Extract this test report as JSON. Task: report.";
  }
  return "Classify this document (prescription or report) and extract it as JSON.";
}

/* ────────────────────────────────────────────────────────────────────
   Raw request
   ──────────────────────────────────────────────────────────────────── */

export interface VisionRequest {
  /** A `data:image/jpeg;base64,...` URL or an https URL. */
  imageUrl: string;
  task?: AttachmentKind | "auto";
  attachmentId: string;
}

interface RawModelResult {
  text: string;
  model: string;
}

/**
 * Pulls the JSON object out of a model reply.
 *
 * Models routinely wrap JSON in markdown fences, prepend a sentence
 * ("Here is the extraction:") or prepend a BOM. None of that is a
 * reason to throw away a perfectly good extraction.
 */
function extractJsonObject(text: string): string {
  let cleaned = text.replace(/^\uFEFF/, "").trim();

  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```[a-zA-Z0-9_-]*\s*/, "")
      .replace(/```\s*$/, "")
      .trim();
  }

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end > start) {
    cleaned = cleaned.slice(start, end + 1);
  }

  return cleaned;
}

/**
 * Escapes raw control characters that appear INSIDE JSON string
 * literals.
 *
 * Some vision models emit a literal newline inside a value, e.g.
 *   "rawText": "Napa 500
 *   mg"
 * which is invalid JSON even though the intent is obvious. Valid
 * escape sequences (`\"`, `\\`, `\n`, `\u1234`, …) are copied through
 * untouched, so well-formed JSON is never altered.
 */
export function escapeControlCharsInStrings(text: string): string {
  let out = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const code = ch.charCodeAt(0);

    if (!inString) {
      out += ch;
      if (ch === '"') inString = true;
      continue;
    }

    if (escaped) {
      out += ch;
      escaped = false;
      continue;
    }

    if (ch === "\\") {
      out += ch;
      escaped = true;
      continue;
    }

    if (ch === '"') {
      out += ch;
      inString = false;
      continue;
    }

    if (code < 0x20) {
      if (ch === "\n") out += "\\n";
      else if (ch === "\r") out += "\\r";
      else if (ch === "\t") out += "\\t";
      else out += `\\u${code.toString(16).padStart(4, "0")}`;
      continue;
    }

    out += ch;
  }

  return out;
}

async function callVisionModel(
  imageUrl: string,
  task: AttachmentKind | "auto",
  modelId: string,
  extraInstruction?: string,
): Promise<RawModelResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), VISION_TIMEOUT_MS);

  try {
    const response = await fetch(`${VISION_BASE_URL.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${VISION_API_KEY}`,
        "HTTP-Referer": "https://medilink.com.bd",
        "X-Title": "MediLink Bangladesh",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: modelId,
        messages: [
          { role: "system", content: VISION_SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: extraInstruction
                  ? `${buildUserPrompt(task)}\n${extraInstruction}`
                  : buildUserPrompt(task),
              },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Vision model ${modelId} failed (${response.status}): ${detail.slice(0, 300)}`);
    }

    const payload = await response.json();
    const text: unknown = payload?.choices?.[0]?.message?.content;

    if (typeof text !== "string" || !text.trim()) {
      throw new Error(`Vision model ${modelId} returned no content.`);
    }

    return { text, model: modelId };
  } finally {
    clearTimeout(timer);
  }
}

/* ────────────────────────────────────────────────────────────────────
   Response validation
   ──────────────────────────────────────────────────────────────────── */

function clamp01(value: unknown, fallback = 0): number {
  const n = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.max(0, Math.min(1, n));
}

function str(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

function num(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function parseMedicines(raw: unknown): OcrMedicineLine[] {
  if (!Array.isArray(raw)) return [];
  const lines: OcrMedicineLine[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const rawText = str(record.rawText) ?? str(record.brand) ?? str(record.generic);
    if (!rawText) continue;

    lines.push({
      rawText,
      brand: str(record.brand),
      generic: str(record.generic),
      strength: str(record.strength),
      dose: str(record.dose),
      frequency: str(record.frequency),
      timesPerDay: num(record.timesPerDay),
      duration: str(record.duration),
      confidence: clamp01(record.confidence, 0.5),
    });
    if (lines.length >= 30) break;
  }
  return lines;
}

function parseTests(raw: unknown): OcrLabTest[] {
  if (!Array.isArray(raw)) return [];
  const tests: OcrLabTest[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const name = str(record.name);
    if (!name) continue;

    const flagRaw = str(record.flag)?.toUpperCase();
    const flag =
      flagRaw === "H" || flagRaw === "L" || flagRaw === "N" || flagRaw === "A"
        ? flagRaw
        : undefined;

    tests.push({
      name,
      value: str(record.value),
      unit: str(record.unit),
      referenceRange: str(record.referenceRange),
      flag,
      confidence: clamp01(record.confidence, 0.5),
    });
    if (tests.length >= 100) break;
  }
  return tests;
}

export interface ParsedVisionPayload {
  task: AttachmentKind;
  confidence: number;
  language: "bn" | "en" | "mixed" | "unknown";
  doctorName?: string;
  clinic?: string;
  date?: string;
  patientName?: string;
  notes?: string;
  medicines: OcrMedicineLine[];
  tests: OcrLabTest[];
  rawText: string;
}

/** Parses and sanitises the model's JSON output. Throws on invalid JSON. */
export function parseVisionPayload(text: string): ParsedVisionPayload {
  const json = escapeControlCharsInStrings(extractJsonObject(text));
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error("Vision model did not return valid JSON.");
  }

  if (!data || typeof data !== "object") {
    throw new Error("Vision model returned a non-object payload.");
  }

  const record = data as Record<string, unknown>;
  const medicines = parseMedicines(record.medicines);
  const tests = parseTests(record.tests);

  const taskRaw = str(record.task);
  let task: AttachmentKind = "photo";
  if (taskRaw === "prescription" || taskRaw === "report") {
    task = taskRaw;
  } else if (medicines.length > 0) {
    task = "prescription";
  } else if (tests.length > 0) {
    task = "report";
  }

  const languageRaw = str(record.language);
  const language: ParsedVisionPayload["language"] =
    languageRaw === "bn" || languageRaw === "en" || languageRaw === "mixed"
      ? languageRaw
      : "unknown";

  return {
    task,
    confidence: clamp01(record.confidence, 0.5),
    language,
    doctorName: str(record.doctorName),
    clinic: str(record.clinic),
    date: str(record.date),
    patientName: str(record.patientName),
    notes: str(record.notes),
    medicines,
    tests,
    rawText: str(record.rawText) ?? "",
  };
}

function buildDocument(
  payload: ParsedVisionPayload,
): OcrPrescription | OcrLabReport {
  if (payload.task === "report") {
    const report: OcrLabReport = { tests: payload.tests };
    if (payload.clinic) report.labName = payload.clinic;
    if (payload.doctorName) report.orderedBy = payload.doctorName;
    if (payload.date) report.reportDate = payload.date;
    return report;
  }

  const prescription: OcrPrescription = { medicines: payload.medicines };
  if (payload.doctorName) prescription.doctorName = payload.doctorName;
  if (payload.clinic) prescription.clinic = payload.clinic;
  if (payload.date) prescription.date = payload.date;
  if (payload.patientName) prescription.patientName = payload.patientName;
  if (payload.notes) prescription.notes = payload.notes;
  return prescription;
}

function buildWarnings(payload: ParsedVisionPayload): OcrWarning[] {
  const warnings: OcrWarning[] = [];

  if (payload.confidence < 0.6) {
    warnings.push({
      code: "LOW_CONFIDENCE",
      message:
        "We were not fully confident reading this document. Please check the details against the original.",
    });
  }
  if (payload.task === "prescription" && payload.medicines.length === 0) {
    warnings.push({
      code: "NO_MEDICINES_FOUND",
      message: "No medicines could be read from this document.",
    });
  }
  if (payload.task === "report" && payload.tests.length === 0) {
    warnings.push({
      code: "NO_TESTS_FOUND",
      message: "No test results could be read from this document.",
    });
  }
  const illegible = payload.medicines.filter((m) => m.confidence < 0.5).length;
  if (illegible > 0) {
    warnings.push({
      code: "ILLEGIBLE_LINE",
      message: `${illegible} medicine line(s) were hard to read — verify the dose carefully.`,
    });
  }

  return warnings;
}

/* ────────────────────────────────────────────────────────────────────
   Public entry point
   ──────────────────────────────────────────────────────────────────── */

/**
 * Friendly names for the models we ship with.
 *
 * Anything not listed is humanised from its id. We must never show the
 * name of a model that did not run — a fallback answer labelled as the
 * primary model is a silent lie.
 */
const MODEL_LABELS: Record<string, string> = {
  "minimax/minimax-m3.1-flash:free": "MiniMax M3.1 Flash",
  "nvidia/nemotron-3.5-super-vl:free": "NVIDIA Nemotron 3.5 VL",
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free":
    "NVIDIA Nemotron 3 Nano Omni",
  "tencent/hy-image-v3.5-preview": "Tencent Hunyuan Vision 3.5",
};

/**
 * Human label for the model that actually produced a result. It must
 * reflect the model that ran — not the one that was configured — so a
 * fallback run is never reported as the primary model.
 */
export function describeModel(modelId: string): string {
  const known = MODEL_LABELS[modelId];
  if (known) return known;

  const tail = modelId.split("/").pop() ?? modelId;
  const humanised = tail.replace(/:free$/, "").replace(/[-_]/g, " ").trim();
  return humanised.length ? humanised : modelId;
}

export type VisionOutcome =
  | { ok: true; result: OcrResult }
  | { ok: false; reason: "unreadable" | "unavailable" | "invalid-image"; message: string };

/**
 * Errors that no amount of model-switching can fix: the key is missing
 * or rejected, or the gateway is not configured. Everything else —
 * 404 (model retired), 429 (quota), 5xx, timeouts and malformed JSON —
 * is worth trying on the fallback model.
 */
function isFatalVisionError(message: string): boolean {
  return /failed \((401|403)\)|API key|not configured/i.test(message);
}

/**
 * Runs one vision extraction.
 *
 * Resolution order:
 *   1. VISION_MODEL_ID (default minimax/minimax-m3.1-flash:free)
 *   2. VISION_FALLBACK_MODEL_ID (default nvidia/nemotron-3.5-super-vl:free)
 *   3. A degraded "unreadable" result — never a fabricated one.
 */
export async function extractDocument(request: VisionRequest): Promise<VisionOutcome> {
  if (!VISION_API_KEY) {
    return {
      ok: false,
      reason: "unavailable",
      message: "Image reading is not configured on this server.",
    };
  }

  if (!request.imageUrl || typeof request.imageUrl !== "string") {
    return { ok: false, reason: "invalid-image", message: "No image was provided." };
  }

  const task = request.task ?? "auto";
  const candidates = [VISION_MODEL_ID, VISION_FALLBACK_MODEL_ID].filter(Boolean);
  const startedAt = Date.now();

  let lastError: Error | null = null;
  let sawRateLimit = false;

  for (const modelId of candidates) {
    try {
      // Attempt 1 — straight extraction.
      const raw = await callVisionModel(request.imageUrl, task, modelId);
      let payload: ParsedVisionPayload;

      try {
        payload = parseVisionPayload(raw.text);
      } catch {
        // Attempt 2 — one repair retry for malformed JSON.
        const repaired = await callVisionModel(
          request.imageUrl,
          task,
          modelId,
          "Return valid JSON only. Your previous output could not be parsed.",
        );
        try {
          payload = parseVisionPayload(repaired.text);
        } catch {
          throw new Error(`Vision model ${modelId} returned unparseable JSON.`);
        }
      }

      const result: OcrResult = {
        attachmentId: request.attachmentId,
        model: raw.model,
        task: payload.task,
        confidence: payload.confidence,
        language: payload.language,
        document: buildDocument(payload),
        rawText: payload.rawText,
        warnings: buildWarnings(payload),
        processingMs: Date.now() - startedAt,
      };

      return { ok: true, result };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (/failed \(429\)|Rate limit|quota/i.test(lastError.message)) {
        sawRateLimit = true;
      }

      // A rejected key/server config affects every candidate equally.
      if (isFatalVisionError(lastError.message)) break;

      // Retired model, quota, timeout or unusable output: let the
      // fallback try. This is the whole point of having one.
      continue;
    }
  }

  const unavailable = /failed \(401|403\)|API key/i.test(lastError?.message ?? "");
  const rateLimited = sawRateLimit || /failed \(429\)|Rate limit|quota/i.test(lastError?.message ?? "");

  if (rateLimited) {
    return {
      ok: false,
      reason: "unavailable",
      message:
        "Image reading is temporarily unavailable — we have reached our reading limit for now. Please try again later, or enter the details manually.",
    };
  }

  return {
    ok: false,
    reason: unavailable ? "unavailable" : "unreadable",
    message: unavailable
      ? "Image reading is temporarily unavailable. Please enter the details manually."
      : "We could not read this image clearly. Try a brighter photo with the page flat, or enter the details manually.",
  };
}
