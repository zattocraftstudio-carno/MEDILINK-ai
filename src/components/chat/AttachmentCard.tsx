"use client";

import React from "react";
import type { Attachment, OcrLabReport, OcrPrescription } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  FileText,
  FlaskConical,
  ImageIcon,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Trash2,
  ScanLine,
} from "lucide-react";

interface AttachmentCardProps {
  attachment: Attachment;
  /** True while the OCR request is still running. */
  isScanning?: boolean;
  /** Set when the scan failed and manual entry is offered instead. */
  errorMessage?: string | null;
  onConfirm?: () => void;
  onRetry?: () => void;
  onRemove?: () => void;
  onManualEntry?: () => void;
}

const KIND_LABEL: Record<Attachment["kind"], string> = {
  prescription: "Prescription",
  report: "Test Report",
  photo: "Photo",
};

const KIND_ICON: Record<Attachment["kind"], React.ReactNode> = {
  prescription: <FileText className="w-3.5 h-3.5" />,
  report: <FlaskConical className="w-3.5 h-3.5" />,
  photo: <ImageIcon className="w-3.5 h-3.5" />,
};

const FLAG_STYLES: Record<string, string> = {
  H: "bg-emergency-soft text-emergency-dark",
  L: "bg-accent-soft text-[#92620A]",
  N: "bg-success-soft text-success-dark",
  A: "bg-brand-light text-brand-dark",
};

/**
 * Renders an uploaded document: the scan state, the machine-extracted
 * contents, and the confirmation control.
 *
 * SAFETY INVARIANT S-2 — the extraction is machine output. It stays
 * visually marked as unverified until the patient confirms it, and it
 * is never presented as a clinical document in its own right.
 */
