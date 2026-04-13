import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { db } from '@/db';
import type { Settlement, Shipment, Seller } from '@/db/schema';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Wallet, ArrowDownRight, ArrowUpRight } from 'lucide-react';

const SellerFinancialsPage = () => {
  const { user } = useAuth();
  const { t } = useTheme();

  const seller = db.getAll<Seller>('sellers').find(s => s.userId === user?.id);
  const sellerId = seller?.id || '';
  
  const settlements = db.query<Settlement>('settlements', s => s.sellerId === sellerId);
  const shipments = db.query<Shipment>('shipments', s => s.sellerId === sellerId);

  const totalNetEarned = shipments.filter(s => ['delivered', 'returned'].includes(s.status)).reduce((acc, s) => {
    if (s.status === 'delivered') {
      return acc + (s.paymentType === 'COD' ? s.price : -(s.shippingFee || 0));
    } else {
      return acc - (s.shippingFee || 0);
    }
  }, 0);
  
  const totalSettled = settlements.reduce((acc, s) => acc + s.amount, 0);
  const outstandingBalance = totalNetEarned - totalSettled;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">الماليات والتسويات</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center justify-between bg-primary/5 border-primary/20">
            <div>
              <p className="text-sm font-medium text-muted-foreground">الرصيد المتاح (غير مسدد)</p>
              <h3 className="text-2xl font-bold text-primary mt-2">{Math.max(0, outstandingBalance)} ج.م</h3>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-primary/10">
              <Wallet className="w-6 h-6 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">إجمالي الأرباح الصافية</p>
              <h3 className="text-2xl font-bold mt-2">{totalNetEarned} ج.م</h3>
              <p className="text-xs text-muted-foreground mt-1">عن إجمالي الشحنات المكتملة</p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-green-500/10">
              <ArrowDownRight className="w-6 h-6 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">تم تحويله (تسويات)</p>
              <h3 className="text-2xl font-bold mt-2">{totalSettled} ج.م</h3>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-orange-500/10">
              <ArrowUpRight className="w-6 h-6 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>سجل التسويات</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="p-4 font-medium">رقم العملية</th>
                  <th className="p-4 font-medium">المبلغ (ج.م)</th>
                  <th className="p-4 font-medium">عدد الشحنات المضمنة</th>
                  <th className="p-4 font-medium">بواسطة</th>
                  <th className="p-4 font-medium">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {settlements.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      لا توجد تسويات سابقة
                    </td>
                  </tr>
                ) : (
                  settlements.reverse().map(settlement => (
                    <tr key={settlement.id} className="hover:bg-muted/50 transition-colors">
                      <td className="p-4 font-semibold">{settlement.id}</td>
                      <td className="p-4 font-bold text-green-600">+{settlement.amount}</td>
                      <td className="p-4">{settlement.shipmentCount}</td>
                      <td className="p-4 text-muted-foreground">{settlement.adminName}</td>
                      <td className="p-4 text-muted-foreground">
                        {new Date(settlement.date).toLocaleString('ar-EG')}
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
