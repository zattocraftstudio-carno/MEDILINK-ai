import { NextRequest, NextResponse } from "next/server";
import {
  describeModel,
  extractDocument,
  VISION_MAX_PAYLOAD_BYTES,
  VISION_MODEL_ID,
} from "@/lib/vision";
import type { AttachmentKind } from "@/types";

export const runtime = "nodejs";

/* ────────────────────────────────────────────────────────────────────
   Rate limiting (in-memory, per IP)

   Vision calls cost real money, so this limit is tighter than the
   chat limit. Resets on redeploy.

   Tunable via VISION_RATE_LIMIT_PER_HOUR (default 60 / hour / IP).
   ──────────────────────────────────────────────────────────────────── */
const RATE_WINDOW_MS = 60 * 60_000;
const rateBuckets = new Map<string, number[]>();

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "local";
}

function checkRateLimit(ip: string): { limited: boolean; retryAfterSec: number } {
  const limit = Math.max(1, Number(process.env.VISION_RATE_LIMIT_PER_HOUR || 60));
  const now = Date.now();
  const recent = (rateBuckets.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);

  if (recent.length >= limit) {
    const retryAfterSec = Math.max(
      1,
      Math.ceil((RATE_WINDOW_MS - (now - recent[0])) / 1000),
    );
    return { limited: true, retryAfterSec };
  }

  recent.push(now);
  rateBuckets.set(ip, recent);

  if (rateBuckets.size > 2000) {
    rateBuckets.forEach((hits, key) => {
      if (hits.length === 0 || now - hits[hits.length - 1] > RATE_WINDOW_MS) {
        rateBuckets.delete(key);
      }
    });
  }

  return { limited: false, retryAfterSec: 0 };
}

/* ────────────────────────────────────────────────────────────────────
   Validation
   ──────────────────────────────────────────────────────────────────── */

const ALLOWED_MIME_PREFIX = "data:image/";
const ALLOWED_TASKS = new Set(["prescription", "report", "photo", "auto"]);

/**
 * Accepts only `data:image/...;base64,...` payloads. A remote URL
 * would make the server fetch an attacker-controlled address, so
 * URLs are rejected outright.
 */
function validateImageUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith(ALLOWED_MIME_PREFIX)) return null;
  if (!value.includes(";base64,")) return null;

  // base64 inflates by ~4/3 — check the encoded size against the cap.
  const encodedLength = value.length - value.indexOf(";base64,") - 8;
  if (encodedLength > VISION_MAX_PAYLOAD_BYTES * 1.4) return null;

  return value;
}

/* ────────────────────────────────────────────────────────────────────
   POST /api/vision/ocr
   ──────────────────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const { limited, retryAfterSec } = checkRateLimit(ip);

    if (limited) {
      return NextResponse.json(
        {
          ok: false,
          reason: "rate-limited",
          message: `You have reached the image-reading limit for now. Please try again in ${Math.ceil(
            retryAfterSec / 60,
          )} minute(s), or enter the details manually.`,
        },
        { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
      );
    }

    let body: {
      image?: unknown;
      task?: unknown;
      attachmentId?: unknown;
    };

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { ok: false, reason: "invalid-request", message: "Malformed request body." },
        { status: 400 },
      );
    }

    const imageUrl = validateImageUrl(body.image);
    if (!imageUrl) {
      return NextResponse.json(
        {
          ok: false,
          reason: "invalid-image",
          message:
            "Only image uploads are accepted. Please pick a photo of the document.",
        },
        { status: 400 },
      );
    }

    const taskRaw = typeof body.task === "string" ? body.task : "auto";
    const task = (ALLOWED_TASKS.has(taskRaw) ? taskRaw : "auto") as
      | AttachmentKind
      | "auto";

    const attachmentId =
      typeof body.attachmentId === "string" && body.attachmentId
        ? body.attachmentId
        : `att_${Date.now().toString(36)}`;

    const outcome = await extractDocument({ imageUrl, task, attachmentId });

    if (!outcome.ok) {
      // A degraded result, not a hard failure: the client shows the
      // manual-entry fallback instead of an error page.
      return NextResponse.json({
        ok: false,
        reason: outcome.reason,
        message: outcome.message,
        fallback: { manualEntry: true },
      });
    }

    return NextResponse.json({
      ok: true,
      ...outcome.result,
      // The label reflects the model that ACTUALLY ran, so a fallback
      // run is never reported as the primary model.
      modelLabel: describeModel(outcome.result.model),
      modelId: outcome.result.model,
      primaryModelId: VISION_MODEL_ID,
    });
  } catch (error: any) {
    // Never log the image or the extracted text (HP-5).
    console.error("[MediLink] Vision route error:", error?.message || "unknown");
    return NextResponse.json(
      {
        ok: false,
        reason: "unreadable",
        message:
          "We could not read this image clearly. Try a brighter photo with the page flat, or enter the details manually.",
        fallback: { manualEntry: true },
      },
      { status: 200 },
    );
  }
}
