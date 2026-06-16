"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "../hooks/useAuth";
// import { getLogoUrl } from "@/utils/s3Config";
import {
  BoxCubeIcon,
  ChevronDownIcon,
  GridIcon,
  HorizontaLDots,
  UserIcon,
  ChatIcon,
  DocsIcon,
  PlugInIcon,
  BellIcon,
  EnvelopeIcon,
  TaskIcon,
  GroupIcon,
  FileIcon,
  FolderIcon,
  PieChartIcon,
  ListIcon,
  TableIcon,
  PageIcon,
  BoltIcon,
  InfoIcon,
  DollarLineIcon,
  CalenderIcon,
  TimeIcon,
} from "../icons";
import Badge from "../components/ui/badge/Badge";
import { RBAC_CONFIG } from "../utils/config";
import AuthService from "../services/AuthService";
import { useRouteProtection } from "@/hooks/useRouteProtection";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
  badge?: { text: string; color?: "primary" | "success" | "error" | "warning" | "info" | "light" | "dark" };
  allowedRoles?: string[]; // Role IDs that can access this item
  requiredPermissions?: string[]; // Permissions required to access this item
};

// Removed unused types

// Icon mapping for dynamic navigation
const iconMap: Record<string, React.ReactNode> = {
  'GridIcon': <GridIcon />,
  'BoxCubeIcon': <BoxCubeIcon />,
  'ChevronDownIcon': <ChevronDownIcon />,
  'HorizontaLDots': <HorizontaLDots />,
  'UserIcon': <UserIcon />,
  'ChatIcon': <ChatIcon />,
  'DocsIcon': <DocsIcon />,
  'PlugInIcon': <PlugInIcon />,
  'BellIcon': <BellIcon />,
  'EnvelopeIcon': <EnvelopeIcon />,
  'TaskIcon': <TaskIcon />,
  'GroupIcon': <GroupIcon />,
  'FileIcon': <FileIcon />,
  'FolderIcon': <FolderIcon />,
  'PieChartIcon': <PieChartIcon />,
  'ListIcon': <ListIcon />,
  'TableIcon': <TableIcon />,
  'PageIcon': <PageIcon />,
  'BoltIcon': <BoltIcon />,
  'InfoIcon': <InfoIcon />,
  'DollarLineIcon': <DollarLineIcon />,
  'CalenderIcon': <CalenderIcon />,
  'TimeIcon': <TimeIcon />,
};

