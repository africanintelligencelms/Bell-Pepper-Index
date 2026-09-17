import React, { useState, useEffect } from 'react';
import { PricePredictionResult } from '../types';
import { 
  BrainCircuit, 
  TrendingUp, 
  AlertTriangle, 
  Sparkles, 
  RefreshCw, 
  ShieldCheck, 
  Lightbulb, 
  CheckCircle2,
  BarChart3
} from 'lucide-react';

interface MarketIntelligencePanelProps {
  recordsCount: number;
}

export const MarketIntelligencePanel: React.FC<MarketIntelligencePanelProps> = ({ recordsCount }) => {
  const [prediction, setPrediction] = useState<PricePredictionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPrediction = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/predict-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setPrediction(json.data);
      } else {
        throw new Error(json.error || 'Failed to fetch AI market intelligence');
      }
    } catch (err: any) {
      setError(err.message || 'Error running AI analysis');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPrediction();
  }, [recordsCount]);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-purple-100 border border-purple-200 text-purple-700 rounded-xl">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <span>AI Market Strategy & Buyer Protection</span>
              <span className="text-[10px] bg-purple-100 text-purple-800 border border-purple-200 px-2 py-0.5 rounded-full font-mono font-semibold">
                Gemini AI Engine
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Real-time fair price targets & defense against buyer price suppression
            </p>
          </div>
        </div>

        <button
          onClick={fetchPrediction}
          disabled={isLoading}
          className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 font-medium"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-purple-600' : ''}`} />
          <span>{isLoading ? 'Analyzing...' : 'Refresh AI Strategy'}</span>
        </button>
      </div>

      {isLoading && !prediction ? (
        <div className="py-8 text-center text-slate-500 text-xs space-y-2">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-purple-600" />
          <p>Analyzing community farmer price logs & supply trends...</p>
        </div>
      ) : prediction ? (
        <div className="space-y-4 text-xs">
          {/* Executive Summary */}
          <div className="bg-purple-50/80 border border-purple-200/80 p-3.5 rounded-xl text-purple-950 leading-relaxed flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-purple-900">Community Strategy Summary: </span>
              <span>{prediction.marketSummary}</span>
            </div>
          </div>

          {/* Recommended Targets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-amber-50/80 border border-amber-200 p-3.5 rounded-xl space-y-1">
              <div className="text-[11px] font-bold text-amber-900 uppercase tracking-wide">
                🫑 Rec. Coloured Pepper Target
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-slate-900">
                  ₦{prediction.recommendedColouredPrice?.toLocaleString()}
                </span>
                <span className="text-slate-500 font-medium">/ kg</span>
              </div>
              <p className="text-[11px] text-slate-600">
                Maintains +₦{prediction.colouredPremiumSpread?.toLocaleString()} premium over green variety.
              </p>
            </div>

            <div className="bg-emerald-50/80 border border-emerald-200 p-3.5 rounded-xl space-y-1">
              <div className="text-[11px] font-bold text-emerald-900 uppercase tracking-wide">
                🫑 Rec. Greenhouse Green Target Floor
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-slate-900">
                  ₦{prediction.recommendedGreenPrice?.toLocaleString()}
                </span>
                <span className="text-slate-500 font-medium">/ kg</span>
              </div>
              <p className="text-[11px] text-slate-600">
                Minimum target floor price to safeguard farmer profitability.
              </p>
            </div>
          </div>

          {/* Offtaker Fallacy & Manipulation Warnings */}
          {prediction.offtakerAlerts && prediction.offtakerAlerts.length > 0 && (
            <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-xl space-y-2">
              <div className="font-bold text-rose-900 flex items-center gap-1.5 text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Buyer Tactics & Manipulation Warning:</span>
              </div>
              <ul className="space-y-1.5 text-rose-900/90 pl-5 list-disc">
                {prediction.offtakerAlerts.map((alert, idx) => (
                  <li key={idx} className="leading-normal">{alert}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Key Strategic Insights */}
          {prediction.keyInsights && prediction.keyInsights.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-2">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <span>WhatsApp Group Advice:</span>
              </div>
              <ul className="space-y-1.5 text-slate-700">
                {prediction.keyInsights.map((insight, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-4 text-xs text-slate-500">
          Click "Refresh AI Strategy" to view recommendations.
        </div>
      )}
    </div>
  );
};
