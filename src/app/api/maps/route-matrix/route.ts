import { NextRequest, NextResponse } from "next/server";
import type { RouteLeg, RouteMatrix, RouteSource } from "@/types";
import { calculateDistanceKm } from "@/lib/geo";
import {
  buildOsrmTableUrl,
  mapOsrmProfile,
  parseOsrmTable,
} from "@/lib/osrm";

export const runtime = "nodejs";

/* ────────────────────────────────────────────────────────────────────
   Road travel time for the emergency hospital list.

   WHY A BATCH CALL
   One table call for every hospital, not one call per hospital.
   That is both cheaper and far faster, and it means the whole list
   upgrades at once when the response lands.

   DEGRADATION CHAIN (PRD §5.2.3)
     Google Routes → Google Directions → OSRM → Haversine fallback.
   Google is used only when a key is configured. OSRM needs no key and
   is the default provider. The emergency screen never waits for any
   of them — it renders with straight-line distances immediately and
   upgrades in place (invariant S-3).
   ──────────────────────────────────────────────────────────────────── */

const HARD_TIMEOUT_MS = 3500;
const CACHE_TTL_MS = 15 * 60_000;
const MAX_DESTINATIONS = 25;

/** In-memory cache. Keyed on origin + travel mode + the destination set. */
const cache = new Map<string, { expires: number; matrix: RouteMatrix }>();

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || "";
const DEFAULT_TRAVEL_MODE = process.env.GOOGLE_MAPS_TRAVEL_MODE || "DRIVE";
const OSRM_BASE_URL =
  process.env.OSRM_BASE_URL || "https://router.project-osrm.org";
const OSRM_DEFAULT_PROFILE = process.env.OSRM_PROFILE || "driving";

interface ParsedDestination {
  id: string;
  latitude: number;
  longitude: number;
}

/**
 * Parses "id:lat,lng" pairs separated by ";".
 */
function parseDestinations(raw: string | null): ParsedDestination[] {
  if (!raw) return [];
  const out: ParsedDestination[] = [];

  for (const part of raw.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const separator = trimmed.indexOf(":");
    if (separator === -1) continue;

    const id = trimmed.slice(0, separator);
    const [latRaw, lngRaw] = trimmed.slice(separator + 1).split(",");
    const latitude = Number(latRaw);
    const longitude = Number(lngRaw);

    if (!id) continue;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
    if (latitude < -90 || latitude > 90) continue;
    if (longitude < -180 || longitude > 180) continue;

    out.push({ id, latitude, longitude });
    if (out.length >= MAX_DESTINATIONS) break;
  }

  return out;
}

