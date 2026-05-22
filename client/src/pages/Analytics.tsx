import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { api } from '@/lib/api';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { TrendingUp, Leaf, HeartHandshake, Package, BarChart2, Loader2 } from 'lucide-react';

type Range = '7' | '30' | 'all';

const RANGE_LABELS: Record<Range, string> = { '7': 'Last 7 days', '30': 'Last 30 days', 'all': 'All time' };

const PIE_COLORS = ['#16a34a', '#0284c7', '#f59e0b', '#ef4444'];

interface AnalyticsData {
  range: string;
  summary: {
    total_tracked: number;
    total_saved: number;
    total_donated: number;
    total_active: number;
    at_risk: number;
    waste_rate_pct: number;
    co2_saved_kg: number;
  };
  by_category: { category: string; saved: number; donated: number }[];
  status_distribution: { name: string; value: number }[];
}

export default function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [range, setRange] = useState<Range>('30');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api(`/analytics?range=${range}`)
      .then(d => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [range]);

  const summary = data?.summary;
  const categoryData = data?.by_category || [];
  const pieData = data?.status_distribution || [];
  const totalSaved = (summary?.total_saved || 0) + (summary?.total_donated || 0);

  const stats = [
    { icon: Package,        label: 'Items tracked',   value: summary?.total_tracked ?? 0,       color: 'text-foreground' },
    { icon: Leaf,           label: 'Items saved',      value: summary?.total_saved ?? 0,         color: 'text-emerald-700' },
    { icon: HeartHandshake, label: 'Items donated',    value: summary?.total_donated ?? 0,       color: 'text-sky-700' },
    { icon: TrendingUp,     label: 'Waste reduction',  value: `${summary?.waste_rate_pct ?? 0}%`, color: 'text-primary' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-5 py-6 sm:py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 sm:pb-5 border-b border-border mb-6 sm:mb-8">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl">Food Analytics</h1>
            <p className="text-sm text-muted-foreground mt-1">Track your food-saving impact over time.</p>
          </div>
          {/* Date range selector */}
          <div className="flex border border-border shrink-0 self-start sm:self-auto">
            {(Object.entries(RANGE_LABELS) as [Range, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setRange(key)}
                className={`px-3 h-9 text-xs font-semibold transition-colors border-r border-border last:border-r-0 ${
                  range === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-0 sm:border sm:border-border sm:divide-x sm:divide-border mb-8">
              {stats.map(s => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="px-4 sm:px-5 py-4 sm:py-5 border border-border sm:border-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon size={14} className={s.color} />
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{s.label}</p>
                    </div>
                    <p className={`font-serif text-3xl font-bold ${s.color}`}>{s.value}</p>
                  </div>
                );
              })}
            </div>

            {/* CO2 banner */}
            {totalSaved > 0 && (
              <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 border-l-4 border-l-emerald-500 px-4 py-3 mb-8">
                <Leaf size={16} className="text-emerald-600 shrink-0" />
                <p className="text-sm text-emerald-900">
                  By saving <strong>{totalSaved}</strong> item{totalSaved !== 1 ? 's' : ''}, you have prevented an estimated{' '}
                  <strong>{summary?.co2_saved_kg ?? 0} kg of CO₂</strong> from food waste. Keep it up!
                </p>
              </div>
            )}

            {/* Charts row */}
            {totalSaved === 0 ? (
              <div className="border border-border py-20 flex flex-col items-center gap-3">
                <BarChart2 size={32} className="text-muted-foreground" />
                <p className="text-sm text-muted-foreground text-center max-w-xs">
                  No food-saving data yet for this period. Mark items as used or donate them to see your impact here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6 mb-8">

                {/* Bar chart — category breakdown */}
                <div className="lg:col-span-2 border border-border p-5">
                  <h2 className="font-serif text-base mb-4">Saved by Category</h2>
                  {categoryData.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No data for this range.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={categoryData} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
                        <XAxis
                          dataKey="category"
                          tick={{ fontSize: 11, fill: '#6b7280' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fontSize: 11, fill: '#6b7280' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{ border: '1px solid #e5e7eb', borderRadius: 0, fontSize: 12 }}
                          cursor={{ fill: '#f3f4f6' }}
                        />
                        <Bar dataKey="saved"   name="Used / Saved" fill="#16a34a" radius={0} maxBarSize={32} />
                        <Bar dataKey="donated" name="Donated"       fill="#0284c7" radius={0} maxBarSize={32} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                  <div className="flex gap-4 mt-3">
                    <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-emerald-600 shrink-0"/><span className="text-xs text-muted-foreground">Used / Saved</span></div>
                    <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-sky-600 shrink-0"/><span className="text-xs text-muted-foreground">Donated</span></div>
                  </div>
                </div>

                {/* Pie chart — status distribution */}
                <div className="border border-border p-5">
                  <h2 className="font-serif text-base mb-4">Item Distribution</h2>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="none" />
                        ))}
                      </Pie>
                      <Legend
                        iconType="square"
                        iconSize={10}
                        formatter={(value) => <span style={{ fontSize: 11, color: '#6b7280' }}>{value}</span>}
                      />
                      <Tooltip
                        contentStyle={{ border: '1px solid #e5e7eb', borderRadius: 0, fontSize: 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Progress indicators */}
            {(summary?.total_tracked ?? 0) > 0 && (
              <div className="border border-border p-5">
                <h2 className="font-serif text-base mb-4">Progress Indicators</h2>
                <div className="space-y-4">
                  {[
                    { label: 'Items saved from waste', count: summary?.total_saved ?? 0,    total: summary?.total_tracked ?? 0, color: 'bg-emerald-500' },
                    { label: 'Items donated',           count: summary?.total_donated ?? 0, total: summary?.total_tracked ?? 0, color: 'bg-sky-500' },
                    { label: 'Items at risk (expiring in ≤3 days)', count: summary?.at_risk ?? 0, total: summary?.total_tracked ?? 0, color: 'bg-orange-500' },
                  ].map(({ label, count, total, color }) => {
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <div key={label}>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-sm font-medium">{label}</span>
                          <span className="text-sm font-mono font-semibold">{count} <span className="text-muted-foreground font-normal text-xs">/ {total}</span></span>
                        </div>
                        <div className="w-full h-2 bg-muted border border-border overflow-hidden">
                          <div
                            className={`h-full ${color} transition-all duration-500`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{pct}%</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
