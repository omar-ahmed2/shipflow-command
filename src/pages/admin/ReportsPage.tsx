import React, { useMemo, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { db } from '@/db';
import type { Shipment, Courier } from '@/db/schema';
import { EmptyState } from '@/components/shared/EmptyState';
import { Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/utils/formatters';
import { toast } from 'sonner';

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
    doc.text('ShipFlow Report', 14, 20);
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
          <Tabs value={period} onValueChange={setPeriod}>
            <TabsList className="rounded-xl">
              <TabsTrigger value="daily" className="rounded-lg">{t.daily}</TabsTrigger>
              <TabsTrigger value="weekly" className="rounded-lg">{t.weekly}</TabsTrigger>
              <TabsTrigger value="monthly" className="rounded-lg">{t.monthly}</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="admin-card p-6">
              <h3 className="font-semibold text-sm mb-4">{t.deliveryVsReturn}</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={courierPerf}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="delivered" fill="hsl(160,84%,39%)" radius={[4, 4, 0, 0]} name={t.delivered} />
                  <Bar dataKey="returned" fill="hsl(0,84%,60%)" radius={[4, 4, 0, 0]} name={t.returned} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="admin-card p-6">
              <h3 className="font-semibold text-sm mb-4">{t.courierComparison}</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={courierPerf} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip />
                  <Bar dataKey="rate" fill="hsl(239,84%,67%)" radius={[0, 4, 4, 0]} name={t.successRate} />
                </BarChart>
              </ResponsiveContainer>
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
