"use client"

import type React from "react"
import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import Swal from 'sweetalert2'
import Alert from "@/components/ui/alert/Alert"
import {
  Users, Plus, Edit, Trash2, Search, RefreshCw, Eye, EyeOff, Settings, ChevronDown, Filter, Mail, Shield, Clock, Activity, Crown, Briefcase, Headphones, Monitor, Code, XCircle, UserX, HelpCircle, CheckCircle, Info, Wifi, WifiOff, Key, UserPlus, Route, Globe, Link, MapPin, Minus, Hash, FileText, Copy
} from "lucide-react"
import { getAuthHeaders } from '@/utils/api';
import DashboardHeader from '@/components/header/DashboardHeader';

// Simple Tooltip component
const Tooltip: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => {
  return (
    <div className="group relative inline-block">
      {children}
      <div className="invisible group-hover:visible absolute z-[60] w-80 max-w-sm p-3 text-xs leading-relaxed text-white bg-gray-900 rounded-lg shadow-xl -top-2 right-0 transform -translate-y-full">
        {text}
        <div className="absolute top-full right-4 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45 -translate-y-1"></div>
      </div>
    </div>
  );
};

// Helper: generate an icon component that renders the role's first letter----
const makeLetterIcon = (letter: string) => {
 const Icon: React.FC<{ className?: string }> = ({ className }) => (
   <span
     className={`inline-flex items-center justify-center rounded-full font-bold leading-none ${className || ''}`}
     aria-hidden="true"
   >
     {letter}
   </span>
 );
 Icon.displayName = `LetterIcon_${letter}`;
 return Icon;
};

// A–Z letter-to-icon mapping (uses available Lucide icons). If a letter isn't mapped, code will fall back to letter icon.
const letterIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
 A: Activity,
 B: Briefcase,
 C: Code, // or Crown
 D: Code,
 E: Eye,
 F: Filter,
 G: HelpCircle,
 H: Headphones,
 I: Info,
 J: Users,
 K: Settings,
 L: Mail,
 M: Monitor,
 N: Wifi,
 O: XCircle,
 P: Plus,
 Q: HelpCircle,
 R: RefreshCw,
 S: Shield,
 T: Trash2,
 U: Users,
 V: WifiOff,
 W: Wifi,
 X: XCircle,
 Y: EyeOff,
 Z: Settings,
};

// Types
interface User {
 id: string
 fullName: string
 email: string
 mobile: string
 loginFlag: string
 status: string
 lastLogin?: string | null
 createdAt: string
 roleIds: string[]
 sessionStatus: string
 userRoles?: string
 onlineStatus?: 'online' | 'offline' | 'away'
 emp_id?: string
}

interface Role {
 id: string
 name: string
 description: string
 permissions: string[]
 user_count: number
}

interface Permission {
 id: string
 name: string
 description: string
}

interface FrontendRoute {
 id: string
 route_name: string
 path: string
 description: string
 created_at: string
 updated_at: string
}

interface RoleRouteMapping {
 id: string
 role_name: string
 route_path: string
 created_at: string
 updated_at: string
}

// Modal Component---
const Modal = ({
 isOpen,
 onClose,
 title,
 children,
}: {
 isOpen: boolean
 onClose: () => void
 title: string
 children: React.ReactNode

}) => {
 if (!isOpen) return null
 return (
   <div className="fixed inset-0 z-[100000] flex items-center justify-center">
     {/* Responsive blur overlay: full-screen on phones; exclude left sidebar on tablet/desktop */}
     <div className="absolute inset-0">
       {/* Phone: full-page blur */}
       <div className="sm:hidden absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-[1px]" onClick={onClose} />
       {/* Tablet/Desktop: blur only main content area; keep left sidebar, header, footer clear */}
       <div className="hidden sm:block absolute inset-0 backdrop-blur-[1px] bg-black/30 dark:bg-black/50" onClick={onClose} />
     </div>
     <div
       className="z-10 bg-white dark:bg-gray-800 p-3 sm:p-6 md:p-8 rounded-xl shadow-2xl w-[83vw] sm:w-full max-w-[344px] sm:max-w-md md:max-w-lg mx-2 sm:mx-4 relative border-2 border-blue-200 dark:border-blue-600 transform transition-all duration-300 scale-100 ring-4 ring-blue-50 dark:ring-blue-900/20 max-h-[92vh] sm:max-h-[85vh] overflow-y-auto overscroll-contain"
       role="dialog"
       aria-modal="true"
       aria-labelledby="modal-title"
       onClick={e => e.stopPropagation()}
     >
       <h3 id="modal-title" className="text-base sm:text-xl leading-6 font-bold text-gray-900 dark:text-white mb-2 sm:mb-4 text-center border-b-2 border-blue-200 dark:border-blue-600 pb-2">{title}</h3>
       {children}
       <button
         onClick={onClose}
         aria-label="Close"
         className="absolute top-2 right-2 sm:top-3 sm:right-3 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 p-2 sm:p-2 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 border border-gray-200 dark:border-gray-600 hover:border-blue-200 dark:hover:border-blue-600 min-h-[40px] min-w-[40px] flex items-center justify-center"
       >
         <svg className="text-gray-500 w-4 h-4 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
           <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
         </svg>
       </button>
     </div>
   </div>
 )
}

 

// Pagination Component
const Pagination = ({
 currentPage,
 totalPages,
 onPageChange,
 onNext,
 onPrevious,
 onPageSizeChange,
 pageSize,
 totalItems,
 startIndex,
 endIndex,
}: {
 currentPage: number;
 totalPages: number;
 onPageChange: (page: number) => void;
 onNext: () => void;
 onPrevious: () => void;
 onPageSizeChange: (size: number) => void;
 pageSize: number;
 totalItems: number;
 startIndex: number;
 endIndex: number;
}) => {
 const pageNumbers = [];
 const maxVisiblePages = 5;

 let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
 const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

 if (endPage - startPage + 1 < maxVisiblePages) {
   startPage = Math.max(1, endPage - maxVisiblePages + 1);
 }

 for (let i = startPage; i <= endPage; i++) {
   pageNumbers.push(i);
 }

 return (
   <div className="flex flex-col gap-4 px-3 sm:px-4 lg:px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
     <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
       <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
         <div className="flex items-center gap-2">
           <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">Show</span>
           <select
             value={pageSize}
             onChange={(e) => onPageSizeChange(Number(e.target.value))}
             className="px-2 py-1 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white relative z-10 min-h-[32px]"
             style={{ zIndex: 10 }}
           >
             <option value={5}>5</option>
             <option value={10}>10</option>
             <option value={20}>20</option>
             <option value={50}>50</option>
           </select>
           <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">per page</span>
         </div>
         <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
           Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} results
         </div>
       </div>
     </div>

     <div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-center sm:justify-end">
       <button
         onClick={onPrevious}
         disabled={currentPage === 1}
         className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 min-h-[32px] transition-colors"
       >
         <span className="hidden sm:inline">Previous</span>
         <span className="sm:hidden">Prev</span>
       </button>

       {startPage > 1 && (
         <>
           <button
             onClick={() => onPageChange(1)}
             className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 min-h-[32px] transition-colors"
           >
             1
           </button>
           {startPage > 2 && (
             <span className="px-2 text-gray-500 dark:text-gray-400">...</span>
           )}
         </>
       )}

       {pageNumbers.map((page) => (
         <button
           key={page}
           onClick={() => onPageChange(page)}
           className={`px-2 sm:px-3 py-1.5 text-xs sm:text-sm border rounded-md min-h-[32px] transition-colors ${currentPage === page
               ? 'bg-blue-600 text-white border-blue-600'
               : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'
             }`}
         >
           {page}
         </button>
       ))}

       {endPage < totalPages && (
         <>
           {endPage < totalPages - 1 && (
             <span className="px-2 text-gray-500 dark:text-gray-400">...</span>
           )}
           <button
             onClick={() => onPageChange(totalPages)}
             className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 min-h-[32px] transition-colors"
           >
             {totalPages}
           </button>
         </>
       )}

       <button
         onClick={onNext}
         disabled={currentPage === totalPages}
         className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 min-h-[32px] transition-colors"
       >
         <span className="hidden sm:inline">Next</span>
         <span className="sm:hidden">Next</span>
       </button>
     </div>
   </div>
 );
};

export default function UserManagement() {
 // Always use Next.js rewrite (/api/v1) on the client to avoid CORS; next.config.ts rewrites to backend
 // State
 const [users, setUsers] = useState<User[]>([])
 const [availableRoles, setAvailableRoles] = useState<Role[]>([])
 const [permissions, setPermissions] = useState<Permission[]>([])
 const [frontendRoutes, setFrontendRoutes] = useState<FrontendRoute[]>([])
 const [roleRouteMappings, setRoleRouteMappings] = useState<RoleRouteMapping[]>([])

 // Group roles by category based on role names
 const groupRolesByCategory = useMemo(() => {
   const categories: { [key: string]: { roles: Role[]; icon: React.ComponentType<{ className?: string }>; color: string; bgColor: string; textColor: string } } = {};
   
   availableRoles.forEach(role => {
     const normalized = role.name.toLowerCase();
     let category = 'Other Roles';
     let icon: React.ComponentType<{ className?: string }> = Shield;
     let color = 'gray';
     let bgColor = 'bg-gray-100 dark:bg-gray-900/30';
     let textColor = 'text-gray-600 dark:text-gray-400';
     
     // Determine category based on role name patterns
     if (/(super\s*admin|admin\s*super)/i.test(normalized)) {
       category = 'Admin Roles';
       icon = Crown;
       color = 'purple';
       bgColor = 'bg-purple-100 dark:bg-purple-900/30';
       textColor = 'text-purple-600 dark:text-purple-400';
     } else if (/\b(admin|administrator)\b/i.test(normalized)) {
       category = 'Admin Roles';
       icon = Shield;
       color = 'purple';
       bgColor = 'bg-purple-100 dark:bg-purple-900/30';
       textColor = 'text-purple-600 dark:text-purple-400';
     } else if (/\b(hr|human\s*resource)\b/i.test(normalized)) {
       category = 'HR Roles';
       icon = Users;
       color = 'blue';
       bgColor = 'bg-blue-100 dark:bg-blue-900/30';
       textColor = 'text-blue-600 dark:text-blue-400';
     } else if (/(customer[_\s-]*support|support|customer\s*care)/i.test(normalized)) {
       category = 'Support Roles';
       icon = Headphones;
       color = 'orange';
       bgColor = 'bg-orange-100 dark:bg-orange-900/30';
       textColor = 'text-orange-600 dark:text-orange-400';
     } else if (/\b(it|tech|developer|engineering|engineer|software)\b/i.test(normalized)) {
       category = 'Tech Roles';
       icon = Monitor;
       color = 'indigo';
       bgColor = 'bg-indigo-100 dark:bg-indigo-900/30';
       textColor = 'text-indigo-600 dark:text-indigo-400';
     } else if (/\bsales?\b/i.test(normalized)) {
       category = 'Sales Roles';
       icon = Briefcase;
       color = 'green';
       bgColor = 'bg-green-100 dark:bg-green-900/30';
       textColor = 'text-green-600 dark:text-green-400';
     } else if (/(moderator|\bmod\b)/i.test(normalized)) {
       category = 'Moderation Roles';
       icon = Shield;
       color = 'yellow';
       bgColor = 'bg-yellow-100 dark:bg-yellow-900/30';
       textColor = 'text-yellow-600 dark:text-yellow-400';
     } else {
       // Group other roles
       category = 'Other Roles';
       icon = Shield;
       color = 'gray';
       bgColor = 'bg-gray-100 dark:bg-gray-900/30';
       textColor = 'text-gray-600 dark:text-gray-400';
     }
     
     if (!categories[category]) {
       categories[category] = {
         roles: [],
         icon,
         color,
         bgColor,
         textColor
       };
     }
     
     categories[category].roles.push(role);
   });
   
   return categories;
 }, [availableRoles])
 // Assign Permission modal state
 const [showAssignPermModal, setShowAssignPermModal] = useState(false)
 const [assignPermId, setAssignPermId] = useState<string | null>(null)
 const [assignPermRoles, setAssignPermRoles] = useState<string[]>([])
 const [search, setSearch] = useState("")
 const [routeSearch, setRouteSearch] = useState("")
 const [roleFilter, setRoleFilter] = useState("all")
 const [lastActivityFilter, setLastActivityFilter] = useState("all")
 const [onlineStatusFilter, setOnlineStatusFilter] = useState("all")
 const [activeTab, setActiveTab] = useState("users")
 const [showFilters, setShowFilters] = useState(false)
 const [showRouteFilters, setShowRouteFilters] = useState(false)
 const [routePathFilter, setRoutePathFilter] = useState("all")
 // Bulk actions confirmation
 const [bulkConfirmAction, setBulkConfirmAction] = useState<null | 'delete' | 'activate' | 'deactivate'>(null)

 // Enhanced UI state
 const [selectedUsers, setSelectedUsers] = useState<string[]>([])
 const [isLoadingAction, setIsLoadingAction] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
 const [showAlert, setShowAlert] = useState(false)
 const [alertMessage, setAlertMessage] = useState("")
 const [alertVariant, setAlertVariant] = useState<'success' | 'error' | 'warning' | 'info'>("success")
 const [alertTitle, setAlertTitle] = useState<string | undefined>(undefined)
 const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)
 const [isDeletingUser, setIsDeletingUser] = useState(false)

 // Modal states
 const [showCreateModal, setShowCreateModal] = useState(false)
 const [showEditModal, setShowEditModal] = useState(false)
 const [showRoleModal, setShowRoleModal] = useState(false)
 const [selectedUser, setSelectedUser] = useState<User | null>(null)
 // const [selectedRole, setSelectedRole] = useState<Role | null>(null) // unused, commented for production
 const [showPassword, setShowPassword] = useState(false)
 
 // Role-Route Management Modal states
 const [showAddRoutesModal, setShowAddRoutesModal] = useState(false)
 const [showRemoveRoutesModal, setShowRemoveRoutesModal] = useState(false)
 const [selectedRoleForRoutes, setSelectedRoleForRoutes] = useState<Role | null>(null)
 const [selectedRoutesToAdd, setSelectedRoutesToAdd] = useState<string[]>([])
 const [selectedRoutesToRemove, setSelectedRoutesToRemove] = useState<string[]>([])

 // Form states
const [createForm, setCreateForm] = useState({
  fullName: "",
  email: "",
  mobile: "",
  password: "",
  loginFlag: "employee",
  emp_id: "",
  roleIds: [] as string[],
})
const [editForm, setEditForm] = useState({
  fullName: "",
  email: "",
  mobile: "",
  loginFlag: "employee",
  emp_id: "",
  roleIds: [] as string[],
})
 const [roleForm, setRoleForm] = useState({
   name: "",
   description: "",
   permissions: [] as string[],
   route_paths: [] as string[]
 })

 // Modal states for roles/permissions
 const [showEditRoleModal, setShowEditRoleModal] = useState(false)
 const [editRoleId, setEditRoleId] = useState<string | null>(null)
 const [showPermModal, setShowPermModal] = useState(false)
 const [showEditPermModal, setShowEditPermModal] = useState(false)
 const [permForm, setPermForm] = useState({ name: '', description: '' })
 const [editPermId, setEditPermId] = useState<string | null>(null)
 
 // Modal states for routes management
 const [showCreateRouteModal, setShowCreateRouteModal] = useState(false)
 const [showEditRouteModal, setShowEditRouteModal] = useState(false)
  const [showRouteMappingModal, setShowRouteMappingModal] = useState(false)
  const [showViewMappingsModal, setShowViewMappingsModal] = useState(false)
 const [editRouteId, setEditRouteId] = useState<string | null>(null)
const [routeForm, setRouteForm] = useState({
  route_name: '',
  path: '',
  description: ''
})
const [routeMappingForm, setRouteMappingForm] = useState({
  role_name: '',
  route_path: ''
})
 // Delete confirmations
 const [roleDeleteConfirm, setRoleDeleteConfirm] = useState<{ id: string; name: string; user_count: number } | null>(null)
 const [routeDeleteConfirm, setRouteDeleteConfirm] = useState<{ id: string; route_name: string; path: string } | null>(null)
 const [showRouteDetailsModal, setShowRouteDetailsModal] = useState(false)
 const [selectedRouteDetails, setSelectedRouteDetails] = useState<FrontendRoute | null>(null)
 // For assigning permissions to role
 const [selectedPerms, setSelectedPerms] = useState<string[]>([])
 const [permDeleteConfirm, setPermDeleteConfirm] = useState<{ id: string; name: string } | null>(null)
 // For assigning roles to user
 const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([])

 // Prevent background scrolling when modals are open
 useEffect(() => {
   if (showCreateModal || showEditModal || showRoleModal || showEditRoleModal || showPermModal || showEditPermModal || showCreateRouteModal || showEditRouteModal || showRouteMappingModal || showAddRoutesModal || showRemoveRoutesModal) {
     document.body.style.overflow = 'hidden'
   } else {
     document.body.style.overflow = 'unset'
   }

   // Cleanup function to ensure overflow is restored when component unmounts
   return () => {
     document.body.style.overflow = 'unset'
   }
 }, [showCreateModal, showEditModal, showRoleModal, showEditRoleModal, showPermModal, showEditPermModal, showCreateRouteModal, showEditRouteModal, showRouteMappingModal, showAddRoutesModal, showRemoveRoutesModal])

// Convert technical permission names to user-friendly display names
const getPermissionDisplayName = (permissionName: string): string => {
  const permissionMap: { [key: string]: string } = {
    'system:admin': 'System Administration',
    'user:create': 'Create Users',
    'user:read': 'View Users',
    'user:update': 'Edit Users',
    'user:delete': 'Delete Users',
    'role:create': 'Create Roles',
    'role:read': 'View Roles',
    'role:update': 'Edit Roles',
    'role:delete': 'Delete Roles',
    'permission:create': 'Create Permissions',
    'permission:read': 'View Permissions',
    'permission:update': 'Edit Permissions',
    'permission:delete': 'Delete Permissions',
    'dashboard:read': 'View Dashboard',
    'settings:read': 'View Settings',
    'settings:update': 'Edit Settings',
    'reports:read': 'View Reports',
    'reports:create': 'Create Reports',
    'files:upload': 'Upload Files',
    'files:download': 'Download Files',
    'files:delete': 'Delete Files',
    'logs:read': 'View Logs',
    'backup:create': 'Create Backups',
    'backup:restore': 'Restore Backups',
  };

  // If we have a mapping, use it
  if (permissionMap[permissionName]) {
    return permissionMap[permissionName];
  }

  // Otherwise, convert the format to a readable name
  const [resource, action] = permissionName.split(':');
  if (resource && action) {
    const resourceName = resource.charAt(0).toUpperCase() + resource.slice(1);
    const actionName = action.charAt(0).toUpperCase() + action.slice(1);
    return `${actionName} ${resourceName}`;
  }

  // Fallback to the original name with proper capitalization
  return permissionName.charAt(0).toUpperCase() + permissionName.slice(1).replace(/:/g, ' ');
};

// Dynamic role configuration based on role names (case-insensitive, keyword-driven)
const getRoleConfig = (roleName: string) => {
   const displayName = roleName || 'Role';
   const name = String(displayName);
   const normalized = name.toLowerCase();

   // Deterministic color palette fallback so unknown roles still look good
  const palette = [
    { color: 'bg-blue-100 text-blue-800', borderColor: 'border-blue-200' },
    { color: 'bg-blue-200 text-blue-900', borderColor: 'border-blue-300' },
    { color: 'bg-blue-300 text-blue-900', borderColor: 'border-blue-400' },
    { color: 'bg-blue-400 text-blue-50', borderColor: 'border-blue-500' },
    { color: 'bg-blue-500 text-blue-50', borderColor: 'border-blue-600' },
    { color: 'bg-blue-600 text-blue-50', borderColor: 'border-blue-700' },
    { color: 'bg-blue-700 text-blue-50', borderColor: 'border-blue-800' },
  ];
   const hash = Array.from(normalized).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
   const fallbackColors = palette[hash % palette.length];

   // Keyword-based matching (order matters)
   type Cfg = { name: string; icon: React.ComponentType<{ className?: string }>; color?: string; borderColor?: string };
  const rules: Array<{ test: (s: string) => boolean; cfg: Cfg }> = [
    { test: s => /(super\s*admin|admin\s*super)/i.test(s), cfg: { name, icon: Crown, color: 'bg-blue-700 text-blue-50', borderColor: 'border-blue-800' } },
    { test: s => /\b(admin|administrator)\b/i.test(s), cfg: { name, icon: Shield, color: 'bg-blue-600 text-blue-50', borderColor: 'border-blue-700' } },
    { test: s => /\b(hr|human\s*resource)\b/i.test(s), cfg: { name, icon: Users, color: 'bg-blue-100 text-blue-800', borderColor: 'border-blue-200' } },
    { test: s => /\bsales?\b/i.test(s), cfg: { name, icon: Briefcase, color: 'bg-blue-200 text-blue-900', borderColor: 'border-blue-300' } },
    { test: s => /(customer[_\s-]*support|support|customer\s*care)/i.test(s), cfg: { name, icon: Headphones, color: 'bg-blue-300 text-blue-900', borderColor: 'border-blue-400' } },
    { test: s => /\bit\b/i.test(s), cfg: { name, icon: Monitor, color: 'bg-blue-400 text-blue-50', borderColor: 'border-blue-500' } },
    { test: s => /(moderator|\bmod\b)/i.test(s), cfg: { name, icon: Shield, color: 'bg-blue-500 text-blue-50', borderColor: 'border-blue-600' } },
    { test: s => /(developer|dev|engineering|engineer|software)/i.test(s), cfg: { name, icon: Code, color: 'bg-blue-600 text-blue-50', borderColor: 'border-blue-700' } },
  ];

   const match = rules.find(r => r.test(normalized))?.cfg;
   if (match) {
     return { name, icon: match.icon, color: match.color || fallbackColors.color, borderColor: match.borderColor || fallbackColors.borderColor };
   }

   // A–Z fallback: pick first alphabetic letter and map to a predefined icon and per-letter color
   const firstAlpha = (name.match(/[A-Za-z]/)?.[0] || '?').toUpperCase();
   const letterIndex = firstAlpha >= 'A' && firstAlpha <= 'Z' ? firstAlpha.charCodeAt(0) - 65 : hash % 26;
  const perLetterColors = [
    { color: 'bg-blue-100 text-blue-800', borderColor: 'border-blue-200' },
    { color: 'bg-blue-200 text-blue-900', borderColor: 'border-blue-300' },
    { color: 'bg-blue-300 text-blue-900', borderColor: 'border-blue-400' },
    { color: 'bg-blue-400 text-blue-50', borderColor: 'border-blue-500' },
    { color: 'bg-blue-500 text-blue-50', borderColor: 'border-blue-600' },
    { color: 'bg-blue-600 text-blue-50', borderColor: 'border-blue-700' },
    { color: 'bg-blue-700 text-blue-50', borderColor: 'border-blue-800' },
  ];
   const chosen = perLetterColors[letterIndex % perLetterColors.length];
   const MappedIcon = letterIconMap[firstAlpha] || makeLetterIcon(firstAlpha);
   return { name, icon: MappedIcon, color: chosen.color, borderColor: chosen.borderColor };
 };

 // const [userSessions, setUserSessions] = useState<{ [userId: string]: string }>({});

 // Real-time status tracking
 const [realTimeStatus, setRealTimeStatus] = useState<{ [userId: string]: 'online' | 'offline' | 'away' }>({});
 const [statusPollingInterval, setStatusPollingInterval] = useState<NodeJS.Timeout | null>(null);
 const [isStatusPolling, setIsStatusPolling] = useState(false);
 const [currentUserId, setCurrentUserId] = useState<string | null>(null);
 // Cache last-seen time when a user transitions from online to offline
 const [lastSeenAt, setLastSeenAt] = useState<{ [userId: string]: string }>({});
 // Me activity and recent activity
 // const [myActivity, setMyActivity] = useState<{ status: 'online' | 'away' | 'offline' | 'unknown'; lastLogin?: string | null; lastLogout?: string | null }>({ status: 'unknown' });
 // const [recentActivity, setRecentActivity] = useState<any[]>([]);
 // Add validation state
