import { readTextFile, writeTextFile, mkdir, exists } from "@tauri-apps/plugin-fs";
import { appDataDir, join } from "@tauri-apps/api/path";
import type { Track, FolderSource, Collection } from "../types";

export interface PersistedState {
  version: number;
  tracks: Record<string, Track>;
  folders: FolderSource[];
  collections: Collection[];
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export async function loadState(): Promise<PersistedState | null> {
  try {
    const dir = await appDataDir();
    const filePath = await join(dir, "state.json");
    const fileExists = await exists(filePath);
    if (!fileExists) return null;
    const raw = await readTextFile(filePath);
    return JSON.parse(raw) as PersistedState;
  } catch {
    return null;
  }
}

export async function saveState(state: PersistedState): Promise<void> {
  try {
    const dir = await appDataDir();
    await mkdir(dir, { recursive: true });
    const filePath = await join(dir, "state.json");
    await writeTextFile(filePath, JSON.stringify(state));
  } catch (e) {
    console.error("Failed to save state:", e);
  }
}

// Debounced save — waits 500ms after last call
export function scheduleSave(state: PersistedState): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveState(state), 500);
}
