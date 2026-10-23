"use client";

import React, { useRef, useState } from "react";
import type { CartItem, Medicine, OcrMedicineLine } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { useAttachmentStore } from "@/stores/useAttachmentStore";
import { useCartStore } from "@/stores/useCartStore";
import { matchPrescriptionToCart } from "@/lib/prescription-match";
import {
  AttachmentError,
  createAttachmentId,
  inferAttachmentKind,
  normaliseImage,
  putBlob,
} from "@/lib/attachments";
import { createWhatsAppUrl } from "@/lib/whatsapp";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Upload,
  X,
  MessageSquare,
} from "lucide-react";

interface PrescriptionUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** The prescription-only items currently in the cart. */
  rxItems: CartItem[];
  /** The full catalogue, used for alias matching. */
  medicines: Medicine[];
}

type Step = "upload" | "scanning" | "result" | "error";

/**
 * Prescription upload and verification.
 *
 * The scan is a PRE-CHECK. Even a full match leaves the order in
 * "awaiting-verification" — a human pharmacist confirms before dispatch.
 */
export const PrescriptionUploadModal: React.FC<PrescriptionUploadModalProps> = ({
  isOpen,
  onClose,
  rxItems,
  medicines,
}) => {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addAttachment = useAttachmentStore((s) => s.addAttachment);
  const updateAttachment = useAttachmentStore((s) => s.updateAttachment);
  const setPrescription = useCartStore((s) => s.setPrescription);

  const [step, setStep] = useState<Step>("upload");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attachmentId, setAttachmentId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [prescriptionMedicines, setPrescriptionMedicines] = useState<OcrMedicineLine[]>([]);
  const [confirmed, setConfirmed] = useState(false);

  const reset = () => {
    setStep("upload");
    setErrorMessage(null);
    setAttachmentId(null);
    setPreviewUrl(null);
    setPrescriptionMedicines([]);
    setConfirmed(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const runScan = async (file: File, dataUrl: string, id: string) => {
    setStep("scanning");
    try {
      const response = await fetch("/api/vision/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl, task: "prescription", attachmentId: id }),
      });

      const payload = await response.json();

      if (payload?.ok) {
        const medicines = (payload.document?.medicines ?? []) as OcrMedicineLine[];
        updateAttachment(id, {
          kind: "prescription",
          document: payload.document ?? null,
          ocrConfidence: payload.confidence ?? null,
          rawText: payload.rawText ?? "",
          warnings: payload.warnings ?? [],
          model: payload.model,
        });
        setPrescriptionMedicines(medicines);
        setStep("result");
        return;
      }

      setErrorMessage(
        payload?.message ??
          "We could not read this prescription clearly. Please retake the photo, or ask a pharmacist to verify it for you.",
      );
      setStep("error");
    } catch {
      setErrorMessage(
        "We could not read this prescription clearly. Please check your connection, or ask a pharmacist to verify it for you.",
      );
      setStep("error");
    }
  };

  const handleFile = async (file: File) => {
    try {
      const normalised = await normaliseImage(file);
      const id = createAttachmentId();

      await putBlob(id, normalised.blob);

      const record = {
        id,
        url: URL.createObjectURL(normalised.blob),
        type: normalised.mimeType,
        timestamp: Date.now(),
        kind: inferAttachmentKind(file.name) as "prescription",
        source: "ocr" as const,
        fileName: file.name,
        sizeBytes: normalised.sizeBytes,
        verified: false,
        document: null,
        warnings: [],
      };
      addAttachment(record);
      setAttachmentId(id);
      setPreviewUrl(record.url);

      await runScan(file, normalised.dataUrl, id);
    } catch (error) {
      showToast(
        error instanceof AttachmentError
          ? error.message
          : "We could not process that image. Please try another photo.",
        "error",
      );
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void handleFile(file);
    event.target.value = "";
  };

  const match = matchPrescriptionToCart({
    attachmentId: attachmentId ?? "",
    prescriptionMedicines,
    cartItems: rxItems,
    medicines,
  });

  const handleConfirm = () => {
    if (!attachmentId) return;
    setPrescription(match.verification);
    updateAttachment(attachmentId, { verified: true });
    showToast("Prescription submitted for verification.", "success");
    handleClose();
  };

  const handleAskPharmacist = () => {
    const message = `*MediLink Pharmacy — Prescription Verification Request*

*Items in my cart:*
${rxItems.map((item) => `• ${item.name} (x${item.quantity})`).join("\n")}

I have a prescription for these medicines. Please confirm the order and let me know how to send the prescription photo.

Thank you.`;
    const url = createWhatsAppUrl(message);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Prescription verification"
      maxWidth="max-w-[520px]"
      footer={
        step === "result" ? (
          <div className="w-full flex items-center gap-3">
            <Button variant="ghost" size="m" onClick={handleAskPharmacist} leftIcon={<MessageSquare className="w-4 h-4" />}>
              Ask a pharmacist
            </Button>
            <Button size="m" className="flex-1" onClick={handleConfirm} disabled={!confirmed}>
              Submit for verification
            </Button>
          </div>
        ) : step === "error" ? (
          <div className="w-full flex items-center gap-3">
            <Button variant="ghost" size="m" onClick={handleAskPharmacist} leftIcon={<MessageSquare className="w-4 h-4" />}>
              Ask a pharmacist
            </Button>
            <Button size="m" className="flex-1" onClick={() => setStep("upload")} leftIcon={<RefreshCw className="w-4 h-4" />}>
              Try again
            </Button>
          </div>
        ) : undefined
      }
    >
      <div className="space-y-4">
        {/* ── Upload ── */}
        {step === "upload" && (
          <>
            <p className="text-[13px] text-text-muted leading-relaxed">
              Upload a clear photo of your prescription. We read it so the
              pharmacist can check it quickly — a human still confirms before
              anything is dispatched.
            </p>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full p-8 rounded-[16px] border-2 border-dashed border-border-soft hover:border-brand-soft bg-bg-soft/50 flex flex-col items-center text-center transition-colors"
            >
              <Upload className="w-7 h-7 text-brand mb-3" />
              <span className="text-[15px] font-bold text-text-primary">
                Take a photo or choose an image
              </span>
              <span className="text-[12px] text-text-muted mt-1">
                JPG, PNG or WEBP · up to 8 MB
              </span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
              aria-hidden="true"
              tabIndex={-1}
            />

            <div className="flex items-start gap-2.5 p-3 rounded-[12px] bg-bg-soft border border-border-soft">
              <AlertTriangle className="w-4 h-4 text-text-muted shrink-0 mt-0.5" />
              <p className="text-[12px] text-text-muted leading-relaxed">
                Your prescription is stored on this device only. It is shared
                with the pharmacy partner so a pharmacist can verify it.
              </p>
            </div>
          </>
        )}

        {/* ── Scanning ── */}
        {step === "scanning" && (
          <div className="py-8 flex flex-col items-center text-center">
            {previewUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Your prescription"
                className="w-32 h-40 object-cover rounded-[12px] border border-border-soft mb-4"
              />
            )}
            <Loader2 className="w-7 h-7 text-brand animate-spin mb-3" />
            <p className="text-[15px] font-semibold text-text-primary mb-1">
              Reading your prescription…
            </p>
            <p className="text-[13px] text-text-muted max-w-[260px]">
              We are looking for the medicine names and the prescriber&rsquo;s
              details.
            </p>
          </div>
        )}

        {/* ── Result ── */}
        {step === "result" && (
          <>
            <p className="text-[13px] text-text-muted leading-relaxed">
              Here is what we read. Check it against the original before
              continuing.
            </p>

            <div className="rounded-[12px] border border-border-soft overflow-hidden">
              {rxItems.map((item) => {
                const matched = match.matchedItemIds.includes(item.medicineId);
                return (
                  <div
                    key={item.medicineId}
                    className="flex items-center justify-between gap-3 px-3.5 py-3 border-b border-border-soft last:border-b-0"
                  >
                    <div className="min-w-0">
                      <div className="text-[14px] font-semibold text-text-primary truncate">
                        {item.name}
                      </div>
                      <div className="text-[12px] text-text-muted">
                        {matched
                          ? "Found on your prescription"
                          : "Not found on your prescription"}
                      </div>
                    </div>
                    {matched ? (
                      <Badge variant="success" icon={<CheckCircle2 className="w-3 h-3" />}>
                        Matched
                      </Badge>
                    ) : (
                      <Badge variant="warn" icon={<X className="w-3 h-3" />}>
                        Not found
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>

            {prescriptionMedicines.length > 0 && (
              <div>
                <div className="text-[12px] font-bold uppercase tracking-wider text-text-muted mb-2">
                  Read from your prescription
                </div>
                <ul className="space-y-1">
                  {prescriptionMedicines.map((line, index) => (
                    <li key={index} className="text-[13px] text-text-primary">
                      • {line.brand || line.generic || line.rawText}
                      {line.dose && (
                        <span className="text-text-muted"> — {line.dose}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {match.unmatchedItemNames.length > 0 && (
              <div className="flex items-start gap-2.5 p-3 rounded-[12px] bg-accent-soft/60 border border-accent/25">
                <AlertTriangle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <p className="text-[12px] text-text-primary leading-relaxed">
                  {match.unmatchedItemNames.join(", ")} could not be found on the
                  prescription. You can still submit — the pharmacist will
                  review it — or remove the item from your cart.
                </p>
              </div>
            )}

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-[#17786F]"
              />
              <span className="text-[13px] text-text-primary leading-relaxed">
                I confirm this prescription is mine and the details above are
                correct.
              </span>
            </label>
          </>
        )}

        {/* ── Error ── */}
        {step === "error" && (
          <div className="flex items-start gap-3 p-4 rounded-[12px] bg-accent-soft/60 border border-accent/25">
            <AlertTriangle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-[14px] text-text-primary leading-relaxed">
                {errorMessage}
              </p>
              <p className="text-[12px] text-text-muted mt-2">
                You can also ask our pharmacist to verify the order directly on
                WhatsApp.
              </p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
