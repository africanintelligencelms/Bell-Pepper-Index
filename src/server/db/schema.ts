/**
 * Schema DDL lives in TypeScript rather than a .sql file on purpose: the
 * production bundle is produced by esbuild and deployed to a serverless
 * runtime, where a sibling .sql file is not guaranteed to be present on disk.
 */

export const SCHEMA_VERSION = 4;

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version      INTEGER PRIMARY KEY,
  applied_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS price_records (
  id                TEXT PRIMARY KEY,
  type              TEXT NOT NULL CHECK (type IN ('coloured', 'green')),
  price_per_kg      NUMERIC(12, 2) NOT NULL CHECK (price_per_kg >= 0),
  quantity_kg       NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (quantity_kg >= 0),
  transaction_type  TEXT NOT NULL CHECK (transaction_type IN ('actual_sale', 'buyer_offer', 'farmer_asking')),
  production_method TEXT NOT NULL CHECK (production_method IN ('greenhouse', 'open_field')),
  quality_grade     TEXT NOT NULL CHECK (quality_grade IN ('grade_a', 'grade_b')),
  location          TEXT NOT NULL,
  recorded_on       DATE NOT NULL,
  farmer_name       TEXT NOT NULL,
  farmer_phone      TEXT NOT NULL DEFAULT '',
  notes             TEXT NOT NULL DEFAULT '',
  source            TEXT NOT NULL CHECK (source IN ('manual_entry', 'whatsapp_extracted', 'seed_data')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The dashboard always reads newest-first; the type/date index backs the
-- trend chart and the per-variety averages.
CREATE INDEX IF NOT EXISTS price_records_created_at_idx
  ON price_records (created_at DESC);
CREATE INDEX IF NOT EXISTS price_records_type_recorded_on_idx
  ON price_records (type, recorded_on DESC);

CREATE TABLE IF NOT EXISTS price_bands (
  hub                       TEXT PRIMARY KEY,
  coloured_min              NUMERIC(12, 2) NOT NULL CHECK (coloured_min >= 0),
  coloured_target           NUMERIC(12, 2) NOT NULL CHECK (coloured_target >= 0),
  coloured_max              NUMERIC(12, 2) NOT NULL CHECK (coloured_max >= 0),
  green_min                 NUMERIC(12, 2) NOT NULL CHECK (green_min >= 0),
  green_target              NUMERIC(12, 2) NOT NULL CHECK (green_target >= 0),
  green_max                 NUMERIC(12, 2) NOT NULL CHECK (green_max >= 0),
  logistics_from_jos_per_kg NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (logistics_from_jos_per_kg >= 0),
  notes                     TEXT NOT NULL DEFAULT '',
  sort_order                INTEGER NOT NULL DEFAULT 0,
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT price_bands_coloured_ordered CHECK (coloured_min <= coloured_target AND coloured_target <= coloured_max),
  CONSTRAINT price_bands_green_ordered    CHECK (green_min <= green_target AND green_target <= green_max)
);

CREATE TABLE IF NOT EXISTS cop_items (
  id          TEXT PRIMARY KEY,
  category    TEXT NOT NULL CHECK (category IN (
                'seedlings', 'substrate_nutrients', 'water_fuel_energy',
                'labor', 'pest_control', 'overhead')),
  label       TEXT NOT NULL,
  cost_ngn    NUMERIC(12, 2) NOT NULL CHECK (cost_ngn >= 0),
  is_variable BOOLEAN NOT NULL DEFAULT true,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS offtakers (
  id                     TEXT PRIMARY KEY,
  name                   TEXT NOT NULL,
  phone                  TEXT NOT NULL,
  location               TEXT NOT NULL,
  crops                  TEXT[] NOT NULL DEFAULT '{}',
  buyer_type             TEXT NOT NULL CHECK (buyer_type IN (
                           'hotel_supermarket', 'wholesale_market', 'aggregator', 'processor')),
  -- Community submissions land unverified. A buyer badge that anyone can mint
  -- is worse than no badge: farmers hand perishable harvests to these numbers.
  verified_by_community  BOOLEAN NOT NULL DEFAULT false,
  notes                  TEXT NOT NULL DEFAULT '',
  submitted_by           TEXT NOT NULL DEFAULT '',
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Verified buyers surface first; the directory is read far more than written.
CREATE INDEX IF NOT EXISTS offtakers_verified_created_idx
  ON offtakers (verified_by_community DESC, created_at DESC);

-- Fixed-window counters for the Gemini-backed endpoints. This lives in the
-- database rather than process memory because each serverless instance has its
-- own memory: an in-process limiter would let the quota be drained by simply
-- spreading requests across cold starts.
CREATE TABLE IF NOT EXISTS ai_rate_limits (
  bucket_key   TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  hits         INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket_key, window_start)
);

CREATE INDEX IF NOT EXISTS ai_rate_limits_window_idx
  ON ai_rate_limits (window_start);

-- v4: what happened to a buyer's offer.
--
-- A record of a lowball offer is only half the story; whether the farmer took
-- it is the half that matters. 'refused' is what lets the group see that
-- holding the line actually happens, which is the argument the index exists to
-- make. NULL on every record that is not an offer, and on offers logged before
-- this column existed.
ALTER TABLE price_records
  ADD COLUMN IF NOT EXISTS outcome TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'price_records_outcome_check'
  ) THEN
    ALTER TABLE price_records
      ADD CONSTRAINT price_records_outcome_check
      CHECK (outcome IS NULL OR outcome IN ('accepted', 'refused', 'undecided'));
  END IF;
END $$;

-- v4: offers checked, as a bare counter.
--
-- Offers checked per week is the one metric that shows the app is being
-- consulted at the moment a farmer is actually deciding, rather than admired
-- afterwards. It deliberately carries no identity: it is a count, not a log of
-- who is negotiating what, and nothing in the app reads it per person.
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

-- v4: what members say they will refuse this week.
--
-- This is the opposite mechanism to a floor derived from submissions, and the
-- difference is the whole point. A floor computed from what buyers *paid*
-- follows the market down and stops being resistance — which is why
-- price_bands stays admin-set. A floor computed from what members commit to
-- *refuse* is resistance by construction. Do not "unify" the two.
--
-- pledge_key is an opaque per-device id, not a verified identity, so a pledge
-- floor is published as self-reported and never as an association decision.
-- The verified column exists so phone identity can be layered on later without
-- a second table: the aggregation already separates the two populations.
CREATE TABLE IF NOT EXISTS price_pledges (
  pledge_key   TEXT NOT NULL,
  hub          TEXT NOT NULL,
  type         TEXT NOT NULL CHECK (type IN ('coloured', 'green')),
  min_per_kg   NUMERIC(12, 2) NOT NULL CHECK (min_per_kg >= 0),
  week_start   DATE NOT NULL,
  verified     BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (pledge_key, hub, type, week_start)
);

CREATE INDEX IF NOT EXISTS price_pledges_week_idx
  ON price_pledges (week_start DESC, hub, type);
`;
