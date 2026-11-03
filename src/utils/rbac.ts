import type { UserRole } from '../types/index.ts';

export type AppRoute =
  | '/dashboard'
  | '/operations'
  | '/production'
  | '/machines'
  | '/maintenance'
  | '/incidents'
  | '/work-orders'
  | '/quality'
  | '/analytics'
  | '/sops'
  | '/data-quality'
  | '/admin'
  | '/inventory'
  | '/attendance'
  | '/my-attendance'
  | '/admin-attendance'
  | '/team-attendance'
  | '/super-admin/overview';

export interface RolePermissions {
  allowedRoutes: AppRoute[];
  canManageUsers: boolean;
  canConfigureLocation: boolean;
  canSyncDatabase: boolean;
  canCreateMachines: boolean;
  canEditMachines: boolean;
  canDeleteMachines: boolean;
  canUpdateMachineStatus: boolean;
  canConfigureMachineThresholds: boolean;
  canLogProduction: boolean;
  canDeleteProduction: boolean;
  canLogMaintenance: boolean;
  canDeleteMaintenance: boolean;
  canReportIncidents: boolean;
  canUpdateIncidents: boolean;
  canDeleteIncidents: boolean;
  canCreateWorkOrders: boolean;
  canUpdateWorkOrders: boolean;
  canDeleteWorkOrders: boolean;
  canAssignTechnicians: boolean;
  canVerifyRepairs: boolean;
  canManageSpareParts: boolean;
  canDeleteSpareParts: boolean;
  canViewSystemAuditLogs: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  SUPER_ADMIN: {
    allowedRoutes: [
      '/dashboard',
      '/super-admin/overview',
      '/attendance',
      '/inventory',
      '/production',
      '/machines',
      '/maintenance',
      '/incidents',
      '/work-orders',
      '/quality',
      '/analytics',
      '/sops',
      '/data-quality',
      '/admin'
    ],
    canManageUsers: true,
    canConfigureLocation: true,
    canSyncDatabase: true,
    canCreateMachines: true,
    canEditMachines: true,
    canDeleteMachines: true,
    canUpdateMachineStatus: true,
    canConfigureMachineThresholds: true,
    canLogProduction: true,
    canDeleteProduction: true,
    canLogMaintenance: true,
    canDeleteMaintenance: true,
    canReportIncidents: true,
    canUpdateIncidents: true,
    canDeleteIncidents: true,
    canCreateWorkOrders: true,
    canUpdateWorkOrders: true,
    canDeleteWorkOrders: true,
    canAssignTechnicians: true,
    canVerifyRepairs: true,
    canManageSpareParts: true,
    canDeleteSpareParts: true,
    canViewSystemAuditLogs: true
  },
  ADMIN: {
    allowedRoutes: [
      '/dashboard',
      '/attendance',
      '/inventory',
      '/production',
      '/machines',
      '/maintenance',
      '/incidents',
      '/work-orders',
      '/quality',
      '/sops',
      '/data-quality',
      '/admin'
    ],
    canManageUsers: true,
    canConfigureLocation: true,
    canSyncDatabase: true,
    canCreateMachines: true,
    canEditMachines: true,
    canDeleteMachines: true,
    canUpdateMachineStatus: true,
    canConfigureMachineThresholds: true,
    canLogProduction: true,
    canDeleteProduction: true,
    canLogMaintenance: true,
    canDeleteMaintenance: true,
    canReportIncidents: true,
    canUpdateIncidents: true,
    canDeleteIncidents: true,
    canCreateWorkOrders: true,
    canUpdateWorkOrders: true,
    canDeleteWorkOrders: true,
    canAssignTechnicians: true,
    canVerifyRepairs: true,
    canManageSpareParts: true,
    canDeleteSpareParts: true,
    canViewSystemAuditLogs: true
  },
  FACTORY_OWNER: {
    allowedRoutes: [
      '/dashboard',
      '/attendance',
      '/inventory',
      '/production',
      '/machines',
      '/maintenance',
      '/incidents',
      '/work-orders',
      '/quality',
      '/sops',
      '/data-quality',
      '/admin'
    ],
    canManageUsers: true,
    canConfigureLocation: true,
    canSyncDatabase: true,
    canCreateMachines: true,
    canEditMachines: true,
    canDeleteMachines: true,
    canUpdateMachineStatus: true,
    canConfigureMachineThresholds: true,
    canLogProduction: true,
    canDeleteProduction: true,
    canLogMaintenance: true,
    canDeleteMaintenance: true,
    canReportIncidents: true,
    canUpdateIncidents: true,
    canDeleteIncidents: true,
    canCreateWorkOrders: true,
    canUpdateWorkOrders: true,
    canDeleteWorkOrders: true,
    canAssignTechnicians: true,
    canVerifyRepairs: true,
    canManageSpareParts: true,
    canDeleteSpareParts: true,
    canViewSystemAuditLogs: true
  },
  MANAGER_SUPERVISOR: {
    allowedRoutes: [
      '/dashboard',
      '/attendance',
      '/inventory',
      '/production',
      '/machines',
      '/incidents',
      '/work-orders',
      '/quality',
      '/sops'
    ],
    canManageUsers: false,
    canConfigureLocation: false,
    canSyncDatabase: false,
    canCreateMachines: true,
    canEditMachines: true,
    canDeleteMachines: false,
    canUpdateMachineStatus: true,
    canConfigureMachineThresholds: true,
    canLogProduction: true,
    canDeleteProduction: false,
    canLogMaintenance: true,
    canDeleteMaintenance: false,
    canReportIncidents: true,
    canUpdateIncidents: true,
    canDeleteIncidents: false,
    canCreateWorkOrders: true,
    canUpdateWorkOrders: true,
    canDeleteWorkOrders: true,
    canAssignTechnicians: true,
    canVerifyRepairs: true,
    canManageSpareParts: true,
    canDeleteSpareParts: true,
    canViewSystemAuditLogs: true
  },
  FACTORY_MANAGER: {
    allowedRoutes: [
      '/dashboard',
      '/attendance',
      '/inventory',
      '/production',
      '/machines',
      '/incidents',
      '/work-orders',
      '/quality',
      '/sops'
    ],
    canManageUsers: false,
    canConfigureLocation: false,
    canSyncDatabase: false,
    canCreateMachines: true,
    canEditMachines: true,
    canDeleteMachines: false,
    canUpdateMachineStatus: true,
    canConfigureMachineThresholds: true,
    canLogProduction: true,
    canDeleteProduction: false,
    canLogMaintenance: true,
    canDeleteMaintenance: false,
    canReportIncidents: true,
    canUpdateIncidents: true,
    canDeleteIncidents: false,
    canCreateWorkOrders: true,
    canUpdateWorkOrders: true,
    canDeleteWorkOrders: true,
    canAssignTechnicians: true,
    canVerifyRepairs: true,
    canManageSpareParts: true,
    canDeleteSpareParts: true,
    canViewSystemAuditLogs: true
  },
  SUPERVISOR: {
    allowedRoutes: [
      '/dashboard',
      '/attendance',
      '/inventory',
      '/production',
      '/machines',
      '/incidents',
      '/work-orders',
      '/quality',
      '/sops'
    ],
    canManageUsers: false,
    canConfigureLocation: false,
    canSyncDatabase: false,
    canCreateMachines: true,
    canEditMachines: true,
    canDeleteMachines: false,
    canUpdateMachineStatus: true,
    canConfigureMachineThresholds: true,
    canLogProduction: true,
    canDeleteProduction: false,
    canLogMaintenance: true,
    canDeleteMaintenance: false,
    canReportIncidents: true,
    canUpdateIncidents: true,
    canDeleteIncidents: false,
    canCreateWorkOrders: true,
    canUpdateWorkOrders: true,
    canDeleteWorkOrders: true,
    canAssignTechnicians: true,
    canVerifyRepairs: true,
    canManageSpareParts: true,
    canDeleteSpareParts: true,
    canViewSystemAuditLogs: true
  },
  PRODUCTION_PLANNER: {
    allowedRoutes: [
      '/dashboard',
      '/attendance',
      '/inventory',
      '/production',
      '/analytics',
      '/machines',
      '/work-orders'
    ],
    canManageUsers: false,
    canConfigureLocation: false,
    canSyncDatabase: false,
    canCreateMachines: false,
    canEditMachines: false,
    canDeleteMachines: false,
    canUpdateMachineStatus: false,
    canConfigureMachineThresholds: false,
    canLogProduction: true,
    canDeleteProduction: false,
    canLogMaintenance: false,
    canDeleteMaintenance: false,
    canReportIncidents: false,
    canUpdateIncidents: false,
    canDeleteIncidents: false,
    canCreateWorkOrders: false,
    canUpdateWorkOrders: false,
    canDeleteWorkOrders: false,
    canAssignTechnicians: false,
    canVerifyRepairs: false,
    canManageSpareParts: false,
    canDeleteSpareParts: false,
    canViewSystemAuditLogs: false
  },
  ANALYST: {
    allowedRoutes: [
      '/dashboard',
      '/attendance',
      '/inventory',
      '/production',
      '/analytics',
      '/machines',
      '/work-orders'
    ],
    canManageUsers: false,
    canConfigureLocation: false,
    canSyncDatabase: false,
    canCreateMachines: false,
    canEditMachines: false,
    canDeleteMachines: false,
    canUpdateMachineStatus: false,
    canConfigureMachineThresholds: false,
    canLogProduction: true,
    canDeleteProduction: false,
    canLogMaintenance: false,
    canDeleteMaintenance: false,
    canReportIncidents: false,
    canUpdateIncidents: false,
    canDeleteIncidents: false,
    canCreateWorkOrders: false,
    canUpdateWorkOrders: false,
    canDeleteWorkOrders: false,
    canAssignTechnicians: false,
    canVerifyRepairs: false,
    canManageSpareParts: false,
    canDeleteSpareParts: false,
    canViewSystemAuditLogs: false
  },
  TECHNICIAN: {
    allowedRoutes: [
      '/dashboard',
      '/attendance',
      '/my-attendance',
      '/inventory',
      '/work-orders',
      '/machines',
      '/maintenance',
      '/incidents',
      '/sops'
    ],
    canManageUsers: false,
    canConfigureLocation: false,
    canSyncDatabase: false,
    canCreateMachines: false,
    canEditMachines: false,
    canDeleteMachines: false,
    canUpdateMachineStatus: true,
    canConfigureMachineThresholds: false,
    canLogProduction: false,
    canDeleteProduction: false,
    canLogMaintenance: true,
    canDeleteMaintenance: false,
    canReportIncidents: true,
    canUpdateIncidents: true,
    canDeleteIncidents: false,
    canCreateWorkOrders: false,
    canUpdateWorkOrders: true, // Only for assigned tasks, verified on server
    canDeleteWorkOrders: false,
    canAssignTechnicians: false,
    canVerifyRepairs: false, // Strictly false: Segregation of duties
    canManageSpareParts: true,
    canDeleteSpareParts: false,
    canViewSystemAuditLogs: false
  },
  OPERATOR: {
    allowedRoutes: [
      '/dashboard',
      '/attendance',
      '/my-attendance',
      '/inventory',
      '/work-orders',
      '/machines',
      '/maintenance',
      '/incidents',
      '/sops'
    ],
    canManageUsers: false,
    canConfigureLocation: false,
    canSyncDatabase: false,
    canCreateMachines: false,
    canEditMachines: false,
    canDeleteMachines: false,
    canUpdateMachineStatus: true,
    canConfigureMachineThresholds: false,
    canLogProduction: false,
    canDeleteProduction: false,
    canLogMaintenance: true,
    canDeleteMaintenance: false,
    canReportIncidents: true,
    canUpdateIncidents: true,
    canDeleteIncidents: false,
    canCreateWorkOrders: false,
    canUpdateWorkOrders: true,
    canDeleteWorkOrders: false,
    canAssignTechnicians: false,
    canVerifyRepairs: false,
    canManageSpareParts: true,
    canDeleteSpareParts: false,
    canViewSystemAuditLogs: false
  }
};

export function isRouteAllowedForRole(role: UserRole | undefined, route: string): boolean {
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;
  // Exact match or prefix match for routes like /super-admin/overview
  return permissions.allowedRoutes.some(allowed => route === allowed || route.startsWith(allowed + '/'));
}
