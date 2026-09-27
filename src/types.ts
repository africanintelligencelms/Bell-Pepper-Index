export type PepperType = 'coloured' | 'green';

export type TransactionType = 'actual_sale' | 'buyer_offer' | 'farmer_asking';

export type ProductionMethod = 'greenhouse' | 'open_field';

export type QualityGrade = 'grade_a' | 'grade_b';

/**
 * What became of a buyer's offer. Only ever set on a `buyer_offer` record: an
 * outcome on a completed sale is meaningless, and an outcome on an asking price
 * is not the farmer's to report.
 */
export type OfferOutcome = 'accepted' | 'refused' | 'undecided';

export interface PriceRecord {
  id: string;
  type: PepperType;
  pricePerKg: number;
  quantityKg: number;
  transactionType: TransactionType;
  productionMethod: ProductionMethod;
  qualityGrade: QualityGrade;
  location: string;
  date: string; // e.g. YYYY-MM-DD or readable
  farmerName: string;
  farmerPhone?: string;
  notes?: string;
  source: 'manual_entry' | 'whatsapp_extracted' | 'seed_data';
  createdAt: string;
  outcome?: OfferOutcome;
}

export interface PriceStats {
  averagePrice: number;
  medianPrice: number;
  minPrice: number;
  maxPrice: number;
  totalQuantityKg: number;
  totalTransactions: number;
  recentCount: number;
}

export interface WhatsAppParsedEntry {
  id: string;
  type: PepperType;
  pricePerKg: number;
  quantityKg: number;
  transactionType: TransactionType;
  productionMethod: ProductionMethod;
  location: string;
  date: string;
  senderName: string;
  senderPhone?: string;
  rawContextText: string;
  confidenceScore: number;
  selected?: boolean;
}

export interface PricePredictionResult {
  recommendedGreenPrice: number;
  recommendedColouredPrice: number;
  colouredPremiumSpread: number;
  marketTrend: 'rising' | 'stable' | 'falling';
  supplyRiskLevel: 'low' | 'moderate' | 'high';
  keyInsights: string[];
  offtakerAlerts: string[];
  marketSummary: string;
}

export interface UnifiedPriceBand {
  hub: string;
  colouredMin: number;
  colouredTarget: number;
  colouredMax: number;
  greenMin: number;
  greenTarget: number;
  greenMax: number;
  logisticsFromJosPerKg: number;
  notes: string;
}

export interface OfftakerContact {
  id: string;
  name: string;
  phone: string;
  location: string;
  crops: string[]; // e.g. ['Bell Peppers (Coloured & Green)', 'Cucumbers', 'Tomatoes']
  buyerType: 'hotel_supermarket' | 'wholesale_market' | 'aggregator' | 'processor';
  /**
   * Only an admin can set this. A community submission arrives false and is
   * shown as unverified until someone with the token vouches for the buyer.
   */
  verifiedByCommunity: boolean;
  notes: string;
  /** Name the submitting farmer gave, for follow-up. Empty for seeded entries. */
  submittedBy?: string;
  createdAt?: string;
}

export interface CostBreakdownItem {
  id: string;
  category: 'seedlings' | 'substrate_nutrients' | 'water_fuel_energy' | 'labor' | 'pest_control' | 'overhead';
  label: string;
  costNgn: number;
  isVariable: boolean; // variable vs fixed/sunk
}

export interface MarketFilter {
  type: 'all' | 'coloured' | 'green';
  location: string;
  productionMethod: 'all' | 'greenhouse' | 'open_field';
  transactionType: 'all' | 'actual_sale' | 'buyer_offer' | 'farmer_asking';
  timeFrameDays: number; // 7, 14, 30, 90
}

/** One variety's published going rate, as computed by GET /api/market-rate. */
export interface MarketRate {
  type: PepperType;
  pricePerKg: number;
  basis: 'community_median' | 'association_band';
  sufficient: boolean;
  sampleSize: number;
  windowDays: number;
  low: number | null;
  high: number | null;
  band: { min: number; target: number; max: number } | null;
  withinBand: boolean | null;
  note: string;
}

export interface MarketRateResponse {
  hub: string | null;
  green: MarketRate;
  coloured: MarketRate;
  /**
   * What members pledged to refuse below, this week, for this hub. Null when no
   * band is configured. Distinct from `green.band`, which an admin set: see
   * src/server/pledgeFloor.ts for why the two must not be merged.
   */
  greenPledge?: PledgeFloor | null;
  colouredPledge?: PledgeFloor | null;
  generatedAt: string;
}

/** How far an offer sits from the floor and the published rate. */
export type VerdictLevel = 'below_floor' | 'below_market' | 'at_market' | 'above_market';

export interface OfferVerdict {
  level: VerdictLevel;
  /** Signed % difference from the published rate; null when the rate is thin. */
  vsRatePct: number | null;
  /** Signed % difference from the hub floor; null when no band is configured. */
  vsFloorPct: number | null;
  /**
   * What taking this offer costs against the floor, across the whole
   * consignment. Per-kg is how buyers talk; the total is what decides.
   */
  shortfallNgn: number | null;
  headline: string;
  /** Copyable message for the farmer to send the buyer. */
  buyerReply: string;
  reasoning: string[];
}

export interface OfferCheckResponse {
  hub: string | null;
  verdict: OfferVerdict;
  rate: MarketRate;
  generatedAt: string;
}

/**
 * The floor members have pledged to this week, as distinct from the band an
 * admin set. Self-reported until phone identity exists, and labelled as such.
 */
export interface PledgeFloor {
  hub: string;
  type: PepperType;
  floorPerKg: number | null;
  /** Everyone who pledged, verified or not — used only for encouragement copy. */
  pledgeCount: number;
  /** Pledges that actually count towards the published figure. */
  countedPledges: number;
  /** Members pledging at or above the published floor: the coordination number. */
  holdingCount: number;
  weekStart: string;
  sufficient: boolean;
  note: string;
}

export interface PledgeSummaryResponse {
  hub: string | null;
  weekStart: string;
  green: PledgeFloor;
  coloured: PledgeFloor;
  /** This device's own pledges for the week, so the form can show them. */
  mine: { type: PepperType; minPerKg: number }[];
}

export interface OfferCheckSummary {
  /** Offers checked in the last 7 days. */
  checksLast7Days: number;
  /** Offers below the floor that a member reported refusing, last 7 days. */
  refusedLast7Days: number;
}
