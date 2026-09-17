import React, { useState, useEffect } from 'react';
import { PriceRecord, WhatsAppParsedEntry, PepperType, TransactionType, ProductionMethod, QualityGrade } from './types';
import { Navbar, ActiveTab } from './components/Navbar';
import { PriceOverviewHero } from './components/PriceOverviewHero';
import { MarketIntelligencePanel } from './components/MarketIntelligencePanel';
import { PriceTrendChart } from './components/PriceTrendChart';
import { PriceHistoryTable } from './components/PriceHistoryTable';
import { WhatsAppExtractorModal } from './components/WhatsAppExtractorModal';
import { LogPriceModal } from './components/LogPriceModal';
import { WhatsAppBroadcastCard } from './components/WhatsAppBroadcastCard';
import { UnifiedPriceBandCard } from './components/UnifiedPriceBandCard';
import { ProductionCostCalculator } from './components/ProductionCostCalculator';
import { OfftakerDirectory } from './components/OfftakerDirectory';
import { SimpleFarmerLogger } from './components/SimpleFarmerLogger';
import { INITIAL_PRICE_RECORDS } from './data/seedPrices';
import { CheckCircle, Sprout, Sparkles, PlusCircle, BarChart2, Scale, Calculator, Users, ArrowRight } from 'lucide-react';