// Route to navigation item mapping - updated to match backend paths exactly
const routeToNavItem: Record<string, { name: string; icon: string; category: string }> = {
  // Main routes
  '/': { name: 'Home', icon: 'GridIcon', category: 'main' },
  '/Help': { name: 'Help', icon: 'DocsIcon', category: 'main' },
  '/Version': { name: 'Version', icon: 'BoltIcon', category: 'main' },

  // Dashboard routes
  '/dashboard': { name: 'Overview', icon: 'PieChartIcon', category: 'dashboards' },
  '/chat-dashboard': { name: 'Chat dashboard', icon: 'ChatIcon', category: 'dashboards' },
  '/leads-dashboard': { name: 'Leads Dashboard', icon: 'PieChartIcon', category: 'dashboards' },
  '/leads-dashboard-enhanced': { name: 'Enhanced Leads Dashboard', icon: 'PieChartIcon', category: 'dashboards' },
  '/ai-analytics-dashboard': { name: 'AI Analytics Dashboard', icon: 'BoltIcon', category: 'dashboards' },

  '/agent-performance': { name: 'Agent Performance', icon: 'PieChartIcon', category: 'dashboards' },
  '/community-forum': { name: 'Community Dashboard', icon: 'DocsIcon', category: 'dashboards' },
  '/applicants-dashboard': { name: 'Recruitment Dashboard', icon: 'UserIcon', category: 'dashboards' },
  '/helpdesk-dashboard': { name: 'Helpdesk Dashboard', icon: 'TaskIcon', category: 'dashboards' },
  '/employee-dashboard': { name: 'Employee Dashboard', icon: 'UserIcon', category: 'dashboards' },




  // Knowledge Hub routes
  '/organisation': { name: 'Guests', icon: 'GroupIcon', category: 'knowledge_hub' },
  '/customer': { name: 'Customer', icon: 'UserIcon', category: 'knowledge_hub' },
  '/employee': { name: 'Employee', icon: 'UserIcon', category: 'knowledge_hub' },


  // Lead Management routes - Updated to include all L_S_A routes
  '/crm-leads': { name: 'Leads', icon: 'ListIcon', category: 'lead_management' },


  '/session-history': { name: 'Session History', icon: 'CalenderIcon', category: 'lead_management' },
  '/unified-session-analysis': { name: 'Website Analytics', icon: 'PieChartIcon', category: 'lead_management' },
  '/agent-profile': { name: 'Agent Profile', icon: 'UserIcon', category: 'lead_management' },
  '/crm-settings': { name: 'Settings', icon: 'FileIcon', category: 'lead_management' },

  // Helpdesk routes
  '/helpdesk-customer-ticket': { name: 'Customer Ticket', icon: 'TaskIcon', category: 'helpdesk' },
  '/helpdesk-employee-ticket': { name: 'Employee Ticket', icon: 'TaskIcon', category: 'helpdesk' },
  '/helpdesk-settings': { name: 'Settings', icon: 'FileIcon', category: 'helpdesk' },


  // Job Center routes
  '/Jobs': { name: 'Applicants', icon: 'UserIcon', category: 'Recruitment_Center' },
  '/hr-dashboard': { name: 'Hire Portal', icon: 'PieChartIcon', category: 'Recruitment_Center' },

  // Integration Center routes
  '/integration-center-connectors': { name: 'Connectors', icon: 'PlugInIcon', category: 'integration_center' },

  // Contacts routes
  '/contacts': { name: 'Contacts', icon: 'UserIcon', category: 'contacts' },

  // Controls routes
  '/controls-users': { name: 'Manage Users', icon: 'UserIcon', category: 'controls' },
  '/controls-session-management': { name: 'Session Management', icon: 'UserIcon', category: 'controls' },
  '/helpdesk-create-ticket': { name: 'Billing', icon: 'DollarLineIcon', category: 'controls' },
  '/controls-system-status': { name: 'System Status', icon: 'BoltIcon', category: 'controls' },
  '/controls-dashboard-settings': { name: 'Dashboard Notification', icon: 'FileIcon', category: 'controls' },
  '/pre-prompt': { name: 'AI Prompt Management', icon: 'BoltIcon', category: 'controls' },
  '/inbox': { name: 'Chat Inbox', icon: 'ChatIcon', category: 'controls' },
  '/Email-Setting': { name: 'Email Settings', icon: 'EnvelopeIcon', category: 'controls' },
  '/avatars': { name: 'Bot Settings', icon: 'BoltIcon', category: 'controls' },
  '/llm-model': { name: 'LLM Model', icon: 'BoltIcon', category: 'controls' },

  // Survey & Feedback routes
  '/survey-feedback': { name: 'Survey', icon: 'FileIcon', category: 'survey_feedback' },
  '/survey-feedback/responses': { name: 'Responses', icon: 'TableIcon', category: 'survey_feedback' },
  '/survey-feedback/dashboard': { name: 'Dashboard', icon: 'PieChartIcon', category: 'survey_feedback' },

  // Appointment routes
  '/appointment': { name: 'Appointments', icon: 'CalenderIcon', category: 'appointments' },

  // ESS (Employee Self-Service) routes

  '/ess-portal/payslips': { name: 'Payslips', icon: 'DollarLineIcon', category: 'ess' },
  '/ess-portal/leave': { name: 'Leave Management', icon: 'CalenderIcon', category: 'ess' },
  '/ess-portal/attendance': { name: 'Attendance', icon: 'TimeIcon', category: 'ess' },
  '/ess-portal/expenses': { name: 'Expenses', icon: 'DollarLineIcon', category: 'ess' },
  '/ess-portal/assets': { name: 'Asset Requests', icon: 'BoxCubeIcon', category: 'ess' },

  // ESS Analytics routes

  // Approval Management routes
  '/ess-approval-flows': { name: 'Dashboard', icon: 'PieChartIcon', category: 'ess_approval_flows' },
  '/ess-approval-flows/hr': { name: 'HR Approval', icon: 'UserIcon', category: 'ess_approval_flows' },
  '/ess-approval-flows/it': { name: 'IT Approval', icon: 'BoltIcon', category: 'ess_approval_flows' },
  '/ess-approval-flows/finance': { name: 'Finance Approval', icon: 'DollarLineIcon', category: 'ess_approval_flows' },
  '/ess-approval-flows/manager-approvals': { name: 'Manager Approval', icon: 'TaskIcon', category: 'ess_approval_flows' },
  '/ess-approval-flows/leave-settings': { name: 'Leave Settings', icon: 'TaskIcon', category: 'hr_module' },
};

