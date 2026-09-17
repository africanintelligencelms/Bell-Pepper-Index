# Deploying to Vercel

The app is a static SPA plus one serverless function. `vercel.json` points the build at
`npm run build:client` (Vite + the secret scan), serves `dist/`, and rewrites every `/api/*`
request to `api/index.ts`, which mounts the same Express app the local dev server uses.

## 1. Provision Postgres first

**Do this before the first deploy.** Without `DATABASE_URL` the app falls back to its in-memory
store, and on serverless that memory lasts roughly one request — every price a farmer logs would
be accepted, acknowledged, and lost. `/api/health` would report `"persistent": false`.

### Supabase

1. Create a project at [supabase.com](https://supabase.com) (free tier is fine) and set a
   database password when prompted — you will need it in the connection string.
2. **Settings → Database → Connection pooling.**
3. Copy the **Transaction** pooler URI. It uses **port 6543** and a host like
   `aws-0-<region>.pooler.supabase.com`.

Do **not** use the direct connection string shown at the top of that page (port 5432). It is
the first thing offered and the usual mistake. Serverless functions open many short-lived
connections and will exhaust a direct endpoint's limit under any real load.

Substitute your database password for `[YOUR-PASSWORD]` in the copied URI. If the password
contains `@`, `/`, `:` or `#`, percent-encode it or the URI will parse wrongly.

Neon works identically — take its **Pooled connection** string, whose host contains `-pooler`.

### Why transaction pooling is safe here

Supabase's pooler (and PgBouncer in transaction mode) hands each statement outside a
transaction to any available backend. Code that assumes one session across several statements
breaks subtly there. Two things in this app were written for it:

- The migration takes `pg_advisory_xact_lock` **inside** its transaction, not the
  session-scoped `pg_advisory_lock` outside it. A transaction is pinned to one backend, so the
  lock actually protects the schema work and is released automatically on COMMIT or ROLLBACK.
- `pg` is used without named prepared statements, which transaction pooling does not support.

No migration step is needed: the app applies its schema and seeds reference data on first
request. Verified by running six concurrent migrations against an empty database — one seeded,
five found the schema already applied, no duplicate rows and no leaked locks.

## 2. Generate an admin token

```bash
openssl rand -base64 32
```

Destructive and configuration endpoints (record delete, dataset reset, price-band / COP /
offtaker writes) require this as the `x-admin-token` header. With it unset those endpoints
return 503 — the gate fails closed, so an unconfigured deploy refuses admin actions rather
than allowing them.

Keep it out of the repo. An admin enters it once in the browser and it lives in their own
`localStorage`.

## 3. Set environment variables

In the Vercel project: **Settings → Environment Variables**. Mark each **Sensitive** so it
cannot be read back from the dashboard afterwards.

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | **Yes** | Pooled connection string from step 1. |
| `ADMIN_TOKEN` | **Yes** | From step 2. Unset means all admin actions 503. |
| `GEMINI_API_KEY` | For AI features | Without it, chat extraction fails and the market panel serves its deterministic fallback. |
| `GEMINI_MODEL` | No | Overrides the default model id. |
| `PG_POOL_MAX` | No | Connections per instance, default 3. |
| `RATE_LIMIT_PARSE_PER_HOUR` | No | Default 15. |
| `RATE_LIMIT_PREDICT_PER_HOUR` | No | Default 60. |

**Never prefix any of these with `VITE_`.** Vite inlines every `VITE_*` variable into the public
client bundle at build time. `npm run check:secrets` runs inside the build and will fail the
deploy if it detects this, but the rule matters more than the guard.

**Use separate Gemini keys for Production and Preview.** Preview deployments are reachable by
anyone holding the URL, so the preview key should be independently revocable and quota-capped.
Scope each variable to the right environments rather than applying one key to all.

## 4. Deploy

Either connect the GitHub repo in the Vercel dashboard (recommended — every push then deploys,
and pull requests get preview URLs), or from a checkout:

```bash
npx vercel link
npx vercel --prod
```

## 5. Smoke-test the deployment

```bash
curl https://<your-deployment>/api/health
```

Expected:

```json
{ "status": "ok", "store": "postgres", "persistent": true, "recordCount": 9,
  "gemini": { "configured": true, ... } }
```

Check these three fields before announcing the URL to anyone:

- `"store": "postgres"` — if it says `memory`, `DATABASE_URL` did not reach the function and
  **submissions are being discarded**.
- `"persistent": true` — `false`, or a 503 with `"status": "degraded"`, means the database is
  configured but unreachable. Check that you used the pooled endpoint.
- `"gemini": { "configured": true }` — `false` means WhatsApp extraction will fail.

Then confirm a write survives:

```bash
curl -X POST https://<your-deployment>/api/prices \
  -H 'Content-Type: application/json' \
  -d '{"type":"green","pricePerKg":4500,"farmerName":"Deploy check"}'

curl https://<your-deployment>/api/prices | head -c 300   # the record should be there
```

If the POST returns 201 but the record is missing on the next request, the app is running
in-memory — go back to step 1.

## Notes

- **`/api/*` 404s** mean the rewrite is not matching. Confirm `vercel.json` shipped and that
  `api/index.ts` was detected as a function in the build log.
- **Connection exhaustion** under load means a direct rather than pooled `DATABASE_URL`, or
  `PG_POOL_MAX` set too high.
- **`maxDuration` is 60s** for the function, which covers slow Gemini calls. Hobby-plan accounts
  cap lower; reduce it in `vercel.json` if the platform rejects the value.
- The seeded dataset (9 price records, 4 hubs, 7 COP items, 4 offtakers) appears automatically on
  first run. `POST /api/prices/reset` restores it and affects price records only — band, COP and
  offtaker edits survive.
