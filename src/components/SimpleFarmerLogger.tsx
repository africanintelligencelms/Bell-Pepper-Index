import React, { useState, useEffect } from 'react';
import { MarketRate, MarketRateResponse, PepperType, PriceRecord, ProductionMethod, TransactionType } from '../types';
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
  /** Server-computed going rate. Undefined until the API answers. */
  marketRate?: MarketRateResponse;
  /** Sales logged on this device, and whether that has opened the extra tools. */
  contributions: number;
  unlocked: boolean;
  /** Where this farmer sells — decides which hub's floor they are shown. */
  farmerLocation: string;
  onLocationChange: (location: string) => void;
  onAddPrice: (entry: {
    type: PepperType;
    pricePerKg: number;
    quantityKg: number;
    transactionType: TransactionType;
    productionMethod: ProductionMethod;
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
  marketRate,
  contributions,
  unlocked,
  farmerLocation,
  onLocationChange,
  onAddPrice,
  onOpenOfftakers,
  onOpenAdvanced,
  onShareWhatsApp
}) => {
  // Form State
  const [variety, setVariety] = useState<PepperType>('green');
  // Left empty until the live floor arrives. A hardcoded starting price is
  // how the form previously suggested ₦4,500 while the agreed floor sat at
  // ₦2,250 — a prefill that is wrong is worse than no prefill.
  const [pricePerKg, setPricePerKg] = useState<number | ''>('');
  const [priceTouched, setPriceTouched] = useState(false);
  const [quantityKg, setQuantityKg] = useState<number | ''>(50);
  // Lifted to App: changing it must also change which floor is displayed.
  const location = farmerLocation;
  const setLocation = onLocationChange;
  const [customLocation, setCustomLocation] = useState('');
  const [farmerName, setFarmerName] = useState(() => localStorage.getItem('farmer_name') || '');
  const [farmerPhone, setFarmerPhone] = useState(() => localStorage.getItem('farmer_phone') || '');
  // The published rate counts greenhouse sales only, so both of these have to
  // be asked rather than assumed. They used to be hardcoded to actual_sale and
  // greenhouse, which meant a buyer's lowball offer was recorded as a
  // confirmed greenhouse sale and counted towards the rate farmers quote back
  // at that same buyer.
  const [transactionType, setTransactionType] = useState<TransactionType | null>(null);
  const [productionMethod, setProductionMethod] = useState<ProductionMethod>('greenhouse');
  const [showTypeError, setShowTypeError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [submittedPrice, setSubmittedPrice] = useState<number>(0);

  // The rate is not computed here. It used to be a plain mean of every record
  // ever logged, which blended open-field produce and buyers' offers into a
  // figure farmers quoted as the greenhouse rate. /api/market-rate now owns
  // the rule; this component only renders what it returns.

  // When variety changes, suggest realistic starter price
  const bandTargetFor = (v: PepperType): number | undefined =>
    (v === 'coloured' ? marketRate?.coloured : marketRate?.green)?.band?.target;

  const handleSelectVariety = (v: PepperType) => {
    setVariety(v);
    // Re-suggest for the newly chosen variety unless the farmer has typed
    // their own figure, which always wins.
    if (!priceTouched) {
      const target = bandTargetFor(v);
      if (target) setPricePerKg(target);
    }
  };

  // Suggest the agreed target once the live floor loads, so the field is not
  // empty on arrival but never shows a figure from a stale market.
  useEffect(() => {
    if (priceTouched || pricePerKg !== '') return;
    const target = bandTargetFor(variety);
    if (target) setPricePerKg(target);
  }, [marketRate, variety, priceTouched, pricePerKg]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pricePerKg || Number(pricePerKg) <= 0) return;

    // Deliberately no default. Pre-selecting "I sold it" would reproduce the
    // old behaviour, because a default that is almost always accepted is the
    // same as a hardcoded value.
    if (!transactionType) {
      setShowTypeError(true);
      return;
    }

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
      transactionType,
      productionMethod,
      qualityGrade: 'grade_a',
      location: chosenLocation,
      farmerName: finalName,
      farmerPhone: farmerPhone.trim() || undefined,
    });

    setIsSubmitting(false);
    setTransactionType(null);
    setShowTypeError(false);
    setPriceTouched(false);
    setPricePerKg('');
    setJustSubmitted(true);
    setTimeout(() => setJustSubmitted(false), 5000);
  };


  /** Renders one variety's rate, including how much data stands behind it. */
  const RateCard: React.FC<{ rate?: MarketRate; label: string; accent: string }> = ({
    rate,
    label,
    accent,
  }) => (
    <div className="bg-slate-800/80 rounded-2xl p-3.5 border border-slate-700">
      <span className="text-xs text-slate-400 block mb-0.5">{label}</span>
      <div className="flex items-baseline gap-1">
        <span className={`text-xl font-black ${accent}`}>
          {rate ? `₦${rate.pricePerKg.toLocaleString()}` : '—'}
        </span>
        <span className="text-xs text-slate-400">/kg</span>
      </div>

      {rate?.band && (
        <span className="text-[10px] text-slate-400 mt-1 block">
          Agreed range: ₦{rate.band.min.toLocaleString()} - ₦{rate.band.max.toLocaleString()}
        </span>
      )}

      {/* A figure built on two sales must not look like one built on twenty. */}
      {rate && !rate.sufficient && (
        <span className="text-[10px] text-amber-300 mt-1 block font-semibold">
          Association target — not enough recent sales
        </span>
      )}

      {/* The community rate sitting under the agreed floor is the single most
          important thing a farmer can know before answering a buyer. */}
      {rate?.sufficient && rate.withinBand === false && rate.band && rate.pricePerKg < rate.band.min && (
        <span className="text-[10px] text-rose-300 mt-1 block font-semibold">
          Below the agreed floor of ₦{rate.band.min.toLocaleString()}
        </span>
      )}
    </div>
  );

  /**
   * Quick-tap prices are built around the agreed floor rather than fixed
   * numbers, so they move when the association moves the floor. The lowest
   * option is the floor itself — never below it, because offering a
   * one-tap below-floor price would undercut the thing the app is for.
   */
  const priceOptionsFor = (v: PepperType): number[] => {
    const band = (v === 'coloured' ? marketRate?.coloured : marketRate?.green)?.band;
    if (!band) return v === 'coloured' ? [3500, 3850, 4200, 4500, 5000] : [2000, 2250, 2500, 2750, 3000];
    const step = Math.max(Math.round((band.max - band.min) / 2), 50);
    return [band.min, band.target, band.max, band.max + step, band.max + step * 2];
  };
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
          {/* Step 1: What kind of price is this? The rate depends on it. */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              1. Did you sell, or is this an offer?
            </label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: 'actual_sale', label: 'I sold it', hint: 'Money agreed', emoji: '\u2705' },
                { value: 'buyer_offer', label: 'Buyer offered', hint: "Their price", emoji: '\ud83d\udcb0' },
                { value: 'farmer_asking', label: "I'm asking", hint: 'My price', emoji: '\ud83c\udff7\ufe0f' },
              ] as const).map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setTransactionType(opt.value);
                    setShowTypeError(false);
                  }}
                  className={`p-3 rounded-2xl border-2 text-center transition-all ${
                    transactionType === opt.value
                      ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 shadow-xs'
                      : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <span className="text-lg block">{opt.emoji}</span>
                  <span className="font-bold text-xs block mt-0.5">{opt.label}</span>
                  <span className="text-[10px] text-slate-500 block">{opt.hint}</span>
                </button>
              ))}
            </div>

            {/* Only completed sales set the published rate, so say so rather
                than letting a contributor wonder why their offer changed nothing. */}
            {transactionType && transactionType !== 'actual_sale' && (
              <p className="text-[11px] text-slate-500 leading-snug">
                Thank you \u2014 this is recorded for the group, but only completed sales set the
                published going rate.
              </p>
            )}
            {showTypeError && (
              <p className="text-[11px] text-rose-600 font-semibold">
                Please choose one \u2014 it decides whether this price counts towards the group rate.
              </p>
            )}
          </div>

          {/* Step 1: Choose Pepper Variety */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              2. What type of pepper?
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
                  <span className="text-xs text-slate-500">Grade A</span>
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

          {/* Growing method: the rate counts greenhouse only, so an open-field
              price must be able to say so rather than being filed as greenhouse. */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              3. How was it grown?
            </label>
            <div className="grid grid-cols-2 gap-3">
              {([
                { value: 'greenhouse', label: 'Greenhouse', hint: 'Thick walls, long shelf life' },
                { value: 'open_field', label: 'Open Field', hint: 'Rain-fed, sells lower' },
              ] as const).map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setProductionMethod(opt.value)}
                  className={`p-3 rounded-2xl border-2 text-left transition-all ${
                    productionMethod === opt.value
                      ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 shadow-xs'
                      : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <span className="font-bold text-sm block">{opt.label}</span>
                  <span className="text-[10px] text-slate-500 block leading-snug">{opt.hint}</span>
                </button>
              ))}
            </div>
            {productionMethod === 'open_field' && (
              <p className="text-[11px] text-amber-700 leading-snug font-medium">
                Logged separately from greenhouse prices \u2014 the two are different markets, and
                keeping them apart is what stops buyers quoting open-field rates for greenhouse
                produce.
              </p>
            )}
          </div>

          {/* Step 2: Price per KG */}
          <div className="space-y-2.5">
            {/* Stacks on a phone: side by side these two collide at 390px. */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                4. Price per kg (in Naira)
              </label>
              <span className="text-xs text-emerald-700 font-bold">
                {(() => {
                  const r = variety === 'coloured' ? marketRate?.coloured : marketRate?.green;
                  return r ? `Going rate: ₦${r.pricePerKg.toLocaleString()}/kg` : 'Loading rate…';
                })()}
              </span>
            </div>

            <div className="relative">
              <span className="absolute left-4 top-3.5 text-xl font-bold text-slate-400">₦</span>
              <input
                type="number"
                required
                value={pricePerKg}
                onChange={e => {
                  setPriceTouched(true);
                  setPricePerKg(e.target.value === '' ? '' : Number(e.target.value));
                }}
                placeholder="Enter price"
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-2xl font-black text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white transition"
              />
            </div>

            {/* The whole point of the app, delivered at the moment it matters:
                a farmer typing a number is deciding whether to accept an offer,
                and this is where they find out it is under the agreed floor. */}
            {(() => {
              const rate = variety === 'coloured' ? marketRate?.coloured : marketRate?.green;
              const floor = rate?.band?.min;
              const entered = Number(pricePerKg);
              if (!floor || !entered || entered <= 0) return null;

              if (entered < floor) {
                const short = floor - entered;
                return (
                  <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-3.5 space-y-1">
                    <p className="font-extrabold text-rose-900 text-sm">
                      ₦{short.toLocaleString()}/kg below our agreed floor
                    </p>
                    <p className="text-xs text-rose-800 leading-relaxed">
                      The group agreed ₦{floor.toLocaleString()}/kg as the lowest fair price.
                      You can still log this — but you can also tell the buyer the floor and
                      wait. Greenhouse peppers keep for 14-21 days.
                    </p>
                  </div>
                );
              }

              return (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-700 shrink-0 stroke-[3]" />
                  <p className="text-xs text-emerald-900 font-semibold">
                    At or above the agreed floor of ₦{floor.toLocaleString()}/kg.
                  </p>
                </div>
              );
            })()}

            {/* Quick Tap Price Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <span className="text-[11px] text-slate-400 font-semibold shrink-0">Quick tap:</span>
              {priceOptionsFor(variety).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setPriceTouched(true);
                    setPricePerKg(p);
                  }}
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
              5. Quantity (kg):
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
              6. Location:
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
        <div className="border-b border-slate-800 pb-3 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span className="font-bold text-sm text-white">Today's Going Rates</span>
            </div>
            {/* Naming the hub matters: these figures differ by up to ₦450/kg of
                freight, so a farmer has to be able to see the floor is theirs. */}
            {marketRate?.hub && (
              <span className="text-[11px] text-emerald-300 font-semibold flex items-center gap-1 shrink-0">
                <MapPin className="w-3 h-3" />
                <span>{marketRate.hub.split(' (')[0]}</span>
              </span>
            )}
          </div>
          <span className="text-xs text-slate-400 block">
            {marketRate
              ? marketRate.green.sufficient || marketRate.coloured.sufficient
                ? `Median of greenhouse sales, last ${Math.max(marketRate.green.windowDays, marketRate.coloured.windowDays)} days`
                : 'Association agreed floor — no recent sales logged yet'
              : 'Loading live rates…'}
          </span>
          {marketRate?.hub && (
            <span className="text-[11px] text-slate-500 block">
              Showing prices for {location}. Change your location above to see another hub.
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <RateCard rate={marketRate?.green} label="🫑 Green Pepper" accent="text-emerald-400" />
          <RateCard rate={marketRate?.coloured} label="🌶️ Coloured Pepper" accent="text-amber-400" />
        </div>

        {/* Share to WhatsApp Quick Action */}
        <button
          onClick={onShareWhatsApp}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs py-3 px-4 rounded-xl transition flex items-center justify-center gap-2"
        >
          <MessageCircle className="w-4 h-4 fill-slate-950" />
          <span>Send Floor Price to WhatsApp Group</span>
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

      {/* Extra tools are earned by logging sales rather than requested and
          waited for. Framed as progress towards something, not a locked door. */}
      {onOpenAdvanced && (
        <div className="pt-1">
          {unlocked ? (
            <div className="text-center">
              <button
                onClick={onOpenAdvanced}
                className="text-xs text-slate-500 hover:text-slate-800 font-semibold underline decoration-slate-300 underline-offset-4 transition"
              >
                Open price history, cost calculator and the WhatsApp chat reader →
              </button>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-sm text-slate-900">
                  Unlock the extra tools
                </span>
                <span className="text-xs font-bold text-emerald-700 shrink-0">
                  {contributions} of 3 sales
                </span>
              </div>

              {/* Three blocks rather than a percentage bar: countable at a glance. */}
              <div className="flex gap-1.5" aria-hidden="true">
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    className={`h-2 flex-1 rounded-full ${
                      i < contributions ? 'bg-emerald-500' : 'bg-slate-200'
                    }`}
                  />
                ))}
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Log {3 - contributions} more {3 - contributions === 1 ? 'sale' : 'sales'} to open price
                history charts, the cost-of-production calculator and the WhatsApp chat reader.
                The index is built from what members log — so the tools open once you have added
                to it.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
