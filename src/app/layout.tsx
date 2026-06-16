import { Outfit } from 'next/font/google';
import './globals.css';
import type { Metadata } from 'next';

import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { AlertProvider } from '@/context/AlertContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { AuthProvider } from '@/context/AuthContext';
import { TenantProvider } from '@/context/TenantContext';
import InactivityTracker from '@/components/common/InactivityTracker';
import CookieBanner from '@/components/common/CookieBanner';
import { ActivityTracker } from '@/components/PresenceIndicator';
import PageTitleUpdater from '@/components/common/PageTitleUpdater';
import WebSocketErrorHandler from '@/components/common/WebSocketErrorHandler';

const outfit = Outfit({
  subsets: ["latin"],
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'arial'],
});

export const metadata: Metadata = {
  title: {
    default: 'Converiqo',
    template: '%s - Converiqo'
  },
  description: 'AI-powered business management platform',
  icons: {
    icon: '/images/logo/32x32 Favicon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Preconnect to external domains for faster loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://ragchatbot-bucket.s3.amazonaws.com" />
        <link rel="preconnect" href="https://cdn.iconscout.com" />
        
        {/* DNS prefetch for better performance */}
        <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_API_URL} />
        
        {/* Preload critical resources */}
        <link rel="preload" href="/images/logo/M-LOGO_1.png" as="image" type="image/png" />
        
        {/* Block __nextjs_original-stack-frames loop - MUST run before any other scripts */}
        {process.env.NODE_ENV !== 'production' && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function(){
                  'use strict';
                  // Immediately block __nextjs_original-stack-frames requests
                  var originalFetch = window.fetch;
                  var originalXHROpen = XMLHttpRequest.prototype.open;
                  var originalXHRSend = XMLHttpRequest.prototype.send;
                  
                  var stackFrameCache = new Map();
                  var requestCount = 0;
                  var MAX_REQUESTS = 3; // Allow only 3 requests total, then block completely
                  var BLOCK_DURATION = 60000; // Block for 60 seconds after max requests
                  var blockUntil = 0;
                  
                  function extractUrl(input) {
                    if (typeof input === 'string') return input;
                    if (input instanceof Request) return input.url;
                    if (input && typeof input === 'object') return input.url || String(input);
                    return '';
                  }
                  
                  function isStackFrameRequest(url) {
                    return String(url).includes('__nextjs_original-stack-frames');
                  }
                  
                  function shouldBlockStackFrameRequest() {
                    var now = Date.now();
                    
                    // If we're in a blocking period, continue blocking
                    if (now < blockUntil) {
                      return true;
                    }
                    
                    // If we've exceeded max requests, start blocking period
                    if (requestCount >= MAX_REQUESTS) {
                      blockUntil = now + BLOCK_DURATION;
                      return true;
                    }
                    
                    return false;
                  }
                  
                  function getCachedResponse(url) {
                    var cached = stackFrameCache.get(url);
                    if (cached && Date.now() - cached.time < 30000) { // 30 second cache
                      return cached.data;
                    }
                    return null;
                  }
                  
                  function cacheResponse(url, data) {
                    stackFrameCache.set(url, {
                      data: data,
                      time: Date.now()
                    });
                    // Limit cache size
                    if (stackFrameCache.size > 3) {
                      var firstKey = Array.from(stackFrameCache.keys())[0];
                      stackFrameCache.delete(firstKey);
                    }
                  }
                  
                  // Intercept fetch requests
                  window.fetch = function(...args) {
                    var url = extractUrl(args[0]);
                    
                    if (isStackFrameRequest(url)) {
                      // Check if we should block
                      if (shouldBlockStackFrameRequest()) {
                        var cached = getCachedResponse(url);
                        if (cached) {
                          return Promise.resolve(new Response(cached, {
                            status: 200,
                            headers: { 'Content-Type': 'application/json' }
                          }));
                        }
                        return Promise.resolve(new Response('{}', {
                          status: 200,
                          headers: { 'Content-Type': 'application/json' }
                        }));
                      }
                      
                      // Check cache first
                      var cached = getCachedResponse(url);
                      if (cached) {
                        return Promise.resolve(new Response(cached, {
                          status: 200,
                          headers: { 'Content-Type': 'application/json' }
                        }));
                      }
                      
                      requestCount++;
                      
                      // Make the request and cache it
                      return originalFetch.apply(this, args).then(function(response) {
                        if (response.ok) {
                          return response.clone().json().then(function(data) {
                            cacheResponse(url, JSON.stringify(data));
                            return new Response(JSON.stringify(data), {
                              status: 200,
                              headers: { 'Content-Type': 'application/json' }
                            });
                          }).catch(function() {
                            return new Response('{}', {
                              status: 200,
                              headers: { 'Content-Type': 'application/json' }
                            });
                          });
                        }
                        return response;
                      }).catch(function() {
                        return new Response('{}', {
                          status: 200,
                          headers: { 'Content-Type': 'application/json' }
                        });
                      });
                    }
                    
                    return originalFetch.apply(this, args);
                  };
                  
                  // Intercept XMLHttpRequest
                  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
                    this._url = url;
                    return originalXHROpen.apply(this, [method, url, ...rest]);
                  };
                  
                  XMLHttpRequest.prototype.send = function(...args) {
                    if (this._url && isStackFrameRequest(this._url)) {
                      if (shouldBlockStackFrameRequest()) {
                        var cached = getCachedResponse(this._url);
                        if (cached) {
                          Object.defineProperty(this, 'responseText', {
                            value: cached,
                            writable: false
                          });
                          Object.defineProperty(this, 'status', {
                            value: 200,
                            writable: false
                          });
                          Object.defineProperty(this, 'readyState', {
                            value: 4,
                            writable: false
                          });
                          if (this.onreadystatechange) {
                            this.onreadystatechange();
                          }
                          return;
                        }
                        Object.defineProperty(this, 'responseText', {
                          value: '{}',
                          writable: false
                        });
                        Object.defineProperty(this, 'status', {
                          value: 200,
                          writable: false
                        });
                        Object.defineProperty(this, 'readyState', {
                          value: 4,
                          writable: false
                        });
                        if (this.onreadystatechange) {
                          this.onreadystatechange();
                        }
                        return;
                      }
                      
                      var cached = getCachedResponse(this._url);
                      if (cached) {
                        Object.defineProperty(this, 'responseText', {
                          value: cached,
                          writable: false
                        });
                        Object.defineProperty(this, 'status', {
                          value: 200,
                          writable: false
                        });
                        Object.defineProperty(this, 'readyState', {
                          value: 4,
                          writable: false
                        });
                        if (this.onreadystatechange) {
                          this.onreadystatechange();
                        }
                        return;
                      }
                      
                      requestCount++;
                    }
                    
                    return originalXHRSend.apply(this, args);
                  };
                })();
              `,
            }}
          />
        )}
      </head>
      <body className={`${outfit.className} dark:bg-gray-900`}>
        <ThemeProvider>
          <AuthProvider>
            <TenantProvider>
              <ActivityTracker>
                <SidebarProvider>
                  <AlertProvider>
                    <NotificationProvider>
                      <PageTitleUpdater />
                      <InactivityTracker />
                      <WebSocketErrorHandler />
                      {children}
                      <CookieBanner />
                    </NotificationProvider>
                  </AlertProvider>
                </SidebarProvider>
              </ActivityTracker>
            </TenantProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}