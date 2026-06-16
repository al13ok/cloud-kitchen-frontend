'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Contact, ContactFormData } from '@/types/contact';
import { contactService } from '@/services/contactService';
import Button from '../ui/button/Button';
import Input from '../form/input/InputField';
import Label from '../form/Label';

interface ContactFormProps {
  contact?: Contact;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ContactForm({ contact, onSuccess, onCancel }: ContactFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [formData, setFormData] = useState<ContactFormData>({
    first_name: '',
    last_name: '',
    type: '',
    company: '',
    job_title: '',
    emails: [''],
    phones: [''],
    address: '',
    significant_date: '',
    website: '',
    related_person: '',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicates, setDuplicates] = useState<Contact[]>([]);
  const [showDuplicates, setShowDuplicates] = useState(false);

  useEffect(() => {
    if (contact) {
      setFormData({
        first_name: contact.first_name || '',
        last_name: contact.last_name || '',
        type: contact.type || '',
        company: contact.company || '',
        job_title: contact.job_title || '',
        emails: contact.emails && contact.emails.length > 0 ? contact.emails : [''],
        phones: contact.phones && contact.phones.length > 0 ? contact.phones : [''],
        address: contact.address || '',
        significant_date: contact.significant_date || '',
        website: contact.website || '',
        related_person: contact.related_person || '',
        notes: contact.notes || '',
      });
    }
  }, [contact]);

  

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Google Contacts validation: At least one of name, email, or phone must exist
    const hasName = formData.first_name.trim() || formData.last_name.trim();
    const hasEmail = formData.emails.some(email => email.trim());
    const hasPhone = formData.phones.some(phone => phone.trim());

    if (!hasName && !hasEmail && !hasPhone) {
      newErrors.general = 'At least one of name, email, or phone must be provided';
    }

    // Email validation - must be in valid format if provided
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    formData.emails.forEach((email, index) => {
      if (email.trim()) {
        if (!emailRegex.test(email.trim())) {
          newErrors[`email_${index}`] = 'Invalid email format (must be user@domain.com)';
        }
      }
    });

    // Phone validation - accepts numbers with optional + for international
    const phoneRegex = /^[\+]?[\d\s\-\(\)]+$/;
    formData.phones.forEach((phone, index) => {
      if (phone.trim()) {
        // Remove spaces and dashes for validation
        const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
        if (!phoneRegex.test(phone.trim()) || cleanPhone.length < 3) {
          newErrors[`phone_${index}`] = 'Invalid phone format (numbers with optional +, spaces, or dashes)';
        }
      }
    });

    // Website validation - must be valid URL if provided
    if (formData.website.trim()) {
      try {
        const url = new URL(formData.website);
        if (!['http:', 'https:'].includes(url.protocol)) {
          newErrors.website = 'Website must start with http:// or https://';
        }
      } catch {
        newErrors.website = 'Invalid website URL format';
      }
    }

    // Significant date validation - must be valid date format if provided
    if (formData.significant_date.trim()) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(formData.significant_date)) {
        newErrors.significant_date = 'Date must be in YYYY-MM-DD format';
      } else {
        const date = new Date(formData.significant_date);
        if (isNaN(date.getTime())) {
          newErrors.significant_date = 'Invalid date';
        }
      }
    }

