'use client';

import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Calendar, 
  FileText, 
  CheckCircle, 
  Clock, 
  XCircle, 
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Loader2
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import Button from '@/components/ui/button/Button';
import { BACKEND_URL } from '@/utils/api';
import { getAuthHeaders } from '@/utils/api';

interface PaymentHistory {
  _id?: string;
  payment_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  payment_date: string;
  transaction_id?: string;
  invoice_number?: string;
  invoice_url?: string;
  receipt_url?: string;
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  notes?: string;
  created_at?: string;
}

interface PaymentSummary {
  total_paid: number;
  total_pending: number;
  total_failed: number;
  total_refunded: number;
  payment_count: number;
  completed_payments: number;
  last_payment_date?: string;
}

interface BillingHistoryProps {
  projectId: string;
  projectNumber?: string;
  customerId?: string;
  customerName?: string;
  onAddPayment: () => void;
  onEditPayment: (payment: PaymentHistory) => void;
}

export default function BillingHistory({
  projectId,
  onAddPayment,
  onEditPayment
}: BillingHistoryProps) {
  const [payments, setPayments] = useState<PaymentHistory[]>([]);
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchPaymentHistory = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = getAuthHeaders();
      const [historyRes, summaryRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/v1/project-billing/payment-history/${projectId}`, { headers }),
        fetch(`${BACKEND_URL}/api/v1/project-billing/payment-summary/${projectId}`, { headers })
      ]);

      if (!historyRes.ok) throw new Error('Failed to fetch payment history');
      if (!summaryRes.ok) throw new Error('Failed to fetch payment summary');

      const historyData = await historyRes.json();
      const summaryData = await summaryRes.json();

      setPayments(Array.isArray(historyData) ? historyData : []);
      setSummary(summaryData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payment history');
      console.error('Error fetching payment history:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      fetchPaymentHistory();
    }
  }, [projectId, fetchPaymentHistory]);

  const handleDelete = async (paymentId: string) => {
    if (!confirm('Are you sure you want to delete this payment record?')) {
      return;
    }

    setDeletingId(paymentId);
    try {
      const headers = getAuthHeaders();
      const response = await fetch(
        `${BACKEND_URL}/api/v1/project-billing/payment-history/${paymentId}`,
        {
          method: 'DELETE',
          headers
        }
      );

      if (!response.ok) throw new Error('Failed to delete payment');

      await fetchPaymentHistory();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete payment');
      console.error('Error deleting payment:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'refunded':
        return <RefreshCw className="w-4 h-4 text-orange-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'refunded':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Paid</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(summary.total_paid)}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {formatCurrency(summary.total_pending)}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Payments</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {summary.payment_count}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-600" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {summary.completed_payments}
                </p>
              </div>
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
          </Card>
        </div>
      )}

      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Payment History
        </h3>
        <Button onClick={onAddPayment} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Payment
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <Card className="p-4 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </Card>
      )}

      {/* Payment List */}
      {payments.length === 0 ? (
        <Card className="p-12 text-center">
          <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">No payment history found</p>
          <Button onClick={onAddPayment} className="mt-4">
            Add First Payment
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {payments.map((payment) => (
            <Card
              key={payment.payment_id}
              className="p-4 border-l-4 border-l-blue-600 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(payment.status)}
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                          payment.status
                        )}`}
                      >
                        {payment.status.toUpperCase()}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(payment.amount, payment.currency)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(payment.payment_date)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      <span className="capitalize">{payment.payment_method.replace('_', ' ')}</span>
                    </div>
                    {payment.transaction_id && (
                      <div>
                        <span className="font-medium">Transaction ID:</span> {payment.transaction_id}
                      </div>
                    )}
                    {payment.invoice_number && (
                      <div>
                        <span className="font-medium">Invoice:</span> {payment.invoice_number}
                      </div>
                    )}
                  </div>

                  {payment.notes && (
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 italic">
                      {payment.notes}
                    </p>
                  )}

                  <div className="flex items-center gap-4 mt-3">
                    {payment.invoice_url && (
                      <a
                        href={payment.invoice_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        View Invoice
                      </a>
                    )}
                    {payment.receipt_url && (
                      <a
                        href={payment.receipt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        View Receipt
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => onEditPayment(payment)}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    title="Edit payment"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(payment.payment_id)}
                    disabled={deletingId === payment.payment_id}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                    title="Delete payment"
                  >
                    {deletingId === payment.payment_id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}


