/**
 * Unit tests for prescription ↔ cart matching (F-4).
 *
 * Matching is a PRE-CHECK, never an authorisation: even a perfect
 * match must still leave the order awaiting pharmacist verification.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  matchMedicineToPrescription,
  matchPrescriptionToCart,
  quantityLimitFor,
} from "../../src/lib/prescription-match.ts";
import type { CartItem, Medicine, OcrMedicineLine } from "../../src/types/index.ts";

const amoxicillin: Medicine = {
  id: "med_010",
  name: "Amoxicillin 500mg",
  genericName: "Amoxicillin",
  category: "Infection",
  price: 10,
  stock: 50,
  requiresRx: true,
  image: "",
  description: "",
  rxClass: "antibiotic",
  rxPolicy: { requireImage: true, maxQuantityPerOrder: 30 },
  rxAliases: ["amoxycillin", "amox", "mox"],
};

const ciprofloxacin: Medicine = {
  id: "med_011",
  name: "Ciprofloxacin 500mg",
  genericName: "Ciprofloxacin",
  category: "Infection",
  price: 14,
  stock: 40,
  requiresRx: true,
  image: "",
  description: "",
  rxClass: "antibiotic",
  rxPolicy: { requireImage: true, maxQuantityPerOrder: 20 },
  rxAliases: ["cipro", "ciprofloxacin"],
};

const paracetamol: Medicine = {
  id: "med_001",
  name: "Paracetamol 500mg",
  genericName: "Paracetamol",
  category: "Fever & Pain",
  price: 2.5,
  stock: 200,
  requiresRx: false,
  image: "",
  description: "",
};

function cartItem(medicine: Medicine, quantity = 1): CartItem {
  return {
    medicineId: medicine.id,
    name: medicine.name,
    price: medicine.price,
    quantity,
    requiresRx: medicine.requiresRx,
  };
}

function line(rawText: string, brand?: string, generic?: string): OcrMedicineLine {
  return { rawText, brand, generic, confidence: 0.9 };
}

/* ────────────────────────────────────────────────────────────────────
   Single-medicine matching
   ──────────────────────────────────────────────────────────────────── */

test("matches a prescription line by generic name", () => {
  const result = matchMedicineToPrescription(
    cartItem(amoxicillin),
    amoxicillin,
    [line("Amoxicillin 500mg (1+0+1)", "Amox", "Amoxicillin")],
  );
  assert.equal(result.matched, true);
  assert.ok(["generic", "brand", "alias"].includes(result.basis as string));
});

test("matches a prescription line that only shows the brand", () => {
  const result = matchMedicineToPrescription(
    cartItem(amoxicillin),
    amoxicillin,
    [line("Amox 500mg (1+0+1)", "Amox")],
  );
  assert.equal(result.matched, true);
});

test("does not match an unrelated medicine", () => {
  const result = matchMedicineToPrescription(
    cartItem(amoxicillin),
    amoxicillin,
    [line("Napa 500mg (1+0+1)", "Napa", "Paracetamol")],
  );
  assert.equal(result.matched, false);
});

test("matches an alias", () => {
  const result = matchMedicineToPrescription(
    cartItem(ciprofloxacin),
    ciprofloxacin,
    [line("Cipro 500mg", "Cipro")],
  );
  assert.equal(result.matched, true);
});

/* ────────────────────────────────────────────────────────────────────
   Cart matching
   ──────────────────────────────────────────────────────────────────── */

test("a fully covered cart is matched", () => {
  const result = matchPrescriptionToCart({
    attachmentId: "att_1",
    prescriptionMedicines: [line("Amoxicillin 500mg (1+0+1)", "Amox", "Amoxicillin")],
    cartItems: [cartItem(amoxicillin)],
    medicines: [amoxicillin, paracetamol],
  });

  assert.equal(result.verification.status, "matched");
  assert.equal(result.matchedItemIds.length, 1);
  assert.equal(result.unmatchedItemNames.length, 0);
});

test("a partly covered cart is partial and names the gap", () => {
  const result = matchPrescriptionToCart({
    attachmentId: "att_1",
    prescriptionMedicines: [line("Amoxicillin 500mg (1+0+1)", "Amox", "Amoxicillin")],
    cartItems: [cartItem(amoxicillin), cartItem(ciprofloxacin)],
    medicines: [amoxicillin, ciprofloxacin],
  });

  assert.equal(result.verification.status, "partial");
  assert.equal(result.matchedItemIds.length, 1);
  assert.deepEqual(result.unmatchedItemNames, ["Ciprofloxacin 500mg"]);
});

test("a cart with nothing covered fails", () => {
  const result = matchPrescriptionToCart({
    attachmentId: "att_1",
    prescriptionMedicines: [line("Napa 500mg", "Napa", "Paracetamol")],
    cartItems: [cartItem(amoxicillin)],
    medicines: [amoxicillin],
  });

  assert.equal(result.verification.status, "failed");
  assert.deepEqual(result.unmatchedItemNames, ["Amoxicillin 500mg"]);
});

test("an over-the-counter medicine never needs a prescription", () => {
  const result = matchPrescriptionToCart({
    attachmentId: "att_1",
    prescriptionMedicines: [],
    cartItems: [cartItem(paracetamol)],
    medicines: [paracetamol],
  });

  // Only Rx items are considered, so an empty cart of OTC items is fine.
  assert.equal(result.verification.status, "matched");
  assert.equal(result.unmatchedItemNames.length, 0);
});

test("the verification records when it was made", () => {
  const result = matchPrescriptionToCart({
    attachmentId: "att_1",
    prescriptionMedicines: [line("Amoxicillin 500mg", "Amox", "Amoxicillin")],
    cartItems: [cartItem(amoxicillin)],
    medicines: [amoxicillin],
  });

  assert.ok(result.verification.verifiedAt);
  assert.equal(result.verification.attachmentId, "att_1");
});

/* ────────────────────────────────────────────────────────────────────
   Quantity limits
   ──────────────────────────────────────────────────────────────────── */

test("the quantity limit comes from the medicine policy", () => {
  assert.equal(quantityLimitFor(amoxicillin), 30);
  assert.equal(quantityLimitFor(ciprofloxacin), 20);
  assert.equal(quantityLimitFor(paracetamol), null);
});
