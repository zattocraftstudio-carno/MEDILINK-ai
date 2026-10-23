/* ═══════════════════════════════════════════════════════════════════
   MediLink — Google Maps travel time & directions.

   WHY THIS EXISTS (PRD §5.2)
   Haversine gives the great-circle distance — the shortest path over
   the earth's surface, ignoring rivers, bridges, one-way systems and
   traffic. In a river city like Dhaka, a "1.4 km" straight-line rating
   can be a 12 km, 40-minute road journey, and sorting emergency
   hospitals by it can put the WRONG hospital first.

   So: Haversine stays as the instant first-paint approximation and the
   offline fallback. Road travel time comes from the Google Maps
   Routes API (preferred) or Directions API (fallback).

   SAFETY INVARIANT S-3
   The emergency screen never waits for this. The list renders with
   straight-line distances immediately and upgrades in place.
   ═══════════════════════════════════════════════════════════════════ */

import type { RouteLeg, RouteMatrix, RouteSource } from "@/types";
import { calculateDistanceKm } from "./geo";

/* ────────────────────────────────────────────────────────────────────
   Types
   ──────────────────────────────────────────────────────────────────── */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface RouteDestination {
  id: string;
  latitude: number;
  longitude: number;
}

export interface RouteMatrixOptions {
  origin: Coordinates;
  destinations: RouteDestination[];
  travelMode?: "DRIVE" | "DRIVING" | "WALK" | "BICYCLE" | "TWO_WHEELER";
}

/* ────────────────────────────────────────────────────────────────────
   Deep links — no API key, always available
   ──────────────────────────────────────────────────────────────────── */

export interface DirectionsLinkOptions {
  origin?: Coordinates | null;
  destination: Coordinates;
  /** A Google Place ID, when one is known. Null simply means "not set". */
  placeId?: string | null;
  travelMode?: "driving" | "walking" | "bicycling";
}

/**
 * Builds a Google Maps Directions deep link.
 *
 * This is the guaranteed-working path: it needs no API key, no quota
 * and no network round trip, so it remains available even when the
 * Routes API is down or the quota is exhausted.
 */
