import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { db } from '@/db';
import type { Shipment, Courier } from '@/db/schema';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { Package, Truck, CheckCircle, Wallet, Phone, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency, isToday } from '@/utils/formatters';

const CourierHomePage: React.FC = () => {
  const { user, courierProfile } = useAuth();
  const { t } = useTheme();
  const navigate = useNavigate();

  const shipments = useMemo(() => {
    if (!courierProfile) return [];
    return db.query<Shipment>('shipments', s => s.courierId === courierProfile.id);
  }, [courierProfile]);

  const todayShips = shipments.filter(s => isToday(s.createdAt) || ['assigned', 'out_for_delivery'].includes(s.status));
  const assigned = todayShips.filter(s => s.status === 'assigned').length;
  const onWay = todayShips.filter(s => s.status === 'out_for_delivery').length;
  const deliveredToday = shipments.filter(s => s.status === 'delivered' && s.deliveredAt && isToday(s.deliveredAt)).length;
  const pendingCod = shipments.filter(s => s.paymentType === 'COD' && !s.codCollected && s.status === 'delivered').reduce((s, sh) => s + sh.price, 0);

  const kpis = [
    { icon: Package, label: t.todayAssigned, value: assigned, color: 'text-primary bg-primary/10' },
    { icon: Truck, label: t.todayOnWay, value: onWay, color: 'text-warning bg-warning/10' },
    { icon: CheckCircle, label: t.todayDelivered, value: deliveredToday, color: 'text-success bg-success/10' },
    { icon: Wallet, label: t.todayCOD, value: `${formatCurrency(pendingCod)}`, color: 'text-accent bg-accent/10' },
  ];

  const activeShipments = shipments.filter(s => ['assigned', 'out_for_delivery'].includes(s.status));

  return (
    <div className="space-y-4 animate-slide-up">
      <h2 className="text-lg font-bold">{t.yourDay} {user?.name} 📦</h2>

      <div className="grid grid-cols-2 gap-3">
        {kpis.map((kpi, i) => (
          <div key={i} className="courier-card p-4">
            <div className={`w-9 h-9 rounded-xl ${kpi.color} flex items-center justify-center mb-2`}>
              <kpi.icon className="w-4 h-4" />
            </div>
            <p className="text-xl font-bold font-mono-nums">{kpi.value}</p>
            <p className="text-[11px] text-muted-foreground">{kpi.label}</p>
          </div>
        ))}
      </div>

      <h3 className="font-semibold text-sm mt-4">{t.todayShipmentsList}</h3>
      {activeShipments.length === 0 ? (
        <EmptyState title={t.noShipments} />
      ) : (
        <div className="space-y-3">
          {activeShipments.map(s => (
            <div key={s.id} className="courier-card p-4 space-y-3" onClick={() => navigate(`/courier/shipments/${s.id}`)}>
              <div className="flex items-center justify-between">
                <span className="font-mono-nums text-xs">{s.trackingId}</span>
                <StatusBadge status={s.status} />
              </div>
              <p className="font-medium">{s.customerName}</p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3" /> {s.city} — {s.address}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-mono-nums font-bold">{formatCurrency(s.price)} {t.egp}</span>
                <span className="text-xs">{s.paymentType === 'COD' ? t.cod : t.paid}</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="rounded-xl flex-1" onClick={(e) => { e.stopPropagation(); window.open(`tel:${s.customerPhone}`); }}>
                  <Phone className="w-3 h-3 me-1" /> {t.call}
                </Button>
                <Button size="sm" className="rounded-xl flex-1" onClick={(e) => { e.stopPropagation(); navigate(`/courier/shipments/${s.id}`); }}>
                  {t.update}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CourierHomePage;
