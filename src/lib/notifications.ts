/* ═══════════════════════════════════════════════════════════════════
   MediLink — browser notifications for dose reminders.

   Three delivery tiers (PRD §3.3.5):

     T0  In-app toast + "next dose" pill — always available.
     T1  Web Notification API — works while the app is open.
     T2  Service Worker showNotification — survives the tab being
         backgrounded. True closed-tab delivery needs Web Push
         (VAPID), which is scheduled for v3.1.

   Notification permission may only be requested from a user gesture —
   browsers reject the request otherwise. `requestPermission()` must
   therefore be called directly from a click handler.

   Occurrence ids are the dedupe key: a timer is only armed once per
   occurrence, so a page reload cannot fire the same dose twice.
   ═══════════════════════════════════════════════════════════════════ */

import type { DoseOccurrence, MedicationSchedule } from "@/types";

/* ────────────────────────────────────────────────────────────────────
   Capability detection
   ──────────────────────────────────────────────────────────────────── */

export type NotificationSupport = "unsupported" | "default" | "granted" | "denied";

export function notificationSupport(): NotificationSupport {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission as NotificationSupport;
}

export function notificationsSupported(): boolean {
  const support = notificationSupport();
  return support === "granted" || support === "default";
}

/* ────────────────────────────────────────────────────────────────────
   Permission
   ──────────────────────────────────────────────────────────────────── */

/**
 * Asks for notification permission. MUST be called from a user
 * gesture (the "Enable reminders" button) or the browser will ignore
 * or auto-deny it.
 */
export async function requestNotificationPermission(): Promise<NotificationSupport> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  try {
    const permission = await Notification.requestPermission();
    return permission as NotificationSupport;
  } catch {
    return "denied";
  }
}

/* ────────────────────────────────────────────────────────────────────
   Service worker
   ──────────────────────────────────────────────────────────────────── */

let swRegistration: ServiceWorkerRegistration | null = null;

/**
 * Registers the service worker used for Tier-2 delivery.
 * Registration is skipped in development to keep hot-reload clean.
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  if (swRegistration) return swRegistration;

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    swRegistration = registration;
    return registration;
  } catch {
    return null;
  }
}

/* ────────────────────────────────────────────────────────────────────
   Notification payloads
   ──────────────────────────────────────────────────────────────────── */

export interface DoseNotificationPayload {
  occurrenceId: string;
  scheduleId: string;
  title: string;
  body: string;
  /** Optional note carried from the prescription, e.g. "empty stomach". */
  note?: string;
  tag?: string;
}

export function buildDoseNotification(
  schedule: MedicationSchedule,
  occurrence: DoseOccurrence,
): DoseNotificationPayload {
  const title = `Time for ${schedule.name}`;
  const parts = [schedule.dose];

  if (schedule.preparationNote) parts.push(schedule.preparationNote);
  parts.push("as stated in your chat.");

  return {
    occurrenceId: occurrence.id,
    scheduleId: schedule.id,
    title,
    body: parts.join(" — "),
    note: schedule.preparationNote,
    tag: occurrence.id,
  };
}

export function buildMissedNotification(
  schedule: MedicationSchedule,
  occurrence: DoseOccurrence,
): DoseNotificationPayload {
  return {
    occurrenceId: occurrence.id,
    scheduleId: schedule.id,
    title: `Missed dose — ${schedule.name}`,
    body:
      "This dose was not marked as taken. Follow the label rule — skip it, " +
      "do not double up.",
    tag: `${occurrence.id}-missed`,
  };
}

/* ────────────────────────────────────────────────────────────────────
   Delivery
   ──────────────────────────────────────────────────────────────────── */

const ICON = "/assets/medicines/paracetamol.jpg";
const BADGE = "/favicon.ico";

async function deliver(payload: DoseNotificationPayload): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission !== "granted") return false;

  const options: NotificationOptions = {
    body: payload.body,
    tag: payload.tag ?? payload.occurrenceId,
    icon: ICON,
    badge: BADGE,
    requireInteraction: false,
    data: {
      occurrenceId: payload.occurrenceId,
      scheduleId: payload.scheduleId,
    },
  };

  // Tier 2 first — a service worker notification survives the tab
  // being backgrounded on mobile.
  const registration = swRegistration ?? (await registerServiceWorker());
  if (registration?.showNotification) {
    try {
      await registration.showNotification(payload.title, options);
      return true;
    } catch {
      /* fall through to the plain Notification API */
    }
  }

  try {
    new Notification(payload.title, options);
    return true;
  } catch {
    return false;
  }
}

export { deliver as deliverDoseNotification };

/* ────────────────────────────────────────────────────────────────────
   Scheduler
   ──────────────────────────────────────────────────────────────────── */

/** Longest single timeout browsers accept reliably (~24.8 days). */
const MAX_TIMEOUT_MS = 2_147_000_000;

type TimerHandle = ReturnType<typeof setTimeout>;

const timers = new Map<string, TimerHandle>();

/**
 * Arms a timer for one occurrence. The occurrence id is the dedupe
 * key, so calling this twice for the same dose is harmless.
 */
export function armOccurrenceTimer(
  schedule: MedicationSchedule,
  occurrence: DoseOccurrence,
  onFire?: (occurrenceId: string, scheduleId: string) => void,
): void {
  if (occurrence.status !== "pending") return;
  if (timers.has(occurrence.id)) return;

  const delay = occurrence.scheduledAt - Date.now();
  if (delay <= 0) return;

  const handle = setTimeout(() => {
    timers.delete(occurrence.id);
    void deliver(buildDoseNotification(schedule, occurrence));
    onFire?.(occurrence.id, schedule.id);
  }, Math.min(delay, MAX_TIMEOUT_MS));

  timers.set(occurrence.id, handle);
}

/** Arms timers for every pending occurrence across the given schedules. */
export function armScheduleTimers(
  schedules: MedicationSchedule[],
  onFire?: (occurrenceId: string, scheduleId: string) => void,
): void {
  for (const schedule of schedules) {
    if (schedule.status !== "active") continue;
    for (const occurrence of schedule.occurrences) {
      armOccurrenceTimer(schedule, occurrence, onFire);
    }
  }
}

/** Clears one timer (e.g. the patient marked the dose as taken). */
export function cancelOccurrenceTimer(occurrenceId: string): void {
  const handle = timers.get(occurrenceId);
  if (handle) {
    clearTimeout(handle);
    timers.delete(occurrenceId);
  }
}

/** Clears every timer — used when the schedule is paused or deleted. */
export function cancelAllTimers(): void {
  timers.forEach((handle) => clearTimeout(handle));
  timers.clear();
}

/** Number of armed timers — surfaced in the debug panel. */
export function armedTimerCount(): number {
  return timers.size;
}

/* ────────────────────────────────────────────────────────────────────
   Formatting helpers
   ──────────────────────────────────────────────────────────────────── */

/** "Next dose in 42 min" */
export function formatCountdown(target: number, now: number = Date.now()): string {
  const diff = target - now;
  if (diff <= 0) return "due now";

  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "due in under a minute";
  if (minutes < 60) return `due in ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `due in ${hours} hr ${rest} min` : `due in ${hours} hr`;
}

/** "8:00 AM" */
export function formatClockTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}