    // Address validation - basic check for meaningful content
    if (formData.address.trim()) {
      const addressWords = formData.address.trim().split(/\s+/).length;
      if (addressWords < 2) {
        newErrors.address = 'Address should contain at least 2 words';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof ContactFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const handleArrayInputChange = (field: 'emails' | 'phones', index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item),
    }));
    
    // Clear error when user starts typing
    if (errors[field] || errors[`${field}_${index}`]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
        [`${field}_${index}`]: '',
      }));
    }
  };

  const addArrayItem = (field: 'emails' | 'phones') => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], ''],
    }));
  };

  const removeArrayItem = (field: 'emails' | 'phones', index: number) => {
    if (formData[field].length > 1) {
      setFormData(prev => ({
        ...prev,
        [field]: prev[field].filter((_, i) => i !== index),
      }));
    }
  };

  const checkForDuplicates = async () => {
    const primaryEmail = formData.emails.find(email => email.trim());
    const primaryPhone = formData.phones.find(phone => phone.trim());
    
    if (primaryEmail || primaryPhone) {
      try {
        const foundDuplicates = await contactService.checkDuplicates(primaryEmail, primaryPhone);
        setDuplicates(foundDuplicates);
        setShowDuplicates(foundDuplicates.length > 0);
      } catch (error) {
        console.error('Error checking duplicates:', error);
        // Continue with submission even if duplicate check fails
        setDuplicates([]);
        setShowDuplicates(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Check for duplicates before submitting (only for new contacts)
    if (!contact?._id) {
      await checkForDuplicates();
      
      // If duplicates found and user hasn't confirmed, show warning
      if (duplicates.length > 0 && !showDuplicates) {
        setShowDuplicates(true);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // Filter out empty emails and phones and prepare data for API
      const submitData: ContactFormData = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        type: (formData.type || '').trim(),
        company: formData.company.trim(),
        job_title: formData.job_title.trim(),
        emails: formData.emails.filter(email => email.trim()),
        phones: formData.phones.filter(phone => phone.trim()),
        address: formData.address.trim(),
        website: formData.website.trim(),
        related_person: formData.related_person.trim(),
        notes: formData.notes.trim(),
        significant_date: formData.significant_date.trim(),
      };

      // Remove empty string fields to avoid API validation issues
      const payload: Partial<ContactFormData> = { ...submitData };
      (Object.keys(payload) as Array<keyof ContactFormData>).forEach((key) => {
        const value = payload[key];
        if (typeof value === 'string' && value.trim() === '') {
          delete payload[key];
        }
      });

      if (contact?._id) {
        await contactService.updateContact(contact._id, payload as ContactFormData);
      } else {
        await contactService.createContact(payload as ContactFormData);
      }
      
      onSuccess();
    } catch (error) {
      const err = error as { response?: { status?: number; data?: { detail?: Array<{ loc: (string|number)[]; msg: string }> } } };
      // Handle API validation errors
      if (err.response?.status === 422 && err.response.data?.detail) {
        const apiErrors = err.response.data.detail;
        const newErrors: Record<string, string> = {};
        apiErrors.forEach((apiErr) => {
          const field = String(apiErr.loc[apiErr.loc.length - 1]);
          newErrors[field] = apiErr.msg;
        });
        setErrors(newErrors);
      } else {
        setErrors({ submit: 'Failed to save contact. Please check the form data and try again.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-6">
          {contact ? 'Edit Contact' : 'Add New Contact'}
        </h4>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {contact ? 'Update contact details to keep your contact list up-to-date.' : 'Add a new contact to your contact list. At least one of name, email, or phone must be provided.'}
        </p>
        
      </div>

      {/* General Validation Error */}
      {errors.general && (
        <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded">
          {errors.general}
        </div>
      )}

      {/* Duplicate Warning */}
      {showDuplicates && duplicates.length > 0 && (
        <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium">Potential Duplicate Contacts Found</h3>
              <div className="mt-2 text-sm">
                <p>The following contacts have similar email or phone numbers:</p>
                <ul className="mt-2 list-disc list-inside">
                  {duplicates.map((dup, index) => (
                    <li key={index}>
                      {dup.first_name} {dup.last_name} 
                      {dup.emails?.[0] && ` (${dup.emails[0]})`}
                      {dup.phones?.[0] && ` - ${dup.phones[0]}`}
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDuplicates(false)}
                    className="text-sm bg-blue-100 hover:bg-blue-200 px-3 py-1 rounded"
                  >
                    Continue Anyway
                  </button>
                  <button
                    type="button"
                    onClick={onCancel}
                    className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col">
        <div className="custom-scrollbar h-[450px] overflow-y-auto px-2 pb-3">
          <div>
            <h5 className="mb-5 text-lg font-medium text-gray-800 dark:text-white/90 lg:mb-6">
              Basic Information
            </h5>

            <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
              <div>
                <Label>First Name</Label>
                <Input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => handleInputChange('first_name', e.target.value)}
                  placeholder="Enter first name"
                />
                {errors.first_name && (
                  <p className="mt-1 text-sm text-blue-600">{errors.first_name}</p>
                )}
              </div>

              <div>
                <Label>Last Name</Label>
                <Input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => handleInputChange('last_name', e.target.value)}
                  placeholder="Enter last name"
                />
              </div>

              <div>
                <Label>Company</Label>
                <Input
                  type="text"
                  value={formData.company}
                  onChange={(e) => handleInputChange('company', e.target.value)}
                  placeholder="Enter company name"
                />
              </div>

              <div>
                <Label>Job Title</Label>
                <Input
                  type="text"
                  value={formData.job_title}
                  onChange={(e) => handleInputChange('job_title', e.target.value)}
                  placeholder="Enter job title"
                />
              </div>

              <div>
                <Label>Type</Label>
                <Input
                  type="text"
                  value={formData.type || ''}
                  onChange={(e) => handleInputChange('type', e.target.value)}
                  placeholder="Work / Home / Other"
                />
              </div>
            </div>
          </div>

          <div className="mt-7">
            <h5 className="mb-5 text-lg font-medium text-gray-800 dark:text-white/90 lg:mb-6">
              Contact Information
            </h5>

            <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
              <div className="col-span-2">
                <Label>Email Addresses</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Format: user@domain.com
                </p>
                {formData.emails.map((email, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => handleArrayInputChange('emails', index, e.target.value)}
                      placeholder="user@example.com"
                    />
                    {formData.emails.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeArrayItem('emails', index)}
                        className="px-3 py-2 text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addArrayItem('emails')}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  + Add Email
                </button>
                {errors.emails && (
                  <p className="mt-1 text-sm text-blue-600">{errors.emails}</p>
                )}
                {formData.emails.map((_, index) => (
                  errors[`email_${index}`] && (
                    <p key={index} className="mt-1 text-sm text-blue-600">
                      {errors[`email_${index}`]}
                    </p>
                  )
                ))}
              </div>

              <div className="col-span-2">
                <Label>Phone Numbers</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Format: +91 9876543210 or 987-654-3210
                </p>
                {formData.phones.map((phone, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <Input
                      type="tel"
                      value={phone}
                      onChange={(e) => handleArrayInputChange('phones', index, e.target.value)}
                      placeholder="+91 9876543210"
                    />
                    {formData.phones.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeArrayItem('phones', index)}
                        className="px-3 py-2 text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addArrayItem('phones')}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  + Add Phone
                </button>
                {formData.phones.map((_, index) => (
                  errors[`phone_${index}`] && (
                    <p key={index} className="mt-1 text-sm text-blue-600">
                      {errors[`phone_${index}`]}
                    </p>
                  )
                ))}
              </div>

              <div className="col-span-2">
                <Label>Address</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Enter a meaningful address (at least 2 words)
                </p>
                <textarea
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="123 Main Street, City, State"
                />
                {errors.address && (
                  <p className="mt-1 text-sm text-blue-600">{errors.address}</p>
                )}
              </div>

              <div>
                <Label>Date of Birth</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Format: YYYY-MM-DD (e.g., 1998-05-15)
                </p>
                <Input
                  type="date"
                  value={formData.significant_date}
                  onChange={(e) => handleInputChange('significant_date', e.target.value)}
                />
                {errors.significant_date && (
                  <p className="mt-1 text-sm text-blue-600">{errors.significant_date}</p>
                )}
              </div>

              <div>
                <Label>Website</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Must start with http:// or https://
                </p>
                <Input
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  placeholder="https://example.com"
                />
                {errors.website && (
                  <p className="mt-1 text-sm text-blue-600">{errors.website}</p>
                )}
              </div>

              <div>
                <Label>Related Person</Label>
                <Input
                  type="text"
                  value={formData.related_person}
                  onChange={(e) => handleInputChange('related_person', e.target.value)}
                  placeholder="Enter related person name"
                />
              </div>

              <div className="col-span-2">
                <Label>Notes</Label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Enter any additional notes"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {errors.submit && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded">
            {errors.submit}
          </div>
        )}

        {/* Form Actions */}
        <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
          <Button size="sm" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" onClick={() => formRef.current?.requestSubmit()} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : contact ? 'Update Contact' : 'Add Contact'}
          </Button>
        </div>

      </form>
    </div>
  );
}
