import { UnifiedPriceBand, OfftakerContact, CostBreakdownItem } from '../types';

export const DEFAULT_PRICE_BANDS: UnifiedPriceBand[] = [
  {
    hub: 'Jos Farm Gate (Plateau)',
    colouredMin: 6500,
    colouredTarget: 7000,
    colouredMax: 7500,
    greenMin: 4000,
    greenTarget: 4500,
    greenMax: 5000,
    logisticsFromJosPerKg: 0,
    notes: 'Primary greenhouse production belt. Target floor for farmgate pickup without interstate freight.'
  },
  {
    hub: 'Abuja (FCT) Direct Offtake',
    colouredMin: 7200,
    colouredTarget: 7800,
    colouredMax: 8500,
    greenMin: 4500,
    greenTarget: 5000,
    greenMax: 5500,
    logisticsFromJosPerKg: 200,
    notes: 'Hotels, supermarkets & high-end green grocers in Maitama, Garki & Wuse 2.'
  },
  {
    hub: 'Lagos (Mile 12 / Retail / Hotels)',
    colouredMin: 7800,
    colouredTarget: 8500,
    colouredMax: 9500,
    greenMin: 4800,
    greenTarget: 5500,
    greenMax: 6000,
    logisticsFromJosPerKg: 450,
    notes: 'Includes interstate truck freight (₦400-₦500/kg). Offtakers trying to buy below ₦4,800 for green are undercutting!'
  },
  {
    hub: 'Kano / North Hubs',
    colouredMin: 6800,
    colouredTarget: 7400,
    colouredMax: 8000,
    greenMin: 4200,
    greenTarget: 4700,
    greenMax: 5200,
    logisticsFromJosPerKg: 250,
    notes: 'Commercial trade hub. Wholesale buyers and institutional catering.'
  }
];

export const VERIFIED_OFFTAKERS: OfftakerContact[] = [
  {
    id: 'off-1',
    name: 'Yakubu (Community Shared Offtaker)',
    phone: '+234 803 632 9227',
    location: 'Plateau / Abuja / Northern Transit',
    crops: ['Cucumbers', 'Greenhouse Bell Peppers', 'Tomatoes'],
    buyerType: 'aggregator',
    verifiedByCommunity: true,
    notes: 'Directly linked up in the Greenhouse Farmers WhatsApp group for cucumber and pepper harvests.'
  },
  {
    id: 'off-2',
    name: 'Alhaji Magaji Produce Logistics',
    phone: '+234 803 519 5274',
    location: 'Mile 12 Market, Lagos',
    crops: ['Coloured Bell Peppers', 'Green Peppers'],
    buyerType: 'wholesale_market',
    verifiedByCommunity: true,
    notes: 'Takes 100kg - 500kg weekly shipments from Jos East and Bukuru.'
  },
  {
    id: 'off-3',
    name: 'Prime Green Grocery & Hospitality',
    phone: '+234 816 085 4630',
    location: 'Abuja (FCT)',
    crops: ['Coloured Bell Peppers (Red/Yellow)', 'English Cucumbers', 'Cherry Tomatoes'],
    buyerType: 'hotel_supermarket',
    verifiedByCommunity: true,
    notes: 'Pays premium (+15%) for Grade A unbruised greenhouse harvest with thick pericarps.'
  },
  {
    id: 'off-4',
    name: 'Dafom Farm Aggregation Hub',
    phone: '+234 906 790 3161',
    location: 'Kwang Zion High Junction, Jos',
    crops: ['Greenhouse Bell Peppers', 'Cucumbers'],
    buyerType: 'aggregator',
    verifiedByCommunity: true,
    notes: 'Coordinates joint waybill trucks to southern markets to reduce logistics per kg.'
  }
];

export const INITIAL_COP_BREAKDOWN: CostBreakdownItem[] = [
  { id: 'c-1', category: 'seedlings', label: 'Hybrid Seedlings (Indeterminate varieties)', costNgn: 450, isVariable: false },
  { id: 'c-2', category: 'substrate_nutrients', label: 'Cocopeat, Perlite & Grow Bags', costNgn: 600, isVariable: false },
  { id: 'c-3', category: 'substrate_nutrients', label: 'Soluble Fertigation Salts (CaNO3, KNO3, MgSO4)', costNgn: 1200, isVariable: true },
  { id: 'c-4', category: 'water_fuel_energy', label: 'Pumping Power (Solar / Diesel Gen for fertigation)', costNgn: 800, isVariable: true },
  { id: 'c-5', category: 'labor', label: 'Pruning, Trellising & Daily Spray Labor', costNgn: 650, isVariable: true },
  { id: 'c-6', category: 'pest_control', label: 'Integrated Pest Mgmt (Tuta, Mites & Fungal control)', costNgn: 500, isVariable: true },
  { id: 'c-7', category: 'overhead', label: 'Greenhouse Net Amortization & Irrigation Drip lines', costNgn: 600, isVariable: false }
];
