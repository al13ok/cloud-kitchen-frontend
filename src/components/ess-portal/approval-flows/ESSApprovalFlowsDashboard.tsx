"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { Users, Clock, CheckCircle, XCircle, Briefcase, TrendingUp, DollarSign } from 'lucide-react';
import { essApiFetch, ESS_PORTAL_ENDPOINTS } from '@/utils/essApi';

// Custom CSS animations
const customStyles = `
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes slideInLeft {
    from {
      opacity: 0;
      transform: translateX(-50px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  @keyframes slideInRight {
    from {
      opacity: 0;
      transform: translateX(50px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  @keyframes bounceIn {
    0% {
      opacity: 0;
      transform: scale(0.3);
    }
    50% {
      opacity: 1;
      transform: scale(1.05);
    }
    70% {
      transform: scale(0.9);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }
  
  @keyframes float {
    0%, 100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-10px);
    }
  }
  
  @keyframes floatSlow {
    0%, 100% {
      transform: translateY(0px) translateX(0px);
    }
    50% {
      transform: translateY(-5px) translateX(5px);
    }
  }
  
  @keyframes floatReverse {
    0%, 100% {
      transform: translateY(0px) translateX(0px);
    }
    50% {
      transform: translateY(5px) translateX(-5px);
    }
  }
  
  @keyframes gradientShift {
    0%, 100% {
      background-position: 0% 50%;
    }
    50% {
      background-position: 100% 50%;
    }
  }
  
  .animate-fade-in-up {
    animation: fadeInUp 0.8s ease-out forwards;
  }
  
  .animate-slide-in-left {
    animation: slideInLeft 0.8s ease-out forwards;
  }
  
  .animate-slide-in-right {
    animation: slideInRight 0.8s ease-out forwards;
  }
  
  .animate-bounce-in {
    animation: bounceIn 0.8s ease-out forwards;
  }
  
  .animate-float {
    animation: float 3s ease-in-out infinite;
  }
  
  .animate-float-slow {
    animation: floatSlow 4s ease-in-out infinite;
  }
  
  .animate-float-reverse {
    animation: floatReverse 4s ease-in-out infinite;
  }
  
  .animate-gradient-shift {
    background-size: 200% 200%;
    animation: gradientShift 3s ease infinite;
  }
  
  .delay-300 {
    animation-delay: 0.3s;
  }
  
  .delay-500 {
    animation-delay: 0.5s;
  }
  
  .delay-700 {
    animation-delay: 0.7s;
  }
  
  .delay-1000 {
    animation-delay: 1s;
  }
`;

// --- 1. DATA TYPES & HELPERS ---

type ApplicationStatus = 'pending' | 'approved' | 'rejected';

interface KeyMetrics {
  totalApplications: number;
  pending: number;
  approved: number;
  rejected: number;
}

interface LeaveApplicationSummary {
  id: string;
  department: string;
  status: ApplicationStatus;
  createdAt?: string;
}

interface DepartmentSummary {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
  total: number;
  approved: number;
  pending: number;
  rejected: number;
}

interface DepartmentBarDatum {
  name: string;
  Approved: number;
  Pending: number;
  Rejected: number;
}

interface PieDatum {
  name: string;
  value: number;
  color: string;
  [key: string]: string | number;
}

interface TrendDatum {
  name: string;
  Approvals: number;
  Rejections: number;
}

interface PayslipRecord {
  status?: string;
  totals?: {
    netPay?: number;
  };
  [key: string]: unknown;
}

interface ExpenseRecord {
  status?: string;
  expenseDetails?: {
    amount?: number;
  };
  [key: string]: unknown;
}

interface AssetRecord {
  status?: string;
  assetDetails?: {
    quantity?: number;
  };
  [key: string]: unknown;
}

interface DataSourceSummary {
  label: string;
  gradient: string;
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  issued?: number;
  extraLabel?: string;
  extraValue?: string | number;
}

const DEFAULT_KEY_METRICS: KeyMetrics = {
  totalApplications: 0,
  pending: 0,
  approved: 0,
  rejected: 0,
};

const DEPARTMENT_ICON_MAP: Record<string, React.ElementType> = {
  it: Briefcase,
  'it department': Briefcase,
  hr: Users,
  'hr department': Users,
  finance: DollarSign,
  'finance department': DollarSign,
};

const FALLBACK_DEPARTMENT_ICONS: React.ElementType[] = [Briefcase, Users, DollarSign, Clock, CheckCircle, XCircle];

const DEPARTMENT_COLOR_CLASSES = ['text-blue-600', 'text-indigo-600', 'text-sky-600', 'text-emerald-600', 'text-purple-600', 'text-amber-600'];

