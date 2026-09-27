# Implementation Backlog — Top 5

Implementation-ready specs for the five highest-leverage features from `docs/STRATEGY.md`.
Presented in **build order** (dependencies first), with the strategy's leverage rank noted on each.

Anyone picking one of these up should be able to start without re-deriving the design. Each spec
carries: why it exists, schema, endpoints, pure modules, UI, files to touch, acceptance criteria,
tests, and the invariants it must not break.

---

## Cross-cutting rules every spec below inherits

These are already project law (`CLAUDE.md`); repeated here because all five specs touch them.

1. **One rate computation.** Nothing computes a going rate, a floor, or a verdict client-side.
   New decision logic goes in a pure module under `src/server/` and is consumed by every surface
   — web UI, WhatsApp bot, broadcast — so no two surfaces can disagree.
2. **Validate at the boundary** in `src/server/validation.ts`. Never `Number(x) || 0` in a route.
3. **Relative imports under `api/` and `src/server/` carry an explicit `.js` extension**, and a
   directory is imported as `<dir>/index.js`. Omitting it typechecks and then fails at the first
   serverless invocation.
4. **Routes never branch on storage.** Add methods to `src/server/store/index.ts` and implement
   them in *both* the Postgres repository and `memoryStore`, or a contributor without a database
   can no longer run the app.
5. **Numerics come back from Postgres as strings.** Map every new numeric column with
   `Number(...)` or it will silently concatenate.
