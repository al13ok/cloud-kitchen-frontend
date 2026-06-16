'use client';

import React, { useState, useEffect } from 'react';
import DashboardHeader from '@/components/header/DashboardHeader';
import { toast } from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import Button from '../../ui/button/Button';
import {
  Calendar,
  Clock,
  Users,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  CheckCircle,
  Info
} from 'lucide-react';
import {
  getLeaveTypes,
  createLeaveType,
  updateLeaveType,
  deleteLeaveType,
  type LeaveType as LeaveTypeAPI,
  type LeaveTypeCreate,
  type LeaveTypeUpdate
} from '@/lib/api';

// Verify imports at module level
if (typeof window !== 'undefined') {
  if (typeof getLeaveTypes !== 'function') {
    console.error('❌ getLeaveTypes is not a function. Check API imports.');
  }
  if (typeof createLeaveType !== 'function') {
    console.error('❌ createLeaveType is not a function. Check API imports.');
  }
  if (typeof updateLeaveType !== 'function') {
    console.error('❌ updateLeaveType is not a function. Check API imports.');
  }
  if (typeof deleteLeaveType !== 'function') {
    console.error('❌ deleteLeaveType is not a function. Check API imports.');
  }
}

// Custom CSS animations
const customStyles = `
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes slideInLeft {
    from {
      opacity: 0;
      transform: translateX(-50px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  @keyframes slideInRight {
    from {
      opacity: 0;
      transform: translateX(50px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  @keyframes bounceIn {
    0% {
      opacity: 0;
      transform: scale(0.3);
    }
    50% {
      opacity: 1;
      transform: scale(1.05);
    }
    70% {
      transform: scale(0.9);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }
  
  @keyframes float {
    0%, 100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-10px);
    }
  }
  
  @keyframes floatSlow {
    0%, 100% {
      transform: translateY(0px) translateX(0px);
    }
    50% {
      transform: translateY(-5px) translateX(5px);
    }
  }
  
  @keyframes floatReverse {
    0%, 100% {
      transform: translateY(0px) translateX(0px);
    }
    50% {
      transform: translateY(5px) translateX(-5px);
    }
  }
  
  @keyframes gradientShift {
    0%, 100% {
      background-position: 0% 50%;
    }
    50% {
      background-position: 100% 50%;
    }
  }
  
  .animate-fade-in-up {
    animation: fadeInUp 0.8s ease-out forwards;
  }
  
  .animate-slide-in-left {
    animation: slideInLeft 0.8s ease-out forwards;
  }
  
  .animate-slide-in-right {
    animation: slideInRight 0.8s ease-out forwards;
  }
  
  .animate-bounce-in {
    animation: bounceIn 0.8s ease-out forwards;
  }
  
  .animate-float {
    animation: float 3s ease-in-out infinite;
  }
  
  .animate-float-slow {
    animation: floatSlow 4s ease-in-out infinite;
  }
  
  .animate-float-reverse {
    animation: floatReverse 4s ease-in-out infinite;
  }
  
  .animate-gradient-shift {
    background-size: 200% 200%;
    animation: gradientShift 3s ease infinite;
  }
  
  .delay-300 {
    animation-delay: 0.3s;
  }
  
  .delay-500 {
    animation-delay: 0.5s;
  }
  
  .delay-700 {
    animation-delay: 0.7s;
  }
  
  .delay-1000 {
    animation-delay: 1s;
  }
`;

// Leave Types Interface
// Using LeaveTypeAPI from API, keeping local interface for backward compatibility
interface LeaveType extends LeaveTypeAPI {
  id: string;
  name: string;
  description: string;
  maxDaysPerMonth: number;
  maxDaysPerYear: number;
  carryForward: boolean;
  requiresApproval: boolean;
  color: string;
  icon: string;
  rules: string[];
  isActive: boolean;
}

