import React, { useState, useCallback } from "react";
import { FaRocket, FaIdBadge, FaUser, FaEnvelope, FaPhone, FaTimesCircle, FaCheckCircle, FaInfoCircle, FaSpinner } from "react-icons/fa";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

 

 

 

// Customer interface for API responses
interface Customer {
  customer_id?: string;
  email?: string;
  full_name?: string;
  phone?: string;
  department?: string;
  tier?: string;
  created_at?: string;
  last_contact?: string;
  // address fields removed per request
  industry?: string;
  customer_type?: string;
  status?: string;
  notes?: string;
}

interface CustomerDetailsFormProps {
 onSuccess?: () => void;
 onError?: (message: string) => void;
}

// Zod schema for customer details
 const customerDetailsSchema = z.object({
  customer_id: z
    .string()
    .max(20, { message: "Customer ID must be at most 20 characters" })
    .regex(/^[a-zA-Z0-9\-]+$/, {
      message: "Customer ID can contain letters, numbers, and hyphens (-)",
    })
    .optional(),
 full_name: z
 .string()
 .min(2, { message: "Full Name must be at least 2 characters" })
 .max(256, { message: "Full Name must be at most 256 characters" })
 .regex(/^[\p{L}\p{N} \-Ææ']+$/u, {
 message: "Name can only contain letters, numbers, spaces, hyphens, apostrophes, and special characters like Æ",
 })
 .transform((val) => val.replace(/\s+/g, " ").trim()),
 email: z
 .string()
 .email({ message: "Invalid email address" })
 .max(256, { message: "Email must be at most 256 characters" }),
 phone: z
 .string()
 .refine((val) => {
 const parsed = parsePhoneNumberFromString(val || "");
 if (!parsed) return false;
 const national = String(parsed.nationalNumber || "");
 return national.length >= 10 && national.length <= 15;
 }, {
 message: "Phone number must be 10-15 digits excluding country code",
 }),
 tier: z.enum(["trial", "basic", "premium", "enterprise", "pro"], {
 message: "Tier must be one of: trial, basic, premium, enterprise, pro"
 }),
 last_contact: z.string().optional(), // will be set to now by default
  // address fields removed per request
 industry: z.string().max(100, { message: "Industry must be at most 100 characters" }).optional(),
 status: z.enum(["active", "inactive", "suspended", "prospect"], {
   message: "Status must be one of: active, inactive, suspended, prospect"
 }).optional(),
// removed non-required fields to align with new payload
});

type CustomerDetailsFormType = z.infer<typeof customerDetailsSchema>;

