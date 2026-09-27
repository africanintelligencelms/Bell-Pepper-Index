import React, { useEffect, useState } from 'react';
import { PepperType, PledgeFloor, PledgeSummaryResponse } from '../types';
import { getPledgeKey } from '../lib/pledgeKey';
import { Check, Loader2, ShieldQuestion, Users } from 'lucide-react';

/**
 * "What is the lowest you will accept this week?"
 *
 * Refusing a lowball offer is a coordination problem, not an information one. A
 * farmer who knows the fair price still takes ₦3,000 today, because holding for
 * ₦4,500 only pays off if everyone else holds too. A number on a screen does not
 * change that payoff. Knowing that seventeen other members in your hub have said,
 * on the record, that they are not selling below ₦2,300 does.
 *
 * It is also the only honest way for this app to have a floor at all. The band in
 * `price_bands` is admin-set, and calling it "the association's agreed floor"
 * when no association agreed it is one member's opinion in the association's
 * clothes. A pledge floor is what it says it is: what members told each other
 * they would refuse, with the count of them attached.
 *
 * The count is the point, so it is shown before the figure.
 */

interface PledgeCardProps {
  farmerLocation: string;
  /** Prefilled suggestion per variety, from the live band. Never hardcoded. */
  suggestedFor: (type: PepperType) => number | undefined;
  onPledged?: () => void;
}

const VARIETIES: { value: PepperType; label: string }[] = [
  { value: 'green', label: 'Green' },
  { value: 'coloured', label: 'Coloured' },
];

export const PledgeCard: React.FC<PledgeCardProps> = ({
  farmerLocation,
  suggestedFor,
  onPledged,
}) => {
  const [summary, setSummary] = useState<PledgeSummaryResponse | null>(null);
  const [variety, setVariety] = useState<PepperType>('green');
  const [minPerKg, setMinPerKg] = useState<number | ''>('');
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justPledged, setJustPledged] = useState(false);

  const fetchSummary = async () => {
    try {
      const res = await fetch(`/api/pledges/summary?location=${encodeURIComponent(farmerLocation)}`, {
        headers: { 'x-pledge-key': getPledgeKey() },
      });
      const json = await res.json();
      if (json.success && json.data) setSummary(json.data as PledgeSummaryResponse);
    } catch {
      // A pledge summary that cannot be read is not worth an error message on
      // the farmer's main screen; the card simply does not render its figures.
    }
  };

  useEffect(() => {
    void fetchSummary();
    // Re-reads when the farmer changes hub: a pledge belongs to one hub, and
    // showing Jos's holding count to a Lagos seller would be the same error as
    // showing them the Jos floor.
  }, [farmerLocation]);

  // Suggest the band figure until the farmer types their own, which always wins.
  useEffect(() => {
    if (touched || minPerKg !== '') return;
    const mine = summary?.mine.find(p => p.type === variety);
    const suggestion = mine?.minPerKg ?? suggestedFor(variety);
    if (suggestion) setMinPerKg(suggestion);
  }, [summary, variety, touched, minPerKg, suggestedFor]);

  const handleVariety = (next: PepperType) => {
    setVariety(next);
    if (!touched) {
      const mine = summary?.mine.find(p => p.type === next);
      const suggestion = mine?.minPerKg ?? suggestedFor(next);
      setMinPerKg(suggestion ?? '');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!minPerKg || Number(minPerKg) <= 0) return;

    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/pledges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-pledge-key': getPledgeKey() },
        body: JSON.stringify({ type: variety, minPerKg: Number(minPerKg), location: farmerLocation }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || `Your pledge did not save (${res.status}).`);
      }
      setSummary(json.data as PledgeSummaryResponse);
      setJustPledged(true);
      setTimeout(() => setJustPledged(false), 5000);
      onPledged?.();
    } catch (err: any) {
      // Never imply a pledge was counted when it was not: the holding count is
      // the one number members are trusting each other with.
      setError(err.message || 'The server is unreachable, so your pledge was not recorded.');
    } finally {
      setSaving(false);
    }
  };

  const floor: PledgeFloor | undefined =
    variety === 'green' ? summary?.green : summary?.coloured;
  const myPledge = summary?.mine.find(p => p.type === variety);

  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-5">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-slate-900 text-white rounded-xl shrink-0">
          <Users className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h3 className="font-extrabold text-slate-900 text-base leading-tight">
            What is the lowest you will accept this week?
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Nobody can hold a price alone. This is how the group sees how many of us are holding.
          </p>
        </div>
      </div>

      {/* The count leads, because the count is the mechanism. */}
      {floor && (
        <div
          className={`rounded-2xl p-4 border-2 ${
            floor.sufficient ? 'bg-emerald-50 border-emerald-300' : 'bg-slate-50 border-slate-200'
          }`}
        >
          {floor.sufficient && floor.floorPerKg !== null ? (
            <>
              <p className="font-black text-emerald-900 text-sm leading-snug">
                {floor.holdingCount} of {floor.countedPledges} members are holding at
                ₦{floor.floorPerKg.toLocaleString()}/kg or above{summary?.hub ? ` in ${summary.hub}` : ''}.
              </p>
              <p className="text-[11px] text-emerald-800 mt-1.5 leading-relaxed">
                {floor.note}
              </p>
            </>
          ) : (
            <p className="text-xs text-slate-600 leading-relaxed flex gap-2">
              <ShieldQuestion className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <span>{floor.note}</span>
            </p>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {VARIETIES.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleVariety(opt.value)}
              className={`py-2.5 rounded-2xl border-2 text-xs font-bold transition ${
                variety === opt.value
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-slate-400">
            ₦
          </span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={minPerKg}
            onChange={e => {
              setTouched(true);
              setMinPerKg(e.target.value === '' ? '' : Number(e.target.value));
            }}
            className="w-full pl-10 pr-4 py-3.5 text-xl font-black rounded-2xl border-2 border-slate-200 focus:border-slate-900 focus:outline-none text-slate-900"
          />
        </div>

        <button
          type="submit"
          disabled={saving || !minPerKg}
          className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold py-3 rounded-2xl text-sm transition flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Recording…</span>
            </>
          ) : (
            <span>{myPledge ? 'Update my pledge' : 'I will not sell below this'}</span>
          )}
        </button>

        {justPledged && (
          <p className="text-xs text-emerald-800 font-bold flex items-center gap-1.5">
            <Check className="w-4 h-4 text-emerald-600" />
            Pledge recorded for this week.
          </p>
        )}
        {error && <p className="text-xs text-rose-700 font-semibold">{error}</p>}

        {myPledge && !justPledged && (
          <p className="text-[11px] text-slate-500">
            You pledged ₦{myPledge.minPerKg.toLocaleString()}/kg for {variety} this week.
          </p>
        )}
      </form>
    </div>
  );
};
