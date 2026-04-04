#!/usr/bin/env python3
"""
CueDrive Audio Analyzer
-----------------------
Receives an audio file path as argument, analyzes it and prints JSON to stdout.

Analysis performed:
  - BPM + beatgrid (librosa)
  - Musical key (custom Krumhansl-Schmuckler algorithm)
  - Energy level 1-5 (RMS + spectral centroid + onset density + BPM)
  - Track structure: intro / build / drop / break / outro
  - Cue points with DJ intent
  - Vocal detection (spectral flux + MFCCs)
  - Mood tags
"""

import sys
import json
import warnings
warnings.filterwarnings("ignore")

import numpy as np
import librosa


# ─── Constants ────────────────────────────────────────────────────────────────

CAMELOT_MAP = {
    0:  ("8B",  "C"),
    1:  ("3B",  "Db"),
    2:  ("10B", "D"),
    3:  ("5B",  "Eb"),
    4:  ("12B", "E"),
    5:  ("7B",  "F"),
    6:  ("2B",  "F#"),
    7:  ("9B",  "G"),
    8:  ("4B",  "Ab"),
    9:  ("11B", "A"),
    10: ("6B",  "Bb"),
    11: ("1B",  "B"),
    12: ("5A",  "Cm"),
    13: ("12A", "C#m"),
    14: ("7A",  "Dm"),
    15: ("2A",  "Ebm"),
    16: ("9A",  "Em"),
    17: ("4A",  "Fm"),
    18: ("11A", "F#m"),
    19: ("6A",  "Gm"),
    20: ("1A",  "Abm"),
    21: ("8A",  "Am"),
    22: ("3A",  "Bbm"),
    23: ("10A", "Bm"),
}

# Krumhansl-Schmuckler key profiles
KS_MAJOR = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09,
                      2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
KS_MINOR = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53,
                      2.54, 4.75, 3.98, 2.69, 3.34, 3.17])


# ─── Key Detection ────────────────────────────────────────────────────────────

def detect_key(y: np.ndarray, sr: int) -> tuple[str, str, float]:
    """Returns (camelot_key, standard_key, confidence)"""
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr, bins_per_octave=36)
    chroma_mean = chroma.mean(axis=1)
    chroma_norm = chroma_mean / (chroma_mean.sum() + 1e-10)

    scores = []
    for i in range(12):
        rolled_major = np.roll(KS_MAJOR, i)
        rolled_minor = np.roll(KS_MINOR, i)
        score_major = np.corrcoef(chroma_norm, rolled_major / rolled_major.sum())[0, 1]
        score_minor = np.corrcoef(chroma_norm, rolled_minor / rolled_minor.sum())[0, 1]
        scores.append((score_major, i, "major"))
        scores.append((score_minor, i + 12, "minor"))

    scores.sort(key=lambda x: x[0], reverse=True)
    best_score, best_idx, _ = scores[0]
    confidence = float(best_score)

    camelot, standard = CAMELOT_MAP.get(best_idx, ("??", "??"))
    return camelot, standard, max(0.0, confidence)


# ─── BPM Detection ────────────────────────────────────────────────────────────

def detect_bpm(y: np.ndarray, sr: int) -> tuple[float, float]:
    """Returns (bpm, confidence 0-1)"""
    tempo, beats = librosa.beat.beat_track(y=y, sr=sr, units="time")
    tempo = float(np.atleast_1d(tempo)[0])

    # Confidence: measure inter-beat interval consistency
    if len(beats) > 4:
        ibi = np.diff(beats)
        cv = np.std(ibi) / (np.mean(ibi) + 1e-10)
        confidence = float(max(0.0, min(1.0, 1.0 - cv)))
    else:
        confidence = 0.3

    return round(tempo, 2), confidence


# ─── Energy Detection ─────────────────────────────────────────────────────────

