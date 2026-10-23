"use client";

import React from "react";
import { Doctor } from "@/types";
import { Button } from "@/components/ui/Button";
import { SafeImage } from "@/components/ui/SafeImage";
import { Star, MapPin, ChevronRight } from "lucide-react";
import { formatDistance } from "@/lib/geo";

interface DoctorRowProps {
  doctor: Doctor;
  distanceKm?: number | null;
  onSelect: (doctor: Doctor) => void;
  isPremium?: boolean;
}

export const DoctorRow: React.FC<DoctorRowProps> = ({
  doctor,
  distanceKm,
  onSelect,
  isPremium = false,
}) => {
  const initials = doctor.name
    .replace(/^Dr\.\s*/i, "")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  const displayFee = isPremium
    ? Math.round(doctor.feeWhatsapp * 0.8)
    : doctor.feeWhatsapp;

  return (
    <div
      onClick={() => onSelect(doctor)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(doctor);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`View details for ${doctor.name}`}
      className="bg-white border border-border-soft rounded-[16px] p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-brand-soft hover:shadow-sm transition-all duration-200 cursor-pointer group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand rounded-[16px]"
    >
      <div className="flex items-start gap-4 min-w-0">
        {/* Avatar */}
        <div className="w-14 h-14 rounded-full overflow-hidden shrink-0 border border-border-soft bg-bg-soft flex items-center justify-center">
          <SafeImage
            src={doctor.photo}
            alt={doctor.name}
            fallbackType="initials"
            initials={initials}
            className="w-full h-full"
          />
        </div>

        {/* Doctor Info */}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-[17px] font-bold text-text-primary group-hover:text-brand transition-colors">
              {doctor.name}
            </h3>
            <span className="text-[12px] font-bold px-2.5 py-0.5 rounded-full bg-brand-light text-brand">
              {doctor.specialty}
            </span>
          </div>

          <div className="flex items-center gap-3 text-[13px] text-text-muted mt-1.5 flex-wrap">
            <span>{doctor.experienceYears} years experience</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-accent text-accent" />
              <strong className="text-text-primary font-bold">{doctor.rating}</strong>
              <span>({doctor.reviewCount} reviews)</span>
            </span>
          </div>

          <div className="flex items-center gap-3 text-[13px] text-text-muted mt-1 flex-wrap">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-text-muted shrink-0" />
              {doctor.area}
            </span>
            {distanceKm !== undefined && distanceKm !== null && (
              <>
                <span>•</span>
                <span className="font-medium text-brand">
                  {formatDistance(distanceKm)} away
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Fee & Action */}
      <div className="flex items-center justify-between sm:justify-end gap-5 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-border-soft">
        <div className="text-left sm:text-right">
          <span className="text-[12px] text-text-muted block">Fee</span>
          <div className="flex items-baseline gap-1">
            <span className="text-[18px] font-heading font-extrabold text-text-primary">
              from ৳{displayFee}
            </span>
            {isPremium && (
              <span className="text-[12px] text-accent font-bold">
                (20% off)
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="s"
            variant="primary"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(doctor);
            }}
          >
            Book
          </Button>
          <ChevronRight className="w-5 h-5 text-text-muted group-hover:text-brand group-hover:translate-x-0.5 transition-all hidden sm:block" />
        </div>
      </div>
    </div>
  );
};
