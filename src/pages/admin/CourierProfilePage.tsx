import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/utils/formatters';
import { 
  Truck, 
  Phone, 
  MapPin, 
  Calendar, 
  Package, 
  CheckCircle, 
  XCircle, 
  TrendingUp, 
  Wallet,
  ArrowLeft,
  Clock,
  ExternalLink,
  Trash2,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { pageVariants, cardVariants } from '@/animations/variants';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { toast } from 'sonner';

const CourierProfilePage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { t, lang } = useTheme();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

    // Queries
    const { data: courier, isLoading: courierLoading } = useQuery({
        queryKey: ['courier', id],
        queryFn: () => api.couriers.getById(id!),
        enabled: !!id
    });

    const { data: userProfile, isLoading: userLoading } = useQuery({
        queryKey: ['user', courier?.userId],
        queryFn: () => api.users.getById(courier!.userId),
        enabled: !!courier?.userId
    });

    const { data: shipments = [], isLoading: shipmentsLoading } = useQuery<any[]>({
        queryKey: ['shipments', 'courier', id],
        queryFn: () => api.shipments.getByCourierId(id!),
        enabled: !!id
    });

    const { data: settlements = [], isLoading: settlementsLoading } = useQuery<any[]>({
        queryKey: ['settlements', 'courier', id],
        queryFn: () => api.settlements.getByCourierId(id!),
        enabled: !!id
    });

    const isLoading = courierLoading || userLoading || shipmentsLoading || settlementsLoading;

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">جاري تحميل بيانات المندوب...</p>
            </div>
        );
    }

    if (!courier) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh]">
                <p className="text-muted-foreground mb-4">المندوب غير موجود</p>
                <Button onClick={() => navigate('/couriers')}>العودة للمناديب</Button>
            </div>
        );
    }

    const stats = {
        total: shipments.length,
        delivered: shipments.filter(s => s.status === 'delivered').length,
        returned: shipments.filter(s => s.status === 'returned').length,
        cancelled: shipments.filter(s => s.status === 'cancelled').length,
        pending: shipments.filter(s => ['assigned', 'out_for_delivery'].includes(s.status)).length,
        successRate: shipments.length > 0 ? Math.round((shipments.filter(s => s.status === 'delivered').length / shipments.length) * 100) : 0,
        
        // Financials
        cashReady: shipments.filter(s => s.status === 'delivered' && s.paymentType === 'COD' && !s.codCollected).reduce((sum, s) => sum + s.price + (s.shippingFee || 0), 0),
        goodsInTransit: shipments.filter(s => ['assigned', 'out_for_delivery'].includes(s.status)).reduce((sum, s) => sum + s.price + (s.shippingFee || 0), 0),
    };

    const handleDelete = async () => {
        try {
            await api.users.delete(courier.userId); // This cascades to couriers table
            queryClient.invalidateQueries({ queryKey: ['couriers'] });
            toast.success('تم حذف المندوب وكل بياناته بنجاح');
            navigate('/couriers');
        } catch (err) {
            toast.error('حدث خطأ أثناء محاولة الحذف');
        }
    };

    return (
        <motion.div 
            variants={pageVariants} 
            initial="initial" 
            animate="animate" 
            className="space-y-6"
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/couriers')} className="rounded-full">
                        <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
                    </Button>
                    <div>
                        <h2 className="text-2xl font-bold">{courier.name}</h2>
                        <p className="text-muted-foreground text-sm flex items-center gap-1">
                            <Truck className="w-3 h-3" /> {t[courier.status]} • {courier.zone}
                        </p>
                    </div>
                </div>
                <Button variant="destructive" size="sm" onClick={() => setIsDeleteDialogOpen(true)} className="rounded-xl">
                    <Trash2 className="w-4 h-4 me-2" /> حذف المندوب
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Information Card */}
                <Card className="lg:col-span-1 border-none shadow-sm bg-card/50 backdrop-blur">
                    <CardHeader>
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                             بيانات الاتصال
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                <Phone className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">{t.phone}</p>
                                <p className="font-mono-nums font-semibold">{courier.phone}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                <MapPin className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">{t.zone}</p>
                                <p className="font-semibold">{courier.zone}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                <Calendar className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">{t.joinDate}</p>
                                <p className="font-mono-nums font-semibold">{formatDateTime(courier.joinDate, lang)}</p>
                            </div>
                        </div>
                        {userProfile && (
                             <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                    <TrendingUp className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">البريد الإلكتروني</p>
                                    <p className="font-semibold">{userProfile.email}</p>
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
                            { label: t.returned, value: stats.returned, icon: XCircle, color: 'rose' },
                            { label: t.successRate, value: `${stats.successRate}%`, icon: TrendingUp, color: 'amber' },
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
                        <Card className="border-none shadow-sm bg-orange-500/5">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-bold text-orange-600 uppercase flex items-center justify-between">
                                    {t.cashReady}
                                    <Wallet className="w-4 h-4 opacity-50" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-3xl font-black font-mono-nums text-orange-600">
                                    {formatCurrency(stats.cashReady)} <span className="text-sm">ج.م</span>
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">نقدية محصلة تنتظر التوريد</p>
                            </CardContent>
                        </Card>
                        <Card className="border-none shadow-sm bg-primary/5">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-bold text-primary uppercase flex items-center justify-between">
                                    {t.goodsInTransit}
                                    <Package className="w-4 h-4 opacity-50" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-3xl font-black font-mono-nums text-primary">
                                    {formatCurrency(stats.goodsInTransit)} <span className="text-sm">ج.م</span>
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">قيمة الشحنات التي لم تسلم بعد</p>
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
                            <Clock className="w-5 h-5 text-primary" /> {t.latestShipments}
                        </CardTitle>
                        <Button variant="outline" size="sm" onClick={() => navigate('/shipments', { state: { courierId: id } })}>عرض الكل</Button>
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
                                        <p className="font-bold text-sm font-mono-nums">{formatCurrency(s.price + (s.shippingFee || 0))} ج</p>
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
                                        <p className="font-bold text-emerald-600 font-mono-nums">+ {formatCurrency(s.amount)} ج</p>
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
            
            <ConfirmDialog 
                open={isDeleteDialogOpen} 
                onOpenChange={setIsDeleteDialogOpen} 
                title="حذف المندوب نهائياً؟" 
                description={`هل أنت متأكد من رغبتك في حذف المندوب "${courier.name}"؟ سيتم حذف حساب الدخول الخاص به وإلغاء تعيينه من كافة الشحنات. لا يمكن التراجع عن هذا الإجراء.`}
                onConfirm={handleDelete}
            />
        </motion.div>
    );
};

export default CourierProfilePage;
