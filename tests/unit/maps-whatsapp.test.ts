/**
 * Unit tests for the Maps helpers (F-6) and the WhatsApp templates.
 *
 * The Directions deep link must always be usable — it needs no API key
 * and no network, so it is the guaranteed fallback when the Routes API
 * is unavailable.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  buildDirectionsUrl,
  buildLocationUrl,
  buildPlaceUrl,
  formatRouteDistance,
  formatTravelSummary,
  formatTravelTime,
  sortByRoute,
} from "../../src/lib/maps.ts";
import {
  generateDoctorBookingMessage,
  generatePharmacyOrderMessage,
  createWhatsAppUrl,
} from "../../src/lib/whatsapp.ts";
import type { Doctor, ConsultationSummary, RouteLeg } from "../../src/types/index.ts";

/* ────────────────────────────────────────────────────────────────────
   Directions links
   ──────────────────────────────────────────────────────────────────── */

test("the directions link carries the origin and the driving mode", () => {
  const url = buildDirectionsUrl({
    origin: { latitude: 23.8103, longitude: 90.4125 },
    destination: { latitude: 23.7256, longitude: 90.3987 },
    travelMode: "driving",
  });

  assert.ok(url.startsWith("https://www.google.com/maps/dir/?"));
  assert.ok(url.includes("origin=23.8103%2C90.4125"));
  assert.ok(url.includes("destination=23.7256%2C90.3987"));
  assert.ok(url.includes("travelmode=driving"));
});

test("the directions link still works without a known origin", () => {
  const url = buildDirectionsUrl({
    origin: null,
    destination: { latitude: 23.7256, longitude: 90.3987 },
  });

  assert.ok(url.includes("destination=23.7256%2C90.3987"));
  assert.ok(!url.includes("origin="));
});

test("a place id takes precedence over raw coordinates", () => {
  const url = buildDirectionsUrl({
    destination: { latitude: 23.7256, longitude: 90.3987 },
    placeId: "ChIJ12345",
  });

  assert.ok(url.includes("destination_place_id=ChIJ12345"));
});

test("the place and location links are well formed", () => {
  assert.ok(
    buildPlaceUrl({ coordinates: { latitude: 23.7, longitude: 90.4 } }).startsWith(
      "https://www.google.com/maps/search/?",
    ),
  );
  assert.equal(
    buildLocationUrl({ latitude: 23.7, longitude: 90.4 }),
    "https://maps.google.com/?q=23.7,90.4",
  );
});

/* ────────────────────────────────────────────────────────────────────
   Formatting
   ──────────────────────────────────────────────────────────────────── */

test("travel time is formatted in minutes and hours", () => {
  assert.equal(formatTravelTime(9), "9 min");
  assert.equal(formatTravelTime(72), "1 hr 12 mins");
  assert.equal(formatTravelTime(120), "2 hr");
  assert.equal(formatTravelTime(null), "");
});

test("route distance is formatted in metres below a kilometre", () => {
  assert.equal(formatRouteDistance(900), "900 m");
  assert.equal(formatRouteDistance(12600), "12.6 km");
  assert.equal(formatRouteDistance(null), "");
});

test("road time and straight-line distance are never worded the same", () => {
  const roadLeg: RouteLeg = {
    id: "hos_001",
    durationMinutes: 14,
    durationText: "14 mins",
    distanceMeters: 12600,
    distanceText: "12.6 km",
    straightLineKm: 1.4,
  };

  const straightLeg: RouteLeg = {
    id: "hos_002",
    durationMinutes: null,
    durationText: null,
    distanceMeters: null,
    distanceText: null,
    straightLineKm: 1.4,
  };

  const road = formatTravelSummary(roadLeg);
  const straight = formatTravelSummary(straightLeg);

  assert.ok(road.includes("14 min"));
  assert.ok(road.includes("12.6 km"));
  assert.ok(!road.includes("straight-line"));

  assert.ok(straight.includes("straight-line"));
  assert.ok(!straight.includes("min"));
});

test("hospitals sort by road time when it is known", () => {
  const legs: RouteLeg[] = [
    {
      id: "far",
      durationMinutes: 20,
      durationText: null,
      distanceMeters: 20000,
      distanceText: null,
      straightLineKm: 1.0,
    },
    {
      id: "near",
      durationMinutes: 5,
      durationText: null,
      distanceMeters: 4000,
      distanceText: null,
      straightLineKm: 5.0,
    },
  ];

  const sorted = sortByRoute([{ id: "far" }, { id: "near" }], legs);
  assert.deepEqual(
    sorted.map((entry) => entry.id),
    ["near", "far"],
  );
});

