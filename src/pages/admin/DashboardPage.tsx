import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/db';
import type { Shipment, Courier } from '@/db/schema';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { Package, Calendar, Truck, CheckCircle, XCircle, Wallet, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { formatCurrency, formatDate, isToday } from '@/utils/formatters';

const COLORS = ['hsl(38,92%,50%)', 'hsl(199,89%,48%)', 'hsl(239,84%,67%)', 'hsl(160,84%,39%)', 'hsl(0,84%,60%)', 'hsl(215,16%,47%)'];

const DashboardPage: React.FC = () => {
  const { t, lang } = useTheme();
  const navigate = useNavigate();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);

  useEffect(() => {
    setShipments(db.getAll<Shipment>('shipments'));
    setCouriers(db.getAll<Courier>('couriers'));
  }, []);

  const todayShipments = shipments.filter(s => isToday(s.createdAt));
  const onWay = shipments.filter(s => s.status === 'out_for_delivery');
  const deliveredAll = shipments.filter(s => s.status === 'delivered');
  const retCan = shipments.filter(s => s.status === 'returned' || s.status === 'cancelled');
  const pendingCod = shipments.filter(s => s.paymentType === 'COD' && !s.codCollected && s.status !== 'cancelled');
  const codAmount = pendingCod.reduce((s, sh) => s + sh.price, 0);

  const kpis = [
    { icon: Package, label: t.totalShipments, value: shipments.length, color: 'text-primary bg-primary/10' },
    { icon: Calendar, label: t.todayShipments, value: todayShipments.length, color: 'text-accent bg-accent/10' },
    { icon: Truck, label: t.onTheWay, value: onWay.length, color: 'text-warning bg-warning/10', pulse: true },
    { icon: CheckCircle, label: t.delivered, value: deliveredAll.length, color: 'text-success bg-success/10' },
    { icon: XCircle, label: t.returnedCancelled, value: retCan.length, color: 'text-destructive bg-destructive/10' },
    { icon: Wallet, label: t.pendingCOD, value: `${formatCurrency(codAmount)} ${t.egp}`, color: 'text-primary bg-primary/10' },
  ];

  // Status distribution
  const statusData = [
    { name: t.pending, value: shipments.filter(s => s.status === 'pending').length },
    { name: t.assigned, value: shipments.filter(s => s.status === 'assigned').length },
    { name: t.out_for_delivery, value: shipments.filter(s => s.status === 'out_for_delivery').length },
    { name: t.delivered, value: shipments.filter(s => s.status === 'delivered').length },
    { name: t.returned, value: shipments.filter(s => s.status === 'returned').length },
    { name: t.cancelled, value: shipments.filter(s => s.status === 'cancelled').length },
  ].filter(d => d.value > 0);

  const latest = [...shipments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((kpi, i) => (
          <div key={i} className="admin-card p-4" style={{ animationDelay: `${i * 80}ms` }}>
            <div className={`w-10 h-10 rounded-xl ${kpi.color} flex items-center justify-center mb-3`}>
              <kpi.icon className="w-5 h-5" />
              {kpi.pulse && <span className="absolute w-2 h-2 rounded-full bg-warning status-pulse" />}
            </div>
            <p className="text-2xl font-bold font-mono-nums animate-count-up">{kpi.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      {shipments.length === 0 && (
        <div className="admin-card p-8 text-center">
          <p className="text-muted-foreground mb-4">{t.startAddingShipments}</p>
          <Button onClick={() => navigate('/shipments/create')}>
            <Plus className="w-4 h-4 me-2" /> {t.addFirstShipment}
          </Button>
        </div>
      )}

      {/* Charts */}
      {shipments.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="admin-card p-6 lg:col-span-3">
            <h3 className="text-sm font-semibold mb-4">{t.shipmentsLast30}</h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={[]}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="created" stroke="hsl(239,84%,67%)" fill="hsl(239,84%,67%)" fillOpacity={0.1} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="admin-card p-6 lg:col-span-2">
            <h3 className="text-sm font-semibold mb-4">{t.statusDistribution}</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name }) => name}>
                  {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Latest Shipments */}
      <div className="admin-card">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold text-sm">{t.latestShipments}</h3>
          {shipments.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => navigate('/shipments')}>{t.view}</Button>
          )}
        </div>
        {latest.length === 0 ? (
          <EmptyState title={t.noShipments} description={t.startAddingShipments} actionLabel={t.addFirstShipment} onAction={() => navigate('/shipments/create')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="p-3 text-start font-medium">{t.tracking}</th>
                  <th className="p-3 text-start font-medium">{t.customer}</th>
                  <th className="p-3 text-start font-medium">{t.city}</th>
                  <th className="p-3 text-start font-medium">{t.status}</th>
                  <th className="p-3 text-start font-medium">{t.date}</th>
                </tr>
              </thead>
              <tbody>
                {latest.map(s => (
                  <tr key={s.id} className="border-b hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => navigate(`/shipments/${s.id}`)}>
                    <td className="p-3 font-mono-nums text-xs">{s.trackingId}</td>
                    <td className="p-3">{s.customerName}</td>
                    <td className="p-3">{s.city}</td>
                    <td className="p-3"><StatusBadge status={s.status} /></td>
                    <td className="p-3 text-muted-foreground text-xs">{formatDate(s.createdAt, lang)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Couriers Summary */}
      <div className="admin-card">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-sm">{t.couriersSummary}</h3>
        </div>
        {couriers.length === 0 ? (
          <EmptyState title={t.addFirstCourier} actionLabel={t.addCourier} onAction={() => navigate('/couriers')} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {couriers.map(c => {
              const cShipments = shipments.filter(s => s.courierId === c.id);
              const del = cShipments.filter(s => s.status === 'delivered').length;
              const rate = cShipments.length > 0 ? Math.round((del / cShipments.length) * 100) : 0;
              return (
                <div key={c.id} className="p-4 border rounded-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                      {c.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.zone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-success rounded-full" style={{ width: `${rate}%` }} />
                    </div>
                    <span className="text-xs font-mono-nums">{rate}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
