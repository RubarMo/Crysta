pub mod models;
pub mod db;
pub mod commands;

use std::sync::Mutex;
use tauri::Manager;
use models::DbState;
use commands::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let _ = rustls::crypto::ring::default_provider().install_default();
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .manage(DbState {
            current_db_path: Mutex::new(None),
        })
        .setup(|app| {
            #[cfg(desktop)]
            if let Some(main_window) = app.get_webview_window("main") {
                let _ = main_window.set_min_size(Some(tauri::LogicalSize::new(1080.0, 650.0)));
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            select_project_file,
            create_project_file,
            list_project_files,
            open_project,
            close_project,
            get_novels,
            create_novel,
            update_novel,
            delete_novel,
            get_steps_progress,
            save_step_progress,
            get_characters,
            save_character,
            delete_character,
            get_scenes,
            save_scene,
            delete_scene,
            reorder_scenes,
            get_chapters,
            save_chapter,
            delete_chapter,
            reorder_chapters,
            get_book_formatting,
            save_book_formatting,
            take_snapshot,
            list_snapshots,
            restore_snapshot,
            delete_snapshot,
            open_backups_directory,
            save_export_file,
            show_in_folder
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
