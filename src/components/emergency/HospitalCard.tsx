"use client";

import React, { useState } from "react";
import type { Hospital, RouteLeg } from "@/types";
import { Phone, Navigation, MapPin, Ambulance, ChevronDown, Building2 } from "lucide-react";
import { buildDirectionsUrl } from "@/lib/maps";
import { formatTravelSummary } from "@/lib/maps";

interface HospitalCardProps {
  hospital: Hospital;
  /** Road travel time from the Routes API, when available. */
  leg?: RouteLeg | null;
  /** The patient's current location, used as the Directions origin. */
  origin?: { latitude: number; longitude: number } | null;
  /** True when the route data could not be loaded. */
  routeUnavailable?: boolean;
}

const NATIONAL_EMERGENCY = "999";

/**
 * A hospital card on the emergency screen.
 *
 * Click-to-call is a single tap — in an emergency a confirmation step
 * is a delay (PRD FR-5.1). The ambulance button falls back to the
 * national 999 ambulance service when the hospital has no direct line,
 * and never invents a number.
 */
export const HospitalCard: React.FC<HospitalCardProps> = ({
  hospital,
  leg,
  origin,
  routeUnavailable,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const emergencyNumber = hospital.emergencyPhone || hospital.phone;
  const ambulanceNumber = hospital.ambulancePhone;
  const hasDirectAmbulance = Boolean(ambulanceNumber);

  const directionsUrl = buildDirectionsUrl({
    origin: origin ?? null,
    destination: { latitude: hospital.latitude, longitude: hospital.longitude },
    placeId: hospital.mapPlaceId,
    travelMode: "driving",
  });

  const travelSummary = leg ? formatTravelSummary(leg) : "";

  return (
    <div className="bg-white border border-border-soft rounded-[16px] overflow-hidden hover:border-brand-soft hover:shadow-sm transition-all duration-200">
      <div className="p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-bold text-[16px] text-text-primary truncate">
              {hospital.name}
            </h3>
            {hospital.emergency24x7 && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-success-soft text-success-dark">
                24/7 Emergency
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[13px] text-text-muted">
            <MapPin className="w-3.5 h-3.5 text-text-muted shrink-0" />
            <span className="truncate">{hospital.address}</span>
          </div>

          {/* Travel time — road when known, straight-line when not */}
          <div className="mt-2 text-[13px]">
            {travelSummary ? (
              <span className="font-semibold text-text-primary">{travelSummary}</span>
            ) : (
              <span className="text-text-muted">
                {leg?.straightLineKm != null
                  ? `~${leg.straightLineKm.toFixed(1)} km straight-line`
                  : "Calculating distance…"}
              </span>
            )}
            {routeUnavailable && (
              <span className="text-text-muted"> · Live traffic unavailable</span>
            )}
          </div>

          {hospital.directionsNote && (
            <p className="text-[12px] text-text-muted mt-1.5 italic">
              {hospital.directionsNote}
            </p>
          )}
        </div>

        {/* Actions.
            These are anchors styled as buttons, NOT <button> inside <a>:
            nesting interactive elements is invalid ARIA and creates two
            focus stops per control (audit AX-006). */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-border-soft">
          <a
            href={`tel:${emergencyNumber}`}
            className="inline-flex items-center justify-center gap-2 h-11 px-[22px] rounded-md bg-emergency text-white font-semibold transition-all duration-160 hover:bg-emergency-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emergency active:scale-[0.98]"
          >
            <Phone className="w-4 h-4" aria-hidden="true" />
            Call Emergency
          </a>

          <a
            href={`tel:${hasDirectAmbulance ? ambulanceNumber : NATIONAL_EMERGENCY}`}
            className="inline-flex items-center justify-center gap-2 h-11 px-[22px] rounded-md bg-white text-brand border-[1.5px] border-brand font-semibold transition-all duration-160 hover:bg-brand-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand active:scale-[0.98]"
          >
            <Ambulance className="w-4 h-4 text-emergency" aria-hidden="true" />
            {hasDirectAmbulance ? "Call Ambulance" : "Ambulance (999)"}
          </a>

          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 h-11 px-[22px] rounded-md bg-white text-brand border-[1.5px] border-brand font-semibold transition-all duration-160 hover:bg-brand-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand active:scale-[0.98]"
          >
            <Navigation className="w-4 h-4" aria-hidden="true" />
            Directions
          </a>
        </div>
      </div>

      {/* Expandable details */}
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="w-full px-5 py-2.5 border-t border-border-soft flex items-center justify-between text-[12px] font-bold text-text-muted hover:text-text-primary transition-colors"
        aria-expanded={isExpanded}
      >
        <span className="flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5" />
          Departments &amp; facilities
        </span>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
        />
      </button>

      {isExpanded && (
        <div className="px-5 pb-5 space-y-3 animate-fadeIn">
          {hospital.departments && hospital.departments.length > 0 && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1.5">
                Departments
              </div>
              <div className="flex flex-wrap gap-1.5">
                {hospital.departments.map((department) => (
                  <span
                    key={department}
                    className="px-2.5 py-1 rounded-full bg-bg-soft border border-border-soft text-[12px] font-medium text-text-primary"
                  >
                    {department}
                  </span>
                ))}
              </div>
            </div>
          )}

          {hospital.facilities && hospital.facilities.length > 0 && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1.5">
                Facilities
              </div>
              <div className="flex flex-wrap gap-1.5">
                {hospital.facilities.map((facility) => (
                  <span
                    key={facility}
                    className="px-2.5 py-1 rounded-full bg-brand-light/60 text-[12px] font-medium text-brand-dark"
                  >
                    {facility}
                  </span>
                ))}
              </div>
            </div>
          )}

          <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12px] pt-2 border-t border-border-soft">
            <dt className="text-text-muted">Emergency</dt>
            <dd className="text-text-primary font-semibold font-mono">
              {emergencyNumber}
            </dd>

            <dt className="text-text-muted">Ambulance</dt>
            <dd className="text-text-primary font-semibold font-mono">
              {hasDirectAmbulance
                ? ambulanceNumber
                : `${NATIONAL_EMERGENCY} (national)`}
            </dd>

            {hospital.traumaCenter && (
              <>
                <dt className="text-text-muted">Trauma centre</dt>
                <dd className="text-text-primary font-semibold">Yes</dd>
              </>
            )}
            {typeof hospital.icuAvailable === "boolean" && (
              <>
                <dt className="text-text-muted">ICU</dt>
                <dd className="text-text-primary font-semibold">
                  {hospital.icuAvailable ? "Available" : "Not listed"}
                </dd>
              </>
            )}
            {typeof hospital.emergencyBeds === "number" && (
              <>
                <dt className="text-text-muted">Emergency beds</dt>
                <dd className="text-text-primary font-semibold">
                  {hospital.emergencyBeds}
                </dd>
              </>
            )}
          </dl>
        </div>
      )}
    </div>
  );
};
