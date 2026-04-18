import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { Package, Truck, CheckCircle, Wallet, Phone, MapPin, Loader2 } from 'lucide-react';
import { formatCurrency, isToday } from '@/utils/formatters';
import { motion } from 'framer-motion';
import { cardVariants, pageVariants } from '@/animations/variants';
import CountUp from 'react-countup';

const CourierHomePage: React.FC = () => {
  const { user, courierProfile } = useAuth();
  const { t } = useTheme();
  const navigate = useNavigate();

  const { data: shipments = [], isLoading } = useQuery({
    queryKey: ['shipments', 'courier', courierProfile?.id],
    queryFn: () => courierProfile ? api.shipments.getByCourierId(courierProfile.id) : Promise.resolve([]),
    enabled: !!courierProfile
  });

  const todayShips = shipments.filter(s => isToday(s.createdAt) || ['assigned', 'out_for_delivery'].includes(s.status));
  const assigned = todayShips.filter(s => s.status === 'assigned').length;
  const onWay = todayShips.filter(s => s.status === 'out_for_delivery').length;
  const deliveredToday = shipments.filter(s => s.status === 'delivered' && s.deliveredAt && isToday(s.deliveredAt)).length;
  const pendingCod = shipments.filter(s => s.paymentType === 'COD' && !s.codCollected && s.status === 'delivered').reduce((s, sh) => s + sh.price + (sh.shippingFee || 0), 0);

  const kpis = [
    { icon: Package, label: t.todayAssigned, value: assigned, color: '#A78BFA' },
    { icon: Truck, label: t.todayOnWay, value: onWay, color: '#F59E0B' },
    { icon: CheckCircle, label: t.todayDelivered, value: deliveredToday, color: '#10B981' },
    { icon: Wallet, label: t.todayCOD, value: pendingCod, color: '#06B6D4', isAmount: true },
  ];

  const activeShipments = shipments.filter(s => ['assigned', 'out_for_delivery'].includes(s.status));

  if (isLoading) {
    return (
        <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-muted-foreground animate-pulse">جاري تحميل يوميتك...</p>
        </div>
    );
  }

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="space-y-4" dir="rtl">
      <h2 className="text-lg font-bold text-right">{t.yourDay} {user?.name} 📦</h2>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpis.map((kpi, i) => (
          <motion.div key={i} custom={i} variants={cardVariants} initial="initial" animate="animate"
            className="courier-card p-4 relative overflow-hidden text-right">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2"
              style={{ background: `${kpi.color}15` }}>
              <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
            </div>
            <p className="text-xl font-bold font-mono-nums">
              {(kpi as any).isAmount
                ? <><CountUp end={kpi.value} duration={1.2} separator="," /> <span className="text-[10px]">{t.egp}</span></>
                : <CountUp end={kpi.value} duration={0.8} />
              }
            </p>
            <p className="text-[11px] text-muted-foreground">{kpi.label}</p>
          </motion.div>
        ))}
      </div>

      <h3 className="font-semibold text-sm mt-4 text-right">{t.todayShipmentsList}</h3>
      {activeShipments.length === 0 ? (
        <EmptyState title={t.noShipments} />
      ) : (
        <div className="space-y-3">
          {activeShipments.map((s, i) => (
            <motion.div key={s.id} custom={i} variants={cardVariants} initial="initial" animate="animate"
              whileTap={{ scale: 0.98 }}
              className="courier-card overflow-hidden cursor-pointer"
              onClick={() => navigate(`/courier/shipments/${s.id}`)}>
              <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b">
                <span className="font-mono-nums text-xs text-muted-foreground">{s.trackingId}</span>
                <StatusBadge status={s.status} />
              </div>
              <div className="p-4 space-y-3 text-right">
                <p className="font-semibold">{s.customerName}</p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground justify-end">
                  {s.city} — {s.address} <MapPin className="w-3 h-3" style={{ color: 'hsl(var(--primary))' }} />
                </div>
                <div className="flex items-center justify-between flex-row-reverse">
                  <span className="font-mono-nums font-bold">{formatCurrency(s.price + (s.shippingFee || 0))} {t.egp}</span>
                  <span className="text-xs px-2 py-0.5 rounded-lg"
                    style={s.paymentType === 'COD'
                      ? { background: 'rgba(245,158,11,0.1)', color: '#F59E0B' }
                      : { background: 'rgba(16,185,129,0.1)', color: '#10B981' }}>
                    {s.paymentType === 'COD' ? '💵 COD' : '✓ ' + t.paid}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <motion.a whileTap={{ scale: 0.95 }} href={`tel:${s.customerPhone}`}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium"
                    onClick={e => e.stopPropagation()}>
                    <Phone className="w-4 h-4" /> {t.call}
                  </motion.a>
                  <motion.button whileTap={{ scale: 0.95 }}
                    onClick={e => { e.stopPropagation(); navigate(`/courier/shipments/${s.id}`); }}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-primary-foreground bg-primary">
                    <CheckCircle className="w-4 h-4" /> {t.deliver}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default CourierHomePage;
