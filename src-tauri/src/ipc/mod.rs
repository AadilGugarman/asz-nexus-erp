// ipc/mod.rs
// Shared IPC response types used by all command handlers.
//
// Every command returns IpcResponse<T> so the frontend always receives
// a consistent envelope: { success, data?, error? }
//
// The TypeScript counterpart is src/ipc/types.ts.

pub mod response;

pub use response::IpcResponse;
