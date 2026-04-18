import React, { useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { formatDate } from '@/utils/formatters';
import { Loader2 } from 'lucide-react';

const UsersPage: React.FC = () => {
  const { t, lang } = useTheme();
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Query
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: api.users.getAll
  });

  const toggleStatus = async (userId: string, currentStatus: string) => {
    try {
      await api.users.update(userId, { 
        status: currentStatus === 'active' ? 'inactive' : 'active' 
      });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(t.saved);
    } catch (err) {
      toast.error('حدث خطأ أثناء تحديث الحالة');
    }
  };

  const resetPwd = (u: any) => {
    toast.info('ميزة تعيين كلمة المرور يدوياً ستتوفر قريباً عبر البريد الإلكتروني');
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    
    try {
      await api.users.delete(deleteId);
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setDeleteId(null);
      toast.success('تم حذف المستخدم وكافة بياناته المرتبطة بنجاح');
    } catch (err) {
      toast.error('حدث خطأ أثناء الحذف');
    }
  };

  return (
    <div className="space-y-4 animate-fade-in relative">
      <h2 className="text-xl font-bold">{t.users} ({users.length})</h2>
      
      <div className="admin-card overflow-x-auto min-h-[400px] relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="p-3 text-start font-medium">{t.name}</th>
              <th className="p-3 text-start font-medium">{t.email}</th>
              <th className="p-3 text-start font-medium">{t.role}</th>
              <th className="p-3 text-start font-medium">{t.status}</th>
              <th className="p-3 text-start font-medium">{t.createdAt}</th>
              <th className="p-3 text-start font-medium">{t.actions}</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b hover:bg-muted/30">
                <td className="p-3 font-medium">{u.name}</td>
                <td className="p-3 text-muted-foreground">{u.email}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    u.role === 'admin' ? 'bg-primary/10 text-primary' : 
                    u.role === 'seller' ? 'bg-emerald-500/10 text-emerald-500' : 
                    'bg-amber-500/10 text-amber-500'
                  }`}>
                    {u.role === 'admin' ? t.admin : u.role === 'seller' ? 'متجر' : t.courier}
                  </span>
                </td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${u.status === 'active' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                    {u.status === 'active' ? t.active : t.inactive}
                  </span>
                </td>
                <td className="p-3 text-muted-foreground text-xs">{formatDate(u.createdAt, lang)}</td>
                <td className="p-3">
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => toggleStatus(u.id, u.status)}>
                      {u.status === 'active' ? t.deactivate : t.activate}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => resetPwd(u)}>{t.resetPassword}</Button>
                    {u.role !== 'admin' && (
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteId(u.id)}>
                        {t.delete}
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!isLoading && users.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            لا يوجد مستخدمون حالياً
          </div>
        )}
      </div>

      <ConfirmDialog 
        open={!!deleteId} 
        onOpenChange={() => setDeleteId(null)} 
        title={t.confirmDelete} 
        description={t.deleteWarning} 
        onConfirm={handleDelete} 
      />
    </div>
  );
};

export default UsersPage;
