import { CostBreakdownItem, OfftakerContact, PriceRecord, UnifiedPriceBand } from '../../types.js';
import { INITIAL_PRICE_RECORDS } from '../../data/seedPrices.js';
import { DEFAULT_PRICE_BANDS, INITIAL_COP_BREAKDOWN, VERIFIED_OFFTAKERS } from '../../data/marketCommunityData.js';

/**
 * Non-persistent fallback used when DATABASE_URL is absent, so a contributor
 * can clone the repo and run the app without provisioning Postgres first.
 * Data lives for the lifetime of the process only — on a serverless host that
 * can be a single request, which is why /api/health reports which store is live.
 */

let priceRecords: PriceRecord[] = [...INITIAL_PRICE_RECORDS];
let priceBands: UnifiedPriceBand[] = DEFAULT_PRICE_BANDS.map((band) => ({ ...band }));
let copItems: CostBreakdownItem[] = INITIAL_COP_BREAKDOWN.map((item) => ({ ...item }));
let offtakers: OfftakerContact[] = VERIFIED_OFFTAKERS.map((o) => ({ ...o }));

/** Per-process counters. Only meaningful for a single long-lived dev server. */
const rateLimitHits = new Map<string, number>();

export const memoryStore = {
  async listPriceRecords(limit = 500, offset = 0): Promise<PriceRecord[]> {
    return priceRecords.slice(offset, offset + limit);
  },

  async countPriceRecords(): Promise<number> {
    return priceRecords.length;
  },

  async insertPriceRecords(records: PriceRecord[]): Promise<PriceRecord[]> {
    const existing = new Set(priceRecords.map((r) => r.id));
    const fresh = records.filter((r) => !existing.has(r.id));
    priceRecords = [...fresh, ...priceRecords];
    return fresh;
  },

  async deletePriceRecord(id: string): Promise<boolean> {
    const before = priceRecords.length;
    priceRecords = priceRecords.filter((r) => r.id !== id);
    return priceRecords.length < before;
  },

  async resetPriceRecords(): Promise<void> {
    priceRecords = [...INITIAL_PRICE_RECORDS];
  },

  async listPriceBands(): Promise<UnifiedPriceBand[]> {
    return priceBands.map((band) => ({ ...band }));
  },

  async upsertPriceBand(band: UnifiedPriceBand): Promise<UnifiedPriceBand> {
    const index = priceBands.findIndex((b) => b.hub === band.hub);
    if (index >= 0) priceBands[index] = { ...band };
    else priceBands.push({ ...band });
    return { ...band };
  },

  async deletePriceBand(hub: string): Promise<boolean> {
    const before = priceBands.length;
    priceBands = priceBands.filter((b) => b.hub !== hub);
    return priceBands.length < before;
  },

  async listCopItems(): Promise<CostBreakdownItem[]> {
    return copItems.map((item) => ({ ...item }));
  },

  async upsertCopItem(item: CostBreakdownItem): Promise<CostBreakdownItem> {
    const index = copItems.findIndex((c) => c.id === item.id);
    if (index >= 0) copItems[index] = { ...item };
    else copItems.push({ ...item });
    return { ...item };
  },

  async deleteCopItem(id: string): Promise<boolean> {
    const before = copItems.length;
    copItems = copItems.filter((c) => c.id !== id);
    return copItems.length < before;
  },

  async listOfftakers(): Promise<OfftakerContact[]> {
    return [...offtakers]
      .sort((a, b) => Number(b.verifiedByCommunity) - Number(a.verifiedByCommunity))
      .map((o) => ({ ...o }));
  },

  async insertOfftaker(offtaker: OfftakerContact): Promise<OfftakerContact> {
    offtakers = [{ ...offtaker }, ...offtakers];
    return { ...offtaker };
  },

  async setOfftakerVerified(id: string, verified: boolean): Promise<OfftakerContact | null> {
    const index = offtakers.findIndex((o) => o.id === id);
    if (index < 0) return null;
    offtakers[index] = { ...offtakers[index], verifiedByCommunity: verified };
    return { ...offtakers[index] };
  },

  async deleteOfftaker(id: string): Promise<boolean> {
    const before = offtakers.length;
    offtakers = offtakers.filter((o) => o.id !== id);
    return offtakers.length < before;
  },

  async consumeRateLimit(bucketKey: string, limit: number, windowMs: number) {
    const windowStart = Math.floor(Date.now() / windowMs) * windowMs;
    const key = `${bucketKey}:${windowStart}`;
    const hits = (rateLimitHits.get(key) ?? 0) + 1;
    rateLimitHits.set(key, hits);

    // Without a scheduler, drop keys from windows that have already closed.
    for (const existing of rateLimitHits.keys()) {
      const start = Number(existing.slice(existing.lastIndexOf(':') + 1));
      if (start < windowStart - windowMs * 2) rateLimitHits.delete(existing);
    }

    return {
      allowed: hits <= limit,
      remaining: Math.max(limit - hits, 0),
      resetAt: windowStart + windowMs,
      limit,
    };
  },
};
