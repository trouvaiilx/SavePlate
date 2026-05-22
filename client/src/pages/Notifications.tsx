import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import { api } from '@/lib/api';
import { formatRelativeTime, type Notification } from '@/lib/store';
import { Bell, AlertTriangle, HeartHandshake, UtensilsCrossed, ShieldCheck, CheckCheck, Inbox, ChevronLeft, ChevronRight } from 'lucide-react';

const ITEMS_PER_PAGE = 8;

const TYPE_META: Record<
  Notification['type'],
  { icon: React.FC<{ size: number; className?: string }>; color: string; label: string }
> = {
  expiry:           { icon: AlertTriangle,   color: 'text-orange-600 bg-orange-50 border-orange-200', label: 'Expiry Alert' },
  donation_update:  { icon: HeartHandshake,  color: 'text-sky-700 bg-sky-50 border-sky-200',          label: 'Donation' },
  meal_reminder:    { icon: UtensilsCrossed, color: 'text-violet-700 bg-violet-50 border-violet-200', label: 'Meal Reminder' },
  account_security: { icon: ShieldCheck,     color: 'text-emerald-700 bg-emerald-50 border-emerald-200', label: 'Security' },
};

const NAV_TARGET: Partial<Record<Notification['type'], string>> = {
  expiry:          '/inventory',
  donation_update: '/browse',
  meal_reminder:   '/meals',
  account_security:'/account',
};

