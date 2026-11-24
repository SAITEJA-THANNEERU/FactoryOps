import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { useData } from '../contexts/DataContext.tsx';
import { AdminDashboardView } from '../components/dashboard/AdminDashboardView.tsx';
import { ManagerDashboardView } from '../components/dashboard/ManagerDashboardView.tsx';
import { TechnicianDashboardView } from '../components/dashboard/TechnicianDashboardView.tsx';
import { ProductionPlannerDashboardView } from '../components/dashboard/ProductionPlannerDashboardView.tsx';
import { SuperAdminDashboardView } from '../components/super-admin/SuperAdminDashboardView.tsx';
import { MachineDetailModal } from '../components/MachineDetailModal.tsx';
import { CreateIncidentModal } from '../components/CreateIncidentModal.tsx';
import { CreateWorkOrderModal } from '../components/CreateWorkOrderModal.tsx';
import type { Machine } from '../types/index.ts';
import { RefreshCw, Factory as FactoryIcon, Building2, AlertCircle } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user, activeFactory } = useAuth();
  const {
    machines,
    production,
    incidents,
    workOrders,
    maintenance,
    sops,
    kpis,
    isLoading,
    error,
    refreshData,
    createIncident,
    createWorkOrder
  } = useData();

  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const [isWorkOrderModalOpen, setIsWorkOrderModalOpen] = useState(false);

  if (isLoading && machines.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
        <p className="text-sm font-medium text-slate-600">Loading Operations Intelligence...</p>
      </div>
    );
  }

  const renderRoleDashboard = () => {
    switch (user?.role) {
      case 'SUPER_ADMIN':
        return <SuperAdminDashboardView />;

      case 'TECHNICIAN':
      case 'OPERATOR':
        return (
          <TechnicianDashboardView
            machines={machines}
            workOrders={workOrders}
            maintenance={maintenance}
            incidents={incidents}
            sops={sops}
            onSelectMachine={(m) => setSelectedMachine(m)}
            onOpenWorkOrderModal={() => setIsWorkOrderModalOpen(true)}
          />
        );

      case 'PRODUCTION_PLANNER':
      case 'ANALYST':
        return (
          <ProductionPlannerDashboardView
            machines={machines}
            production={production}
            workOrders={workOrders}
            maintenance={maintenance}
            kpis={kpis}
            onSelectMachine={(m) => setSelectedMachine(m)}
            onOpenWorkOrderModal={() => setIsWorkOrderModalOpen(true)}
          />
        );

      case 'MANAGER_SUPERVISOR':
      case 'FACTORY_MANAGER':
      case 'SUPERVISOR':
        return (
          <ManagerDashboardView
            machines={machines}
            production={production}
            incidents={incidents}
            workOrders={workOrders}
            maintenance={maintenance}
            kpis={kpis}
            onSelectMachine={(m) => setSelectedMachine(m)}
            onOpenIncidentModal={() => setIsIncidentModalOpen(true)}
            onOpenWorkOrderModal={() => setIsWorkOrderModalOpen(true)}
          />
        );

      case 'ADMIN':
      case 'FACTORY_OWNER':
      default:
        return (
          <AdminDashboardView
            machines={machines}
            production={production}
            incidents={incidents}
            workOrders={workOrders}
            maintenance={maintenance}
            kpis={kpis}
            onSelectMachine={(m) => setSelectedMachine(m)}
            onOpenIncidentModal={() => setIsIncidentModalOpen(true)}
            onOpenWorkOrderModal={() => setIsWorkOrderModalOpen(true)}
          />
        );
    }
  };

  return (
    <div className="w-full max-w-[1850px] mx-auto px-2 sm:px-4 lg:px-6 py-4">
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 flex items-start gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <div className="font-semibold text-sm text-amber-900 mb-1">
              Live Database Integration Notice
            </div>
            <p className="text-amber-800 leading-relaxed mb-2">
              {error}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => refreshData()}
                className="px-3 py-1 bg-amber-700 hover:bg-amber-800 text-white rounded text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Supabase Query</span>
              </button>
              <span className="text-[11px] text-amber-700">
                To enable backend access through RLS, ensure SUPABASE_SERVICE_ROLE_KEY is configured in server .env.
              </span>
            </div>
          </div>
        </div>
      )}

      {renderRoleDashboard()}

      {/* Machine Detail Modal */}
      {selectedMachine && (
        <MachineDetailModal
          machine={selectedMachine}
          onClose={() => setSelectedMachine(null)}
          incidents={incidents}
          workOrders={workOrders}
          production={production}
        />
      )}

      {/* Create Incident Modal */}
      <CreateIncidentModal
        isOpen={isIncidentModalOpen}
        machines={machines}
        onClose={() => setIsIncidentModalOpen(false)}
        onSubmit={async (data) => {
          await createIncident(data);
          setIsIncidentModalOpen(false);
        }}
      />

      {/* Create Work Order Modal */}
      <CreateWorkOrderModal
        isOpen={isWorkOrderModalOpen}
        machines={machines}
        onClose={() => setIsWorkOrderModalOpen(false)}
        onSubmit={async (data) => {
          await createWorkOrder(data);
          setIsWorkOrderModalOpen(false);
        }}
      />
    </div>
  );
};
