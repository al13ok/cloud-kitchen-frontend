import React, { useState } from "react";
import { FaRocket, FaIdBadge, FaUser, FaEnvelope, FaPhone, FaChevronDown, FaTimesCircle } from "react-icons/fa";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

 

 

 

interface CustomerDetailsFormProps {
 onSuccess?: () => void;
 onError?: (message: string) => void;
}

 

 

 

// Zod schema for customer details
const customerDetailsSchema = z.object({
 customer_id: z
 .string()
 .nonempty({ message: "Customer ID is required" })
 .max(20, { message: "Customer ID must be at most 20 characters" })
 .regex(/^[a-zA-Z0-9]+$/, { message: "Customer ID must be alphanumeric (no special characters)" }),
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
 .transform(val => val.replace(/\D/g, "")) // keep only digits
 .refine(val => /^\d{10,15}$/.test(val), {
 message: "Phone number must contain only digits (10-15 digits)",
 }),
 department: z.string(), // required string
 tier: z.enum(["trial", "basic", "premium", "enterprise", "pro"], {
 message: "Tier must be one of: trial, basic, premium, enterprise, pro"
 }),
 last_contact: z.string().optional(), // will be set to now by default
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

 

 

 

const CustomerDetailsForm: React.FC<CustomerDetailsFormProps> = ({ onSuccess, onError }) => {
   const RAW_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";
   const BASE_URL = RAW_BASE_URL ? RAW_BASE_URL.replace(/\/+$/,'') : "";
 const {
 register,
 handleSubmit,
 formState: { errors, isSubmitting },
 reset,
 control,
 } = useForm<CustomerDetailsFormType>({
 resolver: zodResolver(customerDetailsSchema),
 mode: "onChange",
 defaultValues: {
 customer_id: "",
 full_name: "",
 email: "",
 phone: "",
 department: "", // required string
 tier: "trial",
 last_contact: new Date().toISOString(),
 },
 });

 

 

 

 // State for dynamic placeholders
 const [placeholders, setPlaceholders] = useState({
 customer_id: "Customer ID",
 full_name: "Full Name",
 email: "Email",
 phone: "Phone",
 tier: "Select Tier",
 });

 

 

 

 // Handler to update placeholder on change
 const handleDynamicPlaceholder = (field: keyof typeof placeholders, value: string) => {
 let newPlaceholder = "";
 switch (field) {
 case "customer_id":
 newPlaceholder = value ? `ID: ${value}` : "Customer ID (leave blank for auto)";
 break;
 case "full_name":
 newPlaceholder = value ? `Name: ${value}` : "Full Name";
 break;
 case "email":
 newPlaceholder = value ? `Email: ${value}` : "Email";
 break;
 case "phone":
 newPlaceholder = value ? `Phone: ${value}` : "Phone";
 break;
 case "tier":
 newPlaceholder = value ? value : "Select Tier";
 break;
 default:
 newPlaceholder = "";
 }
 setPlaceholders((prev) => ({ ...prev, [field]: newPlaceholder }));
 };

 

 

 

 const onSubmit = async (data: CustomerDetailsFormType) => {
 try {
 const now = new Date().toISOString();
 const response = await fetch(`${BASE_URL}/api/v1/create-customer/`, {
 method: "POST",
 headers: {
 accept: "application/json",
 "Content-Type": "application/json",
 },
 body: JSON.stringify({
 ...data,
 created_at: now,
 last_contact: data.last_contact || now,
 }),
 });
 if (!response.ok) {
 const err = await response.json();
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
 <div className="w-full max-w-lg mx-auto bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-6 flex flex-col items-center transition-colors shadow-md sm:shadow-lg md:max-w-xl lg:max-w-2xl xl:max-w-3xl overflow-y-auto max-h-[90vh]">
 <div className="flex flex-col items-center mb-4 sm:mb-6 w-full">
 <div className="flex items-center gap-2 mb-2">
 <FaRocket className="text-xl sm:text-2xl text-blue-500" />
 <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100">Add Customer</h2>
 </div>
 </div>
 <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-3 sm:space-y-4">
 {/* Customer ID */}
 <div>
 <label className="block font-semibold text-gray-700 dark:text-gray-200 mb-1 flex items-center gap-1" htmlFor="customer_id">
 <FaIdBadge className="text-blue-400" /> Customer ID
 </label>
 <input
 id="customer_id"
 {...register("customer_id")}
 type="text"
 className={`w-full px-3 sm:px-4 py-2 rounded-lg border ${errors.customer_id ? "border-red-500" : "border-gray-300 dark:border-gray-700"} bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 ${errors.customer_id ? "focus:ring-red-500" : "focus:ring-blue-500"} transition text-sm sm:text-base`}
 placeholder={placeholders.customer_id}
 maxLength={20}
 />
 {errors.customer_id && <span className="text-xs text-red-500 flex items-center gap-1 mt-1"><FaTimesCircle /> {errors.customer_id.message}</span>}
 </div>
 {/* Full Name */}
 <div>
 <label className="block font-semibold text-gray-700 dark:text-gray-200 mb-1 flex items-center gap-1" htmlFor="full_name">
 <FaUser className="text-blue-400" /> Full Name
 </label>
 <input
 id="full_name"
 {...register("full_name", {
 onChange: (e) => handleDynamicPlaceholder("full_name", e.target.value),
 })}
 type="text"
 className={`w-full px-3 sm:px-4 py-2 rounded-lg border ${errors.full_name ? "border-red-500" : "border-gray-300 dark:border-gray-700"} bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 ${errors.full_name ? "focus:ring-red-500" : "focus:ring-blue-500"} transition text-sm sm:text-base`}
 placeholder={placeholders.full_name}
 maxLength={100}
 />
 {errors.full_name && <span className="text-xs text-red-500 flex items-center gap-1 mt-1"><FaTimesCircle /> {errors.full_name.message}</span>}
 </div>
 {/* Email */}
 <div>
 <label className="block font-semibold text-gray-700 dark:text-gray-200 mb-1 flex items-center gap-1" htmlFor="email">
 <FaEnvelope className="text-blue-400" /> Email
 </label>
 <input
 id="email"
 {...register("email", {
 onChange: (e) => handleDynamicPlaceholder("email", e.target.value),
 })}
 type="email"
 className={`w-full px-3 sm:px-4 py-2 rounded-lg border ${errors.email ? "border-red-500" : "border-gray-300 dark:border-gray-700"} bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 ${errors.email ? "focus:ring-red-500" : "focus:ring-blue-500"} transition text-sm sm:text-base`}
 placeholder={placeholders.email}
 maxLength={150}
 />
 {errors.email && <span className="text-xs text-red-500 flex items-center gap-1 mt-1"><FaTimesCircle /> {errors.email.message}</span>}
 </div>
 {/* Phone */}
 <div>
  <label
    className="block font-semibold text-gray-700 dark:text-gray-200 mb-1 flex items-center gap-1"
    htmlFor="phone"
  >
    <FaPhone className="text-blue-400" /> Phone
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
        className={`custom-phone-input w-full px-3 sm:px-4 py-2 rounded-lg border ${errors.phone ? "border-red-500" : "border-gray-300 dark:border-gray-700"} text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 ${errors.phone ? "focus:ring-red-500" : "focus:ring-blue-500"} transition text-sm sm:text-base`}
        placeholder={placeholders.phone}
      />
    )}
  />

 

  {errors.phone && (
    <span className="text-xs text-red-500 flex items-center gap-1 mt-1">
      <FaTimesCircle /> {errors.phone.message}
    </span>
  )}
</div>
 {/* Tier */}
 <div>
 <label className="block font-semibold text-gray-700 dark:text-gray-200 mb-1 flex items-center gap-1" htmlFor="tier">
 <FaChevronDown className="text-blue-400" /> Tier
 </label>
 <select
 id="tier"
 {...register("tier", {
 onChange: (e) => handleDynamicPlaceholder("tier", e.target.value),
 })}
 className={`w-full px-3 sm:px-4 py-2 rounded-lg border ${errors.tier ? "border-red-500" : "border-gray-300 dark:border-gray-700"} bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 ${errors.tier ? "focus:ring-red-500" : "focus:ring-blue-500"} transition text-sm sm:text-base`}
 >
 <option value="trial">trial</option>
 <option value="premium">premium</option>
 <option value="enterprise">enterprise</option>
 <option value="pro">pro</option>
 </select>
 {errors.tier && <span className="text-xs text-red-500 flex items-center gap-1 mt-1"><FaTimesCircle /> {errors.tier.message}</span>}
 </div>
 {/* Last Contact (hidden) */}
 <input type="hidden" {...register("last_contact")} value={new Date().toISOString()} />
 {/* Department (hidden) */}
 <input type="hidden" {...register("department")} value="" />
 <button
 type="submit"
 className="w-full flex items-center justify-center gap-2 bg-[#465FFF] text-white py-2 rounded-lg font-semibold hover:opacity-90 transition text-base sm:text-lg disabled:opacity-60"
 disabled={isSubmitting}
 >
 {isSubmitting && <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>}
 Submit
 </button>
 </form>
 <style jsx global>{`
    .custom-phone-input input {
      width: 100% !important;
      padding: 0.5rem 0.75rem !important;
      border-radius: 0.5rem !important;
      border: none !important;
      background-color: #f3f4f6 !important;
      color: #111827 !important;
      font-size: 1rem !important;
      outline: none !important;
      box-shadow: none !important;
      transition: all 0.2s;
    }
    @media (max-width: 640px) {
      .custom-phone-input input {
        font-size: 0.95rem !important;
        padding: 0.5rem 0.5rem !important;
      }
    }
    .custom-phone-input input:focus {
      box-shadow: 0 0 0 2px #51A2FF !important;
    }
    .dark .custom-phone-input input {
      background-color: #1f2937 !important;
      color: #f3f4f6 !important;
    }
    .custom-phone-input input::placeholder {
      color: #ADB1B7 !important;
    }
    .dark .custom-phone-input input::placeholder {
      color: #878E97 !important;
    }
    input::placeholder {
      color: #ADB1B7 !important;
    }
    .dark input::placeholder {
      color: #878E97 !important;
    }
  `}</style>
  <style jsx global>{`
    .dark .PhoneInputCountry,
    .dark .PhoneInputCountrySelect,
    .dark .PhoneInputCountrySelect:focus,
    .dark .PhoneInputCountrySelect:active {
      background-color: #101828 !important;
      color: #f3f4f6 !important;
      border-color: #374151 !important;
    }
    .dark .PhoneInputCountrySelect option {
      background-color: #101828 !important;
      color: #f3f4f6 !important;
    }
    .dark .PhoneInputCountryIcon,
    .dark .PhoneInputCountryIcon--border {
      background-color: transparent !important;
    }
  `}</style>
 </div>
 );
};

 

 

 

export default CustomerDetailsForm;