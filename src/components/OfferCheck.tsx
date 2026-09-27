import React, { useState } from 'react';
import { OfferCheckResponse, OfferOutcome, PepperType } from '../types';
import { COMMON_LOCATIONS } from '../data/locations';
import {
  AlertTriangle,
  Check,
  Copy,
  Handshake,
  Loader2,
  MapPin,
  MessageCircle,
  ShieldCheck,
  ThumbsDown,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

/**
 * The front door: "a buyer is offering me ₦___ — is that fair?"
 *
 * The app used to open on "log today's price", which asks a farmer to file
 * paperwork about a sale that is already over. This screen answers the question
 * they actually have, at the moment they have it, with a buyer standing in front
 * of them — and the record of the offer is a byproduct of having been useful
 * rather than a favour requested up front.
 *
 * Checking writes nothing. The record is created only when the farmer says what
 * happened, which is both an explicit confirmation that a real buyer really
 * offered this and the more valuable datum: a refused lowball is the evidence
 * that holding the line works, and until now it left no trace anywhere.
 */

interface OfferCheckProps {
  farmerLocation: string;
  onLocationChange: (location: string) => void;
  /** Free checks left before a sale is asked for; null when uncapped. */
  freeChecksRemaining: number | null;
  /** Called once a verdict has actually been shown. */
  onChecked: () => void;
  /** Writes the buyer_offer record. Resolves true when the server confirmed. */
  onLogOutcome: (entry: {
    type: PepperType;
    pricePerKg: number;
    quantityKg: number;
    location: string;
    outcome: OfferOutcome;
  }) => Promise<boolean>;
  /** Send the farmer to the logger, with a reason. */
  onNeedSale: () => void;
}

const QUANTITY_OPTIONS = [30, 50, 100, 200, 500];

export const OfferCheck: React.FC<OfferCheckProps> = ({
  farmerLocation,
  onLocationChange,
  freeChecksRemaining,
  onChecked,
  onLogOutcome,
  onNeedSale,
}) => {
  const [variety, setVariety] = useState<PepperType>('green');
  // No default price. A prefilled offer is a number the app made up, and this
  // screen exists to judge a number a buyer actually said.
  const [offerPerKg, setOfferPerKg] = useState<number | ''>('');
  const [quantityKg, setQuantityKg] = useState<number | ''>(50);
  const [result, setResult] = useState<OfferCheckResponse | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [outcomeSaved, setOutcomeSaved] = useState<OfferOutcome | null>(null);
  const [outcomeError, setOutcomeError] = useState<string | null>(null);
  const [savingOutcome, setSavingOutcome] = useState<OfferOutcome | null>(null);

  const mustLogFirst = freeChecksRemaining === 0;

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerPerKg || Number(offerPerKg) <= 0) return;

    setIsChecking(true);
    setError(null);
    setResult(null);
    setOutcomeSaved(null);
    setOutcomeError(null);

    try {
      const res = await fetch('/api/check-offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: variety,
          offerPerKg: Number(offerPerKg),
          quantityKg: Number(quantityKg) || 50,
          location: farmerLocation,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || `The server could not check this offer (${res.status}).`);
      }
      setResult(json.data as OfferCheckResponse);
      onChecked();
    } catch (err: any) {
      // Say nothing about the offer rather than guessing at a verdict offline:
      // a wrong verdict here is a farmer selling at the wrong price.
      setError(err.message || 'The server is unreachable, so this offer cannot be checked right now.');
    } finally {
      setIsChecking(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.verdict.buyerReply);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSendToBuyer = () => {
    if (!result) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(result.verdict.buyerReply)}`, '_blank');
  };

  const handleOutcome = async (outcome: OfferOutcome) => {
    if (!result) return;
    setSavingOutcome(outcome);
    setOutcomeError(null);
    const saved = await onLogOutcome({
      type: variety,
      pricePerKg: Number(offerPerKg),
      quantityKg: Number(quantityKg) || 50,
      location: farmerLocation,
      outcome,
    });
    setSavingOutcome(null);
    // Never show a confirmation for a write that did not happen.
    if (saved) setOutcomeSaved(outcome);
    else setOutcomeError('That did not save. Please try again — nothing was recorded.');
  };

  /** Colour and icon follow the verdict, with below-floor as the alarm. */
  const verdictStyle = () => {
    switch (result?.verdict.level) {
      case 'below_floor':
        return {
          wrap: 'bg-rose-50 border-rose-300',
          title: 'text-rose-900',
          icon: <AlertTriangle className="w-5 h-5 text-rose-600" />,
          label: 'Below the floor',
        };
      case 'below_market':
        return {
          wrap: 'bg-amber-50 border-amber-300',
          title: 'text-amber-900',
          icon: <TrendingDown className="w-5 h-5 text-amber-600" />,
          label: 'Under the going rate',
        };
      case 'above_market':
        return {
          wrap: 'bg-emerald-50 border-emerald-300',
          title: 'text-emerald-900',
          icon: <TrendingUp className="w-5 h-5 text-emerald-600" />,
          label: 'A strong offer',
        };
      default:
        return {
          wrap: 'bg-slate-50 border-slate-300',
          title: 'text-slate-900',
          icon: <ShieldCheck className="w-5 h-5 text-slate-500" />,
          label: 'About the going rate',
        };
    }
  };

  if (mustLogFirst) {
    // The reciprocity ask. It comes only after three checks have been given
    // away, so it is a fair exchange rather than a toll gate on a stranger.
    return (
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-xl shrink-0">
            <Handshake className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="font-extrabold text-slate-900 text-base">
              You have checked three offers. Your turn.
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Every verdict you just read came from prices other members logged. Log one sale —
              what you actually got, for any variety — and offer checks stay open from then on.
            </p>
          </div>
        </div>
        <button
          onClick={onNeedSale}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-2xl text-sm transition shadow-xs"
        >
          Log a sale
        </button>
      </div>
    );
  }

  const style = verdictStyle();

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-5">
        <div className="space-y-1">
          <h2 className="text-xl font-black tracking-tight text-slate-900">
            A buyer is offering me…
          </h2>
          <p className="text-xs text-slate-500">
            Find out what it is worth before you answer. Nothing is recorded until you say so.
          </p>
        </div>

        <form onSubmit={handleCheck} className="space-y-5">
          {/* Variety: coloured and green are effectively two different markets. */}
          <div className="grid grid-cols-2 gap-2">
            {([
              { value: 'green', label: 'Green', emoji: '🫑' },
              { value: 'coloured', label: 'Coloured', emoji: '🌶️' },
            ] as const).map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setVariety(opt.value)}
                className={`p-3 rounded-2xl border-2 text-center transition-all ${
                  variety === opt.value
                    ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 shadow-xs'
                    : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <span className="text-lg block">{opt.emoji}</span>
                <span className="font-bold text-xs block mt-0.5">{opt.label}</span>
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Their price per kg
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-black text-slate-400">
                ₦
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={offerPerKg}
                onChange={e => setOfferPerKg(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="3000"
                className="w-full pl-10 pr-4 py-4 text-2xl font-black rounded-2xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none text-slate-900"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              How many kg
            </label>
            <div className="flex flex-wrap gap-1.5">
              {QUANTITY_OPTIONS.map(q => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setQuantityKg(q)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition ${
                    quantityKg === q
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {q}kg
                </button>
              ))}
            </div>
          </div>

          {/* Where they sell decides which floor applies. Lagos carries ₦450/kg
              of freight over Jos, so the wrong hub is the wrong verdict. */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              Where you are selling
            </label>
            <select
              value={farmerLocation}
              onChange={e => onLocationChange(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none text-sm font-semibold text-slate-800 bg-white"
            >
              {COMMON_LOCATIONS.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={isChecking || !offerPerKg}
            className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold py-4 rounded-2xl text-sm transition shadow-xs flex items-center justify-center gap-2"
          >
            {isChecking ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Checking…</span>
              </>
            ) : (
              <span>Is this a fair price?</span>
            )}
          </button>

          {freeChecksRemaining !== null && (
            <p className="text-[11px] text-slate-500 text-center">
              {freeChecksRemaining} free {freeChecksRemaining === 1 ? 'check' : 'checks'} left. After
              that, log one sale and they stay open.
            </p>
          )}
        </form>

        {error && (
          <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3 font-semibold">
            {error}
          </p>
        )}
      </div>

      {result && (
        <div className={`border-2 rounded-3xl p-5 space-y-4 ${style.wrap}`}>
          <div className="flex items-start gap-3">
            <div className="shrink-0 mt-0.5">{style.icon}</div>
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider opacity-70">
                {style.label}
              </span>
              <p className={`font-extrabold text-sm leading-snug ${style.title}`}>
                {result.verdict.headline}
              </p>
            </div>
          </div>

          <ul className="space-y-1.5 text-xs text-slate-700">
            {result.verdict.reasoning.map((line, i) => (
              <li key={i} className="flex gap-2 leading-relaxed">
                <span className="text-slate-400 shrink-0">•</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>

          {/* The copyable reply is what turns a verdict into a refusal. A farmer
              who can send one message is far likelier to hold than one who has
              to find the words themselves mid-negotiation. */}
          <div className="bg-white/80 border border-slate-200 rounded-2xl p-3.5 space-y-2.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              Send this to the buyer
            </span>
            <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
              {result.verdict.buyerReply}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleSendToBuyer}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-1.5"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Send on WhatsApp</span>
              </button>
              <button
                onClick={handleCopy}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2.5 rounded-xl text-xs transition border border-slate-200 flex items-center justify-center gap-1.5"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* The outcome is the only thing here that writes a record. */}
          {outcomeSaved ? (
            <div className="bg-white/80 border border-emerald-200 rounded-2xl p-3.5 text-xs text-emerald-900 font-semibold flex items-start gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                {outcomeSaved === 'refused'
                  ? 'Recorded that you turned it down. The group will see that this offer was refused.'
                  : outcomeSaved === 'accepted'
                    ? 'Recorded as a buyer offer you accepted. Log the sale itself below so it counts towards the rate.'
                    : 'Recorded. Come back and tell us what you decided.'}
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                What did you do?
              </span>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: 'refused', label: 'I turned it down', icon: <ThumbsDown className="w-3.5 h-3.5" /> },
                  { value: 'accepted', label: 'I took it', icon: <Check className="w-3.5 h-3.5" /> },
                  { value: 'undecided', label: 'Still deciding', icon: null },
                ] as const).map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleOutcome(opt.value)}
                    disabled={savingOutcome !== null}
                    className="bg-white hover:bg-slate-50 disabled:opacity-50 border-2 border-slate-200 rounded-xl py-2.5 px-2 text-[11px] font-bold text-slate-700 transition flex flex-col items-center gap-1"
                  >
                    {savingOutcome === opt.value ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      opt.icon
                    )}
                    <span className="leading-tight text-center">{opt.label}</span>
                  </button>
                ))}
              </div>
              {outcomeError && (
                <p className="text-[11px] text-rose-700 font-semibold">{outcomeError}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
