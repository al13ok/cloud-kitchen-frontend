"use client";

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { DollarLineIcon } from '@/icons';
import { apiFetch } from '@/lib/api';
import { User, Calendar, TrendingUp, TrendingDown, CreditCard, Download, ChevronDown, DollarSign } from 'lucide-react';
import jsPDF from 'jspdf';
import DashboardHeader from '@/components/header/DashboardHeader';
import { toast } from 'react-hot-toast';

interface PayslipDetails {
  id: string;
  payslipId: string;
  employee: {
    name: string;
    empId: string;
    email?: string;
    jobTitle: string;
    department: string;
    joinDate: string;
    panNumber: string;
    uanNumber: string;
  };
  payslipInfo: {
    payPeriod: string;
    payDate: string;
    generatedBy: string;
    remarks: string;
  };
  bankInfo: {
    accountNumber: string;
    ifscCode: string;
    pfNumber: string;
    esiNumber: string;
  };
  earnings: {
    basicSalary: number;
    hra: number;
    specialAllowance: number;
    bonus: number;
    overtimePay: number;
    otherEarnings: number;
    grossEarnings: number;
  };
  deductions: {
    pf: number;
    esi: number;
    tds: number;
    professionalTax: number;
    leaveDeductions: number;
    otherDeductions: number;
    totalDeductions: number;
  };
  netPay: number;
  status: 'Approve' | 'Reject' | 'Pending';
}

