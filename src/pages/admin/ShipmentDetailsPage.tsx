import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/db';
import { generateId, now } from '@/db/helpers';
import type { Shipment, ShipmentEvent, Courier, ShipmentStatus } from '@/db/schema';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Phone, MapPin, Package, Copy, QrCode, Printer, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDateTime, formatCurrency } from '@/utils/formatters';
import { motion } from 'framer-motion';
import { pageVariants } from '@/animations/variants';
import QRCode from 'react-qr-code';

const STATUSES: ShipmentStatus[] = ['pending', 'assigned', 'out_for_delivery', 'delivered', 'returned', 'cancelled'];

const ShipmentDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t, lang } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [refresh, setRefresh] = useState(0);
  const [newStatus, setNewStatus] = useState<string>('');
  const [note, setNote] = useState('');

  const shipment = useMemo(() => db.getById<Shipment>('shipments', id || ''), [id, refresh]);
  const events = useMemo(() =>
    db.query<ShipmentEvent>('shipmentEvents', e => e.shipmentId === id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [id, refresh]);
  const couriers = useMemo(() => db.getAll<Courier>('couriers'), []);

  if (!shipment) return <div className="p-8 text-center text-muted-foreground">Not found</div>;

  const courierName = shipment.courierId ? couriers.find(c => c.id === shipment.courierId)?.name || '—' : '—';

  const handleUpdateStatus = () => {
    if (!newStatus) return;
    const updates: Record<string, any> = { status: newStatus, updatedAt: now() };
    if (newStatus === 'delivered') updates.deliveredAt = now();
    db.update('shipments', shipment.id, updates);

    db.create<ShipmentEvent>('shipmentEvents', {
      id: generateId('EVT'), shipmentId: shipment.id, status: newStatus as ShipmentStatus,
      note: note || undefined, actor: user?.name || '', actorRole: 'admin', timestamp: now(),
    } as ShipmentEvent, 'EVT');

    toast.success(t.statusUpdated);
    setNewStatus('');
    setNote('');
    setRefresh(r => r + 1);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(shipment.verificationCode || '');
    toast.success(t.copied);
  };

  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrintLabel = () => {
    window.print();
  };

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="max-w-5xl mx-auto">
      
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-section, #print-section * {
            visibility: visible;
          }
          #print-section {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            padding: 0mm !important;
            margin: 0 !important;
            background: white !important;
          }
          #print-section p, #print-section h1, #print-section h2, #print-section h3, #print-section span, #print-section div {
            color: black !important;
          }
          @page {
            margin: 0;
          }
        }
      `}</style>

      {/* --- PRINT ONLY AWB --- */}
      <div id="print-section" className="hidden print:block font-sans absolute top-0 left-0 w-full min-h-screen bg-white z-[9999]" dir="rtl">
        <div className="w-full max-w-[100mm] mx-auto bg-white border-[3px] border-black p-4 flex flex-col gap-3 min-h-[150mm] pb-8">
          
          {/* Header */}
          <div className="flex justify-between items-start border-b-[3px] border-black pb-3">
            <div>
              <h1 className="text-4xl font-black uppercase tracking-tighter leading-none mb-1">ShipFlow</h1>
              <p className="text-[10px] font-bold">Standard Delivery / شحن قياسي</p>
            </div>
            <div className="text-left border-2 border-black p-1">
              <p className="text-[10px] font-bold text-center">التاريخ ({formatDateTime(shipment.createdAt, lang).split(' ')[0]})</p>
              <div className="flex items-center justify-center p-1 mt-1">
                <p className="text-[10px] font-mono font-bold tracking-widest">{shipment.trackingId}</p>
              </div>
            </div>
          </div>

          {/* Seller / Sender */}
          <div className="border-[2px] border-black flex flex-col mt-2">
             <div className="bg-black text-white px-2 py-0.5 text-[10px] font-bold">الراسل (Sender)</div>
             <div className="p-2 leading-tight">
               <p className="text-sm font-black">الإدارة الرئيسية - شركة ShipFlow Logistics</p>
               <p className="text-xs mt-1 font-mono font-bold">TEL: +201000000000</p>
             </div>
          </div>

          {/* Customer / Receiver */}
          <div className="border-[3px] border-black flex flex-col mt-2">
             <div className="bg-black text-white px-2 py-1 text-xs font-bold leading-none">المرسَل إليه (Receiver) - محافظة {shipment.governorate}</div>
             <div className="p-3 leading-relaxed">
               <p className="text-xl font-black mb-1">{shipment.customerName}</p>
               <p className="text-base font-bold">{shipment.address}</p>
               <p className="text-sm font-bold mt-1 text-gray-800">{shipment.city} — {shipment.governorate}</p>
               <div className="mt-3 border-t-2 border-dashed border-gray-400 pt-2 flex flex-col">
                  <span className="text-[10px] text-gray-600 font-bold">رقم الهاتف للتواصل:</span>
                  <span className="font-mono text-2xl font-black tracking-wider leading-none mt-1">{shipment.customerPhone}</span>
               </div>
             </div>
          </div>

          {/* Financials & Courier */}
          <div className="flex gap-2 mt-2">
            <div className="border-[3px] border-black flex-[2] flex flex-col items-center justify-center py-4 relative">
              <span className="absolute top-0 right-0 bg-black text-white text-[10px] px-2 py-0.5 font-bold">المبلغ المطلوب (COD)</span>
              {shipment.paymentType === 'COD' ? (
                <p className="text-3xl font-black tracking-tight mt-2">{formatCurrency(shipment.price)} <span className="text-sm font-bold">EGP</span></p>
              ) : (
                <p className="text-2xl font-black mt-2">خالص (مدفوع مسبقاً)</p>
              )}
            </div>
            
            <div className="border-[3px] border-black flex-1 flex flex-col items-center justify-center p-2 text-center">
              <p className="text-[10px] font-bold mb-1 border-b border-black pb-1 w-full uppercase">المندوب</p>
              <p className="text-sm font-black leading-tight mt-1">{courierName}</p>
            </div>
          </div>

          {/* Verification Code Box */}
          {shipment.verificationCode && (
            <div className="mt-2 text-center border-t border-b border-dashed border-black py-3">
               <p className="text-[11px] font-bold uppercase mb-1">الرمز السري للتسليم (PIN)</p>
               <p className="text-4xl font-mono tracking-[0.25em] font-black">{shipment.verificationCode}</p>
            </div>
          )}

          <div className="mt-auto pt-6 text-center">
            <p className="text-[10px] font-bold">يرجى التأكد من استلام الشحنة بحالتها السليمة.</p>
            <p className="text-[9px] font-mono font-bold mt-1">Generated by ShipFlow System ™</p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/shipments')}>← {t.shipments}</Button>
        <span className="text-muted-foreground">/</span>
        <span className="font-mono-nums text-sm">{shipment.trackingId}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left */}
        <div className="lg:col-span-3 space-y-4">
          {/* Customer Card */}
          <div className="admin-card p-6">
            <h3 className="font-semibold text-sm mb-4">{t.customerInfo}</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2"><Package className="w-4 h-4 text-muted-foreground" /><span>{shipment.customerName}</span></div>
              <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-muted-foreground" /><span className="font-mono-nums">{shipment.customerPhone}</span></div>
              <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-muted-foreground" /><span>{shipment.address}, {shipment.city}, {shipment.governorate}</span></div>
            </div>
          </div>

          {/* Shipment Card */}
          <div className="admin-card p-6">
            <h3 className="font-semibold text-sm mb-4">{t.shipmentInfo}</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">{t.price}</span><p className="font-mono-nums font-bold">{formatCurrency(shipment.price)} {t.egp}</p></div>
              <div><span className="text-muted-foreground">{t.payment}</span><p>{shipment.paymentType === 'COD' ? t.cod : t.paid}</p></div>
              <div><span className="text-muted-foreground">{t.status}</span><div className="mt-1"><StatusBadge status={shipment.status} /></div></div>
              <div><span className="text-muted-foreground">{t.courier}</span><p>{courierName}</p></div>
            </div>
          </div>

          {/* Verification Code Card */}
          {shipment.verificationCode && (
            <div className="admin-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <QrCode className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm">{t.verificationCode}</h3>
              </div>
              <div className="flex items-start gap-6">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-2">{t.verificationCodeDesc}</p>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl font-bold font-mono-nums tracking-widest text-primary">
                      {shipment.verificationCode}
                    </span>
                    <button onClick={copyCode} className="p-2 rounded-lg hover:bg-muted text-muted-foreground">
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">{t.verificationCodeHint}</p>
                </div>
                <div className="p-3 bg-white rounded-xl">
                  <QRCode value={shipment.verificationCode} size={80} level="M" />
                </div>
              </div>
              <button 
                onClick={handlePrintLabel} 
                disabled={isPrinting}
                className="w-full mt-4 py-2.5 rounded-xl border text-sm font-medium flex items-center justify-center gap-2 hover:bg-muted transition-colors disabled:opacity-50"
              >
                {isPrinting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                {isPrinting ? 'جاري التجهيز...' : t.printLabel}
              </button>
            </div>
          )}

          {/* Update Status */}
          <div className="admin-card p-6">
            <h3 className="font-semibold text-sm mb-4">{t.updateStatus}</h3>
            <div className="space-y-3">
              <div>
                <Label>{t.newStatus}</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map(s => <SelectItem key={s} value={s}>{t[s]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label>{t.addNote}</Label>
                  {shipment.verificationCode && (
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 text-[10px] text-primary px-2 hover:bg-primary/10" 
                      onClick={() => setNote(prev => prev ? `${prev}\nرمز التسليم: ${shipment.verificationCode}` : `رمز التسليم: ${shipment.verificationCode}`)}
                    >
                      <Copy className="w-3 h-3 me-1" />
                      إدراج رمز التسليم
                    </Button>
                  )}
                </div>
                <Textarea value={note} onChange={e => setNote(e.target.value)} className="rounded-xl" />
              </div>
              <motion.div whileTap={{ scale: 0.97 }}>
                <Button onClick={handleUpdateStatus} disabled={!newStatus} className="rounded-xl">{t.saveUpdate}</Button>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Right - Timeline */}
        <div className="lg:col-span-2">
          <div className="admin-card p-6">
            <h3 className="font-semibold text-sm mb-4">{t.timeline}</h3>
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.noDataYet}</p>
            ) : (
              <div className="space-y-4">
                {events.map((event, i) => (
                  <motion.div key={event.id} className="flex gap-3"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}>
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ${i === 0 ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                      {i < events.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                    </div>
                    <div className="pb-4">
                      <StatusBadge status={event.status} />
                      {event.note && <p className="text-xs text-muted-foreground mt-1">{event.note}</p>}
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                        <span>{event.actor}</span>
                        <span>•</span>
                        <span>{formatDateTime(event.timestamp, lang)}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ShipmentDetailsPage;
