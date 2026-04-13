import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { db } from '@/db';
import type { Shipment, Seller } from '@/db/schema';
import { motion } from 'framer-motion';
import { Package, Truck, CheckCircle, AlertCircle, Clock, CircleDollarSign } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/utils/formatters';

const SellerDashboardPage = () => {
  const { user } = useAuth();
  const { t } = useTheme();

  const seller = db.getAll<Seller>('sellers').find(s => s.userId === user?.id);
  const sellerId = seller?.id || '';
  const shipments = db.query<Shipment>('shipments', s => s.sellerId === sellerId);

  const stats = {
    total: shipments.length,
    pending: shipments.filter(s => s.status === 'pending').length,
    delivered: shipments.filter(s => s.status === 'delivered').length,
    inTransit: shipments.filter(s => ['assigned', 'out_for_delivery'].includes(s.status)).length,
    revenue: shipments.filter(s => s.status === 'delivered').reduce((sum, s) => sum + s.price, 0),
  };

  const statCards = [
    { title: "إجمالي الأرباح المستلمة", value: formatCurrency(stats.revenue) + " ج.م", icon: CircleDollarSign, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { title: "إجمالي الشحنات", value: stats.total, icon: Package, color: "text-blue-500", bg: "bg-blue-500/10" },
    { title: "جاري التوصيل", value: stats.inTransit, icon: Truck, color: "text-purple-500", bg: "bg-purple-500/10" },
    { title: "تم التوصيل", value: stats.delivered, icon: CheckCircle, color: "text-green-500", bg: "bg-green-500/10" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">مرحباً، {user?.name}</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card>
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <h3 className="text-2xl font-bold mt-2">{stat.value}</h3>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>أحدث الشحنات</CardTitle>
        </CardHeader>
        <CardContent>
          {shipments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">لا توجد شحنات بعد</div>
          ) : (
            <div className="space-y-4">
              {shipments.slice(-5).reverse().map(shipment => (
                <div key={shipment.id} className="flex justify-between items-center p-4 border rounded-lg">
                  <div>
                    <p className="font-semibold">{shipment.trackingId}</p>
                    <p className="text-sm text-muted-foreground">{shipment.customerName} - {shipment.city}</p>
                  </div>
                  <div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      shipment.status === 'delivered' ? 'bg-green-100 text-green-700' :
                      shipment.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                      'bg-blue-100 text-blue-700'
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
