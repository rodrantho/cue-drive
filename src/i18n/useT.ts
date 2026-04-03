import { create } from "zustand";
import { persist } from "zustand/middleware";
import { translations, type Language } from "./translations";

interface LangState {
  language: Language;
  setLanguage: (lang: Language) => void;
}

export const useLangStore = create<LangState>()(
  persist(
    (set) => ({
      language: "es",
      setLanguage: (language) => set({ language }),
    }),
    { name: "cue-drive-language" }
  )
);

export function useT() {
  const language = useLangStore((s) => s.language);
  return translations[language];
}
