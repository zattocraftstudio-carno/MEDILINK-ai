"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import { Star } from "lucide-react";
import { useRouter } from "next/navigation";

export const LimitReachedCard: React.FC = () => {
  const router = useRouter();

  const handleUpgrade = () => {
    router.push("/subscription");
  };

  return (
    <div className="p-4 bg-white border-t border-border-soft shrink-0">
      <div className="max-w-[800px] mx-auto bg-accent-soft border border-accent/20 rounded-[16px] p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-white text-accent flex items-center justify-center mx-auto mb-3 shadow-sm">
          <Star className="w-6 h-6 fill-accent" />
        </div>
        <h3 className="text-[18px] font-bold text-text-primary mb-2 flex items-center justify-center gap-1.5">
          Daily Limit Reached
        </h3>
        <p className="text-[14px] text-text-muted mb-5 max-w-md mx-auto">
          You&apos;ve used your free AI chats for today. Upgrade to Premium for unlimited access, or come back tomorrow.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button size="s" variant="secondary" onClick={() => router.push("/")}>
            Maybe Tomorrow
          </Button>
          <Button size="s" onClick={handleUpgrade}>
            Upgrade to Premium
          </Button>
        </div>
      </div>
    </div>
  );
};
