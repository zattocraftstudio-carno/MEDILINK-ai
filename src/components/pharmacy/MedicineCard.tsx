"use client";

import React, { useState } from "react";
import { Medicine } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SafeImage } from "@/components/ui/SafeImage";
import { Check } from "lucide-react";

interface MedicineCardProps {
  medicine: Medicine;
  onAdd: (medicine: Medicine) => void;
  isPremium?: boolean;
}

export const MedicineCard: React.FC<MedicineCardProps> = ({
  medicine,
  onAdd,
  isPremium = false,
}) => {
  const [added, setAdded] = useState(false);
  const isOutOfStock = medicine.stock <= 0;

  const handleAdd = () => {
    if (isOutOfStock || added) return;
    onAdd(medicine);
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
    }, 1200);
  };

  return (
    <div className="bg-white border border-border-soft rounded-[16px] p-5 flex flex-col justify-between hover:border-brand-soft hover:shadow-sm transition-all duration-200">
      <div>
        <div className="relative w-full h-40 bg-bg-soft rounded-[12px] overflow-hidden mb-4 flex items-center justify-center">
          <SafeImage
            src={medicine.image}
            alt={medicine.name}
            fallbackType="pill"
            className="w-full h-full object-contain p-4"
          />
          <div className="absolute top-2 left-2 flex gap-1.5 flex-wrap">
            {medicine.requiresRx && (
              <Badge variant="danger">Rx</Badge>
            )}
            {isPremium && (
              <Badge variant="warn">-20%</Badge>
            )}
          </div>
        </div>

        <div className="text-[12px] font-semibold text-brand uppercase tracking-wider mb-1">
          {medicine.category}
        </div>

        <h3 className="text-[16px] font-bold text-text-primary leading-snug mb-1">
          {medicine.name}
        </h3>

        <div className="text-[13px] text-text-muted mb-3 font-medium">
          {medicine.genericName}
        </div>

        {medicine.description && (
          <p className="text-[13px] text-text-muted line-clamp-2 mb-4 leading-relaxed">
            {medicine.description}
          </p>
        )}
      </div>

      <div className="pt-4 border-t border-border-soft flex items-center justify-between mt-auto">
        <div>
          <span className="text-[12px] text-text-muted block">Price</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[18px] font-heading font-extrabold text-text-primary">
              ৳{medicine.price.toFixed(2)}
            </span>
            {isPremium && (
              <span className="text-[13px] text-accent font-bold">
                (৳{(medicine.price * 0.8).toFixed(2)})
              </span>
            )}
          </div>
        </div>

        <Button
          size="s"
          variant={added ? "secondary" : "primary"}
          disabled={isOutOfStock}
          onClick={handleAdd}
          className="min-w-[88px]"
        >
          {isOutOfStock ? (
            "Out of Stock"
          ) : added ? (
            <span className="inline-flex items-center gap-1 text-brand font-bold">
              <Check className="w-4 h-4" /> Added ✓
            </span>
          ) : (
            "Add"
          )}
        </Button>
      </div>
    </div>
  );
};
