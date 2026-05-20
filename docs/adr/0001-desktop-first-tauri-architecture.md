# ADR 0001: Desktop-first Architecture Using Tauri

Date: 2026-05-21
Status: Accepted

## Context

The product targets produce commission and ERP workflows where reliability, local operations, and low infrastructure dependency are priorities. The application must run in environments with intermittent connectivity and minimal IT support.

## Decision

Adopt a desktop-first architecture using Tauri:

- Frontend in React + TypeScript
- Native host and capability boundary in Rust via Tauri
- Local SQLite storage for core data

## Consequences

Positive:

- Local-first reliability and reduced dependency on continuous internet
- Strong native boundary for file and system operations
- Smaller runtime footprint than many desktop alternatives

Trade-offs:

- Requires Rust toolchain and desktop packaging pipeline
- More complex release/testing matrix than pure web app
- Desktop-specific update and support responsibilities

## Alternatives Considered

1. Pure web SPA + remote backend
- Rejected due to offline/latency and deployment constraints.

2. Electron-based desktop app
- Rejected due to larger memory/runtime overhead relative to Tauri model.

3. Native-only UI (no webview)
- Rejected due to slower UI iteration speed and higher UI development cost.

## Rollout Plan

- Keep desktop as primary deployment channel.
- Maintain webview-compatible frontend architecture.
- Keep native capability calls behind IPC facades.

## Rollback Plan

- If platform-level issue emerges, pin to prior stable Tauri/runtime version.
- Distribute previous stable installer while remediation is prepared.
