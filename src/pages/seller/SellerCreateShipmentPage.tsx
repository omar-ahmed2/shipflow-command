import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/db';
import { generateTrackingId, generateVerificationCode } from '@/db/helpers';
import type { Shipment, Seller, ShipmentEvent, Notification } from '@/db/schema';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Save, X } from 'lucide-react';
import { toast } from 'sonner';

const SellerCreateShipmentPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const seller = db.getAll<Seller>('sellers').find(s => s.userId === user?.id);
  const sellerId = seller?.id || '';
  
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    address: '',
    city: '',
    governorate: '',
    price: '',
    shippingFee: '',
    notes: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerName || !formData.customerPhone || !formData.address || !formData.city || !formData.governorate || !formData.price || !formData.shippingFee) {
      toast.error('يرجى تعبئة جميع الحقول المطلوبة');
      return;
    }

    setLoading(true);
    
    // Simulate network delay
    setTimeout(() => {
      if (!seller) {
        toast.error('لم يتم العثور على حساب المتجر');
        setLoading(false);
        return;
      }
      
      const newShipment: Partial<Shipment> = {
        trackingId: generateTrackingId(),
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        address: formData.address,
        city: formData.city,
        governorate: formData.governorate,
        price: parseFloat(formData.price),
        paymentType: "COD",
        codCollected: false,
        status: "pending",
        courierId: null,
        sellerId: sellerId,
        createdBy: user?.id || 'unknown',
        verificationCode: generateVerificationCode(),
        notes: formData.notes,
        shippingFee: parseFloat(formData.shippingFee) || 0
      };

      const created = db.create<Shipment>('shipments', newShipment as any, 'SHP');
      
      // Add event log
      db.create<ShipmentEvent>('shipmentEvents', {
        shipmentId: created.id,
        status: 'pending',
        actor: user?.name,
        actorRole: 'seller',
        note: 'تم إنشاء الشحنة من قبل التاجر',
        timestamp: new Date().toISOString()
      } as Partial<ShipmentEvent> as any, 'EVT');

      // Admin notification
      db.create<Notification>('notifications', {
        targetRole: 'admin',
        type: 'info',
        title: 'شحنة جديدة',
        message: `أضاف ${user?.name} شحنة جديدة برقم ${created.trackingId}`,
        read: false,
        link: `/shipments/${created.id}`
      } as Partial<Notification> as any, 'NOT');

      setLoading(false);
      toast.success('تمت إضافة الشحنة بنجاح');
      navigate('/seller/shipments');
    }, 600);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">إضافة شحنة جديدة</h1>
        <Button variant="outline" onClick={() => navigate('/seller/shipments')}>
          <X className="w-4 h-4 mr-2" />
          إلغاء
        </Button>
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>بيانات العميل والشحنة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">اسم العميل <span className="text-red-500">*</span></label>
                <input 
                  type="text" name="customerName" 
                  value={formData.customerName} onChange={handleChange}
                  className="w-full p-2 border rounded-md bg-background"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">رقم هاتف العميل <span className="text-red-500">*</span></label>
                <input 
                  type="tel" name="customerPhone" 
                  value={formData.customerPhone} onChange={handleChange}
                  className="w-full p-2 border rounded-md bg-background"
                  dir="ltr"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">المحافظة <span className="text-red-500">*</span></label>
              <input 
                type="text" name="governorate" 
                value={formData.governorate} onChange={handleChange}
                className="w-full p-2 border rounded-md bg-background"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">المدينة / المنطقة <span className="text-red-500">*</span></label>
              <input 
                type="text" name="city" 
                value={formData.city} onChange={handleChange}
                className="w-full p-2 border rounded-md bg-background"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">العنوان التفصيلي <span className="text-red-500">*</span></label>
              <input 
                type="text" name="address" 
                value={formData.address} onChange={handleChange}
                className="w-full p-2 border rounded-md bg-background"
                placeholder="اسم الشارع، رقم العمارة، رقم الشقة..."
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">قيمة المنتجات (ثمن الشحنة للتاجر) <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input 
                    type="number" name="price" 
                    value={formData.price} onChange={handleChange}
                    className="w-full p-2 border rounded-md bg-background pl-12"
                    dir="ltr"
                    required
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">EGP</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">سعر التوصيل (عمولة الشركة) <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input 
                    type="number" name="shippingFee" 
                    value={formData.shippingFee} onChange={handleChange}
                    className="w-full p-2 border rounded-md bg-background pl-12"
                    dir="ltr"
                    required
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">EGP</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">ملاحظات للمندوب</label>
              <textarea 
                name="notes" 
                value={formData.notes} onChange={handleChange}
                className="w-full p-2 border rounded-md bg-background min-h-[100px]"
                placeholder="مثال: يرجى الاتصال قبل الوصول بساعة..."
              ></textarea>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/30 p-4 border-t">
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'جاري الحفظ...' : 'حفظ وإضافة الشحنة'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default SellerCreateShipmentPage;
