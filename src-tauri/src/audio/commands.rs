use walkdir::WalkDir;
use tokio::process::Command;

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

/// Locate the analyzer.py script relative to the binary
fn analyzer_script_path() -> String {
    // In dev: binary is at src-tauri/target/debug/cue-drive
    // Script is at src-tauri/../../../analyzer/analyzer.py
    // In production: use a path relative to the app bundle
    if let Ok(exe) = std::env::current_exe() {
        // Walk up from the binary to find the project root
        let mut dir = exe.clone();
        for _ in 0..5 {
            dir.pop();
            let candidate = dir.join("analyzer").join("analyzer.py");
            if candidate.exists() {
                return candidate.to_string_lossy().to_string();
            }
        }
    }
    // Fallback: relative to current working directory
    "analyzer/analyzer.py".to_string()
}

/// Find python3 executable
fn python_path() -> String {
    for p in &["/usr/bin/python3", "/usr/local/bin/python3", "python3"] {
        if std::path::Path::new(p).exists() {
            return p.to_string();
        }
    }
    "python3".to_string()
}

/// Run Python analyzer on a single track
#[tauri::command]
pub async fn analyze_track(
    track_id: String,
    path: String,
) -> Result<Track, String> {
    let script = analyzer_script_path();
    let python = python_path();

    let output = Command::new(&python)
        .arg(&script)
        .arg(&path)
        .output()
        .await
        .map_err(|e| format!("Failed to run analyzer (python={python}, script={script}): {e}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Analyzer error: {stderr}"));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let result: AnalysisResult =
        serde_json::from_str(&stdout).map_err(|e| format!("Parse error: {e} | output: {stdout}"))?;

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
        analyzed: true,
        analyzing: false,
        analysis_error: None,
        ..base
    };

    Ok(track)
}
