'use client';
import ComponentCard from "@/components/common/ComponentCard";
import { ChatIcon, TrashBinIcon } from "@/icons";
import { MessageSquare, MessageCircle, Bot } from 'lucide-react';
import { useEffect, useState, useMemo } from "react";



import ConfirmModal from '@/components/ui/modal/ConfirmModal';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { listSessions, deleteSession as apiDeleteSession, getWhatsAppBotSessions, getWhatsAppBotSession, deleteWhatsAppBotSession, getConversationDetails, getTelegramBotSessions, getTelegramBotSession, getInstagramUsers, getInstagramChatHistory } from '@/utils/api';
import DashboardHeader from '@/components/header/DashboardHeader';

const TELEGRAM_BOT_API_URL = 'https://telegram-aiagent.mobiloitte.io';
const INSTAGRAM_BOT_API_URL = 'https://instabot-aiagent.mobiloitte.io';



interface Session {
    title: string;
    domain: string;
    created_at?: string;
    created_on?: string;
    session_id?: string;
    message_count?: number;
    updated_at?: number;
    status?: 'active' | 'resolved' | 'pending';
    user_identifier?: string;
    first_message?: string;
    last_message_time?: number;
}



interface WhatsAppSession {
    session_id: string;
    created_at: number;
    message_count: number;
    title: string;
    updated_at: number;
    user_type?: string;
    status?: 'active' | 'resolved' | 'pending';
    user_identifier?: string;
    first_message?: string;
    last_message_time?: number;
}



interface InstagramUser {
    _id: string;
    message_count: number;
    last_activity: string;
    first_activity: string;
    // Add session-like properties for compatibility
    session_id: string;
    title: string;
    created_at: number;
    updated_at: number;
    status: 'active' | 'resolved' | 'pending';
    user_identifier: string;
    first_message: string;
    last_message_time: number;
}

interface InstagramChatHistory {
    user_id: string;
    total_messages: number;
    messages: Array<{
        _id: string;
        user_id: string;
        message: string;
        message_type: string;
        platform: string;
        timestamp: string;
        metadata: {
            platform: string;
            message_id: string;
        };
    }>;
}

interface WhatsAppSessionDetail extends WhatsAppSession {
    messages: Array<{
        role: string;
        text: string;
    }>;
}



interface TelegramSession {
    session_id: string;
    created_at: number;
    message_count: number;
    title: string;
    updated_at: number;
    status?: 'active' | 'resolved' | 'pending';
    user_identifier?: string;
    first_message?: string;
    last_message_time?: number;
}



interface TelegramSessionDetail extends TelegramSession {
    user_id: number;
    start_time: string;
    messages: Array<{
        type: string;
        user: {
            message: string;
            timestamp: string;
        } | null;
        bot: {
            message: string;
            timestamp: string;
        };
    }>;
}



interface SessionsApiResponse {
    message?: string;
    domain?: string;
    sessions?: Session[];
    total_sessions?: number;
}



interface DeleteResponse {
    message?: string;
}



interface ConversationMessage {
    query: string;
    response: string;
    timestamp: string;
}



interface ConversationDetails {
    title: string;
    domain: string;
    history: ConversationMessage[];
}



interface ConversationApiResponse {
    message: string;
    conversation: ConversationDetails;
}



type TabType = 'chatbot' | 'whatsapp' | 'telegram' | 'instagram';



