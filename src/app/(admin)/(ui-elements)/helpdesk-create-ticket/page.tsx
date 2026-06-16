/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { CreditCard, MoreHorizontal, X, Eye, Download } from "lucide-react"
import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { useRouter } from 'next/navigation';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import razorpayImg from './icon/razorpay.png';
import intuitImg from './icon/intuit.png';
import paypalImg from './icon/paypal.png';
import upiImg from './icon/upi.png';
import gpayImg from './icon/gpay.png';
import phonepayImg from './icon/phone pay.png';
import paytmImg from './icon/paytm.png';
import bhimPayImg from './icon/bhimPay.png';
import visaImg from './icon/visa.png';
import masterImg from './icon/master.png';
import rupayImg from './icon/rupay.png';
import americanImg from './icon/american.png';
import sbiImg from './icon/sbi.png';
import hdfcImg from './icon/hdfc.png';
import iciciImg from './icon/icici.png';
import axisImg from './icon/axis.png';

declare global {
  interface Window {
    jspdf: any;
  }
}

interface PlanDetails {
  price: number;
  billing_cycle: string;
  plan_name: string;
  features: string[];
  restrictions: string[];
}

// Removed unused Order interface to satisfy linter

interface Plan {
  plan_name: string;
  price?: number;
  description?: string;
  features?: string[];
  restrictions?: string[];
  plan_details?: PlanDetails;
  status?: string;
  renewal_date?: string;
}

