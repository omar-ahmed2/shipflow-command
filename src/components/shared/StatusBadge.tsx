import { useTheme } from '@/context/ThemeContext';
import type { ShipmentStatus } from '@/db/schema';

const statusColors: Record<ShipmentStatus, string> = {
  pending: 'bg-warning/15 text-warning border-warning/30',
  assigned: 'bg-accent/15 text-accent border-accent/30',
  out_for_delivery: 'bg-primary/15 text-primary border-primary/30',
  delivered: 'bg-success/15 text-success border-success/30',
  returned: 'bg-destructive/15 text-destructive border-destructive/30',
  cancelled: 'bg-muted text-muted-foreground border-border',
};

export const StatusBadge = ({ status }: { status: ShipmentStatus }) => {
  const { t } = useTheme();
  const isActive = status === 'out_for_delivery';

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusColors[status]}`}>
      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-current status-pulse" />}
      {t[status]}
    </span>
  );
};
