import React, { useState, useEffect, useRef } from 'react';
import LoadingSpinner from './LoadingSpinner';
// import { TimePicker12h } from './TimePicker12h';
import { formatTime12Hour } from '../utils/timeUtils';
// import VisualCalendar from './VisualCalendar';
import { API_BASE, API_URLS } from '../config/api';

type Message = { 
	role: 'user' | 'assistant'; 
	content: string;
	timestamp?: Date;
	bookingState?: Record<string, unknown>;
	availableTimes?: string[];
	timeSlots?: Array<{label: string; start: string; end: string; available: boolean}>;
	showCalendar?: boolean;
	showVisualCalendar?: boolean;
	calendarData?: Array<{date: string; status: 'available' | 'full' | 'not_assigned'; slots?: number; capacity?: number}>;
};

type ApiResponse = {
	reply?: string;
	conversation_id?: string;
	intent?: string;
	booking_state?: Record<string, unknown>;
	message?: string;
	detail?: string;
	error?: string;
	available_times?: string[];
	time_slots?: Array<{label: string; start: string; end: string; available: boolean}>;
	calendar_data?: Array<{date: string; status: 'available' | 'full' | 'not_assigned'; slots?: number; capacity?: number}>;
	show_calendar?: boolean;
	show_visual_calendar?: boolean;
};

interface ChatBoxProps {
    apiBaseUrl?: string;
    userId?: string;
    isLoggedIn?: boolean;
    onBookingStateChange?: (state: Record<string, unknown>) => void;
}

