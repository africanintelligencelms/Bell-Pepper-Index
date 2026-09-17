import React, { useState, useEffect } from 'react';
import { PepperType, PriceRecord } from '../types';
import { 
  Check, 
  MapPin, 
  Share2, 
  MessageCircle, 
  Phone, 
  Sparkles, 
  CheckCircle2, 
  Scale, 
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  Users
} from 'lucide-react';

interface SimpleFarmerLoggerProps {
  records: PriceRecord[];
  onAddPrice: (entry: {
    type: PepperType;
    pricePerKg: number;
    quantityKg: number;
    transactionType: 'actual_sale' | 'farmer_asking' | 'buyer_offer';
    productionMethod: 'greenhouse';
    qualityGrade: 'grade_a';
    location: string;
    farmerName: string;
    farmerPhone?: string;
  }) => void;
  onOpenOfftakers?: () => void;
  onOpenAdvanced?: () => void;
  onShareWhatsApp: () => void;
}

const COMMON_LOCATIONS = [
  'Jos, Plateau State',
  'Abuja (FCT)',
  'Lagos (Mile 12)',
  'Kano State',
  'Other'
];

export const SimpleFarmerLogger: React.FC<SimpleFarmerLoggerProps> = ({
  records,
  onAddPrice,
  onOpenOfftakers,
  onOpenAdvanced,
  onShareWhatsApp
}) => {
  // Form State
  const [variety, setVariety] = useState<PepperType>('green');
  const [pricePerKg, setPricePerKg] = useState<number | ''>(4500);
  const [quantityKg, setQuantityKg] = useState<number | ''>(50);
  const [location, setLocation] = useState('Jos, Plateau State');
  const [customLocation, setCustomLocation] = useState('');
  const [farmerName, setFarmerName] = useState(() => localStorage.getItem('farmer_name') || '');
  const [farmerPhone, setFarmerPhone] = useState(() => localStorage.getItem('farmer_phone') || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [submittedPrice, setSubmittedPrice] = useState<number>(0);

  // Compute live community averages
  const greenPrices = records.filter(r => r.type === 'green').map(r => r.pricePerKg);
  const colouredPrices = records.filter(r => r.type === 'coloured').map(r => r.pricePerKg);
  const avgGreen = greenPrices.length ? Math.round(greenPrices.reduce((a, b) => a + b, 0) / greenPrices.length) : 4500;
  const avgColoured = colouredPrices.length ? Math.round(colouredPrices.reduce((a, b) => a + b, 0) / colouredPrices.length) : 7000;

  // When variety changes, suggest realistic starter price
  const handleSelectVariety = (v: PepperType) => {
    setVariety(v);
    if (v === 'coloured') {
      setPricePerKg(7000);
    } else {
      setPricePerKg(4500);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pricePerKg || Number(pricePerKg) <= 0) return;

    setIsSubmitting(true);

    const chosenLocation = location === 'Other' && customLocation.trim() ? customLocation.trim() : location;
    const finalName = farmerName.trim() || 'Greenhouse Farmer';

    // Save name/phone for civil servants who don't want to retype
    if (farmerName.trim()) localStorage.setItem('farmer_name', farmerName.trim());
    if (farmerPhone.trim()) localStorage.setItem('farmer_phone', farmerPhone.trim());

    const numPrice = Number(pricePerKg);
    setSubmittedPrice(numPrice);

    onAddPrice({
      type: variety,
      pricePerKg: numPrice,
      quantityKg: Number(quantityKg) || 50,
      transactionType: 'actual_sale',
      productionMethod: 'greenhouse',
      qualityGrade: 'grade_a',
      location: chosenLocation,
      farmerName: finalName,
      farmerPhone: farmerPhone.trim() || undefined,
    });

    setIsSubmitting(false);
    setJustSubmitted(true);
    setTimeout(() => setJustSubmitted(false), 5000);
  };

  const colouredPriceOptions = [6000, 6500, 7000, 7500, 8000];
  const greenPriceOptions = [3500, 4000, 4500, 5000, 5500];
  const quantityOptions = [30, 50, 100, 200, 500];

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Friendly, Simple Greeting */}
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-black tracking-tight text-slate-900">
          Log Today's Pepper Price
        </h2>
        <p className="text-sm text-slate-500">
          Enter what you sold or were offered to help the WhatsApp group stay updated.
        </p>
      </div>

      {/* Main Clean Form Card */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Choose Pepper Variety */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              1. What type of pepper did you sell?
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Green Card */}
              <button
                type="button"
                onClick={() => handleSelectVariety('green')}
                className={`p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
                  variety === 'green'
                    ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 shadow-xs'
                    : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-2xl">🫑</span>
                  {variety === 'green' && (
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </div>
                <div>
                  <span className="font-extrabold text-base block">Green Pepper</span>
                  <span className="text-xs text-slate-500">Greenhouse Grade A</span>
                </div>
              </button>

              {/* Coloured Card */}
              <button
                type="button"
                onClick={() => handleSelectVariety('coloured')}
                className={`p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
                  variety === 'coloured'
                    ? 'border-amber-600 bg-amber-50/70 text-amber-950 shadow-xs'
                    : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-2xl">🌶️</span>
                  {variety === 'coloured' && (
                    <span className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </div>
                <div>
                  <span className="font-extrabold text-base block">Coloured Pepper</span>
                  <span className="text-xs text-slate-500">Red, Yellow, Orange</span>
                </div>
              </button>
            </div>
          </div>

          {/* Step 2: Price per KG */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                2. Price per kg (in Naira):
              </label>
              <span className="text-xs text-emerald-700 font-bold">
                Today's Avg: ₦{(variety === 'coloured' ? avgColoured : avgGreen).toLocaleString()}/kg
              </span>
            </div>

            <div className="relative">
              <span className="absolute left-4 top-3.5 text-xl font-bold text-slate-400">₦</span>
              <input
                type="number"
                required
                value={pricePerKg}
                onChange={e => setPricePerKg(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="e.g. 4500"
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-2xl font-black text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white transition"
              />
            </div>

            {/* Quick Tap Price Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <span className="text-[11px] text-slate-400 font-semibold shrink-0">Quick tap:</span>
              {(variety === 'coloured' ? colouredPriceOptions : greenPriceOptions).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPricePerKg(p)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition shrink-0 ${
                    pricePerKg === p
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  ₦{p.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Step 3: Quantity (kg) */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              3. Quantity sold (kg):
            </label>

            <div className="relative">
              <input
                type="number"
                required
                value={quantityKg}
                onChange={e => setQuantityKg(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="e.g. 50"
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3 text-xl font-bold text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white transition"
              />
              <span className="absolute right-4 top-3.5 text-sm font-bold text-slate-400">kg</span>
            </div>

            {/* Quick Tap Quantity Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <span className="text-[11px] text-slate-400 font-semibold shrink-0">Quick tap:</span>
              {quantityOptions.map(q => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setQuantityKg(q)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition shrink-0 ${
                    quantityKg === q
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {q} kg
                </button>
              ))}
            </div>
          </div>

          {/* Step 4: Market / Farm Location */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              4. Location of sale:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {COMMON_LOCATIONS.map(loc => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setLocation(loc)}
                  className={`p-2.5 rounded-xl border text-xs font-bold text-center transition ${
                    location === loc
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {loc.split('(')[0]}
                </button>
              ))}
            </div>
            {location === 'Other' && (
              <input
                type="text"
                value={customLocation}
                onChange={e => setCustomLocation(e.target.value)}
                placeholder="Type your state or market (e.g. Ibadan, Kaduna)"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 mt-2"
              />
            )}
          </div>

          {/* Optional: Farmer Details */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                Your Details (Optional):
              </span>
              <span className="text-[10px] text-slate-400">
                Saved on your phone for next time
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                value={farmerName}
                onChange={e => setFarmerName(e.target.value)}
                placeholder="Your Name / Farm Name"
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400"
              />
              <input
                type="text"
                value={farmerPhone}
                onChange={e => setFarmerPhone(e.target.value)}
                placeholder="WhatsApp Number (e.g. 0803...)"
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-base py-3.5 px-6 rounded-2xl transition shadow-sm hover:shadow flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>Save My Price to Group Index</span>
          </button>
        </form>

        {/* Instant Success Alert */}
        {justSubmitted && (
          <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-950 text-xs flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <strong>Price Logged Successfully!</strong>
                <p className="text-emerald-800">
                  Added ₦{submittedPrice.toLocaleString()}/kg to the community index. Thank you for contributing!
                </p>
              </div>
            </div>
            <button
              onClick={onShareWhatsApp}
              className="bg-emerald-600 text-white font-bold px-3 py-1.5 rounded-xl shrink-0 flex items-center gap-1 shadow-xs"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>
          </div>
        )}
      </div>

      {/* Today's Market Rate Summary Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-sm text-white">Today's Going Rates</span>
          </div>
          <span className="text-xs text-slate-400">
            Based on {records.length} recent farmer sales
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-800/80 rounded-2xl p-3.5 border border-slate-700">
            <span className="text-xs text-slate-400 block mb-0.5">🫑 Green Pepper</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-emerald-400">
                ₦{avgGreen.toLocaleString()}
              </span>
              <span className="text-xs text-slate-400">/kg</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">Fair Range: ₦4,000 - ₦5,000</span>
          </div>

          <div className="bg-slate-800/80 rounded-2xl p-3.5 border border-slate-700">
            <span className="text-xs text-slate-400 block mb-0.5">🌶️ Coloured Pepper</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-amber-400">
                ₦{avgColoured.toLocaleString()}
              </span>
              <span className="text-xs text-slate-400">/kg</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">Fair Range: ₦6,500 - ₦7,500</span>
          </div>
        </div>

        {/* Share to WhatsApp Quick Action */}
        <button
          onClick={onShareWhatsApp}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs py-3 px-4 rounded-xl transition flex items-center justify-center gap-2"
        >
          <MessageCircle className="w-4 h-4 fill-slate-950" />
          <span>Post Today's Rates to WhatsApp Group</span>
        </button>
      </div>

      {/* Need an Offtaker Quick Help Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-extrabold text-sm text-slate-900">
              Need a Buyer for Your Harvest?
            </h4>
            <p className="text-xs text-slate-500">
              Direct contacts for verified cucumber & pepper offtakers (e.g. Yakubu).
            </p>
          </div>
        </div>

        {onOpenOfftakers && (
          <button
            onClick={onOpenOfftakers}
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1 shrink-0"
          >
            <span>View Buyers</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
          </button>
        )}
      </div>

      {/* Advanced Tools Link for Group Admins or Detailed Analysis */}
      {onOpenAdvanced && (
        <div className="text-center pt-2">
          <button
            onClick={onOpenAdvanced}
            className="text-xs text-slate-500 hover:text-slate-800 font-semibold underline decoration-slate-300 underline-offset-4 transition"
          >
            Need AI Chat Extractor, History Charts, or COP Calculator? Switch to Advanced Tools →
          </button>
        </div>
      )}
    </div>
  );
};
