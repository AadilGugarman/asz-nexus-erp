/**
 * db/repositories/settings.repository.ts
 * Key/value settings store backed by the app_settings table.
 *
 * Usage:
 *   const repo = new SettingsRepository(db);
 *   const company = await repo.get<CompanySettings>('company');
 *   await repo.set('company', { name: 'TFC', ... });
 */

import { eq } from 'drizzle-orm';
import { appSettings } from '../schema/settings';
import type { DrizzleDb } from '../client';

export class SettingsRepository {
  constructor(private readonly db: DrizzleDb) {}

  async get<T>(key: string): Promise<T | null> {
    const rows = await this.db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, key))
      .limit(1);

    if (!rows[0]) return null;

    try {
      return JSON.parse(rows[0].value) as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    const serialized = JSON.stringify(value);

    // Upsert — insert or replace on conflict
    await this.db
      .insert(appSettings)
      .values({ key, value: serialized })
      .onConflictDoUpdate({
        target: appSettings.key,
        set:    { value: serialized },
      });
  }

  async delete(key: string): Promise<void> {
    await this.db.delete(appSettings).where(eq(appSettings.key, key));
  }

  async getAll(): Promise<Record<string, unknown>> {
    const rows = await this.db.select().from(appSettings);
    return Object.fromEntries(
      rows.map((r) => {
        try { return [r.key, JSON.parse(r.value)]; }
        catch { return [r.key, r.value]; }
      }),
    );
  }
}
