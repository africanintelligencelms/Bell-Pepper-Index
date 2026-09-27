import { Router } from 'express';
import { asyncHandler } from '../http.js';
import { MAX_WINDOW_DAYS, resolveHub, resolveMarketRate, windowStart } from '../marketRate.js';
import { OFFER_CHECK_LIMIT, rateLimit } from '../middleware/rateLimit.js';
import { assessOffer } from '../offerVerdict.js';
import { store } from '../store/index.js';
import { parseOfferCheck, todayIso } from '../validation.js';

export const offerCheckRouter = Router();

/**
 * Judge a buyer's offer.
 *
 * **This endpoint writes no price record on purpose.** If every check created a
 * `buyer_offer`, the index would fill with hypotheticals, idle curiosity and
 * typos — and those would then feed the median farmers quote at buyers. The
 * record is written separately, by POST /api/prices with an `outcome`, when the
 * farmer says what actually happened. That tap is both an explicit confirmation
 * that a real buyer really offered this, and the more valuable datum.
 *
 * It computes no rate of its own: it asks for the same figure /api/market-rate
 * publishes and hands it to `assessOffer`, so the verdict a farmer sees can
 * never disagree with the headline number.
 */
offerCheckRouter.post(
  '/check-offer',
  rateLimit('check-offer', OFFER_CHECK_LIMIT),
  asyncHandler(async (req, res) => {
    const request = parseOfferCheck(req.body);

    const bands = await store.listPriceBands();
    const band = resolveHub(bands, request.location);
    const samples = await store.listRateSamples(request.type, windowStart(MAX_WINDOW_DAYS));
    const rate = resolveMarketRate(request.type, samples, band, new Date());

    const verdict = assessOffer({
      type: request.type,
      offerPerKg: request.offerPerKg,
      quantityKg: request.quantityKg,
      rate,
      hub: band?.hub ?? null,
    });

    // Fire and forget: the store swallows a counter failure rather than
    // denying the farmer the answer they came for.
    await store.recordOfferCheck({
      type: request.type,
      offerPerKg: request.offerPerKg,
      hub: band?.hub ?? '',
      verdict: verdict.level,
      checkedOn: todayIso(),
    });

    res.json({
      success: true,
      data: {
        hub: band?.hub ?? null,
        verdict,
        rate,
        generatedAt: new Date().toISOString(),
      },
    });
  }),
);

/**
 * Two numbers for the group message: how often the app was consulted, and how
 * many low offers members turned down.
 *
 * The refusal count is the app's best content and did not exist before — a
 * refused lowball used to leave no trace anywhere, so the group could never see
 * that holding the line actually happens. It is counted against each record's
 * own hub floor, since the same ₦2,200 is above the floor in Jos and below it in
 * Lagos.
 */
offerCheckRouter.get(
  '/offer-checks/summary',
  asyncHandler(async (_req, res) => {
    const since = windowStart(7);
    const [checksLast7Days, refused, bands] = await Promise.all([
      store.countChecksSince(since),
      store.listRefusedOffers(since),
      store.listPriceBands(),
    ]);

    const refusedLast7Days = refused.filter((offer) => {
      const band = resolveHub(bands, offer.location);
      if (!band) return false;
      const floor = offer.type === 'green' ? band.greenMin : band.colouredMin;
      return offer.pricePerKg < floor;
    }).length;

    res.json({
      success: true,
      data: { checksLast7Days, refusedLast7Days },
    });
  }),
);
