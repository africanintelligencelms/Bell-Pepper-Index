import { randomUUID } from 'crypto';
import { query } from '../db/client.js';

/**
 * Offers checked, as a bare counter.
 *
 * Offers checked per week is the one number that shows the app is being
 * consulted while a farmer is deciding, rather than admired afterwards. Users
 * and page views do not show that; this does.
 *
 * It deliberately stores no identity. It is a count, not a log of who is
 * negotiating what — a farmer mid-negotiation with a buyer who also reads this
 * group should not be leaving a trail.
 */

export interface OfferCheckInput {
  type: string;
  offerPerKg: number;
  hub: string;
  verdict: string;
  checkedOn: string;
}

export async function recordOfferCheck(input: OfferCheckInput): Promise<void> {
  await query(
    `INSERT INTO offer_checks (id, type, offer_per_kg, hub, verdict, checked_on)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [`chk-${randomUUID()}`, input.type, input.offerPerKg, input.hub, input.verdict, input.checkedOn],
  );
}

export async function countChecksSince(sinceDate: string): Promise<number> {
  const { rows } = await query<{ count: string }>(
    'SELECT count(*)::text AS count FROM offer_checks WHERE checked_on >= $1',
    [sinceDate],
  );
  return Number(rows[0].count);
}
