import React from 'react';
import { useConnectionHealth } from '@/hooks/useConnectionHealth';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export const ConnectionMonitor: React.FC = () => {
  const { isHealthy, lastChecked, errorCount, isChecking } = useConnectionHealth(30000);

  // Show toast when connection fails
  React.useEffect(() => {
    if (!isHealthy && errorCount > 0) {
      toast.error('مشكلة في الاتصال بقاعدة البيانات', {
        description: 'جاري المحاولة مرة أخرى...',
        duration: 5000
      });
    }
  }, [isHealthy, errorCount]);

  if (isChecking && !lastChecked) {
    return (
      <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 px-3 py-2 bg-muted rounded-lg text-xs text-muted-foreground">
        <Loader2 className="w-3 h-3 animate-spin" />
        جاري فحص الاتصال...
      </div>
    );
  }

  if (!isHealthy) {
    return (
      <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 px-3 py-2 bg-destructive/10 border border-destructive/20 rounded-lg text-xs text-destructive animate-pulse">
        <WifiOff className="w-3 h-3" />
        <span>مشكلة في الاتصال</span>
        {errorCount > 3 && (
          <span className="text-[10px] opacity-70">(محاولات: {errorCount})</span>
        )}
      </div>
    );
  }

  // Healthy - show subtle indicator
  return (
    <div 
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2 px-2 py-1 bg-emerald-500/10 rounded-full text-[10px] text-emerald-600 opacity-50 hover:opacity-100 transition-opacity cursor-default"
      title={`آخر فحص: ${lastChecked?.toLocaleTimeString('ar-EG')}`}
    >
      <Wifi className="w-3 h-3" />
      <span>متصل</span>
    </div>
  );
};
