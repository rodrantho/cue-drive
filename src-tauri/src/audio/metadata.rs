use std::path::Path;
use id3::TagLike;
use crate::audio::models::Track;
use uuid::Uuid;

/// Read basic metadata from audio file tags (no audio analysis, just ID3/FLAC/etc)
pub fn read_metadata(path: &str) -> Track {
    let p = Path::new(path);
    let filename = p
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();
    let ext = p
        .extension()
        .unwrap_or_default()
        .to_string_lossy()
        .to_lowercase();

    let mut title = filename.clone();
    let mut artist = String::new();
    let mut album = String::new();
    let mut genre = String::new();
    let mut year: Option<i32> = None;
    let mut duration: f64 = 0.0;

    match ext.as_str() {
        "mp3" => {
            if let Ok(tag) = id3::Tag::read_from_path(path) {
                title = tag.title().unwrap_or(&filename).to_string();
                artist = tag.artist().unwrap_or("").to_string();
                album = tag.album().unwrap_or("").to_string();
                genre = tag.genre().unwrap_or("").to_string();
                year = tag.year();
                if let Some(dur) = tag.duration() {
                    duration = dur as f64 / 1000.0;
                }
            }
        }
        "flac" => {
            if let Ok(tag) = metaflac::Tag::read_from_path(path) {
                if let Some(comments) = tag.vorbis_comments() {
                    title = comments
                        .title()
                        .and_then(|v| v.first().cloned())
                        .unwrap_or(filename.clone());
                    artist = comments
                        .artist()
                        .and_then(|v| v.first().cloned())
                        .unwrap_or_default();
                    album = comments
                        .album()
                        .and_then(|v| v.first().cloned())
                        .unwrap_or_default();
                    genre = comments
                        .genre()
                        .and_then(|v| v.first().cloned())
                        .unwrap_or_default();
                }
            }
        }
        "m4a" | "aac" => {
            if let Ok(tag) = mp4ameta::Tag::read_from_path(path) {
                title = tag.title().unwrap_or(&filename).to_string();
                artist = tag.artist().unwrap_or("").to_string();
                album = tag.album().unwrap_or("").to_string();
                genre = tag.genre().map(|g| g.to_string()).unwrap_or_default();
                year = tag.year().and_then(|y| y.parse().ok());
            }
        }
        _ => {}
    }

    Track {
        id: Uuid::new_v4().to_string(),
        path: path.to_string(),
        filename,
        title,
        artist,
        album,
        genre,
        year,
        duration,
        bpm: None,
        bpm_confidence: None,
        key_camelot: None,
        key_standard: None,
        energy: None,
        vocal: None,
        mood_tags: vec![],
        structure: None,
        cue_points: vec![],
        analyzed: false,
        analyzing: false,
        analysis_error: None,
        custom_energy: None,
        custom_tags: vec![],
        waveform_peaks: None,
    }
}

/// Supported audio file extensions
pub fn is_audio_file(path: &Path) -> bool {
    matches!(
        path.extension()
            .unwrap_or_default()
            .to_string_lossy()
            .to_lowercase()
            .as_str(),
        "mp3" | "flac" | "wav" | "aiff" | "aif" | "m4a" | "aac" | "ogg" | "opus"
    )
}
