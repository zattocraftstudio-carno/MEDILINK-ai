"use client";

import React from "react";
import { useIntersectionOnce } from "@/lib/useIntersection";
import { useLanguageStore } from "@/stores/useLanguageStore";
import { translations } from "@/lib/i18n";

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase();
}

interface TestimonialItem {
  name: string;
  city: string;
  quote: string;
  stars?: number;
}

const TestimonialCard: React.FC<{ item: TestimonialItem; isBn: boolean }> = ({ item, isBn }) => (
  <div
    className="testimonial-card shrink-0 w-[320px] max-md:w-[280px] bg-white border border-brand/[0.18] rounded-3xl p-7 max-md:p-[22px] shadow-[0_24px_50px_-12px_rgba(23,120,111,0.12)] hover:-translate-y-2 hover:shadow-[0_32px_64px_-12px_rgba(23,120,111,0.22)] transition-all duration-500 cursor-default touch-manipulation select-none"
    style={{ transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}
  >
    {/* Header */}
    <div className="flex items-center gap-3.5 mb-3.5">
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand to-brand-soft flex items-center justify-center font-heading font-bold text-[18px] text-white shrink-0">
        {getInitials(item.name)}
      </div>
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <div className="font-heading font-bold text-[16px] text-text-primary truncate">{item.name}</div>
        <div className="font-sans text-[13px] text-text-muted">{item.city}</div>
      </div>
      <span className="inline-flex items-center gap-1 font-sans text-[11px] font-medium text-success bg-success/10 rounded-full px-2.5 py-0.5 whitespace-nowrap">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        {isBn ? "যাচাইকৃত রোগী" : "Verified Patient"}
      </span>
    </div>
    {/* Stars */}
    <div className="flex gap-0.5 mb-3.5 text-accent text-[13px] leading-none">
      {Array.from({ length: item.stars || 5 }).map((_, i) => <span key={i}>★</span>)}
    </div>
    {/* Quote */}
    <div className="font-sans text-[15px] text-text-muted italic leading-[1.7] border-t border-brand/10 pt-3.5 mt-3.5">
      &ldquo;{item.quote}&rdquo;
    </div>
  </div>
);

export const ReviewsSection: React.FC = () => {
  const { ref, isVisible } = useIntersectionOnce<HTMLDivElement>(0.1);
  const { language } = useLanguageStore();
  const t = translations[language];
  const isBn = language === "bn";

  const testimonials = t.reviews.testimonials;
  const cards = testimonials.map((item, i) => <TestimonialCard key={i} item={item} isBn={isBn} />);
  // Repeat cards to ensure smooth marquee coverage
  const loopedCards = [...cards, ...cards, ...cards, ...cards].map((c, i) =>
    React.cloneElement(c, { key: `card-${i}` })
  );

  return (
    <section className="py-[120px] md:py-[80px] bg-bg-soft overflow-hidden" id="testimonials">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="text-center mb-16">
          <div className="w-[60px] h-[3px] rounded-full bg-gradient-to-r from-brand to-brand-soft mx-auto mb-7" />
          <span className="inline-block font-sans font-medium text-[11px] tracking-[0.12em] uppercase text-brand bg-brand/10 rounded-full px-3.5 py-1 mb-5">
            {t.reviews.badge}
          </span>
          <h2 className="font-heading font-extrabold text-[clamp(32px,4.5vw,52px)] text-text-primary leading-[1.15] mb-3.5">
            {t.reviews.title}
          </h2>
          <p className="font-sans text-[16px] text-text-muted leading-[1.75] max-w-[520px] mx-auto">
            {t.reviews.subtitle}
          </p>
        </div>
      </div>

      {/* Marquee Wrapper */}
      <div
        ref={ref}
        className={`marquee-wrapper-reveal relative w-screen overflow-hidden ${
          isVisible ? "reveal is-visible animate-dropDown" : "reveal"
        }`}
        style={{
          maskImage: "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
          animationDelay: isVisible ? "0.2s" : undefined,
        }}
      >
        {/* Row 1 — Scrolls Left */}
        <div className="marquee-track marquee-left flex gap-5 w-max hover:[animation-play-state:paused]">
          {loopedCards}
        </div>

        <div className="h-5" />

        {/* Row 2 — Scrolls Right */}
        <div className="marquee-track marquee-right flex gap-5 w-max hover:[animation-play-state:paused]">
          {loopedCards}
        </div>
      </div>

      <style jsx global>{`
        .marquee-wrapper-reveal { transform: scale(1) translateY(0); filter: blur(0); }
        .marquee-left { animation: marqueeLeft 38s linear infinite; }
        .marquee-right { animation: marqueeRight 38s linear infinite; }
        @keyframes marqueeLeft { 0% { transform: translateX(0%); } 100% { transform: translateX(-50%); } }
        @keyframes marqueeRight { 0% { transform: translateX(-50%); } 100% { transform: translateX(0%); } }
        @media (max-width: 767px) {
          .marquee-wrapper-reveal { mask-image: linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%) !important; -webkit-mask-image: linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%) !important; }
        }
      `}</style>
    </section>
  );
};

export default ReviewsSection;
