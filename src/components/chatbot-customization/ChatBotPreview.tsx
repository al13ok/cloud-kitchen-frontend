import React, { useState, useEffect, useRef } from "react";
import Avatar from "@/components/ui/avatar/Avatar";
import { MessageCircle, X } from "lucide-react";

export interface ContactFormConfig {
  title?: string;
  fields: {
    name: {
      label: string;
      placeholder: string;
      required: boolean;
    };
    email: {
      label: string;
      placeholder: string;
      required: boolean;
    };
    phone?: {
      label: string;
      placeholder: string;
      required: boolean;
    };
    dropdown1: {
      label: string;
      placeholder: string;
      required: boolean;
      options: string[];
    };
    dropdown2: {
      label: string;
      placeholder: string;
      required: boolean;
      options: string[];
    };
    message: {
      label: string;
      placeholder: string;
      required: boolean;
    };
  };
  submitButtonText?: string;
  successMessage?: string;
}

// Add LoginFormConfig interface
export interface LoginFormConfig {
  enabled: boolean;
  toggleOptions: string[];
  email: { label: string; placeholder: string; required: boolean };
  password: { label: string; placeholder: string; required: boolean };
  submitButtonText: string;
  successMessage: string;
}

// Add JobApplicationFormConfig interface
export interface JobApplicationFormConfig {
  title: string;
  fields: {
    name: { label: string; placeholder: string; required: boolean };
    email: { label: string; placeholder: string; required: boolean };
    phone: { label: string; placeholder: string; required: boolean };
    category: { label: string; required: boolean; options: string[] };
    experience: { label: string; required: boolean; options: string[] };
    resume: { label: string; required: boolean; maxSize: number };
  };
  submitButtonText: string;
  successMessage: string;
}

// Add CustomerTicketFormConfig interface
export interface CustomerTicketFormConfig {
  title: string;
  fields: {
    email: { label: string; placeholder: string; required: boolean };
    phone?: { label: string; placeholder: string; required: boolean };
    issueType: { label: string; required: boolean; options: string[] };
    issue: { label: string; required: boolean; options: string[] };
    message: { label: string; placeholder: string; required: boolean };
  };
  submitButtonText: string;
  successMessage: string;
}

// Add EmployeeTicketFormConfig interface
export interface EmployeeTicketFormConfig {
  title: string;
  fields: {
    id: { label: string; placeholder: string; required: boolean };
    issueType: { label: string; required: boolean; options: string[] };
    issue: { label: string; required: boolean; options: string[] };
    message: { label: string; placeholder: string; required: boolean };
  };
  submitButtonText: string;
  successMessage: string;
}

export interface ChatbotPreviewProps {
  botName: string;
  selectedTheme: string;
  colorThemes: Record<string, Record<string, string>>;
  welcomeMessage?: string;
  contactFormConfig?: ContactFormConfig;
  loginFormConfig?: LoginFormConfig;
  jobApplicationFormConfig?: JobApplicationFormConfig;
  customerTicketFormConfig?: CustomerTicketFormConfig;
  employeeTicketFormConfig?: EmployeeTicketFormConfig;
  onContactFormSubmit?: (formData: {
    name: string;
    email: string;
    phone: string;
    dropdown1: string;
    dropdown2: string;
    message: string;
  }) => void;
}

