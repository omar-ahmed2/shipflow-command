import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { now } from '@/db/helpers';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Phone, MapPin, ArrowLeft, CheckCircle, Shield, Loader2 } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { formatDateTime, formatCurrency } from '@/utils/formatters';
import { motion, AnimatePresence } from 'framer-motion';
import { pageVariants, bottomSheetVariants } from '@/animations/variants';

const CourierShipmentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { t, lang } = useTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [updateOpen, setUpdateOpen] = useState(false);
  const [deliveryConfirmOpen, setDeliveryConfirmOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');
  const [note, setNote] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [verified, setVerified] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Queries
  const { data: shipment, isLoading: shipLoading } = useQuery({
    queryKey: ['shipment', id],
    queryFn: () => id ? api.shipments.getById(id) : Promise.reject('No ID'),
    enabled: !!id
  });

  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['shipment_events', id],
    queryFn: () => id ? api.shipments.getEvents(id) : Promise.resolve([]),
    enabled: !!id
  });

  if (shipLoading || eventsLoading) {
    return (
        <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-muted-foreground animate-pulse">جاري تحميل تفاصيل الشحنة...</p>
        </div>
    );
  }

  if (!shipment) return <div className="p-8 text-center">{t.noResults}</div>;

  const handleUpdate = async (statusOverride?: string) => {
    const finalStatus = statusOverride || newStatus;
    if (!finalStatus) return;
    
    setIsUpdating(true);
    try {
      const updates: any = { status: finalStatus, updatedAt: now() };
      if (finalStatus === 'delivered') updates.deliveredAt = now();
      
      await api.shipments.update(shipment.id, updates);

      await api.shipments.addEvent({
        shipmentId: shipment.id,
        status: finalStatus,
        notes: note || undefined,
        actor: user?.id || null,
        actorRole: 'courier'
      });

      await api.notifications.create({
        targetRole: 'admin',
        type: finalStatus === 'delivered' ? 'success' : 'warning',
        title: t.statusUpdated,
        message: `${shipment.trackingId} ← ${t[finalStatus as keyof typeof t]}`,
        link: `/shipments/${shipment.id}`,
      });

      toast.success(t.statusUpdated);
      setUpdateOpen(false);
      setDeliveryConfirmOpen(false);
      setNewStatus('');
      setNote('');
      setVerifyCode('');
      setVerified(false);
      queryClient.invalidateQueries({ queryKey: ['shipment', id] });
      queryClient.invalidateQueries({ queryKey: ['shipment_events', id] });
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء التحديث');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleVerify = () => {
    if (verifyCode.toUpperCase() === (shipment.verificationCode || '').toUpperCase()) {
      setVerified(true);
      setVerifyError('');
    } else {
      setVerifyError(t.wrongCode);
    }
  };

  const openDeliveryFlow = () => {
    if (shipment.verificationCode) {
      setDeliveryConfirmOpen(true);
    } else {
      setNewStatus('delivered');
      setUpdateOpen(true);
    }
  };

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="space-y-4" dir="rtl">
      <div className="flex justify-start">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1 flex-row-reverse">
            <ArrowLeft className="w-4 h-4" /> {t.myShipments}
        </Button>
      </div>

      <div className="courier-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b flex-row-reverse">
          <div className="flex flex-col text-right">
            <span className="font-mono-nums font-bold text-sm tracking-tight">{shipment.trackingId}</span>
            {shipment.verificationCode && (
              <span 
                className="font-mono-nums text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1 cursor-pointer justify-end hover:text-primary transition-colors"
                onClick={() => {
                  navigator.clipboard.writeText(shipment.verificationCode || '');
                  toast.success(t.copied || 'تم النسخ');
                }}
                title={t.copied || 'نسخ'}
              >
                {shipment.verificationCode} <Shield className="w-2.5 h-2.5" />
              </span>
            )}
          </div>
          <StatusBadge status={shipment.status} size="md" />
        </div>
        <div className="p-5 space-y-4 text-right">
          <p className="font-semibold text-lg">{shipment.customerName}</p>
          <a href={`tel:${shipment.customerPhone}`} className="flex items-center gap-2 text-sm text-primary justify-end">
             {shipment.customerPhone} <Phone className="w-4 h-4" />
          </a>
          <div className="flex items-center gap-2 text-sm text-muted-foreground justify-end">
            {shipment.address}, {shipment.city}, {shipment.governorate} <MapPin className="w-4 h-4" />
          </div>
          <div className="space-y-3 bg-muted/50 p-4 rounded-2xl">
            <div className="flex justify-between items-center text-sm flex-row-reverse">
                <span className="text-muted-foreground">سعر الشحنة:</span>
                <span className="font-mono-nums font-bold">{formatCurrency(shipment.price)} {t.egp}</span>
            </div>
            <div className="flex justify-between items-center text-sm flex-row-reverse">
                <span className="text-muted-foreground">سعر التوصيل:</span>
                <span className="font-mono-nums font-bold">{formatCurrency(shipment.shippingFee || 0)} {t.egp}</span>
            </div>
            <div className="pt-2 border-t flex justify-between items-center flex-row-reverse">
                <span className="font-bold text-primary">إجمالي المبلغ المطلوب:</span>
                <span className="text-xl font-black font-mono-nums text-primary">{formatCurrency(shipment.price + (shipment.shippingFee || 0))} {t.egp}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2 justify-end">
            <span className="font-medium text-foreground">{shipment.paymentType === 'COD' ? t.cod : t.paid}</span>
            <span className="text-xs">:{t.payment}</span>
          </div>
          {['assigned', 'out_for_delivery'].includes(shipment.status) && (
            <div className="grid grid-cols-2 gap-2">
              <motion.button whileTap={{ scale: 0.95 }}
                onClick={() => setUpdateOpen(true)}
                className="py-3 rounded-xl border text-sm font-medium">
                {t.updateStatus}
              </motion.button>
              <motion.button whileTap={{ scale: 0.95 }}
                onClick={openDeliveryFlow}
                className="py-3 rounded-xl text-sm font-bold text-primary-foreground bg-primary flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4" /> {t.deliver}
              </motion.button>
            </div>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="courier-card p-5 text-right">
        <h3 className="font-semibold text-sm mb-4">{t.timeline}</h3>
        <div className="space-y-1">
          {events.map((e, i) => (
            <motion.div key={e.id} className="flex gap-3 flex-row-reverse"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}>
              <div className="flex flex-col items-center">
                <div className={`w-2 h-2 rounded-full mt-1.5 ${i === 0 ? 'bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]' : 'bg-muted-foreground/30'}`} />
                {i < events.length - 1 && <div className="w-px flex-1 bg-border my-1" />}
              </div>
              <div className="pb-4 flex-1">
                <StatusBadge status={e.status} />
                {e.notes && <p className="text-xs text-muted-foreground mt-1">{e.notes}</p>}
                <p className="text-[10px] text-muted-foreground mt-1 opacity-70 tracking-tight">{formatDateTime(e.timestamp, lang)}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Update Status Modal */}
      <AnimatePresence>
        {updateOpen && (
          <motion.div className="fixed inset-0 z-50 flex items-end justify-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setUpdateOpen(false)} />
            <motion.div variants={bottomSheetVariants} initial="initial" animate="animate" exit="exit"
              className="relative w-full max-w-lg bg-card rounded-t-[32px] p-6 space-y-4">
              <div className="w-12 h-1 bg-muted rounded-full mx-auto mb-2 opacity-50" />
              <h3 className="text-xl font-bold text-center tracking-tight">{t.updateStatusTitle}</h3>
              <RadioGroup value={newStatus} onValueChange={setNewStatus} className="space-y-2">
                <div className="flex items-center gap-3 p-4 rounded-2xl border bg-muted/20 flex-row-reverse"><RadioGroupItem value="out_for_delivery" id="ofd" /><Label htmlFor="ofd" className="flex-1 text-right">{t.out_for_delivery}</Label></div>
                <div className="flex items-center gap-3 p-4 rounded-2xl border bg-muted/20 flex-row-reverse"><RadioGroupItem value="delivered" id="del" /><Label htmlFor="del" className="flex-1 text-right">✓ {t.delivered}</Label></div>
                <div className="flex items-center gap-3 p-4 rounded-2xl border bg-muted/20 flex-row-reverse"><RadioGroupItem value="returned" id="ret" /><Label htmlFor="ret" className="flex-1 text-right">✗ {t.returned}</Label></div>
              </RadioGroup>
              <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder={t.addNote} className="rounded-2xl min-h-[100px] text-right" />
              <motion.button whileTap={{ scale: 0.97 }} 
                onClick={() => {
                  if (newStatus === 'delivered' && shipment.verificationCode) {
                    setUpdateOpen(false);
                    setDeliveryConfirmOpen(true);
                  } else {
                    handleUpdate();
                  }
                }} 
                disabled={!newStatus || isUpdating}
                className="w-full py-4 rounded-2xl font-bold text-primary-foreground bg-primary disabled:opacity-50 flex items-center justify-center gap-2">
                {isUpdating && <Loader2 className="w-4 h-4 animate-spin" />}
                {t.confirmUpdate}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delivery Verification Sheet */}
      <AnimatePresence>
        {deliveryConfirmOpen && (
          <motion.div className="fixed inset-0 z-50 flex items-end justify-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { if(!isUpdating){ setDeliveryConfirmOpen(false); setVerified(false); setVerifyCode(''); setVerifyError(''); } }} />
            <motion.div variants={bottomSheetVariants} initial="initial" animate="animate" exit="exit"
              className="relative w-full max-w-lg bg-card rounded-t-[32px] p-6">
              <div className="w-12 h-1 bg-muted rounded-full mx-auto mb-6 opacity-50" />

              {!verified ? (
                <div className="space-y-6">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
                        <Shield className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold">{t.confirmDelivery}</h3>
                    <p className="text-sm text-muted-foreground text-center px-4">{t.enterVerificationCode}</p>
                  </div>
                  <div>
                    <Input
                      value={verifyCode}
                      onChange={e => {
                          setVerifyCode(e.target.value.toUpperCase());
                          setVerifyError('');
                      }}
                      placeholder="SH-XXXX"
                      maxLength={7}
                      className="w-full text-center text-3xl font-mono-nums font-black tracking-[0.3em] rounded-2xl py-8 mt-2"
                      style={{
                        borderColor: verifyError ? 'hsl(var(--destructive))' : undefined,
                      }}
                    />
                    {verifyError && (
                      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="text-sm text-destructive mt-3 text-center font-medium">{verifyError}</motion.p>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => { setDeliveryConfirmOpen(false); setVerifyCode(''); setVerifyError(''); }} disabled={isUpdating}
                      className="flex-1 py-4 rounded-2xl border font-bold text-sm">{t.cancel}</button>
                    <motion.button whileTap={{ scale: 0.97 }} onClick={handleVerify}
                      disabled={verifyCode.length < 6 || isUpdating}
                      className="flex-1 py-4 rounded-2xl font-bold text-sm text-primary-foreground bg-primary disabled:opacity-50">
                      {t.verifyCode}
                    </motion.button>
                  </div>
                </div>
              ) : (
                <motion.div className="space-y-6 text-center"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}>
                  <motion.div
                    className="w-20 h-20 rounded-full mx-auto flex items-center justify-center bg-emerald-500/20"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}>
                    <CheckCircle className="w-10 h-10 text-emerald-500" />
                  </motion.div>
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold">{t.codeVerified}</h3>
                    <p className="text-sm text-muted-foreground">{t.verificationSuccess}</p>
                  </div>
                  <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder={t.addNote} className="rounded-2xl min-h-[100px] text-right" />
                  <motion.button whileTap={{ scale: 0.97 }} onClick={() => handleUpdate('delivered')}
                    disabled={isUpdating}
                    className="w-full py-4 rounded-2xl font-bold text-white shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                    style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                    {isUpdating && <Loader2 className="w-4 h-4 animate-spin" />}
                    {t.finalConfirm}
                  </motion.button>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default CourierShipmentDetailPage;
