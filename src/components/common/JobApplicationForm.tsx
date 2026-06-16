import React, { useState, ChangeEvent, FormEvent, useRef } from 'react';

interface JobApplicationFormProps {
  source?: string; // e.g., 'Chatbot' or 'Website'
  onSuccess?: () => void;
  heading?: string; // Added heading prop
}

const JobApplicationForm = ({ source = 'Website', onSuccess, heading = 'Job Applications' }: JobApplicationFormProps) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    jobCategory: '',
    experience: '',
  });
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [experiences, setExperiences] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const MAX_SIZE_MB = 5;

  React.useEffect(() => {
    // Fetch categories and experiences
    const fetchCategories = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/jobs/categories`);
        const data = await res.json();
        setCategories(data.map((c: { name: string }) => c.name));
      } catch {
        setCategories([]);
      }
    };
    const fetchExperiences = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/jobs/experiences`);
        const data = await res.json();
        setExperiences(data.map((e: { name: string }) => e.name));
      } catch {
        setExperiences([]);
      }
    };
    fetchCategories();
    fetchExperiences();
  }, []);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const setValidatedResume = (file: File | null) => {
    if (!file) { setResumeFile(null); setError(null); return; }
    const allowed = ['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowed.includes(file.type)) { setError('Unsupported file type. Upload PDF, DOC, or DOCX.'); setResumeFile(null); return; }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) { setError(`File too large. Max ${MAX_SIZE_MB}MB.`); setResumeFile(null); return; }
    setError(null); setResumeFile(file);
  };

  const handleResume = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setValidatedResume(e.target.files[0]);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    if (!resumeFile) {
      setError('Please upload resume');
      return;
    }
    setLoading(true);
    const form = new FormData();
    form.append('name', formData.name);
    form.append('email', formData.email);
    form.append('mobile', formData.mobile);
    form.append('job_category', formData.jobCategory);
    form.append('experience', formData.experience);
    form.append('source', source);
    form.append('file', resumeFile);
    try {
      const res = await fetch('/api/v1/jobs/upload', {
        method: 'POST',
        body: form,
      });
      if (res.ok) {
        setMessage('Application submitted!');
        setFormData({ name: '', email: '', mobile: '', jobCategory: '', experience: '' });
        setResumeFile(null);
        if (onSuccess) onSuccess();
      } else {
        const error = await res.json();
        setError(error?.error || 'Unknown error');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="relative p-6 sm:p-8 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="absolute inset-0 opacity-20">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <defs>
              <linearGradient id="g1" x1="0" x2="1">
                <stop offset="0%" stopColor="#fff"/>
                <stop offset="100%" stopColor="#ffffff00"/>
              </linearGradient>
            </defs>
            <circle cx="30" cy="30" r="20" fill="url(#g1)"/>
            <circle cx="180" cy="40" r="10" fill="url(#g1)"/>
            <circle cx="120" cy="90" r="14" fill="url(#g1)"/>
          </svg>
        </div>
        <div className="relative">
          <h2 className="text-white text-xl sm:text-2xl font-bold">{heading}</h2>
          <p className="text-blue-100 text-sm mt-1">Tell us about yourself and upload your resume. Fields marked with * are required.</p>
        </div>
      </div>

      {/* Body */}
      <div className="p-6 sm:p-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
              </div>
              <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Enter your name" className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
              </div>
              <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Enter your email" className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required />
            </div>
            <p className="mt-1 text-xs text-gray-500">We’ll never share your email.</p>
          </div>

          {/* Mobile */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mobile <span className="text-red-500">*</span></label>
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
              </div>
              <input type="tel" name="mobile" value={formData.mobile} onChange={handleChange} placeholder="Enter your phone number" className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category <span className="text-red-500">*</span></label>
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
              </div>
              <select name="jobCategory" value={formData.jobCategory} onChange={handleChange} className="w-full pl-9 pr-8 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none" required>
                <option value="">Select Category</option>
                {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              <div className="pointer-events-none absolute right-3 inset-y-0 flex items-center text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
              </div>
            </div>
          </div>

          {/* Experience */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Experience <span className="text-red-500">*</span></label>
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/></svg>
              </div>
              <select name="experience" value={formData.experience} onChange={handleChange} className="w-full pl-9 pr-8 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none" required>
                <option value="">Select Experience</option>
                {experiences.map((exp) => <option key={exp} value={exp}>{exp}</option>)}
              </select>
              <div className="pointer-events-none absolute right-3 inset-y-0 flex items-center text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
              </div>
            </div>
          </div>

          {/* Resume */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Upload Resume <span className="text-red-500">*</span></label>
            <label
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => { e.preventDefault(); setDragActive(false); const f = e.dataTransfer.files?.[0]; if (f) setValidatedResume(f); }}
              onClick={() => inputRef.current?.click()}
              className={`flex items-center border-2 border-dashed rounded-lg px-4 py-3 cursor-pointer transition w-full ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'}`}
            >
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 text-blue-600 mr-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v8m0-8l-3 3m3-3l3 3M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
              </svg>
              {resumeFile ? (
                <span className="text-gray-700 text-sm font-medium truncate">{resumeFile.name}</span>
              ) : (
                <>
                  <span className="text-gray-700 text-sm font-medium">Upload Resume</span>
                  <span className="text-gray-400 text-xs ml-2">PDF, DOC, DOCX • Max {MAX_SIZE_MB}MB</span>
                </>
              )}
              <input ref={inputRef} type="file" accept=".pdf,.doc,.docx" onChange={handleResume} required className="hidden" />
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3">
          <button type="submit" className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-5 py-2.5 font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed" disabled={loading}>
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                Submitting...
              </>
            ) : (
              <>
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                Submit Application
              </>
            )}
          </button>
          <div className="text-xs text-gray-500">By submitting, you agree to our processing of your data.</div>
        </div>

        {message && <div className="mt-4 p-3 rounded-lg bg-green-50 text-green-700 border border-green-200">{message}</div>}
        {error && <div className="mt-4 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200">{error}</div>}
      </div>
    </form>
  );
};

export default JobApplicationForm; 