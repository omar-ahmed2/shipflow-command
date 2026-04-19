import { useTheme } from '@/context/ThemeContext';
import { CircleDollarSign, Wallet, RotateCcw } from 'lucide-react';
import type { Shipment } from '@/db/schema';

export const FinanceBadge = ({ shipment }: { shipment: any }) => {
  const { t } = useTheme();

  // Green: Delivered to merchant (seller settled)
  if (shipment.sellerSettled) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shadow-sm">
        <CircleDollarSign size={10} />
        {t.deliveredToMerchant}
      </span>
    );
  }

  // Yellow: Amount with courier (Delivered, but COD not collected by company yet)
  if (shipment.status === 'delivered' && shipment.paymentType === 'COD' && !shipment.codCollected) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20 shadow-sm">
        <Wallet size={10} />
        {t.withCourier}
      </span>
    );
  }

  // Red: Returned, waiting for shipping fee (not settled yet)
  if (shipment.status === 'returned' && !shipment.sellerSettled) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20 shadow-sm">
        <RotateCcw size={10} />
        {t.returnedWaitingFee}
      </span>
    );
  }

  return null;
};
