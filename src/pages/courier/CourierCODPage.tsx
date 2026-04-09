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
    <div className="space-y-4 animate-slide-up">
      <h2 className="text-lg font-bold">{t.myCOD}</h2>
      <div className="grid grid-cols-2 gap-3">
        <div className="courier-card p-4">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
            <Wallet className="w-4 h-4 text-primary" />
          </div>
          <p className="text-xl font-bold font-mono-nums">{formatCurrency(expected)}</p>
          <p className="text-[11px] text-muted-foreground">{t.expectedAmount}</p>
        </div>
        <div className="courier-card p-4">
          <div className="w-9 h-9 rounded-xl bg-success/10 flex items-center justify-center mb-2">
            <CheckCircle className="w-4 h-4 text-success" />
          </div>
          <p className="text-xl font-bold font-mono-nums">{formatCurrency(collected)}</p>
          <p className="text-[11px] text-muted-foreground">{t.collectedAmount}</p>
        </div>
      </div>

      {codShipments.length === 0 ? (
        <EmptyState title={t.noDataYet} />
      ) : (
        <div className="space-y-3">
          {codShipments.map(s => (
            <div key={s.id} className="courier-card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono-nums text-xs">{s.trackingId}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs ${s.codCollected ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                  {s.codCollected ? t.collected : t.notCollected}
                </span>
              </div>
              <p className="text-sm">{s.customerName}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="font-mono-nums font-bold">{formatCurrency(s.price)} {t.egp}</span>
                {!s.codCollected && s.status === 'delivered' && (
                  <Button size="sm" className="rounded-xl h-8" onClick={() => confirmCollection(s.id)}>
                    {t.confirmCollection}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CourierCODPage;
