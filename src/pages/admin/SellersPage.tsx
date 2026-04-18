import React, { useState, useMemo } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { adminService } from '@/services/adminService';
import { EmptyState } from '@/components/shared/EmptyState';
import { Plus, Search, Store, Grid3X3, List, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '@/utils/formatters';

const SellersPage: React.FC = () => {
  const { t } = useTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Queries
  const { data: sellers = [], isLoading: sellerLoading } = useQuery({ queryKey: ['sellers'], queryFn: api.sellers.getAll });
  const { data: shipments = [], isLoading: shipLoading } = useQuery({ queryKey: ['shipments'], queryFn: api.shipments.getAll });

  const isLoading = sellerLoading || shipLoading;

  const filtered = sellers.filter(s => !search || s.storeName.toLowerCase().includes(search.toLowerCase()) || s.phone.includes(search));

  const [form, setForm] = useState({ storeName: '', phone: '', email: '', password: '', address: '' });
  const updateForm = (k: string, v: string | number) => setForm(prev => ({ ...prev, [k]: v }));

  const handleCreate = async () => {
    if (!form.storeName || !form.phone || !form.email || !form.password) {
      toast.error('يرجى ملء كافة الحقول المطلوبة');
      return;
    }

    setIsCreating(true);
    try {
      await adminService.createUser({
        email: form.email,
        password: form.password,
        name: form.storeName,
        role: 'seller',
        phone: form.phone,
        storeName: form.storeName,
        address: form.address
      });

      toast.success(`${t.sellerCreated || 'تم إضافة المتجر'}: ${form.storeName}`);
      queryClient.invalidateQueries({ queryKey: ['sellers'] });
      setForm({ storeName: '', phone: '', email: '', password: '', address: '' });
      setModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء إنشاء الحساب');
    } finally {
      setIsCreating(false);
    }
  };

  const getSellerStats = (sellerId: string) => {
    const cs = shipments.filter(s => s.sellerId === sellerId);
    const deliveredCount = cs.filter(s => s.status === 'delivered').length;
    
    const pendingSettlement = cs.filter(s => s.status === 'delivered' && !s.sellerSettled);
    const pendingAmount = pendingSettlement.reduce((sum, s) => sum + s.price, 0);

    const goodsInTransit = cs.filter(s => ['assigned', 'out_for_delivery', 'pending'].includes(s.status));
    const goodsInTransitValue = goodsInTransit.reduce((sum, s) => sum + s.price, 0);

    return { 
      total: cs.length, 
      deliveredCount, 
      pendingAmount, 
      goodsInTransitValue 
    };
  };

  return (
    <div className="space-y-4 animate-fade-in relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-20 min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

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

      {filtered.length === 0 && !isLoading ? (
        <EmptyState icon={<Store className="w-8 h-8 text-muted-foreground" />} title="لا توجد متاجر" actionLabel={t.addSeller || 'إضافة متجر'} onAction={() => setModalOpen(true)} />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(s => {
            const stats = getSellerStats(s.id);
            return (
              <div key={s.id} className="admin-card p-5 hover:-translate-y-1 transition-transform relative">
                <div className="flex justify-between items-start mb-4">
                  <div 
                    className="flex items-center gap-3 cursor-pointer hover:underline group"
                    onClick={() => navigate(`/sellers/${s.id}`)}
                  >
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                      {s.storeName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold">{s.storeName}</p>
                      <p className="text-xs text-muted-foreground">{s.phone}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => navigate(`/sellers/${s.id}`)} className="rounded-full w-9 h-9">
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
                
                {stats.pendingAmount > 0 && (
                    <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border border-emerald-200 dark:border-emerald-900 rounded-lg p-3 mb-3 flex flex-col gap-1 text-sm font-semibold">
                      <div className="flex justify-between items-center text-primary">
                        <span className="text-xs">المستحقات للتاجر</span>
                        <span className="font-bold">{formatCurrency(stats.pendingAmount)} ج</span>
                      </div>
                    </div>
                )}

                <div className="grid grid-cols-3 gap-2 text-center mb-1">
                  <div className="p-2 bg-muted/50 rounded-lg">
                    <p className="text-sm font-bold font-mono-nums">{stats.total}</p>
                    <p className="text-[10px] text-muted-foreground">الكل</p>
                  </div>
                  <div className="p-2 bg-muted/50 rounded-lg">
                    <p className="text-sm font-bold font-mono-nums text-orange-500">{formatCurrency(stats.goodsInTransitValue)}</p>
                    <p className="text-[10px] text-muted-foreground">بالطريق</p>
                  </div>
                  <div className="p-2 bg-muted/50 rounded-lg">
                    <p className="text-sm font-bold font-mono-nums text-success">{stats.deliveredCount}</p>
                    <p className="text-[10px] text-muted-foreground">مُسلم</p>
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
                  <td className="p-3">
                    <button 
                      className="font-medium hover:text-primary hover:underline transition-colors"
                      onClick={() => navigate(`/sellers/${s.id}`)}
                    >
                      {s.storeName}
                    </button>
                  </td>
                  <td className="p-3 font-mono-nums">{s.phone}</td>
                  <td className="p-3 font-mono-nums">{stats.total}</td>
                  <td className="p-3 font-bold text-emerald-600">{formatCurrency(stats.pendingAmount)} ج</td>
                  <td className="p-3 text-end">
                    <Button variant="outline" size="sm" onClick={() => navigate(`/sellers/${s.id}`)}>
                      <ExternalLink className="w-4 h-4 me-2"/> {t.viewProfile}
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
            <div><Label>{t.sellerName || 'اسم المتجر'} *</Label><Input value={form.storeName} onChange={e => updateForm('storeName', e.target.value)} disabled={isCreating} className="rounded-xl mt-1" /></div>
            <div><Label>{t.phone} *</Label><Input value={form.phone} onChange={e => updateForm('phone', e.target.value)} disabled={isCreating} className="rounded-xl mt-1" /></div>
            <div><Label>{t.address}</Label><Input value={form.address} onChange={e => updateForm('address', e.target.value)} disabled={isCreating} className="rounded-xl mt-1" /></div>
            <hr />
            <p className="text-xs text-muted-foreground">{t.loginDesc}</p>
            <div><Label>{t.email} *</Label><Input type="email" value={form.email} onChange={e => updateForm('email', e.target.value)} disabled={isCreating} className="rounded-xl mt-1" /></div>
            <div><Label>{t.password} *</Label><Input type="password" value={form.password} onChange={e => updateForm('password', e.target.value)} disabled={isCreating} className="rounded-xl mt-1" /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={isCreating}>{t.cancel}</Button>
            <Button onClick={handleCreate} disabled={isCreating} className="rounded-xl">
              {isCreating ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : <Plus className="w-4 h-4 me-2" />}
              {t.addSeller || 'إضافة متجر'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SellersPage;
