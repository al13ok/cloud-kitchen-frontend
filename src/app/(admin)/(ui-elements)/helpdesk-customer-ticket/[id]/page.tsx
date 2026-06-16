"use client";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Loader from "@/components/Loader";
import Alert from "@/components/ui/alert/Alert";

 

type Ticket = {
 id: number;
 _id?: string;  // Add _id as optional property since we get it from backend
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
 ticket_id?: string; // <-- add this
 display_id?: string; // <-- add this
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
 // Client-side only: used to show real-time timestamp for optimistic UI
 local_created_at?: string;
 // Sticky display timestamp to prevent flicker/disappear on re-fetch
 display_timestamp?: string;
};

 

export default function CustomerTicketDetailPage() {
 const { id } = useParams();
 const router = useRouter();
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
 // Track last status to show toast only when going from Close to Pending
 const lastStatusRef = useRef<string | undefined>(undefined);
 const threadEndRef = useRef<HTMLDivElement | null>(null);
 const threadContainerRef = useRef<HTMLDivElement | null>(null);
 // Preserve first-seen timestamps without causing re-renders
 const timestampMapRef = useRef<Map<string, string>>(new Map());
 // Stable fallback time captured once at mount
 const initialMountTimeRef = useRef<string>(new Date().toISOString());

 // Local storage helpers to persist timestamps across page reloads
 const getStorageKeyForTicket = useCallback((ticketKey: string | number | undefined) => {
   return `helpdesk_ts_cache_${String(ticketKey || 'unknown')}`;
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

 

 

 

 // Prefer the human-friendly/display ticket id when available
 const formattedTicketId = ticket ? String(ticket.display_id || ticket.ticket_id || ticket.id) : String(id);

 

 

 

 // Auto scroll to bottom when thread updates (container-scoped to prevent page jumping)
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

 // Helper to derive a stable timestamp from message fields or Mongo ObjectId
 const deriveDisplayTimestamp = useCallback((msg: Partial<ThreadMessage>): string => {
   // Prefer original creation time; as a safe fallback, use status_changed_at instead of "now"
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
   // Last resort: keep a stable epoch (start of page load) to avoid changing times
   return initialMountTimeRef.current;
 }, []);

 // Stable identity for messages to preserve first timestamp
 const getMessageKey = useCallback((msg: Partial<ThreadMessage>): string => {
   if (msg._id) return String(msg._id);
   const created = msg.created_at || msg.local_created_at || msg.status_changed_at || '';
   return [msg.ticket_id, msg.sender_id, msg.sender_type, created, msg.message].join('|');
 }, []);

 

 

 

 // Scroll to bottom when thread changes
 useEffect(() => {
   scrollToBottom();
 }, [thread, scrollToBottom]);

 

 useEffect(() => {
   setLoading(true);
   setError("");
   fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/helpdesk/tickets/${id}`)
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
     // Load persisted timestamps for this ticket
     const persisted = readTimestampCache(ticketId);
     timestampMapRef.current = persisted;
     const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/helpdesk/customer/thread/${ticketId}`);
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
     // Persist updated map
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

 

 // Send email to customer (independent of reply)
 const sendEmailToCustomer = async (customerEmail: string, customerName: string, replyMessage: string, ticketId: string) => {
   try {
     const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/customer-chat/send-email`, {
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
   const senderId = "99"; // Use string for sender_id as required by backend
   const senderType = 'Admin';
   const finalMessage = `Dear ${ticket.name},\nI hope you are doing well,\n\n${replyText}\n\nBest regards,\nTechnical Support Team \nMobiloitte`;
   const tempTimestamp = new Date().toISOString();
   
// Log payload for debugging
   console.log({
     ticket_id: String(ticketId),
     sender_id: String(senderId),
     sender_type: String(senderType),
     message: finalMessage,
   });
   
   if (!ticketId || !senderId || !finalMessage.trim()) {
     showAlertMessage('Missing required fields for thread reply!', 'error');
     return;
   }
   
   try {
     // Optimistically append a local message with real-time timestamp
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
     // 1. Send the reply to the thread
     const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/helpdesk/customer/thread`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         ticket_id: String(ticketId),
         sender_id: String(senderId),
         sender_type: String(senderType),
         message: String(finalMessage),
         // Always mark individual reply messages as Pending (match employee behavior)
         status: 'Pending',
       }),
     });
     
     if (!res.ok) throw new Error('Failed to send reply');
     
     // 2. Update the status to "Pending" when reply is sent
     console.log('🔄 UPDATING STATUS TO PENDING AFTER REPLY');
     const statusRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/helpdesk/tickets/${ticketId}/status`, {
       method: 'PUT',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ 
         status: 'Pending',
         ticket_status: 'Pending',
         data: { status: 'Pending' }
       }),
     });
     
     if (!statusRes.ok) throw new Error('Failed to update status to Pending');
     
     console.log('✅ STATUS UPDATED TO PENDING SUCCESSFULLY');
     
     setReplyText('');
     showAlertMessage('Reply sent and status updated to Pending!', 'success');
     await fetchThread();
     setTicket({ ...ticket, status: 'Pending' });
     setSelectedStatus('Pending');
     
     // Scroll to bottom after thread update
     setTimeout(() => {
       scrollToBottom();
     }, 100);
     
     // Patch the latest admin message in the thread with status and time (after fetchThread)
     setThread(thread => {
       if (!thread || thread.length === 0) return thread;
       const lastIdx = thread.length - 1;
       const updated = [...thread];
       if (
         updated[lastIdx].sender_type &&
         updated[lastIdx].sender_type.toLowerCase() === 'admin' &&
         updated[lastIdx].status !== 'Pending'
       ) {
         updated[lastIdx] = {
           ...updated[lastIdx],
           status: 'Pending',
           status_changed_at: new Date().toISOString(),
         };
         // Persist any new timestamp mappings created earlier
         const ticketIdKey = ticket._id || ticket.id;
         writeTimestampCache(ticketIdKey, timestampMapRef.current);
       }
       return updated;
     });
     
     // 3. Send email to customer (independent of reply success)
     // This runs after the reply is successfully sent, but doesn't affect the reply if email fails
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
     const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/helpdesk/tickets/${ticketId}/status`, {
       method: 'PUT',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ status: selectedStatus }),
     });
     if (!response.ok) throw new Error('Failed to update status');
     setTicket({ ...ticket, status: selectedStatus });
     
     // Add a new thread message for any status change
     const statusChangeMessage = {
       ticket_id: String(ticketId),
       sender_id: "99",
       sender_type: "Admin",
       message: `Status changed from ${lastStatusRef.current || 'Unknown'} to ${selectedStatus}`,
       status: selectedStatus,
     };
     
     // Add the status change message to thread
     const threadRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/helpdesk/customer/thread`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(statusChangeMessage),
     });
     
     if (threadRes.ok) {
       // Refresh thread to show the new status change message
       await fetchThread();
       // Scroll to bottom after status change
       setTimeout(() => {
         scrollToBottom();
       }, 100);
     }
     
     // If status is Pending or Close, normalize thread message statuses
     if (selectedStatus === 'Pending' || selectedStatus === 'Close') {
       setThread(thread => {
         if (!thread || thread.length === 0) return thread;
         const updated = thread.map(msg => {
           const current = (msg.status || '').toLowerCase();
           if (selectedStatus === 'Pending') {
             // When switching to Pending, convert New/Close/Open/empty to Pending
             if (!current || current === 'new' || current === 'close' || current === 'open') {
               return {
                 ...msg,
                 status: 'Pending',
                 status_changed_at: new Date().toISOString(),
               };
             }
             return msg;
           }
           // For Close, keep behavior similar to employee: convert only New to Close
           if (selectedStatus === 'Close' && current === 'new') {
             return {
               ...msg,
               status: 'Close',
               status_changed_at: new Date().toISOString(),
             };
           }
           return msg;
         });
         return updated;
       });
     }

   } catch {
     showAlertMessage('Failed to update status. Please try again.', 'error');
   }
 };

 

 

 

 // Helper to get initials from name
 function getInitials(name: string) {
   if (!name) return 'U';
   const parts = name.trim().split(' ');
   if (parts.length === 1) return parts[0][0].toUpperCase();
   return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
 }
 // Patch latest admin message with status after thread or ticket changes (preserve timestamp)
 useEffect(() => {
   if (!thread || thread.length === 0 || !ticket) return;
   // Find the last admin message
   const lastAdminIdx = [...thread].reverse().findIndex(msg => msg.sender_type && msg.sender_type.toLowerCase() === 'admin');
   if (lastAdminIdx === -1) return;
   const idx = thread.length - 1 - lastAdminIdx;
   const msg = thread[idx];
   // Always mirror the ticket status (e.g., In Process while typing, Pending after save)
   if (msg.status !== ticket.status) {
     const updated = [...thread];
     updated[idx] = {
       ...updated[idx],
       status: ticket.status,
       status_changed_at: new Date().toISOString(),
     };
     setThread(updated);
   }
 }, [thread, ticket?.status, ticket]);

 

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
     <div className="flex flex-col items-center justify-center ">
       <span className="text-lg text-red-500">{error || "Ticket not found."}</span>
       <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded" onClick={() => router.back()}>Go Back</button>
     </div>
   );
 }

 

 

 return (
   <>
     <div className="min-h-screen w-full bg-gray-50 dark:bg-gray-900 py-0 overflow-visible">
     {/* Back button */}
     <div className="w-full max-w-7xl mx-auto pt-1 pb-2 px-2 sticky top-0 bg-gray-50 dark:bg-gray-900 z-20">
       <button
         onClick={() => router.back()}
         className="back-button text-blue-600 hover:text-blue-700 dark:text-blue-500 dark:hover:text-blue-400 text-base font-semibold cursor-pointer mt-2 z-10"
         aria-label="Back"
       >
         ← Back
       </button>
     </div>
     
     {/* Ticket ID and status controls */}
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
     {/* Ticket details card - compact 2-column layout */}
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
       </div>
     </div>
     {/* Thread UI - message bubbles */}
     <div className="w-full flex justify-center">
       <div className="w-full max-w-7xl mb-26">
       <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700 p-0 flex flex-col flex-1 min-h-[500px] max-h-[60vh] min-h-0">

 

           {/* Scrollable thread area */}
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
               // Check if message contains admin signature or is from admin
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
                           {msg.display_timestamp && (
                             <span className="text-[11px] text-red-500/80 ml-1">
                               {new Date(msg.display_timestamp).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true })}
                             </span>
                           )}
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
           {/* Reply box fixed at the bottom of the thread container */}
           {ticket && (ticket.status || '').toLowerCase() !== 'close' && (
             <div className="sticky bottom-16 md:bottom-0 left-0 w-full bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg p-4 z-10">
               <form className="w-full" onSubmit={e => { e.preventDefault(); handleReply(); }}>
                 <div className="flex gap-2 items-center">
                   <textarea id="editor" rows={2} className="flex-1 block w-full px-4 py-2 text-sm text-gray-800 bg-white border border-gray-300 rounded-lg dark:bg-gray-800 dark:text-white dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder="Type your reply..." required value={replyText} onChange={async e => {
 const newText = e.target.value;
 setReplyText(newText);
 // If status is New, Pending, or Open, update to In Process in backend and UI
 if (
   ticket &&
   (ticket.status === 'New' || ticket.status === 'Pending' || ticket.status === 'Open')
 ) {
   try {
     const ticketId = ticket._id || ticket.id;
     const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/helpdesk/tickets/${ticketId}/status`, {
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
       // Do NOT alter prior message badges; they remain Pending
     }
   } catch {
     // Optionally, show an error alert
   }
 }
}} ref={replyInputRef} />
                   <button type="submit" disabled={!replyText.trim()} className={`inline-flex items-center px-5 py-2.5 text-sm font-medium text-center text-white rounded-lg focus:ring-4 focus:ring-blue-200 dark:focus:ring-blue-900 transition ${!replyText.trim() ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-700 hover:bg-blue-800'}`}>
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