import { PepperType, PledgeFloor } from '../types.js';
import { percentile } from './marketRate.js';

/**
 * The floor members have pledged to, as distinct from the band an admin set.
 *
 * Why this exists: `price_bands` is admin-set and the UI used to call it "the
 * association's agreed floor". That sentence is only true if an association
 * actually agreed it. Set from an admin token by one member, it is one member's
 * opinion wearing the association's clothes — and the first time a respected
 * member asks "who agreed this?" in the group, the app's credibility is gone and
 * does not come back.
 *
 * A pledge is the honest version. Each member says what they will refuse this
 * week; the published figure is an aggregate of those declarations, carrying the
 * count of people behind it. Nobody has to approve it. It becomes true by being
 * used.
 *
 * ---
 *
 * **This is the opposite mechanism to deriving a floor from submissions, and the
 * difference is the entire point.** A floor computed from what buyers *paid*
 * follows the market down, which is precisely what a buyer pushing prices wants
 * — it stops being resistance. That is why `price_bands` is admin-set and must
 * stay so. A floor computed from what members commit to *refuse* moves the other
 * way. Both are "derived"; they are opposites. Do not unify them, and do not
 * "simplify" this into an average of recent sales.
 *
 * An admin-set band still wins wherever one exists. The pledge floor fills the
 * vacuum when no association decision exists, and is labelled as what it is.
 */

/**
 * Pledges needed before a floor is published.
 *
 * Same discipline as MIN_SAMPLE_SIZE in marketRate.ts: a floor backed by two
 * people is not a floor, and a farmer will quote it to a buyer regardless of how
 * carefully it is hedged. Below this the app says how many more are needed.
 */
export const MIN_PLEDGES = 5;

export interface PledgeInput {
  minPerKg: number;
}

/** Monday of the current week, UTC, as 'YYYY-MM-DD'. */
export function currentWeekStart(today: Date = new Date()): string {
  const date = new Date(today);
  // getUTCDay: 0 = Sunday. Shift so Monday is the first day of the week.
  const dayOffset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayOffset);
  return date.toISOString().split('T')[0];
}

/**
 * Aggregates one week of pledges for one hub and variety.
 *
 * `counted` are the pledges that may move the published figure; `uncountedCount`
 * are pledges that are recorded and shown as encouragement but excluded from it.
 * The split is the caller's decision so that adding verified phone identity
 * later changes one line in a route rather than this rule: today every pledge is
 * device-scoped and counted, and the note says the figure is self-reported.
 */
export function resolvePledgeFloor(
  hub: string,
  type: PepperType,
  counted: PledgeInput[],
  uncountedCount: number,
  weekStart: string,
): PledgeFloor {
  const countedPledges = counted.length;
  const pledgeCount = countedPledges + uncountedCount;

  if (countedPledges < MIN_PLEDGES) {
    const needed = MIN_PLEDGES - countedPledges;
    return {
      hub,
      type,
      floorPerKg: null,
      pledgeCount,
      countedPledges,
      holdingCount: 0,
      weekStart,
      sufficient: false,
      note:
        pledgeCount === 0
          ? `No pledges yet this week. ${MIN_PLEDGES} are needed before a member floor is published.`
          : `${pledgeCount} pledge${pledgeCount === 1 ? '' : 's'} so far this week — ${needed} more needed before a member floor is published.`,
    };
  }

  // The 25th percentile, not the minimum. One member who pledges low — whether
  // through pessimism or because a buyer got to them — must not drag down the
  // number the rest of the group is quoting. Reuses the same nearest-rank
  // helper as the published rate so the two behave identically on small samples.
  const prices = counted.map((p) => p.minPerKg);
  const floorPerKg = percentile(prices, 0.25);
  const holdingCount = prices.filter((price) => price >= floorPerKg).length;

  return {
    hub,
    type,
    floorPerKg,
    pledgeCount,
    countedPledges,
    holdingCount,
    weekStart,
    sufficient: true,
    // Naming the count is the whole mechanism. Refusing a low offer is a
    // coordination problem: a number alone is not a reason to hold, but knowing
    // how many others are holding is.
    note: `${holdingCount} of ${countedPledges} members pledged this or more for this hub this week. Self-reported by members, not an association decision.`,
  };
}
