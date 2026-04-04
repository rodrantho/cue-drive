import { create } from "zustand";
import type { Collection, SmartFilters, Track } from "../types";

interface CollectionsState {
  collections: Collection[];
  activeCollectionId: string | null; // null = All Tracks
  activeFolderId: string | null;     // null = not filtering by folder

  // CRUD
  createCollection: (name: string, type: "manual" | "smart", color: Collection["color"], filters?: SmartFilters) => void;
  deleteCollection: (id: string) => void;
  renameCollection: (id: string, newName: string) => void;
  updateSmartFilters: (id: string, filters: SmartFilters) => void;

  // Track membership
  addTrackToCollection: (collectionId: string, trackId: string) => void;
  removeTrackFromCollection: (collectionId: string, trackId: string) => void;

  // Navigation
  setActiveCollection: (id: string | null) => void;
  setActiveFolder: (id: string | null) => void;

  // Resolve tracks for a collection
  getCollectionTracks: (collectionId: string, allTracks: Record<string, Track>) => Track[];

  // Hydration
  setCollections: (collections: Collection[]) => void;
}

export const useCollectionsStore = create<CollectionsState>((set, get) => ({
  collections: [],
  activeCollectionId: null,
  activeFolderId: null,

  createCollection: (name, type, color, filters) => {
    const newCollection: Collection = {
      id: crypto.randomUUID(),
      name,
      type,
      trackIds: [],
      smartFilters: filters,
      color,
      createdAt: Date.now(),
    };
    set((state) => ({ collections: [...state.collections, newCollection] }));
  },

  deleteCollection: (id) => {
    set((state) => ({
      collections: state.collections.filter((c) => c.id !== id),
      activeCollectionId: state.activeCollectionId === id ? null : state.activeCollectionId,
    }));
  },

  renameCollection: (id, newName) => {
    set((state) => ({
      collections: state.collections.map((c) =>
        c.id === id ? { ...c, name: newName } : c
      ),
    }));
  },

  updateSmartFilters: (id, filters) => {
    set((state) => ({
      collections: state.collections.map((c) =>
        c.id === id ? { ...c, smartFilters: filters } : c
      ),
    }));
  },

  addTrackToCollection: (collectionId, trackId) => {
    set((state) => ({
      collections: state.collections.map((c) =>
        c.id === collectionId && c.type === "manual" && !c.trackIds.includes(trackId)
          ? { ...c, trackIds: [...c.trackIds, trackId] }
          : c
      ),
    }));
  },

  removeTrackFromCollection: (collectionId, trackId) => {
    set((state) => ({
      collections: state.collections.map((c) =>
        c.id === collectionId
          ? { ...c, trackIds: c.trackIds.filter((id) => id !== trackId) }
          : c
      ),
    }));
  },

  setActiveCollection: (id) => set({ activeCollectionId: id, activeFolderId: null }),

  setActiveFolder: (id) => set({ activeFolderId: id, activeCollectionId: null }),

  getCollectionTracks: (collectionId, allTracks) => {
    const collection = get().collections.find((c) => c.id === collectionId);
    if (!collection) return [];

    if (collection.type === "manual") {
      return collection.trackIds
        .map((id) => allTracks[id])
        .filter(Boolean) as Track[];
    }

    // Smart collection: apply filters
    const f = collection.smartFilters ?? {};
    return Object.values(allTracks).filter((track) => {
      if (f.bpmMin !== undefined && (track.bpm === null || track.bpm < f.bpmMin)) return false;
      if (f.bpmMax !== undefined && (track.bpm === null || track.bpm > f.bpmMax)) return false;
      if (f.energyMin !== undefined && (track.energy === null || track.energy < f.energyMin)) return false;
      if (f.energyMax !== undefined && (track.energy === null || track.energy > f.energyMax)) return false;
      if (f.keys && f.keys.length > 0) {
        const matchKey = f.keys.some(
          (k) => k === track.key_camelot || k === track.key_standard
        );
        if (!matchKey) return false;
      }
      if (f.hasVocals !== undefined) {
        const hasVocals = track.vocal !== null && track.vocal !== "none";
        if (f.hasVocals !== hasVocals) return false;
      }
      if (f.genres && f.genres.length > 0) {
        if (!f.genres.some((g) => track.genre?.toLowerCase().includes(g.toLowerCase()))) return false;
      }
      if (f.folderIds && f.folderIds.length > 0) {
        if (!track.folder_id || !f.folderIds.includes(track.folder_id)) return false;
      }
      return true;
    });
  },

  setCollections: (collections) => set({ collections }),
}));
