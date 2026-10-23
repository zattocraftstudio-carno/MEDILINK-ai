import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { MemoryItem, MemoryCategory } from "@/types";
import {
  extractAutoMemories,
  createMemoryId,
  normaliseMemoryText,
  MAX_MEMORIES,
} from "@/lib/memory";

/**
 * MediLink — long-term patient memory store.
 *
 * Durable facts extracted from chat messages ("I have diabetes", "I'm
 * allergic to penicillin") are stored here. The extraction itself is
 * deterministic (regex, no LLM call) and runs client-side after every
 * user message via `processUserMessage()`.
 *
 * These memories are then passed to the chat API in the request body
 * and injected into the system prompt as a [PATIENT MEMORY] DATA block.
 */

function dedupeKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

interface MemoryState {
  memories: MemoryItem[];

  /** Add a single memory. Deduplicates by normalised text. */
  addMemory: (
    text: string,
    category: MemoryCategory,
    source: MemoryItem["source"],
  ) => void;

  /** Remove a memory by ID. */
  removeMemory: (id: string) => void;

  /**
   * Run the deterministic auto-extraction engine on the user's latest
   * message and store any high-confidence facts it finds.
   */
  processUserMessage: (text: string) => void;
}

export const useMemoryStore = create<MemoryState>()(
  persist(
    (set, get) => ({
      memories: [],

      addMemory: (text, category, source) => {
        const normalised = normaliseMemoryText(text);
        if (!normalised || normalised.length < 3) return;

        const existing = get().memories;
        const key = dedupeKey(normalised);
        if (existing.some((m) => dedupeKey(m.text) === key)) return;

        const item: MemoryItem = {
          id: createMemoryId(),
          text: normalised,
          category,
          source,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        // Cap at MAX_MEMORIES; oldest items are dropped.
        set({ memories: [...existing, item].slice(-MAX_MEMORIES) });
      },

      removeMemory: (id) => {
        set({ memories: get().memories.filter((m) => m.id !== id) });
      },

      processUserMessage: (text) => {
        const candidates = extractAutoMemories(text);
        const { addMemory } = get();
        for (const candidate of candidates) {
          addMemory(candidate.text, candidate.category, "auto");
        }
      },
    }),
    {
      name: "medilink_memories",
    },
  ),
);
