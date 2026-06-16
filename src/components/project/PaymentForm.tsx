'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import Button from '@/components/ui/button/Button';
import { BACKEND_URL } from '@/utils/api';
import { getAuthHeaders } from '@/utils/api';

interface PaymentHistory {
  payment_id?: string;
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
}

interface PaymentFormProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectNumber: string;
  customerId: string;
  customerName: string;
  customerEmail?: string; // Add customerEmail prop
  payment?: PaymentHistory | null;
  onSuccess: () => void;
}

export default function PaymentForm({
  isOpen,
  onClose,
  projectId,
  projectNumber,
  customerId,
  customerName,
  customerEmail,
  payment,
  onSuccess
}: PaymentFormProps) {
  const [formData, setFormData] = useState<PaymentHistory>({
    amount: 0,
    currency: 'USD',
    payment_method: 'credit_card',
    payment_date: new Date().toISOString().split('T')[0],
    transaction_id: '',
    invoice_number: '',
    invoice_url: '',
    receipt_url: '',
    status: 'pending',
    notes: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setInvoiceFile] = useState<File | null>(null);
  const [uploadingInvoice, setUploadingInvoice] = useState(false);
  const [invoicePreview, setInvoicePreview] = useState<string | null>(null);

  useEffect(() => {
    if (payment) {
      setFormData({
        amount: payment.amount || 0,
        currency: payment.currency || 'USD',
        payment_method: payment.payment_method || 'credit_card',
        payment_date: payment.payment_date
          ? new Date(payment.payment_date).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        transaction_id: payment.transaction_id || '',
        invoice_number: payment.invoice_number || '',
        invoice_url: payment.invoice_url || '',
        receipt_url: payment.receipt_url || '',
        status: payment.status || 'completed',
        notes: payment.notes || ''
      });
      if (payment.invoice_url) {
        setInvoicePreview(payment.invoice_url);
      }
    } else {
      setFormData({
        amount: 0,
        currency: 'USD',
        payment_method: 'credit_card',
        payment_date: new Date().toISOString().split('T')[0],
        transaction_id: '',
        invoice_number: '',
        invoice_url: '',
        receipt_url: '',
        status: 'pending',
        notes: ''
      });
    }
    setInvoiceFile(null);
    setInvoicePreview(null);
    setError(null);
  }, [payment, isOpen]);

  const handleInvoiceUpload = async (file: File) => {
    setUploadingInvoice(true);
    setError(null);
    try {
      const headers = getAuthHeaders();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('project_id', projectId);
      formData.append('project_number', projectNumber);

      // Remove Content-Type from headers for file upload
      // Browser will automatically set multipart/form-data with boundary
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { 'Content-Type': _, ...headersWithoutContentType } = headers as Record<string, string>;

      const response = await fetch(`${BACKEND_URL}/api/v1/project-billing/upload-invoice`, {
        method: 'POST',
        headers: headersWithoutContentType,
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to upload invoice');
      }

      const result = await response.json();
      setFormData(prev => ({ ...prev, invoice_url: result.invoice_url }));
      setInvoicePreview(result.invoice_url);
      setInvoiceFile(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload invoice');
      console.error('Error uploading invoice:', err);
    } finally {
      setUploadingInvoice(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setError('Invalid file type. Please upload PDF or image files only.');
        return;
      }
      
      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size too large. Maximum size is 10MB.');
        return;
      }
      
      handleInvoiceUpload(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const headers = getAuthHeaders();
      const payload = {
        project_id: projectId,
        project_number: projectNumber,
        customer_id: customerId,
        customer_name: customerName,
        customer_email: customerEmail || (customerName.includes('@') ? customerName : undefined), // Use customerEmail prop or fallback
        amount: parseFloat(formData.amount.toString()),
        currency: formData.currency,
        payment_method: formData.payment_method,
        payment_date: new Date(formData.payment_date).toISOString(),
        transaction_id: formData.transaction_id || undefined,
        invoice_number: formData.invoice_number || undefined,
        invoice_url: formData.invoice_url || undefined,
        receipt_url: formData.receipt_url || undefined,
        status: formData.status,
        notes: formData.notes || undefined
      };

      let response;
      if (payment?.payment_id) {
        // Update existing payment
        response = await fetch(
          `${BACKEND_URL}/api/v1/project-billing/payment-history/${payment.payment_id}`,
          {
            method: 'PUT',
            headers: {
              ...headers,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          }
        );
      } else {
        // Create new payment
        response = await fetch(
          `${BACKEND_URL}/api/v1/project-billing/payment-history`,
          {
            method: 'POST',
            headers: {
              ...headers,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          }
        );
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to save payment');
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save payment');
      console.error('Error saving payment:', err);
    } finally {
      setLoading(false);
    }
  };

  const paymentMethods = [
    { value: 'credit_card', label: 'Credit Card' },
    { value: 'debit_card', label: 'Debit Card' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'check', label: 'Check' },
    { value: 'cash', label: 'Cash' },
    { value: 'paypal', label: 'PayPal' },
    { value: 'razorpay', label: 'Razorpay' },
    { value: 'stripe', label: 'Stripe' },
    { value: 'other', label: 'Other' }
  ];

  const statusOptions = [
    { value: 'completed', label: 'Completed' },
    { value: 'pending', label: 'Pending' },
    { value: 'failed', label: 'Failed' },
    { value: 'refunded', label: 'Refunded' }
  ];

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {payment ? 'Edit Payment' : 'Add Payment'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Amount *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Currency *
              </label>
              <select
                required
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="INR">INR</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Payment Method *
              </label>
              <select
                required
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                {paymentMethods.map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Payment Date *
              </label>
              <input
                type="date"
                required
                value={formData.payment_date}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status *
            </label>
            <select
              required
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value as PaymentHistory['status'] })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              {statusOptions.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Transaction ID
              </label>
              <input
                type="text"
                value={formData.transaction_id}
                onChange={(e) => setFormData({ ...formData, transaction_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Invoice Number
              </label>
              <input
                type="text"
                value={formData.invoice_number}
                onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Invoice File
              </label>
              <div className="space-y-2">
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.gif,.webp"
                  onChange={handleFileChange}
                  disabled={uploadingInvoice}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/20 dark:file:text-blue-300"
                />
                {uploadingInvoice && (
                  <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading invoice...
                  </div>
                )}
                {invoicePreview && (
                  <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <span className="text-sm text-green-700 dark:text-green-400">✓ Invoice uploaded</span>
                    <a
                      href={invoicePreview}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      View
                    </a>
                  </div>
                )}
                {formData.invoice_url && !invoicePreview && (
                  <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Existing invoice:</span>
                    <a
                      href={formData.invoice_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      View
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Receipt URL
              </label>
              <input
                type="url"
                value={formData.receipt_url}
                onChange={(e) => setFormData({ ...formData, receipt_url: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                payment ? 'Update Payment' : 'Add Payment'
              )}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}


