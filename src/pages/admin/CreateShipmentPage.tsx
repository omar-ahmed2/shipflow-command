import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/db';
import { generateId, generateTrackingId, now } from '@/db/helpers';
import type { Shipment, Courier, ShipmentEvent, Notification } from '@/db/schema';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const GOVERNORATES = ['القاهرة', 'الجيزة', 'الإسكندرية', 'الشرقية', 'الدقهلية', 'البحيرة', 'المنوفية', 'الغربية', 'كفر الشيخ', 'القليوبية', 'بني سويف', 'الفيوم', 'المنيا', 'أسيوط', 'سوهاج', 'قنا', 'الأقصر', 'أسوان', 'البحر الأحمر', 'الوادي الجديد', 'مطروح', 'شمال سيناء', 'جنوب سيناء', 'بورسعيد', 'السويس', 'الإسماعيلية', 'دمياط'];

const CreateShipmentPage: React.FC = () => {
  const { t } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    customerName: '', customerPhone: '', address: '', governorate: '', city: '',
    price: '', paymentType: 'COD' as 'COD' | 'paid', courierId: '', notes: ''
  });

  const couriers = useMemo(() => db.getAll<Courier>('couriers').filter(c => c.status === 'active'), []);

  const update = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerName || !form.customerPhone || !form.address || !form.governorate || !form.city || !form.price) return;

    setLoading(true);
    await new Promise(r => setTimeout(r, 600));

    const trackingId = generateTrackingId();
    const shipmentId = generateId('SHP');
    const status = form.courierId ? 'assigned' : 'pending';

    const shipment: Shipment = {
      id: shipmentId, trackingId,
      customerName: form.customerName, customerPhone: form.customerPhone,
      address: form.address, city: form.city, governorate: form.governorate,
      price: Number(form.price), paymentType: form.paymentType, codCollected: false,
      status, courierId: form.courierId || null, createdBy: user?.id || '',
      notes: form.notes, createdAt: now(), updatedAt: now(),
    };

    db.create<Shipment>('shipments', shipment, 'SHP');

    // Event
    db.create<ShipmentEvent>('shipmentEvents', {
      id: generateId('EVT'), shipmentId, status, actor: user?.name || '', actorRole: 'admin', timestamp: now(),
    } as ShipmentEvent, 'EVT');

    // Notification for courier
    if (form.courierId) {
      const courier = db.getById<Courier>('couriers', form.courierId);
      if (courier) {
        db.create<Notification>('notifications', {
          id: generateId('NTF'), targetRole: 'courier', targetUserId: courier.userId,
          type: 'info', title: t.newShipment, message: `${trackingId} — ${form.customerName}`,
          read: false, link: `/courier/shipments`, createdAt: now(),
        } as Notification, 'NTF');
      }
    }

    setLoading(false);
    toast.success(t.shipmentCreated);
    navigate('/shipments');
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <h2 className="text-xl font-bold mb-6">{t.createShipment}</h2>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Customer Info */}
          <div className="admin-card p-6 space-y-4">
            <h3 className="font-semibold text-sm mb-2">{t.customerInfo}</h3>
            <div>
              <Label>{t.customerName} *</Label>
              <Input value={form.customerName} onChange={e => update('customerName', e.target.value)} className="rounded-xl mt-1" required />
            </div>
            <div>
              <Label>{t.customerPhone} *</Label>
              <Input value={form.customerPhone} onChange={e => update('customerPhone', e.target.value)} placeholder="01XXXXXXXXX" className="rounded-xl mt-1 font-mono-nums" required />
            </div>
            <div>
              <Label>{t.address} *</Label>
              <Textarea value={form.address} onChange={e => update('address', e.target.value)} className="rounded-xl mt-1" required />
            </div>
            <div>
              <Label>{t.governorate} *</Label>
              <Select value={form.governorate} onValueChange={v => update('governorate', v)}>
                <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GOVERNORATES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t.city} *</Label>
              <Input value={form.city} onChange={e => update('city', e.target.value)} className="rounded-xl mt-1" required />
            </div>
          </div>

          {/* Shipment Info */}
          <div className="admin-card p-6 space-y-4">
            <h3 className="font-semibold text-sm mb-2">{t.shipmentInfo}</h3>
            <div>
              <Label>{t.price} * ({t.egp})</Label>
              <Input type="number" value={form.price} onChange={e => update('price', e.target.value)} className="rounded-xl mt-1 font-mono-nums" required min={0} />
            </div>
            <div>
              <Label>{t.paymentType} *</Label>
              <RadioGroup value={form.paymentType} onValueChange={v => update('paymentType', v)} className="flex gap-4 mt-2">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="COD" id="cod" />
                  <Label htmlFor="cod">{t.cod}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="paid" id="paid" />
                  <Label htmlFor="paid">{t.paid}</Label>
                </div>
              </RadioGroup>
            </div>
            <div>
              <Label>{t.assignCourier}</Label>
              <Select value={form.courierId} onValueChange={v => update('courierId', v)}>
                <SelectTrigger className="rounded-xl mt-1"><SelectValue placeholder={t.noAssignment} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t.noAssignment}</SelectItem>
                  {couriers.map(c => <SelectItem key={c.id} value={c.id}>{c.name} — {c.zone}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t.notes}</Label>
              <Textarea value={form.notes} onChange={e => update('notes', e.target.value)} className="rounded-xl mt-1" />
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button type="submit" disabled={loading} className="rounded-xl px-8 h-11">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t.createButton}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateShipmentPage;
