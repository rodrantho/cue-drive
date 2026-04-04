use walkdir::WalkDir;
use tauri_plugin_shell::ShellExt;

use crate::audio::metadata::{is_audio_file, read_metadata};
use crate::audio::models::{AnalysisResult, Track};

/// Scan a folder recursively and return all audio files with metadata
#[tauri::command]
pub async fn import_folder(path: String) -> Result<Vec<Track>, String> {
    let tracks: Vec<Track> = WalkDir::new(&path)
        .follow_links(true)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file() && is_audio_file(e.path()))
        .map(|e| read_metadata(e.path().to_str().unwrap_or("")))
        .collect();

    Ok(tracks)
}

/// Run the bundled analyzer binary on a single track via Tauri sidecar
#[tauri::command]
pub async fn analyze_track(
    app: tauri::AppHandle,
    track_id: String,
    path: String,
) -> Result<Track, String> {
    let output = app
        .shell()
        .sidecar("analyzer")
        .map_err(|e| format!("Analyzer not found: {e}"))?
        .arg(&path)
        .output()
        .await
        .map_err(|e| format!("Failed to run analyzer: {e}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Analyzer error: {stderr}"));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let result: AnalysisResult = serde_json::from_str(&stdout)
        .map_err(|e| format!("Parse error: {e} | output: {stdout}"))?;

    if let Some(err) = result.error {
        return Err(err);
    }

    let base = read_metadata(&path);
    let track = Track {
        id: track_id,
        duration: result.duration.unwrap_or(base.duration),
        bpm: result.bpm,
        bpm_confidence: result.bpm_confidence,
        key_camelot: result.key_camelot,
        key_standard: result.key_standard,
        energy: result.energy,
        vocal: result.vocal,
        mood_tags: result.mood_tags,
        structure: result.structure,
        cue_points: result.cue_points,
        waveform_peaks: result.waveform_peaks,
        sub_bass_energy: result.sub_bass_energy,
        bass_energy: result.bass_energy,
        analyzed: true,
        analyzing: false,
        analysis_error: None,
        ..base
    };

    Ok(track)
}
