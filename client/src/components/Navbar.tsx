import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { LayoutDashboard, Package, Search, Bell, BarChart2, UtensilsCrossed, LogOut, Settings, ChevronDown } from 'lucide-react';
import { useState } from 'react';

const navLinks = [
  { to: '/dashboard',     label: 'Dashboard',  icon: LayoutDashboard },
  { to: '/inventory',     label: 'Inventory',  icon: Package },
  { to: '/browse',        label: 'Browse',     icon: Search },
  { to: '/notifications', label: 'Alerts',     icon: Bell },
  { to: '/analytics',     label: 'Analytics',  icon: BarChart2 },
  { to: '/meals',         label: 'Meal Plan',  icon: UtensilsCrossed },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const initials = user?.full_name.split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase() || 'U';

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-border">
      <div className="max-w-7xl mx-auto px-5 h-12 flex items-center gap-0">

        {/* Wordmark */}
        <Link to="/dashboard" className="flex items-center gap-2 mr-8 shrink-0">
          <div className="w-5 h-5 bg-primary flex items-center justify-center">
            <span className="text-white text-[10px] font-bold tracking-tight">SP</span>
          </div>
          <span className="font-serif font-bold text-[15px] text-foreground tracking-tight">SavePlate</span>
        </Link>

        {/* Nav links — left aligned, tab-style */}
        <nav className="flex items-stretch h-12 gap-0 flex-1 overflow-x-auto">
          {navLinks.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={[
                  'flex items-center gap-1.5 px-3 text-[13px] font-medium border-b-2 whitespace-nowrap transition-colors',
                  active
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
                ].join(' ')}
              >
                <Icon size={13} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User menu — text-based dropdown, no avatar bloat */}
        <div className="relative shrink-0 ml-4">
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="flex items-center gap-1.5 text-[13px] font-medium text-foreground hover:text-primary transition-colors py-1 px-2 rounded"
          >
            <span className="w-6 h-6 bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center rounded-sm">
              {initials}
            </span>
            <span className="hidden sm:block max-w-[100px] truncate">{user?.full_name.split(' ')[0]}</span>
            <ChevronDown size={11} className="text-muted-foreground" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-border shadow-lg z-20 py-1">
                <div className="px-3 py-2 border-b border-border">
                  <p className="text-xs font-semibold truncate">{user?.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
                <button
                  onClick={() => { setMenuOpen(false); navigate('/account'); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-foreground hover:bg-muted transition-colors"
                >
                  <Settings size={13} /> Account Settings
                </button>
                <div className="border-t border-border mt-1 pt-1">
                  <button
                    onClick={() => { logout(); navigate('/login'); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-destructive hover:bg-red-50 transition-colors"
                  >
                    <LogOut size={13} /> Sign Out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
