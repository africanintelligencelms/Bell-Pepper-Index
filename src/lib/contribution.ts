/**
 * Advanced tools are earned by contributing, not requested and waited for.
 *
 * The index is only as good as the sales logged into it, and a farmer who only
 * reads takes value out without putting any in. Gating the analytical tools
 * behind three logged sales turns that around: the thing the app most needs is
 * the thing that unlocks it. It also avoids an approval queue — nobody waits on
 * an administrator, and nobody has to work through a list.
 *
 * The count lives in this device's localStorage. That is deliberately weak: it
 * can be cleared or bypassed by anyone who wants to. It is a nudge towards
 * contributing, not a security boundary, and nothing behind it is sensitive —
 * every gated tool reads data the API already serves publicly. A real
 * restriction would need accounts, which would cost far more friction than the
 * lurking it would prevent.
 */

const STORAGE_KEY = 'pepper_index_sales_logged';

export const UNLOCK_THRESHOLD = 3;

export function getContributionCount(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
  } catch {
    // Private browsing can throw rather than return null.
    return 0;
  }
}

/** Called only after the server confirms the write, never on an attempt. */
export function recordContribution(): number {
  const next = getContributionCount() + 1;
  try {
    localStorage.setItem(STORAGE_KEY, String(next));
  } catch {
    // Non-fatal: the farmer's submission still counted where it matters.
  }
  return next;
}

export function hasUnlockedTools(count: number = getContributionCount()): boolean {
  return count >= UNLOCK_THRESHOLD;
}

/** How many more sales are needed, for the progress copy. */
export function salesRemaining(count: number = getContributionCount()): number {
  return Math.max(UNLOCK_THRESHOLD - count, 0);
}
