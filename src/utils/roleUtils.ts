/**
 * Role-based access control utilities
 * Defines what each role can access and do
 */

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin', 
  SALES = 'sales',
  USER = 'user'
}

export interface RolePermissions {
  canAccessUsers: boolean;
  canAccessRoles: boolean;
  canAccessPermissions: boolean;
  canAccessAgentProfile: boolean;
  canAccessAgentDashboard: boolean;
  canAccessLeads: boolean;
  canAccessHelpdesk: boolean;
  canAccessRecruitment: boolean;
  canAccessIntegration: boolean;
  canAccessControls: boolean;
  canAccessContacts: boolean;
  canCreateUsers: boolean;
  canEditUsers: boolean;
  canDeleteUsers: boolean;
  canCreateAgents: boolean;
  canEditAgents: boolean;
  canDeleteAgents: boolean;
  canViewAllLeads: boolean;
  canViewAssignedLeads: boolean;
  canEditLeads: boolean;
  canDeleteLeads: boolean;
  canViewReports: boolean;
  canViewAnalytics: boolean;
  canManageSystem: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  [UserRole.SUPER_ADMIN]: {
    // Full access to everything
    canAccessUsers: true,
    canAccessRoles: true,
    canAccessPermissions: true,
    canAccessAgentProfile: true,
    canAccessAgentDashboard: true, // Super admin has access to all dashboards
    canAccessLeads: true,
    canAccessHelpdesk: true,
    canAccessRecruitment: true,
    canAccessIntegration: true,
    canAccessControls: true,
    canAccessContacts: true,
    canCreateUsers: true,
    canEditUsers: true,
    canDeleteUsers: true,
    canCreateAgents: true,
    canEditAgents: true,
    canDeleteAgents: true,
    canViewAllLeads: true,
    canViewAssignedLeads: true,
    canEditLeads: true,
    canDeleteLeads: true,
    canViewReports: true,
    canViewAnalytics: true,
    canManageSystem: true,
  },
  [UserRole.ADMIN]: {
    // Most access except system management
    canAccessUsers: true,
    canAccessRoles: true,
    canAccessPermissions: true,
    canAccessAgentProfile: true,
    canAccessAgentDashboard: true, // Admin has access to agent dashboard
    canAccessLeads: true,
    canAccessHelpdesk: true,
    canAccessRecruitment: true,
    canAccessIntegration: true,
    canAccessControls: true,
    canAccessContacts: true,
    canCreateUsers: true,
    canEditUsers: true,
    canDeleteUsers: false, // Cannot delete users
    canCreateAgents: true,
    canEditAgents: true,
    canDeleteAgents: false, // Cannot delete agents
    canViewAllLeads: true,
    canViewAssignedLeads: true,
    canEditLeads: true,
    canDeleteLeads: true,
    canViewReports: true,
    canViewAnalytics: true,
    canManageSystem: false, // Cannot manage system settings
  },
  [UserRole.SALES]: {
    // Limited access - only what agents need
    canAccessUsers: false,
    canAccessRoles: false,
    canAccessPermissions: false,
    canAccessAgentProfile: true, // Can view their own profile
    canAccessAgentDashboard: true, // Main dashboard for agents
    canAccessLeads: true,
    canAccessHelpdesk: false,
    canAccessRecruitment: false,
    canAccessIntegration: false,
    canAccessControls: false,
    canAccessContacts: false,
    canCreateUsers: false,
    canEditUsers: false,
    canDeleteUsers: false,
    canCreateAgents: false,
    canEditAgents: true, // Can edit their own agent profile
    canDeleteAgents: false,
    canViewAllLeads: false, // Can only view assigned leads
    canViewAssignedLeads: true,
    canEditLeads: true, // Can edit assigned leads
    canDeleteLeads: false,
    canViewReports: true, // Can view their own performance reports
    canViewAnalytics: false, // Cannot view system analytics
    canManageSystem: false,
  },
  [UserRole.USER]: {
    // Very limited access
    canAccessUsers: false,
    canAccessRoles: false,
    canAccessPermissions: false,
    canAccessAgentProfile: false,
    canAccessAgentDashboard: false,
    canAccessLeads: false,
    canAccessHelpdesk: false,
    canAccessRecruitment: false,
    canAccessIntegration: false,
    canAccessControls: false,
    canAccessContacts: false,
    canCreateUsers: false,
    canEditUsers: false,
    canDeleteUsers: false,
    canCreateAgents: false,
    canEditAgents: false,
    canDeleteAgents: false,
    canViewAllLeads: false,
    canViewAssignedLeads: false,
    canEditLeads: false,
    canDeleteLeads: false,
    canViewReports: false,
    canViewAnalytics: false,
    canManageSystem: false,
  }
};