export default function Component() {
  const router = useRouter();
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'plans' | 'billing' | 'payment'>('plans');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  // Collapsible state removed as it's unused
  const [isEditing, setIsEditing] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // (cancel modal state and overlay insets are declared later to avoid redeclare/ordering issues)

  // Function to convert number to words
  const convertToWords = (num: number): string => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

    if (num === 0) return 'Zero';
    if (num < 10) return ones[num];
    if (num < 20) return teens[num - 10];
    if (num < 100) {
      return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + ones[num % 10] : '');
    }
    if (num < 1000) {
      return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 !== 0 ? ' and ' + convertToWords(num % 100) : '');
    }
    if (num < 100000) {
      return convertToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 !== 0 ? ' ' + convertToWords(num % 1000) : '');
    }
    if (num < 10000000) {
      return convertToWords(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 !== 0 ? ' ' + convertToWords(num % 100000) : '');
    }
    return convertToWords(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 !== 0 ? ' ' + convertToWords(num % 10000000) : '');
  };

  // Billing form state
  const [billingForm, setBillingForm] = useState({
    name: '',
    email: '',
    company_name: '',
    business_id: '',
    country: '',
    address: '',
    street_number: '',
    city: '',
    state: '',
    zip_code: '',
    additional_info: '',
  });
  const [loading, setLoading] = useState(false);

  // Billing history state
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  // New billing history state using all-payments endpoint
  const [billingHistory, setBillingHistory] = useState<any[]>([]);
  const [billingHistoryLoading, setBillingHistoryLoading] = useState(false);
  const [, setBillingHistoryError] = useState<string | null>(null);

  // PayPal payments state
  const [paypalPayments, setPaypalPayments] = useState<any[]>([]);
  const [, setPaypalPaymentsLoading] = useState(false);
  const [, setPaypalPaymentsError] = useState<string | null>(null);

  // Function to fetch billing history from all-payments endpoint
  const fetchBillingHistory = async (): Promise<void> => {
    setBillingHistoryLoading(true);
    setBillingHistoryError(null);

    try {
      const response = await fetch('/api/billing/all-payments', {
        headers: { 'accept': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Billing history data:', data);
        setBillingHistory(Array.isArray(data) ? data : []);
      } else {
        throw new Error('Failed to fetch billing history');
      }
    } catch (error) {
      console.error('Error fetching billing history:', error);
      setBillingHistoryError('Failed to load billing history');
    } finally {
      setBillingHistoryLoading(false);
    }
  };

  // Function to fetch PayPal payments
  const fetchPaypalPayments = async (): Promise<void> => {
    setPaypalPaymentsLoading(true);
    setPaypalPaymentsError(null);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing/paypal/all-payments`, {
        headers: { accept: 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to fetch PayPal payments');
      const data = await response.json();
      setPaypalPayments(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Error fetching PayPal payments:', e);
      setPaypalPaymentsError('Failed to load PayPal payments');
    } finally {
      setPaypalPaymentsLoading(false);
    }
  };

  // Fetch billing history on component mount
  useEffect(() => {
    fetchBillingHistory();
    fetchPaypalPayments();
  }, []);

  // Fetch billing details from backend
  const fetchBillingDetails = async (): Promise<void> => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing/bu-payment-details`);
      if (!res.ok) throw new Error('Failed to fetch billing details');
      const data = await res.json();
      setBillingForm({
        name: data.name || '',
        email: data.email || '',
        company_name: data.company_name || '',
        business_id: data.business_id || '',
        country: data.country || '',
        address: data.address || '',
        street_number: data.street_number || '',
        city: data.city || '',
        state: data.state || '',
        zip_code: data.zip_code || '',
        additional_info: data.additional_info || '',
      });
    } catch {
      // Optionally handle error
      // (do nothing)
    }
  };

  // Fetch billing history from backend
  const fetchOrders = async (): Promise<void> => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing/orders`, {
        headers: { 'accept': 'application/json' }
      });
      if (!res.ok) throw new Error('Failed to fetch orders');
      const data = await res.json();
      // Handle both array and object-with-data-array responses
      setOrders(Array.isArray(data) ? data : (Array.isArray(data.data) ? data.data : []));
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingDetails();
    fetchOrders();
  }, []);

  const handleBillingInput = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setBillingForm((prev) => ({ ...prev, [id]: value }));
  };

  // Placeholder for continue action (redirect or next step)
  const onContinue = () => {
    setActiveTab('payment');
  };

  // Save handler for edited billing details
  const handleSave = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing/bu-payment-details`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...billingForm,
          user_id: user_id || '123' // Include user_id in the request
        }),
      });
      if (!res.ok) throw new Error('Failed to save billing details');
      setIsEditing(false);
      // Always fetch latest data after save
      await fetchBillingDetails();
    } catch {
      alert('Failed to save billing details.');
    } finally {
      setLoading(false);
    }
  };

  // Handle dropdown toggle
  const toggleDropdown = (orderId: string) => {
    setOpenDropdown(openDropdown === orderId ? null : orderId);
  };

  // Handle invoice actions
  const handleViewInvoice = (orderId: string) => {
    setOpenDropdown(null);
    router.push(`/helpdesk-create-ticket/invoice?orderId=${orderId}&view=true`);
  };

  const handleDownloadInvoice = async (orderId: string) => {
    setOpenDropdown(null);

    try {
      // Fetch billing details
      const billingResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing/bu-payment-details`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!billingResponse.ok) {
        throw new Error('Failed to fetch billing details');
      }

      const billingData = await billingResponse.json();

      // Fetch plans for items
      const plansResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing/sub-plan`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!plansResponse.ok) {
        throw new Error('Failed to fetch plans');
      }

      const plans = await plansResponse.json();

      // Create PDF using jsPDF
      const doc = new jsPDF();

      // Header
      doc.setFontSize(16);
      doc.text('INVOICE', 105, 15, { align: 'center' });
      doc.setFontSize(10);

      // Seller/Company Info (left)
      const y = 25;
      doc.text('Sold By :', 10, y);
      doc.text(billingData.company_name || 'Company Name', 10, y + 6);
      doc.text(billingData.address || 'Address', 10, y + 12);
      doc.text(`${billingData.city || 'City'}, ${billingData.state || 'State'}, ${billingData.zip_code || 'ZIP'}`, 10, y + 18);
      doc.text(billingData.country || 'Country', 10, y + 24);
      doc.text('GST/VAT No: ' + (billingData.vat_number || 'N/A'), 10, y + 30);

      // Buyer Info (right)
      doc.text('Billing Address :', 120, y);
      doc.text(billingData.name || 'Customer Name', 120, y + 6);
      doc.text(billingData.address || 'Address', 120, y + 12);
      doc.text(`${billingData.city || 'City'}, ${billingData.state || 'State'}, ${billingData.zip_code || 'ZIP'}`, 120, y + 18);
      doc.text(billingData.country || 'Country', 120, y + 24);
      doc.text('Email: ' + (billingData.email || 'email@example.com'), 120, y + 30);

      // Invoice meta
      const metaY = y + 40;
      doc.text('Business ID: ' + (billingData.business_id || 'N/A'), 10, metaY);
      doc.text('Created At: ' + (new Date().toLocaleDateString()), 10, metaY + 6);
      doc.text('Currency: ' + (billingData.currency || 'USD'), 10, metaY + 12);
      doc.text('Additional Info: ' + (billingData.additional_info || 'N/A'), 10, metaY + 18);

      // Table for items
      if (plans.length > 0) {
        (doc as any).autoTable({
          head: [[
            'Sl. No', 'Plan Name', 'Description', 'Price', 'Billing Cycle', 'Currency', 'Features'
          ]],
          body: plans.map((plan: any, idx: number) => [
              (idx + 1).toString(),
              plan.plan_name || 'N/A',
              plan.description || 'N/A',
              plan.price || '0',
              plan.billing_cycle || 'N/A',
              plan.currency || 'USD',
              Array.isArray(plan.features) ? plan.features.join(', ') : 'N/A'
            ]),
          startY: metaY + 28,
          theme: 'grid',
          headStyles: { fillColor: [200, 200, 200] },
          styles: { fontSize: 9, cellPadding: 2 }
        });
      }

      // Calculate total amount
      const totalAmount = plans.reduce((sum: number, plan: any) => sum + parseFloat(plan.price || '0'), 0);

      // Amount in Words
      const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 10 : metaY + 50;
      doc.setFontSize(10);
      doc.text('Total Amount: $' + totalAmount.toFixed(2), 10, finalY);
      doc.text('Amount in Words:', 10, finalY + 10);
      doc.text(convertToWords(totalAmount), 50, finalY + 10);

      // Signature
      doc.text('For ' + (billingData.company_name || 'Company') + ':', 10, finalY + 30);
      doc.text('Authorized Signatory', 150, finalY + 30);

      // Save PDF
      doc.save(`invoice-${orderId}.pdf`);

      console.log('Invoice PDF generated successfully for order:', orderId);

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown && !(event.target as Element).closest('.dropdown-container')) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);

  // Add state for plans
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [plansError, setPlansError] = useState<string | null>(null);

  // Fetch plans when upgrade modal opens
  useEffect(() => {
    if (showUpgradeModal) {
      setPlansLoading(true);
      setPlansError(null);
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing/sub-plan`, {
        headers: { 'accept': 'application/json' },
      })
        .then(res => res.json())
        .then(data => setPlans(Array.isArray(data) ? data : []))
        .catch(() => setPlansError('Failed to load plans'))
        .finally(() => setPlansLoading(false));
    }
  }, [showUpgradeModal]);

  // Add state for current plan
  const [activePlan, setActivePlan] = useState<Plan | null>(null);
  const [activePlanLoading, setActivePlanLoading] = useState(false);
  const [activePlanError, setActivePlanError] = useState<string | null>(null);

  // Add state for selected plan
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'upi' | 'cards' | 'netbanking' | null>(null);
  const [activeGateway, setActiveGateway] = useState<'razorpay' | 'intuit' | 'paypal' | null>(null);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showAnimations, setShowAnimations] = useState(false);

  // Get user ID from localStorage (set during login)
  const [user_id, setUserId] = useState<string>('');

  // Initialize user ID from localStorage
  useEffect(() => {
    const storedUserId = localStorage.getItem('user_id');
    if (storedUserId) {
      setUserId(storedUserId);
    } else {
      // Fallback to a default user ID if not logged in
      console.warn('No user_id found in localStorage, using default');
      setUserId('123');
    }
  }, []);

  // Use '123' specifically for billing API calls
  const billing_user_id = '123';

  // Refactor fetch active plan into a function
  const fetchActivePlan = async (): Promise<any> => {
    setActivePlanLoading(true);
    setActivePlanError(null);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing/user/active-plan`, {
        headers: { accept: 'application/json' }
      });

      if (response.status === 404) {
        // No active plan for this user (or endpoint not found). Treat gracefully.
        console.warn('Active plan endpoint returned 404 - no active plan.');
        setActivePlan(null);
        setActivePlanError(null);
        return null;
      }

      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

      const data = await response.json();
      console.log('Active plan data:', data);
      console.log('Active plan price:', data?.plan_details?.price);
      console.log('Active plan name:', data?.plan_details?.plan_name);
      console.log('Active plan status:', data?.status);
      setActivePlan(data);
      return data;
    } catch (error) {
      console.error('Error fetching active plan:', error);
      setActivePlanError('Failed to load active plan');
      return null;
    } finally {
      setActivePlanLoading(false);
    }
  };

  // Use fetchActivePlan in useEffect
  useEffect(() => {
    fetchActivePlan();
  }, []);

  // Razorpay payment success handler
  // const handlePaymentSuccess = async () => {
  //   if (!selectedPlan) return;
  //   try {
  //     await fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing/user/upgrade-subscription', {
  //       method: 'POST',
  //       headers: {
  //         'accept': 'application/json',
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify({
  //         user_id,
  //         plan_name: selectedPlan.plan_name,
  //       }),
  //     });
  //     fetchActivePlan();
  //     // Optionally show a success message
  //     // showAlertMessage('Plan upgraded successfully!', 'success');
  //   } catch {
  //     // Optionally show an error message
  //     // showAlertMessage('Failed to upgrade plan.', 'error');
  //   }
  // };

  // Handle Razorpay button click to show add card modal
  const handleRazorpayClick = () => {
    setActiveGateway('razorpay');
    setShowAddCardModal(true);
    document.body.style.overflow = 'hidden';
    setTimeout(() => setShowAnimations(true), 100);
  };

  // Get selected plan price for display
  const getSelectedPlanPrice = () => {
    if (selectedPlan && selectedPlan.price) {
      return "Contact for Pricing";
    }
    return "Contact for Pricing"; // Default fallback
  };

  // Handle plan selection and show payment modal
  const handlePlanSelection = (plan: Plan) => {
    setSelectedPlan(plan);
    setShowUpgradeModal(false);
    // Set a small timeout to ensure the modal is closed before switching tabs
    setTimeout(() => {
      setActiveTab('billing');
    }, 100);
  };

  // Add state for card form fields
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVV, setCardCVV] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardSaveChecked, setCardSaveChecked] = useState(false);
  const [cardLoading, setCardLoading] = useState(false);

  // Add state for cancel subscription form
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelMessage, setCancelMessage] = useState('');
  const [isCancelLoading, setIsCancelLoading] = useState(false);

  // Payment success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Measure layout insets so blur doesn't cover sidebar/header
  const [overlayInsets, setOverlayInsets] = useState<{ left: number; top: number }>({ left: 240, top: 64 });
  useEffect(() => {
    try {
      const aside = document.querySelector('aside') as HTMLElement | null;
      const header = document.querySelector('header') as HTMLElement | null;
      const left = aside && aside.offsetWidth ? aside.offsetWidth : 240;
      const top = header && header.offsetHeight ? header.offsetHeight : 64;
      setOverlayInsets({ left, top });
    } catch {
      // no-op
    }
    // Trigger on modal open/close to keep alignment fresh
  }, [showAddCardModal, showUpgradeModal, showExitModal, showSuccessModal, showCancelModal]);

  // Add state for card form errors
  const [cardErrors, setCardErrors] = useState({
    number: '',
    expiry: '',
    cvv: '',
    name: '',
  });

  // Luhn algorithm for card number validation
  function luhnCheck(cardNumber: string) {
    let sum = 0;
    let shouldDouble = false;
    for (let i = cardNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cardNumber.charAt(i));
      if (shouldDouble) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      shouldDouble = !shouldDouble;
    }
    return sum % 10 === 0;
  }

  // Card type detection (for CVV length)
  function getCardType(number: string) {
    if (/^3[47]/.test(number)) return 'amex';
    if (/^4/.test(number)) return 'visa';
    if (/^5[1-5]/.test(number)) return 'mastercard';
    return 'other';
  }

  function validateCardForm() {
    const errors = { number: '', expiry: '', cvv: '', name: '' };
    // Card Number
    const num = cardNumber.replace(/\s+/g, '');
    if (!/^[0-9]{13,19}$/.test(num)) {
      errors.number = 'Card number must be 13-19 digits.';
    } else if (!luhnCheck(num)) {
      errors.number = 'Invalid card number (checksum failed).';
    }
    // Expiry
    const exp = cardExpiry.trim();
    const match = exp.match(/^(0[1-9]|1[0-2])\/?(\d{2}|\d{4})$/); // Make slash optional
    if (!match) {
      errors.expiry = 'Expiry must be MM/YY, MM/YYYY, or MMYY.';
    } else {
      const month = parseInt(match[1]);
      const year = parseInt(match[2].length === 2 ? '20' + match[2] : match[2]);
      const now = new Date();
      const thisMonth = now.getMonth() + 1;
      const thisYear = now.getFullYear();
      if (year < thisYear || (year === thisYear && month < thisMonth)) {
        errors.expiry = 'Card has expired.';
      }
    }
    // CVV
    const cardType = getCardType(num);
    if (!/^[0-9]+$/.test(cardCVV)) {
      errors.cvv = 'CVV must be digits only.';
    } else if (
      (cardType === 'amex' && cardCVV.length !== 4) ||
      (cardType !== 'amex' && cardCVV.length !== 3)
    ) {
      errors.cvv = cardType === 'amex' ? 'CVV must be 4 digits for AmEx.' : 'CVV must be 3 digits.';
    }
    // Name (optional but if provided, validate)
    if (cardName && !/^[A-Za-z\s]+$/.test(cardName)) { // Allow spaces in name
      errors.name = 'Name can only contain letters and spaces.';
    }
    setCardErrors(errors);
    return !errors.number && !errors.expiry && !errors.cvv && !errors.name;
  }

  // Store payment status in backend after payment/order success
  const storeOrder = async ({ payment_id, amount, plan_name, user_id, status, date }: { payment_id: string, amount: number, plan_name: string, user_id: string, status: string, date: string }): Promise<void> => {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing/save-payment-status`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ payment_id, amount, plan_name, user_id, status, date }),
    });
  };

  // Complete plan upgrade in backend after successful payment
  const completePlanUpgrade = async (plan_name: string, business_id: string): Promise<boolean> => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing/complete-upgrade`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan_name: plan_name,
          business_id: business_id
        }),
      });

      if (response.ok) {
        console.log('Plan upgrade completed successfully in backend');
        return true;
      } else {
        console.error('Failed to complete plan upgrade:', response.status);
        return false;
      }
    } catch (error) {
      console.error('Error completing plan upgrade:', error);
      return false;
    }
  };

  const handleCardContinue = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!validateCardForm()) return;
    setCardLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing/create-razorpay-order`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount: Number(getSelectedPlanPrice().replace(/[^0-9.]/g, '')) || 60 }),
      });
      if (response.ok) {
        const data = await response.json();
        setRazorpayOrder({ order_id: data.order_id, key_id: data.key_id, amount: data.amount });
        // Simulate payment success and store payment status
        await storeOrder({
          payment_id: data.order_id, // using Razorpay order_id as payment_id
          amount: data.amount,
          plan_name: selectedPlan?.plan_name || '',
          user_id: user_id || '123', // Use dynamic user_id with fallback
          status: 'success',
          date: new Date().toISOString(),
        });

        // Complete plan upgrade in backend
        if (selectedPlan?.plan_name) {
          await completePlanUpgrade(selectedPlan.plan_name, billing_user_id);
        }

        // First upgrade subscription
        try {
          const upgradeResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing/user/upgrade-subscription`, {
            method: 'POST',
            headers: {
              'accept': 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              user_id: user_id || '123',
              plan_name: selectedPlan?.plan_name || '',
            }),
          });

          if (upgradeResponse.ok) {
            console.log('Subscription upgraded successfully');
          } else {
            console.error('Failed to upgrade subscription:', upgradeResponse.status);
          }
        } catch (error) {
          console.error('Error upgrading subscription:', error);
        }

        // Show success modal
        setShowSuccessModal(true);

        // Refresh data after a delay to ensure backend has processed
        setTimeout(async () => {
          try {
            await fetchOrders();
            await fetchActivePlan();
            console.log('Data refreshed after payment');

            // Force update active plan with selected plan if backend doesn't respond
            if (selectedPlan) {
              console.log('Forcing active plan update with selected plan:', selectedPlan);
              setActivePlan({
                plan_name: selectedPlan.plan_name,
                plan_details: {
                  price: selectedPlan.price ?? selectedPlan.plan_details?.price ?? 0,
                  billing_cycle: selectedPlan.plan_details?.billing_cycle ?? 'month',
                  plan_name: selectedPlan.plan_name,
                  features: selectedPlan.features ?? selectedPlan.plan_details?.features ?? [],
                  restrictions: selectedPlan.restrictions ?? selectedPlan.plan_details?.restrictions ?? [],
                },
                status: 'active',
                renewal_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
              });
            }
          } catch (error) {
            console.error('Error refreshing data:', error);
          }
        }, 3000);
      } else {
        alert('Failed to create order');
      }
    } catch (err: unknown) {
      alert('Error: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setCardLoading(false);
    }
  };

  // Handle cancel subscription form submission
  const handleCancelSubscription = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!cancelReason.trim()) {
      alert('Please select a reason for cancellation');
      return;
    }
    if (!cancelMessage.trim()) {
      alert('Please provide a message for cancellation');
      return;
    }

    setIsCancelLoading(true);
    try {
      // Prepare email data
      const emailData = {
        to: 'support@Mobiloitte.com',
        subject: 'Subscription Cancellation Request',
        business_details: {
          name: billingForm.name,
          email: billingForm.email,
          company_name: billingForm.company_name,
          business_id: billingForm.business_id,
          address: billingForm.address,
          city: billingForm.city,
          state: billingForm.state,
          country: billingForm.country,
          zip_code: billingForm.zip_code
        },
        cancellation_details: {
          reason: cancelReason,
          message: cancelMessage,
          current_plan: activePlan?.plan_name || 'Unknown',
          user_id: user_id || '123', // Use dynamic user_id with fallback
          cancellation_date: new Date().toISOString()
        }
      };

      // Send email via backend
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing/send-cancellation-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData),
      });

      if (response.ok) {
        alert('Cancellation request sent successfully. We will process your request within 24-48 hours.');
        setShowCancelModal(false);
        setCancelReason('');
        setCancelMessage('');
      } else {
        throw new Error('Failed to send cancellation request');
      }
    } catch (error) {
      console.error('Error sending cancellation request:', error);
      alert('Failed to send cancellation request. Please try again or contact support directly.');
    } finally {
      setIsCancelLoading(false);
    }
  };

  // const [showUpiForm, setShowUpiForm] = useState(false);
  const [upiId, setUpiId] = useState("");
  // const [isUpiLoading, setIsUpiLoading] = useState(false);

  // Add state for Intuit payment
  const [intuitLoading, setIntuitLoading] = useState(false);
  const [intuitError, setIntuitError] = useState<string | null>(null);
  const [intuitPaymentStatus, setIntuitPaymentStatus] = useState<string | null>(null);
  const [intuitPaymentId, setIntuitPaymentId] = useState<string | null>(null);

  // Add state for PayPal payment
  const [paypalLoading, setPaypalLoading] = useState(false);
  const [paypalError, setPaypalError] = useState<string | null>(null);
  const [paypalApprovalUrl, setPaypalApprovalUrl] = useState<string | null>(null);
  const [paypalPaymentId, setPaypalPaymentId] = useState<string | null>(null);

  // Function to manually complete a pending payment
  const completeIntuitPayment = async (paymentId: string): Promise<void> => {
    console.log('Manually completing payment:', paymentId);
    setIntuitLoading(true);
    setIntuitError(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing/complete-payment`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ payment_id: paymentId }), // Fix: properly format the request body
      });

      console.log('Complete payment response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Complete payment response:', data);

        if (data.success && (data.status === 'completed' || data.status === 'success')) {
          console.log('Payment completed successfully!');
          setIntuitPaymentStatus('completed');

          // Store payment status
          await storeOrder({
            payment_id: data.payment_id,
            amount: data.amount,
            plan_name: selectedPlan?.plan_name || '',
            user_id: user_id || '123',
            status: data.status,
            date: data.completed_at || data.created_at || new Date().toISOString(),
          });

          // Complete plan upgrade in backend
          if (selectedPlan?.plan_name) {
            await completePlanUpgrade(selectedPlan.plan_name, billing_user_id);
          }

          console.log('Order stored, upgrading subscription...');
          // Upgrade subscription
          try {
            const upgradeResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing/user/upgrade-subscription`, {
              method: 'POST',
              headers: {
                'accept': 'application/json',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                user_id: user_id || '123',
                plan_name: selectedPlan?.plan_name || '',
              }),
            });

            if (upgradeResponse.ok) {
              console.log('Subscription upgraded successfully via Intuit');
            } else {
              console.error('Failed to upgrade subscription via Intuit:', upgradeResponse.status);
            }
          } catch (error) {
            console.error('Error upgrading subscription via Intuit:', error);
          }

          console.log('Showing success modal...');
          // Show success modal
          setShowSuccessModal(true);

          // Refresh data after a delay
          setTimeout(async () => {
            try {
              await fetchOrders();
              await fetchActivePlan();
              await fetchBillingHistory(); // Refresh billing history too
              console.log('Data refreshed after Intuit payment');

              // Force update active plan with selected plan if backend doesn't respond
              if (selectedPlan) {
                console.log('Forcing active plan update with selected plan:', selectedPlan);
                setActivePlan({
                  plan_name: selectedPlan.plan_name,
                  plan_details: {
                    price: selectedPlan.price ?? selectedPlan.plan_details?.price ?? 0,
                    billing_cycle: selectedPlan.plan_details?.billing_cycle ?? 'month',
                    plan_name: selectedPlan.plan_name,
                    features: selectedPlan.features ?? selectedPlan.plan_details?.features ?? [],
                    restrictions: selectedPlan.restrictions ?? selectedPlan.plan_details?.restrictions ?? [],
                  },
                  status: 'active',
                  renewal_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
                });
              }
            } catch (error) {
              console.error('Error refreshing data after Intuit payment completion:', error);
            }
          }, 3000);

        } else {
          // Payment not completed, check status again
          console.log('Payment not completed yet, checking status...');

          // Force check the status immediately after completion attempt
          try {
            const statusResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing/payment-status/${paymentId}`, {
              method: 'GET',
              headers: {
                'accept': 'application/json',
              },
            });

            if (statusResponse.ok) {
              const statusData = await statusResponse.json();
              console.log('Immediate status check after completion:', statusData);

              if (statusData.status === 'completed' || statusData.status === 'success') {
                console.log('Payment is actually completed! Updating status...');
                setIntuitPaymentStatus('completed');

                // Store payment status
                await storeOrder({
                  payment_id: statusData.payment_id,
                  amount: statusData.amount,
                  plan_name: selectedPlan?.plan_name || '',
                  user_id: user_id || '123',
                  status: statusData.status,
                  date: statusData.completed_at || statusData.created_at || new Date().toISOString(),
                });

                // Show success modal
                setShowSuccessModal(true);

                // Refresh data
                setTimeout(async () => {
                  try {
                    await fetchOrders();
                    await fetchActivePlan();
                    await fetchBillingHistory(); // Refresh billing history too
                    console.log('Data refreshed after status check');
                  } catch (error) {
                    console.error('Error refreshing data:', error);
                  }
                }, 2000);

              } else {
                console.log('Payment still pending, starting polling...');
                await checkPaymentStatus(paymentId, Number(getSelectedPlanPrice().replace(/[^0-9.]/g, '')) || 60);
              }
            } else {
              console.log('Failed to check status, starting polling...');
              await checkPaymentStatus(paymentId, Number(getSelectedPlanPrice().replace(/[^0-9.]/g, '')) || 60);
            }
          } catch (error) {
            console.error('Error checking status after completion:', error);
            await checkPaymentStatus(paymentId, Number(getSelectedPlanPrice().replace(/[^0-9.]/g, '')) || 60);
          }
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to complete payment:', errorData);
        setIntuitError(errorData.message || 'Failed to complete payment');
      }
    } catch (error) {
      console.error('Error completing payment:', error);
      setIntuitError('Network error while completing payment');
    } finally {
      setIntuitLoading(false);
    }
  };

  // Handle Intuit payment
  const handleIntuitPayment = async (): Promise<void> => {
    console.log('Intuit payment button clicked!');
    console.log('Selected plan:', selectedPlan);

    if (!selectedPlan) {
      console.log('No plan selected, showing alert');
      alert('Please select a plan first by clicking the "Upgrade" button on a plan');
      return;
    }

    console.log('Starting Intuit payment process...');
    setIntuitLoading(true);
    setIntuitError(null);

    try {
      const amount = Number(getSelectedPlanPrice().replace(/[^0-9.]/g, '')) || 60;
      console.log('Payment amount:', amount);
      console.log('Plan name:', selectedPlan.plan_name);
   
      const requestBody = {
        amount: amount,
        description: `Payment for ${selectedPlan.plan_name} plan`,
        user_id: user_id || '123', // Add user_id to request
        plan_name: selectedPlan.plan_name // Add plan_name to request
      };
      console.log('Request body:', requestBody);
   
      console.log('Making request to Intuit API...');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing/create-intuit-payment`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
   
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
   
      if (response.ok) {
        const data = await response.json();
        console.log('Intuit API response:', data);
     
        if (data.success) {
          console.log('Payment created successfully, payment_id:', data.payment_id);
       
          // Check payment status and poll until completed
          await checkPaymentStatus(data.payment_id, amount);
       
        } else {
          console.log('Payment failed:', data.message);
          setIntuitError(data.message || 'Payment creation failed');
        }
      } else {
        console.log('HTTP error:', response.status, response.statusText);
        const errorData = await response.json().catch(() => ({}));
        console.log('Error response data:', errorData);
        setIntuitError(errorData.message || 'Failed to create Intuit payment');
      }
    } catch (error) {
      console.error('Network error creating Intuit payment:', error);
      setIntuitError('Network error while creating payment');
    } finally {
      console.log('Setting loading to false');
      setIntuitLoading(false);
    }
  };

  // Handle PayPal payment
  const handlePaypalPayment = async (): Promise<void> => {
    if (!selectedPlan) {
      alert('Please select a plan first by clicking the "Upgrade" button on a plan');
      return;
    }

    setPaypalLoading(true);
    setPaypalError(null);
    setPaypalApprovalUrl(null);
    setPaypalPaymentId(null);

    try {
      const amount = Number(getSelectedPlanPrice().replace(/[^0-9.]/g, '')) || 60;
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing/create-paypal-payment`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          amount, 
          currency: 'USD', 
          description: `Payment for ${selectedPlan.plan_name} plan`,
          user_id: user_id || '123', // Add user_id to the request
          plan_name: selectedPlan.plan_name // Add plan_name to the request
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data?.success && data?.approval_url) {
        setPaypalApprovalUrl(data.approval_url);
        setPaypalPaymentId(data.payment_id || null);
        
        // Open PayPal in a new tab
        window.open(data.approval_url, '_blank');
      } else {
        setPaypalError('Failed to create PayPal payment');
      }
    } catch (e) {
      setPaypalError(e instanceof Error ? e.message : 'Network error while creating PayPal payment');
    } finally {
      setPaypalLoading(false);
    }
  };

  // Function to check and poll payment status
  const checkPaymentStatus = async (paymentId: string, amount: number): Promise<void> => {
    console.log('Checking payment status for:', paymentId);
    setIntuitPaymentId(paymentId);
    setIntuitPaymentStatus('created');

    let attempts = 0;
    const maxAttempts = 30; // Poll for up to 5 minutes (30 * 10 seconds)

    const pollStatus = async (): Promise<boolean> => {
      try {
        setIntuitPaymentStatus('checking');
        const statusResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing/payment-status/${paymentId}`, {
          method: 'GET',
          headers: {
            'accept': 'application/json',
          },
        });

        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          console.log('Payment status:', statusData);
          setIntuitPaymentStatus(statusData.status);

          if (statusData.status === 'completed' || statusData.status === 'success') {
            console.log('Payment completed successfully!');

            // Store payment status
            await storeOrder({
              payment_id: paymentId,
              amount: statusData.amount || amount,
              plan_name: selectedPlan?.plan_name || '',
              user_id: user_id || '123',
              status: statusData.status,
              date: statusData.completed_at || statusData.created_at || new Date().toISOString(),
            });

            // Complete plan upgrade in backend
            if (selectedPlan?.plan_name) {
              await completePlanUpgrade(selectedPlan.plan_name, billing_user_id);
            }

            console.log('Order stored, upgrading subscription...');
            // Upgrade subscription
            try {
              const upgradeResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing/user/upgrade-subscription`, {
                method: 'POST',
                headers: {
                  'accept': 'application/json',
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  user_id: user_id || '123',
                  plan_name: selectedPlan?.plan_name || '',
                }),
              });

              if (upgradeResponse.ok) {
                console.log('Subscription upgraded successfully via Intuit');
              } else {
                console.error('Failed to upgrade subscription via Intuit:', upgradeResponse.status);
              }
            } catch (error) {
              console.error('Error upgrading subscription via Intuit:', error);
            }

            console.log('Showing success modal...');
            // Show success modal
            setShowSuccessModal(true);

            // Refresh data after a delay
            setTimeout(async () => {
              try {
                await fetchOrders();
                await fetchActivePlan();
                await fetchBillingHistory(); // Refresh billing history too
                console.log('Data refreshed after Intuit payment');

                // Force update active plan with selected plan if backend doesn't respond
                if (selectedPlan) {
                  console.log('Forcing active plan update with selected plan:', selectedPlan);
                  setActivePlan({
                    plan_name: selectedPlan.plan_name,
                    plan_details: {
                      price: selectedPlan.price ?? selectedPlan.plan_details?.price ?? 0,
                      billing_cycle: selectedPlan.plan_details?.billing_cycle ?? 'month',
                      plan_name: selectedPlan.plan_name,
                      features: selectedPlan.features ?? selectedPlan.plan_details?.features ?? [],
                      restrictions: selectedPlan.restrictions ?? selectedPlan.plan_details?.restrictions ?? [],
                    },
                    status: 'active',
                    renewal_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
                  });
                }
              } catch (error) {
                console.error('Error refreshing data after Intuit payment:', error);
              }
            }, 3000);

            return true; // Payment completed

          } else if (statusData.status === 'failed' || statusData.status === 'cancelled') {
            console.log('Payment failed or cancelled:', statusData.status);
            setIntuitError(`Payment ${statusData.status}. Please try again.`);
            return true; // Payment failed, stop polling

          } else if (statusData.status === 'pending') {
            console.log('Payment still pending, attempt:', attempts + 1);
            attempts++;

            if (attempts >= maxAttempts) {
              console.log('Max attempts reached, payment timeout');
              setIntuitError('Payment timeout. Please check your payment status or contact support.');
              return true; // Stop polling
            }

            // Wait 10 seconds before next poll
            await new Promise(resolve => setTimeout(resolve, 10000));
            return false; // Continue polling
          } else {
            // Unknown status, stop polling
            console.log('Unknown payment status:', statusData.status);
            setIntuitError(`Unknown payment status: ${statusData.status}. Please contact support.`);
            return true; // Stop polling
          }
        } else {
          console.error('Failed to check payment status:', statusResponse.status);
          setIntuitError('Failed to check payment status. Please contact support.');
          return true; // Stop polling on error
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
        setIntuitError('Error checking payment status. Please contact support.');
        return true; // Stop polling on error
      }
    };

    // Start polling
    while (!(await pollStatus())) {
      // Continue polling until payment is completed, failed, or timeout
    }

    return; // Add return statement to fix linter error
  };

  // Razorpay integration state
  const [razorpayOrder, setRazorpayOrder] = useState<{ order_id: string; key_id: string; amount: number } | null>(null);
  const [_razorpayLoading] = useState(false);
  const [_razorpayError] = useState<string | null>(null);

  // New: combined payments from billingHistory (intuit), orders (razorpay) and PayPal
  const combinedPayments = useMemo(() => {
    // Normalize billingHistory items
    const intuitItems = (billingHistory || []).map((p: any) => ({
      id: p.payment_id || p.id || '',
      date: p.created_at || p.date || null,
      amount: typeof p.amount === 'number' ? p.amount : Number(p.amount) || 0,
      status: p.status || 'unknown',
      description: p.description || 'Intuit payment',
      source: 'Intuit'
    }));
    // Normalize orders items
    const orderItems = (orders || []).map((o: any) => ({
      id: o.order_id || o._id || '',
      date: o.date || o.created_at || null,
      amount: typeof o.amount === 'number' ? o.amount : Number(o.amount) || 0,
      status: o.status || 'unknown',
      description: o.description || 'Razorpay order',
      source: 'Razorpay'
    }));
    // Normalize PayPal items
    const paypalItems = (paypalPayments || []).map((p: any) => ({
      id: p.payment_id || p.id || '',
      date: p.created_at || p.date || null,
      amount: typeof p.amount === 'number' ? p.amount : Number(p.amount) || 0,
      status: p.status || 'unknown',
      description: p.description || 'PayPal payment',
      source: 'PayPal'
    }));
    // Merge and sort by date desc
    const merged = [...intuitItems, ...orderItems, ...paypalItems];
    return merged.sort((a, b) => {
      const ad = a.date ? new Date(a.date).getTime() : 0;
      const bd = b.date ? new Date(b.date).getTime() : 0;
      return bd - ad;
    });
  }, [billingHistory, orders, paypalPayments]);

  // Pagination for payment history
  const [visiblePayments, setVisiblePayments] = useState<number>(10);

  // Prevent background scroll when any modal is open
  useEffect(() => {
    const anyModalOpen = showUpgradeModal || showAddCardModal || showExitModal || showSuccessModal || showCancelModal;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    if (anyModalOpen) {
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    } else {
      document.documentElement.style.overflow = previousHtmlOverflow || '';
      document.body.style.overflow = previousBodyOverflow || '';
    }
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, [showUpgradeModal, showAddCardModal, showExitModal, showSuccessModal, showCancelModal]);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
      {/* Tab Navigation */}
      <div className="flex gap-6 border-b border-slate-200 dark:border-slate-700 px-6 pt-6 mb-6">
        <button
          className={`flex items-center gap-2 pb-2 border-b-2 transition text-base font-semibold ${activeTab === 'plans' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-blue-600'}`}
          onClick={() => setActiveTab('plans')}
        >
          Subscription Plan
        </button>
        <button
          className={`flex items-center gap-2 pb-2 border-b-2 transition text-base font-semibold ${activeTab === 'billing' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-blue-600'}`}
          onClick={() => setActiveTab('billing')}
        >
          Billing Detail
        </button>
        {false && (
          <button
            className={`flex items-center gap-2 pb-2 border-b-2 transition text-base font-semibold ${activeTab === 'payment' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-blue-600'}`}
            onClick={() => setActiveTab('payment')}
          >
            Payment Detail
          </button>
        )}
      </div>
      {/* Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
        {/* Subscription Plans Tab */}
        {activeTab === 'plans' && (
          <div className="lg:col-span-3 w-full space-y-8">
            {/* Current Plan Status Card */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700 rounded-xl overflow-hidden">
              <div className="p-6">
                {activePlanLoading ? (
                  <div className="text-center py-8">
                    <div role="status">
                      <svg aria-hidden="true" className="inline w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor" />
                        <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill" />
                      </svg>
                      <span className="sr-only">Loading...</span>
                    </div>
                  </div>
                ) : activePlanError ? (
                  <div className="text-center py-8">
                    <div className="text-slate-500 mb-3">No active plan</div>
                    <button
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                      onClick={async () => {
                        try {
                          setPlansLoading(true);
                          setPlansError(null);
                          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing/sub-plan`, { headers: { accept: 'application/json' } });
                          const data = await res.json();
                          setPlans(Array.isArray(data) ? data : []);
                        } catch {
                          setPlansError('Failed to load plans');
                        } finally {
                          setPlansLoading(false);
                          setShowUpgradeModal(true);
                        }
                      }}
                    >
                      Upgrade plan
                    </button>
                  </div>
                ) : activePlan && activePlan.plan_details ? (
                  <>
                    {/* Header Section */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
                      <div className="flex items-center gap-4">
                        <Image src="/images/logo/M-LOGO_1.png" alt="Mobiloitte Logo" width={40} height={40} className="w-10 h-10 rounded-full object-cover bg-white shadow-sm" />
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{activePlan.plan_details.plan_name} Plan</h2>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded-full">
                              {activePlan.status === 'active' ? 'Active' : activePlan.status}
                            </span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">• Your current plan</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Billing Info */}
                      <div className="text-right">
                        {activePlan.renewal_date && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            Next renewal: {new Date(activePlan.renewal_date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Usage Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Users</span>
                        </div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">7 of 10</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">used this month</div>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">API Calls</span>
                        </div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">2.4K</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">this month</div>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Storage</span>
                        </div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">1.2GB</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">of 5GB used</div>
                      </div>
                    </div>

                    {/* Management Actions */}
                    <div className="flex flex-wrap gap-3 mb-6">
                      <button
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                        onClick={() => setShowUpgradeModal(true)}
                      >
                        Upgrade Plan
                      </button>
                      <button
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
                        onClick={() => {/* Handle update payment */}}
                      >
                        Update Payment
                      </button>
                      <button
                        className="px-4 py-2 border border-red-300 dark:border-red-600 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors font-medium"
                        onClick={() => setShowCancelModal(true)}
                      >
                        Cancel Subscription
                      </button>
                    </div>

                    {/* Features Section */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Plan Features</h3>
                      
                      {/* Core Platform Features */}
                      <div className="mb-6">
                        <div className="flex items-center gap-2 mb-3">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                          </svg>
                          <h4 className="font-semibold text-gray-900 dark:text-white">Core Platform</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {Array.isArray(activePlan.plan_details.features) && activePlan.plan_details.features.filter(feature => 
                            feature.toLowerCase().includes('crm') || 
                            feature.toLowerCase().includes('helpdesk') || 
                            feature.toLowerCase().includes('dashboard')
                          ).map((feature: string, i: number) => (
                            <div key={i} className="flex items-center gap-2">
                              <span className="text-green-500 text-sm">✓</span>
                              <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* AI & Automation Features */}
                      <div className="mb-6">
                        <div className="flex items-center gap-2 mb-3">
                          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                          </svg>
                          <h4 className="font-semibold text-gray-900 dark:text-white">AI & Automation</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {Array.isArray(activePlan.plan_details.features) && activePlan.plan_details.features.filter(feature => 
                            feature.toLowerCase().includes('ai') || 
                            feature.toLowerCase().includes('bot') || 
                            feature.toLowerCase().includes('api')
                          ).map((feature: string, i: number) => (
                            <div key={i} className="flex items-center gap-2">
                              <span className="text-green-500 text-sm">✓</span>
                              <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Admin & Support Features */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 100 19.5 9.75 9.75 0 000-19.5z"></path>
                          </svg>
                          <h4 className="font-semibold text-gray-900 dark:text-white">Admin & Support</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {Array.isArray(activePlan.plan_details.features) && activePlan.plan_details.features.filter(feature => 
                            feature.toLowerCase().includes('user') || 
                            feature.toLowerCase().includes('support') || 
                            feature.toLowerCase().includes('integration')
                          ).map((feature: string, i: number) => (
                            <div key={i} className="flex items-center gap-2">
                              <span className="text-green-500 text-sm">✓</span>
                              <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <div role="status">
                      <svg aria-hidden="true" className="inline w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor" />
                        <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill" />
                      </svg>
                      <span className="sr-only">Loading...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Plan Comparison Section */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Compare Plans</h3>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Choose the perfect plan for your business needs</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Starter Plan */}
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-lg transition-shadow">
                    <div className="text-center mb-4">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Starter</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Perfect for small teams</p>
                    </div>
                    <ul className="space-y-2 mb-6">
                      <li className="flex items-center gap-2 text-sm">
                        <span className="text-green-500">✓</span>
                        <span>Basic CRM features</span>
                      </li>
                      <li className="flex items-center gap-2 text-sm">
                        <span className="text-green-500">✓</span>
                        <span>Email support</span>
                      </li>
                      <li className="flex items-center gap-2 text-sm">
                        <span className="text-green-500">✓</span>
                        <span>Up to 2 users</span>
                      </li>
                    </ul>
                    <button className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
                      Downgrade
                    </button>
                  </div>

                  {/* Professional Plan (Current) */}
                  <div className="border-2 border-blue-500 dark:border-blue-400 rounded-lg p-6 relative bg-blue-50 dark:bg-blue-900/20">
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-blue-600 text-white text-xs font-medium px-3 py-1 rounded-full">Your Plan</span>
                    </div>
                    <div className="text-center mb-4">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Professional</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Most popular choice</p>
                    </div>
                    <ul className="space-y-2 mb-6">
                      <li className="flex items-center gap-2 text-sm">
                        <span className="text-green-500">✓</span>
                        <span>Everything in Starter</span>
                      </li>
                      <li className="flex items-center gap-2 text-sm">
                        <span className="text-green-500">✓</span>
                        <span>Full CRM Suite</span>
                      </li>
                      <li className="flex items-center gap-2 text-sm">
                        <span className="text-green-500">✓</span>
                        <span>Pro AI Agent BOT</span>
                      </li>
                      <li className="flex items-center gap-2 text-sm">
                        <span className="text-green-500">✓</span>
                        <span>Up to 10 users</span>
                      </li>
                    </ul>
                    <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg cursor-not-allowed opacity-50">
                      Current Plan
                    </button>
                  </div>

                  {/* Enterprise Plan */}
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-lg transition-shadow">
                    <div className="text-center mb-4">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Enterprise</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">For large organizations</p>
                    </div>
                    <ul className="space-y-2 mb-6">
                      <li className="flex items-center gap-2 text-sm">
                        <span className="text-green-500">✓</span>
                        <span>Everything in Professional</span>
                      </li>
                      <li className="flex items-center gap-2 text-sm">
                        <span className="text-green-500">✓</span>
                        <span>Unlimited users</span>
                      </li>
                      <li className="flex items-center gap-2 text-sm">
                        <span className="text-green-500">✓</span>
                        <span>Custom integrations</span>
                      </li>
                      <li className="flex items-center gap-2 text-sm">
                        <span className="text-green-500">✓</span>
                        <span>24/7 phone support</span>
                      </li>
                    </ul>
                    <button className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                      Upgrade
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Billing Detail Tab */}
        {activeTab === 'billing' && (
          <div className="space-y-6 lg:col-span-2">
            {/* Billing Details Form */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
              <div className="p-6 border-b border-slate-700 flex justify-between items-center">
                <h3 className="text-lg font-semibold">Billing details</h3>
                {!isEditing && (
                  <button
                    type="button"
                    className="px-4 py-1 rounded-md text-base font-semibold transition-colors focus:outline-none bg-blue-600 text-white hover:bg-blue-700"
                    style={{ minWidth: 80 }}
                    onClick={() => {
                      setIsEditing(true);
                      setBillingForm({
                        name: '',
                        email: '',
                        company_name: '',
                        business_id: '',
                        country: '',
                        address: '',
                        street_number: '',
                        city: '',
                        state: '',
                        zip_code: '',
                        additional_info: '',
                      });
                    }}
                  >
                    Edit
                  </button>
                )}
              </div>
              <form className="p-6 space-y-4" onSubmit={isEditing ? handleSave : (e) => e.preventDefault()}>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium mb-1">Your name*</label>
                    <input id="name" type="text" placeholder="Name" className="w-full px-3 py-2 border border-slate-300 placeholder:text-slate-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-white dark:border-slate-600 bg-gray-100" value={billingForm.name} onChange={handleBillingInput} readOnly={!isEditing} required />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium mb-1">Email*</label>
                    <input id="email" type="email" placeholder="name@example.com" className="w-full px-3 py-2 border border-slate-300 placeholder:text-slate-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-white dark:border-slate-600 bg-gray-100" value={billingForm.email} onChange={handleBillingInput} readOnly={!isEditing} required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="company_name" className="block text-sm font-medium mb-1">Company name*</label>
                    <input id="company_name" type="text" placeholder="Mobiloitte" className="w-full px-3 py-2 border border-slate-300 placeholder:text-slate-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-white dark:border-slate-600 bg-gray-100" value={billingForm.company_name} onChange={handleBillingInput} readOnly={!isEditing} required />
                  </div>
                  <div>
                    <label htmlFor="business_id" className="block text-sm font-medium mb-1">Business Id*</label>
                    <input id="business_id" type="text" placeholder="Enter your Business Id" className="w-full px-3 py-2 border border-slate-300 placeholder:text-slate-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-white dark:border-slate-600 bg-gray-100" value={billingForm.business_id} onChange={handleBillingInput} readOnly={!isEditing} required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="country" className="block text-sm font-medium mb-1">Country*</label>
                    <input id="country" type="text" placeholder="India" className="w-full px-3 py-2 border border-slate-300 placeholder:text-slate-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-white dark:border-slate-600 bg-gray-100" value={billingForm.country} onChange={handleBillingInput} readOnly={!isEditing} required />
                  </div>
                  <div>
                    <label htmlFor="address" className="block text-sm font-medium mb-1">Address*</label>
                    <input id="address" type="text" placeholder="Enter your address" className="w-full px-3 py-2 border border-slate-300 placeholder:text-slate-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-white dark:border-slate-600 bg-gray-100" value={billingForm.address} onChange={handleBillingInput} readOnly={!isEditing} required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="street_number" className="block text-sm font-medium mb-1">Street number</label>
                    <input id="street_number" type="text" placeholder="Enter your street number" className="w-full px-3 py-2 border border-slate-300 placeholder:text-slate-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-white dark:border-slate-600 bg-gray-100" value={billingForm.street_number} onChange={handleBillingInput} readOnly={!isEditing} />
                  </div>
                  <div>
                    <label htmlFor="city" className="block text-sm font-medium mb-1">Town/City*</label>
                    <input id="city" type="text" placeholder="Delhi" className="w-full px-3 py-2 border border-slate-300 placeholder:text-slate-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-white dark:border-slate-600 bg-gray-100" value={billingForm.city} onChange={handleBillingInput} readOnly={!isEditing} required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="state" className="block text-sm font-medium mb-1">State/County*</label>
                    <input id="state" type="text" placeholder="Delhi" className="w-full px-3 py-2 border border-slate-300 placeholder:text-slate-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-white dark:border-slate-600 bg-gray-100" value={billingForm.state} onChange={handleBillingInput} readOnly={!isEditing} required />
                  </div>
                  <div>
                    <label htmlFor="zip_code" className="block text-sm font-medium mb-1">Zip/Postal code</label>
                    <input id="zip_code" type="text" placeholder="Ex. 110020" className="w-full px-3 py-2 border border-slate-300 placeholder:text-slate-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-white dark:border-slate-600 bg-gray-100" value={billingForm.zip_code} onChange={handleBillingInput} readOnly={!isEditing} />
                  </div>
                </div>
                <div>
                  <label htmlFor="additional_info" className="block text-sm font-medium mb-1">Additional info</label>
                  <textarea id="additional_info" placeholder="Special info (optional)" className="w-full px-3 py-2 border border-slate-300 placeholder:text-slate-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none dark:bg-slate-700 dark:text-white dark:border-slate-600 bg-gray-100" rows={3} value={billingForm.additional_info} onChange={handleBillingInput} readOnly={!isEditing} />
                </div>
                <div className="flex flex-col items-center gap-3 mt-4">
                  {isEditing ? (
                    <div className="flex gap-4 w-full max-w-xs mx-auto">
                      <button
                        type="button"
                        className="flex-1 py-3 text-lg bg-gray-500 hover:bg-gray-600 text-white rounded-md transition-colors font-semibold"
                        onClick={() => {
                          setIsEditing(false);
                          // Reset form to original values
                          fetchBillingDetails();
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-3 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors font-semibold"
                        disabled={loading}
                      >
                        {loading ? 'Saving...' : 'Save changes'}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="w-full max-w-xs mx-auto py-3 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors font-semibold"
                      onClick={onContinue}
                    >
                      Continue
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Payment Detail Tab */}
        {false && activeTab === 'payment' && (
          <div className="lg:col-span-3 w-full space-y-6">
            {/* Payment Methods */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
              <div className="p-6 border-b border-slate-700">
                <h3 className="text-lg font-semibold">Payment methods</h3>
              </div>
              <div className="p-6 space-y-4">
                {/* Razorpay */}
                <div className="flex items-center justify-between p-3 bg-white text-slate-900 border border-slate-300 rounded-lg dark:bg-slate-700 dark:text-white dark:border-slate-600">
                  <div className="flex items-center gap-3">
                    <Image src={razorpayImg} alt="Razorpay" width={32} height={32} className="w-8 h-8 rounded bg-white p-1" />
                    <div>
                      <div className="font-medium">Razorpay</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-semibold transition-colors"
                      onClick={handleRazorpayClick}
                      disabled={_razorpayLoading}
                    >
                      {_razorpayLoading ? 'Processing...' : 'Pay with Razorpay'}
                    </button>
                  </div>
                </div>
                {/* Intuit */}
                <div className="flex items-center justify-between p-3 bg-white text-slate-900 border border-slate-300 rounded-lg dark:bg-slate-700 dark:text-white dark:border-slate-600">
                  <div className="flex items-center gap-3">
                    <Image src={intuitImg} alt="Intuit" width={32} height={32} className="w-8 h-8 rounded bg-white p-1" />
                    <div>
                      <div className="font-medium">Intuit</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-semibold transition-colors"
                      onClick={() => { setActiveGateway('intuit'); setShowAddCardModal(true); setShowAnimations(true); setSelectedPaymentMethod('cards'); }}
                      disabled={intuitLoading || !selectedPlan}
                    >
                      {intuitLoading ? 'Processing...' : 'Pay with Intuit'}
                    </button>
                  </div>
                </div>

                {/* Show Intuit payment status and details */}
                {(intuitPaymentId || intuitPaymentStatus || intuitError) && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded mt-4">
                    <h4 className="font-semibold mb-2 text-blue-800">Intuit Payment Status</h4>

                    {intuitPaymentId && (
                      <div className="mb-2">
                        <span className="text-sm font-medium text-blue-700">Payment ID:</span>
                        <span className="ml-2 text-sm text-blue-600 font-mono">{intuitPaymentId}</span>
                      </div>
                    )}

                    {intuitPaymentStatus && (
                      <div className="mb-3">
                        <span className="text-sm font-medium text-blue-700">Status:</span>
                        <span className={`ml-2 px-2 py-1 text-xs rounded-full font-medium ${
  intuitPaymentStatus === 'completed' || intuitPaymentStatus === 'success'
    ? 'bg-green-100 text-green-800'
    : intuitPaymentStatus === 'failed' || intuitPaymentStatus === 'cancelled'
    ? 'bg-red-100 text-red-800'
    : intuitPaymentStatus === 'pending'
    ? 'bg-yellow-100 text-yellow-800'
    : 'bg-blue-100 text-blue-800'
}`}>
  {intuitPaymentStatus && typeof intuitPaymentStatus === 'string' ? `${intuitPaymentStatus!.charAt(0).toUpperCase()}${intuitPaymentStatus!.slice(1)}` : 'Unknown'}
</span>
                      </div>
                    )}

                    {intuitPaymentStatus === 'pending' && (
                      <div className="space-y-3">
                        <div className="text-sm text-blue-600">
                          ⏳ Payment is pending. You can manually complete it or wait for automatic processing.
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={() => completeIntuitPayment(intuitPaymentId!)}
                            disabled={intuitLoading}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-semibold transition-colors disabled:opacity-50"
                          >
                            {intuitLoading ? 'Completing...' : 'Complete Payment Manually'}
                          </button>
                          <button
                            onClick={() => checkPaymentStatus(intuitPaymentId!, Number(getSelectedPlanPrice().replace(/[^0-9.]/g, '')) || 60)}
                            disabled={intuitLoading}
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md font-semibold transition-colors disabled:opacity-50"
                          >
                            🔄 Refresh Status
                          </button>
                          <button
                            onClick={async () => {
                              if (!intuitPaymentId) return;
                              console.log('Force checking status for:', intuitPaymentId);
                              try {
                                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing/payment-status/${intuitPaymentId}`);
                                if (response.ok) {
                                  const data = await response.json();
                                  console.log('Force status check result:', data);
                                  setIntuitPaymentStatus(data.status);
                                  if (data.status === 'completed' || data.status === 'success') {
                                    setShowSuccessModal(true);
                                  }
                                }
                              } catch (error) {
                                console.error('Force status check error:', error);
                              }
                            }}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-semibold transition-colors"
                          >
                            🔍 Force Check Status
                          </button>
                        </div>
                      </div>
                    )}

                    {intuitPaymentStatus === 'checking' && (
                      <div className="text-sm text-blue-600">
                        🔍 Checking payment status...
                      </div>
                    )}

                    {(intuitPaymentStatus === 'completed' || intuitPaymentStatus === 'success') ? (
                      <div className="text-sm text-green-600">
                        ✅ Payment completed successfully! Your subscription has been upgraded.
                      </div>
                    ) : null}

                    {intuitPaymentStatus === 'failed' && (
                      <div className="text-sm text-red-600">
                        ❌ Payment failed. Please try again or contact support.
                      </div>
                    )}

                    {intuitPaymentStatus === 'cancelled' && (
                      <div className="text-sm text-red-600">
                        🚫 Payment was cancelled. Please try again or contact support.
                      </div>
                    )}
                  </div>
                )}

                {/* Show Intuit error if any */}
                {intuitError && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded mt-4 text-red-700">
                    <div className="font-semibold mb-1">Payment Error:</div>
                    {intuitError}
                  </div>
                )}
                {/* Show Razorpay order details if available */}
                {razorpayOrder && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded mt-4">
                    <div className="font-semibold mb-2">Razorpay Order Created!</div>
                    <div><strong>Order ID:</strong> {razorpayOrder?.order_id || "N/A"}</div>
                    <div><strong>Key ID:</strong> {razorpayOrder?.key_id || "N/A"}</div>
                    <div><strong>Amount:</strong> ₹{razorpayOrder?.amount || 0}</div>
                  </div>
                )}
                {_razorpayError && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded mt-4 text-red-700">{_razorpayError}</div>
                )}

                {/* Mastercard removed */}

                {/* PayPal */}
                <div className="flex items-center justify-between p-3 bg-white text-slate-900 border border-slate-300 rounded-lg dark:bg-slate-700 dark:text-white dark:border-slate-600">
                  <div className="flex items-center gap-3">
                    <Image src={paypalImg} alt="PayPal" width={32} height={32} className="w-8 h-8 rounded bg-white p-1" />
                    <div>
                      <div className="font-medium">Paypal account</div>

                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-semibold transition-colors"
                      onClick={() => { setActiveGateway('paypal'); setShowAddCardModal(true); setShowAnimations(true); setSelectedPaymentMethod('cards'); }}
                      disabled={paypalLoading || !selectedPlan}
                    >
                      {paypalLoading ? 'Processing...' : 'Pay with PayPal'}
                    </button>
                  </div>
                </div>

                {/* PayPal approval link and status */}
                {(paypalApprovalUrl || paypalError) && (
                  <div className="p-4 mt-4 border rounded bg-blue-50 border-blue-200">
                    {paypalApprovalUrl && (
                      <div className="flex flex-col gap-2">
                        <div className="text-sm text-blue-800">PayPal payment created.</div>
                        <a
                          href={paypalApprovalUrl || undefined}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded w-max"
                        >
                          Continue to PayPal
                        </a>
                        {paypalPaymentId && (
                          <div className="text-xs text-blue-700">Payment ID: <span className="font-mono">{paypalPaymentId}</span></div>
                        )}
                      </div>
                    )}
                    {paypalError && (
                      <div className="text-sm text-red-700">{paypalError}</div>
                    )}
                  </div>
                )}

                {/* Removed: Add new payment method and Save changes buttons */}
              </div>
            </div>


            {/* Billing Orders (from /billing/orders) */}
            {false && (
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg mt-6">
                <div className="p-6 border-b border-slate-700 flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Payment History (Orders)</h3>
                  <button
                    onClick={fetchOrders}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                  >
                    🔄 Refresh
                  </button>
                </div>
                <div className="p-6">
                  {ordersLoading ? (
                    <div className="text-center py-8">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <p className="mt-2 text-slate-400">Loading orders...</p>
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-slate-400">No orders found</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-slate-700">
                            <th className="text-left py-3 text-sm font-medium text-slate-400">Order ID</th>
                            <th className="text-left py-3 text-sm font-medium text-slate-400">Date</th>
                            <th className="text-left py-3 text-sm font-medium text-slate-400">Amount</th>
                            <th className="text-left py-3 text-sm font-medium text-slate-400">Status</th>
                            <th className="text-left py-3 text-sm font-medium text-slate-400">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orders.map((order: any, index: number) => (
                            <tr key={order.order_id || order._id || index} className="border-b border-slate-700">
                              <td className="py-3 font-medium font-mono text-sm">
                                {order.order_id || order._id || 'N/A'}
                              </td>
                              <td className="py-3 text-sm">
                                {(order.date || order.created_at) ?
                                  new Date(order.date || order.created_at).toLocaleDateString('en-GB', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric'
                                  }) : 'N/A'
                                }
                              </td>
                              <td className="py-3 text-sm">
                                ${typeof order.amount === 'number' ? order.amount.toFixed(2) : (order.amount || '0.00')}
                              </td>
                              <td className="py-3">
                                <span className={`text-white text-xs px-2 py-1 rounded ${order.status === 'completed' || order.status === 'success'
                                    ? 'bg-green-600'
                                    : order.status === 'pending'
                                      ? 'bg-yellow-600'
                                      : order.status === 'failed' || order.status === 'cancelled'
                                        ? 'bg-red-600'
                                        : 'bg-gray-600'
                                  }`}>
                                  {order.status ? String(order.status).charAt(0).toUpperCase() + String(order.status).slice(1) : 'Unknown'}
                                </span>
                              </td>
                              <td className="py-3 text-sm">
                                <div className="flex gap-2">
                                  <button
                                    className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs"
                                    onClick={() => handleViewInvoice(order.order_id || order._id)}
                                  >
                                    View Invoice
                                  </button>
                                  <button
                                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs"
                                    onClick={() => handleDownloadInvoice(order.order_id || order._id)}
                                  >
                                    Download PDF
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Combined Payment History */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg mt-6">
              <div className="p-6 border-b border-slate-700 flex justify-between items-center">
                <h3 className="text-lg font-semibold">Payment History</h3>
              </div>
              <div className="p-6">
                {billingHistoryLoading && ordersLoading ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="mt-2 text-slate-400">Loading payments...</p>
                  </div>
                ) : combinedPayments.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-slate-400">No payments found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-700">
                          <th className="text-left py-3 text-sm font-medium text-slate-400">Payment ID</th>
                          <th className="text-left py-3 text-sm font-medium text-slate-400">Date</th>
                          <th className="text-left py-3 text-sm font-medium text-slate-400">Amount</th>
                          <th className="text-left py-3 text-sm font-medium text-slate-400">Status</th>
                          <th className="text-left py-3 text-sm font-medium text-slate-400">Source</th>
                          <th className="text-left py-3 text-sm font-medium text-slate-400">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {combinedPayments.slice(0, visiblePayments).map((row, idx) => (
                          <tr key={`${row.source}-${row.id}-${idx}`} className="border-b border-slate-700">
                            <td className="py-3 font-medium font-mono text-sm">{row.id || 'N/A'}</td>
                            <td className="py-3 text-sm">
                              {row.date ? new Date(row.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                            </td>
                            <td className="py-3 text-sm">${row.amount.toFixed(2)}</td>
                            <td className="py-3">
                              <span className={`text-white text-xs px-2 py-1 rounded ${row.status === 'completed' || row.status === 'success' ? 'bg-green-600' :
                                  row.status === 'pending' ? 'bg-yellow-600' :
                                    row.status === 'failed' || row.status === 'cancelled' ? 'bg-red-600' : 'bg-gray-600'
                                }`}>
                                {String(row.status).charAt(0).toUpperCase() + String(row.status).slice(1)}
                              </span>
                            </td>
                            <td className="py-3 text-sm text-slate-400">{row.source}</td>
                            <td className="py-3 text-sm">
                              <div className="relative dropdown-container inline-block text-left">
                                <button
                                  type="button"
                                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
                                  onClick={() => toggleDropdown(row.id || `${row.source}-${idx}`)}
                                  aria-haspopup="true"
                                  aria-expanded={openDropdown === (row.id || `${row.source}-${idx}`)}
                                >
                                  <MoreHorizontal className="w-5 h-5" />
                                </button>
                                {openDropdown === (row.id || `${row.source}-${idx}`) && (
                                  <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded shadow-lg z-10">
                                    <button
                                      className="w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                                      onClick={() => handleViewInvoice(row.id || `${row.source}-${idx}`)}
                                    >
                                      <Eye className="w-4 h-4" />
                                      <span>View Invoice</span>
                                    </button>
                                    <button
                                      className="w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                                      onClick={() => handleDownloadInvoice(row.id || `${row.source}-${idx}`)}
                                    >
                                      <Download className="w-4 h-4" />
                                      <span>Download Invoice</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {/* See more */}
                {(combinedPayments.length > visiblePayments || visiblePayments > 10) && (
                  <div className="mt-4 flex justify-center gap-3">
                    {combinedPayments.length > visiblePayments && (
                      <button
                        className="px-4 py-2 text-sm bg-slate-800 text-white rounded hover:bg-slate-700"
                        onClick={() => setVisiblePayments((v) => v + 10)}
                      >
                        See more
                      </button>
                    )}
                    {visiblePayments > 10 && (
                      <button
                        className="px-4 py-2 text-sm bg-slate-200 text-slate-800 rounded hover:bg-slate-300"
                        onClick={() => setVisiblePayments(10)}
                      >
                        See less
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Razorpay Payment Modal */}
      {showAddCardModal && (
        <div className="fixed right-0 bottom-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-[2px] overflow-hidden" style={{ left: overlayInsets.left, top: overlayInsets.top }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl mx-auto h-[63vh] flex overflow-hidden">
            {/* Left Sidebar - Blue Background */}
            <div className="w-1/4 bg-blue-600 text-white p-6 flex flex-col">
              {/* Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-lg">R</span>
                </div>
                <div>
                  <div className="font-semibold">Merchant Name</div>
                  <div className="flex items-center gap-1 text-sm">
                    <span className="text-green-300">✓</span>
                    <span>Razorpay Trusted Business</span>
                  </div>
                </div>
              </div>

              {/* Price Summary */}
              <div className="bg-white/10 rounded-lg p-4 mb-4">
                <div className="text-sm mb-2">Price Summary</div>
                <div className="text-3xl font-bold">{getSelectedPlanPrice()}</div>
              </div>

              {/* Bottom Section */}
              <div className="mt-auto">
                <div className="flex items-center gap-2 text-sm">
                  <span>Money Back Promise by Razorpay</span>
                  <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
                    <Image src={razorpayImg} alt="Razorpay" width={24} height={24} className="w-6 h-6" />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Section - Payment Options */}
            <div className="w-3/4 bg-white p-6 flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Payment Options</h2>
                <div className="flex items-center gap-2">
                  <button
                    className="p-2 hover:bg-gray-100 rounded"
                    onClick={() => {
                      setShowExitModal(true);
                      setShowAnimations(false);
                    }}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>



              {/* Content Area - Changes layout when Cards is selected */}
              <div className="flex-1 flex gap-6">
                {/* Payment Methods - Becomes smaller when Cards is selected */}
                <div className={`space-y-4 overflow-y-auto pr-2 ${selectedPaymentMethod === 'cards' || selectedPaymentMethod === 'upi' || selectedPaymentMethod === 'netbanking' ? 'w-1/2 max-h-[400px]' : 'w-full max-h-[400px]'
                  }`}>
                  {/* UPI */}
                  <div
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${showAnimations ? 'animate-slide-up-delayed-2' : ''} ${selectedPaymentMethod === 'upi' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
                    onClick={() => setSelectedPaymentMethod(selectedPaymentMethod === 'upi' ? null : 'upi')}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded flex items-center justify-center">
                          <Image src={upiImg} alt="UPI" width={24} height={24} className="w-6 h-6" />
                        </div>
                        <span className="font-medium text-slate-900 dark:text-white">UPI</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {/* Google Pay */}
                      <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                        <Image src={gpayImg} alt="Google Pay" width={24} height={24} className="w-6 h-6" />
                      </div>
                      {/* PhonePe */}
                      <div className="w-8 h-8 bg-purple-100 rounded flex items-center justify-center">
                        <Image src={phonepayImg} alt="PhonePe" width={24} height={24} className="w-6 h-6" />
                      </div>
                      {/* Paytm */}
                      <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                        <Image src={paytmImg} alt="Paytm" width={24} height={24} className="w-6 h-6" />
                      </div>
                      {/* BHIM */}
                      <div className="w-8 h-8 bg-orange-100 rounded flex items-center justify-center">
                        <Image src={bhimPayImg} alt="BHIM" width={24} height={24} className="w-6 h-6" />
                      </div>
                    </div>
                  </div>

                  {/* Cards */}
                  <div
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${showAnimations ? 'animate-slide-up-delayed-2' : ''} ${selectedPaymentMethod === 'cards'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                      }`}
                    onClick={() => setSelectedPaymentMethod(selectedPaymentMethod === 'cards' ? null : 'cards')}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-6 h-6 text-blue-600" />
                        <span className="font-medium">Cards</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                        <Image src={visaImg} alt="Visa" width={24} height={24} className="w-6 h-6" />
                      </div>
                      <div className="w-8 h-8 bg-red-100 rounded flex items-center justify-center">
                        <Image src={masterImg} alt="Mastercard" width={24} height={24} className="w-6 h-6" />
                      </div>
                      <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                        <Image src={rupayImg} alt="RuPay" width={24} height={24} className="w-6 h-6" />
                      </div>
                      <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center">
                        <Image src={americanImg} alt="American Express" width={24} height={24} className="w-6 h-6" />
                      </div>
                    </div>
                  </div>

                  {/* Netbanking */}
                  <div
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${showAnimations ? 'animate-slide-up-delayed-3' : ''} ${selectedPaymentMethod === 'netbanking' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
                    onClick={() => setSelectedPaymentMethod(selectedPaymentMethod === 'netbanking' ? null : 'netbanking')}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium">Netbanking</span>
                    </div>
                    <div className="flex gap-2">
                      <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                        <Image src={sbiImg} alt="SBI" width={24} height={24} className="w-6 h-6" />
                      </div>
                      <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                        <Image src={hdfcImg} alt="HDFC" width={24} height={24} className="w-6 h-6" />
                      </div>
                      <div className="w-8 h-8 bg-orange-100 rounded flex items-center justify-center">
                        <Image src={iciciImg} alt="ICICI" width={24} height={24} className="w-6 h-6" />
                      </div>
                      <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                        <Image src={axisImg} alt="AXIS" width={24} height={24} className="w-6 h-6" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Details Form - Shows on the right when Cards is selected */}
                {selectedPaymentMethod === 'cards' && (
                  <div className="w-1/2 p-8 bg-gray-50 dark:bg-slate-800 rounded-lg">
                    <h3 className="text-xl font-semibold mb-6">Add a new card</h3>
                    <form className="space-y-6" onSubmit={async (e) => {
                      e.preventDefault();
                      if (!validateCardForm()) return;
                      if (activeGateway === 'intuit') {
                        await handleIntuitPayment();
                      } else if (activeGateway === 'paypal') {
                        await handlePaypalPayment();
                      } else {
                        await handleCardContinue(e);
                      }
                    }}>
                      <div>
                        <label className="block text-sm font-medium mb-2">Card Number</label>
                        <input
                          type="text"
                          placeholder="xxxx-xxxx-xxxx-xxxx"
                          className={`w-full px-3 py-2 border ${cardErrors.number ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                          value={cardNumber}
                          onChange={e => {
                            // Format card number as XXXX-XXXX-XXXX-XXXX
                            let value = e.target.value.replace(/\D/g, ''); // Remove non-digit characters
                            if (value.length > 16) value = value.substring(0, 16); // Limit to 16 digits
                            // Add dashes every 4 digits
                            const formattedValue = value.replace(/(\d{4})(?=\d)/g, '$1-');
                            setCardNumber(formattedValue);
                          }}
                          required
                        />
                        {cardErrors.number && <p className="text-red-500 text-xs mt-1">{cardErrors.number}</p>}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Expiry Date</label>
                          <input
                            type="text"
                            placeholder="MM/YY"
                            className={`w-full px-3 py-2 border ${cardErrors.expiry ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                            value={cardExpiry}
                            onChange={e => {
                              // Format expiry as MM/YY
                              let value = e.target.value.replace(/\D/g, ''); // Remove non-digit characters
                              if (value.length > 4) value = value.substring(0, 4); // Limit to 4 digits
                              // Add slash after 2 digits
                              if (value.length > 2) value = value.substring(0, 2) + '/' + value.substring(2);
                              setCardExpiry(value);
                            }}
                            required
                          />
                          {cardErrors.expiry && <p className="text-red-500 text-xs mt-1">{cardErrors.expiry}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">CVV</label>
                          <input
                            type="text"
                            placeholder="CVV"
                            className={`w-full px-3 py-2 border ${cardErrors.cvv ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                            value={cardCVV}
                            onChange={e => setCardCVV(e.target.value.replace(/[^0-9]/g, '').substring(0, 4))} // Limit to 4 digits
                            required
                          />
                          {cardErrors.cvv && <p className="text-red-500 text-xs mt-1">{cardErrors.cvv}</p>}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Enter name on card</label>
                        <input
                          type="text"
                          placeholder="Enter name on card"
                          className={`w-full px-3 py-2 border ${cardErrors.name ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                          value={cardName}
                          onChange={e => setCardName(e.target.value)}
                        />
                        {cardErrors.name && <p className="text-red-500 text-xs mt-1">{cardErrors.name}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" id="saveCard" className="w-4 h-4 text-blue-600" checked={cardSaveChecked} onChange={e => setCardSaveChecked(e.target.checked)} />
                        <label htmlFor="saveCard" className="text-sm text-gray-600">
                          Save this card as per RBI guidelines
                        </label>
                      </div>
                      <button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-md font-semibold transition-colors"
                        disabled={cardLoading}
                      >
                        {cardLoading ? 'Processing...' : 'Continue'}
                      </button>
                    </form>
                  </div>
                )}
                {selectedPaymentMethod === 'upi' && (
                  <div className="w-1/2 p-8 bg-gray-50 dark:bg-slate-800 rounded-lg flex flex-col justify-center">
                    <h3 className="text-xl font-semibold mb-6 text-slate-900 dark:text-white">Pay with UPI ID / Number</h3>
                    <form className="space-y-6">
                      <div>
                        <input
                          type="text"
                          placeholder="example@okhdfcbank"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400"
                          value={upiId}
                          onChange={e => setUpiId(e.target.value)}
                        />
                      </div>
                      <button
                        type="button"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-md font-semibold transition-colors"
                        disabled={false}
                      >
                        Verify and Pay
                      </button>
                    </form>
                  </div>
                )}
                {selectedPaymentMethod === 'netbanking' && (
                  <div className="w-1/2 p-8 bg-gray-50 dark:bg-slate-800 rounded-lg">
                    <h3 className="text-xl font-semibold mb-6 text-slate-900 dark:text-white">Pay with Netbanking</h3>
                    <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
                      <div>
                        <label className="block text-sm font-medium mb-2">User ID</label>
                        <input
                          type="text"
                          placeholder="Enter user ID"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Password</label>
                        <input
                          type="password"
                          placeholder="Password"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400"
                          required
                        />
                      </div>
                      <div className="flex items-center gap-3 pt-2">
                        <button type="submit" className="px-6 py-3 rounded-md font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors">
                          Pay Now
                        </button>
                        <button type="button" className="px-6 py-3 rounded-md font-semibold text-red-700 border border-red-300 bg-red-100 hover:bg-red-200 transition-colors" onClick={() => { /* reset fields via simple form reset */ const form = (event?.target as HTMLButtonElement)?.closest('form') as HTMLFormElement | null; form?.reset(); }}>
                          RESET
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500 text-center">
                  By proceeding, I agree to Razorpay&apos;s Privacy Notice
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      {showUpgradeModal && (
        <div className="fixed right-0 bottom-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-[2px]" style={{ left: overlayInsets.left, top: overlayInsets.top }}>
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-6xl mx-auto p-8 relative flex flex-col items-center">
            <button
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-white text-2xl"
              onClick={() => setShowUpgradeModal(false)}
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>
            <h2 className="text-2xl font-bold mb-8 text-center">Upgrade your plan</h2>
            <div className="flex flex-col md:flex-row gap-4 w-full justify-center">
              {plansLoading ? (
                <div className="text-center w-full py-8">Loading plans...</div>
              ) : plansError ? (
                <div className="text-center w-full py-8 text-red-500">{plansError}</div>
              ) : plans.length > 0 ? (
                plans.map((plan, idx) => (
                  <div key={plan.plan_name || idx} className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 flex flex-col items-center min-w-[300px] max-w-[350px] relative transition-transform duration-200 hover:scale-105 hover:shadow-2xl">
                    <h3 className="text-xl font-bold mb-2">{plan.plan_name}</h3>
                    <div className="text-3xl font-bold mb-1">Contact for Pricing</div>
                    <div className="mb-4 text-slate-500 text-center">{plan.description}</div>
                    {/* You can add logic to highlight the current plan if needed */}
                    <button
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-md py-2 mb-4 font-semibold"
                      onClick={() => handlePlanSelection(plan)}
                    >
                      Upgrade
                    </button>
                    <div className="w-full">
                      <div className="mb-2 font-semibold">Included Features:</div>
                      <ul className="space-y-1 text-sm text-left w-full">
                        {Array.isArray(plan.features) && plan.features.map((feature: string, i: number) => (
                          <li key={i} className="w-full flex items-start">
                            <span className="text-green-500 mr-2">✓</span><span className="w-full">{feature}</span>
                          </li>
                        ))}
                        {Array.isArray(plan.restrictions) && plan.restrictions.map((restriction: string, i: number) => (
                          <li key={i} className="w-full flex items-start">
                            <span className="text-red-500 mr-2">🚫</span><span className="w-full">{restriction}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center w-full py-8">No plans found.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Exit Confirmation Modal */}
      {showExitModal && (
        <div className="fixed right-0 bottom-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-[2px]" style={{ left: overlayInsets.left, top: overlayInsets.top }}>
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-auto p-0 flex flex-col overflow-hidden">
            {/* SVG Exit Illustration */}
            <div className="flex justify-center bg-gray-50 pt-10 pb-4">
              <span className="inline-flex h-20 w-24 items-center">
                {/* Razorpay Exit SVG */}
                <svg viewBox="0 0 93 76" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-20 w-24">
                  <path d="M53.9238 18.2186L66.45 15.5413L54.0194 31.4142L53.9238 18.2186Z" fill="#ECECEC"></path>
                  <path fillRule="evenodd" clipRule="evenodd" d="M22.4941 8.72226V65.8281L25.3948 65.4775V12.348L51.319 16.155L52.9506 17.0615H60.0209V17.162L63.7372 16.3585V15.2486L22.4941 8.72226Z" fill="#A2A2A2"></path>
                  <path d="M20.5 9.71935L22.4941 8.72226V65.8281L20.5 64.7404V9.71935Z" fill="#3A3A3A"></path>
                  <path d="M26.5731 29.2985L34.8217 18.6025V37.0939L26.5731 47.7899V29.2985Z" fill="#ECECEC"></path>
                  <path d="M68.812 36.0061H68.7227V42.1699H68.812C69.3634 42.1699 69.8104 41.7229 69.8104 41.1715V37.0045C69.8104 36.4531 69.3634 36.0061 68.812 36.0061Z" fill="#3A3A3A"></path>
                  <path d="M37.5574 5L52.5574 8V16.3859L37.5574 14V5Z" fill="#B42318"></path>
                  <path d="M39.5176 12.3352V8.23783L42.304 8.67128V9.41242L40.3154 9.10308V10.0129L42.1671 10.301V11.012L40.3154 10.724V11.7182L42.304 12.0275V12.7687L39.5176 12.3352ZM43.8631 10.9625L42.6127 8.7193L43.5356 8.86286L44.1072 9.91586L44.4704 10.6171L44.4823 10.619L44.8336 10.0228L45.3813 9.14997L46.3042 9.29353L45.0598 11.1487L46.3042 13.3909L45.3813 13.2474L44.8098 12.1944L44.4466 11.4931L44.4347 11.4913L44.0834 12.0874L43.5356 12.9603L42.6127 12.8167L43.8631 10.9625ZM46.6751 13.4486V9.35123L47.473 9.47533V13.5727L46.6751 13.4486ZM49.0306 13.815V10.4708L47.8338 10.2847V9.53147L51.0192 10.027V10.7802L49.8284 10.5949V13.9391L49.0306 13.815Z" fill="#ECECEC"></path>
                  <path d="M37.6318 7H35.7283V70.4509L37.6318 70.2697V7Z" fill="#ECECEC"></path>
                  <path d="M37.8117 35.4622H37.6317V42.4419H37.8117C38.3631 42.4419 38.8101 41.9949 38.8101 41.4435V36.4606C38.8101 35.9092 38.3631 35.4622 37.8117 35.4622Z" fill="#3A3A3A"></path>
                  <path d="M26.2105 13.7984L27.5702 13.889L34.6405 10.8071V10.0819L26.2105 13.7984Z" fill="#3A3A3A"></path>
                  <path fillRule="evenodd" clipRule="evenodd" d="M25.3947 12.2574L35.7282 7V70.4509L25.3947 66.4626V12.2574ZM27.5702 13.889L34.6405 10.8071V63.3807L27.6462 61.5678L27.5702 13.889Z" fill="#A2A2A2"></path>
                  <path fillRule="evenodd" clipRule="evenodd" d="M26.2105 13.7984L34.6405 10.0819V64.6498L26.3012 62.3837L26.2105 13.7984ZM27.5702 13.889L34.6404 10.8071V63.3807L27.6462 61.5679L27.5702 13.889Z" fill="#ECECEC"></path>
                  <path fillRule="evenodd" clipRule="evenodd" d="M34.6405 10.0819L26.2105 13.7984L26.2106 13.8069L27.6551 14.5771L34.6404 11.5322L34.6405 61.7731V10.0819Z" fill="#3A3A3A"></path>
                  <path d="M67.0005 13.3451L68.7228 14.2515L68.9947 63.9245L67.2725 64.9216L67.0005 13.3451Z" fill="#ECECEC"></path>
                  <path d="M26.0294 37.0939L34.7312 36.55V40.3571L26.0294 40.1758V37.0939Z" fill="#A2A2A2"></path>
                  <path d="M53.7665 36.9126L66.2754 36.55V40.1758L53.7665 39.9945V36.9126Z" fill="#A2A2A2"></path>
                  <path fillRule="evenodd" clipRule="evenodd" d="M35.9096 35.4622H34.1702C33.7291 35.4622 33.3715 35.8198 33.3715 36.261V41.7338C33.3715 42.1749 33.7291 42.5325 34.1702 42.5325H35.9096V35.4622ZM35.9095 36.5499H35.0399C34.8193 36.5499 34.6405 36.7287 34.6405 36.9493V41.0454C34.6405 41.2659 34.8193 41.4447 35.0399 41.4447H35.9095V36.5499Z" fill="#3A3A3A"></path>
                  <path fillRule="evenodd" clipRule="evenodd" d="M52.86 16.7895L67.0005 13.3451L67.2724 64.9216L52.86 61.4771V16.7895ZM54.0384 18.3787L65.8222 15.8831V59.9362L54.0384 57.9979V18.3787Z" fill="#A2A2A2"></path>
                  <path fillRule="evenodd" clipRule="evenodd" d="M67.1144 36.0061H65.7004C65.2593 36.0061 64.9017 36.3637 64.9017 36.8049V41.3712C64.9017 41.8123 65.2593 42.1699 65.7004 42.1699H67.1144V41.2217H66.4075C66.1869 41.2217 66.0081 41.0429 66.0081 40.8223V37.3538C66.0081 37.1332 66.1869 36.9544 66.4075 36.9544H67.1144V36.0061Z" fill="#3A3A3A"></path>
                  <path d="M27.6609 61.2053L26.3012 62.3836L34.6405 64.6497V63.0181L27.6609 61.2053Z" fill="#3A3A3A"></path>
                  <path d="M50.9565 16.0644L52.9506 16.3364V61.5678H50.9565V16.0644Z" fill="#3A3A3A"></path>
                  <path d="M37.6317 16.0644L37.636 14.0632L52.9456 16.3362L52.6593 18.2643L37.6317 16.0644Z" fill="#3A3A3A"></path>
                  <path d="M65.8222 15.8831L54.0385 18.3305V19.5995L65.8222 17.0615V15.8831Z" fill="#3A3A3A"></path>
                  <path d="M56.276 72.1756C57.3363 73.1656 60.883 73.8581 62.5239 74.0805L64.0601 72.4565C62.7397 72.1715 61.8624 70.7743 58.9379 70.4554C57.3287 70.2799 54.9507 70.938 56.276 72.1756Z" fill="#3A3A3A"></path>
                  <path d="M64.5637 72.5988L63.0525 74.2223C63.3088 74.3081 64.0575 74.5182 65.0023 74.6726C66.1834 74.8655 67.099 74.2433 67.1787 73.8065C67.2425 73.4571 66.6447 73.1412 66.3378 73.027L64.5637 72.5988Z" fill="#3A3A3A"></path>
                  <path d="M53.3087 63.2666C55.3578 63.5703 57.0454 65.1757 57.6331 65.9405L54.569 67.069C53.8869 66.4774 51.0514 66.3562 50.157 64.9757C49.6648 64.2161 50.7473 62.887 53.3087 63.2666Z" fill="#3A3A3A"></path>
                  <path d="M54.8951 67.2871L57.9606 66.1712C58.153 66.2791 58.6354 66.6037 59.0257 67.0381C59.5135 67.5812 58.369 68.1759 57.5148 68.3138C56.8314 68.4242 56.154 68.1984 55.9008 68.0717L54.8951 67.2871Z" fill="#3A3A3A"></path>
                  <path d="M38.7018 67.4018C39.7997 68.3499 43.3707 68.904 45.0189 69.0625L46.4909 67.3801C45.1604 67.1465 44.2295 65.7845 41.2948 65.5795C39.68 65.4666 37.3294 66.2167 38.7018 67.4018Z" fill="#3A3A3A"></path>
                  <path d="M46.9997 67.5026L45.5527 69.1836C45.8121 69.2594 46.5684 69.4402 47.5185 69.5578C48.7062 69.7047 49.5969 69.0474 49.6596 68.6078C49.7098 68.2562 49.1001 67.9638 48.789 67.8616L46.9997 67.5026Z" fill="#3A3A3A"></path>
                </svg>
              </span>
            </div>
            {/* Heading and Subtext */}
            <div className="px-8 mt-4">
              <h3 className="text-center font-heading text-2xl font-semibold">Are you sure you want to exit?</h3>
              <p className="mt-2 w-full break-words text-center text-base text-gray-500">
                You will be taken back to Merchant Name website
              </p>
            </div>
            {/* Sticky Button Area */}
            <div className="sticky bottom-0 mt-8 px-8 pb-8">
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => setShowExitModal(false)}
                  className="flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-900 hover:bg-gray-50 p-3 font-heading text-lg h-11 font-semibold"
                >
                  Continue to payment
                </button>
                <button
                  onClick={() => {
                    setShowExitModal(false);
                    setShowAddCardModal(false);
                    document.body.style.overflow = 'auto';
                  }}
                  className="flex items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 p-3 font-heading text-lg h-11 font-semibold mt-1"
                >
                  Yes, exit
                </button>
              </div>
            </div>
            {/* Close (X) button */}
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              onClick={() => setShowExitModal(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Payment Success Modal */}
      {showSuccessModal && (
        <div className="fixed right-0 bottom-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-[2px]" style={{ left: overlayInsets.left, top: overlayInsets.top }}>
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md mx-auto text-center">
            {/* Success Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>

            {/* Success Message */}
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Your payment was successful
            </h2>
            <p className="text-gray-600 mb-6">
              Thank you for your payment. We will<br />
              be in contact with more details shortly
            </p>

            {/* Close Button */}
            <button
              onClick={async () => {
                setShowSuccessModal(false);
                setShowAddCardModal(false);
                document.body.style.overflow = 'auto';

                try {
                  // Force refresh active plan before reload
                  console.log('Refreshing active plan before reload...');
                  await fetchActivePlan();
                  console.log('Active plan refreshed successfully');

                  // Wait a bit more to ensure backend has updated
                  setTimeout(() => {
                    console.log('Reloading page...');
                    window.location.reload();
                  }, 1500);
                } catch (error) {
                  console.error('Error refreshing active plan:', error);
                  // Still reload even if refresh fails
                  setTimeout(() => {
                    window.location.reload();
                  }, 1500);
                }
              }}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Cancel Subscription Modal */}
      {showCancelModal && (
        <div className="fixed right-0 bottom-0 z-40 flex items-center justify-center bg-black/10 backdrop-blur-[2px]" style={{ left: overlayInsets.left, top: overlayInsets.top }}>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md mx-auto p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Cancel Subscription</h2>
              <button
                onClick={() => setShowCancelModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCancelSubscription} className="space-y-4">
              {/* Reason for Cancellation */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reason for Cancellation *
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                  required
                >
                  <option value="">Select a reason</option>
                  <option value="Too expensive">Too expensive</option>
                  <option value="Not using the service">Not using the service</option>
                  <option value="Switching to competitor">Switching to competitor</option>
                  <option value="Missing features">Missing features</option>
                  <option value="Poor customer support">Poor customer support</option>
                  <option value="Technical issues">Technical issues</option>
                  <option value="Business closing">Business closing</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Additional Message *
                </label>
                <textarea
                  value={cancelMessage}
                  onChange={(e) => setCancelMessage(e.target.value)}
                  placeholder="Please provide more details about your cancellation reason..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none dark:bg-slate-700 dark:text-white"
                  rows={4}
                  required
                />
              </div>


              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 rounded-md hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCancelLoading}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors disabled:opacity-50"
                >
                  {isCancelLoading ? 'Submitting...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
