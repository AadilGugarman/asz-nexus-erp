// services/window.rs
// Window management business logic.
//
// Pure functions that operate on tauri::WebviewWindow references.
// Commands in commands/window.rs call these after resolving the window.

use tauri::{AppHandle, Manager, WebviewWindow, WebviewWindowBuilder, WebviewUrl};
use crate::error::{AppError, AppResult};

// ── Window state helpers ──────────────────────────────────────────────────────

pub fn get_window(app: &AppHandle, label: &str) -> AppResult<WebviewWindow> {
    app.get_webview_window(label)
        .ok_or_else(|| AppError::NotFound(format!("Window '{}' not found", label)))
}

pub fn minimize(window: &WebviewWindow) -> AppResult<()> {
    window.minimize().map_err(|e| AppError::Internal(e.to_string()))
}

pub fn maximize(window: &WebviewWindow) -> AppResult<()> {
    if window.is_maximized().unwrap_or(false) {
        window.unmaximize().map_err(|e| AppError::Internal(e.to_string()))
    } else {
        window.maximize().map_err(|e| AppError::Internal(e.to_string()))
    }
}

pub fn unmaximize(window: &WebviewWindow) -> AppResult<()> {
    window.unmaximize().map_err(|e| AppError::Internal(e.to_string()))
}

pub fn close(window: &WebviewWindow) -> AppResult<()> {
    window.close().map_err(|e| AppError::Internal(e.to_string()))
}

pub fn hide(window: &WebviewWindow) -> AppResult<()> {
    window.hide().map_err(|e| AppError::Internal(e.to_string()))
}

pub fn show(window: &WebviewWindow) -> AppResult<()> {
    window.show().map_err(|e| AppError::Internal(e.to_string()))?;
    window.set_focus().map_err(|e| AppError::Internal(e.to_string()))
}

pub fn toggle_fullscreen(window: &WebviewWindow) -> AppResult<bool> {
    let is_full = window.is_fullscreen().unwrap_or(false);
    window
        .set_fullscreen(!is_full)
        .map_err(|e| AppError::Internal(e.to_string()))?;
    Ok(!is_full)
}

pub fn set_always_on_top(window: &WebviewWindow, on_top: bool) -> AppResult<()> {
    window
        .set_always_on_top(on_top)
        .map_err(|e| AppError::Internal(e.to_string()))
}

pub fn set_title(window: &WebviewWindow, title: &str) -> AppResult<()> {
    window
        .set_title(title)
        .map_err(|e| AppError::Internal(e.to_string()))
}

pub fn set_size(window: &WebviewWindow, width: f64, height: f64) -> AppResult<()> {
    use tauri::LogicalSize;
    window
        .set_size(LogicalSize::new(width, height))
        .map_err(|e| AppError::Internal(e.to_string()))
}

pub fn set_position(window: &WebviewWindow, x: f64, y: f64) -> AppResult<()> {
    use tauri::LogicalPosition;
    window
        .set_position(LogicalPosition::new(x, y))
        .map_err(|e| AppError::Internal(e.to_string()))
}

pub fn center(window: &WebviewWindow) -> AppResult<()> {
    window.center().map_err(|e| AppError::Internal(e.to_string()))
}

// ── Window state query ────────────────────────────────────────────────────────

#[derive(Debug, serde::Serialize)]
pub struct WindowState {
    pub label:        String,
    pub title:        String,
    pub is_visible:   bool,
    pub is_focused:   bool,
    pub is_maximized: bool,
    pub is_minimized: bool,
    pub is_fullscreen: bool,
    pub width:        f64,
    pub height:       f64,
    pub x:            f64,
    pub y:            f64,
}

pub fn get_state(window: &WebviewWindow) -> AppResult<WindowState> {
    let size = window
        .inner_size()
        .map_err(|e| AppError::Internal(e.to_string()))?;
    let pos = window
        .outer_position()
        .map_err(|e| AppError::Internal(e.to_string()))?;

    Ok(WindowState {
        label:        window.label().to_string(),
        title:        window.title().unwrap_or_default(),
        is_visible:   window.is_visible().unwrap_or(false),
        is_focused:   window.is_focused().unwrap_or(false),
        is_maximized: window.is_maximized().unwrap_or(false),
        is_minimized: window.is_minimized().unwrap_or(false),
        is_fullscreen: window.is_fullscreen().unwrap_or(false),
        width:        size.width as f64,
        height:       size.height as f64,
        x:            pos.x as f64,
        y:            pos.y as f64,
    })
}

// ── Multi-window ──────────────────────────────────────────────────────────────

#[derive(Debug, serde::Deserialize)]
pub struct OpenWindowOptions {
    pub label:       String,
    pub title:       String,
    pub url:         String,
    pub width:       Option<f64>,
    pub height:      Option<f64>,
    pub min_width:   Option<f64>,
    pub min_height:  Option<f64>,
    pub center:      Option<bool>,
    pub resizable:   Option<bool>,
    pub decorations: Option<bool>,
    pub always_on_top: Option<bool>,
}

pub fn open_window(app: &AppHandle, opts: OpenWindowOptions) -> AppResult<String> {
    // If the window already exists, just focus it.
    if let Some(existing) = app.get_webview_window(&opts.label) {
        existing.show().ok();
        existing.set_focus().ok();
        return Ok(opts.label);
    }

    let url = WebviewUrl::App(opts.url.into());

    let mut builder = WebviewWindowBuilder::new(app, &opts.label, url)
        .title(&opts.title)
        .resizable(opts.resizable.unwrap_or(true))
        .decorations(opts.decorations.unwrap_or(false))
        .always_on_top(opts.always_on_top.unwrap_or(false));

    if let (Some(w), Some(h)) = (opts.width, opts.height) {
        builder = builder.inner_size(w, h);
    }
    if let (Some(mw), Some(mh)) = (opts.min_width, opts.min_height) {
        builder = builder.min_inner_size(mw, mh);
    }
    if opts.center.unwrap_or(true) {
        builder = builder.center();
    }

    builder
        .build()
        .map_err(|e| AppError::Internal(e.to_string()))?;

    Ok(opts.label)
}

pub fn list_windows(app: &AppHandle) -> Vec<String> {
    app.webview_windows()
        .keys()
        .cloned()
        .collect()
}
