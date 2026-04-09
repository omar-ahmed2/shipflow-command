import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { db } from '@/db';
import { generateId, now } from '@/db/helpers';
import type { Shipment, ShipmentEvent, ShipmentStatus, Notification } from '@/db/schema';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Phone, MapPin, ArrowLeft } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { formatDateTime, formatCurrency } from '@/utils/formatters';

const CourierShipmentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { t, lang } = useTheme();
  const navigate = useNavigate();
  const [refresh, setRefresh] = useState(0);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');
  const [note, setNote] = useState('');

  const shipment = useMemo(() => db.getById<Shipment>('shipments', id || ''), [id, refresh]);
  const events = useMemo(() =>
    db.query<ShipmentEvent>('shipmentEvents', e => e.shipmentId === id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [id, refresh]);

  if (!shipment) return <div className="p-8 text-center">{t.noResults}</div>;

  const handleUpdate = () => {
    if (!newStatus) return;
    const updates: Record<string, any> = { status: newStatus, updatedAt: now() };
    if (newStatus === 'delivered') updates.deliveredAt = now();
    db.update('shipments', shipment.id, updates);

    db.create<ShipmentEvent>('shipmentEvents', {
      id: generateId('EVT'), shipmentId: shipment.id, status: newStatus as ShipmentStatus,
      note: note || undefined, actor: user?.name || '', actorRole: 'courier', timestamp: now(),
    } as ShipmentEvent, 'EVT');

    // Notify admin
    db.create<Notification>('notifications', {
      id: generateId('NTF'), targetRole: 'admin', type: newStatus === 'delivered' ? 'success' : 'warning',
      title: t.statusUpdated, message: `${shipment.trackingId} → ${t[newStatus as keyof typeof t]}`,
      read: false, link: `/shipments/${shipment.id}`, createdAt: now(),
    } as Notification, 'NTF');

    toast.success(t.statusUpdated);
    setUpdateOpen(false);
    setNewStatus('');
    setNote('');
    setRefresh(r => r + 1);
  };

  return (
    <div className="space-y-4 animate-slide-up">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4 me-1" /> {t.myShipments}</Button>

      <div className="courier-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="font-mono-nums">{shipment.trackingId}</span>
          <StatusBadge status={shipment.status} />
        </div>
        <div className="space-y-2">
          <p className="font-semibold">{shipment.customerName}</p>
          <a href={`tel:${shipment.customerPhone}`} className="flex items-center gap-1 text-sm text-primary">
            <Phone className="w-3 h-3" /> {shipment.customerPhone}
          </a>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="w-3 h-3" /> {shipment.address}, {shipment.city}, {shipment.governorate}
          </div>
        </div>
        <div className="flex justify-between p-3 bg-muted/50 rounded-xl">
          <div><span className="text-xs text-muted-foreground">{t.price}</span><p className="font-bold font-mono-nums">{formatCurrency(shipment.price)} {t.egp}</p></div>
          <div><span className="text-xs text-muted-foreground">{t.payment}</span><p className="font-medium">{shipment.paymentType === 'COD' ? t.cod : t.paid}</p></div>
        </div>
        {['assigned', 'out_for_delivery'].includes(shipment.status) && (
          <Button className="w-full rounded-xl h-11" onClick={() => setUpdateOpen(true)}>{t.updateStatus}</Button>
        )}
      </div>

      {/* Timeline */}
      <div className="courier-card p-5">
        <h3 className="font-semibold text-sm mb-4">{t.timeline}</h3>
        <div className="space-y-3">
          {events.map((e, i) => (
            <div key={e.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={`w-2.5 h-2.5 rounded-full ${i === 0 ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                {i < events.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
              </div>
              <div className="pb-3">
                <StatusBadge status={e.status} />
                {e.note && <p className="text-xs text-muted-foreground mt-1">{e.note}</p>}
                <p className="text-[10px] text-muted-foreground mt-1">{formatDateTime(e.timestamp, lang)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Update Modal */}
      <Dialog open={updateOpen} onOpenChange={setUpdateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t.updateStatusTitle}</DialogTitle></DialogHeader>
          <RadioGroup value={newStatus} onValueChange={setNewStatus} className="space-y-2">
            <div className="flex items-center gap-2 p-3 rounded-xl border"><RadioGroupItem value="out_for_delivery" id="ofd" /><Label htmlFor="ofd">{t.out_for_delivery}</Label></div>
            <div className="flex items-center gap-2 p-3 rounded-xl border"><RadioGroupItem value="delivered" id="del" /><Label htmlFor="del">✓ {t.delivered}</Label></div>
            <div className="flex items-center gap-2 p-3 rounded-xl border"><RadioGroupItem value="returned" id="ret" /><Label htmlFor="ret">✗ {t.returned}</Label></div>
          </RadioGroup>
          <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder={t.addNote} className="rounded-xl" />
          <DialogFooter>
            <Button onClick={handleUpdate} disabled={!newStatus} className="rounded-xl w-full">{t.confirmUpdate}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CourierShipmentDetailPage;
