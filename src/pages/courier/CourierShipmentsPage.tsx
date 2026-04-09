import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { db } from '@/db';
import type { Shipment, ShipmentStatus } from '@/db/schema';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Phone, MapPin, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency, isToday, isThisWeek } from '@/utils/formatters';

const CourierShipmentsPage: React.FC = () => {
  const { courierProfile } = useAuth();
  const { t } = useTheme();
  const navigate = useNavigate();
  const [period, setPeriod] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const shipments = useMemo(() => {
    if (!courierProfile) return [];
    return db.query<Shipment>('shipments', s => s.courierId === courierProfile.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [courierProfile]);

  const filtered = shipments.filter(s => {
    if (period === 'today' && !isToday(s.createdAt) && !['assigned', 'out_for_delivery'].includes(s.status)) return false;
    if (period === 'week' && !isThisWeek(s.createdAt)) return false;
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (search && !s.customerName.toLowerCase().includes(search.toLowerCase()) && !s.customerPhone.includes(search)) return false;
    return true;
  });

  return (
    <div className="space-y-4 animate-slide-up">
      <h2 className="text-lg font-bold">{t.myShipments}</h2>
      <Tabs value={period} onValueChange={setPeriod}>
        <TabsList className="rounded-xl w-full">
          <TabsTrigger value="today" className="rounded-lg flex-1">{t.today}</TabsTrigger>
          <TabsTrigger value="week" className="rounded-lg flex-1">{t.thisWeek}</TabsTrigger>
          <TabsTrigger value="all" className="rounded-lg flex-1">{t.all}</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder={t.search} value={search} onChange={e => setSearch(e.target.value)} className="ps-9 rounded-xl" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32 rounded-xl"><SelectValue placeholder={t.allStatuses} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.allStatuses}</SelectItem>
            <SelectItem value="assigned">{t.assigned}</SelectItem>
            <SelectItem value="out_for_delivery">{t.out_for_delivery}</SelectItem>
            <SelectItem value="delivered">{t.delivered}</SelectItem>
            <SelectItem value="returned">{t.returned}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {filtered.length === 0 ? (
        <EmptyState title={t.noShipments} />
      ) : (
        <div className="space-y-3">
          {filtered.map(s => (
            <div key={s.id} className="courier-card p-4 space-y-2 cursor-pointer" onClick={() => navigate(`/courier/shipments/${s.id}`)}>
              <div className="flex items-center justify-between">
                <span className="font-mono-nums text-xs">{s.trackingId}</span>
                <StatusBadge status={s.status} />
              </div>
              <p className="font-medium">{s.customerName}</p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3" /> {s.city}
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono-nums font-bold text-sm">{formatCurrency(s.price)} {t.egp}</span>
                <Button size="sm" variant="outline" className="rounded-xl h-7" onClick={e => { e.stopPropagation(); window.open(`tel:${s.customerPhone}`); }}>
                  <Phone className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CourierShipmentsPage;