const normalizeDepartmentName = (value?: string): string => {
  if (!value || typeof value !== 'string') return 'General';
  const cleaned = value.replace(/[_-]/g, ' ').trim();
  if (!cleaned) return 'General';
  return cleaned
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const normalizeStatus = (value?: string): ApplicationStatus => {
  if (!value) return 'pending';
  const normalized = value.toLowerCase();

  if (normalized.includes('reject') || normalized.includes('decline')) {
    return 'rejected';
  }

  if (normalized.includes('hr_approved') || normalized.includes('hr approved') || normalized.includes('final_approved')) {
    return 'approved';
  }

  if (normalized === 'approved') {
    return 'approved';
  }

  if (normalized.includes('manager_approved') || normalized.includes('manager approved')) {
    return 'pending';
  }

  if (normalized.includes('pending') || normalized.includes('waiting') || normalized.includes('new')) {
    return 'pending';
  }

  if (normalized.includes('approve')) {
    return 'approved';
  }

  return 'pending';
};

const normalizeStatusValue = (value?: string): string =>
  (value ?? '').toLowerCase().replace(/[\s_-]+/g, '');

const matchesStatusKeyword = (value: string | undefined, keywords: string[]): boolean => {
  if (!value) return false;
  const normalized = normalizeStatusValue(value);
  return keywords.some(keyword => normalized.includes(keyword.toLowerCase().replace(/[\s_-]+/g, '')));
};

const formatCurrencyValue = (value: number, currency = 'INR'): string => {
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return formatter.format(value);
};

const extractApplicationsFromPayload = (payload: unknown): Record<string, unknown>[] => {
  if (!payload) return [];

  if (Array.isArray(payload)) {
    return payload as Record<string, unknown>[];
  }

  const primaryData = (payload as { data?: unknown }).data;

  if (Array.isArray(primaryData)) {
    return primaryData as Record<string, unknown>[];
  }

  if (primaryData && Array.isArray((primaryData as { data?: unknown }).data)) {
    return (primaryData as { data: Record<string, unknown>[] }).data;
  }

  if (Array.isArray((payload as { results?: unknown }).results)) {
    return (payload as { results: Record<string, unknown>[] }).results;
  }

  if (Array.isArray((payload as { items?: unknown }).items)) {
    return (payload as { items: Record<string, unknown>[] }).items;
  }

  return [];
};

const extractListFromPayload = (payload: unknown): Record<string, unknown>[] => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload as Record<string, unknown>[];
  if (Array.isArray((payload as { data?: unknown }).data)) {
    return (payload as { data?: Record<string, unknown>[] }).data || [];
  }
  if (Array.isArray((payload as { results?: unknown }).results)) {
    return (payload as { results?: Record<string, unknown>[] }).results || [];
  }
  if (Array.isArray((payload as { items?: unknown }).items)) {
    return (payload as { items?: Record<string, unknown>[] }).items || [];
  }
  return [];
};

const getApplicationId = (entry: Record<string, unknown>, index: number): string => {
  const candidate =
    entry['id'] ??
    entry['_id'] ??
    entry['leaveId'] ??
    entry['referenceNo'] ??
    entry['applicationId'] ??
    entry['code'];

  if (candidate) {
    return String(candidate);
  }

  return `application-${index}`;
};

const normalizeLeaveApplication = (entry: Record<string, unknown>, index: number): LeaveApplicationSummary => {
  const employeeInfo =
    (entry['employeeInfo'] as Record<string, unknown> | undefined) ||
    (entry['employee_info'] as Record<string, unknown> | undefined);

  const departmentRaw =
    (employeeInfo?.['department'] as string | undefined) ||
    (entry['department'] as string | undefined) ||
    (entry['dept'] as string | undefined);

  const department = normalizeDepartmentName(departmentRaw);
  const status = normalizeStatus(entry['status'] as string | undefined);

  const createdAt =
    (entry['createdAt'] as string | undefined) ||
    (entry['created_at'] as string | undefined) ||
    (entry['updatedAt'] as string | undefined) ||
    (entry['updated_at'] as string | undefined);

  return {
    id: getApplicationId(entry, index),
    department,
    status,
    createdAt,
  };
};

const computeKeyMetrics = (applications: LeaveApplicationSummary[]): KeyMetrics => {
  return applications.reduce<KeyMetrics>(
    (acc, app) => {
      acc.totalApplications += 1;
      if (app.status === 'approved') {
        acc.approved += 1;
      } else if (app.status === 'rejected') {
        acc.rejected += 1;
      } else {
        acc.pending += 1;
      }
      return acc;
    },
    { ...DEFAULT_KEY_METRICS }
  );
};

