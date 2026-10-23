/* ═══════════════════════════════════════════════════════════════════
   MediLink — medication schedule store.

   Holds the dose reminders the patient confirmed. Persisted under
   "medilink_schedules".

   Occurrences older than a week are pruned on write: they are useless
   for reminders and would otherwise bloat localStorage indefinitely.

   SAFETY INVARIANT S-1
   A schedule only ever exists because the patient confirmed it. The
   store never creates one on its own.
   ═══════════════════════════════════════════════════════════════════ */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { DoseOccurrence, DoseOccurrenceStatus, MedicationSchedule } from "@/types";
import {
  deriveOccurrences,
  getMissedOccurrences,
  getUpcomingOccurrences,
  markOccurrence as markOccurrenceIn,
} from "@/lib/dose-schedule";

/** Occurrences older than this are dropped from persisted state. */
const OCCURRENCE_RETENTION_DAYS = 7;

function pruneOccurrences(schedule: MedicationSchedule): MedicationSchedule {
  const cutoff = Date.now() - OCCURRENCE_RETENTION_DAYS * 86_400_000;
  const kept = schedule.occurrences.filter(
    (occurrence) => occurrence.scheduledAt >= cutoff || occurrence.status !== "missed",
  );
  return kept.length === schedule.occurrences.length ? schedule : { ...schedule, occurrences: kept };
}

interface MedicationState {
  schedules: MedicationSchedule[];
  /** True once the persisted state has been read back. */
  hydrated: boolean;
  /**
   * Waits for the persisted state to load, then derives the occurrence
   * window.
   *
   * This matters: a `set()` before rehydration completes writes the
   * EMPTY initial state straight back to storage, wiping whatever the
   * patient had saved (the same class of bug as the chat-session race).
   */
  hydrate: () => Promise<void>;
  addSchedule: (schedule: MedicationSchedule) => void;
  updateSchedule: (id: string, patch: Partial<MedicationSchedule>) => void;
  deleteSchedule: (id: string) => void;
  markOccurrence: (scheduleId: string, occurrenceId: string, status: DoseOccurrenceStatus) => void;
  /** Re-derives the occurrence window — called after hydration. */
  refreshOccurrences: (now?: number) => void;
  getUpcoming: (now?: number) => DoseOccurrence[];
  getMissed: (now?: number) => DoseOccurrence[];
  getById: (id: string) => MedicationSchedule | undefined;
  clear: () => void;
}

export const useMedicationStore = create<MedicationState>()(
  persist(
    (set, get) => ({
      schedules: [],
      hydrated: false,

      hydrate: async () => {
        if (get().hydrated) return;

        if (!useMedicationStore.persist.hasHydrated()) {
          await new Promise<void>((resolve) => {
            let unsubscribe: (() => void) | undefined;
            unsubscribe = useMedicationStore.persist.onFinishHydration(() => {
              resolve();
              unsubscribe?.();
            });
          });
        }

        set({ hydrated: true });
        get().refreshOccurrences();
      },

      addSchedule: (schedule) =>
        set((state) => ({
          schedules: [schedule, ...state.schedules],
        })),

      updateSchedule: (id, patch) =>
        set((state) => ({
          schedules: state.schedules.map((schedule) =>
            schedule.id === id ? { ...schedule, ...patch, updatedAt: Date.now() } : schedule,
          ),
        })),

      deleteSchedule: (id) =>
        set((state) => ({
          schedules: state.schedules.filter((schedule) => schedule.id !== id),
        })),

      markOccurrence: (scheduleId, occurrenceId, status) =>
        set((state) => ({
          schedules: state.schedules.map((schedule) =>
            schedule.id === scheduleId
              ? markOccurrenceIn(schedule, occurrenceId, status)
              : schedule,
          ),
        })),

      refreshOccurrences: (now = Date.now()) =>
        set((state) => {
          // Never write before hydration — that would persist the empty
          // initial state over the patient's saved schedules.
          if (!state.hydrated) return state;

          return {
            schedules: state.schedules.map((schedule) => {
              if (schedule.status !== "active") return schedule;
              const derived = deriveOccurrences(schedule, now, 72, schedule.occurrences);
              return pruneOccurrences({ ...schedule, occurrences: derived });
            }),
          };
        }),

      getUpcoming: (now = Date.now()) => getUpcomingOccurrences(get().schedules, now),

      getMissed: (now = Date.now()) => getMissedOccurrences(get().schedules, now),

      getById: (id) => get().schedules.find((schedule) => schedule.id === id),

      clear: () => set({ schedules: [] }),
    }),
    {
      name: "medilink_schedules",
      storage: createJSONStorage(() => localStorage),
      // `hydrated` is session state, not data.
      partialize: (state) => ({
        schedules: state.schedules.map(pruneOccurrences),
      }),
    },
  ),
);
