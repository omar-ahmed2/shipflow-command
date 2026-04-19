import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Shipment } from '@/db/schema';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, Filter, Printer, X, Package, Loader2, Info, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { FinanceBadge } from '@/components/shared/FinanceBadge';
import { formatCurrency, formatDate } from '@/utils/formatters';

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  pending: { label: 'قيد الانتظار', cls: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  assigned: { label: 'تم التعيين', cls: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  out_for_delivery: { label: 'جاري التوصيل', cls: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  delivered: { label: 'تم التوصيل', cls: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  returned: { label: 'مرتجع', cls: 'bg-rose-500/10 text-rose-500 border-rose-500/20' },
  cancelled: { label: 'مُلغاة', cls: 'bg-muted text-muted-foreground border-border' },
};

const SellerShipmentsPage = () => {
  const { sellerProfile } = useAuth();
  const { t, lang } = useTheme();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [printShipment, setPrintShipment] = useState<Shipment | null>(null);

  const { data: shipments = [], isLoading } = useQuery({
    queryKey: ['seller_shipments', sellerProfile?.id],
    queryFn: () => sellerProfile?.id ? api.shipments.getBySellerId(sellerProfile.id) : Promise.resolve([]),
    enabled: !!sellerProfile?.id
  });

  const filtered = shipments.filter(s => {
    const matchesSearch = s.trackingId.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.customerPhone.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handlePrint = () => window.print();

  if (isLoading) {
    return (
        <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-muted-foreground animate-pulse">جاري تحميل الشحنات...</p>
        </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
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

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-right">
        <h1 className="text-2xl font-black tracking-tight">{t.shipments || 'الشحنات'} <span className="text-sm font-medium text-muted-foreground">({filtered.length})</span></h1>
        <div className="flex gap-2">
            <Badge variant="outline" className="px-3 py-1 flex gap-1 items-center">
                <Info className="w-3 h-3 text-primary" />
                آخر الشحنات المضافة تظهر بالأعلى
            </Badge>
        </div>
      </div>

      <Card className="border-none shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-muted/20 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="البحث برقم التتبع، اسم العميل، أو الهاتف..." 
              className="w-full pl-4 pr-10 py-2.5 bg-background border border-muted/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative min-w-[200px]">
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <select 
              className="w-full pl-4 pr-10 py-2.5 bg-background border border-muted/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none text-sm font-bold"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="all">جميع الحالات</option>
              {Object.entries(STATUS_LABELS).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-muted/50 text-muted-foreground border-b text-[10px] uppercase font-bold tracking-wider">
                <tr>
                  <th className="p-5 font-bold">رقم التتبع</th>
                  <th className="p-5 font-bold text-center">العميل</th>
                  <th className="p-5 font-bold text-center">المحافظة / المدينة</th>
                  <th className="p-5 font-bold text-center">المبلغ</th>
                  <th className="p-5 font-bold text-center">الحالة</th>
                  <th className="p-5 font-bold text-center">المالية</th>
                  <th className="p-5 font-bold text-center">التاريخ</th>
                  <th className="p-5 font-bold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-muted/30">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-20 text-center text-muted-foreground">
                      <Package className="w-16 h-16 mx-auto mb-4 opacity-10" />
                      <p className="text-lg font-bold">لا توجد شحنات مطابقة للبحث</p>
                      <p className="text-xs opacity-60">جرب البحث بكلمات أخرى أو تغيير الفلتر</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map(shipment => {
                    const sLabel = STATUS_LABELS[shipment.status];
                    return (
                      <tr key={shipment.id} className="hover:bg-muted/30 transition-colors group">
                        <td className="p-5 font-black font-mono-nums text-primary text-xs tracking-tight">{shipment.trackingId}</td>
                        <td className="p-5 text-center">
                          <div className="font-bold">{shipment.customerName}</div>
                          <div className="text-[10px] font-mono-nums text-muted-foreground mt-0.5">{shipment.customerPhone}</div>
                        </td>
                        <td className="p-5 text-center font-medium opacity-80">{shipment.governorate} — {shipment.city}</td>
                        <td className="p-5 text-center">
                          <div className="font-black text-primary">{formatCurrency(shipment.price)} {t.egp}</div>
                          <div className="text-[10px] text-muted-foreground">التوصيل: {formatCurrency(shipment.shippingFee || 0)}</div>
                        </td>
                        <td className="p-5 text-center">
                          <span className={`px-3 py-1.5 rounded-full text-[10px] font-black border ${sLabel?.cls || 'bg-muted text-muted-foreground'}`}>
                            {sLabel?.label || shipment.status}
                          </span>
                        </td>
                        <td className="p-5 text-center">
                          <FinanceBadge shipment={shipment} />
                        </td>
                        <td className="p-5 text-center text-muted-foreground text-[10px] font-bold">
                          {formatDate(shipment.createdAt, lang)}
                        </td>
                        <td className="p-5 text-left">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="rounded-xl gap-2 font-bold h-9 px-4 hover:shadow-lg transition-all"
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
          <DialogContent className="max-w-[420px] p-0 overflow-hidden rounded-[32px] border-none shadow-2xl">
            <div className="flex items-center justify-between p-5 bg-muted/50 border-b">
              <h2 className="font-black text-base flex-1 text-right">معاينة بوليصة الشحن</h2>
              <div className="flex gap-2">
                <Button onClick={handlePrint} size="sm" className="rounded-xl gap-2 h-9 px-4 font-bold shadow-lg shadow-primary/20">
                  <Printer className="w-3.5 h-3.5" /> طباعة
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setPrintShipment(null)} className="rounded-xl h-9 w-9 p-0">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* AWB Content */}
            <div id="seller-print-section" className="p-6 font-sans bg-white text-black" dir="rtl">
              <div className="border-[4px] border-black p-5 flex flex-col gap-4 min-h-[300px]">
                
                {/* Header */}
                <div className="flex justify-between items-start border-b-[4px] border-black pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center">
                      <Package className="w-7 h-7 text-white" />
                    </div>
                    <div className="text-right">
                      <h1 className="text-2xl font-black leading-none tracking-tighter">ELMona</h1>
                      <p className="text-[10px] font-bold tracking-[0.2em] opacity-80 mt-1">SHIPPING SERVICES</p>
                    </div>
                  </div>
                  <div className="text-left border-[2px] border-black p-2 bg-black text-white rounded-md">
                    <p className="text-[10px] font-bold text-center">
                      {formatDate(printShipment.createdAt, 'ar')}
                    </p>
                    <p className="text-[11px] font-mono-nums font-black tracking-widest mt-1 text-center">
                      {printShipment.trackingId}
                    </p>
                  </div>
                </div>

                {/* Sender */}
                <div className="border-[2px] border-black rounded-lg overflow-hidden">
                  <div className="bg-black text-white px-3 py-1 text-[11px] font-black text-right">الراسل (SENDER)</div>
                  <div className="p-3 leading-tight text-right">
                    <p className="text-lg font-black">{sellerProfile?.store_name || 'ShipFlow Merchant'}</p>
                    <p className="text-xs mt-1 font-mono-nums font-bold text-gray-700">{sellerProfile?.phone}</p>
                  </div>
                </div>

                {/* Receiver */}
                <div className="border-[4px] border-black rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-black text-white px-3 py-1.5 text-xs font-black text-right flex justify-between items-center">
                    <span>المرسَل إليه (RECEIVER)</span>
                    <span className="bg-white text-black px-2 py-0.5 rounded font-black text-[10px]">{printShipment.governorate}</span>
                  </div>
                  <div className="p-4 leading-relaxed text-right">
                    <p className="text-2xl font-black mb-1">{printShipment.customerName}</p>
                    <p className="text-base font-bold text-gray-800">{printShipment.address}</p>
                    <p className="text-base font-black border-b border-black/10 pb-2 mb-2">{printShipment.city} — {printShipment.governorate}</p>
                    <div className="pt-1">
                      <span className="text-[10px] text-gray-500 font-bold block mb-1">رقم هاتف العميل للتواصل:</span>
                      <p className="font-mono-nums text-3xl font-black tracking-widest">{printShipment.customerPhone}</p>
                    </div>
                  </div>
                </div>

                {/* COD + Code */}
                <div className="flex gap-3">
                  <div className="border-[4px] border-black flex-[2] flex flex-col items-center justify-center py-4 relative rounded-xl overflow-hidden">
                    <span className="absolute top-0 right-0 bg-black text-white text-[10px] px-2 py-1 font-black">
                      {printShipment.paymentType === 'COD' ? 'المبلغ المستحق (COD)' : 'الحالة (STATUS)'}
                    </span>
                    {printShipment.paymentType === 'COD' ? (
                      <div className="flex items-baseline gap-1 mt-3">
                        <p className="text-4xl font-black tracking-tight font-mono-nums">
                          {formatCurrency(printShipment.price + (printShipment.shippingFee || 0))}
                        </p>
                        <span className="text-xs font-black">EGP</span>
                      </div>
                    ) : (
                      <p className="text-xl font-black mt-3 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        مدفوع مسبقاً
                      </p>
                    )}
                  </div>
                  {printShipment.verificationCode && (
                    <div className="border-[4px] border-black flex-1 flex flex-col items-center justify-center p-3 text-center rounded-xl bg-muted/5">
                      <p className="text-[10px] font-black mb-1.5 opacity-60">كود التحقق</p>
                      <p className="text-3xl font-mono-nums font-black tracking-widest text-primary drop-shadow-sm">
                        {printShipment.verificationCode}
                      </p>
                    </div>
                  )}
                </div>

                <div className="text-center mt-2 opacity-50">
                  <p className="text-[9px] font-mono-nums font-black tracking-tighter uppercase">ELMona Logistics Solutions ™ — Printed via shipflow.app</p>
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
