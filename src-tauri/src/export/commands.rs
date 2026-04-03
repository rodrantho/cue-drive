use std::path::Path;
use tauri::AppHandle;

use crate::audio::models::Track;
use crate::db::{rekordbox::RekordboxWriter, traktor::generate_nml};
use crate::export::organizer::{get_dest_filename, get_dest_folder, ExportOptions};

#[tauri::command]
pub async fn export_to_usb(
    tracks: Vec<Track>,
    opts: ExportOptions,
) -> Result<String, String> {
    match opts.target.as_str() {
        "cdj" => export_cdj(&tracks, &opts).map_err(|e| e.to_string()),
        "traktor" => export_traktor(&tracks, &opts).map_err(|e| e.to_string()),
        "files" => export_files(&tracks, &opts).map_err(|e| e.to_string()),
        other => Err(format!("Unknown export target: {other}")),
    }
}

fn export_cdj(tracks: &[Track], opts: &ExportOptions) -> Result<String, Box<dyn std::error::Error>> {
    let writer = RekordboxWriter::create(&opts.destination_path)
        .map_err(|e| format!("DB error: {e}"))?;

    // Create root playlist
    let root_id = writer.create_playlist("CueDrive Export", None)?;

    for (i, track) in tracks.iter().enumerate() {
        // Copy file to organized folder
        let dest_folder = get_dest_folder(track, opts);
        std::fs::create_dir_all(&dest_folder)?;
        let dest_file = dest_folder.join(get_dest_filename(track, opts));

        if opts.copy_files {
            std::fs::copy(&track.path, &dest_file)?;
        }

        // Update path to USB destination
        let mut usb_track = track.clone();
        usb_track.path = dest_file.to_string_lossy().to_string();
        usb_track.filename = dest_file
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();

        let content_id = writer.insert_track(&usb_track)?;
        writer.add_to_playlist(root_id, content_id, i as i64 + 1)?;
    }

    Ok(format!("Exported {} tracks to CDJ format", tracks.len()))
}

fn export_traktor(tracks: &[Track], opts: &ExportOptions) -> Result<String, Box<dyn std::error::Error>> {
    let dest = Path::new(&opts.destination_path);
    std::fs::create_dir_all(dest)?;

    // Copy/organize files
    let mut final_tracks: Vec<Track> = Vec::new();
    for track in tracks {
        let dest_folder = get_dest_folder(track, opts);
        std::fs::create_dir_all(&dest_folder)?;
        let dest_file = dest_folder.join(get_dest_filename(track, opts));

        if opts.copy_files {
            std::fs::copy(&track.path, &dest_file)?;
        }

        let mut t = track.clone();
        t.path = dest_file.to_string_lossy().to_string();
        t.filename = dest_file
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();
        final_tracks.push(t);
    }

    // Write NML
    let nml = generate_nml(&final_tracks);
    let nml_path = dest.join("collection.nml");
    std::fs::write(&nml_path, nml)?;

    Ok(format!(
        "Exported {} tracks. Import {} into Traktor.",
        tracks.len(),
        nml_path.display()
    ))
}

fn export_files(tracks: &[Track], opts: &ExportOptions) -> Result<String, Box<dyn std::error::Error>> {
    for track in tracks {
        let dest_folder = get_dest_folder(track, opts);
        std::fs::create_dir_all(&dest_folder)?;
        let dest_file = dest_folder.join(get_dest_filename(track, opts));

        if opts.copy_files {
            std::fs::copy(&track.path, &dest_file)?;
        }
    }
    Ok(format!("Organized {} tracks into folders", tracks.len()))
}

/// Returns mounted volumes/drives (cross-platform)
#[tauri::command]
pub async fn get_connected_drives() -> Result<Vec<String>, String> {
    let mut drives = Vec::new();

    #[cfg(target_os = "macos")]
    {
        if let Ok(entries) = std::fs::read_dir("/Volumes") {
            for entry in entries.flatten() {
                drives.push(entry.path().to_string_lossy().to_string());
            }
        }
    }

    #[cfg(target_os = "windows")]
    {
        // Check drive letters A-Z
        for letter in b'A'..=b'Z' {
            let path = format!("{}:\\", letter as char);
            if std::path::Path::new(&path).exists() {
                drives.push(path);
            }
        }
    }

    Ok(drives)
}
