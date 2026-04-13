import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { db } from '@/db';
import type { Shipment, Seller } from '@/db/schema';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, Filter, Printer, X, Package } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import QRCode from 'react-qr-code';

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  pending: { label: 'قيد الانتظار', cls: 'bg-orange-100 text-orange-700' },
  assigned: { label: 'تم التعيين', cls: 'bg-blue-100 text-blue-700' },
  out_for_delivery: { label: 'جاري التوصيل', cls: 'bg-purple-100 text-purple-700' },
  delivered: { label: 'تم التوصيل ✓', cls: 'bg-green-100 text-green-700' },
  returned: { label: 'مرتجع', cls: 'bg-red-100 text-red-700' },
  cancelled: { label: 'مُلغاة', cls: 'bg-gray-100 text-gray-700' },
};

const SellerShipmentsPage = () => {
  const { user } = useAuth();
  const { t } = useTheme();
  
  const seller = db.getAll<Seller>('sellers').find(s => s.userId === user?.id);
  const sellerId = seller?.id || '';
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [printShipment, setPrintShipment] = useState<Shipment | null>(null);

  const shipments = db.query<Shipment>('shipments', s => s.sellerId === sellerId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const filtered = shipments.filter(s => {
    const matchesSearch = s.trackingId.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.customerPhone.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handlePrint = () => window.print();

  return (
    <div className="space-y-6">
      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #seller-print-section, #seller-print-section * { visibility: visible; }
          #seller-print-section {
            position: fixed; left: 0; top: 0; width: 100%; height: 100%;
            background: white; z-index: 9999; display: flex; align-items: center; justify-content: center;
          }
          @page { margin: 0; }
        }
      `}</style>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold">{t.shipments || 'الشحنات'} ({filtered.length})</h1>
      </div>

      <Card>
        <div className="p-4 border-b flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="ابحث برقم التتبع، اسم العميل، هاتف..." 
              className="w-full pl-4 pr-10 py-2 border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative min-w-[180px]">
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <select 
              className="w-full pl-4 pr-10 py-2 border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none text-sm"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="all">كل الحالات</option>
              {Object.entries(STATUS_LABELS).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="p-4 font-medium">رقم التتبع</th>
                  <th className="p-4 font-medium">العميل</th>
                  <th className="p-4 font-medium">العنوان</th>
                  <th className="p-4 font-medium">المبلغ</th>
                  <th className="p-4 font-medium">الحالة</th>
                  <th className="p-4 font-medium">التاريخ</th>
                  <th className="p-4 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-muted-foreground">
                      <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p>لا توجد شحنات مطابقة</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map(shipment => {
                    const sLabel = STATUS_LABELS[shipment.status];
                    return (
                      <tr key={shipment.id} className="hover:bg-muted/50 transition-colors">
                        <td className="p-4 font-semibold font-mono text-xs">{shipment.trackingId}</td>
                        <td className="p-4">
                          <div className="font-medium">{shipment.customerName}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{shipment.customerPhone}</div>
                        </td>
                        <td className="p-4 text-sm">{shipment.governorate} - {shipment.city}</td>
                        <td className="p-4 font-bold">
                          <div>المُنتجات: {shipment.price} ج.م</div>
                          <div className="text-xs text-muted-foreground">التوصيل: {shipment.shippingFee || 0} ج.م</div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${sLabel?.cls || 'bg-gray-100 text-gray-700'}`}>
                            {sLabel?.label || shipment.status}
                          </span>
                        </td>
                        <td className="p-4 text-muted-foreground text-xs whitespace-nowrap">
                          {new Date(shipment.createdAt).toLocaleDateString('ar-EG')}
                        </td>
                        <td className="p-4">
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-lg gap-1"
                            onClick={() => setPrintShipment(shipment)}
                          >
                            <Printer className="w-3.5 h-3.5" />
                            بوليصة
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Print Dialog */}
      {printShipment && (
        <Dialog open={!!printShipment} onOpenChange={(open) => !open && setPrintShipment(null)}>
          <DialogContent className="max-w-[420px] p-0 overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-muted/50 border-b">
              <h2 className="font-bold text-sm">معاينة بوليصة الشحن</h2>
              <div className="flex gap-2">
                <Button onClick={handlePrint} size="sm" className="rounded-lg gap-1">
                  <Printer className="w-3.5 h-3.5" /> طباعة
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setPrintShipment(null)} className="rounded-lg">
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* AWB Content */}
            <div id="seller-print-section" className="p-4 font-sans" dir="rtl">
              <div className="border-[3px] border-black p-4 flex flex-col gap-3 min-h-[250px]">
                
                {/* Header */}
                <div className="flex justify-between items-start border-b-[3px] border-black pb-3">
                  <div className="flex items-center gap-2">
                    <img src="/logo.png" className="w-12 h-12 object-contain" style={{ mixBlendMode: 'multiply' }} />
                    <div>
                      <h1 className="text-2xl font-black uppercase tracking-tighter leading-none">ELMona</h1>
                      <p className="text-[8px] font-bold tracking-[0.2em] text-primary">SHIPPING</p>
                    </div>
                  </div>
                  <div className="text-left border-2 border-black p-1">
                    <p className="text-[10px] font-bold text-center">
                      {new Date(printShipment.createdAt).toLocaleDateString('ar-EG')}
                    </p>
                    <p className="text-[10px] font-mono font-black tracking-widest mt-1 text-center">
                      {printShipment.trackingId}
                    </p>
                  </div>
                </div>

                {/* Sender */}
                <div className="border-[2px] border-black">
                  <div className="bg-black text-white px-2 py-0.5 text-[10px] font-bold">الراسل (Sender)</div>
                  <div className="p-2 leading-tight">
                    <p className="text-sm font-black">{seller?.storeName || 'متجر'}</p>
                    <p className="text-xs mt-0.5 font-mono font-bold">TEL: {seller?.phone}</p>
                  </div>
                </div>

                {/* Receiver */}
                <div className="border-[3px] border-black">
                  <div className="bg-black text-white px-2 py-1 text-xs font-bold">
                    المرسَل إليه (Receiver) — {printShipment.governorate}
                  </div>
                  <div className="p-3 leading-relaxed">
                    <p className="text-xl font-black mb-1">{printShipment.customerName}</p>
                    <p className="text-sm font-bold">{printShipment.address}</p>
                    <p className="text-sm font-bold text-gray-700">{printShipment.city} — {printShipment.governorate}</p>
                    <div className="mt-2 border-t-2 border-dashed border-gray-400 pt-2">
                      <span className="text-[10px] text-gray-600 font-bold">رقم الهاتف:</span>
                      <p className="font-mono text-2xl font-black tracking-wider">{printShipment.customerPhone}</p>
                    </div>
                  </div>
                </div>

                {/* COD + Code */}
                <div className="flex gap-2">
                  <div className="border-[3px] border-black flex-[2] flex flex-col items-center justify-center py-3 relative">
                    <span className="absolute top-0 right-0 bg-black text-white text-[9px] px-1.5 py-0.5 font-bold">
                      {printShipment.paymentType === 'COD' ? 'المبلغ (COD)' : 'الدفع'}
                    </span>
                    {printShipment.paymentType === 'COD' ? (
                      <p className="text-2xl font-black tracking-tight mt-2">
                        {printShipment.price + (printShipment.shippingFee || 0)} <span className="text-xs font-bold">EGP</span>
                      </p>
                    ) : (
                      <p className="text-base font-black mt-2">مدفوع مسبقاً</p>
                    )}
                  </div>
                  {printShipment.verificationCode && (
                    <div className="border-[3px] border-black flex-1 flex flex-col items-center justify-center p-2 text-center">
                      <p className="text-[9px] font-bold mb-1">كود التسليم</p>
                      <p className="text-2xl font-mono font-black tracking-[0.2em]">
                        {printShipment.verificationCode}
                      </p>
                    </div>
                  )}
                </div>

                <div className="text-center mt-1">
                  <p className="text-[9px] font-mono font-bold">Generated by ELMona Shipping System ™</p>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default SellerShipmentsPage;
