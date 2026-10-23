"use client";

import React from "react";
import { PhoneCall } from "lucide-react";

export const SOSButton: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center my-8">
      <div className="relative flex items-center justify-center">
        {/* Pulsing Outer Rings */}
        <div className="absolute w-52 h-52 sm:w-60 sm:h-60 rounded-full bg-emergency/15 animate-sosPulse pointer-events-none" />
        <div className="absolute w-44 h-44 sm:w-52 sm:h-52 rounded-full bg-emergency/25 animate-ping pointer-events-none duration-1000" />

        {/* SOS Action Button */}
        <a
          href="tel:999"
          className="relative z-10 w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-emergency hover:bg-emergency-dark text-white flex flex-col items-center justify-center shadow-xl active:scale-95 transition-all duration-150 focus-visible:outline-4 focus-visible:outline-emergency select-none group"
          aria-label="Call 999 National Emergency Service"
        >
          <PhoneCall className="w-8 h-8 sm:w-10 sm:h-10 mb-1 group-hover:scale-110 transition-transform" />
          <span className="font-heading font-extrabold text-[32px] sm:text-[38px] leading-none tracking-tight">
            999
          </span>
          <span className="text-[12px] sm:text-[13px] font-bold uppercase tracking-wider mt-1 opacity-90">
            Call Now
          </span>
        </a>
      </div>
      <p className="text-[14px] text-text-muted font-medium mt-6 text-center">
        Tap to dial Bangladesh National Emergency Hotline (Toll-Free)
      </p>
    </div>
  );
};
