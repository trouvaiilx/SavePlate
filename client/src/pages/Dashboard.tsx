import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import { api } from '@/lib/api';
import { daysUntilExpiry, type FoodItem } from '@/lib/store';
import { Package, HeartHandshake, TrendingUp, AlertTriangle, ChevronRight, Loader2 } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [items, setItems] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/food')
      .then(data => setItems(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const active   = items.filter(i => i.status === 'active');
  const expiring = active.filter(i => daysUntilExpiry(i.expiry_date) <= 3);
  const donated  = items.filter(i => i.status === 'donated');
  const used     = items.filter(i => i.status === 'used');

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const stats = [
    { label: 'Active items',  value: active.length,   sub: 'in inventory',      color: 'text-primary' },
    { label: 'Expiring soon', value: expiring.length, sub: 'within 3 days',     color: 'text-amber-600' },
    { label: 'Items used',    value: used.length,     sub: 'saved from waste',  color: 'text-emerald-700' },
    { label: 'Donated',       value: donated.length,  sub: 'shared with others', color: 'text-sky-700' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-5 py-6 sm:py-8">

        {/* Page header */}
        <div className="mb-5 sm:mb-8 pb-4 sm:pb-6 border-b border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1 font-semibold">{greeting}</p>
          <h1 className="font-serif text-2xl sm:text-3xl text-foreground">{user?.full_name.split(' ')[0]}'s Food Dashboard</h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Expiry alert */}
            {expiring.length > 0 && (
              <Link to="/inventory"
                className="flex items-start gap-3 bg-amber-50 border border-amber-300 border-l-4 border-l-amber-500 px-4 py-3 mb-6 hover:bg-amber-100 transition-colors">
                <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-900">
                    {expiring.length} item{expiring.length > 1 ? 's' : ''} expiring within 3 days
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5 truncate">{expiring.map(i => i.item_name).join(' · ')}</p>
                </div>
                <ChevronRight size={14} className="text-amber-600 shrink-0 mt-0.5" />
              </Link>
            )}

            {/* Stats - 2x2 on mobile, 4 across on sm+ */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-0 sm:border sm:border-border sm:divide-x sm:divide-border mb-6 sm:mb-10">
              {stats.map(s => (
                <div key={s.label} className="px-4 sm:px-5 py-4 sm:py-5 border border-border sm:border-0">
                  <p className={`font-serif text-3xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs font-semibold text-foreground mt-1">{s.label}</p>
                  <p className="text-xs text-muted-foreground">{s.sub}</p>
                </div>
              ))}
            </div>

            {/* Two-column layout - stacked on mobile */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">

              {/* Quick links */}
              <div className="lg:col-span-2">
                <h2 className="font-serif text-lg mb-3 sm:mb-4">What do you want to do?</h2>
                <div className="divide-y divide-border border border-border">
                  {[
                    { to: '/inventory', icon: Package,        label: 'Manage Food Inventory', desc: 'Add, edit, donate, or mark items as used' },
                    { to: '/browse',    icon: TrendingUp,     label: 'Browse & Search Items', desc: 'Filter your inventory or find community donations' },
                    { to: '/analytics', icon: TrendingUp,     label: 'Food Analytics',        desc: 'Review your food-saving impact over time' },
                    { to: '/meals',     icon: HeartHandshake, label: 'Weekly Meal Planner',   desc: 'Plan meals around expiring ingredients' },
                  ].map(({ to, icon: Icon, label, desc }) => (
                    <Link key={to} to={to}
                      className="flex items-center gap-4 px-4 py-4 hover:bg-muted/50 active:bg-muted transition-colors group">
                      <Icon size={16} className="text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{label}</p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                      <ChevronRight size={14} className="text-muted-foreground shrink-0" />
                    </Link>
                  ))}
                </div>
              </div>

              {/* Expiring list */}
              <div>
                <h2 className="font-serif text-lg mb-3 sm:mb-4">Needs attention</h2>
                {expiring.length === 0 ? (
                  <div className="border border-border px-4 py-8 text-center">
                    <p className="text-sm text-muted-foreground">All clear — nothing expiring soon.</p>
                  </div>
                ) : (
                  <div className="border border-border divide-y divide-border">
                    {expiring.slice(0, 5).map(item => {
                      const days = daysUntilExpiry(item.expiry_date);
                      return (
                        <div key={item.food_id} className="flex items-center justify-between px-4 py-3 gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{item.item_name}</p>
                            <p className="text-xs text-muted-foreground">{item.quantity} {item.unit}</p>
                          </div>
                          <span className={`text-xs font-mono font-semibold shrink-0 ${days <= 0 ? 'text-red-600' : 'text-orange-600'}`}>
                            {days <= 0 ? 'Expired' : `${days}d`}
                          </span>
                        </div>
                      );
                    })}
                    <Link to="/inventory"
                      className="flex items-center justify-between px-4 py-3 text-xs text-primary font-semibold hover:bg-muted/50 transition-colors">
                      View all in inventory <ChevronRight size={12} />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
