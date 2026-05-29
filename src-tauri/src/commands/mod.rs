// commands/mod.rs
// Command module registry.
//
// Each sub-module owns one domain's commands.
// To add a new domain:
//   1. Create src/commands/your_domain.rs
//   2. Add `pub mod your_domain;` here
//   3. Add its handlers to the generate_handler![] list in lib.rs

pub mod app;
pub mod auth;
pub mod backup;
pub mod db;
pub mod file;
pub mod fs;
pub mod invoice;
pub mod payment;
pub mod system;
pub mod updater;
pub mod window;
pub mod company;
pub mod ledger;
pub mod item;