const [createFormErrors, setCreateFormErrors] = useState({
  fullName: '',
  email: '',
  mobile: '',
  password: '',
  roleIds: '',
  loginFlag: '',
  emp_id: '',
});
const [editFormErrors, setEditFormErrors] = useState({
  fullName: '',
  email: '',
  mobile: '',
  roleIds: '',
  loginFlag: '',
  emp_id: '',
});

// Track which fields the user has interacted with
const [touchedFields, setTouchedFields] = useState({
  fullName: false,
  email: false,
  mobile: false,
  password: false,
  roleIds: false,
  loginFlag: false,
  emp_id: false,
});

 // Loader states

 // Pagination state
 const [currentPage, setCurrentPage] = useState(1);
 const [pageSize, setPageSize] = useState(10);
 const [totalUsers, setTotalUsers] = useState(0);

 // Alert helper functions (using in-app Alert component instead of SweetAlert toasts)
 const showSuccessAlert = (message: string, title: string = 'Success!') => {
   setAlertVariant('success');
   setAlertMessage(message);
   setAlertTitle(title);
   setShowAlert(true);
   setTimeout(() => setShowAlert(false), 3000);
 };

 const showErrorAlert = (message: string, title: string = 'Error!') => {
   setAlertVariant('error');
   setAlertMessage(message);
   setAlertTitle(title);
   setShowAlert(true);
   setTimeout(() => setShowAlert(false), 3000);
 };

 // eslint-disable-next-line @typescript-eslint/no-unused-vars
 const showConfirmDialog = async (title: string, text: string): Promise<boolean> => {
   const result = await Swal.fire({
     title: title,
     text: text,
     icon: 'warning',
     showCancelButton: true,
     confirmButtonColor: '#d33',
     cancelButtonColor: '#3085d6',
     confirmButtonText: 'Yes, delete it!',
     cancelButtonText: 'Cancel'
   });
   return result.isConfirmed;
 };

 const showInfoAlert = (message: string, title: string = 'Info') => {
   setAlertVariant('info');
   setAlertMessage(message);
   setAlertTitle(title);
   setShowAlert(true);
   setTimeout(() => setShowAlert(false), 3000);
 };

 const formatLastActivity = (lastLogin: string | null) => {
   if (!lastLogin) return { text: 'Never', color: 'text-gray-400', icon: XCircle };

   const now = new Date();
   // Robust local parsing to avoid timezone-based day shifts
   const parseToLocalDate = (input: string) => {
     const direct = new Date(input);
     if (!isNaN(direct.getTime())) return direct;
     const m = input.match(/^(\d{4})[-\/](\d{2})[-\/](\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
     if (m) {
       const [, y, mo, d, h, mi, s] = m;
       return new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), s ? Number(s) : 0);
     }
     return new Date(input);
   };
   const loginTime = parseToLocalDate(lastLogin);
   const isSameDay = now.toDateString() === loginTime.toDateString();
   const yesterday = new Date(now);
   yesterday.setDate(now.getDate() - 1);
   const isYesterday = yesterday.toDateString() === loginTime.toDateString();

   // 12-hour time with AM/PM and fixed dd/MM/yyyy date format
   let timeStr = loginTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
   // Normalize am/pm to lowercase across locales
   timeStr = timeStr.replace(/\s*([ap])\.?(m)\.?/i, (m, a, b) => ` ${a.toLowerCase()}${b.toLowerCase()}`);
   const dd = String(loginTime.getDate()).padStart(2, '0');
   const mm = String(loginTime.getMonth() + 1).padStart(2, '0');
   const yyyy = loginTime.getFullYear();
   const dateStr = `${dd}/${mm}/${yyyy}`;
   const diffMs = now.getTime() - loginTime.getTime();
   const diffDays = Math.floor(diffMs / 86400000);

  if (isSameDay) return { text: `Today at ${timeStr}`, color: 'text-blue-600', icon: Activity };
  if (isYesterday) return { text: `Yesterday at ${timeStr}`, color: 'text-blue-500', icon: Clock };
  if (diffDays < 7) return { text: `${diffDays}d ago`, color: 'text-blue-500', icon: Clock };

   return {
     text: `${dateStr} ${timeStr}`,
     color: 'text-gray-600',
     icon: Clock
   };
 };

 // Get real-time status display info
 const getRealTimeStatusDisplay = (userId: string) => {
   const status = realTimeStatus[userId];

   switch (status) {
    case 'online':
      return {
        text: 'Online',
        color: 'text-blue-600',
        bgColor: 'bg-blue-100 dark:bg-blue-900/30',
        borderColor: 'border-blue-200 dark:border-blue-700',
        icon: Wifi,
        dotColor: 'bg-blue-500',
        pulse: true
      };
    case 'away':
      return {
        text: 'Away',
        color: 'text-blue-500',
        bgColor: 'bg-blue-100 dark:bg-blue-900/30',
        borderColor: 'border-blue-200 dark:border-blue-700',
        icon: Clock,
        dotColor: 'bg-blue-500',
        pulse: false
      };
     case 'offline':
     default:
       return {
         text: 'Offline',
         color: 'text-gray-600',
         bgColor: 'bg-gray-100 dark:bg-gray-700',
         borderColor: 'border-gray-200 dark:border-gray-600',
         icon: WifiOff,
         dotColor: 'bg-gray-500',
         pulse: false
       };
   }
 };

 const handleBulkAction = async (action: 'delete' | 'activate' | 'deactivate') => {
   if (selectedUsers.length === 0) return;

   // derive text if needed later; keep minimal to avoid unused var

   // Open confirmation modal instead of executing immediately
   setBulkConfirmAction(action);
 };

 // Fetch users from API
 const fetchUsers = useCallback(async () => {
   try {
     const res = await fetch(`/api/v1/users?online_only=false&include_offline=true`)
     if (!res.ok) throw new Error()
     const data = await res.json()
     setUsers(
       data.map((user: Record<string, unknown>) => {
         // Derive last activity from multiple possible fields
         const lastLogin = user.lastLogin || user.last_activity || user.last_login || user.lastActiveAt || user.last_activity_at || null;
         const userRolesString: string | undefined =
           (typeof (user as Record<string, unknown>).userRoles === 'string'
             ? ((user as Record<string, unknown>).userRoles as string)
             : typeof (user as Record<string, unknown>).roles === 'string'
               ? ((user as Record<string, unknown>).roles as string)
               : undefined);
         const derivedRoleIds = availableRoles
           .filter((role) => userRolesString && userRolesString.includes(role.name))
           .map((role) => role.id);

         // Normalize session status from several possible fields
         // Prefer explicit sessionStatus if provided
         let normalizedSession = 'inactive';
         const rawSession = (user as Record<string, unknown>).sessionStatus ?? (user as Record<string, unknown>).session_status;
         if (rawSession && typeof rawSession === 'string') {
           normalizedSession = rawSession.toLowerCase() === 'active' ? 'active' : 'inactive';
         } else {
           // Fallback to status/isActive/loginFlag variants
           const rawStatus = ((user as Record<string, unknown>).status !== undefined ? (user as Record<string, unknown>).status : (user as Record<string, unknown>).isActive) as unknown;
           if (typeof rawStatus === 'boolean') normalizedSession = rawStatus ? 'active' : 'inactive';
           else if (typeof rawStatus === 'string') normalizedSession = rawStatus.toLowerCase() === 'active' ? 'active' : 'inactive';
           else if (typeof (user as Record<string, unknown>).loginFlag === 'string') {
             const lf = String((user as Record<string, unknown>).loginFlag).toLowerCase();
             if (lf === 'y' || lf === 'active' || lf === '1' || lf === 'true') normalizedSession = 'active';
           }
         }

         return {
           ...user,
           email: user.email === 'string' ? '' : user.email,
           mobile: user.mobile === 'string' ? '' : user.mobile,
           lastLogin,
           roleIds: derivedRoleIds,
           sessionStatus: normalizedSession,
         } as User;
       })
     )
   } catch {
     showErrorAlert("Failed to fetch users");
   }
 }, [availableRoles])

 // Fetch roles and permissions from API
 const fetchRoles = useCallback(async () => {
   try {
     const res = await fetch(`/api/v1/roles`, {
       headers: getAuthHeaders(),
       credentials: 'include'
     });
     if (!res.ok) throw new Error();
     const data = await res.json();
     setAvailableRoles(
       data.map((role: Role) => {
         const r = role;
         return {
           id: r.id,
           name: (r as { role_name?: string }).role_name || r.name,
           description: r.description ?? '',
           permissions: r.permissions ?? [],
           user_count: r.user_count ?? 0,
         };
       })
     );
   } catch {
     showErrorAlert('Failed to fetch roles');
   }
 }, [])

 const fetchPermissions = useCallback(async () => {
   try {
     const res = await fetch(`/api/v1/permissions`, {
       headers: getAuthHeaders(),
       credentials: 'include'
     })
     if (!res.ok) throw new Error()
     const data = await res.json()
     setPermissions(data)
   } catch {
     showErrorAlert('Failed to fetch permissions');
   }
 }, [])

 // Fetch frontend routes from API
 const fetchFrontendRoutes = useCallback(async () => {
   try {
     const res = await fetch(`/api/v1/frontend-routes/routes`, {
       headers: getAuthHeaders(),
       credentials: 'include'
     })
     if (!res.ok) throw new Error()
     const data = await res.json()
     setFrontendRoutes(data.routes || [])
   } catch {
     showErrorAlert('Failed to fetch routes');
   }
 }, [])

 // Fetch role-route mappings from API
 const fetchRoleRouteMappings = useCallback(async () => {
   try {
     const res = await fetch(`/api/v1/frontend-routes/mappings`, {
       headers: getAuthHeaders(),
       credentials: 'include'
     })
     if (!res.ok) throw new Error()
     const data = await res.json()
     setRoleRouteMappings(data.mappings || [])
   } catch {
     showErrorAlert('Failed to fetch route mappings');
   }
 }, [])

// Derived helpers for Role/Permission validations
const existingRoleNames = useMemo(() => new Set(availableRoles.map(r => (r.name || '').toLowerCase())), [availableRoles]);
const existingPermissionNames = useMemo(() => new Set(permissions.map(p => (p.name || '').toLowerCase())), [permissions]);

// Check if Super Admin already exists in users
const hasSuperAdmin = useMemo(() => {
  const superAdminRole = availableRoles.find(role => 
    /super.*admin|admin.*super/i.test(role.name)
  );
  if (!superAdminRole) return false;
  
  return users.some(user => 
    user.roleIds && user.roleIds.includes(superAdminRole.id)
  );
}, [users, availableRoles]);

 // Enhanced role name validation
 const validateRoleName = useCallback((name: string) => {
   const trimmed = name.trim();
   if (!trimmed) return { isValid: false, message: 'Role name is required' };
   if (trimmed.length < 3) return { isValid: false, message: 'Role name must be at least 3 characters' };
   if (trimmed.length > 50) return { isValid: false, message: 'Role name must not exceed 50 characters' };
   if (!/^[A-Za-z0-9 _-]+$/.test(trimmed)) return { isValid: false, message: 'Role name can only contain letters, numbers, spaces, dashes, and underscores' };
   if (existingRoleNames.has(trimmed.toLowerCase())) return { isValid: false, message: 'Role name already exists' };
   return { isValid: true, message: 'Role name is valid' };
 }, [existingRoleNames]);

 // Enhanced description validation
 const validateRoleDescription = (description: string) => {
   const trimmed = description.trim();
   if (!trimmed) return { isValid: false, message: 'Description is required' };
   if (trimmed.length < 10) return { isValid: false, message: 'Description must be at least 10 characters' };
   if (trimmed.length > 200) return { isValid: false, message: 'Description must not exceed 200 characters' };
   // Check for HTML/script tags
   if (/<[^>]*>/g.test(trimmed)) return { isValid: false, message: 'Description cannot contain HTML or script tags' };
   return { isValid: true, message: 'Description is valid' };
 };

 // Enhanced permissions validation
 const validateRolePermissions = useCallback((permissionNames: string[]) => {
   if (!permissionNames || permissionNames.length === 0) return { isValid: false, message: 'At least one permission must be selected' };
   
   // Validate that each chosen permission exists in the backend list
   const invalidPermissions = permissionNames.filter(permName => 
     !permissions.some(perm => perm.name === permName)
   );
   
   if (invalidPermissions.length > 0) {
     return { isValid: false, message: `Invalid permissions: ${invalidPermissions.join(', ')}` };
   }
   
   return { isValid: true, message: 'Permissions are valid' };
 }, [permissions]);

 // Real-time validation states
 const [roleNameValidation, setRoleNameValidation] = useState({ isValid: false, message: '' });
 const [descriptionValidation, setDescriptionValidation] = useState({ isValid: false, message: '' });
 const [permissionsValidation, setPermissionsValidation] = useState({ isValid: false, message: '' });

 // Update validation states when form changes
useEffect(() => {
  setRoleNameValidation(validateRoleName(roleForm.name));
}, [roleForm.name, validateRoleName]);

 useEffect(() => {
   setDescriptionValidation(validateRoleDescription(roleForm.description));
 }, [roleForm.description]);

useEffect(() => {
  setPermissionsValidation(validateRolePermissions(roleForm.permissions));
}, [roleForm.permissions, validateRolePermissions]);

 // Form-level validation
 const isCreateRoleValid = roleNameValidation.isValid && descriptionValidation.isValid && permissionsValidation.isValid;

 // Check for system:admin special case
 const hasSystemAdmin = roleForm.permissions.includes('system:admin');
 const hasOtherPermissions = roleForm.permissions.some(perm => perm !== 'system:admin');
 const shouldWarnAboutSystemAdmin = hasSystemAdmin && hasOtherPermissions;

 const isValidPermissionName = useMemo(() => {
   const permissionNameRegex = /^[a-z]+:[a-z]+$/; // resource:action
   return permissionNameRegex.test(permForm.name.trim().toLowerCase()) && !existingPermissionNames.has(permForm.name.trim().toLowerCase());
 }, [permForm.name, existingPermissionNames]);
 const isValidPermissionDescription = useMemo(() => permForm.description.trim().length >= 10, [permForm.description]);
 const isCreatePermissionValid = isValidPermissionName && isValidPermissionDescription;

 // Real-time status polling function
 const fetchRealTimeStatus = useCallback(async () => {
   try {
     const res = await fetch(`/api/v1/users?online_only=false&include_offline=true`, {
       headers: getAuthHeaders(),
       credentials: 'include',
     });
     if (!res.ok) throw new Error('Failed to fetch user status');
     const data = await res.json();

     const newStatus: { [userId: string]: 'online' | 'offline' | 'away' } = {};
     data.forEach((user: Record<string, unknown>) => {
       const u = user as Record<string, unknown>;
       const raw = (u.presence as string | undefined) ?? (u.onlineStatus as string | undefined) ?? (u.status as string | undefined) ?? (u.session_status as string | undefined) ?? 'offline';
       let normalized: 'online' | 'offline' | 'away' = 'offline';
       if (typeof raw === 'string') {
         const s = raw.toLowerCase();
         normalized = s === 'online' ? 'online' : s === 'away' ? 'away' : 'offline';
       }
       const id = String(u.id ?? '');
       if (id) newStatus[id] = normalized;
     });

     setRealTimeStatus(newStatus);
   } catch (error) {
     console.error('Error fetching real-time status:', error);
   }
 }, []);

 // Fetch current user's activity presence
 const fetchMyActivity = useCallback(async () => {
   try {
     const res = await fetch(`/api/v1/me/activity`, {
       headers: getAuthHeaders(),
       credentials: 'include',
     });
     if (!res.ok) throw new Error('Failed to fetch my activity');
     const data = await res.json();
     const raw = (data?.status || '').toString().toLowerCase();
     const normalized: 'online' | 'away' | 'offline' = raw === 'online' ? 'online' : raw === 'away' ? 'away' : 'offline';
     // setMyActivity({ status: normalized, lastLogin: data?.lastLogin ?? null, lastLogout: data?.lastLogout ?? null });
     if (currentUserId) {
       setRealTimeStatus((prev) => ({ ...prev, [currentUserId]: normalized }));
     }
   } catch {
     // setMyActivity((prev: { status: 'online' | 'away' | 'offline' | 'unknown'; lastLogin?: string | null; lastLogout?: string | null }) => ({ ...prev, status: 'unknown' }));
   }
 }, [currentUserId]);

 // Fetch recent activity (disabled; state removed)

 // Start real-time status polling
 const startStatusPolling = useCallback(() => {
   if (statusPollingInterval) return;

   setIsStatusPolling(true);
   // Initial fetch
   fetchRealTimeStatus();

   // Set up polling every 30 seconds
   const interval = setInterval(() => {
     fetchRealTimeStatus();
   }, 30000);

   setStatusPollingInterval(interval);
 }, [statusPollingInterval, fetchRealTimeStatus]);

 // Stop real-time status polling
 const stopStatusPolling = useCallback(() => {
   if (statusPollingInterval) {
     clearInterval(statusPollingInterval);
     setStatusPollingInterval(null);
   }
   setIsStatusPolling(false);
 }, [statusPollingInterval]);

 // Fetch sessions disabled; userSessions state is commented out

 // Start/stop real-time polling based on component mount/unmount
 useEffect(() => {
   startStatusPolling();
   // also fetch my activity once on mount
   fetchMyActivity();

   return () => {
     stopStatusPolling();
   };
 }, [startStatusPolling, stopStatusPolling, fetchMyActivity]);

 // Listen for local logout events to update presence instantly
 useEffect(() => {
   const markUserOffline = (uid: string, iso?: string) => {
     if (!uid) return;
     const nowIso = iso || new Date().toISOString();
     setRealTimeStatus(prev => ({ ...prev, [uid]: 'offline' }));
     setLastSeenAt(prev => ({ ...prev, [uid]: nowIso }));
     // Trigger a fast refresh of statuses in background
     fetchRealTimeStatus();
   };

   const onCustomLogout = (e: Event) => {
     const uid = currentUserId || '';
     const iso = (e as CustomEvent)?.detail?.logoutIso as string | undefined;
     if (uid) markUserOffline(uid, iso);
   };

   const onStorage = (e: StorageEvent) => {
     if (e.key === 'presenceEvent' && e.newValue) {
       try {
         const payload = JSON.parse(e.newValue);
         if (payload?.type === 'logout' && payload?.userId) {
           markUserOffline(String(payload.userId), payload?.tsIso as string | undefined);
         }
       } catch { }
     }
   };

   window.addEventListener('userLoggedOut', onCustomLogout as EventListener);
   window.addEventListener('storage', onStorage);
   return () => {
     window.removeEventListener('userLoggedOut', onCustomLogout as EventListener);
     window.removeEventListener('storage', onStorage);
   };
 }, [currentUserId, fetchRealTimeStatus]);

 // Pause polling when page is not visible
 useEffect(() => {
   const handleVisibilityChange = () => {
     if (document.hidden) {
       stopStatusPolling();
     } else {
       startStatusPolling();
     }
   };

   document.addEventListener('visibilitychange', handleVisibilityChange);
   return () => {
     document.removeEventListener('visibilitychange', handleVisibilityChange);
   };
 }, [startStatusPolling, stopStatusPolling]);

 // Track online -> offline transitions to freeze last activity at logout time
 const prevStatusRef = useRef<{ [userId: string]: 'online' | 'offline' | 'away' | undefined }>({});
 useEffect(() => {
   const updates: { [userId: string]: string } = {};
   Object.keys(realTimeStatus).forEach((userId) => {
     const prev = prevStatusRef.current[userId];
     const curr = realTimeStatus[userId];
     if (prev === 'online' && curr === 'offline') {
       updates[userId] = new Date().toISOString();
     }
     prevStatusRef.current[userId] = curr;
   });
   if (Object.keys(updates).length > 0) {
     setLastSeenAt((m) => ({ ...m, ...updates }));
   }
 }, [realTimeStatus]);

 useEffect(() => {
   Promise.all([
     fetchUsers(),
     fetchRoles(),
     fetchPermissions(),
     fetchFrontendRoutes(),
     fetchRoleRouteMappings()
   ]);
   // eslint-disable-next-line
 }, []);

 // Determine current user ID from a JWT in cookies (claims: sub | userId | id)
 useEffect(() => {
   try {
     const getCookie = (name: string) => {
       const match = document.cookie.split('; ').find(c => c.startsWith(name + '='));
       return match ? decodeURIComponent(match.split('=')[1]) : null;
     };
     const candidateCookieNames = ['token', 'access_token', 'id_token', 'auth_token'];
     let jwt: string | null = null;
     for (const name of candidateCookieNames) {
       const v = getCookie(name);
       if (v) { jwt = v; break; }
     }
     if (!jwt) return;
     const parts = jwt.split('.');
     if (parts.length < 2) return;
     const payloadJson = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
     const payload = JSON.parse(payloadJson || '{}');
     const idCandidate = payload?.sub ?? payload?.userId ?? payload?.id;
     if (idCandidate !== undefined && idCandidate !== null) {
       setCurrentUserId(String(idCandidate));
     }
   } catch {
     // ignore parsing issues
   }
 }, []);

 // Note: removed API fallback; current user detection relies on JWT cookie only

useEffect(() => {
  if (availableRoles.length > 0) {
    fetchUsers();
  }
  // eslint-disable-next-line
}, [availableRoles])