export function validateFullNameStrict(name: string) {
 // Remove leading/trailing spaces and collapse multiple spaces
 let normalized_name = name.trim().replace(/\s+/g, " ");

 // Length check
 if (normalized_name.length < 1) {
 return { is_valid: false, reason: "Name must be at least 1 character", normalized_name };
 }
 if (normalized_name.length > 256) {
 return { is_valid: false, reason: "Name must be at most 256 characters", normalized_name };
 }

 // Unicode-aware regex: allow all Unicode letters, spaces, hyphens, apostrophes
 // Disallow digits, symbols, emojis, control chars
 // \p{L} = any kind of letter from any language
 // \p{M} = marks (accents, etc.), included for completeness
 // [ -'] = space, hyphen, apostrophe
 // The u flag enables Unicode property escapes
 const validNameRegex = /^[\p{L}\p{M} \-']+$/u;

 if (!validNameRegex.test(normalized_name)) {
 return {
 is_valid: false,
 reason: "Name contains invalid characters",
 normalized_name,
 };
 }

 // Capitalize each word (optional, for normalized output)
 normalized_name = normalized_name
 .split(" ")
 .map(
 (word) =>
 word.charAt(0).toLocaleUpperCase() +
 word.slice(1).toLocaleLowerCase()
 )
 .join(" ");

 return { is_valid: true, reason: "Valid name", normalized_name };
}

export default function CustomerDetailsForm({ onSuccess, onError }: CustomerDetailsFormProps) {
 const RAW_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
 if (!RAW_BASE_URL) {
   throw new Error('NEXT_PUBLIC_API_URL environment variable is not set');
 }
 const BASE_URL = RAW_BASE_URL.replace(/\/+$/,'');
 const {
 register,
 handleSubmit,
 formState: { errors, isSubmitting },
 reset,
 control,
 setError,
 clearErrors,
 watch,
 } = useForm<CustomerDetailsFormType>({
 resolver: zodResolver(customerDetailsSchema),
 mode: "onChange",
 defaultValues: {
 customer_id: "",
 full_name: "",
 email: "",
 phone: "",
 tier: "trial",
 last_contact: new Date().toISOString(),
 },
 });

 // Watch form values for real-time validation
 const watchedEmail = watch("email");
 const watchedCustomerId = watch("customer_id");
  // UI-only client profile fields (not sent to backend)
  const [uiMeta, setUiMeta] = useState({
    company: "",
    industry: "",
    mrr: "",
    status: "Active",
    accountManager: "",
    lastOrder: "",
    country: "",
  });

 // State for duplicate validation
 const [isCheckingEmail, setIsCheckingEmail] = useState(false);
 const [isCheckingCustomerId, setIsCheckingCustomerId] = useState(false);

 // Function to check if email already exists
 const checkEmailDuplicate = useCallback(async (email: string) => {
   if (!email || !email.includes("@")) return;
   
   setIsCheckingEmail(true);
   try {
    const response = await fetch(BASE_URL + "/api/v1/customers/?page=1&size=1000");
     if (response.ok) {
       const data = await response.json();
       const customers = Array.isArray(data.data) ? data.data : [];
       const existingCustomer = customers.find((customer: Customer) => 
         customer.email && customer.email.toLowerCase() === email.toLowerCase()
       );
       
       if (existingCustomer) {
         setError("email", { 
           type: "manual", 
           message: "This email is already registered. Please use a different email address." 
         });
       } else {
         clearErrors("email");
       }
     }
   } catch (error) {
     console.error("Error checking email duplicate:", error);
   } finally {
     setIsCheckingEmail(false);
   }
 }, [BASE_URL, setError, clearErrors]);

 // Function to check if customer ID already exists
 const checkCustomerIdDuplicate = useCallback(async (customerId: string) => {
   if (!customerId) return;
   
   setIsCheckingCustomerId(true);
   try {
    const response = await fetch(BASE_URL + "/api/v1/customers/?page=1&size=1000");
     if (response.ok) {
       const data = await response.json();
       const customers = Array.isArray(data.data) ? data.data : [];
       const existingCustomer = customers.find((customer: Customer) => 
         customer.customer_id && customer.customer_id.toLowerCase() === customerId.toLowerCase()
       );
       
       if (existingCustomer) {
         setError("customer_id", { 
           type: "manual", 
           message: "This Customer ID is already taken. Please use a different ID." 
         });
       } else {
         clearErrors("customer_id");
       }
     }
   } catch (error) {
     console.error("Error checking customer ID duplicate:", error);
   } finally {
     setIsCheckingCustomerId(false);
   }
 }, [BASE_URL, setError, clearErrors]);

 // Debounced validation for email
 React.useEffect(() => {
   const timeoutId = setTimeout(() => {
     if (watchedEmail) {
       checkEmailDuplicate(watchedEmail);
     }
   }, 500);
   return () => clearTimeout(timeoutId);
 }, [watchedEmail, checkEmailDuplicate]);

 // Debounced validation for customer ID
 React.useEffect(() => {
   const timeoutId = setTimeout(() => {
     if (watchedCustomerId) {
       checkCustomerIdDuplicate(watchedCustomerId);
     }
   }, 500);
   return () => clearTimeout(timeoutId);
 }, [watchedCustomerId, checkCustomerIdDuplicate]);

 // Removed unused placeholders state

 // Removed unused handleDynamicPlaceholder function

 const onSubmit = async (data: CustomerDetailsFormType) => {
 try {
 const now = new Date().toISOString();
const payload = {
  ...data,
  company: uiMeta.company || undefined,
  industry: data.industry ?? (uiMeta.industry || undefined),
  status: data.status,
  account_manager: uiMeta.accountManager || undefined,
  country: uiMeta.country || undefined,
  orders: 0,
  mrr:
    uiMeta.mrr !== "" && uiMeta.mrr !== null && uiMeta.mrr !== undefined
      ? Number(uiMeta.mrr)
      : 0,
  last_order: uiMeta.lastOrder
    ? new Date(uiMeta.lastOrder).toISOString()
    : undefined,
  created_at: now,
  last_contact: data.last_contact || now,
};
const response = await fetch(BASE_URL + "/api/v1/create-customer/", {
 method: "POST",
 headers: {
 accept: "application/json",
 "Content-Type": "application/json",
 },
body: JSON.stringify(payload),
 });
 if (!response.ok) {
 const err = await response.json();
 
 // Handle duplicate key errors specifically
 if (err.detail && err.detail.includes("E11000 duplicate key error")) {
   if (err.detail.includes("email")) {
     setError("email", { 
       type: "manual", 
       message: "This email is already registered. Please use a different email address." 
     });
   } else if (err.detail.includes("customer_id")) {
     setError("customer_id", { 
       type: "manual", 
       message: "This Customer ID is already taken. Please use a different ID." 
     });
   }
   return;
 }
 
 throw new Error(err.detail || "Failed to add customer");
 }
 reset();
 if (onSuccess) onSuccess();
 } catch (error: unknown) {
 if (error instanceof Error) {
 if (onError) onError(error.message || "Error adding customer");
 } else {
 if (onError) onError("Error adding customer");
 }
 }
 };

 return (
    <div className="w-full max-w-4xl mx-auto bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden max-h-[90vh] flex flex-col">
      {/* Header Section */}
      <div className="relative bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-4 sm:p-6 lg:p-8 text-white flex-shrink-0">
        <div className="absolute top-0 right-0 w-16 h-16 sm:w-24 sm:h-24 lg:w-32 lg:h-32 bg-white/10 rounded-full -translate-y-8 translate-x-8 sm:-translate-y-12 sm:translate-x-12 lg:-translate-y-16 lg:translate-x-16"></div>
        <div className="absolute bottom-0 left-0 w-12 h-12 sm:w-16 sm:h-16 lg:w-24 lg:h-24 bg-white/5 rounded-full translate-y-6 -translate-x-6 sm:translate-y-8 sm:-translate-x-8 lg:translate-y-12 lg:-translate-x-12"></div>
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-white/20 backdrop-blur-sm rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
              <FaRocket className="text-xl sm:text-2xl lg:text-3xl text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1 sm:mb-2">Add New Customer</h2>
              <p className="text-blue-100 text-sm sm:text-base lg:text-lg">Create a new customer record in the system</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 lg:gap-6 text-xs sm:text-sm">
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-400 rounded-full"></div>
              <span>Real-time validation</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-yellow-400 rounded-full"></div>
              <span>Duplicate checking</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-400 rounded-full"></div>
              <span>Secure submission</span>
            </div>
          </div>
        </div>
      </div>

      {/* Form Section */}
      <div className="p-4 sm:p-6 lg:p-8 overflow-y-auto flex-1">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 sm:space-y-8">
          {/* Personal Information Section */}
          <div className="space-y-4 sm:space-y-6">
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center flex-shrink-0">
                <FaUser className="text-blue-600 dark:text-blue-400 text-sm sm:text-base" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-200">Personal Information</h3>
              <div className="flex-1 h-px bg-gradient-to-r from-blue-200 to-transparent dark:from-blue-800"></div>
            </div>

            {/* Customer ID Field */}
            <div className="relative form-field">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <FaIdBadge className="text-blue-500 text-sm" />
                  <span>Customer ID</span>
                  <span className="text-red-500">*</span>
                  {isCheckingCustomerId && (
                    <div className="flex items-center gap-1 text-xs text-blue-500">
                      <FaSpinner className="animate-spin" />
                      <span>Checking...</span>
                    </div>
                  )}
                </div>
              </label>
              <div className="relative">
                <input
                  id="customer_id"
                  {...register("customer_id")}
                  type="text"
                  className={`w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl border-2 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-opacity-20 ${
                    errors.customer_id
                      ? "border-red-400 bg-red-50 dark:bg-red-900/20 focus:ring-red-400"
                      : "border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 focus:border-blue-500 focus:ring-blue-400"
                  } text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm sm:text-base`}
                  placeholder="Enter unique customer ID"
                  maxLength={20}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  {errors.customer_id ? (
                    <FaTimesCircle className="text-red-500 validation-icon text-sm" />
                  ) : watchedCustomerId && !errors.customer_id ? (
                    <FaCheckCircle className="text-green-500 validation-icon text-sm" />
                  ) : null}
                </div>
              </div>
              {errors.customer_id && (
                <p className="text-xs sm:text-sm text-red-500 flex items-center gap-1 mt-2">
                  <FaTimesCircle className="text-xs" />
                  {errors.customer_id.message}
                </p>
              )}
              <div className="flex items-center gap-1 mt-2 text-xs text-gray-500 dark:text-gray-400">
                <FaInfoCircle className="text-xs" />
                <span>Use letters, numbers, and hyphens only. Leave blank for auto-generation.</span>
              </div>
            </div>

            {/* Full Name Field */}
            <div className="relative form-field">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                <div className="flex items-center gap-2">
                  <FaUser className="text-blue-500 text-sm" />
                  <span>Full Name</span>
                  <span className="text-red-500">*</span>
                </div>
              </label>
              <div className="relative">
                <input
                  id="full_name"
                  {...register("full_name")}
                  type="text"
                  className={`w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl border-2 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-opacity-20 ${
                    errors.full_name
                      ? "border-red-400 bg-red-50 dark:bg-red-900/20 focus:ring-red-400"
                      : "border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 focus:border-blue-500 focus:ring-blue-400"
                  } text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm sm:text-base`}
                  placeholder="Enter customer's full name"
                  maxLength={100}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  {errors.full_name ? (
                    <FaTimesCircle className="text-red-500 validation-icon text-sm" />
                  ) : watchedEmail && !errors.full_name ? (
                    <FaCheckCircle className="text-green-500 validation-icon text-sm" />
                  ) : null}
                </div>
              </div>
              {errors.full_name && (
                <p className="text-xs sm:text-sm text-red-500 flex items-center gap-1 mt-2">
                  <FaTimesCircle className="text-xs" />
                  {errors.full_name.message}
                </p>
              )}
            </div>
          </div>

          {/* Contact Information Section */}
          <div className="space-y-4 sm:space-y-6">
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center flex-shrink-0">
                <FaEnvelope className="text-green-600 dark:text-green-400 text-sm sm:text-base" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-200">Contact Information</h3>
              <div className="flex-1 h-px bg-gradient-to-r from-green-200 to-transparent dark:from-green-800"></div>
            </div>

            {/* Email Field */}
            <div className="relative form-field">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <FaEnvelope className="text-green-500 text-sm" />
                  <span>Email Address</span>
                  <span className="text-red-500">*</span>
                  {isCheckingEmail && (
                    <div className="flex items-center gap-1 text-xs text-blue-500">
                      <FaSpinner className="animate-spin" />
                      <span>Checking...</span>
                    </div>
                  )}
                </div>
              </label>
              <div className="relative">
                <input
                  id="email"
                  {...register("email")}
                  type="email"
                  className={`w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl border-2 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-opacity-20 ${
                    errors.email
                      ? "border-red-400 bg-red-50 dark:bg-red-900/20 focus:ring-red-400"
                      : "border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 focus:border-green-500 focus:ring-green-400"
                  } text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm sm:text-base`}
                  placeholder="Enter customer's email address"
                  maxLength={150}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  {errors.email ? (
                    <FaTimesCircle className="text-red-500 validation-icon text-sm" />
                  ) : watchedEmail && !errors.email ? (
                    <FaCheckCircle className="text-green-500 validation-icon text-sm" />
                  ) : null}
                </div>
              </div>
              {errors.email && (
                <p className="text-xs sm:text-sm text-red-500 flex items-center gap-1 mt-2">
                  <FaTimesCircle className="text-xs" />
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Phone Field */}
            <div className="relative form-field">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                <div className="flex items-center gap-2">
                  <FaPhone className="text-green-500 text-sm" />
                  <span>Phone Number</span>
                  <span className="text-red-500">*</span>
                </div>
              </label>
              <Controller
                name="phone"
                control={control}
                render={({ field }) => (
                  <PhoneInput
                    {...field}
                    country="IN"
                    defaultCountry="IN"
                    value={field.value}
                    onChange={field.onChange}
                    international
                    className={`custom-phone-input-enhanced ${errors.phone ? 'error' : ''}`}
                    placeholder="Enter phone number"
                  />
                )}
              />
              {errors.phone && (
                <p className="text-xs sm:text-sm text-red-500 flex items-center gap-1 mt-2">
                  <FaTimesCircle className="text-xs" />
                  {errors.phone.message}
                </p>
              )}
              <div className="flex items-center gap-1 mt-2 text-xs text-gray-500 dark:text-gray-400">
                <FaInfoCircle className="text-xs" />
                <span>Include country code for international numbers.</span>
              </div>
            </div>
          </div>

          {/* Client Profile (display-only) */}
          <div className="space-y-4 sm:space-y-6">
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center flex-shrink-0">
                <FaInfoCircle className="text-indigo-600 dark:text-indigo-400 text-sm sm:text-base" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-200">Client Profile (optional)</h3>
              <div className="flex-1 h-px bg-gradient-to-r from-indigo-200 to-transparent dark:from-indigo-800"></div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Company</label>
                <input
                  type="text"
                  value={uiMeta.company}
                  onChange={(e) => setUiMeta((m) => ({ ...m, company: e.target.value }))}
                  className="w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-sm sm:text-base"
                  placeholder="Company name"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Industry</label>
                <input
                  type="text"
                  value={uiMeta.industry}
                  onChange={(e) => setUiMeta((m) => ({ ...m, industry: e.target.value }))}
                  className="w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-sm sm:text-base"
                  placeholder="e.g., SaaS, FinTech"
                />
              </div>
              {/* Orders field removed as per requirement; default 0 is sent in payload */}
              {/* Active Projects removed */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">MRR ($)</label>
                <input
                  type="number"
                  min="0"
                  value={uiMeta.mrr}
                  onChange={(e) => setUiMeta((m) => ({ ...m, mrr: e.target.value }))}
                  className="w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-sm sm:text-base"
                  placeholder="Monthly recurring revenue"
                />
              </div>
              {/* Status preview removed; status captured via form below */}
              {/* Account Manager preview removed (captured in backend fields list) */}
              {/* Last Order preview removed; value derived server-side */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Country</label>
                <input
                  type="text"
                  value={uiMeta.country}
                  onChange={(e) => setUiMeta((m) => ({ ...m, country: e.target.value }))}
                  className="w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-sm sm:text-base"
                  placeholder="e.g., India, USA"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Account Manager</label>
                <input
                  type="text"
                  value={uiMeta.accountManager}
                  onChange={(e) => setUiMeta((m) => ({ ...m, accountManager: e.target.value }))}
                  className="w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-sm sm:text-base"
                  placeholder="Account manager name"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 sm:space-y-6">

            {/* Industry and Customer Type Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="relative form-field">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  <div className="flex items-center gap-2">
                    <FaRocket className="text-purple-500 text-sm" />
                    <span>Industry</span>
                  </div>
                </label>
                <input
                  {...register("industry")}
                  type="text"
                  className="w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 focus:border-purple-500 focus:ring-4 focus:ring-purple-400 focus:ring-opacity-20 focus:outline-none transition-all duration-300 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm sm:text-base"
                  placeholder="e.g., Technology, Healthcare"
                  maxLength={100}
                />
                {errors.industry && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                    <FaInfoCircle className="text-xs" />
                    {errors.industry.message}
                  </p>
                )}
              </div>

            </div>

            {/* Status Field */}
            <div className="relative form-field">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                <div className="flex items-center gap-2">
                  <FaRocket className="text-purple-500 text-sm" />
                  <span>Status</span>
                </div>
              </label>
              <select
                {...register("status")}
                className="w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 focus:border-purple-500 focus:ring-4 focus:ring-purple-400 focus:ring-opacity-20 focus:outline-none transition-all duration-300 text-gray-900 dark:text-gray-100 text-sm sm:text-base"
              >
                <option value="">Select status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
                <option value="prospect">Prospect</option>
              </select>
              {errors.status && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                  <FaInfoCircle className="text-xs" />
                  {errors.status.message}
                </p>
              )}
            </div>

          </div>

          {/* Hidden Fields */}
 <input type="hidden" {...register("last_contact")} value={new Date().toISOString()} />

          {/* Submit Button */}
          <div className="pt-4 sm:pt-6">
            <button
              type="submit"
              className="w-full submit-button bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white font-semibold py-3 sm:py-4 px-6 sm:px-8 rounded-lg sm:rounded-xl transition-all duration-300 transform hover:scale-[1.02] focus:outline-none focus:ring-4 focus:ring-blue-400 focus:ring-opacity-50 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-xl text-sm sm:text-base"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center gap-2 sm:gap-3">
                  <FaSpinner className="animate-spin text-lg sm:text-xl" />
                  <span>Creating Customer...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 sm:gap-3">
                  <FaRocket className="text-lg sm:text-xl" />
                  <span>Create Customer</span>
                </div>
              )}
            </button>
          </div>
 </form>
      </div>

      {/* Enhanced CSS Styles */}
 <style jsx global>{`
        .custom-phone-input-enhanced {
          position: relative;
        }
        
        .custom-phone-input-enhanced .PhoneInput {
          display: flex;
          align-items: center;
          width: 100%;
          border-radius: 0.5rem;
          border: 2px solid #e5e7eb;
          background-color: #f9fafb;
          transition: all 0.2s ease-in-out;
          min-height: 2.5rem;
        }
        
        @media (min-width: 640px) {
          .custom-phone-input-enhanced .PhoneInput {
            border-radius: 0.75rem;
            min-height: 3rem;
          }
        }
        
        .custom-phone-input-enhanced .PhoneInput:focus-within {
          border-color: #10b981;
          box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1);
        }
        
        .custom-phone-input-enhanced .PhoneInputCountry {
          display: flex;
          align-items: center;
          padding: 0.5rem 0.75rem;
          border-right: 1px solid #e5e7eb;
          background-color: #f3f4f6;
          border-radius: 0.5rem 0 0 0.5rem;
        }
        
        @media (min-width: 640px) {
          .custom-phone-input-enhanced .PhoneInputCountry {
            padding: 0.75rem 1rem;
            border-radius: 0.75rem 0 0 0.75rem;
          }
        }
        
        .custom-phone-input-enhanced .PhoneInputCountrySelect {
          background: none;
          border: none;
          outline: none;
          font-size: 0.75rem;
          font-weight: 500;
          color: #374151;
          cursor: pointer;
        }
        
        @media (min-width: 640px) {
          .custom-phone-input-enhanced .PhoneInputCountrySelect {
            font-size: 0.875rem;
          }
        }
        
        .custom-phone-input-enhanced .PhoneInputCountryIcon {
          width: 1rem;
          height: 1rem;
          margin-right: 0.375rem;
        }
        
        @media (min-width: 640px) {
          .custom-phone-input-enhanced .PhoneInputCountryIcon {
            width: 1.25rem;
            height: 1.25rem;
            margin-right: 0.5rem;
          }
        }
        
        .custom-phone-input-enhanced .PhoneInputInput {
          flex: 1;
          padding: 0.5rem 0.75rem;
          border: none;
          outline: none;
          background: transparent;
          font-size: 0.875rem;
          color: #111827;
        }
        
        @media (min-width: 640px) {
          .custom-phone-input-enhanced .PhoneInputInput {
            padding: 0.75rem 1rem;
            font-size: 1rem;
          }
        }
        
        .custom-phone-input-enhanced .PhoneInputInput::placeholder {
          color: #9ca3af;
        }
        
        /* Dark mode styles */
        .dark .custom-phone-input-enhanced .PhoneInput {
          border-color: #4b5563;
          background-color: #1f2937;
        }
        
        .dark .custom-phone-input-enhanced .PhoneInput:focus-within {
          border-color: #10b981;
          box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1);
        }
        
        .dark .custom-phone-input-enhanced .PhoneInputCountry {
          border-right-color: #4b5563;
          background-color: #374151;
        }
        
        .dark .custom-phone-input-enhanced .PhoneInputCountrySelect {
          color: #f3f4f6;
        }
        
        .dark .custom-phone-input-enhanced .PhoneInputInput {
          color: #f3f4f6;
        }
        
        .dark .custom-phone-input-enhanced .PhoneInputInput::placeholder {
          color: #6b7280;
        }
        
        /* Error state */
        .custom-phone-input-enhanced.error .PhoneInput {
          border-color: #ef4444;
          background-color: #fef2f2;
        }
        
        .dark .custom-phone-input-enhanced.error .PhoneInput {
          border-color: #dc2626;
          background-color: #1f1f1f;
        }
        
        /* Hover state */
        .custom-phone-input-enhanced .PhoneInput:hover {
          border-color: #d1d5db;
        }
        
        .dark .custom-phone-input-enhanced .PhoneInput:hover {
          border-color: #6b7280;
        }
        
        /* Focus state for country selector */
        .custom-phone-input-enhanced .PhoneInputCountrySelect:focus {
          outline: none;
        }
        
        /* Dropdown styles */
        .PhoneInputCountrySelect {
          appearance: none;
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
          background-position: right 0.5rem center;
          background-repeat: no-repeat;
          background-size: 1.5em 1.5em;
          padding-right: 2.5rem;
        }
        
        /* Animation for validation icons */
        .validation-icon {
          animation: fadeIn 0.2s ease-in-out;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }
        
        /* Form field focus animations */
        .form-field:focus-within {
          transform: translateY(-1px);
        }
        
        /* Button hover effects */
        .submit-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }
        
        /* Section divider animation */
        .section-divider {
          background: linear-gradient(90deg, #e5e7eb 0%, transparent 100%);
        }
        
        .dark .section-divider {
          background: linear-gradient(90deg, #4b5563 0%, transparent 100%);
        }
        
        /* Loading spinner animation */
        .loading-spinner {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        /* Success checkmark animation */
        .success-checkmark {
          animation: checkmark 0.3s ease-in-out;
        }
        
        @keyframes checkmark {
          0% { transform: scale(0); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
  `}</style>
 </div>
 );
 };