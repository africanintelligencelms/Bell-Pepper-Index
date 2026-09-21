import { Router } from 'express';
import { PepperType } from '../../types.js';
import { asyncHandler } from '../http.js';
import { MAX_WINDOW_DAYS, resolveMarketRate, windowStart } from '../marketRate.js';
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

    // The farmgate band is the default because the simple logger is aimed at
    // farmers selling at the farm, not at buyers in a city market.
    const requestedHub = typeof req.query.hub === 'string' ? req.query.hub : null;
    const band = (requestedHub && bands.find((b) => b.hub === requestedHub)) || bands[0] || null;

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
