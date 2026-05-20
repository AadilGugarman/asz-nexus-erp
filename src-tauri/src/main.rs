// main.rs
// Tauri application entry point.
// Keeps this file minimal — all logic lives in lib.rs and the modules it owns.

// Prevents an additional console window on Windows in release mode.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tfc_erp_lib::run();
}
