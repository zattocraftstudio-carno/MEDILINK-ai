"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useIntersectionOnce } from "@/lib/useIntersection";
import { useLanguageStore } from "@/stores/useLanguageStore";
import { translations } from "@/lib/i18n";
import { useSubscriptionStore } from "@/stores/useSubscriptionStore";

export const PlansSection: React.FC = () => {
  const router = useRouter();
  const { ref, isVisible } = useIntersectionOnce();
  const [mounted, setMounted] = useState(false);
  const { language } = useLanguageStore();
  const t = translations[language];

  const isPremium = useSubscriptionStore((s) => s.isPremium());

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleGetPremium = () => {
    router.push("/subscription");
  };

  return (
    <section className="py-16 md:py-24 bg-white" ref={ref}>
       <div
         className={`max-w-[1200px] mx-auto px-4 md:px-8 transition-opacity duration-700 ${
           isVisible ? "reveal is-visible opacity-100 animate-bounceUp" : "reveal"
         }`}
         style={isVisible ? { animationDelay: "0.1s" } : undefined}
       >
         <div className="text-center mb-12 md:mb-16">
           <h2 className="text-[32px] md:text-[40px] font-heading font-bold text-text-primary mb-4">
             {t.plans.title}
          </h2>
          <p className="text-[18px] text-text-muted max-w-2xl mx-auto">
            {t.plans.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-[800px] mx-auto">
          {/* Free Plan */}
          <div className="rounded-[16px] border border-border-soft p-8 flex flex-col">
            <div className="mb-6">
              <h3 className="text-[20px] font-bold text-text-primary mb-2">
                {t.plans.free.name}
              </h3>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-[40px] font-heading font-extrabold text-text-primary">
                  {t.plans.free.price}
                </span>
                <span className="text-[15px] text-text-muted">/{t.plans.free.period}</span>
              </div>
              <p className="text-[14px] text-text-muted">
                {t.plans.free.description}
              </p>
            </div>

            <ul className="space-y-3 mb-8 flex-grow">
              {t.plans.free.features.map((feat) => (
                <li key={feat} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-brand shrink-0 mt-0.5" />
                  <span className="text-[14px] text-text-primary">
                    {feat}
                  </span>
                </li>
              ))}
            </ul>

            <Button
              variant="ghost"
              size="l"
              className="w-full touch-manipulation select-none active:scale-[0.98]"
              onClick={() => router.push("/register")}
            >
              {t.plans.free.cta}
            </Button>
          </div>

          {/* Premium Plan */}
          <div className="rounded-[16px] border-2 border-brand p-8 flex flex-col relative shadow-lg">
            <div className="absolute -top-3 right-6">
              <Badge variant="warn">{t.plans.premium.badge}</Badge>
            </div>

            <div className="mb-6">
              <h3 className="text-[20px] font-bold text-text-primary mb-2">
                {t.plans.premium.name}
              </h3>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-[40px] font-heading font-extrabold text-brand">
                  {t.plans.premium.price}
                </span>
                <span className="text-[15px] text-text-muted">{t.plans.premium.period}</span>
              </div>
              <p className="text-[14px] text-text-muted">
                {t.plans.premium.description}
              </p>
            </div>

            <ul className="space-y-3 mb-8 flex-grow">
              {t.plans.premium.features.map((feat) => (
                <li key={feat} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-brand shrink-0 mt-0.5" />
                  <span className="text-[14px] text-text-primary">
                    {feat}
                  </span>
                </li>
              ))}
            </ul>

            <Button
              size="l"
              className="w-full touch-manipulation select-none active:scale-[0.98]"
              onClick={handleGetPremium}
              variant={mounted && isPremium ? "secondary" : "primary"}
            >
              {mounted && isPremium ? t.plans.premium.manageCta : t.plans.premium.cta}
            </Button>
          </div>
        </div>

        {/* Note */}
        <p className="text-center text-[14px] text-text-muted mt-8 max-w-xl mx-auto">
          {t.plans.note}
        </p>
      </div>
    </section>
  );
};

export default PlansSection;
