import { Package } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState = ({ icon, title, description, actionLabel, onAction }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
    <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
      {icon || <Package className="w-8 h-8 text-muted-foreground" />}
    </div>
    <h3 className="text-lg font-semibold mb-1">{title}</h3>
    {description && <p className="text-sm text-muted-foreground mb-4 max-w-xs">{description}</p>}
    {actionLabel && onAction && (
      <Button onClick={onAction} size="sm">{actionLabel}</Button>
    )}
  </div>
);
