import { PepperType, UnifiedPriceBand } from '../types.js';

/**
 * The published "going rate".
 *
 * The rule this implements, and why each part of it exists:
 *
 * - **Greenhouse `actual_sale` records only.** A buyer's offer is what someone
 *   wants to pay, an asking price is what someone hopes to get; neither is a
 *   price anyone received. Blending them — and blending open-field produce,
 *   which is a different market — is how the index ends up publishing the very
 *   lowball figure it exists to argue against.
 * - **Median, not mean.** One mistyped price or one deliberately low entry
 *   moves a mean; it barely moves a median. With the small samples a community
 *   index actually has, that robustness matters more than precision.
 * - **A widening window.** Peppers are perishable and prices move weekly, so
 *   14 days is the honest default. Rather than go blank in a quiet week, the
 *   window widens to 30 then 90 — and the result always says which was used.
 * - **A minimum sample.** Below three sales the median is noise. Publishing
 *   noise with the same confidence as a real figure is worse than saying there
 *   is not enough data, because a farmer will quote it to a buyer.
 */

export const MIN_SAMPLE_SIZE = 3;
export const WINDOW_DAYS = [14, 30, 90] as const;

/** Widest window we ever query, so callers know how much history to fetch. */
export const MAX_WINDOW_DAYS = WINDOW_DAYS[WINDOW_DAYS.length - 1];

export interface RateSample {
  pricePerKg: number;
  /** 'YYYY-MM-DD'. ISO dates compare correctly as strings. */
  date: string;
}

export type RateBasis = 'community_median' | 'association_band';

export interface MarketRate {
  type: PepperType;
  /** The figure to publish, whatever its basis. */
  pricePerKg: number;
  basis: RateBasis;
  /** True only when a real median over enough sales is being published. */
  sufficient: boolean;
  sampleSize: number;
  /** The window actually used, or the widest one tried when data was thin. */
  windowDays: number;
  /**
   * Where most sales landed — the 25th to 75th percentile, not the raw
   * minimum and maximum. A single mistyped price would otherwise be published
   * as the top of the market, which is exactly the kind of number a buyer
   * quotes back at a farmer. Null when falling back to the band.
   */
  low: number | null;
  high: number | null;
  band: { min: number; target: number; max: number } | null;
  /** Whether the published figure sits inside the association's agreed band. */
  withinBand: boolean | null;
  /** Plain-language sentence the UI can show verbatim. */
  note: string;
}

/**
 * Nearest-rank percentile. Chosen over interpolation deliberately: with the
 * handful of sales a community index has, interpolating towards an outlier
 * drags the reported range back towards the very value the median excluded.
 */
export function percentile(values: number[], fraction: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.max(1, Math.ceil(fraction * sorted.length));
  return Math.round(sorted[rank - 1]);
}

export function median(values: number[]): number {
  if (values.length === 0) throw new Error('median of an empty list');
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const value = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  return Math.round(value);
}

/** Inclusive lower bound for a window, as 'YYYY-MM-DD'. */
export function windowStart(days: number, today: Date = new Date()): string {
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - days);
  return start.toISOString().split('T')[0];
}

function describe(windowDays: number, sampleSize: number): string {
  const sales = sampleSize === 1 ? 'sale' : 'sales';
  return `Median of ${sampleSize} greenhouse ${sales} in the last ${windowDays} days.`;
}

/**
 * Picks the narrowest window that clears the minimum sample size, falling back
 * to the association's agreed target when none of them do.
 *
 * `samples` must already be filtered to one variety, greenhouse production and
 * actual sales; this function only applies the window, the median and the
 * threshold.
 */
export function resolveMarketRate(
  type: PepperType,
  samples: RateSample[],
  band: UnifiedPriceBand | null,
  today: Date = new Date(),
): MarketRate {
  const bandFor = band
    ? type === 'green'
      ? { min: band.greenMin, target: band.greenTarget, max: band.greenMax }
      : { min: band.colouredMin, target: band.colouredTarget, max: band.colouredMax }
    : null;

  let widest: RateSample[] = [];

  for (const days of WINDOW_DAYS) {
    const since = windowStart(days, today);
    const inWindow = samples.filter((s) => s.date >= since);
    widest = inWindow;

    if (inWindow.length >= MIN_SAMPLE_SIZE) {
      const prices = inWindow.map((s) => s.pricePerKg);
      const value = median(prices);
      return {
        type,
        pricePerKg: value,
        basis: 'community_median',
        sufficient: true,
        sampleSize: inWindow.length,
        windowDays: days,
        low: percentile(prices, 0.25),
        high: percentile(prices, 0.75),
        band: bandFor,
        withinBand: bandFor ? value >= bandFor.min && value <= bandFor.max : null,
        note: describe(days, inWindow.length),
      };
    }
  }

  // Not enough real sales anywhere in 90 days. Say so rather than publishing a
  // median of one or two records that a farmer might quote to a buyer.
  const counted = widest.length;
  return {
    type,
    pricePerKg: bandFor ? bandFor.target : 0,
    basis: 'association_band',
    sufficient: false,
    sampleSize: counted,
    windowDays: MAX_WINDOW_DAYS,
    low: null,
    high: null,
    band: bandFor,
    withinBand: null,
    note: bandFor
      ? `Not enough recent sales (${counted} in ${MAX_WINDOW_DAYS} days). Showing the association's agreed target — log your sale to improve it.`
      : `Not enough recent sales (${counted} in ${MAX_WINDOW_DAYS} days) and no agreed band is configured.`,
  };
}

/**
 * Resolves whatever the client knows about where a farmer sells — an exact hub
 * name, or the looser location label the logger offers — to one of the
 * association's bands.
 *
 * This mapping lives on the server so there is one definition of it. The
 * difference is not cosmetic: Lagos carries ₦450/kg of freight over Jos, so a
 * Lagos farmer shown the Jos floor is being told to undercut by exactly the
 * haulage they are paying.
 */
export function resolveHub<T extends { hub: string }>(
  bands: T[],
  requested: string | null | undefined,
): T | null {
  if (bands.length === 0) return null;
  if (!requested) return bands[0];

  const needle = requested.trim().toLowerCase();
  if (!needle) return bands[0];

  const exact = bands.find((b) => b.hub.toLowerCase() === needle);
  if (exact) return exact;

  // 'Lagos (Mile 12)' from the form should find 'Lagos (Mile 12 / Retail /
  // Hotels)' in the bands, so match on the town name both sides share.
  const TOWNS = ['jos', 'abuja', 'lagos', 'kano'];
  const town = TOWNS.find((t) => needle.includes(t));
  if (town) {
    const byTown = bands.find((b) => b.hub.toLowerCase().includes(town));
    if (byTown) return byTown;
  }

  // 'Other', or somewhere we do not have a band for: the farmgate floor is the
  // safest answer, since it is the lowest and carries no freight assumption.
  return bands[0];
}
