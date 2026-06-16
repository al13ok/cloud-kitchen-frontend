'use client';
import React, { useState, useRef, useEffect, Suspense, useCallback } from 'react';
import { Send, User, MessageCircle } from 'lucide-react';
import Image from 'next/image';
import { getDomain, getBaseUrl } from '@/utils/domainConfig';
import PageHeader from '@/components/common/PageHeader';
import { useSearchParams } from 'next/navigation';

 

// Add custom styles for message bubble text wrapping
const messageBubbleStyles = `
 .message-bubble-text {
 word-break: break-word;
 overflow-wrap: anywhere;
 hyphens: auto;
 white-space: pre-wrap;
 }
 
 .message-bubble-text a {
 word-break: break-all;
 }
 
 .message-bubble-text pre {
 white-space: pre-wrap;
 word-break: break-word;
 overflow-x: auto;
 }
 
 .message-bubble-text code {
 word-break: break-all;
 }
`;

 

// Define custom event interface
interface CustomEvent<T = unknown> extends Event {
 detail?: T;
}
interface Source {
 title: string;
 url: string;
}
// API Response interface
interface ApiResponse {
 query: string;
 answer: string;
 sources: Source;
}

 

// API Request interface
interface ApiRequest {
 query: string;
 num_results: number;
 similarity_threshold: number;
 session_id: string;
 use_session_history: boolean;
 session_history_title: string;
}

 

// Completed form data interface
interface CompletedForm {
 form_type: string;
 completed_at: number;
 data: Record<string, unknown>;
 result_id?: string;
}

// Message interface
interface Message {
 id: number;
 type: 'user' | 'assistant';
 content: string;
 isTyping: boolean;
 timestamp?: string | number; // Timestamp from API (string for ISO format, number for Unix timestamp)
 buttons?: Array<{
  id: string;
  title: string;
 }>;
 // For list type messages
 header?: string;
 sections?: Array<{
  title?: string;
  rows?: Array<{
   id: string;
   title: string;
   description?: string;
  }>;
 }>;
 form?: {
  title?: string;
  fields?: Array<{
   id: string;
   label: string;
   type: string;
   required?: boolean;
   placeholder?: string;
  }>;
 };
 messageType?: string;
 completedForm?: CompletedForm;
}

 