function parseOrigin(raw: string | null): { lat: number; lng: number } | null {
  if (!raw) return null;
  const [latRaw, lngRaw] = raw.split(",");
  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

/**
 * Cache key.
 *
 * It MUST include the destination set and the travel mode. Keying on
 * the origin alone (the previous behaviour) served the first matrix to
 * every later request from the same point, even when the hospital set
 * differed — a wrong-ETA bug that looked like a cache "hit".
 *
 * The origin is rounded to a ~110 m grid so small GPS drift still hits.
 */
function cacheKey(
  origin: { lat: number; lng: number },
  travelMode: string,
  destinations: ParsedDestination[],
): string {
  const dest = destinations
    .map((d) => `${d.id}:${d.latitude.toFixed(4)},${d.longitude.toFixed(4)}`)
    .join(";");
  return `${origin.lat.toFixed(3)},${origin.lng.toFixed(3)}|${travelMode}|${dest}`;
}

/**
 * Normalises the travel mode into the vocabulary each provider expects.
 *
 * The client sends "driving" (lowercase, Google-Directions style);
 * the Routes API expects "DRIVE". OSRM maps the result again.
 */
function normalizeTravelMode(value: string): string {
  const mode = value.toUpperCase();
  if (mode === "DRIVING") return "DRIVE";
  if (mode === "WALKING") return "WALK";
  if (mode === "BICYCLING") return "BICYCLE";
  return mode;
}

function haversineLegs(
  origin: { lat: number; lng: number },
  destinations: ParsedDestination[],
): RouteLeg[] {
  return destinations.map((destination) => ({
    id: destination.id,
    durationMinutes: null,
    durationText: null,
    distanceMeters: null,
    distanceText: null,
    straightLineKm: calculateDistanceKm(
      { latitude: origin.lat, longitude: origin.lng },
      { latitude: destination.latitude, longitude: destination.longitude },
    ),
  }));
}

function fallbackMatrix(
  origin: { lat: number; lng: number },
  destinations: ParsedDestination[],
): RouteMatrix {
  return {
    source: "haversine-fallback",
    origin,
    results: haversineLegs(origin, destinations),
    cachedAt: new Date().toISOString(),
  };
}

/* ────────────────────────────────────────────────────────────────────
   Routes API (preferred)
   ──────────────────────────────────────────────────────────────────── */
async function fetchFromRoutesApi(
  origin: { lat: number; lng: number },
  destinations: ParsedDestination[],
  travelMode: string,
): Promise<RouteLeg[] | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HARD_TIMEOUT_MS);

  try {
    const response = await fetch(
      "https://routes.googleapis.com/directions/v2:computeRouteMatrix",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
          "X-Goog-FieldMask":
            "originIndex,destinationIndex,duration,distanceMeters,status",
        },
        signal: controller.signal,
        body: JSON.stringify({
          origins: [
            { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
          ],
          destinations: destinations.map((destination) => ({
            location: {
              latLng: {
                latitude: destination.latitude,
                longitude: destination.longitude,
              },
            },
          })),
          travelMode,
          routingPreference: "TRAFFIC_AWARE",
        }),
      },
    );

    if (!response.ok) return null;

    const payload = await response.json();

    // The Routes API returns an array of elements, one per destination.
    const rows: any[] = Array.isArray(payload) ? payload : (payload?.elements ?? []);
    if (!rows.length) return null;

    const legs: RouteLeg[] = destinations.map((destination, index) => {
      const row =
        rows.find((r) => r?.destinationIndex === index) ?? rows[index];
      const durationSeconds = Number(row?.duration?.seconds ?? row?.duration ?? 0);
      const distanceMeters = Number(row?.distanceMeters ?? 0);
      const straightLineKm = calculateDistanceKm(
        { latitude: origin.lat, longitude: origin.lng },
        { latitude: destination.latitude, longitude: destination.longitude },
      );

      if (!durationSeconds || !distanceMeters) {
        return {
          id: destination.id,
          durationMinutes: null,
          durationText: null,
          distanceMeters: null,
          distanceText: null,
          straightLineKm,
        };
      }

      return {
        id: destination.id,
        durationMinutes: Math.max(1, Math.round(durationSeconds / 60)),
        durationText: null,
        distanceMeters,
        distanceText: null,
        straightLineKm,
      };
    });

    return legs;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/* ────────────────────────────────────────────────────────────────────
   Directions API (fallback — one call per destination)
   ──────────────────────────────────────────────────────────────────── */
async function fetchFromDirectionsApi(
  origin: { lat: number; lng: number },
  destinations: ParsedDestination[],
): Promise<RouteLeg[] | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HARD_TIMEOUT_MS);

  try {
    const legs = await Promise.all(
      destinations.map(async (destination) => {
        const url = new URL("https://maps.googleapis.com/maps/api/directions/json");
        url.searchParams.set("origin", `${origin.lat},${origin.lng}`);
        url.searchParams.set(
          "destination",
          `${destination.latitude},${destination.longitude}`,
        );
        url.searchParams.set("mode", "driving");
        url.searchParams.set("key", GOOGLE_MAPS_API_KEY);

        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) return null;

        const payload = await response.json();
        const route = payload?.routes?.[0];
        const leg = route?.legs?.[0];
        const durationSeconds = Number(leg?.duration?.value ?? 0);
        const distanceMeters = Number(leg?.distance?.value ?? 0);

        if (!durationSeconds || !distanceMeters) return null;

        return {
          id: destination.id,
          durationMinutes: Math.max(1, Math.round(durationSeconds / 60)),
          durationText: route?.legs?.[0]?.duration?.text ?? null,
          distanceMeters,
          distanceText: leg?.distance?.text ?? null,
          straightLineKm: calculateDistanceKm(
            { latitude: origin.lat, longitude: origin.lng },
            { latitude: destination.latitude, longitude: destination.longitude },
          ),
        } satisfies RouteLeg;
      }),
    );

    if (legs.every((leg) => leg === null)) return null;
    return legs as RouteLeg[];
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/* ────────────────────────────────────────────────────────────────────
   OSRM table service (default provider — no key, no billing)
   ──────────────────────────────────────────────────────────────────── */
