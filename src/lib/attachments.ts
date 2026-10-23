/* ═══════════════════════════════════════════════════════════════════
   MediLink — attachment storage & image normalisation (client).

   Two-part persistence (PRD §6.1.3):

     • Metadata  → localStorage via useAttachmentStore
     • Binary    → IndexedDB ("medilink_blobs")

   WHY: localStorage has a ~5 MB total quota. A single 2 MB prescription
   photo would evict the chat history, the cart and the patient profile.
   Blobs therefore never touch localStorage.

   WHY an object URL: `URL.createObjectURL` results are revoked on
   reload, so `hydrate()` re-creates them from IndexedDB on start-up.
   ═══════════════════════════════════════════════════════════════════ */

import type { Attachment, AttachmentKind } from "@/types";

/* ────────────────────────────────────────────────────────────────────
   Limits
   ──────────────────────────────────────────────────────────────────── */

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB raw input
export const MAX_ENCODED_BYTES = 12 * 1024 * 1024; // 12 MB after re-encode
export const MAX_IMAGE_EDGE = 2000; // px, longest edge
export const JPEG_QUALITY = 0.85;

export const ACCEPTED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

/* ────────────────────────────────────────────────────────────────────
   IndexedDB blob store
   ──────────────────────────────────────────────────────────────────── */

const DB_NAME = "medilink_blobs";
const DB_VERSION = 1;
const STORE = "blobs";

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return Promise.resolve(null);
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase | null>((resolve) => {
    let request: IDBOpenDBRequest;
    try {
      request = window.indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      resolve(null);
      return;
    }

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });

  return dbPromise;
}

function runTransaction<T>(
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => IDBRequest<any>,
): Promise<T | null> {
  return openDatabase().then(
    (db) =>
      new Promise<T | null>((resolve) => {
        if (!db) {
          resolve(null);
          return;
        }
        try {
          const tx = db.transaction(STORE, mode);
          const request = work(tx.objectStore(STORE));
          request.onsuccess = () => resolve((request.result as T) ?? null);
          request.onerror = () => resolve(null);
          tx.onabort = () => resolve(null);
        } catch {
          resolve(null);
        }
      }),
  );
}

export async function putBlob(id: string, blob: Blob): Promise<boolean> {
  const result = await runTransaction<unknown>("readwrite", (store) => store.put(blob, id));
  return result !== null;
}

export async function getBlob(id: string): Promise<Blob | null> {
  const result = await runTransaction<Blob>("readonly", (store) => store.get(id));
  return result instanceof Blob ? result : null;
}

export async function deleteBlob(id: string): Promise<void> {
  await runTransaction<unknown>("readwrite", (store) => store.delete(id));
}

export async function listBlobIds(): Promise<string[]> {
  const db = await openDatabase();
  if (!db) return [];
  return new Promise<string[]>((resolve) => {
    try {
      const tx = db.transaction(STORE, "readonly");
      const store = tx.objectStore(STORE);
      const keys = store.getAllKeys();
      keys.onsuccess = () => resolve((keys.result as IDBValidKey[]).map(String));
      keys.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

/* ────────────────────────────────────────────────────────────────────
   Image normalisation
   ──────────────────────────────────────────────────────────────────── */

export interface NormalisedImage {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  sizeBytes: number;
  mimeType: string;
}

export class AttachmentError extends Error {
  readonly code:
    | "unsupported-type"
    | "too-large"
    | "encode-failed"
    | "storage-unavailable";

  constructor(code: AttachmentError["code"], message: string) {
    super(message);
    this.name = "AttachmentError";
    this.code = code;
  }
}

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new AttachmentError("encode-failed", "Could not read the file."));
    reader.readAsDataURL(blob);
  });
}

/**
 * Decodes, downscales and re-encodes an image so that:
 *   • the longest edge is at most MAX_IMAGE_EDGE,
 *   • EXIF metadata (GPS, capture time, device) is stripped, and
 *   • the payload stays small enough to send for OCR.
 */
export async function normaliseImage(file: File): Promise<NormalisedImage> {
  const isHeic = /image\/(heic|heif)/.test(file.type);
  if (!ACCEPTED_MIME_TYPES.includes(file.type as (typeof ACCEPTED_MIME_TYPES)[number]) && !isHeic) {
    throw new AttachmentError(
      "unsupported-type",
      "Only JPG, PNG, WEBP or HEIC images are supported.",
    );
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new AttachmentError(
      "too-large",
      "That image is larger than 8 MB. Please retake the photo at a smaller size.",
    );
  }

  // ── Preferred path: canvas re-encode (strips EXIF) ──
  if (typeof createImageBitmap === "function" && typeof document !== "undefined") {
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no 2d context");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(bitmap, 0, 0, width, height);
      bitmap.close?.();

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
      );
      if (!blob) throw new Error("toBlob returned null");

      if (blob.size > MAX_ENCODED_BYTES) {
        throw new AttachmentError("too-large", "The processed image is still too large to upload.");
      }

      return {
        blob,
        dataUrl: await readAsDataUrl(blob),
        width,
        height,
        sizeBytes: blob.size,
        mimeType: "image/jpeg",
      };
    } catch (error) {
      if (error instanceof AttachmentError) throw error;
      // fall through to the raw-bytes path below
    }
  }

  // ── Fallback: keep the original bytes (EXIF is NOT stripped here) ──
  if (file.size > MAX_ENCODED_BYTES) {
    throw new AttachmentError("too-large", "That image is too large to upload.");
  }
  return {
    blob: file,
    dataUrl: await readAsDataUrl(file),
    width: 0,
    height: 0,
    sizeBytes: file.size,
    mimeType: file.type || "image/jpeg",
  };
}

/* ────────────────────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────────────────────── */

/** Creates a short, collision-resistant attachment id. */
export function createAttachmentId(): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `att_${Date.now().toString(36)}${random}`;
}

/** Infers the document kind from the file name, as a first guess. */
export function inferAttachmentKind(fileName?: string): AttachmentKind {
  if (!fileName) return "photo";
  const name = fileName.toLowerCase();
  if (/(rx|prescrip|prescription|ঔষধ|ব্যবস্থা)/.test(name)) return "prescription";
  if (/(report|lab|test|cbc|lft|kft|usg|xray|x-ray|pathology)/.test(name)) return "report";
  return "photo";
}

/** Converts a stored blob into an object URL for rendering. */
export async function blobUrlFor(id: string): Promise<string | null> {
  const blob = await getBlob(id);
  if (!blob) return null;
  return URL.createObjectURL(blob);
}

/**
 * Restores object URLs for every stored attachment after a page reload.
 *
 * The IndexedDB blob is the source of truth: a `blob:` URL saved in
 * localStorage belongs to the previous page session and is dead, so
 * every attachment is re-created from its blob.
 *
 * NOTE: callers that also mutate attachments while this runs should
 * merge the result into the live state rather than replacing it — see
 * `useAttachmentStore.hydrate()`.
 */
export async function hydrateAttachmentUrls(
  attachments: Attachment[],
): Promise<Attachment[]> {
  const updated: Attachment[] = [];
  for (const attachment of attachments) {
    const url = await blobUrlFor(attachment.id);
    updated.push(url ? { ...attachment, url } : attachment);
  }
  return updated;
}
