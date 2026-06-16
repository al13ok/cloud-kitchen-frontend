"use client";

import React, { useState, useEffect, useCallback } from "react";
import { sendSurveyEmail, getEmployees, getCustomers, trackSurveyEmail, saveSurveyEmailBody, getSurveyEmailBody } from "@/utils/api";
import { SendSurveyEmailRequest, Department } from "@/types";

interface EmailConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  surveyId: string;
  surveyTitle: string;
  publicLink: string;
}

const EmailConfigModal: React.FC<EmailConfigModalProps> = ({
  isOpen,
  onClose,
  surveyId,
  surveyTitle,
  publicLink,
}) => {
  // Email sending mode: 'individual' or 'department'
  const [emailMode, setEmailMode] = useState<'individual' | 'department'>('individual');
  
  // Individual email state
  const [email, setEmail] = useState("");
  
  // Department state
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [selectedDepartmentMembers, setSelectedDepartmentMembers] = useState<{ name: string; email: string }[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  
  // Common state
  const [subject, setSubject] = useState(`Survey: ${surveyTitle}`);
  const [message, setMessage] = useState(
    `Hello,\n\nWe would appreciate your feedback on our survey: "${surveyTitle}"\n\nPlease click the link below to participate:\n${publicLink}\n\nThank you for your time!\n\nBest regards,\nSurvey Team`
  );
  const [isSending, setIsSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [emailError, setEmailError] = useState("");
  
  // Email template edit state
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [originalMessage, setOriginalMessage] = useState("");

  // Load saved email body text from database
  const loadSavedTemplate = useCallback(async () => {
    try {
      const bodyData = await getSurveyEmailBody(surveyId);
      if (bodyData.body_text) {
        setMessage(bodyData.body_text);
        setOriginalMessage(bodyData.body_text);
      }
    } catch (error) {
      console.error("Failed to load saved body text:", error);
      // Use default message if loading fails
    }
  }, [surveyId]);

  // Fetch departments when modal opens
  useEffect(() => {
    if (isOpen && emailMode === 'department') {
      fetchDepartments();
    }
  }, [isOpen, emailMode]);

  // Load saved email template when modal opens
  useEffect(() => {
    if (isOpen && surveyId) {
      loadSavedTemplate();
    }
  }, [isOpen, surveyId, loadSavedTemplate]);

  // Handle edit button click
  const handleEditClick = () => {
    setOriginalMessage(message);
    setIsEditing(true);
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setMessage(originalMessage);
    setIsEditing(false);
  };

  // Handle save body text - Added: admin-editable email body (template preserved)
  const handleSaveTemplate = async () => {
    if (!message.trim()) {
      setErrorMessage("Email message cannot be empty");
      return;
    }

    setIsSavingTemplate(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await saveSurveyEmailBody(surveyId, message);

      setSuccessMessage("Email body text saved successfully!");
      setIsEditing(false);
      setOriginalMessage(message);
      
      // Clear success message after 2 seconds
      setTimeout(() => {
        setSuccessMessage("");
      }, 2000);
    } catch (error) {
      console.error("Failed to save body text:", error);
      setErrorMessage(error instanceof Error ? error.message : "Failed to save email body text");
    } finally {
      setIsSavingTemplate(false);
    }
  };

  // Fetch departments from API by fetching employees and customers
  const fetchDepartments = async () => {
    setLoadingDepartments(true);
    setErrorMessage("");
    try {
      // Fetch employees and customers in parallel
      console.log('🔄 Fetching employees and customers from backend...');
      const [employeesData, customersData] = await Promise.all([
        getEmployees(1, 1000).catch((err: unknown) => {
          console.error('Failed to fetch employees:', err);
          return null;
        }),
        getCustomers(1, 1000).catch((err: unknown) => {
          console.error('Failed to fetch customers:', err);
          return null;
        })
      ]);
      
      // Process employees
      console.log('📊 Employees data received:', employeesData);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let employeesList: any[] = [];
      
      if (employeesData) {
        if (Array.isArray(employeesData)) {
          employeesList = employeesData;
          console.log('✅ Using direct array format for employees');
        } else if (employeesData && typeof employeesData === 'object') {
          const employeesObj = employeesData as Record<string, unknown>;
          if ('items' in employeesObj && Array.isArray(employeesObj.items)) {
            employeesList = employeesObj.items;
            console.log('✅ Using paginated format with items for employees');
          } else if ('data' in employeesObj && Array.isArray(employeesObj.data)) {
            employeesList = employeesObj.data;
            console.log('✅ Using data property format for employees');
          } else {
            const keys = Object.keys(employeesObj);
            console.log('📊 Available employee keys:', keys);
            for (const key of keys) {
              if (Array.isArray(employeesObj[key])) {
                employeesList = employeesObj[key] as unknown[];
                console.log(`✅ Using array from key: ${key} for employees`);
                break;
              }
            }
          }
        }
      }
      
      // Process customers
      console.log('📊 Customers data received:', customersData);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let customersList: any[] = [];
      
      if (customersData) {
        if (Array.isArray(customersData)) {
          customersList = customersData;
          console.log('✅ Using direct array format for customers');
        } else if (customersData && typeof customersData === 'object') {
          const customersObj = customersData as Record<string, unknown>;
          if ('items' in customersObj && Array.isArray(customersObj.items)) {
            customersList = customersObj.items;
            console.log('✅ Using paginated format with items for customers');
          } else if ('data' in customersObj && Array.isArray(customersObj.data)) {
            customersList = customersObj.data;
            console.log('✅ Using data property format for customers');
          } else {
            const keys = Object.keys(customersObj);
            console.log('📊 Available customer keys:', keys);
            for (const key of keys) {
              if (Array.isArray(customersObj[key])) {
                customersList = customersObj[key] as unknown[];
                console.log(`✅ Using array from key: ${key} for customers`);
                break;
              }
            }
          }
        }
      }
      
      console.log('📊 Final employees list:', employeesList);
      console.log('📊 Final customers list:', customersList);
      
      // Create Employee department with all employees
      const employeeDept: Department = {
        name: "Employee",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        members: employeesList.map((emp: any) => ({
          name: emp.name || emp.full_name || emp.username || 'Unknown',
          email: emp.email || ''
        }))
      };

      // Create Customer department with all customers
      const customerDept: Department = {
        name: "Customer",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        members: customersList.map((cust: any) => ({
          name: cust.name || cust.full_name || cust.company || 'Unknown',
          email: cust.email || ''
        }))
      };

      // Set departments
      const allDepts = [employeeDept, customerDept];
      setDepartments(allDepts);
      
      console.log(`✅ Successfully loaded ${employeesList.length} employees and ${customersList.length} customers`);
    } catch (error) {
      console.error("❌ Error fetching data:", error);
      const errorMsg = error instanceof Error ? error.message : "Failed to load data";
      setErrorMessage(`Failed to load data: ${errorMsg}. Please check if the backend API is running.`);
      
      // Set empty departments as fallback
      setDepartments([
        { name: "Employee", members: [] },
        { name: "Customer", members: [] }
      ]);
    } finally {
      setLoadingDepartments(false);
    }
  };

  // Handle department selection
  const handleDepartmentChange = (deptName: string) => {
    setSelectedDepartment(deptName);
    const dept = departments.find(d => d.name === deptName);
    setSelectedDepartmentMembers(dept ? dept.members : []);
    setSelectedEmails([]);
  };

  const toggleEmailSelection = (emailAddr: string) => {
    setSelectedEmails(prev => prev.includes(emailAddr)
      ? prev.filter(e => e !== emailAddr)
      : [...prev, emailAddr]
    );
  };

  const toggleSelectAll = () => {
    if (selectedDepartmentMembers.length === 0) return;
    if (selectedEmails.length === selectedDepartmentMembers.length) {
      setSelectedEmails([]);
    } else {
      setSelectedEmails(selectedDepartmentMembers.map(m => m.email).filter(Boolean));
    }
  };

  // Email validation function
  const validateEmail = (emailAddress: string): string => {
    if (!emailAddress.trim()) {
      return "Email address is required";
    }
    
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    if (!emailRegex.test(emailAddress.trim())) {
      return "Please enter a valid email address";
    }
    
    return "";
  };

  // Handle email change with validation
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    
    // Only show validation error if user has typed something and it's invalid
    if (newEmail.length > 0) {
      const validationError = validateEmail(newEmail);
      setEmailError(validationError);
    } else {
      setEmailError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (emailMode === 'individual') {
        // Individual email sending
        const emailValidationError = validateEmail(email);
        if (emailValidationError) {
          setEmailError(emailValidationError);
          setErrorMessage(emailValidationError);
          setIsSending(false);
          return;
        }

        // Use the current message from state (which may be from saved template)
        const emailData: SendSurveyEmailRequest = {
          survey_id: surveyId,
          recipient_email: email.trim(),
        };

        console.log('Sending individual email with data:', emailData);
        const response = await sendSurveyEmail(emailData);
        console.log('Individual email response:', response);
        
        // Check if response has message (indicates success)
        if (response.message) {
          // Track the email after successful send
          try {
            await trackSurveyEmail({
              survey_id: surveyId,
              recipient_email: email.trim(),
            });
            console.log('✅ Email tracked successfully');
          } catch (trackError) {
            console.error('⚠️ Failed to track email:', trackError);
            // Don't fail the whole operation if tracking fails
          }
          
          setSuccessMessage(`Email sent successfully to ${response.recipient_email || email.trim()}`);
          // Close modal and go back to main page after 1 second
          setTimeout(() => {
            handleClose();
          }, 1000);
        } else {
          setErrorMessage(message || "Failed to send email");
        }
      } else {
        // Department email sending
        if (!selectedDepartment) {
          setErrorMessage("Please select a department");
          return;
        }

        const recipients = selectedEmails.filter(Boolean);
        if (recipients.length === 0) {
          setErrorMessage("Please select at least one recipient from the department members list");
          return;
        }

        // Send to selected recipients one by one using the individual send API
        // Backend will use saved template from database
        const results = await Promise.allSettled(
          recipients.map((recipient) => {
            const emailData: SendSurveyEmailRequest = {
              survey_id: surveyId,
              recipient_email: recipient,
            };
            return sendSurveyEmail(emailData);
          })
        );

        // Track emails for successfully sent emails
        const successfulEmails: string[] = [];
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            successfulEmails.push(recipients[index]);
          }
        });

        // Track all successful emails
        if (successfulEmails.length > 0) {
          try {
            await Promise.allSettled(
              successfulEmails.map((recipient) =>
                trackSurveyEmail({
                  survey_id: surveyId,
                  recipient_email: recipient,
                })
              )
            );
            console.log('✅ Emails tracked successfully');
          } catch (trackError) {
            console.error('⚠️ Failed to track some emails:', trackError);
            // Don't fail the whole operation if tracking fails
          }
        }

        const fulfilled = results.filter(r => r.status === 'fulfilled').length;
        const rejected = results.length - fulfilled;
        if (fulfilled > 0 && rejected === 0) {
          setSuccessMessage(`Survey sent successfully to ${fulfilled} selected member(s)`);
          setTimeout(() => { handleClose(); }, 1500);
        } else if (fulfilled > 0 && rejected > 0) {
          setSuccessMessage(`Survey sent to ${fulfilled} member(s); ${rejected} failed.`);
        } else {
          setErrorMessage("Failed to send emails to selected members");
        }
      }
    } catch (error) {
      console.error("Error sending email:", error);
      setErrorMessage(error instanceof Error ? error.message : "Failed to send email. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    // Reset individual email state
    setEmail("");
    setEmailError("");
    
    // Reset department state
    setSelectedDepartment("");
    setSelectedDepartmentMembers([]);
    setSelectedEmails([]);
    
    // Reset common state
    setSubject(`Survey: ${surveyTitle}`);
    setMessage(
      `Hello,\n\nWe would appreciate your feedback on our survey: "${surveyTitle}"\n\nPlease click the link below to participate:\n${publicLink}\n\nThank you for your time!\n\nBest regards,\nSurvey Team`
    );
    setSuccessMessage("");
    setErrorMessage("");
    
    // Reset edit state
    setIsEditing(false);
    setOriginalMessage("");
    setIsSavingTemplate(false);
    
    // Reset to individual mode
    setEmailMode('individual');
    
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />
      <div className="relative z-[10000] w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Send Survey via Email
          </h3>
          <button 
            onClick={handleClose} 
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" 
            aria-label="Close"
          >
            <span className="block text-xl leading-none">&times;</span>
          </button>
        </div>


        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800 dark:text-green-200">{successMessage}</p>
              </div>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800 dark:text-red-200">{errorMessage}</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Mode Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Send Survey To
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="emailMode"
                  value="individual"
                  checked={emailMode === 'individual'}
                  onChange={(e) => setEmailMode(e.target.value as 'individual' | 'department')}
                  className="mr-2 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Individual Email</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="emailMode"
                  value="department"
                  checked={emailMode === 'department'}
                  onChange={(e) => setEmailMode(e.target.value as 'individual' | 'department')}
                  className="mr-2 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Department</span>
              </label>
            </div>
          </div>

          {/* Individual Email Input */}
          {emailMode === 'individual' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Recipient Email *
              </label>
              <input
                type="text"
                value={email}
                onChange={handleEmailChange}
                placeholder="Enter recipient email address..."
                className={`w-full p-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  emailError ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              {emailError && (
                <p className="mt-1 text-xs text-red-500">{emailError}</p>
              )}
            </div>
          )}

          {/* Department Selection */}
          {emailMode === 'department' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Select Department *
                </label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => handleDepartmentChange(e.target.value)}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  disabled={loadingDepartments}
                >
                  <option value="">
                    {loadingDepartments ? "Loading departments..." : "Select a department..."}
                  </option>
                  {departments.map((dept) => (
                    <option key={dept.name} value={dept.name}>
                      {dept.name} ({dept.members.length} members)
                    </option>
                  ))}
                </select>
              </div>

              {/* Department Members Preview */}
              {selectedDepartmentMembers.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Department Members ({selectedDepartmentMembers.length})
                  </label>
                  <div className="flex items-center justify-between mb-2">
                    <button type="button" onClick={toggleSelectAll} className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">
                      {selectedEmails.length === selectedDepartmentMembers.length ? 'Clear All' : 'Select All'}
                    </button>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Selected: {selectedEmails.length}</span>
                  </div>
                  <div className="max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 p-3">
                    <div className="space-y-1">
                      {selectedDepartmentMembers.map((member, index) => (
                        <label key={index} className="flex justify-between items-center text-sm cursor-pointer">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selectedEmails.includes(member.email)}
                              onChange={() => toggleEmailSelection(member.email)}
                              className="accent-blue-600"
                            />
                            <span className="text-gray-700 dark:text-gray-300">{member.name}</span>
                          </div>
                          <span className="text-gray-500 dark:text-gray-400">{member.email}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Survey will be sent only to the selected members.
                  </p>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter email subject..."
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email Message
              </label>
              {!isEditing ? (
                <button
                  type="button"
                  onClick={handleEditClick}
                  className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-800"
                >
                  Edit
                </button>
              ) : (
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={isSavingTemplate}
                    className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-800 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveTemplate}
                    disabled={isSavingTemplate || !message.trim()}
                    className="text-sm px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSavingTemplate ? "Saving..." : "Save"}
                  </button>
                </div>
              )}
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter email message..."
              rows={8}
              disabled={!isEditing}
              className={`w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                !isEditing ? 'bg-gray-50 dark:bg-gray-800 cursor-not-allowed' : ''
              }`}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              The survey link will be automatically included in the email.
            </p>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                isSending || 
                (emailMode === 'individual' && (!!emailError || !email.trim())) ||
                (emailMode === 'department' && !selectedDepartment)
              }
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSending 
                ? (emailMode === 'department' ? "Sending to Department..." : "Sending...") 
                : (emailMode === 'department' ? "Send to Department" : "Send Email")
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmailConfigModal;
