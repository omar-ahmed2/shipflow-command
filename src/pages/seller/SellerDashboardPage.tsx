import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { motion } from 'framer-motion';
import { Package, Truck, CheckCircle, CircleDollarSign, Loader2, ArrowLeftRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/utils/formatters';

const SellerDashboardPage = () => {
  const { user, sellerProfile } = useAuth();
  const { t } = useTheme();

  const { data: shipments = [], isLoading } = useQuery({
    queryKey: ['seller_shipments', sellerProfile?.id],
    queryFn: () => sellerProfile?.id ? api.shipments.getBySellerId(sellerProfile.id) : Promise.resolve([]),
    enabled: !!sellerProfile?.id
  });

  const stats = {
    total: shipments.length,
    pending: shipments.filter(s => s.status === 'pending').length,
    delivered: shipments.filter(s => s.status === 'delivered').length,
    inTransit: shipments.filter(s => ['assigned', 'out_for_delivery'].includes(s.status)).length,
    revenue: shipments.filter(s => s.status === 'delivered').reduce((sum, s) => sum + s.price, 0),
  };

  const statCards = [
    { title: "إجمالي الأرباح المتوقعة", value: formatCurrency(stats.revenue) + " " + t.egp, icon: CircleDollarSign, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { title: "إجمالي الشحنات", value: stats.total, icon: Package, color: "text-blue-500", bg: "bg-blue-500/10" },
    { title: "جاري التوصيل", value: stats.inTransit, icon: Truck, color: "text-amber-500", bg: "bg-amber-500/10" },
    { title: "تم التوصيل", value: stats.delivered, icon: CheckCircle, color: "text-green-500", bg: "bg-green-500/10" },
  ];

  if (isLoading) {
    return (
        <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-muted-foreground animate-pulse">جاري تحميل لوحة التحكم...</p>
        </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-right">مرحباً، {user?.name} 👋</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="border-none shadow-sm overflow-hidden group hover:shadow-md transition-shadow">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="text-right">
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <h3 className="text-2xl font-black mt-2 tracking-tight">{stat.value}</h3>
                </div>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${stat.bg} group-hover:scale-110 transition-transform`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-bold">أحدث الشحنات</CardTitle>
          <ArrowLeftRight className="w-4 h-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {shipments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
                لا توجد شحنات بعد
            </div>
          ) : (
            <div className="space-y-4">
              {shipments.slice(0, 5).map(shipment => (
                <div key={shipment.id} className="flex justify-between items-center p-4 border border-muted/30 rounded-2xl hover:bg-muted/10 transition-colors">
                  <div className="text-right">
                    <p className="font-bold font-mono-nums">{shipment.trackingId}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{shipment.customerName} • {shipment.city}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold font-mono-nums">{formatCurrency(shipment.price)} {t.egp}</span>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      shipment.status === 'delivered' ? 'bg-emerald-500/10 text-emerald-500' :
                      shipment.status === 'pending' ? 'bg-amber-500/10 text-amber-500' :
                      'bg-blue-500/10 text-blue-500'
                    }`}>
                      {t[`status_${shipment.status}`] || shipment.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SellerDashboardPage;
