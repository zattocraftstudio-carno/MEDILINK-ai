/* ═══════════════════════════════════════════════════════════════════
   MediLink — service worker (dose reminders).

   Tier 2 delivery: a notification raised through the service worker
   survives the tab being backgrounded on mobile, where a plain
   `new Notification()` would be dropped.

   True closed-tab delivery needs Web Push (VAPID) plus a server-side
   scheduler — that is the v3.1 upgrade path, not this file.

   The worker is intentionally minimal: it does not cache or intercept
   anything, because a healthcare app must never serve a stale copy of
   a prescription or a chat transcript.
   ═══════════════════════════════════════════════════════════════════ */

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

/**
 * Tapping a reminder focuses the chat tab if it is open, otherwise a
 * new one is opened.
 */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const action = event.action || "";
  const data = event.notification.data || {};

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const target = clients.find((client) => client.url.includes("/chat"));

      if (target) {
        if (action === "taken" && data.occurrenceId) {
          target.postMessage({
            type: "dose-taken",
            occurrenceId: data.occurrenceId,
            scheduleId: data.scheduleId,
          });
        }
        return target.focus();
      }

      return self.clients.openWindow("/medications");
    }),
  );
});

/**
 * Web Push handler — wired up in v3.1 when a push backend exists.
 * Left in place so the subscription path is already correct.
 */
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "MediLink", body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || "MediLink", {
      body: payload.body || "",
      tag: payload.tag,
      icon: "/assets/medicines/paracetamol.jpg",
      badge: "/favicon.ico",
      data: {
        occurrenceId: payload.occurrenceId,
        scheduleId: payload.scheduleId,
      },
    }),
  );
});