// Remove Super Admin from selection if it becomes disabled
useEffect(() => {
  if (hasSuperAdmin && showCreateModal) {
    const superAdminRole = availableRoles.find(role => 
      /super.*admin|admin.*super/i.test(role.name)
    );
    if (superAdminRole && selectedRoleIds.includes(superAdminRole.id)) {
      setSelectedRoleIds(prev => prev.filter(id => id !== superAdminRole.id));
    }
  }
  // eslint-disable-next-line
}, [hasSuperAdmin, availableRoles, showCreateModal]);


 // const getRoleNameById = (id: number): string => {
 //   const role = availableRoles.find((r) => r.id === id)
 //   return role ? role.name : ""
 // }

 // Robust user filtering with null checks and debug logging
 const filteredUsers = users.filter((user) => {
   // Ensure roleIds is always an array
   const userRoleIds = Array.isArray(user.roleIds) ? user.roleIds : [];
   // Debug logging
   // Remove or comment out in production


   const matchesSearch =
     (user.fullName?.toLowerCase() || "").includes(search.toLowerCase()) ||
     (user.email?.toLowerCase() || "").includes(search.toLowerCase()) ||
     (user.mobile || "").includes(search);

 

   const matchesRole =
     roleFilter === "all" || userRoleIds.includes(roleFilter);

   // Online Status filter logic
   const matchesOnlineStatus =
     onlineStatusFilter === "all" || realTimeStatus[user.id] === onlineStatusFilter;

   // Last Activity filter logic
   let matchesLastActivity = true;
   if (lastActivityFilter !== "all") {
     if (!user.lastLogin) {
       matchesLastActivity = false;
     } else {
       const loginTime = new Date(user.lastLogin);
       const now = new Date();
       if (lastActivityFilter === "today") {
         matchesLastActivity =
           loginTime.toDateString() === now.toDateString();
       } else if (lastActivityFilter === "week") {
         const weekAgo = new Date(now);
         weekAgo.setDate(now.getDate() - 7);
         matchesLastActivity = loginTime >= weekAgo;
       } else if (lastActivityFilter === "month") {
         const monthAgo = new Date(now);
         monthAgo.setMonth(now.getMonth() - 1);
         matchesLastActivity = loginTime >= monthAgo;
       }
     }
   }

   return matchesSearch && matchesRole && matchesOnlineStatus && matchesLastActivity;
 });

 // Update total users count when filtered users change
 useEffect(() => {
   setTotalUsers(filteredUsers.length);
   // Reset to first page when filters change
   setCurrentPage(1);
}, [filteredUsers.length]);

// Validation function for create user - only validate touched fields and preserve existing errors
// const validateCreateForm = useCallback(() => {
//  // Preserve existing errors and only update touched fields
//  setCreateFormErrors(prevErrors => {
//    const errors = { ...prevErrors };
// let isValid = true;
// 
//   // Only validate fields that have been touched by the user
//   if (touchedFields.fullName) {
// if (!createForm.fullName.trim()) {
//   errors.fullName = 'Full Name is required';
//   isValid = false;
//     } else {
//       errors.fullName = ''; // Clear error for valid field
// }
//   }
//   
//   if (touchedFields.email) {
// if (!createForm.email.trim()) {
//   errors.email = 'Email is required';
//   isValid = false;
//     } else {
//       errors.email = ''; // Clear error for valid field
// }
//   }
//   
//   if (touchedFields.mobile) {
// if (!createForm.mobile.trim()) {
//   errors.mobile = 'Mobile is required';
//   isValid = false;
//     } else {
//       errors.mobile = ''; // Clear error for valid field
// }
//   }
//   
//   if (touchedFields.password) {
// if (!createForm.password.trim()) {
//   errors.password = 'Password is required';
//   isValid = false;
//     } else {
//       errors.password = ''; // Clear error for valid field
// }
//   }
//   
//   if (touchedFields.roleIds) {
// if (!selectedRoleIds.length) {
//   errors.roleIds = 'Select at least one role';
//   isValid = false;
//     } else {
//       errors.roleIds = ''; // Clear error for valid field
//     }
// }
// 
//   // Validate emp_id only if loginFlag is employee and field has been touched
//   if (touchedFields.emp_id && createForm.loginFlag === 'employee') {
//     if (!createForm.emp_id.trim()) {
//   errors.emp_id = 'Employee ID is required for employee users';
//   isValid = false;
//     } else {
//   // Validate emp_id format: 3-20 characters, alphanumeric with underscores and hyphens
//   const empIdRegex = /^[A-Za-z0-9_-]{3,20}$/;
//   if (!empIdRegex.test(createForm.emp_id.trim())) {
//     errors.emp_id = 'Employee ID must be 3-20 characters long and contain only letters, numbers, underscores, and hyphens';
//     isValid = false;
//   } else {
//     errors.emp_id = ''; // Clear error for valid employee ID
//       }
//     }
//   }
//   
//   return errors;
// });
// 
// return true; // Always return true to avoid blocking form submission
// }, [createForm.fullName, createForm.email, createForm.mobile, createForm.password, createForm.loginFlag, createForm.emp_id, selectedRoleIds, touchedFields]);

// Real-time validation for create form - only validate after user interaction
// Disabled to prevent conflicts with individual field validation
// useEffect(() => {
//   // Only validate if user has started filling the form (at least one field has content)
//   const hasUserInteraction = createForm.fullName.trim() || 
//                             createForm.email.trim() || 
//                             createForm.mobile.trim() || 
//                             createForm.password.trim() || 
//                             createForm.emp_id.trim() || 
//                             selectedRoleIds.length > 0;
//   
//   if (showCreateModal && hasUserInteraction) {
//     validateCreateForm();
//   }
// }, [createForm.fullName, createForm.email, createForm.mobile, createForm.password, createForm.loginFlag, createForm.emp_id, selectedRoleIds, showCreateModal, validateCreateForm]);

// Pagination helpers
 const totalPages = Math.ceil(totalUsers / pageSize);
 const startIndex = (currentPage - 1) * pageSize;
 const endIndex = startIndex + pageSize;

 // Derive current status counts based on users list + realTimeStatus map
 const statusCounts = useMemo(() => {
   const counts: { online: number; away: number; offline: number } = { online: 0, away: 0, offline: 0 };
   users.forEach((u) => {
     const s = realTimeStatus[u.id] || 'offline';
     if (s === 'online') counts.online += 1;
     else if (s === 'away') counts.away += 1;
     else counts.offline += 1;
   });
   return counts;
 }, [users, realTimeStatus]);

 // Get paginated users
 const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

 // Count of users per role based on CURRENTLY LISTED users (filteredUsers)
 const listedRoleCounts = useMemo(() => {
   const counts: Record<string, number> = {};
   filteredUsers.forEach(u => {
     const ids = Array.isArray(u.roleIds) ? u.roleIds : [];
     ids.forEach(rid => { counts[rid] = (counts[rid] || 0) + 1; });
   });
   return counts;
 }, [filteredUsers]);

 // Individual validation functions for real-time validation
 const validateFullName = (value: string, required: boolean = true, minLength: number = 2, maxLength: number = 50): string => {
   const trimmed = value.trim();
   if (!trimmed && required) return 'Full Name is required';
   if (trimmed && trimmed.length < minLength) return `Name must be at least ${minLength} characters`;
   if (trimmed && trimmed.length > maxLength) return `Name must not exceed ${maxLength} characters`;
   if (trimmed && !/^[A-Za-z\s.-]+$/.test(trimmed)) return 'Name can only contain letters, spaces, dots, and hyphens';
   return trimmed ? 'Valid name.' : '';
 };

 const validateEmailField = (value: string): string => {
   const trimmed = value.trim();
   if (!trimmed) return 'Email is required';
   const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
   if (!emailRegex.test(trimmed)) return 'Please enter a valid email address';
   return 'Email address is valid.';
 };

 const validateMobileNumber = (value: string): string => {
   const trimmed = value.trim();
   if (!trimmed) return 'Mobile is required';
   const mobileRegex = /^[\+]?[1-9][\d]{0,15}$/;
   if (!mobileRegex.test(trimmed.replace(/\s/g, ''))) return 'Please enter a valid mobile number';
   return 'Valid mobile number.';
 };

 const validatePasswordField = (value: string): string => {
   if (!value) return 'Password is required';
   if (value.length < 8) return 'Password must be at least 8 characters long';
   if (!/(?=.*[a-z])/.test(value)) return 'Password must contain at least one lowercase letter';
   if (!/(?=.*[A-Z])/.test(value)) return 'Password must contain at least one uppercase letter';
   if (!/(?=.*\d)/.test(value)) return 'Password must contain at least one number';
   if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(value)) return 'Password must contain at least one special character';
   return 'Valid password.';
 };

 const validateEmployeeId = (value: string, loginFlag: string): string => {
   if (loginFlag !== 'employee') return '';
   const trimmed = value.trim();
   if (!trimmed) return 'Employee ID is required for employee users';
   const empIdRegex = /^[A-Za-z0-9_-]{3,20}$/;
   if (!empIdRegex.test(trimmed)) return 'Employee ID must be 3-20 characters long and contain only letters, numbers, underscores, and hyphens';
   return 'Valid employee ID.';
 };

 // Validation function for edit user
 function validateEditForm() {
  const errors: { fullName: string; email: string; mobile: string; roleIds: string; loginFlag: string; status: string; emp_id: string; } = {
    fullName: '',
    email: '',
    mobile: '',
    roleIds: '',
    loginFlag: '',
    status: '',
    emp_id: '',
  };
   if (!editForm.fullName.trim()) errors.fullName = 'Full Name is required';
   if (!editForm.email.trim()) errors.email = 'Email is required';
   if (!editForm.mobile.trim()) errors.mobile = 'Mobile is required';
   const roleIdsToCheck = (editForm.roleIds && editForm.roleIds.length > 0)
     ? editForm.roleIds
     : selectedRoleIds;
   if (!roleIdsToCheck || roleIdsToCheck.length === 0) errors.roleIds = 'Select at least one role';
   setEditFormErrors(errors);
   return Object.values(errors).every(v => v === '');
 }

 // Helper to add unique role ID
 function addUniqueRoleId(arr: string[], id: string) {
   return arr.includes(id) ? arr : [...arr, id];
 }

 const goToPage = (page: number) => {
   if (page >= 1 && page <= totalPages) {
     setCurrentPage(page);
   }
 };

 const goToNextPage = () => {
   if (currentPage < totalPages) {
     setCurrentPage(currentPage + 1);
   }
 };

 const goToPreviousPage = () => {
   if (currentPage > 1) {
     setCurrentPage(currentPage - 1);
   }
 };

 const handlePageSizeChange = (newPageSize: number) => {
   setPageSize(newPageSize);
   setCurrentPage(1); // Reset to first page when changing page size
 };

 // Reset Users tab filters helper
 const resetUserFilters = () => {
   setSearch('');
   setRoleFilter('all');
   setLastActivityFilter('all');
   setOnlineStatusFilter('all');
   setCurrentPage(1);
 };

 // CRUD Operations
const handleCreateUser = async (e: React.FormEvent) => {
  console.log('🚀 Form submission started');
  e.preventDefault();
  
  console.log('📋 Form data:', {
    fullName: createForm.fullName,
    email: createForm.email,
    mobile: createForm.mobile,
    password: createForm.password,
    loginFlag: createForm.loginFlag,
    emp_id: createForm.emp_id,
    selectedRoleIds
  });
  
  if (isLoadingAction) {
    console.log('⏳ Already loading, preventing duplicate submit');
    return;
  }
  
  console.log('✅ Validating form...');
  
  // Validate all required fields for form submission
  const submissionErrors: { fullName: string; email: string; mobile: string; password: string; roleIds: string; loginFlag: string; emp_id: string; } = {
    fullName: '',
    email: '',
    mobile: '',
    password: '',
    roleIds: '',
    loginFlag: '',
    emp_id: '',
  };
  
  let hasErrors = false;
  
  if (!createForm.fullName.trim()) {
    submissionErrors.fullName = 'Full Name is required';
    hasErrors = true;
  }
  if (!createForm.email.trim()) {
    submissionErrors.email = 'Email is required';
    hasErrors = true;
  }
  if (!createForm.mobile.trim()) {
    submissionErrors.mobile = 'Mobile is required';
    hasErrors = true;
  }
  if (!createForm.password.trim()) {
    submissionErrors.password = 'Password is required';
    hasErrors = true;
  }
  if (!selectedRoleIds.length) {
    submissionErrors.roleIds = 'Select at least one role';
    hasErrors = true;
  }
  if (createForm.loginFlag === 'employee' && !createForm.emp_id.trim()) {
    submissionErrors.emp_id = 'Employee ID is required for employee users';
    hasErrors = true;
  }
  
  if (hasErrors) {
    console.log('❌ Form validation failed');
    setCreateFormErrors({
      ...submissionErrors,
      loginFlag: '', // Add missing loginFlag property
    });
    return;
  }
  
  console.log('✅ Form validation passed, starting submission...');
  setIsLoadingAction(true);
   try {
    const payload = {
      fullName: createForm.fullName.trim(),
      email: createForm.email.trim(),
      mobile: createForm.mobile.trim(),
      password: createForm.password,
      loginFlag: createForm.loginFlag,
      roleIds: selectedRoleIds,
      status: true, // Set user as active by default
      ...(createForm.loginFlag === 'employee' && createForm.emp_id.trim() && { emp_id: createForm.emp_id.trim() }),
    };
    
    console.log('📤 Sending payload:', payload);
    console.log('🌐 Making API call to /api/v1/users');
    
     const res = await fetch(`/api/v1/users`, {
       method: 'POST',
       headers: getAuthHeaders(),
       credentials: 'include',
       body: JSON.stringify(payload),
     });
     
     console.log('📥 Full response:', res);
     console.log('📥 Response headers:', Object.fromEntries(res.headers.entries()));
     
     console.log('📥 API response status:', res.status);
     console.log('📥 API response ok:', res.ok);
     
     // Log response body for debugging
     const responseText = await res.clone().text();
     console.log('📥 Response body:', responseText);
     
     if (res.status === 401 || res.status === 403) {
       showErrorAlert('Not authorized');
       return;
     }
     if (!res.ok) {
       // Try to show a friendly duplicate message for existing email/mobile
       let msg = 'Failed to create user. Please try again.';
       try {
         const raw = await res.text();
         let parsed: unknown = null;
         try { parsed = raw ? JSON.parse(raw) : null; } catch { /* not JSON */ }
        const parsedObj = (typeof parsed === 'object' && parsed !== null) ? parsed as Record<string, unknown> : {};
        // Safely extract string fields from parsed JSON without using `any`
        const getString = (v: unknown) => typeof v === 'string' && v.trim() ? v.trim() : '';
        let detail = '';
        detail = getString(parsedObj.detail) || getString(parsedObj.message) || getString(parsedObj.error) || '';
        if (!detail && typeof parsedObj.errors === 'object' && parsedObj.errors !== null) {
          const errs = parsedObj.errors as Record<string, unknown>;
          detail = getString(errs.email) || getString(errs.mobile) || '';
        }
        if (!detail) detail = raw || '';
         const isDuplicateStatus = res.status === 409 || res.status === 422 || res.status === 400;
         const looksLikeDuplicate = /exist|duplicate|already\s*in\s*use|conflict|unique\s*constraint|duplicate\s*key/i.test(detail);
         const mentionsEmail = /(email|e-mail|mail)/i.test(detail);
         const mentionsMobile = /(mobile|phone|contact)/i.test(detail);
         if (isDuplicateStatus && (looksLikeDuplicate || mentionsEmail || mentionsMobile)) {
           if (mentionsEmail && !mentionsMobile) {
             msg = 'Email already exists. Try another email address.';
           } else if (mentionsMobile && !mentionsEmail) {
             msg = 'Mobile number already exists. Try another number.';
           } else {
             msg = 'User already exists. Try another email or mobile number.';
           }
         } else if (detail && detail.trim().length > 0) {
           msg = detail;
         }
       } catch { /* ignore parse errors */ }
       showErrorAlert(msg);
       return;
     }
     
     // Parse successful response
     let responseData;
     try {
       responseData = await res.json();
       console.log('✅ Success response data:', responseData);
     } catch (error) {
       console.error('❌ Failed to parse success response:', error);
       responseData = null;
     }
     
    showSuccessAlert(`User created successfully! User ID: ${responseData?.id || 'N/A'}. Credentials email sent to ${createForm.email}.`);
    setShowCreateModal(false);
    setCreateForm({
      fullName: '',
      email: '',
      mobile: '',
      password: '',
      loginFlag: 'employee',
      emp_id: '',
      roleIds: [],
    });
     setSelectedRoleIds([]);
     // Refresh users and roles so role user_count is accurate
     await Promise.all([fetchUsers(), fetchRoles()]);
   } catch {
     showErrorAlert('Failed to create user');
   } finally {
     setIsLoadingAction(false);
   }
 };

 // Resend credentials email to user (alert version)
 const handleResendEmail = async (userId: string) => {
   try {
     const res = await fetch(`/api/v1/users/${userId}/resend-email`, {
       method: 'POST',
       headers: getAuthHeaders(),
       credentials: 'include',
     });
     const data = await res.json();
     if (res.ok) {
       showSuccessAlert(data.message);
     } else {
       showErrorAlert(data.detail || 'Failed to resend email');
     }
   } catch {
     showErrorAlert('Failed to resend email');
   }
 };

 const handleEditUser = async (e: React.FormEvent) => {
   e.preventDefault();
   if (!validateEditForm()) return;
   if (!selectedUser) return;
   try {
     const roleIdsToSend = (editForm.roleIds && editForm.roleIds.length > 0)
       ? editForm.roleIds
       : selectedRoleIds;
     const payload = {
       fullName: editForm.fullName,
       email: editForm.email,
       mobile: editForm.mobile,
       loginFlag: editForm.loginFlag,
       roleIds: roleIdsToSend,
       ...(editForm.loginFlag === 'employee' && editForm.emp_id.trim() && { emp_id: editForm.emp_id.trim() }),
     };
     const res = await fetch(`/api/v1/users/${selectedUser.id}`, {
       method: 'PATCH',
       headers: getAuthHeaders(),
       credentials: 'include',
       body: JSON.stringify(payload),
     });
     if (res.status === 401 || res.status === 403) {
       showErrorAlert('Not authorized');
       return;
     }
     if (!res.ok) throw new Error();
     showSuccessAlert('User updated successfully');
     setShowEditModal(false);
     setSelectedUser(null);
     // Refresh users and roles so role user_count updates if roles changed
     await Promise.all([fetchUsers(), fetchRoles()]);
   } catch {
     showErrorAlert('Failed to update user');
   }
 };

 const handleDeleteUser = async (userId: string) => {
   try {
     const res = await fetch(`/api/v1/users/${userId}`, {
       method: 'DELETE',
       headers: getAuthHeaders(),
     });
     if (res.status === 401 || res.status === 403) {
       showErrorAlert('Not authorized');
       return;
     }
     if (res.status === 404) {
       showInfoAlert('User not found (already deleted)');
       await Promise.all([fetchUsers(), fetchRoles()]);
       return;
     }
     if (!res.ok) throw new Error();
     showSuccessAlert('User deleted successfully');
     // Refresh both users and roles to keep role user_count in sync
     await Promise.all([fetchUsers(), fetchRoles()]);
   } catch {
     showErrorAlert('Failed to delete user');
   }
 };

 // CRUD for Roles
 const handleCreateRole = async (e: React.FormEvent) => {
   e.preventDefault();
   
   // Prevent duplicate submissions
   if (isLoadingAction) return;
   
   // Final validation before submission
   if (!isCreateRoleValid) {
     showErrorAlert('Please fix all validation errors before submitting');
     return;
   }
   
   setIsLoadingAction(true);
   
   try {
   const permissionIds = roleForm.permissions.map(name => {
     const perm = permissions.find(p => p.name === name);
     return perm ? perm.id : null;
   }).filter((id): id is string => id !== null);
     
   const payload = {
       role_name: roleForm.name.trim(), // Ensure trimmed
       description: roleForm.description.trim(), // Ensure trimmed
     permission_ids: permissionIds,
     route_paths: roleForm.route_paths
   };
     
     const res = await fetch('/api/v1/roles', {
       method: 'POST',
       headers: getAuthHeaders(),
       credentials: 'include',
       body: JSON.stringify(payload),
     });
     
     if (!res.ok) {
       let msg = 'Failed to create role';
       try { 
         const err = await res.json(); 
         if (err && err.detail) {
           // Handle specific backend errors
           if (err.detail.toLowerCase().includes('already exists') || 
               err.detail.toLowerCase().includes('duplicate')) {
             msg = 'Role name already exists. Please choose a different name.';
           } else {
             msg = err.detail;
           }
         }
       } catch { 
         // If JSON parsing fails, use default message
       }
       showErrorAlert(msg);
       return;
     }
     
  showSuccessAlert(`Role "${roleForm.name}" created successfully`);
     setShowRoleModal(false);
     setRoleForm({ name: '', description: '', permissions: [], route_paths: [] });
     // Reset validation states
     setRoleNameValidation({ isValid: false, message: '' });
     setDescriptionValidation({ isValid: false, message: '' });
     setPermissionsValidation({ isValid: false, message: '' });
     fetchRoles();
   } catch (error) {
     console.error('Error creating role:', error);
     showErrorAlert('Failed to create role. Please try again.');
   } finally {
     setIsLoadingAction(false);
   }
 };

 const handleEditRole = async (e: React.FormEvent) => {
   e.preventDefault();
   if (editRoleId === null) return;
   const permissionIds = roleForm.permissions.map(name => {
     const perm = permissions.find(p => p.name === name);
     return perm ? perm.id : null;
   }).filter((id): id is string => id !== null);
   const payload = {
     role_name: roleForm.name,
     description: roleForm.description,
     permission_ids: permissionIds,
   };
   try {
     const res = await fetch(`/api/v1/roles/${editRoleId}`, {
       method: 'PUT',
       credentials: 'include',
       headers: getAuthHeaders(),
       body: JSON.stringify(payload),
     });
     if (res.status === 404) {
       showErrorAlert('Role not found');
       fetchRoles();
       return;
     }
     if (!res.ok) {
       let msg = 'Failed to update role';
       try { const err = await res.json(); if (err && err.detail) msg = err.detail; } catch { }
       showErrorAlert(msg);
       return;
     }
     showSuccessAlert('Role updated successfully');
     setShowEditRoleModal(false);
     setEditRoleId(null);
     setRoleForm({ name: '', description: '', permissions: [], route_paths: [] });
     fetchRoles();
   } catch {
     showErrorAlert('Failed to update role');
   }
 }; const handleDeleteRole = async (roleId: string) => {
   const roleToDelete = availableRoles.find(role => role.id === roleId);
   if (!roleToDelete) {
     showErrorAlert('Role not found');
     return;
   }
   try {
     const res = await fetch(`/api/v1/roles/${roleId}`, {
       method: 'DELETE',
       headers: getAuthHeaders()
     });
     if (res.status === 404) {
       showErrorAlert('Role not found');
       fetchRoles();
       return;
     }
     if (res.status === 400) {
       const data = await res.json();
       showErrorAlert(data.detail || 'Cannot delete role');
       return;
     }
     if (!res.ok) throw new Error();
     showSuccessAlert(`Role "${roleToDelete.name}" deleted successfully`);
     fetchRoles();
   } catch {
     showErrorAlert('Failed to delete role');
   }
 };

 

 // CRUD for Permissions
 const handleCreatePermission = async (e: React.FormEvent) => {
   e.preventDefault();
   // Client-side uniqueness check to provide fast feedback
   const normalizedName = (permForm.name || '').trim().toLowerCase();
   if (existingPermissionNames.has(normalizedName)) {
     showErrorAlert('Permission already exists. Please use a unique name.');
     return;
   }
   try {
     const res = await fetch('/api/v1/permissions', {
       method: 'POST',
       headers: getAuthHeaders(),
       credentials: 'include',
       body: JSON.stringify({ name: normalizedName, description: permForm.description }),
     });
     if (!res.ok) {
       let msg = 'Failed to create permission';
       try {
         const err = await res.json();
         if (res.status === 409 || (err && typeof err.detail === 'string' && err.detail.toLowerCase().includes('exist'))) {
           msg = 'Permission already exists. Please use a unique name.';
         } else if (err && err.detail) {
           msg = err.detail;
         }
       } catch { }
       showErrorAlert(msg);
       return;
     }
     setShowPermModal(false);
     setPermForm({ name: '', description: '' });
     showSuccessAlert(`Permission ${normalizedName} created successfully.`);
     fetchPermissions();
   } catch {
     showErrorAlert('Failed to create permission');
   }
 };

 const handleEditPermission = async (e: React.FormEvent) => {
   e.preventDefault();
   if (editPermId === null) return;
   try {
     const res = await fetch(`/api/v1/permissions/${editPermId}`, {
       method: 'PUT',
       headers: getAuthHeaders(),
       body: JSON.stringify(permForm),
     });
     if (res.status === 404) {
       showErrorAlert('Permission not found');
       fetchPermissions();
       return;
     }
     if (!res.ok) {
       let msg = 'Failed to update permission';
       try { const err = await res.json(); if (err && err.detail) msg = err.detail; } catch { }
       showErrorAlert(msg);
       return;
     }
     setShowEditPermModal(false);
     setEditPermId(null);
     setPermForm({ name: '', description: '' });
     showSuccessAlert('Permission updated successfully');
     fetchPermissions();
   } catch {
     showErrorAlert('Failed to update permission');
   }
 };

 const handleDeletePermission = async (permId: string) => {
   try {
     const res = await fetch(`/api/v1/permissions/${permId}`, {
       method: 'DELETE',
       headers: getAuthHeaders()
     });
     if (res.status === 404) {
       showErrorAlert('Permission not found');
       fetchPermissions();
       return;
     }
     if (!res.ok) throw new Error();
     showSuccessAlert('Permission deleted successfully');
     fetchPermissions();
   } catch {
     showErrorAlert('Failed to delete permission');
   }
 };

 

 // Modal handlers
 const openEditModal = (user: User) => {
   setSelectedUser(user)
  setEditForm({
    fullName: user.fullName,
    email: user.email,
    mobile: user.mobile,
    loginFlag: user.loginFlag,
    emp_id: user.emp_id || '',
    roleIds: user.roleIds,
  })
   setSelectedRoleIds(user.roleIds || [])
   setShowEditModal(true)
 }

 const openRoleModal = (role?: Role) => {
   if (role) {
     // Editing existing role
     // const [selectedRole, setSelectedRole] = useState<Role | null>(role) // unused, commented for production
     setEditRoleId(role.id)
     setRoleForm({
       name: role.name,
       description: role.description,
       permissions: role.permissions.map((id) => {
         const perm = permissions.find(p => p.id === id);
         return perm ? perm.name : '';
       }).filter(Boolean),
       route_paths: []
     })
     setShowEditRoleModal(true)
   } else {
     // Creating new role
     setEditRoleId(null)
     setRoleForm({ name: "", description: "", permissions: [], route_paths: [] })
     setShowRoleModal(true)
   }
 }

 

 

 // CRUD for Routes
 const handleCreateRoute = async (e: React.FormEvent) => {
   e.preventDefault();
   
   if (isLoadingAction) return;
   setIsLoadingAction(true);
   
   try {
    const payload = {
      route_name: routeForm.route_name.trim(),
      path: routeForm.path.trim(),
      description: routeForm.description.trim()
    };
     
     const res = await fetch('/api/v1/frontend-routes/routes', {
       method: 'POST',
       headers: getAuthHeaders(),
       credentials: 'include',
       body: JSON.stringify(payload),
     });
     
     if (!res.ok) {
       let msg = 'Failed to create route';
       try { 
         const err = await res.json(); 
         if (err && err.error) {
           msg = err.error;
         }
       } catch { }
       showErrorAlert(msg);
       return;
     }
     
     showSuccessAlert('Route created successfully');
     setShowCreateRouteModal(false);
     setRouteForm({ route_name: '', path: '', description: '' });
     await fetchFrontendRoutes();
   } catch {
     showErrorAlert('Failed to create route');
   } finally {
     setIsLoadingAction(false);
   }
 };

 const handleEditRoute = async (e: React.FormEvent) => {
   e.preventDefault();
   
   if (isLoadingAction || !editRouteId) return;
   setIsLoadingAction(true);
   
   try {
    const payload = {
      route_name: routeForm.route_name.trim(),
      path: routeForm.path.trim(),
      description: routeForm.description.trim()
    };
     
     const res = await fetch(`/api/v1/frontend-routes/routes/${editRouteId}`, {
       method: 'PUT',
       headers: getAuthHeaders(),
       credentials: 'include',
       body: JSON.stringify(payload),
     });
     
     if (!res.ok) {
       let msg = 'Failed to update route';
       try { 
         const err = await res.json(); 
         if (err && err.error) {
           msg = err.error;
         }
       } catch { }
       showErrorAlert(msg);
       return;
     }
     
     showSuccessAlert('Route updated successfully');
     setShowEditRouteModal(false);
     setEditRouteId(null);
     setRouteForm({ route_name: '', path: '', description: '' });
     await fetchFrontendRoutes();
   } catch {
     showErrorAlert('Failed to update route');
   } finally {
     setIsLoadingAction(false);
   }
 };

