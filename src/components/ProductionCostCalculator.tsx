import React, { useEffect, useState } from 'react';
import { INITIAL_COP_BREAKDOWN } from '../data/marketCommunityData';
import { CostBreakdownItem } from '../types';
import { 
  Calculator, 
  AlertTriangle, 
  CheckCircle2, 
  Lightbulb, 
  DollarSign, 
  TrendingDown, 
  Sparkles, 
  ShieldAlert, 
  Clock, 
  ChevronDown, 
  ChevronUp,
  Flame,
  Layers,
  ArrowRight,
  Info
} from 'lucide-react';

interface ProductionCostCalculatorProps {
  /** COP defaults persisted server-side. Falls back to the bundled figures offline. */
  costItems?: CostBreakdownItem[];
  onGoToOfftakers?: () => void;
  onGoToUnifiedBand?: () => void;
}

export const ProductionCostCalculator: React.FC<ProductionCostCalculatorProps> = ({
  costItems: persistedCostItems,
  onGoToOfftakers,
  onGoToUnifiedBand
}) => {
  // Production inputs
  const [plantCount, setPlantCount] = useState<number>(500); // standard 8x24m / 10x30m greenhouse
  const [avgYieldPerPlantKg, setAvgYieldPerPlantKg] = useState<number>(4.0); // 4kg per plant lifetime
  const [costItems, setCostItems] = useState<CostBreakdownItem[]>(
    persistedCostItems ?? INITIAL_COP_BREAKDOWN,
  );

  // The server figures usually arrive after this component first renders, so
  // adopt them when they land. Local edits the farmer makes afterwards stay put
  // because the effect only reruns when the persisted list itself changes.
  useEffect(() => {
    if (persistedCostItems && persistedCostItems.length > 0) {
      setCostItems(persistedCostItems);
    }
  }, [persistedCostItems]);

  // Dilemma scenario inputs
  const [marketOfferPrice, setMarketOfferPrice] = useState<number>(4000);
  const [freightCostPerKg, setFreightCostPerKg] = useState<number>(450); // Jos to Lagos waybill
  const [harvestCostPerKg, setHarvestCostPerKg] = useState<number>(150); // Crates, harvesting labor

  // Calculations
  const totalProductionKg = plantCount * avgYieldPerPlantKg;
  const totalCostPerPlant = costItems.reduce((sum, item) => sum + item.costNgn, 0);
  const totalGreenhouseCost = totalCostPerPlant * plantCount;
  const costOfProductionPerKg = totalProductionKg > 0 ? Math.round(totalGreenhouseCost / totalProductionKg) : 6000;

  // Variable cash costs vs Fixed sunk costs
  const variableCostPerPlant = costItems.filter(i => i.isVariable).reduce((s, i) => s + i.costNgn, 0);
  const variableCostPerKg = totalProductionKg > 0 ? Math.round((variableCostPerPlant * plantCount) / totalProductionKg) : 2500;
  const sunkCostPerKg = costOfProductionPerKg - variableCostPerKg;

  // Dilemma Analysis
  const netLagosFarmgate = marketOfferPrice - freightCostPerKg;
  const cashContribution = netLagosFarmgate - harvestCostPerKg;
  const netProfitPerKg = netLagosFarmgate - costOfProductionPerKg;

  // Toggle for Taraba & Cost-Cutting Playbook
  const [showTarabaAnalysis, setShowTarabaAnalysis] = useState(true);

  const handleUpdateCost = (id: string, newCost: number) => {
    setCostItems(prev =>
      prev.map(item => (item.id === id ? { ...item, costNgn: newCost } : item))
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Business vs Hobby Principle */}
      <div className="bg-gradient-to-r from-slate-900 to-emerald-950 text-white p-5 md:p-6 rounded-2xl shadow-xs space-y-2">
        <div className="flex items-center gap-2">
          <span className="bg-emerald-500/20 text-emerald-300 text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-400/30 flex items-center gap-1">
            <Calculator className="w-3.5 h-3.5" /> Economic Framework
          </span>
          <span className="text-slate-300 text-xs">
            "Are we treating our greenhouse as a business or a hobby?"
          </span>
        </div>
        <h2 className="text-lg md:text-xl font-black tracking-tight text-white">
          Cost of Production (COP) & Perishable Distress Decision Matrix
        </h2>
        <p className="text-xs md:text-sm text-slate-300 max-w-3xl leading-relaxed">
          When your COP hits ₦6,000/kg and the market dips to ₦4,000/kg, what should a business-minded farmer do? Understand variable cash floor, shelf-life leverage, and cost optimization.
        </p>
      </div>

      {/* Main Grid: Left Side COP Builder, Right Side Distress Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: COP Itemized Calculator (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm md:text-base">
                1. Greenhouse COP Calculator
              </h3>
              <p className="text-xs text-slate-500">
                Adjust realistic costs per plant to calculate your true COP/kg
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500 block">Your True COP:</span>
              <span className="text-xl font-black text-slate-900">
                ₦{costOfProductionPerKg.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-500">/kg</span>
            </div>
          </div>

          {/* Plant Capacity & Yield */}
          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Greenhouse Plants:
              </label>
              <input
                type="number"
                value={plantCount}
                onChange={e => setPlantCount(Math.max(1, Number(e.target.value)))}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-900"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">Standard ~500 plants</span>
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Yield per Plant (kg):
              </label>
              <input
                type="number"
                step="0.5"
                value={avgYieldPerPlantKg}
                onChange={e => setAvgYieldPerPlantKg(Math.max(0.5, Number(e.target.value)))}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-900"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">3.5 - 5kg indeterminate</span>
            </div>
          </div>

          {/* Cost Items List */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-800 block">
              Itemized Cost per Plant (Lifecycle):
            </span>
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {costItems.map(item => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200/80 text-xs"
                >
                  <div className="space-y-0.5">
                    <span className="font-semibold text-slate-800 block">{item.label}</span>
                    <span className="text-[10px] text-slate-500">
                      {item.isVariable ? '🔄 Variable running cost' : '🔒 Fixed / Sunk capital'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-slate-400 font-bold text-xs">₦</span>
                    <input
                      type="number"
                      value={item.costNgn}
                      onChange={e => handleUpdateCost(item.id, Number(e.target.value))}
                      className="w-20 bg-white border border-slate-300 rounded px-2 py-1 text-right font-bold text-slate-900 text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Breakeven Summary Box */}
          <div className="pt-3 border-t border-slate-100 bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200 text-xs space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-slate-700">Total Greenhouse Yield:</span>
              <strong className="text-slate-900 font-bold">{totalProductionKg.toLocaleString()} kg</strong>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-700">Variable Cash Cost / kg:</span>
              <strong className="text-amber-800 font-bold">₦{variableCostPerKg.toLocaleString()} / kg</strong>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-700">Sunk Capital Amortized / kg:</span>
              <strong className="text-slate-600 font-bold">₦{sunkCostPerKg.toLocaleString()} / kg</strong>
            </div>
          </div>
        </div>

        {/* Right Col: The Perishable Distress Dilemma Solver (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-5">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="font-bold text-slate-900 text-sm md:text-base flex items-center gap-2">
                <span>2. The Perishable Dilemma Decision Matrix</span>
                <span className="text-[10px] bg-rose-100 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-full font-bold">
                  Crisis Strategy
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Solving the chat question: "COP is ₦6k, but Lagos market is buying at ₦4k. What should the farmer do?"
              </p>
            </div>
          </div>

          {/* Inputs for Dilemma */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Lagos Buyer Offer (₦/kg):
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">₦</span>
                <input
                  type="number"
                  value={marketOfferPrice}
                  onChange={e => setMarketOfferPrice(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-lg pl-6 pr-2 py-1.5 font-black text-rose-700 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Freight to Lagos (₦/kg):
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">₦</span>
                <input
                  type="number"
                  value={freightCostPerKg}
                  onChange={e => setFreightCostPerKg(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-lg pl-6 pr-2 py-1.5 font-bold text-slate-900 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Harvest/Crates (₦/kg):
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">₦</span>
                <input
                  type="number"
                  value={harvestCostPerKg}
                  onChange={e => setHarvestCostPerKg(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-lg pl-6 pr-2 py-1.5 font-bold text-slate-900 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Decision Results Analysis */}
          <div className="space-y-3">
            <div className={`p-4 rounded-xl border text-xs space-y-2 ${
              netProfitPerKg >= 0
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : 'bg-rose-50/80 border-rose-200 text-rose-950'
            }`}>
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Market Offer Assessment vs COP:</span>
                </span>
                <span className="text-sm font-black">
                  {netProfitPerKg >= 0 ? `+₦${netProfitPerKg.toLocaleString()}/kg Profit` : `-₦${Math.abs(netProfitPerKg).toLocaleString()}/kg Deficit`}
                </span>
              </div>

              <div className="text-xs space-y-1 leading-relaxed">
                <p>
                  <strong>Net Received at Farm Gate:</strong> ₦{marketOfferPrice.toLocaleString()} - ₦{freightCostPerKg} freight = <strong className="text-slate-900">₦{netLagosFarmgate.toLocaleString()}/kg</strong>.
                </p>
                <p>
                  <strong>Total COP:</strong> ₦{costOfProductionPerKg.toLocaleString()}/kg. You are facing a paper loss of <strong>₦{Math.abs(netProfitPerKg).toLocaleString()}</strong> per kg if you take this offer.
                </p>
              </div>
            </div>

            {/* The 3 Practical Strategic Options */}
            <div className="space-y-2.5">
              <span className="text-xs font-bold text-slate-800 block">
                Recommended Action Plan (Business Decision):
              </span>

              {/* Option 1: Cash Recovery Rule */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1">
                <div className="font-bold text-slate-900 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Rule 1: Never Let Perishable Rot (Contribution Margin)</span>
                  </span>
                  <span className="text-emerald-700 font-mono font-bold">
                    Recovers ₦{cashContribution.toLocaleString()}/kg cash
                  </span>
                </div>
                <p className="text-slate-600 leading-normal">
                  Your greenhouse capital, seedling and compost costs are <em>sunk</em>. If you don't harvest, you lose 100% (₦{costOfProductionPerKg}/kg). Selling at ₦{netLagosFarmgate}/kg covers the immediate harvest cost (₦{harvestCostPerKg}) and leaves <strong>₦{cashContribution.toLocaleString()}/kg</strong> in raw cash to pay staff & fertilizer for the next cycle.
                </p>
              </div>

              {/* Option 2: The Greenhouse Pericarp Buffer */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1">
                <div className="font-bold text-slate-900 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-purple-600" />
                    <span>Rule 2: Leverage Your 14-21 Day Shelf-Life Buffer</span>
                  </span>
                  <span className="text-purple-700 font-mono font-bold">14-21 Days vs 4 Days</span>
                </div>
                <p className="text-slate-600 leading-normal">
                  Open-field rain-fed peppers rot in 3-5 days; <strong>Greenhouse bell peppers with thick pericarps hold for 14-21 days in cool ambient shade</strong>. You don't have to sell in 24 hours! Hold for 3-5 days to negotiate with alternative offtakers.
                </p>
              </div>

              {/* Option 3: Offtaker Re-Routing */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1">
                <div className="font-bold text-slate-900 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-amber-600" />
                    <span>Rule 3: Re-Route to Alternative Offtakers (Abuja / Local Hotels)</span>
                  </span>
                  <span className="text-amber-800 font-mono font-bold">Avoid Lagos Dumps</span>
                </div>
                <p className="text-slate-600 leading-normal">
                  If Lagos Mile 12 is flooded with open-field peppers, do not send your harvest to Lagos! Pivot to Abuja restaurants, local Jos hotel aggregators, or cucumber/pepper brokers.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Accordion: The Taraba Factor Analysis & Cost-Cutting Playbook */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div 
          onClick={() => setShowTarabaAnalysis(!showTarabaAnalysis)}
          className="flex items-center justify-between cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-100 text-purple-800 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm md:text-base flex items-center gap-2">
                <span>The "Taraba Factor" & 5 Practical Ways to Slash COP</span>
                <span className="text-[10px] bg-purple-100 text-purple-800 border border-purple-200 px-2 py-0.5 rounded-full font-semibold">
                  Chat Deep Dive
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Responding to: "There was a time a farm in Taraba crashed prices. How were they able to sell cheaper?"
              </p>
            </div>
          </div>
          <button className="text-slate-400 p-1">
            {showTarabaAnalysis ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>

        {showTarabaAnalysis && (
          <div className="pt-3 border-t border-slate-100 space-y-4 text-xs animate-in fade-in duration-200">
            {/* Why Taraba crashed prices */}
            <div className="bg-purple-50/70 border border-purple-200 p-3.5 rounded-xl space-y-1.5 text-purple-950">
              <div className="font-bold text-purple-900 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-purple-600" />
                <span>How Mega-Farms (Taraba / Large Scale) Achieved ₦2,500 - ₦3,000/kg COP:</span>
              </div>
              <p className="leading-relaxed text-slate-700">
                Large automated commercial farms achieve lower COP not because their peppers are "magical", but through <strong>scale economics</strong>:
                (1) <em>Direct container chemical imports</em> (buying technical salts at port rather than retail 25kg bags at Jos agro-dealers saves 45%);
                (2) <em>Solar/gravity automated fertigation</em> (zero fuel cost compared to running a 5kVA petrol generator daily);
                (3) <em>Substrate sterilization and 3-year recycling</em>;
                (4) <em>High-density indeterminate cultivars yielding 6-8kg per plant</em> vs smallholder 3-4kg.
              </p>
            </div>

            {/* 5 Field-Tested Tips for Plateau & Nigerian Farmers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="font-bold text-slate-900 block">
                  1. Blend Raw Fertilizer Salts vs Branded Bottled Nutrients
                </span>
                <p className="text-slate-600 leading-normal text-[11px]">
                  Stop buying expensive branded liquid hydroponic formulations. Formulate your own recipes using agricultural grade Calcium Nitrate, Potassium Nitrate, Monopotassium Phosphate (MKP), and Magnesium Sulphate. <strong>Saves ₦800/kg of production!</strong>
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="font-bold text-slate-900 block">
                  2. Convert Fertigation to DC Solar Pumping
                </span>
                <p className="text-slate-600 leading-normal text-[11px]">
                  Fuel generator costs add ₦600 - ₦1,000/kg to your pepper at current fuel prices. A simple 2-panel 24V DC diaphragm solar pump pays for itself in less than 4 months and eliminates fuel overhead completely.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="font-bold text-slate-900 block">
                  3. Steam/Solarize Cocopeat for 2nd & 3rd Season Reuse
                </span>
                <p className="text-slate-600 leading-normal text-[11px]">
                  Never discard your cocopeat substrate after one season! Solarize it under clear plastic in the Jos dry season heat or flush thoroughly with hydrogen peroxide to sterilize. <strong>Saves ~₦500/plant capital cost.</strong>
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="font-bold text-slate-900 block">
                  4. Indeterminate Trellising to Push 5kg+ Yield per Plant
                </span>
                <p className="text-slate-600 leading-normal text-[11px]">
                  COP per kg drops drastically when yield goes from 3kg to 5kg per plant. Proper Dutch-bucket or slab pruning (2-stem system) extends harvest window from 3 months to 7 months.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