interface UserWithRoles {
  role_id?: string | number;
  role_name?: string;
  role?: string;
  userRoles?: string;
  roles?: Array<string | { role_name?: string }>;
  [key: string]: unknown;
}

export function getUserRole(user: UserWithRoles | null | undefined): UserRole {
  if (!user) return UserRole.USER;
  
  // Log for debugging
  console.log('🔍 getUserRole called with user:', {
    user,
    role_id: user?.role_id,
    role_name: user?.role_name,
    role: user?.role,
    userRoles: user?.userRoles,
    roles: user?.roles
  });
  
  // Priority 1: Check roles array FIRST (backend sends: roles: ['Super Admin'])
  if (user.roles && Array.isArray(user.roles) && user.roles.length > 0) {
    console.log('🔍 Checking roles array:', user.roles);
    
    // Check each role in the array (case-insensitive, handles spaces)
    for (const role of user.roles) {
      const roleStr = typeof role === 'string' ? role : (role.role_name || String(role));
      const roleLower = roleStr.toLowerCase().trim();
      const roleNormalized = roleLower.replace(/\s+/g, '_').replace(/-/g, '_');
      
      console.log('  - Checking role:', roleStr, '→ normalized:', roleNormalized);
      
      // Check for Super Admin - multiple patterns
      if (
        roleLower === 'super admin' ||
        roleLower === 'superadmin' ||
        roleLower === 'super_admin' ||
        roleLower.includes('super admin') ||
        roleLower.includes('superadmin') ||
        roleNormalized === 'super_admin' ||
        roleNormalized.includes('super_admin')
      ) {
        console.log('✅ Detected Super Admin from roles array:', roleStr);
        return UserRole.SUPER_ADMIN;
      }
      
      // Check for Admin (but not Super Admin)
      if (
        (roleLower.includes('admin') || roleNormalized.includes('admin')) &&
        !roleLower.includes('super') &&
        !roleNormalized.includes('super')
      ) {
        console.log('✅ Detected Admin from roles array:', roleStr);
        return UserRole.ADMIN;
      }
      
      // Check for Sales
      if (
        roleLower.includes('sales') ||
        roleLower.includes('sales manager') ||
        roleLower.includes('sales_agent') ||
        roleLower.includes('sales_agent') ||
        roleNormalized.includes('sales')
      ) {
        console.log('✅ Detected Sales from roles array:', roleStr);
        return UserRole.SALES;
      }
    }
    
    // If we didn't match, try the first role with normalization
    const firstRole = user.roles[0];
    const firstRoleStr = typeof firstRole === 'string' ? firstRole : (firstRole.role_name || String(firstRole));
    const firstRoleNormalized = firstRoleStr.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
    
    console.log('⚠️ No exact match, checking first role:', firstRoleStr, '→ normalized:', firstRoleNormalized);
    
    if (firstRoleNormalized.includes('super_admin') || firstRoleNormalized.includes('superadmin')) {
      console.log('✅ Detected Super Admin from first role');
      return UserRole.SUPER_ADMIN;
    }
    if (firstRoleNormalized.includes('admin') && !firstRoleNormalized.includes('super')) {
      console.log('✅ Detected Admin from first role');
      return UserRole.ADMIN;
    }
    if (firstRoleNormalized.includes('sales')) {
      console.log('✅ Detected Sales from first role');
      return UserRole.SALES;
    }
  }
  
  // Priority 2: Check role_id (might be numeric in DEV: "3" = Sales Manager, "1" = Super Admin)
  let roleIdValue: string | null = null;
  if (user.role_id) {
    roleIdValue = String(user.role_id);
    const roleIdMap: Record<string, string> = {
      '1': 'super_admin',
      '2': 'hr_executive',
      '3': 'sales_manager',
      '4': 'sales',
      'sales': 'sales',
      'sales_manager': 'sales',
      'sales_agent': 'sales',
      'agent': 'sales',
      'super_admin': 'super_admin',
      'superadmin': 'super_admin',
      'admin': 'admin',
      'administrator': 'admin',
      'Super Admin': 'super_admin',
      'super admin': 'super_admin',
      'Sales Manager': 'sales_manager',
      'sales manager': 'sales_manager'
    };
    
    if (roleIdMap[roleIdValue.toLowerCase()]) {
      const mappedRole = roleIdMap[roleIdValue.toLowerCase()];
      console.log('✅ Found role_id:', roleIdValue, '→ mapped to:', mappedRole);
      if (mappedRole === 'super_admin') return UserRole.SUPER_ADMIN;
      if (mappedRole === 'admin') return UserRole.ADMIN;
      if (mappedRole === 'sales' || mappedRole === 'sales_manager') return UserRole.SALES;
    }
  }
  
  // Priority 3: Check role_name field (DEV uses this)
  if (user.role_name) {
    const roleName = user.role_name.toLowerCase();
    console.log('✅ Found role_name:', user.role_name);
    if (roleName.includes('super admin') || roleName.includes('superadmin') || roleName.includes('super_admin')) {
      return UserRole.SUPER_ADMIN;
    }
    if (roleName.includes('admin') && !roleName.includes('super')) {
      return UserRole.ADMIN;
    }
    if (roleName.includes('sales') || roleName.includes('sales_manager') || roleName.includes('sales_agent')) {
      return UserRole.SALES;
    }
  }
  
  // Priority 4: Check role field
  if (user.role) {
    const role = user.role.toLowerCase();
    console.log('✅ Found role:', user.role);
    if (role.includes('super admin') || role.includes('superadmin') || role.includes('super_admin')) {
      return UserRole.SUPER_ADMIN;
    }
    if (role.includes('admin') && !role.includes('super')) {
      return UserRole.ADMIN;
    }
    if (role.includes('sales') || role.includes('sales_manager') || role.includes('sales_agent')) {
      return UserRole.SALES;
    }
  }
  
  // Priority 5: Check userRoles field
  if (user.userRoles) {
    const userRoles = user.userRoles.toLowerCase();
    console.log('✅ Found userRoles:', user.userRoles);
    if (userRoles.includes('super admin') || userRoles.includes('superadmin') || userRoles.includes('super_admin')) {
      return UserRole.SUPER_ADMIN;
    }
    if (userRoles.includes('admin') && !userRoles.includes('super')) {
      return UserRole.ADMIN;
    }
    if (userRoles.includes('sales') || userRoles.includes('sales_manager') || userRoles.includes('sales_agent')) {
      return UserRole.SALES;
    }
  }
  
  console.log('⚠️ No role match found, returning USER');
  return UserRole.USER;
}

