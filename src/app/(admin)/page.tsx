'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Send, User, LogIn } from 'lucide-react';
import Image from 'next/image';
import { getDomain } from '@/utils/domainConfig';
import Select from 'react-select';
import { Props as SelectProps } from 'react-select';
import { getConversation, listSessions } from '@/utils/api';
import AlertModal from '@/components/ui/modal/AlertModal';

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
  
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .animate-fade-in {
    animation: fadeIn 0.8s ease-out;
  }
  
  .animate-slide-up {
    animation: slideUp 0.8s ease-out;
    animation-fill-mode: both;
  }
  
  /* Hide scrollbar for Chrome, Safari and Opera */
  .hide-scrollbar::-webkit-scrollbar {
    display: none;
  }
  
  /* Hide scrollbar for IE, Edge and Firefox */
  .hide-scrollbar {
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;  /* Firefox */
  }
  
  /* Hide scrollbar for the entire page */
  body {
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;  /* Firefox */
  }
  
  body::-webkit-scrollbar {
    display: none;  /* Chrome, Safari and Opera */
  }
  
  /* Hide scrollbar for html element */
  html {
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;  /* Firefox */
  }
  
  html::-webkit-scrollbar {
    display: none;  /* Chrome, Safari and Opera */
  }
  
  /* Hide scrollbar for all elements */
  * {
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;  /* Firefox */
  }
  
  *::-webkit-scrollbar {
    display: none;  /* Chrome, Safari and Opera */
  }
`;


// Define custom event interface-----
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
// update
// Message interface
interface Message {
  id: number;
  type: 'user' | 'assistant' | 'support-form' | 'job-application-form' | 'lead-form' | 'employee-form' | 'customer-form';
  content: string;
  isTyping: boolean;
}

// Add a type for the user object
interface UserInfo {
  email: string;
  user_type: string;
  username: string;
  full_name?: string;
}


// Message content component
const MessageContent = ({ content, isTyping }: { content: string; isTyping: boolean }) => {
  // Convert markdown to plain text by removing markdown syntax
  const convertMarkdownToPlainText = (text: string) => {
    // Remove markdown headers
    let plainText = text.replace(/^#{1,6}\s+/gm, '');
    
    // Remove bold/italic formatting
    plainText = plainText.replace(/\*\*(.*?)\*\*/g, '$1');
    plainText = plainText.replace(/__(.*?)__/g, '$1');
    plainText = plainText.replace(/\*(.*?)\*/g, '$1');
    plainText = plainText.replace(/_(.*?)_/g, '$1');
    
    // Remove code blocks and inline code
    plainText = plainText.replace(/```[\s\S]*?```/g, '');
    plainText = plainText.replace(/`([^`]+)`/g, '$1');
    
    // Remove list markers
    plainText = plainText.replace(/^[\-\*]\s+/gm, '• ');
    plainText = plainText.replace(/^\d+\.\s+/gm, '');
    
    // Remove links but keep the text
    plainText = plainText.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    
    // Clean up extra whitespace
    plainText = plainText.replace(/\n\s*\n/g, '\n\n');
    plainText = plainText.trim();
    
    return plainText;
  };

  const plainTextContent = convertMarkdownToPlainText(content);

  return (
    <div className="text-xs sm:text-sm md:text-base leading-relaxed break-words overflow-wrap-anywhere message-bubble-text">
      <div style={{ whiteSpace: 'pre-wrap' }}>
        {plainTextContent}
      </div>
      {isTyping && (
        <span className="inline-block w-2 h-4 bg-current ml-1 animate-pulse">|</span>
      )}
    </div>
  );
};

// Backend API URL for user type analysis
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL;

// Define power words for lead form
const leadFormPowerWords = [
  "speak to sales", "speak to someone", "I want to speak", "arrange a callback", "I want a callback", "meeting", "business development", "get in touch", "request info", "request information", "interested", "want to know more", "demo", "enquire", "enquiry", "quote", "pricing", "price", "hire", "consult", "consultation", "partner", "collaborate", "work with", "business", "proposal", "estimate", "talk to sales", "sales", "assistance","contact",
  "support", "project", "website", "app", "mobile", "web", "design", "marketing", "digital",  "solution", "outsource", "freelance", "agency", "company", "team", "expert", "professional", "consultant", "developer", "designer", "marketer",
  "cost", "budget", "investment", "package", "plan", "strategy", "implementation", "deployment", "launch", "maintenance", "upgrade", "improve", "optimize", "enhance", "modernize", "transform", "innovate", "automate", "integrate", "customize", "tailor", "bespoke", "enterprise", "startup", "human","small business","contacts","business development","business growth","business opportunity","business plan","business strategy","business consulting","business advice","business help","business support","business assistance","business development","business growth","business opportunity","business plan","business strategy","business consulting","business advice","business help","business support","business assistance"
];

// (Removed unused greetingKeywords and greetingResponses arrays; using isGreetingMessage function instead)

const abusiveWords = [
  'abuse', 'asshole', 'bitch', 'bullshit', 'crap', 'damn', 'fuck', 'hell', 'piss', 'shit', 'slut', 'whore',
  'bastard', 'dick', 'douche', 'fag', 'faggot', 'motherfucker', 'prick', 'cunt', 'cock', 'jerk', 'moron',
  'retard', 'suck', 'twat', 'wanker', 'arsehole', 'bugger', 'bollocks', 'git', 'tosser', 'douchebag',
  'jackass', 'scumbag', 'shithead', 'dumbass', 'dipshit', 'pussy', 'dickhead', 'nigger', 'spic', 'chink',
  'gook', 'kike', 'tranny', 'coon', 'dyke', 'homo', 'queer', 'skank', 'spastic', 'mong', 'gimp', 'nutjob',
  'loser', 'idiot', 'imbecile', 'fool', 'screw you', 'go to hell', 'eat shit', 'son of a bitch', 'piece of shit',
  'dumb', 'stupid', 'ugly', 'fatass', 'fat ass', 'retarded', 'bimbo', 'airhead', 'douche canoe', 'shitface',
  'fuckface', 'shitbag', 'asswipe', 'asshat', 'bastards', 'bitches', 'cocksucker', 'motherfuckers', 'shitheads',
  'dickheads', 'douchebags', 'jackasses', 'scumbags', 'sluts', 'whores', 'twats', 'wankers', 'arseholes',
  'faggots', 'pricks', 'cunts', 'pussies', 'retards', 'morons', 'idiots', 'imbeciles', 'fools', 'losers',
  'nutjobs', 'mongoloid', 'mongrel', 'halfwit', 'simpleton', 'cretin', 'clown', 'buffoon', 'blockhead',
  'dunce', 'dullard', 'bonehead', 'meathead', 'lamebrain', 'nincompoop', 'ninny', 'twit', 'twitface',
  'twithead', 'twitbag', 'twitbrain', 'twitass', 'twitdick', 'twitshit', 'twitfuck', 'twitcunt', 'twitprick',
  'twitwanker', 'twitbastard', 'twitwhore', 'twitslut', 'twitfag', 'twitretard', 'twitmoron', 'twitidiot',
  'twitimbecile', 'twitfool', 'twitloser', 'twitnutjob', 'twitmong', 'twitgimp', 'twitspastic', 'twitmongoloid',
  'twitmongrel', 'twithalfwit', 'twitsimpleton', 'twitcretin', 'twitclown', 'twitbuffoon', 'twitblockhead',
  'twitdunce', 'twitdullard', 'twitbonehead', 'twitmeathead', 'twitlamebrain', 'twitnincompoop', 'twitninny',
];

// --- Section 2: Input Validation for Nonsense, Gibberish, Illogical Inputs ---
// Response arrays for each nonsense type
const gibberishResponses = [
  "Hmm... I didn't understand that. Can you rephrase or ask a real question?",
  "That doesn't look like a real question. Try again!",
  "I'm not sure what you mean. Could you clarify?",
  "Sorry, I couldn't make sense of that. Please try rephrasing."
];
const keyboardResponses = [
  "Looks like random text. Try asking something specific — I'm ready to help!",
  "That seems like keyboard mashing. Can you type a real question?",
  "I see some random letters. Please ask something meaningful!",
  "Try typing a proper question so I can assist you."
];
const symbolsResponses = [
  "It seems like your message was garbled. Want to try again with a question?",
  "I saw a lot of symbols there. Please type your question in words.",
  "That looks like random symbols. Can you rephrase your question?",
  "Symbols detected! Please use words so I can help."
];
const emptyResponses = [
  "I didn't catch anything there. Can you please type your question again?",
  "It looks like you didn't type anything. Please enter your question.",
  "No message received. Could you try again?",
  "I need a question to help you. Please type something."
];

// List of company/brand keywords for general knowledge detection
const brandKeywords = [
  'Mobiloitte',
  // Add more company/brand names here as needed
];

// Country code options for react-select
const countryCodeOptions = [
  { value: '+1', label: '+1 (US)' },
  { value: '+44', label: '+44 (UK)' },
  { value: '+91', label: '+91 (IN)' },
  { value: '+61', label: '+61 (AU)' },
  { value: '+81', label: '+81 (JP)' },
  { value: '+49', label: '+49 (DE)' },
  { value: '+33', label: '+33 (FR)' },
  { value: '+971', label: '+971 (UAE)' },
  { value: '+86', label: '+86 (CN)' },
  { value: '+7', label: '+7 (RU)' },
  { value: '+39', label: '+39 (IT)' },
  { value: '+34', label: '+34 (ES)' },
  { value: '+55', label: '+55 (BR)' },
  { value: '+27', label: '+27 (ZA)' },
  { value: '+82', label: '+82 (KR)' },
  { value: '+62', label: '+62 (ID)' },
  { value: '+63', label: '+63 (PH)' },
  { value: '+234', label: '+234 (NG)' },
  { value: '+880', label: '+880 (BD)' },
  { value: '+20', label: '+20 (EG)' },
  { value: '+966', label: '+966 (SA)' },
  { value: '+92', label: '+92 (PK)' },
  { value: '+60', label: '+60 (MY)' },
  { value: '+65', label: '+65 (SG)' },
  { value: '+64', label: '+64 (NZ)' },
  { value: '+48', label: '+48 (PL)' },
  { value: '+351', label: '+351 (PT)' },
  { value: '+46', label: '+46 (SE)' },
  { value: '+41', label: '+41 (CH)' },
  { value: '+31', label: '+31 (NL)' },
  { value: '+32', label: '+32 (BE)' },
  { value: '+90', label: '+90 (TR)' },
  { value: '+380', label: '+380 (UA)' },
  { value: '+420', label: '+420 (CZ)' },
  { value: '+43', label: '+43 (AT)' },
  { value: '+47', label: '+47 (NO)' },
  { value: '+45', label: '+45 (DK)' },
  { value: '+358', label: '+358 (FI)' },
  { value: '+36', label: '+36 (HU)' },
  { value: '+421', label: '+421 (SK)' },
  { value: '+386', label: '+386 (SI)' },
  { value: '+385', label: '+385 (HR)' },
  { value: '+40', label: '+40 (RO)' },
  { value: '+375', label: '+375 (BY)' },
  { value: '+994', label: '+994 (AZ)' },
  { value: '+995', label: '+995 (GE)' },
  { value: '+373', label: '+373 (MD)' },
  { value: '+998', label: '+998 (UZ)' },
  { value: '+996', label: '+996 (KG)' },
  { value: '+993', label: '+993 (TM)' },
  { value: '+992', label: '+992 (TJ)' },
  { value: '+976', label: '+976 (MN)' },
  { value: '+84', label: '+84 (VN)' },
  { value: '+66', label: '+66 (TH)' },
  { value: '+852', label: '+852 (HK)' },
  { value: '+853', label: '+853 (MO)' },
  { value: '+886', label: '+886 (TW)' },
];

// --- Spam/Nonsense Detection Functions ---
const isKeyboardSpam = (input: string) => {
  const patterns = ['asdf', 'qwer', 'zxcv', 'qaz', 'wsx', '1234', '0000', '1111', 'abcd'];
  return patterns.some(p => input.includes(p));
};
const isCapSpam = (input: string) => {
  return input.length > 6 && input === input.toUpperCase();
};
const isRandomSymbols = (input: string) => {
  return /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(input) && input.replace(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/g, '').length < input.length / 2;
};
const isNumberSpam = (input: string) => {
  return /\d{6,}/.test(input);
};
const isGibberish = (input: string) => {
  return !/[aeiou]/i.test(input) && /[a-zA-Z]{5,}/.test(input);
};
const isSingleCharacterSpam = (input: string) => {
  return /^([a-zA-Z0-9])\1{4,}$/.test(input);
};

// Unicode-aware helpers (match widget behavior)
const containsUnicodeLetters = (value: string) => /\p{L}/u.test(value);
const isOnlyNumbersAndSymbols = (value: string) => /^[\d\p{P}\p{S}\p{M}]*$/u.test(value);

// Keyword detection functions (matching widget exactly)
const containsBusinessKeywords = (message: string) => {
  const businessKeywords = [
    'speak to sales', 'speak to someone', 'speak', 'arrange a callback', 'callback',
    'meeting', 'business development', 'get in touch', 'request info', 'request information',
    'interested', 'want to know more', 'demo', 'enquire', 'enquiry', 'quote', 'pricing', 'price',
    'consult', 'consultation', 'partner', 'collaborate', 'work with', 'business', 'proposal',
    'estimate', 'talk to sales', 'sales', 'assistance', 'support', 'project', 'website',
    'mobile', 'web', 'design', 'marketing', 'digital', 'solution', 'outsource', 'freelance', 'agency',
    'company', 'team', 'expert', 'professional', 'consultant', 'developer', 'designer', 'marketer',
    'cost', 'budget', 'investment', 'package', 'plan', 'strategy', 'implementation', 'deployment',
    'launch', 'maintenance', 'upgrade', 'improve', 'optimize', 'enhance', 'modernize', 'transform',
    'innovate', 'automate', 'integrate', 'customize', 'tailor', 'bespoke', 'enterprise', 'startup',
    'human', 'small business', 'contact form', 'contact', 'contact us', 'call', 'call me back', 'need support', 'need help'
  ];
  return matchesKeywords(message, businessKeywords);
};

