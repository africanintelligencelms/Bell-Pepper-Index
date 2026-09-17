import { Router } from 'express';
import { asyncHandler, notFound } from '../http.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import { store } from '../store/index.js';
import { parsePriceRecord, parsePriceRecordBatch } from '../validation.js';

export const pricesRouter = Router();

pricesRouter.get(
  '/prices',
  asyncHandler(async (req, res) => {
    const limit = req.query.limit === undefined ? undefined : Number(req.query.limit);
    const offset = req.query.offset === undefined ? undefined : Number(req.query.offset);

    const data = await store.listPriceRecords(
      Number.isFinite(limit) ? limit : undefined,
      Number.isFinite(offset) ? offset : undefined,
    );

    res.json({ success: true, data, count: data.length, persistent: store.isPersistent() });
  }),
);

// Open on purpose: any farmer in the WhatsApp group can contribute a quote.
pricesRouter.post(
  '/prices',
  asyncHandler(async (req, res) => {
    const record = parsePriceRecord(req.body, { source: 'manual_entry' });
    const [saved] = await store.insertPriceRecords([record]);
    res.status(201).json({ success: true, data: saved ?? record });
  }),
);

pricesRouter.post(
  '/prices/bulk',
  asyncHandler(async (req, res) => {
    const records = parsePriceRecordBatch(req.body?.records, {
      source: 'whatsapp_extracted',
      farmerName: 'WhatsApp Contributor',
      location: 'Nigeria',
    });
    const saved = await store.insertPriceRecords(records);
    res.status(201).json({ success: true, data: saved, count: saved.length });
  }),
);

pricesRouter.delete(
  '/prices/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const deleted = await store.deletePriceRecord(req.params.id);
    if (!deleted) {
      notFound(res, 'Price record not found');
      return;
    }
    res.json({ success: true, message: 'Record deleted successfully' });
  }),
);

pricesRouter.post(
  '/prices/reset',
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const data = await store.resetPriceRecords();
    res.json({ success: true, data, count: data.length });
  }),
);
