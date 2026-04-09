import React, { useState, useMemo } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { db } from '@/db';
import { hashPassword } from '@/db/helpers';
import type { User } from '@/db/schema';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { formatDate } from '@/utils/formatters';

const UsersPage: React.FC = () => {
  const { t, lang } = useTheme();
  const [refresh, setRefresh] = useState(0);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const users = useMemo(() => db.getAll<User>('users'), [refresh]);

  const toggleStatus = (u: User) => {
    db.update('users', u.id, { status: u.status === 'active' ? 'inactive' : 'active' });
    setRefresh(r => r + 1);
    toast.success(t.saved);
  };

  const resetPwd = (u: User) => {
    db.update('users', u.id, { passwordHash: hashPassword('123456') });
    toast.success(`${t.resetPassword}: 123456`);
  };

  const handleDelete = () => {
    if (!deleteId) return;
    db.delete('users', deleteId);
    setDeleteId(null);
    setRefresh(r => r + 1);
    toast.success(t.confirm);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <h2 className="text-xl font-bold">{t.users} ({users.length})</h2>
      <div className="admin-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/30">
            <th className="p-3 text-start font-medium">{t.name}</th>
            <th className="p-3 text-start font-medium">{t.email}</th>
            <th className="p-3 text-start font-medium">{t.role}</th>
            <th className="p-3 text-start font-medium">{t.status}</th>
            <th className="p-3 text-start font-medium">{t.createdAt}</th>
            <th className="p-3 text-start font-medium">{t.actions}</th>
          </tr></thead>
          <tbody>{users.map(u => (
            <tr key={u.id} className="border-b hover:bg-muted/30">
              <td className="p-3 font-medium">{u.name}</td>
              <td className="p-3 text-muted-foreground">{u.email}</td>
              <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs ${u.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent'}`}>{u.role === 'admin' ? t.admin : t.courier}</span></td>
              <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs ${u.status === 'active' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>{u.status === 'active' ? t.active : t.inactive}</span></td>
              <td className="p-3 text-muted-foreground text-xs">{formatDate(u.createdAt, lang)}</td>
              <td className="p-3">
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => toggleStatus(u)}>{u.status === 'active' ? t.deactivate : t.activate}</Button>
                  <Button variant="ghost" size="sm" onClick={() => resetPwd(u)}>{t.resetPassword}</Button>
                  {u.role !== 'admin' && <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteId(u.id)}>{t.delete}</Button>}
                </div>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} title={t.confirmDelete} description={t.deleteWarning} onConfirm={handleDelete} />
    </div>
  );
};

export default UsersPage;