export function buildDirectionsUrl(options: DirectionsLinkOptions): string {
  const params = new URLSearchParams();
  params.set("api", "1");

  if (options.origin) {
    params.set("origin", `${options.origin.latitude},${options.origin.longitude}`);
  }

  if (options.placeId) {
    params.set("destination_place_id", options.placeId);
  } else {
    params.set(
      "destination",
      `${options.destination.latitude},${options.destination.longitude}`,
    );
  }

  params.set("travelmode", options.travelMode ?? "driving");

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/** Builds a place link for a single hospital (used by "View on Maps"). */
export function buildPlaceUrl(options: {
  coordinates: Coordinates;
  placeId?: string | null;
  query?: string;
}): string {
  const params = new URLSearchParams();
  params.set("api", "1");

  if (options.placeId) {
    params.set("query_place_id", options.placeId);
  } else {
    params.set("query", `${options.coordinates.latitude},${options.coordinates.longitude}`);
  }

  if (options.query) params.set("query_place_id", options.query);

  return `https://www.google.com/maps/search/?${params.toString()}`;
}

/** Builds a shareable "my location" link (used by the SOS WhatsApp share). */
export function buildLocationUrl(coordinates: Coordinates): string {
  return `https://maps.google.com/?q=${coordinates.latitude},${coordinates.longitude}`;
}

/* ────────────────────────────────────────────────────────────────────
   Formatting
   ──────────────────────────────────────────────────────────────────── */

/** "9 mins" / "1 hr 12 mins" */
export function formatTravelTime(minutes: number | null): string {
  if (minutes === null || !Number.isFinite(minutes)) return "";
  const total = Math.max(0, Math.round(minutes));
  if (total < 60) return `${total} min`;
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  return rest ? `${hours} hr ${rest} mins` : `${hours} hr`;
}

/** "900 m" / "12.6 km" */
export function formatRouteDistance(meters: number | null): string {
  if (meters === null || !Number.isFinite(meters)) return "";
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * The single label shown on a hospital card.
 *
 * Road time when we have it, straight-line distance otherwise. The two
 * are never presented with the same wording, so the user always knows
 * which one they are looking at (PRD §5.1 FR-5.5).
 */
export function formatTravelSummary(leg: RouteLeg): string {
  if (leg.durationMinutes !== null && leg.distanceText) {
    return `${formatTravelTime(leg.durationMinutes)} · ${leg.distanceText}`;
  }
  if (leg.durationMinutes !== null) {
    return formatTravelTime(leg.durationMinutes);
  }
  if (leg.straightLineKm !== null) {
    return `~${leg.straightLineKm.toFixed(1)} km straight-line`;
  }
  return "";
}

/* ────────────────────────────────────────────────────────────────────
   Client — calls the server proxy
   ──────────────────────────────────────────────────────────────────── */

/**
 * Fetches road travel times for a set of destinations.
 *
 * The client never talks to Google directly — the API key is
 * server-only. The endpoint answers in one batch for all
 * destinations rather than one call per hospital.
 */
export async function fetchRouteMatrix(
  options: RouteMatrixOptions,
): Promise<RouteMatrix> {
  const { origin, destinations } = options;

  if (!destinations.length) {
    return {
      source: "haversine-fallback",
      origin: { lat: origin.latitude, lng: origin.longitude },
      results: [],
      cachedAt: new Date().toISOString(),
    };
  }

  const params = new URLSearchParams({
    origin: `${origin.latitude},${origin.longitude}`,
    travelMode: options.travelMode ?? "DRIVE",
  });
  params.set(
    "destinations",
    destinations.map((d) => `${d.id}:${d.latitude},${d.longitude}`).join(";"),
  );

  try {
    const response = await fetch(`/api/maps/route-matrix?${params.toString()}`, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) throw new Error(`route-matrix failed (${response.status})`);

    const payload = (await response.json()) as RouteMatrix & { ok?: boolean };
    if (!payload?.results) throw new Error("route-matrix returned no results");

    return payload;
  } catch {
    // Graceful degradation: the caller keeps the Haversine ordering.
    return {
      source: "haversine-fallback",
      origin: { lat: origin.latitude, lng: origin.longitude },
      results: destinations.map((d) => ({
        id: d.id,
        durationMinutes: null,
        durationText: null,
        distanceMeters: null,
        distanceText: null,
        straightLineKm: calculateDistanceKm(origin, {
          latitude: d.latitude,
          longitude: d.longitude,
        }),
      })),
      cachedAt: new Date().toISOString(),
    };
  }
}

/**
 * Sorts hospitals by road travel time when available, falling back to
 * straight-line distance for destinations whose route is unknown.
 */
export function sortByRoute(
  items: { id: string }[],
  legs: RouteLeg[],
): { id: string; leg: RouteLeg | null }[] {
  const byId = new Map(legs.map((leg) => [leg.id, leg]));

  return items
    .map((item) => ({ id: item.id, leg: byId.get(item.id) ?? null }))
    .sort((a, b) => {
      const aRoad = a.leg?.durationMinutes;
      const bRoad = b.leg?.durationMinutes;

      if (aRoad !== null && aRoad !== undefined && bRoad !== null && bRoad !== undefined) {
        return aRoad - bRoad;
      }
      if (aRoad !== null && aRoad !== undefined) return -1;
      if (bRoad !== null && bRoad !== undefined) return 1;

      const aStraight = a.leg?.straightLineKm ?? Number.POSITIVE_INFINITY;
      const bStraight = b.leg?.straightLineKm ?? Number.POSITIVE_INFINITY;
      return aStraight - bStraight;
    });
}

export type { RouteLeg, RouteMatrix, RouteSource };
