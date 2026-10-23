"use client";

import React from "react";
import { Hospital, RouteLeg } from "@/types";
import { HospitalCard } from "@/components/emergency/HospitalCard";
import { AlertTriangle } from "lucide-react";

interface HospitalListProps {
  hospitals: Hospital[];
  /** Road travel time per hospital id, when the Maps API answered. */
  legs?: Record<string, RouteLeg>;
  /** The patient's current location — the Directions origin. */
  origin?: { latitude: number; longitude: number } | null;
  /** True when the Maps API could not be reached. */
  routeUnavailable?: boolean;
}

export const HospitalList: React.FC<HospitalListProps> = ({
  hospitals,
  legs = {},
  origin,
  routeUnavailable,
}) => {
  return (
    <div className="my-10">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-[22px] md:text-[26px] font-heading font-bold text-text-primary">
            Nearby Hospitals
          </h2>
          <p className="text-[14px] text-text-muted mt-0.5">
            Emergency departments and direct ambulance helplines
          </p>
        </div>
        <a
          href="https://www.google.com/maps/search/hospitals+in+bangladesh"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[14px] font-semibold text-brand hover:underline hidden sm:inline-block"
        >
          View all on Google Maps →
        </a>
      </div>

      {/* Honest labelling of what the distance means */}
      <p className="text-[12px] text-text-muted mb-4 flex items-center gap-1.5">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        {routeUnavailable
          ? "Live traffic is unavailable — distances below are straight-line, not driving distance."
          : "Distances are road travel times where live traffic data is available."}
      </p>

      <div className="space-y-4">
        {hospitals.map((hospital) => (
          <HospitalCard
            key={hospital.id}
            hospital={hospital}
            leg={legs[hospital.id] ?? null}
            origin={origin}
            routeUnavailable={routeUnavailable}
          />
        ))}
      </div>

      <div className="mt-6 text-center sm:hidden">
        <a
          href="https://www.google.com/maps/search/hospitals+in+bangladesh"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[14px] font-semibold text-brand hover:underline"
        >
          View all on Google Maps →
        </a>
      </div>
    </div>
  );
};