export const ChatBox: React.FC<ChatBoxProps> = ({ 
    apiBaseUrl = API_BASE,
    userId,
    isLoggedIn,
    onBookingStateChange
}) => {
	const [messages, setMessages] = useState<Message[]>([]);
	const [input, setInput] = useState('');
	const [loading, setLoading] = useState(false);
	const [conversationId, setConversationId] = useState<string | null>(null);
	const [bookingState, setBookingState] = useState<Record<string, unknown>>({});
	const [, setIntent] = useState<string | null>(null);
	const [initialized, setInitialized] = useState(false);
	const [, setBookingActive] = useState(false);
	const [services, setServices] = useState<Array<{id: string; name: string}>>([]);
	const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
	const [, setCalendarData] = useState<Array<{date: string; status: 'available' | 'full' | 'not_assigned'; slots?: number; capacity?: number}>>([]);
	const [lastFetchedService, setLastFetchedService] = useState<string | null>(null);
	const [visibleMessages, setVisibleMessages] = useState<number>(0);
	const [isTyping, setIsTyping] = useState(false);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const [hideTimeSlots, setHideTimeSlots] = useState(false);
	const [confirmationDismissed, setConfirmationDismissed] = useState(false);

	// Debug hideTimeSlots state changes
	useEffect(() => {
		console.log('DEBUG: hideTimeSlots state changed to:', hideTimeSlots);
	}, [hideTimeSlots]);

	// Function to animate messages appearing one by one
	const animateMessages = (newMessages: Message[]) => {
		setVisibleMessages(0);
		setIsTyping(true);
		
		let currentIndex = 0;
		const interval = setInterval(() => {
			if (currentIndex < newMessages.length) {
				setVisibleMessages(currentIndex + 1);
				// Scroll to bottom after each message is revealed
				setTimeout(() => {
					messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
				}, 100);
				currentIndex++;
			} else {
				setIsTyping(false);
				clearInterval(interval);
				// Final scroll after all messages are revealed
				setTimeout(() => {
					messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
				}, 200);
			}
		}, 800); // 800ms delay between messages
	};

	// Robust JSON parsing that won't throw on non-JSON or empty bodies
	const parseJsonSafe = async (res: Response): Promise<unknown> => {
		const ct = res.headers.get('content-type') || '';
		try {
			if (ct.includes('application/json')) {
				return await res.json();
			}
			const text = await res.text();
			try {
				return JSON.parse(text);
			} catch {
				return { detail: text };
			}
		} catch {
			return { detail: 'No response body' };
		}
	};

	// Build a user-friendly error message from an HTTP response
	const buildHttpErrorMessage = (status: number, data: unknown): string => {
		const dataObj = data as { detail?: string; message?: string } | null;
		const detail = typeof data === 'string' ? data : (dataObj?.detail || dataObj?.message || 'Unexpected server error');
		return `Sorry, I encountered an error (HTTP ${status}). ${detail}`;
	};
	
	// Function to format time in chat messages
	const formatTimeInMessage = (content: string): string => {
		// Handle various time formats
		let formatted = content;
		
		// Pattern 1: HH:MM format (e.g., "14:40" -> "2:40 PM").
		// Avoid converting when it's already followed by AM/PM (prevents "10:00 AM" -> "10:00 AM AM").
		const timePattern24 = /\b(\d{1,2}):(\d{2})\b(?!\s*(AM|PM|am|pm))/g;
		formatted = formatted.replace(timePattern24, (match, hour, minute) => {
			const time24 = `${hour.padStart(2, '0')}:${minute}`;
			return formatTime12Hour(time24);
		});
		
		// Pattern 2: H:MM AM/PM format (e.g., "2:40 PM" -> keep as is)
		// This pattern ensures AM/PM times are displayed correctly
		const timePattern12 = /\b(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)\b/g;
		formatted = formatted.replace(timePattern12, (match, hour, minute, period) => {
			// Keep the original format but normalize case
			return `${hour}:${minute} ${period.toUpperCase()}`;
		});
		
		return formatted;
	};
	
    const [actualUserId, setActualUserId] = useState<string | undefined>(undefined);
    const storedUserId = (typeof window !== 'undefined' ? localStorage.getItem('USER_ID') : undefined) || userId;
    const resolvedUserId = actualUserId || storedUserId;
    const loggedIn = typeof isLoggedIn === 'boolean' 
        ? isLoggedIn 
        : (typeof window !== 'undefined' && Boolean(localStorage.getItem('USER_ID') && localStorage.getItem('ACCESS_TOKEN')));
    
    // Check if stored user_id is an email and fetch the correct ObjectId
    useEffect(() => {
        const checkAndFixUserId = async () => {
            if (storedUserId && storedUserId.includes('@')) {
                console.warn('USER_ID is an email, fetching correct ObjectId from backend...');
                try {
                    const token = typeof window !== 'undefined' ? localStorage.getItem('ACCESS_TOKEN') : null;
                    if (token) {
                        const res = await fetch(API_URLS.AUTH_ME, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        if (res.ok) {
                            const userData = await res.json();
                            const correctUserId = userData.user_id || userData.id;
                            if (correctUserId) {
                                console.log('Fixed USER_ID from', storedUserId, 'to', correctUserId);
                                localStorage.setItem('USER_ID', correctUserId);
                                setActualUserId(correctUserId);
                            }
                        }
                    }
                } catch (e) {
                    console.error('Failed to fetch correct user_id:', e);
                }
            } else {
                setActualUserId(storedUserId);
            }
        };
        checkAndFixUserId();
    }, [storedUserId]);

	// Initialize with welcome message only once
	useEffect(() => {
        if (!initialized && messages.length === 0) {
			const welcomeMsg: Message = { 
				role: 'assistant', 
				content: "👋 Hi! I'm your appointment booking assistant. I can help you book, cancel, or list appointments. What would you like to do?",
				timestamp: new Date()
			};
            // If user is not logged in, also prompt them to login first
            if (!loggedIn) {
                const loginPrompt: Message = {
                    role: 'assistant',
                    content: 'You need to login to chat. Please click the Login button at the top or the one below to continue.',
                    timestamp: new Date()
                };
                const initialMessages = [welcomeMsg, loginPrompt];
                setMessages(initialMessages);
                animateMessages(initialMessages);
            } else {
                const initialMessages = [welcomeMsg];
                setMessages(initialMessages);
                animateMessages(initialMessages);
            }
			setInitialized(true);
		}
    }, [initialized, messages.length, loggedIn]); // Check both initialized and messages length

	// Auto-scroll to bottom when new messages arrive
	useEffect(() => {
		// Use setTimeout to ensure DOM is updated before scrolling
		const timer = setTimeout(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
		}, 100);
		return () => clearTimeout(timer);
	}, [messages, visibleMessages, isTyping]);

	// Focus input on mount
	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	// Load services from backend for dynamic role selection
	useEffect(() => {
		const loadServices = async () => {
			try {
				const res = await fetch(API_URLS.ADMIN_SERVICES);
				if (res.ok) {
					const data = await res.json();
					const items = (data || []).map((s: { id?: string; _id?: string; name: string }) => ({ id: s.id || s._id || s.name, name: s.name }));
					setServices(items);
				}
			} catch {
				// ignore network errors; UI will fallback to static list
			}
		};
		loadServices();
	}, [apiBaseUrl]);

	// Function to fetch calendar availability data with debounce
	const fetchCalendarData = async (serviceName: string, forceRefresh: boolean = false) => {
		// Prevent repeated calls for the same service unless forced
		if (!forceRefresh && lastFetchedService === serviceName) {
			return;
		}
		setLastFetchedService(serviceName);
		
		try {
			console.log(`Fetching REAL calendar data for service: ${serviceName}`);
			
			// Find the service ID from the service name
			const service = services.find(s => s.name === serviceName);
			if (!service) {
				console.error('Service not found:', serviceName);
				setCalendarData([]);
				return;
			}
			
			const res = await fetch(`${API_URLS.AVAILABILITY_SLOTS}?service_id=${encodeURIComponent(service.id)}`);
			if (res.ok) {
				const data = await res.json() as Array<{ start_utc: string; end_utc: string; capacity: number; booked: number }>;
				console.log('REAL Calendar data received:', data);
				console.log('Service ID being used:', service.id);
				console.log('Service name:', serviceName);
				
				// Convert availability slots to calendar format
				if (data && data.length > 0) {
                    // Group slots by date and determine overall status for each date
                    const dateMap = new Map();
                    // const now = new Date();
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    
                    data.forEach((slot: { start_utc: string; end_utc: string; capacity: number; booked: number }) => {
                        const start = new Date(slot.start_utc);
                        const date = slot.start_utc.split('T')[0]; // Extract date from ISO string
                        
                        // The backend only counts confirmed appointments in 'booked', but capacity check
                        // includes both confirmed and pending. So we need to be more conservative.
                        // If booked >= capacity, it's definitely full. If booked < capacity, it might still be full
                        // due to pending appointments, so we'll let the backend handle the final check.
                        const availableSlots = Math.max(0, slot.capacity - slot.booked);
                        
                        // Use local time for comparison to match the calendar's timezone logic
                        // The calendar uses local time to determine if a date is "past"
                        // Consider slots as "future" if they're today or later
                        // This ensures today's available slots are shown even if some time has passed
                        const slotDate = new Date(start);
                        slotDate.setHours(0, 0, 0, 0);
                        const isFuture = slotDate >= today;
                        
                        if (!dateMap.has(date)) {
                            dateMap.set(date, {
                                date,
                                status: 'not_assigned',
                                slots: 0,
                                capacity: 0,
                                totalAvailable: 0,
                                hasFutureSlots: false
                            });
                        }
                        
                        const dateInfo = dateMap.get(date);
                        dateInfo.capacity += slot.capacity;
                        
                        // Track if this date has any future slots at all
                        if (isFuture) {
                            dateInfo.hasFutureSlots = true;
                            dateInfo.totalAvailable += availableSlots;
                            // Don't set status here - let the final processing handle it
                            if (availableSlots > 0) {
                                dateInfo.slots = (dateInfo.slots || 0) + availableSlots;
                            }
                        }
                    });
                    
                    // Process the final status for each date
                    const calendarData = Array.from(dateMap.values()).map(dateInfo => {
                        // If no future slots exist for this date, mark as not_assigned
                        if (!dateInfo.hasFutureSlots) {
                            dateInfo.status = 'not_assigned';
                        }
                        // If we have future slots but no availability, mark as full
                        else if (dateInfo.hasFutureSlots && dateInfo.totalAvailable === 0) {
                            dateInfo.status = 'full';
                        }
                        // If we have future slots with availability, keep as available
                        else if (dateInfo.hasFutureSlots && dateInfo.totalAvailable > 0) {
                            dateInfo.status = 'available';
                        }
                        
                        return dateInfo;
                    });
                    
                    console.log('DEBUG: Processed calendar data (future-aware):', calendarData);
                    console.log('DEBUG: Raw slot data:', data);
                    console.log('DEBUG: Current time:', new Date().toISOString());
                    console.log('DEBUG: Today date:', today.toISOString());
                    
                    // Debug each date's status
                    calendarData.forEach(dateInfo => {
                        console.log(`DEBUG: Date ${dateInfo.date}: status=${dateInfo.status}, hasFutureSlots=${dateInfo.hasFutureSlots}, totalAvailable=${dateInfo.totalAvailable}, capacity=${dateInfo.capacity}`);
                    });
					setCalendarData(calendarData);
				} else {
                    console.log('DEBUG: No availability data from API, setting empty calendar');
					setCalendarData([]);
				}
			} else {
				console.error('Failed to fetch calendar data:', res.status, res.statusText);
                // On API error, do not mislead the user; show no availability markers
				setCalendarData([]);
			}
		} catch (e) {
			console.error('Error fetching calendar data:', e);
            // On error, do not show fake availability
			setCalendarData([]);
		}
	};

    // Reset local confirmation flag when backend asks for a fresh confirmation
    useEffect(() => {
        const needsConfirmation = (
            (((!bookingState?.action || bookingState?.action === 'book') && bookingState?.service && bookingState?.date && bookingState?.time && bookingState?.reason)) ||
            (bookingState?.action === 'update' && bookingState?.step === 'update_final_confirmation') ||
            (bookingState?.action === 'cancel' && bookingState?.step === 'cancel_confirmation')
        );
        if (needsConfirmation) {
            setConfirmationDismissed(false);
        }
    }, [bookingState?.action, bookingState?.step, bookingState?.service, bookingState?.date, bookingState?.time, bookingState?.reason]);

	// Generate empty calendar data - no more mock data
	// const generateEmptyCalendarData = () => {
	// 	return [];
	// };

	const sendMessage = async () => {
        if (!input.trim() || loading) return;
        
        // Input validation
        if (input.length > 1000) {
            const errorMsg: Message = { 
                role: 'assistant', 
                content: 'Message is too long. Please keep it under 1000 characters.', 
                timestamp: new Date() 
            };
            const newMessages = [...messages, errorMsg];
            setMessages(newMessages);
            setVisibleMessages(newMessages.length);
            return;
        }
        if (!loggedIn) {
            // Soft guard: remind to login and do not send to backend
            const guardMsg: Message = { 
                role: 'assistant', 
                content: 'Please login first to continue the conversation.',
                timestamp: new Date()
            };
            const newMessages = [...messages, guardMsg];
            setMessages(newMessages);
            setVisibleMessages(newMessages.length);
            return;
        }
		
		const userMsg: Message = { 
			role: 'user', 
			content: input.trim(),
			timestamp: new Date()
		};
		const newMessages = [...messages, userMsg];
		setMessages(newMessages);
		setVisibleMessages(newMessages.length);
		setInput('');
		setLoading(true);
		
		// Scroll to bottom immediately after user message is added
		setTimeout(() => {
			messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
		}, 100);
		
		try {
            // Detect browser timezone and send to backend
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
			
			// Create AbortController for timeout
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
			
			const res = await fetch(API_URLS.CHAT, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ 
					user_id: resolvedUserId, 
					message: userMsg.content,
                    conversation_id: conversationId,
                    timezone: tz
				}),
				signal: controller.signal
			});
			
			clearTimeout(timeoutId);
			const data = await parseJsonSafe(res) as ApiResponse;
			if (!res.ok) {
				throw new Error(buildHttpErrorMessage(res.status, data));
			}
            const content = data.reply || data.message || '';
            // Trust the backend response completely - no hardcoded overrides
			// Trust the backend response for reason as well
            const botMsg: Message = { 
				role: 'assistant', 
				content: content || 'I apologize, but I didn\'t receive a valid response. Please try again.',
				timestamp: new Date(),
				bookingState: data.booking_state,
				availableTimes: data.available_times,
				timeSlots: data.time_slots,
				showCalendar: data.show_calendar,
				showVisualCalendar: data.show_visual_calendar,
				calendarData: data.calendar_data
			};
            setMessages((prev) => {
                const lastAssistantIndex = (() => {
                    for (let i = prev.length - 1; i >= 0; i--) {
                        if (prev[i].role === 'assistant') return i;
                    }
                    return -1;
                })();
                const lastAssistant = lastAssistantIndex >= 0 ? (prev[lastAssistantIndex] as Message) : null;
                const isDuplicateText = lastAssistant && lastAssistant.content === botMsg.content;
                const hasNewSlots = Boolean(botMsg.timeSlots && botMsg.timeSlots.length);
                const lastHadSlots = Boolean(lastAssistant?.timeSlots && lastAssistant.timeSlots.length);
                const sameTimeSlots = JSON.stringify(lastAssistant?.timeSlots || []) === JSON.stringify(botMsg.timeSlots || []);
                const sameAvailTimes = JSON.stringify(lastAssistant?.availableTimes || []) === JSON.stringify(botMsg.availableTimes || []);
                
                let newMessages;
                if (isDuplicateText && hasNewSlots && !lastHadSlots) {
                    const updated = [...prev];
                    updated[lastAssistantIndex] = { ...lastAssistant, ...botMsg };
                    newMessages = updated;
                } else if (isDuplicateText && sameTimeSlots && sameAvailTimes) {
                    return prev;
                } else {
                    newMessages = [...prev, botMsg];
                }
                
                // Animate the new message
                setTimeout(() => {
                    setVisibleMessages(newMessages.length);
                    // Scroll to bottom after message is visible
                    setTimeout(() => {
                        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                }, 500);
                
                return newMessages;
            });
			
			// Update conversation state
			if (data.conversation_id && typeof data.conversation_id === 'string') {
				setConversationId(data.conversation_id);
			}
            if (data.intent && typeof data.intent === 'string') setIntent(data.intent);
            if (data.booking_state) {
				setBookingState(data.booking_state);
				onBookingStateChange?.(data.booking_state);
                setBookingActive(Object.keys(data.booking_state || {}).length > 0);
                
				// Fetch calendar data when service is selected
                if (data.booking_state.service && typeof data.booking_state.service === 'string' && !data.booking_state.date) {
                    fetchCalendarData(data.booking_state.service);
                }
				// If we're back to selecting a time, show slots again
				if (data.booking_state.service && data.booking_state.date && !data.booking_state.time) {
					setHideTimeSlots(false);
				}
			}
		} catch (e: unknown) {
			const error = e as Error;
			console.error('Chat error:', error);
			let errorMessage = 'Sorry, I encountered an error. Please try again.';
			
			// Provide more specific error messages
			if (error?.message?.includes('Failed to fetch')) {
				errorMessage = 'Network error: Unable to connect to the server. Please check your connection and try again.';
			} else if (error?.message?.includes('timeout')) {
				errorMessage = 'Request timed out. The server might be busy. Please try again.';
			} else if (error?.message) {
				errorMessage = error.message;
			}
			
			const errorMsg: Message = { 
				role: 'assistant', 
				content: errorMessage,
				timestamp: new Date()
			};
			const newMessages = [...messages, errorMsg];
			setMessages(newMessages);
			setVisibleMessages(newMessages.length);
		} finally {
			setLoading(false);
			// Focus input after sending message
			setTimeout(() => inputRef.current?.focus(), 100);
		}
	};

	// Quick helper to send a given text (used by date picker)
	const sendQuick = async (text: string) => {
		if (!text.trim() || loading) return;
		const userMsg: Message = { role: 'user', content: text.trim(), timestamp: new Date() };
		const newMessages = [...messages, userMsg];
		setMessages(newMessages);
		setVisibleMessages(newMessages.length);
		setLoading(true);
		try {
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
			
			// Create AbortController for timeout
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
			
			const res = await fetch(API_URLS.CHAT, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ 
					user_id: resolvedUserId, 
					message: userMsg.content,
                    conversation_id: conversationId,
                    timezone: tz
				}),
				signal: controller.signal
			});
			
			clearTimeout(timeoutId);
			const data = await parseJsonSafe(res) as ApiResponse;
			if (!res.ok) {
				throw new Error(buildHttpErrorMessage(res.status, data));
			}
            const content = data.reply;
            // Trust the backend response completely - no hardcoded overrides
			// Trust the backend response for reason as well
            const botMsg: Message = { 
                role: 'assistant', 
                content: content || '', 
                timestamp: new Date(), 
                bookingState: data.booking_state, 
                availableTimes: data.available_times, 
                timeSlots: data.time_slots, 
                showCalendar: data.show_calendar, 
                showVisualCalendar: data.show_visual_calendar, 
                calendarData: data.calendar_data 
            };
            
            // Reset hideTimeSlots when new time slots are available
            if (data.time_slots && Array.isArray(data.time_slots) && data.time_slots.length > 0) {
                console.log('DEBUG: Resetting hideTimeSlots, received time slots:', data.time_slots);
                console.log('DEBUG: Current hideTimeSlots state before reset:', hideTimeSlots);
                setHideTimeSlots(false);
                // Force a re-render by using a callback
                setTimeout(() => {
                    console.log('DEBUG: hideTimeSlots should now be false, checking...');
                    setHideTimeSlots(prev => {
                        console.log('DEBUG: hideTimeSlots state in callback:', prev);
                        return false;
                    });
                }, 0);
                // Scroll to bottom after time slots are rendered
                setTimeout(() => {
                    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                }, 200);
            }
            
            // Also reset hideTimeSlots when starting a new operation that might need time slots
            if (data.booking_state && (
                (data.booking_state.step === 'select_time') || 
                (data.booking_state.step === 'update_new_time') ||
                (data.booking_state.service && data.booking_state.date && !data.booking_state.time)
            )) {
                console.log('DEBUG: Resetting hideTimeSlots for time selection step');
                setHideTimeSlots(false);
            }
            
            // Force reset hideTimeSlots for update operations
            if (data.intent === 'update' && data.time_slots && Array.isArray(data.time_slots) && data.time_slots.length > 0) {
                console.log('DEBUG: Force resetting hideTimeSlots for update operation with time slots');
                setHideTimeSlots(false);
            }
            setMessages((prev) => {
                const lastAssistantIndex = (() => {
                    for (let i = prev.length - 1; i >= 0; i--) {
                        if (prev[i].role === 'assistant') return i;
                    }
                    return -1;
                })();
                const lastAssistant = lastAssistantIndex >= 0 ? (prev[lastAssistantIndex] as Message) : null;
                const isDuplicateText = lastAssistant && lastAssistant.content === botMsg.content;
                const hasNewSlots = Boolean(botMsg.timeSlots && botMsg.timeSlots.length);
                const lastHadSlots = Boolean(lastAssistant?.timeSlots && lastAssistant.timeSlots.length);
                const sameTimeSlots = JSON.stringify(lastAssistant?.timeSlots || []) === JSON.stringify(botMsg.timeSlots || []);
                const sameAvailTimes = JSON.stringify(lastAssistant?.availableTimes || []) === JSON.stringify(botMsg.availableTimes || []);
                let newMessages;
                if (isDuplicateText && hasNewSlots && !lastHadSlots) {
                    const updated = [...prev];
                    updated[lastAssistantIndex] = { ...lastAssistant, ...botMsg };
                    newMessages = updated;
                } else if (isDuplicateText && sameTimeSlots && sameAvailTimes) {
                    return prev;
                } else {
                    newMessages = [...prev, botMsg];
                }
                
                // Animate the new message
                setTimeout(() => {
                    setVisibleMessages(newMessages.length);
                }, 500);
                
                return newMessages;
            });
			if (data.conversation_id && typeof data.conversation_id === 'string') setConversationId(data.conversation_id);
            if (data.intent && typeof data.intent === 'string') setIntent(data.intent);
            if (data.booking_state) {
				setBookingState(data.booking_state);
				onBookingStateChange?.(data.booking_state);
                setBookingActive(Object.keys(data.booking_state || {}).length > 0);
                
                // Fetch calendar data when service is selected
                if (data.booking_state.service && typeof data.booking_state.service === 'string' && !data.booking_state.date) {
                    fetchCalendarData(data.booking_state.service);
                    // Scroll to bottom when calendar is shown
                    setTimeout(() => {
                        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                    }, 300);
                }
                
                // Handle conversation end gracefully
                if (data.booking_state.conversation_ended === true) {
                    // Clear current booking state but keep conversation history
                    setTimeout(() => {
                        setBookingState({});
                        setIntent(null);
                        setBookingActive(false);
                        
                        // Show a subtle indicator that session has ended
                        const sessionEndMsg: Message = { 
                            role: 'assistant', 
                            content: "💬 **New session started** - I'm ready to help with anything you need!", 
                            timestamp: new Date() 
                        };
                        const newMessages = [...messages, sessionEndMsg];
                        setMessages(newMessages);
                        setVisibleMessages(newMessages.length);
                    }, 1000);
                }
                
                // Check if this is a successful operation that affects availability and refresh calendar
                // Only refresh when the operation is truly complete (booking state is cleared)
                const isOperationComplete = (
                    (data.intent === 'cancel' && data.reply && typeof data.reply === 'string' && data.reply.includes('Cancellation Request Submitted')) ||
                    (data.intent === 'update' && data.reply && typeof data.reply === 'string' && data.reply.includes('Update request submitted for approval')) ||
                    (data.intent === 'book' && data.reply && typeof data.reply === 'string' && (data.reply.includes('appointment') || data.reply.includes('booking')))
                );
                
                // Only refresh calendar when operation is complete AND booking state is cleared
                if (isOperationComplete && data.booking_state && Object.keys(data.booking_state).length === 0) {
                    console.log('DEBUG: Operation completed, refreshing calendar data');
                    // If we have a service in the previous booking state, refresh its calendar
                    if (bookingState?.service) {
                        setTimeout(() => {
                            fetchCalendarData(bookingState.service as string, true);
                        }, 1000); // Increased delay to ensure operation is fully complete
                    }
                }
			}
		} catch (e: unknown) {
			const error = e as Error;
			console.error('Chat error:', error);
			const errorMsg: Message = { 
				role: 'assistant', 
				content: error?.message || 'Sorry, I encountered an error. Please try again. If the problem persists, please refresh the page.', 
				timestamp: new Date() 
			};
			const newMessages = [...messages, errorMsg];
			setMessages(newMessages);
			setVisibleMessages(newMessages.length);
		} finally {
			setLoading(false);
		}
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			sendMessage();
		}
	};

	const formatTime = (date: Date) => {
		return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	};

	// Convert a 12-hour label like "2:00 PM" to 24-hour "14:00"
	const to24h = (label: string): string => {
		try {
			const m = label.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
			if (!m) return label; // already 24h or unexpected; pass through
			let h = parseInt(m[1], 10);
			const min = m[2];
			const suffix = m[3].toUpperCase();
			if (suffix === 'AM') {
				if (h === 12) h = 0;
			} else {
				if (h !== 12) h += 12;
			}
			return `${String(h).padStart(2,'0')}:${min}`;
		} catch { return label; }
	};

	// Strip markdown bold markers from assistant text (e.g., **text**)
	const sanitize = (text: string) => (text || '').replace(/\*\*/g, '');