export default function InboxPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<TabType>('chatbot');
    const [sessions, setSessions] = useState<Session[]>([]);
    const [whatsappSessions, setWhatsappSessions] = useState<WhatsAppSession[]>([]);
    const [telegramSessions, setTelegramSessions] = useState<TelegramSession[]>([]);
    const [instagramUsers, setInstagramUsers] = useState<InstagramUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmMsg, setConfirmMsg] = useState("");
    const [onConfirmAction, setOnConfirmAction] = useState<() => void>(() => () => { });
    const [toast, setToast] = useState<{ show: boolean; message: string; variant: 'success' | 'error' }>({ show: false, message: '', variant: 'success' });

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Search and filter state
    const [searchQuery, setSearchQuery] = useState("");
    const [domainFilter, setDomainFilter] = useState<string>('all');



    // Clear all modal state
    const [showClearModal, setShowClearModal] = useState(false);



    // New inbox features state
    const [selectedSession, setSelectedSession] = useState<Session | WhatsAppSession | TelegramSession | InstagramUser | null>(null);
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'resolved' | 'pending'>('all');
    const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
    const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'waiting'>('newest');



    // Conversation details state
    const [conversationDetails, setConversationDetails] = useState<ConversationDetails | null>(null);
    const [loadingConversation, setLoadingConversation] = useState(false);



    // Domain configuration
    const AVAILABLE_DOMAINS = useMemo(() => ['domain_1', 'domain_2', 'domain_3'], []);



    // Function to get first message from conversation
    const getFirstMessageFromConversation = async (domain: string, title: string): Promise<string> => {
        try {
            const response: ConversationApiResponse = await getConversationDetails(domain, title);
            if (response.conversation && response.conversation.history.length > 0) {
                return response.conversation.history[0].query;
            }
        } catch (error) {
            console.warn(`Failed to fetch first message for ${domain}/${title}:`, error);
        }
        return 'No message preview available';
    };



    // Function to fetch conversation details
    const fetchConversationDetails = async (session: Session | WhatsAppSession | TelegramSession | InstagramUser) => {
        const isTelegram = 'session_id' in session && session.session_id?.includes('_');
        const isInstagram = 'user_identifier' in session && session.user_identifier?.includes('Instagram');
        const domain = isInstagram ? 'instagram' : ('domain' in session ? session.domain : isTelegram ? 'telegram' : 'whatsapp');
        if (!domain || !session.title) {
            console.error('Missing domain or title for conversation');
            return;
        }

        setLoadingConversation(true);
        try {
            if (domain === 'telegram') {
                // For Telegram sessions, we'll use the session details directly
                setConversationDetails(null); // Telegram doesn't use the same conversation format
            } else if (domain === 'instagram' && 'session_id' in session && session.session_id) {
                // Instagram: fetch chat history, sort ascending, and map both user/bot messages
                const chatHistory: InstagramChatHistory = await getInstagramChatHistory(session.session_id);
                const history =
                    Array.isArray(chatHistory?.messages)
                        ? [...chatHistory.messages]
                            .sort((a, b) => {
                                const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
                                const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
                                return ta - tb;
                            })
                            .map(msg => {
                                const type = (msg.message_type || '').toString().toLowerCase();
                                const timestamp = msg.timestamp || new Date().toISOString();
                                return {
                                    query: type === 'user' ? msg.message : '',
                                    response: type !== 'user' ? msg.message : '',
                                    timestamp,
                                };
                            })
                        : [];

                setConversationDetails({
                    title: session.title,
                    domain: 'instagram',
                    history,
                });
            } else {
                const response: ConversationApiResponse = await getConversationDetails(domain, session.title);
                if (response.conversation) {
                    setConversationDetails(response.conversation);
                } else {
                    console.error('No conversation data received');
                    setConversationDetails(null);
                }
            }
        } catch (error) {
            console.error('Failed to fetch conversation details:', error);
            setConversationDetails(null);
        } finally {
            setLoadingConversation(false);
        }
    };







    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                // Always fetch all channel data to show counts for all channels
                const fetchPromises: Promise<void>[] = [];

                // Fetch chatbot sessions
                fetchPromises.push(
                    (async () => {
                        try {
                            // Fetch sessions from all available domains
                            const domainPromises = AVAILABLE_DOMAINS.map(domain =>
                                listSessions(domain).catch(error => {
                                    console.warn(`Failed to fetch sessions for ${domain}:`, error);
                                    return { sessions: [], domain, total_sessions: 0 };
                                })
                            );

                            const domainResults: SessionsApiResponse[] = await Promise.all(domainPromises);

                            // Aggregate sessions from all domains
                            const aggregated: Session[] = [];

                            for (let index = 0; index < domainResults.length; index++) {
                                const result = domainResults[index];
                                const domain = AVAILABLE_DOMAINS[index];
                                const sessions = result?.sessions || [];

                                // Process each session and fetch first message only if this is the active tab
                                for (const session of sessions) {
                                    if (activeTab === 'chatbot') {
                                        const firstMessage = await getFirstMessageFromConversation(domain, session.title);
                                        aggregated.push({
                                            ...session,
                                            status: session.status || 'active',
                                            user_identifier: session.user_identifier || `Guest-${session.title.slice(-6)}`,
                                            first_message: firstMessage,
                                            last_message_time: session.updated_at || (session.created_at ? new Date(session.created_at).getTime() / 1000 : Date.now() / 1000)
                                        });
                                    } else {
                                        // For inactive tabs, just add basic info without fetching first message
                                        aggregated.push({
                                            ...session,
                                            status: session.status || 'active',
                                            user_identifier: session.user_identifier || `Guest-${session.title.slice(-6)}`,
                                            first_message: session.first_message || 'No message preview available',
                                            last_message_time: session.updated_at || (session.created_at ? new Date(session.created_at).getTime() / 1000 : Date.now() / 1000)
                                        });
                                    }
                                }
                            }

                            setSessions(aggregated);
                        } catch (error) {
                            console.error('Error fetching chatbot sessions:', error);
                        }
                    })()
                );

                // Fetch WhatsApp sessions
                fetchPromises.push(
                    (async () => {
                        try {
                            const whatsappData = await getWhatsAppBotSessions();
                            const enhancedWhatsappData = (whatsappData || []).map((session: WhatsAppSession) => ({
                                ...session,
                                status: session.status || 'active',
                                user_identifier: session.user_identifier || `WhatsApp-${session.session_id}`,
                                first_message: session.first_message || 'No message preview available',
                                last_message_time: session.updated_at || session.created_at || Date.now() / 1000,
                                user_type: session.user_type
                            }));
                            setWhatsappSessions(enhancedWhatsappData);
                        } catch (error) {
                            console.error('Error fetching WhatsApp sessions:', error);
                        }
                    })()
                );

                // Fetch Telegram sessions
                fetchPromises.push(
                    (async () => {
                        try {
                            const telegramData = await getTelegramBotSessions();
                            const enhancedTelegramData = (telegramData || []).map((session: TelegramSession) => ({
                                ...session,
                                status: session.status || 'active',
                                user_identifier: session.user_identifier || `Telegram-${session.session_id.split('_')[0]}`,
                                first_message: session.first_message || 'No message preview available',
                                last_message_time: session.updated_at || session.created_at
                            }));
                            setTelegramSessions(enhancedTelegramData);
                        } catch (error) {
                            console.error('Error fetching Telegram sessions:', error);
                        }
                    })()
                );

                // Fetch Instagram users (remove hard limits; fetch broader window)
                fetchPromises.push(
                    (async () => {
                        try {
                            const instagramData = await getInstagramUsers(1000, 30);
                            const enhancedInstagramData = (instagramData?.users || []).map((user: { _id: string; message_count: number; first_activity: string; last_activity: string;[key: string]: unknown }) => ({
                                ...user,
                                // Convert Instagram user data to session-like format
                                session_id: user._id,
                                title: `Instagram User ${user._id.slice(-6)}`,
                                message_count: user.message_count,
                                created_at: new Date(user.first_activity).getTime() / 1000,
                                updated_at: new Date(user.last_activity).getTime() / 1000,
                                status: 'active' as const,
                                user_identifier: `Instagram-${user._id}`,
                                first_message: 'Instagram conversation started',
                                last_message_time: new Date(user.last_activity).getTime() / 1000
                            })) as InstagramUser[];
                            setInstagramUsers(enhancedInstagramData);
                        } catch (instagramError) {
                            console.error('Error loading Instagram data:', instagramError);
                            setInstagramUsers([]);
                        }
                    })()
                );

                // Fetch all data in parallel
                await Promise.all(fetchPromises);
            } catch (error) {
                console.error('Error fetching sessions:', error);
            } finally {
                setIsLoading(false);
            }
        };



        fetchData();
    }, [activeTab, AVAILABLE_DOMAINS]);



    const showToast = (message: string, variant: 'success' | 'error' = 'success') => {
        setToast({ show: true, message, variant });
        window.setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
    };







    const handlePreviousChat = async (title: string, sessionId?: string) => {
        if (activeTab === 'chatbot') {
            router.push(`/previous-chat?title=${encodeURIComponent(title)}`);
        } else if (activeTab === 'whatsapp' && sessionId) {
            try {
                // Remove '+' prefix if present (API expects session_id without '+' in URL)
                const cleanSessionId = sessionId.startsWith('+') ? sessionId.slice(1) : sessionId;
                // Fetch WhatsApp session details
                const sessionDetail: WhatsAppSessionDetail = await getWhatsAppBotSession(cleanSessionId);

                // Store session details in localStorage or state for the chat page to use
                if (typeof window !== 'undefined') {
                    localStorage.setItem('whatsappSessionDetail', JSON.stringify(sessionDetail));
                }

                // Navigate to chat page with session details (use original sessionId for URL)
                router.push(`/previous-chat?session_id=${encodeURIComponent(sessionId)}&type=whatsapp`);
            } catch (error) {
                console.error('Error fetching WhatsApp session details:', error);
                showToast('Failed to load WhatsApp session details. Please try again.', 'error');
            }
        } else if (activeTab === 'telegram' && sessionId) {
            try {
                // Fetch Telegram session details
                const sessionDetail: TelegramSessionDetail = await getTelegramBotSession(sessionId);

                // Store session details in localStorage or state for the chat page to use
                if (typeof window !== 'undefined') {
                    localStorage.setItem('telegramSessionDetail', JSON.stringify(sessionDetail));
                }

                // Navigate to chat page with session details
                router.push(`/previous-chat?session_id=${encodeURIComponent(sessionId)}&type=telegram`);
            } catch (error) {
                console.error('Error fetching Telegram session details:', error);
                showToast('Failed to load Telegram session details. Please try again.', 'error');
            }
        } else if (activeTab === 'instagram' && sessionId) {
            try {
                // Fetch Instagram chat history
                const chatHistory: InstagramChatHistory = await getInstagramChatHistory(sessionId);
                // Sort messages ascending so newest appears at the bottom and keep both user/bot
                if (Array.isArray(chatHistory?.messages)) {
                    chatHistory.messages = [...chatHistory.messages].sort((a, b) => {
                        const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
                        const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
                        return ta - tb;
                    });
                }

                // Store chat history in localStorage for the chat page to use
                if (typeof window !== 'undefined') {
                    localStorage.setItem('instagramChatHistory', JSON.stringify(chatHistory));
                }

                // Navigate to chat page with chat history
                router.push(`/previous-chat?session_id=${encodeURIComponent(sessionId)}&type=instagram`);
            } catch (error) {
                console.error('Error fetching Instagram chat history:', error);
                showToast('Failed to load Instagram chat history. Please try again.', 'error');
            }
        } else {
            showToast('Session ID not available for this conversation.', 'error');
        }
    };



    const handleDeleteSession = (title: string, domain: string, sessionId?: string) => {
        if (activeTab === 'whatsapp') {
            setConfirmMsg(`Are you sure you want to delete WhatsApp session '${sessionId || title}'?`);
            setOnConfirmAction(() => async () => {
                setConfirmOpen(false);
                try {
                    if (!sessionId) throw new Error('Missing session id');
                    const result = await deleteWhatsAppBotSession(sessionId);
                    // Remove from local state on success
                    setWhatsappSessions(prev => prev.filter(session => session.session_id !== sessionId));
                    const deleted = Array.isArray(result?.deleted_ids) ? result.deleted_ids.join(', ') : sessionId;
                    showToast(`Deleted WhatsApp session(s): ${deleted}`, 'success');
                } catch {
                    showToast('Error deleting WhatsApp session. It may not exist anymore.', 'error');
                }
            });
        } else if (activeTab === 'telegram') {
            setConfirmMsg(`Are you sure you want to delete Telegram session '${sessionId || title}'?`);
            setOnConfirmAction(() => async () => {
                setConfirmOpen(false);
                try {
                    if (!sessionId) throw new Error('Missing session id');
                    const res = await fetch(`${TELEGRAM_BOT_API_URL}/chat/session/${encodeURIComponent(sessionId)}`, {
                        method: 'DELETE',
                        headers: { accept: 'application/json' },
                    });
                    if (!res.ok) {
                        throw new Error(`Telegram delete failed with status ${res.status}`);
                    }
                    // Remove from local state on success
                    setTelegramSessions(prev => prev.filter(session => session.session_id !== sessionId));
                    showToast(`Deleted Telegram session: ${sessionId}`, 'success');
                } catch {
                    showToast('Error deleting Telegram session.', 'error');
                }
            });
        } else if (activeTab === 'instagram') {
            setConfirmMsg(`Are you sure you want to delete Instagram session '${sessionId || title}'?`);
            setOnConfirmAction(() => async () => {
                setConfirmOpen(false);
                try {
                    if (!sessionId) throw new Error('Missing session id');
                    const res = await fetch(`${INSTAGRAM_BOT_API_URL}/chat/history/${encodeURIComponent(sessionId)}`, {
                        method: 'DELETE',
                        headers: { accept: 'application/json' },
                    });
                    if (!res.ok) {
                        throw new Error(`Instagram delete failed with status ${res.status}`);
                    }
                    // Remove from local state on success
                    setInstagramUsers(prev => prev.filter(user => user.session_id !== sessionId));
                    showToast(`Deleted Instagram session: ${sessionId}`, 'success');
                } catch {
                    showToast('Error deleting Instagram session.', 'error');
                }
            });
        } else {
            setConfirmMsg(`Are you sure you want to delete session '${title}'?`);
            setOnConfirmAction(() => async () => {
                setConfirmOpen(false);
                try {
                    const res = await apiDeleteSession(domain, encodeURIComponent(title)) as DeleteResponse;
                    if (res && res.message && res.message.toLowerCase().includes('failed')) {
                        showToast(res.message, 'error');
                        return;
                    }
                    // Refetch sessions after delete
                    setIsLoading(true);
                    const [d1, d2, d3]: [SessionsApiResponse, SessionsApiResponse, SessionsApiResponse] = await Promise.all([
                        listSessions('domain_1') as Promise<SessionsApiResponse>,
                        listSessions('domain_2') as Promise<SessionsApiResponse>,
                        listSessions('domain_3') as Promise<SessionsApiResponse>,
                    ]);
                    const aggregated: Session[] = [
                        ...(d1?.sessions || []),
                        ...(d2?.sessions || []),
                        ...(d3?.sessions || []),
                    ];
                    setSessions(aggregated);
                    showToast('Session deleted successfully', 'success');
                } catch {
                    showToast('Error deleting session.', 'error');
                } finally {
                    setIsLoading(false);
                }
            });
        }
        setConfirmOpen(true);
    };







    // Function to get session date for sorting - prioritizes latest activity
    const getSessionDate = (session: Session | WhatsAppSession | TelegramSession | InstagramUser): Date => {
        // Prioritize last_message_time for most recent activity
        if ('last_message_time' in session && session.last_message_time) {
            return new Date(session.last_message_time * 1000); // Convert Unix timestamp to Date
        }

        // Then check updated_at for recent updates
        if ('updated_at' in session && session.updated_at) {
            return new Date(session.updated_at * 1000); // Convert Unix timestamp to Date
        }

        // For Instagram users, check last_activity field
        if ('last_activity' in session && session.last_activity) {
            return new Date(session.last_activity);
        }

        // Fall back to created_at
        if ('created_at' in session && typeof session.created_at === 'number') {
            return new Date(session.created_at * 1000); // Convert Unix timestamp to Date
        }
        if ('created_at' in session && session.created_at) {
            return new Date(session.created_at);
        }
        if ('created_on' in session && session.created_on) {
            const [mm, dd, yyyy] = session.created_on.split('-').map(Number);
            return new Date(yyyy, (mm || 1) - 1, dd || 1);
        }

        // Generate varied dates based on session title for demo purposes
        const now = new Date();
        const titleHash = session.title.split('').reduce((a, b) => {
            a = ((a << 5) - a + b.charCodeAt(0)) & 0xffffffff;
            return a;
        }, 0);

        // Generate dates within the last 30 days
        const daysAgo = Math.abs(titleHash) % 30;
        const sessionDate = new Date(now);
        sessionDate.setDate(now.getDate() - daysAgo);

        return sessionDate;
    };



    // Function to get session thread count
    const getSessionThreadCount = (session: Session | WhatsAppSession | TelegramSession | InstagramUser): number => {
        if ('message_count' in session && session.message_count !== undefined) {
            return session.message_count;
        }
        // Generate a unique thread count based on session title hash for chatbot sessions
        const titleHash = session.title.split('').reduce((a, b) => {
            a = ((a << 5) - a + b.charCodeAt(0)) & 0xffffffff;
            return a;
        }, 0);

        // Generate a thread count between 1 and 25 based on title hash
        const threadCount = Math.abs(titleHash % 25) + 1;
        return threadCount;
    };



    // Function to map domain to user-friendly label
    const getDomainLabel = (session: Session | WhatsAppSession | TelegramSession | InstagramUser): string => {
        if ('domain' in session) {
            if (session.domain === 'domain_1') return 'Employee';
            if (session.domain === 'domain_2') return 'Customer';
            if (session.domain === 'domain_3') return 'Guest';
            return session.domain;
        }
        if ('session_id' in session && session.session_id.includes('_')) {
            return 'Telegram';
        }
        return 'WhatsApp';
    };



    // Generate user identifier for display
    const getUserIdentifier = (session: Session | WhatsAppSession | TelegramSession | InstagramUser): string => {
        if (session.user_identifier) {
            return session.user_identifier;
        }

        if ('domain' in session) {
            const domainLabel = getDomainLabel(session);
            const shortId = session.title.slice(-6);
            return `${domainLabel}-${shortId}`;
        }

        // For WhatsApp sessions, show complete session ID
        if ('session_id' in session && !session.session_id.includes('_')) {
            return `WhatsApp-${session.session_id}`;
        }

        // For Telegram sessions, show partial session ID
        if ('session_id' in session && session.session_id.includes('_')) {
            return `Telegram-${session.session_id.split('_')[0]}`;
        }

        return `Guest-${session.title.slice(-6)}`;
    };



    // Generate first message preview
    const getFirstMessagePreview = (session: Session | WhatsAppSession | TelegramSession | InstagramUser): string => {
        if (session.first_message) {
            return session.first_message;
        }

        // If we have conversation details, use the first query
        if (conversationDetails && conversationDetails.history.length > 0) {
            return conversationDetails.history[0].query;
        }

        // Return a generic message if no real message is available
        return "Conversation started";
    };



    // Generate avatar initials
    const getAvatarInitials = (session: Session | WhatsAppSession | TelegramSession | InstagramUser): string => {
        const identifier = getUserIdentifier(session);
        const words = identifier.split('-');
        if (words.length >= 2) {
            return words[0].slice(0, 1).toUpperCase() + words[1].slice(0, 1).toUpperCase();
        }
        return identifier.slice(0, 2).toUpperCase();
    };



    // Generate avatar color
    const getAvatarColor = (session: Session | WhatsAppSession | TelegramSession | InstagramUser): string => {
        const colors = [
            'bg-blue-500', 'bg-blue-600', 'bg-blue-700', 'bg-blue-400',
            'bg-indigo-500', 'bg-indigo-600', 'bg-sky-500', 'bg-cyan-500'
        ];

        const hash = session.title.split('').reduce((a, b) => {
            a = ((a << 5) - a + b.charCodeAt(0)) & 0xffffffff;
            return a;
        }, 0);

        return colors[Math.abs(hash) % colors.length];
    };




    // Get sessions based on active tab
    const getCurrentSessions = () => {
        if (activeTab === 'whatsapp') {
            return whatsappSessions;
        } else if (activeTab === 'telegram') {
            return telegramSessions;
        } else if (activeTab === 'instagram') {
            return instagramUsers;
        }
        return sessions;
    };




    // Filter sessions based on search query and filters
    const filteredSessions = [...getCurrentSessions()].filter(session => {
        const searchLower = searchQuery.toLowerCase();
        const sessionId = 'session_id' in session ? session.session_id || '' : '';
        const userIdentifier = getUserIdentifier(session).toLowerCase();
        const firstMessage = getFirstMessagePreview(session).toLowerCase();

        // Search filter
        const matchesSearch = searchQuery === '' || (
            session.title.toLowerCase().includes(searchLower) ||
            getDomainLabel(session).toLowerCase().includes(searchLower) ||
            sessionId.toLowerCase().includes(searchLower) ||
            userIdentifier.includes(searchLower) ||
            firstMessage.includes(searchLower)
        );

        // Status filter
        const matchesStatus = statusFilter === 'all' || (session.status || 'active') === statusFilter;

        // Domain filter
        const sessionDomain = 'domain' in session ? session.domain : 'session_id' in session && session.session_id.includes('_') ? 'telegram' : 'whatsapp';
        const matchesDomain = domainFilter === 'all' || sessionDomain === domainFilter;

        // Date filter
        const sessionDate = getSessionDate(session);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

        let matchesDate = true;
        if (dateFilter === 'today') {
            matchesDate = sessionDate >= today;
        } else if (dateFilter === 'week') {
            matchesDate = sessionDate >= weekAgo;
        } else if (dateFilter === 'month') {
            matchesDate = sessionDate >= monthAgo;
        }

        return matchesSearch && matchesStatus && matchesDomain && matchesDate;
    });



    // Sort sessions based on selected criteria - prioritizes latest conversations
    const sortedSessions = filteredSessions.sort((a, b) => {
        switch (sortBy) {
            case 'newest':
                // Show most recent conversations first (based on last activity)
                return getSessionDate(b).getTime() - getSessionDate(a).getTime();
            case 'oldest':
                // Show oldest conversations first
                return getSessionDate(a).getTime() - getSessionDate(b).getTime();
            case 'waiting':
                // Sort by last message time (oldest first for waiting longest)
                const aLastMessage = a.last_message_time || getSessionDate(a).getTime() / 1000;
                const bLastMessage = b.last_message_time || getSessionDate(b).getTime() / 1000;
                return aLastMessage - bLastMessage;
            default:
                // Default to newest first
                return getSessionDate(b).getTime() - getSessionDate(a).getTime();
        }
    });







    // Dashboard stats calculation
    const allSessions = getCurrentSessions();
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const dashboardStats = {
        totalOpen: allSessions.filter(s => (s.status || 'active') !== 'resolved').length,
        newToday: allSessions.filter(s => getSessionDate(s) >= todayStart).length,
        avgResponseTime: allSessions.length > 0 ? `${Math.round(allSessions.length * 1.2)} min` : '0 min', // Calculated based on session count
        unassigned: allSessions.filter(s => (s.status || 'active') === 'active').length,
        active: allSessions.filter(s => (s.status || 'active') === 'active').length,
        resolved: allSessions.filter(s => s.status === 'resolved').length,
        pending: allSessions.filter(s => s.status === 'pending').length
    };



    // Pagination calculations
    const totalFilteredSessions = sortedSessions.length;
    const totalPages = totalFilteredSessions > 0 ? Math.ceil(totalFilteredSessions / itemsPerPage) : 1;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const showingCount = Math.min(itemsPerPage, totalFilteredSessions - startIndex);







    // Pagination handlers







    const handleItemsPerPageChange = (newItemsPerPage: number) => {
        setItemsPerPage(newItemsPerPage);
        setCurrentPage(1); // Reset to first page when changing items per page
    };







    const handlePrevPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    };







    const handleNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1);
        }
    };







    // Search and filter handlers
    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        setCurrentPage(1); // Reset to first page when searching
    };







    const handleRefresh = async () => {
        setIsLoading(true);
        try {
            if (activeTab === 'chatbot') {
                // Fetch sessions from all available domains
                const domainPromises = AVAILABLE_DOMAINS.map(domain =>
                    listSessions(domain).catch(error => {
                        console.warn(`Failed to fetch sessions for ${domain}:`, error);
                        return { sessions: [], domain, total_sessions: 0 };
                    })
                );

                const domainResults: SessionsApiResponse[] = await Promise.all(domainPromises);

                // Aggregate sessions from all domains
                const aggregated: Session[] = [];

                for (let index = 0; index < domainResults.length; index++) {
                    const result = domainResults[index];
                    const domain = AVAILABLE_DOMAINS[index];
                    const sessions = result?.sessions || [];

                    // Domain stats removed as they were unused

                    // Process each session and fetch first message
                    for (const session of sessions) {
                        const firstMessage = await getFirstMessageFromConversation(domain, session.title);

                        aggregated.push({
                            ...session,
                            // Use real data from API, only add defaults if missing
                            status: session.status || 'active',
                            user_identifier: session.user_identifier || `Guest-${session.title.slice(-6)}`,
                            first_message: firstMessage,
                            last_message_time: session.updated_at || (session.created_at ? new Date(session.created_at).getTime() / 1000 : Date.now() / 1000)
                        });
                    }
                }

                setSessions(aggregated);
            } else if (activeTab === 'whatsapp') {
                const whatsappData = await getWhatsAppBotSessions();
                console.log('Refresh - WhatsApp API Response:', whatsappData); // Debug log
                const enhancedWhatsappData = (whatsappData || []).map((session: WhatsAppSession) => ({
                    ...session,
                    // Use real data from API, only add defaults if missing
                    status: session.status || 'active',
                    user_identifier: session.user_identifier || `WhatsApp-${session.session_id}`,
                    first_message: session.first_message || 'No message preview available',
                    // updated_at and created_at are already Unix timestamps in seconds, use them directly
                    last_message_time: session.updated_at || session.created_at || Date.now() / 1000,
                    // Explicitly preserve user_type from API
                    user_type: session.user_type
                }));
                console.log('Refresh - Enhanced WhatsApp data:', enhancedWhatsappData); // Debug log
                setWhatsappSessions(enhancedWhatsappData);
            } else if (activeTab === 'telegram') {
                const telegramData = await getTelegramBotSessions();
                setTelegramSessions(telegramData || []);
            }
        } catch (error) {
            console.error('Error fetching sessions:', error);
        } finally {
            setIsLoading(false);
        }
    };







    // Clear all sessions handler
    const handleClearAllConfirm = () => {
        if (activeTab === 'chatbot') {
            setSessions([]);
        } else if (activeTab === 'whatsapp') {
            setWhatsappSessions([]);
        } else if (activeTab === 'telegram') {
            setTelegramSessions([]);
        } else if (activeTab === 'instagram') {
            setInstagramUsers([]);
        }
        setCurrentPage(1);
        setSearchQuery("");
        setShowClearModal(false);
    };







    return (
        <div>
            <style jsx>{`
 .message-preview {
 overflow: visible;
 text-overflow: unset;
 white-space: normal;
 }
 .conversation-card:hover .action-icons {
 display: flex !important;
 }
 .action-icons {
 display: none;
 }
 `}</style>
            {/* Professional Header */}
            <DashboardHeader
                variant="default"
                size="lg"
                title="Chat Inbox"
                subtitle="Manage and view all chatbot and WhatsApp bot conversations with advanced filtering and real-time updates"
                breadcrumbs={[
                    { label: 'Home', href: '/' },
                    { label: 'Chat Inbox', href: '/inbox' }
                ]}
                icon={() => (
                    <MessageSquare className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                )}
                actions={
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <span className="text-lg sm:text-xl text-white/80 font-normal">
                                {dashboardStats.totalOpen} conversations
                            </span>
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                        </div>
                        <div className="flex flex-wrap gap-2 sm:gap-3">
                            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-xl px-3 py-1.5 border border-white/20">
                                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                                <span className="text-white/90 text-xs font-medium">{dashboardStats.active} Active</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-xl px-3 py-1.5 border border-white/20">
                                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                                <span className="text-white/90 text-xs font-medium">{dashboardStats.resolved} Resolved</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-xl px-3 py-1.5 border border-white/20">
                                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                                <span className="text-white/90 text-xs font-medium">{dashboardStats.pending} Pending</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-xl px-3 py-1.5 border border-white/20">
                                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                                <span className="text-white/90 text-xs font-medium">{dashboardStats.newToday} New Today</span>
                            </div>
                        </div>
                    </div>
                }
            />

            {/* Enhanced Tab Switching */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg p-6 mb-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                            Conversation Channels
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Switch between different conversation types and manage your inbox
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                        <button
                            onClick={() => setActiveTab('chatbot')}
                            className={`flex items-center px-6 py-3 rounded-lg text-sm font-medium transition-all duration-300 ${activeTab === 'chatbot'
                                ? 'bg-white text-blue-700 dark:bg-gray-700 dark:text-blue-300 shadow-md transform scale-105'
                                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/50'
                                }`}
                        >
                            <Bot className="w-4 h-4 mr-2" />
                            <span className="hidden sm:inline">Chatbot</span>
                            <span className="sm:hidden">Bot</span>
                            <span className="ml-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                                {sessions.length}
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveTab('whatsapp')}
                            className={`flex items-center px-6 py-3 rounded-lg text-sm font-medium transition-all duration-300 ${activeTab === 'whatsapp'
                                ? 'bg-white text-blue-700 dark:bg-gray-700 dark:text-blue-300 shadow-md transform scale-105'
                                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/50'
                                }`}
                        >
                            <MessageCircle className="w-4 h-4 mr-2" />
                            <span className="hidden sm:inline">WhatsApp</span>
                            <span className="sm:hidden">WA</span>
                            <span className="ml-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                                {whatsappSessions.length}
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveTab('telegram')}
                            className={`flex items-center px-6 py-3 rounded-lg text-sm font-medium transition-all duration-300 ${activeTab === 'telegram'
                                ? 'bg-white text-blue-700 dark:bg-gray-700 dark:text-blue-300 shadow-md transform scale-105'
                                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/50'
                                }`}
                        >
                            <MessageSquare className="w-4 h-4 mr-2" />
                            <span className="hidden sm:inline">Telegram</span>
                            <span className="sm:hidden">TG</span>
                            <span className="ml-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                                {telegramSessions.length}
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveTab('instagram')}
                            className={`flex items-center px-6 py-3 rounded-lg text-sm font-medium transition-all duration-300 ${activeTab === 'instagram'
                                ? 'bg-white text-blue-700 dark:bg-gray-700 dark:text-blue-300 shadow-md transform scale-105'
                                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/50'
                                }`}
                        >
                            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                            </svg>
                            <span className="hidden sm:inline">Instagram</span>
                            <span className="sm:hidden">IG</span>
                            <span className="ml-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                                {instagramUsers.length}
                            </span>
                        </button>
                    </div>
                </div>
            </div>
            <div className="space-y-6">







                {/* Dashboard Stats */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow p-6 mb-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{dashboardStats.totalOpen}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Open Conversations</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{dashboardStats.newToday}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">New Today</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{dashboardStats.avgResponseTime}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Avg Response Time</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{dashboardStats.unassigned}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Unassigned</div>
                        </div>
                    </div>

                </div>



                {/* Enhanced Search and Filter Toolbar */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow p-4 mb-6">
                    <div className="flex flex-col lg:flex-row gap-4">
                        {/* Search Bar */}
                        <div className="flex-1">
                            <input
                                placeholder="Search conversations, users, or messages..."
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                type="text"
                                value={searchQuery}
                                onChange={(e) => handleSearchChange(e.target.value)}
                            />
                        </div>

                        {/* Filter Controls */}
                        <div className="flex flex-wrap gap-2">
                            {/* Status Filter */}
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'resolved' | 'pending')}
                                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">All Status</option>
                                <option value="active">Active</option>
                                <option value="pending">Pending</option>
                                <option value="resolved">Resolved</option>
                            </select>

                            {/* Date Filter */}
                            <select
                                value={dateFilter}
                                onChange={(e) => setDateFilter(e.target.value as 'all' | 'today' | 'week' | 'month')}
                                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">All Time</option>
                                <option value="today">Today</option>
                                <option value="week">Last 7 Days</option>
                                <option value="month">Last 30 Days</option>
                            </select>

                            {/* Domain Filter */}
                            <select
                                value={domainFilter}
                                onChange={(e) => setDomainFilter(e.target.value)}
                                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">All Domains</option>
                                {AVAILABLE_DOMAINS.map(domain => (
                                    <option key={domain} value={domain}>
                                        {domain.replace('_', ' ').toUpperCase()}
                                    </option>
                                ))}
                            </select>

                            {/* Sort Filter */}
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'waiting')}
                                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="newest">Newest First</option>
                                <option value="oldest">Oldest First</option>
                                <option value="waiting">Waiting Longest</option>
                            </select>

                            {/* Refresh Button */}
                            <button
                                onClick={handleRefresh}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Refresh
                            </button>
                        </div>
                    </div>
                </div>



                {/* Two-Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Conversation List */}
                    <div className="lg:col-span-2">
                        <ComponentCard title={`${activeTab === 'chatbot' ? 'Chatbot' : activeTab === 'whatsapp' ? 'WhatsApp Bot' : activeTab === 'telegram' ? 'Telegram Bot' : 'Instagram Bot'} Conversations${domainFilter !== 'all' ? ` - ${domainFilter.replace('_', ' ').toUpperCase()}` : ''}`}>
                            <div className="space-y-2">
                                {isLoading ? (
                                    <div className="text-center py-8 text-gray-500">Loading conversations...</div>
                                ) : sortedSessions.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        No {activeTab === 'chatbot' ? 'chatbot' : activeTab === 'whatsapp' ? 'WhatsApp' : activeTab === 'telegram' ? 'Telegram' : 'Instagram'} conversations found
                                    </div>
                                ) : (
                                    sortedSessions.slice(startIndex, endIndex).map((session, index) => {
                                        // const statusInfo = getStatusInfo(session);
                                        const isSelected = selectedSession?.title === session.title;

                                        return (
                                            <div
                                                key={index}
                                                onClick={() => {
                                                    setSelectedSession(session);
                                                    fetchConversationDetails(session);
                                                }}
                                                className={`conversation-card relative p-4 border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 ${isSelected
                                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                                    }`}
                                            >
                                                {/* Three-Section Layout */}
                                                <div className="flex flex-col h-full">
                                                    {/* Top Section: Guest ID and Date */}
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-3">
                                                            {/* Avatar */}
                                                            <div className={`w-10 h-10 rounded-full ${getAvatarColor(session)} flex items-center justify-center text-white font-semibold text-sm flex-shrink-0`}>
                                                                {getAvatarInitials(session)}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                                    {getUserIdentifier(session)}
                                                                </h3>
                                                                {/* Domain Badge */}
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                                                    {'domain' in session ? getDomainLabel(session) :
                                                                        'session_id' in session && session.session_id.includes('_') ? 'Telegram' :
                                                                            'user_identifier' in session && session.user_identifier?.includes('Instagram') ? 'Instagram' : 'WhatsApp'}
                                                                </span>
                                                                {/* User Type Badge for WhatsApp sessions */}
                                                                {('user_type' in session && session.user_type) ? (
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                                                                        {session.user_type as string}
                                                                    </span>
                                                                ) : null}
                                                            </div>
                                                        </div>
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                                            {(() => {
                                                                const sessionDate = getSessionDate(session);
                                                                const now = new Date();
                                                                const diffInHours = Math.floor((now.getTime() - sessionDate.getTime()) / (1000 * 60 * 60));
                                                                const diffInDays = Math.floor(diffInHours / 24);

                                                                if (diffInHours < 1) {
                                                                    return 'Just now';
                                                                } else if (diffInHours < 24) {
                                                                    return `${diffInHours}h ago`;
                                                                } else if (diffInDays < 7) {
                                                                    return `${diffInDays}d ago`;
                                                                } else {
                                                                    return format(sessionDate, 'MMM dd');
                                                                }
                                                            })()}
                                                        </span>
                                                    </div>

                                                    {/* Middle Section: Message Preview (Flexible) */}
                                                    <div className="flex-1 mb-3">
                                                        <p className="text-sm text-gray-900 dark:text-white leading-relaxed message-preview">
                                                            {getFirstMessagePreview(session)}
                                                        </p>
                                                    </div>

                                                    {/* Bottom Section: Fixed Footer with Actions */}
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                                {getSessionThreadCount(session)} messages
                                                            </span>
                                                        </div>

                                                        {/* Action Icons */}
                                                        <div className="action-icons items-center gap-2 transition-all duration-200">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handlePreviousChat(
                                                                        session.title,
                                                                        'session_id' in session ? session.session_id : undefined
                                                                    );
                                                                }}
                                                                className="p-3 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                                                title="View Conversation"
                                                            >
                                                                <ChatIcon className="w-5 h-5" />
                                                            </button>
                                                            {/* Delete button - Always visible for WhatsApp sessions */}
                                                            {('session_id' in session && session.session_id && !session.session_id.includes('_') && !('user_identifier' in session && session.user_identifier?.includes('Instagram'))) || ('domain' in session && session.domain === 'aiagent') ? (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDeleteSession(
                                                                            session.title,
                                                                            'domain' in session ? session.domain : 'whatsapp',
                                                                            'session_id' in session ? session.session_id : undefined
                                                                        );
                                                                    }}
                                                                    className="p-3 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                                                                    title="Delete Conversation"
                                                                >
                                                                    <TrashBinIcon className="w-5 h-5" />
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDeleteSession(
                                                                            session.title,
                                                                            'domain' in session ? session.domain : 'session_id' in session && session.session_id.includes('_') ? 'telegram' : 'whatsapp',
                                                                            'session_id' in session ? session.session_id : undefined
                                                                        );
                                                                    }}
                                                                    className="p-3 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                                                                    title="Delete Conversation"
                                                                >
                                                                    <TrashBinIcon className="w-5 h-5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </ComponentCard>
                    </div>

                    {/* Right Column - Preview Pane */}
                    <div className="lg:col-span-1">
                        <ComponentCard title="Conversation Preview">
                            {selectedSession ? (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 pb-4 border-b border-gray-200 dark:border-gray-700">
                                        <div className={`w-12 h-12 rounded-full ${getAvatarColor(selectedSession)} flex items-center justify-center text-white font-semibold`}>
                                            {getAvatarInitials(selectedSession)}
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-gray-900 dark:text-white">{getUserIdentifier(selectedSession)}</h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                {format(getSessionDate(selectedSession), 'MMM dd, yyyy • h:mm a')}
                                            </p>
                                            {/* User Type for WhatsApp sessions */}
                                            {('user_type' in selectedSession && selectedSession.user_type) ? (
                                                <div className="mt-1">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                                                        {selectedSession.user_type as string}
                                                    </span>
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        {loadingConversation ? (
                                            <div className="text-center py-4">
                                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Loading conversation...</p>
                                            </div>
                                        ) : conversationDetails ? (
                                            <div className="space-y-3 max-h-96 overflow-y-auto">
                                                {conversationDetails.history.map((message, index) => (
                                                    <div key={index} className="space-y-2">
                                                        {/* User Query */}
                                                        {message.query ? (
                                                            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                                                                <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">User:</p>
                                                                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">{message.query}</p>
                                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                                    {format(new Date(message.timestamp), 'MMM dd, h:mm a')}
                                                                </p>
                                                            </div>
                                                        ) : null}

                                                        {/* AI Response */}
                                                        {message.response ? (
                                                            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                                                                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">AI Assistant:</p>
                                                                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">{message.response}</p>
                                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                                    {format(new Date(message.timestamp), 'MMM dd, h:mm a')}
                                                                </p>
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                                <p className="text-sm text-gray-700 dark:text-gray-300">{getFirstMessagePreview(selectedSession)}</p>
                                            </div>
                                        )}

                                        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                                            {conversationDetails ?
                                                `${conversationDetails.history.length} messages in this conversation` :
                                                `${getSessionThreadCount(selectedSession)} messages in this conversation`
                                            }
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                                        <button
                                            onClick={() => handlePreviousChat(
                                                selectedSession.title,
                                                'session_id' in selectedSession ? selectedSession.session_id : undefined
                                            )}
                                            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                                        >
                                            View Full Conversation
                                        </button>

                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                    Select a conversation to view details
                                </div>
                            )}
                        </ComponentCard>
                    </div>
                </div>

                {/* Pagination Component */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mt-4 sm:mt-6 px-3 sm:px-4 md:px-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                    <div className="text-center sm:text-left text-sm text-gray-600 dark:text-gray-400">
                        {totalFilteredSessions > 0 ? `Showing ${showingCount} of ${totalFilteredSessions} entries` : 'No entries to show'}
                    </div>
                    <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2">
                        <select
                            className="border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            value={itemsPerPage}
                            onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                        >
                            <option value={10}>10 / page</option>
                            <option value={25}>25 / page</option>
                            <option value={50}>50 / page</option>
                        </select>
                        <button
                            disabled={currentPage === 1 || totalFilteredSessions === 0}
                            onClick={handlePrevPage}
                            className="px-3 py-1.5 border rounded-lg text-sm font-medium bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Prev
                        </button>
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 tabular-nums px-3 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                            {totalFilteredSessions > 0 ? `${currentPage} / ${totalPages}` : '0 / 0'}
                        </span>
                        <button
                            disabled={currentPage === totalPages || totalFilteredSessions === 0}
                            onClick={handleNextPage}
                            className="px-3 py-1.5 border rounded-lg text-sm font-medium bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
            {/* Toast Notification */}
            {toast.show && (
                <div className={`fixed top-6 right-6 z-[99999] max-w-sm w-[360px]`}>
                    <div className={`relative px-4 py-3 rounded-xl shadow-lg border text-sm flex items-start gap-3 ${toast.variant === 'success'
                        ? 'bg-blue-50 text-blue-800 border-blue-400 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700'
                        : 'bg-blue-50 text-blue-800 border-blue-400 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700'}`}>
                        <div className={`mt-0.5 inline-flex items-center justify-center w-5 h-5 rounded-full border ${toast.variant === 'success' ? 'border-blue-500 text-blue-600' : 'border-blue-500 text-blue-600'}`}>
                            {toast.variant === 'success' ? (
                                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="3">
                                    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            ) : (
                                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="3">
                                    <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            )}
                        </div>
                        <div className="pr-6 leading-relaxed">
                            <div className="font-semibold">
                                {toast.variant === 'success' ? 'Upload Successful!' : 'Action Failed'}
                            </div>
                            <div className="mt-0.5 text-[13px] break-words">{toast.message}</div>
                        </div>
                        <button
                            onClick={() => setToast(prev => ({ ...prev, show: false }))}
                            className={`absolute top-2.5 right-2.5 inline-flex items-center justify-center w-6 h-6 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${toast.variant === 'success' ? 'text-blue-700 dark:text-blue-300' : 'text-blue-700 dark:text-blue-300'}`}
                            aria-label="Dismiss notification"
                        >
                            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {/* Clear All Confirmation Modal */}
            {showClearModal && (
                <div className="fixed inset-0 z-[999999] flex items-center justify-center" style={{ zIndex: 999999 }}>
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-white bg-opacity-5 backdrop-blur-md transition-all duration-300"
                        onClick={() => setShowClearModal(false)}
                    />

                    {/* Modal */}
                    <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full mx-4 border border-gray-200 dark:border-gray-700">
                        <div className="p-6">
                            <div className="flex items-center justify-between pr-12 sm:pr-16">
                                <h4 className="text-base font-medium text-gray-800 dark:text-white/90">
                                    Clear All {activeTab === 'chatbot' ? 'Chatbot' : activeTab === 'whatsapp' ? 'WhatsApp Bot' : activeTab === 'telegram' ? 'Telegram Bot' : 'Instagram Bot'} Sessions
                                </h4>
                                <button
                                    onClick={() => setShowClearModal(false)}
                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="mt-4">
                                <div className="max-h-[50vh] overflow-y-auto overflow-x-hidden rounded-xl border border-gray-100 bg-gray-50 p-4 text-[13px] leading-relaxed text-gray-800 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200">
                                    <div className="font-mono whitespace-pre-wrap break-words">
                                        <div className="text-blue-600 dark:text-blue-400 font-semibold mb-2">⚠️ Warning</div>
                                        <div>This action will permanently delete all {activeTab === 'chatbot' ? 'chatbot' : activeTab === 'whatsapp' ? 'WhatsApp bot' : activeTab === 'telegram' ? 'Telegram bot' : 'Instagram bot'} sessions from your inbox.</div>
                                        <div className="mt-2 text-gray-600 dark:text-gray-400">• All conversation history will be lost</div>
                                        <div className="text-gray-600 dark:text-gray-400">• This action cannot be undone</div>
                                        <div className="text-gray-600 dark:text-gray-400">• You will need to start new conversations</div>

                                        <div className="mt-4 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded">
                                            <div className="text-blue-800 dark:text-blue-300 text-xs">
                                                💡 Tip: Consider downloading important conversations before clearing.
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowClearModal(false)}
                                    className="rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03] transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleClearAllConfirm}
                                    className="rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                                >
                                    Clear All {activeTab === 'chatbot' ? 'Chatbot' : activeTab === 'whatsapp' ? 'WhatsApp' : activeTab === 'telegram' ? 'Telegram' : 'Instagram'} Sessions
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                open={confirmOpen}
                message={confirmMsg}
                onConfirm={onConfirmAction}
                onCancel={() => setConfirmOpen(false)}
                variant="danger"
            />
        </div>
    );
}