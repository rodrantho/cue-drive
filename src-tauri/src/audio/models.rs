use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CuePoint {
    pub id: String,
    #[serde(rename = "type")]
    pub cue_type: String, // "entry" | "exit" | "drop" | "break" | "loop" | "vocal"
    pub position: f64,    // seconds
    pub label: String,
    pub color: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrackSection {
    #[serde(rename = "type")]
    pub section_type: String,
    pub start: f64,
    pub end: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrackStructure {
    pub intro_end: f64,
    pub first_drop: f64,
    pub break_start: Option<f64>,
    pub break_end: Option<f64>,
    pub outro_start: f64,
    pub sections: Vec<TrackSection>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Track {
    pub id: String,
    pub path: String,
    pub filename: String,

    // Metadata
    pub title: String,
    pub artist: String,
    pub album: String,
    pub genre: String,
    pub year: Option<i32>,
    pub duration: f64,

    // Analysis
    pub bpm: Option<f64>,
    pub bpm_confidence: Option<f64>,
    pub key_camelot: Option<String>,
    pub key_standard: Option<String>,
    pub energy: Option<u8>,        // 1-5
    pub vocal: Option<String>,     // "none" | "spoken" | "hook" | "full"
    pub mood_tags: Vec<String>,

    // Structure
    pub structure: Option<TrackStructure>,
    pub cue_points: Vec<CuePoint>,

    // Status
    pub analyzed: bool,
    pub analyzing: bool,
    pub analysis_error: Option<String>,

    // User overrides
    pub custom_energy: Option<u8>,
    pub custom_tags: Vec<String>,

    // Waveform display (pre-computed peaks for instant rendering)
    pub waveform_peaks: Option<Vec<f64>>,
}

/// Data returned by the Python analyzer sidecar
#[derive(Debug, Deserialize)]
pub struct AnalysisResult {
    pub bpm: Option<f64>,
    pub bpm_confidence: Option<f64>,
    pub key_camelot: Option<String>,
    pub key_standard: Option<String>,
    pub energy: Option<u8>,
    pub vocal: Option<String>,
    pub mood_tags: Vec<String>,
    pub structure: Option<TrackStructure>,
    pub cue_points: Vec<CuePoint>,
    pub duration: Option<f64>,
    pub waveform_peaks: Option<Vec<f64>>,
    pub error: Option<String>,
}
