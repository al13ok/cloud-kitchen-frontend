"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { convertUTCToIST12Hour } from './utils/timeUtils';
import { DateTimePicker12h } from './components/DateTimePicker12h';
import { API_URLS } from './config/api';
import DashboardHeader from '@/components/header/DashboardHeader';
import { Calendar } from 'lucide-react';
import { getAuthHeaders } from '@/utils/api';
import AuthService from '@/services/AuthService';
import { VisualCalendar } from './components/VisualCalendar';
import { FaCalendarAlt, FaTimes, FaEdit, FaTrash } from 'react-icons/fa';

// Appointment source types configuration
const APPOINTMENT_SOURCE_TYPES = [
  { value: 'customer', label: 'Customer' },
  { value: 'lead', label: 'Lead' },
  { value: 'appointment', label: 'Appointment' },
  { value: 'job', label: 'Job' },
  { value: 'employee', label: 'Employee' },
] as const;

type ServiceRow = {
  id: string;
  name: string;
  description?: string;
  duration?: number;
  email?: string;
  role_id?: string;
  user_id?: string;
  role_name?: string;
  active?: boolean;
  counts: { total: number; today: number; confirmed: number; cancelled: number };
};

type Role = {
  id: string;
  name: string;
  description?: string;
  role_name?: string;
};

type AppointmentRow = {
  id: string;
  reference_id?: string;
  display_name?: string;
  source?: string;
  source_id?: string;
  service_name?: string;
  date: string;
  time: string;
  status: string;
  type?: string;
  customer_name?: string;
  customer_email?: string;
  lead_id?: string;
  redirect_url?: string;
  created_at?: string;
  updated_at?: string;
  user_name?: string;
  user_email?: string;
  reason?: string;
  booked_by?: string; // Source: job, leads, customer, employee, etc.
  source_name?: string; // Name of the source record
  history?: Array<{
    action: string;
    timestamp: string;
    user: string;
    details?: string;
  }>;
};