const ChatbotPreview: React.FC<ChatbotPreviewProps> = ({ 
  botName, 
  selectedTheme, 
  colorThemes, 
  welcomeMessage,
  contactFormConfig,
  loginFormConfig,
  jobApplicationFormConfig,
  customerTicketFormConfig,
  employeeTicketFormConfig,
  onContactFormSubmit
}) => {
  const [messages, setMessages] = useState([
    { id: 1, text: welcomeMessage || "Hello! I'm your AI assistant. How can I help you today?", isBot: true, timestamp: "10:30 AM" },
    { id: 2, text: "Hi there! Can you help me with my project?", isBot: false, timestamp: "10:31 AM" },
    { id: 3, text: "Of course! I'd be happy to help. What kind of project are you working on?", isBot: true, timestamp: "10:31 AM" }
  ]);

  const [inputMessage, setInputMessage] = useState("");
  const [currentAvatar, setCurrentAvatar] = useState("/images/user/Bot1.png");
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactFormData, setContactFormData] = useState({
    name: "",
    email: "",
    phone: "",
    dropdown1: "",
    dropdown2: "",
    message: ""
  });
  // const [formSubmitted, setFormSubmitted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const [showLoginForm, setShowLoginForm] = useState(false);
  const [loginFormData, setLoginFormData] = useState({
    loginType: loginFormConfig?.toggleOptions[0] || "",
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);

  // Job Application Form State
  const [showJobApplicationForm, setShowJobApplicationForm] = useState(false);
  const [jobApplicationFormData, setJobApplicationFormData] = useState({
    name: "",
    email: "",
    phone: "",
    category: "",
    experience: "",
    resume: null as File | null
  });
  const [jobApplicationSuccess, setJobApplicationSuccess] = useState(false);

  // Customer Ticket Form State
  const [showCustomerTicketForm, setShowCustomerTicketForm] = useState(false);
  const [customerTicketFormData, setCustomerTicketFormData] = useState({
    email: "",
    phone: "",
    issueType: "",
    issue: "",
    message: ""
  });
  const [customerTicketSuccess, setCustomerTicketSuccess] = useState(false);

  // Employee Ticket Form State
  const [showEmployeeTicketForm, setShowEmployeeTicketForm] = useState(false);
  const [employeeTicketFormData, setEmployeeTicketFormData] = useState({
    id: "",
    issueType: "",
    issue: "",
    message: ""
  });
  const [employeeTicketSuccess, setEmployeeTicketSuccess] = useState(false);

  // Listen for avatar changes
  useEffect(() => {
    const handleAvatarChange = (event: CustomEvent<{ avatarPath: string }>) => {
      setCurrentAvatar(event.detail.avatarPath);
    };

    window.addEventListener('avatarChanged', handleAvatarChange as EventListener);

    // Get initial avatar from localStorage
    const savedAvatar = localStorage.getItem('selectedChatbotAvatar');
    if (savedAvatar) {
      setCurrentAvatar(savedAvatar);
    }

    return () => window.removeEventListener('avatarChanged', handleAvatarChange as EventListener);
  }, []);

  // Update first message if welcomeMessage changes
  useEffect(() => {
    setMessages(prev => {
      if (!prev.length) return prev;
      if (prev[0].text === welcomeMessage) return prev;
      const updated = [...prev];
      updated[0] = { ...updated[0], text: welcomeMessage || "Hello! I'm your AI assistant. How can I help you today?" };
      return updated;
    });
  }, [welcomeMessage]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, showContactForm]);

  const handleSendMessage = () => {
    if (inputMessage.trim()) {
      const newMessage = {
        id: Date.now(),
        text: inputMessage,
        isBot: false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, newMessage]);
      setInputMessage("");

      // Simulate bot response
      setTimeout(() => {
        const botResponse = {
          id: Date.now() + 1,
          text: "Thanks for your message! This is a demo response from your customized AI assistant.",
          isBot: true,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, botResponse]);
      }, 1000);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleContactFormChange = (field: string, value: string) => {
    setContactFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleContactFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (contactFormConfig) {
      const requiredFields = Object.entries(contactFormConfig.fields)
        .filter(([, config]) => config.required)
        .map(([field]) => field);
      
      const missingFields = requiredFields.filter(field => !contactFormData[field as keyof typeof contactFormData].trim());
      
      if (missingFields.length > 0) {
        alert(`Please fill in all required fields: ${missingFields.join(', ')}`);
        return;
      }
    }

    // Call the parent's submit handler
    if (onContactFormSubmit) {
      onContactFormSubmit(contactFormData);
    }

    // Add success message to chat
    const successMsg = contactFormConfig?.successMessage || "Thank you for your message! We'll get back to you soon.";
    const botResponse = {
      id: Date.now(),
      text: successMsg,
      isBot: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, botResponse]);

    // Reset form and close
    setContactFormData({ name: "", email: "", phone: "", dropdown1: "", dropdown2: "", message: "" });
    setShowContactForm(false);
    // setFormSubmitted(true); // This line was removed as per the edit hint

    // Reset submitted state after 3 seconds
    setTimeout(() => {
      // setFormSubmitted(false); // This line was removed as per the edit hint
    }, 3000);
  };

  // Job Application Form Handlers
  const handleJobApplicationFormChange = (field: string, value: string) => {
    setJobApplicationFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleJobApplicationFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setJobApplicationFormData(prev => ({ ...prev, resume: file }));
  };

  const handleJobApplicationFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (jobApplicationFormConfig) {
      const requiredFields = Object.entries(jobApplicationFormConfig.fields)
        .filter(([, config]) => config.required)
        .map(([field]) => field);
      
      const missingFields = requiredFields.filter(field => {
        if (field === 'resume') {
          return !jobApplicationFormData.resume;
        }
        return !jobApplicationFormData[field as keyof typeof jobApplicationFormData]?.toString().trim();
      });
      
      if (missingFields.length > 0) {
        alert(`Please fill in all required fields: ${missingFields.join(', ')}`);
        return;
      }

      // Validate file type and size
      if (jobApplicationFormData.resume) {
        if (jobApplicationFormData.resume.type !== 'application/pdf') {
          alert('Only PDF files are allowed');
          return;
        }
        if (jobApplicationFormData.resume.size > jobApplicationFormConfig.fields.resume.maxSize * 1024 * 1024) {
          alert(`File size must be less than ${jobApplicationFormConfig.fields.resume.maxSize}MB`);
          return;
        }
      }
    }

    // Add success message to chat
    const successMsg = jobApplicationFormConfig?.successMessage || "Thank you for your application! We'll review it and get back to you soon.";
    const botResponse = {
      id: Date.now(),
      text: successMsg,
      isBot: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, botResponse]);

    // Reset form and close
    setJobApplicationFormData({ name: "", email: "", phone: "", category: "", experience: "", resume: null });
    setShowJobApplicationForm(false);
    setJobApplicationSuccess(true);

    // Reset success state after 3 seconds
    setTimeout(() => {
      setJobApplicationSuccess(false);
    }, 3000);
  };

  // Customer Ticket Form Handlers
  const handleCustomerTicketFormChange = (field: string, value: string) => {
    setCustomerTicketFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCustomerTicketFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (customerTicketFormConfig) {
      const requiredFields = Object.entries(customerTicketFormConfig.fields)
        .filter(([, config]) => config.required)
        .map(([field]) => field);
      
      const missingFields = requiredFields.filter(field => !customerTicketFormData[field as keyof typeof customerTicketFormData]?.toString().trim());
      
      if (missingFields.length > 0) {
        alert(`Please fill in all required fields: ${missingFields.join(', ')}`);
        return;
      }

      // Validate email format
      if (customerTicketFormData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerTicketFormData.email)) {
        alert('Please enter a valid email address');
        return;
      }
    }

    // Add success message to chat
    const successMsg = customerTicketFormConfig?.successMessage || "Your ticket has been submitted! We'll get back to you within 24 hours.";
    const botResponse = {
      id: Date.now(),
      text: successMsg,
      isBot: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, botResponse]);

    // Reset form and close
    setCustomerTicketFormData({ email: "", phone: "", issueType: "", issue: "", message: "" });
    setShowCustomerTicketForm(false);
    setCustomerTicketSuccess(true);

    // Reset success state after 3 seconds
    setTimeout(() => {
      setCustomerTicketSuccess(false);
    }, 3000);
  };

  // Employee Ticket Form Handlers
  const handleEmployeeTicketFormChange = (field: string, value: string) => {
    setEmployeeTicketFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEmployeeTicketFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (employeeTicketFormConfig) {
      const requiredFields = Object.entries(employeeTicketFormConfig.fields)
        .filter(([, config]) => config.required)
        .map(([field]) => field);
      
      const missingFields = requiredFields.filter(field => !employeeTicketFormData[field as keyof typeof employeeTicketFormData]?.toString().trim());
      
      if (missingFields.length > 0) {
        alert(`Please fill in all required fields: ${missingFields.join(', ')}`);
        return;
      }
    }

    // Add success message to chat
    const successMsg = employeeTicketFormConfig?.successMessage || "Your ticket has been submitted! IT support will contact you soon.";
    const botResponse = {
      id: Date.now(),
      text: successMsg,
      isBot: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, botResponse]);

    // Reset form and close
    setEmployeeTicketFormData({ id: "", issueType: "", issue: "", message: "" });
    setShowEmployeeTicketForm(false);
    setEmployeeTicketSuccess(true);

    // Reset success state after 3 seconds
    setTimeout(() => {
      setEmployeeTicketSuccess(false);
    }, 3000);
  };

  const currentTheme = colorThemes[selectedTheme] || {
    "color-1": "#6d6875",
    "color-2": "#b5838d", 
    "color-3": "#e5989b",
    "color-4": "#ffb4a2",
    "color-5": "#ffcdb2"
  };



  const defaultContactConfig: ContactFormConfig = {
    title: "Contact Us",
    fields: {
      name: { label: "Name", placeholder: "Your name", required: true },
      email: { label: "Email", placeholder: "your.email@example.com", required: true },
      phone: { label: "Phone", placeholder: "Your phone number", required: true },
      dropdown1: { label: "Dropdown 1", placeholder: "Select an option", required: true, options: ["Option 1", "Option 2", "Option 3"] },
      dropdown2: { label: "Dropdown 2", placeholder: "Select an option", required: true, options: ["Option A", "Option B", "Option C"] },
      message: { label: "Message", placeholder: "Your message...", required: true }
    },
    submitButtonText: "Send Message",
    successMessage: "Thank you for your message! We'll get back to you soon."
  };

  const formConfig = contactFormConfig || defaultContactConfig;

  return (
    <div className="w-full border-2 border-gray-200 rounded-lg overflow-hidden shadow-lg max-w-md">
      {/* Chat Header */}
      <div
        className="p-4 border-b"
        style={{
          backgroundColor: currentTheme['color-2'],
          color: currentTheme['color-4']
        }}
      >
        <div className="flex items-start w-full gap-3" style={{display: 'grid'}}>
          {/* Left column: Bot name on top, avatar + online below */}
          <div className="flex flex-col items-start min-w-[120px]">
            <h3 className="font-semibold text-lg leading-tight break-words" style={{wordBreak: 'break-word', overflowWrap: 'anywhere'}}>{botName}</h3>
            
          </div>

          {/* Center: icon actions bar */}
          <div className="flex-1 flex justify-center items-center" style={{justifyContent: 'space-between'}}>
          <div className="mt-2 flex flex-col items-center">
              <Avatar src={currentAvatar} size="small" />
              <p className="text-sm opacity-80 mt-1">Online</p>
            </div>
            <div className="flex items-center gap-3 px-4 py-2 rounded-md">
              {/* Contact Form Button */}
              <button
                onClick={() => setShowContactForm(!showContactForm)}
                className="p-2 rounded-full hover:bg-opacity-20 hover:bg-white transition-all duration-200"
                title="Contact Form"
              >
                <MessageCircle size={20} style={{ color: currentTheme['color-4'] }} />
              </button>
              {/* Login Form Button */}
              {loginFormConfig?.enabled && (
                <button
                  onClick={() => setShowLoginForm(!showLoginForm)}
                  className="p-2 rounded-full hover:bg-opacity-20 hover:bg-white transition-all duration-200"
                  title="Login Form"
                >
                  <svg className="w-5 h-5" fill="none" stroke={currentTheme['color-4']} strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2m16-10V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v6m6 4h6m-3-3v6" /></svg>
                </button>
              )}
              {/* Job Application Form Button */}
              {jobApplicationFormConfig && (
                <button
                  onClick={() => setShowJobApplicationForm(!showJobApplicationForm)}
                  className="p-2 rounded-full hover:bg-opacity-20 hover:bg-white transition-all duration-200"
                  title="Job Application"
                >
                  <svg className="w-5 h-5" fill="none" stroke={currentTheme['color-4']} strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </button>
              )}
              {/* Customer Ticket Form Button */}
              {customerTicketFormConfig && (
                <button
                  onClick={() => setShowCustomerTicketForm(!showCustomerTicketForm)}
                  className="p-2 rounded-full hover:bg-opacity-20 hover:bg-white transition-all duration-200"
                  title="Customer Ticket"
                >
                  <svg className="w-5 h-5" fill="none" stroke={currentTheme['color-4']} strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0zM12 9v3m0 0v3m0-3h3m-3 0H9" /></svg>
                </button>
              )}
              {/* Employee Ticket Form Button */}
              {employeeTicketFormConfig && (
                <button
                  onClick={() => setShowEmployeeTicketForm(!showEmployeeTicketForm)}
                  className="p-2 rounded-full hover:bg-opacity-20 hover:bg-white transition-all duration-200"
                  title="Employee Ticket"
                >
                  <svg className="w-5 h-5" fill="none" stroke={currentTheme['color-4']} strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" /></svg>
                </button>
              )}
            </div>
          </div>

          {/* Right: status dot */}
          
        </div>
      </div>

      {/* Chat Messages Area */}
      <div
        className="h-[400px] overflow-y-auto p-4 space-y-4 relative"
        style={{ backgroundColor: currentTheme['color-3'] }}
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.isBot ? 'justify-start' : 'justify-end'}`}
          >
            <div className={`flex items-start gap-2 max-w-xs ${message.isBot ? 'flex-row' : 'flex-row-reverse'}`}>
              <div className="flex items-center justify-center bg-transparent">
                {message.isBot && (
                  <Avatar src={currentAvatar} size="xsmall"/>
                )}
              </div>
              <div className="flex flex-col">
                <div
                  className="px-4 py-2 rounded-lg shadow-sm"
                  style={{
                    backgroundColor: message.isBot ? currentTheme['color-5'] : currentTheme['color-1'],
                    color: message.isBot ? currentTheme['color-1'] : currentTheme['color-5'],
                    borderRadius: message.isBot ? '0.75rem 0.75rem 0.75rem 0.25rem' : '0.75rem 0.75rem 0.25rem 0.75rem'
                  }}
                >
                  <p 
                    className="text-sm leading-relaxed" 
                    style={{ whiteSpace: 'pre-wrap' }}
                  >
                    {message.text}
                  </p>
                </div>
                <span
                  className={`text-xs mt-1 opacity-60 ${message.isBot ? 'text-left' : 'text-right'}`}
                  style={{ color: currentTheme['color-1'] }}
                >
                  {message.timestamp}
                </span>
              </div>
            </div>
          </div>
        ))}

        {/* Contact Form as Last Message */}
        {showContactForm && (
          <div className="flex justify-start">
            <div className="flex items-start gap-2 max-w-md w-full">
              <Avatar src={currentAvatar} size="small" />
              <div className="flex flex-col w-full">
                <div
                  className="px-4 py-4 rounded-lg shadow-sm w-full"
                  style={{
                    backgroundColor: currentTheme['color-2'],
                    color: currentTheme['color-1'],
                    borderRadius: '0.75rem 0.75rem 0.75rem 0.25rem'
                  }}
                >
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-semibold">
                      {formConfig.title}
                    </h3>
                    <button
                      onClick={() => setShowContactForm(false)}
                      className="p-1 rounded-full hover:bg-opacity-20 hover:bg-white transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <form onSubmit={handleContactFormSubmit} className="space-y-3">
                    {/* Name Field */}
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        {formConfig.fields.name.label}
                        {formConfig.fields.name.required && <span className="text-red-400 ml-1">*</span>}
                      </label>
                      <input
                        type="text"
                        value={contactFormData.name}
                        onChange={(e) => handleContactFormChange('name', e.target.value)}
                        placeholder={formConfig.fields.name.placeholder}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-opacity-50"
                        style={{
                          backgroundColor: currentTheme['color-1'],
                          borderColor: currentTheme['color-3'],
                          color: currentTheme['color-5']
                        }}
                      />
                    </div>

                    {/* Email Field */}
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        {formConfig.fields.email.label}
                        {formConfig.fields.email.required && <span className="text-red-400 ml-1">*</span>}
                      </label>
                      <input
                        type="email"
                        value={contactFormData.email}
                        onChange={(e) => handleContactFormChange('email', e.target.value)}
                        placeholder={formConfig.fields.email.placeholder}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-opacity-50"
                        style={{
                          backgroundColor: currentTheme['color-1'],
                          borderColor: currentTheme['color-3'],
                          color: currentTheme['color-5']
                        }}
                      />
                    </div>

                    {/* Phone Field - only render if phone field is defined */}
                    {formConfig.fields.phone && (
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          {formConfig.fields.phone.label}
                          {formConfig.fields.phone.required && <span className="text-red-400 ml-1">*</span>}
                        </label>
                        <input
                          type="tel"
                          value={contactFormData.phone}
                          onChange={(e) => handleContactFormChange('phone', e.target.value)}
                          placeholder={formConfig.fields.phone.placeholder}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-opacity-50"
                          style={{
                            backgroundColor: currentTheme['color-1'],
                            borderColor: currentTheme['color-3'],
                            color: currentTheme['color-5']
                          }}
                        />
                      </div>
                    )}

                    {/* Dropdown 1 Field */}
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        {formConfig.fields.dropdown1.label}
                        {formConfig.fields.dropdown1.required && <span className="text-red-400 ml-1">*</span>}
                      </label>
                      <select
                        value={contactFormData.dropdown1}
                        onChange={e => handleContactFormChange('dropdown1', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-opacity-50"
                        style={{
                          backgroundColor: currentTheme['color-1'],
                          borderColor: currentTheme['color-3'],
                          color: currentTheme['color-5']
                        }}
                        required={formConfig.fields.dropdown1.required}
                      >
                        <option value="" disabled>{formConfig.fields.dropdown1.placeholder}</option>
                        {formConfig.fields.dropdown1.options.map((opt, idx) => (
                          <option key={idx} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                    {/* Dropdown 2 Field */}
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        {formConfig.fields.dropdown2.label}
                        {formConfig.fields.dropdown2.required && <span className="text-red-400 ml-1">*</span>}
                      </label>
                      <select
                        value={contactFormData.dropdown2}
                        onChange={e => handleContactFormChange('dropdown2', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-opacity-50"
                        style={{
                          backgroundColor: currentTheme['color-1'],
                          borderColor: currentTheme['color-3'],
                          color: currentTheme['color-5']
                        }}
                        required={formConfig.fields.dropdown2.required}
                      >
                        <option value="" disabled>{formConfig.fields.dropdown2.placeholder}</option>
                        {formConfig.fields.dropdown2.options.map((opt, idx) => (
                          <option key={idx} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>

                    {/* Message Field */}
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        {formConfig.fields.message.label}
                        {formConfig.fields.message.required && <span className="text-red-400 ml-1">*</span>}
                      </label>
                      <textarea
                        value={contactFormData.message}
                        onChange={(e) => handleContactFormChange('message', e.target.value)}
                        placeholder={formConfig.fields.message.placeholder}
                        rows={3}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-opacity-50 resize-none"
                        style={{
                          backgroundColor: currentTheme['color-1'],
                          borderColor: currentTheme['color-3'],
                          color: currentTheme['color-5']
                        }}
                      />
                    </div>

                    {/* Submit Buttons */}
                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowContactForm(false)}
                        className="flex-1 px-3 py-2 text-sm border rounded-md font-medium transition-colors hover:bg-opacity-10 hover:bg-white"
                        style={{
                          borderColor: currentTheme['color-4'],
                          color: currentTheme['color-4']
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 px-3 py-2 text-sm rounded-md font-medium transition-colors"
                        style={{
                          backgroundColor: currentTheme['color-1'],
                          color: currentTheme['color-5']
                        }}
                      >
                        {formConfig.submitButtonText}
                      </button>
                    </div>
                  </form>
                </div>
                <span
                  className="text-xs mt-1 opacity-60 text-left"
                  style={{ color: currentTheme['color-1'] }}
                >
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>
        )}

        {showLoginForm && loginFormConfig?.enabled && (
          <div className="flex justify-start">
            <div className="flex items-start gap-2 max-w-md w-full">
              <Avatar src={currentAvatar} size="small" />
              <div className="flex flex-col w-full">
                <div
                  className="px-4 py-4 rounded-lg shadow-sm w-full"
                  style={{
                    backgroundColor: currentTheme['color-2'],
                    color: currentTheme['color-1'],
                    borderRadius: '0.75rem 0.75rem 0.75rem 0.25rem'
                  }}
                >
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-semibold">Login</h3>
                    <button
                      onClick={() => setShowLoginForm(false)}
                      className="p-1 rounded-full hover:bg-opacity-20 hover:bg-white transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <form
                    onSubmit={e => {
                      e.preventDefault();
                      setLoginSuccess(true);
                      setTimeout(() => {
                        setShowLoginForm(false);
                        setLoginSuccess(false);
                        setLoginFormData({ loginType: loginFormConfig.toggleOptions[0] || "", email: "", password: "" });
                      }, 2000);
                    }}
                    className="space-y-3"
                  >
                    {/* Toggle for login type */}
                    <div className="flex gap-2 mb-2">
                      {loginFormConfig.toggleOptions.map(option => (
                        <button
                          key={option}
                          type="button"
                          className={`px-3 py-1 rounded-full border font-medium transition-colors ${loginFormData.loginType === option ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-700 border-gray-300'}`}
                          onClick={() => setLoginFormData(data => ({ ...data, loginType: option }))}
                          style={{
                            backgroundColor: loginFormData.loginType === option ? currentTheme['color-1'] : 'white',
                            color: loginFormData.loginType === option ? currentTheme['color-5'] : currentTheme['color-4'],
                            borderColor: loginFormData.loginType === option ? currentTheme['color-3'] : '#e5e7eb'
                          }}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                    {/* Email input */}
                    <div>
                      <label className="block text-sm font-medium mb-1">{loginFormConfig.email.label}{loginFormConfig.email.required && <span className="text-red-400 ml-1">*</span>}</label>
                      <input
                        type="email"
                        value={loginFormData.email}
                        onChange={e => setLoginFormData(data => ({ ...data, email: e.target.value }))}
                        placeholder={loginFormConfig.email.placeholder}
                        required={loginFormConfig.email.required}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-opacity-50"
                        style={{
                          backgroundColor: currentTheme['color-1'],
                          borderColor: currentTheme['color-3'],
                          color: currentTheme['color-5']
                        }}
                      />
                    </div>
                    {/* Password input with view toggle */}
                    <div>
                      <label className="block text-sm font-medium mb-1">{loginFormConfig.password.label}{loginFormConfig.password.required && <span className="text-red-400 ml-1">*</span>}</label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={loginFormData.password}
                          onChange={e => setLoginFormData(data => ({ ...data, password: e.target.value }))}
                          placeholder={loginFormConfig.password.placeholder}
                          required={loginFormConfig.password.required}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-opacity-50 pr-10"
                          style={{
                            backgroundColor: currentTheme['color-1'],
                            borderColor: currentTheme['color-3'],
                            color: currentTheme['color-5']
                          }}
                        />
                        <button
                          type="button"
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
                          onClick={() => setShowPassword(v => !v)}
                          tabIndex={-1}
                        >
                          {showPassword ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0zm-9.53 2.11A9.97 9.97 0 0112 5c2.61 0 5.01.99 6.87 2.64M21 21l-6-6m-6 0l-6 6" /></svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0zm-9.53 2.11A9.97 9.97 0 0112 5c2.61 0 5.01.99 6.87 2.64M21 21l-6-6m-6 0l-6 6" /></svg>
                          )}
                        </button>
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full px-4 py-2 rounded-lg font-medium transition-all duration-200"
                      style={{
                        backgroundColor: currentTheme['color-1'],
                        color: currentTheme['color-5']
                      }}
                    >
                      {loginFormConfig.submitButtonText}
                    </button>
                    {loginSuccess && (
                      <div className="mt-2 text-green-600 text-center font-semibold animate-fade-in-fast">
                        {loginFormConfig.successMessage}
                      </div>
                    )}
                  </form>
                </div>
                <span
                  className="text-xs mt-1 opacity-60 text-left"
                  style={{ color: currentTheme['color-1'] }}
                >
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Job Application Form */}
        {showJobApplicationForm && jobApplicationFormConfig && (
          <div className="p-4">
            <div className="flex justify-end">
              <div
                className="max-w-sm w-full p-4 rounded-lg shadow-lg"
                style={{
                  backgroundColor: currentTheme['color-2'],
                  color: currentTheme['color-1'],
                  borderRadius: '0.75rem 0.75rem 0.75rem 0.25rem'
                }}
              >
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-semibold">{jobApplicationFormConfig.title}</h3>
                  <button
                    onClick={() => setShowJobApplicationForm(false)}
                    className="p-1 rounded-full hover:bg-opacity-20 hover:bg-white transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
                <form onSubmit={handleJobApplicationFormSubmit} className="space-y-3">
                  {/* Name Field */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {jobApplicationFormConfig.fields.name.label}
                      {jobApplicationFormConfig.fields.name.required && <span className="text-red-400 ml-1">*</span>}
                    </label>
                    <input
                      type="text"
                      value={jobApplicationFormData.name}
                      onChange={e => handleJobApplicationFormChange('name', e.target.value)}
                      placeholder={jobApplicationFormConfig.fields.name.placeholder}
                      required={jobApplicationFormConfig.fields.name.required}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-opacity-50"
                      style={{
                        backgroundColor: currentTheme['color-1'],
                        borderColor: currentTheme['color-3'],
                        color: currentTheme['color-5']
                      }}
                    />
                  </div>

                  {/* Email Field */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {jobApplicationFormConfig.fields.email.label}
                      {jobApplicationFormConfig.fields.email.required && <span className="text-red-400 ml-1">*</span>}
                    </label>
                    <input
                      type="email"
                      value={jobApplicationFormData.email}
                      onChange={e => handleJobApplicationFormChange('email', e.target.value)}
                      placeholder={jobApplicationFormConfig.fields.email.placeholder}
                      required={jobApplicationFormConfig.fields.email.required}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-opacity-50"
                      style={{
                        backgroundColor: currentTheme['color-1'],
                        borderColor: currentTheme['color-3'],
                        color: currentTheme['color-5']
                      }}
                    />
                  </div>

                  {/* Phone Field */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {jobApplicationFormConfig.fields.phone.label}
                      {jobApplicationFormConfig.fields.phone.required && <span className="text-red-400 ml-1">*</span>}
                    </label>
                    <input
                      type="tel"
                      value={jobApplicationFormData.phone}
                      onChange={e => handleJobApplicationFormChange('phone', e.target.value)}
                      placeholder={jobApplicationFormConfig.fields.phone.placeholder}
                      required={jobApplicationFormConfig.fields.phone.required}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-opacity-50"
                      style={{
                        backgroundColor: currentTheme['color-1'],
                        borderColor: currentTheme['color-3'],
                        color: currentTheme['color-5']
                      }}
                    />
                  </div>

                  {/* Category Dropdown */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {jobApplicationFormConfig.fields.category.label}
                      {jobApplicationFormConfig.fields.category.required && <span className="text-red-400 ml-1">*</span>}
                    </label>
                    <select
                      value={jobApplicationFormData.category}
                      onChange={e => handleJobApplicationFormChange('category', e.target.value)}
                      required={jobApplicationFormConfig.fields.category.required}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-opacity-50"
                      style={{
                        backgroundColor: currentTheme['color-1'],
                        borderColor: currentTheme['color-3'],
                        color: currentTheme['color-5']
                      }}
                    >
                      <option value="">Select a category</option>
                      {jobApplicationFormConfig.fields.category.options.map((option, index) => (
                        <option key={index} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Experience Dropdown */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {jobApplicationFormConfig.fields.experience.label}
                      {jobApplicationFormConfig.fields.experience.required && <span className="text-red-400 ml-1">*</span>}
                    </label>
                    <select
                      value={jobApplicationFormData.experience}
                      onChange={e => handleJobApplicationFormChange('experience', e.target.value)}
                      required={jobApplicationFormConfig.fields.experience.required}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-opacity-50"
                      style={{
                        backgroundColor: currentTheme['color-1'],
                        borderColor: currentTheme['color-3'],
                        color: currentTheme['color-5']
                      }}
                    >
                      <option value="">Select experience level</option>
                      {jobApplicationFormConfig.fields.experience.options.map((option, index) => (
                        <option key={index} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Resume Upload */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {jobApplicationFormConfig.fields.resume.label}
                      {jobApplicationFormConfig.fields.resume.required && <span className="text-red-400 ml-1">*</span>}
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center hover:border-blue-400 transition-colors">
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={handleJobApplicationFileChange}
                        className="hidden"
                        id="job-resume-upload"
                        required={jobApplicationFormConfig.fields.resume.required}
                      />
                      <label htmlFor="job-resume-upload" className="cursor-pointer">
                        <div className="flex flex-col items-center">
                          <svg className="w-6 h-6 text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <p className="text-xs text-gray-600">
                            {jobApplicationFormData.resume ? jobApplicationFormData.resume.name : 'Click to upload PDF resume'}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Max size: {jobApplicationFormConfig.fields.resume.maxSize}MB
                          </p>
                        </div>
                      </label>
                    </div>
                    {jobApplicationFormData.resume && (
                      <div className="mt-1 flex items-center gap-2 text-xs text-gray-600">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{jobApplicationFormData.resume.name} ({(jobApplicationFormData.resume.size / 1024 / 1024).toFixed(2)}MB)</span>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full px-4 py-2 rounded-lg font-medium transition-all duration-200"
                    style={{
                      backgroundColor: currentTheme['color-1'],
                      color: currentTheme['color-5']
                    }}
                  >
                    {jobApplicationFormConfig.submitButtonText}
                  </button>
                  {jobApplicationSuccess && (
                    <div className="mt-2 text-green-600 text-center font-semibold animate-fade-in-fast">
                      {jobApplicationFormConfig.successMessage}
                    </div>
                  )}
                </form>
              </div>
              <span
                className="text-xs mt-1 opacity-60 text-left"
                style={{ color: currentTheme['color-1'] }}
              >
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        )}

        {/* Customer Ticket Form */}
        {showCustomerTicketForm && customerTicketFormConfig && (
          <div className="p-4">
            <div className="flex justify-end">
              <div
                className="max-w-sm w-full p-4 rounded-lg shadow-lg"
                style={{
                  backgroundColor: currentTheme['color-2'],
                  color: currentTheme['color-1'],
                  borderRadius: '0.75rem 0.75rem 0.75rem 0.25rem'
                }}
              >
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-semibold">{customerTicketFormConfig.title}</h3>
                  <button
                    onClick={() => setShowCustomerTicketForm(false)}
                    className="p-1 rounded-full hover:bg-opacity-20 hover:bg-white transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
                <form onSubmit={handleCustomerTicketFormSubmit} className="space-y-3">
                  {/* Email Field */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {customerTicketFormConfig.fields.email.label}
                      {customerTicketFormConfig.fields.email.required && <span className="text-red-400 ml-1">*</span>}
                    </label>
                    <input
                      type="email"
                      value={customerTicketFormData.email}
                      onChange={e => handleCustomerTicketFormChange('email', e.target.value)}
                      placeholder={customerTicketFormConfig.fields.email.placeholder}
                      required={customerTicketFormConfig.fields.email.required}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-opacity-50"
                      style={{
                        backgroundColor: currentTheme['color-1'],
                        borderColor: currentTheme['color-3'],
                        color: currentTheme['color-5']
                      }}
                    />
                  </div>

                  {/* Phone Field - only render if phone field is defined */}
                  {customerTicketFormConfig.fields.phone && (
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        {customerTicketFormConfig.fields.phone.label}
                        {customerTicketFormConfig.fields.phone.required && <span className="text-red-400 ml-1">*</span>}
                      </label>
                      <input
                        type="tel"
                        value={customerTicketFormData.phone}
                        onChange={e => handleCustomerTicketFormChange('phone', e.target.value)}
                        placeholder={customerTicketFormConfig.fields.phone.placeholder}
                        required={customerTicketFormConfig.fields.phone.required}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-opacity-50"
                        style={{
                          backgroundColor: currentTheme['color-1'],
                          borderColor: currentTheme['color-3'],
                          color: currentTheme['color-5']
                        }}
                      />
                    </div>
                  )}

                  {/* Issue Type Dropdown */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {customerTicketFormConfig.fields.issueType.label}
                      {customerTicketFormConfig.fields.issueType.required && <span className="text-red-400 ml-1">*</span>}
                    </label>
                    <select
                      value={customerTicketFormData.issueType}
                      onChange={e => handleCustomerTicketFormChange('issueType', e.target.value)}
                      required={customerTicketFormConfig.fields.issueType.required}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-opacity-50"
                      style={{
                        backgroundColor: currentTheme['color-1'],
                        borderColor: currentTheme['color-3'],
                        color: currentTheme['color-5']
                      }}
                    >
                      <option value="">Select an issue type</option>
                      {customerTicketFormConfig.fields.issueType.options.map((option, index) => (
                        <option key={index} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Issue Dropdown */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {customerTicketFormConfig.fields.issue.label}
                      {customerTicketFormConfig.fields.issue.required && <span className="text-red-400 ml-1">*</span>}
                    </label>
                    <select
                      value={customerTicketFormData.issue}
                      onChange={e => handleCustomerTicketFormChange('issue', e.target.value)}
                      required={customerTicketFormConfig.fields.issue.required}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-opacity-50"
                      style={{
                        backgroundColor: currentTheme['color-1'],
                        borderColor: currentTheme['color-3'],
                        color: currentTheme['color-5']
                      }}
                    >
                      <option value="">Select an issue</option>
                      {customerTicketFormConfig.fields.issue.options.map((option, index) => (
                        <option key={index} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Message Field */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {customerTicketFormConfig.fields.message.label}
                      {customerTicketFormConfig.fields.message.required && <span className="text-red-400 ml-1">*</span>}
                    </label>
                    <textarea
                      value={customerTicketFormData.message}
                      onChange={e => handleCustomerTicketFormChange('message', e.target.value)}
                      placeholder={customerTicketFormConfig.fields.message.placeholder}
                      rows={3}
                      required={customerTicketFormConfig.fields.message.required}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-opacity-50 resize-none"
                      style={{
                        backgroundColor: currentTheme['color-1'],
                        borderColor: currentTheme['color-3'],
                        color: currentTheme['color-5']
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full px-4 py-2 rounded-lg font-medium transition-all duration-200"
                    style={{
                      backgroundColor: currentTheme['color-1'],
                      color: currentTheme['color-5']
                    }}
                  >
                    {customerTicketFormConfig.submitButtonText}
                  </button>
                  {customerTicketSuccess && (
                    <div className="mt-2 text-green-600 text-center font-semibold animate-fade-in-fast">
                      {customerTicketFormConfig.successMessage}
                    </div>
                  )}
                </form>
              </div>
              <span
                className="text-xs mt-1 opacity-60 text-left"
                style={{ color: currentTheme['color-1'] }}
              >
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        )}

        {/* Employee Ticket Form */}
        {showEmployeeTicketForm && employeeTicketFormConfig && (
          <div className="p-4">
            <div className="flex justify-end">
              <div
                className="max-w-sm w-full p-4 rounded-lg shadow-lg"
                style={{
                  backgroundColor: currentTheme['color-2'],
                  color: currentTheme['color-1'],
                  borderRadius: '0.75rem 0.75rem 0.75rem 0.25rem'
                }}
              >
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-semibold">{employeeTicketFormConfig.title}</h3>
                  <button
                    onClick={() => setShowEmployeeTicketForm(false)}
                    className="p-1 rounded-full hover:bg-opacity-20 hover:bg-white transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
                <form onSubmit={handleEmployeeTicketFormSubmit} className="space-y-3">
                  {/* Employee ID Field */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {employeeTicketFormConfig.fields.id.label}
                      {employeeTicketFormConfig.fields.id.required && <span className="text-red-400 ml-1">*</span>}
                    </label>
                    <input
                      type="text"
                      value={employeeTicketFormData.id}
                      onChange={e => handleEmployeeTicketFormChange('id', e.target.value)}
                      placeholder={employeeTicketFormConfig.fields.id.placeholder}
                      required={employeeTicketFormConfig.fields.id.required}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-opacity-50"
                      style={{
                        backgroundColor: currentTheme['color-1'],
                        borderColor: currentTheme['color-3'],
                        color: currentTheme['color-5']
                      }}
                    />
                  </div>

                  {/* Issue Type Dropdown */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {employeeTicketFormConfig.fields.issueType.label}
                      {employeeTicketFormConfig.fields.issueType.required && <span className="text-red-400 ml-1">*</span>}
                    </label>
                    <select
                      value={employeeTicketFormData.issueType}
                      onChange={e => handleEmployeeTicketFormChange('issueType', e.target.value)}
                      required={employeeTicketFormConfig.fields.issueType.required}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-opacity-50"
                      style={{
                        backgroundColor: currentTheme['color-1'],
                        borderColor: currentTheme['color-3'],
                        color: currentTheme['color-5']
                      }}
                    >
                      <option value="">Select an issue type</option>
                      {employeeTicketFormConfig.fields.issueType.options.map((option, index) => (
                        <option key={index} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Issue Dropdown */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {employeeTicketFormConfig.fields.issue.label}
                      {employeeTicketFormConfig.fields.issue.required && <span className="text-red-400 ml-1">*</span>}
                    </label>
                    <select
                      value={employeeTicketFormData.issue}
                      onChange={e => handleEmployeeTicketFormChange('issue', e.target.value)}
                      required={employeeTicketFormConfig.fields.issue.required}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-opacity-50"
                      style={{
                        backgroundColor: currentTheme['color-1'],
                        borderColor: currentTheme['color-3'],
                        color: currentTheme['color-5']
                      }}
                    >
                      <option value="">Select an issue</option>
                      {employeeTicketFormConfig.fields.issue.options.map((option, index) => (
                        <option key={index} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Message Field */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {employeeTicketFormConfig.fields.message.label}
                      {employeeTicketFormConfig.fields.message.required && <span className="text-red-400 ml-1">*</span>}
                    </label>
                    <textarea
                      value={employeeTicketFormData.message}
                      onChange={e => handleEmployeeTicketFormChange('message', e.target.value)}
                      placeholder={employeeTicketFormConfig.fields.message.placeholder}
                      rows={3}
                      required={employeeTicketFormConfig.fields.message.required}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-opacity-50 resize-none"
                      style={{
                        backgroundColor: currentTheme['color-1'],
                        borderColor: currentTheme['color-3'],
                        color: currentTheme['color-5']
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full px-4 py-2 rounded-lg font-medium transition-all duration-200"
                    style={{
                      backgroundColor: currentTheme['color-1'],
                      color: currentTheme['color-5']
                    }}
                  >
                    {employeeTicketFormConfig.submitButtonText}
                  </button>
                  {employeeTicketSuccess && (
                    <div className="mt-2 text-green-600 text-center font-semibold animate-fade-in-fast">
                      {employeeTicketFormConfig.successMessage}
                    </div>
                  )}
                </form>
              </div>
              <span
                className="text-xs mt-1 opacity-60 text-left"
                style={{ color: currentTheme['color-1'] }}
              >
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input Area */}
      <div
        className="p-4 border-t flex items-center gap-3"
        style={{
          backgroundColor: currentTheme['color-2'],
          borderTopColor: currentTheme['color-3']
        }}
      >
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          className="flex-1 px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-opacity-50"
          style={{
            backgroundColor: 'white',
            borderColor: currentTheme['color-3'],
          }}
        />
        <button
          onClick={handleSendMessage}
          disabled={!inputMessage.trim()}
          className="px-4 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: currentTheme['color-1'],
            color: currentTheme['color-5']
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatbotPreview;