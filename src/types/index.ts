// ─── Core Track Types ────────────────────────────────────────────────────────

export type KeyNotation = "camelot" | "standard";

export type EnergyLevel = 1 | 2 | 3 | 4 | 5;

export type VocalType = "none" | "spoken" | "hook" | "full";

export type MoodTag =
  | "warm-up"
  | "peak"
  | "closing"
  | "dark"
  | "uplifting"
  | "hypnotic"
  | "rolling"
  | "percussive"
  | "reset"
  | "vocal-heavy"
  | "instrumental";

export type TrackSection = "intro" | "buildup" | "drop" | "break" | "outro";

export interface CuePoint {
  id: string;
  type: "entry" | "exit" | "drop" | "break" | "loop" | "vocal";
  position: number; // seconds
  label: string;
  color: string;
}

export interface TrackStructure {
  intro_end: number;       // seconds
  first_drop: number;
  break_start: number | null;
  break_end: number | null;
  outro_start: number;
  sections: Array<{ type: TrackSection; start: number; end: number }>;
}

export interface Track {
  id: string;
  path: string;
  filename: string;

  // Metadata (from tags or analysis)
  title: string;
  artist: string;
  album: string;
  genre: string;
  year: number | null;
  duration: number; // seconds

  // Analysis results
  bpm: number | null;
  bpm_confidence: number | null; // 0-1
  key_camelot: string | null;    // e.g. "8A", "7B"
  key_standard: string | null;   // e.g. "Am", "F#"
  energy: EnergyLevel | null;
  vocal: VocalType | null;
  mood_tags: MoodTag[];

  // Structure
  structure: TrackStructure | null;
  cue_points: CuePoint[];

  // Status
  analyzed: boolean;
  analyzing: boolean;
  analysis_error: string | null;

  // User overrides
  custom_energy: EnergyLevel | null;
  custom_tags: MoodTag[];

  // Pre-computed waveform peaks for instant display (500 float values 0-1)
  waveform_peaks: number[] | null;
}

// ─── Set Types ────────────────────────────────────────────────────────────────

export type SetTemplate = "warmup" | "peak" | "closing" | "fullnight";

export interface SetTrack {
  track_id: string;
  position: number;
  note?: string;
}

export interface DJSet {
  id: string;
  name: string;
  template: SetTemplate;
  duration_minutes: number;
  tracks: SetTrack[];
  created_at: string;
}

// ─── Export Types ─────────────────────────────────────────────────────────────

export type ExportTarget = "cdj" | "traktor" | "files";
export type FolderOrganization = "energy" | "genre" | "bpm" | "none";
export type FilenameFormat = "camelot_bpm" | "standard_bpm" | "original";

export interface ExportOptions {
  target: ExportTarget;
  destination_path: string;
  folder_organization: FolderOrganization;
  filename_format: FilenameFormat;
  key_notation: KeyNotation;
  copy_files: boolean;
}

// ─── Library Types ─────────────────────────────────────────────────────────────

export interface Library {
  tracks: Record<string, Track>;
  folders: string[];
  last_updated: string | null;
}

// ─── Filter Types ─────────────────────────────────────────────────────────────

export interface LibraryFilters {
  search: string;
  energy: EnergyLevel[];
  mood_tags: MoodTag[];
  vocal: VocalType[];
  bpm_min: number | null;
  bpm_max: number | null;
  key: string | null;
}
