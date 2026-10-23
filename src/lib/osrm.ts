/* ═══════════════════════════════════════════════════════════════════
   MediLink — OSRM road routing (SERVER ONLY helpers).

   WHY OSRM
   Haversine gives the great-circle distance — the shortest path over
   the earth's surface, ignoring rivers, bridges, one-way systems and
   traffic. In a river city like Dhaka, a "1.4 km" straight-line rating
   can be a 12 km, 40-minute road journey, and sorting emergency
   hospitals by it can put the WRONG hospital first.

   OSRM (Open Source Routing Machine) gives real road distance and
   driving time with:
     • no API key
     • no billing account
     • no per-request quota on a self-hosted instance

   LIMITATION — HONESTY
   The public demo server (router.project-osrm.org) routes on
   free-flow speed. It has NO live traffic data. The UI must say
   "driving", never "live traffic". For production, self-host with the
   Bangladesh OSM extract (see prds/MASTER-PLAN-two-agents.md).

   COORDINATE ORDER — the classic bug
   OSRM takes `longitude,latitude` (X,Y). Google takes
   `latitude,longitude`. Everything in this file is lon-first on the
   way out; the rest of the app stays lat-first.
   ═══════════════════════════════════════════════════════════════════ */

import type { RouteLeg } from "@/types";
import { calculateDistanceKm } from "./geo";
import { formatRouteDistance, formatTravelTime } from "./maps";

export interface OsrmOrigin {
  lat: number;
  lng: number;
}

export interface OsrmDestination {
  id: string;
  latitude: number;
  longitude: number;
}

/** The public demo server. Override with OSRM_BASE_URL. */
export const DEFAULT_OSRM_BASE_URL = "https://router.project-osrm.org";

/** Longest URL the route handler will build before giving up. */
export const OSRM_MAX_DESTINATIONS = 25;

export type OsrmProfile = "driving" | "walking" | "cycling";

/**
 * Maps the app's travel-mode vocabulary onto an OSRM profile.
 *
 * Note: the public demo server only serves the car profile. It still
 * accepts other profile names in the path but routes them as driving,
 * so callers that need true walking/cycling must point
 * OSRM_BASE_URL at a server that exposes those profiles.
 */
export function mapOsrmProfile(travelMode?: string | null): OsrmProfile {
  const mode = (travelMode ?? "").toUpperCase();
  if (mode === "WALK" || mode === "WALKING") return "walking";
  if (mode === "BICYCLE" || mode === "BICYCLING" || mode === "CYCLING") {
    return "cycling";
  }
  return "driving";
}

/**
 * Builds a Table-service URL.
 *
 *   {base}/table/v1/{profile}/{lon},{lat};{lon},{lat};…?annotations=duration,distance
 *
 * The first coordinate is the origin; the rest are destinations, in
 * the same order as `destinations`.
 */
export function buildOsrmTableUrl(
  baseUrl: string,
  profile: string,
  origin: OsrmOrigin,
  destinations: OsrmDestination[],
): string {
  const coordinates = [
    `${origin.lng},${origin.lat}`,
    ...destinations.map((d) => `${d.longitude},${d.latitude}`),
  ].join(";");

  const base = baseUrl.replace(/\/+$/, "");
  return `${base}/table/v1/${profile}/${coordinates}?annotations=duration,distance`;
}

function positiveNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : null;
}

/**
 * Parses a Table-service response into RouteLegs.
 *
 * Returns `null` when the payload is not a usable OSRM answer, so the
 * caller can fall back instead of showing garbage. Individual
 * unreachable pairs (OSRM returns `null` for those) keep
 * `straightLineKm` and carry no ETA — we never invent one.
 */
export function parseOsrmTable(
  payload: unknown,
  origin: OsrmOrigin,
  destinations: OsrmDestination[],
): RouteLeg[] | null {
  if (!payload || typeof payload !== "object") return null;

  const record = payload as Record<string, unknown>;
  if (record.code !== "Ok") return null;

  const durations = record.durations;
  const distances = record.distances;
  if (!Array.isArray(durations) || !Array.isArray(distances)) return null;

  const durationRow = durations[0];
  const distanceRow = distances[0];
  if (!Array.isArray(durationRow) || !Array.isArray(distanceRow)) return null;

  // Row 0 is the origin itself; each destination follows in order.
  if (durationRow.length < destinations.length + 1) return null;

  return destinations.map((destination, index) => {
    const seconds = positiveNumber(durationRow[index + 1]);
    const meters = positiveNumber(distanceRow[index + 1]);
    const durationMinutes = seconds === null ? null : Math.max(1, Math.round(seconds / 60));

    return {
      id: destination.id,
      durationMinutes,
      durationText: durationMinutes === null ? null : formatTravelTime(durationMinutes),
      distanceMeters: meters,
      distanceText: meters === null ? null : formatRouteDistance(meters),
      straightLineKm: calculateDistanceKm(
        { latitude: origin.lat, longitude: origin.lng },
        { latitude: destination.latitude, longitude: destination.longitude },
      ),
    } satisfies RouteLeg;
  });
}
