"use client";
import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { getDomain } from '@/utils/domainConfig';
import AuthService from '@/services/AuthService';
import { useRouteProtection } from '@/hooks/useRouteProtection';
import { useAuth } from '@/hooks/useAuth';
// import { getLogoUrl } from '@/utils/s3Config';

// Helper function to capitalize first letter
const capitalizeFirstLetter = (str: string): string => {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// Helper function to format role name for display
const formatRoleName = (role: string | null | undefined): string | null => {
  if (!role) return null;
  
  // Convert role to a readable format
  // e.g., "sales_manager" -> "Sales Manager", "super_admin" -> "Super Admin"
  return role
    .split(/[-_\s]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export default function UserDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [userName, setUserName] = useState("Loging out");
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState<string | null>(null);
  
  // Get user and routes to access role information
  const { user } = useAuth();
  const { userRoutes, userPaths } = useRouteProtection();

  // Minimal shape for fields we read from the stored login response
  interface LoginResponse {
    email?: string;
    business_info?: {
      full_name?: string;
      business_email?: string;
    };
  }

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isOpen && !target.closest('.dropdown-toggle') && !target.closest('[data-dropdown]')) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Get user data from AuthService and localStorage
  React.useEffect(() => {
    const authService = AuthService.getInstance();
    
    // Function to update user data
    const updateUserData = () => {
      const currentUser = authService.getCurrentUser();
      const loginResponse = authService.getLoginResponse() as unknown as LoginResponse | null;
      
      if (currentUser) {
        // Prefer full name from user, then business_info, then email username
        const displayName = currentUser.full_name ||
                           loginResponse?.business_info?.full_name ||
                           currentUser.email?.split('@')[0] || 
                           "User";
        setUserName(capitalizeFirstLetter(displayName));
        setUserEmail(currentUser.email || "");
        
        // Get role name - check multiple sources
        let roleName: string | null = null;
        
        // Priority 1: Check user_paths.user_roles from enhanced endpoint (most accurate)
        if (userPaths?.user_paths?.user_roles && Array.isArray(userPaths.user_paths.user_roles) && userPaths.user_paths.user_roles.length > 0) {
          roleName = userPaths.user_paths.user_roles[0]; // Get first role from array
        }
        // Priority 2: Check role_name from user object (from useAuth hook)
        else if (user?.role_name) {
          roleName = user.role_name;
        }
        // Priority 3: Check role_name from currentUser
        else if (currentUser.role_name) {
          roleName = currentUser.role_name;
        }
        // Priority 4: Check roles array from userRoutes (from useRouteProtection - fallback endpoint)
        else if (userRoutes?.roles && Array.isArray(userRoutes.roles) && userRoutes.roles.length > 0) {
          const firstRole = userRoutes.roles[0];
          roleName = typeof firstRole === 'string' ? firstRole : (typeof firstRole === 'object' && firstRole !== null && 'role_name' in firstRole ? String((firstRole as { role_name?: string }).role_name) : String(firstRole));
        }
        // Priority 5: Check localStorage
        else {
          roleName = localStorage.getItem('role_name') || localStorage.getItem('roleName') || localStorage.getItem('userRoles') || null;
        }
        
        setUserRole(roleName);
      } else {
        // Fallback to localStorage or stored login response
        const fromLogin = loginResponse?.business_info?.full_name;
        const emailFromLogin = loginResponse?.business_info?.business_email || loginResponse?.email;
        const storedUserName = fromLogin ||
                              localStorage.getItem('userName') || 
                              sessionStorage.getItem('userName') || 
                              (localStorage.getItem('userEmail')?.split('@')[0]) || 
                              "Loging out";
        setUserName(capitalizeFirstLetter(storedUserName));
        setUserEmail((localStorage.getItem('userEmail') || emailFromLogin || ""));
        
        // Try to get role from localStorage
        const storedRole = localStorage.getItem('role_name') || localStorage.getItem('roleName') || null;
        setUserRole(storedRole);
      }
    };

    // Initial update
    updateUserData();

    // Subscribe to auth state changes
    const unsubscribe = authService.subscribe((authState) => {
      if (authState.user) {
        const lr = AuthService.getInstance().getLoginResponse() as unknown as LoginResponse | null;
        const displayName = authState.user.full_name ||
                           lr?.business_info?.full_name ||
                           authState.user.email?.split('@')[0] || 
                           "User";
        setUserName(capitalizeFirstLetter(displayName));
        setUserEmail(authState.user.email || "");
        
        // Update role name - check multiple sources
        let roleName: string | null = null;
        
        // Priority 1: Check user_paths.user_roles from enhanced endpoint (most accurate)
        if (userPaths?.user_paths?.user_roles && Array.isArray(userPaths.user_paths.user_roles) && userPaths.user_paths.user_roles.length > 0) {
          roleName = userPaths.user_paths.user_roles[0]; // Get first role from array
        }
        // Priority 2: Check role_name from user object (from useAuth hook)
        else if (user?.role_name) {
          roleName = user.role_name;
        }
        // Priority 3: Check role_name from authState.user
        else if (authState.user.role_name) {
          roleName = authState.user.role_name;
        }
        // Priority 4: Check roles array from userRoutes
        else if (userRoutes?.roles && Array.isArray(userRoutes.roles) && userRoutes.roles.length > 0) {
          const firstRole = userRoutes.roles[0];
          roleName = typeof firstRole === 'string' ? firstRole : (typeof firstRole === 'object' && firstRole !== null && 'role_name' in firstRole ? String((firstRole as { role_name?: string }).role_name) : String(firstRole));
        }
        // Priority 5: Check localStorage
        else {
          roleName = localStorage.getItem('role_name') || localStorage.getItem('roleName') || localStorage.getItem('userRoles') || null;
        }
        
        setUserRole(roleName);
      } else {
        setUserName("Loging out");
        setUserEmail("");
        setUserRole(null);
      }
    });

    // Cleanup subscription
    return unsubscribe;
  }, [userRoutes, user, userPaths]);
  
  // Update role when user, userRoutes, or userPaths changes
  React.useEffect(() => {
    let roleName: string | null = null;
    
    // Priority 1: Check user_paths.user_roles from enhanced endpoint (most accurate)
    if (userPaths?.user_paths?.user_roles && Array.isArray(userPaths.user_paths.user_roles) && userPaths.user_paths.user_roles.length > 0) {
      roleName = userPaths.user_paths.user_roles[0]; // Get first role from array
    }
    // Priority 2: Check role_name from user object
    else if (user?.role_name) {
      roleName = user.role_name;
    }
    // Priority 3: Check roles array from userRoutes
    else if (userRoutes?.roles && Array.isArray(userRoutes.roles) && userRoutes.roles.length > 0) {
      const firstRole = userRoutes.roles[0];
      roleName = typeof firstRole === 'string' ? firstRole : (typeof firstRole === 'object' && firstRole !== null && 'role_name' in firstRole ? String((firstRole as { role_name?: string }).role_name) : String(firstRole));
    }
    // Priority 4: Check localStorage
    else {
      roleName = localStorage.getItem('role_name') || localStorage.getItem('roleName') || localStorage.getItem('userRoles') || null;
    }
    
    if (roleName) {
      setUserRole(roleName);
    }
  }, [userRoutes, user, userPaths]);

function toggleDropdown(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
  e.stopPropagation();
  setIsOpen((prev) => !prev);
}

  function closeDropdown() {
    setIsOpen(false);
  }

  const handleSignOut = async () => {
    try {
      // 1. Save chat session if exists
      const session_id = sessionStorage.getItem('chatbot_session_id') || '';
      let title = '';
      try {
        const messagesRaw = sessionStorage.getItem('chatbot_messages');
        if (messagesRaw) {
          const messages = JSON.parse(messagesRaw);
          const lastUserMsg = Array.isArray(messages)
            ? [...messages].reverse().find((msg) => msg.type === 'user' && msg.content)
            : null;
          if (lastUserMsg && lastUserMsg.content) {
            title = lastUserMsg.content.slice(0, 40);
          }
        }
      } catch {
        // Ignore errors
      }
      if (!title) {
        title = `Chat Session - ${new Date().toLocaleString()}`;
      }
      const userEmail = localStorage.getItem('userEmail') || '';
      const domain = getDomain(userEmail);

      if (session_id && title && domain) {
        try {
          await fetch(`${process.env.NEXT_PUBLIC_API_URL}/domain/${domain}/save-session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id, title }),
          });
        } catch {
          // Failed to auto-save chat session
        }
      }

      // 2. Use AuthService for logout
      const authService = AuthService.getInstance();
      await authService.logout();
      
    } catch {
      // Force logout even if there's an error
      localStorage.clear();
      sessionStorage.clear();
      document.cookie = 'isAuthenticated=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      window.location.href = '/signin';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={toggleDropdown} 
        className="dropdown-toggle flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md"
      >
        <div className="relative flex-shrink-0">
          <Image
            className="object-contain rounded-lg"
            width={32}
            height={32}
            src={"/images/logo/M-LOGO_1.png"}
            alt="User"
          />
          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
        </div>

        <div className="flex flex-col items-start flex-1 min-w-0">
          <span className="block font-semibold text-sm text-gray-900 dark:text-white truncate">{userName}</span>
          {userRole ? (
            <span className="block text-xs text-blue-600 dark:text-blue-400 font-medium truncate">
              {formatRoleName(userRole) || userRole}
            </span>
          ) : (
            <span className="block text-xs text-gray-500 dark:text-gray-400">Online</span>
          )}
        </div>

        <svg
          className={`ml-5 stroke-gray-500 dark:stroke-gray-400 transition-transform duration-200 flex-shrink-0 ${
            isOpen ? "rotate-180" : ""
          }`}
          width="16"
          height="16"
          viewBox="0 0 18 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4.3125 8.65625L9 13.3437L13.6875 8.65625"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute right-0 mt-2 flex w-[280px] flex-col rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl p-4 shadow-2xl"
      >
        <div data-dropdown>
        <div className="border-b border-gray-200/50 dark:border-gray-700/50 pb-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Image
                className="object-contain rounded-lg"
                width={40}
                height={40}
                src={"/images/logo/M-LOGO_1.png"}
                alt="User"
              />
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
            </div>
            <div className="flex flex-col">
              <span className="block font-semibold text-gray-900 dark:text-white text-sm">
                {userName}
              </span>
              <span className="block text-xs text-gray-500 dark:text-gray-400">
                {userEmail || 'User'}
              </span>
              {userRole && (
                <span className="block text-xs text-blue-600 dark:text-blue-400 font-medium mt-0.5">
                  {formatRoleName(userRole) || userRole}
                </span>
              )}
            </div>
          </div>
        </div>

        
        <Link
          href="/Profile"
          onClick={closeDropdown}
          className="flex items-center gap-3 px-4 py-3 font-medium text-gray-700 dark:text-gray-300 rounded-xl group text-sm hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:from-gray-700 dark:hover:to-gray-600 hover:text-gray-900 dark:hover:text-white transition-all duration-200 ease-out"
        >
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-800/50 transition-colors duration-200">
            <svg
              className="w-4 h-4 text-blue-600 dark:text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <span className="transition-all duration-200">Profile Settings</span>
        </Link>

        <Link
          href="#"
          onClick={(e) => {
            e.preventDefault();
            closeDropdown();
            handleSignOut();
          }}
          className="flex items-center gap-3 px-4 py-3 font-medium text-gray-700 dark:text-gray-300 rounded-xl group text-sm hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 dark:hover:from-red-900/20 dark:hover:to-pink-900/20 hover:text-red-600 dark:hover:text-red-400 transition-all duration-200 ease-out"
        >
          <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center group-hover:bg-red-200 dark:group-hover:bg-red-800/50 transition-colors duration-200">
            <svg
              className="w-4 h-4 text-red-600 dark:text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </div>
          <span className="transition-all duration-200">Sign Out</span>
        </Link>
        </div>
      </Dropdown>
    </div>
  );
}
