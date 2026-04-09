import React, { useState, useMemo } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { db } from '@/db';
import type { Shipment, Courier } from '@/db/schema';
import { EmptyState } from '@/components/shared/EmptyState';
import { Wallet, CheckCircle, Clock, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/utils/formatters';
import { toast } from 'sonner';

const PaymentsPage: React.FC = () => {
  const { t } = useTheme();
  const [refresh, setRefresh] = useState(0);

  const shipments = useMemo(() => db.getAll<Shipment>('shipments'), [refresh]);
  const couriers = useMemo(() => db.getAll<Courier>('couriers'), [refresh]);
  const codShipments = shipments.filter(s => s.paymentType === 'COD' && s.status !== 'cancelled');

  const totalExpected = codShipments.reduce((s, sh) => s + sh.price, 0);
  const totalCollected = codShipments.filter(s => s.codCollected).reduce((s, sh) => s + sh.price, 0);
  const pending = totalExpected - totalCollected;

  const codByCourier = couriers.map(c => ({
    name: c.name,
    collected: codShipments.filter(s => s.courierId === c.id && s.codCollected).reduce((sum, s) => sum + s.price, 0),
    pending: codShipments.filter(s => s.courierId === c.id && !s.codCollected).reduce((sum, s) => sum + s.price, 0),
  })).filter(c => c.collected > 0 || c.pending > 0);

  const markCollected = (id: string) => {
    db.update('shipments', id, { codCollected: true });
    setRefresh(r => r + 1);
    toast.success(t.collectionConfirmed);
  };

  const kpis = [
    { icon: Wallet, label: t.totalCODExpected, value: formatCurrency(totalExpected), color: 'text-primary bg-primary/10' },
    { icon: CheckCircle, label: t.totalCollected, value: formatCurrency(totalCollected), color: 'text-success bg-success/10' },
    { icon: Clock, label: t.pendingCollection, value: formatCurrency(pending), color: 'text-warning bg-warning/10' },
    { icon: Package, label: t.codShipments, value: codShipments.length, color: 'text-accent bg-accent/10' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-xl font-bold">{t.payments}</h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <div key={i} className="admin-card p-4">
            <div className={`w-10 h-10 rounded-xl ${kpi.color} flex items-center justify-center mb-3`}>
              <kpi.icon className="w-5 h-5" />
            </div>
            <p className="text-xl font-bold font-mono-nums">{kpi.value} {typeof kpi.value === 'string' ? t.egp : ''}</p>
            <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      {codByCourier.length > 0 && (
        <div className="admin-card p-6">
          <h3 className="font-semibold text-sm mb-4">{t.codByCourier}</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={codByCourier}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="collected" fill="hsl(160,84%,39%)" radius={[4, 4, 0, 0]} name={t.collected} />
              <Bar dataKey="pending" fill="hsl(38,92%,50%)" radius={[4, 4, 0, 0]} name={t.pendingCollection} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="admin-card">
        <div className="p-4 border-b font-semibold text-sm">{t.codShipments}</div>
        {codShipments.length === 0 ? (
          <EmptyState title={t.noDataYet} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/30">
                <th className="p-3 text-start font-medium">{t.tracking}</th>
                <th className="p-3 text-start font-medium">{t.customer}</th>
                <th className="p-3 text-start font-medium">{t.price}</th>
                <th className="p-3 text-start font-medium">{t.courier}</th>
                <th className="p-3 text-start font-medium">{t.collectionStatus}</th>
                <th className="p-3 text-start font-medium">{t.actions}</th>
              </tr></thead>
              <tbody>{codShipments.map(s => (
                <tr key={s.id} className="border-b hover:bg-muted/30">
                  <td className="p-3 font-mono-nums text-xs">{s.trackingId}</td>
                  <td className="p-3">{s.customerName}</td>
                  <td className="p-3 font-mono-nums">{formatCurrency(s.price)} {t.egp}</td>
                  <td className="p-3">{couriers.find(c => c.id === s.courierId)?.name || '—'}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${s.codCollected ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                      {s.codCollected ? t.collected : t.notCollected}
                    </span>
                  </td>
                  <td className="p-3">
                    {!s.codCollected && s.status === 'delivered' && (
                      <Button size="sm" variant="ghost" onClick={() => markCollected(s.id)}>{t.markCollected}</Button>
                    )}
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentsPage;
