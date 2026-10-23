"use client";

import React, { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { useFocusTrap } from "@/lib/useFocusTrap";

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  width = "max-w-[520px]",
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useFocusTrap(panelRef, isOpen);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden" role="dialog" aria-modal="true" aria-labelledby={title ? titleId : undefined}>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[rgba(26,43,76,0.45)] animate-fadeIn transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Container positioning: desktop right drawer, mobile bottom sheet */}
      <div className="fixed inset-0 pointer-events-none flex sm:justify-end items-end sm:items-stretch">
        <div
          ref={panelRef}
          className={`pointer-events-auto w-full ${width} bg-white shadow-lg flex flex-col overflow-hidden max-h-[85vh] sm:max-h-full sm:h-full rounded-t-[24px] sm:rounded-t-none animate-sheetSlide sm:animate-drawerSlide focus:outline-none`}
          tabIndex={-1}
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-border-soft flex items-center justify-between shrink-0 bg-white">
            <h3 id={titleId} className="text-lg font-bold text-text-primary">
              {title || ""}
            </h3>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close drawer"
              className="w-11 h-11 flex items-center justify-center rounded-md text-text-muted hover:bg-bg-soft hover:text-text-primary focus-visible:outline-2 focus-visible:outline-brand transition-colors"
            >
              <X className="w-5 h-5" strokeWidth={1.5} aria-hidden="true" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto flex-1">{children}</div>

          {/* Sticky Footer */}
          {footer && (
            <div className="px-6 py-4 border-t border-border-soft flex items-center justify-end gap-3 shrink-0 bg-white sticky bottom-0">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
