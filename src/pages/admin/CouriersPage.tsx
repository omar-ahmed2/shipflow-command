import React, { useState, useMemo } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { adminService } from '@/services/adminService';
import { EmptyState } from '@/components/shared/EmptyState';
import { Plus, Search, Truck, Grid3X3, List, ExternalLink, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '@/utils/formatters';

const CouriersPage: React.FC = () => {
  const { t } = useTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Queries
  const { data: couriers = [], isLoading: courierLoading } = useQuery<any[]>({ queryKey: ['couriers'], queryFn: () => api.couriers.getAll() });
  const { data: shipments = [], isLoading: shipLoading } = useQuery<any[]>({ queryKey: ['shipments'], queryFn: () => api.shipments.getAll() });

  const isLoading = courierLoading || shipLoading;

  const filtered = couriers.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search));

  const [form, setForm] = useState({ name: '', phone: '', zone: '', vehicleType: 'motorcycle', email: '', password: '', notes: '' });
  const updateForm = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const handleCreate = async () => {
    if (!form.name || !form.phone || !form.zone || !form.email || !form.password) {
      toast.error('يرجى ملء كافة الحقول المطلوبة');
      return;
    }

    setIsCreating(true);
    try {
      await adminService.createUser({
        email: form.email,
        password: form.password,
        name: form.name,
        role: 'courier',
        phone: form.phone,
        zone: form.zone,
        vehicleType: form.vehicleType,
        notes: form.notes
      });

      toast.success(`${t.courierCreated}: ${form.name}`);
      queryClient.invalidateQueries({ queryKey: ['couriers'] });
      setForm({ name: '', phone: '', zone: '', vehicleType: 'motorcycle', email: '', password: '', notes: '' });
      setModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء إنشاء الحساب');
    } finally {
      setIsCreating(false);
    }
  };

  const getCourierStats = (courierId: string) => {
    const cs = shipments.filter(s => s.courierId === courierId);
    const assigned = cs.filter(s => ['assigned', 'out_for_delivery'].includes(s.status)).length;
    const delivered = cs.filter(s => s.status === 'delivered').length;
    const returned = cs.filter(s => s.status === 'returned').length;
    const rate = cs.length > 0 ? Math.round((delivered / cs.length) * 100) : 0;
    
    const pendingCodShipments = cs.filter(s => s.status === 'delivered' && s.paymentType === 'COD' && !s.codCollected);
    const pendingAmount = pendingCodShipments.reduce((sum, s) => sum + s.price + (s.shippingFee || 0), 0);

    const goodsInTransitShipments = cs.filter(s => ['assigned', 'out_for_delivery'].includes(s.status) && s.paymentType === 'COD');
    const goodsInTransitAmount = goodsInTransitShipments.reduce((sum, s) => sum + s.price + (s.shippingFee || 0), 0);

    const totalCustody = pendingAmount + goodsInTransitAmount;
    return { assigned, delivered, returned, rate, total: cs.length, pendingAmount, goodsInTransitAmount, totalCustody };
  };

  return (
    <div className="space-y-4 animate-fade-in relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-20 min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

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

      {filtered.length === 0 && !isLoading ? (
        <EmptyState icon={<Truck className="w-8 h-8 text-muted-foreground" />} title={t.addFirstCourier} actionLabel={t.addCourier} onAction={() => setModalOpen(true)} />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => {
            const stats = getCourierStats(c.id);
            return (
              <div key={c.id} className="admin-card p-5 hover:-translate-y-1 transition-transform relative">
                <div className="flex justify-between items-start mb-4">
                   <div 
                    className="flex items-center gap-3 cursor-pointer hover:underline group" 
                    onClick={() => navigate(`/couriers/${c.id}`)}
                  >
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                      {c.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold">{c.name}</p>
                      <p className="text-xs text-muted-foreground">● {t[c.status as keyof typeof t] || c.status} · {c.zone}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => navigate(`/couriers/${c.id}`)} className="rounded-full w-9 h-9">
                    <ExternalLink className="w-4 h-4" />
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
                        <span className="text-xs font-bold text-foreground">إجمالي العهدة</span>
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
                  <span className="text-xs text-muted-foreground text-[10px]">{t.successRate}</span>
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
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
                  <td className="p-3">
                    <button 
                      className="font-medium hover:text-primary hover:underline transition-colors"
                      onClick={() => navigate(`/couriers/${c.id}`)}
                    >
                      {c.name}
                    </button>
                  </td>
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
                    <Button variant="outline" size="sm" onClick={() => navigate(`/couriers/${c.id}`)}>
                      <ExternalLink className="w-4 h-4 me-2"/> {t.viewProfile}
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
            <div><Label>{t.courierName} *</Label><Input value={form.name} onChange={e => updateForm('name', e.target.value)} disabled={isCreating} className="rounded-xl mt-1" /></div>
            <div><Label>{t.phone} *</Label><Input value={form.phone} onChange={e => updateForm('phone', e.target.value)} disabled={isCreating} className="rounded-xl mt-1" /></div>
            <div><Label>{t.zone} *</Label><Input value={form.zone} onChange={e => updateForm('zone', e.target.value)} disabled={isCreating} className="rounded-xl mt-1" /></div>
            <div>
              <Label>{t.vehicleType}</Label>
              <Select value={form.vehicleType} onValueChange={v => updateForm('vehicleType', v)} disabled={isCreating}>
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
            <div><Label>{t.email} *</Label><Input type="email" value={form.email} onChange={e => updateForm('email', e.target.value)} disabled={isCreating} className="rounded-xl mt-1" /></div>
            <div>
              <Label>{t.password} *</Label>
              <div className="relative mt-1">
                <Input 
                  type={showPassword ? "text" : "password"} 
                  value={form.password} 
                  onChange={e => updateForm('password', e.target.value)} 
                  disabled={isCreating} 
                  className="rounded-xl pe-10" 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={isCreating}>{t.cancel}</Button>
            <Button onClick={handleCreate} disabled={isCreating} className="rounded-xl">
              {isCreating ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : <Plus className="w-4 h-4 me-2" />}
              {t.addCourier}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CouriersPage;
