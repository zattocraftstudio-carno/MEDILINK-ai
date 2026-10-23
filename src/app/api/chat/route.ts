import { NextRequest, NextResponse } from "next/server";
import { buildSystemPrompt } from "@/lib/openrouter";
import {
  planRoute,
  LANGUAGE_LABELS,
  ModelCandidate,
  RoutePlan,
} from "@/lib/model-router";
import { Profile } from "@/types";
import { selectHealthyKey, markKeySuccess, markKeyFailed, releaseKey } from "@/lib/api-key-pool";
import type { MemoryItem } from "@/types";

export const runtime = "nodejs";

/* ────────────────────────────────────────────────────────────────────
   Rate limiting (in-memory, per IP)
   Good enough to keep the free-model demo stable. Resets on redeploy.
   Tunable via CHAT_RATE_LIMIT_PER_MIN (default 12 requests / minute).
   ──────────────────────────────────────────────────────────────────── */
const RATE_WINDOW_MS = 60_000;
const MAX_RATE_BUCKETS = 2000; // hard cap — the Map must stay bounded
const rateBuckets = new Map<string, number[]>();

/**
 * FIX 2 — the rate-limit key must NOT be client-controlled.
 *
 * The LEFTMOST `x-forwarded-for` entry is the one the client supplied (that
 * is the convention: every proxy appends the peer address it observed, so
 * the client can prepend anything it likes). Keying the limiter on it lets
 * anyone rotate the header and receive a fresh bucket per request, which
 * bypasses the only abuse control this route has.
 *
 * We therefore use the RIGHTMOST entry — the one our own edge proxy
 * appended — and only fall back to a leftmost value when the chain has a
 * single hop (local dev, single-proxy deployments). A multi-hop chain never
 * uses a client-supplied value.
 */
function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const hops = fwd
      .split(",")
      .map((hop) => hop.trim())
      .filter(Boolean);
    // Single hop → identical behaviour to before (local dev still limits).
    if (hops.length === 1) return hops[0];
    // Multi hop → rightmost entry, appended by our own proxy.
    if (hops.length > 1) return hops[hops.length - 1];
  }
  return req.headers.get("x-real-ip") || "local";
}

/**
 * FIX 3 — keep the bucket Map bounded.
 *
 * Stale buckets (no hit inside the window) are dropped first, then a hard
 * cap evicts the oldest entries even when they are still "live". Pruning
 * only stale entries is not enough: an attacker rotating a fresh IP per
 * request creates one live entry per request that never becomes stale.
 * The Map is re-inserted on every hit so iteration order reflects recency
 * and the eviction drops the least recently used bucket first.
 */
function pruneRateBuckets(now: number): void {
  rateBuckets.forEach((hits, key) => {
    if (hits.length === 0 || now - hits[hits.length - 1] > RATE_WINDOW_MS) {
      rateBuckets.delete(key);
    }
  });

  while (rateBuckets.size > MAX_RATE_BUCKETS) {
    const oldest = rateBuckets.keys().next();
    if (oldest.done) break;
    rateBuckets.delete(oldest.value);
  }
}

function checkRateLimit(ip: string): { limited: boolean; retryAfterSec: number } {
  const limit = Math.max(1, Number(process.env.CHAT_RATE_LIMIT_PER_MIN || 12));
  const now = Date.now();

  // FIX 3 — cleanup runs on EVERY path, including the rate-limited one,
  // so a spoofed-IP flood cannot fill the Map with live entries.
  pruneRateBuckets(now);

  const recent = (rateBuckets.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);

  if (recent.length >= limit) {
    const retryAfterSec = Math.max(
      1,
      Math.ceil((RATE_WINDOW_MS - (now - recent[0])) / 1000)
    );
    return { limited: true, retryAfterSec };
  }

  recent.push(now);
  // Re-insert so the Map's iteration order reflects recency.
  rateBuckets.delete(ip);
  rateBuckets.set(ip, recent);

  return { limited: false, retryAfterSec: 0 };
}

