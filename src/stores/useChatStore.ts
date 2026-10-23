import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { ChatSession, ChatMessage } from "@/types";

interface ChatState {
  sessions: ChatSession[];
  activeSessionId: string | null;
  selectedModel: "med1-flash" | "med1-pro";
  dailyUsage: { date: string; count: number };
  setSelectedModel: (model: "med1-flash" | "med1-pro") => void;
  setActiveSessionId: (id: string | null) => void;
  createNewSession: () => string;
  addMessage: (sessionId: string, message: Omit<ChatMessage, "id">) => void;
  updateLastAssistantMessage: (sessionId: string, content: string) => void;
  deleteSession: (sessionId: string) => void;
  clearAllSessions: () => void;
  incrementDailyUsage: () => void;
  getRemainingChatsToday: (isPremium: boolean) => number;
}

/**
 * Today's date in the user's LOCAL timezone.
 *
 * `toISOString()` would give the UTC date, which for Bangladesh (UTC+6)
 * rolls over at 06:00 local — so the free-plan quota would reset six
 * hours early (audit CH-004).
 */
const getTodayDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      sessions: [],
      activeSessionId: null,
      selectedModel: "med1-flash",
      dailyUsage: { date: getTodayDateString(), count: 0 },

      setSelectedModel: (model) => set({ selectedModel: model }),

      setActiveSessionId: (id) => set({ activeSessionId: id }),

      createNewSession: () => {
        const id = Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
        const newSession: ChatSession = {
          id,
          title: "New Conversation",
          modelUsed: get().selectedModel,
          messages: [],
          createdAt: Date.now(),
        };
        set((state) => ({
          sessions: [newSession, ...state.sessions],
          activeSessionId: id,
        }));
        return id;
      },

      addMessage: (sessionId, msg) => {
        const messageId = Math.random().toString(36).substring(2, 9);
        const newMessage: ChatMessage = {
          ...msg,
          id: messageId,
        };

        set((state) => {
          const sessions = state.sessions.map((session) => {
            if (session.id === sessionId) {
              const updatedMessages = [...session.messages, newMessage];
              // If this was the first user message, generate title
              let title = session.title;
              if (session.title === "New Conversation" && msg.role === "user") {
                title = msg.content.slice(0, 32).trim() + (msg.content.length > 32 ? "..." : "");
              }
              return {
                ...session,
                title,
                messages: updatedMessages,
              };
            }
            return session;
          });

          return { sessions };
        });
      },

      updateLastAssistantMessage: (sessionId, content) => {
        set((state) => {
          const sessions = state.sessions.map((session) => {
            if (session.id === sessionId) {
              const messages = [...session.messages];
              if (messages.length > 0 && messages[messages.length - 1].role === "assistant") {
                messages[messages.length - 1] = {
                  ...messages[messages.length - 1],
                  content,
                };
              }
              return { ...session, messages };
            }
            return session;
          });
          return { sessions };
        });
      },

      deleteSession: (sessionId) => {
        set((state) => {
          const sessions = state.sessions.filter((s) => s.id !== sessionId);
          const activeSessionId =
            state.activeSessionId === sessionId
              ? sessions.length > 0
                ? sessions[0].id
                : null
              : state.activeSessionId;
          return { sessions, activeSessionId };
        });
      },

      clearAllSessions: () => {
        set({ sessions: [], activeSessionId: null });
      },

      incrementDailyUsage: () => {
        const today = getTodayDateString();
        const current = get().dailyUsage;
        if (current.date !== today) {
          set({ dailyUsage: { date: today, count: 1 } });
        } else {
          set({ dailyUsage: { date: today, count: current.count + 1 } });
        }
      },

      getRemainingChatsToday: (isPremium: boolean) => {
        if (isPremium) return 999;
        const today = getTodayDateString();
        const current = get().dailyUsage;
        if (current.date !== today) return 2;
        return Math.max(0, 2 - current.count);
      },
    }),
    {
      name: "medilink_chat_history",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
