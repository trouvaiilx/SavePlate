import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import { getFoodItems, addFoodItem, updateFoodItem, deleteFoodItem, addDonation, daysUntilExpiry, expiryLabel, type FoodItem } from '@/lib/store';
import { Plus, Pencil, Trash2, HeartHandshake, CheckCircle, AlertTriangle, Package, X } from 'lucide-react';

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
  const [items, setItems]         = useState<FoodItem[]>([]);
  const [tab, setTab]             = useState<'active'|'used'|'donated'>('active');
  const [formOpen, setFormOpen]   = useState(false);
  const [editItem, setEditItem]   = useState<FoodItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<FoodItem | null>(null);
  const [donateItem, setDonateItem] = useState<FoodItem | null>(null);
  const [form, setForm]           = useState(EMPTY);
  const [formErrors, setFormErrors] = useState<Record<string,string>>({});
  const [donateForm, setDonateForm] = useState({ pickup_location:'', availability:'' });
  const [donateErr, setDonateErr] = useState('');
  const [toast, setToast]         = useState('');

  const reload = () => setItems(getFoodItems(user!.id));
  useEffect(() => { reload(); }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const validateForm = () => {
    const e: Record<string,string> = {};
    if (!form.item_name.trim()) e.item_name = 'Required';
    if (!form.quantity || Number(form.quantity) <= 0) e.quantity = 'Required';
    if (!form.unit.trim()) e.unit = 'Required';
    if (!form.expiry_date) e.expiry_date = 'Required';
    if (!form.category) e.category = 'Required';
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;
    const payload = { user_id: user!.id, item_name: form.item_name.trim(), quantity: parseFloat(form.quantity), unit: form.unit.trim(), expiry_date: form.expiry_date, category: form.category, storage_location: form.storage_location, remarks: form.remarks, status: 'active' as const, reserved_qty: 0 };
    if (editItem) { updateFoodItem(editItem.food_id, payload); showToast('Item updated.'); }
    else          { addFoodItem(payload); showToast('Item added to inventory.'); }
    setFormOpen(false); setEditItem(null); setForm(EMPTY); setFormErrors({});
    reload();
  };

  const openEdit = (item: FoodItem) => {
    setEditItem(item);
    setForm({ item_name: item.item_name, quantity: String(item.quantity), unit: item.unit, expiry_date: item.expiry_date, category: item.category, storage_location: item.storage_location, remarks: item.remarks });
    setFormErrors({});
    setFormOpen(true);
  };

  const handleDelete = () => {
    if (!deleteItem) return;
    deleteFoodItem(deleteItem.food_id);
    setDeleteItem(null); reload(); showToast('Item removed.');
  };

  const handleMarkUsed = (item: FoodItem) => {
    updateFoodItem(item.food_id, { status: 'used' }); reload(); showToast(`"${item.item_name}" marked as used.`);
  };

  const handleDonate = () => {
    if (!donateForm.pickup_location.trim()) { setDonateErr('Pickup location is required.'); return; }
    if (!donateItem) return;
    updateFoodItem(donateItem.food_id, { status: 'donated' });
    addDonation({ food_id: donateItem.food_id, donor_id: user!.id, donor_name: user!.full_name, food_name: donateItem.item_name, food_category: donateItem.category, expiry_date: donateItem.expiry_date, pickup_location: donateForm.pickup_location, availability: donateForm.availability, status: 'available' });
    setDonateItem(null); setDonateForm({ pickup_location:'', availability:'' }); setDonateErr('');
    reload(); showToast(`"${donateItem.item_name}" listed for donation.`);
  };

  const filtered = items.filter(i => tab === 'active' ? (i.status === 'active' || i.status === 'reserved') : i.status === tab);
  const expiringCount = items.filter(i => i.status === 'active' && daysUntilExpiry(i.expiry_date) <= 3).length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 left-5 bg-foreground text-background text-sm px-4 py-2 z-50 shadow-lg">
          {toast}
        </div>
      )}

      <div className="max-w-6xl mx-auto px-5 py-8">
        {/* Header */}
        <div className="flex items-end justify-between mb-6 pb-5 border-b border-border">
          <div>
            <h1 className="font-serif text-3xl">Food Inventory</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {items.filter(i=>i.status==='active').length} active items
              {expiringCount > 0 && <span className="text-orange-600"> · {expiringCount} expiring soon</span>}
            </p>
          </div>
          <button onClick={() => { setForm(EMPTY); setEditItem(null); setFormErrors({}); setFormOpen(true); }}
            className="flex items-center gap-1.5 h-8 px-3 bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors">
            <Plus size={13}/> Add Item
          </button>
        </div>

        {/* Expiry alert */}
        {expiringCount > 0 && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-300 border-l-4 border-l-amber-500 px-4 py-2.5 mb-6">
            <AlertTriangle size={14} className="text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800">{expiringCount} item{expiringCount>1?'s':''} expiring within 3 days — donate or use them soon.</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-border mb-6 gap-0">
          {(['active','used','donated'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px capitalize ${tab===t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
              {t} ({items.filter(i=> t==='active' ? (i.status==='active'||i.status==='reserved') : i.status===t).length})
            </button>
          ))}
        </div>

        {/* Items — table-style for desktop, card for mobile */}
        {filtered.length === 0 ? (
          <div className="border border-border py-16 text-center">
            <Package size={28} className="text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No {tab} items.</p>
            {tab === 'active' && (
              <button onClick={() => setFormOpen(true)} className="mt-3 text-xs text-primary font-semibold hover:underline underline-offset-2">
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
                        <td className="px-3 py-2.5">
                          <span className={`text-xs px-1.5 py-0.5 font-mono font-medium ${color}`}>{label}</span>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">{item.storage_location || '—'}</td>
                        <td className="px-3 py-2.5">
                          <span className={`text-xs font-medium ${item.status==='reserved'?'text-sky-700':'text-muted-foreground'}`}>
                            {item.status === 'reserved' ? 'In meal plan' : item.status}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          {tab === 'active' && (
                            <div className="flex items-center gap-1">
                              <button onClick={() => openEdit(item)} className="p-1 hover:text-primary transition-colors" title="Edit"><Pencil size={12}/></button>
                              <button onClick={() => handleMarkUsed(item)} className="p-1 hover:text-emerald-600 transition-colors" title="Mark used"><CheckCircle size={12}/></button>
                              <button onClick={() => { setDonateItem(item); setDonateForm({pickup_location:'',availability:''}); setDonateErr(''); }} className="p-1 hover:text-sky-600 transition-colors" title="Donate"><HeartHandshake size={12}/></button>
                              <button onClick={() => setDeleteItem(item)} className="p-1 hover:text-red-600 transition-colors" title="Delete"><Trash2 size={12}/></button>
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
                  <div key={item.food_id} className="border border-border p-3">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="font-medium text-sm">{item.item_name}</p>
                      <span className={`text-xs px-1.5 py-0.5 font-mono font-medium ${color}`}>{label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{item.category} · {item.quantity} {item.unit} · {item.storage_location || 'no location'}</p>
                    {tab === 'active' && (
                      <div className="flex gap-2 mt-2 pt-2 border-t border-border">
                        <button onClick={() => openEdit(item)} className="text-xs text-muted-foreground hover:text-primary">Edit</button>
                        <button onClick={() => handleMarkUsed(item)} className="text-xs text-emerald-700">Used</button>
                        <button onClick={() => { setDonateItem(item); setDonateForm({pickup_location:'',availability:''}); }} className="text-xs text-sky-700">Donate</button>
                        <button onClick={() => setDeleteItem(item)} className="text-xs text-red-600 ml-auto">Delete</button>
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
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md border border-border shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-serif text-base">{editItem ? 'Edit Food Item' : 'Add Food Item'}</h2>
              <button onClick={() => { setFormOpen(false); setEditItem(null); }}><X size={16} className="text-muted-foreground"/></button>
            </div>
            <div className="px-5 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
              <Field label="Item Name *" error={formErrors.item_name}>
                <input value={form.item_name} onChange={e => setForm(f=>({...f,item_name:e.target.value}))} placeholder="e.g. Canned Tuna"
                  className={`w-full h-8 px-2.5 border text-sm focus:outline-none focus:border-primary ${formErrors.item_name?'border-destructive':'border-input'}`}/>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Quantity *" error={formErrors.quantity}>
                  <input type="number" min="0" step="0.1" value={form.quantity} onChange={e=>setForm(f=>({...f,quantity:e.target.value}))} placeholder="2"
                    className={`w-full h-8 px-2.5 border text-sm focus:outline-none focus:border-primary ${formErrors.quantity?'border-destructive':'border-input'}`}/>
                </Field>
                <Field label="Unit *" error={formErrors.unit}>
                  <input value={form.unit} onChange={e=>setForm(f=>({...f,unit:e.target.value}))} placeholder="kg, cans…"
                    className={`w-full h-8 px-2.5 border text-sm focus:outline-none focus:border-primary ${formErrors.unit?'border-destructive':'border-input'}`}/>
                </Field>
              </div>
              <Field label="Expiry Date *" error={formErrors.expiry_date}>
                <input type="date" value={form.expiry_date} onChange={e=>setForm(f=>({...f,expiry_date:e.target.value}))}
                  className={`w-full h-8 px-2.5 border text-sm focus:outline-none focus:border-primary ${formErrors.expiry_date?'border-destructive':'border-input'}`}/>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Category *" error={formErrors.category}>
                  <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}
                    className={`w-full h-8 px-2.5 border text-sm focus:outline-none focus:border-primary bg-white ${formErrors.category?'border-destructive':'border-input'}`}>
                    <option value="">Select…</option>
                    {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Storage">
                  <select value={form.storage_location} onChange={e=>setForm(f=>({...f,storage_location:e.target.value}))}
                    className="w-full h-8 px-2.5 border border-input text-sm focus:outline-none focus:border-primary bg-white">
                    <option value="">Optional</option>
                    {STORAGE.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Remarks">
                <textarea value={form.remarks} onChange={e=>setForm(f=>({...f,remarks:e.target.value}))} placeholder="Any notes…"
                  className="w-full h-14 px-2.5 py-1.5 border border-input text-sm focus:outline-none focus:border-primary resize-none"/>
              </Field>
            </div>
            <div className="px-5 py-3 border-t border-border flex justify-end gap-2">
              <button onClick={() => { setFormOpen(false); setEditItem(null); }} className="h-8 px-3 text-xs border border-input hover:bg-muted transition-colors">Cancel</button>
              <button onClick={handleSave} className="h-8 px-4 text-xs bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors">
                {editItem ? 'Save Changes' : 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteItem && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm border border-border shadow-xl p-5">
            <h2 className="font-serif text-base mb-2">Remove item?</h2>
            <p className="text-sm text-muted-foreground mb-5">
              <strong className="text-foreground">"{deleteItem.item_name}"</strong> will be permanently removed from your inventory.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteItem(null)} className="h-8 px-3 text-xs border border-input hover:bg-muted transition-colors">Cancel</button>
              <button onClick={handleDelete} className="h-8 px-4 text-xs bg-destructive text-white font-semibold hover:bg-destructive/90 transition-colors">Remove</button>
            </div>
          </div>
        </div>
      )}

      {/* Donate modal */}
      {donateItem && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm border border-border shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-serif text-base">Convert to Donation</h2>
              <button onClick={() => setDonateItem(null)}><X size={16} className="text-muted-foreground"/></button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <p className="text-sm text-muted-foreground">Listing <strong className="text-foreground">"{donateItem.item_name}"</strong> for community pickup.</p>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1">Pickup Location *</label>
                <input value={donateForm.pickup_location} onChange={e => { setDonateForm(f=>({...f,pickup_location:e.target.value})); setDonateErr(''); }}
                  placeholder="e.g. Taman Desa, KL"
                  className={`w-full h-8 px-2.5 border text-sm focus:outline-none focus:border-primary ${donateErr?'border-destructive':'border-input'}`}/>
                {donateErr && <p className="text-xs text-red-600 mt-0.5">{donateErr}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1">Availability</label>
                <input value={donateForm.availability} onChange={e=>setDonateForm(f=>({...f,availability:e.target.value}))}
                  placeholder="e.g. Weekdays 6–8 PM"
                  className="w-full h-8 px-2.5 border border-input text-sm focus:outline-none focus:border-primary"/>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-border flex justify-end gap-2">
              <button onClick={() => setDonateItem(null)} className="h-8 px-3 text-xs border border-input hover:bg-muted transition-colors">Cancel</button>
              <button onClick={handleDonate} className="h-8 px-4 text-xs bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors flex items-center gap-1.5">
                <HeartHandshake size={12}/> List for Donation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
