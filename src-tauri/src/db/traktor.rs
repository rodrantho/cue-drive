/// Traktor NML collection writer.
///
/// Traktor uses an XML-based .nml file (Native Instruments Markup Language).
/// We generate a collection.nml that Traktor can import.
use std::fmt::Write;
use crate::audio::models::Track;

pub fn generate_nml(tracks: &[Track]) -> String {
    let mut out = String::new();

    writeln!(out, r#"<?xml version="1.0" encoding="UTF-8"?>"#).ok();
    writeln!(out, r#"<NML VERSION="19">"#).ok();
    writeln!(out, r#"  <HEAD COMPANY="CueDrive" PROGRAM="CueDrive" />"#).ok();
    writeln!(out, r#"  <COLLECTION ENTRIES="{}">"#, tracks.len()).ok();

    for track in tracks {
        let bpm_str = track
            .bpm
            .map(|b| format!("{:.6}", b))
            .unwrap_or_default();
        let key_str = track.key_camelot.as_deref().unwrap_or("");
        let duration_str = format!("{:.6}", track.duration);

        writeln!(
            out,
            r#"    <ENTRY MODIFIED_DATE="{}" ARTIST="{}" TITLE="{}">"#,
            chrono::Utc::now().format("%Y/%m/%d"),
            xml_escape(&track.artist),
            xml_escape(&track.title),
        ).ok();

        writeln!(
            out,
            r#"      <LOCATION DIR="{}" FILE="{}" VOLUME="/" VOLUMEID="/" />"#,
            xml_escape(
                std::path::Path::new(&track.path)
                    .parent()
                    .unwrap_or(std::path::Path::new(""))
                    .to_str()
                    .unwrap_or("")
            ),
            xml_escape(&track.filename),
        ).ok();

        writeln!(
            out,
            r#"      <INFO PLAYCOUNT="0" LAST_PLAYED="" RATING="0" PLAYTIME="{}" PLAYTIME_FLOAT="{}" />"#,
            track.duration as u64,
            duration_str,
        ).ok();

        if !bpm_str.is_empty() {
            writeln!(
                out,
                r#"      <TEMPO BPM="{}" BPM_QUALITY="100" />"#,
                bpm_str
            ).ok();
        }

        if !key_str.is_empty() {
            writeln!(
                out,
                r#"      <MUSICAL_KEY VALUE="{}" />"#,
                key_str
            ).ok();
        }

        // Write cue points
        for (i, cue) in track.cue_points.iter().enumerate() {
            let kind = match cue.cue_type.as_str() {
                "loop" => 4,
                _ => 0,
            };
            writeln!(
                out,
                r#"      <CUE_V2 NAME="{}" DISPL_ORDER="{}" TYPE="{}" START="{:.6}" LEN="0.000000" REPEATS="-1" HOTCUE="{}" />"#,
                xml_escape(&cue.label),
                i,
                kind,
                cue.position * 1000.0, // NML uses milliseconds
                i,
            ).ok();
        }

        writeln!(out, "    </ENTRY>").ok();
    }

    writeln!(out, "  </COLLECTION>").ok();
    writeln!(out, "</NML>").ok();
    out
}

fn xml_escape(s: &str) -> String {
    s.replace('&', "&amp;")
     .replace('"', "&quot;")
     .replace('<', "&lt;")
     .replace('>', "&gt;")
}
