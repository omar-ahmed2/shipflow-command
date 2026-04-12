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
import { motion } from 'framer-motion';
import { cardVariants, pageVariants } from '@/animations/variants';
import CountUp from 'react-countup';

const PaymentsPage: React.FC = () => {
  const { t } = useTheme();
  const [refresh, setRefresh] = useState(0);

  const shipments = useMemo(() => db.getAll<Shipment>('shipments'), [refresh]);
  const couriers = useMemo(() => db.getAll<Courier>('couriers'), [refresh]);
  const codShipments = shipments.filter(s => s.paymentType === 'COD' && s.status !== 'cancelled');

  const totalExpected = codShipments.reduce((s, sh) => s + sh.price + (sh.shippingFee || 0), 0);
  const totalCollected = codShipments.filter(s => s.codCollected).reduce((s, sh) => s + sh.price + (sh.shippingFee || 0), 0);
  const pending = totalExpected - totalCollected;
  const collectionPercent = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

  const codByCourier = couriers.map(c => ({
    name: c.name,
    collected: codShipments.filter(s => s.courierId === c.id && s.codCollected).reduce((sum, s) => sum + s.price + (s.shippingFee || 0), 0),
    pending: codShipments.filter(s => s.courierId === c.id && !s.codCollected).reduce((sum, s) => sum + s.price + (s.shippingFee || 0), 0),
  })).filter(c => c.collected > 0 || c.pending > 0);

  const markCollected = (id: string) => {
    db.update('shipments', id, { codCollected: true });
    setRefresh(r => r + 1);
    toast.success(t.collectionConfirmed);
  };

  const kpis = [
    { icon: Wallet, label: t.totalCODExpected, value: totalExpected, color: '#4F8EF7' },
    { icon: CheckCircle, label: t.totalCollected, value: totalCollected, color: '#10B981' },
    { icon: Clock, label: t.pendingCollection, value: pending, color: '#F59E0B' },
    { icon: Package, label: t.codShipments, value: codShipments.length, color: '#A78BFA', isCount: true },
  ];

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="space-y-6">
      <h2 className="text-xl font-bold">{t.payments}</h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div key={i} custom={i} variants={cardVariants} initial="initial" animate="animate"
            className="admin-card p-5 relative overflow-hidden">
            <div className="w-10 h-10 rounded-xl mb-3 flex items-center justify-center"
              style={{ background: `${kpi.color}15` }}>
              <kpi.icon className="w-5 h-5" style={{ color: kpi.color }} />
            </div>
            <div className="text-2xl font-bold font-mono-nums">
              {(kpi as any).isCount
                ? <CountUp end={kpi.value} duration={1} />
                : <><CountUp end={kpi.value} duration={1.5} separator="," /> <span className="text-sm">{t.egp}</span></>
              }
            </div>
            <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
            <div className="absolute bottom-0 start-0 end-0 h-px"
              style={{ background: `linear-gradient(90deg, ${kpi.color}50, transparent)` }} />
          </motion.div>
        ))}
      </div>

      {/* Collection Progress */}
      {totalExpected > 0 && (
        <div className="admin-card p-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-sm">{t.collectionRate}</h3>
            <span className="text-2xl font-bold font-mono-nums" style={{ color: '#10B981' }}>
              {collectionPercent}%
            </span>
          </div>
          <div className="h-3 rounded-full overflow-hidden bg-muted">
            <motion.div className="h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${collectionPercent}%` }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              style={{ background: 'linear-gradient(90deg, #10B981, #34D399)' }} />
          </div>
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>{t.collectedAmount} {formatCurrency(totalCollected)} {t.egp}</span>
            <span>{t.pendingAmount} {formatCurrency(pending)} {t.egp}</span>
          </div>
        </div>
      )}

      {codByCourier.length > 0 && (
        <div className="admin-card p-6">
          <h3 className="font-semibold text-sm mb-4">{t.codByCourier}</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={codByCourier}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="collected" fill="#10B981" radius={[4, 4, 0, 0]} name={t.collected} />
              <Bar dataKey="pending" fill="#F59E0B" radius={[4, 4, 0, 0]} name={t.pendingCollection} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="admin-card">
        <div className="p-4 border-b font-semibold text-sm">{t.codShipments}</div>
        {codShipments.length === 0 ? (
          <EmptyState title={t.noDataYet} />
        ) : (
          <div className="overflow-auto max-h-[600px]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-card"><tr className="border-b">
                <th className="p-3 text-start font-medium">{t.tracking}</th>
                <th className="p-3 text-start font-medium">{t.customer}</th>
                <th className="p-3 text-start font-medium">{t.price}</th>
                <th className="p-3 text-start font-medium">{t.courier}</th>
                <th className="p-3 text-start font-medium">{t.collectionStatus}</th>
                <th className="p-3 text-start font-medium">{t.actions}</th>
              </tr></thead>
              <tbody>{codShipments.map(s => (
                <tr key={s.id} className="border-b hover:bg-primary/[0.03] transition-colors">
                  <td className="p-3 font-mono-nums text-xs">{s.trackingId}</td>
                  <td className="p-3">{s.customerName}</td>
                  <td className="p-3 font-mono-nums">{formatCurrency(s.price + (s.shippingFee || 0))} {t.egp}</td>
                  <td className="p-3">{couriers.find(c => c.id === s.courierId)?.name || '—'}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                      style={s.codCollected
                        ? { background: 'rgba(16,185,129,0.1)', color: '#10B981' }
                        : { background: 'rgba(245,158,11,0.1)', color: '#F59E0B' }}>
                      {s.codCollected ? t.collected : t.notCollected}
                    </span>
                  </td>
                  <td className="p-3">
                    {!s.codCollected && s.status === 'delivered' && (
                      <motion.div whileTap={{ scale: 0.95 }}>
                        <Button size="sm" variant="ghost" onClick={() => markCollected(s.id)}>{t.markCollected}</Button>
                      </motion.div>
                    )}
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default PaymentsPage;
