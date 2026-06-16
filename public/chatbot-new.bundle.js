﻿/**
 * Mobilolite Chat Widget v3.0.0 - New API Integration
 * Connects to /api/v1/chat/message endpoint
 * Usage: <script src="path/to/chatbot-new.bundle.js"></script>
 */

(function () {
    'use strict';

    // Prevent multiple initializations--------
    if (window.MobiloliteWidgetNew) {
        return;
    }

    // Configuration options
    const DEFAULT_CONFIG = {
        position: 'bottom-right',
        theme: 'default',
        userName: 'Mobiloitte',
        userStatus: 'Online',
        autoOpen: false,
        minimizable: true,
        title: 'Chat Assistant',
        subtitle: 'How can I help you today?',
        welcomeMessage: 'Hi , I am Sara, Mobiloitte\'s virtual agent. \n How Can I help you today?',
        apiEndpoint: {
            baseUrl: 'https://py-mobiloitte.converiqo.ai',
            chatMessage: '/conversation'
        },
        // Guest user defaults
        guestEmail: 'user@example.com',
        guestName: 'Guest User',
        context: 'general',
        department: 'string',
        useAiAgent: true
    };

    // Generate CSS
    function generateCSS() {
        return `
        /* CSS Reset for Widget Isolation */
        .mobilolite-new-widget * {
            box-sizing: border-box !important;
            margin: 0;
            padding: 0;
            outline: none;
        }
        .mobilolite-new-widget button, 
        .mobilolite-new-widget input {
            font-family: inherit;
        }

        /* CSS Variables */
        :root {
            --primary-gradient: #007bff;
            --shadow-xl: 0 16px 48px rgba(0, 0, 0, 0.20);
            --shadow-2xl: 0 24px 64px rgba(0, 0, 0, 0.24);
            --radius-full: 9999px;
            --radius-2xl: 24px;
            --space-2xl: 24px;
            --space-3xl: 32px;
            --transition-spring: 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .mobilolite-new-widget {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            width: 380px;
            height: 550px;
            background: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 28px;
            overflow: hidden;
            box-shadow: var(--shadow-2xl);
            display: flex;
            flex-direction: column;
            position: fixed;
            bottom: var(--space-3xl);
            right: var(--space-2xl);
            z-index: 999999;
            transition: all var(--transition-spring);
        }

        .mobilolite-new-widget.position-left {
            right: auto;
            left: var(--space-2xl);
        }

        .mobilolite-new-widget.fullscreen {
            width: 100vw !important;
            height: 100vh !important;
            bottom: 0 !important;
            right: 0 !important;
            left: 0 !important;
            top: 0 !important;
            border-radius: 0 !important;
            z-index: 9999999 !important;
        }

        .mobilolite-new-widget.fullscreen .mobilolite-new-header {
            border-radius: 0;
        }

        .mobilolite-new-widget.fullscreen .mobilolite-new-input-area {
            border-radius: 0;
        }


        .mobilolite-new-widget.minimized {
            width: 72px !important;
            height: 72px !important;
            border-radius: var(--radius-full) !important;
            overflow: hidden;
            cursor: pointer;
            background: var(--primary-gradient);
            box-shadow: var(--shadow-xl);
        }

        .mobilolite-new-widget.minimized .mobilolite-new-header {
            width: 100%;
            height: 100%;
            padding: 0;
            border: none;
            display: flex;
            align-items: center;
            justify-content: center;
            background: transparent;
        }

        .mobilolite-new-widget.minimized .mobilolite-new-chat-area,
        .mobilolite-new-widget.minimized .mobilolite-new-input-area,
        .mobilolite-new-widget.minimized .mobilolite-new-user-details,
        .mobilolite-new-widget.minimized .mobilolite-new-header-icons {
            display: none !important;
        }

        .mobilolite-new-widget.minimized .mobilolite-new-user-info {
            justify-content: center;
            padding: 0;
            margin: 0;
            width: 100%;
            height: 100%;
        }

        .mobilolite-new-widget.minimized .mobilolite-new-avatar {
            background: transparent;
            border: none;
            box-shadow: none;
            width: 100%;
            height: 100%;
            font-size: 32px;
        }

        .mobilolite-new-header {
            background: linear-gradient(135deg, #0052cc 0%, #00a3ff 100%);
            padding: 20px 24px 40px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-radius: 28px 28px 0 0;
            position: relative;
            /* overflow: hidden; Removed to allow dropdown to show */
        }

        .mobilolite-new-header::after {
            content: "";
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 20px;
            background-color: #ffffff;
            border-top-left-radius: 50% 100%;
            border-top-right-radius: 50% 100%;
        }

        .mobilolite-new-user-info {
            display: flex;
            align-items: center;
            gap: 16px;
            flex: 1;
        }

        .mobilolite-new-avatar {
            width: 56px;
            height: 56px;
            background: transparent;
            border: none;
            border-radius: var(--radius-full);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-size: 18px;
            font-weight: 700;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
        }

        .mobilolite-new-user-details h3 {
            margin: 0;
            color: #ffffff;
            font-size: 20px;
            font-weight: 700;
        }

        .mobilolite-new-user-details p {
            margin: 0;
            color: rgba(255, 255, 255, 0.9);
            font-size: 13px;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .mobilolite-new-status-dot {
            width: 8px;
            height: 8px;
            background: #22c55e;
            border-radius: 50%;
            display: inline-block;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(1.2); }
        }

        .mobilolite-connection-status {
            font-size: 12px;
            color: rgba(255, 255, 255, 0.8);
            display: flex;
            align-items: center;
            gap: 6px;
            margin-top: 2px;
        }

        .mobilolite-connection-status.connecting {
            color: rgba(255, 255, 255, 0.6);
        }

        .mobilolite-connection-status.online {
            color: #22c55e;
        }

        .mobilolite-connection-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: currentColor;
        }

        .mobilolite-connection-status.connecting .mobilolite-connection-dot {
            animation: pulse 1.5s ease-in-out infinite;
        }

        .mobilolite-new-header-icons {
            display: flex;
            gap: 8px;
            align-items: center;
        }

        .mobilolite-new-icon {
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            cursor: pointer;
            opacity: 0.9;
            transition: all 0.2s;
            border-radius: 8px;
            background: rgba(255, 255, 255, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .mobilolite-new-icon:hover {
            opacity: 1;
            background: rgba(255, 255, 255, 0.3);
            transform: translateY(-2px);
        }

        .mobilolite-new-chat-area {
            flex: 1;
            background: #ffffff;
            padding: 16px;
            overflow-y: auto;
            overflow-x: hidden; /* Prevent horizontal overflow */
            display: flex;
            flex-direction: column;
            gap: 16px;
            width: 100%;
            max-width: 100%;
            box-sizing: border-box;
        }

        .mobilolite-new-message {
            display: flex;
            gap: 12px;
            align-items: flex-start;
            width: 100%;
            max-width: 100%;
            box-sizing: border-box;
        }

        .mobilolite-new-message.user {
            flex-direction: row-reverse;
            text-align: right;
        }

        .mobilolite-new-message-avatar {
            width: 32px;
            height: 32px;
            background: #007bff;
            border-radius: var(--radius-full);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            border: 2px solid #d1d5db;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
            color: #ffffff;
            font-size: 12px;
            font-weight: 700;
        }

        .mobilolite-new-message.user .mobilolite-new-message-avatar {
            background: #007bff;
        }

        .mobilolite-new-message-content {
            flex: 1;
            min-width: 0 !important; /* Critical: prevents flex children from overflowing */
            max-width: calc(100% - 44px) !important; /* 32px avatar + 12px gap */
            overflow: hidden !important;
            box-sizing: border-box;
        }

        .mobilolite-new-message-bubble {
            background: #f8fafc;
            color: #0f172a;
            padding: 12px 16px;
            border-radius: 24px;
            font-size: 15px;
            line-height: 1.6;
            word-wrap: break-word;
            display: inline-block;
            max-width: 80%;
            text-align: left;
            border: 1px solid #e5e7eb;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
        }

        .mobilolite-new-message.user .mobilolite-new-message-bubble {
            background: #007bff;
            color: #ffffff;
            border: none;
        }

        .mobilolite-new-message-bubble a {
            color: #007bff;
            text-decoration: underline;
            font-weight: 500;
        }

        .mobilolite-new-message-bubble a:hover {
            color: #0056b3;
            text-decoration: underline;
        }

        .mobilolite-new-message.user .mobilolite-new-message-bubble a {
            color: #ffffff;
            text-decoration: underline;
        }

        .mobilolite-new-message-time {
            font-size: 10px;
            color: #94a3b8;
            margin-top: 4px;
            text-align: right;
        }

        .mobilolite-new-message.user .mobilolite-new-message-time {
            text-align: left;
        }

        .mobilolite-new-input-area {
            padding: 16px;
            background: #ffffff;
            border-top: 1px solid #e5e7eb;
            border-radius: 0 0 28px 28px;
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        .mobilolite-new-input-wrapper {
            width: 100%;
            display: flex;
            gap: 12px;
            align-items: center;
            background: #f8fafc;
            border: 2px solid #e5e7eb;
            border-radius: 24px;
            padding: 6px 12px;
            transition: all 0.2s;
        }

        .mobilolite-new-input-wrapper:focus-within {
            border-color: #007bff;
            box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
        }

        .mobilolite-new-input {
            flex: 1;
            border: none;
            background: transparent;
            padding: 8px;
            font-size: 15px;
            outline: none;
            color: #0f172a;
        }

        .mobilolite-new-input::placeholder {
            color: #94a3b8;
        }

        .mobilolite-new-send-btn {
            width: 40px;
            height: 40px;
            background: var(--primary-gradient);
            border: none;
            border-radius: var(--radius-full);
            color: #ffffff;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .mobilolite-new-send-btn:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
        }

        .mobilolite-new-send-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: scale(1);
        }

        .mobilolite-new-typing {
            display: flex;
            gap: 4px;
            padding: 12px;
        }

        .mobilolite-new-typing span {
            display: block;
            width: 8px;
            height: 8px;
            background: #007bff;
            border-radius: 50%;
            animation: typing 1.4s infinite;
        }

        .mobilolite-new-typing span:nth-child(2) {
            animation-delay: 0.2s;
        }

        .mobilolite-new-typing span:nth-child(3) {
            animation-delay: 0.4s;
        }

        @keyframes typing {
            0%, 60%, 100% { transform: translateY(0); }
            30% { transform: translateY(-10px); }
        }

        .mobilolite-new-thinking-text {
            display: inline-block;
            animation: thinkingFade 1.5s ease-in-out infinite !important;
        }

        @keyframes thinkingFade {
            0%, 100% { opacity: 0.5; }
            50% { opacity: 1; }
        }

        .mobilolite-new-powered-by {
            text-align: center;
            font-size: 11px;
            color: #94a3b8;
            margin-top: 8px;
            font-weight: 500;
        }

        .mobilolite-new-powered-by a {
            color: #0052cc;
            text-decoration: none;
            font-weight: 600;
        }

        .mobilolite-new-powered-by a:hover {
            text-decoration: underline;
        }

        .mobilolite-new-char-counter {
            font-size: 11px;
            color: #94a3b8;
            margin-top: 4px;
            text-align: right;
            transition: color 0.2s;
        }

        .mobilolite-new-char-counter.warning {
            color: #f59e0b;
        }

        .mobilolite-new-char-counter.error {
            color: #ef4444;
            font-weight: 600;
        }

        .mobilolite-new-validation-message {
            font-size: 12px;
            color: #ef4444;
            margin-top: 4px;
            display: none;
            animation: shake 0.3s;
        }

        .mobilolite-new-validation-message.show {
            display: block;
        }

        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
        }

        .mobilolite-new-input-wrapper.error {
            border-color: #ef4444 !important;
        }

        /* Suggestion Chips */
        .mobilolite-suggestion-chips {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 12px;
            padding: 0 12px;
        }

        .mobilolite-suggestion-chip {
            background: white;
            border: 1.5px solid #e2e8f0;
            border-radius: 20px;
            padding: 8px 14px;
            font-size: 13px;
            color: #475569;
            cursor: pointer;
            transition: all 0.2s;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-weight: 500;
            opacity: 0;
            transform: translateY(10px);
            animation: chipFadeIn 0.4s ease-out forwards;
        }

        @keyframes chipFadeIn {
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .mobilolite-suggestion-chip:hover {
            background: #f8fafc;
            border-color: #0052cc;
            color: #0052cc;
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(0, 82, 204, 0.15);
        }

        .mobilolite-suggestion-chip:active {
            transform: translateY(0);
        }

        .mobilolite-suggestion-chip svg {
            width: 14px;
            height: 14px;
            flex-shrink: 0;
        }

        .mobilolite-leave-duration-error {
            font-size: 12px;
            color: #ef4444;
            margin-top: 4px;
            display: none;
            font-weight: 500;
        }

        .mobilolite-leave-duration-error.show {
            display: block;
        }

        .mobilolite-new-get-started {
            display: none;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            padding: 24px;
            text-align: center;
            background: #ffffff;
            border-radius: 28px;
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            z-index: 10;
        }

        .mobilolite-new-widget.not-started:not(.minimized) .mobilolite-new-get-started {
            display: flex;
        }

        .mobilolite-new-widget.not-started:not(.minimized) .mobilolite-new-header,
        .mobilolite-new-widget.not-started:not(.minimized) .mobilolite-new-chat-area,
        .mobilolite-new-widget.not-started:not(.minimized) .mobilolite-new-input-area {
            display: none;
        }

        .mobilolite-new-gs-avatar {
            width: 140px;
            height: 140px;
            border-radius: 50%;
            margin-bottom: 24px;
            object-fit: cover;
            /* box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1); */
        }

        .mobilolite-new-gs-title {
            font-size: 24px;
            font-weight: 700;
            color: #1e293b;
            margin-bottom: 8px;
        }

        .mobilolite-new-gs-subtitle {
            font-size: 16px;
            color: #64748b;
            margin-bottom: 32px;
            line-height: 1.5;
        }

        .mobilolite-new-gs-btn {
            background: var(--primary-gradient);
            color: #ffffff;
            border: none;
            padding: 14px 32px;
            border-radius: 24px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
            width: 100%;
            max-width: 240px;
        }

        .mobilolite-new-gs-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(0, 123, 255, 0.4);
        }

        .mobilolite-new-gs-close {
            position: absolute;
            top: 16px;
            right: 16px;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: #f1f5f9;
            border: none;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            color: #64748b;
            transition: all 0.2s;
        }

        .mobilolite-new-gs-close:hover {
            background: #e2e8f0;
            color: #1e293b;
            transform: rotate(90deg);
        }

        .mobilolite-new-dropdown {
            position: absolute;
            top: 60px;
            right: 24px;
            background: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            padding: 8px;
            display: none;
            flex-direction: column;
            gap: 4px;
            z-index: 1000;
            min-width: 160px;
            border: 1px solid #e5e7eb;
            animation: fadeIn 0.2s ease-out;
        }

        .mobilolite-new-dropdown.show {
            display: flex;
        }

        .mobilolite-new-dropdown-item {
            padding: 10px 16px;
            color: #1e293b;
            text-decoration: none;
            font-size: 14px;
            font-weight: 500;
            border-radius: 8px;
            transition: all 0.2s;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .mobilolite-new-dropdown-item:hover {
            background: #f1f5f9;
            color: #007bff;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        /* Login Modal Styles */
        .mobilolite-new-modal-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 2000;
            display: none;
            align-items: center;
            justify-content: center;
            border-radius: 28px;
        }

        .mobilolite-new-modal-overlay.show {
            display: flex;
        }

        .mobilolite-new-modal {
            background: #ffffff;
            width: 90%;
            max-width: 320px;
            padding: 24px;
            border-radius: 16px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
            position: relative;
            animation: slideUp 0.3s ease-out;
        }

        .mobilolite-new-password-wrapper {
            position: relative;
            display: flex;
            align-items: center;
        }

        .mobilolite-new-password-toggle {
            position: absolute;
            right: 12px;
            background: none;
            border: none;
            cursor: pointer;
            padding: 0;
            display: flex;
            align-items: center;
            color: #64748b;
        }
        
        .mobilolite-new-password-toggle:hover {
            color: #007bff;
        }

        @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .mobilolite-new-modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }

        .mobilolite-new-modal-title {
            font-size: 18px;
            font-weight: 700;
            color: #1e293b;
            margin: 0;
        }

        .mobilolite-new-modal-close {
            background: none;
            border: none;
            cursor: pointer;
            color: #64748b;
            padding: 4px;
            transition: color 0.2s;
        }

        .mobilolite-new-modal-close:hover {
            color: #1e293b;
        }

        .mobilolite-new-form-group {
            margin-bottom: 16px;
        }

        .mobilolite-new-form-label {
            display: block;
            font-size: 14px;
            font-weight: 500;
            color: #475569;
            margin-bottom: 6px;
        }

        .mobilolite-new-form-input {
            width: 100%;
            padding: 10px 12px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            font-size: 14px;
            transition: all 0.2s;
            box-sizing: border-box;
        }

        .mobilolite-new-form-input:focus {
            outline: none;
            border-color: #007bff;
            box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
        }

        .mobilolite-new-btn-primary {
            width: 100%;
            padding: 12px;
            background: var(--primary-gradient);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.1s;
        }

        .mobilolite-new-btn-primary:active {
            transform: scale(0.98);
        }

        .mobilolite-new-btn-primary:disabled,
        .mobilolite-leave-btn-primary:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            background: #94a3b8;
            transform: none;
        }

        .mobilolite-new-btn-primary:disabled:hover,
        .mobilolite-leave-btn-primary:disabled:hover {
            transform: none;
            box-shadow: none;
        }

        .mobilolite-new-quick-actions {
            padding: 6px 8px !important;
            background: #f8fafc !important;
            border-top: 1px solid #e2e8f0 !important;
            display: flex !important;
            gap: 4px !important;
            flex-wrap: nowrap !important;
            justify-content: space-between !important;
            box-sizing: border-box !important;
        }

        .mobilolite-new-quick-btn {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            gap: 2px !important;
            padding: 4px 2px !important;
            background: white !important;
            border: 1px solid #e2e8f0 !important;
            border-radius: 6px !important;
            cursor: pointer !important;
            transition: all 0.2s !important;
            font-size: 9px !important;
            color: #475569 !important;
            min-width: 0 !important;
            flex: 1 !important;
            box-sizing: border-box !important;
            text-align: center !important;
            line-height: 1.2 !important;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            font-weight: 500 !important;
            text-decoration: none !important;
            margin: 0 !important;
        }

        .mobilolite-new-quick-btn:hover {
            background: #f1f5f9 !important;
            border-color: #007bff !important;
            color: #007bff !important;
        }

        .mobilolite-new-quick-btn svg {
            width: 16px !important;
            height: 16px !important;
            flex-shrink: 0 !important;
            display: block !important;
        }

        .mobilolite-new-options {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 16px;
            padding: 4px 0;
        }

        .mobilolite-new-option-btn {
            padding: 12px 20px;
            background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
            border: 2px solid #e5e7eb;
            border-radius: 24px;
            color: #1e293b;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
            position: relative;
            overflow: hidden;
            min-width: 80px;
            text-align: center;
        }

        .mobilolite-new-option-btn::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #0052cc 0%, #00a3ff 100%);
            transition: left 0.3s ease;
            z-index: -1;
        }

        .mobilolite-new-option-btn:hover {
            background: linear-gradient(135deg, #0052cc 0%, #00a3ff 100%);
            color: white;
            border-color: #0052cc;
            transform: translateY(-2px) scale(1.05);
            box-shadow: 0 6px 16px rgba(0, 82, 204, 0.3);
        }

        .mobilolite-new-option-btn:active {
            transform: translateY(0) scale(0.98);
            box-shadow: 0 2px 8px rgba(0, 82, 204, 0.2);
        }

        /* File Upload Styles */
        .mobilolite-new-file-btn {
            width: 40px;
            height: 40px;
            background: #f1f5f9;
            border: none;
            border-radius: 50%;
            color: #64748b;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s;
            flex-shrink: 0;
            opacity: 0.4;
            pointer-events: none;
        }

        .mobilolite-new-file-btn.enabled {
            opacity: 1;
            pointer-events: auto;
            animation: pulse-upload 2s infinite;
        }

        @keyframes pulse-upload {
            0%, 100% { box-shadow: 0 0 0 0 rgba(0, 123, 255, 0.4); }
            50% { box-shadow: 0 0 0 8px rgba(0, 123, 255, 0); }
        }

        .mobilolite-new-file-btn:hover {
            background: #e2e8f0;
            color: #007bff;
        }

        .mobilolite-new-file-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .mobilolite-new-hamburger-btn {
            width: 40px;
            height: 40px;
            background: #f1f5f9;
            border: none;
            border-radius: 50%;
            color: #64748b;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s;
            flex-shrink: 0;
        }

        .mobilolite-new-hamburger-btn:hover {
            background: #e2e8f0;
            color: #007bff;
        }

        .mobilolite-new-file-input {
            display: none;
        }

        .mobilolite-new-upload-status {
            display: none;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            border-radius: 8px;
            margin-bottom: 8px;
            font-size: 13px;
            color: #15803d;
        }

        .mobilolite-new-upload-status.show {
            display: flex;
        }

        .mobilolite-new-upload-status.error {
            background: #fef2f2;
            border-color: #fecaca;
            color: #dc2626;
        }

        .mobilolite-new-upload-status.uploading {
            background: #eff6ff;
            border-color: #bfdbfe;
            color: #2563eb;
        }

        .mobilolite-new-upload-spinner {
            width: 16px;
            height: 16px;
            border: 2px solid #2563eb;
            border-top-color: transparent;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        /* ========================================
           JOB CARDS CAROUSEL - Enterprise Grade
           ======================================== */
        .job-carousel-container {
            width: 100% !important;
            max-width: 100% !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
            margin: 8px 0;
        }

        .job-carousel-wrapper {
            position: relative;
            width: 100%;
            max-width: 100%;
            overflow: hidden;
            box-sizing: border-box;
        }

        .job-cards-carousel {
            display: flex;
            overflow-x: auto;
            overflow-y: hidden;
            gap: 0;
            padding: 4px 0;
            scroll-snap-type: x mandatory;
            scroll-behavior: smooth;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
        }

        .job-cards-carousel::-webkit-scrollbar {
            display: none;
        }

        /* Enterprise-grade card container - constrained width */
        .job-card {
            flex: 0 0 100% !important;
            width: 100% !important;
            min-width: 0 !important;
            max-width: 100% !important;
            scroll-snap-align: start;
            background: #ffffff;
            border-radius: 10px;
            padding: 12px;
            margin: 0;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
            border: 1px solid #e5e7eb;
            position: relative;
            overflow: hidden !important;
            box-sizing: border-box !important;
            /* Compact card for widget */
            min-height: 180px;
            display: flex;
            flex-direction: column;
        }

        .job-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #3b82f6, #8b5cf6);
        }

        .job-card-header {
            margin-bottom: 8px;
            min-width: 0 !important;
            max-width: 100% !important;
            overflow: hidden !important;
            box-sizing: border-box;
        }

        .job-card-title {
            font-size: 13px;
            font-weight: 600;
            color: #1f2937;
            margin: 0 0 4px 0;
            line-height: 1.3;
            display: -webkit-box;
            -webkit-line-clamp: 1;
            -webkit-box-orient: vertical;
            overflow: hidden !important;
            text-overflow: ellipsis;
            word-wrap: break-word;
            word-break: break-word;
            max-width: 100% !important;
        }

        .job-card-company {
            font-size: 12px;
            color: #6b7280;
            display: flex;
            align-items: center;
            gap: 4px;
            min-width: 0;
            overflow: hidden;
        }

        .job-card-company svg {
            width: 12px;
            height: 12px;
            flex-shrink: 0;
        }

        .job-card-company span {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .job-card-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
            margin-bottom: 8px;
            min-width: 0 !important;
            max-width: 100% !important;
            overflow: hidden;
        }

        .job-card-tag {
            display: inline-flex;
            align-items: center;
            padding: 2px 6px;
            background: #f3f4f6;
            color: #374151;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 500;
            white-space: nowrap;
            max-width: 80px;
            overflow: hidden;
            text-overflow: ellipsis;
            flex-shrink: 0;
        }

        .job-card-tag.salary {
            background: #fef3c7;
            color: #92400e;
        }

        .job-card-description {
            font-size: 11px;
            color: #4b5563;
            line-height: 1.4;
            margin-bottom: 10px;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden !important;
            text-overflow: ellipsis;
            word-wrap: break-word;
            max-width: 100% !important;
            flex-grow: 1;
        }

        .job-card-actions {
            display: flex;
            gap: 6px;
            margin-top: auto;
            max-width: 100% !important;
        }

        .job-card-btn {
            flex: 1;
            min-width: 0 !important;
            max-width: 50% !important;
            padding: 8px 10px;
            border: none;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
            white-space: nowrap;
            overflow: hidden !important;
            text-overflow: ellipsis;
            box-sizing: border-box;
        }

        .job-card-btn svg {
            width: 14px;
            height: 14px;
            flex-shrink: 0;
        }

        .job-card-btn.view {
            background: #f3f4f6;
            color: #374151;
            border: 1px solid #e5e7eb;
        }

        .job-card-btn.view:hover {
            background: #e5e7eb;
            border-color: #d1d5db;
        }

        .job-card-btn.apply {
            background: linear-gradient(135deg, #3b82f6, #2563eb);
            color: white;
        }

        .job-card-btn.apply:hover {
            background: linear-gradient(135deg, #2563eb, #1d4ed8);
            box-shadow: 0 2px 6px rgba(59, 130, 246, 0.3);
        }

        /* Carousel Navigation */
        .carousel-nav {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            margin-top: 10px;
            padding: 4px 0;
        }

        .carousel-nav-btn {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            border: 1px solid #d1d5db;
            background: white;
            color: #6b7280;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            padding: 0;
            flex-shrink: 0;
        }

        .carousel-nav-btn svg {
            width: 14px;
            height: 14px;
        }

        .carousel-nav-btn:hover {
            background: #3b82f6;
            border-color: #3b82f6;
            color: white;
        }

        .carousel-dots {
            display: flex;
            justify-content: center;
            gap: 6px;
        }

        .carousel-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #d1d5db;
            transition: all 0.2s ease;
            cursor: pointer;
        }

        .carousel-dot.active {
            background: #3b82f6;
            width: 20px;
            border-radius: 4px;
        }

        /* ========================================
           RESPONSIVE BREAKPOINTS - Enterprise Grade
           ======================================== */
        
        /* Small widget view (typical chatbot embed) */
        @media (max-width: 400px) {
            .job-card {
                flex: 0 0 calc(100% - 4px);
                width: calc(100% - 4px);
                max-width: calc(100% - 4px);
                margin: 0 2px;
                padding: 12px;
                min-height: 170px;
            }
            .job-card-title {
                font-size: 13px;
            }
            .job-card-company {
                font-size: 11px;
            }
            .job-card-tag {
                font-size: 10px;
                padding: 2px 6px;
            }
            .job-card-description {
                font-size: 11px;
            }
            .job-card-btn {
                padding: 8px 10px;
                font-size: 11px;
            }
        }

        /* Very small widget view */
        @media (max-width: 320px) {
            .job-card {
                padding: 10px;
                min-height: 160px;
            }
            .job-card-title {
                font-size: 12px;
                -webkit-line-clamp: 2;
            }
            .job-card-company {
                font-size: 10px;
            }
            .job-card-meta {
                gap: 4px;
            }
            .job-card-tag {
                font-size: 9px;
                padding: 2px 5px;
            }
            .job-card-description {
                font-size: 10px;
                -webkit-line-clamp: 2;
            }
            .job-card-actions {
                gap: 6px;
            }
            .job-card-btn {
                padding: 7px 8px;
                font-size: 10px;
            }
            .job-card-btn svg {
                width: 12px;
                height: 12px;
            }
            .carousel-nav-btn {
                width: 24px;
                height: 24px;
            }
            .carousel-nav-btn svg {
                width: 12px;
                height: 12px;
            }
        }

        /* Tiny widget view (extreme) */
        @media (max-width: 260px) {
            .job-card {
                padding: 8px;
                min-height: 140px;
            }
            .job-card-title {
                font-size: 11px;
                -webkit-line-clamp: 1;
            }
            .job-card-company {
                font-size: 9px;
            }
            .job-card-meta {
                gap: 3px;
                margin-bottom: 6px;
            }
            .job-card-tag {
                font-size: 8px;
                padding: 1px 4px;
            }
            .job-card-description {
                display: none;
            }
            .job-card-actions {
                gap: 4px;
            }
            .job-card-btn {
                padding: 6px;
                font-size: 9px;
            }
            .job-card-btn svg {
                width: 10px;
                height: 10px;
            }
            .carousel-nav {
                gap: 8px;
                margin-top: 6px;
            }
            .carousel-nav-btn {
                width: 22px;
                height: 22px;
            }
            .carousel-dot {
                width: 6px;
                height: 6px;
            }
            .carousel-dot.active {
                width: 14px;
            }
        }

        /* ========================================
           INTERACTIVE UPLOAD BUTTON
           ======================================== */
        .mobilolite-upload-prompt {
            display: none;
            align-items: center;
            justify-content: center;
            gap: 12px;
            padding: 16px;
            background: linear-gradient(135deg, #eff6ff 0%, #e0f2fe 100%);
            border-radius: 12px;
            margin: 12px 16px;
            border: 2px dashed #3b82f6;
            cursor: pointer;
            transition: all 0.3s;
            animation: slideUp 0.4s ease-out;
        }

        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .mobilolite-upload-prompt.show {
            display: flex;
        }

        .mobilolite-upload-prompt:hover {
            background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
            border-color: #2563eb;
            transform: scale(1.02);
        }

        .mobilolite-upload-prompt-icon {
            width: 48px;
            height: 48px;
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 24px;
            animation: bounce 2s infinite;
        }

        @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-6px); }
        }

        .mobilolite-upload-prompt-text {
            flex: 1;
        }

        .mobilolite-upload-prompt-title {
            font-size: 14px;
            font-weight: 700;
            color: #1e40af;
            margin: 0 0 4px 0;
        }

        .mobilolite-upload-prompt-subtitle {
            font-size: 12px;
            color: #3b82f6;
            margin: 0;
        }

        .mobilolite-upload-prompt-arrow {
            font-size: 20px;
            color: #3b82f6;
            animation: pulse 1.5s infinite;
        }

        @media (max-width: 600px) {
            .mobilolite-new-widget:not(.minimized) {
                width: 100% !important;
                height: 100% !important;
                max-width: 100% !important;
                max-height: 100% !important;
                bottom: 0 !important;
                right: 0 !important;
                left: 0 !important;
                top: 0 !important;
                border-radius: 0 !important;
                margin: 0 !important;
            }

            .mobilolite-new-widget.minimized {
                bottom: 20px !important;
                right: 20px !important;
            }

            .mobilolite-new-header {
                border-radius: 0 !important;
                padding-top: env(safe-area-inset-top, 20px);
            }

            .mobilolite-new-input-area {
                border-radius: 0 !important;
                padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
            }
        }

        /* Apply Leave Modal Styles */
        .mobilolite-leave-modal-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(2px);
            z-index: 2000;
            display: none;
            align-items: center;
            justify-content: center;
            border-radius: 28px;
        }

        .mobilolite-leave-modal-overlay.show {
            display: flex;
        }

        .mobilolite-leave-modal {
            background: #ffffff;
            width: 85%;
            max-width: 320px;
            padding: 20px;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25);
            position: relative;
            animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            max-height: 85%;
            overflow-y: auto;
            scrollbar-width: thin;
            scrollbar-color: #cbd5e1 transparent;
        }

        /* Custom Scrollbar */
        .mobilolite-leave-modal::-webkit-scrollbar {
            width: 6px;
        }

        .mobilolite-leave-modal::-webkit-scrollbar-track {
            background: transparent;
        }

        .mobilolite-leave-modal::-webkit-scrollbar-thumb {
            background-color: #cbd5e1;
            border-radius: 20px;
            border: 2px solid transparent;
            background-clip: content-box;
        }

        .mobilolite-leave-modal::-webkit-scrollbar-thumb:hover {
            background-color: #94a3b8;
        }

        .mobilolite-leave-modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 1px solid #f1f5f9;
        }

        .mobilolite-leave-modal-title {
            font-size: 18px;
            font-weight: 700;
            color: #0f172a;
            margin: 0;
            letter-spacing: -0.02em;
        }

        .mobilolite-leave-modal-close {
            background: #f1f5f9;
            border: none;
            cursor: pointer;
            color: #64748b;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
        }

        .mobilolite-leave-modal-close:hover {
            background: #e2e8f0;
            color: #0f172a;
            transform: rotate(90deg);
        }

        .mobilolite-leave-form-group {
            margin-bottom: 14px;
        }

        .mobilolite-leave-form-label {
            display: block;
            font-size: 12px;
            font-weight: 600;
            color: #475569;
            margin-bottom: 6px;
            text-transform: uppercase;
            letter-spacing: 0.02em;
        }

        .mobilolite-leave-form-input,
        .mobilolite-leave-form-select,
        .mobilolite-leave-form-textarea {
            width: 100%;
            padding: 10px 12px;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            font-size: 14px;
            transition: all 0.2s;
            box-sizing: border-box;
            font-family: inherit;
            background: #f8fafc;
            color: #1e293b;
        }

        .mobilolite-leave-form-input:hover,
        .mobilolite-leave-form-select:hover,
        .mobilolite-leave-form-textarea:hover {
            border-color: #cbd5e1;
            background: #ffffff;
        }

        .mobilolite-leave-form-input:focus,
        .mobilolite-leave-form-select:focus,
        .mobilolite-leave-form-textarea:focus {
            outline: none;
            border-color: #3b82f6;
            background: #ffffff;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .mobilolite-leave-form-textarea {
            resize: vertical;
            min-height: 80px;
            line-height: 1.5;
        }

        .mobilolite-leave-btn-primary {
            width: 100%;
            padding: 14px;
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            margin-top: 8px;
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
        }

        .mobilolite-leave-btn-primary:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 16px rgba(37, 99, 235, 0.3);
        }

        .mobilolite-leave-btn-primary:active {
            transform: translateY(0);
        }

        /* Floating Welcome Bubble */
        .mobilolite-welcome-bubble {
            position: fixed;
            bottom: 120px;
            right: 32px;
            background: #2563eb;
            color: white;
            padding: 16px 40px 16px 20px;
            border-radius: 16px;
            box-shadow: 0 8px 24px rgba(37, 99, 235, 0.3);
            max-width: 280px;
            font-size: 14px;
            line-height: 1.5;
            z-index: 999998;
            opacity: 0;
            transform: translateY(10px) scale(0.95);
            transition: all 0.3s ease;
            pointer-events: none;
        }

        .mobilolite-welcome-bubble.show {
            opacity: 1;
            transform: translateY(0) scale(1);
            pointer-events: auto;
        }

        .mobilolite-welcome-bubble::after {
            content: '';
            position: absolute;
            bottom: -8px;
            right: 20px;
            width: 0;
            height: 0;
            border-left: 10px solid transparent;
            border-right: 10px solid transparent;
            border-top: 10px solid #2563eb;
        }

        .mobilolite-welcome-bubble-close {
            position: absolute;
            top: 8px;
            right: 8px;
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: white;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 14px;
            line-height: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s;
        }

        .mobilolite-welcome-bubble-close:hover {
            background: rgba(255, 255, 255, 0.3);
        }

        /* Service Menu Overlay */
        .mobilolite-service-menu-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%);
            z-index: 3000;
            display: none;
            flex-direction: column;
            overflow-y: auto;
            border-radius: 28px;
            animation: slideIn 0.3s ease-out;
        }

        .mobilolite-service-menu-overlay.show {
            display: flex;
        }

        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .mobilolite-menu-header {
            background: linear-gradient(135deg, #0052cc 0%, #00a3ff 100%);
            padding: 16px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-radius: 28px 28px 0 0;
            box-shadow: 0 2px 8px rgba(0, 82, 204, 0.2);
        }

        .mobilolite-menu-header .mobilolite-new-user-info {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .mobilolite-menu-header .mobilolite-new-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            overflow: hidden;
            flex-shrink: 0;
        }

        .mobilolite-menu-header .mobilolite-new-user-details h3 {
            margin: 0;
            font-size: 16px;
            font-weight: 700;
            color: white;
        }

        .mobilolite-menu-header .mobilolite-connection-status {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
            color: rgba(255, 255, 255, 0.9);
        }

        .mobilolite-menu-header .mobilolite-status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #10b981;
        }

        .mobilolite-menu-close {
            background: rgba(255, 255, 255, 0.2);
            border: none;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            color: white;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
        }

        .mobilolite-menu-close:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: rotate(90deg);
        }

        .mobilolite-menu-content {
            flex: 1;
            padding: 20px;
            overflow-y: auto;
        }

        .mobilolite-menu-section-title {
            font-size: 14px;
            font-weight: 600;
            color: #64748b;
            margin: 0 0 12px 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .mobilolite-service-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
            margin-bottom: 24px;
        }

        .mobilolite-service-card {
            background: white;
            border-radius: 16px;
            padding: 16px;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            border: 2px solid transparent;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            min-height: 120px;
            position: relative;
            overflow: hidden;
        }

        .mobilolite-service-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #0052cc, #00a3ff);
            transform: scaleX(0);
            transition: transform 0.3s ease;
        }

        .mobilolite-service-card:hover {
            transform: translateY(-4px);
            border-color: #00a3ff;
            box-shadow: 0 8px 24px rgba(0, 82, 204, 0.2);
        }

        .mobilolite-service-card:hover::before {
            transform: scaleX(1);
        }

        .mobilolite-service-icon {
            width: 48px;
            height: 48px;
            background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 12px;
            color: #0052cc;
        }

        .mobilolite-service-name {
            font-size: 13px;
            font-weight: 600;
            color: #1e293b;
            margin: 0;
            line-height: 1.3;
        }

        .mobilolite-service-desc {
            font-size: 11px;
            color: #64748b;
            margin: 4px 0 0 0;
            line-height: 1.4;
        }

        .mobilolite-quick-actions-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            margin-bottom: 20px;
        }

        .mobilolite-quick-action-btn {
            background: white;
            border: 2px solid #e2e8f0;
            border-radius: 12px;
            padding: 12px;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 13px;
            font-weight: 500;
            color: #475569;
        }

        .mobilolite-quick-action-btn:hover {
            background: #f8fafc;
            border-color: #00a3ff;
            color: #0052cc;
        }

        .mobilolite-quick-action-icon {
            width: 32px;
            height: 32px;
            background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #0052cc;
            flex-shrink: 0;
        }

        .mobilolite-menu-links {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 16px;
            justify-content: center;
        }

        .mobilolite-menu-link {
            font-size: 12px;
            color: #64748b;
            text-decoration: none;
            padding: 6px 12px;
            border-radius: 6px;
            transition: all 0.2s;
        }

        .mobilolite-menu-link:hover {
            background: white;
            color: #0052cc;
        }

        @media (max-width: 600px) {
            .mobilolite-service-menu-overlay {
                border-radius: 0;
            }
            .mobilolite-menu-header {
                border-radius: 0;
            }
        }
        `;
    }

    // Main Widget Class
    class MobiloliteWidgetNew {
        constructor(config = {}) {
            this.config = { ...DEFAULT_CONFIG, ...config };
            this.messages = [];
            this.conversationId = null;
            this.isMinimized = !this.config.autoOpen;
            this.isFullscreen = false;
            this.isDropdownOpen = false;
            this.isProcessing = false;
            this.hasStarted = true;
            // Auto logout on page refresh
            localStorage.removeItem('mobilolite_auth_token');
            this.isAuthenticated = false;
            this.isAuthenticated = false;
            this.isClockedIn = false; // Track clock in/out status
            this.helpdeskOptions = null;
            this.selectedHelpdeskCategory = null;
            this.selectedHelpdeskSubCategory = null;
            this.waitingForHelpdeskMessage = false; // Track if waiting for message input
            this.helpdeskMessage = null; // Store the message

            // Human Handoff State
            this.isHandoffMode = false;  // Whether currently in handoff mode
            this.handoffPending = false; // Waiting for user confirmation
            this.handoffWebSocket = null; // WebSocket connection for handoff
            this.handoffStatus = null; // 'waiting', 'connected', or null

            this.init();
        }

        init() {
            // Inject CSS
            const style = document.createElement('style');
            style.textContent = generateCSS();
            document.head.appendChild(style);

            // Create widget container
            this.container = document.createElement('div');
            this.container.className = 'mobilolite-new-widget';
            if (this.isMinimized) {
                this.container.classList.add('minimized');
            }


            // Apply position class
            if (this.config.position === 'bottom-left') {
                this.container.classList.add('position-left');
            }

            this.render();
            document.body.appendChild(this.container);

            // Create floating welcome bubble
            this.createWelcomeBubble();

            // Add welcome message
            if (!this.isMinimized) {
                this.addBotMessage(this.config.welcomeMessage);

                // Add suggestion chips after welcome message
                setTimeout(() => {
                    this.addSuggestionChips([
                        {
                            label: 'Our Services',
                            text: 'Tell me about your services',
                            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>'
                        },
                        {
                            label: 'Career Opportunities',
                            text: 'Show me job openings',
                            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>'
                        },
                        {
                            label: 'Contact Us',
                            text: 'I want to contact Mobiloitte',
                            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>'
                        },
                        {
                            label: 'About Mobiloitte',
                            text: 'Tell me about Mobiloitte',
                            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
                        },
                        {
                            label: 'Case Studies',
                            text: 'Show me your case studies',
                            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>'
                        },
                        {
                            label: 'I am Employee',
                            text: '__LOGIN__',
                            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>'
                        }
                    ]);
                }, 1000);
            }

            // Auto-open after 3 seconds - DISABLED (only show welcome bubble)
            // setTimeout(() => {
            //     if (this.isMinimized && window.innerWidth > 600) {
            //         this.toggleMinimize();
            //     }
            // }, 3000);

            // Show floating welcome bubble after 2 seconds
            setTimeout(() => {
                this.showWelcomeBubble();
            }, 2000);

            // Check attendance status if user is already authenticated
            const token = localStorage.getItem('mobilolite_auth_token');
            if (token) {
                this.isAuthenticated = true;
                // Check attendance status to update clock-in/out button
                this.checkAttendanceStatus();
            }

            // Check backend connection status on load
            this.checkConnection();
        }

        render() {
            this.container.innerHTML = `

                <div class="mobilolite-new-header" onclick="window.mobiloliteWidgetNew.handleHeaderClick(event)">
                    <div class="mobilolite-new-user-info">
                        <div class="mobilolite-new-avatar">
                            <img src="https://www.creativefabrica.com/wp-content/uploads/2021/07/05/Chatbot-Logo-Modern-bot-logo-Graphics-14298242-1-1-580x435.jpg" alt="Bot" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">
                        </div>
                        <div class="mobilolite-new-user-details">
                            <h3>Mobiloitte</h3>
                            <div class="mobilolite-connection-status connecting" id="mobilolite-connection-status">
                                <span class="mobilolite-connection-dot"></span>
                                <span id="mobilolite-connection-text">Connecting...</span>
                            </div>
                        </div>
                    </div>
                    <div class="mobilolite-new-header-icons">
                            <div class="mobilolite-new-icon" onclick="event.stopPropagation(); window.mobiloliteWidgetNew.toggleDropdown()">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 13C12.5523 13 13 12.5523 13 12C13 11.4477 12.5523 11 12 11C11.4477 11 11 11.4477 11 12C11 12.5523 11.4477 13 12 13Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M12 6C12.5523 6 13 5.55228 13 5C13 4.44772 12.5523 4 12 4C11.4477 4 11 4.44772 11 5C11 5.55228 11.4477 6 12 6Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M12 20C12.5523 20 13 19.5523 13 19C13 18.4477 12.5523 18 12 18C11.4477 18 11 18.4477 11 19C11 19.5523 11.4477 20 12 20Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                            <div class="mobilolite-new-dropdown" id="mobilolite-dropdown" onclick="event.stopPropagation()">
                                ${!localStorage.getItem('mobilolite_auth_token') ? `
                                    <div class="mobilolite-new-dropdown-item" onclick="window.mobiloliteWidgetNew.openLoginModal()">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                                        <polyline points="10 17 15 12 10 7"></polyline>
                                        <line x1="15" y1="12" x2="3" y2="12"></line>
                                    </svg>
                                    Login
                                    </div>
                                ` : `
                                    <div class="mobilolite-new-dropdown-item" onclick="window.mobiloliteWidgetNew.handleLogout()">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                        <polyline points="16 17 21 12 16 7"></polyline>
                                        <line x1="21" y1="12" x2="9" y2="12"></line>
                                    </svg>
                                    Logout
                                    </div>
                                    ${localStorage.getItem('mobilolite_user_type') === 'employee' ? `
                                    <a href="#" class="mobilolite-new-dropdown-item" onclick="event.preventDefault(); window.mobiloliteWidgetNew.openPayslipModal()">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                            <polyline points="14 2 14 8 20 8"></polyline>
                                            <line x1="16" y1="13" x2="8" y2="13"></line>
                                            <line x1="16" y1="17" x2="8" y2="17"></line>
                                            <polyline points="10 9 9 9 8 9"></polyline>
                                        </svg>
                                        Payslip
                                    </a>
                                    <a href="#" class="mobilolite-new-dropdown-item" onclick="event.preventDefault(); window.mobiloliteWidgetNew.openExpenseModal()">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <line x1="12" y1="1" x2="12" y2="23"></line>
                                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                                        </svg>
                                        Expenses
                                    </a>
                                    <a href="#" class="mobilolite-new-dropdown-item" onclick="event.preventDefault(); window.mobiloliteWidgetNew.openAssetRequestModal()">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                                            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                                        </svg>
                                        Asset
                                    </a>
                                    ` : ''}
                                `}
                                ${!this.isAuthenticated ? `
                                <a href="#" class="mobilolite-new-dropdown-item" onclick="event.preventDefault(); window.mobiloliteWidgetNew.sendQuickAction('I looking for a job')">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                                    </svg>
                                    Apply Job
                                </a>
                                <a href="#" class="mobilolite-new-dropdown-item" onclick="event.preventDefault(); window.mobiloliteWidgetNew.handleContactUs()">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                        <polyline points="22,6 12,13 2,6"></polyline>
                                    </svg>
                                    Contact Us
                                </a>
                                ` : ''}
                            </div>
                            <div class="mobilolite-new-icon" onclick="event.stopPropagation(); window.mobiloliteWidgetNew.toggleFullscreen()">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M15 3H21M21 3V9M21 3L14 10M9 21H3M3 21V15M3 21L10 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                            <div class="mobilolite-new-icon" onclick="event.stopPropagation(); window.mobiloliteWidgetNew.toggleMinimize()">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                    </div>
                </div>
                <div class="mobilolite-new-chat-area" onclick="event.stopPropagation()"></div>
                
                <!-- Quick Actions for Employees Only -->
                ${localStorage.getItem('mobilolite_auth_token') && localStorage.getItem('mobilolite_user_type') === 'employee' ? `
                    <div class="mobilolite-new-quick-actions">
                        <button class="mobilolite-new-quick-btn" onclick="window.mobiloliteWidgetNew.handleClockInOut()">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                            <span id="clock-btn-text">${this.isClockedIn ? 'Clock Out' : 'Clock In'}</span>
                        </button>
                        <button class="mobilolite-new-quick-btn" onclick="window.mobiloliteWidgetNew.handleViewAttendance()">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                            Attendance
                        </button>
                        <button class="mobilolite-new-quick-btn" onclick="window.mobiloliteWidgetNew.handleHelpdeskFlow()">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                                <line x1="12" y1="17" x2="12.01" y2="17"></line>
                            </svg>
                            Helpdesk Ticket
                        </button>
                        <button class="mobilolite-new-quick-btn" onclick="window.mobiloliteWidgetNew.openApplyLeaveModal()">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                                <line x1="12" y1="18" x2="12" y2="12"></line>
                                <line x1="9" y1="15" x2="15" y2="15"></line>
                            </svg>
                            Apply Leave
                        </button>
                    </div>
                ` : ''}
                
                <div class="mobilolite-new-input-area" onclick="event.stopPropagation()">
                    <div class="mobilolite-new-upload-status" id="mobilolite-upload-status">
                        <div class="mobilolite-new-upload-spinner"></div>
                        <span id="mobilolite-upload-text">Uploading resume...</span>
                    </div>
                    <div class="mobilolite-new-input-wrapper" id="mobilolite-input-wrapper">
                        <button class="mobilolite-new-hamburger-btn" onclick="window.mobiloliteWidgetNew.toggleServiceMenu()" title="Menu">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="3" y1="12" x2="21" y2="12"></line>
                                <line x1="3" y1="6" x2="21" y2="6"></line>
                                <line x1="3" y1="18" x2="21" y2="18"></line>
                            </svg>
                        </button>
                        <input 
                            type="text" 
                            class="mobilolite-new-input" 
                            placeholder="Type your message..."
                            maxlength="200"
                            oninput="window.mobiloliteWidgetNew.updateCharCounter()"
                            onkeypress="if(event.key==='Enter') window.mobiloliteWidgetNew.sendMessage()"
                        />
                        <button class="mobilolite-new-send-btn" onclick="window.mobiloliteWidgetNew.sendMessage()">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" style="transform: rotate(45deg); margin-left: -2px;">
                                <path d="M2 10l16-8-8 16-2-8-6-0z"/>
                            </svg>
                        </button>
                    </div>
                    <div class="mobilolite-new-validation-message" id="mobilolite-validation-message">
                        ⚠️ Message cannot exceed 200 characters
                    </div>
                    <div class="mobilolite-new-powered-by">
                        <a href="https://www.mobiloitte.com/privacy-policy" target="_blank" rel="noopener noreferrer">Terms & Conditions</a>
                        <span style="margin: 0 8px; color: #94a3b8;">|</span>
                        <strong>Powered By</strong> <a href="https://converiqo.ai/" target="_blank" rel="noopener noreferrer">Converiqo.ai</a>
                    </div>
                </div>
                
                <!-- Service Menu Overlay -->
                <div class="mobilolite-service-menu-overlay" id="mobilolite-service-menu" onclick="event.stopPropagation()">
                    <div class="mobilolite-menu-header">
                        <div class="mobilolite-new-user-info">
                            <div class="mobilolite-new-avatar">
                                <img src="https://www.creativefabrica.com/wp-content/uploads/2021/07/05/Chatbot-Logo-Modern-bot-logo-Graphics-14298242-1-1-580x435.jpg" alt="Bot" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">
                            </div>
                            <div class="mobilolite-new-user-details">
                                <h3>Mobiloitte</h3>
                                <div class="mobilolite-connection-status online">
                                    <span class="mobilolite-status-dot"></span>
                                    <span>We're online!</span>
                                </div>
                            </div>
                        </div>
                        <button class="mobilolite-menu-close" onclick="window.mobiloliteWidgetNew.closeServiceMenu()">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                    <div class="mobilolite-menu-content">
                        <p class="mobilolite-menu-section-title">Technology Services</p>
                        <div class="mobilolite-service-grid">
                            <div class="mobilolite-service-card" onclick="window.mobiloliteWidgetNew.selectService('AI/ML Development')">
                                <div class="mobilolite-service-icon">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                                        <path d="M2 17l10 5 10-5M2 12l10 5 10-5"></path>
                                    </svg>
                                </div>
                                <p class="mobilolite-service-name">AI/ML Solutions</p>
                                <p class="mobilolite-service-desc">Intelligent automation</p>
                            </div>
                            <div class="mobilolite-service-card" onclick="window.mobiloliteWidgetNew.selectService('Blockchain Development')">
                                <div class="mobilolite-service-icon">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <rect x="3" y="3" width="7" height="7"></rect>
                                        <rect x="14" y="3" width="7" height="7"></rect>
                                        <rect x="14" y="14" width="7" height="7"></rect>
                                        <rect x="3" y="14" width="7" height="7"></rect>
                                    </svg>
                                </div>
                                <p class="mobilolite-service-name">Blockchain</p>
                                <p class="mobilolite-service-desc">Web3 solutions</p>
                            </div>
                            <div class="mobilolite-service-card" onclick="window.mobiloliteWidgetNew.selectService('Web & Mobile App Development')">
                                <div class="mobilolite-service-icon">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                                        <line x1="8" y1="21" x2="16" y2="21"></line>
                                        <line x1="12" y1="17" x2="12" y2="21"></line>
                                    </svg>
                                </div>
                                <p class="mobilolite-service-name">Web & Mobile</p>
                                <p class="mobilolite-service-desc">App development</p>
                            </div>
                            <div class="mobilolite-service-card" onclick="window.mobiloliteWidgetNew.selectService('Cloud & DevOps')">
                                <div class="mobilolite-service-icon">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path>
                                    </svg>
                                </div>
                                <p class="mobilolite-service-name">Cloud & DevOps</p>
                                <p class="mobilolite-service-desc">Infrastructure</p>
                            </div>
                            <div class="mobilolite-service-card" onclick="window.mobiloliteWidgetNew.selectService('AR/VR & Metaverse')">
                                <div class="mobilolite-service-icon">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"></path>
                                        <circle cx="12" cy="12" r="3"></circle>
                                    </svg>
                                </div>
                                <p class="mobilolite-service-name">AR/VR</p>
                                <p class="mobilolite-service-desc">Immersive tech</p>
                            </div>
                            <div class="mobilolite-service-card" onclick="window.mobiloliteWidgetNew.selectService('IoT & Smart Devices')">
                                <div class="mobilolite-service-icon">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <circle cx="12" cy="12" r="2"></circle>
                                        <path d="M12 1v6m0 6v6M5.93 5.93l4.24 4.24m5.66 5.66l4.24 4.24M1 12h6m6 0h6M5.93 18.07l4.24-4.24m5.66-5.66l4.24-4.24"></path>
                                    </svg>
                                </div>
                                <p class="mobilolite-service-name">IoT Solutions</p>
                                <p class="mobilolite-service-desc">Smart devices</p>
                            </div>
                            <div class="mobilolite-service-card" onclick="window.mobiloliteWidgetNew.selectService('Game Development')">
                                <div class="mobilolite-service-icon">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <line x1="6" y1="11" x2="10" y2="11"></line>
                                        <line x1="8" y1="9" x2="8" y2="13"></line>
                                        <line x1="15" y1="12" x2="15.01" y2="12"></line>
                                        <line x1="18" y1="10" x2="18.01" y2="10"></line>
                                        <path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z"></path>
                                    </svg>
                                </div>
                                <p class="mobilolite-service-name">Game Dev</p>
                                <p class="mobilolite-service-desc">Gaming solutions</p>
                            </div>
                            <div class="mobilolite-service-card" onclick="window.mobiloliteWidgetNew.selectService('Cybersecurity')">
                                <div class="mobilolite-service-icon">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                                    </svg>
                                </div>
                                <p class="mobilolite-service-name">Cybersecurity</p>
                                <p class="mobilolite-service-desc">Security services</p>
                            </div>
                        </div>

                        <p class="mobilolite-menu-section-title">Quick Actions</p>
                        <div class="mobilolite-quick-actions-grid">
                            <button class="mobilolite-quick-action-btn" onclick="window.mobiloliteWidgetNew.quickAction('chat')">
                                <div class="mobilolite-quick-action-icon">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                    </svg>
                                </div>
                                <span>Chat with Bot</span>
                            </button>
                            <button class="mobilolite-quick-action-btn" onclick="window.mobiloliteWidgetNew.quickAction('contact')">
                                <div class="mobilolite-quick-action-icon">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                        <polyline points="22,6 12,13 2,6"></polyline>
                                    </svg>
                                </div>
                                <span>Contact Us</span>
                            </button>
                            <button class="mobilolite-quick-action-btn" onclick="window.mobiloliteWidgetNew.quickAction('employee')">
                                <div class="mobilolite-quick-action-icon">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                        <circle cx="12" cy="7" r="4"></circle>
                                    </svg>
                                </div>
                                <span>Employee Portal</span>
                            </button>
                            <button class="mobilolite-quick-action-btn" onclick="window.mobiloliteWidgetNew.quickAction('customer')">
                                <div class="mobilolite-quick-action-icon">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                        <circle cx="9" cy="7" r="4"></circle>
                                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                    </svg>
                                </div>
                                <span>Customer Portal</span>
                            </button>
                        </div>

                        <div class="mobilolite-menu-links">
                            <a href="https://www.mobiloitte.com/about-us" target="_blank" class="mobilolite-menu-link">About Us</a>
                            <a href="https://www.mobiloitte.com/careers" target="_blank" class="mobilolite-menu-link">Careers</a>
                            <a href="https://www.mobiloitte.com/case-studies" target="_blank" class="mobilolite-menu-link">Case Studies</a>
                        </div>
                    </div>
                </div>
                
                <!-- Login Modal -->
                <div class="mobilolite-new-modal-overlay" id="mobilolite-login-modal">
                    <div class="mobilolite-new-modal" onclick="event.stopPropagation()">
                        <div class="mobilolite-new-modal-header">
                            <h3 class="mobilolite-new-modal-title">Login</h3>
                            <button class="mobilolite-new-modal-close" onclick="window.mobiloliteWidgetNew.closeLoginModal()">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                        <form onsubmit="event.preventDefault(); window.mobiloliteWidgetNew.handleLogin(event)">
                            <div class="mobilolite-new-form-group">
                                <label class="mobilolite-new-form-label">Login As</label>
                                <div style="display: flex; gap: 20px; margin-top: 8px;">
                                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 14px; color: #475569;">
                                        <input type="radio" name="userType" value="customer" style="cursor: pointer; width: 18px; height: 18px;">
                                        <span>Customer</span>
                                    </label>
                                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 14px; color: #475569;">
                                        <input type="radio" name="userType" value="employee" checked style="cursor: pointer; width: 18px; height: 18px;">
                                        <span>Employee</span>
                                    </label>
                                </div>
                            </div>
                            <div class="mobilolite-new-form-group">
                                <label class="mobilolite-new-form-label">Email</label>
                                <input type="email" id="mobilolite-login-email" class="mobilolite-new-form-input" placeholder="Enter your email" required oninput="window.mobiloliteWidgetNew.validateLoginForm()">
                            </div>
                            <div class="mobilolite-new-form-group">
                                <label class="mobilolite-new-form-label">Password</label>
                                <div class="mobilolite-new-password-wrapper">
                                    <input type="password" id="mobilolite-login-password" class="mobilolite-new-form-input" placeholder="Enter your password" required style="padding-right: 40px;" oninput="window.mobiloliteWidgetNew.validateLoginForm()">
                                    <button type="button" class="mobilolite-new-password-toggle" onclick="window.mobiloliteWidgetNew.togglePasswordVisibility()">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="eye-icon">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                            <circle cx="12" cy="12" r="3"></circle>
                                        </svg>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="eye-off-icon" style="display: none;">
                                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                            <line x1="1" y1="1" x2="23" y2="23"></line>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <button type="submit" id="mobilolite-login-btn" class="mobilolite-new-btn-primary" disabled>Login</button>
                        </form>
                    </div>
                </div>

                <!-- Apply Leave Modal -->
                <div class="mobilolite-leave-modal-overlay" id="mobilolite-leave-modal">
                    <div class="mobilolite-leave-modal" onclick="event.stopPropagation()">
                        <div class="mobilolite-leave-modal-header">
                            <h3 class="mobilolite-leave-modal-title">Apply for Leave</h3>
                            <button class="mobilolite-leave-modal-close" onclick="window.mobiloliteWidgetNew.closeApplyLeaveModal()">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                        <form onsubmit="event.preventDefault(); window.mobiloliteWidgetNew.handleApplyLeaveSubmit(event)">
                            <div class="mobilolite-leave-form-group">
                                <label class="mobilolite-leave-form-label">Leave Type <span style="color: red;">*</span></label>
                                <select class="mobilolite-leave-form-select" name="type" required onchange="window.mobiloliteWidgetNew.validateLeaveForm()">
                                    <option value="" disabled selected>Select leave type</option>
                                    <option value="Annual Leave">Annual Leave</option>
                                    <option value="Sick Leave">Sick Leave</option>
                                    <option value="Casual Leave">Casual Leave</option>
                                    <option value="Emergency Leave">Emergency Leave</option>
                                    <option value="Maternity Leave">Maternity Leave</option>
                                    <option value="Paternity Leave">Paternity Leave</option>
                                </select>
                            </div>
                            <div class="mobilolite-leave-form-group">
                                <label class="mobilolite-leave-form-label">Start Date <span style="color: red;">*</span></label>
                                <input type="date" class="mobilolite-leave-form-input" name="start" required onclick="try{this.showPicker()}catch(e){}" onchange="window.mobiloliteWidgetNew.validateLeaveForm()" min="${new Date().toISOString().split('T')[0]}">
                            </div>
                            <div class="mobilolite-leave-form-group">
                                <label class="mobilolite-leave-form-label">End Date <span style="color: red;">*</span></label>
                                <input type="date" class="mobilolite-leave-form-input" name="end" required onclick="try{this.showPicker()}catch(e){}" onchange="window.mobiloliteWidgetNew.validateLeaveForm()" min="${new Date().toISOString().split('T')[0]}">
                            </div>
                            <div class="mobilolite-leave-duration-error" id="leave-duration-error">
                                ⚠️ Annual Leave cannot exceed 15 days
                            </div>
                            <div class="mobilolite-leave-form-group">
                                <label class="mobilolite-leave-form-label">Reason <span style="color: red;">*</span></label>
                                <textarea class="mobilolite-leave-form-textarea" name="reason" placeholder="Please provide a reason for your leave" required maxlength="200" oninput="window.mobiloliteWidgetNew.updateLeaveReasonCounter(this); window.mobiloliteWidgetNew.validateLeaveForm();"></textarea>
                                <div class="mobilolite-new-char-counter" id="leave-reason-counter" style="margin-top: 4px;">
                                    0 / 200
                                </div>
                            </div>
                            <button type="submit" class="mobilolite-leave-btn-primary" id="leave-submit-btn" disabled>Submit Application</button>
                        </form>
                    </div>
                </div>

                <!-- Asset Request Modal -->
                <div class="mobilolite-leave-modal-overlay" id="mobilolite-asset-modal">
                    <div class="mobilolite-leave-modal" onclick="event.stopPropagation()">
                        <div class="mobilolite-leave-modal-header">
                            <h3 class="mobilolite-leave-modal-title">Request Asset</h3>
                            <button class="mobilolite-leave-modal-close" onclick="window.mobiloliteWidgetNew.closeAssetRequestModal()">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                        <form onsubmit="event.preventDefault(); window.mobiloliteWidgetNew.handleAssetRequestSubmit(event)">
                            <div class="mobilolite-leave-form-group">
                                <label class="mobilolite-leave-form-label">Asset Type <span style="color: red;">*</span></label>
                                <select class="mobilolite-leave-form-select" name="assetType" required onchange="window.mobiloliteWidgetNew.validateAssetForm()">
                                    <option value="" disabled selected>Select asset type</option>
                                    <option value="Hardware">Hardware</option>
                                    <option value="Software">Software</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div class="mobilolite-leave-form-group">
                                <label class="mobilolite-leave-form-label">Asset Name <span style="color: red;">*</span></label>
                                <input type="text" class="mobilolite-leave-form-input" name="assetName" placeholder="e.g., Laptop, Monitor, MS Office License" required oninput="window.mobiloliteWidgetNew.validateAssetForm()">
                            </div>
                            <div class="mobilolite-leave-form-group">
                                <label class="mobilolite-leave-form-label">Justification <span style="color: red;">*</span></label>
                                <textarea class="mobilolite-leave-form-textarea" name="justification" placeholder="Please provide a reason for this asset request" required rows="4" maxlength="200" oninput="window.mobiloliteWidgetNew.updateAssetJustificationCounter(this); window.mobiloliteWidgetNew.validateAssetForm();"></textarea>
                                <div class="mobilolite-new-char-counter" id="asset-justification-counter" style="margin-top: 4px;">
                                    0 / 200
                                </div>
                            </div>
                            <button type="submit" class="mobilolite-leave-btn-primary" id="asset-submit-btn" disabled>Submit Request</button>
                        </form>
                    </div>
                </div>

                <!-- Expense Modal -->
                <div class="mobilolite-leave-modal-overlay" id="mobilolite-expense-modal">
                    <div class="mobilolite-leave-modal" onclick="event.stopPropagation()">
                        <div class="mobilolite-leave-modal-header">
                            <h3 class="mobilolite-leave-modal-title">Submit Expense</h3>
                            <button class="mobilolite-leave-modal-close" onclick="window.mobiloliteWidgetNew.closeExpenseModal()">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                        <form onsubmit="event.preventDefault(); window.mobiloliteWidgetNew.handleExpenseSubmit(event)">
                            <div class="mobilolite-leave-form-group">
                                <label class="mobilolite-leave-form-label">Title <span style="color: red;">*</span></label>
                                <input type="text" class="mobilolite-leave-form-input" name="title" placeholder="e.g., Client Meeting Lunch" required maxlength="200" oninput="window.mobiloliteWidgetNew.updateExpenseTitleCounter(this); window.mobiloliteWidgetNew.validateExpenseForm();">
                                <div class="mobilolite-new-char-counter" id="expense-title-counter" style="margin-top: 4px;">
                                    0 / 200
                                </div>
                            </div>
                            <div class="mobilolite-leave-form-group">
                                <label class="mobilolite-leave-form-label">Category <span style="color: red;">*</span></label>
                                <select class="mobilolite-leave-form-select" name="category" required onchange="window.mobiloliteWidgetNew.validateExpenseForm()">
                                    <option value="" disabled selected>Select category</option>
                                    <option value="Meal">Meal</option>
                                    <option value="Travel">Travel</option>
                                    <option value="Accommodation">Accommodation</option>
                                    <option value="Office Supplies">Office Supplies</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div class="mobilolite-leave-form-group">
                                <label class="mobilolite-leave-form-label">Amount <span style="color: red;">*</span></label>
                                <input type="number" class="mobilolite-leave-form-input" name="amount" placeholder="0.00" step="0.01" min="0" required oninput="window.mobiloliteWidgetNew.validateExpenseForm()">
                            </div>
                            <div class="mobilolite-leave-form-group">
                                <label class="mobilolite-leave-form-label">Currency <span style="color: red;">*</span></label>
                                <select class="mobilolite-leave-form-select" name="currency" required onchange="window.mobiloliteWidgetNew.validateExpenseForm()">
                                    <option value="" disabled selected>Select currency</option>
                                    <option value="INR" selected>INR</option>
                                    <option value="USD">USD</option>
                                    <option value="EUR">EUR</option>
                                    <option value="GBP">GBP</option>
                                </select>
                            </div>
                            <div class="mobilolite-leave-form-group">
                                <label class="mobilolite-leave-form-label">Date <span style="color: red;">*</span></label>
                                <input type="date" class="mobilolite-leave-form-input" name="date" required onclick="try{this.showPicker()}catch(e){}" onchange="window.mobiloliteWidgetNew.validateExpenseForm()" min="${new Date().toISOString().split('T')[0]}">
                            </div>
                            <div class="mobilolite-leave-form-group">
                                <label class="mobilolite-leave-form-label">Description <span style="color: red;">*</span></label>
                                <textarea class="mobilolite-leave-form-textarea" name="description" placeholder="Provide details about this expense" required rows="3" maxlength="200" oninput="window.mobiloliteWidgetNew.updateExpenseDescriptionCounter(this); window.mobiloliteWidgetNew.validateExpenseForm();"></textarea>
                                <div class="mobilolite-new-char-counter" id="expense-description-counter" style="margin-top: 4px;">
                                    0 / 200
                                </div>
                            </div>
                            <div class="mobilolite-leave-form-group">
                                <label class="mobilolite-leave-form-label">Receipt (Optional)</label>
                                <input type="file" class="mobilolite-leave-form-input" name="receipt" accept="image/*,.pdf">
                            </div>
                            <button type="submit" class="mobilolite-leave-btn-primary" id="expense-submit-btn" disabled>Submit Expense</button>
                        </form>
                    </div>
                </div>

                <!-- Payslip Request Modal -->
                <div class="mobilolite-leave-modal-overlay" id="mobilolite-payslip-modal">
                    <div class="mobilolite-leave-modal" onclick="event.stopPropagation()">
                        <div class="mobilolite-leave-modal-header">
                            <h3 class="mobilolite-leave-modal-title">Request Payslip</h3>
                            <button class="mobilolite-leave-modal-close" onclick="window.mobiloliteWidgetNew.closePayslipModal()">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                        <form onsubmit="event.preventDefault(); window.mobiloliteWidgetNew.handlePayslipRequest(event)">
                            <div class="mobilolite-leave-form-group">
                                <label class="mobilolite-leave-form-label">Month <span style="color: red;">*</span></label>
                                <select class="mobilolite-leave-form-select" name="month" required>
                                    <option value="" disabled selected>Select month</option>
                                    <option value="01">January</option>
                                    <option value="02">February</option>
                                    <option value="03">March</option>
                                    <option value="04">April</option>
                                    <option value="05">May</option>
                                    <option value="06">June</option>
                                    <option value="07">July</option>
                                    <option value="08">August</option>
                                    <option value="09">September</option>
                                    <option value="10">October</option>
                                    <option value="11">November</option>
                                    <option value="12">December</option>
                                </select>
                            </div>
                            <div class="mobilolite-leave-form-group">
                                <label class="mobilolite-leave-form-label">Year <span style="color: red;">*</span></label>
                                <select class="mobilolite-leave-form-select" name="year" required>
                                    <option value="" disabled selected>Select year</option>
                                </select>
                            </div>
                            <button type="submit" class="mobilolite-leave-btn-primary">Request Payslip</button>
                        </form>
                    </div>
                </div>
            `;

            // Re-render messages if any
            if (this.messages.length > 0) {
                this.renderMessages();
            }

            // Add click handler for minimized state
            if (this.isMinimized) {
                this.container.onclick = () => this.toggleMinimize();
            } else {
                this.container.onclick = null;
            }

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (this.isDropdownOpen && !e.target.closest('.mobilolite-new-icon') && !e.target.closest('.mobilolite-new-dropdown')) {
                    this.closeDropdown();
                }
            });
        }

        toggleDropdown() {
            this.isDropdownOpen = !this.isDropdownOpen;
            const dropdown = this.container.querySelector('#mobilolite-dropdown');
            if (dropdown) {
                if (this.isDropdownOpen) {
                    dropdown.classList.add('show');
                } else {
                    dropdown.classList.remove('show');
                }
            }
        }

        // Service Menu Methods
        toggleServiceMenu() {
            const menu = this.container.querySelector('#mobilolite-service-menu');
            if (menu) {
                const isShown = menu.classList.contains('show');
                if (isShown) {
                    menu.classList.remove('show');
                } else {
                    menu.classList.add('show');
                    // Close dropdown if open
                    this.closeDropdown();
                }
            }
        }

        closeServiceMenu() {
            const menu = this.container.querySelector('#mobilolite-service-menu');
            if (menu) {
                menu.classList.remove('show');
            }
        }

        selectService(serviceName) {
            // Close the menu
            this.closeServiceMenu();

            // Send a message about the selected service
            const serviceMessages = {
                'AI/ML Development': 'Tell me about your AI/ML development services',
                'Blockchain Development': 'I\'m interested in blockchain solutions',
                'Web & Mobile App Development': 'Tell me about web and mobile app development',
                'Cloud & DevOps': 'I want to know about cloud and DevOps services',
                'AR/VR & Metaverse': 'Tell me about AR/VR and metaverse solutions',
                'IoT & Smart Devices': 'I\'m interested in IoT and smart device solutions',
                'Game Development': 'Tell me about game development services',
                'Cybersecurity': 'I want to know about cybersecurity services'
            };

            const message = serviceMessages[serviceName] || `Tell me about ${serviceName}`;

            // Set input value and trigger send after a brief delay
            setTimeout(() => {
                const input = this.container.querySelector('.mobilolite-new-input');
                if (input) {
                    input.value = message;
                    this.sendMessage();
                }
            }, 100);
        }

        quickAction(action) {
            this.closeServiceMenu();

            if (action === 'chat') {
                // Just close the menu and let user type
                setTimeout(() => {
                    const input = this.container.querySelector('.mobilolite-new-input');
                    if (input) {
                        input.focus();
                    }
                }, 100);
            } else if (action === 'contact') {
                setTimeout(() => {
                    const input = this.container.querySelector('.mobilolite-new-input');
                    if (input) {
                        input.value = 'I want to contact Mobiloitte';
                        this.sendMessage();
                    }
                }, 100);
            }
        }

        closeDropdown() {
            this.isDropdownOpen = false;
            const dropdown = this.container.querySelector('#mobilolite-dropdown');
            if (dropdown) {
                dropdown.classList.remove('show');
            }
        }

        createWelcomeBubble() {
            // Array of welcome messages to rotate through
            this.welcomeMessages = [
                "Hi, I am Sara, Mobiloitte's virtual agent.<br>How Can I help you today?",
                "Need assistance?<br>I'm here to help!",
                "Have questions about jobs?<br>Let's chat!",
                "Looking for information?<br>Ask me anything!"
            ];
            this.currentMessageIndex = 0;
            this.bubbleRotationInterval = null;

            // Create welcome bubble element
            const bubble = document.createElement('div');
            bubble.className = 'mobilolite-welcome-bubble';
            bubble.id = 'mobilolite-welcome-bubble';
            bubble.innerHTML = `
                <button class="mobilolite-welcome-bubble-close" onclick="window.mobiloliteWidgetNew.hideWelcomeBubble()">×</button>
                <span id="mobilolite-bubble-message" style="transition: opacity 0.3s;">${this.welcomeMessages[0]}</span>
            `;

            // Add click handler to open chat
            bubble.onclick = (e) => {
                if (!e.target.classList.contains('mobilolite-welcome-bubble-close')) {
                    this.hideWelcomeBubble();
                    if (this.isMinimized) {
                        this.toggleMinimize();
                    }
                }
            };

            document.body.appendChild(bubble);
        }

        showWelcomeBubble() {
            const bubble = document.getElementById('mobilolite-welcome-bubble');
            if (bubble && this.isMinimized) {
                bubble.classList.add('show');

                // Start rotating messages every 5 seconds - infinite loop
                this.bubbleRotationInterval = setInterval(() => {
                    this.rotateWelcomeMessage();
                }, 5000);
            }
        }

        rotateWelcomeMessage() {
            const messageEl = document.getElementById('mobilolite-bubble-message');
            if (messageEl && this.isMinimized) {
                // Move to next message
                this.currentMessageIndex = (this.currentMessageIndex + 1) % this.welcomeMessages.length;

                // Fade out
                messageEl.style.opacity = '0';

                // Change message and fade in
                setTimeout(() => {
                    messageEl.innerHTML = this.welcomeMessages[this.currentMessageIndex];
                    messageEl.style.opacity = '1';
                }, 300);
            }
        }

        hideWelcomeBubble() {
            const bubble = document.getElementById('mobilolite-welcome-bubble');
            if (bubble) {
                bubble.classList.remove('show');
                // Clear rotation interval
                if (this.bubbleRotationInterval) {
                    clearInterval(this.bubbleRotationInterval);
                    this.bubbleRotationInterval = null;
                }
                // Reset to first message
                this.currentMessageIndex = 0;
            }
        }

        openLoginModal() {
            this.closeDropdown();
            const modal = this.container.querySelector('#mobilolite-login-modal');
            if (modal) {
                modal.classList.add('show');
            }
        }

        closeLoginModal() {
            const modal = this.container.querySelector('#mobilolite-login-modal');
            if (modal) {
                modal.classList.remove('show');
            }
        }

        async handleLogin(event) {
            event.preventDefault();
            const form = event.target;
            console.log('Login form submitted');

            const emailInput = form.querySelector('input[type="email"]');
            // Try multiple selectors for password to be safe
            const passwordInput = form.querySelector('.mobilolite-new-password-wrapper input') ||
                form.querySelector('input[type="password"]') ||
                form.querySelector('input[placeholder*="password"]');

            // Get selected user type
            const userTypeInput = form.querySelector('input[name="userType"]:checked');
            const userType = userTypeInput ? userTypeInput.value : 'employee';

            if (!emailInput) {
                console.error('Email input not found');
                return;
            }
            if (!passwordInput) {
                console.error('Password input not found');
                alert('Internal Error: Could not find password field. Please refresh and try again.');
                return;
            }

            const btn = form.querySelector('button[type="submit"]');
            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();

            if (!email || !password) return;

            const originalText = btn.textContent;
            btn.textContent = 'Logging in...';
            btn.disabled = true;

            try {
                const response = await fetch('https://py-mobiloitte.converiqo.ai/login', {
                    method: 'POST',
                    headers: {
                        'accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email: email,
                        password: password,
                        user_type: userType
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    console.log('Login successful:', data);
                    // Store token if needed
                    if (data.token) {
                        localStorage.setItem('mobilolite_auth_token', data.token);
                        localStorage.setItem('mobilolite_user_type', userType);

                        let completeUserData = { ...data };

                        // Fetch employee data only for employees
                        if (userType === 'employee') {
                            // Fetch complete employee data from employees API
                            const employeeData = await this.fetchEmployeeData(email, data.token);

                            // Merge login data with employee data
                            completeUserData = {
                                ...data,
                                ...employeeData
                            };

                            // Also store individual fields for easy access
                            if (employeeData) {
                                if (employeeData.emp_id) localStorage.setItem('employeeCode', employeeData.emp_id);
                                if (employeeData.full_name) localStorage.setItem('full_name', employeeData.full_name);
                                if (employeeData.department) localStorage.setItem('department', employeeData.department);
                                if (employeeData.phone) localStorage.setItem('phone', employeeData.phone);
                                if (employeeData.email) localStorage.setItem('email', employeeData.email);
                            }

                            // Check attendance status after login to update clock-in/out button
                            await this.checkAttendanceStatus();
                        } else {
                            // For customers, just store basic info
                            localStorage.setItem('email', email);
                        }

                        // Store complete user data
                        localStorage.setItem('mobilolite_user_details', JSON.stringify(completeUserData));

                        this.isAuthenticated = true;
                        // Re-render to update dropdown
                        this.render();
                        // Re-open chat if it was closed by render
                        this.container.classList.remove('not-started');

                        // Get employee name for personalized welcome message
                        const employeeName = completeUserData.full_name || completeUserData.name || 'User';

                        this.closeLoginModal();
                        this.addBotMessage(`Login successful! Welcome back, ${employeeName}.`);
                    } else {
                        // No token received
                        this.closeLoginModal();
                        this.addBotMessage(`Login successful! Welcome back.`);
                    }

                    // Clear inputs
                    emailInput.value = '';
                    passwordInput.value = '';
                } else {
                    console.error('Login failed:', data);

                    // Provide user-friendly error messages
                    let errorMessage = 'Unable to login. ';

                    if (data.message) {
                        const msg = data.message.toLowerCase();
                        if (msg.includes('credential') || msg.includes('password') || msg.includes('invalid')) {
                            errorMessage = 'Invalid email or password. Please check your credentials and try again.';
                        } else if (msg.includes('not found') || msg.includes('user')) {
                            errorMessage = 'Account not found. Please check your email address or contact support.';
                        } else if (msg.includes('blocked') || msg.includes('disabled')) {
                            errorMessage = 'Your account has been disabled. Please contact support for assistance.';
                        } else {
                            errorMessage += data.message;
                        }
                    } else {
                        errorMessage = 'Login failed. Please check your email and password, then try again.';
                    }

                    alert(errorMessage);
                }
            } catch (error) {
                console.error('Login error:', error);
                alert('Unable to connect to the server. Please check your internet connection and try again.');
            } finally {
                btn.textContent = originalText;
                btn.disabled = false;
            }
        }

        async fetchEmployeeData(email, token) {
            try {
                console.log('Fetching employee data for:', email);

                // Query employees API with email parameter
                const response = await fetch(`https://py-mobiloitte.converiqo.ai/api/v1/employees/?email=${encodeURIComponent(email)}&page=1&size=10`, {
                    method: 'GET',
                    headers: {
                        'accept': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const result = await response.json();
                    console.log('Employee API response:', result);

                    // Check if we got employee data
                    if (result.data && result.data.length > 0) {
                        const employeeInfo = result.data[0];
                        console.log('Employee data found:', employeeInfo);

                        return {
                            emp_id: employeeInfo.emp_id,
                            employeeCode: employeeInfo.emp_id,
                            employee_code: employeeInfo.emp_id,
                            full_name: employeeInfo.full_name,
                            name: employeeInfo.full_name,
                            email: employeeInfo.email,
                            phone: employeeInfo.phone,
                            department: employeeInfo.department,
                            designation: 'Employee', // Default designation
                            has_rbac_account: employeeInfo.has_rbac_account,
                            number_of_projects: employeeInfo.number_of_projects
                        };
                    } else {
                        console.warn('No employee data found for email:', email);
                        return null;
                    }
                } else {
                    console.error('Failed to fetch employee data:', response.status);
                    return null;
                }
            } catch (error) {
                console.error('Error fetching employee data:', error);
                return null;
            }
        }

        async handleLogout() {
            this.closeDropdown();
            try {
                const response = await fetch('https://py-mobiloitte.converiqo.ai/logout', {
                    method: 'POST',
                    headers: {
                        'accept': 'application/json'
                    },
                    body: ''
                });

                if (response.ok) {
                    localStorage.removeItem('mobilolite_auth_token');
                    localStorage.removeItem('mobilolite_user_details');
                    // Clear employee data
                    localStorage.removeItem('employeeCode');
                    localStorage.removeItem('employee_code');
                    localStorage.removeItem('full_name');
                    localStorage.removeItem('name');
                    localStorage.removeItem('department');
                    localStorage.removeItem('phone');
                    localStorage.removeItem('email');
                    localStorage.removeItem('designation');
                    this.isAuthenticated = false;
                    this.addBotMessage('Logout successful.');
                    this.render();

                } else {
                    console.error('Logout failed');
                    this.addBotMessage('Logout failed. Please try again.');
                }
            } catch (error) {
                console.error('Logout error:', error);
                // Force logout on error
                localStorage.removeItem('mobilolite_auth_token');
                localStorage.removeItem('mobilolite_user_details');
                // Clear employee data
                localStorage.removeItem('employeeCode');
                localStorage.removeItem('employee_code');
                localStorage.removeItem('full_name');
                localStorage.removeItem('name');
                localStorage.removeItem('department');
                localStorage.removeItem('phone');
                localStorage.removeItem('email');
                localStorage.removeItem('designation');
                this.isAuthenticated = false;
                this.render();
                this.container.classList.remove('not-started');
            }
        }

        togglePasswordVisibility() {
            const passwordInput = this.container.querySelector('input[type="password"], input[type="text"].mobilolite-new-form-input');
            const eyeIcon = this.container.querySelector('.eye-icon');
            const eyeOffIcon = this.container.querySelector('.eye-off-icon');

            if (!passwordInput) return;

            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                if (eyeIcon) eyeIcon.style.display = 'none';
                if (eyeOffIcon) eyeOffIcon.style.display = 'block';
            } else {
                passwordInput.type = 'password';
                if (eyeIcon) eyeIcon.style.display = 'block';
                if (eyeOffIcon) eyeOffIcon.style.display = 'none';
            }
        }

        validateLoginForm() {
            const emailInput = this.container.querySelector('#mobilolite-login-email');
            const passwordInput = this.container.querySelector('#mobilolite-login-password');
            const loginBtn = this.container.querySelector('#mobilolite-login-btn');

            if (!emailInput || !passwordInput || !loginBtn) return;

            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();

            // Enable button only if both fields are filled
            const isValid = email.length > 0 && password.length > 0;
            loginBtn.disabled = !isValid;
        }

        toggleStartButton() {
            const checkbox = this.container.querySelector('#terms-checkbox');
            const button = this.container.querySelector('#get-started-btn');

            if (checkbox && button) {
                if (checkbox.checked) {
                    button.disabled = false;
                    button.style.opacity = '1';
                    button.style.cursor = 'pointer';
                } else {
                    button.disabled = true;
                    button.style.opacity = '0.5';
                    button.style.cursor = 'not-allowed';
                }
            }
        }

        async handleClockInOut() {
            if (this.isClockedIn) {
                await this.handleClockOut();
            } else {
                await this.handleClockIn();
            }
        }

        async handleClockIn() {
            try {
                // Get user email
                const email = this.getUserEmail();
                if (!email) {
                    this.addBotMessage('❌ Email not found. Please login again.');
                    return;
                }

                this.addBotMessage('Clocking in...');

                try {
                    // Call clock-in API - backend automatically detects location from IP
                    const response = await fetch(`https://py-mobiloitte.converiqo.ai/api/v1/attendance/clock-in?email=${encodeURIComponent(email)}`, {
                        method: 'POST',
                        headers: {
                            'accept': 'application/json',
                            'Content-Type': 'application/json'
                        }
                    });

                    let data;
                    try {
                        data = await response.json();
                    } catch (parseError) {
                        console.error('Failed to parse response:', parseError);
                        this.addBotMessage('❌ Clock in failed: Invalid response from server.');
                        return;
                    }

                    if (response.ok && data.success && data.data) {
                        this.isClockedIn = true;
                        this.updateClockButton();

                        const record = data.data;

                        // Format clock-in time
                        let clockInTime = 'N/A';
                        if (record.clockIn) {
                            try {
                                const clockInDate = new Date(record.clockIn);
                                clockInTime = clockInDate.toLocaleTimeString('en-US', {
                                    hour12: false,
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit'
                                });
                            } catch (e) {
                                clockInTime = record.clockIn;
                            }
                        }

                        // Format late_by time
                        let lateByText = '';
                        if (record.lateByMinutes && record.lateByMinutes > 0) {
                            lateByText = `\nLate by: ${record.lateBy || this.formatMinutesToHoursMinutes(record.lateByMinutes)}`;
                        }

                        const message = `✅ Clock in successful!\n\n` +
                            `Time: ${clockInTime}\n` +
                            `Date: ${record.date || 'N/A'}\n` +
                            `Status: ${record.clockInStatus === 'on-time' ? 'On Time' : record.clockInStatus || 'Present'}` +
                            lateByText;
                        this.addBotMessage(message);

                        // Verify state with server after successful clock-in
                        setTimeout(() => {
                            this.checkAttendanceStatus();
                        }, 1000);
                    } else {
                        // Extract error message from various possible formats
                        let errorMsg = 'Unknown error';
                        if (data.detail) {
                            errorMsg = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
                        } else if (data.message) {
                            errorMsg = data.message;
                        } else if (data.error) {
                            errorMsg = data.error;
                        }
                        this.addBotMessage(`❌ Clock in failed: ${errorMsg}`);
                    }
                } catch (error) {
                    console.error('Clock in error:', error);
                    this.addBotMessage('❌ Failed to clock in. Please try again.');
                }
            } catch (error) {
                console.error('Clock in error:', error);
                this.addBotMessage('❌ An error occurred. Please try again.');
            }
        }

        async handleClockOut() {
            try {
                // Get user email
                const email = this.getUserEmail();
                if (!email) {
                    this.addBotMessage('❌ Email not found. Please login again.');
                    return;
                }

                this.addBotMessage('Clocking out...');

                try {
                    // Call clock-out API - backend automatically detects location from IP
                    const response = await fetch(`https://py-mobiloitte.converiqo.ai/api/v1/attendance/clock-out?email=${encodeURIComponent(email)}`, {
                        method: 'PUT',
                        headers: {
                            'accept': 'application/json',
                            'Content-Type': 'application/json'
                        }
                    });

                    let data;
                    try {
                        data = await response.json();
                    } catch (parseError) {
                        console.error('Failed to parse response:', parseError);
                        this.addBotMessage('❌ Clock out failed: Invalid response from server.');
                        return;
                    }

                    if (response.ok && data.success && data.data) {
                        this.isClockedIn = false;
                        this.updateClockButton();

                        const record = data.data;

                        // Format clock-out time
                        let clockOutTime = 'N/A';
                        if (record.clockOut) {
                            try {
                                const clockOutDate = new Date(record.clockOut);
                                clockOutTime = clockOutDate.toLocaleTimeString('en-US', {
                                    hour12: false,
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit'
                                });
                            } catch (e) {
                                clockOutTime = record.clockOut;
                            }
                        }

                        // Calculate work hours from clockIn and clockOut
                        let workHoursText = 'N/A';
                        if (record.clockIn && record.clockOut) {
                            try {
                                const clockInDate = new Date(record.clockIn);
                                const clockOutDate = new Date(record.clockOut);
                                const diffMs = clockOutDate.getTime() - clockInDate.getTime();
                                const totalMinutes = Math.round(diffMs / (1000 * 60));
                                workHoursText = this.formatMinutesToHoursMinutes(totalMinutes);
                            } catch (e) {
                                console.error('Error calculating work hours:', e);
                            }
                        }

                        // Format early by or overtime
                        let statusText = '';
                        if (record.earlyByMinutes && record.earlyByMinutes > 0) {
                            statusText = `\nEarly by: ${record.earlyBy || this.formatMinutesToHoursMinutes(record.earlyByMinutes)}`;
                        } else if (record.overTimeMinutes && record.overTimeMinutes > 0) {
                            statusText = `\nOvertime: ${record.overTime || this.formatMinutesToHoursMinutes(record.overTimeMinutes)}`;
                        }

                        const message = `✅ Clock out successful!\n\n` +
                            `Time: ${clockOutTime}\n` +
                            `Date: ${record.date || 'N/A'}\n` +
                            `Work Hours: ${workHoursText}` +
                            statusText;
                        this.addBotMessage(message);

                        // Verify state with server after successful clock-out
                        setTimeout(() => {
                            this.checkAttendanceStatus();
                        }, 1000);
                    } else {
                        // Extract error message from various possible formats
                        let errorMsg = 'Unknown error';
                        if (data.detail) {
                            errorMsg = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
                        } else if (data.message) {
                            errorMsg = data.message;
                        } else if (data.error) {
                            errorMsg = data.error;
                        }
                        console.error('Clock out failed:', errorMsg);
                        this.addBotMessage(`❌ Clock out failed: ${errorMsg}`);
                    }
                } catch (error) {
                    console.error('Clock out error:', error);
                    this.addBotMessage('❌ Failed to clock out. Please try again.');
                }
            } catch (error) {
                console.error('Clock out error:', error);
                this.addBotMessage('❌ An error occurred. Please try again.');
            }
        }

        updateClockButton() {
            const btnText = this.container.querySelector('#clock-btn-text');
            if (btnText) {
                btnText.textContent = this.isClockedIn ? 'Clock Out' : 'Clock In';
            }
        }

        formatMinutesToHoursMinutes(minutes) {
            if (!minutes || minutes === 0) return '0 minutes';

            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;

            let result = '';
            if (hours > 0) {
                result += `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
            }
            if (mins > 0) {
                if (result) result += ' ';
                result += `${mins} ${mins === 1 ? 'minute' : 'minutes'}`;
            }

            return result || '0 minutes';
        }

        async handleViewAttendance() {
            try {
                const email = this.getUserEmail();
                if (!email) {
                    this.addBotMessage('❌ Email not found. Please login again.');
                    return;
                }

                this.addBotMessage('Fetching your attendance records...');

                const response = await fetch(`https://py-mobiloitte.converiqo.ai/api/v1/attendance?email=${encodeURIComponent(email)}`, {
                    method: 'GET',
                    headers: {
                        'accept': 'application/json'
                    }
                });

                const data = await response.json();

                if (response.ok && data.success && data.data && data.data.length > 0) {
                    const records = data.data.slice(0, 10); // Show last 10 records
                    let message = `📊 Your Attendance Records (Last ${records.length}):\n\n`;

                    records.forEach((record, index) => {
                        message += this.formatAttendanceRecord(record, index + 1);
                        if (index < records.length - 1) message += '\n---\n\n';
                    });

                    this.addBotMessage(message);
                } else if (response.ok && data.success && (!data.data || data.data.length === 0)) {
                    this.addBotMessage('📊 No attendance records found.');
                } else {
                    this.addBotMessage('❌ Failed to fetch attendance records.');
                }
            } catch (error) {
                console.error('View attendance error:', error);
                this.addBotMessage('❌ An error occurred while fetching attendance records.');
            }
        }

        formatAttendanceRecord(record, index) {
            // Format date
            const date = record.date || 'N/A';

            // Format clock in time
            let clockInTime = 'N/A';
            if (record.clockIn) {
                try {
                    const clockInDate = new Date(record.clockIn);
                    clockInTime = clockInDate.toLocaleTimeString('en-US', {
                        hour12: false,
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                } catch (e) {
                    clockInTime = 'N/A';
                }
            }

            // Format clock out time
            let clockOutTime = record.clockOut ? 'N/A' : 'Not clocked out';
            if (record.clockOut) {
                try {
                    const clockOutDate = new Date(record.clockOut);
                    clockOutTime = clockOutDate.toLocaleTimeString('en-US', {
                        hour12: false,
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                } catch (e) {
                    clockOutTime = 'N/A';
                }
            }

            // Build message
            let msg = `${index}. 📅 ${date}\n`;
            msg += `   ⏰ In: ${clockInTime}`;

            if (record.clockInStatus) {
                const statusEmoji = record.clockInStatus === 'on-time' ? '✅' : '⚠️';
                msg += ` ${statusEmoji} ${record.clockInStatus}`;
            }

            if (record.lateBy) {
                msg += ` (Late: ${record.lateBy})`;
            }

            msg += `\n   ⏰ Out: ${clockOutTime}`;

            if (record.clockOutStatus === 'early' && record.earlyBy) {
                msg += ` ⚠️ (Early: ${record.earlyBy})`;
            } else if (record.overTime) {
                msg += ` ⭐ (Overtime: ${record.overTime})`;
            }

            if (record.clockInLocation && record.clockInLocation.city) {
                msg += `\n   📍 ${record.clockInLocation.city}, ${record.clockInLocation.country}`;
            }

            return msg;
        }

        getEmployeeCode() {
            // Get employee code from stored user details
            const userDetailsStr = localStorage.getItem('mobilolite_user_details');
            let user = {};
            try {
                user = JSON.parse(userDetailsStr || '{}');
            } catch (e) {
                console.error('Error parsing user details', e);
            }

            // Extract employee code - try different possible locations
            const employeeCode = user.employee_code ||
                user.employeeCode ||
                (user.user && user.user.employee_code) ||
                (user.user && user.user.employeeCode) ||
                null; // Return null if not found instead of fallback

            if (!employeeCode) {
                console.warn('Employee code not found in user details');
            }

            return employeeCode;
        }

        getUserEmail() {
            // Get email from stored user details or token
            const userDetailsStr = localStorage.getItem('mobilolite_user_details');
            let user = {};
            try {
                user = JSON.parse(userDetailsStr || '{}');
            } catch (e) {
                console.error('Error parsing user details', e);
            }

            // Extract email - try different possible locations
            const email = user.email ||
                (user.user && user.user.email) ||
                null;

            // If not found in user details, try to decode from token
            if (!email) {
                try {
                    const token = localStorage.getItem('mobilolite_auth_token');
                    if (token) {
                        // Simple JWT decode (just for email extraction)
                        const payload = JSON.parse(atob(token.split('.')[1]));
                        const emailFromToken = payload.sub || payload.email || payload.user_id;
                        if (emailFromToken) {
                            return emailFromToken;
                        }
                    }
                } catch (e) {
                    console.error('Error extracting email from token', e);
                }
            }

            if (!email) {
                console.warn('Email not found in user details or token');
            }

            return email;
        }

        async checkAttendanceStatus() {
            try {
                // Get user email
                const email = this.getUserEmail();
                if (!email) {
                    this.isClockedIn = false;
                    this.updateClockButton();
                    return;
                }

                console.log('Checking attendance status for email:', email);

                // Get today's date in YYYY-MM-DD format
                const today = new Date().toISOString().split('T')[0];

                // Call attendance API to get all records for this email
                const response = await fetch(`https://py-mobiloitte.converiqo.ai/api/v1/attendance?email=${encodeURIComponent(email)}`, {
                    method: 'GET',
                    headers: {
                        'accept': 'application/json'
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    console.log('Attendance status response:', data);

                    if (data.success && data.data && Array.isArray(data.data)) {
                        // Find today's record
                        const todayRecord = data.data.find(record => record.date === today);

                        if (todayRecord) {
                            // Check if employee is currently clocked in
                            // Employee is clocked in if they have clockIn but no clockOut for today
                            const hasClockIn = todayRecord.clockIn && todayRecord.clockIn !== '' && todayRecord.clockIn !== null;
                            const hasClockOut = todayRecord.clockOut && todayRecord.clockOut !== '' && todayRecord.clockOut !== null;

                            this.isClockedIn = hasClockIn && !hasClockOut;
                            console.log('Clock-in status:', this.isClockedIn, '(ClockIn:', hasClockIn, ', ClockOut:', hasClockOut, ')');
                        } else {
                            // No record for today
                            this.isClockedIn = false;
                            console.log('No attendance record found for today');
                        }
                    } else {
                        // No records found
                        this.isClockedIn = false;
                        console.log('No attendance records found');
                    }

                    // Update button state
                    this.updateClockButton();
                } else {
                    console.error('Failed to fetch attendance status:', response.status);
                    // Default to not clocked in if we can't check
                    this.isClockedIn = false;
                    this.updateClockButton();
                }
            } catch (error) {
                console.error('Error checking attendance status:', error);
                // Default to not clocked in on error
                this.isClockedIn = false;
                this.updateClockButton();
            }
        }

        async getAddressFromCoords(lat, lng) {
            try {
                // Using a free geocoding service
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
                const data = await response.json();
                return data.display_name || 'Unknown location';
            } catch (error) {
                console.error('Geocoding error:', error);
                return 'Unknown location';
            }
        }

        sendQuickAction(message) {
            const input = this.container.querySelector('.mobilolite-new-input');
            if (input) {
                input.value = message;
                this.sendMessage();
            }
        }

        async handleHelpdeskFlow() {
            // Check auth
            const token = localStorage.getItem('mobilolite_auth_token');
            if (!token) {
                this.addBotMessage('Please login first to access the helpdesk.');
                this.openLoginModal();
                return;
            }

            this.addBotMessage('Fetching helpdesk categories...');

            try {
                const response = await fetch('https://py-mobiloitte.converiqo.ai/api/v1/helpdesk/employee/options', {
                    method: 'GET',
                    headers: {
                        'accept': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const options = await response.json();
                    console.log('Helpdesk options:', options);

                    // Filter for parent types and map to labels
                    const categories = options
                        .filter(opt => opt.type === 'parent')
                        .map(opt => opt.label);

                    if (categories.length > 0) {
                        this.addBotMessage('Please select a category for your ticket:', categories);

                        // Store options for next steps (sub-categories)
                        this.helpdeskOptions = options;
                    } else {
                        this.addBotMessage('No helpdesk categories found.');
                    }
                } else {
                    console.error('Failed to fetch helpdesk options:', response.status);
                    this.addBotMessage('Sorry, I couldn\'t fetch the helpdesk options. Please try again later.');
                }
            } catch (error) {
                console.error('Helpdesk API error:', error);
                this.addBotMessage('An error occurred while connecting to the helpdesk service.');
            }
        }


        handleContactUs() {
            // Close the dropdown menu
            this.closeDropdown();

            // Trigger the "I want to talk to human" message
            // This will activate the existing human handoff flow
            this.sendQuickAction('I want to talk to human');
        }

        openAssetRequestModal() {
            // Check auth
            const token = localStorage.getItem('mobilolite_auth_token');
            if (!token) {
                this.addBotMessage('Please login first to request an asset.');
                return;
            }

            this.closeDropdown();
            const modal = this.container.querySelector('#mobilolite-asset-modal');
            if (modal) {
                modal.classList.add('show');
            }
        }

        closeAssetRequestModal() {
            const modal = this.container.querySelector('#mobilolite-asset-modal');
            if (modal) {
                modal.classList.remove('show');
            }
        }

        async handleAssetRequestSubmit(event) {
            event.preventDefault();
            const form = event.target;
            const btn = form.querySelector('button[type="submit"]');

            // Get form data
            const assetType = form.querySelector('select[name="assetType"]').value;
            const assetName = form.querySelector('input[name="assetName"]').value;
            const justification = form.querySelector('textarea[name="justification"]').value;

            // Get user details from localStorage (includes employee API data)
            const userDetailsStr = localStorage.getItem('mobilolite_user_details');
            let user = {};
            try {
                user = JSON.parse(userDetailsStr || '{}');
            } catch (e) {
                console.error('Error parsing user details', e);
            }

            // Extract employee details with fallbacks
            const employeeCode = user.emp_id || user.employeeCode || localStorage.getItem('employeeCode') || 'EMP000';
            const fullName = user.full_name || user.name || localStorage.getItem('full_name') || 'Employee';
            const department = user.department || localStorage.getItem('department') || 'General';
            const designation = user.designation || localStorage.getItem('designation') || 'Employee';
            const email = user.email || localStorage.getItem('email') || '';

            console.log('Employee Data:', { employeeCode, fullName, department, designation, email });

            if (!email) {
                this.closeAssetRequestModal();
                this.addBotMessage('❌ Error: Email is required. Please login again.');
                return;
            }

            if (!assetType || !assetName || !justification) {
                alert('Please fill in all fields');
                return;
            }

            const originalText = btn.textContent;
            btn.textContent = 'Submitting...';
            btn.disabled = true;

            // Construct payload matching the API specification
            const payload = {
                employeeInfo: {
                    employeeCode: employeeCode,
                    fullName: fullName,
                    department: department,
                    designation: designation,
                    email: email
                },
                assetDetails: {
                    assetType: assetType, // Hardware, Software, or Other
                    assetName: assetName, // Specific item name
                    quantity: 1,
                    justification: justification,
                    priority: "Medium",
                    expectedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 7 days from now
                }
            };

            console.log('Asset Request Payload:', JSON.stringify(payload, null, 2));

            try {
                const token = localStorage.getItem('mobilolite_auth_token');
                const response = await fetch('https://py-mobiloitte.converiqo.ai/api/v1/ess-portal/assets', {
                    method: 'POST',
                    headers: {
                        'accept': 'application/json',
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                });

                console.log('Asset Request Response Status:', response.status);

                if (response.ok) {
                    const data = await response.json();
                    this.closeAssetRequestModal();
                    this.addBotMessage(`✅ Asset request submitted successfully!\n\nAsset Type: ${assetType}\nAsset Name: ${assetName}\nQuantity: 1\nJustification: ${justification}\n\nYour request will be reviewed by the admin team.`);

                    // Reset form
                    form.reset();
                } else {
                    const errorData = await response.json();
                    console.error('Asset request failed:', errorData);

                    let errorMessage = 'Failed to submit asset request';
                    if (errorData.detail) {
                        errorMessage = errorData.detail;
                    } else if (errorData.message) {
                        errorMessage = errorData.message;
                    }

                    alert(errorMessage);
                }
            } catch (error) {
                console.error('Asset request error:', error);
                alert('An error occurred while submitting your asset request. Please try again.');
            } finally {
                btn.textContent = originalText;
                btn.disabled = false;
            }
        }

        openExpenseModal() {
            // Check auth
            const token = localStorage.getItem('mobilolite_auth_token');
            if (!token) {
                this.addBotMessage('Please login first to submit an expense.');
                return;
            }

            this.closeDropdown();
            const modal = this.container.querySelector('#mobilolite-expense-modal');
            if (modal) {
                modal.classList.add('show');
                // Set today's date as default
                const today = new Date().toISOString().split('T')[0];
                const dateInput = modal.querySelector('input[name="date"]');
                if (dateInput) dateInput.value = today;
            }
        }

        closeExpenseModal() {
            const modal = this.container.querySelector('#mobilolite-expense-modal');
            if (modal) {
                modal.classList.remove('show');
            }
        }

        async handleExpenseSubmit(event) {
            event.preventDefault();
            const form = event.target;
            const btn = form.querySelector('button[type="submit"]');

            // Get form data
            const title = form.querySelector('input[name="title"]').value;
            const category = form.querySelector('select[name="category"]').value;
            const amount = parseFloat(form.querySelector('input[name="amount"]').value);
            const currency = form.querySelector('select[name="currency"]').value;
            const date = form.querySelector('input[name="date"]').value;
            const description = form.querySelector('textarea[name="description"]').value;
            const receiptFile = form.querySelector('input[name="receipt"]').files[0];

            // Get user details from localStorage
            const userDetailsStr = localStorage.getItem('mobilolite_user_details');
            let user = {};
            try {
                user = JSON.parse(userDetailsStr || '{}');
            } catch (e) {
                console.error('Error parsing user details', e);
            }

            // Extract employee details with fallbacks
            const employeeCode = user.emp_id || user.employeeCode || localStorage.getItem('employeeCode') || 'EMP000';
            const fullName = user.full_name || user.name || localStorage.getItem('full_name') || 'Employee';
            const department = user.department || localStorage.getItem('department') || 'General';
            const designation = user.designation || localStorage.getItem('designation') || 'Employee';
            const email = user.email || localStorage.getItem('email') || '';

            if (!email) {
                this.closeExpenseModal();
                this.addBotMessage('❌ Error: Email is required. Please login again.');
                return;
            }

            const originalText = btn.textContent;
            btn.textContent = 'Submitting...';
            btn.disabled = true;

            // Construct payload
            const payload = {
                employeeInfo: {
                    employeeCode: employeeCode,
                    fullName: fullName,
                    department: department,
                    designation: designation,
                    email: email
                },
                expenseDetails: {
                    title: title,
                    category: category,
                    amount: amount,
                    currency: currency,
                    date: date,
                    description: description,
                    receiptFileName: receiptFile ? receiptFile.name : ""
                }
            };

            console.log('Expense Payload:', JSON.stringify(payload, null, 2));

            try {
                const token = localStorage.getItem('mobilolite_auth_token');
                const response = await fetch('https://py-mobiloitte.converiqo.ai/api/v1/ess-portal/expenses', {
                    method: 'POST',
                    headers: {
                        'accept': 'application/json',
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                });

                console.log('Expense Response Status:', response.status);

                if (response.ok) {
                    const data = await response.json();
                    this.closeExpenseModal();
                    this.addBotMessage(`✅ Expense submitted successfully!\n\nTitle: ${title}\nCategory: ${category}\nAmount: ${currency} ${amount}\nDate: ${date}\n\nYour expense will be reviewed by the admin team.`);

                    // Reset form
                    form.reset();
                } else {
                    const errorData = await response.json();
                    console.error('Expense submission failed:', errorData);

                    let errorMessage = 'Failed to submit expense';
                    if (errorData.detail) {
                        errorMessage = errorData.detail;
                    } else if (errorData.message) {
                        errorMessage = errorData.message;
                    }

                    alert(errorMessage);
                }
            } catch (error) {
                console.error('Expense submission error:', error);
                alert('An error occurred while submitting your expense. Please try again.');
            } finally {
                btn.textContent = originalText;
                btn.disabled = false;
            }
        }

        openPayslipModal() {
            // Check auth
            const token = localStorage.getItem('mobilolite_auth_token');
            if (!token) {
                this.addBotMessage('Please login first to request a payslip.');
                return;
            }

            this.closeDropdown();
            const modal = this.container.querySelector('#mobilolite-payslip-modal');
            if (modal) {
                modal.classList.add('show');

                // Populate year dropdown with current year and past 2 years
                const yearSelect = modal.querySelector('select[name="year"]');
                if (yearSelect && yearSelect.options.length === 1) { // Only has placeholder
                    const currentYear = new Date().getFullYear();
                    for (let i = 0; i < 3; i++) {
                        const year = currentYear - i;
                        const option = document.createElement('option');
                        option.value = year;
                        option.textContent = year;
                        if (i === 0) option.selected = true;
                        yearSelect.appendChild(option);
                    }
                }

                // Set current month as default
                const monthSelect = modal.querySelector('select[name="month"]');
                if (monthSelect) {
                    const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
                    monthSelect.value = currentMonth;
                }
            }
        }

        closePayslipModal() {
            const modal = this.container.querySelector('#mobilolite-payslip-modal');
            if (modal) {
                modal.classList.remove('show');
            }
        }

        async handlePayslipRequest(event) {
            event.preventDefault();
            const form = event.target;
            const btn = form.querySelector('button[type="submit"]');

            // Get form data
            const month = form.querySelector('select[name="month"]').value;
            const year = form.querySelector('select[name="year"]').value;

            // Get month name for display
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];
            const monthName = monthNames[parseInt(month) - 1];

            // Get user details
            const userDetailsStr = localStorage.getItem('mobilolite_user_details');
            let user = {};
            try {
                user = JSON.parse(userDetailsStr || '{}');
            } catch (e) {
                console.error('Error parsing user details', e);
            }

            const name = user.full_name || user.name || localStorage.getItem('full_name') || 'Employee';
            const email = user.email || localStorage.getItem('email') || '';
            const empId = user.emp_id || user.employeeCode || localStorage.getItem('employeeCode') || '';

            if (!email) {
                this.closePayslipModal();
                this.addBotMessage('❌ Error: Email is required. Please login again.');
                return;
            }

            const originalText = btn.textContent;
            btn.textContent = 'Submitting...';
            btn.disabled = true;

            // Create a helpdesk ticket for payslip request
            const payload = {
                name: name,
                email: email,
                issue_type: 'Payslip Request',
                issue: `Payslip Request for ${monthName} ${year}`,
                severity: 'Low',
                message: `Employee ${name} (${empId}) has requested their payslip for ${monthName} ${year}.\n\nPlease generate and send the payslip to the employee.`
            };

            console.log('Payslip Request Payload:', JSON.stringify(payload, null, 2));

            try {
                const token = localStorage.getItem('mobilolite_auth_token');
                const response = await fetch('https://py-mobiloitte.converiqo.ai/api/v1/helpdesk/employee/tickets', {
                    method: 'POST',
                    headers: {
                        'accept': 'application/json',
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    const data = await response.json();
                    this.closePayslipModal();
                    this.addBotMessage(`✅ Payslip request submitted successfully!\n\nPeriod: ${monthName} ${year}\nTicket ID: ${data.ticket_id}\n\nYour payslip will be generated and sent to you shortly. You can track the status in the helpdesk portal.`);

                    // Reset form
                    form.reset();
                } else {
                    const errorData = await response.json();
                    console.error('Payslip request failed:', errorData);

                    let errorMessage = 'Failed to submit payslip request';
                    if (errorData.detail) {
                        errorMessage = errorData.detail;
                    } else if (errorData.message) {
                        errorMessage = errorData.message;
                    }

                    alert(errorMessage);
                }
            } catch (error) {
                console.error('Payslip request error:', error);
                alert('An error occurred while submitting your payslip request. Please try again.');
            } finally {
                btn.textContent = originalText;
                btn.disabled = false;
            }
        }

        toggleMinimize() {
            this.isMinimized = !this.isMinimized;
            this.container.classList.toggle('minimized');

            // Set or remove click handler based on minimized state
            if (this.isMinimized) {
                this.container.onclick = () => this.toggleMinimize();
            } else {
                this.container.onclick = null;

                // Hide the welcome bubble when opening chatbot
                this.hideWelcomeBubble();

                // Add welcome message when opening for the first time
                if (this.messages.length === 0) {
                    this.addBotMessage(this.config.welcomeMessage);

                    // Add suggestion chips after welcome message
                    setTimeout(() => {
                        this.addSuggestionChips([
                            {
                                label: 'Our Services',
                                text: 'Tell me about your services',
                                icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>'
                            },
                            {
                                label: 'Career Opportunities',
                                text: 'Show me job openings',
                                icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>'
                            },
                            {
                                label: 'Contact Us',
                                text: 'I want to contact Mobiloitte',
                                icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>'
                            },
                            {
                                label: 'About Mobiloitte',
                                text: 'Tell me about Mobiloitte',
                                icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
                            },
                            {
                                label: 'Case Studies',
                                text: 'Show me your case studies',
                                icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>'
                            },
                            {
                                label: 'I am Employee',
                                text: '__LOGIN__',
                                icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>'
                            }
                        ]);
                    }, 1000);
                }
            }

            // Reset fullscreen when minimizing
            if (this.isMinimized && this.isFullscreen) {
                this.toggleFullscreen();
            }
        }

        toggleFullscreen() {
            this.isFullscreen = !this.isFullscreen;
            this.container.classList.toggle('fullscreen');
        }

        startChat() {
            this.hasStarted = true;
            this.container.classList.remove('not-started');

            // Ensure session ID is initialized
            if (!this.conversationId) {
                this.conversationId = this.generateSessionId();
            }

            if (this.messages.length === 0) {
                this.addBotMessage(this.config.welcomeMessage);
            }
        }

        handleHeaderClick(event) {
            if (!this.isMinimized) {
                event.stopPropagation();
            }
        }

        handleClose() {
            this.toggleMinimize();
            this.resetSession();
        }

        resetSession() {
            this.conversationId = this.generateSessionId();
            this.messages = [];
            this.renderMessages(); // Clear messages from DOM

            // Re-render to show Get Started screen again if needed, 
            // though toggleMinimize will hide it. 
            // When opening again, it should show Get Started.
            this.render();
        }

        generateSessionId() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }

        parseMarkdown(text) {
            if (!text) return '';

            // Escape HTML first to prevent XSS
            let html = text
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");

            // Bold: **text**
            html = html.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');

            // Italics: *text* or _text_
            html = html.replace(/\*(.*?)\*/g, '<i>$1</i>');
            html = html.replace(/_(.*?)_/g, '<i>$1</i>');

            // Links: [text](url)
            html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

            // Newlines to <br>
            html = html.replace(/\n/g, '<br>');

            return html;
        }

        close() {
            this.container.style.display = 'none';
        }

        renderMessages() {
            const chatArea = this.container.querySelector('.mobilolite-new-chat-area');
            if (!chatArea) return;

            chatArea.innerHTML = '';
            this.messages.forEach(msg => {
                this.appendMessageToDOM(msg, false);
            });
        }

        appendMessageToDOM(msg, animate = false) {
            return new Promise((resolve, reject) => {
                const chatArea = this.container.querySelector('.mobilolite-new-chat-area');
                if (!chatArea) {
                    reject(new Error('Chat area not found'));
                    return;
                }

                const messageEl = document.createElement('div');
                messageEl.className = `mobilolite-new-message ${msg.sender === 'user' ? 'user' : ''}`;

                // Create the structure first
                messageEl.innerHTML = `
                    <div class="mobilolite-new-message-avatar">
                        ${msg.sender === 'user' ? 'you' : 'm'}
                    </div>
                    <div class="mobilolite-new-message-content">
                        <div class="mobilolite-new-message-bubble"></div>
                        <div class="mobilolite-new-message-time">
                            ${new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                `;

                const bubble = messageEl.querySelector('.mobilolite-new-message-bubble');
                const messageContent = messageEl.querySelector('.mobilolite-new-message-content');

                // Hide the message bubble if hideMessage flag is set (for job cards)
                if (msg.hideMessage) {
                    bubble.style.display = 'none';
                }

                chatArea.appendChild(messageEl);

                // Function to add options after message is rendered
                const addOptions = () => {
                    // First check if we have carouselHtml from job cards
                    if (msg.carouselHtml) {
                        const carouselContainer = document.createElement('div');
                        carouselContainer.className = 'job-carousel-container';
                        carouselContainer.innerHTML = msg.carouselHtml;
                        messageContent.insertBefore(carouselContainer, messageContent.querySelector('.mobilolite-new-message-time'));
                        chatArea.scrollTop = chatArea.scrollHeight;
                        return; // Don't add regular options if we have carousel
                    }

                    // Check if options are job listings (have job_id)
                    if (msg.options && msg.options.length > 0 && msg.options[0] && msg.options[0].job_id) {
                        const carouselHtml = window.mobiloliteWidgetNew.renderJobCarousel(msg.options);
                        const carouselContainer = document.createElement('div');
                        carouselContainer.className = 'job-carousel-container';
                        carouselContainer.innerHTML = carouselHtml;
                        messageContent.insertBefore(carouselContainer, messageContent.querySelector('.mobilolite-new-message-time'));
                        chatArea.scrollTop = chatArea.scrollHeight;
                        return; // Don't add regular options if we have job cards
                    }

                    // Regular options (simple buttons)
                    if (msg.options && msg.options.length > 0) {
                        const optionsContainer = document.createElement('div');
                        optionsContainer.className = 'mobilolite-new-options';

                        msg.options.forEach(option => {
                            const optionBtn = document.createElement('button');
                            optionBtn.className = 'mobilolite-new-option-btn';
                            optionBtn.textContent = typeof option === 'string' ? option : (option.label || option.title || 'Option');
                            optionBtn.onclick = () => {
                                // Remove all option buttons after click
                                document.querySelectorAll('.mobilolite-new-options').forEach(el => el.remove());
                                // Send the selected option as a message
                                const input = this.container.querySelector('.mobilolite-new-input');
                                if (input) {
                                    input.value = typeof option === 'string' ? option : (option.label || option.title);
                                    this.sendMessage();
                                }
                            };
                            optionsContainer.appendChild(optionBtn);
                        });

                        // Append options to message content (below the bubble, before time)
                        messageContent.insertBefore(optionsContainer, messageContent.querySelector('.mobilolite-new-message-time'));
                        chatArea.scrollTop = chatArea.scrollHeight;
                    }
                };

                if (animate && msg.sender === 'bot') {
                    // Typewriter effect
                    const text = msg.message;
                    let i = 0;
                    const speed = 15; // ms per character

                    const typeWriter = () => {
                        if (i < text.length) {
                            bubble.textContent += text.charAt(i);
                            i++;
                            chatArea.scrollTop = chatArea.scrollHeight;
                            setTimeout(typeWriter, speed);
                        } else {
                            // Final render with markdown
                            bubble.innerHTML = this.parseMarkdown(text);
                            // Add options after typewriter completes
                            addOptions();
                            resolve();
                        }
                    };
                    typeWriter();
                } else {
                    bubble.innerHTML = this.parseMarkdown(msg.message);
                    chatArea.scrollTop = chatArea.scrollHeight;
                    // Add options immediately for non-animated messages
                    addOptions();
                    resolve();
                }
            });
        }

        addBotMessage(message, options = null, questionType = null) {
            const msg = {
                sender: 'bot',
                message: message,
                timestamp: new Date().toISOString(),
                options: options,
                questionType: questionType
            };
            this.messages.push(msg);

            // Check if question_type is 'file' to show upload prompt
            if (questionType === 'file') {
                console.log('📎 File upload requested (question_type: file) - showing upload prompt');
                this.setUploadButtonEnabled(true);
                // Show the interactive upload prompt after a short delay
                setTimeout(() => {
                    this.showUploadPrompt();
                }, 500);
            }

            // Check if options contain job_cards for carousel rendering
            if (options && Array.isArray(options) && options.length > 0 && options[0].job_id) {
                // This is a job listings response - render as carousel
                const carouselHtml = this.renderJobCarousel(options);
                msg.carouselHtml = carouselHtml;
                // Note: Intro text (message) is now shown above the carousel
            }

            return this.appendMessageToDOM(msg, true);
        }

        addUserMessage(message) {
            const msg = {
                sender: 'user',
                message: message,
                timestamp: new Date().toISOString()
            };
            this.messages.push(msg);
            this.appendMessageToDOM(msg, false);
        }

        addSuggestionChips(chips) {
            const chatArea = this.container.querySelector('.mobilolite-new-chat-area');
            if (!chatArea) {
                console.log('❌ Chat area not found');
                return;
            }

            // Create chips container
            const chipsContainer = document.createElement('div');
            chipsContainer.className = 'mobilolite-suggestion-chips';
            chipsContainer.id = 'mobilolite-welcome-chips';

            // Add each chip with staggered animation
            chips.forEach((chip, index) => {
                const chipEl = document.createElement('button');
                chipEl.className = 'mobilolite-suggestion-chip';
                chipEl.onclick = () => this.handleChipClick(chip.text);

                // Add staggered animation delay (150ms between each chip)
                chipEl.style.animationDelay = `${index * 0.15}s`;

                chipEl.innerHTML = `
                    ${chip.icon || ''}
                    <span>${chip.label}</span>
                `;

                chipsContainer.appendChild(chipEl);
            });

            // Append chips directly to chat area (after all messages)
            chatArea.appendChild(chipsContainer);
            chatArea.scrollTop = chatArea.scrollHeight;

            console.log('✅ Suggestion chips added:', chips.length);
        }

        handleChipClick(text) {
            // Check if this is the login action
            if (text === '__LOGIN__') {
                this.openLoginModal();
                return;
            }

            // Remove all suggestion chips only when sending a message
            const chips = this.container.querySelectorAll('.mobilolite-suggestion-chips');
            chips.forEach(chip => chip.remove());

            // Send the message
            const input = this.container.querySelector('.mobilolite-new-input');
            if (input) {
                input.value = text;
                this.sendMessage();
            }
        }

        showTyping() {
            const chatArea = this.container.querySelector('.mobilolite-new-chat-area');
            if (!chatArea) return;

            console.log('Showing typing indicator');
            const typingEl = document.createElement('div');
            typingEl.className = 'mobilolite-new-message';
            typingEl.id = 'typing-indicator';
            typingEl.innerHTML = `
                <div class="mobilolite-new-message-avatar">m</div>
                <div class="mobilolite-new-message-content">
                    <div class="mobilolite-new-message-bubble">
                        <span class="mobilolite-new-thinking-text">Sara is thinking...</span>
                    </div>
                </div>
            `;
            chatArea.appendChild(typingEl);
            chatArea.scrollTop = chatArea.scrollHeight;
        }

        hideTyping() {
            console.log('Hiding typing indicator');
            const typingEl = document.getElementById('typing-indicator');
            if (typingEl) {
                typingEl.remove();
            }
        }

        async submitHelpdeskTicket(category, subCategory, message = null) {
            const token = localStorage.getItem('mobilolite_auth_token');
            const userDetailsStr = localStorage.getItem('mobilolite_user_details');
            let user = {};
            try {
                user = JSON.parse(userDetailsStr || '{}');
            } catch (e) {
                console.error('Error parsing user details', e);
            }

            // Extract details with fallbacks
            const name = user.name || (user.user && user.user.name) || 'Employee';
            const email = user.email || (user.user && user.user.email) || 'employee@example.com';

            // Use provided message or fallback to default
            const ticketMessage = message || this.helpdeskMessage || 'Ticket created via chatbot';

            const payload = {
                name: name,
                email: email,
                issue_type: category,
                issue: subCategory || category,
                severity: "Medium",
                message: ticketMessage
            };

            this.addBotMessage('Submitting your ticket...');

            try {
                const response = await fetch('https://py-mobiloitte.converiqo.ai/api/v1/helpdesk/employee/tickets', {
                    method: 'POST',
                    headers: {
                        'accept': 'application/json',
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    const data = await response.json();
                    this.addBotMessage(`✅ ${data.message || 'Ticket submitted successfully'}. Ticket ID: ${data.ticket_id}`);
                } else {
                    this.addBotMessage('❌ Failed to submit ticket. Please try again.');
                }
            } catch (error) {
                console.error('Submit ticket error:', error);
                this.addBotMessage('❌ An error occurred while submitting the ticket.');
            } finally {
                // Reset helpdesk state
                this.helpdeskOptions = null;
                this.selectedHelpdeskCategory = null;
                this.selectedHelpdeskSubCategory = null;
                this.waitingForHelpdeskMessage = false;
                this.helpdeskMessage = null;
                this.isProcessing = false;
            }
        }

        /**
         * Handle resume file upload via /jobs/session-upload endpoint.
         * Uploads the file to S3, creates applicant record, and sends
         * the resume link as a chat message for LangGraph processing.
         */
        async handleFileUpload(fileInput) {
            const file = fileInput.files[0];
            if (!file) return;

            // Validate file size (10MB max)
            const maxSize = 10 * 1024 * 1024;
            if (file.size > maxSize) {
                this.showUploadStatus('File too large. Maximum size is 10MB.', 'error');
                fileInput.value = '';
                return;
            }

            // Validate file type
            const allowedTypes = ['.pdf', '.doc', '.docx', '.txt', '.rtf'];
            const fileExt = '.' + file.name.split('.').pop().toLowerCase();
            if (!allowedTypes.includes(fileExt)) {
                this.showUploadStatus('Invalid file type. Allowed: PDF, DOC, DOCX, TXT, RTF', 'error');
                fileInput.value = '';
                return;
            }

            // Ensure session ID exists
            if (!this.conversationId) {
                this.conversationId = this.generateSessionId();
            }

            // Show uploading status
            this.showUploadStatus('Uploading resume...', 'uploading');
            this.disableFileUpload(true);

            try {
                // Create form data for upload
                const formData = new FormData();
                formData.append('session_id', this.conversationId);
                formData.append('file', file);

                // Construct URL safely (ensure trailing slash exists)
                let baseUrl = this.config.apiEndpoint.baseUrl;
                if (!baseUrl.endsWith('/')) {
                    baseUrl += '/';
                }

                // Upload to session-upload endpoint
                const response = await fetch(`${baseUrl}api/v1/jobs/session-upload`, {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    // Hide upload status
                    this.hideUploadStatus();

                    // Get applicant ID
                    const applicantId = data.applicant_id;

                    // Add user message showing the upload (WITHOUT the URL for security)
                    this.addUserMessage(`📎 Resume uploaded: ${file.name}`);

                    // Disable upload button after successful upload
                    this.setUploadButtonEnabled(false);

                    // Hide the upload prompt after successful upload
                    this.hideUploadPrompt();

                    // Send a simple message to continue the conversation
                    // The backend already has the resume link in session, so we just confirm
                    const input = this.container.querySelector('.mobilolite-new-input');
                    if (input) {
                        // Send a confirmation message without exposing the URL
                        input.value = 'I have uploaded my resume';
                        await this.sendMessage();
                    }

                    console.log(`Resume uploaded successfully. Applicant ID: ${applicantId}`);
                } else {
                    // Handle specific error codes
                    let errorMessage = 'Upload failed. Please try again.';
                    if (data.error_code === 'INCOMPLETE_SESSION') {
                        errorMessage = 'Please answer name and email questions first.';
                    } else if (data.error_code === 'SESSION_NOT_FOUND') {
                        errorMessage = 'Session expired. Please refresh and try again.';
                    } else if (data.error_code === 'DUPLICATE_APPLICATION') {
                        errorMessage = 'You have already submitted an application.';
                    } else if (data.error_code === 'DUPLICATE_UPLOAD') {
                        errorMessage = 'Resume already uploaded. Please wait a moment.';
                    } else if (data.error) {
                        errorMessage = data.error;
                    }

                    this.showUploadStatus(errorMessage, 'error');
                    console.error('Upload failed:', data);
                }
            } catch (error) {
                console.error('File upload error:', error);
                this.showUploadStatus('Network error. Please try again.', 'error');
            } finally {
                // Reset file input
                fileInput.value = '';
                this.disableFileUpload(false);

                // Auto-hide error status after 5 seconds
                setTimeout(() => {
                    this.hideUploadStatus();
                }, 5000);
            }
        }

        /**
         * Enable or disable the upload button based on conversation context.
         * Button is enabled when AI asks for resume, disabled otherwise.
         */
        setUploadButtonEnabled(enabled) {
            const fileBtn = this.container.querySelector('#mobilolite-file-btn');
            if (fileBtn) {
                if (enabled) {
                    fileBtn.classList.add('enabled');
                    fileBtn.title = 'Click to upload your resume';
                } else {
                    fileBtn.classList.remove('enabled');
                    fileBtn.title = 'Upload will be enabled when requested';
                }
            }
        }

        /**
         * Check if the bot message is asking for a resume upload.
         * Returns true if resume-related keywords are detected.
         */
        isAskingForResume(message) {
            if (!message) return false;
            const lowerMsg = message.toLowerCase();

            // Strict patterns - must explicitly ask to UPLOAD resume
            const strictPhrases = [
                'upload your resume',
                'upload your cv',
                'please upload',
                'attach your resume',
                'attach your cv',
                'share your resume',
                'send your resume',
                'submit your resume',
                'provide your resume file',
                'need your resume',
                'upload a resume'
            ];

            // Check for strict phrases AND make sure it's not about job description
            const isAskingUpload = strictPhrases.some(phrase => lowerMsg.includes(phrase));
            const isAboutJobDesc = lowerMsg.includes('job description') || lowerMsg.includes('source:');

            return isAskingUpload && !isAboutJobDesc;
        }

        showUploadStatus(message, type = 'uploading') {
            const statusEl = this.container.querySelector('#mobilolite-upload-status');
            const textEl = this.container.querySelector('#mobilolite-upload-text');
            const spinnerEl = statusEl?.querySelector('.mobilolite-new-upload-spinner');

            if (statusEl && textEl) {
                textEl.textContent = message;
                statusEl.className = 'mobilolite-new-upload-status show ' + type;

                // Show/hide spinner based on type
                if (spinnerEl) {
                    spinnerEl.style.display = type === 'uploading' ? 'block' : 'none';
                }
            }
        }

        hideUploadStatus() {
            const statusEl = this.container.querySelector('#mobilolite-upload-status');
            if (statusEl) {
                statusEl.classList.remove('show');
            }
        }

        disableFileUpload(disabled) {
            const fileBtn = this.container.querySelector('#mobilolite-file-btn');
            const fileInput = this.container.querySelector('#mobilolite-file-input');
            if (fileBtn) fileBtn.disabled = disabled;
            if (fileInput) fileInput.disabled = disabled;
        }

        updateCharCounter() {
            const input = this.container.querySelector('.mobilolite-new-input');
            const counter = this.container.querySelector('#mobilolite-char-counter');
            const validationMsg = this.container.querySelector('#mobilolite-validation-message');
            const inputWrapper = this.container.querySelector('#mobilolite-input-wrapper');

            if (!input || !counter) return;

            const length = input.value.length;
            const maxLength = 200;

            counter.textContent = `${length} / ${maxLength}`;

            // Remove error state
            if (validationMsg) validationMsg.classList.remove('show');
            if (inputWrapper) inputWrapper.classList.remove('error');

            // Update counter color based on length
            counter.classList.remove('warning', 'error');
            if (length > maxLength) {
                counter.classList.add('error');
            } else if (length > maxLength * 0.8) {
                counter.classList.add('warning');
            }
        }

        showValidationError() {
            const validationMsg = this.container.querySelector('#mobilolite-validation-message');
            const inputWrapper = this.container.querySelector('#mobilolite-input-wrapper');
            const input = this.container.querySelector('.mobilolite-new-input');

            if (validationMsg) {
                validationMsg.classList.add('show');
                // Auto-hide after 3 seconds
                setTimeout(() => {
                    validationMsg.classList.remove('show');
                }, 3000);
            }

            if (inputWrapper) {
                inputWrapper.classList.add('error');
                // Remove error border after 3 seconds
                setTimeout(() => {
                    inputWrapper.classList.remove('error');
                }, 3000);
            }

            // Focus back on input
            if (input) input.focus();
        }

        updateLeaveReasonCounter(textarea) {
            const counter = this.container.querySelector('#leave-reason-counter');

            if (!textarea || !counter) return;

            const length = textarea.value.length;
            const maxLength = 200;

            counter.textContent = `${length} / ${maxLength}`;

            // Update counter color based on length
            counter.classList.remove('warning', 'error');
            if (length > maxLength) {
                counter.classList.add('error');
            } else if (length > maxLength * 0.8) {
                counter.classList.add('warning');
            }
        }

        updateAssetJustificationCounter(textarea) {
            const counter = this.container.querySelector('#asset-justification-counter');

            if (!textarea || !counter) return;

            const length = textarea.value.length;
            const maxLength = 200;

            counter.textContent = `${length} / ${maxLength}`;

            // Update counter color based on length
            counter.classList.remove('warning', 'error');
            if (length > maxLength) {
                counter.classList.add('error');
            } else if (length > maxLength * 0.8) {
                counter.classList.add('warning');
            }
        }

        updateExpenseDescriptionCounter(textarea) {
            const counter = this.container.querySelector('#expense-description-counter');

            if (!textarea || !counter) return;

            const length = textarea.value.length;
            const maxLength = 200;

            counter.textContent = `${length} / ${maxLength}`;

            // Update counter color based on length
            counter.classList.remove('warning', 'error');
            if (length > maxLength) {
                counter.classList.add('error');
            } else if (length > maxLength * 0.8) {
                counter.classList.add('warning');
            }
        }

        updateExpenseTitleCounter(input) {
            const counter = this.container.querySelector('#expense-title-counter');

            if (!input || !counter) return;

            const length = input.value.length;
            const maxLength = 200;

            counter.textContent = `${length} / ${maxLength}`;

            // Update counter color based on length
            counter.classList.remove('warning', 'error');
            if (length > maxLength) {
                counter.classList.add('error');
            } else if (length > maxLength * 0.8) {
                counter.classList.add('warning');
            }
        }

        validateLeaveForm() {
            const modal = this.container.querySelector('#mobilolite-leave-modal');
            if (!modal) return;

            const form = modal.querySelector('form');
            const submitBtn = modal.querySelector('#leave-submit-btn');

            if (!form || !submitBtn) return;

            const type = form.querySelector('[name="type"]').value;
            const start = form.querySelector('[name="start"]').value;
            const end = form.querySelector('[name="end"]').value;
            const reason = form.querySelector('[name="reason"]').value.trim();

            // Check if all required fields are filled
            const allFieldsFilled = type && start && end && reason;

            // Calculate leave duration for Annual Leave
            const errorMsg = modal.querySelector('#leave-duration-error');
            let exceedsLimit = false;

            if (type === 'Annual Leave' && start && end) {
                const startDate = new Date(start);
                const endDate = new Date(end);
                const diffTime = Math.abs(endDate - startDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days

                if (diffDays > 15) {
                    exceedsLimit = true;
                    if (errorMsg) errorMsg.classList.add('show');
                } else {
                    if (errorMsg) errorMsg.classList.remove('show');
                }
            } else {
                // Hide error for non-Annual Leave types
                if (errorMsg) errorMsg.classList.remove('show');
            }

            // Enable button only if all fields are filled AND limit is not exceeded
            const isValid = allFieldsFilled && !exceedsLimit;
            submitBtn.disabled = !isValid;
        }

        validateAssetForm() {
            const modal = this.container.querySelector('#mobilolite-asset-modal');
            if (!modal) return;

            const form = modal.querySelector('form');
            const submitBtn = modal.querySelector('#asset-submit-btn');

            if (!form || !submitBtn) return;

            const assetType = form.querySelector('[name="assetType"]').value;
            const assetName = form.querySelector('[name="assetName"]').value.trim();
            const justification = form.querySelector('[name="justification"]').value.trim();

            // Enable button only if all required fields are filled
            const isValid = assetType && assetName && justification;
            submitBtn.disabled = !isValid;
        }

        validateExpenseForm() {
            const modal = this.container.querySelector('#mobilolite-expense-modal');
            if (!modal) return;

            const form = modal.querySelector('form');
            const submitBtn = modal.querySelector('#expense-submit-btn');

            if (!form || !submitBtn) return;

            const title = form.querySelector('[name="title"]').value.trim();
            const category = form.querySelector('[name="category"]').value;
            const amount = form.querySelector('[name="amount"]').value;
            const currency = form.querySelector('[name="currency"]').value;
            const date = form.querySelector('[name="date"]').value;
            const description = form.querySelector('[name="description"]').value.trim();

            // Enable button only if all required fields are filled
            const isValid = title && category && amount && currency && date && description;
            submitBtn.disabled = !isValid;
        }

        updateConnectionStatus(isOnline) {
            const statusEl = this.container.querySelector('#mobilolite-connection-status');
            const textEl = this.container.querySelector('#mobilolite-connection-text');

            if (!statusEl || !textEl) return;

            if (isOnline) {
                statusEl.classList.remove('connecting');
                statusEl.classList.add('online');
                textEl.textContent = "We're online!";
            } else {
                statusEl.classList.remove('online');
                statusEl.classList.add('connecting');
                textEl.textContent = 'Connecting...';
            }
        }

        async checkConnection() {
            try {
                // Send ping to verify backend is actually working
                // Backend MUST filter out messages with these flags from session history
                const tempSessionId = 'health-check-' + Date.now();

                const payload = {
                    message: "ping",
                    session_id: tempSessionId,
                    metadata: {
                        channel: "web",
                        user_id: "health-check",
                        tenant_id: "tech_company",
                        locale: "en",
                        extra: {
                            connection_check: true,
                            temporary_session: true,
                            do_not_store: true,
                            health_check_only: true,
                            skip_history: true
                        }
                    }
                };

                const response = await fetch(`${this.config.apiEndpoint.baseUrl}${this.config.apiEndpoint.chatMessage}`, {
                    method: 'POST',
                    headers: {
                        'accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    // Don't save session_id from health check
                    this.updateConnectionStatus(true);
                } else {
                    console.log('Backend connection check failed:', response.status);
                    this.updateConnectionStatus(false);
                }
            } catch (error) {
                console.log('Backend connection check failed:', error);
                this.updateConnectionStatus(false);
            }
        }

        async sendMessage() {
            if (this.isProcessing) return;

            const input = this.container.querySelector('.mobilolite-new-input');
            const sendBtn = this.container.querySelector('.mobilolite-new-send-btn');

            if (!input) return;

            const message = input.value.trim();
            if (!message) return;

            // Validate character limit
            if (message.length > 200) {
                this.showValidationError();
                return;
            }

            // Check if user is trying to login (keyword detection) - BEFORE processing
            const lowerMessage = message.toLowerCase();
            const loginKeywords = ['login', 'log in', 'sign in', 'signin'];
            const isLoginRequest = loginKeywords.some(keyword => lowerMessage.includes(keyword));

            if (isLoginRequest && !localStorage.getItem('mobilolite_auth_token')) {
                // Clear input
                input.value = '';
                this.updateCharCounter();

                // Add user message
                this.addUserMessage(message);

                // Open login modal directly
                setTimeout(() => {
                    this.openLoginModal();
                }, 300);

                return;
            }

            this.isProcessing = true;
            // input.disabled = true; // Allow typing but prevent sending
            if (sendBtn) sendBtn.disabled = true;

            // 🟢 Handle Handoff Mode - send via WebSocket instead of REST
            if (this.isHandoffMode) {
                this.sendHandoffMessage(message);
                input.value = '';
                this.updateCharCounter();
                this.isProcessing = false;
                if (sendBtn) sendBtn.disabled = false;
                return;
            }

            // 🟢 Handle Handoff Confirmation Response
            if (this.handoffPending) {
                const lowerMsg = message.toLowerCase();
                if (lowerMsg.includes('yes') || lowerMsg.includes('connect') || message === 'Yes, connect me to an agent') {
                    this.handleHandoffConfirmation(true);
                } else {
                    this.handleHandoffConfirmation(false);
                }
                input.value = '';
                this.updateCharCounter();
                this.isProcessing = false;
                if (sendBtn) sendBtn.disabled = false;
                return;
            }

            // Add user message to chat (display clean message to user)
            this.addUserMessage(message);
            input.value = '';
            this.updateCharCounter();

            // Prepare message for API - include job_id if present
            let apiMessage = message;
            if (this.pendingJobId) {
                apiMessage = `${message} (job_id: ${this.pendingJobId})`;
            }

            // Intercept Helpdesk Flow
            if (this.helpdeskOptions) {
                // Check if we're waiting for message input
                if (this.waitingForHelpdeskMessage) {
                    this.helpdeskMessage = message;
                    // Submit ticket with the message
                    this.submitHelpdeskTicket(this.selectedHelpdeskCategory, this.selectedHelpdeskSubCategory, message);
                    return;
                }

                // Check if message matches a category
                const selectedCategory = this.helpdeskOptions.find(opt => opt.label === message);

                if (selectedCategory) {
                    this.selectedHelpdeskCategory = message;

                    if (selectedCategory.children && selectedCategory.children.length > 0) {
                        // Normalize children to ensure they're in the right format for display
                        const normalizedChildren = selectedCategory.children.map(child => {
                            if (typeof child === 'string') {
                                return child;
                            } else if (child && typeof child === 'object') {
                                return child.label || child.value || child;
                            }
                            return child;
                        });


                        setTimeout(() => {
                            this.addBotMessage(`Please select a specific issue type for ${message}: `, normalizedChildren);
                            this.isProcessing = false;
                            if (input) input.focus();
                            if (sendBtn) sendBtn.disabled = false;
                        }, 500);
                        return;
                    } else {
                        // No sub-options, ask for message
                        this.waitingForHelpdeskMessage = true;
                        setTimeout(() => {
                            this.addBotMessage('Please describe your issue in detail:');
                            this.isProcessing = false;
                            if (input) input.focus();
                            if (sendBtn) sendBtn.disabled = false;
                        }, 500);
                        return;
                    }
                }

                // Check if message matches a sub-category of the selected category
                if (this.selectedHelpdeskCategory) {
                    const parentCategory = this.helpdeskOptions.find(opt => opt.label === this.selectedHelpdeskCategory);


                    if (parentCategory && parentCategory.children && parentCategory.children.length > 0) {
                        // Check if message matches any child (handle both string and object children)
                        const matchedChild = parentCategory.children.find(child => {
                            if (typeof child === 'string') {
                                return child === message;
                            } else if (child && typeof child === 'object') {
                                return child.label === message || child.value === message;
                            }
                            return false;
                        });

                        if (matchedChild) {
                            // Handle both string and object children
                            const subCategoryLabel = typeof matchedChild === 'string' ? matchedChild : (matchedChild.label || matchedChild.value || message);
                            this.selectedHelpdeskSubCategory = subCategoryLabel;

                            // Ask for message instead of auto-submitting
                            this.waitingForHelpdeskMessage = true;
                            setTimeout(() => {
                                this.addBotMessage('Please describe your issue in detail:');
                                this.isProcessing = false;
                                if (input) input.focus();
                                if (sendBtn) sendBtn.disabled = false;
                            }, 500);
                            return;
                        }
                    }
                }
            }

            // Show typing indicator
            this.showTyping();
            const startTime = Date.now();

            // Ensure session ID exists before sending
            if (!this.conversationId) {
                this.conversationId = this.generateSessionId();
                console.log('Generated new session ID:', this.conversationId);
            }

            // Prepare request payload
            // Use different tenant_id based on user type
            const isAuthenticated = !!localStorage.getItem('mobilolite_auth_token');
            const userType = localStorage.getItem('mobilolite_user_type');

            let tenantId = 'tech_company'; // Default for non-authenticated
            if (isAuthenticated) {
                if (userType === 'employee') {
                    tenantId = 'tech_employee';
                } else if (userType === 'customer') {
                    tenantId = 'tech_customer';
                }
            }

            const payload = {
                message: apiMessage,  // Use apiMessage which includes job_id if present
                session_id: this.conversationId, // Use the pre-generated session ID
                metadata: {
                    channel: "web",
                    user_id: "guest",
                    tenant_id: tenantId,
                    locale: "en",
                    extra: {
                        ...(this.pendingJobId && { job_id: this.pendingJobId }),
                        additionalProp1: {}
                    }
                }
            };

            // Clear pending job_id after adding to payload
            if (this.pendingJobId) {
                console.log('Including job_id in metadata:', this.pendingJobId);
                this.pendingJobId = null;
            }

            console.log('Sending payload:', payload);

            try {
                const response = await fetch(`${this.config.apiEndpoint.baseUrl}${this.config.apiEndpoint.chatMessage} `, {
                    method: 'POST',
                    headers: {
                        'accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                // Ensure typing indicator shows for at least 1.5 seconds
                const elapsedTime = Date.now() - startTime;
                const minDuration = 1500;
                if (elapsedTime < minDuration) {
                    await new Promise(resolve => setTimeout(resolve, minDuration - elapsedTime));
                }

                this.hideTyping();

                if (response.ok) {
                    const data = await response.json();
                    console.log('API Response:', data);
                    console.log('Options from API:', data.options);

                    // Update connection status to online after successful response
                    this.updateConnectionStatus(true);

                    // Update conversation ID if provided
                    if (data.session_id) {
                        this.conversationId = data.session_id;
                    }

                    // 🟢 Handle Human Handoff Response FIRST (before regular display)
                    if (data.handoff_pending) {
                        this.handoffPending = true;
                        this.showHandoffConfirmation(data.response);
                        return;
                    }

                    // Add bot response
                    // The new API returns the message in 'response' field
                    const botMessage = data.response || data.message;
                    const options = data.options || null;
                    const questionType = data.question_type || null;  // Extract question type from API
                    console.log('Bot message:', botMessage);
                    console.log('Extracted options:', options);
                    console.log('Question type:', questionType);

                    if (botMessage) {
                        // Split message by '---' and display as separate bubbles
                        const messages = botMessage.split('---');
                        for (let i = 0; i < messages.length; i++) {
                            const msg = messages[i].trim();
                            if (msg) {
                                // Only add options and question_type to the last message
                                const msgOptions = (i === messages.length - 1) ? options : null;
                                const msgQuestionType = (i === messages.length - 1) ? questionType : null;
                                await this.addBotMessage(msg, msgOptions, msgQuestionType);
                                // Small delay between messages for better UX
                                if (messages.length > 1) {
                                    await new Promise(resolve => setTimeout(resolve, 500));
                                }
                            }
                        }
                    }

                    // If handoff is active, switch to WebSocket mode
                    if (data.handoff_mode && data.websocket_url) {
                        this.switchToWebSocket(data.websocket_url);
                    }
                } else {
                    this.updateConnectionStatus(false);
                    this.addBotMessage('Sorry, I encountered an error. Please try again.');
                    console.error('API Error:', response.status, response.statusText);
                }
            } catch (error) {
                this.hideTyping();
                this.updateConnectionStatus(false);
                this.addBotMessage('Sorry, I could not connect to the server. Please try again later.');
                console.error('Network Error:', error);
            } finally {
                this.isProcessing = false;
                if (input) {
                    // input.disabled = false;
                    input.focus();
                }
                if (sendBtn) sendBtn.disabled = false;
            }
        }

        /**
         * Show handoff confirmation prompt with conversational buttons.
         */
        showHandoffConfirmation(message) {
            const confirmOptions = [
                { label: 'Yes, connect me to an agent', value: 'confirm_handoff' },
                { label: 'No, continue with AI', value: 'decline_handoff' }
            ];

            // Add the message with options
            this.addBotMessage(message || "Would you like me to connect you with a human agent?", confirmOptions);

            // Enable processing for next user input
            this.isProcessing = false;
            const input = this.container.querySelector('.mobilolite-new-input');
            const sendBtn = this.container.querySelector('.mobilolite-new-send-btn');
            if (input) input.focus();
            if (sendBtn) sendBtn.disabled = false;
        }

        /**
         * Handle user's handoff confirmation response.
         */
        async handleHandoffConfirmation(confirmed) {
            this.handoffPending = false;

            if (!confirmed) {
                this.addBotMessage("Okay, I'll continue to help you. How else can I assist you?");
                return;
            }

            // User confirmed - initiate handoff
            this.addBotMessage("Connecting you to a human agent...");
            this.isProcessing = true;

            try {
                // Use direct backend URL since widget is standalone
                const response = await fetch(`${this.config.apiEndpoint.baseUrl}/api/v1/handoff/confirm`, {
                    method: 'POST',
                    headers: {
                        'accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ session_id: this.conversationId })
                });

                const data = await response.json();

                if (data.success && data.websocket_url) {
                    this.switchToWebSocket(data.websocket_url);
                    this.addBotMessage(data.message || "You're in the queue. An agent will be with you shortly.");
                } else {
                    this.addBotMessage("Sorry, I couldn't connect you to an agent right now. Please try again later.");
                }
            } catch (error) {
                console.error('Handoff confirmation error:', error);
                this.addBotMessage("Sorry, there was an error connecting you to an agent. Please try again.");
            } finally {
                this.isProcessing = false;
            }
        }

        /**
         * Switch to WebSocket mode for real-time agent chat.
         */
        switchToWebSocket(wsUrl) {
            this.isHandoffMode = true;
            this.handoffStatus = 'waiting';
            this.updateHandoffStatusUI();

            // Build full WebSocket URL
            const wsBaseUrl = this.config.apiEndpoint.baseUrl.replace('http://', 'ws://').replace('https://', 'wss://');
            const fullWsUrl = `${wsBaseUrl}${wsUrl}`;

            console.log('Connecting to WebSocket:', fullWsUrl);

            try {
                this.handoffWebSocket = new WebSocket(fullWsUrl);

                this.handoffWebSocket.onopen = () => {
                    console.log('✅ WebSocket connected for handoff');
                    this.updateHandoffStatusUI();
                };

                this.handoffWebSocket.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        this.handleWebSocketMessage(data);
                    } catch (e) {
                        console.error('Error parsing WebSocket message:', e);
                    }
                };

                this.handoffWebSocket.onclose = () => {
                    console.log('🔌 WebSocket disconnected');
                    if (this.isHandoffMode) {
                        this.endHandoffMode('Connection lost. Returning to AI assistant.');
                    }
                };

                this.handoffWebSocket.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    this.addBotMessage("Connection error. Please try again.");
                    this.endHandoffMode();
                };
            } catch (error) {
                console.error('WebSocket connection error:', error);
                this.addBotMessage("Failed to connect to agent. Please try again.");
                this.isHandoffMode = false;
            }
        }

        /**
         * Handle incoming WebSocket messages.
         */
        handleWebSocketMessage(data) {
            console.log('WebSocket message:', data);

            switch (data.type) {
                case 'connected':
                    // Initial connection confirmation from server
                    console.log('✅ WebSocket connection confirmed');
                    break;

                case 'agent_connected':
                    this.handoffStatus = 'connected';
                    this.updateHandoffStatusUI();
                    this.addBotMessage(`You're now connected with ${data.agent_name || 'a support agent'}. How can they help you?`);
                    break;

                case 'message':
                    if (data.sender === 'agent') {
                        this.addAgentMessage(data.content);
                    }
                    break;

                case 'message_sent':
                    // Message delivery confirmation
                    console.log(`✅ Message ${data.message_id} delivered to agent`);
                    break;

                case 'message_queued':
                    // Message queued while waiting for agent
                    console.log(`📦 Message ${data.message_id} queued - waiting for agent`);
                    break;

                case 'handoff_ended':
                case 'session_ended':
                    this.endHandoffMode(data.message || "Your chat session has ended.");
                    break;

                case 'queue_update':
                    this.addBotMessage(`Queue update: You are #${data.position} in line.`);
                    break;

                case 'pong':
                    // Keep-alive response, no action needed
                    break;

                default:
                    console.log('Unknown WebSocket message type:', data.type);
            }
        }

        /**
         * Add a message from human agent (different styling).
         */
        addAgentMessage(content) {
            const msg = {
                sender: 'agent',
                message: content,
                timestamp: new Date().toISOString()
            };
            this.messages.push(msg);

            // Create message element with agent styling
            const chatArea = this.container.querySelector('.mobilolite-new-chat-area');
            if (!chatArea) return;

            const messageEl = document.createElement('div');
            messageEl.className = 'mobilolite-new-message';
            messageEl.innerHTML = `
                <div class="mobilolite-new-message-avatar" style="background: #22c55e;">
                    👤
                </div>
                <div class="mobilolite-new-message-content">
                    <div class="mobilolite-new-message-bubble" style="background: #dcfce7; border: 1px solid #22c55e;">
                        ${this.parseMarkdown(content)}
                    </div>
                    <div class="mobilolite-new-message-time">
                        Agent • ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                </div>
            `;

            chatArea.appendChild(messageEl);
            chatArea.scrollTop = chatArea.scrollHeight;
        }

        /**
         * Send message in handoff mode (via WebSocket).
         */
        sendHandoffMessage(message) {
            if (this.handoffWebSocket && this.handoffWebSocket.readyState === WebSocket.OPEN) {
                this.handoffWebSocket.send(JSON.stringify({
                    type: 'message',
                    content: message
                }));
                this.addUserMessage(message);
            } else {
                this.addBotMessage("Connection lost. Reconnecting...");
                // Attempt to reconnect
                if (this.conversationId) {
                    this.switchToWebSocket(`/ws/handoff/${this.conversationId}`);
                }
            }
        }

        /**
         * End handoff mode and return to AI assistant.
         */
        endHandoffMode(message = null) {
            this.isHandoffMode = false;
            this.handoffPending = false;
            this.handoffStatus = null;

            if (this.handoffWebSocket) {
                try {
                    this.handoffWebSocket.close();
                } catch (e) {
                    // Ignore close errors
                }
                this.handoffWebSocket = null;
            }

            this.updateHandoffStatusUI();

            if (message) {
                this.addBotMessage(message);
            }
            this.addBotMessage("You're back with the AI assistant. How can I help you?");
        }

        /**
         * Update handoff status indicator in UI.
         */
        updateHandoffStatusUI() {
            let statusEl = this.container.querySelector('.mobilolite-handoff-status');
            const header = this.container.querySelector('.mobilolite-new-header');

            if (!this.isHandoffMode) {
                if (statusEl) statusEl.remove();
                return;
            }

            if (!statusEl && header) {
                statusEl = document.createElement('div');
                statusEl.className = 'mobilolite-handoff-status';
                statusEl.style.cssText = 'padding: 8px 16px; background: #fef3c7; color: #92400e; font-size: 12px; font-weight: 600; text-align: center;';
                header.insertAdjacentElement('afterend', statusEl);
            }

            if (statusEl) {
                if (this.handoffStatus === 'connected') {
                    statusEl.textContent = '👤 Connected to Agent';
                    statusEl.style.background = '#dcfce7';
                    statusEl.style.color = '#166534';
                } else {
                    statusEl.textContent = '⏳ Waiting for agent...';
                    statusEl.style.background = '#fef3c7';
                    statusEl.style.color = '#92400e';
                }
            }
        }

        /**
         * Render job listings as an interactive card carousel.
         * @param {Array} jobs - Array of job objects
         * @returns {string} HTML string for the carousel
         */
        renderJobCarousel(jobs) {
            if (!jobs || jobs.length === 0) return '';

            const carouselId = `job-carousel-${Date.now()}`;
            const cardsHtml = jobs.map((job, index) => `
                <div class="job-card" data-job-id="${job.job_id || ''}" data-job-index="${index}" data-source-url="${job.source_file_url || ''}">
                    <div class="job-card-header">
                        <h4 class="job-card-title">${job.title || 'Untitled Position'}</h4>
                        <p class="job-card-company">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                            </svg>
                            ${job.location || 'Location not specified'}
                        </p>
                    </div>
                    <div class="job-card-meta">
                        ${job.job_type ? `<span class="job-card-tag">${job.job_type}</span>` : ''}
                        ${job.experience_level ? `<span class="job-card-tag">${job.experience_level}</span>` : ''}
                        ${job.salary_range ? `<span class="job-card-tag salary">💰 ${job.salary_range}</span>` : ''}
                    </div>
                    <p class="job-card-description">${job.short_description || job.description || 'No description available'}</p>
                    <div class="job-card-actions">
                        <button class="job-card-btn view" onclick="window.mobiloliteWidgetNew.handleJobAction('details', '${job.job_id}', '${(job.title || '').replace(/'/g, "\\'")}')">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                            </svg>
                            Details
                        </button>
                        <button class="job-card-btn apply" onclick="window.mobiloliteWidgetNew.handleJobAction('apply', '${job.job_id}', '${(job.title || '').replace(/'/g, "\\'")}')">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                            </svg>
                            Apply
                        </button>
                    </div>
                </div>
            `).join('');

            // Show navigation buttons only if more than 1 job
            const showNav = jobs.length > 1;

            return `
                <div class="job-carousel-wrapper">
                    <div class="job-cards-carousel" id="${carouselId}">
                        ${cardsHtml}
                    </div>
                    ${showNav ? `
                    <div class="carousel-nav">
                        <button class="carousel-nav-btn prev" onclick="window.mobiloliteWidgetNew.scrollCarousel('${carouselId}', -1)" title="Previous">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                <polyline points="15 18 9 12 15 6"/>
                            </svg>
                        </button>
                        <div class="carousel-dots">
                            ${jobs.map((_, i) => `<span class="carousel-dot ${i === 0 ? 'active' : ''}" data-index="${i}" onclick="window.mobiloliteWidgetNew.scrollToCard('${carouselId}', ${i})"></span>`).join('')}
                        </div>
                        <button class="carousel-nav-btn next" onclick="window.mobiloliteWidgetNew.scrollCarousel('${carouselId}', 1)" title="Next">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                <polyline points="9 18 15 12 9 6"/>
                            </svg>
                        </button>
                    </div>
                    ` : ''}
                </div>
            `;
        }

        /**
         * Scroll carousel by direction (-1 = prev, 1 = next)
         */
        scrollCarousel(carouselId, direction) {
            console.log(`📍 scrollCarousel called: id=${carouselId}, direction=${direction}`);
            const carousel = document.getElementById(carouselId);
            if (!carousel) {
                console.error(`❌ Carousel not found: ${carouselId}`);
                return;
            }

            // Use container width since each card is 100% width
            const scrollAmount = carousel.offsetWidth * direction;

            console.log(`📍 Scrolling by ${scrollAmount}px (container width: ${carousel.offsetWidth})`);
            carousel.scrollBy({ left: scrollAmount, behavior: 'smooth' });

            // Update dots after scroll
            const self = this;
            setTimeout(() => self.updateCarouselDots(carouselId), 350);
        }

        /**
         * Scroll to specific card index
         */
        scrollToCard(carouselId, index) {
            console.log(`📍 scrollToCard called: id=${carouselId}, index=${index}`);
            const carousel = document.getElementById(carouselId);
            if (!carousel) {
                console.error(`❌ Carousel not found: ${carouselId}`);
                return;
            }

            const cards = carousel.querySelectorAll('.job-card');
            if (cards[index]) {
                cards[index].scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
                this.updateCarouselDots(carouselId, index);
            }
        }

        /**
         * Update carousel dots to reflect current position
         */
        updateCarouselDots(carouselId, activeIndex = null) {
            const carousel = document.getElementById(carouselId);
            if (!carousel) return;

            // Try to find wrapper by checking both possible container classes
            let wrapper = carousel.closest('.job-carousel-wrapper');
            if (!wrapper) {
                wrapper = carousel.closest('.job-carousel-container');
            }
            if (!wrapper) return;

            const dots = wrapper.querySelectorAll('.carousel-dot');

            if (activeIndex === null) {
                // Calculate active index from scroll position (container width = card width)
                const containerWidth = carousel.offsetWidth || 280;
                activeIndex = Math.round(carousel.scrollLeft / containerWidth);
            }

            dots.forEach((dot, i) => {
                dot.classList.toggle('active', i === activeIndex);
            });
        }

        /**
         * Handle job card button actions (Details or Apply).
         */
        handleJobAction(action, jobId, jobTitle) {
            console.log(`Job action: ${action}, ID: ${jobId}, Title: ${jobTitle}`);
            const input = this.container.querySelector('.mobilolite-new-input');

            if (action === 'details') {
                // Ask for more details about the job
                if (input) {
                    // Store job_id to be sent in message and metadata
                    this.pendingJobId = jobId;
                    input.value = `Tell me more details about the ${jobTitle} position`;
                    this.sendMessage();
                }
            } else if (action === 'apply') {
                if (input) {
                    // Store job_id to be sent in message and metadata
                    this.pendingJobId = jobId;
                    // Clean message without job_id visible to user
                    input.value = `I want to apply for ${jobTitle}`;
                    this.sendMessage();
                }
            }
        }

        /**
         * Parse bot message for job listings and return structured data.
         */
        parseJobListings(message) {
            // Check if message contains job listing patterns
            if (!message) return null;

            // Look for JSON-like job data in the message
            try {
                // Try to extract jobs array from markdown code blocks
                const codeBlockMatch = message.match(/```json\s*(\[[\s\S]*?\])\s*```/);
                if (codeBlockMatch) {
                    return JSON.parse(codeBlockMatch[1]);
                }

                // Try to find jobs array directly
                const jsonMatch = message.match(/\[[\s\S]*?"job_id"[\s\S]*?\]/);
                if (jsonMatch) {
                    return JSON.parse(jsonMatch[0]);
                }
            } catch (e) {
                console.log('Could not parse jobs from message');
            }

            return null;
        }

        /**
         * Show interactive upload prompt in the chat.
         */
        showUploadPrompt() {
            // Remove any existing prompt
            this.hideUploadPrompt();

            const chatArea = this.container.querySelector('.mobilolite-new-chat-area');
            if (!chatArea) return;

            const promptHtml = `
                <div class="mobilolite-upload-prompt show" id="upload-prompt" onclick="document.getElementById('mobilolite-file-input').click()">
                    <div class="mobilolite-upload-prompt-icon">📎</div>
                    <div class="mobilolite-upload-prompt-text">
                        <p class="mobilolite-upload-prompt-title">Upload Your Resume</p>
                        <p class="mobilolite-upload-prompt-subtitle">Click here to select your resume file (PDF, DOC, DOCX)</p>
                    </div>
                    <span class="mobilolite-upload-prompt-arrow">→</span>
                </div>
            `;

            chatArea.insertAdjacentHTML('beforeend', promptHtml);
            chatArea.scrollTop = chatArea.scrollHeight;
        }

        /**
         * Hide the upload prompt.
         */
        hideUploadPrompt() {
            const prompt = this.container.querySelector('#upload-prompt');
            if (prompt) {
                prompt.remove();
            }
        }

        openApplyLeaveModal() {
            // Check auth
            const token = localStorage.getItem('mobilolite_auth_token');
            if (!token) {
                this.addBotMessage('Please login first to apply for leave.');
                this.openLoginModal();
                return;
            }

            this.closeDropdown();
            const modal = this.container.querySelector('#mobilolite-leave-modal');
            if (modal) {
                modal.classList.add('show');

                // Set default dates if needed (e.g., today)
                const today = new Date().toISOString().split('T')[0];
                const startInput = modal.querySelector('input[name="start"]');
                const endInput = modal.querySelector('input[name="end"]');

                if (startInput && !startInput.value) startInput.value = today;
                if (endInput && !endInput.value) endInput.value = today;
            }
        }

        closeApplyLeaveModal() {
            const modal = this.container.querySelector('#mobilolite-leave-modal');
            if (modal) {
                modal.classList.remove('show');
            }
        }

        async handleApplyLeaveSubmit(event) {
            event.preventDefault();
            const form = event.target;
            const btn = form.querySelector('button[type="submit"]');

            // Get form data
            const type = form.querySelector('select[name="type"]').value;
            const start = form.querySelector('input[name="start"]').value;
            const end = form.querySelector('input[name="end"]').value;
            const reason = form.querySelector('textarea[name="reason"]').value;

            // Get user details from localStorage
            const userDetailsStr = localStorage.getItem('mobilolite_user_details');
            let user = {};
            try {
                user = JSON.parse(userDetailsStr || '{}');
            } catch (e) {
                console.error('Error parsing user details', e);
            }

            // Extract employee information with fallbacks (matching helpdesk pattern)
            const email = user.email || (user.user && user.user.email) || localStorage.getItem('email') || '';
            const fullName = user.name || (user.user && user.user.name) || user.full_name || localStorage.getItem('full_name') || localStorage.getItem('name') || 'Employee';
            const employeeCode = user.employeeCode || user.employee_code || user.emp_id || localStorage.getItem('employeeCode') || localStorage.getItem('employee_code') || 'N/A';
            const department = user.department || localStorage.getItem('department') || 'General';
            const designation = user.designation || localStorage.getItem('designation') || 'Employee';

            console.log('Leave Application - User Data:', { email, fullName, employeeCode, department, designation });

            // Validate only critical fields
            if (!email) {
                this.closeApplyLeaveModal();
                this.addBotMessage('❌ Error: Could not identify user email. Please login again.');
                return;
            }

            if (!type || !start || !end || !reason) {
                alert('Please fill in all fields');
                return;
            }

            // Validate dates
            if (new Date(start) > new Date(end)) {
                alert('Start date cannot be after end date');
                return;
            }

            const originalText = btn.textContent;
            btn.textContent = 'Submitting...';
            btn.disabled = true;

            // Construct payload matching the ESS portal API structure
            const payload = {
                employeeInfo: {
                    employeeCode: employeeCode,
                    fullName: fullName,
                    department: department,
                    designation: designation,
                    email: email
                },
                leaveDetails: {
                    leaveType: type,
                    fromDate: start,
                    toDate: end,
                    reasonForLeave: reason
                }
            };

            console.log('Leave Application - Payload:', JSON.stringify(payload, null, 2));

            try {
                const token = localStorage.getItem('mobilolite_auth_token');
                console.log('Leave Application - Token exists:', !!token);

                const response = await fetch('https://py-mobiloitte.converiqo.ai/api/v1/ess-portal/leave-applications', {
                    method: 'POST',
                    headers: {
                        'accept': 'application/json',
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    const data = await response.json();
                    this.closeApplyLeaveModal();
                    this.addBotMessage(`✅ Leave application submitted successfully!\n\nType: ${type}\nFrom: ${start}\nTo: ${end}\nReason: ${reason}`);

                    // Reset form
                    form.reset();
                } else {
                    // Handle error response
                    const text = await response.text();
                    let errorMessage = `Server error ${response.status}`;

                    try {
                        const errorData = JSON.parse(text);
                        if (errorData.detail) {
                            errorMessage = errorData.detail;
                        } else if (errorData.message) {
                            errorMessage = errorData.message;
                        }
                    } catch {
                        if (text && text.length < 500) {
                            errorMessage = text.replace(/^.*?"detail"\s*:\s*"([^"]+)".*$/, '$1') || text;
                        }
                    }

                    console.error('Leave application failed:', errorMessage);

                    // Show user-friendly error messages
                    if (errorMessage.includes('overlap')) {
                        alert(`${errorMessage}\n\nPlease select different dates that do not overlap with your existing leave applications.`);
                    } else if (errorMessage.includes('balance') || errorMessage.includes('Insufficient')) {
                        alert(`${errorMessage}\n\nPlease contact your manager or HR for assistance.`);
                    } else {
                        alert(`Failed to apply for leave: ${errorMessage}`);
                    }
                }
            } catch (error) {
                console.error('Leave application error:', error);
                alert('An error occurred while submitting your leave application. Please try again.');
            } finally {
                btn.textContent = originalText;
                btn.disabled = false;
            }
        }

        quickAction(action) {
            // Close the service menu
            const serviceMenu = this.container.querySelector('#mobilolite-service-menu');
            if (serviceMenu) {
                serviceMenu.classList.remove('show');
            }

            switch (action) {
                case 'chat':
                    // Close menu and focus on input
                    const input = this.container.querySelector('.mobilolite-new-input');
                    if (input) input.focus();
                    break;
                case 'contact':
                    // Send contact message
                    const contactInput = this.container.querySelector('.mobilolite-new-input');
                    if (contactInput) {
                        contactInput.value = 'I want to contact Mobiloitte';
                        this.sendMessage();
                    }
                    break;
                case 'employee':
                    // Open login modal with employee pre-selected
                    this.openLoginModal('employee');
                    break;
                case 'customer':
                    // Open login modal with customer pre-selected
                    this.openLoginModal('customer');
                    break;
            }
        }

        openLoginModal(userType = null) {
            const modal = this.container.querySelector('#mobilolite-login-modal');
            if (modal) {
                modal.classList.add('show');

                // Pre-select user type if provided
                if (userType) {
                    const employeeRadio = modal.querySelector('input[name="userType"][value="employee"]');
                    const customerRadio = modal.querySelector('input[name="userType"][value="customer"]');

                    if (userType === 'employee' && employeeRadio) {
                        employeeRadio.checked = true;
                    } else if (userType === 'customer' && customerRadio) {
                        customerRadio.checked = true;
                    }
                }
            }
        }

        closeLoginModal() {
            const modal = this.container.querySelector('#mobilolite-login-modal');
            if (modal) {
                modal.classList.remove('show');
            }
        }

        toggleServiceMenu() {
            const serviceMenu = this.container.querySelector('#mobilolite-service-menu');
            if (serviceMenu) {
                serviceMenu.classList.toggle('show');
            }
        }

        sendQuickAction(message) {
            const input = this.container.querySelector('.mobilolite-new-input');
            if (input) {
                input.value = message;
                this.sendMessage();
            }
        }

        handleContactUs() {
            this.closeDropdown();
            const input = this.container.querySelector('.mobilolite-new-input');
            if (input) {
                input.value = 'I want to contact Mobiloitte';
                this.sendMessage();
            }
        }

        closeDropdown() {
            const dropdown = this.container.querySelector('#mobilolite-dropdown');
            if (dropdown) {
                dropdown.classList.remove('show');
            }
        }

        toggleDropdown() {
            const dropdown = this.container.querySelector('#mobilolite-dropdown');
            if (dropdown) {
                dropdown.classList.toggle('show');
            }
        }

    }

    // Initialize widget
    window.MobiloliteWidgetNew = MobiloliteWidgetNew;

    // Auto-initialize with default config
    window.mobiloliteWidgetNew = new MobiloliteWidgetNew(window.MobiloliteConfigNew || {});

})();
