import React, { useState } from 'react';
import { WhatsAppParsedEntry } from '../types';
import { 
  Sparkles, 
  X, 
  Check, 
  AlertCircle, 
  CheckCircle2, 
  FileText,
  User,
  RefreshCw
} from 'lucide-react';

interface WhatsAppExtractorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmExtracted: (entries: WhatsAppParsedEntry[]) => void;
  isInlineTab?: boolean;
}

const SAMPLE_PRICE_QUOTES = `Farm With Magaji: Good morning please who have colored bell peppers 30kg
dafomstephenfriday (+234 906 790 3161):
✓ Color 6,500 to 7,000 
✓ Green 3,000 to 3,500.
Kwang Zion high junction, Jos.
sophiaumunadi65 (+234 816 085 4630): Someone offered 4,500 for green yesterday
Hoomsuk (+234 803 285 9957): We have close to 200kg green ready in Jos East (Babawo)
Bandekaji (+234 703 615 0770): 5k today for green
+234 803 519 5274: Please I also have green if you are buying for 4k. Come get it.
+234 916 834 1823: Unfortunately you failed to address the coloured, maybe you can buy for 7k`;

const SAMPLE_RECENT_DEBATE = `Farmer 1: Let's say you calculated your production cost per kg and it hits 6k per kg, then unfortunately for the farmer pepper is selling at the cost of 4k per kg in Lagos for that week, how will that calculation help the farmer? Will he or she keep his pepper which is perishable, hoping and praying that the cost improves?
Farmer 2: Lol. It's actually bigger than this. Are you saying the cost of production in Lagos can be less than Jos? Use realistic figures. Your cost of production in Jos cannot be higher than purchasing cost anywhere. There was a time a farm in Taraba single handedly crashed prices. How did they do it?
Farmer 3: Please are we treating our greenhouse as a business or a hobby??? I believe we are more than just farmers.
Farmer 4: If there's any tip you have to help in cutting cost of production you can share. Forces of demand and supply can mess up calculations.
Farmer 5: Good evening my people. Pls can anyone link me up with any cucumber offtaker(s). Thanks
Farmer 6: +234 803 632 9227 - Yakubu
Farmer 7: My brother there is no united voice here. We are still hoping that farmers will stand by collective resolutions.
Farmer 8: Unified plus or minus (+-) pricing. We will never get everyone to sell at the same price, just a range. Fuel is within a range by the marketers 😀, having a range will help members.`;

