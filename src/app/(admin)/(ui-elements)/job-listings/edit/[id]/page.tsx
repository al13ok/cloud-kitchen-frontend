'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { buildApiUrl } from '@/config/api';

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
};

export default function EditJobListingPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [jobId, setJobId] = useState<string>('');
  
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
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitStatus, setSubmitStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

 

 

 

  // Resolve params Promise
  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await params;
      setJobId(resolvedParams.id);
    };
    resolveParams();
  }, [params]);

  // Fetch job data and departments
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch job data
        const jobRes = await fetch(buildApiUrl(`/job-listings/${jobId}`));
        if (!jobRes.ok) {
          throw new Error('Job listing not found');
        }
        const jobData = await jobRes.json();
        
        if (jobData.success && jobData.data) {
          const job = jobData.data;
          setFormData({
            title: job.title || '',
            job_function: job.job_function || '',
            location: job.location || '',
            job_type: job.job_type || '',
            experience_level: job.experience_level || '',
            salary_range: job.salary_range || '',
            description: job.description || '',
            key_skills: job.key_skills || [],
            education_requirements: job.education_requirements || '',
            certifications: job.certifications || [],
            is_active: job.is_active !== undefined ? job.is_active : true,
            created_by: job.created_by || 'admin@company.com'
          });
        } else {
          throw new Error('Failed to load job data');
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load job data');
      } finally {
        setFetching(false);
      }
    };

    if (jobId) {
      fetchData();
    }
  }, [jobId]);

  // Enhanced field-level validation functions with updated global field rules
  const validateJobTitle = (title: string) => {
    if (!title || title.trim() === '') return 'Job title is required.';
    const trimmedTitle = title.trim();
    if (trimmedTitle.length < 2) return 'Job title must be at least 2 characters.';
    if (trimmedTitle.length > 100) return 'Job title must be 100 characters or fewer.';
    // Only letters, numbers, and spaces allowed
    const titleRegex = /^[A-Za-z0-9 ]+$/;
    if (!titleRegex.test(trimmedTitle)) return 'Only letters, numbers, and spaces are allowed.';
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

  // Generic validation function that routes to specific validators
  const validateField = (fieldName: string, value: string | string[]) => {
    const stringValue = Array.isArray(value) ? value.join(', ') : value;
    
    switch (fieldName) {
      case 'title':
        return validateJobTitle(stringValue);
      case 'job_function':
        return validateJobFunction(stringValue);
      case 'location':
        return validateLocation(stringValue);
      case 'job_type':
        return validateJobType(stringValue);
      case 'experience_level':
        return validateExperienceLevel(stringValue);
      case 'description':
        return validateJobDescription(stringValue);
      case 'key_skills':
        return validateKeySkills(Array.isArray(value) ? value : [stringValue]);
      case 'education_requirements':
        return validateEducationRequirements(stringValue);
      case 'salary_range':
        return '';
      default:
        return '';
    }
  };

 

 

 

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Mark field as touched
    setTouched(prev => ({ ...prev, [name]: true }));
    
    // Validate field and update errors
    const error = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    
    const error = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

 

 

 

  const parseCSV = (value: string) => value.split(',').map(s => s.trim()).filter(Boolean);

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};
    
    // Validate all required fields
    newErrors.title = validateField('title', formData.title);
    newErrors.job_function = validateField('job_function', formData.job_function);
    newErrors.location = validateField('location', formData.location);
    newErrors.job_type = validateField('job_type', formData.job_type);
    newErrors.experience_level = validateField('experience_level', formData.experience_level);
    newErrors.description = validateField('description', formData.description);
    newErrors.key_skills = validateField('key_skills', formData.key_skills);
    newErrors.education_requirements = validateField('education_requirements', formData.education_requirements);
    newErrors.salary_range = '';
    
    // Remove undefined errors
    Object.keys(newErrors).forEach(key => {
      if (newErrors[key as keyof ValidationErrors] === undefined) {
        delete newErrors[key as keyof ValidationErrors];
      }
    });
    
    setErrors(newErrors);
    setTouched({
      title: true,
      job_function: true,
      location: true,
      job_type: true,
      experience_level: true,
      description: true,
      key_skills: true,
      education_requirements: true,
      salary_range: true
    });
    
    return Object.keys(newErrors).length === 0;
  };

 

 

 

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Validate form before submission
    if (!validateForm()) {
      setSubmitStatus({ type: 'error', message: 'Please fix all validation errors before submitting.' });
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      const filteredData = { ...formData };

      const response = await fetch(buildApiUrl(`/job-listings/${jobId}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(filteredData),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSubmitStatus({ type: 'success', message: 'Job listing updated successfully!' });
          // Auto-redirect after showing success message
          setTimeout(() => {
            router.push('/admin/ui-elements/job-listings');
          }, 2000);
        } else {
          throw new Error(data.message || 'Failed to update job listing');
        }
      } else {
        throw new Error('Failed to update job listing');
      }
    } catch (err) {
      console.error('Error updating job listing:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update job listing';
      setSubmitStatus({ type: 'error', message: errorMessage });
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

 

 

 

  if (fetching) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading job listing...</p>
        </div>
      </div>
    );
  }

 

 

 

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 dark:text-red-400 text-xl mb-4">Error</div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button 
            onClick={() => router.push('/admin/ui-elements/job-listings')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Job Listings
          </button>
        </div>
      </div>
    );
  }

 

 

 

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button 
              onClick={() => router.push('/admin/ui-elements/job-listings')} 
              className="text-blue-600 hover:underline"
            >
              ← Back to Job Listings
            </button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Edit Job Listing</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Update the job listing details</p>
        </div>

 

 

 

        {/* Form */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Job Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  required
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors ${
                    touched.title && errors.title 
                      ? 'border-red-300 focus:ring-red-500 dark:border-red-600' 
                      : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
                  }`}
                  placeholder="Enter job title"
                />
                {touched.title && errors.title && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.title}
                  </p>
                )}
              </div>

 

 

 

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Job Function *
                </label>
                <input
                  type="text"
              name="job_function"
              value={formData.job_function}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  required
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors ${
                    touched.job_function && errors.job_function 
                      ? 'border-red-300 focus:ring-red-500 dark:border-red-600' 
                      : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
                  }`}
              placeholder="Enter job function"
                />
                {touched.job_function && errors.job_function && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.job_function}
                  </p>
                )}
              </div>

 

 

 

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Location *
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="Enter location (letters, numbers, commas, spaces)"
                />
              </div>

 

 

 

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Job Type *
                </label>
                <select
                  name="job_type"
                  value={formData.job_type}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select Job Type</option>
                  <option value="full-time">Full-Time</option>
                  <option value="part-time">Part-Time</option>
                  <option value="contract">Contract</option>
                  <option value="internship">Internship</option>
                </select>
              </div>

 

 

 

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Experience Level *
                </label>
                <select
                  name="experience_level"
                  value={formData.experience_level}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select experience level</option>
                  <option value="entry">Entry</option>
                  <option value="mid">Mid</option>
                  <option value="senior">Senior</option>
                  <option value="executive">Executive</option>
                </select>
              </div>

 

 

 

              {/* Removed dropdown duplicate for Job Function to avoid hardcoded lists; keep free-text input above */}

 

 

 

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Salary Range
                </label>
                <input
                  type="text"
                  name="salary_range"
                  value={formData.salary_range}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors ${
                    touched.salary_range && errors.salary_range 
                      ? 'border-red-300 focus:ring-red-500 dark:border-red-600' 
                      : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
                  }`}
                  placeholder="Enter salary range"
                />
                {touched.salary_range && errors.salary_range && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.salary_range}
                  </p>
                )}
              </div>

 

 

 

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <select
                  name="is_active"
                  value={formData.is_active ? 'true' : 'false'}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.value === 'true' }))}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>

 

 

 

            {/* Job Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Job Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                onBlur={handleBlur}
                required
                rows={4}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors ${
                  touched.description && errors.description 
                    ? 'border-red-300 focus:ring-red-500 dark:border-red-600' 
                    : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
                }`}
                placeholder="Enter job description"
              />
              <div className="flex justify-between items-center mt-1">
                <div>
                  {touched.description && errors.description && (
                    <p className="text-sm text-red-600 dark:text-red-400 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.description}
                    </p>
                  )}
                </div>
                <span className={`text-xs ${
                  formData.description.length < 50 ? 'text-red-500' : 
                  formData.description.length > 4500 ? 'text-yellow-500' : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {formData.description.length}/5000
                </span>
              </div>
            </div>

 

 

 

            {/* Key Skills */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Key Skills *
              </label>
              <textarea
                name="key_skills"
                value={formData.key_skills.join(', ')}
                onChange={(e) => {
                  const skills = parseCSV(e.target.value);
                  setFormData(prev => ({ ...prev, key_skills: skills }));
                  setTouched(prev => ({ ...prev, key_skills: true }));
                  const error = validateField('key_skills', skills);
                  setErrors(prev => ({ ...prev, key_skills: error }));
                }}
                onBlur={() => {
                  setTouched(prev => ({ ...prev, key_skills: true }));
                  const error = validateField('key_skills', formData.key_skills);
                  setErrors(prev => ({ ...prev, key_skills: error }));
                }}
                rows={2}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors ${
                  touched.key_skills && errors.key_skills 
                    ? 'border-red-300 focus:ring-red-500 dark:border-red-600' 
                    : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
                }`}
                placeholder="Comma-separated (e.g., Python, Django, REST API, SQL)"
                required
              />
              {touched.key_skills && errors.key_skills && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.key_skills}
                </p>
              )}
            </div>

 

 

 

            {/* Education Requirements */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Education Requirements *
              </label>
              <textarea
                name="education_requirements"
                value={formData.education_requirements}
                onChange={handleChange}
                onBlur={handleBlur}
                rows={2}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors ${
                  touched.education_requirements && errors.education_requirements 
                    ? 'border-red-300 focus:ring-red-500 dark:border-red-600' 
                    : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
                }`}
                placeholder="e.g., Bachelor's in Computer Science"
                required
              />
              {touched.education_requirements && errors.education_requirements && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.education_requirements}
                </p>
              )}
            </div>

 

 

 

            {/* Certifications */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Certifications
              </label>
              <textarea
                name="certifications"
                value={formData.certifications.join(', ')}
                onChange={(e) => setFormData(prev => ({ ...prev, certifications: parseCSV(e.target.value) }))}
                rows={2}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Enter certifications"
              />
            </div>

 

 

 

            {/* Status Message */}
            {submitStatus.type && (
              <div className={`p-4 rounded-lg ${
                submitStatus.type === 'success' 
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-800 dark:text-green-200' 
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-800 dark:text-red-200'
              }`}>
                <div className="flex items-center gap-2">
                  {submitStatus.type === 'success' ? (
                    <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  <span className="font-medium">{submitStatus.message}</span>
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
                <p className="text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

 

 

 

            {/* Action Buttons */}
            <div className="flex justify-end gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => router.push('/admin/ui-elements/job-listings')}
                className="px-6 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Updating...' : 'Update Job Listing'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
