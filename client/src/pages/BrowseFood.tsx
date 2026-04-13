import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import { getFoodItems, getDonations, updateFoodItem, addDonation, daysUntilExpiry, expiryLabel, type FoodItem, type Donation } from '@/lib/store';
import { Search, SlidersHorizontal, CheckCircle, HeartHandshake, UtensilsCrossed, MapPin, Clock, User, Package, X } from 'lucide-react';

const CATS    = ['All','Canned','Frozen','Dry Goods','Vegetables','Fruits','Dairy','Meat','Bakery','Beverages','Other'];
const STORAGE = ['All','Fridge','Freezer','Pantry','Counter','Cupboard'];

export default function BrowseFood() {
  const { user } = useAuth();
  const [tab, setTab]             = useState<'inventory'|'donations'>('inventory');
  const [myItems, setMyItems]     = useState<FoodItem[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [search, setSearch]       = useState('');
  const [cat, setCat]             = useState('All');
  const [storage, setStorage]     = useState('All');
  const [expiry, setExpiry]       = useState('All');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selected, setSelected]   = useState<FoodItem | null>(null);
  const [donateOpen, setDonateOpen]   = useState(false);
  const [donateForm, setDonateForm]   = useState({ pickup_location: '', availability: '' });
  const [donateErr, setDonateErr]     = useState('');
  const [toast, setToast]             = useState('');

  const reload = () => {
    setMyItems(getFoodItems(user!.id).filter(i => i.status === 'active' || i.status === 'reserved'));
    setDonations(getDonations().filter(d => d.status === 'available'));
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

  const handleMarkUsed = () => {
    if (!selected) return;
    updateFoodItem(selected.food_id, { status: 'used' });
    showToast(`"${selected.item_name}" marked as used.`);
    setSelected(null); reload();
  };

  const handlePlanMeal = () => {
    if (!selected) return;
    updateFoodItem(selected.food_id, { status: 'reserved' });
    showToast(`"${selected.item_name}" reserved for meal plan.`);
    setSelected(null); reload();
  };

  const handleDonate = () => {
    if (!donateForm.pickup_location.trim()) { setDonateErr('Pickup location is required.'); return; }
    if (!selected) return;
    updateFoodItem(selected.food_id, { status: 'donated' });
    addDonation({ food_id: selected.food_id, donor_id: user!.id, donor_name: user!.full_name, food_name: selected.item_name, food_category: selected.category, expiry_date: selected.expiry_date, pickup_location: donateForm.pickup_location, availability: donateForm.availability, status: 'available' });
    showToast(`"${selected.item_name}" listed for donation.`);
    setDonateOpen(false); setSelected(null); setDonateForm({ pickup_location: '', availability: '' }); setDonateErr('');
    reload();
  };

  const hasFilters = cat !== 'All' || storage !== 'All' || expiry !== 'All' || search;
  const clearFilters = () => { setCat('All'); setStorage('All'); setExpiry('All'); setSearch(''); };

  const SelectField = ({ label, value, onChange, options }: { label: string; value: string; onChange: (v:string)=>void; options: string[] }) => (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wide mb-1">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full h-7 px-2 border border-input text-xs focus:outline-none focus:border-primary bg-white">
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {toast && (
        <div className="fixed bottom-5 left-5 bg-foreground text-background text-sm px-4 py-2 z-50 shadow-lg">{toast}</div>
      )}

      <div className="max-w-6xl mx-auto px-5 py-8">
        {/* Header */}
        <div className="mb-6 pb-5 border-b border-border">
          <h1 className="font-serif text-3xl">Browse Food Items</h1>
          <p className="text-sm text-muted-foreground mt-1">Search your inventory or find community donation listings.</p>
        </div>

        {/* Search + filter bar */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by item name…"
              className="w-full h-8 pl-8 pr-3 border border-input text-sm focus:outline-none focus:border-primary transition-colors" />
          </div>
          <button onClick={() => setFiltersOpen(v => !v)}
            className={`flex items-center gap-1.5 h-8 px-3 border text-xs font-medium transition-colors ${filtersOpen || hasFilters ? 'border-primary text-primary bg-primary/5' : 'border-input text-foreground hover:bg-muted'}`}>
            <SlidersHorizontal size={12} /> Filters {hasFilters && <span className="w-1.5 h-1.5 bg-primary rounded-full"/>}
          </button>
        </div>

        {/* Filters drawer */}
        {filtersOpen && (
          <div className="border border-border bg-muted/30 px-4 py-3 mb-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <SelectField label="Category" value={cat} onChange={setCat} options={CATS} />
              {tab === 'inventory' && <>
                <SelectField label="Storage" value={storage} onChange={setStorage} options={STORAGE} />
                <SelectField label="Expires within" value={expiry} onChange={setExpiry}
                  options={[{v:'All',l:'Any time'},{v:'3',l:'3 days'},{v:'7',l:'7 days'},{v:'30',l:'30 days'}].map(o=>o.v)} />
              </>}
            </div>
            {hasFilters && (
              <button onClick={clearFilters} className="mt-2 text-xs text-primary hover:underline underline-offset-2 font-medium">
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-border mb-6 gap-0">
          {[
            { key: 'inventory', label: 'My Inventory', count: filteredInventory.length },
            { key: 'donations', label: 'Community Donations', count: filteredDonations.length },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${tab===t.key?'border-primary text-primary':'border-transparent text-muted-foreground hover:text-foreground'}`}>
              {t.label} ({t.count})
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
              <table className="hidden sm:table w-full text-sm">
                <thead className="bg-muted/40 border-b border-border">
                  <tr>{['Item','Category','Qty','Expiry','Storage',''].map(h=>(
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
              {/* Mobile */}
              <div className="sm:hidden divide-y divide-border">
                {filteredInventory.map(item => {
                  const { label, color } = expiryLabel(daysUntilExpiry(item.expiry_date));
                  return (
                    <div key={item.food_id} className="px-4 py-3 cursor-pointer hover:bg-muted/30" onClick={() => setSelected(item)}>
                      <div className="flex justify-between items-start gap-2">
                        <p className="font-medium text-sm">{item.item_name}</p>
                        <span className={`text-xs px-1.5 py-0.5 font-mono font-medium shrink-0 ${color}`}>{label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.category} · {item.quantity} {item.unit}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        )}

        {/* Donations */}
        {tab === 'donations' && (
          filteredDonations.length === 0 ? (
            <div className="border border-border py-16 text-center">
              <HeartHandshake size={28} className="text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No donations available matching your filters.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDonations.map(d => {
                const { label, color } = expiryLabel(daysUntilExpiry(d.expiry_date));
                return (
                  <div key={d.donation_id} className="border border-border p-4 hover:border-primary/40 transition-colors">
                    <div className="flex justify-between items-start gap-2 mb-3">
                      <p className="font-semibold text-sm">{d.food_name}</p>
                      <span className={`text-xs px-1.5 py-0.5 font-mono font-medium shrink-0 ${color}`}>{label}</span>
                    </div>
                    <div className="space-y-1.5 mb-4">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><User size={11}/>{d.donor_name}</div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin size={11}/>{d.pickup_location}</div>
                      {d.availability && <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Clock size={11}/>{d.availability}</div>}
                    </div>
                    <span className="inline-block text-xs border border-input px-2 py-0.5 text-muted-foreground">{d.food_category}</span>
                    <button className="w-full mt-3 h-7 border border-primary text-primary text-xs font-semibold hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center gap-1.5">
                      <HeartHandshake size={11}/> Request Pickup
                    </button>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* Item detail panel */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-sm border border-border shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-serif text-base">{selected.item_name}</h2>
              <button onClick={() => setSelected(null)}><X size={16} className="text-muted-foreground"/></button>
            </div>
            <div className="px-5 py-4 space-y-2 text-sm">
              {[
                ['Category', selected.category],
                ['Quantity', `${selected.quantity} ${selected.unit}`],
                ['Storage', selected.storage_location || '—'],
                ['Expiry', selected.expiry_date],
              ].map(([k,v]) => (
                <div key={k} className="flex justify-between items-center py-1 border-b border-border/50 last:border-0">
                  <span className="text-muted-foreground text-xs uppercase tracking-wide font-semibold">{k}</span>
                  <span className="font-medium">{v}</span>
                </div>
              ))}
              {(() => { const { label, color } = expiryLabel(daysUntilExpiry(selected.expiry_date));
                return <div className="flex justify-between items-center py-1">
                  <span className="text-muted-foreground text-xs uppercase tracking-wide font-semibold">Status</span>
                  <span className={`text-xs px-2 py-0.5 font-mono font-semibold ${color}`}>{label}</span>
                </div>;
              })()}
              {selected.remarks && <p className="text-xs text-muted-foreground italic pt-1">{selected.remarks}</p>}
            </div>
            <div className="px-5 py-3 border-t border-border space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button onClick={handleMarkUsed}
                  className="h-8 border border-emerald-300 text-emerald-700 text-xs font-semibold hover:bg-emerald-50 transition-colors flex items-center justify-center gap-1.5">
                  <CheckCircle size={12}/> Mark Used
                </button>
                <button onClick={handlePlanMeal}
                  className="h-8 border border-sky-300 text-sky-700 text-xs font-semibold hover:bg-sky-50 transition-colors flex items-center justify-center gap-1.5">
                  <UtensilsCrossed size={12}/> Plan Meal
                </button>
              </div>
              <button onClick={() => { setDonateOpen(true); setDonateForm({pickup_location:'',availability:''}); setDonateErr(''); }}
                className="w-full h-8 border border-primary text-primary text-xs font-semibold hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center gap-1.5">
                <HeartHandshake size={12}/> Flag for Donation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Donate modal */}
      {donateOpen && selected && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm border border-border shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-serif text-base">Flag for Donation</h2>
              <button onClick={() => setDonateOpen(false)}><X size={16} className="text-muted-foreground"/></button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <p className="text-sm text-muted-foreground">Listing <strong className="text-foreground">"{selected.item_name}"</strong> for community pickup.</p>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1">Pickup Location *</label>
                <input value={donateForm.pickup_location}
                  onChange={e => { setDonateForm(f=>({...f,pickup_location:e.target.value})); setDonateErr(''); }}
                  placeholder="e.g. Taman Desa, KL"
                  className={`w-full h-8 px-2.5 border text-sm focus:outline-none focus:border-primary ${donateErr?'border-destructive':'border-input'}`}/>
                {donateErr && <p className="text-xs text-red-600 mt-0.5">{donateErr}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1">Availability</label>
                <input value={donateForm.availability}
                  onChange={e => setDonateForm(f=>({...f,availability:e.target.value}))}
                  placeholder="e.g. Weekdays 6–8 PM"
                  className="w-full h-8 px-2.5 border border-input text-sm focus:outline-none focus:border-primary"/>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-border flex justify-end gap-2">
              <button onClick={() => setDonateOpen(false)} className="h-8 px-3 text-xs border border-input hover:bg-muted transition-colors">Cancel</button>
              <button onClick={handleDonate} className="h-8 px-4 text-xs bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors flex items-center gap-1.5">
                <HeartHandshake size={12}/> Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
