# Naija Greenhouse Pepper Index

A community-driven price index for Nigerian greenhouse bell pepper farmers. Farmers log what
they sold or were offered; the app turns those submissions into a live index, an AI-extracted
feed from WhatsApp group chats, a cost-of-production breakeven matrix, and an agreed price
band the community can quote back at buyers.

The app exists to stop undercutting. Most of the domain logic is in service of one thing:
a farmer holding a perishable harvest should be able to see, in seconds, whether the price a
buyer just offered is fair.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite + Express on one port (3000 by default; `PORT` overrides). |
| `npm run build` | Builds the SPA to `dist/` and bundles the self-hosted server to `dist/server.cjs`. |
| `npm run build:client` | SPA only — what Vercel runs. |
| `npm run start` | Runs the bundled self-hosted server. |
| `npm run db:migrate` | Applies the schema and seeds reference data. |
| `npm run check:secrets` | Fails if a secret reached `dist/`. Runs automatically as part of both builds. |
| `npm test` | Runs the going-rate tests (`scripts/test-market-rate.ts`). No test runner to install. |
| `npm run lint` | `tsc --noEmit`. |

## Architecture

```
index.html ──> src/main.tsx ──> src/App.tsx        SPA (React 19, Tailwind 4, lucide icons)
                                     │
                                     │ fetch('/api/...')
                                     ▼
api/index.ts ───────┐
                    ├──> src/server/app.ts         Express app factory (no listen, no Vite)
server.ts ──────────┘         │
  (local dev only)            ├──> routes/         prices, marketConfig, ai, health
                              ├──> store/          picks Postgres or in-memory
                              ├──> repositories/   SQL, snake_case <-> camelCase mapping
                              └──> db/             pool, schema, migrate
```

`src/server/app.ts` builds the API and knows nothing about how it is served. Two entry points
mount it:

- **`server.ts`** — local development and self-hosting. Adds Vite middleware (dev) or static
  file serving (production), and awaits the migration at boot so a broken database fails
  loudly instead of on the first farmer's submission.
- **`api/index.ts`** — Vercel/Netlify. `vercel.json` rewrites every `/api/*` request to this
  one function and Express does its own routing, so **adding a route needs no platform config
  change**.

**Relative imports under `api/` and `src/server/` must carry an explicit `.js` extension**, and
a directory must be imported as `<dir>/index.js`. `package.json` sets `"type": "module"`, so the
compiled function runs as ESM on the serverless host, and Node's ESM resolver does not guess
extensions or resolve directories. Omitting them builds and typechecks cleanly, serves static
files cleanly, and then fails at the first invocation with `ERR_MODULE_NOT_FOUND`, which the
platform surfaces only as `FUNCTION_INVOCATION_FAILED`. Write `.js` even though the file on disk
is `.ts` — Vite, tsx and esbuild all resolve it back to the TypeScript source.

### The published going rate

`GET /api/market-rate` owns the headline figure. It is the **median** of
**greenhouse `actual_sale`** records for a variety over a **rolling 14-day window**,
widening to 30 then 90 days when fewer than three sales qualify, and falling back to the
association's agreed target when none of those windows clears the minimum. The response always
carries `basis`, `sampleSize` and `windowDays` so the UI can show what stands behind the number.

Every part of that rule is load-bearing:

- **Greenhouse actual sales only.** A buyer's offer is what someone wants to pay; an asking
  price is what someone hopes to get. Blending them — and blending open-field produce, a
  different market — is how the index ends up publishing the lowball figure it exists to argue
  against. Before this endpoint the card showed a plain mean of every record ever logged, which
  put an open-field ₦3,000 buyer offer inside the published greenhouse rate.
- **Median, not mean.** One mistyped price moves a mean enormously. With ten green records
  including a ₦99,000 typo, the old mean published ₦13,580; the median published ₦4,650.
- **`low`/`high` are the 25th–75th percentile, not min/max.** The median resists an outlier but
  a raw range does not, and that range goes into the WhatsApp broadcast.
- **A minimum sample.** Below three sales the median is noise, and a farmer will quote it to a
  buyer. It says so instead.