const handleDeleteRoute = async (routeId: string) => {
  try {
    const res = await fetch(`/api/v1/frontend-routes/routes/${routeId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    
    if (!res.ok) {
      let msg = 'Failed to delete route';
      try { 
        const err = await res.json(); 
        if (err && err.error) {
          msg = err.error;
        }
      } catch { }
      showErrorAlert(msg);
      return;
    }
    
    showSuccessAlert('Route deleted successfully');
    setRouteDeleteConfirm(null);
    await fetchFrontendRoutes();
  } catch {
    showErrorAlert('Failed to delete route');
  }
};

 const handleUpdateRoleRoutes = async (roleId: string, routePaths: string[]) => {
   try {
     const payload = {
       allowed_routes: routePaths
     };
     
     const res = await fetch(`/api/v1/roles/${roleId}/allowed-routes`, {
       method: 'PUT',
       headers: getAuthHeaders(),
       credentials: 'include',
       body: JSON.stringify(payload),
     });
     
     if (!res.ok) {
       let msg = 'Failed to update role routes';
       try { 
         const err = await res.json(); 
         if (err && err.error) {
           msg = err.error;
         }
       } catch { }
       showErrorAlert(msg);
       return;
     }
     
     showSuccessAlert('Role routes updated successfully');
     await Promise.all([fetchRoles(), fetchRoleRouteMappings()]);
   } catch {
     showErrorAlert('Failed to update role routes');
   }
 };

 // Add routes to a role
 const handleAddRoutesToRole = async (roleName: string, routePaths: string[]) => {
   try {
     setIsLoadingAction(true);
     
     const payload = {
       route_paths: routePaths
     };
     
     const res = await fetch(`/api/v1/frontend-routes/roles/${roleName}/bulk-assign-routes`, {
       method: 'POST',
       headers: getAuthHeaders(),
       credentials: 'include',
       body: JSON.stringify(payload),
     });
     
     if (!res.ok) {
       let msg = 'Failed to add routes to role';
       try { 
         const err = await res.json(); 
         if (err && err.error) {
           msg = err.error;
         }
       } catch { }
       showErrorAlert(msg);
       return;
     }
     
     const result = await res.json();
     showSuccessAlert(`Successfully added ${result.routes_assigned} routes to role '${roleName}'`);
     await Promise.all([fetchRoles(), fetchRoleRouteMappings()]);
   } catch {
     showErrorAlert('Failed to add routes to role');
   } finally {
     setIsLoadingAction(false);
   }
 };

 // Remove routes from a role
 const handleRemoveRoutesFromRole = async (roleName: string, routePaths: string[]) => {
   try {
     setIsLoadingAction(true);
     
     const res = await fetch(`/api/v1/frontend-routes/roles/${roleName}/remove-routes`, {
       method: 'DELETE',
       headers: getAuthHeaders(),
       credentials: 'include',
       body: JSON.stringify(routePaths),
     });
     
     if (!res.ok) {
       let msg = 'Failed to remove routes from role';
       try { 
         const err = await res.json(); 
         if (err && err.error) {
           msg = err.error;
         }
       } catch { }
       showErrorAlert(msg);
       return;
     }
     
     const result = await res.json();
     showSuccessAlert(`Successfully removed ${result.removed_count} routes from role '${roleName}'`);
     await Promise.all([fetchRoles(), fetchRoleRouteMappings()]);
   } catch {
     showErrorAlert('Failed to remove routes from role');
   } finally {
     setIsLoadingAction(false);
   }
 };

 // Helper function to get routes assigned to a role
 const getRoutesForRole = (roleName: string) => {
   return roleRouteMappings
     .filter(mapping => mapping.role_name === roleName)
     .map(mapping => mapping.route_path);
 };

 // Helper function to get available routes (not assigned to role)
 const getAvailableRoutesForRole = (roleName: string) => {
   const assignedRoutes = getRoutesForRole(roleName);
   return frontendRoutes
     .filter(route => !assignedRoutes.includes(route.path))
     .map(route => route.path);
 };

 // Open add routes modal
 const openAddRoutesModal = (role: Role) => {
   setSelectedRoleForRoutes(role);
   setSelectedRoutesToAdd([]);
   setShowAddRoutesModal(true);
 };

 // Open remove routes modal
 const openRemoveRoutesModal = (role: Role) => {
   setSelectedRoleForRoutes(role);
   setSelectedRoutesToRemove([]);
   setShowRemoveRoutesModal(true);
 };

 const handleCreateRouteMapping = async (e: React.FormEvent) => {
   e.preventDefault();
   
   if (isLoadingAction) return;
   setIsLoadingAction(true);
   
   try {
    const payload = {
      role_name: routeMappingForm.role_name,
      route_path: routeMappingForm.route_path
    };
     
     const res = await fetch('/api/v1/frontend-routes/mappings', {
       method: 'POST',
       headers: getAuthHeaders(),
       credentials: 'include',
       body: JSON.stringify(payload),
     });
     
     if (!res.ok) {
       let msg = 'Failed to create route mapping';
       try { 
         const err = await res.json(); 
         if (err && err.error) {
           msg = err.error;
         }
       } catch { }
       showErrorAlert(msg);
       return;
     }
     
     showSuccessAlert('Route mapping created successfully');
     setShowRouteMappingModal(false);
     setRouteMappingForm({ role_name: '', route_path: '' });
     await fetchRoleRouteMappings();
   } catch {
     showErrorAlert('Failed to create route mapping');
   } finally {
     setIsLoadingAction(false);
   }
 };

 const handleRefresh = () => {
   setIsLoadingAction(true);
   // First, sync backend users' status with live sessions
   fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/users/sync-status-with-sessions`, {
     method: 'POST',
     headers: getAuthHeaders(),
     credentials: 'include'
   })
     .catch(() => {/* non-blocking */ })
     .finally(() => {
       // Then refresh all client-side datasets
       Promise.all([
         fetchUsers(),
         fetchRoles(),
         fetchPermissions(),
         fetchFrontendRoutes(),
         fetchRoleRouteMappings(),
         fetchRealTimeStatus(),
         fetchMyActivity()
       ]).finally(() => {
         setIsLoadingAction(false);
         showSuccessAlert('Table refreshed');
       });
     });
 };

 // When opening the Add User modal, reset roleIds to []
const openCreateModal = () => {
  setCreateForm({
    fullName: '',
    email: '',
    mobile: '',
    password: '',
    loginFlag: 'employee',
    emp_id: '',
    roleIds: [],
  });
  setSelectedRoleIds([]);
  setCreateFormErrors({
    fullName: '',
    email: '',
    mobile: '',
    password: '',
    roleIds: '',
    loginFlag: '',
    emp_id: '',
  });
  setTouchedFields({
    fullName: false,
    email: false,
    mobile: false,
    password: false,
    roleIds: false,
    loginFlag: false,
    emp_id: false,
  });
  setShowCreateModal(true);
};

 // Handle checkbox change
 const handleRoleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
   const id = e.target.value;

   if (e.target.checked) {
     setSelectedRoleIds(prev => {
       const newSelection = prev.includes(id) ? prev : [...prev, id];
       return newSelection;
     });
   } else {
     setSelectedRoleIds(prev => {
       const newSelection = prev.filter(rid => rid !== id);
       return newSelection;
     });
   }
 };



 return (
   <div className="min-h-screen w-full bg-gray-50 dark:bg-gray-900 relative">
     {/* Live Status Badge Styles */}
     <style jsx>{`
       .live-gradient {
         background: linear-gradient(90deg, rgba(59,130,246,0.15), rgba(16,185,129,0.15), rgba(59,130,246,0.15));
         background-size: 200% 200%;
         animation: gradientShift 4s ease infinite;
       }
       @keyframes gradientShift {
         0% { background-position: 0% 50%; }
         50% { background-position: 100% 50%; }
         100% { background-position: 0% 50%; }
       }
       .pulse-ring::after {
         content: '';
         position: absolute;
         inset: -6px;
         border-radius: 9999px;
         animation: ringPulse 1.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
       }
       @keyframes ringPulse {
         0% { box-shadow: 0 0 0 0 rgba(59,130,246,0.35); }
         70% { box-shadow: 0 0 0 8px rgba(59,130,246,0); }
         100% { box-shadow: 0 0 0 0 rgba(59,130,246,0); }
       }
       @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
       .blink { animation: blink 1s step-start infinite; }
       .dot-glow {
         box-shadow: 0 0 6px rgba(59,130,246,0.6), 0 0 14px rgba(16,185,129,0.35);
       }
       .ping-slow {
         animation: pingSlow 2s cubic-bezier(0, 0, 0.2, 1) infinite;
       }
       @keyframes pingSlow {
         75%, 100% { transform: scale(2); opacity: 0; }
       }
       .slide-text {
         display: inline-block;
         transform: translateY(0);
         transition: transform 300ms ease;
       }
       .badge:hover .slide-text { transform: translateY(-1px); }
     `}</style>
     {/* Global styles for dropdown z-index */}
     <style jsx global>{`
       /* Ensure all select elements have proper z-index */
       select {
         z-index: 10 !important;
         position: relative !important;
       }
       select:focus {
         z-index: 20 !important;
       }
       /* Ensure dropdowns open downward and extend beyond container */
       select option {
         z-index: 30 !important;
       }
       /* Override any overflow hidden on parent containers */
       .filter-container {
         overflow: visible !important;
       }
       .filter-container * {
         overflow: visible !important;
       }
       /* Force dropdown to appear above other elements */
       select:focus {
         z-index: 9999 !important;
       }
       /* Ensure the dropdown list appears above everything */
       select:focus option {
         z-index: 10000 !important;
         position: relative !important;
       }
       /* Additional browser-specific fixes */
       select {
         -webkit-appearance: menulist !important;
         -moz-appearance: menulist !important;
         appearance: menulist !important;
       }
     `}</style>

     <div className="w-full max-w-10xl mx-auto px-4 sm:px-6 lg:px-4">
        {/* Professional Header */}
        <div className="px-6 py-8">
          <DashboardHeader
            variant="default"
            size="lg"
            title="User Management"
            subtitle="Easily manage accounts, roles, and permissions with full visibility and control"
            breadcrumbs={[
              { label: 'Home', href: '/' },
              { label: 'User Management', href: '/controls-users' }
            ]}
            icon={() => (
              <div className="relative">
                  <Users className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
                </div>
              </div>
            )}
            actions={
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-white/10 rounded-full text-white text-xs sm:text-sm">
                    <Crown className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Admin</span>
                    <span className="sm:hidden">A</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-white/10 rounded-full text-white text-xs sm:text-sm">
                    <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">{filteredUsers.length} Users</span>
                    <span className="sm:hidden">{filteredUsers.length}</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-white/10 rounded-full text-white text-xs sm:text-sm">
                    <Shield className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">{availableRoles.length} Roles</span>
                    <span className="sm:hidden">{availableRoles.length}</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-blue-500/20 rounded-full text-green-300 text-xs sm:text-sm">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="hidden sm:inline">Live</span>
                    <span className="sm:hidden">●</span>
                  </div>
                </div>
              </div>
            }
            showHelp={showHelp}
            onHelpToggle={() => setShowHelp(!showHelp)}
            helpContent={
               <div className="text-sm text-blue-800 dark:text-blue-200">
                 <h3 className="font-semibold mb-2">Quick Tips:</h3>
                 <ul className="space-y-1">
                   <li> Use filters to find specific users or roles</li>
                   <li> Select multiple users for bulk actions</li>
                   <li> Click on role badges to see detailed permissions</li>
                   <li>Use the search to find users by name, email, or mobile</li>
                 </ul>
               </div>
            }
          />
             </div>

        {/* Enhanced Tabs Navigation */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg p-4 sm:p-6 mb-6 sm:mb-8 mx-2 sm:mx-4">
          <div className="flex flex-col gap-4 mb-4 sm:mb-6">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-1">
                Management Sections
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                Switch between different management areas and configure your system
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-0 sm:space-x-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
              {[
                { id: 'users', label: 'Users', icon: Users },
                { id: 'roles', label: 'Roles', icon: Shield },
                { id: 'permissions', label: 'Permissions', icon: Key },
                { id: 'routes', label: 'Routes', icon: Route }
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center justify-center sm:justify-start px-3 sm:px-6 py-2.5 sm:py-3 rounded-lg text-sm font-medium transition-all duration-300 min-h-[44px] ${
                      isActive
                        ? 'bg-white text-blue-700 dark:bg-gray-700 dark:text-blue-300 shadow-md transform scale-105'
                        : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <Icon className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden text-xs">{tab.label.slice(0, 1)}</span>
                    <span className="ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                      {tab.id === 'users' ? filteredUsers.length : 
                       tab.id === 'roles' ? availableRoles.length : 
                       tab.id === 'permissions' ? permissions.length :
                       frontendRoutes.length}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

       {/* Main content container */}
       <main className="w-full py-4 sm:py-4">
         {/* Users Tab */}
         {activeTab === "users" && (
           <section className="space-y-8">
              {/* Enhanced Search & Actions Bar */}
              <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-700 mx-2 sm:mx-4">
                <div className="flex flex-col gap-4">
                  {/* Search Bar */}
                  <div className="w-full">
                    <div className="relative">
                      <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4 sm:w-5 sm:h-5" />
                      <input
                        type="text"
                        placeholder="Search by name, email, or mobile..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 placeholder-gray-500 dark:placeholder-gray-400 shadow-sm text-sm sm:text-base"
                      />
                    </div>
                  </div>
                  
                  {/* Actions Group - Stack on mobile */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl border transition-all duration-200 flex-1 sm:flex-none min-h-[44px] ${
                          showFilters
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 shadow-sm'
                            : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                        }`}
                      >
                        <Filter className="w-4 h-4" />
                        <span className="hidden sm:inline">Filters</span>
                        <span className="sm:hidden text-sm">Filter</span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                      </button>
                      
                      <button
                        onClick={handleRefresh}
                        disabled={isLoadingAction}
                        className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex-1 sm:flex-none min-h-[44px]"
                      >
                        <RefreshCw className={`w-4 h-4 ${isLoadingAction ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">Refresh</span>
                        <span className="sm:hidden text-sm">Refresh</span>
                      </button>
                    </div>
                    
                    <button
                      onClick={openCreateModal}
                      className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 min-h-[44px] w-full sm:w-auto"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span className="font-medium text-sm sm:text-base">New User</span>
                    </button>
                  </div>
                </div>

               {/* Enhanced Expanded Filters */}
               {showFilters && (
                 <div className="transition-all duration-300 ease-in-out overflow-visible filter-container animate-in slide-in-from-top-2">
                   <section className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-600 relative mt-4 overflow-visible" style={{ zIndex: 5 }}>
                     <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                       <div className="relative overflow-visible">
                         <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                           <Wifi className="w-4 h-4" />
                           Online Status
                         </label>
                         <select
                           value={onlineStatusFilter}
                           onChange={e => setOnlineStatusFilter(e.target.value)}
                           className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors relative z-10 text-sm sm:text-base"
                           style={{ zIndex: 10, position: 'relative' }}
                         >
                           <option value="all">All Online Status</option>
                           <option value="online">Online</option>
                           <option value="away">Away</option>
                           <option value="offline">Offline</option>
                         </select>
                       </div>
                       <div className="relative overflow-visible">
                         <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                           <Shield className="w-4 h-4" />
                           Role
                         </label>
                         <select
                           value={roleFilter}
                           onChange={e => setRoleFilter(e.target.value)}
                           className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors relative z-10 text-sm sm:text-base"
                           style={{ zIndex: 10, position: 'relative' }}
                         >
                           <option value="all">All Roles</option>
                           {availableRoles.map((role) => (
                             <option key={role.id} value={role.id}>{role.name}</option>
                           ))}
                         </select>
                       </div>
                       <div className="relative overflow-visible">
                         <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                           <Clock className="w-4 h-4" />
                           Last Activity
                         </label>
                         <select
                           value={lastActivityFilter}
                           onChange={e => setLastActivityFilter(e.target.value)}
                           className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors relative z-10 text-sm sm:text-base"
                           style={{ zIndex: 10, position: 'relative' }}
                         >
                           <option value="all">All Time</option>
                           <option value="today">Today</option>
                           <option value="week">This Week</option>
                           <option value="month">This Month</option>
                         </select>
                       </div>
                     </div>
                     <div className="mt-4 flex items-center justify-center sm:justify-end">
                       <button
                         onClick={resetUserFilters}
                         className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors min-h-[40px]"
                         title="Reset all filters to default"
                       >
                         Reset Filters
                       </button>
                     </div>
                   </section>
                 </div>
               )}
             </section>
             {/* Enhanced Users Table with Bulk Actions */}
             <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700 mx-2 sm:mx-4">
               <div className="px-3 sm:px-4 lg:px-8 py-4 sm:py-6 border-b border-gray-200 dark:border-gray-700 flex flex-col gap-4">
                 <div>
                   <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                     <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                     Users ({filteredUsers.length})
                   </h2>
                   <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm sm:text-base">View and manage user accounts and their access levels.</p>

                   {/* Real-time status summary */}
                   <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-xs sm:text-sm">
                     <div className="flex items-center gap-1">
                       <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                       <span className="text-blue-600 dark:text-blue-400">
                         {statusCounts.online} Online
                         {currentUserId && (
                           <span className="ml-1 text-[10px] sm:text-[11px] text-blue-700 dark:text-blue-300 align-middle">(You)</span>
                         )}
                       </span>
                     </div>
                     <div className="flex items-center gap-1">
                       <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                       <span className="text-blue-500 dark:text-blue-400">
                         {statusCounts.away} Away
                       </span>
                     </div>
                     <div className="flex items-center gap-1">
                       <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                       <span className="text-gray-600 dark:text-gray-400">
                         {statusCounts.offline} Offline
                       </span>
                     </div>
                     {isStatusPolling && (
                       <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                         <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                         <span>Live</span>
                       </div>
                     )}
                     {/* Mini status refresh removed per request */}
                   </div>
                 </div>

                 {/* Bulk Actions */}
                 {selectedUsers.length > 0 && (
                   <div className="flex flex-col gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                     <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                       {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected
                     </span>
                     <div className="flex flex-wrap gap-2">
                       <button
                         onClick={() => handleBulkAction('activate')}
                         disabled={isLoadingAction}
                         className="px-3 py-2 text-sm rounded-lg border border-green-300 dark:border-green-600 text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 disabled:opacity-50 flex items-center gap-1 min-h-[40px]"
                       >
                         <CheckCircle className="w-4 h-4" />
                         <span className="hidden sm:inline">Activate</span>
                         <span className="sm:hidden">Act</span>
                       </button>
                       <button
                         onClick={() => handleBulkAction('deactivate')}
                         disabled={isLoadingAction}
                         className="px-3 py-2 text-sm rounded-lg border border-orange-300 dark:border-orange-600 text-orange-700 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 disabled:opacity-50 flex items-center gap-1 min-h-[40px]"
                       >
                         <UserX className="w-4 h-4" />
                         <span className="hidden sm:inline">Deactivate</span>
                         <span className="sm:hidden">Deact</span>
                       </button>
                       <button
                         onClick={() => handleBulkAction('delete')}
                         disabled={isLoadingAction}
                         className="px-3 py-2 text-sm rounded-lg border border-red-300 dark:border-red-600 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 flex items-center gap-1 min-h-[40px]"
                       >
                         <Trash2 className="w-4 h-4" />
                         <span className="hidden sm:inline">Delete</span>
                         <span className="sm:hidden">Del</span>
                       </button>
                     </div>
                   </div>
                 )}
               </div>

               <div className="overflow-x-auto">
                 <table className="w-full text-sm sm:text-base min-w-[800px]">
                   <thead>
                     <tr className="bg-gray-50 dark:bg-gray-700 text-left">
                       <th className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                         <input
                           type="checkbox"
                           checked={paginatedUsers.length > 0 && paginatedUsers.every(user => selectedUsers.includes(user.id))}
                           onChange={(e) => {
                             if (e.target.checked) {
                               setSelectedUsers(paginatedUsers.map(user => user.id));
                             } else {
                               setSelectedUsers([]);
                             }
                           }}
                           className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                         />
                       </th>
                       <th className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[200px]">User</th>
                       <th className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[180px]">Contact</th>
                       <th className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[120px]">Roles</th>
                       <th className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[100px]">Status</th>
                       <th className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[120px]">Last Activity</th>
                       <th className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right min-w-[120px]">Actions</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                     {paginatedUsers.length === 0 ? (
                       <tr>
                         <td colSpan={6} className="px-4 sm:px-6 py-16 text-center">
                           <div className="flex flex-col items-center justify-center">
                             <Users className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
                             <p className="text-gray-500 dark:text-gray-400 font-semibold text-lg">No users found</p>
                             <p className="text-gray-400 dark:text-gray-500 text-base mt-2">Try adjusting your search or filters.</p>
                             <button
                               onClick={openCreateModal}
                               className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                             >
                               Create First User
                             </button>
                           </div>
                         </td>
                       </tr>
                     ) : (
                       paginatedUsers.map(user => {
                         const isOnline = realTimeStatus[user.id] === 'online';
                         const effectiveLast = isOnline
                           ? new Date().toISOString()
                           : (lastSeenAt[user.id] ?? user.lastLogin ?? null);
                         const activityInfo = formatLastActivity(effectiveLast);
                         const ActivityIcon = activityInfo.icon;

                         return (
                           <tr key={user.id} className="min-h-[56px] align-middle hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors group">
                             <td className="min-h-[56px] align-middle px-2 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
                               <input
                                 type="checkbox"
                                 checked={selectedUsers.includes(user.id)}
                                 onChange={(e) => {
                                   if (e.target.checked) {
                                     setSelectedUsers(prev => [...prev, user.id]);
                                   } else {
                                     setSelectedUsers(prev => prev.filter(id => id !== user.id));
                                   }
                                 }}
                                 className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                               />
                             </td>
                             <td className="min-h-[56px] align-middle px-2 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
                               <div className="flex items-center">
                                 <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-xs sm:text-sm lg:text-lg font-bold text-white shadow-sm">
                                   {user.fullName
                                     .split(' ')
                                     .map(n => n[0])
                                     .join('')
                                     .toUpperCase()}
                                 </div>
                                 <div className="ml-2 sm:ml-3 lg:ml-4 min-w-0 flex-1">
                                   <div className="text-xs sm:text-sm lg:text-base font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                                     {user.fullName}
                                     {currentUserId === user.id && (
                                       <span className="ml-1 sm:ml-2 inline-flex items-center px-1 sm:px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 align-middle">You</span>
                                     )}
                                   </div>
                                   <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 hidden sm:block truncate">ID: {user.id}</div>
                                 </div>
                               </div>
                             </td>
                             <td className="min-h-[56px] align-middle px-2 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
                               <div className="text-xs sm:text-sm lg:text-base text-gray-900 dark:text-white truncate">{user.email || '-'}</div>
                               <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                 <Mail className="w-3 h-3" />
                                 <span className="truncate">{user.mobile || '-'}</span>
                               </div>
                             </td>
                             <td className="min-h-[56px] align-middle px-2 sm:px-4 lg:px-6 py-3 sm:py-4">
                               <div className="flex flex-wrap gap-1">
                                 {user.roleIds && user.roleIds.length > 0
                                   ? user.roleIds.map(id => {
                                     const role = availableRoles.find(r => r.id === id);
                                     const config = role ? getRoleConfig(role.name) : null;
                                     const RoleIcon = config?.icon || Users;
                                     return config ? (
                                       <span key={id} className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium ${config.color} border ${config.borderColor}`}>
                                         <RoleIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                                         <span className="hidden sm:inline">{config.name}</span>
                                         <span className="sm:hidden">{config.name.slice(0, 2)}</span>
                                       </span>
                                     ) : null;
                                   })
                                   : user.userRoles
                                     ? <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-700">
                                       <Users className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                                       <span className="hidden sm:inline">{user.userRoles}</span>
                                       <span className="sm:hidden">{user.userRoles.slice(0, 2)}</span>
                                     </span>
                                     : <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 italic">No roles</span>}
                               </div>
                             </td>
                             <td className="min-h-[56px] align-middle px-2 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
                               {(() => {
                                 const statusDisplay = getRealTimeStatusDisplay(user.id);
                                 const StatusIcon = statusDisplay.icon;

                                 return (
                                   <span
                                     className={`inline-flex items-center px-1.5 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${statusDisplay.bgColor} ${statusDisplay.color} border ${statusDisplay.borderColor} transition-all duration-200`}
                                     title={`Real-time status: ${statusDisplay.text}`}
                                   >
                                     <span
                                       className={`w-1.5 h-1.5 sm:w-2 sm:h-2 mr-1 sm:mr-1.5 rounded-full ${statusDisplay.dotColor} ${statusDisplay.pulse ? 'animate-pulse' : ''
                                         }`}
                                     ></span>
                                     <StatusIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                                     <span className="hidden sm:inline">{statusDisplay.text}</span>
                                     <span className="sm:hidden">{statusDisplay.text.slice(0, 2)}</span>
                                     {isStatusPolling && (
                                       <div className="ml-0.5 sm:ml-1 w-1 h-1 bg-blue-500 rounded-full animate-ping"></div>
                                     )}
                                   </span>
                                 );
                               })()}
                             </td>
                             <td className="min-h-[56px] align-middle px-2 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
                               <div className="flex items-center gap-1 sm:gap-2">
                                 <ActivityIcon className={`w-3 h-3 sm:w-4 sm:h-4 ${activityInfo.color}`} />
                                 <span className={`text-[10px] sm:text-xs lg:text-sm font-medium ${activityInfo.color} hidden sm:inline`}>{activityInfo.text}</span>
                                 <span className={`text-[10px] sm:hidden font-medium ${activityInfo.color}`}>{activityInfo.text.slice(0, 3)}</span>
                               </div>
                             </td>

                             <td className="min-h-[56px] align-middle px-2 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-right">
                               <div className="flex items-center gap-1 sm:gap-2 justify-end">
                                 <button
                                   onClick={() => openEditModal(user)}
                                   className="p-1 sm:p-1.5 lg:p-2 rounded-full text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
                                   title="Edit user"
                                 >
                                   <Edit className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
                                 </button>
                                 <button
                                   className="p-1 sm:p-1.5 lg:p-2 rounded-full text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
                                   title="Send email"
                                   onClick={() => handleResendEmail(user.id)}
                                 >
                                   <Mail className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
                                 </button>
                                 <button
                                   onClick={() => setDeleteConfirm({ id: user.id, name: user.fullName })}
                                   className="p-1 sm:p-1.5 lg:p-2 rounded-full text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
                                   title="Delete user"
                                 >
                                   <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
                                 </button>
                               </div>
                             </td>
                           </tr>
                         );
                       })
                     )}
                   </tbody>
                 </table>
               </div>
             </section>
             {/* Pagination controls */}
             <Pagination
               currentPage={currentPage}
               totalPages={totalPages}
               onPageChange={goToPage}
               onNext={goToNextPage}
               onPrevious={goToPreviousPage}
               onPageSizeChange={handlePageSizeChange}
               pageSize={pageSize}
               totalItems={totalUsers}
               startIndex={startIndex}
               endIndex={endIndex}
             />
           </section>
         )}

         {/* Enhanced Roles Tab */}
         {activeTab === "roles" && (
           <div className="space-y-8">
             {/* Header Section */}
             <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-6 border border-blue-100 dark:border-gray-600">
               <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                 <div className="flex items-center gap-4">
                   <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                     <Shield className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                   </div>
                   <div>
                     <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Role Management</h2>
                     <p className="text-gray-600 dark:text-gray-300 mt-1">Organize and control user access with custom roles and permissions</p>
                   </div>
                 </div>
                 <div className="flex items-center gap-3">
                   <div className="text-right">
                     <div className="text-2xl font-bold text-gray-900 dark:text-white">{availableRoles.length}</div>
                     <div className="text-sm text-gray-600 dark:text-gray-400">Total Roles</div>
                   </div>
                   <button
                     onClick={() => openRoleModal()}
                     className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5 flex items-center gap-2"
                   >
                     <Plus className="w-5 h-5" />
                     Create Role
                   </button>
                 </div>
               </div>
             </div>

            {/* Role Statistics - Dynamic Categories */}
            {(() => {
              type CategoryData = { roles: Role[]; icon: React.ComponentType<{ className?: string }>; color: string; bgColor: string; textColor: string };
              const categoryEntries = Object.entries(groupRolesByCategory).sort((a, b) => (b[1] as CategoryData).roles.length - (a[1] as CategoryData).roles.length);
              
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {categoryEntries.map(([categoryName, categoryData]) => {
                    const data = categoryData as CategoryData;
                    const CategoryIcon = data.icon;
                    return (
                      <div 
                        key={categoryName} 
                        className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-3 ${data.bgColor} rounded-lg`}>
                            <CategoryIcon className={`w-6 h-6 ${data.textColor}`} />
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                              {data.roles.length}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">{categoryName}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

             {/* Enhanced Role Cards */}
             <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
               {availableRoles.map((role) => {
                 const config = getRoleConfig(role.name);
                 const RoleIcon = config?.icon || Shield;
                 const userCount = listedRoleCounts[role.id] ?? 0;
                 const isHighPrivilege = /super.*admin|admin.*super/i.test(role.name);
                 const isDuplicate = availableRoles.filter(r => r.name.toLowerCase() === role.name.toLowerCase()).length > 1;

                 return (
                   <div key={role.id} className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg border-2 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group ${
                     isHighPrivilege ? 'border-purple-200 dark:border-purple-700' : 
                     isDuplicate ? 'border-blue-200 dark:border-blue-700' : 
                     'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
                   }`}>
                     {/* Card Header */}
                     <div className="p-6 pb-4">
                       <div className="flex items-start justify-between mb-4">
                         <div className="flex items-center gap-3">
                           <div className={`p-3 rounded-xl ${config?.color || 'bg-gray-100 dark:bg-gray-700'}`}>
                             <RoleIcon className={`w-7 h-7 ${config?.color?.replace('bg-', 'text-').replace('-100', '-600') || 'text-gray-600 dark:text-gray-300'}`} />
                           </div>
                           <div className="flex-1">
                             <div className="flex items-center gap-2">
                               <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                 {role.name}
                               </h3>
                               {isHighPrivilege && (
                                 <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-medium rounded-full">
                                   Admin
                                 </span>
                               )}
                               {isDuplicate && (
                                 <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full">
                                   Duplicate
                                 </span>
                               )}
                             </div>
                             <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                               {role.description || 'No description provided'}
                             </p>
                           </div>
                         </div>
                         <div className="text-right">
                           <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold ${
                             userCount > 0 ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 
                             'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                           }`}>
                             {userCount} user{userCount !== 1 ? 's' : ''}
                           </div>
                         </div>
                       </div>
                     </div>

                     {/* Permissions Section */}
                     <div className="px-6 pb-4">
                       <div className="flex items-center justify-between mb-3">
                         <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                           <Settings className="w-4 h-4" />
                           Permissions
                         </h4>
                         <span className="text-xs text-gray-500 dark:text-gray-400">
                           {role.permissions.length} assigned
                         </span>
                       </div>

                       <div className="space-y-3">
                         {role.permissions.length > 0 ? (
                           <div className="flex flex-wrap gap-2">
                         {role.permissions.slice(0, 4).map((permId) => {
                           const perm = permissions.find(p => p.id === permId);
                           if (!perm) return null;

                           return (
                             <span
                               key={permId}
                               title={`${perm.name}: ${perm.description}`}
                               className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors cursor-pointer"
                             >
                               {getPermissionDisplayName(perm.name)}
                             </span>
                           );
                         })}
                             {role.permissions.length > 4 && (
                               <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                 +{role.permissions.length - 4} more
                               </span>
                             )}
                           </div>
                         ) : (
                           <div className="text-center py-4">
                             <div className="text-gray-400 dark:text-gray-500 text-sm">
                               No permissions assigned
                             </div>
                             <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                               Click Manage to add permissions
                             </div>
                           </div>
                         )}
                       </div>
                     </div>

                     {/* Action Buttons */}
                     <div className="px-6 pb-6 pt-2">
                       <div className="flex gap-2">
                         <button
                           onClick={() => openRoleModal(role)}
                           className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-all duration-200 flex items-center justify-center gap-2 font-medium"
                           title="Manage role details and permissions"
                         >
                           <Settings className="w-4 h-4" />
                           Manage
                         </button>
                         <div className="relative group">
                           <button
                             onClick={() => {
                               const roleRoutes = roleRouteMappings.filter(mapping => mapping.role_name === role.name);
                               const routePaths = roleRoutes.map(mapping => mapping.route_path);
                               handleUpdateRoleRoutes(role.id, routePaths);
                             }}
                             className="px-4 py-2.5 rounded-lg border border-green-200 dark:border-green-600 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30 hover:border-green-300 dark:hover:border-green-500 transition-all duration-200 flex items-center justify-center"
                             title="Manage role routes"
                           >
                             <Route className="w-4 h-4" />
                           </button>
                           
                           {/* Route Management Dropdown */}
                           <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                             <div className="py-1">
                               <button
                                 onClick={() => openAddRoutesModal(role)}
                                 className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-2"
                               >
                                 <Plus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                 Add Routes
                               </button>
                               <button
                                 onClick={() => openRemoveRoutesModal(role)}
                                 className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                               >
                                 <Minus className="w-4 h-4 text-red-600 dark:text-red-400" />
                                 Remove Routes
                               </button>
                             </div>
                           </div>
                         </div>
                         <button
                           onClick={() => setRoleDeleteConfirm({ id: role.id, name: role.name, user_count: role.user_count })}
                           className="px-4 py-2.5 rounded-lg text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 flex items-center justify-center"
                           title="Delete role"
                           disabled={userCount > 0}
                         >
                           <Trash2 className="w-4 h-4" />
                         </button>
                       </div>
                       {userCount > 0 && (
                         <div className="mt-2 text-xs text-amber-600 dark:text-amber-400 text-center">
                           Cannot delete role with assigned users
                         </div>
                       )}
                     </div>
                   </div>
                 );
               })}
             </div>

             {/* Empty State */}
             {availableRoles.length === 0 && (
               <div className="text-center py-12">
                 <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-6">
                   <Shield className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                 </div>
                 <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No roles found</h3>
                 <p className="text-gray-600 dark:text-gray-400 mb-6">Create your first role to get started with user management</p>
                 <button
                   onClick={() => openRoleModal()}
                   className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                 >
                   Create Role
                 </button>
               </div>
             )}
           </div>
         )}

         {/* Enhanced Permissions Tab */}
         {activeTab === "permissions" && (
           <div className="space-y-8">
             {/* Header Section */}
             <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-6 border border-blue-100 dark:border-gray-600">
               <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                 <div className="flex items-center gap-4">
                   <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                     <Settings className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                   </div>
                   <div>
                     <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Permission Management</h2>
                     <p className="text-gray-600 dark:text-gray-300 mt-1">Define and control system access permissions for granular security</p>
                   </div>
                 </div>
                 <div className="flex items-center gap-3">
                   <div className="text-right">
                     <div className="text-2xl font-bold text-gray-900 dark:text-white">{permissions.length}</div>
                     <div className="text-sm text-gray-600 dark:text-gray-400">Total Permissions</div>
                   </div>
                   <button
                     onClick={() => {
                       setPermForm({ name: '', description: '' });
                       setShowPermModal(true);
                     }}
                     className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5 flex items-center gap-2"
                   >
                     <Plus className="w-5 h-5" />
                     Create Permission
                   </button>
                 </div>
               </div>
             </div>

             {/* Permission Statistics */}
             <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
               <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                 <div className="flex items-center gap-4">
                   <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                     <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                   </div>
                   <div>
                     <div className="text-2xl font-bold text-gray-900 dark:text-white">
                       {permissions.filter(perm => /admin|system/i.test(perm.name) || perm.name === 'system:admin').length}
                     </div>
                     <div className="text-sm text-gray-600 dark:text-gray-400">Admin Permissions</div>
                   </div>
                 </div>
               </div>
               
               <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                 <div className="flex items-center gap-4">
                   <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                     <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                   </div>
                   <div>
                     <div className="text-2xl font-bold text-gray-900 dark:text-white">
                       {permissions.filter(perm => /user|member/i.test(perm.name) || perm.name.startsWith('user:')).length}
                     </div>
                     <div className="text-sm text-gray-600 dark:text-gray-400">User Permissions</div>
                   </div>
                 </div>
               </div>
               
               <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                 <div className="flex items-center gap-4">
                   <div className="p-3 bg-blue-200 dark:bg-blue-900/30 rounded-lg">
                     <Edit className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                   </div>
                   <div>
                     <div className="text-2xl font-bold text-gray-900 dark:text-white">
                       {permissions.filter(perm => /create|write|edit|update/i.test(perm.name) || perm.name.includes(':create') || perm.name.includes(':update')).length}
                     </div>
                     <div className="text-sm text-gray-600 dark:text-gray-400">Write Permissions</div>
                   </div>
                 </div>
               </div>
               
               <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                 <div className="flex items-center gap-4">
                   <div className="p-3 bg-blue-300 dark:bg-blue-900/30 rounded-lg">
                     <Search className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                   </div>
                   <div>
                     <div className="text-2xl font-bold text-gray-900 dark:text-white">
                       {permissions.filter(perm => /read|view|get/i.test(perm.name) || perm.name.includes(':read')).length}
                     </div>
                     <div className="text-sm text-gray-600 dark:text-gray-400">Read Permissions</div>
                   </div>
                 </div>
               </div>
             </div>

             {/* Search and Filters */}
             <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
               <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                 <div className="flex gap-4 flex-1">
                   <div className="relative flex-1 max-w-lg">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                     <input
                       type="text"
                       placeholder="Search permissions by name or description..."
                       className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors placeholder-gray-500 dark:placeholder-gray-400"
                     />
                   </div>
                 </div>
                 <div className="flex gap-3">
                   <button className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                     Filter
                   </button>
                   <button className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                     Sort
                   </button>
                 </div>
               </div>
             </div>

             {/* Bulk Actions */}
             {selectedPerms.length > 0 && (
               <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                 <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                     <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                       <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                     </div>
                     <div>
                       <div className="text-sm font-medium text-blue-800 dark:text-blue-200">
                         {selectedPerms.length} permission{selectedPerms.length !== 1 ? 's' : ''} selected
                       </div>
                       <div className="text-xs text-blue-600 dark:text-blue-300">
                         Choose an action to perform on selected permissions
                       </div>
                     </div>
                   </div>
                   <div className="flex gap-2">
                     <button
                       onClick={() => setSelectedPerms([])}
                       className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                     >
                       Clear Selection
                     </button>
                     <button
                       onClick={async () => {
                         await Promise.all(selectedPerms.map(id => handleDeletePermission(id)));
                         setSelectedPerms([]);
                       }}
                       className="px-4 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 bg-red-50 dark:bg-red-900/20 border border-blue-300 dark:border-blue-600 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                     >
                       Delete Selected
                     </button>
                   </div>
                 </div>
               </div>
             )}

             {/* Enhanced Permission Cards */}
             <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
               {permissions.map((permission) => {
                 const assignedRoles = availableRoles.filter(role => role.permissions.includes(permission.id));
                 const isSystemPermission = /admin|system/i.test(permission.name) || permission.name === 'system:admin';
                 const isWritePermission = /create|write|edit|delete|update/i.test(permission.name) || permission.name.includes(':create') || permission.name.includes(':update') || permission.name.includes(':delete');
                 const isReadPermission = /read|view|get/i.test(permission.name) || permission.name.includes(':read');

                 return (
                   <div key={permission.id} className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg border-2 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group ${
                     isSystemPermission ? 'border-blue-200 dark:border-blue-700' : 
                     isWritePermission ? 'border-blue-300 dark:border-blue-600' : 
                     isReadPermission ? 'border-blue-400 dark:border-blue-500' :
                     'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
                   }`}>
                     {/* Card Header */}
                     <div className="p-6 pb-4">
                       <div className="flex items-start justify-between mb-4">
                         <div className="flex items-center gap-3">
                           <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold text-white shadow-sm ${
                             isSystemPermission ? 'bg-gradient-to-br from-blue-600 to-blue-800' :
                             isWritePermission ? 'bg-gradient-to-br from-blue-500 to-blue-700' :
                             isReadPermission ? 'bg-gradient-to-br from-blue-400 to-blue-600' :
                             'bg-gradient-to-br from-blue-300 to-blue-500'
                           }`}>
                             {permission.name.charAt(0).toUpperCase()}
                           </div>
                           <div className="flex-1">
                             <div className="flex items-center gap-2">
                               <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                 {getPermissionDisplayName(permission.name)}
                               </h3>
                               {isSystemPermission && (
                                 <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full">
                                   System
                                 </span>
                               )}
                               {isWritePermission && (
                                 <span className="px-2 py-1 bg-blue-200 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full">
                                   Write
                                 </span>
                               )}
                               {isReadPermission && (
                                 <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full">
                                   Read
                                 </span>
                               )}
                             </div>
                             <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                               {permission.description || 'No description provided'}
                             </p>
                           </div>
                         </div>
                         <div className="text-right">
                           <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold ${
                             assignedRoles.length > 0 ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 
                             'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                           }`}>
                             {assignedRoles.length} role{assignedRoles.length !== 1 ? 's' : ''}
                           </div>
                         </div>
                       </div>
                     </div>

                     {/* Assigned Roles Section */}
                     <div className="px-6 pb-4">
                       <div className="flex items-center justify-between mb-3">
                         <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                           <Shield className="w-4 h-4" />
                           Assigned Roles
                         </h4>
                         <span className="text-xs text-gray-500 dark:text-gray-400">
                           {assignedRoles.length} assigned
                         </span>
                       </div>

                       <div className="space-y-3">
                         {assignedRoles.length > 0 ? (
                           <div className="flex flex-wrap gap-2">
                             {assignedRoles.slice(0, 3).map((role) => {
                               const config = getRoleConfig(role.name);
                               const RoleIcon = config?.icon || Shield;
                               
                               return (
                                 <span
                                   key={role.id}
                                   className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600"
                                 >
                                   <RoleIcon className="w-3 h-3 mr-1" />
                                   {role.name}
                                 </span>
                               );
                             })}
                             {assignedRoles.length > 3 && (
                               <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                 +{assignedRoles.length - 3} more
                               </span>
                             )}
                           </div>
                         ) : (
                           <div className="text-center py-4">
                             <div className="text-gray-400 dark:text-gray-500 text-sm">
                               No roles assigned
                             </div>
                             <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                               Click Assign to add to roles
                             </div>
                           </div>
                         )}
                       </div>
                     </div>

                     {/* Action Buttons */}
                     <div className="px-6 pb-6 pt-2">
                       <div className="flex gap-2">
                         <button
                           onClick={() => {
                             setPermForm({ name: permission.name, description: permission.description });
                             setEditPermId(permission.id);
                             setShowEditPermModal(true);
                           }}
                           className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-all duration-200 flex items-center justify-center gap-2 font-medium"
                           title="Edit permission details"
                         >
                           <Edit className="w-4 h-4" />
                           Edit
                         </button>
                         <button
                           onClick={() => {
                             setAssignPermId(permission.id);
                             const preselected = availableRoles.filter(r => r.permissions.includes(permission.id)).map(r => r.id);
                             setAssignPermRoles(preselected);
                             setShowAssignPermModal(true);
                           }}
                           className="px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-all duration-200 flex items-center justify-center gap-2 font-medium"
                           title="Assign permission to roles"
                         >
                           <Shield className="w-4 h-4" />
                           Assign
                         </button>
                         <button
                           onClick={() => setPermDeleteConfirm({ id: permission.id, name: permission.name })}
                           className="px-4 py-2.5 rounded-lg text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 flex items-center justify-center"
                           title="Delete permission"
                           disabled={assignedRoles.length > 0}
                         >
                           <Trash2 className="w-4 h-4" />
                         </button>
                       </div>
                       {assignedRoles.length > 0 && (
                         <div className="mt-2 text-xs text-blue-600 dark:text-blue-400 text-center">
                           Cannot delete permission assigned to roles
                         </div>
                       )}
                     </div>
                   </div>
                 );
               })}
             </div>

             {/* Empty State */}
             {permissions.length === 0 && (
               <div className="text-center py-12">
                 <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-6">
                   <Settings className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                 </div>
                 <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No permissions found</h3>
                 <p className="text-gray-600 dark:text-gray-400 mb-6">Create your first permission to define system access controls</p>
                 <button
                   onClick={() => {
                     setPermForm({ name: '', description: '' });
                     setShowPermModal(true);
                   }}
                   className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                 >
                   Create Permission
                 </button>
               </div>
             )}
           </div>
         )}
       </main>

       {/* Create User Modal */}
       <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create New User">
         <form onSubmit={(e) => {
           console.log('📝 Form onSubmit triggered');
           handleCreateUser(e);
         }} autoComplete="off" className="space-y-2.5 text-[12px] sm:text-[14px]">
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4">
             <div>
               <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">Full Name<span className="text-red-500">*</span></label>
               <input
                 type="text"
                 value={createForm.fullName}
                 onChange={e => {
                   setCreateForm({ ...createForm, fullName: e.target.value });
                   // Only validate if field has been touched
                   if (touchedFields.fullName) {
                   setCreateFormErrors(errors => ({ ...errors, fullName: validateFullName(e.target.value, true, 2, 50) }));
                   }
                 }}
                 onBlur={() => {
                   setTouchedFields(prev => ({ ...prev, fullName: true }));
                   setCreateFormErrors(errors => ({ ...errors, fullName: validateFullName(createForm.fullName, true, 2, 50) }));
                 }}
                 required
                 className={`w-full px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${createFormErrors.fullName === 'Valid name.' ? 'border-green-500 dark:border-green-400' : createFormErrors.fullName ? 'border-red-500 dark:border-red-400' : 'border-gray-200 dark:border-gray-600'}`}
                 aria-invalid={!!createFormErrors.fullName && createFormErrors.fullName !== 'Valid name.'}
                 aria-describedby="fullName-msg"
               />
               <div id="fullName-msg" className={`text-[11px] sm:text-xs ${createFormErrors.fullName === 'Valid name.' ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>{createFormErrors.fullName}</div>
             </div>
             <div>
               <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">Email Address<span className="text-red-500">*</span></label>
               <input
                 type="email"
                 value={createForm.email}
                 onChange={e => {
                   setCreateForm({ ...createForm, email: e.target.value });
                   // Only validate if field has been touched
                   if (touchedFields.email) {
                   setCreateFormErrors(errors => ({ ...errors, email: validateEmailField(e.target.value) }));
                   }
                 }}
                 onBlur={() => {
                   setTouchedFields(prev => ({ ...prev, email: true }));
                   setCreateFormErrors(errors => ({ ...errors, email: validateEmailField(createForm.email) }));
                 }}
                 autoComplete="off"
                 required
                 className={`w-full px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${createFormErrors.email === 'Email address is valid.' ? 'border-green-500 dark:border-green-400' : createFormErrors.email ? 'border-red-500 dark:border-red-400' : 'border-gray-200 dark:border-gray-600'}`}
                 aria-invalid={!!createFormErrors.email && createFormErrors.email !== 'Email address is valid.'}
                 aria-describedby="email-msg"
               />
               <div id="email-msg" className={`text-[11px] sm:text-xs ${createFormErrors.email === 'Email address is valid.' ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>{createFormErrors.email}</div>
             </div>
           </div>

           <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4">
             <div>
               <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">Mobile Number</label>
               <input
                 type="text"
                 value={createForm.mobile}
                 onChange={e => {
                   setCreateForm({ ...createForm, mobile: e.target.value });
                   // Only validate if field has been touched
                   if (touchedFields.mobile) {
                   setCreateFormErrors(errors => ({ ...errors, mobile: validateMobileNumber(e.target.value) }));
                   }
                 }}
                 onBlur={() => {
                   setTouchedFields(prev => ({ ...prev, mobile: true }));
                   setCreateFormErrors(errors => ({ ...errors, mobile: validateMobileNumber(createForm.mobile) }));
                 }}
                 required
                 className={`w-full px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${createFormErrors.mobile === 'Valid mobile number.' ? 'border-green-500 dark:border-green-400' : createFormErrors.mobile ? 'border-red-500 dark:border-red-400' : 'border-gray-200 dark:border-gray-600'}`}
                 aria-invalid={!!createFormErrors.mobile && createFormErrors.mobile !== 'Valid mobile number.'}
                 aria-describedby="mobile-msg"
               />
               <div id="mobile-msg" className={`text-[11px] sm:text-xs ${createFormErrors.mobile === 'Valid mobile number.' ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>{createFormErrors.mobile}</div>
             </div>
             <div>
               <label className="flex items-center text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">
                 Password<span className="text-red-500">*</span>
                 <Tooltip text="Create a strong password with at least 8 characters including uppercase letters, lowercase letters, numbers, and special characters. Example: MySecureP@ssw0rd">
                   <HelpCircle className="h-4 w-4 ml-1 text-gray-400 cursor-help" />
                 </Tooltip>
               </label>
               <div className="relative">
                 <input
                   type={showPassword ? "text" : "password"}
                   value={createForm.password}
                   onChange={(e) => {
                     setCreateForm({ ...createForm, password: e.target.value });
                     // Only validate if field has been touched
                     if (touchedFields.password) {
                     setCreateFormErrors(errors => ({ ...errors, password: validatePasswordField(e.target.value) }));
                     }
                   }}
                   onBlur={() => {
                     setTouchedFields(prev => ({ ...prev, password: true }));
                     setCreateFormErrors(errors => ({ ...errors, password: validatePasswordField(createForm.password) }));
                   }}
                   autoComplete="new-password"
                   required
                   className={`w-full px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${createFormErrors.password === 'Valid password.' ? 'border-green-500 dark:border-green-400' : createFormErrors.password ? 'border-red-500 dark:border-red-400' : 'border-gray-200 dark:border-gray-600'}`}
                   aria-invalid={!!createFormErrors.password && createFormErrors.password !== 'Valid password.'}
                   aria-describedby="password-msg password-reqs"
                 />
                 <button
                   type="button"
                   onClick={() => setShowPassword(!showPassword)}
                   className="absolute inset-y-0 right-0 pr-3 flex items-center"
                 >
                   {showPassword ? (
                     <EyeOff className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                   ) : (
                     <Eye className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                   )}
                 </button>
               </div>
               {createFormErrors.password && (
                 <div
                   className={`text-[11px] sm:text-xs mt-1 ${createFormErrors.password === 'Valid password.' ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}
                   id="password-msg"
                 >
                   {createFormErrors.password}
                 </div>
               )}
               {!createFormErrors.password && (
                 <div className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1" id="password-reqs">
                   Use a strong password (min 8 characters). Example: MySecureP@ssw0rd
                 </div>
               )}
             </div>
           </div>

          <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">Login Type<span className="text-red-500">*</span></label>
              <select
                value={createForm.loginFlag}
                onChange={(e) => {
                  setCreateForm({ ...createForm, loginFlag: e.target.value, emp_id: '' });
                  setCreateFormErrors(errors => ({ ...errors, emp_id: validateEmployeeId('', e.target.value) }));
                }}
                className="w-full px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="employee">Employee</option>
                <option value="users">Users</option>
              </select>
            </div>
            {createForm.loginFlag === 'employee' && (
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">Employee ID<span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={createForm.emp_id}
                  onChange={(e) => {
                    setCreateForm({ ...createForm, emp_id: e.target.value });
                    // Only validate if field has been touched
                    if (touchedFields.emp_id) {
                    setCreateFormErrors(errors => ({ ...errors, emp_id: validateEmployeeId(e.target.value, createForm.loginFlag) }));
                    }
                  }}
                  onBlur={() => {
                    setTouchedFields(prev => ({ ...prev, emp_id: true }));
                    setCreateFormErrors(errors => ({ ...errors, emp_id: validateEmployeeId(createForm.emp_id, createForm.loginFlag) }));
                  }}
                  placeholder="e.g., EMP001, DEV-123"
                  className={`w-full px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${createFormErrors.emp_id === 'Valid employee ID.' ? 'border-green-500 dark:border-green-400' : createFormErrors.emp_id ? 'border-red-500 dark:border-red-400' : 'border-gray-200 dark:border-gray-600'}`}
                  aria-invalid={!!createFormErrors.emp_id && createFormErrors.emp_id !== 'Valid employee ID.'}
                  aria-describedby="emp_id-msg"
                />
                <div id="emp_id-msg" className={`text-[11px] sm:text-xs ${createFormErrors.emp_id === 'Valid employee ID.' ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>{createFormErrors.emp_id}</div>
              </div>
            )}
          </div>

           <div>
             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Roles<span className="text-red-500">*</span></label>
             <div 
               className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-2"
               onBlur={() => {
                 setTouchedFields(prev => ({ ...prev, roleIds: true }));
                 setCreateFormErrors(errors => ({ 
                   ...errors, 
                   roleIds: selectedRoleIds.length === 0 ? 'Select at least one role' : '' 
                 }));
               }}
             >
              {availableRoles.map(role => {
                const isSuperAdmin = /super.*admin|admin.*super/i.test(role.name);
                const isDisabled = isSuperAdmin && hasSuperAdmin;
                
                return (
                  <label 
                    key={role.id} 
                    className={`flex items-center text-[12px] sm:text-[14px] ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <input
                      type="checkbox"
                      value={role.id}
                      checked={selectedRoleIds.includes(role.id)}
                      onChange={handleRoleChange}
                      disabled={isDisabled}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <span className={`ml-2 block truncate ${isDisabled ? 'text-gray-500 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                      {role.name}
                      {isDisabled && <span className="ml-1 text-[10px] text-gray-400">(Already exists)</span>}
                    </span>
                  </label>
                );
              })}
             </div>
             {createFormErrors.roleIds && <div className="text-xs text-red-600 dark:text-red-400 mt-1">{createFormErrors.roleIds}</div>}
           </div>

           <div className="flex flex-row sm:flex-row justify-between gap-2.5 sm:gap-3 pt-3 sm:pt-4 flex-nowrap">
             <button
               type="button"
               onClick={() => setShowCreateModal(false)}
               className="flex-1 sm:w-auto px-3 py-2 sm:px-4 sm:py-2 text-sm sm:text-base rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
             >
               Close
             </button>
            <button 
              type="submit" 
              disabled={isLoadingAction || !createForm.fullName.trim() || !createForm.email.trim() || !createForm.mobile.trim() || !createForm.password.trim() || !selectedRoleIds.length || (createForm.loginFlag === 'employee' && !createForm.emp_id.trim())}
              className={`flex-1 sm:w-auto px-3 py-2 sm:px-4 sm:py-2 text-sm sm:text-base rounded-lg text-white ${
                isLoadingAction || !createForm.fullName.trim() || !createForm.email.trim() || !createForm.mobile.trim() || !createForm.password.trim() || !selectedRoleIds.length || (createForm.loginFlag === 'employee' && !createForm.emp_id.trim())
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500'
              }`}>
               {isLoadingAction ? 'Creating...' : 'Create User'}
             </button>
           </div>
         </form>
       </Modal>

       {/* Edit User Modal */}
       <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit User">
         <form onSubmit={handleEditUser} className="space-y-4">
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
               <input
                 type="text"
                 value={editForm.fullName}
                 onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                 required
                 className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
               />
               {editFormErrors.fullName && <div className="text-xs text-red-600 mt-1">{editFormErrors.fullName}</div>}
             </div>
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
               <input
                 type="email"
                 value={editForm.email}
                 onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                 required
                 className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
               />
               {editFormErrors.email && <div className="text-xs text-red-600 mt-1">{editFormErrors.email}</div>}
             </div>
           </div>

           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Mobile</label>
               <input
                 type="text"
                 value={editForm.mobile}
                 onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
                 required
                 className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
               />
               {editFormErrors.mobile && <div className="text-xs text-red-600 mt-1">{editFormErrors.mobile}</div>}
             </div>
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Login Type</label>
               <select
                 value={editForm.loginFlag}
                 onChange={(e) => setEditForm({ ...editForm, loginFlag: e.target.value })}
                 className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
               >
                 <option value="employee">Employee</option>
                 <option value="users">Users</option>
               </select>
             </div>
           </div>

           {editForm.loginFlag === 'employee' && (
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID<span className="text-red-500">*</span></label>
               <input
                 type="text"
                 value={editForm.emp_id}
                 onChange={(e) => setEditForm({ ...editForm, emp_id: e.target.value })}
                 placeholder="e.g., EMP001, DEV-123"
                 className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
               />
               {editFormErrors.emp_id && <div className="text-xs text-red-600 mt-1">{editFormErrors.emp_id}</div>}
             </div>
           )}

           <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Roles</label>
             <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
               {availableRoles.map((role, idx) => (
                 <div key={role.id ?? `role-idx-${idx}`} className="flex items-center">
                   <input
                     type="checkbox"
                     id={`edit-role-${role.id}`}
                     checked={editForm.roleIds.includes(role.id)}
                     onChange={(e) => {
                       const id = role.id;
                       if (e.target.checked) {
                         setEditForm({ ...editForm, roleIds: addUniqueRoleId(editForm.roleIds, id) })
                       } else {
                         setEditForm({ ...editForm, roleIds: editForm.roleIds.filter((rid) => rid !== id) })
                       }
                     }}
                     className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                   />
                   <label htmlFor={`edit-role-${role.id}`} className="ml-2 block text-sm text-gray-900">
                     {role.name}
                   </label>
                 </div>
               ))}
             </div>
             {editFormErrors.roleIds && <div className="text-xs text-red-600 mt-1">{editFormErrors.roleIds}</div>}
           </div>

           {/* Effective Permissions Section in Edit User Modal */}
           {showEditModal && selectedUser && (
             <div className="mt-6">
               <h4 className="text-base font-semibold text-gray-800 mb-2 flex items-center gap-2">
                 <Settings className="w-4 h-4 text-blue-600" />
                 Effective Permissions
               </h4>
               <div className="flex flex-wrap gap-2">
                 {(() => {
                   // Aggregate permissions from all assigned roles
                   const userRoleIds = editForm.roleIds.length > 0 ? editForm.roleIds : selectedUser.roleIds;
                   const userRoles = availableRoles.filter(r => userRoleIds.includes(r.id));
                   const permIds = Array.from(new Set(userRoles.flatMap(r => r.permissions)));
                   if (permIds.length === 0) {
                     return <span className="text-sm text-gray-500 italic">No permissions assigned via roles</span>;
                   }
                   return permIds.map(pid => {
                     const perm = permissions.find(p => p.id === pid);
                     if (!perm) return null;
                     return (
                       <span
                         key={pid}
                         className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200 transition-colors cursor-pointer"
                         title={perm.description}
                       >
                         {perm.name}
                       </span>
                     );
                   });
                 })()}
               </div>
             </div>
           )}

           <div className="flex justify-end gap-3 pt-4">
             <button
               type="button"
               onClick={() => setShowEditModal(false)}
               className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
             >
               Close
             </button>
             <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500">
               Update User
             </button>
           </div>
         </form>
       </Modal>

       {/* Create Role Modal */}
       <Modal
         isOpen={showRoleModal}
         onClose={() => setShowRoleModal(false)}
         title="Create New Role"
       >
         <form onSubmit={handleCreateRole} className="space-y-4">
           <div>
             <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Create New Role</h2>
             <p className="text-gray-500 dark:text-gray-300 mb-4">Add a new role with permissions.</p>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" title="Enter a unique name for this role (e.g., IT Admin, HR Manager)">Role Name</label>
               <div className="relative">
               <input
                 type="text"
                 value={roleForm.name}
                 onChange={(e) => {
                   const value = e.target.value;
                   const formattedValue = value.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                   setRoleForm({ ...roleForm, name: formattedValue });
                 }}
                 required
                 title="Enter a unique name for this role (e.g., IT Admin, HR Manager)."
                 placeholder="e.g., IT Admin, HR Manager"
                   aria-describedby="role-name-help role-name-counter"
                   className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${
                     roleForm.name.trim().length === 0
                   ? 'border-gray-200 dark:border-gray-600'
                       : roleNameValidation.isValid 
                         ? 'border-green-500 dark:border-green-400' 
                         : 'border-red-500 dark:border-red-400'
                   }`}
                 />
               </div>
               <p id="role-name-help" className={`mt-1 text-xs ${
                 roleForm.name.trim().length === 0 
                   ? 'text-gray-500 dark:text-gray-400' 
                   : roleNameValidation.isValid 
                     ? 'text-blue-600 dark:text-blue-400' 
                     : 'text-red-600 dark:text-red-400'
               }`}>
                 {roleForm.name.trim().length === 0
                   ? 'Name must be unique and at least 3 characters. Example: IT Admin'
                   : roleNameValidation.message}
               </p>
             </div>
             <div>
               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" title="Describe this role's purpose (e.g., Responsible for HR operations)">Description</label>
               <div className="relative">
               <textarea
                 value={roleForm.description}
                 onChange={(e) => {
                   const value = e.target.value;
                   const formattedValue = value.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                   setRoleForm({ ...roleForm, description: formattedValue });
                 }}
                 required
                 title="Describe this role's purpose (e.g., Responsible for HR operations)."
                   aria-describedby="role-description-help role-description-counter"
                 rows={3}
                 placeholder="e.g., Responsible for HR operations"
                   className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none ${
                     roleForm.description.trim().length === 0
                   ? 'border-gray-200 dark:border-gray-600'
                       : descriptionValidation.isValid 
                         ? 'border-green-500 dark:border-green-400' 
                         : 'border-red-500 dark:border-red-400'
                   }`}
                 />
               </div>
               <p id="role-description-help" className={`mt-1 text-xs ${
                 roleForm.description.trim().length === 0 
                   ? 'text-gray-500 dark:text-gray-400' 
                   : descriptionValidation.isValid 
                     ? 'text-blue-600 dark:text-blue-400' 
                     : 'text-red-600 dark:text-red-400'
               }`}>
                 {roleForm.description.trim().length === 0
                   ? 'Provide a description of at least 10 characters.'
                   : descriptionValidation.message}
               </p>
             </div>
           </div>
           <div>
             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Permissions</label>
             <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
               <div className="col-span-full flex items-center gap-2 mb-2">
                 <button 
                   type="button" 
                   onClick={() => setRoleForm(r => ({ ...r, permissions: Array.from(new Set([...(r.permissions || []), ...permissions.map(p => p.name)])) }))} 
                   className="text-xs px-3 py-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:bg-white dark:text-gray-900 dark:border-gray-300 dark:hover:bg-gray-100 transition-colors"
                 >
                   Select All
                 </button>
                 <button 
                   type="button" 
                   onClick={() => setRoleForm(r => ({ ...r, permissions: [] }))} 
                   className="text-xs px-3 py-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:bg-white dark:text-gray-900 dark:border-gray-300 dark:hover:bg-gray-100 transition-colors"
                 >
                   Deselect All
                 </button>
                 <span className="text-xs text-gray-500 dark:text-gray-400">
                   {roleForm.permissions.length} of {permissions.length} selected
                 </span>
               </div>
               {permissions.map((permission, idx) => (
                 <div key={permission.id ?? `perm-idx-${idx}`} className="flex items-center">
                   <input
                     type="checkbox"
                     id={`perm-${permission.id ?? `perm-idx-${idx}`}`}
                     checked={(roleForm.permissions ?? []).includes(permission.name)}
                     onChange={(e) => {
                       if (e.target.checked) {
                         setRoleForm({ ...roleForm, permissions: [...roleForm.permissions, permission.name] })
                       } else {
                         setRoleForm({
                           ...roleForm,
                           permissions: roleForm.permissions.filter((p) => p !== permission.name),
                         })
                       }
                     }}
                     className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded"
                   />
                   <label htmlFor={`perm-${permission.id ?? `perm-idx-${idx}`}`} className="ml-2 block text-sm text-gray-900 dark:text-gray-100">
                     <span className="font-medium">{getPermissionDisplayName(permission.name)}</span>
                     <span className="block text-xs text-gray-500 dark:text-gray-400">{permission.description || `${permission.name} permission`}</span>
                   </label>
                 </div>
               ))}
             </div>
             {!permissionsValidation.isValid && roleForm.permissions.length > 0 && (
               <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                 {permissionsValidation.message}
               </p>
             )}
             
             {/* System Admin Warning */}
             {shouldWarnAboutSystemAdmin && (
               <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                 <div className="flex items-start gap-2">
                   <Info className="w-4 h-4 text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                   <div className="text-sm text-yellow-800 dark:text-yellow-200">
                     <p className="font-medium">System Admin Selected</p>
                     <p>You have selected both &apos;system:admin&apos; and other permissions. The &apos;system:admin&apos; permission typically grants full access, making other permissions redundant.</p>
                   </div>
                 </div>
               </div>
             )}
           </div>
           
           {/* Route Selection */}
           <div>
             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Routes</label>
             <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
               <div className="col-span-full flex items-center gap-2 mb-2">
                 <button 
                   type="button" 
                   onClick={() => setRoleForm(r => ({ ...r, route_paths: Array.from(new Set([...(r.route_paths || []), ...frontendRoutes.map(route => route.path)])) }))} 
                   className="text-xs px-3 py-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:bg-white dark:text-gray-900 dark:border-gray-300 dark:hover:bg-gray-100 transition-colors"
                 >
                   Select All Routes
                 </button>
                 <button 
                   type="button" 
                   onClick={() => setRoleForm(r => ({ ...r, route_paths: [] }))} 
                   className="text-xs px-3 py-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:bg-white dark:text-gray-900 dark:border-gray-300 dark:hover:bg-gray-100 transition-colors"
                 >
                   Deselect All Routes
                 </button>
                 <span className="text-xs text-gray-500 dark:text-gray-400">
                   {roleForm.route_paths.length} of {frontendRoutes.length} selected
                 </span>
               </div>
               {frontendRoutes.map((route) => (
                 <div key={route.id} className="flex items-center">
                   <input
                     type="checkbox"
                     id={`route-${route.id}`}
                     checked={(roleForm.route_paths ?? []).includes(route.path)}
                     onChange={(e) => {
                       if (e.target.checked) {
                         setRoleForm({ ...roleForm, route_paths: [...roleForm.route_paths, route.path] })
                       } else {
                         setRoleForm({
                           ...roleForm,
                           route_paths: roleForm.route_paths.filter((p) => p !== route.path),
                         })
                       }
                     }}
                     className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded"
                   />
                   <label htmlFor={`route-${route.id}`} className="ml-2 block text-sm text-gray-900 dark:text-gray-100">
                     <span className="font-medium">{route.route_name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                   </label>
                 </div>
               ))}
             </div>
           </div>
           
           <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
             <button
               type="button"
               onClick={() => {
                 setShowRoleModal(false);
                 setRoleForm({ name: '', description: '', permissions: [], route_paths: [] });
               }}
               className="w-full sm:w-auto px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
             >
               Close
             </button>
             <button
               type="submit"
               disabled={!isCreateRoleValid || isLoadingAction}
               className={`w-full sm:w-auto px-4 py-2 rounded-lg text-white flex items-center gap-2 justify-center transition-colors ${
                 !isCreateRoleValid || isLoadingAction 
                   ? 'bg-gray-400 cursor-not-allowed' 
                   : 'bg-blue-600 hover:bg-blue-700'
               }`}
             >
               {isLoadingAction ? (
                 <>
                   <RefreshCw className="w-4 h-4 animate-spin" />
                   Creating...
                 </>
               ) : (
                 'Create Role'
               )}
             </button>
           </div>
         </form>
       </Modal>

       {/* Edit Role Modal */}
       <Modal
         isOpen={showEditRoleModal}
         onClose={() => {
           setShowEditRoleModal(false);
           setEditRoleId(null);
           setRoleForm({ name: '', description: '', permissions: [], route_paths: [] });
         }}
         title="Edit Role"
       >
         <form onSubmit={handleEditRole} className="space-y-4">
           <div>
             <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Edit Role</h2>
             <p className="text-gray-500 dark:text-gray-300 mb-4">Update role information and permissions.</p>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role Name</label>
               <input
                 type="text"
                 value={roleForm.name}
                 onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                 required
                 placeholder="e.g., IT Admin, HR Manager"
                 className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
               />
             </div>
             <div>
               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
               <textarea
                 value={roleForm.description}
                 onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                 required
                 rows={3}
                 placeholder="e.g., Responsible for HR operations"
                 className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
               />
             </div>
           </div>
           <div>
             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Permissions</label>
             <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
               {permissions.map((permission, idx) => (
                 <div key={permission.id ?? `perm-idx-${idx}`} className="flex items-center">
                   <input
                     type="checkbox"
                     id={`edit-role-perm-${permission.id ?? `perm-idx-${idx}`}`}
                     checked={(roleForm.permissions ?? []).includes(permission.name)}
                     onChange={(e) => {
                       if (e.target.checked) {
                         setRoleForm({ ...roleForm, permissions: [...roleForm.permissions, permission.name] })
                       } else {
                         setRoleForm({
                           ...roleForm,
                           permissions: roleForm.permissions.filter((p) => p !== permission.name),
                         })
                       }
                     }}
                     className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded"
                   />
                   <label htmlFor={`edit-role-perm-${permission.id ?? `perm-idx-${idx}`}`} className="ml-2 block text-sm text-gray-900 dark:text-gray-100">
                     <span className="font-medium">{getPermissionDisplayName(permission.name)}</span>
                     <span className="block text-xs text-gray-500 dark:text-gray-400">{permission.description || `${permission.name} permission`}</span>
                   </label>
                 </div>
               ))}
             </div>
           </div>
           <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
             <button
               type="button"
               onClick={() => {
                 setShowEditRoleModal(false);
                 setEditRoleId(null);
                 setRoleForm({ name: '', description: '', permissions: [], route_paths: [] });
               }}
               className="w-full sm:w-auto px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
             >
               Cancel
             </button>
             <button
               type="submit"
               className="w-full sm:w-auto px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2 justify-center"
             >
               <Edit className="w-4 h-4" />
               Update Role
             </button>
           </div>
         </form>
       </Modal>

       {/* Create Permission Modal */}
       <Modal
         isOpen={showPermModal}
         onClose={() => {
           setShowPermModal(false);
           setPermForm({ name: '', description: '' });
         }}
         title="Create New Permission"
       >
         <form onSubmit={handleCreatePermission} className="space-y-4">
           <div>
             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" title="System identifier for this permission. Must be unique. Use colon format (e.g., user:create)">Permission Name</label>
             <input
               type="text"
               value={permForm.name}
               onChange={(e) => setPermForm({ ...permForm, name: e.target.value.trim().toLowerCase() })}
               placeholder="e.g., user:create"
               required
               title="System identifier for this permission. Must be unique. Use colon format (e.g., user:create)."
               aria-describedby="perm-name-help"
               className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${permForm.name.trim().length === 0
                 ? 'border-gray-200 dark:border-gray-600'
                 : (isValidPermissionName ? 'border-green-500 dark:border-green-400' : 'border-red-500 dark:border-red-400')}`}
             />
             <p id="perm-name-help" className={`text-xs mt-1 ${permForm.name.trim().length === 0 ? 'text-gray-500 dark:text-gray-400' : (isValidPermissionName ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400')}`}>
               {permForm.name.trim().length === 0
                 ? 'Use colon format resource:action, lowercase, no spaces (e.g., user:create)'
                 : (isValidPermissionName ? 'Looks good!' : (existingPermissionNames.has(permForm.name.trim().toLowerCase()) ? 'Permission already exists.' : 'Invalid format. Use resource:action (e.g., user:create).'))}
             </p>
           </div>
           <div>
             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
             <textarea
               value={permForm.description}
               onChange={(e) => setPermForm({ ...permForm, description: e.target.value })}
               placeholder="Describe what this permission allows users to do"
               required
               rows={3}
               title="Describe clearly what this permission allows. Example: Grants ability to delete user accounts."
               aria-describedby="perm-desc-help"
               className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none ${permForm.description.trim().length === 0
                 ? 'border-gray-200 dark:border-gray-600'
                 : (isValidPermissionDescription ? 'border-green-500 dark:border-green-400' : 'border-red-500 dark:border-red-400')}`}
             />
             <p id="perm-desc-help" className={`text-xs mt-1 ${permForm.description.trim().length === 0 ? 'text-gray-500 dark:text-gray-400' : (isValidPermissionDescription ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400')}`}>
               {permForm.description.trim().length === 0 ? 'Provide at least 10 characters.' : (isValidPermissionDescription ? 'Looks good!' : 'Description must be at least 10 characters.')}
             </p>
           </div>
           <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
             <button
               type="button"
               onClick={() => {
                 setShowPermModal(false);
                 setPermForm({ name: '', description: '' });
               }}
               className="w-full sm:w-auto px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
             >
               Cancel
             </button>
             <button
               type="submit"
               className="w-full sm:w-auto px-4 py-2 rounded-lg text-white flex items-center gap-2 justify-center bg-blue-600 hover:bg-blue-700"
             >
               Create Permission
             </button>
           </div>
         </form>
       </Modal>

       {/* Edit Permission Modal */}
       <Modal
         isOpen={showEditPermModal}
         onClose={() => {
           setShowEditPermModal(false);
           setEditPermId(null);
           setPermForm({ name: '', description: '' });
         }}
         title="Edit Permission"
       >
         <form onSubmit={handleEditPermission} className="space-y-4">
           <div>
             <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Edit Permission</h2>
             <p className="text-gray-500 dark:text-gray-300 mb-4">Update permission information and description.</p>
           </div>
           <div>
             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" title="System identifier for this permission. Must be unique. Use colon format (e.g., user:create)">Permission Name</label>
             <input
               type="text"
               value={permForm.name}
               onChange={(e) => setPermForm({ ...permForm, name: e.target.value.trim().toLowerCase() })}
               placeholder="e.g., user:create"
               required
               title="System identifier for this permission. Must be unique. Use colon format (e.g., user:create)."
               className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
             />
             <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Use colon format resource:action, lowercase, no spaces (e.g., user:create)</p>
           </div>
           <div>
             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
             <textarea
               value={permForm.description}
               onChange={(e) => setPermForm({ ...permForm, description: e.target.value })}
               placeholder="Describe what this permission allows users to do"
               required
               rows={3}
               title="Describe clearly what this permission allows. Example: Grants ability to delete user accounts."
               className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
             />
           </div>
           <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
             <button
               type="button"
               onClick={() => {
                 setShowEditPermModal(false);
                 setEditPermId(null);
                 setPermForm({ name: '', description: '' });
               }}
               className="w-full sm:w-auto px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
             >
               Cancel
             </button>
             <button
               type="submit"
               disabled={!isCreatePermissionValid}
               className={`w-full sm:w-auto px-4 py-2 rounded-lg text-white flex items-center gap-2 justify-center ${!isCreatePermissionValid ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
             >
               <Edit className="w-4 h-4" />
               Update Permission
             </button>
           </div>
         </form>
       </Modal>

       {/* Assign Permission Modal */}
       <Modal
         isOpen={showAssignPermModal}
         onClose={() => {
           setShowAssignPermModal(false);
           setAssignPermId(null);
           setAssignPermRoles([]);
         }}
         title="Assign Permission to Roles"
       >
         <form
           onSubmit={async (e) => {
             e.preventDefault();
             if (!assignPermId) return;
             try {
               // Update each role's permissions set based on selection
               const updatePromises = availableRoles.map(async (role) => {
                 const hasPerm = role.permissions.includes(assignPermId);
                 const shouldHave = assignPermRoles.includes(role.id);
                 if (hasPerm === shouldHave) return null;
                 const newPermissions = shouldHave
                   ? Array.from(new Set([...role.permissions, assignPermId]))
                   : role.permissions.filter((pid) => pid !== assignPermId);

                 const res = await fetch(`/api/v1/roles/${role.id}`, {
                   method: 'PUT',
                   headers: getAuthHeaders(),
                   body: JSON.stringify({
                     name: role.name,
                     description: role.description,
                     permissions: newPermissions,
                   }),
                 });
                 if (!res.ok) throw new Error('Failed to update role');
                 return res;
               });
               await Promise.all(updatePromises);
               await fetchRoles();
               await fetchPermissions();
               showSuccessAlert('Permission assignments updated');
               setShowAssignPermModal(false);
             } catch {
               showErrorAlert('Failed to assign permission');
             }
           }}
           className="space-y-4"
         >
           <div>
             <p className="text-gray-600 dark:text-gray-300 mb-3">Select roles that should include this permission.</p>
             <div className="max-h-64 overflow-auto border border-gray-200 dark:border-gray-700 rounded-md p-2">
               {availableRoles.length === 0 ? (
                 <div className="text-sm text-gray-500 dark:text-gray-400 p-2">No roles available.</div>
               ) : (
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                   {availableRoles.map((role) => {
                     const checked = assignPermRoles.includes(role.id);
                     return (
                       <label key={role.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer">
                         <input
                           type="checkbox"
                           checked={checked}
                           onChange={(e) => {
                             const isChecked = e.target.checked;
                             setAssignPermRoles((prev) =>
                               isChecked ? Array.from(new Set([...prev, role.id])) : prev.filter((id) => id !== role.id)
                             );
                           }}
                           className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                         />
                         <span className="text-sm text-gray-800 dark:text-gray-200">{role.name}</span>
                       </label>
                     );
                   })}
                 </div>
               )}
             </div>
           </div>
           <div className="flex justify-end gap-3 pt-2">
             <button
               type="button"
               onClick={() => {
                 setShowAssignPermModal(false);
                 setAssignPermId(null);
                 setAssignPermRoles([]);
               }}
               className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
             >
               Cancel
             </button>
             <button
               type="submit"
               className="px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700"
             >
               Save Assignments
             </button>
           </div>
         </form>
       </Modal>
     </div>
     {showAlert && (
       <Alert
         variant={alertVariant}
         title={alertTitle ?? (alertVariant === 'success' ? 'Success!' : alertVariant === 'error' ? 'Error!' : 'Info')}
         message={alertMessage}
         showLink={false}
       />
     )}
     {/* Bulk Actions Confirmation Modal */}
     <Modal
       isOpen={!!bulkConfirmAction}
       onClose={() => isLoadingAction ? undefined : setBulkConfirmAction(null)}
       title="Confirm Bulk Action"
     >
       <p className="text-sm text-gray-700 dark:text-gray-300">
         Are you sure you want to {bulkConfirmAction} {selectedUsers.length} selected user{selectedUsers.length !== 1 ? 's' : ''}?
       </p>
       <div className="flex justify-end gap-3 mt-6">
         <button
           onClick={() => setBulkConfirmAction(null)}
           disabled={isLoadingAction}
           className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
         >
           Cancel
         </button>
         <button
           onClick={async () => {
             if (!bulkConfirmAction) return;
             setIsLoadingAction(true);
             try {
               // Execute action here (API call placeholder)
               setSelectedUsers([]);
               await fetchUsers();
               const pastText = { delete: 'deleted', activate: 'activated', deactivate: 'deactivated' }[bulkConfirmAction];
               showSuccessAlert(`${selectedUsers.length} user(s) ${pastText} successfully`);
             } catch {
               const presentText = { delete: 'delete', activate: 'activate', deactivate: 'deactivate' }[bulkConfirmAction];
               showErrorAlert(`Failed to ${presentText} selected users`);
             } finally {
               setIsLoadingAction(false);
               setBulkConfirmAction(null);
             }
           }}
           disabled={isLoadingAction}
           className="px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
         >
           Confirm
         </button>
       </div>
     </Modal>
     {/* Delete Confirmation Modal (Customers style) */}
     <Modal isOpen={!!deleteConfirm} onClose={() => isDeletingUser ? undefined : setDeleteConfirm(null)} title="Delete User">
       <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Delete User</h3>
       <p className="text-gray-900 dark:text-white">Are you sure you want to delete <span className="font-semibold">{deleteConfirm?.name}</span>?</p>
       <p className="text-red-600 dark:text-red-400 font-semibold mt-1">This action cannot be undone.</p>
       <div className="flex justify-end gap-3 mt-6">
         <button
           onClick={() => setDeleteConfirm(null)}
           disabled={isDeletingUser}
           className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
         >
           Cancel
         </button>
         <button
           onClick={async () => {
             if (!deleteConfirm) return;
             setIsDeletingUser(true);
             try {
               await handleDeleteUser(deleteConfirm.id);
               setDeleteConfirm(null);
             } finally {
               setIsDeletingUser(false);
             }
           }}
           disabled={isDeletingUser}
           className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
         >
           {isDeletingUser ? 'Deleting...' : 'Delete'}
         </button>
       </div>
     </Modal>

        {/* Enhanced Routes Tab */}
        {activeTab === "routes" && (
          <div className="space-y-8">
            {/* Enhanced Header Section */}
            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 dark:from-gray-800 dark:via-gray-700 dark:to-gray-600 rounded-3xl p-8 border border-emerald-200 dark:border-gray-600 shadow-xl">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-500 rounded-full -translate-x-16 -translate-y-16"></div>
                <div className="absolute bottom-0 right-0 w-24 h-24 bg-teal-500 rounded-full translate-x-12 translate-y-12"></div>
                <div className="absolute top-1/2 right-1/4 w-16 h-16 bg-green-500 rounded-full"></div>
              </div>
              
              <div className="relative z-10">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl">
                        <Route className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                          Routes Management
                        </h2>
                        <p className="text-gray-600 dark:text-gray-300 mt-1">
                          Manage frontend routes and their role-based access permissions
                        </p>
                      </div>
                    </div>
                    
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                      <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl p-4 border border-white/20 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Total Routes</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{frontendRoutes.length}</p>
                          </div>
                        </div>
                      </div>
                      
                      
                      <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl p-4 border border-white/20 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                            <MapPin className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Mappings</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{roleRouteMappings.length}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => setShowCreateRouteModal(true)}
                      className="group flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-200" />
                      <span className="font-semibold">New Route</span>
                    </button>
                    <button
                      onClick={() => setShowRouteMappingModal(true)}
                      className="group flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      <Link className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
                      <span className="font-semibold">Assign Routes</span>
                    </button>
                    <button
                      onClick={handleRefresh}
                      className="group flex items-center gap-3 px-6 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 border border-gray-200 dark:border-gray-600"
                    >
                      <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                      <span className="font-semibold">Refresh</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Routes Table */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* Table Header with Search and Filters */}
              <div className="px-6 py-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                      <Globe className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        Frontend Routes
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300 mt-1">
                        Manage application routes and their access permissions
                      </p>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full text-sm font-semibold">
                      <span>{frontendRoutes.length}</span>
                      <span>routes</span>
                    </div>
                  </div>
                  
                  {/* Search and Filter Controls */}
                  <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Search routes..."
                        value={routeSearch}
                        onChange={(e) => setRouteSearch(e.target.value)}
                        className="pl-10 pr-4 py-2 w-full sm:w-64 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                      />
                    </div>
                    <button 
                      onClick={() => setShowRouteFilters(!showRouteFilters)}
                      className={`flex items-center gap-2 px-4 py-2 border rounded-xl transition-all duration-200 ${
                        showRouteFilters
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                          : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <Filter className="w-4 h-4" />
                      <span>Filter</span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${showRouteFilters ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Route Filters Panel */}
              {showRouteFilters && (
                <div className="mt-4 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl transition-all duration-300">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Filter by Path
                      </label>
                      <select
                        value={routePathFilter}
                        onChange={(e) => setRoutePathFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="all">All Paths</option>
                        <option value="/">Root Path (/)</option>
                        <option value="/api">API Routes</option>
                        <option value="/admin">Admin Routes</option>
                        <option value="/dashboard">Dashboard Routes</option>
                        <option value="/settings">Settings Routes</option>
                        <option value="/crm">CRM Routes</option>
                        <option value="/hr">HR Routes</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={() => {
                          setRoutePathFilter("all");
                          setRouteSearch("");
                        }}
                        className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
                      >
                        Reset Filters
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Enhanced Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <Hash className="w-4 h-4" />
                          Route Name
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          Path
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Description
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <Settings className="w-4 h-4" />
                          Actions
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {(() => {
                      const filteredRoutes = frontendRoutes.filter((route) => {
                        // Search filter
                        if (routeSearch.trim()) {
                          const searchLower = routeSearch.toLowerCase();
                          const matchesSearch = 
                            route.route_name.toLowerCase().includes(searchLower) ||
                            route.path.toLowerCase().includes(searchLower) ||
                            (route.description && route.description.toLowerCase().includes(searchLower));
                          if (!matchesSearch) return false;
                        }
                        
                        // Path filter
                        if (routePathFilter !== "all") {
                          if (routePathFilter === "/") {
                            if (route.path !== "/") return false;
                          } else {
                            if (!route.path.startsWith(routePathFilter)) return false;
                          }
                        }
                        
                        return true;
                      });
                      
                      if (filteredRoutes.length === 0) {
                        return (
                          <tr key="no-routes">
                            <td colSpan={4} className="px-6 py-12 text-center">
                              <div className="flex flex-col items-center justify-center">
                                <Search className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-4" />
                                <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">
                                  No routes found
                                </p>
                                <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                                  {routeSearch.trim() 
                                    ? `No routes match "${routeSearch}"`
                                    : 'No routes available'}
                                </p>
                              </div>
                            </td>
                          </tr>
                        );
                      }
                      
                      return filteredRoutes.map((route) => (
                        <tr key={route.id} className="group hover:bg-gradient-to-r hover:from-emerald-50 hover:to-green-50 dark:hover:from-gray-700 dark:hover:to-gray-600 transition-all duration-200">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-green-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                              {route.route_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
                                {route.route_name}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                ID: {route.id.slice(0, 8)}...
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <code className="text-sm bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-lg text-gray-800 dark:text-gray-200 font-mono border border-gray-200 dark:border-gray-600">
                              {route.path}
                            </code>
                            <button className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded">
                              <Copy className="w-3 h-3 text-gray-400" />
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="max-w-xs">
                            <div className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                              {route.description}
                            </div>
                            {route.description.length > 50 && (
                              <button className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 mt-1">
                                Read more
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setEditRouteId(route.id);
                                setRouteForm({
                                  route_name: route.route_name,
                                  path: route.path,
                                  description: route.description
                                });
                                setShowEditRouteModal(true);
                              }}
                              className="group/btn p-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200"
                              title="Edit Route"
                            >
                              <Edit className="w-4 h-4 group-hover/btn:scale-110 transition-transform duration-200" />
                            </button>
                            <button
                              onClick={() => setRouteDeleteConfirm({ id: route.id, route_name: route.route_name, path: route.path })}
                              className="group/btn p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200"
                              title="Delete Route"
                            >
                              <Trash2 className="w-4 h-4 group-hover/btn:scale-110 transition-transform duration-200" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedRouteDetails(route);
                                setShowRouteDetailsModal(true);
                              }}
                              className="group/btn p-2 text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-all duration-200"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4 group-hover/btn:scale-110 transition-transform duration-200" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
              
              {/* Table Footer */}
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {(() => {
                      const filteredCount = frontendRoutes.filter((route) => {
                        // Search filter
                        if (routeSearch.trim()) {
                          const searchLower = routeSearch.toLowerCase();
                          const matchesSearch = 
                            route.route_name.toLowerCase().includes(searchLower) ||
                            route.path.toLowerCase().includes(searchLower) ||
                            (route.description && route.description.toLowerCase().includes(searchLower));
                          if (!matchesSearch) return false;
                        }
                        
                        // Path filter
                        if (routePathFilter !== "all") {
                          if (routePathFilter === "/") {
                            if (route.path !== "/") return false;
                          } else {
                            if (!route.path.startsWith(routePathFilter)) return false;
                          }
                        }
                        
                        return true;
                      }).length;
                      return `Showing ${filteredCount} of ${frontendRoutes.length} routes`;
                    })()}
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200">
                      Previous
                    </button>
                    <button className="px-3 py-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200">
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </div>

              {/* Role-Route Mappings View Button */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-6 py-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-600">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                        <MapPin className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                          Role-Route Mappings
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300 mt-1">
                          View and manage role-based access to routes
                        </p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => setShowViewMappingsModal(true)}
                      className="group flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      <Eye className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
                      <span className="font-semibold">View Mappings</span>
                    </button>
                  </div>
                </div>
              </div>
           </div>
         )}

    {/* Enhanced Create Route Modal */}
    <Modal
      isOpen={showCreateRouteModal}
      onClose={() => {
        setShowCreateRouteModal(false);
        setRouteForm({ route_name: '', path: '', description: '' });
      }}
      title=""
    >
      <div className="relative max-w-2xl mx-auto">
        {/* Modal Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-500 rounded-2xl flex items-center justify-center mb-4">
            <Route className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Create New Route</h2>
          <p className="text-gray-600 dark:text-gray-300">Add a new frontend route to your application</p>
        </div>

        <form onSubmit={handleCreateRoute} className="space-y-6">
          {/* Route Name Field */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Route Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Hash className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={routeForm.route_name}
                onChange={(e) => setRouteForm({ ...routeForm, route_name: e.target.value })}
                placeholder="e.g., dashboard, user-profile, settings"
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">A unique identifier for this route</p>
          </div>

          {/* Path Field */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Route Path <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MapPin className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={routeForm.path}
                onChange={(e) => setRouteForm({ ...routeForm, path: e.target.value })}
                placeholder="e.g., /dashboard, /user/profile, /admin/settings"
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">The URL path for this route (must start with /)</p>
          </div>

          {/* Description Field */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Description <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute top-3 left-3">
                <FileText className="h-4 w-4 text-gray-400" />
              </div>
              <textarea
                value={routeForm.description}
                onChange={(e) => setRouteForm({ ...routeForm, description: e.target.value })}
                placeholder="Describe what this route is for and its purpose..."
                required
                rows={4}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 resize-none placeholder-gray-400"
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Provide a clear description of this route&apos;s purpose</p>
          </div>



          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200 dark:border-gray-600">
            <button
              type="button"
              onClick={() => {
                setShowCreateRouteModal(false);
                setRouteForm({ route_name: '', path: '', description: '' });
              }}
              className="w-full sm:w-auto px-6 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoadingAction}
              className="w-full sm:w-auto px-6 py-3 rounded-xl text-white flex items-center gap-2 justify-center bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-lg hover:shadow-xl"
            >
              {isLoadingAction ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Create Route
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>

    {/* Enhanced Edit Route Modal */}
    <Modal
      isOpen={showEditRouteModal}
      onClose={() => {
        setShowEditRouteModal(false);
        setEditRouteId(null);
        setRouteForm({ route_name: '', path: '', description: '' });
      }}
      title=""
    >
      <div className="relative max-w-2xl mx-auto">
        {/* Modal Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center mb-4">
            <Edit className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Edit Route</h2>
          <p className="text-gray-600 dark:text-gray-300">Update the route configuration and settings</p>
        </div>

        <form onSubmit={handleEditRoute} className="space-y-6">
          {/* Route Name Field */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Route Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Hash className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={routeForm.route_name}
                onChange={(e) => setRouteForm({ ...routeForm, route_name: e.target.value })}
                placeholder="e.g., dashboard, user-profile, settings"
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">A unique identifier for this route</p>
          </div>

          {/* Path Field */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Route Path <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MapPin className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={routeForm.path}
                onChange={(e) => setRouteForm({ ...routeForm, path: e.target.value })}
                placeholder="e.g., /dashboard, /user/profile, /admin/settings"
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">The URL path for this route (must start with /)</p>
          </div>

          {/* Description Field */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Description <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute top-3 left-3">
                <FileText className="h-4 w-4 text-gray-400" />
              </div>
              <textarea
                value={routeForm.description}
                onChange={(e) => setRouteForm({ ...routeForm, description: e.target.value })}
                placeholder="Describe what this route is for and its purpose..."
                required
                rows={4}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none placeholder-gray-400"
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Provide a clear description of this route&apos;s purpose</p>
          </div>



          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200 dark:border-gray-600">
            <button
              type="button"
              onClick={() => {
                setShowEditRouteModal(false);
                setEditRouteId(null);
                setRouteForm({ route_name: '', path: '', description: '' });
              }}
              className="w-full sm:w-auto px-6 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoadingAction}
              className="w-full sm:w-auto px-6 py-3 rounded-xl text-white flex items-center gap-2 justify-center bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-lg hover:shadow-xl"
            >
              {isLoadingAction ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Updating...
                </>
              ) : (
                <>
                  <Edit className="w-4 h-4" />
                  Update Route
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>

    {/* Enhanced Route Mapping Modal */}
    <Modal
      isOpen={showRouteMappingModal}
      onClose={() => {
        setShowRouteMappingModal(false);
        setRouteMappingForm({ role_name: '', route_path: '' });
      }}
      title=""
    >
      <div className="relative max-w-2xl mx-auto">
        {/* Modal Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-2xl flex items-center justify-center mb-4">
            <Link className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Assign Route to Role</h2>
          <p className="text-gray-600 dark:text-gray-300">Configure which roles can access specific routes</p>
        </div>

        <form onSubmit={handleCreateRouteMapping} className="space-y-6">
          {/* Role Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Select Role <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Users className="h-4 w-4 text-gray-400" />
              </div>
              <select
                value={routeMappingForm.role_name}
                onChange={(e) => setRouteMappingForm({ ...routeMappingForm, role_name: e.target.value })}
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 appearance-none"
              >
                <option value="">Choose a role...</option>
                {availableRoles.map((role) => (
                  <option key={role.id} value={role.name}>
                    {role.name}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Select the role that will have access to the route</p>
          </div>

          {/* Route Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Select Route <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MapPin className="h-4 w-4 text-gray-400" />
              </div>
              <select
                value={routeMappingForm.route_path}
                onChange={(e) => setRouteMappingForm({ ...routeMappingForm, route_path: e.target.value })}
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 appearance-none"
              >
                <option value="">Choose a route...</option>
                {frontendRoutes.map((route) => (
                  <option key={route.id} value={route.path}>
                    {route.path} - {route.route_name}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Select the route to assign to the role</p>
          </div>


          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200 dark:border-gray-600">
            <button
              type="button"
              onClick={() => {
                setShowRouteMappingModal(false);
                setRouteMappingForm({ role_name: '', route_path: '' });
              }}
              className="w-full sm:w-auto px-6 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoadingAction}
              className="w-full sm:w-auto px-6 py-3 rounded-xl text-white flex items-center gap-2 justify-center bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-lg hover:shadow-xl"
            >
              {isLoadingAction ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Assigning...
                </>
              ) : (
                <>
                  <Link className="w-4 h-4" />
                  Assign Route
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>

     {/* Delete Permission Confirmation Modal (Customers style) */}
     <Modal isOpen={!!permDeleteConfirm} onClose={() => setPermDeleteConfirm(null)} title="Delete Permission">
       <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Delete Permission</h3>
       <p>Are you sure you want to delete <span className="font-semibold">{permDeleteConfirm?.name}</span>?</p>
       <p className="text-red-600 dark:text-red-400 font-semibold mt-1">This action cannot be undone.</p>
       <div className="flex justify-end gap-3 mt-6">
         <button
           onClick={() => setPermDeleteConfirm(null)}
           className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
         >
           Cancel
         </button>
         <button
           onClick={async () => {
             if (!permDeleteConfirm) return;
             await handleDeletePermission(permDeleteConfirm.id);
             setPermDeleteConfirm(null);
           }}
           className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
         >
           Delete
         </button>
       </div>
     </Modal>

     {/* Delete Role Confirmation Modal (Customers style) */}
     <Modal isOpen={!!roleDeleteConfirm} onClose={() => setRoleDeleteConfirm(null)} title="Delete Role">
       <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Delete Role</h3>
       <p className="text-gray-900 dark:text-white">Are you sure you want to delete <span className="font-semibold">{roleDeleteConfirm?.name}</span>?</p>
       <p className="text-red-600 dark:text-red-400 font-semibold mt-1">This action cannot be undone.</p>
       <div className="flex justify-end gap-3 mt-6">
         <button
           onClick={() => setRoleDeleteConfirm(null)}
           className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
         >
           Cancel
         </button>
         <button
           onClick={async () => {
             if (!roleDeleteConfirm) return;
             await handleDeleteRole(roleDeleteConfirm.id);
             setRoleDeleteConfirm(null);
           }}
           className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
         >
           Delete
         </button>
       </div>
     </Modal>

     {/* Add Routes to Role Modal */}
     {showAddRoutesModal && selectedRoleForRoutes && (
       <Modal
         isOpen={showAddRoutesModal}
         onClose={() => {
           setShowAddRoutesModal(false);
           setSelectedRoleForRoutes(null);
           setSelectedRoutesToAdd([]);
         }}
         title={`Add Routes to ${selectedRoleForRoutes.name}`}
       >
         <div className="space-y-4">
           <p className="text-gray-600 dark:text-gray-400">
             Select routes to add to the <strong>{selectedRoleForRoutes.name}</strong> role:
           </p>
           
           <div className="max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
             {getAvailableRoutesForRole(selectedRoleForRoutes.name).length > 0 ? (
               <div className="space-y-2 p-4">
                 {/* Select All Checkbox */}
                 <label className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg cursor-pointer border-b border-gray-200 dark:border-gray-700 mb-2 sticky top-0 z-10">
                   <input
                     type="checkbox"
                     checked={
                       getAvailableRoutesForRole(selectedRoleForRoutes.name).length > 0 &&
                       getAvailableRoutesForRole(selectedRoleForRoutes.name).every(path => 
                         selectedRoutesToAdd.includes(path)
                       )
                     }
                     onChange={(e) => {
                       const availableRoutes = getAvailableRoutesForRole(selectedRoleForRoutes.name);
                       if (e.target.checked) {
                         setSelectedRoutesToAdd([...availableRoutes]);
                       } else {
                         setSelectedRoutesToAdd([]);
                       }
                     }}
                     className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                   />
                   <div className="flex-1">
                     <div className="text-sm font-semibold text-gray-900 dark:text-white">
                       Select All
                     </div>
                     <div className="text-xs text-gray-500 dark:text-gray-400">
                       {selectedRoutesToAdd.length} of {getAvailableRoutesForRole(selectedRoleForRoutes.name).length} routes selected
                     </div>
                   </div>
                 </label>
                 
                 {getAvailableRoutesForRole(selectedRoleForRoutes.name).map((routePath) => {
                   const route = frontendRoutes.find(r => r.path === routePath);
                   if (!route) return null;
                   
                   return (
                     <label key={routePath} className="flex items-center space-x-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg cursor-pointer">
                       <input
                         type="checkbox"
                         checked={selectedRoutesToAdd.includes(routePath)}
                         onChange={(e) => {
                           if (e.target.checked) {
                             setSelectedRoutesToAdd([...selectedRoutesToAdd, routePath]);
                           } else {
                             setSelectedRoutesToAdd(selectedRoutesToAdd.filter(path => path !== routePath));
                           }
                         }}
                         className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                       />
                       <div className="flex-1">
                         <div className="text-sm font-medium text-gray-900 dark:text-white">
                           {route.route_name}
                         </div>
                         <div className="text-xs text-gray-500 dark:text-gray-400">
                           {routePath}
                         </div>
                         <div className="text-xs text-gray-500 dark:text-gray-400">
                           {route.description}
                         </div>
                       </div>
                     </label>
                   );
                 })}
               </div>
             ) : (
               <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                 <Route className="w-12 h-12 mx-auto mb-4 opacity-50" />
                 <p>All available routes are already assigned to this role.</p>
               </div>
             )}
           </div>
           
           <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
             <button
               type="button"
               onClick={() => {
                 setShowAddRoutesModal(false);
                 setSelectedRoleForRoutes(null);
                 setSelectedRoutesToAdd([]);
               }}
               className="w-full sm:w-auto px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
             >
               Cancel
             </button>
             <button
               type="button"
               onClick={async () => {
                 if (selectedRoutesToAdd.length > 0) {
                   await handleAddRoutesToRole(selectedRoleForRoutes.name, selectedRoutesToAdd);
                   setShowAddRoutesModal(false);
                   setSelectedRoleForRoutes(null);
                   setSelectedRoutesToAdd([]);
                 }
               }}
               disabled={selectedRoutesToAdd.length === 0 || isLoadingAction}
               className="w-full sm:w-auto px-4 py-2 rounded-lg text-white flex items-center gap-2 justify-center bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
             >
               <Plus className="w-4 h-4" />
               Add {selectedRoutesToAdd.length} Route{selectedRoutesToAdd.length !== 1 ? 's' : ''}
             </button>
           </div>
         </div>
       </Modal>
     )}

     {/* Remove Routes from Role Modal */}
     {showRemoveRoutesModal && selectedRoleForRoutes && (
       <Modal
         isOpen={showRemoveRoutesModal}
         onClose={() => {
           setShowRemoveRoutesModal(false);
           setSelectedRoleForRoutes(null);
           setSelectedRoutesToRemove([]);
         }}
         title={`Remove Routes from ${selectedRoleForRoutes.name}`}
       >
         <div className="space-y-4">
           <p className="text-gray-600 dark:text-gray-400">
             Select routes to remove from the <strong>{selectedRoleForRoutes.name}</strong> role:
           </p>
           
           <div className="max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
             {getRoutesForRole(selectedRoleForRoutes.name).length > 0 ? (
               <div className="space-y-2 p-4">
                 {/* Select All Checkbox */}
                 <label className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg cursor-pointer border-b border-gray-200 dark:border-gray-700 mb-2 sticky top-0 z-10">
                   <input
                     type="checkbox"
                     checked={
                       getRoutesForRole(selectedRoleForRoutes.name).length > 0 &&
                       getRoutesForRole(selectedRoleForRoutes.name).every(path => 
                         selectedRoutesToRemove.includes(path)
                       )
                     }
                     onChange={(e) => {
                       const assignedRoutes = getRoutesForRole(selectedRoleForRoutes.name);
                       if (e.target.checked) {
                         setSelectedRoutesToRemove([...assignedRoutes]);
                       } else {
                         setSelectedRoutesToRemove([]);
                       }
                     }}
                     className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                   />
                   <div className="flex-1">
                     <div className="text-sm font-semibold text-gray-900 dark:text-white">
                       Select All
                     </div>
                     <div className="text-xs text-gray-500 dark:text-gray-400">
                       {selectedRoutesToRemove.length} of {getRoutesForRole(selectedRoleForRoutes.name).length} routes selected
                     </div>
                   </div>
                 </label>
                 
                 {getRoutesForRole(selectedRoleForRoutes.name).map((routePath) => {
                   const route = frontendRoutes.find(r => r.path === routePath);
                   if (!route) return null;
                   
                   return (
                     <label key={routePath} className="flex items-center space-x-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg cursor-pointer">
                       <input
                         type="checkbox"
                         checked={selectedRoutesToRemove.includes(routePath)}
                         onChange={(e) => {
                           if (e.target.checked) {
                             setSelectedRoutesToRemove([...selectedRoutesToRemove, routePath]);
                           } else {
                             setSelectedRoutesToRemove(selectedRoutesToRemove.filter(path => path !== routePath));
                           }
                         }}
                         className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                       />
                       <div className="flex-1">
                         <div className="text-sm font-medium text-gray-900 dark:text-white">
                           {route.route_name}
                         </div>
                         <div className="text-xs text-gray-500 dark:text-gray-400">
                           {routePath}
                         </div>
                         <div className="text-xs text-gray-500 dark:text-gray-400">
                           {route.description}
                         </div>
                       </div>
                     </label>
                   );
                 })}
               </div>
             ) : (
               <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                 <Route className="w-12 h-12 mx-auto mb-4 opacity-50" />
                 <p>No routes are currently assigned to this role.</p>
               </div>
             )}
           </div>
           
           <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
             <button
               type="button"
               onClick={() => {
                 setShowRemoveRoutesModal(false);
                 setSelectedRoleForRoutes(null);
                 setSelectedRoutesToRemove([]);
               }}
               className="w-full sm:w-auto px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
             >
               Cancel
             </button>
             <button
               type="button"
               onClick={async () => {
                 if (selectedRoutesToRemove.length > 0) {
                   await handleRemoveRoutesFromRole(selectedRoleForRoutes.name, selectedRoutesToRemove);
                   setShowRemoveRoutesModal(false);
                   setSelectedRoleForRoutes(null);
                   setSelectedRoutesToRemove([]);
                 }
               }}
               disabled={selectedRoutesToRemove.length === 0 || isLoadingAction}
               className="w-full sm:w-auto px-4 py-2 rounded-lg text-white flex items-center gap-2 justify-center bg-red-600 hover:bg-red-700 disabled:opacity-50"
             >
               <Minus className="w-4 h-4" />
               Remove {selectedRoutesToRemove.length} Route{selectedRoutesToRemove.length !== 1 ? 's' : ''}
             </button>
           </div>
         </div>
       </Modal>
     )}

     {/* Delete Route Confirmation Modal */}
     <Modal isOpen={!!routeDeleteConfirm} onClose={() => setRouteDeleteConfirm(null)} title="Delete Route">
       <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Delete Route</h3>
       <p className="text-gray-900 dark:text-white">Are you sure you want to delete the route <span className="font-semibold">&quot;{routeDeleteConfirm?.route_name}&quot;</span>?</p>
       <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">Path: <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-sm">{routeDeleteConfirm?.path}</code></p>
       <p className="text-red-600 dark:text-red-400 font-semibold mt-3">This action cannot be undone.</p>
       <div className="flex justify-end gap-3 mt-6">
         <button
           onClick={() => setRouteDeleteConfirm(null)}
           className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
         >
           Cancel
         </button>
         <button
           onClick={async () => {
             if (!routeDeleteConfirm) return;
             await handleDeleteRoute(routeDeleteConfirm.id);
           }}
           className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
         >
           Delete Route
         </button>
       </div>
     </Modal>

      {/* Route Details Modal - Compact No-Scroll Layout */}
      <Modal isOpen={showRouteDetailsModal} onClose={() => setShowRouteDetailsModal(false)} title="">
        <div className="relative max-w-[90vw] mx-auto max-h-[90vh] overflow-hidden">
          {/* Modal Header */}
          <div className="text-center mb-4">
            <div className="mx-auto w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center mb-3">
              <Eye className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Route Details</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">Complete information about this route</p>
          </div>

          {selectedRouteDetails && (
            <div className="space-y-4">
              {/* Compact Horizontal Layout */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                {/* Header Row */}
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-gray-700 dark:to-gray-600 px-4 py-3 border-b border-gray-200 dark:border-gray-600">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                      {selectedRouteDetails.route_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        {selectedRouteDetails.route_name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Route Information</p>
                    </div>
                  </div>
                </div>

                {/* Compact Details Grid */}
                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Route Name */}
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Hash className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">Route Name</span>
                      </div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white break-all">
                        {selectedRouteDetails.route_name}
                      </div>
                    </div>

                    {/* Route Path */}
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">Route Path</span>
                      </div>
                      <code className="text-xs bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded text-gray-800 dark:text-gray-200 font-mono break-all block">
                        {selectedRouteDetails.path}
                      </code>
                    </div>

                    {/* Status */}
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">Status</span>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded-full text-xs font-semibold">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                        Active
                      </span>
                    </div>

                    {/* Route ID */}
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 md:col-span-2 lg:col-span-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Hash className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">Route ID</span>
                      </div>
                      <code className="text-xs bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded text-gray-800 dark:text-gray-200 font-mono break-all block">
                        {selectedRouteDetails.id}
                      </code>
                    </div>

                    {/* Description */}
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 md:col-span-2">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">Description</span>
                      </div>
                      <div className="text-sm text-gray-700 dark:text-gray-300 break-words">
                        {selectedRouteDetails.description || 'No description provided'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Compact Actions Footer */}
                <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-600 border-t border-gray-200 dark:border-gray-600">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        setShowRouteDetailsModal(false);
                        setEditRouteId(selectedRouteDetails.id);
                        setRouteForm({
                          route_name: selectedRouteDetails.route_name,
                          path: selectedRouteDetails.path,
                          description: selectedRouteDetails.description
                        });
                        setShowEditRouteModal(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 text-sm font-semibold"
                    >
                      <Edit className="w-3 h-3" />
                      Edit Route
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedRouteDetails.path);
                        showInfoAlert('Route path copied to clipboard!');
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-all duration-200 text-sm font-semibold"
                    >
                      <Copy className="w-3 h-3" />
                      Copy Path
                    </button>
                    <button
                      onClick={() => setShowRouteDetailsModal(false)}
                      className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-all duration-200 text-sm font-semibold"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Role-Route Mappings - Professional Clean Design */}
      <Modal isOpen={showViewMappingsModal} onClose={() => setShowViewMappingsModal(false)} title="">
        <div className="relative max-w-5xl mx-auto max-h-[95vh] overflow-hidden">
          {/* Clean Professional Panel */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden h-[90vh] flex flex-col">
            
            {/* Clean Header */}
            <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-b border-gray-200 dark:border-gray-600 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Role-Route Mappings</h1>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Manage role-based access to routes</p>
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    setShowViewMappingsModal(false);
                    setShowRouteMappingModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors duration-200 text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add New
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Stats Header */}
              <div className="px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Link className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Current Mappings</span>
                  </div>
                  
                  <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-md text-sm font-medium">
                    <span className="font-semibold">{roleRouteMappings.length}</span>
                    <span>mappings</span>
                  </div>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-hidden">
                {roleRouteMappings.length === 0 ? (
                  <div className="h-full flex items-center justify-center px-6">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center mx-auto mb-4">
                        <Link className="w-6 h-6 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Mappings Found</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">No role-route mappings have been created yet.</p>
                      <button
                        onClick={() => {
                          setShowViewMappingsModal(false);
                          setShowRouteMappingModal(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors duration-200 mx-auto text-sm font-medium"
                      >
                        <Plus className="w-4 h-4" />
                        Create First Mapping
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800">
                    <div className="space-y-0">
                      {roleRouteMappings.map((mapping) => (
                        <div key={mapping.id} className="group px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-150 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                          <div className="flex items-center justify-between">
                            {/* Role Section */}
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center text-white font-medium text-sm">
                                {mapping.role_name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <h3 className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                  {mapping.role_name}
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                  ID: {mapping.id.slice(0, 8)}...
                                </p>
                              </div>
                            </div>

                            {/* Route Section */}
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                                {mapping.route_path}
                              </span>
                              <button 
                                onClick={() => {
                                  navigator.clipboard.writeText(mapping.route_path);
                                  showInfoAlert('Route path copied to clipboard!');
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                                title="Copy Path"
                              >
                                <Copy className="w-3 h-3 text-gray-400" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              {roleRouteMappings.length > 0 && (
                <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 flex-shrink-0">
                  <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                    <span>Showing {roleRouteMappings.length} of {roleRouteMappings.length} mappings</span>
                    <div className="flex items-center gap-2">
                      <button className="px-2 py-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-150 text-xs">
                        Previous
                      </button>
                      <button className="px-2 py-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-150 text-xs">
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>
   </div>
 )
}
 
