'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthHeaders } from '@/utils/api';
import DashboardHeader from '@/components/header/DashboardHeader';
import {
  User,
  CreditCard,
  DollarSign,
  Calculator,
  Calendar,
  Save,
  ArrowLeft
} from 'lucide-react';

// Types
interface Employee {
  employeeCode: string;
  fullName: string;
  email: string;
  department: string;
  designation: string;
  bankAccountNo: string;
  ifscCode: string;
  panNumber: string;
  uan: string;
  dateOfJoining: string;
}

interface PayslipFormData {
  employeeCode: string;
  employeeName: string;
  email: string;
  department: string;
  designation: string;
  bankAccountNo: string;
  ifscCode: string;
  panNumber: string;
  uan: string;
  pfNumber: string;
  esiNumber: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  payDate: string;
  basicSalary: number;
  hra: number;
  specialAllowance: number;
  otherAllowances: number;
  pf: number;
  esi: number;
  tds: number;
  otherDeductions: number;
  remarks: string;
}

const FinancePayslipCreateForm: React.FC = () => {
  const router = useRouter();
  const [formData, setFormData] = useState<PayslipFormData>({
    employeeCode: '',
    employeeName: '',
    email: '',
    department: '',
    designation: '',
    bankAccountNo: '',
    ifscCode: '',
    panNumber: '',
    uan: '',
    pfNumber: '',
    esiNumber: '',
    payPeriodStart: '',
    payPeriodEnd: '',
    payDate: '',
    basicSalary: 0,
    hra: 0,
    specialAllowance: 0,
    otherAllowances: 0,
    pf: 0,
    esi: 0,
    tds: 0,
    otherDeductions: 0,
    remarks: ''
  });

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Calculate totals
  const totalEarnings = formData.basicSalary + formData.hra + formData.specialAllowance + formData.otherAllowances;
  const totalDeductions = formData.pf + formData.esi + formData.tds + formData.otherDeductions;
  const netPay = totalEarnings - totalDeductions;

  // Sample employees data - wrapped in useMemo to prevent recreation on every render
  const sampleEmployees = useMemo(() => [
    {
      employeeCode: 'EMP001',
      fullName: 'John Doe',
      email: 'john.doe@company.com',
      department: 'Engineering',
      designation: 'Software Engineer',
      bankAccountNo: '1234567890',
      ifscCode: 'HDFC0001234',
      panNumber: 'ABCDE1234F',
      uan: '100123456789',
      dateOfJoining: '2020-01-15'
    },
    {
      employeeCode: 'EMP002',
      fullName: 'Jane Smith',
      email: 'jane.smith@company.com',
      department: 'Human Resources',
      designation: 'HR Manager',
      bankAccountNo: '0987654321',
      ifscCode: 'ICIC0005678',
      panNumber: 'FGHIJ5678K',
      uan: '200987654321',
      dateOfJoining: '2019-06-01'
    },
    {
      employeeCode: 'EMP003',
      fullName: 'Mike Johnson',
      email: 'mike.johnson@company.com',
      department: 'Finance',
      designation: 'Finance Analyst',
      bankAccountNo: '1122334455',
      ifscCode: 'SBIN0009999',
      panNumber: 'KLMNO9012L',
      uan: '301112233445',
      dateOfJoining: '2021-03-10'
    },
    {
      employeeCode: 'EMP004',
      fullName: 'Sarah Wilson',
      email: 'sarah.wilson@company.com',
      department: 'Marketing',
      designation: 'Marketing Manager',
      bankAccountNo: '5566778899',
      ifscCode: 'AXIS0001111',
      panNumber: 'PQRST3456M',
      uan: '401556677889',
      dateOfJoining: '2022-08-15'
    },
    {
      employeeCode: 'EMP005',
      fullName: 'David Brown',
      email: 'david.brown@company.com',
      department: 'Sales',
      designation: 'Sales Executive',
      bankAccountNo: '9988776655',
      ifscCode: 'KOTAK0002222',
      panNumber: 'UVWXY7890N',
      uan: '501998877665',
      dateOfJoining: '2023-01-20'
    }
  ], []);

  // Initialize with sample employees immediately
  useEffect(() => {
    setEmployees(sampleEmployees);
    setFilteredEmployees(sampleEmployees);
  }, [sampleEmployees]);

  // Filter employees based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredEmployees(employees);
    } else {
      const filtered = employees.filter(emp =>
        emp.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.department.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredEmployees(filtered);
    }
  }, [searchTerm, employees]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.employee-dropdown')) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle employee selection
  const handleEmployeeSelect = (employee: Employee) => {
    setFormData(prev => ({
      ...prev,
      employeeCode: employee.employeeCode || '',
      employeeName: employee.fullName || '',
      email: employee.email || '',
      department: employee.department || '',
      designation: employee.designation || '',
      bankAccountNo: employee.bankAccountNo || '',
      ifscCode: employee.ifscCode || '',
      panNumber: employee.panNumber || '',
      uan: employee.uan || '',
      pfNumber: '', // Will be filled by finance team
      esiNumber: '' // Will be filled by finance team
    }));
    setSearchTerm(employee.fullName);
    setShowDropdown(false);
  };

  // Handle search input change
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setShowDropdown(true);
    if (value.trim() === '') {
      setFormData(prev => ({
        ...prev,
        employeeCode: '',
        employeeName: '',
        email: '',
        department: '',
        designation: '',
        bankAccountNo: '',
        ifscCode: '',
        panNumber: '',
        uan: '',
        pfNumber: '',
        esiNumber: ''
      }));
    }
  };

  // Handle form input changes
  const handleInputChange = (field: keyof PayslipFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Helper function to get API base URL with proper path
      const getApiBase = () => {
        const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ||
          process.env.NEXT_PUBLIC_BACKEND_URL ||
          'https://py-mobiloitte.converiqo.ai').replace(/\/+$/, '');

        if (baseUrl.includes('/api/v1/ess-portal')) {
          return baseUrl;
        }

        return `${baseUrl}/api/v1/ess-portal`;
      };

      const API_BASE = getApiBase();
      console.log('🔍 FinancePayslipCreateForm - API_BASE:', API_BASE);

      const payslipData = {
        employeeInfo: {
          employeeCode: formData.employeeCode,
          fullName: formData.employeeName,
          email: formData.email,
          department: formData.department,
          designation: formData.designation,
          dateOfJoining: '2020-01-01', // Default date
          bankAccountNo: formData.bankAccountNo,
          ifscCode: formData.ifscCode,
          panNumber: formData.panNumber,
          uan: formData.uan
        },
        payslipInfo: {
          payPeriodStart: formData.payPeriodStart,
          payPeriodEnd: formData.payPeriodEnd,
          payDate: formData.payDate
        },
        earnings: [
          { type: 'Basic Salary', amount: formData.basicSalary },
          { type: 'HRA', amount: formData.hra },
          { type: 'Special Allowance', amount: formData.specialAllowance },
          { type: 'Other Allowances', amount: formData.otherAllowances }
        ],
        deductions: [
          { type: 'PF', amount: formData.pf },
          { type: 'ESI', amount: formData.esi },
          { type: 'TDS', amount: formData.tds },
          { type: 'Other Deductions', amount: formData.otherDeductions }
        ],
        additionalInfo: {
          pfNumber: formData.pfNumber,
          esiNumber: formData.esiNumber,
          remarks: formData.remarks
        }
      };

      const createUrl = `${API_BASE}/payslips`;
      console.log('🔍 FinancePayslipCreateForm - Create URL:', createUrl);

      if (!createUrl.includes('/api/v1/ess-portal/payslips')) {
        console.error(`❌ FinancePayslipCreateForm - Invalid URL: ${createUrl}`);
        throw new Error(`Invalid API URL: ${createUrl}. Expected URL to contain /api/v1/ess-portal/payslips`);
      }

      const response = await fetch(createUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'accept': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(payslipData)
      });

      if (response.ok) {
        setSuccess('Payslip created successfully!');
        // Reset form
        setFormData({
          employeeCode: '',
          employeeName: '',
          email: '',
          department: '',
          designation: '',
          bankAccountNo: '',
          ifscCode: '',
          panNumber: '',
          uan: '',
          pfNumber: '',
          esiNumber: '',
          payPeriodStart: '',
          payPeriodEnd: '',
          payDate: '',
          basicSalary: 0,
          hra: 0,
          specialAllowance: 0,
          otherAllowances: 0,
          pf: 0,
          esi: 0,
          tds: 0,
          otherDeductions: 0,
          remarks: ''
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create payslip');
      }
    } catch (error) {
      console.error('Error creating payslip:', error);
      setError(error instanceof Error ? error.message : 'Failed to create payslip');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Header */}
        <DashboardHeader
          title="Create Payslip"
          subtitle="Generate payslip for employee"
          icon={DollarSign}
          iconColor="text-white"
          hideTenantPrefix={true}
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'ESS Portal', href: '/ess-portal' },
            { label: 'Finance', href: '/ess-approval-flows/finance' },
            { label: 'Create Payslip' }
          ]}
          actions={
            <button
              onClick={() => router.push('/ess-approval-flows/finance')}
              className="flex items-center px-6 py-3 bg-white/20 rounded-xl backdrop-blur-sm border border-white/30 text-white hover:bg-white/30 transition-all duration-200 hover:scale-105 whitespace-nowrap"
              title="Back to Finance Approvals"
            >
              <ArrowLeft className="w-5 h-5 mr-2 flex-shrink-0" />
              <span className="font-medium whitespace-nowrap">Back</span>
            </button>
          }
        />

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6 mt-8">
          {/* Employee Selection */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl dark:shadow-gray-900/50 border border-gray-200 dark:border-gray-700 hover:shadow-2xl transition-all duration-300 p-6 lg:p-8">
            <div className="flex items-center mb-6">
              <div className="p-3 rounded-xl bg-[#3366CC]/10 dark:bg-[#3366CC]/20 mr-4">
                <User className="w-6 h-6 text-[#3366CC] dark:text-[#4a7dd9]" />
              </div>
              <h2 className="text-2xl font-bold text-[#3366CC] dark:text-[#4a7dd9]">Employee Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="relative employee-dropdown">
                <label className="block text-sm font-medium text-[#3366CC] dark:text-[#4a7dd9] mb-2">
                  Search Employee *
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Type employee name, ID, or department..."
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#3366CC] focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400"
                  required
                />

                {/* Dropdown */}
                {showDropdown && filteredEmployees.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl shadow-lg dark:shadow-gray-900 max-h-60 overflow-y-auto">
                    {filteredEmployees.map((emp) => (
                      <div
                        key={emp.employeeCode}
                        onClick={() => handleEmployeeSelect(emp)}
                        className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer border-b border-gray-100 dark:border-gray-600 last:border-b-0 transition-colors"
                      >
                        <div className="font-medium text-gray-900 dark:text-gray-100">{emp.fullName}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {emp.employeeCode} • {emp.department} • {emp.designation}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Employee Name
                </label>
                <input
                  type="text"
                  value={formData.employeeName || ''}
                  onChange={(e) => handleInputChange('employeeName', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#3366CC] focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#3366CC] focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Department
                </label>
                <input
                  type="text"
                  value={formData.department || ''}
                  onChange={(e) => handleInputChange('department', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#3366CC] focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Designation
                </label>
                <input
                  type="text"
                  value={formData.designation || ''}
                  onChange={(e) => handleInputChange('designation', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#3366CC] focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
          </div>

          {/* Bank Information */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl dark:shadow-gray-900/50 border border-gray-200 dark:border-gray-700 hover:shadow-2xl transition-all duration-300 p-6 lg:p-8">
            <div className="flex items-center mb-6">
              <div className="p-3 rounded-xl bg-[#3366CC]/10 dark:bg-[#3366CC]/20 mr-4">
                <CreditCard className="w-6 h-6 text-[#3366CC] dark:text-[#4a7dd9]" />
              </div>
              <h2 className="text-2xl font-bold text-[#3366CC] dark:text-[#4a7dd9]">Bank Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Account Number *
                </label>
                <input
                  type="text"
                  value={formData.bankAccountNo || ''}
                  onChange={(e) => handleInputChange('bankAccountNo', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#3366CC] focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400"
                  placeholder="Enter bank account number"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  IFSC Code *
                </label>
                <input
                  type="text"
                  value={formData.ifscCode || ''}
                  onChange={(e) => handleInputChange('ifscCode', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#3366CC] focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400"
                  placeholder="Enter IFSC code"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  PF Number
                </label>
                <input
                  type="text"
                  value={formData.pfNumber || ''}
                  onChange={(e) => handleInputChange('pfNumber', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#3366CC] focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400"
                  placeholder="Enter PF number"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  ESI Number
                </label>
                <input
                  type="text"
                  value={formData.esiNumber || ''}
                  onChange={(e) => handleInputChange('esiNumber', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#3366CC] focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400"
                  placeholder="Enter ESI number"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  PAN Number
                </label>
                <input
                  type="text"
                  value={formData.panNumber || ''}
                  onChange={(e) => handleInputChange('panNumber', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#3366CC] focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400"
                  placeholder="Enter PAN number"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  UAN Number
                </label>
                <input
                  type="text"
                  value={formData.uan || ''}
                  onChange={(e) => handleInputChange('uan', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#3366CC] focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400"
                  placeholder="Enter UAN number"
                />
              </div>
            </div>
          </div>

          {/* Pay Period */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl dark:shadow-gray-900/50 border border-gray-200 dark:border-gray-700 hover:shadow-2xl transition-all duration-300 p-6 lg:p-8">
            <div className="flex items-center mb-6">
              <div className="p-3 rounded-xl bg-[#3366CC]/10 dark:bg-[#3366CC]/20 mr-4">
                <Calendar className="w-6 h-6 text-[#3366CC] dark:text-[#4a7dd9]" />
              </div>
              <h2 className="text-2xl font-bold text-[#3366CC] dark:text-[#4a7dd9]">Pay Period</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Pay Period Start *
                </label>
                <input
                  type="date"
                  value={formData.payPeriodStart || ''}
                  onChange={(e) => handleInputChange('payPeriodStart', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#3366CC] focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Pay Period End *
                </label>
                <input
                  type="date"
                  value={formData.payPeriodEnd || ''}
                  onChange={(e) => handleInputChange('payPeriodEnd', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#3366CC] focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Pay Date *
                </label>
                <input
                  type="date"
                  value={formData.payDate || ''}
                  onChange={(e) => handleInputChange('payDate', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#3366CC] focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  required
                />
              </div>
            </div>
          </div>

          {/* Salary Details */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl dark:shadow-gray-900/50 border border-gray-200 dark:border-gray-700 hover:shadow-2xl transition-all duration-300 p-6 lg:p-8">
            <div className="flex items-center mb-6">
              <div className="p-3 rounded-xl bg-[#3366CC]/10 dark:bg-[#3366CC]/20 mr-4">
                <DollarSign className="w-6 h-6 text-[#3366CC] dark:text-[#4a7dd9]" />
              </div>
              <h2 className="text-2xl font-bold text-[#3366CC] dark:text-[#4a7dd9]">Salary Details</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Earnings */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Earnings</h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Basic Salary *
                  </label>
                  <input
                    type="number"
                    value={formData.basicSalary || 0}
                    onChange={(e) => handleInputChange('basicSalary', parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#3366CC] focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    HRA
                  </label>
                  <input
                    type="number"
                    value={formData.hra || 0}
                    onChange={(e) => handleInputChange('hra', parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#3366CC] focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Special Allowance
                  </label>
                  <input
                    type="number"
                    value={formData.specialAllowance || 0}
                    onChange={(e) => handleInputChange('specialAllowance', parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#3366CC] focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Other Allowances
                  </label>
                  <input
                    type="number"
                    value={formData.otherAllowances || 0}
                    onChange={(e) => handleInputChange('otherAllowances', parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#3366CC] focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>

              {/* Deductions */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Deductions</h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    PF
                  </label>
                  <input
                    type="number"
                    value={formData.pf || 0}
                    onChange={(e) => handleInputChange('pf', parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#3366CC] focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    ESI
                  </label>
                  <input
                    type="number"
                    value={formData.esi || 0}
                    onChange={(e) => handleInputChange('esi', parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#3366CC] focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    TDS
                  </label>
                  <input
                    type="number"
                    value={formData.tds || 0}
                    onChange={(e) => handleInputChange('tds', parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#3366CC] focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Other Deductions
                  </label>
                  <input
                    type="number"
                    value={formData.otherDeductions || 0}
                    onChange={(e) => handleInputChange('otherDeductions', parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#3366CC] focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Salary Summary */}
          <div className="bg-gradient-to-r from-[#3366CC]/10 to-[#3366CC]/5 dark:from-[#3366CC]/20 dark:to-[#3366CC]/10 rounded-2xl shadow-xl dark:shadow-gray-900/50 border border-[#3366CC]/20 dark:border-[#3366CC]/30 p-6 lg:p-8">
            <div className="flex items-center mb-6">
              <div className="p-3 rounded-xl bg-[#3366CC]/20 dark:bg-[#3366CC]/30 mr-4">
                <Calculator className="w-6 h-6 text-[#3366CC] dark:text-[#4a7dd9]" />
              </div>
              <h2 className="text-2xl font-bold text-[#3366CC] dark:text-[#4a7dd9]">Salary Summary</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-md">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Total Earnings</h3>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">₹{totalEarnings.toLocaleString()}</p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-md">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Total Deductions</h3>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">₹{totalDeductions.toLocaleString()}</p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-md">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Net Pay</h3>
                <p className="text-2xl font-bold text-[#3366CC] dark:text-[#4a7dd9]">₹{netPay.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Remarks */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl dark:shadow-gray-900/50 border border-gray-200 dark:border-gray-700 hover:shadow-2xl transition-all duration-300 p-6 lg:p-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Remarks
              </label>
              <textarea
                value={formData.remarks || ''}
                onChange={(e) => handleInputChange('remarks', e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#3366CC] focus:border-[#3366CC] bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400"
                placeholder="Enter any remarks or notes..."
              />
            </div>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
              <p className="text-green-600 dark:text-green-400">{success}</p>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-[#3366CC] hover:bg-[#2952a3] dark:bg-[#4a7dd9] dark:hover:bg-[#3366CC] text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Create Payslip
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FinancePayslipCreateForm;
