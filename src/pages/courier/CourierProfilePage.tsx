import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, MapPin, Phone, Truck, Loader2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/utils/formatters';
import { RadialBarChart, RadialBar, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'framer-motion';
import { pageVariants, cardVariants } from '@/animations/variants';
import CountUp from 'react-countup';

const CourierProfilePage: React.FC = () => {
  const { user, courierProfile } = useAuth();
  const { t, lang } = useTheme();
  const [newPwd, setNewPwd] = useState('');
  const [confPwd, setConfPwd] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const { data: shipments = [], isLoading: shipLoading } = useQuery({
    queryKey: ['courier_shipments_stats', courierProfile?.id],
    queryFn: () => courierProfile?.id ? api.shipments.getByCourierId(courierProfile.id) : Promise.resolve([]),
    enabled: !!courierProfile?.id
  });

  const delivered = shipments.filter(s => s.status === 'delivered').length;
  const returned = shipments.filter(s => s.status === 'returned').length;
  const total = shipments.filter(s => ['delivered', 'returned'].includes(s.status)).length;
  const rate = total > 0 ? Math.round((delivered / total) * 100) : 0;

  const chartData = [{ name: 'rate', value: rate }];

  const changePassword = async () => {
    if (newPwd !== confPwd) { toast.error(t.passwordMismatch); return; }
    if (newPwd.length < 6) { toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return; }

    setIsUpdating(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPwd });
      if (error) throw error;
      setNewPwd(''); setConfPwd('');
      toast.success(t.passwordChanged);
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ');
    } finally {
      setIsUpdating(false);
    }
  };

  if (shipLoading) {
    return (
        <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-muted-foreground animate-pulse">جاري تحميل بيانات الملف الشخصي...</p>
        </div>
    );
  }

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="space-y-4" dir="rtl">
      <h2 className="text-lg font-bold text-right">{t.myProfile}</h2>

      <motion.div custom={0} variants={cardVariants} initial="initial" animate="animate" className="courier-card p-6">
        <div className="flex items-center gap-4 mb-6 flex-row-reverse">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-primary border-2 border-primary/20"
            style={{ background: 'hsl(var(--primary) / 0.1)' }}>
            {courierProfile?.name?.charAt(0)}
          </div>
          <div className="text-right flex-1">
            <p className="font-bold text-xl tracking-tight">{courierProfile?.name}</p>
            <p className="text-sm text-muted-foreground flex items-center gap-1 justify-end mt-1">
               {courierProfile?.zone} <MapPin className="w-3.5 h-3.5" />
            </p>
          </div>
        </div>
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-3 justify-end text-muted-foreground">
             <span className="text-foreground font-medium">{courierProfile?.phone}</span> <Phone className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-3 justify-end text-muted-foreground">
             <span className="text-foreground font-medium">{courierProfile?.vehicleType && t[courierProfile.vehicleType as keyof typeof t]}</span> <Truck className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-3 justify-end text-muted-foreground">
             <span className="text-foreground font-medium">{courierProfile?.joinDate && formatDate(courierProfile.joinDate, lang)}</span> <Calendar className="w-4 h-4" />
          </div>
        </div>
      </motion.div>

      <motion.div custom={1} variants={cardVariants} initial="initial" animate="animate" className="courier-card p-6">
        <h3 className="font-bold text-sm mb-6 text-right opacity-80 uppercase tracking-wider">{t.performance}</h3>
        <div className="flex items-center gap-8 flex-row-reverse">
          <div className="relative w-28 h-28">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" data={chartData} startAngle={90} endAngle={-270}>
                <RadialBar dataKey="value" cornerRadius={12} background={{ fill: 'hsl(var(--muted))' }} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-black font-mono-nums">{rate}%</span>
            </div>
          </div>
          <div className="space-y-4 flex-1">
            <div className="text-right">
                <p className="text-muted-foreground text-xs mb-0.5">{t.totalDelivered}</p>
                <p className="font-black text-xl font-mono-nums text-emerald-500"><CountUp end={delivered} duration={1.5} /></p>
            </div>
            <div className="text-right">
                <p className="text-muted-foreground text-xs mb-0.5">{t.totalReturned}</p>
                <p className="font-black text-xl font-mono-nums text-rose-500"><CountUp end={returned} duration={1.5} /></p>
            </div>
            <div className="text-right">
                <p className="text-muted-foreground text-xs mb-0.5">{t.successRate}</p>
                <p className="font-black text-xl font-mono-nums text-primary"><CountUp end={rate} duration={1.5} />%</p>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div custom={2} variants={cardVariants} initial="initial" animate="animate" className="courier-card p-6 space-y-4">
        <div className="flex items-center gap-2 justify-end mb-2">
            <h3 className="font-bold text-sm text-right">{t.changePassword}</h3>
            <Lock className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="space-y-1">
            <Label className="text-xs text-muted-foreground text-right block">{t.newPassword}</Label>
            <Input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} className="rounded-2xl h-11 text-right" placeholder="••••••••" />
        </div>
        <div className="space-y-1">
            <Label className="text-xs text-muted-foreground text-right block">{t.confirmPassword}</Label>
            <Input type="password" value={confPwd} onChange={e => setConfPwd(e.target.value)} className="rounded-2xl h-11 text-right" placeholder="••••••••" />
        </div>
        <motion.div whileTap={{ scale: 0.98 }} className="pt-2">
          <Button onClick={changePassword} disabled={isUpdating} className="rounded-2xl w-full h-12 font-bold flex items-center justify-center gap-2">
            {isUpdating && <Loader2 className="w-4 h-4 animate-spin" />}
            {t.save}
          </Button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default CourierProfilePage;
