import { CostBreakdownItem, UnifiedPriceBand } from '../../types.js';
import { query } from '../db/client.js';

interface PriceBandRow {
  hub: string;
  coloured_min: string;
  coloured_target: string;
  coloured_max: string;
  green_min: string;
  green_target: string;
  green_max: string;
  logistics_from_jos_per_kg: string;
  notes: string;
}

interface CopItemRow {
  id: string;
  category: string;
  label: string;
  cost_ngn: string;
  is_variable: boolean;
}

function toPriceBand(row: PriceBandRow): UnifiedPriceBand {
  return {
    hub: row.hub,
    colouredMin: Number(row.coloured_min),
    colouredTarget: Number(row.coloured_target),
    colouredMax: Number(row.coloured_max),
    greenMin: Number(row.green_min),
    greenTarget: Number(row.green_target),
    greenMax: Number(row.green_max),
    logisticsFromJosPerKg: Number(row.logistics_from_jos_per_kg),
    notes: row.notes,
  };
}

function toCopItem(row: CopItemRow): CostBreakdownItem {
  return {
    id: row.id,
    category: row.category as CostBreakdownItem['category'],
    label: row.label,
    costNgn: Number(row.cost_ngn),
    isVariable: row.is_variable,
  };
}

export async function listPriceBands(): Promise<UnifiedPriceBand[]> {
  const { rows } = await query<PriceBandRow>(
    `SELECT hub, coloured_min, coloured_target, coloured_max,
            green_min, green_target, green_max,
            logistics_from_jos_per_kg, notes
     FROM price_bands
     ORDER BY sort_order ASC, hub ASC`,
  );
  return rows.map(toPriceBand);
}

/**
 * Upsert rather than insert: the association revises an existing hub's floor
 * far more often than it adds a new hub.
 */
export async function upsertPriceBand(band: UnifiedPriceBand): Promise<UnifiedPriceBand> {
  const { rows } = await query<PriceBandRow>(
    `INSERT INTO price_bands (
       hub, coloured_min, coloured_target, coloured_max,
       green_min, green_target, green_max,
       logistics_from_jos_per_kg, notes,
       sort_order
     ) VALUES (
       $1,$2,$3,$4,$5,$6,$7,$8,$9,
       COALESCE((SELECT max(sort_order) + 1 FROM price_bands), 0)
     )
     ON CONFLICT (hub) DO UPDATE SET
       coloured_min              = EXCLUDED.coloured_min,
       coloured_target           = EXCLUDED.coloured_target,
       coloured_max              = EXCLUDED.coloured_max,
       green_min                 = EXCLUDED.green_min,
       green_target              = EXCLUDED.green_target,
       green_max                 = EXCLUDED.green_max,
       logistics_from_jos_per_kg = EXCLUDED.logistics_from_jos_per_kg,
       notes                     = EXCLUDED.notes,
       updated_at                = now()
     RETURNING hub, coloured_min, coloured_target, coloured_max,
               green_min, green_target, green_max,
               logistics_from_jos_per_kg, notes`,
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
  return toPriceBand(rows[0]);
}

export async function deletePriceBand(hub: string): Promise<boolean> {
  const { rowCount } = await query('DELETE FROM price_bands WHERE hub = $1', [hub]);
  return (rowCount ?? 0) > 0;
}

export async function listCopItems(): Promise<CostBreakdownItem[]> {
  const { rows } = await query<CopItemRow>(
    `SELECT id, category, label, cost_ngn, is_variable
     FROM cop_items
     ORDER BY sort_order ASC, id ASC`,
  );
  return rows.map(toCopItem);
}

export async function upsertCopItem(item: CostBreakdownItem): Promise<CostBreakdownItem> {
  const { rows } = await query<CopItemRow>(
    `INSERT INTO cop_items (id, category, label, cost_ngn, is_variable, sort_order)
     VALUES ($1,$2,$3,$4,$5, COALESCE((SELECT max(sort_order) + 1 FROM cop_items), 0))
     ON CONFLICT (id) DO UPDATE SET
       category    = EXCLUDED.category,
       label       = EXCLUDED.label,
       cost_ngn    = EXCLUDED.cost_ngn,
       is_variable = EXCLUDED.is_variable,
       updated_at  = now()
     RETURNING id, category, label, cost_ngn, is_variable`,
    [item.id, item.category, item.label, item.costNgn, item.isVariable],
  );
  return toCopItem(rows[0]);
}

export async function deleteCopItem(id: string): Promise<boolean> {
  const { rowCount } = await query('DELETE FROM cop_items WHERE id = $1', [id]);
  return (rowCount ?? 0) > 0;
}
