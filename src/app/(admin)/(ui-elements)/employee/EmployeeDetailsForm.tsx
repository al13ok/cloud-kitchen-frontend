import React, { useState, useCallback, useRef, useEffect } from "react";
import { 
  FaRocket, 
  FaIdBadge, 
  FaUser, 
  FaEnvelope, 
  FaPhone, 
  FaBuilding, 
  FaTimesCircle, 
  FaCheckCircle, 
  FaExclamationTriangle,
  FaInfoCircle,
  FaSpinner,
  FaPlus,
  FaTrash,
  FaChevronDown
} from "react-icons/fa";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { Modal } from "@/components/ui/modal";
import Alert from '@/components/ui/alert/Alert';

 

 

 

interface EmployeeDetailsFormProps {
  onSuccess?: () => void;
}

 

 

 

const employeeSchema = z.object({
  employee_id: z
    .string()
    .nonempty({ message: "Employee ID is required" })
    .max(10, { message: "Employee ID must be at most 10 characters" })
    .regex(/^[a-zA-Z0-9\-]+$/, { message: "Employee ID can contain letters, numbers, and hyphens (-)" }),
  name: z
    .string()
    .nonempty({ message: "Name is required" })
    .min(2, { message: "Name must be at least 2 characters" })
    .max(256, { message: "Name must be at most 256 characters" })
    .regex(/^[A-Za-z\s\-'.,]+$/, { message: "Name can only contain letters, spaces, hyphens, apostrophes, periods, and commas" }),
  email: z
    .string()
    .nonempty({ message: "Email is required" })
    .email({ message: "Invalid email address" })
    .max(256, { message: "Email must be at most 256 characters" }),
  phone: z
    .string()
    .optional()
    .refine((val) => {
      // If no value provided, it's valid (optional field)
      if (!val || val.trim() === "") return true;
      const parsed = parsePhoneNumberFromString(val);
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

 

 

 

export type EmployeeFormValues = z.infer<typeof employeeSchema>;

 

 

 

const EmployeeDetailsForm: React.FC<EmployeeDetailsFormProps> = ({ onSuccess }) => {
  const RAW_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';
  const BASE_URL = RAW_BASE_URL ? RAW_BASE_URL.replace(/\/+$/,'') : "";
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    control,
    setError,
    clearErrors,
    watch,
    setValue,
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

  // Watch form values for real-time validation
  const watchedEmail = watch("email");
  const watchedEmployeeId = watch("employee_id");
  const watchedName = watch("name");
  const watchedPhone = watch("phone");
  const watchedDepartment = watch("department");

  // State for duplicate validation
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [isCheckingEmployeeId, setIsCheckingEmployeeId] = useState(false);
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);
  
  // State for character limit tracking
  const [isEmployeeIdLimitReached, setIsEmployeeIdLimitReached] = useState(false);
  const [isNameLimitReached, setIsNameLimitReached] = useState(false);

  // State for department modals
  const [showAddDeptModal, setShowAddDeptModal] = useState(false);
  const [showDeleteDeptModal, setShowDeleteDeptModal] = useState(false);
  const [deptInputValue, setDeptInputValue] = useState("");
  const [isAddingDept, setIsAddingDept] = useState(false);
  const [isDeletingDept, setIsDeletingDept] = useState(false);
  const [departments, setDepartments] = useState<Array<{ department_name: string; id: string; employee_count: number }>>([]);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false);
  const [deptAlert, setDeptAlert] = useState<{ show: boolean; variant: 'success' | 'error'; title: string; message: string }>({ show: false, variant: 'success', title: '', message: '' });
  
  // State for delete department dropdown
  const [isDeleteDeptDropdownOpen, setIsDeleteDeptDropdownOpen] = useState(false);
  const deleteDeptDropdownRef = useRef<HTMLDivElement>(null);

  // Function to fetch departments from API
  const fetchDepartments = useCallback(async () => {
    setIsLoadingDepartments(true);
    try {
      const response = await fetch(`${BASE_URL}/api/v1/departments/?page=1&size=1000`, {
        method: "GET",
        headers: {
          "accept": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDepartments(Array.isArray(data.data) ? data.data : []);
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
    } finally {
      setIsLoadingDepartments(false);
    }
  }, [BASE_URL]);

  // Fetch departments on component mount
  React.useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  // Fetch departments when delete modal opens
  useEffect(() => {
    if (showDeleteDeptModal) {
      fetchDepartments();
      setIsDeleteDeptDropdownOpen(false);
    }
  }, [showDeleteDeptModal, fetchDepartments]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (deleteDeptDropdownRef.current && !deleteDeptDropdownRef.current.contains(event.target as Node)) {
        setIsDeleteDeptDropdownOpen(false);
      }
    };

    if (isDeleteDeptDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDeleteDeptDropdownOpen]);

  // Function to check if email already exists
  const checkEmailDuplicate = useCallback(async (email: string) => {
    if (!email || !email.includes("@")) return;
    
    setIsCheckingEmail(true);
    try {
      const response = await fetch(`${BASE_URL}/api/v1/employees/?page=1&size=1000`);
      if (response.ok) {
        const data = await response.json();
        const employees = Array.isArray(data.data) ? data.data : [];
        const existingEmployee = employees.find((employee: { email?: string }) => 
          employee.email && employee.email.toLowerCase() === email.toLowerCase()
        );
        
        if (existingEmployee) {
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

  // Function to check if employee ID already exists
  const checkEmployeeIdDuplicate = useCallback(async (employeeId: string) => {
    if (!employeeId) return;
    
    setIsCheckingEmployeeId(true);
    try {
      const response = await fetch(`${BASE_URL}/api/v1/employees/?page=1&size=1000`);
      if (response.ok) {
        const data = await response.json();
        const employees = Array.isArray(data.data) ? data.data : [];
        const existingEmployee = employees.find((employee: { emp_id?: string | number }) => 
          employee.emp_id && String(employee.emp_id).toLowerCase() === employeeId.toLowerCase()
        );
        
        if (existingEmployee) {
          setError("employee_id", { 
            type: "manual", 
            message: "This Employee ID is already taken. Please use a different ID." 
          });
        } else {
          clearErrors("employee_id");
        }
      }
    } catch (error) {
      console.error("Error checking employee ID duplicate:", error);
    } finally {
      setIsCheckingEmployeeId(false);
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

  // Debounced validation for employee ID
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (watchedEmployeeId) {
        checkEmployeeIdDuplicate(watchedEmployeeId);
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [watchedEmployeeId, checkEmployeeIdDuplicate]);

  // Phone duplicate check by last 10 digits (ignore country code and formatting)
  const checkPhoneDuplicate = useCallback(async (phoneVal: string) => {
    if (!phoneVal) return;
    setIsCheckingPhone(true);
    try {
      const response = await fetch(`${BASE_URL}/api/v1/employees/?page=1&size=1000`);
      if (response.ok) {
        const data = await response.json();
        const employees = Array.isArray(data.data) ? data.data : [];
        const digits = String(phoneVal).replace(/\D/g, '');
        const last10 = digits.slice(-10);
        const exists = employees.some((emp: { phone?: string }) => {
          const empDigits = String(emp.phone || '').replace(/\D/g, '');
          const empLast10 = empDigits.slice(-10);
          return last10 && empLast10 === last10;
        });
        if (exists) {
          setError('phone', { type: 'manual', message: 'Phone number already exist in employee' });
        } else {
          clearErrors('phone');
        }
      }
    } catch (e) {
      console.error('Error checking phone duplicate', e);
    } finally {
      setIsCheckingPhone(false);
    }
  }, [BASE_URL, setError, clearErrors]);

  // Debounced phone validation
  React.useEffect(() => {
    const t = setTimeout(() => {
      if (watchedPhone) checkPhoneDuplicate(watchedPhone);
    }, 500);
    return () => clearTimeout(t);
  }, [watchedPhone, checkPhoneDuplicate]);

  // Handler for Employee ID input - restrict to letters, numbers, hyphens, max 10 chars
  const handleEmployeeIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only letters, numbers, and hyphens
    const filteredValue = value.replace(/[^a-zA-Z0-9\-]/g, '');
    // Limit to 10 characters
    const limitedValue = filteredValue.slice(0, 10);
    
    // Update limit reached state
    setIsEmployeeIdLimitReached(limitedValue.length >= 10);
    
    // Update form value
    setValue("employee_id", limitedValue, { shouldValidate: true });
  };

  // Handler for Full Name input - allow letters, spaces, basic punctuation, max 256 chars
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow letters, spaces, hyphens, apostrophes, periods, commas (basic punctuation)
    const filteredValue = value.replace(/[^a-zA-Z\s\-'.,]/g, '');
    // Limit to 256 characters
    const limitedValue = filteredValue.slice(0, 256);
    
    // Update limit reached state
    setIsNameLimitReached(limitedValue.length >= 256);
    
    // Update form value
    setValue("name", limitedValue, { shouldValidate: true });
  };

  // Reset limit states when form is reset
  React.useEffect(() => {
    if (!watchedEmployeeId) {
      setIsEmployeeIdLimitReached(false);
    }
    if (!watchedName) {
      setIsNameLimitReached(false);
    }
  }, [watchedEmployeeId, watchedName]);

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
          department: data.department || "",
          phone: data.phone || "",
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
          } else if (err.detail.includes("emp_id")) {
            setError("employee_id", { 
              type: "manual", 
              message: "This Employee ID is already taken. Please use a different ID." 
            });
          }
          return;
        }
        
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

  // Handle Add Department
  const handleAddDepartment = async () => {
    if (!deptInputValue.trim()) {
      setDeptAlert({ show: true, variant: 'error', title: 'Validation Error', message: 'Please enter a department name' });
      setTimeout(() => setDeptAlert(a => ({ ...a, show: false })), 3000);
      return;
    }
    // Validate department name (letters and spaces only, max 20 chars)
    if (!/^[A-Za-z\s]*$/.test(deptInputValue.trim())) {
      setDeptAlert({ show: true, variant: 'error', title: 'Validation Error', message: 'Department can only contain letters and spaces' });
      setTimeout(() => setDeptAlert(a => ({ ...a, show: false })), 3000);
      return;
    }
    if (deptInputValue.trim().length > 20) {
      setDeptAlert({ show: true, variant: 'error', title: 'Validation Error', message: 'Department name must be at most 20 characters' });
      setTimeout(() => setDeptAlert(a => ({ ...a, show: false })), 3000);
      return;
    }
    
    setIsAddingDept(true);
    try {
      const response = await fetch(`${BASE_URL}/api/v1/departments/`, {
        method: "POST",
        headers: {
          "accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          department_name: deptInputValue.trim(),
          description: "",
          created_at: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || err.message || "Failed to add department");
      }

      // Refresh departments list and set the department value in the form after successful API call
      await fetchDepartments();
      setValue("department", deptInputValue.trim(), { shouldValidate: true });
      setDeptAlert({ show: true, variant: 'success', title: 'Department Added', message: `Department "${deptInputValue.trim()}" added successfully` });
      setTimeout(() => setDeptAlert(a => ({ ...a, show: false })), 3000);
      setDeptInputValue("");
      setShowAddDeptModal(false);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to add department";
      setDeptAlert({ show: true, variant: 'error', title: 'Add Department Failed', message: errorMessage });
      setTimeout(() => setDeptAlert(a => ({ ...a, show: false })), 3000);
    } finally {
      setIsAddingDept(false);
    }
  };

  // Handle Delete Department
  const handleDeleteDepartment = async () => {
    if (!deptInputValue.trim()) {
      setDeptAlert({ show: true, variant: 'error', title: 'Validation Error', message: 'Please select a department to delete' });
      setTimeout(() => setDeptAlert(a => ({ ...a, show: false })), 3000);
      return;
    }

    setIsDeletingDept(true);
    try {
      // URL encode the department name to handle special characters
      const encodedDeptName = encodeURIComponent(deptInputValue.trim().toLowerCase());
      const response = await fetch(`${BASE_URL}/api/v1/departments/${encodedDeptName}/`, {
        method: "DELETE",
        headers: {
          "accept": "application/json",
        },
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || err.detail || "Failed to delete department");
      }

      const result = await response.json();
      
      // Refresh departments list
      await fetchDepartments();
      
      // If the current department matches, clear it from the form
      if (watchedDepartment?.toLowerCase() === deptInputValue.trim().toLowerCase()) {
        setValue("department", "", { shouldValidate: true });
      }

      setDeptAlert({ show: true, variant: 'success', title: 'Department Deleted', message: result.message || `Department "${deptInputValue.trim()}" deleted successfully` });
      setTimeout(() => setDeptAlert(a => ({ ...a, show: false })), 3000);
      setDeptInputValue("");
      setIsDeleteDeptDropdownOpen(false);
      setShowDeleteDeptModal(false);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete department";
      setDeptAlert({ show: true, variant: 'error', title: 'Delete Department Failed', message: errorMessage });
      setTimeout(() => setDeptAlert(a => ({ ...a, show: false })), 3000);
    } finally {
      setIsDeletingDept(false);
    }
  };

  // Handle department selection from dropdown
  const handleSelectDepartmentForDelete = (departmentName: string) => {
    setDeptInputValue(departmentName);
    setIsDeleteDeptDropdownOpen(false);
  };

 

 

 

  return (
    <>
      <div className="w-full max-w-[840px] mx-auto bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header Section */}
        <div className="relative bg-blue-600 p-6 text-white flex-shrink-0">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <FaRocket className="text-2xl text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-1">Add New Employee</h2>
                <p className="text-blue-100 text-base">Create a new employee record in the system</p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span>Real-time validation</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Duplicate checking</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span>Secure submission</span>
              </div>
            </div>
          </div>
        </div>

        {/* Form Section */}
        <div className="p-6 flex-1 overflow-y-auto scrollbar-hide">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Personal Information Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <FaUser className="text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Personal Information</h3>
                <div className="flex-1 h-px bg-gradient-to-r from-gray-200 to-transparent dark:from-gray-700 section-divider"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Employee ID */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2" htmlFor="emp_id">
                    <div className="flex items-center gap-2">
                      <FaIdBadge className="text-blue-500" />
                      Employee ID
                      <span className="text-red-500">*</span>
                      {isCheckingEmployeeId && (
                        <div className="flex items-center gap-1 text-xs text-blue-500">
                          <FaSpinner className="animate-spin" />
                          <span>Checking...</span>
                        </div>
                      )}
                    </div>
            </label>
                  <div className="relative form-field">
            <input
              id="emp_id"
              type="text"
              {...register("employee_id")}
              onChange={handleEmployeeIdChange}
              maxLength={10}
                      className={`w-full px-4 pr-10 py-3 rounded-xl border-2 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-500/20 ${
                        errors.employee_id 
                          ? "border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-600" 
                          : isEmployeeIdLimitReached
                          ? "border-amber-400 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-500"
                          : "border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-500"
                      } text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400`}
                      placeholder="Enter unique employee ID"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                      {errors.employee_id ? (
                        <FaTimesCircle className="text-red-500 validation-icon transition-all duration-200" />
                      ) : watchedEmployeeId && !errors.employee_id ? (
                        <FaCheckCircle className="text-green-500 validation-icon success-checkmark transition-all duration-200" />
                      ) : null}
                    </div>
                  </div>
                  <div className="min-h-[20px] transition-all duration-200">
                    {errors.employee_id && (
                      <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                        <FaExclamationTriangle className="text-xs" />
                        <span>{errors.employee_id.message}</span>
                      </div>
                    )}
                  </div>
                  <div className={`text-xs mt-1 transition-colors duration-200 ${isEmployeeIdLimitReached ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                    <FaInfoCircle className="inline mr-1" />
                    Use letters, numbers, and hyphens only ({watchedEmployeeId?.length || 0}/10 characters)
                    {isEmployeeIdLimitReached && <span className="ml-1">• Maximum limit reached</span>}
                  </div>
          </div>

          {/* Name */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2" htmlFor="full_name">
                    <div className="flex items-center gap-2">
                      <FaUser className="text-blue-500" />
                      Full Name
                      <span className="text-red-500">*</span>
                    </div>
            </label>
                  <div className="relative form-field">
            <input
              id="full_name"
              type="text"
              {...register("name")}
              onChange={handleNameChange}
              maxLength={256}
                      className={`w-full px-4 pr-10 py-3 rounded-xl border-2 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-500/20 ${
                        errors.name 
                          ? "border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-600" 
                          : isNameLimitReached
                          ? "border-amber-400 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-500"
                          : "border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-500"
                      } text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400`}
                      placeholder="Enter full name"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                      {errors.name ? (
                        <FaTimesCircle className="text-red-500 validation-icon transition-all duration-200" />
                      ) : watchedName && !errors.name ? (
                        <FaCheckCircle className="text-green-500 validation-icon success-checkmark transition-all duration-200" />
                      ) : null}
                    </div>
                  </div>
                  <div className="min-h-[20px] transition-all duration-200">
                    {errors.name && (
                      <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                        <FaExclamationTriangle className="text-xs" />
                        <span>{errors.name.message}</span>
                      </div>
                    )}
                  </div>
                  <div className={`text-xs mt-1 transition-colors duration-200 ${isNameLimitReached ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                    <FaInfoCircle className="inline mr-1" />
                    Letters, spaces, and basic punctuation only ({watchedName?.length || 0}/256 characters)
                    {isNameLimitReached && <span className="ml-1">• Maximum limit reached</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Information Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <FaEnvelope className="text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Contact Information</h3>
                <div className="flex-1 h-px bg-gradient-to-r from-gray-200 to-transparent dark:from-gray-700 section-divider"></div>
          </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Email */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2" htmlFor="email">
                    <div className="flex items-center gap-2">
                      <FaEnvelope className="text-blue-500" />
                      Email Address
                      <span className="text-red-500">*</span>
                      {isCheckingEmail && (
                        <div className="flex items-center gap-1 text-xs text-blue-500">
                          <FaSpinner className="animate-spin" />
                          <span>Checking...</span>
                        </div>
                      )}
                    </div>
            </label>
                  <div className="relative form-field">
            <input
              id="email"
              type="email"
              {...register("email")}
                      className={`w-full px-4 pr-10 py-3 rounded-xl border-2 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-500/20 ${
                        errors.email 
                          ? "border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-600" 
                          : "border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-500"
                      } text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400`}
                      placeholder="Enter email address"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                      {errors.email ? (
                        <FaTimesCircle className="text-red-500 validation-icon transition-all duration-200" />
                      ) : watchedEmail && !errors.email ? (
                        <FaCheckCircle className="text-green-500 validation-icon success-checkmark transition-all duration-200" />
                      ) : null}
                    </div>
                  </div>
                  <div className="min-h-[20px] transition-all duration-200">
                    {errors.email && (
                      <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                        <FaExclamationTriangle className="text-xs" />
                        <span>{errors.email.message}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <FaInfoCircle className="inline mr-1" />
                    We&apos;ll verify this email is unique in our system
                  </div>
          </div>

          {/* Phone */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2" htmlFor="phone">
                    <div className="flex items-center gap-2">
                      <FaPhone className="text-blue-500" />
                      Phone Number
                      {isCheckingPhone && (
                        <div className="flex items-center gap-1 text-xs text-blue-500">
                          <FaSpinner className="animate-spin" />
                          <span>Checking...</span>
                        </div>
                      )}
                    </div>
  </label>
                  <div className="relative form-field">
  <Controller
    name="phone"
    control={control}
    render={({ field }) => (
      <div className="relative">
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
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none z-10">
          {errors.phone ? (
            <FaTimesCircle className="text-red-500 validation-icon transition-all duration-200" />
          ) : watchedPhone && !errors.phone ? (
            <FaCheckCircle className="text-green-500 validation-icon success-checkmark transition-all duration-200" />
          ) : null}
        </div>
      </div>
    )}
  />
                  </div>
                  <div className="min-h-[20px] transition-all duration-200">
                    {errors.phone && (
                      <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                        <FaExclamationTriangle className="text-xs" />
                        <span>{errors.phone.message}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <FaInfoCircle className="inline mr-1" />
                    Include country code for international numbers
                  </div>
                </div>
              </div>
</div>

            {/* Department Information Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <FaBuilding className="text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Department Information</h3>
                <div className="flex-1 h-px bg-gradient-to-r from-gray-200 to-transparent dark:from-gray-700 section-divider"></div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2" htmlFor="department">
                  <div className="flex items-center gap-2">
                    <FaBuilding className="text-blue-500" />
                    Department
                    <span className="text-gray-400 text-xs">(Optional)</span>
                  </div>
            </label>
                <div className="relative form-field">
                  {isLoadingDepartments ? (
                    <div className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                      <FaSpinner className="animate-spin text-blue-500" />
                      <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">Loading departments...</span>
                    </div>
                  ) : (
                    <>
                      <select
                        id="department"
                        {...register("department")}
                        className={`w-full px-4 pr-10 py-3 rounded-xl border-2 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-500/20 appearance-none bg-no-repeat bg-right ${
                          errors.department 
                            ? "border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-600" 
                            : "border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-500"
                        } text-gray-900 dark:text-white`}
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                          backgroundPosition: 'right 0.75rem center',
                          backgroundSize: '1.5em 1.5em',
                          paddingRight: '2.5rem'
                        }}
                      >
                        <option value="">Select a Department</option>
                        {departments.map((dept) => (
                          <option key={dept.id} value={dept.department_name}>
                            {dept.department_name} {dept.employee_count > 0 && `(${dept.employee_count} ${dept.employee_count === 1 ? 'employee' : 'employees'})`}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                        {errors.department ? (
                          <FaTimesCircle className="text-red-500 validation-icon transition-all duration-200" />
                        ) : watchedDepartment && !errors.department ? (
                          <FaCheckCircle className="text-green-500 validation-icon success-checkmark transition-all duration-200" />
                        ) : null}
                      </div>
                    </>
                  )}
                </div>
                <div className="min-h-[20px] transition-all duration-200">
                  {errors.department && (
                    <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                      <FaExclamationTriangle className="text-xs" />
                      <span>{errors.department.message}</span>
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <FaInfoCircle className="inline mr-1" />
                  Select a department from the list or add a new one
                </div>
                {/* Department Management Buttons */}
                <div className="flex items-center gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => setShowAddDeptModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-all duration-200 border border-blue-200 dark:border-blue-700"
                  >
                    <FaPlus className="w-3 h-3" />
                    Add Department
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteDeptModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-all duration-200 border border-red-200 dark:border-red-700"
                  >
                    <FaTrash className="w-3 h-3" />
                    Delete Department
                  </button>
                </div>
              </div>
          </div>

            {/* Submit Button */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <button
            type="submit"
                className="w-full group relative overflow-hidden bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 hover:from-blue-700 hover:via-blue-800 hover:to-blue-900 text-white py-4 px-8 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none submit-button"
            disabled={isSubmitting}
          >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative z-10 flex items-center justify-center gap-3">
                  {isSubmitting ? (
                    <>
                      <FaSpinner className="animate-spin text-xl" />
                      <span>Creating Employee...</span>
                    </>
                  ) : (
                    <>
                      <FaRocket className="text-xl group-hover:scale-110 transition-transform duration-200" />
                      <span>Create Employee</span>
                    </>
                  )}
                </div>
          </button>
              <div className="text-center mt-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  By creating an employee, you agree to our data processing policies
                </p>
              </div>
            </div>
        </form>
        </div>
      </div>

      {/* Add Department Modal */}
      <Modal isOpen={showAddDeptModal} onClose={() => { setShowAddDeptModal(false); setDeptInputValue(""); }}>
        <div className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-[840px] w-full">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="relative z-10 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <FaPlus className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Add Department</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Enter a new department name</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Department Name
                </label>
                <input
                  type="text"
                  value={deptInputValue}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^A-Za-z\s]/g, '').slice(0, 20);
                    setDeptInputValue(value);
                  }}
                  placeholder="Enter department name"
                  disabled={isAddingDept}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  autoFocus
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Letters and spaces only (max 20 characters) - {deptInputValue.length}/20
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowAddDeptModal(false); setDeptInputValue(""); }}
                  disabled={isAddingDept}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddDepartment}
                  disabled={isAddingDept}
                  className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isAddingDept ? (
                    <>
                      <FaSpinner className="animate-spin" />
                      <span>Adding...</span>
                    </>
                  ) : (
                    <span>Add Department</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Department Modal */}
      <Modal isOpen={showDeleteDeptModal} onClose={() => { 
        setShowDeleteDeptModal(false); 
        setDeptInputValue(""); 
        setIsDeleteDeptDropdownOpen(false);
      }}>
        <div className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-[840px] w-full">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-500/10 to-orange-500/10 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="relative z-10 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl flex items-center justify-center">
                <FaTrash className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Delete Department</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Remove department from form</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Department Name
                </label>
                <div ref={deleteDeptDropdownRef} className="relative">
                  <div className="relative">
                    <input
                      type="text"
                      value={deptInputValue}
                      readOnly
                      onClick={() => setIsDeleteDeptDropdownOpen(!isDeleteDeptDropdownOpen)}
                      onFocus={() => setIsDeleteDeptDropdownOpen(true)}
                      placeholder="Select department to delete"
                      disabled={isDeletingDept}
                      className="w-full px-4 py-3 pr-10 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      autoFocus
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                      <FaChevronDown className={`text-gray-400 transition-transform duration-200 ${isDeleteDeptDropdownOpen ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                  
                  {/* Dropdown */}
                  {isDeleteDeptDropdownOpen && (
                    <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-xl shadow-2xl max-h-60 overflow-hidden">
                      {/* Dropdown list */}
                      <div className="overflow-y-auto max-h-60">
                        {isLoadingDepartments ? (
                          <div className="p-4 text-center">
                            <FaSpinner className="animate-spin text-red-500 mx-auto mb-2" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">Loading departments...</p>
                          </div>
                        ) : departments.length === 0 ? (
                          <div className="p-4 text-center">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              No departments available
                            </p>
                          </div>
                        ) : (
                          departments.map((dept) => (
                            <button
                              key={dept.id}
                              type="button"
                              onClick={() => handleSelectDepartmentForDelete(dept.department_name)}
                              className={`w-full px-4 py-3 text-left hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-150 ${
                                deptInputValue === dept.department_name
                                  ? 'bg-red-100 dark:bg-red-900/30 border-l-4 border-red-500'
                                  : 'border-l-4 border-transparent'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  {dept.department_name}
                                </span>
                                {dept.employee_count > 0 && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {dept.employee_count} {dept.employee_count === 1 ? 'employee' : 'employees'}
                                  </span>
                                )}
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {watchedDepartment && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Current department: <span className="font-medium">{watchedDepartment}</span>
                  </p>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { 
                    setShowDeleteDeptModal(false); 
                    setDeptInputValue(""); 
                    setIsDeleteDeptDropdownOpen(false);
                  }}
                  disabled={isDeletingDept}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteDepartment}
                  disabled={isDeletingDept || !deptInputValue.trim()}
                  className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isDeletingDept ? (
                    <>
                      <FaSpinner className="animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <span>Delete Department</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {deptAlert.show && (
        <Alert
          variant={deptAlert.variant}
          title={deptAlert.title}
          message={deptAlert.message}
          showCloseButton={true}
          onClose={() => setDeptAlert({ ...deptAlert, show: false })}
        />
      )}
      <ToastContainer position="bottom-right" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
      <style jsx global>{`
        /* Hide scrollbar but maintain scroll functionality */
        .scrollbar-hide {
          -ms-overflow-style: none;  /* Internet Explorer 10+ */
          scrollbar-width: none;  /* Firefox */
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;  /* Safari and Chrome */
        }
        
        .custom-phone-input-enhanced {
          position: relative;
        }
        
        .custom-phone-input-enhanced .PhoneInput {
          display: flex;
          align-items: center;
          width: 100%;
          border-radius: 0.75rem;
          border: 2px solid #e5e7eb;
          background-color: #f9fafb;
          transition: all 0.2s ease-in-out;
        }
        
        .custom-phone-input-enhanced .PhoneInput:focus-within {
          border-color: #3b82f6;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
        }
        
        .custom-phone-input-enhanced .PhoneInputCountry {
          display: flex;
          align-items: center;
          padding: 0.75rem 1rem;
          border-right: 1px solid #e5e7eb;
          background-color: #f3f4f6;
          border-radius: 0.75rem 0 0 0.75rem;
        }
        
        .custom-phone-input-enhanced .PhoneInputCountrySelect {
          background: none;
          border: none;
          outline: none;
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
          cursor: pointer;
        }
        
        .custom-phone-input-enhanced .PhoneInputCountryIcon {
          width: 1.25rem;
          height: 1.25rem;
          margin-right: 0.5rem;
        }
        
        .custom-phone-input-enhanced .PhoneInputInput {
          flex: 1;
          padding: 0.75rem 1rem;
          padding-right: 2.5rem;
          border: none;
          outline: none;
          background: transparent;
          font-size: 1rem;
          color: #111827;
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
    </>
  );
};

export default EmployeeDetailsForm;