// Category configurations - updated to match backend structure
const categoryConfig: Record<string, { name: string; icon: string; badge?: { text: string; color: "primary" | "success" | "error" | "warning" | "info" | "light" | "dark" } }> = {
  'main': { name: 'Main', icon: 'GridIcon' },
  'dashboards': { name: 'Dashboards', icon: 'PieChartIcon' },
  'Recruitment_Center': { name: 'Recruitment Center', icon: 'UserIcon' },
  'knowledge_hub': { name: 'Knowledge Hub', icon: 'DocsIcon' },
  'lead_management': { name: 'Lead Management', icon: 'ListIcon' },
  'helpdesk': { name: 'Helpdesk', icon: 'TaskIcon' },
  'integration_center': { name: 'Integration Center', icon: 'PlugInIcon' },
  'contacts': { name: 'Contacts', icon: 'UserIcon' },
  'controls': { name: 'Controls', icon: 'FileIcon' },
  'survey_feedback': { name: 'Survey & Feedback', icon: 'FileIcon' },
  'appointments': { name: 'Appointments', icon: 'CalenderIcon' },
  'ess': { name: 'Employee Self-Service', icon: 'UserIcon' },
  'ess_approval_flows': { name: 'Approval Management', icon: 'TaskIcon' },
  'hr_module': { name: 'HR Module', icon: 'UserIcon' },
};

const EXCLUDED_ROUTES = new Set<string>(["/ess-approval-flows"]);

const filterExcludedRoutes = (routes: string[]): string[] =>
  routes.filter((route) => !EXCLUDED_ROUTES.has(route));

