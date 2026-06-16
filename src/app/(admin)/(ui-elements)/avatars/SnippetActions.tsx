"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import { updateChatUIDetails, getChatUIDetails, getThemeColors } from "@/utils/api";

const REMOTE_WIDGET_SRC = `${process.env.NEXT_PUBLIC_API_URL}/customize/download-js/`;

const codeSnippets: Record<string, string> = {
  html: `<div id="chatbot-root"></div>
<script src="${REMOTE_WIDGET_SRC}"></script>
<script>
  window.Chatbot && window.Chatbot.init({
    target: document.getElementById('chatbot-root'),
    apiKey: 'YOUR_API_KEY',
  });
</script>`,
  javascript: `// Include this in your HTML
// <div id=\"chatbot-root\"></div>
// <script src=\"${REMOTE_WIDGET_SRC}\"></script>

window.Chatbot && window.Chatbot.init({
  target: document.getElementById('chatbot-root'),
  apiKey: 'YOUR_API_KEY',
});`,
  react: `import { useEffect, useRef } from 'react';

export default function ChatbotWidget() {
  const containerRef = useRef(null);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = '${REMOTE_WIDGET_SRC}';
    script.async = true;
    script.onload = () => {
      if (window.Chatbot && containerRef.current) {
        window.Chatbot.init({ target: containerRef.current, apiKey: 'YOUR_API_KEY' });
      }
    };
    document.body.appendChild(script);
    return () => {
      if (window.Chatbot && window.Chatbot.destroy) {
        window.Chatbot.destroy();
      }
    };
  }, []);

  return <div ref={containerRef} />;
}`,
  nextjs: `"use client";
import { useEffect, useRef } from 'react';
import Script from 'next/script';

export default function ChatbotWidget() {
  const containerRef = useRef(null);

  useEffect(() => {
    if (window.Chatbot && containerRef.current) {
      window.Chatbot.init({ target: containerRef.current, apiKey: 'YOUR_API_KEY' });
    }
  }, []);

  return (
    <>
      <Script src="${REMOTE_WIDGET_SRC}" strategy="afterInteractive" />
      <div ref={containerRef} />
    </>
  );
}`,
};

// Custom hook for localStorage initialization
const useLocalStorage = (key: string, defaultValue: string) => {
  const [value, setValue] = useState(defaultValue);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isFirstRender.current) {
      const storedValue = window.localStorage.getItem(key);
      if (storedValue) {
        setValue(storedValue);
      }
      isFirstRender.current = false;
    }
  }, [key]);

  const updateValue = (newValue: string) => {
    setValue(newValue);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, newValue);
    }
  };

  return [value, updateValue] as const;
};

