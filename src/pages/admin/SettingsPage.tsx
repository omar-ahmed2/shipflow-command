import React, { useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/db';
import { seedDatabase } from '@/db/seed';
import { hashPassword, verifyPassword } from '@/db/helpers';
import type { User } from '@/db/schema';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { pageVariants } from '@/animations/variants';
import { Settings2, Lock, Database } from 'lucide-react';

const SettingsPage: React.FC = () => {
  const { t, lang, isDark } = useTheme();
  const { user } = useAuth();
  const [clearConfirm, setClearConfirm] = useState(false);
  const [companyName, setCompanyName] = useState(() => localStorage.getItem('shipflow_company') || 'ShipFlow');
  const [curPwd, setCurPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confPwd, setConfPwd] = useState('');
  const [activeTab, setActiveTab] = useState('general');

  const settingsTabs = [
    { id: 'general', label: t.general, icon: Settings2 },
    { id: 'security', label: t.security, icon: Lock },
    { id: 'database', label: t.database, icon: Database },
  ];

  const saveCompany = () => {
    localStorage.setItem('shipflow_company', companyName);
    toast.success(t.saved);
  };

  const changePassword = () => {
    if (!user) return;
    const u = db.getById<User>('users', user.id);
    if (!u || !verifyPassword(curPwd, u.passwordHash)) { toast.error(t.wrongPassword); return; }
    if (newPwd !== confPwd) { toast.error(t.passwordMismatch); return; }
    db.update('users', user.id, { passwordHash: hashPassword(newPwd) });
    setCurPwd(''); setNewPwd(''); setConfPwd('');
    toast.success(t.passwordChanged);
  };

  const clearDB = () => {
    db.clearAll();
    seedDatabase();
    setClearConfirm(false);
    toast.success(t.saved);
    window.location.reload();
  };

  const totalShipments = db.count('shipments');
  const totalCouriers = db.count('couriers');

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
            <div><Label>{t.currentPassword}</Label><Input type="password" value={curPwd} onChange={e => setCurPwd(e.target.value)} className="rounded-xl mt-1" /></div>
            <div><Label>{t.newPassword}</Label><Input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} className="rounded-xl mt-1" /></div>
            <div><Label>{t.confirmPassword}</Label><Input type="password" value={confPwd} onChange={e => setConfPwd(e.target.value)} className="rounded-xl mt-1" /></div>
            <Button onClick={changePassword} className="rounded-xl">{t.save}</Button>
          </div>
        );

      case 'database':
        return (
          <div className="space-y-4">
            <div className="flex justify-between p-3 rounded-lg border"><span className="text-muted-foreground">{t.version}</span><span className="font-mono-nums">1.0.0</span></div>
            <div className="flex justify-between p-3 rounded-lg border"><span className="text-muted-foreground">{t.totalShipmentsCount}</span><span className="font-mono-nums">{totalShipments}</span></div>
            <div className="flex justify-between p-3 rounded-lg border"><span className="text-muted-foreground">{t.totalCouriersCount}</span><span className="font-mono-nums">{totalCouriers}</span></div>
            <hr />
            <Button variant="destructive" className="rounded-xl" onClick={() => setClearConfirm(true)}>{t.clearDatabase}</Button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="max-w-3xl mx-auto">
      <h2 className="text-xl font-bold mb-6">{t.settings}</h2>

      <div className="flex gap-6 min-h-[400px]">
        {/* Side navigation */}
        <div className="w-48 flex-shrink-0 rounded-2xl border overflow-hidden bg-card">
          {settingsTabs.map(tab => (
            <motion.button
              key={tab.id}
              whileHover={{ x: 2 }}
              onClick={() => setActiveTab(tab.id)}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-start transition-all"
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
            className="flex-1 rounded-2xl border p-6 bg-card"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>

      <ConfirmDialog open={clearConfirm} onOpenChange={setClearConfirm} title={t.clearDatabase} description={t.clearDBWarning} onConfirm={clearDB} />
    </motion.div>
  );
};

export default SettingsPage;
