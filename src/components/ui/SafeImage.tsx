"use client";

import React, { useState } from "react";
import { Pill, Stethoscope, User } from "lucide-react";

interface SafeImageProps {
  src?: string;
  alt: string;
  fallbackType?: "initials" | "pill" | "doctor" | "logo";
  initials?: string;
  className?: string;
  fill?: boolean;
  width?: number;
  height?: number;
}

export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt,
  fallbackType = "logo",
  initials = "??",
  className = "",
  fill,
  width,
  height,
}) => {
  const [error, setError] = useState(false);

  // If no src or failed to load, render resilient fallback UI
  if (!src || error) {
    return (
      <div
        className={`flex items-center justify-center bg-bg-soft text-text-muted select-none ${className}`}
        style={fill ? { width: "100%", height: "100%" } : { width, height }}
      >
        {fallbackType === "initials" && (
          <span className="font-heading font-extrabold text-[15px] sm:text-[17px] text-brand uppercase tracking-wider">
            {initials}
          </span>
        )}
        {fallbackType === "pill" && (
          <div className="flex flex-col items-center justify-center text-brand/70">
            <Pill className="w-10 h-10" strokeWidth={1.5} />
          </div>
        )}
        {fallbackType === "doctor" && (
          <div className="flex items-center justify-center text-brand">
            <Stethoscope className="w-6 h-6" strokeWidth={1.5} />
          </div>
        )}
        {fallbackType === "logo" && (
          <span className="font-heading font-extrabold text-brand text-[15px]">MediLink</span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={`object-contain ${className}`}
      onError={() => setError(true)}
      loading="lazy"
    />
  );
};