**The logger must ask, never assume.** `SimpleFarmerLogger` used to hardcode
`transactionType: 'actual_sale'` and `productionMethod: 'greenhouse'` on every submission, so a
buyer's lowball offer was stored as a confirmed greenhouse sale and counted towards the rate
farmers quote back at that same buyer. Both are now explicit questions. Transaction type has
**no default** on purpose: a pre-selected "I sold it" that is almost always accepted is the same
as a hardcoded value. Growing method defaults to greenhouse, which is honest for a greenhouse
farmers' network, but is visible and one tap to change.

**Compute the rate in exactly one place.** `SimpleFarmerLogger` and `WhatsAppBroadcastCard` both
render this endpoint's response. The broadcast is the app's most public artefact — it gets pasted
into the group — so it must never derive its own average. `PriceOverviewHero`, `PriceTrendChart`
and the `predict-price` fallback still compute their own means and have not been migrated.

### The agreed floor, and who may see what

The association's floor lives in `price_bands` and is **admin-set, never derived**. A floor
that recalculated from submissions would follow the market down, which is precisely what a
buyer pushing prices wants — it would stop being resistance. The published rate moves freely
above it; when the rate falls *below* it, the card says so in red, because that is the alarm
the group exists to raise.

Schema v3 reset the floor to Jos green ₦2,000–₦2,500 / coloured ₦3,500–₦4,200, with the other
hubs carrying the same floor plus their existing freight differential. That migration also
cleared every price record logged before the reset: they sat above the new ceiling, so leaving
them would have published a median near ₦4,500 directly above an agreed range of ₦2,000–₦2,500.
Bands are normally seeded `ON CONFLICT DO NOTHING` so tuned figures survive a deploy; the reset
is a deliberate one-time exception, gated on the schema version so it runs exactly once and
later admin edits stay safe. `INITIAL_PRICE_RECORDS` is now empty for the same reason — showing
nothing is honest when there is nothing recent; showing stale prices is not.

**Nothing in the UI may hardcode a price.** The prefilled price, the quick-tap options and the
floor warnings all derive from the live band. The form previously suggested ₦4,500 while the
agreed floor was ₦2,250; a prefill that is wrong is worse than no prefill.

**Advanced tools are earned, not requested.** `src/lib/contribution.ts` counts sales logged on
this device and opens the history charts, COP calculator and chat reader at three. This is a
nudge, not a security boundary — the count is in `localStorage` and every gated tool reads data
the API already serves publicly. It exists because the index is only as good as what members
log, so the thing the app needs is the thing that unlocks it, and because an approval queue
would mean farmers waiting on an administrator. **The offtaker directory never locks**: a
farmer with a perishable harvest needs a buyer's number today.

### The store seam

Routes never branch on storage. They call `store` (`src/server/store/index.ts`), which
dispatches to Postgres when `DATABASE_URL` is set and to an in-memory store when it is not.
The in-memory store exists so a contributor can clone and run without provisioning a database
— it is **not** a production mode, and `/api/health` reports `"store": "memory"` and
`"persistent": false` so a deploy that silently lost its `DATABASE_URL` is obvious rather than
quietly discarding submissions.

### Persistence notes

- **Numerics come back as strings.** Postgres returns `NUMERIC` as a string to preserve
  precision. Every repository maps them with `Number(...)` explicitly. If you add a numeric
  column, map it — an unmapped one will silently concatenate instead of adding.
- **Dates are strings, deliberately.** `src/server/db/client.ts` overrides the `DATE` type
  parser (OID 1082) to return the raw `YYYY-MM-DD`. The default parser builds a JS `Date` at
  local midnight, which shifts a Jos harvest date to the previous day once the server runs in
  UTC. Do not remove this.
- **The pool is cached on `globalThis`** and kept small (`PG_POOL_MAX`, default 3). Many
  concurrent lambdas each holding a large pool will exhaust the database's connection limit.
  Point `DATABASE_URL` at a **pooled** endpoint in production (Neon's `-pooler` host, or
  Supabase port 6543).
