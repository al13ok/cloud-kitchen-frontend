"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import Alert from "@/components/ui/alert/Alert";

 

type CustomerTicketFormProps = {
  open?: boolean;
  onClose?: () => void;
  onSwitchType?: (type: 'customer' | 'employee') => void;
};

type CustomerRecord = {
  email?: string;
  full_name?: string;
  name?: string;
  phone?: string;
};

 

const CustomerTicketForm = ({ open, onClose, onSwitchType }: CustomerTicketFormProps) => {
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
    email: "",
    issue_type: "",
    issue: "",
    message: ""
  });

 

  // Validation states
  const [emailError, setEmailError] = useState("");
  const [customerDetails, setCustomerDetails] = useState<{
    name: string;
    email: string;
    phone: string;
  } | null>(null);
  const [fetchingCustomer, setFetchingCustomer] = useState(false);
  const [messageError, setMessageError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [issueTypeError, setIssueTypeError] = useState("");
  const [issueError, setIssueError] = useState("");
  const [allCustomers, setAllCustomers] = useState<CustomerRecord[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customerFetchError, setCustomerFetchError] = useState("");
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const customerInputWrapperRef = useRef<HTMLDivElement>(null);
  const [showIssueTypeDropdown, setShowIssueTypeDropdown] = useState(false);
  const [showIssueDropdown, setShowIssueDropdown] = useState(false);
  const issueTypeDropdownRef = useRef<HTMLDivElement>(null);
  const issueDropdownRef = useRef<HTMLDivElement>(null);

 

  // Local open state for uncontrolled usage---
  const [showForm, setShowForm] = useState(false);
  const isOpen = open !== undefined ? open : showForm;

 

  // Auto-hide alert after 5 seconds
  useEffect(() => {
    if (showAlert) {
      const timer = setTimeout(() => {
        setShowAlert(false);
        setAlertMessage("");
        setAlertTitle("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showAlert]);

  useEffect(() => {
    function handleCustomerClickOutside(event: MouseEvent) {
      if (
        customerInputWrapperRef.current &&
        !customerInputWrapperRef.current.contains(event.target as Node)
      ) {
        setShowCustomerSuggestions(false);
      }
    }
    if (showCustomerSuggestions) {
      document.addEventListener("mousedown", handleCustomerClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleCustomerClickOutside);
    };
  }, [showCustomerSuggestions]);

  useEffect(() => {
    function handleDropdownOutside(event: MouseEvent) {
      if (issueTypeDropdownRef.current && !issueTypeDropdownRef.current.contains(event.target as Node)) {
        setShowIssueTypeDropdown(false);
      }
      if (issueDropdownRef.current && !issueDropdownRef.current.contains(event.target as Node)) {
        setShowIssueDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleDropdownOutside);
    return () => {
      document.removeEventListener("mousedown", handleDropdownOutside);
    };
  }, []);

 

  // Fetch options from API on mount / open
  useEffect(() => {
    if (open === false) return;
    setOptionsLoading(true);
    setOptionsError("");
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/helpdesk/customer/options`)
      .then(res => res.json())
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

  useEffect(() => {
    if (!open) return;
    let isMounted = true;
    const loadCustomers = async () => {
      setLoadingCustomers(true);
      setCustomerFetchError("");
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/customers/?page=1&size=1000`);
        if (!response.ok) throw new Error("Failed to fetch customers");
        const payload: unknown = await response.json();
        let customers: CustomerRecord[] = [];
        if (
          payload &&
          typeof payload === "object" &&
          Array.isArray((payload as { data?: CustomerRecord[] }).data)
        ) {
          customers = (payload as { data: CustomerRecord[] }).data;
        } else if (Array.isArray(payload)) {
          customers = payload as CustomerRecord[];
        }
        if (isMounted) {
          setAllCustomers(customers);
        }
      } catch {
        if (isMounted) {
          setCustomerFetchError("Unable to load customers list");
        }
      } finally {
        if (isMounted) {
          setLoadingCustomers(false);
        }
      }
    };
    loadCustomers();
    return () => {
      isMounted = false;
    };
  }, [open]);

 

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    let value = e.target.value;
    
    // Prevent typing beyond 50 characters for email field
    if (e.target.name === "email" && value.length > 50) {
      value = value.slice(0, 50);
    }
    
    setForm({ ...form, [e.target.name]: value });
    if (e.target.name === "email") {
      setCustomerSearchQuery(value);
      setCustomerDetails(null);
      setEmailError("");
      if (value.trim().length >= 2) {
        setShowCustomerSuggestions(true);
      } else {
        setShowCustomerSuggestions(false);
      }
    }
  };

  const filteredCustomerSuggestions = useMemo(() => {
    if (customerSearchQuery.trim().length < 2) return [];
    const query = customerSearchQuery.trim().toLowerCase();
    return allCustomers
      .filter((customer) => {
        const emailMatch = customer.email && customer.email.toLowerCase().includes(query);
        const nameMatch = (customer.full_name || customer.name || "")
          .toString()
          .toLowerCase()
          .includes(query);
        return emailMatch || nameMatch;
      })
      .slice(0, 6);
  }, [customerSearchQuery, allCustomers]);

  const handleCustomerSuggestionSelect = (customer: CustomerRecord) => {
    const email = customer.email || "";
    const name = customer.full_name || customer.name || "";
    const phone = customer.phone || "";
    setForm((prev) => ({ ...prev, email }));
    setCustomerDetails({ name, email, phone });
    setEmailError("");
    setCustomerSearchQuery(email);
    setShowCustomerSuggestions(false);
  };

  const handleIssueTypeSelect = (value: string) => {
    setForm((prev) => ({ ...prev, issue_type: value, issue: "" }));
    setIssueTypeError("");
    setShowIssueTypeDropdown(false);
    setShowIssueDropdown(false);
  };

  const handleIssueSelect = (value: string) => {
    setForm((prev) => ({ ...prev, issue: value }));
    setIssueError("");
    setShowIssueDropdown(false);
  };

 

  // Fetch customer details by email
  const fetchCustomerDetails = async (email: string) => {
    if (!email.trim()) {
      setCustomerDetails(null);
      return;
    }
    setFetchingCustomer(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const localMatch = allCustomers.find(
        (cust) => (cust.email || "").toLowerCase() === normalizedEmail
      );
      if (localMatch) {
        setCustomerDetails({
          name: localMatch.full_name || localMatch.name || "",
          email: localMatch.email || "",
          phone: localMatch.phone || "",
        });
        setEmailError("");
        setFetchingCustomer(false);
        return;
      }
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/customers/?page=1&size=1000`);
      if (!response.ok) throw new Error("Failed to fetch customer details");
      const data: unknown = await response.json();
      const list: CustomerRecord[] = Array.isArray((data as { data?: unknown }).data)
        ? ((data as { data: unknown[] }).data as CustomerRecord[])
        : Array.isArray(data)
        ? (data as CustomerRecord[])
        : [];
      if (allCustomers.length === 0 && list.length) {
        setAllCustomers(list);
      }
      const found = list.find((cust) => (cust.email || "").toLowerCase() === normalizedEmail) || null;
      if (found) {
        setCustomerDetails({
          name: found.full_name || found.name || "",
          email: found.email || "",
          phone: found.phone || "",
        });
        setEmailError("");
      } else {
        setCustomerDetails(null);
        setEmailError("Customer does not exist with this mail id");
      }
    } catch {
      setCustomerDetails(null);
      setEmailError("Failed to fetch customer details");
    } finally {
      setFetchingCustomer(false);
    }
  };

 

  const handleEmailBlur = () => {
    if (!form.email.trim()) {
      setEmailError("Email is required.");
      setCustomerDetails(null);
      return;
    }
    // Basic email format check
    if (!form.email.includes("@")) {
      setEmailError("Invalid email format");
      setCustomerDetails(null);
      return;
    }
    fetchCustomerDetails(form.email);
  };

 

  const handleMessageBlur = () => {
    setMessageError(form.message.trim() === "" ? "Message is required." : "");
  };

 

  const isFormValid = form.email && customerDetails && form.message && !emailError && !messageError && form.issue_type && form.issue;

 

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

 

    if (!customerDetails) {
      setEmailError("Customer does not exist with this mail id");
      setLoading(false);
      return;
    }

 

    if (!form.issue_type) {
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
      const ticketData = {
        name: customerDetails.name,
        email: customerDetails.email,
        phone: customerDetails.phone,
        issue_type: form.issue_type,
        issue: form.issue,
        device: '',
        severity: '',
        message: form.message,
        status: "New"
      };

 

      console.log('Submitting ticket with data:', ticketData);
      console.log('Customer details phone:', customerDetails.phone);
      console.log('Ticket data phone:', ticketData.phone);

 

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/helpdesk/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ticketData),
      });

 

      if (!response.ok) throw new Error("Failed to submit ticket");
      
      // Log the response to see what the API returns
      const responseData = await response.json();
      console.log('Ticket creation response:', responseData);
      
      // Extract ticket ID from response if available
      const ticketId = responseData?.id || responseData?.ticket_id || responseData?.ticketId || '';
      const ticketIdDisplay = ticketId ? ` Ticket ID: ${ticketId}.` : '';
      
      // Send confirmation email in background (no await, no error shown to user)
      (async () => {
        try {
          // Fetch confirmation message from API
          let confirmationMessage = '';
          
          try {
            const confirmationRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/helpdesk/confirmation-message/coustomer`);
            const confirmationData = await confirmationRes.json();
            if (confirmationData?.message) {
              confirmationMessage = `Dear ${customerDetails.name},\n\n${confirmationData.message}`;
            }
          } catch {
            // API failed, no message will be sent
          }
          
          // Send confirmation email
          const emailPayload = {
            to_email: customerDetails.email,
            subject: 'Thank you for your ticket submission',
            body: confirmationMessage || `Dear ${customerDetails.name},\n\nThank you for submitting your ticket. We have received your inquiry and will get back to you soon.\n\nBest regards,\nYour Support Team`
          };
          
          await fetch(`${process.env.NEXT_PUBLIC_API_URL}/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(emailPayload),
          });
        } catch {
          // Silently ignore mail errors
        }
      })();
      
      setLoading(false);
      
      // Reset form
      setForm({
        email: "",
        issue_type: "",
        issue: "",
        message: ""
      });
      setCustomerDetails(null);
      setEmailError("");
      setIssueTypeError("");
      setIssueError("");
      setMessageError("");
      
      // Show success alert
      setAlertTitle("Success");
      setAlertMessage(`Customer ticket created successfully!${ticketIdDisplay} is being processed in background. Full details will be available shortly.`);
      setShowAlert(true);
    } catch {
      setLoading(false);
      setError("Failed to submit ticket. Try again.");
    }
  };

 

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
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

 

      {/* Trigger button for uncontrolled mode */}
      {open === undefined && (
        <div className="mb-4">
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Create Customer Ticket
          </button>
        </div>
      )}

 

      {/* Main Form (modal) */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[2px]"
            onClick={() => {
              if (onClose) onClose();
              if (open === undefined) setShowForm(false);
            }}
          />
          <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto px-4"
            onClick={() => {
              if (onClose) onClose();
              if (open === undefined) setShowForm(false);
            }}
          >
            <div
              className="w-full max-w-md bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-center text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">
              Create Support Ticket
            </h2>
            <button
              type="button"
              onClick={() => {
                if (onClose) onClose();
                if (open === undefined) setShowForm(false);
              }}
              className="text-gray-400 dark:text-gray-500 bg-transparent hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 rounded-lg text-lg sm:text-xl w-8 h-8 flex justify-center items-center"
              aria-label="Close"
            >
              <svg className="w-4 sm:w-5 h-4 sm:h-5" aria-hidden="true" fill="none" viewBox="0 0 14 14">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
              </svg>
            </button>
          </div>

 

          {/* Toggle */}
          <div className="flex justify-center mb-4">
            <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-700 overflow-hidden">
              <button
                type="button"
                className="px-3 py-1.5 text-sm bg-blue-600 text-white"
              >
                Customer
              </button>
              <button
                type="button"
                className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200"
                onClick={() => onSwitchType && onSwitchType('employee')}
              >
                Employee
              </button>
            </div>
          </div>
          
          <div className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-gray-700 dark:text-gray-200 mb-1 font-medium">
                Email <span className="text-red-500">*</span>
              </label>
              <div className="relative" ref={customerInputWrapperRef}>
                <input
                  type="email"
                  name="email"
                  placeholder="Enter your email"
                  value={form.email}
                  onChange={handleChange}
                  onBlur={handleEmailBlur}
                  onFocus={() => {
                    if (form.email.trim().length >= 2) {
                      setShowCustomerSuggestions(true);
                    }
                  }}
                  maxLength={50}
                  autoComplete="off"
                  required
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
                {showCustomerSuggestions && (
                  <div className="absolute z-[9999] w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    {loadingCustomers ? (
                      <div className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">Loading customers...</div>
                    ) : customerFetchError ? (
                      <div className="px-4 py-3 text-xs text-red-500">{customerFetchError}</div>
                    ) : filteredCustomerSuggestions.length === 0 ? (
                      <div className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">No matching customers</div>
                    ) : (
                      filteredCustomerSuggestions.map((customer, idx) => (
                        <button
                          type="button"
                          key={`${customer.email || idx}`}
                          onClick={() => handleCustomerSuggestionSelect(customer)}
                          className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                        >
                          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {customer.full_name || customer.name || 'Unknown'}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{customer.email || 'No email'}</div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              {emailError && (
                <div className="bg-red-50 border border-red-200 text-red-600 rounded px-4 py-2 text-sm font-medium mt-1">
                  {emailError}
                </div>
              )}
              {fetchingCustomer && (
                <div className="bg-blue-50 border border-blue-200 text-blue-600 rounded px-4 py-2 text-sm font-medium mt-1">
                  Fetching customer details...
                </div>
              )}
              {customerDetails && (
                <div className="bg-green-50 border border-green-200 text-green-600 rounded px-4 py-2 text-sm font-medium mt-1">
                  Customer found: {customerDetails.name}
                </div>
              )}
            </div>

 

            {/* Issue Type Field */}
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
                  <span className={form.issue_type ? "" : "text-gray-500 dark:text-gray-400"}>
                    {optionsLoading
                      ? "Loading..."
                      : optionsError
                      ? "Failed to load"
                      : form.issue_type || "Select Issue Type"}
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showIssueTypeDropdown ? "rotate-180" : ""}`} />
                </button>
                {showIssueTypeDropdown && (
                  <div className="absolute z-[9999] w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {issueTypeOptions.length === 0 ? (
                      <div className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 text-center">No issue types found</div>
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

 

            {/* Issue Field */}
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
                        form.issue_type && typeToIssues[form.issue_type]?.length
                          ? typeToIssues[form.issue_type]
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

 

            {/* Message Field */}
            <div>
              <label className="block text-gray-700 dark:text-gray-200 mb-1 font-medium">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                name="message"
                placeholder="Describe your issue in detail"
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

 

            {/* Submit Button */}
            <button
              type="button"
              onClick={handleSubmit}
              className={`w-full bg-blue-600 text-white py-2 rounded-lg flex items-center justify-center transition ${
                loading ? 'cursor-not-allowed' : ''
              } ${
                isFormValid && !loading ? 'hover:bg-blue-700' : 'opacity-50'
              }`}
              disabled={loading || !isFormValid}
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
              ) : null}
              {loading ? 'Submitting...' : 'Submit Ticket'}
            </button>

 

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 rounded px-4 py-2 text-sm font-medium">
                {error}
              </div>
            )}
          </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

 

export default CustomerTicketForm;
