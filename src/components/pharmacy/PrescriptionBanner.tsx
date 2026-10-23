"use client";

import React from "react";
import type { CartItem, PrescriptionVerification } from "@/types";
import { Button } from "@/components/ui/Button";
import { AlertTriangle, CheckCircle2, Clock, FileWarning, Upload } from "lucide-react";

interface PrescriptionBannerProps {
  /** The prescription-only items currently in the cart. */
  rxItems: CartItem[];
  /** The uploaded prescription, if any. */
  prescription?: PrescriptionVerification;
  /** Opens the upload / verification modal. */
  onUpload: () => void;
}

/**
 * "Prescription Verification Required" — the mandatory banner.
 *
 * Shown whenever the cart holds a prescription-only medicine. The copy
 * changes with the verification state, but the banner itself never
 * disappears while an Rx item is in the cart (PRD §4.3).
 */
export const PrescriptionBanner: React.FC<PrescriptionBannerProps> = ({
  rxItems,
  prescription,
  onUpload,
}) => {
  if (!rxItems.length) return null;

  const names = rxItems.map((item) => item.name).join(", ");

  const state = (() => {
    if (!prescription) {
      return {
        tone: "required" as const,
        icon: <FileWarning className="w-4 h-4 text-accent" />,
        title: "Prescription Verification Required",
        body: `${names} ${rxItems.length === 1 ? "is" : "are"} a prescription-only medicine. Upload a photo of your prescription to continue — our pharmacist will verify it before dispatch.`,
        action: "Upload Prescription",
      };
    }

    if (prescription.status === "matched") {
      return {
        tone: "matched" as const,
        icon: <CheckCircle2 className="w-4 h-4 text-success-dark" />,
        title: "Prescription matched",
        body: `${names} ${prescription.matchedItems.length === 1 ? "was" : "were"} found on your prescription. A pharmacist will still confirm before dispatch.`,
        action: "Replace Prescription",
      };
    }

    if (prescription.status === "partial") {
      return {
        tone: "partial" as const,
        icon: <AlertTriangle className="w-4 h-4 text-accent" />,
        title: "Prescription uploaded — awaiting verification",
        body: `${prescription.unmatchedItems.join(", ")} ${prescription.unmatchedItems.length === 1 ? "was" : "were"} not found on your prescription. A pharmacist will confirm before dispatch.`,
        action: "Replace Prescription",
      };
    }

    return {
      tone: "pending" as const,
      icon: <Clock className="w-4 h-4 text-accent" />,
      title: "Prescription uploaded — awaiting verification",
      body: "We have your prescription. A pharmacist will confirm it before dispatch — you can still complete your order.",
      action: "Replace Prescription",
    };
  })();

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`rounded-[12px] p-3.5 border ${
        state.tone === "matched"
          ? "bg-success-soft/50 border-success/25"
          : "bg-accent-soft/60 border-accent/30"
      }`}
    >
      <div className="flex items-start gap-2.5">
        <span className="shrink-0 mt-0.5">{state.icon}</span>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-bold text-text-primary">{state.title}</div>
          <p className="text-[13px] text-text-muted mt-1 leading-relaxed">
            {state.body}
          </p>
          <Button
            size="s"
            variant="primary"
            className="mt-3"
            onClick={onUpload}
            leftIcon={<Upload className="w-4 h-4" />}
          >
            {state.action}
          </Button>
        </div>
      </div>
    </div>
  );
};
