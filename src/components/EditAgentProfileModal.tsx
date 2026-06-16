"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import TagInput from "@/components/ui/tag-input";
import { User, Save, AlertCircle } from "lucide-react";

// Agent Status enum
enum AgentStatus {
  AVAILABLE = 'available',
  BUSY = 'busy',
  AWAY = 'away',
  OFFLINE = 'offline'
}

// Agent Profile interface (supports both camelCase and snake_case from backend)
interface AgentProfile {
  id?: string;
  agent_id?: string;
  userId?: string;
  agentName?: string;
  agent_name?: string;
  agentEmail?: string;
  agent_email?: string;
  department: string;
  skills?: string[];
  interestCategories?: string[];
  interest_categories?: string[];
  maxDailyLeads?: number;
  max_daily_leads?: number;
  maxConcurrentLeads?: number;
  max_concurrent_leads?: number;
  currentWorkload?: number;
  current_workload?: number;
  performanceScore?: number;
  performance_score?: number;
  conversionRate?: number;
  conversion_rate?: number;
  avgResponseTime?: number;
  avg_response_time?: number;
  status?: AgentStatus | string;
  timezone?: string;
  workingHours?: Record<string, unknown>;
  working_hours?: Record<string, unknown>;
  preferredAssignmentMethod?: string;
  preferred_assignment_method?: string;
  excludeSources?: string[];
  exclude_sources?: string[];
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

interface EditAgentProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentProfile: AgentProfile | null;
  onSave: (updatedProfile: Partial<AgentProfile>) => void | Promise<void>;
}

const EditAgentProfileModal: React.FC<EditAgentProfileModalProps> = ({
  isOpen,
  onClose,
  agentProfile,
  onSave,
}) => {
  const parseTagValues = (value: unknown): string[] => {
    if (Array.isArray(value)) {
      return value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return [];

      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed
            .filter((item): item is string => typeof item === 'string')
            .map((item) => item.trim())
            .filter((item) => item.length > 0);
        }
      } catch {
        // Fall back to comma-separated parsing
      }

      return trimmed
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
    }

    return [];
  };

  const [formData, setFormData] = useState<Partial<AgentProfile>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (agentProfile && isOpen) {
      const skillsArray = parseTagValues(agentProfile.skills);
      const interestCategoriesArray = parseTagValues(
        agentProfile.interestCategories ?? agentProfile.interest_categories
      );
      
      setFormData({
        agentName: agentProfile.agentName || agentProfile.agent_name || '',
        agentEmail: agentProfile.agentEmail || agentProfile.agent_email || '',
        department: agentProfile.department || '',
        skills: skillsArray,
        interest_categories: interestCategoriesArray,
        status: agentProfile.status || 'available',
      });
    } else if (!agentProfile && isOpen) {
      // Default values for new agent
      setFormData({
        agentName: '',
        agentEmail: '',
        department: '',
        skills: [],
        interest_categories: [],
        status: 'available',
      });
    }
    setFormErrors({});
  }, [agentProfile, isOpen]);

  // Modal uses DEV's Modal component which handles body scroll locking and keyboard events

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => {
      let newValue: string | number = value;
      if (type === 'number') {
        const numValue = parseFloat(value);
        // If value is empty string or results in NaN, use empty string (or 0 for certain fields)
        if (value === '' || isNaN(numValue)) {
          newValue = '';
        } else {
          newValue = numValue;
        }
      }
      return {
        ...prev,
        [name]: newValue
      };
    });
    setFormErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleTagInputChange = (name: keyof Partial<AgentProfile>) => {
    return (tags: string[]) => {
      setFormData(prev => ({ ...prev, [name]: tags }));
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    };
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.agentName || !formData.agentName.trim()) errors.agentName = "Agent name is required";
    if (!formData.agentEmail || !formData.agentEmail.trim()) errors.agentEmail = "Agent email is required";
    if (!formData.department) errors.department = "Department is required";
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      setIsSaving(true);
      try {
        await onSave(formData);
        onClose();
      } catch (error) {
        console.error("Error saving agent profile:", error);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleClose = () => {
    if (!isSaving) {
      onClose();
    }
  };

  if (!isOpen) return null;
  
  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="max-w-6xl max-h-[90vh] overflow-y-auto">
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Edit Agent Profile
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Update agent information and preferences
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleFormSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Basic Information
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Agent Name *
                  </label>
                  <input
                    type="text"
                    name="agentName"
                    value={formData.agentName || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {formErrors.agentName && (
                    <p className="text-red-500 text-sm mt-1 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {formErrors.agentName}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Agent Email *
                  </label>
                  <input
                    type="email"
                    name="agentEmail"
                    value={formData.agentEmail || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {formErrors.agentEmail && (
                    <p className="text-red-500 text-sm mt-1 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {formErrors.agentEmail}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Department *
                  </label>
                  <select
                    name="department"
                    value={formData.department || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Department</option>
                    <option value="Sales">Sales</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Support">Support</option>
                    <option value="Technology">Technology</option>
                    <option value="Human Resources">Human Resources</option>
                  </select>
                  {formErrors.department && (
                    <p className="text-red-500 text-sm mt-1 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {formErrors.department}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="available">Available</option>
                    <option value="busy">Busy</option>
                    <option value="away">Away</option>
                    <option value="offline">Offline</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Skills and Categories */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Skills & Categories
                </h3>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Skills
                  </label>
                  <TagInput
                    tags={formData.skills || []}
                    onTagsChange={handleTagInputChange('skills')}
                    placeholder="Add skills (e.g., Lead Generation, Cold Calling, CRM)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Interest Categories
                  </label>
                  <TagInput
                    tags={formData.interest_categories || []}
                    onTagsChange={handleTagInputChange('interest_categories')}
                    placeholder="Add interest categories (e.g., Technology, Healthcare, Finance)"
                  />
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSaving}
                  className="px-6 py-2 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSaving}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center space-x-2 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? "Saving..." : "Save Changes"}</span>
                </Button>
              </div>
            </div>
          </form>
      </div>
    </Modal>
  );
};

export default EditAgentProfileModal;