// Default color themes
const DEFAULT_COLOR_THEMES = {
  "theme-1": {
    "color-1": "#000000",
    "color-2": "#1a1a1a",
    "color-3": "#404040",
    "color-4": "#cccccc",
    "color-5": "#ffffff"
  },
  "theme-2": {
    "color-1": "#ffffff",
    "color-2": "#f8f9fa",
    "color-3": "#e9ecef",
    "color-4": "#6c757d",
    "color-5": "#212529"
  },
  "theme-3": {
    "color-1": "#22223b",
    "color-2": "#4a4e69",
    "color-3": "#9a8c98",
    "color-4": "#c9ada7",
    "color-5": "#f2e9e4"
  },
  "theme-4": {
    "color-1": "#03045e",
    "color-2": "#0077b6",
    "color-3": "#00b4d8",
    "color-4": "#90e0ef",
    "color-5": "#caf0f8"
  },
  "theme-5": {
    "color-1": "#cad2c5",
    "color-2": "#84a98c",
    "color-3": "#52796f",
    "color-4": "#354f52",
    "color-5": "#2f3e46"
  },
  "theme-6": {
    "color-1": "#fefcfb",
    "color-2": "#1282a2",
    "color-3": "#034078",
    "color-4": "#001f54",
    "color-5": "#0a1128"
  },
  "theme-7": {
    "color-1": "#e0e1dd",
    "color-2": "#778da9",
    "color-3": "#415a77",
    "color-4": "#1b263b",
    "color-5": "#0d1b2a"
  },
  "theme-8": {
    "color-1": "#ecf39e",
    "color-2": "#90a955",
    "color-3": "#4f772d",
    "color-4": "#31572c",
    "color-5": "#132a13"
  },
  "theme-9": {
    "color-1": "#f6fff8",
    "color-2": "#eaf4f4",
    "color-3": "#cce3de",
    "color-4": "#a4c3b2",
    "color-5": "#6b9080"
  },
  "theme-10": {
    "color-1": "#e0b1cb",
    "color-2": "#be95c4",
    "color-3": "#9f86c0",
    "color-4": "#5e548e",
    "color-5": "#231942"
  },
  "theme-11": {
    "color-1": "#f7d1cd",
    "color-2": "#e8c2ca",
    "color-3": "#d1b3c4",
    "color-4": "#b392ac",
    "color-5": "#735d78"
  },
  "theme-12": {
    "color-1": "#f0ebd8",
    "color-2": "#748cab",
    "color-3": "#3e5c76",
    "color-4": "#1d2d44",
    "color-5": "#0d1321"
  },
  "theme-13": {
    "color-1": "#d6cfcb",
    "color-2": "#ccb7ae",
    "color-3": "#a6808c",
    "color-4": "#706677",
    "color-5": "#565264"
  },
  "theme-14": {
    "color-1": "#c9e4ca",
    "color-2": "#87bba2",
    "color-3": "#55828b",
    "color-4": "#3b6064",
    "color-5": "#364958"
  },
  "theme-15": {
    "color-1": "#cfe0c3",
    "color-2": "#9ec1a3",
    "color-3": "#70a9a1",
    "color-4": "#40798c",
    "color-5": "#1f363d"
  }
};

