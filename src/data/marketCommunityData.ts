import { UnifiedPriceBand, OfftakerContact, CostBreakdownItem } from '../types';

export const DEFAULT_PRICE_BANDS: UnifiedPriceBand[] = [
  {
    hub: 'Jos Farm Gate (Plateau)',
    colouredMin: 3500,
    colouredTarget: 3850,
    colouredMax: 4200,
    greenMin: 2000,
    greenTarget: 2250,
    greenMax: 2500,
    logisticsFromJosPerKg: 0,
    notes: 'Primary greenhouse production belt. This is the agreed floor — the number to quote when a buyer opens lower.'
  },
  {
    hub: 'Abuja (FCT) Direct Offtake',
    colouredMin: 3700,
    colouredTarget: 4050,
    colouredMax: 4400,
    greenMin: 2200,
    greenTarget: 2450,
    greenMax: 2700,
    logisticsFromJosPerKg: 200,
    notes: 'Hotels, supermarkets & high-end green grocers in Maitama, Garki & Wuse 2. Jos floor plus ₦200/kg freight.'
  },
  {
    hub: 'Lagos (Mile 12 / Retail / Hotels)',
    colouredMin: 3950,
    colouredTarget: 4300,
    colouredMax: 4650,
    greenMin: 2450,
    greenTarget: 2700,
    greenMax: 2950,
    logisticsFromJosPerKg: 450,
    notes: 'Jos floor plus ₦450/kg interstate freight. A Lagos seller quoting the Jos floor is absorbing the haulage themselves.'
  },
  {
    hub: 'Kano / North Hubs',
    colouredMin: 3750,
    colouredTarget: 4100,
    colouredMax: 4450,
    greenMin: 2250,
    greenTarget: 2500,
    greenMax: 2750,
    logisticsFromJosPerKg: 250,
    notes: 'Commercial trade hub. Jos floor plus ₦250/kg freight.'
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
