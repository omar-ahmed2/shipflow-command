import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';
import { db } from '@/db';
import type { Seller, Shipment, Settlement, User } from '@/db/schema';
import { formatCurrency, formatDateTime } from '@/utils/formatters';
import { 
  Store, 
  Phone, 
  MapPin, 
  Calendar, 
  Package, 
  CheckCircle, 
  TrendingUp, 
  Wallet,
  ArrowLeft,
  Clock,
  ExternalLink,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { pageVariants, cardVariants } from '@/animations/variants';

const SellerProfilePage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { t, lang } = useTheme();
    const navigate = useNavigate();

    const seller = useMemo(() => db.getById<Seller>('sellers', id || ''), [id]);
    const userRole = useMemo(() => seller ? db.getById<User>('users', seller.userId) : null, [seller]);
    const shipments = useMemo(() => db.getAll<Shipment>('shipments').filter(s => s.sellerId === id), [id]);
    const settlements = useMemo(() => db.getAll<Settlement>('settlements').filter(s => s.sellerId === id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [id]);

    if (!seller) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh]">
                <p className="text-muted-foreground mb-4">المتجر غير موجود</p>
                <Button onClick={() => navigate('/sellers')}>العودة للمتاجر</Button>
            </div>
        );
    }

    const stats = {
        total: shipments.length,
        pending: shipments.filter(s => s.status === 'pending').length,
        delivered: shipments.filter(s => s.status === 'delivered').length,
        returned: shipments.filter(s => s.status === 'returned').length,
        
        // Financials
        pendingSettlement: shipments.filter(s => s.status === 'delivered' && !s.sellerSettled).reduce((sum, s) => sum + s.price, 0),
        goodsInTransit: shipments.filter(s => ['assigned', 'out_for_delivery', 'pending'].includes(s.status)).reduce((sum, s) => sum + s.price, 0),
    };

    return (
        <motion.div 
            variants={pageVariants} 
            initial="initial" 
            animate="animate" 
            className="space-y-6"
        >
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate('/sellers')} className="rounded-full">
                    <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
                </Button>
                <div>
                    <h2 className="text-2xl font-bold">{seller.storeName}</h2>
                    <p className="text-muted-foreground text-sm flex items-center gap-1">
                        <Users className="w-3 h-3" /> {t[seller.status]} • {seller.address || 'لا يوجد عنوان'}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Information Card */}
                <Card className="lg:col-span-1 border-none shadow-sm bg-card/50 backdrop-blur">
                    <CardHeader>
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                             بيانات المتجر
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                <Phone className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">{t.phone}</p>
                                <p className="font-mono-nums font-semibold">{seller.phone}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                <MapPin className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">{t.address}</p>
                                <p className="font-semibold text-sm">{seller.address || '—'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                <Calendar className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">{t.joinDate}</p>
                                <p className="font-mono-nums font-semibold">{formatDateTime(seller.joinDate, lang)}</p>
                            </div>
                        </div>
                        {userRole && (
                             <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                    <TrendingUp className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">البريد الإلكتروني</p>
                                    <p className="font-semibold text-sm">{userRole.email}</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Statistics Cards */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: t.total, value: stats.total, icon: Package, color: 'blue' },
                            { label: t.delivered, value: stats.delivered, icon: CheckCircle, color: 'emerald' },
                            { label: t.pending, value: stats.pending, icon: Clock, color: 'amber' },
                            { label: t.returned, value: stats.returned, icon: Package, color: 'rose' },
                        ].map((stat, i) => (
                            <motion.div 
                                key={i}
                                variants={cardVariants}
                                className="bg-card p-4 rounded-2xl border flex flex-col items-center text-center"
                            >
                                <div className={`p-2 rounded-xl bg-${stat.color}-500/10 text-${stat.color}-500 mb-2`}>
                                    <stat.icon className="w-5 h-5" />
                                </div>
                                <p className="text-2xl font-bold font-mono-nums">{stat.value}</p>
                                <p className="text-[10px] text-muted-foreground uppercase font-bold">{stat.label}</p>
                            </motion.div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card className="border-none shadow-sm bg-emerald-500/5">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-bold text-emerald-600 uppercase flex items-center justify-between">
                                    {t.sellerWallet}
                                    <Wallet className="w-4 h-4 opacity-50" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-3xl font-black font-mono-nums text-emerald-600">
                                    {formatCurrency(stats.pendingSettlement)} <span className="text-sm">ج.م</span>
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">مستحقات أرباح تنتظر التسوية للتاجر</p>
                            </CardContent>
                        </Card>
                        <Card className="border-none shadow-sm bg-primary/5">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-bold text-primary uppercase flex items-center justify-between">
                                    بضاعة بالطريق
                                    <Package className="w-4 h-4 opacity-50" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-3xl font-black font-mono-nums text-primary">
                                    {formatCurrency(stats.goodsInTransit)} <span className="text-sm">ج.م</span>
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">إجمالي قيمة الشحنات قيد التنفيذ</p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Shipments */}
                <Card className="border-none shadow-sm overflow-hidden bg-card/50">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                             <TrendingUp className="w-5 h-5 text-primary" /> أحدث الشحنات
                        </CardTitle>
                        <Button variant="outline" size="sm" onClick={() => navigate('/shipments', { state: { sellerId: id } })}>عرض الكل</Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y">
                            {shipments.slice(0, 5).map(s => (
                                <div key={s.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                                    <div className="flex gap-3 items-center">
                                        <div className={`w-2 h-2 rounded-full ${s.status === 'delivered' ? 'bg-success' : 'bg-primary'}`} />
                                        <div>
                                            <p className="font-semibold text-sm">{s.customerName}</p>
                                            <p className="text-[10px] text-muted-foreground font-mono-nums">{s.trackingId}</p>
                                        </div>
                                    </div>
                                    <div className="text-end">
                                        <p className="font-bold text-sm font-mono-nums">{formatCurrency(s.price)} ج</p>
                                        <button 
                                            onClick={() => navigate(`/shipments/${s.id}`)}
                                            className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                                        >
                                            <ExternalLink className="w-3 h-3" /> التفاصيل
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {shipments.length === 0 && <p className="p-8 text-center text-muted-foreground text-sm">{t.noShipments}</p>}
                        </div>
                    </CardContent>
                </Card>

                {/* Settlement History */}
                <Card className="border-none shadow-sm overflow-hidden bg-card/50">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                             <Wallet className="w-5 h-5 text-emerald-500" /> {t.historyTransactions}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                         <div className="divide-y">
                            {settlements.slice(0, 5).map(s => (
                                <div key={s.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                                    <div>
                                        <p className="font-bold text-emerald-600 font-mono-nums">دفع {formatCurrency(s.amount)} ج</p>
                                        <p className="text-[10px] text-muted-foreground">تسوية {s.shipmentCount} شحنات</p>
                                    </div>
                                    <div className="text-end">
                                        <p className="text-xs font-mono-nums">{formatDateTime(s.date, lang)}</p>
                                        <p className="text-[10px] text-muted-foreground">بواسطة: {s.adminName}</p>
                                    </div>
                                </div>
                            ))}
                            {settlements.length === 0 && <p className="p-8 text-center text-muted-foreground text-sm">{t.noHistory}</p>}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </motion.div>
    );
};

export default SellerProfilePage;
