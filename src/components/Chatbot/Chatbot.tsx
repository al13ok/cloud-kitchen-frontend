'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import styles from './Chatbot.module.css';
import Image from 'next/image';
import { Modal } from '../ui/modal';
import { BACKEND_URL } from '@/utils/api';
import JobApplicationForm from '../common/JobApplicationForm';

// Configuration constants
const CONFIG = {
  AUTH_URL: process.env.NEXT_PUBLIC_AUTH_API_URL || '/api/auth/login',
  ANALYZE_URL: `${process.env.NEXT_PUBLIC_API_URL}/analyze-user-type`,
  LEAD_FORM_URL: '/api/v1/leads/',
  SAVE_SESSION_URL: `${process.env.NEXT_PUBLIC_API_URL}/domain/domain_3/save-session`,
  DEFAULT_AVATAR: '/images/user/Bot1.png',
  DEFAULT_BOT_NAME: 'Mobi.AI',
  DEFAULT_WELCOME_MESSAGE: 'How can I help you?',
  INITIAL_MESSAGE: {
    id: Date.now(),
    from: 'bot',
    text: 'Welcome to the chatbot! How can I assist you today?',
    displayText: 'Welcome to the chatbot! How can I assist you today?',
  },
  KEYWORDS: {
    employee: ['salary', 'hr', 'manager', 'employee', 'payroll', 'leave', 'attendance', 'shift', 'promotion', 'boss', 'work id', 'staff', 'it', 'department', 'office', 'colleague', 'supervisor', 'director', 'executive', 'admin', 'administration'],
    customer: ['order', 'support', 'refund', 'product', 'customer', 'buy', 'purchase', 'complaint', 'invoice', 'delivery', 'tracking', 'project', 'client', 'account', 'billing', 'payment', 'subscription', 'renewal', 'upgrade', 'downgrade'],
    employeeHelpdesk: [
      'employee helpdesk', 'staff helpdesk', 'internal support', 'employee support', 'hr helpdesk', 'it helpdesk', 'internal ticket', 'employee ticket', 'staff ticket', 'workplace support', 'employee assistance', 'staff assistance',
      'internal issue', 'employee issue', 'workplace issue', 'company support', 'internal help', 'employee help', 'staff help', 'workplace help', 'company helpdesk', 'internal service desk', 'employee service desk',
      'hr support', 'it support', 'payroll help', 'attendance help', 'leave help', 'benefits help', 'employee benefits', 'workplace benefits', 'company benefits', 'internal benefits', 'employee portal', 'staff portal',
      'workplace portal', 'company portal', 'internal portal', 'employee dashboard', 'staff dashboard', 'workplace dashboard', 'company dashboard', 'internal dashboard', 'employee access', 'staff access', 'workplace access',
      'company access', 'internal access', 'employee login', 'staff login', 'workplace login', 'company login', 'internal login', 'employee account', 'staff account', 'workplace account', 'company account', 'internal account'
    ],
    customerHelpdesk: [
      'customer helpdesk', 'customer support', 'client helpdesk', 'client support', 'customer service', 'client service', 'customer assistance', 'client assistance', 'customer help', 'client help', 'customer care', 'client care',
      'customer ticket', 'client ticket', 'support ticket', 'service ticket', 'customer issue', 'client issue', 'support issue', 'service issue', 'customer problem', 'client problem', 'support problem', 'service problem',
      'customer complaint', 'client complaint', 'support complaint', 'service complaint', 'customer inquiry', 'client inquiry', 'support inquiry', 'service inquiry', 'customer request', 'client request', 'support request',
      'service request', 'customer feedback', 'client feedback', 'support feedback', 'service feedback', 'customer portal', 'client portal', 'support portal', 'service portal', 'customer dashboard', 'client dashboard',
      'support dashboard', 'service dashboard', 'customer account', 'client account', 'support account', 'service account', 'customer login', 'client login', 'support login', 'service login', 'customer access', 'client access',
      'support access', 'service access', 'customer care', 'client care', 'support care', 'service care', 'customer service desk', 'client service desk', 'support service desk', 'service desk'
    ],
    leadForm: [
      'contact', 'get in touch', 'request info', 'request information', 'interested', 'want to know more', 'demo', 'enquire', 'enquiry', 'quote', 'pricing', 'price', 'hire', 'consult', 'consultation', 'partner', 'collaborate', 'work with', 'business', 'proposal', 'estimate', 'talk to sales', 'sales', 'assistance',
      'support', 'project', 'website', 'app', 'mobile', 'web', 'design', 'marketing', 'digital', 'solution', 'outsource', 'freelance', 'agency', 'company', 'team', 'expert', 'professional', 'consultant', 'developer', 'designer', 'marketer',
      'cost', 'budget', 'investment', 'package', 'plan', 'strategy', 'implementation', 'deployment', 'launch', 'maintenance', 'upgrade', 'improve', 'optimize', 'enhance', 'modernize', 'transform', 'innovate', 'automate', 'human', 'speak', 'integrate', 'customize', 'tailor', 'bespoke', 'enterprise', 'startup', 'small business',
      // Intern/Trainee specific keywords
      'intern', 'internship', 'trainee', 'training', 'apprentice', 'apprenticeship', 'entry level', 'entry-level', 'junior', 'fresher', 'graduate', 'student', 'learning', 'mentorship', 'mentor', 'coaching', 'coach',
    ],
    greeting: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'greetings', 'pleasure to meet you', 'nice to meet you', 'good to see you', 'greetings and salutations'],
    humanRequest: ['i want to speak to a human', 'i want to speak to a live agent', 'can you connect me to an agent'],
    brandMentions: ['Mobiloitte'],
    abusive: [
      'abuse', 'asshole', 'bitch', 'bullshit', 'crap', 'damn', 'fuck', 'hell', 'piss', 'shit', 'slut', 'whore',
      // Add more words as needed, but be mindful of context and false positives.
    ],
  },
};

// Interfaces
interface Message {
  id: number;
  from: string;
  text: string;
  isTyping?: boolean;
  displayText?: string;
}

interface ChatResponse {
  response?: string;
  answer?: string;
  error?: string;
}

interface ChatbotComponentProps {
  toggleChatbot: () => void;
}

interface CustomEvent<T = unknown> extends Event {
  detail?: T;
}

