/**
 * What a farmer has to give before the app asks anything of them.
 *
 * The rule used to be: three sales logged before the analytical tools open. The
 * reasoning was sound — the index is only as good as what members log, an
 * approval queue would mean farmers waiting on an administrator, and the thing
 * the app needs should be the thing that unlocks it. But as built it asked first
 * and delivered second, which is the wrong way round at every stage and
 * especially at the start:
 *
 * - It gated the tools that make the case for the app, from a farmer who had not
 *   yet been helped by it once. Nobody logs three sales for a website that has
 *   done nothing for them.
 * - It counted for ever, so a member who logged three sales last season and
 *   nothing since kept full access, while the index they were reading went stale.
 * - It punished anyone who changed phone or cleared their browser, which in
 *   practice means it deterred the compliant and not the lurkers it was aimed at.
 *
 * So the ask now comes *after* value, twice over:
 *
 * 1. **Offer checks are free, then reciprocal.** The first three are given away
 *    with nothing asked. From the fourth, one logged sale is needed — by which
 *    point the app has demonstrably been useful three times.
 * 2. **The tools open on contribution and stay open on freshness.** Three sales
 *    opens them; a sale in the last five weeks keeps them. "Log one to keep your
 *    tools" asks for what the index actually needs, which a lifetime count never
 *    did.
 *
 * This is still a nudge and not a security boundary. The counts live in this
 * device's localStorage, they can be cleared or edited by anyone who cares to,
 * and every gated tool reads data the API already serves publicly. A real
 * restriction would need accounts, which would cost far more members than the
 * lurking it would prevent.
 */

const STORAGE_KEY = 'pepper_index_sales_logged';
const LAST_SALE_KEY = 'pepper_index_last_sale_at';
const CHECKS_KEY = 'pepper_index_offer_checks';

/** Sales that open the analytical tools. */
export const UNLOCK_THRESHOLD = 3;

/** Offer checks given away before a sale is asked for. */
export const FREE_OFFER_CHECKS = 3;

/**
 * How recent a sale has to be for the tools to stay open.
 *
 * Five weeks is deliberately loose. A greenhouse cycle does not produce a sale
 * every fortnight, and locking a real contributor out mid-season would be the
 * app punishing exactly the person holding it up. It is long enough that only
 * someone who has genuinely stopped contributing sees it.
 */
export const FRESHNESS_DAYS = 35;

/** localStorage throws rather than returning null in some private modes. */
function readNumber(key: string): number {
  try {
    const parsed = Number(localStorage.getItem(key));
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
  } catch {
    return 0;
  }
}

function writeValue(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Non-fatal: whatever this was counting, the submission still counted where
    // it matters, which is the server.
  }
}

export function getContributionCount(): number {
  return readNumber(STORAGE_KEY);
}

export function getOfferCheckCount(): number {
  return readNumber(CHECKS_KEY);
}

/** Called only after the server confirms the write, never on an attempt. */
export function recordContribution(): number {
  const next = getContributionCount() + 1;
  writeValue(STORAGE_KEY, String(next));
  writeValue(LAST_SALE_KEY, new Date().toISOString());
  return next;
}

/** Called after a verdict is actually shown, not when the form is opened. */
export function recordOfferCheck(): number {
  const next = getOfferCheckCount() + 1;
  writeValue(CHECKS_KEY, String(next));
  return next;
}

export function getLastSaleAt(): Date | null {
  try {
    const raw = localStorage.getItem(LAST_SALE_KEY);
    if (!raw) return null;
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  } catch {
    return null;
  }
}

export function daysSinceLastSale(): number | null {
  const last = getLastSaleAt();
  if (!last) return null;
  return Math.floor((Date.now() - last.getTime()) / 86_400_000);
}

/**
 * Whether this device has contributed recently enough to keep its tools.
 *
 * A member who logged sales before this was tracked has no timestamp, and is
 * treated as fresh: the freshness rule is for people who have stopped
 * contributing, not for people who contributed before the app was counting.
 */
export function isContributionFresh(): boolean {
  const days = daysSinceLastSale();
  if (days === null) return true;
  return days <= FRESHNESS_DAYS;
}

export function hasUnlockedTools(count: number = getContributionCount()): boolean {
  return count >= UNLOCK_THRESHOLD && isContributionFresh();
}

/** True when the tools were earned and have since gone stale. */
export function toolsWentStale(count: number = getContributionCount()): boolean {
  return count >= UNLOCK_THRESHOLD && !isContributionFresh();
}

/** How many more sales are needed to open the tools, for the progress copy. */
export function salesRemaining(count: number = getContributionCount()): number {
  return Math.max(UNLOCK_THRESHOLD - count, 0);
}

/**
 * Free offer checks left, or null when there is no cap.
 *
 * One logged sale removes the cap entirely. The point is reciprocity, not a
 * quota: a farmer who contributes gets the offer checker unconditionally.
 */
export function freeChecksRemaining(): number | null {
  if (getContributionCount() > 0) return null;
  return Math.max(FREE_OFFER_CHECKS - getOfferCheckCount(), 0);
}

/** True when the next check needs a logged sale first. */
export function needsSaleBeforeChecking(): boolean {
  return freeChecksRemaining() === 0;
}
