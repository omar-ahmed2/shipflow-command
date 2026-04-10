import { useTheme } from '@/context/ThemeContext';
import type { ShipmentStatus } from '@/db/schema';
import { Clock, UserCheck, Truck, CheckCircle, RotateCcw, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const STATUS_CONFIG: Record<ShipmentStatus, { color: string; bg: string; icon: any; pulse?: boolean }> = {
  pending:          { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',   icon: Clock },
  assigned:         { color: '#06B6D4', bg: 'rgba(6,182,212,0.1)',    icon: UserCheck },
  out_for_delivery: { color: '#4F8EF7', bg: 'rgba(79,142,247,0.1)',   icon: Truck, pulse: true },
  delivered:        { color: '#10B981', bg: 'rgba(16,185,129,0.1)',   icon: CheckCircle },
  returned:         { color: '#F87171', bg: 'rgba(248,113,113,0.1)',  icon: RotateCcw },
  cancelled:        { color: '#6B7280', bg: 'rgba(107,114,128,0.08)', icon: XCircle },
};

export const StatusBadge = ({ status, size = 'sm' }: { status: ShipmentStatus; size?: 'sm' | 'md' }) => {
  const { t } = useTheme();
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full font-medium"
      style={{
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.color}30`,
        padding: size === 'sm' ? '2px 10px' : '4px 14px',
        fontSize: size === 'sm' ? 11 : 13,
      }}>
      {cfg.pulse ? (
        <motion.span className="w-1.5 h-1.5 rounded-full"
          style={{ background: cfg.color }}
          animate={{ opacity: [1, 0.3, 1], scale: [1, 0.8, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }} />
      ) : (
        <Icon size={size === 'sm' ? 10 : 12} />
      )}
      {t[status]}
    </span>
  );
};
