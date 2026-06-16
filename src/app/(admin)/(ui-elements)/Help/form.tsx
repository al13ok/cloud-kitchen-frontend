"use client";



import { useEffect, useState, ChangeEvent, FormEvent } from 'react';



type FormState = {
  name: string;
  email: string;
  subject: string;
  message: string;
  business_id: string;
  business_name: string;
};

type UserData = {
  business_info?: {
    full_name?: string;
    business_email?: string;
    business_id?: string;
    company_name?: string;
  };
  email?: string;
  full_name?: string;
};



type Props = {
  show: boolean;
  onClose: () => void;
  onSubmitted?: () => Promise<void> | void;
};



const stripHtml = (input: string) => input.replace(/<[^>]*>?/gm, '');



export default function CreateTicketForm({ show, onClose, onSubmitted }: Props) {
  const [form, setForm] = useState<FormState>({
    name: '',
    email: '',
    subject: '',
    message: '',
    business_id: '',
    business_name: '',
  });



  const [issueType, setIssueType] = useState('');
  const [otherIssueDescription, setOtherIssueDescription] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [subjectError, setSubjectError] = useState('');
  const [messageError, setMessageError] = useState('');
  const [issueTypeError, setIssueTypeError] = useState('');
  const [otherIssueError, setOtherIssueError] = useState('');
  const [businessIdError, setBusinessIdError] = useState('');
  const [businessNameError, setBusinessNameError] = useState('');
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');



  useEffect(() => {
    if (show) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [show]);



  useEffect(() => {
    if (show) {
      // Auto-fill form with user data from localStorage and fetch business info
      const populateFormWithUserInfo = async () => {
        let userData: UserData = {};
        let name = '';
        let email = '';
        let business_id = '';
        let business_name = '';

        if (typeof window !== 'undefined') {
          try {
            // Get user data from localStorage (this contains the login response)
            userData = JSON.parse(localStorage.getItem('userData') || '{}');

            if (userData && userData.business_info) {
              name = userData.business_info.full_name || '';
              email = userData.business_info.business_email || userData.email || '';
              business_id = userData.business_info.business_id || '';
              business_name = userData.business_info.company_name || '';
            } else if (userData && userData.email) {
              email = userData.email;
              name = userData.full_name || userData.email.split('@')[0] || '';

              // If we have email but no business info, fetch it from API
              if (email && !business_id) {
                try {
                  const encodedEmail = encodeURIComponent(email);
                  const response = await fetch(`https://py-business.converiqo.ai/api/v1/business/by-email?email=${encodedEmail}`, {
                    method: 'GET',
                    headers: {
                      'accept': 'application/json',
                      'Content-Type': 'application/json',
                    },
                  });

                  if (response.ok) {
                    const businessData = await response.json();
                    if (businessData.success) {
                      business_id = businessData.business_id;
                      business_name = businessData.business_name;
                    }
                  }
                } catch (error) {
                  console.error('Error fetching business info:', error);
                }
              }
            }
          } catch (error) {
            console.error('Error parsing user data from localStorage:', error);
          }
        }

        setForm(prev => ({
          ...prev,
          name,
          email,
          business_id,
          business_name,
        }));
      };

      populateFormWithUserInfo();
    }
  }, [show]);









  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));

    // Real-time validation for all fields
    if (name === 'name') {
      // Name validation: letters and spaces only, 2-100 characters
      if (value.length > 0) {
        if (!/^[A-Za-z\s]+$/.test(value)) {
          setNameError('Name can only contain letters and spaces');
        } else if (value.length < 2) {
          setNameError('Name must be at least 2 characters');
        } else if (value.length > 100) {
          setNameError('Name must be at most 100 characters');
        } else {
          setNameError('');
        }
      }
    }

    if (name === 'email') {
      // Email validation: basic email format
      if (value.length > 0) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          setEmailError('Please enter a valid email address');
        } else if (value.length > 254) {
          setEmailError('Email must be at most 254 characters');
        } else {
          setEmailError('');
        }
      }
    }

    if (name === 'business_id') {
      setBusinessIdError('');
      // Business ID validation: alphanumeric and some special characters
      if (value.length > 0) {
        if (!/^[A-Za-z0-9\-_]+$/.test(value)) {
          setBusinessIdError('Business ID can only contain letters, numbers, hyphens, and underscores');
        } else if (value.length < 2) {
          setBusinessIdError('Business ID must be at least 2 characters');
        } else if (value.length > 50) {
          setBusinessIdError('Business ID must be at most 50 characters');
        } else {
          setBusinessIdError('');
        }
      }
    }

    if (name === 'business_name') {
      setBusinessNameError('');
      // Business name validation: letters, spaces, and basic punctuation
      if (value.length > 0) {
        if (!/^[A-Za-z\s\d\-'&.,()]+$/.test(value)) {
          setBusinessNameError('Business name can only contain letters, numbers, spaces, and basic punctuation');
        } else if (value.length < 2) {
          setBusinessNameError('Business name must be at least 2 characters');
        } else if (value.length > 100) {
          setBusinessNameError('Business name must be at most 100 characters');
        } else {
          setBusinessNameError('');
        }
      }
    }

    if (name === 'subject') {
      setSubjectError('');
      // Real-time validation for character limit
      if (value.length > 250) {
        setSubjectError('Subject must be at most 250 characters.');
      }
    }

    if (name === 'message') {
      setMessageError('');
      // Real-time validation for character limit
      if (value.length > 1000) {
        setMessageError('Message must be at most 1000 characters.');
      }
    }
  };



  const handleIssueTypeBlur = () => {
    if (!issueType.trim()) {
      setIssueTypeError('Issue type is required.');
    } else {
      setIssueTypeError('');
    }
  };



  const handleSubjectBlur = () => {
    const subject = form.subject.trim();
    if (!subject) {
      setSubjectError('Subject is required.');
    } else if (subject.length < 2) {
      setSubjectError('Subject must be at least 2 characters.');
    } else if (subject.length > 250) {
      setSubjectError('Subject must be at most 250 characters.');
    } else if (!/[A-Za-z]/.test(subject)) {
      setSubjectError('Subject must include at least one letter.');
    } else {
      setSubjectError('');
    }
  };



  const handleMessageBlur = () => {
    let message = form.message.trim();
    message = stripHtml(message);
    if (!message) {
      setMessageError('Message is required.');
    } else if (message.length < 2) {
      setMessageError('Message must be at least 2 characters.');
    } else if (message.length > 1000) {
      setMessageError('Message must be at most 1000 characters.');
    } else {
      setMessageError('');
    }
  };



  const handleOtherIssueBlur = () => {
    const value = otherIssueDescription.trim();
    if (!value) {
      setOtherIssueError('Please specify the issue type.');
    } else if (value.length < 2) {
      setOtherIssueError('Issue type must be at least 2 characters.');
    } else if (value.length > 120) {
      setOtherIssueError('Issue type must be at most 120 characters.');
    } else if (!/[A-Za-z]/.test(value)) {
      setOtherIssueError('Issue type must include at least one letter.');
    } else {
      setOtherIssueError('');
    }
  };

  const handleBusinessIdBlur = () => {
    const value = form.business_id.trim();
    if (!value) {
      setBusinessIdError('Business ID is required.');
    } else if (value.length < 2) {
      setBusinessIdError('Business ID must be at least 2 characters.');
    } else if (value.length > 50) {
      setBusinessIdError('Business ID must be at most 50 characters.');
    } else {
      setBusinessIdError('');
    }
  };

  const handleBusinessNameBlur = () => {
    const value = form.business_name.trim();
    if (!value) {
      setBusinessNameError('Business name is required.');
    } else if (value.length < 2) {
      setBusinessNameError('Business name must be at least 2 characters.');
    } else if (value.length > 100) {
      setBusinessNameError('Business name must be at most 100 characters.');
    } else {
      setBusinessNameError('');
    }
  };



  const handleOtherIssueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setOtherIssueDescription(value);
    setOtherIssueError('');

    // Real-time validation for character limit
    if (value.length > 120) {
      setOtherIssueError('Issue type must be at most 120 characters.');
    }
  };



  // Check if all required fields are filled and all validation errors are cleared
  const isFormValid = () => {
    const hasName = form.name.trim() !== '';
    const hasEmail = form.email.trim() !== '';
    const hasBusinessId = form.business_id.trim() !== '';
    const hasBusinessName = form.business_name.trim() !== '';
    const hasSubject = form.subject.trim() !== '';
    const hasMessage = form.message.trim() !== '';
    const hasIssueType = issueType.trim() !== '';
    const hasOtherIssue = issueType !== 'Other' || otherIssueDescription.trim() !== '';

    // Check if all validation errors are empty
    const noValidationErrors =
      !nameError &&
      !emailError &&
      !businessIdError &&
      !businessNameError &&
      !subjectError &&
      !messageError &&
      !issueTypeError &&
      !otherIssueError &&
      !error;

    return hasName && hasEmail && hasBusinessId && hasBusinessName &&
      hasSubject && hasMessage && hasIssueType && hasOtherIssue &&
      noValidationErrors;
  };



  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');



    // Clear previous validation errors
    setSubjectError('');
    setMessageError('');
    setOtherIssueError('');
    setIssueTypeError('');
    setBusinessIdError('');
    setBusinessNameError('');
    setNameError('');
    setEmailError('');



    // Check required fields
    if (!form.name.trim()) {
      setNameError('Customer name is required.');
      return;
    }
    if (!form.email.trim()) {
      setEmailError('Email is required.');
      return;
    }
    if (!form.business_id.trim()) {
      setError('Business ID is required.');
      return;
    }
    if (!form.business_name.trim()) {
      setError('Business name is required.');
      return;
    }
    if (!form.subject.trim()) {
      setError('Subject is required.');
      return;
    }
    if (!form.message.trim()) {
      setError('Message is required.');
      return;
    }
    // Issue Type: rely on field-level validation and native "required"



    // Validate character lengths
    const subject = form.subject.trim();
    if (subject.length < 2) {
      setSubjectError('Subject must be at least 2 characters.');
      setError('Please fix validation errors before submitting.');
      return;
    }
    if (subject.length > 250) {
      setSubjectError('Subject must be at most 250 characters.');
      setError('Please fix validation errors before submitting.');
      return;
    }
    if (!/[A-Za-z]/.test(subject)) {
      setSubjectError('Subject must include at least one letter.');
      setError('Please fix validation errors before submitting.');
      return;
    }



    let message = form.message.trim();
    message = stripHtml(message);
    if (message.length < 2) {
      setMessageError('Message must be at least 2 characters.');
      setError('Please fix validation errors before submitting.');
      return;
    }
    if (message.length > 1000) {
      setMessageError('Message must be at most 1000 characters.');
      setError('Please fix validation errors before submitting.');
      return;
    }



    // Use the exact dropdown selection - no mapping or transformation
    // issueType should be the exact value from dropdown like "Login or Access Issue", "Bug or Error", etc.
    const finalIssueType = issueType === 'Other' ? otherIssueDescription : issueType;

    // Create payload with ONLY the 7 required fields - NO category, NO priority
    const payload = {
      business_id: form.business_id,
      business_name: form.business_name,
      customer_email: form.email,
      customer_name: form.name,
      description: form.message,
      issue_type: finalIssueType, // Exact dropdown value: "Login or Access Issue", "Bug or Error", etc.
      title: form.subject
    };

    // Ensure payload doesn't have category or priority
    if ('category' in payload || 'priority' in payload) {
      const payloadRecord = payload as Record<string, unknown>;
      delete payloadRecord.category;
      delete payloadRecord.priority;
    }

    try {
      const res = await fetch('https://py-business.converiqo.ai/api/v1/tickets/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        // let ticketData: { ticket_id?: string; id?: string; _id?: string } = {};
        // try { ticketData = await res.json(); } catch {}
        setSuccess('Application submitted!');
        setForm({ name: '', email: '', subject: '', message: '', business_id: '', business_name: '' });
        setIssueType('');
        setOtherIssueDescription('');
        setSubjectError('');
        setMessageError('');

        // const finalType = issueType === 'Other' ? otherIssueDescription : issueType;
        // const userEmail = localStorage.getItem('userEmail') || '';
        // const ticketId = ticketData.ticket_id || ticketData.id || ticketData._id || 'N/A';
        // const currentTime = new Date().toLocaleString();
        // Email notification removed - no longer using send-email endpoint

        await new Promise(r => setTimeout(r, 500));
        if (onSubmitted) await onSubmitted();
        onClose();
      } else {
        let errMsg = 'Failed to submit';
        try {
          const err = await res.json();
          errMsg = err.error || err.detail || err.message || JSON.stringify(err);
        } catch {
          errMsg = 'Failed to submit ticket';
        }
        throw new Error(errMsg);
      }
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message); else setError('Error submitting application');
    }
  };



  if (!show) return null;



  return (
    <div
      className="fixed top-0 left-0 w-full h-full z-[99999] flex items-center justify-center backdrop-blur-md bg-black/60 p-4 sm:p-6 lg:p-8"
      style={{ overflow: 'hidden', zIndex: 99999 }}
      onClick={(e) => {
        // Only close if clicking the backdrop, not the form content
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="bg-blue-50/95 dark:bg-blue-900/95 backdrop-blur-xl rounded-3xl shadow-2xl p-4 sm:p-6 w-full max-w-4xl relative border border-blue-200/20 dark:border-blue-700/30 my-8 overflow-hidden animate-fade-in max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Gradient Background Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-blue-400/5 to-indigo-500/5 rounded-3xl pointer-events-none"></div>

        <div className="relative z-10">
          {/* Beautiful Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-blue-400 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 bg-clip-text text-transparent">
                  Create New Ticket
                </h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Fill in the details to create a support ticket</p>
              </div>
            </div>
            <button
              className="p-3 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded-2xl hover:bg-red-50 dark:hover:bg-red-900/20 group"
              onClick={onClose}
              aria-label="Close"
            >
              <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-0 relative z-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-gray-700 dark:text-gray-300 font-semibold text-sm">
                  Customer Name *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 rounded-xl border-2 border-blue-200 dark:border-blue-600 bg-white/80 dark:bg-blue-800/80 backdrop-blur-sm text-blue-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium transition-all duration-300 placeholder-blue-400 dark:placeholder-blue-500"
                    placeholder="Enter customer name"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </div>
                {nameError && (
                  <div className="text-red-500 text-sm mt-2 flex items-center gap-2 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {nameError}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-gray-700 dark:text-gray-300 font-semibold text-sm">
                  Email Address *
                </label>
                <div className="relative">
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 rounded-xl border-2 border-blue-200 dark:border-blue-600 bg-white/80 dark:bg-blue-800/80 backdrop-blur-sm text-blue-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium transition-all duration-300 placeholder-blue-400 dark:placeholder-blue-500"
                    placeholder="Enter email address"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                {emailError && (
                  <div className="text-red-500 text-sm mt-2 flex items-center gap-2 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {emailError}
                  </div>
                )}
              </div>
            </div>



            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-gray-700 dark:text-gray-300 font-semibold text-sm">
                  Business ID *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="business_id"
                    value={form.business_id}
                    onChange={handleChange}
                    onBlur={handleBusinessIdBlur}
                    className="w-full px-3 py-2.5 rounded-xl border-2 border-blue-200 dark:border-blue-600 bg-white/80 dark:bg-blue-800/80 backdrop-blur-sm text-blue-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium transition-all duration-300 placeholder-blue-400 dark:placeholder-blue-500"
                    placeholder="Enter business ID"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                </div>
                {businessIdError && (
                  <div className="text-red-500 text-sm mt-2 flex items-center gap-2 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {businessIdError}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-gray-700 dark:text-gray-300 font-semibold text-sm">
                  Business Name *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="business_name"
                    value={form.business_name}
                    onChange={handleChange}
                    onBlur={handleBusinessNameBlur}
                    className="w-full px-3 py-2.5 rounded-xl border-2 border-blue-200 dark:border-blue-600 bg-white/80 dark:bg-blue-800/80 backdrop-blur-sm text-blue-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium transition-all duration-300 placeholder-blue-400 dark:placeholder-blue-500"
                    placeholder="Enter business name"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                </div>
                {businessNameError && (
                  <div className="text-red-500 text-sm mt-2 flex items-center gap-2 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {businessNameError}
                  </div>
                )}
              </div>
            </div>



            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-gray-700 dark:text-gray-300 font-semibold text-sm">
                  Issue Type *
                </label>
                <div className="relative">
                  <select
                    value={issueType}
                    onChange={(e) => {
                      setIssueType(e.target.value);
                      setIssueTypeError('');
                      // Real-time validation
                      if (!e.target.value.trim()) {
                        setIssueTypeError('Issue type is required.');
                      }
                    }}
                    onBlur={handleIssueTypeBlur}
                    className="w-full px-3 py-2.5 rounded-xl border-2 border-blue-200 dark:border-blue-600 bg-white/80 dark:bg-blue-800/80 backdrop-blur-sm text-blue-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium transition-all duration-300 appearance-none cursor-pointer"
                    required
                  >
                    <option value="">Select an issue type</option>
                    <option value="Bug or Error">🐛 Bug or Error</option>
                    <option value="Login or Access Issue">🔐 Login or Access Issue</option>
                    <option value="Billing or Payment Problem">💳 Billing or Payment Problem</option>
                    <option value="Feature Request">✨ Feature Request</option>
                    <option value="Slow or Not Working">🐌 Slow or Not Working</option>
                    <option value="Integration Issue">🔗 Integration Issue</option>
                    <option value="Data Problem">📊 Data Problem</option>
                    <option value="Email Issue">📧 Email Issue</option>
                    <option value="Security Concern">🛡️ Security Concern</option>
                    <option value="Other">❓ Other</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                {issueTypeError && (
                  <div className="text-red-500 text-sm mt-2 flex items-center gap-2 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {issueTypeError}
                  </div>
                )}
              </div>

              {issueType === 'Other' ? (
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 font-semibold text-sm">Please specify the issue type *</label>
                  <input
                    type="text"
                    value={otherIssueDescription}
                    onChange={handleOtherIssueChange}
                    onBlur={handleOtherIssueBlur}
                    className="w-full px-3 py-2.5 rounded-xl border-2 border-blue-200 dark:border-blue-600 bg-white/80 dark:bg-blue-800/80 backdrop-blur-sm text-blue-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium transition-all duration-300 placeholder-blue-400 dark:placeholder-blue-500"
                    placeholder="Please describe the issue type..."
                    required
                  />
                  {otherIssueError && (
                    <div className="text-red-500 text-sm mt-2 flex items-center gap-2 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {otherIssueError}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 font-semibold text-sm">
                    Subject *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="subject"
                      value={form.subject}
                      onChange={handleChange}
                      onBlur={handleSubjectBlur}
                      className="w-full px-3 py-2.5 rounded-xl border-2 border-blue-200 dark:border-blue-600 bg-white/80 dark:bg-blue-800/80 backdrop-blur-sm text-blue-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium transition-all duration-300 placeholder-blue-400 dark:placeholder-blue-500"
                      placeholder="Brief description of the issue"
                      required
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                      </svg>
                    </div>
                  </div>
                  {subjectError && (
                    <div className="text-red-500 text-sm mt-2 flex items-center gap-2 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {subjectError}
                    </div>
                  )}
                </div>
              )}
            </div>



            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-gray-700 dark:text-gray-300 font-semibold text-sm">
                  Message *
                </label>
                <div className="relative">
                  <textarea
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    onBlur={handleMessageBlur}
                    className="w-full px-3 py-2.5 rounded-xl border-2 border-blue-200 dark:border-blue-600 bg-white/80 dark:bg-blue-800/80 backdrop-blur-sm text-blue-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 min-h-[100px] text-sm font-medium transition-all duration-300 resize-none placeholder-blue-400 dark:placeholder-blue-500"
                    placeholder="Provide detailed information about the issue..."
                    required
                  />
                  <div className="absolute top-3 right-3 pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                </div>
                {messageError && (
                  <div className="text-red-500 text-sm mt-2 flex items-center gap-2 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {messageError}
                  </div>
                )}
              </div>
            </div>



            {error && (
              <div className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border-2 border-red-200 dark:border-red-800 rounded-2xl p-4 text-red-700 dark:text-red-400 text-sm flex items-center gap-3 shadow-lg">
                <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="font-medium">{error}</span>
              </div>
            )}

            {success && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-800 rounded-2xl p-4 text-green-700 dark:text-green-400 text-sm flex items-center gap-3 shadow-lg">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="font-medium">{success}</span>
              </div>
            )}



            <div className="flex flex-col sm:flex-row justify-end gap-4 pt-4">
              <button
                type="button"
                className="px-6 py-2.5 rounded-xl border-2 border-blue-300 dark:border-blue-600 bg-white/80 dark:bg-blue-800/80 backdrop-blur-sm text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-700 font-semibold text-sm transition-all duration-300 hover:scale-105"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isFormValid()}
                className={`px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 shadow-lg transform ${isFormValid()
                    ? 'bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-700 hover:via-blue-600 hover:to-indigo-700 text-white hover:shadow-xl hover:-translate-y-1 hover:scale-105'
                    : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create Ticket
                </div>
              </button>
            </div>
          </form>
        </div>
        <style jsx global>{`
.hide-scrollbar {
-ms-overflow-style: none;
scrollbar-width: none;
}
.hide-scrollbar::-webkit-scrollbar {
display: none;
}
@keyframes fadeIn {
from {
opacity: 0;
transform: scale(0.95) translateY(20px);
}
to {
opacity: 1;
transform: scale(1) translateY(0);
}
}
.animate-fade-in {
animation: fadeIn 0.3s ease-out;
}
`}</style>
      </div>
    </div>
  );
}






