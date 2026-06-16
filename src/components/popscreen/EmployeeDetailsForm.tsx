import React from "react";
import { FaRocket, FaIdBadge, FaUser, FaEnvelope, FaPhone, FaBuilding, FaTimesCircle } from "react-icons/fa";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

 

 

 

interface EmployeeDetailsFormProps {
  onSuccess?: () => void;
}

 

 

 

const employeeSchema = z.object({
  employee_id: z
    .string()
    .nonempty({ message: "Employee ID is required" })
    .max(20, { message: "Employee ID must be at most 20 characters" })
    .regex(/^[a-zA-Z0-9]+$/, { message: "Employee ID must be alphanumeric (no special characters)" }),
  name: z
    .string()
    .nonempty({ message: "Name is required" })
    .min(2, { message: "Name must be at least 2 characters" })
    .max(256, { message: "Name must be at most 256 characters" })
    .regex(/^[A-Za-z\s\-']+$/, { message: "Name can only contain letters, spaces, hyphens, and apostrophes" }),
  email: z
    .string()
    .nonempty({ message: "Email is required" })
    .email({ message: "Invalid email address" })
    .max(256, { message: "Email must be at most 256 characters" }),
  phone: z
    .string()
    .transform(val => val.replace(/\D/g, "")) // keep only digits
    .refine(val => /^\d{10,15}$/.test(val), {
      message: "Phone number must contain only digits (10-15 digits)",
    }),
  department: z
    .string()
    .max(20, { message: "Department must be at most 20 characters" })
    .regex(/^[A-Za-z\s]*$/, { message: "Department can only contain letters and spaces" })
    .optional(),
});

 

 

 

export type EmployeeFormValues = z.infer<typeof employeeSchema>;

 

 

 

const EmployeeDetailsForm: React.FC<EmployeeDetailsFormProps> = ({ onSuccess }) => {
  const RAW_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";
  const BASE_URL = RAW_BASE_URL ? RAW_BASE_URL.replace(/\/+$/,'') : "";
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    control,
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    mode: "onChange",
    defaultValues: {
      employee_id: "",
      name: "",
      email: "",
      phone: "",
      department: "",
    },
  });

 

 

 

  const onSubmit = async (data: EmployeeFormValues) => {
    try {
      const response = await fetch(`${BASE_URL}/api/v1/create-employee`, {
        method: "POST",
        headers: {
          "accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          emp_id: data.employee_id,
          full_name: data.name,
          email: data.email,
          department: data.department,
          phone: data.phone,
          created_at: new Date().toISOString(),
        }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Failed to add employee");
      }
      reset();
      toast.success('Employee added successfully!', { position: 'bottom-right' });
      if (onSuccess) onSuccess();
    } catch (error: unknown) {
      if (error instanceof Error) {
        alert(error.message || "Error adding employee");
      } else {
        alert("Error adding employee");
      }
    }
  };

 

 

 

  return (
    <>
   {/*       <div className="w-full max-w-lg mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 flex flex-col items-center transition-colors">
 */}
      <div className="w-full max-w-lg mx-auto bg-white dark:bg-gray-900 rounded-2xl p-6 flex flex-col items-center transition-colors">
        <div className="flex flex-col items-center mb-6 w-full">
          <div className="flex items-center gap-2 mb-2">
            <FaRocket className="text-2xl text-blue-500" />
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Add Employee</h2>
          </div>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-4">
          {/* Employee ID */}
          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-200 mb-1 flex items-center gap-1" htmlFor="emp_id">
              <FaIdBadge className="text-blue-400" /> Employee ID
            </label>
            <input
              id="emp_id"
              type="text"
              {...register("employee_id")}
              className={`w-full px-4 py-2 rounded-lg border ${errors.employee_id ? "border-red-500" : "border-gray-300 dark:border-gray-700"} bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 ${errors.employee_id ? "focus:ring-red-500" : "focus:ring-blue-500"} transition`}
              placeholder="Employee ID"
            />
            {errors.employee_id && <span className="text-xs text-red-500 flex items-center gap-1 mt-1"><FaTimesCircle /> {errors.employee_id.message}</span>}
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

export default EmployeeDetailsForm; 