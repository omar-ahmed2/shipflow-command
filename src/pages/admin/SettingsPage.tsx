import React, { useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/db';
import { seedDatabase } from '@/db/seed';
import { hashPassword, verifyPassword } from '@/db/helpers';
import type { User, Shipment, Courier } from '@/db/schema';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

const SettingsPage: React.FC = () => {
  const { t, lang, setLang } = useTheme();
  const { user } = useAuth();
  const [clearConfirm, setClearConfirm] = useState(false);
  const [companyName, setCompanyName] = useState(() => localStorage.getItem('shipflow_company') || 'ShipFlow');
  const [curPwd, setCurPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confPwd, setConfPwd] = useState('');

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

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <h2 className="text-xl font-bold mb-6">{t.settings}</h2>
      <Tabs defaultValue="general">
        <TabsList className="rounded-xl mb-6">
          <TabsTrigger value="general" className="rounded-lg">{t.general}</TabsTrigger>
          <TabsTrigger value="security" className="rounded-lg">{t.security}</TabsTrigger>
          <TabsTrigger value="about" className="rounded-lg">{t.about}</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <div className="admin-card p-6 space-y-4">
            <div>
              <Label>{t.companyName}</Label>
              <div className="flex gap-2 mt-1">
                <Input value={companyName} onChange={e => setCompanyName(e.target.value)} className="rounded-xl" />
                <Button onClick={saveCompany} className="rounded-xl">{t.save}</Button>
              </div>
            </div>
            <div>
              <Label>{t.language}</Label>
              <div className="flex gap-2 mt-2">
                <Button variant={lang === 'ar' ? 'default' : 'outline'} size="sm" className="rounded-xl" onClick={() => setLang('ar')}>العربية</Button>
                <Button variant={lang === 'en' ? 'default' : 'outline'} size="sm" className="rounded-xl" onClick={() => setLang('en')}>English</Button>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="security">
          <div className="admin-card p-6 space-y-4">
            <h3 className="font-semibold text-sm">{t.changePassword}</h3>
            <div><Label>{t.currentPassword}</Label><Input type="password" value={curPwd} onChange={e => setCurPwd(e.target.value)} className="rounded-xl mt-1" /></div>
            <div><Label>{t.newPassword}</Label><Input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} className="rounded-xl mt-1" /></div>
            <div><Label>{t.confirmPassword}</Label><Input type="password" value={confPwd} onChange={e => setConfPwd(e.target.value)} className="rounded-xl mt-1" /></div>
            <Button onClick={changePassword} className="rounded-xl">{t.save}</Button>
          </div>
        </TabsContent>

        <TabsContent value="about">
          <div className="admin-card p-6 space-y-4">
            <div className="flex justify-between"><span className="text-muted-foreground">{t.version}</span><span className="font-mono-nums">1.0.0</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{t.totalShipmentsCount}</span><span className="font-mono-nums">{totalShipments}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{t.totalCouriersCount}</span><span className="font-mono-nums">{totalCouriers}</span></div>
            <hr />
            <Button variant="destructive" className="rounded-xl" onClick={() => setClearConfirm(true)}>{t.clearDatabase}</Button>
          </div>
        </TabsContent>
      </Tabs>
      <ConfirmDialog open={clearConfirm} onOpenChange={setClearConfirm} title={t.clearDatabase} description={t.clearDBWarning} onConfirm={clearDB} />
    </div>
  );
};

export default SettingsPage;
