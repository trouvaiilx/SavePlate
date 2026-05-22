import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import { api } from '@/lib/api';
import {
    getWeekStart, daysUntilExpiry, expiryLabel,
    type FoodItem, type MealSlot,
} from '@/lib/store';
import { ChevronLeft, ChevronRight, ChevronDown, Plus, X, UtensilsCrossed, Lightbulb, Search, Package, Clock } from 'lucide-react';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
type MealType = typeof MEAL_TYPES[number];

const MEAL_TYPE_LABELS: Record<MealType, string> = {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',
    snack: 'Snack',
};

const MEAL_TYPE_COLORS: Record<MealType, string> = {
    breakfast: 'border-amber-200 bg-amber-50',
    lunch: 'border-sky-200 bg-sky-50',
    dinner: 'border-violet-200 bg-violet-50',
    snack: 'border-emerald-200 bg-emerald-50',
};

const MEAL_TYPE_DOT: Record<MealType, string> = {
    breakfast: 'bg-amber-400',
    lunch: 'bg-sky-400',
    dinner: 'bg-violet-400',
    snack: 'bg-emerald-400',
};

// Helper to safely format local Date to YYYY-MM-DD
function toLocalISOString(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

// Format "2026-05-12" → "12 May"
function fmtDate(iso: string): string {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-MY', { day: 'numeric', month: 'short' });
}

// Get ISO date for day offset from weekStart
function dayDate(weekStart: string, dayIdx: number): string {
    const d = new Date(weekStart + 'T00:00:00');
    d.setDate(d.getDate() + dayIdx);
    return toLocalISOString(d);
}

export default function MealPlan() {
    const { user } = useAuth();
    const [weekStart, setWeekStart] = useState(getWeekStart());
    const [slots, setSlots] = useState<MealSlot[]>([]);
    const [myItems, setMyItems] = useState<FoodItem[]>([]);
    const [addingTo, setAddingTo] = useState<{ day: number; mealType: MealType } | null>(null);
    const [mealInput, setMealInput] = useState('');
    const [toast, setToast] = useState('');
    const [inventorySearch, setInventorySearch] = useState('');
    const [inventoryFilter, setInventoryFilter] = useState<'all' | 'expiring'>('all');
    const [isInventoryOpen, setIsInventoryOpen] = useState(false);
    const [openDays, setOpenDays] = useState<Set<number>>(() => {
        const today = new Date().getDay();
        const todayIdx = today === 0 ? 6 : today - 1;
        return new Set([todayIdx]);
    });
    const modalInputRef = useRef<HTMLInputElement>(null);

    const toggleDay = (dayIdx: number) => {
        setOpenDays(prev => {
            const next = new Set(prev);
            if (next.has(dayIdx)) next.delete(dayIdx);
            else next.add(dayIdx);
            return next;
        });
    };

    const reload = async () => {
        try {
            const [slotsData, foodData] = await Promise.all([
                api(`/meals?week_start=${weekStart}`),
                api('/food')
            ]);
            setSlots(slotsData.slots || []);
            setMyItems(foodData);
        } catch (e) { console.error(e); }
    };
    useEffect(() => { reload(); }, [weekStart]);

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

    // Active inventory items sorted by expiry
    const activeItems = useMemo(() =>
        myItems
            .filter(i => i.status === 'active')
            .sort((a, b) => daysUntilExpiry(a.expiry_date) - daysUntilExpiry(b.expiry_date)),
        [myItems]
    );

    // Filtered inventory for sidebar
    const filteredInventory = useMemo(() => {
        let items = activeItems;
        if (inventoryFilter === 'expiring') items = items.filter(i => daysUntilExpiry(i.expiry_date) <= 7);
        if (inventorySearch.trim()) {
            const q = inventorySearch.toLowerCase();
            items = items.filter(i => i.item_name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q));
        }
        return items;
    }, [activeItems, inventoryFilter, inventorySearch]);

    // Names of items already planned in any cell this week
    const plannedMealNames = useMemo(() => {
        const names = new Set(slots.map(s => s.meal_name.toLowerCase()));
        return names;
    }, [slots]);

    // Filtered items for add-meal modal dropdown (hide already-planned items)
    const modalInventory = useMemo(() => {
        let items = activeItems.filter(i => !plannedMealNames.has(i.item_name.toLowerCase()));
        if (mealInput.trim()) {
            const q = mealInput.toLowerCase();
            items = items.filter(i => i.item_name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q));
        }
        return items;
    }, [activeItems, mealInput, plannedMealNames]);

    const expiringCount = useMemo(() =>
        activeItems.filter(i => daysUntilExpiry(i.expiry_date) <= 3).length,
        [activeItems]
    );

    const prevWeek = () => {
        const d = new Date(weekStart + 'T00:00:00');
        d.setDate(d.getDate() - 7);
        setWeekStart(toLocalISOString(d));
    };
    const nextWeek = () => {
        const d = new Date(weekStart + 'T00:00:00');
        d.setDate(d.getDate() + 7);
        setWeekStart(toLocalISOString(d));
    };
    const thisWeek = () => setWeekStart(getWeekStart());

    const isCurrentWeek = weekStart === getWeekStart();

    const slotsForCell = (day: number, mealType: MealType) =>
        slots.filter(s => s.day_index === day && s.meal_type === mealType);

    const openAddModal = (day: number, mealType: MealType) => {
        setAddingTo({ day, mealType });
        setMealInput('');
        setTimeout(() => modalInputRef.current?.focus(), 100);
    };

    const handleAdd = async (name?: string) => {
        const finalName = name || mealInput.trim();
        if (!addingTo || !finalName) return;
        try {
            await api('/meals/slots', {
                method: 'POST',
                body: JSON.stringify({
                    week_start: weekStart,
                    day_index: addingTo.day,
                    meal_type: addingTo.mealType,
                    meal_name: finalName,
                    food_ids: [],
                })
            });
            setMealInput('');
            setAddingTo(null);
            reload();
            showToast('Meal added to plan.');
        } catch (e) { showToast('Error adding meal'); }
    };

    const handleRemove = async (slot_id: number) => {
        try {
            await api(`/meals/slots/${slot_id}`, { method: 'DELETE' });
            reload();
            showToast('Meal removed.');
        } catch (e) { showToast('Error removing meal'); }
    };

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            {/* Toast */}
            {toast && (
                <div className="fixed bottom-0 sm:bottom-5 left-0 sm:left-5 right-0 sm:right-auto z-50 bg-foreground text-background text-sm px-4 py-3 sm:py-2 shadow-lg sm:max-w-xs animate-[slideUp_0.2s_ease-out]">
                    {toast}
                </div>
            )}

            {/* Add Meal Modal */}
            {addingTo && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center" onClick={() => setAddingTo(null)}>
                    <div className="bg-white w-full sm:max-w-md border-t sm:border border-border shadow-xl max-h-[85vh] flex flex-col animate-[slideUp_0.2s_ease-out]" onClick={e => e.stopPropagation()}>
                        {/* Modal header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
                            <div>
                                <h2 className="font-serif text-base">Add Meal</h2>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {DAYS[addingTo.day]} · {MEAL_TYPE_LABELS[addingTo.mealType]} · {fmtDate(dayDate(weekStart, addingTo.day))}
                                </p>
                            </div>
                            <button onClick={() => setAddingTo(null)} className="p-1 hover:bg-muted transition-colors">
                                <X size={18} className="text-muted-foreground" />
                            </button>
                        </div>

                        {/* Search / type meal name */}
                        <div className="px-5 pt-4 pb-2 shrink-0">
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    ref={modalInputRef}
                                    autoFocus
                                    value={mealInput}
                                    onChange={e => setMealInput(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter' && mealInput.trim()) handleAdd(); if (e.key === 'Escape') setAddingTo(null); }}
                                    placeholder="Search inventory or type a meal name…"
                                    className="w-full h-11 pl-9 pr-3 border border-input text-sm focus:outline-none focus:border-primary transition-colors"
                                />
                            </div>
                            {mealInput.trim() && (
                                <button
                                    onClick={() => handleAdd()}
                                    className="w-full mt-2 flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-primary hover:bg-primary/5 border border-primary/20 transition-colors"
                                >
                                    <Plus size={14} />
                                    Add "{mealInput.trim()}" as custom meal
                                </button>
                            )}
                        </div>

                        {/* Inventory list */}
                        <div className="flex-1 overflow-y-auto border-t border-border">
                            <div className="px-5 py-2 bg-white border-b border-border sticky top-0 z-10">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                    {modalInventory.length > 0
                                        ? `Your Inventory (${modalInventory.length} items)`
                                        : 'No matching items'}
                                </p>
                            </div>
                            {modalInventory.length === 0 ? (
                                <div className="px-5 py-8 text-center">
                                    <Package size={24} className="text-muted-foreground mx-auto mb-2" />
                                    <p className="text-sm text-muted-foreground">No items match your search.</p>
                                    {mealInput.trim() && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Press <kbd className="text-[10px] border border-border px-1 py-0.5">Enter</kbd> to add as custom meal.
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div className="divide-y divide-border">
                                    {modalInventory.map(item => {
                                        const days = daysUntilExpiry(item.expiry_date);
                                        const { label, color } = expiryLabel(days);
                                        return (
                                            <button
                                                key={item.food_id}
                                                onClick={() => handleAdd(item.item_name)}
                                                className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-muted/40 active:bg-muted transition-colors group"
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{item.item_name}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-xs text-muted-foreground">{item.category}</span>
                                                        <span className="text-xs text-muted-foreground">·</span>
                                                        <span className="text-xs text-muted-foreground font-mono">{item.quantity} {item.unit}</span>
                                                        {item.storage_location && (
                                                            <>
                                                                <span className="text-xs text-muted-foreground">·</span>
                                                                <span className="text-xs text-muted-foreground">{item.storage_location}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0 ml-3">
                                                    <span className={`text-xs px-1.5 py-0.5 font-mono font-semibold ${color}`}>{label}</span>
                                                    <Plus size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-6xl mx-auto px-4 sm:px-5 py-6 sm:py-8">

                {/* Header */}
                <div className="pb-4 sm:pb-5 border-b border-border mb-5 sm:mb-6">
                    <h1 className="font-serif text-2xl sm:text-3xl">Weekly Meal Planner</h1>
                    <p className="text-sm text-muted-foreground mt-1">Plan meals using your inventory. Prioritise items expiring soon.</p>
                </div>

                {/* Week navigation */}
                <div className="flex items-center justify-between gap-4 mb-5 sm:mb-6">
                    <div className="flex items-center gap-2">
                        <button onClick={prevWeek}
                            className="w-9 h-9 flex items-center justify-center border border-input hover:bg-muted transition-colors">
                            <ChevronLeft size={16} />
                        </button>
                        <div className="text-sm font-semibold tabular-nums">
                            {fmtDate(weekStart)} — {fmtDate(dayDate(weekStart, 6))}
                        </div>
                        <button onClick={nextWeek}
                            className="w-9 h-9 flex items-center justify-center border border-input hover:bg-muted transition-colors">
                            <ChevronRight size={16} />
                        </button>
                    </div>
                    {!isCurrentWeek && (
                        <button onClick={thisWeek}
                            className="text-xs text-primary font-semibold hover:underline underline-offset-2">
                            This week
                        </button>
                    )}
                </div>

                {/* Layout: calendar + sidebar */}
                <div className="flex flex-col lg:flex-row gap-5 sm:gap-6">

                    {/* Calendar grid */}
                    <div className="flex-1 min-w-0 order-2 lg:order-1">
                        {/* Desktop: grid with day columns */}
                        <div className="hidden md:block border border-border overflow-hidden">
                            {/* Day headers */}
                            <div className="grid grid-cols-7 divide-x divide-border border-b border-border bg-muted/30">
                                {DAYS.map((day, i) => {
                                    const iso = dayDate(weekStart, i);
                                    const isToday = iso === toLocalISOString(new Date());
                                    return (
                                        <div key={day} className={`px-2 py-2 text-center ${isToday ? 'bg-primary/5' : ''}`}>
                                            <p className={`text-xs font-semibold ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>{day}</p>
                                            <p className={`text-xs mt-0.5 ${isToday ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>{fmtDate(iso)}</p>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Meal rows */}
                            {MEAL_TYPES.map(mtype => (
                                <div key={mtype} className="grid grid-cols-7 divide-x divide-border border-b border-border last:border-b-0">
                                    {DAYS.map((_, dayIdx) => {
                                        const cellSlots = slotsForCell(dayIdx, mtype);
                                        return (
                                            <div key={dayIdx} className={`p-1.5 min-h-[64px] ${MEAL_TYPE_COLORS[mtype]}`}>
                                                {/* Meal type label on first column */}
                                                {dayIdx === 0 && (
                                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                                                        {MEAL_TYPE_LABELS[mtype]}
                                                    </p>
                                                )}
                                                {cellSlots.map(s => (
                                                    <div key={s.slot_id}
                                                        className="flex items-center justify-between gap-1 bg-white border border-border px-1.5 py-1 mb-1 group">
                                                        <span className="text-[11px] font-medium truncate leading-tight">{s.meal_name}</span>
                                                        <button onClick={() => handleRemove(s.slot_id)}
                                                            className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <X size={10} className="text-muted-foreground hover:text-red-600" />
                                                        </button>
                                                    </div>
                                                ))}
                                                <button onClick={() => openAddModal(dayIdx, mtype)}
                                                    className="w-full flex items-center justify-center h-5 text-muted-foreground hover:text-primary transition-colors opacity-0 hover:opacity-100 focus:opacity-100">
                                                    <Plus size={11} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>

                        {/* Mobile: stacked day cards */}
                        <div className="md:hidden space-y-3">
                            {DAYS.map((day, dayIdx) => {
                                const iso = dayDate(weekStart, dayIdx);
                                const isToday = iso === toLocalISOString(new Date());
                                const daySlots = slots.filter(s => s.day_index === dayIdx);
                                const isOpen = openDays.has(dayIdx);
                                return (
                                    <div key={day} className={`border ${isToday ? 'border-primary' : 'border-border'} overflow-hidden`}>
                                        <button
                                            onClick={() => toggleDay(dayIdx)}
                                            className={`w-full flex items-center justify-between px-4 py-2.5 ${isOpen ? 'border-b border-border' : ''} ${isToday ? 'bg-primary/5' : 'bg-muted/30'}`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className={`text-sm font-semibold ${isToday ? 'text-primary' : ''}`}>{day}</span>
                                                <span className={`text-xs ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>{fmtDate(iso)}</span>
                                                {daySlots.length > 0 && (
                                                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5">{daySlots.length} meal{daySlots.length > 1 ? 's' : ''}</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {isToday && <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 font-semibold">Today</span>}
                                                <ChevronDown size={16} className={`text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                            </div>
                                        </button>
                                        {isOpen && (
                                            <div className="divide-y divide-border">
                                                {MEAL_TYPES.map(mtype => {
                                                    const cellSlots = daySlots.filter(s => s.meal_type === mtype);
                                                    return (
                                                        <div key={mtype} className={`px-4 py-2.5 ${MEAL_TYPE_COLORS[mtype]}`}>
                                                            <div className="flex items-center justify-between mb-1.5">
                                                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{MEAL_TYPE_LABELS[mtype]}</span>
                                                                <button
                                                                    onClick={() => openAddModal(dayIdx, mtype)}
                                                                    className="w-6 h-6 flex items-center justify-center border border-border bg-white text-muted-foreground hover:text-primary hover:border-primary transition-colors">
                                                                    <Plus size={11} />
                                                                </button>
                                                            </div>
                                                            {cellSlots.length === 0 && (
                                                                <p className="text-xs text-muted-foreground italic">No meal planned</p>
                                                            )}
                                                            {cellSlots.map(s => (
                                                                <div key={s.slot_id} className="flex items-center justify-between bg-white border border-border px-2 py-1.5 mb-1.5">
                                                                    <span className="text-sm font-medium">{s.meal_name}</span>
                                                                    <button onClick={() => handleRemove(s.slot_id)}>
                                                                        <X size={13} className="text-muted-foreground hover:text-red-600" />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Sidebar: inventory + legend */}
                    <div className="lg:w-72 shrink-0 flex flex-col gap-4 order-1 lg:order-2">

                        {/* Meal type legend - compact */}
                        <div className="border border-border p-3 order-1 lg:order-1">
                            <div className="flex items-center flex-wrap gap-3">
                                {MEAL_TYPES.map(t => (
                                    <div key={t} className="flex items-center gap-1.5">
                                        <span className={`w-2.5 h-2.5 rounded-full ${MEAL_TYPE_DOT[t]}`} />
                                        <span className="text-xs font-medium text-muted-foreground">{MEAL_TYPE_LABELS[t]}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Instructions */}
                        <div className="border border-border px-4 py-4 order-2 lg:order-2">
                            <h2 className="text-sm font-semibold mb-2">How to use</h2>
                            <ul className="space-y-1.5 text-xs text-muted-foreground">
                                <li>· Click <Plus size={9} className="inline" /> on a cell to add a meal.</li>
                                <li>· Pick from your inventory or type a custom name.</li>
                                <li>· Items expiring soon are highlighted in the list.</li>
                                <li>· Hover a planned meal and click × to remove it.</li>
                            </ul>
                        </div>

                        {/* Full Inventory Panel */}
                        <div className="border border-border order-3 lg:order-3">
                            <button
                                onClick={() => setIsInventoryOpen(!isInventoryOpen)}
                                className={`w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors ${isInventoryOpen ? 'border-b border-border' : ''}`}
                            >
                                <div className="flex items-center gap-2">
                                    <Package size={13} className="text-primary" />
                                    <h2 className="text-sm font-semibold">Your Inventory</h2>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs text-muted-foreground">{activeItems.length} items</span>
                                    <ChevronDown size={14} className={`text-muted-foreground transition-transform ${isInventoryOpen ? 'rotate-180' : ''}`} />
                                </div>
                            </button>

                            {isInventoryOpen && (
                                <>
                                    <div className="px-4 py-3 border-b border-border bg-muted/10">
                                        {/* Search */}
                                        <div className="relative">
                                            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                            <input
                                                value={inventorySearch}
                                                onChange={e => setInventorySearch(e.target.value)}
                                                placeholder="Search items…"
                                                className="w-full h-8 pl-7 pr-2 text-xs border border-input focus:outline-none focus:border-primary transition-colors"
                                            />
                                        </div>
                                        {/* Filter tabs */}
                                        <div className="flex gap-1 mt-2">
                                            <button
                                                onClick={() => setInventoryFilter('all')}
                                                className={`text-xs px-2 py-1 font-medium transition-colors ${inventoryFilter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
                                            >All</button>
                                            <button
                                                onClick={() => setInventoryFilter('expiring')}
                                                className={`text-xs px-2 py-1 font-medium transition-colors flex items-center gap-1 ${inventoryFilter === 'expiring' ? 'bg-orange-600 text-white' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
                                            >
                                                <Clock size={10} />
                                                Expiring soon
                                                {expiringCount > 0 && <span className="text-[10px]">({expiringCount})</span>}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Inventory list */}
                                    <div className="max-h-[400px] lg:max-h-[calc(100vh-340px)] overflow-y-auto">
                                        {filteredInventory.length === 0 ? (
                                            <div className="px-4 py-6 text-center">
                                                <p className="text-xs text-muted-foreground">
                                                    {inventorySearch ? 'No matching items.' : inventoryFilter === 'expiring' ? 'Nothing expiring soon — great!' : 'No active items in inventory.'}
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-border">
                                                {filteredInventory.map(item => {
                                                    const days = daysUntilExpiry(item.expiry_date);
                                                    const { label, color } = expiryLabel(days);
                                                    const isUrgent = days <= 3;
                                                    return (
                                                        <div
                                                            key={item.food_id}
                                                            className={`px-4 py-2.5 transition-colors ${isUrgent ? 'bg-red-50/50' : 'hover:bg-muted/30'}`}
                                                        >
                                                            <div className="flex items-center justify-between gap-2">
                                                                <div className="min-w-0 flex-1">
                                                                    <p className="text-sm font-medium truncate">{item.item_name}</p>
                                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                                        <span className="text-[11px] text-muted-foreground">{item.category}</span>
                                                                        <span className="text-[11px] text-muted-foreground">·</span>
                                                                        <span className="text-[11px] text-muted-foreground font-mono">{item.quantity} {item.unit}</span>
                                                                    </div>
                                                                </div>
                                                                <span className={`text-[10px] px-1.5 py-0.5 font-mono font-semibold shrink-0 ${color}`}>{label}</span>
                                                            </div>
                                                            {isUrgent && (
                                                                <p className="text-[10px] text-orange-700 mt-1 flex items-center gap-1">
                                                                    <Lightbulb size={9} />
                                                                    Use in a meal soon
                                                                </p>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                    </div>
                </div>
            </div>

            <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
        </div>
    );
}