export const WhatsAppExtractorModal: React.FC<WhatsAppExtractorModalProps> = ({
  isOpen,
  onClose,
  onConfirmExtracted,
  isInlineTab = false
}) => {
  const [chatText, setChatText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedEntries, setExtractedEntries] = useState<WhatsAppParsedEntry[]>([]);
  const [hasExtracted, setHasExtracted] = useState(false);

  if (!isOpen && !isInlineTab) return null;

  const handleLoadQuotesSample = () => {
    setChatText(SAMPLE_PRICE_QUOTES);
    setError(null);
  };

  const handleLoadDebateSample = () => {
    setChatText(SAMPLE_RECENT_DEBATE);
    setError(null);
  };

  const handleParseText = async () => {
    if (!chatText.trim()) {
      setError('Please paste raw WhatsApp text or click "Load Sample Chat".');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/parse-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatText }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || 'Failed to parse chat messages');
      }

      setExtractedEntries(json.data || []);
      setHasExtracted(true);
    } catch (err: any) {
      setError(err.message || 'Error communicating with AI parser');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleEntry = (id: string) => {
    setExtractedEntries(prev =>
      prev.map(e => (e.id === id ? { ...e, selected: !e.selected } : e))
    );
  };

  const handleUpdatePrice = (id: string, newPrice: number) => {
    setExtractedEntries(prev =>
      prev.map(e => (e.id === id ? { ...e, pricePerKg: newPrice } : e))
    );
  };

  const handleConfirm = () => {
    const selected = extractedEntries.filter(e => e.selected);
    if (selected.length === 0) {
      setError('Please select at least one entry to import.');
      return;
    }
    onConfirmExtracted(selected);
    if (!isInlineTab) {
      onClose();
    }
    // Reset state
    setChatText('');
    setExtractedEntries([]);
    setHasExtracted(false);
  };

  const content = (
    <div className="bg-white border border-slate-200 text-slate-800 rounded-2xl max-w-3xl w-full shadow-sm overflow-hidden mx-auto flex flex-col">
      {/* Header */}
      <div className="p-4 md:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-100 border border-purple-200 text-purple-700 rounded-xl">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base md:text-lg text-slate-900">
              AI WhatsApp Chat Extractor
            </h3>
            <p className="text-xs text-slate-500">
              Paste raw group chat messages to convert them into structured price logs
            </p>
          </div>
        </div>
        {!isInlineTab && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Content Body */}
      <div className="p-4 md:p-6 space-y-5 flex-1">
        {!hasExtracted ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-purple-600" />
                <span>Paste Raw WhatsApp Chat Messages:</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleLoadQuotesSample}
                  className="text-xs bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 px-2.5 py-1 rounded-lg transition font-semibold flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3 text-purple-600" />
                  <span>Sample 1: Quotes</span>
                </button>
                <button
                  type="button"
                  onClick={handleLoadDebateSample}
                  className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-lg transition font-semibold flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  <span>Sample 2: Recent Debate & Offtaker</span>
                </button>
              </div>
            </div>

            <textarea
              value={chatText}
              onChange={e => setChatText(e.target.value)}
              placeholder="Paste chat messages here... e.g.
dafomstephenfriday: Color 6,500 to 7,000, Green 3,000 to 3,500
sophiaumunadi65: Someone offered 4,500 for green yesterday
Hoomsuk: We have close to 200kg green ready in Jos East..."
              rows={8}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono leading-relaxed"
            />

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="bg-purple-50/60 border border-purple-100 p-3.5 rounded-xl text-xs text-purple-950 space-y-1">
              <span className="font-bold text-purple-900 flex items-center gap-1">
                💡 How this helps your WhatsApp group:
              </span>
              <p className="text-slate-600">
                Farmers don't need to fill forms! Simply copy messages from your WhatsApp group, paste here, and Gemini AI converts raw text into verified community price quotes.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Extracted {extractedEntries.length} Price Quotes</span>
                </h4>
                <p className="text-xs text-slate-500">
                  Review and confirm entries before adding them to the live index.
                </p>
              </div>
              <button
                onClick={() => setHasExtracted(false)}
                className="text-xs text-purple-700 hover:underline flex items-center gap-1 font-semibold"
              >
                <RefreshCw className="w-3 h-3" /> Re-paste chat
              </button>
            </div>

            <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
              {extractedEntries.map((entry) => (
                <div
                  key={entry.id}
                  className={`p-3.5 rounded-xl border text-xs transition-all ${
                    entry.selected
                      ? 'bg-emerald-50/60 border-emerald-300 text-slate-900'
                      : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={!!entry.selected}
                      onChange={() => handleToggleEntry(entry.id)}
                      className="mt-1 w-4 h-4 rounded border-slate-300 bg-white text-emerald-600 focus:ring-emerald-500"
                    />

                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                            entry.type === 'coloured'
                              ? 'bg-amber-100 text-amber-900 border border-amber-200'
                              : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                          }`}>
                            {entry.type === 'coloured' ? '🫑 Coloured' : '🫑 Green'}
                          </span>

                          <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-[10px] capitalize font-medium">
                            {entry.transactionType.replace('_', ' ')}
                          </span>

                          {entry.senderName && (
                            <span className="text-slate-800 font-semibold flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-500" />
                              {entry.senderName}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-500 font-medium">Price / kg:</span>
                          <span className="font-extrabold text-emerald-700 text-sm">₦</span>
                          <input
                            type="number"
                            value={entry.pricePerKg}
                            onChange={e => handleUpdatePrice(entry.id, Number(e.target.value))}
                            className="w-20 bg-white border border-slate-300 rounded px-2 py-0.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-600 flex items-center gap-3 flex-wrap">
                        <span>Quantity: <strong className="text-slate-900">{entry.quantityKg} kg</strong></span>
                        <span>Location: <strong className="text-slate-900">{entry.location}</strong></span>
                        <span>Method: <strong className="text-slate-900 capitalize">{entry.productionMethod}</strong></span>
                      </div>

                      <div className="bg-white p-2 rounded-lg text-[11px] text-slate-600 font-mono italic border border-slate-200">
                        "{entry.rawContextText}"
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
        {!isInlineTab && (
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
          >
            Cancel
          </button>
        )}

        {!hasExtracted ? (
          <button
            type="button"
            onClick={handleParseText}
            disabled={isLoading || !chatText.trim()}
            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold px-6 py-2.5 rounded-xl transition flex items-center gap-2 shadow-xs ml-auto"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Parsing WhatsApp Chat...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Extract Prices with AI</span>
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleConfirm}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-6 py-2.5 rounded-xl transition flex items-center gap-2 shadow-xs ml-auto"
          >
            <Check className="w-4 h-4" />
            <span>Confirm & Add ({extractedEntries.filter(e => e.selected).length}) Quotes</span>
          </button>
        )}
      </div>
    </div>
  );

  if (isInlineTab) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 md:p-4 overflow-y-auto">
      {content}
    </div>
  );
};