- **Migrations are idempotent and self-applying.** `ensureSchema()` memoises its promise per
  process and takes `pg_advisory_xact_lock` **inside** the migration transaction, so
  simultaneous cold starts queue rather than race on `CREATE TABLE`. It must stay a
  transaction-scoped lock: production pooled endpoints (Supabase's Supavisor on 6543, PgBouncer
  in transaction mode) route each statement outside a transaction to any backend, so a session
  lock would guard nothing and its unlock would leak. Do not use named prepared statements
  either — transaction pooling does not support them.

### Seeding rules (these encode a product decision)

- **Price records** seed only into a genuinely empty table. Re-seeding a live index would
  resurrect records an admin deleted on purpose.
- **Price bands and COP items** seed per row with `ON CONFLICT DO NOTHING`. A later release can
  add a new hub without overwriting figures the association has already tuned.
- **`POST /api/prices/reset`** truncates and re-seeds *price records only*. Band and COP edits
  survive it.

## API

Reads are public. Writes that a farmer performs are public. Destructive and
configuration-changing writes require the `x-admin-token` header.

| Method | Path | Auth |
| --- | --- | --- |
| `GET` | `/api/health` | public |
| `GET` | `/api/prices` | public — `?limit=` (max 2000) `&offset=` |
| `POST` | `/api/prices` | public — any farmer may contribute |
| `POST` | `/api/prices/bulk` | public — WhatsApp import, max 500 per request |
| `DELETE` | `/api/prices/:id` | **admin** |
| `POST` | `/api/prices/reset` | **admin** |
| `GET` | `/api/price-bands`, `/api/cop-items` | public |
| `PUT` | `/api/price-bands`, `/api/cop-items` | **admin** (upsert) |
| `DELETE` | `/api/price-bands/:hub`, `/api/cop-items/:id` | **admin** |
| `GET` | `/api/offtakers` | public — verified buyers first |
| `POST` | `/api/offtakers` | public — always lands **unverified** |
| `PUT` | `/api/offtakers/:id/verify` | **admin** — `{ verified: bool }`, demotion included |
| `DELETE` | `/api/offtakers/:id` | **admin** |
| `POST` | `/api/parse-whatsapp` | public — Gemini extraction, rate limited |
| `POST` | `/api/predict-price` | public — Gemini, deterministic fallback, rate limited |

`GET /api/prices` **omits `farmerPhone` unless a valid admin token is present.** Farmers give a
number so the group can follow up on a quote, not so it can be published; the endpoint is public
and unauthenticated, so returning it would hand every contributor's contact details to any
caller. The number is still stored — verifying a suspicious submission means being able to ring
the person — it is only withheld from public reads. `hasValidAdminToken` is the non-throwing
check used for this; an invalid token falls back to the public shape rather than 401, since the
endpoint genuinely serves everyone.

The offtaker directory is the deliberate exception: those phone numbers exist to be shared.

`requireAdmin` **fails closed**: with `ADMIN_TOKEN` unset it returns 503 rather than allowing
everything. The token is compared with `timingSafeEqual`.

The admin token is never bundled into the client — the build is public, so a compiled-in token
would be a token published to every farmer. `src/lib/adminToken.ts` keeps it in the admin's own
`localStorage` and prompts on first use, clearing it if the server rejects it.

### The offtaker verified badge

Anyone may submit a buyer contact — a farmer who finds one mid-WhatsApp-conversation should be
able to share it immediately. But the submission **always lands unverified**:
`parseOfftaker` does not read `verifiedByCommunity` from the body at all, so a client cannot
self-verify however it crafts the request. Only `PUT /api/offtakers/:id/verify` changes it.

This is a trust boundary, not a nicety. Farmers hand perishable harvests to these phone
numbers, and a badge anyone can mint is worse than no badge — it launders a stranger into a
vetted contact. The UI labels unverified entries in amber rather than leaving them blank
(absence of a badge reads as an oversight), sorts them behind verified buyers, and warns the
submitter before they submit so the tag is not a surprise.

Un-verifying is supported deliberately: a buyer who stops paying must be demotable without
deleting the record and losing the history.

### Rate limiting the public endpoints

Two different risks share one limiter.

`/api/parse-whatsapp` and `/api/predict-price` are capped because every call spends Gemini
quota, and anyone who finds the URL can drain the project's allowance — in practice a larger
risk than key leakage, since the key never leaves the server.