// Booking progress is now rendered in the sidebar; no in-chat progress UI


	return (
		<div className="flex flex-col h-full bg-white">
			{/* Messages Container */}
			<div className="flex-1 overflow-y-auto p-6 space-y-4">
				{loading && (
					<div className="flex justify-start">
						<div className="bg-gray-100 text-gray-800 px-4 py-3 rounded-2xl">
							<LoadingSpinner size="sm" text="Thinking..." />
						</div>
					</div>
				)}
				{isTyping && !loading && (
					<div className="flex justify-start">
						<div className="bg-gray-100 text-gray-800 px-4 py-3 rounded-2xl">
							<div className="flex items-center space-x-2">
								<div className="flex space-x-1">
									<div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
									<div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
									<div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
								</div>
								<span className="text-sm text-gray-600">AI is typing...</span>
							</div>
						</div>
					</div>
				)}
				{messages.slice(0, visibleMessages).map((msg, idx) => (
					<div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs sm:max-w-md lg:max-w-lg xl:max-w-xl px-4 py-3 rounded-2xl ${
							msg.role === 'user' 
								? 'bg-blue-500 text-white' 
								: 'bg-gray-100 text-gray-800'
						}`}>
				<div className="text-sm leading-relaxed whitespace-pre-wrap">
					{msg.role === 'assistant' 
						? (msg.content ? sanitize(msg.content) : 'No response')
						: (msg.content ? formatTimeInMessage(msg.content) : 'Message not available')}
				</div>
							{/* Modern Time Slot Grid */}
										{msg.role === 'assistant' && msg.timeSlots && Array.isArray(msg.timeSlots) && msg.timeSlots.length > 0 && (!hideTimeSlots || (msg.content.includes('Here are the available time slots for') && msg.content.includes('Please select one'))) ? (
								<div className="mt-4">
									<div className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
										<span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
										Select a time slot
									</div>
									<div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
										{msg.timeSlots.map((slot, index) => {
											const isSelected = selectedSlot === slot.label;
											return (
												<button
													key={index}
																				onClick={() => {
														if (slot.available) {
															setSelectedSlot(slot.label);
										// Prefer backend-provided 24h start; fallback to converting 12h label
										const timeStr = (slot as { start_24h?: string }).start_24h ? (slot as { start_24h?: string }).start_24h : to24h(slot.start);
																						setHideTimeSlots(true);
																						sendQuick(timeStr || '');
														}
													}}
													disabled={!slot.available}
													className={`group relative w-full px-4 py-4 rounded-2xl border-2 text-sm font-semibold transition-all duration-300 transform hover:scale-105 ${
														slot.available
															? isSelected
																? 'bg-blue-600 text-white border-blue-400 shadow-lg shadow-blue-500/25'
																: 'bg-white/90 text-gray-800 border-gray-200 hover:bg-blue-50 hover:border-blue-300 hover:shadow-md'
															: 'bg-gray-100/50 text-gray-400 border-gray-200 cursor-not-allowed opacity-60'
													}`}
												>
													<span className="relative z-10">{slot.label}</span>
													{slot.available && !isSelected && (
														<div className="absolute inset-0 rounded-2xl bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
													)}
												</button>
											);
										})}
									</div>
								</div>
							) : null}
							{/* Smart suggestions from humanized bot */}
							{msg.role === 'assistant' && msg.bookingState?.suggestions ? (
								<div className="mt-3">
									<div className="text-xs text-gray-600 mb-2">Quick options:</div>
									<div className="flex flex-wrap gap-2">
										{Array.isArray(msg.bookingState.suggestions) && msg.bookingState.suggestions.map((suggestion: string, index: number) => (
											<button
												key={index}
												onClick={() => sendQuick(suggestion)}
												disabled={loading}
												className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors disabled:opacity-50"
											>
												{suggestion}
											</button>
										))}
									</div>
								</div>
							) : null}
							{/* Next question from humanized bot */}
							{msg.role === 'assistant' && msg.bookingState?.next_question ? (
								<div className="mt-3 p-2 bg-blue-50 rounded-lg border-l-4 border-blue-400">
									<div className="text-sm text-blue-800 font-medium">
										{String(msg.bookingState.next_question || '')}
									</div>
								</div>
							) : null}
							{msg.timestamp && (
								<div className={`text-xs mt-2 ${
									msg.role === 'user' ? 'text-blue-100' : 'text-gray-500'
								}`}>
									{formatTime(msg.timestamp)}
								</div>
							)}
						</div>
					</div>
				))}




				{/* Reason input removed intentionally; users can type reason in the main box if needed */}

				{/* Hide inline time picker; rely on slot grid under assistant message */}
				
                {/* Modern Confirmation Buttons */}
                {(
                    (((!bookingState?.action || bookingState?.action === 'book') && bookingState?.service && bookingState?.date && bookingState?.time && bookingState?.reason)) ||
                    (bookingState?.action === 'update' && bookingState?.step === 'update_final_confirmation') ||
                    (bookingState?.action === 'cancel' && bookingState?.step === 'cancel_confirmation')
                ) && !confirmationDismissed && (
					<div className="flex justify-start animate-slide-up">
						<div className="bg-white text-gray-800 px-6 py-4 rounded-3xl border border-blue-200 shadow-lg">
							<div className="text-sm font-semibold mb-3 flex items-center">
								<span className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></span>
								{bookingState?.action === 'cancel' ? 'Confirm cancellation?' : 'Confirm this appointment?'}
							</div>
							<div className="flex items-center space-x-3">
								<button 
									onClick={() => { setConfirmationDismissed(true); sendQuick('yes'); }} 
									className={`group relative px-6 py-3 text-white text-sm font-semibold rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-lg shadow-md ${
										bookingState?.action === 'cancel' 
											? 'bg-red-600 hover:bg-red-700' 
											: 'bg-green-600 hover:bg-green-700'
									}`}
								>
									<span className="flex items-center space-x-2">
										<span>{bookingState?.action === 'cancel' ? '✓' : '✓'}</span>
										<span>{bookingState?.action === 'cancel' ? 'Yes, Cancel' : 'Yes, Confirm'}</span>
									</span>
								</button>
								<button 
									onClick={() => { setConfirmationDismissed(true); sendQuick('no'); }} 
									className="group relative px-6 py-3 bg-gray-500 text-white text-sm font-semibold rounded-2xl hover:bg-gray-600 transition-all duration-300 hover:scale-105 hover:shadow-lg shadow-md"
								>
									<span className="flex items-center space-x-2">
										<span>✕</span>
										<span>No, {bookingState?.action === 'cancel' ? 'Keep' : 'Cancel'}</span>
									</span>
								</button>
							</div>
						</div>
					</div>
				)}

				{loading && (
					<div className="flex justify-start">
						<div className="bg-gray-50 text-gray-800 px-4 py-3 rounded-2xl border border-gray-200 shadow-sm">
							<div className="flex items-center space-x-3">
								<div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent"></div>
								<span className="text-sm font-medium">Thinking...</span>
							</div>
						</div>
					</div>
				)}
				<div ref={messagesEndRef} />
			</div>

			{/* Input Area */}
            <div className="border-t border-gray-200 bg-gray-50 p-4">
                {!loggedIn && (
                    <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                        <div className="flex items-center gap-3 text-sm text-amber-800">
                            <span className="text-lg">🔐</span>
                            <span className="font-medium">Please login to start chatting.</span>
                            <a href="/login" className="ml-auto px-4 py-2 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors font-medium">Login</a>
                        </div>
                    </div>
                )}
				<div className="flex items-center space-x-3">
					<input
						ref={inputRef}
						type="text"
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyPress={handleKeyPress}
						placeholder="Type your message..."
						className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                        disabled={loading || !loggedIn}
						autoComplete="off"
						maxLength={1000}
					/>
					<div className="text-gray-400 text-sm">
						{input.length}/1000
					</div>
					<button
						onClick={sendMessage}
                        disabled={loading || !input.trim() || !loggedIn}
						className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
					>
						{loading ? 'Sending...' : 'Send'}
					</button>
				</div>
				<div className="flex items-center justify-center mt-3">
					<div className="flex items-center gap-2 text-sm text-gray-500">
						<span>💡</span>
						<span>Try: &quot;I want to book an appointment&quot; or &quot;Show my appointments&quot;</span>
					</div>
				</div>
			</div>
		</div>
	);
};

export default ChatBox;