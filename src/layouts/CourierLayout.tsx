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
    <div className="min-h-screen flex flex-col bg-background pb-16">
      {/* Topbar */}
      <header className="h-14 border-b bg-card/80 backdrop-blur-sm flex items-center justify-between px-4 sticky top-0 z-30">
        <div>
          <span className="text-sm font-medium">{t.hello} 👋</span>
          <span className="text-sm font-bold ms-1">{user?.name}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}>
            <Globe className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9" onClick={toggleTheme}>
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
          <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9 relative">
                <Bell className="w-4 h-4" />
                {notifications.length > 0 && (
                  <span className="absolute -top-0.5 -end-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] rounded-full flex items-center justify-center">
                    {notifications.length}
                  </span>
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
          <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-4">
        <Outlet />
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 inset-x-0 h-16 border-t bg-card/95 backdrop-blur-sm flex items-center justify-around z-40">
        {tabs.map(tab => {
          const isActive = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors
                ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default CourierLayout;
