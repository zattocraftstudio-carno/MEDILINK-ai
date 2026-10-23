import type {
  CartItem,
  ConsultationSummary,
  Doctor,
  PrescriptionVerification,
  Profile,
} from "@/types";
import { renderSummaryForWhatsApp } from "./consult-summary";

const DEFAULT_WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "8801811389672";

/**
 * Builds a wa.me deep link.
 *
 * A default parameter only applies when the argument is `undefined`, so an
 * EMPTY STRING used to slip through and produce `https://wa.me/?text=…` —
 * wa.me's "no number" error page. An empty or malformed number now falls
 * back to the business number, and a number that is not a valid
 * international one is rejected outright rather than producing a link that
 * silently goes nowhere.
 */
export function createWhatsAppUrl(
  message: string,
  phoneNumber?: string | null
): string {
  const candidate = (phoneNumber ?? "").replace(/[^\d+]/g, "");
  const digits = candidate.replace(/\D/g, "");

  // Not a usable number (empty, or not international) -> use the default.
  if (!digits || digits.length < 8) {
    return `https://wa.me/${DEFAULT_WHATSAPP_NUMBER}?text=${encodeURIComponent(
      message
    )}`;
  }

  // Strip a leading 00 (international prefix written with zeros).
  const normalised = digits.startsWith("00") ? digits.slice(2) : digits;

  return `https://wa.me/${normalised}?text=${encodeURIComponent(message)}`;
}

/**
 * 12.1 Pharmacy Order Template (Content Sheet v2 §12.1)
 */
export function generatePharmacyOrderMessage(params: {
  profile: Partial<Profile>;
  items: CartItem[];
  subtotal: number;
  discount: number;
  discountPercent: number;
  total: number;
  /** Optional demo-payment details appended to the order message */
  paymentMethodLabel?: string;
  transactionId?: string;
  /** Prescription verification result — appended when the cart had Rx items */
  prescription?: PrescriptionVerification;
}): string {
  const {
    profile,
    items,
    subtotal,
    discount,
    discountPercent,
    total,
    paymentMethodLabel,
    transactionId,
    prescription,
  } = params;

  const itemsList = items
    .map((item) => `• ${item.name} (x${item.quantity}) = ৳${item.price * item.quantity}`)
    .join("\n");

  const paymentLine =
    paymentMethodLabel
      ? `\n*Payment:* ${paymentMethodLabel}${
          transactionId ? ` — ${transactionId}` : ""
        }`
      : "";

  const prescriptionLine = prescription
    ? `\n*Prescription:* Attached — ${
        prescription.status === "matched"
          ? `${prescription.matchedItems.length} medicine(s) verified on the prescription.`
          : prescription.status === "partial"
            ? "Partially verified — please check the unmatched medicine(s)."
            : "Uploaded — awaiting manual verification."
      } Pharmacist confirmation required before dispatch.`
    : "";

  return `*MediLink Pharmacy Order*
*Name:* ${profile.name || "Guest"}
*Phone:* ${profile.phone || "Not provided"}
*Address:* ${profile.area || "Not specified"}
*Items:*
${itemsList}${prescriptionLine}
*Subtotal:* ৳${subtotal}
*Discount (${discountPercent}%):* -৳${discount}
*Delivery:* ৳30
*Total:* ৳${total}${paymentLine}
Please confirm availability and delivery time.`;
}

/**
 * 12.2 Doctor Booking WhatsApp Chat Template (Content Sheet v2 §12.2)
 */
