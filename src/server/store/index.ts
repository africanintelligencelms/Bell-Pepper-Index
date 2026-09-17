import { CostBreakdownItem, PriceRecord, UnifiedPriceBand } from '../../types';
import { isDatabaseConfigured } from '../db/client';
import { ensureSchema, resetToSeed } from '../db/migrate';
import * as priceRepo from '../repositories/priceRecords';
import * as configRepo from '../repositories/marketConfig';
import { memoryStore } from './memoryStore';

/**
 * Single seam between the routes and whichever backend is live. Routes never
 * branch on storage: they call the store, and the store decides.
 */

export function isPersistent(): boolean {
  return isDatabaseConfigured();
}

export function storeKind(): 'postgres' | 'memory' {
  return isPersistent() ? 'postgres' : 'memory';
}

/** Postgres paths must run the migration first; the memory store has no schema. */
async function ready(): Promise<boolean> {
  if (!isPersistent()) return false;
  await ensureSchema();
  return true;
}

export const store = {
  isPersistent,
  storeKind,

  async listPriceRecords(limit?: number, offset?: number): Promise<PriceRecord[]> {
    if (await ready()) return priceRepo.listPriceRecords({ limit, offset });
    return memoryStore.listPriceRecords(limit, offset);
  },

  async countPriceRecords(): Promise<number> {
    if (await ready()) return priceRepo.countPriceRecords();
    return memoryStore.countPriceRecords();
  },

  async insertPriceRecords(records: PriceRecord[]): Promise<PriceRecord[]> {
    if (await ready()) return priceRepo.insertPriceRecords(records);
    return memoryStore.insertPriceRecords(records);
  },

  async deletePriceRecord(id: string): Promise<boolean> {
    if (await ready()) return priceRepo.deletePriceRecord(id);
    return memoryStore.deletePriceRecord(id);
  },

  async resetPriceRecords(): Promise<PriceRecord[]> {
    if (await ready()) {
      await resetToSeed();
      return priceRepo.listPriceRecords({});
    }
    await memoryStore.resetPriceRecords();
    return memoryStore.listPriceRecords();
  },

  async listPriceBands(): Promise<UnifiedPriceBand[]> {
    if (await ready()) return configRepo.listPriceBands();
    return memoryStore.listPriceBands();
  },

  async upsertPriceBand(band: UnifiedPriceBand): Promise<UnifiedPriceBand> {
    if (await ready()) return configRepo.upsertPriceBand(band);
    return memoryStore.upsertPriceBand(band);
  },

  async deletePriceBand(hub: string): Promise<boolean> {
    if (await ready()) return configRepo.deletePriceBand(hub);
    return memoryStore.deletePriceBand(hub);
  },

  async listCopItems(): Promise<CostBreakdownItem[]> {
    if (await ready()) return configRepo.listCopItems();
    return memoryStore.listCopItems();
  },

  async upsertCopItem(item: CostBreakdownItem): Promise<CostBreakdownItem> {
    if (await ready()) return configRepo.upsertCopItem(item);
    return memoryStore.upsertCopItem(item);
  },

  async deleteCopItem(id: string): Promise<boolean> {
    if (await ready()) return configRepo.deleteCopItem(id);
    return memoryStore.deleteCopItem(id);
  },
};
