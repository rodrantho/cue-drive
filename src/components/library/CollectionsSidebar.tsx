import { useState, useRef } from "react";
import { Folder, Plus, Pencil, Trash2 } from "lucide-react";
import { cn } from "../../utils/cn";
import type { Track, FolderSource, Collection, CollectionColor } from "../../types";

const COLOR_MAP: Record<CollectionColor, string> = {
  purple: "#7c3aed",
  blue:   "#2563eb",
  green:  "#16a34a",
  orange: "#ea580c",
  red:    "#dc2626",
  pink:   "#db2777",
};

interface Props {
  tracks: Record<string, Track>;
  folders: FolderSource[];
  collections: Collection[];
  activeCollectionId: string | null;
  activeFolderId: string | null;
  onSelectAll: () => void;
  onSelectFolder: (id: string) => void;
  onSelectCollection: (id: string) => void;
  onDropTrack: (collectionId: string, trackId: string) => void;
  onCreateCollection: () => void;
  onDeleteCollection: (id: string) => void;
  onRenameCollection: (id: string, newName: string) => void;
}

interface ContextState {
  collectionId: string;
  x: number;
  y: number;
}

export function CollectionsSidebar({
  tracks,
  folders,
  collections,
  activeCollectionId,
  activeFolderId,
  onSelectAll,
  onSelectFolder,
  onSelectCollection,
  onDropTrack,
  onCreateCollection,
  onDeleteCollection,
  onRenameCollection,
}: Props) {
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextState | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameRef = useRef<HTMLInputElement>(null);

  const totalCount = Object.keys(tracks).length;

  function getFolderCount(folderId: string) {
    return Object.values(tracks).filter((t) => t.folder_id === folderId).length;
  }

  function getCollectionCount(collection: Collection) {
    if (collection.type === "manual") return collection.trackIds.length;
    // For smart we show total tracks (approximate)
    return Object.keys(tracks).length;
  }

  function handleCollectionContextMenu(e: React.MouseEvent, collectionId: string) {
    e.preventDefault();
    setContextMenu({ collectionId, x: e.clientX, y: e.clientY });
  }

  function handleRenameStart(collectionId: string, currentName: string) {
    setContextMenu(null);
    setRenamingId(collectionId);
    setRenameValue(currentName);
    setTimeout(() => renameRef.current?.select(), 50);
  }

  function handleRenameSubmit() {
    if (renamingId && renameValue.trim()) {
      onRenameCollection(renamingId, renameValue.trim());
    }
    setRenamingId(null);
    setRenameValue("");
  }

  function handleDragOver(e: React.DragEvent, collectionId: string) {
    e.preventDefault();
    setDragOverId(collectionId);
  }

  function handleDrop(e: React.DragEvent, collectionId: string) {
    e.preventDefault();
    const trackId = e.dataTransfer.getData("trackId");
    if (trackId) onDropTrack(collectionId, trackId);
    setDragOverId(null);
  }

  return (
    <aside
      className="w-[220px] shrink-0 flex flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] overflow-y-auto"
      onClick={() => setContextMenu(null)}
    >
      {/* All Tracks */}
      <button
        onClick={onSelectAll}
        className={cn(
          "flex items-center gap-2 px-3 py-2.5 text-sm transition-colors text-left w-full",
          activeCollectionId === null && activeFolderId === null
            ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)] font-medium"
            : "text-[var(--color-text)] hover:bg-[var(--color-surface-2)]"
        )}
      >
        <span className="flex-1">Toda la librería</span>
        <span className="text-xs text-[var(--color-text-muted)]">{totalCount}</span>
      </button>

      {/* FOLDERS section */}
      {folders.length > 0 && (
        <>
          <div className="px-3 pt-4 pb-1">
            <span className="text-[10px] font-semibold tracking-wider text-[var(--color-text-muted)] uppercase">
              Carpetas
            </span>
          </div>
          {folders.map((folder) => (
            <button
              key={folder.id}
              onClick={() => onSelectFolder(folder.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-sm transition-colors text-left w-full",
                activeFolderId === folder.id
                  ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)] font-medium"
                  : "text-[var(--color-text)] hover:bg-[var(--color-surface-2)]"
              )}
            >
              <Folder className="w-3.5 h-3.5 shrink-0 text-[var(--color-text-muted)]" />
              <span className="flex-1 truncate text-xs">{folder.name}</span>
              <span className="text-xs text-[var(--color-text-muted)]">{getFolderCount(folder.id)}</span>
            </button>
          ))}
        </>
      )}

      {/* COLLECTIONS section */}
      <div className="px-3 pt-4 pb-1 flex items-center justify-between">
        <span className="text-[10px] font-semibold tracking-wider text-[var(--color-text-muted)] uppercase">
          Colecciones
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onCreateCollection(); }}
          className="w-5 h-5 flex items-center justify-center rounded hover:bg-[var(--color-surface-2)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
          title="Nueva colección"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {collections.length === 0 && (
        <p className="px-3 py-2 text-xs text-[var(--color-text-muted)] opacity-60">
          Sin colecciones todavía
        </p>
      )}

      {collections.map((collection) => (
        <div
          key={collection.id}
          onDragOver={(e) => handleDragOver(e, collection.id)}
          onDragLeave={() => setDragOverId(null)}
          onDrop={(e) => handleDrop(e, collection.id)}
          onContextMenu={(e) => handleCollectionContextMenu(e, collection.id)}
          className={cn(
            "relative flex items-center gap-2 px-3 py-2 text-sm transition-colors cursor-pointer w-full",
            activeCollectionId === collection.id
              ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)] font-medium"
              : "text-[var(--color-text)] hover:bg-[var(--color-surface-2)]",
            dragOverId === collection.id && "ring-1 ring-inset ring-[var(--color-accent)] bg-[var(--color-accent)]/10"
          )}
          onClick={() => onSelectCollection(collection.id)}
        >
          {/* Color dot */}
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: COLOR_MAP[collection.color] }}
          />

          {/* Name — inline rename */}
          {renamingId === collection.id ? (
            <input
              ref={renameRef}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRenameSubmit();
                if (e.key === "Escape") { setRenamingId(null); setRenameValue(""); }
              }}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 bg-transparent text-xs text-[var(--color-text)] outline-none border-b border-[var(--color-accent)] min-w-0"
            />
          ) : (
            <span className="flex-1 truncate text-xs">{collection.name}</span>
          )}

          <span className="text-xs text-[var(--color-text-muted)]">
            {collection.type === "manual" ? collection.trackIds.length : "✦"}
          </span>
        </div>
      ))}

      {/* Inline context menu */}
      {contextMenu && (
        <div
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed z-50 min-w-[150px] py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              const col = collections.find((c) => c.id === contextMenu.collectionId);
              if (col) handleRenameStart(col.id, col.name);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-2)] transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            Renombrar
          </button>
          <button
            onClick={() => {
              onDeleteCollection(contextMenu.collectionId);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Eliminar
          </button>
        </div>
      )}
    </aside>
  );
}
