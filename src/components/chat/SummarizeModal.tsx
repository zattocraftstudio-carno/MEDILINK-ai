"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  ConsultationSummary,
  Doctor,
  Profile,
  Severity,
  SummaryMedication,
  SummarySymptom,
} from "@/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { TextLink } from "@/components/ui/TextLink";
import { useToast } from "@/components/ui/Toast";
import { createWhatsAppUrl, generateDoctorBookingMessage } from "@/lib/whatsapp";
import { KNOWN_SPECIALTIES } from "@/lib/consult-summary";
import { AlertTriangle, Plus, X, Copy, Check, Stethoscope, Phone, ArrowLeft } from "lucide-react";

interface SummarizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** The summary being edited. Null while one is being generated. */
  summary: ConsultationSummary | null;
  /** True while the summary is being generated. */
  isGenerating?: boolean;
  /** Message shown when generation failed. */
  errorMessage?: string | null;
  /**
   * Where the summary came from, as reported by the server.
   * "model" / "fallback" are machine output; "human" means the patient
   * wrote it themselves.
   */
  summarySource?: "model" | "fallback" | "human";
  /** True once the patient has confirmed the summary. */
  summaryVerified?: boolean;
  /** Doctors matching the suggested specialty. */
  doctors: Doctor[];
  /** The patient's profile, used to build the exact booking message. */
  profile: Partial<Profile>;
  /** Called when the patient edits a field. */
  onUpdate: (patch: Partial<ConsultationSummary>) => void;
  /** Called when the patient asks to find a doctor. */
  onFindDoctor?: () => void;
  /**
   * Called when the patient asks for the full doctor directory.
   * When it is not given the modal falls back to the /doctors route.
   */
  onBrowseDoctors?: () => void;
  /** Called when the patient opens WhatsApp with the summary attached. */
  onBook?: (doctor: Doctor, message: string) => void;
  isPremium?: boolean;
}

type Step = "edit" | "doctors" | "preview";

const SEVERITIES: { value: Severity; label: string }[] = [
  { value: "mild", label: "Mild" },
  { value: "moderate", label: "Moderate" },
  { value: "severe", label: "Severe" },
  { value: "unknown", label: "Not stated" },
];

/**
 * "Summarize for Doctor" — the chat-to-doctor handover.
 *
 * The model proposes; the patient disposes. Every field is editable,
 * the exact WhatsApp text is shown before anything is sent, and the
 * patient is never auto-sent anything (safety invariant S-4).
 */