export function hasPermission(user: UserWithRoles | null | undefined, permission: keyof RolePermissions): boolean {
  const role = getUserRole(user);
  return ROLE_PERMISSIONS[role][permission];
}

export function canAccessPage(user: UserWithRoles | null | undefined, page: string): boolean {
  const role = getUserRole(user);
  
  switch (page) {
    case 'users':
    case 'controls-users':
      return ROLE_PERMISSIONS[role].canAccessUsers;
    case 'roles':
    case 'controls-roles':
      return ROLE_PERMISSIONS[role].canAccessRoles;
    case 'permissions':
    case 'controls-permissions':
      return ROLE_PERMISSIONS[role].canAccessPermissions;
    case 'agent-profile':
      return ROLE_PERMISSIONS[role].canAccessAgentProfile;
    case 'agent-dashboard':
      return ROLE_PERMISSIONS[role].canAccessAgentDashboard;
    case 'leads':
    case 'crm-leads':
      return ROLE_PERMISSIONS[role].canAccessLeads;
    case 'helpdesk':
      return ROLE_PERMISSIONS[role].canAccessHelpdesk;
    case 'recruitment':
      return ROLE_PERMISSIONS[role].canAccessRecruitment;
    case 'integration':
      return ROLE_PERMISSIONS[role].canAccessIntegration;
    case 'controls':
      return ROLE_PERMISSIONS[role].canAccessControls;
    case 'contacts':
      return ROLE_PERMISSIONS[role].canAccessContacts;
    case 'session-analytics':
    case 'unified-session-analysis':
      return ROLE_PERMISSIONS[role].canAccessLeads; // Use leads permission for session analytics
    case 'session-history':
      return ROLE_PERMISSIONS[role].canAccessLeads; // Use leads permission for session history
    default:
      return false;
  }
}

export function getRoleDisplayName(role: UserRole): string {
  switch (role) {
    case UserRole.SUPER_ADMIN:
      return 'Super Admin';
    case UserRole.ADMIN:
      return 'Admin';
    case UserRole.SALES:
      return 'Sales Agent';
    case UserRole.USER:
      return 'User';
    default:
      return 'Unknown';
  }
}

export function getRoleColor(role: UserRole): string {
  switch (role) {
    case UserRole.SUPER_ADMIN:
      return 'text-red-600 bg-red-100';
    case UserRole.ADMIN:
      return 'text-blue-600 bg-blue-100';
    case UserRole.SALES:
      return 'text-green-600 bg-green-100';
    case UserRole.USER:
      return 'text-gray-600 bg-gray-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
}
