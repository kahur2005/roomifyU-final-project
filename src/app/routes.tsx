import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import { AppLayout } from './components/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { RoomsPage } from './pages/RoomsPage';
import { RoomDetailPage } from './pages/RoomDetailPage';
import { MyBookingsPage } from './pages/MyBookingsPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { ApprovalsPage } from './pages/ApprovalsPage';
import { RoomManagementPage } from './pages/RoomManagementPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { authService } from './utils/auth';

function ProtectedAppLayout() {
  const [gate, setGate] = React.useState<'checking' | 'allow' | 'deny'>(() => {
    if (!authService.isAuthenticated()) return 'deny';
    if (authService.requiresRemoteSessionValidation()) return 'checking';
    return 'allow';
  });

  React.useEffect(() => {
    if (!authService.isAuthenticated()) {
      setGate('deny');
      return;
    }
    if (!authService.requiresRemoteSessionValidation()) {
      setGate('allow');
      return;
    }

    authService.verifyRemoteSession().then((ok) => setGate(ok ? 'allow' : 'deny'));
  }, []);

  if (gate === 'checking') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
        <p className="text-sm text-muted-foreground">Signing you in...</p>
      </div>
    );
  }

  if (gate === 'deny' || !authService.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return <AppLayout />;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
  },
  {
    path: '/app',
    element: <ProtectedAppLayout />,
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'rooms',
        element: <RoomsPage />,
      },
      {
        path: 'room/:roomId',
        element: <RoomDetailPage />,
      },
      {
        path: 'bookings',
        element: <MyBookingsPage />,
      },
      {
        path: 'profile',
        element: <ProfilePage />,
      },
      {
        path: 'admin',
        element: <AdminDashboardPage />,
      },
      {
        path: 'admin/approvals',
        element: <ApprovalsPage />,
      },
      {
        path: 'admin/rooms',
        element: <RoomManagementPage />,
      },
      {
        path: 'admin/analytics',
        element: <AnalyticsPage />,
      },
      {
        path: '*',
        element: <Navigate to="/app/dashboard" replace />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/login" replace />,
  },
]);