// Mock Data for Leave Types
const MOCK_LEAVE_TYPES: LeaveType[] = [
  {
    id: 'sick-leave',
    name: 'Sick Leave',
    description: 'Medical leave for illness or health-related issues',
    maxDaysPerMonth: 2,
    maxDaysPerYear: 12,
    carryForward: false,
    requiresApproval: true,
    color: 'bg-red-100 text-red-800',
    icon: '🏥',
    rules: [
      'Requires medical certificate for more than 2 consecutive days',
      'Cannot be carried forward to next year',
      'Manager approval required',
      'Can be taken in half-day increments'
    ],
    isActive: true
  },
  {
    id: 'annual-leave',
    name: 'Annual Leave',
    description: 'Vacation leave for personal time off',
    maxDaysPerMonth: 2.5,
    maxDaysPerYear: 30,
    carryForward: true,
    requiresApproval: true,
    color: 'bg-blue-100 text-blue-800',
    icon: '🏖️',
    rules: [
      'Must be applied at least 7 days in advance',
      'Maximum 5 days can be carried forward',
      'Manager approval required',
      'Cannot be taken during peak business periods'
    ],
    isActive: true
  },
  {
    id: 'personal-leave',
    name: 'Personal Leave',
    description: 'Leave for personal matters and emergencies',
    maxDaysPerMonth: 1,
    maxDaysPerYear: 6,
    carryForward: false,
    requiresApproval: true,
    color: 'bg-purple-100 text-purple-800',
    icon: '👤',
    rules: [
      'Can be used for personal emergencies',
      'Manager approval required',
      'Cannot be carried forward',
      'Maximum 2 days per month'
    ],
    isActive: true
  },
  {
    id: 'maternity-leave',
    name: 'Maternity Leave',
    description: 'Leave for new mothers',
    maxDaysPerMonth: 0,
    maxDaysPerYear: 90,
    carryForward: false,
    requiresApproval: true,
    color: 'bg-pink-100 text-pink-800',
    icon: '👶',
    rules: [
      'Available for female employees only',
      '90 days total per year',
      'Requires medical documentation',
      'Manager and HR approval required'
    ],
    isActive: true
  },
  {
    id: 'paternity-leave',
    name: 'Paternity Leave',
    description: 'Leave for new fathers',
    maxDaysPerMonth: 0,
    maxDaysPerYear: 15,
    carryForward: false,
    requiresApproval: true,
    color: 'bg-green-100 text-green-800',
    icon: '👨‍👶',
    rules: [
      'Available for male employees only',
      '15 days total per year',
      'Must be taken within 3 months of child birth',
      'Manager and HR approval required'
    ],
    isActive: true
  },
  {
    id: 'compensatory-leave',
    name: 'Compensatory Leave',
    description: 'Leave earned for working overtime or holidays',
    maxDaysPerMonth: 0,
    maxDaysPerYear: 0,
    carryForward: true,
    requiresApproval: false,
    color: 'bg-yellow-100 text-yellow-800',
    icon: '⏰',
    rules: [
      'Earned for working overtime or holidays',
      'Can be carried forward for 6 months',
      'No manager approval required',
      'Must be used within 6 months of earning'
    ],
    isActive: true
  }
];

