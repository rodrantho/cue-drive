import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import { readFile } from "@tauri-apps/plugin-fs";
import { Play, Pause, X, Volume2, Loader2 } from "lucide-react";
import { KeyBadge } from "../shared/KeyBadge";
import { EnergyBadge } from "../shared/EnergyBadge";
import type { Track } from "../../types";

// ─── helpers ──────────────────────────────────────────────────────────────────

function getMimeType(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    mp3:  "audio/mpeg",
    flac: "audio/flac",
    wav:  "audio/wav",
    aiff: "audio/aiff",
    aif:  "audio/aiff",
    m4a:  "audio/mp4",
    mp4:  "audio/mp4",
    ogg:  "audio/ogg",
  };
  return map[ext] ?? "audio/mpeg";
}

function formatTime(s: number): string {
  if (!isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

const CUE_COLORS: Record<string, string> = {
  entry: "#22c55e",
  drop:  "#f97316",
  break: "#3b82f6",
  loop:  "#a855f7",
  exit:  "#ef4444",
  vocal: "#eab308",
};

// ─── component ────────────────────────────────────────────────────────────────

interface Props {
  track: Track;
  autoPlay: boolean;
  onClose: () => void;
}

export function AudioPlayer({ track, autoPlay, onClose }: Props) {
  const containerRef   = useRef<HTMLDivElement>(null);
  const wsRef          = useRef<WaveSurfer | null>(null);
  const audioLoadedRef = useRef(false);
  const blobUrlRef     = useRef<string | null>(null);
  const autoPlayRef    = useRef(autoPlay);
  const wasPlayingRef  = useRef(false); // true if audio was playing when track changed

  const [isPlaying,   setIsPlaying]   = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration,    setDuration]    = useState(track.duration ?? 0);
  const [volume,      setVolume]      = useState(0.85);
  const [loadingAudio, setLoadingAudio] = useState(false); // loading audio file for playback
  const [error,       setError]       = useState<string | null>(null);

  autoPlayRef.current = autoPlay;

  // Keep wasPlayingRef in sync with isPlaying state
  useEffect(() => {
    wasPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // ── Build WaveSurfer when track changes ────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    // If audio was playing when the track changed, continue playing the new one
    const shouldAutoPlay = autoPlayRef.current || wasPlayingRef.current;

    // Reset state
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(track.duration ?? 0);
    setLoadingAudio(false);
    setError(null);
    audioLoadedRef.current = false;

    // Revoke previous blob URL
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }

    // Destroy previous instance
    wsRef.current?.destroy();
    wsRef.current = null;

    const hasPeaks = track.waveform_peaks && track.waveform_peaks.length > 0;

    if (hasPeaks) {
      // ── FAST PATH: render waveform from pre-computed peaks (instant, no file read)
      const ws = WaveSurfer.create({
        container:     containerRef.current,
        waveColor:     "rgba(74, 158, 255, 0.35)",
        progressColor: "rgba(74, 158, 255, 0.9)",
        cursorColor:   "rgba(255, 255, 255, 0.7)",
        cursorWidth: 1,
        height: 52,
        normalize: true,
        interact: true,
        // peaks + duration = instant render, no audio decoded yet
        peaks:    [track.waveform_peaks!],
        duration: track.duration ?? 0,
      });

      ws.on("timeupdate", (t) => setCurrentTime(t));
      ws.on("play",   () => setIsPlaying(true));
      ws.on("pause",  () => setIsPlaying(false));
      ws.on("finish", () => setIsPlaying(false));

      wsRef.current = ws;

      // Auto-play if triggered by double-click OR if something was already playing
      if (shouldAutoPlay) {
        loadAndPlay(ws, track);
      }
    } else {
      // ── FALLBACK: load full audio immediately (track not yet analyzed)
      let cancelled = false;
      loadAudioFile(track.path)
        .then((url) => {
          if (cancelled || !containerRef.current) return;
          blobUrlRef.current = url;

          const ws = WaveSurfer.create({
            container:     containerRef.current!,
            waveColor:     "rgba(74, 158, 255, 0.35)",
            progressColor: "rgba(74, 158, 255, 0.9)",
            cursorColor:   "rgba(255, 255, 255, 0.7)",
            cursorWidth: 1,
            height: 52,
            normalize: true,
            interact: true,
            url,
          });

          ws.on("ready", (dur) => {
            if (cancelled) return;
            setDuration(dur);
            ws.setVolume(volume);
            audioLoadedRef.current = true;
            if (shouldAutoPlay) ws.play();
          });
          ws.on("timeupdate", (t) => { if (!cancelled) setCurrentTime(t); });
          ws.on("play",   () => { if (!cancelled) setIsPlaying(true); });
          ws.on("pause",  () => { if (!cancelled) setIsPlaying(false); });
          ws.on("finish", () => { if (!cancelled) setIsPlaying(false); });
          ws.on("error",  (e) => {
            if (!cancelled) { setError(`Error: ${e}`); }
          });

          wsRef.current = ws;
        })
        .catch((e) => {
          if (!cancelled) setError(`No se pudo leer: ${e}`);
        });

      return () => { cancelled = true; cleanup(); };
    }

    return cleanup;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track.id]);

  function cleanup() {
    wsRef.current?.destroy();
    wsRef.current = null;
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    audioLoadedRef.current = false;
  }

  async function loadAudioFile(path: string): Promise<string> {
    const bytes = await readFile(path);
    const blob = new Blob([bytes], { type: getMimeType(path) });
    return URL.createObjectURL(blob);
  }

  async function loadAndPlay(ws: WaveSurfer, tr: Track) {
    if (audioLoadedRef.current) {
      ws.playPause();
      return;
    }
    setLoadingAudio(true);
    try {
      const url = await loadAudioFile(tr.path);
      if (!wsRef.current) return; // component unmounted
      blobUrlRef.current = url;
      // Load audio keeping the pre-computed peaks waveform intact
      await wsRef.current.load(
        url,
        tr.waveform_peaks ? [tr.waveform_peaks] : undefined,
        tr.duration ?? undefined
      );
      audioLoadedRef.current = true;
      wsRef.current.setVolume(volume);
      // Seek to entry cue if available
      const dur = tr.duration ?? 0;
      if (tr.cue_points?.length && dur > 0) {
        const entry = tr.cue_points.find((c) => c.type === "entry");
        if (entry && entry.position > 4) {
          wsRef.current.seekTo(entry.position / dur);
          setCurrentTime(entry.position);
        }
      }
      wsRef.current.play();
    } catch (e) {
      setError(`No se pudo cargar: ${e}`);
    } finally {
      setLoadingAudio(false);
    }
  }

  // ── Sync volume ────────────────────────────────────────────────────────────
  useEffect(() => {
    wsRef.current?.setVolume(volume);
  }, [volume]);

  // ── Controls ───────────────────────────────────────────────────────────────
  function handlePlayPause() {
    if (!wsRef.current) return;
    if (!audioLoadedRef.current) {
      // Audio not loaded yet — load it now
      loadAndPlay(wsRef.current, track);
    } else {
      wsRef.current.playPause();
    }
  }

  function jumpToCue(position: number) {
    if (!wsRef.current) return;
    const dur = duration || track.duration || 1;
    if (!audioLoadedRef.current) {
      // Seek visually on the waveform even without audio loaded
      wsRef.current.seekTo(position / dur);
      setCurrentTime(position);
    } else {
      wsRef.current.seekTo(position / dur);
    }
  }

  const isLoading = loadingAudio;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="h-[100px] shrink-0 border-t border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col px-4 pt-2 pb-1.5">
      {/* Top row */}
      <div className="flex items-center gap-3 mb-1.5">
        {/* Play/Pause button */}
        <button
          onClick={handlePlayPause}
          disabled={!!error}
          className="w-8 h-8 rounded-full bg-[var(--color-accent)] flex items-center justify-center text-white disabled:opacity-40 hover:opacity-90 transition-opacity shrink-0"
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-3.5 h-3.5" />
          ) : (
            <Play className="w-3.5 h-3.5 ml-0.5" />
          )}
        </button>

        {/* Track info */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate leading-tight">
            {track.title || track.filename}
          </div>
          <div className="text-xs text-[var(--color-text-muted)] truncate leading-tight">
            {track.artist || "Unknown"}
          </div>
        </div>

        {/* Time */}
        <span className="text-xs font-mono text-[var(--color-text-muted)] shrink-0 w-24 text-center">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        {/* BPM */}
        {track.bpm && (
          <span className="text-xs font-mono text-[var(--color-text-muted)] shrink-0">
            {track.bpm.toFixed(0)} BPM
          </span>
        )}

        {/* Key + Energy */}
        <KeyBadge camelot={track.key_camelot} standard={track.key_standard} />
        <EnergyBadge energy={(track.custom_energy ?? track.energy) as any} />

        {/* Volume */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Volume2 className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
          <input
            type="range" min={0} max={1} step={0.02} value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="w-20 h-1 accent-[var(--color-accent)] cursor-pointer"
          />
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-[var(--color-surface-2)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Waveform area */}
      <div className="relative flex-1 min-h-0">
        {error ? (
          <div className="flex items-center h-full text-xs text-red-400 px-1">{error}</div>
        ) : (
          <>
            <div ref={containerRef} className="w-full h-full" />

            {/* Cue point markers */}
            {duration > 0 && track.cue_points?.map((cue) => (
              <button
                key={cue.id}
                onClick={() => jumpToCue(cue.position)}
                title={`${cue.label} — ${formatTime(cue.position)}`}
                style={{
                  position: "absolute",
                  left: `${(cue.position / duration) * 100}%`,
                  top: 0, bottom: 0, width: 2,
                  backgroundColor: CUE_COLORS[cue.type] ?? cue.color ?? "#fff",
                  opacity: 0.8, border: "none", padding: 0, cursor: "pointer",
                }}
                className="hover:opacity-100 transition-opacity"
              >
                <span style={{
                  position: "absolute", top: 0, left: 2,
                  fontSize: 8, color: CUE_COLORS[cue.type] ?? cue.color ?? "#fff",
                  lineHeight: 1, whiteSpace: "nowrap", pointerEvents: "none",
                }}>
                  ▼{cue.label}
                </span>
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
