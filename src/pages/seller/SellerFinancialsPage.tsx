import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Wallet, ArrowDownRight, ArrowUpRight, Loader2, History, Info, ReceiptText } from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/formatters';

const SellerFinancialsPage = () => {
  const { user, sellerProfile } = useAuth();
  const { t, lang } = useTheme();

  const { data: shipments = [], isLoading: loadingShipments } = useQuery({
    queryKey: ['seller_shipments', sellerProfile?.id],
    queryFn: () => sellerProfile?.id ? api.shipments.getBySellerId(sellerProfile.id) : Promise.resolve([]),
    enabled: !!sellerProfile?.id
  });

  const { data: settlements = [], isLoading: loadingSettlements } = useQuery({
    queryKey: ['seller_settlements', sellerProfile?.id],
    queryFn: () => sellerProfile?.id ? api.settlements.getBySellerId(sellerProfile.id) : Promise.resolve([]),
    enabled: !!sellerProfile?.id
  });

  const isLoading = loadingShipments || loadingSettlements;

  const totalNetEarned = shipments.filter(s => ['delivered', 'returned'].includes(s.status)).reduce((acc, s) => {
    if (s.status === 'delivered') {
      return acc + (s.paymentType === 'COD' ? s.price : -(s.shippingFee || 0));
    } else {
      return acc - (s.shippingFee || 0);
    }
  }, 0);
  
  const totalSettled = settlements.reduce((acc, s) => acc + s.amount, 0);
  const outstandingBalance = totalNetEarned - totalSettled;

  if (isLoading) {
    return (
        <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-muted-foreground animate-pulse">جاري تحميل البيانات المالية...</p>
        </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-right">الماليات والتسويات 💰</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="border-none shadow-sm overflow-hidden group hover:shadow-md transition-all">
          <CardContent className="p-6 flex items-center justify-between bg-primary/5">
            <div className="text-right">
              <p className="text-sm font-bold text-muted-foreground opacity-80">الرصيد القابل للسحب</p>
              <h3 className="text-3xl font-black text-primary mt-2 tracking-tight group-hover:scale-105 transition-transform origin-right">
                {formatCurrency(Math.max(0, outstandingBalance))} <span className="text-xs">{t.egp}</span>
              </h3>
            </div>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-primary/10 shadow-inner group-hover:rotate-12 transition-transform">
              <Wallet className="w-7 h-7 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-sm overflow-hidden group hover:shadow-md transition-all">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="text-right">
              <p className="text-sm font-bold text-muted-foreground opacity-80">إجمالي الأرباح الصافية</p>
              <h3 className="text-2xl font-black mt-2 tracking-tight">
                {formatCurrency(totalNetEarned)} <span className="text-xs">{t.egp}</span>
              </h3>
              <div className="flex items-center gap-1 justify-end text-[10px] text-muted-foreground mt-1 font-bold">
                 <span>بناءً على الشحنات المكتملة</span>
                 <Info className="w-3 h-3" />
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-emerald-500/10 group-hover:-translate-y-1 transition-transform">
              <ArrowDownRight className="w-6 h-6 text-emerald-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm overflow-hidden group hover:shadow-md transition-all sm:col-span-2 lg:col-span-1">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="text-right">
              <p className="text-sm font-bold text-muted-foreground opacity-80">إجمالي ما تم استلامه</p>
              <h3 className="text-2xl font-black mt-2 tracking-tight">
                {formatCurrency(totalSettled)} <span className="text-xs">{t.egp}</span>
              </h3>
              <p className="text-[10px] text-muted-foreground mt-1 font-bold">عبر كافة التحويلات السابقة</p>
            </div>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-amber-500/10 group-hover:translate-x-1 transition-transform">
              <ArrowUpRight className="w-6 h-6 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm overflow-hidden rounded-[24px]">
        <CardHeader className="border-b bg-muted/20 p-6 flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-black flex items-center gap-2">
             <History className="w-5 h-5 text-primary" />
             سجل عمليات التسوية
          </CardTitle>
          <ReceiptText className="w-5 h-5 text-muted-foreground opacity-30" />
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-muted/50 text-muted-foreground border-b text-[10px] uppercase font-bold tracking-wider">
                <tr>
                  <th className="p-5 font-bold">رقم العملية</th>
                  <th className="p-5 font-bold text-center">المبلغ المستلم</th>
                  <th className="p-5 font-bold text-center">عدد الشحنات</th>
                  <th className="p-5 font-bold text-center">المسؤول</th>
                  <th className="p-5 font-bold text-left">التاريخ والوقت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-muted/30">
                {settlements.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-20 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2 opacity-20">
                         <ReceiptText className="w-16 h-16" />
                         <p className="text-lg font-bold">لا توجد تسويات مالية سابقة</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  settlements.map(settlement => (
                    <tr key={settlement.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="p-5 font-black font-mono-nums text-primary text-xs uppercase">{settlement.id.split('-')[0]}...</td>
                      <td className="p-5 text-center font-black text-emerald-600 text-base">
                        +{formatCurrency(settlement.amount)} <span className="text-[10px] font-bold">{t.egp}</span>
                      </td>
                      <td className="p-5 text-center">
                         <span className="px-3 py-1 rounded-full bg-muted font-black text-[11px] border border-muted-foreground/10">
                            {settlement.shipmentCount} شحنة
                         </span>
                      </td>
                      <td className="p-5 text-center font-bold opacity-80">{settlement.adminName || 'مدير النظام'}</td>
                      <td className="p-5 text-left text-muted-foreground text-[10px] font-black uppercase">
                        {formatDate(settlement.date, lang)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SellerFinancialsPage;
