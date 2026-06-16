"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardHeader from '@/components/header/DashboardHeader';
import { DollarSign, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface FinanceApplicationDetails {
  id: string;
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
  statusDate?: string;
}

const FinanceViewPage: React.FC = () => {
  const router = useRouter();
  const APPROVAL_BASE = 'https://py-mobiloitte.converiqo.ai/api/v1/ess-approval';
  const EXPENSE_BASE = 'https://py-mobiloitte.converiqo.ai/api/v1/ess-portal/expenses';
  const searchParams = useSearchParams();
  const appId = searchParams.get('id');

  const [application, setApplication] = useState<FinanceApplicationDetails | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Decision modal state
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [decisionAction, setDecisionAction] = useState<'approve' | 'reject' | null>(null);
  const [decisionComment, setDecisionComment] = useState('');
  const processedBy = 'Finance Manager';
  const [submittingDecision, setSubmittingDecision] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    try {
      if (typeof window !== 'undefined') {
        const raw = sessionStorage.getItem('selectedFinanceApplication');
        if (raw) {
          const item = JSON.parse(raw);
          const created = new Date(item.submittedOn || item.requestedDate || item.createdAt || Date.now());
          const submittedDate = created.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
          const submittedTime = created.toLocaleTimeString('en-GB', { hour12: false });

          const details: FinanceApplicationDetails = {
            id: item.id,
            employeeName: item.employeeName || item.employee?.name || item.employeeInfo?.fullName || '',
            employeeId: item.employeeId || item.employee?.code || item.employeeInfo?.employeeCode || '',
            department: item.department || item.employee?.department || item.employeeInfo?.department || '',
            type: item.type || 'Expense Claim',
            details: item.details || item.expenseDetails?.title || item.expenseDetails?.description || '',
            category: item.category || item.expenseDetails?.category || '',
            amount: Number(item.amount || item.expenseDetails?.amount || 0),
            priority: item.priority || 'normal',
            submittedOn: submittedDate + ' ' + submittedTime,
            status: (item.status || 'pending').toLowerCase(),
            statusDate: item.statusDate || item.updatedAt || undefined,
          };

          setApplication(details);
        } else {
          setError('No finance application selected');
        }
      }
    } catch {
      setError('Failed to load finance application');
    } finally {
      setIsLoading(false);
    }
  }, [appId]);

  const openDecisionModal = (action: 'approve' | 'reject') => {
    setDecisionAction(action);
    setDecisionComment('');
    setDecisionModalOpen(true);
  };

  const submitDecision = async () => {
    if (!application || !decisionAction) return;
    if (decisionAction === 'reject' && !decisionComment.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setSubmittingDecision(true);
    try {
      const url = `${APPROVAL_BASE}/expense/${application.id}/${decisionAction === 'approve' ? 'approve' : 'reject'}`;
      const body = {
        status: decisionAction === 'approve' ? 'Approved' : 'Rejected',
        financeComments: decisionComment || '',
        approvedBy: processedBy || 'Finance Manager'
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Failed to process decision');
      }

      // Refresh application data from expenses endpoint
      try {
        const refreshed = await fetch(`${EXPENSE_BASE}/${application.id}`);
        if (refreshed && refreshed.ok) {
          const payload = await refreshed.json();
          const data = payload?.data || payload;
          if (data) {
            // Map to local shape similar to earlier mapping
            const item = data;
            const created = new Date(item.expenseDetails?.date || item.createdAt || Date.now());
            const submittedDate = created.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const submittedTime = created.toLocaleTimeString('en-GB', { hour12: false });

            const updated: FinanceApplicationDetails = {
              id: item.id,
              employeeName: item.employeeInfo?.fullName || item.employeeInfo?.employeeCode || '',
              employeeId: item.employeeInfo?.employeeCode || '',
              department: item.employeeInfo?.department || '',
              type: 'Expense Claim',
              details: item.expenseDetails?.title || item.expenseDetails?.description || '',
              category: item.expenseDetails?.category || '',
              amount: Number(item.expenseDetails?.amount || 0),
              priority: item.priority || 'normal',
              submittedOn: submittedDate + ' ' + submittedTime,
              status: (item.status || 'pending').toLowerCase(),
              statusDate: item.updatedAt || undefined,
            };

            setApplication(updated);
            try { sessionStorage.setItem('selectedFinanceApplication', JSON.stringify(updated)); } catch { }
          }
        }
      } catch (e) {
        console.error('Error refreshing expense after decision:', e);
      }

      setDecisionModalOpen(false);
      setDecisionAction(null);
      setDecisionComment('');
    } catch (err) {
      console.error('Decision submit error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to submit decision');
    } finally {
      setSubmittingDecision(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400">Pending</span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">Approved</span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400">Rejected</span>
        );
      default:
        return null;
    }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

  if (isLoading || !application) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          {error ? <p className="text-red-600 dark:text-red-400">{error}</p> : (
            <>
              <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderColor: '#3366CC' }}></div>
              <p className="text-gray-600 dark:text-gray-400">Loading application details...</p>
            </>
          )}
        </div>
      </div>
    );
  }

  // Prepare action buttons for header
  const headerActions = (
    <div className="flex items-center gap-3">
      {getStatusBadge(application.status)}
      {(application.status || '').toLowerCase() === 'pending' && (
        <>
          <button
            onClick={() => openDecisionModal('approve')}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all duration-200 text-sm font-semibold shadow-lg hover:shadow-xl"
          >
            Approve
          </button>
          <button
            onClick={() => openDecisionModal('reject')}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-200 text-sm font-semibold shadow-lg hover:shadow-xl"
          >
            Reject
          </button>
        </>
      )}
      <button
        onClick={() => router.push('/ess-portal/finance')}
        className="flex items-center px-4 py-2 text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </button>
    </div>
  );
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <DashboardHeader
          title="Finance Approvals"
          subtitle="Review and manage Finance-related requests such as expense and payslip application."
          icon={DollarSign}
          iconColor="text-white"
          hideTenantPrefix={true}
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'ESS Portal', href: '/ess-portal' },
            { label: 'Finance', href: '/ess-portal/finance' },
            { label: 'View Application' }
          ]}
          actions={headerActions}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-all duration-500 hover:shadow-xl group overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center mb-4">
                <div className="p-2 rounded-xl mr-3 group-hover:scale-110 transition-transform duration-300" style={{ backgroundColor: '#3366CC' }}>
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-gray-800 dark:text-white group-hover:text-[#3366CC] dark:group-hover:text-[#4a7dd9] transition-colors duration-300">Employee Information</h2>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 group-hover:bg-gray-100 dark:group-hover:bg-gray-700 transition-colors duration-300">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Employee Code:</span>
                  <span className="text-gray-900 dark:text-white font-semibold">{application.employeeId}</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 group-hover:bg-gray-100 dark:group-hover:bg-gray-700 transition-colors duration-300">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Full Name:</span>
                  <span className="text-gray-900 dark:text-white font-semibold">{application.employeeName}</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 group-hover:bg-gray-100 dark:group-hover:bg-gray-700 transition-colors duration-300">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Department:</span>
                  <span className="text-gray-900 dark:text-white font-semibold">{application.department}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-all duration-500 hover:shadow-xl group overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center mb-4">
                <div className="p-2 rounded-xl mr-3 group-hover:scale-110 transition-transform duration-300" style={{ backgroundColor: '#3366CC' }}>
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-gray-800 dark:text-white group-hover:text-[#3366CC] dark:group-hover:text-[#4a7dd9] transition-colors duration-300">Application Details</h2>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 group-hover:bg-gray-100 dark:group-hover:bg-gray-700 transition-colors duration-300">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Type:</span>
                  <span className="text-gray-900 dark:text-white font-semibold">{application.type}</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 group-hover:bg-gray-100 dark:group-hover:bg-gray-700 transition-colors duration-300">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Category:</span>
                  <span className="text-gray-900 dark:text-white font-semibold">{application.category}</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 group-hover:bg-gray-100 dark:group-hover:bg-gray-700 transition-colors duration-300">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Amount:</span>
                  <span className="text-green-600 dark:text-green-400 font-bold text-lg">{formatCurrency(application.amount)}</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 group-hover:bg-gray-100 dark:group-hover:bg-gray-700 transition-colors duration-300">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Submitted On:</span>
                  <span className="text-gray-900 dark:text-white font-semibold">{application.submittedOn}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-all duration-500 hover:shadow-xl group overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center mb-4">
                <div className="p-2 rounded-xl mr-3 group-hover:scale-110 transition-transform duration-300" style={{ backgroundColor: '#3366CC' }}>
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-gray-800 dark:text-white group-hover:text-[#3366CC] dark:group-hover:text-[#4a7dd9] transition-colors duration-300">Actions / Status</h2>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 group-hover:bg-gray-100 dark:group-hover:bg-gray-700 transition-colors duration-300">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Priority:</span>
                  <span className="font-semibold capitalize" style={{ color: '#3366CC' }}>{application.priority}</span>
                </div>
                {application.statusDate && (
                  <div className="flex justify-between items-center p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 group-hover:bg-gray-100 dark:group-hover:bg-gray-700 transition-colors duration-300">
                    {(() => {
                      let label = 'Last Updated';
                      const raw = application.statusDate as string;
                      let formatted = raw;
                      try {
                        const d = new Date(raw);
                        if (!isNaN(d.getTime())) {
                          const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
                          const time = d.toLocaleTimeString('en-GB', { hour12: false });
                          formatted = date + ' ' + time;
                        }
                      } catch {
                        // keep raw
                      }

                      if ((application.status || '').toLowerCase() === 'approved') label = 'Approved';
                      if ((application.status || '').toLowerCase() === 'rejected') label = 'Rejected';

                      return (
                        <>
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}:</span>
                          <span className="font-semibold text-gray-900 dark:text-white">{formatted}</span>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-all duration-500 hover:shadow-xl group overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center mb-4">
              <div className="p-2 rounded-xl mr-3 group-hover:scale-110 transition-transform duration-300" style={{ backgroundColor: '#3366CC' }}>
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-800 dark:text-white group-hover:text-[#3366CC] dark:group-hover:text-[#4a7dd9] transition-colors duration-300">Description</h2>
            </div>
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50 group-hover:bg-gray-100 dark:group-hover:bg-gray-700 transition-colors duration-300">
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{application.details}</p>
            </div>
          </div>
        </div>
        {/* Decision Modal */}
        {decisionModalOpen && decisionAction && (
          <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-md pointer-events-auto"
              onClick={() => setDecisionModalOpen(false)}
            />
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4 p-4 md:p-6 z-[10000] max-h-[90vh] overflow-auto">
              <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">{decisionAction === 'approve' ? 'Approve' : 'Reject'} Request</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Request ID: <span className="font-medium text-gray-900 dark:text-white">{application.id}</span></p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Comments {decisionAction === 'reject' && <span className="text-red-500">*</span>}</label>
                <textarea
                  value={decisionComment}
                  onChange={(e) => setDecisionComment(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3366CC]/50 focus:border-[#3366CC]"
                  placeholder={decisionAction === 'approve' ? 'Optional comment for approval' : 'Please provide reason for rejection'}
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-end sm:space-x-3 space-y-3 sm:space-y-0">
                <button
                  onClick={() => setDecisionModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  disabled={submittingDecision}
                >
                  Cancel
                </button>
                <button
                  onClick={submitDecision}
                  className={`w-full sm:w-auto px-4 py-2 rounded-md text-white ${decisionAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                  disabled={submittingDecision}
                >
                  {submittingDecision ? 'Processing...' : decisionAction === 'approve' ? 'Approve' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FinanceViewPage;
