import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { db } from '@/db';
import type { Notification } from '@/db/schema';
import {
  LayoutDashboard, Package, PlusCircle, Truck, Users, Wallet, BarChart3, Settings,
  LogOut, Menu, X, Bell, Moon, Sun, Globe, ChevronLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { t, isDark, toggleTheme, lang, setLang } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notifOpen, setNotifOpen] = useState(false);

  const notifications = db.query<Notification>('notifications', n => n.targetRole === 'admin' && !n.read);

  const menuItems = [
    { icon: LayoutDashboard, label: t.dashboard, path: '/dashboard' },
    { icon: Package, label: t.shipments, path: '/shipments' },
    { icon: PlusCircle, label: t.newShipment, path: '/shipments/create' },
    { icon: Truck, label: t.couriers, path: '/couriers' },
    { icon: Users, label: t.users, path: '/users' },
    { icon: Wallet, label: t.payments, path: '/payments' },
    { icon: BarChart3, label: t.reports, path: '/reports' },
    { icon: Settings, label: t.settings, path: '/settings' },
  ];

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 start-0 z-40 flex flex-col border-e bg-card transition-all duration-300 ${sidebarOpen ? 'w-60' : 'w-16'}`}>
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-4 border-b">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Truck className="w-4 h-4 text-primary" />
          </div>
          {sidebarOpen && (
            <div className="overflow-hidden">
              <h1 className="font-bold text-sm">{t.systemName}</h1>
              <p className="text-[10px] text-muted-foreground">{t.systemDesc}</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {menuItems.map(item => {
            const isActive = location.pathname === item.path ||
              (item.path === '/shipments' && location.pathname.startsWith('/shipments/') && item.path === '/shipments');
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors
                  ${isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* User */}
        <div className="border-t p-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
              {user?.name?.charAt(0)}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <p className="text-[10px] text-muted-foreground">{t.admin}</p>
              </div>
            )}
            {sidebarOpen && (
              <button onClick={handleLogout} className="text-muted-foreground hover:text-destructive">
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarOpen ? 'ms-60' : 'ms-16'}`}>
        {/* Topbar */}
        <header className="h-16 border-b bg-card/80 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-muted-foreground hover:text-foreground">
              {sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}>
              <Globe className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-xl" onClick={toggleTheme}>
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-xl relative">
                  <Bell className="w-4 h-4" />
                  {notifications.length > 0 && (
                    <span className="absolute -top-0.5 -end-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] rounded-full flex items-center justify-center">
                      {notifications.length}
                    </span>
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
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
