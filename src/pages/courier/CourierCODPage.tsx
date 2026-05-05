import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { EmptyState } from '@/components/shared/EmptyState';
import { Wallet, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/utils/formatters';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { cardVariants, pageVariants } from '@/animations/variants';
import CountUp from 'react-countup';

const CourierCODPage: React.FC = () => {
  const { courierProfile } = useAuth();
  const { t } = useTheme();
  const queryClient = useQueryClient();

  const { data: shipments = [], isLoading } = useQuery({
    queryKey: ['courier_shipments', courierProfile?.id],
    queryFn: () => courierProfile?.id ? api.shipments.getByCourierId(courierProfile.id) : Promise.resolve([]),
    enabled: !!courierProfile?.id
  });

  const codShipments = shipments.filter(s => 
    s.paymentType === 'COD' && s.status === 'delivered'
  );

  const expected = codShipments.reduce((s, sh) => s + sh.price + (sh.shippingFee || 0), 0);
  const collected = codShipments.filter(s => s.courierCollected).reduce((s, sh) => s + sh.price + (sh.shippingFee || 0), 0);

  const confirmCollection = async (id: string) => {
    try {
        await api.shipments.update(id, { courierCollected: true });
        queryClient.invalidateQueries({ queryKey: ['courier_shipments', courierProfile?.id] });
        toast.success(t.collectionConfirmed);
    } catch (err: any) {
        toast.error(err.message || 'حدث خطأ');
    }
  };

  if (isLoading) {
    return (
        <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-muted-foreground animate-pulse">جاري تحميل مبالغ التحصيل...</p>
        </div>
    );
  }

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="space-y-4" dir="rtl">
      <h2 className="text-lg font-bold text-right">{t.myCOD}</h2>
      <div className="grid grid-cols-2 gap-3">
        <motion.div custom={0} variants={cardVariants} initial="initial" animate="animate" className="courier-card p-4 text-right">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2 mx-0 ms-auto" style={{ background: 'rgba(167,139,250,0.15)' }}>
            <Wallet className="w-4 h-4" style={{ color: '#A78BFA' }} />
          </div>
          <p className="text-xl font-bold font-mono-nums"><CountUp end={expected} duration={1.2} separator="," /></p>
          <p className="text-[11px] text-muted-foreground">{t.expectedAmount}</p>
        </motion.div>
        <motion.div custom={1} variants={cardVariants} initial="initial" animate="animate" className="courier-card p-4 text-right">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2 mx-0 ms-auto" style={{ background: 'rgba(16,185,129,0.15)' }}>
            <CheckCircle className="w-4 h-4" style={{ color: '#10B981' }} />
          </div>
          <p className="text-xl font-bold font-mono-nums"><CountUp end={collected} duration={1.2} separator="," /></p>
          <p className="text-[11px] text-muted-foreground">{t.collectedAmount}</p>
        </motion.div>
      </div>

      {codShipments.length === 0 ? (
        <EmptyState title={t.noDataYet} />
      ) : (
        <div className="space-y-3">
          {codShipments.map((s, i) => (
            <motion.div key={s.id} custom={i} variants={cardVariants} initial="initial" animate="animate"
              className="courier-card p-4 text-right">
              <div className="flex items-center justify-between mb-3 flex-row-reverse">
                <span className="font-mono-nums text-xs text-muted-foreground tracking-tight">{s.trackingId}</span>
                <span className="px-3 py-1 rounded-full text-[11px] font-bold"
                  style={s.courierCollected
                    ? { background: 'rgba(16,185,129,0.1)', color: '#10B981' }
                    : { background: 'rgba(245,158,11,0.1)', color: '#F59E0B' }}>
                  {s.courierCollected ? t.collected : t.notCollected}
                </span>
              </div>
              <p className="text-sm font-medium">{s.customerName}</p>
              <div className="flex items-center justify-between mt-3 flex-row-reverse">
                <span className="font-mono-nums font-black text-primary">{formatCurrency(s.price + (s.shippingFee || 0))} {t.egp}</span>
                {s.status === 'delivered' && (
                  <motion.div whileTap={!s.courierCollected ? { scale: 0.95 } : {}}>
                    <Button 
                      size="sm" 
                      className={`rounded-xl h-8 px-4 font-bold transition-all ${
                        s.courierCollected 
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/10 cursor-default' 
                          : 'shadow-lg shadow-primary/25'
                      }`}
                      variant={s.courierCollected ? 'outline' : 'default'}
                      disabled={s.courierCollected}
                      onClick={() => !s.courierCollected && confirmCollection(s.id)}
                    >
                      {s.courierCollected ? (
                        <span className="flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5" />
                          تم التحصيل
                        </span>
                      ) : t.confirmCollection}
                    </Button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default CourierCODPage;