/* ────────────────────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────────────────────── */
const MAX_HISTORY_MESSAGES = 16; // keep prompts small & fast
const MAX_MESSAGE_CHARS = 2000; // guard against paste-bombs

function sanitizeMessages(input: unknown): { role: "user" | "assistant"; content: string }[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter(
      (m): m is { role: string; content: string } =>
        !!m &&
        typeof m === "object" &&
        (m as any).role !== "system" &&
        typeof (m as any).content === "string"
    )
    .map((m) => ({
      role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: m.content.slice(0, MAX_MESSAGE_CHARS),
    }))
    .slice(-MAX_HISTORY_MESSAGES);
}

function cleanText(value: unknown, maxLen: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, maxLen);
}

function sanitizeProfile(input: unknown): Profile | null {
  if (!input || typeof input !== "object") return null;
  const p = input as any;
  if (!p.name && !p.phone && !p.area) return null;

  const list = (value: unknown): string[] =>
    Array.isArray(value)
      ? value
          .filter((v) => typeof v === "string")
          .map((v) => cleanText(v, 40))
          .filter(Boolean)
          .slice(0, 10)
      : [];

  return {
    name: cleanText(p.name, 80),
    phone: cleanText(p.phone, 20),
    area: cleanText(p.area, 80),
    diseases: list(p.diseases),
    allergies: list(p.allergies),
    bloodGroup: cleanText(p.bloodGroup, 8) || undefined,
    ageGroup: cleanText(p.ageGroup, 20) || undefined,
    gender: cleanText(p.gender, 20) || undefined,
    emergencyContact: p.emergencyContact
      ? {
          name: cleanText(p.emergencyContact.name, 80),
          phone: cleanText(p.emergencyContact.phone, 20),
        }
      : undefined,
    consentGiven: !!p.consentGiven,
  };
}

/**
 * FIX 4 — combine the per-attempt timeout signal with the client-disconnect
 * signal. `AbortSignal.any` is used when the runtime provides it (Node
 * 20.3+); the manual fallback keeps the same semantics everywhere else.
 */
function combineSignals(
  signals: (AbortSignal | undefined)[]
): { signal: AbortSignal | undefined; dispose: () => void } {
  const present = signals.filter((s): s is AbortSignal => !!s);
  if (present.length === 0) return { signal: undefined, dispose: () => {} };
  if (present.length === 1) return { signal: present[0], dispose: () => {} };

  if (typeof AbortSignal.any === "function") {
    return { signal: AbortSignal.any(present), dispose: () => {} };
  }

  const controller = new AbortController();
  const onAbort = () => controller.abort();
  for (const source of present) {
    if (source.aborted) {
      controller.abort();
      break;
    }
    source.addEventListener("abort", onAbort, { once: true });
  }
  return {
    signal: controller.signal,
    dispose: () => {
      for (const source of present) source.removeEventListener("abort", onAbort);
    },
  };
}

/**
 * FIX 7 — the client refreshes its "which model answered" banner only when
 * the label header is present, so every response carries the X-MediLink-*
 * headers. Unknown values become neutral empty strings.
 */
function mediLinkHeaders(values: {
  model?: string;
  modelLabel?: string;
  mode?: string;
  language?: string;
  languageCode?: string;
  task?: string;
  complexity?: string;
  modelsTried?: number;
}): Record<string, string> {
  return {
    "X-MediLink-Model": values.model ?? "",
    "X-MediLink-Model-Label": values.modelLabel ?? "",
    "X-MediLink-Mode": values.mode ?? "",
    "X-MediLink-Language": values.language ?? "",
    "X-MediLink-Language-Code": values.languageCode ?? "",
    "X-MediLink-Task": values.task ?? "",
    "X-MediLink-Complexity": values.complexity ?? "",
    "X-MediLink-Models-Tried": String(values.modelsTried ?? 0),
  };
}

