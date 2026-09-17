import { OfftakerContact } from '../../types';
import { query } from '../db/client';

interface OfftakerRow {
  id: string;
  name: string;
  phone: string;
  location: string;
  crops: string[];
  buyer_type: string;
  verified_by_community: boolean;
  notes: string;
  submitted_by: string;
  created_at: Date;
}

function toOfftaker(row: OfftakerRow): OfftakerContact {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    location: row.location,
    crops: row.crops ?? [],
    buyerType: row.buyer_type as OfftakerContact['buyerType'],
    verifiedByCommunity: row.verified_by_community,
    notes: row.notes,
    submittedBy: row.submitted_by,
    createdAt: row.created_at.toISOString(),
  };
}

const SELECT_COLUMNS = `
  id, name, phone, location, crops, buyer_type,
  verified_by_community, notes, submitted_by, created_at
`;

/** Verified buyers first — a farmer scanning the list should meet vetted contacts before unvetted ones. */
export async function listOfftakers(): Promise<OfftakerContact[]> {
  const { rows } = await query<OfftakerRow>(
    `SELECT ${SELECT_COLUMNS} FROM offtakers
     ORDER BY verified_by_community DESC, created_at DESC`,
  );
  return rows.map(toOfftaker);
}

export async function insertOfftaker(offtaker: OfftakerContact): Promise<OfftakerContact> {
  const { rows } = await query<OfftakerRow>(
    `INSERT INTO offtakers (
       id, name, phone, location, crops, buyer_type,
       verified_by_community, notes, submitted_by
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT (id) DO NOTHING
     RETURNING ${SELECT_COLUMNS}`,
    [
      offtaker.id,
      offtaker.name,
      offtaker.phone,
      offtaker.location,
      offtaker.crops,
      offtaker.buyerType,
      offtaker.verifiedByCommunity,
      offtaker.notes,
      offtaker.submittedBy ?? '',
    ],
  );
  return rows.length > 0 ? toOfftaker(rows[0]) : offtaker;
}

export async function setOfftakerVerified(
  id: string,
  verified: boolean,
): Promise<OfftakerContact | null> {
  const { rows } = await query<OfftakerRow>(
    `UPDATE offtakers
     SET verified_by_community = $2, updated_at = now()
     WHERE id = $1
     RETURNING ${SELECT_COLUMNS}`,
    [id, verified],
  );
  return rows.length > 0 ? toOfftaker(rows[0]) : null;
}

export async function deleteOfftaker(id: string): Promise<boolean> {
  const { rowCount } = await query('DELETE FROM offtakers WHERE id = $1', [id]);
  return (rowCount ?? 0) > 0;
}
