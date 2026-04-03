mod audio;
mod db;
mod export;

use audio::commands::{import_folder, analyze_track};
use export::commands::{export_to_usb, get_connected_drives};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            import_folder,
            analyze_track,
            export_to_usb,
            get_connected_drives,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
