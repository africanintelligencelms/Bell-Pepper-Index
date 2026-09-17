import React, { useState } from 'react';
import { PepperType, TransactionType, ProductionMethod, QualityGrade } from '../types';
import { X, Plus, Check, MapPin, Tag, Shield, AlertCircle } from 'lucide-react';

interface LogPriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (record: {
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
  }) => void;
  isInlineTab?: boolean;
}

const PRESET_LOCATIONS = [
  'Jos, Plateau State',
  'Abuja (FCT)',
  'Kano State',
  'Lagos State',
  'Ibadan, Oyo State',
  'Kaduna State',
  'Enugu State'
];

export const LogPriceModal: React.FC<LogPriceModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isInlineTab = false
}) => {
  const [type, setType] = useState<PepperType>('coloured');
  const [pricePerKg, setPricePerKg] = useState<number | ''>(7000);
  const [quantityKg, setQuantityKg] = useState<number | ''>(50);
  const [transactionType, setTransactionType] = useState<TransactionType>('actual_sale');
  const [productionMethod, setProductionMethod] = useState<ProductionMethod>('greenhouse');
  const [qualityGrade, setQualityGrade] = useState<QualityGrade>('grade_a');
  const [location, setLocation] = useState('Jos, Plateau State');
  const [farmerName, setFarmerName] = useState('');
  const [farmerPhone, setFarmerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen && !isInlineTab) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pricePerKg || Number(pricePerKg) <= 0) {
      setError('Please enter a valid price per kg in NGN (₦).');
      return;
    }
    if (!quantityKg || Number(quantityKg) <= 0) {
      setError('Please enter a valid quantity in kg.');
      return;
    }
    if (!location.trim()) {
      setError('Please specify location or state.');
      return;
    }

    onSubmit({
      type,
      pricePerKg: Number(pricePerKg),
      quantityKg: Number(quantityKg),
      transactionType,
      productionMethod,
      qualityGrade,
      location: location.trim(),
      farmerName: farmerName.trim() || 'Greenhouse Farmer',
      farmerPhone: farmerPhone.trim() || undefined,
      notes: notes.trim() || undefined
    });

    if (!isInlineTab) {
      onClose();
    }
  };

  const formContent = (
    <div className="bg-white border border-slate-200 text-slate-800 rounded-2xl max-w-2xl w-full shadow-sm overflow-hidden mx-auto">
      {/* Header */}
      <div className="p-4 md:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
        <div>
          <h3 className="font-bold text-base md:text-lg text-slate-900 flex items-center gap-2">
            <span>Log Your Pepper Price</span>
            <span className="text-xs bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full font-semibold">
              Simple Farmer Input
            </span>
          </h3>
          <p className="text-xs text-slate-500">
            Contribute your recent farm sale or market quote to power community price transparency
          </p>
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

      {/* Form Body */}
      <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4 text-xs">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Pepper Variety Selector */}
        <div>
          <label className="block font-bold text-slate-800 mb-1.5">
            1. Select Pepper Variety:
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => {
                setType('coloured');
                if (!pricePerKg || pricePerKg === 4200) setPricePerKg(7000);
              }}
              className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
                type === 'coloured'
                  ? 'bg-amber-50 border-amber-400 text-amber-950 font-bold shadow-xs'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl">🫑</span>
                <div>
                  <div className="text-slate-900 font-bold">Coloured Pepper</div>
                  <div className="text-[10px] text-amber-700 font-medium">Red, Yellow, Orange</div>
                </div>
              </div>
              {type === 'coloured' && <Check className="w-4 h-4 text-amber-600 shrink-0" />}
            </button>

            <button
              type="button"
              onClick={() => {
                setType('green');
                if (!pricePerKg || pricePerKg === 7000) setPricePerKg(4200);
              }}
              className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
                type === 'green'
                  ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold shadow-xs'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl">🫑</span>
                <div>
                  <div className="text-slate-900 font-bold">Green Pepper</div>
                  <div className="text-[10px] text-emerald-700 font-medium">Standard / Firm</div>
                </div>
              </div>
              {type === 'green' && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
            </button>
          </div>
        </div>

        {/* Price & Quantity */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-bold text-slate-800 mb-1">
              2. Price Per Kilogram (₦ NGN):
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-500 font-extrabold text-sm">₦</span>
              <input
                type="number"
                value={pricePerKg}
                onChange={e => setPricePerKg(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="e.g. 7000 or 4500"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-sm text-slate-900 font-black focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1">
              3. Quantity Available / Sold (kg):
            </label>
            <input
              type="number"
              value={quantityKg}
              onChange={e => setQuantityKg(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="e.g. 50, 100, 200"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>
        </div>

        {/* Transaction Type */}
        <div>
          <label className="block font-bold text-slate-800 mb-1">
            4. Record Type:
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'actual_sale', label: 'Completed Sale' },
              { id: 'buyer_offer', label: 'Offtaker Offer' },
              { id: 'farmer_asking', label: 'Farmer Asking' }
            ].map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTransactionType(item.id as TransactionType)}
                className={`py-2 px-2.5 rounded-xl border text-center transition ${
                  transactionType === item.id
                    ? 'bg-emerald-600 text-white font-bold border-emerald-600 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Production System & Quality Grade */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-bold text-slate-800 mb-1">
              5. Production System:
            </label>
            <select
              value={productionMethod}
              onChange={e => setProductionMethod(e.target.value as ProductionMethod)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="greenhouse">Greenhouse (Protected Crop)</option>
              <option value="open_field">Open Field (Rain-fed / Shade)</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1">
              6. Quality Grade:
            </label>
            <select
              value={qualityGrade}
              onChange={e => setQualityGrade(e.target.value as QualityGrade)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="grade_a">Grade A (Firm / Premium / Export)</option>
              <option value="grade_b">Grade B (Standard Local Market)</option>
            </select>
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="block font-bold text-slate-800 mb-1 flex items-center justify-between">
            <span>7. Location / Hub:</span>
            <span className="text-[10px] text-slate-500 font-normal">Select preset or type custom</span>
          </label>
          <div className="flex gap-1.5 flex-wrap mb-2">
            {PRESET_LOCATIONS.map(loc => (
              <button
                key={loc}
                type="button"
                onClick={() => setLocation(loc)}
                className={`px-2.5 py-1 rounded-lg text-[10px] transition border ${
                  location === loc
                    ? 'bg-slate-800 text-white border-slate-800 font-bold'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:text-slate-900'
                }`}
              >
                {loc}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="e.g. Jos East, Kwang Zion, Abuja FCT"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
            required
          />
        </div>

        {/* Contributor Name & Phone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-bold text-slate-800 mb-1">
              Contributor Name (Optional):
            </label>
            <input
              type="text"
              value={farmerName}
              onChange={e => setFarmerName(e.target.value)}
              placeholder="e.g. Dafom Stephen / Anonymous"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1">
              WhatsApp Phone (Optional):
            </label>
            <input
              type="text"
              value={farmerPhone}
              onChange={e => setFarmerPhone(e.target.value)}
              placeholder="+234 ..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div>
          <label className="block font-bold text-slate-800 mb-1">
            Additional Context / Offtaker Notes:
          </label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="e.g. Buyer picked up at farm gate in Jos East"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Submit Action */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
          {!isInlineTab && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-semibold text-slate-500 hover:text-slate-800 transition"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl transition flex items-center gap-2 shadow-xs"
          >
            <Check className="w-4 h-4" />
            <span>Submit Price Report</span>
          </button>
        </div>
      </form>
    </div>
  );

  if (isInlineTab) {
    return formContent;
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 md:p-4 overflow-y-auto">
      {formContent}
    </div>
  );
};
