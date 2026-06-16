import React, { useState } from 'react';
import Button from '@/components/ui/button/Button';

interface ContactFormConfig {
  title: string;
  fields: {
    name: { label: string; placeholder: string; required: boolean };
    email: { label: string; placeholder: string; required: boolean };
    dropdown1: { label: string; required: boolean; options: string[] };
    dropdown2: { label: string; required: boolean; options: string[] };
    message: { label: string; placeholder: string; required: boolean };
  };
  submitButtonText: string;
  successMessage: string;
}

interface ContactFormProps {
  config: ContactFormConfig;
  onSubmit?: (formData: {
    name: string;
    email: string;
    dropdown1: string;
    dropdown2: string;
    message: string;
  }) => void;
}

const ContactForm: React.FC<ContactFormProps> = ({
  config,
  onSubmit
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    dropdown1: '',
    dropdown2: '',
    message: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Validate name
    if (config.fields.name.required && !formData.name.trim()) {
      newErrors.name = `${config.fields.name.label} is required`;
    }

    // Validate email
    if (config.fields.email.required && !formData.email.trim()) {
      newErrors.email = `${config.fields.email.label} is required`;
    } else if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Validate dropdown1
    if (config.fields.dropdown1.required && !formData.dropdown1) {
      newErrors.dropdown1 = `${config.fields.dropdown1.label} is required`;
    }

    // Validate dropdown2
    if (config.fields.dropdown2.required && !formData.dropdown2) {
      newErrors.dropdown2 = `${config.fields.dropdown2.label} is required`;
    }

    // Validate message
    if (config.fields.message.required && !formData.message.trim()) {
      newErrors.message = `${config.fields.message.label} is required`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      if (onSubmit) {
        onSubmit(formData);
      }
      
      setIsSubmitted(true);
      
      // Reset form after 2 seconds
      setTimeout(() => {
        setFormData({
          name: '',
          email: '',
          dropdown1: '',
          dropdown2: '',
          message: ''
        });
        setIsSubmitted(false);
      }, 2000);
    }
  };

  if (isSubmitted) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Success!</h3>
          <p className="text-gray-600">{config.successMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{config.title}</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {config.fields.name.label}
            {config.fields.name.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder={config.fields.name.placeholder}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.name ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
        </div>

        {/* Email Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {config.fields.email.label}
            {config.fields.email.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder={config.fields.email.placeholder}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.email ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
        </div>

        {/* Dropdown 1 Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {config.fields.dropdown1.label}
            {config.fields.dropdown1.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <select
            value={formData.dropdown1}
            onChange={(e) => handleInputChange('dropdown1', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.dropdown1 ? 'border-red-300' : 'border-gray-300'
            }`}
          >
            <option value="">Select an option</option>
            {config.fields.dropdown1.options.map((option, index) => (
              <option key={index} value={option}>{option}</option>
            ))}
          </select>
          {errors.dropdown1 && <p className="text-red-500 text-sm mt-1">{errors.dropdown1}</p>}
        </div>

        {/* Dropdown 2 Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {config.fields.dropdown2.label}
            {config.fields.dropdown2.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <select
            value={formData.dropdown2}
            onChange={(e) => handleInputChange('dropdown2', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.dropdown2 ? 'border-red-300' : 'border-gray-300'
            }`}
          >
            <option value="">Select an option</option>
            {config.fields.dropdown2.options.map((option, index) => (
              <option key={index} value={option}>{option}</option>
            ))}
          </select>
          {errors.dropdown2 && <p className="text-red-500 text-sm mt-1">{errors.dropdown2}</p>}
        </div>

        {/* Message Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {config.fields.message.label}
            {config.fields.message.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <textarea
            value={formData.message}
            onChange={(e) => handleInputChange('message', e.target.value)}
            placeholder={config.fields.message.placeholder}
            rows={4}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
              errors.message ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.message && <p className="text-red-500 text-sm mt-1">{errors.message}</p>}
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <Button
           
            variant="primary"
            size="md"
            className="w-full"
          >
            {config.submitButtonText}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ContactForm; 