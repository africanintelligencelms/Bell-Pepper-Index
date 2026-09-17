import React from 'react';
import { 
  Sprout, 
  MessageSquare, 
  PlusCircle, 
  Sparkles, 
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  BarChart2,
  Scale,
  Calculator,
  Users
} from 'lucide-react';

export type ActiveTab = 'simple_logger' | 'live' | 'band' | 'calculator' | 'offtakers' | 'extractor' | 'log' | 'history';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  appMode: 'simple' | 'advanced';
  setAppMode: (mode: 'simple' | 'advanced') => void;
  onOpenBroadcastModal: () => void;
  onResetData: () => void;
  isResetting: boolean;
  totalRecordsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  appMode,
  setAppMode,
  onOpenBroadcastModal,
  onResetData,
  isResetting,
  totalRecordsCount
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 text-slate-800 px-4 py-3 shadow-xs">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Brand Logo & Title */}
        <div className="flex items-center justify-between">
          <div 
            onClick={() => {
              setAppMode('simple');
              setActiveTab('simple_logger');
            }}
            className="flex items-center gap-3 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm font-bold shrink-0">
              <Sprout className="w-6 h-6 text-emerald-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base md:text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
                  <span>Naija Pepper Index</span>
                  {appMode === 'simple' ? (
                    <span className="text-[11px] bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold inline-flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" /> Farmer Quick Mode
                    </span>
                  ) : (
                    <span className="text-[11px] bg-purple-100 text-purple-800 border border-purple-200 px-2 py-0.5 rounded-full font-semibold hidden sm:inline-flex items-center gap-1">
                      Advanced Tools
                    </span>
                  )}
                </h1>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                <span>Greenhouse Bell Pepper Network</span>
                <span className="text-slate-300">•</span>
                <span className="text-emerald-700 font-semibold">{totalRecordsCount} Live Quotes</span>
              </p>
            </div>
          </div>

          {/* Quick Action on Mobile */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={onOpenBroadcastModal}
              className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-xl text-xs font-semibold flex items-center gap-1 shadow-xs"
              title="WhatsApp Broadcast"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                if (appMode === 'simple') {
                  setAppMode('advanced');
                  setActiveTab('live');
                } else {
                  setAppMode('simple');
                  setActiveTab('simple_logger');
                }
              }}
              className="px-2.5 py-1.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-200"
            >
              {appMode === 'simple' ? 'More Tools' : 'Farmer Mode'}
            </button>
          </div>
        </div>

        {/* Tab Navigation Controls */}
        {appMode === 'advanced' ? (
          <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 overflow-x-auto text-xs font-semibold">
            <button
              onClick={() => {
                setAppMode('simple');
                setActiveTab('simple_logger');
              }}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white font-bold flex items-center gap-1 whitespace-nowrap shadow-xs"
            >
              <Sprout className="w-3.5 h-3.5" />
              <span>← Simple Farmer Mode</span>
            </button>

            <button
              onClick={() => setActiveTab('live')}
              className={`px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'live'
                  ? 'bg-white text-emerald-800 shadow-xs border border-slate-200 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Market Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('band')}
              className={`px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'band'
                  ? 'bg-white text-emerald-900 shadow-xs border border-emerald-300 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Scale className="w-3.5 h-3.5 text-emerald-600" />
              <span>Unified (+/-) Band</span>
            </button>

            <button
              onClick={() => setActiveTab('calculator')}
              className={`px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'calculator'
                  ? 'bg-white text-emerald-900 shadow-xs border border-emerald-300 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Calculator className="w-3.5 h-3.5 text-purple-600" />
              <span>COP & Breakeven</span>
            </button>

            <button
              onClick={() => setActiveTab('offtakers')}
              className={`px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'offtakers'
                  ? 'bg-white text-emerald-900 shadow-xs border border-emerald-300 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-emerald-600" />
              <span>Offtaker Network</span>
            </button>

            <button
              onClick={() => setActiveTab('extractor')}
              className={`px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'extractor'
                  ? 'bg-purple-600 text-white shadow-xs font-bold'
                  : 'text-purple-800 hover:bg-purple-100/70'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-200" />
              <span>Paste Chat (AI)</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'history'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5 text-slate-600" />
              <span>History</span>
            </button>
          </div>
        ) : (
          /* Simple Mode Header - Clean & Focused */
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => {
                setAppMode('advanced');
                setActiveTab('offtakers');
              }}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl font-bold transition flex items-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5 text-emerald-600" />
              <span>Buyer Contacts</span>
            </button>

            <button
              onClick={() => {
                setAppMode('advanced');
                setActiveTab('live');
              }}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl font-bold transition flex items-center gap-1.5"
            >
              <TrendingUp className="w-3.5 h-3.5 text-purple-600" />
              <span>More Tools</span>
            </button>

            <button
              onClick={onOpenBroadcastModal}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Share Rates</span>
            </button>
          </div>
        )}

        {/* Desktop Reset in Advanced Mode */}
        {appMode === 'advanced' && (
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={onOpenBroadcastModal}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-xs"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Share to WhatsApp</span>
            </button>

            <button
              onClick={onResetData}
              disabled={isResetting}
              className="bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 p-2 rounded-xl text-xs transition"
              title="Reset to initial sample dataset"
            >
              <RefreshCw className={`w-4 h-4 ${isResetting ? 'animate-spin' : ''}`} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
