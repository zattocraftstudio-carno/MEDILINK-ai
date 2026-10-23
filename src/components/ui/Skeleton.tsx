import React from "react";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  rounded?: "sm" | "md" | "lg" | "xl" | "full";
  /** Announced to assistive tech while the placeholder is on screen. */
  label?: string;
}

const roundedStyles: Record<NonNullable<SkeletonProps["rounded"]>, string> = {
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  full: "rounded-full",
};

export const Skeleton: React.FC<SkeletonProps> = ({
  rounded = "sm",
  className = "",
  style,
  label,
  ...props
}) => {
  return (
    <>
      <div
        // `aria-hidden` is placed AFTER the spread so a caller cannot
        // accidentally expose a decorative placeholder to a screen reader.
        className={`skeleton-shimmer animate-skeleton ${roundedStyles[rounded]} ${className}`}
        style={style}
        {...props}
        aria-hidden="true"
      />
      {label && <span className="sr-only">{label}</span>}
    </>
  );
};
