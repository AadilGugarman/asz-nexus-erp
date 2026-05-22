// lib.rs
// Tauri application library root.
// This file stays minimal — it only wires together the modules.

mod auth;
mod db;
mod error;
mod events;
mod ipc;
mod models;
mod repositories;
mod services;
mod state;
mod validation;
mod commands;

use db::connection::init_pool;
use db::migrations;
use state::AppState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .setup(|app| {
            // ── Database ──────────────────────────────────────────────────────
            let app_data_dir = app.path().app_data_dir()
                .expect("Failed to resolve app data directory");
            let db_path = app_data_dir.join("tfc_erp.db");

            let pool = init_pool(&db_path)
                .expect("Failed to initialise SQLite pool");

            {
                let conn = pool.get().expect("Failed to get migration connection");
                migrations::run(&conn).expect("Database migration failed");
            }

            app.manage(AppState::new(pool));

            // ── Logging (release: warn+, dev: debug+) ─────────────────────────
            let log_level = if cfg!(debug_assertions) {
                log::LevelFilter::Debug
            } else {
                log::LevelFilter::Warn
            };
            let _ = env_logger::Builder::new()
                .filter_level(log_level)
                .try_init();

            // ── System tray ───────────────────────────────────────────────────
            use tauri::tray::{TrayIconBuilder, TrayIconEvent};
            use tauri::menu::{MenuBuilder, MenuItemBuilder};

            let show_item = MenuItemBuilder::with_id("show", "Show TFC ERP")
                .build(app)?;
            let hide_item = MenuItemBuilder::with_id("hide", "Hide")
                .build(app)?;
            let quit_item = MenuItemBuilder::with_id("quit", "Quit")
                .build(app)?;

            let menu = MenuBuilder::new(app)
                .items(&[&show_item, &hide_item, &quit_item])
                .build()?;

            let _tray = TrayIconBuilder::with_id("tfc-tray")
                .tooltip("TFC ERP — Fruit Commission Management")
                .icon(app.default_window_icon().cloned().unwrap())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "show" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                    "hide" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.hide();
                        }
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    // Double-click on tray icon → show/focus main window
                    if let TrayIconEvent::DoubleClick { .. } = event {
                        let app = tray.app_handle();
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .invoke_handler({
            tauri::generate_handler![
                // ── App ──────────────────────────────────────────────────────
                commands::app::get_app_info,
                commands::app::ping,
                // ── Auth ─────────────────────────────────────────────────────
                commands::auth::auth_is_setup_done,
                commands::auth::auth_setup,
                commands::auth::auth_login,
                commands::auth::auth_refresh,
                commands::auth::auth_restore_session,
                commands::auth::auth_get_lock_config,
                commands::auth::auth_set_lock_config,
                commands::auth::auth_verify_pin,
                commands::auth::auth_logout,
                commands::auth::auth_check,
                commands::auth::auth_reset_app,
                commands::auth::auth_change_password,
                // ── Database ─────────────────────────────────────────────────
                commands::db::db_get_stats,
                     commands::db::db_get_seed_plan,
                     commands::db::db_reseed_demo_data,
                     commands::db::db_reset_demo_data,
                   // ── Backup ───────────────────────────────────────────────────
                   commands::backup::backup_create,
                   commands::backup::backup_list,
                   commands::backup::backup_validate,
                   commands::backup::backup_delete,
                   commands::backup::backup_restore,
                   commands::backup::backup_prune,
                   commands::backup::backup_get_dir,
                // ── Employee ─────────────────────────────────────────────────
                commands::employee::employee_list,
                commands::employee::employee_get,
                commands::employee::employee_create,
                commands::employee::employee_update,
                commands::employee::employee_delete,
                commands::employee::employee_set_active,
                commands::employee::employee_bulk_insert,
                // ── Supplier ─────────────────────────────────────────────────
                commands::supplier::supplier_list,
                commands::supplier::supplier_get,
                commands::supplier::supplier_create,
                commands::supplier::supplier_update,
                commands::supplier::supplier_delete,
                // ── Customer ─────────────────────────────────────────────────
                commands::customer::customer_list,
                commands::customer::customer_get,
                commands::customer::customer_create,
                commands::customer::customer_update,
                commands::customer::customer_delete,
                // ── Sales Invoices ────────────────────────────────────────────
                commands::invoice::invoice_list,
                commands::invoice::invoice_get,
                commands::invoice::invoice_create,
                commands::invoice::invoice_delete,
                // ── Purchase Invoices ─────────────────────────────────────────
                commands::invoice::purchase_list,
                commands::invoice::purchase_get,
                commands::invoice::purchase_create,
                commands::invoice::purchase_delete,
                // ── Payments ─────────────────────────────────────────────────
                commands::payment::payment_list,
                commands::payment::payment_get,
                commands::payment::payment_create,
                commands::payment::payment_delete,
                commands::payment::payment_total_by_party,
                // ── File ─────────────────────────────────────────────────────
                commands::file::write_text_file,
                commands::file::read_text_file,
                commands::file::stat_path_cmd,
                // ── Secure FS ─────────────────────────────────────────────────
                commands::fs::fs_stat,
                commands::fs::fs_list_dir,
                commands::fs::fs_read_text,
                commands::fs::fs_write_text,
                commands::fs::fs_read_bytes,
                commands::fs::fs_write_bytes,
                commands::fs::fs_copy,
                commands::fs::fs_delete,
                commands::fs::fs_export_csv,
                commands::fs::fs_export_json,
                commands::fs::fs_save_pdf,
                commands::fs::fs_dialog_open,
                commands::fs::fs_dialog_save,
                commands::fs::fs_get_allowed_roots,
                // ── Window ───────────────────────────────────────────────────
                commands::window::win_minimize,
                commands::window::win_maximize,
                commands::window::win_unmaximize,
                commands::window::win_close,
                commands::window::win_hide,
                commands::window::win_show,
                commands::window::win_toggle_fullscreen,
                commands::window::win_set_always_on_top,
                commands::window::win_set_title,
                commands::window::win_set_size,
                commands::window::win_set_position,
                commands::window::win_center,
                commands::window::win_get_state,
                commands::window::win_open,
                commands::window::win_list,
                commands::window::win_start_drag,
                // ── System ───────────────────────────────────────────────────
                commands::system::get_system_info,
                commands::system::get_app_data_dir,
                // ── Updater ──────────────────────────────────────────────────
                commands::updater::updater_check,
                commands::updater::updater_install,
            ]
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
