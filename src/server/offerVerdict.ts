import { OfferVerdict, PepperType, VerdictLevel } from '../types.js';
import { MarketRate } from './marketRate.js';

/**
 * Judging a buyer's offer, and handing the farmer something to say back.
 *
 * Why this exists at all: the app used to ask a farmer to log a price *after*
 * the sale, at the one moment they had nothing left to gain from it. The moment
 * they need help is while a buyer is standing in the greenhouse. So the offer is
 * the front door — the verdict is the service, and the record of the offer is a
 * byproduct of having been useful rather than a favour requested up front.
 *
 * It also captures the thing the index most needs and was throwing away: the
 * distribution of what buyers actually open with. That is the direct evidence of
 * the lowballing tactic the whole project exists to name.
 *
 * This module is deliberately pure. Every surface that judges an offer — the web
 * UI today, a WhatsApp reply later — must reach the same verdict, so the rule
 * lives in one place and is computed on the server. It never derives a rate: it
 * takes the one `/api/market-rate` already published.
 */

/**
 * How far from the published median still counts as "about the going rate".
 *
 * Ten per cent is wide on purpose. Peppers vary by grade, load size and the day
 * of the week, and a farmer who is told a fair offer is 3% light will stop
 * believing the app the first time they check a good one.
 */
export const MARKET_TOLERANCE = 0.1;

/** Naira, grouped, no decimals. Hand-rolled so output is locale-independent. */
export function ngn(value: number): string {
  const rounded = Math.round(value);
  const sign = rounded < 0 ? '-' : '';
  const digits = Math.abs(rounded)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}₦${digits}`;
}

/** Signed percentage difference, to one decimal place. */
function differencePct(value: number, reference: number): number | null {
  if (!Number.isFinite(reference) || reference <= 0) return null;
  return Math.round(((value - reference) / reference) * 1000) / 10;
}

function varietyLabel(type: PepperType): string {
  return type === 'green' ? 'green' : 'coloured';
}

/** What stands behind the comparison, in the farmer's terms. */
function provenance(rate: MarketRate): string {
  if (!rate.sufficient) {
    return `Only ${rate.sampleSize} recent greenhouse sale(s) are logged, so this is compared against the association's agreed target rather than what members actually got.`;
  }
  const sales = rate.sampleSize === 1 ? 'sale' : 'sales';
  return `Compared against the median of ${rate.sampleSize} greenhouse ${sales} logged in the last ${rate.windowDays} days.`;
}

export interface AssessOfferInput {
  type: PepperType;
  offerPerKg: number;
  quantityKg: number;
  /** The rate `/api/market-rate` published for this variety and hub. */
  rate: MarketRate;
  /** Hub name, for copy the farmer can attribute. */
  hub: string | null;
}

/**
 * Classifies an offer and writes the farmer's side of the conversation.
 *
 * Order of precedence matters: below the agreed floor is the alarm case and
 * outranks everything else, because the floor is the number the group decided
 * to refuse below. Only above the floor does the published median decide
 * whether an offer is strong or weak.
 */