// Markdown rendering function
const renderMarkdown = (text: string) => {
 // Handle line breaks first
 let html = text.replace(/\n/g, '<br>');

 

 // Handle bold text (**text** or __text__)
 html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
 html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');

 

 // Handle italic text (*text* or _text_)
 html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
 html = html.replace(/_(.*?)_/g, '<em>$1</em>');

 

 // Handle code blocks (```code```)
 html = html.replace(/```([\s\S]*?)```/g, '<pre style="background-color: #f4f4f4; padding: 8px; border-radius: 4px; overflow-x: auto; margin: 8px 0;"><code>$1</code></pre>');

 

 // Handle inline code (`code`)
 html = html.replace(/`([^`]+)`/g, '<code style="background-color: #f4f4f4; padding: 2px 4px; border-radius: 3px; font-family: monospace;">$1</code>');

 

 // Handle headers (# ## ###)
 html = html.replace(/^### (.*$)/gm, '<h3 style="margin: 12px 0 8px 0; font-size: 1.1em; font-weight: bold;">$1</h3>');
 html = html.replace(/^## (.*$)/gm, '<h2 style="margin: 16px 0 8px 0; font-size: 1.25em; font-weight: bold;">$1</h2>');
 html = html.replace(/^# (.*$)/gm, '<h1 style="margin: 20px 0 8px 0; font-size: 1.5em; font-weight: bold;">$1</h1>');

 

 // Handle unordered lists (- or *)
 html = html.replace(/^[\-\*] (.*)$/gm, '<li style="margin-left: 20px;">$1</li>');
 html = html.replace(/(<li.*<\/li>)/gm, '<ul style="margin: 8px 0; padding-left: 0;">$1</ul>');

 

 // Handle ordered lists (1. 2. 3.)
 html = html.replace(/^(\d+)\. (.*)$/gm, '<li style="margin-left: 20px;">$2</li>');
 html = html.replace(/(<li.*<\/li>)/gm, '<ol style="margin: 8px 0; padding-left: 0;">$1</ol>');

 

 // Handle links [text](url)
 html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color: #3b82f6; text-decoration: underline;" target="_blank" rel="noopener noreferrer">$1</a>');

 

 return html;
};

 

// Helper function to format timestamp
const formatMessageTimestamp = (timestamp?: string | number): string => {
 // If no timestamp provided, use current time
 if (!timestamp) {
 const now = new Date();
 const hours = now.getHours();
 const minutes = now.getMinutes();
 const formattedMinutes = minutes.toString().padStart(2, '0');
 const hours12 = hours % 12 || 12;
 const ampm = hours >= 12 ? 'PM' : 'AM';
 return `${hours12}:${formattedMinutes} ${ampm}`;
 }
 
 try {
 let date: Date;
 if (typeof timestamp === 'string') {
 // Try parsing as ISO string first
 date = new Date(timestamp);
 // If invalid, try parsing as Unix timestamp string
 if (isNaN(date.getTime())) {
 const unixTimestamp = parseInt(timestamp, 10);
 if (!isNaN(unixTimestamp)) {
 // Check if it's in seconds or milliseconds
 date = new Date(unixTimestamp > 1000000000000 ? unixTimestamp : unixTimestamp * 1000);
 }
 }
 } else {
 // Number - check if it's in seconds or milliseconds
 date = new Date(timestamp > 1000000000000 ? timestamp : timestamp * 1000);
 }
 
 if (isNaN(date.getTime())) {
 // If invalid, use current time
 const now = new Date();
 const hours = now.getHours();
 const minutes = now.getMinutes();
 const formattedMinutes = minutes.toString().padStart(2, '0');
 const hours12 = hours % 12 || 12;
 const ampm = hours >= 12 ? 'PM' : 'AM';
 return `${hours12}:${formattedMinutes} ${ampm}`;
 }
 
 // Format as "HH:MM" (24-hour format) or "h:mm AM/PM" (12-hour format)
 const hours = date.getHours();
 const minutes = date.getMinutes();
 const formattedMinutes = minutes.toString().padStart(2, '0');
 
 // Use 12-hour format with AM/PM
 const hours12 = hours % 12 || 12;
 const ampm = hours >= 12 ? 'PM' : 'AM';
 return `${hours12}:${formattedMinutes} ${ampm}`;
 } catch (error) {
 console.error('Error formatting timestamp:', error);
 // On error, return current time
 const now = new Date();
 const hours = now.getHours();
 const minutes = now.getMinutes();
 const formattedMinutes = minutes.toString().padStart(2, '0');
 const hours12 = hours % 12 || 12;
 const ampm = hours >= 12 ? 'PM' : 'AM';
 return `${hours12}:${formattedMinutes} ${ampm}`;
 }
};

// Message content component
const MessageContent = ({ content, isTyping }: { content: string; isTyping: boolean }) => {
 const renderedContent = renderMarkdown(content);

 

 return (
 <div className="text-sm sm:text-base leading-relaxed break-words overflow-wrap-anywhere message-bubble-text">
 <div dangerouslySetInnerHTML={{ __html: renderedContent }} />
 {isTyping && (
 <span className="inline-block w-2 h-4 bg-current ml-1 animate-pulse">|</span>
 )}
 </div>
 );
};

 

interface ConversationHistory {
 query: string;
 response: string;
}

 

interface Conversation {
 title: string;
 domain: string;
 history: ConversationHistory[];
}

 

interface ConversationResponse {
 message: string;
 conversation: Conversation;
}

 

// WhatsApp message type - matches actual API response structure
interface WhatsAppMessageItem {
 role: 'user' | 'assistant' | 'system' | string;
 text: string;
 type?: string;
 buttons?: Array<{
  id: string;
  title: string;
 }>;
 // For list type messages, header and sections are directly on the message
 header?: string;
 sections?: Array<{
  title?: string;
  rows?: Array<{
   id: string;
   title: string;
   description?: string;
  }>;
 }>;
 form?: {
  title?: string;
  fields?: Array<{
   id: string;
   label: string;
   type: string;
   required?: boolean;
   placeholder?: string;
  }>;
 };
 timestamp?: number;
 message_id?: string;
}

 

// Telegram message type
interface TelegramMessageItem {
 type: string;
 user: {
 message: string;
 timestamp: string;
 } | null;
 bot: {
 message: string;
 timestamp: string;
 };
}

 

// Add keyword arrays and utility functions for input validation
const employeeKeywords = ["salary", "hr", "manager", "employee", "payroll", "leave", "attendance", "shift", "promotion", "boss", "work id", "staff", "it", "department", "office", "colleague", "supervisor", "director", "executive", "admin", "administration"];
const customerKeywords = ["order", "support", "refund", "product", "customer", "buy", "purchase", "complaint", "invoice", "delivery", "tracking", "project", "client", "account", "billing", "payment", "subscription", "renewal", "upgrade", "downgrade"];
const leadFormPowerWords = [
 "contact", "get in touch", "request info", "request information", "interested", "want to know more", "demo", "enquire", "enquiry", "quote", "pricing", "price", "hire", "consult", "consultation", "partner", "collaborate", "work with", "business", "proposal", "estimate", "talk to sales", "sales", "assistance",
 "support", "project", "website", "app", "mobile", "web", "design", "marketing", "digital", "solution", "outsource", "freelance", "agency", "company", "team", "expert", "professional", "consultant", "developer", "designer", "marketer",
 "cost", "budget", "investment", "package", "plan", "strategy", "implementation", "deployment", "launch", "maintenance", "upgrade", "improve", "optimize", "enhance", "modernize", "transform", "innovate", "automate","human","speak", "integrate", "customize", "tailor", "bespoke", "enterprise", "startup", "small business"
];
const greetingKeywords = [
 "hello", "hi", "hey", "good morning", "good afternoon", "good evening", "greetings",
 "pleasure to meet you", "nice to meet you", "good to see you", "greetings and salutations"
];
const brandMentions = [
 'yourealty',
];
function isGreeting(message: string): boolean {
 const normalizedMessage = message.toLowerCase().trim();
 return greetingKeywords.some(keyword => normalizedMessage.includes(keyword));
}

 

function ChatComponent() {
 // Initialize states with default values
 const [selectedAvatar, setSelectedAvatar] = useState<string>('/images/user/Bot1.png');
 const [numResults, setNumResults] = useState<number>(15);
 const [similarityThreshold, setSimilarityThreshold] = useState<number>(0.5);
 const [isChatVisible, setIsChatVisible] = useState<boolean>(true);
 const [isClient, setIsClient] = useState(false);
 const [sessionId, setSessionId] = useState<string>('');
 const [messages, setMessages] = useState<Message[]>([{
 id: 1,
 type: 'assistant',
 content: 'Hello! I\'m AI Agent. How can I help you today?',
 isTyping: false,
 timestamp: Date.now(),
 }]);
 const [input, setInput] = useState('');
 const [isLoading, setIsLoading] = useState(false);
 const [isSavePopupOpen, setIsSavePopupOpen] = useState(false);
 const [saveName, setSaveName] = useState('');
 const [saveAlert, setSaveAlert] = useState<{ type: 'success' | 'error', message: string } | null>(null);
 const [profileName, setProfileName] = useState<string | null>(null);
 const messagesEndRef = useRef<HTMLDivElement>(null);
 const searchParams = useSearchParams();
 const title = searchParams.get('title');
 const whatsappSessionId = searchParams.get('session_id');
 const telegramSessionId = searchParams.get('session_id');
 const instagramSessionId = searchParams.get('session_id');
 const type = searchParams.get('type');
 
 // Debug logging for Instagram
 console.log('Instagram Debug Info:', {
 type,
 instagramSessionId,
 title,
 searchParams: Object.fromEntries(searchParams.entries())
 });

 

 const scrollToBottom = useCallback(() => {
 messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
 }, []); // Memoize scrollToBottom function

 

 // Fetch conversation history when component mounts or params change
 useEffect(() => {
 const fetchConversation = async () => {
 if (type === 'whatsapp' && whatsappSessionId) {
 // Handle WhatsApp session
 try {
 // Get WhatsApp session details from localStorage
 const whatsappSessionDetail = localStorage.getItem('whatsappSessionDetail');
 if (whatsappSessionDetail) {
 const sessionData = JSON.parse(whatsappSessionDetail);
 
 // Extract profile name from session data
 if (sessionData.whatsapp && sessionData.whatsapp.profile_name) {
 setProfileName(sessionData.whatsapp.profile_name);
 }
 
 // Ensure messages array exists
 if (sessionData.messages && Array.isArray(sessionData.messages)) {
 // Convert WhatsApp messages to chat format
 const conversationMessages: Message[] = sessionData.messages.map((message: WhatsAppMessageItem, index: number) => {
 // Debug log for list messages
 if (message.type === 'list') {
 console.log('List message found:', { type: message.type, header: message.header, sections: message.sections });
 }
 
 return {
 id: index + 1,
 type: message.role === 'user' ? 'user' : 'assistant',
 content: message.text || '',
 isTyping: false,
 buttons: message.buttons || undefined,
 // For list type messages, header and sections are directly on the message object
 header: message.header || undefined,
 sections: Array.isArray(message.sections) ? message.sections : undefined,
 form: message.form || undefined,
 messageType: message.type || undefined,
 };
 });
 
 // Add completed forms as messages if they exist
 if (sessionData.form_data && sessionData.form_data.completed_forms && Array.isArray(sessionData.form_data.completed_forms)) {
 const completedForms = sessionData.form_data.completed_forms;
 completedForms.forEach((form: CompletedForm, formIndex: number) => {
 const formTypeLabel = form.form_type ? form.form_type.charAt(0).toUpperCase() + form.form_type.slice(1).replace('_', ' ') : 'Form';
 const completedDate = form.completed_at ? new Date(form.completed_at * 1000).toLocaleString() : 'Unknown date';
 
 conversationMessages.push({
 id: conversationMessages.length + formIndex + 1,
 type: 'assistant',
 content: `✅ ${formTypeLabel} Form Completed\n\nCompleted on: ${completedDate}${form.result_id ? `\nReference ID: ${form.result_id}` : ''}`,
 isTyping: false,
 completedForm: form,
 messageType: 'completed_form',
 });
 });
 }
 
 setMessages(conversationMessages);
 return; // Exit early if we successfully loaded from localStorage
 } else {
 console.warn('Invalid WhatsApp session data: messages array not found', sessionData);
 // Fall through to API fetch
 }
 }
 
 // Fallback: Fetch directly from API if localStorage doesn't have it or data is invalid
 {
 const { getWhatsAppBotSession } = await import('@/utils/api');
 // Remove '+' prefix if present for API call
 const cleanSessionId = whatsappSessionId.startsWith('+') ? whatsappSessionId.slice(1) : whatsappSessionId;
 const sessionData = await getWhatsAppBotSession(cleanSessionId);
 
 // Debug: Log the actual response structure
 console.log('WhatsApp session data from API:', sessionData);
 
 // Extract profile name from session data
 if (sessionData.whatsapp && sessionData.whatsapp.profile_name) {
 setProfileName(sessionData.whatsapp.profile_name);
 }
 
 // Store in localStorage for future use
 if (typeof window !== 'undefined') {
 localStorage.setItem('whatsappSessionDetail', JSON.stringify(sessionData));
 }
 
 // The API function ensures messages is always an array (even if empty)
 const messagesArray = sessionData.messages || [];
 
 // If no messages found, show helpful message
 if (messagesArray.length === 0) {
 console.log('WhatsApp session has no messages');
 setMessages([{
 id: 1,
 type: 'assistant',
 content: 'No conversation history found for this WhatsApp session. The session may be empty.',
 isTyping: false,
 timestamp: Date.now(),
 }]);
 return;
 }
 
 // Convert WhatsApp messages to chat format
 const conversationMessages: Message[] = messagesArray.map((message: WhatsAppMessageItem, index: number) => {
 // Debug log for list messages
 if (message.type === 'list') {
 console.log('List message found:', { type: message.type, header: message.header, sections: message.sections });
 }
 
 return {
 id: index + 1,
 type: message.role === 'user' ? 'user' : 'assistant',
 content: message.text || '',
 isTyping: false,
 buttons: message.buttons || undefined,
 // For list type messages, header and sections are directly on the message object
 header: message.header || undefined,
 sections: Array.isArray(message.sections) ? message.sections : undefined,
 form: message.form || undefined,
 messageType: message.type || undefined,
 };
 });
 
 // Add completed forms as messages if they exist
 if (sessionData.form_data && sessionData.form_data.completed_forms && Array.isArray(sessionData.form_data.completed_forms)) {
 const completedForms = sessionData.form_data.completed_forms;
 completedForms.forEach((form: CompletedForm, formIndex: number) => {
 const formTypeLabel = form.form_type ? form.form_type.charAt(0).toUpperCase() + form.form_type.slice(1).replace('_', ' ') : 'Form';
 const completedDate = form.completed_at ? new Date(form.completed_at * 1000).toLocaleString() : 'Unknown date';
 
 conversationMessages.push({
 id: conversationMessages.length + formIndex + 1,
 type: 'assistant',
 content: `✅ ${formTypeLabel} Form Completed\n\nCompleted on: ${completedDate}${form.result_id ? `\nReference ID: ${form.result_id}` : ''}`,
 isTyping: false,
 completedForm: form,
 messageType: 'completed_form',
 });
 });
 }
 
 setMessages(conversationMessages);
 }
 } catch (error) {
 console.error('Error fetching WhatsApp conversation:', error);
 setMessages([{
 id: 1,
 type: 'assistant',
 content: 'Sorry, I couldn\'t load the WhatsApp conversation history. Please try again later.',
 isTyping: false,
 timestamp: Date.now(),
 }]);
 }
 } else if (type === 'telegram' && telegramSessionId) {
 // Handle Telegram session
 try {
 // Get Telegram session details from localStorage
 const telegramSessionDetail = localStorage.getItem('telegramSessionDetail');
 if (telegramSessionDetail) {
 const sessionData = JSON.parse(telegramSessionDetail);
 
 // Convert Telegram messages to chat format
 const conversationMessages: Message[] = [];
 let messageId = 1;
 
 sessionData.messages.forEach((message: TelegramMessageItem) => {
 // Add user message if exists
 if (message.user && message.user.message) {
 conversationMessages.push({
 id: messageId++,
 type: 'user',
 content: message.user.message,
 isTyping: false,
 timestamp: message.user.timestamp || undefined,
 });
 }
 
 // Add bot message
 if (message.bot && message.bot.message) {
 conversationMessages.push({
 id: messageId++,
 type: 'assistant',
 content: message.bot.message,
 isTyping: false,
 timestamp: message.bot.timestamp || undefined,
 });
 }
 });

 

 setMessages(conversationMessages);
 } else {
 throw new Error('Telegram session details not found');
 }
 } catch (error) {
 console.error('Error fetching Telegram conversation:', error);
 setMessages([{
 id: 1,
 type: 'assistant',
 content: 'Sorry, I couldn\'t load the Telegram conversation history. Please try again later.',
 isTyping: false,
 timestamp: Date.now(),
 }]);
 }
 } else if (type === 'instagram' && instagramSessionId) {
 // Handle Instagram session
 console.log('Loading Instagram chat for session:', instagramSessionId);
 try {
 // Get Instagram chat history from localStorage
 const instagramChatHistory = localStorage.getItem('instagramChatHistory');
 console.log('Instagram chat history from localStorage:', instagramChatHistory);
 if (instagramChatHistory) {
 const chatData = JSON.parse(instagramChatHistory);
 console.log('Parsed Instagram chat data:', chatData);
 
 // Convert Instagram messages to chat format
 const conversationMessages: Message[] = [];
 let messageId = 1;
 
 // Check if chatData has the expected structure
 if (chatData.messages && Array.isArray(chatData.messages)) {
 // Process Instagram messages in chronological order (oldest first)
 chatData.messages.forEach((message: { 
 message: string; 
 message_type?: string;
 timestamp?: string;
 [key: string]: unknown 
 }) => {
 // Skip messages with null or undefined message content
 if (!message.message || typeof message.message !== 'string') {
 console.log('Skipping invalid message:', message);
 return;
 }
 
 // Determine message type based on message_type field or content patterns
 let isBotMessage = false;
 
 // First check message_type field if available
 if (message.message_type) {
 isBotMessage = message.message_type === 'bot' || message.message_type === 'assistant' || message.message_type === 'system';
 } else {
 // Fallback to content pattern matching
 const messageText = message.message.toLowerCase();
 isBotMessage = messageText.includes('welcome to mobiloitte') ||
 messageText.includes('mobiagent') ||
 messageText.includes('please select an option') ||
 messageText.includes('session timeout') ||
 messageText.includes('error') ||
 messageText.includes('process cancelled') ||
 messageText.includes('what\'s your') ||
 messageText.includes('let\'s start') ||
 messageText.includes('welcome to') ||
 messageText.includes('hi, i\'m mobiagent') ||
 messageText.includes('hey! i\'m mobiagent') ||
 messageText.includes('hello! mobiagent') ||
 messageText.includes('session inactive') ||
 messageText.includes('session closed') ||
 messageText.includes('session expired') ||
 messageText.includes('this session has been closed') ||
 messageText.includes('session timeout detected') ||
 messageText.includes('reply to resume') ||
 messageText.includes('reply to reconnect') ||
 messageText.includes('reply to this message') ||
 messageText.includes('send any message') ||
 messageText.includes('type a message') ||
 messageText.includes('🛍️') ||
 messageText.includes('🎯') ||
 messageText.includes('📝') ||
 messageText.includes('📧') ||
 messageText.includes('❌') ||
 messageText.includes('🔄') ||
 messageText.includes('👋') ||
 messageText.includes('💡') ||
 messageText.includes('🧠') ||
 messageText.includes('🛠') ||
 messageText.includes('✅') ||
 messageText.includes('## ⚠️');
 }

 // Parse timestamp - handle ISO string format from Instagram API
 let parsedTimestamp: string | number | undefined = undefined;
 if (message.timestamp) {
   try {
     // Try parsing as ISO string first (Instagram format: "2025-12-08T15:17:34.343000")
     const date = new Date(message.timestamp);
     if (!isNaN(date.getTime())) {
       parsedTimestamp = message.timestamp; // Keep as ISO string for formatMessageTimestamp
     }
   } catch {
     console.warn('Failed to parse timestamp:', message.timestamp);
   }
 }

 conversationMessages.push({
 id: messageId++,
 type: isBotMessage ? 'assistant' : 'user',
 content: message.message,
 isTyping: false,
 timestamp: parsedTimestamp || Date.now(), // Use current time as fallback
 });
 });
 } else {
 console.log('Invalid Instagram chat data structure:', chatData);
 // Try alternative data structures
 if (chatData && typeof chatData === 'object') {
 console.log('Attempting to find messages in alternative structure...');
 // Check if messages are directly in the root object
 if (Array.isArray(chatData)) {
 console.log('Found array structure, processing as messages...');
 chatData.forEach((item: { message?: string; message_type?: string; timestamp?: string; [key: string]: unknown }) => {
 if (item.message && typeof item.message === 'string') {
 const messageText = item.message.toLowerCase();
 const isBotMessage = messageText.includes('welcome') || 
 messageText.includes('mobiagent') ||
 messageText.includes('bot') ||
 messageText.includes('assistant');
 
 // Parse timestamp - handle ISO string format from Instagram API
 let parsedTimestamp: string | number | undefined = undefined;
 if (item.timestamp) {
   try {
     // Try parsing as ISO string first (Instagram format: "2025-12-08T15:17:34.343000")
     const date = new Date(item.timestamp);
     if (!isNaN(date.getTime())) {
       parsedTimestamp = item.timestamp; // Keep as ISO string for formatMessageTimestamp
     }
   } catch {
     console.warn('Failed to parse timestamp:', item.timestamp);
   }
 }

 conversationMessages.push({
 id: messageId++,
 type: isBotMessage ? 'assistant' : 'user',
 content: item.message,
 isTyping: false,
 timestamp: parsedTimestamp || Date.now(), // Use current time as fallback
 });
 }
 });
 }
 }
 }
 
 // If no messages, add a default welcome message
 if (conversationMessages.length === 0) {
 conversationMessages.push({
 id: 1,
 type: 'assistant',
 content: 'Welcome to Instagram chat! How can I help you today?',
 isTyping: false,
 timestamp: Date.now(),
 });
 }
 
 console.log('Processed Instagram messages:', conversationMessages);
 setMessages(conversationMessages);
 } else {
 console.log('No Instagram chat history found in localStorage');
 // Try to fetch Instagram chat history directly from API as fallback
 try {
 console.log('Attempting to fetch Instagram chat history from API...');
 const { getInstagramChatHistory } = await import('@/utils/api');
 const chatHistory = await getInstagramChatHistory(instagramSessionId, 50);
 console.log('Fetched Instagram chat history from API:', chatHistory);
 
 if (chatHistory && chatHistory.messages && Array.isArray(chatHistory.messages)) {
 // Process the fetched messages
 const conversationMessages: Message[] = [];
 let messageId = 1;
 
 chatHistory.messages.forEach((message: { 
 message?: string; 
 message_type?: string;
 timestamp?: string;
 [key: string]: unknown 
 }) => {
 if (message.message && typeof message.message === 'string') {
 const messageText = message.message.toLowerCase();
 const isBotMessage = messageText.includes('welcome') || 
 messageText.includes('mobiagent') ||
 messageText.includes('bot') ||
 messageText.includes('assistant') ||
 message.message_type === 'bot' ||
 message.message_type === 'assistant';

 // Parse timestamp - handle ISO string format from Instagram API
 let parsedTimestamp: string | number | undefined = undefined;
 if (message.timestamp) {
   try {
     // Try parsing as ISO string first (Instagram format: "2025-12-08T15:17:34.343000")
     const date = new Date(message.timestamp);
     if (!isNaN(date.getTime())) {
       parsedTimestamp = message.timestamp; // Keep as ISO string for formatMessageTimestamp
     }
   } catch {
     console.warn('Failed to parse timestamp:', message.timestamp);
   }
 }

 conversationMessages.push({
 id: messageId++,
 type: isBotMessage ? 'assistant' : 'user',
 content: message.message,
 isTyping: false,
 timestamp: parsedTimestamp || Date.now(), // Use current time as fallback
 });
 }
 });
 
 if (conversationMessages.length > 0) {
 console.log('Successfully processed Instagram messages from API:', conversationMessages);
 setMessages(conversationMessages);
 return;
 }
 }
 } catch (apiError) {
 console.error('Failed to fetch Instagram chat history from API:', apiError);
 }
 
 throw new Error('Instagram chat history not found');
 }
 } catch (error) {
 console.error('Error fetching Instagram conversation:', error);
 setMessages([{
 id: 1,
 type: 'assistant',
 content: 'Sorry, I couldn\'t load the Instagram conversation history. Please try again later.',
 isTyping: false,
 timestamp: Date.now(),
 }]);
 }
 } else if (title) {
 // Handle chatbot session (original logic)
 try {
 const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/domain/domain_3/session/${title}`, {
 method: 'GET',
 headers: {
 'accept': 'application/json',
 },
 });

 

 if (!response.ok) {
 throw new Error(`HTTP error! status: ${response.status}`);
 }

 

 const data: ConversationResponse = await response.json();
 
 // Convert conversation history to messages
 const conversationMessages: Message[] = data.conversation.history.flatMap((item, index) => [
 {
 id: index * 2 + 1,
 type: 'user',
 content: item.query,
 isTyping: false,
 },
 {
 id: index * 2 + 2,
 type: 'assistant',
 content: item.response,
 isTyping: false,
 }
 ]);

 

 // Add initial greeting if there are no messages
 if (conversationMessages.length === 0) {
 conversationMessages.push({
 id: 1,
 type: 'assistant',
 content: 'Hello! I\'m AI Agent. How can I help you today?',
 isTyping: false,
 timestamp: Date.now(),
 });
 }

 

 setMessages(conversationMessages);
 } catch (error) {
 console.error('Error fetching conversation:', error);
 setMessages([{
 id: 1,
 type: 'assistant',
 content: 'Sorry, I couldn\'t load the conversation history. Please try again later.',
 isTyping: false,
 timestamp: Date.now(),
 }]);
 }
 }
 };

 

 fetchConversation();
 }, [title, whatsappSessionId, telegramSessionId, instagramSessionId, type]); // Depend on title, whatsappSessionId, telegramSessionId, instagramSessionId, and type

 

 // Initialize client-side state
 useEffect(() => {
 setIsClient(true);
 // Generate new session ID only if not exists
 if (!sessionId) {
 setSessionId(generateUniqueTimestamp());
 }
 }, [sessionId]); // Add sessionId as dependency

 

 // Load saved states from localStorage
 useEffect(() => {
 if (!isClient) return;

 

 const savedAvatar = localStorage.getItem('selectedChatbotAvatar');
 const savedNumResults = localStorage.getItem('numResults');
 const savedSimilarityThreshold = localStorage.getItem('similarityThreshold');

 

 if (savedAvatar) setSelectedAvatar(savedAvatar);
 if (savedNumResults) setNumResults(Number(savedNumResults));
 if (savedSimilarityThreshold) setSimilarityThreshold(Number(savedSimilarityThreshold));
 }, [isClient]); // Only depend on isClient

 

 // Save messages to sessionStorage
 useEffect(() => {
 if (typeof window !== 'undefined' && messages.length > 0) {
 sessionStorage.setItem('chatbot_messages', JSON.stringify(messages));
 }
 }, [messages]); // Only depend on messages

 

 // Scroll to bottom when messages change
 useEffect(() => {
 if (isChatVisible) {
 scrollToBottom();
 }
 }, [messages, isChatVisible, scrollToBottom]); // Add scrollToBottom as dependency

 

 // Avatar change event listener
 useEffect(() => {
 const handleAvatarChange = (event: CustomEvent<{ avatarPath: string }>) => {
 const newAvatar = event.detail?.avatarPath;
 if (newAvatar) {
 setSelectedAvatar(newAvatar);
 if (typeof window !== 'undefined') {
 localStorage.setItem('selectedChatbotAvatar', newAvatar);
 }
 }
 };

 

 window.addEventListener('avatarChanged', handleAvatarChange as EventListener);
 return () => {
 window.removeEventListener('avatarChanged', handleAvatarChange as EventListener);
 };
 }, []); // Empty dependency array as this should only run once

 

 // Bot name change event listener
 useEffect(() => {
 const handleBotNameChange = (event: CustomEvent<{ name: string }>) => {
 const newName = event.detail?.name;
 if (newName) {
 // setBotName(newName); // This line is removed as per the edit hint
 if (typeof window !== 'undefined') {
 // localStorage.setItem('chatbotName', newName); // This line is removed as per the edit hint
 }
 }
 };

 

 window.addEventListener('botNameChanged', handleBotNameChange as EventListener);
 return () => {
 window.removeEventListener('botNameChanged', handleBotNameChange as EventListener);
 };
 }, []); // Empty dependency array as this should only run once

 

 // Reset chat event listener
 useEffect(() => {
 const handleResetChat = (event: CustomEvent<{ reset: boolean }>) => {
 if (event.detail?.reset) {
 setSelectedAvatar('/images/user/Bot1.png');
 setMessages([
 {
 id: Date.now(),
 type: 'assistant',
 content: `Hello! I'm Mobi.AI. How can I help you today?`,
 isTyping: false,
 },
 ]);
 setInput('');
 if (typeof window !== 'undefined') {
 localStorage.setItem('selectedChatbotAvatar', '/images/user/Bot1.png');
 // localStorage.setItem('chatbotName', 'Mobi.AI'); // This line is removed as per the edit hint
 sessionStorage.removeItem('chatbot_messages');
 }
 }
 };

 

 window.addEventListener('resetChat', handleResetChat as EventListener);
 return () => {
 window.removeEventListener('resetChat', handleResetChat as EventListener);
 };
 }, []); // Empty dependency array as this should only run once

 

 // Listen for settings changes
 useEffect(() => {
 const handleSettingsChange = (event: CustomEvent<{ numResults: number; similarityThreshold: number }>) => {
 if (event.detail) {
 setNumResults(event.detail.numResults);
 setSimilarityThreshold(event.detail.similarityThreshold);
 }
 };

 

 window.addEventListener('llmSettingsChanged', handleSettingsChange as EventListener);
 return () => {
 window.removeEventListener('llmSettingsChanged', handleSettingsChange as EventListener);
 };
 }, []); // Empty dependency array as this should only run once

 

 //Unique Session Id Generation
 function generateUniqueTimestamp(): string {
 const now = new Date();
 
 const year = now.getFullYear().toString();
 const month = (now.getMonth() + 1).toString().padStart(2, '0'); // Months are zero-indexed
 const day = now.getDate().toString().padStart(2, '0');
 const hour = now.getHours().toString().padStart(2, '0');
 const minute = now.getMinutes().toString().padStart(2, '0');
 const second = now.getSeconds().toString().padStart(2, '0');
 const millis = now.getMilliseconds().toString().padStart(3, '0');
 
 return `${year}${month}${day}${hour}${minute}${second}${millis}`;
 }

 

 

 

 // API call function
 const callApi = async (query: string): Promise<string> => {
 try {
 const title = searchParams.get('title') || '';
 const requestBody: ApiRequest = {
 query: query,
 num_results: numResults,
 similarity_threshold: similarityThreshold,
 session_id: sessionId,
 use_session_history: true,
 session_history_title: title
 };
 const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/query/domain_3`, {
 method: 'POST',
 headers: {
 'accept': 'application/json',
 'Content-Type': 'application/json',
 },
 body: JSON.stringify(requestBody),
 });

 

 if (!response.ok) {
 throw new Error(`HTTP error! status: ${response.status}`);
 }

 

 const data: ApiResponse = await response.json();
 return data.answer;
 } catch (error) {
 console.error('API call failed:', error);
 return "I'm sorry, I'm having trouble connecting to the server right now. Please try again later.";
 }
 };

 

 const handleSubmit = async (e?: React.FormEvent) => {
 if (e) e.preventDefault();
 const userMessage = input.trim();
 if (!userMessage || isLoading) return;
 const userMessageLower = userMessage.toLowerCase();

 

 // Human request phrases
 const humanRequestPhrases = [
 'i want to speak to a human',
 'i want to speak to a live agent',
 'can you connect me to an agent'
 ];
 if (humanRequestPhrases.some(phrase => userMessageLower.includes(phrase))) {
 const userMsg: Message = { id: Date.now(), type: 'user', content: userMessage, isTyping: false, timestamp: Date.now() };
 setMessages(prev => [...prev, userMsg]);
 setInput("");
 setIsLoading(true);
 const botMessage: Message = {
 id: Date.now() + 1,
 type: 'assistant',
 content: "Transferring you to a customer support representative...",
 isTyping: true,
 timestamp: Date.now(),
 };
 setMessages(prev => [...prev, botMessage]);
 setTimeout(() => {
 setMessages(prev => prev.map(m => m.id === botMessage.id ? { ...m, isTyping: false, timestamp: m.timestamp || Date.now() } : m));
 }, 1000);
 setIsLoading(false);
 return;
 }

 

 // Brand mentions
 if (brandMentions.includes(userMessageLower)) {
 const userMsg: Message = { id: Date.now(), type: 'user', content: userMessage, isTyping: false, timestamp: Date.now() };
 setMessages(prev => [...prev, userMsg]);
 setInput("");
 setIsLoading(true);
 setTimeout(() => setIsLoading(false), 500);
 return;
 }

 

 // Greetings
 if (isGreeting(userMessage)) {
 const userMsg: Message = { id: Date.now(), type: 'user', content: userMessage, isTyping: false, timestamp: Date.now() };
 setMessages(prev => [...prev, userMsg]);
 setInput("");
 setIsLoading(true);
 setTimeout(() => setIsLoading(false), 500);
 // Continue to backend call if needed
 }

 

 // Lead form detection
 const leadFormScore = leadFormPowerWords.reduce((score, word) => {
 if (userMessageLower.includes(word)) {
 return score + 1;
 }
 return score;
 }, 0);
 if (leadFormScore >= 1) {
 const botMessage: Message = {
 id: Date.now() + 1,
 type: 'assistant',
 content: "It looks like you are repeating your request. Please fill out the contact form below so our team can assist you directly.",
 isTyping: true,
 timestamp: Date.now(),
 };
 setMessages(prev => [...prev, botMessage]);
 setInput("");
 setIsLoading(false);
 return;
 }

 

 // Employee/customer detection
 const detectedType = employeeKeywords.some(word => userMessageLower.includes(word)) ? 'employee' :
 customerKeywords.some(word => userMessageLower.includes(word)) ? 'customer' : null;
 if (detectedType) {
 const botMessage: Message = {
 id: Date.now() + 1,
 type: 'assistant',
 content: `Please login as a ${detectedType} to continue this conversation.`,
 isTyping: false,
 timestamp: Date.now(),
 };
 setMessages(prev => [...prev, botMessage]);
 setInput("");
 setIsLoading(false);
 return;
 }

 

 // Default: send to backend
 const userMsg: Message = { id: Date.now(), type: 'user', content: userMessage, isTyping: false, timestamp: Date.now() };
 setMessages((prev: Message[]) => [...prev, userMsg]);
 setInput('');
 setIsLoading(true);
 try {
 const apiResponse = await callApi(userMessage);
 const assistantMessageId = Date.now() + 1;
 const assistantMessage: Message = {
 id: assistantMessageId,
 type: 'assistant',
 content: '',
 isTyping: true,
 timestamp: Date.now(),
 };
 setMessages((prev: Message[]) => [...prev, assistantMessage]);
 setIsLoading(false);
 let currentIndex = 0;
 const typingInterval = setInterval(() => {
 if (currentIndex <= apiResponse.length) {
 setMessages((prev: Message[]) =>
 prev.map((msg: Message) =>
 msg.id === assistantMessageId
 ? {
 ...msg,
 content: apiResponse.slice(0, currentIndex),
 isTyping: currentIndex < apiResponse.length,
 timestamp: msg.timestamp || Date.now(), // Preserve timestamp or set if missing
 }
 : msg
 )
 );
 currentIndex++;
 } else {
 clearInterval(typingInterval);
 }
 }, 10);
 } catch (error) {
 console.error('Error in API response:', error);
 setIsLoading(false);
 const errorMessage: Message = {
 id: Date.now() + 1,
 type: 'assistant',
 content: "I'm sorry, something went wrong. Please try again.",
 isTyping: false,
 timestamp: Date.now(),
 };
 setMessages((prev: Message[]) => [...prev, errorMessage]);
 }
 };

 

 const handleSaveChat = async () => {
 if (saveName.trim()) {
 try {
 const userEmail = localStorage.getItem('userEmail') || '';
 const domain = getDomain(userEmail);
 const baseUrl = getBaseUrl();

 

 const response = await fetch(`${baseUrl}/domain/${domain}/save-session`, {
 method: 'POST',
 headers: {
 'accept': 'application/json',
 'Content-Type': 'application/json',
 },
 body: JSON.stringify({
 session_id: sessionId,
 title: saveName.trim()
 }),
 });

 

 const data = await response.json();

 

 if (!response.ok) {
 setSaveAlert({
 type: 'error',
 message: data.detail || 'Failed to save chat. Please try again.'
 });
 return;
 }

 

 // Close popup first
 setIsSavePopupOpen(false);
 setSaveName('');
 
 // Show success alert outside
 setSaveAlert({
 type: 'success',
 message: data.message || `Session saved successfully as '${data.title}' in domain ${data.domain}`
 });

 

 // Clear chat after successful save
 setMessages([{
 id: Date.now(),
 type: 'assistant',
 content: 'Hello! I\'m Mobi.AI. How can I help you today?',
 isTyping: false,
 timestamp: Date.now(),
 }]);
 setSessionId(generateUniqueTimestamp()); // Generate new session ID for next chat
 sessionStorage.removeItem('chatbot_messages');

 

 // Clear success alert after 3 seconds
 setTimeout(() => {
 setSaveAlert(null);
 }, 3000);
 } catch (error) {
 console.error('Error saving chat:', error);
 setSaveAlert({
 type: 'error',
 message: 'Failed to save chat. Please try again.'
 });
 }
 }
 };

 

 const handleCancelSave = () => {
 setIsSavePopupOpen(false);
 setSaveName('');
 setSaveAlert(null);
 };

 

 return (
 <>
 {/* Custom styles for message bubble text wrapping */}
 <style dangerouslySetInnerHTML={{ __html: messageBubbleStyles }} />
 
 <PageHeader
 title="All Chat Sessions"
 description="Continue your conversation from where you left off"
 icon={<MessageCircle className="w-6 h-6 text-white" />}
 iconBgColor="bg-green-600"
 breadcrumbs={[
 { label: "Home", href: "/" },
 { label: "Inbox", href: "/inbox" },
 { label: title || (type === 'telegram' ? 'Telegram Chat' : type === 'whatsapp' ? (profileName || 'WhatsApp Chat') : type === 'instagram' ? 'Instagram Chat' : "All Chat Sessions") }
 ]}
 tips={[
 "Your conversation history is automatically loaded from the previous session",
 "You can continue the conversation by typing in the input field below",
 "All your previous messages and responses are preserved",
 "Use the save button to save important conversations for future reference",
 "The AI remembers the context from your previous messages in this session"
 ]}
 />
 {/* Success Alert - Outside Popup */}
 {saveAlert?.type === 'success' && (
 <div className="fixed top-4 right-4 z-50 p-4 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-lg shadow-lg">
 {saveAlert.message}
 </div>
 )}

 

 {/* Floating Chat Toggle Button */}
 <button
 onClick={() => setIsChatVisible(!isChatVisible)}
 className="fixed bottom-12 right-6 z-50 w-14 h-14 hover:scale-105 rounded-full flex items-center justify-center shadow-lg transition-colors duration-1000"
 title={isChatVisible ? "Hide Chat" : "Show Chat"}
 >
 <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center">
 {isClient && (
 <Image
 src={selectedAvatar}
 alt="AI Avatar"
 width={20}
 height={20}
 style={{ width: '100%', height: '100%', objectFit: 'cover' }}
 />
 )}
 </div>
 </button>

 

 {/* Chat Container - Conditionally Rendered */}
 {isChatVisible && (
 <div className="rounded-2xl border w-full min-h-screen border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12 flex justify-center items-center">
 <div className="rounded-2xl border w-full border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12 flex justify-center items-center">
 <div className="mx-auto w-full max-w-4xl flex flex-col h-full py-10">
 <div className="text-center mb-8">
 <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
 {title || (type === 'telegram' ? 'Telegram Chat' : type === 'whatsapp' ? (profileName || 'WhatsApp Chat') : type === 'instagram' ? 'Instagram Chat' : 'Chat')}
 </h1>
 <p className="text-gray-600 dark:text-gray-400">
 Ask me anything and I&apos;ll do my best to help!
 </p>
 </div>

 

 {/* Chat Container */}
 <div className="flex-1 flex flex-col min-h-0">
 {/* Messages */}
 <div className="flex-1 overflow-y-auto mb-6 space-y-6 max-h-96 lg:max-h-none">
 {messages.map((message) => (
 <div
 key={message.id}
 className={`flex gap-4 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
 >
 {message.type === 'assistant' && isClient && (
 <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
 <Image
 src={selectedAvatar}
 alt="AI Avatar"
 width={20}
 height={20}
 style={{ width: '100%', height: '100%', objectFit: 'cover' }}
 />
 </div>
 )}

 

 <div
 className={`max-w-xs sm:max-w-md lg:max-w-lg xl:max-w-xl rounded-2xl px-4 py-3 break-words overflow-wrap-anywhere ${
 message.type === 'user'
 ? 'bg-blue-600 text-white ml-auto'
 : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
 }`}
 >
 {message.content && <MessageContent content={message.content} isTyping={message.isTyping} />}
 {message.buttons && message.buttons.length > 0 && (
 <div className={`space-y-2 ${message.content ? 'mt-3' : ''}`}>
 {message.buttons.map((button, btnIndex) => (
 <button
 key={btnIndex}
 className="w-full px-4 py-2 text-left bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-sm"
 onClick={() => {
 // Handle button click - you can add functionality here
 console.log('Button clicked:', button.id, button.title);
 }}
 >
 {button.title}
 </button>
 ))}
 </div>
 )}
 {((message.messageType === 'list') || (message.sections && Array.isArray(message.sections) && message.sections.length > 0)) && (
 <div className={`space-y-3 ${message.content ? 'mt-3' : ''}`}>
 {message.header && (
 <h3 className="font-semibold text-gray-900 dark:text-white text-base mb-3">{message.header}</h3>
 )}
 {message.sections && Array.isArray(message.sections) && message.sections.length > 0 && message.sections.map((section, sectionIndex) => (
 <div key={sectionIndex} className="space-y-2">
 {section.title && (
 <h4 className="font-medium text-gray-800 dark:text-gray-200 text-xs uppercase tracking-wide mb-2 px-1">{section.title}</h4>
 )}
 {section.rows && Array.isArray(section.rows) && section.rows.length > 0 && section.rows.map((row, rowIndex) => (
 <button
 key={rowIndex}
 className="w-full px-4 py-3 text-left bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors shadow-sm"
 onClick={() => {
 console.log('List item clicked:', row.id, row.title);
 }}
 >
 <div className="font-medium text-sm">{row.title}</div>
 {row.description && (
 <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{row.description}</div>
 )}
 </button>
 ))}
 </div>
 ))}
 </div>
 )}
 {message.form && (
 <div className={`mt-3 space-y-3 ${message.content ? 'mt-3' : ''}`}>
 {message.form.title && (
 <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{message.form.title}</h3>
 )}
 {message.form.fields && message.form.fields.map((field, fieldIndex) => (
 <div key={fieldIndex} className="space-y-1">
 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
 {field.label}
 {field.required && <span className="text-red-500 ml-1">*</span>}
 </label>
 <input
 type={field.type || 'text'}
 placeholder={field.placeholder || ''}
 className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
 required={field.required}
 />
 </div>
 ))}
 </div>
 )}
 {message.completedForm && (
 <div className={`mt-3 space-y-3 ${message.content ? 'mt-3' : ''}`}>
 <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
 <div className="flex items-center gap-2 mb-3">
 <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
 </svg>
 <h3 className="font-semibold text-green-800 dark:text-green-300 text-sm">
 {message.completedForm.form_type ? message.completedForm.form_type.charAt(0).toUpperCase() + message.completedForm.form_type.slice(1).replace('_', ' ') : 'Form'} Submission
 </h3>
 </div>
 {message.completedForm.result_id && (
 <div className="mb-3">
 <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Reference ID: </span>
 <span className="text-xs font-mono text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{message.completedForm.result_id}</span>
 </div>
 )}
 {message.completedForm.completed_at && (
 <div className="mb-3 text-xs text-gray-600 dark:text-gray-400">
 <span className="font-medium">Completed: </span>
 {new Date(message.completedForm.completed_at * 1000).toLocaleString()}
 </div>
 )}
 {message.completedForm.data && (
 <div className="space-y-2">
 <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Submitted Data:</h4>
 <div className="bg-white dark:bg-gray-800 rounded-lg p-3 space-y-2">
 {Object.entries(message.completedForm.data).map(([key, value]) => {
 if (key === 'resume' && typeof value === 'object' && value !== null) {
 const resume = value as { filename?: string; mime_type?: string; id?: string };
 return (
 <div key={key} className="flex items-center justify-between py-1 border-b border-gray-200 dark:border-gray-700 last:border-0">
 <span className="text-xs font-medium text-gray-600 dark:text-gray-400 capitalize">{key.replace('_', ' ')}:</span>
 <div className="flex items-center gap-2">
 <span className="text-xs text-gray-900 dark:text-white">{resume.filename || 'File'}</span>
 {resume.mime_type && (
 <span className="text-xs text-gray-500 dark:text-gray-400">({resume.mime_type})</span>
 )}
 </div>
 </div>
 );
 }
 return (
 <div key={key} className="flex items-center justify-between py-1 border-b border-gray-200 dark:border-gray-700 last:border-0">
 <span className="text-xs font-medium text-gray-600 dark:text-gray-400 capitalize">{key.replace('_', ' ')}:</span>
 <span className="text-xs text-gray-900 dark:text-white">{String(value)}</span>
 </div>
 );
 })}
 </div>
 </div>
 )}
 
 {/* Timestamp display at bottom of message - always show */}
 <div className={`mt-2 pt-1 text-xs ${
 message.type === 'user' 
 ? 'text-blue-50 dark:text-blue-100' 
 : 'text-gray-500 dark:text-gray-400'
 }`} style={{ opacity: 0.8 }}>
 {formatMessageTimestamp(message.timestamp)}
 </div>
 </div>
 </div>
 )}
 </div>

 

 {message.type === 'user' && (
 <div className="flex-shrink-0 w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
 <User className="w-5 h-5 text-white" />
 </div>
 )}
 </div>
 ))}

 

 {/* Loading indicator */}
 {isLoading && isClient && (
 <div className="flex gap-4 justify-start">
 <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
 <Image
 src={selectedAvatar}
 alt="AI Avatar"
 width={20}
 height={20}
 style={{ width: '100%', height: '100%', objectFit: 'cover' }}
 />
 </div>
 <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-3">
 <div className="flex space-x-1">
 <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
 <div
 className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
 style={{ animationDelay: '0.1s' }}
 ></div>
 <div
 className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
 style={{ animationDelay: '0.2s' }}
 ></div>
 </div>
 </div>
 </div>
 )}
 <div ref={messagesEndRef} />
 </div>

 

 {/* Input Area */}
 <div className="relative">
 <div className="flex items-center gap-2 p-2 border border-gray-300 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-800 shadow-sm">
 <input
 type="text"
 value={input}
 onChange={(e) => setInput(e.target.value)}
 onKeyPress={(e) => {
 if (e.key === 'Enter' && !e.shiftKey) {
 e.preventDefault();
 handleSubmit();
 }
 }}
 placeholder="Type your message here..."
 className="flex-1 px-4 py-3 bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm sm:text-base"
 disabled={isLoading}
 />

 

 {/* Send Button */}
 <button
 onClick={() => handleSubmit()}
 disabled={!input.trim() || isLoading}
 className="flex-shrink-0 w-10 h-10 [background-color:#465FFF] disabled:bg-gray-400 disabled:cursor-not-allowed rounded-xl flex items-center justify-center transition-colors duration-200"
 >
 <Send className="w-5 h-5 text-white" />
 </button>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 )}

 

 {/* Save Chat Popup */}
 {isSavePopupOpen && (
 <div className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-50 border-2 border-white">
 <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md">
 <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
 Save Chat
 </h2>
 {saveAlert?.type === 'error' && (
 <div className="mb-4 p-3 rounded-lg bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
 {saveAlert.message}
 </div>
 )}
 <input
 type="text"
 value={saveName}
 onChange={(e) => {
 setSaveName(e.target.value);
 setSaveAlert(null); // Clear alert when user types
 }}
 placeholder="Enter chat name..."
 className="w-full px-4 py-3 mb-4 bg-transparent border border-gray-300 dark:border-gray-600 rounded-xl outline-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm sm:text-base"
 />
 <div className="flex justify-end gap-2">
 <button
 onClick={handleCancelSave}
 className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
 >
 Cancel
 </button>
 <button
 onClick={handleSaveChat}
 disabled={!saveName.trim()}
 className="px-4 py-2 [background-color:#465FFF] text-white rounded-xl hover:[background-color:#3b4ccc] disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
 >
 Save
 </button>
 </div>
 </div>
 </div>
 )}
 </>
 );
}

 

export default function PreviousChat() {
 return (
 <Suspense fallback={<div>Loading...</div>}>
 <ChatComponent />
 </Suspense>
 );
}