const LeaveSettingsPage: React.FC = () => {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [editingLeave, setEditingLeave] = useState<LeaveType | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLeaveType, setNewLeaveType] = useState<Partial<LeaveType>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rulesInput, setRulesInput] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  // Handle client-side mounting to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load leave types from API (only on client side)
  useEffect(() => {
    if (!mounted) return; // Don't run on server

    const loadLeaveTypes = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('🔄 LeaveSettingsPage - Loading leave types from API...');

        // Verify function exists
        if (typeof getLeaveTypes !== 'function') {
          console.error('❌ getLeaveTypes is not a function:', {
            type: typeof getLeaveTypes,
            value: getLeaveTypes,
            imports: { getLeaveTypes, createLeaveType, updateLeaveType, deleteLeaveType }
          });
          throw new Error('getLeaveTypes is not a function. Please restart the dev server to clear cache.');
        }

        const data = await getLeaveTypes();
        console.log('✅ LeaveSettingsPage - Loaded leave types:', {
          count: data.length,
          types: data.map(lt => lt.name)
        });

        if (Array.isArray(data) && data.length > 0) {
          setLeaveTypes(data);
        } else {
          console.warn('⚠️ LeaveSettingsPage - No leave types returned from API, using empty array');
          setLeaveTypes([]);
        }
      } catch (err) {
        console.error('❌ LeaveSettingsPage - Error loading leave types:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load leave types';
        setError(errorMessage);

        // Only fallback to mock data in development mode
        if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
          console.warn('⚠️ LeaveSettingsPage - Using mock data as fallback');
          setLeaveTypes(MOCK_LEAVE_TYPES);
        } else {
          setLeaveTypes([]);
        }
      } finally {
        setLoading(false);
      }
    };
    loadLeaveTypes();
  }, [mounted]);

  // Handle editing leave type
  const handleEditLeave = (leaveType: LeaveType) => {
    setEditingLeave(leaveType);
    setNewLeaveType(leaveType);
    setRulesInput(leaveType.rules.join('\n'));
  };

  // Handle saving leave type
  const handleSaveLeave = async () => {
    // Validation
    if (!newLeaveType.name || newLeaveType.name.trim() === '') {
      toast.error('Please enter a leave name');
      return;
    }

    // Parse rules from textarea (one rule per line)
    const rules = rulesInput.split('\n').filter(rule => rule.trim() !== '');

    try {
      setError(null);
      if (editingLeave) {
        // Update existing leave type
        const updateData: LeaveTypeUpdate = {
          name: newLeaveType.name?.trim(),
          description: newLeaveType.description,
          maxDaysPerMonth: Number(newLeaveType.maxDaysPerMonth) || 0,
          maxDaysPerYear: Number(newLeaveType.maxDaysPerYear) || 0,
          carryForward: newLeaveType.carryForward,
          requiresApproval: newLeaveType.requiresApproval,
          color: newLeaveType.color,
          icon: newLeaveType.icon,
          rules: rules,
          isActive: newLeaveType.isActive
        };
        const updated = await updateLeaveType(editingLeave.id, updateData);
        setLeaveTypes(prev => prev.map(leave => leave.id === editingLeave.id ? updated : leave));
      } else {
        // Create new leave type
        const createData: LeaveTypeCreate = {
          name: newLeaveType.name.trim(),
          description: newLeaveType.description,
          maxDaysPerMonth: Number(newLeaveType.maxDaysPerMonth) || 0,
          maxDaysPerYear: Number(newLeaveType.maxDaysPerYear) || 0,
          carryForward: newLeaveType.carryForward !== undefined ? newLeaveType.carryForward : false,
          requiresApproval: newLeaveType.requiresApproval !== undefined ? newLeaveType.requiresApproval : true,
          color: newLeaveType.color,
          icon: newLeaveType.icon,
          rules: rules,
          isActive: newLeaveType.isActive !== undefined ? newLeaveType.isActive : true
        };
        const created = await createLeaveType(createData);
        setLeaveTypes(prev => [...prev, created]);
      }

      setEditingLeave(null);
      setShowAddForm(false);
      setNewLeaveType({});
      setRulesInput('');
      console.log('✅ LeaveSettingsPage - Leave type saved successfully');
    } catch (err) {
      console.error('❌ LeaveSettingsPage - Error saving leave type:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save leave type';
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  // Handle deleting leave type
  const handleDeleteLeave = async (leaveId: string) => {
    if (!confirm('Are you sure you want to delete this leave type?')) {
      return;
    }

    try {
      setError(null);
      console.log('🔄 LeaveSettingsPage - Deleting leave type:', leaveId);
      await deleteLeaveType(leaveId);
      setLeaveTypes(prev => prev.filter(leave => leave.id !== leaveId));
      console.log('✅ LeaveSettingsPage - Leave type deleted successfully');
    } catch (err) {
      console.error('❌ LeaveSettingsPage - Error deleting leave type:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete leave type';
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  // Handle toggling leave type status
  const handleToggleLeaveStatus = async (leaveId: string) => {
    const leaveType = leaveTypes.find(leave => leave.id === leaveId);
    if (!leaveType) return;

    try {
      setError(null);
      console.log('🔄 LeaveSettingsPage - Toggling leave type status:', {
        leaveId,
        currentStatus: leaveType.isActive,
        newStatus: !leaveType.isActive
      });
      const updated = await updateLeaveType(leaveId, { isActive: !leaveType.isActive });
      setLeaveTypes(prev => prev.map(leave => leave.id === leaveId ? updated : leave));
      console.log('✅ LeaveSettingsPage - Leave type status updated successfully');
    } catch (err) {
      console.error('❌ LeaveSettingsPage - Error toggling leave type status:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update leave type status';
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  // Prevent hydration mismatch by not rendering dynamic content until mounted
  if (!mounted) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: customStyles }} />
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style={{ borderColor: '#3366CC' }}></div>
              <p className="mt-2 text-gray-600 dark:text-gray-400">Loading...</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: customStyles }} />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <DashboardHeader
            title="Leave Settings"
            subtitle="Advanced leave management system with intelligent policy configuration, automated balance tracking, and enterprise-grade compliance for multinational operations."
            icon={Calendar}
            iconColor="text-white"
            hideTenantPrefix={true}
            breadcrumbs={[
              { label: 'Home', href: '/' },
              { label: 'ESS Portal', href: '/ess-portal' },
              { label: 'Leave Settings' }
            ]}
          />

          {/* Content Section */}
          <div className="space-y-6 mt-8">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-400 px-4 py-3 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <strong>Error:</strong> {error}
                  </div>
                  <button
                    onClick={() => setError(null)}
                    className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 ml-4"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {(error.includes('server is not running') || error.includes('Failed to fetch')) && (
                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-blue-800 dark:text-blue-400 text-sm font-medium mb-2">
                      <strong>🚀 To fix this:</strong> Start your Python backend server
                    </p>
                    <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-xs font-mono text-gray-700 dark:text-gray-300">
                      <div>cd mobiloitte-converiqoai-10000012-python</div>
                      <div>python main.py</div>
                      <div className="text-gray-500 dark:text-gray-500 mt-1"># or</div>
                      <div>uvicorn main:app --reload --host 0.0.0.0 --port 8000</div>
                    </div>
                    <p className="text-blue-700 dark:text-blue-400 text-xs mt-2">
                      Then visit <code className="bg-blue-100 dark:bg-blue-900/30 px-1 rounded">https://py-mobiloitte.converiqo.ai/docs</code> to verify the server is running.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style={{ borderColor: '#3366CC' }}></div>
                <p className="mt-2 text-gray-600 dark:text-gray-400">Loading leave types...</p>
              </div>
            )}

            {/* Action Button */}
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShowAddForm(true);
                  setEditingLeave(null);
                  setNewLeaveType({});
                  setRulesInput('');
                }}
                className="inline-flex items-center px-4 py-2 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-lg font-medium"
                style={{ backgroundColor: '#3366CC' }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Leave Type
              </button>
            </div>

            {/* Empty State */}
            {!loading && !error && leaveTypes.length === 0 && (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
                <Calendar className="h-16 w-16 mx-auto mb-4" style={{ color: '#3366CC' }} />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Leave Types Found</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">Get started by creating your first leave type.</p>
                <button
                  onClick={() => {
                    setShowAddForm(true);
                    setEditingLeave(null);
                    setNewLeaveType({});
                    setRulesInput('');
                  }}
                  className="inline-flex items-center px-4 py-2 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-lg font-medium"
                  style={{ backgroundColor: '#3366CC' }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Leave Type
                </button>
              </div>
            )}

            {/* Leave Types Grid */}
            {!loading && leaveTypes.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {leaveTypes.map((leaveType) => {
                  return (
                    <div key={leaveType.id} className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-105 cursor-pointer group h-full overflow-hidden border border-gray-200 dark:border-gray-700">
                      {/* Background Effects */}
                      <div className="absolute inset-0 bg-[#3366CC]/5 dark:bg-[#3366CC]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      <div className="absolute top-0 right-0 w-20 h-20 bg-[#3366CC]/10 dark:bg-[#3366CC]/20 rounded-full -translate-y-10 translate-x-10 opacity-0 group-hover:opacity-70 transition-opacity duration-500"></div>

                      <div className="relative z-10 p-6 flex flex-col h-full">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className="p-3 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110" style={{ backgroundColor: '#3366CC' }}>
                              <span className="text-2xl text-white">{leaveType.icon}</span>
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-gray-800 dark:text-white group-hover:text-[#3366CC] dark:group-hover:text-[#4a7dd9] transition-colors duration-300">{leaveType.name}</h3>
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${leaveType.isActive ? 'bg-[#3366CC]/10 dark:bg-[#3366CC]/20 text-[#3366CC] dark:text-[#4a7dd9]' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'} ${!leaveType.isActive ? 'opacity-50' : ''}`}
                              >
                                {leaveType.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </div>
                          <div className="flex space-x-1">
                            <button
                              className="p-1 hover:bg-[#3366CC]/10 dark:hover:bg-[#3366CC]/20 rounded transition-colors duration-200"
                              onClick={() => handleEditLeave(leaveType)}
                            >
                              <Edit className="w-4 h-4" style={{ color: '#3366CC' }} />
                            </button>
                            <button
                              className="p-1 hover:bg-[#3366CC]/10 dark:hover:bg-[#3366CC]/20 rounded transition-colors duration-200"
                              onClick={() => handleToggleLeaveStatus(leaveType.id)}
                            >
                              {leaveType.isActive ? <X className="w-4 h-4" style={{ color: '#3366CC' }} /> : <CheckCircle className="w-4 h-4" style={{ color: '#3366CC' }} />}
                            </button>
                            <button
                              className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors duration-200"
                              onClick={() => handleDeleteLeave(leaveType.id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                            </button>
                          </div>
                        </div>

                        {/* Description */}
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{leaveType.description}</p>

                        {/* Leave Limits */}
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="text-center p-3 bg-[#3366CC]/10 dark:bg-[#3366CC]/20 rounded-lg border border-[#3366CC]/20 dark:border-[#3366CC]/30">
                            <div className="text-2xl font-bold" style={{ color: '#3366CC' }}>{leaveType.maxDaysPerMonth}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Days/Month</div>
                          </div>
                          <div className="text-center p-3 bg-[#3366CC]/10 dark:bg-[#3366CC]/20 rounded-lg border border-[#3366CC]/20 dark:border-[#3366CC]/30">
                            <div className="text-2xl font-bold" style={{ color: '#3366CC' }}>{leaveType.maxDaysPerYear}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Days/Year</div>
                          </div>
                        </div>

                        {/* Rules */}
                        <div className="space-y-2 mb-4 flex-grow">
                          <div className="flex items-center space-x-2">
                            <Info className="w-4 h-4" style={{ color: '#3366CC' }} />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Rules:</span>
                          </div>
                          <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                            {leaveType.rules.slice(0, 2).map((rule, ruleIndex) => (
                              <li key={ruleIndex} className="flex items-start space-x-2">
                                <span className="mt-1" style={{ color: '#3366CC' }}>•</span>
                                <span>{rule}</span>
                              </li>
                            ))}
                            {leaveType.rules.length > 2 && (
                              <li className="cursor-pointer hover:underline" style={{ color: '#3366CC' }}>
                                +{leaveType.rules.length - 2} more rules
                              </li>
                            )}
                          </ul>
                        </div>

                        {/* Features */}
                        <div className="flex flex-wrap gap-2 mt-auto">
                          {leaveType.carryForward && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#3366CC]/10 dark:bg-[#3366CC]/20 text-[#3366CC] dark:text-[#4a7dd9] border border-[#3366CC]/20 dark:border-[#3366CC]/30">
                              <Clock className="w-3 h-3 mr-1" style={{ color: '#3366CC' }} />
                              Carry Forward
                            </span>
                          )}
                          {leaveType.requiresApproval && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#3366CC]/10 dark:bg-[#3366CC]/20 text-[#3366CC] dark:text-[#4a7dd9] border border-[#3366CC]/20 dark:border-[#3366CC]/30">
                              <Users className="w-3 h-3 mr-1" style={{ color: '#3366CC' }} />
                              Approval Required
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add/Edit Form Modal */}
            {(showAddForm || editingLeave) && (
              <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
                <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <CardHeader className="border-b border-gray-200 dark:border-gray-700">
                    <CardTitle className="text-gray-900 dark:text-white">
                      {editingLeave ? 'Edit Leave Type' : 'Add New Leave Type'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Leave Name</label>
                        <input
                          id="name"
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#3366CC]/50 focus:border-[#3366CC]"
                          value={newLeaveType.name || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewLeaveType(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="e.g., Sick Leave"
                        />
                      </div>
                      <div>
                        <label htmlFor="icon" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Icon</label>
                        <input
                          id="icon"
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#3366CC]/50 focus:border-[#3366CC]"
                          value={newLeaveType.icon || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewLeaveType(prev => ({ ...prev, icon: e.target.value }))}
                          placeholder="🏥"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                      <textarea
                        id="description"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#3366CC]/50 focus:border-[#3366CC]"
                        rows={3}
                        value={newLeaveType.description || ''}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewLeaveType(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Describe this leave type..."
                      />
                    </div>

                    <div>
                      <label htmlFor="rules" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rules (one per line)</label>
                      <textarea
                        id="rules"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#3366CC]/50 focus:border-[#3366CC]"
                        rows={5}
                        value={rulesInput}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRulesInput(e.target.value)}
                        placeholder="Enter rules, one per line&#10;e.g.,&#10;Requires medical certificate for more than 2 consecutive days&#10;Cannot be carried forward to next year&#10;Manager approval required"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Enter each rule on a new line</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="maxDaysPerMonth" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max Days Per Month</label>
                        <input
                          id="maxDaysPerMonth"
                          type="number"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#3366CC]/50 focus:border-[#3366CC]"
                          value={newLeaveType.maxDaysPerMonth || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewLeaveType(prev => ({ ...prev, maxDaysPerMonth: Number(e.target.value) }))}
                        />
                      </div>
                      <div>
                        <label htmlFor="maxDaysPerYear" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max Days Per Year</label>
                        <input
                          id="maxDaysPerYear"
                          type="number"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#3366CC]/50 focus:border-[#3366CC]"
                          value={newLeaveType.maxDaysPerYear || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewLeaveType(prev => ({ ...prev, maxDaysPerYear: Number(e.target.value) }))}
                        />
                      </div>
                    </div>

                    <div className="flex space-x-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="carryForward"
                          checked={newLeaveType.carryForward || false}
                          onChange={(e) => setNewLeaveType(prev => ({ ...prev, carryForward: e.target.checked }))}
                          className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-[#3366CC] focus:ring-[#3366CC]"
                        />
                        <label htmlFor="carryForward" className="text-sm font-medium text-gray-700 dark:text-gray-300">Allow Carry Forward</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="requiresApproval"
                          checked={newLeaveType.requiresApproval || false}
                          onChange={(e) => setNewLeaveType(prev => ({ ...prev, requiresApproval: e.target.checked }))}
                          className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-[#3366CC] focus:ring-[#3366CC]"
                        />
                        <label htmlFor="requiresApproval" className="text-sm font-medium text-gray-700 dark:text-gray-300">Requires Approval</label>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowAddForm(false);
                          setEditingLeave(null);
                          setNewLeaveType({});
                          setRulesInput('');
                        }}
                        className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        Cancel
                      </Button>
                      <button
                        onClick={handleSaveLeave}
                        className="inline-flex items-center px-4 py-2 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-300"
                        style={{ backgroundColor: '#3366CC' }}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default LeaveSettingsPage;
