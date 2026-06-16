'use client';

 

import React, { useState, useEffect } from 'react';
import PhoneInput2 from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { isValidPhoneNumber } from 'libphonenumber-js';
import Alert from "@/components/ui/alert/Alert";
// Removed unused icon imports

 

export default function JobApplicationForm({ open, onClose }: { open: boolean, onClose: () => void }) {
  // States for categories and experiences
  const [categories, setCategories] = useState<string[]>([]);
  const [experiences, setExperiences] = useState<string[]>([]);
  const [, setLoading] = useState(true);

 

  // Modal form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [resume, setResume] = useState<File | null>(null);
  const [category, setCategory] = useState('');
  const [experience, setExperience] = useState('');

 

  // Validation states
  const [emailError, setEmailError] = useState('');
  const [showEmailExample, setShowEmailExample] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [showPhoneExample, setShowPhoneExample] = useState(false);
  const [nameError, setNameError] = useState('');
  const [showNameExample, setShowNameExample] = useState(false);

  // Alert state
  const [showAlert, setShowAlert] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");

 

  // Removed unused help panel state

 

  // Auto-hide alerts after 5 seconds
  React.useEffect(() => {
    if (showEmailExample) {
      const timer = setTimeout(() => {
        setShowEmailExample(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showEmailExample]);

 

  React.useEffect(() => {
    if (phoneError) {
      setShowPhoneExample(true);
      const timer = setTimeout(() => {
        setPhoneError('');
        setShowPhoneExample(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [phoneError]);

 

  React.useEffect(() => {
    if (showNameExample) {
      const timer = setTimeout(() => {
        setShowNameExample(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showNameExample]);

  // Auto-hide alert after 5 seconds
  React.useEffect(() => {
    if (showAlert) {
      const timer = setTimeout(() => {
        setShowAlert(false);
        setAlertMessage("");
        setAlertTitle("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showAlert]);

 

  // Prevent background scrolling when modal is open
  React.useEffect(() => {
    if (open) {
      // Save current scroll position
      const scrollY = window.scrollY;
     
      // Prevent scrolling on body
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
     
      return () => {
        // Restore scrolling when modal closes
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
       
        // Restore scroll position
        window.scrollTo(0, scrollY);
      };
    }
  }, [open]);

  // List of allowed email domains
  // const allowedDomains = [
  //   'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com',
  //   'zoho.com', 'protonmail.com', 'mail.com', 'aol.com', 'gmx.com',
  //   'Mobiloitte.com', 'Mobiloitte.in', 'Mobiloitte.org'
  // ];

  // Robust email validation with strict regex
  const validateEmail = (email: string): string | true => {
    if (!email) return "Email is required.";

    if (/\s/.test(email)) return "Email should not contain blank spaces.";
    if (/^[^A-Za-z0-9]/.test(email)) return "Should not start with a special character.";
    if ((email.match(/@/g) || []).length !== 1) return "There must be only one @ symbol.";
    if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)) return "Format: abc@abc.domain only.";
    
    // Stricter regex validation
    const emailRegex = /^(?!.*\.\.)(?!\.)[a-zA-Z0-9._%+-]{2,64}(?<!\.)@[a-zA-Z0-9-]+(\.[a-zA-Z]{2,})+$/;
   
    if (!emailRegex.test(email)) {
      return "Please enter a valid email address (e.g., john.doe@gmail.com)";
    }
   
    // Removed domain restriction - now accepts all valid domains
    
    return true;
  };

 

  // Name validation with minimum length check
  const validateName = (name: string): string | true => {
    if (!name.trim()) return "Full name is required.";
    if (name.trim().length < 2) return "Full name must be at least 2 characters.";
    return true;
  };

 

  // Fetch categories and experiences
  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      setLoading(true);

 

      try {
        const catRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/jobs/categories`);
        if (catRes.ok) {
          const catData = await catRes.json();
          setCategories(Array.isArray(catData) ? catData.map((c: { name: string }) => c.name) : []);
        }
      } catch (e) {
        console.error('Failed fetching categories:', e);
        setCategories([]);
      }

 

      try {
        const expRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/jobs/experiences`);
        if (expRes.ok) {
          const expData = await expRes.json();
          setExperiences(Array.isArray(expData) ? expData.map((e: { name: string }) => e.name) : []);
        }
      } catch (e) {
        console.error('Failed fetching experience:', e);
        setExperiences([]);
      }

 

      if (!cancelled) setLoading(false);
    }
    fetchData();
    return () => {
      cancelled = true;
    };
  }, []);

 

  // Modal form submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
   
    // Simple validation
    const nameValidation = validateName(name);
    if (nameValidation !== true) {
      alert(nameValidation as string);
      return;
    }
   
    if (!email.trim()) {
      alert('Please enter your email address.');
      return;
    }
   
    // Validate email format
    const emailValidation = validateEmail(email);
    if (emailValidation !== true) {
      alert(emailValidation as string);
      return;
    }
   
    if (!phone) {
      alert('Please enter your phone number.');
      return;
    }
   
    // Validate phone number
    // const cleanPhone = '+' + phone.replace(/[^\d]/g, '').replace(/^\+/, '');
    // if (!isValidPhoneNumber(cleanPhone)) {
    //   alert('Please enter a valid international phone number.');
    //   return;
    // }
   
    if (!resume) {
      alert('Please upload your resume.');
      return;
    }
   
    if (!category) {
      alert('Please select a category.');
      return;
    }
   
    if (!experience) {
      alert('Please select your experience level.');
      return;
    }

 

    const formData = new FormData();
    formData.append('name', name);
    formData.append('email', email);
    formData.append('mobile', phone);
    formData.append('job_category', category);
    formData.append('experience', experience);
    if (resume) {
      formData.append('file', resume as File);
    }
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/jobs/upload`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        // Get response data to extract application ID if available
        let responseData: unknown = {};
        try {
          responseData = await res.json();
        } catch {}
        
        // Extract application ID from response if available
        const applicationId = (responseData as { id?: string; application_id?: string; applicationId?: string })?.id || 
                              (responseData as { id?: string; application_id?: string; applicationId?: string })?.application_id || 
                              (responseData as { id?: string; application_id?: string; applicationId?: string })?.applicationId || '';
        const applicationIdDisplay = applicationId ? ` Application ID: ${applicationId}.` : '';
        
        // Reset form
        setName('');
        setEmail('');
        setPhone('');
        setResume(null);
        setCategory('');
        setExperience('');
        setNameError('');
        setEmailError('');
        setPhoneError('');
        
        // Show success alert
        setAlertTitle("Success");
        setAlertMessage(`Job application submitted successfully!${applicationIdDisplay} is being processed in background. Full details will be available shortly.`);
        setShowAlert(true);
        
        // Close modal after a short delay
        setTimeout(() => {
          onClose();
        }, 100);
      } else {
        setAlertTitle("Error");
        setAlertMessage('Failed to submit. Please try again.');
        setShowAlert(true);
      }
    } catch {
      setAlertTitle("Error");
      setAlertMessage('Error submitting form.');
      setShowAlert(true);
    }
  };

 

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

 

  // Only render the modal if open is true
  if (!open) return null;

 

  return (
    <>
      {/* Alert */}
      {showAlert && (
        <Alert
          variant={alertTitle === "Error" ? "error" : "success"}
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
      
      {/* Blur overlay for job application modal */}
      <div className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[2px]" onClick={onClose} />
      {/* Job Application Modal */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
        onClick={onClose}
      >
        <div
          className="relative w-full max-w-md bg-transparent rounded-2xl outline-none focus:outline-none my-8"
          onClick={e => e.stopPropagation()}
        >
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b rounded-t-2xl border-gray-200 dark:border-gray-700">
              <h3 className="text-lg sm:text-2xl font-semibold text-gray-900 dark:text-gray-100">Job Application</h3>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 dark:text-gray-500 bg-transparent hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 rounded-lg text-lg sm:text-xl w-8 h-8 flex justify-center items-center"
              >
                <svg className="w-4 sm:w-5 h-4 sm:h-5" aria-hidden="true" fill="none" viewBox="0 0 14 14">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
                </svg>
              </button>
            </div>
            <div className="p-4 sm:p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <label htmlFor="name" className="block font-semibold text-gray-800 dark:text-gray-200 mb-1 text-sm sm:text-base">
                      Full Name
                    </label>
                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => {
                        let value = e.target.value;
                        // Prevent typing beyond 60 characters
                        if (value.length > 60) {
                          value = value.slice(0, 60);
                        }
                        setName(value);
                        const result = validateName(value);
                        setNameError(result === true ? '' : result);
                      }}
                      onBlur={(e) => {
                        const result = validateName(e.target.value);
                        setNameError(result === true ? '' : result);
                      }}
                      onFocus={() => {
                        setNameError('');
                        setShowNameExample(false);
                      }}
                      maxLength={60}
                      required
                      placeholder="Enter your name"
                      className={`border rounded-lg p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm sm:text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                        nameError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    />
                    {nameError && (
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded px-4 py-2 text-sm font-medium mt-1">{nameError}</div>
                    )}
                    {showNameExample && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Example: <span className="font-mono">John Doe</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <label htmlFor="email" className="block font-semibold text-gray-800 dark:text-gray-200 mb-1 text-sm sm:text-base">
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        let value = e.target.value;
                        // Prevent typing beyond 60 characters
                        if (value.length > 60) {
                          value = value.slice(0, 60);
                        }
                        setEmail(value);
                        const result = validateEmail(value);
                        setEmailError(result === true ? '' : result);
                      }}
                      onBlur={(e) => {
                        const result = validateEmail(e.target.value);
                        setEmailError(result === true ? '' : result);
                      }}
                      onFocus={() => {
                        setEmailError('');
                        setShowEmailExample(false);
                      }}
                      maxLength={60}
                      required
                      autoCapitalize="none"
                      autoCorrect="off"
                      placeholder="Enter your email"
                      className={`border rounded-lg p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm sm:text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                        emailError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    />
                    {emailError && (
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded px-4 py-2 text-sm font-medium mt-1">{emailError}</div>
                    )}
                    {showEmailExample && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Example: <span className="font-mono">example@domain.com</span>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label htmlFor="phone" className="block font-semibold text-gray-800 dark:text-gray-200 mb-1 text-sm sm:text-base">
                    Mobile
                  </label>
                  <div className="w-full">
                    <PhoneInput2
                      country={'in'}
                      value={phone}
                      onChange={(phone: string) => {
                        setPhone(phone);
                        const cleanMobile = '+' + phone.replace(/[^\d]/g, '').replace(/^\+/, '');
                        if (!isValidPhoneNumber(cleanMobile)) {
                          setPhoneError('Please enter a valid international phone number');
                        } else {
                          setPhoneError('');
                        }
                      }}
                      inputProps={{
                        name: 'mobile',
                        required: true,
                        autoFocus: false,
                        onFocus: () => {
                          setPhoneError('');
                          setShowPhoneExample(false);
                        },
                      }}
                      inputClass="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                      containerClass="w-full"
                      dropdownClass="bg-white dark:bg-gray-700"
                      enableSearch
                    />
                  </div>
                  {phoneError && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded px-4 py-2 text-sm font-medium mt-1">{phoneError}</div>
                  )}
                  {showPhoneExample && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Example: <span className="font-mono">+919876543210</span>
                    </div>
                  )}
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">Your phone number is kept private and secure.</div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <label htmlFor="category" className="block font-semibold text-gray-800 dark:text-gray-200 mb-1 text-sm sm:text-base">
                      Category
                    </label>
                    <select
                      id="category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      required
                      className="border rounded-lg p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 transition border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm sm:text-base"
                    >
                      <option value="">Select Category</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label htmlFor="experience" className="block font-semibold text-gray-800 dark:text-gray-200 mb-1 text-sm sm:text-base">
                      Experience
                    </label>
                    <select
                      id="experience"
                      value={experience}
                      onChange={(e) => setExperience(e.target.value)}
                      required
                      className="border rounded-lg p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 transition border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm sm:text-base"
                    >
                      <option value="">Select Experience</option>
                      {experiences.map((exp) => (
                        <option key={exp} value={exp}>
                          {exp}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label htmlFor="resume" className="block font-semibold text-gray-800 dark:text-gray-200 mb-1 text-sm sm:text-base">
                    Upload Resume
                  </label>
                  <div className="border-2 border-dashed rounded-lg flex items-center gap-3 p-3 sm:p-4 border-gray-300 dark:border-gray-600">
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 sm:w-6 text-blue-500">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 12l-4-4m4 4l4-4" />
                    </svg>
                    <label htmlFor="resume" className="cursor-pointer text-blue-600 dark:text-blue-400 font-medium text-sm sm:text-base">
                      Upload Resume
                    </label>
                    <span className="text-xs text-gray-400 dark:text-gray-500">PDF, DOC, DOCX</span>
                    <input
                      id="resume"
                      type="file"
                      accept=".pdf,.docx"
                      onChange={(e) => setResume(e.target.files ? e.target.files[0] : null)}
                      required
                      className="hidden"
                    />
                    {resume && <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{resume.name}</span>}
                  </div>
                </div>

 

                <button
                  type="submit"
                  className="w-full py-2 sm:py-3 px-4 bg-blue-600 text-white rounded-lg text-base sm:text-lg font-semibold shadow hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={
                    !name ||
                    nameError !== '' ||
                    !email ||
                    emailError !== '' ||
                    !phone ||
                    phoneError !== '' ||
                    !resume ||
                    !category ||
                    !experience
                  }
                >
                  Submit Application
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
      {/* Global styles for phone input */}
      <style jsx global>{`
        .react-tel-input .form-control {
          @apply text-xs sm:text-base;
        }
        .react-tel-input .country-list {
          @apply max-w-full sm:max-w-xs text-xs sm:text-sm;
        }
      `}</style>
    </>
  );
}
