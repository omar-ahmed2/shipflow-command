import React, { useState, useMemo } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { db } from '@/db';
import { generateId, hashPassword, now } from '@/db/helpers';
import type { Seller, User, Shipment, Settlement } from '@/db/schema';
import { EmptyState } from '@/components/shared/EmptyState';
import { Plus, Search, Store, Grid3X3, List, Wallet, Receipt, CheckCircle, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { formatCurrency, formatDateTime } from '@/utils/formatters';

const SellersPage: React.FC = () => {
  const { t, lang } = useTheme();
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [modalOpen, setModalOpen] = useState(false);
  const [walletSeller, setWalletSeller] = useState<Seller | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [search, setSearch] = useState('');

  const sellers = useMemo(() => db.getAll<Seller>('sellers'), [refresh]);
  const shipments = useMemo(() => db.getAll<Shipment>('shipments'), [refresh]);
  const settlements = useMemo(() => db.getAll<Settlement>('settlements').sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [refresh]);

  const filtered = sellers.filter(s => !search || s.storeName.toLowerCase().includes(search.toLowerCase()) || s.phone.includes(search));

  const [form, setForm] = useState({ storeName: '', phone: '', email: '', password: '', address: '', shippingFee: 40 });
  const updateForm = (k: string, v: string | number) => setForm(prev => ({ ...prev, [k]: v }));

  const handleCreate = () => {
    if (!form.storeName || !form.phone || !form.email || !form.password) return;

    // Create User
    const userId = generateId('USR');
    db.create<User>('users', {
      id: userId, name: form.storeName, email: form.email,
      passwordHash: hashPassword(form.password), role: 'seller',
      phone: form.phone, status: 'active', createdAt: now(), updatedAt: now(),
    } as User, 'USR');

    // Create Seller
    db.create<Seller>('sellers', {
      id: generateId('SEL'), userId, storeName: form.storeName, phone: form.phone,
      address: form.address, joinDate: now(), status: 'active',
      shippingFee: Number(form.shippingFee) || 40,
    } as Seller, 'SEL');

    toast.success(`${t.sellerCreated || 'تم إضافة المتجر'}: ${form.storeName}`);
    setForm({ storeName: '', phone: '', email: '', password: '', address: '', shippingFee: 40 });
    setModalOpen(false);
    setRefresh(r => r + 1);
  };

  const getSellerStats = (sellerId: string) => {
    const cs = shipments.filter(s => s.sellerId === sellerId);
    const pendingCount = cs.filter(s => s.status === 'pending').length;
    const deliveredCount = cs.filter(s => s.status === 'delivered').length;
    
    // Delivered but not settled with seller yet.
    // Note: codCollected is the COURIER's concern (did they hand cash to admin).
    // The SELLER is owed money once shipment is "delivered" to the customer,
    // regardless of whether courier has remitted cash to admin yet.
    const pendingSettlement = cs.filter(s => s.status === 'delivered' && !s.sellerSettled);
    
    // Amount owed to seller = Shipment Price - Shipping Fee
    let pendingAmount = 0;
    pendingSettlement.forEach(s => {
      pendingAmount += (s.price - (s.shippingFee || 40));
    });

    // Goods in transit (not delivered yet)
    const goodsInTransit = cs.filter(s => ['assigned', 'out_for_delivery', 'pending'].includes(s.status));
    const goodsInTransitValue = goodsInTransit.reduce((sum, s) => sum + s.price, 0);

    return { 
      total: cs.length, 
      pendingCount, 
      deliveredCount, 
      pendingAmount, 
      pendingSettlement, 
      goodsInTransitValue 
    };
  };

  const handleSettleWallet = () => {
      if (!walletSeller) return;
      const stats = getSellerStats(walletSeller.id);
      if (stats.pendingAmount <= 0) return toast.info("لا توجد مبالغ مستحقة للتاجر حالياً.");

      // Mark as settled
      stats.pendingSettlement.forEach(s => {
          db.update('shipments', s.id, { sellerSettled: true });
      });

      // Add Settlement Record
      db.create<Settlement>('settlements', {
          id: generateId('STL'),
          sellerId: walletSeller.id,
          amount: stats.pendingAmount,
          shipmentCount: stats.pendingSettlement.length,
          date: now(),
          adminName: 'Admin', // In real app, fetch from auth context
      } as Settlement, 'STL');

      toast.success(`تم تسوية مبلغ ${formatCurrency(stats.pendingAmount)} جنيه للتاجر بنجاح.`);
      setRefresh(r => r + 1);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{t.sellers || 'المتاجر'} ({sellers.length})</h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className={`rounded-xl ${viewMode === 'grid' ? 'bg-muted' : ''}`} onClick={() => setViewMode('grid')}>
            <Grid3X3 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className={`rounded-xl ${viewMode === 'table' ? 'bg-muted' : ''}`} onClick={() => setViewMode('table')}>
            <List className="w-4 h-4" />
          </Button>
          <Button onClick={() => setModalOpen(true)} className="rounded-xl">
            <Plus className="w-4 h-4 me-2" /> {t.addSeller || 'إضافة متجر'}
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder={t.search} value={search} onChange={e => setSearch(e.target.value)} className="ps-9 rounded-xl" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Store className="w-8 h-8 text-muted-foreground" />} title="لا توجد متاجر" actionLabel={t.addSeller || 'إضافة متجر'} onAction={() => setModalOpen(true)} />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(s => {
            const stats = getSellerStats(s.id);
            return (
              <div key={s.id} className="admin-card p-5 hover:-translate-y-1 transition-transform relative">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                      {s.storeName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold">{s.storeName}</p>
                      <p className="text-xs text-muted-foreground">{s.phone} · مصاريف الشحن: {s.shippingFee} ج</p>
                    </div>
                  </div>
                  <Button variant={stats.pendingAmount > 0 ? "default" : "outline"} size="icon" onClick={() => setWalletSeller(s)} className="rounded-full w-9 h-9">
                    <Wallet className="w-4 h-4" />
                  </Button>
                </div>
                
                {stats.pendingAmount > 0 && (
                    <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border border-emerald-200 dark:border-emerald-900 rounded-lg p-3 mb-3 flex flex-col gap-1 text-sm font-semibold">
                      <div className="flex justify-between items-center text-primary">
                        <span className="text-xs">مستحقات للتاجر (أرباح)</span>
                        <span className="font-bold">{formatCurrency(stats.pendingAmount)} ج</span>
                      </div>
                    </div>
                )}

                <div className="grid grid-cols-3 gap-2 text-center mb-1">
                  <div className="p-2 bg-muted/50 rounded-lg">
                    <p className="text-sm font-bold font-mono-nums">{stats.total}</p>
                    <p className="text-[10px] text-muted-foreground">كل الشحنات</p>
                  </div>
                  <div className="p-2 bg-muted/50 rounded-lg">
                    <p className="text-sm font-bold font-mono-nums text-orange-500">{stats.goodsInTransitValue}</p>
                    <p className="text-[10px] text-muted-foreground">قيمة بالطريق</p>
                  </div>
                  <div className="p-2 bg-muted/50 rounded-lg">
                    <p className="text-sm font-bold font-mono-nums text-success">{stats.deliveredCount}</p>
                    <p className="text-[10px] text-muted-foreground">تم التسليم</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="admin-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/30">
              <th className="p-3 text-start font-medium">{t.sellerName || 'اسم المتجر'}</th>
              <th className="p-3 text-start font-medium">{t.phone}</th>
              <th className="p-3 text-start font-medium">الشحنات</th>
              <th className="p-3 text-start font-medium">المستحقات للتاجر</th>
              <th className="p-3"></th>
            </tr></thead>
            <tbody>{filtered.map(s => {
              const stats = getSellerStats(s.id);
              return (
                <tr key={s.id} className="border-b hover:bg-muted/30">
                  <td className="p-3 font-medium">{s.storeName}</td>
                  <td className="p-3 font-mono-nums">{s.phone}</td>
                  <td className="p-3 font-mono-nums">{stats.total}</td>
                  <td className="p-3 font-bold text-emerald-600">{formatCurrency(stats.pendingAmount)} ج</td>
                  <td className="p-3 text-end">
                    <Button variant="outline" size="sm" onClick={() => setWalletSeller(s)}>
                      <Wallet className="w-4 h-4 me-2"/> تسوية مالية
                    </Button>
                  </td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      )}

      {/* Add Seller Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t.addSeller || 'إضافة متجر'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>{t.sellerName || 'اسم المتجر'} *</Label><Input value={form.storeName} onChange={e => updateForm('storeName', e.target.value)} className="rounded-xl mt-1" /></div>
            <div><Label>{t.phone} *</Label><Input value={form.phone} onChange={e => updateForm('phone', e.target.value)} className="rounded-xl mt-1" /></div>
            <div><Label>{t.address}</Label><Input value={form.address} onChange={e => updateForm('address', e.target.value)} className="rounded-xl mt-1" /></div>
            <div><Label>سعر الشحن الافتراضي للمتجر (ج.م) *</Label><Input type="number" value={form.shippingFee} onChange={e => updateForm('shippingFee', e.target.value)} className="rounded-xl mt-1" /></div>
            <hr />
            <p className="text-xs text-muted-foreground">{t.loginDesc}</p>
            <div><Label>{t.email} *</Label><Input type="email" value={form.email} onChange={e => updateForm('email', e.target.value)} className="rounded-xl mt-1" /></div>
            <div><Label>{t.password} *</Label><Input type="password" value={form.password} onChange={e => updateForm('password', e.target.value)} className="rounded-xl mt-1" /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>{t.cancel}</Button>
            <Button onClick={handleCreate} className="rounded-xl">{t.addSeller || 'إضافة متجر'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Wallet / Settlement Modal */}
      {walletSeller && (
          <Dialog open={!!walletSeller} onOpenChange={(open) => !open && setWalletSeller(null)}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-primary" /> تسوية التاجر: {walletSeller.storeName}
                      </DialogTitle>
                  </DialogHeader>

                  {/* Summary */}
                  {(() => {
                      const stats = getSellerStats(walletSeller.id);
                      const sellerSettlements = settlements.filter(s => s.sellerId === walletSeller.id);
                      
                      return (
                          <div className="space-y-6 mt-4 mb-2">
                              {/* Summary Boxes */}
                              <div className="grid grid-cols-2 gap-4">
                                <div className="border border-border/50 bg-primary/5 p-4 rounded-2xl flex flex-col justify-center items-center text-center">
                                    <Package className="w-6 h-6 text-primary mb-2 opacity-80" />
                                    <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-widest">بضاعة بالطريق</p>
                                    <p className="text-2xl font-black text-primary tracking-tight font-mono-nums mb-1">{formatCurrency(stats.goodsInTransitValue)} ج.م</p>
                                    <p className="text-[10px] bg-background px-2 py-0.5 rounded-full border text-muted-foreground">شحنات لم تسلم بعد</p>
                                </div>
                                <div className="border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-2xl flex flex-col justify-center items-center text-center">
                                    <Wallet className="w-6 h-6 text-emerald-600 mb-2 opacity-80" />
                                    <p className="text-xs font-semibold text-emerald-600 mb-1 uppercase tracking-widest">أرباح جاهزة للتسوية</p>
                                    <p className="text-2xl font-black text-emerald-600 tracking-tight font-mono-nums mb-1">{formatCurrency(stats.pendingAmount)} ج.م</p>
                                    <p className="text-[10px] bg-background px-2 py-0.5 rounded-full border text-muted-foreground">صافي مبيعات - الشحن</p>
                                </div>
                              </div>

                              <div className="border-t border-border/50 pt-4 flex flex-col items-center">
                                  {stats.pendingAmount > 0 ? (
                                    <Button onClick={handleSettleWallet} className="mt-2 rounded-xl w-full max-w-sm" size="lg">
                                        <CheckCircle className="w-5 h-5 me-2" />
                                        دفع {formatCurrency(stats.pendingAmount)} ج للتاجر وتسوية الشحنات
                                    </Button>
                                  ) : (
                                    <div className="mt-2 px-4 py-2 border rounded-full bg-muted text-muted-foreground font-semibold text-sm">
                                       لا توجد مستحقات باقية للتاجر
                                    </div>
                                  )}
                              </div>

                              <hr className="my-2" />

                               {/* History Feed */}
                               <div>
                                   <div className="flex items-center gap-2 mb-4 text-emerald-700 dark:text-emerald-500 font-bold">
                                       <Receipt className="w-5 h-5" /> 
                                       <h3>سجل التسويات السابقة للتاجر</h3>
                                   </div>
                                   
                                   {sellerSettlements.length === 0 ? (
                                       <p className="text-sm text-center py-6 text-muted-foreground bg-muted/30 rounded-xl">لا يوجد أي تسويات سابقة لهذا التاجر.</p>
                                   ) : (
                                       <div className="space-y-3">
                                           {sellerSettlements.map(settlement => (
                                               <div key={settlement.id} className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between p-4 border rounded-xl hover:bg-muted/30 transition-colors">
                                                   <div>
                                                       <p className="font-bold text-lg text-primary leading-tight font-mono-nums">
                                                          دفع: {formatCurrency(settlement.amount)} ج
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

export default SellersPage;
