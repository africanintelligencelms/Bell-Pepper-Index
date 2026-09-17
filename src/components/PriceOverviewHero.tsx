import React from 'react';
import { PriceRecord } from '../types';
import { 
  TrendingUp, 
  AlertTriangle, 
  Sparkles, 
  Scale, 
  MapPin, 
  Zap,
  PlusCircle,
  MessageSquare,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

interface PriceOverviewHeroProps {
  records: PriceRecord[];
  onSelectTab: (tab: 'live' | 'extractor' | 'log' | 'history') => void;
  onOpenBroadcastModal: () => void;
}

export const PriceOverviewHero: React.FC<PriceOverviewHeroProps> = ({
  records,
  onSelectTab,
  onOpenBroadcastModal
}) => {
  // Compute Coloured stats
  const colouredRecords = records.filter(r => r.type === 'coloured');
  const colouredPrices = colouredRecords.map(r => r.pricePerKg);
  const avgColoured = colouredPrices.length
    ? Math.round(colouredPrices.reduce((a, b) => a + b, 0) / colouredPrices.length)
    : 7000;
  const minColoured = colouredPrices.length ? Math.min(...colouredPrices) : 6500;
  const maxColoured = colouredPrices.length ? Math.max(...colouredPrices) : 8000;
  const volColoured = colouredRecords.reduce((acc, curr) => acc + curr.quantityKg, 0);

  // Compute Green stats
  const greenRecords = records.filter(r => r.type === 'green');
  const greenPrices = greenRecords.map(r => r.pricePerKg);
  const avgGreen = greenPrices.length
    ? Math.round(greenPrices.reduce((a, b) => a + b, 0) / greenPrices.length)
    : 4300;
  const minGreen = greenPrices.length ? Math.min(...greenPrices) : 3000;
  const maxGreen = greenPrices.length ? Math.max(...greenPrices) : 5000;
  const volGreen = greenRecords.reduce((acc, curr) => acc + curr.quantityKg, 0);

  // Spread
  const spread = avgColoured - avgGreen;
  const spreadPct = avgGreen > 0 ? Math.round((spread / avgGreen) * 100) : 0;

  // Hubs count
  const locations = Array.from(new Set(records.map(r => r.location.split(',')[0].trim())));

  return (
    <div className="space-y-5">
      {/* Community Banner - Clean Light Theme */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 rounded-2xl p-5 md:p-6 text-white shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-emerald-500/20 text-emerald-200 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-emerald-400/30 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-emerald-300" /> WhatsApp Live Price Tracker
              </span>
              <span className="bg-white/10 text-slate-100 text-xs px-2.5 py-0.5 rounded-full border border-white/20 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-emerald-300" /> {locations.length} Hubs (Jos, Abuja, Kano, Lagos)
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-white">
              Greenhouse Pepper Market Index
            </h2>
            <p className="text-xs md:text-sm text-emerald-100/90 leading-relaxed">
              Collective, fair price quotes directly reported by greenhouse farmers across Nigeria. Protect your crop value against buyer price cuts!
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center shrink-0 flex-wrap">
            <button
              onClick={() => onSelectTab('extractor')}
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-xs flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-purple-200" />
              <span>Paste WhatsApp Chat</span>
            </button>
            <button
              onClick={() => onSelectTab('log')}
              className="bg-white hover:bg-emerald-50 text-emerald-950 text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-xs flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4 text-emerald-700" />
              <span>Log Sale Price</span>
            </button>
          </div>
        </div>
      </div>

      {/* Primary 3 Price Cards - Clean Light Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Coloured Bell Pepper Card */}
        <div className="bg-white border border-amber-200/90 rounded-2xl p-5 shadow-xs hover:shadow-md transition space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl p-2 bg-amber-50 rounded-xl border border-amber-100">🫑</span>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Coloured Peppers</h3>
                <p className="text-xs text-amber-700 font-medium">Red, Yellow & Orange</p>
              </div>
            </div>
            <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-bold px-2.5 py-1 rounded-full">
              High Premium
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-slate-900 tracking-tight">
                ₦{avgColoured.toLocaleString()}
              </span>
              <span className="text-xs text-slate-500 font-semibold">/ kg (Average)</span>
            </div>
            <p className="text-xs text-slate-600 flex items-center gap-1">
              <span>Verified Market Range:</span>
              <strong className="text-amber-800 font-bold">₦{minColoured.toLocaleString()} - ₦{maxColoured.toLocaleString()}</strong>
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 text-xs space-y-1.5 text-slate-600">
            <div className="flex justify-between items-center">
              <span>Target Minimum Floor:</span>
              <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                ₦7,000 / kg
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Tracked Group Volume:</span>
              <span className="font-semibold text-slate-800">{volColoured.toLocaleString()} kg</span>
            </div>
          </div>
        </div>

        {/* Green Bell Pepper Card */}
        <div className="bg-white border border-emerald-200/90 rounded-2xl p-5 shadow-xs hover:shadow-md transition space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl p-2 bg-emerald-50 rounded-xl border border-emerald-100">🫑</span>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Green Peppers</h3>
                <p className="text-xs text-emerald-700 font-medium">Greenhouse Quality</p>
              </div>
            </div>
            <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold px-2.5 py-1 rounded-full">
              Protected Crop
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-slate-900 tracking-tight">
                ₦{avgGreen.toLocaleString()}
              </span>
              <span className="text-xs text-slate-500 font-semibold">/ kg (Average)</span>
            </div>
            <p className="text-xs text-slate-600 flex items-center gap-1">
              <span>Verified Market Range:</span>
              <strong className="text-emerald-800 font-bold">₦{minGreen.toLocaleString()} - ₦{maxGreen.toLocaleString()}</strong>
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 text-xs space-y-1.5 text-slate-600">
            <div className="flex justify-between items-center">
              <span>Greenhouse Target Floor:</span>
              <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                ₦4,500 / kg
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Tracked Group Volume:</span>
              <span className="font-semibold text-slate-800">{volGreen.toLocaleString()} kg</span>
            </div>
          </div>
        </div>

        {/* Coloured Premium & Offtaker Warning Card */}
        <div className="bg-white border border-purple-200/90 rounded-2xl p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-3">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-100 border border-purple-200 text-purple-700">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Coloured Spread</h3>
                  <p className="text-xs text-purple-700 font-medium">Market Premium</p>
                </div>
              </div>
              <span className="bg-purple-100 text-purple-800 border border-purple-200 text-[11px] font-bold px-2.5 py-1 rounded-full">
                +{spreadPct}% Premium
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-slate-900 tracking-tight">
                  +₦{spread.toLocaleString()}
                </span>
                <span className="text-xs text-slate-500 font-semibold">/ kg over green</span>
              </div>
              <p className="text-xs text-slate-600 leading-normal">
                Coloured bell peppers command extra price due to extended 120-day ripening cycle & hotel demand.
              </p>
            </div>
          </div>

          <div className="bg-amber-50 p-3 rounded-xl border border-amber-200/80 flex items-start gap-2 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-amber-900 leading-tight">
              <strong className="font-bold text-amber-950">Farmer Tip:</strong> Do not let middle-men buy greenhouse green peppers at open-field rain-fed prices (₦3,000). Your greenhouse fruit lasts 2x longer.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
