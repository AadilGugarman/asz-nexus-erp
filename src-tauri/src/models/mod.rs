// models/mod.rs
// Domain model definitions.
//
// Each model file contains:
//   - The owned struct (what the app works with)
//   - A `from_row` constructor that maps a rusqlite::Row
//   - Serde derives so models can be returned directly in IpcResponse
//
// Add a new model:
//   1. Create src/models/your_entity.rs
//   2. Add `pub mod your_entity;` here

pub mod employee;
pub mod supplier;
pub mod customer;
pub mod invoice;
pub mod payment;
