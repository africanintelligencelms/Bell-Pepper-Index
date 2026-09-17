import React, { useState } from 'react';
import { OfftakerContact } from '../types';
import { VERIFIED_OFFTAKERS } from '../data/marketCommunityData';
import { 
  Users, 
  Phone, 
  MessageCircle, 
  MapPin, 
  CheckCircle, 
  Plus, 
  Building2, 
  Search, 
  Share2, 
  ExternalLink,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

interface OfftakerDirectoryProps {
  onSelectBandTab?: () => void;
}

export const OfftakerDirectory: React.FC<OfftakerDirectoryProps> = () => {
  const [offtakers, setOfftakers] = useState<OfftakerContact[]>(VERIFIED_OFFTAKERS);
  const [selectedCrop, setSelectedCrop] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states for adding offtaker
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newLocation, setNewLocation] = useState('Jos / Abuja');
  const [newCrops, setNewCrops] = useState('Cucumbers, Bell Peppers');
  const [newNotes, setNewNotes] = useState('');

  const filteredOfftakers = offtakers.filter(off => {
    const matchesSearch = 
      off.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      off.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      off.crops.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (selectedCrop === 'all') return matchesSearch;
    return matchesSearch && off.crops.some(c => c.toLowerCase().includes(selectedCrop.toLowerCase()));
  });

  const handleAddOfftaker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPhone) return;

    const newEntry: OfftakerContact = {
      id: `off-${Date.now()}`,
      name: newName,
      phone: newPhone,
      location: newLocation,
      crops: newCrops.split(',').map(c => c.trim()),
      buyerType: 'aggregator',
      verifiedByCommunity: true,
      notes: newNotes || 'Added by community member'
    };

    setOfftakers([newEntry, ...offtakers]);
    setShowAddModal(false);
    setNewName('');
    setNewPhone('');
    setNewNotes('');
  };

  const getCleanPhone = (phone: string) => {
    return phone.replace(/[^0-9]/g, '');
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-6">
      {/* Header */}
      <div className="border-b border-slate-100 pb-4 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base md:text-lg text-slate-900 flex items-center gap-2">
                <span>Verified Offtaker Directory</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                  Community Network
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Direct contacts shared by group members for Cucumbers, Coloured Peppers, and Green Peppers
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="self-start sm:self-center text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Share an Offtaker</span>
          </button>
        </div>

        {/* Origin story prompt from chat */}
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-950 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Group Chat Linkup:</strong> When a member asked <em>"Pls can anyone link me up with any cucumber offtaker(s)"</em>, Yakubu's contact was shared immediately (+234 803 632 9227). This directory pools all community offtakers so no farmer is stranded with perishable harvests!
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search offtaker, crop, or city..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Crop Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <span className="text-slate-500 text-[11px] font-semibold shrink-0">Crop:</span>
          {['all', 'cucumber', 'coloured', 'green', 'tomato'].map(crop => (
            <button
              key={crop}
              onClick={() => setSelectedCrop(crop)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                selectedCrop === crop
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {crop === 'all' ? 'All Produce' : crop === 'cucumber' ? '🥒 Cucumbers' : crop === 'coloured' ? '🫑 Coloured' : crop === 'green' ? '🫑 Green' : '🍅 Tomatoes'}
            </button>
          ))}
        </div>
      </div>

      {/* Offtakers Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredOfftakers.map(off => {
          const cleanPhone = getCleanPhone(off.phone);
          const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
            `Hello ${off.name}, I am a member of the Nigerian Greenhouse Farmers Network. I have fresh harvest available and would like to confirm your current buying rates.`
          )}`;

          return (
            <div
              key={off.id}
              className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 space-y-3 hover:border-emerald-300 transition"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-slate-900 text-sm">{off.name}</span>
                    {off.verifiedByCommunity && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full font-bold">
                        <CheckCircle className="w-2.5 h-2.5" />
                        <span>Verified</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-slate-500 text-xs mt-0.5">
                    <MapPin className="w-3 h-3 text-emerald-600" />
                    <span>{off.location}</span>
                  </div>
                </div>

                <span className="text-[10px] font-mono bg-white border border-slate-200 px-2 py-0.5 rounded-md text-slate-600">
                  {off.buyerType.replace('_', ' ')}
                </span>
              </div>

              {/* Crops Handled */}
              <div className="flex flex-wrap gap-1">
                {off.crops.map((c, i) => (
                  <span
                    key={i}
                    className="text-[10px] bg-white border border-slate-200 text-slate-700 font-semibold px-2 py-0.5 rounded-full"
                  >
                    {c}
                  </span>
                ))}
              </div>

              {/* Notes */}
              {off.notes && (
                <p className="text-[11px] text-slate-600 leading-normal italic bg-white/60 p-2 rounded-lg border border-slate-100">
                  "{off.notes}"
                </p>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-1.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>

                <a
                  href={`tel:${cleanPhone}`}
                  className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 text-xs font-bold py-1.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5 text-slate-600" />
                  <span>Call {off.phone.replace('+234', '')}</span>
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Offtaker Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 border border-slate-200 shadow-xl animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="font-extrabold text-slate-900 text-sm">
                Share a Verified Offtaker Contact
              </h4>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddOfftaker} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Offtaker / Aggregator Name:
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Mallam Sani Produce"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Phone Number:
                </label>
                <input
                  type="text"
                  required
                  value={newPhone}
                  onChange={e => setNewPhone(e.target.value)}
                  placeholder="e.g. +234 803 123 4567"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Location / Market Base:
                </label>
                <input
                  type="text"
                  required
                  value={newLocation}
                  onChange={e => setNewLocation(e.target.value)}
                  placeholder="e.g. Lagos (Mile 12), Abuja, or Jos"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Crops Purchased (comma-separated):
                </label>
                <input
                  type="text"
                  required
                  value={newCrops}
                  onChange={e => setNewCrops(e.target.value)}
                  placeholder="e.g. Cucumbers, Coloured Bell Peppers"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Community Notes:
                </label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  placeholder="e.g. Pays within 24 hours of delivery, requires Grade A sorted crates"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 font-bold hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-xs"
                >
                  Add to Directory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
