import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { generateTrackingId, generateVerificationCode } from '@/db/helpers';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { pageVariants } from '@/animations/variants';

const GOVERNORATES = ['القاهرة', 'الجيزة', 'الإسكندرية', 'الشرقية', 'الدقهلية', 'البحيرة', 'المنوفية', 'الغربية', 'كفر الشيخ', 'القليوبية', 'بني سويف', 'الفيوم', 'المنيا', 'أسيوط', 'سوهاج', 'قنا', 'الأقصر', 'أسوان', 'البحر الأحمر', 'الوادي الجديد', 'مطروح', 'شمال سيناء', 'جنوب سيناء', 'بورسعيد', 'السويس', 'الإسماعيلية', 'دمياط'];

const CreateShipmentPage: React.FC = () => {
  const { t } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    customerName: '', customerPhone: '', address: '', governorate: '', city: '',
    price: '', shippingFee: '', paymentType: 'COD' as 'COD' | 'paid', courierId: '', sellerId: '', notes: ''
  });

  // Queries for selectors
  const { data: couriers = [] } = useQuery({
    queryKey: ['couriers'],
    queryFn: api.couriers.getAll
  });

  const { data: sellers = [] } = useQuery({
    queryKey: ['sellers'],
    queryFn: api.sellers.getAll
  });

  const activeCouriers = couriers.filter(c => c.status === 'active');
  const activeSellers = sellers.filter(s => s.status === 'active');

  const update = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerName || !form.customerPhone || !form.address || !form.governorate || !form.city || !form.price || !form.shippingFee) {
        toast.error('يرجى ملء جميع الحقول المطلوبة');
        return;
    }

    setIsSubmitting(true);
    
    try {
      const trackingId = generateTrackingId();
      const verificationCode = generateVerificationCode();
      const status = form.courierId && form.courierId !== 'none' ? 'assigned' : 'pending';

      const newShipment = await api.shipments.create({
        trackingId, 
        verificationCode,
        customerName: form.customerName, 
        customerPhone: form.customerPhone,
        address: form.address, 
        city: form.city, 
        governorate: form.governorate,
        price: Number(form.price), 
        shippingFee: Number(form.shippingFee), 
        paymentType: form.paymentType,
        status, 
        courierId: (form.courierId && form.courierId !== 'none') ? form.courierId : null,
        sellerId: (form.sellerId && form.sellerId !== 'none') ? form.sellerId : null,
        createdBy: user?.id || null,
        notes: form.notes
      });

      // Add timeline event
      await api.shipments.addEvent({
        shipmentId: newShipment.id,
        status,
        actor: user?.id || null,
        actorRole: 'admin',
        notes: 'تم إنشاء الشحنة بنجاح'
      });

      // Notify courier if assigned
      if (form.courierId && form.courierId !== 'none') {
        const courier = activeCouriers.find(c => c.id === form.courierId);
        if (courier) {
          await api.notifications.create({
            targetRole: 'courier',
            targetUserId: courier.userId,
            type: 'info',
            title: t.newShipment,
            message: `${trackingId} — ${form.customerName}`,
            link: `/courier/shipments`
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      toast.success(t.shipmentCreated);
      navigate('/shipments');
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ أثناء إنشاء الشحنة');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="max-w-4xl mx-auto">
      <h2 className="text-xl font-bold mb-6">{t.createShipment}</h2>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

          <div className="admin-card p-6 space-y-4">
            <h3 className="font-semibold text-sm mb-2">{t.shipmentInfo}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>قيمة المنتجات ({t.egp}) *</Label>
                <Input type="number" value={form.price} onChange={e => update('price', e.target.value)} className="rounded-xl mt-1 font-mono-nums" required min={0} />
              </div>
              <div>
                <Label>سعر التوصيل ({t.egp}) *</Label>
                <Input type="number" value={form.shippingFee} onChange={e => update('shippingFee', e.target.value)} className="rounded-xl mt-1 font-mono-nums" required min={0} />
              </div>
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
                  {activeCouriers.map(c => <SelectItem key={c.id} value={c.id}>{c.name} — {c.zone}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t.seller}</Label>
              <Select value={form.sellerId} onValueChange={v => update('sellerId', v)}>
                <SelectTrigger className="rounded-xl mt-1"><SelectValue placeholder={t.selectSeller} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t.noSeller}</SelectItem>
                  {activeSellers.map(s => <SelectItem key={s.id} value={s.id}>{s.storeName}</SelectItem>)}
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
          <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
            <Button type="submit" disabled={isSubmitting} className="rounded-xl px-8 h-11">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t.createButton}
            </Button>
          </motion.div>
        </div>
      </form>
    </motion.div>
  );
};

export default CreateShipmentPage;