// Function to find the first submenu with items
const getDefaultOpenSubmenu = (): { type: "main"; index: number } | null => {
  return null;
};

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();
  const { user, checkAuth } = useAuth();
  const router = useRouter();
  const { accessibleRoutes, isLoading: routesLoading, isInitialized: routesInitialized } = useRouteProtection();
  const [isHydrated, setIsHydrated] = useState(false);
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Track hydration state
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Transform user routes to navigation items
  const transformUserRoutesToNavItems = useCallback((routes: string[]): NavItem[] => {
    const filteredRoutes = filterExcludedRoutes(routes);
    // Separate main routes from other routes
    const mainRoutes: string[] = [];
    const otherRoutes: string[] = [];

    filteredRoutes.forEach(routePath => {
      const navItem = routeToNavItem[routePath];

      if (navItem) {
        if (navItem.category === 'main') {
          mainRoutes.push(routePath);
        } else {
          otherRoutes.push(routePath);
        }
      }
    });

    // Create navigation items
    const navItems: NavItem[] = [];

    // Add Home first (if it exists in main routes)
    const homeRoute = mainRoutes.find(route => route === '/');
    if (homeRoute) {
      const navItem = routeToNavItem[homeRoute];
      navItems.push({
        name: navItem.name,
        icon: iconMap[navItem.icon] || <GridIcon />,
        path: homeRoute,
        allowedRoles: [],
        requiredPermissions: [],
      });
    }

    // Group other routes by category
    const routesByCategory: Record<string, string[]> = {};
    otherRoutes.forEach(routePath => {
      const navItem = routeToNavItem[routePath];
      if (navItem) {
        if (!routesByCategory[navItem.category]) {
          routesByCategory[navItem.category] = [];
        }
        routesByCategory[navItem.category].push(routePath);
      }
    });

    // Define category order to ensure proper positioning
    const categoryOrder = [
      'dashboards',
      'knowledge_hub',
      'lead_management',
      'helpdesk',
      'Recruitment_Center',
      'ess',
      'ess_approval_flows',
      'hr_module',
      'integration_center',
      'appointments',
      'controls',
      'contacts',
      'survey_feedback'
    ];

    // Add other categories with dropdowns in specified order
    categoryOrder.forEach(category => {
      const routePaths = routesByCategory[category];
      if (!routePaths) return;
      const categoryInfo = categoryConfig[category];
      if (!categoryInfo) return;

      // Category-specific ordering
      if (category === 'dashboards') {
        const order = [
          '/dashboard',
          '/chat-dashboard',
          '/leads-dashboard',
          '/leads-dashboard-enhanced',
          '/ai-analytics-dashboard',
          '/agent-performance',
          '/community-forum',
          '/applicants-dashboard',
          '/helpdesk-dashboard',
          '/employee-dashboard'
        ];
        routePaths.sort((a, b) => {
          const ia = order.indexOf(a);
          const ib = order.indexOf(b);
          return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
        });
      }

      if (category === 'Recruitment_Center') {
        const order = ['/Jobs', '/hr-dashboard'];
        routePaths.sort((a, b) => {
          const ia = order.indexOf(a);
          const ib = order.indexOf(b);
          return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
        });
      }

      if (category === 'knowledge_hub') {
        const order = ['/organisation', '/customer', '/employee'];
        routePaths.sort((a, b) => {
          const ia = order.indexOf(a);
          const ib = order.indexOf(b);
          return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
        });
      }

      if (category === 'lead_management') {
        const order = [
          '/crm-leads',
          '/session-history',
          '/unified-session-analysis',
          '/agent-profile',
          '/crm-settings'
        ];
        routePaths.sort((a, b) => {
          const ia = order.indexOf(a);
          const ib = order.indexOf(b);
          return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
        });
      }

      if (category === 'survey_feedback') {
        const order = ['/survey-feedback', '/survey-feedback/responses', '/survey-feedback/dashboard'];
        routePaths.sort((a, b) => {
          const ia = order.indexOf(a);
          const ib = order.indexOf(b);
          return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
        });
      }

      if (category === 'ess') {
        const order = [
          '/ess-portal/payslips',
          '/ess-portal/leave',
          '/ess-portal/attendance',
          '/ess-portal/expenses',
          '/ess-portal/assets'
        ];
        routePaths.sort((a, b) => {
          const ia = order.indexOf(a);
          const ib = order.indexOf(b);
          return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
        });
      }

      if (category === 'ess_analytics') {
        const order = [
          '/ess-analytics'
        ];
        routePaths.sort((a, b) => {
          const ia = order.indexOf(a);
          const ib = order.indexOf(b);
          return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
        });
      }

      if (category === 'ess_approval_flows') {
        const order = [
          '/ess-approval-flows/hr',
          '/ess-approval-flows/it',
          '/ess-approval-flows/finance',
          '/ess-approval-flows/manager-approvals',
          '/ess-approval-flows/leave-settings'
        ];
        routePaths.sort((a, b) => {
          const ia = order.indexOf(a);
          const ib = order.indexOf(b);
          return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
        });
      }

      // Categories that should always show as submenu (even with single route)
      const alwaysSubmenuCategories = ['Recruitment_Center', 'helpdesk', 'survey_feedback', 'ess', 'ess_approval_flows', 'lead_management', 'hr_module'];
      const shouldForceSubmenu = alwaysSubmenuCategories.includes(category);

      if (routePaths.length === 1 && !shouldForceSubmenu) {
        // Single route - create direct link (unless category should always be submenu)
        const routePath = routePaths[0];
        const navItem = routeToNavItem[routePath];
        navItems.push({
          name: navItem.name,
          icon: iconMap[navItem.icon] || <GridIcon />,
          path: routePath,
          allowedRoles: [],
          requiredPermissions: [],
        });
      } else {
        // Multiple routes or forced submenu - create submenu
        const subItems = routePaths.map(routePath => {
          const navItem = routeToNavItem[routePath];
          return {
            name: navItem.name,
            path: routePath,
            pro: false,
            new: false,
          };
        });

        navItems.push({
          name: categoryInfo.name,
          icon: iconMap[categoryInfo.icon] || <GridIcon />,
          subItems,
          badge: categoryInfo.badge,
          allowedRoles: [],
          requiredPermissions: [],
        });
      }
    });

    // Add remaining main routes (Help, Version) at the end
    const remainingMainRoutes = mainRoutes.filter(route => route !== '/');
    remainingMainRoutes.forEach(routePath => {
      const navItem = routeToNavItem[routePath];
      navItems.push({
        name: navItem.name,
        icon: iconMap[navItem.icon] || <GridIcon />,
        path: routePath,
        allowedRoles: [],
        requiredPermissions: [],
      });
    });

    return navItems;
  }, []); // Empty dependency array to prevent re-creation

  // Fallback function to fetch role-based paths
  const fetchRoleBasedPaths = useCallback(async () => {
    // Prevent multiple simultaneous calls
    if (isFetching.current) {
      return;
    }

    try {
      const authService = AuthService.getInstance();
      const token = authService.getToken();

      if (!token || !user?.role_id) {
        setNavItems([]);
        return;
      }

      const response = await fetch(`${RBAC_CONFIG.BACKEND_URL}${RBAC_CONFIG.API_ENDPOINTS.USER_PATHS}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();

        if (data.user_paths?.accessible_paths) {
          let routes = data.user_paths.accessible_paths;
          routes = filterExcludedRoutes(routes);

          if (routes.length === 0) {
            setNavItems([]);
            return;
          }

          // Ensure Recruitment Center routes are always included (add to routes if missing)
          const recruitmentRoutes = ['/Jobs', '/hr-dashboard'];
          const missingRecruitmentRoutes = recruitmentRoutes.filter(route => !routes.includes(route));
          if (missingRecruitmentRoutes.length > 0) {
            routes = [...routes, ...missingRecruitmentRoutes];
          }

          // Ensure Survey & Feedback routes are always included (add to routes if missing)
          const surveyRoutes = ['/survey-feedback', '/survey-feedback/responses', '/survey-feedback/dashboard'];
          const missingSurveyRoutes = surveyRoutes.filter(route => !routes.includes(route));
          if (missingSurveyRoutes.length > 0) {
            routes = [...routes, ...missingSurveyRoutes];
          }

          // Ensure Approval Management routes are always included (add to routes if missing)
          const essApprovalFlowsRoutes = [
            '/ess-approval-flows/hr',
            '/ess-approval-flows/it',
            '/ess-approval-flows/finance',
            '/ess-approval-flows/leave-settings',
            '/ess-approval-flows/manager-approvals'
          ];
          const missingEssApprovalRoutes = essApprovalFlowsRoutes.filter(route => !routes.includes(route));
          if (missingEssApprovalRoutes.length > 0) {
            routes = [...routes, ...missingEssApprovalRoutes];
          }

          const transformedNavItems = transformUserRoutesToNavItems(routes);

          // Cache the result
          routesCache.current = {
            data: transformedNavItems,
            timestamp: Date.now()
          };

          setNavItems(transformedNavItems);
        } else {
          setNavItems([]);
        }
      } else {
        setNavItems([]);
      }
    } catch {
      setNavItems([]);
    }
  }, [user?.role_id, transformUserRoutesToNavItems]); // Include transformUserRoutesToNavItems in dependencies

  // Cache for user routes to prevent repeated API calls
  const routesCache = useRef<{ data: NavItem[]; timestamp: number } | null>(null);
  const isFetching = useRef(false);

  // Fetch user routes from backend
  const fetchUserRoutes = useCallback(async () => {
    // Prevent multiple simultaneous calls
    if (isFetching.current) {
      return;
    }

    // Check cache first (cache for 5 minutes)
    const now = Date.now();
    const cacheDuration = 5 * 60 * 1000; // 5 minutes
    if (routesCache.current && (now - routesCache.current.timestamp) < cacheDuration) {
      setNavItems(routesCache.current.data);
      setIsLoading(false);
      return;
    }

    isFetching.current = true;

    try {
      // Use AuthService to get token instead of direct localStorage access
      const authService = AuthService.getInstance();
      const token = authService.getToken();

      if (!token) {
        setNavItems([]);
        setIsLoading(false);
        return;
      }

      const response = await fetch(`${RBAC_CONFIG.BACKEND_URL}${RBAC_CONFIG.API_ENDPOINTS.USER_ROUTES}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();

        // Handle different possible response formats
        let routes: string[] = [];

        if (Array.isArray(data.routes)) {
          if (data.routes.length > 0 && typeof data.routes[0] === 'object') {
            // If routes is an array of objects with path property
            routes = data.routes.map((route: { path?: string; route?: string }) => route.path || route.route).filter((route: string | undefined): route is string => typeof route === 'string');
          } else {
            // If routes is an array of strings (paths)
            routes = data.routes;
          }
        } else if (Array.isArray(data)) {
          // If the entire response is an array
          routes = data.map((route: { path?: string; route?: string }) => route.path || route.route || route).filter((route): route is string => typeof route === 'string');
        }

        // Ensure Recruitment Center routes are always included (add to routes if missing)
        const recruitmentRoutes = ['/Jobs', '/hr-dashboard'];
        const missingRecruitmentRoutes = recruitmentRoutes.filter(route => !routes.includes(route));
        if (missingRecruitmentRoutes.length > 0) {
          routes = [...routes, ...missingRecruitmentRoutes];
        }

        // Ensure Survey & Feedback routes are always included (add to routes if missing)
        const surveyRoutes = ['/survey-feedback', '/survey-feedback/responses', '/survey-feedback/dashboard'];
        const missingSurveyRoutes = surveyRoutes.filter(route => !routes.includes(route));
        if (missingSurveyRoutes.length > 0) {
          routes = [...routes, ...missingSurveyRoutes];
        }

        // Ensure Approval Management routes are always included (add to routes if missing)
        const essApprovalFlowsRoutes = [
          '/ess-approval-flows/hr',
          '/ess-approval-flows/it',
          '/ess-approval-flows/finance',
          '/ess-approval-flows/leave-settings',
          '/ess-approval-flows/manager-approvals'
        ];
        const missingEssApprovalRoutes = essApprovalFlowsRoutes.filter(route => !routes.includes(route));
        if (missingEssApprovalRoutes.length > 0) {
          routes = [...routes, ...missingEssApprovalRoutes];
        }

        routes = filterExcludedRoutes(routes);

        // If no routes found, try fallback
        if (routes.length === 0) {
          await fetchRoleBasedPaths();
          return;
        }

        // Transform routes to navigation items
        const transformedNavItems = transformUserRoutesToNavItems(routes);

        // Cache the result
        routesCache.current = {
          data: transformedNavItems,
          timestamp: now
        };

        setNavItems(transformedNavItems);
      } else {
        // Fallback: try to get role-based paths if user routes fail
        await fetchRoleBasedPaths();
      }
    } catch {
      // Fallback: try to get role-based paths if user routes fail
      await fetchRoleBasedPaths();
    } finally {
      setIsLoading(false);
      isFetching.current = false;
    }
  }, [transformUserRoutesToNavItems, fetchRoleBasedPaths]); // Include all dependencies

  // Manual system initialization function
  // const initializeSystem = useCallback(async () => {
  //   try {
  //     const authService = AuthService.getInstance();
  //     const token = authService.getToken();

  //     if (!token) {
  //       console.log('AppSidebar: No token available for system initialization');
  //       return;
  //     }

  //     console.log('AppSidebar: Attempting to initialize system...');

  //     const response = await fetch(`${RBAC_CONFIG.BACKEND_URL}${RBAC_CONFIG.API_ENDPOINTS.SYSTEM_INITIALIZE}`, {
  //       method: 'POST',
  //       headers: {
  //         'Authorization': `Bearer ${token}`,
  //         'Content-Type': 'application/json',
  //       },
  //     });

  //     if (response.ok) {
  //       const data = await response.json();
  //       console.log('AppSidebar: System initialized successfully:', data);

  //       // Clear cache and refetch routes
  //       routesCache.current = null;
  //       await fetchUserRoutes();
  //     } else {
  //       console.log('AppSidebar: System initialization failed with status:', response.status);
  //     }
  //   } catch (error) {
  //     console.error('AppSidebar: Error initializing system:', error);
  //   }
  // }, [fetchUserRoutes]);

  // Track if we've already fetched routes for this user
  const hasFetchedRoutes = useRef(false);
  const lastUserId = useRef<string | null>(null);

  // Clear cache when user logs out
  useEffect(() => {
    if (!checkAuth() || !user) {
      routesCache.current = null;
      hasFetchedRoutes.current = false;
      lastUserId.current = null;
      setNavItems([]);
    }
  }, [checkAuth, user]);

  // Use routes from useRouteProtection hook (backend API)
  // CRITICAL: Only update navItems when routes are fully loaded and initialized
  // This prevents showing all routes before role-based filtering
  useEffect(() => {
    // CRITICAL: Only update navItems when routes are fully loaded and initialized
    if (isHydrated && routesInitialized && !routesLoading) {
      if (accessibleRoutes && accessibleRoutes.length > 0) {
        const filteredRoutes = filterExcludedRoutes(accessibleRoutes);
        const transformedNavItems = transformUserRoutesToNavItems(filteredRoutes);
        setNavItems(transformedNavItems);
        setIsLoading(false);
      } else if (accessibleRoutes && accessibleRoutes.length === 0) {
        // No routes from backend - explicitly set empty
        setNavItems([]);
        setIsLoading(false);
      }
    } else if (isHydrated && !routesInitialized && routesLoading) {
      // Still loading routes - keep loading state and empty navItems
      setIsLoading(true);
      setNavItems([]); // CRITICAL: Keep empty until routes are loaded
    } else if (isHydrated && routesInitialized && !user) {
      // Not authenticated - clear routes
      setNavItems([]);
      setIsLoading(false);
    } else if (!isHydrated) {
      // Not hydrated yet - keep empty to prevent hydration mismatch
      setNavItems([]);
      setIsLoading(true);
    }
  }, [isHydrated, routesInitialized, routesLoading, accessibleRoutes, transformUserRoutesToNavItems, user]);

  // Fallback: Fetch user routes on mount if hook not ready (backwards compatibility)
  // CRITICAL: Only run if hook hasn't initialized after a delay to prevent race condition
  useEffect(() => {
    if (isHydrated && checkAuth() && user && user.role_id) {
      // Only use fallback if hook hasn't initialized after 2 seconds
      // This prevents showing all routes before role-based filtering
      const fallbackTimeout = setTimeout(() => {
        if (!routesInitialized && !hasFetchedRoutes.current) {
          hasFetchedRoutes.current = true;
          lastUserId.current = user.user_id;
          fetchUserRoutes();
        } else if (routesInitialized) {
          // Hook initialized, no need for fallback
          setIsLoading(false);
        }
      }, 2000); // Wait 2 seconds for hook to initialize

      return () => clearTimeout(fallbackTimeout);
    } else if (isHydrated && !user) {
      setIsLoading(false);
      setNavItems([]);
    }
  }, [isHydrated, user?.user_id, checkAuth, fetchUserRoutes, user, routesInitialized]);

  // Filter navigation items based on user role
  const filterNavItemsByRole = useCallback((items: NavItem[]): NavItem[] => {
    // CRITICAL: During SSR or before hydration, return empty to prevent hydration mismatch
    if (!isHydrated) {
      return [];
    }

    // CRITICAL: If routes not initialized, return empty to prevent showing all routes
    if (!routesInitialized && routesLoading) {
      return [];
    }

    if (!checkAuth() || !user) {
      return []; // Return empty if not authenticated
    }

    // Since we're using user routes from backend, all items are already filtered
    // Just return the items as they come from the backend
    return items;
  }, [user, checkAuth, isHydrated, routesInitialized, routesLoading]);

  // Get filtered navigation items
  const filteredNavItems = filterNavItemsByRole(navItems);
  // Removed unused filteredOthersItems variable



  const isActive = useCallback(
    (path: string) => {
      // Special case for Inbox: consider /inbox and /previous-chat as active
      if (path === "/inbox") {
        return pathname === "/inbox" || pathname === "/previous-chat";
      }
      return path === pathname;
    },
    [pathname]
  );

  // Set default open submenu - this will open the first submenu with items by default
  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main" | "others";
    index: number;
  } | null>(getDefaultOpenSubmenu());

  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Auto-expand parent section if child page is active
  useEffect(() => {
    if (!filteredNavItems || filteredNavItems.length === 0) return;

    // Find which submenu contains the active path
    const activeSubmenuIndex = filteredNavItems.findIndex((nav) => {
      if (!nav.subItems || nav.subItems.length === 0) return false;
      return nav.subItems.some((subItem) => isActive(subItem.path));
    });

    // If we found an active submenu, expand it
    if (activeSubmenuIndex !== -1) {
      setOpenSubmenu({ type: "main", index: activeSubmenuIndex });
    }
  }, [pathname, filteredNavItems, isActive]);

  // Cleanup refs when component unmounts
  useEffect(() => {
    return () => {
      subMenuRefs.current = {};
    };
  }, []);

  const handleSubmenuToggle = useCallback((index: number, menuType: "main" | "others") => {
    setOpenSubmenu((prevOpenSubmenu) => {
      // Only update if the state actually needs to change
      if (
        prevOpenSubmenu &&
        prevOpenSubmenu.type === menuType &&
        prevOpenSubmenu.index === index
      ) {
        return null;
      }
      if (
        !prevOpenSubmenu ||
        prevOpenSubmenu.type !== menuType ||
        prevOpenSubmenu.index !== index
      ) {
        return { type: menuType, index };
      }
      return prevOpenSubmenu;
    });
  }, []);

  // Prefetch helper to improve nav speed
  const prefetchPath = useCallback((path?: string) => {
    if (!path) return;
    try {
      router.prefetch?.(path);
    } catch { }
  }, [router]);

  const renderMenuItems = (
    navItems: NavItem[],
    menuType: "main" | "others"
  ) => (
    <ul className="flex flex-col gap-4">
      {navItems.map((nav, index) => (
        <li key={`${menuType}-${nav.name}-${index}`}>
          {nav.subItems && nav.subItems.length > 0 ? (
            <button
              onClick={() => handleSubmenuToggle(index, menuType)}
              className={`menu-item group  ${openSubmenu?.type === menuType && openSubmenu?.index === index
                ? "menu-item-active"
                : "menu-item-inactive"
                } cursor-pointer lg:justify-start`}
              aria-expanded={openSubmenu?.type === menuType && openSubmenu?.index === index}
              aria-controls={`submenu-${menuType}-${index}`}
            >
              <span
                className={` ${openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? "menu-item-icon-active"
                  : "menu-item-icon-inactive"
                  }`}
              >
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <>
                  <span className={`menu-item-text whitespace-nowrap`}>{nav.name}</span>
                  <div className="flex items-center gap-2 ml-auto">
                    {nav.badge && (
                      <Badge
                        variant="light"
                        color={nav.badge.color || "primary"}
                        size="sm"
                      >
                        {nav.badge.text}
                      </Badge>
                    )}
                    <ChevronDownIcon
                      className={`w-5 h-5 transition-transform duration-200  ${openSubmenu?.type === menuType &&
                        openSubmenu?.index === index
                        ? "rotate-180 text-brand-500"
                        : ""
                        }`}
                    />
                  </div>
                </>
              )}
            </button>
          ) : (
            nav.path && (
              <Link
                href={nav.path}
                className={`menu-item group ${isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                  }`}
                onMouseEnter={() => prefetchPath(nav.path)}
                prefetch
              >
                <span
                  className={`${isActive(nav.path)
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                    }`}
                >
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <div className="flex items-center gap-2">
                    <span className={`menu-item-text whitespace-nowrap`}>{nav.name}</span>
                    {nav.badge && (
                      <Badge
                        variant="light"
                        color={nav.badge.color || "primary"}
                        size="sm"
                      >
                        {nav.badge.text}
                      </Badge>
                    )}
                  </div>
                )}
              </Link>
            )
          )}
          {nav.subItems &&
            nav.subItems.length > 0 &&
            (
              <div
                ref={(el) => {
                  const key = `${menuType}-${index}`;
                  if (subMenuRefs.current[key] !== el) {
                    subMenuRefs.current[key] = el;
                  }
                }}
                id={`submenu-${menuType}-${index}`}
                role="region"
                aria-label={`${nav.name} submenu`}
                className={`overflow-hidden transition-all duration-300 ease-in-out ${openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? "max-h-100 opacity-100"
                  : "max-h-0 opacity-0"
                  }`}
              >
                <ul className="mt-3 space-y-1 ml-8 pl-4 border-l-2 border-gray-200/50 dark:border-gray-700/50">
                  {nav.subItems.map((subItem, subIndex) => (
                    <li key={`${menuType}-${nav.name}-${index}-${subItem.name}-${subIndex}`}>
                      <Link
                        href={subItem.path}
                        className={`menu-dropdown-item ${isActive(subItem.path)
                          ? "menu-dropdown-item-active"
                          : "menu-dropdown-item-inactive"
                          }`}
                        aria-current={isActive(subItem.path) ? "page" : undefined}
                        onClick={e => {
                          e.stopPropagation(); // Prevent parent button from toggling
                          // Keep submenu open when clicking on a child item
                        }}
                        onMouseEnter={() => prefetchPath(subItem.path)}
                        prefetch
                      >
                        {subItem.name}
                        <span className="flex items-center gap-1 ml-auto">
                          {subItem.new && (
                            <span
                              className={`ml-auto ${isActive(subItem.path)
                                ? "menu-dropdown-badge-active"
                                : "menu-dropdown-badge-inactive"
                                } menu-dropdown-badge `}
                            >
                              new
                            </span>
                          )}
                          {subItem.pro && (
                            <span
                              className={`ml-auto ${isActive(subItem.path)
                                ? "menu-dropdown-badge-active"
                                : "menu-dropdown-badge-inactive"
                                } menu-dropdown-badge `}
                            >
                              pro
                            </span>
                          )}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
        </li>
      ))}
    </ul>
  );

  // Show loading state - CRITICAL: Also check routesInitialized and routesLoading
  if (isLoading || !routesInitialized || routesLoading) {
    return (
      <aside className="fixed mt-16 flex flex-col lg:mt-0 top-0 px-6 left-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl dark:border-gray-800/50 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200/50 shadow-xl w-[90px] lg:translate-x-0">
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-blue-600 dark:border-gray-700 dark:border-t-blue-400"></div>
          {(isExpanded || isHovered || isMobileOpen) && (
            <div className="text-center px-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Loading your role-based routes...
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Please wait
              </p>
            </div>
          )}
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-6 left-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl dark:border-gray-800/50 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200/50 shadow-xl
        ${isExpanded || isMobileOpen
          ? "w-[290px]"
          : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocusCapture={() => {
        // Prefetch visible first-level links on focus for keyboard users
        filteredNavItems.forEach(item => {
          if (item.path) prefetchPath(item.path);
          item.subItems?.forEach(si => prefetchPath(si.path));
        });
      }}
    >
      <div
        className={`py-8 flex ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"}`}
      >
        <Link href="/" className="group">
          {(isExpanded || isHovered || isMobileOpen) ? (
            <div className="flex flex-row items-center gap-4 p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all duration-200">
              <div className="relative">
                <Image
                  className="dark:hidden rounded-xl shadow-sm group-hover:scale-105 transition-transform duration-200"
                  src={"/images/logo/M-LOGO_1.png"}
                  alt="Logo"
                  width={40}
                  height={40}
                />
                <Image
                  className="hidden dark:block rounded-xl shadow-sm group-hover:scale-105 transition-transform duration-200"
                  src={"/images/logo/M-LOGO_1.png"}
                  alt="Logo"
                  width={40}
                  height={40}
                />
              </div>
              <span className="text-xl font-bold text-blue-600 dark:text-blue-400">Mobiloitte</span>
            </div>
          ) : (
            <div className="p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all duration-200 group">
              <Image
                src={"/images/logo/M-LOGO_1.png"}
                alt="Logo"
                width={35}
                height={35}
                className="rounded-lg group-hover:scale-105 transition-transform duration-200"
              />
            </div>
          )}
        </Link>
      </div>
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto duration-300 ease-linear no-scrollbar">
          <nav className="mb-6">
            <div className="flex flex-col gap-4">
              <div>
                {renderMenuItems(filteredNavItems, "main")}
              </div>
            </div>
          </nav>
        </div>

        {/* User Profile Section */}
        {(isExpanded || isHovered || isMobileOpen) && user && (
          <div className="p-4 border-t border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/30 backdrop-blur-sm">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/80 dark:bg-gray-800/80 shadow-sm border border-gray-200/50 dark:border-gray-700/50">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                  {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {user.full_name || user.email?.split('@')[0] || 'User'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user.email || 'user@example.com'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default AppSidebar;