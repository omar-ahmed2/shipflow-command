import React, { useState, useMemo } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { db } from '@/db';
import { generateId, hashPassword, now } from '@/db/helpers';
import type { Courier, User, Shipment, Settlement } from '@/db/schema';
import { EmptyState } from '@/components/shared/EmptyState';
import { Plus, Search, Truck, Grid3X3, List, Wallet, Receipt, CheckCircle, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { formatCurrency, formatDateTime } from '@/utils/formatters';

const CouriersPage: React.FC = () => {
  const { t, lang } = useTheme();
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [modalOpen, setModalOpen] = useState(false);
  const [walletCourier, setWalletCourier] = useState<Courier | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [search, setSearch] = useState('');

  const couriers = useMemo(() => db.getAll<Courier>('couriers'), [refresh]);
  const shipments = useMemo(() => db.getAll<Shipment>('shipments'), [refresh]);
  const settlements = useMemo(() => db.getAll<Settlement>('settlements').sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [refresh]);

  const filtered = couriers.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search));

  const [form, setForm] = useState({ name: '', phone: '', zone: '', vehicleType: 'motorcycle', email: '', password: '', notes: '' });
  const updateForm = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const handleCreate = () => {
    if (!form.name || !form.phone || !form.zone || !form.email || !form.password) return;

    // Create User
    const userId = generateId('USR');
    db.create<User>('users', {
      id: userId, name: form.name, email: form.email,
      passwordHash: hashPassword(form.password), role: 'courier',
      phone: form.phone, status: 'active', createdAt: now(), updatedAt: now(),
    } as User, 'USR');

    // Create Courier
    db.create<Courier>('couriers', {
      id: generateId('COU'), userId, name: form.name, phone: form.phone,
      zone: form.zone, vehicleType: form.vehicleType as any,
      status: 'active', joinDate: now(), notes: form.notes || undefined,
    } as Courier, 'COU');

    toast.success(`${t.courierCreated}: ${form.name}`);
    setForm({ name: '', phone: '', zone: '', vehicleType: 'motorcycle', email: '', password: '', notes: '' });
    setModalOpen(false);
    setRefresh(r => r + 1);
  };

  const getCourierStats = (courierId: string) => {
    const cs = shipments.filter(s => s.courierId === courierId);
    const assigned = cs.filter(s => ['assigned', 'out_for_delivery'].includes(s.status)).length;
    const delivered = cs.filter(s => s.status === 'delivered').length;
    const returned = cs.filter(s => s.status === 'returned').length;
    const rate = cs.length > 0 ? Math.round((delivered / cs.length) * 100) : 0;
    
    // Cash debt (ready to remit)
    const pendingCodShipments = cs.filter(s => s.status === 'delivered' && s.paymentType === 'COD' && !s.codCollected && s.price > 0);
    const pendingAmount = pendingCodShipments.reduce((sum, s) => sum + s.price + (s.shippingFee || 0), 0);

    // Goods debt (not yet delivered, but out for delivery or assigned) - عهدة بضاعة
    const goodsInTransitShipments = cs.filter(s => ['assigned', 'out_for_delivery'].includes(s.status) && s.paymentType === 'COD' && s.price > 0);
    const goodsInTransitAmount = goodsInTransitShipments.reduce((sum, s) => sum + s.price + (s.shippingFee || 0), 0);

    // Total Exepcted Custody
    const totalCustody = pendingAmount + goodsInTransitAmount;

    return { assigned, delivered, returned, rate, total: cs.length, pendingAmount, pendingCodShipments, goodsInTransitAmount, totalCustody };
  };

  const handleSettleWallet = () => {
      if (!walletCourier) return;
      const stats = getCourierStats(walletCourier.id);
      if (stats.pendingAmount <= 0) return toast.info("لاتوجد سيولة نقدية للتوريد حالياً. قم بتسليم الشحنات أولاً.");

      // Mark all pending COD as collected
      stats.pendingCodShipments.forEach(s => {
          db.update('shipments', s.id, { codCollected: true });
      });

      // Add Settlement Record
      db.create<Settlement>('settlements', {
          id: generateId('STL'),
          courierId: walletCourier.id,
          amount: stats.pendingAmount,
          shipmentCount: stats.pendingCodShipments.length,
          date: now(),
          adminName: 'Admin', // In real app, fetch from auth context
      } as Settlement, 'STL');

      toast.success(`تم استلام نقدية بقيمة ${formatCurrency(stats.pendingAmount)} جنيه بنجاح وإقفال عهدة الكاش.`);
      setRefresh(r => r + 1);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{t.couriers} ({couriers.length})</h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className={`rounded-xl ${viewMode === 'grid' ? 'bg-muted' : ''}`} onClick={() => setViewMode('grid')}>
            <Grid3X3 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className={`rounded-xl ${viewMode === 'table' ? 'bg-muted' : ''}`} onClick={() => setViewMode('table')}>
            <List className="w-4 h-4" />
          </Button>
          <Button onClick={() => setModalOpen(true)} className="rounded-xl">
            <Plus className="w-4 h-4 me-2" /> {t.addCourier}
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder={t.search} value={search} onChange={e => setSearch(e.target.value)} className="ps-9 rounded-xl" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Truck className="w-8 h-8 text-muted-foreground" />} title={t.addFirstCourier} actionLabel={t.addCourier} onAction={() => setModalOpen(true)} />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => {
            const stats = getCourierStats(c.id);
            return (
              <div key={c.id} className="admin-card p-5 hover:-translate-y-1 transition-transform relative">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                      {c.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold">{c.name}</p>
                      <p className="text-xs text-muted-foreground">● {t[c.status]} · {c.zone}</p>
                    </div>
                  </div>
                  <Button variant={stats.totalCustody > 0 ? "default" : "outline"} size="icon" onClick={() => setWalletCourier(c)} className="rounded-full w-9 h-9">
                    <Wallet className="w-4 h-4" />
                  </Button>
                </div>
                
                {stats.totalCustody > 0 && (
                    <div className="bg-orange-50 dark:bg-orange-950/20 text-orange-600 border border-orange-200 dark:border-orange-900 rounded-lg p-2 mb-3 flex flex-col gap-1 text-sm font-semibold">
                      <div className="flex justify-between items-center opacity-70">
                        <span className="text-xs">بضاعة بالطريق</span>
                        <span>{formatCurrency(stats.goodsInTransitAmount)} ج</span>
                      </div>
                      <div className="flex justify-between items-center text-primary">
                        <span className="text-xs">كاش جاهز للتوريد</span>
                        <span className="font-bold">{formatCurrency(stats.pendingAmount)} ج</span>
                      </div>
                      <div className="w-full h-px bg-orange-200 dark:bg-orange-800 my-1"/>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-foreground">إجمالي العهدة للحساب</span>
                        <span className="font-bold text-foreground">{formatCurrency(stats.totalCustody)} ج</span>
                      </div>
                    </div>
                )}

                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                  <div className="p-2 bg-muted/50 rounded-lg">
                    <p className="text-sm font-bold font-mono-nums">{stats.assigned}</p>
                    <p className="text-[10px] text-muted-foreground">{t.assignedShipments}</p>
                  </div>
                  <div className="p-2 bg-muted/50 rounded-lg">
                    <p className="text-sm font-bold font-mono-nums text-success">{stats.delivered}</p>
                    <p className="text-[10px] text-muted-foreground">{t.deliveredShipments}</p>
                  </div>
                  <div className="p-2 bg-muted/50 rounded-lg">
                    <p className="text-sm font-bold font-mono-nums text-destructive">{stats.returned}</p>
                    <p className="text-[10px] text-muted-foreground">{t.returnedShipments}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{t.successRate}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-success rounded-full transition-all" style={{ width: `${stats.rate}%` }} />
                  </div>
                  <span className="text-xs font-mono-nums font-medium">{stats.rate}%</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="admin-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/30">
              <th className="p-3 text-start font-medium">{t.name}</th>
              <th className="p-3 text-start font-medium">{t.phone}</th>
              <th className="p-3 text-start font-medium">الخزنة / بضاعة</th>
              <th className="p-3 text-start font-medium">إجمالي العهدة</th>
              <th className="p-3 text-start font-medium">{t.successRate}</th>
              <th className="p-3"></th>
            </tr></thead>
            <tbody>{filtered.map(c => {
              const stats = getCourierStats(c.id);
              return (
                <tr key={c.id} className="border-b hover:bg-muted/30">
                  <td className="p-3 font-medium">{c.name}</td>
                  <td className="p-3 font-mono-nums">{c.phone}</td>
                  <td className="p-3">
                    <div className="flex flex-col text-xs font-mono-nums">
                      <span className="text-primary font-bold">نقدي: {formatCurrency(stats.pendingAmount)} ج</span>
                      <span className="text-muted-foreground">بضاعة: {formatCurrency(stats.goodsInTransitAmount)} ج</span>
                    </div>
                  </td>
                  <td className="p-3 font-bold text-orange-600">{formatCurrency(stats.totalCustody)} ج</td>
                  <td className="p-3 font-mono-nums">{stats.rate}%</td>
                  <td className="p-3 text-end">
                    <Button variant="outline" size="sm" onClick={() => setWalletCourier(c)}>
                      <Wallet className="w-4 h-4 me-2"/> تصفية وإدارة
                    </Button>
                  </td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      )}

      {/* Add Courier Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t.addCourier}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>{t.courierName} *</Label><Input value={form.name} onChange={e => updateForm('name', e.target.value)} className="rounded-xl mt-1" /></div>
            <div><Label>{t.phone} *</Label><Input value={form.phone} onChange={e => updateForm('phone', e.target.value)} className="rounded-xl mt-1" /></div>
            <div><Label>{t.zone} *</Label><Input value={form.zone} onChange={e => updateForm('zone', e.target.value)} className="rounded-xl mt-1" /></div>
            <div>
              <Label>{t.vehicleType}</Label>
              <Select value={form.vehicleType} onValueChange={v => updateForm('vehicleType', v)}>
                <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="motorcycle">{t.motorcycle}</SelectItem>
                  <SelectItem value="car">{t.car}</SelectItem>
                  <SelectItem value="van">{t.van}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <hr />
            <p className="text-xs text-muted-foreground">{t.loginDesc}</p>
            <div><Label>{t.email} *</Label><Input type="email" value={form.email} onChange={e => updateForm('email', e.target.value)} className="rounded-xl mt-1" /></div>
            <div><Label>{t.password} *</Label><Input type="password" value={form.password} onChange={e => updateForm('password', e.target.value)} className="rounded-xl mt-1" /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>{t.cancel}</Button>
            <Button onClick={handleCreate} className="rounded-xl">{t.addCourier}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Wallet / Settlement Modal */}
      {walletCourier && (
          <Dialog open={!!walletCourier} onOpenChange={(open) => !open && setWalletCourier(null)}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-primary" /> خزانة المندوب: {walletCourier.name}
                      </DialogTitle>
                  </DialogHeader>

                  {/* Summary */}
                  {(() => {
                      const stats = getCourierStats(walletCourier.id);
                      const courierSettlements = settlements.filter(s => s.courierId === walletCourier.id);
                      
                      return (
                          <div className="space-y-6 mt-4 mb-2">
                              {/* Summary Boxes */}
                              <div className="grid grid-cols-2 gap-4">
                                <div className="border border-border/50 bg-primary/5 p-4 rounded-2xl flex flex-col justify-center items-center text-center">
                                    <Package className="w-6 h-6 text-primary mb-2 opacity-80" />
                                    <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-widest">عهدة بضاعة (بالطريق)</p>
                                    <p className="text-2xl font-black text-primary tracking-tight font-mono-nums mb-1">{formatCurrency(stats.goodsInTransitAmount)} ج.م</p>
                                    <p className="text-[10px] bg-background px-2 py-0.5 rounded-full border text-muted-foreground">شحنات لم تُسلم للعميل بعد</p>
                                </div>
                                <div className="border border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-900/10 p-4 rounded-2xl flex flex-col justify-center items-center text-center">
                                    <Wallet className="w-6 h-6 text-orange-600 mb-2 opacity-80" />
                                    <p className="text-xs font-semibold text-orange-600 mb-1 uppercase tracking-widest">نقدية جاهزة للتوريد</p>
                                    <p className="text-2xl font-black text-orange-600 tracking-tight font-mono-nums mb-1">{formatCurrency(stats.pendingAmount)} ج.م</p>
                                    <p className="text-[10px] bg-background px-2 py-0.5 rounded-full border text-muted-foreground">تم تحصيلها من العملاء</p>
                                </div>
                              </div>

                              <div className="border-t border-border/50 pt-4 flex flex-col items-center">
                                  <p className="text-xs font-semibold text-muted-foreground uppercase">إجمالي عهدة المندوب (كاش + بضاعة)</p>
                                  <p className="text-4xl font-black font-mono-nums mt-1">{formatCurrency(stats.totalCustody)} <span className="text-lg">ج.م</span></p>

                                  {stats.pendingAmount > 0 ? (
                                    <Button onClick={handleSettleWallet} className="mt-5 rounded-xl w-full max-w-sm" size="lg">
                                        <CheckCircle className="w-5 h-5 me-2" />
                                        استلام مبلغ {formatCurrency(stats.pendingAmount)} ج من المندوب وإقفال
                                    </Button>
                                  ) : (
                                    <div className="mt-4 px-4 py-2 border rounded-full bg-muted text-muted-foreground font-semibold text-sm">
                                       لاتوجد نقدية جاهزة للتوريد (رصيد الكاش مُصفر)
                                    </div>
                                  )}
                              </div>

                              <hr className="my-2" />

                               {/* History Feed */}
                               <div>
                                   <div className="flex items-center gap-2 mb-4 text-emerald-700 dark:text-emerald-500 font-bold">
                                       <Receipt className="w-5 h-5" /> 
                                       <h3>سجل الدفعات والتوريدات السابقة</h3>
                                   </div>
                                   
                                   {courierSettlements.length === 0 ? (
                                       <p className="text-sm text-center py-6 text-muted-foreground bg-muted/30 rounded-xl">لا يوجد أي توريدات سابقة لهذا المندوب.</p>
                                   ) : (
                                       <div className="space-y-3">
                                           {courierSettlements.map(settlement => (
                                               <div key={settlement.id} className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between p-4 border rounded-xl hover:bg-muted/30 transition-colors">
                                                   <div>
                                                       <p className="font-bold text-lg text-primary leading-tight font-mono-nums">
                                                          + {formatCurrency(settlement.amount)} ج
                                                       </p>
                                                       <p className="text-xs text-muted-foreground mt-0.5">
                                                           تسوية {settlement.shipmentCount} شحنات • بواسطة {settlement.adminName}
                                                       </p>
                                                   </div>
                                                   <div className="text-xs font-mono-nums bg-muted px-3 py-1.5 rounded-lg text-center font-medium">
                                                       {formatDateTime(settlement.date, lang)}
                                                   </div>
                                               </div>
                                           ))}
                                       </div>
                                   )}
                               </div>
                          </div>
                      );
                  })()}
              </DialogContent>
          </Dialog>
      )}

    </div>
  );
};

export default CouriersPage;
