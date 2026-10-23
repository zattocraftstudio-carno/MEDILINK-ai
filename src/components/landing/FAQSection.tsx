"use client";

import React, { useState, useEffect } from "react";
import { useIntersectionOnce } from "@/lib/useIntersection";
import { useLanguageStore } from "@/stores/useLanguageStore";
import { translations } from "@/lib/i18n";

export const FAQSection: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const { ref } = useIntersectionOnce(0.1);
  const { language } = useLanguageStore();
  const t = translations[language];

  useEffect(() => {
    setIsRevealed(true);
  }, []);

  const toggleItem = (index: number) => {
    setActiveIndex((prev) => (prev === index ? null : index));
  };

  const faqItems = t.faq.items;

  return (
    <section id="faq" ref={ref} className="py-[80px] lg:py-[120px] bg-bg-main">
      <div className="max-w-[760px] mx-auto px-6 lg:px-0">
        {/* Section Header */}
        <div
          className={`text-center mb-12 lg:mb-16 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isRevealed ? "reveal is-visible" : "reveal"
          }`}
        >
          <span className="inline-block font-sans font-medium text-[11px] tracking-[0.12em] uppercase text-brand bg-brand/10 rounded-full px-3.5 py-1 mb-4">
            {t.faq.badge}
          </span>
          <h2 className="font-heading font-extrabold text-[clamp(32px,4.5vw,52px)] text-text-primary leading-[1.15] mt-2 mb-4">
            {t.faq.title}
          </h2>
          <p className="font-sans text-[16px] text-text-muted">
            {t.faq.subtitle}
          </p>
        </div>

        {/* Accordion List */}
        <div className="space-y-4">
          {faqItems.map((item, idx) => {
            const isActive = activeIndex === idx;
            const hasOtherActive = activeIndex !== null && !isActive;

            return (
              <div
                key={idx}
                style={{
                  transitionDelay: `${idx * 0.08}s`,
                }}
                className={`border rounded-2xl transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  isRevealed ? "reveal is-visible animate-bounceUp" : "reveal"
                } ${
                  isActive
                    ? "bg-brand/[0.04] border-brand/30 shadow-[0_8px_24px_rgba(23,120,111,0.08)] p-6 opacity-100"
                    : hasOtherActive
                    ? "bg-white border-border-soft p-5 opacity-40 hover:opacity-75"
                    : "bg-white border-border-soft p-5 opacity-100 hover:border-brand/30 hover:shadow-xs"
                }`}
              >
                {/* Header (Question + Toggle Icon) */}
                <button
                  type="button"
                  onClick={() => toggleItem(idx)}
                  className="w-full flex justify-between items-center text-left cursor-pointer focus:outline-none group touch-manipulation select-none active:scale-[0.99] transition-transform duration-150"
                  aria-expanded={isActive}
                >
                  <h3
                    className={`font-heading font-bold text-[clamp(16px,2vw,19px)] transition-colors duration-300 pr-4 ${
                      isActive
                        ? "text-brand"
                        : "text-text-primary group-hover:text-brand"
                    }`}
                  >
                    {item.q}
                  </h3>

                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                      isActive
                        ? "bg-brand text-white rotate-45 shadow-sm"
                        : "bg-brand/10 text-brand group-hover:bg-brand group-hover:text-white"
                    }`}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    >
                      <path d="M7 1v12M1 7h12" />
                    </svg>
                  </div>
                </button>

                {/* Answer Content */}
                <div
                  className="grid transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]"
                  style={{
                    gridTemplateRows: isActive ? "1fr" : "0fr",
                    opacity: isActive ? 1 : 0,
                  }}
                >
                  <div className="overflow-hidden">
                    <p className="font-sans font-normal text-[15px] text-text-muted leading-[1.8] pt-4">
                      {item.a}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-4">
                      {item.steps.map((step, sIdx) => (
                        <span
                          key={sIdx}
                          className="font-sans font-medium text-[12px] text-brand bg-brand/10 border border-brand/15 rounded-full px-3 py-1 inline-block"
                        >
                          {step}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
