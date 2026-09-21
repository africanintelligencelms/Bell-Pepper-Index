import { Router } from 'express';
import { asyncHandler, notFound } from '../http.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import { store } from '../store/index.js';
import { parseOfftaker } from '../validation.js';

export const offtakersRouter = Router();

offtakersRouter.get(
  '/offtakers',
  asyncHandler(async (_req, res) => {
    const data = await store.listOfftakers();
    res.json({ success: true, data, count: data.length });
  }),
);

/**
 * Open: a farmer who finds a buyer should be able to share the contact while
 * the WhatsApp conversation is still live. The submission lands unverified —
 * `parseOfftaker` ignores any verified flag in the body.
 */
offtakersRouter.post(
  '/offtakers',
  asyncHandler(async (req, res) => {
    const offtaker = parseOfftaker(req.body);
    const saved = await store.insertOfftaker(offtaker);
    res.status(201).json({ success: true, data: saved });
  }),
);

offtakersRouter.put(
  '/offtakers/:id/verify',
  requireAdmin,
  asyncHandler(async (req, res) => {
    // Un-verifying matters as much as verifying: a buyer who stops paying has
    // to be demotable without deleting the record and losing the history.
    const verified = req.body?.verified === undefined ? true : Boolean(req.body.verified);
    const updated = await store.setOfftakerVerified(req.params.id, verified);

    if (!updated) {
      notFound(res, 'Offtaker not found');
      return;
    }

    res.json({ success: true, data: updated });
  }),
);

offtakersRouter.delete(
  '/offtakers/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const deleted = await store.deleteOfftaker(req.params.id);
    if (!deleted) {
      notFound(res, 'Offtaker not found');
      return;
    }
    res.json({ success: true, message: 'Offtaker removed' });
  }),
);