const AdminPage: React.FC = () => {
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<ServiceRow | null>(null);
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [newService, setNewService] = useState({ name: '', description: '', duration: 60, role_id: '', user_id: '', active: true });
  const [editService, setEditService] = useState<ServiceRow | null>(null);
  const [roleUsers, setRoleUsers] = useState<Array<{ id: string; email: string; name?: string; full_name?: string }>>([]);
  const [loadingRoleUsers, setLoadingRoleUsers] = useState(false);
  const [editRoleUsers, setEditRoleUsers] = useState<Array<{ id: string; email: string; name?: string; full_name?: string }>>([]);
  const [loadingEditRoleUsers, setLoadingEditRoleUsers] = useState(false);
  const [apptLoading, setApptLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'services' | 'appointments' | 'availability' | 'metrics'>('services');
  const [tenantId] = useState<string>('');
  const tenantHeaders = React.useMemo(() => 
    tenantId ? { 'X-Tenant-ID': tenantId } : {} as Record<string, string>, 
    [tenantId]
  );
  // Metrics state
  const [metrics, setMetrics] = useState<{ total:number; confirmed:number; cancelled:number; role_name?: string; is_super_admin?: boolean }|null>(null);
  // Availability state
  const [slots, setSlots] = useState<Array<{
    id: string;
    start_utc: string;
    end_utc: string;
    capacity: number;
    booked: number;
    service_id: string;
  }>>([]);
  const [newSlot, setNewSlot] = useState<{ service_id:string; start_utc:string; end_utc:string; capacity:number}>({ service_id:'', start_utc:'', end_utc:'', capacity:1 });
  // Role-based access control state
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [currentUserRoleId, setCurrentUserRoleId] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [, setRolesLoading] = useState(false);
  
  // Appointment action modals state
  const [showCreateAppointmentModal, setShowCreateAppointmentModal] = useState(false);
  const [showEditAppointmentModal, setShowEditAppointmentModal] = useState(false);
  const [showCancelAppointmentModal, setShowCancelAppointmentModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<AppointmentRow | null>(null);
  const [cancellingAppointment, setCancellingAppointment] = useState<AppointmentRow | null>(null);
  
  // Calendar data state for appointment modals
  const [selectedServiceForAppointment, setSelectedServiceForAppointment] = useState<ServiceRow | null>(null);
  const [appointmentDate, setAppointmentDate] = useState<string>('');
  const [appointmentTime, setAppointmentTime] = useState<string>('');
  const [appointmentNotes, setAppointmentNotes] = useState<string>('');
  const [appointmentCustomerName, setAppointmentCustomerName] = useState<string>('');
  const [appointmentCustomerEmail, setAppointmentCustomerEmail] = useState<string>('');
  const [appointmentSource, setAppointmentSource] = useState<string>('customer');
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Validation errors
  const [validationErrors, setValidationErrors] = useState<{
    customerName?: string;
    customerEmail?: string;
  }>({});
  
  // Validation regex patterns
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const nameRegex = /^[a-zA-Z\s'-]{2,50}$/;
  
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const [availableDates, setAvailableDates] = useState<Array<{ date: string; status: 'available' | 'full' | 'not_assigned' }>>([]);
  const [editAvailableDates, setEditAvailableDates] = useState<Array<{ date: string; status: 'available' | 'full' | 'not_assigned' }>>([]);
  const [timeSlots, setTimeSlots] = useState<Array<{id: string; label: string; start_utc: string; available: number}>>([]);
  const [editTimeSlots, setEditTimeSlots] = useState<Array<{id: string; label: string; start_utc: string; available: number}>>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');
  const [editSelectedSlotId, setEditSelectedSlotId] = useState<string>('');
  const [cancelReason, setCancelReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch available roles and get current user role
  useEffect(() => {
    const fetchRolesAndUser = async () => {
      try {
        setRolesLoading(true);
        // Fetch available roles
        const rolesRes = await fetch('/api/v1/roles', { 
          headers: { ...getAuthHeaders(), ...tenantHeaders },
          credentials: 'include'
        });
        if (rolesRes.ok) {
          const rolesData = await rolesRes.json();
          const roles = rolesData.map((role: Role) => ({
            id: role.id,
            name: (role as { role_name?: string }).role_name || role.name,
            description: role.description || '',
          }));
          setAvailableRoles(roles);
        }

        // Get current user's role
        const authService = AuthService.getInstance();
        const user = authService.getCurrentUser();
        if (user) {
          const roleId = user.role_id;
          if (roleId) {
            setCurrentUserRoleId(roleId);
            // Fetch role details to get role name
            const roleRes = await fetch(`/api/v1/roles/${roleId}`, {
              headers: { ...getAuthHeaders(), ...tenantHeaders },
              credentials: 'include'
            });
            if (roleRes.ok) {
              const roleData = await roleRes.json();
              const roleName = (roleData as { role_name?: string }).role_name || roleData.name || '';
              setCurrentUserRole(roleName);
              // Check if Super Admin
              const normalizedRoleName = roleName.toLowerCase();
              setIsSuperAdmin(normalizedRoleName === 'super admin' || normalizedRoleName === 'administrator');
            }
          }
        }
      } catch (e: unknown) {
        console.error('Failed to fetch roles or user info:', e);
      } finally {
        setRolesLoading(false);
      }
    };
    fetchRolesAndUser();
  }, [tenantHeaders]);

  // Get current user ID
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  useEffect(() => {
    const authService = AuthService.getInstance();
    const user = authService.getCurrentUser();
    if (user) {
      const userId = user.user_id || user.email || null;
      setCurrentUserId(userId);
    }
  }, []);

  // Filter services based on current user's role, user_id, and active status
  const filteredServices = React.useMemo(() => {
    // First filter by active status (only show active services)
    const activeServices = services.filter(service => service.active !== false);
    
    if (isSuperAdmin) {
      return activeServices; // Super Admin sees all active services
    }
    if (!currentUserRoleId) {
      return []; // No role assigned, show nothing
    }
    // Filter active services assigned to current user's role
    return activeServices.filter(service => {
      // If service has a specific user_id, only show to that user
      if (service.user_id) {
        return service.role_id === currentUserRoleId && service.user_id === currentUserId;
      }
      // Otherwise, show to all users in the role
      return service.role_id === currentUserRoleId;
    });
  }, [services, currentUserRoleId, currentUserId, isSuperAdmin]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(API_URLS.ADMIN_SERVICES, { headers: { ...tenantHeaders } });
        if (!res.ok) throw new Error(`Failed to load services (${res.status})`);
        const data = await res.json();
        // Ensure role_id is preserved in service data
        const servicesWithRole = data.map((service: ServiceRow) => ({
          ...service,
          role_id: service.role_id || undefined,
        }));
        setServices(servicesWithRole);
      } catch (e: unknown) {
        const error = e as Error;
        setError(error.message || 'Failed to load services');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [tenantHeaders]);

  // Fetch users for the selected role when role_id changes
  useEffect(() => {
    const fetchRoleUsers = async () => {
      if (!newService.role_id) {
        setRoleUsers([]);
        setNewService(prev => ({ ...prev, user_id: '' })); // Clear user selection when role changes
        return;
      }

      try {
        setLoadingRoleUsers(true);
        // Fetch all users and filter by role_id
        const response = await fetch(`/api/v1/users?online_only=false&include_offline=true`, {
          headers: { ...getAuthHeaders(), ...tenantHeaders },
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          // Handle different response formats
          const users = Array.isArray(data) ? data : (data.users || data.data || []);
          
          // Get the selected role name for matching
          const selectedRole = availableRoles.find(role => role.id === newService.role_id);
          const selectedRoleName = selectedRole ? ((selectedRole as { role_name?: string }).role_name || selectedRole.name) : null;
          
          // Filter users by role_id or role name - check multiple possible fields
          const filteredUsers = users.filter((user: Record<string, unknown>) => {
            // Check role_id directly
            const userRoleId = user.role_id;
            if (userRoleId === newService.role_id) return true;
            
            // Check roles array
            const roles = (user as { roles?: string[] | string }).roles;
            if (Array.isArray(roles)) {
              return roles.includes(newService.role_id) || (selectedRoleName && roles.includes(selectedRoleName));
            }
            if (typeof roles === 'string') {
              return roles === newService.role_id || roles === selectedRoleName;
            }
            
            // Check userRoles field (might be a string with role names)
            const userRolesString = user.userRoles as string | undefined;
            if (typeof userRolesString === 'string' && selectedRoleName) {
              return userRolesString.includes(selectedRoleName);
            }
            
            return false;
          });

          // Extract user data with id, email, and name
          const usersList = filteredUsers.map((user: Record<string, unknown>) => {
            const id = user.id || user.user_id || user.email || String(user._id || '');
            const email = (user.email as string) || '';
            const name = (user.name as string) || (user.full_name as string) || (user.username as string) || email;
            return { id: String(id), email, name };
          }).filter((user: { id: string }) => user.id && user.id !== 'undefined' && user.id !== 'null');

          setRoleUsers(usersList);
        } else {
          setRoleUsers([]);
        }
      } catch (error) {
        console.error('Error fetching role users:', error);
        setRoleUsers([]);
      } finally {
        setLoadingRoleUsers(false);
      }
    };

    fetchRoleUsers();
  }, [newService.role_id, tenantHeaders, availableRoles]);

  // Fetch users for editService when role_id changes
  useEffect(() => {
    const fetchEditRoleUsers = async () => {
      if (!editService?.role_id) {
        setEditRoleUsers([]);
        return;
      }

      try {
        setLoadingEditRoleUsers(true);
        const response = await fetch(`/api/v1/users?online_only=false&include_offline=true`, {
          headers: { ...getAuthHeaders(), ...tenantHeaders },
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          const users = Array.isArray(data) ? data : (data.users || data.data || []);
          
          const selectedRole = availableRoles.find(role => role.id === editService.role_id);
          const selectedRoleName = selectedRole ? ((selectedRole as { role_name?: string }).role_name || selectedRole.name) : null;
          
          const filteredUsers = users.filter((user: Record<string, unknown>) => {
            const userRoleId = user.role_id;
            if (userRoleId === editService.role_id) return true;
            
            const roles = (user as { roles?: string[] | string }).roles;
            if (Array.isArray(roles)) {
              return roles.includes(editService.role_id!) || (selectedRoleName && roles.includes(selectedRoleName));
            }
            if (typeof roles === 'string') {
              return roles === editService.role_id || roles === selectedRoleName;
            }
            
            const userRolesString = user.userRoles as string | undefined;
            if (typeof userRolesString === 'string' && selectedRoleName) {
              return userRolesString.includes(selectedRoleName);
            }
            
            return false;
          });

          const usersList = filteredUsers.map((user: Record<string, unknown>) => {
            const id = user.id || user.user_id || user.email || String(user._id || '');
            const email = (user.email as string) || '';
            const name = (user.name as string) || (user.full_name as string) || (user.username as string) || email;
            return { id: String(id), email, name };
          }).filter((user: { id: string }) => user.id && user.id !== 'undefined' && user.id !== 'null');

          setEditRoleUsers(usersList);
        } else {
          setEditRoleUsers([]);
        }
      } catch (error) {
        console.error('Error fetching edit role users:', error);
        setEditRoleUsers([]);
      } finally {
        setLoadingEditRoleUsers(false);
      }
    };

    fetchEditRoleUsers();
  }, [editService?.role_id, tenantHeaders, availableRoles]);

  const loadAppointments = useCallback(async (svc: ServiceRow) => {
    try {
      setSelectedService(svc);
      setActiveTab('appointments'); // Switch to appointments tab
      setApptLoading(true);
      const qs = new URLSearchParams({ service_id: svc.id, status: statusFilter || '', date: dateFilter || '' });
      console.log('Loading appointments for service:', svc.name, 'with filters:', { status: statusFilter, date: dateFilter });
      const res = await fetch(`${API_URLS.ADMIN_APPOINTMENTS}?${qs.toString()}`, { headers: { ...tenantHeaders } });
      console.log('Response status:', res.status);
      if (!res.ok) throw new Error(`Failed to load appointments (${res.status})`);
      const data = await res.json();
      console.log('Appointments data:', data);
      
      // Filter appointments by role if not Super Admin
      let filteredData = data;
      if (!isSuperAdmin && currentUserRoleId) {
        filteredData = data.filter((apt: AppointmentRow) => {
          if (!apt.service_name) return false;
          const service = services.find(s => s.id === svc.id || s.name === apt.service_name);
          return service && service.role_id === currentUserRoleId;
        });
      }
      
      // Sort to show: Last edit/activity on top (doesn't matter if update, book, or cancel)
      filteredData.sort((a: AppointmentRow, b: AppointmentRow) => {
        // Get the most recent activity timestamp for each appointment
        // Priority: updated_at > latest history > created_at
        
        const getLatestActivity = (apt: AppointmentRow): number => {
          // 1. Check updated_at (most recent edit)
          if (apt.updated_at) {
            return new Date(apt.updated_at).getTime();
          }
          // 2. Check latest history entry
          if (apt.history && apt.history.length > 0) {
            const latestHistory = apt.history[apt.history.length - 1];
            if (latestHistory.timestamp) {
              return new Date(latestHistory.timestamp).getTime();
            }
          }
          // 3. Fallback to created_at (original booking)
          if (apt.created_at) {
            return new Date(apt.created_at).getTime();
          }
          return 0;
        };
        
        const aLatest = getLatestActivity(a);
        const bLatest = getLatestActivity(b);
        
        // Sort by most recent activity first
        if (aLatest !== bLatest) {
          return bLatest - aLatest; // Descending (newest first)
        }
        
        // Fallback to date and time if activity timestamps are equal
        if (a.date !== b.date) {
          return b.date.localeCompare(a.date); // Descending (newest first)
        }
        if (a.time && b.time) {
          return b.time.localeCompare(a.time); // Descending (latest first)
        }
        return 0;
      });
      
      setAppointments(filteredData);
    } catch (e: unknown) {
      const error = e as Error;
      console.error('Error loading appointments:', e);
      alert(error.message || 'Failed to load appointments');
    } finally {
      setApptLoading(false);
    }
  }, [statusFilter, dateFilter, tenantHeaders, isSuperAdmin, currentUserRoleId, services]);

  const loadAllAppointments = useCallback(async (customStatusFilter?: string, customDateFilter?: string) => {
    try {
      setSelectedService(null);
      setApptLoading(true);
      
      const currentStatusFilter = customStatusFilter !== undefined ? customStatusFilter : statusFilter;
      const currentDateFilter = customDateFilter !== undefined ? customDateFilter : dateFilter;
      
      console.log('Loading appointments with filter:', { status: currentStatusFilter, date: currentDateFilter });
      
      // Build query parameters
      const params = new URLSearchParams();
      if (currentStatusFilter) params.append('status', currentStatusFilter);
      if (currentDateFilter) params.append('date', currentDateFilter);
      
      const url = `${API_URLS.ADMIN_APPOINTMENTS}${params.toString() ? '?' + params.toString() : ''}`;
      console.log('Fetching from URL:', url);
      
      const res = await fetch(url, { headers: { ...tenantHeaders } });
      console.log('Response status:', res.status);
      if (!res.ok) throw new Error(`Failed to load appointments (${res.status})`);
      const data = await res.json();
      console.log('Appointments data:', data);
      
      // Filter appointments by role if not Super Admin
      let filteredData = data;
      if (!isSuperAdmin && currentUserRoleId) {
        filteredData = data.filter((apt: AppointmentRow) => {
          if (!apt.service_name) return false;
          const service = services.find(s => s.name === apt.service_name);
          return service && service.role_id === currentUserRoleId;
        });
      }
      
      // Sort to show: Last edit/activity on top (doesn't matter if update, book, or cancel)
      filteredData.sort((a: AppointmentRow, b: AppointmentRow) => {
        // Get the most recent activity timestamp for each appointment
        // Priority: updated_at > latest history > created_at
        
        const getLatestActivity = (apt: AppointmentRow): number => {
          // 1. Check updated_at (most recent edit)
          if (apt.updated_at) {
            return new Date(apt.updated_at).getTime();
          }
          // 2. Check latest history entry
          if (apt.history && apt.history.length > 0) {
            const latestHistory = apt.history[apt.history.length - 1];
            if (latestHistory.timestamp) {
              return new Date(latestHistory.timestamp).getTime();
            }
          }
          // 3. Fallback to created_at (original booking)
          if (apt.created_at) {
            return new Date(apt.created_at).getTime();
          }
          return 0;
        };
        
        const aLatest = getLatestActivity(a);
        const bLatest = getLatestActivity(b);
        
        // Sort by most recent activity first
        if (aLatest !== bLatest) {
          return bLatest - aLatest; // Descending (newest first)
        }
        
        // Fallback to date and time if activity timestamps are equal
        if (a.date !== b.date) {
          return b.date.localeCompare(a.date); // Descending (newest first)
        }
        if (a.time && b.time) {
          return b.time.localeCompare(a.time); // Descending (latest first)
        }
        return 0;
      });
      
      setAppointments(filteredData);
    } catch (e: unknown) {
      const error = e as Error;
      console.error('Error loading appointments:', e);
      alert(error.message || 'Failed to load appointments');
    } finally {
      setApptLoading(false);
    }
  }, [statusFilter, dateFilter, tenantHeaders, isSuperAdmin, currentUserRoleId, services]);

  // Auto-refresh appointments every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeTab === 'appointments') {
        if (selectedService) {
          loadAppointments(selectedService);
        } else {
          loadAllAppointments();
        }
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [activeTab, selectedService, loadAllAppointments, loadAppointments]);

  const refreshServices = async () => {
    try {
      setLoading(true);
      const res = await fetch(API_URLS.ADMIN_SERVICES, { headers: { ...tenantHeaders } });
      if (!res.ok) throw new Error(`Failed to load services (${res.status})`);
      const data = await res.json();
      // Ensure role_id is preserved in service data
      const servicesWithRole = data.map((service: ServiceRow) => ({
        ...service,
        role_id: service.role_id || undefined,
      }));
      setServices(servicesWithRole);
    } catch (e: unknown) {
      const error = e as Error;
      setError(error.message || 'Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  const createService = async () => {
    try {
      if (!newService.role_id) {
        alert('Please select a role for this service');
        return;
      }
      const res = await fetch(API_URLS.ADMIN_SERVICES, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders(), ...tenantHeaders },
        body: JSON.stringify({
          name: newService.name,
          description: newService.description,
          duration: newService.duration,
          role_id: newService.role_id,
          user_id: newService.user_id || null, // Optional user assignment
          active: newService.active !== false, // Default to true
        }),
      });
      if (!res.ok) throw new Error(`Create failed (${res.status})`);
      setNewService({ name: '', description: '', duration: 60, role_id: '', user_id: '', active: true });
      await refreshServices();
    } catch (e: unknown) {
      const error = e as Error;
      alert(error.message || 'Create failed');
    }
  };

  const updateService = async () => {
    if (!editService) return;
    
    // Validate required fields
    if (!editService.name || editService.name.trim() === '') {
      alert('Service name is required');
      return;
    }
    if (!editService.description || editService.description.trim() === '') {
      alert('Service description is required');
      return;
    }
    
    try {
      // Extract email from selected user if user_id is provided
      const selectedUserId = (editService as { user_id?: string }).user_id;
      let emailToSave: string | null = null;
      
      if (selectedUserId) {
        // Find the selected user in editRoleUsers to get their email
        const selectedUser = editRoleUsers.find(user => user.id === selectedUserId);
        if (selectedUser && selectedUser.email) {
          emailToSave = selectedUser.email;
        } else if (selectedUserId.includes('@')) {
          // If user_id is already an email, use it directly
          emailToSave = selectedUserId.split(' (')[0].trim();
        }
      }
      
      // Ensure role_id, user_id, email and active are included in the update
      const updateData = {
        name: editService.name.trim(),
        description: editService.description.trim(),
        duration: editService.duration || 60,
        role_id: editService.role_id || null,
        user_id: selectedUserId || null, // Optional user assignment
        email: emailToSave, // Include email when user is selected
        active: editService.active !== false, // Default to true if not set
      };
      
      const res = await fetch(`${API_URLS.ADMIN_SERVICES}/${editService.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders(), ...tenantHeaders },
        body: JSON.stringify(updateData),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Update failed (${res.status})`);
      }
      
      // Get the updated service from response if available
      const updatedService = await res.json().catch(() => null);
      
      setEditService(null);
      // Refresh services to get the latest data with role_id
      await refreshServices();
      
      // Show success message
      if (updatedService) {
        console.log('Service updated successfully:', updatedService);
        alert('Service updated successfully!');
      } else {
        alert('Service updated successfully!');
      }
    } catch (e: unknown) {
      const error = e as Error;
      alert(error.message || 'Update failed');
    }
  };

  const deleteService = async (svc: ServiceRow) => {
    if (!confirm(`Delete service "${svc.name}"?`)) return;
    try {
      const res = await fetch(`${API_URLS.ADMIN_SERVICES}/${svc.id}`, { method: 'DELETE', headers: { ...getAuthHeaders(), ...tenantHeaders } });
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      if (selectedService?.id === svc.id) {
        setSelectedService(null);
        setAppointments([]);
      }
      await refreshServices();
    } catch (e: unknown) {
      const error = e as Error;
      alert(error.message || 'Delete failed');
    }
  };

  // Metrics
  async function loadMetrics() {
    try {
      const res = await fetch(API_URLS.ADMIN_METRICS_SUMMARY, { 
        headers: { ...getAuthHeaders(), ...tenantHeaders } 
      });
      if (!res.ok) throw new Error('metrics load failed');
      const data = await res.json();
      setMetrics(data);
    } catch (e: unknown) { 
      const error = e as Error;
      alert(error.message); 
    }
  }

  // Availability - filter by role
  const loadSlots = useCallback(async (serviceId: string) => {
    try {
      const qs = new URLSearchParams({ service_id: serviceId });
      const res = await fetch(`${API_URLS.AVAILABILITY_SLOTS}?${qs.toString()}`, { headers: { ...tenantHeaders } });
      if (!res.ok) throw new Error('failed to load slots');
      const data = await res.json();
      
      // Filter slots by role if not Super Admin
      let filteredSlots = data;
      if (!isSuperAdmin && currentUserRoleId) {
        const service = services.find(s => s.id === serviceId);
        if (service && service.role_id !== currentUserRoleId) {
          filteredSlots = []; // Don't show slots for services not assigned to user's role
        }
      }
      
      // Trust backend's computed 'booked' which now aggregates all sources
      setSlots(filteredSlots);
    } catch (e: unknown) { 
      const error = e as Error;
      alert(error.message); 
    }
  }, [isSuperAdmin, currentUserRoleId, services, tenantHeaders]);

  // Auto-select first service when filtered services change (for non-Super Admin users)
  useEffect(() => {
    if (filteredServices.length > 0 && !isSuperAdmin) {
      // Auto-select the first (and likely only) service for non-Super Admin users
      const firstServiceId = filteredServices[0].id;
      setNewSlot(prev => {
        // Only update if service_id is not already set or is different
        if (prev.service_id !== firstServiceId) {
          // Load slots after state update
          setTimeout(() => loadSlots(firstServiceId), 0);
          return { ...prev, service_id: firstServiceId };
        }
        return prev;
      });
    }
  }, [filteredServices, isSuperAdmin, loadSlots]); // loadSlots is memoized with useCallback

  async function createSlot() {
    try {
      // Validate fields
      if (!newSlot.service_id || !newSlot.start_utc || !newSlot.end_utc) {
        alert('Please select service, start and end datetime');
        return;
      }

      // Normalize to UTC ISO with seconds and Z for backend consistency
      const toUtcIso = (value: string) => {
        console.log('🎯 toUtcIso input:', value);
        
        // value expected "YYYY-MM-DDTHH:MM" in local time
        const [d, t] = value.split('T');
        const [yy, mm, dd] = d.split('-').map(Number);
        const [HH, MM] = (t || '00:00').split(':').map(Number);
        
        console.log('🎯 Parsed components:', { yy, mm, dd, HH, MM });
        
        // Create date in local timezone
        const dtLocal = new Date(yy, (mm - 1), dd, HH, MM, 0);
        console.log('🎯 Local date created:', dtLocal);
        console.log('🎯 Timezone offset (minutes):', dtLocal.getTimezoneOffset());
        
        // Convert to UTC by subtracting timezone offset (this is the correct way)
        const utcTime = new Date(dtLocal.getTime() - dtLocal.getTimezoneOffset() * 60000);
        console.log('🎯 UTC date created:', utcTime);
        
        const result = utcTime.toISOString().replace(/\.\d{3}Z$/, 'Z');
        console.log('🎯 Final result:', result);
        
        return result;
      };

      const startUtc = toUtcIso(newSlot.start_utc);
      const endUtc = toUtcIso(newSlot.end_utc);
      
      console.log('🎯 Debug slot creation:');
      console.log('  Original start_utc:', newSlot.start_utc);
      console.log('  Converted start_utc:', startUtc);
      console.log('  Original end_utc:', newSlot.end_utc);
      console.log('  Converted end_utc:', endUtc);

      const payload = {
        service_id: newSlot.service_id,
        start_utc: startUtc,
        end_utc: endUtc,
        capacity: newSlot.capacity || 1,
      };

      // Guard: end must be after start
      if (new Date(payload.end_utc) <= new Date(payload.start_utc)) {
        alert('End time must be after start time');
        return;
      }

      const res = await fetch(API_URLS.AVAILABILITY_SLOTS, {
        method:'POST',
        headers: { 'Content-Type':'application/json', ...tenantHeaders },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('create slot failed');
      setNewSlot({ ...newSlot, start_utc:'', end_utc:'', capacity:1 });
      if (newSlot.service_id) await loadSlots(newSlot.service_id);
    } catch (e: unknown) { 
      const error = e as Error;
      alert(error.message); 
    }
  }


  const deleteSlot = async (slotId: string) => {
    if (!confirm('Are you sure you want to delete this slot? This action cannot be undone.')) {
      return;
    }
    
    try {
      const res = await fetch(`${API_URLS.AVAILABILITY_SLOTS}/${slotId}`, { 
        method: 'DELETE', 
        headers: { ...tenantHeaders } 
      });
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      
      // Reload slots for the current service
      if (newSlot.service_id) {
        await loadSlots(newSlot.service_id);
      }
      
      alert('Slot deleted successfully');
    } catch (e: unknown) {
      const error = e as Error;
      alert(error.message || 'Delete failed');
    }
  };

  // Handler functions for appointment actions
  const handleCreateAppointmentClick = async (serviceId?: string) => {
    // If serviceId is provided, use it; otherwise, use the first available service
    let service: ServiceRow | null = null;
    
    if (serviceId) {
      service = services.find(s => s.id === serviceId) || null;
    } else if (filteredServices.length > 0) {
      // Use the first available service from filtered services
      service = filteredServices[0];
    } else if (services.length > 0) {
      // Fallback to first service if no filtered services
      service = services[0];
    }
    
    if (!service) {
      alert('No service available. Please create a service first.');
      return;
    }
    
    setSelectedServiceForAppointment(service);
    setAppointmentCustomerName('');
    setAppointmentCustomerEmail('');
    setAppointmentSource('customer');
    setAppointmentDate('');
    setAppointmentTime('');
    setAppointmentNotes('');
    setSelectedSlotId('');
    setValidationErrors({});
    setShowCreateAppointmentModal(true);
    
    // Load calendar data for the service
    await loadCalendarDataForService(service.id);
  };

  const handleEditAppointmentClick = async (appointment: AppointmentRow) => {
    // Find the service for this appointment
    const service = services.find(s => s.name === appointment.service_name);
    if (!service) {
      alert('Service not found for this appointment');
      return;
    }
    
    setEditingAppointment(appointment);
    setSelectedServiceForAppointment(service);
    setAppointmentDate(appointment.date || '');
    setAppointmentTime(appointment.time || '');
    setAppointmentNotes(appointment.reason || '');
    setAppointmentCustomerName(appointment.customer_name || appointment.display_name || appointment.user_name || '');
    setAppointmentCustomerEmail(appointment.customer_email || appointment.user_email || '');
    setEditSelectedSlotId('');
    setShowEditAppointmentModal(true);
    
    // Load calendar data for the service
    await loadEditCalendarDataForService(service.id, appointment.date);
  };

  const handleCancelAppointmentClick = (appointment: AppointmentRow) => {
    setCancellingAppointment(appointment);
    setCancelReason('');
    setShowCancelAppointmentModal(true);
  };

  // Load calendar data for create appointment
  const loadCalendarDataForService = async (serviceId: string) => {
    try {
      const res = await fetch(`${API_URLS.AVAILABILITY_SLOTS}?service_id=${encodeURIComponent(serviceId)}`, {
        headers: { ...getAuthHeaders(), ...tenantHeaders }
      });
      if (!res.ok) return;
      
      const data = await res.json();
      const byDate: Record<string, { capacity: number; booked: number }> = {};
      
      (data || []).forEach((slot: { start_utc?: string; capacity?: number; booked?: number }) => {
        const d = (slot.start_utc || '').split('T')[0];
        if (!d) return;
        if (!byDate[d]) byDate[d] = { capacity: 0, booked: 0 };
        byDate[d].capacity += Number(slot.capacity || 0);
        byDate[d].booked += Number(slot.booked || 0);
      });
      
      const av = Object.entries(byDate).map(([date, v]) => ({
        date,
        status: v.capacity <= 0 ? 'not_assigned' as const : (v.booked >= v.capacity ? 'full' as const : 'available' as const),
        slots: v.capacity - v.booked,
        capacity: v.capacity,
      }));
      
      setAvailableDates(av);
      
      // Store raw slots for time slot selection
      if (appointmentDate) {
        const dateSlots = data.filter((s: { start_utc?: string }) => (s.start_utc || '').startsWith(appointmentDate))
          .map((s: { start_utc: string; end_utc: string; id: string; capacity?: number; booked?: number }) => {
            const start = s.start_utc.split('T')[1].slice(0, 5);
            const end = s.end_utc.split('T')[1].slice(0, 5);
            const avail = Math.max(0, Number(s.capacity || 0) - Number(s.booked || 0));
            return { 
              id: s.id, 
              label: `${start} - ${end} (${avail} available)`, 
              start_utc: s.start_utc,
              available: avail 
            };
          })
          .filter((s: { available: number }) => s.available > 0);
        setTimeSlots(dateSlots);
        if (dateSlots.length > 0) {
          setSelectedSlotId(dateSlots[0].id);
        }
      }
    } catch (e) {
      console.error('Error loading calendar data:', e);
    }
  };

  // Load calendar data for edit appointment
  const loadEditCalendarDataForService = async (serviceId: string, currentDate?: string) => {
    try {
      const res = await fetch(`${API_URLS.AVAILABILITY_SLOTS}?service_id=${encodeURIComponent(serviceId)}`, {
        headers: { ...getAuthHeaders(), ...tenantHeaders }
      });
      if (!res.ok) return;
      
      const data = await res.json();
      const byDate: Record<string, { capacity: number; booked: number }> = {};
      
      (data || []).forEach((slot: { start_utc?: string; capacity?: number; booked?: number }) => {
        const d = (slot.start_utc || '').split('T')[0];
        if (!d) return;
        if (!byDate[d]) byDate[d] = { capacity: 0, booked: 0 };
        byDate[d].capacity += Number(slot.capacity || 0);
        byDate[d].booked += Number(slot.booked || 0);
      });
      
      const av = Object.entries(byDate).map(([date, v]) => ({
        date,
        status: v.capacity <= 0 ? 'not_assigned' as const : (v.booked >= v.capacity ? 'full' as const : 'available' as const),
        slots: v.capacity - v.booked,
        capacity: v.capacity,
      }));
      
      setEditAvailableDates(av);
      
      // Store raw slots for time slot selection
      const dateToUse = currentDate || appointmentDate;
      if (dateToUse) {
        const dateSlots = data.filter((s: { start_utc?: string }) => (s.start_utc || '').startsWith(dateToUse))
          .map((s: { start_utc: string; end_utc: string; id: string; capacity?: number; booked?: number }) => {
            const start = s.start_utc.split('T')[1].slice(0, 5);
            const end = s.end_utc.split('T')[1].slice(0, 5);
            const avail = Math.max(0, Number(s.capacity || 0) - Number(s.booked || 0));
            return { 
              id: s.id, 
              label: `${start} - ${end} (${avail} available)`, 
              start_utc: s.start_utc,
              available: avail 
            };
          })
          .filter((s: { available: number }) => s.available > 0);
        setEditTimeSlots(dateSlots);
        
        // Try to match current time
        if (appointmentTime && dateSlots.length > 0) {
          const matchingSlot = dateSlots.find((s: { id: string; label: string; start_utc: string; available: number }) => {
            const slotTime = s.start_utc.split('T')[1]?.slice(0, 5);
            return slotTime === appointmentTime;
          });
          if (matchingSlot) {
            setEditSelectedSlotId(matchingSlot.id);
          } else {
            setEditSelectedSlotId(dateSlots[0].id);
          }
        } else if (dateSlots.length > 0) {
          setEditSelectedSlotId(dateSlots[0].id);
        }
      }
    } catch (e) {
      console.error('Error loading edit calendar data:', e);
    }
  };

  // Handle date selection for create appointment
  const handleDateSelect = async (date: string) => {
    setAppointmentDate(date);
    setShowDatePicker(false);
    
    if (selectedServiceForAppointment) {
      // Load time slots for selected date
      const res = await fetch(`${API_URLS.AVAILABILITY_SLOTS}?service_id=${encodeURIComponent(selectedServiceForAppointment.id)}`, {
        headers: { ...getAuthHeaders(), ...tenantHeaders }
      });
      if (res.ok) {
        const data = await res.json();
        const dateSlots = data.filter((s: { start_utc?: string }) => (s.start_utc || '').startsWith(date))
          .map((s: { start_utc: string; end_utc: string; id: string; capacity?: number; booked?: number }) => {
            const start = s.start_utc.split('T')[1].slice(0, 5);
            const end = s.end_utc.split('T')[1].slice(0, 5);
            const avail = Math.max(0, Number(s.capacity || 0) - Number(s.booked || 0));
            return { 
              id: s.id, 
              label: `${start} - ${end} (${avail} available)`, 
              start_utc: s.start_utc,
              available: avail 
            };
          })
          .filter((s: { available: number }) => s.available > 0);
        setTimeSlots(dateSlots);
        if (dateSlots.length > 0) {
          setSelectedSlotId(dateSlots[0].id);
        }
      }
    }
  };

  // Handle date selection for edit appointment
  const handleEditDateSelect = async (date: string) => {
    setAppointmentDate(date);
    setShowEditDatePicker(false);
    
    if (selectedServiceForAppointment) {
      // Load time slots for selected date
      const res = await fetch(`${API_URLS.AVAILABILITY_SLOTS}?service_id=${encodeURIComponent(selectedServiceForAppointment.id)}`, {
        headers: { ...getAuthHeaders(), ...tenantHeaders }
      });
      if (res.ok) {
        const data = await res.json();
        const dateSlots = data.filter((s: { start_utc?: string }) => (s.start_utc || '').startsWith(date))
          .map((s: { start_utc: string; end_utc: string; id: string; capacity?: number; booked?: number }) => {
            const start = s.start_utc.split('T')[1].slice(0, 5);
            const end = s.end_utc.split('T')[1].slice(0, 5);
            const avail = Math.max(0, Number(s.capacity || 0) - Number(s.booked || 0));
            return { 
              id: s.id, 
              label: `${start} - ${end} (${avail} available)`, 
              start_utc: s.start_utc,
              available: avail 
            };
          })
          .filter((s: { available: number }) => s.available > 0);
        setEditTimeSlots(dateSlots);
        if (dateSlots.length > 0) {
          setEditSelectedSlotId(dateSlots[0].id);
        }
      }
    }
  };

  // Validation function
  const validateAppointmentForm = (): boolean => {
    const errors: { customerName?: string; customerEmail?: string } = {};
    
    // Validate customer name
    if (!appointmentCustomerName || appointmentCustomerName.trim().length === 0) {
      errors.customerName = 'Customer name is required';
    } else if (!nameRegex.test(appointmentCustomerName.trim())) {
      errors.customerName = 'Customer name must be 2-50 characters and contain only letters, spaces, hyphens, or apostrophes';
    }
    
    // Validate customer email
    if (!appointmentCustomerEmail || appointmentCustomerEmail.trim().length === 0) {
      errors.customerEmail = 'Customer email is required';
    } else if (!emailRegex.test(appointmentCustomerEmail.trim())) {
      errors.customerEmail = 'Please enter a valid email address';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Create appointment function
  const submitCreateAppointment = async () => {
    // Validate form
    if (!validateAppointmentForm()) {
      return;
    }
    
    if (!selectedServiceForAppointment || !appointmentDate || !selectedSlotId) {
      alert('Please fill in all required fields');
      return;
    }
    
    try {
      setIsSubmitting(true);
      const slot = timeSlots.find(s => s.id === selectedSlotId);
      if (!slot) {
        alert('Selected time slot not found');
        return;
      }
      
      const time = slot.start_utc.split('T')[1]?.slice(0, 5) || '';
      
      // Use existing generic appointment creation endpoint
      const res = await fetch(API_URLS.APPOINTMENTS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders(), ...tenantHeaders },
        body: JSON.stringify({
          lead_id: '', // Not required for admin-created appointments
          service_id: selectedServiceForAppointment.id,
          service_name: selectedServiceForAppointment.name,
          customer_name: appointmentCustomerName.trim(),
          customer_email: appointmentCustomerEmail.trim(),
          date: appointmentDate,
          time: time,
          notes: appointmentNotes || '',
          reason: appointmentNotes || '',
          status: 'confirmed',
          booked_by: 'appointment',
          source: appointmentSource,
          source_id: appointmentCustomerEmail,
          source_name: appointmentCustomerName,
          type: 'create',
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Create failed (${res.status})`);
      }
      
      setShowCreateAppointmentModal(false);
      await loadAllAppointments();
      alert('Appointment created successfully');
    } catch (e: unknown) {
      const error = e as Error;
      alert(error.message || 'Create appointment failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update appointment function
  const submitUpdateAppointment = async () => {
    if (!editingAppointment || !appointmentDate || !editSelectedSlotId) {
      alert('Please fill in all required fields');
      return;
    }
    
    try {
      setIsSubmitting(true);
      const slot = editTimeSlots.find(s => s.id === editSelectedSlotId);
      if (!slot) {
        alert('Selected time slot not found');
        return;
      }
      
      const time = slot.start_utc.split('T')[1]?.slice(0, 5) || '';
      
      // Use existing reschedule endpoint
      const res = await fetch(`${API_URLS.LEAD_RESCHEDULE}/${editingAppointment.id}/reschedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders(), ...tenantHeaders },
        body: JSON.stringify({
          new_date: appointmentDate,
          new_time: time,
          reason: appointmentNotes || 'Updated by admin',
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Update failed (${res.status})`);
      }
      
      setShowEditAppointmentModal(false);
      setEditingAppointment(null);
      await loadAllAppointments();
      alert('Appointment updated successfully');
    } catch (e: unknown) {
      const error = e as Error;
      alert(error.message || 'Update appointment failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancel appointment function
  const submitCancelAppointment = async () => {
    if (!cancellingAppointment || !cancelReason.trim()) {
      alert('Please provide a reason for cancellation');
      return;
    }
    
    try {
      setIsSubmitting(true);
      // Use existing cancel endpoint
      const res = await fetch(`${API_URLS.LEAD_CANCEL}/${cancellingAppointment.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders(), ...tenantHeaders },
        body: JSON.stringify({
          reason: cancelReason,
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Cancel failed (${res.status})`);
      }
      
      setShowCancelAppointmentModal(false);
      setCancellingAppointment(null);
      setCancelReason('');
      await loadAllAppointments();
      alert('Appointment cancelled successfully');
    } catch (e: unknown) {
      const error = e as Error;
      alert(error.message || 'Cancel appointment failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <style dangerouslySetInnerHTML={{ __html: `
        input[type="date"] {
          position: relative;
        }
        input[type="date"]::-webkit-calendar-picker-indicator {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          width: auto;
          height: auto;
          color: transparent;
          background: transparent;
          cursor: pointer;
        }
        input[type="date"]::-webkit-datetime-edit-text {
          color: #6b7280;
        }
        input[type="date"]::-webkit-datetime-edit-month-field,
        input[type="date"]::-webkit-datetime-edit-day-field,
        input[type="date"]::-webkit-datetime-edit-year-field {
          color: #111827;
        }
        input[type="date"]::-webkit-datetime-edit-month-field:focus,
        input[type="date"]::-webkit-datetime-edit-day-field:focus,
        input[type="date"]::-webkit-datetime-edit-year-field:focus {
          background-color: #dbeafe;
          outline: none;
        }
      ` }} />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8" style={{ maxWidth: '1600px' }}>
        {/* Dashboard Header */}
        <div className="mb-8">
          <DashboardHeader
            title="Appointment Management"
            subtitle="Manage departments and approve appointments"
            icon={Calendar}
            variant="hero"
            size="lg"
            breadcrumbs={[
              { label: 'Home', href: '/' },
              { label: 'Appointment Management' }
            ]}
          />
        </div>
        
        {/* Professional Navigation Tabs */}
          <div className="mt-6 flex flex-wrap gap-2">
            <button
              className={`group relative px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                activeTab==='services' 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-gray-500 hover:text-blue-700 dark:hover:text-white border border-gray-300 dark:border-gray-500'
              }`}
              onClick={() => setActiveTab('services')}
            >
              <span className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span>Departments / Services</span>
              </span>
            </button>
            <button
              className={`group relative px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                activeTab==='appointments' 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-gray-500 hover:text-blue-700 dark:hover:text-white border border-gray-300 dark:border-gray-500'
              }`}
              onClick={async () => { setActiveTab('appointments'); await loadAllAppointments(); }}
            >
              <span className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Appointments</span>
              </span>
            </button>
            <button
              className={`group relative px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                activeTab==='availability' 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-gray-500 hover:text-blue-700 dark:hover:text-white border border-gray-300 dark:border-gray-500'
              }`}
              onClick={() => setActiveTab('availability')}
            >
              <span className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Availability</span>
              </span>
            </button>
            <button
              className={`group relative px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                activeTab==='metrics' 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-gray-500 hover:text-blue-700 dark:hover:text-white border border-gray-300 dark:border-gray-500'
              }`}
              onClick={() => { setActiveTab('metrics'); loadMetrics(); }}
            >
              <span className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>Metrics</span>
              </span>
            </button>
          </div>

        {/* Professional Services Section */}
        {activeTab === 'services' && (
        <div className="mb-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 min-h-[520px]">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Departments / Services</h2>
              <p className="text-gray-600 dark:text-gray-300 mt-2 text-lg">Manage your service offerings and departments</p>
            </div>
            {loading && (
              <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                <span>Loading...</span>
              </div>
            )}
          </div>
          
          {error && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-300 px-6 py-4 rounded-2xl mb-6 shadow-sm">
              <div className="flex items-center space-x-2">
                <span className="text-lg">⚠️</span>
                <span className="font-medium">{error}</span>
              </div>
            </div>
          )}
          
          {/* Professional Create Service Form - Only visible to Super Admin */}
          {isSuperAdmin && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Add New Service</h3>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Service Name</label>
                <input 
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200" 
                  placeholder="Enter service name" 
                  value={newService.name} 
                  onChange={(e)=>setNewService({...newService, name: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                <input 
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200" 
                  placeholder="Service description" 
                  value={newService.description} 
                  onChange={(e)=>setNewService({...newService, description: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Assign Role</label>
                <select
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  value={newService.role_id}
                  onChange={(e) => {
                    setNewService({...newService, role_id: e.target.value, user_id: ''}); // Clear user when role changes
                  }}
                  required
                >
                  <option value="">Select a role</option>
                  {availableRoles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {(role as { role_name?: string }).role_name || role.name}
                      {role.description ? ` - ${role.description}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Assign User <span className="text-xs text-gray-500">(Optional)</span>
                </label>
                <select
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  value={newService.user_id}
                  onChange={(e) => setNewService({...newService, user_id: e.target.value})}
                  disabled={!newService.role_id || loadingRoleUsers}
                >
                  <option value="">Select a user (optional)</option>
                  {loadingRoleUsers ? (
                    <option value="">Loading users...</option>
                  ) : roleUsers.length > 0 ? (
                    roleUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </option>
                    ))
                  ) : newService.role_id ? (
                    <option value="">No users found for this role</option>
                  ) : null}
                </select>
              </div>
            </div>
            <div className="mt-4 grid gap-6 sm:grid-cols-2 md:grid-cols-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Duration (minutes)</label>
                <input 
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200" 
                  placeholder="60" 
                  type="number" 
                  value={newService.duration} 
                  onChange={(e)=>setNewService({...newService, duration: Number(e.target.value)})} 
                />
              </div>
            </div>
            <div className="mt-4 flex items-center space-x-3">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newService.active !== false}
                  onChange={(e) => setNewService({...newService, active: e.target.checked})}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active Service</span>
              </label>
            </div>
            <div className="mt-6">
              <button 
                className="group relative px-6 py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-all duration-200 hover:shadow-lg shadow-md flex items-center space-x-2" 
                onClick={createService}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Create Service</span>
              </button>
            </div>
          </div>
          )}

          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            {filteredServices.map((s) => (
              <div key={s.id} className="group bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-all duration-200">
                <div className="flex items-start justify-between mb-6">
                  {editService?.id === s.id ? (
                    <div className="flex-1 pr-3 space-y-3">
                      <input 
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2 text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200" 
                        placeholder="Enter service name"
                        value={editService.name} 
                        onChange={(e)=>setEditService({...editService, name: e.target.value})} 
                        required
                      />
                      <input 
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2 text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200" 
                        placeholder="Enter service description"
                        value={editService.description || ''} 
                        onChange={(e)=>setEditService({...editService, description: e.target.value})} 
                        required
                      />
                      <select
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2 text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                        value={editService.role_id || ''}
                        onChange={(e) => setEditService({...editService, role_id: e.target.value, user_id: '', email: ''})}
                      >
                        <option value="">Select a role</option>
                        {availableRoles.map((role) => (
                          <option key={role.id} value={role.id}>
                            {(role as { role_name?: string }).role_name || role.name}
                          </option>
                        ))}
                      </select>
                      {editService.role_id && (
                        <div className="relative">
                          <select
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2 pr-20 text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            value={(editService as { user_id?: string }).user_id || ''}
                            onChange={(e) => {
                              const selectedUserId = e.target.value;
                              if (selectedUserId) {
                                // Find the selected user to get their email
                                const selectedUser = editRoleUsers.find(user => user.id === selectedUserId);
                                const emailToSet = selectedUser?.email || (selectedUserId.includes('@') ? selectedUserId.split(' (')[0].trim() : null);
                                setEditService({...editService, user_id: selectedUserId, email: emailToSet || ''} as ServiceRow);
                              } else {
                                // Clear user and email when deselected
                                setEditService({...editService, user_id: '', email: ''} as ServiceRow);
                              }
                            }}
                            disabled={loadingEditRoleUsers}
                          >
                            <option value="">Select a user (optional)</option>
                            {loadingEditRoleUsers ? (
                              <option value="">Loading users...</option>
                            ) : editRoleUsers.length > 0 ? (
                              editRoleUsers.map((user) => (
                                <option key={user.id} value={user.id}>
                                  {user.name} ({user.email})
                                </option>
                              ))
                            ) : (
                              <option value="">No users found for this role</option>
                            )}
                          </select>
                          {/* Integrated email display - shows email inline when user is selected */}
                          {editService.email && (
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700">
                              <svg className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              <span className="text-xs font-medium text-gray-700 dark:text-gray-300 max-w-[120px] truncate">{editService.email}</span>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={editService.active !== false}
                          onChange={(e) => setEditService({...editService, active: e.target.checked})}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          id={`active-${editService.id}`}
                        />
                        <label htmlFor={`active-${editService.id}`} className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                          Active Service
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{s.name}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-300 mb-3">{s.description || 'No description provided'}</div>
                      <div className="flex items-center space-x-2 mb-2">
                        <svg className="w-4 h-4 text-gray-400 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{s.duration || 60} minutes</span>
                      </div>
                      {s.role_id && (
                        <div className="flex items-center space-x-2 mt-2">
                          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                          <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                            Assigned to: {availableRoles.find(r => r.id === s.role_id) ? ((availableRoles.find(r => r.id === s.role_id) as { role_name?: string }).role_name || availableRoles.find(r => r.id === s.role_id)?.name || 'Unknown Role') : 'Unknown Role'}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <div className="text-xs font-medium text-blue-600 mb-1">Today</div>
                    <div className="text-2xl font-bold text-blue-900">{s.counts.today}</div>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <div className="text-xs font-medium text-blue-600 mb-1">Confirmed</div>
                    <div className="text-2xl font-bold text-blue-900">{s.counts.confirmed}</div>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button
                    className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-all duration-200 shadow-sm flex items-center justify-center space-x-2"
                    onClick={() => loadAppointments(s)}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <span>View</span>
                  </button>
                  {isSuperAdmin && (
                    <>
                      {editService?.id === s.id ? (
                        <button 
                          className="px-4 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-all duration-200 shadow-sm flex items-center space-x-1" 
                          onClick={updateService}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Save</span>
                        </button>
                      ) : (
                        <button 
                          className="px-4 py-3 rounded-xl bg-gray-500 text-white text-sm font-semibold hover:bg-gray-600 transition-all duration-200 shadow-sm flex items-center space-x-1" 
                          onClick={()=>setEditService({...s, role_id: s.role_id || '', user_id: '', email: s.email || ''})}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          <span>Edit</span>
                        </button>
                      )}
                      <button 
                        className="px-4 py-3 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-all duration-200 shadow-sm flex items-center space-x-1" 
                        onClick={()=>deleteService(s)}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span>Delete</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
          {filteredServices.length === 0 && !loading && !error && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 text-gray-600 dark:text-gray-300">
              {isSuperAdmin 
                ? 'No services found.' 
                : `No services assigned to your role (${currentUserRole || 'Unknown'}). Contact an administrator to assign services to your role.`
              }
            </div>
          )}
        </div>
        )}

        {/* Professional Appointments Section */}
        {activeTab === 'appointments' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 min-h-[520px]">
          {/* Professional Header + Filters */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {selectedService ? `Appointments — ${selectedService.name}` : 'All Appointments'}
                </h2>
                <p className="text-gray-600 dark:text-gray-300 mt-2 text-lg">Manage and approve appointment requests</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleCreateAppointmentClick()}
                  className="group relative px-6 py-3 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 transition-all duration-200 shadow-sm flex items-center space-x-2"
                  title="Create New Appointment"
                >
                  <FaCalendarAlt className="w-4 h-4" />
                  <span>Create Appointment</span>
                </button>
                {apptLoading && (
                  <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                    <span>Loading...</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200 shadow-sm">
              <div className="flex flex-wrap items-center gap-6">
                {/* Date Filter */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Date</span>
                  </div>
                  <div className="relative">
                    <input
                      type="date"
                      className="border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2 pr-10 text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 w-full min-w-[150px] cursor-pointer"
                      value={dateFilter}
                      onChange={(e)=> setDateFilter(e.target.value)}
                      onClick={(e) => {
                        if (e.currentTarget.showPicker) {
                          e.currentTarget.showPicker();
                        } else {
                          e.currentTarget.focus();
                        }
                      }}
                      title="Filter by date"
                      placeholder="dd/mm/yyyy"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Status Filter Pills */}
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700">Status:</span>
                  <div className="flex items-center gap-2">
                    {[
                      {key: '', label: 'All', icon: 'M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'},
                      {key: 'confirmed', label: 'Confirmed', icon: 'M5 13l4 4L19 7'},
                      {key: 'cancelled', label: 'Cancelled', icon: 'M6 18L18 6M6 6l12 12'},
                    ].map((opt) => (
                      <button
                        key={opt.key}
                        className={`group relative px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                          statusFilter===opt.key
                            ? 'bg-blue-600 text-white shadow-lg'
                            : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-500 hover:bg-blue-50 dark:hover:bg-gray-500 hover:text-blue-700 dark:hover:text-white'
                        }`}
                        onClick={async ()=> { 
                          setStatusFilter(opt.key);
                          if (selectedService) {
                            await loadAppointments(selectedService);
                          } else {
                            await loadAllAppointments(opt.key, dateFilter);
                          }
                        }}
                        title={`Filter: ${opt.label}`}
                      >
                        <span className="flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={opt.icon} />
                          </svg>
                          <span>{opt.label}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="ml-auto flex items-center gap-3">
                  <button
                    className="group relative px-6 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-sm flex items-center space-x-2"
                    onClick={() => selectedService ? loadAppointments(selectedService) : loadAllAppointments()}
                    title="Refresh appointments"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Refresh</span>
                  </button>
                  <button
                    className="group relative px-6 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-sm flex items-center space-x-2"
                    onClick={() => selectedService ? loadAppointments(selectedService) : loadAllAppointments()}
                    title="Apply current filters"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span>Apply</span>
                  </button>
                  <button
                    className="group relative px-6 py-2 bg-gray-500 text-white text-sm font-semibold rounded-xl hover:bg-gray-600 transition-all duration-200 shadow-sm flex items-center space-x-2"
                    onClick={async () => { 
                      setStatusFilter(''); 
                      setDateFilter(''); 
                      await loadAllAppointments('', '');
                    }}
                    title="Clear filters"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span>Clear</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          {/* Professional Appointments Table */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr className="text-left text-gray-600 dark:text-gray-300">
                    <th className="px-6 py-4 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Service</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Time</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Booked By</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Source</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">History</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Reason</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {appointments.map((a, idx) => (
                    <tr key={a.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 ${idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/50 dark:bg-gray-700/50'}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-mono text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-lg inline-block">
                          {a.reference_id || a.id.slice(-6)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {a.display_name || a.customer_name || a.user_name || a.source_name || '-'}
                        </div>
                        {(a.customer_email || a.user_email || a.source_id) && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {a.customer_email || a.user_email || (a.source_id ? `ID: ${a.source_id.slice(-6)}` : '')}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{a.service_name || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">{a.date}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">{a.time}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                          a.status === 'confirmed' 
                            ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                            : a.status === 'cancelled' 
                            ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                            : 'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}>
                          {a.status === 'confirmed' && '✔ '}
                          {a.status === 'cancelled' && '✖ '}
                          {a.status}
                        </span>
                      </td>
                      {/* Booked By Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {a.booked_by ? (
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                              a.booked_by === 'job' 
                                ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                                : a.booked_by === 'leads' 
                                ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                                : a.booked_by === 'customer' 
                                ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                                : a.booked_by === 'employee' 
                                ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                                : 'bg-blue-100 text-blue-800 border border-blue-200'
                            }`}>
                              {a.booked_by === 'job' && '💼 '}
                              {a.booked_by === 'leads' && '🎯 '}
                              {a.booked_by === 'customer' && '👤 '}
                              {a.booked_by === 'employee' && '👨‍💼 '}
                              {a.booked_by?.charAt(0).toUpperCase() + a.booked_by?.slice(1)}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </div>
                      </td>
                      {/* Source Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {a.source ? (
                            <div>
                              <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                                a.source === 'customer' 
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                                  : a.source === 'lead' 
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                                  : a.source === 'chat' 
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                                  : 'bg-blue-100 text-blue-800 border border-blue-200'
                              }`}>
                                {a.source === 'customer' && '👤 '}
                                {a.source === 'lead' && '🎯 '}
                                {a.source === 'chat' && '💬 '}
                                {a.source?.charAt(0).toUpperCase() + a.source?.slice(1)}
                              </span>
                              {a.source_id && (
                                <div className="text-xs text-gray-500 font-mono mt-1">ID: {a.source_id.slice(-6)}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </div>
                      </td>
                      {/* History Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {a.history && a.history.length > 0 ? (
                            <div className="relative group">
                              <button className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {a.history.length} entries
                              </button>
                              {/* History Tooltip */}
                              <div className="absolute left-0 top-full mt-1 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                                <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">History</div>
                                <div className="space-y-2 max-h-32 overflow-y-auto">
                                  {a.history.slice(0, 3).map((h, idx) => (
                                    <div key={idx} className="text-xs">
                                      <div className="font-medium text-gray-900 dark:text-white">{h.action}</div>
                                      <div className="text-gray-500 dark:text-gray-400">{h.user} • {new Date(h.timestamp).toLocaleString()}</div>
                                      {h.details && (
                                        <div className="text-gray-600 dark:text-gray-300 mt-1">{h.details}</div>
                                      )}
                                    </div>
                                  ))}
                                  {a.history.length > 3 && (
                                    <div className="text-xs text-gray-500 italic">+{a.history.length - 3} more...</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {(() => {
                          const typeValue = a.type || 'create';
                          const label = typeValue;
                          const color = typeValue.startsWith('update') 
                            ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                            : typeValue === 'create' 
                            ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                            : typeValue === 'cancel' 
                            ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                            : 'bg-blue-100 text-blue-800 border border-blue-200';
                          return (
                            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${color}`}>
                              {typeValue === 'create' && '🆕 '}
                              {typeValue.startsWith('update') && '🔄 '}
                              {typeValue === 'cancel' && '❌ '}
                              {label}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-white max-w-xs truncate" title={a.reason || '-'}>
                          {a.reason || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditAppointmentClick(a)}
                            className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                            title="Update Appointment"
                          >
                            <FaEdit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleCancelAppointmentClick(a)}
                            className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Cancel Appointment"
                          >
                            <FaTrash className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {appointments.length === 0 && !apptLoading && (
                    <tr>
                      <td className="px-6 py-12 text-center text-gray-500" colSpan={12}>
                        <div className="flex flex-col items-center space-y-3">
                          <div className="text-4xl">📅</div>
                          <div className="text-lg font-medium">
                            {selectedService 
                              ? `No appointments found for ${selectedService.name}`
                              : 'No appointments found'
                            }
                          </div>
                          <div className="text-sm text-gray-400">
                            Try adjusting your filters or select a different service
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        )}

        {/* Professional Availability Management */}
        {activeTab === 'availability' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 min-h-[520px]">
          <div className="flex items-center space-x-4 mb-8">
            <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Availability & Rules</h2>
              <p className="text-gray-600 dark:text-gray-300 mt-2 text-lg">Manage service availability and time slots</p>
            </div>
          </div>
          
          {/* Professional Form */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
            <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 mb-6">
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Service</label>
                {filteredServices.length === 1 && !isSuperAdmin ? (
                  // Show as read-only field if user has only one service (non-Super Admin)
                  <div className="border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-sm bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-medium">
                    {filteredServices[0].name}
                  </div>
                ) : (
                  // Show dropdown if multiple services or Super Admin
                  <select 
                    className="border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200" 
                    value={newSlot.service_id} 
                    onChange={(e)=>{ 
                      setNewSlot({...newSlot, service_id:e.target.value}); 
                      if(e.target.value) loadSlots(e.target.value); 
                    }}
                  >
                    <option value="">Select service</option>
                    {filteredServices.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}
                  </select>
                )}
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-2">Start Time</label>
                <DateTimePicker12h 
                  value={newSlot.start_utc} 
                  onChange={(value) => setNewSlot({...newSlot, start_utc: value})}
                  className=""
                />
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-2">End Time</label>
                <DateTimePicker12h 
                  value={newSlot.end_utc} 
                  onChange={(value) => setNewSlot({...newSlot, end_utc: value})}
                  className=""
                />
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Capacity</label>
                <input type="number" className="border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200" value={newSlot.capacity} onChange={(e)=>setNewSlot({...newSlot, capacity:Number(e.target.value||1)})} placeholder="Capacity" />
              </div>
            </div>
            <button className="px-6 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-all duration-200 shadow-sm flex items-center space-x-2" onClick={createSlot} disabled={!newSlot.service_id || !newSlot.start_utc || !newSlot.end_utc}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Create slot</span>
            </button>
          </div>

          {/* Professional Existing Slots Table */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Existing slots</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr className="text-left text-gray-600 dark:text-gray-300">
                    <th className="px-6 py-4 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Start (IST)</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">End (IST)</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Capacity</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Booked</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {slots.map((sl, idx) => (
                    <tr key={sl.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 ${idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/50 dark:bg-gray-700/50'}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{convertUTCToIST12Hour(sl.start_utc)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{convertUTCToIST12Hour(sl.end_utc)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{sl.capacity}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{sl.booked}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          className="px-3 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                          onClick={() => deleteSlot(sl.id)}
                          disabled={false}
                          title="Delete this slot"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          <span>Delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {slots.length === 0 && (
                    <tr>
                      <td className="px-6 py-12 text-center text-gray-500" colSpan={5}>
                        <div className="flex flex-col items-center space-y-3">
                          <div className="text-4xl">📅</div>
                          <div className="text-lg font-medium">No slots found</div>
                          <div className="text-sm text-gray-400">Create your first availability slot above</div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        )}

        {/* Professional Metrics Dashboard */}
        {activeTab === 'metrics' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 min-h-[520px]">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics Dashboard</h2>
                <p className="text-gray-600 dark:text-gray-300 mt-2 text-lg">Overview of appointment statistics and trends</p>
              </div>
            </div>
            <button 
              className="group relative px-6 py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-sm flex items-center gap-2" 
              onClick={loadMetrics}
            >
              <svg className="w-4 h-4 group-hover:rotate-180 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh Data</span>
            </button>
          </div>

          {/* Professional Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-300 text-sm font-medium">
                    {metrics?.role_name && !metrics?.is_super_admin 
                      ? `${metrics.role_name} Appointments` 
                      : 'Total Appointments'}
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{metrics?.total ?? '0'}</p>
                  {metrics?.role_name && !metrics?.is_super_admin && (
                    <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                      {metrics.role_name} role
                    </p>
                  )}
                </div>
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-300 text-sm font-medium">
                    {metrics?.role_name && !metrics?.is_super_admin 
                      ? `${metrics.role_name} Confirmed` 
                      : 'Confirmed'}
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{metrics?.confirmed ?? '0'}</p>
                  <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                    {metrics?.total ? `${Math.round((metrics.confirmed / metrics.total) * 100)}%` : '0%'} of total
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
            </div>


            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-300 text-sm font-medium">
                    {metrics?.role_name && !metrics?.is_super_admin 
                      ? `${metrics.role_name} Cancelled` 
                      : 'Cancelled'}
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{metrics?.cancelled ?? '0'}</p>
                  <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                    {metrics?.total ? `${Math.round((metrics.cancelled / metrics.total) * 100)}%` : '0%'} of total
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Professional Charts and Additional Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Distribution Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Status Distribution</h3>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Confirmed</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-500" 
                        style={{ width: `${metrics?.total ? (metrics.confirmed / metrics.total) * 100 : 0}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-bold text-gray-900 dark:text-white w-8 text-right">{metrics?.confirmed ?? '0'}</span>
                  </div>
                </div>
                
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Cancelled</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-500" 
                        style={{ width: `${metrics?.total ? (metrics.cancelled / metrics.total) * 100 : 0}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-bold text-gray-900 dark:text-white w-8 text-right">{metrics?.cancelled ?? '0'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Quick Stats</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Success Rate</p>
                      <p className="text-xs text-gray-600 dark:text-gray-300">Confirmed vs Total</p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-blue-600">
                    {metrics?.total ? `${Math.round((metrics.confirmed / metrics.total) * 100)}%` : '0%'}
                  </span>
                </div>


                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Cancellation Rate</p>
                      <p className="text-xs text-gray-600 dark:text-gray-300">Cancelled appointments</p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-blue-600">
                    {metrics?.total ? `${Math.round((metrics.cancelled / metrics.total) * 100)}%` : '0%'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Create Appointment Modal */}
        {showCreateAppointmentModal && selectedServiceForAppointment && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-auto">
              <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <FaCalendarAlt className="w-5 h-5 text-blue-600" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Create Appointment</h3>
                  </div>
                </div>
                <button onClick={() => setShowCreateAppointmentModal(false)} className="p-2 text-gray-400 hover:text-gray-600">
                  <FaTimes className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 grid grid-cols-1 gap-6">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Service *</label>
                    <select
                      value={selectedServiceForAppointment.id}
                      onChange={(e) => {
                        // Show all active services for Super Admin, or only role-assigned services for others
                        const availableServices = isSuperAdmin 
                          ? services.filter(s => s.active !== false)
                          : filteredServices;
                        const service = availableServices.find(s => s.id === e.target.value);
                        if (service) {
                          setSelectedServiceForAppointment(service);
                          setAppointmentDate('');
                          setSelectedSlotId('');
                          setTimeSlots([]);
                          loadCalendarDataForService(service.id);
                        }
                      }}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      {(isSuperAdmin 
                        ? services.filter(s => s.active !== false)
                        : filteredServices
                      ).map((service) => (
                        <option key={service.id} value={service.id}>
                          {service.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Customer Name *</label>
                    <input
                      type="text"
                      value={appointmentCustomerName}
                      onChange={(e) => {
                        setAppointmentCustomerName(e.target.value);
                        // Clear error when user starts typing
                        if (validationErrors.customerName) {
                          setValidationErrors({ ...validationErrors, customerName: undefined });
                        }
                      }}
                      onBlur={() => {
                        // Validate on blur
                        if (appointmentCustomerName && !nameRegex.test(appointmentCustomerName.trim())) {
                          setValidationErrors({ ...validationErrors, customerName: 'Customer name must be 2-50 characters and contain only letters, spaces, hyphens, or apostrophes' });
                        }
                      }}
                      className={`w-full border rounded-xl px-4 py-3 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${
                        validationErrors.customerName 
                          ? 'border-red-500 focus:ring-red-500' 
                          : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
                      }`}
                      placeholder="Enter customer name (2-50 characters)"
                      required
                    />
                    {validationErrors.customerName && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">{validationErrors.customerName}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Customer Email *</label>
                    <input
                      type="email"
                      value={appointmentCustomerEmail}
                      onChange={(e) => {
                        setAppointmentCustomerEmail(e.target.value);
                        // Clear error when user starts typing
                        if (validationErrors.customerEmail) {
                          setValidationErrors({ ...validationErrors, customerEmail: undefined });
                        }
                      }}
                      onBlur={() => {
                        // Validate on blur
                        if (appointmentCustomerEmail && !emailRegex.test(appointmentCustomerEmail.trim())) {
                          setValidationErrors({ ...validationErrors, customerEmail: 'Please enter a valid email address' });
                        }
                      }}
                      className={`w-full border rounded-xl px-4 py-3 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${
                        validationErrors.customerEmail 
                          ? 'border-red-500 focus:ring-red-500' 
                          : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
                      }`}
                      placeholder="Enter customer email (e.g., example@domain.com)"
                      required
                    />
                    {validationErrors.customerEmail && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">{validationErrors.customerEmail}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Source *</label>
                    <select
                      value={appointmentSource}
                      onChange={(e) => setAppointmentSource(e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      {APPOINTMENT_SOURCE_TYPES.map((source) => (
                        <option key={source.value} value={source.value}>
                          {source.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Select Date *</label>
                    <input
                      readOnly
                      value={appointmentDate || ''}
                      placeholder="Click to select date"
                      onClick={() => setShowDatePicker(!showDatePicker)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {showDatePicker && (
                      <div className="mt-2">
                        <VisualCalendar
                          onDateSelect={handleDateSelect}
                          availableDates={availableDates}
                          selectedDate={appointmentDate}
                          serviceName={selectedServiceForAppointment.name}
                          compact={true}
                        />
                      </div>
                    )}
                  </div>

                  {appointmentDate && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Available Time Slots *</label>
                      <select
                        value={selectedSlotId}
                        onChange={(e) => setSelectedSlotId(e.target.value)}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select a time slot</option>
                        {timeSlots.map(s => (
                          <option key={s.id} value={s.id}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Additional Notes</label>
                    <textarea
                      value={appointmentNotes}
                      onChange={(e) => setAppointmentNotes(e.target.value)}
                      rows={3}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Any specific requirements or questions..."
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={submitCreateAppointment}
                    disabled={!appointmentDate || !selectedSlotId || !appointmentCustomerName || !appointmentCustomerEmail || isSubmitting || !!validationErrors.customerName || !!validationErrors.customerEmail}
                    className={`flex-1 px-4 py-3 rounded-xl text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed ${
                      isSubmitting ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {isSubmitting ? 'Creating...' : 'Create Appointment'}
                  </button>
                  <button
                    onClick={() => setShowCreateAppointmentModal(false)}
                    className="px-4 py-3 rounded-xl bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-300 dark:hover:bg-gray-500"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Appointment Modal */}
        {showEditAppointmentModal && editingAppointment && selectedServiceForAppointment && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-auto">
              <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <FaCalendarAlt className="w-5 h-5 text-blue-600" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Appointment</h3>
                    <p className="text-xs text-gray-500">Service: {selectedServiceForAppointment.name}</p>
                  </div>
                </div>
                <button onClick={() => setShowEditAppointmentModal(false)} className="p-2 text-gray-400 hover:text-gray-600">
                  <FaTimes className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 grid grid-cols-1 gap-6">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Service</label>
                    <div className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white">
                      {selectedServiceForAppointment.name}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Customer Name</label>
                    <div className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white">
                      {editingAppointment.customer_name || editingAppointment.display_name || editingAppointment.user_name || editingAppointment.source_name || '-'}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Customer Email</label>
                    <div className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white">
                      {editingAppointment.customer_email || editingAppointment.user_email || editingAppointment.source_id || '-'}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Select Date *</label>
                    <input
                      readOnly
                      value={appointmentDate || ''}
                      placeholder="Click to select date"
                      onClick={() => setShowEditDatePicker(!showEditDatePicker)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {showEditDatePicker && (
                      <div className="mt-2">
                        <VisualCalendar
                          onDateSelect={handleEditDateSelect}
                          availableDates={editAvailableDates}
                          selectedDate={appointmentDate}
                          serviceName={selectedServiceForAppointment.name}
                          compact={true}
                        />
                      </div>
                    )}
                  </div>

                  {appointmentDate && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Available Time Slots *</label>
                      <select
                        value={editSelectedSlotId}
                        onChange={(e) => setEditSelectedSlotId(e.target.value)}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select a time slot</option>
                        {editTimeSlots.map(s => (
                          <option key={s.id} value={s.id}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Message/Notes</label>
                    <textarea
                      value={appointmentNotes}
                      onChange={(e) => setAppointmentNotes(e.target.value)}
                      rows={3}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Any additional notes..."
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={submitUpdateAppointment}
                    disabled={!appointmentDate || !editSelectedSlotId || isSubmitting}
                    className={`flex-1 px-4 py-3 rounded-xl text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed ${
                      isSubmitting ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {isSubmitting ? 'Updating...' : 'Update Appointment'}
                  </button>
                  <button
                    onClick={() => {
                      setShowEditAppointmentModal(false);
                      setEditingAppointment(null);
                    }}
                    className="px-4 py-3 rounded-xl bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-300 dark:hover:bg-gray-500"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cancel Appointment Modal */}
        {showCancelAppointmentModal && cancellingAppointment && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-auto">
              <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <FaCalendarAlt className="w-5 h-5 text-red-600" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Cancel Appointment</h3>
                    <p className="text-xs text-gray-500">Service: {cancellingAppointment.service_name}</p>
                  </div>
                </div>
                <button onClick={() => setShowCancelAppointmentModal(false)} className="p-2 text-gray-400 hover:text-gray-600">
                  <FaTimes className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 grid grid-cols-1 gap-6">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Service</label>
                    <div className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white">
                      {cancellingAppointment.service_name || 'N/A'}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Customer Name</label>
                    <div className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white">
                      {cancellingAppointment.customer_name || cancellingAppointment.display_name || cancellingAppointment.user_name || cancellingAppointment.source_name || '-'}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Customer Email</label>
                    <div className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white">
                      {cancellingAppointment.customer_email || cancellingAppointment.user_email || cancellingAppointment.source_id || '-'}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Select Date</label>
                    <div className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white">
                      {cancellingAppointment.date || 'N/A'}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Cancellation Reason *</label>
                    <textarea
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      rows={3}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Please provide a reason for cancellation..."
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={submitCancelAppointment}
                    disabled={!cancelReason.trim() || isSubmitting}
                    className={`flex-1 px-4 py-3 rounded-xl text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed ${
                      isSubmitting ? 'bg-red-400' : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {isSubmitting ? 'Cancelling...' : 'Confirm Cancellation'}
                  </button>
                  <button
                    onClick={() => {
                      setShowCancelAppointmentModal(false);
                      setCancellingAppointment(null);
                      setCancelReason('');
                    }}
                    className="px-4 py-3 rounded-xl bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-300 dark:hover:bg-gray-500"
                  >
                    Back
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
