import { useState } from "react";
import { FolderOpen, Zap, Search, SlidersHorizontal } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { useLibraryStore } from "../../store/library";
import { TrackRow } from "./TrackRow";
import { cn } from "../../utils/cn";
import { useT } from "../../i18n/useT";
import type { EnergyLevel } from "../../types";

export function LibraryView() {
  const t = useT();
  const {
    importFolder,
    analyzeTrack,
    analyzeAll,
    isImporting,
    filters,
    setFilter,
    selectTrack,
    playTrack,
    selectedTrackId,
    getFilteredTracks,
    keyNotation,
    setKeyNotation,
    tracks,
  } = useLibraryStore();

  const [showFilters, setShowFilters] = useState(false);
  const filteredTracks = getFilteredTracks();
  const totalTracks = Object.keys(tracks).length;
  const analyzedCount = Object.values(tracks).filter((t) => t.analyzed).length;
  const hasUnanalyzed = analyzedCount < totalTracks && totalTracks > 0;

  async function handleImport() {
    const selected = await open({ directory: true, multiple: false });
    if (typeof selected === "string") {
      await importFolder(selected);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)]">
        <button
          onClick={handleImport}
          disabled={isImporting}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-medium transition-colors disabled:opacity-50"
        >
          <FolderOpen className="w-4 h-4" />
          {isImporting ? t.lib_importing : t.lib_import_folder}
        </button>

        {hasUnanalyzed && (
          <button
            onClick={analyzeAll}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--color-surface-2)] hover:bg-[var(--color-border)] text-sm transition-colors"
          >
            <Zap className="w-4 h-4 text-yellow-400" />
            {t.lib_analyze_all} ({totalTracks - analyzedCount})
          </button>
        )}

        <div className="flex-1" />

        {/* Key notation toggle */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--color-surface-2)]">
          {(["camelot", "standard"] as const).map((n) => (
            <button
              key={n}
              onClick={() => setKeyNotation(n)}
              className={cn(
                "text-xs px-2.5 py-1 rounded-md transition-colors",
                keyNotation === n
                  ? "bg-[var(--color-accent)] text-white"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              )}
            >
              {n === "camelot" ? t.lib_camelot : t.lib_standard}
            </button>
          ))}
        </div>

        {/* Filters toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors",
            showFilters
              ? "bg-[var(--color-accent)]/20 text-[var(--color-accent)]"
              : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          )}
        >
          <SlidersHorizontal className="w-4 h-4" />
          {t.lib_filters}
        </button>
      </div>

      {/* Search + Filters */}
      <div className="px-4 py-2 border-b border-[var(--color-border)] space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
          <input
            type="text"
            placeholder={t.lib_search_placeholder}
            value={filters.search}
            onChange={(e) => setFilter({ search: e.target.value })}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
          />
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-2 py-1">
            <div className="flex items-center gap-1">
              <span className="text-xs text-[var(--color-text-muted)]">{t.lib_filter_energy}</span>
              {([1, 2, 3, 4, 5] as EnergyLevel[]).map((value) => (
                <button
                  key={value}
                  onClick={() => {
                    const current = filters.energy;
                    setFilter({
                      energy: current.includes(value)
                        ? current.filter((e) => e !== value)
                        : [...current, value],
                    });
                  }}
                  className={cn(
                    "text-xs px-2 py-0.5 rounded-full border transition-colors",
                    filters.energy.includes(value)
                      ? "bg-[var(--color-accent)]/30 border-[var(--color-accent)] text-[var(--color-accent)]"
                      : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]"
                  )}
                >
                  {value}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--color-text-muted)]">{t.lib_filter_bpm}</span>
              <input
                type="number"
                placeholder="Min"
                value={filters.bpm_min ?? ""}
                onChange={(e) => setFilter({ bpm_min: e.target.value ? Number(e.target.value) : null })}
                className="w-16 px-2 py-0.5 text-xs rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
              />
              <span className="text-[var(--color-text-muted)] text-xs">—</span>
              <input
                type="number"
                placeholder="Max"
                value={filters.bpm_max ?? ""}
                onChange={(e) => setFilter({ bpm_max: e.target.value ? Number(e.target.value) : null })}
                className="w-16 px-2 py-0.5 text-xs rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Column headers */}
      <div
        className="grid items-center gap-3 px-4 py-2 text-xs font-medium text-[var(--color-text-muted)] border-b border-[var(--color-border)] bg-[var(--color-surface)]"
        style={{ gridTemplateColumns: "2fr 1.5fr 80px 70px 70px 70px 90px" }}
      >
        <span>{t.lib_col_title}</span>
        <span>{t.lib_col_genre}</span>
        <span className="text-center">{t.lib_col_bpm}</span>
        <span className="text-center">{t.lib_col_key}</span>
        <span className="text-center">{t.lib_col_energy}</span>
        <span className="text-center">{t.lib_col_duration}</span>
        <span className="text-right">{t.lib_col_status}</span>
      </div>

      {/* Track list */}
      <div className="flex-1 overflow-y-auto">
        {filteredTracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-[var(--color-text-muted)]">
            <Search className="w-12 h-12 opacity-30" />
            <div className="text-center">
              <p className="text-sm font-medium">{t.lib_no_tracks_title}</p>
              <p className="text-xs mt-1">{t.lib_no_tracks_sub}</p>
            </div>
          </div>
        ) : (
          filteredTracks.map((track) => (
            <TrackRow
              key={track.id}
              track={track}
              isSelected={selectedTrackId === track.id}
              onSelect={() => selectTrack(track.id)}
              onAnalyze={() => analyzeTrack(track.id)}
              onPlay={() => playTrack(track.id)}
            />
          ))
        )}
      </div>

      {/* Footer count */}
      {totalTracks > 0 && (
        <div className="px-4 py-2 border-t border-[var(--color-border)] text-xs text-[var(--color-text-muted)]">
          {t.lib_tracks_count(filteredTracks.length, totalTracks, analyzedCount)}
        </div>
      )}
    </div>
  );
}
