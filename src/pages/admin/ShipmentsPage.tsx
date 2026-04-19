import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { FinanceBadge } from '@/components/shared/FinanceBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Plus, Search, X, Trash2, Eye, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { formatDate, formatCurrency } from '@/utils/formatters';
import { motion } from 'framer-motion';
import { pageVariants } from '@/animations/variants';

const STATUSES: string[] = ['pending', 'assigned', 'out_for_delivery', 'delivered', 'returned', 'cancelled'];
const PAGE_SIZE = 15;

const ShipmentsPage: React.FC = () => {
  const { t, lang } = useTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [courierFilter, setCourierFilter] = useState<string>('all');
  const [sellerFilter, setSellerFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Queries
  const { data: shipments = [], isLoading: shipLoading } = useQuery({
    queryKey: ['shipments'],
    queryFn: api.shipments.getAll
  });

  const { data: couriers = [], isLoading: courierLoading } = useQuery({
    queryKey: ['couriers'],
    queryFn: api.couriers.getAll
  });

  const { data: sellers = [], isLoading: sellerLoading } = useQuery({
    queryKey: ['sellers'],
    queryFn: api.sellers.getAll
  });

  const isLoading = shipLoading || courierLoading || sellerLoading;

  const filtered = useMemo(() => {
    return shipments
      .filter(s => {
        if (search && !s.trackingId.toLowerCase().includes(search.toLowerCase()) &&
          !s.customerPhone.includes(search) && !s.customerName.toLowerCase().includes(search.toLowerCase())) return false;
        if (statusFilter !== 'all' && s.status !== statusFilter) return false;
        if (courierFilter !== 'all' && s.courierId !== courierFilter) return false;
        if (sellerFilter === '__admin__' && s.sellerId) return false;
        if (sellerFilter !== 'all' && sellerFilter !== '__admin__' && s.sellerId !== sellerFilter) return false;
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [shipments, search, statusFilter, courierFilter, sellerFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const getCourierName = (id: string | null) => {
    if (!id) return '—';
    const c = couriers.find(c => c.id === id);
    return c?.name || '—';
  };

  const getSellerName = (id?: string | null) => {
    if (!id) return 'الشركة (الأدمن)';
    const s = sellers.find(x => x.id === id);
    return s?.storeName || 'متجر غير معروف';
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.shipments.delete(deleteId);
      toast.success(t.confirm);
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
    } catch (err) {
      toast.error('حدث خطأ أثناء الحذف');
    }
    setDeleteId(null);
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === paged.length) setSelected(new Set());
    else setSelected(new Set(paged.map(s => s.id)));
  };

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{t.shipments} ({filtered.length})</h2>
        <Button onClick={() => navigate('/shipments/create')} className="rounded-xl">
          <Plus className="w-4 h-4 me-2" /> {t.newShipment}
        </Button>
      </div>

      {/* Filters */}
      <div className="admin-card p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder={t.search} value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="ps-9 rounded-xl" />
        </div>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40 rounded-xl"><SelectValue placeholder={t.allStatuses} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.allStatuses}</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{t[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={courierFilter} onValueChange={v => { setCourierFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40 rounded-xl"><SelectValue placeholder={t.allCouriers} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.allCouriers}</SelectItem>
            {couriers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sellerFilter} onValueChange={v => { setSellerFilter(v); setPage(1); }}>
          <SelectTrigger className="w-44 rounded-xl"><SelectValue placeholder="كل المصادر" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل المصادر</SelectItem>
            <SelectItem value="__admin__">شحنات الشركة</SelectItem>
            {sellers.map(s => <SelectItem key={s.id} value={s.id}>{s.storeName}</SelectItem>)}
          </SelectContent>
        </Select>
        {(search || statusFilter !== 'all' || courierFilter !== 'all' || sellerFilter !== 'all') && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setStatusFilter('all'); setCourierFilter('all'); setSellerFilter('all'); }}>
            <X className="w-3 h-3 me-1" /> {t.clearFilters}
          </Button>
        )}
      </div>

      {/* Bulk Actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-xl border border-primary/20">
          <span className="text-sm font-medium">{selected.size} {t.selected}</span>
          <Button variant="destructive" size="sm" onClick={async () => {
            try {
              await Promise.all(Array.from(selected).map(id => api.shipments.delete(id)));
              setSelected(new Set());
              queryClient.invalidateQueries({ queryKey: ['shipments'] });
              toast.success(t.confirm);
            } catch (err) {
              toast.error('حدث خطأ أثناء الحذف');
            }
          }}>
            <Trash2 className="w-3 h-3 me-1" /> {t.delete}
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="admin-card overflow-hidden min-h-[400px] relative">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : paged.length === 0 ? (
          <EmptyState title={t.noShipments} description={shipments.length === 0 ? t.startAddingShipments : t.noResults}
            actionLabel={shipments.length === 0 ? t.addFirstShipment : undefined}
            onAction={shipments.length === 0 ? () => navigate('/shipments/create') : undefined} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="p-3 w-10"><input type="checkbox" checked={selected.size === paged.length && paged.length > 0} onChange={toggleAll} className="rounded" /></th>
                  <th className="p-3 text-start font-medium">{t.tracking}</th>
                  <th className="p-3 text-start font-medium">المصدر / المتجر</th>
                  <th className="p-3 text-start font-medium">{t.customer}</th>
                  <th className="p-3 text-start font-medium">{t.phone}</th>
                  <th className="p-3 text-start font-medium">{t.city}</th>
                  <th className="p-3 text-start font-medium">{t.price}</th>
                  <th className="p-3 text-start font-medium">{t.payment}</th>
                  <th className="p-3 text-start font-medium">{t.status}</th>
                  <th className="p-3 text-start font-medium">{t.financeStatus}</th>
                  <th className="p-3 text-start font-medium">{t.courier}</th>
                  <th className="p-3 text-start font-medium">{t.date}</th>
                  <th className="p-3 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {paged.map(s => (
                  <tr key={s.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="p-3"><input type="checkbox" checked={selected.has(s.id)} onChange={() => toggleSelect(s.id)} className="rounded" /></td>
                    <td className="p-3 font-mono-nums text-xs">{s.trackingId}</td>
                    <td className="p-3 text-xs font-semibold">
                      {s.sellerId ? (
                        <button 
                          onClick={() => navigate(`/sellers/${s.sellerId}`)}
                          className="text-primary hover:underline"
                        >
                          {getSellerName(s.sellerId)}
                        </button>
                      ) : (
                        <span className="text-muted-foreground">{getSellerName(s.sellerId)}</span>
                      )}
                    </td>
                    <td className="p-3">{s.customerName}</td>
                    <td className="p-3 font-mono-nums text-xs">{s.customerPhone}</td>
                    <td className="p-3">{s.city}</td>
                    <td className="p-3 font-mono-nums">{formatCurrency(s.price + (s.shippingFee || 0))} {t.egp}</td>
                    <td className="p-3 text-xs">{s.paymentType === 'COD' ? t.cod : t.paid}</td>
                    <td className="p-3"><StatusBadge status={s.status} /></td>
                    <td className="p-3"><FinanceBadge shipment={s} /></td>
                    <td className="p-3">
                      {s.courierId ? (
                        <button 
                          onClick={() => navigate(`/couriers/${s.courierId}`)}
                          className="hover:text-primary hover:underline transition-colors"
                        >
                          {getCourierName(s.courierId)}
                        </button>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-3 text-muted-foreground text-xs">{formatDate(s.createdAt, lang)}</td>
                    <td className="p-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7">⋮</Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/shipments/${s.id}`)}><Eye className="w-3 h-3 me-2" /> {t.view}</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDeleteId(s.id)} className="text-destructive"><Trash2 className="w-3 h-3 me-2" /> {t.delete}</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 flex items-center justify-center gap-2 border-t">
            {Array.from({ length: totalPages }, (_, i) => (
              <Button key={i} variant={page === i + 1 ? 'default' : 'ghost'} size="sm" className="w-8 h-8 rounded-lg"
                onClick={() => setPage(i + 1)}>{i + 1}</Button>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} title={t.confirmDelete} description={t.deleteWarning} onConfirm={handleDelete} />
    </motion.div>
  );
};

export default ShipmentsPage;