// Helper function to escape regex special characters (matching widget)
const escapeRegex = (text: string) => {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Helper function to match keywords with word boundaries (matching widget)
const matchesKeywords = (message: string, keywords: string[]) => {
  const msg = String(message || '');
  for (const kw of keywords) {
    const pattern = new RegExp(`(^|\\b)${escapeRegex(kw)}(\\b|$)`, 'i');
    if (pattern.test(msg)) return true;
  }
  return false;
};

const containsEmployeeLoginKeywords = (message: string) => {
  const employeeKeywords = [
    'employee login', 'employee form', 'employee sign in', 'staff login', 'staff sign in', 'employee portal',
    'employee access', 'employee account', 'employee credentials', 'work login', 'work sign in',
    'employee dashboard', 'employee area', 'employee authentication', 'employee profile',
    'employee signin', 'employee log in', 'employee sign-in', 'staff portal', 'staff access',
    'work portal', 'work access', 'work account', 'work credentials', 'work dashboard',
    'work area', 'work authentication', 'work profile', 'hr'
  ];
  return matchesKeywords(message, employeeKeywords);
};

const containsCustomerLoginKeywords = (message: string) => {
  const customerKeywords = [
    'customer login', 'cuseomter form', 'customer sign in', 'client login', 'client sign in', 'customer portal',
    'customer access', 'customer account', 'customer credentials', 'user login', 'user sign in',
    'customer dashboard', 'customer area', 'customer authentication', 'customer profile',
    'customer signin', 'customer log in', 'customer sign-in', 'client portal', 'client access',
    'user portal', 'user access', 'user account', 'user credentials', 'user dashboard',
    'user area', 'user authentication', 'user profile', 'order status', 'order tracking',
    'order history', 'order details', 'order invoice', 'order receipt', 'order confirmation'
  ];
  return matchesKeywords(message, customerKeywords);
};

const containsJobApplicationKeywords = (message: string) => {
  const jobKeywords = [
    'job application', 'job', 'job apply', 'submit resume', 'submit cv',
    'career', 'careers', 'vacancy', 'vacancies', 'open position', 'open positions', 'job opening',
    'job openings', 'work with you', 'join your team', 'join team', 'hiring', 'recruitment',
    'recruit', 'employment', 'job opportunity', 'job opportunities', 'job posting', 'job post',
    'job listing', 'job listings', 'job board', 'job portal', 'upload resume', 'upload cv',
    'send resume', 'send cv', 'apply now', 'apply here', 'apply online', 'career opportunity',
    'career opportunities', 'internship', 'intern', 'full time job', 'part time job', 'job seeker',
    'jobseeker', 'work opportunity', 'work opportunities', 'work opening', 'work openings',
    'work posting', 'work post', 'work listing', 'work listings', 'work board', 'work portal',
    'submit application', 'submit job application', 'job form', 'employment form', 'job enquiry',
    'job inquiry', 'job interest', 'job intent', 'job intent form', 'job apply form', 'job candidate',
    'candidate application', 'candidate form', 'candidate apply', 'candidate submission', 'resume submission',
    'cv submission', 'upload your resume', 'upload your cv', 'send your resume', 'send your cv',
    'position', 'role', 'opening', 'vacancy', 'internship', 'join'
  ];
  return matchesKeywords(message, jobKeywords);
};

const containsEmployeeTicketKeywords = (message: string) => {
  const employeeTicketKeywords = [
    'employee ticket', 'employee support', 'employee help', 'employee issue', 'employee problem',
    'it support', 'it ticket', 'raise it ticket', 'raise ticket', 'raise support ticket',
    'employee request', 'employee complaint', 'employee query', 'employee service',
    'internal support', 'internal ticket', 'workplace issue', 'workplace support',
    'workplace ticket', 'workplace help', 'workplace problem', 'workplace request',
    'workplace complaint', 'workplace query', 'workplace service', 'staff ticket',
    'staff support', 'staff help', 'staff issue', 'staff problem', 'staff request',
    'staff complaint', 'staff query', 'staff service', 'open employee ticket', 'support', 'need help', 'need s',
    'open staff ticket', 'open it ticket', 'open support ticket', 'open internal ticket', 'ticket', 'help', 'help desk', 'helpdesk'
  ];
  return matchesKeywords(message, employeeTicketKeywords);
};

const containsCustomerTicketKeywords = (message: string) => {
  const customerTicketKeywords = [
    'customer ticket', 'customer support', 'customer help', 'customer issue', 'customer problem',
    'support ticket', 'raise ticket', 'raise support ticket', 'customer request',
    'customer complaint', 'customer query', 'customer service', 'external support',
    'external ticket', 'client ticket', 'client support', 'client help', 'client issue',
    'client problem', 'client request', 'client complaint', 'client query', 'client service',
    'open customer ticket', 'open client ticket', 'open support ticket', 'open external ticket', 'support', 'need help', 'need support',
    'open service ticket', 'open complaint ticket', 'open query ticket', 'open request ticket', 'ticket', 'help', 'help desk', 'helpdesk'
  ];
  return matchesKeywords(message, customerTicketKeywords);
};

// Greeting detection (matching widget exactly)
const isGreetingMessage = (message: string) => {
  const msg = message.trim().toLowerCase();
  const greetingPhrases = [
    'good morning', 'good afternoon', 'good evening', 'good night', 'good day',
    'goodmorning', 'goodafternoon', 'goodevening', 'goodnight',
    'what\'s up', 'howdy', 'greetings', 'hello there', 'hi there', 'hey there'
  ];
  const greetingWords = [
    'hello', 'hi', 'hii', 'hey', 'yo', 'gm', 'gn', 'sup'
  ];
  
  for (const phrase of greetingPhrases) {
    if (msg === phrase) return true;
  }
  
  for (const word of greetingWords) {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    if (regex.test(msg)) return true;
  }
  return false;
};

// Inappropriate language detection (matching widget)
const containsInappropriateLanguage = (message: string) => {
  const inappropriateWords = [
    'fuck', 'shit', 'damn', 'bitch', 'asshole', 'bastard', 'cunt', 'piss', 'crap',
    'bloody', 'hell', 'darn', 'dang', 'freaking', 'fricking', 'stupid', 'idiot',
    'moron', 'retard', 'gay', 'fag', 'nigger', 'nigga', 'chink', 'spic', 'kike',
    'whore', 'slut', 'bitch', 'cow', 'pig', 'dog', 'animal', 'beast', 'monster'
  ];
  return inappropriateWords.some(word => message.toLowerCase().includes(word));
};

const getRandomGreetingResponse = () => {
  const responses = [
    "Hello! How can I assist you today?",
    "Hi there! What can I help you with?",
    "Good to see you! How may I be of service?",
    "Hello! I'm here to help. What do you need?",
    "Hi! Welcome! How can I assist you today?"
  ];
  return responses[Math.floor(Math.random() * responses.length)];
};

const getInappropriateLanguageResponse = () => {
  const responses = [
    "I understand you might be frustrated, but let's keep our conversation professional and respectful.",
    "I'm here to help, but I'd appreciate it if we could maintain a polite tone in our conversation.",
    "Let's focus on how I can assist you in a constructive way. What do you need help with?",
    "I'm happy to help, but please keep our conversation appropriate and professional."
  ];
  return responses[Math.floor(Math.random() * responses.length)];
};


interface OptionType { value: string; label: string }
const TypedSelect = Select as unknown as React.ComponentType<SelectProps<OptionType>>;

// Add this interface near your other interfaces
interface QueryRequestBody {
  query: string;
  num_results: number;
  similarity_threshold: number;
  session_id: string;
  use_session_history: boolean;
  session_history_title: string;
  user_type?: string;
}

// Define job application power keywords
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

// (Removed unused employee/customer/helpdesk keyword lists that are no longer referenced)

// Add these at the top of the file, outside the component:
interface SessionItem { created_at: string; title: string; }
interface HistoryItem { query: string; response: string; }

export default function Ecommerce() {
  // Initialize states with default values
  const [selectedAvatar, setSelectedAvatar] = useState<string>('/images/user/Bot1.png');
  const [botName, setBotName] = useState<string>('AI Agent');
  const [numResults, setNumResults] = useState<number>(15);
  const [similarityThreshold, setSimilarityThreshold] = useState<number>(0.5);
  const [isClient, setIsClient] = useState(false);
  
  // Initialize session ID from localStorage for persistence across tabs
  const [sessionId, setSessionId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('chatbot_session_id') || '';
    }
    return '';
  });
  
  // Initialize messages from localStorage for persistence across tabs
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window !== 'undefined') {
      const savedMessages = localStorage.getItem('chatbot_messages');
      if (savedMessages) {
        try {
          const parsed = JSON.parse(savedMessages);
          // Only return messages if there are user messages (not just welcome messages)
          if (Array.isArray(parsed) && parsed.some((msg: Message) => msg.type === 'user')) {
            return parsed;
          }
        } catch {
          // If parsing fails, return empty array to show welcome message
          return [];
        }
      }
    }
    // Return empty array to show welcome message initially
    return [];
  });

  // Track if user has started chatting (has sent at least one user message)
  const [hasUserStartedChatting, setHasUserStartedChatting] = useState<boolean>(() => {
    // Always start with false to show welcome message on page load
    // The welcome message will be hidden when user actually starts chatting
    return false;
  });
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSavePopupOpen, setIsSavePopupOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveAlert, setSaveAlert] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [loginType, setLoginType] = useState<'employee' | 'customer' | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginPromptMessage, setLoginPromptMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    countryCode: '+1',
    message: '',
    interest: '',
    source: ''
  });
  const [formStatus, setFormStatus] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  // Add greeting repetition tracking
  const [greetingCount, setGreetingCount] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      return parseInt(localStorage.getItem('adminGreetingCount') || '0');
    }
    return 0;
  });
  // Add state for field-level errors
  const [loginEmailError, setLoginEmailError] = useState('');
  const [loginPasswordError, setLoginPasswordError] = useState('');
  // Add state for field-level errors for support form
  const [formErrors, setFormErrors] = useState({
    name: '',
    email: '',
    phone: '',
    countryCode: '',
    message: '',
    interest: '',
    source: ''
  });

  // Function to check if all required fields are filled
  const isFormValid = () => {
    return (
      formData.name.trim() !== '' &&
      formData.email.trim() !== '' &&
      formData.phone.trim() !== '' &&
      formData.countryCode !== '' &&
      formData.interest !== '' &&
      formData.source !== '' &&
      formData.message.trim() !== '' &&
      formData.message.trim().length >= 2 &&
      formData.message.length <= 500
    );
  };

  // Function to check if all job form required fields are filled
  const isJobFormValid = () => {
    return (
      jobFormData.name.trim() !== '' &&
      jobFormData.email.trim() !== '' &&
      jobFormData.mobile.trim() !== '' &&
      jobFormData.jobCategory !== '' &&
      jobFormData.experience !== '' &&
      jobResumeFile !== null
    );
  };

  // Function to check if all employee ticket form required fields are filled
  const isEmployeeTicketFormValid = () => {
    return (
      employeeTicketData.name.trim() !== '' &&
      employeeTicketData.email.trim() !== '' &&
      employeeTicketData.issue_type.trim() !== '' &&
      employeeTicketData.issue.trim() !== '' &&
      employeeTicketData.device.trim() !== '' &&
      employeeTicketData.severity !== '' &&
      employeeTicketData.message.trim() !== '' &&
      employeeTicketData.message.trim().length >= 2 &&
      employeeTicketData.message.length <= 500
    );
  };

  // Function to check if all customer ticket form required fields are filled
  const isCustomerTicketFormValid = () => {
    return (
      customerTicketData.name.trim() !== '' &&
      customerTicketData.email.trim() !== '' &&
      customerTicketData.phone.trim() !== '' &&
      customerTicketData.issue_type.trim() !== '' &&
      customerTicketData.issue.trim() !== '' &&
      customerTicketData.device.trim() !== '' &&
      customerTicketData.message.trim() !== '' &&
      customerTicketData.message.trim().length >= 2 &&
      customerTicketData.message.length <= 500
    );
  };

  // Function to check if login form required fields are filled
  const isLoginFormValid = () => {
    return (
      loginEmail.trim() !== '' &&
      loginPassword.trim() !== '' &&
      loginType !== null
    );
  };

  // Add state for job application form
  const [jobFormData, setJobFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    jobCategory: '',
    experience: ''
  });
  const [jobCategoriesOptions, setJobCategoriesOptions] = useState<string[]>([]);
  const [experienceOptions, setExperienceOptions] = useState<string[]>([]);
  const [jobFormErrors, setJobFormErrors] = useState({
    name: '',
    email: '',
    mobile: '',
    jobCategory: '',
    experience: ''
  });
  const [jobResumeFile, setJobResumeFile] = useState<File | null>(null);
  const [jobFormStatus, setJobFormStatus] = useState<string | null>(null);
  const [jobSubmitting, setJobSubmitting] = useState(false);
  const [showJobThankYou, setShowJobThankYou] = useState(false);
  const [jobFormHeading, setJobFormHeading] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('jobFormHeading') || 'Job Application';
    }
    return 'Job Application';
  });
  
  // Add state for employee helpdesk ticket form
  const [employeeTicketData, setEmployeeTicketData] = useState({
    name: '',
    email: '',
    issue_type: '',
    issue: '',
    device: '',
    severity: '',
    message: ''
  });
  const [employeeTicketErrors, setEmployeeTicketErrors] = useState({
    name: '',
    email: '',
    issue_type: '',
    issue: '',
    device: '',
    severity: '',
    message: ''
  });
  const [employeeTicketStatus, setEmployeeTicketStatus] = useState<string | null>(null);
  const [employeeTicketSubmitting, setEmployeeTicketSubmitting] = useState(false);
  
  // Add state for customer helpdesk ticket form
  const [customerTicketData, setCustomerTicketData] = useState({
    name: '',
    email: '',
    phone: '',
    issue_type: '',
    issue: '',
    device: '',
    message: ''
  });
  const [customerTicketErrors, setCustomerTicketErrors] = useState({
    name: '',
    email: '',
    phone: '',
    issue_type: '',
    issue: '',
    device: '',
    message: ''
  });
  const [customerTicketStatus, setCustomerTicketStatus] = useState<string | null>(null);
  const [customerTicketSubmitting, setCustomerTicketSubmitting] = useState(false);
  
  // Add state for tracking repeated user messages
  const [repeatMessageCount, setRepeatMessageCount] = useState(1);
  const [lastUserMessage, setLastUserMessage] = useState('');
  // Add state to track the current chat domain
  const [chatDomain, setChatDomain] = useState<string>('domain_3');
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMsg, setAlertMsg] = useState("");

  // Dropdown options for Contact Us form
  const [interestOptions, setInterestOptions] = useState<string[]>([]);
  const [sourceOptions, setSourceOptions] = useState<string[]>([]);

  useEffect(() => {
    // Fetch interest and source options from backend
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/leads/options`)
      .then(res => res.json())
      .then((data: Array<{ optionid: number; list_label: string }>) => {
        const interests = Array.from(
          new Set(
            data
              .filter(item => item.optionid === 1)
              .map(item => item.list_label?.trim())
              .filter(Boolean)
          )
        ).sort((a, b) => a.localeCompare(b));
        const sources = Array.from(
          new Set(
            data
              .filter(item => item.optionid === 2)
              .map(item => item.list_label?.trim())
              .filter(Boolean)
          )
        ).sort((a, b) => a.localeCompare(b));
        setInterestOptions(interests);
        setSourceOptions(sources);
      })
      .catch(() => {
        // Leave lists empty on error; selects will still render with placeholder
      });
  }, []);

  // Load job categories and experiences from API for Job Application form
  useEffect(() => {
    const abort = new AbortController();
    const loadJobOptions = async () => {
      try {
        const [catRes, expRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/jobs/categories`, { signal: abort.signal }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/jobs/experiences`, { signal: abort.signal })
        ]);
        if (catRes.ok) {
          const cats = await catRes.json();
          setJobCategoriesOptions(Array.isArray(cats) ? cats.map((c: { name: string }) => c.name) : []);
        } else {
          setJobCategoriesOptions([]);
        }
        if (expRes.ok) {
          const exps = await expRes.json();
          setExperienceOptions(Array.isArray(exps) ? exps.map((e: { name: string }) => e.name) : []);
        } else {
          setExperienceOptions([]);
        }
      } catch {
        setJobCategoriesOptions([]);
        setExperienceOptions([]);
      }
    };
    loadJobOptions();
    return () => abort.abort();
  }, []);

  // Initialize client-side state
  useEffect(() => {
    setIsClient(true);
    // Generate new session ID only if not exists
    if (!sessionId) {
      const newSessionId = generateUniqueTimestamp();
      setSessionId(newSessionId);
      if (typeof window !== 'undefined') {
        localStorage.setItem('chatbot_session_id', newSessionId);
      }
    }
    // Don't restore messages here - let the dedicated restore useEffect handle it
    // This prevents race conditions with the welcome message
    // Do NOT load chat history from sessionStorage/localStorage after login
  }, [sessionId]); // Remove isAuthenticated from dependency

  // Reset chat state after login only
  useEffect(() => {
    if (isAuthenticated) {
      setMessages([]); // Clear messages to show welcome screen
      setHasUserStartedChatting(false); // Reset chat state
      // Optionally clear sessionStorage if you want a fresh chat after login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('chatbot_messages');
      }
    }
  }, [isAuthenticated]);

  // Debug log for welcome message state
  useEffect(() => {
    console.log('Debug - hasUserStartedChatting:', hasUserStartedChatting, 'messages.length:', messages.length);
  }, [hasUserStartedChatting, messages.length]);

  // Restore chat state from localStorage after component mounts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedMessages = localStorage.getItem('chatbot_messages');
      if (savedMessages) {
        try {
          const parsed = JSON.parse(savedMessages);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Only restore if there are actual user messages
            const hasUserMessages = parsed.some((msg: Message) => msg.type === 'user');
            if (hasUserMessages) {
              setMessages(parsed);
              setHasUserStartedChatting(true);
              console.log('Restored chat state from localStorage');
            }
          }
        } catch {
          console.log('Failed to parse saved messages');
        }
      }
    }
  }, []); // Run only once on mount

  // Force welcome message to show after logout/login
  useEffect(() => {
    if (isAuthenticated && messages.length === 0) {
      // If user is authenticated but no messages, ensure welcome message shows
      setHasUserStartedChatting(false);
      console.log('Forced welcome message to show after login');
    }
  }, [isAuthenticated, messages.length]);

  // Additional safety check - force welcome message on fresh login
  useEffect(() => {
    if (isAuthenticated && !hasUserStartedChatting && messages.length === 0) {
      // Double-check that welcome message should show
      console.log('Safety check - ensuring welcome message shows');
      setHasUserStartedChatting(false);
    }
  }, [isAuthenticated, hasUserStartedChatting, messages.length]);

  // Final safety check - ensure welcome message shows on page refresh
  useEffect(() => {
    // Run after a short delay to ensure all other effects have completed
    const timer = setTimeout(() => {
      if (messages.length === 0 && !hasUserStartedChatting) {
        console.log('Final safety check - forcing welcome message to show');
        setHasUserStartedChatting(false);
        setMessages([]);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [hasUserStartedChatting, messages.length]); // Include missing dependencies

  // Avatar change event listener
  useEffect(() => {
    const handleAvatarChange = () => {
      const newAvatar = localStorage.getItem('selectedChatbotAvatar');
      if (newAvatar) {
        setSelectedAvatar(newAvatar);
      }
    };

    window.addEventListener('avatarChanged', handleAvatarChange as EventListener);
    return () => {
      window.removeEventListener('avatarChanged', handleAvatarChange as EventListener);
    };
  }, []);

  // Bot name change event listener
  useEffect(() => {
    const handleBotNameChange = (event: CustomEvent<{ name: string }>) => {
      const newName = event.detail?.name;
      if (newName) {
        setBotName(newName);
        if (typeof window !== 'undefined') {
          localStorage.setItem('chatbotName', newName);
        }
      }
    };

    window.addEventListener('botNameChanged', handleBotNameChange as EventListener);
    return () => {
      window.removeEventListener('botNameChanged', handleBotNameChange as EventListener);
    };
  }, []);

  // Reset chat event listener
  useEffect(() => {
    const handleResetChat = (event: CustomEvent<{ reset: boolean }>) => {
      if (event.detail?.reset) {
        setSelectedAvatar('/images/user/Bot1.png');
        setBotName('Mobi.AI');
        setMessages([]); // Clear messages to show welcome screen
        setHasUserStartedChatting(false); // Reset chat state
        setInput('');
        // Reset greeting count
        setGreetingCount(0);
        // Generate new session ID
        const newSessionId = generateUniqueTimestamp();
        setSessionId(newSessionId);
        if (typeof window !== 'undefined') {
          localStorage.setItem('selectedChatbotAvatar', '/images/user/Bot1.png');
          localStorage.setItem('chatbotName', 'Mobi.AI');
          localStorage.removeItem('chatbot_messages');
          localStorage.removeItem('adminGreetingCount');
          localStorage.setItem('chatbot_session_id', newSessionId);
        }
      }
    };

    window.addEventListener('resetChat', handleResetChat as EventListener);
    return () => {
      window.removeEventListener('resetChat', handleResetChat as EventListener);
    };
  }, []);



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
  }, []);

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

  // Login handler using backend authentication
  useEffect(() => {
    const userType = localStorage.getItem('userType');
    const userEmail = localStorage.getItem('userEmail');
    if (userType === 'employee' || userType === 'customer') {
      setIsAuthenticated(true);
      setLoginType(userType);
      setLoginEmail(userEmail || '');
      // Reset chat state for returning users to show welcome message
      setMessages([]);
      setHasUserStartedChatting(false);
      setGreetingCount(0);
      setRepeatMessageCount(0);
      setInput('');
      
      // Clear any old messages from localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('chatbot_messages');
        localStorage.removeItem('adminGreetingCount');
      }
      
      // Force welcome message to show after a short delay
      setTimeout(() => {
        setHasUserStartedChatting(false);
        setMessages([]);
        console.log('Initial auth - delayed reset for welcome message');
      }, 100);
      
      console.log('Initial auth check - reset chat state for welcome message');
    }
  }, []);

  // On page load, fetch /me if a token exists
  useEffect(() => {
    const token = localStorage.getItem('jwtToken');
    if (token) {
      fetch(`${BACKEND_URL}/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.ok ? res.json() : Promise.reject())
        .then(data => {
        console.log('User data loaded on page load:', data); // Debug log
        setCurrentUser(data);
      })
        .catch(() => {
          localStorage.removeItem('jwtToken');
          setIsAuthenticated(false);
          setCurrentUser(null); // Clear name if token invalid
        });
    } else {
      setCurrentUser(null); // Clear name if no token
    }
  }, []);

  // Initialize session ID if it doesn't exist
  useEffect(() => {
    if (typeof window !== 'undefined' && !sessionId) {
      const newSessionId = generateUniqueTimestamp();
      setSessionId(newSessionId);
      localStorage.setItem('chatbot_session_id', newSessionId);
    }
  }, [sessionId]);

  // Preserve existing messages on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedMessages = localStorage.getItem('chatbot_messages');
      if (savedMessages) {
        try {
          const parsedMessages = JSON.parse(savedMessages);
          // Only restore if we have meaningful messages (not just default welcome)
          if (parsedMessages.length > 1 || (parsedMessages.length === 1 && parsedMessages[0].type === 'user')) {
            setMessages(parsedMessages);
          }
        } catch {
          // If parsing fails, keep current messages
        }
      }
    }
  }, []); // Only run once on mount

  // Update chatDomain when authentication or userType changes
  useEffect(() => {
    let domain = 'domain_3';
    const userType = localStorage.getItem('userType');
    if (userType === 'employee') domain = 'domain_1';
    else if (userType === 'customer') domain = 'domain_2';
    setChatDomain(domain);
  }, [isAuthenticated, loginType]);

  // API call function
  const callApi = async (query: string): Promise<string> => {
    try {
      // Use isAuthenticated state, not just localStorage
      let userType = null;
      let domain = 'domain_3';
      let token = null;
      if (isAuthenticated) {
        userType = localStorage.getItem('userType');
        if (userType === 'employee') domain = 'domain_1';
        else if (userType === 'customer') domain = 'domain_2';
        token = localStorage.getItem('jwtToken');
      }
      const requestBody: QueryRequestBody = {
        query: query,
        num_results: numResults,
        similarity_threshold: similarityThreshold,
        session_id: sessionId,
        use_session_history: false,
        session_history_title: "string"
      };
      if (userType === 'employee' || userType === 'customer') {
        requestBody.user_type = userType;
      }
      // Prepare headers
      const headers: Record<string, string> = {
        'accept': 'application/json',
        'Content-Type': 'application/json',
      };
      // Only send Authorization header for protected domains
      if ((domain === 'domain_1' || domain === 'domain_2') && token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
  
      // Before sending a message (in callApi):
      
      const response = await fetch(`${BACKEND_URL}/query/${domain}`, {
        method: 'POST',
        headers,
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

  // (Removed unused isGreeting and handleGreetingResponse helpers; using isGreetingMessage instead)

  // Function to detect general knowledge questions
  const isGeneralKnowledgeQuestion = (str: string) => {
    const questionWords = ['what', 'who', 'where', 'when', 'why', 'how', 'which', 'whom', 'whose'];
    const trimmed = str.trim().toLowerCase();
    // At least 3 words, contains a question word, and at least one verb-like word or number
    const hasQuestionWord = questionWords.some(word => trimmed.includes(word));
    const hasVerbOrNumber = /\b(is|are|was|were|do|does|did|can|could|will|would|have|has|had|am|shall|may|might|must|should|[0-9]+)\b/.test(trimmed);
    const wordCount = trimmed.split(/\s+/).length;
    // Accept as general knowledge if it matches the old logic, or if it has at least 3 words and contains any brand/company keyword
    const hasBrand = brandKeywords.some(brand => trimmed.includes(brand));
    return (hasQuestionWord && hasVerbOrNumber && wordCount >= 3) || (wordCount >= 3 && hasBrand);
  };

  // Function to detect instructional/imperative requests
  const isInstructionalRequest = (str: string) => {
    const trimmed = str.trim().toLowerCase();
    // Allow requests that start with common verbs or phrases
    const imperativeStarters = [
      'write', 'list', 'show', 'explain', 'describe', 'give', 'provide', 'generate', 'summarize', 'create', 'make', 'display', 'tell', 'convert', 'draw', 'find', 'calculate', 'compare', 'translate', 'define', 'add', 'remove', 'update', 'delete'
    ];
    return imperativeStarters.some(word => trimmed.startsWith(word));
  };

  // Spam/nonsense detection function (add above handleSubmit)
  const isSpam = (input: string) => {
    return (
      isKeyboardSpam(input) ||
      isCapSpam(input) ||
      isRandomSymbols(input) ||
      isNumberSpam(input) ||
      isGibberish(input) ||
      isSingleCharacterSpam(input)
    );
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // When a new chat starts, close login form automatically
    if (showLoginForm) setShowLoginForm(false);

    const userInputText = input.trim();
    const userMessageLower = userInputText.toLowerCase();

    // Abusive language check (match whole words only)
    const abusivePattern = new RegExp(`\\b(${abusiveWords.join('|')})\\b`, 'i');
    if (abusivePattern.test(userMessageLower)) {
      // Add the user's abusive message to chat history
      const userMessage: Message = {
        id: Date.now(),
        type: 'user',
        content: input,
        isTyping: false,
      };
      setMessages((prev: Message[]) => [
        ...prev,
        userMessage,
      ]);
      
      // Mark that user has started chatting (hide welcome message)
      if (!hasUserStartedChatting) {
        setHasUserStartedChatting(true);
      }
      
      // Then show the bot's warning
      const warningText = "Please refrain from using inappropriate language. Let's keep the conversation professional.";
      const assistantMessageId = Date.now() + 1;
      setTimeout(() => {
        setMessages((prev: Message[]) => [
          ...prev,
          {
            id: assistantMessageId,
            type: 'assistant',
            content: '',
            isTyping: true,
          },
        ]);
        let currentIndex = 0;
        const typingInterval = setInterval(() => {
          setMessages((prev: Message[]) =>
            prev.map((msg: Message) =>
              msg.id === assistantMessageId
                ? {
                    ...msg,
                    content: warningText.slice(0, currentIndex),
                    isTyping: currentIndex < warningText.length,
                  }
                : msg
            )
          );
          currentIndex++;
          if (currentIndex > warningText.length) {
            clearInterval(typingInterval);
          }
        }, 10);
      }, 50);
      setInput('');
      return;
    }

    if (!userInputText) {
      const botResponse = emptyResponses[Math.floor(Math.random() * emptyResponses.length)];
      setMessages((prev: Message[]) => [
        ...prev,
        {
          id: Date.now(),
          type: 'assistant',
          content: botResponse,
          isTyping: false,
        },
      ]);
      setInput('');
      return;
    }

    // --- NORMALIZE INPUT ---
    const normalizedInput = input.toLowerCase().replace(/\s+/g, ' ').trim();
    const isBrand = normalizedInput.includes('Mobiloitte');

    // Reject messages that contain only numbers and symbols (no letters), mirroring widget logic
    try {
      const compact = (userInputText || '').replace(/\s+/g, '');
      if (compact.length > 0 && !containsUnicodeLetters(compact) && isOnlyNumbersAndSymbols(compact)) {
        // Show user's message first
        const userMessage: Message = {
          id: Date.now(),
          type: 'user',
          content: input,
          isTyping: false,
        };
        setMessages((prev: Message[]) => [...prev, userMessage]);
        setInput('');

        // Assistant response with typing animation
        const botResponse = 'I am sorry I could not understand your query. Please provide some explanation so I can help.';
        const assistantMessageId = Date.now() + 1;
        setMessages((prev: Message[]) => [
          ...prev,
          {
            id: assistantMessageId,
            type: 'assistant',
            content: '',
            isTyping: true,
          },
        ]);
        let currentIndex = 0;
        const typingInterval = setInterval(() => {
          setMessages((prev: Message[]) =>
            prev.map((msg: Message) =>
              msg.id === assistantMessageId
                ? {
                    ...msg,
                    content: botResponse.slice(0, currentIndex),
                    isTyping: currentIndex < botResponse.length,
                  }
                : msg
            )
          );
          currentIndex++;
          if (currentIndex > botResponse.length) {
            clearInterval(typingInterval);
          }
        }, 10);
        return;
      }
    } catch {
      // If Unicode regex fails for any reason, fall through to normal handling
    }

    // --- FORM TRIGGER LOGIC (matching widget exactly) ---
    const lowerMessage = userInputText.toLowerCase();
    
    // Repeat message detection for unauthenticated users (matching widget)
      if (!isAuthenticated) {
      if (lastUserMessage === lowerMessage) {
        setRepeatMessageCount(prev => prev + 1);
      } else {
        setRepeatMessageCount(1);
        setLastUserMessage(lowerMessage);
      }
      if (repeatMessageCount > 2) {
        // Show guidance and open contact form
        const userMessage: Message = {
          id: Date.now(),
          type: 'user',
          content: input,
          isTyping: false,
        };
        setMessages((prev: Message[]) => [...prev, userMessage]);
        setInput('');

        const botResponse = "I think you have problem, please fill this form to resolve your problem";
        const assistantMessageId = Date.now() + 1;
        setTimeout(() => {
          setMessages((prev: Message[]) => [
            ...prev,
            {
              id: assistantMessageId,
              type: 'assistant',
              content: '',
              isTyping: true,
            },
          ]);
          let currentIndex = 0;
          const typingInterval = setInterval(() => {
            setMessages((prev: Message[]) =>
              prev.map((msg: Message) =>
                msg.id === assistantMessageId
                  ? {
                      ...msg,
                      content: botResponse.slice(0, currentIndex),
                      isTyping: currentIndex < botResponse.length,
                    }
                  : msg
              )
            );
            currentIndex++;
            if (currentIndex > botResponse.length) {
              clearInterval(typingInterval);
              // Open contact form after message
              setTimeout(() => {
                setMessages((prev: Message[]) => [
                  ...prev,
                  {
                    id: Date.now(),
                    type: 'support-form',
                    content: '',
                    isTyping: false,
                  },
                ]);
              }, 300);
            }
          }, 10);
        }, 50);
        return;
      }
    }

    // If logged in, skip all form validations and only check for ticket form triggers
    if (isAuthenticated && loginType === 'employee') {
      if (containsEmployeeTicketKeywords(lowerMessage)) {
        const userMessage: Message = {
          id: Date.now(),
          type: 'user',
          content: input,
          isTyping: false,
        };
        setMessages((prev: Message[]) => [...prev, userMessage]);
        setInput('');
        if (!hasUserStartedChatting) {
          setHasUserStartedChatting(true);
        }

        const botResponse = "It looks like you need employee support. Please fill out the employee ticket form below.";
        const assistantMessageId = Date.now() + 1;
        setTimeout(() => {
          setMessages((prev: Message[]) => [
            ...prev,
            {
              id: assistantMessageId,
              type: 'assistant',
              content: '',
              isTyping: true,
            },
          ]);
          let currentIndex = 0;
          const typingInterval = setInterval(() => {
            setMessages((prev: Message[]) =>
              prev.map((msg: Message) =>
                msg.id === assistantMessageId
                  ? {
                      ...msg,
                      content: botResponse.slice(0, currentIndex),
                      isTyping: currentIndex < botResponse.length,
                    }
                  : msg
              )
            );
            currentIndex++;
            if (currentIndex > botResponse.length) {
              clearInterval(typingInterval);
              // Open employee ticket form after message
              setTimeout(() => {
                setMessages((prev: Message[]) => [
                  ...prev,
                  {
                    id: Date.now(),
                    type: 'employee-form',
                    content: '',
                    isTyping: false,
                  },
                ]);
              }, 300);
            }
          }, 10);
        }, 50);
        return;
      }
    } else if (isAuthenticated && loginType === 'customer') {
      if (containsCustomerTicketKeywords(lowerMessage)) {
        const userMessage: Message = {
          id: Date.now(),
          type: 'user',
          content: input,
          isTyping: false,
        };
        setMessages((prev: Message[]) => [...prev, userMessage]);
        setInput('');
        if (!hasUserStartedChatting) {
          setHasUserStartedChatting(true);
        }

        const botResponse = "It looks like you need customer support. Please fill out the customer ticket form below.";
        const assistantMessageId = Date.now() + 1;
        setTimeout(() => {
          setMessages((prev: Message[]) => [
            ...prev,
            {
              id: assistantMessageId,
              type: 'assistant',
              content: '',
              isTyping: true,
            },
          ]);
          let currentIndex = 0;
          const typingInterval = setInterval(() => {
            setMessages((prev: Message[]) =>
              prev.map((msg: Message) =>
                msg.id === assistantMessageId
                  ? {
                      ...msg,
                      content: botResponse.slice(0, currentIndex),
                      isTyping: currentIndex < botResponse.length,
                    }
                  : msg
              )
            );
            currentIndex++;
            if (currentIndex > botResponse.length) {
              clearInterval(typingInterval);
              // Open customer ticket form after message
              setTimeout(() => {
                setMessages((prev: Message[]) => [
                  ...prev,
                  {
                    id: Date.now(),
                    type: 'customer-form',
                    content: '',
                    isTyping: false,
                  },
                ]);
              }, 300);
            }
          }, 10);
        }, 50);
        return;
      }
      } else {
      // Not logged in: all form validations as before
      // Check for job application keywords FIRST (more specific than business keywords)
      if (containsJobApplicationKeywords(lowerMessage)) {
        const userMessage: Message = {
          id: Date.now(),
          type: 'user',
          content: input,
          isTyping: false,
        };
        setMessages((prev: Message[]) => [...prev, userMessage]);
        setInput('');
        if (!hasUserStartedChatting) {
          setHasUserStartedChatting(true);
        }

        const botResponse = "It looks like you're interested in a job opportunity. Please fill out the job application form below.";
        const assistantMessageId = Date.now() + 1;
        setTimeout(() => {
          setMessages((prev: Message[]) => [
            ...prev,
            {
              id: assistantMessageId,
              type: 'assistant',
              content: '',
              isTyping: true,
            },
          ]);
          let currentIndex = 0;
          const typingInterval = setInterval(() => {
            setMessages((prev: Message[]) =>
              prev.map((msg: Message) =>
                msg.id === assistantMessageId
                  ? {
                      ...msg,
                      content: botResponse.slice(0, currentIndex),
                      isTyping: currentIndex < botResponse.length,
                    }
                  : msg
              )
            );
            currentIndex++;
            if (currentIndex > botResponse.length) {
              clearInterval(typingInterval);
              // Open job application form after message
              setTimeout(() => {
                setMessages((prev: Message[]) => [
                  ...prev,
                  {
                    id: Date.now(),
                    type: 'job-application-form',
                    content: '',
                    isTyping: false,
                  },
                ]);
              }, 300);
            }
          }, 10);
        }, 50);
        return;
      }

      // Check for business-related keywords that should trigger contact form
      if (containsBusinessKeywords(lowerMessage)) {
        const userMessage: Message = {
          id: Date.now(),
          type: 'user',
          content: input,
          isTyping: false,
        };
        setMessages((prev: Message[]) => [...prev, userMessage]);
        setInput('');
        if (!hasUserStartedChatting) {
          setHasUserStartedChatting(true);
        }

        const botResponse = "It seems like you're trying to reach out to us. Want to get in touch with our team? Please fill out this quick form below.";
        const assistantMessageId = Date.now() + 1;
        setTimeout(() => {
          setMessages((prev: Message[]) => [
            ...prev,
            {
              id: assistantMessageId,
              type: 'assistant',
              content: '',
              isTyping: true,
            },
          ]);
          let currentIndex = 0;
          const typingInterval = setInterval(() => {
            setMessages((prev: Message[]) =>
              prev.map((msg: Message) =>
                msg.id === assistantMessageId
                  ? {
                      ...msg,
                      content: botResponse.slice(0, currentIndex),
                      isTyping: currentIndex < botResponse.length,
                    }
                  : msg
              )
            );
            currentIndex++;
            if (currentIndex > botResponse.length) {
              clearInterval(typingInterval);
              // Open contact form after message
              setTimeout(() => {
                setMessages((prev: Message[]) => [
                  ...prev,
                  {
                    id: Date.now(),
                    type: 'support-form',
                    content: '',
                    isTyping: false,
                  },
                ]);
              }, 300);
            }
          }, 10);
        }, 50);
        return;
      }

      // Check for employee login keywords
      if (containsEmployeeLoginKeywords(lowerMessage)) {
        const userMessage: Message = {
          id: Date.now(),
          type: 'user',
          content: input,
          isTyping: false,
        };
        setMessages((prev: Message[]) => [...prev, userMessage]);
        setInput('');
        if (!hasUserStartedChatting) {
          setHasUserStartedChatting(true);
        }

        const botResponse = "It looks like you want to log in as an employee. Please use the form below.";
        const assistantMessageId = Date.now() + 1;
        setTimeout(() => {
          setMessages((prev: Message[]) => [
            ...prev,
            {
              id: assistantMessageId,
              type: 'assistant',
              content: '',
              isTyping: true,
            },
          ]);
          let currentIndex = 0;
          const typingInterval = setInterval(() => {
            setMessages((prev: Message[]) =>
              prev.map((msg: Message) =>
                msg.id === assistantMessageId
                  ? {
                      ...msg,
                      content: botResponse.slice(0, currentIndex),
                      isTyping: currentIndex < botResponse.length,
                    }
                  : msg
              )
            );
            currentIndex++;
            if (currentIndex > botResponse.length) {
              clearInterval(typingInterval);
              // Open login form with employee type
              setTimeout(() => {
                setShowLoginForm(true);
                setLoginType('employee');
              }, 300);
            }
          }, 10);
        }, 50);
        return;
      }

      // Check for customer login keywords
      if (containsCustomerLoginKeywords(lowerMessage)) {
      const userMessage: Message = {
        id: Date.now(),
        type: 'user',
        content: input,
        isTyping: false,
      };
      setMessages((prev: Message[]) => [...prev, userMessage]);
      setInput('');
        if (!hasUserStartedChatting) {
          setHasUserStartedChatting(true);
        }

        const botResponse = "It looks like you want to log in as a customer. Please use the form below.";
        const assistantMessageId = Date.now() + 1;
        setTimeout(() => {
          setMessages((prev: Message[]) => [
            ...prev,
            {
              id: assistantMessageId,
              type: 'assistant',
              content: '',
              isTyping: true,
            },
          ]);
          let currentIndex = 0;
          const typingInterval = setInterval(() => {
            setMessages((prev: Message[]) =>
              prev.map((msg: Message) =>
                msg.id === assistantMessageId
                  ? {
                      ...msg,
                      content: botResponse.slice(0, currentIndex),
                      isTyping: currentIndex < botResponse.length,
                    }
                  : msg
              )
            );
            currentIndex++;
            if (currentIndex > botResponse.length) {
              clearInterval(typingInterval);
              // Open login form with customer type
              setTimeout(() => {
                setShowLoginForm(true);
                setLoginType('customer');
              }, 300);
            }
          }, 10);
        }, 50);
        return;
      }

      // Fallback for basic login/sign in keywords (matching widget logic)
      if (lowerMessage.includes('login') || lowerMessage.includes('sign in')) {
        const userMessage: Message = {
          id: Date.now(),
          type: 'user',
          content: input,
          isTyping: false,
        };
        setMessages((prev: Message[]) => [...prev, userMessage]);
        setInput('');
      if (!hasUserStartedChatting) {
        setHasUserStartedChatting(true);
      }
      
        const botResponse = "I can help you with login access. Please use the login form below.";
        const assistantMessageId = Date.now() + 1;
        setTimeout(() => {
          setMessages((prev: Message[]) => [
            ...prev,
            {
              id: assistantMessageId,
              type: 'assistant',
              content: '',
              isTyping: true,
            },
          ]);
          let currentIndex = 0;
          const typingInterval = setInterval(() => {
            setMessages((prev: Message[]) =>
              prev.map((msg: Message) =>
                msg.id === assistantMessageId
                  ? {
                      ...msg,
                      content: botResponse.slice(0, currentIndex),
                      isTyping: currentIndex < botResponse.length,
                    }
                  : msg
              )
            );
            currentIndex++;
            if (currentIndex > botResponse.length) {
              clearInterval(typingInterval);
              // Open general login form (no preselected type, matches widget UX)
              setTimeout(() => {
                setShowLoginForm(true);
                setLoginType(null);
              }, 300);
            }
          }, 10);
        }, 50);
        return;
      }

      // Fallback for basic job keywords (matching widget logic)
      if (lowerMessage.includes('job') || lowerMessage.includes('apply') || lowerMessage.includes('application')) {
        const userMessage: Message = {
          id: Date.now(),
          type: 'user',
          content: input,
          isTyping: false,
        };
        setMessages((prev: Message[]) => [...prev, userMessage]);
        setInput('');
        if (!hasUserStartedChatting) {
          setHasUserStartedChatting(true);
        }

        const botResponse = "It looks like you're interested in a job opportunity. Please fill out the job application form below.";
        const assistantMessageId = Date.now() + 1;
        setTimeout(() => {
          setMessages((prev: Message[]) => [
            ...prev,
            {
              id: assistantMessageId,
              type: 'assistant',
              content: '',
              isTyping: true,
            },
          ]);
          let currentIndex = 0;
          const typingInterval = setInterval(() => {
            setMessages((prev: Message[]) =>
              prev.map((msg: Message) =>
                msg.id === assistantMessageId
                  ? {
                      ...msg,
                      content: botResponse.slice(0, currentIndex),
                      isTyping: currentIndex < botResponse.length,
                    }
                  : msg
              )
            );
            currentIndex++;
            if (currentIndex > botResponse.length) {
              clearInterval(typingInterval);
              // Open job application form
              setTimeout(() => {
              setMessages((prev: Message[]) => [
                ...prev,
                {
                    id: Date.now(),
                    type: 'job-application-form',
                  content: '',
                  isTyping: false,
                },
              ]);
              }, 300);
            }
          }, 10);
        }, 50);
        return;
      }

      // Fallback for basic ticket/support keywords (matching widget logic)
      if (lowerMessage.includes('ticket') || lowerMessage.includes('support')) {
      const userMessage: Message = {
        id: Date.now(),
        type: 'user',
        content: input,
        isTyping: false,
      };
      setMessages((prev: Message[]) => [...prev, userMessage]);
      setInput('');
        if (!hasUserStartedChatting) {
          setHasUserStartedChatting(true);
        }

        const botResponse = "I can help you with support. Please login first to access support tickets. You can use the login button above.";
        const assistantMessageId = Date.now() + 1;
        setTimeout(() => {
          setMessages((prev: Message[]) => [
            ...prev,
            {
              id: assistantMessageId,
              type: 'assistant',
              content: '',
              isTyping: true,
            },
          ]);
          let currentIndex = 0;
          const typingInterval = setInterval(() => {
            setMessages((prev: Message[]) =>
              prev.map((msg: Message) =>
                msg.id === assistantMessageId
                  ? {
                      ...msg,
                      content: botResponse.slice(0, currentIndex),
                      isTyping: currentIndex < botResponse.length,
                    }
                  : msg
              )
            );
            currentIndex++;
            if (currentIndex > botResponse.length) {
              clearInterval(typingInterval);
            }
          }, 10);
        }, 50);
        return;
      }

      // Check for greeting messages and provide immediate response
      if (isGreetingMessage(lowerMessage)) {
        const userMessage: Message = {
          id: Date.now(),
          type: 'user',
          content: input,
          isTyping: false,
        };
        setMessages((prev: Message[]) => [...prev, userMessage]);
        setInput('');
      if (!hasUserStartedChatting) {
        setHasUserStartedChatting(true);
      }
      
        const greetingResponse = getRandomGreetingResponse();
        const assistantMessageId = Date.now() + 1;
        setTimeout(() => {
          setMessages((prev: Message[]) => [
            ...prev,
            {
              id: assistantMessageId,
              type: 'assistant',
              content: '',
              isTyping: true,
            },
          ]);
          let currentIndex = 0;
          const typingInterval = setInterval(() => {
            setMessages((prev: Message[]) =>
              prev.map((msg: Message) =>
                msg.id === assistantMessageId
                  ? {
                      ...msg,
                      content: greetingResponse.slice(0, currentIndex),
                      isTyping: currentIndex < greetingResponse.length,
                    }
                  : msg
              )
            );
            currentIndex++;
            if (currentIndex > greetingResponse.length) {
              clearInterval(typingInterval);
            }
          }, 10);
        }, 50);
      return;
    }

      // Check for inappropriate language and provide appropriate response
      if (containsInappropriateLanguage(lowerMessage)) {
        const userMessage: Message = {
          id: Date.now(),
          type: 'user',
          content: input,
          isTyping: false,
        };
        setMessages((prev: Message[]) => [...prev, userMessage]);
        setInput('');

        const inappropriateResponse = getInappropriateLanguageResponse();
        const assistantMessageId = Date.now() + 1;
        setTimeout(() => {
          setMessages((prev: Message[]) => [
            ...prev,
            {
              id: assistantMessageId,
              type: 'assistant',
              content: '',
              isTyping: true,
            },
          ]);
          let currentIndex = 0;
          const typingInterval = setInterval(() => {
            setMessages((prev: Message[]) =>
              prev.map((msg: Message) =>
                msg.id === assistantMessageId
                  ? {
                      ...msg,
                      content: inappropriateResponse.slice(0, currentIndex),
                      isTyping: currentIndex < inappropriateResponse.length,
                    }
                  : msg
              )
            );
            currentIndex++;
            if (currentIndex > inappropriateResponse.length) {
              clearInterval(typingInterval);
            }
          }, 10);
        }, 50);
        return;
      }
    }


    // Allow valid keywords to bypass spam/character restrictions
    const isValidKeyword =
      jobApplicationKeywords.some(keyword => {
        try {
          const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`, 'i');
          return regex.test(normalizedInput);
        } catch {
          return false;
        }
      }) ||
      leadFormPowerWords.some(word => normalizedInput.includes(word));

    // Only apply spam/character restrictions if not a valid keyword
    if (!isValidKeyword) {
      // Prevent single letter, number, or symbol as input
      const trimmedInput = input.trim();
      if (trimmedInput.length === 1 && /[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(trimmedInput)) {
        const botResponse = "Please enter a more meaningful message.";
        const assistantMessageId = Date.now() + 1;
        setMessages((prev: Message[]) => [
          ...prev,
          {
            id: assistantMessageId,
            type: 'assistant',
            content: '',
            isTyping: true,
          },
        ]);
        setInput('');
        let currentIndex = 0;
        const typingInterval = setInterval(() => {
          setMessages((prev: Message[]) =>
            prev.map((msg: Message) =>
              msg.id === assistantMessageId
                ? {
                    ...msg,
                    content: botResponse.slice(0, currentIndex),
                    isTyping: currentIndex < botResponse.length,
                  }
                : msg
            )
          );
          currentIndex++;
          if (currentIndex > botResponse.length) {
            clearInterval(typingInterval);
          }
        }, 10);
        return;
      }

      // Prevent repeated same letter or symbol (e.g., 'aa', 'aaa', '@@', '!!!')
      if (/^(.)\1{1,}$/.test(trimmedInput)) {
        const botResponse = "Please enter a more meaningful message.";
        const assistantMessageId = Date.now() + 1;
        setMessages((prev: Message[]) => [
          ...prev,
          {
            id: assistantMessageId,
            type: 'assistant',
            content: '',
            isTyping: true,
          },
        ]);
        setInput('');
        let currentIndex = 0;
        const typingInterval = setInterval(() => {
          setMessages((prev: Message[]) =>
            prev.map((msg: Message) =>
              msg.id === assistantMessageId
                ? {
                    ...msg,
                    content: botResponse.slice(0, currentIndex),
                    isTyping: currentIndex < botResponse.length,
                  }
                : msg
            )
          );
          currentIndex++;
          if (currentIndex > botResponse.length) {
            clearInterval(typingInterval);
          }
        }, 10);
        return;
      }

      // Prevent input with only 1-3 unique characters (e.g., 'aaabbb', 'cccdddeeegggggg', '22224443335555222111144353')
      const uniqueChars = new Set(trimmedInput.split(''));
      if (trimmedInput.length > 2 && uniqueChars.size <= 3) {
        const botResponse = "Please enter a more meaningful message.";
        const assistantMessageId = Date.now() + 1;
        setMessages((prev: Message[]) => [
          ...prev,
          {
            id: assistantMessageId,
            type: 'assistant',
            content: '',
            isTyping: true,
          },
        ]);
        setInput('');
        let currentIndex = 0;
        const typingInterval = setInterval(() => {
          setMessages((prev: Message[]) =>
            prev.map((msg: Message) =>
              msg.id === assistantMessageId
                ? {
                    ...msg,
                    content: botResponse.slice(0, currentIndex),
                    isTyping: currentIndex < botResponse.length,
                  }
                : msg
            )
          );
          currentIndex++;
          if (currentIndex > botResponse.length) {
            clearInterval(typingInterval);
          }
        }, 10);
        return;
      }
    }

    // --- EMPLOYEE/CUSTOMER LOGIN DETECTION (PRIORITY) ---
    const loginIntentPhrases = [
      'employee login', 'customer login', 'i am employee', 'i am customer', 'i work at', 'i work for'
    ];
    const isLoginIntent = loginIntentPhrases.some(phrase => normalizedInput.includes(phrase));
    if (isLoginIntent && !isAuthenticated && !isBrand) {
      const userMessage: Message = {
        id: Date.now(),
        type: 'user',
        content: input,
        isTyping: false,
      };
      setMessages((prev: Message[]) => [...prev, userMessage]);
      setInput('');
      
      // Mark that user has started chatting (hide welcome message)
      if (!hasUserStartedChatting) {
        setHasUserStartedChatting(true);
      }
      
      // Use phrase to determine type if possible
      let loginType: 'employee' | 'customer' | null = null;
      if (normalizedInput.includes('employee')) loginType = 'employee';
      if (normalizedInput.includes('customer')) loginType = 'customer';
      setLoginType(loginType);
      setShowLoginForm(true);
      setLoginPromptMessage(
        loginType === 'employee'
          ? 'It seems you are an employee of Mobiloitte, please login.'
          : loginType === 'customer'
            ? 'It seems you are an existing customer of Mobiloitte, please login.'
            : 'Please login.'
      );
      return;
    }
    // Backend LLM user type analysis for unauthenticated users
    const loginKeywords = ['login', 'sign in', 'employee login', 'customer login', 'i am employee', 'i am customer', 'i work at', 'i work for'];
    const inputLower = input.toLowerCase();
    const isLoginRequest = loginKeywords.some(keyword => inputLower.includes(keyword));
    if (isLoginRequest && !isAuthenticated) {
      try {
        const res = await fetch(`${BACKEND_URL}/analyze-user-type`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: input }),
        });
        const data = await res.json();
        if (data.user_type === 'employee' || data.user_type === 'customer') {
          const userMessage: Message = {
            id: Date.now(),
            type: 'user',
            content: input,
            isTyping: false,
          };
          setMessages((prev: Message[]) => [...prev, userMessage]);
          setInput('');
          
          // Mark that user has started chatting (hide welcome message)
          if (!hasUserStartedChatting) {
            setHasUserStartedChatting(true);
          }
          
          setLoginType(data.user_type);
          setShowLoginForm(true);
          setLoginPromptMessage(
            data.user_type === 'employee'
              ? 'It seems you are an employee of Mobiloitte, please login.'
              : 'It seems you are an existing customer of Mobiloitte, please login.'
          );
      return;
        } else {
          setLoginPromptMessage(null);
        }
      } catch {
        setLoginPromptMessage(null);
      }
    }

    // --- JOB APPLICATION KEYWORD CHECK (PRIORITY) ---
    const jobApplyDetected = jobApplicationKeywords.some(keyword => {
      try {
        const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`, 'i');
        return regex.test(normalizedInput);
      } catch {
        return false;
      }
    });

    // Check for intern/trainee specific keywords
    const internTraineeKeywords = ['intern', 'internship', 'trainee', 'training', 'apprentice', 'apprenticeship', 'entry level', 'entry-level', 'junior', 'fresher', 'graduate', 'student', 'learning', 'mentorship', 'mentor', 'coaching', 'coach'];
    const isInternTraineeRequest = internTraineeKeywords.some(keyword => {
      try {
        const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`, 'i');
        return regex.test(normalizedInput);
      } catch {
        return false;
      }
    });

    if (jobApplyDetected) {
      const userMsg: Message = {
        id: Date.now(),
        type: 'user',
        content: input,
        isTyping: false,
      };
      setMessages((prev: Message[]) => [...prev, userMsg]);
      setInput('');

      // Pre-fill form data for intern/trainee requests
      if (isInternTraineeRequest) {
        setJobFormData({
          name: '',
          email: '',
          mobile: '',
          jobCategory: 'Trainee',
          experience: 'Trainee'
        });
        setJobFormHeading('Intern & Trainee Application');
        if (typeof window !== 'undefined') {
          localStorage.setItem('jobFormHeading', 'Intern & Trainee Application');
        }
      } else {
        setJobFormHeading('Job Application');
        if (typeof window !== 'undefined') {
          localStorage.setItem('jobFormHeading', 'Job Application');
        }
      }

      // Add assistant message with typing
      const assistantMessageId = Date.now() + 1;
      setMessages((prev: Message[]) => [
        ...prev,
        {
          id: assistantMessageId,
          type: 'assistant' as const,
          content: '',
          isTyping: true,
        } as Message,
      ]);

      const typingText = isInternTraineeRequest 
        ? "I've recognized your interest in trainee and internship opportunities. The application form has been pre-configured with appropriate trainee options to enhance your application experience."
        : "To apply, visit our Careers Page, upload your CV, and fill out the application form. You can also email your resume to 'hr@Mobiloitte.com'.";
      let currentIndex = 0;
      const typingInterval = setInterval(() => {
        setMessages((prev: Message[]) =>
          prev.map((msg: Message) =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  content: typingText.slice(0, currentIndex),
                  isTyping: currentIndex < typingText.length,
                }
              : msg
          )
        );
        currentIndex++;
        if (currentIndex > typingText.length) {
          clearInterval(typingInterval);
          // After typing, show the job application form
          setTimeout(() => {
            setMessages((prev: Message[]) => [
              ...prev,
              {
                id: Date.now() + 2,
                type: 'job-application-form' as const,
                content: '',
                isTyping: false,
              } as Message,
            ]);
          }, 500); // Show form after 0.5s
        }
      }, 10); // Typing speed (10ms per character)
      return;
    }

    // --- LEAD/CONTACT US FORM POWER WORDS CHECK ---
    const leadFormDetected =
      leadFormPowerWords.some(word => normalizedInput.includes(word)) &&
      !normalizedInput.includes('?') &&
      normalizedInput.split(' ').length <= 6; // Only short, non-question messages
    if (leadFormDetected && !isBrand) {
      const userMsg: Message = {
        id: Date.now(),
        type: 'user',
        content: input,
        isTyping: false,
      };
      setMessages((prev: Message[]) => [...prev, userMsg]);
      setInput('');

      // Typing animation for assistant message
      const assistantMessageId = Date.now() + 1;
      setMessages((prev: Message[]) => [
        ...prev,
        {
          id: assistantMessageId,
          type: 'assistant' as const,
          content: '',
          isTyping: true,
        } as Message,
      ]);

      const typingText = "I understand you're interested in our services! Please fill out the form below and our team will get back to you shortly.";
      let currentIndex = 0;
      const typingInterval = setInterval(() => {
        setMessages((prev: Message[]) =>
          prev.map((msg: Message) =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  content: typingText.slice(0, currentIndex),
                  isTyping: currentIndex < typingText.length,
                }
              : msg
          )
        );
        currentIndex++;
        if (currentIndex > typingText.length) {
          clearInterval(typingInterval);
          setTimeout(() => {
            setMessages((prev: Message[]) => [
              ...prev,
              {
                id: Date.now() + 2,
                type: 'support-form' as const,
                content: '',
                isTyping: false,
              } as Message,
            ]);
          }, 500);
        }
      }, 10);
      return;
    }

    // Check for general knowledge question OR instructional request BEFORE spam/nonsense logic
    if (isGeneralKnowledgeQuestion(normalizedInput) || isInstructionalRequest(normalizedInput)) {
      // Normal AI response for general knowledge or instructional requests
      const userMessage: Message = {
        id: Date.now(),
        type: 'user',
        content: input,
        isTyping: false,
      };
      const currentInput = input;
      setMessages((prev: Message[]) => [...prev, userMessage]);
      setInput('');
      
      // Mark that user has started chatting (hide welcome message)
      if (!hasUserStartedChatting) {
        setHasUserStartedChatting(true);
      }
      
      setIsLoading(true);
      try {
        let apiResponse = await callApi(currentInput);
        // Clean up malformed response format
        apiResponse = apiResponse.replace(/^hello[!,.\s-]*/i, '');
        // Remove malformed response patterns
        apiResponse = apiResponse.replace(/Thank you for your message: '[^']*'\\n\\nRESPONSE:/g, '');
        apiResponse = apiResponse.replace(/Thank you for your message: '[^']*'\\n\\nRESPONSE:/g, '');
        // Clean up any remaining malformed text
        apiResponse = apiResponse.replace(/^Thank you for your message:[\s\S]*?RESPONSE:/, '');
        // Trim whitespace
        apiResponse = apiResponse.trim();
        // If response is empty after cleaning, provide a fallback
        if (!apiResponse || apiResponse.length === 0) {
          apiResponse = "I'm here to help you with any questions or information you need. How can I assist you today?";
        }
        const assistantMessageId = Date.now() + 1;
        const assistantMessage: Message = {
          id: assistantMessageId,
          type: 'assistant',
          content: '',
          isTyping: true,
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
        };
        setMessages((prev: Message[]) => [...prev, errorMessage]);
      }
      return;
    }

    // Section 2: Detection and Response
    if (isSpam(normalizedInput)) {
      // Map to gibberish or keyboard response based on which function matches
      let botResponse = '';
      if (isKeyboardSpam(normalizedInput) || isCapSpam(normalizedInput)) {
        botResponse = keyboardResponses[Math.floor(Math.random() * keyboardResponses.length)];
      } else if (isRandomSymbols(normalizedInput)) {
        botResponse = symbolsResponses[Math.floor(Math.random() * symbolsResponses.length)];
      } else if (isNumberSpam(normalizedInput)) {
        botResponse = gibberishResponses[Math.floor(Math.random() * gibberishResponses.length)];
      } else if (isGibberish(normalizedInput) || isSingleCharacterSpam(normalizedInput)) {
        botResponse = gibberishResponses[Math.floor(Math.random() * gibberishResponses.length)];
      } else {
        botResponse = gibberishResponses[Math.floor(Math.random() * gibberishResponses.length)];
      }
      // Show user's message first
      const userMessage: Message = {
        id: Date.now(),
        type: 'user',
        content: input,
        isTyping: false,
      };
      setMessages((prev: Message[]) => [...prev, userMessage]);
      // Typing effect for bot response
      const assistantMessageId = Date.now() + 1;
      setMessages((prev: Message[]) => [
        ...prev,
        {
          id: assistantMessageId,
          type: 'assistant',
          content: '',
          isTyping: true,
        },
      ]);
      setInput('');
      // Track last 3 random/nonsense inputs
      // setLastRandomInputs(prev => { ... });
      // setLastRandomInputs([]);
      // And any related comments about tracking last 3 random/nonsense inputs.
      let currentIndex = 0;
      const typingInterval = setInterval(() => {
        setMessages((prev: Message[]) =>
          prev.map((msg: Message) =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  content: botResponse.slice(0, currentIndex),
                  isTyping: currentIndex < botResponse.length,
                }
              : msg
          )
        );
        currentIndex++;
        if (currentIndex > botResponse.length) {
          clearInterval(typingInterval);
        }
      }, 10);
      return;
    } else {
      // If not nonsense, reset lastRandomInputs
      // setLastRandomInputs([]);
    }

    // Intercept for customer support phrases SECOND
    const humanRequestPhrases = [
      'i want to speak to a human',
      'i want to speak to a live agent',
      'can you connect me to an agent'
    ];
    if (humanRequestPhrases.some(phrase => normalizedInput.includes(phrase))) {
      const userMessage: Message = {
        id: Date.now(),
        type: 'user',
        content: input,
        isTyping: false,
      };
      setMessages((prev: Message[]) => [...prev, userMessage]);
      setInput('');
      
      // Mark that user has started chatting (hide welcome message)
      if (!hasUserStartedChatting) {
        setHasUserStartedChatting(true);
      }
      
      const assistantMessageId = Date.now() + 1;
      setMessages((prev: Message[]) => [
        ...prev,
        {
          id: assistantMessageId,
          type: 'assistant',
          content: '',
          isTyping: true,
        },
      ]);
      const supportMsg = 'Transferring you to a customer support representative...';
      let currentIndex = 0;
      const typingInterval = setInterval(() => {
        setMessages((prev: Message[]) =>
          prev.map((msg: Message) =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  content: supportMsg.slice(0, currentIndex),
                  isTyping: currentIndex < supportMsg.length,
                }
              : msg
          )
        );
        currentIndex++;
        if (currentIndex > supportMsg.length) {
          clearInterval(typingInterval);
        }
      }, 10);
      return;
    }



    // --- MATH EXPRESSION CHECK ---
    // If the input is a simple arithmetic expression, evaluate it client-side
    const mathMatch = normalizedInput.match(/^\s*([-+]?\d+(?:\.\d+)?)(\s*[+\-*/%]\s*([-+]?\d+(?:\.\d+)?))+\s*$/);
    if (mathMatch) {
      try {
        // Evaluate safely: only allow numbers and operators
        const mathResult = Function(`"use strict";return (${input})`)();
        const userMessage: Message = {
          id: Date.now(),
          type: 'user',
          content: input,
          isTyping: false,
        };
        setMessages((prev: Message[]) => [...prev, userMessage]);
        setInput('');
        
        // Mark that user has started chatting (hide welcome message)
        if (!hasUserStartedChatting) {
          setHasUserStartedChatting(true);
        }
        
        const assistantMessageId = Date.now() + 1;
        setMessages((prev: Message[]) => [
          ...prev,
          {
            id: assistantMessageId,
            type: 'assistant',
            content: '',
            isTyping: true,
          },
        ]);
        let currentIndex = 0;
        const resultStr = `Result: ${mathResult}`;
        const typingInterval = setInterval(() => {
          setMessages((prev: Message[]) =>
            prev.map((msg: Message) =>
              msg.id === assistantMessageId
                ? {
                  ...msg,
                  content: resultStr.slice(0, currentIndex),
                  isTyping: currentIndex < resultStr.length,
                }
                : msg
            )
          );
          currentIndex++;
          if (currentIndex > resultStr.length) {
            clearInterval(typingInterval);
          }
        }, 10);
        return;
      } catch {
        // If evaluation fails, fall through to normal handling
      }
    }

    // Normal AI response for all other messages (including 'Mobiloitte')
    const userMessage: Message = {
      id: Date.now(),
      type: 'user',
      content: input,
      isTyping: false,
    };
    const currentInput = input;
    setMessages((prev: Message[]) => [...prev, userMessage]);
    setInput('');
    
    // Mark that user has started chatting (hide welcome message)
    if (!hasUserStartedChatting) {
      setHasUserStartedChatting(true);
    }
    setIsLoading(true);
    try {
      let apiResponse = await callApi(currentInput);
      // Remove 'Hello!' prefix if present
      apiResponse = apiResponse.replace(/^hello[!,.\s-]*/i, '');
      const assistantMessageId = Date.now() + 1;
      const assistantMessage: Message = {
        id: assistantMessageId,
        type: 'assistant',
        content: '',
        isTyping: true,
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
      };
      setMessages((prev: Message[]) => [...prev, errorMessage]);
    }

    // --- EXACT 'LOGIN' KEYWORD CHECK (HIGHEST PRIORITY) ---
    if (inputLower.trim() === 'login' && !isAuthenticated) {
      setShowLoginForm(true);
      setLoginPromptMessage('Please login.');
      setInput('');
      return;
    }

    // --- EMPLOYEE/CUSTOMER POWER WORDS FORM TRIGGER ---
    // Remove all 'const employeePowerWords' and 'const customerPowerWords' declarations from the file
  };

  const handleSaveChat = async () => {
    if (saveName.trim()) {
      try {
        // In handleSaveChat, before fetch:

        const response = await fetch(`${BACKEND_URL}/domain/${encodeURIComponent(chatDomain)}/save-session`, {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            session_id: sessionId, // use the current sessionId
            title: saveName.trim()
          }),
        });
        const saveData = await response.json();
        if (!response.ok) {
          setSaveAlert({
            type: 'error',
            message: saveData.detail || 'Failed to save chat. Please try again.'
          });
          return;
        }
        setIsSavePopupOpen(false);
        setSaveName('');
        setSaveAlert({
          type: 'success',
          message: saveData.message || `Session saved successfully as '${saveData.title}' in domain ${chatDomain}`
        });
        // Only now, after successful save, clear chat and generate new sessionId
        setMessages([]); // Show new welcome message
        setHasUserStartedChatting(false);
        const newSessionId = generateUniqueTimestamp();
        setSessionId(newSessionId);
        localStorage.removeItem('chatbot_messages');
        localStorage.setItem('chatbot_session_id', newSessionId);
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
    // Reset session if user cancels
    setMessages([]); // Show new welcome message
    setHasUserStartedChatting(false);
    const newSessionId = generateUniqueTimestamp();
    setSessionId(newSessionId);
    localStorage.removeItem('chatbot_messages');
    localStorage.setItem('chatbot_session_id', newSessionId);
  };

  // Login handler using backend authentication
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    if (!loginType) {
      setLoginError('Please select user type.');
      setLoginLoading(false);
      return;
    }
    // If there are field errors, do not submit
    if (loginEmailError || loginPasswordError) {
      setLoginLoading(false);
      return;
    }
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(loginEmail)) {
      setLoginError('Please enter a valid email address.');
      setLoginLoading(false);
      return;
    }
    // Password length validation
    if (loginPassword.length < 6) {
      setLoginError('Password must be at least 6 characters long.');
      setLoginLoading(false);
      return;
    }
    try {
      const response = await fetch(`${BACKEND_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
          user_type: loginType,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setLoginError(data.detail || 'Login failed');
        setLoginLoading(false);
        return;
      }
      setIsAuthenticated(true);
      setShowLoginForm(false);
      setLoginEmail('');
      setLoginPassword('');
      setLoginError('');
      
      // Reset chat state for fresh start after login
      setMessages([]); // Clear messages to show welcome screen
      setHasUserStartedChatting(false); // Reset chat state
      setGreetingCount(0);
      setRepeatMessageCount(0);
      setInput('');
      
      // Clear any old messages from localStorage
      localStorage.removeItem('chatbot_messages');
      localStorage.removeItem('adminGreetingCount');
      
      // Force welcome message to show after a short delay to ensure all effects have run
      setTimeout(() => {
        setHasUserStartedChatting(false);
        setMessages([]);
        console.log('Delayed reset - forcing welcome message to show');
      }, 100);
      
      console.log('Complete login - chat state reset for welcome message');
      
      // Generate new session ID for authenticated user
      const newSessionId = generateUniqueTimestamp();
      setSessionId(newSessionId);
      localStorage.setItem('chatbot_session_id', newSessionId);
      
      // Store user info and JWT token in localStorage
      localStorage.setItem('userEmail', loginEmail);
      localStorage.setItem('userType', loginType);
      if (data.token) {
        localStorage.setItem('jwtToken', data.token);
        // Fetch current user info
        try {
          const response = await fetch(`${BACKEND_URL}/me`, {
            headers: {
              'accept': 'application/json',
              'Authorization': `Bearer ${data.token}`,
            }
          });
          if (response.ok) {
            const userData = await response.json();
            console.log('User data from /me endpoint:', userData); // Debug log
            setCurrentUser(userData); // Set name immediately after login
          }
        } catch {
          // handle error
        }
      }
    } catch {
      setLoginError('Login failed. Please try again.');
    }
    setLoginLoading(false);
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/logout`, {
        method: 'POST',
        headers: { 'accept': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Logout failed');
      }

      // Clear authentication state
      localStorage.removeItem('jwtToken');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userType');
      localStorage.removeItem('isAuthenticated');
      document.cookie = 'isAuthenticated=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      
      // Clear ALL chat and session data
      localStorage.removeItem('chatbot_messages');
      localStorage.removeItem('chatbot_session_id');
      localStorage.removeItem('adminGreetingCount');
      localStorage.removeItem('jobFormHeading');
      localStorage.removeItem('selectedChatbotAvatar');
      localStorage.removeItem('chatbotName');
      
      // Reset ALL state
      setIsAuthenticated(false);
      setCurrentUser(null);
      setLoginEmail('');
      setLoginPassword('');
      setLoginError('');
      setLoginType(null);
      setShowLoginForm(false);
      
      // Reset chat state completely
      setMessages([]); // Clear messages to show welcome screen
      setHasUserStartedChatting(false); // Reset chat state
      setGreetingCount(0);
      setRepeatMessageCount(0);
      setInput('');
      
      console.log('Complete logout - all state reset');
      
      // Show logout confirmation
      setAlertMsg('You have been successfully logged out.');
      setAlertOpen(true);
      
    } catch (error) {
      console.error('Logout failed:', error);
      setAlertMsg('There was an issue with logout. Please try again.');
      setAlertOpen(true);
    }
  };


  // Handler for support form submission
  const handleSupportFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormStatus(null);
    // Validate all fields before submit
          const errors = {
        name: validateSupportName(formData.name),
        email: validateSupportEmail(formData.email),
        phone: validateSupportPhone(formData.phone, formData.countryCode),
        countryCode: validateSupportCountryCode(formData.countryCode),
        message: '', // Message is optional, no validation required
        interest: validateSupportInterest(formData.interest),
        source: validateSupportSource(formData.source)
      };
    setFormErrors(errors);
    if (Object.values(errors).some(Boolean)) {
      return;
    }
    setLoading(true);
    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        phone: `${formData.countryCode}${formData.phone}`,
        message: formData.message,
        source: formData.source,
        interest: formData.interest, // move to top-level
        lead_metadata: {}, // keep as empty object or add extra metadata if needed
      };
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/leads/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        setFormStatus('Submitted successfully!');
        setFormData({ name: '', email: '', phone: '', countryCode: '+1', message: '', interest: '', source: '' });
        setMessages((prev: Message[]) => prev.filter(m => m.type !== 'support-form'));
        setShowThankYou(true);
        setTimeout(() => setShowThankYou(false), 5000); // Hide after 5 seconds
        // Add assistant message with typing animation
        const assistantMessageId = Date.now() + 1;
        setMessages(prev => [
          ...prev,
          {
            id: assistantMessageId,
            type: 'assistant',
            content: '',
            isTyping: true,
          },
        ]);

        const typingText = 'Thank you! Our team will contact you soon.';
        let currentIndex = 0;
        const typingInterval = setInterval(() => {
          setMessages(prev =>
            prev.map(msg =>
              msg.id === assistantMessageId
                ? {
                    ...msg,
                    content: typingText.slice(0, currentIndex),
                    isTyping: currentIndex < typingText.length,
                  }
                : msg
            )
          );
          currentIndex++;
          if (currentIndex > typingText.length) {
            clearInterval(typingInterval);
          }
        }, 10); // Typing speed (10ms per character)
        // Save the session after successful form submission
        if (!sessionId) {
          console.error('No sessionId found, cannot save session.');
        } else if (!messages.some(m => m.type === 'user' || m.type === 'assistant')) {
          console.error('No chat messages found, cannot save session.');
        } else {
          const title = formData.name || 'Contact Form Submission';
  
          try {
            // Use fixed endpoint for save session as per curl example
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/domain/domain_3/save-session`, {
              method: 'POST',
              headers: {
                'accept': 'application/json',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                session_id: sessionId,
                title,
              }),
            });
            const saveData = await response.json();
            if (!response.ok) {
              console.error('Failed to save session:', saveData.detail || saveData);
            } else {
  
            }
          } catch (err) {
            console.error('Error saving session:', err);
          }
        }
      } else {
        const data = await response.json();
        setFormStatus(data.error || 'Submission failed.');
      }
    } catch {
      setFormStatus('Submission failed. Server error.');
    } finally {
      setLoading(false);
    }
  };

  // Field-level validation handlers
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) return 'Email is required.';
    if (!emailRegex.test(email)) return 'Please enter a valid email address.';
    return '';
  };
  const validatePassword = (password: string) => {
    if (!password) return 'Password is required.';
    if (password.length < 6) return 'Password must be at least 6 characters long.';
    return '';
  };
  // Field-level validation functions for support form
  const validateSupportName = (name: string) => {
    if (!name) return 'Name is required.';
    return '';
  };
  const validateSupportEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) return 'Email is required.';
    if (!emailRegex.test(email)) return 'Please enter a valid email address.';
    return '';
  };
  const validateSupportPhone = (phone: string, code: string) => {
    const phoneRegex = /^\d{7,15}$/;
    if (!phone) return 'Phone is required.';
    if (!code) return 'Please select a country code.';
    if (!phoneRegex.test(phone)) return 'Please enter a valid phone number.';
    return '';
  };
  const validateSupportInterest = (interest: string) => {
    if (!interest) return 'Please select an interest.';
    return '';
  };
  const validateSupportSource = (source: string) => {
    if (!source) return 'Please select a source.';
    return '';
  };
  const validateSupportCountryCode = (code: string) => {
    if (!code) return 'Please select a country code.';
    return '';
  };
  
  const validateSupportMessage = (message: string) => {
    if (!message) return 'Message is required.';
    if (message.trim().length < 2) return 'Message must be at least 2 characters.';
    if (message.length > 500) return 'Message must be less than 500 characters.';
    return '';
  };

  // Field-level validation functions for job application form
  const validateJobName = (name: string) => {
    if (!name) return 'Name is required.';
    if (!/^[A-Za-z\s]+$/.test(name)) return 'Only alphabets are allowed.';
    if (name.length < 2) return 'Name must be at least 2 characters.';
    if (name.length > 50) return 'Name must be less than 50 characters.';
    return '';
  };
  
  const validateJobEmail = (email: string) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!email) return 'Email is required.';
    if (!emailRegex.test(email)) return 'Please enter a valid email address.';
    if (email.length > 100) return 'Email must be less than 100 characters.';
    return '';
  };
  
  const validateJobMobile = (mobile: string) => {
    if (!mobile) return 'Mobile number is required.';
    const phoneRegex = /^\d{7,15}$/;
    if (!phoneRegex.test(mobile)) return 'Please enter a valid mobile number.';
    return '';
  };
  
  const validateJobCategory = (category: string) => {
    if (!category) return 'Please select a job category.';
    return '';
  };
  
  const validateJobExperience = (experience: string) => {
    if (!experience) return 'Please select experience level.';
    return '';
  };

  // Field-level validation functions for employee helpdesk ticket form
  const validateEmployeeTicketName = (name: string) => {
    if (!name) return 'Name is required.';
    if (!/^[A-Za-z\s]+$/.test(name)) return 'Only alphabets are allowed.';
    if (name.length < 2) return 'Name must be at least 2 characters.';
    if (name.length > 50) return 'Name must be less than 50 characters.';
    return '';
  };
  
  const validateEmployeeTicketEmail = (email: string) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!email) return 'Email is required.';
    if (!emailRegex.test(email)) return 'Please enter a valid email address.';
    if (email.length > 100) return 'Email must be less than 100 characters.';
    return '';
  };
  
  const validateEmployeeTicketIssueType = (issue_type: string) => {
    if (!issue_type) return 'Issue type is required.';
    if (issue_type.length < 2) return 'Issue type must be at least 2 characters.';
    if (issue_type.length > 50) return 'Issue type must be less than 50 characters.';
    return '';
  };
  
  const validateEmployeeTicketIssue = (issue: string) => {
    if (!issue) return 'Issue is required.';
    if (issue.length < 5) return 'Issue must be at least 5 characters.';
    if (issue.length > 100) return 'Issue must be less than 100 characters.';
    return '';
  };
  
  const validateEmployeeTicketDevice = (device: string) => {
    if (!device) return 'Device is required.';
    if (device.length < 2) return 'Device must be at least 2 characters.';
    if (device.length > 50) return 'Device must be less than 50 characters.';
    return '';
  };
  
  const validateEmployeeTicketSeverity = (severity: string) => {
    if (!severity) return 'Please select a severity level.';
    return '';
  };
  
  const validateEmployeeTicketMessage = (message: string) => {
    if (!message) return 'Message is required.';
    if (message.trim().length < 2) return 'Message must be at least 2 characters.';
    if (message.length > 500) return 'Message must be less than 500 characters.';
    return '';
  };

  // Field-level validation functions for customer helpdesk ticket form
  const validateCustomerTicketName = (name: string) => {
    if (!name) return 'Name is required.';
    if (!/^[A-Za-z\s]+$/.test(name)) return 'Only alphabets are allowed.';
    if (name.length < 2) return 'Name must be at least 2 characters.';
    if (name.length > 50) return 'Name must be less than 50 characters.';
    return '';
  };
  
  const validateCustomerTicketEmail = (email: string) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!email) return 'Email is required.';
    if (!emailRegex.test(email)) return 'Please enter a valid email address.';
    if (email.length > 100) return 'Email must be less than 100 characters.';
    return '';
  };
  
  const validateCustomerTicketPhone = (phone: string) => {
    if (!phone) return 'Phone number is required.';
    const phoneRegex = /^\d{7,15}$/;
    if (!phoneRegex.test(phone)) return 'Please enter a valid phone number.';
    return '';
  };
  
  const validateCustomerTicketIssueType = (issue_type: string) => {
    if (!issue_type) return 'Issue type is required.';
    if (issue_type.length < 2) return 'Issue type must be at least 2 characters.';
    if (issue_type.length > 50) return 'Issue type must be less than 50 characters.';
    return '';
  };
  
  const validateCustomerTicketIssue = (issue: string) => {
    if (!issue) return 'Issue is required.';
    if (issue.length < 5) return 'Issue must be at least 5 characters.';
    if (issue.length > 100) return 'Issue must be less than 100 characters.';
    return '';
  };
  
  const validateCustomerTicketDevice = (device: string) => {
    if (!device) return 'Device is required.';
    if (device.length < 2) return 'Device must be at least 2 characters.';
    if (device.length > 50) return 'Device must be less than 50 characters.';
    return '';
  };
  
  const validateCustomerTicketMessage = (message: string) => {
    if (!message) return 'Message is required.';
    if (message.trim().length < 2) return 'Message must be at least 2 characters.';
    if (message.length > 500) return 'Message must be less than 500 characters.';
    return '';
  };

  // Add a computed variable to check if the bot is typing (only during typing animation, not during processing)
  const isBotTyping = messages.some(m => m.type === 'assistant' && m.isTyping);
  
  // Add a computed variable to check if the bot is processing (loading data)
  const isBotProcessing = isLoading;

  // Focus input field when bot finishes typing
  useEffect(() => {
    if (!isBotTyping && !isBotProcessing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isBotTyping, isBotProcessing]);

  // Auto-scroll to the latest message whenever messages update or bot is typing/processing
  useEffect(() => {
    if (messagesEndRef.current) {
      try {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      } catch {
        // Fallback without smooth behavior if not supported
        messagesEndRef.current.scrollIntoView();
      }
    }
  }, [messages, isBotTyping, isBotProcessing]);

  // Add a computed variable to check if there is an active chat session
  const canSaveChat = messages.some(m => m.type === 'user') && messages.some(m => m.type === 'assistant');

  useEffect(() => {
    let didRun = false;
    const loadChatHistory = async () => {
      // Only try to load if authenticated and not just after login
      if (isAuthenticated && !didRun) {
        didRun = true;
        
        // First, check if we have localStorage messages - prioritize these
        const savedMessages = localStorage.getItem('chatbot_messages');
        if (savedMessages) {
          try {
            const parsedMessages = JSON.parse(savedMessages);
            // Only use localStorage messages if they're not just the default welcome message
            if (parsedMessages.length > 1 || (parsedMessages.length === 1 && parsedMessages[0].type === 'user')) {
              setMessages(parsedMessages);
              return; // Don't load from backend if we have localStorage messages
            }
          } catch {
            // If parsing fails, continue to backend loading
          }
        }
        
        // If no localStorage messages, try to load from backend
        const userEmail = localStorage.getItem('userEmail') || '';
        const domain = getDomain(userEmail);
        try {
          const sessionsRes = await listSessions(domain);
          const sessions = sessionsRes.sessions || [];
          let lastSession = null;
          if (sessions.length > 0) {
            lastSession = sessions.sort(function(a: SessionItem, b: SessionItem) { return new Date(b.created_at).getTime() - new Date(a.created_at).getTime(); })[0];
          }
          if (lastSession && lastSession.title) {
            const convoRes = await getConversation(domain, lastSession.title);
            const history = convoRes.conversation?.history || [];
            if (history.length > 0) {
              const mapped = history.map((item: HistoryItem, idx: number) => [
                { id: idx * 2 + 1, type: 'user', content: item.query, isTyping: false },
                { id: idx * 2 + 2, type: 'assistant', content: item.response, isTyping: false }
              ]).flat();
              setMessages(mapped);
              return;
            }
          }
          // If no backend history, keep current messages (don't reset to default)
        } catch {
          // If backend loading fails, keep current messages (don't reset to default)
        }
      }
    };
    
    // Only run loadChatHistory if we don't already have localStorage messages
    const savedMessages = localStorage.getItem('chatbot_messages');
    if (!savedMessages) {
      loadChatHistory();
    }
    // eslint-disable-next-line
  }, []); // Only run on initial mount, not on isAuthenticated change

  // Persist messages to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('chatbot_messages', JSON.stringify(messages));
    }
  }, [messages]);

  // Persist session ID to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && sessionId) {
      localStorage.setItem('chatbot_session_id', sessionId);
    }
  }, [sessionId]);

  // Persist greeting count to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('adminGreetingCount', greetingCount.toString());
    }
  }, [greetingCount]);

  // Handle authentication state changes to preserve messages
  useEffect(() => {
    if (isAuthenticated) {
      // When user becomes authenticated, preserve existing messages
      const savedMessages = localStorage.getItem('chatbot_messages');
      if (savedMessages) {
        try {
          const parsedMessages = JSON.parse(savedMessages);
          // Only restore if we have meaningful messages
          if (parsedMessages.length > 1 || (parsedMessages.length === 1 && parsedMessages[0].type === 'user')) {
            setMessages(parsedMessages);
          }
        } catch {
          // If parsing fails, keep current messages
        }
      }
    }
  }, [isAuthenticated]);

  // Listen for logout event to clear chat state
  useEffect(() => {
    const handleLogout = () => {
      // Reset chat state to default
      setMessages([]); // Clear messages to show welcome screen
      setHasUserStartedChatting(false); // Reset chat state
      setInput('');
      setSelectedAvatar('/images/user/Bot1.png');
      setBotName('AI Agent');
      setGreetingCount(0);
      setSessionId('');
    };

    window.addEventListener('userLoggedOut', handleLogout);
    return () => window.removeEventListener('userLoggedOut', handleLogout);
  }, []);

  // Handler for job application form submission
  const handleJobFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setJobFormStatus(null);
    
    // Validate all fields before submit
    const errors = {
      name: validateJobName(jobFormData.name),
      email: validateJobEmail(jobFormData.email),
      mobile: validateJobMobile(jobFormData.mobile),
      jobCategory: validateJobCategory(jobFormData.jobCategory),
      experience: validateJobExperience(jobFormData.experience)
    };
    setJobFormErrors(errors);
    
    if (Object.values(errors).some(Boolean)) {
      return;
    }
    
    if (!jobResumeFile) {
      setJobFormStatus('Please upload a resume.');
      return;
    }
    
    setJobSubmitting(true);
    try {
      const form = new FormData();
      form.append('name', jobFormData.name);
      form.append('email', jobFormData.email);
      form.append('mobile', jobFormData.mobile);
      form.append('job_category', jobFormData.jobCategory);
      form.append('experience', jobFormData.experience);
      form.append('source', 'Website');
      form.append('file', jobResumeFile);
      
              const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/jobs/upload`, {
        method: 'POST',
        body: form
      });
      
      if (response.ok) {
        setJobFormStatus('Application submitted successfully!');
        setJobFormData({ name: '', email: '', mobile: '', jobCategory: '', experience: '' });
        setJobResumeFile(null);
        setMessages((prev: Message[]) => prev.filter(m => m.type !== 'job-application-form'));
        setShowJobThankYou(true);
        setTimeout(() => setShowJobThankYou(false), 5000); // Hide after 5 seconds
        // Show assistant message with typing animation
        const assistantMessageId = Date.now() + 1;
        setMessages((prev: Message[]) => [
          ...prev,
          {
            id: assistantMessageId,
            type: 'assistant' as const,
            content: '',
            isTyping: true,
          } as Message,
        ]);
        const typingText = 'Thank you! Your job application has been submitted successfully. We will review your application and get back to you soon.';
        let currentIndex = 0;
        const typingInterval = setInterval(() => {
          setMessages((prev: Message[]) =>
            prev.map((msg: Message) =>
              msg.id === assistantMessageId
                ? {
                    ...msg,
                    content: typingText.slice(0, currentIndex),
                    isTyping: currentIndex < typingText.length,
                  }
                : msg
            )
          );
          currentIndex++;
          if (currentIndex > typingText.length) {
            clearInterval(typingInterval);
          }
        }, 10);
      } else {
        const error = await response.json();
        setJobFormStatus(error?.error || 'Submission failed. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting job application:', error);
      setJobFormStatus('Submission failed. Server error.');
    } finally {
      setJobSubmitting(false);
    }
  };

  // Handler for employee helpdesk ticket form submission
  const handleEmployeeTicketSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEmployeeTicketStatus(null);
    
    // Validate all fields before submit
    const errors = {
      name: validateEmployeeTicketName(employeeTicketData.name),
      email: validateEmployeeTicketEmail(employeeTicketData.email),
      issue_type: validateEmployeeTicketIssueType(employeeTicketData.issue_type),
      issue: validateEmployeeTicketIssue(employeeTicketData.issue),
      device: validateEmployeeTicketDevice(employeeTicketData.device),
      severity: validateEmployeeTicketSeverity(employeeTicketData.severity),
      message: validateEmployeeTicketMessage(employeeTicketData.message)
    };
    setEmployeeTicketErrors(errors);
    
    if (Object.values(errors).some(Boolean)) {
      return;
    }
    
    setEmployeeTicketSubmitting(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/helpdesk/employee/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'accept': 'application/json'
        },
        body: JSON.stringify({
          name: employeeTicketData.name,
          email: employeeTicketData.email,
          issue_type: employeeTicketData.issue_type,
          issue: employeeTicketData.issue,
          device: employeeTicketData.device,
          severity: employeeTicketData.severity,
          message: employeeTicketData.message
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        setEmployeeTicketStatus(`Ticket submitted successfully! Ticket ID: ${result.ticket_id}`);
        setEmployeeTicketData({ name: '', email: '', issue_type: '', issue: '', device: '', severity: '', message: '' });
        setMessages((prev: Message[]) => prev.filter(m => m.type !== 'employee-form'));
        // Show assistant message with typing animation
        const assistantMessageId = Date.now() + 1;
        setMessages((prev: Message[]) => [
          ...prev,
          {
            id: assistantMessageId,
            type: 'assistant' as const,
            content: '',
            isTyping: true,
          } as Message,
        ]);
        const typingText = `Thank you! Your employee helpdesk ticket has been submitted successfully. Ticket ID: ${result.ticket_id}. Our IT team will review your request and get back to you soon.`;
        let currentIndex = 0;
        const typingInterval = setInterval(() => {
          setMessages((prev: Message[]) =>
            prev.map((msg: Message) =>
              msg.id === assistantMessageId
                ? {
                    ...msg,
                    content: typingText.slice(0, currentIndex),
                    isTyping: currentIndex < typingText.length,
                  }
                : msg
            )
          );
          currentIndex++;
          if (currentIndex > typingText.length) {
            clearInterval(typingInterval);
          }
        }, 10);
      } else {
        const error = await response.json();
        setEmployeeTicketStatus(error?.error || 'Submission failed. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting employee ticket:', error);
      setEmployeeTicketStatus('Submission failed. Server error.');
    } finally {
      setEmployeeTicketSubmitting(false);
    }
  };

  // Handler for customer helpdesk ticket form submission
  const handleCustomerTicketSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCustomerTicketStatus(null);
    
    // Validate all fields before submit
    const errors = {
      name: validateCustomerTicketName(customerTicketData.name),
      email: validateCustomerTicketEmail(customerTicketData.email),
      phone: validateCustomerTicketPhone(customerTicketData.phone),
      issue_type: validateCustomerTicketIssueType(customerTicketData.issue_type),
      issue: validateCustomerTicketIssue(customerTicketData.issue),
      device: validateCustomerTicketDevice(customerTicketData.device),
      message: validateCustomerTicketMessage(customerTicketData.message)
    };
    setCustomerTicketErrors(errors);
    
    if (Object.values(errors).some(Boolean)) {
      return;
    }
    
    setCustomerTicketSubmitting(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/helpdesk/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'accept': 'application/json'
        },
        body: JSON.stringify({
          name: customerTicketData.name,
          email: customerTicketData.email,
          phone: customerTicketData.phone,
          issue_type: customerTicketData.issue_type,
          issue: customerTicketData.issue,
          device: customerTicketData.device,
          message: customerTicketData.message
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        setCustomerTicketStatus(`Ticket submitted successfully! Ticket ID: ${result.ticket_id}`);
        setCustomerTicketData({ name: '', email: '', phone: '', issue_type: '', issue: '', device: '', message: '' });
        setMessages((prev: Message[]) => prev.filter(m => m.type !== 'customer-form'));
        // Show assistant message with typing animation
        const assistantMessageId = Date.now() + 1;
        setMessages((prev: Message[]) => [
          ...prev,
          {
            id: assistantMessageId,
            type: 'assistant' as const,
            content: '',
            isTyping: true,
          } as Message,
        ]);
        const typingText = `Thank you! Your customer helpdesk ticket has been submitted successfully. Ticket ID: ${result.ticket_id}. Our support team will review your request and get back to you soon.`;
        let currentIndex = 0;
        const typingInterval = setInterval(() => {
          setMessages((prev: Message[]) =>
            prev.map((msg: Message) =>
              msg.id === assistantMessageId
                ? {
                    ...msg,
                    content: typingText.slice(0, currentIndex),
                    isTyping: currentIndex < typingText.length,
                  }
                : msg
            )
          );
          currentIndex++;
          if (currentIndex > typingText.length) {
            clearInterval(typingInterval);
          }
        }, 10);
      } else {
        const error = await response.json();
        setCustomerTicketStatus(error?.error || 'Submission failed. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting customer ticket:', error);
      setCustomerTicketStatus('Submission failed. Server error.');
    } finally {
      setCustomerTicketSubmitting(false);
    }
  };

  return (
    <div>
      {/* Custom styles for message bubble text wrapping */}
      <style dangerouslySetInnerHTML={{ __html: messageBubbleStyles }} />
      
      {/* Success Alert */}
      {saveAlert?.type === 'success' && (
        <div className="fixed top-4 right-4 z-50 p-4 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg shadow-lg">
          {saveAlert.message}
        </div>
      )}

      {/* Full-Screen Chat Container - ChatGPT Style */}
      <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
        {/* Main Chat Panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Sticky Header Bar - ChatGPT Style */}
          <div className="sticky top-0 z-20 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center space-x-4">
              {/* AI Agent Avatar with Online Status */}
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-md">
                  {isClient && (
                    <Image
                      src={selectedAvatar}
                      alt="AI Avatar"
                      width={24}
                      height={24}
                      className="rounded-full"
                    />
                  )}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-blue-400 border-2 border-white dark:border-gray-800 rounded-full"></div>
              </div>
              
              {/* Agent Name and Status */}
              <div className="flex flex-col">
                <h1 className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                  {isClient && currentUser ? `Hi, ${(currentUser as UserInfo).full_name || (currentUser as UserInfo).username || (currentUser as UserInfo).email?.split('@')[0] || 'User'}! 👋` : botName}
                </h1>
                <div className="flex items-center space-x-2">
                  <span className="inline-block w-2 h-2 bg-blue-400 rounded-full"></span>
                  <p className="text-sm text-blue-600 dark:text-blue-400">Online • Ready to help</p>
                </div>
              </div>
            </div>
            
            {/* Header Action Buttons */}
            <div className="flex items-center space-x-2">
              <button
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200"
                onClick={() => {
                  // Hide welcome message FIRST when contact form is opened
                  setHasUserStartedChatting(true);
                  console.log('Contact button clicked - hiding welcome message');
                  
                  setMessages((prev: Message[]) => {
                    const hasForm = prev.some(m => m.type === 'support-form');
                    if (hasForm) {
                      return prev.filter(m => m.type !== 'support-form');
                    } else {
                      return [
                        ...prev,
                        {
                          id: Date.now(),
                          type: 'support-form',
                          content: '',
                          isTyping: false,
                        },
                      ];
                    }
                  });
                }}
                aria-label="Customer Support"
                title="Customer Support"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3"/><path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3"/>
                </svg>
              </button>
              
              <button
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200"
                aria-label="Job Applications"
                onClick={() => {
                  // Hide welcome message FIRST when job form is opened
                  setHasUserStartedChatting(true);
                  
                  setMessages((prev: Message[]) => {
                    const hasJobForm = prev.some(m => m.type === 'job-application-form');
                    if (hasJobForm) {
                      return prev.filter(m => m.type !== 'job-application-form');
                    } else {
                      return [
                        ...prev,
                        {
                          id: Date.now(),
                          type: 'job-application-form',
                          content: '',
                          isTyping: false,
                        },
                      ];
                    }
                  });
                }}
                title="Apply for Jobs"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 3v4M8 3v4M2 13h20"/>
                </svg>
              </button>
              
              {isAuthenticated && (loginType === 'customer' || loginType === 'employee') && (
                <button
                  className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200"
                  aria-label="Helpdesk Ticket"
                  onClick={() => {
                    // Hide welcome message FIRST when helpdesk form is opened
                    setHasUserStartedChatting(true);
                    
                    setMessages((prev: Message[]) => {
                      const hasTicketForm = prev.some(m => m.type === 'employee-form' || m.type === 'customer-form');
                      if (hasTicketForm) {
                        return prev.filter(m => m.type !== 'employee-form' && m.type !== 'customer-form');
                      } else {
                        return [
                          ...prev,
                          {
                            id: Date.now(),
                            type: loginType === 'employee' ? 'employee-form' : 'customer-form',
                            content: '',
                            isTyping: false,
                          },
                        ];
                      }
                    });
                  }}
                  title="Create Ticket"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14,2 14,8 20,8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10,9 9,9 8,9"/>
                  </svg>
                </button>
              )}
              
              {!isAuthenticated && (
                <button
                  className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200"
                  onClick={() => {
                    // Hide welcome message FIRST when login form is opened
                    setHasUserStartedChatting(true);
                    setShowLoginForm(prev => !prev);
                  }}
                  aria-label="Login"
                  title="Login"
                >
                  <LogIn className="w-5 h-5" />
                </button>
              )}
              
              {isAuthenticated && (
                <button
                  className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200"
                  onClick={handleLogout}
                  aria-label="Logout"
                  title="Logout"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16,17 21,12 16,7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                </button>
              )}
              
              <button
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200"
                onClick={() => {
                  const hasChat = messages.some(m => m.type === 'user' || m.type === 'assistant') && messages.length > 1;
                  if (!hasChat) {
                    setAlertMsg('Hey, No chat conversation started with AI Agent.');
                    setAlertOpen(true);
                    return;
                  }
                  setIsSavePopupOpen(true);
                }}
                aria-label="Save Session"
                title="Save Chat"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                  <polyline points="17 21 17 13 7 13 7 21"></polyline>
                  <polyline points="7 3 7 8 15 8"></polyline>
                </svg>
              </button>
            </div>
          </div>
              
          {/* Chat Messages Area - Scrollable */}
          <div 
            className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 pb-10 sm:pb-16 space-y-8 sm:space-y-7 bg-gray-50 dark:bg-gray-900"
            role="log"
            aria-live="polite"
            aria-label="Chat messages"
            style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}
          >
                  {/* Welcome Message - Show when user hasn't started chatting */}
                  {!hasUserStartedChatting && (
                    <div className="flex items-center justify-center min-h-[60vh]">
                      <div className="text-center max-w-2xl mx-auto px-6">
                        {/* Welcome Text */}
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-blue-600 dark:text-blue-400 mb-4">
                          Hello! I&apos;m AI Agent
                        </h1>
                        <p className="text-lg sm:text-xl text-blue-600 dark:text-blue-400 mb-8 leading-relaxed">
                          How can I help you today? I&apos;m here to assist with any questions you might have.
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* Only show messages when user has started chatting */}
                  {hasUserStartedChatting && messages.map((message) => (
                    message.type === 'support-form' || message.type === 'lead-form' ? (
                      <div key={message.id} className="flex justify-center px-2 sm:px-0">
                        <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 flex flex-col gap-4 sm:gap-5 md:gap-6 shadow-2xl w-full max-w-xs sm:max-w-sm md:max-w-md mt-2">
                          <div className="text-center mb-4 sm:mb-6">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gradient-to-r from-blue-600 to-blue-800 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                              <svg className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <h2 className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">Contact Us</h2>
                            <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm mt-1 sm:mt-2">We&apos;d love to hear from you</p>
                          </div>
                          {showThankYou ? (
                            <div className="text-center py-8 text-base sm:text-lg text-blue-600 font-semibold">
                              <div className="typing-animation">
                                Thank you! Our team will contact you soon.
                              </div>
                            </div>
                          ) : (
                            <form onSubmit={handleSupportFormSubmit} className="flex flex-col gap-5 w-full">
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
                                <input
                                  type="text"
                                  placeholder="Enter your full name"
                                  value={formData.name}
                                  onChange={e => {
                                    setFormData({ ...formData, name: e.target.value });
                                    setFormErrors(errors => ({ ...errors, name: '' }));
                                  }}
                                  onBlur={e => setFormErrors(errors => ({ ...errors, name: validateSupportName(e.target.value) }))}
                                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm placeholder-gray-500 dark:placeholder-gray-400"
                                  required
                                />
                              </div>
                              {formErrors.name && <div className="text-red-500 text-sm flex items-center gap-1">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                {formErrors.name}
                              </div>}
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
                                <input
                                  type="email"
                                  placeholder="Enter your email address"
                                  value={formData.email}
                                  onChange={e => {
                                    setFormData({ ...formData, email: e.target.value });
                                    setFormErrors(errors => ({ ...errors, email: '' }));
                                  }}
                                  onBlur={e => setFormErrors(errors => ({ ...errors, email: validateSupportEmail(e.target.value) }))}
                                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm placeholder-gray-500 dark:placeholder-gray-400"
                                  required
                                />
                              </div>
                              {formErrors.email && <div className="text-red-500 text-sm flex items-center gap-1">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                {formErrors.email}
                              </div>}
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number</label>
                                <div className="flex gap-3">
                                  <div className="w-32">
                                    <TypedSelect
                                      options={countryCodeOptions}
                                      value={countryCodeOptions.find(opt => opt.value === formData.countryCode)}
                                      onChange={(option: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
                                        setFormData({ ...formData, countryCode: option ? option.value : '' });
                                        setFormErrors(errors => ({ ...errors, countryCode: '' }));
                                      }}
                                      onBlur={() => setFormErrors(errors => ({ ...errors, countryCode: validateSupportCountryCode(formData.countryCode) }))}
                                      placeholder="Code"
                                      isSearchable
                                      menuPlacement="auto"
                                      styles={{ 
                                        menu: (base: Record<string, unknown>) => ({ ...base, zIndex: 9999 }),
                                        control: (base: Record<string, unknown>) => ({ 
                                          ...base, 
                                          backgroundColor: '#f9fafb',
                                          borderColor: '#d1d5db',
                                          borderRadius: '12px',
                                          minHeight: '48px',
                                          '&:hover': { borderColor: '#9ca3af' }
                                        })
                                      }}
                                    />
                                  </div>
                                  <input
                                    type="text"
                                    placeholder="Enter phone number"
                                    value={formData.phone}
                                    onChange={e => {
                                      setFormData({ ...formData, phone: e.target.value });
                                      setFormErrors(errors => ({ ...errors, phone: '' }));
                                    }}
                                    onBlur={e => setFormErrors(errors => ({ ...errors, phone: validateSupportPhone(e.target.value, formData.countryCode) }))}
                                    className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm placeholder-gray-500 dark:placeholder-gray-400"
                                    required
                                  />
                                </div>
                              </div>
                              {formErrors.phone && <div className="text-red-500 text-sm flex items-center gap-1">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                {formErrors.phone}
                              </div>}
                              
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Area of Interest</label>
                                <select
                                  value={formData.interest}
                                  onChange={e => {
                                    setFormData({ ...formData, interest: e.target.value });
                                    setFormErrors(errors => ({ ...errors, interest: '' }));
                                  }}
                                  onBlur={e => setFormErrors(errors => ({ ...errors, interest: validateSupportInterest(e.target.value) }))}
                                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm"
                                  required
                                >
                                  <option value="" disabled>Select your area of interest</option>
                                  {interestOptions.map((opt) => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              </div>
                              {formErrors.interest && <div className="text-red-500 text-sm flex items-center gap-1">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                {formErrors.interest}
                              </div>}
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">How did you hear about us?</label>
                                <select
                                  value={formData.source}
                                  onChange={e => {
                                    setFormData({ ...formData, source: e.target.value });
                                    setFormErrors(errors => ({ ...errors, source: '' }));
                                  }}
                                  onBlur={e => setFormErrors(errors => ({ ...errors, source: validateSupportSource(e.target.value) }))}
                                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm"
                                  required
                                >
                                  <option value="" disabled>Select how you found us</option>
                                  {sourceOptions.map((opt) => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              </div>
                              {formErrors.source && <div className="text-red-500 text-sm flex items-center gap-1">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                {formErrors.source}
                              </div>}
                              
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Message</label>
                                <textarea
                                  placeholder="Tell us how we can help you..."
                                  value={formData.message || ''}
                                  onChange={e => {
                                    setFormData({ ...formData, message: e.target.value });
                                    setFormErrors(errors => ({ ...errors, message: '' }));
                                  }}
                                  onBlur={e => setFormErrors(errors => ({ ...errors, message: validateSupportMessage(e.target.value) }))}
                                  maxLength={500}
                                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm resize-none placeholder-gray-500 dark:placeholder-gray-400"
                                  rows={4}
                                />
                                <div className="flex justify-between items-center text-xs text-gray-500">
                                  <span>{formErrors.message && <span className="text-red-500 flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    {formErrors.message}
                                  </span>}</span>
                                  <span className="text-gray-400">{formData.message ? formData.message.length : 0}/500</span>
                                </div>
                              </div>
                              
                              <button
                                type="submit"
                                disabled={loading || !isFormValid()}
                                className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-900 transition-all duration-200 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:transform-none"
                              >
                                {loading ? (
                                  <>
                                    <span className="mr-2 inline-block align-middle">
                                      <svg width="18" height="18" viewBox="0 0 38 38" stroke="#fff">
                                        <g fill="none" fillRule="evenodd">
                                          <g transform="translate(1 1)" strokeWidth="3">
                                            <circle strokeOpacity=".3" cx="18" cy="18" r="18"/>
                                            <path d="M36 18c0-9.94-8.06-18-18-18">
                                              <animateTransform
                                                attributeName="transform"
                                                type="rotate"
                                                from="0 18 18"
                                                to="360 18 18"
                                                dur="1s"
                                                repeatCount="indefinite"/>
                                            </path>
                                          </g>
                                        </g>
                                      </svg>
                                    </span>
                                    Submitting...
                                  </>
                                ) : 'Submit'}
                              </button>
                              {formStatus && (
                                <div className="mt-2 text-center text-sm" style={{ color: formStatus.includes('success') ? 'green' : 'red' }}>{formStatus}</div>
                              )}
                            </form>
                          )}
                        </div>
                      </div>
                    ) : message.type === 'job-application-form' ? (
                      <div key={message.id} className="flex justify-center">
                        <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-3xl p-8 flex flex-col gap-6 shadow-2xl w-full max-w-md mt-2">
                          <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-blue-800 rounded-full flex items-center justify-center mx-auto mb-4">
                              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2V6" />
                              </svg>
                            </div>
                            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">{jobFormHeading}</h2>
                            <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">Join our amazing team</p>
                          </div>
                          {showJobThankYou ? (
                            <div className="text-center py-8 text-lg text-blue-600 font-semibold">
                              Thank you! Your job application has been submitted successfully.
                            </div>
                          ) : (
                            <form onSubmit={handleJobFormSubmit} className="flex flex-col gap-5 w-full">
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
                                <input
                                  type="text"
                                  placeholder="Enter your full name"
                                  value={jobFormData.name}
                                  onChange={e => {
                                    setJobFormData({ ...jobFormData, name: e.target.value });
                                    setJobFormErrors(errors => ({ ...errors, name: '' }));
                                  }}
                                  onBlur={e => setJobFormErrors(errors => ({ ...errors, name: validateJobName(e.target.value) }))}
                                  className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 text-sm placeholder-gray-500 dark:placeholder-gray-400 ${jobFormErrors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                                  required
                                />
                              </div>
                              {jobFormErrors.name && <div className="text-red-500 text-sm flex items-center gap-1">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                {jobFormErrors.name}
                              </div>}
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
                                <input
                                  type="email"
                                  placeholder="Enter your email address"
                                  value={jobFormData.email}
                                  onChange={e => {
                                    setJobFormData({ ...jobFormData, email: e.target.value });
                                    setJobFormErrors(errors => ({ ...errors, email: '' }));
                                  }}
                                  onBlur={e => setJobFormErrors(errors => ({ ...errors, email: validateJobEmail(e.target.value) }))}
                                  className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 text-sm placeholder-gray-500 dark:placeholder-gray-400 ${jobFormErrors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                                  required
                                />
                              </div>
                              {jobFormErrors.email && <div className="text-red-500 text-sm flex items-center gap-1">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                {jobFormErrors.email}
                              </div>}
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Mobile Number</label>
                                <input
                                  type="text"
                                  placeholder="Enter your mobile number"
                                  value={jobFormData.mobile}
                                  onChange={e => {
                                    setJobFormData({ ...jobFormData, mobile: e.target.value });
                                    setJobFormErrors(errors => ({ ...errors, mobile: '' }));
                                  }}
                                  onBlur={e => setJobFormErrors(errors => ({ ...errors, mobile: validateJobMobile(e.target.value) }))}
                                  className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 text-sm placeholder-gray-500 dark:placeholder-gray-400 ${jobFormErrors.mobile ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                                  required
                                />
                              </div>
                              {jobFormErrors.mobile && <div className="text-red-500 text-sm flex items-center gap-1">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                {jobFormErrors.mobile}
                              </div>}
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Job Category</label>
                                <select
                                  value={jobFormData.jobCategory}
                                  onChange={e => {
                                    setJobFormData({ ...jobFormData, jobCategory: e.target.value });
                                    setJobFormErrors(errors => ({ ...errors, jobCategory: '' }));
                                  }}
                                  onBlur={e => setJobFormErrors(errors => ({ ...errors, jobCategory: validateJobCategory(e.target.value) }))}
                                  className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 text-sm ${jobFormErrors.jobCategory ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                                  required
                                >
                                  <option value="" disabled>Select job category</option>
                                  {jobCategoriesOptions.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                  ))}
                                </select>
                              </div>
                              {jobFormErrors.jobCategory && <div className="text-red-500 text-sm flex items-center gap-1">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                {jobFormErrors.jobCategory}
                              </div>}
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Experience Level</label>
                                <select
                                  value={jobFormData.experience}
                                  onChange={e => {
                                    setJobFormData({ ...jobFormData, experience: e.target.value });
                                    setJobFormErrors(errors => ({ ...errors, experience: '' }));
                                  }}
                                  onBlur={e => setJobFormErrors(errors => ({ ...errors, experience: validateJobExperience(e.target.value) }))}
                                  className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 text-sm ${jobFormErrors.experience ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                                  required
                                >
                                  <option value="" disabled>Select experience level</option>
                                  {experienceOptions.map(exp => (
                                    <option key={exp} value={exp}>{exp}</option>
                                  ))}
                                </select>
                              </div>
                              {jobFormErrors.experience && <div className="text-red-500 text-sm flex items-center gap-1">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                {jobFormErrors.experience}
                              </div>}
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Upload Resume</label>
                                <div className="relative">
                                  <input
                                    type="file"
                                    accept=".pdf,.doc,.docx"
                                    onChange={(e) => {
                                      if (e.target.files && e.target.files[0]) {
                                        setJobResumeFile(e.target.files[0]);
                                      }
                                    }}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                    required
                                  />
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">Accepted formats: PDF, DOC, DOCX (Max 10MB)</div>
                              </div>
                              <button
                                type="submit"
                                disabled={jobSubmitting || !isJobFormValid()}
                                className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-900 transition-all duration-200 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:transform-none"
                              >
                                {jobSubmitting ? (
                                  <>
                                    <span className="mr-2 inline-block align-middle">
                                      <svg width="18" height="18" viewBox="0 0 38 38" stroke="#fff">
                                        <g fill="none" fillRule="evenodd">
                                          <g transform="translate(1 1)" strokeWidth="3">
                                            <circle strokeOpacity=".3" cx="18" cy="18" r="18"/>
                                            <path d="M36 18c0-9.94-8.06-18-18-18">
                                              <animateTransform
                                                attributeName="transform"
                                                type="rotate"
                                                from="0 18 18"
                                                to="360 18 18"
                                                dur="1s"
                                                repeatCount="indefinite"/>
                                            </path>
                                          </g>
                                        </g>
                                      </svg>
                                    </span>
                                    Submitting...
                                  </>
                                ) : 'Submit Application'}
                            </button>
                              {jobFormStatus && (
                                <div className="mt-2 text-center text-sm" style={{ color: jobFormStatus.includes('success') ? 'green' : 'red' }}>{jobFormStatus}</div>
                              )}
                          </form>
                          )}
                        </div>
                      </div>
                    ) : message.type === 'employee-form' ? (
                      <div key={message.id} className="flex justify-center">
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 rounded-xl p-6 flex flex-col gap-4 shadow w-full max-w-sm mt-2">
                          <div className="flex items-center justify-center mb-4">
                            <h2 className="text-lg sm:text-xl font-bold text-blue-700">Employee Helpdesk Ticket</h2>
                          </div>
                                                     <form onSubmit={handleEmployeeTicketSubmit} className="flex flex-col gap-4 w-full">
                             <input
                               type="text"
                               placeholder="Employee Name"
                               value={employeeTicketData.name}
                               onChange={e => {
                                 setEmployeeTicketData({ ...employeeTicketData, name: e.target.value });
                                 setEmployeeTicketErrors(errors => ({ ...errors, name: '' }));
                               }}
                               onBlur={e => setEmployeeTicketErrors(errors => ({ ...errors, name: validateEmployeeTicketName(e.target.value) }))}
                               className={`px-3 py-2 border rounded focus:outline-none focus:ring focus:border-blue-400 ${employeeTicketErrors.name ? 'border-red-500' : ''} bg-white dark:bg-gray-800 dark:text-white`}
                               required
                             />
                             {employeeTicketErrors.name && <div className="text-red-600 text-xs sm:text-sm">{employeeTicketErrors.name}</div>}
                             <input
                               type="email"
                               placeholder="Employee Email"
                               value={employeeTicketData.email}
                               onChange={e => {
                                 setEmployeeTicketData({ ...employeeTicketData, email: e.target.value });
                                 setEmployeeTicketErrors(errors => ({ ...errors, email: '' }));
                               }}
                               onBlur={e => setEmployeeTicketErrors(errors => ({ ...errors, email: validateEmployeeTicketEmail(e.target.value) }))}
                               className={`px-3 py-2 border rounded focus:outline-none focus:ring focus:border-blue-400 ${employeeTicketErrors.email ? 'border-red-500' : ''} bg-white dark:bg-gray-800 dark:text-white`}
                               required
                             />
                             {employeeTicketErrors.email && <div className="text-red-600 text-xs sm:text-sm">{employeeTicketErrors.email}</div>}
                             <input
                               type="text"
                               placeholder="Issue Type"
                               value={employeeTicketData.issue_type}
                               onChange={e => {
                                 setEmployeeTicketData({ ...employeeTicketData, issue_type: e.target.value });
                                 setEmployeeTicketErrors(errors => ({ ...errors, issue_type: '' }));
                               }}
                               onBlur={e => setEmployeeTicketErrors(errors => ({ ...errors, issue_type: validateEmployeeTicketIssueType(e.target.value) }))}
                               className={`px-3 py-2 border rounded focus:outline-none focus:ring focus:border-blue-400 ${employeeTicketErrors.issue_type ? 'border-red-500' : ''} bg-white dark:bg-gray-800 dark:text-white`}
                               required
                             />
                             {employeeTicketErrors.issue_type && <div className="text-red-600 text-xs sm:text-sm">{employeeTicketErrors.issue_type}</div>}
                             <input
                               type="text"
                               placeholder="Issue"
                               value={employeeTicketData.issue}
                               onChange={e => {
                                 setEmployeeTicketData({ ...employeeTicketData, issue: e.target.value });
                                 setEmployeeTicketErrors(errors => ({ ...errors, issue: '' }));
                               }}
                               onBlur={e => setEmployeeTicketErrors(errors => ({ ...errors, issue: validateEmployeeTicketIssue(e.target.value) }))}
                               className={`px-3 py-2 border rounded focus:outline-none focus:ring focus:border-blue-400 ${employeeTicketErrors.issue ? 'border-red-500' : ''} bg-white dark:bg-gray-800 dark:text-white`}
                               required
                             />
                             {employeeTicketErrors.issue && <div className="text-red-600 text-xs sm:text-sm">{employeeTicketErrors.issue}</div>}
                             <input
                               type="text"
                               placeholder="Device"
                               value={employeeTicketData.device}
                               onChange={e => {
                                 setEmployeeTicketData({ ...employeeTicketData, device: e.target.value });
                                 setEmployeeTicketErrors(errors => ({ ...errors, device: '' }));
                               }}
                               onBlur={e => setEmployeeTicketErrors(errors => ({ ...errors, device: validateEmployeeTicketDevice(e.target.value) }))}
                               className={`px-3 py-2 border rounded focus:outline-none focus:ring focus:border-blue-400 ${employeeTicketErrors.device ? 'border-red-500' : ''} bg-white dark:bg-gray-800 dark:text-white`}
                               required
                             />
                             {employeeTicketErrors.device && <div className="text-red-600 text-xs sm:text-sm">{employeeTicketErrors.device}</div>}
                             <select
                               value={employeeTicketData.severity}
                               onChange={e => {
                                 setEmployeeTicketData({ ...employeeTicketData, severity: e.target.value });
                                 setEmployeeTicketErrors(errors => ({ ...errors, severity: '' }));
                               }}
                               onBlur={e => setEmployeeTicketErrors(errors => ({ ...errors, severity: validateEmployeeTicketSeverity(e.target.value) }))}
                               className={`px-3 py-2 border rounded focus:outline-none focus:ring focus:border-blue-400 ${employeeTicketErrors.severity ? 'border-red-500' : ''} bg-white dark:bg-gray-800 dark:text-white`}
                               required
                             >
                               <option value="" disabled>Select Severity</option>
                               <option value="Low">Low</option>
                               <option value="Medium">Medium</option>
                               <option value="High">High</option>
                               <option value="Critical">Critical</option>
                             </select>
                             {employeeTicketErrors.severity && <div className="text-red-600 text-xs sm:text-sm">{employeeTicketErrors.severity}</div>}
                             <textarea
                               placeholder="Message"
                               value={employeeTicketData.message}
                               onChange={e => {
                                 setEmployeeTicketData({ ...employeeTicketData, message: e.target.value });
                                 setEmployeeTicketErrors(errors => ({ ...errors, message: '' }));
                               }}
                               onBlur={e => setEmployeeTicketErrors(errors => ({ ...errors, message: validateEmployeeTicketMessage(e.target.value) }))}
                               maxLength={500}
                               className={`px-3 py-2 border rounded focus:outline-none focus:ring focus:border-blue-400 resize-none ${employeeTicketErrors.message ? 'border-red-500' : ''}`}
                               rows={4}
                               required
                             />
                             <div className="flex justify-between items-center text-xs text-gray-500">
                               <span>{employeeTicketErrors.message && <span className="text-red-600">{employeeTicketErrors.message}</span>}</span>
                               <span>{employeeTicketData.message ? employeeTicketData.message.length : 0}/500</span>
                             </div>
                            <button
                              type="submit"
                              disabled={employeeTicketSubmitting || !isEmployeeTicketFormValid()}
                              className="w-full py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 transition mt-2 disabled:bg-blue-300 disabled:cursor-not-allowed"
                            >
                              {employeeTicketSubmitting ? (
                                <>
                                  <span className="mr-2 inline-block align-middle">
                                    <svg width="18" height="18" viewBox="0 0 38 38" stroke="#fff">
                                      <g fill="none" fillRule="evenodd">
                                        <g transform="translate(1 1)" strokeWidth="3">
                                          <circle strokeOpacity=".3" cx="18" cy="18" r="18"/>
                                          <path d="M36 18c0-9.94-8.06-18-18-18">
                                            <animateTransform
                                              attributeName="transform"
                                              type="rotate"
                                              from="0 18 18"
                                              to="360 18 18"
                                              dur="1s"
                                              repeatCount="indefinite"/>
                                          </path>
                                        </g>
                                      </g>
                                    </svg>
                                  </span>
                                  Submitting...
                                </>
                              ) : 'Submit Ticket'}
                            </button>
                            {employeeTicketStatus && (
                              <div className="mt-2 text-center text-sm" style={{ color: employeeTicketStatus.includes('success') ? 'green' : 'red' }}>{employeeTicketStatus}</div>
                            )}
                          </form>
                        </div>
                      </div>
                    ) : message.type === 'customer-form' ? (
                      <div key={message.id} className="flex justify-center">
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 rounded-xl p-6 flex flex-col gap-4 shadow w-full max-w-sm mt-2">
                          <div className="flex items-center justify-center mb-4">
                            <h2 className="text-lg sm:text-xl font-bold text-blue-700">Customer Helpdesk Ticket</h2>
                          </div>
                          <form onSubmit={handleCustomerTicketSubmit} className="flex flex-col gap-4 w-full">
                            <input
                              type="text"
                              placeholder="Customer Name"
                              value={customerTicketData.name}
                              onChange={e => {
                                setCustomerTicketData({ ...customerTicketData, name: e.target.value });
                                setCustomerTicketErrors(errors => ({ ...errors, name: '' }));
                              }}
                              onBlur={e => setCustomerTicketErrors(errors => ({ ...errors, name: validateCustomerTicketName(e.target.value) }))}
                              className={`px-3 py-2 border rounded focus:outline-none focus:ring focus:border-blue-400 ${customerTicketErrors.name ? 'border-red-500' : ''} bg-white dark:bg-gray-800 dark:text-white`}
                              required
                            />
                            {customerTicketErrors.name && <div className="text-red-600 text-xs sm:text-sm">{customerTicketErrors.name}</div>}
                            <input
                              type="email"
                              placeholder="Customer Email"
                              value={customerTicketData.email}
                              onChange={e => {
                                setCustomerTicketData({ ...customerTicketData, email: e.target.value });
                                setCustomerTicketErrors(errors => ({ ...errors, email: '' }));
                              }}
                              onBlur={e => setCustomerTicketErrors(errors => ({ ...errors, email: validateCustomerTicketEmail(e.target.value) }))}
                              className={`px-3 py-2 border rounded focus:outline-none focus:ring focus:border-blue-400 ${customerTicketErrors.email ? 'border-red-500' : ''} bg-white dark:bg-gray-800 dark:text-white`}
                              required
                            />
                            {customerTicketErrors.email && <div className="text-red-600 text-xs sm:text-sm">{customerTicketErrors.email}</div>}
                            <input
                              type="text"
                              placeholder="Phone Number"
                              value={customerTicketData.phone}
                              onChange={e => {
                                setCustomerTicketData({ ...customerTicketData, phone: e.target.value });
                                setCustomerTicketErrors(errors => ({ ...errors, phone: '' }));
                              }}
                              onBlur={e => setCustomerTicketErrors(errors => ({ ...errors, phone: validateCustomerTicketPhone(e.target.value) }))}
                              className={`px-3 py-2 border rounded focus:outline-none focus:ring focus:border-blue-400 ${customerTicketErrors.phone ? 'border-red-500' : ''} bg-white dark:bg-gray-800 dark:text-white`}
                              required
                            />
                            {customerTicketErrors.phone && <div className="text-red-600 text-xs sm:text-sm">{customerTicketErrors.phone}</div>}
                                                         <input
                               type="text"
                               placeholder="Issue Type"
                               value={customerTicketData.issue_type}
                               onChange={e => {
                                 setCustomerTicketData({ ...customerTicketData, issue_type: e.target.value });
                                 setCustomerTicketErrors(errors => ({ ...errors, issue_type: '' }));
                               }}
                               onBlur={e => setCustomerTicketErrors(errors => ({ ...errors, issue_type: validateCustomerTicketIssueType(e.target.value) }))}
                               className={`px-3 py-2 border rounded focus:outline-none focus:ring focus:border-blue-400 ${customerTicketErrors.issue_type ? 'border-red-500' : ''} bg-white dark:bg-gray-800 dark:text-white`}
                               required
                             />
                             {customerTicketErrors.issue_type && <div className="text-red-600 text-xs sm:text-sm">{customerTicketErrors.issue_type}</div>}
                             <input
                               type="text"
                               placeholder="Issue"
                               value={customerTicketData.issue}
                               onChange={e => {
                                 setCustomerTicketData({ ...customerTicketData, issue: e.target.value });
                                 setCustomerTicketErrors(errors => ({ ...errors, issue: '' }));
                               }}
                               onBlur={e => setCustomerTicketErrors(errors => ({ ...errors, issue: validateCustomerTicketIssue(e.target.value) }))}
                               className={`px-3 py-2 border rounded focus:outline-none focus:ring focus:border-blue-400 ${customerTicketErrors.issue ? 'border-red-500' : ''} bg-white dark:bg-gray-800 dark:text-white`}
                               required
                             />
                             {customerTicketErrors.issue && <div className="text-red-600 text-xs sm:text-sm">{customerTicketErrors.issue}</div>}
                             <input
                               type="text"
                               placeholder="Device"
                               value={customerTicketData.device}
                               onChange={e => {
                                 setCustomerTicketData({ ...customerTicketData, device: e.target.value });
                                 setCustomerTicketErrors(errors => ({ ...errors, device: '' }));
                               }}
                               onBlur={e => setCustomerTicketErrors(errors => ({ ...errors, device: validateCustomerTicketDevice(e.target.value) }))}
                               className={`px-3 py-2 border rounded focus:outline-none focus:ring focus:border-blue-400 ${customerTicketErrors.device ? 'border-red-500' : ''} bg-white dark:bg-gray-800 dark:text-white`}
                               required
                             />
                             {customerTicketErrors.device && <div className="text-red-600 text-xs sm:text-sm">{customerTicketErrors.device}</div>}
                             <textarea
                               placeholder="Message"
                               value={customerTicketData.message}
                               onChange={e => {
                                 setCustomerTicketData({ ...customerTicketData, message: e.target.value });
                                 setCustomerTicketErrors(errors => ({ ...errors, message: '' }));
                               }}
                               onBlur={e => setCustomerTicketErrors(errors => ({ ...errors, message: validateCustomerTicketMessage(e.target.value) }))}
                               maxLength={500}
                               className={`px-3 py-2 border rounded focus:outline-none focus:ring focus:border-blue-400 resize-none ${customerTicketErrors.message ? 'border-red-500' : ''} bg-white dark:bg-gray-800 dark:text-white`}
                               rows={4}
                               required
                             />
                             <div className="flex justify-between items-center text-xs text-gray-500">
                               <span>{customerTicketErrors.message && <span className="text-red-600">{customerTicketErrors.message}</span>}</span>
                               <span>{customerTicketData.message ? customerTicketData.message.length : 0}/500</span>
                             </div>
                            <button
                              type="submit"
                              disabled={customerTicketSubmitting || !isCustomerTicketFormValid()}
                              className="w-full py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 transition mt-2 disabled:bg-blue-300 disabled:cursor-not-allowed"
                            >
                              {customerTicketSubmitting ? (
                                <>
                                  <span className="mr-2 inline-block align-middle">
                                    <svg width="18" height="18" viewBox="0 0 38 38" stroke="#fff">
                                      <g fill="none" fillRule="evenodd">
                                        <g transform="translate(1 1)" strokeWidth="3">
                                          <circle strokeOpacity=".3" cx="18" cy="18" r="18"/>
                                          <path d="M36 18c0-9.94-8.06-18-18-18">
                                            <animateTransform
                                              attributeName="transform"
                                              type="rotate"
                                              from="0 18 18"
                                              to="360 18 18"
                                              dur="1s"
                                              repeatCount="indefinite"/>
                                          </path>
                                        </g>
                                      </g>
                                    </svg>
                                  </span>
                                  Submitting...
                                </>
                              ) : 'Submit Ticket'}
                            </button>
                            {customerTicketStatus && (
                              <div className="mt-2 text-center text-sm" style={{ color: customerTicketStatus.includes('success') ? 'green' : 'red' }}>{customerTicketStatus}</div>
                            )}
                          </form>
                        </div>
                      </div>
                    ) : (
                      <div
                        key={message.id}
                        className={`flex gap-3 sm:gap-4 ${message.type === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-4 duration-500`}
                      >
                        {message.type === 'assistant' && isClient && (
                          <div className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-xl ring-2 ring-blue-100 dark:ring-blue-900/50">
                            <Image
                              src={selectedAvatar}
                              alt="AI Avatar"
                              width={24}
                              height={24}
                              className="rounded-full"
                            />
                          </div>
                        )}

                        <div className="flex flex-col max-w-[75%] sm:max-w-md lg:max-w-lg">
                          <div
                            className={`group relative rounded-2xl sm:rounded-3xl px-4 py-3 sm:px-5 sm:py-3.5 break-words overflow-wrap-anywhere shadow-lg hover:shadow-xl transition-all duration-200 ${
                              message.type === 'user'
                                ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-br-md'
                                : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-bl-md'
                            }`}
                          >
                            <MessageContent content={message.content} isTyping={message.isTyping} />
                            
                            {/* Timestamp on hover */}
                            <div className={`absolute ${message.type === 'user' ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'} top-1/2 -translate-y-1/2 px-2 py-1 text-xs text-gray-500 dark:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap`}>
                              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>

                        {message.type === 'user' && (
                          <div className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-xl ring-2 ring-indigo-100 dark:ring-indigo-900/50">
                            <User className="w-5 h-5 text-white" />
                          </div>
                        )}
                      </div>
                    )
                  ))}

                  {/* Login form as a chat message */}
                  {showLoginForm && !isAuthenticated && (
                    <div className="flex flex-col items-center">
                      {loginPromptMessage && (
                        <div className="w-full flex justify-center mb-4">
                          <div className="max-w-xs sm:max-w-md lg:max-w-lg xl:max-w-xl rounded-3xl px-6 py-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 text-blue-900 dark:text-blue-100 text-center break-words overflow-wrap-anywhere border border-blue-200 dark:border-blue-700/50 shadow-lg">
                            <div className="flex items-center justify-center mb-2">
                              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="font-medium">Login Required</span>
                            </div>
                            <p className="text-sm">{loginPromptMessage}</p>
                          </div>
                        </div>
                      )}
                      <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-3xl p-8 flex flex-col gap-6 shadow-2xl w-full max-w-md mt-2">
                        <div className="text-center mb-2">
                          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-blue-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent mb-2">Welcome Back</h2>
                          <p className="text-gray-600 dark:text-gray-400 text-sm">Sign in to your account</p>
                        </div>
                        
                        <form onSubmit={handleLogin} className="flex flex-col gap-5">
                          {/* User type tab switcher */}
                          <div className="flex mb-2 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50">
                            <button
                              type="button"
                              className={`flex-1 py-3 px-4 text-center font-semibold transition-all duration-200 ${
                                loginType === 'employee'
                                  ? 'bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-lg transform scale-[1.02]'
                                  : 'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-600/50'
                              }`}
                              onClick={() => setLoginType('employee')}
                            >
                              <div className="flex items-center justify-center">
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2V6" />
                                </svg>
                                Employee
                              </div>
                            </button>
                            <button
                              type="button"
                              className={`flex-1 py-3 px-4 text-center font-semibold transition-all duration-200 ${
                                loginType === 'customer'
                                  ? 'bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-lg transform scale-[1.02]'
                                  : 'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-600/50'
                              }`}
                              onClick={() => setLoginType('customer')}
                            >
                              <div className="flex items-center justify-center">
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                Customer
                              </div>
                            </button>
                          </div>
                          
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                                </svg>
                              </div>
                              <input
                                type="email"
                                placeholder="Enter your email address"
                                value={loginEmail}
                                onChange={e => {
                                  setLoginEmail(e.target.value);
                                  setLoginEmailError('');
                                }}
                                onBlur={e => setLoginEmailError(validateEmail(e.target.value))}
                                className={`w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm placeholder-gray-500 dark:placeholder-gray-400 ${loginEmailError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                                required
                              />
                            </div>
                            {loginEmailError && <div className="text-red-500 text-sm flex items-center gap-1">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                              {loginEmailError}
                            </div>}
                          </div>
                          
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                              </div>
                              <input
                                type="password"
                                placeholder="Enter your password"
                                value={loginPassword}
                                onChange={e => {
                                  setLoginPassword(e.target.value);
                                  setLoginPasswordError('');
                                }}
                                onBlur={e => setLoginPasswordError(validatePassword(e.target.value))}
                                className={`w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm placeholder-gray-500 dark:placeholder-gray-400 ${loginPasswordError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                                required
                              />
                            </div>
                            {loginPasswordError && <div className="text-red-500 text-sm flex items-center gap-1">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                              {loginPasswordError}
                            </div>}
                          </div>
                          
                          {loginError && <div className="p-4 rounded-xl bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800 flex items-center gap-2">
                            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm">{loginError}</span>
                          </div>}
                          
                          <button
                            type="submit"
                            className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-900 transition-all duration-200 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:transform-none"
                            disabled={loginLoading || !isLoginFormValid()}
                          >
                            {loginLoading ? (
                              <>
                                <span className="mr-2 inline-block align-middle">
                                  <svg width="18" height="18" viewBox="0 0 38 38" stroke="#fff">
                                    <g fill="none" fillRule="evenodd">
                                      <g transform="translate(1 1)" strokeWidth="3">
                                        <circle strokeOpacity=".3" cx="18" cy="18" r="18"/>
                                        <path d="M36 18c0-9.94-8.06-18-18-18">
                                          <animateTransform
                                            attributeName="transform"
                                            type="rotate"
                                            from="0 18 18"
                                            to="360 18 18"
                                            dur="1s"
                                            repeatCount="indefinite"/>
                                        </path>
                                      </g>
                                    </g>
                                  </svg>
                                </span>
                                Signing In...
                              </>
                            ) : (
                              <>
                                <span className="mr-2">🔐</span>
                                Sign In
                              </>
                            )}
                          </button>
                          
                          <div className="text-center pt-2">
                            <button
                              type="button"
                              onClick={() => setShowLoginForm(false)}
                              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors duration-200"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}

                  {/* Enhanced Typing Indicator */}
                  {isLoading && isClient && (
                    <div className="flex gap-3 sm:gap-4 justify-start animate-in slide-in-from-bottom-4 duration-500">
                      <div className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-xl ring-2 ring-blue-100 dark:ring-blue-900/50">
                        <Image
                          src={selectedAvatar}
                          alt="AI Avatar"
                          width={24}
                          height={24}
                          className="rounded-full"
                        />
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-bl-md px-5 py-4 shadow-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex space-x-2 items-center">
                          <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce"></div>
                          <div
                            className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce"
                            style={{ animationDelay: '0.1s' }}
                          ></div>
                          <div
                            className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce"
                            style={{ animationDelay: '0.2s' }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
          </div>
                
          {/* Fixed Input Section at Bottom */}
          <div className="sticky bottom-0 z-10 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 sm:px-6 lg:px-8 pt-11 pb-20 sm:pt-10 sm:pb-28">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800/95 rounded-2xl shadow-lg border-2 border-gray-200 dark:border-gray-700 focus-within:border-blue-500 dark:focus-within:border-blue-500 focus-within:shadow-xl transition-all duration-300 group">
                {/* Message Icon */}
                <div className="flex-shrink-0 text-gray-400 dark:text-gray-500 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-all duration-200 group-focus-within:scale-110">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>

                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (
                      e.key === 'Enter' &&
                      !e.shiftKey &&
                      !isBotTyping &&
                      !isBotProcessing
                    ) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                  placeholder={isBotProcessing ? "🤔 Processing your request..." : "Type your message here..."}
                  className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm sm:text-base font-medium"
                  disabled={isBotTyping}
                />

                {/* Action Buttons */}
                <div className="flex items-center gap-1 sm:gap-1.5">
                  {/* Voice Input */}
                  <button
                    onClick={() => {
                      console.log('Voice input clicked');
                    }}
                    className="group relative flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/20 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
                    title="Voice input"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </button>
                </div>

                {/* Enhanced Send Button */}
                <button
                  onClick={() => handleSubmit()}
                  disabled={!input.trim() || isBotTyping || isBotProcessing}
                  className="flex-shrink-0 w-11 h-11 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed rounded-xl sm:rounded-2xl flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 hover:shadow-xl disabled:hover:scale-100 group relative overflow-hidden shadow-lg"
                  title="Send message (Enter)"
                >
                  {isBotProcessing ? (
                    <div className="animate-spin">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  ) : (
                    <Send className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  )}
                  
                  {/* Ripple effect */}
                  <span className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 group-active:opacity-30 transition-opacity duration-200 rounded-xl sm:rounded-2xl"></span>
                </button>
              </div>
              
              {/* Quick Actions */}
              {!input.trim() && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-600 p-3 opacity-0 invisible group-focus-within:opacity-100 group-focus-within:visible transition-all duration-200 z-10">
                  <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2 font-medium">Quick Actions:</div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setInput('What services do you offer?')}
                      className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-xs hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors duration-200"
                    >
                      🏢 Services
                    </button>
                    <button
                      onClick={() => setInput('How can I contact support?')}
                      className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-xs hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors duration-200"
                    >
                      📞 Support
                    </button>
                    <button
                      onClick={() => setInput('Tell me about job opportunities')}
                      className="px-3 py-1.5 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg text-xs hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors duration-200"
                    >
                      💼 Jobs
                    </button>
                    <button
                      onClick={() => setInput('What is your pricing?')}
                      className="px-3 py-1.5 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-lg text-xs hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors duration-200"
                    >
                      💰 Pricing
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
        
      {/* Save Chat Popup */}
      {isSavePopupOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-700">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-blue-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Save Chat
            </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Give your conversation a memorable name
              </p>
            </div>
            
            {saveAlert?.type === 'error' && (
              <div className="mb-4 p-4 rounded-xl bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800">
                {saveAlert?.message}
              </div>
            )}
            
            <input
              type="text"
              value={saveName}
              onChange={(e) => {
                setSaveName(e.target.value);
                setSaveAlert(null);
              }}
              placeholder="Enter chat name..."
              className="w-full px-4 py-3 mb-6 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl outline-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            />
            
            <div className="flex gap-3">
              <button
                onClick={handleCancelSave}
                className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveChat}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-xl hover:from-blue-700 hover:to-blue-900 transition-all duration-200 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed font-medium"
                disabled={!canSaveChat}
              >
                Save Chat
              </button>
            </div>
          </div>
        </div>
      )}
      
      <AlertModal open={alertOpen} message={alertMsg} onClose={() => setAlertOpen(false)} />
    </div>
  );
}