export const SummarizeModal: React.FC<SummarizeModalProps> = ({
  isOpen,
  onClose,
  summary,
  isGenerating,
  errorMessage,
  summarySource,
  summaryVerified,
  doctors,
  profile,
  onUpdate,
  onFindDoctor,
  onBrowseDoctors,
  onBook,
  isPremium,
}) => {
  const { showToast } = useToast();
  const router = useRouter();
  const [step, setStep] = useState<Step>("edit");
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep("edit");
      setSelectedDoctor(null);
      setCopied(false);
    }
  }, [isOpen]);

  const redFlags = summary?.redFlags ?? [];

  /**
   * Where the summary came from.
   *
   * The server tells us ("model" | "fallback") and stamps it on the
   * summary; the explicit prop wins when it is given. The old behaviour
   * gated the "please check this" notice on `summary.confidence < 0.6` —
   * a number the MODEL supplied, so a model that claimed high confidence
   * could hide the only warning the patient got. The notice is now
   * driven by the provenance, and `confidence` is only ever supplementary.
   */
  const stampedProvenance = (
    summary as (ConsultationSummary & { provenance?: string }) | null
  )?.provenance;
  const provenance: "model" | "fallback" | "human" =
    summarySource ??
    (stampedProvenance === "model" ||
    stampedProvenance === "fallback" ||
    stampedProvenance === "human"
      ? stampedProvenance
      : "model");
  const isMachineGenerated = provenance !== "human" && !summaryVerified;

  /**
   * The preview is produced by the very same template that will be sent,
   * so what the patient reads is exactly what the doctor receives (S-4).
   */
  const message = useMemo(() => {
    if (!summary || !selectedDoctor) return "";
    return generateDoctorBookingMessage({
      profile,
      doctor: selectedDoctor,
      clinicalSummary: summary,
      isPremium,
    });
  }, [summary, selectedDoctor, profile, isPremium]);

  if (!summary && !isGenerating) return null;

  const updateSymptom = (index: number, patch: Partial<SummarySymptom>) => {
    if (!summary) return;
    const symptoms = summary.symptoms.map((symptom, i) =>
      i === index ? { ...symptom, ...patch } : symptom,
    );
    onUpdate({ symptoms });
  };

  const addSymptom = () => {
    if (!summary) return;
    onUpdate({
      symptoms: [...summary.symptoms, { name: "", severity: "unknown" }],
    });
  };

  const removeSymptom = (index: number) => {
    if (!summary) return;
    onUpdate({ symptoms: summary.symptoms.filter((_, i) => i !== index) });
  };

  const updateMedication = (index: number, patch: Partial<SummaryMedication>) => {
    if (!summary) return;
    onUpdate({
      currentMedications: summary.currentMedications.map((medication, i) =>
        i === index ? { ...medication, ...patch } : medication,
      ),
    });
  };

  const addMedication = () => {
    if (!summary) return;
    onUpdate({
      currentMedications: [...summary.currentMedications, { name: "", source: "chat" }],
    });
  };

  const removeMedication = (index: number) => {
    if (!summary) return;
    onUpdate({
      currentMedications: summary.currentMedications.filter((_, i) => i !== index),
    });
  };

  const addAllergy = () => {
    if (!summary) return;
    onUpdate({ allergies: [...summary.allergies, ""] });
  };

  const updateAllergy = (index: number, value: string) => {
    if (!summary) return;
    onUpdate({ allergies: summary.allergies.map((a, i) => (i === index ? value : a)) });
  };

  const removeAllergy = (index: number) => {
    if (!summary) return;
    onUpdate({ allergies: summary.allergies.filter((_, i) => i !== index) });
  };

  const handleCopy = async () => {
    if (!summary) return;
    try {
      await navigator.clipboard.writeText(
        [
          `Chief complaint: ${summary.chiefComplaint}`,
          `Duration: ${summary.duration}`,
          `Severity: ${summary.severity}`,
          `Symptoms: ${summary.symptoms.map((s) => s.name).join(", ")}`,
          `Medications: ${summary.currentMedications.map((m) => m.name).join(", ")}`,
          `Allergies: ${summary.allergies.join(", ") || "None"}`,
        ].join("\n"),
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showToast("Summary copied to clipboard.", "success");
    } catch {
      showToast("Could not copy the summary.", "error");
    }
  };

  /**
   * The full doctor directory, not the shortlist of this specialty.
   *
   * The parent may want to close the modal before the route changes, so
   * the navigation is handed over to it; without a parent the modal
   * pushes the route itself.
   */
  const browseDoctors = onBrowseDoctors ?? (() => router.push("/doctors"));

  /**
   * Leaving for the directory — copy the summary first.
   *
   * The directory does not carry the summary, so without this the
   * patient would lose it on the way out. The copy happens here, inside
   * the modal, so it works for the parent-handled and the fallback route
   * alike.
   */
  const handleBrowseDoctors = async () => {
    await handleCopy();
    browseDoctors();
  };

  /* ── Generating / error states ─────────────────────────────────── */
  if (isGenerating) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Preparing your summary">
        <div className="py-8 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-brand-light flex items-center justify-center mb-4">
            <Stethoscope className="w-6 h-6 text-brand animate-pulse" />
          </div>
          <p className="text-[15px] font-semibold text-text-primary mb-1">
            Reading your conversation…
          </p>
          <p className="text-[13px] text-text-muted max-w-[280px]">
            We are pulling out your symptoms, how long they have lasted, and what
            you are already taking.
          </p>
        </div>
      </Modal>
    );
  }

  if (!summary) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Summary unavailable">
        <div className="flex items-start gap-3 bg-accent-soft/60 border border-accent/30 rounded-[12px] p-4">
          <AlertTriangle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
          <p className="text-[14px] text-text-primary leading-relaxed">
            {errorMessage ?? "We could not prepare a summary right now."}
          </p>
        </div>
      </Modal>
    );
  }

  /* ── Step: doctors ────────────────────────────────────────────── */
  if (step === "doctors") {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`${summary.suggestedSpecialty} doctors`}
        maxWidth="max-w-[560px]"
        footer={
          <div className="w-full flex flex-wrap items-center justify-between gap-3">
            <Button
              variant="ghost"
              size="m"
              onClick={() => setStep("edit")}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Back to summary
            </Button>
            <Button size="m" onClick={handleBrowseDoctors}>
              Browse all doctors →
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-[13px] text-text-muted">
            Your summary will be attached to the booking message. You can review it
            before WhatsApp opens.
          </p>

          {doctors.length === 0 ? (
            <div className="text-center py-8 text-text-muted text-[14px]">
              No {summary.suggestedSpecialty} doctors are listed right now.
            </div>
          ) : (
            doctors.map((doctor) => (
              <div
                key={doctor.id}
                className="p-4 border border-border-soft rounded-[12px] flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="font-bold text-[15px] text-text-primary truncate">
                    {doctor.name}
                  </div>
                  <div className="text-[13px] text-text-muted">
                    {doctor.specialty} · {doctor.experienceYears} yrs · ৳
                    {isPremium ? Math.round(doctor.feeWhatsapp * 0.8) : doctor.feeWhatsapp}
                  </div>
                </div>
                <Button
                  size="s"
                  onClick={() => {
                    setSelectedDoctor(doctor);
                    setStep("preview");
                  }}
                  leftIcon={<Phone className="w-4 h-4" />}
                >
                  Book
                </Button>
              </div>
            ))
          )}
        </div>
      </Modal>
    );
  }

  /* ── Step: WhatsApp preview ───────────────────────────────────── */
  if (step === "preview" && selectedDoctor) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Check before sending"
        maxWidth="max-w-[560px]"
        footer={
          <div className="w-full flex items-center gap-3">
            <Button
              variant="ghost"
              size="m"
              onClick={() => setStep("doctors")}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Back
            </Button>
            <Button
              size="m"
              className="flex-1"
              variant="whatsapp"
              onClick={() => onBook?.(selectedDoctor, message)}
            >
              Open WhatsApp
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-[13px] text-text-muted">
            This is exactly what {selectedDoctor.name} will receive. Nothing is sent
            until you tap the button.
          </p>
          <pre className="whitespace-pre-wrap text-[13px] leading-relaxed bg-bg-soft border border-border-soft rounded-[12px] p-4 text-text-primary max-h-[45vh] overflow-y-auto">
            {message}
          </pre>
        </div>
      </Modal>
    );
  }

  /* ── Step: edit ───────────────────────────────────────────────── */
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Summary for your doctor"
      maxWidth="max-w-[560px]"
      footer={
        <div className="w-full flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="m" onClick={handleCopy} leftIcon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}>
            {copied ? "Copied" : "Copy"}
          </Button>
          <TextLink onClick={handleBrowseDoctors} className="text-[13px] whitespace-nowrap">
            Browse the full directory →
          </TextLink>
          <Button size="m" className="flex-1 min-w-[140px]" onClick={() => onFindDoctor?.() ?? setStep("doctors")}>
            Find a doctor
          </Button>
        </div>
      }
    >
      <div className="space-y-5 max-h-[65vh] overflow-y-auto pr-1">
        {/* Red flags */}
        {redFlags.length > 0 && (
          <div
            className="bg-emergency-soft/50 border border-emergency/30 rounded-[12px] p-3.5"
            role="alert"
          >
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-emergency shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="text-[13px] font-bold text-emergency-dark">
                  Possible emergency signs detected
                </div>
                <div className="text-[12px] text-text-primary mt-0.5">
                  {redFlags.join(", ")}
                </div>
                <a
                  href="tel:999"
                  className="inline-flex items-center gap-1.5 mt-2 text-[13px] font-bold text-emergency-dark underline"
                >
                  Call 999 now
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Machine-output notice — driven by the server's provenance, not by
            the model's own confidence score. */}
        {isMachineGenerated && (
          <div className="flex items-start gap-2.5 bg-accent-soft/60 border border-accent/30 rounded-[12px] p-3">
            <AlertTriangle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <div>
              <p className="text-[13px] text-text-primary leading-relaxed">
                {provenance === "fallback"
                  ? "This summary was put together from your chat without the AI assistant. Please check it against your conversation before sending."
                  : "This summary was written by the AI. Please check it against your conversation before sending — your doctor will verify everything with you."}
              </p>
              {summary.confidence < 0.6 && (
                <p className="text-[12px] text-text-muted mt-1">
                  The AI was only {Math.round(summary.confidence * 100)}% sure about
                  some of this — check those parts first.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Chief complaint */}
        <div>
          <label
            htmlFor="summary-chief-complaint"
            className="block text-[13px] font-bold text-text-primary mb-1.5"
          >
            Chief complaint
          </label>
          <input
            id="summary-chief-complaint"
            value={summary.chiefComplaint}
            onChange={(e) => onUpdate({ chiefComplaint: e.target.value })}
            className="w-full h-11 px-3 rounded-md border border-border-soft bg-white text-[14px] text-text-primary focus:outline-none focus:ring-1 focus:ring-brand"
            placeholder="Fever with headache for 3 days"
          />
        </div>

        {/* Duration + Severity */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="summary-duration"
              className="block text-[13px] font-bold text-text-primary mb-1.5"
            >
              Duration
            </label>
            <input
              id="summary-duration"
              value={summary.duration}
              onChange={(e) => onUpdate({ duration: e.target.value })}
              className="w-full h-11 px-3 rounded-md border border-border-soft bg-white text-[14px] text-text-primary focus:outline-none focus:ring-1 focus:ring-brand"
              placeholder="3 days"
            />
          </div>
          <div>
            <label
              htmlFor="summary-severity"
              className="block text-[13px] font-bold text-text-primary mb-1.5"
            >
              Severity
            </label>
            <select
              id="summary-severity"
              value={summary.severity}
              onChange={(e) => onUpdate({ severity: e.target.value as Severity })}
              className="w-full h-11 px-3 rounded-md border border-border-soft bg-white text-[14px] text-text-primary focus:outline-none focus:ring-1 focus:ring-brand"
            >
              {SEVERITIES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Symptoms */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-bold text-text-primary">Symptoms</span>
            <button
              type="button"
              onClick={addSymptom}
              className="text-[12px] font-bold text-brand inline-flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>
          <div className="space-y-2">
            {summary.symptoms.length === 0 && (
              <p className="text-[13px] text-text-muted">No symptoms listed yet.</p>
            )}
            {summary.symptoms.map((symptom, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  id={`summary-symptom-${index}`}
                  aria-label={`Symptom ${index + 1}`}
                  value={symptom.name}
                  onChange={(e) => updateSymptom(index, { name: e.target.value })}
                  placeholder="Symptom"
                  className="flex-1 h-10 px-3 rounded-md border border-border-soft bg-white text-[13px] text-text-primary focus:outline-none focus:ring-1 focus:ring-brand"
                />
                <select
                  aria-label={`Severity for symptom ${index + 1}`}
                  value={symptom.severity}
                  onChange={(e) =>
                    updateSymptom(index, { severity: e.target.value as Severity })
                  }
                  className="w-[110px] h-10 px-2 rounded-md border border-border-soft bg-white text-[13px] text-text-primary focus:outline-none focus:ring-1 focus:ring-brand"
                >
                  {SEVERITIES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removeSymptom(index)}
                  aria-label="Remove symptom"
                  className="w-9 h-9 rounded-md flex items-center justify-center text-text-muted hover:bg-emergency-soft hover:text-emergency transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Current medications */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-bold text-text-primary">
              Current medications
            </span>
            <button
              type="button"
              onClick={addMedication}
              className="text-[12px] font-bold text-brand inline-flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>
          <div className="space-y-2">
            {summary.currentMedications.length === 0 && (
              <p className="text-[13px] text-text-muted">Nothing listed yet.</p>
            )}
            {summary.currentMedications.map((medication, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  aria-label={`Medicine ${index + 1}`}
                  value={medication.name}
                  onChange={(e) => updateMedication(index, { name: e.target.value })}
                  placeholder="Medicine"
                  className="flex-1 h-10 px-3 rounded-md border border-border-soft bg-white text-[13px] text-text-primary focus:outline-none focus:ring-1 focus:ring-brand"
                />
                <input
                  aria-label={`Dose for medicine ${index + 1}`}
                  value={medication.dose ?? ""}
                  onChange={(e) => updateMedication(index, { dose: e.target.value })}
                  placeholder="Dose"
                  className="w-[110px] h-10 px-3 rounded-md border border-border-soft bg-white text-[13px] text-text-primary focus:outline-none focus:ring-1 focus:ring-brand"
                />
                <button
                  type="button"
                  onClick={() => removeMedication(index)}
                  aria-label="Remove medication"
                  className="w-9 h-9 rounded-md flex items-center justify-center text-text-muted hover:bg-emergency-soft hover:text-emergency transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Allergies */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-bold text-text-primary">Allergies</span>
            <button
              type="button"
              onClick={addAllergy}
              className="text-[12px] font-bold text-brand inline-flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {summary.allergies.map((allergy, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1.5 h-9 pl-3 pr-1.5 rounded-full bg-accent-soft text-[13px] font-semibold text-[#92620A]"
              >
                <input
                  aria-label={`Allergy ${index + 1}`}
                  value={allergy}
                  onChange={(e) => updateAllergy(index, e.target.value)}
                  className="bg-transparent border-none outline-none w-[110px] text-[13px] font-semibold text-[#92620A] placeholder:text-[#92620A]/60"
                  placeholder="Allergy"
                />
                <button
                  type="button"
                  onClick={() => removeAllergy(index)}
                  aria-label="Remove allergy"
                  className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-accent/20"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
            {summary.allergies.length === 0 && (
              <span className="text-[13px] text-text-muted">None recorded.</span>
            )}
          </div>
        </div>

        {/* Specialty */}
        <div>
          <label
            htmlFor="summary-specialty"
            className="block text-[13px] font-bold text-text-primary mb-1.5"
          >
            Suggested specialty
          </label>
          <select
            id="summary-specialty"
            value={summary.suggestedSpecialty}
            onChange={(e) => onUpdate({ suggestedSpecialty: e.target.value })}
            className="w-full h-11 px-3 rounded-md border border-border-soft bg-white text-[14px] text-text-primary focus:outline-none focus:ring-1 focus:ring-brand"
          >
            {KNOWN_SPECIALTIES.map((specialty) => (
              <option key={specialty} value={specialty}>
                {specialty}
              </option>
            ))}
          </select>
        </div>

        <p className="text-[12px] text-text-muted leading-relaxed">
          This summary was prepared from your chat with Dr MediLink. It is not a
          diagnosis. Your doctor will verify everything with you.
        </p>
      </div>
    </Modal>
  );
};
