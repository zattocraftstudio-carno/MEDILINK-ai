/* ═══════════════════════════════════════════════════════════════════
   MediLink — attachment store (metadata only).

   The binary lives in IndexedDB (src/lib/attachments.ts). This store
   holds the small, serialisable half: id, url, type, timestamp and the
   OCR result. That split is deliberate — localStorage has a ~5 MB
   quota and a single photo would evict the whole app's state.

   Persisted under "medilink_attachments".
   ═══════════════════════════════════════════════════════════════════ */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Attachment } from "@/types";
import { blobUrlFor, deleteBlob } from "@/lib/attachments";

interface AttachmentState {
  attachments: Attachment[];
  /** True once the object URLs have been restored from IndexedDB. */
  hydrated: boolean;
  /**
   * Restores object URLs after a page reload. A `blob:` URL from a
   * previous session is dead, so every attachment is re-created from
   * its IndexedDB blob.
   */
  hydrate: () => Promise<void>;
  addAttachment: (attachment: Attachment) => void;
  updateAttachment: (id: string, patch: Partial<Attachment>) => void;
  removeAttachment: (id: string) => void;
  getById: (id: string) => Attachment | undefined;
  getByMessageId: (messageId: string) => Attachment[];
  getConfirmed: () => Attachment[];
  clear: () => void;
}

export const useAttachmentStore = create<AttachmentState>()(
  persist(
    (set, get) => ({
      attachments: [],
      hydrated: false,

      hydrate: async () => {
        if (get().hydrated) return;

        // The store's own rehydration is asynchronous — wait for it so we
        // do not hydrate an empty list.
        if (!useAttachmentStore.persist.hasHydrated()) {
          await new Promise<void>((resolve) => {
            let unsubscribe: (() => void) | undefined;
            unsubscribe = useAttachmentStore.persist.onFinishHydration(() => {
              resolve();
              unsubscribe?.();
            });
          });
        }

        // Collect the fresh object URLs first…
        const urls = new Map<string, string>();
        for (const attachment of get().attachments) {
          const url = await blobUrlFor(attachment.id);
          if (url) urls.set(attachment.id, url);
        }

        // …then merge into the CURRENT state. A scan result that landed
        // while we were reading IndexedDB must not be overwritten by this
        // snapshot.
        set((state) => ({
          attachments: state.attachments.map((attachment) => {
            const url = urls.get(attachment.id);
            return url ? { ...attachment, url } : attachment;
          }),
          hydrated: true,
        }));
      },

      addAttachment: (attachment) =>
        set((state) => ({
          attachments: [attachment, ...state.attachments],
        })),

      updateAttachment: (id, patch) =>
        set((state) => ({
          attachments: state.attachments.map((attachment) =>
            attachment.id === id ? { ...attachment, ...patch } : attachment,
          ),
        })),

      removeAttachment: (id) => {
        set((state) => ({
          attachments: state.attachments.filter((attachment) => attachment.id !== id),
        }));
        void deleteBlob(id);
      },

      getById: (id) => get().attachments.find((attachment) => attachment.id === id),

      getByMessageId: (messageId) =>
        get().attachments.filter((attachment) => attachment.messageId === messageId),

      /** Confirmed documents only — used by the doctor handover (S-2). */
      getConfirmed: () => get().attachments.filter((attachment) => attachment.verified),

      clear: () => {
        for (const attachment of get().attachments) {
          void deleteBlob(attachment.id);
        }
        set({ attachments: [] });
      },
    }),
    {
      name: "medilink_attachments",
      storage: createJSONStorage(() => localStorage),
      // `hydrated` is session state, not data — it must not be persisted.
      partialize: (state) => ({ attachments: state.attachments }),
    },
  ),
);