export const AttachmentCard: React.FC<AttachmentCardProps> = ({
  attachment,
  isScanning,
  errorMessage,
  onConfirm,
  onRetry,
  onRemove,
  onManualEntry,
}) => {
  const prescription = attachment.document as OcrPrescription | undefined;
  const report = attachment.document as OcrLabReport | undefined;
  const isPrescription =
    attachment.kind === "prescription" && Array.isArray(prescription?.medicines);
  const isReport = attachment.kind === "report" && Array.isArray(report?.tests);

  const confidencePct =
    typeof attachment.ocrConfidence === "number"
      ? Math.round(attachment.ocrConfidence * 100)
      : null;

  return (
    <div className="bg-white border border-border-soft rounded-[14px] overflow-hidden shadow-sm">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 p-3 border-b border-border-soft bg-bg-soft/60">
        <div className="w-12 h-12 rounded-[10px] overflow-hidden bg-white border border-border-soft shrink-0 flex items-center justify-center">
          {attachment.url && attachment.url.startsWith("blob:") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={attachment.url}
              alt={KIND_LABEL[attachment.kind]}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-text-muted">{KIND_ICON[attachment.kind]}</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-bold text-text-primary">
              {KIND_LABEL[attachment.kind]}
            </span>
            {attachment.source === "manual" ? (
              <Badge variant="info">Entered by you</Badge>
            ) : attachment.verified ? (
              <Badge variant="success" icon={<CheckCircle2 className="w-3 h-3" />}>
                Confirmed
              </Badge>
            ) : (
              <Badge variant="warn">Machine-read</Badge>
            )}
          </div>
          <div className="text-[11px] text-text-muted mt-0.5 truncate">
            {attachment.fileName || "Uploaded document"}
            {confidencePct !== null && ` · ${confidencePct}% confidence`}
          </div>
        </div>

        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove attachment"
            className="w-9 h-9 rounded-md flex items-center justify-center text-text-muted hover:bg-emergency-soft hover:text-emergency transition-colors shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── Body ── */}
      <div className="p-3 space-y-3">
        {isScanning && (
          <div className="flex items-center gap-2.5 text-[13px] text-text-muted py-2">
            <Loader2 className="w-4 h-4 animate-spin text-brand shrink-0" />
            <span>Reading your document…</span>
          </div>
        )}

        {!isScanning && errorMessage && (
          <div className="flex items-start gap-2.5 bg-accent-soft/60 border border-accent/30 rounded-[10px] p-3">
            <AlertTriangle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-[13px] text-text-primary leading-relaxed">
                {errorMessage}
              </p>
              {(onManualEntry || onRetry) && (
                <div className="flex items-center gap-3 mt-2">
                  {onManualEntry && (
                    <button
                      type="button"
                      onClick={onManualEntry}
                      className="text-[12px] font-semibold text-brand underline"
                    >
                      Enter details manually
                    </button>
                  )}
                  {onRetry && (
                    <button
                      type="button"
                      onClick={onRetry}
                      className="text-[12px] font-semibold text-brand underline inline-flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" /> Try again
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {!isScanning && !errorMessage && isPrescription && (
          <div className="space-y-3">
            {(prescription.doctorName || prescription.clinic || prescription.date) && (
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12px]">
                {prescription.doctorName && (
                  <>
                    <dt className="text-text-muted">Prescriber</dt>
                    <dd className="text-text-primary font-semibold truncate">
                      {prescription.doctorName}
                    </dd>
                  </>
                )}
                {prescription.clinic && (
                  <>
                    <dt className="text-text-muted">Clinic</dt>
                    <dd className="text-text-primary font-semibold truncate">
                      {prescription.clinic}
                    </dd>
                  </>
                )}
                {prescription.date && (
                  <>
                    <dt className="text-text-muted">Date</dt>
                    <dd className="text-text-primary font-semibold">{prescription.date}</dd>
                  </>
                )}
              </dl>
            )}

            {prescription.medicines.length > 0 && (
              <div className="rounded-[10px] border border-border-soft overflow-hidden">
                <div className="px-3 py-2 bg-bg-soft text-[11px] font-bold uppercase tracking-wider text-text-muted">
                  Medicines ({prescription.medicines.length})
                </div>
                <ul className="divide-y divide-border-soft">
                  {prescription.medicines.map((medicine, index) => (
                    <li key={index} className="px-3 py-2">
                      <div className="text-[13px] font-semibold text-text-primary">
                        {medicine.brand || medicine.generic || medicine.rawText}
                        {medicine.strength && (
                          <span className="text-text-muted font-medium">
                            {" "}
                            {medicine.strength}
                          </span>
                        )}
                      </div>
                      <div className="text-[12px] text-text-muted mt-0.5">
                        {[medicine.dose, medicine.frequency, medicine.duration]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {prescription.notes && (
              <p className="text-[12px] text-text-muted italic">“{prescription.notes}”</p>
            )}
          </div>
        )}

        {!isScanning && !errorMessage && isReport && (
          <div className="rounded-[10px] border border-border-soft overflow-hidden">
            <div className="px-3 py-2 bg-bg-soft text-[11px] font-bold uppercase tracking-wider text-text-muted">
              Test results ({report.tests.length})
            </div>
            <ul className="divide-y divide-border-soft">
              {report.tests.map((test, index) => (
                <li key={index} className="px-3 py-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-text-primary truncate">
                      {test.name}
                    </div>
                    {test.referenceRange && (
                      <div className="text-[11px] text-text-muted">Ref {test.referenceRange}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[13px] font-bold text-text-primary">
                      {test.value ?? "—"}
                      {test.unit && (
                        <span className="text-text-muted font-medium"> {test.unit}</span>
                      )}
                    </span>
                    {test.flag && (
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          FLAG_STYLES[test.flag] ?? FLAG_STYLES.N
                        }`}
                      >
                        {test.flag}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!isScanning && !errorMessage && !isPrescription && !isReport && (
          <div className="flex items-center gap-2 text-[13px] text-text-muted py-1">
            <ScanLine className="w-4 h-4" />
            <span>No structured details could be read from this document.</span>
          </div>
        )}

        {/* Warnings */}
        {attachment.warnings && attachment.warnings.length > 0 && (
          <div className="space-y-1.5">
            {attachment.warnings.map((warning, index) => (
              <div
                key={index}
                className="flex items-start gap-2 text-[12px] text-text-muted leading-relaxed"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                <span>{warning.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* Footer actions */}
        {!isScanning && !errorMessage && attachment.source === "ocr" && (
          <div className="flex items-center gap-2 pt-1 border-t border-border-soft">
            {onConfirm && (
              <Button
                size="s"
                variant={attachment.verified ? "secondary" : "primary"}
                onClick={onConfirm}
                disabled={attachment.verified}
                leftIcon={<CheckCircle2 className="w-4 h-4" />}
              >
                {attachment.verified ? "Confirmed" : "Confirm & use"}
              </Button>
            )}
            {!attachment.verified && (
              <span className="text-[11px] text-text-muted">
                Check against the original before sharing.
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