/* ────────────────────────────────────────────────────────────────────
   Model health tracking
   Free OpenRouter models can be rate-limited upstream in bursts. When a
   model fails, it is cooled down briefly so later requests skip straight
   to the next model instead of re-paying the same delay every time.
   Cooling models are tried last, never removed from the candidate list.
   ──────────────────────────────────────────────────────────────────── */
const ATTEMPT_TIMEOUT_MS = 20_000; // max wait for response headers per model
const TTFT_TIMEOUT_SENTINEL = -1; // pseudo-status for "no usable content in time"
const CORRUPT_OUTPUT_SENTINEL = -2; // pseudo-status for a corrupt opening prefix
const modelCooldownUntil = new Map<string, number>();

function cooldownFor(status: number): number {
  if (status === TTFT_TIMEOUT_SENTINEL) return 180_000; // slow/broken — 3 min rest
  if (status === CORRUPT_OUTPUT_SENTINEL) return 60_000; // prompt-specific corruption
  if (status === 429) return 90_000; // rate-limited upstream — short rest
  if (status >= 500) return 30_000; // provider hiccup
  if (status >= 400) return 300_000; // auth/credit/config problem — longer rest
  return 30_000; // network error / timeout
}

function markModelFailed(model: string, status: number) {
  modelCooldownUntil.set(model, Date.now() + cooldownFor(status));
  console.warn(
    `[MediLink] cooling down ${model} for ${Math.round(cooldownFor(status) / 1000)}s`
  );
}

function markModelHealthy(model: string) {
  modelCooldownUntil.delete(model);
}

function orderedCandidates(candidates: ModelCandidate[]): ModelCandidate[] {
  const now = Date.now();
  const ready: ModelCandidate[] = [];
  const cooling: ModelCandidate[] = [];
  for (const candidate of candidates) {
    if ((modelCooldownUntil.get(candidate.id) || 0) <= now) ready.push(candidate);
    else cooling.push(candidate);
  }
  return [...ready, ...cooling];
}

/* ────────────────────────────────────────────────────────────────────
   SSE parsing — OpenRouter streams "data: {...}" lines. Only visible
   content (delta.content) is forwarded; hidden reasoning deltas are
   skipped so the chat never shows raw chain-of-thought.
   ──────────────────────────────────────────────────────────────────── */
type SSEEvent = { type: "content"; text: string } | { type: "done" };

function createSSEParser() {
  let buffer = "";

  return {
    push(raw: string): SSEEvent[] {
      buffer += raw;
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      const events: SSEEvent[] = [];
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data:")) continue;
        const payload = trimmed.replace(/^data:\s*/, "");

        if (payload === "[DONE]") {
          events.push({ type: "done" });
          continue;
        }

        try {
          const parsed = JSON.parse(payload);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (typeof delta === "string" && delta.length > 0) {
            events.push({ type: "content", text: delta });
          }
        } catch {
          /* ignore malformed or partial chunks */
        }
      }
      return events;
    },
  };
}

