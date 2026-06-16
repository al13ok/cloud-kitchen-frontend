"use client";

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

// Route to page title mapping - extracted from AppSidebar
const routeToPageTitle: Record<string, string> = {
  // Main routes
  '/': 'Home',
  '/Help': 'Help',
  '/Version': 'Version',

  // Dashboard routes
  '/dashboard': 'Overview',
  '/chat-dashboard': 'Chat Dashboard',
  '/leads-dashboard': 'Leads Dashboard',
  '/applicants-dashboard': 'Recruitment Dashboard',
  '/helpdesk-dashboard': 'Helpdesk Dashboard',

  // Knowledge Hub routes
  '/organisation': 'Guests',
  '/customer': 'Customer',
  '/employee': 'Employee',

  // Lead Management routes
  '/crm-leads': 'Leads',
  '/crm-settings': 'Settings',

  // Helpdesk routes
  '/helpdesk-customer-ticket': 'Customer Ticket',
  '/helpdesk-employee-ticket': 'Employee Ticket',
  '/helpdesk-settings': 'Settings',

  // Job Center routes
  '/Jobs': 'Applicants',
  '/Job-listing': 'Job Listing',
  '/job-listings': 'Job Listing',
  '/Job-Setting': 'Settings',

  // Integration Center routes
  '/integration-center-connectors': 'Connectors',
  '/WhatsApp-Integration': 'WhatsApp Integration',

  // Controls routes
  '/controls-users': 'Manage Users',
  '/helpdesk-create-ticket': 'Billing',
  '/controls-system-status': 'System Status',
  '/controls-dashboard-settings': 'Notification Settings',
  '/pre-prompt': 'AI Prompt Management',
  '/inbox': 'Chat Inbox',
  '/Email-Setting': 'Email Settings',
  '/avatars': 'Bot Settings',
  '/llm-model': 'LLM Model',
  
  // About section routes
  '/documentation': 'Documentation',
  '/guide': 'Terms & Conditions',
  '/Refund': 'Refund Policy',
  '/privacy': 'Privacy Policy',
  '/cookie-policy': 'Cookie Policy',
  '/license': 'Data Security & Trust',
};

const PageTitleUpdater = () => {
  const pathname = usePathname();
  const currentTitleRef = useRef<string>('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Function to get page title from route
  const getPageTitle = (path: string) => {
    // Check for exact match first
    if (routeToPageTitle[path]) {
      return routeToPageTitle[path];
    }
    
    // Check for partial matches for dynamic routes
    const normalizedPath = path.toLowerCase();
    for (const [route, title] of Object.entries(routeToPageTitle)) {
      if (normalizedPath.includes(route.toLowerCase())) {
        return title;
      }
    }
    
    // Default fallback
    return 'Converiqo';
  };

  // Function to update the document title
  const updateDocumentTitle = (title: string) => {
    const fullTitle = title ? `${title} - Converiqo` : 'Converiqo';
    if (document.title !== fullTitle) {
      document.title = fullTitle;
      currentTitleRef.current = fullTitle;
    }
  };

  useEffect(() => {
    // Get the title for current path
    const newTitle = getPageTitle(pathname);
    
    // Update the document title immediately
    updateDocumentTitle(newTitle);
    
    // Set up an interval to periodically check and update the title
    // This helps ensure our title persists even if Next.js or other code tries to change it
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    intervalRef.current = setInterval(() => {
      const expectedTitle = newTitle ? `${newTitle} - Converiqo` : 'Converiqo';
      if (document.title !== expectedTitle) {
        updateDocumentTitle(newTitle);
      }
    }, 1000); // Check every second
    
    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [pathname]);

  return null; // This component doesn't render anything
};

export default PageTitleUpdater;