const computeDepartmentSummaries = (applications: LeaveApplicationSummary[]): DepartmentSummary[] => {
  if (!applications.length) return [];

  const aggregateMap = new Map<
    string,
    {
      total: number;
      pending: number;
      approved: number;
      rejected: number;
    }
  >();

  applications.forEach(app => {
    const key = app.department || 'General';
    if (!aggregateMap.has(key)) {
      aggregateMap.set(key, { total: 0, pending: 0, approved: 0, rejected: 0 });
    }
    const aggregate = aggregateMap.get(key)!;
    aggregate.total += 1;
    if (app.status === 'approved') {
      aggregate.approved += 1;
    } else if (app.status === 'rejected') {
      aggregate.rejected += 1;
    } else {
      aggregate.pending += 1;
    }
  });

  return Array.from(aggregateMap.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .map(([name, stats], index) => {
      const normalizedKey = name.toLowerCase();
      const compactKey = normalizedKey.replace(/\s+/g, '');
      const icon =
        DEPARTMENT_ICON_MAP[normalizedKey] ??
        DEPARTMENT_ICON_MAP[compactKey] ??
        FALLBACK_DEPARTMENT_ICONS[index % FALLBACK_DEPARTMENT_ICONS.length];
      const color = DEPARTMENT_COLOR_CLASSES[index % DEPARTMENT_COLOR_CLASSES.length];
      const id = normalizedKey.replace(/[^a-z0-9]+/g, '-') || `department-${index}`;

      return {
        id,
        name,
        icon,
        color,
        ...stats,
      };
    });
};

const computeBarChartData = (departments: DepartmentSummary[]): DepartmentBarDatum[] =>
  departments.map(dept => ({
    name: dept.name.split(' ')[0],
    Approved: dept.approved,
    Pending: dept.pending,
    Rejected: dept.rejected,
  }));

const computePieChartData = (metrics: KeyMetrics): PieDatum[] => [
  { name: 'Approved', value: metrics.approved, color: '#3B82F6' },
  { name: 'Pending', value: metrics.pending, color: '#6366F1' },
  { name: 'Rejected', value: metrics.rejected, color: '#0EA5E9' },
];

const getISOWeekInfo = (date: Date): { year: number; week: number } => {
  const tempDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = tempDate.getUTCDay() || 7;
  tempDate.setUTCDate(tempDate.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((tempDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: tempDate.getUTCFullYear(), week: weekNo };
};

const computeWeeklyTrendData = (applications: LeaveApplicationSummary[]): TrendDatum[] => {
  if (!applications.length) return [];

  const weekMap = new Map<
    string,
    {
      label: string;
      timestamp: number;
      approvals: number;
      rejections: number;
    }
  >();

  applications.forEach(app => {
    if (!app.createdAt) return;
    const parsedDate = new Date(app.createdAt);
    if (Number.isNaN(parsedDate.getTime())) return;

    const { year, week } = getISOWeekInfo(parsedDate);
    const key = `${year}-W${week}`;

    if (!weekMap.has(key)) {
      const approxMonday = new Date(parsedDate);
      const day = approxMonday.getDay() || 7;
      approxMonday.setDate(approxMonday.getDate() - (day - 1));
      weekMap.set(key, {
        label: `Week ${week}`,
        timestamp: approxMonday.getTime(),
        approvals: 0,
        rejections: 0,
      });
    }

    const bucket = weekMap.get(key)!;
    if (app.status === 'approved') {
      bucket.approvals += 1;
    } else if (app.status === 'rejected') {
      bucket.rejections += 1;
    }
  });

  return Array.from(weekMap.values())
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-8)
    .map(bucket => ({
      name: bucket.label,
      Approvals: bucket.approvals,
      Rejections: bucket.rejections,
    }));
};

// --- 2. COMMON COMPONENTS ---

// Card component for key metrics and department summaries (from previous step)
interface StatCardProps {
  title?: string;
  value?: number | string;
  icon?: React.ElementType;
  footer?: string;
  className?: string;
  loading?: boolean;
  progress?: number;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, footer, className = '', loading, progress }) => {
  const boundedProgress = typeof progress === 'number' ? Math.min(Math.max(progress, 0), 100) : undefined;
  return (
  <div className={`relative bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-105 cursor-pointer group h-full overflow-hidden border border-slate-200/50 ${className}`} style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.03) 0%, rgba(99, 102, 241, 0.03) 50%, rgba(14, 165, 233, 0.03) 100%)' }}>
    <div className="absolute inset-0 bg-gradient-to-br from-white/90 to-slate-50/90 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-100/60 via-indigo-100/60 to-sky-100/60 rounded-full -translate-y-10 translate-x-10 opacity-0 group-hover:opacity-70 transition-opacity duration-500"></div>
    
    <div className="relative z-10 p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-sky-600 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
          {Icon && <Icon className="w-6 h-6 text-white" />}
        </div>
      </div>
      
      <div className="mb-4">
        {loading ? (
          <div className="h-9 w-24 rounded-xl bg-slate-200/70 animate-pulse" />
        ) : (
          <p className="text-3xl font-bold text-slate-800 group-hover:text-slate-900 transition-colors duration-300">
            {value ?? '--'}
          </p>
        )}
        {title && <p className="text-sm font-medium text-slate-600 group-hover:text-slate-700 transition-colors duration-300 mt-1">{title}</p>}
      </div>
      
      {(footer || typeof boundedProgress === 'number') && (
        <div className="mt-auto space-y-3">
          {typeof boundedProgress === 'number' && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Progress</span>
                <span className="text-xs font-semibold text-slate-700">{boundedProgress.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-sky-500 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${boundedProgress}%` }}
                ></div>
              </div>
            </>
          )}
          {footer && <div className="text-sm text-slate-600 border-t pt-3">{footer}</div>}
        </div>
      )}
    </div>
  </div>
  );
};

// Department Card component (specific structure, used in Overview)
interface DepartmentOverviewCardProps {
  dept: DepartmentSummary;
}

const DepartmentOverviewCard: React.FC<DepartmentOverviewCardProps> = ({ dept }) => {
  const approvalRate = dept.total ? Math.min(Math.max((dept.approved / dept.total) * 100, 0), 100) : 0;
  return (
  <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-105 cursor-pointer group h-full overflow-hidden border border-slate-200/50" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.03) 0%, rgba(99, 102, 241, 0.03) 50%, rgba(14, 165, 233, 0.03) 100%)' }}>
    <div className="absolute inset-0 bg-gradient-to-br from-white/90 to-slate-50/90 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-100/60 via-indigo-100/60 to-sky-100/60 rounded-full -translate-y-10 translate-x-10 opacity-0 group-hover:opacity-70 transition-opacity duration-500"></div>
    
    <div className="relative z-10 p-6 flex flex-col h-full">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-sky-600 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
          <dept.icon className="h-6 w-6 text-white" />
        </div>
        <h3 className="text-lg font-semibold text-slate-800 group-hover:text-slate-900 transition-colors duration-300">{dept.name}</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-y-3 text-sm flex-grow mb-6">
        <div className="flex flex-col">
          <p className="text-slate-500">Total:</p>
          <p className="font-bold text-2xl text-slate-800 group-hover:text-slate-900 transition-colors duration-300">{dept.total}</p>
        </div>
        <div className="flex flex-col">
          <p className="text-blue-600">Approved:</p>
          <p className="font-bold text-xl text-blue-600">{dept.approved}</p>
        </div>
        <div className="flex flex-col">
          <p className="text-indigo-600">Pending:</p>
          <p className="font-bold text-xl text-indigo-600">{dept.pending}</p>
        </div>
        <div className="flex flex-col">
          <p className="text-sky-600">Rejected:</p>
          <p className="font-bold text-xl text-sky-600">{dept.rejected}</p>
        </div>
      </div>
      
      <div className="mt-auto">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-500">Approval Rate</span>
          <span className="text-xs font-semibold text-slate-700">{approvalRate.toFixed(0)}%</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden mb-4">
          <div className="h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-sky-500 rounded-full transition-all duration-700 ease-out" style={{ width: `${approvalRate}%` }}></div>
        </div>
        <button className="w-full py-3 text-sm font-medium bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 text-white hover:from-blue-700 hover:via-indigo-700 hover:to-sky-700 transition-all duration-300 rounded-xl shadow-lg hover:shadow-xl group-hover:scale-105">
          View Details
        </button>
      </div>
    </div>
  </div>
  );
};

// StatusBadge component removed as it's not used

// ApprovalRequestCard component removed as it's not used


// --- 3. CHART COMPONENTS (From previous step, used in Overview) ---

interface DepartmentBarChartProps {
  data: DepartmentBarDatum[];
  isLoading: boolean;
}

const DepartmentBarChart: React.FC<DepartmentBarChartProps> = ({ data, isLoading }) => (
  <div className="p-6 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg h-full min-h-[300px] border border-slate-200/50" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.03) 0%, rgba(99, 102, 241, 0.03) 50%, rgba(14, 165, 233, 0.03) 100%)' }}>
    <h2 className="text-xl font-semibold text-slate-800 mb-4">Department-wise Applications</h2>
    {data.length ? (
      <ResponsiveContainer width="100%" height="80%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
          barCategoryGap="20%"
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
          <XAxis dataKey="name" axisLine={false} tickLine={false} />
          <YAxis axisLine={false} tickLine={false} tickCount={8} />
          <Tooltip
            cursor={{ fill: 'rgba(243, 244, 246, 0.5)' }}
            contentStyle={{ backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '10px' }}
          />
          <Bar dataKey="Approved" stackId="a" fill="#3B82F6" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Pending" stackId="a" fill="#6366F1" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Rejected" stackId="a" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    ) : (
      <div className="flex h-[220px] items-center justify-center text-sm text-slate-500">
        {isLoading ? 'Loading department insights…' : 'No department data available yet.'}
      </div>
    )}
  </div>
);

interface StatusPieChartProps {
  data: PieDatum[];
  total: number;
  isLoading: boolean;
}

const StatusPieChart: React.FC<StatusPieChartProps> = ({ data, total, isLoading }) => (
  <div className="p-6 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg h-full min-h-[300px] flex flex-col border border-slate-200/50" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.03) 0%, rgba(99, 102, 241, 0.03) 50%, rgba(14, 165, 233, 0.03) 100%)' }}>
    <h2 className="text-xl font-semibold text-slate-800 mb-4">Overall Status Distribution</h2>
    <div className="flex-grow flex justify-center items-center">
      {data.some(d => d.value > 0) ? (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data as Array<Record<string, unknown>>}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={100}
              fill="#8884d8"
              paddingAngle={2}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '10px' }}
              formatter={(value: number | string, name: string) => {
                const numericValue = Number(value);
                const percentage = total ? ((numericValue / total) * 100).toFixed(1) : '0.0';
                return [`${numericValue} (${percentage}%)`, name];
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-[220px] items-center justify-center text-sm text-slate-500">
          {isLoading ? 'Loading status distribution…' : 'No status data available yet.'}
        </div>
      )}
    </div>
    <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm pt-4 border-t mt-4">
      {data.map(d => (
        <div key={d.name} className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }}></span>
          <span className="text-gray-600">
            {d.name}: <span className="font-semibold">{d.value}</span>
          </span>
        </div>
      ))}
    </div>
  </div>
);

interface WeeklyTrendLineChartProps {
  data: TrendDatum[];
  isLoading: boolean;
}

const WeeklyTrendLineChart: React.FC<WeeklyTrendLineChartProps> = ({ data, isLoading }) => (
  <div className="p-6 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg h-full min-h-[350px] border border-slate-200/50" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.03) 0%, rgba(99, 102, 241, 0.03) 50%, rgba(14, 165, 233, 0.03) 100%)' }}>
    <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center">
      <TrendingUp className="h-5 w-5 mr-2 text-slate-600" />
      Weekly Approval Trends
    </h2>
    {data.length ? (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
          <XAxis dataKey="name" axisLine={false} tickLine={false} />
          <YAxis axisLine={false} tickLine={false} tickCount={8} domain={[0, 'auto']} />
          <Tooltip
            contentStyle={{ backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '10px' }}
          />
          <Line type="monotone" dataKey="Approvals" stroke="#3B82F6" strokeWidth={3} dot={false} name="Approvals" />
          <Line type="monotone" dataKey="Rejections" stroke="#6366F1" strokeWidth={3} dot={false} name="Rejections" />
          <Legend />
        </LineChart>
      </ResponsiveContainer>
    ) : (
      <div className="flex h-[260px] items-center justify-center text-sm text-slate-500">
        {isLoading ? 'Analyzing weekly trends…' : 'Trend data will appear once approvals start flowing.'}
      </div>
    )}
  </div>
);


// --- 4. TAB VIEWS ---

// Overview Tab Content (from previous step)
interface OverviewContentProps {
  keyMetrics: KeyMetrics;
  departmentData: DepartmentSummary[];
  barChartData: DepartmentBarDatum[];
  pieChartData: PieDatum[];
  trendData: TrendDatum[];
  isLoading: boolean;
  dataSourceSummaries: DataSourceSummary[];
}

const OverviewContent: React.FC<OverviewContentProps> = ({ keyMetrics, departmentData, barChartData, pieChartData, trendData, isLoading, dataSourceSummaries }) => {
  const formatMetric = (value: number) => value.toLocaleString();
  const progressFor = (value: number) => keyMetrics.totalApplications > 0 ? (value / keyMetrics.totalApplications) * 100 : 0;

  const KeyMetricCards = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      <StatCard title="Total Applications" value={formatMetric(keyMetrics.totalApplications)} icon={Users} footer="Centralized approval management" loading={isLoading && !keyMetrics.totalApplications} progress={keyMetrics.totalApplications ? 100 : undefined} />
      <StatCard title="Pending" value={formatMetric(keyMetrics.pending)} icon={Clock} footer="Requires attention" loading={isLoading && !keyMetrics.totalApplications} progress={progressFor(keyMetrics.pending)} />
      <StatCard title="Approved" value={formatMetric(keyMetrics.approved)} icon={CheckCircle} footer="Successfully processed" loading={isLoading && !keyMetrics.totalApplications} progress={progressFor(keyMetrics.approved)} />
      <StatCard title="Rejected" value={formatMetric(keyMetrics.rejected)} icon={XCircle} footer="Finalized and closed" loading={isLoading && !keyMetrics.totalApplications} progress={progressFor(keyMetrics.rejected)} />
    </div>
  );

  const DepartmentSummaryCards = () => {
    if (!departmentData.length) {
      return (
        <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-8 text-center text-slate-500">
          {isLoading ? 'Loading department breakdown…' : 'No department insights available yet.'}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {departmentData.slice(0, 6).map(dept => (
          <DepartmentOverviewCard key={dept.id} dept={dept} />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <KeyMetricCards />
      <DepartmentSummaryCards />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DepartmentBarChart data={barChartData} isLoading={isLoading} />
        <StatusPieChart data={pieChartData} total={keyMetrics.totalApplications} isLoading={isLoading} />
      </div>

      <WeeklyTrendLineChart data={trendData} isLoading={isLoading} />

      <div className="space-y-4 mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-slate-800">Multi-Source Approval Inventory</h2>
          <span className="text-sm text-slate-500">Live insights from ESS modules</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {dataSourceSummaries.map(summary => (
            <div
              key={summary.label}
              className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white/80 shadow-lg transition-shadow duration-300 hover:shadow-2xl"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${summary.gradient} opacity-70`}></div>
              <div className="relative z-10 p-5 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{summary.label}</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{summary.total.toLocaleString()}</p>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-600">
                  <span>Pending {summary.pending.toLocaleString()}</span>
                  <span>Approved {summary.approved.toLocaleString()}</span>
                  <span>Rejected {summary.rejected.toLocaleString()}</span>
                  {typeof summary.issued === 'number' && (
                    <span>Issued {summary.issued.toLocaleString()}</span>
                  )}
                </div>
                {summary.extraLabel && (
                  <div className="mt-4 text-sm text-slate-700">
                    <span className="font-semibold">{summary.extraLabel}:</span> {summary.extraValue ?? '—'}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// DepartmentContent component removed as it's not used


// --- 5. MAIN APP COMPONENT ---

const ESSApprovalFlowsDashboard = () => {
  const [applications, setApplications] = useState<LeaveApplicationSummary[]>([]);
  const [payslips, setPayslips] = useState<PayslipRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const safeFetchJson = async (endpoint: string) => {
      try {
        const response = await essApiFetch(endpoint);
        return await response.json();
      } catch (fetchError) {
        console.warn(`ESSApprovalFlowsDashboard: failed to fetch ${endpoint}`, fetchError);
        return null;
      }
    };

    try {
      const [leavePayload, payslipPayload, expensePayload, assetPayload] = await Promise.all([
        safeFetchJson(ESS_PORTAL_ENDPOINTS.LEAVE.LIST()),
        safeFetchJson(ESS_PORTAL_ENDPOINTS.PAYSLIPS.LIST()),
        safeFetchJson(ESS_PORTAL_ENDPOINTS.EXPENSES.LIST()),
        safeFetchJson(ESS_PORTAL_ENDPOINTS.ASSETS.LIST()),
      ]);

      if (leavePayload) {
        const rawApplications = extractApplicationsFromPayload(leavePayload);
        const normalized = rawApplications.map((entry, index) => normalizeLeaveApplication(entry, index));
        if (isMountedRef.current) {
          setApplications(normalized);
        }
      } else if (isMountedRef.current) {
        setApplications([]);
      }

      if (isMountedRef.current) {
        setPayslips(extractListFromPayload(payslipPayload) as PayslipRecord[]);
        setExpenses(extractListFromPayload(expensePayload) as ExpenseRecord[]);
        setAssets(extractListFromPayload(assetPayload) as AssetRecord[]);
      }

      if (!leavePayload && !payslipPayload && !expensePayload && !assetPayload) {
        throw new Error('Failed to load data from all ESS modules');
      }
    } catch (err) {
      console.error('Failed to load approval dashboard data', err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Unable to load approval dashboard data');
        setApplications([]);
        setPayslips([]);
        setExpenses([]);
        setAssets([]);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchDashboardData]);

  const keyMetrics = useMemo(() => computeKeyMetrics(applications), [applications]);
  const departmentData = useMemo(() => computeDepartmentSummaries(applications), [applications]);
  const barChartData = useMemo(() => computeBarChartData(departmentData), [departmentData]);
  const pieChartData = useMemo(() => computePieChartData(keyMetrics), [keyMetrics]);
  const trendData = useMemo(() => computeWeeklyTrendData(applications), [applications]);

  const payslipSummary = useMemo(() => {
    const total = payslips.length;
    const pending = payslips.filter(p => matchesStatusKeyword(p.status, ['pending'])).length;
    const rejected = payslips.filter(p => matchesStatusKeyword(p.status, ['rejected'])).length;
    const approved = payslips.filter(p => matchesStatusKeyword(p.status, ['approved']) && !matchesStatusKeyword(p.status, ['rejected'])).length;
    const totalNetPay = payslips.reduce((sum, payslip) => sum + Number(payslip.totals?.netPay ?? 0), 0);
    return { total, pending, approved, rejected, totalNetPay };
  }, [payslips]);

  const expenseSummary = useMemo(() => {
    const total = expenses.length;
    const pending = expenses.filter(expense => matchesStatusKeyword(expense.status, ['pending'])).length;
    const rejected = expenses.filter(expense => matchesStatusKeyword(expense.status, ['rejected'])).length;
    const approved = expenses.filter(expense => matchesStatusKeyword(expense.status, ['approved']) && !matchesStatusKeyword(expense.status, ['rejected'])).length;
    const totalAmount = expenses.reduce((sum, expense) => sum + Number(expense.expenseDetails?.amount ?? 0), 0);
    return { total, pending, approved, rejected, totalAmount };
  }, [expenses]);

  const assetSummary = useMemo(() => {
    const total = assets.length;
    const pending = assets.filter(asset => matchesStatusKeyword(asset.status, ['pending'])).length;
    const rejected = assets.filter(asset => matchesStatusKeyword(asset.status, ['rejected'])).length;
    const issued = assets.filter(asset => matchesStatusKeyword(asset.status, ['issued'])).length;
    const approved = assets.filter(asset => matchesStatusKeyword(asset.status, ['approved']) && !matchesStatusKeyword(asset.status, ['rejected'])).length;
    const totalItems = assets.reduce((sum, asset) => sum + Number(asset.assetDetails?.quantity ?? 0), 0);
    return { total, pending, approved, rejected, issued, totalItems };
  }, [assets]);

  const dataSourceSummaries = useMemo<DataSourceSummary[]>(() => [
    {
      label: 'Leave Applications',
      gradient: 'from-blue-500/10 via-sky-500/10 to-cyan-500/10',
      total: keyMetrics.totalApplications,
      pending: keyMetrics.pending,
      approved: keyMetrics.approved,
      rejected: keyMetrics.rejected,
      extraLabel: 'Departments tracked',
      extraValue: departmentData.length,
    },
    {
      label: 'Payslips',
      gradient: 'from-indigo-500/10 via-purple-500/10 to-fuchsia-500/10',
      total: payslipSummary.total,
      pending: payslipSummary.pending,
      approved: payslipSummary.approved,
      rejected: payslipSummary.rejected,
      extraLabel: 'Net payout',
      extraValue: formatCurrencyValue(payslipSummary.totalNetPay),
    },
    {
      label: 'Expenses',
      gradient: 'from-emerald-500/10 via-teal-500/10 to-lime-500/10',
      total: expenseSummary.total,
      pending: expenseSummary.pending,
      approved: expenseSummary.approved,
      rejected: expenseSummary.rejected,
      extraLabel: 'Claimed',
      extraValue: formatCurrencyValue(expenseSummary.totalAmount),
    },
    {
      label: 'Assets',
      gradient: 'from-pink-500/10 via-rose-500/10 to-purple-500/10',
      total: assetSummary.total,
      pending: assetSummary.pending,
      approved: assetSummary.approved,
      rejected: assetSummary.rejected,
      issued: assetSummary.issued,
      extraLabel: 'Items requested',
      extraValue: assetSummary.totalItems,
    },
  ], [keyMetrics, departmentData.length, payslipSummary, expenseSummary, assetSummary]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: customStyles }} />
      <div className="min-h-screen bg-gradient-to-br from-indigo-50/30 via-white to-sky-50/30 relative overflow-hidden">
        {/* Ultra-Modern Premium Background Elements */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-indigo-100/15 to-blue-100/15 rounded-full -translate-y-40 translate-x-40 animate-float-slow"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-sky-100/15 to-indigo-100/15 rounded-full translate-y-32 -translate-x-32 animate-float-reverse"></div>
        <div className="absolute top-1/3 left-1/4 w-32 h-32 bg-gradient-to-r from-blue-100/10 to-sky-100/10 rounded-full animate-float delay-500"></div>
        
        <div className="relative z-10 p-4 sm:p-6 lg:p-8 font-['Inter',sans-serif]">
          {/* WORLD-CLASS HEADER DESIGN - #1 BEST */}
          <div className="relative overflow-hidden mb-8 animate-fade-in-up">
            {/* Ultra-Modern Multinational Premium Header */}
            <div className="relative bg-gradient-to-br from-blue-600 via-indigo-600 to-sky-600 rounded-3xl shadow-2xl border border-blue-400/40 backdrop-blur-xl overflow-hidden animate-slide-in-left">
              {/* Ultra-Modern Animated Background Pattern */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/8 via-transparent to-white/12 animate-pulse"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-500/20 to-transparent rounded-full -translate-y-16 translate-x-16 animate-float-slow"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-emerald-500/20 to-transparent rounded-full translate-y-12 -translate-x-12 animate-float-reverse"></div>
              <div className="absolute top-1/2 left-1/2 w-16 h-16 bg-gradient-to-r from-cyan-500/15 to-transparent rounded-full -translate-x-8 -translate-y-8 animate-float"></div>
              
              <div className="relative p-8">
                <div className="flex items-center justify-between">
                  {/* Left Section - Premium Icon and Content */}
                  <div className="flex items-center space-x-8 animate-slide-in-left">
                    {/* World-Class Icon Design */}
                    <div className="relative group animate-bounce-in">
                      <div className="w-20 h-20 bg-gradient-to-br from-white/40 to-white/20 backdrop-blur-xl rounded-3xl shadow-2xl flex items-center justify-center transform group-hover:scale-110 group-hover:rotate-12 transition-all duration-500 border border-white/50">
                        <svg className="w-12 h-12 text-white drop-shadow-2xl" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                        </svg>
                      </div>
                      {/* Ultra-Modern Premium Glow Effects */}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-indigo-400/30 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div>
                      <div className="absolute -inset-2 bg-gradient-to-br from-indigo-400/20 to-sky-600/20 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 -z-20"></div>
                      <div className="absolute -inset-4 bg-gradient-to-br from-blue-400/10 to-sky-600/10 rounded-3xl blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000 -z-30"></div>
                    </div>
                    
                    {/* Premium Title and Description */}
                    <div className="space-y-3 animate-fade-in-up delay-300">
                      <div className="flex items-center space-x-4">
                        <h1 className="text-5xl font-black text-white drop-shadow-2xl tracking-tight bg-gradient-to-r from-white via-indigo-100 to-sky-100 bg-clip-text text-transparent">
                          Approval Dashboard
                        </h1>
                      </div>
                      <p className="text-white/95 text-xl leading-relaxed max-w-2xl font-medium">
                        Centralized approval management system with intelligent workflow automation, real-time analytics, and enterprise-grade security for multinational operations.
                      </p>
                      
                      {/* Key Features Row */}
                      <div className="flex items-center space-x-6 mt-4 animate-slide-in-right delay-500">
                        <div className="flex items-center space-x-3 hover:scale-110 transition-transform duration-300 bg-white/5 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/10">
                          <div className="w-3 h-3 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full animate-pulse shadow-lg"></div>
                          <span className="text-white/90 text-sm font-semibold">Smart Analytics</span>
                        </div>
                        <div className="flex items-center space-x-3 hover:scale-110 transition-transform duration-300 bg-white/5 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/10">
                          <div className="w-3 h-3 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full animate-pulse delay-300 shadow-lg"></div>
                          <span className="text-white/90 text-sm font-semibold">Auto Workflows</span>
                        </div>
                        <div className="flex items-center space-x-3 hover:scale-110 transition-transform duration-300 bg-white/5 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/10">
                          <div className="w-3 h-3 bg-gradient-to-r from-sky-400 to-cyan-500 rounded-full animate-pulse delay-700 shadow-lg"></div>
                          <span className="text-white/90 text-sm font-semibold">Enterprise Ready</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Right Section - Premium Breadcrumb with Dynamic Colors */}
                  <div className="text-right animate-slide-in-right delay-700">
                    <div className="bg-gradient-to-r from-indigo-500/20 via-sky-500/20 to-blue-500/20 backdrop-blur-xl px-8 py-4 rounded-2xl border border-indigo-400/40 shadow-2xl relative overflow-hidden">
                      {/* Ultra-Modern Current Page Indicator */}
                      <div className="absolute inset-0 bg-gradient-to-r from-indigo-400/10 via-sky-400/10 to-blue-400/10 rounded-2xl"></div>
                      <div className="relative z-10">
                        <div className="text-sm text-white/90 font-semibold flex items-center justify-end">
                          <Link href="/" className="hover:text-indigo-300 transition-colors duration-300 cursor-pointer text-white/80 hover:text-white font-semibold">Home</Link> 
                          <span className="mx-3 text-white/60 text-lg">&gt;</span>
                          <span className="text-white font-bold bg-gradient-to-r from-indigo-400 via-sky-400 to-blue-400 bg-clip-text text-transparent flex items-center text-lg">
                            <div className="w-3 h-3 bg-gradient-to-r from-indigo-400 via-sky-400 to-blue-400 rounded-full mr-3 animate-pulse shadow-lg"></div>
                            ESS Approval Flows
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Ultra-Modern Premium Bottom Accent */}
              <div className="h-3 bg-gradient-to-r from-indigo-400 via-sky-500 to-blue-500 rounded-b-3xl animate-gradient-shift shadow-lg"></div>
            </div>
            
            {/* Ultra-Modern Premium Floating Elements */}
            <div className="absolute -top-4 -right-4 w-8 h-8 bg-gradient-to-br from-indigo-400 to-blue-500 rounded-full opacity-90 animate-float shadow-2xl"></div>
            <div className="absolute -bottom-4 -left-4 w-6 h-6 bg-gradient-to-br from-sky-400 to-indigo-500 rounded-full opacity-70 animate-float-reverse delay-1000 shadow-2xl"></div>
            <div className="absolute top-1/2 -right-3 w-4 h-4 bg-gradient-to-br from-blue-400 to-sky-500 rounded-full opacity-60 animate-bounce delay-500 shadow-2xl"></div>
            <div className="absolute top-1/4 -left-2 w-3 h-3 bg-gradient-to-br from-indigo-400 to-blue-500 rounded-full opacity-50 animate-float delay-300 shadow-lg"></div>
          </div>

          {/* Main Content Area */}
          <div className="pb-10 space-y-6">
            {error && (
              <div className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-800 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">Unable to load live approval stats.</p>
                  <p className="text-xs text-rose-700/80">Reason: {error}</p>
                </div>
                <button
                  type="button"
                  onClick={fetchDashboardData}
                  disabled={isLoading}
                  className="inline-flex items-center justify-center rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? 'Refreshing…' : 'Retry'}
                </button>
              </div>
            )}
            <OverviewContent
              keyMetrics={keyMetrics}
              departmentData={departmentData}
              barChartData={barChartData}
              pieChartData={pieChartData}
              trendData={trendData}
              isLoading={isLoading}
              dataSourceSummaries={dataSourceSummaries}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default ESSApprovalFlowsDashboard;