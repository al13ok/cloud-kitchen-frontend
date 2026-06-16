'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  X,
  Clock,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import Input from '@/components/form/input/InputField';
import Select from '@/components/form/Select';

interface SLAPolicy {
  _id?: string;
  name: string;
  description: string;
  priority: string;
  response_time_minutes: number;
  resolution_time_minutes: number;
  business_hours_only: boolean;
  working_hours_start: string;
  working_hours_end: string;
  working_days: number[];
  escalation_levels: Array<{
    level: number;
    escalate_after_minutes: number;
    notify_roles: string[];
  }>;
  active: boolean;
}

interface SLAPolicyManagerProps {
  onPolicyChange?: () => void;
  backendUrl?: string;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://py-mobiloitte.converiqo.ai';

export const SLAPolicyManager: React.FC<SLAPolicyManagerProps> = ({ 
  onPolicyChange,
  backendUrl = BACKEND_URL
}) => {
  const [policies, setPolicies] = useState<SLAPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPolicy, setEditingPolicy] = useState<SLAPolicy | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<SLAPolicy>({
    name: '',
    description: '',
    priority: 'medium',
    response_time_minutes: 60,
    resolution_time_minutes: 480,
    business_hours_only: true,
    working_hours_start: '09:00',
    working_hours_end: '17:00',
    working_days: [0, 1, 2, 3, 4], // Mon-Fri
    escalation_levels: [
      { level: 1, escalate_after_minutes: 30, notify_roles: ['team_lead'] },
      { level: 2, escalate_after_minutes: 60, notify_roles: ['manager'] }
    ],
    active: true
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchPolicies = React.useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${backendUrl}/api/v1/sla/policies`);
      if (!response.ok) throw new Error('Failed to fetch policies');
      const data = await response.json();
      setPolicies(data.policies || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch policies');
    } finally {
      setLoading(false);
    }
  }, [backendUrl]);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  const handleCreatePolicy = async () => {
    try {
      setError(null);
      const response = await fetch(`${backendUrl}/api/v1/sla/policies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) throw new Error('Failed to create policy');
      
      setSuccess('Policy created successfully');
      setIsCreating(false);
      resetForm();
      fetchPolicies();
      onPolicyChange?.();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create policy');
    }
  };

  const handleUpdatePolicy = async (policyId: string) => {
    try {
      setError(null);
      const response = await fetch(`${backendUrl}/api/v1/sla/policies/${policyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) throw new Error('Failed to update policy');
      
      setSuccess('Policy updated successfully');
      setEditingPolicy(null);
      resetForm();
      fetchPolicies();
      onPolicyChange?.();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update policy');
    }
  };

  const handleDeletePolicy = async (policyId: string) => {
    if (!confirm('Are you sure you want to delete this policy?')) return;
    
    try {
      setError(null);
      const response = await fetch(`${backendUrl}/api/v1/sla/policies/${policyId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete policy');
      
      setSuccess('Policy deleted successfully');
      fetchPolicies();
      onPolicyChange?.();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete policy');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      priority: 'medium',
      response_time_minutes: 60,
      resolution_time_minutes: 480,
      business_hours_only: true,
      working_hours_start: '09:00',
      working_hours_end: '17:00',
      working_days: [0, 1, 2, 3, 4],
      escalation_levels: [
        { level: 1, escalate_after_minutes: 30, notify_roles: ['team_lead'] },
        { level: 2, escalate_after_minutes: 60, notify_roles: ['manager'] }
      ],
      active: true
    });
  };

  const formatTime = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
    return `${Math.round(minutes / 1440)}d`;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
      default:
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    }
  };

  return (
    <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">SLA Policies</h3>
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Policy
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Success/Error Messages */}
        {success && (
          <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/30 border border-green-400 text-green-700 dark:text-green-300 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            {success}
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 text-red-700 dark:text-red-300 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Create/Edit Form */}
        {(isCreating || editingPolicy) && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700"
          >
            <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
              {isCreating ? 'Create New Policy' : 'Edit Policy'}
            </h4>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                    Policy Name
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., High Priority SLA"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                    Priority
                  </label>
                  <Select
                    options={[
                      { value: 'low', label: 'Low' },
                      { value: 'medium', label: 'Medium' },
                      { value: 'high', label: 'High' },
                      { value: 'urgent', label: 'Urgent' }
                    ]}
                    defaultValue={formData.priority}
                    onChange={(value) => setFormData({ ...formData, priority: value })}
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                  Description
                </label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Policy description"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                    Response Time (minutes)
                  </label>
                  <Input
                    type="number"
                    value={formData.response_time_minutes}
                    onChange={(e) => setFormData({ ...formData, response_time_minutes: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                    Resolution Time (minutes)
                  </label>
                  <Input
                    type="number"
                    value={formData.resolution_time_minutes}
                    onChange={(e) => setFormData({ ...formData, resolution_time_minutes: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="business_hours"
                  checked={formData.business_hours_only}
                  onChange={(e) => setFormData({ ...formData, business_hours_only: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="business_hours" className="text-sm text-gray-700 dark:text-gray-300">
                  Count only business hours
                </label>
              </div>

              {formData.business_hours_only && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                      Working Hours Start
                    </label>
                    <Input
                      type="time"
                      value={formData.working_hours_start}
                      onChange={(e) => setFormData({ ...formData, working_hours_start: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                      Working Hours End
                    </label>
                    <Input
                      type="time"
                      value={formData.working_hours_end}
                      onChange={(e) => setFormData({ ...formData, working_hours_end: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (editingPolicy && editingPolicy._id) {
                      handleUpdatePolicy(editingPolicy._id);
                    } else {
                      handleCreatePolicy();
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {isCreating ? 'Create' : 'Update'}
                </button>
                <button
                  onClick={() => {
                    setIsCreating(false);
                    setEditingPolicy(null);
                    resetForm();
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Policies List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading policies...</div>
          ) : policies.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No policies configured</div>
          ) : (
            policies.map((policy, index) => (
              <motion.div
                key={policy._id || index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-md font-semibold text-gray-900 dark:text-white">
                        {policy.name}
                      </h4>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(policy.priority)}`}>
                        {policy.priority}
                      </span>
                      {policy.active ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {policy.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Response: {formatTime(policy.response_time_minutes)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Resolution: {formatTime(policy.resolution_time_minutes)}</span>
                      </div>
                      {policy.business_hours_only && (
                        <span>Business hours only</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingPolicy(policy);
                        setFormData(policy);
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => policy._id && handleDeletePolicy(policy._id)}
                      className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SLAPolicyManager;
