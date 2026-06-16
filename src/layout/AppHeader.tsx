"use client";
import { ThemeToggleButton } from "@/components/common/ThemeToggleButton";
import UserDropdown from "@/components/header/UserDropdown";
import { useSidebar } from "@/context/SidebarContext";
import { useAuth } from "@/hooks/useAuth";
import { getLogoUrl } from "@/utils/s3Config";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState, useEffect, useRef } from "react";


// Navigation data for search functionality
const navigationItems = [
  // Main routes
  { name: 'Home', path: '/', category: 'Main', icon: '🏠' },
  { name: 'Help', path: '/Help', category: 'Main', icon: '❓' },
  { name: 'Version', path: '/Version', category: 'Main', icon: '⚡' },
  
  // Dashboard routes
  { name: 'Dashboard Overview', path: '/dashboard', category: 'Dashboards', icon: '📊' },
  { name: 'Chat Dashboard', path: '/chat-dashboard', category: 'Dashboards', icon: '💬' },
  { name: 'Leads Dashboard', path: '/leads-dashboard', category: 'Dashboards', icon: '📋' },
  { name: 'Recruitment Dashboard', path: '/applicants-dashboard', category: 'Dashboards', icon: '👥' },
  { name: 'Helpdesk Dashboard', path: '/helpdesk-dashboard', category: 'Dashboards', icon: '🎫' },
  { name: 'Employee Dashboard', path: '/employee-dashboard', category: 'Dashboards', icon: '👤' },
  
  // Knowledge Hub routes
  { name: 'Guests', path: '/organisation', category: 'Knowledge Hub', icon: '👥' },
  { name: 'Customer', path: '/customer', category: 'Knowledge Hub', icon: '👤' },
  { name: 'Employee', path: '/employee', category: 'Knowledge Hub', icon: '👤' },
  
  // Lead Management routes
  { name: 'Leads', path: '/crm-leads', category: 'Lead Management', icon: '📋' },
  { name: 'CRM Settings', path: '/crm-settings', category: 'Lead Management', icon: '⚙️' },
  
  // Helpdesk routes
  { name: 'Customer Ticket', path: '/helpdesk-customer-ticket', category: 'Helpdesk', icon: '🎫' },
  { name: 'Employee Ticket', path: '/helpdesk-employee-ticket', category: 'Helpdesk', icon: '🎫' },
  { name: 'Helpdesk Ticket', path: '/helpdesk-ticket', category: 'Helpdesk', icon: '🎫' },
  { name: 'Helpdesk Settings', path: '/helpdesk-settings', category: 'Helpdesk', icon: '⚙️' },
  
  // Job Center routes
  { name: 'Applicants', path: '/Jobs', category: 'Recruitment Center', icon: '👥' },
  { name: 'Job Listing', path: '/job-listings', category: 'Recruitment Center', icon: '📝' },
  { name: 'Job Settings', path: '/Job-Setting', category: 'Recruitment Center', icon: '⚙️' },
  
  // Integration Center routes
  { name: 'Connectors', path: '/integration-center-connectors', category: 'Integration Center', icon: '🔌' },
  { name: 'WhatsApp Integration', path: '/WhatsApp-Integration', category: 'Integration Center', icon: '💬' },
  
  // Contacts routes
  { name: 'Contacts', path: '/contacts', category: 'Contacts', icon: '👤' },
  
  // Controls routes
  { name: 'Manage Users', path: '/controls-users', category: 'Controls', icon: '👥' },
  { name: 'Billing', path: '/helpdesk-create-ticket', category: 'Controls', icon: '💰' },
  { name: 'System Status', path: '/controls-system-status', category: 'Controls', icon: '⚡' },
  { name: 'Dashboard Notification', path: '/controls-dashboard-settings', category: 'Controls', icon: '🔔' },
  { name: 'AI Prompt Management', path: '/pre-prompt', category: 'Controls', icon: '🤖' },
  { name: 'Chat Inbox', path: '/inbox', category: 'Controls', icon: '💬' },
  { name: 'Email Settings', path: '/Email-Setting', category: 'Controls', icon: '📧' },
  { name: 'Bot Settings', path: '/avatars', category: 'Controls', icon: '🤖' },
];

