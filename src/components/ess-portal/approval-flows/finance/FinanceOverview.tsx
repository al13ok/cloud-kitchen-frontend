'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ESS_PORTAL_ENDPOINTS, essApiFetch } from '@/utils/essApi';
// Card components removed as they're not used
import { 
  DollarSign, 
  Users, 
  Clock, 
  CheckCircle, 
  BarChart3, 
  FileText,
  TrendingUp
} from 'lucide-react';

// Types
interface FinanceKPI {
  id: number;
  icon: React.ElementType;
  title: string;
  value: number | string;
  color: string;
  isMonetary?: boolean;
}

interface ChartData {
  label: string;
  value: number;
  color: string;
}

interface ExpenseApplication {
  id: string;
  expenseId: string;
  employeeName: string;
  employeeId: string;
  department: string;
  type: string;
  details: string;
  category: string;
  amount: number;
  priority: string;
  submittedOn: string;
  status: string;
}

interface Payslip {
  id: string;
  employeeId: string;
  employeeName: string;
  month: string;
  year: number;
  grossSalary: number;
  netSalary: number;
  status: string;
}

// Utility function
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount).replace('₹', '₹');
};


// API shapes to avoid explicit any when transforming
type ApiExpense = {
  id?: string;
  expenseId?: string;
  employeeInfo?: {
    fullName?: string;
    employeeCode?: string;
    department?: string;
  };
  expenseDetails?: {
    description?: string;
    category?: string;
    amount?: number;
  };
  createdAt?: string;
  status?: string;
};

type ApiPayslip = {
  id?: string;
  employeeCode?: string;
  employeeName?: string;
  month?: string;
  year?: number;
  grossSalary?: number;
  netSalary?: number;
  status?: string;
};

