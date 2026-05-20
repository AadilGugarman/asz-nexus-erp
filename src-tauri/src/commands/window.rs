// commands/window.rs
// Window management commands — custom titlebar, multi-window, tray.
//
// Frontend command names (all prefixed "win_"):
//   "win_minimize"         → win_minimize()
//   "win_maximize"         → win_maximize()
//   "win_unmaximize"       → win_unmaximize()
//   "win_close"            → win_close()
//   "win_hide"             → win_hide()
//   "win_show"             → win_show()
//   "win_toggle_fullscreen"→ win_toggle_fullscreen()
//   "win_set_always_on_top"→ win_set_always_on_top()
//   "win_set_title"        → win_set_title()
//   "win_set_size"         → win_set_size()
//   "win_set_position"     → win_set_position()
//   "win_center"           → win_center()
//   "win_get_state"        → win_get_state()
//   "win_open"             → win_open()
//   "win_list"             → win_list()
//   "win_start_drag"       → win_start_drag()

use serde::Deserialize;

use crate::ipc::IpcResponse;
use crate::error::AppResult;
use crate::services::window as win_svc;

// ── Shared payload ────────────────────────────────────────────────────────────

/// Most commands target a specific window by label.
/// Defaults to "main" when omitted.
#[derive(Debug, Deserialize)]
pub struct WindowTarget {
    pub label: Option<String>,
}

impl WindowTarget {
    fn label(&self) -> &str {
        self.label.as_deref().unwrap_or("main")
    }
}

// ── Basic controls ────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn win_minimize(
    app: tauri::AppHandle,
    payload: WindowTarget,
) -> AppResult<IpcResponse<bool>> {
    let w = win_svc::get_window(&app, payload.label())?;
    win_svc::minimize(&w)?;
    Ok(IpcResponse::ok(true))
}

#[tauri::command]
pub async fn win_maximize(
    app: tauri::AppHandle,
    payload: WindowTarget,
) -> AppResult<IpcResponse<bool>> {
    let w = win_svc::get_window(&app, payload.label())?;
    win_svc::maximize(&w)?;
    Ok(IpcResponse::ok(true))
}

#[tauri::command]
pub async fn win_unmaximize(
    app: tauri::AppHandle,
    payload: WindowTarget,
) -> AppResult<IpcResponse<bool>> {
    let w = win_svc::get_window(&app, payload.label())?;
    win_svc::unmaximize(&w)?;
    Ok(IpcResponse::ok(true))
}

#[tauri::command]
pub async fn win_close(
    app: tauri::AppHandle,
    payload: WindowTarget,
) -> AppResult<IpcResponse<bool>> {
    let w = win_svc::get_window(&app, payload.label())?;
    win_svc::close(&w)?;
    Ok(IpcResponse::ok(true))
}

#[tauri::command]
pub async fn win_hide(
    app: tauri::AppHandle,
    payload: WindowTarget,
) -> AppResult<IpcResponse<bool>> {
    let w = win_svc::get_window(&app, payload.label())?;
    win_svc::hide(&w)?;
    Ok(IpcResponse::ok(true))
}

#[tauri::command]
pub async fn win_show(
    app: tauri::AppHandle,
    payload: WindowTarget,
) -> AppResult<IpcResponse<bool>> {
    let w = win_svc::get_window(&app, payload.label())?;
    win_svc::show(&w)?;
    Ok(IpcResponse::ok(true))
}

// ── Fullscreen / always-on-top ────────────────────────────────────────────────

#[tauri::command]
pub async fn win_toggle_fullscreen(
    app: tauri::AppHandle,
    payload: WindowTarget,
) -> AppResult<IpcResponse<bool>> {
    let w = win_svc::get_window(&app, payload.label())?;
    let is_full = win_svc::toggle_fullscreen(&w)?;
    Ok(IpcResponse::ok(is_full))
}

