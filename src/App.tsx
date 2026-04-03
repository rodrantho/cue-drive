import { useState } from "react";
import { Library, Wand2, Usb } from "lucide-react";
import { LibraryView } from "./components/library/LibraryView";
import { SetBuilderView } from "./components/setbuilder/SetBuilderView";
import { ExportView } from "./components/export/ExportView";
import { AudioPlayer } from "./components/player/AudioPlayer";
import { cn } from "./utils/cn";
import { useT, useLangStore } from "./i18n/useT";
import { useLibraryStore } from "./store/library";
import type { Language } from "./i18n/translations";
import "./index.css";

type Tab = "library" | "setbuilder" | "export";

const LANG_OPTIONS: { value: Language; flag: string }[] = [
  { value: "es", flag: "ES" },
  { value: "en", flag: "EN" },
];

export default function App() {
  const t = useT();
  const { language, setLanguage } = useLangStore();
  const [tab, setTab] = useState<Tab>("library");
  const { selectedTrackId, autoPlayId, tracks, selectTrack } = useLibraryStore();
  const selectedTrack = selectedTrackId ? tracks[selectedTrackId] : null;

  const TABS: { value: Tab; icon: typeof Library; label: string }[] = [
    { value: "library",    icon: Library, label: t.nav_library },
    { value: "setbuilder", icon: Wand2,   label: t.nav_setbuilder },
    { value: "export",     icon: Usb,     label: t.nav_export },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--color-bg)]">
      {/* Sidebar */}
      <aside className="w-16 flex flex-col items-center py-4 gap-2 border-r border-[var(--color-border)] shrink-0">
        {/* Logo */}
        <div className="mb-4">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-accent)] flex items-center justify-center">
            <Usb className="w-4 h-4 text-white" />
          </div>
        </div>

        {TABS.map((tb) => (
          <button
            key={tb.value}
            onClick={() => setTab(tb.value)}
            title={tb.label}
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
              tab === tb.value
                ? "bg-[var(--color-accent)] text-white"
                : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
            )}
          >
            <tb.icon className="w-5 h-5" />
          </button>
        ))}

        {/* Language selector — bottom of sidebar */}
        <div className="mt-auto flex flex-col gap-1">
          {LANG_OPTIONS.map((lang) => (
            <button
              key={lang.value}
              onClick={() => setLanguage(lang.value)}
              title={lang.value === "es" ? "Español" : "English"}
              className={cn(
                "w-10 h-7 rounded-lg text-xs font-bold transition-all",
                language === lang.value
                  ? "bg-[var(--color-accent)]/20 text-[var(--color-accent)]"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              )}
            >
              {lang.flag}
            </button>
          ))}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Title bar */}
        <div className="flex items-center px-4 py-3 border-b border-[var(--color-border)]">
          <h1 className="text-sm font-semibold text-[var(--color-text)]">
            {TABS.find((tb) => tb.value === tab)?.label}
          </h1>
          <div className="flex-1" />
          <span className="text-xs text-[var(--color-text-muted)] font-mono">CueDrive</span>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {tab === "library"    && <LibraryView />}
          {tab === "setbuilder" && <SetBuilderView />}
          {tab === "export"     && <ExportView />}
        </div>

        {/* Audio player — global bottom bar */}
        {selectedTrack && (
          <AudioPlayer
            track={selectedTrack}
            autoPlay={autoPlayId === selectedTrack.id}
            onClose={() => selectTrack(null)}
          />
        )}
      </main>
    </div>
  );
}
