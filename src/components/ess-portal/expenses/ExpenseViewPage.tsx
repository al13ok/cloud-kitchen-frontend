"use client";

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import { Download, ChevronDown, DollarSign, ArrowLeft } from 'lucide-react';
import jsPDF from 'jspdf';
import DashboardHeader from '@/components/header/DashboardHeader';
import { toast } from 'react-hot-toast';

interface ExpenseDetails {
  id: string;
  expenseId: string;
  employee: {
    name: string;
    code: string;
    email?: string;
    designation: string;
    department: string;
  };
  title: string;
  category: string;
  amount: number;
  date: string;
  submittedDate: string;
  submittedTime: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected' | 'reimbursed';
  approver?: string;
  approvedDate?: string;
  rejectionReason?: string;
  receipt?: string;
  updatedAt?: string;
}

const ExpenseViewPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const expenseId = searchParams.get('id');

  const [expenseDetails, setExpenseDetails] = useState<ExpenseDetails | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showReceiptPreview, setShowReceiptPreview] = useState<boolean>(false);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);
  const [receiptImageError, setReceiptImageError] = useState(false);
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const downloadMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;

    const loadExpenseData = () => {
      setIsLoading(true);
      setError(null);
      try {
        if (typeof window !== 'undefined') {
          // Prefer selectedExpense, but fall back to selectedFinanceApplication (when navigating from Finance recent table)
          const raw = sessionStorage.getItem('selectedExpense') || sessionStorage.getItem('selectedFinanceApplication');
          if (raw) {
            const claim = JSON.parse(raw);

            // createdAt may be missing on finance table objects; try a few fallbacks
            const created = new Date(claim.createdAt || claim.expenseDetails?.date || claim.submittedOn || Date.now());
            const submittedDate = created.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const submittedTime = created.toLocaleTimeString('en-GB', { hour12: false });

            // normalize possible employee info locations
            const employeeInfo = claim.employeeInfo || (claim.employee ? { fullName: claim.employee.name, employeeCode: claim.employee.code, email: claim.employee.email, designation: claim.employee.designation, department: claim.employee.department } : undefined);
            const expenseDetailsObj = claim.expenseDetails || { title: claim.title || claim.details || '', category: claim.category || '', amount: claim.amount || 0, date: claim.date || claim.submittedOn || '' };

            const details: ExpenseDetails = {
              id: claim.id,
              expenseId: claim.id,
              employee: {
                name: employeeInfo?.fullName || claim.employeeName || '',
                code: employeeInfo?.employeeCode || claim.employeeId || '',
                email: employeeInfo?.email || undefined,
                designation: employeeInfo?.designation || '',
                department: employeeInfo?.department || '',
              },
              title: expenseDetailsObj?.title || '',
              category: expenseDetailsObj?.category || '',
              amount: Number(expenseDetailsObj?.amount || 0),
              date: expenseDetailsObj?.date || '',
              submittedDate,
              submittedTime,
              description: expenseDetailsObj?.description || claim.details || '',
              status: (() => {
              const status = (claim.status || claim.state || 'pending').toString().toLowerCase();
              if (status === 'approved') {
                return 'manager_approved' as const;
              } else if (status === 'rejected') {
                return 'manager_rejected' as const;
              } else if (status === 'hr_approved') {
                return 'hr_approved' as const;
              } else if (status === 'hr_rejected') {
                return 'hr_rejected' as const;
              } else if (status === 'it_approved') {
                return 'it_approved' as const;
              } else if (status === 'it_rejected') {
                return 'it_rejected' as const;
              } else if (status === 'finance_approved') {
                return 'finance_approved' as const;
              } else if (status === 'finance_rejected') {
                return 'finance_rejected' as const;
              } else {
                return 'pending' as const;
              }
            })(),
              receipt: expenseDetailsObj?.receiptFileName || claim.receipt || undefined,
              updatedAt: claim.statusDate || claim.updatedAt || claim.approvedDate || undefined,
            } as ExpenseDetails;
            
            if (mounted) {
              setExpenseDetails(details);
            }
          } else {
            if (mounted) {
              setError('No expense selected');
            }
          }
        }
      } catch {
        if (mounted) {
          setError('Failed to load expense');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadExpenseData();

    // Poll for status updates every 5 seconds to reflect manager approval changes
    const interval = setInterval(() => {
      if (!mounted) return;
      
      try {
        if (typeof window !== 'undefined') {
          const raw = sessionStorage.getItem('selectedExpense') || sessionStorage.getItem('selectedFinanceApplication');
          if (raw) {
            const claim = JSON.parse(raw);
            const currentStatus = ((claim.status || claim.state || 'pending').toString()).toLowerCase();
            
            setExpenseDetails(prevDetails => {
              if (!prevDetails || prevDetails.status !== currentStatus) {
                // Reload the data if status has changed
                loadExpenseData();
                return prevDetails;
              }
              return prevDetails;
            });
          }
        }
      } catch (err) {
        // Ignore polling errors
        console.warn('Error polling expense status:', err);
      }
    }, 5000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [expenseId]);

  // getStatusBadge function removed as it's not used

  const getCategoryBadge = (category: string) => {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[#3366CC]/10 dark:bg-[#3366CC]/20 text-[#3366CC] dark:text-[#4a7dd9] border border-[#3366CC]/30 dark:border-[#3366CC]/40">
        {category}
      </span>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleViewReceipt = () => {
    if (expenseDetails?.receipt) {
      console.log('Receipt URL:', expenseDetails.receipt);
      setReceiptPreviewUrl(expenseDetails.receipt);
      setShowReceiptPreview(true);
    } else {
      console.log('No receipt found in expense details:', expenseDetails);
    }
  };

  const handleCloseReceiptPreview = () => {
    setShowReceiptPreview(false);
    setReceiptPreviewUrl(null);
  };

  const getFileType = (url: string): string => {
    const extension = url.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) {
      return 'image';
    } else if (extension === 'pdf') {
      return 'pdf';
    }
    return 'unknown';
  };

  // Download functionality
  const handleDownloadPDF = () => {
    if (!expenseDetails) return;
    
    try {
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(20);
      doc.text('Expense Claim Details', 20, 30);
      
      // Add expense ID
      doc.setFontSize(14);
      doc.text(`Expense ID: ${expenseDetails.expenseId}`, 20, 50);
      
      // Add employee information
      doc.setFontSize(14);
      doc.text('Employee Information:', 20, 70);
      doc.setFontSize(12);
      doc.text(`Employee Code: ${expenseDetails.employee.code}`, 20, 85);
      doc.text(`Full Name: ${expenseDetails.employee.name}`, 20, 95);
      doc.text(`Designation: ${expenseDetails.employee.designation}`, 20, 105);
      doc.text(`Department: ${expenseDetails.employee.department}`, 20, 115);
      doc.text(`Email: ${expenseDetails.employee.email}`, 20, 125);
      
      // Add expense details
      doc.setFontSize(14);
      doc.text('Expense Details:', 20, 145);
      doc.setFontSize(12);
      doc.text(`Title: ${expenseDetails.title}`, 20, 160);
      doc.text(`Category: ${expenseDetails.category}`, 20, 170);
      doc.text(`Amount: ${formatCurrency(expenseDetails.amount)}`, 20, 180);
      doc.text(`Date: ${formatDate(expenseDetails.date)}`, 20, 190);
      doc.text(`Status: ${expenseDetails.status.toUpperCase()}`, 20, 200);
      doc.text(`Submitted: ${expenseDetails.submittedDate} at ${expenseDetails.submittedTime}`, 20, 210);
      
      // Add description
      doc.setFontSize(14);
      doc.text('Description:', 20, 230);
      doc.setFontSize(12);
      const descriptionLines = doc.splitTextToSize(expenseDetails.description, 170);
      doc.text(descriptionLines, 20, 245);
      
      // Add receipt information if available
      if (expenseDetails.receipt) {
        doc.setFontSize(14);
        doc.text('Receipt Information:', 20, 265);
        doc.setFontSize(12);
        doc.text(`Receipt File: ${expenseDetails.receipt}`, 20, 280);
      }
      
      // Generate filename with custom format: EXP-YYYY-NNN:date:time
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD format
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS format
      
      // Generate formatted expense ID (EXP-YYYY-NNN)
      const currentYear = new Date().getFullYear();
      const expenseNumber = expenseDetails.expenseId ? expenseDetails.expenseId.slice(-3) : '001';
      const formattedExpenseId = `EXP-${currentYear}-${expenseNumber.padStart(3, '0')}`;
      
      const filename = `${formattedExpenseId}:${dateStr}:${timeStr}.pdf`;
      
      // Save PDF
      doc.save(filename);
      setDownloadMenuOpen(false);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Error generating PDF. Please try again.');
    }
  };

  const handleDownloadCSV = () => {
    if (!expenseDetails) return;
    
    try {
      const csvData = [
        ['Field', 'Value'],
        ['Expense ID', expenseDetails.expenseId],
        ['Employee Code', expenseDetails.employee.code],
        ['Full Name', expenseDetails.employee.name],
        ['Designation', expenseDetails.employee.designation],
        ['Department', expenseDetails.employee.department],
        ['Email', expenseDetails.employee.email || ''],
        ['Title', expenseDetails.title],
        ['Category', expenseDetails.category],
        ['Amount', formatCurrency(expenseDetails.amount)],
        ['Date', formatDate(expenseDetails.date)],
        ['Status', expenseDetails.status.toUpperCase()],
        ['Submitted Date', expenseDetails.submittedDate],
        ['Submitted Time', expenseDetails.submittedTime],
        ['Description', expenseDetails.description],
        ['Receipt', expenseDetails.receipt || 'No receipt']
      ];

      // Generate filename with custom format: EXP-YYYY-NNN:date:time
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD format
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS format
      
      // Generate formatted expense ID (EXP-YYYY-NNN)
      const currentYear = new Date().getFullYear();
      const expenseNumber = expenseDetails.expenseId ? expenseDetails.expenseId.slice(-3) : '001';
      const formattedExpenseId = `EXP-${currentYear}-${expenseNumber.padStart(3, '0')}`;
      
      const filename = `${formattedExpenseId}:${dateStr}:${timeStr}.csv`;
      
      const csvContent = csvData.map(row => 
        row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
      ).join('\n');
      
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Cleanup effect for modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showReceiptPreview) {
        handleCloseReceiptPreview();
      }
    };

    if (showReceiptPreview) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [showReceiptPreview]);

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

  useEffect(() => {
    if (showReceiptPreview) {
      setReceiptImageError(false);
    }
  }, [receiptPreviewUrl, showReceiptPreview]);

  const handleBack = () => {
    router.push('/ess-portal/expenses');
  };

  if (isLoading || !expenseDetails) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          {error ? (
            <p className="text-red-600 dark:text-red-400">{error}</p>
          ) : (
            <>
              <div className="w-8 h-8 border-4 border-[#3366CC] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-300">Loading expense details...</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Header */}
        <DashboardHeader
          title="Expense Claim Details"
          subtitle="Comprehensive expense claim review with detailed employee information, receipt tracking, and approval timeline for efficient financial management."
          icon={DollarSign}
          iconColor="text-white"
          hideTenantPrefix={true}
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'ESS Portal', href: '/ess-portal' },
            { label: 'Expenses', href: '/ess-portal/expenses' },
            { label: 'View' }
          ]}
          actions={
            <button
              onClick={handleBack}
              className="flex items-center px-6 py-3 bg-white/20 rounded-xl backdrop-blur-sm border border-white/30 text-white hover:bg-white/30 transition-all duration-200 hover:scale-105 whitespace-nowrap"
              title="Back to Expenses"
            >
              <ArrowLeft className="w-5 h-5 mr-2 flex-shrink-0" />
              <span className="font-medium whitespace-nowrap">Back</span>
            </button>
          }
        />

        {/* Download Button */}
        <div className="mb-8 flex justify-end">
          <div className="relative" ref={downloadMenuRef}>
            <button
              onClick={() => setDownloadMenuOpen(!downloadMenuOpen)}
              className="inline-flex items-center px-6 py-3 bg-[#3366CC] hover:bg-[#2d5bb3] text-white rounded-xl hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 font-semibold"
            >
              <Download className="w-5 h-5 mr-2" />
              Download Expense
              <ChevronDown className="w-4 h-4 ml-2" />
            </button>
            
            {downloadMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
                <button
                  onClick={handleDownloadPDF}
                  className="block w-full text-left px-4 py-3 text-sm text-gray-800 dark:text-white hover:bg-[#3366CC]/10 dark:hover:bg-[#3366CC]/20 transition-colors duration-200 flex items-center"
                >
                  <svg className="w-4 h-4 mr-3 text-[#3366CC] dark:text-[#4a7dd9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Download as PDF
                </button>
                <button
                  onClick={handleDownloadCSV}
                  className="block w-full text-left px-4 py-3 text-sm text-gray-800 dark:text-white hover:bg-[#3366CC]/10 dark:hover:bg-[#3366CC]/20 transition-colors duration-200 flex items-center border-t border-gray-100 dark:border-gray-700"
                >
                  <svg className="w-4 h-4 mr-3 text-[#3366CC] dark:text-[#4a7dd9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download as CSV
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Top Row - Three Cards Side by Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Employee Information Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg dark:shadow-gray-900/50 border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center mb-6">
              <div className="p-3 bg-[#3366CC] rounded-xl mr-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-[#3366CC] dark:text-[#4a7dd9]">Employee Information</h2>
            </div>
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Employee Code: </span>
                <span className="text-gray-900 dark:text-white font-semibold">{expenseDetails.employee.code}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Full Name: </span>
                <span className="text-gray-900 dark:text-white font-bold">{expenseDetails.employee.name}</span>
              </div>
              {expenseDetails.employee.email && (
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Email: </span>
                  <span className="text-gray-900 dark:text-white">{expenseDetails.employee.email}</span>
                </div>
              )}
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Designation: </span>
                <span className="text-gray-900 dark:text-white font-semibold">{expenseDetails.employee.designation}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Department: </span>
                <span className="text-gray-900 dark:text-white font-semibold">{expenseDetails.employee.department}</span>
              </div>
            </div>
          </div>

          {/* Expense Details Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg dark:shadow-gray-900/50 border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center mb-6">
              <div className="p-3 bg-[#3366CC] rounded-xl mr-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-[#3366CC] dark:text-[#4a7dd9]">Expense Details</h2>
            </div>
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Category: </span>
                {getCategoryBadge(expenseDetails.category)}
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Amount: </span>
                <span className="text-[#3366CC] dark:text-[#4a7dd9] font-bold text-lg">{formatCurrency(expenseDetails.amount)}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Date of Expense: </span>
                <span className="text-gray-900 dark:text-white font-semibold">Thursday, September 25, 2025</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Submitted On: </span>
                <span className="text-gray-900 dark:text-white font-semibold">{expenseDetails.submittedDate} at {expenseDetails.submittedTime}</span>
              </div>
            </div>
          </div>

          {/* Payment Information Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg dark:shadow-gray-900/50 border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center mb-6">
              <div className="p-3 bg-[#3366CC] rounded-xl mr-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-[#3366CC] dark:text-[#4a7dd9]">Payment Information</h2>
            </div>
            <div className="text-center">
              {(() => {
                const status = (expenseDetails.status || '').toLowerCase();
                const raw = expenseDetails.updatedAt || expenseDetails.approvedDate || '';
                if (status === 'approved' || status === 'rejected') {
                  let formatted = raw;
                  try {
                    const d = new Date(raw);
                    if (!isNaN(d.getTime())) {
                      const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
                      const time = d.toLocaleTimeString('en-GB', { hour12: false });
                      formatted = `${date} at ${time}`;
                    }
                  } catch {
                    // leave as-is
                  }

                  return (
                    <>
                      <p className="text-gray-600 dark:text-gray-300 font-medium">{status === 'approved' ? 'Approved' : 'Rejected'}</p>
                      <p className="font-bold text-gray-900 dark:text-white">{formatted}</p>
                    </>
                  );
                }

                return <p className="text-gray-500 dark:text-gray-400 font-medium">Pending approval</p>;
              })()}
            </div>
          </div>
        </div>

        {/* Bottom Row - Description and Receipt */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Description Section */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg dark:shadow-gray-900/50 border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center mb-6">
              <div className="p-3 bg-[#3366CC] rounded-xl mr-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-[#3366CC] dark:text-[#4a7dd9]">{expenseDetails.title}</h2>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 min-h-[120px]">
              <p className="text-gray-900 dark:text-white">{expenseDetails.description}</p>
            </div>
          </div>

          {/* Receipt Section */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg dark:shadow-gray-900/50 border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center mb-6">
              <div className="p-3 bg-[#3366CC] rounded-xl mr-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-[#3366CC] dark:text-[#4a7dd9]">Receipt</h2>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-[#3366CC]/10 dark:bg-[#3366CC]/20 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-[#3366CC] dark:text-[#4a7dd9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {expenseDetails?.receipt ? 'Receipt Uploaded' : 'No Receipt Available'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {expenseDetails?.receipt ? 'Click to view receipt' : 'Receipt not provided for this expense'}
                  </p>
                </div>
              </div>
              {expenseDetails?.receipt ? (
                <button 
                  onClick={handleViewReceipt}
                  className="px-4 py-2 bg-[#3366CC] hover:bg-[#2d5bb3] text-white rounded-lg transition-colors flex items-center space-x-2"
                >
                  <span>View Receipt</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 2h6m0 0v6m0-6L10 14" />
                  </svg>
                </button>
              ) : (
                <button 
                  disabled
                  className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 rounded-lg cursor-not-allowed flex items-center space-x-2"
                >
                  <span>No Receipt</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>


        {/* Expense Timeline */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg dark:shadow-gray-900/50 border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-6">
            <div className="p-3 bg-[#3366CC] rounded-xl mr-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-[#3366CC] dark:text-[#4a7dd9]">Expense Timeline</h2>
          </div>
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-[#3366CC]/10 dark:bg-[#3366CC]/20 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-[#3366CC] dark:text-[#4a7dd9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">Expense Submitted</p>
              <p className="font-bold text-gray-900 dark:text-white">{expenseDetails.submittedDate} at {expenseDetails.submittedTime}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Receipt Preview Modal */}
      {showReceiptPreview && receiptPreviewUrl && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={handleCloseReceiptPreview}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl max-h-[90vh] w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-[#3366CC]">
              <h3 className="text-xl font-bold text-white">Receipt Preview</h3>
              <button
                onClick={handleCloseReceiptPreview}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="p-6 max-h-[70vh] overflow-auto bg-white dark:bg-gray-800">
              {!receiptPreviewUrl ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Receipt Available</h4>
                  <p className="text-gray-600 dark:text-gray-300">This expense does not have a receipt attached.</p>
                </div>
              ) : getFileType(receiptPreviewUrl) === 'image' ? (
                <div className="text-center">
                  {!receiptImageError ? (
                    <Image
                      src={receiptPreviewUrl}
                      alt="Receipt"
                      width={1024}
                      height={768}
                      unoptimized
                      className="max-w-full h-auto rounded-lg shadow-lg mx-auto"
                      sizes="(max-width: 1024px) 100vw, 1024px"
                      onError={() => {
                        console.error('Failed to load receipt image:', receiptPreviewUrl);
                        setReceiptImageError(true);
                      }}
                    />
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Receipt Not Found</h4>
                      <p className="text-gray-600 dark:text-gray-300 mb-4">The receipt file could not be loaded.</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">URL: {receiptPreviewUrl}</p>
                    </div>
                  )}
                </div>
              ) : getFileType(receiptPreviewUrl) === 'pdf' ? (
                <div className="text-center">
                  <iframe
                    src={receiptPreviewUrl}
                    className="w-full h-[600px] rounded-lg border-0"
                    title="Receipt PDF"
                    onError={(e) => {
                      console.error('Failed to load receipt PDF:', receiptPreviewUrl);
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                  <div className="hidden text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Receipt Not Found</h4>
                    <p className="text-gray-600 dark:text-gray-300 mb-4">The receipt file could not be loaded.</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">URL: {receiptPreviewUrl}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Receipt Preview Not Available</h4>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">This file type cannot be previewed in the browser.</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">File: {receiptPreviewUrl}</p>
                  <a
                    href={receiptPreviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-[#3366CC] hover:bg-[#2d5bb3] text-white rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 2h6m0 0v6m0-6L10 14" />
                    </svg>
                    Download Receipt
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseViewPage;