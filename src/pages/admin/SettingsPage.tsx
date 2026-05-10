import React, { useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { pageVariants } from '@/animations/variants';
import { Settings2, Lock, Database, Loader2 } from 'lucide-react';

const SettingsPage: React.FC = () => {
  const { t } = useTheme();
  const { user } = useAuth();
  const [companyName, setCompanyName] = useState(() => localStorage.getItem('shipflow_company') || 'ELMona Shipping');
  const [newPwd, setNewPwd] = useState('');
  const [confPwd, setConfPwd] = useState('');
  const [activeTab, setActiveTab] = useState('general');
  const [isSaving, setIsSaving] = useState(false);

  const { data: shipmentsCount = 0 } = useQuery<number>({ 
    queryKey: ['shipments', 'count'], 
    queryFn: async () => {
        const { count } = await supabase.from('shipments').select('*', { count: 'exact', head: true });
        return count || 0;
    }
  });

  const { data: couriersCount = 0 } = useQuery<number>({ 
    queryKey: ['couriers', 'count'], 
    queryFn: async () => {
        const { count } = await supabase.from('couriers').select('*', { count: 'exact', head: true });
        return count || 0;
    }
  });

  const settingsTabs = [
    { id: 'general', label: t.general, icon: Settings2 },
    { id: 'security', label: t.security, icon: Lock },
    { id: 'database', label: t.database, icon: Database },
  ];

  const saveCompany = () => {
    localStorage.setItem('shipflow_company', companyName);
    toast.success(t.saved);
  };

  const changePassword = async () => {
    if (!newPwd) return toast.error('يرجى إدخال كلمة المرور الجديدة');
    if (newPwd !== confPwd) return toast.error(t.passwordMismatch);
    if (newPwd.length < 6) return toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');

    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPwd });
      if (error) throw error;
      
      setNewPwd(''); setConfPwd('');
      toast.success(t.passwordChanged);
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء تغيير كلمة المرور');
    } finally {
      setIsSaving(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-sm font-medium">{t.companyName}</Label>
              <div className="flex gap-2 mt-2">
                <Input value={companyName} onChange={e => setCompanyName(e.target.value)} className="rounded-xl" />
                <Button onClick={saveCompany} className="rounded-xl">{t.save}</Button>
              </div>
            </div>
          </div>
        );
      case 'security':
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">{t.changePassword}</h3>
            <div><Label>{t.newPassword}</Label><Input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} className="rounded-xl mt-1" /></div>
            <div><Label>{t.confirmPassword}</Label><Input type="password" value={confPwd} onChange={e => setConfPwd(e.target.value)} className="rounded-xl mt-1" /></div>
            <Button onClick={changePassword} disabled={isSaving} className="rounded-xl gap-2">
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                {t.save}
            </Button>
          </div>
        );

      case 'database':
        return (
          <div className="space-y-4">
            <div className="flex justify-between p-3 rounded-lg border font-mono">
                <span className="text-muted-foreground">مشروع Supabase</span>
                <span className="font-semibold text-xs opacity-50 select-all">{import.meta.env.VITE_SUPABASE_URL}</span>
            </div>
            <div className="flex justify-between p-3 rounded-lg border"><span className="text-muted-foreground">{t.version}</span><span className="font-mono-nums">2.0.0 (Supabase)</span></div>
            <div className="flex justify-between p-3 rounded-lg border"><span className="text-muted-foreground">{t.totalShipmentsCount}</span><span className="font-mono-nums">{shipmentsCount}</span></div>
            <div className="flex justify-between p-3 rounded-lg border"><span className="text-muted-foreground">{t.totalCouriersCount}</span><span className="font-mono-nums">{couriersCount}</span></div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="max-w-3xl mx-auto" dir="rtl">
      <h2 className="text-xl font-bold mb-6 text-right">{t.settings}</h2>

      <div className="flex gap-6 min-h-[400px]">
        {/* Side navigation */}
        <div className="w-48 flex-shrink-0 rounded-2xl border overflow-hidden bg-card h-fit">
          {settingsTabs.map(tab => (
            <motion.button
              key={tab.id}
              whileHover={{ x: -2 }}
              onClick={() => setActiveTab(tab.id)}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-right transition-all"
              style={{
                background: activeTab === tab.id ? 'hsl(var(--primary) / 0.08)' : 'transparent',
                borderInlineStart: activeTab === tab.id ? '3px solid hsl(var(--primary))' : '3px solid transparent',
                color: activeTab === tab.id ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
              }}
            >
              <tab.icon size={16} />
              {tab.label}
            </motion.button>
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex-1 rounded-2xl border p-6 bg-card text-right"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default SettingsPage;
