/**
 * db/index.ts
 * Public API for the entire DB layer.
 *
 * Import from here — never from sub-files directly.
 *
 *   import { getDb, SupplierRepository, dbService } from '@/db';
 */

// ── Client ────────────────────────────────────────────────────────────────────
export * from './client';

// ── Schema (split by domain) ──────────────────────────────────────────────────
export * from './schema/index';

// ── Repositories ──────────────────────────────────────────────────────────────
export * from './repositories/index';

// ── Service singleton ─────────────────────────────────────────────────────────
export * from './services/db.service';

// ── Query helpers ─────────────────────────────────────────────────────────────
export * from './queries/index';
