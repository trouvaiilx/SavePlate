import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import { api } from '@/lib/api';
import { daysUntilExpiry, expiryLabel, type FoodItem, type Donation } from '@/lib/store';
import { Search, SlidersHorizontal, CheckCircle, HeartHandshake, UtensilsCrossed, MapPin, Clock, User, Package, X, ChevronRight, AlertCircle, EyeOff } from 'lucide-react';

const CATS = ['All', 'Canned', 'Frozen', 'Dry Goods', 'Vegetables', 'Fruits', 'Dairy', 'Meat', 'Bakery', 'Beverages', 'Other'];
const STORAGE = ['All', 'Fridge', 'Freezer', 'Pantry', 'Counter', 'Cupboard'];

export default function BrowseFood() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'inventory' | 'donations'>('inventory');
  const [myItems, setMyItems] = useState<FoodItem[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('All');
  const [storage, setStorage] = useState('All');
  const [expiry, setExpiry] = useState('All');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selected, setSelected] = useState<FoodItem | null>(null);
  const [donateOpen, setDonateOpen] = useState(false);
  const [donateForm, setDonateForm] = useState({ pickup_location: '', availability: '' });
  const [donateErr, setDonateErr] = useState('');
  const [toast, setToast] = useState('');
  const [claimTarget, setClaimTarget] = useState<Donation | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [myHiddenCount, setMyHiddenCount] = useState(0);

  const reload = async () => {
    try {
      const foodData = await api('/food');
      setMyItems(foodData.filter((i: FoodItem) => i.status === 'active' || i.status === 'reserved'));

      const donRes = await api('/donations');
      setDonations((donRes.donations || []).filter((d: Donation) => d.status === 'available'));
      setMyHiddenCount(donRes.myHiddenCount || 0);
    } catch (e) {
      showToast('Error loading data');
    }
  };
  useEffect(() => { reload(); }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const filteredInventory = useMemo(() => myItems.filter(item => {
    if (search && !item.item_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (cat !== 'All' && item.category !== cat) return false;
    if (storage !== 'All' && item.storage_location !== storage) return false;
    if (expiry !== 'All') {
      const d = daysUntilExpiry(item.expiry_date);
      if (expiry === '3' && d > 3) return false;
      if (expiry === '7' && d > 7) return false;
      if (expiry === '30' && d > 30) return false;
    }
    return true;
  }), [myItems, search, cat, storage, expiry]);

  const filteredDonations = useMemo(() => donations.filter(d => {
    if (search && !d.food_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (cat !== 'All' && d.food_category !== cat) return false;
    return true;
  }), [donations, search, cat]);

  const handleMarkUsed = async () => {
    if (!selected) return;
    try {
      await api(`/food/${selected.food_id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'used' }) });
      showToast(`"${selected.item_name}" marked as used.`);
      setSelected(null); reload();
    } catch (e) { showToast('Error updating item'); }
  };

  const handlePlanMeal = async () => {
    if (!selected) return;
    try {
      await api(`/food/${selected.food_id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'reserved' }) });
      showToast(`"${selected.item_name}" reserved for meal plan.`);
      setSelected(null); reload();
    } catch (e) { showToast('Error updating item'); }
  };

  const handleDonate = async () => {
    if (!donateForm.pickup_location.trim()) { setDonateErr('Pickup location is required.'); return; }
    if (!selected) return;
    try {
      await api('/donations', { method: 'POST', body: JSON.stringify({ food_id: selected.food_id, pickup_location: donateForm.pickup_location, availability: donateForm.availability }) });
      showToast(`"${selected.item_name}" listed for donation.`);
      setDonateOpen(false); setSelected(null); setDonateForm({ pickup_location: '', availability: '' }); setDonateErr('');
      reload();
    } catch (e) { showToast('Error donating item'); }
  };

  const hasFilters = cat !== 'All' || storage !== 'All' || expiry !== 'All' || search;
  const clearFilters = () => { setCat('All'); setStorage('All'); setExpiry('All'); setSearch(''); };

  const handleRequestPickup = async () => {
    if (!claimTarget) return;
    setClaiming(true);
    try {
      await api(`/donations/${claimTarget.donation_id}/claim`, { method: 'PATCH' });
      showToast(`Successfully claimed "${claimTarget.food_name}". Check notifications for pickup details.`);
      setClaimTarget(null);
      reload();
    } catch (e: any) {
      showToast(e.message || 'Error claiming donation');
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-0 sm:bottom-5 left-0 sm:left-5 right-0 sm:right-auto z-50 bg-foreground text-background text-sm px-4 py-3 sm:py-2 shadow-lg sm:max-w-xs">
          {toast}
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-5 py-6 sm:py-8">

        {/* Header */}
        <div className="mb-5 sm:mb-6 pb-4 sm:pb-5 border-b border-border">
          <h1 className="font-serif text-2xl sm:text-3xl">Browse Food Items</h1>
          <p className="text-sm text-muted-foreground mt-1">Search your inventory or find community donations.</p>
        </div>

        {/* Search + filter bar */}
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by item name…"
              className="w-full h-10 pl-9 pr-3 border border-input text-sm focus:outline-none focus:border-primary transition-colors" />
          </div>
          <button onClick={() => setFiltersOpen(v => !v)}
            className={`flex items-center gap-1.5 h-10 px-3 border text-sm font-medium transition-colors shrink-0 ${filtersOpen || hasFilters ? 'border-primary text-primary bg-primary/5' : 'border-input text-foreground hover:bg-muted'}`}>
            <SlidersHorizontal size={14} />
            <span className="hidden sm:inline">Filters</span>
            {hasFilters && <span className="w-1.5 h-1.5 bg-primary rounded-full" />}
          </button>
        </div>

        {/* Filters drawer */}
        {filtersOpen && (
          <div className="border border-border bg-muted/30 px-4 py-3 mb-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1">Category</label>
                <select value={cat} onChange={e => setCat(e.target.value)}
                  className="w-full h-9 px-2 border border-input text-sm focus:outline-none focus:border-primary bg-white">
                  {CATS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              {tab === 'inventory' && <>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-1">Storage</label>
                  <select value={storage} onChange={e => setStorage(e.target.value)}
                    className="w-full h-9 px-2 border border-input text-sm focus:outline-none focus:border-primary bg-white">
                    {STORAGE.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-1">Expires within</label>
                  <select value={expiry} onChange={e => setExpiry(e.target.value)}
                    className="w-full h-9 px-2 border border-input text-sm focus:outline-none focus:border-primary bg-white">
                    <option value="All">Any time</option>
                    <option value="3">3 days</option>
                    <option value="7">7 days</option>
                    <option value="30">30 days</option>
                  </select>
                </div>
              </>}
            </div>
            {hasFilters && (
              <button onClick={clearFilters} className="mt-2.5 text-xs text-primary font-semibold hover:underline underline-offset-2">
                Clear all filters
              </button>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-border mb-5 sm:mb-6">
          {[
            { key: 'inventory', label: 'My Inventory', count: filteredInventory.length },
            { key: 'donations', label: 'Community Donations', count: filteredDonations.length },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
              className={`px-3 sm:px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${tab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>
              {t.label} <span className="text-xs">({t.count})</span>
            </button>
          ))}
        </div>

        {/* Inventory */}
        {tab === 'inventory' && (
          filteredInventory.length === 0 ? (
            <div className="border border-border py-16 text-center">
              <Package size={28} className="text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No items match your filters.</p>
            </div>
          ) : (
            <div className="border border-border overflow-hidden">
              {/* Desktop table */}
              <table className="hidden sm:table w-full text-sm">
                <thead className="bg-muted/40 border-b border-border">
                  <tr>{['Item', 'Category', 'Qty', 'Expiry', 'Storage', ''].map(h => (
                    <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredInventory.map(item => {
                    const { label, color } = expiryLabel(daysUntilExpiry(item.expiry_date));
                    return (
                      <tr key={item.food_id} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setSelected(item)}>
                        <td className="px-3 py-2.5 font-medium">
                          {item.item_name}
                          {item.status === 'reserved' && <span className="ml-2 text-xs text-sky-700 font-normal">· in meal plan</span>}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">{item.category}</td>
                        <td className="px-3 py-2.5 font-mono text-xs">{item.quantity} {item.unit}</td>
                        <td className="px-3 py-2.5"><span className={`text-xs px-1.5 py-0.5 font-mono font-medium ${color}`}>{label}</span></td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">{item.storage_location || '—'}</td>
                        <td className="px-3 py-2.5 text-xs text-primary font-medium">View →</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {/* Mobile list - tappable rows */}
              <div className="sm:hidden divide-y divide-border">
                {filteredInventory.map(item => {
                  const { label, color } = expiryLabel(daysUntilExpiry(item.expiry_date));
                  return (
                    <button key={item.food_id} onClick={() => setSelected(item)}
                      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 active:bg-muted transition-colors text-left">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{item.item_name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.category} · {item.quantity} {item.unit}</p>
                      </div>
                      <span className={`text-xs px-1.5 py-0.5 font-mono font-semibold shrink-0 ${color}`}>{label}</span>
                      <ChevronRight size={14} className="text-muted-foreground shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          )
        )}

        {/* Donations */}
        {tab === 'donations' && (
          <>
            {/* Hidden donations notice */}
            {myHiddenCount > 0 && (
              <div className="flex items-start gap-3 p-3 sm:p-4 mb-4 border border-amber-200 bg-amber-50">
                <EyeOff size={16} className="text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">
                    You have {myHiddenCount} active donation{myHiddenCount > 1 ? 's' : ''} not shown here
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Your food visibility is set to <strong>private</strong>. Your donation listings are hidden from the community. Change this in{' '}
                    <Link to="/account" className="underline underline-offset-2 font-semibold hover:text-amber-900">Account Settings → Privacy</Link>.
                  </p>
                </div>
              </div>
            )}
            {filteredDonations.length === 0 ? (
              <div className="border border-border py-16 text-center">
                <HeartHandshake size={28} className="text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No donations available matching your filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {filteredDonations.map(d => {
                  const { label, color } = expiryLabel(daysUntilExpiry(d.expiry_date));
                  const isOwn = d.donor_id === user?.id;
                  return (
                    <div key={d.donation_id} className={`border p-4 transition-colors ${isOwn ? 'border-border bg-muted/20' : 'border-border hover:border-primary/40'}`}>
                      <div className="flex justify-between items-start gap-2 mb-3">
                        <p className="font-semibold text-sm">{d.food_name}</p>
                        <span className={`text-xs px-1.5 py-0.5 font-mono font-medium shrink-0 ${color}`}>{label}</span>
                      </div>
                      <div className="space-y-1.5 mb-4">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><User size={11} />{d.donor_name}{isOwn && <span className="ml-1 text-xs font-semibold text-primary">(You)</span>}</div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Package size={11} />{d.quantity} {d.unit} · {d.food_category}</div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin size={11} />{d.pickup_location}</div>
                        {d.availability && <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Clock size={11} />{d.availability}</div>}
                      </div>
                      {isOwn ? (
                        <div className="w-full mt-3 h-10 border border-input text-muted-foreground text-sm font-medium flex items-center justify-center gap-1.5 cursor-not-allowed opacity-60">
                          <HeartHandshake size={13} /> Your Listing
                        </div>
                      ) : (
                        <button onClick={() => setClaimTarget(d)}
                          className="w-full mt-3 h-10 border border-primary text-primary text-sm font-semibold hover:bg-primary hover:text-primary-foreground active:bg-primary/90 transition-colors flex items-center justify-center gap-1.5">
                          <HeartHandshake size={13} /> Request Pickup
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Item detail */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-sm border-t sm:border border-border shadow-xl">
            {/* Drag handle on mobile */}
            <div className="sm:hidden flex justify-center pt-2 pb-1">
              <div className="w-10 h-1 bg-border rounded-full" />
            </div>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-serif text-base">{selected.item_name}</h2>
              <button onClick={() => setSelected(null)} className="p-1"><X size={18} className="text-muted-foreground" /></button>
            </div>
            <div className="px-5 py-4 space-y-0 text-sm">
              {[
                ['Category', selected.category],
                ['Quantity', `${selected.quantity} ${selected.unit}`],
                ['Storage', selected.storage_location || '—'],
                ['Expiry', new Date(selected.expiry_date).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between items-center py-2.5 border-b border-border/50 last:border-0">
                  <span className="text-muted-foreground text-xs uppercase tracking-wide font-semibold">{k}</span>
                  <span className="font-medium">{v}</span>
                </div>
              ))}
              {(() => {
                const { label, color } = expiryLabel(daysUntilExpiry(selected.expiry_date));
                return (
                  <div className="flex justify-between items-center py-2.5">
                    <span className="text-muted-foreground text-xs uppercase tracking-wide font-semibold">Expires</span>
                    <span className={`text-xs px-2 py-0.5 font-mono font-semibold ${color}`}>{label}</span>
                  </div>
                );
              })()}
              {selected.remarks && <p className="text-xs text-muted-foreground italic pt-2">{selected.remarks}</p>}
            </div>
            <div className="px-5 pb-5 pt-2 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button onClick={handleMarkUsed}
                  className="h-11 border border-emerald-300 text-emerald-700 text-sm font-semibold hover:bg-emerald-50 active:bg-emerald-100 transition-colors flex items-center justify-center gap-1.5">
                  <CheckCircle size={14} /> Mark Used
                </button>
                <button onClick={handlePlanMeal}
                  className="h-11 border border-sky-300 text-sky-700 text-sm font-semibold hover:bg-sky-50 active:bg-sky-100 transition-colors flex items-center justify-center gap-1.5">
                  <UtensilsCrossed size={14} /> Plan Meal
                </button>
              </div>
              <button onClick={() => { setDonateOpen(true); setDonateForm({ pickup_location: '', availability: '' }); setDonateErr(''); }}
                className="w-full h-11 border border-primary text-primary text-sm font-semibold hover:bg-primary hover:text-primary-foreground active:bg-primary/90 transition-colors flex items-center justify-center gap-1.5">
                <HeartHandshake size={14} /> Flag for Donation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Donate modal */}
      {donateOpen && selected && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-sm border-t sm:border border-border shadow-xl">
            <div className="sm:hidden flex justify-center pt-2 pb-1">
              <div className="w-10 h-1 bg-border rounded-full" />
            </div>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-serif text-base">Flag for Donation</h2>
              <button onClick={() => setDonateOpen(false)} className="p-1"><X size={18} className="text-muted-foreground" /></button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <p className="text-sm text-muted-foreground">Listing <strong className="text-foreground">"{selected.item_name}"</strong> for community pickup.</p>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1">Pickup Location *</label>
                <input value={donateForm.pickup_location}
                  onChange={e => { setDonateForm(f => ({ ...f, pickup_location: e.target.value })); setDonateErr(''); }}
                  placeholder="e.g. Taman Desa, KL"
                  className={`w-full h-11 px-2.5 border text-sm focus:outline-none focus:border-primary ${donateErr ? 'border-destructive' : 'border-input'}`} />
                {donateErr && <p className="text-xs text-red-600 mt-0.5">{donateErr}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1">Availability</label>
                <input value={donateForm.availability}
                  onChange={e => setDonateForm(f => ({ ...f, availability: e.target.value }))}
                  placeholder="e.g. Weekdays 6–8 PM"
                  className="w-full h-11 px-2.5 border border-input text-sm focus:outline-none focus:border-primary" />
              </div>
            </div>
            <div className="px-5 py-4 border-t border-border flex gap-2">
              <button onClick={() => setDonateOpen(false)} className="flex-1 h-11 text-sm border border-input hover:bg-muted transition-colors">Cancel</button>
              <button onClick={handleDonate}
                className="flex-1 h-11 text-sm bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5">
                <HeartHandshake size={13} /> Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Claim confirmation modal */}
      {claimTarget && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-sm border-t sm:border border-border shadow-xl">
            <div className="sm:hidden flex justify-center pt-2 pb-1">
              <div className="w-10 h-1 bg-border rounded-full" />
            </div>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-serif text-base">Confirm Pickup Request</h2>
              <button onClick={() => setClaimTarget(null)} className="p-1"><X size={18} className="text-muted-foreground" /></button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="flex items-start gap-3 p-3 bg-sky-50 border border-sky-200">
                <AlertCircle size={16} className="text-sky-700 shrink-0 mt-0.5" />
                <p className="text-sm text-sky-800">You are requesting to pick up this donation. The donor will be notified.</p>
              </div>
              <div className="space-y-0 text-sm">
                {[
                  ['Item', claimTarget.food_name],
                  ['Donor', claimTarget.donor_name],
                  ['Category', claimTarget.food_category],
                  ['Quantity', `${claimTarget.quantity} ${claimTarget.unit}`],
                  ['Pickup', claimTarget.pickup_location],
                  ...(claimTarget.availability ? [['Availability', claimTarget.availability]] : []),
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between items-center py-2.5 border-b border-border/50 last:border-0">
                    <span className="text-muted-foreground text-xs uppercase tracking-wide font-semibold">{k}</span>
                    <span className="font-medium text-right max-w-[60%]">{v}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="px-5 py-4 border-t border-border flex gap-2">
              <button onClick={() => setClaimTarget(null)} className="flex-1 h-11 text-sm border border-input hover:bg-muted transition-colors">Cancel</button>
              <button onClick={handleRequestPickup} disabled={claiming}
                className="flex-1 h-11 text-sm bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50">
                <HeartHandshake size={13} /> {claiming ? 'Claiming…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}