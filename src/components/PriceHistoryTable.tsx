import React, { useState } from 'react';
import { PriceRecord, PepperType, ProductionMethod, TransactionType } from '../types';
import { 
  Search, 
  Filter, 
  Trash2, 
  MapPin, 
  User, 
  MessageSquare, 
  ShieldCheck
} from 'lucide-react';

interface PriceHistoryTableProps {
  records: PriceRecord[];
  onDeleteRecord: (id: string) => void;
}

export const PriceHistoryTable: React.FC<PriceHistoryTableProps> = ({
  records,
  onDeleteRecord
}) => {
  const [selectedType, setSelectedType] = useState<'all' | PepperType>('all');
  const [selectedMethod, setSelectedMethod] = useState<'all' | ProductionMethod>('all');
  const [selectedTxType, setSelectedTxType] = useState<'all' | TransactionType>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Filter logic
  const filteredRecords = records.filter(r => {
    if (selectedType !== 'all' && r.type !== selectedType) return false;
    if (selectedMethod !== 'all' && r.productionMethod !== selectedMethod) return false;
    if (selectedTxType !== 'all' && r.transactionType !== selectedTxType) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchLoc = r.location.toLowerCase().includes(term);
      const matchName = r.farmerName.toLowerCase().includes(term);
      const matchNotes = (r.notes || '').toLowerCase().includes(term);
      const matchPhone = (r.farmerPhone || '').includes(term);
      if (!matchLoc && !matchName && !matchNotes && !matchPhone) return false;
    }
    return true;
  });

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden space-y-4 p-4 md:p-5">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
        <div>
          <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
            <span>Community Price Log Feed</span>
            <span className="text-xs bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-mono font-bold">
              {filteredRecords.length} Entries
            </span>
          </h3>
          <p className="text-xs text-slate-500">
            Search and filter individual pepper price reports submitted by group members
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search location, farmer, phone..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Filter Quick Controls */}
      <div className="flex items-center gap-2 flex-wrap text-xs">
        <span className="text-slate-500 font-semibold flex items-center gap-1">
          <Filter className="w-3.5 h-3.5 text-slate-400" /> Filter:
        </span>

        {/* Variety */}
        <select
          value={selectedType}
          onChange={e => setSelectedType(e.target.value as any)}
          className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
        >
          <option value="all">All Varieties</option>
          <option value="coloured">Coloured Peppers</option>
          <option value="green">Green Peppers</option>
        </select>

        {/* Production Method */}
        <select
          value={selectedMethod}
          onChange={e => setSelectedMethod(e.target.value as any)}
          className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
        >
          <option value="all">All Systems</option>
          <option value="greenhouse">Greenhouse Only</option>
          <option value="open_field">Open Field Only</option>
        </select>

        {/* Transaction Type */}
        <select
          value={selectedTxType}
          onChange={e => setSelectedTxType(e.target.value as any)}
          className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
        >
          <option value="all">All Record Types</option>
          <option value="actual_sale">Completed Sales</option>
          <option value="buyer_offer">Buyer Offers</option>
          <option value="farmer_asking">Farmer Asking</option>
        </select>

        {(selectedType !== 'all' || selectedMethod !== 'all' || selectedTxType !== 'all' || searchTerm) && (
          <button
            onClick={() => {
              setSelectedType('all');
              setSelectedMethod('all');
              setSelectedTxType('all');
              setSearchTerm('');
            }}
            className="text-xs text-purple-700 hover:underline font-bold ml-auto"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-3">Date</th>
              <th className="py-2.5 px-3">Variety</th>
              <th className="py-2.5 px-3">Price / kg</th>
              <th className="py-2.5 px-3">Qty</th>
              <th className="py-2.5 px-3">Location / Hub</th>
              <th className="py-2.5 px-3">Contributor / Source</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                  No price reports match your filter criteria.
                </td>
              </tr>
            ) : (
              filteredRecords.map(record => (
                <tr key={record.id} className="hover:bg-slate-50/80 transition">
                  {/* Date */}
                  <td className="py-3 px-3 font-mono text-slate-500 whitespace-nowrap">
                    {record.date}
                  </td>

                  {/* Variety & Badges */}
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                        record.type === 'coloured'
                          ? 'bg-amber-100 text-amber-900 border border-amber-200'
                          : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                      }`}>
                        {record.type === 'coloured' ? '🫑 Coloured' : '🫑 Green'}
                      </span>
                      <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] capitalize">
                        {record.productionMethod === 'greenhouse' ? 'Greenhouse' : 'Open Field'}
                      </span>
                    </div>
                  </td>

                  {/* Price */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span className="font-extrabold text-slate-900 text-sm">
                      ₦{record.pricePerKg.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-500 block capitalize">
                      {record.transactionType.replace('_', ' ')}
                    </span>
                  </td>

                  {/* Quantity */}
                  <td className="py-3 px-3 font-semibold text-slate-800 whitespace-nowrap">
                    {record.quantityKg} kg
                  </td>

                  {/* Location */}
                  <td className="py-3 px-3">
                    <span className="flex items-center gap-1 text-slate-800 font-medium">
                      <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                      {record.location}
                    </span>
                  </td>

                  {/* Contributor / Source */}
                  <td className="py-3 px-3">
                    <div className="space-y-0.5">
                      <div className="font-semibold text-slate-800 flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400 shrink-0" />
                        {record.farmerName}
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1">
                        {record.source === 'whatsapp_extracted' ? (
                          <span className="text-purple-800 bg-purple-50 border border-purple-200 px-1.5 py-0.2 rounded flex items-center gap-1 font-medium">
                            <MessageSquare className="w-2.5 h-2.5 text-purple-600" /> WhatsApp Chat
                          </span>
                        ) : (
                          <span className="text-slate-500">Direct Entry</span>
                        )}
                        {record.farmerPhone && <span>• {record.farmerPhone}</span>}
                      </div>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => onDeleteRecord(record.id)}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition"
                      title="Remove Record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
