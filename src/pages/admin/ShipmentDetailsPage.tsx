import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/db';
import { generateId, now } from '@/db/helpers';
import type { Shipment, ShipmentEvent, Courier, Notification, ShipmentStatus } from '@/db/schema';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowRight, Phone, MapPin, Calendar, Package } from 'lucide-react';
import { toast } from 'sonner';
import { formatDateTime, formatCurrency } from '@/utils/formatters';

const STATUSES: ShipmentStatus[] = ['pending', 'assigned', 'out_for_delivery', 'delivered', 'returned', 'cancelled'];

const ShipmentDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t, lang } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [refresh, setRefresh] = useState(0);
  const [newStatus, setNewStatus] = useState<string>('');
  const [note, setNote] = useState('');

  const shipment = useMemo(() => db.getById<Shipment>('shipments', id || ''), [id, refresh]);
  const events = useMemo(() =>
    db.query<ShipmentEvent>('shipmentEvents', e => e.shipmentId === id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [id, refresh]);
  const couriers = useMemo(() => db.getAll<Courier>('couriers'), []);

  if (!shipment) return <div className="p-8 text-center text-muted-foreground">Not found</div>;

  const courierName = shipment.courierId ? couriers.find(c => c.id === shipment.courierId)?.name || '—' : '—';

  const handleUpdateStatus = () => {
    if (!newStatus) return;
    const updates: Record<string, any> = { status: newStatus, updatedAt: now() };
    if (newStatus === 'delivered') updates.deliveredAt = now();
    db.update('shipments', shipment.id, updates);

    db.create<ShipmentEvent>('shipmentEvents', {
      id: generateId('EVT'), shipmentId: shipment.id, status: newStatus as ShipmentStatus,
      note: note || undefined, actor: user?.name || '', actorRole: 'admin', timestamp: now(),
    } as ShipmentEvent, 'EVT');

    toast.success(t.statusUpdated);
    setNewStatus('');
    setNote('');
    setRefresh(r => r + 1);
  };

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/shipments')}>← {t.shipments}</Button>
        <span className="text-muted-foreground">/</span>
        <span className="font-mono-nums text-sm">{shipment.trackingId}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left */}
        <div className="lg:col-span-3 space-y-4">
          {/* Customer Card */}
          <div className="admin-card p-6">
            <h3 className="font-semibold text-sm mb-4">{t.customerInfo}</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2"><Package className="w-4 h-4 text-muted-foreground" /><span>{shipment.customerName}</span></div>
              <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-muted-foreground" /><span className="font-mono-nums">{shipment.customerPhone}</span></div>
              <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-muted-foreground" /><span>{shipment.address}, {shipment.city}, {shipment.governorate}</span></div>
            </div>
          </div>

          {/* Shipment Card */}
          <div className="admin-card p-6">
            <h3 className="font-semibold text-sm mb-4">{t.shipmentInfo}</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">{t.price}</span><p className="font-mono-nums font-bold">{formatCurrency(shipment.price)} {t.egp}</p></div>
              <div><span className="text-muted-foreground">{t.payment}</span><p>{shipment.paymentType === 'COD' ? t.cod : t.paid}</p></div>
              <div><span className="text-muted-foreground">{t.status}</span><div className="mt-1"><StatusBadge status={shipment.status} /></div></div>
              <div><span className="text-muted-foreground">{t.courier}</span><p>{courierName}</p></div>
            </div>
          </div>

          {/* Update Status */}
          <div className="admin-card p-6">
            <h3 className="font-semibold text-sm mb-4">{t.updateStatus}</h3>
            <div className="space-y-3">
              <div>
                <Label>{t.newStatus}</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map(s => <SelectItem key={s} value={s}>{t[s]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t.addNote}</Label>
                <Textarea value={note} onChange={e => setNote(e.target.value)} className="rounded-xl mt-1" />
              </div>
              <Button onClick={handleUpdateStatus} disabled={!newStatus} className="rounded-xl">{t.saveUpdate}</Button>
            </div>
          </div>
        </div>

        {/* Right - Timeline */}
        <div className="lg:col-span-2">
          <div className="admin-card p-6">
            <h3 className="font-semibold text-sm mb-4">{t.timeline}</h3>
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.noDataYet}</p>
            ) : (
              <div className="space-y-4">
                {events.map((event, i) => (
                  <div key={event.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ${i === 0 ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                      {i < events.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                    </div>
                    <div className="pb-4">
                      <StatusBadge status={event.status} />
                      {event.note && <p className="text-xs text-muted-foreground mt-1">{event.note}</p>}
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                        <span>{event.actor}</span>
                        <span>•</span>
                        <span>{formatDateTime(event.timestamp, lang)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShipmentDetailsPage;
