import React, { useState } from 'react';
import { PriceRecord } from '../types';
import { BarChart3, User, MapPin, ShieldCheck } from 'lucide-react';

interface PriceTrendChartProps {
  records: PriceRecord[];
}

export const PriceTrendChart: React.FC<PriceTrendChartProps> = ({ records }) => {
  const [activeTooltipDate, setActiveTooltipDate] = useState<string | null>(null);

  // Sort records by date ascending
  const sorted = [...records].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Group records by date and type
  const dateMap: {
    [date: string]: {
      colouredRecords: PriceRecord[];
      greenRecords: PriceRecord[];
    };
  } = {};

  sorted.forEach(r => {
    if (!dateMap[r.date]) {
      dateMap[r.date] = { colouredRecords: [], greenRecords: [] };
    }
    if (r.type === 'coloured') dateMap[r.date].colouredRecords.push(r);
    if (r.type === 'green') dateMap[r.date].greenRecords.push(r);
  });

  const dates = Object.keys(dateMap).slice(-8); // last 8 recorded dates

  const chartData = dates.map(date => {
    const colList = dateMap[date].colouredRecords;
    const grnList = dateMap[date].greenRecords;

    const avgColoured = colList.length
      ? Math.round(colList.reduce((a, b) => a + b.pricePerKg, 0) / colList.length)
      : null;

    const avgGreen = grnList.length
      ? Math.round(grnList.reduce((a, b) => a + b.pricePerKg, 0) / grnList.length)
      : null;

    return {
      date,
      avgColoured,
      avgGreen,
      colouredRecords: colList,
      greenRecords: grnList,
    };
  });

  const maxVal = 9000;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-100 border border-amber-200 text-amber-700 rounded-xl">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <span>Price Trend Chart (NGN / kg)</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-mono flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" /> Hover for Farmer Audit
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Hover over bars to inspect contributor farmer names, locations & quote details
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold">
          <span className="flex items-center gap-1.5 text-amber-800">
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span> Coloured Peppers
          </span>
          <span className="flex items-center gap-1.5 text-emerald-800">
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span> Green Peppers
          </span>
        </div>
      </div>

      {/* Visual Bar Comparison Chart with Light Tooltip */}
      <div className="pt-2 pb-2">
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3 items-end h-52 bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 relative">
          {chartData.map((d, i) => {
            const colHeight = d.avgColoured ? Math.round((d.avgColoured / maxVal) * 100) : 0;
            const grnHeight = d.avgGreen ? Math.round((d.avgGreen / maxVal) * 100) : 0;
            const isHovered = activeTooltipDate === d.date;

            return (
              <div
                key={i}
                onMouseEnter={() => setActiveTooltipDate(d.date)}
                onMouseLeave={() => setActiveTooltipDate(null)}
                className="flex flex-col items-center justify-end h-full space-y-2 group relative cursor-pointer"
              >
                {/* Active Tooltip Box */}
                {isHovered && (
                  <div className={`absolute bottom-full mb-3 z-30 w-72 bg-white border border-slate-300 text-slate-800 p-3.5 rounded-xl shadow-xl space-y-2 text-xs pointer-events-none ${
                    i > 4 ? 'right-0' : 'left-1/2 -translate-x-1/2'
                  }`}>
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 font-bold text-slate-900">
                      <span>📅 Date: {d.date}</span>
                      <span className="text-[10px] text-emerald-700 font-mono font-bold">Verified Quotes</span>
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {/* Coloured Records */}
                      {d.colouredRecords.length > 0 && (
                        <div className="space-y-1">
                          <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                            🫑 Coloured (Avg ₦{d.avgColoured?.toLocaleString()}/kg)
                          </div>
                          {d.colouredRecords.map(rec => (
                            <div key={rec.id} className="bg-amber-50/60 p-2 rounded border border-amber-200/80 text-[11px] space-y-0.5">
                              <div className="flex items-center justify-between font-semibold text-slate-900">
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3 text-slate-500" /> {rec.farmerName}
                                </span>
                                <span className="text-amber-800 font-bold">₦{rec.pricePerKg.toLocaleString()}/kg</span>
                              </div>
                              <div className="text-[10px] text-slate-500 flex items-center justify-between">
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-2.5 h-2.5 text-emerald-600" /> {rec.location}
                                </span>
                                <span>{rec.quantityKg} kg</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Green Records */}
                      {d.greenRecords.length > 0 && (
                        <div className="space-y-1">
                          <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                            🫑 Green (Avg ₦{d.avgGreen?.toLocaleString()}/kg)
                          </div>
                          {d.greenRecords.map(rec => (
                            <div key={rec.id} className="bg-emerald-50/60 p-2 rounded border border-emerald-200/80 text-[11px] space-y-0.5">
                              <div className="flex items-center justify-between font-semibold text-slate-900">
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3 text-slate-500" /> {rec.farmerName}
                                </span>
                                <span className="text-emerald-800 font-bold">₦{rec.pricePerKg.toLocaleString()}/kg</span>
                              </div>
                              <div className="text-[10px] text-slate-500 flex items-center justify-between">
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-2.5 h-2.5 text-emerald-600" /> {rec.location}
                                </span>
                                <span>{rec.quantityKg} kg</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="w-full flex items-end justify-center gap-1.5 h-36">
                  {/* Coloured bar */}
                  {d.avgColoured ? (
                    <div
                      style={{ height: `${colHeight}%` }}
                      className={`w-4 bg-gradient-to-t from-amber-500 to-amber-400 rounded-t transition-all relative flex justify-center ${
                        isHovered ? 'ring-2 ring-amber-500 shadow-md' : 'opacity-90'
                      }`}
                    >
                      <span className="absolute -top-5 text-amber-900 text-[9px] font-black whitespace-nowrap">
                        ₦{(d.avgColoured / 1000).toFixed(1)}k
                      </span>
                    </div>
                  ) : (
                    <div className="w-4 h-1 bg-slate-200 rounded"></div>
                  )}

                  {/* Green bar */}
                  {d.avgGreen ? (
                    <div
                      style={{ height: `${grnHeight}%` }}
                      className={`w-4 bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t transition-all relative flex justify-center ${
                        isHovered ? 'ring-2 ring-emerald-500 shadow-md' : 'opacity-90'
                      }`}
                    >
                      <span className="absolute -top-5 text-emerald-900 text-[9px] font-black whitespace-nowrap">
                        ₦{(d.avgGreen / 1000).toFixed(1)}k
                      </span>
                    </div>
                  ) : (
                    <div className="w-4 h-1 bg-slate-200 rounded"></div>
                  )}
                </div>

                <span className={`text-[10px] font-mono truncate max-w-full transition ${
                  isHovered ? 'text-slate-900 font-bold' : 'text-slate-500'
                }`}>
                  {d.date.replace('2026-', '')}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
