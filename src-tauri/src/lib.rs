mod workspace;

use workspace::commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_persisted_scope::init())
        .manage(workspace::ApprovedWorkspace::default())
        .invoke_handler(tauri::generate_handler![
            commands::approve_workspace,
            commands::forget_workspace,
            commands::create_workspace_directory,
            commands::rename_workspace_entry,
            commands::move_workspace_entry,
            commands::delete_workspace_entry,
            commands::preview_workspace_deletion,
            commands::write_workspace_note,
            commands::workspace_note_revision,
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
