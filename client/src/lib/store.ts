// lib/store.ts — client-side mock data layer (simulates backend + MySQL)

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
  pickup_location: string;
  availability: string;
  status: 'available' | 'claimed' | 'completed';
  created_at: string;
}

const FOOD_KEY = 'sp_food_items';
const DONATION_KEY = 'sp_donations';

export const seedFoodData = (userId: number) => {
  if (localStorage.getItem(FOOD_KEY)) return;
  const today = new Date();
  const addDays = (d: number) => {
    const dt = new Date(today);
    dt.setDate(dt.getDate() + d);
    return dt.toISOString().split('T')[0];
  };
  const items: FoodItem[] = [
    { food_id: 1, user_id: userId, item_name: 'Canned Sardines', quantity: 3, unit: 'cans', expiry_date: addDays(2), category: 'Canned', storage_location: 'Pantry', remarks: 'In tomato sauce', status: 'active', reserved_qty: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { food_id: 2, user_id: userId, item_name: 'Frozen Chicken Breast', quantity: 1.5, unit: 'kg', expiry_date: addDays(5), category: 'Frozen', storage_location: 'Freezer', remarks: '', status: 'active', reserved_qty: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { food_id: 3, user_id: userId, item_name: 'Brown Rice', quantity: 2, unit: 'kg', expiry_date: addDays(120), category: 'Dry Goods', storage_location: 'Pantry', remarks: 'Organic', status: 'active', reserved_qty: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { food_id: 4, user_id: userId, item_name: 'Fresh Spinach', quantity: 250, unit: 'g', expiry_date: addDays(3), category: 'Vegetables', storage_location: 'Fridge', remarks: 'Washed', status: 'active', reserved_qty: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { food_id: 5, user_id: userId, item_name: 'Full Cream Milk', quantity: 1, unit: 'litre', expiry_date: addDays(7), category: 'Dairy', storage_location: 'Fridge', remarks: '', status: 'active', reserved_qty: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { food_id: 6, user_id: userId, item_name: 'Sourdough Bread', quantity: 1, unit: 'loaf', expiry_date: addDays(1), category: 'Bakery', storage_location: 'Counter', remarks: 'Sliced', status: 'active', reserved_qty: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { food_id: 7, user_id: userId, item_name: 'Apple Juice', quantity: 2, unit: 'bottles', expiry_date: addDays(30), category: 'Beverages', storage_location: 'Fridge', remarks: '', status: 'active', reserved_qty: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { food_id: 8, user_id: userId, item_name: 'Greek Yoghurt', quantity: 500, unit: 'g', expiry_date: addDays(4), category: 'Dairy', storage_location: 'Fridge', remarks: 'Plain', status: 'used', reserved_qty: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  ];
  localStorage.setItem(FOOD_KEY, JSON.stringify(items));

  const donations: Donation[] = [
    { donation_id: 1, food_id: 101, donor_id: 99, donor_name: 'Siti Rahimah', food_name: 'Extra Canned Tuna', food_category: 'Canned', expiry_date: addDays(10), pickup_location: 'Taman Desa, KL', availability: 'Weekdays 6–8 PM', status: 'available', created_at: new Date().toISOString() },
    { donation_id: 2, food_id: 102, donor_id: 98, donor_name: 'Ahmad Fadzil', food_name: 'Instant Oats (1 kg)', food_category: 'Dry Goods', expiry_date: addDays(60), pickup_location: 'Cheras, KL', availability: 'Anytime, call first', status: 'available', created_at: new Date().toISOString() },
    { donation_id: 3, food_id: 103, donor_id: 97, donor_name: 'Lee Wei Ting', food_name: 'Frozen Vegetables Mix', food_category: 'Frozen', expiry_date: addDays(14), pickup_location: 'Subang Jaya, SS15', availability: 'Weekends only', status: 'available', created_at: new Date().toISOString() },
  ];
  localStorage.setItem(DONATION_KEY, JSON.stringify(donations));
};

export const getFoodItems = (userId: number): FoodItem[] => {
  const all: FoodItem[] = JSON.parse(localStorage.getItem(FOOD_KEY) || '[]');
  return all.filter(f => f.user_id === userId);
};

export const addFoodItem = (item: Omit<FoodItem, 'food_id' | 'created_at' | 'updated_at'>): FoodItem => {
  const all: FoodItem[] = JSON.parse(localStorage.getItem(FOOD_KEY) || '[]');
  const newItem: FoodItem = { ...item, food_id: Date.now(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  all.push(newItem);
  localStorage.setItem(FOOD_KEY, JSON.stringify(all));
  return newItem;
};

export const updateFoodItem = (food_id: number, updates: Partial<FoodItem>): void => {
  const all: FoodItem[] = JSON.parse(localStorage.getItem(FOOD_KEY) || '[]');
  const idx = all.findIndex(f => f.food_id === food_id);
  if (idx !== -1) {
    all[idx] = { ...all[idx], ...updates, updated_at: new Date().toISOString() };
    localStorage.setItem(FOOD_KEY, JSON.stringify(all));
  }
};

export const deleteFoodItem = (food_id: number): void => {
  const all: FoodItem[] = JSON.parse(localStorage.getItem(FOOD_KEY) || '[]');
  localStorage.setItem(FOOD_KEY, JSON.stringify(all.filter(f => f.food_id !== food_id)));
};

export const getDonations = (): Donation[] => JSON.parse(localStorage.getItem(DONATION_KEY) || '[]');

export const addDonation = (donation: Omit<Donation, 'donation_id' | 'created_at'>): Donation => {
  const all = getDonations();
  const nd: Donation = { ...donation, donation_id: Date.now(), created_at: new Date().toISOString() };
  all.push(nd);
  localStorage.setItem(DONATION_KEY, JSON.stringify(all));
  return nd;
};

export const daysUntilExpiry = (expiryDate: string): number => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const exp = new Date(expiryDate); exp.setHours(0, 0, 0, 0);
  return Math.ceil((exp.getTime() - today.getTime()) / 86400000);
};

export const expiryLabel = (days: number): { label: string; color: string } => {
  if (days < 0)  return { label: 'Expired',        color: 'text-red-700 bg-red-50 border border-red-200' };
  if (days === 0) return { label: 'Expires today',  color: 'text-red-600 bg-red-50 border border-red-200' };
  if (days <= 3)  return { label: `${days}d left`,  color: 'text-orange-700 bg-orange-50 border border-orange-200' };
  if (days <= 7)  return { label: `${days}d left`,  color: 'text-amber-700 bg-amber-50 border border-amber-200' };
  return              { label: `${days}d left`,  color: 'text-emerald-700 bg-emerald-50 border border-emerald-200' };
};
