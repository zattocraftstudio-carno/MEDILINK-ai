/* ═══════════════════════════════════════════════════════════════════
   MediLink — prescription ↔ cart matching.

   Pure, deterministic. Given the medicines read from a prescription and
   the cart items, decide which cart items are covered.

   This is a PRE-CHECK, never an authorisation. Even a perfect match
   leaves the order in "awaiting-verification" — a human pharmacist
   confirms before dispatch (PRD §4.5).
   ═══════════════════════════════════════════════════════════════════ */

import type {
  CartItem,
  Medicine,
  OcrMedicineLine,
  PrescriptionMatchBasis,
  PrescriptionVerification,
} from "@/types";

/** Strips punctuation and lowercases so "Amoxicillin 500mg" matches. */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\u0980-\u09ff\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Every token of the search term must appear in the target. */
function containsAllTokens(target: string, term: string): boolean {
  const tokens = normalize(term).split(" ").filter(Boolean);
  if (!tokens.length) return false;
  const haystack = ` ${normalize(target)} `;
  return tokens.every((token) => haystack.includes(` ${token} `) || haystack.includes(`${token} `));
}

/**
 * Finds a match for one cart item among the prescription's medicine
 * lines. Checks the generic name first, then the brand, then aliases.
 */
export function matchMedicineToPrescription(
  cartItem: CartItem,
  medicine: Medicine | undefined,
  prescriptionMedicines: OcrMedicineLine[],
): { matched: boolean; basis?: PrescriptionMatchBasis } {
  const candidates: { term: string; basis: PrescriptionMatchBasis }[] = [];

  if (medicine) {
    candidates.push({ term: medicine.genericName, basis: "generic" });
    candidates.push({ term: medicine.name, basis: "brand" });
    for (const alias of medicine.rxAliases ?? []) {
      candidates.push({ term: alias, basis: "alias" });
    }
  }

  candidates.push({ term: cartItem.name, basis: "brand" });

  for (const line of prescriptionMedicines) {
    const lineText = [line.rawText, line.brand, line.generic, line.strength]
      .filter(Boolean)
      .join(" ");

    for (const candidate of candidates) {
      if (containsAllTokens(lineText, candidate.term)) {
        return { matched: true, basis: candidate.basis };
      }
    }
  }

  return { matched: false };
}

export interface MatchResult {
  verification: PrescriptionVerification;
  /** Cart items covered by the prescription. */
  matchedItemIds: string[];
  /** Cart items not found on the prescription. */
  unmatchedItemNames: string[];
}

/**
 * Matches every prescription-only cart item against a scanned
 * prescription.
 *
 * Only prescription-only items are considered — an OTC medicine never
 * needs a prescription.
 */
export function matchPrescriptionToCart(params: {
  attachmentId: string;
  prescriptionMedicines: OcrMedicineLine[];
  cartItems: CartItem[];
  medicines: Medicine[];
}): MatchResult {
  const { attachmentId, prescriptionMedicines, cartItems, medicines } = params;

  const matchedItems: PrescriptionVerification["matchedItems"] = [];
  const unmatchedItems: string[] = [];
  const matchedItemIds: string[] = [];

  const rxItems = cartItems.filter((item) => item.requiresRx);

  for (const item of rxItems) {
    const medicine = medicines.find((m) => m.id === item.medicineId);
    const result = matchMedicineToPrescription(item, medicine, prescriptionMedicines);

    if (result.matched && result.basis) {
      matchedItems.push({ medicineId: item.medicineId, matchedOn: result.basis });
      matchedItemIds.push(item.medicineId);
    } else {
      unmatchedItems.push(item.name);
    }
  }

  const status: PrescriptionVerification["status"] =
    rxItems.length === 0
      ? "matched"
      : unmatchedItems.length === 0
        ? "matched"
        : matchedItems.length > 0
          ? "partial"
          : "failed";

  return {
    verification: {
      attachmentId,
      status,
      matchedItems,
      unmatchedItems,
      verifiedAt: new Date().toISOString(),
    },
    matchedItemIds,
    unmatchedItemNames: unmatchedItems,
  };
}

/**
 * Checks a prescription's quantity against the policy limit.
 * Returns the maximum allowed quantity, or null when there is no limit.
 */
export function quantityLimitFor(
  medicine: Medicine | undefined,
): number | null {
  return medicine?.rxPolicy?.maxQuantityPerOrder ?? null;
}
