"use client";

import { useEffect } from 'react';

export default function WebSocketErrorHandler() {
  useEffect(() => {
    // Suppress WebSocket connection errors in development
    const originalError = console.error;
    const originalWarn = console.warn;
    
    console.error = (...args) => {
      const message = args[0];
      if (typeof message === 'string') {
        // Suppress HMR WebSocket errors
        if (message.includes('WebSocket connection to') && message.includes('webpack-hmr')) {
          return;
        }
        // Suppress use-websocket.js errors
        if (message.includes('use-websocket.js')) {
          return;
        }
      }
      originalError.apply(console, args);
    };

    console.warn = (...args) => {
      const message = args[0];
      if (typeof message === 'string') {
        // Suppress WebSocket warnings
        if (message.includes('WebSocket') || message.includes('webpack-hmr')) {
          return;
        }
      }
      originalWarn.apply(console, args);
    };

    // Handle WebSocket errors globally
    const handleWebSocketError = (event: Event) => {
      event.stopPropagation();
      event.preventDefault();
    };

    window.addEventListener('error', handleWebSocketError, true);
    window.addEventListener('unhandledrejection', handleWebSocketError, true);

    // Cleanup function
    return () => {
      console.error = originalError;
      console.warn = originalWarn;
      window.removeEventListener('error', handleWebSocketError, true);
      window.removeEventListener('unhandledrejection', handleWebSocketError, true);
    };
  }, []);

  return null;
}