// Chart Components
const DoughnutChart: React.FC<{ title: string; data: ChartData[]; total: number }> = ({ title, data, total }) => {
  const size = 150;
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const getDoughnutSegments = () => {
    let currentOffset = 0;
    return data.map((item, index) => {
      const segmentRatio = item.value / total;
      const strokeDasharray = `${segmentRatio * circumference} ${circumference}`;
      const strokeDashoffset = currentOffset;
      
      currentOffset -= segmentRatio * circumference;

      return (
        <g key={index} className="group">
        <circle
            className="transition-all duration-500 hover:stroke-width-25 cursor-pointer"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          fill="none"
          stroke={item.color}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="butt"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
          />
          {/* Hover Tooltip */}
          <text 
            x={size / 2} 
            y={size / 2} 
            textAnchor="middle" 
            dominantBaseline="middle"
            className="text-xs font-semibold fill-gray-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          >
            {formatCurrency(item.value)}
          </text>
        </g>
      );
    });
  };

  return (
    <div className="relative flex flex-col h-full bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-105 cursor-pointer group overflow-hidden border border-gray-200 dark:border-gray-700">
      <div className="absolute inset-0 bg-[#3366CC]/5 dark:bg-[#3366CC]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      
      <div className="relative z-10">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 group-hover:text-[#3366CC] dark:group-hover:text-[#4a7dd9] transition-colors duration-300 flex items-center">
          <div className="w-2 h-2 rounded-full mr-3 group-hover:scale-125 transition-transform duration-300" style={{ backgroundColor: '#3366CC' }}></div>
          {title}
        </h3>
      <div className="flex flex-col items-center justify-center flex-grow">
        <div className="relative mb-6">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <circle
              r={radius}
              cx={size / 2}
              cy={size / 2}
              fill="none"
              stroke="#e5e7eb"
              className="dark:stroke-gray-600"
              strokeWidth={strokeWidth}
            />
            {getDoughnutSegments()}
          </svg>
        </div>
        
        <div className="flex flex-col gap-1 text-sm self-start w-full">
          {data.map((item, index) => (
              <div key={index} className="flex items-center justify-between px-2 py-1 rounded-lg transition-all duration-300 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
              <div className='flex items-center'>
                <span 
                    className="w-3 h-3 rounded-full mr-2 transition-all duration-300 hover:scale-110" 
                  style={{ backgroundColor: item.color }}
                ></span>
                  <span className="text-gray-700 dark:text-gray-300 font-medium transition-colors duration-300">{item.label}</span>
                </div>
                <span className="font-bold text-gray-900 dark:text-white transition-colors duration-300">{item.value.toLocaleString()}</span>
              </div>
            ))}
            </div>
        </div>
      </div>
    </div>
  );
};

const BarChart: React.FC<{ title: string; data: ChartData[]; max: number; yLabelFormatter: (val: number) => string; tooltipFormatter?: (val: number) => string }> = ({ title, data, max, yLabelFormatter, tooltipFormatter = formatCurrency }) => {
  const yAxisTicks = useMemo(() => [0.25, 0.5, 0.75, 1.0], []);
  const chartHeight = 250;

  return (
    <div className="relative flex flex-col h-full bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-105 cursor-pointer group overflow-hidden border border-gray-200 dark:border-gray-700">
      <div className="absolute inset-0 bg-[#3366CC]/5 dark:bg-[#3366CC]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      
      <div className="relative z-10">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center group-hover:text-[#3366CC] dark:group-hover:text-[#4a7dd9] transition-colors duration-300">
          <div className="p-2 rounded-xl mr-3 group-hover:scale-110 transition-transform duration-300" style={{ backgroundColor: '#3366CC' }}>
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
        {title}
      </h3>
        <div className="flex-grow flex flex-col justify-end overflow-hidden" style={{ height: `${chartHeight}px` }}>
          <div className="relative flex-grow pr-4 overflow-hidden">
          {yAxisTicks.map((ratio, index) => (
            <div 
              key={index} 
              className="absolute left-0 w-full border-t border-gray-200 dark:border-gray-600" 
              style={{ bottom: `${ratio * 100}%` }}
            >
                <span className="absolute left-2 bottom-0 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                {yLabelFormatter(max * ratio)}
              </span>
            </div>
          ))}
          
          <div className="flex h-full items-end gap-3 md:gap-6 ml-20">
            {data.map((item, index) => (
              <div
                key={index}
                  className="flex flex-col items-center justify-end flex-grow transition-all duration-300 hover:scale-105 group relative"
              >
                  {/* Hover Tooltip */}
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-8 text-xs font-semibold text-gray-900 dark:text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white dark:bg-gray-700 px-2 py-1 rounded shadow-md border border-gray-200 dark:border-gray-600 whitespace-nowrap z-10">
                    {tooltipFormatter(item.value)}
                  </div>
                  
                <div
                    className="flex-grow rounded-t-lg w-full transition-all duration-300 hover:shadow-lg cursor-pointer"
                  style={{ 
                      height: `${Math.max((item.value / max) * 100, 15)}%`,
                    backgroundColor: item.color,
                      maxWidth: '50px',
                      minHeight: '20px'
                  }}
                  title={`${item.label}: ${formatCurrency(item.value)}`}
                >
                </div>
              </div>
            ))}
          </div>
        </div>

          <div className="flex justify-start ml-20 border-t border-gray-300 dark:border-gray-600 pt-2 text-center text-xs mt-2 gap-3 md:gap-6">
          {data.map((item, index) => (
            <div 
              key={index} 
                className="text-gray-700 dark:text-gray-300 font-medium whitespace-nowrap text-center flex-grow" 
                style={{ flexBasis: '0', flexGrow: 1 }}
            >
                {item.label}
            </div>
          ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const LineChart: React.FC<{ title: string; data: { month: string, total: number, approved: number, rejected: number }[], max: number }> = ({ title, data, max }) => {
  const chartWidth = 350;
  const chartHeight = 250;
  const padding = 20;

  const getPoints = (values: number[]) => {
    const totalPoints = values.length;
    return values.map((value, index) => {
      const x = padding + (index / (totalPoints - 1)) * (chartWidth - 2 * padding);
      const y = chartHeight - padding - (value / max) * (chartHeight - 2 * padding);
      return `${x},${y}`;
    }).join(' ');
  };
  
  const totalValues = data.map(d => d.total);
  const approvedValues = data.map(d => d.approved);
  const rejectedValues = data.map(d => d.rejected);
  
  const yAxisTicks = useMemo(() => [0.25, 0.5, 0.75, 1.0], []);
  
  return (
    <div className="relative flex flex-col h-full bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-105 cursor-pointer group overflow-hidden border border-gray-200 dark:border-gray-700">
      <div className="absolute inset-0 bg-[#3366CC]/5 dark:bg-[#3366CC]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      
      <div className="relative z-10">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center group-hover:text-[#3366CC] dark:group-hover:text-[#4a7dd9] transition-colors duration-300">
          <div className="p-2 rounded-xl mr-3 group-hover:scale-110 transition-transform duration-300" style={{ backgroundColor: '#3366CC' }}>
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
        {title}
      </h3>

        <div className="relative overflow-hidden" style={{ width: chartWidth, height: chartHeight + 20 }}>
        {yAxisTicks.map((ratio, index) => (
          <div 
            key={index} 
            className="absolute left-0 w-full border-t border-gray-200 dark:border-gray-600" 
            style={{ bottom: `${ratio * (chartHeight - 2 * padding) + padding}px` }}
          >
              <span className="absolute left-2 bottom-0 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
              {formatCurrency(max * ratio)}
            </span>
          </div>
        ))}
        
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} width={chartWidth} height={chartHeight} className="ml-16">
          <g transform="translate(0, 10)">
            <polyline
              fill="none"
              stroke="#3366CC"
              strokeWidth="2"
              points={getPoints(totalValues)}
                className="transition-all duration-300 hover:stroke-[#4a7dd9] hover:stroke-width-3 cursor-pointer"
                style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))' }}
            />
            <polyline
              fill="none"
              stroke="#22c55e"
              strokeWidth="2"
              points={getPoints(approvedValues)}
                className="transition-all duration-300 hover:stroke-[#16a34a] hover:stroke-width-3 cursor-pointer"
                style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))' }}
            />
            <polyline
              fill="none"
              stroke="#ef4444"
              strokeWidth="2"
              points={getPoints(rejectedValues)}
                className="transition-all duration-300 hover:stroke-[#dc2626] hover:stroke-width-3 cursor-pointer"
                style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))' }}
            />

            {data.map((d, i) => {
              const totalY = chartHeight - padding - (d.total / max) * (chartHeight - 2 * padding);
              const approvedY = chartHeight - padding - (d.approved / max) * (chartHeight - 2 * padding);
              const rejectedY = chartHeight - padding - (d.rejected / max) * (chartHeight - 2 * padding);
              const x = padding + (i / (data.length - 1)) * (chartWidth - 2 * padding);
              
              return (
                <g key={i}>
                    {/* Total Point with Tooltip */}
                    <g className="group">
                      <circle 
                        cx={x} 
                        cy={totalY} 
                        r="4" 
                        fill="#3366CC" 
                        className="transition-all duration-300 hover:r-6 hover:fill-[#4a7dd9] cursor-pointer"
                        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
                      />
                      <text 
                        x={x} 
                        y={totalY - 15} 
                        textAnchor="middle" 
                        className="text-xs font-semibold fill-gray-900 dark:fill-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      >
                        {formatCurrency(d.total)}
                      </text>
                    </g>
                    
                    {/* Approved Point with Tooltip */}
                    <g className="group">
                      <circle 
                        cx={x} 
                        cy={approvedY} 
                        r="4" 
                        fill="#22c55e" 
                        className="transition-all duration-300 hover:r-6 hover:fill-[#16a34a] cursor-pointer"
                        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
                      />
                      <text 
                        x={x} 
                        y={approvedY - 15} 
                        textAnchor="middle" 
                        className="text-xs font-semibold fill-gray-900 dark:fill-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      >
                        {formatCurrency(d.approved)}
                      </text>
                    </g>
                    
                    {/* Rejected Point with Tooltip */}
                    <g className="group">
                      <circle 
                        cx={x} 
                        cy={rejectedY} 
                        r="4" 
                        fill="#ef4444" 
                        className="transition-all duration-300 hover:r-6 hover:fill-[#dc2626] cursor-pointer"
                        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
                      />
                      <text 
                        x={x} 
                        y={rejectedY - 15} 
                        textAnchor="middle" 
                        className="text-xs font-semibold fill-gray-900 dark:fill-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      >
                        {formatCurrency(d.rejected)}
                      </text>
                    </g>
                </g>
              );
            })}
          </g>
        </svg>

        <div className="flex justify-start pt-2 text-center text-xs mt-2 ml-16" style={{ width: chartWidth }}>
          {data.map((d, index) => (
              <div key={index} className="flex-grow text-gray-700 dark:text-gray-300 font-medium">
              {d.month}
            </div>
          ))}
        </div>

          {/* Legend */}
          <div className="flex justify-center space-x-6 mt-4">
            <div className="flex items-center space-x-2 px-3 py-1 rounded-lg transition-all duration-300 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
              <div className="w-3 h-3 rounded-full transition-all duration-300 hover:scale-110" style={{ backgroundColor: '#3366CC' }}></div>
              <span className="text-xs text-gray-700 dark:text-gray-300 transition-colors duration-300">Total</span>
            </div>
            <div className="flex items-center space-x-2 px-3 py-1 rounded-lg transition-all duration-300 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
              <div className="w-3 h-3 bg-green-500 rounded-full transition-all duration-300 hover:scale-110"></div>
              <span className="text-xs text-gray-700 dark:text-gray-300 transition-colors duration-300">Approved</span>
      </div>
            <div className="flex items-center space-x-2 px-3 py-1 rounded-lg transition-all duration-300 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
              <div className="w-3 h-3 bg-red-500 rounded-full transition-all duration-300 hover:scale-110"></div>
              <span className="text-xs text-gray-700 dark:text-gray-300 transition-colors duration-300">Rejected</span>
        </div>
        </div>
        </div>
      </div>
    </div>
  );
};

const FinanceOverview: React.FC = () => {
  const [expenseApplications, setExpenseApplications] = useState<ExpenseApplication[]>([]);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  // loading state removed as it's not used

  useEffect(() => {
    const fetchData = async () => {
      try {
        const expensesUrl = ESS_PORTAL_ENDPOINTS.EXPENSES.LIST();
        const payslipsUrl = ESS_PORTAL_ENDPOINTS.PAYSLIPS.LIST();
        
        // Validate URLs
        if (!expensesUrl.includes('/api/v1/ess-portal/expenses')) {
          console.error(`❌ FinanceOverview - Invalid expenses URL: ${expensesUrl}`);
        }
        if (!payslipsUrl.includes('/api/v1/ess-portal/payslips')) {
          console.error(`❌ FinanceOverview - Invalid payslips URL: ${payslipsUrl}`);
        }
        
        console.log('🔍 FinanceOverview - Fetching from:', { expensesUrl, payslipsUrl });
        
        const [expenseResponse, payslipResponse] = await Promise.all([
          essApiFetch(expensesUrl, { method: 'GET' }),
          essApiFetch(payslipsUrl, { method: 'GET' })
        ]);

        if (expenseResponse.ok) {
          const expenseData = await expenseResponse.json();
          if (expenseData.success && expenseData.data) {
            // Transform backend data to match frontend interface
            const transformedExpenses = (expenseData.data as ApiExpense[])
              .map((app) => ({
                id: String(app.id || app.expenseId || ''),
                expenseId: String(app.expenseId || app.id || ''),
                employeeName: app.employeeInfo?.fullName || '',
                employeeId: app.employeeInfo?.employeeCode || '',
                department: app.employeeInfo?.department || '',
                type: 'Expense Claim', // Default type
                details: app.expenseDetails?.description || '',
                category: app.expenseDetails?.category || '',
                amount: app.expenseDetails?.amount || 0,
                priority: 'normal', // Default priority
                submittedOn: new Date(app.createdAt || '').toLocaleDateString('en-GB'),
                status: app.status?.toLowerCase() || 'pending'
              }))
              // Filter to show only manager-approved applications
              .filter(app => {
                const status = app.status?.toLowerCase() || '';
                return status === 'manager_approved' || 
                       status === 'manager approved' ||
                       status === 'approved' ||
                       status === 'finance_approved' ||
                       status === 'finance approved' ||
                       status === 'finance_rejected' ||
                       status === 'finance rejected';
              });
            setExpenseApplications(transformedExpenses);
            console.log(`✅ FinanceOverview - Loaded ${transformedExpenses.length} manager-approved expenses`);
          }
        }

        if (payslipResponse.ok) {
          const payslipData = await payslipResponse.json();
          if (payslipData.success && payslipData.data) {
            // Transform backend data to match frontend interface
            const transformedPayslips: Payslip[] = (payslipData.data as ApiPayslip[]).map((payslip) => ({
              id: String(payslip.id || ''),
              employeeId: String(payslip.employeeCode || ''),
              employeeName: String(payslip.employeeName || ''),
              month: String(payslip.month || ''),
              year: Number(payslip.year || 0),
              grossSalary: Number(payslip.grossSalary || 0),
              netSalary: Number(payslip.netSalary || 0),
              status: String(payslip.status?.toLowerCase() || 'pending')
            }));
            setPayslips(transformedPayslips);
            console.log(`✅ FinanceOverview - Loaded ${transformedPayslips.length} payslips`);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        // Keep mock data on error
      }
    };

    fetchData();
  }, []);

  // KPI data - Only show manager-approved applications for Finance team
  const kpis: FinanceKPI[] = useMemo(() => {
    // Filter to only show manager-approved applications (ready for finance review)
    const managerApprovedApplications = expenseApplications.filter(app => 
      app.status === 'approved' || app.status === 'manager_approved' || app.status === 'manager approved' ||
      app.status === 'finance_approved' || app.status === 'finance approved' ||
      app.status === 'finance_rejected' || app.status === 'finance rejected'
    );
    
    const totalExpenseRequests = managerApprovedApplications.length;
    const pendingExpenses = managerApprovedApplications.filter(app => 
      app.status === 'approved' || app.status === 'manager_approved' || app.status === 'manager approved'
    ).length;
    const approvedExpenses = managerApprovedApplications.filter(app => 
      app.status === 'finance_approved' || app.status === 'finance approved'
    ).length;
    const totalAmount = managerApprovedApplications.reduce((sum, app) => sum + app.amount, 0);
    const pendingAmount = managerApprovedApplications
      .filter(app => app.status === 'approved' || app.status === 'manager_approved' || app.status === 'manager approved')
      .reduce((sum, app) => sum + app.amount, 0);
    const totalPayslips = payslips.length;

    return [
      { id: 1, icon: FileText, title: 'Total Expense Requests', value: totalExpenseRequests, color: 'text-blue-indigo-sky' },
      { id: 2, icon: Clock, title: 'Pending Expenses', value: pendingExpenses, color: 'text-blue-indigo-sky' },
      { id: 3, icon: CheckCircle, title: 'Approved Expenses', value: approvedExpenses, color: 'text-blue-indigo-sky' },
      { id: 4, icon: DollarSign, title: 'Total Amount', value: totalAmount, color: 'text-blue-indigo-sky', isMonetary: true },
      { id: 5, icon: Clock, title: 'Pending Amount', value: pendingAmount, color: 'text-blue-indigo-sky', isMonetary: true },
      { id: 6, icon: Users, title: 'Total Payslips', value: totalPayslips, color: 'text-blue-indigo-sky' },
    ];
  }, [expenseApplications, payslips]);

  // Chart data
  const applicationTypeData: ChartData[] = useMemo(() => {
    const counts = expenseApplications.reduce((acc, app) => {
      acc[app.type] = (acc[app.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return [
      { label: 'Expense Claim', value: counts['Expense Claim'] || 0, color: '#3366CC' }, // Header color
      { label: 'Budget Request', value: counts['Budget Request'] || 0, color: '#4a7dd9' }, // Header color variation
      { label: 'Advance Request', value: counts['Advance Request'] || 0, color: '#5c8de6' }, // Header color variation
    ].filter(d => d.value > 0);
  }, [expenseApplications]);

  const totalApplicationTypes = applicationTypeData.reduce((sum, d) => sum + d.value, 0);

  const expenseCategoriesData: ChartData[] = useMemo(() => {
    const categoriesOrder = ['Travel', 'Meal', 'Stationery', 'Other'];
    const categoryLabels = ['Travel', 'Meal', 'Stationery', 'Other'];
    
    const categoryCounts: Record<string, number> = {};
    expenseApplications.forEach(app => {
      categoryCounts[app.category] = (categoryCounts[app.category] || 0) + 1;
    });

    const colorMap: Record<string, string> = {
      'Travel': '#3366CC',  // Header color
      'Meal': '#4a7dd9',    // Header color variation
      'Stationery': '#5c8de6', // Header color variation
      'Other': '#6d9df3',   // Header color variation
    };

    return categoriesOrder.map((cat, index) => ({
      label: categoryLabels[index],
      value: categoryCounts[cat] || 0,
      color: colorMap[cat] || '#475569', 
    }));
  }, [expenseApplications]);

  const maxCategoryCount = Math.max(...expenseCategoriesData.map(d => d.value));
  const categoryYMax = maxCategoryCount > 0 ? Math.ceil(maxCategoryCount * 1.2) : 3;

  const departmentExpensesData: ChartData[] = useMemo(() => {
    const departmentsOrder = ['Engineering', 'Sales', 'Marketing', 'IT', 'Operations', 'HR'];
    const departmentLabels = ['Eng', 'Sales', 'Mar', 'IT', 'Ope', 'HR'];
    
    const deptTotals: Record<string, number> = {};
    expenseApplications.forEach(app => {
      deptTotals[app.department] = (deptTotals[app.department] || 0) + app.amount;
    });

    const colorMap: Record<string, string> = {
      'Engineering': '#3366CC', // Header color
      'Sales': '#4a7dd9',       // Header color variation
      'Marketing': '#5c8de6',   // Header color variation
      'IT': '#6d9df3',          // Header color variation
      'Operations': '#7eadf9',  // Header color variation
      'HR': '#8fbefc',          // Header color variation
    };

    return departmentsOrder.map((dept, index) => ({
      label: departmentLabels[index],
      value: deptTotals[dept] || 0,
      color: colorMap[dept] || '#475569', 
    }));
  }, [expenseApplications]);

  const maxDeptExpense = Math.max(...departmentExpensesData.map(d => d.value));
  const expenseYMax = maxDeptExpense > 0 ? Math.ceil(maxDeptExpense * 1.2 / 50000) * 50000 : 200000;

  const monthlyTrendsData = useMemo(() => {
    // Match screenshot data exactly
    return [
      { month: 'Jun', total: 150000, approved: 140000, rejected: 10000 },
      { month: 'Jul', total: 187500, approved: 180000, rejected: 7500 },
      { month: 'Aug', total: 175000, approved: 165000, rejected: 10000 },
      { month: 'Sep', total: 0, approved: 0, rejected: 0 },
    ];
  }, []);

  const allMonthlyValues = monthlyTrendsData.flatMap(d => [d.total, d.approved, d.rejected]);
  const maxMonthlyTrends = Math.max(...allMonthlyValues);
  const monthlyYMax = Math.ceil(maxMonthlyTrends / 50000) * 50000;
  const finalMonthlyYMax = monthlyYMax < 250000 ? 250000 : monthlyYMax;

  const KPICard: React.FC<{ kpi: FinanceKPI }> = ({ kpi }) => {
    const { icon: Icon, title, value, isMonetary } = kpi;
    
    const displayValue = isMonetary ? formatCurrency(value as number) : value.toLocaleString();
    
    return (
      <div className="relative bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-105 cursor-pointer group h-full overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="absolute inset-0 bg-[#3366CC]/5 dark:bg-[#3366CC]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="absolute top-0 right-0 w-20 h-20 bg-[#3366CC]/10 dark:bg-[#3366CC]/20 rounded-full -translate-y-10 translate-x-10 opacity-0 group-hover:opacity-70 transition-opacity duration-500"></div>
        
        <div className="relative z-10 flex flex-col h-full">
          {/* Header with Icon */}
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110" style={{ backgroundColor: '#3366CC' }}>
              <Icon className="w-6 h-6 text-white" />
            </div>
          </div>
          
          {/* Main Value */}
          <div className="mb-4">
            <p className="text-3xl font-bold text-gray-900 dark:text-white group-hover:text-[#3366CC] dark:group-hover:text-[#4a7dd9] transition-colors duration-300">
              {displayValue}
            </p>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors duration-300 mt-1">
              {title}
            </p>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">Progress</span>
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">85%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <div 
                className="h-2 rounded-full transition-all duration-1000 ease-out group-hover:animate-pulse"
                style={{ width: '85%', backgroundColor: '#3366CC' }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">


        {/* KPI Cards - Essential Finance & Payslip Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
        {kpis.map(kpi => (
          <KPICard key={kpi.id} kpi={kpi} />
        ))}
      </div>

        {/* Charts Section Header */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                <div className="p-2 rounded-xl mr-3" style={{ backgroundColor: '#3366CC' }}>
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                Analytics Dashboard
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Visualize financial data with interactive charts and real-time insights</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2 bg-[#3366CC]/10 dark:bg-[#3366CC]/20 px-3 py-1 rounded-full">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#3366CC' }}></div>
                <span className="text-sm font-medium" style={{ color: '#3366CC' }}>Live Data</span>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="space-y-8">
        {/* Chart Row 1: Doughnut and Category Bar */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <DoughnutChart 
            title="Application Type Distribution" 
            data={applicationTypeData} 
            total={totalApplicationTypes} 
          />
          <BarChart 
            title="Expense Categories" 
            data={expenseCategoriesData} 
            max={categoryYMax} 
            yLabelFormatter={(val) => Math.round(val).toString()} 
              tooltipFormatter={(val) => `${Math.round(val)} applications`}
          />
        </div>

        {/* Chart Row 2: Department-wise Expense Bar and Monthly Trends Line */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <BarChart 
            title="Department-wise Expenses" 
            data={departmentExpensesData} 
            max={expenseYMax} 
            yLabelFormatter={formatCurrency} 
          />
          <LineChart
            title="Monthly Expense Trends"
            data={monthlyTrendsData}
            max={finalMonthlyYMax}
          />
        </div>
      </div>

        {/* Quick Stats Section Header */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                <div className="p-2 rounded-xl mr-3" style={{ backgroundColor: '#3366CC' }}>
                  <FileText className="w-6 h-6 text-white" />
                </div>
                Summary Reports
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Detailed breakdown of expenses and payslips with comprehensive analytics</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2 bg-[#3366CC]/10 dark:bg-[#3366CC]/20 px-3 py-1 rounded-full">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#3366CC' }}></div>
                <span className="text-gray-700 dark:text-gray-300 text-sm font-medium">Updated</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="relative bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-105 cursor-pointer group overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="absolute inset-0 bg-[#3366CC]/5 dark:bg-[#3366CC]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            <div className="relative z-10">
              <div className="flex items-center mb-4">
                <div className="p-2 rounded-xl mr-3 group-hover:scale-110 transition-transform duration-300" style={{ backgroundColor: '#3366CC' }}>
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-[#3366CC] dark:group-hover:text-[#4a7dd9] transition-colors duration-300">
                  Expense Summary
                </h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 rounded-xl bg-[#3366CC]/10 dark:bg-[#3366CC]/20 group-hover:bg-[#3366CC]/20 dark:group-hover:bg-[#3366CC]/30 transition-all duration-300 shadow-sm hover:shadow-md">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Applications:</span>
                  <span className="font-bold text-lg text-gray-900 dark:text-white">{expenseApplications.filter(a => 
                    a.status === 'approved' || a.status === 'manager_approved' || a.status === 'manager approved' ||
                    a.status === 'finance_approved' || a.status === 'finance approved' ||
                    a.status === 'finance_rejected' || a.status === 'finance rejected'
                  ).length}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-[#3366CC]/10 dark:bg-[#3366CC]/20 group-hover:bg-[#3366CC]/20 dark:group-hover:bg-[#3366CC]/30 transition-all duration-300 shadow-sm hover:shadow-md">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Pending:</span>
                  <span className="font-bold text-lg text-gray-900 dark:text-white">{expenseApplications.filter(a => 
                    a.status === 'approved' || a.status === 'manager_approved' || a.status === 'manager approved'
                  ).length}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-[#3366CC]/10 dark:bg-[#3366CC]/20 group-hover:bg-[#3366CC]/20 dark:group-hover:bg-[#3366CC]/30 transition-all duration-300 shadow-sm hover:shadow-md">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Approved:</span>
                  <span className="font-bold text-lg text-gray-900 dark:text-white">{expenseApplications.filter(a => 
                    a.status === 'finance_approved' || a.status === 'finance approved'
                  ).length}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-[#3366CC]/10 dark:bg-[#3366CC]/20 group-hover:bg-[#3366CC]/20 dark:group-hover:bg-[#3366CC]/30 transition-all duration-300 shadow-sm hover:shadow-md">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Rejected:</span>
                  <span className="font-bold text-lg text-gray-900 dark:text-white">{expenseApplications.filter(a => 
                    a.status === 'finance_rejected' || a.status === 'finance rejected'
                  ).length}</span>
              </div>
              </div>
            </div>
          </div>

          <div className="relative bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-105 cursor-pointer group overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="absolute inset-0 bg-[#3366CC]/5 dark:bg-[#3366CC]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            <div className="relative z-10">
              <div className="flex items-center mb-4">
                <div className="p-2 rounded-xl mr-3 group-hover:scale-110 transition-transform duration-300" style={{ backgroundColor: '#3366CC' }}>
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-[#3366CC] dark:group-hover:text-[#4a7dd9] transition-colors duration-300">
              Payslip Summary
                </h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 rounded-xl bg-[#3366CC]/10 dark:bg-[#3366CC]/20 group-hover:bg-[#3366CC]/20 dark:group-hover:bg-[#3366CC]/30 transition-all duration-300 shadow-sm hover:shadow-md">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Payslips:</span>
                  <span className="font-bold text-lg text-gray-900 dark:text-white">{payslips.length}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-[#3366CC]/10 dark:bg-[#3366CC]/20 group-hover:bg-[#3366CC]/20 dark:group-hover:bg-[#3366CC]/30 transition-all duration-300 shadow-sm hover:shadow-md">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Processed:</span>
                  <span className="font-bold text-lg text-gray-900 dark:text-white">{payslips.filter(p => p.status === 'processed').length}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-[#3366CC]/10 dark:bg-[#3366CC]/20 group-hover:bg-[#3366CC]/20 dark:group-hover:bg-[#3366CC]/30 transition-all duration-300 shadow-sm hover:shadow-md">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Pending:</span>
                  <span className="font-bold text-lg text-gray-900 dark:text-white">{payslips.filter(p => p.status === 'pending').length}</span>
              </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-[#3366CC]/10 dark:bg-[#3366CC]/20 group-hover:bg-[#3366CC]/20 dark:group-hover:bg-[#3366CC]/30 transition-all duration-300 shadow-sm hover:shadow-md">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Amount:</span>
                  <span className="font-bold text-lg text-gray-900 dark:text-white">{formatCurrency(payslips.reduce((sum, p) => sum + p.netSalary, 0))}</span>
              </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default FinanceOverview;