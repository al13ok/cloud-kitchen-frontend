"use client";

 

import React from "react";
import PhoneInput2 from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { isValidPhoneNumber } from 'libphonenumber-js';
import Alert from "@/components/ui/alert/Alert";

 

interface LeadOption {
  optionid: number;
  list_label: string;
}

 

export interface LeadsFormProps {
  showAlert?: (message: string, type: string) => void;
  onSuccess?: () => void;
  open?: boolean;
  onClose?: () => void;
}

 

// Field validation errors interface
interface FieldErrors {
  name: string;
  email: string;
  phone: string;
  interest: string;
  source: string;
  message: string;
}

 

const LeadForm: React.FC<LeadsFormProps> = ({ showAlert, onSuccess, open = true, onClose }) => {
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    phone: '',
    interest: '',
    source: '',
    message: '',
  });
  
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({
    name: '',
    email: '',
    phone: '',
    interest: '',
    source: '',
    message: '',
  });
  
  const [touchedFields, setTouchedFields] = React.useState<Set<string>>(new Set());
  const [interestOptions, setInterestOptions] = React.useState<string[]>([]);
  const [sourceOptions, setSourceOptions] = React.useState<string[]>([]);
  const [formKey, setFormKey] = React.useState(0);
  const [mobile, setMobile] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  // Alert state
  const [showToastAlert, setShowToastAlert] = React.useState(false);
  const [alertTitle, setAlertTitle] = React.useState("");
  const [alertMessage, setAlertMessage] = React.useState("");

 

  // Fetch dropdown options
  React.useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    
    const fetchOptions = async () => {
      try {
        const timeoutId = setTimeout(() => {
          if (!controller.signal.aborted) {
            controller.abort();
          }
        }, 10000);
        
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/leads/options`, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data: LeadOption[] = await response.json();
        
        if (isMounted) {
          const interests = data
            .filter((item) => item.optionid === 1)
            .map((item) => item.list_label);
          const sources = data
            .filter((item) => item.optionid === 2)
            .map((item) => item.list_label);
          setInterestOptions(interests);
          setSourceOptions(sources);
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        
        if (isMounted) {
          setInterestOptions([
            'General Inquiry',
            'Product Demo',
            'Pricing Information',
            'Technical Support',
            'Partnership',
            'Investment Opportunity'
          ]);
          setSourceOptions([
            'Website',
            'Social Media',
            'Email Campaign',
            'Referral',
            'Search Engine',
            'Advertisement',
            'Other'
          ]);
        }
      }
    };
    
    fetchOptions();
    
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

 

  // Validation functions
  const validateName = (name: string): string => {
    if (!name || name.trim() === '') return "Name is required";
    if (name.trim().length < 2) return "Name must be at least 2 characters";
    if (name.length > 40) return "Name cannot exceed 40 characters";
    if (!/^[a-zA-Z\s'-]+$/.test(name)) return "Name can only contain letters, spaces, hyphens, and apostrophes";
    return '';
  };

 

  const validateEmail = (email: string): string => {
    if (!email || email.trim() === '') return "Email is required";
    if (email.length > 50) return "Email must be at most 50 characters";
    if (/\s/.test(email)) return "Email should not contain spaces";
    if (/^[^A-Za-z0-9]/.test(email)) return "Email should not start with a special character";
    if ((email.match(/@/g) || []).length !== 1) return "Email must contain exactly one @ symbol";
    if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)) return "Please enter a valid email format (e.g., name@domain.com)";
    return '';
  };

 

  const validatePhone = (phone: string): string => {
    if (!phone || phone.trim() === '') return "Mobile number is required";
    const cleanMobile = '+' + phone.replace(/[^\d]/g, '').replace(/^\+/, '');
    if (!isValidPhoneNumber(cleanMobile)) return "Please enter a valid international phone number";
    return '';
  };

 

  const validateInterest = (interest: string): string => {
    if (!interest || interest.trim() === '') return "Please select an interest";
    return '';
  };

 

  const validateSource = (source: string): string => {
    if (!source || source.trim() === '') return "Please select a source";
    return '';
  };

 

  const validateMessage = (message: string): string => {
    if (message.length > 500) return "Message cannot exceed 500 characters";
    return '';
  };

 

  // Mark field as touched
  const markFieldTouched = (fieldName: string) => {
    setTouchedFields(prev => new Set(prev).add(fieldName));
  };

 

  // Validate single field
  const validateField = (fieldName: keyof FieldErrors, value: string) => {
    let error = '';
    
    switch (fieldName) {
      case 'name':
        error = validateName(value);
        break;
      case 'email':
        error = validateEmail(value);
        break;
      case 'phone':
        error = validatePhone(value);
        break;
      case 'interest':
        error = validateInterest(value);
        break;
      case 'source':
        error = validateSource(value);
        break;
      case 'message':
        error = validateMessage(value);
        break;
    }
    
    setFieldErrors(prev => ({ ...prev, [fieldName]: error }));
    return error;
  };

 

  // Validate all fields
  const validateAllFields = (): boolean => {
    const errors: FieldErrors = {
      name: validateName(formData.name),
      email: validateEmail(formData.email),
      phone: validatePhone(mobile),
      interest: validateInterest(formData.interest),
      source: validateSource(formData.source),
      message: validateMessage(formData.message),
    };
    
    setFieldErrors(errors);
    
    // Mark all fields as touched
    setTouchedFields(new Set(['name', 'email', 'phone', 'interest', 'source', 'message']));
    
    // Return true if no errors
    return !Object.values(errors).some(error => error !== '');
  };

 

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Prevent typing beyond character limits
    let finalValue = value;
    if (name === 'name' && value.length > 40) {
      finalValue = value.slice(0, 40);
    } else if (name === 'email' && value.length > 50) {
      finalValue = value.slice(0, 50);
    }
    
    setFormData(prev => ({ ...prev, [name]: finalValue }));
    
    // Validate on change if field has been touched
    if (touchedFields.has(name)) {
      validateField(name as keyof FieldErrors, finalValue);
    }
  };

 

  const handleBlur = (fieldName: string, value: string) => {
    markFieldTouched(fieldName);
    validateField(fieldName as keyof FieldErrors, value);
  };

 

  const handlePhoneChange = (phone: string) => {
    setMobile(phone);
    if (touchedFields.has('phone')) {
      validateField('phone', phone);
    }
  };

 

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (isSubmitting) return;

 

    // Validate all fields
    const isValid = validateAllFields();
    
    if (!isValid) {
      // Show error alert
      setAlertTitle("Error");
      setAlertMessage('Please fix all validation errors before submitting');
      setShowToastAlert(true);
      
      // Also call the showAlert prop if provided (for backward compatibility)
      if (showAlert) {
        showAlert('Please fix all validation errors before submitting', 'error');
      }
      return;
    }

 

    setIsSubmitting(true);

 

    const cleanMobile = '+' + mobile.replace(/[^\d]/g, '').replace(/^\+/, '');
    
    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      phone: cleanMobile,
      source: formData.source,
      interest: formData.interest,
      message: formData.message.trim(),
      lead_metadata: {
        additionalProp1: {},
        interest: formData.interest
      },
    };

 

    try {
      const leadRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/leads/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      let leadResData: unknown = {};
      try { leadResData = await leadRes.json(); } catch {}
      
      if (!leadRes.ok) {
        setIsSubmitting(false);
        
        // Handle field-specific errors from API if available
        const errorData = leadResData as { error?: string; errors?: Record<string, string> };
        
        if (errorData.errors) {
          const newFieldErrors: Partial<FieldErrors> = {};
          Object.entries(errorData.errors).forEach(([field, message]) => {
            if (field in fieldErrors) {
              newFieldErrors[field as keyof FieldErrors] = message;
            }
          });
          setFieldErrors(prev => ({ ...prev, ...newFieldErrors }));
        }
        
        // Show error alert
        setAlertTitle("Error");
        setAlertMessage(errorData.error || 'Failed to create lead. Please try again.');
        setShowToastAlert(true);
        
        // Also call the showAlert prop if provided (for backward compatibility)
        if (showAlert) {
          showAlert(errorData.error || 'Failed to create lead. Please try again.', 'error');
        }
        return;
      }

 

      // Success
      setIsSubmitting(false);
      
      // Extract lead ID from response if available
      const leadId = (leadResData as { id?: string; lead_id?: string; leadId?: string })?.id || 
                     (leadResData as { id?: string; lead_id?: string; leadId?: string })?.lead_id || 
                     (leadResData as { id?: string; lead_id?: string; leadId?: string })?.leadId || '';
      const leadIdDisplay = leadId ? ` Lead ID: ${leadId}.` : '';
      
      // Reset form
      setFormData({ name: '', email: '', phone: '', interest: '', source: '', message: '' });
      setMobile('');
      setFieldErrors({ name: '', email: '', phone: '', interest: '', source: '', message: '' });
      setTouchedFields(new Set());
      setFormKey(k => k + 1);
      
      // Show success alert
      setAlertTitle("Success");
      setAlertMessage(`Lead created successfully!${leadIdDisplay} is being processed in background. Full details will be available shortly.`);
      setShowToastAlert(true);
      
      // Also call the showAlert prop if provided (for backward compatibility)
      if (showAlert) {
        showAlert('Lead created successfully!', 'success');
      }
      
      if (onSuccess) onSuccess();

 

      // Send emails in background
      (async () => {
        try {
          let confirmationMessage = '';
          try {
            const confirmationRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/leads/confirmation-message`);
            const confirmationData = await confirmationRes.json();
            if (confirmationData?.message) {
              confirmationMessage = `Dear ${formData.name},\n\n${confirmationData.message}`;
            }
          } catch {}

 

          const emailPayload = {
            to_email: formData.email,
            subject: 'Thank you for your inquiry',
            body: confirmationMessage
          };
          await fetch(`${process.env.NEXT_PUBLIC_API_URL}/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(emailPayload),
          });

 

          const alertsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/leads/email-alerts`);
          const alertsData = await alertsRes.json();
          const alertEmails = Array.isArray(alertsData) ? alertsData.map(e => e.email) : [];
          const leadScore = (leadResData as { score?: string | number }).score ?? '—';
          const interest = payload.interest || (typeof payload.lead_metadata === 'object' ? payload.lead_metadata.interest : '');
          const alertBody = `🚀 New Lead Submitted:\n\nName: ${payload.name}\nEmail: ${payload.email}\nPhone: ${payload.phone}\nSource: ${payload.source}\nInterest: ${interest}\nLead Score: ${leadScore}`;
          
          for (const to_email of alertEmails) {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/send-email`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to_email,
                subject: '🚀 New Lead Submitted',
                body: alertBody,
              }),
            });
          }
        } catch {}
      })();
    } catch {
      setIsSubmitting(false);
      
      // Show error alert
      setAlertTitle("Error");
      setAlertMessage('Server error. Please try again later.');
      setShowToastAlert(true);
      
      // Also call the showAlert prop if provided (for backward compatibility)
      if (showAlert) {
        showAlert('Server error. Please try again later.', 'error');
      }
    }
  };

 

  // Check if form is valid for submit button
  const isFormValid = () => {
    return (
      formData.name.trim() !== '' &&
      formData.email.trim() !== '' &&
      mobile.trim() !== '' &&
      formData.interest.trim() !== '' &&
      formData.source.trim() !== '' &&
      !Object.values(fieldErrors).some(error => error !== '')
    );
  };

 

  // Handle Enter key submission
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
      e.preventDefault();
      if (isFormValid() && !isSubmitting) {
        handleSubmit(e as unknown as React.FormEvent);
      }
    }
  };

  // Auto-hide alert after 5 seconds
  React.useEffect(() => {
    if (showToastAlert) {
      const timer = setTimeout(() => {
        setShowToastAlert(false);
        setAlertMessage("");
        setAlertTitle("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showToastAlert]);

 

  if (!open) return null;

 

  return (
    <>
      {/* Alert */}
      {showToastAlert && (
        <Alert
          variant={alertTitle === "Error" ? "error" : "success"}
          title={alertTitle}
          message={alertMessage}
          showCloseButton={true}
          onClose={() => {
            setShowToastAlert(false);
            setAlertMessage("");
            setAlertTitle("");
          }}
        />
      )}
      
      {/* Blur overlay */}
      <div 
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Lead Form Modal */}
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" 
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="lead-form-title"
      >
        <div 
          className="relative w-full max-w-2xl bg-transparent rounded-2xl outline-none focus:outline-none my-8" 
          onClick={e => e.stopPropagation()}
        >
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b rounded-t-2xl border-gray-200 dark:border-gray-700 bg-gradient-to-r from-slate-50 to-gray-50 dark:from-gray-800 dark:to-gray-800">
              <div>
                <h2 id="lead-form-title" className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Create Lead
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Fill in the details to create a new lead. Fields marked with <span className="text-red-500">*</span> are required.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 rounded-lg text-lg w-10 h-10 flex justify-center items-center transition-all shadow-sm hover:shadow"
                aria-label="Close dialog"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 14 14">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
                </svg>
              </button>
            </div>
            
            {/* Form */}
            <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
              <form 
                key={formKey} 
                onSubmit={handleSubmit} 
                onKeyDown={handleKeyDown}
                className="space-y-6"
                noValidate
              >
                {/* Basic Info Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Basic Information
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Name Field */}
                    <div>
                      <label 
                        htmlFor="lead-name" 
                        className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2"
                      >
                        Name <span className="text-red-500" aria-label="required">*</span>
                      </label>
                      <input
                        id="lead-name"
                        type="text"
                        name="name"
                        placeholder="Enter full name"
                        value={formData.name}
                        onChange={handleChange}
                        onBlur={(e) => handleBlur('name', e.target.value)}
                        maxLength={40}
                        required
                        aria-required="true"
                        aria-invalid={touchedFields.has('name') && fieldErrors.name !== ''}
                        aria-describedby={touchedFields.has('name') && fieldErrors.name ? 'name-error' : undefined}
                        className={`w-full px-4 py-2.5 rounded-lg border ${
                          touchedFields.has('name') && fieldErrors.name 
                            ? 'border-red-500 focus:ring-red-500' 
                            : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
                        } bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 transition-all`}
                      />
                      {touchedFields.has('name') && fieldErrors.name && (
                        <div id="name-error" className="flex items-start gap-1 mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
                          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                          <span>{fieldErrors.name}</span>
                        </div>
                      )}
                    </div>

                    {/* Email Field */}
                    <div>
                      <label 
                        htmlFor="lead-email" 
                        className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2"
                      >
                        Email <span className="text-red-500" aria-label="required">*</span>
                      </label>
                      <input
                        id="lead-email"
                        type="email"
                        name="email"
                        placeholder="name@example.com"
                        value={formData.email}
                        onChange={handleChange}
                        onBlur={(e) => handleBlur('email', e.target.value)}
                        maxLength={50}
                        required
                        autoCapitalize="none"
                        autoCorrect="off"
                        aria-required="true"
                        aria-invalid={touchedFields.has('email') && fieldErrors.email !== ''}
                        aria-describedby={touchedFields.has('email') && fieldErrors.email ? 'email-error' : 'email-help'}
                        className={`w-full px-4 py-2.5 rounded-lg border ${
                          touchedFields.has('email') && fieldErrors.email 
                            ? 'border-red-500 focus:ring-red-500' 
                            : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
                        } bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 transition-all`}
                      />
                      {touchedFields.has('email') && fieldErrors.email && (
                        <div id="email-error" className="flex items-start gap-1 mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
                          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                          <span>{fieldErrors.email}</span>
                        </div>
                      )}
                      {!fieldErrors.email && !touchedFields.has('email') && (
                        <p id="email-help" className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                          We&apos;ll never share your email with anyone else.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Mobile Number Field */}
                    <div>
                      <label 
                        htmlFor="lead-phone" 
                        className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2"
                      >
                        Mobile Number <span className="text-red-500" aria-label="required">*</span>
                      </label>
                      <div className="relative">
                        <PhoneInput2
                          country={'in'}
                          value={mobile}
                          onChange={handlePhoneChange}
                          inputProps={{
                            id: 'lead-phone',
                            name: 'mobile',
                            required: true,
                            'aria-required': 'true',
                            'aria-invalid': touchedFields.has('phone') && fieldErrors.phone !== '',
                            'aria-describedby': touchedFields.has('phone') && fieldErrors.phone ? 'phone-error' : 'phone-help',
                            onBlur: () => handleBlur('phone', mobile),
                          }}
                          inputClass={`px-4 py-2.5 rounded-lg border ${
                            touchedFields.has('phone') && fieldErrors.phone 
                              ? 'border-red-500' 
                              : 'border-gray-300 dark:border-gray-600'
                          } bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 ${
                            touchedFields.has('phone') && fieldErrors.phone 
                              ? 'focus:ring-red-500' 
                              : 'focus:ring-blue-500'
                          } transition-all w-full`}
                          containerClass="w-full"
                          dropdownClass="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-700 z-50"
                          buttonClass={`bg-white dark:bg-gray-800 ${
                            touchedFields.has('phone') && fieldErrors.phone 
                              ? 'border-red-500' 
                              : 'border-gray-300 dark:border-gray-600'
                          } text-gray-900 dark:text-gray-100 border-r-0 rounded-l-lg`}
                          buttonStyle={{
                            backgroundColor: 'transparent',
                            borderColor: 'inherit',
                            color: 'inherit',
                            borderTopLeftRadius: '8px',
                            borderBottomLeftRadius: '8px',
                            borderTopRightRadius: '0px',
                            borderBottomRightRadius: '0px',
                            borderRight: 'none',
                            height: '44px'
                          }}
                          inputStyle={{
                            backgroundColor: 'transparent',
                            borderColor: 'inherit',
                            color: 'inherit',
                            borderTopLeftRadius: '0px',
                            borderBottomLeftRadius: '0px',
                            borderTopRightRadius: '8px',
                            borderBottomRightRadius: '8px',
                            width: '100%',
                            height: '44px',
                            borderLeft: 'none'
                          }}
                          enableSearch
                          searchPlaceholder="Search country..."
                          preferredCountries={['in', 'us', 'gb']}
                          autoFormat={true}
                          searchNotFound="No country found"
                          enableAreaCodes={true}
                        />
                      </div>
                      {touchedFields.has('phone') && fieldErrors.phone && (
                        <div id="phone-error" className="flex items-start gap-1 mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
                          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                          <span>{fieldErrors.phone}</span>
                        </div>
                      )}
                      {!fieldErrors.phone && !touchedFields.has('phone') && (
                        <p id="phone-help" className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                          Include country code for international numbers
                        </p>
                      )}
                    </div>

                    {/* Interest Field */}
                    <div>
                      <label 
                        htmlFor="lead-interest" 
                        className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-200 mb-2"
                      >
                        Interest <span className="text-red-500" aria-label="required">*</span>
                        <span 
                          className="inline-flex items-center justify-center w-4 h-4 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 cursor-help"
                          title="What is the lead interested in?"
                        >
                          <svg fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                          </svg>
                        </span>
                      </label>
                      <select
                        id="lead-interest"
                        name="interest"
                        value={formData.interest}
                        onChange={handleChange}
                        onBlur={(e) => handleBlur('interest', e.target.value)}
                        required
                        aria-required="true"
                        aria-invalid={touchedFields.has('interest') && fieldErrors.interest !== ''}
                        aria-describedby={touchedFields.has('interest') && fieldErrors.interest ? 'interest-error' : undefined}
                        className={`w-full px-4 py-2.5 rounded-lg border ${
                          touchedFields.has('interest') && fieldErrors.interest 
                            ? 'border-red-500 focus:ring-red-500' 
                            : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
                        } bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 transition-all cursor-pointer`}
                      >
                        <option value="" disabled>Select interest...</option>
                        {interestOptions.map((opt, i) => (
                          <option key={i} value={opt}>{opt}</option>
                        ))}
                      </select>
                      {touchedFields.has('interest') && fieldErrors.interest && (
                        <div id="interest-error" className="flex items-start gap-1 mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
                          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                          <span>{fieldErrors.interest}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Source Field */}
                  <div>
                    <label 
                      htmlFor="lead-source" 
                      className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-200 mb-2"
                    >
                      Source <span className="text-red-500" aria-label="required">*</span>
                      <span 
                        className="inline-flex items-center justify-center w-4 h-4 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 cursor-help"
                        title="How did the lead find us?"
                      >
                        <svg fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                        </svg>
                      </span>
                    </label>
                    <select
                      id="lead-source"
                      name="source"
                      value={formData.source}
                      onChange={handleChange}
                      onBlur={(e) => handleBlur('source', e.target.value)}
                      required
                      aria-required="true"
                      aria-invalid={touchedFields.has('source') && fieldErrors.source !== ''}
                      aria-describedby={touchedFields.has('source') && fieldErrors.source ? 'source-error' : undefined}
                      className={`w-full px-4 py-2.5 rounded-lg border ${
                        touchedFields.has('source') && fieldErrors.source 
                          ? 'border-red-500 focus:ring-red-500' 
                          : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
                      } bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 transition-all cursor-pointer`}
                    >
                      <option value="" disabled>Select source...</option>
                      {sourceOptions.map((opt, i) => (
                        <option key={i} value={opt}>{opt}</option>
                      ))}
                    </select>
                    {touchedFields.has('source') && fieldErrors.source && (
                      <div id="source-error" className="flex items-start gap-1 mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
                        <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <span>{fieldErrors.source}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-3 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400">
                      Additional Information (Optional)
                    </span>
                  </div>
                </div>

                {/* Message Field */}
                <div>
                  <label 
                    htmlFor="lead-message" 
                    className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2"
                  >
                    Message
                  </label>
                  <textarea
                    id="lead-message"
                    name="message"
                    placeholder="Enter any additional information or notes..."
                    value={formData.message}
                    onChange={handleChange}
                    onBlur={(e) => handleBlur('message', e.target.value)}
                    rows={4}
                    maxLength={500}
                    aria-describedby={fieldErrors.message ? 'message-error' : 'message-help'}
                    className={`w-full px-4 py-2.5 rounded-lg border ${
                      fieldErrors.message 
                        ? 'border-red-500 focus:ring-red-500' 
                        : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
                    } bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 transition-all resize-none`}
                  />
                  {fieldErrors.message && (
                    <div id="message-error" className="flex items-start gap-1 mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
                      <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <span>{fieldErrors.message}</span>
                    </div>
                  )}
                  {!fieldErrors.message && (
                    <p id="message-help" className="mt-1.5 text-xs text-gray-500 dark:text-gray-400 text-right">
                      {formData.message.length}/500 characters
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !isFormValid()}
                    className={`flex-1 px-6 py-3 rounded-lg font-medium text-white flex items-center justify-center gap-2 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      isSubmitting || !isFormValid()
                        ? 'bg-blue-400 dark:bg-blue-600 cursor-not-allowed opacity-60' 
                        : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                    }`}
                    aria-busy={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                        </svg>
                        <span>Creating Lead...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Create Lead</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Keyboard hint */}
                <p className="text-xs text-center text-gray-500 dark:text-gray-400 -mt-2">
                  Press <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono">Enter</kbd> to submit
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

 

export default LeadForm;
