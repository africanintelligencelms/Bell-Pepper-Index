import { randomUUID } from 'crypto';
import {
  CostBreakdownItem,
  OfftakerContact,
  PepperType,
  PriceRecord,
  ProductionMethod,
  QualityGrade,
  TransactionType,
  UnifiedPriceBand,
} from '../types';

/** Thrown for bad client input; the error handler turns this into a 400. */
export class ValidationError extends Error {
  readonly status = 400;
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

const PEPPER_TYPES: PepperType[] = ['coloured', 'green'];
const TRANSACTION_TYPES: TransactionType[] = ['actual_sale', 'buyer_offer', 'farmer_asking'];
const PRODUCTION_METHODS: ProductionMethod[] = ['greenhouse', 'open_field'];
const QUALITY_GRADES: QualityGrade[] = ['grade_a', 'grade_b'];
const SOURCES: PriceRecord['source'][] = ['manual_entry', 'whatsapp_extracted', 'seed_data'];
const BUYER_TYPES: OfftakerContact['buyerType'][] = [
  'hotel_supermarket',
  'wholesale_market',
  'aggregator',
  'processor',
];
const COP_CATEGORIES: CostBreakdownItem['category'][] = [
  'seedlings',
  'substrate_nutrients',
  'water_fuel_energy',
  'labor',
  'pest_control',
  'overhead',
];

/** A price this far above the market is a typo or an attack, not a quote. */
const MAX_PRICE_NGN = 10_000_000;
const MAX_QUANTITY_KG = 1_000_000;
const MAX_BULK_RECORDS = 500;

function oneOf<T extends string>(value: unknown, allowed: T[], field: string, fallback?: T): T {
  if (typeof value === 'string' && (allowed as string[]).includes(value)) return value as T;
  if (fallback !== undefined) return fallback;
  throw new ValidationError(`${field} must be one of: ${allowed.join(', ')}`);
}

function requiredNumber(value: unknown, field: string, min: number, max: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    throw new ValidationError(`${field} must be a number`);
  }
  if (parsed < min || parsed > max) {
    throw new ValidationError(`${field} must be between ${min} and ${max}`);
  }
  // Two decimals matches the NUMERIC(12,2) columns; more precision is noise
  // for a per-kilogram Naira price.
  return Math.round(parsed * 100) / 100;
}

function optionalNumber(value: unknown, field: string, min: number, max: number, fallback: number): number {
  if (value === undefined || value === null || value === '') return fallback;
  return requiredNumber(value, field, min, max);
}

function text(value: unknown, field: string, maxLength: number, fallback = ''): string {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== 'string') throw new ValidationError(`${field} must be a string`);
  const trimmed = value.trim();
  if (trimmed.length === 0) return fallback;
  if (trimmed.length > maxLength) {
    throw new ValidationError(`${field} must be ${maxLength} characters or fewer`);
  }
  return trimmed;
}

