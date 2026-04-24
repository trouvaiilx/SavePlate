import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard, Package, Search, Bell, BarChart2,
  UtensilsCrossed, LogOut, Settings, Menu, X,
} from 'lucide-react';
import { useState, useEffect } from 'react';

const navLinks = [
  { to: '/dashboard',     label: 'Dashboard',   icon: LayoutDashboard },
  { to: '/inventory',     label: 'Inventory',   icon: Package },
  { to: '/browse',        label: 'Browse',      icon: Search },
  { to: '/notifications', label: 'Alerts',      icon: Bell },
  { to: '/analytics',     label: 'Analytics',   icon: BarChart2 },
  { to: '/meals',         label: 'Meal Plan',   icon: UtensilsCrossed },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);

  // Prevent body scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  const initials = user?.full_name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || 'U';

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-5 h-12 flex items-center">

          {/* Wordmark */}
          <Link to="/dashboard" className="flex items-center gap-2 shrink-0">
            <div className="w-5 h-5 bg-primary flex items-center justify-center">
              <span className="text-white text-[10px] font-bold tracking-tight">SP</span>
            </div>
            <span className="font-serif font-bold text-[15px] text-foreground tracking-tight">SavePlate</span>
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden sm:flex items-stretch h-12 gap-0 flex-1 ml-8 overflow-x-auto">
            {navLinks.map(({ to, label, icon: Icon }) => {
              const active = location.pathname === to;
              return (
                <Link key={to} to={to}
                  className={[
                    'flex items-center gap-1.5 px-3 text-[13px] font-medium border-b-2 whitespace-nowrap transition-colors',
                    active
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
                  ].join(' ')}>
                  <Icon size={13} />
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Desktop user */}
          <div className="hidden sm:flex items-center gap-2 ml-auto shrink-0">
            <span className="w-6 h-6 bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center">
              {initials}
            </span>
            <span className="text-[13px] font-medium max-w-[100px] truncate">{user?.full_name.split(' ')[0]}</span>
            <button onClick={() => navigate('/account')}
              className="p-1 text-muted-foreground hover:text-foreground transition-colors ml-1">
              <Settings size={14} />
            </button>
            <button onClick={() => { logout(); navigate('/login'); }}
              className="p-1 text-muted-foreground hover:text-destructive transition-colors">
              <LogOut size={14} />
            </button>
          </div>

          {/* Mobile: initials + hamburger */}
          <div className="sm:hidden flex items-center gap-2 ml-auto">
            <span className="w-7 h-7 bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center">
              {initials}
            </span>
            <button
              onClick={() => setDrawerOpen(v => !v)}
              className="w-9 h-9 flex items-center justify-center text-foreground"
              aria-label="Open menu">
              {drawerOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <div
          className="sm:hidden fixed inset-0 z-30 bg-black/30"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Mobile drawer panel */}
      <div className={[
        'sm:hidden fixed top-12 left-0 right-0 z-30 bg-white border-b border-border shadow-lg transition-transform duration-200',
        drawerOpen ? 'translate-y-0' : '-translate-y-full pointer-events-none',
      ].join(' ')}>
        {/* User info */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/30">
          <span className="w-8 h-8 bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">
            {initials}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{user?.full_name}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>

        {/* Nav links */}
        <nav className="py-1">
          {navLinks.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to;
            return (
              <Link key={to} to={to}
                className={[
                  'flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors border-l-2',
                  active
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-foreground hover:bg-muted',
                ].join(' ')}>
                <Icon size={16} className={active ? 'text-primary' : 'text-muted-foreground'} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Drawer footer actions */}
        <div className="border-t border-border py-1">
          <button onClick={() => navigate('/account')}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-muted transition-colors">
            <Settings size={16} className="text-muted-foreground" /> Account Settings
          </button>
          <button onClick={() => { logout(); navigate('/login'); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-destructive hover:bg-red-50 transition-colors">
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </div>
    </>
  );
}
