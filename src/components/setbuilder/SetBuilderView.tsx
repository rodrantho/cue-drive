import { useState, useMemo } from "react";
import { Wand2, GripVertical, X, Plus, Pin, ListMusic, AlertTriangle } from "lucide-react";
import { useSetStore } from "../../store/set";
import { useLibraryStore } from "../../store/library";
import { EnergyBadge } from "../shared/EnergyBadge";
import { KeyBadge } from "../shared/KeyBadge";
import { cn } from "../../utils/cn";
import { useT } from "../../i18n/useT";
import type { SetTemplate, EnergyLevel } from "../../types";

// ─── Energy arc bar chart ──────────────────────────────────────────────────────

function EnergyArcViz({ tracks }: { tracks: Array<{ energy: EnergyLevel | null }> }) {
  if (tracks.length === 0) return null;
  const max = 5;
  const height = 48;
  const colors = ["", "#4a9eff", "#4aff8a", "#ffde4a", "#ff8a4a", "#ff4a6e"];
  return (
    <div className="flex items-end gap-0.5" style={{ height }}>
      {tracks.map((t, i) => {
        const e = t.energy ?? 3;
        const barH = (e / max) * height;
        return (
          <div
            key={i}
            title={`Track ${i + 1} — Energy ${e}`}
            style={{ height: barH, backgroundColor: colors[e], flex: 1, minWidth: 2 }}
            className="rounded-t transition-all"
          />
        );
      })}
    </div>
  );
}

// ─── Track picker panel ────────────────────────────────────────────────────────

interface TrackPickerProps {
  inSetIds: Set<string>;
  pinnedIds: Set<string>;
  onAdd: (trackId: string) => void;
  onPin: (trackId: string) => void;
  onUnpin: (trackId: string) => void;
  onClose: () => void;
}

