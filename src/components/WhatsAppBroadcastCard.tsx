import React, { useState } from 'react';
import { MarketRate, MarketRateResponse, PriceRecord } from '../types';
import { 
  X, 
  Copy, 
  Check, 
  MessageSquare, 
  ExternalLink,
  Sparkles,
  Zap
} from 'lucide-react';

interface WhatsAppBroadcastCardProps {
  isOpen: boolean;
  onClose: () => void;
  records: PriceRecord[];
  /** Same server-computed rate the app shows, so the two cannot disagree. */
  marketRate?: MarketRateResponse;
}

export const WhatsAppBroadcastCard: React.FC<WhatsAppBroadcastCardProps> = ({
  isOpen,
  onClose,
  records,
  marketRate
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // This message is the app's most public artefact — it gets pasted into the
  // group and quoted at buyers. It must carry exactly the figure the app shows,
  // computed by the same server rule, never a second average derived here.
  const green = marketRate?.green;
  const coloured = marketRate?.coloured;

  /** Describes what stands behind a figure, so the group can judge it. */
  const provenance = (rate?: MarketRate) => {
    if (!rate) return 'rate unavailable';
    if (!rate.sufficient) return `association target — only ${rate.sampleSize} recent sale(s) logged`;
    const sales = rate.sampleSize === 1 ? 'sale' : 'sales';
    return `median of ${rate.sampleSize} greenhouse ${sales}, last ${rate.windowDays} days`;
  };

  const spread = (rate?: MarketRate) =>
    rate && rate.low !== null && rate.high !== null
      ? `₦${rate.low.toLocaleString()} - ₦${rate.high.toLocaleString()} / kg`
      : 'not enough recent sales to show a range';

  const todayStr = new Date().toLocaleDateString('en-NG', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const appUrl = window.location.origin;

  const floorLine = (rate?: MarketRate, label = 'floor') =>
    rate?.band ? `₦${rate.band.min.toLocaleString()} / kg ${label}` : 'floor not set';

  // The floor leads. It is the number a farmer repeats when a buyer opens low,
  // so it has to be the first thing read in the group — the live median is
  // supporting evidence for it, not the headline.
  const whatsappText = `📊 *GREENHOUSE PEPPER — AGREED FLOOR PRICE*
📅 ${todayStr}

🚫 *DO NOT SELL BELOW THESE PRICES:*

🌶️ *COLOURED (Red / Yellow):*  ${floorLine(coloured, 'minimum')}
🫑 *GREEN:*  ${floorLine(green, 'minimum')}

────────────────
📈 *What members actually got:*
• Coloured: ₦${coloured ? coloured.pricePerKg.toLocaleString() : '—'} / kg — ${provenance(coloured)}
• Green: ₦${green ? green.pricePerKg.toLocaleString() : '—'} / kg — ${provenance(green)}
${coloured?.low !== null && coloured?.low !== undefined ? `• Most coloured sales: ${spread(coloured)}\n` : ''}${green?.low !== null && green?.low !== undefined ? `• Most green sales: ${spread(green)}` : ''}

⚠️ *IF A BUYER OFFERS LESS:*
Open-field pepper is a different crop to ours. Greenhouse peppers have thicker
walls and last 14-21 days, so we can hold and wait. Nobody has to take the
first offer.

👉 *Log what you sold for:*
${appUrl}

_Greenhouse sales only. Buyer offers and open-field prices are excluded._
_Naija Greenhouse Pepper Index_`;

  const handleCopy = () => {
    navigator.clipboard.writeText(whatsappText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareToWhatsApp = () => {
    const encoded = encodeURIComponent(whatsappText);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 md:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 text-slate-800 rounded-2xl max-w-xl w-full flex flex-col shadow-lg overflow-hidden my-auto">
        {/* Header */}
        <div className="p-4 md:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-xl">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base md:text-lg text-slate-900">
                Send the Agreed Floor Price
              </h3>
              <p className="text-xs text-slate-500">
                The price to quote when a buyer opens low
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 md:p-6 space-y-4 flex-1 text-xs">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Ready to paste into the group:</span>
            </label>
            <div className="bg-slate-50 border border-emerald-300 p-4 rounded-xl font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed shadow-xs border-l-4 border-l-emerald-600">
              {whatsappText}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleShareToWhatsApp}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-xs"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Send to WhatsApp</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </button>

            <button
              onClick={handleCopy}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2.5 px-4 rounded-xl text-xs transition border border-slate-200 flex items-center justify-center gap-2"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-500" />
                  <span>Copy Text Snippet</span>
                </>
              )}
            </button>
          </div>

          <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl space-y-1">
            <div className="font-bold text-amber-900 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-600" />
              <span>WhatsApp Group Member Quick Tips:</span>
            </div>
            <p className="text-amber-950">
              Farmers can type prices directly into the group chat anytime (e.g. <em>"Color 7,000, Green 4,500 Jos"</em>). Copying that text into the AI Extractor tab will parse it instantly!
            </p>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs rounded-xl transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
