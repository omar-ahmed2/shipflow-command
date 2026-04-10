import React, { useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { db } from '@/db';
import type { Shipment } from '@/db/schema';
import { EmptyState } from '@/components/shared/EmptyState';
import { Wallet, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/utils/formatters';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { cardVariants, pageVariants } from '@/animations/variants';
import CountUp from 'react-countup';

const CourierCODPage: React.FC = () => {
  const { courierProfile } = useAuth();
  const { t } = useTheme();
  const [refresh, setRefresh] = useState(0);

  const codShipments = useMemo(() => {
    if (!courierProfile) return [];
    return db.query<Shipment>('shipments', s =>
      s.courierId === courierProfile.id && s.paymentType === 'COD' && s.status !== 'cancelled'
    );
  }, [courierProfile, refresh]);

  const expected = codShipments.reduce((s, sh) => s + sh.price, 0);
  const collected = codShipments.filter(s => s.codCollected).reduce((s, sh) => s + sh.price, 0);

  const confirmCollection = (id: string) => {
    db.update('shipments', id, { codCollected: true });
    setRefresh(r => r + 1);
    toast.success(t.collectionConfirmed);
  };

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="space-y-4">
      <h2 className="text-lg font-bold">{t.myCOD}</h2>
      <div className="grid grid-cols-2 gap-3">
        <motion.div custom={0} variants={cardVariants} initial="initial" animate="animate" className="courier-card p-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2" style={{ background: 'rgba(167,139,250,0.15)' }}>
            <Wallet className="w-4 h-4" style={{ color: '#A78BFA' }} />
          </div>
          <p className="text-xl font-bold font-mono-nums"><CountUp end={expected} duration={1.2} separator="," /></p>
          <p className="text-[11px] text-muted-foreground">{t.expectedAmount}</p>
        </motion.div>
        <motion.div custom={1} variants={cardVariants} initial="initial" animate="animate" className="courier-card p-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2" style={{ background: 'rgba(16,185,129,0.15)' }}>
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
              className="courier-card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono-nums text-xs text-muted-foreground">{s.trackingId}</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                  style={s.codCollected
                    ? { background: 'rgba(16,185,129,0.1)', color: '#10B981' }
                    : { background: 'rgba(245,158,11,0.1)', color: '#F59E0B' }}>
                  {s.codCollected ? t.collected : t.notCollected}
                </span>
              </div>
              <p className="text-sm">{s.customerName}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="font-mono-nums font-bold">{formatCurrency(s.price)} {t.egp}</span>
                {!s.codCollected && s.status === 'delivered' && (
                  <motion.div whileTap={{ scale: 0.95 }}>
                    <Button size="sm" className="rounded-xl h-8" onClick={() => confirmCollection(s.id)}>
                      {t.confirmCollection}
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
