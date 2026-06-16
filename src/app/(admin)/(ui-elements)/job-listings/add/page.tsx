'use client';
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { API_CONFIG, buildApiUrl } from '@/config/api';

type JobListingFormData = {
  title: string;
  job_function: string;
  location: string;
  job_type: string;
  experience_level: string;
  salary_range: string;
  description: string;
  key_skills: string[];
  education_requirements: string;
  certifications: string[];
  is_active: boolean;
  created_by: string;
};

type ValidationErrors = {
  title?: string;
  job_function?: string;
  location?: string;
  job_type?: string;
  experience_level?: string;
  description?: string;
  key_skills?: string;
  education_requirements?: string;
  salary_range?: string;
  certifications?: string;
};

export default function AddJobListingPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<JobListingFormData>({
    title: '',
    job_function: '',
    location: '',
    job_type: '',
    experience_level: '',
    salary_range: '',
    description: '',
    key_skills: [],
    education_requirements: '',
    certifications: [],
    is_active: true,
    created_by: 'admin@company.com'
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [submitStatus, setSubmitStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

  // Enhanced field-level validation functions with updated field rules
  const validateJobTitle = (title: string) => {
    if (!title || title.trim() === '') return 'Job title is required.';
    const trimmedTitle = title.trim();
    if (trimmedTitle.length < 2) return 'Job title must be at least 2 characters.';
    if (trimmedTitle.length > 100) return 'Job title must be 100 characters or fewer.';

    // Only letters, numbers, and spaces allowed
    const allowed = /^[A-Za-z0-9 ]+$/;
    if (!allowed.test(trimmedTitle)) return 'Only letters, numbers, and spaces are allowed.';
    return '';
  };

  const validateJobFunction = (jobFunction: string) => {
    if (!jobFunction || jobFunction.trim() === '') return 'Job function is required.';
    const trimmedFunction = jobFunction.trim();
    if (trimmedFunction.length < 2) return 'Job function must be at least 2 characters.';
    if (trimmedFunction.length > 500) return 'Job function must be less than 500 characters. Use a short action phrase.';
    
    // Job function format - letters, numbers, spaces, common punctuation
    const functionRegex = /^[A-Za-z0-9\s&\-\/().,]+$/;
    if (!functionRegex.test(trimmedFunction)) {
      return 'Job function contains invalid characters.';
    }
    return '';
  };

  const validateLocation = (location: string) => {
    if (!location || location.trim() === '') return 'Location is required.';
    const trimmedLocation = location.trim();
    if (trimmedLocation.length < 2) return 'Location must be at least 2 characters.';
    if (trimmedLocation.length > 100) return 'Location must be 100 characters or fewer.';
    // Letters, numbers, commas, and spaces allowed
    const locationRegex = /^[A-Za-z0-9, ]+$/;
    if (!locationRegex.test(trimmedLocation)) return 'Only letters, numbers, commas, and spaces are allowed.';
    return '';
  };

  const validateJobType = (jobType: string) => {
    if (!jobType || jobType.trim() === '') return 'Please select a job type.';
    const validTypes = ['full-time', 'part-time', 'contract', 'internship'];
    if (!validTypes.includes(jobType.trim())) {
      return 'Please select a valid job type.';
    }
    return '';
  };

  const validateExperienceLevel = (experienceLevel: string) => {
    if (!experienceLevel || experienceLevel.trim() === '') return 'Please select experience level.';
    const validLevels = ['entry', 'mid', 'senior', 'executive'];
    if (!validLevels.includes(experienceLevel.trim())) {
      return 'Please select a valid experience level.';
    }
    return '';
  };

  const validateJobDescription = (description: string) => {
    if (!description || description.trim() === '') return 'Job description is required.';
    const trimmedDescription = description.trim();
    if (trimmedDescription.length < 50) return 'Job description must be at least 50 characters.';
    if (trimmedDescription.length > 3000) return 'Job description should be under 3000 characters.';
    
    const descriptionRegex = /^[\s\S]{50,3000}$/;
    if (!descriptionRegex.test(trimmedDescription)) return 'Job description must be between 50 and 3000 characters.';
    return '';
  };

  const validateKeySkills = (skills: string[]) => {
    // Comma-separated values; each skill 2–50 characters
    if (!skills || skills.length === 0) return 'At least one skill is required.';
    const cleaned = skills.map(s => s.trim()).filter(Boolean);
    if (cleaned.length === 0) return 'At least one skill is required.';
    if (cleaned.some(s => s.length < 2 || s.length > 50)) return 'Each skill must be 2–50 characters.';
    return '';
  };

  const validateEducationRequirements = (education: string) => {
    if (!education || education.trim() === '') return 'Education requirements are required.';
    const trimmedEducation = education.trim();
    // Must include an education level keyword
    const levelRegex = /(Bachelor|Bachelors|Bachelor's|B\.Sc|BSc|B\.E|BE|BTech|B\.Tech|Graduation|Master|Masters|Master's|M\.Sc|MSc|M\.Tech|MTech|MBA|PhD|Diploma)/i;
    if (!levelRegex.test(trimmedEducation)) return 'Include education level (e.g., Bachelor’s, Master’s, Diploma).';
    return '';
  };

  // Salary Range validation removed as it's not being used

  const validateCertifications = (certs: string[]) => {
    // Optional. If filled, must be comma-separated (parsing enforces commas)
    if (!certs || certs.length === 0) return '';
    const cleaned = certs.map(s => s.trim()).filter(Boolean);
    if (cleaned.length === 0) return '';
    return '';
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name as keyof ValidationErrors]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Validate on blur using individual validation functions
    let error = '';
    switch (name) {
      case 'title':
        error = validateJobTitle(value);
        break;
      case 'job_function':
        error = validateJobFunction(value);
        break;
      case 'location':
        error = validateLocation(value);
        break;
      case 'job_type':
        error = validateJobType(value);
        break;
      case 'experience_level':
        error = validateExperienceLevel(value);
        break;
      case 'description':
        error = validateJobDescription(value);
        break;
      case 'education_requirements':
        error = validateEducationRequirements(value);
        break;
    }
    
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  // Strict comma-separated parser
  const parseCSV = (value: string) => value.split(',').map(s => s.trim()).filter(Boolean);

  const validateForm = (): boolean => {
    const validationErrors = {
      title: validateJobTitle(formData.title),
      job_function: validateJobFunction(formData.job_function),
      location: validateLocation(formData.location),
      job_type: validateJobType(formData.job_type),
      experience_level: validateExperienceLevel(formData.experience_level),
      description: validateJobDescription(formData.description),
      key_skills: validateKeySkills(formData.key_skills),
      education_requirements: validateEducationRequirements(formData.education_requirements),
      certifications: validateCertifications(formData.certifications)
    };
    
    setErrors(validationErrors);
    
    // Check if any field has errors (ignore empty optional field errors)
    return !Object.values(validationErrors).some(error => error !== '');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Validate form before submission (like job application form)
    if (!validateForm()) {
      return; // Stop submission if validation fails
    }
    
    setLoading(true);
    try {
      const submitData = { ...formData };

      const res = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.JOB_LISTINGS), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setSubmitStatus({ type: 'success', message: 'Job listing created successfully!' });
          // Auto-redirect after showing success message
          setTimeout(() => {
            router.push('/admin/ui-elements/job-listings');
          }, 2000);
        } else {
          setSubmitStatus({ type: 'error', message: `Error: ${data.message || 'Unknown error'}` });
        }
      } else {
        const error = await res.json();
        setSubmitStatus({ type: 'error', message: `Error: ${error?.detail || 'Unknown error'}` });
      }
    } catch (err) {
      console.error('Error creating job listing:', err);
      setSubmitStatus({ type: 'error', message: 'Error saving job listing' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 w-full font-sans">
      <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
        <div></div>
        <div className="text-right">
          <button onClick={() => router.push('/admin/ui-elements/job-listings')} className="text-blue-600 hover:underline">Back to Job Listings</button>
        </div>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Add New Job Listing</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Job Title *</label>
            <input 
              type="text" 
              name="title" 
              value={formData.title} 
              onChange={handleChange}
              onBlur={handleBlur}
              required 
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                errors.title ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
              }`}
              placeholder="Enter job title"
            />
            {errors.title && <div className="text-red-600 text-sm mt-1">{errors.title}</div>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Job Function *</label>
            <input
              type="text"
              name="job_function"
              value={formData.job_function}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Enter job function"
              required
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                errors.job_function ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
              }`}
            />
            {errors.job_function && <div className="text-red-600 text-sm mt-1">{errors.job_function}</div>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
            <input 
              type="text" 
              name="location" 
              value={formData.location} 
              onChange={handleChange}
              onBlur={handleBlur}
              required 
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                errors.location ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
              }`}
              placeholder="Enter location (letters, numbers, commas, spaces)"
            />
            {errors.location && <div className="text-red-600 text-sm mt-1">{errors.location}</div>}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Experience Level *</label>
            <select 
              name="experience_level" 
              value={formData.experience_level} 
              onChange={handleChange}
              onBlur={handleBlur}
              required 
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                errors.experience_level ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
              }`}
            >
              <option value="">Select Level</option>
              <option value="entry">Entry</option>
              <option value="mid">Mid</option>
              <option value="senior">Senior</option>
              <option value="executive">Executive</option>
            </select>
            {errors.experience_level && <div className="text-red-600 text-sm mt-1">{errors.experience_level}</div>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Job Type *</label>
            <select 
              name="job_type" 
              value={formData.job_type} 
              onChange={handleChange}
              onBlur={handleBlur}
              required 
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                errors.job_type ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
              }`}
            >
              <option value="">Select Job Type</option>
              <option value="full-time">Full-Time</option>
              <option value="part-time">Part-Time</option>
              <option value="contract">Contract</option>
              <option value="internship">Internship</option>
            </select>
            {errors.job_type && <div className="text-red-600 text-sm mt-1">{errors.job_type}</div>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Salary Range</label>
            <input 
              type="text" 
              name="salary_range" 
              value={formData.salary_range} 
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Enter salary range" 
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                errors.salary_range ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
              }`}
            />
            {/* Salary range: optional, no validation message */}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
            <select name="is_active" value={formData.is_active ? 'true' : 'false'} onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.value === 'true' }))} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 mt-4">Job Description *</label>
          <textarea 
            name="description" 
            value={formData.description} 
            onChange={handleChange}
            onBlur={handleBlur}
            required 
            rows={4} 
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
              errors.description ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
            }`}
            placeholder="Enter job description"
          />
          {errors.description && <div className="text-red-600 text-sm mt-1">{errors.description}</div>}
          <div className="text-xs text-gray-500 mt-1">{formData.description.length}/5000 characters</div>
        </div>

        {/* Key Skills */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 mt-4">Key Skills *</label>
          <textarea
            name="key_skills"
            value={formData.key_skills.join(', ')}
            onChange={(e) => {
              const skills = parseCSV(e.target.value);
              setFormData(prev => ({ ...prev, key_skills: skills }));
              // Clear error when user starts typing
              if (errors.key_skills) {
                setErrors(prev => ({ ...prev, key_skills: '' }));
              }
            }}
            onBlur={() => {
              const error = validateKeySkills(formData.key_skills);
              setErrors(prev => ({ ...prev, key_skills: error }));
            }}
            rows={2}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
              errors.key_skills ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
            }`}
            placeholder="Comma-separated (e.g., Python, Django, REST API, SQL)"
            required
          />
          {errors.key_skills && <div className="text-red-600 text-sm mt-1">{errors.key_skills}</div>}
        </div>

        {/* Education Requirements */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 mt-4">Education Requirements *</label>
          <textarea
            name="education_requirements"
            value={formData.education_requirements}
            onChange={handleChange}
            onBlur={handleBlur}
            rows={2}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
              errors.education_requirements ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
            }`}
            placeholder="Enter education details"
            required
          />
          {errors.education_requirements && <div className="text-red-600 text-sm mt-1">{errors.education_requirements}</div>}
        </div>

        {/* Certifications */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 mt-4">Certifications</label>
          <textarea
            name="certifications"
            value={formData.certifications.join(', ')}
            onChange={(e) => setFormData(prev => ({ ...prev, certifications: parseCSV(e.target.value) }))}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter certifications"
          />
        </div>

        {/* Status Message */}
        {submitStatus.type && (
          <div className={`mt-4 p-3 rounded-lg ${submitStatus.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            <div className="flex items-center gap-2">
              {submitStatus.type === 'success' ? (
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              <span className="text-sm font-medium">{submitStatus.message}</span>
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4">
          <button type="button" onClick={() => router.push('/admin/ui-elements/job-listings')} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">Cancel</button>
          <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
            {loading ? 'Saving...' : 'Create Job'}
          </button>
        </div>
      </form>
    </div>
  );
} 
