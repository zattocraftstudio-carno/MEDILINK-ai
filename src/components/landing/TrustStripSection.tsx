"use client";

import React, { useState, useEffect } from "react";
import { useIntersectionOnce } from "@/lib/useIntersection";

import { useLanguageStore } from "@/stores/useLanguageStore";

function useCountUp(target: number, suffix: string, duration = 1800) {
  const [value, setValue] = useState("0" + suffix);

  useEffect(() => {
    let frame = 0;
    let cancelled = false;
    const start = performance.now();
    const step = (now: number) => {
      if (cancelled) return;
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      const current = Math.floor(eased * target);
      setValue(current.toLocaleString() + suffix);
      if (progress < 1) frame = requestAnimationFrame(step);
      else setValue(target.toLocaleString() + suffix);
    };
    frame = requestAnimationFrame(step);
    // Cancel on unmount — the rAF used to call setState after the component
    // had been torn down.
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [target, suffix, duration]);

  return value;
}

export const TrustStripSection: React.FC = () => {
  const { ref: sectionRef, isVisible } = useIntersectionOnce(0.1);
  const { t, language } = useLanguageStore();

  const stats = [
    { target: 50000, suffix: "+", label: t.trust.stats.patients, gradient: "from-brand to-brand-soft" },
    { target: 500, suffix: "+", label: t.trust.stats.doctors, gradient: "from-brand-soft to-[#7C3AED]" },
    { target: 98, suffix: "%", label: t.trust.stats.accuracy, gradient: "from-brand to-brand-soft" },
    { target: 24, suffix: "/7", label: t.trust.stats.support, gradient: "from-[#0E3B3A] to-brand-soft" },
  ];

  return (
    <section ref={sectionRef} className="py-[80px] lg:py-[100px] bg-bg-mint overflow-x-clip" id="stats">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className={`text-center mb-[48px] lg:mb-[72px] ${isVisible ? "reveal is-visible animate-dropDown" : "reveal"}`} style={isVisible ? { animationDelay: "0.1s" } : undefined}>
          <div className="w-[60px] h-[3px] rounded-full bg-gradient-to-r from-brand to-brand-soft mx-auto mb-7 origin-center scale-x-0 transition-transform duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)]" style={{ transitionDelay: "0s" }} />
          <span className={`inline-block font-sans font-medium text-[11px] tracking-[0.12em] uppercase text-brand bg-brand/10 rounded-full px-3.5 py-1 mb-5 ${language === "bn" ? "font-bengali text-[13px]" : ""}`}>
            {t.trust.badge}
          </span>
          <h2 className={`font-heading font-extrabold text-[clamp(28px,4.5vw,52px)] text-text-primary leading-[1.15] mb-3.5 ${language === "bn" ? "font-bengali" : ""}`}>
            {t.trust.title}
          </h2>
          <p className={`font-sans text-[15px] sm:text-[16px] text-text-muted leading-[1.75] max-w-[540px] mx-auto ${language === "bn" ? "font-bengali text-[17px]" : ""}`}>
            {t.trust.subtitle}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 relative">
          {stats.map((stat, index) => (
            <StatItem
              key={stat.label + language}
              stat={stat}
              index={index}
              isLast={index === stats.length - 1}
              isBengali={language === "bn"}
            />
          ))}
        </div>
      </div>

      <style jsx global>{`
        .stat-item-reveal { transform: translateY(0); }
      `}</style>
    </section>
  );
};

interface StatItemProps {
  stat: {
    target: number;
    suffix: string;
    label: string;
    gradient: string;
  };
  index: number;
  isLast: boolean;
  isBengali?: boolean;
}

const StatItem: React.FC<StatItemProps> = ({ stat, index, isLast, isBengali }) => {
  // The count-up hook lives here, in its own component, so it is no longer
  // called inside a .map() callback (a rules-of-hooks violation that only
  // worked because the number of stats happened to be constant).
  const value = useCountUp(stat.target, stat.suffix);
  const { ref, isVisible } = useIntersectionOnce<HTMLDivElement>(0.5);
  return (
    <div ref={ref} className={`stat-item-reveal relative text-center py-8 px-4 md:py-5 md:px-2 ${isVisible ? "reveal is-visible animate-scaleUp" : "reveal"}`} style={isVisible ? { animationDelay: `${index * 0.15}s` } : undefined}>
      {!isLast && (
        <div className="absolute right-0 top-[20%] bottom-[20%] w-px bg-brand/10 max-md:hidden" />
      )}
      <div className="w-1.5 h-1.5 rounded-full bg-brand opacity-45 mx-auto mb-4" />
      <div className={`font-heading font-extrabold text-[clamp(44px,6vw,72px)] leading-none mb-2.5 bg-gradient-to-br ${stat.gradient} bg-clip-text text-transparent`}>
        {value}
      </div>
      <div className="font-sans text-[14px] font-medium text-text-muted tracking-[0.01em]">{stat.label}</div>
    </div>
  );
};

export default TrustStripSection;
