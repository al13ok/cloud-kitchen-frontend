/**
 * Enhanced Session Tracking Script for Demo Pages
 * Provides persistent chatbot and comprehensive session tracking
 * Compatible with all demo pages (Home, About, Pricing, Features, Contact)
 */

(function () {
    'use strict';

    // Configuration - API endpoint detection
    const getApiEndpoint = function () {
        if (typeof window !== 'undefined') {
            // Try to get from window config (set by page)
            if (window.API_BASE_URL) {
                return window.API_BASE_URL + '/api/v1/unified-session-analytics';
            }
            // Try to get from meta tag
            const metaTag = document.querySelector('meta[name="api-base-url"]');
            if (metaTag && metaTag.getAttribute('content')) {
                const baseUrl = metaTag.getAttribute('content').replace(/\/+$/, '');
                return baseUrl + '/api/v1/unified-session-analytics';
            }
            // Fallback: detect from current host
            const protocol = window.location.protocol;
            const hostname = window.location.hostname;
            // If running on localhost, use port 8000 for backend
            if (hostname === 'localhost' || hostname === '127.0.0.1') {
                return 'https://py-mobiloitte.converiqo.ai/api/v1/unified-session-analytics';
            }
            // For production, try same origin with port 8000, or use relative path
            // If backend is on different port, adjust accordingly
            return `${protocol}//${hostname}:8000/api/v1/unified-session-analytics`;
        }
        return 'https://py-mobiloitte.converiqo.ai/api/v1/unified-session-analytics';
    };

    const getWebSocketEndpoint = function () {
        const apiUrl = getApiEndpoint();
        return apiUrl.replace(/^http/, 'ws').replace('/unified-session-analytics', '/realtime/ws');
    };

    const CONFIG = {
        API_ENDPOINT: getApiEndpoint(),
        WEBSOCKET_ENDPOINT: getWebSocketEndpoint(),
        STORAGE_KEY: 'demo_session_data',
        SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
        HEARTBEAT_INTERVAL: 10 * 1000, // 10 seconds (Optimized)
        CHATBOT_CHECK_INTERVAL: 5 * 1000, // 5 seconds (Optimized)
        INACTIVITY_TIMEOUT: 5 * 60 * 1000, // 5 minutes
        HIDDEN_PAGE_TIMEOUT: 3 * 1000, // 3 seconds
        INACTIVITY_CHECK_INTERVAL: 5 * 1000, // 5 seconds (Optimized)
        DEBUG: false, // Disabled for performance
        TRACK_FOR_ALL_USERS: true // Enable tracking for all users
    };

    // Demo pages configuration
    const DEMO_PAGES = {
        '/demo': 'Home',
        '/demo/about': 'About',
        '/demo/pricing': 'Pricing',
        '/demo/features': 'Features',
        '/demo/contact': 'Contact'
    };

    // Enhanced Session Tracking Class
    class EnhancedSessionTracker {
        constructor() {
            this.visitorId = this.getOrCreateVisitorId();
            this.currentPage = this.getCurrentPageName();

            // Initialize BroadcastChannel for tab coordination
            this.broadcastChannel = null;
            this.tabId = this.generateUUID(); // Unique ID for this tab
            this.activeTabs = new Set(); // Track active tabs
            this.tabLastHeartbeat = new Map(); // Track when each tab last sent heartbeat
            this.isLastTab = false;

            // WebSocket
            this.socket = null;
            this.socketRetries = 0;
            this.socketConnected = false;

            try {
                this.broadcastChannel = new BroadcastChannel('demo_session_tabs');
                this.setupBroadcastChannel();
            } catch (e) {
                this.log('BroadcastChannel not supported, using localStorage fallback');
            }

            // Clean up stale tabs periodically (tabs that haven't sent heartbeat in 10 seconds)
            if (this.broadcastChannel) {
                setInterval(() => {
                    const now = Date.now();
                    const staleThreshold = 10000; // 10 seconds
                    for (const [tabId, lastHeartbeat] of this.tabLastHeartbeat.entries()) {
                        if (tabId !== this.tabId && (now - lastHeartbeat) > staleThreshold) {
                            this.activeTabs.delete(tabId);
                            this.tabLastHeartbeat.delete(tabId);
                            this.log(`Removed stale tab ${tabId} from active list`);
                        }
                    }
                }, 5000); // Check every 5 seconds
            }

            // Check if we should reuse existing session or create new one
            this.sessionId = this.getOrCreateSessionId();
            this.sessionData = this.initializeSessionData();
            this.loadSession(); // Load existing session data from localStorage

            this.pageStartTime = Date.now();
            this.heartbeatInterval = null;
            this.chatbotCheckInterval = null;
            this.inactivityCheckInterval = null;
            this.lastActivityTime = Date.now();
            this.isTracking = false;
            this.chatbotLoaded = false;
            this.heartbeatCount = 0; // Track heartbeat count for periodic storage

            this.startTracking();
            this.setupEventListeners();
            this.ensureChatbotPersistence();
            this.setupWebSocket(); // Initialize WebSocket
            this.log(`Enhanced session tracking initialized - Visitor: ${this.visitorId}, Session: ${this.sessionId}, Tab: ${this.tabId}`);
        }

        // Generate UUID v4
        generateUUID() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                const r = Math.random() * 16 | 0;
                const v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }

        // Get or create visitor ID (persistent across sessions)
        getOrCreateVisitorId() {
            let visitorId = localStorage.getItem('demo_visitorId');
            if (!visitorId) {
                visitorId = this.generateUUID();
                localStorage.setItem('demo_visitorId', visitorId);
            }
            return visitorId;
        }

        // Setup WebSocket connection
        setupWebSocket() {
            if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
                return;
            }

            try {
                this.log('Connecting to WebSocket:', CONFIG.WEBSOCKET_ENDPOINT);
                this.socket = new WebSocket(CONFIG.WEBSOCKET_ENDPOINT);

                this.socket.onopen = () => {
                    this.log('WebSocket connected');
                    this.socketConnected = true;
                    this.socketRetries = 0;
                    // Send initial session data
                    this.sendRealTimeUpdate();
                };

                this.socket.onclose = (event) => {
                    this.log('WebSocket disconnected:', event.code, event.reason);
                    this.socketConnected = false;
                    // Retry connection with exponential backoff
                    const retryDelay = Math.min(1000 * Math.pow(2, this.socketRetries), 30000);
                    this.socketRetries++;
                    setTimeout(() => this.setupWebSocket(), retryDelay);
                };

                this.socket.onerror = (error) => {
                    this.log('WebSocket error:', error);
                };

                this.socket.onmessage = (event) => {
                    // Handle incoming messages if needed
                    try {
                        const message = JSON.parse(event.data);
                        if (message.type === 'pong') {
                            // Heartbeat response
                        }
                    } catch (e) {
                        // Ignore invalid JSON
                    }
                };
            } catch (e) {
                this.log('Failed to setup WebSocket:', e);
            }
        }

        // Setup BroadcastChannel for tab coordination
        setupBroadcastChannel() {
            if (!this.broadcastChannel) return;

            // Listen for messages from other tabs
            this.broadcastChannel.onmessage = (event) => {
                const { type, tabId, sessionId, activeTabs } = event.data;

                switch (type) {
                    case 'tab_opened':
                        // Another tab opened
                        if (tabId !== this.tabId && sessionId === this.sessionId) {
                            this.activeTabs.add(tabId);
                            this.tabLastHeartbeat.set(tabId, Date.now());
                            this.log(`Tab ${tabId} opened, total active tabs: ${this.activeTabs.size + 1}`);
                        }
                        break;
                    case 'tab_closed':
                        // Another tab closed
                        if (tabId !== this.tabId) {
                            this.activeTabs.delete(tabId);
                            this.tabLastHeartbeat.delete(tabId);
                            this.log(`Tab ${tabId} closed, remaining tabs: ${this.activeTabs.size + 1}`);

                            // If we're the last tab, mark it
                            if (this.activeTabs.size === 0) {
                                this.isLastTab = true;
                                this.log('This is the last active tab');
                            }
                        }
                        break;
                    case 'tab_heartbeat':
                        // Another tab is alive
                        if (tabId !== this.tabId && sessionId === this.sessionId) {
                            this.activeTabs.add(tabId);
                            this.tabLastHeartbeat.set(tabId, Date.now());
                        }
                        break;
                    case 'request_tabs':
                        // Another tab is asking for active tabs list
                        this.broadcastChannel.postMessage({
                            type: 'tab_response',
                            tabId: this.tabId,
                            sessionId: this.sessionId
                        });
                        break;
                    case 'tab_response':
                        // Response from another tab
                        if (tabId !== this.tabId && sessionId === this.sessionId) {
                            this.activeTabs.add(tabId);
                            this.tabLastHeartbeat.set(tabId, Date.now());
                        }
                        break;
                }
            };

            // Announce this tab's presence
            this.broadcastChannel.postMessage({
                type: 'tab_opened',
                tabId: this.tabId,
                sessionId: this.sessionId
            });

            // Request active tabs from other tabs
            this.broadcastChannel.postMessage({
                type: 'request_tabs',
                tabId: this.tabId,
                sessionId: this.sessionId
            });

            // Start heartbeat to keep this tab in the active list
            setInterval(() => {
                if (this.broadcastChannel) {
                    this.broadcastChannel.postMessage({
                        type: 'tab_heartbeat',
                        tabId: this.tabId,
                        sessionId: this.sessionId
                    });
                    // Update our own heartbeat time
                    this.tabLastHeartbeat.set(this.tabId, Date.now());
                }
            }, 3000);
        }

        // Get or create session ID (shared across tabs, ends when all tabs close)
        getOrCreateSessionId() {
            // Check if there's an active session in localStorage (shared across tabs)
            const existingSessionId = localStorage.getItem('demo_sessionId');
            const sessionStartTime = localStorage.getItem('demo_sessionStartTime');
            const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds

            // Check if we have an existing session that's still valid
            if (existingSessionId && sessionStartTime) {
                const timeSinceStart = Date.now() - parseInt(sessionStartTime);
                if (timeSinceStart < SESSION_TIMEOUT) {
                    // Reuse existing shared session
                    // BroadcastChannel will tell us if other tabs are active
                    this.log('Reusing existing shared session:', existingSessionId);

                    // Wait a bit for BroadcastChannel responses to determine if other tabs exist
                    // This helps distinguish between a fresh visit (new session) and tab reopening (same session)
                    setTimeout(() => {
                        // If no other tabs responded and BroadcastChannel is available,
                        // it likely means this is a new visit after all tabs were closed
                        // But we'll keep the session ID since it's still within timeout
                        if (!this.broadcastChannel || this.activeTabs.size === 0) {
                            this.log('No other tabs detected - continuing with existing session');
                        }
                    }, 1500);

                    return existingSessionId;
                } else {
                    this.log('Existing session expired, creating new one');
                    localStorage.removeItem('demo_sessionId');
                    localStorage.removeItem('demo_sessionStartTime');
                }
            }

            // Create new shared session (no valid session exists)
            // This happens when:
            // 1. First visit ever
            // 2. Previous session expired (>30 min)
            // 3. User closed all tabs and opened a new one (session cleared on last tab close)
            const newSessionId = this.generateUUID();
            localStorage.setItem('demo_sessionId', newSessionId);
            localStorage.setItem('demo_sessionStartTime', Date.now().toString());
            this.log('Created new shared session:', newSessionId);
            return newSessionId;
        }

        // Generate new session ID for each visit (deprecated - use getOrCreateSessionId instead)
        createNewSessionId() {
            return this.generateUUID();
        }

        // Get session number for this visitor
        getSessionNumber() {
            let sessionCount = localStorage.getItem('demo_sessionCount');
            if (!sessionCount) {
                sessionCount = 1;
                localStorage.setItem('demo_sessionCount', sessionCount.toString());
            } else {
                sessionCount = parseInt(sessionCount);
            }
            return sessionCount;
        }

        // Increment session number (call this when starting a new session)
        incrementSessionNumber() {
            let sessionCount = localStorage.getItem('demo_sessionCount');
            if (!sessionCount) {
                sessionCount = 1;
            } else {
                sessionCount = parseInt(sessionCount) + 1;
            }
            localStorage.setItem('demo_sessionCount', sessionCount.toString());
            return sessionCount;
        }

        // Get current page name
        getCurrentPageName() {
            const path = window.location.pathname;
            return DEMO_PAGES[path] || 'Unknown';
        }

        // Initialize session data
        initializeSessionData() {
            const now = new Date().toISOString();

            return {
                visitorId: this.visitorId,
                sessionId: this.sessionId,
                startTime: now,
                lastActivity: now,
                pageViews: [this.createPageView()],
                interactions: [],
                chatbotEvents: [],
                referrer: document.referrer || '',
                userAgent: navigator.userAgent,
                language: navigator.language,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                screenResolution: `${screen.width}x${screen.height}`,
                deviceType: this.detectDeviceType(),
                totalTimeOnSite: 0,
                isActive: true,
                website: window.location.hostname,
                currentUrl: window.location.href,
                currentPage: this.currentPage,
                isDemoSession: true,
                sessionNumber: this.getSessionNumber(),
                realTimeData: {
                    activeUsers: 1,
                    pageViews: 1,
                    chatbotInteractions: 0,
                    formSubmissions: 0,
                    bounceRate: 0,
                    avgSessionDuration: 0
                }
            };
        }

        // Create page view object
        createPageView() {
            return {
                url: window.location.href,
                title: document.title,
                pageName: this.currentPage,
                timestamp: new Date().toISOString(),
                timeSpent: 0,
                scrollDepth: 0,
                exitPage: false,
                chatbotPresent: false
            };
        }

        // Detect device type
        detectDeviceType() {
            const width = screen.width;
            const userAgent = navigator.userAgent.toLowerCase();

            if (userAgent.includes('mobile') || width < 768) {
                return 'mobile';
            } else if (width < 1024) {
                return 'tablet';
            } else {
                return 'desktop';
            }
        }

        // Start tracking
        startTracking() {
            if (this.isTracking) return;

            this.isTracking = true;
            this.startHeartbeat();
            this.startChatbotMonitoring();
            this.startInactivityMonitoring();
            this.storeSessionData(); // Store initial session data
            this.log('Enhanced tracking started');
        }


        // Start heartbeat for real-time monitoring
        startHeartbeat() {
            this.heartbeatInterval = setInterval(() => {
                // Update time continuously on current page
                // Calculate time since last heartbeat
                const currentTime = Date.now();
                const timeSinceLastHeartbeat = currentTime - this.pageStartTime;

                // Update total time on site
                if (this.sessionData.pageViews.length > 0) {
                    const currentPageView = this.sessionData.pageViews[this.sessionData.pageViews.length - 1];
                    if (typeof currentPageView.timeSpent === 'number') {
                        currentPageView.timeSpent += timeSinceLastHeartbeat;
                    } else {
                        currentPageView.timeSpent = timeSinceLastHeartbeat;
                    }
                    this.sessionData.totalTimeOnSite = (this.sessionData.totalTimeOnSite || 0) + timeSinceLastHeartbeat;
                } else {
                    // If no pageView exists (shouldn't happen, but safety check)
                    this.sessionData.totalTimeOnSite = (this.sessionData.totalTimeOnSite || 0) + timeSinceLastHeartbeat;
                }

                // Reset pageStartTime for next interval calculation
                this.pageStartTime = currentTime;

                // Only update activity if page is visible (don't reset timer when page is hidden)
                const isPageVisible = !document.hidden;
                if (isPageVisible) {
                    this.updateActivity();
                }

                this.updateRealTimeData();
                this.saveSession();
                this.sendRealTimeUpdate();

                // Store session data periodically to ensure accurate duration is saved
                // Store every 30 seconds (10 heartbeats at 3s interval) to balance frequency and performance
                const heartbeatCount = (this.heartbeatCount = (this.heartbeatCount || 0) + 1);
                if (heartbeatCount % 10 === 0) { // Every 30 seconds
                    this.storeSessionData();
                }
            }, CONFIG.HEARTBEAT_INTERVAL);
        }

        // Start chatbot monitoring
        startChatbotMonitoring() {
            this.chatbotCheckInterval = setInterval(() => {
                this.ensureChatbotPersistence();
            }, CONFIG.CHATBOT_CHECK_INTERVAL);
        }

        // Start inactivity monitoring
        startInactivityMonitoring() {
            this.inactivityCheckInterval = setInterval(() => {
                this.checkInactivity();
            }, CONFIG.INACTIVITY_CHECK_INTERVAL);
        }

        // Check for user inactivity
        checkInactivity() {
            const now = Date.now();
            const timeSinceLastActivity = now - this.lastActivityTime;

            // Check if page is visible - if visible, keep session active regardless of interaction
            const isPageVisible = !document.hidden;

            // Use different timeout based on page visibility
            // When page is hidden, use shorter timeout for faster inactive detection
            const timeoutThreshold = isPageVisible ? CONFIG.INACTIVITY_TIMEOUT : CONFIG.HIDDEN_PAGE_TIMEOUT;

            this.log(`Inactivity check: ${Math.round(timeSinceLastActivity / 1000)}s since last activity, threshold: ${timeoutThreshold / 1000}s, page visible: ${isPageVisible}`);

            // Mark as inactive if:
            // 1. Page is hidden AND timeout exceeded (fast detection when user leaves)
            // 2. OR page is visible AND long timeout exceeded (user still viewing but no activity)
            if (timeSinceLastActivity > timeoutThreshold) {
                if (this.sessionData.isActive) {
                    const reason = isPageVisible ? 'long inactivity timeout' : 'page hidden';
                    this.log(`User became inactive due to ${reason}`);
                    this.sessionData.isActive = false;
                    this.sendRealTimeUpdate();
                    if (!isPageVisible) {
                        // Only send session end if page is actually hidden (user left)
                        this.sendSessionEnd();
                    }
                }
            } else if (isPageVisible && !this.sessionData.isActive) {
                // If page becomes visible again, reactivate session
                this.log('Page visible again - reactivating session');
                this.sessionData.isActive = true;
                this.resetInactivityTimer();
                this.sendSessionResume();
                this.sendRealTimeUpdate();
            }
        }

        // Reset inactivity timer on user activity
        resetInactivityTimer() {
            this.lastActivityTime = Date.now();
            if (!this.sessionData.isActive) {
                this.log('User became active again');
                this.sessionData.isActive = true;
                this.sendRealTimeUpdate();
                this.sendSessionResume();
            }
        }

        // Ensure chatbot persistence across all demo pages
        ensureChatbotPersistence() {
            const chatbotElement = document.querySelector('[class*="mobilolite"], [id*="chatbot"], [class*="chatbot"]');
            const chatbotScript = document.querySelector('script[src*="chatbot.bundle.js"]');

            if (!chatbotElement && !chatbotScript && this.isDemoPage()) {
                this.loadChatbot();
            } else if (chatbotElement) {
                this.chatbotLoaded = true;
                this.updateCurrentPageViewChatbotStatus(true);
            }
        }

        // Check if current page is a demo page
        isDemoPage() {
            return Object.keys(DEMO_PAGES).includes(window.location.pathname);
        }

        // Load chatbot script
        loadChatbot() {
            if (this.chatbotLoaded) return;

            this.log('Loading chatbot for demo page:', this.currentPage);

            // Load the chatbot bundle
            const botScript = document.createElement('script');
            botScript.src = '/chatbot-new.bundle.js';
            botScript.async = true;
            botScript.onload = () => {
                this.chatbotLoaded = true;
                this.trackChatbotEvent('loaded', { page: this.currentPage });
                this.log('Chatbot loaded successfully on:', this.currentPage);
            };
            botScript.onerror = (error) => {
                this.log('Failed to load chatbot:', error);
                // Retry after 5 seconds
                setTimeout(() => this.loadChatbot(), 5000);
            };

            document.head.appendChild(botScript);
        }

        // Update activity timestamp
        updateActivity() {
            // Always update lastActivity timestamp to keep session fresh
            this.sessionData.lastActivity = new Date().toISOString();

            // Keep session active if page is visible (user is viewing the page)
            // This ensures sessions stay active as long as user is on the page
            const isPageVisible = !document.hidden;
            if (isPageVisible) {
                this.sessionData.isActive = true;
                this.resetInactivityTimer(); // Reset inactivity timer on any activity or page visibility
            }

            // Always reset inactivity timer when updating activity (even if page not visible)
            // This prevents premature inactive marking
            this.lastActivityTime = Date.now();
        }

        // Update real-time data
        updateRealTimeData() {
            const currentTime = Date.now();
            const sessionDuration = currentTime - new Date(this.sessionData.startTime).getTime();

            // Ensure arrays exist and handle both snake_case and camelCase property names
            const pageViews = this.sessionData.pageViews || this.sessionData.page_views || [];
            const chatbotEvents = this.sessionData.chatbotEvents || this.sessionData.chatbot_events || [];

            this.sessionData.realTimeData.avgSessionDuration = Math.round(sessionDuration / 1000);
            this.sessionData.realTimeData.pageViews = Array.isArray(pageViews) ? pageViews.length : 0;
            this.sessionData.realTimeData.chatbotInteractions = Array.isArray(chatbotEvents) ? chatbotEvents.length : 0;

            // Ensure arrays are consistently named (use camelCase)
            if (!this.sessionData.pageViews) {
                this.sessionData.pageViews = pageViews;
            }
            if (!this.sessionData.chatbotEvents) {
                this.sessionData.chatbotEvents = chatbotEvents;
            }
        }

        // Track page view
        trackPageView(url = window.location.href) {
            this.updateCurrentPageViewTime();
            this.pageStartTime = Date.now();

            const pageView = {
                url: url,
                title: document.title,
                pageName: this.getCurrentPageName(),
                timestamp: new Date().toISOString(),
                timeSpent: 0,
                scrollDepth: 0,
                exitPage: false,
                chatbotPresent: this.chatbotLoaded
            };

            this.sessionData.pageViews.push(pageView);
            this.sessionData.currentPage = this.getCurrentPageName();
            this.sessionData.currentUrl = url;
            this.updateActivity();
            this.saveSession();
            this.storeSessionData(); // Store session data on page view
            this.log('Page view tracked:', url, 'Page:', this.getCurrentPageName());
        }

        // Track interaction
        trackInteraction(type, element = null, data = {}) {
            const interaction = {
                type: type,
                element: element,
                timestamp: new Date().toISOString(),
                page: this.currentPage,
                data: data
            };

            this.sessionData.interactions.push(interaction);
            this.updateActivity();
            this.saveSession();
            this.storeSessionData(); // Store session data on interaction
            this.log('Interaction tracked:', type, element);
        }

        // Track chatbot event
        trackChatbotEvent(event, data = {}) {
            const chatbotEvent = {
                event: event,
                timestamp: new Date().toISOString(),
                page: this.currentPage,
                data: data
            };

            this.sessionData.chatbotEvents.push(chatbotEvent);
            this.updateActivity();
            this.saveSession();
            this.storeSessionData(); // Store session data on chatbot event
            this.log('Chatbot event tracked:', event, data);
        }

        // Track form submission
        trackFormSubmission(formData) {
            const formEvent = {
                type: 'form_submission',
                timestamp: new Date().toISOString(),
                page: this.currentPage,
                data: formData
            };

            this.sessionData.interactions.push(formEvent);
            this.sessionData.realTimeData.formSubmissions++;
            this.updateActivity();
            this.sendRealTimeUpdate();
            this.saveSession();
            this.storeSessionData(); // Store session data on form submission
            this.log('Form submission tracked:', formData);
        }

        // Track satisfaction rating
        trackSatisfaction(rating) {
            if (!['good', 'bad'].includes(rating)) {
                this.log('Invalid satisfaction rating:', rating);
                return;
            }

            const satisfactionEvent = {
                type: 'satisfaction_rating',
                timestamp: new Date().toISOString(),
                page: this.currentPage,
                data: { rating: rating }
            };

            this.sessionData.interactions.push(satisfactionEvent);
            this.sessionData.satisfactionRating = rating;
            this.updateActivity();
            this.sendRealTimeUpdate();
            this.saveSession();
            this.storeSessionData();
            this.log('Satisfaction rating tracked:', rating);
        }

        // Update current page view time
        updateCurrentPageViewTime() {
            if (this.sessionData.pageViews.length > 0) {
                const currentPageView = this.sessionData.pageViews[this.sessionData.pageViews.length - 1];
                const timeSpent = Date.now() - this.pageStartTime;
                currentPageView.timeSpent += timeSpent;
                this.sessionData.totalTimeOnSite += timeSpent;
            }
        }

        // Update current page view chatbot status
        updateCurrentPageViewChatbotStatus(present) {
            if (this.sessionData.pageViews.length > 0) {
                const currentPageView = this.sessionData.pageViews[this.sessionData.pageViews.length - 1];
                currentPageView.chatbotPresent = present;
            }
        }

        // Save session to localStorage
        saveSession() {
            try {
                localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(this.sessionData));
            } catch (error) {
                this.log('Error saving session:', error);
            }
        }

        // Load session from localStorage
        loadSession() {
            try {
                const savedSession = localStorage.getItem(CONFIG.STORAGE_KEY);
                if (savedSession) {
                    const parsedSession = JSON.parse(savedSession);

                    // Check if the saved session is still valid (same visitor, recent)
                    const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
                    const sessionAge = Date.now() - (parsedSession.lastActivity ? new Date(parsedSession.lastActivity).getTime() : 0);

                    // Only load if it's the same session ID (from same tab) and same visitor
                    // Since we now use sessionStorage for session IDs, each tab has its own session
                    // So we should only load if session ID matches (which means same tab, refreshed)
                    if (parsedSession.visitorId === this.visitorId &&
                        parsedSession.sessionId === this.sessionId &&
                        sessionAge < SESSION_TIMEOUT) {
                        // Normalize property names (handle both snake_case and camelCase)
                        if (parsedSession.chatbot_events && !parsedSession.chatbotEvents) {
                            parsedSession.chatbotEvents = parsedSession.chatbot_events;
                            delete parsedSession.chatbot_events;
                        }
                        if (parsedSession.page_views && !parsedSession.pageViews) {
                            parsedSession.pageViews = parsedSession.page_views;
                            delete parsedSession.page_views;
                        }

                        // Ensure arrays exist
                        if (!parsedSession.chatbotEvents) {
                            parsedSession.chatbotEvents = [];
                        }
                        if (!parsedSession.pageViews) {
                            parsedSession.pageViews = [];
                        }
                        if (!parsedSession.interactions) {
                            parsedSession.interactions = [];
                        }

                        // Preserve accumulated time from saved session
                        const savedTotalTime = parsedSession.totalTimeOnSite || 0;

                        // Merge with current session data, preserving important fields
                        this.sessionData = {
                            ...this.sessionData,
                            ...parsedSession,
                            // Always preserve these fields from current session
                            visitorId: this.visitorId,
                            sessionId: this.sessionId,
                            currentPage: this.currentPage,
                            currentUrl: window.location.href,
                            // Preserve accumulated time (keep the maximum to avoid losing time)
                            totalTimeOnSite: Math.max(
                                this.sessionData.totalTimeOnSite || 0,
                                savedTotalTime
                            )
                        };
                        this.log('Session loaded from localStorage for same session ID');
                    } else {
                        this.log('Saved session expired or invalid, using fresh session');
                    }
                }
            } catch (error) {
                this.log('Error loading session:', error);
            }
        }

        // Send real-time update to backend with immediate response
        async sendRealTimeUpdate() {
            try {
                // Try WebSocket first
                if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                    const sessionData = this.getSessionData();
                    this.socket.send(JSON.stringify({
                        type: 'session_update',
                        data: sessionData
                    }));
                    return;
                }

                // Fallback to HTTP if WebSocket is not available
                const realTimeData = {
                    sessionId: this.sessionId,
                    timestamp: new Date().toISOString(),
                    currentPage: this.currentPage,
                    isActive: this.sessionData.isActive,
                    realTimeData: {
                        ...this.sessionData.realTimeData,
                        visitorId: this.visitorId // Include visitor ID for proper user tracking
                    }
                };

                // Validate real-time data before sending
                if (!realTimeData.sessionId || !realTimeData.currentPage) {
                    this.log('Invalid real-time data, skipping update:', realTimeData);
                    return;
                }

                // Use sendBeacon for immediate delivery on page unload
                if (navigator.sendBeacon && !this.sessionData.isActive) {
                    const blob = new Blob([JSON.stringify(realTimeData)], { type: 'application/json' });
                    navigator.sendBeacon(CONFIG.API_ENDPOINT + '/real-time', blob);
                } else {
                    // Use fetch with keepalive for immediate delivery
                    await fetch(CONFIG.API_ENDPOINT + '/real-time', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(realTimeData),
                        keepalive: true // Keep connection alive for immediate delivery
                    });
                }
            } catch (error) {
                this.log('Error sending real-time update:', error);
            }
        }

        // Store complete session data in database
        async storeSessionData() {
            try {
                // Update time before storing to ensure accurate duration
                this.updateCurrentPageViewTime();
                const sessionData = this.getSessionData();

                // Validate session data before sending
                if (!sessionData.visitorId || !sessionData.sessionId || !sessionData.currentPage) {
                    this.log('Invalid session data, skipping storage:', {
                        visitorId: sessionData.visitorId,
                        sessionId: sessionData.sessionId,
                        currentPage: sessionData.currentPage
                    });
                    return;
                }

                const response = await fetch(CONFIG.API_ENDPOINT + '/session', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(sessionData)
                });

                if (response.ok) {
                    this.log('Session data stored successfully');
                } else {
                    // Log detailed error information
                    const errorText = await response.text();
                    this.log('Failed to store session data:', response.status, response.statusText);
                    this.log('Error details:', errorText);

                    // Log the data being sent for debugging
                    this.log('Session data being sent:', JSON.stringify(sessionData, null, 2));
                }
            } catch (error) {
                this.log('Error storing session data:', error);
            }
        }

        // Get session data
        getSessionData() {
            // Always update time before getting session data to ensure accurate duration
            this.updateCurrentPageViewTime();

            // Calculate total session duration from start time to now
            const now = Date.now();
            const sessionStartTime = new Date(this.sessionData.startTime).getTime();
            const actualSessionDuration = now - sessionStartTime;

            // Use the maximum of calculated duration or accumulated time (in case of gaps)
            // totalTimeOnSite is in milliseconds, we'll use the actual calculated duration
            const accurateTotalTime = Math.max(
                this.sessionData.totalTimeOnSite || 0,
                actualSessionDuration
            );

            // Ensure currentPage is always set
            if (!this.sessionData.currentPage) {
                this.sessionData.currentPage = this.currentPage;
            }

            // Ensure arrays exist and handle both snake_case and camelCase property names
            const pageViews = this.sessionData.pageViews || this.sessionData.page_views || [];
            const interactions = this.sessionData.interactions || [];
            const chatbotEvents = this.sessionData.chatbotEvents || this.sessionData.chatbot_events || [];

            // Ensure arrays are consistently named (use camelCase)
            if (!this.sessionData.pageViews) {
                this.sessionData.pageViews = pageViews;
            }
            if (!this.sessionData.chatbotEvents) {
                this.sessionData.chatbotEvents = chatbotEvents;
            }

            // Transform session data to match backend SessionData model
            return {
                visitorId: this.sessionData.visitorId,
                sessionId: this.sessionData.sessionId,
                sessionNumber: this.sessionData.sessionNumber,
                startTime: this.sessionData.startTime,
                lastActivity: new Date().toISOString(), // Always use current time for lastActivity
                totalTimeOnSite: Math.round(accurateTotalTime / 1000), // Convert milliseconds to seconds
                pageViews: Array.isArray(pageViews) ? pageViews.length : 0,
                interactions: Array.isArray(interactions) ? interactions.length : 0,
                chatbotEvents: Array.isArray(chatbotEvents) ? chatbotEvents.length : 0,
                referrer: this.sessionData.referrer,
                userAgent: this.sessionData.userAgent,
                deviceType: this.sessionData.deviceType,
                language: this.sessionData.language,
                timezone: this.sessionData.timezone,
                screenResolution: this.sessionData.screenResolution,
                website: this.sessionData.website,
                currentUrl: this.sessionData.currentUrl,
                currentPage: this.sessionData.currentPage || this.currentPage, // Fallback to this.currentPage
                isDemoSession: this.sessionData.isDemoSession,
                isActive: this.sessionData.isActive,
                realTimeData: this.sessionData.realTimeData,
                detailedPageViews: Array.isArray(pageViews) ? pageViews : [],
                detailedInteractions: Array.isArray(interactions) ? interactions : [],
                detailedChatbotEvents: Array.isArray(chatbotEvents) ? chatbotEvents : []
            };
        }

        // Get session summary for lead submission
        getSessionSummary() {
            // Update time before getting summary
            this.updateCurrentPageViewTime();

            // Calculate accurate total time
            const now = Date.now();
            const sessionStartTime = new Date(this.sessionData.startTime).getTime();
            const actualSessionDuration = now - sessionStartTime;
            const accurateTotalTime = Math.max(
                this.sessionData.totalTimeOnSite || 0,
                actualSessionDuration
            );

            // Ensure arrays exist and handle both snake_case and camelCase property names
            const pageViews = this.sessionData.pageViews || this.sessionData.page_views || [];
            const interactions = this.sessionData.interactions || [];
            const chatbotEvents = this.sessionData.chatbotEvents || this.sessionData.chatbot_events || [];

            // Ensure arrays are consistently named (use camelCase)
            if (!this.sessionData.pageViews) {
                this.sessionData.pageViews = pageViews;
            }
            if (!this.sessionData.chatbotEvents) {
                this.sessionData.chatbotEvents = chatbotEvents;
            }

            return {
                visitorId: this.sessionData.visitorId,
                sessionId: this.sessionData.sessionId,
                sessionNumber: this.sessionData.sessionNumber,
                startTime: this.sessionData.startTime,
                lastActivity: new Date().toISOString(), // Always use current time
                totalTimeOnSite: Math.round(accurateTotalTime / 1000),
                pageViews: Array.isArray(pageViews) ? pageViews.length : 0,
                interactions: Array.isArray(interactions) ? interactions.length : 0,
                chatbotEvents: Array.isArray(chatbotEvents) ? chatbotEvents.length : 0,
                referrer: this.sessionData.referrer,
                userAgent: this.sessionData.userAgent,
                deviceType: this.sessionData.deviceType,
                language: this.sessionData.language,
                timezone: this.sessionData.timezone,
                screenResolution: this.sessionData.screenResolution,
                website: this.sessionData.website,
                currentUrl: this.sessionData.currentUrl,
                currentPage: this.currentPage,
                isDemoSession: true,
                realTimeData: this.sessionData.realTimeData,
                // Detailed data for analysis
                detailedPageViews: Array.isArray(pageViews) ? pageViews : [],
                detailedInteractions: Array.isArray(interactions) ? interactions : [],
                detailedChatbotEvents: Array.isArray(chatbotEvents) ? chatbotEvents : []
            };
        }

        // Setup event listeners
        setupEventListeners() {
            // Page visibility change - immediate response
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    // Final time update before hiding
                    const finalTimeUpdate = Date.now() - this.pageStartTime;
                    if (this.sessionData.pageViews && this.sessionData.pageViews.length > 0) {
                        const currentPageView = this.sessionData.pageViews[this.sessionData.pageViews.length - 1];
                        currentPageView.timeSpent = (currentPageView.timeSpent || 0) + finalTimeUpdate;
                    }
                    this.sessionData.totalTimeOnSite = (this.sessionData.totalTimeOnSite || 0) + finalTimeUpdate;

                    // When page becomes hidden, start countdown for inactive status
                    // The inactivity check will mark inactive after HIDDEN_PAGE_TIMEOUT (3 seconds)
                    this.log('Page hidden - will mark inactive after 3 seconds if not visible again');
                    // Don't immediately mark inactive - give a brief grace period for tab switching
                    // But send update so backend knows page is hidden
                    this.sendRealTimeUpdate(); // Immediate real-time update
                    this.saveSession();
                    this.storeSessionData(); // Store session with accurate time
                } else {
                    // Reset page start time when page becomes visible again
                    this.pageStartTime = Date.now();
                    this.updateActivity();
                    this.sessionData.isActive = true;
                    this.resetInactivityTimer(); // Reset timer when page becomes visible
                    this.sendSessionResume();
                    this.sendRealTimeUpdate(); // Immediate real-time update
                    this.log('Page visible - user active, session reactivated');
                }
            });

            // Before page unload - immediate session end (only if last tab)
            window.addEventListener('beforeunload', () => {
                // Final time update before unload
                const finalTimeUpdate = Date.now() - this.pageStartTime;
                if (this.sessionData.pageViews && this.sessionData.pageViews.length > 0) {
                    const currentPageView = this.sessionData.pageViews[this.sessionData.pageViews.length - 1];
                    currentPageView.timeSpent = (currentPageView.timeSpent || 0) + finalTimeUpdate;
                }
                this.sessionData.totalTimeOnSite = (this.sessionData.totalTimeOnSite || 0) + finalTimeUpdate;

                // Announce tab is closing
                if (this.broadcastChannel) {
                    this.broadcastChannel.postMessage({
                        type: 'tab_closed',
                        tabId: this.tabId,
                        sessionId: this.sessionId
                    });
                }

                // Check if we're the last tab
                // Note: This is synchronous, so we rely on previous heartbeat tracking
                const isLastTab = this.activeTabs.size === 0 || this.isLastTab;

                if (isLastTab) {
                    // This is the last tab - end the session
                    this.sessionData.isActive = false;
                    this.sendSessionEnd();
                    // Clear session from localStorage since all tabs are closed
                    localStorage.removeItem('demo_sessionId');
                    localStorage.removeItem('demo_sessionStartTime');
                    this.log('Last tab closing - ending session');
                } else {
                    // Other tabs are still open - don't end session, just update
                    this.sessionData.isActive = false;
                    this.sendRealTimeUpdate();
                    this.log('Tab closing but other tabs remain - session continues');
                }

                this.sendRealTimeUpdate(); // Immediate real-time update
                this.saveSession();
                this.storeSessionData(); // Store final session data with accurate time
            });

            // Page focus/blur for immediate response
            window.addEventListener('blur', () => {
                // Don't immediately mark inactive on blur - use visibility API instead
                // Blur can happen even when page is still visible (e.g., clicking in address bar)
                this.log('Window blur - will check inactivity based on page visibility');
            });

            window.addEventListener('focus', () => {
                // When window regains focus, ensure session is active
                if (!document.hidden) {
                    this.sessionData.isActive = true;
                    this.resetInactivityTimer();
                    this.sendSessionResume();
                    this.sendRealTimeUpdate(); // Immediate real-time update
                    this.log('Window focus - user active, session reactivated');
                }
            });

            // Additional immediate response events
            window.addEventListener('pagehide', () => {
                // Final time update
                const finalTimeUpdate = Date.now() - this.pageStartTime;
                if (this.sessionData.pageViews && this.sessionData.pageViews.length > 0) {
                    const currentPageView = this.sessionData.pageViews[this.sessionData.pageViews.length - 1];
                    currentPageView.timeSpent = (currentPageView.timeSpent || 0) + finalTimeUpdate;
                }
                this.sessionData.totalTimeOnSite = (this.sessionData.totalTimeOnSite || 0) + finalTimeUpdate;

                // Announce tab is closing
                if (this.broadcastChannel) {
                    this.broadcastChannel.postMessage({
                        type: 'tab_closed',
                        tabId: this.tabId,
                        sessionId: this.sessionId
                    });
                }

                // Check if we're the last tab
                const isLastTab = this.activeTabs.size === 0 || this.isLastTab;

                if (isLastTab) {
                    // This is the last tab - end the session
                    this.sessionData.isActive = false;
                    this.sendSessionEnd();
                    // Clear session from localStorage since all tabs are closed
                    localStorage.removeItem('demo_sessionId');
                    localStorage.removeItem('demo_sessionStartTime');
                    this.log('Last tab hiding - ending session');
                } else {
                    // Other tabs are still open - don't end session
                    this.sessionData.isActive = false;
                    this.sendRealTimeUpdate();
                    this.log('Tab hiding but other tabs remain - session continues');
                }

                this.sendRealTimeUpdate();
                this.saveSession();
                this.storeSessionData(); // Store final session data
            });

            // Handle browser close/refresh with immediate response
            window.addEventListener('unload', () => {
                // Final time update
                const finalTimeUpdate = Date.now() - this.pageStartTime;
                if (this.sessionData.pageViews && this.sessionData.pageViews.length > 0) {
                    const currentPageView = this.sessionData.pageViews[this.sessionData.pageViews.length - 1];
                    currentPageView.timeSpent = (currentPageView.timeSpent || 0) + finalTimeUpdate;
                }
                this.sessionData.totalTimeOnSite = (this.sessionData.totalTimeOnSite || 0) + finalTimeUpdate;

                // Announce tab is closing
                if (this.broadcastChannel) {
                    this.broadcastChannel.postMessage({
                        type: 'tab_closed',
                        tabId: this.tabId,
                        sessionId: this.sessionId
                    });
                }

                // Check if we're the last tab
                const isLastTab = this.activeTabs.size === 0 || this.isLastTab;

                if (isLastTab) {
                    // This is the last tab - end the session
                    this.sessionData.isActive = false;
                    this.sendSessionEnd();
                    // Clear session from localStorage since all tabs are closed
                    localStorage.removeItem('demo_sessionId');
                    localStorage.removeItem('demo_sessionStartTime');
                    this.log('Last tab unloading - ending session');
                } else {
                    // Other tabs are still open - don't end session
                    this.sessionData.isActive = false;
                    this.sendRealTimeUpdate();
                    this.log('Tab unloading but other tabs remain - session continues');
                }

                this.sendRealTimeUpdate();
                this.saveSession();
                this.storeSessionData(); // Store final session data
            });


            // Click tracking
            document.addEventListener('click', (e) => {
                const element = this.getElementName(e.target);
                this.trackInteraction('click', element);
                this.resetInactivityTimer(); // Reset on click
            });

            // Scroll tracking
            let scrollTimeout;
            window.addEventListener('scroll', () => {
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(() => {
                    const scrollDepth = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
                    this.trackInteraction('scroll', null, { scrollDepth });
                    this.resetInactivityTimer(); // Reset on scroll
                }, 100);
            });

            // Form tracking
            document.addEventListener('submit', (e) => {
                const form = e.target;
                if (form.tagName === 'FORM') {
                    const formData = new FormData(form);
                    const formObject = {};
                    for (let [key, value] of formData.entries()) {
                        formObject[key] = value;
                    }
                    this.trackFormSubmission(formObject);
                }
            });

            // Form focus tracking
            document.addEventListener('focusin', (e) => {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
                    const element = this.getElementName(e.target);
                    this.trackInteraction('form_focus', element);
                }
            });

            // External link tracking
            document.addEventListener('click', (e) => {
                const link = e.target.closest('a');
                if (link && link.hostname !== window.location.hostname) {
                    this.trackInteraction('external_link', this.getElementName(link), { url: link.href });
                }
            });

            // Mouse movement tracking for inactivity detection
            document.addEventListener('mousemove', () => {
                this.resetInactivityTimer();
            });

            // Keyboard activity tracking for inactivity detection
            document.addEventListener('keydown', () => {
                this.resetInactivityTimer();
            });

            // Touch events for mobile devices
            document.addEventListener('touchstart', () => {
                this.resetInactivityTimer();
            });

            document.addEventListener('touchmove', () => {
                this.resetInactivityTimer();
            });
        }

        // Get human-readable element name
        getElementName(element) {
            if (!element) return 'Unknown Element';

            // Try to get a human-readable name first
            const name = this.getReadableElementName(element);
            if (name) return name;

            // Fallback to selector if no readable name found
            return this.getElementSelector(element);
        }

        // Get readable element name from element attributes
        getReadableElementName(element) {
            if (!element) return null;

            // Check for aria-label (most reliable)
            if (element.getAttribute('aria-label')) {
                return element.getAttribute('aria-label');
            }

            // Check for title attribute
            if (element.title) {
                return element.title;
            }

            // Check for placeholder (for inputs)
            if (element.placeholder) {
                return element.placeholder;
            }

            // Check for name attribute
            if (element.name) {
                // Ensure element.name is a string before formatting
                const nameValue = typeof element.name === 'string' ? element.name : String(element.name || '');
                if (nameValue) {
                    return this.formatElementName(nameValue);
                }
            }

            // Check for id and convert to readable name
            if (element.id) {
                // Ensure element.id is a string before formatting
                const idValue = typeof element.id === 'string' ? element.id : String(element.id || '');
                if (idValue) {
                    return this.formatElementName(idValue);
                }
            }

            // Check for data attributes
            if (element.getAttribute('data-name')) {
                return element.getAttribute('data-name');
            }

            // Check for text content (for buttons, links)
            if (element.textContent && element.textContent.trim().length > 0 && element.textContent.trim().length < 50) {
                return element.textContent.trim();
            }

            // Check for alt text (for images)
            if (element.alt) {
                return element.alt;
            }

            // Check for label association (for form inputs)
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT') {
                const id = element.id;
                if (id) {
                    const label = document.querySelector(`label[for="${id}"]`);
                    if (label && label.textContent) {
                        return label.textContent.trim();
                    }
                }
                // Check for parent label
                const parentLabel = element.closest('label');
                if (parentLabel && parentLabel.textContent) {
                    const labelText = typeof parentLabel.textContent === 'string' ? parentLabel.textContent.trim() : String(parentLabel.textContent || '').trim();
                    if (labelText) {
                        // Remove the input value from label text if present
                        const elementValue = element.value ? String(element.value) : '';
                        return labelText.replace(elementValue, '').trim() || labelText;
                    }
                }
            }

            // Check for button text
            if (element.tagName === 'BUTTON' && element.textContent) {
                const text = element.textContent.trim();
                if (text && text.length < 50) {
                    return text;
                }
            }

            // Check for link text
            if (element.tagName === 'A' && element.textContent) {
                const text = element.textContent.trim();
                if (text && text.length < 50) {
                    return text;
                }
            }

            // Check for class names that might indicate purpose
            const className = element.className;
            if (className) {
                const classStr = typeof className === 'string' ? className : className.toString();
                const classes = classStr.split(' ');

                // Common class name patterns
                for (const cls of classes) {
                    if (cls.includes('submit') || cls.includes('button-submit')) return 'Submit Button';
                    if (cls.includes('search') || cls.includes('search-input')) return 'Search Input';
                    if (cls.includes('email')) return 'Email Input';
                    if (cls.includes('password')) return 'Password Input';
                    if (cls.includes('message') || cls.includes('chat') || cls.includes('input-message')) return 'Message Input';
                    if (cls.includes('name')) return 'Name Input';
                    if (cls.includes('phone')) return 'Phone Input';
                    if (cls.includes('comment')) return 'Comment Input';
                    if (cls.includes('mobilolite') || cls.includes('chatbot')) {
                        if (cls.includes('input')) return 'Chatbot Input';
                        if (cls.includes('button') || cls.includes('send')) return 'Send Message Button';
                        return 'Chatbot Element';
                    }
                }
            }

            // Type-based names for form elements
            if (element.tagName === 'INPUT') {
                const type = element.type || 'text';
                if (type === 'email') return 'Email Input';
                if (type === 'password') return 'Password Input';
                if (type === 'search') return 'Search Input';
                if (type === 'tel') return 'Phone Input';
                if (type === 'number') return 'Number Input';
                if (type === 'submit') return 'Submit Button';
                if (type === 'button') return 'Button';
                return 'Text Input';
            }

            if (element.tagName === 'TEXTAREA') {
                return 'Text Area';
            }

            if (element.tagName === 'SELECT') {
                return 'Dropdown';
            }

            if (element.tagName === 'BUTTON') {
                return 'Button';
            }

            if (element.tagName === 'A') {
                return 'Link';
            }

            return null;
        }

        // Format element name from ID or class to readable format
        formatElementName(name) {
            // Ensure name is a string before processing
            if (!name) return null;
            if (typeof name !== 'string') {
                // Convert to string if it's not already
                try {
                    name = String(name);
                } catch (e) {
                    this.log('Error converting name to string:', e);
                    return null;
                }
            }

            // Convert camelCase, kebab-case, snake_case to readable format
            return name
                .replace(/([A-Z])/g, ' $1') // Add space before capital letters
                .replace(/[-_]/g, ' ') // Replace hyphens and underscores with spaces
                .replace(/\s+/g, ' ') // Replace multiple spaces with single space
                .trim()
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');
        }

        // Get element selector (fallback method)
        getElementSelector(element) {
            if (!element) return null;

            let selector = element.tagName ? element.tagName.toLowerCase() : 'unknown';
            if (element.id) {
                // Ensure id is a string
                const idValue = typeof element.id === 'string' ? element.id : String(element.id || '');
                if (idValue) {
                    selector += `#${idValue}`;
                }
            } else if (element.className && typeof element.className === 'string') {
                selector += `.${element.className.split(' ')[0]}`;
            } else if (element.className && element.className.length > 0) {
                // Handle DOMTokenList case
                const className = typeof element.className[0] === 'string' ? element.className[0] : String(element.className[0] || '');
                if (className) {
                    selector += `.${className}`;
                }
            }
            return selector;
        }

        // Logging
        log(...args) {
            if (CONFIG.DEBUG) {
                console.log('[EnhancedSessionTracker]', ...args);
            }
        }

        // Send immediate session end notification
        sendSessionEnd() {
            try {
                // Ensure arrays exist and handle both snake_case and camelCase property names
                const pageViews = this.sessionData.pageViews || this.sessionData.page_views || [];
                const interactions = this.sessionData.interactions || [];
                const chatbotEvents = this.sessionData.chatbotEvents || this.sessionData.chatbot_events || [];

                const sessionEndData = {
                    visitorId: this.sessionData.visitorId,
                    sessionId: this.sessionData.sessionId,
                    sessionNumber: this.sessionData.sessionNumber,
                    endTime: new Date().toISOString(),
                    isActive: false,
                    totalTimeOnSite: Math.round(this.sessionData.totalTimeOnSite / 1000),
                    pageViews: Array.isArray(pageViews) ? pageViews.length : 0,
                    interactions: Array.isArray(interactions) ? interactions.length : 0,
                    chatbotEvents: Array.isArray(chatbotEvents) ? chatbotEvents.length : 0
                };

                // Send immediately using sendBeacon for reliability
                if (navigator.sendBeacon) {
                    const blob = new Blob([JSON.stringify(sessionEndData)], { type: 'application/json' });
                    navigator.sendBeacon(CONFIG.API_ENDPOINT + '/session-end', blob);
                } else {
                    // Fallback to fetch with keepalive for reliability
                    fetch(CONFIG.API_ENDPOINT + '/session-end', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(sessionEndData),
                        keepalive: true
                    }).catch(() => { }); // Silent fail
                }

                this.log('Session end sent immediately');
            } catch (error) {
                this.log('Error sending session end:', error);
            }
        }

        // Send session resume notification with immediate response
        sendSessionResume() {
            try {
                const sessionResumeData = {
                    visitorId: this.sessionData.visitorId,
                    sessionId: this.sessionData.sessionId,
                    sessionNumber: this.sessionData.sessionNumber,
                    resumeTime: new Date().toISOString(),
                    isActive: true
                };

                // Use sendBeacon for immediate delivery
                if (navigator.sendBeacon) {
                    const blob = new Blob([JSON.stringify(sessionResumeData)], { type: 'application/json' });
                    navigator.sendBeacon(CONFIG.API_ENDPOINT + '/session-resume', blob);
                } else {
                    // Fallback to fetch with keepalive for immediate delivery
                    fetch(CONFIG.API_ENDPOINT + '/session-resume', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(sessionResumeData),
                        keepalive: true
                    }).catch(() => { }); // Silent fail
                }

                this.log('Session resume sent immediately');
            } catch (error) {
                this.log('Error sending session resume:', error);
            }
        }

        // Clear session
        clearSession() {
            localStorage.removeItem(CONFIG.STORAGE_KEY);
            // Clear shared session from localStorage (only when all tabs are closed)
            // Note: Individual tab closures shouldn't clear this - only when last tab closes
            // Also clear sessionStorage (tab-specific) - though we don't use it for session ID anymore
            sessionStorage.removeItem('demo_sessionId');
            sessionStorage.removeItem('demo_sessionStartTime');
            // Note: We don't clear 'demo_sessionId' and 'demo_sessionStartTime' from localStorage here
            // because that should only happen when the last tab closes

            // Clear intervals
            if (this.heartbeatInterval) {
                clearInterval(this.heartbeatInterval);
                this.heartbeatInterval = null;
            }
            if (this.chatbotCheckInterval) {
                clearInterval(this.chatbotCheckInterval);
                this.chatbotCheckInterval = null;
            }
            if (this.inactivityCheckInterval) {
                clearInterval(this.inactivityCheckInterval);
                this.inactivityCheckInterval = null;
            }

            this.sessionData = this.initializeSessionData();
            this.log('Session cleared');
        }

        // Force new session (for testing or when user explicitly wants to start fresh)
        startNewSession() {
            this.clearSession();
            this.sessionId = this.getOrCreateSessionId();
            this.sessionData = this.initializeSessionData();
            this.log('Started new session:', this.sessionId);
        }

        // Stop tracking
        stopTracking() {
            if (this.heartbeatInterval) {
                clearInterval(this.heartbeatInterval);
            }
            if (this.chatbotCheckInterval) {
                clearInterval(this.chatbotCheckInterval);
            }
            if (this.socket) {
                this.socket.close();
            }
            this.isTracking = false;
            this.log('Tracking stopped');
        }
    }

    // Initialize enhanced session tracker
    const enhancedSessionTracker = new EnhancedSessionTracker();

    // CRITICAL: Expose globally so bot widget can access it
    window.enhancedSessionTracker = enhancedSessionTracker;

    // Expose to global scope for external access
    window.EnhancedSessionTracker = enhancedSessionTracker;

    // Also expose as SessionTracker for backward compatibility with chatbot
    window.SessionTracker = enhancedSessionTracker;

    // Global functions for satisfaction tracking
    window.trackSatisfaction = function (rating) {
        if (enhancedSessionTracker) {
            enhancedSessionTracker.trackSatisfaction(rating);
        }
    };

    // Satisfaction rating removed from demo pages

    // Auto-track page views on navigation (for SPAs)
    let currentUrl = window.location.href;
    setInterval(() => {
        if (window.location.href !== currentUrl) {
            currentUrl = window.location.href;
            enhancedSessionTracker.trackPageView();
        }
    }, 1000);

    // Export for module systems
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = EnhancedSessionTracker;
    }

})();
