import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { db } from '@/db';
import type { Notification } from '@/db/schema';
import { Home, Package, Wallet, User, Bell, Moon, Sun, Globe, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { motion } from 'framer-motion';
import { badgePulse } from '@/animations/variants';

const CourierLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { t, isDark, toggleTheme, lang, setLang } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifOpen, setNotifOpen] = useState(false);

  const notifications = db.query<Notification>('notifications', n =>
    n.targetRole === 'courier' && (!n.targetUserId || n.targetUserId === user?.id) && !n.read
  );

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
                    className="absolute -top-0.5 -end-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] rounded-full flex items-center justify-center">
                    {notifications.length}
                  </motion.span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <div className="p-3 border-b font-medium text-sm">{t.notificationsTitle}</div>
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">{t.noNotifications}</div>
              ) : (
                notifications.slice(0, 5).map(n => (
                  <DropdownMenuItem key={n.id} className="flex flex-col items-start p-3" onClick={() => {
                    db.update('notifications', n.id, { read: true });
                    if (n.link) navigate(n.link);
                  }}>
                    <span className="text-sm font-medium">{n.title}</span>
                    <span className="text-xs text-muted-foreground">{n.message}</span>
                  </DropdownMenuItem>
                ))
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
        <div className="rounded-2xl border bg-card/95 backdrop-blur-xl flex items-center justify-around shadow-xl"
          style={{ boxShadow: '0 -8px 32px hsl(var(--background) / 0.8)' }}>
          {tabs.map(tab => {
            const isActive = location.pathname === tab.path;
            return (
              <motion.button
                key={tab.path}
                whileTap={{ scale: 0.85 }}
                onClick={() => navigate(tab.path)}
                className="flex flex-col items-center gap-1 px-4 py-3 relative flex-1"
              >
                {isActive && (
                  <motion.div
                    layoutId="courierNavIndicator"
                    className="absolute top-0 left-1/4 right-1/4 h-[2px] rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <tab.icon className="w-5 h-5" style={{ color: isActive ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }} />
                <span className="text-[10px] font-medium" style={{ color: isActive ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }}>
                  {tab.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </motion.nav>
    </div>
  );
};

export default CourierLayout;
