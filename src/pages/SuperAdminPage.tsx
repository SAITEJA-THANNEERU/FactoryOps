import React from 'react';
import { useRouter } from '../contexts/RouterContext.tsx';
import { SuperAdminHeader } from '../components/super-admin/SuperAdminHeader.tsx';
import { SuperAdminNavbar } from '../components/super-admin/SuperAdminNavbar.tsx';
import { SuperAdminOverviewPage } from './super-admin/SuperAdminOverview.tsx';
import { SuperAdminFactoriesPage } from './super-admin/SuperAdminFactories.tsx';
import { SuperAdminFactoryDetailPage } from './super-admin/SuperAdminFactoryDetail.tsx';
import { SuperAdminUsersPage } from './super-admin/SuperAdminUsers.tsx';
import { SuperAdminSystemHealthPage } from './super-admin/SuperAdminSystemHealth.tsx';
import { SuperAdminBenchmarkingPage } from './super-admin/SuperAdminBenchmarking.tsx';
import { SuperAdminSettingsPage } from './super-admin/SuperAdminSettings.tsx';

export const SuperAdminPage: React.FC = () => {
  const { currentPath, factoryDetailId } = useRouter();

  const renderSubPage = () => {
    if (factoryDetailId) {
      return <SuperAdminFactoryDetailPage factoryId={factoryDetailId} />;
    }

    if (currentPath.startsWith('/super-admin/factories')) {
      return <SuperAdminFactoriesPage />;
    }

    if (currentPath.startsWith('/super-admin/users')) {
      return <SuperAdminUsersPage />;
    }

    if (currentPath.startsWith('/super-admin/system-health')) {
      return <SuperAdminSystemHealthPage />;
    }

    if (currentPath.startsWith('/super-admin/benchmarking')) {
      return <SuperAdminBenchmarkingPage />;
    }

    if (currentPath.startsWith('/super-admin/settings')) {
      return <SuperAdminSettingsPage />;
    }

    // Default to Executive Overview & Role Dashboards
    return <SuperAdminOverviewPage />;
  };

  return (
    <div className="min-h-screen bg-[#FBFEF9] text-[#191923] flex flex-col font-sans">
      <SuperAdminHeader />
      <SuperAdminNavbar />
      <main className="flex-1 pb-12">
        {renderSubPage()}
      </main>
    </div>
  );
};
