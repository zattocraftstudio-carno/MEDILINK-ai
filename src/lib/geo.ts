export interface Coordinates {
  latitude: number;
  longitude: number;
}

export const AREA_COORDINATES: Record<string, Coordinates> = {
  Dhaka: { latitude: 23.8103, longitude: 90.4125 },
  Mirpur: { latitude: 23.8223, longitude: 90.3643 },
  Gulshan: { latitude: 23.7925, longitude: 90.4078 },
  Banani: { latitude: 23.7937, longitude: 90.4043 },
  Uttara: { latitude: 23.8759, longitude: 90.3795 },
  Dhanmondi: { latitude: 23.7465, longitude: 90.376 },
  Chattogram: { latitude: 22.3569, longitude: 91.8332 },
  Sylhet: { latitude: 24.8949, longitude: 91.8687 },
  Rajshahi: { latitude: 24.3745, longitude: 88.6042 },
  Khulna: { latitude: 22.8456, longitude: 89.5403 },
  Barishal: { latitude: 22.701, longitude: 90.3535 },
  Rangpur: { latitude: 25.7439, longitude: 89.2752 },
  Mymensingh: { latitude: 24.7471, longitude: 90.4203 },
};

/**
 * Calculates the great-circle distance between two points in kilometers using Haversine formula
 */
export function calculateDistanceKm(
  coord1: Coordinates,
  coord2: Coordinates
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const dLon = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

  const lat1 = (coord1.latitude * Math.PI) / 180;
  const lat2 = (coord2.latitude * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c;
  return Math.round(distance * 10) / 10; // 1 decimal place
}

/**
 * Formats distance in km (e.g. "1.4 km")
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

/**
 * Resolves coordinates for a known area name fallback.
 *
 * Returns `null` for an unknown area. Previously it silently returned
 * Dhaka's coordinates for ANY unrecognised name — including the register
 * page's "Other" option — so the "nearby" distances were Dhaka's no matter
 * where the patient actually was.
 */
export function getCoordinatesForArea(areaName?: string): Coordinates | null {
  if (!areaName) return null;
  const needle = areaName.toLowerCase().trim();
  for (const [key, coords] of Object.entries(AREA_COORDINATES)) {
    if (needle === key.toLowerCase()) return coords;
  }
  for (const [key, coords] of Object.entries(AREA_COORDINATES)) {
    if (needle.includes(key.toLowerCase())) return coords;
  }
  return null;
}

/**
 * Requests browser geolocation coordinates with timeout
 */
export function getCurrentLocation(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 60000,
      }
    );
  });
}
