/**
 * Schema DDL lives in TypeScript rather than a .sql file on purpose: the
 * production bundle is produced by esbuild and deployed to a serverless
 * runtime, where a sibling .sql file is not guaranteed to be present on disk.
 */

export const SCHEMA_VERSION = 1;

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
`;
