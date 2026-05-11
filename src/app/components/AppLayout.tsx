import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  LayoutDashboard,
  Search,
  Calendar,
  Bell,
  Settings,
  LogOut,
  Menu,
  Shield,
  BarChart3,
  CheckSquare,
  Home
} from 'lucide-react';
import type { Notification } from '../data/mockData';
import { authService } from '../utils/auth';
import { getNotifications, markNotificationRead } from '../utils/notificationsStore';
import { useEffect } from 'react';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import { MobileNav } from './MobileNav';
import { toast } from 'sonner';
import { Panel, PanelGroup } from 'react-resizable-panels';
import { ThemeToggle } from './ThemeToggle';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path: string;
  roles?: string[];
}

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationItems, setNotificationItems] = useState<Notification[]>([]);
  const currentUser = authService.getCurrentUser();

  useEffect(() => {
    if (!currentUser) {
      navigate('/login', { replace: true });
      return;
    }
    // Load persisted notifications for this user
    setNotificationItems(getNotifications(currentUser.id));

    // Listen for real-time notifications dispatched from anywhere in the app
    const handler = () => setNotificationItems(getNotifications(currentUser.id));
    window.addEventListener('roomify:notification', handler);
    return () => window.removeEventListener('roomify:notification', handler);
  }, [currentUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const getNotificationLink = (notification: Notification) => {
    if (notification.link) {
      return notification.link;
    }

    switch (notification.type) {
      case 'approval':
        return currentUser?.role === 'admin' ? '/app/admin/approvals' : '/app/bookings';
      case 'reminder':
      case 'booking':
      case 'cancellation':
        return '/app/bookings';
      default:
        return '/app/dashboard';
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    setNotificationOpen(false);
    if (currentUser) markNotificationRead(currentUser.id, notification.id);
    setNotificationItems((prev) =>
      prev.map((item) =>
        item.id === notification.id ? { ...item, read: true } : item
      )
    );
    const link = getNotificationLink(notification);
    navigate(link);
  };

  const handleLogout = () => {
    authService.logout();
    toast.success('Logged out successfully', {
      description: 'You have been logged out of your account.',
    });
    navigate('/login', { replace: true });
  };

  const handleProfileClick = () => {
    navigate('/app/profile');
  };

  const userNavItems: NavItem[] = [
    { label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" />, path: '/app/dashboard' },
    { label: 'Find Rooms', icon: <Search className="h-5 w-5" />, path: '/app/rooms' },
    { label: 'My Bookings', icon: <Calendar className="h-5 w-5" />, path: '/app/bookings' },
  ];

  const adminNavItems: NavItem[] = [
    { label: 'Admin Dashboard', icon: <Shield className="h-5 w-5" />, path: '/app/admin', roles: ['admin'] },
    { label: 'Approvals', icon: <CheckSquare className="h-5 w-5" />, path: '/app/admin/approvals', roles: ['admin'] },
    { label: 'Room Management', icon: <Home className="h-5 w-5" />, path: '/app/admin/rooms', roles: ['admin'] },
    { label: 'Analytics', icon: <BarChart3 className="h-5 w-5" />, path: '/app/admin/analytics', roles: ['admin'] },
  ];

  const allNavItems = currentUser && currentUser.role === 'admin' 
    ? [...userNavItems, ...adminNavItems]
    : userNavItems;

  const unreadCount = notificationItems.filter(n => !n.read).length;

  const NavLinks = ({ onItemClick }: { onItemClick?: () => void }) => (
    <div className="space-y-4">
      <nav className="space-y-1">
        {allNavItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => {
                navigate(item.path);
                onItemClick?.();
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground hover:bg-muted'
              }`}
            >
              {item.icon}
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="border-t pt-3 space-y-1">
        <button
          onClick={() => {
            handleProfileClick();
            onItemClick?.();
          }}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors whitespace-nowrap ${
            location.pathname === '/app/profile'
              ? 'bg-primary text-primary-foreground'
              : 'text-foreground hover:bg-muted'
          }`}
        >
          <Settings className="h-5 w-5" />
          <span className="truncate">Profile & Settings</span>
        </button>

        <button
          onClick={() => {
            handleLogout();
            onItemClick?.();
          }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors whitespace-nowrap text-destructive hover:bg-destructive/10"
        >
          <LogOut className="h-5 w-5" />
          <span className="truncate">Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
        {/* Top Navigation */}
        <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 isolate">
        <div className="flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-4">
            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="sm">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <div className="flex h-16 items-center px-6 border-b">
                  <h1 className="text-xl font-bold text-primary">RoomifyU</h1>
                </div>
                <div className="p-4">
                  <NavLinks onItemClick={() => setMobileMenuOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>

            {/* Logo */}
            <h1 className="text-xl font-bold text-primary cursor-pointer" onClick={() => navigate('/app/dashboard')}>
              RoomifyU
            </h1>
          </div>

          {/* Right side */}
          <div className="relative z-10 flex items-center gap-2">
            <ThemeToggle />
            {/* Notifications */}
            <DropdownMenu open={notificationOpen} onOpenChange={setNotificationOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="relative">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <div className="px-4 py-3 border-b">
                  <h3 className="font-semibold">Notifications</h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notificationItems.length === 0 ? (
                    <div className="px-4 py-8 text-center text-muted-foreground">
                      <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No notifications</p>
                    </div>
                  ) : (
                    notificationItems.map((notification) => (
                      <div
                        key={notification.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleNotificationClick(notification)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            handleNotificationClick(notification);
                          }
                        }}
                        className={`px-4 py-3 border-b hover:bg-muted cursor-pointer ${
                          !notification.read ? 'bg-accent/5' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <h4 className="text-sm font-medium">{notification.title}</h4>
                          {!notification.read && (
                            <div className="h-2 w-2 rounded-full bg-primary mt-1" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{notification.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(notification.timestamp).toLocaleString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="ghost" className="gap-2" onClick={handleProfileClick}>
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {currentUser?.name.split(' ').map((n) => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <span className="hidden md:inline">{currentUser?.name}</span>
            </Button>
          </div>
        </div>
      </header>

      <PanelGroup direction="horizontal" className="hidden md:flex">
        {/* Sidebar - Desktop */}
        <Panel
          defaultSize={20}
          className="border-r bg-card"
        >
          <div className="sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
            <div className="p-4">
              <NavLinks />
            </div>
          </div>
        </Panel>

        {/* Main Content */}
        <Panel defaultSize={80}>
          <main className="p-4 md:p-6 lg:p-8 h-[calc(100vh-4rem)] overflow-y-auto">
            <Outlet />
          </main>
        </Panel>
      </PanelGroup>

      {/* Mobile Layout */}
      <div className="md:hidden">
        <main className="p-4">
          <Outlet />
        </main>
      </div>

        {/* Mobile Bottom Navigation */}
        <MobileNav />
      </div>
  );
}