6. **Never report a write that did not happen.** Applies hardest to spec 4.
7. **Nothing in the UI hardcodes a price.** Every figure derives from the live band or rate.
8. **New tables and columns bump `SCHEMA_VERSION`** in `src/server/db/schema.ts`; migrations stay
   idempotent (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`) and seed reference rows
   `ON CONFLICT DO NOTHING`. Never re-seed price records into a non-empty table.
9. **New server-side secrets are never `VITE_`-prefixed** and are added to the sensitive-name list
   in `scripts/check-bundle-secrets.mjs` so a leak fails the build.

---

## 1. "Check this offer" — the front door

**Leverage rank 2. Effort S. No external dependencies. Build first.**

### Why

The app currently asks for a record *after* the sale, when the farmer has nothing to gain. The
moment they need help is mid-negotiation. This makes the negotiation the entry point: the farmer
types the offer, gets a verdict and a sentence to say back to the buyer, and the data becomes a
byproduct of a service rendered. It also captures the buyer-offer distribution — the direct
evidence of the lowballing tactic the app exists to name — which is currently thrown away.

### Design decision worth preserving

**The check itself writes nothing.** If every check created a `buyer_offer` record, the index
would fill with hypotheticals, idle curiosity and typos. The write happens only when the farmer
states an *outcome* ("I took it" / "I turned it down"), which is both an explicit confirmation
that a real buyer really offered this, and the more valuable datum.

### Schema (`SCHEMA_VERSION` → 4)

```sql
-- What happened to a buyer's offer. NULL for every record that is not an offer,
-- and for offers logged before this column existed.
ALTER TABLE price_records
  ADD COLUMN IF NOT EXISTS outcome TEXT
  CHECK (outcome IS NULL OR outcome IN ('accepted', 'refused', 'undecided'));

-- Offers checked per week is the one metric that proves the app is being
-- consulted at the decision moment. Deliberately carries no identity: it is a
-- counter, not a log of who is negotiating what.
CREATE TABLE IF NOT EXISTS offer_checks (
  id           TEXT PRIMARY KEY,
  type         TEXT NOT NULL CHECK (type IN ('coloured', 'green')),
  offer_per_kg NUMERIC(12, 2) NOT NULL CHECK (offer_per_kg >= 0),
  hub          TEXT NOT NULL DEFAULT '',
  verdict      TEXT NOT NULL,
  checked_on   DATE NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS offer_checks_checked_on_idx ON offer_checks (checked_on DESC);
```

### Pure module — `src/server/offerVerdict.ts`

```ts
export type VerdictLevel = 'below_floor' | 'below_market' | 'at_market' | 'above_market';

export interface OfferVerdict {
  level: VerdictLevel;
  /** Signed % difference from the published rate; null when the rate is insufficient. */
  vsRatePct: number | null;
  /** Signed % difference from the hub floor; null when no band is configured. */
  vsFloorPct: number | null;
  /** What this offer costs the farmer against the floor, for their stated quantity. */
  shortfallNgn: number | null;
  /** One sentence, shown verbatim. */
  headline: string;
  /** Copyable message for the farmer to send the buyer. Never accusatory. */
  buyerReply: string;
  /** Why, in the farmer's terms. Rendered as bullets. */
  reasoning: string[];
}

export function assessOffer(input: {
  type: PepperType;
  offerPerKg: number;
  quantityKg: number;
  rate: MarketRate;            // from resolveMarketRate, same object the card renders
}): OfferVerdict;
```

Rules:

- `below_floor` when `offerPerKg < rate.band.min`. This is the alarm case and must read as one.
- `below_market` when at or above the floor but more than 10% under `rate.pricePerKg`.
- `at_market` within ±10%; `above_market` beyond +10%.
- **When `rate.sufficient === false`, the verdict must say so** and lean on the band only. It must
  never present a median of one or two sales as a market comparison — a farmer will quote it.
- `shortfallNgn = (band.min - offerPerKg) * quantityKg`, floored at 0. This is the number that
  actually lands: "this offer is ₦112,500 less than the floor for your 250kg".
- `buyerReply` names the produce distinction and the shelf life, never the buyer's motives. It is
  going to a real person the farmer has to keep dealing with.

### Endpoints

```
POST /api/check-offer          public, rate limited (bucket 'check-offer', 120/hr)
  body: { type, offerPerKg, quantityKg?, location? }
  200:  { success: true, data: { verdict: OfferVerdict, rate: MarketRate, hub: string|null } }
```

- Resolves the hub with the existing `resolveHub`, fetches samples via `store.listRateSamples`,
  computes the rate with `resolveMarketRate`, then `assessOffer`. **No new rate maths.**
- Records one `offer_checks` row (fire-and-forget; a counter failure must never fail the request).
- Limit is generous because checking an offer is the behaviour we want most.

```
POST /api/prices               existing endpoint, extended
  body: + outcome?: 'accepted' | 'refused' | 'undecided'
```

`parsePriceRecord` validates `outcome` with the existing `oneOf` helper, **rejects it unless
`transactionType === 'buyer_offer'`** (an outcome on a completed sale is meaningless), and
defaults to `undefined`.

```
GET  /api/offer-checks/summary  public
  200: { success: true, data: { last7Days: number, refusedBelowFloor: number } }
```

Feeds the social-proof line in §3 and the broadcast: *"members turned down 9 offers below the
floor this week"*.

### UI

New `src/components/OfferCheck.tsx`, and it becomes the **default view** of
`activeTab === 'simple_logger'`, above the logging form:

1. Big prompt: **"A buyer is offering me…"** — numeric keypad input, variety toggle, quantity,
   hub (prefilled from `farmerLocation`).
2. Verdict card: colour-coded by `level` (red for `below_floor`, matching the existing floor
   alarm), headline, the shortfall in naira, the provenance line already used elsewhere.
3. **Copy button on `buyerReply`** plus "Send on WhatsApp" using the same `wa.me` pattern as
   `WhatsAppBroadcastCard`.
4. Outcome row — *I took it* / *I turned it down* / *Still deciding* — each posting a
   `buyer_offer` record with the matching `outcome`, then confirming only after the server agrees.
5. When `outcome === 'refused'`, offer a follow-up nudge: *"We'll remind you in 3 days — did you
   get a better price?"* (the reminder itself lands with spec 5; until then this is a local
   prompt on next visit).

Contribution gate change (from strategy §4): first three checks free, then one sale required.
`src/lib/contribution.ts` gains a separate `offer_checks_used` counter; the unlock check becomes
"has logged a sale **or** has checks remaining", and the copy explains the trade honestly.

### Files

`src/server/offerVerdict.ts` (new) · `src/server/routes/offerCheck.ts` (new, mounted in
`src/server/app.ts`) · `src/server/repositories/offerChecks.ts` (new) · `src/server/store/index.ts`
· `src/server/store/memoryStore.ts` · `src/server/db/schema.ts` · `src/server/validation.ts` ·
`src/types.ts` · `src/components/OfferCheck.tsx` (new) · `src/App.tsx` ·
`src/lib/contribution.ts` · `scripts/test-market-rate.ts` (extend or add
`scripts/test-offer-verdict.ts` wired into `npm test`)

### Acceptance

- An offer below the hub floor produces a red verdict naming the shortfall in naira for the
  stated quantity, and a copyable reply.
- With fewer than three qualifying sales, the verdict compares against the band only and says
  plainly that there is not enough recent sales data.
- A Lagos farmer and a Jos farmer entering the same offer get different verdicts, differing by
  the freight differential.
- No record is written by a check. Exactly one record is written per outcome tap, and only after
  the server confirms.
- `npm test` covers: each verdict level, the insufficient-rate path, zero quantity, an offer of 0,
  and an absurd offer at the `MAX_PRICE_NGN` boundary.

---

## 2. Phone identity + the weekly pledge

**Leverage rank 3. Effort M. Unblocks specs 3–5 and two revenue lines.**

### Why

Two problems, one primitive. Device-local identity means no return path, no reputation, no
duplicate detection, no per-farmer history (so no credit dataset), and a member who changes phone
loses their unlock. Separately, the published floor is labelled *"agreed"* when no agreement
exists — a member-builder cannot declare a floor, and the first person to ask "who agreed this?"
in the group ends the app's credibility.

The pledge solves both: members declare what they will refuse, the floor becomes an aggregate of
those declarations with a visible count behind it, and it needs nobody's permission to become true.

### The distinction that must not be lost

A floor derived from **what buyers paid** follows the market down and stops being resistance —
this is why `price_bands` is admin-set and must stay so. A floor derived from **what members
commit to refuse** does the opposite. Both are "derived"; they are opposite mechanisms. Write
that comment next to the aggregation function, because it will otherwise get "simplified" into
the very thing the project forbids.

An admin-set band always wins where one exists. The pledge floor is what fills the vacuum when
no association decision exists, and it is labelled as such — never as "agreed".

### Schema (`SCHEMA_VERSION` → 5)

```sql
CREATE TABLE IF NOT EXISTS members (
  phone        TEXT PRIMARY KEY,          -- normalised E.164, e.g. +2348012345678
  display_name TEXT NOT NULL DEFAULT '',
  hub          TEXT NOT NULL DEFAULT '',
  -- Set only when the number has actually been proven (a message from it, or a
  -- code returned). An unverified member is usable but never counts towards a
  -- published pledge floor: that is what stops one person being thirty members.
  verified_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Opaque per-device token. Not a password, not a session in the security sense:
-- it identifies a device to link its submissions to one member.
CREATE TABLE IF NOT EXISTS member_devices (
  token       TEXT PRIMARY KEY,
  phone       TEXT NOT NULL REFERENCES members (phone) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One pledge per member per hub, variety and week. Re-pledging replaces.
CREATE TABLE IF NOT EXISTS price_pledges (
  phone        TEXT NOT NULL REFERENCES members (phone) ON DELETE CASCADE,
  hub          TEXT NOT NULL,
  type         TEXT NOT NULL CHECK (type IN ('coloured', 'green')),
  min_per_kg   NUMERIC(12, 2) NOT NULL CHECK (min_per_kg >= 0),
  week_start   DATE NOT NULL,             -- Monday, UTC
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (phone, hub, type, week_start)
);

CREATE INDEX IF NOT EXISTS price_pledges_week_idx ON price_pledges (week_start DESC, hub, type);

ALTER TABLE price_records
  ADD COLUMN IF NOT EXISTS member_phone TEXT;      -- NULL for anonymous and legacy records
```

`member_phone` is subject to exactly the same privacy rule as `farmer_phone`: **withheld from
public reads.** Extend `forAudience` in `src/server/routes/prices.ts` to strip it, and add a test
that fails if a new phone-shaped column ever reaches a public response.

### Pure module — `src/server/pledgeFloor.ts`

```ts
export const MIN_PLEDGES = 5;

export interface PledgeFloor {
  hub: string;
  type: PepperType;
  /** 25th percentile of verified members' pledges — resists one low pledge. */
  floorPerKg: number | null;
  pledgeCount: number;
  /** Members who pledged at or above the published floor. The coordination number. */
  holdingCount: number;
  weekStart: string;
  sufficient: boolean;
  note: string;
}

export function resolvePledgeFloor(
  hub: string,
  type: PepperType,
  pledges: { minPerKg: number }[],   // verified members only, current week
  weekStart: string,
): PledgeFloor;
```

- 25th percentile via the **existing `percentile` helper in `src/server/marketRate.ts`** — import
  it, do not reimplement. One low pledge must not drag the published floor down.
- Below `MIN_PLEDGES`, `sufficient: false` and `floorPerKg: null`, and the note says how many more
  pledges are needed. Same discipline as `MIN_SAMPLE_SIZE`: a floor backed by two people is not a
  floor, and a farmer will quote it.
- Unverified members' pledges are counted in `pledgeCount` for encouragement but **excluded from
  the percentile**. The function should take them as a separate argument so that is impossible to
  get wrong by accident.

### Endpoints

```
POST /api/members/claim     public, rate limited (10/hr)
  body: { phone, displayName?, hub? }
  201:  { success: true, data: { deviceToken, phone, verified: false, verifyVia } }
```

Creates or finds the member, issues a device token. **Claiming does not verify.** `verifyVia`
tells the client how to prove the number — a `wa.me` deep link containing a short code once spec 5
is live; until then the response says verification is pending and the client shows the member as
unverified. Do not fake it.

```
POST /api/members/verify    public, rate limited hard (5/hr per phone)
  body: { phone, code }
  200:  { success: true, data: { verified: true } }
```

Codes are single-use, expire in 15 minutes, compared with `timingSafeEqual` (the pattern
`requireAdmin` already uses). Store them hashed.

```
GET  /api/members/me        header: x-device-token
POST /api/pledges           header: x-device-token, rate limited (20/hr)
  body: { hub, type, minPerKg }   → upserts on (phone, hub, type, current week)
GET  /api/pledges/summary?hub=&type=
  200: { success: true, data: PledgeFloor[] }
```

`GET /api/market-rate` response gains a `pledge: PledgeFloor | null` field per variety. Both
`SimpleFarmerLogger` and `WhatsAppBroadcastCard` already render that response, so the pledge count
reaches the group message with no second computation — which is the point.

`POST /api/prices` accepts `x-device-token` and stamps `member_phone`. Anonymous submission must
keep working: identity raises the quality of a record, it does not become a condition of logging.

### UI

- **`src/components/PledgeCard.tsx`** (new): *"What is the lowest you will accept this week?"* —
  one number per variety, prefilled with the current pledge floor or band minimum, submit, then
  show *"You and 16 other members in Jos are holding at ₦2,300 or above."*
- **Pledge count becomes the most prominent element** on the logger screen and moves to the top of
  the broadcast message, above the median. The commitment is the product; the median is evidence
  for it.
- **`src/lib/member.ts`** (new): device token in `localStorage`, same defensive try/catch pattern
  as `src/lib/contribution.ts` (private browsing throws rather than returning null). Migrate the
  existing `farmer_name` / `farmer_phone` values into a claim on first load so no member is asked
  to re-enter what they already typed.
- Relabel every *"agreed floor"* string to reflect its actual basis: admin band → "association
  floor"; pledge aggregate → "member floor — 17 holding"; neither → "no floor set".

### Files

`src/server/pledgeFloor.ts` (new) · `src/server/repositories/members.ts` (new) ·
`src/server/repositories/pledges.ts` (new) · `src/server/routes/members.ts` (new) ·
`src/server/routes/pledges.ts` (new) · `src/server/routes/marketRate.ts` ·
`src/server/routes/prices.ts` · `src/server/middleware/memberAuth.ts` (new) ·
`src/server/store/index.ts` + `memoryStore.ts` · `src/server/db/schema.ts` ·
`src/server/validation.ts` · `src/types.ts` · `src/lib/member.ts` (new) ·
`src/components/PledgeCard.tsx` (new) · `src/components/SimpleFarmerLogger.tsx` ·
`src/components/WhatsAppBroadcastCard.tsx` · `src/App.tsx` ·
`scripts/test-pledge-floor.ts` (new, wired into `npm test`)

### Acceptance

- Phone numbers normalise: `08012345678`, `+2348012345678` and `2348012345678` resolve to one
  member. This needs a test; it is the commonest source of duplicate identities in Nigerian apps.
- Four pledges publish no floor and say how many more are needed. Five publish one.
- An unverified member's pledge is counted in the encouragement total and excluded from the
  percentile. Test both.
- Re-pledging in the same week replaces rather than double-counting.
- `GET /api/prices` returns neither `farmerPhone` nor `memberPhone` without an admin token.
- Anonymous submission still works end to end with no device token present.

---

## 3. Hold-or-sell harvest clock

**Leverage rank 4. Effort M. Valuable at one user, which makes it the right cold-start feature.**

### Why

The app's copy claims 14–21 day shelf life as *holding leverage* but nothing models the clock.
The COP calculator answers an accounting question ("what did this cost me") when the farmer has a
timing question ("what is this worth on day 4 versus day 9, allowing for the chance it doesn't
sell at all"). This is the screen a farmer opens with a buyer standing in the greenhouse, and it
works with zero other members logged in — so it delivers value during the cold start when the
index cannot.

### Schema (`SCHEMA_VERSION` → 6)

```sql
-- When it was picked, not when it was sold. Enables real shelf-life and
-- days-to-sale statistics later; NULL for every existing record.
ALTER TABLE price_records
  ADD COLUMN IF NOT EXISTS harvested_on DATE;
```

Keep the `DATE` type-parser override in `src/server/db/client.ts` in mind: this comes back as a
raw `YYYY-MM-DD` string, which is what the clock arithmetic wants. Do not convert it to a `Date`
on the way in or a Jos harvest date will shift a day once the server runs in UTC.

### Pure module — `src/server/holdDecision.ts`

```ts
export interface HoldDecision {
  daysSinceHarvest: number;
  daysOfShelfLifeLeft: number;
  offerTotalNgn: number;
  floorTotalNgn: number;
  /** Expected total if held, discounted by the chance of not selling in time. */
  expectedIfHeldNgn: number;
  /** Probability this consignment does not sell before it is unsaleable, 0-1. */
  spoilRisk: number;
  copTotalNgn: number | null;
  recommendation: 'hold' | 'negotiate' | 'take_it' | 'take_it_cash_recovery';
  headline: string;
  reasoning: string[];
}

export function decideHoldOrSell(input: {
  type: PepperType;
  quantityKg: number;
  harvestedOn: string;          // 'YYYY-MM-DD'
  offerPerKg: number;
  rate: MarketRate;
  copPerKg: number | null;
  today?: Date;
}): HoldDecision;
```

Rules, all of which need comments explaining the market reason:

- Shelf life: 18 days from harvest for greenhouse produce, as the midpoint of the documented
  14–21 day range. Put it in one named constant, `GREENHOUSE_SHELF_LIFE_DAYS`, so a farmer's
  correction is a one-line change.
- `spoilRisk` rises non-linearly with days elapsed and must reach 1 at end of shelf life. Start
  with something transparently simple — `(daysSinceHarvest / shelfLife) ** 2` — and **label it in
  the UI as an estimate**. A fabricated precise probability is worse than an honest rough one.
- `expectedIfHeldNgn = rate.pricePerKg * quantityKg * (1 - spoilRisk)`. Where
  `rate.sufficient === false`, use the band target and say the expectation is based on the
  association target, not on observed sales.
- `take_it_cash_recovery` is the hard case the project already names: the offer is below COP but
  above zero and spoil risk is high, so marginal cash recovery beats a total write-off. This
  recommendation must say explicitly that it is a loss being limited, not a good price — a farmer
  must never read "take it" as "this was fair", because that number is what they will quote next
  time.
- `recommendation` never contradicts the floor silently. Recommending a below-floor sale must
  state that it is below the floor and why it is still the lesser loss.

### Endpoint

```
POST /api/hold-or-sell        public, rate limited (bucket 'hold-or-sell', 120/hr)
  body: { type, quantityKg, harvestedOn, offerPerKg, location? }
  200:  { success: true, data: { decision: HoldDecision, rate: MarketRate, hub } }
```

COP per kg comes from `store.listCopItems()`. `ProductionCostCalculator` already derives it
client-side as `sum(costItems[].costNgn) / avgYieldPerPlantKg` — the cost rows are per plant, and
the plant count cancels out — with `avgYieldPerPlantKg` defaulting to 4.0 and editable by the
farmer. **Extract that into `src/server/cop.ts` as part of this work** and have both the component
and this endpoint call it, taking yield per plant as an input with the same default. Two COP
figures would be the same class of bug as two going rates.

**Deterministic only. No Gemini on this path** — same rule as `/api/predict-price`: a farmer
mid-negotiation must never see a blank panel because a quota ran out.

### UI

`src/components/HoldOrSellCard.tsx`, reachable **ungated** from the offer-check verdict
("Should I wait?") and as its own screen:

- Harvest date picker defaulting to today, with quick taps: *today / yesterday / 3 days / a week*.
- A visual clock: days used vs. days left, turning amber then red.
- Three figures side by side: **take the offer now** / **the floor for this quantity** /
  **expected if you hold**, each in total naira for the consignment, not per kg. Per-kg is how
  buyers talk; totals are how decisions get made.
- The recommendation with its reasoning, and the copyable buyer reply from spec 1 when the
  recommendation is `hold` or `negotiate`.
- On submit of an actual sale, pass `harvestedOn` through so the dataset starts accumulating.

### Files

`src/server/holdDecision.ts` (new) · `src/server/cop.ts` (new — shared COP-per-kg, extracted from
`ProductionCostCalculator`) · `src/server/routes/holdOrSell.ts` (new) · `src/server/db/schema.ts` ·
`src/server/validation.ts` · `src/server/repositories/priceRecords.ts` · `src/types.ts` ·
`src/components/HoldOrSellCard.tsx` (new) · `src/components/OfferCheck.tsx` ·
`src/components/ProductionCostCalculator.tsx` · `src/App.tsx` ·
`scripts/test-hold-decision.ts` (new, wired into `npm test`)

### Acceptance

- Day 2, offer 30% below floor → `hold`, with the naira gap stated.
- Day 16, offer below COP but positive → `take_it_cash_recovery`, explicitly framed as limiting a
  loss and explicitly noting it is below the floor.
- A future harvest date is rejected at the boundary, not silently coerced.
- A harvest date beyond shelf life returns `daysOfShelfLifeLeft: 0` and `spoilRisk: 1` without
  producing a negative expected value.
- `harvestedOn` survives a round trip as the exact `YYYY-MM-DD` string it was sent as, with the
  server's `TZ` set to something other than UTC in the test.

---

## 4. Offline outbox, idempotent writes, and a Hausa / low-literacy mode

**Leverage rank 5. Effort M. Silently raises every other number in the product.**

### Why

Two failures, one release. First: on a bad connection a submission is honestly reported as failed
(correct) but the record is **permanently lost** — the farmer has to remember and retype it, and
they won't. Nigerian rural data is exactly the condition this app runs in. Second: the interface
assumes comfortable English literacy and a keyboard, which excludes part of the membership.

### Client: the outbox

- **PWA**: `public/manifest.webmanifest` + a service worker (Vite PWA plugin or a hand-rolled one
  — hand-rolled is likely smaller here). Cache the shell and the last successful
  `/api/market-rate` and `/api/price-bands` responses so the floor is readable with no network.
  **Stamp cached figures with their age** and refuse to show them as live: a stale floor presented
  as current is the same class of harm as the seed-data fallback in strategy §8.
- **`src/lib/outbox.ts`** (new): IndexedDB queue. A submission that cannot reach the server is
  queued and retried on `online` and on next launch, with backoff.
- **Wording is the whole feature.** A queued record says *"Saved on your phone — it will be sent
  when you have network"*, never *"Logged!"*. The contribution counter increments **only on
  server confirmation**, exactly as `recordContribution` already requires. An outbox that lies is
  worse than no outbox.
- A visible pending-items indicator with a manual "send now", so nothing is invisible.

### Server: idempotency (do this first — the outbox is unsafe without it)

```sql
-- Client-generated id so a retried submission cannot become two records.
ALTER TABLE price_records
  ADD COLUMN IF NOT EXISTS client_ref TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS price_records_client_ref_idx
  ON price_records (client_ref) WHERE client_ref IS NOT NULL;
```

`POST /api/prices` and `/api/prices/bulk` accept `clientRef`, and on conflict **return the
existing record with 200 rather than erroring** — a retry must be safe and must look like success.
`insertPriceRecords` becomes `ON CONFLICT (client_ref) DO NOTHING` plus a follow-up select for the
existing row. This also fixes duplicate submissions generally, which strategy §6 lists as an
integrity gap: same fix, two problems.

### Language and input

- **`src/lib/i18n.ts`** (new): a flat key → `{ en, ha }` dictionary and a `t()` helper. No i18n
  library — the string count is small and a dependency here costs more than it saves. Language
  choice in `localStorage`, toggle in the navbar.
- **Hausa first**, as the widest second language across the northern belt. Get the translation
  reviewed by a member; a machine-translated agricultural interface reads as untrustworthy to
  exactly the farmers it is meant to include, and trust is the product.
- `inputMode="numeric"` on every naira field, larger tap targets, and quick-tap price chips
  derived from the live band (never hardcoded).
- Prepare for voice logging (feature 12) by keeping the submission payload shape independent of
  the input method.

### Files

`src/lib/outbox.ts` (new) · `src/lib/i18n.ts` (new) · `public/manifest.webmanifest` (new) ·
`public/sw.js` (new) · `vite.config.ts` · `index.html` ·
`src/server/db/schema.ts` (`SCHEMA_VERSION` → 7) · `src/server/validation.ts` ·
`src/server/repositories/priceRecords.ts` · `src/server/store/memoryStore.ts` ·
`src/server/routes/prices.ts` · `src/App.tsx` · all components with user-facing strings ·
`scripts/test-outbox.ts` (new — pure queue logic, no browser needed)

### Acceptance

- Submitting with the network off queues the record, shows the honest queued wording, and does
  **not** increment the contribution count.
- Restoring the network flushes the queue; the count then increments once per record.
- The same `clientRef` submitted three times yields exactly one row and three successful responses.
- With the network off, the floor is still readable and visibly marked with its age.
- Switching to Hausa translates the offer check, the logger and the floor card with no layout
  breakage at 360px width.
- `npm run check:secrets` still passes (the service worker must not cache or embed anything from
  `.env`).

---

## 5. The WhatsApp bot

**Leverage rank 1. Effort L. Start the Meta application while building specs 1–4.**

### Why

The app has no outbound capability, so retention depends on farmers spontaneously recalling a URL
mid-negotiation. The group chat they are already in is read every day. This turns the index into
something that answers when a farmer texts it, and — sparingly — reaches back out to convert an
offer into a logged sale.

### Before writing code

- Meta WhatsApp Cloud API: business verification and template approval take real calendar time,
  usually longer than this feature takes to build. **Start the application first.**
- Pricing model: user-initiated (service) conversations have a monthly free allowance and a
  24-hour reply window; business-initiated conversations are charged per conversation by category
  and country. **Verify current Nigeria rates and the free-tier size yourself** — they change, and
  the whole cost case rests on them. Design inbound-first for that reason: the farmer texts, you
  answer free inside 24 hours. Outbound is a deliberate, small set of high-value templates.
- **Fallback if approval stalls:** the `wa.me` deep-link pattern already in
  `WhatsAppBroadcastCard` gets you most of the sharing value with zero platform dependency, and
  the daily human-posted broadcast gets you the habit. Ship those and keep going; do not let the
  bot block the roadmap.

### Schema (`SCHEMA_VERSION` → 8)

```sql
-- Multi-turn state, keyed by the farmer's number. Short-lived by design: a
-- stale conversation should expire, not resume three days later mid-question.
CREATE TABLE IF NOT EXISTS wa_sessions (
  phone       TEXT PRIMARY KEY,
  state       TEXT NOT NULL,
  context     JSONB NOT NULL DEFAULT '{}'::jsonb,
  expires_at  TIMESTAMPTZ NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inbound/outbound log, for debugging and for not double-answering a redelivery.
CREATE TABLE IF NOT EXISTS wa_messages (
  wa_message_id TEXT PRIMARY KEY,
  phone         TEXT NOT NULL,
  direction     TEXT NOT NULL CHECK (direction IN ('in', 'out')),
  body          TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Meta retries webhooks, so `wa_message_id` as the primary key is what stops one message being
answered twice.

### Endpoints

```
GET  /api/whatsapp/webhook    Meta verification challenge — echo hub.challenge when
                              hub.verify_token matches WHATSAPP_VERIFY_TOKEN (timingSafeEqual)
POST /api/whatsapp/webhook    inbound messages
```

- **Verify `X-Hub-Signature-256`** — HMAC SHA-256 of the raw body with `WHATSAPP_APP_SECRET`,
  compared with `timingSafeEqual`. This needs the **raw** body, so mount a
  `express.raw({ type: 'application/json' })` parser on this route specifically, before the
  global JSON parser can consume it. Reject unsigned requests with 403. This endpoint is a public
  write path into the index; an unverified one is an open door.
- **Respond 200 immediately**, then process. Meta retries aggressively on slow responses, and on
  a serverless host a slow handler is a duplicated one.
- Per-phone rate limit via the existing Postgres limiter (`rateLimit('whatsapp', 60)`).

### Environment

```
WHATSAPP_VERIFY_TOKEN     # webhook handshake
WHATSAPP_APP_SECRET       # signature verification
WHATSAPP_TOKEN            # send-message bearer token
WHATSAPP_PHONE_NUMBER_ID  # sender id
```

All server-side. **Never `VITE_`-prefixed.** Add `WHATSAPP_TOKEN` and `WHATSAPP_APP_SECRET` to the
sensitive-variable list in `scripts/check-bundle-secrets.mjs`, and to `.env.example` with empty
values. Report only `whatsapp.configured` as a boolean from `/api/health` — health output gets
pasted into chats, which is why the Gemini key is handled that way already.

### Command grammar — `src/server/whatsapp/commands.ts` (pure, fully testable)

| Farmer sends | Bot does |
| --- | --- |
| `3000 green jos` / `green 3000` / just `3000` | Offer check via `assessOffer` — verdict, floor, pledge count, a line to quote the buyer |
| `price` / `rate` / `farashi` | Today's rate and floor for their remembered hub |
| `sold 4200 green 80kg` | Logs an `actual_sale`, confirms, reports the new sample size |
| `offer 3000 green` | Logs a `buyer_offer` with `outcome: 'undecided'` |
| `refused` / `i refused` | Marks the last offer `refused` and adds it to the week's refusal count |
| `pledge 2300 green` | Records this week's pledge, replies with the holding count |
| `hub lagos` | Sets their hub |
| `help` / anything unparsed | The short command list, in their chosen language |

Parsing rules: numbers with or without `₦`, commas and `k` (`4.5k` → 4500); variety by keyword in
English or Hausa; hub by the same `resolveHub` the API already uses. **Ambiguity asks rather than
guesses** — a misparsed price becomes a record in the index, which is exactly what the validation
rules exist to prevent. Unparsed input is never silently dropped.

### Handlers — `src/server/whatsapp/handlers.ts`

Every handler composes the **existing** modules: `resolveHub`, `resolveMarketRate`, `assessOffer`,
`resolvePledgeFloor`, `decideHoldOrSell`, `store.*`. It must be impossible for the bot to report a
different figure from the website. If a handler needs a number no module provides, the module
gains it — never the handler.

An inbound message from a number not in `members` creates the member and marks it
`verified_at = now()`: a message received from a number **is** proof of that number. This is why
spec 2's verification design routes through WhatsApp — it is free, and it is stronger than SMS.

### Outbound, deliberately sparse

Three templates, no more, each earning its cost:

1. **Offer follow-up** (48–72h after an `undecided` or `refused` offer): *"Did that ₦3,000 offer
   become a sale? Reply with the price you got."* This is the single highest-value message in the
   system — it converts offers into the `actual_sale` records the index runs on.
2. **Weekly pledge prompt** (Monday): *"What is the lowest you will accept this week?"* — one
   reply sustains the coordination layer.
3. **Floor breach alert** (opt-in, per hub): *"3 green sales below ₦2,000 logged in Lagos this
   week."* Aggregate only. Never names a member — naming individuals would end contribution and
   is the fastest available way to destroy this project socially.

Opt-out must be one word (`stop`), honoured immediately and permanently, and tested.

### Files

`src/server/whatsapp/commands.ts` · `src/server/whatsapp/handlers.ts` ·
`src/server/whatsapp/client.ts` (send-message wrapper, the only file reading `WHATSAPP_TOKEN`) ·
`src/server/whatsapp/signature.ts` · `src/server/routes/whatsapp.ts` (all new) ·
`src/server/repositories/waSessions.ts` (new) · `src/server/store/index.ts` + `memoryStore.ts` ·
`src/server/db/schema.ts` · `src/server/app.ts` · `src/server/routes/health.ts` ·
`scripts/check-bundle-secrets.mjs` · `.env.example` ·
`scripts/test-whatsapp-commands.ts` (new, wired into `npm test`)

### Acceptance

- A request with a bad or absent `X-Hub-Signature-256` is rejected 403 and writes nothing.
- The same `wa_message_id` delivered twice produces exactly one reply and one record.
- `3000 green jos`, `₦3,000 green`, `green 3k jos` and `3000` (with a remembered hub) all produce
  the same verdict.
- The bot's quoted rate is byte-identical to `/api/market-rate` for the same hub and variety —
  assert this in a test, because it is the invariant most likely to rot.
- `stop` suppresses all future outbound for that number.
- An inbound message marks its sender verified, and their pledge then counts towards the floor.
- `npm run check:secrets` fails if `WHATSAPP_TOKEN` ever reaches the client bundle.

---

## Explicitly deferred, with reasons

| Item | Why not now |
| --- | --- |
| Accounts with passwords | Phone identity (spec 2) gets the same benefits at a fraction of the friction. Passwords would cost more adoption than the lurking they prevent. |
| Payments / escrow in-app | A licensed activity and a different product. Buyer payment *reputation* (feature 7) captures most of the value with none of the regulatory weight. |
| Buyer-facing portal | Not before the integrity floor in strategy §6 exists. Selling buyer seats while one person can fabricate five sales is selling something you cannot stand behind. |
| Caching `/api/predict-price` | Already designed in the `TODO(next release)` block in `src/server/routes/ai.ts`. Real but not adoption-critical; rate limiting caps the damage. |
| Native app | The web app plus a WhatsApp bot covers the channel. An install step is a conversion cliff. |
| Multi-crop expansion (tomatoes, cucumbers) | The product's entire credibility comes from being *specifically* about greenhouse bell peppers. Generalise only after the pepper index is load-bearing for a real group. |

---

## Suggested sequencing

```
Week 1-2    Credibility fixes (strategy §8 items 1-3) — no new features
Week 3-5    Spec 1  Offer check                       — ships alone, no dependencies
Week 6-9    Spec 2  Identity + pledge                 — unblocks 3, 4, 5
Week 10-13  Spec 3  Hold-or-sell clock
Then        Spec 4  Offline + Hausa                    — slot into any spare week
In parallel Spec 5  WhatsApp bot                       — Meta application from week 1
```

Spec 4's idempotency half (`client_ref`) can be pulled forward cheaply and is worth doing early:
it also closes the duplicate-submission integrity gap.
