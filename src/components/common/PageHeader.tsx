import React, { useMemo, useState } from 'react';
import { Briefcase, ChartBar } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTenant } from '@/context/TenantContext';

interface PageHeaderProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  iconBgColor?: string;
  tips?: string[];
  tooltipContent?: React.ReactNode; // New prop for custom tooltip content
  breadcrumbs?: Array<{ label: string; href?: string }>;
  onConfigureClick?: () => void;
  onHelpClick?: () => void;
  showHelpButton?: boolean;
  showInfoIcon?: boolean; // Add this prop to control info icon visibility
  hideTenantPrefix?: boolean; // New prop to hide tenant name prefix
}

const applyTenantTokens = (value: string | undefined, tenant: ReturnType<typeof useTenant>['tenant']) => {
  if (!value) return '';

  return value
    .replace(/\{\{\s*tenant\.name\s*\}\}/gi, tenant.name)
    .replace(/\{\{\s*tenant\.tagline\s*\}\}/gi, tenant.tagline ?? '')
    .replace(/\{\{\s*tenant\.accent\s*\}\}/gi, tenant.accent ?? '');
};

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  icon = <Briefcase className="w-6 h-6 text-white" />,
  iconBgColor = "bg-blue-600",
  tips = [
    "Use filters to find specific job applications",
    "Select multiple jobs for bulk actions",
    "Click on resume links to view or download files",
    "Use the search to find jobs by name, email, or mobile",
    "Export selected or all jobs to CSV/Excel"
  ],
  tooltipContent,
  breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Applicants" }
  ],
  onConfigureClick,
  onHelpClick,
  showHelpButton = true,
  showInfoIcon = true, // Default to true to maintain existing behavior
  hideTenantPrefix = false
}) => {
  const [showTips, setShowTips] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const router = useRouter();
  const { tenant } = useTenant();

  const resolvedTitle = useMemo(() => {
    const applied = applyTenantTokens(title, tenant).trim();

    if (!applied) {
      return tenant.name;
    }

    // If hideTenantPrefix is true, just return the applied title without adding tenant name
    if (hideTenantPrefix) {
      return applied;
    }

    const includesTenant = applied.toLowerCase().includes(tenant.name.toLowerCase());
    return includesTenant ? applied : `${tenant.name} ${applied}`.replace(/\s+/g, ' ').trim();
  }, [title, tenant, hideTenantPrefix]);

  const resolvedDescription = useMemo(() => {
    const base = applyTenantTokens(description, tenant).trim();
    const tagline = tenant.tagline?.trim() ?? '';

    if (base && tagline) {
      return base.toLowerCase().includes(tagline.toLowerCase()) ? base : `${base} • ${tagline}`;
    }

    const fallback = base || tagline;
    return fallback ? fallback.trim() : undefined;
  }, [description, tenant]);

  const resolvedBreadcrumbs = useMemo(() => {
    return breadcrumbs.map((crumb, index) => {
      const label = applyTenantTokens(crumb.label, tenant).trim();
      return {
        ...crumb,
        label: label || (index === breadcrumbs.length - 1 ? resolvedTitle : tenant.name)
      };
    });
  }, [breadcrumbs, tenant, resolvedTitle]);

  const handleBreadcrumbClick = (href: string) => {
    if (href) {
      router.push(href);
    }
  };

  // Generate default tooltip content if not provided
  const defaultTooltipContent = useMemo(() => {
    if (tooltipContent) return tooltipContent;
    
    // Generate contextual tooltips based on title
    const titleLower = resolvedTitle.toLowerCase();
    
    if (titleLower.includes('lead') && titleLower.includes('management')) {
      return (
        <div className="space-y-3">
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            <strong className="text-gray-900 dark:text-white">Leads Management</strong> helps you track, manage, and convert potential customers into clients.
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400 text-sm">
            <li>View and manage all leads in one centralized location</li>
            <li>Track lead status and conversion progress through the sales pipeline</li>
            <li>Assign leads to team members for better follow-up</li>
            <li>Analyze lead performance, conversion rates, and revenue metrics</li>
            <li>Export lead data for reporting and analysis</li>
            <li>Filter and search leads by name, email, phone, status, or score</li>
            <li>Create new leads manually or import from external sources</li>
          </ul>
        </div>
      );
    } else if (titleLower.includes('lead') && titleLower.includes('dashboard')) {
      return (
        <div className="space-y-3">
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            <strong className="text-gray-900 dark:text-white">Leads Dashboard</strong> provides comprehensive analytics and insights into your lead generation and conversion performance.
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400 text-sm">
            <li>View real-time lead statistics and trends</li>
            <li>Analyze conversion rates and pipeline performance</li>
            <li>Track lead sources and identify best-performing channels</li>
            <li>Monitor lead quality scores and qualification metrics</li>
            <li>Review agent performance and assignment efficiency</li>
          </ul>
        </div>
      );
    } else if (titleLower.includes('lead') && titleLower.includes('integration')) {
      return (
        <div className="space-y-3">
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            <strong className="text-gray-900 dark:text-white">Lead Integration</strong> allows you to manage and track leads from various integrated sources.
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400 text-sm">
            <li>View leads from integrated platforms and forms</li>
            <li>Filter and search integrated leads efficiently</li>
            <li>Track lead status and assignment information</li>
            <li>Export integrated lead data for analysis</li>
            <li>Monitor lead quality and spam detection</li>
          </ul>
        </div>
      );
    } else if (titleLower.includes('dashboard') && !titleLower.includes('lead')) {
      return (
        <div className="space-y-3">
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            <strong className="text-gray-900 dark:text-white">Dashboard</strong> provides an overview of your business metrics and key performance indicators.
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400 text-sm">
            <li>Monitor real-time business metrics and KPIs</li>
            <li>Track performance trends over time</li>
            <li>View key statistics at a glance</li>
            <li>Access quick actions and shortcuts</li>
            <li>Filter data by timeline and category</li>
          </ul>
        </div>
      );
    } else if (titleLower.includes('chat') && titleLower.includes('dashboard')) {
      return (
        <div className="space-y-3">
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            <strong className="text-gray-900 dark:text-white">Chat Dashboard</strong> provides insights into your chatbot and messaging performance.
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400 text-sm">
            <li>Monitor chat volume and response times</li>
            <li>Track user engagement and satisfaction</li>
            <li>Analyze conversation trends and patterns</li>
            <li>View session analytics and user behavior</li>
          </ul>
        </div>
      );
    } else if (titleLower.includes('employee') && titleLower.includes('dashboard')) {
      return (
        <div className="space-y-3">
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            <strong className="text-gray-900 dark:text-white">Employee Dashboard</strong> provides an overview of employee performance and activity.
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400 text-sm">
            <li>Monitor employee activity and performance metrics</li>
            <li>Track time tracking and attendance data</li>
            <li>View employee engagement statistics</li>
            <li>Access employee self-service features</li>
          </ul>
        </div>
      );
    } else if (titleLower.includes('helpdesk') || titleLower.includes('ticket')) {
      return (
        <div className="space-y-3">
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            <strong className="text-gray-900 dark:text-white">Helpdesk</strong> helps you manage customer and employee support tickets efficiently.
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400 text-sm">
            <li>Create and manage support tickets</li>
            <li>Track ticket status and resolution times</li>
            <li>Assign tickets to support agents</li>
            <li>Monitor support metrics and performance</li>
            <li>View ticket history and analytics</li>
          </ul>
        </div>
      );
    } else if (titleLower.includes('knowledge')) {
      return (
        <div className="space-y-3">
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            <strong className="text-gray-900 dark:text-white">Knowledge Hub</strong> is your central repository for information and resources.
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400 text-sm">
            <li>Access documentation and guides</li>
            <li>Search for information quickly</li>
            <li>Manage knowledge base content</li>
            <li>Organize information by categories</li>
          </ul>
        </div>
      );
    } else if (titleLower.includes('recruitment') || titleLower.includes('job') || titleLower.includes('applicant')) {
      return (
        <div className="space-y-3">
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            <strong className="text-gray-900 dark:text-white">Recruitment Center</strong> helps you manage job postings and candidate applications.
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400 text-sm">
            <li>Post and manage job listings</li>
            <li>Review and process candidate applications</li>
            <li>Track application status and progress</li>
            <li>Manage candidate profiles and resumes</li>
            <li>Schedule interviews and assessments</li>
          </ul>
        </div>
      );
    } else {
      return (
        <div className="space-y-3">
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            <strong className="text-gray-900 dark:text-white">{resolvedTitle}</strong> - {resolvedDescription || 'Manage and track your data efficiently.'}
          </p>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Use the filters and search options to find what you need. Click on items to view details or take actions. Export data for reporting and analysis.
          </p>
        </div>
      );
    }
  }, [tooltipContent, resolvedTitle, resolvedDescription]);

  return (
    <header className="w-full bg-gradient-to-br from-white via-white to-gray-50/30 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900/50 border-0 rounded-2xl shadow-xl p-6 mb-8 backdrop-blur-sm overflow-hidden relative">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full -translate-y-16 translate-x-16"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-br from-green-500/10 to-blue-500/10 rounded-full translate-y-12 -translate-x-12"></div>
      
      <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div 
            className={`w-12 h-12 rounded-2xl ${iconBgColor} flex items-center justify-center shadow-lg`}
            title={`${resolvedTitle} - Section Icon`}
          >
            {icon}
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-200 bg-clip-text text-transparent flex items-center gap-3">
              <span title={`Page Title: ${resolvedTitle}`}>{resolvedTitle}</span>
              
              {/* Always visible tooltip icon */}
              <button
                title={showTooltip ? "Hide page information" : "Show page information"}
                className={`ml-2 p-1.5 rounded-lg transition-all duration-300 ${
                  showTooltip 
                    ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30" 
                    : "text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                }`}
                onClick={() => {
                  setShowTooltip(!showTooltip);
                  // Close tips if tooltip is opened
                  if (!showTooltip && showTips) {
                    setShowTips(false);
                  }
                }}
                aria-label={showTooltip ? "Hide page information" : "Show page information"}
                aria-expanded={showTooltip}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M12 16v-4"></path>
                  <path d="M12 8h.01"></path>
                </svg>
              </button>

              {onConfigureClick && (
                <button
                  title="Configure Fit Score Weights"
                  className="ml-2 p-1 text-gray-400 hover:text-green-600 transition-colors"
                  onClick={onConfigureClick}
                >
                  <ChartBar className="w-5 h-5" />
                </button>
              )}

              {showInfoIcon && (
                <button
                  title="Toggle Quick Tips"
                  className="ml-2 p-1 text-gray-400 hover:text-blue-600 transition-colors"
                  onClick={() => {
                    setShowTips(!showTips);
                    // Close tooltip if tips is opened
                    if (!showTips && showTooltip) {
                      setShowTooltip(false);
                    }
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-5 h-5"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M12 16v-4"></path>
                    <path d="M12 8h.01"></path>
                  </svg>
                </button>
              )}

              {showHelpButton && onHelpClick && (
                <button
                  title="Help"
                  className="ml-2 p-1 text-gray-400 hover:text-blue-600 transition-colors"
                  onClick={onHelpClick}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-5 h-5"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M12 16v-4"></path>
                    <path d="M12 8h.01"></path>
                  </svg>
                </button>
              )}
            </h1>
            {resolvedDescription && (
              <p 
                className="text-gray-600 dark:text-gray-400 mt-2 text-sm sm:text-base leading-relaxed"
                title={resolvedDescription}
              >
                {resolvedDescription}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
          {resolvedBreadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              {index > 0 && <span className="mx-2" title="Breadcrumb separator">&gt;</span>}
              {crumb.href ? (
                <button
                  className="hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer transition-colors"
                  onClick={() => handleBreadcrumbClick(crumb.href!)}
                  title={`Click to navigate to ${crumb.label}`}
                >
                  {crumb.label}
                </button>
              ) : (
                <span 
                  className="text-gray-700 dark:text-gray-300 font-medium"
                  title={`Current page: ${crumb.label}`}
                >
                  {crumb.label}
                </span>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Tooltip Content Panel */}
      {showTooltip && (
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 16v-4"></path>
                <path d="M12 8h.01"></path>
              </svg>
              <div className="flex-1">
                <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Page Information</h3>
                <div className="text-sm">
                  {defaultTooltipContent}
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowTooltip(false)}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="Close Page Information"
              title="Close"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {showTips && showInfoIcon && (
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
          <div className="flex items-start gap-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M12 16v-4"></path>
              <path d="M12 8h.01"></path>
            </svg>
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <h3 className="font-semibold mb-2">Quick Tips:</h3>
              <ul className="space-y-1">
                {tips.map((tip, index) => (
                  <li key={`${title}-${index}`}>• {tip}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default PageHeader;