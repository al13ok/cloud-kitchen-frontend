'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTenant } from '@/context/TenantContext';

type DashboardHeaderProps = {
  title: string;
  subtitle?: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  iconColor?: string;
  gradientFrom?: string;
  gradientTo?: string;
  actions?: React.ReactNode;
  showHelp?: boolean;
  onHelpToggle?: () => void;
  helpContent?: React.ReactNode;
  tooltipContent?: React.ReactNode; // New prop for tooltip content
  breadcrumbs?: Array<{ label: string; href?: string }>;
  variant?: 'default' | 'minimal' | 'hero';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  hideTenantPrefix?: boolean; // New prop to hide tenant name prefix
};

const applyTenantTokens = (value: string | undefined, tenant: ReturnType<typeof useTenant>['tenant']) => {
  if (!value) return '';
  return value
    .replace(/\{\{\s*tenant\.name\s*\}\}/gi, tenant.name)
    .replace(/\{\{\s*tenant\.tagline\s*\}\}/gi, tenant.tagline ?? '')
    .replace(/\{\{\s*tenant\.accent\s*\}\}/gi, tenant.accent ?? '');
};

export default function DashboardHeader({
  title,
  subtitle,
  icon: Icon,
  iconColor = "text-white",
  actions,
  showHelp = false,
  onHelpToggle,
  helpContent,
  tooltipContent,
  breadcrumbs,
  variant = 'default',
  size = 'lg',
  className = '',
  hideTenantPrefix = false
}: DashboardHeaderProps) {
  const router = useRouter();
  const { tenant } = useTenant();
  const [isHelpVisible, setIsHelpVisible] = useState(showHelp);
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const helpRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  const resolvedTitle = React.useMemo(() => {
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

  const resolvedSubtitle = React.useMemo(() => {
    const base = applyTenantTokens(subtitle, tenant).trim();
    const tagline = tenant.tagline?.trim() ?? '';

    if (base && tagline) {
      return base.toLowerCase().includes(tagline.toLowerCase()) ? base : `${base} • ${tagline}`;
    }

    const fallback = base || tagline;
    return fallback ? fallback.trim() : undefined;
  }, [subtitle, tenant]);

  const patternId = React.useMemo(() => {
    return `pattern-${resolvedTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  }, [resolvedTitle]);

  const watermarkLogo = tenant.logo ?? '/images/logo/Mobiloitte.png';

  // Enhanced breadcrumb data
  const defaultBreadcrumbs = [
    { label: 'Home', href: '/' },
    { label: resolvedTitle }
  ];
  const finalBreadcrumbs = breadcrumbs || defaultBreadcrumbs;

  // Handle help toggle with smooth animation
  const handleHelpToggle = () => {
    setIsHelpVisible(!isHelpVisible);
    onHelpToggle?.();
  };

  // Handle tooltip toggle
  const handleTooltipToggle = () => {
    setIsTooltipVisible(!isTooltipVisible);
    // Close help if tooltip is opened
    if (!isTooltipVisible && isHelpVisible) {
      setIsHelpVisible(false);
      onHelpToggle?.();
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      if (isTooltipVisible) {
        setIsTooltipVisible(false);
      }
      if (isHelpVisible) {
        setIsHelpVisible(false);
        onHelpToggle?.();
      }
    }
  };

  // Focus management for accessibility
  useEffect(() => {
    if (isHelpVisible && helpRef.current) {
      helpRef.current.focus();
    }
    if (isTooltipVisible && tooltipRef.current) {
      tooltipRef.current.focus();
    }
  }, [isHelpVisible, isTooltipVisible]);

  // Generate default tooltip content if not provided
  const defaultTooltipContent = React.useMemo(() => {
    if (tooltipContent) return tooltipContent;

    // Generate contextual tooltips based on title
    const titleLower = resolvedTitle.toLowerCase();

    if (titleLower.includes('lead') && titleLower.includes('management')) {
      return (
        <div className="space-y-3">
          <p className="text-white/90 leading-relaxed">
            <strong className="text-white">Leads Management</strong> helps you track, manage, and convert potential customers into clients.
          </p>
          <ul className="list-disc list-inside space-y-2 text-white/80 text-sm">
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
          <p className="text-white/90 leading-relaxed">
            <strong className="text-white">Leads Dashboard</strong> provides comprehensive analytics and insights into your lead generation and conversion performance.
          </p>
          <ul className="list-disc list-inside space-y-2 text-white/80 text-sm">
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
          <p className="text-white/90 leading-relaxed">
            <strong className="text-white">Lead Integration</strong> allows you to manage and track leads from various integrated sources.
          </p>
          <ul className="list-disc list-inside space-y-2 text-white/80 text-sm">
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
          <p className="text-white/90 leading-relaxed">
            <strong className="text-white">Dashboard</strong> provides an overview of your business metrics and key performance indicators.
          </p>
          <ul className="list-disc list-inside space-y-2 text-white/80 text-sm">
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
          <p className="text-white/90 leading-relaxed">
            <strong className="text-white">Chat Dashboard</strong> provides insights into your chatbot and messaging performance.
          </p>
          <ul className="list-disc list-inside space-y-2 text-white/80 text-sm">
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
          <p className="text-white/90 leading-relaxed">
            <strong className="text-white">Employee Dashboard</strong> provides an overview of employee performance and activity.
          </p>
          <ul className="list-disc list-inside space-y-2 text-white/80 text-sm">
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
          <p className="text-white/90 leading-relaxed">
            <strong className="text-white">Helpdesk</strong> helps you manage customer and employee support tickets efficiently.
          </p>
          <ul className="list-disc list-inside space-y-2 text-white/80 text-sm">
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
          <p className="text-white/90 leading-relaxed">
            <strong className="text-white">Knowledge Hub</strong> is your central repository for information and resources.
          </p>
          <ul className="list-disc list-inside space-y-2 text-white/80 text-sm">
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
          <p className="text-white/90 leading-relaxed">
            <strong className="text-white">Recruitment Center</strong> helps you manage job postings and candidate applications.
          </p>
          <ul className="list-disc list-inside space-y-2 text-white/80 text-sm">
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
          <p className="text-white/90 leading-relaxed">
            <strong className="text-white">{resolvedTitle}</strong> - {resolvedSubtitle || 'Manage and track your data efficiently.'}
          </p>
          <p className="text-white/80 text-sm">
            Use the filters and search options to find what you need. Click on items to view details or take actions. Export data for reporting and analysis.
          </p>
        </div>
      );
    }
  }, [tooltipContent, resolvedTitle, resolvedSubtitle]);

  // Variant-based styling
  const getVariantStyles = () => {
    switch (variant) {
      case 'minimal':
        return {
          container: 'bg-white dark:bg-[#333333] border border-gray-200 dark:border-gray-800 shadow-theme-sm',
          content: 'p-0.5',
          title: 'text-sm sm:text-base font-bold text-gray-900 dark:text-white',
          subtitle: 'text-gray-600 dark:text-gray-400',
          breadcrumb: 'text-gray-500 dark:text-gray-400',
          icon: 'bg-gray-100 dark:bg-[#333333] text-gray-700 dark:text-gray-300'
        };
      case 'hero':
        return {
          container: 'bg-[#3366CC]',
          content: 'p-0.5 lg:p-1',
          title: 'text-lg sm:text-xl lg:text-2xl font-bold text-white',
          subtitle: 'text-white/90',
          breadcrumb: 'text-white/80',
          icon: 'bg-white/20 text-white border-white/30'
        };
      default:
        return {
          container: 'bg-[#3366CC]',
          content: 'p-0.5 lg:p-0.5',
          title: 'text-base sm:text-lg lg:text-xl font-bold text-white',
          subtitle: 'text-white/90',
          breadcrumb: 'text-white/80',
          icon: 'bg-white/20 text-white border-white/30'
        };
    }
  };

  const styles = getVariantStyles();

  // Size-based styling
  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          content: 'p-4 lg:p-6',
          title: 'text-xl sm:text-2xl font-bold',
          subtitle: 'text-sm sm:text-base',
          icon: 'w-10 h-10 sm:w-12 sm:h-12',
          iconSize: 'w-5 h-5 sm:w-6 sm:h-6'
        };
      case 'md':
        return {
          content: 'p-6 lg:p-8',
          title: 'text-2xl sm:text-3xl lg:text-4xl font-bold',
          subtitle: 'text-base sm:text-lg',
          icon: 'w-12 h-12 sm:w-14 sm:h-14',
          iconSize: 'w-6 h-6 sm:w-7 sm:h-7'
        };
      default:
        return {
          content: 'p-8 lg:p-12',
          title: 'text-3xl sm:text-4xl lg:text-5xl font-bold',
          subtitle: 'text-lg sm:text-xl',
          icon: 'w-12 h-12 sm:w-16 sm:h-16',
          iconSize: 'w-6 h-6 sm:w-8 sm:h-8'
        };
    }
  };

  const sizeStyles = getSizeStyles();

  return (
    <header
      ref={headerRef}
      className={`relative mb-8 z-10 ${styles.container} ${className}`}
      onKeyDown={handleKeyDown}
      role="banner"
      aria-label={`Page header for ${resolvedTitle}`}
    >
      {/* Enhanced Background Pattern - Wrapped to clip background but allow content overflow */}
      <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
        {variant !== 'minimal' && (
          <div className="absolute inset-0">
            {/* Subtle geometric pattern */}
            <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <pattern
                  id={patternId}
                  x="0" y="0"
                  width="40" height="40"
                  patternUnits="userSpaceOnUse"
                >
                  <circle cx="20" cy="20" r="1.5" fill="rgba(255,255,255,0.1)" />
                  <circle cx="0" cy="0" r="0.5" fill="rgba(255,255,255,0.05)" />
                  <circle cx="40" cy="0" r="0.5" fill="rgba(255,255,255,0.05)" />
                  <circle cx="0" cy="40" r="0.5" fill="rgba(255,255,255,0.05)" />
                  <circle cx="40" cy="40" r="0.5" fill="rgba(255,255,255,0.05)" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill={`url(#${patternId})`} />
            </svg>

            {/* Watermark logo for brand recognition */}
            <div className="absolute inset-0 pointer-events-none select-none">
              <div className="absolute right-8 top-8 opacity-5">
                <div
                  className="w-48 h-48 rounded-full bg-white"
                  style={{
                    maskImage: `url(${watermarkLogo})`,
                    WebkitMaskImage: `url(${watermarkLogo})`,
                    maskRepeat: 'no-repeat',
                    WebkitMaskRepeat: 'no-repeat',
                    maskSize: 'contain',
                    WebkitMaskSize: 'contain',
                    maskPosition: 'center',
                    WebkitMaskPosition: 'center'
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className={`relative z-10 ${styles.content} ${sizeStyles.content}`}>
        {/* Enhanced Breadcrumb Navigation */}
        <nav
          className="flex items-center text-xs sm:text-sm flex-shrink-0 mb-2 sm:mb-2.5 lg:mb-3"
          aria-label="Breadcrumb"
        >
          <ol className="flex items-center space-x-2">
            {finalBreadcrumbs.map((crumb, index) => (
              <li key={index} className="flex items-center">
                {index > 0 && (
                  <svg
                    className="w-4 h-4 mx-2 text-white opacity-60"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                )}
                {crumb.href ? (
                  <button
                    onClick={() => router.push(crumb.href!)}
                    className={`hover:opacity-100 transition-opacity duration-200 font-medium focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-transparent rounded-md px-1 py-0.5 ${styles.breadcrumb}`}
                    aria-label={`Navigate to ${crumb.label}`}
                    title={`Click to navigate to ${crumb.label}`}
                  >
                    {crumb.label}
                  </button>
                ) : (
                  <span
                    className={`font-semibold ${styles.breadcrumb}`}
                    title={`Current page: ${crumb.label}`}
                  >
                    {crumb.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>

        {/* Main Header Content */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 lg:gap-6">
          {/* Icon and Title Section */}
          <div className="flex items-start gap-3 sm:gap-4 lg:gap-6 flex-1 min-w-0 w-full sm:w-auto">
            {/* Enhanced Icon with Better Accessibility */}
            <div className="relative flex-shrink-0">
              <div
                className={`${sizeStyles.icon} rounded-xl sm:rounded-2xl ${styles.icon} backdrop-blur-sm border flex items-center justify-center shadow-xl transition-all duration-300 hover:scale-105 focus-within:ring-2 focus-within:ring-white/50 focus-within:ring-offset-2 focus-within:ring-offset-transparent`}
                role="img"
                aria-label={`${title} section icon`}
                title={`${resolvedTitle} - Section Icon`}
              >
                <Icon className={`${sizeStyles.iconSize} ${iconColor}`} />
              </div>
              {/* Subtle animation ring */}
              {variant !== 'minimal' && (
                <div className="absolute inset-0 rounded-xl sm:rounded-2xl border-2 border-white/20 animate-pulse" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h1 className={`${styles.title} ${sizeStyles.title} mb-1.5 sm:mb-2 flex items-center gap-2 sm:gap-3 flex-wrap`}>
                <span className="break-words" title={`Page Title: ${resolvedTitle}`}>{resolvedTitle}</span>

                {/* Always visible tooltip icon */}
                <button
                  onClick={handleTooltipToggle}
                  className={`p-1.5 sm:p-2 rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-transparent flex-shrink-0 ${isTooltipVisible
                    ? "bg-white/20 text-white shadow-lg"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                    }`}
                  title={isTooltipVisible ? "Hide page information" : "Show page information"}
                  aria-label={isTooltipVisible ? "Hide page information" : "Show page information"}
                  aria-expanded={isTooltipVisible}
                >
                  <svg
                    className="w-4 h-4 sm:w-5 sm:h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </button>

                {/* Optional help toggle button (if provided) */}
                {onHelpToggle && (
                  <button
                    onClick={handleHelpToggle}
                    className={`p-2 rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-transparent flex-shrink-0 ${isHelpVisible
                      ? "bg-white/20 text-white shadow-lg"
                      : "text-white/70 hover:text-white hover:bg-white/10"
                      }`}
                    title={isHelpVisible ? "Hide Quick Tips" : "Show Quick Tips"}
                    aria-label={isHelpVisible ? "Hide Quick Tips" : "Show Quick Tips"}
                    aria-expanded={isHelpVisible}
                  >
                    <svg
                      className="w-5 h-5 sm:w-6 sm:h-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </button>
                )}
              </h1>
              {resolvedSubtitle && (
                <p
                  className={`${styles.subtitle} ${sizeStyles.subtitle} max-w-3xl leading-relaxed`}
                  title={resolvedSubtitle}
                >
                  {resolvedSubtitle}
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons with Better Mobile Spacing */}
          {actions && (
            <div className="flex items-stretch sm:items-center gap-3 flex-shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
              {actions}
            </div>
          )}
        </div>

        {/* Tooltip Content Panel */}
        {isTooltipVisible && (
          <div
            ref={tooltipRef}
            className="mt-6 p-6 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 focus:outline-none animate-in fade-in slide-in-from-top-2 duration-300"
            tabIndex={-1}
            role="region"
            aria-label="Page Information"
            aria-live="polite"
          >
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Page Information
              </h3>
              <button
                onClick={handleTooltipToggle}
                className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white/50"
                aria-label="Close Page Information"
                title="Close"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="text-white/90">
              {defaultTooltipContent}
            </div>
          </div>
        )}

        {/* Enhanced Help Content with Better UX */}
        {isHelpVisible && helpContent && (
          <div
            ref={helpRef}
            className="mt-8 p-6 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 focus:outline-none"
            tabIndex={-1}
            role="region"
            aria-label="Quick Tips"
            aria-live="polite"
          >
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Quick Tips</h3>
              <button
                onClick={handleHelpToggle}
                className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white/50"
                aria-label="Close Quick Tips"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="text-white/90">
              {helpContent}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