`POST /api/prices`, `/api/prices/bulk` and `/api/offtakers` are capped because the index is the
argument a farmer makes to a buyer. Submission is deliberately unauthenticated so contributing
stays frictionless, which is also the attack: a buyer submits a stream of low sales and drags
the published median down. Bulk is capped hardest (5/hour) because one request carries up to
500 records, making it the efficient way to flood rather than the convenient way to contribute.

**The limits are loose on purpose.** Nigerian mobile networks put many subscribers behind one
public address, and farmers in a co-op may share a connection, so a per-IP cap tight enough to
stop a determined flood would also lock out a village. They are set to stop bulk automation
without being reachable by a group of people logging real sales. A valid `ADMIN_TOKEN` bypasses
them entirely — an admin importing a season of WhatsApp history is doing the work the limit
protects, not the abuse it stops.

Each endpoint gets its own bucket, so exhausting one never blocks another. Reads are never
limited.

The limiter is a fixed-window counter in Postgres (`ai_rate_limits`), **not** in process
memory. Each serverless instance has its own memory, so an in-process limiter would be bypassed
by simply spreading requests across cold starts. Verified by running two processes against one
database: the fourth request over a limit of three was rejected by the instance that had only
seen one of them.

It **fails open** — if the counter table is unreachable the request proceeds and the error is
logged. Blocking farmers because a counter is down trades a cost problem for an availability
one. Client IP prefers Vercel's `x-vercel-forwarded-for` (platform-set) over the
client-spoofable `x-forwarded-for`.

### Handling the Gemini key

- The key is read only in `src/server/ai/client.ts`, server-side. It is never sent to the
  browser and never appears in a response body, log line, or error message.
- **Never prefix it with `VITE_`.** Vite inlines every `VITE_*` variable into the client bundle
  at build time, which would publish the key to every visitor. This is the single most common
  way a key leaks from a Vite app.
- `/api/health` reports `gemini.configured` as a boolean only. Health output gets pasted into
  chats and issue trackers, so it must never carry the value.
- `.env*` is gitignored apart from `.env.example`. On Vercel the key lives in project
  environment variables, marked **Sensitive** so it cannot be read back from the dashboard.
- Scope production and preview to **different keys**. Preview deployments are reachable by
  anyone with the URL, so a preview key should be separately revocable and quota-capped.

`scripts/check-bundle-secrets.mjs` enforces the above rather than leaving it to convention. It
runs inside `build` and `build:client`, so a leak fails the deploy instead of shipping. It
applies two independent checks to the client output:

1. **Known secret shapes** — Google API keys, Postgres URLs carrying a password, PEM blocks,
   and any surviving `VITE_*(KEY|TOKEN|SECRET|PASSWORD)` name.
2. **Literal values of sensitive env vars present at build time** (`GEMINI_API_KEY`,
   `ADMIN_TOKEN`, `DATABASE_URL`, `PGPASSWORD`). This is the stronger check: it catches a
   secret of any shape under any variable name, and it works on Vercel, where project
   environment variables are available to the build.

`dist/server.cjs` is excluded — it legitimately references `process.env.GEMINI_API_KEY` and is
never served to a browser. Failure output names the file and the variable but **never prints
the value**, since it lands in CI logs.

Both paths are verified to actually fire: a deliberate `VITE_` alias of the key failed the
build on both checks, and a random 16-character `ADMIN_TOKEN` under a harmless variable name
was caught by the env-value check alone.

## Conventions

- **Validate at the boundary, in `src/server/validation.ts`.** Never coerce with
  `Number(x) || 0` in a route — that silently turns a malformed price into ₦0 and drags the
  community average down. `pricePerKg` is the one field with no default: a record without a
  real price is not a record.
- **Never report a write that did not happen.** `App.tsx` used to fall back to a local-only
  "Logged!" toast when the API failed. A farmer who believes their price is in the index will
  not re-submit it, and the quote is lost. Failures now say so.
- **Optimistic UI must be confirmed.** Delete removes the row only after the server agrees,
  otherwise the table and database disagree until the next refresh.
- **Gemini keys are server-side only** (`metadata.json` declares
  `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API`). Parsing and prediction stay behind the API.