// Utility functions
const getLocalStorageItem = <T,>(key: string, defaultValue: T): T => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : defaultValue;
  }
  return defaultValue;
};

const setLocalStorageItem = (key: string, value: unknown) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

const getSessionStorageItem = <T,>(key: string, defaultValue: T): T => {
  if (typeof window !== 'undefined') {
    const saved = sessionStorage.getItem(key);
    return saved ? (saved as unknown as T) : defaultValue;
  }
  return defaultValue;
};

const setSessionStorageItem = (key: string, value: string) => {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(key, value);
  }
};

const getRecentSessions = (): Message[][] => getLocalStorageItem<Message[][]>('recentSessions', []);

const saveSession = (messages: Message[]) => {
  const sessions = getRecentSessions();
  sessions.unshift(messages);
  if (sessions.length > 10) sessions.length = 10;
  setLocalStorageItem('recentSessions', sessions);
};

const normalizeMessage = (msg: string): string =>
  msg.toLowerCase().trim().replace(/[.,!?;:()\[\]{}'"`~@#$%^&*_+=<>|\\/\-]/g, '').replace(/\s+/g, ' ');

function ChatbotComponent({ toggleChatbot }: ChatbotComponentProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(getLocalStorageItem('isAuthenticated', false));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<string>(getLocalStorageItem('selectedChatbotAvatar', CONFIG.DEFAULT_AVATAR));
  const [botName, setBotName] = useState<string>(getLocalStorageItem('chatbotName', CONFIG.DEFAULT_BOT_NAME));
  const [welcomeMessage, setWelcomeMessage] = useState<string>(getLocalStorageItem('chatbotWelcomeMessage', CONFIG.DEFAULT_WELCOME_MESSAGE));
  const [showWelcome, setShowWelcome] = useState<boolean>(getSessionStorageItem('chatbot_welcome_shown', 'true') !== 'true');
  const [messages, setMessages] = useState<Message[]>(getLocalStorageItem('chatbot_messages', [CONFIG.INITIAL_MESSAGE]));
  const [input, setInput] = useState('');
  const [userType, setUserType] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showCustomerSupportModal, setShowCustomerSupportModal] = useState(false);
  const [showJobForm, setShowJobForm] = useState(false);
  const [jobFormHeading, setJobFormHeading] = useState<string>('Job Applications');
  const [recentSessions, setRecentSessions] = useState<Message[][]>(getRecentSessions());
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [messageRepetitions, setMessageRepetitions] = useState<{ [msg: string]: number }>(getLocalStorageItem('messageRepetitions', {}));
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [ticketFormHeading, setTicketFormHeading] = useState<string>('Create Ticket');

  // Human handoff state
  const [handoffMode, setHandoffMode] = useState<'idle' | 'pending' | 'waiting' | 'connected' | 'ended'>('idle');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_handoffSessionId, setHandoffSessionId] = useState<string | null>(null);
  const [handoffAgentName, setHandoffAgentName] = useState<string | null>(null);
  const [handoffQueuePosition, setHandoffQueuePosition] = useState<number | null>(null);
  const handoffWsRef = useRef<WebSocket | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const typeMessage = useCallback((messageIndex: number, text: string) => {
    let currentIndex = 0;
    let isMounted = true;

    const typingInterval = setInterval(() => {
      if (!isMounted || messageIndex >= messages.length) {
        clearInterval(typingInterval);
        return;
      }
      if (currentIndex < text.length) {
        setMessages((prev) => {
          const newMessages = [...prev];
          newMessages[messageIndex] = { ...newMessages[messageIndex], displayText: text.substring(0, currentIndex + 1) };
          return newMessages;
        });
        currentIndex++;
      } else {
        clearInterval(typingInterval);
        setMessages((prev) => {
          const newMessages = [...prev];
          newMessages[messageIndex] = { ...newMessages[messageIndex], isTyping: false, displayText: text };
          return newMessages;
        });
      }
    }, 30);

    return () => {
      isMounted = false;
      clearInterval(typingInterval);
    };
  }, [messages.length]);

  const isGreeting = useCallback((message: string): boolean => {
    return CONFIG.KEYWORDS.greeting.some((keyword) => {
      try {
        const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`, 'i');
        return regex.test(message.toLowerCase().trim());
      } catch {
        return false;
      }
    });
  }, []);

  const sendBotMessage = useCallback(
    (text: string) => {
      const botMessage: Message = { id: Date.now() + 1, from: 'bot', text, isTyping: true, displayText: '' };
      setMessages((prev) => {
        const newMessages = [...prev, botMessage];
        setTimeout(() => typeMessage(newMessages.length - 1, text), 0);
        return newMessages;
      });
    },
    [typeMessage]
  );

  // Handoff API base URL
  const HANDOFF_API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://py-mobiloitte.converiqo.ai';
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  // Connect to handoff WebSocket with automatic reconnection
  const connectHandoffWebSocket = useCallback((sessionId: string) => {
    if (handoffWsRef.current?.readyState === WebSocket.OPEN) return;

    const connect = () => {
      const wsBase = HANDOFF_API_BASE.replace('http://', 'ws://').replace('https://', 'wss://');
      const ws = new WebSocket(`${wsBase}/ws/handoff/${sessionId}`);
      handoffWsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ Handoff WebSocket connected');
        reconnectAttemptsRef.current = 0; // Reset on successful connection
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📩 Handoff WebSocket message:', data);

          switch (data.type) {
            case 'connected':
              // Initial connection confirmation
              break;

            case 'queue_update':
              setHandoffQueuePosition(data.position);
              break;

            case 'agent_connected':
              setHandoffMode('connected');
              setHandoffAgentName(data.agent_name || 'Support Agent');
              sendBotMessage(`You're now connected with ${data.agent_name || 'a support agent'}. How can they help you?`);
              break;

            case 'message':
              if (data.sender === 'agent') {
                // Add agent message to chat
                const agentMsg: Message = {
                  id: Date.now(),
                  from: 'bot', // Display as bot for consistent styling
                  text: data.content,
                  displayText: data.content,
                };
                setMessages((prev) => [...prev, agentMsg]);
              }
              break;

            case 'message_sent':
              // Message delivered confirmation
              console.log(`✅ Message delivered: ${data.message_id}`);
              break;

            case 'message_queued':
              // Message queued confirmation (waiting for agent)
              console.log(`📦 Message queued: ${data.message_id}`);
              break;

            case 'handoff_ended':
            case 'session_ended':
              setHandoffMode('ended');
              sendBotMessage(data.message || 'Your chat session has ended. You can continue with the AI assistant.');
              // Clean up WebSocket
              if (handoffWsRef.current) {
                handoffWsRef.current.close(1000, 'Session ended normally');
                handoffWsRef.current = null;
              }
              // Reset handoff state after a delay
              setTimeout(() => {
                setHandoffMode('idle');
                setHandoffSessionId(null);
                setHandoffAgentName(null);
              }, 2000);
              break;

            case 'error':
              console.error('Handoff error:', data.message);
              sendBotMessage(`Connection error: ${data.message}. Please try again.`);
              break;
          }
        } catch (err) {
          console.error('Failed to parse handoff message:', err);
        }
      };

      ws.onclose = (event) => {
        console.log('🔌 Handoff WebSocket disconnected', event.code, event.reason);
        handoffWsRef.current = null;

        // Don't reconnect if intentionally closed or session ended
        if (event.code === 1000 || handoffMode === 'ended' || handoffMode === 'idle') {
          return;
        }

        // Attempt reconnection with exponential backoff
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectAttemptsRef.current++;
          console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
          setTimeout(connect, delay);
        } else {
          console.error('❌ Max reconnection attempts reached');
          sendBotMessage('Connection lost. Please refresh the page to reconnect.');
        }
      };

      ws.onerror = (error) => {
        console.error('Handoff WebSocket error:', error);
      };
    };

    connect();
  }, [sendBotMessage, handoffMode, HANDOFF_API_BASE]);

  // Initiate handoff process
  const initiateHandoff = useCallback(async () => {
    setHandoffMode('pending');
    sendBotMessage("I understand you'd like to speak with a human agent. Connecting you now...");

    // Get or create session ID
    const sessionId = getLocalStorageItem('chatbot_session_id', '') || `session_${Date.now()}`;
    setLocalStorageItem('chatbot_session_id', sessionId);

    try {
      // Directly confirm the handoff (skip /check since user explicitly requested)
      const confirmRes = await fetch(`${HANDOFF_API_BASE}/api/v1/handoff/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          reason: 'User requested human assistance',
          priority: 2,
        }),
      });

      if (!confirmRes.ok) {
        const errorData = await confirmRes.json().catch(() => ({}));
        console.error('Handoff confirm error:', errorData);
        throw new Error(errorData.detail || 'Failed to confirm handoff');
      }

      const confirmData = await confirmRes.json();
      setHandoffSessionId(sessionId);
      setHandoffMode('waiting');
      setHandoffQueuePosition(confirmData.queue_position || 1);

      sendBotMessage('Connecting you to a human agent...');
      sendBotMessage(`You're #${confirmData.queue_position || 1} in queue. An agent will be with you shortly.`);

      // Connect to WebSocket for real-time communication
      connectHandoffWebSocket(sessionId);
    } catch (error) {
      console.error('Handoff initiation failed:', error);
      setHandoffMode('idle');
      sendBotMessage('Sorry, we could not connect you to an agent at this time. Please try again later.');
    }
  }, [sendBotMessage, connectHandoffWebSocket, HANDOFF_API_BASE]);


  // Send message via handoff WebSocket
  const sendHandoffMessage = useCallback((content: string) => {
    if (!handoffWsRef.current || handoffWsRef.current.readyState !== WebSocket.OPEN) {
      console.error('Handoff WebSocket not connected');
      return false;
    }

    handoffWsRef.current.send(JSON.stringify({
      type: 'message',
      content,
    }));

    return true;
  }, []);

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      if (handoffWsRef.current) {
        handoffWsRef.current.close();
      }
    };
  }, []);

  const handleSend = useCallback(async () => {
    const userMessage = input.trim();
    if (!userMessage || loading) return;
    const userMessageLower = userMessage.toLowerCase();

    // Abusive language check (match whole words only)
    const abusivePattern = new RegExp(`\\b(${CONFIG.KEYWORDS.abusive.join('|')})\\b`, 'i');
    if (abusivePattern.test(userMessageLower)) {
      sendBotMessage("Please refrain from using inappropriate language. Let's keep the conversation professional.");
      setInput('');
      return;
    }

    const userMsg: Message = { id: Date.now(), from: 'user', text: userMessage, displayText: userMessage };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    // If in handoff mode (waiting or connected), send via WebSocket
    if (handoffMode === 'waiting' || handoffMode === 'connected') {
      const sent = sendHandoffMessage(userMessage);
      if (!sent) {
        sendBotMessage('Unable to send message. Please wait for agent connection.');
      }
      return;
    }

    setLoading(true);

    // Handle human request - initiate handoff process
    if (CONFIG.KEYWORDS.humanRequest.some((phrase) => userMessageLower.includes(phrase))) {
      await initiateHandoff();
      setLoading(false);
      return;
    }


    // Handle brand mentions
    if (CONFIG.KEYWORDS.brandMentions.includes(userMessageLower)) {
      const normalizedMsg = normalizeMessage(userMessage);
      const newCount = (messageRepetitions[normalizedMsg] || 0) + 1;
      setMessageRepetitions((prev) => {
        const updated = { ...prev, [normalizedMsg]: newCount };
        setLocalStorageItem('messageRepetitions', updated);
        return updated;
      });

      try {
        const res = await fetch(BACKEND_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', accept: 'application/json' },
          body: JSON.stringify({ query: userMessage, session_id: '23', user_type: userType }),
        });
        if (!res.ok) throw new Error(`Failed to get response: ${res.status}`);
        const data: ChatResponse = await res.json();
        if (data.error) throw new Error(data.error);
        const responseText = data.response || data.answer;
        if (!responseText) throw new Error('No response received');
        sendBotMessage(responseText);
      } catch {
        sendBotMessage('Sorry, something went wrong. Please try again.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Handle greetings
    if (isGreeting(userMessage)) {
      // setSessionStorageItem('greetingCount', (parseInt(getSessionStorageItem('greetingCount', '0')) + 1).toString());
    }

    // Handle job application detection
    const jobApplicationKeywords = [
      "apply for job", "job application", "career", "vacancy", "vacancies", "resume", "cv", "hiring", "recruitment",
      "open position", "job opening", "work with you", "join your team", "submit my resume", "submit my cv",
      "job opportunity", "employment", "job posting", "job offer", "job portal", "job board", "job seeker", "apply", "job",
      "skill", "skills",
      // Intern/Trainee specific keywords
      "intern", "internship", "trainee", "training", "apprentice", "apprenticeship", "entry level", "entry-level", "junior", "fresher", "graduate", "student", "learning", "mentorship", "mentor", "coaching", "coach",
      // Programming Languages
      "javascript", "python", "java", "c#", "c++", "typescript", "php", "ruby", "go", "swift", "kotlin", "r", "scala", "rust",
      // Web Development
      "html", "css", "sass", "scss", "react", "react.js", "angular", "vue", "vue.js", "next.js", "node.js", "express.js", "django", "flask", "asp.net", "laravel",
      // Mobile Development
      "react native", "flutter", "objective-c", "android studio",
      // Databases
      "sql", "mysql", "postgresql", "mongodb", "sqlite", "redis", "oracle",
      // DevOps & Cloud
      "docker", "kubernetes", "jenkins", "git", "github", "gitlab", "bitbucket", "aws", "amazon web services", "azure", "google cloud", "gcp", "terraform", "ansible", "ci/cd",
      // Data Science & Analytics
      "pandas", "numpy", "scipy", "scikit-learn", "tensorflow", "pytorch", "keras", "tableau", "power bi", "excel",
      // Cybersecurity
      "penetration testing", "network security", "firewalls", "ethical hacking", "security auditing",
      // Other Technical Skills
      "rest api", "graphql", "websockets", "microservices", "agile", "scrum", "ui/ux", "figma", "adobe xd", "photoshop", "illustrator", "seo", "wordpress", "shopify"
    ];

    const jobApplyDetected = jobApplicationKeywords.some(keyword => {
      try {
        const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`, 'i');
        return regex.test(userMessageLower);
      } catch {
        return false;
      }
    });

    // Check for intern/trainee specific keywords
    const internTraineeKeywords = ['intern', 'internship', 'trainee', 'training', 'apprentice', 'apprenticeship', 'entry level', 'entry-level', 'junior', 'fresher', 'graduate', 'student', 'learning', 'mentorship', 'mentor', 'coaching', 'coach'];
    const isInternTraineeRequest = internTraineeKeywords.some(keyword => {
      try {
        const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`, 'i');
        return regex.test(userMessageLower);
      } catch {
        return false;
      }
    });

    if (jobApplyDetected) {
      if (isInternTraineeRequest) {
        sendBotMessage("I've recognized your interest in trainee and internship opportunities. The application form has been pre-configured with appropriate trainee options to enhance your application experience.");
        setJobFormHeading('Intern & Trainee Application');
      } else {
        sendBotMessage("Great! I've detected you're interested in job opportunities. Let me show you the job application form.");
        setJobFormHeading('Job Application');
      }
      setShowJobForm(true);
      setInput("");
      setLoading(false);
      return;
    }

    // Handle lead form detection
    const leadFormScore = CONFIG.KEYWORDS.leadForm.reduce((score, word) => (userMessageLower.includes(word) ? score + 1 : score), 0);
    if (leadFormScore >= 1) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg?.text === userMessage && lastMsg.from === 'user') {
        sendBotMessage('It looks like you are repeating your request. Please fill out the contact form below.');
        setShowCustomerSupportModal(true);
      } else {
        sendBotMessage('It looks like you are interested in our services. Please fill out the contact form.');
        setShowCustomerSupportModal(true);
      }
      setInput("");
      setLoading(false);
      return;
    }

    // Handle user type detection
    const detectedType = CONFIG.KEYWORDS.employee.some((word) => userMessageLower.includes(word))
      ? 'employee'
      : CONFIG.KEYWORDS.customer.some((word) => userMessageLower.includes(word))
        ? 'customer'
        : null;

    if (detectedType) {
      setUserType(detectedType);
      setShowLoginModal(true);
      setLoading(false);
      return;
    }

    // Handle helpdesk detection - requires authentication
    const isEmployeeHelpdesk = CONFIG.KEYWORDS.employeeHelpdesk.some((word) => userMessageLower.includes(word));
    const isCustomerHelpdesk = CONFIG.KEYWORDS.customerHelpdesk.some((word) => userMessageLower.includes(word));



    if (isEmployeeHelpdesk) {
      if (!isAuthenticated) {
        sendBotMessage("I've detected you're looking for employee helpdesk support. Please login as an employee to access the internal helpdesk system.");
        setUserType('employee');
        setShowLoginModal(true);
        setLoading(false);
        return;
      } else if (userType !== 'employee') {
        sendBotMessage("I've detected you're looking for employee helpdesk support. You need to be logged in as an employee to access the internal helpdesk system. Please logout and login as an employee.");
        setLoading(false);
        return;
      } else {
        sendBotMessage("Welcome to the employee helpdesk! I'll open the ticket creation form for you.");
        setTicketFormHeading('Employee Helpdesk Ticket');
        setShowTicketForm(true);
        setLoading(false);

        return;
      }
    }

    if (isCustomerHelpdesk) {
      if (!isAuthenticated) {
        sendBotMessage("I've detected you're looking for customer helpdesk support. Please login as a customer to access the customer helpdesk system.");
        setUserType('customer');
        setShowLoginModal(true);
        setLoading(false);
        return;
      } else if (userType !== 'customer') {
        sendBotMessage("I've detected you're looking for customer helpdesk support. You need to be logged in as a customer to access the customer helpdesk system. Please logout and login as a customer.");
        setLoading(false);
        return;
      } else {
        sendBotMessage("Welcome to the customer helpdesk! I'll open the ticket creation form for you.");
        setTicketFormHeading('Customer Helpdesk Ticket');
        setShowTicketForm(true);
        setLoading(false);

        return;
      }
    }

    // Analyze user type if not authenticated
    if (!isAuthenticated) {
      try {
        const res = await fetch(CONFIG.ANALYZE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: userMessage }),
        });
        const data = await res.json();
        if (data.user_type === 'employee' || data.user_type === 'customer') {
          setUserType(data.user_type);
          setShowLoginModal(true);
          setLoading(false);
          return;
        }
      } catch {
        console.error('User type analysis failed');
      }
    }

    // Default chatbot response
    try {
      const res = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ query: userMessage, session_id: '23', user_type: userType }),
      });
      if (!res.ok) throw new Error(`Failed to get response: ${res.status}`);
      const data: ChatResponse = await res.json();
      if (data.error) throw new Error(data.error);
      const responseText = data.response || data.answer;
      if (!responseText) throw new Error('No response received');
      sendBotMessage(responseText);
    } catch {
      sendBotMessage('Sorry, something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [input, messages, userType, isAuthenticated, isGreeting, messageRepetitions, loading, sendBotMessage, handoffMode, initiateHandoff, sendHandoffMessage]);

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new URLSearchParams({
        grant_type: 'password',
        username: email.trim(),
        password: password.trim(),
        scope: '',
        client_id: 'string',
        client_secret: 'string',
      });

      const response = await fetch(CONFIG.AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', accept: 'application/json' },
        body: formData.toString(),
      });

      const responseData = await response.json();
      if (!response.ok) throw new Error(responseData.detail || 'Invalid credentials');

      setLocalStorageItem('token', responseData.access_token);
      setLocalStorageItem('isAuthenticated', true);
      document.cookie = `isAuthenticated=true; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Strict`;
      setIsAuthenticated(true);
      setShowLoginModal(false);
      setUserType(null); // Reset userType so login modal doesn't reappear
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 100);
      // Optionally, send a confirmation message
      sendBotMessage('Login successful! You can now chat with the bot.');
      // Force a full reload to guarantee clean chat state
      window.location.reload();
    } catch {
      console.error('Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/logout`, {
        method: 'POST',
        headers: { 'accept': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Logout failed');
      }

      // Clear authentication state
      setLocalStorageItem('token', '');
      setLocalStorageItem('isAuthenticated', false);
      document.cookie = 'isAuthenticated=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      setIsAuthenticated(false);
      setUserType(null);

      // Reset chat state
      setMessages([CONFIG.INITIAL_MESSAGE]);
      setInput('');

      // Send logout confirmation message
      sendBotMessage('You have been successfully logged out. How can I help you today?');

    } catch (error) {
      console.error('Logout failed:', error);
      sendBotMessage('There was an issue with logout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const WelcomeScreen = React.memo(({ onStartChat }: { onStartChat: () => void }) => (
    <div className={styles.customChatbotUi}>
      <div className={styles.customChatbotHeader}>
        <button onClick={toggleChatbot} className={styles.customCloseBtn}>×</button>
        <span className={styles.customBotTitle}>Chatbot</span>
        <div style={{ width: '24px' }}></div>
      </div>
      <div className={styles.customChatbotWelcome}>
        <div className={styles.customWelcomeAvatar}>
          <Image src={selectedAvatar} alt="AI Avatar" width={100} height={100} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div className={styles.customWelcomeTitle}>
          Hello<br />
          I&apos;m {botName}
        </div>
        <div className={styles.customWelcomeDesc}>{welcomeMessage}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
          <button className={styles.customWelcomeBtn} onClick={onStartChat}>
            Let&apos;s Chat!
          </button>
          <button
            className="px-4 py-1 rounded bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2"
            onClick={() => {
              setShowWelcome(false);
              sendBotMessage('A customer support representative will contact you shortly.');
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-log-in w-5 h-5"
            >
              <path d="m10 17 5-5-5-5"></path>
              <path d="M15 12H3"></path>
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
            </svg>
            Customer Support
          </button>
        </div>
      </div>
    </div>
  ));
  WelcomeScreen.displayName = 'WelcomeScreen';

  const LoginModal = () => (
    <Modal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)}>
      <div style={{ padding: 24, background: '#fff', borderRadius: 8, minWidth: 300 }}>
        <h2 style={{ marginBottom: 16 }}>Login as {userType === 'employee' ? 'Employee' : 'Customer'}</h2>
        <form onSubmit={handleLogin} style={{ width: '100%', maxWidth: '300px' }}>
          <div style={{ marginBottom: '1rem' }}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
              required
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.5rem',
              backgroundColor: '#007BFF',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </Modal>
  );

  const CustomerSupportModal = () => {
    const [formData, setFormData] = useState({ name: '', email: '', phone: '', interest: '', source: '', message: '' });
    const [formStatus, setFormStatus] = useState('');
    const [formLoading, setFormLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setFormLoading(true);
      setFormStatus('');

      try {
        const response = await fetch(CONFIG.LEAD_FORM_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            source: formData.source,
            message: formData.message,
            lead_metadata: { interest: formData.interest },
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Submission failed.');
        }

        setFormStatus('Submitted successfully!');
        setFormData({ name: '', email: '', phone: '', interest: '', source: '', message: '' });

        const sessionId = getLocalStorageItem('chatbot_session_id', '') || getSessionStorageItem('chatbot_session_id', '');
        const chatMessages = getLocalStorageItem<Message[]>('chatbot_messages', []);

        if (sessionId && chatMessages.length > 0) {
          try {
            const saveRes = await fetch(CONFIG.SAVE_SESSION_URL, {
              method: 'POST',
              headers: { accept: 'application/json', 'Content-Type': 'application/json' },
              body: JSON.stringify({ session_id: sessionId, title: formData.name || 'Contact Form Submission' }),
            });
            if (!saveRes.ok) console.error('Failed to save session:', await saveRes.json());
          } catch (err) {
            console.error('Error saving session:', err);
          }
        }

        setTimeout(() => {
          setShowCustomerSupportModal(false);
          setFormStatus('');
        }, 2000);
      } catch (error) {
        setFormStatus((error as Error).message || 'Submission failed. Server error.');
      } finally {
        setFormLoading(false);
      }
    };

    return (
      <Modal isOpen={showCustomerSupportModal} onClose={() => setShowCustomerSupportModal(false)}>
        <div style={{ padding: 24, background: '#fff', borderRadius: 16, minWidth: 320, maxWidth: 400, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 28, marginRight: 8 }}>🚀</span>
            <h2 style={{ fontWeight: 700, fontSize: 24, color: '#222' }}>Contact Us</h2>
          </div>
          {formStatus && (
            <div
              style={{
                padding: '8px 12px',
                borderRadius: '4px',
                marginBottom: '16px',
                backgroundColor: formStatus.includes('success') ? '#d4edda' : '#f8d7da',
                color: formStatus.includes('success') ? '#155724' : '#721c24',
                textAlign: 'center',
              }}
            >
              {formStatus}
            </div>
          )}
          <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 340, margin: '0 auto' }}>
            {['name', 'email', 'phone'].map((field) => (
              <div key={field} style={{ marginBottom: '1rem' }}>
                <input
                  type={field === 'email' ? 'email' : 'text'}
                  placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                  value={formData[field as keyof typeof formData]}
                  onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ccc', marginBottom: 8 }}
                  required
                />
              </div>
            ))}

            {/* Message Field */}
            <div style={{ marginBottom: '1rem' }}>
              <textarea
                placeholder="Message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows={4}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #ccc',
                  marginBottom: 8,
                  resize: 'none',
                  fontFamily: 'inherit'
                }}
                required
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <select
                value={formData.interest}
                onChange={(e) => setFormData({ ...formData, interest: e.target.value })}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ccc', marginBottom: 8 }}
                required
              >
                <option value="" disabled>
                  Select Interest
                </option>
                {[
                  'Web Development',
                  'Mobile App Development',
                  'UI/UX Design',
                  'Digital Marketing',
                  'AI & Machine Learning',
                  'Cloud Solutions',
                  'E-commerce Development',
                  'Custom Software',
                  'IT Consulting',
                  'DevOps Services',
                  'Data Analytics',
                  'Cybersecurity',
                  'Other',
                ].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <select
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ccc', marginBottom: 8 }}
                required
              >
                <option value="" disabled>
                  Select Source
                </option>
                {[
                  'Website',
                  'Google Search',
                  'Social Media',
                  'LinkedIn',
                  'Facebook',
                  'Instagram',
                  'Twitter',
                  'Google Ads',
                  'Referral',
                  'Email Marketing',
                  'Content Marketing',
                  'Trade Show',
                  'Cold Outreach',
                  'Other',
                ].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={formLoading}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'linear-gradient(to right, #3b82f6, #a21caf)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: 16,
                cursor: formLoading ? 'not-allowed' : 'pointer',
                marginTop: 8,
                opacity: formLoading ? 0.7 : 1,
              }}
            >
              {formLoading ? (
                <>
                  <span style={{ marginRight: 8, display: 'inline-block', verticalAlign: 'middle' }}>
                    <svg width="18" height="18" viewBox="0 0 38 38" stroke="#fff">
                      <g fill="none" fillRule="evenodd">
                        <g transform="translate(1 1)" strokeWidth="3">
                          <circle strokeOpacity=".3" cx="18" cy="18" r="18" />
                          <path d="M36 18c0-9.94-8.06-18-18-18">
                            <animateTransform
                              attributeName="transform"
                              type="rotate"
                              from="0 18 18"
                              to="360 18 18"
                              dur="1s"
                              repeatCount="indefinite"
                            />
                          </path>
                        </g>
                      </g>
                    </svg>
                  </span>
                  Submitting...
                </>
              ) : (
                'Submit'
              )}
            </button>
          </form>
        </div>
      </Modal>
    );
  };

  const TicketFormModal = () => {

    const [formData, setFormData] = useState({
      email: '',
      issueType: '',
      issue: '',
      message: ''
    });
    const [formStatus, setFormStatus] = useState('');
    const [formLoading, setFormLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setFormLoading(true);
      setFormStatus('');

      try {
        // Simulate API call for ticket submission
        await new Promise(resolve => setTimeout(resolve, 1000));

        setFormStatus('Ticket submitted successfully!');
        setFormData({ email: '', issueType: '', issue: '', message: '' });

        setTimeout(() => {
          setShowTicketForm(false);
          setFormStatus('');
        }, 2000);
      } catch {
        setFormStatus('Failed to submit ticket. Please try again.');
      } finally {
        setFormLoading(false);
      }
    };

    return (
      <Modal isOpen={showTicketForm} onClose={() => setShowTicketForm(false)}>
        <div style={{
          padding: 24,
          background: '#fff',
          borderRadius: 16,
          minWidth: 400,
          maxWidth: 500,
          margin: '0 auto',
          position: 'relative'
        }}>
          {/* Close button */}
          <button
            onClick={() => setShowTicketForm(false)}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: '#666'
            }}
          >
            ×
          </button>

          {/* Header */}
          <h2 style={{
            fontWeight: 700,
            fontSize: 24,
            color: '#222',
            marginBottom: 24,
            textAlign: 'center'
          }}>
            {ticketFormHeading}
          </h2>

          {formStatus && (
            <div
              style={{
                padding: '8px 12px',
                borderRadius: '4px',
                marginBottom: '16px',
                backgroundColor: formStatus.includes('success') ? '#d4edda' : '#f8d7da',
                color: formStatus.includes('success') ? '#155724' : '#721c24',
                textAlign: 'center',
              }}
            >
              {formStatus}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ width: '100%' }}>
            {/* Email Field */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: 600,
                color: '#333'
              }}>
                Email <span style={{ color: '#dc3545' }}>*</span>
              </label>
              <input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #ccc',
                  fontSize: '14px',
                  backgroundColor: '#f8f9fa'
                }}
                required
              />
            </div>

            {/* Issue Type Field */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: 600,
                color: '#333'
              }}>
                Issue Type <span style={{ color: '#dc3545' }}>*</span>
              </label>
              <select
                value={formData.issueType}
                onChange={(e) => setFormData({ ...formData, issueType: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #ccc',
                  fontSize: '14px',
                  backgroundColor: '#f8f9fa'
                }}
                required
              >
                <option value="" disabled>
                  Select Issue Type
                </option>
                {[
                  'Technical Issue',
                  'Account Problem',
                  'Billing Issue',
                  'Feature Request',
                  'Bug Report',
                  'General Inquiry',
                  'Access Problem',
                  'Performance Issue',
                  'Security Concern',
                  'Other'
                ].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            {/* Issue Field */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: 600,
                color: '#333'
              }}>
                Issue <span style={{ color: '#dc3545' }}>*</span>
              </label>
              <select
                value={formData.issue}
                onChange={(e) => setFormData({ ...formData, issue: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #ccc',
                  fontSize: '14px',
                  backgroundColor: '#f8f9fa'
                }}
                required
              >
                <option value="" disabled>
                  Select Issue
                </option>
                {[
                  'Login Problem',
                  'Password Reset',
                  'Account Locked',
                  'Cannot Access Feature',
                  'System Error',
                  'Slow Performance',
                  'Data Not Loading',
                  'Payment Failed',
                  'Subscription Issue',
                  'Report Bug',
                  'Request Feature',
                  'General Question',
                  'Other'
                ].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            {/* Message Field */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: 600,
                color: '#333'
              }}>
                Message <span style={{ color: '#dc3545' }}>*</span>
              </label>
              <textarea
                placeholder="Message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows={4}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #ccc',
                  fontSize: '14px',
                  backgroundColor: '#f8f9fa',
                  resize: 'none',
                  fontFamily: 'inherit'
                }}
                required
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={formLoading}
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: '#007BFF',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: 16,
                cursor: formLoading ? 'not-allowed' : 'pointer',
                opacity: formLoading ? 0.7 : 1,
              }}
            >
              {formLoading ? 'Submitting...' : 'Submit'}
            </button>
          </form>
        </div>
      </Modal>
    );
  };

  const MessageBubble = React.memo(({ message }: { message: Message }) => (
    <div className={`${styles.customMessageRow} ${message.from === 'bot' ? styles.bot : styles.user}`}>
      <div className={`${styles.customMessageBubble} ${message.from === 'bot' ? styles.bot : styles.user}`} style={{ whiteSpace: 'pre-line', marginBottom: '0.5em' }}>
        {typeof message.displayText === 'string' && message.displayText.length > 0
          ? message.displayText
          : message.text}
        {message.isTyping && <span className={styles.typingCursor}>|</span>}
      </div>
    </div>
  ));
  MessageBubble.displayName = 'MessageBubble';

  useEffect(() => {
    setLocalStorageItem('chatbot_messages', messages);
  }, [messages]);

  useEffect(() => {
    const handleResetChat = (event: CustomEvent<{ reset: boolean }>) => {
      if (event.detail?.reset) {
        if (messages.length > 1) {
          saveSession(messages);
          setRecentSessions(getRecentSessions());
        }
        setMessages([CONFIG.INITIAL_MESSAGE]);
        setShowWelcome(true);
        setInput('');
        setSelectedAvatar(CONFIG.DEFAULT_AVATAR);
        setBotName(CONFIG.DEFAULT_BOT_NAME);
        setWelcomeMessage(CONFIG.DEFAULT_WELCOME_MESSAGE);
        setMessageRepetitions({});
        setLocalStorageItem('selectedChatbotAvatar', CONFIG.DEFAULT_AVATAR);
        setLocalStorageItem('chatbotName', CONFIG.DEFAULT_BOT_NAME);
        setLocalStorageItem('chatbotWelcomeMessage', CONFIG.DEFAULT_WELCOME_MESSAGE);
        setSessionStorageItem('chatbot_welcome_shown', '');
        setSessionStorageItem('messageRepetitions', '{}');
      }
    };
    window.addEventListener('resetChat', handleResetChat as EventListener);
    return () => window.removeEventListener('resetChat', handleResetChat as EventListener);
  }, [messages]);

  // Listen for logout event to clear chat state
  useEffect(() => {
    const handleLogout = () => {
      // Reset chat state to default
      setMessages([CONFIG.INITIAL_MESSAGE]);
      setInput('');
      setSelectedAvatar(CONFIG.DEFAULT_AVATAR);
      setBotName(CONFIG.DEFAULT_BOT_NAME);
      setWelcomeMessage(CONFIG.DEFAULT_WELCOME_MESSAGE);
      setMessageRepetitions({});
      setShowWelcome(true);
      setRecentSessions([]);
      setIsAuthenticated(false);
      setUserType(null);
    };

    window.addEventListener('userLoggedOut', handleLogout);
    return () => window.removeEventListener('userLoggedOut', handleLogout);
  }, []);

  useEffect(() => {
    const handleAvatarChange = (event: CustomEvent<{ avatarPath: string }>) => {
      const newAvatar = event.detail?.avatarPath;
      if (newAvatar) {
        setSelectedAvatar(newAvatar);
        setLocalStorageItem('selectedChatbotAvatar', newAvatar);
      }
    };
    window.addEventListener('avatarChanged', handleAvatarChange as EventListener);
    return () => window.removeEventListener('avatarChanged', handleAvatarChange as EventListener);
  }, []);

  useEffect(() => {
    const handleBotNameChange = (event: CustomEvent<{ name: string }>) => {
      const newName = event.detail?.name;
      if (newName) {
        setBotName(newName);
        setLocalStorageItem('chatbotName', newName);
      }
    };
    window.addEventListener('botNameChanged', handleBotNameChange as EventListener);
    return () => window.removeEventListener('botNameChanged', handleBotNameChange as EventListener);
  }, []);

  useEffect(() => {
    const handleWelcomeMessageChange = (event: CustomEvent<{ message: string }>) => {
      const newMessage = event.detail?.message;
      if (newMessage) {
        setWelcomeMessage(newMessage);
        setLocalStorageItem('chatbotWelcomeMessage', newMessage);
      }
    };
    window.addEventListener('welcomeMessageChanged', handleWelcomeMessageChange as EventListener);
    return () => window.removeEventListener('welcomeMessageChanged', handleWelcomeMessageChange as EventListener);
  }, []);

  useEffect(() => {
    if (!showWelcome) scrollToBottom();
  }, [messages, showWelcome, scrollToBottom]);

  useEffect(() => {
    if (!showWelcome && inputRef.current) inputRef.current.focus();
  }, [showWelcome]);

  useEffect(() => {
    if (!showWelcome && messages.length > 0 && messages[messages.length - 1].from === 'bot' && !messages[messages.length - 1].isTyping && inputRef.current) {
      inputRef.current.focus();
    }
  }, [messages, showWelcome]);

  useEffect(() => {
    if (isAuthenticated) {
      setMessages([CONFIG.INITIAL_MESSAGE]);
      localStorage.removeItem('chatbot_messages');
      sessionStorage.removeItem('chatbot_messages');
    }
  }, [isAuthenticated]);

  if (showWelcome) {
    return <WelcomeScreen onStartChat={() => setShowWelcome(false)} />;
  }

  return (
    <div className={styles.customChatbotUi}>
      <div className={styles.customChatbotHeader}>
        <button onClick={toggleChatbot} className={styles.customCloseBtn}>×</button>
        <span className={styles.customBotTitle}>Hello, I&apos;m {botName}</span>
        <div style={{ width: '50px', height: '50px', borderRadius: '50%', overflow: 'hidden' }}>
          <Image src={selectedAvatar} alt="AI Avatar" width={50} height={50} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      </div>

      {/* Handoff Status Banner */}
      {handoffMode !== 'idle' && (
        <div style={{
          padding: '8px 16px',
          background: handoffMode === 'connected' ? '#28a745' : handoffMode === 'waiting' ? '#ffc107' : '#6c757d',
          color: handoffMode === 'waiting' ? '#000' : '#fff',
          textAlign: 'center',
          fontSize: '14px',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}>
          {handoffMode === 'waiting' && (
            <>
              <span style={{ animation: 'pulse 1.5s infinite' }}>⏳</span>
              Waiting for agent... {handoffQueuePosition && `(#${handoffQueuePosition} in queue)`}
            </>
          )}
          {handoffMode === 'connected' && (
            <>
              <span>👤</span>
              Connected to {handoffAgentName || 'Agent'}
            </>
          )}
          {handoffMode === 'pending' && (
            <>
              <span>🔄</span>
              Connecting...
            </>
          )}
          {handoffMode === 'ended' && (
            <>
              <span>✓</span>
              Chat ended
            </>
          )}
        </div>
      )}

      <div className={styles.customChatbotMessages}>
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {loading && (
          <div className={`${styles.customMessageRow} ${styles.bot}`}>
            <div className={`${styles.customMessageBubble} ${styles.bot}`}>
              <div className={styles.typingIndicator}>
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', margin: '1rem 0' }}>
        <button
          className="px-4 py-1 rounded bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2"
          onClick={() => setShowCustomerSupportModal(true)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="lucide lucide-log-in w-5 h-5"
          >
            <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
            <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3" />
            <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3" />
          </svg>
        </button>
        {isAuthenticated && (
          <button
            className="px-4 py-1 rounded bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition flex items-center justify-center gap-2"
            onClick={() => {
              setTicketFormHeading('Test Ticket');
              setShowTicketForm(true);

            }}
          >
            Test Ticket Form
          </button>
        )}
        {isAuthenticated && (
          <button
            style={{ padding: '0.5rem 1.5rem', borderRadius: '8px', backgroundColor: '#dc3545', color: 'white', fontWeight: 600, border: 'none', cursor: 'pointer', fontSize: '1rem', transition: 'background 0.2s' }}
            onClick={handleLogout}
          >
            Logout
          </button>
        )}
        {!isAuthenticated && (
          <>
            <button
              style={{ padding: '0.5rem 1.5rem', borderRadius: '8px', backgroundColor: '#007BFF', color: 'white', fontWeight: 600, border: 'none', cursor: 'pointer', fontSize: '1rem', transition: 'background 0.2s' }}
              onClick={() => {
                setUserType('employee');
                setShowLoginModal(true);
              }}
            >
              Employee Login
            </button>
            <button
              style={{ padding: '0.5rem 1.5rem', borderRadius: '8px', backgroundColor: '#28a745', color: 'white', fontWeight: 600, border: 'none', cursor: 'pointer', fontSize: '1rem', transition: 'background 0.2s' }}
              onClick={() => {
                setUserType('customer');
                setShowLoginModal(true);
              }}
            >
              Customer Login
            </button>
          </>
        )}
      </div>
      <div className={styles.customChatbotInputArea}>
        <input
          ref={inputRef}
          className={styles.customChatbotInput}
          type="text"
          placeholder="Message"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleInputKeyDown}
          disabled={loading}
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          style={{ fontSize: '25px', color: 'white', backgroundColor: '#007BFF', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          ➤
        </button>
      </div>
      {showLoginModal && <LoginModal />}
      {showCustomerSupportModal && <CustomerSupportModal />}
      {showTicketForm && <TicketFormModal />}
      {showJobForm && (
        <Modal isOpen={showJobForm} onClose={() => setShowJobForm(false)}>
          <JobApplicationForm source="Chatbot" onSuccess={() => setShowJobForm(false)} heading={jobFormHeading} />
        </Modal>
      )}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', margin: '1rem 0' }}>
        <button
          style={{ padding: '0.5rem 1.5rem', borderRadius: '8px', backgroundColor: '#6c757d', color: 'white', fontWeight: 600, border: 'none', cursor: 'pointer', fontSize: '1rem', transition: 'background 0.2s' }}
          onClick={() => setShowHistoryModal(true)}
        >
          View Recent Chats
        </button>
      </div>
      {showHistoryModal && (
        <Modal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)}>
          <div style={{ padding: 24, background: '#fff', borderRadius: 16, minWidth: 320, maxWidth: 400, margin: '0 auto' }}>
            <h2 style={{ fontWeight: 700, fontSize: 20, marginBottom: 16 }}>Recent Chats</h2>
            {recentSessions.length === 0 && <div>No recent chats found.</div>}
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {recentSessions.map((session, idx) => (
                <li key={idx} style={{ marginBottom: 12 }}>
                  <button
                    style={{ width: '100%', textAlign: 'left', padding: '0.5rem', borderRadius: '6px', border: '1px solid #ccc', background: '#f8f9fa', cursor: 'pointer', fontWeight: 500 }}
                    onClick={() => {
                      setMessages(session);
                      setShowHistoryModal(false);
                    }}
                  >
                    {session.filter((m) => m.from === 'user').map((m) => m.text).slice(0, 2).join(' | ').slice(0, 60) || 'Chat'}
                  </button>
                </li>
              ))}
            </ul>
            <button
              style={{ marginTop: 16, width: '100%', borderRadius: 6, background: '#007BFF', color: 'white', padding: '0.5rem', border: 'none', fontWeight: 600 }}
              onClick={() => setShowHistoryModal(false)}
            >
              Close
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default React.memo(ChatbotComponent);