'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Clock,
  AlertTriangle,
  Bell,
  Save,
  X,
  Play,
  Pause,
  Zap,
  Target,
  BarChart3,
  Calendar,
  Loader2
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import Input from '@/components/form/input/InputField';
import TextArea from '@/components/form/input/TextArea';
import Select from '@/components/form/Select';
import Button from '@/components/ui/button/Button';
import Alert from '@/components/ui/alert/Alert';
import { 
  getSLAPolicies, 
  createSLAPolicy, 
  updateSLAPolicy, 
  deleteSLAPolicy,

  type SLAPolicy
} from '@/services/slaService';
import DashboardHeader from '@/components/header/DashboardHeader';

export default function AdminSLARulesPage() {
  const [slaRules, setSlaRules] = useState<SLAPolicy[]>([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [emailErrors, setEmailErrors] = useState<{
    notification_emails?: string;
    cc_emails?: string;
    escalation_emails?: { [key: number]: string };
  }>({});
  const [toast, setToast] = useState<{ show: boolean; variant: 'success' | 'error' | 'warning' | 'info'; title: string; message: string }>({
    show: false,
    variant: 'success',
    title: '',
    message: ''
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; ruleId: string | null; ruleName: string }>({
    show: false,
    ruleId: null,
    ruleName: ''
  });
  const [categories, setCategories] = useState<string[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRule, setEditingRule] = useState<SLAPolicy | null>(null);
  const [newRule, setNewRule] = useState<Partial<SLAPolicy>>({
    policy_name: '',
    description: '',
    priority: 'medium',
    ticket_type: 'incident',
    response_time_hours: 4, // 4 hours default
    resolution_time_hours: 24, // 24 hours default
    business_hours_only: true,
    auto_escalate: true,
    escalation_levels: [
      {"level": "level_1", "after_hours": 2, "role": "team_lead", "email": ""},
      {"level": "level_2", "after_hours": 4, "role": "manager", "email": ""}
    ],
    notification_enabled: true,
    notification_before_breach_minutes: 30,
    notification_channels: ['email', 'in_app'],
    notification_emails: [],
    cc_emails: [],
    active: true
  });

  // Email validation utility functions
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  const validateEmails = (emailString: string): { isValid: boolean; invalidEmails: string[] } => {
    if (!emailString.trim()) {
      return { isValid: true, invalidEmails: [] }; // Empty is valid (optional field)
    }
    
    const emails = emailString.split(',').map(e => e.trim()).filter(e => e);
    const invalidEmails = emails.filter(email => !isValidEmail(email));
    
    return {
      isValid: invalidEmails.length === 0,
      invalidEmails
    };
  };

  const validateAllEmails = (): boolean => {
    const errors: typeof emailErrors = {};
    let isValid = true;

    // Validate notification emails
    const notificationEmailsStr = (editingRule?.notification_emails || newRule.notification_emails || []).join(', ');
    if (notificationEmailsStr) {
      const validation = validateEmails(notificationEmailsStr);
      if (!validation.isValid) {
        errors.notification_emails = `Invalid email(s): ${validation.invalidEmails.join(', ')}`;
        isValid = false;
      }
    }

    // Validate CC emails
    const ccEmailsStr = (editingRule?.cc_emails || newRule.cc_emails || []).join(', ');
    if (ccEmailsStr) {
      const validation = validateEmails(ccEmailsStr);
      if (!validation.isValid) {
        errors.cc_emails = `Invalid email(s): ${validation.invalidEmails.join(', ')}`;
        isValid = false;
      }
    }

    // Validate escalation emails
    const escalationLevels = editingRule?.escalation_levels || newRule.escalation_levels || [];
    const escalationErrors: { [key: number]: string } = {};
    escalationLevels.forEach((level, index) => {
      if (level.email && level.email.trim() && !isValidEmail(level.email)) {
        escalationErrors[index] = `Invalid email format`;
        isValid = false;
      }
    });
    if (Object.keys(escalationErrors).length > 0) {
      errors.escalation_emails = escalationErrors;
    }

    setEmailErrors(errors);
    return isValid;
  };

  // Fetch SLA policies (rules) from backend
  const fetchSLARules = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Fetching SLA policies...');
      const policies = await getSLAPolicies();
      console.log('✅ Fetched policies:', policies);
      console.log('📊 Policies count:', policies?.length || 0);
      
      // Normalize policy IDs - handle both policy_id and _id
      const normalizedPolicies = (policies || []).map((policy: SLAPolicy & { _id?: string }) => {
        if (!policy.policy_id && policy._id) {
          policy.policy_id = policy._id;
        }
        return policy;
      });
      
      setSlaRules(normalizedPolicies);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch SLA policies');
      console.error('❌ Error fetching SLA policies:', err);
      setSlaRules([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      setCategoriesLoading(true);
      console.log('🔄 Setting default ticket types...');
      // Use default ticket types instead of fetching
      const defaultTypes = ['incident', 'request', 'problem', 'change'];
      console.log('✅ Set ticket types:', defaultTypes);
      console.log('📊 Types count:', defaultTypes.length);
      
      if (defaultTypes && Array.isArray(defaultTypes) && defaultTypes.length > 0) {
        setCategories(defaultTypes);
        console.log('✅ Categories set successfully:', defaultTypes);
      } else {
        console.warn('⚠️ No categories returned or empty array, using defaults');
        const defaultCategories = ['Technical Support', 'Billing', 'General', 'System Critical'];
        setCategories(defaultCategories);
        console.log('✅ Default categories set:', defaultCategories);
      }
    } catch (err) {
      console.error('❌ Error fetching categories:', err);
      // Fallback to default categories if API fails
      const defaultCategories = ['Technical Support', 'Billing', 'General', 'System Critical'];
      setCategories(defaultCategories);
      console.log('✅ Fallback: Default categories set:', defaultCategories);
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  useEffect(() => {
    console.log('🔄 Component mounted, fetching data...');
    fetchSLARules();
    fetchCategories();
  }, [fetchSLARules, fetchCategories]);

  // Filter SLA policies
  const filteredRules = slaRules.filter(rule => {
    const matchesSearch = rule.policy_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         rule.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (rule.ticket_type && rule.ticket_type.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesPriority = priorityFilter === 'all' || rule.priority === priorityFilter;
    const matchesCategory = categoryFilter === 'all' || rule.ticket_type === categoryFilter || !rule.ticket_type;
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && rule.active) ||
                         (statusFilter === 'inactive' && !rule.active);
    
    return matchesSearch && matchesPriority && matchesCategory && matchesStatus;
  });

  // Debug effect to log state changes
  useEffect(() => {
    console.log('📊 SLA Rules state updated:', {
      total: slaRules.length,
      filtered: filteredRules.length,
      loading,
      error: error ? 'Yes' : 'No'
    });
  }, [slaRules.length, filteredRules.length, loading, error]);

  const handleCreateRule = async () => {
    // Validate required fields
    if (!newRule.policy_name || !newRule.policy_name.trim()) {
      setError('Rule name is required');
      return;
    }
    
    if (!newRule.description || !newRule.description.trim()) {
      setError('Description is required');
      return;
    }
    
    // Validate all email fields
    if (!validateAllEmails()) {
      setError('Please fix the invalid email addresses before saving');
      return;
    }
    
    try {
      setError(null);
      setEmailErrors({});
      console.log('📝 Creating SLA rule with data:', newRule);
      
      const policyData: SLAPolicy = {
        policy_name: newRule.policy_name.trim(),
        description: newRule.description.trim(),
        priority: (newRule.priority || 'medium') as 'critical' | 'high' | 'medium' | 'low',
        ticket_type: (newRule.ticket_type as 'incident' | 'request' | 'problem' | 'change') || 'incident',
        response_time_hours: newRule.response_time_hours ?? 4,
        resolution_time_hours: newRule.resolution_time_hours ?? 24,
        business_hours_only: newRule.business_hours_only ?? true,
        auto_escalate: true,
        escalation_levels: newRule.escalation_levels || [
          {"level": "level_1", "after_hours": 2, "role": "team_lead"},
          {"level": "level_2", "after_hours": 4, "role": "manager"}
        ],
        notification_enabled: true,
        notification_before_breach_minutes: 30,
        notification_channels: newRule.notification_channels || ['email', 'in_app'],
        active: newRule.active ?? true
      };
      
      console.log('📤 Sending policy data to backend:', policyData);
      await createSLAPolicy(policyData);
      console.log('✅ SLA rule created successfully');
      
      await fetchSLARules(); // Refresh list
      
      // Reset form
      setNewRule({ 
        policy_name: '',
        description: '', 
        priority: 'medium', 
        ticket_type: 'incident',
        response_time_hours: 4,
        resolution_time_hours: 24,
        business_hours_only: true, 
        escalation_levels: [
          {"level": "level_1", "after_hours": 2, "role": "team_lead", "email": ""},
          {"level": "level_2", "after_hours": 4, "role": "manager", "email": ""}
        ], 
        notification_channels: ['email', 'in_app'],
        notification_emails: [],
        cc_emails: [],
        active: true 
      });
      setShowCreateModal(false);
      setEmailErrors({});
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create SLA policy';
      setError(errorMessage);
      console.error('❌ Error creating SLA policy:', err);
    }
  };

  const handleDeleteRule = (id: string, ruleName: string) => {
    if (!id || id.trim() === '') {
      setToast({
        show: true,
        variant: 'error',
        title: 'Delete Failed',
        message: 'Invalid rule ID. Cannot delete this rule.'
      });
      setTimeout(() => setToast(prev => ({ ...prev, show: false })), 5000);
      return;
    }
    
    setDeleteConfirm({
      show: true,
      ruleId: id,
      ruleName: ruleName
    });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.ruleId || deleteConfirm.ruleId.trim() === '') {
      setToast({
        show: true,
        variant: 'error',
        title: 'Delete Failed',
        message: 'Invalid rule ID. Cannot delete this rule.'
      });
      setTimeout(() => setToast(prev => ({ ...prev, show: false })), 5000);
      setDeleteConfirm({ show: false, ruleId: null, ruleName: '' });
      return;
    }
    
    try {
      setError(null);
      console.log('🗑️ Deleting SLA rule with ID:', deleteConfirm.ruleId);
      console.log('🗑️ Rule name:', deleteConfirm.ruleName);
      await deleteSLAPolicy(deleteConfirm.ruleId);
      console.log('✅ SLA rule deleted successfully');
      
      // Show success toast
      setToast({
        show: true,
        variant: 'success',
        title: 'SLA Rule Deleted',
        message: `"${deleteConfirm.ruleName}" has been deleted successfully.`
      });
      
      // Auto-hide toast after 3 seconds
      setTimeout(() => {
        setToast(prev => ({ ...prev, show: false }));
      }, 3000);
      
      // Close confirmation modal
      setDeleteConfirm({ show: false, ruleId: null, ruleName: '' });
      
      // Refresh list
      await fetchSLARules();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete SLA rule';
      setError(errorMessage);
      console.error('❌ Error deleting SLA rule:', err);
      
      // Show error toast
      setToast({
        show: true,
        variant: 'error',
        title: 'Delete Failed',
        message: errorMessage
      });
      
      // Auto-hide toast after 5 seconds
      setTimeout(() => {
        setToast(prev => ({ ...prev, show: false }));
      }, 5000);
      
      // Close confirmation modal
      setDeleteConfirm({ show: false, ruleId: null, ruleName: '' });
    }
  };

  const cancelDelete = () => {
    setDeleteConfirm({ show: false, ruleId: null, ruleName: '' });
  };

  const handleToggleActive = async (id: string) => {
    try {
      setError(null);
      // Find the current policy to toggle its active state
      const policy = slaRules.find(r => r.policy_id === id);
      if (!policy) throw new Error('Policy not found');
      
      await updateSLAPolicy(id, { active: !policy.active });
      await fetchSLARules(); // Refresh list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle SLA rule');
      console.error('Error toggling SLA rule:', err);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
      case 'high': return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300';
      case 'medium': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300';
      case 'low': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
    }
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
    return `${Math.floor(minutes / 1440)}d`;
  };

  const priorityOptions = [
    { value: 'all', label: 'All Priority' },
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Urgent' }
  ];

  // Build category options from fetched categories
  const categoryOptions = [
    { value: 'all', label: 'All Categories' },
    ...(categories.length > 0 ? categories.map(cat => ({ value: cat, label: cat })) : [])
  ];

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' }
  ];

  // Calculate statistics
  const stats = {
    total: slaRules.length,
    active: slaRules.filter(r => r.active).length,
    inactive: slaRules.filter(r => !r.active).length,
    critical: slaRules.filter(r => r.priority === 'critical').length,
    businessHours: slaRules.filter(r => r.business_hours_only).length,
    escalationLevels: slaRules.reduce((sum, r) => sum + (r.escalation_levels?.length || 0), 0),
    notificationChannels: slaRules.reduce((sum, r) => sum + (r.notification_channels?.length || 0), 0)
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950/50 transition-colors duration-500">
      <div className="w-full flex flex-col items-center p-2 sm:p-4 md:p-6 gap-6">
        
        {/* Page Header */}
        <div className="w-full max-w-screen-xl">
          <DashboardHeader
            title="SLA Rules Management"
            subtitle="Define SLA policies, escalation rules, and notification triggers for optimal service delivery"
            icon={Zap}
            iconColor="text-white"
            variant="default"
            size="lg"
            breadcrumbs={[
              { label: 'Home', href: '/' },
              { label: 'Service Desk', href: '/servicedesk/servicedesk-dashboard' },
              { label: 'SLA Rules Management' }
            ]}
            actions={
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowCreateModal(true)}
                className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 border border-white/30"
              >
                <Plus className="w-5 h-5" />
                Create SLA Rule
              </motion.button>
            }
          />
        </div>

        {/* Stats Cards */}
        <div className="w-full max-w-screen-xl grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            whileHover={{ scale: 1.05, y: -5 }}
          >
            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 group overflow-hidden relative">
              <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full -translate-y-6 translate-x-6 group-hover:scale-110 transition-transform duration-300"></div>
              <CardContent className="p-4 relative z-10">
                <div className="text-center">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Total Rules</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.05, y: -5 }}
          >
            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 group overflow-hidden relative">
              <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-full -translate-y-6 translate-x-6 group-hover:scale-110 transition-transform duration-300"></div>
              <CardContent className="p-4 relative z-10">
                <div className="text-center">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Active</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.active}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            whileHover={{ scale: 1.05, y: -5 }}
          >
            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 group overflow-hidden relative">
              <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-red-500/10 to-pink-500/10 rounded-full -translate-y-6 translate-x-6 group-hover:scale-110 transition-transform duration-300"></div>
              <CardContent className="p-4 relative z-10">
                <div className="text-center">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Critical</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.critical}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            whileHover={{ scale: 1.05, y: -5 }}
          >
            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 group overflow-hidden relative">
              <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 rounded-full -translate-y-6 translate-x-6 group-hover:scale-110 transition-transform duration-300"></div>
              <CardContent className="p-4 relative z-10">
                <div className="text-center">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Business Hours</p>
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.businessHours}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            whileHover={{ scale: 1.05, y: -5 }}
          >
            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 group overflow-hidden relative">
              <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 rounded-full -translate-y-6 translate-x-6 group-hover:scale-110 transition-transform duration-300"></div>
              <CardContent className="p-4 relative z-10">
                <div className="text-center">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Escalations</p>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.escalationLevels}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            whileHover={{ scale: 1.05, y: -5 }}
          >
            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 group overflow-hidden relative">
              <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-full -translate-y-6 translate-x-6 group-hover:scale-110 transition-transform duration-300"></div>
              <CardContent className="p-4 relative z-10">
                <div className="text-center">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Notification Channels</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.notificationChannels}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            whileHover={{ scale: 1.05, y: -5 }}
          >
            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 group overflow-hidden relative">
              <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-gray-500/10 to-slate-500/10 rounded-full -translate-y-6 translate-x-6 group-hover:scale-110 transition-transform duration-300"></div>
              <CardContent className="p-4 relative z-10">
                <div className="text-center">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Inactive</p>
                  <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{stats.inactive}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Filters */}
        <div className="w-full max-w-screen-xl">
          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg mb-6">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Search SLA rules..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                <div className="flex gap-4">
                  <Select
                    options={priorityOptions}
                    defaultValue={priorityFilter}
                    onChange={setPriorityFilter}
                    placeholder="All Priority"
                    className="w-40 bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
                  />
                  <Select
                    options={categoryOptions}
                    defaultValue={categoryFilter}
                    onChange={setCategoryFilter}
                    placeholder={categoriesLoading ? "Loading..." : "All Categories"}
                    className="w-40 bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
                  />
                  <Select
                    options={statusOptions}
                    defaultValue={statusFilter}
                    onChange={setStatusFilter}
                    placeholder="All Status"
                    className="w-40 bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error Message */}
        {error && (
          <div className="w-full max-w-screen-xl mb-4">
            <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
              {error}
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="w-full max-w-screen-xl flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-600 dark:text-gray-400" />
          </div>
        )}

        {/* SLA Rules Grid */}
        {!loading && (
          <div className="w-full max-w-screen-xl grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredRules.map((rule, index) => (
            <motion.div
              key={rule.policy_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02, y: -2 }}
            >
              <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 group overflow-hidden relative">
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-yellow-500/5 to-orange-500/5 rounded-full -translate-y-8 translate-x-8 group-hover:scale-110 transition-transform duration-300"></div>
                
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                          {rule.policy_name}
                        </h3>
                        <div className={`px-2 py-1 rounded-full text-xs font-semibold ${getPriorityColor(rule.priority)}`}>
                          {rule.priority.toUpperCase()}
                        </div>
                        <div className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          rule.active 
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}>
                          {rule.active ? 'Active' : 'Inactive'}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {rule.description}
                      </p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* SLA Times */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">SLA Times:</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-blue-500" />
                        <span className="text-gray-600 dark:text-gray-400">First Response:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{formatTime(rule.response_time_hours * 60)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Target className="w-4 h-4 text-green-500" />
                        <span className="text-gray-600 dark:text-gray-400">Resolution:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{formatTime(rule.resolution_time_hours * 60)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Business Hours */}
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">Business Hours:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      rule.business_hours_only 
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                        : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                    }`}>
                      {rule.business_hours_only ? 'Business Hours Only' : '24/7'}
                    </span>
                  </div>

                  {/* Rules Count */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">{rule.escalation_levels.length} Escalations</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">{rule.notification_channels.length} Notifications</span>
                    </div>
                  </div>

                  {/* Usage */}
                  <div className="flex items-center gap-2 text-sm">
                    <BarChart3 className="w-4 h-4 text-gray-400" />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setEditingRule(rule)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center gap-2 justify-center"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleToggleActive(rule.policy_id || "")}
                      className={`p-2 transition-colors ${
                        rule.active 
                          ? 'text-green-600 hover:text-green-700' 
                          : 'text-gray-400 hover:text-green-600'
                      }`}
                    >
                      {rule.active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        const ruleId = rule.policy_id || (rule as SLAPolicy & { _id?: string })._id || '';
                        handleDeleteRule(ruleId, rule.policy_name || 'Untitled Rule');
                      }}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </motion.button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredRules.length === 0 && (
          <div className="w-full max-w-screen-xl text-center py-12">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg p-8">
              <Zap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No SLA Rules Found</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {searchQuery || priorityFilter !== 'all' || categoryFilter !== 'all' || statusFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Create your first SLA rule to define service level agreements'
                }
              </p>
              {(!searchQuery && priorityFilter === 'all' && categoryFilter === 'all' && statusFilter === 'all') && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowCreateModal(true)}
                  className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 mx-auto"
                >
                  <Plus className="w-5 h-5" />
                  Create Your First SLA Rule
                </motion.button>
              )}
            </div>
          </div>
        )}

        {/* Create/Edit Modal */}
        {(showCreateModal || editingRule) && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {editingRule ? 'Edit SLA Rule' : 'Create New SLA Rule'}
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingRule(null);
                      setError(null);
                      setEmailErrors({});
                      setNewRule({ 
                        policy_name: '',
                        description: '', 
                        priority: 'medium', 
                        ticket_type: 'incident',
                        response_time_hours: 4,
                        resolution_time_hours: 24,
                        business_hours_only: true, 
                        escalation_levels: [
                          {"level": "level_1", "after_hours": 2, "role": "team_lead", "email": ""},
                          {"level": "level_2", "after_hours": 4, "role": "manager", "email": ""}
                        ], 
                        notification_channels: ['email', 'in_app'],
                        notification_emails: [],
                        cc_emails: [],
                        active: true 
                      });
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Error Message in Modal */}
                {error && (
                  <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
                    {error}
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Rule Name
                    </label>
                    <Input
                      value={editingRule?.policy_name || newRule.policy_name || ''}
                      onChange={(e) => {
                        if (editingRule) {
                          setEditingRule({ ...editingRule, policy_name: e.target.value });
                        } else {
                          setNewRule({ ...newRule, policy_name: e.target.value });
                        }
                      }}
                      placeholder="Enter SLA rule name"
                      className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Priority
                    </label>
                    <Select
                      options={[
                        { value: 'low', label: 'Low' },
                        { value: 'medium', label: 'Medium' },
                        { value: 'high', label: 'High' },
                        { value: 'critical', label: 'Urgent' }
                      ]}
                      defaultValue={editingRule?.priority || newRule.priority || 'medium'}
                      onChange={(value) => {
                        if (editingRule) {
                          setEditingRule({ ...editingRule, priority: value as 'low' | 'medium' | 'high' | 'critical' });
                        } else {
                          setNewRule({ ...newRule, priority: value as 'low' | 'medium' | 'high' | 'critical' });
                        }
                      }}
                      placeholder="Select priority"
                      className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Category
                    </label>
                    {categoriesLoading ? (
                      <div className="h-11 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400 flex items-center">
                        Loading categories...
                      </div>
                    ) : categories.length === 0 ? (
                      <div className="h-11 w-full rounded-lg border border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 px-4 py-2.5 text-sm text-yellow-700 dark:text-yellow-400 flex items-center">
                        No categories available. Please add categories in Helpdesk Settings first.
                      </div>
                    ) : (
                      <>
                        <Select
                          options={categories.map(cat => ({ value: cat, label: cat }))}
                          defaultValue={editingRule?.ticket_type || newRule.ticket_type || ''}
                          onChange={(value) => {
                            console.log('Category selected:', value);
                            if (editingRule) {
                              setEditingRule({ ...editingRule, ticket_type: value as "incident" | "request" | "problem" | "change" | null });
                            } else {
                              setNewRule({ ...newRule, ticket_type: value as "incident" | "request" | "problem" | "change" | null });
                            }
                          }}
                          placeholder="Select category"
                          className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
                        />
                        {process.env.NODE_ENV === 'development' && (
                          <p className="text-xs text-gray-500 mt-1">
                            Debug: {categories.length} categories loaded
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Business Hours Only
                    </label>
                    <Select
                      options={[
                        { value: 'true', label: 'Yes' },
                        { value: 'false', label: 'No (24/7)' }
                      ]}
                      defaultValue={editingRule?.business_hours_only?.toString() || newRule.business_hours_only?.toString() || 'true'}
                      onChange={(value) => {
                        const boolValue = value === 'true';
                        if (editingRule) {
                          setEditingRule({ ...editingRule, business_hours_only: boolValue });
                        } else {
                          setNewRule({ ...newRule, business_hours_only: boolValue });
                        }
                      }}
                      placeholder="Select business hours"
                      className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      First Response Time (minutes)
                    </label>
                    <Input
                      type="number"
                      value={editingRule 
                        ? (editingRule.response_time_hours ?? 4) * 60 
                        : (newRule.response_time_hours ?? 4) * 60}
                      onChange={(e) => {
                        const inputValue = e.target.value;
                        const value = inputValue === '' ? 0 : parseInt(inputValue, 10);
                        if (isNaN(value) || value < 0) return;
                        if (editingRule) {
                          setEditingRule({ ...editingRule, response_time_hours: value / 60 });
                        } else {
                          setNewRule({ ...newRule, response_time_hours: value / 60 });
                        }
                      }}
                      placeholder="240"
                      min="0"
                      step={1}
                      className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Resolution Time (minutes)
                    </label>
                    <Input
                      type="number"
                      value={editingRule 
                        ? (editingRule.resolution_time_hours ?? 24) * 60 
                        : (newRule.resolution_time_hours ?? 24) * 60}
                      onChange={(e) => {
                        const inputValue = e.target.value;
                        const value = inputValue === '' ? 0 : parseInt(inputValue, 10);
                        if (isNaN(value) || value < 0) return;
                        if (editingRule) {
                          setEditingRule({ ...editingRule, resolution_time_hours: value / 60 });
                        } else {
                          setNewRule({ ...newRule, resolution_time_hours: value / 60 });
                        }
                      }}
                      placeholder="1440"
                      min="0"
                      step={1}
                      className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <TextArea
                    value={editingRule?.description || newRule.description || ''}
                    onChange={(value) => {
                      if (editingRule) {
                        setEditingRule({ ...editingRule, description: value });
                      } else {
                        setNewRule({ ...newRule, description: value });
                      }
                    }}
                    placeholder="Describe this SLA rule..."
                    rows={3}
                    className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
                  />
                </div>

                {/* Email Notification Configuration Section */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Bell className="w-5 h-5 text-blue-500" />
                    Email Notification Settings
                  </h3>
                  
                  <div className="space-y-4">
                    {/* Primary Notification Emails */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Notification Recipients (Primary)
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                          Enter email addresses separated by commas
                        </span>
                      </label>
                      <Input
                        value={(editingRule?.notification_emails || newRule.notification_emails || []).join(', ')}
                        onChange={(e) => {
                          const emailString = e.target.value;
                          const emails = emailString.split(',').map(email => email.trim()).filter(email => email);
                          
                          if (editingRule) {
                            setEditingRule({ ...editingRule, notification_emails: emails });
                          } else {
                            setNewRule({ ...newRule, notification_emails: emails });
                          }
                          
                          // Validate on change (after user types)
                          if (emailString.trim()) {
                            const validation = validateEmails(emailString);
                            if (!validation.isValid) {
                              setEmailErrors(prev => ({
                                ...prev,
                                notification_emails: `Invalid email(s): ${validation.invalidEmails.join(', ')}`
                              }));
                            } else {
                              setEmailErrors(prev => ({ ...prev, notification_emails: undefined }));
                            }
                          } else {
                            setEmailErrors(prev => ({ ...prev, notification_emails: undefined }));
                          }
                        }}
                        placeholder="admin@example.com, manager@example.com"
                        className={`bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white ${
                          emailErrors.notification_emails ? 'border-red-500 dark:border-red-500' : ''
                        }`}
                      />
                      {emailErrors.notification_emails && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {emailErrors.notification_emails}
                        </p>
                      )}
                      {!emailErrors.notification_emails && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          These recipients will receive SLA breach and at-risk notifications
                        </p>
                      )}
                    </div>

                    {/* CC Emails */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        CC Recipients (Optional)
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                          Additional recipients for notification emails
                        </span>
                      </label>
                      <Input
                        value={(editingRule?.cc_emails || newRule.cc_emails || []).join(', ')}
                        onChange={(e) => {
                          const emailString = e.target.value;
                          const emails = emailString.split(',').map(email => email.trim()).filter(email => email);
                          
                          if (editingRule) {
                            setEditingRule({ ...editingRule, cc_emails: emails });
                          } else {
                            setNewRule({ ...newRule, cc_emails: emails });
                          }
                          
                          // Validate on change (after user types)
                          if (emailString.trim()) {
                            const validation = validateEmails(emailString);
                            if (!validation.isValid) {
                              setEmailErrors(prev => ({
                                ...prev,
                                cc_emails: `Invalid email(s): ${validation.invalidEmails.join(', ')}`
                              }));
                            } else {
                              setEmailErrors(prev => ({ ...prev, cc_emails: undefined }));
                            }
                          } else {
                            setEmailErrors(prev => ({ ...prev, cc_emails: undefined }));
                          }
                        }}
                        placeholder="team@example.com, support@example.com"
                        className={`bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white ${
                          emailErrors.cc_emails ? 'border-red-500 dark:border-red-500' : ''
                        }`}
                      />
                      {emailErrors.cc_emails && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {emailErrors.cc_emails}
                        </p>
                      )}
                    </div>

                    {/* Notification Timing */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Send Notification Before Breach (minutes)
                      </label>
                      <Input
                        type="number"
                        value={editingRule?.notification_before_breach_minutes ?? newRule.notification_before_breach_minutes ?? 30}
                        onChange={(e) => {
                          const value = parseInt(e.target.value, 10);
                          if (isNaN(value) || value < 0) return;
                          if (editingRule) {
                            setEditingRule({ ...editingRule, notification_before_breach_minutes: value });
                          } else {
                            setNewRule({ ...newRule, notification_before_breach_minutes: value });
                          }
                        }}
                        placeholder="30"
                        min="0"
                        step={5}
                        className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Send early warning notification X minutes before SLA breach
                      </p>
                    </div>
                  </div>
                </div>

                {/* Escalation Email Configuration Section */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                    Escalation Email Configuration
                  </h3>
                  
                  <div className="space-y-4">
                    {(editingRule?.escalation_levels || newRule.escalation_levels || []).map((level, index) => (
                      <div key={index} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                              Level
                            </label>
                            <Input
                              value={level.level}
                              onChange={(e) => {
                                const updatedLevels = [...(editingRule?.escalation_levels || newRule.escalation_levels || [])];
                                updatedLevels[index] = { ...updatedLevels[index], level: e.target.value };
                                if (editingRule) {
                                  setEditingRule({ ...editingRule, escalation_levels: updatedLevels });
                                } else {
                                  setNewRule({ ...newRule, escalation_levels: updatedLevels });
                                }
                              }}
                              placeholder="level_1"
                              className="bg-white dark:bg-gray-800 text-sm"
                              disabled
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                              Role
                            </label>
                            <Input
                              value={level.role}
                              onChange={(e) => {
                                const updatedLevels = [...(editingRule?.escalation_levels || newRule.escalation_levels || [])];
                                updatedLevels[index] = { ...updatedLevels[index], role: e.target.value };
                                if (editingRule) {
                                  setEditingRule({ ...editingRule, escalation_levels: updatedLevels });
                                } else {
                                  setNewRule({ ...newRule, escalation_levels: updatedLevels });
                                }
                              }}
                              placeholder="team_lead"
                              className="bg-white dark:bg-gray-800 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                              Escalation Email *
                            </label>
                            <Input
                              type="email"
                              value={level.email || ''}
                              onChange={(e) => {
                                const email = e.target.value;
                                const updatedLevels = [...(editingRule?.escalation_levels || newRule.escalation_levels || [])];
                                updatedLevels[index] = { ...updatedLevels[index], email: email };
                                
                                if (editingRule) {
                                  setEditingRule({ ...editingRule, escalation_levels: updatedLevels });
                                } else {
                                  setNewRule({ ...newRule, escalation_levels: updatedLevels });
                                }
                                
                                // Validate on change
                                if (email.trim()) {
                                  if (!isValidEmail(email.trim())) {
                                    setEmailErrors(prev => ({
                                      ...prev,
                                      escalation_emails: {
                                        ...(prev.escalation_emails || {}),
                                        [index]: 'Invalid email format'
                                      }
                                    }));
                                  } else {
                                    // Clear error if valid
                                    const newErrors = { ...emailErrors };
                                    if (newErrors.escalation_emails) {
                                      delete newErrors.escalation_emails[index];
                                      if (Object.keys(newErrors.escalation_emails).length === 0) {
                                        delete newErrors.escalation_emails;
                                      }
                                    }
                                    setEmailErrors(newErrors);
                                  }
                                } else {
                                  // Clear error if empty
                                  const newErrors = { ...emailErrors };
                                  if (newErrors.escalation_emails) {
                                    delete newErrors.escalation_emails[index];
                                    if (Object.keys(newErrors.escalation_emails).length === 0) {
                                      delete newErrors.escalation_emails;
                                    }
                                  }
                                  setEmailErrors(newErrors);
                                }
                              }}
                              placeholder="escalation@example.com"
                              className={`bg-white dark:bg-gray-800 text-sm ${
                                emailErrors.escalation_emails?.[index] ? 'border-red-500 dark:border-red-500' : ''
                              }`}
                            />
                            {emailErrors.escalation_emails?.[index] && (
                              <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                {emailErrors.escalation_emails[index]}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="mt-2">
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Escalate After (hours)
                          </label>
                          <Input
                            type="number"
                            value={level.after_hours}
                            onChange={(e) => {
                              const value = parseInt(e.target.value, 10);
                              if (isNaN(value) || value < 0) return;
                              const updatedLevels = [...(editingRule?.escalation_levels || newRule.escalation_levels || [])];
                              updatedLevels[index] = { ...updatedLevels[index], after_hours: value };
                              if (editingRule) {
                                setEditingRule({ ...editingRule, escalation_levels: updatedLevels });
                              } else {
                                setNewRule({ ...newRule, escalation_levels: updatedLevels });
                              }
                            }}
                            placeholder="2"
                            min="0"
                            step={0.5}
                            className="bg-white dark:bg-gray-800 text-sm w-32"
                          />
                        </div>
                      </div>
                    ))}
                    
                    <div className="flex gap-2">
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          const currentLevels = editingRule?.escalation_levels || newRule.escalation_levels || [];
                          const newLevel = {
                            level: `level_${currentLevels.length + 1}`,
                            after_hours: (currentLevels.length + 1) * 2,
                            role: currentLevels.length === 2 ? 'director' : 'senior_manager',
                            email: ''
                          };
                          if (editingRule) {
                            setEditingRule({ ...editingRule, escalation_levels: [...currentLevels, newLevel] });
                          } else {
                            setNewRule({ ...newRule, escalation_levels: [...currentLevels, newLevel] });
                          }
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add Escalation Level
                      </motion.button>
                      
                      {((editingRule?.escalation_levels || newRule.escalation_levels || []).length > 1) && (
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            const currentLevels = editingRule?.escalation_levels || newRule.escalation_levels || [];
                            if (currentLevels.length > 1) {
                              const updatedLevels = currentLevels.slice(0, -1);
                              if (editingRule) {
                                setEditingRule({ ...editingRule, escalation_levels: updatedLevels });
                              } else {
                                setNewRule({ ...newRule, escalation_levels: updatedLevels });
                              }
                            }
                          }}
                          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Remove Last Level
                        </motion.button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <Button
                    type="button"
                    onClick={() => {
                      const handleSubmit = async () => {
                        try {
                          if (editingRule) {
                            // Validate editing rule
                            if (!editingRule.policy_name || !editingRule.policy_name.trim()) {
                              setError('Rule name is required');
                              return;
                            }
                            if (!editingRule.description || !editingRule.description.trim()) {
                              setError('Description is required');
                              return;
                            }
                            
                            // Validate all email fields
                            if (!validateAllEmails()) {
                              setError('Please fix the invalid email addresses before saving');
                              return;
                            }
                            
                            setError(null);
                            setEmailErrors({});
                            console.log('📝 Updating SLA rule:', editingRule.policy_id);
                            
                            await updateSLAPolicy(editingRule.policy_id!, {
                              policy_name: editingRule.policy_name.trim(),
                              description: editingRule.description.trim(),
                              priority: editingRule.priority,
                              ticket_type: editingRule.ticket_type,
                              response_time_hours: editingRule.response_time_hours ?? 4,
                              resolution_time_hours: editingRule.resolution_time_hours ?? 24,
                              business_hours_only: editingRule.business_hours_only ?? true,
                              escalation_levels: editingRule.escalation_levels || [],
                              notification_channels: editingRule.notification_channels || ['email', 'in_app'],
                              active: editingRule.active ?? true
                            });
                            
                            console.log('✅ SLA rule updated successfully');
                            await fetchSLARules(); // Refresh list
                            setEditingRule(null);
                          } else {
                            await handleCreateRule();
                          }
                        } catch (err) {
                          const errorMessage = err instanceof Error ? err.message : 'Failed to save SLA rule';
                          setError(errorMessage);
                          console.error('❌ Error saving SLA rule:', err);
                        }
                      };
                      
                      handleSubmit();
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors duration-200 flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {editingRule ? 'Update SLA Rule' : 'Create SLA Rule'}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingRule(null);
                      setError(null);
                      setEmailErrors({});
                      setNewRule({ 
                        policy_name: '',
                        description: '', 
                        priority: 'medium', 
                        ticket_type: 'incident',
                        response_time_hours: 4,
                        resolution_time_hours: 24,
                        business_hours_only: true, 
                        escalation_levels: [
                          {"level": "level_1", "after_hours": 2, "role": "team_lead", "email": ""},
                          {"level": "level_2", "after_hours": 4, "role": "manager", "email": ""}
                        ], 
                        notification_channels: ['email', 'in_app'],
                        notification_emails: [],
                        cc_emails: [],
                        active: true 
                      });
                    }}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-xl font-semibold transition-colors duration-200"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm.show && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md"
            >
              <div className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      Delete SLA Rule
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      This action cannot be undone.
                    </p>
                  </div>
                </div>
                
                <div className="mb-6">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Are you sure you want to delete <span className="font-semibold">&quot;{deleteConfirm.ruleName}&quot;</span>?
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    onClick={confirmDelete}
                    variant="danger"
                    className="flex-1"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </Button>
                  <Button
                    type="button"
                    onClick={cancelDelete}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Toast Notification */}
        {toast.show && (
          <Alert
            variant={toast.variant}
            title={toast.title}
            message={toast.message}
            showCloseButton={true}
            onClose={() => setToast(prev => ({ ...prev, show: false }))}
          />
        )}
      </div>
    </div>
  );
}