#[derive(Debug, Deserialize)]
pub struct SetAlwaysOnTopPayload {
    pub label:    Option<String>,
    pub on_top:   bool,
}

#[tauri::command]
pub async fn win_set_always_on_top(
    app: tauri::AppHandle,
    payload: SetAlwaysOnTopPayload,
) -> AppResult<IpcResponse<bool>> {
    let label = payload.label.as_deref().unwrap_or("main");
    let w = win_svc::get_window(&app, label)?;
    win_svc::set_always_on_top(&w, payload.on_top)?;
    Ok(IpcResponse::ok(payload.on_top))
}

// ── Title / size / position ───────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct SetTitlePayload {
    pub label: Option<String>,
    pub title: String,
}

#[tauri::command]
pub async fn win_set_title(
    app: tauri::AppHandle,
    payload: SetTitlePayload,
) -> AppResult<IpcResponse<bool>> {
    let label = payload.label.as_deref().unwrap_or("main");
    let w = win_svc::get_window(&app, label)?;
    win_svc::set_title(&w, &payload.title)?;
    Ok(IpcResponse::ok(true))
}

#[derive(Debug, Deserialize)]
pub struct SetSizePayload {
    pub label:  Option<String>,
    pub width:  f64,
    pub height: f64,
}

#[tauri::command]
pub async fn win_set_size(
    app: tauri::AppHandle,
    payload: SetSizePayload,
) -> AppResult<IpcResponse<bool>> {
    let label = payload.label.as_deref().unwrap_or("main");
    let w = win_svc::get_window(&app, label)?;
    win_svc::set_size(&w, payload.width, payload.height)?;
    Ok(IpcResponse::ok(true))
}

#[derive(Debug, Deserialize)]
pub struct SetPositionPayload {
    pub label: Option<String>,
    pub x:     f64,
    pub y:     f64,
}

#[tauri::command]
pub async fn win_set_position(
    app: tauri::AppHandle,
    payload: SetPositionPayload,
) -> AppResult<IpcResponse<bool>> {
    let label = payload.label.as_deref().unwrap_or("main");
    let w = win_svc::get_window(&app, label)?;
    win_svc::set_position(&w, payload.x, payload.y)?;
    Ok(IpcResponse::ok(true))
}

#[tauri::command]
pub async fn win_center(
    app: tauri::AppHandle,
    payload: WindowTarget,
) -> AppResult<IpcResponse<bool>> {
    let w = win_svc::get_window(&app, payload.label())?;
    win_svc::center(&w)?;
    Ok(IpcResponse::ok(true))
}

// ── State query ───────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn win_get_state(
    app: tauri::AppHandle,
    payload: WindowTarget,
) -> AppResult<IpcResponse<win_svc::WindowState>> {
    let w = win_svc::get_window(&app, payload.label())?;
    let state = win_svc::get_state(&w)?;
    Ok(IpcResponse::ok(state))
}

// ── Multi-window ──────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn win_open(
    app: tauri::AppHandle,
    payload: win_svc::OpenWindowOptions,
) -> AppResult<IpcResponse<String>> {
    let label = win_svc::open_window(&app, payload)?;
    Ok(IpcResponse::ok(label))
}

#[tauri::command]
pub async fn win_list(
    app: tauri::AppHandle,
) -> AppResult<IpcResponse<Vec<String>>> {
    Ok(IpcResponse::ok(win_svc::list_windows(&app)))
}

// ── Drag (custom titlebar) ────────────────────────────────────────────────────

/// Start a native window drag from the custom titlebar.
/// Call this on mousedown of the drag region.
#[tauri::command]
pub async fn win_start_drag(
    app: tauri::AppHandle,
    payload: WindowTarget,
) -> AppResult<IpcResponse<bool>> {
    let w = win_svc::get_window(&app, payload.label())?;
    w.start_dragging()
        .map_err(|e| crate::error::AppError::Internal(e.to_string()))?;
    Ok(IpcResponse::ok(true))
}
