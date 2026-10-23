"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Stethoscope, Pill, Siren, ArrowRight, Check } from "lucide-react";
import { useIntersectionOnce } from "@/lib/useIntersection";
import { useLanguageStore } from "@/stores/useLanguageStore";
import { translations } from "@/lib/i18n";

export const FinalCTASection: React.FC = () => {
  const [isRevealed, setIsRevealed] = useState(false);
  const { ref } = useIntersectionOnce(0.1);
  const { language } = useLanguageStore();
  const t = translations[language];

  useEffect(() => {
    setIsRevealed(true);
  }, []);

  const button1 = t.finalCta.buttons[0] || {
    title: "Find a Doctor",
    subtitle: "Browse 500+ verified specialists",
  };
  const button2 = t.finalCta.buttons[1] || {
    title: "Pharmacy",
    subtitle: "Order medicines · Delivery under 2 hrs",
  };
  const button3 = t.finalCta.buttons[2] || {
    title: "Emergency Support",
    subtitle: "1-Tap 999 & Hospital Dispatch",
  };

  return (
    <section id="cta" ref={ref} className="py-[80px] lg:py-[120px] px-[5%] bg-bg-soft">
      <div className="max-w-[1200px] mx-auto">
        {/* Banner Card */}
        <div
           className={`cta-banner-container relative transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
             isRevealed ? "reveal is-visible opacity-100 translate-y-0 scale-100 animate-popIn" : "reveal"
           }`}
        >
          <div className="relative z-[2] flex flex-col lg:flex-row gap-12 lg:gap-10 items-center justify-between">
            {/* Left Column — 55% */}
            <div className="lg:w-[55%] w-full">
              <span className="inline-block font-sans font-medium text-[11px] tracking-[0.12em] uppercase text-brand bg-brand/10 border border-brand/20 rounded-full px-3.5 py-1 mb-4">
                {t.finalCta.badge}
              </span>

              <h2 className="cta-headline-gradient font-heading font-extrabold text-[clamp(28px,3.8vw,46px)] leading-[1.15] mt-1 mb-4">
                {t.finalCta.title}
              </h2>

              <p className="font-sans font-normal text-[15px] md:text-[16px] text-text-muted leading-[1.7] mb-6">
                {t.finalCta.subtitle}
              </p>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                {t.finalCta.features.map((feat, i) => (
                  <React.Fragment key={feat}>
                    {i > 0 && <span className="text-brand font-bold">·</span>}
                    <span className="inline-flex items-center gap-1.5 font-sans font-semibold text-[13px] text-brand">
                      <Check className="w-4 h-4 stroke-[3]" /> {feat}
                    </span>
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Right Column — 45% (The 3 Action Buttons) */}
            <div className="lg:w-[45%] w-full flex flex-col gap-3.5">
              {/* Button 1: Find a Doctor */}
              <Link
                href="/doctors"
                className="group action-btn btn-teal-solid relative flex items-center justify-between px-6 py-4 rounded-2xl bg-brand text-white shadow-[0_4px_16px_rgba(23,120,111,0.25)] hover:bg-brand-dark hover:shadow-[0_10px_26px_rgba(23,120,111,0.38)] hover:-translate-y-1 active:translate-y-0 active:scale-[0.98] transition-all duration-300 overflow-hidden touch-manipulation select-none"
              >
                <div className="flex items-center gap-3.5 relative z-10">
                  <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                    <Stethoscope className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="font-heading font-bold text-[16px] leading-tight">
                      {button1.title}
                    </div>
                    <div className="text-[12px] text-white/80 font-medium">
                      {button1.subtitle}
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-white relative z-10 transition-transform duration-300 group-hover:translate-x-1" />
                <span className="btn-shine-sweep" />
              </Link>

              {/* Button 2: Pharmacy */}
              <Link
                href="/pharmacy"
                className="group action-btn btn-teal-solid relative flex items-center justify-between px-6 py-4 rounded-2xl bg-brand text-white shadow-[0_4px_16px_rgba(23,120,111,0.25)] hover:bg-brand-dark hover:shadow-[0_10px_26px_rgba(23,120,111,0.38)] hover:-translate-y-1 active:translate-y-0 active:scale-[0.98] transition-all duration-300 overflow-hidden touch-manipulation select-none"
              >
                <div className="flex items-center gap-3.5 relative z-10">
                  <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                    <Pill className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="font-heading font-bold text-[16px] leading-tight">
                      {button2.title}
                    </div>
                    <div className="text-[12px] text-white/80 font-medium">
                      {button2.subtitle}
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-white relative z-10 transition-transform duration-300 group-hover:translate-x-1" />
                <span className="btn-shine-sweep" />
              </Link>

              {/* Button 3: Emergency Support */}
              <Link
                href="/emergency"
                className="group action-btn btn-emergency-pulse relative flex items-center justify-between px-6 py-4 rounded-2xl bg-emergency-soft text-emergency border-2 border-emergency/35 shadow-xs hover:bg-emergency hover:text-white hover:border-emergency hover:shadow-[0_8px_24px_rgba(217,45,32,0.35)] hover:-translate-y-1 active:translate-y-0 active:scale-[0.98] transition-all duration-300 overflow-hidden touch-manipulation select-none"
              >
                <div className="flex items-center gap-3.5 relative z-10">
                  <div className="w-10 h-10 rounded-xl bg-emergency/15 group-hover:bg-white/20 text-emergency group-hover:text-white flex items-center justify-center shrink-0 transition-colors duration-300">
                    <Siren className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <div className="font-heading font-bold text-[16px] leading-tight">
                      {button3.title}
                    </div>
                    <div className="text-[12px] text-emergency/80 group-hover:text-white/80 font-medium transition-colors duration-300">
                      {button3.subtitle}
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-emergency group-hover:text-white relative z-10 transition-all duration-300 group-hover:translate-x-1" />
                <span className="emergency-ring" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .cta-banner-container {
          background: linear-gradient(135deg, #ffffff 0%, #f0faf6 100%);
          border-radius: 28px;
          border: 1px solid rgba(23, 120, 111, 0.18);
          box-shadow: 0 48px 96px -20px rgba(23, 120, 111, 0.18);
          padding: 36px;
          overflow: hidden;
        }
        @media (min-width: 1024px) {
          .cta-banner-container {
            padding: 56px 64px;
          }
        }

        .cta-banner-container::after {
          content: "";
          position: absolute;
          inset: 6px;
          border: 1px solid rgba(23, 120, 111, 0.1);
          border-radius: 22px;
          pointer-events: none;
          z-index: 1;
        }

        .cta-headline-gradient {
          background: linear-gradient(135deg, #0e3b3a 0%, #17786f 60%, #2ba89b 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .btn-shine-sweep {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            105deg,
            transparent 40%,
            rgba(255, 255, 255, 0.38) 50%,
            transparent 60%
          );
          transform: translateX(-100%);
          transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
          pointer-events: none;
        }
        .action-btn:hover .btn-shine-sweep {
          transform: translateX(100%);
        }

        .emergency-ring {
          position: absolute;
          inset: 0;
          border: 2px solid #d92d20;
          border-radius: 16px;
          animation: emergencyPulse 2s cubic-bezier(0.16, 1, 0.3, 1) infinite;
          pointer-events: none;
        }

        @keyframes emergencyPulse {
          0% {
            transform: scale(1);
            opacity: 0.6;
          }
          100% {
            transform: scale(1.06);
            opacity: 0;
          }
        }
      `}</style>
    </section>
  );
};

export default FinalCTASection;