export default function App() {
  const [records, setRecords] = useState<PriceRecord[]>(INITIAL_PRICE_RECORDS);
  const [isLoading, setIsLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // App Mode: 'simple' for civil servants & traditional farmers, 'advanced' for full analytical suite
  const [appMode, setAppMode] = useState<'simple' | 'advanced'>('simple');

  // Active Tab for bite-sized simple UX
  const [activeTab, setActiveTab] = useState<ActiveTab>('simple_logger');

  // Modals state for popups
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isExtractModalOpen, setIsExtractModalOpen] = useState(false);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch initial prices from API
  const fetchPrices = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/prices');
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        setRecords(json.data);
      } else {
        setRecords(INITIAL_PRICE_RECORDS);
      }
    } catch (err) {
      console.warn('API error, falling back to local seed data:', err);
      setRecords(INITIAL_PRICE_RECORDS);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices();
  }, []);

  // Handle single manual price submission
  const handleAddPrice = async (newEntry: {
    type: PepperType;
    pricePerKg: number;
    quantityKg: number;
    transactionType: TransactionType;
    productionMethod: ProductionMethod;
    qualityGrade: QualityGrade;
    location: string;
    farmerName: string;
    farmerPhone?: string;
    notes?: string;
  }) => {
    try {
      const res = await fetch('/api/prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newEntry,
          source: 'manual_entry',
          date: new Date().toISOString().split('T')[0],
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setRecords(prev => [json.data, ...prev]);
        showToast(`Logged ₦${newEntry.pricePerKg.toLocaleString()}/kg for ${newEntry.type} pepper!`);
      } else {
        throw new Error(json.error || 'Failed to submit price');
      }
    } catch (err: any) {
      // Fallback local update
      const fallback: PriceRecord = {
        id: `rec-${Date.now()}`,
        ...newEntry,
        date: new Date().toISOString().split('T')[0],
        source: 'manual_entry',
        createdAt: new Date().toISOString(),
      };
      setRecords(prev => [fallback, ...prev]);
      showToast(`Logged ₦${newEntry.pricePerKg.toLocaleString()}/kg locally!`);
    }

    // If in simple mode, stay on simple logger; otherwise switch to live dashboard
    if (appMode === 'advanced') {
      setActiveTab('live');
    }
  };

  // Handle bulk confirm from WhatsApp Extractor
  const handleConfirmExtracted = async (entries: WhatsAppParsedEntry[]) => {
    if (entries.length === 0) return;

    try {
      const recordsToPost = entries.map(e => ({
        type: e.type,
        pricePerKg: e.pricePerKg,
        quantityKg: e.quantityKg,
        transactionType: e.transactionType,
        productionMethod: e.productionMethod,
        qualityGrade: 'grade_a' as QualityGrade,
        location: e.location,
        date: e.date,
        farmerName: e.senderName,
        farmerPhone: e.senderPhone,
        notes: e.rawContextText,
        source: 'whatsapp_extracted' as const,
      }));

      const res = await fetch('/api/prices/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: recordsToPost }),
      });

      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setRecords(prev => [...json.data, ...prev]);
        showToast(`Successfully imported ${json.data.length} WhatsApp price quotes!`);
      } else {
        throw new Error(json.error || 'Failed to import records');
      }
    } catch (err: any) {
      showToast(`Imported ${entries.length} records into dashboard!`);
    }

    // Switch to live tab
    setActiveTab('live');
  };

  // Handle delete
  const handleDeleteRecord = async (id: string) => {
    try {
      await fetch(`/api/prices/${id}`, { method: 'DELETE' });
    } catch (e) {
      // ignore
    }
    setRecords(prev => prev.filter(r => r.id !== id));
    showToast('Price record deleted.');
  };

  // Handle dataset reset
  const handleResetData = async () => {
    setIsResetting(true);
    try {
      const res = await fetch('/api/prices/reset', { method: 'POST' });
      const json = await res.json();
      if (json.success && json.data) {
        setRecords(json.data);
      } else {
        setRecords([...INITIAL_PRICE_RECORDS]);
      }
      showToast('Reset to initial WhatsApp group chat dataset.');
    } catch (err) {
      setRecords([...INITIAL_PRICE_RECORDS]);
      showToast('Reset dataset to initial state.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased selection:bg-emerald-500 selection:text-white flex flex-col">
      {/* Light Clean Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        appMode={appMode}
        setAppMode={setAppMode}
        onOpenBroadcastModal={() => setIsBroadcastModalOpen(true)}
        onResetData={handleResetData}
        isResetting={isResetting}
        totalRecordsCount={records.length}
      />

      {/* Main Container - Bite-Sized Clean Sections */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        {/* Advanced Mode Notice Banner */}
        {appMode === 'advanced' && (
          <div className="bg-emerald-50/90 border border-emerald-200 rounded-2xl px-4 py-2.5 flex items-center justify-between text-xs gap-2">
            <span className="font-semibold text-emerald-900 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>You are viewing Advanced Analysis & History Tools</span>
            </span>
            <button
              onClick={() => {
                setAppMode('simple');
                setActiveTab('simple_logger');
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1 rounded-xl transition shrink-0"
            >
              ← Back to Simple Farmer Mode
            </button>
          </div>
        )}

        {/* Simple Mode: Clean, Jargon-Free Logger for Farmers & Civil Servants */}
        {(appMode === 'simple' || activeTab === 'simple_logger') && (
          <div className="animate-in fade-in duration-200">
            <SimpleFarmerLogger
              records={records}
              onAddPrice={handleAddPrice}
              onOpenOfftakers={() => {
                setAppMode('advanced');
                setActiveTab('offtakers');
              }}
              onOpenAdvanced={() => {
                setAppMode('advanced');
                setActiveTab('live');
              }}
              onShareWhatsApp={() => setIsBroadcastModalOpen(true)}
            />
          </div>
        )}

        {/* Tab 1: Live Market Index (Advanced Mode) */}
        {appMode === 'advanced' && activeTab === 'live' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <PriceOverviewHero
              records={records}
              onSelectTab={setActiveTab}
              onOpenBroadcastModal={() => setIsBroadcastModalOpen(true)}
            />

            <MarketIntelligencePanel recordsCount={records.length} />

            {/* Community Resolutions & Offtaker Quick Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                onClick={() => setActiveTab('band')}
                className="bg-emerald-50/80 hover:bg-emerald-100/90 border border-emerald-200 p-4 rounded-2xl cursor-pointer transition flex flex-col justify-between shadow-xs space-y-2"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                      <Scale className="w-4 h-4" />
                    </span>
                    <span className="text-[10px] bg-emerald-200 text-emerald-900 font-bold px-2 py-0.5 rounded-full">
                      Marketers Model
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">Unified (+/-) Range Band</h4>
                  <p className="text-xs text-slate-600 leading-normal">
                    Check if buyer offers fall in the agreed association range. Stop operating in silos!
                  </p>
                </div>
                <span className="text-emerald-700 font-bold text-xs flex items-center gap-1 mt-2">
                  <span>View Range Bands</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>

              <div
                onClick={() => setActiveTab('calculator')}
                className="bg-purple-50/80 hover:bg-purple-100/90 border border-purple-200 p-4 rounded-2xl cursor-pointer transition flex flex-col justify-between shadow-xs space-y-2"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="p-1.5 bg-purple-100 text-purple-800 rounded-lg">
                      <Calculator className="w-4 h-4" />
                    </span>
                    <span className="text-[10px] bg-purple-200 text-purple-900 font-bold px-2 py-0.5 rounded-full">
                      COP vs 4k Offer
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">COP & Distress Matrix</h4>
                  <p className="text-xs text-slate-600 leading-normal">
                    COP is ₦6k but Lagos market is ₦4k? Calculate cash contribution & shelf-life holding options.
                  </p>
                </div>
                <span className="text-purple-700 font-bold text-xs flex items-center gap-1 mt-2">
                  <span>Open Decision Matrix</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>

              <div
                onClick={() => setActiveTab('offtakers')}
                className="bg-blue-50/80 hover:bg-blue-100/90 border border-blue-200 p-4 rounded-2xl cursor-pointer transition flex flex-col justify-between shadow-xs space-y-2"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="p-1.5 bg-blue-100 text-blue-800 rounded-lg">
                      <Users className="w-4 h-4" />
                    </span>
                    <span className="text-[10px] bg-blue-200 text-blue-900 font-bold px-2 py-0.5 rounded-full">
                      Cucumbers & Peppers
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">Offtaker Directory</h4>
                  <p className="text-xs text-slate-600 leading-normal">
                    Verified contacts (Yakubu +234 803 632 9227 & more) for urgent perishable harvests.
                  </p>
                </div>
                <span className="text-blue-700 font-bold text-xs flex items-center gap-1 mt-2">
                  <span>Connect with Buyers</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>

            {/* Bite-sized Quick Action Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div 
                onClick={() => setActiveTab('extractor')}
                className="bg-purple-50 hover:bg-purple-100/80 border border-purple-200 p-4 rounded-2xl cursor-pointer transition flex items-center justify-between gap-3 shadow-xs"
              >
                <div className="space-y-0.5">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span>Paste WhatsApp Group Chat</span>
                  </h4>
                  <p className="text-xs text-slate-600">
                    No forms needed! Paste chat text & AI extracts price quotes automatically.
                  </p>
                </div>
                <span className="bg-purple-600 text-white font-bold text-xs px-3 py-1.5 rounded-xl shrink-0">
                  Open Parser →
                </span>
              </div>

              <div 
                onClick={() => setActiveTab('log')}
                className="bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 p-4 rounded-2xl cursor-pointer transition flex items-center justify-between gap-3 shadow-xs"
              >
                <div className="space-y-0.5">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <PlusCircle className="w-4 h-4 text-emerald-600" />
                    <span>Log Your Sale or Offer</span>
                  </h4>
                  <p className="text-xs text-slate-600">
                    Submit your recent price per kg to help fellow farmers negotiate with buyers.
                  </p>
                </div>
                <span className="bg-emerald-600 text-white font-bold text-xs px-3 py-1.5 rounded-xl shrink-0">
                  Log Sale →
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Unified (+/-) Range Band */}
        {appMode === 'advanced' && activeTab === 'band' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <UnifiedPriceBandCard 
              onSelectOfftakerTab={() => setActiveTab('offtakers')}
              onSelectCalculatorTab={() => setActiveTab('calculator')}
            />
            <MarketIntelligencePanel recordsCount={records.length} />
          </div>
        )}

        {/* Tab 3: COP & Breakeven Decision Matrix */}
        {appMode === 'advanced' && activeTab === 'calculator' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <ProductionCostCalculator
              onGoToOfftakers={() => setActiveTab('offtakers')}
              onGoToUnifiedBand={() => setActiveTab('band')}
            />
          </div>
        )}

        {/* Tab 4: Verified Offtaker Directory */}
        {appMode === 'advanced' && activeTab === 'offtakers' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <OfftakerDirectory onSelectBandTab={() => setActiveTab('band')} />
          </div>
        )}

        {/* Tab 5: AI WhatsApp Chat Parser */}
        {appMode === 'advanced' && activeTab === 'extractor' && (
          <div className="animate-in fade-in duration-200">
            <WhatsAppExtractorModal
              isOpen={true}
              onClose={() => {
                setAppMode('simple');
                setActiveTab('simple_logger');
              }}
              onConfirmExtracted={handleConfirmExtracted}
              isInlineTab={true}
            />
          </div>
        )}

        {/* Tab 6: Log Sale Price Form */}
        {appMode === 'advanced' && activeTab === 'log' && (
          <div className="animate-in fade-in duration-200">
            <LogPriceModal
              isOpen={true}
              onClose={() => {
                setAppMode('simple');
                setActiveTab('simple_logger');
              }}
              onSubmit={handleAddPrice}
              isInlineTab={true}
            />
          </div>
        )}

        {/* Tab 7: Market History & Trends */}
        {appMode === 'advanced' && activeTab === 'history' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <PriceTrendChart records={records} />
            <PriceHistoryTable records={records} onDeleteRecord={handleDeleteRecord} />
            <MarketIntelligencePanel recordsCount={records.length} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 px-4 text-center text-xs text-slate-500 mt-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-emerald-700 font-bold">🫑 Naija Greenhouse Pepper Index</span>
            <span>— Simple Agricultural Transparency Tool</span>
          </div>
          <p>
            Built for Nigerian Greenhouse Bell Pepper Farmers • Plateau, Abuja, Kano, Lagos, Oyo
          </p>
        </div>
      </footer>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-emerald-700 text-white font-bold text-xs px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 animate-bounce border border-emerald-500">
          <CheckCircle className="w-4 h-4 text-emerald-200 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Popup Modals */}
      {isLogModalOpen && (
        <LogPriceModal
          isOpen={isLogModalOpen}
          onClose={() => setIsLogModalOpen(false)}
          onSubmit={handleAddPrice}
        />
      )}

      {isExtractModalOpen && (
        <WhatsAppExtractorModal
          isOpen={isExtractModalOpen}
          onClose={() => setIsExtractModalOpen(false)}
          onConfirmExtracted={handleConfirmExtracted}
        />
      )}

      {isBroadcastModalOpen && (
        <WhatsAppBroadcastCard
          isOpen={isBroadcastModalOpen}
          onClose={() => setIsBroadcastModalOpen(false)}
          records={records}
        />
      )}
    </div>
  );
}
