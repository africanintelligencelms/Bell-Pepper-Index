import { createApiApp } from '../src/server/app';
import { ensureSchema } from '../src/server/db/migrate';
import { isDatabaseConfigured } from '../src/server/db/client';

/**
 * Serverless entry for Vercel (and Netlify's Express-compatible functions).
 * vercel.json routes every /api/* request here; Express then does its own
 * matching, so adding a route needs no change to the platform config.
 *
 * The schema check is fired at module load rather than awaited per request:
 * ensureSchema() memoises its promise, and the store awaits the same promise
 * before touching a table, so a cold start overlaps migration with routing
 * instead of serialising them.
 */
if (isDatabaseConfigured()) {
  void ensureSchema().catch((err) => {
    console.error('Schema initialisation failed:', err instanceof Error ? err.message : err);
  });
}

export default createApiApp();
