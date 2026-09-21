import { PoolClient } from 'pg';
import { getPool, isDatabaseConfigured, withTransaction } from './client.js';
import { SCHEMA_SQL, SCHEMA_VERSION } from './schema.js';
import { INITIAL_PRICE_RECORDS } from '../../data/seedPrices.js';
import { DEFAULT_PRICE_BANDS, INITIAL_COP_BREAKDOWN, VERIFIED_OFFTAKERS } from '../../data/marketCommunityData.js';

/**
 * Advisory lock id. Several lambdas can cold-start at once and each will try to
 * apply the schema; the lock makes them queue instead of racing on CREATE TABLE.
 *
 * It is taken with pg_advisory_xact_lock INSIDE the transaction, not the
 * session-scoped pg_advisory_lock outside it. Production pooled endpoints
 * (Supabase's Supavisor on port 6543, PgBouncer in transaction mode) hand each
 * statement outside a transaction to any backend, so a session lock could be
 * held on one backend while the schema work ran unprotected on another — and
 * the unlock would land on a third, leaking the lock. A transaction-scoped lock
 * is pinned to the transaction's backend and released automatically on COMMIT
 * or ROLLBACK.
 */
const MIGRATION_LOCK_ID = 8_274_119;

type GlobalWithMigration = typeof globalThis & { __pepperIndexMigration?: Promise<void> };
const globalWithMigration = globalThis as GlobalWithMigration;

async function applySchema(client: PoolClient): Promise<void> {
  await client.query(SCHEMA_SQL);
}

/**
 * Recorded only once the version-gated steps have run. Stamping the version
 * inside applySchema would make every such step see its own version already
 * present and skip itself.
 */
async function recordSchemaVersion(client: PoolClient): Promise<void> {
  await client.query(
    `INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT (version) DO NOTHING`,
    [SCHEMA_VERSION],
  );
}

/**
 * Price records are seeded only into a genuinely empty table — re-seeding a
 * live community index would resurrect records an admin deleted on purpose.
 */
async function seedPriceRecords(client: PoolClient): Promise<number> {
  const { rows } = await client.query<{ count: string }>('SELECT count(*)::text AS count FROM price_records');
  if (Number(rows[0].count) > 0) return 0;

  for (const record of INITIAL_PRICE_RECORDS) {
    await client.query(
      `INSERT INTO price_records (
         id, type, price_per_kg, quantity_kg, transaction_type, production_method,
         quality_grade, location, recorded_on, farmer_name, farmer_phone, notes, source, created_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       ON CONFLICT (id) DO NOTHING`,
      [
        record.id,
        record.type,
        record.pricePerKg,
        record.quantityKg,
        record.transactionType,
        record.productionMethod,
        record.qualityGrade,
        record.location,
        record.date,
        record.farmerName,
        record.farmerPhone ?? '',
        record.notes ?? '',
        record.source,
        record.createdAt,
      ],
    );
  }

  return INITIAL_PRICE_RECORDS.length;
}

/**
 * Bands and COP defaults use DO NOTHING per row rather than an emptiness check:
 * a later release can add a new hub without overwriting the figures the
 * association has already tuned for the existing ones.
 */
async function seedPriceBands(client: PoolClient): Promise<void> {
  for (const [index, band] of DEFAULT_PRICE_BANDS.entries()) {
    await client.query(
      `INSERT INTO price_bands (
         hub, coloured_min, coloured_target, coloured_max,
         green_min, green_target, green_max,
         logistics_from_jos_per_kg, notes, sort_order
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (hub) DO NOTHING`,
      [
        band.hub,
        band.colouredMin,
        band.colouredTarget,
        band.colouredMax,
        band.greenMin,
        band.greenTarget,
        band.greenMax,
        band.logisticsFromJosPerKg,
        band.notes,
        index,
      ],
    );
  }
}

async function seedCopItems(client: PoolClient): Promise<void> {
  for (const [index, item] of INITIAL_COP_BREAKDOWN.entries()) {
    await client.query(
      `INSERT INTO cop_items (id, category, label, cost_ngn, is_variable, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO NOTHING`,
      [item.id, item.category, item.label, item.costNgn, item.isVariable, index],
    );
  }
}

