"use client";

import React, { useState, useRef, useMemo } from "react";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { Country, State, City } from 'country-state-city';


export default function UserOnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<{
    // Personal Details
    name: string;
    email: string;
    phone: string;
    // Business Details
    companyName: string;
    businessEmail: string;
    businessAddress: string;
    businessCity: string;
    businessState: string;
    businessPostalCode: string;
    businessCountry: string;
    businessWebsite: string;
    business_id: string;
    // Billing Details
    legalBusinessName: string;
    gstTaxId: string;
    // Account Info fields
    accountFullName: string;
    accountEmail: string;
    password: string;
    confirmPassword: string;
    accountCountry: string;
    accountPhone: string;
    termsAccepted: boolean;
    emailUpdates: boolean;
    verificationCode: string[];
  }>({
    // Personal Details
    name: "",
    email: "",
    phone: "",
    // Business Details
    companyName: "",
    businessEmail: "",
    businessAddress: "",
    businessCity: "",
    businessState: "",
    businessPostalCode: "",
    businessCountry: "",
    businessWebsite: "",
    business_id: "",
    // Billing Details
    legalBusinessName: "",
    gstTaxId: "",
    // Account Info fields
    accountFullName: "",
    accountEmail: "",
    password: "",
    confirmPassword: "",
    accountCountry: "",
    accountPhone: "",
    termsAccepted: false,
    emailUpdates: false,
    verificationCode: ["", "", "", "", "", ""],
  });

  type ErrorsType = Partial<{
    name: string;
    email: string;
    phone: string;
    dob: string;
    gender: string;
    profilePicture: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    nationality: string;
    preferredLanguage: string;
    companyName: string;
    businessEmail: string;
    businessAddress: string;
    businessCity: string;
    businessState: string;
    businessPostalCode: string;
    businessCountry: string;
    businessWebsite: string;
    business_id: string;
    legalBusinessName: string;
    gstTaxId: string;
    accountFullName: string;
    accountEmail: string;
    password: string;
    confirmPassword: string;
    accountCountry: string;
    accountPhone: string;
    termsAccepted: string;
    emailUpdates: string;
    verificationCode: string;
  }>;

  const [errors, setErrors] = useState<ErrorsType>({});
  const [globalError, setGlobalError] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);

  // For country/state/city dropdowns
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');

  // Memoize country, state, and city lists for performance
  const countryList = useMemo(() => Country.getAllCountries(), []);
  const stateList = useMemo(() => selectedCountry ? State.getStatesOfCountry(selectedCountry) : [], [selectedCountry]);
  const cityList = useMemo(() => selectedState ? City.getCitiesOfState(selectedCountry, selectedState) : [], [selectedCountry, selectedState]);

  // Sync formData with dropdowns
  React.useEffect(() => {
    setFormData(prev => ({ ...prev, businessCountry: selectedCountry }));
  }, [selectedCountry]);
  React.useEffect(() => {
    setFormData(prev => ({ ...prev, businessState: selectedState }));
  }, [selectedState]);
  React.useEffect(() => {
    setFormData(prev => ({ ...prev, businessCity: selectedCity }));
  }, [selectedCity]);

  const handleInputChange = (field: string, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Only validate and clear error if the field has been touched (has an error)
    if (errors[field as keyof typeof errors]) {
      validateField(field, value);
    }
    setGlobalError("");
  };

  // Helper to handle blur
  const handleBlur = (field: string) => {
    // Validate this field only when user leaves the field
    validateField(field);
  };

  // Update validateField to accept value as argument
  const validateField = (field: string, value?: unknown) => {
    let error = "";
    const val = value !== undefined ? value : formData[field as keyof typeof formData];
    
    if (field === "name") {
      if (!val || typeof val !== "string" || val.length < 2) {
        error = "Name must be at least 2 characters";
      } else if (!/^[A-Za-z0-9Ææß\s'\-]+$/.test(val)) {
        error = "Enter a valid name (letters, numbers, spaces, hyphens, apostrophes)";
      }
      setErrors((prev) => ({ ...prev, name: error }));
      return;
    }
    if (field === "email") {
      if (!val || typeof val !== "string") error = "Email is required";
      else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(val)) error = "Enter a valid email address";
      setErrors((prev) => ({ ...prev, email: error }));
      return;
    }
    if (field === "phone") {
      if (!val || typeof val !== "string") error = "Phone number is required";
      else if (val.length < 7) error = "Enter a valid phone number";
      setErrors((prev) => ({ ...prev, phone: error }));
      return;
    }
    // Business Details validation
    if (field === "companyName") {
      if (!val || typeof val !== "string" || val.length < 2) error = "Company/Brand name must be at least 2 characters";
      else if (!/^[A-Za-z0-9\s&.'-]+$/.test(val)) error = "Enter a valid company name";
      setErrors((prev) => ({ ...prev, companyName: error }));
      return;
    }
    if (field === "businessEmail") {
      if (!val || typeof val !== "string") error = "Business email is required";
      else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(val)) error = "Enter a valid business email address";
      else if (/(?:@gmail\.com|@yahoo\.com|@hotmail\.com|@outlook\.com|@rediffmail\.com|@aol\.com|@icloud\.com|@protonmail\.com|@zoho\.com|@mail\.com|@gmx\.com|@yandex\.com|@live\.com|@msn\.com)$/i.test(val)) error = "Please enter a valid company email address (not a public email provider).";
      setErrors((prev) => ({ ...prev, businessEmail: error }));
      return;
    }
    if (field === "businessAddress") {
      if (!val || typeof val !== "string" || !/^[A-Za-z0-9\s,.'-]{3,}$/.test(val)) {
        error = "Enter a valid business address (letters, numbers, commas, periods, min 3 chars)";
      }
      setErrors((prev) => ({ ...prev, businessAddress: error }));
      return;
    }
    if (field === "businessCity") {
      if (!val || typeof val !== "string") {
        error = "City is required";
      }
      setErrors((prev) => ({ ...prev, businessCity: error }));
      return;
    }
    if (field === "businessState") {
      if (!val || typeof val !== "string") {
        error = "State is required";
      }
      setErrors((prev) => ({ ...prev, businessState: error }));
      return;
    }
    if (field === "businessPostalCode") {
      if (!val || typeof val !== "string" || !/^[A-Za-z0-9\s-]+$/.test(val)) {
        error = "Enter a valid postal code (letters, numbers, spaces, hyphens)";
      }
      setErrors((prev) => ({ ...prev, businessPostalCode: error }));
      return;
    }
    if (field === "businessCountry") {
      if (!val || typeof val !== "string") error = "Please select your business country";
      setErrors((prev) => ({ ...prev, businessCountry: error }));
      return;
    }
    if (field === "businessWebsite") {
      // Website field is optional, no validation required
      setErrors((prev) => ({ ...prev, businessWebsite: error }));
      return;
    }
    if (field === "legalBusinessName") {
      if (val && typeof val === "string" && val.length < 2) error = "Legal business name must be at least 2 characters";
      else if (val && typeof val === "string" && !/^[A-Za-z0-9\s&.'\-(){}[\]\/\\,;:!@#$%^&*+=|<>?~`"']+$/.test(val)) error = "Enter a valid legal business name";
      setErrors((prev) => ({ ...prev, legalBusinessName: error }));
      return;
    }
    if (field === "gstTaxId") {
      if (val && typeof val === "string" && !/^[A-Za-z0-9-]+$/.test(val)) {
        error = "Enter a valid GST/Tax ID (letters, numbers, hyphens only)";
      }
      setErrors((prev) => ({ ...prev, gstTaxId: error }));
      return;
    }
    // Account Info fields
    if (field === "accountFullName") {
      if (!val || typeof val !== "string" || val.length < 2) error = "Full Name must be at least 2 characters";
      else if (!/^[A-Za-z0-9Ææß\s'\-]+$/.test(val)) error = "Enter a valid name (letters, numbers, spaces, hyphens, apostrophes)";
      setErrors((prev) => ({ ...prev, accountFullName: error }));
      return;
    }
    if (field === "accountEmail") {
      if (!val || typeof val !== "string") error = "Email is required";
      else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(val)) error = "Enter a valid email address";
      setErrors((prev) => ({ ...prev, accountEmail: error }));
      return;
    }
    if (field === "password") {
      if (!val || typeof val !== "string") error = "Password is required";
      else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/.test(val)) error = "Password must be at least 8 characters and include uppercase, lowercase, number, and special character";
      setErrors((prev) => ({ ...prev, password: error }));
      return;
    }
    if (field === "confirmPassword") {
      if (!val || typeof val !== "string") error = "Confirm password is required";
      else if (formData.password !== val) error = "Passwords do not match";
      setErrors((prev) => ({ ...prev, confirmPassword: error }));
      return;
    }
    if (field === "termsAccepted") {
      if (!val) error = "You must agree to the terms and conditions";
      setErrors((prev) => ({ ...prev, termsAccepted: error }));
      return;
    }
  };

  const validatePersonalInfo = () => {
    const newErrors: ErrorsType = {};
    
    // Personal Details validation
    if (!formData.name || typeof formData.name !== "string" || formData.name.length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    } else if (!/^[A-Za-z0-9Ææß\s'\-]+$/.test(formData.name)) {
      newErrors.name = "Enter a valid name (letters, numbers, spaces, hyphens, apostrophes)";
    }
    if (!formData.email || typeof formData.email !== "string") newErrors.email = "Email is required";
    else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.email)) newErrors.email = "Enter a valid email address";
    if (!formData.phone || typeof formData.phone !== "string") newErrors.phone = "Phone number is required";
    else if (formData.phone.length < 7) newErrors.phone = "Enter a valid phone number";
    
    // Business Details validation
    if (!formData.companyName || typeof formData.companyName !== "string" || formData.companyName.length < 2) {
      newErrors.companyName = "Company/Brand name must be at least 2 characters";
    } else if (!/^[A-Za-z0-9\s&.'-]+$/.test(formData.companyName)) {
      newErrors.companyName = "Enter a valid company name";
    }
    if (!formData.businessEmail || typeof formData.businessEmail !== "string") newErrors.businessEmail = "Business email is required";
    else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.businessEmail)) newErrors.businessEmail = "Enter a valid business email address";
    else if (/(?:@gmail\.com|@yahoo\.com|@hotmail\.com|@outlook\.com|@rediffmail\.com|@aol\.com|@icloud\.com|@protonmail\.com|@zoho\.com|@mail\.com|@gmx\.com|@yandex\.com|@live\.com|@msn\.com)$/i.test(formData.businessEmail)) newErrors.businessEmail = "Please enter a valid company email address (not a public email provider).";
    if (!formData.businessAddress || typeof formData.businessAddress !== "string" || !/^[A-Za-z0-9\s,.'-]{3,}$/.test(formData.businessAddress)) {
      newErrors.businessAddress = "Enter a valid business address (letters, numbers, commas, periods, min 3 chars)";
    }
    if (!formData.businessCity || typeof formData.businessCity !== "string") {
      newErrors.businessCity = "City is required";
    }
    if (!formData.businessState || typeof formData.businessState !== "string") {
      newErrors.businessState = "State is required";
    }
    if (!formData.businessPostalCode || typeof formData.businessPostalCode !== "string" || !/^[A-Za-z0-9\s-]+$/.test(formData.businessPostalCode)) {
      newErrors.businessPostalCode = "Enter a valid postal code (letters, numbers, spaces, hyphens)";
    }
    if (!formData.businessCountry || typeof formData.businessCountry !== "string") newErrors.businessCountry = "Please select your business country";
    // Website field is optional, no validation required
    
    // Billing Details validation (optional fields)
    if (formData.legalBusinessName && typeof formData.legalBusinessName === "string" && formData.legalBusinessName.length < 2) {
      newErrors.legalBusinessName = "Legal business name must be at least 2 characters";
    } else if (formData.legalBusinessName && typeof formData.legalBusinessName === "string" && !/^[A-Za-z0-9\s&.'\-(){}[\]\/\\,;:!@#$%^&*+=|<>?~`"']+$/.test(formData.legalBusinessName)) {
      newErrors.legalBusinessName = "Enter a valid legal business name";
    }
    if (formData.gstTaxId && typeof formData.gstTaxId === "string" && !/^[A-Za-z0-9-]+$/.test(formData.gstTaxId)) {
      newErrors.gstTaxId = "Enter a valid GST/Tax ID (letters, numbers, hyphens only)";
    }
    
    console.log('Personal Info Validation Errors:', newErrors);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateAccountInfo = () => {
    const newErrors: ErrorsType = {};
    // Full Name: required, min 2, allow special chars/numbers
    if (!formData.accountFullName || typeof formData.accountFullName !== "string" || formData.accountFullName.length < 2) {
      newErrors.accountFullName = "Full Name must be at least 2 characters";
    } else if (!/^[A-Za-z0-9Ææß\s'\-]+$/.test(formData.accountFullName)) {
      newErrors.accountFullName = "Enter a valid name (letters, numbers, spaces, hyphens, apostrophes)";
    }
    // Email
    if (!formData.accountEmail || typeof formData.accountEmail !== "string") newErrors.accountEmail = "Email is required";
    else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.accountEmail)) newErrors.accountEmail = "Enter a valid email address";
    // Password
    if (!formData.password || typeof formData.password !== "string") newErrors.password = "Password is required";
    else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/.test(formData.password)) {
      newErrors.password = "Password must be at least 8 characters and include uppercase, lowercase, number, and special character";
    }
    // Confirm Password
    if (!formData.confirmPassword || typeof formData.confirmPassword !== "string") newErrors.confirmPassword = "Confirm password is required";
    else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = "Passwords do not match";
    // Terms
    if (!formData.termsAccepted) newErrors.termsAccepted = "You must agree to the terms and conditions";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // API call helpers with enhanced error handling
  async function submitPersonalInfo() {
    setLoading(true);
    setGlobalError("");
    try {
      // Ensure website_url is absolute (prepend https:// if missing)
      let websiteUrl = formData.businessWebsite?.trim() || "";
      if (websiteUrl && !/^https?:\/\//i.test(websiteUrl)) {
        websiteUrl = "https://" + websiteUrl;
      }
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL) + "/api/v1/admin/onboarding/personal-info", {
        method: "POST",
        headers: { "Content-Type": "application/json", "accept": "application/json" },
        body: JSON.stringify({
          full_name: formData.name,
          email: formData.email, // personal email
          phone_number: formData.phone,
          phone_country_code: formData.phone ? "+" + formData.phone.replace(/[^0-9]/g, '').slice(0, formData.phone.length - 10) : "",
          company_name: formData.companyName,
          business_email: formData.businessEmail, // business email
          address: formData.businessAddress,
          city: formData.businessCity,
          state: formData.businessState,
          postal_code: formData.businessPostalCode,
          country: formData.businessCountry,
          website_url: websiteUrl,
          legal_business_name: formData.legalBusinessName,
          gst_tax_id: formData.gstTaxId,
        }),
      });
      
      // Get response text first to see raw response
      const responseText = await res.text();
      console.log('Personal info raw response:', responseText);
      
      if (!res.ok) {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
          console.log('Personal info parsed error response:', errorData);
        } catch (e) {
          console.log('Could not parse personal info response as JSON:', e);
        }
        
        let errorMsg = "Failed to submit personal info";
        if (errorData) {
          // Try multiple possible error message fields
          errorMsg = errorData.message || errorData.error || errorData.detail || errorData.msg || errorData.error_message || errorData.error_msg || errorMsg;
        } else {
          // If no JSON, use the raw response text
          errorMsg = responseText || "HTTP " + res.status + ": " + res.statusText;
        }
        
        // Business already exists case
        if (errorMsg && errorMsg.toLowerCase().includes('business already exists')) {
          setGlobalError('Business already exists. We have mailed you the user credentials to your registered email.');
          // Optionally, show a green info message or move to confirmation/verified step
          setTimeout(() => {
            setGlobalError('');
            setCurrentStep(4); // Go to verified page
          }, 3500);
          return;
        }
        
        throw new Error(errorMsg);
      }
      
      // Parse successful response to capture business_id
      interface PersonalInfoResponse {
        message?: string;
        business_id?: string;
        error?: string;
        detail?: string;
        msg?: string;
        error_message?: string;
        error_msg?: string;
      }
      
      let responseData: PersonalInfoResponse;
      try {
        responseData = JSON.parse(responseText);
        console.log('Personal info response:', responseData);
        
        // Capture business_id from response if available
        if (responseData.business_id) {
          setFormData(prev => ({
            ...prev,
            business_id: responseData.business_id || ''
          }));
          console.log('Business ID captured:', responseData.business_id);
        }
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
      }
      
      // Expecting: { "message": "Personal and business info saved. Proceed to account info.", "business_id": "STRI-RAUS-0E0DF9" }
      setCurrentStep(2);
    } catch (err) {
      console.error('Personal info submission error:', err);
      if (err instanceof Error) {
        setGlobalError(err.message || "Something went wrong");
      } else {
        setGlobalError("Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  }

  // FIXED submitAccountInfo function with enhanced debugging
  async function submitAccountInfo() {
    setLoading(true);
    setGlobalError("");
    
    // Validate field values before submission
    if (!formData.accountEmail || typeof formData.accountEmail !== 'string') {
      setGlobalError("Invalid email format");
      setLoading(false);
      return;
    }

    if (!formData.password || typeof formData.password !== 'string') {
      setGlobalError("Invalid password format");
      setLoading(false);
      return;
    }

    if (typeof formData.termsAccepted !== 'boolean') {
      setGlobalError("Terms acceptance must be a boolean value");
      setLoading(false);
      return;
    }
    
    const requestBody = {
      email: formData.accountEmail.trim().toLowerCase(), // admin email
      password: formData.password,
      full_name: formData.accountFullName, // Add full_name field
      terms_accepted: Boolean(formData.termsAccepted), // Ensure it's a boolean
      business_id: formData.business_id, // Include business_id from previous step
    };
    
    console.log('Exact request being sent:', JSON.stringify(requestBody, null, 2));
    console.log('Form data types:', {
      email: typeof formData.accountEmail,
      password: typeof formData.password,
      full_name: typeof formData.accountFullName,
      terms_accepted: typeof formData.termsAccepted,
      terms_value: formData.termsAccepted,
      business_id: formData.business_id
    });
    
    try {
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL) + "/api/v1/admin/onboarding/account-info", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          "accept": "application/json" 
        },
        body: JSON.stringify(requestBody),
      });
      
      console.log('Response headers:', res.headers);
      console.log('Response status:', res.status);
      
      // Get response text first to see raw response
      const responseText = await res.text();
      console.log('Raw response:', responseText);
      
      if (!res.ok) {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
          console.log('Account info parsed error response:', errorData);
        } catch (e) {
          console.log('Could not parse account info response as JSON:', e);
        }
        
        let errorMsg = "Failed to submit account info";
        if (errorData) {
          // Try multiple possible error message fields
          errorMsg = errorData.message || errorData.error || errorData.detail || errorData.msg || errorData.error_message || errorData.error_msg || errorMsg;
        } else {
          // If no JSON, use the raw response text
          errorMsg = responseText || "HTTP " + res.status + ": " + res.statusText;
        }
        
        throw new Error(errorMsg);
      }
      
      // Parse successful response
      let data;
      try {
        data = JSON.parse(responseText);
        console.log('Parsed success response:', data);
      } catch (e) {
        console.log('Could not parse success response as JSON:', e);
        throw new Error('Invalid response format from server');
      }
      
      // Expecting: { "message": "OTP sent to email." }
      setOtpVerified(false); // Reset OTP verification state
      setCurrentStep(3);
    } catch (err) {
      console.error('Account info submission error:', err);
      if (err instanceof Error) {
        setGlobalError(err.message || "Something went wrong");
      } else {
        setGlobalError("Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  }

  async function submitOtpVerification() {
    setLoading(true);
    setGlobalError("");
    
    // Additional validation before making the API call
    const otpCode = formData.verificationCode.join("");
    if (!otpCode || otpCode.length !== 6) {
      setGlobalError("Please enter the complete 6-digit verification code.");
      setLoading(false);
      return;
    }
    
    try {
      const requestBody = {
        email: formData.accountEmail, // always use admin email for OTP
        code: otpCode,
        business_id: formData.business_id // Include business_id from previous step
      };
      
      console.log('OTP verification request:', JSON.stringify(requestBody, null, 2));
      
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL) + "/api/v1/admin/onboarding/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json", "accept": "application/json" },
        body: JSON.stringify(requestBody),
      });
      
      // Parse the response to check if OTP verification was actually successful
      interface OtpVerificationResponse {
        message?: string;
        error?: string;
        detail?: string;
        msg?: string;
        error_message?: string;
        error_msg?: string;
      }
      
      let responseData: OtpVerificationResponse;
      try {
        responseData = await res.json();
        console.log('OTP verification response:', responseData);
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
        throw new Error("Failed to parse server response");
      }
      
      if (!res.ok) {
        let errorMsg = "Failed to verify OTP";
        if (responseData) {
          // Try multiple possible error message fields
          errorMsg = responseData.message || responseData.error || responseData.detail || responseData.msg || responseData.error_message || responseData.error_msg || errorMsg;
        } else {
          // If responseData is null, try to get raw response
          try {
            const responseText = await res.text();
            errorMsg = responseText || "HTTP " + res.status + ": " + res.statusText;
          } catch {
            errorMsg = `HTTP ${res.status}: ${res.statusText}`;
          }
        }
        throw new Error(errorMsg);
      }
      
      // Enhanced validation: Check for specific success indicators
      const isSuccess = responseData && responseData.message && (
        responseData.message.includes("verified successfully") || 
        responseData.message.includes("Super Admin registered and verified successfully") ||
        responseData.message.includes("OTP verified successfully") ||
        responseData.message.includes("Admin account created successfully")
      );
      
      if (isSuccess) {
        console.log('OTP verification successful, admin created successfully');
        setOtpVerified(true);
        // Add a small delay to ensure backend processing is complete
        setTimeout(() => {
          setCurrentStep(4);
        }, 1000);
      } else {
        // If response doesn't indicate successful verification, show error
        console.log('OTP verification response does not indicate success:', responseData);
        throw new Error("OTP verification failed. Please check your code and try again.");
      }
    } catch (err) {
      console.error('OTP verification error:', err);
      if (err instanceof Error) {
        setGlobalError(err.message || "Something went wrong");
      } else {
        setGlobalError("Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  }

  // Update nextStep to use API calls
  const nextStep = async () => {
    if (currentStep === 1 && !validatePersonalInfo()) {
      setGlobalError("Please fill all required fields correctly before proceeding.");
      return;
    }
    if (currentStep === 2 && !validateAccountInfo()) {
      setGlobalError("Please fill all required fields correctly before proceeding.");
      return;
    }
    if (currentStep === 3) {
      // Validate OTP is complete before proceeding
      const otpCode = formData.verificationCode.join("");
      if (!otpCode || otpCode.length < 6) {
        setGlobalError("Please enter the complete 6-digit verification code.");
        return;
      }
    }
    setGlobalError("");
    if (currentStep === 1) {
      await submitPersonalInfo();
    } else if (currentStep === 2) {
      await submitAccountInfo();
    } else if (currentStep === 3) {
      await submitOtpVerification();
    }
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  // OTP input refs - move useRef out of render loop
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  const handleVerificationCodeChange = (index: number, value: string) => {
    if (!/^[0-9a-zA-Z]?$/.test(value)) return;
    const newCode = [...formData.verificationCode];
    newCode[index] = value;
    setFormData(prev => ({ ...prev, verificationCode: newCode }));
    // Move to next input if value entered
    if (value && index < otpRefs.current.length - 1) {
      otpRefs.current[index + 1]?.focus();
    }
    // Move to previous input if backspace on empty
    if (!value && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const renderStepper = () => (
    <div className="flex items-center justify-center mb-10 mt-2 select-none">
      <div className="flex items-center w-full max-w-xl justify-between">
        {/* Step 1 */}
        <div className="flex flex-col items-center flex-1">
          {currentStep > 1 ? (
            <span className="w-6 h-6 flex items-center justify-center rounded-full bg-blue-600 text-white">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </span>
          ) : (
            <span className={`w-6 h-6 flex items-center justify-center rounded-full border-2 ${currentStep === 1 ? 'border-blue-600 text-blue-600' : 'border-gray-300 text-gray-500'}`}>
              1
            </span>
          )}
          <span className={`text-sm mt-1 font-medium ${(currentStep === 1 || currentStep > 1) ? 'text-blue-600' : 'text-gray-500'}`}>Personal Info</span>
        </div>
        <div className="flex-1 h-px bg-gray-200 mx-2" />
        {/* Step 2 */}
        <div className="flex flex-col items-center flex-1">
          {currentStep > 2 ? (
            <span className="w-6 h-6 flex items-center justify-center rounded-full bg-blue-600 text-white">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </span>
          ) : (
            <span className={`w-6 h-6 flex items-center justify-center rounded-full border-2 ${currentStep === 2 ? 'border-blue-600 text-blue-600' : 'border-gray-300 text-gray-500'}`}>
              2
            </span>
          )}
          <span className={`text-sm mt-1 font-medium ${(currentStep === 2 || currentStep > 2) ? 'text-blue-600' : 'text-gray-500'}`}>Account Info</span>
        </div>
        <div className="flex-1 h-px bg-gray-200 mx-2" />
        {/* Step 3 */}
        <div className="flex flex-col items-center flex-1">
          {currentStep > 3 ? (
            <span className="w-6 h-6 flex items-center justify-center rounded-full bg-blue-600 text-white">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </span>
          ) : (
            <span className={`w-6 h-6 flex items-center justify-center rounded-full border-2 ${currentStep === 3 ? 'border-blue-600 text-blue-600' : 'border-gray-300 text-gray-500'}`}>
              3
            </span>
          )}
          <span className={`text-sm mt-1 font-medium ${(currentStep === 3 || currentStep > 3) ? 'text-blue-600' : 'text-gray-500'}`}>Confirmation</span>
        </div>
      </div>
    </div>
  );

  const renderPersonalInfo = () => (
    <div className="max-w-2xl mx-auto overflow-y-auto no-scrollbar max-h-[calc(100vh-180px)] pb-24">
      {globalError && (
        <div className="mb-2 p-1 bg-red-100 border border-red-300 text-red-700 rounded text-xs font-medium">
          {globalError}
        </div>
      )}
      <h2 className="text-lg font-bold text-gray-900 mb-1">Tell us about you, your business.</h2>
      <p className="text-xs text-gray-600 mb-3">Below details are required to setup you/business with us.</p>
      
      {/* Personal Details Section */}
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-gray-800 mb-1 border-b border-gray-200 pb-1">Personal Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">Name*</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => handleInputChange('name', e.target.value)}
              onBlur={() => handleBlur('name')}
              className="w-full px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-black"
            />
            {errors.name && (
              <div className="mt-0.5 p-1 bg-red-100 border border-red-300 text-red-700 rounded text-xs font-medium">{errors.name}</div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">Email*</label>
            <input
              type="email"
              value={formData.email}
              onChange={e => handleInputChange('email', e.target.value)}
              onBlur={() => handleBlur('email')}
              className="w-full px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
            {errors.email && (
              <div className="mt-0.5 p-1 bg-red-100 border border-red-300 text-red-700 rounded text-xs font-medium">{errors.email}</div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">Phone Number*</label>
            <PhoneInput
              country={'us'}
              value={formData.phone}
              onChange={(phone) => handleInputChange('phone', phone)}
              onBlur={() => handleBlur('phone')}
              inputClass="w-full px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              containerClass="w-full"
              buttonClass="border border-gray-300 rounded-l-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              dropdownClass="border border-gray-300 rounded-md shadow-lg"
              enableSearch={true}
              searchPlaceholder="Search country..."
              inputProps={{
                required: true,
                autoComplete: 'tel'
              }}
            />
            {errors.phone && (
              <div className="mt-0.5 p-1 bg-red-100 border border-red-300 text-red-700 rounded text-xs font-medium">{errors.phone}</div>
            )}
          </div>
        </div>
      </div>

      {/* Business Details Section */}
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-gray-800 mb-1 border-b border-gray-200 pb-1">Business Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">Company/Brand Name*</label>
            <input
              type="text"
              value={formData.companyName}
              onChange={e => handleInputChange('companyName', e.target.value)}
              onBlur={() => handleBlur('companyName')}
              className="w-full px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
            {errors.companyName && (
              <div className="mt-0.5 p-1 bg-red-100 border border-red-300 text-red-700 rounded text-xs font-medium">{errors.companyName}</div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">Business Email*</label>
            <input
              type="email"
              value={formData.businessEmail}
              onChange={e => handleInputChange('businessEmail', e.target.value)}
              onBlur={() => handleBlur('businessEmail')}
              className="w-full px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
            {errors.businessEmail && (
              <div className="mt-0.5 p-1 bg-red-100 border border-red-300 text-red-700 rounded text-xs font-medium">{errors.businessEmail}</div>
            )}
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-0.5">Address*</label>
            <input
              type="text"
              value={formData.businessAddress}
              onChange={e => handleInputChange('businessAddress', e.target.value)}
              onBlur={() => handleBlur('businessAddress')}
              className="w-full px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
            {errors.businessAddress && (
              <div className="mt-0.5 p-1 bg-red-100 border border-red-300 text-red-700 rounded text-xs font-medium">{errors.businessAddress}</div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">Country*</label>
            <select
              value={selectedCountry}
              onChange={e => { setSelectedCountry(e.target.value); setSelectedState(''); setSelectedCity(''); }}
              onBlur={() => handleBlur('businessCountry')}
              className="w-full px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="">Select Country</option>
              {countryList.map(c => (
                <option key={c.isoCode} value={c.isoCode}>{c.name}</option>
              ))}
            </select>
            {errors.businessCountry && (
              <div className="mt-0.5 p-1 bg-red-100 border border-red-300 text-red-700 rounded text-xs font-medium">{errors.businessCountry}</div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">State*</label>
            <select
              value={selectedState}
              onChange={e => { setSelectedState(e.target.value); setSelectedCity(''); }}
              onBlur={() => handleBlur('businessState')}
              className="w-full px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              disabled={!selectedCountry}
            >
              <option value="">{selectedCountry ? 'Select State' : 'Select Country First'}</option>
              {stateList.map(s => (
                <option key={s.isoCode} value={s.isoCode}>{s.name}</option>
              ))}
            </select>
            {errors.businessState && (
              <div className="mt-0.5 p-1 bg-red-100 border border-red-300 text-red-700 rounded text-xs font-medium">{errors.businessState}</div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">City*</label>
            <select
              value={selectedCity}
              onChange={e => setSelectedCity(e.target.value)}
              onBlur={() => handleBlur('businessCity')}
              className="w-full px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              disabled={!selectedState}
            >
              <option value="">{selectedState ? 'Select City' : 'Select State First'}</option>
              {cityList.map(city => (
                <option key={city.name} value={city.name}>{city.name}</option>
              ))}
            </select>
            {errors.businessCity && (
              <div className="mt-0.5 p-1 bg-red-100 border border-red-300 text-red-700 rounded text-xs font-medium">{errors.businessCity}</div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">Postal Code*</label>
            <input
              type="text"
              value={formData.businessPostalCode}
              onChange={e => handleInputChange('businessPostalCode', e.target.value)}
              onBlur={() => handleBlur('businessPostalCode')}
              className="w-full px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
            {errors.businessPostalCode && (
              <div className="mt-0.5 p-1 bg-red-100 border border-red-300 text-red-700 rounded text-xs font-medium">{errors.businessPostalCode}</div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">Website/Business URL</label>
            <input
              type="url"
              value={formData.businessWebsite}
              onChange={e => handleInputChange('businessWebsite', e.target.value)}
              onBlur={() => handleBlur('businessWebsite')}
              placeholder="example.com"
              pattern="example\.com"
              className="w-full px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              required
            />
            {errors.businessWebsite && (
              <div className="mt-0.5 p-1 bg-red-100 border border-red-300 text-red-700 rounded text-xs font-medium">{errors.businessWebsite}</div>
            )}
          </div>
        </div>
      </div>

      {/* Billing Details Section */}
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-gray-800 mb-1 border-b border-gray-200 pb-1">Billing Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">Legal Business Name</label>
            <input
              type="text"
              value={formData.legalBusinessName}
              onChange={e => handleInputChange('legalBusinessName', e.target.value)}
              onBlur={() => handleBlur('legalBusinessName')}
              className="w-full px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
            {errors.legalBusinessName && (
              <div className="mt-0.5 p-1 bg-red-100 border border-red-300 text-red-700 rounded text-xs font-medium">{errors.legalBusinessName}</div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">GST / TaxID</label>
            <input
              type="text"
              value={formData.gstTaxId}
              onChange={e => handleInputChange('gstTaxId', e.target.value)}
              onBlur={() => handleBlur('gstTaxId')}
              className="w-full px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
            {errors.gstTaxId && (
              <div className="mt-0.5 p-1 bg-red-100 border border-red-300 text-red-700 rounded text-xs font-medium">{errors.gstTaxId}</div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 flex justify-end">
        <button
          onClick={nextStep}
          className={`px-3 py-1 rounded-lg font-medium text-sm ${loading || !isPersonalInfoValid() ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
          disabled={loading || !isPersonalInfoValid()}
        >
          {loading ? 'Loading...' : 'Next: Account Info'}
        </button>
      </div>
    </div>
  );

  // Helper to check if all required personal info fields are filled and valid
  function isPersonalInfoValid() {
    return (
      formData.name.trim().length >= 2 &&
      /^[A-Za-z0-9Ææß\s'\-]+$/.test(formData.name) &&
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.email) &&
      formData.phone.trim().length >= 7 &&
      formData.companyName.trim().length >= 2 &&
      /^[A-Za-z0-9\s&.'-]+$/.test(formData.companyName) &&
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.businessEmail) &&
      !/(?:@gmail\.com|@yahoo\.com|@hotmail\.com|@outlook\.com|@rediffmail\.com|@aol\.com|@icloud\.com|@protonmail\.com|@zoho\.com|@mail\.com|@gmx\.com|@yandex\.com|@live\.com|@msn\.com)$/i.test(formData.businessEmail) &&
      /^[A-Za-z0-9\s,.'-]{3,}$/.test(formData.businessAddress) &&
      formData.businessCity.trim().length > 0 &&
      formData.businessState.trim().length > 0 &&
      /^[A-Za-z0-9\s-]+$/.test(formData.businessPostalCode) &&
      formData.businessCountry.trim().length > 0
    );
  }

  // Helper to check if all required account info fields are filled and valid
  function isAccountInfoValid() {
    return (
      formData.accountFullName && typeof formData.accountFullName === 'string' && formData.accountFullName.trim().length >= 2 &&
      /^[A-Za-z0-9Ææß\s'\-]+$/.test(formData.accountFullName) &&
      formData.accountEmail && typeof formData.accountEmail === 'string' && /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.accountEmail) &&
      formData.password && typeof formData.password === 'string' && /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/.test(formData.password) &&
      formData.confirmPassword && typeof formData.confirmPassword === 'string' && formData.password === formData.confirmPassword &&
      formData.termsAccepted === true
    );
  }

  const renderAccountInfo = () => (
    <div className="max-w-2xl mx-auto">
      {globalError && (
        <div className="mb-2 p-1 bg-red-100 border border-red-300 text-red-700 rounded text-xs font-medium">
          {globalError}
        </div>
      )}
      <h2 className="text-lg font-bold text-gray-900 mb-1">Account Info</h2>
      <p className="text-xs text-gray-600 mb-3">Tell us who would be the administrator</p>
      <p className="text-xs text-gray-600 mb-4">Below details are required create administrator login credentials</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-0.5">Full Name*</label>
          <input
            type="text"
            value={formData.accountFullName}
            onChange={e => handleInputChange('accountFullName', e.target.value)}
            onBlur={() => handleBlur('accountFullName')}
            className="w-full px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
          {errors.accountFullName && (
            <div className="mt-0.5 p-1 bg-red-100 border border-red-300 text-red-700 rounded text-xs font-medium">{errors.accountFullName}</div>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-0.5">Admin Email*</label>
          <input
            type="email"
            value={formData.accountEmail}
            onChange={e => handleInputChange('accountEmail', e.target.value)}
            onBlur={() => handleBlur('accountEmail')}
            className="w-full px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
          {errors.accountEmail && (
            <div className="mt-0.5 p-1 bg-red-100 border border-red-300 text-red-700 rounded text-xs font-medium">{errors.accountEmail}</div>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-0.5">Password*</label>
          <input
            type="password"
            value={formData.password}
            onChange={e => handleInputChange('password', e.target.value)}
            onBlur={() => handleBlur('password')}
            className="w-full px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
          {errors.password && (
            <div className="mt-0.5 p-1 bg-red-100 border border-red-300 text-red-700 rounded text-xs font-medium">{errors.password}</div>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-0.5">Confirm Password*</label>
          <input
            type="password"
            value={formData.confirmPassword}
            onChange={e => handleInputChange('confirmPassword', e.target.value)}
            onBlur={() => handleBlur('confirmPassword')}
            className="w-full px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
          {errors.confirmPassword && (
            <div className="mt-0.5 p-1 bg-red-100 border border-red-300 text-red-700 rounded text-xs font-medium">{errors.confirmPassword}</div>
          )}
        </div>
      </div>
      
      <div className="mt-3">
        <label className="flex items-start space-x-2">
          <input
            type="checkbox"
            checked={formData.termsAccepted}
            onChange={e => handleInputChange('termsAccepted', e.target.checked)}
            onBlur={() => handleBlur('termsAccepted')}
            className="mt-0.5 h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <span className="text-xs text-gray-700">
            I agree to the <a href="#" className="text-blue-600 hover:underline">Terms and Conditions</a>
          </span>
        </label>
        {errors.termsAccepted && (
          <div className="mt-0.5 p-1 bg-red-100 border border-red-300 text-red-700 rounded text-xs font-medium">{errors.termsAccepted}</div>
        )}
      </div>
      
      <div className="mt-3 flex justify-between">
        <button
          onClick={prevStep}
          className="px-3 py-1 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 bg-white text-sm"
          disabled={loading}
        >
          Prev: Personal Info
        </button>
        <button
          onClick={nextStep}
          className={`px-3 py-1 rounded-lg font-medium text-sm ${loading || !isAccountInfoValid() ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
          disabled={loading || !isAccountInfoValid()}
        >
          {loading ? 'Loading...' : 'Next: Confirmation'}
        </button>
      </div>
    </div>
  );

  const renderConfirmation = () => (
    <div className="max-w-2xl mx-auto">
      {globalError && (
        <div className="mb-2 p-1 bg-red-100 border border-red-300 text-red-700 rounded text-xs font-medium">
          {globalError}
        </div>
      )}
      {/* Success message for OTP sent */}
      <div className="mb-2 p-1 bg-green-100 border border-green-300 text-green-700 rounded text-xs font-medium">
        OTP has been sent successfully on your registered email.
      </div>
      <h2 className="text-lg font-bold text-gray-900 mb-1">Verify your email address</h2>
      <div className="mb-3 text-gray-700 text-xs">
        We emailed you a six-digit code to <span className="font-semibold text-gray-900">{formData.accountEmail || 'name@company.com'}</span>. Enter the code below to confirm your email address.
      </div>
      <div className="flex justify-center gap-2 mb-3">
        {formData.verificationCode.map((digit, idx) => (
          <input
            key={idx}
            ref={el => { otpRefs.current[idx] = el; }}
            type="text"
            maxLength={1}
            value={digit}
            onChange={e => handleVerificationCodeChange(idx, e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Backspace' && !formData.verificationCode[idx] && idx > 0) {
                otpRefs.current[idx - 1]?.focus();
              }
            }}
            onPaste={e => {
              const paste = e.clipboardData.getData('text');
              if (paste && paste.length === formData.verificationCode.length) {
                const newCode = paste.split('').slice(0, formData.verificationCode.length);
                setFormData(prev => ({ ...prev, verificationCode: newCode }));
                // Focus last input after paste
                setTimeout(() => {
                  otpRefs.current[formData.verificationCode.length - 1]?.focus();
                }, 0);
                e.preventDefault();
              }
            }}
            onBlur={() => handleBlur('verificationCode')}
            className="w-10 h-10 text-center border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-semibold"
          />
        ))}
      </div>
      <div className="bg-gray-50 text-gray-500 text-xs rounded-md p-2 mb-3">
        Make sure to keep this window open while check your inbox.
      </div>
      <div className="flex justify-between">
        <button
          onClick={prevStep}
          className="px-3 py-1 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 bg-white text-sm"
          disabled={loading}
        >
          Prev: Account Info
        </button>
        <button
          onClick={nextStep}
          className={`px-3 py-1 rounded-lg font-medium text-sm ${loading ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
          disabled={loading}
        >
          {loading ? 'Verifying...' : 'Verify account'}
        </button>
      </div>
    </div>
  );

  const renderThankYouCard = () => (
    <div className="mt-6 rounded-lg border border-blue-100 bg-blue-50 p-6 flex flex-col md:flex-row items-center md:items-start gap-4">
      <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-full bg-blue-100">
        {/* Heart Icon */}
        <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z" />
        </svg>
      </div>
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Thank You for Using Our AI Agent!</h3>
        <p className="text-sm text-gray-700 mb-4">We appreciate your trust in our AI-powered solutions. For more information about our services and company, visit our main website.</p>
        <a
          href={`${process.env.NEXT_PUBLIC_API_URL}/`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors text-sm"
        >
          {/* Globe Icon */}
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3C7.03 3 3 7.03 3 12s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm0 0c2.21 0 4 4.03 4 9s-1.79 9-4 9-4-4.03-4-9 1.79-9 4-9zm0 0v18m9-9H3" />
          </svg>
          Visit aiagent.Mobiloitte.io
        </a>
      </div>
    </div>
  );

  const renderVerified = () => {
    // Security check: Ensure OTP was properly verified
    if (!otpVerified) {
      return (
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.707a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-red-900 mb-1">Verification Required</h2>
          <p className="text-xs text-red-600 mb-1">Please complete OTP verification before proceeding.</p>
          <button
            onClick={() => setCurrentStep(3)}
            className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors text-sm"
          >
            Return to OTP Verification
          </button>
        </div>
      );
    }

    return (
      <div className="max-w-2xl mx-auto text-center">
        {globalError && (
          <div className="mb-2 p-1 bg-red-100 border border-red-300 text-red-700 rounded text-xs font-medium">
            {globalError}
          </div>
        )}
        <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-2">
          <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.707a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Verified</h2>
        <p className="text-xs text-gray-600 mb-1">You have successfully verified your account.</p>
        <p className="text-xs text-gray-600 mb-3">Login details have been sent to via email</p>
        {renderThankYouCard()}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 relative pb-24">
      <div className="max-w-4xl mx-auto px-4">
      {/* Removed User Onboarding header as requested */}
        {renderStepper()}
        <div className="bg-white rounded-lg shadow-sm p-8">
          {currentStep === 1 && renderPersonalInfo()}
          {currentStep === 2 && renderAccountInfo()}
          {currentStep === 3 && renderConfirmation()}
          {currentStep === 4 && renderVerified()}
        </div>
      </div>
    </div>
  );
}
