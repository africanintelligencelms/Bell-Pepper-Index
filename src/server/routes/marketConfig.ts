import { Router } from 'express';
import { asyncHandler, notFound } from '../http';
import { requireAdmin } from '../middleware/adminAuth';
import { store } from '../store';
import { parseCopItem, parsePriceBand } from '../validation';

export const marketConfigRouter = Router();

// Reads are public — the whole point of the band is that every farmer can see
// the agreed floor before a buyer calls. Writes are the association's.

marketConfigRouter.get(
  '/price-bands',
  asyncHandler(async (_req, res) => {
    const data = await store.listPriceBands();
    res.json({ success: true, data, count: data.length });
  }),
);

marketConfigRouter.put(
  '/price-bands',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const band = parsePriceBand(req.body);
    const saved = await store.upsertPriceBand(band);
    res.json({ success: true, data: saved });
  }),
);

marketConfigRouter.delete(
  '/price-bands/:hub',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const deleted = await store.deletePriceBand(req.params.hub);
    if (!deleted) {
      notFound(res, 'Price band not found');
      return;
    }
    res.json({ success: true, message: 'Price band deleted' });
  }),
);

marketConfigRouter.get(
  '/cop-items',
  asyncHandler(async (_req, res) => {
    const data = await store.listCopItems();
    res.json({ success: true, data, count: data.length });
  }),
);

marketConfigRouter.put(
  '/cop-items',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const item = parseCopItem(req.body);
    const saved = await store.upsertCopItem(item);
    res.json({ success: true, data: saved });
  }),
);

marketConfigRouter.delete(
  '/cop-items/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const deleted = await store.deleteCopItem(req.params.id);
    if (!deleted) {
      notFound(res, 'Cost item not found');
      return;
    }
    res.json({ success: true, message: 'Cost item deleted' });
  }),
);