test("unknown routes fall back to straight-line ordering", () => {
  const legs: RouteLeg[] = [
    {
      id: "b",
      durationMinutes: null,
      durationText: null,
      distanceMeters: null,
      distanceText: null,
      straightLineKm: 3.0,
    },
    {
      id: "a",
      durationMinutes: null,
      durationText: null,
      distanceMeters: null,
      distanceText: null,
      straightLineKm: 1.0,
    },
  ];

  const sorted = sortByRoute([{ id: "b" }, { id: "a" }], legs);
  assert.deepEqual(
    sorted.map((entry) => entry.id),
    ["a", "b"],
  );
});

/* ────────────────────────────────────────────────────────────────────
   WhatsApp templates
   ──────────────────────────────────────────────────────────────────── */

const doctor: Doctor = {
  id: "doc_001",
  name: "Dr. Nusrat Jahan",
  specialty: "General Physician",
  experienceYears: 12,
  feeWhatsapp: 300,
  feeVideo: 500,
  whatsappNumber: "8801700000000",
  area: "Mirpur, Dhaka",
  city: "Dhaka",
  latitude: 23.82,
  longitude: 90.36,
  rating: 4.8,
  reviewCount: 120,
  bio: "",
  education: [],
  availability: "Evening",
  reviews: [],
};

const summary: ConsultationSummary = {
  id: "sum_1",
  sessionId: "s_1",
  createdAt: 1_700_000_000_000,
  chiefComplaint: "Fever with headache for 3 days",
  symptoms: [
    { name: "Fever", severity: "moderate", duration: "3 days" },
    { name: "Headache", severity: "mild", duration: "3 days" },
  ],
  duration: "3 days",
  severity: "moderate",
  redFlags: [],
  currentMedications: [
    { name: "Napa (Paracetamol) 500mg", dose: "1 tablet", frequency: "twice daily", source: "chat" },
  ],
  allergies: ["Penicillin"],
  knownConditions: [],
  investigations: [],
  suggestedSpecialty: "General Physician",
  patientQuestions: [],
  confidence: 0.9,
};

test("the booking message carries the full clinical summary", () => {
  const message = generateDoctorBookingMessage({
    profile: { name: "Karim Mia", phone: "01712345678", allergies: ["Penicillin"] },
    doctor,
    clinicalSummary: summary,
  });

  assert.ok(message.includes("*CHAT SUMMARY (prepared by Dr MediLink)*"));
  assert.ok(message.includes("*Chief complaint:* Fever with headache for 3 days"));
  assert.ok(message.includes("*Duration:* 3 days"));
  assert.ok(message.includes("*Severity:* Moderate"));
  assert.ok(message.includes("• Fever — moderate (3 days)"));
  assert.ok(message.includes("*Current medications:*"));
  assert.ok(message.includes("Napa (Paracetamol) 500mg"));
  assert.ok(message.includes("*Allergies:* Penicillin"));
});

test("without a summary the message keeps the old shape", () => {
  const message = generateDoctorBookingMessage({
    profile: { name: "Karim Mia" },
    doctor,
  });

  assert.ok(!message.includes("CHAT SUMMARY"));
  assert.ok(message.includes("*Symptoms:* General Consultation"));
});

test("the summary's chief complaint fills the symptoms line", () => {
  const message = generateDoctorBookingMessage({
    profile: { name: "Karim Mia" },
    doctor,
    clinicalSummary: summary,
  });

  assert.ok(message.includes("*Symptoms:* Fever with headache for 3 days"));
});

test("the pharmacy order message states the prescription status", () => {
  const message = generatePharmacyOrderMessage({
    profile: { name: "Karim Mia", phone: "01712345678" },
    items: [{ medicineId: "med_010", name: "Amoxicillin 500mg", price: 10, quantity: 1 }],
    subtotal: 10,
    discount: 0,
    discountPercent: 0,
    total: 40,
    prescription: {
      attachmentId: "att_1",
      status: "matched",
      matchedItems: [{ medicineId: "med_010", matchedOn: "generic" }],
      unmatchedItems: [],
      verifiedAt: "2026-10-20T00:00:00.000Z",
    },
  });

  assert.ok(message.includes("*Prescription:* Attached"));
  assert.ok(message.includes("Pharmacist confirmation required before dispatch."));
});

test("an order with no prescription has no prescription line", () => {
  const message = generatePharmacyOrderMessage({
    profile: { name: "Karim Mia" },
    items: [{ medicineId: "med_001", name: "Napa", price: 2.5, quantity: 1 }],
    subtotal: 2.5,
    discount: 0,
    discountPercent: 0,
    total: 32.5,
  });

  assert.ok(!message.includes("*Prescription:*"));
});

test("an empty recipient falls back to the MediLink number", () => {
  // `wa.me/?text=…` opens WhatsApp's error page — a dead end (audit CC-002).
  const url = createWhatsAppUrl("hello", "");
  assert.ok(url.includes("wa.me/8801811389672?"));
});
