"use client";

import React, { useState, useEffect } from "react";
import { useCartStore } from "@/stores/useCartStore";
import { useSubscriptionStore } from "@/stores/useSubscriptionStore";
import { ShoppingBag, FileWarning } from "lucide-react";

interface CartSummaryBarProps {
  onOpenCart: () => void;
}

export const CartSummaryBar: React.FC<CartSummaryBarProps> = ({ onOpenCart }) => {
  const [mounted, setMounted] = useState(false);
  const { getItemCount, getTotal, getRxItems } = useCartStore();
  const isPremium = useSubscriptionStore((s) => s.isPremium());

  useEffect(() => {
    setMounted(true);
  }, []);

  const count = getItemCount();
  const total = getTotal(isPremium);
  const rxCount = getRxItems().length;

  if (!mounted || count === 0) return null;

  return (
    <div className="md:hidden fixed bottom-16 left-0 right-0 z-30 p-3 bg-white border-t border-border-soft shadow-lg animate-fadeIn">
      {rxCount > 0 && (
        <div className="max-w-[500px] mx-auto mb-2 flex items-center gap-2 px-3 py-1.5 rounded-[10px] bg-accent-soft/70 border border-accent/30">
          <FileWarning className="w-3.5 h-3.5 text-accent shrink-0" />
          <span className="text-[12px] font-bold text-text-primary">
            Prescription required for {rxCount} item{rxCount === 1 ? "" : "s"}
          </span>
        </div>
      )}
      <div className="max-w-[500px] mx-auto flex items-center justify-between px-4 py-2 bg-brand text-white rounded-[14px]">
        <div className="flex items-center gap-2.5">
          <ShoppingBag className="w-5 h-5" />
          <span className="text-[14px] font-bold">
            {count} {count === 1 ? "item" : "items"} · ৳{total}
          </span>
        </div>
        <button
          onClick={onOpenCart}
          className="text-[13px] font-bold uppercase tracking-wider py-1.5 px-3 bg-white text-brand rounded-md hover:bg-white/90 active:scale-95 transition-all"
        >
          View Cart
        </button>
      </div>
    </div>
  );
};
