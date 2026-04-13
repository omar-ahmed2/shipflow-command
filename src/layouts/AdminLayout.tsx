import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { db } from '@/db';
import type { Notification } from '@/db/schema';
import {
  LayoutDashboard, Package, PlusCircle, Truck, Users, Wallet, BarChart3, Settings,
  LogOut, Menu, Bell, Moon, Sun, Globe, ChevronLeft, Store, Receipt
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { motion, AnimatePresence } from 'framer-motion';
import { menuItemVariants, badgePulse } from '@/animations/variants';

const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { t, isDark, toggleTheme, lang, setLang } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  }, [location.pathname]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const notifications = db.query<Notification>('notifications', n => n.targetRole === 'admin' && !n.read);

  const menuItems = [
    { icon: LayoutDashboard, label: t.dashboard, path: '/dashboard' },
    { icon: Package, label: t.shipments, path: '/shipments' },
    { icon: PlusCircle, label: t.newShipment, path: '/shipments/create' },
    { icon: Truck, label: t.couriers, path: '/couriers' },
    { icon: Store, label: t.sellers || 'المتاجر', path: '/sellers' },
    { icon: Users, label: t.users, path: '/users' },
    { icon: Receipt, label: t.settlementsHub || 'التحصيلات', path: '/settlements' },
    { icon: Wallet, label: t.payments, path: '/payments' },
    { icon: BarChart3, label: t.reports, path: '/reports' },
    { icon: Settings, label: t.settings, path: '/settings' },
  ];

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="min-h-screen flex bg-background" dir="rtl">
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 md:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 start-0 z-40 flex flex-col shadow-2xl md:shadow-none transition-all duration-300 overflow-hidden ${sidebarOpen ? 'w-64 md:w-60' : 'w-0 md:w-16'}`}
        style={{
          background: 'hsl(var(--sidebar-background))',
          borderInlineEnd: '1px solid hsl(var(--sidebar-border))',
        }}>
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-4 border-b border-sidebar-border">
          <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0 relative">
            <Truck className="w-4 h-4 text-primary" />
            <div className="absolute inset-0 rounded-lg bg-primary/10 blur-sm" />
          </div>
          {sidebarOpen && (
            <motion.div className="overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h1 className="font-bold text-sm text-sidebar-foreground">{t.systemName}</h1>
              <p className="text-[10px] text-sidebar-foreground/50">{t.systemDesc}</p>
            </motion.div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {menuItems.map((item, i) => {
            const isActive = location.pathname === item.path ||
              (item.path === '/shipments' && location.pathname.startsWith('/shipments/') && item.path === '/shipments');
            return (
              <motion.button
                key={item.path}
                custom={i}
                variants={menuItemVariants}
                initial="initial"
                animate="animate"
                whileHover={{ x: lang === 'ar' ? -2 : 2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all relative
                  ${isActive
                    ? 'bg-primary/15 text-primary font-medium'
                    : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground'}`}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
                {isActive && (
                  <motion.div
                    layoutId="sidebarIndicator"
                    className="absolute start-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </motion.button>
            );
          })}
        </nav>

        {/* User */}
        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
              {user?.name?.charAt(0)}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-sidebar-foreground">{user?.name}</p>
                <p className="text-[10px] text-sidebar-foreground/50">{t.admin}</p>
              </div>
            )}
            {sidebarOpen && (
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={handleLogout}
                className="text-sidebar-foreground/40 hover:text-destructive transition-colors">
                <LogOut className="w-4 h-4" />
              </motion.button>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${sidebarOpen ? 'md:ms-60' : 'md:ms-16'}`}>
        {/* Topbar */}
        <header className="h-16 border-b bg-card/80 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => setSidebarOpen(!sidebarOpen)} className="text-muted-foreground hover:text-foreground">
              {sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </motion.button>
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-xl relative">
                  <Bell className="w-4 h-4" />
                  {notifications.length > 0 && (
                    <motion.span {...badgePulse}
                      className="absolute -top-0.5 -end-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] rounded-full flex items-center justify-center">
                      {notifications.length}
                    </motion.span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <div className="p-3 border-b font-medium text-sm">{t.notificationsTitle}</div>
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">{t.noNotifications}</div>
                ) : (
                  notifications.slice(0, 5).map(n => (
                    <DropdownMenuItem key={n.id} className="flex flex-col items-start p-3 cursor-pointer"
                      onClick={() => {
                        db.update('notifications', n.id, { read: true });
                        if (n.link) navigate(n.link);
                      }}
                    >
                      <span className="text-sm font-medium">{n.title}</span>
                      <span className="text-xs text-muted-foreground">{n.message}</span>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