/** Build an array of page numbers with ellipsis (null) for large ranges. */
function buildPageRange(current: number, total: number): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | null)[] = [];
  pages.push(1);

  if (current > 3) pages.push(null);

  const start = Math.max(2, current - 1);
  const end   = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push(null);

  pages.push(total);
  return pages;
}

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [page, setPage] = useState(1);

  const reload = async () => {
    try {
      const data = await api('/notifications');
      setNotifs(data);
    } catch (e) { console.error('Failed to load notifications'); }
  };
  useEffect(() => { reload(); }, []);

  // Reset to page 1 when the filter changes
  useEffect(() => { setPage(1); }, [filter]);

  const handleClick = async (n: Notification) => {
    try {
      await api(`/notifications/${n.notification_id}/read`, { method: 'PATCH' });
      reload();
      const target = NAV_TARGET[n.type];
      if (target) navigate(target);
    } catch (e) { console.error('Failed to mark notification read'); }
  };

  const handleMarkAll = async () => {
    try {
      await api('/notifications/read-all', { method: 'PATCH' });
      reload();
    } catch (e) { console.error('Failed to mark all read'); }
  };

  const displayed = filter === 'unread' ? notifs.filter(n => !n.is_read) : notifs;
  const unreadCount = notifs.filter(n => !n.is_read).length;

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(displayed.length / ITEMS_PER_PAGE));
  const safePage   = Math.min(page, totalPages);
  const startIdx   = (safePage - 1) * ITEMS_PER_PAGE;
  const endIdx     = Math.min(startIdx + ITEMS_PER_PAGE, displayed.length);
  const pageItems  = displayed.slice(startIdx, endIdx);
  const pageRange  = buildPageRange(safePage, totalPages);

  const goTo = (p: number) => {
    setPage(Math.max(1, Math.min(p, totalPages)));
    // Scroll to top of list smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 sm:px-5 py-6 sm:py-8">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 sm:pb-5 border-b border-border mb-5 sm:mb-6">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                {unreadCount} unread alert{unreadCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAll}
              className="flex items-center gap-1.5 h-9 px-3 border border-input text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0 mt-1">
              <CheckCheck size={13} /> Mark all read
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex border-b border-border mb-5">
          {([['all', 'All'], ['unread', 'Unread']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                filter === key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
              }`}>
              {label}
              {key === 'unread' && unreadCount > 0 && (
                <span className="ml-1.5 text-xs bg-primary text-primary-foreground px-1.5 py-0.5 font-bold">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Summary and Legend */}
        {displayed.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <p className="text-xs text-muted-foreground">
              Showing {startIdx + 1}–{endIdx} of {displayed.length} notification{displayed.length !== 1 ? 's' : ''}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {Object.entries(TYPE_META).map(([key, meta]) => {
                const Icon = meta.icon;
                return (
                  <div key={key} className="flex items-center gap-1.5">
                    <Icon size={12} className={meta.color.split(' ')[0]} />
                    <span className="text-xs text-muted-foreground">{meta.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* List */}
        {displayed.length === 0 ? (
          <div className="border border-border py-16 flex flex-col items-center gap-3">
            <Inbox size={28} className="text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {filter === 'unread' ? 'No unread notifications.' : 'No notifications yet.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border border border-border">
            {pageItems.map(n => {
              const meta = TYPE_META[n.type];
              const Icon = meta.icon;
              const hasTarget = !!NAV_TARGET[n.type];
              return (
                <button
                  key={n.notification_id}
                  onClick={() => handleClick(n)}
                  className={`w-full flex items-start gap-4 px-4 py-4 text-left transition-colors hover:bg-muted/40 active:bg-muted ${
                    !n.is_read ? 'bg-primary/[0.03]' : ''
                  }`}>
                  {/* Icon badge */}
                  <div className={`shrink-0 w-9 h-9 flex items-center justify-center border ${meta.color}`}>
                    <Icon size={16} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {meta.label}
                      </span>
                      {!n.is_read && (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      )}
                    </div>
                    <p className={`text-sm leading-snug ${n.is_read ? 'text-muted-foreground' : 'text-foreground font-medium'}`}>
                      {n.message}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-muted-foreground">{formatRelativeTime(n.created_at)}</p>
                      {hasTarget && (
                        <span className="text-xs text-primary font-semibold">View →</span>
                      )}
                    </div>
                  </div>

                  {/* Unread dot on right */}
                  {!n.is_read && (
                    <div className="shrink-0 w-2 h-2 rounded-full bg-primary mt-2" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="mt-5">
            {/* Desktop pagination — hidden on mobile */}
            <div className="hidden sm:flex items-center justify-center gap-1">
              <button
                onClick={() => goTo(safePage - 1)}
                disabled={safePage === 1}
                className="h-9 w-9 flex items-center justify-center border border-input text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:pointer-events-none"
                aria-label="Previous page">
                <ChevronLeft size={15} />
              </button>

              {pageRange.map((p, i) =>
                p === null ? (
                  <span key={`ellipsis-${i}`} className="w-9 h-9 flex items-center justify-center text-xs text-muted-foreground select-none">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => goTo(p)}
                    className={`h-9 w-9 flex items-center justify-center text-xs font-semibold border transition-colors ${
                      p === safePage
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-input text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}>
                    {p}
                  </button>
                )
              )}

              <button
                onClick={() => goTo(safePage + 1)}
                disabled={safePage === totalPages}
                className="h-9 w-9 flex items-center justify-center border border-input text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:pointer-events-none"
                aria-label="Next page">
                <ChevronRight size={15} />
              </button>
            </div>

            {/* Mobile pagination — shown only on small screens */}
            <div className="flex sm:hidden items-center justify-between">
              <button
                onClick={() => goTo(safePage - 1)}
                disabled={safePage === 1}
                className="flex items-center gap-1.5 h-9 px-3 border border-input text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:pointer-events-none">
                <ChevronLeft size={13} /> Prev
              </button>

              <span className="text-xs font-medium text-muted-foreground">
                Page {safePage} of {totalPages}
              </span>

              <button
                onClick={() => goTo(safePage + 1)}
                disabled={safePage === totalPages}
                className="flex items-center gap-1.5 h-9 px-3 border border-input text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:pointer-events-none">
                Next <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}


      </div>
    </div>
  );
}
