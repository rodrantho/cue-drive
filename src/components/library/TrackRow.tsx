import { Loader2, AlertCircle } from "lucide-react";
import type { Track } from "../../types";
import { EnergyBadge } from "../shared/EnergyBadge";
import { KeyBadge } from "../shared/KeyBadge";
import { cn } from "../../utils/cn";
import { useT } from "../../i18n/useT";

interface Props {
  track: Track;
  isSelected: boolean;
  onSelect: () => void;
  onAnalyze: () => void;
  onPlay: () => void;
}

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function TrackRow({ track, isSelected, onSelect, onAnalyze, onPlay }: Props) {
  const t = useT();
  return (
    <div
      onClick={onSelect}
      onDoubleClick={onPlay}
      className={cn(
        "grid items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors border-b border-[var(--color-border)]",
        "hover:bg-[var(--color-surface-2)]",
        isSelected && "bg-[var(--color-surface-2)] border-l-2 border-l-[var(--color-accent)]"
      )}
      style={{ gridTemplateColumns: "2fr 1.5fr 80px 70px 70px 70px 90px" }}
    >
      {/* Title + Artist */}
      <div className="min-w-0">
        <div className="text-sm font-medium text-[var(--color-text)] truncate">
          {track.title || track.filename}
        </div>
        <div className="text-xs text-[var(--color-text-muted)] truncate">
          {track.artist || "Unknown Artist"}
        </div>
      </div>

      {/* Genre */}
      <div className="text-xs text-[var(--color-text-muted)] truncate">
        {track.genre || "—"}
      </div>

      {/* BPM */}
      <div className="text-sm font-mono text-center">
        {track.bpm ? track.bpm.toFixed(1) : "—"}
      </div>

      {/* Key */}
      <div className="flex justify-center">
        <KeyBadge camelot={track.key_camelot} standard={track.key_standard} />
      </div>

      {/* Energy */}
      <div className="flex justify-center">
        <EnergyBadge energy={(track.custom_energy ?? track.energy) as any} />
      </div>

      {/* Duration */}
      <div className="text-xs font-mono text-[var(--color-text-muted)] text-center">
        {track.duration ? formatDuration(track.duration) : "—"}
      </div>

      {/* Status / Analyze button */}
      <div className="flex justify-end">
        {track.analyzing ? (
          <Loader2 className="w-4 h-4 animate-spin text-[var(--color-accent)]" />
        ) : track.analysis_error ? (
          <div className="flex items-center gap-1 max-w-[200px]">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="text-xs text-red-400 truncate">{track.analysis_error}</span>
          </div>
        ) : !track.analyzed ? (
          <button
            onClick={(e) => { e.stopPropagation(); onAnalyze(); }}
            className="text-xs px-2 py-1 rounded bg-[var(--color-accent)]/20 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/30 transition-colors"
          >
            {t.lib_btn_analyze}
          </button>
        ) : (
          <span className="text-xs text-green-400">✓</span>
        )}
      </div>
    </div>
  );
}
