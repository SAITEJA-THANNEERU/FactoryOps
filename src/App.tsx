import React, { useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext.tsx';
import { DataProvider } from './contexts/DataContext.tsx';
import { FilterProvider } from './contexts/FilterContext.tsx';
import { RouterProvider, useRouter } from './contexts/RouterContext.tsx';

import { Header } from './components/Header.tsx';
import { Navbar } from './components/Navbar.tsx';
import { Logo } from './components/Logo.tsx';

import { LoginPage } from './pages/LoginPage.tsx';
import { RegisterPage } from './pages/RegisterPage.tsx';
import { SuperAdminPage } from './pages/SuperAdminPage.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { OperationsPage } from './pages/OperationsPage.tsx';
import { ProductionPage } from './pages/ProductionPage.tsx';
import { MachinesPage } from './pages/MachinesPage.tsx';
import { MaintenancePage } from './pages/MaintenancePage.tsx';
import { IncidentsPage } from './pages/IncidentsPage.tsx';
import { WorkOrdersPage } from './pages/WorkOrdersPage.tsx';
import { QualityPage } from './pages/QualityPage.tsx';
import { AnalyticsPage } from './pages/AnalyticsPage.tsx';
import { SOPsPage } from './pages/SOPsPage.tsx';
import { DataQualityPage } from './pages/DataQualityPage.tsx';
import { AdminPage } from './pages/AdminPage.tsx';
import { InventoryPage } from './pages/InventoryPage.tsx';
import { AttendanceHubPage } from './pages/AttendanceHubPage.tsx';
import { MyAssignedTasksPage } from './pages/MyAssignedTasksPage.tsx';
import { AIChatLauncher } from './components/AIChatLauncher.tsx';

import { RefreshCw, Factory as FactoryIcon, ShieldAlert } from 'lucide-react';
import { isRouteAllowedForRole } from './utils/rbac.ts';

const AppContent: React.FC = () => {
  const { user, isAuthenticated, isLoading, inspectingFactory } = useAuth();
  const { currentPath, navigate } = useRouter();

  // Track previous authenticated user ID to force role Overview navigation on login
  const prevUserIdRef = React.useRef<string | null>(null);

  // Route protection & role redirection
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      const isFreshLogin = prevUserIdRef.current !== user.id;
      prevUserIdRef.current = user.id;

      if (isFreshLogin) {
        // Whenever any user logs in, always land on their respective Overview (Dashboard) page
        const overviewPath = user.role === 'SUPER_ADMIN' && !inspectingFactory ? '/super-admin/overview' : '/dashboard';
        navigate(overviewPath);
        return;
      }

      if (user.role === 'SUPER_ADMIN' && !inspectingFactory) {
        if (!currentPath.startsWith('/super-admin')) {
          navigate('/super-admin/overview');
        }
      } else {
        // Non-super-admin roles must NEVER access /super-admin routes or auth pages
        if (currentPath.startsWith('/super-admin') || currentPath === '/' || currentPath === '/login' || currentPath === '/register') {
          navigate('/dashboard');
          return;
        }

        // Strict RBAC: If role is not authorized for current route, redirect to permitted Dashboard
        if (!isRouteAllowedForRole(user.role, currentPath)) {
          console.warn(`[RBAC] Access denied: User role '${user.role}' is not authorized to access '${currentPath}'. Redirecting to /dashboard.`);
          navigate('/dashboard');
        }
      }
    } else if (!isAuthenticated) {
      prevUserIdRef.current = null;
    }
  }, [isLoading, isAuthenticated, user, inspectingFactory, currentPath, navigate]);

  // Loading splash screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-800 gap-3 font-sans">
        <Logo className="w-10 h-10" />
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <RefreshCw className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
          <span>Verifying FactoryOps Session...</span>
        </div>
      </div>
    );
  }

  // Unauthenticated -> Login or Register Screen
  if (!isAuthenticated) {
    if (currentPath === '/register') {
      return <RegisterPage />;
    }
    return <LoginPage />;
  }

  // Super Admin global view
  if (user?.role === 'SUPER_ADMIN' && !inspectingFactory) {
    return (
      <div className="min-h-screen bg-[#FBFEF9] text-[#191923] flex flex-col font-sans">
        <SuperAdminPage />
        <AIChatLauncher />
      </div>
    );
  }

  // Factory Operational Console (for Factory Owner, Factory Manager, or Super Admin inspecting)
  const renderFactoryPage = () => {
    // Defense-in-depth: if route is not permitted for the user's role, fallback to DashboardPage
    if (user && !isRouteAllowedForRole(user.role, currentPath)) {
      return <DashboardPage />;
    }

    switch (currentPath) {
      case '/dashboard':
      case '/':
        return <DashboardPage />;
      case '/assigned-tasks':
      case '/my-assigned-tasks':
        return <MyAssignedTasksPage />;
      case '/operations':
        return <OperationsPage />;
      case '/production':
        return <ProductionPage />;
      case '/machines':
        return <MachinesPage />;
      case '/maintenance':
        return <MaintenancePage />;
      case '/incidents':
        return <IncidentsPage />;
      case '/work-orders':
        return <WorkOrdersPage />;
      case '/quality':
        return <QualityPage />;
      case '/analytics':
        return <AnalyticsPage />;
      case '/sops':
        return <SOPsPage />;
      case '/data-quality':
        return <DataQualityPage />;
      case '/admin':
        return <AdminPage />;
      case '/inventory':
        return <InventoryPage />;
      case '/attendance':
      case '/my-attendance':
      case '/admin-attendance':
      case '/team-attendance':
        return <AttendanceHubPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFEF9] text-[#191923] flex flex-col font-sans">
      <Header />
      <Navbar />
      <main className="flex-1 pb-12">
        {renderFactoryPage()}
      </main>
      <AIChatLauncher />
    </div>
  );
};

export default function App() {
  return (
    <RouterProvider>
      <AuthProvider>
        <DataProvider>
          <FilterProvider>
            <AppContent />
          </FilterProvider>
        </DataProvider>
      </AuthProvider>
    </RouterProvider>
  );
}