const PayslipViewPage: React.FC = () => {
  const router = useRouter();
  const params = useParams();
  const payslipId = params?.id as string;

  const [payslip, setPayslip] = useState<PayslipDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const downloadMenuRef = useRef<HTMLDivElement | null>(null);

  // Sample payslip data - fallback when API fails - wrapped in useMemo to prevent recreation
  const samplePayslip: PayslipDetails = useMemo(() => ({
    id: '1',
    payslipId: 'PS-2025-09-EMP0234',
    employee: {
      name: 'Tushar Baranwal',
      empId: 'EMP0234',
      jobTitle: 'Software Engineer',
      department: 'Engineering',
      joinDate: '10/05/2023',
      panNumber: 'ABCDE1234F',
      uanNumber: '100123456789'
    },
    payslipInfo: {
      payPeriod: '01-Sep-2025 to 30-Sep-2025',
      payDate: '30/09/2025',
      generatedBy: 'PayrollAdmin',
      remarks: 'Late coming deduction applied'
    },
    bankInfo: {
      accountNumber: 'XXXXXXXX1234',
      ifscCode: 'HDFC0001234',
      pfNumber: 'DL/12345/6789',
      esiNumber: 'ESI/98765'
    },
    earnings: {
      basicSalary: 34500,
      hra: 13800,
      specialAllowance: 5175,
      bonus: 2000,
      overtimePay: 1000,
      otherEarnings: 500,
      grossEarnings: 57500
    },
    deductions: {
      pf: 6900,
      esi: 460,
      tds: 1150,
      professionalTax: 200,
      leaveDeductions: 1000,
      otherDeductions: 300,
      totalDeductions: 10010
    },
    netPay: 47490,
    status: 'Approve'
  }), []);

  // API response type
  interface ApiPayslip {
    id: string;
    payslipId?: string;
    employeeInfo: {
      fullName: string;
      employeeCode: string;
      email: string;
      designation: string;
      department: string;
      dateOfJoining: string;
      panNumber: string;
      uan: string;
      bankAccountNo: string;
      ifscCode: string; 
    };
    payslipInfo: {
      payPeriodStart: string;
      payPeriodEnd: string;
      payDate: string;
    };
    earnings: Array<{ type: string; amount: number }>;
    deductions: Array<{ type: string; amount: number }>;
    totals: {
      totalEarnings: number;
      totalDeductions: number;
      netPay: number;
      grossPay: number;
    };
    additionalInfo?: {
      remarks?: string;
      pfNumber?: string;
      esiNumber?: string;
    };
  }

  // Helper function to parse month from date strings
  const parseMonth = (start: string, end: string) => {
    const pick = end || start;
    const parts = pick.split('/');
    const mm = parts[1];
    const yyyy = parts[2];
    return yyyy && mm ? `${yyyy}-${mm}` : pick;
  };

  // Map API data to PayslipDetails format - wrapped in useCallback to prevent recreation
  const mapApiToDetails = useCallback((apiItem: ApiPayslip): PayslipDetails => {
    const earningsMap: Record<string, number> = {};
    apiItem.earnings.forEach((e) => {
      earningsMap[e.type] = (earningsMap[e.type] || 0) + (e.amount || 0);
    });
    const deductionsMap: Record<string, number> = {};
    apiItem.deductions.forEach((d) => {
      deductionsMap[d.type] = (deductionsMap[d.type] || 0) + (d.amount || 0);
    });

    return {
      id: apiItem.id,
      payslipId: apiItem.payslipId || `PS-${parseMonth(apiItem.payslipInfo.payPeriodStart, apiItem.payslipInfo.payPeriodEnd)}-${apiItem.employeeInfo.employeeCode}`,
      employee: {
        name: apiItem.employeeInfo.fullName,
        empId: apiItem.employeeInfo.employeeCode,
        email: apiItem.employeeInfo.email,
        jobTitle: apiItem.employeeInfo.designation,
        department: apiItem.employeeInfo.department,
        joinDate: apiItem.employeeInfo.dateOfJoining,
        panNumber: apiItem.employeeInfo.panNumber,
        uanNumber: apiItem.employeeInfo.uan,
      },
      payslipInfo: {
        payPeriod: `${apiItem.payslipInfo.payPeriodStart} to ${apiItem.payslipInfo.payPeriodEnd}`,
        payDate: apiItem.payslipInfo.payDate,
        generatedBy: 'System',
        remarks: apiItem.additionalInfo?.remarks || '',
      },
      bankInfo: {
        accountNumber: apiItem.employeeInfo.bankAccountNo,
        ifscCode: apiItem.employeeInfo.ifscCode,
        pfNumber: apiItem.additionalInfo?.pfNumber || '',
        esiNumber: apiItem.additionalInfo?.esiNumber || '',
      },
      earnings: {
        basicSalary: earningsMap['Basic Salary'] || 0,
        hra: earningsMap['HRA'] || 0,
        specialAllowance: earningsMap['Special Allowance'] || 0,
        bonus: earningsMap['Bonus'] || 0,
        overtimePay: earningsMap['Overtime'] || 0,
        otherEarnings: Object.entries(earningsMap)
          .filter(([k]) => !['Basic Salary', 'HRA', 'Special Allowance', 'Bonus', 'Overtime'].includes(k))
          .reduce((sum, [, amt]) => sum + (amt || 0), 0),
        grossEarnings: apiItem.totals.totalEarnings,
      },
      deductions: {
        pf: deductionsMap['PF'] || 0,
        esi: deductionsMap['ESI'] || 0,
        tds: deductionsMap['TDS'] || 0,
        professionalTax: deductionsMap['Professional Tax'] || 0,
        leaveDeductions: deductionsMap['Leave Deductions'] || 0,
        otherDeductions: Object.entries(deductionsMap)
          .filter(([k]) => !['PF', 'ESI', 'TDS', 'Professional Tax', 'Leave Deductions'].includes(k))
          .reduce((sum, [, amt]) => sum + (amt || 0), 0),
        totalDeductions: apiItem.totals.totalDeductions,
      },
      netPay: apiItem.totals.netPay,
      status: (() => {
        // Map backend status to frontend status
        const status = (apiItem as unknown as Record<string, unknown>).status;
        if (status && typeof status === 'string') {
          const lowerStatus = status.toLowerCase();
          if (lowerStatus === 'approved' || lowerStatus === 'manager_approved' || 
              lowerStatus === 'hr_approved' || lowerStatus === 'it_approved' || 
              lowerStatus === 'finance_approved') {
            return 'Approve' as const;
          } else if (lowerStatus === 'rejected' || lowerStatus === 'manager_rejected' || 
                     lowerStatus === 'hr_rejected' || lowerStatus === 'it_rejected' || 
                     lowerStatus === 'finance_rejected') {
            return 'Reject' as const;
          } else {
            return 'Pending' as const;
          }
        }
        return 'Pending' as const;
      })(),
    };
  }, []);

  // Fetch payslip data
  useEffect(() => {
    const fetchPayslip = async () => {
      if (!payslipId) {
        setError('Payslip ID not provided');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Fetch all payslips and find the one with matching ID
        const response = await apiFetch('/api/v1/ess-portal/payslips', {
          headers: { accept: 'application/json' }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch payslips (${response.status})`);
        }

        const data = await response.json();
        const apiItems: ApiPayslip[] = data.data || data;

        // Find the payslip with matching ID
        const foundPayslip = apiItems.find(item => 
          item.id === payslipId || 
          item.employeeInfo.employeeCode === payslipId
        );

        if (foundPayslip) {
          setPayslip(mapApiToDetails(foundPayslip));
        } else {
          // Fallback to sample data if not found
          console.warn('Payslip not found, using sample data');
          setPayslip(samplePayslip);
        }
      } catch (err) {
        console.error('Error fetching payslip:', err);
        setError(err instanceof Error ? err.message : 'Failed to load payslip');
        // Fallback to sample data on error
        setPayslip(samplePayslip);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPayslip();

    // Poll for status updates every 5 seconds to reflect manager approval changes
    const interval = setInterval(async () => {
      try {
        const response = await apiFetch('/api/v1/ess-portal/payslips', {
          headers: { accept: 'application/json' }
        });

        if (!response.ok) return;

        const data = await response.json();
        const apiItems: ApiPayslip[] = data.data || data;

        const foundPayslip = apiItems.find(item => 
          item.id === payslipId || 
          item.employeeInfo.employeeCode === payslipId
        );

        if (foundPayslip) {
          const updatedPayslip = mapApiToDetails(foundPayslip);
          setPayslip(prevPayslip => {
            // Only update if status has changed
            if (!prevPayslip || prevPayslip.status !== updatedPayslip.status) {
              return updatedPayslip;
            }
            return prevPayslip;
          });
        }
      } catch (err) {
        // Ignore polling errors
        console.warn('Error polling payslip status:', err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [payslipId, mapApiToDetails, samplePayslip]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const numberToWords = (num: number): string => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    
    if (num === 0) return 'Zero';
    if (num < 10) return ones[num];
    if (num < 20) return teens[num - 10];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
    if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + numberToWords(num % 100) : '');
    if (num < 100000) return numberToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + numberToWords(num % 1000) : '');
    if (num < 10000000) return numberToWords(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 ? ' ' + numberToWords(num % 100000) : '');
    return numberToWords(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 ? ' ' + numberToWords(num % 10000000) : '');
  };

  // getStatusColor function removed as it's not used

  // Download functionality
  const handleDownloadPDF = () => {
    if (!payslip) return;
    
    try {
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(20);
      doc.text('PAYSLIP', 105, 20, { align: 'center' });
      doc.setFontSize(12);
      
      // Company Info
      doc.text('Company: Mobiloitte Technologies', 20, 35);
      doc.text('Payslip ID: ' + payslip.payslipId, 20, 42);
      doc.text('Pay Period: ' + payslip.payslipInfo.payPeriod, 20, 49);
      doc.text('Pay Date: ' + payslip.payslipInfo.payDate, 20, 56);
      
      // Employee Info
      doc.setFontSize(14);
      doc.text('Employee Information', 20, 70);
      doc.setFontSize(10);
      doc.text('Name: ' + payslip.employee.name, 20, 80);
      doc.text('Employee ID: ' + payslip.employee.empId, 20, 87);
      doc.text('Designation: ' + payslip.employee.jobTitle, 20, 94);
      doc.text('Department: ' + payslip.employee.department, 20, 101);
      doc.text('PAN: ' + payslip.employee.panNumber, 20, 108);
      doc.text('UAN: ' + payslip.employee.uanNumber, 20, 115);
      
      // Earnings
      doc.setFontSize(14);
      doc.text('Earnings', 20, 130);
      doc.setFontSize(10);
      let yPos = 140;
      doc.text('Basic Salary: ' + formatCurrency(payslip.earnings.basicSalary), 20, yPos);
      yPos += 7;
      doc.text('HRA: ' + formatCurrency(payslip.earnings.hra), 20, yPos);
      yPos += 7;
      doc.text('Special Allowance: ' + formatCurrency(payslip.earnings.specialAllowance), 20, yPos);
      yPos += 7;
      doc.text('Bonus: ' + formatCurrency(payslip.earnings.bonus), 20, yPos);
      yPos += 7;
      doc.text('Overtime Pay: ' + formatCurrency(payslip.earnings.overtimePay), 20, yPos);
      yPos += 7;
      doc.text('Other Earnings: ' + formatCurrency(payslip.earnings.otherEarnings), 20, yPos);
      yPos += 10;
      doc.setFontSize(12);
      doc.text('Gross Earnings: ' + formatCurrency(payslip.earnings.grossEarnings), 20, yPos);
      
      // Deductions
      doc.setFontSize(14);
      doc.text('Deductions', 110, 130);
      doc.setFontSize(10);
      yPos = 140;
      doc.text('PF: ' + formatCurrency(payslip.deductions.pf), 110, yPos);
      yPos += 7;
      doc.text('ESI: ' + formatCurrency(payslip.deductions.esi), 110, yPos);
      yPos += 7;
      doc.text('TDS: ' + formatCurrency(payslip.deductions.tds), 110, yPos);
      yPos += 7;
      doc.text('Professional Tax: ' + formatCurrency(payslip.deductions.professionalTax), 110, yPos);
      yPos += 7;
      doc.text('Leave Deductions: ' + formatCurrency(payslip.deductions.leaveDeductions), 110, yPos);
      yPos += 7;
      doc.text('Other Deductions: ' + formatCurrency(payslip.deductions.otherDeductions), 110, yPos);
      yPos += 10;
      doc.setFontSize(12);
      doc.text('Total Deductions: ' + formatCurrency(payslip.deductions.totalDeductions), 110, yPos);
      
      // Net Pay
      doc.setFontSize(16);
      doc.text('Net Pay: ' + formatCurrency(payslip.netPay), 20, yPos + 20);
      doc.setFontSize(10);
      doc.text('Amount in Words: ' + numberToWords(Math.floor(payslip.netPay)) + ' Rupees Only', 20, yPos + 30);
      
      // Bank Info
      doc.setFontSize(12);
      doc.text('Bank Information', 20, yPos + 45);
      doc.setFontSize(10);
      doc.text('Account Number: ' + payslip.bankInfo.accountNumber, 20, yPos + 55);
      doc.text('IFSC Code: ' + payslip.bankInfo.ifscCode, 20, yPos + 62);
      doc.text('PF Number: ' + payslip.bankInfo.pfNumber, 20, yPos + 69);
      doc.text('ESI Number: ' + payslip.bankInfo.esiNumber, 20, yPos + 76);
      
      // Footer
      doc.setFontSize(8);
      doc.text('Generated on: ' + new Date().toLocaleDateString(), 20, 280);
      doc.text('This is a computer generated payslip.', 20, 287);
      
      // Generate filename with custom format: payslip_id:date:time
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD format
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS format
      const filename = `${payslip.payslipId}:${dateStr}:${timeStr}.pdf`;
      
      // Save PDF
      doc.save(filename);
      setDownloadMenuOpen(false);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Error generating PDF. Please try again.');
    }
  };

  const handleDownloadCSV = () => {
    if (!payslip) return;
    
    try {
      const csvData = [
        ['Payslip ID', payslip.payslipId],
        ['Employee Name', payslip.employee.name],
        ['Employee ID', payslip.employee.empId],
        ['Designation', payslip.employee.jobTitle],
        ['Department', payslip.employee.department],
        ['Pay Period', payslip.payslipInfo.payPeriod],
        ['Pay Date', payslip.payslipInfo.payDate],
        [''],
        ['EARNINGS'],
        ['Basic Salary', formatCurrency(payslip.earnings.basicSalary)],
        ['HRA', formatCurrency(payslip.earnings.hra)],
        ['Special Allowance', formatCurrency(payslip.earnings.specialAllowance)],
        ['Bonus', formatCurrency(payslip.earnings.bonus)],
        ['Overtime Pay', formatCurrency(payslip.earnings.overtimePay)],
        ['Other Earnings', formatCurrency(payslip.earnings.otherEarnings)],
        ['Gross Earnings', formatCurrency(payslip.earnings.grossEarnings)],
        [''],
        ['DEDUCTIONS'],
        ['PF', formatCurrency(payslip.deductions.pf)],
        ['ESI', formatCurrency(payslip.deductions.esi)],
        ['TDS', formatCurrency(payslip.deductions.tds)],
        ['Professional Tax', formatCurrency(payslip.deductions.professionalTax)],
        ['Leave Deductions', formatCurrency(payslip.deductions.leaveDeductions)],
        ['Other Deductions', formatCurrency(payslip.deductions.otherDeductions)],
        ['Total Deductions', formatCurrency(payslip.deductions.totalDeductions)],
        [''],
        ['NET PAY', formatCurrency(payslip.netPay)],
        ['Amount in Words', numberToWords(Math.floor(payslip.netPay)) + ' Rupees Only'],
        [''],
        ['BANK INFORMATION'],
        ['Account Number', payslip.bankInfo.accountNumber],
        ['IFSC Code', payslip.bankInfo.ifscCode],
        ['PF Number', payslip.bankInfo.pfNumber],
        ['ESI Number', payslip.bankInfo.esiNumber]
      ];
      
      const csvContent = csvData.map(row => 
        row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
      ).join('\n');
      
      // Generate filename with custom format: payslip_id:date:time
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD format
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS format
      const filename = `${payslip.payslipId}:${dateStr}:${timeStr}.csv`;
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      
      setDownloadMenuOpen(false);
      
    } catch (error) {
      console.error('Error generating CSV:', error);
      toast.error('Error generating CSV. Please try again.');
    }
  };

  // Close download menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target as Node)) {
        setDownloadMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#00AFB9] to-[#FED9B7]"></div>
          <div className="absolute top-20 left-20 w-72 h-72 bg-[#00AFB9] rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float"></div>
          <div className="absolute top-40 right-20 w-72 h-72 bg-[#FED9B7] rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float" style={{ animationDelay: '2s' }}></div>
        </div>
        <div className="text-center animate-fade-in relative z-10">
          <div className="h-16 w-16 border-4 border-[#00AFB9] border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="text-2xl font-semibold text-slate-800 mb-2">Loading Payslip</h2>
          <p className="text-slate-600">Please wait while we fetch your payslip details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !payslip) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#00AFB9] to-[#FED9B7]"></div>
          <div className="absolute top-20 left-20 w-72 h-72 bg-[#00AFB9] rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float"></div>
          <div className="absolute top-40 right-20 w-72 h-72 bg-[#FED9B7] rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float" style={{ animationDelay: '2s' }}></div>
        </div>
        <div className="text-center animate-fade-in relative z-10">
          <div className="text-red-600 mb-6">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-slate-800 mb-4">Error Loading Payslip</h2>
          <p className="text-slate-600 mb-6 max-w-md mx-auto">{error}</p>
          <button
            onClick={() => router.push('/ess-portal/payslips')}
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#00AFB9] to-[#FED9B7] text-white rounded-xl hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Payslips
          </button>
        </div>
      </div>
    );
  }

  // No payslip data
  if (!payslip) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#00AFB9] to-[#FED9B7]"></div>
          <div className="absolute top-20 left-20 w-72 h-72 bg-[#00AFB9] rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float"></div>
          <div className="absolute top-40 right-20 w-72 h-72 bg-[#FED9B7] rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float" style={{ animationDelay: '2s' }}></div>
        </div>
        <div className="text-center animate-fade-in relative z-10">
          <div className="text-slate-400 mb-6">
            <DollarLineIcon className="w-16 h-16 mx-auto" />
          </div>
          <h2 className="text-2xl font-semibold text-slate-800 mb-4">Payslip Not Found</h2>
          <p className="text-slate-600 mb-6 max-w-md mx-auto">The requested payslip could not be found.</p>
          <button
            onClick={() => router.push('/ess-portal/payslips')}
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#00AFB9] to-[#FED9B7] text-white rounded-xl hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Payslips
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 lg:p-8">
      <DashboardHeader
        title="Payslip Details"
        subtitle="Comprehensive payslip information with detailed earnings breakdown, statutory deductions, employee information, and PDF export capabilities for official records and sharing."
        icon={DollarSign}
        iconColor="text-white"
        hideTenantPrefix={true}
      />

      <div className="max-w-7xl mx-auto mt-8">
        {/* Error Banner */}
        {error && payslip && (
          <div className="mb-8 animate-slide-down">
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6 shadow-sm">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-amber-400 dark:text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm text-amber-800 dark:text-amber-300">
                    {error}. Showing sample data as fallback.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Download Button */}
        <div className="mb-8 flex justify-end">
          <div className="relative" ref={downloadMenuRef}>
            <button
              onClick={() => setDownloadMenuOpen(!downloadMenuOpen)}
              className="inline-flex items-center px-6 py-3 bg-[#3366CC] hover:bg-[#2d5bb3] text-white rounded-xl hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 font-semibold"
            >
              <Download className="w-5 h-5 mr-2" />
              Download Payslip
              <ChevronDown className="w-4 h-4 ml-2" />
            </button>
            
            {downloadMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
                <button
                  onClick={handleDownloadPDF}
                  className="block w-full text-left px-4 py-3 text-sm text-gray-800 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors duration-200 flex items-center"
                >
                  <svg className="w-4 h-4 mr-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Download as PDF
                </button>
                <button
                  onClick={handleDownloadCSV}
                  className="block w-full text-left px-4 py-3 text-sm text-gray-800 dark:text-gray-200 hover:bg-green-50 dark:hover:bg-gray-700 transition-colors duration-200 flex items-center border-t border-gray-100 dark:border-gray-700"
                >
                  <svg className="w-4 h-4 mr-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download as CSV
                </button>
              </div>
            )}
          </div>
        </div>


        {/* Content */}
        <div className="space-y-8">
          {/* Information Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Employee Information */}
            <div className="group bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 animate-fade-in p-6">
              <div className="flex items-center mb-6">
                <div className="p-3 bg-[#3366CC] rounded-xl mr-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <User className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#3366CC] dark:text-[#4a7dd9]">Employee Information</h3>
              </div>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Employee Code:</span>
                  <span className="text-gray-900 dark:text-white font-mono">{payslip.employee.empId}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Full Name:</span>
                  <span className="text-gray-900 dark:text-white">{payslip.employee.name}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Email:</span>
                  <span className="text-gray-900 dark:text-white">{payslip.employee.email}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Designation:</span>
                  <span className="text-gray-900 dark:text-white">{payslip.employee.jobTitle}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Department:</span>
                  <span className="text-gray-900 dark:text-white">{payslip.employee.department}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Join Date:</span>
                  <span className="text-gray-900 dark:text-white">{payslip.employee.joinDate}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">PAN Number:</span>
                  <span className="text-gray-900 dark:text-white font-mono">{payslip.employee.panNumber}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">UAN Number:</span>
                  <span className="text-gray-900 dark:text-white font-mono">{payslip.employee.uanNumber}</span>
                </div>
              </div>
            </div>

            {/* Payslip Information */}
            <div className="group bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 animate-fade-in p-6">
              <div className="flex items-center mb-6">
                <div className="p-3 bg-[#3366CC] rounded-xl mr-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#3366CC] dark:text-[#4a7dd9]">Payslip Information</h3>
              </div>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Payslip ID:</span>
                  <span className="text-gray-900 dark:text-white font-mono text-xs">{payslip.payslipId}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Pay Period:</span>
                  <span className="text-gray-900 dark:text-white">{payslip.payslipInfo.payPeriod}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Pay Date:</span>
                  <span className="text-gray-900 dark:text-white">{payslip.payslipInfo.payDate}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Generated By:</span>
                  <span className="text-gray-900 dark:text-white">{payslip.payslipInfo.generatedBy}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Remarks:</span>
                  <span className="text-gray-900 dark:text-white">{payslip.payslipInfo.remarks}</span>
                </div>
              </div>
            </div>

            {/* Bank Information */}
            <div className="group bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 animate-fade-in p-6">
              <div className="flex items-center mb-6">
                <div className="p-3 bg-[#3366CC] rounded-xl mr-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <CreditCard className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#3366CC] dark:text-[#4a7dd9]">Bank Information</h3>
              </div>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Account Number:</span>
                  <span className="text-gray-900 dark:text-white font-mono">{payslip.bankInfo.accountNumber}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">IFSC Code:</span>
                  <span className="text-gray-900 dark:text-white font-mono">{payslip.bankInfo.ifscCode}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">PF Number:</span>
                  <span className="text-gray-900 dark:text-white font-mono">{payslip.bankInfo.pfNumber}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">ESI Number:</span>
                  <span className="text-gray-900 dark:text-white font-mono">{payslip.bankInfo.esiNumber}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Earnings and Deductions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Earnings Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden animate-slide-up">
              <div className="bg-[#3366CC] px-6 py-4">
                <h3 className="text-xl font-bold text-white flex items-center">
                  <TrendingUp className="w-6 h-6 mr-3" />
                  Earnings
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200">
                  <span className="text-gray-700 dark:text-gray-300">Basic Salary</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(payslip.earnings.basicSalary)}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200">
                  <span className="text-gray-700 dark:text-gray-300">HRA</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(payslip.earnings.hra)}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200">
                  <span className="text-gray-700 dark:text-gray-300">Special Allowance</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(payslip.earnings.specialAllowance)}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200">
                  <span className="text-gray-700 dark:text-gray-300">Bonus</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(payslip.earnings.bonus)}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200">
                  <span className="text-gray-700 dark:text-gray-300">Overtime Pay</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(payslip.earnings.overtimePay)}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200">
                  <span className="text-gray-700 dark:text-gray-300">Other Earnings</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(payslip.earnings.otherEarnings)}</span>
                </div>
                <div className="border-t-2 border-gray-200 dark:border-gray-700 pt-4 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-800 dark:text-white">Gross Earnings</span>
                    <span className="text-2xl font-bold text-[#3366CC] dark:text-[#4a7dd9]">{formatCurrency(payslip.earnings.grossEarnings)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Deductions Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden animate-slide-up">
              <div className="bg-[#3366CC] px-6 py-4">
                <h3 className="text-xl font-bold text-white flex items-center">
                  <TrendingDown className="w-6 h-6 mr-3" />
                  Deductions
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200">
                  <span className="text-gray-700 dark:text-gray-300">PF (Provident Fund)</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(payslip.deductions.pf)}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200">
                  <span className="text-gray-700 dark:text-gray-300">ESI (Employee State Insurance)</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(payslip.deductions.esi)}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200">
                  <span className="text-gray-700 dark:text-gray-300">TDS (Tax Deducted at Source)</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(payslip.deductions.tds)}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200">
                  <span className="text-gray-700 dark:text-gray-300">Professional Tax</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(payslip.deductions.professionalTax)}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200">
                  <span className="text-gray-700 dark:text-gray-300">Leave Deductions</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(payslip.deductions.leaveDeductions)}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200">
                  <span className="text-gray-700 dark:text-gray-300">Other Deductions</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(payslip.deductions.otherDeductions)}</span>
                </div>
                <div className="border-t-2 border-gray-200 dark:border-gray-700 pt-4 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-800 dark:text-white">Total Deductions</span>
                    <span className="text-2xl font-bold text-[#3366CC] dark:text-[#4a7dd9]">{formatCurrency(payslip.deductions.totalDeductions)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Net Pay Section */}
          <div className="bg-[#3366CC] text-white rounded-xl p-8 shadow-lg animate-slide-up">
            <div className="text-center">
              <h3 className="text-3xl font-bold mb-6">Net Pay</h3>
              <div className="text-6xl font-bold mb-6">
                {formatCurrency(payslip.netPay)}
              </div>
              <div className="text-xl text-white/90">
                {numberToWords(Math.floor(payslip.netPay))} Rupees Only
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
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

        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }

        .animate-slide-up {
          animation: slide-up 0.6s ease-out;
        }

        .animate-slide-down {
          animation: slide-down 0.4s ease-out;
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default PayslipViewPage;