- **`/api/predict-price` always answers.** If Gemini is unavailable — unset key, quota, bad
  JSON — it serves a deterministic analysis computed from stored records, and reports
  `source: "fallback"`. A farmer mid-negotiation should never see a blank panel.
- **Persisted config flows down as optional props.** `UnifiedPriceBandCard` takes `bands`,
  `ProductionCostCalculator` takes `costItems`; both fall back to the bundled constants in
  `src/data/marketCommunityData.ts` when the API has not answered yet or is offline.
- Comments explain *why*, especially where the reason is a market dynamic rather than a
  technical one. Match the surrounding density.

## Domain vocabulary

- **Coloured vs green** — red/yellow/orange peppers command a large premium (≈₦7,000/kg)
  over green (≈₦4,500/kg). They are effectively two different markets.
- **Greenhouse vs open field** — greenhouse produce has thicker pericarps and 14–21 day shelf
  life versus a few days. That shelf life is *holding leverage*: it is why a farmer can refuse
  a low offer instead of panic selling.
- **The offtaker fallacy** — buyers quoting open-field glut rates (₦3,000) for greenhouse
  produce to force a distress sale. Much of the app's copy exists to name this tactic.
- **Unified (+/-) band** — the association's agreed min/target/max per hub. The point is that
  farmers stop negotiating in silos.
- **COP** — cost of production per kg. The hard case the calculator models: COP is ₦6,000 but
  the offer is ₦4,000, so is marginal cash recovery better than a total rot write-off?
- **Transaction types** — `actual_sale` (confirmed), `buyer_offer` (what a buyer offered),
  `farmer_asking` (what a farmer wants). Mixing these distorts the index.
- **Hubs** — Jos farmgate (the production belt) plus Abuja, Lagos, Kano. Logistics from Jos is
  ₦200–₦500/kg and is why the same pepper has four different fair prices.

## Deployment

See `DEPLOYMENT.md`. `vercel.json` sets `buildCommand` to `npm run build:client` rather than
`vite build` specifically so the secret scan runs on Vercel — the one environment where a leaked
bundle is actually published.

When the database is configured but unreachable, `/api/health` returns 503 with a
`databaseError` field carrying the driver's error **code only** — never the message, which can
echo the host or username from the connection string. `28P01` is a bad password, `XX000` from
Supabase's pooler usually means the username is missing its `.project-ref` suffix, `ENOTFOUND`
is a bad host, and `ETIMEDOUT` is usually the wrong port or Supabase's IPv6-only direct
endpoint, which Vercel cannot reach at all.

The single most important pre-deploy step is provisioning Postgres. Without `DATABASE_URL` the
app falls back to the in-memory store, which on serverless lasts about one request: every
submission is accepted, acknowledged, and lost. `/api/health` reports `"store"` and
`"persistent"` precisely so this is checkable in one curl.

## Environment

See `.env.example`. `DATABASE_URL` and `ADMIN_TOKEN` are the two that change behaviour most:
without the first the app is non-persistent, without the second all admin actions return 503.

## Known gaps

- **Test coverage is limited to the going rate.** `npm test` covers `src/server/marketRate.ts`
  (22 assertions). Everything else is verified by hand against a real Postgres.
- **The floor is per-hub but the simple logger always shows the first band** (Jos farmgate).
  A Lagos farmer sees the Jos floor unless an admin reorders the hubs. `/api/market-rate`
  accepts `?hub=` but nothing in the UI sets it.
- **Three components still compute their own averages** — `PriceOverviewHero`,
  `PriceTrendChart` and the `predict-price` deterministic fallback — using the plain unfiltered
  mean that `/api/market-rate` replaced. They will disagree with the headline figure.
- **`/api/predict-price` calls Gemini on every records-count change**, with no caching.
  Deferred to a future release; the design is sketched in a `TODO(next release)` block above the
  route in `src/server/routes/ai.ts`. Rate limiting caps the damage in the meantime but does not
  remove the redundant calls.
- **`GEMINI_MODEL` defaults to `gemini-3.6-flash`**, carried over from the original code and
  not independently verified here. Override it with the env var if that id is wrong.
