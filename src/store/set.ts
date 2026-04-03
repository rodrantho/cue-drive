import { create } from "zustand";
import type { DJSet, SetTemplate, SetTrack, Track } from "../types";
import { getCompatibleKeys, isBpmCompatible } from "../utils/camelot";

interface SetState {
  currentSet: DJSet | null;
  savedSets: DJSet[];
  buildWarning: string | null; // e.g. "not enough tracks"

  // Actions
  buildSet: (params: BuildSetParams, tracks: Track[]) => void;
  addTrack: (trackId: string, position?: number) => void;
  removeTrack: (trackId: string) => void;
  reorderTracks: (from: number, to: number) => void;
  saveSet: (name: string) => void;
  loadSet: (setId: string) => void;
  clearSet: () => void;
}

export interface BuildSetParams {
  template: SetTemplate;
  duration_minutes: number;
  available_tracks: Track[];
  use_all_tracks?: boolean;
  pinned_track_ids?: string[]; // tracks forced into the set
}

// Energy arc templates — values per relative position (0% to 100% of set)
const ENERGY_ARCS: Record<SetTemplate, number[]> = {
  warmup:    [1, 1, 2, 2, 2, 3, 3, 3, 4, 4],
  peak:      [3, 4, 4, 5, 5, 5, 5, 4, 4, 3],
  closing:   [4, 4, 3, 3, 2, 2, 2, 1, 1, 1],
  fullnight: [1, 2, 2, 3, 4, 5, 5, 4, 3, 2],
};

// Average overlap between tracks in a DJ mix (minutes)
// Tracks share this many minutes at each transition, so each added track
// contributes (duration - OVERLAP_MIN) to the total set time.
const OVERLAP_MIN = 1.5;

function pickNextTrack(
  candidates: Track[],
  lastTrack: Track | null,
  targetEnergy: number
): Track | null {
  if (candidates.length === 0) return null;

  // Energy match (±1 tolerance)
  const energyMatch = candidates.filter(
    (t) => t.energy !== null && Math.abs(t.energy - targetEnergy) <= 1
  );
  let pool = energyMatch.length > 0 ? energyMatch : candidates;

  // Harmonic compatibility
  if (lastTrack?.key_camelot) {
    const compatibleKeys = getCompatibleKeys(lastTrack.key_camelot);
    const harmonicMatch = pool.filter(
      (t) => t.key_camelot && compatibleKeys.includes(t.key_camelot)
    );
    if (harmonicMatch.length > 0) pool = harmonicMatch;
  }

  // BPM flow
  if (lastTrack?.bpm) {
    const bpmMatch = pool.filter(
      (t) => t.bpm && isBpmCompatible(lastTrack!.bpm!, t.bpm)
    );
    if (bpmMatch.length > 0) pool = bpmMatch;
  }

  // No same artist twice in a row
  if (lastTrack?.artist) {
    const diffArtist = pool.filter((t) => t.artist !== lastTrack!.artist);
    if (diffArtist.length > 0) pool = diffArtist;
  }

  // Closest energy wins
  pool.sort(
    (a, b) =>
      Math.abs((a.energy ?? 3) - targetEnergy) -
      Math.abs((b.energy ?? 3) - targetEnergy)
  );

  return pool[0];
}

interface BuildResult { tracks: SetTrack[]; achievedMinutes: number; }

