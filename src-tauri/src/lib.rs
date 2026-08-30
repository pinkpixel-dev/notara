mod openai;
mod reminders;
mod workspace;

use reminders::ReminderEngine;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{Manager, WindowEvent};
use workspace::commands;

#[cfg(target_os = "linux")]
const DISABLED_APPIMAGE_GIO_MODULES: &str = "/__notara_appimage_disabled_gio_modules__";

#[cfg(target_os = "linux")]
fn disabled_appimage_gio_modules_path(appimage: Option<&std::ffi::OsStr>) -> Option<&'static str> {
    appimage.map(|_| DISABLED_APPIMAGE_GIO_MODULES)
}

#[cfg(target_os = "linux")]
fn configure_appimage_gio_modules() {
    if let Some(path) = disabled_appimage_gio_modules_path(std::env::var_os("APPIMAGE").as_deref())
    {
        std::env::set_var("GIO_MODULE_DIR", path);
        std::env::set_var("GIO_EXTRA_MODULES", path);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(target_os = "linux")]
    configure_appimage_gio_modules();

    let reminder_engine = ReminderEngine::new();

    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_persisted_scope::init())
        .manage(workspace::ApprovedWorkspace::default())
        .manage(reminder_engine)
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
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
            openai::commands::openai_key_status,
            openai::commands::openai_save_key,
            openai::commands::openai_delete_key,
            openai::commands::openai_test_key,
            openai::commands::openai_generate_text,
            openai::commands::openai_stream_text,
            openai::commands::openai_cancel_stream,
            openai::commands::openai_generate_image,
            openai::commands::openai_save_image,
            reminders::commands::sync_todo_reminders,
            reminders::commands::dismiss_reminder,
            reminders::commands::get_reminder_records,
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let engine = app.state::<ReminderEngine>();
            engine.start_worker(app.handle().clone());

            let show_item = MenuItem::with_id(app, "show", "Show Notara", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit Notara", true, None::<&str>)?;
            let tray_menu = Menu::with_items(app, &[&show_item, &quit_item])?;

            let mut builder = TrayIconBuilder::new()
                .menu(&tray_menu)
                .tooltip("Notara")
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                });

            if let Some(icon) = app.default_window_icon() {
                builder = builder.icon(icon.clone());
            }

            builder.build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(all(test, target_os = "linux"))]
mod tests {
    use super::{disabled_appimage_gio_modules_path, DISABLED_APPIMAGE_GIO_MODULES};

    #[test]
    fn disables_bundled_gio_modules_for_appimage_runs() {
        let path =
            disabled_appimage_gio_modules_path(Some(std::ffi::OsStr::new("/tmp/Notara.AppImage")));

        assert_eq!(path, Some(DISABLED_APPIMAGE_GIO_MODULES));
    }

    #[test]
    fn keeps_normal_linux_gio_modules_outside_appimage_runs() {
        assert_eq!(disabled_appimage_gio_modules_path(None), None);
    }
}
