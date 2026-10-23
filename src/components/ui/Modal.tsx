"use client";

import React, { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { useFocusTrap } from "@/lib/useFocusTrap";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = "max-w-[480px]",
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
    <div
      className="fixed inset-0 z-[70] grid place-items-center p-4 bg-[rgba(26,43,76,0.45)] animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
    >
      <div
        ref={panelRef}
        className={`w-full ${maxWidth} max-h-[88vh] bg-white rounded-[20px] shadow-lg flex flex-col overflow-hidden animate-modalRise focus:outline-none`}
        tabIndex={-1}
      >
        {title && (
          <div className="px-6 py-5 border-b border-border-soft flex items-center justify-between shrink-0">
            <h3 id={titleId} className="text-lg font-bold text-text-primary">
              {title}
            </h3>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="w-11 h-11 flex items-center justify-center rounded-md text-text-muted hover:bg-bg-soft hover:text-text-primary focus-visible:outline-2 focus-visible:outline-brand transition-colors"
            >
              <X className="w-5 h-5" strokeWidth={1.5} aria-hidden="true" />
            </button>
          </div>
        )}
        <div className="p-6 overflow-y-auto">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-border-soft flex items-center justify-end gap-3 shrink-0 bg-white">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