def detect_energy(y: np.ndarray, sr: int, bpm: float) -> int:
    """Returns energy level 1-5"""
    # RMS loudness
    rms = float(np.sqrt(np.mean(y ** 2)))
    rms_norm = min(1.0, rms / 0.15)

    # Spectral centroid (brightness)
    centroid = librosa.feature.spectral_centroid(y=y, sr=sr).mean()
    centroid_norm = min(1.0, float(centroid) / 4000.0)

    # Onset density (percussive hits per second)
    onset_env = librosa.onset.onset_strength(y=y, sr=sr)
    onsets = librosa.onset.onset_detect(onset_envelope=onset_env, sr=sr)
    duration = len(y) / sr
    onset_density = len(onsets) / max(duration, 1.0)
    onset_norm = min(1.0, onset_density / 4.0)

    # BPM factor
    bpm_norm = min(1.0, max(0.0, (bpm - 100) / 80.0))

    # Weighted combination
    score = (rms_norm * 0.35 + centroid_norm * 0.20 +
             onset_norm * 0.25 + bpm_norm * 0.20)

    # Map 0-1 → 1-5
    energy = int(np.clip(np.ceil(score * 5), 1, 5))
    return energy


# ─── Track Structure ──────────────────────────────────────────────────────────

def detect_structure(y: np.ndarray, sr: int, duration: float) -> dict:
    """Detects intro, build, drop, break, outro timestamps."""
    # Use RMS energy envelope (1-second frames)
    hop = sr
    frame_rms = librosa.feature.rms(y=y, frame_length=sr * 2, hop_length=hop)[0]
    frame_times = librosa.frames_to_time(np.arange(len(frame_rms)), sr=sr, hop_length=hop)

    if len(frame_rms) < 4:
        return {
            "intro_end": min(30.0, duration * 0.1),
            "first_drop": min(60.0, duration * 0.2),
            "break_start": None,
            "break_end": None,
            "outro_start": duration - min(60.0, duration * 0.15),
            "sections": []
        }

    rms_smooth = np.convolve(frame_rms, np.ones(8) / 8, mode="same")
    rms_max = rms_smooth.max()
    rms_norm = rms_smooth / (rms_max + 1e-10)

    # Outro: last sustained low-energy region
    outro_threshold = 0.5
    outro_start = duration * 0.75
    for i in range(len(rms_norm) - 1, len(rms_norm) // 2, -1):
        if rms_norm[i] < outro_threshold:
            outro_start = float(frame_times[i])
            break

    # Intro: initial low-energy region
    intro_threshold = 0.5
    intro_end = min(60.0, duration * 0.15)
    for i in range(min(len(rms_norm), int(duration * 0.3 / (hop / sr)))):
        if rms_norm[i] > intro_threshold:
            intro_end = float(frame_times[i])
            break

    # First drop: first high-energy peak after intro
    search_start_idx = int(intro_end / (hop / sr))
    first_drop = intro_end + 30.0
    for i in range(search_start_idx, len(rms_norm)):
        if rms_norm[i] > 0.8:
            first_drop = float(frame_times[i])
            break

    # Break: significant low-energy dip in middle section
    break_start = None
    break_end = None
    mid_start = int(len(rms_norm) * 0.3)
    mid_end = int(len(rms_norm) * 0.7)
    in_break = False

    for i in range(mid_start, mid_end):
        if not in_break and rms_norm[i] < 0.45:
            break_start = float(frame_times[i])
            in_break = True
        elif in_break and rms_norm[i] > 0.6:
            break_end = float(frame_times[i])
            break

    # Build sections list
    sections = []
    sections.append({"type": "intro", "start": 0.0, "end": intro_end})

    if first_drop > intro_end + 5:
        sections.append({"type": "buildup", "start": intro_end, "end": first_drop})

    if break_start and break_end:
        sections.append({"type": "drop", "start": first_drop, "end": break_start})
        sections.append({"type": "break", "start": break_start, "end": break_end})
        sections.append({"type": "drop", "start": break_end, "end": outro_start})
    else:
        sections.append({"type": "drop", "start": first_drop, "end": outro_start})

    sections.append({"type": "outro", "start": outro_start, "end": duration})

    return {
        "intro_end": round(intro_end, 2),
        "first_drop": round(first_drop, 2),
        "break_start": round(break_start, 2) if break_start else None,
        "break_end": round(break_end, 2) if break_end else None,
        "outro_start": round(outro_start, 2),
        "sections": [
            {k: round(v, 2) if isinstance(v, float) else v for k, v in s.items()}
            for s in sections
        ]
    }


# ─── Cue Points ───────────────────────────────────────────────────────────────

def generate_cue_points(structure: dict, y: np.ndarray, sr: int) -> list[dict]:
    """Generate DJ-intent cue points from structure."""
    import uuid

    CUE_COLORS = {
        "entry": "#00FF00",
        "exit":  "#FF0000",
        "drop":  "#FF8800",
        "break": "#0088FF",
        "loop":  "#FF00FF",
        "vocal": "#FFFF00",
    }

    cues = []

    # Entry: 1 bar before first drop (8 beats before)
    # At 128 BPM: 1 bar = ~1.875s
    entry_pos = max(0.0, structure["first_drop"] - 4.0)
    cues.append({
        "id": str(uuid.uuid4()),
        "type": "entry",
        "position": round(entry_pos, 3),
        "label": "Entry",
        "color": CUE_COLORS["entry"]
    })

    # Drop cue
    cues.append({
        "id": str(uuid.uuid4()),
        "type": "drop",
        "position": round(structure["first_drop"], 3),
        "label": "Drop",
        "color": CUE_COLORS["drop"]
    })

    # Break cue
    if structure.get("break_start"):
        cues.append({
            "id": str(uuid.uuid4()),
            "type": "break",
            "position": round(structure["break_start"], 3),
            "label": "Break",
            "color": CUE_COLORS["break"]
        })

    # Loop rescue: 8 bars before outro
    loop_pos = max(0.0, structure["outro_start"] - 16.0)
    cues.append({
        "id": str(uuid.uuid4()),
        "type": "loop",
        "position": round(loop_pos, 3),
        "label": "Loop",
        "color": CUE_COLORS["loop"]
    })

    # Exit: safe outro start
    cues.append({
        "id": str(uuid.uuid4()),
        "type": "exit",
        "position": round(structure["outro_start"], 3),
        "label": "Exit",
        "color": CUE_COLORS["exit"]
    })

    return cues


# ─── Vocal Detection ──────────────────────────────────────────────────────────

def detect_vocal(y: np.ndarray, sr: int) -> str:
    """
    Rough vocal presence detection.
    Returns: "none" | "spoken" | "hook" | "full"
    """
    # Harmonic-percussive separation
    y_harmonic, _ = librosa.effects.hpss(y)

    # MFCCs of harmonic component (voice lives in 300-3400 Hz range)
    mfcc = librosa.feature.mfcc(y=y_harmonic, sr=sr, n_mfcc=13)
    mfcc_std = np.std(mfcc, axis=1)

    # Spectral flatness — voiced speech has low flatness
    flatness = librosa.feature.spectral_flatness(y=y_harmonic).mean()

    # Zero crossing rate — voices have consistent ZCR
    zcr = librosa.feature.zero_crossing_rate(y_harmonic).mean()

    # Heuristic scoring
    voice_score = (
        (1.0 - float(flatness)) * 0.4 +
        (float(mfcc_std[1]) / 20.0) * 0.4 +
        (1.0 - min(1.0, float(zcr) * 20)) * 0.2
    )

    if voice_score < 0.3:
        return "none"
    elif voice_score < 0.5:
        return "spoken"
    elif voice_score < 0.7:
        return "hook"
    else:
        return "full"


# ─── Mood Tags ────────────────────────────────────────────────────────────────

def compute_mood_tags(energy: int, bpm: float, key_camelot: str, vocal: str) -> list[str]:
    tags = []

    # Energy-based
    if energy <= 2:
        tags.append("warm-up")
    elif energy >= 4:
        tags.append("peak")

    if energy == 1 or energy == 2:
        tags.append("closing") if bpm < 126 else None

    # BPM + key → vibe
    is_minor = key_camelot.endswith("A") if key_camelot else False

    if is_minor and energy >= 3:
        tags.append("dark")
    elif not is_minor and energy >= 3:
        tags.append("uplifting")

    if 124 <= bpm <= 128 and energy in (3, 4):
        tags.append("rolling")

    if energy >= 4 and bpm >= 130:
        tags.append("percussive")

    if energy in (3, 4) and is_minor:
        tags.append("hypnotic")

    # Vocal
    if vocal == "none":
        tags.append("instrumental")
    elif vocal in ("full", "hook"):
        tags.append("vocal-heavy")

    # Dedupe
    return list(dict.fromkeys(t for t in tags if t))


# ─── Main ─────────────────────────────────────────────────────────────────────

def compute_bass_energy(y: np.ndarray, sr: int) -> tuple[float, float]:
    """Compute sub-bass (20-80 Hz) and bass (80-250 Hz) energy ratios."""
    fft = np.abs(np.fft.rfft(y))
    freqs = np.fft.rfftfreq(len(y), 1 / sr)
    total_energy = np.sum(fft ** 2) + 1e-10
    sub_bass_mask = (freqs >= 20) & (freqs <= 80)
    bass_mask = (freqs >= 80) & (freqs <= 250)
    sub_bass_energy = min(1.0, float(np.sum(fft[sub_bass_mask] ** 2) / total_energy) * 5)
    bass_energy = min(1.0, float(np.sum(fft[bass_mask] ** 2) / total_energy) * 5)
    return sub_bass_energy, bass_energy


def compute_waveform_peaks(y: np.ndarray, n_peaks: int = 500) -> list:
    """Downsampled amplitude envelope for instant waveform display (no re-decode needed)."""
    hop = max(1, len(y) // n_peaks)
    peaks = []
    for i in range(n_peaks):
        start = i * hop
        end = min(start + hop, len(y))
        chunk = y[start:end]
        peaks.append(round(float(np.max(np.abs(chunk))), 4) if len(chunk) else 0.0)
    return peaks


def analyze(path: str) -> dict:
    try:
        # Real duration from file metadata (fast, no decode)
        real_duration = float(librosa.get_duration(path=path))
    except Exception:
        real_duration = None

    try:
        # Load at 22050 Hz and cap at first 3 minutes — 2-3x faster analysis
        y, sr = librosa.load(path, sr=22050, duration=180, mono=True)
    except Exception as e:
        return {"error": f"Could not load file: {e}"}

    # Use real duration for reporting; fall back to loaded segment length
    duration = real_duration if real_duration and real_duration > 0 else float(len(y) / sr)

    bpm, bpm_confidence = detect_bpm(y, sr)
    key_camelot, key_standard, key_confidence = detect_key(y, sr)
    energy = detect_energy(y, sr, bpm)
    vocal = detect_vocal(y, sr)
    structure = detect_structure(y, sr, duration)
    cue_points = generate_cue_points(structure, y, sr)
    mood_tags = compute_mood_tags(energy, bpm, key_camelot, vocal)
    waveform_peaks = compute_waveform_peaks(y)
    sub_bass_energy, bass_energy = compute_bass_energy(y, sr)

    return {
        "bpm": bpm,
        "bpm_confidence": round(bpm_confidence, 3),
        "key_camelot": key_camelot,
        "key_standard": key_standard,
        "key_confidence": round(key_confidence, 3),
        "energy": energy,
        "vocal": vocal,
        "mood_tags": mood_tags,
        "structure": structure,
        "cue_points": cue_points,
        "duration": round(duration, 3),
        "waveform_peaks": waveform_peaks,
        "sub_bass_energy": round(sub_bass_energy, 4),
        "bass_energy": round(bass_energy, 4),
        "error": None,
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: analyzer.py <audio_file>"}))
        sys.exit(1)

    result = analyze(sys.argv[1])
    print(json.dumps(result, ensure_ascii=False))