function buildSmartSet(params: BuildSetParams): BuildResult {
  const { template, duration_minutes, available_tracks, use_all_tracks, pinned_track_ids } = params;
  const arc = ENERGY_ARCS[template];

  const analyzed = available_tracks.filter((t) => t.analyzed && t.bpm !== null);
  if (analyzed.length === 0) return { tracks: [], achievedMinutes: 0 };

  // Pinned tracks are always included first, in order
  const pinnedIds = new Set(pinned_track_ids ?? []);
  const pinnedTracks = (pinned_track_ids ?? [])
    .map((id) => analyzed.find((t) => t.id === id))
    .filter(Boolean) as Track[];

  const result: SetTrack[] = [];
  const used = new Set<string>(pinnedIds);
  let lastTrack: Track | null = null;
  let totalMinutes = 0; // accumulated set time (accounting for overlap)
  let position = 0;

  // Add pinned tracks first
  for (const pt of pinnedTracks) {
    const trackMin = (pt.duration ?? 360) / 60;
    totalMinutes += position === 0 ? trackMin : Math.max(0, trackMin - OVERLAP_MIN);
    result.push({ track_id: pt.id, position });
    lastTrack = pt;
    position++;
  }

  if (use_all_tracks) {
    // Add every remaining analyzed track
    const remaining = analyzed.filter((t) => !used.has(t.id));
    for (const tr of remaining) {
      const trackMin = (tr.duration ?? 360) / 60;
      totalMinutes += position === 0 ? trackMin : Math.max(0, trackMin - OVERLAP_MIN);
      result.push({ track_id: tr.id, position });
      position++;
    }
    return { tracks: result, achievedMinutes: totalMinutes };
  }

  // Fill the set until we reach the target duration.
  // Each track after the first contributes (trackDuration - OVERLAP_MIN) to the total,
  // because the beginning of each track overlaps with the end of the previous one.
  const maxTracks = analyzed.length;

  while (totalMinutes < duration_minutes && result.length < maxTracks) {
    // Arc position is based on time elapsed, not track count
    const progress = Math.min(1, totalMinutes / duration_minutes);
    const arcIndex = Math.floor(progress * (arc.length - 1));
    const targetEnergy = arc[arcIndex];

    const candidates = analyzed.filter((t) => !used.has(t.id));
    const chosen = pickNextTrack(candidates, lastTrack, targetEnergy);
    if (!chosen) break;

    const trackMin = (chosen.duration ?? 360) / 60;
    const addedTime = position === 0 ? trackMin : Math.max(0, trackMin - OVERLAP_MIN);

    result.push({ track_id: chosen.id, position });
    used.add(chosen.id);
    lastTrack = chosen;
    totalMinutes += addedTime;
    position++;
  }

  return { tracks: result, achievedMinutes: totalMinutes };
}

export const useSetStore = create<SetState>((set, get) => ({
  currentSet: null,
  savedSets: [],
  buildWarning: null,

  buildSet: (params) => {
    const { tracks, achievedMinutes } = buildSmartSet(params);

    let warning: string | null = null;
    if (!params.use_all_tracks) {
      const shortfall = params.duration_minutes - achievedMinutes;
      if (shortfall > 2) {
        // Round to nearest minute for display
        warning = `short:${Math.round(achievedMinutes)}:${params.duration_minutes}`;
      }
    }

    set({
      buildWarning: warning,
      currentSet: {
        id: crypto.randomUUID(),
        name: "New Set",
        template: params.template,
        duration_minutes: params.duration_minutes,
        tracks,
        created_at: new Date().toISOString(),
      },
    });
  },

  addTrack: (trackId, position) => {
    const { currentSet } = get();
    if (!currentSet) return;
    const pos = position ?? currentSet.tracks.length;
    const newTracks = [
      ...currentSet.tracks,
      { track_id: trackId, position: pos },
    ].sort((a, b) => a.position - b.position);
    set({ currentSet: { ...currentSet, tracks: newTracks } });
  },

  removeTrack: (trackId) => {
    const { currentSet } = get();
    if (!currentSet) return;
    set({
      currentSet: {
        ...currentSet,
        tracks: currentSet.tracks
          .filter((t) => t.track_id !== trackId)
          .map((t, i) => ({ ...t, position: i })),
      },
    });
  },

  reorderTracks: (from, to) => {
    const { currentSet } = get();
    if (!currentSet) return;
    const tracks = [...currentSet.tracks];
    const [moved] = tracks.splice(from, 1);
    tracks.splice(to, 0, moved);
    set({
      currentSet: {
        ...currentSet,
        tracks: tracks.map((t, i) => ({ ...t, position: i })),
      },
    });
  },

  saveSet: (name) => {
    const { currentSet, savedSets } = get();
    if (!currentSet) return;
    const named = { ...currentSet, name };
    set({
      currentSet: named,
      savedSets: [...savedSets.filter((s) => s.id !== named.id), named],
    });
  },

  loadSet: (setId) => {
    const { savedSets } = get();
    const found = savedSets.find((s) => s.id === setId);
    if (found) set({ currentSet: found });
  },

  clearSet: () => set({ currentSet: null }),
}));