function TrackPicker({ inSetIds, pinnedIds, onAdd, onPin, onUnpin, onClose }: TrackPickerProps) {
  const t = useT();
  const { tracks: allTracks } = useLibraryStore();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return Object.values(allTracks).filter((tr) => {
      if (q && !tr.title?.toLowerCase().includes(q) &&
          !tr.artist?.toLowerCase().includes(q) &&
          !tr.filename?.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allTracks, search]);

  return (
    <div className="flex flex-col w-72 border-l border-[var(--color-border)] bg-[var(--color-surface)]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--color-border)]">
        <span className="text-sm font-medium text-[var(--color-text)]">{t.set_picker_title}</span>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-[var(--color-surface-2)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-[var(--color-border)]">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.set_picker_search}
          className="w-full text-sm bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-md px-2.5 py-1.5 outline-none focus:border-[var(--color-accent)] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]"
        />
      </div>

      {/* Track list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-xs text-[var(--color-text-muted)] text-center py-6">No tracks</p>
        ) : (
          filtered.map((tr) => {
            const alreadyIn = inSetIds.has(tr.id);
            const isPinned = pinnedIds.has(tr.id);
            const notAnalyzed = !tr.analyzed;

            return (
              <div
                key={tr.id}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 border-b border-[var(--color-border)]",
                  alreadyIn || notAnalyzed ? "opacity-40" : "hover:bg-[var(--color-surface-2)]"
                )}
              >
                {/* Track info */}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate text-[var(--color-text)]">
                    {tr.title || tr.filename}
                  </div>
                  <div className="text-xs text-[var(--color-text-muted)] truncate">
                    {tr.artist || "—"}
                    {tr.bpm ? ` · ${tr.bpm.toFixed(0)} BPM` : ""}
                  </div>
                </div>

                {/* Status / actions */}
                {notAnalyzed ? (
                  <span className="text-xs text-[var(--color-text-muted)] shrink-0">{t.set_picker_not_analyzed}</span>
                ) : alreadyIn ? (
                  <span className="text-xs text-[var(--color-text-muted)] shrink-0">✓</span>
                ) : (
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Pin button — forces this track into next build */}
                    <button
                      onClick={() => isPinned ? onUnpin(tr.id) : onPin(tr.id)}
                      title={t.set_pinned_label}
                      className={cn(
                        "p-1 rounded transition-colors",
                        isPinned
                          ? "text-[var(--color-accent)] bg-[var(--color-accent)]/20"
                          : "text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10"
                      )}
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </button>
                    {/* Add now button */}
                    <button
                      onClick={() => onAdd(tr.id)}
                      className="p-1 rounded text-[var(--color-text-muted)] hover:text-green-400 hover:bg-green-500/10 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pin hint */}
      {pinnedIds.size > 0 && (
        <div className="px-3 py-2 border-t border-[var(--color-border)] text-xs text-[var(--color-text-muted)]">
          <Pin className="w-3 h-3 inline mr-1 text-[var(--color-accent)]" />
          {pinnedIds.size} pinned — will be included on next build
        </div>
      )}
    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function SetBuilderView() {
  const t = useT();
  const { currentSet, buildSet, addTrack, removeTrack, reorderTracks, clearSet, buildWarning } = useSetStore();
  const { tracks: allTracks } = useLibraryStore();

  const [template, setTemplate] = useState<SetTemplate>("peak");
  const [duration, setDuration] = useState(60);
  const [useAllTracks, setUseAllTracks] = useState(false);
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [showPicker, setShowPicker] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const TEMPLATES: { value: SetTemplate; label: string; desc: string }[] = [
    { value: "warmup",    label: t.set_template_warmup,    desc: t.set_template_warmup_desc },
    { value: "peak",      label: t.set_template_peak,      desc: t.set_template_peak_desc },
    { value: "closing",   label: t.set_template_closing,   desc: t.set_template_closing_desc },
    { value: "fullnight", label: t.set_template_fullnight, desc: t.set_template_fullnight_desc },
  ];

  function handleBuild() {
    buildSet(
      {
        template,
        duration_minutes: duration,
        available_tracks: Object.values(allTracks),
        use_all_tracks: useAllTracks,
        pinned_track_ids: Array.from(pinnedIds),
      },
      Object.values(allTracks)
    );
  }

  function handlePin(id: string) {
    setPinnedIds((prev) => new Set([...prev, id]));
  }
  function handleUnpin(id: string) {
    setPinnedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
  }

  const setTracks = currentSet?.tracks
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((st) => ({ ...st, track: allTracks[st.track_id] }))
    .filter((st) => st.track) ?? [];

  const inSetIds = useMemo(() => new Set(setTracks.map((st) => st.track_id)), [setTracks]);

  const energyData = setTracks.map((st) => ({
    energy: (st.track.custom_energy ?? st.track.energy) as EnergyLevel | null,
  }));

  const totalDurationMin = setTracks.reduce(
    (acc, st) => acc + (st.track.duration ?? 360) / 60,
    0
  );

  return (
    <div className="flex flex-col h-full">
      {/* ── Config panel ──────────────────────────────────────────────────── */}
      <div className="px-4 py-3 border-b border-[var(--color-border)] space-y-3 shrink-0">
        {/* Template selector */}
        <div className="grid grid-cols-4 gap-2">
          {TEMPLATES.map((tmpl) => (
            <button
              key={tmpl.value}
              onClick={() => setTemplate(tmpl.value)}
              className={cn(
                "flex flex-col items-start px-3 py-2 rounded-lg border text-left transition-colors",
                template === tmpl.value
                  ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10"
                  : "border-[var(--color-border)] hover:border-[var(--color-text-muted)]"
              )}
            >
              <span className="text-sm font-medium">{tmpl.label}</span>
              <span className="text-xs text-[var(--color-text-muted)]">{tmpl.desc}</span>
            </button>
          ))}
        </div>

        {/* Duration + all-tracks toggle + action buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Duration buttons */}
          <div className={cn("flex items-center gap-2 transition-opacity", useAllTracks && "opacity-40 pointer-events-none")}>
            <span className="text-sm text-[var(--color-text-muted)] shrink-0">{t.set_duration}</span>
            {[30, 60, 90, 120].map((d) => (
              <button
                key={d}
                onClick={() => setDuration(d)}
                className={cn(
                  "text-sm px-2.5 py-1 rounded-lg border transition-colors",
                  duration === d
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                    : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]"
                )}
              >
                {d}m
              </button>
            ))}
          </div>

          {/* All tracks toggle */}
          <label
            className="flex items-center gap-1.5 cursor-pointer select-none"
            title={t.set_all_tracks_tip}
          >
            <div
              onClick={() => setUseAllTracks((v) => !v)}
              className={cn(
                "w-8 h-4 rounded-full transition-colors relative cursor-pointer",
                useAllTracks ? "bg-[var(--color-accent)]" : "bg-[var(--color-border)]"
              )}
            >
              <div
                className={cn(
                  "absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all",
                  useAllTracks ? "left-4" : "left-0.5"
                )}
              />
            </div>
            <span className="text-xs text-[var(--color-text-muted)]">{t.set_all_tracks}</span>
          </label>

          <div className="flex-1" />

          {/* Pinned indicator */}
          {pinnedIds.size > 0 && (
            <span className="text-xs text-[var(--color-accent)] flex items-center gap-1">
              <Pin className="w-3 h-3" />
              {pinnedIds.size}
            </span>
          )}

          {currentSet && (
            <button
              onClick={clearSet}
              className="text-sm text-[var(--color-text-muted)] hover:text-red-400 transition-colors"
            >
              {t.set_clear}
            </button>
          )}

          <button
            onClick={handleBuild}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-medium transition-colors"
          >
            <Wand2 className="w-4 h-4" />
            {currentSet ? t.set_rebuild : t.set_build}
          </button>
        </div>
      </div>

      {/* ── Warning banner ────────────────────────────────────────────────── */}
      {buildWarning && (() => {
        const [, achieved, target] = buildWarning.split(":");
        return (
          <div className="flex items-start gap-2 px-4 py-2 bg-yellow-500/10 border-b border-yellow-500/30 text-yellow-400 text-xs shrink-0">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>{t.set_warning_short(Number(achieved), Number(target))}</span>
          </div>
        );
      })()}

      {/* ── Body: set list + optional picker ──────────────────────────────── */}
      <div className="flex flex-1 min-h-0">
        {/* Left: set track list */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Energy arc + stats bar */}
          {setTracks.length > 0 && (
            <div className="px-4 py-2.5 border-b border-[var(--color-border)] shrink-0">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-[var(--color-text-muted)]">{t.set_energy_arc}</span>
                <span className="text-xs text-[var(--color-text-muted)]">
                  {t.set_tracks_count(setTracks.length)}
                  {totalDurationMin > 0 && ` · ~${Math.round(totalDurationMin)}m`}
                </span>
              </div>
              <EnergyArcViz tracks={energyData} />
            </div>
          )}

          {/* Tracks */}
          <div className="flex-1 overflow-y-auto">
            {setTracks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-[var(--color-text-muted)]">
                <Wand2 className="w-10 h-10 opacity-30" />
                <div className="text-center">
                  <p className="text-sm">{t.set_empty_title}</p>
                  <p className="text-xs mt-1 opacity-70">{t.set_empty_sub}</p>
                </div>
              </div>
            ) : (
              <div>
                {setTracks.map((st, idx) => {
                  const isPinned = pinnedIds.has(st.track_id);
                  return (
                    <div
                      key={st.track_id}
                      draggable
                      onDragStart={() => setDragIdx(idx)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (dragIdx !== null && dragIdx !== idx) reorderTracks(dragIdx, idx);
                        setDragIdx(null);
                      }}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2.5 border-b border-[var(--color-border)] transition-colors",
                        "hover:bg-[var(--color-surface-2)]",
                        dragIdx === idx && "opacity-50"
                      )}
                    >
                      {/* Position */}
                      <span className="w-6 text-xs text-[var(--color-text-muted)] text-right font-mono shrink-0">
                        {idx + 1}
                      </span>

                      {/* Drag handle */}
                      <GripVertical className="w-4 h-4 text-[var(--color-border)] cursor-grab shrink-0" />

                      {/* Track info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          {isPinned && (
                            <Pin className="w-3 h-3 text-[var(--color-accent)] shrink-0" />
                          )}
                          <span className="text-sm font-medium truncate">
                            {st.track.title || st.track.filename}
                          </span>
                        </div>
                        <div className="text-xs text-[var(--color-text-muted)] truncate">
                          {st.track.artist || "—"}
                        </div>
                      </div>

                      {/* BPM */}
                      <span className="text-xs font-mono text-[var(--color-text-muted)] w-12 text-center shrink-0">
                        {st.track.bpm?.toFixed(0) ?? "—"}
                      </span>

                      {/* Key */}
                      <KeyBadge camelot={st.track.key_camelot} standard={st.track.key_standard} />

                      {/* Energy */}
                      <EnergyBadge energy={(st.track.custom_energy ?? st.track.energy) as any} />

                      {/* Remove */}
                      <button
                        onClick={() => removeTrack(st.track_id)}
                        className="p-1 rounded hover:bg-red-500/20 text-[var(--color-text-muted)] hover:text-red-400 transition-colors shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bottom bar */}
          <div className="px-4 py-2 border-t border-[var(--color-border)] flex items-center justify-between shrink-0">
            <span className="text-xs text-[var(--color-text-muted)]">
              {setTracks.length > 0
                ? `${setTracks.length} tracks · ~${Math.round(totalDurationMin)}min`
                : ""}
            </span>
            <button
              onClick={() => setShowPicker((v) => !v)}
              className={cn(
                "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors",
                showPicker
                  ? "border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent)]/10"
                  : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
              )}
            >
              <ListMusic className="w-3.5 h-3.5" />
              {t.set_add_tracks}
            </button>
          </div>
        </div>

        {/* Right: track picker */}
        {showPicker && (
          <TrackPicker
            inSetIds={inSetIds}
            pinnedIds={pinnedIds}
            onAdd={(id) => addTrack(id)}
            onPin={handlePin}
            onUnpin={handleUnpin}
            onClose={() => setShowPicker(false)}
          />
        )}
      </div>
    </div>
  );
}
