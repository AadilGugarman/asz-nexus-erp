// events/mod.rs
// Tauri event emission helpers.
//
// Use these instead of calling app_handle.emit() directly so all event
// names are centralised and typed.
//
// Frontend listens with:
//   import { listen } from '@tauri-apps/api/event';
//   await listen(EVENTS.APP_READY, (e) => console.log(e.payload));

// events/mod.rs
// Tauri event emission helpers.
// These are used when commands need to push data to the frontend.

pub mod emitter;

#[allow(unused_imports)]
pub use emitter::AppEmitter;

/// All event name constants — must match what the frontend listens for.
#[allow(dead_code)]
pub mod names {
    pub const APP_READY:       &str = "app://ready";
    pub const TASK_PROGRESS:   &str = "task://progress";
    pub const TASK_COMPLETE:   &str = "task://complete";
    pub const TASK_ERROR:      &str = "task://error";
    pub const DATA_CHANGED:    &str = "data://changed";
    pub const EXPORT_PROGRESS: &str = "export://progress";
}
