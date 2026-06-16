import React, { useState, useCallback } from "react";
import { FaRocket, FaIdBadge, FaUser, FaEnvelope, FaPhone, FaBuilding, FaTimesCircle } from "react-icons/fa";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { parsePhoneNumberFromString } from 'libphonenumber-js';




interface HRDetailsFormProps {
  onSuccess?: () => void;
}




const hrSchema = z.object({
  hr_id: z
    .string()
    .min(1, { message: "HR ID is required" })
    .max(20, { message: "HR ID must be at most 20 characters" })
    .regex(/^[a-zA-Z0-9\-]+$/, { message: "HR ID can contain letters, numbers, and hyphens (-)" }),
  name: z
    .string()
    .min(2, { message: "Name must be at least 2 characters" })
    .max(256, { message: "Name must be at most 256 characters" })
    .regex(/^[A-Za-z\s\-']+$/, { message: "Name can only contain letters, spaces, hyphens, and apostrophes" }),
  email: z
    .string()
    .min(1, { message: "Email is required" })
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
  department: z
    .string()
    .max(20, { message: "Department must be at most 20 characters" })
    .regex(/^[A-Za-z\s]*$/, { message: "Department can only contain letters and spaces" })
    .optional(),
});




export type HRFormValues = z.infer<typeof hrSchema>;




const HRDetailsForm: React.FC<HRDetailsFormProps> = ({ onSuccess }) => {
  const BASE_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || 'https://py-mobiloitte.converiqo.ai').replace(/\/+$/, '');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    control,
    setError,
    clearErrors,
    watch,
  } = useForm<HRFormValues>({
    resolver: zodResolver(hrSchema),
    mode: "onChange",
    defaultValues: {
      hr_id: "",
      name: "",
      email: "",
      phone: "",
      department: "",
    },
  });

  // Watch form values for real-time validation
  const watchedEmail = watch("email");
  const watchedHRId = watch("hr_id");

  // State for duplicate validation
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [isCheckingHRId, setIsCheckingHRId] = useState(false);

  // Function to check if email already exists
  const checkEmailDuplicate = useCallback(async (email: string) => {
    if (!email || !email.includes("@")) return;

    setIsCheckingEmail(true);
    try {
      const response = await fetch(`${BASE_URL}/api/v1/hr/?page=1&size=1000`);
      if (response.ok) {
        const data = await response.json();
        const hrList = Array.isArray(data.data) ? data.data : [];
        const existingHR = hrList.find((hr: { email?: string }) =>
          hr.email && hr.email.toLowerCase() === email.toLowerCase()
        );

        if (existingHR) {
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

  // Function to check if HR ID already exists
  const checkHRIdDuplicate = useCallback(async (hrId: string) => {
    if (!hrId) return;

    setIsCheckingHRId(true);
    try {
      const response = await fetch(`${BASE_URL}/api/v1/hr/?page=1&size=1000`);
      if (response.ok) {
        const data = await response.json();
        const hrList = Array.isArray(data.data) ? data.data : [];
        const existingHR = hrList.find((hr: { hr_id?: string | number }) =>
          hr.hr_id && String(hr.hr_id).toLowerCase() === hrId.toLowerCase()
        );

        if (existingHR) {
          setError("hr_id", {
            type: "manual",
            message: "This HR ID is already taken. Please use a different ID."
          });
        } else {
          clearErrors("hr_id");
        }
      }
    } catch (error) {
      console.error("Error checking HR ID duplicate:", error);
    } finally {
      setIsCheckingHRId(false);
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

  // Debounced validation for HR ID
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (watchedHRId) {
        checkHRIdDuplicate(watchedHRId);
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [watchedHRId, checkHRIdDuplicate]);




  const onSubmit = async (data: HRFormValues) => {
    try {
      const response = await fetch(`${BASE_URL}/api/v1/create-hr/`, {
        method: "POST",
        headers: {
          "accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          hr_id: data.hr_id,
          full_name: data.name,
          email: data.email,
          department: data.department,
          phone: data.phone,
          created_at: new Date().toISOString(),
        }),
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
          } else if (err.detail.includes("hr_id")) {
            setError("hr_id", {
              type: "manual",
              message: "This HR ID is already taken. Please use a different ID."
            });
          }
          return;
        }

        throw new Error(err.detail || "Failed to add HR");
      }
      reset();
      toast.success('HR added successfully!', { position: 'bottom-right' });
      if (onSuccess) onSuccess();
    } catch (error: unknown) {
      if (error instanceof Error) {
        alert(error.message || "Error adding HR");
      } else {
        alert("Error adding HR");
      }
    }
  };




  return (
    <>
      <div className="w-full max-w-lg mx-auto bg-white dark:bg-gray-900 rounded-2xl p-6 flex flex-col items-center transition-colors">
        <div className="flex flex-col items-center mb-6 w-full">
          <div className="flex items-center gap-2 mb-2">
            <FaRocket className="text-2xl text-blue-500" />
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Add HR</h2>
          </div>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-4">
          {/* HR ID */}
          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-200 mb-1 flex items-center gap-1" htmlFor="hr_id">
              <FaIdBadge className="text-blue-400" /> HR ID
              {isCheckingHRId && <span className="text-xs text-blue-500 ml-2">Checking...</span>}
            </label>
            <input
              id="hr_id"
              type="text"
              {...register("hr_id")}
              className={`w-full px-4 py-2 rounded-lg border ${errors.hr_id ? "border-red-500" : "border-gray-300 dark:border-gray-700"} bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 ${errors.hr_id ? "focus:ring-red-500" : "focus:ring-blue-500"} transition`}
              placeholder="HR ID"
            />
            {errors.hr_id && <span className="text-xs text-red-500 flex items-center gap-1 mt-1"><FaTimesCircle /> {errors.hr_id.message}</span>}
          </div>
          {/* Name */}
          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-200 mb-1 flex items-center gap-1" htmlFor="full_name">
              <FaUser className="text-blue-400" /> Name
            </label>
            <input
              id="full_name"
              type="text"
              {...register("name")}
              className={`w-full px-4 py-2 rounded-lg border ${errors.name ? "border-red-500" : "border-gray-300 dark:border-gray-700"} bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 ${errors.name ? "focus:ring-red-500" : "focus:ring-blue-500"} transition`}
              placeholder="Name"
            />
            {errors.name && <span className="text-xs text-red-500 flex items-center gap-1 mt-1"><FaTimesCircle /> {errors.name.message}</span>}
          </div>
          {/* Email */}
          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-200 mb-1 flex items-center gap-1" htmlFor="email">
              <FaEnvelope className="text-blue-400" /> Email
              {isCheckingEmail && <span className="text-xs text-blue-500 ml-2">Checking...</span>}
            </label>
            <input
              id="email"
              type="email"
              {...register("email")}
              className={`w-full px-4 py-2 rounded-lg border ${errors.email ? "border-red-500" : "border-gray-300 dark:border-gray-700"} bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 ${errors.email ? "focus:ring-red-500" : "focus:ring-blue-500"} transition`}
              placeholder="Email"
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
                  className={`custom-phone-input w-full px-4 py-2 rounded-lg border ${errors.phone ? "border-red-500" : "border-gray-300 dark:border-gray-700"} text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 ${errors.phone ? "focus:ring-red-500" : "focus:ring-blue-500"} transition`}
                  placeholder="Phone"
                />
              )}
            />



            {errors.phone && (
              <span className="text-xs text-red-500 flex items-center gap-1 mt-1">
                <FaTimesCircle /> {errors.phone.message}
              </span>
            )}
          </div>




          {/* Department */}
          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-200 mb-1 flex items-center gap-1" htmlFor="department">
              <FaBuilding className="text-blue-400" /> Department
            </label>
            <input
              id="department"
              type="text"
              {...register("department")}
              className={`w-full px-4 py-2 rounded-lg border ${errors.department ? "border-red-500" : "border-gray-300 dark:border-gray-700"} bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 ${errors.department ? "focus:ring-red-500" : "focus:ring-blue-500"} transition`}
              placeholder="Department"
            />
            {errors.department && <span className="text-xs text-red-500 flex items-center gap-1 mt-1"><FaTimesCircle /> {errors.department.message}</span>}
          </div>
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 bg-[#3641F5] text-white py-2 rounded-lg font-semibold hover:opacity-90 transition text-lg disabled:opacity-60"
            disabled={isSubmitting}
          >
            {isSubmitting && <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>}
            Submit
          </button>
        </form>
      </div>
      <ToastContainer position="bottom-right" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
      <style jsx global>{`
        .custom-phone-input input {
          width: 100% !important;
          padding: 0.5rem 1rem !important; /* px-4 py-2 */
          border-radius: 0.5rem !important; /* rounded-lg */
          border: none !important; /* Remove default border */
          background-color: #f3f4f6 !important; /* bg-gray-100 */
          color: #111827 !important; /* default text color */
          font-size: 1rem !important;
          outline: none !important;
          box-shadow: none !important;
          transition: all 0.2s;
        }
        .custom-phone-input input:focus {
          box-shadow: 0 0 0 2px #51A2FF !important; /* focus:ring custom color */
        }
        .dark .custom-phone-input input {
          background-color: #1f2937 !important; /* dark:bg-gray-800 */
          color: #f3f4f6 !important; /* default dark text color */
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
    </>
  );
};

export default HRDetailsForm;