export function todayIso(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Accepts 'YYYY-MM-DD' and also the full ISO timestamps the AI extractor
 * sometimes produces; anything else falls back to today rather than handing
 * Postgres a value its DATE column will reject.
 */
function isoDate(value: unknown): string {
  if (typeof value !== 'string') return todayIso();
  const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})/);
  if (!match) return todayIso();
  const candidate = match[1];
  const parsed = new Date(`${candidate}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return todayIso();
  return candidate;
}

function newId(prefix: string): string {
  return `${prefix}-${randomUUID()}`;
}

export interface PriceRecordDefaults {
  source?: PriceRecord['source'];
  farmerName?: string;
  location?: string;
}

export function parsePriceRecord(input: unknown, defaults: PriceRecordDefaults = {}): PriceRecord {
  if (typeof input !== 'object' || input === null) {
    throw new ValidationError('Request body must be an object');
  }
  const body = input as Record<string, unknown>;

  return {
    id: text(body.id, 'id', 100) || newId('rec'),
    type: oneOf(body.type, PEPPER_TYPES, 'type', 'green'),
    // A price is the whole point of the record, so it is the one field with no
    // default — a silent 0 would drag every community average down.
    pricePerKg: requiredNumber(body.pricePerKg, 'pricePerKg', 1, MAX_PRICE_NGN),
    quantityKg: optionalNumber(body.quantityKg, 'quantityKg', 0, MAX_QUANTITY_KG, 50),
    transactionType: oneOf(body.transactionType, TRANSACTION_TYPES, 'transactionType', 'actual_sale'),
    productionMethod: oneOf(body.productionMethod, PRODUCTION_METHODS, 'productionMethod', 'greenhouse'),
    qualityGrade: oneOf(body.qualityGrade, QUALITY_GRADES, 'qualityGrade', 'grade_a'),
    location: text(body.location, 'location', 200, defaults.location ?? 'Jos, Plateau State'),
    date: isoDate(body.date),
    farmerName: text(body.farmerName, 'farmerName', 120, defaults.farmerName ?? 'Anonymous Farmer'),
    farmerPhone: text(body.farmerPhone, 'farmerPhone', 40),
    notes: text(body.notes, 'notes', 2000),
    source: defaults.source ?? oneOf(body.source, SOURCES, 'source', 'manual_entry'),
    createdAt: new Date().toISOString(),
  };
}

export function parsePriceRecordBatch(input: unknown, defaults: PriceRecordDefaults = {}): PriceRecord[] {
  if (!Array.isArray(input) || input.length === 0) {
    throw new ValidationError('records must be a non-empty array');
  }
  if (input.length > MAX_BULK_RECORDS) {
    throw new ValidationError(`records may contain at most ${MAX_BULK_RECORDS} entries per request`);
  }
  return input.map((item, index) => {
    try {
      return parsePriceRecord(item, defaults);
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'invalid record';
      throw new ValidationError(`records[${index}]: ${reason}`);
    }
  });
}

export function parsePriceBand(input: unknown): UnifiedPriceBand {
  if (typeof input !== 'object' || input === null) {
    throw new ValidationError('Request body must be an object');
  }
  const body = input as Record<string, unknown>;

  const hub = text(body.hub, 'hub', 160);
  if (!hub) throw new ValidationError('hub is required');

  const band: UnifiedPriceBand = {
    hub,
    colouredMin: requiredNumber(body.colouredMin, 'colouredMin', 0, MAX_PRICE_NGN),
    colouredTarget: requiredNumber(body.colouredTarget, 'colouredTarget', 0, MAX_PRICE_NGN),
    colouredMax: requiredNumber(body.colouredMax, 'colouredMax', 0, MAX_PRICE_NGN),
    greenMin: requiredNumber(body.greenMin, 'greenMin', 0, MAX_PRICE_NGN),
    greenTarget: requiredNumber(body.greenTarget, 'greenTarget', 0, MAX_PRICE_NGN),
    greenMax: requiredNumber(body.greenMax, 'greenMax', 0, MAX_PRICE_NGN),
    logisticsFromJosPerKg: optionalNumber(body.logisticsFromJosPerKg, 'logisticsFromJosPerKg', 0, MAX_PRICE_NGN, 0),
    notes: text(body.notes, 'notes', 2000),
  };

  // Mirrors the CHECK constraints so the caller gets a readable message
  // instead of a raw Postgres constraint violation.
  if (band.colouredMin > band.colouredTarget || band.colouredTarget > band.colouredMax) {
    throw new ValidationError('coloured band must satisfy min <= target <= max');
  }
  if (band.greenMin > band.greenTarget || band.greenTarget > band.greenMax) {
    throw new ValidationError('green band must satisfy min <= target <= max');
  }

  return band;
}

export function parseCopItem(input: unknown): CostBreakdownItem {
  if (typeof input !== 'object' || input === null) {
    throw new ValidationError('Request body must be an object');
  }
  const body = input as Record<string, unknown>;

  const label = text(body.label, 'label', 200);
  if (!label) throw new ValidationError('label is required');

  return {
    id: text(body.id, 'id', 100) || newId('cop'),
    category: oneOf(body.category, COP_CATEGORIES, 'category'),
    label,
    costNgn: requiredNumber(body.costNgn, 'costNgn', 0, MAX_PRICE_NGN),
    isVariable: body.isVariable === undefined ? true : Boolean(body.isVariable),
  };
}

const MAX_CROPS = 12;

/**
 * Nigerian numbers arrive as "+234 803 632 9227", "0803 632 9227" or
 * "234-803-632-9227". Only the shape is checked — a directory that rejected an
 * oddly formatted but real buyer would cost a farmer a sale.
 */
function phone(value: unknown): string {
  const raw = text(value, 'phone', 40);
  if (!raw) throw new ValidationError('phone is required');
  const digits = raw.replace(/[^0-9]/g, '');
  if (digits.length < 10 || digits.length > 15) {
    throw new ValidationError('phone must contain between 10 and 15 digits');
  }
  return raw;
}

function cropList(value: unknown): string[] {
  // The form submits a comma-separated string; the API also accepts an array.
  const raw = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : [];

  const crops = raw
    .map((crop) => String(crop).trim())
    .filter((crop) => crop.length > 0 && crop.length <= 80);

  if (crops.length === 0) throw new ValidationError('at least one crop is required');
  return crops.slice(0, MAX_CROPS);
}

/**
 * `verifiedByCommunity` is deliberately not read from the body. A submission
 * that could set its own verified flag would make the badge meaningless, and
 * the badge is what a farmer leans on before trusting a stranger with a
 * harvest. Only the admin verify endpoint can change it.
 */
export function parseOfftaker(input: unknown): OfftakerContact {
  if (typeof input !== 'object' || input === null) {
    throw new ValidationError('Request body must be an object');
  }
  const body = input as Record<string, unknown>;

  const name = text(body.name, 'name', 160);
  if (!name) throw new ValidationError('name is required');

  return {
    id: newId('off'),
    name,
    phone: phone(body.phone),
    location: text(body.location, 'location', 200, 'Nigeria'),
    crops: cropList(body.crops),
    buyerType: oneOf(body.buyerType, BUYER_TYPES, 'buyerType', 'aggregator'),
    verifiedByCommunity: false,
    notes: text(body.notes, 'notes', 2000, 'Added by community member'),
    submittedBy: text(body.submittedBy, 'submittedBy', 120),
  };
}
