"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";

import { useParams, useRouter } from "next/navigation";

import Alert from "@/components/ui/alert/Alert";



type Lead = {

  id: string;

  _id?: string;

  name: string;

  email: string;

  phone: string;

  source: string;

  interest: string;

  message: string;

  status: string;

  created_at: string;

  lead_metadata?: Record<string, unknown>;

  score?: number;

  // Optional fields that may be present for real-estate leads

  property_area?: string;

  lead_type?: string;

  price_range?: string;

  preferred_area_city?: string;

  listing_url?: string;

  agent?: string;

  [key: string]: unknown;

};



type ThreadMessage = {

  message_id?: string;

  sender_type: string;

  sender_name?: string;

  sender_email?: string;

  message: string;

  timestamp?: string;

  status?: string;

};



// Raw API message shape that may include additional/optional fields

type RawThreadMessage = Partial<ThreadMessage> & { created_at?: string };



type ThreadResponse = {

  lead_id: string;

  messages: ThreadMessage[];

  current_status: string;

  thread_status: string;

  last_updated: string;

  total_messages: number;

  status_history_count: number;

};

// Default status options fallback if API fails
const DEFAULT_STATUS_OPTIONS = [
  'Contacted',
  'Engaged',
  'Won',
  'Close',
  'Lost',
  'Junk',
];

