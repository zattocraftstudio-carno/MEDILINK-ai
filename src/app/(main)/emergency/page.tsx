"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import hospitalsData from "@/data/hospitals.json";
import { Hospital, RouteLeg } from "@/types";
import { SOSButton } from "@/components/emergency/SOSButton";
import { EmergencyActions } from "@/components/emergency/EmergencyActions";
import { HospitalList } from "@/components/emergency/HospitalList";
import { useProfileStore } from "@/stores/useProfileStore";
import {
  Coordinates,
  AREA_COORDINATES,
  calculateDistanceKm,
  getCoordinatesForArea,
  getCurrentLocation,
} from "@/lib/geo";
import { MapPin, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

type GeoState = "loading" | "live" | "profile" | "manual" | "denied";

export default function EmergencyPage() {
  const profile = useProfileStore((s) => s.profile);

  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [locationName, setLocationName] = useState<string>("");
  /** The area the patient actually chose, if any. */
  const [selectedArea, setSelectedArea] = useState<string>("");
  const [geoState, setGeoState] = useState<GeoState>("loading");
  /** Why the live lookup failed, so the banner can say something useful. */
  const [geoReason, setGeoReason] = useState<string>("");

  // Road travel times from the Maps API. The list renders immediately
  // with straight-line distances and upgrades in place (S-3).
  const [legs, setLegs] = useState<Record<string, RouteLeg>>({});
  const [routeUnavailable, setRouteUnavailable] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function resolveLocation() {
      try {
        const liveCoords = await getCurrentLocation();
        if (!isMounted) return;
        setCoords(liveCoords);
        // The label must describe the fix we actually got, NOT the profile
        // area — telling a patient in Sylhet that they are in "Dhaka" while
        // sorting hospitals by their true coordinates is actively misleading.
        setLocationName("Your current location");
        setGeoState("live");
      } catch (error) {
        if (!isMounted) return;

        // The GeolocationPositionError carries WHY it failed. Discarding it
        // meant a patient who permanently denied permission was told the
        // same thing as one whose browser has no geolocation at all, and
        // was never told how to fix it.
        const code =
          (error as { code?: number } | null)?.code ?? (error as { name?: string } | null)?.name;
        const reason =
          code === 1
            ? "Location permission was denied."
            : code === 3
            ? "The location request timed out."
            : code === 2
            ? "Your location could not be determined."
            : "Location is not available on this device.";

        setGeoReason(reason);

        // Fall back to the profile area, then to Dhaka.
        const fallbackArea = profile?.area && profile.area !== "Other" ? profile.area : "Dhaka";
        const fallbackCoords = getCoordinatesForArea(fallbackArea);
        setCoords(fallbackCoords);
        setLocationName(fallbackArea);
        setSelectedArea(fallbackArea);
        setGeoState(code === 1 ? "denied" : "profile");
      }
    }

    resolveLocation();

    return () => {
      isMounted = false;
    };
  }, [profile?.area]);

  const handleManualAreaChange = (selectedArea: string) => {
    const newCoords = getCoordinatesForArea(selectedArea);
    setCoords(newCoords);
    setLocationName(selectedArea);
    setSelectedArea(selectedArea);
    // A manually chosen area is NOT a GPS success — it must keep the
    // "chosen by you" framing so the patient is not told the GPS worked.
    setGeoState("manual");
    setLegs({});
    setRouteUnavailable(false);
  };

  /**
   * Fetch road travel times for every hospital in one batch.
   *
   * This never blocks the emergency screen: the list is already on
   * screen with straight-line distances, and this simply upgrades it.
   */
  const loadRouteMatrix = useCallback(async (origin: Coordinates) => {
    try {
      const destinations = (hospitalsData as Hospital[])
        .filter((hospital) => hospital.latitude && hospital.longitude)
        .map((hospital) => ({
          id: hospital.id,
          latitude: hospital.latitude,
          longitude: hospital.longitude,
        }));

      if (!destinations.length) return;

      const params = new URLSearchParams({
        origin: `${origin.latitude},${origin.longitude}`,
        destinations: destinations
          .map((d) => `${d.id}:${d.latitude},${d.longitude}`)
          .join(";"),
      });

      const response = await fetch(`/api/maps/route-matrix?${params.toString()}`);
      if (!response.ok) throw new Error("route-matrix failed");

      const payload = await response.json();
      if (!payload?.results) throw new Error("no results");

      const next: Record<string, RouteLeg> = {};
      for (const leg of payload.results as RouteLeg[]) {
        next[leg.id] = leg;
      }
      setLegs(next);
      setRouteUnavailable(payload.source === "haversine-fallback");
    } catch {
      setRouteUnavailable(true);
    }
  }, []);

  useEffect(() => {
    if (!coords) return;
    void loadRouteMatrix(coords);
  }, [coords, loadRouteMatrix]);

  const sortedHospitals = useMemo(() => {
    const list = (hospitalsData as Hospital[]).map((hos) => {
      let distance: number | null = null;
      if (coords && hos.latitude && hos.longitude) {
        distance = calculateDistanceKm(coords, {
          latitude: hos.latitude,
          longitude: hos.longitude,
        });
      }
      return { ...hos, distance };
    });

    if (coords) {
      // Road travel time wins when it is known; straight-line breaks
      // the tie for the rest.
      list.sort((a, b) => {
        const aRoad = legs[a.id]?.durationMinutes;
        const bRoad = legs[b.id]?.durationMinutes;

        if (aRoad != null && bRoad != null) return aRoad - bRoad;
        if (aRoad != null) return -1;
        if (bRoad != null) return 1;

        return (a.distance ?? Infinity) - (b.distance ?? Infinity);
      });
    }

    return list;
  }, [coords, legs]);

  /** The nearest hospital's ambulance line, when one is published. */
  const nearestAmbulancePhone = useMemo(() => {
    const withAmbulance = sortedHospitals.find((hospital) => hospital.ambulancePhone);
    return withAmbulance?.ambulancePhone ?? null;
  }, [sortedHospitals]);

  const areaOptions = Object.keys(AREA_COORDINATES);

  return (
    <div className="max-w-[1000px] mx-auto px-4 md:px-8 py-8 md:py-12 pb-24 md:pb-16">
      {/* Page Header */}
      <div className="text-center mb-8">
        <h1 className="text-[32px] md:text-[44px] font-heading font-extrabold text-emergency tracking-tight">
          Emergency Help
        </h1>
        <p className="text-[16px] md:text-[18px] text-text-muted mt-2 max-w-lg mx-auto">
          Your nearby hospitals and 999 emergency services.
        </p>
      </div>

      {/* Location Status Banner */}
      <div className="max-w-[600px] mx-auto mb-8">
        {geoState === "loading" && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center justify-center gap-2 p-3 bg-bg-soft rounded-[12px] text-[14px] text-text-muted font-medium border border-border-soft"
          >
            <Loader2 className="w-4 h-4 animate-spin text-brand" aria-hidden="true" />
            <span>Finding your location...</span>
          </div>
        )}

        {(geoState === "live" || geoState === "manual") && (
          <div className="flex items-center justify-between gap-3 p-3.5 bg-success-soft/60 rounded-[12px] text-[14px] text-success-dark font-medium border border-success/20">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success-dark shrink-0" aria-hidden="true" />
              <span>
                {geoState === "live"
                  ? "Using your current location"
                  : "Area you selected"}{" "}
                <strong>{locationName}</strong>
              </span>
            </div>
            <label htmlFor="emergency-area" className="sr-only">
              Change your area
            </label>
            <select
              id="emergency-area"
              value={selectedArea}
              onChange={(e) => handleManualAreaChange(e.target.value)}
              className="text-[12px] font-bold text-text-primary bg-white border border-border-soft rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand"
            >
              <option value="" disabled>Change area</option>
              {areaOptions.map((area) => (
                <option key={area} value={area}>{area}</option>
              ))}
            </select>
          </div>
        )}

        {(geoState === "denied" || geoState === "profile") && (
          <div
            role="status"
            aria-live="polite"
            className="p-3.5 bg-accent-soft/60 rounded-[12px] text-[14px] text-text-primary font-medium border border-accent/30 space-y-2"
          >
            <div className="flex items-center gap-2 text-[#92620A]">
              <AlertTriangle className="w-4 h-4 text-accent shrink-0" aria-hidden="true" />
              <span>
                {geoState === "denied"
                  ? `${geoReason} Showing hospitals near ${locationName} instead — pick your area below.`
                  : `${geoReason} Showing hospitals near ${locationName} instead — pick your area below.`}
              </span>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <MapPin className="w-4 h-4 text-text-muted shrink-0" aria-hidden="true" />
              <label htmlFor="emergency-area-fallback" className="sr-only">
                Select your area
              </label>
              <select
                id="emergency-area-fallback"
                value={selectedArea}
                onChange={(e) => handleManualAreaChange(e.target.value)}
                className="w-full text-[13px] font-bold text-text-primary bg-white border border-border-soft rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand"
              >
                <option value="" disabled>Select your area</option>
                {areaOptions.map((area) => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Main Big Pulsing SOS Button */}
      <SOSButton />

      {/* Emergency Action Cards */}
      <EmergencyActions
        profile={profile}
        coords={coords}
        locationName={locationName}
        ambulancePhone={nearestAmbulancePhone}
      />

      {/* Nearby Hospital Directory */}
      <HospitalList
        hospitals={sortedHospitals}
        legs={legs}
        origin={coords}
        routeUnavailable={routeUnavailable}
      />
    </div>
  );
}
