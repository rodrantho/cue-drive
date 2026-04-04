import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { Track, LibraryFilters, EnergyLevel, MoodTag, VocalType, FolderSource } from "../types";
import { scheduleSave } from "./persistence";

interface LibraryState {
  tracks: Record<string, Track>;
  folders: FolderSource[];
  filters: LibraryFilters;
  selectedTrackId: string | null;
  autoPlayId: string | null;
  isImporting: boolean;
  keyNotation: "camelot" | "standard";

  // Actions
  importFolder: (path: string) => Promise<void>;
  analyzeTrack: (trackId: string) => Promise<void>;
  analyzeAll: () => Promise<void>;
  setFilter: (filter: Partial<LibraryFilters>) => void;
  clearFilters: () => void;
  selectTrack: (id: string | null) => void;
  playTrack: (id: string) => void;
  setKeyNotation: (notation: "camelot" | "standard") => void;
  updateTrack: (id: string, updates: Partial<Track>) => void;
  getFilteredTracks: () => Track[];

  // Persistence hydration
  setTracks: (tracks: Record<string, Track>) => void;
  setFolders: (folders: FolderSource[]) => void;
}

const DEFAULT_FILTERS: LibraryFilters = {
  search: "",
  energy: [],
  mood_tags: [],
  vocal: [],
  bpm_min: null,
  bpm_max: null,
  key: null,
};

export const useLibraryStore = create<LibraryState>((set, get) => ({
  tracks: {},
  folders: [],
  filters: DEFAULT_FILTERS,
  selectedTrackId: null,
  autoPlayId: null,
  isImporting: false,
  keyNotation: "camelot",

  importFolder: async (path: string) => {
    set({ isImporting: true });
    try {
      const tracks: Track[] = await invoke("import_folder", { path });

      // Create FolderSource
      const folderName = path.split("/").filter(Boolean).pop() ?? path;
      const folderId = crypto.randomUUID();
      const folderSource: FolderSource = {
        id: folderId,
        path,
        name: folderName,
        addedAt: Date.now(),
      };

      const trackMap: Record<string, Track> = {};
      for (const t of tracks) {
        trackMap[t.id] = { ...t, folder_id: folderId };
      }

      set((state) => {
        const alreadyExists = state.folders.some((f) => f.path === path);
        const newFolders = alreadyExists ? state.folders : [...state.folders, folderSource];
        const newTracks = { ...state.tracks, ...trackMap };
        return { tracks: newTracks, folders: newFolders };
      });

      // Persist after import
      const state = get();
      scheduleSave({
        version: 1,
        tracks: state.tracks,
        folders: state.folders,
        collections: [],
      });
    } finally {
      set({ isImporting: false });
    }
  },

  analyzeTrack: async (trackId: string) => {
    const track = get().tracks[trackId];
    if (!track) return;
    set((state) => ({
      tracks: {
        ...state.tracks,
        [trackId]: { ...state.tracks[trackId], analyzing: true, analysis_error: null },
      },
    }));
    try {
      const result: Track = await invoke("analyze_track", { trackId, path: track.path });
      // Preserve folder_id from the original track
      const updatedTrack = { ...result, folder_id: track.folder_id };
      set((state) => ({
        tracks: { ...state.tracks, [trackId]: updatedTrack },
      }));

      // Persist after successful analysis
      const state = get();
      scheduleSave({
        version: 1,
        tracks: state.tracks,
        folders: state.folders,
        collections: [],
      });
    } catch (err) {
      set((state) => ({
        tracks: {
          ...state.tracks,
          [trackId]: {
            ...state.tracks[trackId],
            analyzing: false,
            analysis_error: String(err),
          },
        },
      }));
    }
  },

  analyzeAll: async () => {
    const { tracks, analyzeTrack } = get();
    const unanalyzed = Object.values(tracks).filter((t) => !t.analyzed && !t.analyzing);
    const CONCURRENCY = 3;
    for (let i = 0; i < unanalyzed.length; i += CONCURRENCY) {
      const batch = unanalyzed.slice(i, i + CONCURRENCY);
      await Promise.all(batch.map((t) => analyzeTrack(t.id)));
    }
  },

  setFilter: (filter) =>
    set((state) => ({ filters: { ...state.filters, ...filter } })),

  clearFilters: () => set({ filters: DEFAULT_FILTERS }),

  selectTrack: (id) => set({ selectedTrackId: id, autoPlayId: null }),
  playTrack: (id) => set({ selectedTrackId: id, autoPlayId: id }),

  setKeyNotation: (notation) => set({ keyNotation: notation }),

  updateTrack: (id, updates) => {
    set((state) => ({
      tracks: { ...state.tracks, [id]: { ...state.tracks[id], ...updates } },
    }));

    // Persist after update
    const state = get();
    scheduleSave({
      version: 1,
      tracks: state.tracks,
      folders: state.folders,
      collections: [],
    });
  },

  getFilteredTracks: () => {
    const { tracks, filters } = get();
    let result = Object.values(tracks);

    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.artist.toLowerCase().includes(q) ||
          t.genre.toLowerCase().includes(q)
      );
    }

    if (filters.energy.length > 0) {
      result = result.filter(
        (t) => t.energy !== null && filters.energy.includes(t.energy as EnergyLevel)
      );
    }

    if (filters.vocal.length > 0) {
      result = result.filter(
        (t) => t.vocal !== null && filters.vocal.includes(t.vocal as VocalType)
      );
    }

    if (filters.mood_tags.length > 0) {
      result = result.filter((t) =>
        filters.mood_tags.some((tag) => t.mood_tags.includes(tag as MoodTag))
      );
    }

    if (filters.bpm_min !== null) {
      result = result.filter((t) => t.bpm !== null && t.bpm >= filters.bpm_min!);
    }
    if (filters.bpm_max !== null) {
      result = result.filter((t) => t.bpm !== null && t.bpm <= filters.bpm_max!);
    }

    if (filters.key) {
      result = result.filter(
        (t) => t.key_camelot === filters.key || t.key_standard === filters.key
      );
    }

    return result;
  },

  setTracks: (tracks) => set({ tracks }),
  setFolders: (folders) => set({ folders }),
}));