/**
 * The seeded buyers came out of the WhatsApp group and were vetted there, so
 * they seed verified. Everything added through the API afterwards starts
 * unverified regardless of what the client sends.
 */
async function seedOfftakers(client: PoolClient): Promise<void> {
  for (const offtaker of VERIFIED_OFFTAKERS) {
    await client.query(
      `INSERT INTO offtakers (
         id, name, phone, location, crops, buyer_type,
         verified_by_community, notes, submitted_by
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (id) DO NOTHING`,
      [
        offtaker.id,
        offtaker.name,
        offtaker.phone,
        offtaker.location,
        offtaker.crops,
        offtaker.buyerType,
        offtaker.verifiedByCommunity,
        offtaker.notes,
        '',
      ],
    );
  }
}

/**
 * v3: reset the agreed floor, and clear the price records that predate it.
 *
 * The association re-set the floor to roughly half its previous level. Every
 * record logged before that decision sits above the new ceiling, so leaving
 * them in place would have the card publishing a median near ₦4,500 directly
 * above an agreed range of ₦2,000–₦2,500 — a contradiction a farmer would
 * rightly stop trusting.
 *
 * Bands are normally seeded with ON CONFLICT DO NOTHING precisely so tuned
 * figures survive a deploy. This is the deliberate exception: a one-time,
 * version-gated correction rather than a re-seed, so it applies exactly once
 * and later admin edits are still safe.
 */
async function applyFloorReset(client: PoolClient): Promise<void> {
  const { rows } = await client.query<{ exists: boolean }>(
    `SELECT EXISTS (SELECT 1 FROM schema_migrations WHERE version >= 3) AS exists`,
  );
  if (rows[0].exists) return;

  for (const band of DEFAULT_PRICE_BANDS) {
    await client.query(
      `UPDATE price_bands SET
         coloured_min = $2, coloured_target = $3, coloured_max = $4,
         green_min = $5, green_target = $6, green_max = $7,
         logistics_from_jos_per_kg = $8, notes = $9, updated_at = now()
       WHERE hub = $1`,
      [
        band.hub,
        band.colouredMin,
        band.colouredTarget,
        band.colouredMax,
        band.greenMin,
        band.greenTarget,
        band.greenMax,
        band.logisticsFromJosPerKg,
        band.notes,
      ],
    );
  }

  // The index restarts from the new floor; fresh submissions define it.
  const { rowCount } = await client.query('DELETE FROM price_records');
  console.log(`Floor reset applied: bands updated, ${rowCount ?? 0} pre-reset price records cleared.`);
}

/** Applies the schema and seeds reference data. Safe to call repeatedly. */
export async function migrate(): Promise<void> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1)', [MIGRATION_LOCK_ID]);
    await applySchema(client);
    await applyFloorReset(client);
    const seeded = await seedPriceRecords(client);
    await seedPriceBands(client);
    await seedCopItems(client);
    await seedOfftakers(client);
    await recordSchemaVersion(client);
    await client.query('COMMIT');
    console.log(
      seeded > 0
        ? `Database ready (schema v${SCHEMA_VERSION}, seeded ${seeded} price records).`
        : `Database ready (schema v${SCHEMA_VERSION}).`,
    );
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    // No explicit unlock: COMMIT and ROLLBACK both release a transaction lock.
    client.release();
  }
}

/**
 * Runs the migration at most once per process. Serverless entrypoints await
 * this before serving a request so a fresh deploy self-heals its schema
 * without a separate deploy hook.
 */
export function ensureSchema(): Promise<void> {
  if (!isDatabaseConfigured()) return Promise.resolve();

  if (!globalWithMigration.__pepperIndexMigration) {
    globalWithMigration.__pepperIndexMigration = migrate().catch((err) => {
      // Clear the cache so the next request retries rather than being stuck
      // with a permanently rejected promise.
      globalWithMigration.__pepperIndexMigration = undefined;
      throw err;
    });
  }

  return globalWithMigration.__pepperIndexMigration;
}

/** Drops all application data and re-seeds. Used by the admin reset endpoint. */
export async function resetToSeed(): Promise<void> {
  await withTransaction(async (client) => {
    await client.query('TRUNCATE price_records');
    await seedPriceRecords(client);
  });
}