export function generateDoctorBookingMessage(params: {
  profile: Partial<Profile>;
  doctor: Doctor;
  selectedDate?: string;
  selectedTime?: string;
  symptoms?: string;
  isPremium?: boolean;
  /** Clinical handover summary appended to the message */
  clinicalSummary?: ConsultationSummary | null;
}): string {
  const { profile, doctor, selectedDate, selectedTime, symptoms, isPremium, clinicalSummary } = params;
  const allergiesStr =
    profile.allergies && profile.allergies.length > 0
      ? profile.allergies.join(", ")
      : "None";

  const summaryBlock = clinicalSummary ? `\n${renderSummaryForWhatsApp(clinicalSummary)}` : "";
  const dateLine = selectedDate ? `\n*Preferred Date:* ${selectedDate}` : "";

  return `*MediLink Doctor Booking*
*Patient:* ${profile.name || "Guest"}
*Phone:* ${profile.phone || "Not provided"}
*Doctor:* ${doctor.name}
*Specialty:* ${doctor.specialty}
*Consultation Type:* WhatsApp Chat
*Fee:* ৳${doctor.feeWhatsapp}${dateLine}
*Preferred Time:* ${selectedTime || doctor.availability || "Any time"}
*Symptoms:* ${symptoms || clinicalSummary?.chiefComplaint || "General Consultation"}
*Known Allergies:* ${allergiesStr}
*Plan:* ${isPremium ? "Premium" : "Free"}${summaryBlock}
Please confirm my appointment.`;
}

/**
 * 12.3 Doctor Booking Video Call Template (Content Sheet v2 §12.3)
 */
export function generateDoctorVideoBookingMessage(params: {
  profile: Partial<Profile>;
  doctor: Doctor;
  selectedDate?: string;
  selectedTime?: string;
  symptoms?: string;
  isPremium?: boolean;
  /** Clinical handover summary appended to the message */
  clinicalSummary?: ConsultationSummary | null;
}): string {
  const { profile, doctor, selectedDate, selectedTime, symptoms, isPremium, clinicalSummary } = params;
  const allergiesStr =
    profile.allergies && profile.allergies.length > 0
      ? profile.allergies.join(", ")
      : "None";

  const summaryBlock = clinicalSummary ? `\n${renderSummaryForWhatsApp(clinicalSummary)}` : "";

  return `*MediLink Video Consultation Request*
*Patient:* ${profile.name || "Guest"}
*Phone:* ${profile.phone || "Not provided"}
*Doctor:* ${doctor.name}
*Specialty:* ${doctor.specialty}
*Consultation Type:* Video Call
*Fee:* ৳${doctor.feeVideo}
*Preferred Date:* ${selectedDate || "Tomorrow"}
*Preferred Time:* ${selectedTime || "Evening"}
*Symptoms:* ${symptoms || clinicalSummary?.chiefComplaint || "General Consultation"}
*Known Allergies:* ${allergiesStr}
*Plan:* ${isPremium ? "Premium" : "Free"}${summaryBlock}
Please schedule my video consultation.`;
}

/**
 * 12.4 Premium Subscription Request Template (Content Sheet v2 §12.4)
 */
export function generatePremiumRequestMessage(params: {
  profile?: Partial<Profile>;
  currentPlan?: string;
}): string {
  const { profile, currentPlan = "Free" } = params;

  return `*MediLink Premium Subscription Request*
*Name:* ${profile?.name || "Guest"}
*Phone:* ${profile?.phone || "Not provided"}
*Current Plan:* ${currentPlan}
*Requested Plan:* Premium (৳500/month)
Please activate my Premium subscription. I will complete the payment as instructed.`;
}

/**
 * 12.5 Emergency SOS Alert Template (Content Sheet v2 §12.5)
 */
export function generateEmergencyAlertMessage(params: {
  profile?: Partial<Profile>;
  lat?: number;
  lng?: number;
}): string {
  const { profile, lat, lng } = params;
  const locationUrl =
    lat !== undefined && lng !== undefined
      ? `https://maps.google.com/?q=${lat},${lng}`
      : "Location not available";

  const allergiesStr =
    profile?.allergies && profile.allergies.length > 0
      ? profile.allergies.join(", ")
      : "None";

  const diseasesStr =
    profile?.diseases && profile.diseases.length > 0
      ? profile.diseases.join(", ")
      : "None";

  return `*MediLink Emergency Alert*
*Name:* ${profile?.name || "Guest"}
*Phone:* ${profile?.phone || "Not provided"}
*Location:* ${locationUrl}
*Known Allergies:* ${allergiesStr}
*Known Conditions:* ${diseasesStr}
URGENT: Please send help immediately.`;
}