const AppHeader: React.FC = () => {
  const [isApplicationMenuOpen, setApplicationMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<typeof navigationItems>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { } = useAuth();
  const { isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();
  const router = useRouter();

  const handleToggle = () => {
    if (window.innerWidth >= 1024) {
      toggleSidebar();
    } else {
      toggleMobileSidebar();
    }
  };

  const toggleApplicationMenu = () => {
    setApplicationMenuOpen(!isApplicationMenuOpen);
  };
  const inputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Search functionality
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim().length > 0) {
      const filtered = navigationItems.filter(item =>
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        item.category.toLowerCase().includes(query.toLowerCase()) ||
        item.path.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(filtered.slice(0, 8)); // Limit to 8 results
      setIsSearchOpen(true);
    } else {
      setSearchResults([]);
      setIsSearchOpen(false);
    }
  };

  const handleSearchItemClick = (path: string) => {
    router.push(path);
    setSearchQuery('');
    setSearchResults([]);
    setIsSearchOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsSearchOpen(false);
      setSearchQuery('');
      inputRef.current?.blur();
    } else if (e.key === 'Enter' && searchResults.length > 0) {
      handleSearchItemClick(searchResults[0].path);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setApplicationMenuOpen(false);
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSearchOpen(false);
        setApplicationMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscapeKey);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, []);

  return (
    <header className="sticky top-0 flex w-full bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50 z-50 shadow-sm">
      <div className="flex flex-col items-center justify-between grow lg:flex-row lg:px-6">
        {/* Mobile Layout */}
        <div className="flex items-center justify-between w-full gap-2 px-3 py-3 border-b border-gray-200/50 dark:border-gray-800/50 sm:gap-4 lg:hidden">
          <button
            className="flex items-center justify-center w-10 h-10 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl z-50 transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md"
            onClick={handleToggle}
            aria-label="Toggle Sidebar"
          >
            {isMobileOpen ? (
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="flex-shrink-0"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z"
                  fill="currentColor"
                />
              </svg>
            ) : (
              <svg
                width="16"
                height="12"
                viewBox="0 0 16 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="flex-shrink-0"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M0.583252 1C0.583252 0.585788 0.919038 0.25 1.33325 0.25H14.6666C15.0808 0.25 15.4166 0.585786 15.4166 1C15.4166 1.41421 15.0808 1.75 14.6666 1.75L1.33325 1.75C0.919038 1.75 0.583252 1.41422 0.583252 1ZM0.583252 11C0.583252 10.5858 0.919038 10.25 1.33325 10.25L14.6666 10.25C15.0808 10.25 15.4166 10.5858 15.4166 11C15.4166 11.4142 15.0808 11.75 14.6666 11.75L1.33325 11.75C0.919038 11.75 0.583252 11.4142 0.583252 11ZM1.33325 5.25C0.919038 5.25 0.583252 5.58579 0.583252 6C0.583252 6.41421 0.919038 6.75 1.33325 6.75L7.99992 6.75C8.41413 6.75 8.74992 6.41421 8.74992 6C8.74992 5.58579 8.41413 5.25 7.99992 5.25L1.33325 5.25Z"
                  fill="currentColor"
                />
              </svg>
            )}
          </button>

          <Link href="/">
            <div className="hidden sm:flex items-center justify-center gap-3">
              <div className="relative">
                <Image
                  width={40}
                  height={40}
                  className="rounded-lg shadow-sm"
                  src={getLogoUrl('primary')}
                  alt="Logo"
                  unoptimized={true}
                />
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg blur opacity-20"></div>
              </div>
              <span className="text-white font-semibold text-lg text-blue-400">Mobiloitte</span>
            </div>
          </Link>

          <button
            onClick={toggleApplicationMenu}
            className="flex items-center justify-center w-10 h-10 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-xl z-50 transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M5.99902 10.4951C6.82745 10.4951 7.49902 11.1667 7.49902 11.9951V12.0051C7.49902 12.8335 6.82745 13.5051 5.99902 13.5051C5.1706 13.5051 4.49902 12.8335 4.49902 12.0051V11.9951C4.49902 11.1667 5.1706 10.4951 5.99902 10.4951ZM17.999 10.4951C18.8275 10.4951 19.499 11.1667 19.499 11.9951V12.0051C19.499 12.8335 18.8275 13.5051 17.999 13.5051C17.1706 13.5051 16.499 12.8335 16.499 12.0051V11.9951C16.499 11.1667 17.1706 10.4951 17.999 10.4951ZM13.499 11.9951C13.499 11.1667 12.8275 10.4951 11.999 10.4951C11.1706 10.4951 10.499 11.1667 10.499 11.9951V12.0051C10.499 12.8335 11.1706 13.5051 11.999 13.5051C12.8275 13.5051 13.499 12.8335 13.499 12.0051V11.9951Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>

        {/* Desktop Layout */}
        <div className="hidden lg:flex items-center justify-between w-full py-4">
          {/* Left side - Menu button */}
          <button
            className="flex items-center justify-center w-11 h-11 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl z-50 transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md"
            onClick={handleToggle}
            aria-label="Toggle Sidebar"
          >
            <svg
              width="16"
              height="12"
              viewBox="0 0 16 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="flex-shrink-0"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M0.583252 1C0.583252 0.585788 0.919038 0.25 1.33325 0.25H14.6666C15.0808 0.25 15.4166 0.585786 15.4166 1C15.4166 1.41421 15.0808 1.75 14.6666 1.75L1.33325 1.75C0.919038 1.75 0.583252 1.41422 0.583252 1ZM0.583252 11C0.583252 10.5858 0.919038 10.25 1.33325 10.25L14.6666 10.25C15.0808 10.25 15.4166 10.5858 15.4166 11C15.4166 11.4142 15.0808 11.75 14.6666 11.75L1.33325 11.75C0.919038 11.75 0.583252 11.4142 0.583252 11ZM1.33325 5.25C0.919038 5.25 0.583252 5.58579 0.583252 6C0.583252 6.41421 0.919038 6.75 1.33325 6.75L7.99992 6.75C8.41413 6.75 8.74992 6.41421 8.74992 6C8.74992 5.58579 8.41413 5.25 7.99992 5.25L1.33325 5.25Z"
                fill="currentColor"
              />
            </svg>
          </button>

          {/* Center - Search Bar */}
          <div className="flex-1 max-w-md mx-8">
            <div ref={searchRef} className="relative">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="h-5 w-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search pages..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => searchQuery && setIsSearchOpen(true)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl leading-5 bg-white dark:bg-gray-800 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all duration-200"
                />
              </div>

              {/* Search Results Dropdown */}
              {isSearchOpen && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl z-50 max-h-96 overflow-y-auto">
                  <div className="p-2">
                    {searchResults.map((item, index) => (
                      <button
                        key={index}
                        onClick={() => handleSearchItemClick(item.path)}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors duration-150"
                      >
                        <span className="text-lg">{item.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {item.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {item.category}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* No Results */}
              {isSearchOpen && searchQuery && searchResults.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl z-50">
                  <div className="p-4 text-center">
                    <div className="text-gray-500 dark:text-gray-400 text-sm">
                      No pages found for &quot;{searchQuery}&quot;
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right side - User area placeholder for balance */}
          <div className="w-11"></div>
        </div>
        
        {/* Mobile User Menu */}
        <div
          ref={mobileMenuRef}
          className={`${isApplicationMenuOpen ? "flex" : "hidden"
            } items-center justify-between w-full gap-4 px-5 py-4 lg:hidden border-t border-gray-200/50 dark:border-gray-800/50`}
        >
          <div className="flex items-center gap-3">
            {/* Dark Mode Toggler */}
            <div className="relative">
              <ThemeToggleButton />
            </div>
          </div>
          {/* User Area */}
          <div className="relative">
            <UserDropdown />
          </div>
          {/* Close Button */}
          <button
            onClick={toggleApplicationMenu}
            className="flex items-center justify-center w-10 h-10 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md"
            aria-label="Close Menu"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="flex-shrink-0"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>

        {/* Desktop User Area */}
        <div className="hidden lg:flex items-center gap-3">
          {/* Dark Mode Toggler */}
          <div className="relative">
            <ThemeToggleButton />
          </div>
          {/* User Area */}
          <div className="relative">
            <UserDropdown />
          </div>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
