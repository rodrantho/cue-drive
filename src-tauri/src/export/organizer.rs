use std::path::{Path, PathBuf};
use serde::{Deserialize, Serialize};
use crate::audio::models::Track;

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct ExportOptions {
    pub target: String,             // "cdj" | "traktor" | "files"
    pub destination_path: String,
    pub folder_organization: String, // "energy" | "genre" | "bpm" | "none"
    pub filename_format: String,     // "camelot_bpm" | "standard_bpm" | "original"
    pub key_notation: String,        // "camelot" | "standard"
    pub copy_files: bool,
}

/// Determine the destination folder for a track based on organization mode
pub fn get_dest_folder(track: &Track, opts: &ExportOptions) -> PathBuf {
    let base = Path::new(&opts.destination_path).join("Music");

    match opts.folder_organization.as_str() {
        "energy" => {
            let level = track.custom_energy.or(track.energy).unwrap_or(3);
            let label = match level {
                1 => "01 - Warm Up",
                2 => "02 - Low",
                3 => "03 - Mid",
                4 => "04 - High",
                5 => "05 - Peak",
                _ => "03 - Mid",
            };
            base.join(label)
        }
        "genre" => base.join(if track.genre.is_empty() { "Unknown" } else { &track.genre }),
        "bpm" => {
            let bpm_range = track.bpm.map(|b| {
                let floor = (b as u64 / 10) * 10;
                format!("{}-{} BPM", floor, floor + 9)
            }).unwrap_or_else(|| "Unknown BPM".into());
            base.join(bpm_range)
        }
        _ => base,
    }
}

/// Build the destination filename based on format option
pub fn get_dest_filename(track: &Track, opts: &ExportOptions) -> String {
    let ext = Path::new(&track.filename)
        .extension()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    match opts.filename_format.as_str() {
        "camelot_bpm" => {
            let key = track.key_camelot.as_deref().unwrap_or("??");
            let bpm = track.bpm.map(|b| format!("{:.0}", b)).unwrap_or("???".into());
            format!("({}) {} - {} - {}.{}", key, bpm, track.artist, track.title, ext)
        }
        "standard_bpm" => {
            let key = track.key_standard.as_deref().unwrap_or("??");
            let bpm = track.bpm.map(|b| format!("{:.0}", b)).unwrap_or("???".into());
            format!("({}) {} - {} - {}.{}", key, bpm, track.artist, track.title, ext)
        }
        _ => track.filename.clone(),
    }
}
