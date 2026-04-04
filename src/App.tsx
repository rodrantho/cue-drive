import { useState, useEffect } from "react";
import { Library, Wand2, Usb, Globe, Heart, FolderPlus } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { open } from "@tauri-apps/plugin-dialog";
import { LibraryView } from "./components/library/LibraryView";
import { SetBuilderView } from "./components/setbuilder/SetBuilderView";
import { ExportView } from "./components/export/ExportView";
import { AudioPlayer } from "./components/player/AudioPlayer";
import { UpdateBanner } from "./components/updater/UpdateBanner";
import { CollectionsSidebar } from "./components/library/CollectionsSidebar";
import { ContextMenu } from "./components/library/ContextMenu";
import type { ContextMenuItem } from "./components/library/ContextMenu";
import { CreateCollectionModal } from "./components/library/CreateCollectionModal";
import { cn } from "./utils/cn";
import { useT, useLangStore } from "./i18n/useT";
import { useLibraryStore } from "./store/library";
import { useCollectionsStore } from "./store/collections";
import { loadState, scheduleSave } from "./store/persistence";
import type { Language } from "./i18n/translations";
import type { Track, CollectionColor, SmartFilters } from "./types";
import "./index.css";

type Tab = "library" | "setbuilder" | "export";

const LANG_OPTIONS: { value: Language; flag: string }[] = [
  { value: "es", flag: "ES" },
  { value: "en", flag: "EN" },
];

interface ContextMenuState {
  x: number;
  y: number;
  items: ContextMenuItem[];
}

export default function App() {
  const t = useT();
  const { language, setLanguage } = useLangStore();
  const [tab, setTab] = useState<Tab>("library");
  const { selectedTrackId, autoPlayId, tracks, folders, selectTrack, importFolder, setTracks, setFolders } = useLibraryStore();
  const {
    collections,
    activeCollectionId,
    activeFolderId,
    setActiveCollection,
    setActiveFolder,
    createCollection,
    deleteCollection,
    renameCollection,
    addTrackToCollection,
    getCollectionTracks,
    setCollections,
  } = useCollectionsStore();

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [showCreateCollection, setShowCreateCollection] = useState(false);

  const selectedTrack = selectedTrackId ? tracks[selectedTrackId] : null;

  // ── Load persisted state on mount ──────────────────────────────────────────
  useEffect(() => {
    loadState().then((state) => {
      if (!state) return;
      if (state.tracks) setTracks(state.tracks);
      if (state.folders) setFolders(state.folders);
      if (state.collections) setCollections(state.collections);
    });
  }, []);

  // ── Subscribe to collections changes and persist ────────────────────────────
  useEffect(() => {
    // Persist whenever collections change (after initial hydration)
    scheduleSave({
      version: 1,
      tracks,
      folders,
      collections,
    });
    // We don't want to run on mount (would overwrite loaded state before hydration)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collections]);

  // ── Compute scope tracks ────────────────────────────────────────────────────
  function getScopeTracks(): Track[] | undefined {
    if (activeFolderId !== null) {
      return Object.values(tracks).filter((t) => t.folder_id === activeFolderId);
    }
    if (activeCollectionId !== null) {
      return getCollectionTracks(activeCollectionId, tracks);
    }
    return undefined; // all tracks
  }

  const scopeTracks = getScopeTracks();

  // ── Track context menu ──────────────────────────────────────────────────────
  function handleTrackContextMenu(e: React.MouseEvent, track: Track) {
    e.preventDefault();
    const manualCollections = collections.filter((c) => c.type === "manual");
    const items: ContextMenuItem[] = [
      ...manualCollections.map((col) => ({
        label: `Agregar a "${col.name}"`,
        onClick: () => addTrackToCollection(col.id, track.id),
      })),
      ...(manualCollections.length === 0
        ? [{ label: "Sin colecciones manuales", onClick: () => {}, disabled: true }]
        : []),
    ];
    setContextMenu({ x: e.clientX, y: e.clientY, items });
  }

  // ── Import folder shortcut ──────────────────────────────────────────────────
  async function handleImportFolder() {
    const selected = await open({ directory: true, multiple: false });
    if (typeof selected === "string") {
      await importFolder(selected);
    }
  }

  const TABS: { value: Tab; icon: typeof Library; label: string }[] = [
    { value: "library",    icon: Library, label: t.nav_library },
    { value: "setbuilder", icon: Wand2,   label: t.nav_setbuilder },
    { value: "export",     icon: Usb,     label: t.nav_export },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--color-bg)]">
      {/* Icon sidebar */}
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

        {/* Bottom sidebar */}
        <div className="mt-auto flex flex-col items-center gap-2">
          {/* Import folder quick button */}
          {tab === "library" && (
            <button
              onClick={handleImportFolder}
              title="Importar carpeta"
              className="w-10 h-10 rounded-xl flex items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-accent)] transition-all"
            >
              <FolderPlus className="w-4 h-4" />
            </button>
          )}

          {/* Website */}
          <button
            onClick={() => openUrl("https://cuedrive.rodrantho.com")}
            title="cuedrive.rodrantho.com"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-accent)] transition-all"
          >
            <Globe className="w-4 h-4" />
          </button>

          {/* Donate */}
          <button
            onClick={() => openUrl("https://www.paypal.com/donate/?business=rodrantho%40outlook.com&currency_code=USD")}
            title="Support CueDrive ♥"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-[var(--color-text-muted)] hover:bg-red-500/10 hover:text-red-400 transition-all"
          >
            <Heart className="w-4 h-4" />
          </button>

          {/* Language selector */}
          <div className="flex flex-col gap-1 pt-1 border-t border-[var(--color-border)] w-10">
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

          {/* Signature */}
          <div
            title="@rodrantho"
            className="w-10 h-8 flex items-center justify-center"
          >
            <span className="text-[9px] font-mono text-[var(--color-text-muted)] opacity-40 leading-none text-center">
              @rod<br/>rantho
            </span>
          </div>
        </div>
      </aside>

      {/* Collections sidebar — only on library tab */}
      {tab === "library" && (
        <CollectionsSidebar
          tracks={tracks}
          folders={folders}
          collections={collections}
          activeCollectionId={activeCollectionId}
          activeFolderId={activeFolderId}
          onSelectAll={() => { setActiveCollection(null); setActiveFolder(null); }}
          onSelectFolder={(id) => setActiveFolder(id)}
          onSelectCollection={(id) => setActiveCollection(id)}
          onDropTrack={(collectionId, trackId) => addTrackToCollection(collectionId, trackId)}
          onCreateCollection={() => setShowCreateCollection(true)}
          onDeleteCollection={(id) => deleteCollection(id)}
          onRenameCollection={(id, name) => renameCollection(id, name)}
        />
      )}

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

        {/* Update banner */}
        <UpdateBanner />

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {tab === "library" && (
            <LibraryView
              scopeTracks={scopeTracks}
              onTrackContextMenu={handleTrackContextMenu}
            />
          )}
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

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Create collection modal */}
      {showCreateCollection && (
        <CreateCollectionModal
          onSubmit={(name: string, type: "manual" | "smart", color: CollectionColor, filters?: SmartFilters) => {
            createCollection(name, type, color, filters);
            setShowCreateCollection(false);
            // Persist
            scheduleSave({ version: 1, tracks, folders, collections });
          }}
          onCancel={() => setShowCreateCollection(false)}
        />
      )}
    </div>
  );
}
