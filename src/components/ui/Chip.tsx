import React, { forwardRef } from "react";
import { X } from "lucide-react";

export interface ChipProps {
  label: string;
  active?: boolean;
  removable?: boolean;
  onRemove?: () => void;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  icon?: React.ReactNode;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  active = false,
  removable = false,
  onRemove,
  onClick,
  disabled = false,
  className = "",
  icon,
}) => {
  return (
    <span className="inline-flex items-center gap-1.5">
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        aria-pressed={active}
        className={`inline-flex items-center h-10 px-3.5 rounded-full border-[1.5px] text-[13px] font-semibold transition-all duration-160 cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50 disabled:cursor-not-allowed ${
          active
            ? "bg-brand border-brand text-white shadow-sm hover:bg-brand-dark hover:border-brand-dark"
            : "bg-white border-border text-text-muted hover:border-brand-soft hover:text-text-primary"
        } ${className}`}
      >
        {icon && <span className="shrink-0">{icon}</span>}
        <span>{label}</span>
      </button>
      {/* A real sibling <button> rather than a role="button" span nested
          inside the chip's own <button> — nesting interactive elements is
          invalid and creates two focus stops in one control. */}
      {removable && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${label}`}
          className={`inline-flex items-center justify-center w-6 h-6 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
            active ? "text-white/80 hover:text-white" : "text-text-muted hover:text-text-primary"
          }`}
        >
          <X className="w-3.5 h-3.5" strokeWidth={2} aria-hidden="true" />
        </button>
      )}
    </span>
  );
};
