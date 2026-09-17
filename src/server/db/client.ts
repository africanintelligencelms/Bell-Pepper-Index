import { Pool, PoolClient, QueryResult, QueryResultRow, types as pgTypes } from 'pg';

// DATE columns must come back as the plain 'YYYY-MM-DD' string they were
// stored as. The default parser builds a JS Date at local midnight, which
// shifts a Jos harvest date to the previous day once the server runs in UTC.
const PG_OID_DATE = 1082;
pgTypes.setTypeParser(PG_OID_DATE, (value: string) => value);

/**
 * Serverless-safe Postgres access.
 *
 * On Vercel/Netlify each warm lambda reuses its module scope but cold starts
 * create a fresh one, so the pool is cached on globalThis and kept deliberately
 * small: many concurrent lambdas each holding a large pool will exhaust the
 * database's connection limit. Point DATABASE_URL at a pooled endpoint
 * (Neon's -pooler host, or Supabase's pgbouncer port 6543) in production.
 */

const MAX_POOL_SIZE = Number(process.env.PG_POOL_MAX ?? 3);

type GlobalWithPool = typeof globalThis & { __pepperIndexPool?: Pool };

const globalWithPool = globalThis as GlobalWithPool;

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0);
}

/**
 * Neon and Supabase both terminate TLS with certificates that Node does not
 * trust out of the box. PGSSLMODE=disable opts out entirely for local Postgres.
 */
function sslConfig(): { rejectUnauthorized: boolean } | false {
  const mode = (process.env.PGSSLMODE ?? '').toLowerCase();
  if (mode === 'disable') return false;

  const url = process.env.DATABASE_URL ?? '';
  const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
  if (isLocal && mode === '') return false;

  return { rejectUnauthorized: false };
}

export function getPool(): Pool {
  if (!isDatabaseConfigured()) {
    throw new Error('DATABASE_URL is not configured.');
  }

  if (!globalWithPool.__pepperIndexPool) {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: MAX_POOL_SIZE,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
      ssl: sslConfig(),
    });

    // An idle client erroring out must not take the process down with it.
    pool.on('error', (err) => {
      console.error('Unexpected Postgres pool error:', err.message);
    });

    globalWithPool.__pepperIndexPool = pool;
  }

  return globalWithPool.__pepperIndexPool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<QueryResult<T>> {
  return getPool().query<T>(text, params);
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Only used by the local dev server on shutdown; lambdas never call this. */
export async function closePool(): Promise<void> {
  if (globalWithPool.__pepperIndexPool) {
    await globalWithPool.__pepperIndexPool.end();
    globalWithPool.__pepperIndexPool = undefined;
  }
}
