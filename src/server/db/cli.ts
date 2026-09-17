import 'dotenv/config';
import { closePool, isDatabaseConfigured } from './client';
import { migrate } from './migrate';

/** `npm run db:migrate` — applies the schema and seeds reference data. */
async function main() {
  if (!isDatabaseConfigured()) {
    console.error('DATABASE_URL is not set. Point it at your Neon/Supabase connection string.');
    process.exit(1);
  }

  await migrate();
  await closePool();
}

main().catch((err) => {
  console.error('Migration failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