export default function LeadChatPage() {

  const { id } = useParams();

  const router = useRouter();

  const [lead, setLead] = useState<Lead | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [thread, setThread] = useState<ThreadMessage[]>([]);

  const [replyText, setReplyText] = useState("");

  const replyInputRef = useRef<HTMLTextAreaElement>(null);

  const [isSending, setIsSending] = useState(false);

  const [selectedStatus, setSelectedStatus] = useState<string>('');

  const threadEndRef = useRef<HTMLDivElement | null>(null);

  // Add saving state for status updates

  const [isSavingStatus, setIsSavingStatus] = useState(false);

  // Add ref to track if status has been updated to "In Process"

  const statusUpdatedToInProcessRef = useRef<boolean>(false);



  // Alert state management

  const [alerts, setAlerts] = useState<Array<{ id: string; type: 'success' | 'error' | 'info' | 'warning'; message: string }>>([]);



  const normalizeMessage = (m: RawThreadMessage): ThreadMessage => ({

    message_id: m.message_id,

    sender_type: m.sender_type ?? '',

    sender_name: m.sender_name,

    sender_email: m.sender_email,

    message: m.message ?? '',

    timestamp: m.timestamp ?? m.created_at,

    // Default: Admin messages become Pending, others no status (hide "Open")

    status: m.status ?? (m.sender_type && String(m.sender_type).toLowerCase() === 'admin' ? 'Pending' : ''),

  });



  // Status options loaded from backend options (optionid === 3)
  // Initialize with default options as fallback
  const [statusOptions, setStatusOptions] = useState<string[]>(DEFAULT_STATUS_OPTIONS);

  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://py-mobiloitte.converiqo.ai';

    fetch(`${API_URL}/api/v1/leads/options`)
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data: Array<{ optionid?: number; list_label?: string }>) => {
        const statuses = Array.isArray(data)
          ? data
            .filter(item => Number(item.optionid) === 3 && (item.list_label ?? '').toString().trim().length > 0)
            .map(item => String(item.list_label))
          : [];

        // Use backend statuses if available, otherwise use defaults
        if (statuses.length > 0) {
          setStatusOptions(statuses);
        } else {
          // If backend returns empty array, use defaults
          setStatusOptions(DEFAULT_STATUS_OPTIONS);
        }
      })
      .catch((error) => {
        console.warn('Failed to fetch status options from backend, using defaults:', error);
        // Use default status options on error
        setStatusOptions(DEFAULT_STATUS_OPTIONS);
      });
  }, []);



  useEffect(() => {

    const fetchLead = async () => {

      setLoading(true);

      setError("");

      try {

        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://py-mobiloitte.converiqo.ai';

        // Helper function to check if a string is MongoDB ObjectId

        const isMongoObjectId = (str: string): boolean => {

          return str.length === 24 && /^[0-9a-fA-F]{24}$/i.test(str);

        };

        // Helper function to get custom ID from lead (same logic as crm-leads page)
        interface LeadWithId {
          id?: string | number;
          _id?: string;
          lead_id?: string | number;
          [key: string]: unknown;
        }
        const getLeadId = (lead: LeadWithId): string => {

          // Priority 1: Check lead.id if it's NOT a MongoDB ObjectId

          if (lead.id !== undefined && lead.id !== null) {

            const idStr = String(lead.id).trim();

            if (!isMongoObjectId(idStr) && idStr.length > 0) {

              return idStr;

            }

          }

          // Priority 2: Check lead_id field

          if (lead.lead_id !== undefined && lead.lead_id !== null) {

            const idStr = String(lead.lead_id).trim();

            if (!isMongoObjectId(idStr) && idStr.length > 0) {

              return idStr;

            }

          }

          // Priority 3: Recursive search for LD- format

          const findLdId = (obj: unknown, depth = 0): string => {

            if (depth > 3 || !obj || typeof obj !== 'object') return '';

            for (const [, value] of Object.entries(obj)) {

              if (value === null || value === undefined) continue;

              if (typeof value === 'string') {

                const strValue = value.trim();

                if (strValue.startsWith('LD-') && !isMongoObjectId(strValue)) {

                  return strValue;

                }

              } else if (typeof value === 'object' && !Array.isArray(value)) {

                const found = findLdId(value, depth + 1);

                if (found) return found;

              } else if (Array.isArray(value)) {

                for (const item of value) {

                  if (typeof item === 'string') {

                    const strValue = item.trim();

                    if (strValue.startsWith('LD-') && !isMongoObjectId(strValue)) {

                      return strValue;

                    }

                  } else if (typeof item === 'object') {

                    const found = findLdId(item, depth + 1);

                    if (found) return found;

                  }

                }

              }

            }

            return '';

          };

          const foundId = findLdId(lead);

          if (foundId) return foundId;

          // Priority 4: Check _id ONLY if it's in LD- format

          if (lead._id !== undefined && lead._id !== null) {

            const idStr = String(lead._id).trim();

            if (idStr.startsWith('LD-')) {

              return idStr;

            }

          }

          return '';

        };

        // First, try to fetch from leads-integration endpoint if ID is custom format (LD-XX)

        if (id && String(id).startsWith('LD-')) {

          try {

            const leadRes = await fetch(`${API_URL}/api/v1/leads-integration/${id}`, {

              headers: { 'accept': 'application/json' }

            });

            if (leadRes.ok) {

              const leadData = await leadRes.json();

              const foundLead = leadData?.lead || leadData?.data?.lead || leadData;

              if (foundLead) {

                // Normalize the lead ID
                // Preserve _id (MongoDB ObjectId) for API calls, use custom ID for display
                const customId = getLeadId(foundLead) || foundLead.id || foundLead._id;

                setLead({

                  ...foundLead,

                  id: customId || id,  // Custom ID for display
                  _id: foundLead._id || foundLead.id  // MongoDB ObjectId for API calls

                });

                setLoading(false);

                return;

              }

            }

          } catch (err) {

            console.warn('Failed to fetch from leads-integration:', err);

          }

        }

        // Fallback: Fetch all leads and search

        const res = await fetch(`${API_URL}/api/v1/leads/`);

        if (!res.ok) throw new Error("Failed to fetch leads");

        const data = await res.json();

        if (!Array.isArray(data)) {

          setError("Invalid data format.");

          setLoading(false);

          return;

        }

        // Normalize leads and search by custom ID
        interface LeadDataItem {
          id?: string | number;
          _id?: string;
          lead_id?: string | number;
          [key: string]: unknown;
        }
        const normalizedLeads = await Promise.all(

          data.map(async (lead: LeadDataItem) => {

            const originalId = lead.id;

            const isMongoId = originalId && String(originalId).length === 24 && /^[0-9a-fA-F]{24}$/i.test(String(originalId));

            // If id is MongoDB ObjectId, try to get custom ID from leads-integration

            if (isMongoId && originalId) {

              try {

                const customIdRes = await fetch(`${API_URL}/api/v1/leads-integration/${originalId}`, {

                  headers: { 'accept': 'application/json' }

                });

                if (customIdRes.ok) {

                  const customIdData = await customIdRes.json();

                  const customId = customIdData?.lead?.id || customIdData?.data?.lead?.id || customIdData?.id;

                  if (customId && String(customId).startsWith('LD-')) {

                    lead.id = customId;

                  }

                }

              } catch {

                // Silently continue

              }

            }

            return lead;

          })

        );

        // Search for lead by checking multiple fields

        const foundLead = normalizedLeads.find((lead: LeadDataItem) => {

          const customId = getLeadId(lead);

          // Match by custom ID

          if (customId && customId === id) return true;

          // Match by lead.id (if it's not MongoDB ObjectId)

          if (lead.id && !isMongoObjectId(String(lead.id)) && lead.id === id) return true;

          // Match by lead_id

          if (lead.lead_id && lead.lead_id === id) return true;

          // Match by _id if it's LD- format

          if (lead._id && String(lead._id).startsWith('LD-') && lead._id === id) return true;

          // Match by MongoDB ObjectId (fallback)

          if (lead._id && lead._id === id) return true;

          if (lead.id && lead.id === id) return true;

          return false;

        });

        if (foundLead) {

          // Ensure the lead has the correct custom ID
          // Preserve _id (MongoDB ObjectId) for API calls, use custom ID for display
          const idString = Array.isArray(id) ? id[0] : (id || '');
          const customId = getLeadId(foundLead) || idString;

          setLead({

            ...foundLead,

            id: customId,  // Custom ID for display
            _id: foundLead._id || (foundLead.id != null ? String(foundLead.id) : undefined)  // MongoDB ObjectId for API calls

          } as Lead);

        } else {

          setError("Lead not found.");

        }

      } catch (err) {

        console.error('Error fetching lead:', err);

        setError("Lead not found.");

      } finally {

        setLoading(false);

      }

    };

    fetchLead();

  }, [id]);



  useEffect(() => {

    if (lead && typeof lead.status === 'string') {

      setSelectedStatus(statusOptions.includes(lead.status) ? lead.status : '');

    }

  }, [lead, statusOptions]);

  // Derive extended fields from lead_metadata with safe fallbacks

  const derived = React.useMemo(() => {

    const empty = {

      interest: '',

      lead_type: '',

      property_area: '',

      price_range: '',

      preferred_area_city: '',

      listing_url: '',

      agent: '',

    };

    if (!lead) return empty;

    let meta: Record<string, unknown> = {};

    try {

      meta = typeof lead.lead_metadata === 'string' ? (JSON.parse(lead.lead_metadata) as Record<string, unknown>) : (lead.lead_metadata as Record<string, unknown> | undefined) || {};

    } catch {

      meta = lead.lead_metadata || {};

    }

    return {

      interest: (lead.interest && String(lead.interest).trim()) || String(meta?.interest || ''),

      lead_type: (lead.lead_type && String(lead.lead_type).trim()) || String(meta?.lead_type || ''),

      property_area: (lead.property_area && String(lead.property_area).trim()) || String(meta?.property_area || ''),

      price_range: (lead.price_range && String(lead.price_range).trim()) || String(meta?.price_range || ''),

      preferred_area_city: (lead.preferred_area_city && String(lead.preferred_area_city).trim()) || String(meta?.preferred_area_city || ''),

      listing_url: (lead.listing_url && String(lead.listing_url).trim()) || String(meta?.listing_url || ''),

      agent: (lead.agent && String(lead.agent).trim()) || String(meta?.agent || ''),

    };

  }, [lead]);



  const fetchThread = useCallback(async () => {

    if (!lead) return;



    try {

      // Use MongoDB ObjectId for backend API calls (thread endpoint expects MongoDB ObjectId)
      // lead.id is the custom ID (LD-XX) for display, lead._id is MongoDB ObjectId for API calls
      const mongoId = lead._id || (lead.id && String(lead.id).length === 24 && /^[0-9a-fA-F]{24}$/i.test(String(lead.id)) ? lead.id : null);

      if (!mongoId) {
        console.warn('MongoDB ObjectId not found for lead, cannot fetch thread');
        setThread([]);
        return;
      }

      console.log('Fetching thread for lead:', { customId: lead.id, mongoId });

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://py-mobiloitte.converiqo.ai';

      // Fetch thread messages for this lead using MongoDB ObjectId
      const res = await fetch(`${API_URL}/api/v1/leads/${mongoId}/thread`);

      console.log('Thread response status:', res.status);



      if (res.ok) {

        const data: ThreadResponse | ThreadMessage[] = await res.json();

        console.log('Thread data received:', data);



        // Handle both response formats: direct array or object with messages property

        if (Array.isArray(data)) {

          // Direct array format (as shown in your curl response)

          const normalized = data.map((m: RawThreadMessage) => normalizeMessage(m));

          // Preserve optimistic messages (temp messages) that haven't been confirmed yet
          setThread(prev => {
            const optimisticMessages = prev.filter(m => m.message_id && String(m.message_id).startsWith('temp-'));
            // Check if any optimistic message content matches fetched messages
            const confirmedOptimistic = optimisticMessages.filter(optMsg =>
              normalized.some(fetchedMsg =>
                fetchedMsg.message === optMsg.message &&
                fetchedMsg.sender_type === optMsg.sender_type
              )
            );
            // Keep optimistic messages that haven't been confirmed yet
            const unconfirmedOptimistic = optimisticMessages.filter(optMsg =>
              !confirmedOptimistic.some(confirmed => confirmed.message_id === optMsg.message_id)
            );
            // Merge: fetched messages + unconfirmed optimistic messages
            interface ThreadMessageWithLocalCreated extends ThreadMessage {
              local_created_at?: string;
            }
            return [...normalized, ...unconfirmedOptimistic].sort((a, b) => {
              const timeA = new Date(a.timestamp || (a as ThreadMessageWithLocalCreated).local_created_at || 0).getTime();
              const timeB = new Date(b.timestamp || (b as ThreadMessageWithLocalCreated).local_created_at || 0).getTime();
              return timeA - timeB;
            });
          });

        } else if ('messages' in data && Array.isArray(data.messages)) {

          // Object format with messages property

          const normalized = data.messages.map((m: RawThreadMessage) => normalizeMessage(m));

          // Preserve optimistic messages (temp messages) that haven't been confirmed yet
          setThread(prev => {
            const optimisticMessages = prev.filter(m => m.message_id && String(m.message_id).startsWith('temp-'));
            // Check if any optimistic message content matches fetched messages
            const confirmedOptimistic = optimisticMessages.filter(optMsg =>
              normalized.some(fetchedMsg =>
                fetchedMsg.message === optMsg.message &&
                fetchedMsg.sender_type === optMsg.sender_type
              )
            );
            // Keep optimistic messages that haven't been confirmed yet
            const unconfirmedOptimistic = optimisticMessages.filter(optMsg =>
              !confirmedOptimistic.some(confirmed => confirmed.message_id === optMsg.message_id)
            );
            // Merge: fetched messages + unconfirmed optimistic messages
            interface ThreadMessageWithLocalCreated2 extends ThreadMessage {
              local_created_at?: string;
            }
            return [...normalized, ...unconfirmedOptimistic].sort((a, b) => {
              const timeA = new Date(a.timestamp || (a as ThreadMessageWithLocalCreated2).local_created_at || 0).getTime();
              const timeB = new Date(b.timestamp || (b as ThreadMessageWithLocalCreated2).local_created_at || 0).getTime();
              return timeA - timeB;
            });
          });



          // Update lead status if it's different

          if (data.current_status && data.current_status !== lead.status) {

            setLead({ ...lead, status: data.current_status });

            if (statusOptions.includes(data.current_status)) {

              setSelectedStatus(data.current_status);

            }

          }

        } else {

          setThread([]);

        }

      } else {

        console.log('Thread API returned error status:', res.status);

        // If thread API doesn't exist, use empty array

        setThread([]);

      }

    } catch (error) {

      console.error('Error fetching thread:', error);

      // If thread API doesn't exist, use empty array

      setThread([]);

    }

  }, [lead, statusOptions]);



  useEffect(() => {

    if (lead && (lead._id || lead.id)) fetchThread();

  }, [lead, fetchThread]);



  // Alert management functions

  const showAlert = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {

    const id = Date.now().toString();

    setAlerts(prev => [...prev, { id, type, message }]);



    // Auto remove after 5 seconds

    setTimeout(() => {

      hideAlert(id);

    }, 5000);

  };



  const hideAlert = (id: string) => {

    setAlerts(prev => prev.filter(alert => alert.id !== id));

  };





  const handleReply = async () => {

    if (!replyText.trim() || !lead) return;



    try {

      setIsSending(true);

      const messageToSend = replyText;

      // Clear input immediately so it doesn't linger after delivery

      setReplyText('');

      const tempId = `temp-${Date.now()}`;

      // Optimistically append message for instant UI feedback

      setThread(prev => ([

        ...prev,

        {

          message_id: tempId,

          sender_type: 'Admin',

          message: messageToSend,

          timestamp: new Date().toISOString(),

          status: 'Pending',

        }

      ]));

      // First update status to "Pending" when admin clicks Reply
      // Use MongoDB ObjectId for backend API calls
      const mongoId = lead._id || (lead.id && String(lead.id).length === 24 && /^[0-9a-fA-F]{24}$/i.test(String(lead.id)) ? lead.id : null);
      if (!mongoId) {
        console.error('MongoDB ObjectId not found, cannot update status');
        return;
      }

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://py-mobiloitte.converiqo.ai';
      const statusResponse = await fetch(`${API_URL}/api/v1/leads/${mongoId}/status`, {

        method: 'PUT',

        headers: {

          'accept': 'application/json',

          'Content-Type': 'application/json',

        },

        body: JSON.stringify({

          status: 'Pending',

          updated_by: 'Admin',

          notes: 'Status changed to Pending when admin sent reply',

          timestamp: new Date().toISOString(),

        }),

      });



      if (statusResponse.ok) {

        const statusData = await statusResponse.json().catch(() => ({}));

        const newStatus = statusData?.new_status || 'Pending';

        setLead(prev => prev ? { ...prev, status: newStatus } : null);

        setSelectedStatus(newStatus);

        console.log('Status updated to Pending when reply sent');

      }



      // Then send the reply using the new endpoint

      const response = await fetch(`https://py-mobiloitte.converiqo.ai/customer-chat/lead-thread/start`, {

        method: 'POST',

        headers: {

          'Content-Type': 'application/json',

          'accept': 'application/json'

        },

        body: JSON.stringify({

          customer_name: lead.name,

          customer_email: lead.email,

          subject: `Lead Thread - ${lead.id}`,

          message: messageToSend

        }),

      });



      if (!response.ok) throw new Error('Failed to send reply');



      const result = await response.json();

      console.log('Reply sent successfully:', result);

      showAlert('Reply sent successfully!', 'success');





      // Reset the ref so that next time admin types, it can change to "In Process" again

      statusUpdatedToInProcessRef.current = false;



      // Wait a bit for the backend to process and save the message before fetching
      // This ensures the new message appears in the thread
      await new Promise(resolve => setTimeout(resolve, 500));

      // Refresh the thread to show the new message
      await fetchThread();

      // If the message still doesn't appear, try fetching again after a longer delay
      setTimeout(async () => {
        await fetchThread();
      }, 2000);



    } catch (error) {

      console.error('Error sending reply:', error);

      showAlert('Failed to send reply. Please try again.', 'error');

      // Rollback optimistic message

      setThread(prev => prev.filter(m => m.message_id && !String(m.message_id).startsWith('temp-')));

    }

    finally {

      setIsSending(false);

    }

  };



  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {

    setSelectedStatus(e.target.value);

  };



  // Function to handle status change to "In Process" when typing

  const handleReplyTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {

    const newText = e.target.value;

    setReplyText(newText);



    // If user starts typing and status is not "In Process", automatically change it (only once)

    if (newText.trim().length > 0 && lead && lead.status !== 'In Process' && !statusUpdatedToInProcessRef.current) {

      // Update status to "In Process" when admin starts typing (only once)
      // Use MongoDB ObjectId for backend API calls
      const mongoId = lead._id || (lead.id && String(lead.id).length === 24 && /^[0-9a-fA-F]{24}$/i.test(String(lead.id)) ? lead.id : null);
      if (!mongoId) {
        console.error('MongoDB ObjectId not found, cannot update status');
        return;
      }

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://py-mobiloitte.converiqo.ai';
      fetch(`${API_URL}/api/v1/leads/${mongoId}/status`, {

        method: 'PUT',

        headers: {

          'accept': 'application/json',

          'Content-Type': 'application/json',

        },

        body: JSON.stringify({

          status: 'In Process',

          updated_by: 'Admin',

          notes: 'Status automatically changed to In Process when admin started typing reply',

          timestamp: new Date().toISOString(),

        }),

      })

        .then(response => {

          if (response.ok) {

            return response.json();

          }

          throw new Error('Failed to update status');

        })

        .then(data => {

          const newStatus = data?.new_status || 'In Process';

          // Update frontend state immediately

          setLead(prev => prev ? { ...prev, status: newStatus } : null);

          setSelectedStatus(newStatus);

          // Mark that status has been updated to "In Process" (one-time only)

          statusUpdatedToInProcessRef.current = true;

          console.log('Status automatically updated to In Process (one-time) - Frontend and Backend updated');

        })

        .catch(error => {

          console.error('Error auto-updating status to In Process:', error);

        });

    }

  };



  const handleSaveStatus = async () => {

    if (!lead || !selectedStatus || selectedStatus === lead.status) return;



    try {

      setIsSavingStatus(true);

      // Try to get the lead ID - prefer custom ID (LD-XXX) format, fallback to MongoDB ObjectId
      let leadIdToUse: string | null = null;

      // Priority 1: Use custom ID format (LD-XXX) if available
      if (lead.id && String(lead.id).startsWith('LD-')) {
        leadIdToUse = String(lead.id);
        console.log('✅ Using custom ID format:', leadIdToUse);
      }
      // Priority 2: Use MongoDB ObjectId if available and valid
      else if (lead._id) {
        leadIdToUse = String(lead._id);
        console.log('✅ Using MongoDB ObjectId from _id:', leadIdToUse);
      }
      // Priority 3: Check if lead.id is a valid ObjectId
      else if (lead.id && String(lead.id).length === 24 && /^[0-9a-fA-F]{24}$/i.test(String(lead.id))) {
        leadIdToUse = String(lead.id);
        console.log('✅ Using MongoDB ObjectId from id:', leadIdToUse);
      }

      if (!leadIdToUse) {
        console.error('❌ Lead ID not found, cannot update status. Lead object:', lead);
        showAlert('Cannot update status: Lead ID not found. Please refresh the page.', 'error');
        setIsSavingStatus(false);
        return;
      }

      console.log('🔄 Updating lead status:', {
        leadId: leadIdToUse,
        currentStatus: lead.status,
        newStatus: selectedStatus,
        leadObject: { id: lead.id, _id: lead._id }
      });

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://py-mobiloitte.converiqo.ai';
      const response = await fetch(`${API_URL}/api/v1/leads/${leadIdToUse}/status`, {

        method: 'PUT',

        headers: {

          'accept': 'application/json',

          'Content-Type': 'application/json',

        },

        body: JSON.stringify({

          status: selectedStatus,

          updated_by: 'Admin',

          notes: 'Status updated from CRM UI',

          timestamp: new Date().toISOString(),

        }),

      });



      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        console.error('❌ Status update failed:', {
          status: response.status,
          statusText: response.statusText,
          data: data,
          leadId: leadIdToUse
        });

        // Handle 404 specifically (Lead not found)
        if (response.status === 404) {
          const errorMsg = (data && (data.message || data.detail)) || 'Lead not found';
          console.error('❌ Lead not found in backend. Lead ID used:', leadIdToUse);
          throw new Error(errorMsg);
        }

        // Handle other errors
        throw new Error((data && (data.message || data.detail)) || `Failed to update status (HTTP ${response.status})`);

      }

      console.log('✅ Status update successful:', data);



      const newStatus: string = data?.new_status || selectedStatus;

      setLead({ ...lead, status: newStatus });

      if (statusOptions.includes(newStatus)) {

        setSelectedStatus(newStatus);

      }

      showAlert('Status updated successfully!', 'success');

    } catch (err) {

      console.error('Error updating status:', err);

      // Show user-friendly error message
      const errorMessage = err instanceof Error
        ? err.message
        : 'Failed to update status. Please try again.';

      // If it's a "Lead not found" error, suggest refreshing
      if (errorMessage.includes('Lead not found')) {
        showAlert('Lead not found. The lead may have been deleted or the page needs to be refreshed.', 'error');
      } else {
        showAlert(errorMessage, 'error');
      }

    } finally {

      setIsSavingStatus(false);

    }

  };



  function getInitials(name: string) {

    if (!name) return 'U';

    const parts = name.trim().split(' ');

    if (parts.length === 1) return parts[0][0].toUpperCase();

    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();

  }



  if (loading) {

    return (

      <div className="flex items-center justify-center h-[60vh]">

        <div className="text-center">

          <div role="status">

            <svg aria-hidden="true" className="inline w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">

              <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor" />

              <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill" />

            </svg>

            <span className="sr-only">Loading...</span>

          </div>

          <div className="mt-2 text-lg text-gray-500">Loading thread...</div>

        </div>

      </div>

    );

  }



  if (error || !lead) {

    return (

      <div className="flex flex-col items-center justify-center ">

        <span className="text-lg text-red-500">{error || "Lead not found."}</span>

        <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded" onClick={() => router.back()}>Go Back</button>

      </div>

    );

  }



  return (

    <div className="min-h-screen w-full bg-gray-50 dark:bg-gray-900 py-0 overflow-hidden">

      {/* Back button */}

      <div className="w-full max-w-7xl mx-auto pt-1 pb-2 px-2 sticky top-0 bg-gray-50 dark:bg-gray-900 z-20">

        <button

          onClick={() => router.back()}

          className="text-blue-600 hover:text-blue-700 text-base font-semibold cursor-pointer mt-2 z-10"

          aria-label="Back"

        >

          ← Back

        </button>

      </div>



      {/* Ticket ID and Status Controls */}

      <div className="w-full max-w-7xl mx-auto flex items-center justify-between pb-4 px-2">

        <div className="flex items-center gap-3">

          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Ticket ID #{lead.id}</h2>

        </div>

        <div className="flex items-center gap-2">

          <select

            className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-semibold text-base focus:outline-none focus:ring-2 focus:ring-blue-500 transition"

            value={statusOptions.includes(selectedStatus) ? selectedStatus : ''}

            onChange={handleStatusChange}

          >

            <option value="" disabled>Select status</option>

            {statusOptions.map((opt) => (

              <option key={opt} value={opt}>{opt}</option>

            ))}

          </select>

          <button

            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base transition disabled:opacity-50"

            disabled={!selectedStatus || selectedStatus === lead.status || isSavingStatus}

            onClick={handleSaveStatus}

          >

            {isSavingStatus ? 'Saving...' : 'Save'}

          </button>

        </div>

      </div>



      {/* Lead details card - compact row layout with all fields */}

      <div className="w-full max-w-7xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700 p-4 mb-4">

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" style={{ fontSize: '14px' }}>

          <div className="min-w-0">

            <span className="font-bold block sm:inline">Name:</span>

            <span className="block sm:inline text-xs sm:text-[14px] break-words whitespace-normal text-gray-800 dark:text-gray-200"> {lead.name}</span>

          </div>

          <div className="min-w-0">

            <span className="font-bold block sm:inline">Email:</span>

            <span className="block sm:inline text-xs sm:text-[14px] break-all whitespace-normal text-gray-800 dark:text-gray-200"> {lead.email}</span>

          </div>

          <div className="min-w-0">

            <span className="font-bold block sm:inline">Phone:</span>

            <span className="block sm:inline text-xs sm:text-[14px] break-words whitespace-normal text-gray-800 dark:text-gray-200"> {lead.phone}</span>

          </div>

          <div className="min-w-0">

            <span className="font-bold block sm:inline">Source:</span>

            <span className="block sm:inline text-xs sm:text-[14px] break-words whitespace-normal text-gray-800 dark:text-gray-200"> {lead.source || '-'}</span>

          </div>

          <div className="min-w-0">

            <span className="font-bold block sm:inline">Interest:</span>

            <span className="block sm:inline text-xs sm:text-[14px] break-words whitespace-normal text-gray-800 dark:text-gray-200"> {derived.interest || '-'}</span>

          </div>

          <div className="min-w-0">

            <span className="font-bold block sm:inline">Property Area:</span>

            <span className="block sm:inline text-xs sm:text-[14px] break-words whitespace-normal text-gray-800 dark:text-gray-200"> {derived.property_area || '-'}</span>

          </div>

          <div className="min-w-0">

            <span className="font-bold block sm:inline">Lead Type:</span>

            <span className="block sm:inline text-xs sm:text-[14px] break-words whitespace-normal text-gray-800 dark:text-gray-200"> {derived.lead_type || '-'}</span>

          </div>

          <div className="min-w-0">

            <span className="font-bold block sm:inline">Price:</span>

            <span className="block sm:inline text-xs sm:text-[14px] break-words whitespace-normal text-gray-800 dark:text-gray-200"> {derived.price_range || '-'}</span>

          </div>

          <div className="min-w-0">

            <span className="font-bold block sm:inline">Preferred Area/City:</span>

            <span className="block sm:inline text-xs sm:text-[14px] break-words whitespace-normal text-gray-800 dark:text-gray-200"> {derived.preferred_area_city || '-'}</span>

          </div>

          <div className="min-w-0">

            <span className="font-bold block sm:inline">Listing URL:</span>

            <span className="block sm:inline text-xs sm:text-[14px] break-all whitespace-normal text-gray-800 dark:text-blue-200">

              {derived.listing_url ? (

                <a href={derived.listing_url} target="_blank" rel="noopener noreferrer" className="hover:underline">

                  {derived.listing_url}

                </a>

              ) : '-'}

            </span>

          </div>

          <div className="min-w-0">

            <span className="font-bold block sm:inline">Agent:</span>

            <span className="block sm:inline text-xs sm:text-[14px] break-words whitespace-normal text-gray-800 dark:text-gray-200"> {derived.agent || '-'}</span>

          </div>

          <div className="min-w-0">

            <span className="font-bold block sm:inline">Status:</span>

            <span className="block sm:inline text-xs sm:text-[14px] break-words whitespace-normal text-gray-800 dark:text-gray-200"> {lead.status || '-'}</span>

          </div>

          <div className="min-w-0">

            <span className="font-bold block sm:inline">Date:</span>

            <span className="block sm:inline text-xs sm:text-[14px] break-words whitespace-normal text-gray-800 dark:text-gray-200"> {new Date(lead.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}</span>

          </div>

          <div className="min-w-0">

            <span className="font-bold block sm:inline">Message:</span>

            <span className="block sm:inline text-xs sm:text-[14px] break-words whitespace-normal text-gray-800 dark:text-gray-200"> {lead.message || '-'}</span>

          </div>

        </div>

      </div>



      {/* Thread UI - message bubbles */}

      <div className="w-full flex justify-center">

        <div className="w-full max-w-7xl mb-26">

          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700 p-0 flex flex-col flex-1 min-h-[500px] max-h-[60vh] min-h-0">

            {/* Scrollable thread area */}

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 min-h-0">

              {/* Always show original customer message first */}

              {lead && lead.message && (

                <div className="flex items-start gap-3">

                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">

                    {getInitials(lead.name)}

                  </div>

                  <div className="max-w-[70%] w-fit">

                    <div className="bg-blue-100 dark:bg-blue-900 rounded-lg p-3 inline-block">

                      <div className="font-semibold text-sm text-blue-800 dark:text-blue-200 mb-1">Customer Message:</div>

                      <div className="text-gray-900 dark:text-white text-sm">{lead.message}</div>

                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">

                        {new Date(lead.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true })}

                      </div>

                    </div>

                  </div>

                </div>

              )}



              {/* Show all admin replies from thread */}

              {thread.length > 0 && thread.map((msg, idx) => (

                <div key={msg.message_id || idx} className="flex items-start gap-3 justify-end">

                  <div className="max-w-[70%] w-fit">

                    <div className="bg-green-100 dark:bg-green-900 rounded-lg p-3 ml-auto inline-block">

                      <div className="font-semibold text-sm text-green-800 dark:text-green-200 mb-1">

                        {msg.sender_type && msg.sender_type.toLowerCase() === 'admin' ? 'Admin Reply:' : 'Customer Message:'}

                      </div>

                      <div className="text-gray-900 dark:text-white text-sm">{msg.message}</div>

                      {msg.sender_type && msg.sender_type.toLowerCase() === 'admin' && (msg.status || lead.status) && String(msg.status || lead.status).toLowerCase() !== 'open' && (

                        <div className={`mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${String(msg.status || lead.status).toLowerCase() === 'in process'

                          ? 'bg-purple-100 text-purple-800 border border-purple-200'

                          : String(msg.status || lead.status).toLowerCase() === 'pending'

                            ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'

                            : String(msg.status || lead.status).toLowerCase() === 'close'

                              ? 'bg-green-100 text-green-800 border border-green-200'

                              : 'bg-blue-100 text-blue-800 border border-blue-200'

                          }`}>

                          <span>Status: {msg.status || lead.status}</span>

                          <span className="text-[11px] text-red-500/80">

                            {msg.timestamp ? new Date(msg.timestamp).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true }) : ''}

                          </span>

                        </div>

                      )}

                    </div>

                  </div>

                  <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">

                    {msg.sender_type && msg.sender_type.toLowerCase() === 'admin' ? 'AD' : (msg.sender_name && msg.sender_name[0] ? msg.sender_name[0].toUpperCase() : getInitials(lead?.name || 'U'))}

                  </div>

                </div>

              ))}



              {/* Status change notifications */}

              {lead && lead.status && (

                <div className="flex items-start gap-3 justify-end">

                  <div className="flex-1 max-w-md">

                    <div className="bg-green-100 dark:bg-green-900 rounded-lg p-3 ml-auto">

                      <div className="font-semibold text-sm text-green-800 dark:text-green-200 mb-1">Admin Reply:</div>

                      <div className="text-gray-900 dark:text-white text-sm">

                        Status automatically changed from New to {lead.status}

                      </div>

                      <div className="text-gray-900 dark:text-white text-sm mt-1">-</div>

                      <div className="text-gray-900 dark:text-white text-sm">

                        Status: {lead.status} {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}, {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })}

                      </div>

                    </div>

                  </div>

                  <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">

                    AD

                  </div>

                </div>

              )}



              <div ref={threadEndRef} />

            </div>

            {/* Reply box fixed at the bottom of the thread container */}

            {lead && (selectedStatus || lead.status || '').toLowerCase() !== 'closed' && (

              <div className="sticky bottom-0 left-0 w-full bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg p-4 z-10">

                <form className="w-full" onSubmit={e => { e.preventDefault(); handleReply(); }}>

                  <div className="flex gap-2 items-center">

                    <textarea

                      id="editor"

                      rows={2}

                      className="flex-1 block w-full px-4 py-3 text-sm text-gray-800 dark:text-white bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:opacity-60"

                      placeholder="Type your reply…  •  Enter to send, Shift+Enter for new line"

                      required

                      value={replyText}

                      onChange={handleReplyTextChange}

                      disabled={isSending}

                      onKeyDown={(e) => {

                        if (e.key === 'Enter' && !e.shiftKey) {

                          e.preventDefault();

                          if (replyText.trim()) {

                            handleReply();

                          }

                        }

                      }}

                      ref={replyInputRef}

                    />

                    <button type="submit" disabled={isSending || !replyText.trim()} className={`inline-flex items-center px-6 py-3 text-sm font-medium text-center text-white rounded-lg focus:ring-4 focus:ring-blue-200 dark:focus:ring-blue-900 transition ${isSending || !replyText.trim() ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>

                      {isSending ? 'Sending...' : 'Reply'}

                    </button>

                  </div>

                </form>

              </div>

            )}

          </div>

        </div>

      </div>



      {/* Alerts */}

      {alerts.length > 0 && (

        <div className="fixed top-4 right-4 z-[999999] space-y-2">

          {alerts.map((alert) => (

            <Alert

              key={alert.id}

              variant={alert.type}

              title={alert.type === 'success' ? 'Success' : alert.type === 'error' ? 'Error' : alert.type === 'warning' ? 'Warning' : 'Info'}

              message={alert.message}

              showLink={false}

              showCloseButton={true}

              onClose={() => hideAlert(alert.id)}

            />

          ))}

        </div>

      )}

    </div>

  );

} 