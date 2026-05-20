# ADR 0002: Local SQLite Persistence with Drizzle ORM

Date: 2026-05-21
Status: Accepted

## Context

The ERP requires durable local transactional data for suppliers, customers, arrivals, invoices, payments, and settings. Type safety and migration discipline are required to keep delivery predictable.

## Decision

Use SQLite as primary local datastore with Drizzle ORM and Drizzle Kit:

- Type-safe schema definitions in TypeScript
- Managed migrations for schema evolution
- Runtime execution through Tauri SQL plugin bridge

## Consequences

Positive:

- Lightweight and robust local database engine
- Type-safe data model and compile-time confidence
- Repeatable migration workflow

Trade-offs:

- Requires discipline around schema migration compatibility
- Requires careful testing around backup/restore and migration edges
- Some SQL edge cases still require defensive hardening

## Alternatives Considered

1. JSON file-based storage
- Rejected for transactional integrity and query limitations.

2. IndexedDB only
- Rejected for desktop portability and operational complexity across boundaries.

3. Remote-first database
- Rejected for offline resilience requirements.

## Rollout Plan

- Keep schema definitions centralized.
- Run migration checks on every release candidate.
- Include backup/restore validation in pre-release gates.

## Rollback Plan

- On migration issue, stop rollout and distribute prior installer.
- Restore from pre-upgrade backup where needed.
- Ship corrective migration patch with explicit compatibility checks.
