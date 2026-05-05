import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ConnectionMonitor } from '@/components/ConnectionMonitor';
import { Home, Package, Wallet, User, Bell, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { motion } from 'framer-motion';
import { badgePulse } from '@/animations/variants';

const CourierLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { t } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [notifOpen, setNotifOpen] = useState(false);

  const { data: allNotifications = [] } = useQuery({
    queryKey: ['notifications', user?.role, user?.id],
    queryFn: () => user ? api.notifications.getByUser(user.role, user.id) : Promise.resolve([]),
    enabled: !!user
  });

  const notifications = allNotifications.filter(n => !n.read);

  const readMutation = useMutation({
    mutationFn: (id: string) => api.notifications.update(id, { read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const tabs = [
    { icon: Home, label: t.home, path: '/courier' },
    { icon: Package, label: t.myShipments, path: '/courier/shipments' },
    { icon: Wallet, label: t.myCOD, path: '/courier/cod' },
    { icon: User, label: t.profile, path: '/courier/profile' },
  ];

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="min-h-screen flex flex-col bg-background pb-20">
      {/* Topbar */}
      <header className="h-16 border-b bg-card/80 backdrop-blur-md flex items-center justify-between px-4 sticky top-0 z-30 shadow-sm">
        <div className="flex flex-col">
          <span className="text-xs font-medium text-muted-foreground">{t.hello} 👋</span>
          <span className="text-sm font-bold truncate max-w-[140px] sm:max-w-xs">{user?.name}</span>
        </div>
        <div className="flex items-center gap-0.5 sm:gap-1">
          <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-xl h-8 w-8 sm:h-9 sm:w-9 relative">
                <Bell className="w-4 h-4" />
                {notifications.length > 0 && (
                  <motion.span {...badgePulse}
                    className="absolute -top-0.5 -end-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] rounded-full flex items-center justify-center font-bold">
                    {notifications.length}
                  </motion.span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 rounded-[20px] shadow-2xl p-2 border-none">
              <div className="p-3 font-black text-sm text-right">{t.notificationsTitle}</div>
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground opacity-60">لا توجد إشعارات جديدة</div>
              ) : (
                <div className="max-h-[300px] overflow-y-auto space-y-1">
                  {notifications.slice(0, 5).map(n => (
                    <DropdownMenuItem 
                      key={n.id} 
                      className="flex flex-col items-end p-4 rounded-xl cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => {
                        readMutation.mutate(n.id);
                        if (n.link) navigate(n.link);
                      }}
                    >
                      <span className="text-sm font-bold text-right">{n.title}</span>
                      <span className="text-[11px] text-muted-foreground text-right mt-1 leading-relaxed">{n.message}</span>
                    </DropdownMenuItem>
                  ))}
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon" className="rounded-xl h-8 w-8 sm:h-9 sm:w-9" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-4">
        <Outlet />
      </main>

      {/* Bottom Nav - Floating */}
      <motion.nav
        className="fixed bottom-0 inset-x-0 z-40 px-3 sm:px-4 pb-3 sm:pb-4"
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
      >
        <div className="rounded-[24px] border border-muted/30 bg-card/90 backdrop-blur-2xl flex items-center justify-around shadow-2xl p-1"
          style={{ boxShadow: '0 -8px 32px hsl(var(--background) / 0.5)' }}>
          {tabs.map(tab => {
            const isActive = location.pathname === tab.path;
            return (
              <motion.button
                key={tab.path}
                whileTap={{ scale: 0.9 }}
                onClick={() => navigate(tab.path)}
                className={`flex flex-col items-center gap-1.5 px-4 py-3 relative flex-1 rounded-2xl transition-colors ${isActive ? 'bg-primary/10' : 'hover:bg-muted/30'}`}
              >
                <tab.icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className={`text-[10px] font-bold ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                  {tab.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </motion.nav>

      {/* Connection Health Monitor */}
      <ConnectionMonitor />
    </div>
  );
};

export default CourierLayout;
