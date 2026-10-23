import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { HealthLogEntry, HealthLogType } from "@/types";

interface HealthLogState {
  logs: HealthLogEntry[];
  addLog: (entry: Omit<HealthLogEntry, "id" | "measuredAt"> & { measuredAt?: number }) => HealthLogEntry;
  deleteLog: (id: string) => void;
  clearLogs: () => void;
  getRecentLogs: (limit?: number) => HealthLogEntry[];
  getLogsByType: (type: HealthLogType) => HealthLogEntry[];
  formatSummaryForPrompt: (limit?: number) => string;
}

export const HEALTH_LOG_LABELS: Record<HealthLogType, { en: string; bn: string; unit: string }> = {
  bp: { en: "Blood Pressure", bn: "রক্তচাপ", unit: "mmHg" },
  sugar: { en: "Blood Glucose", bn: "ব্লাড সুগার", unit: "mmol/L" },
  temp: { en: "Body Temperature", bn: "শরীরের তাপমাত্রা", unit: "°F" },
  weight: { en: "Weight", bn: "ওজন", unit: "kg" },
  pulse: { en: "Heart Rate", bn: "পালস রেট", unit: "bpm" },
  spo2: { en: "Oxygen Saturation (SpO2)", bn: "অক্সিজেন মাত্রা", unit: "%" },
};

export const useHealthLogStore = create<HealthLogState>()(
  persist(
    (set, get) => ({
      logs: [],

      addLog: (entry) => {
        const id = `hl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const newEntry: HealthLogEntry = {
          id,
          measuredAt: entry.measuredAt || Date.now(),
          ...entry,
        };
        set((state) => ({
          logs: [newEntry, ...state.logs].slice(0, 100), // keep latest 100 entries
        }));
        return newEntry;
      },

      deleteLog: (id) =>
        set((state) => ({
          logs: state.logs.filter((log) => log.id !== id),
        })),

      clearLogs: () => set({ logs: [] }),

      getRecentLogs: (limit = 10) => {
        return get().logs.slice(0, limit);
      },

      getLogsByType: (type) => {
        return get().logs.filter((log) => log.type === type);
      },

      formatSummaryForPrompt: (limit = 5) => {
        const recent = get().logs.slice(0, limit);
        if (recent.length === 0) return "";

        const lines = recent.map((log) => {
          const dateStr = new Date(log.measuredAt).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          });

          if (log.type === "bp") {
            return `• BP: ${log.systolic}/${log.diastolic} mmHg (${dateStr}${log.note ? ` - ${log.note}` : ""})`;
          }

          const label = HEALTH_LOG_LABELS[log.type];
          const contextStr = log.context ? ` [${log.context}]` : "";
          return `• ${label.en}: ${log.value} ${label.unit}${contextStr} (${dateStr}${log.note ? ` - ${log.note}` : ""})`;
        });

        return lines.join("\n");
      },
    }),
    {
      name: "medilink_health_logs",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
