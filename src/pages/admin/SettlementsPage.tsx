import React, { useState, useMemo } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { now } from '@/db/helpers';
import type { Shipment } from '@/db/schema';
import { formatCurrency } from '@/utils/formatters';
import { 
  Wallet, 
  Truck, 
  Store, 
  CheckCircle, 
  Package, 
  Receipt,
  Search,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { pageVariants, cardVariants } from '@/animations/variants';
import { useNavigate } from 'react-router-dom';

const SettlementsPage: React.FC = () => {
    const { t } = useTheme();
    const { user } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [isSettling, setIsSettling] = useState<string | null>(null);

    // Queries
    const { data: couriers = [], isLoading: couriersLoading } = useQuery({ queryKey: ['couriers'], queryFn: api.couriers.getAll });
    const { data: sellers = [], isLoading: sellersLoading } = useQuery({ queryKey: ['sellers'], queryFn: api.sellers.getAll });
    const { data: shipments = [], isLoading: shipmentsLoading } = useQuery({ queryKey: ['shipments'], queryFn: api.shipments.getAll });

    // Courier Stats Calculation
    const courierData = useMemo(() => {
        return couriers.map(c => {
            const cs = shipments.filter(s => s.courierId === c.id);
            const pendingShipments = cs.filter(s => s.status === 'delivered' && s.paymentType === 'COD' && !s.codCollected);
            const pendingAmount = pendingShipments.reduce((sum, s) => sum + s.price + (s.shippingFee || 0), 0);
            const transitAmount = cs.filter(s => ['assigned', 'out_for_delivery'].includes(s.status) && s.paymentType === 'COD').reduce((sum, s) => sum + s.price + (s.shippingFee || 0), 0);
            
            return {
                ...c,
                pendingAmount,
                pendingShipments,
                transitAmount,
                totalCustody: pendingAmount + transitAmount
            };
        }).filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => b.pendingAmount - a.pendingAmount);
    }, [couriers, shipments, search]);

    // Seller Stats Calculation
    const sellerData = useMemo(() => {
        return sellers.map(s => {
            const ss = shipments.filter(ship => ship.sellerId === s.id);
            const pendingSettlements = ss.filter(ship => ['delivered', 'returned'].includes(ship.status) && !ship.sellerSettled);
            
            const pendingAmount = pendingSettlements.reduce((sum, ship) => {
                let amount = 0;
                if (ship.status === 'delivered') {
                    if (ship.paymentType === 'COD') amount = ship.price;
                    else amount = -(ship.shippingFee || 0); // Paid online
                } else if (ship.status === 'returned') {
                    amount = -(ship.shippingFee || 0); // Returned
                }
                return sum + amount;
            }, 0);

            const transitValue = ss.filter(ship => ['assigned', 'out_for_delivery', 'pending'].includes(ship.status)).reduce((sum, ship) => sum + ship.price, 0);

            return {
                ...s,
                pendingAmount,
                pendingSettlements,
                transitValue
            };
        }).filter(s => !search || s.storeName.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => b.pendingAmount - a.pendingAmount);
    }, [sellers, shipments, search]);

    const handleCourierSettle = async (courier: any) => {
        if (courier.pendingAmount <= 0) return toast.info("لا توجد نقدية للتوريد حالياً.");
        setIsSettling(courier.id);

        try {
            const shipmentIds = courier.pendingShipments.map((s: Shipment) => s.id);
            await api.shipments.bulkUpdate(shipmentIds, { codCollected: true, updatedAt: now() });

            await api.settlements.create({
                courierId: courier.id,
                amount: courier.pendingAmount,
                shipmentCount: courier.pendingShipments.length,
                date: now(),
                adminId: user?.id || 'admin',
                adminName: user?.name || 'Admin'
            });

            toast.success(`تم استلام ${formatCurrency(courier.pendingAmount)} ج من ${courier.name}`);
            queryClient.invalidateQueries({ queryKey: ['shipments'] });
            queryClient.invalidateQueries({ queryKey: ['settlements'] });
        } catch (error) {
            toast.error('حدث خطأ أثناء التوريد');
        } finally {
            setIsSettling(null);
        }
    };

    const handleSellerSettle = async (seller: any) => {
        if (seller.pendingAmount === 0 && seller.pendingSettlements.length === 0) return toast.info("لا توجد مستحقات للتاجر حالياً.");
        setIsSettling(seller.id);

        try {
            const shipmentIds = seller.pendingSettlements.map((s: Shipment) => s.id);
            await api.shipments.bulkUpdate(shipmentIds, { sellerSettled: true, updatedAt: now() });

            await api.settlements.create({
                sellerId: seller.id,
                amount: seller.pendingAmount,
                shipmentCount: seller.pendingSettlements.length,
                date: now(),
                adminId: user?.id || 'admin',
                adminName: user?.name || 'Admin'
            });

            if (seller.pendingAmount >= 0) {
                toast.success(`تم تسوية ${formatCurrency(seller.pendingAmount)} ج لـ ${seller.storeName}`);
            } else {
                toast.success(`تم تحصيل ${formatCurrency(Math.abs(seller.pendingAmount))} ج من ${seller.storeName} نظير شحنات مدفوعة/مرتجعة`);
            }
            queryClient.invalidateQueries({ queryKey: ['shipments'] });
            queryClient.invalidateQueries({ queryKey: ['settlements'] });
        } catch (error) {
            toast.error('حدث خطأ أثناء التسوية');
        } finally {
            setIsSettling(null);
        }
    };

    if (couriersLoading || sellersLoading || shipmentsLoading) return (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">جاري تحميل بيانات التسويات...</p>
        </div>
    );

    return (
        <motion.div variants={pageVariants} initial="initial" animate="animate" dir="rtl" className="space-y-6 text-right">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold">{t.settlementsHub}</h2>
                    <p className="text-muted-foreground text-sm">إدارة التحصيلات المالية من المناديب والتسويات للمتاجر</p>
                </div>
                <div className="relative w-full md:w-72">
                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                        placeholder="بحث بالاسم..." 
                        value={search} 
                        onChange={e => setSearch(e.target.value)} 
                        className="ps-9 rounded-xl shadow-sm text-right"
                        dir="rtl"
                    />
                </div>
            </div>

            <Tabs defaultValue="couriers" className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-2 mb-6 p-1 bg-muted/50 rounded-xl">
                    <TabsTrigger value="couriers" className="rounded-lg gap-2">
                        <Truck className="w-4 h-4" /> {t.couriersSettlement}
                    </TabsTrigger>
                    <TabsTrigger value="sellers" className="rounded-lg gap-2">
                        <Store className="w-4 h-4" /> {t.sellersSettlement}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="couriers" className="animate-in fade-in slide-in-from-bottom-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {courierData.map(c => (
                            <motion.div key={c.id} variants={cardVariants} initial="initial" animate="animate">
                                <Card className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow group">
                                    <div className="h-2 bg-primary/20 group-hover:bg-primary/40 transition-colors" />
                                    <CardHeader className="pb-3">
                                        <div className="flex justify-between items-start">
                                            <div onClick={() => navigate(`/couriers/${c.id}`)} className="cursor-pointer hover:underline text-start">
                                                <CardTitle className="text-lg">{c.name}</CardTitle>
                                                <p className="text-xs text-muted-foreground">{c.phone} • {c.zone}</p>
                                            </div>
                                            <div className="p-2 bg-primary/10 rounded-full flex-shrink-0">
                                                <Truck className="w-5 h-5 text-primary" />
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex justify-between items-center p-3 bg-orange-500/5 rounded-xl border border-orange-500/10">
                                            <div className="flex items-center gap-2">
                                                <Wallet className="w-4 h-4 text-orange-600" />
                                                <span className="text-xs font-bold text-orange-600 uppercase">نقدية جاهزة</span>
                                            </div>
                                            <span className="text-xl font-black font-mono-nums text-orange-600">
                                                {formatCurrency(c.pendingAmount)}
                                            </span>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="text-center p-2 rounded-lg bg-muted/30">
                                                <p className="text-xs text-muted-foreground mb-1">بضاعة بالطريق</p>
                                                <p className="font-bold font-mono-nums text-sm">{formatCurrency(c.transitAmount)}</p>
                                            </div>
                                            <div className="text-center p-2 rounded-lg bg-muted/30">
                                                <p className="text-xs text-muted-foreground mb-1">إجمالي العهدة</p>
                                                <p className="font-bold font-mono-nums text-sm">{formatCurrency(c.totalCustody)}</p>
                                            </div>
                                        </div>

                                        <Button 
                                            onClick={() => handleCourierSettle(c)}
                                            disabled={c.pendingAmount === 0 || isSettling === c.id}
                                            className="w-full rounded-xl gap-2 font-bold"
                                        >
                                            {isSettling === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                            {t.confirmCollection}
                                        </Button>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="sellers" className="animate-in fade-in slide-in-from-bottom-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sellerData.map(s => (
                            <motion.div key={s.id} variants={cardVariants} initial="initial" animate="animate">
                                <Card className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow group">
                                    <div className="h-2 bg-emerald-500/20 group-hover:bg-emerald-500/40 transition-colors" />
                                    <CardHeader className="pb-3">
                                        <div className="flex justify-between items-start">
                                            <div onClick={() => navigate(`/sellers/${s.id}`)} className="cursor-pointer hover:underline text-start">
                                                <CardTitle className="text-lg">{s.storeName}</CardTitle>
                                                <p className="text-xs text-muted-foreground">{s.phone} • {s.address || '—'}</p>
                                            </div>
                                            <div className="p-2 bg-emerald-500/10 rounded-full flex-shrink-0">
                                                <Store className="w-5 h-5 text-emerald-600" />
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className={`flex justify-between items-center p-3 rounded-xl border ${s.pendingAmount >= 0 ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-destructive/5 border-destructive/10'}`}>
                                            <div className="flex items-center gap-2">
                                                <Receipt className={`w-4 h-4 ${s.pendingAmount >= 0 ? 'text-emerald-600' : 'text-destructive'}`} />
                                                <span className={`text-xs font-bold uppercase ${s.pendingAmount >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                                                    {s.pendingAmount >= 0 ? 'أرباح معلقة' : 'مستحقات على التاجر'}
                                                </span>
                                            </div>
                                            <span className={`text-xl font-black font-mono-nums ${s.pendingAmount >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                                                {formatCurrency(Math.abs(s.pendingAmount))}
                                            </span>
                                        </div>
                                        
                                        <div className="text-center p-2 rounded-lg bg-muted/30">
                                            <p className="text-xs text-muted-foreground mb-1">مبيعات قيد التنفيذ بالطريق</p>
                                            <p className="font-bold font-mono-nums text-sm">{formatCurrency(s.transitValue)} ج.م</p>
                                        </div>

                                        <Button 
                                            variant={s.pendingAmount >= 0 ? "secondary" : "destructive"}
                                            onClick={() => handleSellerSettle(s)}
                                            disabled={(s.pendingAmount === 0 && s.pendingSettlements.length === 0) || isSettling === s.id}
                                            className={`w-full rounded-xl gap-2 font-bold ${s.pendingAmount >= 0 ? 'bg-emerald-600 text-white hover:bg-emerald-700' : ''}`}
                                        >
                                            {isSettling === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                            {s.pendingAmount >= 0 ? 'تسوية الأرباح للتاجر' : 'تحصيل المديونية من التاجر'}
                                        </Button>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </TabsContent>
            </Tabs>
        </motion.div>
    );
};

export default SettlementsPage;
