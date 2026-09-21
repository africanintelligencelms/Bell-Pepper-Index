import { PriceRecord } from '../../types.js';
import { query } from '../db/client.js';

/**
 * Postgres returns NUMERIC as a string to preserve precision. Every numeric
 * column therefore has to be coerced explicitly on the way out.
 */
interface PriceRecordRow {
  id: string;
  type: string;
  price_per_kg: string;
  quantity_kg: string;
  transaction_type: string;
  production_method: string;
  quality_grade: string;
  location: string;
  recorded_on: string;
  farmer_name: string;
  farmer_phone: string;
  notes: string;
  source: string;
  created_at: Date;
}

function toPriceRecord(row: PriceRecordRow): PriceRecord {
  return {
    id: row.id,
    type: row.type as PriceRecord['type'],
    pricePerKg: Number(row.price_per_kg),
    quantityKg: Number(row.quantity_kg),
    transactionType: row.transaction_type as PriceRecord['transactionType'],
    productionMethod: row.production_method as PriceRecord['productionMethod'],
    qualityGrade: row.quality_grade as PriceRecord['qualityGrade'],
    location: row.location,
    date: row.recorded_on,
    farmerName: row.farmer_name,
    farmerPhone: row.farmer_phone,
    notes: row.notes,
    source: row.source as PriceRecord['source'],
    createdAt: row.created_at.toISOString(),
  };
}

const SELECT_COLUMNS = `
  id, type, price_per_kg, quantity_kg, transaction_type, production_method,
  quality_grade, location, recorded_on, farmer_name, farmer_phone, notes, source, created_at
`;

export interface ListOptions {
  limit?: number;
  offset?: number;
}

export async function listPriceRecords(options: ListOptions = {}): Promise<PriceRecord[]> {
  const limit = Math.min(Math.max(options.limit ?? 500, 1), 2000);
  const offset = Math.max(options.offset ?? 0, 0);

  const { rows } = await query<PriceRecordRow>(
    `SELECT ${SELECT_COLUMNS} FROM price_records
     ORDER BY created_at DESC, id DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset],
  );

  return rows.map(toPriceRecord);
}

export async function countPriceRecords(): Promise<number> {
  const { rows } = await query<{ count: string }>('SELECT count(*)::text AS count FROM price_records');
  return Number(rows[0].count);
}

export async function insertPriceRecords(records: PriceRecord[]): Promise<PriceRecord[]> {
  if (records.length === 0) return [];

  // One multi-row INSERT keeps a WhatsApp bulk import to a single round trip,
  // which matters when the database is a network hop away from the lambda.
  const values: unknown[] = [];
  const tuples = records.map((record, index) => {
    const base = index * 14;
    values.push(
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
    );
    const placeholders = Array.from({ length: 14 }, (_, i) => `$${base + i + 1}`);
    return `(${placeholders.join(', ')})`;
  });

  const { rows } = await query<PriceRecordRow>(
    `INSERT INTO price_records (
       id, type, price_per_kg, quantity_kg, transaction_type, production_method,
       quality_grade, location, recorded_on, farmer_name, farmer_phone, notes, source, created_at
     ) VALUES ${tuples.join(', ')}
     ON CONFLICT (id) DO NOTHING
     RETURNING ${SELECT_COLUMNS}`,
    values,
  );

  return rows.map(toPriceRecord);
}

export async function deletePriceRecord(id: string): Promise<boolean> {
  const { rowCount } = await query('DELETE FROM price_records WHERE id = $1', [id]);
  return (rowCount ?? 0) > 0;
}

/**
 * Samples behind the published going rate: greenhouse produce that actually
 * sold, for one variety, no older than `sinceDate`. Filtering in SQL keeps the
 * payload to the handful of rows the median needs rather than the whole index.
 */
export async function listRateSamples(
  type: string,
  sinceDate: string,
): Promise<{ pricePerKg: number; date: string }[]> {
  const { rows } = await query<{ price_per_kg: string; recorded_on: string }>(
    `SELECT price_per_kg, recorded_on
     FROM price_records
     WHERE type = $1
       AND production_method = 'greenhouse'
       AND transaction_type = 'actual_sale'
       AND recorded_on >= $2
     ORDER BY recorded_on DESC`,
    [type, sinceDate],
  );
  return rows.map((r) => ({ pricePerKg: Number(r.price_per_kg), date: r.recorded_on }));
}
