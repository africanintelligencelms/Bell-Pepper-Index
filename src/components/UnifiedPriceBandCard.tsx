import React, { useState } from 'react';
import { UnifiedPriceBand } from '../types';
import { DEFAULT_PRICE_BANDS } from '../data/marketCommunityData';
import { 
  Scale, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  MapPin, 
  Truck, 
  Copy, 
  Check, 
  Users, 
  HelpCircle,
  TrendingUp,
  ArrowRight
} from 'lucide-react';

interface UnifiedPriceBandCardProps {
  /** Bands persisted server-side. Falls back to the bundled defaults offline. */
  bands?: UnifiedPriceBand[];
  onSelectOfftakerTab?: () => void;
  onSelectCalculatorTab?: () => void;
}

export const UnifiedPriceBandCard: React.FC<UnifiedPriceBandCardProps> = ({
  bands: persistedBands,
  onSelectOfftakerTab,
  onSelectCalculatorTab
}) => {
  const bands = persistedBands && persistedBands.length > 0 ? persistedBands : DEFAULT_PRICE_BANDS;
  const [rawHubIndex, setSelectedHubIndex] = useState(0);
  // A hub removed by an admin would otherwise leave this index dangling.
  const selectedHubIndex = Math.min(rawHubIndex, bands.length - 1);
  const [testVariety, setTestVariety] = useState<'coloured' | 'green'>('green');
  const [testOffer, setTestOffer] = useState<number | ''>(4000);
  const [copied, setCopied] = useState(false);

  const currentHub = bands[selectedHubIndex];

  // Test offer evaluation
  const minTarget = testVariety === 'coloured' ? currentHub.colouredMin : currentHub.greenMin;
  const targetPrice = testVariety === 'coloured' ? currentHub.colouredTarget : currentHub.greenTarget;
  const maxTarget = testVariety === 'coloured' ? currentHub.colouredMax : currentHub.greenMax;

  let offerStatus: 'danger' | 'acceptable' | 'premium' = 'acceptable';
  let offerFeedback = '';

  const offerNum = Number(testOffer);
  if (offerNum > 0) {
    if (offerNum < minTarget) {
      offerStatus = 'danger';
      offerFeedback = `⚠️ Below Community Floor! Selling at ₦${offerNum.toLocaleString()} undercuts fellow farmers and operates at a severe loss.`;
    } else if (offerNum >= minTarget && offerNum <= maxTarget) {
      offerStatus = 'acceptable';
      offerFeedback = `✅ Within Unified Range Band (₦${minTarget.toLocaleString()} - ₦${maxTarget.toLocaleString()}). Safe fair deal for both farmer and buyer.`;
    } else {
      offerStatus = 'premium';
      offerFeedback = `🔥 Premium Sale! ₦${offerNum.toLocaleString()} exceeds target band. High value contract.`;
    }
  }

  const handleCopyPact = () => {
    const text = `🤝 *NAIJA GREENHOUSE FARMERS UNIFIED (+/-) PRICE BAND*
_Like fuel marketers, we stand together in a unified range!_

📍 *${currentHub.hub.toUpperCase()}*
🫑 *Coloured Peppers:* ₦${currentHub.colouredMin.toLocaleString()} - ₦${currentHub.colouredMax.toLocaleString()} / kg (Target: ₦${currentHub.colouredTarget.toLocaleString()})
🫑 *Green Peppers:* ₦${currentHub.greenMin.toLocaleString()} - ₦${currentHub.greenMax.toLocaleString()} / kg (Target: ₦${currentHub.greenTarget.toLocaleString()})
🚚 *Est. Logistics Allowance:* ₦${currentHub.logisticsFromJosPerKg}/kg

⚠️ *Resolution:* Stop operating in silos! Reject buyer undercutting below the minimum floor.
#UnitedGreenhouseFarmers #FairPricingRange`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-6">
      {/* Header with Farmer Resolution Context */}
      <div className="border-b border-slate-100 pb-4 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base md:text-lg text-slate-900 flex items-center gap-2">
                <span>Unified (+/-) Range Band</span>
                <span className="text-xs bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                  Marketers Range Model
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Inspired by the association consensus: collective pricing range to prevent silo dumping & buyer manipulation
              </p>
            </div>
          </div>

          <button
            onClick={handleCopyPact}
            className="self-start sm:self-center text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 shadow-xs"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied Resolution!' : 'Copy Range to WhatsApp'}</span>
          </button>
        </div>

        {/* Association Quote Banner */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 flex items-start gap-2.5">
          <Users className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-slate-900">Community Consensus:</strong> <em>"We will never get everyone to sell at the exact same price, just a range. Fuel is within a range by the marketers 😀. Having a unified (+/-) range prevents farmers from operating in silos and crashing prices."</em>
          </p>
        </div>
      </div>

      {/* Hub Tabs */}
      <div className="space-y-3">
        <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5 text-emerald-600" />
          <span>Select Market Destination / Hub:</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {bands.map((b, idx) => (
            <button
              key={b.hub}
              onClick={() => setSelectedHubIndex(idx)}
              className={`p-2.5 rounded-xl border text-left text-xs transition ${
                selectedHubIndex === idx
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold shadow-xs'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              <div className="truncate font-semibold">{b.hub.split('(')[0]}</div>
              <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                <Truck className="w-3 h-3" />
                <span>+₦{b.logisticsFromJosPerKg}/kg freight</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Active Hub Price Range Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Coloured Peppers Range */}
        <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
              <span>🫑 Coloured Bell Peppers</span>
              <span className="text-[10px] bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                Red, Yellow, Orange
              </span>
            </span>
            <span className="text-xs font-bold text-slate-700">
              Target: <strong className="text-amber-900 text-sm">₦{currentHub.colouredTarget.toLocaleString()}</strong>/kg
            </span>
          </div>

          {/* Visual Range Bar */}
          <div className="space-y-1.5">
            <div className="h-3 bg-amber-200/80 rounded-full relative overflow-hidden flex items-center">
              <div className="absolute left-[15%] right-[15%] h-full bg-amber-500 rounded-full"></div>
            </div>
            <div className="flex justify-between text-[11px] text-slate-600 font-mono">
              <span>Floor: <strong>₦{currentHub.colouredMin.toLocaleString()}</strong></span>
              <span className="text-amber-800 font-bold">Mid Target: ₦{currentHub.colouredTarget.toLocaleString()}</span>
              <span>Ceiling: <strong>₦{currentHub.colouredMax.toLocaleString()}</strong></span>
            </div>
          </div>

          <p className="text-[11px] text-slate-600 leading-normal">
            For {currentHub.hub}. Minimum non-negotiable floor to protect greenhouse capital costs.
          </p>
        </div>

        {/* Green Peppers Range */}
        <div className="bg-emerald-50/50 border border-emerald-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
              <span>🫑 Green Bell Peppers</span>
              <span className="text-[10px] bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                Greenhouse Grade A
              </span>
            </span>
            <span className="text-xs font-bold text-slate-700">
              Target: <strong className="text-emerald-900 text-sm">₦{currentHub.greenTarget.toLocaleString()}</strong>/kg
            </span>
          </div>

          {/* Visual Range Bar */}
          <div className="space-y-1.5">
            <div className="h-3 bg-emerald-200/80 rounded-full relative overflow-hidden flex items-center">
              <div className="absolute left-[15%] right-[15%] h-full bg-emerald-500 rounded-full"></div>
            </div>
            <div className="flex justify-between text-[11px] text-slate-600 font-mono">
              <span>Floor: <strong>₦{currentHub.greenMin.toLocaleString()}</strong></span>
              <span className="text-emerald-800 font-bold">Mid Target: ₦{currentHub.greenTarget.toLocaleString()}</span>
              <span>Ceiling: <strong>₦{currentHub.greenMax.toLocaleString()}</strong></span>
            </div>
          </div>

          <p className="text-[11px] text-slate-600 leading-normal">
            Do not allow Lagos/Abuja buyers to pay open-field rain-fed rates (₦3,000-₦3,500) for greenhouse green!
          </p>
        </div>
      </div>

      {/* Interactive Anti-Silo Offer Checker */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold text-slate-900">
              Check an Offtaker's Offer Against the Band
            </span>
          </div>
          <span className="text-[10px] text-slate-500">
            Testing against: {currentHub.hub}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Produce Variety:
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setTestVariety('green')}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition ${
                  testVariety === 'green'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Green
              </button>
              <button
                type="button"
                onClick={() => setTestVariety('coloured')}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition ${
                  testVariety === 'coloured'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Coloured
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Offtaker Price Offer (₦/kg):
            </label>
            <div className="relative">
              <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">₦</span>
              <input
                type="number"
                value={testOffer}
                onChange={e => setTestOffer(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="e.g. 4000 or 7000"
                className="w-full bg-white border border-slate-300 rounded-xl pl-6 pr-3 py-1.5 text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="sm:self-center">
            <div className={`p-2.5 rounded-xl border text-xs leading-tight ${
              offerStatus === 'danger'
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : offerStatus === 'acceptable'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-purple-50 border-purple-200 text-purple-900'
            }`}>
              <div className="font-bold flex items-center gap-1 mb-0.5">
                {offerStatus === 'danger' && <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />}
                {offerStatus === 'acceptable' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                {offerStatus === 'premium' && <TrendingUp className="w-3.5 h-3.5 text-purple-600" />}
                <span>{offerStatus === 'danger' ? 'Silo Danger' : offerStatus === 'acceptable' ? 'Safe Collective Band' : 'Premium Offer'}</span>
              </div>
              <p className="text-[11px]">{offerFeedback}</p>
            </div>
          </div>
        </div>

        {/* Quick Cross Links if buyer is undercutting */}
        {offerStatus === 'danger' && (
          <div className="pt-2 border-t border-slate-200 flex items-center justify-between flex-wrap gap-2 text-xs">
            <span className="text-slate-600">
              Buyer offering below floor? Don't panic dump!
            </span>
            <div className="flex items-center gap-2">
              {onSelectOfftakerTab && (
                <button
                  onClick={onSelectOfftakerTab}
                  className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1"
                >
                  <span>Check Alternative Offtakers</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
              {onSelectCalculatorTab && (
                <button
                  onClick={onSelectCalculatorTab}
                  className="text-purple-700 hover:text-purple-800 font-bold flex items-center gap-1"
                >
                  <span>Run Distress Decision Matrix</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
