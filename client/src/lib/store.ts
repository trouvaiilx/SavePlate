// lib/store.ts — shared types and client-side helper functions

export interface FoodItem {
  food_id: number;
  user_id: number;
  item_name: string;
  quantity: number;
  unit: string;
  expiry_date: string;
  category: string;
  storage_location: string;
  remarks: string;
  status: 'active' | 'used' | 'donated' | 'reserved';
  reserved_qty: number;
  created_at: string;
  updated_at: string;
}

export interface Donation {
  donation_id: number;
  food_id: number;
  donor_id: number;
  donor_name: string;
  food_name: string;
  food_category: string;
  expiry_date: string;
  quantity: number;
  unit: string;
  pickup_location: string;
  availability: string;
  status: 'available' | 'claimed' | 'completed';
  created_at: string;
}

export interface Notification {
  notification_id: number;
  user_id: number;
  type: 'expiry' | 'donation_update' | 'meal_reminder' | 'account_security';
  message: string;
  related_id?: number;
  is_read: boolean;
  created_at: string;
}

export interface MealSlot {
  slot_id: number;
  user_id: number;
  week_start: string; // Monday ISO date YYYY-MM-DD
  day?: number;        // 0 = Mon … 6 = Sun
  day_index?: number;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  meal_name: string;
  food_ids: number[];
}

// ─── meal slots ───────────────────────────────────────────────────────────────
export const getWeekStart = (date: Date = new Date()): string => {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // roll to Monday
  d.setDate(diff);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// ─── helpers ──────────────────────────────────────────────────────────────────
export const daysUntilExpiry = (expiryDate: string): number => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const exp = new Date(expiryDate); exp.setHours(0, 0, 0, 0);
  return Math.ceil((exp.getTime() - today.getTime()) / 86400000);
};

export const expiryLabel = (days: number): { label: string; color: string } => {
  if (days < 0)   return { label: 'Expired',       color: 'text-red-700 bg-red-50 border border-red-200' };
  if (days === 0) return { label: 'Expires today', color: 'text-red-600 bg-red-50 border border-red-200' };
  if (days <= 3)  return { label: `${days}d left`, color: 'text-orange-700 bg-orange-50 border border-orange-200' };
  if (days <= 7)  return { label: `${days}d left`, color: 'text-amber-700 bg-amber-50 border border-amber-200' };
  return              { label: `${days}d left`, color: 'text-emerald-700 bg-emerald-50 border border-emerald-200' };
};

export const formatRelativeTime = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins < 1)   return 'Just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7)   return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' });
};