async function fetchFromOsrm(
  origin: { lat: number; lng: number },
  destinations: ParsedDestination[],
  travelMode: string,
): Promise<RouteLeg[] | null> {
  if (!OSRM_BASE_URL) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HARD_TIMEOUT_MS);

  try {
    const profile =
      !OSRM_DEFAULT_PROFILE || OSRM_DEFAULT_PROFILE === "driving"
        ? mapOsrmProfile(travelMode)
        : OSRM_DEFAULT_PROFILE;

    const url = buildOsrmTableUrl(OSRM_BASE_URL, profile, origin, destinations);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    if (!response.ok) return null;

    const payload = await response.json();
    return parseOsrmTable(payload, origin, destinations);
  } catch {
    // Timeout, DNS, rate limit, malformed body — the caller degrades.
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/* ────────────────────────────────────────────────────────────────────
   GET /api/maps/route-matrix
   ──────────────────────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;

  const origin = parseOrigin(params.get("origin"));
  const destinations = parseDestinations(params.get("destinations"));

  if (!origin) {
    return NextResponse.json(
      { ok: false, error: "A valid origin is required." },
      { status: 400 },
    );
  }

  if (!destinations.length) {
    return NextResponse.json({
      ok: true,
      source: "haversine-fallback" as RouteSource,
      origin,
      results: [],
      cachedAt: new Date().toISOString(),
    });
  }

  const travelMode = normalizeTravelMode(
    params.get("travelMode") || DEFAULT_TRAVEL_MODE,
  );

  // ── Cache hit ──
  const key = cacheKey(origin, travelMode, destinations);
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json({ ok: true, ...cached.matrix, cached: true });
  }

  // ── Provider chain ──
  let legs: RouteLeg[] | null = null;
  let source: RouteSource = "haversine-fallback";

  // Google is optional. Without a key we must not even attempt the
  // call — it can only fail and burn the timeout budget.
  if (GOOGLE_MAPS_API_KEY) {
    legs = await fetchFromRoutesApi(origin, destinations, travelMode);
    if (legs) {
      source = "routes-api";
    } else {
      legs = await fetchFromDirectionsApi(origin, destinations);
      if (legs) source = "directions-api";
    }
  }

  // OSRM is the default when Google is absent, and the fallback when
  // Google is present but failing. No key, no billing.
  if (!legs) {
    legs = await fetchFromOsrm(origin, destinations, travelMode);
    if (legs) source = "osrm";
  }

  if (!legs) {
    const matrix = fallbackMatrix(origin, destinations);
    return NextResponse.json({ ok: true, ...matrix, cached: false });
  }

  const matrix: RouteMatrix = {
    source,
    origin,
    results: legs,
    cachedAt: new Date().toISOString(),
  };

  cache.set(key, { expires: Date.now() + CACHE_TTL_MS, matrix });

  // Opportunistic cleanup so the cache never grows unbounded.
  if (cache.size > 200) {
    for (const [cacheKey, entry] of cache.entries()) {
      if (entry.expires <= Date.now()) cache.delete(cacheKey);
    }
    while (cache.size > 250) {
      const oldest = cache.keys().next();
      if (oldest.done) break;
      cache.delete(oldest.value);
    }
  }

  try {
    return NextResponse.json({ ok: true, ...matrix, cached: false });
  } catch (error) {
    console.error("[API Route Matrix Error]:", error);
    return NextResponse.json(
      { ok: false, error: "Routing service temporarily unavailable." },
      { status: 500 },
    );
  }
}
