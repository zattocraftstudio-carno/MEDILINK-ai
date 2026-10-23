/* ═══════════════════════════════════════════════════════════════════
   MediLink — consultation summary store.

   Holds the doctor-handover summaries produced from a chat session.
   Persisted under "medilink_summaries".

   The summary is machine output until the patient edits or confirms it,
   so the UI always shows it as a draft first (safety invariant S-2).
   ═══════════════════════════════════════════════════════════════════ */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ConsultationSummary } from "@/types";

/** Free plan keeps the last 3 summaries; Premium keeps all. */
const FREE_RETENTION = 3;

interface SummaryState {
  summaries: ConsultationSummary[];
  /** The most recently produced summary, regardless of session. */
  latestId: string | null;
  addSummary: (summary: ConsultationSummary) => void;
  updateSummary: (id: string, patch: Partial<ConsultationSummary>) => void;
  removeSummary: (id: string) => void;
  getById: (id: string) => ConsultationSummary | undefined;
  getForSession: (sessionId: string) => ConsultationSummary | undefined;
  getLatest: () => ConsultationSummary | undefined;
  clear: () => void;
}

export const useSummaryStore = create<SummaryState>()(
  persist(
    (set, get) => ({
      summaries: [],
      latestId: null,

      addSummary: (summary) =>
        set((state) => ({
          summaries: [summary, ...state.summaries.filter((s) => s.id !== summary.id)],
          latestId: summary.id,
        })),

      updateSummary: (id, patch) =>
        set((state) => ({
          summaries: state.summaries.map((summary) =>
            summary.id === id ? { ...summary, ...patch, edited: true } : summary,
          ),
        })),

      removeSummary: (id) =>
        set((state) => ({
          summaries: state.summaries.filter((summary) => summary.id !== id),
          latestId: state.latestId === id ? null : state.latestId,
        })),

      getById: (id) => get().summaries.find((summary) => summary.id === id),

      getForSession: (sessionId) =>
        get().summaries.find((summary) => summary.sessionId === sessionId),

      getLatest: () => {
        const { summaries, latestId } = get();
        if (latestId) {
          const found = summaries.find((summary) => summary.id === latestId);
          if (found) return found;
        }
        return summaries[0];
      },

      clear: () => set({ summaries: [], latestId: null }),
    }),
    {
      name: "medilink_summaries",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

/** Trims the stored history to the plan's retention. */
export function trimSummaries(
  summaries: ConsultationSummary[],
  isPremium: boolean,
): ConsultationSummary[] {
  if (isPremium) return summaries;
  return summaries.slice(0, FREE_RETENTION);
}
