import { useState, useEffect, useCallback } from 'react';
import { checkConnectionHealth } from '@/lib/supabase';

interface ConnectionStatus {
  isHealthy: boolean;
  lastChecked: Date | null;
  checkCount: number;
  errorCount: number;
}

export function useConnectionHealth(checkInterval: number = 30000) {
  const [status, setStatus] = useState<ConnectionStatus>({
    isHealthy: true,
    lastChecked: null,
    checkCount: 0,
    errorCount: 0
  });

  const [isChecking, setIsChecking] = useState(false);

  const checkHealth = useCallback(async () => {
    setIsChecking(true);
    try {
      const healthy = await checkConnectionHealth();
      setStatus(prev => ({
        isHealthy: healthy,
        lastChecked: new Date(),
        checkCount: prev.checkCount + 1,
        errorCount: healthy ? prev.errorCount : prev.errorCount + 1
      }));
      return healthy;
    } catch {
      setStatus(prev => ({
        isHealthy: false,
        lastChecked: new Date(),
        checkCount: prev.checkCount + 1,
        errorCount: prev.errorCount + 1
      }));
      return false;
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    // Initial check
    checkHealth();

    // Set up interval
    const interval = setInterval(checkHealth, checkInterval);

    return () => clearInterval(interval);
  }, [checkHealth, checkInterval]);

  return {
    ...status,
    isChecking,
    checkHealth
  };
}
