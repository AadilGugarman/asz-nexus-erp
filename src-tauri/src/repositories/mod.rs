// repositories/mod.rs
// Repository layer — all SQL lives here, never in commands or services.
//
// Pattern:
//   command  →  validates  →  calls repository  →  returns model
//
// Each repository takes a &Connection (not a pool) so the caller
// controls transaction boundaries. Commands borrow a connection from
// the pool and pass it down.
//
// Add a new repository:
//   1. Create src/repositories/your_entity.rs
//   2. Add `pub mod your_entity;` here

pub mod employee;
pub mod supplier;
pub mod customer;
pub mod invoice;
pub mod payment;