function readWithTimeout(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  ms: number
): Promise<ReadableStreamReadResult<Uint8Array> | "timeout"> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve("timeout"), Math.max(1, ms));
    reader.read().then(
      (result) => {
        clearTimeout(timer);
        resolve(result);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

/* ────────────────────────────────────────────────────────────────────
   Output sanity gate
   Catches objectively broken output so the chain can treat it as
   "failed to respond" and try the next model. Deliberately limited to
   hard, low-false-positive signals:

     • Assamese-only letters (ৰ U+09F0, ৱ U+09F1) — never valid Bangla.
     • Devanagari anywhere — the product supports Bangla/English only;
       mixed Devanagari is a known failure mode of free reasoning models.
     • Latin letters fused into a Bangla word ("কার্ডiolজিস্ট") — brand
       names are fine when separated by a space or slash.
     • Leaked English chain-of-thought.
     • Degenerate repetition loops.
   ──────────────────────────────────────────────────────────────────── */
const ACCEPT_PREFIX_CHARS = 72; // flush the first chunk as soon as this is sane
const MIN_FINISHED_PREFIX = 24; // accept a naturally-ended very short reply
const STREAM_IDLE_TIMEOUT_MS = 25_000; // no content for 25s → close gracefully

const REPETITION_REGEXES = [
  new RegExp("(.)\\1{9,}", "su"), // single char × 10+
  new RegExp("(.{2})\\1{7,}", "su"), // 2-char unit × 8+
  new RegExp("(.{3})\\1{7,}", "su"), // 3-char unit × 8+
  new RegExp("(.{4})\\1{7,}", "su"), // 4-char unit × 8+
];

function hasDegenerateRepetition(text: string): boolean {
  return REPETITION_REGEXES.some((re) => re.test(text));
}

const REASONING_LEAK_RE =
  /\*\*\s*Analyz|Analyze the Request|Thinking Process|Let me think|We need to (respond|answer|provide)/i;

/**
 * Mid-stream circuit breaker. Unlike the opening-prefix gate, this only stops
 * on runaway degeneration or leaked chain-of-thought. A single Devanagari or
 * mixed-script slip late in an otherwise good answer should not truncate it —
 * the user would lose the entire closing advice over one typo.
 */
function findStreamCorruption(text: string): string | null {
  if (hasDegenerateRepetition(text)) return "repetition";
  if (REASONING_LEAK_RE.test(text)) return "reasoning-leak";
  return null;
}

/**
 * Returns the first hard corruption signal found, or null. The reason is
 * logged (never the content) so routing failures can be diagnosed without
 * putting patient text into logs.
 */
function findCorruption(text: string): string | null {
  // Assamese-only letters are never valid standard Bangla.
  if (/[\u09F0\u09F1]/.test(text)) return "assamese-letters";
  // Devanagari has no place in a Bangla/English medical answer — except the
  // danda (U+0964/U+0965), which is the standard Bangla sentence terminator.
  if (/[\u0900-\u0963\u0966-\u097F]/.test(text)) return "devanagari";
  // Two or more Latin letters fused directly into Bangla letters (not digits,
  // spaces or slashes) — e.g. "কার্ডiolজিস্ট", "পiosamente". Requiring 2+
  // letters avoids rejecting a single legitimate suffix like "গ্রুপB".
  if (/[\u0985-\u09B9][A-Za-z]{2,}|[A-Za-z]{2,}[\u0985-\u09B9]/.test(text)) {
    return "mixed-script";
  }
  // Leaked English chain-of-thought must never reach a patient-facing answer.
  if (REASONING_LEAK_RE.test(text)) {
    return "reasoning-leak";
  }
  // Degenerate repetition loops.
  if (hasDegenerateRepetition(text)) return "repetition";
  return null;
}

/* ────────────────────────────────────────────────────────────────────
   POST /api/chat
   1. Detect language, task type and complexity.
   2. Ask the router for an ordered candidate list for this exact context.
   3. Try candidates in order until one produces sane visible content.
   4. Stream the answer as plain text.
   ──────────────────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  try {
    // 1. Rate limit per visitor IP first (reject floods before touching API key pool)
    const ip = getClientIp(req);
    const { limited, retryAfterSec } = checkRateLimit(ip);
    if (limited) {
      return NextResponse.json(
        {
          error: `একটু ধীরে! এক মিনিটে অনেকগুলো মেসেজ পাঠানো হয়েছে। ${retryAfterSec} সেকেন্ড পর আবার চেষ্টা করুন।`,
        },
        {
          status: 429,
          headers: {
            ...mediLinkHeaders({}),
            "Retry-After": String(retryAfterSec),
          },
        }
      );
    }

    // 2. Parse and validate request body
    let body: any;
    try {
      body = await req.json();
    } catch (parseError) {
      console.warn(
        "[MediLink] rejected request with an unreadable JSON body:",
        parseError instanceof Error ? parseError.name : "unknown"
      );
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400, headers: mediLinkHeaders({}) }
      );
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400, headers: mediLinkHeaders({}) }
      );
    }

    // 3. Select healthy key with least in-flight load from the pool
    const keyConfig = await selectHealthyKey();
    if (!keyConfig) {
      return NextResponse.json(
        {
          error:
            "All API keys are exhausted or cooling down. Please try again in a moment.",
        },
        { status: 503, headers: mediLinkHeaders({}) }
      );
    }

    const {
      messages: rawMessages,
      model = "med1-flash",
      profile,
      healthLogsSummary,
      memoryPrompts,
      memories,
    } = body as {
      messages: { role: "user" | "assistant"; content: string }[];
      model?: "med1-flash" | "med1-pro";
      profile?: Profile | null;
      healthLogsSummary?: string;
      memoryPrompts?: string[];
      memories?: MemoryItem[];
    };

    const messages = sanitizeMessages(rawMessages);
    if (messages.length === 0) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400, headers: mediLinkHeaders({}) }
      );
    }

    const mode = model === "med1-pro" ? "med1-pro" : "med1-flash";
    const lastUserMessage =
      messages.filter((m) => m.role === "user").slice(-1)[0]?.content || "";
    const priorUserTurns = Math.max(
      0,
      messages.filter((m) => m.role === "user").length - 1
    );

    /* ── Context-aware routing ── */
    const plan: RoutePlan = planRoute({
      mode,
      message: lastUserMessage,
      priorUserTurns,
    });

    const systemPrompt = buildSystemPrompt(
      mode,
      sanitizeProfile(profile),
      plan.languageHint,
      healthLogsSummary,
      Array.isArray(memoryPrompts) ? memoryPrompts.filter((p): p is string => typeof p === "string").slice(0, 20) : null,
      Array.isArray(memories) ? memories.slice(0, 25) : null,
    );
    const openRouterMessages = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    const requestHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${keyConfig.key}`,
      "HTTP-Referer": "https://medilink.com.bd",
      "X-Title": "MediLink Bangladesh",
    };

    /* ── Sequential fallback across the routed candidates ──
       A model counts as "failed to respond" when it errors, produces no
       usable content before its TTFT budget, or starts with objectively
       garbled output. Failed models get a short cooldown so later requests
       stay fast while the router still respects language/mode/task order. */
    let activeReader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    let activeParser: ReturnType<typeof createSSEParser> | null = null;
    let activeDecoder: TextDecoder | null = null;
    let activeCandidate: ModelCandidate | null = null;
    let activePrefix = "";
    let activeAttemptController: AbortController | null = null;
    let disposeActiveSignals: (() => void) | null = null;
    let modelsTried = 0;

    for (const candidate of orderedCandidates(plan.candidates)) {
      modelsTried += 1;

      // Stage 1 — get response headers (bounded wait).
      const attemptController = new AbortController();
      const attemptTimeout = setTimeout(
        () => attemptController.abort(),
        ATTEMPT_TIMEOUT_MS
      );

      // FIX 4 — the patient can vanish (Stop button, navigation, closed tab)
      // while the upstream model is still generating. req.signal aborts on
      // disconnect; combining it with the attempt controller makes the
      // upstream fetch die with the client instead of burning tokens for
      // nobody. The 20s header timeout above keeps working as before.
      const combined = combineSignals([attemptController.signal, req.signal]);

      let res: Response | null = null;
      try {
        res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: requestHeaders,
          signal: combined.signal,
          body: JSON.stringify({
            model: candidate.id,
            messages: openRouterMessages,
            stream: true,
            temperature: candidate.temperature,
            max_tokens: candidate.maxTokens,
            // Unified OpenRouter param. Pro's 550B reasoner runs at "medium";
            // Super VL always runs at "low" (medium consumes its whole budget).
            reasoning: { effort: candidate.reasoningEffort },
          }),
        });
      } catch (err: any) {
        if (req.signal.aborted) {
          // Not the model's fault — the client left. Do not cool it down.
          console.warn(
            `[MediLink] client disconnected while ${candidate.id} was answering`
          );
        } else {
          markModelFailed(candidate.id, 0);
          await markKeyFailed(keyConfig, 0);
          console.warn(
            `[MediLink] ${candidate.id} network error/timeout:`,
            err?.message || err
          );
        }
      } finally {
        clearTimeout(attemptTimeout);
      }

      if (!res) {
        combined.dispose();
        if (req.signal.aborted) break; // client gone — do not try more models
        continue;
      }

      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => "");
        markModelFailed(candidate.id, res.status);
        await markKeyFailed(keyConfig, res.status);
        console.warn(
          `[MediLink] ${candidate.id} failed (${res.status}):`,
          errText.slice(0, 300)
        );
        combined.dispose();
        continue;
      }

      // Stage 2 — buffer only the opening 72 visible characters. This is
      // enough for every hard corruption check, but far too little to make
      // Flash feel sluggish (the old 240-char gate added seconds of delay).
      const reader = res.body.getReader();
      const parser = createSSEParser();
      const decoder = new TextDecoder();
      const deadline = Date.now() + candidate.ttftBudgetMs;
      let garbledReason: string | null = null;
      let streamEnded = false;

      // FIX 1 — the prefix buffer is per candidate. It used to live outside
      // the loop, so a rejected model's corrupt text was carried into the
      // next candidate: the next `while` never ran, "enough content" was
      // already true, and the healthy model was accepted with zero sanity
      // validation while the corrupt text was streamed to the patient as the
      // opening of the answer. Each candidate is now validated on its own
      // output only.
      let capturedPrefix = "";

      try {
        while (capturedPrefix.length < ACCEPT_PREFIX_CHARS) {
          const remaining = deadline - Date.now();
          if (remaining <= 0) break;

          const race = await readWithTimeout(reader, remaining);
          if (race === "timeout") break;
          if (race.done) {
            streamEnded = true;
            break;
          }

          for (const event of parser.push(decoder.decode(race.value, { stream: true }))) {
            if (event.type === "content") {
              capturedPrefix += event.text;
              const reason = findCorruption(capturedPrefix);
              if (reason) {
                garbledReason = reason;
                break;
              }
            } else if (event.type === "done") {
              streamEnded = true;
              break;
            }
          }
          if (garbledReason) break;
        }
      } catch {
        /* network hiccup — fall through with whatever prefix was captured */
      }

      const enoughContent = capturedPrefix.length >= ACCEPT_PREFIX_CHARS;
      const shortButFinished =
        streamEnded && capturedPrefix.length >= MIN_FINISHED_PREFIX;

      // FIX 4 — the client disconnected during the buffering window. Stop
      // here instead of trying (and paying for) the remaining candidates.
      if (req.signal.aborted) {
        reader.cancel().catch(() => {
          /* already released */
        });
        combined.dispose();
        break;
      }

      if (!garbledReason && (enoughContent || shortButFinished)) {
        markModelHealthy(candidate.id);
        await markKeySuccess(keyConfig);
        activeReader = reader;
        activeParser = parser;
        activeDecoder = decoder;
        activeCandidate = candidate;
        // FIX 1 — only this candidate's own text may be streamed to the
        // patient, so the accepted prefix is copied out of the loop scope.
        activePrefix = capturedPrefix;
        activeAttemptController = attemptController;
        disposeActiveSignals = combined.dispose;
        break;
      }

      reader.cancel().catch(() => {
        /* already released */
      });
      combined.dispose();
      markModelFailed(
        candidate.id,
        garbledReason ? CORRUPT_OUTPUT_SENTINEL : TTFT_TIMEOUT_SENTINEL
      );
      if (!garbledReason) {
        await markKeyFailed(keyConfig, 504);
      }
      console.warn(
        `[MediLink] ${candidate.id} rejected (${
          garbledReason
            ? `corrupt output: ${garbledReason}`
            : `no usable content within ${Math.round(candidate.ttftBudgetMs / 1000)}s`
        }) — trying next model`
      );
    }

    if (!activeReader || !activeParser || !activeDecoder || !activeCandidate) {
      releaseKey(keyConfig);
      return NextResponse.json(
        { error: "সব AI মডেল এই মুহূর্তে ব্যস্ত। একটু পরে আবার চেষ্টা করুন।" },
        {
          status: 503,
          headers: mediLinkHeaders({
            mode: plan.mode,
            language: LANGUAGE_LABELS[plan.language],
            languageCode: plan.language,
            task: plan.taskType,
            complexity: plan.complexity,
            modelsTried,
          }),
        }
      );
    }

    // Stage 3 — stream the rest of the answer to the client immediately.
    const encoder = new TextEncoder();
    const reader = activeReader;
    const parser = activeParser;
    const decoder = activeDecoder;
    const activeModelId = activeCandidate.id;
    const activeLabel = activeCandidate.shortLabel;
    const acceptedPrefix = activePrefix;
    const streamAttemptController = activeAttemptController;
    const disposeSignals = disposeActiveSignals;

    const stream = new ReadableStream({
      async start(controller) {
        // The sanity-checked prefix goes out first, in the same tick as the
        // upstream response — this is what makes Flash feel instantaneous.
        if (acceptedPrefix) {
          controller.enqueue(encoder.encode(acceptedPrefix));
        }
        let tail = acceptedPrefix.slice(-200);

        try {
          while (true) {
            const race = await readWithTimeout(reader, STREAM_IDLE_TIMEOUT_MS);
            if (race === "timeout") {
              console.warn(`[MediLink] ${activeModelId} stream idle — closing`);
              // FIX 5 — closing the client stream is not enough: the
              // upstream model would keep generating until it finished.
              // Cancel the reader and abort the attempt so the provider
              // stops working on an answer nobody is reading.
              reader.cancel("idle timeout").catch(() => {
                /* already released */
              });
              streamAttemptController?.abort();
              break;
            }
            if (race.done) break;

            let finished = false;
            let corruptReason: string | null = null;
            for (const event of parser.push(decoder.decode(race.value, { stream: true }))) {
              if (event.type === "content") {
                controller.enqueue(encoder.encode(event.text));
                tail = (tail + event.text).slice(-200);
                // Mid-stream circuit breaker: only runaway degeneration or
                // leaked reasoning. Single script slips are tolerated so a
                // nearly-complete answer is not cut off.
                const reason = findStreamCorruption(tail);
                if (reason) {
                  corruptReason = reason;
                  break;
                }
              } else if (event.type === "done") {
                finished = true;
              }
            }
            if (corruptReason) {
              reader.cancel("corrupt output").catch(() => {
                /* already released */
              });
              streamAttemptController?.abort();
              console.warn(
                `[MediLink] ${activeModelId} stopped early: corrupt output (${corruptReason})`
              );
              break;
            }
            if (finished) break;
          }
          controller.close();
        } catch (error) {
          reader.cancel("stream error").catch(() => {});
          streamAttemptController?.abort();
          controller.error(error);
        } finally {
          disposeSignals?.();
        }
      },
      cancel(reason) {
        // Client disconnected (Stop button / navigation). Release upstream via
        // the reader — cancelling a locked stream directly would throw.
        reader.cancel(reason).catch(() => {
          /* already released */
        });
        // FIX 4 — also abort the upstream request so the provider stops
        // generating immediately instead of running to completion.
        streamAttemptController?.abort();
        disposeSignals?.();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        // FIX 8 — "Connection" is a forbidden header in HTTP/2.
        ...mediLinkHeaders({
          model: activeModelId,
          modelLabel: activeLabel,
          mode: plan.mode,
          language: LANGUAGE_LABELS[plan.language],
          languageCode: plan.language,
          task: plan.taskType,
          complexity: plan.complexity,
          modelsTried,
        }),
      },
    });
  } catch (error: any) {
    // FIX 6 — the detailed error stays in the server log; the client only
    // ever receives a safe, patient-facing message.
    console.error("[API Chat Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: mediLinkHeaders({}) }
    );
  }
}
