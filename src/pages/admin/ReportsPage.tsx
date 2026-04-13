import React, { useMemo, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { db } from '@/db';
import type { Shipment, Courier } from '@/db/schema';
import { EmptyState } from '@/components/shared/EmptyState';
import { Download, FileText, CircleDollarSign, TrendingUp, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ComposedChart, Line } from 'recharts';
import { formatCurrency } from '@/utils/formatters';
import { toast } from 'sonner';

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
  const [period, setPeriod] = useState('monthly');

  const shipments = useMemo(() => db.getAll<Shipment>('shipments'), []);
  const couriers = useMemo(() => db.getAll<Courier>('couriers'), []);

  const exportCSV = () => {
    const headers = ['Tracking,Customer,City,Price,Status,Courier,Date'];
    const rows = shipments.map(s => {
      const cn = couriers.find(c => c.id === s.courierId)?.name || '';
      return `${s.trackingId},${s.customerName},${s.city},${s.price},${s.status},${cn},${s.createdAt}`;
    });
    const csv = [...headers, ...rows].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t.exportCSV);
  };

  const exportPDF = async () => {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('ELMona Shipping Report', 14, 20);
    doc.setFontSize(10);
    doc.text(new Date().toLocaleDateString(), 14, 28);

    autoTable(doc, {
      startY: 35,
      head: [['Tracking', 'Customer', 'City', 'Price', 'Status', 'Courier']],
      body: shipments.map(s => [
        s.trackingId, s.customerName, s.city,
        `${s.price}`, s.status,
        couriers.find(c => c.id === s.courierId)?.name || '—'
      ]),
    });

    doc.save(`report-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success(t.exportPDF);
  };

  // Courier performance
  const courierPerf = couriers.map(c => {
    const cs = shipments.filter(s => s.courierId === c.id);
    const del = cs.filter(s => s.status === 'delivered').length;
    const ret = cs.filter(s => s.status === 'returned').length;
    return { name: c.name, delivered: del, returned: ret, total: cs.length, rate: cs.length > 0 ? Math.round((del / cs.length) * 100) : 0 };
  });

  const financialStats = {
    companyProfit: shipments.filter(s => s.status === 'delivered').reduce((sum, s) => sum + (s.shippingFee || 0), 0),
    sellersProfit: shipments.filter(s => s.status === 'delivered').reduce((sum, s) => sum + s.price, 0),
    totalVolume: shipments.filter(s => s.status === 'delivered').reduce((sum, s) => sum + s.price + (s.shippingFee || 0), 0),
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{t.reports}</h2>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl" onClick={exportCSV}><Download className="w-4 h-4 me-2" />{t.exportCSV}</Button>
          <Button variant="outline" className="rounded-xl" onClick={exportPDF}><FileText className="w-4 h-4 me-2" />{t.exportPDF}</Button>
        </div>
      </div>

      {shipments.length === 0 ? (
        <EmptyState title={t.noDataYet} />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="admin-card p-4 border-none bg-emerald-500/10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-600"><CircleDollarSign className="w-5 h-5" /></div>
                <div>
                  <p className="text-xs text-emerald-700 font-bold">أرباح شركة الشحن</p>
                  <p className="text-xl font-black text-emerald-600 font-mono-nums">{formatCurrency(financialStats.companyProfit)} ج</p>
                </div>
              </div>
            </div>
            <div className="admin-card p-4 border-none bg-blue-500/10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg text-blue-600"><Wallet className="w-5 h-5" /></div>
                <div>
                  <p className="text-xs text-blue-700 font-bold">إجمالي أرباح المتاجر</p>
                  <p className="text-xl font-black text-blue-600 font-mono-nums">{formatCurrency(financialStats.sellersProfit)} ج</p>
                </div>
              </div>
            </div>
            <div className="admin-card p-4 border-none bg-primary/10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-lg text-primary"><TrendingUp className="w-5 h-5" /></div>
                <div>
                  <p className="text-xs text-primary-700 font-bold">حجم التداول الكلي</p>
                  <p className="text-xl font-black text-primary font-mono-nums">{formatCurrency(financialStats.totalVolume)} ج</p>
                </div>
              </div>
            </div>
          </div>
          <Tabs value={period} onValueChange={setPeriod}>
            <TabsList className="rounded-xl">
              <TabsTrigger value="daily" className="rounded-lg">{t.daily}</TabsTrigger>
              <TabsTrigger value="weekly" className="rounded-lg">{t.weekly}</TabsTrigger>
              <TabsTrigger value="monthly" className="rounded-lg">{t.monthly}</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="admin-card p-6">
              <h3 className="font-semibold text-sm mb-6 flex items-center"><FileText className="w-4 h-4 me-2 text-primary" /> {t.deliveryVsReturn}</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={courierPerf} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorDelivered" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.2} />
                      </linearGradient>
                      <linearGradient id="colorReturned" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F87171" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#F87171" stopOpacity={0.2} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} dy={10} />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} dx={-10} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="delivered" fill="url(#colorDelivered)" radius={[4, 4, 0, 0]} name={t.delivered} maxBarSize={40} />
                    <Bar dataKey="returned" fill="url(#colorReturned)" radius={[4, 4, 0, 0]} name={t.returned} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="admin-card p-6">
              <h3 className="font-semibold text-sm mb-6 flex items-center"><FileText className="w-4 h-4 me-2 text-primary" /> {t.courierComparison}</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={courierPerf} layout="vertical" margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRate" x1="1" y1="0" x2="0" y2="0">
                        <stop offset="5%" stopColor="#4F8EF7" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#4F8EF7" stopOpacity={0.2} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" opacity={0.5} />
                    <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} domain={[0, 100]} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="rate" fill="url(#colorRate)" radius={[0, 4, 4, 0]} name={t.successRate} maxBarSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="admin-card">
            <div className="p-4 border-b font-semibold text-sm">{t.performance}</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/30">
                  <th className="p-3 text-start font-medium">{t.courier}</th>
                  <th className="p-3 text-start font-medium">{t.assignedShipments}</th>
                  <th className="p-3 text-start font-medium">{t.deliveredShipments}</th>
                  <th className="p-3 text-start font-medium">{t.returnedShipments}</th>
                  <th className="p-3 text-start font-medium">{t.successRate}</th>
                </tr></thead>
                <tbody>{courierPerf.map(c => (
                  <tr key={c.name} className="border-b hover:bg-muted/30">
                    <td className="p-3 font-medium">{c.name}</td>
                    <td className="p-3 font-mono-nums">{c.total}</td>
                    <td className="p-3 font-mono-nums text-success">{c.delivered}</td>
                    <td className="p-3 font-mono-nums text-destructive">{c.returned}</td>
                    <td className="p-3 font-mono-nums">{c.rate}%</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ReportsPage;
