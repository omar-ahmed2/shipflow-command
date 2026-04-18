import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { generateTrackingId, generateVerificationCode } from '@/db/helpers';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Save, X, Package, Phone, MapPin, BadgeDollarSign, MessageSquare, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const SellerCreateShipmentPage = () => {
  const { user, sellerProfile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    address: '',
    city: '',
    governorate: '',
    price: '',
    shippingFee: '50', // Default fee
    notes: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sellerProfile?.id) {
      toast.error('لم يتم العثور على حساب المتجر. يرجى تسجيل الخروج والوصول مرة أخرى.');
      return;
    }

    if (!formData.customerName || !formData.customerPhone || !formData.address || !formData.city || !formData.governorate || !formData.price || !formData.shippingFee) {
      toast.error('يرجى تعبئة جميع الحقول المطلوبة');
      return;
    }

    setLoading(true);
    
    try {
      const trackingId = generateTrackingId();
      const verificationCode = generateVerificationCode();
      
      const newShipmentData = {
        trackingId,
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        address: formData.address,
        city: formData.city,
        governorate: formData.governorate,
        price: parseFloat(formData.price),
        shippingFee: parseFloat(formData.shippingFee) || 0,
        paymentType: "COD",
        status: "pending",
        courierId: null,
        sellerId: sellerProfile.id,
        createdBy: user?.id,
        verificationCode,
        notes: formData.notes,
      };

      const created = await api.shipments.create(newShipmentData);
      
      // Add initial event
      await api.shipments.addEvent({
        shipmentId: created.id,
        status: 'pending',
        actor: user?.id || null,
        actorRole: 'seller',
        notes: 'تم إنشاء الشحنة وجاري انتظار المندوب'
      });

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['seller_shipments'] });
      queryClient.invalidateQueries({ queryKey: ['shipments'] });

      toast.success('تم إنشاء الشحنة بنجاح');
      navigate('/seller/shipments');
    } catch (error: any) {
      console.error('Error creating shipment:', error);
      toast.error('حدث خطأ أثناء إنشاء الشحنة: ' + (error.message || 'خطأ غير معروف'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-row-reverse">
        <h1 className="text-2xl font-black text-right">إضافة شحنة جديدة 📦</h1>
        <Button variant="ghost" onClick={() => navigate('/seller/shipments')} className="rounded-xl gap-2 hover:bg-muted/50">
          إلغاء
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>

      <Card className="border-none shadow-premium overflow-hidden rounded-[32px]">
        <form onSubmit={handleSubmit}>
          <CardHeader className="bg-primary/5 border-b border-primary/10 p-8">
            <CardTitle className="text-lg font-bold flex items-center gap-3 justify-end flex-row-reverse">
              <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center text-white">
                <Package className="w-5 h-5" />
              </div>
              بيانات العميل والشحنة
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            {/* Customer Info Section */}
            <div className="space-y-4">
               <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2 justify-end flex-row-reverse">
                  <Phone className="w-3 h-3" />
                  بيانات التواصل
               </h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 text-right">
                    <label className="text-sm font-bold opacity-80">اسم العميل <span className="text-destructive">*</span></label>
                    <input 
                    type="text" name="customerName" 
                    value={formData.customerName} onChange={handleChange}
                    placeholder="الاسم الكامل للعميل"
                    className="w-full p-4 bg-muted/20 border-none rounded-2xl focus:ring-2 focus:ring-primary/40 transition-all font-bold"
                    required
                    />
                </div>
                <div className="space-y-2 text-right">
                    <label className="text-sm font-bold opacity-80">رقم الهاتف <span className="text-destructive">*</span></label>
                    <input 
                    type="tel" name="customerPhone" 
                    value={formData.customerPhone} onChange={handleChange}
                    className="w-full p-4 bg-muted/20 border-none rounded-2xl focus:ring-2 focus:ring-primary/40 transition-all font-mono font-bold"
                    placeholder="01xxxxxxxxx"
                    dir="ltr"
                    required
                    />
                </div>
              </div>
            </div>

            {/* Address Section */}
            <div className="space-y-4">
               <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2 justify-end flex-row-reverse">
                  <MapPin className="w-3 h-3" />
                  تفاصيل العنوان
               </h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 text-right">
                    <label className="text-sm font-bold opacity-80">المحافظة <span className="text-destructive">*</span></label>
                    <input 
                    type="text" name="governorate" 
                    value={formData.governorate} onChange={handleChange}
                    className="w-full p-4 bg-muted/20 border-none rounded-2xl focus:ring-2 focus:ring-primary/40 transition-all font-bold"
                    required
                    />
                </div>
                <div className="space-y-2 text-right">
                    <label className="text-sm font-bold opacity-80">المدينة / المنطقة <span className="text-destructive">*</span></label>
                    <input 
                    type="text" name="city" 
                    value={formData.city} onChange={handleChange}
                    className="w-full p-4 bg-muted/20 border-none rounded-2xl focus:ring-2 focus:ring-primary/40 transition-all font-bold"
                    required
                    />
                </div>
              </div>
              <div className="space-y-2 text-right">
                <label className="text-sm font-bold opacity-80">العنوان التفصيلي <span className="text-destructive">*</span></label>
                <input 
                  type="text" name="address" 
                  value={formData.address} onChange={handleChange}
                  className="w-full p-4 bg-muted/20 border-none rounded-2xl focus:ring-2 focus:ring-primary/40 transition-all font-bold"
                  placeholder="رقم العمارة، الشقة، أو علامة مميزة..."
                  required
                />
              </div>
            </div>

            {/* Financial Section */}
            <div className="space-y-4">
               <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2 justify-end flex-row-reverse">
                  <BadgeDollarSign className="w-3 h-3" />
                  المبالغ المالية
               </h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 text-right">
                    <label className="text-sm font-bold opacity-80">قيمة الأوردر (للتاجر) <span className="text-destructive">*</span></label>
                    <div className="relative">
                    <input 
                        type="number" name="price" 
                        value={formData.price} onChange={handleChange}
                        className="w-full p-4 pr-14 bg-muted/20 border-none rounded-2xl focus:ring-2 focus:ring-primary/40 transition-all font-mono-nums font-black"
                        dir="ltr"
                        required
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold">ج.م</span>
                    </div>
                </div>

                <div className="space-y-2 text-right">
                    <label className="text-sm font-bold opacity-80">توصيل المندوب (عمولتنا) <span className="text-destructive">*</span></label>
                    <div className="relative">
                    <input 
                        type="number" name="shippingFee" 
                        value={formData.shippingFee} onChange={handleChange}
                        className="w-full p-4 pr-14 bg-muted/20 border-none rounded-2xl focus:ring-2 focus:ring-primary/40 transition-all font-mono-nums font-black"
                        dir="ltr"
                        required
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold">ج.م</span>
                    </div>
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <div className="space-y-4">
               <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2 justify-end flex-row-reverse">
                  <MessageSquare className="w-3 h-3" />
                  ملاحظات
               </h3>
              <div className="space-y-2 text-right">
                <label className="text-sm font-bold opacity-80">ملاحظات تسليم الشحنة</label>
                <textarea 
                  name="notes" 
                  value={formData.notes} onChange={handleChange}
                  className="w-full p-4 bg-muted/20 border-none rounded-2xl focus:ring-2 focus:ring-primary/40 transition-all min-h-[120px] font-medium resize-none"
                  placeholder="مثال: يرجى تسليم الشحنة بعد الساعة 4 عصراً..."
                ></textarea>
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/30 p-8 border-t flex justify-end">
            <Button type="submit" disabled={loading} className="w-full sm:w-auto h-14 px-10 rounded-2xl text-lg font-black shadow-xl shadow-primary/20 gap-3 group">
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  جاري تسجيل الشحنة...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  حفظ وتأكيد الشحنة
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default SellerCreateShipmentPage;
