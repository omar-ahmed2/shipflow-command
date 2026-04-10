import React, { useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { db } from '@/db';
import { verifyPassword, hashPassword } from '@/db/helpers';
import type { Shipment, User } from '@/db/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, MapPin, Phone, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/utils/formatters';
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { pageVariants, cardVariants } from '@/animations/variants';
import CountUp from 'react-countup';

const CourierProfilePage: React.FC = () => {
  const { user, courierProfile } = useAuth();
  const { t, lang } = useTheme();
  const [curPwd, setCurPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confPwd, setConfPwd] = useState('');

  const shipments = useMemo(() => {
    if (!courierProfile) return [];
    return db.query<Shipment>('shipments', s => s.courierId === courierProfile.id);
  }, [courierProfile]);

  const delivered = shipments.filter(s => s.status === 'delivered').length;
  const returned = shipments.filter(s => s.status === 'returned').length;
  const rate = shipments.length > 0 ? Math.round((delivered / shipments.length) * 100) : 0;

  const chartData = [{ name: 'rate', value: rate, fill: '#10B981' }];

  const changePassword = () => {
    if (!user) return;
    const u = db.getById<User>('users', user.id);
    if (!u || !verifyPassword(curPwd, u.passwordHash)) { toast.error(t.wrongPassword); return; }
    if (newPwd !== confPwd) { toast.error(t.passwordMismatch); return; }
    db.update('users', user.id, { passwordHash: hashPassword(newPwd) });
    setCurPwd(''); setNewPwd(''); setConfPwd('');
    toast.success(t.passwordChanged);
  };

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="space-y-4">
      <h2 className="text-lg font-bold">{t.myProfile}</h2>

      <motion.div custom={0} variants={cardVariants} initial="initial" animate="animate" className="courier-card p-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-primary"
            style={{ background: 'hsl(var(--primary) / 0.1)' }}>
            {courierProfile?.name?.charAt(0)}
          </div>
          <div>
            <p className="font-bold text-lg">{courierProfile?.name}</p>
            <p className="text-sm text-muted-foreground">{courierProfile?.zone}</p>
          </div>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-muted-foreground" />{courierProfile?.phone}</div>
          <div className="flex items-center gap-2"><Truck className="w-4 h-4 text-muted-foreground" />{courierProfile?.vehicleType && t[courierProfile.vehicleType as keyof typeof t]}</div>
          <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-muted-foreground" />{t.joinDate}: {courierProfile?.joinDate && formatDate(courierProfile.joinDate, lang)}</div>
        </div>
      </motion.div>

      <motion.div custom={1} variants={cardVariants} initial="initial" animate="animate" className="courier-card p-5">
        <h3 className="font-semibold text-sm mb-4">{t.performance}</h3>
        <div className="flex items-center gap-6">
          <ResponsiveContainer width={120} height={120}>
            <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" data={chartData} startAngle={90} endAngle={-270}>
              <RadialBar dataKey="value" cornerRadius={10} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="space-y-2">
            <div><span className="text-muted-foreground text-xs">{t.totalDelivered}</span><p className="font-bold font-mono-nums" style={{ color: '#10B981' }}><CountUp end={delivered} duration={1} /></p></div>
            <div><span className="text-muted-foreground text-xs">{t.totalReturned}</span><p className="font-bold font-mono-nums text-destructive"><CountUp end={returned} duration={1} /></p></div>
            <div><span className="text-muted-foreground text-xs">{t.successRate}</span><p className="font-bold font-mono-nums"><CountUp end={rate} duration={1} />%</p></div>
          </div>
        </div>
      </motion.div>

      <motion.div custom={2} variants={cardVariants} initial="initial" animate="animate" className="courier-card p-5 space-y-3">
        <h3 className="font-semibold text-sm">{t.changePassword}</h3>
        <div><Label>{t.currentPassword}</Label><Input type="password" value={curPwd} onChange={e => setCurPwd(e.target.value)} className="rounded-xl mt-1" /></div>
        <div><Label>{t.newPassword}</Label><Input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} className="rounded-xl mt-1" /></div>
        <div><Label>{t.confirmPassword}</Label><Input type="password" value={confPwd} onChange={e => setConfPwd(e.target.value)} className="rounded-xl mt-1" /></div>
        <motion.div whileTap={{ scale: 0.97 }}>
          <Button onClick={changePassword} className="rounded-xl w-full">{t.save}</Button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default CourierProfilePage;
