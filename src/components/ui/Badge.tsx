import React from "react";

export type BadgeVariant = "info" | "warn" | "danger" | "success";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  icon?: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  info: "bg-brand-light text-brand-dark",
  // A readable amber-on-cream pair. The hard-coded hex did not scale with
  // the theme and failed contrast on some backgrounds.
  warn: "bg-accent-soft text-[#8A5A08]",
  danger: "bg-emergency-soft text-emergency-dark",
  success: "bg-success-soft text-success-dark",
};

export const Badge: React.FC<BadgeProps> = ({
  variant = "info",
  icon,
  className = "",
  children,
  ...props
}) => {
  return (
    <span
      // `className` comes AFTER the variant styles so a caller can still
      // override them — previously the caller's className was applied
      // first and silently beat the variant.
      className={`inline-flex items-center gap-1 h-[22px] px-2.5 rounded-full text-[11px] font-bold uppercase tracking-[0.02em] select-none ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  );
};
