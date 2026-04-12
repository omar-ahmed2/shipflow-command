import React, { useState, useMemo } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { db } from '@/db';
import { generateId, now } from '@/db/helpers';
import type { Courier, Seller, Shipment, Settlement } from '@/db/schema';
import { formatCurrency, formatDateTime } from '@/utils/formatters';
import { 
  Wallet, 
  Truck, 
  Store, 
  CheckCircle, 
  Clock, 
  Package, 
  Receipt,
  Search,
  Filter
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
    const { t, lang } = useTheme();
    const navigate = useNavigate();
    const [refresh, setRefresh] = useState(0);
    const [search, setSearch] = useState('');

    const couriers = useMemo(() => db.getAll<Courier>('couriers'), [refresh]);
    const sellers = useMemo(() => db.getAll<Seller>('sellers'), [refresh]);
    const shipments = useMemo(() => db.getAll<Shipment>('shipments'), [refresh]);
    const settlements = useMemo(() => db.getAll<Settlement>('settlements').sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [refresh]);

    // Courier Stats Calculation
    const courierData = useMemo(() => {
        return couriers.map(c => {
            const cs = shipments.filter(s => s.courierId === c.id);
            const pendingShipments = cs.filter(s => s.status === 'delivered' && s.paymentType === 'COD' && !s.codCollected && s.price > 0);
            const pendingAmount = pendingShipments.reduce((sum, s) => sum + s.price + (s.shippingFee || 0), 0);
            const transitAmount = cs.filter(s => ['assigned', 'out_for_delivery'].includes(s.status)).reduce((sum, s) => sum + s.price + (s.shippingFee || 0), 0);
            
            return {
                ...c,
                pendingAmount,
                pendingShipments,
                transitAmount,
                totalCustody: pendingAmount + transitAmount
            };
        }).filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => b.pendingAmount - a.pendingAmount);
    }, [couriers, shipments, search, refresh]);

    // Seller Stats Calculation
    const sellerData = useMemo(() => {
        return sellers.map(s => {
            const ss = shipments.filter(ship => ship.sellerId === s.id);
            const pendingSettlements = ss.filter(ship => ship.status === 'delivered' && !ship.sellerSettled);
            const pendingAmount = pendingSettlements.reduce((sum, ship) => sum + ship.price, 0);
            const transitValue = ss.filter(ship => ['assigned', 'out_for_delivery', 'pending'].includes(ship.status)).reduce((sum, ship) => sum + ship.price, 0);

            return {
                ...s,
                pendingAmount,
                pendingSettlements,
                transitValue
            };
        }).filter(s => !search || s.storeName.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => b.pendingAmount - a.pendingAmount);
    }, [sellers, shipments, search, refresh]);

    const handleCourierSettle = (courier: any) => {
        if (courier.pendingAmount <= 0) return toast.info("لا توجد نقدية للتوريد حالياً.");

        courier.pendingShipments.forEach((s: Shipment) => {
            db.update('shipments', s.id, { codCollected: true });
        });

        db.create<Settlement>('settlements', {
            id: generateId('STL'),
            courierId: courier.id,
            amount: courier.pendingAmount,
            shipmentCount: courier.pendingShipments.length,
            date: now(),
            adminName: 'Admin',
        } as Settlement, 'STL');

        toast.success(`تم استلام ${formatCurrency(courier.pendingAmount)} ج من ${courier.name}`);
        setRefresh(r => r + 1);
    };

    const handleSellerSettle = (seller: any) => {
        if (seller.pendingAmount <= 0) return toast.info("لا توجد مستحقات للتاجر حالياً.");

        seller.pendingSettlements.forEach((s: Shipment) => {
            db.update('shipments', s.id, { sellerSettled: true });
        });

        db.create<Settlement>('settlements', {
            id: generateId('STL'),
            sellerId: seller.id,
            amount: seller.pendingAmount,
            shipmentCount: seller.pendingSettlements.length,
            date: now(),
            adminName: 'Admin',
        } as Settlement, 'STL');

        toast.success(`تم تسوية ${formatCurrency(seller.pendingAmount)} ج لـ ${seller.storeName}`);
        setRefresh(r => r + 1);
    };

    return (
        <motion.div variants={pageVariants} initial="initial" animate="animate" className="space-y-6">
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
                        className="ps-9 rounded-xl shadow-sm"
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
                                            <div onClick={() => navigate(`/couriers/${c.id}`)} className="cursor-pointer hover:underline">
                                                <CardTitle className="text-lg">{c.name}</CardTitle>
                                                <p className="text-xs text-muted-foreground">{c.phone} • {c.zone}</p>
                                            </div>
                                            <div className="p-2 bg-primary/10 rounded-full">
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
                                            disabled={c.pendingAmount === 0}
                                            className="w-full rounded-xl gap-2 font-bold"
                                        >
                                            <CheckCircle className="w-4 h-4" /> {t.confirmCollection}
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
                                            <div onClick={() => navigate(`/sellers/${s.id}`)} className="cursor-pointer hover:underline">
                                                <CardTitle className="text-lg">{s.storeName}</CardTitle>
                                                <p className="text-xs text-muted-foreground">{s.phone} • {s.address || '—'}</p>
                                            </div>
                                            <div className="p-2 bg-emerald-500/10 rounded-full">
                                                <Store className="w-5 h-5 text-emerald-600" />
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex justify-between items-center p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                                            <div className="flex items-center gap-2">
                                                <Receipt className="w-4 h-4 text-emerald-600" />
                                                <span className="text-xs font-bold text-emerald-600 uppercase">أرباح معلقة</span>
                                            </div>
                                            <span className="text-xl font-black font-mono-nums text-emerald-600">
                                                {formatCurrency(s.pendingAmount)}
                                            </span>
                                        </div>
                                        
                                        <div className="text-center p-2 rounded-lg bg-muted/30">
                                            <p className="text-xs text-muted-foreground mb-1">مبيعات قيد التنفيذ بالطريق</p>
                                            <p className="font-bold font-mono-nums text-sm">{formatCurrency(s.transitValue)} ج.م</p>
                                        </div>

                                        <Button 
                                            variant="secondary"
                                            onClick={() => handleSellerSettle(s)}
                                            disabled={s.pendingAmount === 0}
                                            className="w-full rounded-xl gap-2 font-bold bg-emerald-600 text-white hover:bg-emerald-700"
                                        >
                                            <CheckCircle className="w-4 h-4" /> تسوية الأرباح للتاجر
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
