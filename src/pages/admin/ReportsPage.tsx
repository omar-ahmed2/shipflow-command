import React, { useState, useMemo } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { EmptyState } from '@/components/shared/EmptyState';
import { 
  Download, 
  CircleDollarSign, 
  TrendingUp, 
  Wallet, 
  Loader2, 
  MapPin, 
  Navigation,
  Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid, 
  PieChart, 
  Pie, 
  Cell,
  Legend 
} from 'recharts';
import { formatCurrency } from '@/utils/formatters';
import { toast } from 'sonner';
import { startOfWeek, endOfWeek, eachDayOfInterval, format, subWeeks, isWithinInterval } from 'date-fns';
import { arSA } from 'date-fns/locale';

const COLORS = ['#4F8EF7', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4'];

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border/50 bg-background/95 backdrop-blur-md p-3 shadow-2xl text-xs font-medium z-50">
      <p className="text-muted-foreground mb-2 pb-2 border-b border-border/50 uppercase tracking-wider text-[10px]">{label}</p>
      <div className="space-y-2">
        {payload.map((entry: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full shadow-sm" style={{ background: entry.color || entry.fill || entry.payload?.fill }} />
              <span className="text-muted-foreground">{entry.name}</span>
            </div>
            <span className="font-mono-nums font-semibold text-foreground tracking-tight">
              {entry.value}{entry.dataKey === 'rate' ? '%' : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const ReportsPage: React.FC = () => {
  const { t } = useTheme();

  const { data: shipments = [], isLoading: shipmentsLoading } = useQuery({
    queryKey: ['shipments'],
    queryFn: api.shipments.getAll
  });

  const { data: couriers = [], isLoading: couriersLoading } = useQuery({
    queryKey: ['couriers'],
    queryFn: api.couriers.getAll
  });

  // Calculate Governorates Data
  const governorateData = useMemo(() => {
    const counts: Record<string, number> = {};
    shipments.forEach(s => {
      counts[s.governorate] = (counts[s.governorate] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [shipments]);

  // Calculate Weekly Growth Data
  const weeklyGrowthData = useMemo(() => {
    const weeks = [3, 2, 1, 0].map(weekOffset => {
      const start = startOfWeek(subWeeks(new Date(), weekOffset));
      const end = endOfWeek(subWeeks(new Date(), weekOffset));
      const count = shipments.filter(s => {
        const d = new Date(s.createdAt);
        return isWithinInterval(d, { start, end });
      }).length;
      return {
        name: `الأسبوع ${4 - weekOffset}`,
        count
      };
    });
    return weeks;
  }, [shipments]);

  // Top Performing Couriers
  const topCouriersData = useMemo(() => {
    return couriers.map(c => {
      const cs = shipments.filter(s => s.courierId === c.id);
      const del = cs.filter(s => s.status === 'delivered').length;
      return { 
        name: c.name, 
        delivered: del,
        rate: cs.length > 0 ? Math.round((del / cs.length) * 100) : 0 
      };
    }).sort((a, b) => b.delivered - a.delivered).slice(0, 5);
  }, [couriers, shipments]);

  const financialStats = useMemo(() => ({
    companyProfit: shipments.filter(s => s.status === 'delivered').reduce((sum, s) => sum + (s.shippingFee || 0), 0),
    sellersProfit: shipments.filter(s => s.status === 'delivered').reduce((sum, s) => sum + s.price, 0),
    totalVolume: shipments.filter(s => s.status === 'delivered').reduce((sum, s) => sum + s.price + (s.shippingFee || 0), 0),
  }), [shipments]);

  const exportCSV = () => {
    const headers = ['Tracking,Customer,City,Governorate,Price,Status,Date'];
    const rows = shipments.map(s => {
      return `${s.trackingId},${s.customerName},${s.city},${s.governorate},${s.price},${s.status},${s.createdAt}`;
    });
    const csv = [...headers, ...rows].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `elmona-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t.exportCSV);
  };

  if (shipmentsLoading || couriersLoading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">جاري تحميل التقارير...</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in pb-10" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black">{t.reports}</h2>
          <p className="text-muted-foreground text-sm">تحليل شامل لأداء الشحن والنمو الإحصائي</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl border-primary/20 hover:bg-primary/5" onClick={exportCSV}>
            <Download className="w-4 h-4 me-2 text-primary" />
            {t.exportCSV}
          </Button>
        </div>
      </div>

      {shipments.length === 0 ? (
        <EmptyState title={t.noDataYet} />
      ) : (
        <>
          {/* Financial Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="admin-card p-6 border-none bg-emerald-500/10 relative overflow-hidden group">
              <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all" />
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-600 shadow-sm shadow-emerald-500/20">
                  <CircleDollarSign className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-emerald-700 font-bold">أرباح شركة الشحن</p>
                  <p className="text-2xl font-black text-emerald-600 font-mono-nums">{formatCurrency(financialStats.companyProfit)} ج</p>
                </div>
              </div>
            </div>

            <div className="admin-card p-6 border-none bg-blue-500/10 relative overflow-hidden group">
              <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all" />
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/20 rounded-2xl text-blue-600 shadow-sm shadow-blue-500/20">
                  <Wallet className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-blue-700 font-bold">إجمالي أرباح المتاجر</p>
                  <p className="text-2xl font-black text-blue-600 font-mono-nums">{formatCurrency(financialStats.sellersProfit)} ج</p>
                </div>
              </div>
            </div>

            <div className="admin-card p-6 border-none bg-primary/10 relative overflow-hidden group">
              <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all" />
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/20 rounded-2xl text-primary shadow-sm shadow-primary/20">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-primary-700 font-bold">حجم التداول الكلي</p>
                  <p className="text-2xl font-black text-primary font-mono-nums">{formatCurrency(financialStats.totalVolume)} ج</p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Weekly Growth Chart */}
            <div className="admin-card p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  {t.weeklyGrowth}
                </h3>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weeklyGrowthData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4F8EF7" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#4F8EF7" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="count" name="عدد الشحنات" stroke="#4F8EF7" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Governorates Chart */}
            <div className="admin-card p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-fuchsia-500" />
                  {t.topGovernorates}
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={governorateData}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {governorateData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3">
                  {governorateData.map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between group">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="text-sm font-medium">{item.name}</span>
                      </div>
                      <span className="text-xs font-mono-nums font-bold bg-muted px-2 py-1 rounded-lg group-hover:bg-primary group-hover:text-white transition-colors">{item.value} شحنة</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Row - Couriers */}
          <div className="grid grid-cols-1 gap-6">
            <div className="admin-card p-6">
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Navigation className="w-5 h-5 text-emerald-500" />
                  {t.fastestCouriers}
                </h3>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topCouriersData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 'bold' }} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'transparent' }} />
                    <Bar dataKey="delivered" name="تم تسليمه" radius={[0, 8, 8, 0]} maxBarSize={30}>
                      {topCouriersData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} opacity={0.8} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ReportsPage;
