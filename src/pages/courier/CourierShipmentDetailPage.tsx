import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { db } from '@/db';
import { generateId, now } from '@/db/helpers';
import type { Shipment, ShipmentEvent, ShipmentStatus, Notification } from '@/db/schema';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Phone, MapPin, ArrowLeft, CheckCircle, Shield } from 'lucide-react';
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
  const [refresh, setRefresh] = useState(0);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [deliveryConfirmOpen, setDeliveryConfirmOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');
  const [note, setNote] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [verified, setVerified] = useState(false);

  const shipment = useMemo(() => db.getById<Shipment>('shipments', id || ''), [id, refresh]);
  const events = useMemo(() =>
    db.query<ShipmentEvent>('shipmentEvents', e => e.shipmentId === id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [id, refresh]);

  if (!shipment) return <div className="p-8 text-center">{t.noResults}</div>;

  const handleUpdate = (statusOverride?: string) => {
    const finalStatus = statusOverride || newStatus;
    if (!finalStatus) return;
    const updates: Record<string, any> = { status: finalStatus, updatedAt: now() };
    if (finalStatus === 'delivered') updates.deliveredAt = now();
    db.update('shipments', shipment.id, updates);

    db.create<ShipmentEvent>('shipmentEvents', {
      id: generateId('EVT'), shipmentId: shipment.id, status: finalStatus as ShipmentStatus,
      note: note || undefined, actor: user?.name || '', actorRole: 'courier', timestamp: now(),
    } as ShipmentEvent, 'EVT');

    db.create<Notification>('notifications', {
      id: generateId('NTF'), targetRole: 'admin', type: finalStatus === 'delivered' ? 'success' : 'warning',
      title: t.statusUpdated, message: `${shipment.trackingId} → ${t[finalStatus as keyof typeof t]}`,
      read: false, link: `/shipments/${shipment.id}`, createdAt: now(),
    } as Notification, 'NTF');

    toast.success(t.statusUpdated);
    setUpdateOpen(false);
    setDeliveryConfirmOpen(false);
    setNewStatus('');
    setNote('');
    setVerifyCode('');
    setVerified(false);
    setRefresh(r => r + 1);
  };

  const handleVerify = () => {
    if (verifyCode.toUpperCase() === shipment.verificationCode) {
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
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4 me-1" /> {t.myShipments}</Button>

      <div className="courier-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b">
          <div className="flex flex-col">
            <span className="font-mono-nums font-bold text-sm">{shipment.trackingId}</span>
            {shipment.verificationCode && (
              <span 
                className="font-mono-nums text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1 cursor-pointer hover:text-primary transition-colors"
                onClick={() => {
                  navigator.clipboard.writeText(shipment.verificationCode || '');
                  toast.success(t.copied || 'تم النسخ');
                }}
                title={t.copied || 'نسخ'}
              >
                <Shield className="w-3 h-3" /> {shipment.verificationCode}
              </span>
            )}
          </div>
          <StatusBadge status={shipment.status} size="md" />
        </div>
        <div className="p-5 space-y-4">
          <p className="font-semibold text-lg">{shipment.customerName}</p>
          <a href={`tel:${shipment.customerPhone}`} className="flex items-center gap-2 text-sm text-primary">
            <Phone className="w-4 h-4" /> {shipment.customerPhone}
          </a>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" /> {shipment.address}, {shipment.city}, {shipment.governorate}
          </div>
          <div className="flex justify-between p-3 bg-muted/50 rounded-xl">
            <div><span className="text-xs text-muted-foreground">{t.price}</span><p className="font-bold font-mono-nums">{formatCurrency(shipment.price)} {t.egp}</p></div>
            <div><span className="text-xs text-muted-foreground">{t.payment}</span><p className="font-medium">{shipment.paymentType === 'COD' ? t.cod : t.paid}</p></div>
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
      <div className="courier-card p-5">
        <h3 className="font-semibold text-sm mb-4">{t.timeline}</h3>
        <div className="space-y-3">
          {events.map((e, i) => (
            <motion.div key={e.id} className="flex gap-3"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}>
              <div className="flex flex-col items-center">
                <div className={`w-2.5 h-2.5 rounded-full ${i === 0 ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                {i < events.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
              </div>
              <div className="pb-3">
                <StatusBadge status={e.status} />
                {e.note && <p className="text-xs text-muted-foreground mt-1">{e.note}</p>}
                <p className="text-[10px] text-muted-foreground mt-1">{formatDateTime(e.timestamp, lang)}</p>
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
            <div className="absolute inset-0 bg-black/50" onClick={() => setUpdateOpen(false)} />
            <motion.div variants={bottomSheetVariants} initial="initial" animate="animate" exit="exit"
              className="relative w-full max-w-lg bg-card rounded-t-3xl p-6 space-y-4">
              <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-2" />
              <h3 className="text-lg font-bold text-center">{t.updateStatusTitle}</h3>
              <RadioGroup value={newStatus} onValueChange={setNewStatus} className="space-y-2">
                <div className="flex items-center gap-2 p-3 rounded-xl border"><RadioGroupItem value="out_for_delivery" id="ofd" /><Label htmlFor="ofd">{t.out_for_delivery}</Label></div>
                <div className="flex items-center gap-2 p-3 rounded-xl border"><RadioGroupItem value="delivered" id="del" /><Label htmlFor="del">✓ {t.delivered}</Label></div>
                <div className="flex items-center gap-2 p-3 rounded-xl border"><RadioGroupItem value="returned" id="ret" /><Label htmlFor="ret">✗ {t.returned}</Label></div>
              </RadioGroup>
              <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder={t.addNote} className="rounded-xl" />
              <motion.button whileTap={{ scale: 0.97 }} 
                onClick={() => {
                  if (newStatus === 'delivered' && shipment.verificationCode) {
                    setUpdateOpen(false);
                    setDeliveryConfirmOpen(true);
                  } else {
                    handleUpdate();
                  }
                }} 
                disabled={!newStatus}
                className="w-full py-3 rounded-2xl font-bold text-primary-foreground bg-primary disabled:opacity-50">
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
            <div className="absolute inset-0 bg-black/50" onClick={() => { setDeliveryConfirmOpen(false); setVerified(false); setVerifyCode(''); setVerifyError(''); }} />
            <motion.div variants={bottomSheetVariants} initial="initial" animate="animate" exit="exit"
              className="relative w-full max-w-lg bg-card rounded-t-3xl p-6">
              <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-4" />

              {!verified ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-bold">{t.confirmDelivery}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground text-center">{t.enterVerificationCode}</p>
                  <div>
                    <Label className="text-xs">{t.verificationCode}</Label>
                    <Input
                      value={verifyCode}
                      onChange={e => setVerifyCode(e.target.value.toUpperCase())}
                      placeholder="SH-XXXX"
                      maxLength={7}
                      className="w-full text-center text-2xl font-mono-nums font-bold tracking-widest rounded-2xl py-4 mt-2"
                      style={{
                        borderColor: verifyError ? '#F87171' : undefined,
                        letterSpacing: '0.2em'
                      }}
                    />
                    {verifyError && (
                      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="text-xs text-destructive mt-2 text-center">{verifyError}</motion.p>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => { setDeliveryConfirmOpen(false); setVerifyCode(''); setVerifyError(''); }}
                      className="flex-1 py-3 rounded-2xl border font-medium text-sm">{t.cancel}</button>
                    <motion.button whileTap={{ scale: 0.97 }} onClick={handleVerify}
                      disabled={verifyCode.length < 6}
                      className="flex-1 py-3 rounded-2xl font-bold text-sm text-primary-foreground bg-primary disabled:opacity-50">
                      {t.verifyCode}
                    </motion.button>
                  </div>
                </div>
              ) : (
                <motion.div className="space-y-4 text-center"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}>
                  <motion.div
                    className="w-16 h-16 rounded-full mx-auto flex items-center justify-center"
                    style={{ background: 'rgba(16,185,129,0.15)' }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}>
                    <CheckCircle className="w-8 h-8" style={{ color: '#10B981' }} />
                  </motion.div>
                  <h3 className="text-lg font-bold">{t.codeVerified}</h3>
                  <p className="text-sm text-muted-foreground">{t.verificationSuccess}</p>
                  <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder={t.addNote} className="rounded-xl" />
                  <motion.button whileTap={{ scale: 0.97 }} onClick={() => handleUpdate('delivered')}
                    className="w-full py-3 rounded-2xl font-bold text-white"
                    style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
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
