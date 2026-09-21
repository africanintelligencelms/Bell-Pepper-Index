export type PepperType = 'coloured' | 'green';

export type TransactionType = 'actual_sale' | 'buyer_offer' | 'farmer_asking';

export type ProductionMethod = 'greenhouse' | 'open_field';

export type QualityGrade = 'grade_a' | 'grade_b';

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
  generatedAt: string;
}
