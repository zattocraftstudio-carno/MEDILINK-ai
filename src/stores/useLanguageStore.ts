import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Language, TranslationSchema } from "@/lib/i18n";
import { translations } from "@/lib/i18n";

interface LanguageState {
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  t: TranslationSchema;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      language: "en",
      t: translations.en,

      setLanguage: (language) => {
        set({
          language,
          t: translations[language],
        });
        if (typeof document !== "undefined") {
          document.documentElement.lang = language;
        }
      },

      toggleLanguage: () => {
        const nextLang: Language = get().language === "en" ? "bn" : "en";
        get().setLanguage(nextLang);
      },
    }),
    {
      name: "medilink_language",
      onRehydrateStorage: () => (state) => {
        if (state && typeof document !== "undefined") {
          document.documentElement.lang = state.language;
          state.t = translations[state.language] || translations.en;
        }
      },
    }
  )
);
