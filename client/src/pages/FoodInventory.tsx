import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import { api } from '@/lib/api';
import { daysUntilExpiry, expiryLabel, type FoodItem } from '@/lib/store';
import { Plus, Pencil, Trash2, HeartHandshake, CheckCircle, AlertTriangle, Package, X, Loader2 } from 'lucide-react';

const CATEGORIES = ['Canned','Frozen','Dry Goods','Vegetables','Fruits','Dairy','Meat','Bakery','Beverages','Other'];
const STORAGE    = ['Fridge','Freezer','Pantry','Counter','Cupboard','Other'];
const EMPTY = { item_name:'', quantity:'', unit:'', expiry_date:'', category:'', storage_location:'', remarks:'' };

const Field = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
  <div>
    <label className="block text-xs font-semibold uppercase tracking-wide mb-1">{label}</label>
    {children}
    {error && <p className="text-xs text-red-600 mt-0.5">{error}</p>}
  </div>
);

export default function FoodInventory() {
  const { user } = useAuth();
  const [items, setItems]           = useState<FoodItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState<'active'|'used'|'donated'>('active');
  const [formOpen, setFormOpen]     = useState(false);
  const [editItem, setEditItem]     = useState<FoodItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<FoodItem | null>(null);
  const [donateItem, setDonateItem] = useState<FoodItem | null>(null);
  const [form, setForm]             = useState(EMPTY);
  const [formErrors, setFormErrors] = useState<Record<string,string>>({});
  const [donateForm, setDonateForm] = useState({ pickup_location:'', availability:'' });
  const [donateErr, setDonateErr]   = useState('');
  const [toast, setToast]           = useState('');
  const [saving, setSaving]         = useState(false);

  const reload = async () => {
    try {
      const data = await api('/food');
      setItems(data);
    } catch (e) {
      showToast('Error loading inventory.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { reload(); }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const validateForm = () => {
    const e: Record<string,string> = {};
    if (!form.item_name.trim())              e.item_name   = 'Required';
    if (!form.quantity || Number(form.quantity) <= 0) e.quantity = 'Required';
    if (!form.unit.trim())                   e.unit        = 'Required';
    if (!form.expiry_date)                   e.expiry_date = 'Required';
    if (!form.category)                      e.category    = 'Required';
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setSaving(true);
    const payload = {
      item_name: form.item_name.trim(),
      quantity: parseFloat(form.quantity),
      unit: form.unit.trim(),
      expiry_date: form.expiry_date,
      category: form.category,
      storage_location: form.storage_location || null,
      remarks: form.remarks || null,
    };
    try {
      if (editItem) {
        await api(`/food/${editItem.food_id}`, { method: 'PUT', body: JSON.stringify(payload) });
        showToast('Item updated.');
      } else {
        await api('/food', { method: 'POST', body: JSON.stringify(payload) });
        showToast('Item added to inventory.');
      }
      setFormOpen(false); setEditItem(null); setForm(EMPTY); setFormErrors({});
      reload();
    } catch (e: any) {
      showToast(e.message || 'Error saving item.');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (item: FoodItem) => {
    setEditItem(item);
    setForm({ item_name: item.item_name, quantity: String(item.quantity), unit: item.unit, expiry_date: item.expiry_date, category: item.category, storage_location: item.storage_location, remarks: item.remarks });
    setFormErrors({});
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    try {
      await api(`/food/${deleteItem.food_id}`, { method: 'DELETE' });
      setDeleteItem(null);
      reload();
      showToast('Item removed.');
    } catch (e: any) {
      showToast(e.message || 'Error deleting item.');
    }
  };

  const handleMarkUsed = async (item: FoodItem) => {
    try {
      await api(`/food/${item.food_id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'used' }),
      });
      reload();
      showToast(`"${item.item_name}" marked as used.`);
    } catch (e: any) {
      showToast(e.message || 'Error updating item.');
    }
  };

  const handleDonate = async () => {
    if (!donateForm.pickup_location.trim()) { setDonateErr('Pickup location is required.'); return; }
    if (!donateItem) return;
    try {
      await api('/donations', {
        method: 'POST',
        body: JSON.stringify({
          food_id: donateItem.food_id,
          pickup_location: donateForm.pickup_location,
          availability: donateForm.availability,
        }),
      });
      setDonateItem(null); setDonateForm({ pickup_location:'', availability:'' }); setDonateErr('');
      reload();
      showToast(`"${donateItem.item_name}" listed for donation.`);
    } catch (e: any) {
      showToast(e.message || 'Error creating donation.');
    }
  };

  const filtered = items.filter(i => tab === 'active' ? (i.status === 'active' || i.status === 'reserved') : i.status === tab);
  const expiringCount = items.filter(i => i.status === 'active' && daysUntilExpiry(i.expiry_date) <= 3).length;

  const inputCls = (err?: string) =>
    `w-full h-10 px-2.5 border text-sm focus:outline-none focus:border-primary transition-colors ${err ? 'border-destructive' : 'border-input'}`;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Toast - full width on mobile, inline on desktop */}
      {toast && (
        <div className="fixed bottom-0 sm:bottom-5 left-0 sm:left-5 right-0 sm:right-auto z-50 bg-foreground text-background text-sm px-4 py-3 sm:py-2 shadow-lg sm:max-w-xs">
          {toast}
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-5 py-6 sm:py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-5 sm:mb-6 pb-4 sm:pb-5 border-b border-border gap-3">
          <div className="min-w-0">
            <h1 className="font-serif text-2xl sm:text-3xl">Food Inventory</h1>
            <p className="text-sm text-muted-foreground mt-0.5 truncate">
              {items.filter(i=>i.status==='active').length} active items
              {expiringCount > 0 && <span className="text-orange-600"> · {expiringCount} expiring soon</span>}
            </p>
          </div>
          <button onClick={() => { setForm(EMPTY); setEditItem(null); setFormErrors({}); setFormOpen(true); }}
            className="flex items-center gap-1.5 h-10 sm:h-8 px-3 sm:px-3 bg-primary text-primary-foreground text-sm sm:text-xs font-semibold hover:bg-primary/90 active:bg-primary/80 transition-colors shrink-0">
            <Plus size={15}/> Add Item
          </button>
        </div>

        {/* Expiry alert */}
        {expiringCount > 0 && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-300 border-l-4 border-l-amber-500 px-4 py-3 mb-5">
            <AlertTriangle size={14} className="text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800">{expiringCount} item{expiringCount>1?'s':''} expiring within 3 days — donate or use them soon.</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-border mb-5 sm:mb-6">
          {(['active','used','donated'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 sm:px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px capitalize ${tab===t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>
              {t} <span className="text-xs">({items.filter(i=> t==='active' ? (i.status==='active'||i.status==='reserved') : i.status===t).length})</span>
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="border border-border py-16 text-center">
            <Package size={28} className="text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No {tab} items.</p>
            {tab === 'active' && (
              <button onClick={() => setFormOpen(true)} className="mt-3 text-sm text-primary font-semibold">
                + Add your first item
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b border-border">
                  <tr>
                    {['Item','Category','Qty','Expiry','Storage','Status',''].map(h => (
                      <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map(item => {
                    const days = daysUntilExpiry(item.expiry_date);
                    const { label, color } = expiryLabel(days);
                    return (
                      <tr key={item.food_id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-2.5">
                          <p className="font-medium">{item.item_name}</p>
                          {item.remarks && <p className="text-xs text-muted-foreground italic">{item.remarks}</p>}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">{item.category}</td>
                        <td className="px-3 py-2.5 font-mono text-xs">{item.quantity} {item.unit}</td>
                        <td className="px-3 py-2.5"><span className={`text-xs px-1.5 py-0.5 font-mono font-medium ${color}`}>{label}</span></td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">{item.storage_location || '—'}</td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">{item.status==='reserved'?<span className="text-sky-700">In meal plan</span>:item.status}</td>
                        <td className="px-3 py-2.5">
                          {tab === 'active' && (
                            <div className="flex items-center gap-2">
                              <button onClick={() => openEdit(item)} title="Edit" className="p-1 hover:text-primary transition-colors"><Pencil size={13}/></button>
                              <button onClick={() => handleMarkUsed(item)} title="Mark used" className="p-1 hover:text-emerald-600 transition-colors"><CheckCircle size={13}/></button>
                              <button onClick={() => { setDonateItem(item); setDonateForm({pickup_location:'',availability:''}); setDonateErr(''); }} title="Donate" className="p-1 hover:text-sky-600 transition-colors"><HeartHandshake size={13}/></button>
                              <button onClick={() => setDeleteItem(item)} title="Delete" className="p-1 hover:text-red-600 transition-colors"><Trash2 size={13}/></button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden space-y-2">
              {filtered.map(item => {
                const days = daysUntilExpiry(item.expiry_date);
                const { label, color } = expiryLabel(days);
                return (
                  <div key={item.food_id} className="border border-border bg-white">
                    {/* Card header */}
                    <div className="px-4 pt-3.5 pb-2">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="font-semibold text-sm leading-snug">{item.item_name}</p>
                        <span className={`text-xs px-1.5 py-0.5 font-mono font-semibold shrink-0 ${color}`}>{label}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        <span>{item.category}</span>
                        <span>{item.quantity} {item.unit}</span>
                        {item.storage_location && <span>{item.storage_location}</span>}
                        {item.status === 'reserved' && <span className="text-sky-700 font-medium">In meal plan</span>}
                      </div>
                      {item.remarks && <p className="text-xs text-muted-foreground italic mt-1">{item.remarks}</p>}
                    </div>

                    {/* Action row */}
                    {tab === 'active' && (
                      <div className="flex border-t border-border divide-x divide-border">
                        <button onClick={() => openEdit(item)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-muted-foreground hover:text-primary hover:bg-muted/40 active:bg-muted transition-colors">
                          <Pencil size={12}/> Edit
                        </button>
                        <button onClick={() => handleMarkUsed(item)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 active:bg-emerald-100 transition-colors">
                          <CheckCircle size={12}/> Used
                        </button>
                        <button onClick={() => { setDonateItem(item); setDonateForm({pickup_location:'',availability:''}); setDonateErr(''); }}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-sky-700 hover:bg-sky-50 active:bg-sky-100 transition-colors">
                          <HeartHandshake size={12}/> Donate
                        </button>
                        <button onClick={() => setDeleteItem(item)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors">
                          <Trash2 size={12}/> Delete
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Add/Edit Modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-md border-t sm:border border-border shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <h2 className="font-serif text-base">{editItem ? 'Edit Food Item' : 'Add Food Item'}</h2>
              <button onClick={() => { setFormOpen(false); setEditItem(null); }} className="p-1"><X size={18} className="text-muted-foreground"/></button>
            </div>
            <div className="px-5 py-4 space-y-3 overflow-y-auto flex-1">
              <Field label="Item Name *" error={formErrors.item_name}>
                <input value={form.item_name} onChange={e=>setForm(f=>({...f,item_name:e.target.value}))} placeholder="e.g. Canned Tuna" className={inputCls(formErrors.item_name)}/>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Quantity *" error={formErrors.quantity}>
                  <input type="number" min="0" step="0.1" value={form.quantity} onChange={e=>setForm(f=>({...f,quantity:e.target.value}))} placeholder="2" className={inputCls(formErrors.quantity)}/>
                </Field>
                <Field label="Unit *" error={formErrors.unit}>
                  <input value={form.unit} onChange={e=>setForm(f=>({...f,unit:e.target.value}))} placeholder="kg, cans…" className={inputCls(formErrors.unit)}/>
                </Field>
              </div>
              <Field label="Expiry Date *" error={formErrors.expiry_date}>
                <input type="date" value={form.expiry_date} onChange={e=>setForm(f=>({...f,expiry_date:e.target.value}))} className={inputCls(formErrors.expiry_date)}/>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Category *" error={formErrors.category}>
                  <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}
                    className={`w-full h-10 px-2.5 border text-sm focus:outline-none focus:border-primary bg-white ${formErrors.category?'border-destructive':'border-input'}`}>
                    <option value="">Select…</option>
                    {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Storage">
                  <select value={form.storage_location} onChange={e=>setForm(f=>({...f,storage_location:e.target.value}))}
                    className="w-full h-10 px-2.5 border border-input text-sm focus:outline-none focus:border-primary bg-white">
                    <option value="">Optional</option>
                    {STORAGE.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Remarks">
                <textarea value={form.remarks} onChange={e=>setForm(f=>({...f,remarks:e.target.value}))} placeholder="Any notes…"
                  className="w-full h-16 px-2.5 py-2 border border-input text-sm focus:outline-none focus:border-primary resize-none"/>
              </Field>
            </div>
            <div className="px-5 py-4 border-t border-border flex gap-2 shrink-0">
              <button onClick={() => { setFormOpen(false); setEditItem(null); }}
                className="flex-1 h-11 text-sm border border-input hover:bg-muted transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 h-11 text-sm bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60">
                {saving ? 'Saving…' : editItem ? 'Save Changes' : 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteItem && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-sm border-t sm:border border-border shadow-xl p-5">
            <h2 className="font-serif text-base mb-2">Remove item?</h2>
            <p className="text-sm text-muted-foreground mb-5">
              <strong className="text-foreground">"{deleteItem.item_name}"</strong> will be permanently removed.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteItem(null)} className="flex-1 h-11 text-sm border border-input hover:bg-muted transition-colors">Cancel</button>
              <button onClick={handleDelete} className="flex-1 h-11 text-sm bg-destructive text-white font-semibold hover:bg-destructive/90 transition-colors">Remove</button>
            </div>
          </div>
        </div>
      )}

      {/* Donate modal */}
      {donateItem && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-sm border-t sm:border border-border shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-serif text-base">Convert to Donation</h2>
              <button onClick={() => setDonateItem(null)} className="p-1"><X size={18} className="text-muted-foreground"/></button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <p className="text-sm text-muted-foreground">Listing <strong className="text-foreground">"{donateItem.item_name}"</strong> for community pickup.</p>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1">Pickup Location *</label>
                <input value={donateForm.pickup_location}
                  onChange={e=>{setDonateForm(f=>({...f,pickup_location:e.target.value}));setDonateErr('');}}
                  placeholder="e.g. Taman Desa, KL"
                  className={`w-full h-11 px-2.5 border text-sm focus:outline-none focus:border-primary ${donateErr?'border-destructive':'border-input'}`}/>
                {donateErr && <p className="text-xs text-red-600 mt-0.5">{donateErr}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1">Availability</label>
                <input value={donateForm.availability} onChange={e=>setDonateForm(f=>({...f,availability:e.target.value}))}
                  placeholder="e.g. Weekdays 6–8 PM"
                  className="w-full h-11 px-2.5 border border-input text-sm focus:outline-none focus:border-primary"/>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-border flex gap-2">
              <button onClick={() => setDonateItem(null)} className="flex-1 h-11 text-sm border border-input hover:bg-muted transition-colors">Cancel</button>
              <button onClick={handleDonate}
                className="flex-1 h-11 text-sm bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5">
                <HeartHandshake size={13}/> List for Donation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
