import { Router } from 'express';
import { PepperType } from '../../types.js';
import { asyncHandler } from '../http.js';
import { MAX_WINDOW_DAYS, resolveHub, resolveMarketRate, windowStart } from '../marketRate.js';
import { store } from '../store/index.js';

export const marketRateRouter = Router();

const VARIETIES: PepperType[] = ['green', 'coloured'];

/**
 * The single source of truth for the headline rate.
 *
 * This used to be computed in the browser from the full record list, which
 * meant every phone downloaded the whole index to derive two numbers, and the
 * rule lived in a component where it could quietly diverge from the one the
 * association agreed. Serving it from here keeps one definition and sends two
 * numbers instead of a few hundred records — which matters on the mobile
 * connections these farmers actually use.
 */
marketRateRouter.get(
  '/market-rate',
  asyncHandler(async (req, res) => {
    const bands = await store.listPriceBands();

    // Accepts either an exact hub name or the looser location label the logger
    // offers ('Lagos (Mile 12)'), and falls back to the farmgate band — the
    // lowest, and the one that assumes no freight.
    const requested =
      (typeof req.query.hub === 'string' && req.query.hub) ||
      (typeof req.query.location === 'string' && req.query.location) ||
      null;
    const band = resolveHub(bands, requested);

    const since = windowStart(MAX_WINDOW_DAYS);

    const rates = await Promise.all(
      VARIETIES.map(async (type) => {
        const samples = await store.listRateSamples(type, since);
        return resolveMarketRate(type, samples, band, new Date());
      }),
    );

    res.json({
      success: true,
      data: {
        hub: band?.hub ?? null,
        green: rates[0],
        coloured: rates[1],
        generatedAt: new Date().toISOString(),
      },
    });
  }),
);
