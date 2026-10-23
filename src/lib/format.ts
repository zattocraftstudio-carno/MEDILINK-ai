/**
 * Shared formatters.
 *
 * The app previously rendered the same value six different ways
 * (`৳2.5` in the cart, `৳2.50` on the shelf, `৳32` in a WhatsApp
 * message) and formatted dates with the browser default locale, so the
 * same screen read differently on different devices. Everything numeric
 * now goes through this module.
 */

const nf = new Intl.NumberFormat("en-BD", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const nf2 = new Intl.NumberFormat("en-BD", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** `৳2.50` — exact, for line items, totals and receipts. */
export const formatBDT = (n: number) => `৳${nf2.format(n)}`;

/** `৳2.5` — compact, for badges and chips. */
export const formatBDTCompact = (n: number) => `৳${nf.format(n)}`;

/**
 * A LOCAL (not UTC) date key.
 *
 * `toISOString().split("T")[0]` returns the UTC date, which for
 * Bangladesh (UTC+6) rolls over at 06:00 local — the free daily chat
 * quota was resetting six hours early for every Bangladeshi user.
 */
export const getLocalDateKey = (d: Date = new Date()): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

/** Fixed locale — no more browser-default drift between devices. */
export const formatDate = (value: string | number | Date): string =>
  new Intl.DateTimeFormat("en-BD", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));

export const formatTime = (ts: number): string =>
  new Intl.DateTimeFormat("en-BD", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(ts));

/**
 * Detects the language of a piece of text.
 *
 * Bangla script is U+0980–U+09FF, but U+09F0 (ৰ) and U+09F1 (ৱ) are
 * Assamese-only characters — including them means Assamese text is
 * detected as Bangla and then rejected downstream as corrupt.
 */
const BENGALI_SCRIPT_RE = /[ঀ-৿]/;
const ASSAMESE_ONLY_RE = /[ৰৱ]/;

/**
 * Returns "bn" for Bangla script, "en" otherwise.
 *
 * Banglish (romanised Bangla) is intentionally reported as "en" for the
 * `lang` attribute: the glyphs are Latin, so the Latin typeface and
 * Latin pronunciation are correct, while the *content* is still Bangla.
 */
export function detectLang(text: string): "bn" | "en" {
  if (!text) return "en";
  if (ASSAMESE_ONLY_RE.test(text)) return "en";
  return BENGALI_SCRIPT_RE.test(text) ? "bn" : "en";
}

/** True when the text contains Bangla script. */
export const hasBanglaScript = (text: string): boolean =>
  detectLang(text) === "bn";

/**
 * Normalises a Bangladeshi mobile number to the `8801XXXXXXXXX` form
 * used by `wa.me` and `tel:` deep links.
 *
 * Accepts `01811389672`, `+8801811389672`, `8801811389672`, and numbers
 * with spaces or dashes. Returns null when the number is not a valid
 * Bangladeshi mobile number.
 */
export function normaliseBDPhone(input: string): string | null {
  if (!input) return null;
  const digits = input.replace(/\D/g, "");

  let local: string | null = null;
  if (digits.length === 11 && digits.startsWith("01")) local = digits;
  else if (digits.length === 10 && digits.startsWith("1")) local = `0${digits}`;
  else if (digits.length === 13 && digits.startsWith("8801")) local = digits.slice(3);
  else if (digits.length === 12 && digits.startsWith("880")) local = `0${digits.slice(3)}`;

  if (!local) return null;
  if (!/^01[3-9]\d{8}$/.test(local)) return null;
  return `880${local.slice(1)}`;
}

/** Validates a Bangladeshi mobile number in local `01XXXXXXXXX` form. */
export const isValidBDPhone = (input: string): boolean =>
  /^01[3-9]\d{8}$/.test((input || "").replace(/\D/g, ""));
