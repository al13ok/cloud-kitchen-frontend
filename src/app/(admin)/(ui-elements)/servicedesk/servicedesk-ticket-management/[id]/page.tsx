"use client";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Loader from "@/components/Loader";
import Alert from "@/components/ui/alert/Alert";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type Ticket = {
  id: number;
  _id?: string;
  name: string;
  email: string;
  phone: string;
  issue_type: string;
  issue: string;
  status: string;
  message: string;
  device: string;
  severity: string;
  created_at: string;
  ticket_id?: string;
  display_id?: string;
  assigned_to_name?: string;
};

type ThreadMessage = {
  _id?: string;
  ticket_id: string;
  sender_id: string;
  sender_type: string;
  sender_name?: string;
  message: string;
  status?: string;
  created_at?: string;
  status_changed_at?: string;
  local_created_at?: string;
  display_timestamp?: string;
};

export default function ServiceDeskTicketDetailPage() {
  const { id } = useParams();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [thread, setThread] = useState<ThreadMessage[]>([]);
  const [replyText, setReplyText] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<'success' | 'error' | ''>("");
  const [showAlert, setShowAlert] = useState(false);
  const replyInputRef = useRef<HTMLTextAreaElement>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('New');
  const lastStatusRef = useRef<string | undefined>(undefined);
  const threadEndRef = useRef<HTMLDivElement | null>(null);
  const threadContainerRef = useRef<HTMLDivElement | null>(null);
  const timestampMapRef = useRef<Map<string, string>>(new Map());
  const initialMountTimeRef = useRef<string>(new Date().toISOString());

  const getStorageKeyForTicket = useCallback((ticketKey: string | number | undefined) => {
    return `servicedesk_ts_cache_${String(ticketKey || 'unknown')}`;
  }, []);
  
  const readTimestampCache = useCallback((ticketKey: string | number | undefined): Map<string, string> => {
    if (typeof window === 'undefined') return new Map();
    try {
      const raw = window.localStorage.getItem(getStorageKeyForTicket(ticketKey));
      if (!raw) return new Map();
      const obj = JSON.parse(raw) as Record<string, string>;
      return new Map(Object.entries(obj || {}));
    } catch {
      return new Map();
    }
  }, [getStorageKeyForTicket]);
  
  const writeTimestampCache = useCallback((ticketKey: string | number | undefined, cache: Map<string, string>) => {
    if (typeof window === 'undefined') return;
    try {
      const obj: Record<string, string> = {};
      cache.forEach((v, k) => { obj[k] = v; });
      window.localStorage.setItem(getStorageKeyForTicket(ticketKey), JSON.stringify(obj));
    } catch {
      // ignore storage errors
    }
  }, [getStorageKeyForTicket]);

  const formattedTicketId = ticket ? String(ticket.display_id || ticket.ticket_id || ticket.id) : String(id);

  const scrollToBottom = useCallback(() => {
    if (threadContainerRef.current) {
      const container = threadContainerRef.current;
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      return;
    }
    if (threadEndRef.current) {
      threadEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, []);

  const deriveDisplayTimestamp = useCallback((msg: Partial<ThreadMessage>): string => {
    const direct = msg.display_timestamp || msg.created_at || msg.local_created_at || msg.status_changed_at;
    if (direct) return direct;
    const possibleId = (msg._id || '') as string;
    const isHex24 = typeof possibleId === 'string' && /^[a-fA-F0-9]{24}$/.test(possibleId);
    if (isHex24) {
      const seconds = parseInt(possibleId.substring(0, 8), 16);
      if (!Number.isNaN(seconds)) {
        return new Date(seconds * 1000).toISOString();
      }
    }
    return initialMountTimeRef.current;
  }, []);

  const getMessageKey = useCallback((msg: Partial<ThreadMessage>): string => {
    if (msg._id) return String(msg._id);
    const created = msg.created_at || msg.local_created_at || msg.status_changed_at || '';
    return [msg.ticket_id, msg.sender_id, msg.sender_type, created, msg.message].join('|');
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [thread, scrollToBottom]);

  useEffect(() => {
    setLoading(true);
    setError("");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://py-mobiloitte.converiqo.ai';
    fetch(`${apiUrl}/api/v1/helpdesk/tickets/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data) => setTicket(data))
      .catch(() => setError("Ticket not found."))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (ticket && ticket.status) setSelectedStatus(ticket.status);
  }, [ticket]);

  const fetchThread = useCallback(async () => {
    if (!ticket) return;
    const ticketId = ticket._id || ticket.id;
    if (!ticketId) return;
    try {
      const persisted = readTimestampCache(ticketId);
      timestampMapRef.current = persisted;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://py-mobiloitte.converiqo.ai';
      const res = await fetch(`${apiUrl}/api/v1/helpdesk/customer/thread/${ticketId}`);
      if (!res.ok) throw new Error('Failed to fetch thread');
      const data = await res.json();
      const incoming = (Array.isArray(data) ? data : []) as ThreadMessage[];
      const normalized = incoming.map((msg: ThreadMessage) => {
        const key = getMessageKey(msg);
        const preserved = key ? timestampMapRef.current.get(key) : undefined;
        const ts = preserved || deriveDisplayTimestamp(msg);
        if (key && !timestampMapRef.current.has(key)) {
          timestampMapRef.current.set(key, ts);
        }
        return { ...msg, display_timestamp: ts } as ThreadMessage;
      });
      setThread(normalized);
      writeTimestampCache(ticketId, timestampMapRef.current);
    } catch {
      setThread([]);
    }
  }, [ticket, getMessageKey, deriveDisplayTimestamp, readTimestampCache, writeTimestampCache]);

  useEffect(() => {
    if (ticket && (ticket._id || ticket.id)) fetchThread();
  }, [ticket, fetchThread]);

  useEffect(() => {
    if (showAlert) {
      const timer = setTimeout(() => {
        setShowAlert(false);
        setAlertMessage("");
        setAlertType("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showAlert]);

  const showAlertMessage = (message: string, type: 'success' | 'error') => {
    setAlertMessage(message);
    setAlertType(type);
    setShowAlert(true);
  };

  const sendEmailToCustomer = async (customerEmail: string, customerName: string, replyMessage: string, ticketId: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://py-mobiloitte.converiqo.ai';
      const emailResponse = await fetch(`${apiUrl}/customer-chat/send-email`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          to_email: customerEmail,
          subject: `Ticket Update - ${ticketId}`,
          body: replyMessage,
          chat_id: ticketId,
          customer_name: customerName,
        }),
      });
      
      if (emailResponse.ok) {
        console.log('Email sent successfully to customer');
      } else {
        const errorText = await emailResponse.text();
        console.log('Email server error:', emailResponse.status, errorText);
      }
    } catch {
      console.log('Email server down, but reply was sent successfully');
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !ticket) return;
    const ticketId = ticket._id || ticket.id;
    const senderId = "99";
    const senderType = 'Admin';
    const finalMessage = `Dear ${ticket.name},\nI hope you are doing well,\n\n${replyText}\n\nBest regards,\nTechnical Support Team \nMobiloitte`;
    const tempTimestamp = new Date().toISOString();
    
    if (!ticketId || !senderId || !finalMessage.trim()) {
      showAlertMessage('Missing required fields for thread reply!', 'error');
      return;
    }
    
    try {
      const optimisticMessage: ThreadMessage = {
        ticket_id: String(ticketId || ''),
        sender_id: String(senderId),
        sender_type: String(senderType),
        message: String(finalMessage),
        status: 'Pending',
        local_created_at: tempTimestamp,
        display_timestamp: deriveDisplayTimestamp({ local_created_at: tempTimestamp }),
      };
      setThread(prev => [...prev, optimisticMessage]);
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://py-mobiloitte.converiqo.ai';
      const res = await fetch(`${apiUrl}/api/v1/helpdesk/customer/thread`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket_id: String(ticketId),
          sender_id: String(senderId),
          sender_type: String(senderType),
          message: String(finalMessage),
          status: 'Pending',
        }),
      });
      
      if (!res.ok) throw new Error('Failed to send reply');
      
      const statusRes = await fetch(`${apiUrl}/api/v1/helpdesk/tickets/${ticketId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'Pending',
          ticket_status: 'Pending',
          data: { status: 'Pending' }
        }),
      });
      
      if (!statusRes.ok) throw new Error('Failed to update status to Pending');
      
      setReplyText('');
      showAlertMessage('Reply sent and status updated to Pending!', 'success');
      await fetchThread();
      setTicket({ ...ticket, status: 'Pending' });
      setSelectedStatus('Pending');
      
      setTimeout(() => {
        scrollToBottom();
      }, 100);
      
      sendEmailToCustomer(ticket.email, ticket.name, finalMessage, String(formattedTicketId));
      
    } catch {
      showAlertMessage('Failed to send reply or update status.', 'error');
    }
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedStatus(e.target.value);
  };

  const handleSaveStatus = async () => {
    if (!ticket || selectedStatus === ticket.status) return;
    const ticketId = ticket._id || ticket.id;
    if (!ticketId) {
      showAlertMessage('Ticket ID is missing!', 'error');
      return;
    }
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://py-mobiloitte.converiqo.ai';
      const response = await fetch(`${apiUrl}/api/v1/helpdesk/tickets/${ticketId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: selectedStatus }),
      });
      if (!response.ok) throw new Error('Failed to update status');
      setTicket({ ...ticket, status: selectedStatus });
      
      const statusChangeMessage = {
        ticket_id: String(ticketId),
        sender_id: "99",
        sender_type: "Admin",
        message: `Status changed from ${lastStatusRef.current || 'Unknown'} to ${selectedStatus}`,
        status: selectedStatus,
      };
      
      const threadRes = await fetch(`${apiUrl}/api/v1/helpdesk/customer/thread`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(statusChangeMessage),
      });
      
      if (threadRes.ok) {
        await fetchThread();
        setTimeout(() => {
          scrollToBottom();
        }, 100);
      }

    } catch {
      showAlertMessage('Failed to update status. Please try again.', 'error');
    }
  };

  function getInitials(name: string) {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  useEffect(() => {
    lastStatusRef.current = ticket?.status;
  }, [ticket?.status]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader />
      </div>
    );
  }
  
  if (error || !ticket) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <span className="text-lg text-red-500">{error || "Ticket not found."}</span>
        <Link 
          href="/servicedesk/servicedesk-ticket-management"
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Go Back
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen w-full bg-gray-50 dark:bg-gray-900 py-0 overflow-visible">
        <div className="w-full max-w-7xl mx-auto pt-1 pb-2 px-2 sticky top-0 bg-gray-50 dark:bg-gray-900 z-20">
          <Link
            href="/servicedesk/servicedesk-ticket-management"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-500 dark:hover:text-blue-400 text-base font-semibold cursor-pointer mt-2 z-10"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Ticket Management
          </Link>
        </div>
        
        <div className="w-full max-w-7xl mx-auto flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between pb-4 px-2">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Ticket ID #{formattedTicketId}</h2>
          <div className="flex items-center gap-2">
            <select
              className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-semibold text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 transition min-w-[90px] sm:min-w-[110px] relative z-50"
              value={selectedStatus}
              onChange={handleStatusChange}
            >
              <option value="New">New</option>
              <option value="In Process">In Process</option>
              <option value="Pending">Pending</option>
              <option value="Resolved">Resolved</option>
              <option value="Close">Close</option>
            </select>
            <button
              className="px-3 sm:px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm sm:text-base transition disabled:opacity-50"
              disabled={selectedStatus === ticket.status}
              onClick={handleSaveStatus}
            >
              Save
            </button>
          </div>
        </div>
        
        {showAlert && (
          <div className="mt-6 ml-auto max-w-sm relative z-[2147483647]">
            <Alert
              variant={alertType === 'success' ? 'success' : 'error'}
              title={alertType === 'success' ? 'Success' : 'Error'}
              message={alertMessage}
              showLink={false}
            />
          </div>
        )}
        
        <div className="w-full max-w-7xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-3 mb-4">
          <div className="flex flex-wrap justify-between items-center gap-2 text-sm">
            <div className="flex items-center min-w-0 flex-1">
              <span className="font-bold text-gray-800 dark:text-gray-200 whitespace-nowrap">Name:</span>
              <span className="ml-1 text-gray-700 dark:text-gray-300 truncate">{ticket.name}</span>
            </div>
            <div className="flex items-center min-w-0 flex-1">
              <span className="font-bold text-gray-800 dark:text-gray-200 whitespace-nowrap">Email:</span>
              <span className="ml-1 text-gray-700 dark:text-gray-300 truncate">{ticket.email}</span>
            </div>
            <div className="flex items-center min-w-0 flex-1">
              <span className="font-bold text-gray-800 dark:text-gray-200 whitespace-nowrap">Issue Type:</span>
              <span className="ml-1 text-gray-700 dark:text-gray-300 truncate">{ticket.issue_type || '-'}</span>
            </div>
            <div className="flex items-center min-w-0 flex-1">
              <span className="font-bold text-gray-800 dark:text-gray-200 whitespace-nowrap">Issue:</span>
              <span className="ml-1 text-gray-700 dark:text-gray-300 truncate">{ticket.issue || '-'}</span>
            </div>
            <div className="flex items-center min-w-0 flex-1">
              <span className="font-bold text-gray-800 dark:text-gray-200 whitespace-nowrap">Status:</span>
              <span className="ml-1 text-gray-700 dark:text-gray-300 truncate">{ticket.status || '-'}</span>
            </div>
            <div className="flex items-center min-w-0 flex-1">
              <span className="font-bold text-gray-800 dark:text-gray-200 whitespace-nowrap">Date:</span>
              <span className="ml-1 text-gray-700 dark:text-gray-300 truncate">{new Date(ticket.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}</span>
            </div>
            {ticket.assigned_to_name && (
              <div className="flex items-center min-w-0 flex-1">
                <span className="font-bold text-gray-800 dark:text-gray-200 whitespace-nowrap">Agent:</span>
                <span className="ml-1 text-gray-700 dark:text-gray-300 truncate">{ticket.assigned_to_name}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="w-full flex justify-center">
          <div className="w-full max-w-7xl mb-26">
            <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700 p-0 flex flex-col flex-1 min-h-[500px] max-h-[60vh] min-h-0">
              <div ref={threadContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden p-4 flex flex-col gap-4 min-h-0">
                {ticket && ticket.message && (
                  <div className="w-full flex items-start gap-3 justify-start">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
                      {getInitials(ticket.name)}
                    </div>
                    <div className="max-w-[70%] w-fit">
                      <div className="bg-blue-100 dark:bg-blue-900 rounded-lg p-3 inline-block">
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Customer Message:</div>
                        <div className="whitespace-pre-line text-gray-900 dark:text-gray-100 text-sm break-words overflow-wrap-anywhere">{ticket.message}</div>
                        <div className="text-xs text-gray-500 mt-2">
                          {ticket.created_at ? new Date(ticket.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true }) : '-'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {thread.length > 0 && thread.map((msg, idx) => {
                  const hasAdminSignature = msg.message && (
                    msg.message.includes('Technical Support Team') ||
                    msg.message.includes('Best regards') ||
                    msg.message.includes('Admin') ||
                    msg.message.includes('Support Team')
                  );
                  const isAdmin = msg.sender_type && msg.sender_type.toLowerCase() === 'admin' || hasAdminSignature;
                  
                  return (
                    <div key={msg._id || idx} className={`w-full flex items-start gap-3 ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                      {!isAdmin && (
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
                          {(msg.sender_name && msg.sender_name[0] ? msg.sender_name[0].toUpperCase() : (ticket ? getInitials(ticket.name) : 'C'))}
                        </div>
                      )}
                      <div className="max-w-[70%] w-fit">
                        <div className={`${isAdmin ? 'bg-green-100 dark:bg-green-900' : 'bg-blue-100 dark:bg-blue-900'} rounded-lg p-3 overflow-visible inline-block`}>
                          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                            {isAdmin ? 'Admin Reply:' : 'Customer Message:'}
                          </div>
                          <div className="whitespace-pre-line text-gray-900 dark:text-gray-100 text-sm break-words overflow-wrap-anywhere">
                            {msg.message}
                          </div>
                          <div className={`text-xs text-gray-500 mt-2 ${isAdmin ? 'text-right' : ''}`}>
                            {(() => {
                              const ts = msg.display_timestamp || deriveDisplayTimestamp(msg);
                              return ts ? new Date(ts).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true }) : '-';
                            })()}
                          </div>
                          {isAdmin && msg.status && (
                            <div className={`mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                              msg.status.toLowerCase() === 'in process'
                                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                : msg.status.toLowerCase() === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                                  : msg.status.toLowerCase() === 'close'
                                    ? 'bg-green-100 text-green-800 border border-green-200'
                                    : 'bg-blue-100 text-blue-800 border border-blue-200'
                            }`}>
                              <span>Status: {msg.status}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-sm font-bold">AD</div>
                      )}
                    </div>
                  );
                })}
                <div ref={threadEndRef} />
              </div>
              {ticket && (ticket.status || '').toLowerCase() !== 'close' && (ticket.status || '').toLowerCase() !== 'resolved' && (
                <div className="sticky bottom-16 md:bottom-0 left-0 w-full bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg p-4 z-10">
                  <form className="w-full" onSubmit={e => { e.preventDefault(); handleReply(); }}>
                    <div className="flex gap-2 items-center">
                      <textarea 
                        rows={2} 
                        className="flex-1 block w-full px-4 py-2 text-sm text-gray-800 bg-white border border-gray-300 rounded-lg dark:bg-gray-800 dark:text-white dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" 
                        placeholder="Type your reply..." 
                        required 
                        value={replyText} 
                        onChange={async e => {
                          const newText = e.target.value;
                          setReplyText(newText);
                          if (
                            ticket &&
                            (ticket.status === 'New' || ticket.status === 'Pending' || ticket.status === 'Open')
                          ) {
                            try {
                              const ticketId = ticket._id || ticket.id;
                              const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://py-mobiloitte.converiqo.ai';
                              const response = await fetch(`${apiUrl}/api/v1/helpdesk/tickets/${ticketId}/status`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  status: 'In Process',
                                  ticket_status: 'In Process',
                                  data: { status: 'In Process' }
                                }),
                              });
                              if (response.ok) {
                                setSelectedStatus('In Process');
                                setTicket({ ...ticket, status: 'In Process' });
                              }
                            } catch {
                              // Optionally, show an error alert
                            }
                          }
                        }} 
                        ref={replyInputRef} 
                      />
                      <button 
                        type="submit" 
                        disabled={!replyText.trim()} 
                        className={`inline-flex items-center px-5 py-2.5 text-sm font-medium text-center text-white rounded-lg focus:ring-4 focus:ring-blue-200 dark:focus:ring-blue-900 transition ${!replyText.trim() ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-700 hover:bg-blue-800'}`}
                      >
                        Reply
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

