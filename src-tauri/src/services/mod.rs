// services/mod.rs
// Business logic layer — commands are thin; services own the logic.
//
// Pattern:
//   command handler  →  validates input  →  calls service  →  returns IpcResponse
//
// Services are plain Rust structs/functions — no Tauri dependency.
// This makes them unit-testable without spinning up a Tauri app.
//
// Add a new service:
//   1. Create src/services/your_domain.rs
//   2. Add `pub mod your_domain;` here

pub mod app;
pub mod file;
pub mod fs;
pub mod window;