export function assessOffer({ type, offerPerKg, quantityKg, rate, hub }: AssessOfferInput): OfferVerdict {
  const floor = rate.band ? rate.band.min : null;
  const target = rate.band ? rate.band.target : null;
  const variety = varietyLabel(type);
  const where = hub ? ` in ${hub}` : '';

  const vsFloorPct = floor !== null ? differencePct(offerPerKg, floor) : null;
  // Only compare against the median when there is a real one. A median of one
  // or two sales presented as "the market" is a number a farmer would quote at
  // a buyer, which is exactly the harm the minimum sample size exists to stop.
  const vsRatePct = rate.sufficient ? differencePct(offerPerKg, rate.pricePerKg) : null;

  const shortfallNgn =
    floor !== null ? Math.max(Math.round((floor - offerPerKg) * quantityKg), 0) : null;

  // What the farmer should be asking for: never below the agreed floor, and the
  // median when members are actually achieving more than the floor.
  const quotePerKg = Math.max(floor ?? 0, rate.sufficient ? rate.pricePerKg : target ?? 0);

  const reasoning: string[] = [];
  let level: VerdictLevel;
  let headline: string;

  if (floor !== null && offerPerKg < floor) {
    level = 'below_floor';
    headline =
      shortfallNgn && shortfallNgn > 0
        ? `${ngn(offerPerKg)}/kg is below the ${ngn(floor)}/kg floor${where}. Taking it costs you ${ngn(shortfallNgn)} on ${quantityKg}kg.`
        : `${ngn(offerPerKg)}/kg is below the ${ngn(floor)}/kg floor${where}.`;
    reasoning.push(`The floor for ${variety} peppers${where} is ${ngn(floor)}/kg. This offer is under it.`);
  } else if (rate.sufficient && vsRatePct !== null && vsRatePct < -MARKET_TOLERANCE * 100) {
    level = 'below_market';
    headline = `${ngn(offerPerKg)}/kg is ${Math.abs(vsRatePct)}% under what members actually got (${ngn(rate.pricePerKg)}/kg).`;
    reasoning.push(`It clears the ${floor !== null ? `${ngn(floor)}/kg ` : ''}floor, but members have been getting ${ngn(rate.pricePerKg)}/kg.`);
  } else if (rate.sufficient && vsRatePct !== null && vsRatePct > MARKET_TOLERANCE * 100) {
    level = 'above_market';
    headline = `${ngn(offerPerKg)}/kg is ${vsRatePct}% above the recent median (${ngn(rate.pricePerKg)}/kg). This is a strong offer.`;
    reasoning.push('This is above what members have recently been paid. Worth taking seriously.');
  } else if (rate.sufficient) {
    level = 'at_market';
    headline = `${ngn(offerPerKg)}/kg is about what members are getting (${ngn(rate.pricePerKg)}/kg).`;
    reasoning.push('This is in line with recent logged sales.');
  } else if (floor !== null) {
    // Above the floor, but no real median to compare against. Say exactly that
    // rather than implying the offer has been measured against the market.
    level = 'at_market';
    headline = `${ngn(offerPerKg)}/kg clears the ${ngn(floor)}/kg floor${where}, but there are not enough recent sales to say more.`;
    reasoning.push('Log your sale afterwards so the next member gets a real comparison.');
  } else {
    level = 'at_market';
    headline = `No floor is set${where} and there are not enough recent sales to compare. This offer cannot be judged yet.`;
    reasoning.push('Nothing is being claimed about this price, because nothing is known about it yet.');
  }

  reasoning.push(provenance(rate));
  reasoning.push(
    'Open-field pepper is a different crop — thinner walls, a few days of shelf life. An open-field price is not a greenhouse price.',
  );
  if (level === 'below_floor' || level === 'below_market') {
    reasoning.push(
      'Greenhouse peppers hold for 14-21 days. That shelf life is the reason nobody has to take the first offer.',
    );
  }

  return {
    level,
    vsRatePct,
    vsFloorPct,
    shortfallNgn,
    headline,
    buyerReply: buildBuyerReply({ type, offerPerKg, quantityKg, quotePerKg, rate, hub }),
    reasoning,
  };
}

/**
 * The message the farmer sends the buyer.
 *
 * It names the produce distinction and the shelf life, and never the buyer's
 * motives. This is going to a real person the farmer has to keep dealing with
 * next season — an accusation wins one negotiation and costs the relationship,
 * which is a trade the app has no right to make on their behalf.
 */
function buildBuyerReply(input: {
  type: PepperType;
  offerPerKg: number;
  quantityKg: number;
  quotePerKg: number;
  rate: MarketRate;
  hub: string | null;
}): string {
  const { offerPerKg, quantityKg, quotePerKg, rate, hub, type } = input;
  const variety = varietyLabel(type);
  const lines: string[] = [`Thank you for the offer of ${ngn(offerPerKg)}/kg.`];

  if (rate.band) {
    lines.push(
      `The agreed minimum for greenhouse ${variety} peppers${hub ? ` in ${hub}` : ''} is ${ngn(rate.band.min)}/kg.`,
    );
  }
  if (rate.sufficient) {
    const sales = rate.sampleSize === 1 ? 'sale' : 'sales';
    lines.push(
      `Members of our network have been selling at ${ngn(rate.pricePerKg)}/kg (median of ${rate.sampleSize} greenhouse ${sales} in the last ${rate.windowDays} days).`,
    );
  }

  lines.push(
    'These are greenhouse peppers — thicker walls, and they hold for 14-21 days, so I am able to wait for the right price.',
  );

  if (quotePerKg > 0) {
    lines.push(
      `I can supply ${quantityKg}kg at ${ngn(quotePerKg)}/kg. Let me know if that works and I will hold it for you.`,
    );
  }

  return lines.join(' ');
}
