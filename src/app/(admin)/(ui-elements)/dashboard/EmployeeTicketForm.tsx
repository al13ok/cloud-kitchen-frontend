"use client";

 

import React, { useEffect, useState, useRef, useMemo } from "react";
import { ChevronDown } from "lucide-react";
import Alert from "@/components/ui/alert/Alert";

 

type EmployeeTicketFormProps = {
  open?: boolean;
  onClose?: () => void;
  onSwitchType?: (type: "customer" | "employee") => void;
};

 

const EmployeeTicketForm = ({ open = false, onClose, onSwitchType }: EmployeeTicketFormProps) => {
  // Options state
  const [issueTypeOptions, setIssueTypeOptions] = useState<string[]>([]);
  const [issueOptions, setIssueOptions] = useState<string[]>([]);
  const [typeToIssues, setTypeToIssues] = useState<Record<string, string[]>>({});
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsError, setOptionsError] = useState("");

 

  // Alert state
  const [showAlert, setShowAlert] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");

 

  // Form state
  const [form, setForm] = useState({
    employeeId: "",
    issueType: "",
    issue: "",
    message: "",
  });

 

  // Validation / loading
  const [employeeIdError, setEmployeeIdError] = useState("");
  const [messageError, setMessageError] = useState("");
  const [issueTypeError, setIssueTypeError] = useState("");
  const [issueError, setIssueError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

 

  // Employee details
  const [employeeDetails, setEmployeeDetails] = useState<{
    name: string;
    email: string;
    phone: string;
  } | null>(null);
  const [fetchingEmployee, setFetchingEmployee] = useState(false);

  // Employee autocomplete states
  const [allEmployees, setAllEmployees] = useState<Array<{
    emp_id?: string | number;
    email?: string;
    full_name?: string;
    name?: string;
    phone?: string;
    mobile?: string;
  }>>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState("");
  const [showEmployeeSuggestions, setShowEmployeeSuggestions] = useState(false);
  const employeeInputWrapperRef = useRef<HTMLDivElement>(null);
  const [showIssueTypeDropdown, setShowIssueTypeDropdown] = useState(false);
  const [showIssueDropdown, setShowIssueDropdown] = useState(false);
  const issueTypeDropdownRef = useRef<HTMLDivElement>(null);
  const issueDropdownRef = useRef<HTMLDivElement>(null);

 

  // Fetch options from API on mount
  useEffect(() => {
    if (!open) return;
    setOptionsLoading(true);
    setOptionsError("");
    fetch((process.env.NEXT_PUBLIC_API_URL) + "/api/v1/helpdesk/employee/options")
      .then((res) => res.json())
      .then((data: unknown) => {
        if (Array.isArray(data) && data.length > 0 && (data[0] as Record<string, unknown>).type === "parent") {
          const parents = data as Array<{ label?: string; children?: Array<{ label?: string } | string> }>;
          const map: Record<string, string[]> = {};
          parents.forEach((node) => {
            const parent = String(node.label || "").trim();
            if (!parent) return;
            const children = Array.isArray(node.children)
              ? node.children
                  .map((c) => (typeof c === "string" ? c : String((c as { label?: string }).label || "")))
                  .map((s) => String(s || "").trim())
                  .filter(Boolean)
              : [];
            map[parent] = children;
          });
          setTypeToIssues(map);
          setIssueTypeOptions(Object.keys(map));
          setIssueOptions(Object.values(map).flat());
        } else if (Array.isArray(data)) {
          const flat = data as { option_label?: string; list_label: string }[];
          const typeOpts = flat.filter((o) => o.option_label?.toLowerCase() === "type").map((o) => o.list_label);
          const issueOpts = flat.filter((o) => o.option_label?.toLowerCase() === "issue").map((o) => o.list_label);
          setIssueTypeOptions(typeOpts);
          setIssueOptions(issueOpts);
          setTypeToIssues({});
        } else {
          throw new Error("Unexpected options response");
        }
      })
      .catch(() => setOptionsError("Failed to load options"))
      .finally(() => setOptionsLoading(false));
  }, [open]);

 

  // Auto-hide alert after 5 seconds
  useEffect(() => {
    if (showAlert) {
      const t = setTimeout(() => {
        setShowAlert(false);
        setAlertMessage("");
        setAlertTitle("");
      }, 5000);
      return () => clearTimeout(t);
    }
  }, [showAlert]);

  // Load all employees on mount
  useEffect(() => {
    if (!open) return;
    let isMounted = true;
    const loadEmployees = async () => {
      setLoadingEmployees(true);
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/employees/?page=1&size=1000`);
        if (response.ok) {
          const data: unknown = await response.json();
          type ApiEmployee = {
            emp_id?: string | number;
            email?: string;
            full_name?: string;
            name?: string;
            phone?: string;
            mobile?: string;
          };
          const employees: ApiEmployee[] = Array.isArray((data as { data?: unknown }).data)
            ? ((data as { data: unknown[] }).data as ApiEmployee[])
            : Array.isArray(data)
            ? (data as ApiEmployee[])
            : [];
          if (isMounted) {
            setAllEmployees(employees);
          }
        }
      } catch (error) {
        console.error('Failed to fetch employees:', error);
      } finally {
        if (isMounted) {
          setLoadingEmployees(false);
        }
      }
    };
    loadEmployees();
    return () => {
      isMounted = false;
    };
  }, [open]);

  // Click outside handler for employee suggestions
  useEffect(() => {
    function handleClickOutsideSuggestions(event: MouseEvent) {
      if (employeeInputWrapperRef.current && !employeeInputWrapperRef.current.contains(event.target as Node)) {
        setShowEmployeeSuggestions(false);
      }
    }
    if (showEmployeeSuggestions) {
      document.addEventListener('mousedown', handleClickOutsideSuggestions);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutsideSuggestions);
    };
  }, [showEmployeeSuggestions]);

  useEffect(() => {
    function handleDropdownClickOutside(event: MouseEvent) {
      if (issueTypeDropdownRef.current && !issueTypeDropdownRef.current.contains(event.target as Node)) {
        setShowIssueTypeDropdown(false);
      }
      if (issueDropdownRef.current && !issueDropdownRef.current.contains(event.target as Node)) {
        setShowIssueDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleDropdownClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleDropdownClickOutside);
    };
  }, []);

  // Filter employees based on search query
  const filteredEmployeeSuggestions = useMemo(() => {
    if (employeeSearchQuery.trim().length < 2) return [];
    const query = employeeSearchQuery.trim().toLowerCase();
    return allEmployees
      .filter((emp) => {
        const idMatch = emp.emp_id && String(emp.emp_id).toLowerCase().includes(query);
        const emailMatch = emp.email && emp.email.toLowerCase().includes(query);
        const nameMatch = (emp.full_name || emp.name) && 
          String(emp.full_name || emp.name || '').toLowerCase().includes(query);
        return Boolean(idMatch || emailMatch || nameMatch);
      })
      .slice(0, 6);
  }, [employeeSearchQuery, allEmployees]);

 

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    let value = e.target.value;
    
    // Prevent typing beyond 50 characters for employeeId field
    if (e.target.name === 'employeeId' && value.length > 50) {
      value = value.slice(0, 50);
    }
    
    setForm({ ...form, [e.target.name]: value });
    
    // Handle employee ID autocomplete
    if (e.target.name === 'employeeId') {
      setEmployeeSearchQuery(value);
      setEmployeeIdError("");
      setEmployeeDetails(null);
      if (!value.trim()) {
        setShowEmployeeSuggestions(false);
        return;
      }
      if (value.trim().length >= 2) {
        setShowEmployeeSuggestions(true);
      } else {
        setShowEmployeeSuggestions(false);
      }
    }
  };
  const handleIssueTypeSelect = (value: string) => {
    setForm((prev) => ({ ...prev, issueType: value, issue: "" }));
    setIssueTypeError("");
    setShowIssueTypeDropdown(false);
    setShowIssueDropdown(false);
  };

  const handleIssueSelect = (value: string) => {
    setForm((prev) => ({ ...prev, issue: value }));
    setIssueError("");
    setShowIssueDropdown(false);
  };

  const handleEmployeeSuggestionSelect = (employee: {
    emp_id?: string | number;
    email?: string;
    full_name?: string;
    name?: string;
    phone?: string;
    mobile?: string;
  }) => {
    const empId = employee.emp_id ? String(employee.emp_id) : '';
    const name = employee.full_name || employee.name || '';
    const email = employee.email || '';
    const phone = employee.mobile || employee.phone || '';
    
    setForm({ ...form, employeeId: empId });
    setEmployeeSearchQuery(empId);
    setEmployeeDetails({ name, email, phone });
    setEmployeeIdError("");
    setShowEmployeeSuggestions(false);
  };

 

  const fetchEmployeeDetails = async (employeeId: string) => {
    if (!employeeId.trim()) {
      setEmployeeDetails(null);
      return;
    }
    setFetchingEmployee(true);
    try {
      // First check local cache
      const normalizedValue = employeeId.trim().toLowerCase();
      const localMatch = allEmployees.find((emp) => {
        const id = emp.emp_id ? String(emp.emp_id).toLowerCase() : "";
        const email = emp.email ? emp.email.toLowerCase() : "";
        return id === normalizedValue || email === normalizedValue;
      });

      if (localMatch) {
        setEmployeeDetails({
          name: localMatch.full_name || localMatch.name || "",
          email: localMatch.email || "",
          phone: localMatch.mobile || localMatch.phone || "",
        });
        setEmployeeIdError("");
        setFetchingEmployee(false);
        return;
      }

      // If not found locally, fetch from API
      const response = await fetch((process.env.NEXT_PUBLIC_API_URL) + "/api/v1/employees/?page=1&size=1000"
      );
      if (response.ok) {
        const raw: unknown = await response.json();
        type ApiEmployee = {
          emp_id?: string | number;
          full_name?: string;
          name?: string;
          email?: string;
          mobile?: string;
          phone?: string;
        };
        const employees: ApiEmployee[] = Array.isArray((raw as { data?: unknown }).data)
          ? ((raw as { data: unknown[] }).data as ApiEmployee[])
          : (Array.isArray(raw) ? (raw as ApiEmployee[]) : []);
        
        // Update local cache if needed
        if (allEmployees.length === 0) {
          setAllEmployees(employees);
        }
        
        const found = employees.find((emp) => {
          const id = emp.emp_id ? String(emp.emp_id).toLowerCase() : "";
          const email = emp.email ? emp.email.toLowerCase() : "";
          return id === normalizedValue || email === normalizedValue;
        }) || null;
        
        if (found) {
          setEmployeeDetails({
            name: found.full_name || found.name || "",
            email: found.email || "",
            phone: found.mobile || found.phone || "",
          });
          setEmployeeIdError("");
        } else {
          setEmployeeDetails(null);
          setEmployeeIdError("Employee not found with this ID or email");
        }
      } else {
        setEmployeeDetails(null);
        setEmployeeIdError("Failed to fetch employee details");
      }
    } catch {
      setEmployeeDetails(null);
      setEmployeeIdError("Failed to fetch employee details");
    } finally {
      setFetchingEmployee(false);
    }
  };

 

  const handleEmployeeIdBlur = () => {
    setEmployeeIdError(
      form.employeeId.trim() === "" ? "Employee ID is required." : ""
    );
    if (form.employeeId.trim()) {
      fetchEmployeeDetails(form.employeeId);
    }
  };

 

  const handleMessageBlur = () => {
    setMessageError(form.message.trim() === "" ? "Message is required." : "");
  };

 

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

 

    if (!employeeDetails) {
      setEmployeeIdError("Please enter a valid Employee ID");
      setLoading(false);
      return;
    }
    if (!form.issueType) {
      setIssueTypeError("Issue Type is required.");
      setLoading(false);
      return;
    }
    if (!form.issue) {
      setIssueError("Issue is required.");
      setLoading(false);
      return;
    }
    try {
      const ticketPayload = {
        name: employeeDetails.name,
        email: employeeDetails.email,
        phone: employeeDetails.phone,
        issue_type: form.issueType,
        issue: form.issue,
        device: "",
        severity: "",
        message: form.message,
      };

 

      // Use py-aiagent for ticket creation to align with dashboard counts
      const response = await fetch((process.env.NEXT_PUBLIC_API_URL) + "/api/v1/helpdesk/employee/tickets",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(ticketPayload),
        }
      );

 

      if (!response.ok) throw new Error("Failed to submit ticket");

      // Get response data to extract ticket ID
      let responseData: unknown = {};
      try {
        responseData = await response.json();
      } catch {}

      // Extract ticket ID from response if available
      const ticketId = (responseData as { id?: string; ticket_id?: string; ticketId?: string })?.id || 
                      (responseData as { id?: string; ticket_id?: string; ticketId?: string })?.ticket_id || 
                      (responseData as { id?: string; ticket_id?: string; ticketId?: string })?.ticketId || '';
      const ticketIdDisplay = ticketId ? ` Ticket ID: ${ticketId}.` : '';

      // Background confirmation email
      (async () => {
        try {
          let confirmationMessage = "";
          try {
            const confirmationRes = await fetch((process.env.NEXT_PUBLIC_API_URL) + "/api/v1/helpdesk/confirmation-message/employee"
            );
            const confirmationData: { message?: string } = await confirmationRes.json();
            if (confirmationData?.message) {
              confirmationMessage = "Dear " + employeeDetails.name + ",\n\n" + confirmationData.message;
            }
          } catch {}

 

          const emailPayload = {
            to_email: employeeDetails.email,
            subject: "Thank you for your ticket submission",
            body:
              confirmationMessage ||
              `Dear ${employeeDetails.name},\n\nThank you for submitting your ticket. We have received your inquiry and will get back to you soon.\n\nBest regards,\nYour Support Team`,
          };
          await fetch((process.env.NEXT_PUBLIC_API_URL) + "/send-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(emailPayload),
          });
        } catch {}
      })();

 

      setLoading(false);

 

      // Reset and alert
      setForm({ employeeId: "", issueType: "", issue: "", message: "" });
      setEmployeeDetails(null);
      setEmployeeIdError("");
      setIssueTypeError("");
      setIssueError("");
      setMessageError("");

      // Show success alert
      setAlertTitle("Success");
      setAlertMessage(`Employee ticket created successfully!${ticketIdDisplay} is being processed in background. Full details will be available shortly.`);
      setShowAlert(true);
    } catch {
      setLoading(false);
      setError("Failed to submit ticket. Try again.");
    }
  };

 

  const isFormValid =
    !!form.employeeId &&
    !!employeeDetails &&
    !!form.message &&
    !employeeIdError &&
    !messageError &&
    !!form.issueType &&
    !!form.issue;

 

  if (!open) return null;

 

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[2px]"
        onClick={onClose}
      />
      {/* Modal */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto px-4"
        onClick={onClose}
      >
        <div
          className="w-full max-w-md bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-center text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">
              Create Employee Ticket
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              aria-label="Close"
            >
              <svg className="w-5 h-5" aria-hidden="true" fill="none" viewBox="0 0 14 14">
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
                />
              </svg>
            </button>
          </div>

 

          {/* Toggle */}
          <div className="flex justify-center mb-4">
            <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-700 overflow-hidden">
              <button
                type="button"
                className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200"
                onClick={() => onSwitchType && onSwitchType("customer")}
              >
                Customer
              </button>
              <button
                type="button"
                className="px-3 py-1.5 text-sm bg-blue-600 text-white"
              >
                Employee
              </button>
            </div>
          </div>

 

          {/* Alert */}
          {showAlert && (
            <Alert
              variant="success"
              title={alertTitle}
              message={alertMessage}
              showCloseButton={true}
              onClose={() => {
                setShowAlert(false);
                setAlertMessage("");
                setAlertTitle("");
              }}
            />
          )}

 

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-700 dark:text-gray-200 mb-1 font-medium">
                Employee ID <span className="text-red-500">*</span>
              </label>
              <div className="relative" ref={employeeInputWrapperRef}>
                <input
                  type="text"
                  name="employeeId"
                  placeholder="Search by Employee ID or Email"
                  value={form.employeeId}
                  onChange={handleChange}
                  onBlur={handleEmployeeIdBlur}
                  onFocus={() => {
                    if (form.employeeId.trim().length >= 2) {
                      setShowEmployeeSuggestions(true);
                    }
                  }}
                  maxLength={50}
                  autoComplete="off"
                  required
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 dark:hover:border-gray-500 transition-all"
                />
                {showEmployeeSuggestions && (
                  <div className="absolute z-[9999] w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    {loadingEmployees ? (
                      <div className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                        Loading employees...
                      </div>
                    ) : filteredEmployeeSuggestions.length === 0 ? (
                      <div className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                        No matching employees
                      </div>
                    ) : (
                      filteredEmployeeSuggestions.map((employee, index) => (
                        <button
                          key={`${employee.emp_id || employee.email || index}`}
                          type="button"
                          onClick={() => handleEmployeeSuggestionSelect(employee)}
                          className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition border-b border-gray-200 dark:border-gray-700 last:border-b-0"
                        >
                          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {employee.full_name || employee.name || 'Unknown'}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {(employee.emp_id ? String(employee.emp_id) : 'No ID') + ' - ' + (employee.email || 'No email')}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              {employeeIdError && (
                <div className="bg-red-50 border border-red-200 text-red-600 rounded px-4 py-2 text-sm font-medium mt-1">
                  {employeeIdError}
                </div>
              )}
              {fetchingEmployee && (
                <div className="bg-blue-50 border border-blue-200 text-blue-600 rounded px-4 py-2 text-sm font-medium mt-1">
                  Fetching employee details...
                </div>
              )}
              {employeeDetails && (
                <div className="bg-green-50 border border-green-200 text-green-600 rounded px-4 py-2 text-sm font-medium mt-1">
                  Employee found: {employeeDetails.name}
                </div>
              )}
            </div>
            <div>
              <label className="block text-gray-700 dark:text-gray-200 mb-1 font-medium">
                Issue Type <span className="text-red-500">*</span>
              </label>
              <div className="relative" ref={issueTypeDropdownRef}>
                <button
                  type="button"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-left flex items-center justify-between text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition disabled:opacity-60"
                  onClick={() => {
                    if (optionsLoading || optionsError) return;
                    setShowIssueTypeDropdown((prev) => !prev);
                    setShowIssueDropdown(false);
                  }}
                  disabled={optionsLoading || !!optionsError}
                >
                  <span className={form.issueType ? "" : "text-gray-500 dark:text-gray-400"}>
                    {optionsLoading
                      ? "Loading..."
                      : optionsError
                      ? "Failed to load"
                      : form.issueType || "Select Issue Type"}
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showIssueTypeDropdown ? "rotate-180" : ""}`} />
                </button>
                {showIssueTypeDropdown && (
                  <div className="absolute z-[9999] w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {issueTypeOptions.length === 0 ? (
                      <div className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 text-center">
                        No issue types found
                      </div>
                    ) : (
                      issueTypeOptions.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleIssueTypeSelect(opt)}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                        >
                          {opt}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              {issueTypeError && (
                <div className="bg-red-50 border border-red-200 text-red-600 rounded px-4 py-2 text-sm font-medium mt-1">
                  {issueTypeError}
                </div>
              )}
            </div>
            <div>
              <label className="block text-gray-700 dark:text-gray-200 mb-1 font-medium">
                Issue <span className="text-red-500">*</span>
              </label>
              <div className="relative" ref={issueDropdownRef}>
                <button
                  type="button"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-left flex items-center justify-between text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition disabled:opacity-60"
                  onClick={() => {
                    if (optionsLoading || optionsError) return;
                    setShowIssueDropdown((prev) => !prev);
                    setShowIssueTypeDropdown(false);
                  }}
                  disabled={optionsLoading || !!optionsError}
                >
                  <span className={form.issue ? "" : "text-gray-500 dark:text-gray-400"}>
                    {optionsLoading
                      ? "Loading..."
                      : optionsError
                      ? "Failed to load"
                      : form.issue || "Select Issue"}
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showIssueDropdown ? "rotate-180" : ""}`} />
                </button>
                {showIssueDropdown && (
                  <div className="absolute z-[9999] w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                    {(() => {
                      const optionsList =
                        form.issueType && typeToIssues[form.issueType]?.length
                          ? typeToIssues[form.issueType]
                          : issueOptions;
                      if (optionsList.length === 0) {
                        return (
                          <div className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 text-center">
                            No issues found
                          </div>
                        );
                      }
                      return optionsList.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleIssueSelect(opt)}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                        >
                          {opt}
                        </button>
                      ));
                    })()}
                  </div>
                )}
              </div>
              {issueError && (
                <div className="bg-red-50 border border-red-200 text-red-600 rounded px-4 py-2 text-sm font-medium mt-1">
                  {issueError}
                </div>
              )}
            </div>
            <div>
              <label className="block text-gray-700 dark:text-gray-200 mb-1 font-medium">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                name="message"
                placeholder="Message"
                value={form.message}
                onChange={handleChange}
                onBlur={handleMessageBlur}
                required
                rows={4}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
              {messageError && (
                <div className="bg-red-50 border border-red-200 text-red-600 rounded px-4 py-2 text-sm font-medium mt-1">
                  {messageError}
                </div>
              )}
            </div>
            <button
              type="submit"
              className={`w-full bg-blue-600 text-white py-2 rounded-lg flex items-center justify-center transition ${
                loading ? "cursor-not-allowed" : ""
              } ${isFormValid && !loading ? "hover:bg-blue-700" : "opacity-50"}`}
              disabled={loading || !isFormValid}
            >
              {loading ? (
                <svg
                  className="animate-spin h-5 w-5 mr-2 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  ></path>
                </svg>
              ) : null}
              {loading ? "Submitting..." : "Submit Ticket"}
            </button>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 rounded px-4 py-2 text-sm font-medium">
                {error}
              </div>
            )}
          </form>
        </div>
      </div>
    </>
  );
};

 

export default EmployeeTicketForm;