export default function SnippetActions() {
  // Snippet functionality states
  const [isOpen, setIsOpen] = useState(false);
  const [framework, setFramework] = useState<"html" | "javascript" | "react" | "nextjs">("html");
  const [copied, setCopied] = useState(false);

  // Save changes functionality states
  const [botName, setBotName] = useLocalStorage('chatbotName', 'Mobi.AI');
  const [welcomeMessage, setWelcomeMessage] = useLocalStorage('chatbotWelcomeMessage', "Hello! I'm your AI assistant. How can I help you today?");
  const [selectedPath, setSelectedPath] = useState("");
  const [selectedTheme, setSelectedTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('chatbotTheme') || 'theme-1';
    }
    return 'theme-1';
  });

  // Save changes states
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // Data loading states
  const [colorThemes, setColorThemes] = useState<Record<string, Record<string, string>>>(DEFAULT_COLOR_THEMES);
  const [isLoadingThemes, setIsLoadingThemes] = useState(true);
  const [isLoadingChatUI, setIsLoadingChatUI] = useState(true);
  const [chatUIDetails, setChatUIDetails] = useState<{
    widget_id: string;
    Name: string;
    Welcome_message: string;
    theme: Record<string, string>;
    image_link: string;
  } | null>(null);

  // Track original values for change detection
  const [originalValues, setOriginalValues] = useState<{
    Name: string;
    Welcome_message: string;
    image_link: string;
    theme: string;
  } | null>(null);

  const [hasInitialThemeMatch, setHasInitialThemeMatch] = useState(false);

  // Persist theme selection
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('chatbotTheme', selectedTheme);
    }
  }, [selectedTheme]);

  // Auto-dismiss save message
  useEffect(() => {
    if (saveMessage) {
      const timer = setTimeout(() => setSaveMessage(null), saveMessage.type === 'success' ? 3000 : 5000);
      return () => clearTimeout(timer);
    }
  }, [saveMessage]);

  // Fetch theme colors from API
  useEffect(() => {
    const fetchThemeColors = async () => {
      try {
        setIsLoadingThemes(true);
        console.log('Fetching theme colors from API...');
        const themesData = await getThemeColors();
        console.log('API response:', themesData);
        
        // Transform the API response to match the expected format
        const transformedThemes: Record<string, Record<string, string>> = {};
        themesData.forEach((theme: {
          theme: string;
          "color-1": string;
          "color-2": string;
          "color-3": string;
          "color-4": string;
          "color-5": string;
        }) => {
          transformedThemes[theme.theme] = {
            "color-1": theme["color-1"],
            "color-2": theme["color-2"],
            "color-3": theme["color-3"],
            "color-4": theme["color-4"],
            "color-5": theme["color-5"]
          };
        });
        
        console.log('Transformed themes:', transformedThemes);
        setColorThemes(transformedThemes);
        console.log('Theme colors loaded successfully from API');
      } catch (error) {
        console.error('Failed to fetch theme colors:', error);
        // Fallback to hardcoded themes if API fails
        setColorThemes(DEFAULT_COLOR_THEMES);
      } finally {
        setIsLoadingThemes(false);
      }
    };

    fetchThemeColors();
  }, []);

  // Fetch chat UI details from API (only once on mount)
  useEffect(() => {
    const fetchChatUIDetails = async () => {
      try {
        setIsLoadingChatUI(true);
        console.log('Fetching chat UI details from API...');
        const chatUIData = await getChatUIDetails('Model');
        console.log('Chat UI API response:', chatUIData);
        
        setChatUIDetails(chatUIData);
        console.log('Chat UI details loaded successfully from API');
        
        // Update the UI with fetched data
        if (chatUIData) {
          setBotName(chatUIData.Name);
          setWelcomeMessage(chatUIData.Welcome_message);
          setSelectedPath(chatUIData.image_link);
          
          // Dispatch avatar change event for the preview
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('avatarChanged', { 
              detail: { avatarPath: chatUIData.image_link } 
            }));
          }
        
          // Set original values for change tracking (theme will be updated in separate useEffect)
          setOriginalValues({
            Name: chatUIData.Name,
            Welcome_message: chatUIData.Welcome_message,
            image_link: chatUIData.image_link,
            theme: 'theme-1' // Default theme, will be updated when theme matching completes
          });
        }
      } catch (error) {
        console.error('Failed to fetch chat UI details:', error);
        // Keep existing values if API fails
      } finally {
        setIsLoadingChatUI(false);
      }
    };

    fetchChatUIDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty array = run only once on mount

  // Handle theme matching after both themes and chat UI details are loaded
  useEffect(() => {
    if (chatUIDetails && chatUIDetails.theme && Object.keys(colorThemes).length > 0 && !hasInitialThemeMatch) {
      console.log('Matching theme from API data...');
      
      let themeMatched = false;
      
      // Find a matching theme in our colorThemes
      const themeKeys = Object.keys(colorThemes);
      for (const themeKey of themeKeys) {
        const theme = colorThemes[themeKey];
      
        // Handle both underscore and hyphen formats from API
        const chatTheme = chatUIDetails.theme;
        const color1Match = theme["color-1"] === chatTheme["color-1"] || theme["color-1"] === chatTheme["color_1"];
        const color2Match = theme["color-2"] === chatTheme["color-2"] || theme["color-2"] === chatTheme["color_2"];
        const color3Match = theme["color-3"] === chatTheme["color-3"] || theme["color-3"] === chatTheme["color_3"];
        const color4Match = theme["color-4"] === chatTheme["color-4"] || theme["color-4"] === chatTheme["color_4"];
        const color5Match = theme["color-5"] === chatTheme["color-5"] || theme["color-5"] === chatTheme["color_5"];
        
        if (color1Match && color2Match && color3Match && color4Match && color5Match) {
          console.log(`Matched theme: ${themeKey}`);
          setSelectedTheme(themeKey);
          themeMatched = true;
          
          // Persist the matched theme to localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem('chatbotTheme', themeKey);
          }
          
          // Update original values with the matched theme
          if (originalValues) {
            setOriginalValues({
              ...originalValues,
              theme: themeKey
            });
          }
          break;
        }
      }
      
      // If no theme was matched, log a warning but don't change the current theme
      if (!themeMatched && chatUIDetails && chatUIDetails.theme) {
        console.warn('No matching theme found for API data. Keeping current theme selection.');
      }
      
      // Mark initial theme matching as complete
      setHasInitialThemeMatch(true);
    }
  }, [chatUIDetails, colorThemes, originalValues, hasInitialThemeMatch]);

  // Listen for changes from AvatarSelector component
  useEffect(() => {
    const handleAvatarChange = (event: CustomEvent) => {
      if (event.detail && event.detail.avatarPath) {
        setSelectedPath(event.detail.avatarPath);
      }
    };

    const handleThemeChange = (event: CustomEvent) => {
      if (event.detail && event.detail.themeKey) {
        setSelectedTheme(event.detail.themeKey);
      }
    };

    const handleNameChange = (event: CustomEvent) => {
      if (event.detail && event.detail.botName) {
        setBotName(event.detail.botName);
      }
    };

    const handleWelcomeMessageChange = (event: CustomEvent) => {
      if (event.detail && event.detail.welcomeMessage) {
        setWelcomeMessage(event.detail.welcomeMessage);
      }
    };

    const handleStorageChange = () => {
      // Listen for localStorage changes from AvatarSelector
      const newBotName = localStorage.getItem('chatbotName');
      const newWelcomeMessage = localStorage.getItem('chatbotWelcomeMessage');
      const newSelectedTheme = localStorage.getItem('chatbotTheme');
      const newSelectedAvatar = localStorage.getItem('selectedChatbotAvatar');
      
      if (newBotName && newBotName !== botName) {
        setBotName(newBotName);
      }
      if (newWelcomeMessage && newWelcomeMessage !== welcomeMessage) {
        setWelcomeMessage(newWelcomeMessage);
      }
      if (newSelectedTheme && newSelectedTheme !== selectedTheme) {
        setSelectedTheme(newSelectedTheme);
      }
      if (newSelectedAvatar && newSelectedAvatar !== selectedPath) {
        setSelectedPath(newSelectedAvatar);
      }
    };

    // Listen for custom events
    window.addEventListener('avatarChanged', handleAvatarChange as EventListener);
    window.addEventListener('themeChanged', handleThemeChange as EventListener);
    window.addEventListener('nameChanged', handleNameChange as EventListener);
    window.addEventListener('welcomeMessageChanged', handleWelcomeMessageChange as EventListener);
    
    // Listen for storage changes
    window.addEventListener('storage', handleStorageChange);
    
    // Also check for changes on an interval (for same-window localStorage changes)
    const interval = setInterval(handleStorageChange, 100);

    return () => {
      window.removeEventListener('avatarChanged', handleAvatarChange as EventListener);
      window.removeEventListener('themeChanged', handleThemeChange as EventListener);
      window.removeEventListener('nameChanged', handleNameChange as EventListener);
      window.removeEventListener('welcomeMessageChanged', handleWelcomeMessageChange as EventListener);
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [botName, welcomeMessage, selectedPath, selectedTheme, setBotName, setWelcomeMessage]);

  // Update hasChanges whenever relevant values change
  useEffect(() => {
    if (!originalValues) return;
    
    const currentValues = {
      Name: botName,
      Welcome_message: welcomeMessage,
      image_link: selectedPath,
      theme: selectedTheme
    };
    
    const hasChanges = (
      currentValues.Name !== originalValues.Name ||
      currentValues.Welcome_message !== originalValues.Welcome_message ||
      currentValues.image_link !== originalValues.image_link ||
      currentValues.theme !== originalValues.theme
    );
    
    setHasChanges(hasChanges);
  }, [botName, welcomeMessage, selectedPath, selectedTheme, originalValues]);

  // Function to save changes
  const handleSaveChanges = async () => {
    if (!hasChanges || !originalValues) return;
    
    try {
      setIsSaving(true);
      setSaveMessage(null);
      
      // Get current theme colors
      const currentTheme = colorThemes[selectedTheme];
      if (!currentTheme) {
        throw new Error('Selected theme not found');
      }
      
      const updateData = {
        Name: botName,
        Welcome_message: welcomeMessage,
        image_link: selectedPath,
        theme: {
          color_1: currentTheme["color-1"],
          color_2: currentTheme["color-2"],
          color_3: currentTheme["color-3"],
          color_4: currentTheme["color-4"],
          color_5: currentTheme["color-5"]
        }
      };
      
      console.log('Updating widget with data:', updateData);
      const response = await updateChatUIDetails('Model', updateData);
      console.log('Update response:', response);
      
      // Update original values to reflect the saved state
      setOriginalValues({
        Name: botName,
        Welcome_message: welcomeMessage,
        image_link: selectedPath,
        theme: selectedTheme
      });
      
      setHasChanges(false);
      setSaveMessage({ type: 'success', message: response.message || 'Widget updated successfully' });
      
    } catch (error) {
      console.error('Failed to update widget:', error);
      setSaveMessage({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Failed to update widget' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Snippet functionality
  const code = useMemo(() => codeSnippets[framework], [framework]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };



  return (
    <>
      <div className="flex items-center gap-3">
        {/* Primary Action - Save Changes (Solid) */}
        <Button
          onClick={handleSaveChanges}
          disabled={!hasChanges || isSaving || isLoadingChatUI || isLoadingThemes}
          size="md"
          variant="primary"
          className="min-w-[140px] shadow-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 border-0"
        >
          {isSaving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Saving...
            </>
          ) : isLoadingChatUI || isLoadingThemes ? (
            'Loading...'
          ) : (
            'Save Changes'
          )}
        </Button>

        {/* Auto-save Status Indicator */}
        {hasChanges && !isSaving && (
          <div className="flex items-center gap-2 px-3 py-2 bg-orange-500/20 backdrop-blur-sm rounded-lg text-orange-200 text-sm font-medium">
            <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
            Unsaved changes
          </div>
        )}
      </div>

      {/* Save Message */}
      {saveMessage && (
        <div className="fixed top-6 right-6 z-50">
          <div className={`flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg ${
            saveMessage.type === 'success' 
              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800' 
              : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
          }`}>
            {saveMessage.type === 'success' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            )}
            <span className="text-sm font-medium">{saveMessage.message}</span>
          </div>
        </div>
      )}

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <div className="flex items-center justify-between pr-12 sm:pr-16">
          <h4 className="text-base font-medium text-gray-800 dark:text-white/90">Snippet</h4>
          <select
            value={framework}
            onChange={(e) => setFramework(e.target.value as "html" | "javascript" | "react" | "nextjs")}
            className="h-9 rounded-md border border-gray-300 bg-white px-2.5 text-sm text-gray-700 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            <option value="html">HTML</option>
            <option value="javascript">JavaScript</option>
            <option value="react">React</option>
            <option value="nextjs">Next.js</option>
          </select>
        </div>
        <div className="mt-4">
          <pre className="max-h-[50vh] overflow-y-auto overflow-x-hidden rounded-xl border border-gray-100 bg-gray-50 p-4 text-[13px] leading-relaxed text-gray-800 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"><code className="font-mono whitespace-pre-wrap break-words">{code}</code></pre>
        </div>
        <div className="mt-4 flex items-center justify-end">
          <button
            onClick={handleCopy}
            type="button"
            className="rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </Modal>
    </>
  );
}
