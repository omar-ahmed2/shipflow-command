import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ConnectionMonitor } from '@/components/ConnectionMonitor';
import {
  LayoutDashboard, Package, PlusCircle, Truck, Users, Wallet, BarChart3, Settings,
  LogOut, Menu, Bell, ChevronLeft, Store, Receipt
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { motion } from 'framer-motion';
import { menuItemVariants, badgePulse } from '@/animations/variants';

const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { t, lang } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
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
        <div className="py-8 flex flex-col items-center justify-center gap-4 border-b border-sidebar-border/20">
          <div className="relative group">
            <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl group-hover:bg-primary/40 transition-all duration-700" />
            <div className="w-20 h-20 rounded-full flex items-center justify-center relative z-10 overflow-hidden">
              <img 
                src="/ELMona Shipping.jpeg" 
                alt="ELMona Logo" 
                className="w-18 h-18 object-contain transition-transform duration-500 group-hover:scale-110" 
                style={{ mixBlendMode: 'multiply' }}
              />
            </div>
          </div>
          {sidebarOpen && (
            <motion.div 
              className="text-center space-y-1" 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }}
            >
              <h1 className="font-black text-2xl text-sidebar-foreground tracking-tighter leading-none">
                ELMona
              </h1>
              <div className="flex items-center justify-center gap-2">
                <div className="h-px w-4 bg-primary/50" />
                <span className="text-primary font-bold text-[10px] uppercase tracking-[0.3em]">
                  Shipping
                </span>
                <div className="h-px w-4 bg-primary/50" />
              </div>
            </motion.div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {menuItems.map((item, i) => {
            const isActive = location.pathname === item.path ||
              (item.path !== '/shipments/create' && location.pathname.startsWith(item.path + '/'));
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
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all relative overflow-hidden
                  ${isActive
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'}`}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebarIndicator"
                    className="absolute start-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-e-full bg-primary"
                    initial={{ opacity: 0, scaleY: 0 }}
                    animate={{ opacity: 1, scaleY: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  />
                )}
                <item.icon className={`w-[18px] h-[18px] flex-shrink-0 transition-colors ${isActive ? 'text-primary' : ''}`} />
                {sidebarOpen && <span className="truncate">{item.label}</span>}
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
                      className="absolute -top-0.5 -end-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] rounded-full flex items-center justify-center font-bold">
                      {notifications.length}
                    </motion.span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-80 rounded-[20px] shadow-2xl p-2 border-none">
                <div className="p-3 font-black text-sm text-right">{t.notificationsTitle || "الإشعارات"}</div>
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
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6 overflow-x-hidden">
          <Outlet />
        </main>

        {/* Connection Health Monitor */}
        <ConnectionMonitor />
      </div>
    </div>
  );
};

export default AdminLayout;
