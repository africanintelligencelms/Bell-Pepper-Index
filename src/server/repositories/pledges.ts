import { PepperType } from '../../types.js';
import { query } from '../db/client.js';

/**
 * What members say they will refuse this week.
 *
 * See src/server/pledgeFloor.ts for why this is the opposite mechanism to a
 * floor derived from submissions, and must not be merged with one.
 *
 * `pledgeKey` is an opaque per-device id, not a verified identity. That is a
 * real weakness — one person with several browser profiles can pledge several
 * times — and it is why the published figure is labelled self-reported and
 * never as an association decision. The `verified` column is here so phone
 * identity can be layered on without a second table.
 */

export interface PledgeInput {
  pledgeKey: string;
  hub: string;
  type: PepperType;
  minPerKg: number;
  weekStart: string;
}

/** One pledge per device, hub, variety and week. Re-pledging replaces. */
export async function upsertPledge(input: PledgeInput): Promise<void> {
  await query(
    `INSERT INTO price_pledges (pledge_key, hub, type, min_per_kg, week_start)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (pledge_key, hub, type, week_start)
     DO UPDATE SET min_per_kg = EXCLUDED.min_per_kg, updated_at = now()`,
    [input.pledgeKey, input.hub, input.type, input.minPerKg, input.weekStart],
  );
}

export async function listPledgesForWeek(
  hub: string,
  type: PepperType,
  weekStart: string,
): Promise<{ minPerKg: number; verified: boolean }[]> {
  const { rows } = await query<{ min_per_kg: string; verified: boolean }>(
    `SELECT min_per_kg, verified
     FROM price_pledges
     WHERE hub = $1 AND type = $2 AND week_start = $3`,
    [hub, type, weekStart],
  );
  return rows.map((r) => ({ minPerKg: Number(r.min_per_kg), verified: r.verified }));
}

/** This device's own pledges, so the form can show what it already said. */
export async function listPledgesByKey(
  pledgeKey: string,
  hub: string,
  weekStart: string,
): Promise<{ type: PepperType; minPerKg: number }[]> {
  const { rows } = await query<{ type: string; min_per_kg: string }>(
    `SELECT type, min_per_kg
     FROM price_pledges
     WHERE pledge_key = $1 AND hub = $2 AND week_start = $3`,
    [pledgeKey, hub, weekStart],
  );
  return rows.map((r) => ({ type: r.type as PepperType, minPerKg: Number(r.min_per_kg) }));
}
