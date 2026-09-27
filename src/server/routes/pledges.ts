import { Request, Router } from 'express';
import { PepperType } from '../../types.js';
import { asyncHandler } from '../http.js';
import { resolveHub } from '../marketRate.js';
import { PLEDGE_LIMIT, rateLimit } from '../middleware/rateLimit.js';
import { currentWeekStart, resolvePledgeFloor } from '../pledgeFloor.js';
import { store } from '../store/index.js';
import { parsePledge, ValidationError } from '../validation.js';

export const pledgesRouter = Router();

const VARIETIES: PepperType[] = ['green', 'coloured'];

/**
 * The device's pledge id.
 *
 * Deliberately opaque and generated client-side: a pledge needs to be
 * attributable to *someone* so one device cannot pledge five times, but asking a
 * farmer to create an account before they can say what they will refuse would
 * cost more members than the duplicate pledges it prevents.
 *
 * It is not a verified identity and the published floor says so. Phone identity
 * is the upgrade path, and the aggregation already separates counted from
 * uncounted pledges so it slots in without touching the rule.
 */
function pledgeKey(req: Request): string {
  const raw = req.header('x-pledge-key');
  if (typeof raw !== 'string') throw new ValidationError('x-pledge-key header is required');
  const trimmed = raw.trim();
  // Long enough not to collide, short enough not to be a payload.
  if (trimmed.length < 8 || trimmed.length > 100) {
    throw new ValidationError('x-pledge-key must be between 8 and 100 characters');
  }
  if (!/^[A-Za-z0-9_-]+$/.test(trimmed)) {
    throw new ValidationError('x-pledge-key must be alphanumeric, dash or underscore');
  }
  return trimmed;
}

async function summarise(hubRequest: string | null, key: string | null) {
  const bands = await store.listPriceBands();
  const band = resolveHub(bands, hubRequest);
  const weekStart = currentWeekStart();

  if (!band) {
    const empty = (type: PepperType) => resolvePledgeFloor('', type, [], 0, weekStart);
    return { hub: null, weekStart, green: empty('green'), coloured: empty('coloured'), mine: [] };
  }

  const floors = await Promise.all(
    VARIETIES.map(async (type) => {
      const pledges = await store.listPledgesForWeek(band.hub, type, weekStart);
      // Every pledge counts today, because none of them is verified yet and a
      // floor nobody can reach is worse than a self-reported one. When phone
      // identity lands, this is the line that changes: verified pledges become
      // `counted` and the rest become the uncounted tally.
      return resolvePledgeFloor(band.hub, type, pledges, 0, weekStart);
    }),
  );

  const mine = key ? await store.listPledgesByKey(key, band.hub, weekStart) : [];

  return { hub: band.hub, weekStart, green: floors[0], coloured: floors[1], mine };
}

pledgesRouter.get(
  '/pledges/summary',
  asyncHandler(async (req, res) => {
    const requested =
      (typeof req.query.hub === 'string' && req.query.hub) ||
      (typeof req.query.location === 'string' && req.query.location) ||
      null;

    // Reading the summary must work without a pledge key — a farmer who has
    // never pledged still needs to see how many others have.
    const raw = req.header('x-pledge-key');
    const key = typeof raw === 'string' && /^[A-Za-z0-9_-]{8,100}$/.test(raw.trim()) ? raw.trim() : null;

    res.json({ success: true, data: await summarise(requested, key) });
  }),
);

pledgesRouter.post(
  '/pledges',
  rateLimit('pledge', PLEDGE_LIMIT),
  asyncHandler(async (req, res) => {
    const key = pledgeKey(req);
    const request = parsePledge(req.body);

    const bands = await store.listPriceBands();
    const band = resolveHub(bands, request.location);
    if (!band) {
      throw new ValidationError('No price band is configured, so there is no hub to pledge for');
    }

    await store.upsertPledge({
      pledgeKey: key,
      hub: band.hub,
      type: request.type,
      minPerKg: request.minPerKg,
      weekStart: currentWeekStart(),
    });

    res.status(201).json({ success: true, data: await summarise(request.location, key) });
  }),
);
