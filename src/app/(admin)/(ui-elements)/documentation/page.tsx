/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
/* eslint-disable react/no-unescaped-entities */

import { useState, useEffect, useMemo, type ReactNode } from 'react';
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'], display: 'swap' })

export default function DocumentPage() {
    const [activeSection, setActiveSection] = useState('home')
    const [sidebarVisible, setSidebarVisible] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [isSearchOpen, setIsSearchOpen] = useState(false)
    const [activeSuggestion, setActiveSuggestion] = useState<number>(-1)




    // Debounce the search query slightly to avoid recomputing on every keystroke
    const [debouncedQuery, setDebouncedQuery] = useState('')
    useEffect(() => {
        const handle = setTimeout(() => setDebouncedQuery(searchQuery), 200)
        return () => clearTimeout(handle)
    }, [searchQuery])
    // Will be populated after mount to avoid referencing content before initialization
    const [docEntries, setDocEntries] = useState<Array<[string, { title?: string }]>>([])
    const suggestions = useMemo(() => {
        const q = debouncedQuery.trim().toLowerCase()
        if (!q) return [] as Array<[string, any]>
        return docEntries
            .filter(([key, val]) => {
                const title = (((val as any)?.title) || key).toLowerCase()
                return title.includes(q) || key.toLowerCase().includes(q)
            })
            .slice(0, 8)
    }, [docEntries, debouncedQuery])

    // Removed legacy download-to-PDF block to satisfy React hooks and lint rules.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_openGroup, _setOpenGroup] = useState<string>('')

    // Function to handle section change; auto-close only on mobile
    const handleSectionChange = (section: string) => {
        setActiveSection(section)
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
            setSidebarVisible(false)
        }
    }

    // Keep sidebar state persistent; no auto-close on resize
    useEffect(() => { }, [])

    // Populate entries after content is initialized
    useEffect(() => {
        const entries = Object.entries((documentationContent as any)) as Array<[string, { title?: string }]>
        setDocEntries(entries)
        // documentationContent referenced intentionally; it's static in-module
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [/* documentationContent */])

    // Keyboard shortcut to close sidebar (Escape key)
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && sidebarVisible) {
                setSidebarVisible(false)
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [sidebarVisible])

    const documentationContent = {
        'home': {
            title: 'Home',
            content: (
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">AI Agent Chat Interface</h1>
                    <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
                        This is your primary interface for interacting with the AI Agent. It's designed to be intuitive and efficient, allowing you to quickly get assistance and information.
                    </p>

                    {/* High-level product documentation */}
                    <section className="mb-10">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">AI Agent Chatbot – Overview</h2>
                        <p className="text-gray-700 dark:text-gray-300 mb-3">The AI Agent Chatbot is an intelligent virtual assistant that enables real‑time Q&A, support, and scheduling with a clean, modern UI.</p>
                        <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-1">
                            <li>Improves customer support and productivity with instant answers</li>
                            <li>Seamless communication with profile‑aware personalization</li>
                            <li>Developer‑friendly architecture for easy integration</li>
                        </ul>
                    </section>


                    <section className="mb-10">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">User Interface (UI)</h3>
                        <div className="space-y-3">
                            <div>
                                <h4 className="font-semibold text-gray-900 dark:text-gray-100">Header (top‑right)</h4>
                                <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 text-sm">
                                    <li>Theme toggle (light/dark)</li>
                                    <li>User profile (Mobiloitte) with account options</li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-900 dark:text-gray-100">Sidebar (top‑left, hamburger)</h4>
                                <p className="text-sm text-gray-700 dark:text-gray-300">Expandable navigation for other product areas.</p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-900 dark:text-gray-100">Chat window</h4>
                                <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 text-sm">
                                    <li>Bot: <strong>AI Agent</strong> (Test Bot)</li>
                                    <li>Intro: “Ask me anything and I’ll do my best to help!”</li>
                                    <li>Default greeting to start the conversation</li>
                                    <li>Input box + Send button (paper‑plane)</li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-900 dark:text-gray-100">Toolbar (top of chat)</h4>
                                <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 text-sm">
                                    <li>🎧 Support call</li>
                                    <li>📅 Schedule/booking</li>
                                    <li>➡️ Login/Logout</li>
                                    <li>❌ Close chat</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    <section className="mb-10">
                        <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-5">Key Features</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm hover:shadow-md transition">
                                <div className="flex items-start gap-3">
                                    <div className="text-green-500 text-xl">✅</div>
                                    <div>
                                        <h4 className="font-semibold text-gray-900 dark:text-gray-100">Improves customer support</h4>
                                        <p className="text-sm text-gray-700 dark:text-gray-300">Fast, accurate responses reduce wait times and delight users.</p>
                                    </div>
                                </div>
                            </div>
                            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm hover:shadow-md transition">
                                <div className="flex items-start gap-3">
                                    <div className="text-yellow-500 text-xl">⚡</div>
                                    <div>
                                        <h4 className="font-semibold text-gray-900 dark:text-gray-100">Seamless communication</h4>
                                        <p className="text-sm text-gray-700 dark:text-gray-300">Natural language chat with context for smooth conversations.</p>
                                    </div>
                                </div>
                            </div>
                            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm hover:shadow-md transition">
                                <div className="flex items-start gap-3">
                                    <div className="text-blue-500 text-xl">🛠️</div>
                                    <div>
                                        <h4 className="font-semibold text-gray-900 dark:text-gray-100">Developer-friendly integration</h4>
                                        <p className="text-sm text-gray-700 dark:text-gray-300">Clean APIs and hooks for quick setup and customization.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>



                    <section className="mb-12">
                        <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Typical User Flow</h3>
                        <ol className="list-decimal pl-6 text-gray-700 dark:text-gray-300 space-y-1 text-sm">
                            <li>User opens chat → AI Agent greets with a welcome message</li>
                            <li>User types a message in the input box</li>
                            <li>Send (click or Enter) → message submitted</li>
                            <li>AI Agent responds → conversation appears in history</li>
                        </ol>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">Optional actions: 🎧 support, 📅 scheduling, ➡️ session, ❌ close.</p>
                    </section>

                    {/* Related Articles */}
                    <section className="mt-12 border-t pt-6 border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Related Articles</h3>
                        <div className="flex flex-wrap gap-3">
                            <button onClick={() => handleSectionChange('knowledge-hub')} className="px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">Knowledge Hub</button>
                            <button onClick={() => handleSectionChange('dashboard-overview')} className="px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">Dashboards Overview</button>
                        </div>
                    </section>

                    <section className="mb-10">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Technical Architecture (Developers)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded">
                                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Frontend</h4>
                                <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300">
                                    <li>React/Next.js + Tailwind CSS</li>
                                    <li>Modern icon set (Lucide or similar)</li>
                                </ul>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded">
                                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Backend</h4>
                                <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300">
                                    <li>FastAPI or Node.js (Express) APIs</li>
                                    <li>OpenAI / Mistral integration for AI</li>
                                </ul>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded">
                                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Data & Auth</h4>
                                <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300">
                                    <li>MongoDB for chat logs & sessions</li>
                                    <li>JWT or session‑based authentication</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    <section className="mb-12">
                        <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Example</h3>
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded text-sm text-blue-900 dark:text-blue-100">
                            <p className="mb-1"><strong>User:</strong> Hi, I want to know about your services.</p>
                            <p><strong>AI Agent:</strong> Sure! I provide AI‑driven solutions, chatbot development, and smart integrations. Would you like me to explain more about a specific service?</p>
                        </div>
                    </section>

                    <section className="mb-10">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Future Enhancements</h3>
                        <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 text-sm space-y-1">
                            <li>Voice interaction (speech‑to‑text / text‑to‑speech)</li>
                            <li>Multi‑language support</li>
                            <li>Analytics dashboard for admins</li>
                            <li>Human handoff to live agents</li>
                        </ul>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Interface Overview</h2>
                        <div className="bg-blue-50 dark:bg-blue-900/15 p-6 rounded-lg mb-6">
                            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-3">Welcome Message</h3>
                            <p className="text-blue-800 dark:text-blue-200">"Hello! I'm AI Agent. How can I help you today?" - Your AI assistant is ready to help!</p>
                        </div>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Key Components</h2>

                        <div className="space-y-6">
                            <div className="border border-gray-200 rounded-lg p-6">
                                <h3 className="text-xl font-semibold text-gray-800 mb-3">1. Header Bar (Top Navigation)</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded">
                                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Left Side</h4>
                                        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                                            <li>• <strong>Hamburger Menu Icon:</strong> Opens/closes main navigation sidebar</li>
                                        </ul>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded">
                                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Right Side</h4>
                                        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                                            <li>• <strong>Moon Icon:</strong> Toggle light/dark mode</li>
                                            <li>• <strong>Mobiloitte Logo:</strong> Company branding</li>
                                            <li>• <strong>Dropdown Arrow:</strong> User account options</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            <div className="border border-gray-200 rounded-lg p-6">
                                <h3 className="text-xl font-semibold text-gray-800 mb-3">2. Chat Window Controls</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="text-center">
                                        <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-2">
                                            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                                            </svg>
                                        </div>
                                        <p className="text-sm font-medium">Headphone</p>
                                        <p className="text-xs text-gray-600">Voice input/output</p>
                                    </div>
                                    <div className="text-center">
                                        <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-2">
                                            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                                            </svg>
                                        </div>
                                        <p className="text-sm font-medium">Calendar</p>
                                        <p className="text-xs text-gray-600">Chat history</p>
                                    </div>
                                    <div className="text-center">
                                        <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-2">
                                            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <p className="text-sm font-medium">Forward</p>
                                        <p className="text-xs text-gray-600">Share chat</p>
                                    </div>
                                    <div className="text-center">
                                        <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-2">
                                            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <p className="text-sm font-medium">Close</p>
                                        <p className="text-xs text-gray-600">End session</p>
                                    </div>
                                </div>
                            </div>

                            <div className="border border-gray-200 rounded-lg p-6">
                                <h3 className="text-xl font-semibold text-gray-800 mb-3">3. AI Agent Information</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center">
                                        <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                                        <span className="text-sm font-medium">Test Bot</span>
                                        <span className="text-xs text-gray-500 ml-2">(Active Bot Instance)</span>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded">
                                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">AI Agent Title</h4>
                                        <p className="text-gray-700 dark:text-gray-300">"AI Agent" - Main interface title</p>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded">
                                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Welcome Message</h4>
                                        <p className="text-gray-700 dark:text-gray-300">"Ask me anything and I'll do my best to help!"</p>
                                    </div>
                                </div>
                            </div>

                            <div className="border border-gray-200 rounded-lg p-6">
                                <h3 className="text-xl font-semibold text-gray-800 mb-3">4. User Input Area</h3>
                                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded">
                                    <div className="flex items-center space-x-3">
                                        <div className="flex-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2">
                                            <span className="text-gray-500">Type your message here...</span>
                                        </div>
                                        <button className="bg-blue-600 text-white p-2 rounded-lg">
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                                            </svg>
                                        </button>
                                    </div>
                                    <p className="text-sm text-gray-600 mt-2">Click the send button or press Enter to send your message</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">How to Use</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-green-50 dark:bg-green-900/15 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-green-900 dark:text-green-200 mb-3">Getting Started</h3>
                                <ol className="text-green-800 dark:text-green-200 space-y-2 text-sm">
                                    <li>1. Type your question in the input field</li>
                                    <li>2. Click the send button or press Enter</li>
                                    <li>3. Wait for the AI Agent to respond</li>
                                    <li>4. Continue the conversation as needed</li>
                                </ol>
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-900/15 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-3">Features</h3>
                                <ul className="text-blue-800 dark:text-blue-200 space-y-2 text-sm">
                                    <li>• <strong>Voice Input:</strong> Use headphone icon for voice commands</li>
                                    <li>• <strong>Chat History:</strong> Access previous conversations</li>
                                    <li>• <strong>Theme Toggle:</strong> Switch between light/dark modes</li>
                                    <li>• <strong>Navigation:</strong> Access other system modules</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Tips for Best Experience</h2>
                        <div className="bg-yellow-50 dark:bg-yellow-900/15 p-6 rounded-lg">
                            <ul className="text-yellow-800 dark:text-yellow-200 space-y-2">
                                <li>• <strong>Be Specific:</strong> Ask clear, detailed questions for better responses</li>
                                <li>• <strong>Use Natural Language:</strong> Talk to the AI like you would to a human</li>
                                <li>• <strong>Follow Up:</strong> Ask follow-up questions to get more detailed information</li>
                                <li>• <strong>Save Important Info:</strong> Use the calendar icon to access chat history</li>
                                <li>• <strong>Switch Themes:</strong> Use the moon icon to change interface appearance</li>
                            </ul>
                        </div>
                    </section>
                </div>
            )
        },
        'dashboards': {
            title: 'Dashboards',
            content: (
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">Dashboards</h1>
                    <p className="text-gray-700 mb-6 leading-relaxed">
                        Comprehensive analytical dashboards providing real-time data visualization, performance metrics, and insights across all system modules.
                    </p>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Available Dashboards</h2>
                        <div className="space-y-4">
                            <div className="border border-gray-200 rounded-lg p-6 hover:bg-gray-50 transition-colors">
                                <div className="flex items-center mb-3">
                                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                                        <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-semibold text-gray-900">Overview</h3>
                                </div>
                                <p className="text-gray-700 dark:text-gray-300 mb-3">Comprehensive system overview with key performance indicators, recent activities, and quick access to all modules.</p>
                                <div className="flex flex-wrap gap-2">
                                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">KPIs</span>
                                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">Analytics</span>
                                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">Quick Actions</span>
                                </div>
                            </div>

                            <div className="border border-gray-200 rounded-lg p-6 hover:bg-gray-50 transition-colors">
                                <div className="flex items-center mb-3">
                                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                                        <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-semibold text-gray-900">Leads Dashboard</h3>
                                </div>
                                <p className="text-gray-700 dark:text-gray-300 mb-3">Track lead generation, conversion rates, pipeline status, and sales performance metrics in real-time.</p>
                                <div className="flex flex-wrap gap-2">
                                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">Lead Tracking</span>
                                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">Conversion Rates</span>
                                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">Pipeline</span>
                                </div>
                            </div>

                            <div className="border border-gray-200 rounded-lg p-6 hover:bg-gray-50 transition-colors">
                                <div className="flex items-center mb-3">
                                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                                        <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-semibold text-gray-900">Recruitment Dashboard</h3>
                                </div>
                                <p className="text-gray-700 dark:text-gray-300 mb-3">Monitor job applications, candidate status, interview schedules, and hiring pipeline progress.</p>
                                <div className="flex flex-wrap gap-2">
                                    <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">Applications</span>
                                    <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">Candidates</span>
                                    <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">Interviews</span>
                                </div>
                            </div>

                            <div className="border border-gray-200 rounded-lg p-6 hover:bg-gray-50 transition-colors">
                                <div className="flex items-center mb-3">
                                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mr-4">
                                        <svg className="w-6 h-6 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-semibold text-gray-900">Chat Dashboard</h3>
                                </div>
                                <p className="text-gray-700 dark:text-gray-300 mb-3">Track AI Agent conversations, response times, user satisfaction, and chat analytics.</p>
                                <div className="flex flex-wrap gap-2">
                                    <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded">Conversations</span>
                                    <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded">Response Time</span>
                                    <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded">Satisfaction</span>
                                </div>
                            </div>

                            <div className="border border-gray-200 rounded-lg p-6 hover:bg-gray-50 transition-colors">
                                <div className="flex items-center mb-3">
                                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mr-4">
                                        <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                                            <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-semibold text-gray-900">Helpdesk Dashboard</h3>
                                </div>
                                <p className="text-gray-700 dark:text-gray-300 mb-3">Monitor support tickets, resolution times, customer satisfaction, and support team performance.</p>
                                <div className="flex flex-wrap gap-2">
                                    <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">Tickets</span>
                                    <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">Resolution Time</span>
                                    <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">Satisfaction</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Dashboard Features</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-blue-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-blue-900 mb-3">Real-time Analytics</h3>
                                <ul className="text-blue-800 space-y-2 text-sm">
                                    <li>• Live data updates and metrics</li>
                                    <li>• Interactive charts and graphs</li>
                                    <li>• Performance trend analysis</li>
                                    <li>• Custom date range filtering</li>
                                </ul>
                            </div>
                            <div className="bg-green-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-green-900 mb-3">Data Visualization</h3>
                                <ul className="text-green-800 space-y-2 text-sm">
                                    <li>• Bar charts and line graphs</li>
                                    <li>• Pie charts for distribution</li>
                                    <li>• Heat maps for patterns</li>
                                    <li>• Exportable reports</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">How to Access</h2>
                        <div className="bg-gray-50 p-6 rounded-lg">
                            <ol className="text-gray-700 space-y-2">
                                <li>1. Click on <strong>"Dashboards"</strong> in the main navigation menu</li>
                                <li>2. Select the specific dashboard you want to view from the dropdown</li>
                                <li>3. Use the dashboard controls to filter data and customize views</li>
                                <li>4. Export reports or share insights as needed</li>
                            </ol>
                        </div>
                    </section>
                </div>
            )
        },
        'dashboard-overview': {
            title: 'Dashboard Overview',
            content: (
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">Dashboard Overview</h1>
                    <p className="text-gray-700 mb-6 leading-relaxed">
                        Get a high-level overview of key metrics, recent activity, and quick actions across the platform. This comprehensive dashboard provides real-time insights into your system's performance and user activities.
                    </p>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Page Layout & Navigation</h2>
                        <div className="bg-blue-50 p-6 rounded-lg">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h3 className="text-lg font-semibold text-blue-900 mb-3">Header Section</h3>
                                    <ul className="text-blue-800 space-y-2 text-sm">
                                        <li>• <strong>Page Title:</strong> "Dashboard Overview" with information icon</li>
                                        <li>• <strong>Description:</strong> Brief explanation of dashboard purpose</li>
                                        <li>• <strong>Breadcrumbs:</strong> "Home {'>'} Dashboard" navigation path</li>
                                        <li>• <strong>Filter Button:</strong> Access to dashboard filtering options</li>
                                    </ul>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-blue-900 mb-3">Content Organization</h3>
                                    <ul className="text-blue-800 space-y-2 text-sm">
                                        <li>• <strong>Key Metrics Cards:</strong> Top section with 5 metric cards</li>
                                        <li>• <strong>Recent Activity:</strong> Left panel with scrollable activity feed</li>
                                        <li>• <strong>Quick Actions:</strong> Right panel with action buttons</li>
                                        <li>• <strong>Overview Chart:</strong> Bottom section with bar chart visualization</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Key Metrics Cards</h2>
                        <p className="text-gray-700 mb-4">Five primary metric cards provide instant insights into system activity:</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800/50">
                                <div className="flex items-center mb-2">
                                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mr-3">
                                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                                        </svg>
                                    </div>
                                    <h3 className="font-semibold text-blue-900">Threads</h3>
                                </div>
                                <div className="text-2xl font-bold text-blue-600">57</div>
                                <p className="text-sm text-blue-700">Active conversation threads</p>
                            </div>

                            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800/50">
                                <div className="flex items-center mb-2">
                                    <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center mr-3">
                                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <h3 className="font-semibold text-purple-900">Documents</h3>
                                </div>
                                <div className="text-2xl font-bold text-purple-600">2</div>
                                <p className="text-sm text-purple-700">Uploaded knowledge files</p>
                            </div>

                            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800/50">
                                <div className="flex items-center mb-2">
                                    <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center mr-3">
                                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <h3 className="font-semibold text-green-900">Leads</h3>
                                </div>
                                <div className="text-2xl font-bold text-green-600">68</div>
                                <p className="text-sm text-green-700">Potential customers</p>
                            </div>

                            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800/50">
                                <div className="flex items-center mb-2">
                                    <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center mr-3">
                                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <h3 className="font-semibold text-yellow-900">Applicants</h3>
                                </div>
                                <div className="text-2xl font-bold text-yellow-600">0</div>
                                <p className="text-sm text-yellow-700">Job applications</p>
                            </div>

                            <div className="bg-pink-50 dark:bg-pink-900/20 p-4 rounded-lg border border-pink-200 dark:border-pink-800/50">
                                <div className="flex items-center mb-2">
                                    <div className="w-8 h-8 bg-pink-500 rounded-lg flex items-center justify-center mr-3">
                                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                                            <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <h3 className="font-semibold text-pink-900">Tickets</h3>
                                </div>
                                <div className="text-2xl font-bold text-pink-600">0</div>
                                <p className="text-sm text-pink-700">Support tickets</p>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Recent Activity Panel</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-gray-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Activity Feed Features</h3>
                                <ul className="text-gray-700 space-y-2 text-sm">
                                    <li>• <strong>Real-time Updates:</strong> Live activity monitoring</li>
                                    <li>• <strong>User Information:</strong> Name, role, and department</li>
                                    <li>• <strong>Timestamp:</strong> Date and time of activity</li>
                                    <li>• <strong>Status Tracking:</strong> Current processing status</li>
                                    <li>• <strong>Interest Areas:</strong> User preferences and skills</li>
                                    <li>• <strong>Scrollable List:</strong> Access to historical activities</li>
                                </ul>
                            </div>
                            <div className="bg-blue-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-blue-900 mb-3">Activity Types</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center">
                                        <div className="w-6 h-6 bg-yellow-500 rounded-full mr-3"></div>
                                        <span className="text-sm font-medium">Applicant Activities</span>
                                    </div>
                                    <div className="flex items-center">
                                        <div className="w-6 h-6 bg-green-500 rounded-full mr-3"></div>
                                        <span className="text-sm font-medium">Lead Activities</span>
                                    </div>
                                    <div className="flex items-center">
                                        <div className="w-6 h-6 bg-blue-500 rounded-full mr-3"></div>
                                        <span className="text-sm font-medium">System Activities</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Quick Actions Panel</h2>
                        <div className="bg-green-50 p-6 rounded-lg">
                            <h3 className="text-lg font-semibold text-green-900 mb-4">Available Actions</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-white p-4 rounded-lg border border-green-200">
                                    <div className="flex items-center mb-2">
                                        <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center mr-3">
                                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <span className="font-semibold text-green-900">Add Lead</span>
                                    </div>
                                    <p className="text-sm text-green-700">Quickly add new potential customers</p>
                                </div>

                                <div className="bg-white p-4 rounded-lg border border-pink-200">
                                    <div className="flex items-center mb-2">
                                        <div className="w-8 h-8 bg-pink-500 rounded-lg flex items-center justify-center mr-3">
                                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                                            </svg>
                                        </div>
                                        <span className="font-semibold text-pink-900">Create Ticket</span>
                                    </div>
                                    <p className="text-sm text-pink-700">Generate new support tickets</p>
                                </div>

                                <div className="bg-white p-4 rounded-lg border border-yellow-200">
                                    <div className="flex items-center mb-2">
                                        <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center mr-3">
                                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <span className="font-semibold text-yellow-900">New Applicants</span>
                                    </div>
                                    <p className="text-sm text-yellow-700">Add job applications</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Dashboard Overview Chart</h2>
                        <div className="bg-gray-50 p-6 rounded-lg">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Bar Chart Visualization</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Chart Features</h4>
                                    <ul className="text-gray-700 space-y-2 text-sm">
                                        <li>• <strong>Y-axis:</strong> Scale from 0 to 80 with 20-unit increments</li>
                                        <li>• <strong>X-axis:</strong> Categories: Threads, Documents, Leads, Applicants, Tickets</li>
                                        <li>• <strong>Color Coding:</strong> Consistent with metric card colors</li>
                                        <li>• <strong>Real-time Data:</strong> Updates automatically with system changes</li>
                                        <li>• <strong>Interactive:</strong> Hover for detailed information</li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Data Representation</h4>
                                    <ul className="text-gray-700 space-y-2 text-sm">
                                        <li>• <strong>Threads:</strong> Blue bar reaching ~57 units</li>
                                        <li>• <strong>Documents:</strong> Purple thin line (~2 units)</li>
                                        <li>• <strong>Leads:</strong> Green bar reaching ~68 units</li>
                                        <li>• <strong>Applicants:</strong> No bar (0 units)</li>
                                        <li>• <strong>Tickets:</strong> No bar (0 units)</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">How to Use Dashboard Overview</h2>
                        <div className="bg-blue-50 p-6 rounded-lg">
                            <ol className="text-blue-800 space-y-3">
                                <li><strong>1. Monitor Key Metrics:</strong> Check the five metric cards for instant system status</li>
                                <li><strong>2. Review Recent Activity:</strong> Scroll through the activity feed to see latest updates</li>
                                <li><strong>3. Take Quick Actions:</strong> Use the action buttons for common tasks</li>
                                <li><strong>4. Analyze Trends:</strong> View the chart for visual data representation</li>
                                <li><strong>5. Apply Filters:</strong> Use the filter button to customize dashboard view</li>
                                <li><strong>6. Navigate Further:</strong> Click on metrics or activities to access detailed views</li>
                            </ol>
                        </div>
                    </section>
                </div>
            )
        },
        'dashboard-leads': {
            title: 'Leads Dashboard',
            content: (
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">Leads Dashboard</h1>
                    <p className="text-gray-700 mb-6 leading-relaxed">
                        Comprehensive leads management dashboard for tracking, analyzing, and optimizing lead generation and conversion processes across multiple sources and timelines.
                    </p>
                    {/* Added concise product-style documentation */}
                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Introduction</h2>
                        <p className="text-gray-700">
                            The Leads Dashboard helps you analyze, track, and manage sales leads effectively. It highlights where leads come from, their quality (score), current status, and how volumes change over time.
                        </p>
                        <ul className="list-disc pl-6 text-gray-700 mt-3 space-y-1 text-sm">
                            <li>How many total and daily leads do we have?</li>
                            <li>Which sources contribute the most?</li>
                            <li>What is the average score (quality)?</li>
                            <li>What status is each lead in right now?</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">UI Overview</h2>
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Header</h3>
                                <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 text-sm">
                                    <li>Title: Leads Dashboard</li>
                                    <li>Description: Analyze and manage leads across sources, timelines, and scores to optimize conversions</li>
                                    <li>Breadcrumb: Home {'>'} Leads Dashboard</li>
                                    <li>Filters: Source, date range, and status</li>
                                </ul>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">KPI Summary Cards</h3>
                                <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 text-sm">
                                    <li>👥 Total Leads</li>
                                    <li>📅 Today’s Leads</li>
                                    <li>⏳ Pending Leads</li>
                                    <li>✅ Closed Leads</li>
                                    <li>⭐ Average Score</li>
                                </ul>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Leads by Source & Date (Heatmap)</h3>
                                <p className="text-gray-700 dark:text-gray-300 text-sm">Blue blocks show daily volume per source. Darker = more leads.</p>
                                <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 text-sm mt-2">
                                    <li>Quick stats (example): Sources 3 • Days 30 • Max/Day 2 • Total Leads 5</li>
                                </ul>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Leads by Source (Breakdown)</h3>
                                <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 text-sm">
                                    <li>bca – 2 (40%)</li>
                                    <li>java – 2 (40%)</li>
                                    <li>mysql – 1 (20%)</li>
                                </ul>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Leads by Score (Pie)</h3>
                                <p className="text-gray-700 dark:text-gray-300 text-sm">Quality distribution of leads (e.g., High 100% in the sample).</p>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Lead Status (Donut)</h3>
                                <p className="text-gray-700 dark:text-gray-300 text-sm">Example split: Open 60% • New 40% – shows follow-up progress.</p>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Key Features</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-1">
                                <li>📊 KPI Summary Cards – quick snapshot</li>
                                <li>🗓️ Heatmap by date/source – trend spotting</li>
                                <li>🧾 Source Breakdown – contribution by channel</li>
                            </ul>
                            <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-1">
                                <li>⭐ Lead Scoring – prioritize by quality</li>
                                <li>🟢 Status Tracking – New, Open, Pending, Closed</li>
                            </ul>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Dashboard Header & Navigation</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-blue-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-blue-900 mb-3">Header Information</h3>
                                <ul className="text-blue-800 space-y-2 text-sm">
                                    <li>• <strong>Title:</strong> "Leads Dashboard" with green square icon</li>
                                    <li>• <strong>Description:</strong> "Analyze and manage leads across sources, timelines, and scores to optimize conversions"</li>
                                    <li>• <strong>Breadcrumb:</strong> "Home {'>'} Leads Dashboard" navigation</li>
                                    <li>• <strong>Filter Button:</strong> Advanced filtering options with dropdown</li>
                                </ul>
                            </div>
                            <div className="bg-green-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-green-900 mb-3">Navigation Features</h3>
                                <ul className="text-green-800 space-y-2 text-sm">
                                    <li>• <strong>Quick Filters:</strong> Date range and source filtering</li>
                                    <li>• <strong>Export Options:</strong> Data export capabilities</li>
                                    <li>• <strong>Refresh Data:</strong> Real-time data updates</li>
                                    <li>• <strong>View Options:</strong> Different dashboard layouts</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Key Metrics Cards</h2>
                        <p className="text-gray-700 mb-4">Five primary metric cards provide instant insights into lead performance:</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800/50">
                                <div className="flex items-center mb-2">
                                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mr-3">
                                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                                        </svg>
                                    </div>
                                    <h3 className="font-semibold text-blue-900">Total Leads</h3>
                                </div>
                                <div className="text-2xl font-bold text-blue-600">68</div>
                                <p className="text-sm text-blue-700">All leads in the system</p>
                            </div>

                            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800/50">
                                <div className="flex items-center mb-2">
                                    <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center mr-3">
                                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <h3 className="font-semibold text-green-900">Today's Leads</h3>
                                </div>
                                <div className="text-2xl font-bold text-green-600">4</div>
                                <p className="text-sm text-green-700">New leads today</p>
                            </div>

                            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800/50">
                                <div className="flex items-center mb-2">
                                    <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center mr-3">
                                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <h3 className="font-semibold text-yellow-900">Pending Leads</h3>
                                </div>
                                <div className="text-2xl font-bold text-yellow-600">0</div>
                                <p className="text-sm text-yellow-700">Awaiting follow-up</p>
                            </div>

                            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800/50">
                                <div className="flex items-center mb-2">
                                    <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center mr-3">
                                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <h3 className="font-semibold text-purple-900">Closed Leads</h3>
                                </div>
                                <div className="text-2xl font-bold text-purple-600">0</div>
                                <p className="text-sm text-purple-700">Successfully converted</p>
                            </div>

                            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-200 dark:border-indigo-800/50">
                                <div className="flex items-center mb-2">
                                    <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center mr-3">
                                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <h3 className="font-semibold text-indigo-900">Average Score</h3>
                                </div>
                                <div className="text-2xl font-bold text-indigo-600">62</div>
                                <p className="text-sm text-indigo-700">Lead quality score</p>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Leads by Source & Date Heatmap</h2>
                        <div className="bg-gray-50 p-6 rounded-lg">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Heatmap Visualization</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Heatmap Features</h4>
                                    <ul className="text-gray-700 space-y-2 text-sm">
                                        <li>• <strong>Grid Layout:</strong> Sources on Y-axis, dates on X-axis</li>
                                        <li>• <strong>Color Intensity:</strong> Blue shades indicate lead volume</li>
                                        <li>• <strong>Interactive Cells:</strong> Click for detailed information</li>
                                        <li>• <strong>Legend:</strong> "Less" to "More" color scale</li>
                                        <li>• <strong>21 Lead Sources:</strong> Comprehensive source tracking</li>
                                        <li>• <strong>31-Day Timeline:</strong> Full month view</li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Data Insights</h4>
                                    <ul className="text-gray-700 space-y-2 text-sm">
                                        <li>• <strong>Peak Activity:</strong> Instagram Post around day 25</li>
                                        <li>• <strong>Cold Email:</strong> High activity days 26-28</li>
                                        <li>• <strong>Facebook Ads:</strong> Strong performance days 27-28</li>
                                        <li>• <strong>Pattern Analysis:</strong> Weekly and monthly trends</li>
                                        <li>• <strong>Source Performance:</strong> Visual comparison across channels</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Summary Metrics</h2>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
                                <div className="text-2xl font-bold text-blue-600">21</div>
                                <div className="text-sm text-gray-600">Sources</div>
                            </div>
                            <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
                                <div className="text-2xl font-bold text-green-600">31</div>
                                <div className="text-sm text-gray-600">Days</div>
                            </div>
                            <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
                                <div className="text-2xl font-bold text-yellow-600">10</div>
                                <div className="text-sm text-gray-600">Max/Day</div>
                            </div>
                            <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
                                <div className="text-2xl font-bold text-purple-600">68</div>
                                <div className="text-sm text-gray-600">Total Leads</div>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Leads by Source Breakdown</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-blue-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-blue-900 mb-3">Top Performing Sources</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-blue-800">Instagram Post</span>
                                        <span className="font-semibold text-blue-900">12 (17.6%)</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-blue-800">Google Ads</span>
                                        <span className="font-semibold text-blue-900">11 (16.2%)</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-blue-800">Cold Email</span>
                                        <span className="font-semibold text-blue-900">9 (13.2%)</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-blue-800">Facebook</span>
                                        <span className="font-semibold text-blue-900">3 (4.4%)</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-blue-800">LinkedIn Campaign</span>
                                        <span className="font-semibold text-blue-900">4 (5.9%)</span>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-green-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-green-900 mb-3">Other Sources</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-green-800">Referral Program</span>
                                        <span className="font-semibold text-green-900">4 (5.9%)</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-green-800">AI</span>
                                        <span className="font-semibold text-green-900">2 (3.4%)</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-green-800">Whatsapp Chatbot</span>
                                        <span className="font-semibold text-green-900">2 (3.4%)</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-green-800">Other</span>
                                        <span className="font-semibold text-green-900">2 (3.4%)</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-green-800">Website</span>
                                        <span className="font-semibold text-green-900">1 (1.5%)</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Lead Analytics Charts</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-purple-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-purple-900 mb-3">Leads by Score (Pie Chart)</h3>
                                <ul className="text-purple-800 space-y-2 text-sm">
                                    <li>• <strong>High Score:</strong> 100.0% of all leads</li>
                                    <li>• <strong>Quality Assessment:</strong> All leads categorized as high quality</li>
                                    <li>• <strong>Scoring System:</strong> Automated lead qualification</li>
                                    <li>• <strong>Visual Representation:</strong> Solid blue pie chart</li>
                                    <li>• <strong>Data Accuracy:</strong> Real-time scoring updates</li>
                                </ul>
                            </div>
                            <div className="bg-orange-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-orange-900 mb-3">Lead Status Breakdown (Donut Chart)</h3>
                                <ul className="text-orange-800 space-y-2 text-sm">
                                    <li>• <strong>New Leads:</strong> 75.0% (Blue segment)</li>
                                    <li>• <strong>Open Leads:</strong> 23.5% (Green segment)</li>
                                    <li>• <strong>In-Progress:</strong> 1.5% (Orange segment)</li>
                                    <li>• <strong>Rejected:</strong> 0.0% (Red segment)</li>
                                    <li>• <strong>Pipeline Flow:</strong> Visual progression tracking</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">How to Use Leads Dashboard</h2>
                        <div className="bg-blue-50 p-6 rounded-lg">
                            <ol className="text-blue-800 space-y-3">
                                <li><strong>1. Monitor Key Metrics:</strong> Check the five metric cards for instant lead performance insights</li>
                                <li><strong>2. Analyze Heatmap:</strong> Use the source-date heatmap to identify peak lead generation periods</li>
                                <li><strong>3. Review Source Performance:</strong> Compare lead sources to optimize marketing spend</li>
                                <li><strong>4. Track Lead Quality:</strong> Monitor average scores and status breakdown</li>
                                <li><strong>5. Apply Filters:</strong> Use the filter button to customize dashboard view</li>
                                <li><strong>6. Export Data:</strong> Download reports for further analysis</li>
                                <li><strong>7. Set Alerts:</strong> Configure notifications for important metrics</li>
                            </ol>
                        </div>
                    </section>
                    <section className="mb-10">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">How to Use (Documentation)</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-gray-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Daily workflow</h3>
                                <ul className="text-gray-700 dark:text-gray-300 text-sm space-y-1">
                                    <li>• Check KPI cards to gauge pipeline: Total, New, Pending, Closed.</li>
                                    <li>• Use Search for quick lookups by Lead ID, name, email, or phone.</li>
                                    <li>• Open Filters to narrow by Source, Interest, Score, Status, Date, Owner.</li>
                                    <li>• Sort by Lead Score and Date to prioritize outreach.</li>
                                    <li>• Select multiple rows to assign owners or update statuses in bulk.</li>
                                </ul>
                            </div>
                            <div className="bg-blue-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-blue-900 mb-2">Column reference</h3>
                                <ul className="text-blue-900 text-sm space-y-1">
                                    <li>• <strong>Lead ID</strong>: opens the detailed profile and activity timeline.</li>
                                    <li>• <strong>Interest</strong>: the solution or product the lead cares about.</li>
                                    <li>• <strong>Lead Source</strong>: origin channel (Existing Client, Meta, etc.).</li>
                                    <li>• <strong>Lead Score</strong>: 0–100 priority indicator; ≥ 80 is high.</li>
                                    <li>• <strong>Status</strong>: New, Open, In Process, Closed.</li>
                                </ul>
                            </div>
                        </div>
                        <div className="mt-6 bg-green-50 p-6 rounded-lg">
                            <h3 className="text-lg font-semibold text-green-900 mb-2">Best practices</h3>
                            <ul className="text-green-900 text-sm space-y-1">
                                <li>• Keep Source and Interest values consistent and human‑readable.</li>
                                <li>• Treat scores ≥ 80 as priority; follow up within 24 hours.</li>
                                <li>• Move stale leads to Closed with a reason to keep reports clean.</li>
                                <li>• Export filtered views for weekly team reviews.</li>
                            </ul>
                        </div>
                    </section>
                </div>
            )
        },
        'dashboard-recruitment': {
            title: 'Recruitment Dashboard',
            content: (
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">Recruitment Dashboard</h1>
                    <p className="text-gray-700 mb-6 leading-relaxed">
                        Comprehensive recruitment analytics dashboard for monitoring job applications, candidate status, interview schedules, and hiring pipeline progress across all recruitment activities.
                    </p>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Dashboard Overview</h2>
                        <div className="bg-blue-50 p-6 rounded-lg mb-6">
                            <h3 className="text-lg font-semibold text-blue-900 mb-3">Purpose</h3>
                            <p className="text-blue-800">The Recruitment Dashboard provides HR teams and hiring managers with real-time insights into the entire recruitment process, from job posting to candidate onboarding.</p>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Key Metrics & KPIs</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                            <div className="bg-green-50 p-6 rounded-lg text-center">
                                <div className="text-3xl font-bold text-green-600 mb-2">150+</div>
                                <div className="text-sm font-medium text-green-800">Active Applications</div>
                            </div>
                            <div className="bg-blue-50 p-6 rounded-lg text-center">
                                <div className="text-3xl font-bold text-blue-600 mb-2">25</div>
                                <div className="text-sm font-medium text-blue-800">Interviews Scheduled</div>
                            </div>
                            <div className="bg-purple-50 p-6 rounded-lg text-center">
                                <div className="text-3xl font-bold text-purple-600 mb-2">12</div>
                                <div className="text-sm font-medium text-purple-800">Offers Extended</div>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Recruitment Features</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-purple-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-purple-900 mb-3">Application Tracking</h3>
                                <ul className="text-purple-800 space-y-2 text-sm">
                                    <li>• Job application monitoring & status updates</li>
                                    <li>• Candidate profile management & tracking</li>
                                    <li>• Application source analysis & attribution</li>
                                    <li>• Time-to-hire metrics & optimization</li>
                                    <li>• Application funnel visualization</li>
                                    <li>• Candidate pipeline management</li>
                                </ul>
                            </div>
                            <div className="bg-orange-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-orange-900 mb-3">Interview Management</h3>
                                <ul className="text-orange-800 space-y-2 text-sm">
                                    <li>• Interview scheduling & calendar integration</li>
                                    <li>• Candidate evaluation tracking & scoring</li>
                                    <li>• Hiring pipeline progress monitoring</li>
                                    <li>• Recruitment funnel analysis & optimization</li>
                                    <li>• Interview feedback collection & analysis</li>
                                    <li>• Candidate communication tracking</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Advanced Analytics</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-indigo-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-indigo-900 mb-3">Recruitment Performance</h3>
                                <ul className="text-indigo-800 space-y-2 text-sm">
                                    <li>• Cost-per-hire analysis & optimization</li>
                                    <li>• Quality-of-hire metrics & tracking</li>
                                    <li>• Source effectiveness measurement</li>
                                    <li>• Recruitment team productivity metrics</li>
                                    <li>• Time-to-fill optimization</li>
                                    <li>• Candidate experience scoring</li>
                                </ul>
                            </div>
                            <div className="bg-teal-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-teal-900 mb-3">Predictive Analytics</h3>
                                <ul className="text-teal-800 space-y-2 text-sm">
                                    <li>• Candidate success prediction models</li>
                                    <li>• Hiring demand forecasting</li>
                                    <li>• Market trend analysis & insights</li>
                                    <li>• Competitive intelligence gathering</li>
                                    <li>• Recruitment strategy optimization</li>
                                    <li>• Resource allocation planning</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">How to Use Recruitment Dashboard</h2>
                        <div className="bg-gray-50 p-6 rounded-lg">
                            <ol className="list-decimal list-inside space-y-3 text-gray-700">
                                <li><strong>Access Dashboard:</strong> Navigate to "Dashboards" → "Recruitment Dashboard"</li>
                                <li><strong>Review Key Metrics:</strong> Check active applications, interviews, and offers at a glance</li>
                                <li><strong>Monitor Pipeline:</strong> Track candidates through different recruitment stages</li>
                                <li><strong>Analyze Performance:</strong> Review time-to-hire and cost-per-hire metrics</li>
                                <li><strong>Optimize Process:</strong> Use insights to improve recruitment efficiency</li>
                                <li><strong>Generate Reports:</strong> Export data for stakeholder presentations</li>
                            </ol>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Integration & Workflow</h2>
                        <div className="bg-yellow-50 p-6 rounded-lg">
                            <h3 className="text-lg font-semibold text-yellow-900 mb-3">Connected Systems</h3>
                            <ul className="text-yellow-800 space-y-2 text-sm">
                                <li>• Job posting platforms & career sites</li>
                                <li>• Applicant tracking systems (ATS)</li>
                                <li>• HR management systems (HRMS)</li>
                                <li>• Calendar & scheduling tools</li>
                                <li>• Communication platforms & email systems</li>
                                <li>• Background check & verification services</li>
                            </ul>
                        </div>
                    </section>
                </div>
            )
        },
        'dashboard-chat': {
            title: 'Chat Dashboard',
            content: (
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">Chat Dashboard</h1>
                    <p className="text-gray-700 mb-6 leading-relaxed">
                        Comprehensive AI Agent chat analytics dashboard for monitoring conversations, response times, user satisfaction, and chat performance metrics across all AI interactions.
                    </p>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Dashboard Overview</h2>
                        <div className="bg-blue-50 p-6 rounded-lg mb-6">
                            <h3 className="text-lg font-semibold text-blue-900 mb-3">Purpose</h3>
                            <p className="text-blue-800">The Chat Dashboard provides real-time insights into AI Agent performance, user interactions, and conversation quality to optimize customer support and AI effectiveness.</p>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Key Metrics & KPIs</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                            <div className="bg-green-50 p-6 rounded-lg text-center">
                                <div className="text-3xl font-bold text-green-600 mb-2">2,450+</div>
                                <div className="text-sm font-medium text-green-800">Total Conversations</div>
                            </div>
                            <div className="bg-blue-50 p-6 rounded-lg text-center">
                                <div className="text-3xl font-bold text-blue-600 mb-2">1.2s</div>
                                <div className="text-sm font-medium text-blue-800">Avg Response Time</div>
                            </div>
                            <div className="bg-purple-50 p-6 rounded-lg text-center">
                                <div className="text-3xl font-bold text-purple-600 mb-2">94.5%</div>
                                <div className="text-sm font-medium text-purple-800">User Satisfaction</div>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Chat Analytics Features</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-orange-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-orange-900 mb-3">Conversation Tracking</h3>
                                <ul className="text-orange-800 space-y-2 text-sm">
                                    <li>• Total conversations count & trends</li>
                                    <li>• Active chat sessions monitoring</li>
                                    <li>• Conversation duration analysis</li>
                                    <li>• User engagement metrics & patterns</li>
                                    <li>• Peak usage time identification</li>
                                    <li>• Conversation flow visualization</li>
                                </ul>
                            </div>
                            <div className="bg-blue-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-blue-900 mb-3">Performance Metrics</h3>
                                <ul className="text-blue-800 space-y-2 text-sm">
                                    <li>• Response time analysis & optimization</li>
                                    <li>• User satisfaction scores & trends</li>
                                    <li>• Chat completion rates & success metrics</li>
                                    <li>• AI accuracy metrics & improvement tracking</li>
                                    <li>• Error rate monitoring & resolution</li>
                                    <li>• Performance benchmarking & comparison</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Advanced Chat Analytics</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-indigo-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-indigo-900 mb-3">User Behavior Analysis</h3>
                                <ul className="text-indigo-800 space-y-2 text-sm">
                                    <li>• User interaction patterns & preferences</li>
                                    <li>• Chat session duration analysis</li>
                                    <li>• User journey mapping & optimization</li>
                                    <li>• Drop-off point identification</li>
                                    <li>• User segmentation & targeting</li>
                                    <li>• Behavioral trend analysis</li>
                                </ul>
                            </div>
                            <div className="bg-teal-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-teal-900 mb-3">AI Performance Insights</h3>
                                <ul className="text-teal-800 space-y-2 text-sm">
                                    <li>• Intent recognition accuracy & improvement</li>
                                    <li>• Knowledge base effectiveness & gaps</li>
                                    <li>• Training data quality assessment</li>
                                    <li>• Model performance optimization</li>
                                    <li>• A/B testing results & analysis</li>
                                    <li>• Continuous learning metrics</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Real-time Monitoring</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-red-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-red-900 mb-3">Live Chat Monitoring</h3>
                                <ul className="text-red-800 space-y-2 text-sm">
                                    <li>• Active conversation tracking</li>
                                    <li>• Queue management & optimization</li>
                                    <li>• Agent availability monitoring</li>
                                    <li>• Escalation trigger alerts</li>
                                    <li>• Performance bottleneck identification</li>
                                    <li>• Real-time issue resolution</li>
                                </ul>
                            </div>
                            <div className="bg-yellow-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-yellow-900 mb-3">Alert System</h3>
                                <ul className="text-yellow-800 space-y-2 text-sm">
                                    <li>• Response time threshold alerts</li>
                                    <li>• Error rate spike notifications</li>
                                    <li>• User satisfaction drop alerts</li>
                                    <li>• System performance warnings</li>
                                    <li>• Capacity planning notifications</li>
                                    <li>• Maintenance schedule alerts</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">How to Use Chat Dashboard</h2>
                        <div className="bg-gray-50 p-6 rounded-lg">
                            <ol className="list-decimal list-inside space-y-3 text-gray-700">
                                <li><strong>Access Dashboard:</strong> Navigate to "Dashboards" → "Chat Dashboard"</li>
                                <li><strong>Monitor Live Activity:</strong> Check active conversations and response times</li>
                                <li><strong>Review Performance Metrics:</strong> Analyze AI accuracy and user satisfaction</li>
                                <li><strong>Identify Trends:</strong> Use historical data to spot patterns and improvements</li>
                                <li><strong>Optimize AI Responses:</strong> Use insights to improve knowledge base and training</li>
                                <li><strong>Generate Reports:</strong> Export analytics for stakeholder presentations</li>
                            </ol>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Integration & Workflow</h2>
                        <div className="bg-green-50 p-6 rounded-lg">
                            <h3 className="text-lg font-semibold text-green-900 mb-3">Connected Systems</h3>
                            <ul className="text-green-800 space-y-2 text-sm">
                                <li>• AI/ML platforms & model management systems</li>
                                <li>• Customer relationship management (CRM) systems</li>
                                <li>• Knowledge base & content management systems</li>
                                <li>• Analytics & business intelligence platforms</li>
                                <li>• Customer support & ticketing systems</li>
                                <li>• User feedback & survey platforms</li>
                            </ul>
                        </div>
                    </section>
                </div>
            )
        },
        'dashboard-helpdesk': {
            title: 'Helpdesk Dashboard',
            content: (
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">Helpdesk Dashboard</h1>
                    <p className="text-gray-700 mb-6 leading-relaxed">
                        Comprehensive helpdesk analytics dashboard for monitoring support tickets, resolution times, customer satisfaction, and support team performance across all customer support operations.
                    </p>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Dashboard Overview</h2>
                        <div className="bg-blue-50 p-6 rounded-lg mb-6">
                            <h3 className="text-lg font-semibold text-blue-900 mb-3">Purpose</h3>
                            <p className="text-blue-800">The Helpdesk Dashboard provides support managers and teams with real-time insights into ticket management, team performance, and customer satisfaction to optimize support operations and improve customer experience.</p>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Key Metrics & KPIs</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                            <div className="bg-red-50 p-6 rounded-lg text-center">
                                <div className="text-3xl font-bold text-red-600 mb-2">45</div>
                                <div className="text-sm font-medium text-red-800">Open Tickets</div>
                            </div>
                            <div className="bg-blue-50 p-6 rounded-lg text-center">
                                <div className="text-3xl font-bold text-blue-600 mb-2">2.3h</div>
                                <div className="text-sm font-medium text-blue-800">Avg Resolution Time</div>
                            </div>
                            <div className="bg-green-50 p-6 rounded-lg text-center">
                                <div className="text-3xl font-bold text-green-600 mb-2">96.8%</div>
                                <div className="text-sm font-medium text-green-800">SLA Compliance</div>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Support Features</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-red-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-red-900 mb-3">Ticket Management</h3>
                                <ul className="text-red-800 space-y-2 text-sm">
                                    <li>• Open tickets tracking & prioritization</li>
                                    <li>• Ticket priority levels & escalation rules</li>
                                    <li>• Ticket categorization & tagging system</li>
                                    <li>• Escalation monitoring & management</li>
                                    <li>• Ticket assignment & workload distribution</li>
                                    <li>• SLA tracking & compliance monitoring</li>
                                </ul>
                            </div>
                            <div className="bg-green-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-green-900 mb-3">Performance Analytics</h3>
                                <ul className="text-green-800 space-y-2 text-sm">
                                    <li>• Resolution time tracking & optimization</li>
                                    <li>• Customer satisfaction scores & trends</li>
                                    <li>• Support team productivity & efficiency</li>
                                    <li>• SLA compliance metrics & reporting</li>
                                    <li>• First response time monitoring</li>
                                    <li>• Ticket volume analysis & forecasting</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Advanced Support Analytics</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-indigo-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-indigo-900 mb-3">Team Performance Insights</h3>
                                <ul className="text-indigo-800 space-y-2 text-sm">
                                    <li>• Individual agent performance metrics</li>
                                    <li>• Team workload distribution & balancing</li>
                                    <li>• Skill-based routing optimization</li>
                                    <li>• Training needs identification</li>
                                    <li>• Performance benchmarking & comparison</li>
                                    <li>• Incentive program effectiveness</li>
                                </ul>
                            </div>
                            <div className="bg-teal-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-teal-900 mb-3">Customer Experience Analytics</h3>
                                <ul className="text-teal-800 space-y-2 text-sm">
                                    <li>• Customer journey mapping & optimization</li>
                                    <li>• Satisfaction trend analysis & improvement</li>
                                    <li>• Customer segmentation & personalization</li>
                                    <li>• Feedback collection & sentiment analysis</li>
                                    <li>• Proactive support opportunity identification</li>
                                    <li>• Customer lifetime value optimization</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Real-time Operations</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-yellow-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-yellow-900 mb-3">Live Monitoring</h3>
                                <ul className="text-yellow-800 space-y-2 text-sm">
                                    <li>• Real-time ticket queue monitoring</li>
                                    <li>• Agent availability & status tracking</li>
                                    <li>• SLA breach prevention alerts</li>
                                    <li>• Peak load identification & management</li>
                                    <li>• Escalation trigger monitoring</li>
                                    <li>• Performance bottleneck detection</li>
                                </ul>
                            </div>
                            <div className="bg-purple-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-purple-900 mb-3">Automation & Workflow</h3>
                                <ul className="text-purple-800 space-y-2 text-sm">
                                    <li>• Automated ticket routing & assignment</li>
                                    <li>• Workflow automation & process optimization</li>
                                    <li>• Smart escalation & notification systems</li>
                                    <li>• Knowledge base integration & suggestions</li>
                                    <li>• Self-service portal analytics</li>
                                    <li>• Chatbot performance monitoring</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">How to Use Helpdesk Dashboard</h2>
                        <div className="bg-gray-50 p-6 rounded-lg">
                            <ol className="list-decimal list-inside space-y-3 text-gray-700">
                                <li><strong>Access Dashboard:</strong> Navigate to "Dashboards" → "Helpdesk Dashboard"</li>
                                <li><strong>Monitor Live Operations:</strong> Check open tickets and team availability</li>
                                <li><strong>Review Performance Metrics:</strong> Analyze resolution times and SLA compliance</li>
                                <li><strong>Track Team Productivity:</strong> Monitor individual and team performance</li>
                                <li><strong>Optimize Support Process:</strong> Use insights to improve efficiency</li>
                                <li><strong>Generate Reports:</strong> Export analytics for management review</li>
                            </ol>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Integration & Workflow</h2>
                        <div className="bg-orange-50 p-6 rounded-lg">
                            <h3 className="text-lg font-semibold text-orange-900 mb-3">Connected Systems</h3>
                            <ul className="text-orange-800 space-y-2 text-sm">
                                <li>• Customer relationship management (CRM) systems</li>
                                <li>• Knowledge base & documentation platforms</li>
                                <li>• Communication & collaboration tools</li>
                                <li>• Project management & workflow systems</li>
                                <li>• Customer feedback & survey platforms</li>
                                <li>• Analytics & business intelligence tools</li>
                            </ul>
                        </div>
                    </section>
                </div>
            )
        },
        'knowledge-guests': {
            title: 'Guest Files',
            content: (
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">Guest Files</h1>
                    <p className="text-gray-700 mb-6 leading-relaxed">
                        Upload and manage knowledge files for guest users and visitors to provide them with relevant information and resources.
                    </p>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Guest File Management</h2>
                        <div className="bg-blue-50 p-6 rounded-lg">
                            <h3 className="text-lg font-semibold text-blue-900 mb-3">Purpose</h3>
                            <p className="text-blue-800 mb-4">Guest files are designed for visitors and non-registered users who need access to general information, public documentation, and introductory materials.</p>
                            <ol className="text-blue-800 space-y-3">
                                <li><strong>1. Navigate to Knowledge Hub:</strong> Click on "Knowledge Hub" in the main menu</li>
                                <li><strong>2. Select Guest Files:</strong> Choose "Guest Files" from the dropdown</li>
                                <li><strong>3. Upload Public Documents:</strong> Add files that are safe for public access</li>
                                <li><strong>4. Organize by Category:</strong> Group files by topic or purpose</li>
                                <li><strong>5. Set Access Permissions:</strong> Ensure files are publicly accessible</li>
                                <li><strong>6. Monitor Usage:</strong> Track how guests interact with your files</li>
                            </ol>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Supported File Types</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-center">
                                <div className="text-2xl mb-2">📄</div>
                                <div className="font-semibold">PDF Files</div>
                                <div className="text-sm text-gray-600">.pdf</div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-center">
                                <div className="text-2xl mb-2">📝</div>
                                <div className="font-semibold">Word Documents</div>
                                <div className="text-sm text-gray-600">.docx</div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-center">
                                <div className="text-2xl mb-2">📋</div>
                                <div className="font-semibold">Text Files</div>
                                <div className="text-sm text-gray-600">.txt</div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-center">
                                <div className="text-2xl mb-2">📊</div>
                                <div className="font-semibold">Excel Files</div>
                                <div className="text-sm text-gray-600">.xlsx</div>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Domain Organization</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-green-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-green-900 mb-3">Employee Domain</h3>
                                <p className="text-green-800 text-sm">Internal documentation, training materials, and employee resources.</p>
                            </div>
                            <div className="bg-blue-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-blue-900 mb-3">Customer Domain</h3>
                                <p className="text-blue-800 text-sm">Customer-facing documentation, product guides, and support materials.</p>
                            </div>
                            <div className="bg-purple-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-purple-900 mb-3">Organisation Domain</h3>
                                <p className="text-purple-800 text-sm">Company policies, procedures, and organizational documentation.</p>
                            </div>
                        </div>
                    </section>
                </div>
            )
        },
        'knowledge-customer': {
            title: 'Customers',
            content: (
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">Customers</h1>
                    <p className="text-gray-700 mb-6 leading-relaxed">Manage customer records, knowledge base, and FAQs.</p>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Page Structure</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-blue-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-blue-900 mb-3">Header</h3>
                                <ul className="text-blue-800 space-y-2 text-sm">
                                    <li>• Title: Customers with info icon</li>
                                    <li>• Subtitle: Manage records, KB, FAQs</li>
                                    <li>• Breadcrumbs: Home {'>'} Customers</li>
                                </ul>
                            </div>
                            <div className="bg-green-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-green-900 mb-3">Tabs</h3>
                                <ul className="text-green-800 space-y-2 text-sm">
                                    <li>• Customer Record</li>
                                    <li>• Customer Knowledge Base</li>
                                    <li>• FAQ</li>
                                </ul>
                            </div>
                            <div className="bg-purple-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-purple-900 mb-3">Toolbar</h3>
                                <ul className="text-purple-800 space-y-2 text-sm">
                                    <li>• Search by</li>
                                    <li>• Filter</li>
                                    <li>• Add</li>
                                    <li>• Refresh</li>
                                    <li>• Download</li>
                                    <li>• Upload</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Customer Record Table</h2>
                        <div className="bg-gray-50 p-6 rounded-lg">
                            <div className="overflow-x-auto">
                                <table className="min-w-full">
                                    <thead>
                                        <tr className="text-left text-gray-600">
                                            <th className="py-2 pr-6">Select</th>
                                            <th className="py-2 pr-6">Customer ID</th>
                                            <th className="py-2 pr-6">Name</th>
                                            <th className="py-2 pr-6">Email</th>
                                            <th className="py-2 pr-6">Phone</th>
                                            <th className="py-2 pr-6">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-gray-800">
                                        <tr className="border-t">
                                            <td className="py-2 pr-6">Checkbox</td>
                                            <td className="py-2 pr-6">mobi1234</td>
                                            <td className="py-2 pr-6">Samarth Goyal</td>
                                            <td className="py-2 pr-6">samarth.goyal@gmail.com</td>
                                            <td className="py-2 pr-6">919811946717</td>
                                            <td className="py-2 pr-6">Delete</td>
                                        </tr>
                                        <tr className="border-t">
                                            <td className="py-2 pr-6">Checkbox</td>
                                            <td className="py-2 pr-6">01234</td>
                                            <td className="py-2 pr-6">Pranav</td>
                                            <td className="py-2 pr-6">guptapranav0803@gmail.com</td>
                                            <td className="py-2 pr-6">919953885383</td>
                                            <td className="py-2 pr-6">Delete</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
                                <div className="flex items-center space-x-2">
                                    <span>Items per page:</span>
                                    <span>10</span>
                                </div>
                                <div>Showing 1 to 10 of 10 customers</div>
                                <div className="space-x-4">
                                    <span>Prev</span>
                                    <span>1/1</span>
                                    <span>Next</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">How to Manage Files</h2>
                        <div className="bg-gray-50 p-6 rounded-lg">
                            <ol className="text-gray-700 space-y-3">
                                <li><strong>1. Access File Management:</strong> Navigate to Knowledge Hub → File Management</li>
                                <li><strong>2. View Files by Domain:</strong> Files are automatically grouped by domain</li>
                                <li><strong>3. Preview Files:</strong> Click the preview icon to view files in browser</li>
                                <li><strong>4. Download Files:</strong> Use download icon for files that can't be previewed</li>
                                <li><strong>5. Delete Files:</strong> Click delete icon to remove files from domain</li>
                                <li><strong>6. Refresh List:</strong> Use refresh button to update file list</li>
                            </ol>
                        </div>
                    </section>
                </div>
            )
        },
        'knowledge-employee': {
            title: 'Employee Files',
            content: (
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">Employee Files</h1>
                    <p className="text-gray-700 mb-6 leading-relaxed">
                        Manage internal documentation, training materials, policies, and resources for employees and internal team members.
                    </p>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Employee File Management</h2>
                        <div className="bg-blue-50 p-6 rounded-lg mb-6">
                            <h3 className="text-lg font-semibold text-blue-900 mb-3">Purpose</h3>
                            <p className="text-blue-800">Employee files contain internal documentation, training materials, company policies, procedures, and resources that are specifically for internal team members and employees.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-orange-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-orange-900 mb-3">Internal Resources</h3>
                                <ul className="text-orange-800 space-y-2 text-sm">
                                    <li>• Company policies and procedures</li>
                                    <li>• Training materials and onboarding docs</li>
                                    <li>• Internal process documentation</li>
                                    <li>• HR forms and templates</li>
                                </ul>
                            </div>
                            <div className="bg-purple-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-purple-900 mb-3">File Management</h3>
                                <ul className="text-purple-800 space-y-2 text-sm">
                                    <li>• Secure access control for employees only</li>
                                    <li>• Version control for policy updates</li>
                                    <li>• Department-specific file organization</li>
                                    <li>• Search and filter capabilities</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">How to Manage Employee Files</h2>
                        <div className="bg-gray-50 p-6 rounded-lg">
                            <ol className="text-gray-700 space-y-3">
                                <li><strong>1. Access Employee Files:</strong> Navigate to Knowledge Hub → Employee Files</li>
                                <li><strong>2. Upload Internal Documents:</strong> Add company policies, training materials, and procedures</li>
                                <li><strong>3. Organize by Department:</strong> Group files by HR, IT, Finance, Operations, etc.</li>
                                <li><strong>4. Set Access Permissions:</strong> Ensure only authorized employees can access sensitive files</li>
                                <li><strong>5. Version Control:</strong> Keep track of document updates and changes</li>
                                <li><strong>6. Regular Updates:</strong> Maintain current policies and procedures</li>
                            </ol>
                        </div>
                    </section>
                </div>
            )
        },
        'knowledge-hub': {
            title: 'Knowledge Hub',
            content: (
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">Knowledge Hub</h1>
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">Upload and manage knowledge files</h2>

                    <section className="mb-8">
                        <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Overview</h3>
                        <p className="text-gray-700 mb-4">
                            The Knowledge Hub allows you to upload and manage documentation files across different domains.
                            You can organize your knowledge base by uploading various file types and managing them efficiently.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">How to Upload Files</h3>
                        <ol className="list-decimal ml-6 space-y-2 text-gray-700">
                            <li>Navigate to <strong>Knowledge Hub → Upload File</strong></li>
                            <li>Select a domain: <code className="bg-gray-100 px-2 py-1 rounded">Employee (domain_1)</code>, <code className="bg-gray-100 px-2 py-1 rounded">Customer (domain_2)</code>, <code className="bg-gray-100 px-2 py-1 rounded">Organisation (domain_3)</code></li>
                            <li>Click <strong>Select File</strong> and choose <code className="bg-gray-100 px-2 py-1 rounded">.docx</code>, <code className="bg-gray-100 px-2 py-1 rounded">.pdf</code>, <code className="bg-gray-100 px-2 py-1 rounded">.txt</code>, or <code className="bg-gray-100 px-2 py-1 rounded">.xlsx</code></li>
                            <li>Confirm <strong>Upload</strong> to send the file to the backend</li>
                            <li>Use <strong>Refresh</strong> to see the latest documents in File Management</li>
                        </ol>
                    </section>

                    <section className="mb-8">
                        <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Supported File Types</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-center">
                                <div className="text-2xl mb-2">📄</div>
                                <div className="font-semibold">PDF Files</div>
                                <div className="text-sm text-gray-600">Documentation</div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-center">
                                <div className="text-2xl mb-2">📝</div>
                                <div className="font-semibold">Word Documents</div>
                                <div className="text-sm text-gray-600">.docx files</div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-center">
                                <div className="text-2xl mb-2">📋</div>
                                <div className="font-semibold">Text Files</div>
                                <div className="text-sm text-gray-600">.txt files</div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-center">
                                <div className="text-2xl mb-2">📊</div>
                                <div className="font-semibold">Excel Files</div>
                                <div className="text-sm text-gray-600">.xlsx files</div>
                            </div>
                        </div>
                    </section>
                </div>
            )
        },
        'faq-upload': {
            title: 'FAQ CSV Upload',
            content: (
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">FAQ CSV Upload</h1>
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">Bulk upload FAQs for your chatbot</h2>

                    <section className="mb-8">
                        <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Overview</h3>
                        <p className="text-gray-700 mb-4">
                            The FAQ CSV importer allows you to bulk upload frequently asked questions and their answers
                            for your chatbot. This feature uses the endpoint <code className="bg-gray-100 px-2 py-1 rounded">/faq/upload-csv</code>.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Upload Process</h3>
                        <ol className="list-decimal ml-6 space-y-2 text-gray-700">
                            <li>Go to <strong>Organisation/Customer/Employee → FAQ tab</strong></li>
                            <li>Click <strong>Upload FAQ CSV</strong> and choose a <code className="bg-gray-100 px-2 py-1 rounded">.csv</code> file</li>
                            <li>On success, you will see a confirmation with the S3 key (e.g., <code className="bg-gray-100 px-2 py-1 rounded">faq/your_file.csv</code>)</li>
                            <li>Use <strong>Refresh</strong> to update the view</li>
                        </ol>
                    </section>

                    <section className="mb-8">
                        <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">API Example</h3>
                        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">cURL Command:</h4>
                            <pre className="text-sm bg-gray-100 p-3 rounded overflow-x-auto">{`curl -X POST \\
${process.env.NEXT_PUBLIC_API_URL}/faq/upload-csv' \\
-H 'accept: application/json' \\
-H 'Content-Type: multipart/form-data' \\
-F 'file=@faq.csv;type=text/csv'`}</pre>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">CSV Format</h3>
                        <p className="text-gray-700 mb-4">Your CSV file should have the following columns:</p>
                        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                            <pre className="text-sm">{`question,answer,category
"What is your return policy?","We offer 30-day returns",Policies
"How do I contact support?","Email us at support@company.com",Support`}</pre>
                        </div>
                    </section>
                </div>
            )
        },
        'faq': {
            title: 'Frequently Asked Questions',
            content: (
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">Frequently Asked Questions</h1>
                    <p className="text-gray-700 dark:text-gray-300 mb-6">Answers to common questions about using the AI Agent, theming, integrations, uploads, helpdesk, dashboards, and more.</p>
                    <div className="divide-y divide-gray-200 dark:divide-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
                        {[
                            ['How do I start using the AI Agent?', 'Open the chat, type your question, and press Enter. Use the toolbar for support or scheduling.'],
                            ['Can I switch between dark and light mode?', 'Yes. Use the theme toggle in the header; your preference persists across pages.'],
                            ['How do I download a documentation section as PDF?', 'Click the Download button in the top bar; a PDF of the active section is saved to your Downloads folder.'],
                            ['What happens if the bot doesn’t reply?', 'Check your connection and try again. If it persists, create a ticket in Helpdesk.'],
                            ['Where can I view previous chats?', 'Use the Previous Chat pages to browse and reopen conversations.'],
                            ['How do I customize the chatbot greeting?', 'Go to Pre‑Prompt or Settings to edit system and intro prompts.'],
                            ['How do I add my own knowledge files?', 'Open Knowledge Hub → choose domain (Guests/Customer/Employee) → Upload.'],
                            ['Which file types are supported for knowledge?', 'PDF, DOCX, TXT, XLSX are supported; previews available for common formats.'],
                            ['Why is my CSV upload failing?', 'Ensure correct headers, UTF‑8 encoding, and file size within limits; see CSV section.'],
                            ['How do I upload FAQ in bulk?', 'Use FAQ CSV Upload with a properly formatted .csv file.'],
                            ['How do I manage leads?', 'Open the Leads Dashboard for KPIs, search, filters, and exports.'],
                            ['Can I export tables?', 'Yes, use the Download/Export actions where available to save CSV of visible rows.'],
                            ['How do I change organization branding/logo?', 'Check Organisation settings or the provided script for uploading assets.'],
                            ['How do I invite or manage users?', 'Use Controls → Users to add, edit, and assign roles.'],
                            ['How do I set inactivity timeouts?', 'Use Inactivity Settings to configure auto‑logout and session policies.'],
                            ['How can I integrate with my CRM?', 'Visit Integration Center (connectors/direct DB) and follow connector guides.'],
                            ['Where do I report an issue?', 'Create a ticket in Helpdesk → Create Ticket; include steps and screenshots.'],
                            ['How are permissions enforced?', 'Pages use PermissionGate and role checks from Auth context/services.'],
                            ['How do I reset my password?', 'Use Forgot Password from auth pages; then Reset Password via the emailed link.'],
                            ['How do I control LLM model and parameters?', 'Use LLM Control/Model pages to select providers, set temperature, and keys.'],
                        ].map(([q, a]) => (
                            <details key={String(q)} className="group p-4 open:bg-gray-50 open:dark:bg-gray-900/30 transition">
                                <summary className="cursor-pointer list-none flex items-center justify-between text-gray-900 dark:text-gray-100">
                                    <span>{q as string}</span>
                                    <span className="text-gray-500 group-open:rotate-45 transition">+</span>
                                </summary>
                                <p className="mt-2 text-gray-700 dark:text-gray-300">{a as string}</p>
                            </details>
                        ))}
                    </div>
                </div>
            )
        },
        'file-management': {
            title: 'File Management',
            content: (
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">File Management</h1>
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">Organize and manage your uploaded files</h2>

                    <section className="mb-8">
                        <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Overview</h3>
                        <p className="text-gray-700 mb-4">
                            The File Management system allows you to view, preview, and delete uploaded knowledge files
                            across different domains. You can organize your files efficiently and maintain a clean knowledge base.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Features</h3>
                        <ul className="list-disc ml-6 space-y-2 text-gray-700">
                            <li><strong>File Preview:</strong> View PDFs and images directly in the browser</li>
                            <li><strong>Download:</strong> Download files that cannot be previewed</li>
                            <li><strong>Delete:</strong> Remove files from specific domains</li>
                            <li><strong>Refresh:</strong> Update the file list to see latest changes</li>
                            <li><strong>Domain Organization:</strong> Files are grouped by domain for easy management</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">How to Use</h3>
                        <ol className="list-decimal ml-6 space-y-2 text-gray-700">
                            <li>Navigate to <strong>Knowledge Hub → File Management</strong></li>
                            <li>Use <strong>Refresh</strong> to fetch files grouped by domain</li>
                            <li>Click <strong>Preview</strong> to open PDFs/images; other files can be downloaded</li>
                            <li>Use the delete icon to remove files from a domain</li>
                        </ol>
                    </section>

                    <section className="mb-8">
                        <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">File Types Support</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-blue-50 p-6 rounded-lg">
                                <h4 className="font-semibold text-blue-900 mb-3">Preview Supported</h4>
                                <ul className="text-blue-800 space-y-1">
                                    <li>• PDF files (.pdf)</li>
                                    <li>• Image files (.jpg, .png, .gif)</li>
                                    <li>• Text files (.txt)</li>
                                </ul>
                            </div>
                            <div className="bg-green-50 p-6 rounded-lg">
                                <h4 className="font-semibold text-green-900 mb-3">Download Only</h4>
                                <ul className="text-green-800 space-y-1">
                                    <li>• Word documents (.docx)</li>
                                    <li>• Excel files (.xlsx)</li>
                                    <li>• Other binary files</li>
                                </ul>
                            </div>
                        </div>
                    </section>
                </div>
            )
        },
        'troubleshooting': {
            title: 'Troubleshooting',
            content: (
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">Troubleshooting</h1>
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">Common issues and solutions</h2>

                    <section className="mb-8">
                        <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Common Issues</h3>
                        <div className="space-y-6">
                            <div className="bg-red-50 border-l-4 border-red-400 p-4">
                                <h4 className="font-semibold text-red-900 mb-2">Upload Failures</h4>
                                <p className="text-red-800 mb-2">If uploads fail, try these solutions:</p>
                                <ul className="list-disc ml-6 text-red-800">
                                    <li>Verify network connectivity</li>
                                    <li>Check file size (max 10MB)</li>
                                    <li>Ensure file format is supported</li>
                                    <li>Try refreshing the page</li>
                                </ul>
                            </div>

                            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                                <h4 className="font-semibold text-yellow-900 mb-2">File Not Appearing</h4>
                                <p className="text-yellow-800 mb-2">If uploaded files don't appear:</p>
                                <ul className="list-disc ml-6 text-yellow-800">
                                    <li>Click the <strong>Refresh</strong> button</li>
                                    <li>Check if file was uploaded to correct domain</li>
                                    <li>Verify upload confirmation message</li>
                                </ul>
                            </div>

                            <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                                <h4 className="font-semibold text-blue-900 mb-2">CSV Format Issues</h4>
                                <p className="text-blue-800 mb-2">For CSV upload problems:</p>
                                <ul className="list-disc ml-6 text-blue-800">
                                    <li>Ensure CSV has correct column headers</li>
                                    <li>Check for special characters in data</li>
                                    <li>Verify file encoding (UTF-8 recommended)</li>
                                    <li>Keep file size under 5MB</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Supported File Types</h3>
                        <p className="text-gray-700 mb-4">For knowledge files, only these formats are accepted:</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-center">
                                <code className="bg-gray-100 px-2 py-1 rounded">.docx</code>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-center">
                                <code className="bg-gray-100 px-2 py-1 rounded">.pdf</code>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-center">
                                <code className="bg-gray-100 px-2 py-1 rounded">.txt</code>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-center">
                                <code className="bg-gray-100 px-2 py-1 rounded">.xlsx</code>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Getting Help</h3>
                        <p className="text-gray-700 mb-4">If you continue to experience issues:</p>
                        <ul className="list-disc ml-6 space-y-2 text-gray-700">
                            <li>Check browser console for detailed error messages</li>
                            <li>Ensure file sizes are within the 10MB limit</li>
                            <li>Try using a different browser</li>
                            <li>Contact support with specific error details</li>
                        </ul>
                    </section>
                </div>
            )
        },


        'lead-management': {
            title: 'Leads',
            content: (
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">CRM - Leads</h1>
                    <p className="text-gray-700 mb-6 leading-relaxed">Manage and track customer leads with comprehensive filtering and analysis tools.</p>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Overview</h2>
                        <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                            Use the Leads page to capture new opportunities, keep records clean, and focus on the
                            conversations most likely to convert. This guide explains what each control means and
                            how to work the list efficiently without recreating the UI.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Key concepts</h2>
                        <ul className="list-disc ml-6 space-y-2 text-gray-700 dark:text-gray-300 text-sm">
                            <li><strong>KPI cards</strong>: quick totals for Total, New, Pending, Closed based on your filters.</li>
                            <li><strong>Toolbar</strong>: search, filter, export, and create actions that control the table below.</li>
                            <li><strong>Lead score</strong>: a 0–100 priority indicator; higher means greater likelihood to convert.</li>
                            <li><strong>Status</strong>: New → Open → In Process → Closed (won/lost/archived).</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Core actions</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-gray-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Search & Filters</h3>
                                <ul className="text-gray-700 dark:text-gray-300 text-sm space-y-1">
                                    <li>• Search by Lead ID, name, email, or phone.</li>
                                    <li>• Filter by Source, Interest, Score range, Status, Date, or Owner.</li>
                                    <li>• Combine multiple filters; KPI cards update to reflect the view.</li>
                                </ul>
                            </div>
                            <div className="bg-gray-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Create & Export</h3>
                                <ul className="text-gray-700 dark:text-gray-300 text-sm space-y-1">
                                    <li>• Create a lead with minimum fields (Name + Email/Phone + Source).</li>
                                    <li>• Download the current filtered view to CSV for sharing or analysis.</li>
                                    <li>• Exports include visible columns and respect active filters.</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Table fields</h2>
                        <ul className="list-disc ml-6 space-y-1 text-gray-700 dark:text-gray-300 text-sm">
                            <li>• Lead ID (opens the detailed profile and timeline)</li>
                            <li>• Name, Email, Mobile</li>
                            <li>• Interest (descriptive tag such as "AI Solutions")</li>
                            <li>• Lead Source (badge like Existing Client, Meta, etc.)</li>
                            <li>• Lead Score (0–100; sort to prioritize)</li>
                            <li>• Status (New, Open, In Process, Closed)</li>
                            <li>• Date | Time (latest activity/creation)</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Working the list</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-purple-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-purple-900 mb-2">Prioritization</h3>
                                <ul className="text-purple-900 text-sm space-y-1">
                                    <li>• Sort by Lead Score (desc) and Date (desc) for fastest wins.</li>
                                    <li>• Treat scores ≥ 80 as high‑priority; contact same day.</li>
                                    <li>• Use badges to scan Interest and Source at a glance.</li>
                                </ul>
                            </div>
                            <div className="bg-yellow-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-yellow-900 mb-2">Bulk actions</h3>
                                <ul className="text-yellow-900 text-sm space-y-1">
                                    <li>• Multi‑select to assign owner, update status, or export selection.</li>
                                    <li>• Apply filters first to target the right subset.</li>
                                    <li>• Keep notes in the lead profile to preserve context.</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Best practices</h2>
                        <ul className="text-gray-700 dark:text-gray-300 text-sm space-y-2 bg-gray-50 p-6 rounded-lg">
                            <li>• Keep Source/Interest values clean and human‑readable (avoid placeholders like "string").</li>
                            <li>• Always log calls/emails in the timeline before changing status.</li>
                            <li>• Move stale leads to Closed with a reason to keep reports accurate.</li>
                            <li>• Export filtered views weekly for team performance reviews.</li>
                        </ul>
                    </section>

                    <section className="mb-2">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-3">FAQ</h2>
                        <div className="space-y-3 text-sm text-gray-700">
                            <p><strong>Why don't my KPI numbers match the full total?</strong> They reflect the current filters and date range.</p>
                            <p><strong>What if a field shows "—"?</strong> The value isn't available; update the lead profile to improve data quality.</p>
                            <p><strong>Who can edit leads?</strong> Users with the appropriate permission in Controls → Manage Users.</p>
                        </div>
                    </section>
                </div>
            )
        },
        'lead-settings': {
            title: 'Settings',
            content: (
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">CRM Settings</h1>
                    <p className="text-gray-700 mb-6 leading-relaxed">
                        Configure CRM categories, contact preferences, and lead‑scoring logic. This documentation explains how each
                        control works so you can tailor the system without mirroring the UI.
                    </p>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Lead Form Category</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-gray-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Interests</h3>
                                <ul className="text-gray-700 dark:text-gray-300 text-sm space-y-1">
                                    <li>• Add a new Interest option (e.g., AI Solutions, Web Development).</li>
                                    <li>• Use the selector to pick a default Interest for quick entry.</li>
                                    <li>• Keep names short and business‑friendly; avoid duplicates.</li>
                                </ul>
                            </div>
                            <div className="bg-gray-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Sources</h3>
                                <ul className="text-gray-700 dark:text-gray-300 text-sm space-y-1">
                                    <li>• Add new Source options (Existing Client, Meta, Website, Events, etc.).</li>
                                    <li>• Set a default Source used by the capture form.</li>
                                    <li>• Review the list monthly and merge near‑duplicates.</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Email Notifications</h2>
                        <div className="bg-blue-50 p-6 rounded-lg">
                            <ul className="text-blue-900 text-sm space-y-1">
                                <li>• Add up to five email addresses to receive new‑lead alerts.</li>
                                <li>• Alerts are sent immediately after submission; respect your time zone setting.</li>
                                <li>• Tip: create a group address (e.g., sales@company.com) for easier team management.</li>
                            </ul>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-3">User Confirmation Message</h2>
                        <div className="bg-green-50 p-6 rounded-lg">
                            <p className="text-gray-700 dark:text-gray-300 text-sm">
                                Define the auto‑reply sent to users after they submit the lead form. Keep it short, helpful, and include
                                a next step. You can edit the text anytime; changes apply to future submissions only.
                            </p>
                            <ul className="text-green-900 text-sm space-y-1 mt-3">
                                <li>• Recommended: mention expected response time and a scheduling call‑to‑action.</li>
                                <li>• Personalize with your team name and support email/phone.</li>
                            </ul>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Lead Score Settings</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-purple-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-purple-900 mb-2">Assigning scores</h3>
                                <ul className="text-purple-900 text-sm space-y-1">
                                    <li>• Choose a Source or Interest and assign a score from 0–100.</li>
                                    <li>• Scores represent priority; higher means follow up sooner.</li>
                                    <li>• Example: Existing Client = 100, Website Demo = 90, Events = 80.</li>
                                </ul>
                            </div>
                            <div className="bg-orange-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-orange-900 mb-2">Managing mappings</h3>
                                <ul className="text-orange-900 text-sm space-y-1">
                                    <li>• Use the list of current mappings to review, edit, or delete scores.</li>
                                    <li>• Avoid overlapping entries (e.g., both "Web" and "Website"). Keep one canonical value.</li>
                                    <li>• Revisit scores quarterly to reflect market or campaign changes.</li>
                                </ul>
                            </div>
                        </div>
                        <div className="mt-4 bg-gray-50 p-6 rounded-lg">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Tips</h3>
                            <ul className="text-gray-700 dark:text-gray-300 text-sm space-y-1">
                                <li>• Use ≥ 80 for hot leads, 50–79 for warm, and &lt; 50 for nurture lists.</li>
                                <li>• Align scores with your SLA: hot leads should be contacted within 24 hours.</li>
                            </ul>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Permissions & Audit</h2>
                        <ul className="list-disc ml-6 space-y-2 text-gray-700 dark:text-gray-300 text-sm">
                            <li>Only admins can add/delete Interests, Sources, and score mappings.</li>
                            <li>Notification recipients require valid, verified emails.</li>
                            <li>All changes are logged with user and timestamp for audit readiness.</li>
                        </ul>
                    </section>

                    <section className="mb-2">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-3">FAQ</h2>
                        <div className="space-y-3 text-sm text-gray-700">
                            <p><strong>Why don't confirmation emails arrive?</strong> Check spam, verify sender domain, and confirm recipients are set.</p>
                            <p><strong>What score should we start with?</strong> Begin with simple tiers (100/80/60) and refine from conversion data.</p>
                            <p><strong>Can we localize the confirmation message?</strong> Yes—maintain language‑specific templates and switch based on form locale.</p>
                        </div>
                    </section>
                </div>
            )
        },

        'helpdesk-tickets': {
            title: 'Ticket Management',
            content: (
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">Ticket Management</h1>
                    <p className="text-gray-700 mb-6 leading-relaxed">
                        Comprehensive ticket management system for handling customer support requests, tracking issues, and managing resolution workflows.
                    </p>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Ticket Management Interface</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-blue-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-blue-900 mb-3">Ticket Dashboard</h3>
                                <ul className="text-blue-800 space-y-2 text-sm">
                                    <li>• <strong>Ticket Overview:</strong> Total tickets, open, closed, pending</li>
                                    <li>• <strong>Priority Levels:</strong> High, Medium, Low priority indicators</li>
                                    <li>• <strong>Status Tracking:</strong> New, In Progress, Resolved, Closed</li>
                                    <li>• <strong>Category Filtering:</strong> Technical, Billing, General Support</li>
                                    <li>• <strong>Assignee Management:</strong> Ticket assignment to support agents</li>
                                </ul>
                            </div>
                            <div className="bg-green-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-green-900 mb-3">Ticket Operations</h3>
                                <ul className="text-green-800 space-y-2 text-sm">
                                    <li>• <strong>Create Tickets:</strong> Quick ticket creation form</li>
                                    <li>• <strong>Edit Tickets:</strong> Update ticket details and status</li>
                                    <li>• <strong>Add Comments:</strong> Internal and customer-facing notes</li>
                                    <li>• <strong>File Attachments:</strong> Screenshots, documents, logs</li>
                                    <li>• <strong>Escalation:</strong> Move tickets to higher priority</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Ticket List View</h2>
                        <div className="bg-gray-50 p-6 rounded-lg">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Table Features</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Ticket Information</h4>
                                    <ul className="text-gray-700 dark:text-gray-300 space-y-1 text-sm">
                                        <li>• Ticket ID and Reference Number</li>
                                        <li>• Subject and Description</li>
                                        <li>• Customer/User Information</li>
                                        <li>• Created Date and Last Updated</li>
                                        <li>• Assigned Agent</li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Status Indicators</h4>
                                    <ul className="text-gray-700 dark:text-gray-300 space-y-1 text-sm">
                                        <li>• Color-coded priority badges</li>
                                        <li>• Status progress indicators</li>
                                        <li>• Response time tracking</li>
                                        <li>• SLA compliance alerts</li>
                                        <li>• Escalation warnings</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Ticket Details View</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-purple-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-purple-900 mb-3">Ticket Information Panel</h3>
                                <ul className="text-purple-800 space-y-2 text-sm">
                                    <li>• <strong>Basic Details:</strong> Title, description, category</li>
                                    <li>• <strong>Customer Info:</strong> Name, email, contact details</li>
                                    <li>• <strong>Technical Details:</strong> System info, error logs</li>
                                    <li>• <strong>Priority Settings:</strong> Current priority level</li>
                                    <li>• <strong>Tags & Labels:</strong> Custom categorization</li>
                                </ul>
                            </div>
                            <div className="bg-orange-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-orange-900 mb-3">Communication Panel</h3>
                                <ul className="text-orange-800 space-y-2 text-sm">
                                    <li>• <strong>Comment Thread:</strong> Internal and external notes</li>
                                    <li>• <strong>File Attachments:</strong> Images, documents, logs</li>
                                    <li>• <strong>Status Updates:</strong> Progress notifications</li>
                                    <li>• <strong>Email Integration:</strong> Automatic notifications</li>
                                    <li>• <strong>Time Tracking:</strong> Resolution time monitoring</li>
                                </ul>
                            </div>
                        </div>
                    </section>
                </div>
            )
        },
        'helpdesk-customer': {
            title: 'Customer Support',
            content: (
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">HelpDesk – Customer Tickets</h1>
                    <p className="text-gray-700 mb-6">Manage and track customer helpdesk tickets with comprehensive filtering, quick actions, and analytics.</p>

                    <section className="mb-6">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Key KPIs</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-white rounded-lg border p-4"><div className="text-3xl font-bold">2</div><div className="text-sm text-gray-600">Total tickets</div></div>
                            <div className="bg-white rounded-lg border p-4"><div className="text-3xl font-bold">0</div><div className="text-sm text-gray-600">Pending tickets</div></div>
                            <div className="bg-white rounded-lg border p-4"><div className="text-3xl font-bold">0</div><div className="text-sm text-gray-600">Solved tickets</div></div>
                            <div className="bg-white rounded-lg border p-4"><div className="text-3xl font-bold">1</div><div className="text-sm text-gray-600">New tickets</div></div>
                        </div>
                    </section>

                    <section className="mb-6">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Toolbar</h2>
                        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                            <li>• <strong>Search Ticket:</strong> Type keywords (ID, email, name, issue) to filter instantly.</li>
                            <li>• <strong>Filters:</strong> Status, Severity, Issue Type, Date Range, Assignee. Combine filters to narrow results.</li>
                            <li>• <strong>Download:</strong> Export visible rows to CSV with current filters applied.</li>
                            <li>• <strong>Create:</strong> Opens the new ticket form to log a customer request.</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Customer Table</h2>
                        <p className="text-gray-700 dark:text-gray-300 mb-3">A paginated, sortable table listing all customer tickets. Use horizontal scroll if columns overflow.</p>
                        <div className="bg-white rounded-lg border p-4">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Columns</h3>
                            <ul className="text-sm text-gray-700 grid md:grid-cols-2 gap-y-1 gap-x-8">
                                <li>• <strong>Ticket ID:</strong> Clickable ID to open ticket details.</li>
                                <li>• <strong>Name:</strong> Customer name.</li>
                                <li>• <strong>Email:</strong> Customer email address.</li>
                                <li>• <strong>Mobile:</strong> Contact number.</li>
                                <li>• <strong>Issue Type:</strong> Category like bug, billing, access.</li>
                                <li>• <strong>Issue:</strong> Short description.</li>
                                <li>• <strong>Severity:</strong> Badge indicating impact (Unknown, Low, Medium, High, Critical).</li>
                                <li>• <strong>Status:</strong> Badge such as New, Open, Pending, Solved, Closed.</li>
                                <li>• <strong>Date | Time:</strong> Created timestamp; sortable.</li>
                            </ul>

                            <h3 className="font-semibold text-gray-900 mt-4 mb-2">Interactions</h3>
                            <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                                <li>• <strong>Sorting:</strong> Click column headers (Ticket ID, Severity, Status, Date).</li>
                                <li>• <strong>Row Selection:</strong> Tick checkboxes for bulk actions like change status or export.</li>
                                <li>• <strong>Inline Badges:</strong> Colored chips for severity/status for quick scanning.</li>
                                <li>• <strong>Pagination:</strong> Items per page control and Prev/Next navigation.</li>
                            </ul>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Creating a New Ticket</h2>
                        <ol className="list-decimal pl-6 text-sm text-gray-700 dark:text-gray-300 space-y-1">
                            <li>Click <strong>Create</strong> in the toolbar.</li>
                            <li>Enter customer details (name, email, mobile).</li>
                            <li>Set <strong>Issue Type</strong>, write a concise <strong>Issue</strong> summary, and choose <strong>Severity</strong>.</li>
                            <li>Attach screenshots or documents if available.</li>
                            <li>Assign to an agent and submit to create the ticket.</li>
                        </ol>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Filtering & Workflow</h2>
                        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                            <li>• Use <strong>Filters</strong> to view only New/Open/Pending tickets or specific severities.</li>
                            <li>• Click a <strong>Ticket ID</strong> to open details, add internal notes, update status, or attach files.</li>
                            <li>• Mark resolved items as <strong>Solved</strong> to reflect in KPIs.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Best Practices</h2>
                        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                            <li>• Keep issue summaries short and searchable.</li>
                            <li>• Always set severity to prioritize triage.</li>
                            <li>• Use comments for customer-facing updates; keep internal notes separate.</li>
                            <li>• Close duplicates and link to the canonical ticket.</li>
                        </ul>
                    </section>
                </div>
            ),
        },
        'helpdesk-employee': {
            title: 'Employee Support',
            content: (
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">HelpDesk – Employee Tickets</h1>
                    <p className="text-gray-700 mb-6">Manage and track employee helpdesk tickets with comprehensive filtering and analysis tools.</p>

                    <section className="mb-6">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Key KPIs</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-white rounded-lg border p-4"><div className="text-3xl font-bold">5</div><div className="text-sm text-gray-600">Total tickets</div></div>
                            <div className="bg-white rounded-lg border p-4"><div className="text-3xl font-bold">0</div><div className="text-sm text-gray-600">Pending tickets</div></div>
                            <div className="bg-white rounded-lg border p-4"><div className="text-3xl font-bold">0</div><div className="text-sm text-gray-600">Solved tickets</div></div>
                            <div className="bg-white rounded-lg border p-4"><div className="text-3xl font-bold">5</div><div className="text-sm text-gray-600">New tickets</div></div>
                        </div>
                    </section>

                    <section className="mb-6">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Toolbar</h2>
                        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                            <li>• <strong>Search Ticket:</strong> Type keywords (ID, email, name, issue) to filter instantly.</li>
                            <li>• <strong>Filters:</strong> Status, Severity, Issue Type, Date Range, Assignee.</li>
                            <li>• <strong>Download:</strong> Export current view to CSV with applied filters.</li>
                            <li>• <strong>Create:</strong> Opens the new employee ticket form.</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Employee Table</h2>
                        <p className="text-gray-700 dark:text-gray-300 mb-3">Sortable, paginated table listing all employee tickets.</p>
                        <div className="bg-white rounded-lg border p-4">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Columns</h3>
                            <ul className="text-sm text-gray-700 grid md:grid-cols-2 gap-y-1 gap-x-8">
                                <li>• <strong>Ticket ID:</strong> Link opens ticket details.</li>
                                <li>• <strong>Name:</strong> Employee name.</li>
                                <li>• <strong>Email:</strong> Employee email address.</li>
                                <li>• <strong>Issue Type:</strong> Category such as IT Support, HR.</li>
                                <li>• <strong>Issue:</strong> Short summary of the request.</li>
                                <li>• <strong>Severity:</strong> Badge (Unknown, Low, Medium, High, Critical).</li>
                                <li>• <strong>Status:</strong> Badge (New, Open, Pending, Solved, Closed).</li>
                                <li>• <strong>Date | Time:</strong> Created timestamp; sortable.</li>
                            </ul>

                            <h3 className="font-semibold text-gray-900 mt-4 mb-2">Interactions</h3>
                            <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                                <li>• <strong>Sorting:</strong> Click on Ticket ID, Severity, Status, or Date.</li>
                                <li>• <strong>Row Selection:</strong> Select multiple rows for bulk status updates or export.</li>
                                <li>• <strong>Pagination:</strong> Choose items per page, navigate Prev/Next.</li>
                            </ul>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Create Employee Ticket</h2>
                        <ol className="list-decimal pl-6 text-sm text-gray-700 dark:text-gray-300 space-y-1">
                            <li>Click <strong>Create</strong> in the toolbar.</li>
                            <li>Enter employee details (name, email) and describe the issue.</li>
                            <li>Select <strong>Issue Type</strong>, set <strong>Severity</strong>, and assign to a team.</li>
                            <li>Attach relevant screenshots or files.</li>
                            <li>Submit to generate the ticket and notify the assignee.</li>
                        </ol>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Best Practices</h2>
                        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                            <li>• Use clear, searchable summaries.</li>
                            <li>• Prioritize with accurate severity.</li>
                            <li>• Keep communications professional and concise.</li>
                            <li>• Close duplicates and reference the main ticket.</li>
                        </ul>
                    </section>
                </div>
            )
        },
        'helpdesk-settings': {
            title: 'Helpdesk Settings',
            content: (
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">HelpDesk – Settings</h1>
                    <p className="text-gray-700 mb-6">Configure helpdesk settings, ticket categories, severity scores, and notification preferences.</p>

                    <section className="mb-6">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Sections</h2>
                        <ul className="text-sm text-gray-700 grid md:grid-cols-2 gap-x-8 gap-y-1">
                            <li>• Customer Ticket Setting</li>
                            <li>• Employee Ticket Setting</li>
                            <li>• Severity Table</li>
                            <li>• Customize Customer Ticket Form</li>
                            <li>• Customize Employee Ticket Form</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Customer Ticket Setting</h2>
                        <div className="bg-white rounded-lg border p-4">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Customer Ticket Form Category</h3>
                            <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                                <li>• <strong>Type:</strong> Add a new type, then select an existing type from the dropdown.</li>
                                <li>• <strong>Issue:</strong> Add a new option, select an issue under the chosen type.</li>
                                <li>• <strong>Add:</strong> Persists the entered type/issue values to the category list.</li>
                            </ul>

                            <h3 className="font-semibold text-gray-900 mt-4 mb-2">Email Notifications</h3>
                            <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                                <li>• Add up to 5 email addresses to receive new ticket alerts.</li>
                                <li>• Use the Add button to append each address.</li>
                            </ul>

                            <h3 className="font-semibold text-gray-900 mt-4 mb-2">User Confirmation Message</h3>
                            <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                                <li>• Write a confirmation message sent after a customer submits the ticket form.</li>
                                <li>• Character limit 256; click Edit to enable editing.</li>
                            </ul>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Employee Ticket Setting</h2>
                        <div className="bg-white rounded-lg border p-4">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Employee Ticket Form Category</h3>
                            <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                                <li>• <strong>Type:</strong> Add/select a type for employee issues (e.g., IT Support).</li>
                                <li>• <strong>Issue:</strong> Add/select options for the chosen type.</li>
                                <li>• <strong>Add:</strong> Save the type/issue pair.</li>
                            </ul>

                            <h3 className="font-semibold text-gray-900 mt-4 mb-2">Employee Email Notifications</h3>
                            <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                                <li>• Add up to 5 internal emails to receive employee ticket alerts.</li>
                                <li>• Use Add to append each address.</li>
                            </ul>

                            <h3 className="font-semibold text-gray-900 mt-4 mb-2">Employee Confirmation Message</h3>
                            <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                                <li>• Message sent to employees after submitting the internal ticket form.</li>
                                <li>• Character limit 256; click Edit to enable editing.</li>
                            </ul>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Severity Table</h2>
                        <div className="bg-white rounded-lg border p-4">
                            <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                                <li>• Select a category and value (Customer or Employee type/issue).</li>
                                <li>• Choose a severity score from the dropdown (e.g., 1–5).</li>
                                <li>• Click Save to assign the score; saved items appear under Current Severity Scores.</li>
                            </ul>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Customize Customer Ticket Form</h2>
                        <div className="bg-white rounded-lg border p-4">
                            <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                                <li>• Configure form fields such as Form Title, Email field, Issue Type field, Issue field.</li>
                                <li>• Add Option to append choices; Remove to delete an option.</li>
                                <li>• Right panel shows live Chatbot Preview to visualize the conversation style.</li>
                            </ul>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Customize Employee Ticket Form</h2>
                        <div className="bg-white rounded-lg border p-4">
                            <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                                <li>• Configure Employee Ticket Form: Form Title, Employee ID field, Issue Type field, Issue field.</li>
                                <li>• Manage options with Add Option/Remove.</li>
                                <li>• Live Chatbot Preview reflects changes instantly.</li>
                            </ul>
                        </div>
                    </section>
                </div>
            )
        },
        'recruitment-jobs': {
            title: 'Job Listings',
            content: (
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">Job Listings</h1>
                    <p className="text-gray-700 mb-6 leading-relaxed">
                        Comprehensive job listing management system for creating, publishing, and managing job postings across multiple platforms.
                    </p>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Job Listing Dashboard</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-blue-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-blue-900 mb-3">Job Management</h3>
                                <ul className="text-blue-800 space-y-2 text-sm">
                                    <li>• <strong>Active Jobs:</strong> Currently published positions</li>
                                    <li>• <strong>Draft Jobs:</strong> Jobs in preparation</li>
                                    <li>• <strong>Closed Jobs:</strong> Filled or expired positions</li>
                                    <li>• <strong>Job Categories:</strong> Department and role classification</li>
                                    <li>• <strong>Location Management:</strong> Office and remote work options</li>
                                </ul>
                            </div>
                            <div className="bg-green-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-green-900 mb-3">Publishing Features</h3>
                                <ul className="text-green-800 space-y-2 text-sm">
                                    <li>• <strong>Multi-platform Publishing:</strong> Job boards, company website</li>
                                    <li>• <strong>Scheduling:</strong> Set publish and expiry dates</li>
                                    <li>• <strong>SEO Optimization:</strong> Search engine friendly content</li>
                                    <li>• <strong>Social Media Integration:</strong> LinkedIn, Twitter sharing</li>
                                    <li>• <strong>Email Campaigns:</strong> Targeted job announcements</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Job Creation Interface</h2>
                        <div className="bg-gray-50 p-6 rounded-lg">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Job Details Form</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Basic Information</h4>
                                    <ul className="text-gray-700 dark:text-gray-300 space-y-1 text-sm">
                                        <li>• Job Title and Department</li>
                                        <li>• Location and Work Type</li>
                                        <li>• Employment Type (Full-time, Part-time)</li>
                                        <li>• Salary Range and Benefits</li>
                                        <li>• Experience Level Required</li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Detailed Content</h4>
                                    <ul className="text-gray-700 dark:text-gray-300 space-y-1 text-sm">
                                        <li>• Job Description and Responsibilities</li>
                                        <li>• Required Skills and Qualifications</li>
                                        <li>• Preferred Skills and Experience</li>
                                        <li>• Company Culture and Values</li>
                                        <li>• Application Instructions</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Job Analytics</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-purple-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-purple-900 mb-3">Performance Metrics</h3>
                                <ul className="text-purple-800 space-y-2 text-sm">
                                    <li>• <strong>View Count:</strong> Number of job post views</li>
                                    <li>• <strong>Application Rate:</strong> Views to applications ratio</li>
                                    <li>• <strong>Source Tracking:</strong> Where applicants found the job</li>
                                    <li>• <strong>Time to Fill:</strong> Days from posting to hire</li>
                                    <li>• <strong>Quality Metrics:</strong> Applicant qualification rates</li>
                                </ul>
                            </div>
                            <div className="bg-orange-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-orange-900 mb-3">Reporting Features</h3>
                                <ul className="text-orange-800 space-y-2 text-sm">
                                    <li>• <strong>Hiring Funnel:</strong> Application to hire conversion</li>
                                    <li>• <strong>Cost per Hire:</strong> Recruitment cost analysis</li>
                                    <li>• <strong>Source Effectiveness:</strong> Best performing job boards</li>
                                    <li>• <strong>Time Analytics:</strong> Peak application times</li>
                                    <li>• <strong>ROI Tracking:</strong> Recruitment investment returns</li>
                                </ul>
                            </div>
                        </div>
                    </section>
                </div>
            )
        },
        'recruitment-applications': {
            title: 'Applications',
            content: (
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">Recruitment Center – Applicants</h1>
                    <p className="text-gray-700 mb-6">Manage and track job applications with comprehensive filtering and analysis tools.</p>

                    <section className="mb-6">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">KPIs</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-white rounded-lg border p-4"><div className="text-3xl font-bold">21</div><div className="text-sm text-gray-600">Total Applications</div></div>
                            <div className="bg-white rounded-lg border p-4"><div className="text-3xl font-bold">10</div><div className="text-sm text-gray-600">Priority Applications</div></div>
                            <div className="bg-white rounded-lg border p-4"><div className="text-3xl font-bold">15</div><div className="text-sm text-gray-600">ATS Analyzed</div></div>
                            <div className="bg-white rounded-lg border p-4"><div className="text-3xl font-bold">4</div><div className="text-sm text-gray-600">Experience Levels</div></div>
                        </div>
                    </section>

                    <section className="mb-6">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Toolbar</h2>
                        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                            <li>• <strong>Search Applicants:</strong> Filter by name, email, phone, or ID.</li>
                            <li>• <strong>Filters:</strong> Apply job category, experience, priority, date range.</li>
                            <li>• <strong>Download:</strong> Export visible rows to CSV with current filters.</li>
                            <li>• <strong>Refresh:</strong> Reload data to fetch latest updates.</li>
                            <li>• <strong>Fit Scores:</strong> Calculate/refresh ATS match scores.</li>
                            <li>• <strong>New:</strong> Create a new applicant record or import.</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Job Applications Table</h2>
                        <p className="text-gray-700 dark:text-gray-300 mb-3">Sortable, paginated list of all applications. Use horizontal scroll if columns overflow.</p>
                        <div className="bg-white rounded-lg border p-4">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Columns</h3>
                            <ul className="text-sm text-gray-700 grid md:grid-cols-2 gap-x-8 gap-y-1">
                                <li>• <strong>Applicant ID:</strong> Click to open the application details.</li>
                                <li>• <strong>Name:</strong> Candidate full name with avatar initials.</li>
                                <li>• <strong>Email:</strong> Candidate email address.</li>
                                <li>• <strong>Mobile:</strong> Contact number.</li>
                                <li>• <strong>Job Category:</strong> Target role (e.g., Designer, Software Developer).</li>
                                <li>• <strong>Experience:</strong> Years or level (e.g., 3–7 Year, Mid Level).</li>
                                <li>• <strong>Priority:</strong> Numeric priority for sorting queues.</li>
                                <li>• <strong>ATS Score:</strong> Applicant tracking score for fit.</li>
                                <li>• <strong>Date:</strong> Submission date.</li>
                            </ul>

                            <h3 className="font-semibold text-gray-900 mt-4 mb-2">Interactions</h3>
                            <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                                <li>• <strong>Row selection:</strong> Multi-select using checkboxes for bulk actions.</li>
                                <li>• <strong>Sorting:</strong> Click column headers (Priority, ATS Score, Date).</li>
                                <li>• <strong>Pagination:</strong> Items per page selector; Prev/Next controls.</li>
                            </ul>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Workflow Tips</h2>
                        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                            <li>• Prioritize by score + priority to triage quickly.</li>
                            <li>• Use filters to isolate a role before exporting.</li>
                            <li>• Keep applicant data clean; avoid duplicate entries.</li>
                        </ul>
                    </section>
                </div>
            )
        },
        'recruitment-interviews': {
            title: 'Interview Management',
            content: (
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">Interview Management</h1>
                    <p className="text-gray-700 mb-6 leading-relaxed">
                        Comprehensive interview scheduling and management system for coordinating interviews, collecting feedback, and tracking candidate progress.
                    </p>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Interview Dashboard</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-blue-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-blue-900 mb-3">Interview Scheduling</h3>
                                <ul className="text-blue-800 space-y-2 text-sm">
                                    <li>• <strong>Calendar Integration:</strong> Google Calendar, Outlook sync</li>
                                    <li>• <strong>Availability Matching:</strong> Find common time slots</li>
                                    <li>• <strong>Interview Types:</strong> Phone, video, in-person</li>
                                    <li>• <strong>Duration Settings:</strong> Customizable interview lengths</li>
                                    <li>• <strong>Location Management:</strong> Office, remote, or external venues</li>
                                </ul>
                            </div>
                            <div className="bg-green-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-green-900 mb-3">Interview Coordination</h3>
                                <ul className="text-green-800 space-y-2 text-sm">
                                    <li>• <strong>Interviewer Assignment:</strong> Assign team members</li>
                                    <li>• <strong>Panel Interviews:</strong> Multiple interviewer setup</li>
                                    <li>• <strong>Interview Rounds:</strong> First, second, final rounds</li>
                                    <li>• <strong>Rescheduling:</strong> Easy interview rescheduling</li>
                                    <li>• <strong>Reminders:</strong> Automated interview reminders</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Interview Process</h2>
                        <div className="bg-gray-50 p-6 rounded-lg">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Interview Workflow</h3>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="text-center">
                                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-2">
                                        <span className="text-white font-bold">1</span>
                                    </div>
                                    <h4 className="font-semibold text-gray-900">Schedule</h4>
                                    <p className="text-sm text-gray-600">Set up interview time and location</p>
                                </div>
                                <div className="text-center">
                                    <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-2">
                                        <span className="text-white font-bold">2</span>
                                    </div>
                                    <h4 className="font-semibold text-gray-900">Conduct</h4>
                                    <p className="text-sm text-gray-600">Interview with candidate</p>
                                </div>
                                <div className="text-center">
                                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
                                        <span className="text-white font-bold">3</span>
                                    </div>
                                    <h4 className="font-semibold text-gray-900">Evaluate</h4>
                                    <p className="text-sm text-gray-600">Collect feedback and scores</p>
                                </div>
                                <div className="text-center">
                                    <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-2">
                                        <span className="text-white font-bold">4</span>
                                    </div>
                                    <h4 className="font-semibold text-gray-900">Decide</h4>
                                    <p className="text-sm text-gray-600">Make hiring decision</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Feedback & Evaluation</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-purple-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-purple-900 mb-3">Feedback Collection</h3>
                                <ul className="text-purple-800 space-y-2 text-sm">
                                    <li>• <strong>Structured Forms:</strong> Standardized feedback templates</li>
                                    <li>• <strong>Rating Scales:</strong> Numerical and qualitative ratings</li>
                                    <li>• <strong>Skill Assessment:</strong> Technical and soft skill evaluation</li>
                                    <li>• <strong>Cultural Fit:</strong> Company culture alignment</li>
                                    <li>• <strong>Recommendations:</strong> Hire, reject, or further evaluation</li>
                                </ul>
                            </div>
                            <div className="bg-orange-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-orange-900 mb-3">Evaluation Tools</h3>
                                <ul className="text-orange-800 space-y-2 text-sm">
                                    <li>• <strong>Score Aggregation:</strong> Combined interviewer scores</li>
                                    <li>• <strong>Comparative Analysis:</strong> Candidate comparison tools</li>
                                    <li>• <strong>Decision Matrix:</strong> Structured decision making</li>
                                    <li>• <strong>Feedback Analytics:</strong> Interview performance insights</li>
                                    <li>• <strong>Improvement Tracking:</strong> Interview process optimization</li>
                                </ul>
                            </div>
                        </div>
                    </section>
                </div>
            )
        },
        'recruitment-settings': {
            title: 'Job Settings',
            content: (
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">Job Settings</h1>
                    <p className="text-gray-700 mb-6">Configure job categories, experience levels, priorities, and fit score settings. Includes a customizable job application form with live preview.</p>

                    <section className="mb-6">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Tabs</h2>
                        <ul className="text-sm text-gray-700 grid md:grid-cols-2 gap-x-8 gap-y-1">
                            <li>• Job Setting</li>
                            <li>• Customize Job Form</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Job Setting</h2>
                        <div className="bg-white rounded-lg border p-4">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Job Form Categories</h3>
                            <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                                <li>• <strong>Job Category:</strong> Enter a new category and click Add, then select from the list.</li>
                                <li>• <strong>Experience Level:</strong> Enter a level (e.g., Junior, 3–5 Years), Add, and select from list.</li>
                            </ul>

                            <h3 className="font-semibold text-gray-900 mt-4 mb-2">Email Notifications</h3>
                            <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                                <li>• Add up to 5 emails to receive job application alerts; use Add after each.</li>
                            </ul>

                            <h3 className="font-semibold text-gray-900 mt-4 mb-2">Applicant Response Message</h3>
                            <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                                <li>• <strong>Email Logo:</strong> Upload/replace to appear at the top of response emails.</li>
                                <li>• <strong>Content Editor:</strong> Write the response message; supports placeholders like {'{'}name{'}'}, {'{'}applicant_id{'}'}, {'{'}job_category{'}'}.</li>
                                <li>• <strong>Edit:</strong> Toggle to enable editing mode; character limit 0/850 shown.</li>
                            </ul>

                            <h3 className="font-semibold text-gray-900 mt-4 mb-2">Job Priority Settings</h3>
                            <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                                <li>• Select a Category and a Score, then Save to add to Current Job Priorities.</li>
                            </ul>

                            <h3 className="font-semibold text-gray-900 mt-4 mb-2">Fit Score Settings</h3>
                            <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                                <li>• Add dynamic weights for <strong>Category</strong> and <strong>Name</strong> criteria.</li>
                                <li>• Provide a numeric <strong>Weight (0–100)</strong> and click Add.</li>
                                <li>• Review/clear entries under Current Fit Score Settings.</li>
                            </ul>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Customize Job Form</h2>
                        <div className="bg-white rounded-lg border p-4">
                            <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                                <li>• Configure fields: <strong>Form Title</strong>, <strong>Name</strong>, <strong>Email</strong>, <strong>Phone</strong>.</li>
                                <li>• <strong>Category Options:</strong> Manage job categories via options list (Add/Remove).</li>
                                <li>• The right-side <strong>Chatbot Preview</strong> updates live to reflect tone and layout.</li>
                            </ul>
                        </div>
                    </section>
                </div>
            )
        },
        'integration-whatsapp': {
            title: 'WhatsApp Integration',
            content: (
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">WhatsApp Integration</h1>
                    <p className="text-gray-700 mb-6 leading-relaxed">
                        Integrate your WhatsApp Business account with Meta Developer for ticketing, notifications, and automations. Enter Meta credentials, set the webhook, and review message feedback.
                    </p>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Credentials (Setup tab)</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-blue-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-blue-900 mb-3">Meta IDs & Tokens</h3>
                                <ul className="text-blue-800 space-y-2 text-sm">
                                    <li>• <strong>Business Account ID</strong>: Your Meta Business account identifier.</li>
                                    <li>• <strong>Phone Number ID</strong>: The WABA phone resource ID.</li>
                                    <li>• <strong>App ID</strong>: The Meta app used for the webhook.</li>
                                    <li>• <strong>App Secret</strong>: Keep hidden; used for signature validation.</li>
                                    <li>• <strong>Access Token</strong>: Long‑lived token for API calls.</li>
                                    <li>• <strong>Webhook Verify Token</strong>: Your custom string to verify callbacks.</li>
                                </ul>
                                <p className="text-xs text-blue-700 mt-2">Click Edit to toggle input mode and reveal/hide secrets safely.</p>
                            </div>
                            <div className="bg-green-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-green-900 mb-3">Webhook Setup</h3>
                                <ul className="text-green-800 space-y-2 text-sm">
                                    <li>• <strong>Webhook URL</strong>: Copy the generated callback URL and paste it in Meta → Webhooks.</li>
                                    <li>• Use the same <strong>Verify Token</strong> value in Meta and in this form.</li>
                                    <li>• After saving, send a Meta "Test" to confirm 200 OK.</li>
                                </ul>
                                <p className="text-xs text-green-700 mt-2">The copy icon helps copy the URL precisely.</p>
                            </div>
                        </div>
                        <div className="mt-4 bg-gray-50 p-6 rounded-lg">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Save Configuration</h3>
                            <p className="text-gray-700 dark:text-gray-300 text-sm">Click <strong>Save Configuration</strong> to persist tokens and IDs. Changes take effect immediately for new messages.</p>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Meta Portal quick‑start</h2>
                        <ol className="list-decimal pl-6 text-sm text-gray-700 dark:text-gray-300 space-y-1">
                            <li>Create a Meta App → Add "WhatsApp" product.</li>
                            <li>Add a Phone Number (or test number) and generate a permanent token.</li>
                            <li>In Webhooks, subscribe to messages, message_status, template_category updates.</li>
                            <li>Paste our Webhook URL and your Verify Token → Verify.</li>
                            <li>Copy Phone Number ID and Business Account ID into this page and Save.</li>
                        </ol>
                        <p className="text-xs text-gray-500 mt-2">Scopes commonly required: whatsapp_business_messaging, whatsapp_business_management.</p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Feedback (tab)</h2>
                        <div className="bg-purple-50 p-6 rounded-lg">
                            <h3 className="text-lg font-semibold text-purple-900 mb-3">Filters</h3>
                            <ul className="text-purple-800 space-y-2 text-sm">
                                <li>• <strong>Role</strong>: user, assistant, guest, customer.</li>
                                <li>• <strong>Rating</strong>: positive | neutral | negative.</li>
                                <li>• <strong>User ID / Session ID</strong>: narrow to a specific user or session.</li>
                                <li>• <strong>Search in Comment</strong>: keyword search; filter by date range.</li>
                            </ul>
                            <h3 className="text-lg font-semibold text-purple-900 mt-4 mb-2">Actions</h3>
                            <ul className="text-purple-800 space-y-2 text-sm">
                                <li>• <strong>View Stats Dashboard</strong>: Opens aggregated CSAT/volume charts.</li>
                                <li>• <strong>Export CSV</strong>: Download the filtered table for audits.</li>
                            </ul>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Test call example</h2>
                        <div className="bg-white rounded-lg border p-4">
                            <p className="text-sm text-gray-700 mb-2">Send a template message (replace placeholders):</p>
                            <pre className="text-xs bg-gray-100 p-3 rounded overflow-x-auto">{`curl -X POST \
 https://graph.facebook.com/v19.0/<PHONE_NUMBER_ID>/messages \
 -H "Authorization: Bearer <ACCESS_TOKEN>" \
 -H "Content-Type: application/json" \
 -d '{
   "messaging_product":"whatsapp",
   "to":"<E164_PHONE>",
   "type":"template",
   "template":{ "name":"hello_world", "language":{ "code":"en_US" } }
 }'`}</pre>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Troubleshooting</h2>
                        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                            <li>• 400/401 from API: rotate the Access Token and confirm App Secret.</li>
                            <li>• No incoming messages: verify webhook URL, verify token, and phone number ID mapping.</li>
                            <li>• Template send fails: ensure template approved and variables provided.</li>
                            <li>• Sandbox vs Production: test numbers have limited features; move to production for real users.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">FAQs</h2>
                        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                            <li>• <strong>Where do I find IDs?</strong> Meta App → WhatsApp → Getting Started panel.</li>
                            <li>• <strong>How often to rotate tokens?</strong> Follow Meta guidance; rotate when staff changes or on expiry.</li>
                            <li>• <strong>What about HSM templates?</strong> Create in Meta, wait for approval, then reference by name and language code.</li>
                        </ul>
                    </section>
                </div>
            )
        },
        'controls-bot-settings': {
            title: 'Bot Settings',
            content: (
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">AI Agent UI Controls</h1>
                    <p className="text-gray-700 mb-6">Customize the look and first‑run experience of your AI Agent: avatar, name, welcome message, and theme. A live preview updates on the right.</p>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Choose AI Agent Avatar</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-blue-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-blue-900 mb-3">Preset & Custom</h3>
                                <ul className="text-blue-800 space-y-2 text-sm">
                                    <li>• Select one of the preset avatars to apply instantly.</li>
                                    <li>• <strong>Upload</strong>: Add a custom image (PNG/JPG, square, ≥ 256×256 recommended).</li>
                                    <li>• Click <strong>Save</strong> to persist the selected avatar.</li>
                                </ul>
                                <p className="text-xs text-blue-700 mt-2">Tip: Use a transparent background PNG for best results.</p>
                            </div>
                            <div className="bg-white rounded-lg border p-4">
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Preview panel</h3>
                                <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                                    <li>• Shows avatar, header actions, and message bubbles in real time.</li>
                                    <li>• The input field accepts sample text to visualize the chat layout.</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Customize AI Agent Name & Welcome Message</h2>
                        <div className="bg-green-50 p-6 rounded-lg">
                            <ul className="text-green-800 space-y-2 text-sm">
                                <li>• <strong>Name</strong>: The display name shown at the top of the chat (e.g., "Mobiloitte AI Assist").</li>
                                <li>• <strong>Welcome message</strong>: First message users see; keep it friendly and specific.</li>
                                <li>• The preview updates as you type; click <strong>Save Changes</strong> to publish.</li>
                            </ul>
                            <p className="text-xs text-green-700 mt-2">Best practice: State who the bot helps and list one action users can try.</p>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Customize AI Agent Theme</h2>
                        <div className="bg-purple-50 p-6 rounded-lg">
                            <ul className="text-purple-800 space-y-2 text-sm">
                                <li>• Adjust primary/background colors to match your brand.</li>
                                <li>• Ensure sufficient contrast for accessibility (AA contrast ratio).</li>
                                <li>• The preview reflects bubble colors, header bar, and icons.</li>
                            </ul>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Save & Export</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-yellow-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-yellow-900 mb-3">Unsaved changes</h3>
                                <ul className="text-yellow-800 space-y-2 text-sm">
                                    <li>• A banner appears when there are pending edits.</li>
                                    <li>• Click <strong>Save Changes</strong> to persist to your environment.</li>
                                </ul>
                            </div>
                            <div className="bg-indigo-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-indigo-900 mb-3">Download Script</h3>
                                <ul className="text-indigo-800 space-y-2 text-sm">
                                    <li>• Exports the embed script/snippet to integrate the chat UI elsewhere.</li>
                                    <li>• Useful for staging → production migration and sharing with developers.</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Best practices</h2>
                        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                            <li>• Keep avatars simple and recognizable at 24–40 px.</li>
                            <li>• Welcome messages should clarify scope and offer 1–2 quick options.</li>
                            <li>• Test light/dark themes and mobile widths in the preview.</li>
                        </ul>
                    </section>
                </div>
            )
        },
        'controls-billing': {
            title: 'Billing',
            content: (
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">Billing & Subscriptions</h1>
                    <p className="text-gray-700 mb-6">Manage plans, fill billing details, and pay using Razorpay, Intuit, or PayPal. This guide explains each step and payment option (UPI, cards, netbanking).</p>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">1) Choose a Subscription Plan</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white rounded-lg border p-6">
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Starter – $25/mo</h3>
                                <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                                    <li>• Leads (manual entry & basic forms)</li>
                                    <li>• Basic Dashboard & Analytics</li>
                                    <li>• Limited AI Bot (lead response, basic Q&A)</li>
                                    <li>• Email Support • 1 seat</li>
                                </ul>
                            </div>
                            <div className="bg-white rounded-lg border p-6">
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Growth – $99/mo</h3>
                                <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                                    <li>• Everything in Starter</li>
                                    <li>• Job Application Management</li>
                                    <li>• CRM Lite (contact history, notes)</li>
                                    <li>• Standard Metrics • AI Bot (moderate)</li>
                                    <li>• Multi‑user access (up to 3) • Chat+Email support</li>
                                </ul>
                            </div>
                            <div className="bg-white rounded-lg border p-6">
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Professional – $100/mo</h3>
                                <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                                    <li>• Everything in Growth</li>
                                    <li>• Helpdesk (ticketing, auto‑assign, SLAs)</li>
                                    <li>• Full CRM suite (pipeline, tags, filters)</li>
                                    <li>• Advanced dashboards (funnel, logs)</li>
                                    <li>• Pro AI Bot, API access, custom integrations</li>
                                    <li>• Multi‑user (up to 10) • Priority support</li>
                                </ul>
                            </div>
                        </div>
                        <p className="text-sm text-gray-600 mt-3">Click <strong>Upgrade</strong> on your preferred plan to continue.</p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">2) Fill Billing Details</h2>
                        <div className="bg-blue-50 p-6 rounded-lg">
                            <ul className="text-blue-800 space-y-2 text-sm">
                                <li>• Required fields: Name, Email, Company, Business ID, Country, Address, City, State, Zip.</li>
                                <li>• Optional: Special instructions (GST/VAT notes, PO #, etc.).</li>
                                <li>• Click <strong>Continue</strong> to proceed to payments.</li>
                            </ul>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">3) Payment Methods</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white rounded-lg border p-6">
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Razorpay</h3>
                                <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                                    <li>• <strong>UPI</strong>: Enter UPI ID → Verify and Pay.</li>
                                    <li>• <strong>Cards</strong>: Add card (number, MM/YY, CVV, name) → Continue.</li>
                                    <li>• <strong>Netbanking</strong>: Select bank → User ID + Password → Pay Now.</li>
                                </ul>
                                <p className="text-xs text-gray-500 mt-2">Price summary appears on the left; follow on‑screen verification (OTP/3DS) if prompted.</p>
                            </div>
                            <div className="bg-white rounded-lg border p-6">
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Intuit</h3>
                                <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                                    <li>• Sign in with your Intuit/QuickBooks account.</li>
                                    <li>• Choose payment source (card/bank) saved in Intuit.</li>
                                    <li>• Confirm amount → Complete → You are redirected back with status.</li>
                                </ul>
                                <p className="text-xs text-gray-500 mt-2">Invoices can sync to your QuickBooks company if enabled.</p>
                            </div>
                            <div className="bg-white rounded-lg border p-6">
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">PayPal</h3>
                                <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                                    <li>• Log in to PayPal (or Pay as Guest where available).</li>
                                    <li>• Select funding source (balance/card/bank) and confirm shipping/billing.</li>
                                    <li>• Authorize payment → Return to app with confirmation.</li>
                                </ul>
                                <p className="text-xs text-gray-500 mt-2">PayPal handles currency conversion and 2‑factor verification when required.</p>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Payment History & Invoices</h2>
                        <div className="bg-gray-50 p-6 rounded-lg">
                            <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                                <li>• Recent payments appear in the history table after completion.</li>
                                <li>• Download invoices/receipts for each successful transaction.</li>
                                <li>• If a payment fails, you can retry using any available method.</li>
                            </ul>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Tips & Troubleshooting</h2>
                        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                            <li>• Ensure the billing email is correct to receive receipts.</li>
                            <li>• For card payments, enable international/online transactions with your bank.</li>
                            <li>• If UPI verification fails, re‑check the VPA format and try again.</li>
                        </ul>
                    </section>
                </div>
            )
        },
        'controls-email': {
            title: 'Email Settings',
            content: (
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">SMTP Settings (Amazon SES/Custom)</h1>
                    <p className="text-gray-700 mb-6">Configure your SMTP server to send emails, notifications, and automated messages. Supports Amazon SES, Outlook (Office 365), or any custom SMTP.</p>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Server Configuration</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white rounded-lg border p-6">
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Server Settings</h3>
                                <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                                    <li>• <strong>SMTP Host</strong>: e.g., <code className="bg-gray-100 px-1 rounded">email-smtp.ap-south-1.amazonaws.com</code></li>
                                    <li>• <strong>Port</strong>: 587 (STARTTLS), 465 (TLS wrapper), or 25 (legacy).</li>
                                    <li>• <strong>Security</strong>: STARTTLS (recommended) or TLS Wrapper for 465.</li>
                                    <li>• <strong>Require Authentication</strong>: Leave enabled (SES always needs auth).</li>
                                </ul>
                            </div>
                            <div className="bg-white rounded-lg border p-6">
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Authentication</h3>
                                <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                                    <li>• <strong>Username</strong>: SMTP user (for SES use the IAM SMTP user name).</li>
                                    <li>• <strong>Password</strong>: SMTP password (SES: generated SMTP password).</li>
                                    <li>• <strong>From Name</strong>: Display name for outgoing emails (e.g., "Mobiloitte AI Agent").</li>
                                    <li>• <strong>From Email</strong>: Verified sender address (must be verified in SES or your SMTP).</li>
                                </ul>
                                <p className="text-xs text-gray-500 mt-2">Ensure the from address/domain is verified to avoid rejections.</p>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Test & Save</h2>
                        <div className="bg-blue-50 p-6 rounded-lg">
                            <ul className="text-blue-800 space-y-2 text-sm">
                                <li>• <strong>Send Test Email</strong>: Enter a recipient to validate connectivity and credentials.</li>
                                <li>• <strong>Save Configuration</strong>: Persist changes.</li>
                                <li>• <strong>Reset to Default</strong>: Clear fields and revert defaults.</li>
                            </ul>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Connection Status</h2>
                        <div className="bg-green-50 p-6 rounded-lg">
                            <ul className="text-green-800 space-y-1 text-sm">
                                <li>• <strong>Status</strong>: Connected/Online indicates the SMTP server is reachable.</li>
                                <li>• <strong>Last Connection Test</strong>: Timestamp of the last successful check.</li>
                                <li>• <strong>Emails Sent Today / Failed Deliveries / Queue Status</strong>: Operational counters.</li>
                            </ul>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Quick Setup Guide</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white rounded-lg border p-6">
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Amazon SES</h3>
                                <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                                    <li>• Endpoint: <code className="bg-gray-100 px-1 rounded">email-smtp.&lt;region&gt;.amazonaws.com</code></li>
                                    <li>• Ports: 25, 587 (STARTTLS), 2587; 465 (TLS wrapper)</li>
                                    <li>• Verify domain or email in SES; create SMTP user and password.</li>
                                </ul>
                            </div>
                            <div className="bg-white rounded-lg border p-6">
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Outlook (Office 365)</h3>
                                <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                                    <li>• Host: <code className="bg-gray-100 px-1 rounded">smtp-mail.outlook.com</code></li>
                                    <li>• Port: 587 (STARTTLS)</li>
                                    <li>• Use your mailbox user/password or app password if MFA is enabled.</li>
                                </ul>
                            </div>
                            <div className="bg-white rounded-lg border p-6">
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Custom SMTP</h3>
                                <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                                    <li>• Host: your SMTP server</li>
                                    <li>• Port: typically 25, 587, or 465</li>
                                    <li>• Security and auth as provided by your email provider.</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Best Practices</h2>
                        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                            <li>• Use a dedicated, verified sending domain with SPF/DKIM/DMARC for best deliverability.</li>
                            <li>• Keep SMTP credentials secret; rotate on schedule.</li>
                            <li>• Warm up new domains/IPs gradually to avoid throttling.</li>
                        </ul>
                    </section>
                </div>
            )
        },
        'controls-chat-inbox': {
            title: 'Chat Inbox',
            content: (
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">Chat Inbox</h1>
                    <p className="text-gray-700 mb-6">View and manage all conversation threads. Open a chat, review sentiment, or delete obsolete threads. The list shows the most recent activity first.</p>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Previous Threads</h2>
                        <div className="bg-white rounded-lg border p-4">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Table columns</h3>
                            <ul className="text-sm text-gray-700 grid md:grid-cols-2 gap-x-8 gap-y-1">
                                <li>• <strong>Title</strong>: Conversation title or ID (click to copy or reference).</li>
                                <li>• <strong>Created On</strong>: Thread creation date.</li>
                                <li>• <strong>Chat</strong>: Opens the chat transcript in a new view to continue the thread.</li>
                                <li>• <strong>Delete</strong>: Permanently removes the thread (with confirmation).</li>
                                <li>• <strong>Sentiment</strong>: Aggregated sentiment badge (Positive/Neutral/Negative).</li>
                                <li>• <strong>Threads</strong>: Message count or number of turns.</li>
                            </ul>

                            <h3 className="font-semibold text-gray-900 mt-4 mb-2">Row actions</h3>
                            <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                                <li>• Click the <strong>chat bubble</strong> icon to open and continue the conversation.</li>
                                <li>• Click the <strong>trash</strong> icon to delete; this cannot be undone.</li>
                                <li>• Sentiment badges help triage: investigate Negative first.</li>
                            </ul>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Finding conversations faster</h2>
                        <div className="bg-blue-50 p-6 rounded-lg">
                            <ul className="text-blue-800 space-y-2 text-sm">
                                <li>• Sort by <strong>Created On</strong> to review recent or historical threads.</li>
                                <li>• Filter by <strong>Sentiment</strong> (when available) to prioritize follow‑ups.</li>
                                <li>• Use pagination controls at the bottom to navigate older pages.</li>
                            </ul>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Best practices</h2>
                        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                            <li>• Keep titles meaningful so teams can search and reference threads easily.</li>
                            <li>• Regularly archive/delete spam or duplicate threads to keep the inbox quick.</li>
                            <li>• Escalate Negative sentiment threads to human agents promptly.</li>
                        </ul>
                    </section>
                </div>
            )
        },
        'controls-prompts': {
            title: 'AI Prompts',
            content: (
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">AI Prompts</h1>
                    <p className="text-gray-700 mb-6">Design and manage how the AI speaks, what tools it can call, and the safety rules it must follow. Use this guide to structure high‑quality prompts that are easy to test and evolve.</p>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Prompt model</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white rounded-lg border p-6">
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Core components</h3>
                                <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                                    <li>• <strong>System Prompt</strong>: The permanent instructions that set role, tone, and do/don't rules.</li>
                                    <li>• <strong>Tools/Functions</strong>: Structured actions the AI may call (search, CRM, ticketing).</li>
                                    <li>• <strong>Guardrails</strong>: Hard limits (compliance, privacy, escalation rules).</li>
                                    <li>• <strong>Context</strong>: Knowledge snippets, user profile, conversation history.</li>
                                </ul>
                            </div>
                            <div className="bg-blue-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-blue-900 mb-2">Recommended structure</h3>
                                <ol className="text-blue-800 text-sm space-y-1">
                                    <li>1) Role + goals</li>
                                    <li>2) Output style (tone, language, format)</li>
                                    <li>3) Safety & refusals</li>
                                    <li>4) Tool‑use policy</li>
                                    <li>5) Step‑by‑step reasoning instruction</li>
                                </ol>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Variables & placeholders</h2>
                        <div className="bg-gray-50 p-6 rounded-lg">
                            <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                                <li>• Use {'{'}user_name{'}'}, {'{'}company{'}'}, {'{'}timezone{'}'} for dynamic personalization.</li>
                                <li>• Wrap code/commands in triple backticks for reliable formatting.</li>
                                <li>• Keep placeholders lower_snake_case and document each variable.</li>
                            </ul>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Context & memory</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-green-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-green-900 mb-2">What to inject</h3>
                                <ul className="text-green-800 text-sm space-y-1">
                                    <li>• Latest 5–10 messages for continuity.</li>
                                    <li>• Relevant knowledge chunks (top‑k retrieval).</li>
                                    <li>• User profile and permissions when available.</li>
                                </ul>
                            </div>
                            <div className="bg-white rounded-lg border p-6">
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Do not include</h3>
                                <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                                    <li>• Secrets or raw tokens.</li>
                                    <li>• Large, unfiltered documents that exceed limits.</li>
                                    <li>• PII unrelated to the current task.</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Tools & function calling</h2>
                        <div className="bg-white rounded-lg border p-6">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Design guidelines</h3>
                            <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                                <li>• Define each tool with: name, description, parameters schema, and auth rules.</li>
                                <li>• In the prompt, instruct: "Only call a tool if needed; otherwise, answer directly."</li>
                                <li>• Return concise, structured arguments to avoid parsing errors.</li>
                            </ul>
                            <h3 className="font-semibold text-gray-900 mt-4 mb-2">Example policy</h3>
                            <pre className="text-xs bg-gray-100 p-3 rounded overflow-x-auto">{`When the user asks about data you cannot infer, call the relevant tool once with minimal parameters. If a tool fails, explain the error and suggest next steps; do not guess.`}</pre>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Safety & guardrails</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-red-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-red-900 mb-2">Refusals</h3>
                                <ul className="text-red-800 text-sm space-y-1">
                                    <li>• Decline disallowed content (PII leakage, illegal, medical/financial advice without disclaimer).</li>
                                    <li>• Offer safe alternatives or escalation to a human.</li>
                                </ul>
                            </div>
                            <div className="bg-yellow-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-yellow-900 mb-2">Formatting rules</h3>
                                <ul className="text-yellow-800 text-sm space-y-1">
                                    <li>• Use clear headings, short paragraphs, and bullet lists.</li>
                                    <li>• Include code fences for commands and API examples.</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Versioning & rollout</h2>
                        <div className="bg-purple-50 p-6 rounded-lg">
                            <ul className="text-purple-800 text-sm space-y-1">
                                <li>• Maintain <strong>v1, v2, ...</strong> prompt versions with change notes.</li>
                                <li>• Use staged rollout: test with internal users before global enable.</li>
                                <li>• Keep a rollback button to restore the previous stable version.</li>
                            </ul>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Testing & evaluation</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white rounded-lg border p-6">
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Manual tests</h3>
                                <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                                    <li>• Golden prompts: create 10–20 representative queries.</li>
                                    <li>• Edge cases: ambiguous asks, multiple intents, missing context.</li>
                                    <li>• Regression: re‑run after each edit.</li>
                                </ul>
                            </div>
                            <div className="bg-green-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-green-900 mb-2">Metrics</h3>
                                <ul className="text-green-800 text-sm space-y-1">
                                    <li>• Task success rate and time‑to‑answer.</li>
                                    <li>• Tool error rate and fallback frequency.</li>
                                    <li>• CSAT and sentiment on resolved threads.</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Best practices</h2>
                        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                            <li>• Keep instructions short, unambiguous, and action‑oriented.</li>
                            <li>• Prefer explicit formats (tables, JSON blocks) when the output feeds another system.</li>
                            <li>• Periodically prune rules that are no longer needed to reduce prompt length.</li>
                        </ul>
                    </section>
                </div>
            )
        },
        'controls-status': {
            title: 'System Status',
            content: (
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">System Status</h1>
                    <p className="text-gray-700 mb-6">Monitor platform health at a glance. Check overall status, drill into services, and review recent incidents. All updates are near real‑time.</p>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Overall</h2>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                            <p className="text-green-900 font-semibold">All systems operational</p>
                            <p className="text-sm text-green-800 mt-1">Everything is running smoothly.</p>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Service Status</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Authentication API */}
                            <div className="bg-white rounded-lg border p-5">
                                <h3 className="font-semibold text-gray-900">Authentication API <span className="ml-2 inline-block text-xs px-2 py-0.5 rounded bg-green-100 text-green-800 align-middle">Operational</span></h3>
                                <p className="text-sm text-gray-700 mt-1">API is running.</p>
                            </div>

                            {/* Dashboard UI */}
                            <div className="bg-white rounded-lg border p-5">
                                <h3 className="font-semibold text-gray-900">Dashboard UI <span className="ml-2 inline-block text-xs px-2 py-0.5 rounded bg-green-100 text-green-800 align-middle">Operational</span></h3>
                                <p className="text-sm text-gray-700 mt-1">Realtime data updated.</p>
                            </div>

                            {/* Billing/Payments */}
                            <div className="bg-white rounded-lg border p-5">
                                <h3 className="font-semibold text-gray-900">Billing/Payments <span className="ml-2 inline-block text-xs px-2 py-0.5 rounded bg-green-100 text-green-800 align-middle">Operational</span></h3>
                                <p className="text-sm text-gray-700 mt-1">Delays in invoice generation.</p>
                                <p className="text-xs text-blue-700 mt-2"><span className="inline-block bg-blue-100 text-blue-800 px-2 py-0.5 rounded">View Orders (0)</span></p>
                            </div>

                            {/* File Storage */}
                            <div className="bg-white rounded-lg border p-5">
                                <h3 className="font-semibold text-gray-900">File Storage <span className="ml-2 inline-block text-xs px-2 py-0.5 rounded bg-green-100 text-green-800 align-middle">Operational</span></h3>
                                <p className="text-sm text-gray-700 mt-1">This storage is powered by Amazon S3 bucket: <code className="bg-gray-100 px-1 rounded">ragchatbot-bucket</code>.</p>
                                <p className="text-xs text-indigo-700 mt-2"><span className="inline-block bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">View Details</span></p>
                            </div>

                            {/* Notifications */}
                            <div className="bg-white rounded-lg border p-5">
                                <h3 className="font-semibold text-gray-900">Notifications <span className="ml-2 inline-block text-xs px-2 py-0.5 rounded bg-green-100 text-green-800 align-middle">Operational</span></h3>
                                <ul className="text-sm text-gray-700 mt-1 space-y-1">
                                    <li>• lead</li>
                                    <li>• gtr</li>
                                    <li className="text-xs text-gray-500">02/09/2025, 09:38:47</li>
                                </ul>
                            </div>

                            {/* User Management */}
                            <div className="bg-white rounded-lg border p-5">
                                <h3 className="font-semibold text-gray-900">User Management <span className="ml-2 inline-block text-xs px-2 py-0.5 rounded bg-green-100 text-green-800 align-middle">Operational</span></h3>
                                <p className="text-sm text-gray-700 mt-1">User creation is currently unavailable.</p>
                                <p className="text-xs text-gray-600 mt-1">Current User: Mobiloitte</p>
                                <p className="text-xs text-indigo-700 mt-2"><span className="inline-block bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">View Details</span></p>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Incidents & maintenance</h2>
                        <div className="bg-yellow-50 p-6 rounded-lg">
                            <ul className="text-yellow-800 text-sm space-y-1">
                                <li>• Minor delay in invoice generation under Billing/Payments. Monitoring.</li>
                                <li>• No scheduled maintenance at this time.</li>
                            </ul>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">How to use</h2>
                        <div className="bg-blue-50 p-6 rounded-lg">
                            <ol className="text-blue-800 text-sm space-y-1">
                                <li>1) Check Overall banner for immediate health signal.</li>
                                <li>2) Review service cards; open <strong>View Details</strong> for deeper logs or metrics.</li>
                                <li>3) If a service is degraded, consult Incidents and retry after a few minutes.</li>
                            </ol>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Best practices</h2>
                        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                            <li>• Keep alerts enabled for critical services (Auth, Billing, Storage).</li>
                            <li>• Document mitigations for common issues (e.g., invoice delays).</li>
                            <li>• Use incident post‑mortems to prevent repeats and improve uptime.</li>
                        </ul>
                        <p className="text-xs text-gray-500 mt-4">Last updated: 02/09/2025, 17:30:07</p>
                    </section>
                </div>
            )
        },
        'controls-dashboard-settings': {
            title: 'Dashboard Settings',
            content: (
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">Email Reports & Notification Settings</h1>
                    <p className="text-gray-700 mb-6">Configure automated dashboard email reports. Create schedules with time and timezone, and manage them in the saved schedules list.</p>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Create a Schedule</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white rounded-lg border p-6">
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Form Fields</h3>
                                <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                                    <li>• <strong>Email Address</strong> (required): recipient email for the report.</li>
                                    <li>• <strong>Dashboard</strong> (required): select the dashboard to export (e.g., <em>overview Dashboard</em>).</li>
                                    <li>• <strong>Schedule</strong> (required): Daily, Weekly, Monthly.</li>
                                    <li>• <strong>Time</strong>: set hour and minute; choose <em>Meridiem</em> (AM/PM).</li>
                                    <li>• <strong>Timezone</strong>: delivery timezone (default UTC).</li>
                                    <li>• Click <strong>Save</strong> to add the schedule to the table.</li>
                                </ul>
                            </div>
                            <div className="bg-blue-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-blue-900 mb-2">Examples</h3>
                                <ul className="text-blue-800 text-sm space-y-1">
                                    <li>• Daily Overview at 09:00 AM UTC to team@company.com</li>
                                    <li>• Weekly Overview every Monday 08:30 AM Asia/Kolkata</li>
                                    <li>• Monthly Overview on 1st 07:00 AM Europe/Berlin</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Saved Email Report & Notification Schedules</h2>
                        <div className="bg-white rounded-lg border p-6">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Table Columns</h3>
                            <ul className="text-sm text-gray-700 grid md:grid-cols-2 gap-x-8 gap-y-1">
                                <li>• <strong>Email</strong>: recipient address.</li>
                                <li>• <strong>Dashboard</strong>: clickable badge (e.g., overview Dashboard).</li>
                                <li>• <strong>Frequency</strong>: Daily/Weekly/Monthly.</li>
                                <li>• <strong>Time</strong>: HH:MM (24‑hour display).</li>
                                <li>• <strong>Timezone</strong>: e.g., UTC (Coordinated Universal Time).</li>
                                <li>• <strong>Action</strong>: delete icon to remove a schedule.</li>
                            </ul>

                            <h3 className="font-semibold text-gray-900 mt-4 mb-2">Interactions</h3>
                            <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                                <li>• Use Items per page and Prev/Next to navigate long lists.</li>
                                <li>• Click dashboard badges to open the target dashboard.</li>
                                <li>• Deleting a row immediately stops future emails for that schedule.</li>
                            </ul>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Validation & Delivery</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-green-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-green-900 mb-2">Rules</h3>
                                <ul className="text-green-800 text-sm space-y-1">
                                    <li>• Email, Dashboard, and Schedule are mandatory.</li>
                                    <li>• If Time is blank, system uses 00:00; AM/PM applies to 12‑hour input.</li>
                                    <li>• Timezone should reflect recipients; default is UTC.</li>
                                </ul>
                            </div>
                            <div className="bg-yellow-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-yellow-900 mb-2">Delivery & Format</h3>
                                <ul className="text-yellow-800 text-sm space-y-1">
                                    <li>• Email includes a link and/or attached export (PDF/CSV where enabled).</li>
                                    <li>• Failures trigger retry and an error notification to admins.</li>
                                    <li>• Timestamps in emails are rendered in the selected timezone.</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Best Practices</h2>
                        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                            <li>• Use group inboxes (e.g., analytics@company.com) for visibility.</li>
                            <li>• Stagger heavy exports outside peak hours.</li>
                            <li>• Review and clean unused schedules monthly.</li>
                            <li>• Align timezones with recipients to avoid confusion.</li>
                        </ul>
                    </section>
                </div>
            )
        },
        'controls-users': {
            title: 'Manage Users',
            content: (
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">Manage Users</h1>
                    <p className="text-gray-700 mb-6">Comprehensive user management system for controlling access, roles, and permissions across the platform. Effortlessly manage your team's accounts, roles, and permissions with advanced controls.</p>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Overview & Navigation</h2>
                        <div className="bg-blue-50 p-6 rounded-lg">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h3 className="text-lg font-semibold text-blue-900 mb-3">Page Structure</h3>
                                    <ul className="text-blue-800 space-y-2 text-sm">
                                        <li>• <strong>Breadcrumbs:</strong> "Dashboard {'>'} User Management" navigation path</li>
                                        <li>• <strong>Page Title:</strong> "User Management" with info icon</li>
                                        <li>• <strong>Description:</strong> Brief overview of the page's purpose</li>
                                        <li>• <strong>Summary Badges:</strong> Quick statistics display (Admin, users, roles)</li>
                                    </ul>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-blue-900 mb-3">Tab Navigation</h3>
                                    <ul className="text-blue-800 space-y-2 text-sm">
                                        <li>• <strong>Users Tab:</strong> Manage individual user accounts</li>
                                        <li>• <strong>Roles Tab:</strong> Configure system roles and permissions</li>
                                        <li>• <strong>Permissions Tab:</strong> Define granular access controls</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Users Management</h2>
                        <div className="bg-green-50 p-6 rounded-lg mb-6">
                            <h3 className="text-lg font-semibold text-green-900 mb-3">User List Features</h3>
                            <p className="text-green-800 mb-4">View and manage user accounts and their access levels with comprehensive user information and controls.</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <h4 className="font-semibold text-green-900 mb-2">Action Bar</h4>
                                    <ul className="text-green-800 space-y-1 text-sm">
                                        <li>• <strong>Search:</strong> Search by name, email, or mobile number</li>
                                        <li>• <strong>Filters:</strong> Advanced filtering options with dropdown</li>
                                        <li>• <strong>Refresh:</strong> Update the user list</li>
                                        <li>• <strong>New User:</strong> Add new user accounts</li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-green-900 mb-2">User Table Columns</h4>
                                    <ul className="text-green-800 space-y-1 text-sm">
                                        <li>• <strong>Checkbox:</strong> Select multiple users for bulk actions</li>
                                        <li>• <strong>User:</strong> Avatar, name, and unique ID</li>
                                        <li>• <strong>Contact:</strong> Email and phone number</li>
                                        <li>• <strong>Roles:</strong> Assigned roles with badges</li>
                                        <li>• <strong>Status:</strong> Active/Inactive status</li>
                                        <li>• <strong>Last Activity:</strong> Time since last login</li>
                                        <li>• <strong>Actions:</strong> Edit, Email, Delete options</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Roles Management</h2>
                        <div className="bg-purple-50 p-6 rounded-lg mb-6">
                            <h3 className="text-lg font-semibold text-purple-900 mb-3">System Roles</h3>
                            <p className="text-purple-800 mb-4">Manage user roles and their associated permissions with predefined role templates and custom configurations.</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <h4 className="font-semibold text-purple-900 mb-2">Predefined Roles</h4>
                                    <ul className="text-purple-800 space-y-2 text-sm">
                                        <li>• <strong>Super Admin:</strong> Full system access with all permissions</li>
                                        <li>• <strong>IT:</strong> System management and technical features</li>
                                        <li>• <strong>HR:</strong> Employee and job management</li>
                                        <li>• <strong>Customer Support:</strong> CRM Executive functions</li>
                                        <li>• <strong>Sales:</strong> Lead and customer management</li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-purple-900 mb-2">Role Card Information</h4>
                                    <ul className="text-purple-800 space-y-1 text-sm">
                                        <li>• <strong>Icon:</strong> Visual representation of role type</li>
                                        <li>• <strong>Title:</strong> Role name and description</li>
                                        <li>• <strong>Users:</strong> Number of users assigned to role</li>
                                        <li>• <strong>Permissions:</strong> List of assigned permissions</li>
                                        <li>• <strong>Actions:</strong> Manage and delete options</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Permissions Management</h2>
                        <div className="bg-orange-50 p-6 rounded-lg mb-6">
                            <h3 className="text-lg font-semibold text-orange-900 mb-3">Access Control</h3>
                            <p className="text-orange-800 mb-4">Manage system permissions and access controls with granular permission definitions and role assignments.</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <h4 className="font-semibold text-orange-900 mb-2">Permission Types</h4>
                                    <ul className="text-orange-800 space-y-2 text-sm">
                                        <li>• <strong>system:admin:</strong> Full system access control</li>
                                        <li>• <strong>user:create:</strong> Create new user accounts</li>
                                        <li>• <strong>user:read:</strong> View user information</li>
                                        <li>• <strong>user:update:</strong> Modify user details</li>
                                        <li>• <strong>user:delete:</strong> Remove user accounts</li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-orange-900 mb-2">Permission Table</h4>
                                    <ul className="text-orange-800 space-y-1 text-sm">
                                        <li>• <strong>Checkbox:</strong> Select permissions for bulk actions</li>
                                        <li>• <strong>Permission:</strong> Permission name with icon badge</li>
                                        <li>• <strong>Description:</strong> Clear explanation of permission scope</li>
                                        <li>• <strong>ID:</strong> Unique permission identifier</li>
                                        <li>• <strong>Actions:</strong> Edit and delete options</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">User Management Workflow</h2>
                        <div className="bg-gray-50 p-6 rounded-lg">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Common Operations</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Adding New Users</h4>
                                    <ol className="text-gray-700 space-y-2 text-sm">
                                        <li>1. Click the "+ New User" button</li>
                                        <li>2. Fill in user details (name, email, phone)</li>
                                        <li>3. Assign appropriate roles</li>
                                        <li>4. Set initial password or send invitation</li>
                                        <li>5. Configure access permissions</li>
                                        <li>6. Save and activate the account</li>
                                    </ol>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Managing Existing Users</h4>
                                    <ol className="text-gray-700 space-y-2 text-sm">
                                        <li>1. Use search and filters to locate users</li>
                                        <li>2. Click the edit icon to modify details</li>
                                        <li>3. Update roles and permissions as needed</li>
                                        <li>4. Change user status (active/inactive)</li>
                                        <li>5. Reset passwords if required</li>
                                        <li>6. Save changes and notify users</li>
                                    </ol>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Role & Permission Best Practices</h2>
                        <div className="bg-yellow-50 p-6 rounded-lg">
                            <h3 className="text-lg font-semibold text-yellow-900 mb-3">Security Guidelines</h3>
                            <ul className="text-yellow-800 space-y-2 text-sm">
                                <li>• <strong>Principle of Least Privilege:</strong> Grant only necessary permissions</li>
                                <li>• <strong>Regular Reviews:</strong> Periodically audit user roles and permissions</li>
                                <li>• <strong>Role Templates:</strong> Use predefined roles for consistency</li>
                                <li>• <strong>Permission Groups:</strong> Group related permissions for easier management</li>
                                <li>• <strong>Access Logging:</strong> Monitor user access and changes</li>
                                <li>• <strong>Emergency Access:</strong> Maintain admin accounts for critical situations</li>
                            </ul>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Troubleshooting</h2>
                        <div className="bg-red-50 p-6 rounded-lg">
                            <h3 className="text-lg font-semibold text-red-900 mb-3">Common Issues</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <h4 className="font-semibold text-red-900 mb-2">User Access Problems</h4>
                                    <ul className="text-red-800 space-y-1 text-sm">
                                        <li>• <strong>Login Issues:</strong> Check user status and role assignments</li>
                                        <li>• <strong>Permission Denied:</strong> Verify role permissions and access levels</li>
                                        <li>• <strong>Account Locked:</strong> Review security settings and unlock if needed</li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-red-900 mb-2">Role Management Issues</h4>
                                    <ul className="text-red-800 space-y-1 text-sm">
                                        <li>• <strong>Permission Conflicts:</strong> Check for overlapping role assignments</li>
                                        <li>• <strong>Role Inheritance:</strong> Verify role hierarchy and permissions</li>
                                        <li>• <strong>Bulk Updates:</strong> Ensure proper role assignment for multiple users</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            )
        },
        'version': {
            title: 'Version 1.0',
            content: (
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">Version Information & System Details</h1>
                    <p className="text-gray-700 mb-6">Aapke AI Agent chatbot platform ki complete version information, system specifications, aur update process ke baare mein detailed jankari.</p>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Current Version Details</h2>
                        <div className="bg-gray-50 p-6 rounded-lg">
                            <p className="text-gray-700 mb-4">Aapka AI Agent chatbot platform abhi version 1.0.0 par hai. Ye first stable release hai jo production environment mein successfully run kar raha hai. Is version mein core functionality implement ki gayi hai.</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div className="bg-white p-4 rounded-lg border border-gray-200">
                                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-lg">Version Information</h3>
                                    <div className="space-y-2">
                                        <p><strong>Version Number:</strong> <span className="text-blue-600 font-mono">1.0.0</span></p>
                                        <p><strong>Release Status:</strong> <span className="text-green-600">Stable</span></p>
                                        <p><strong>Build Number:</strong> <span className="text-gray-600 font-mono">20250101.001</span></p>
                                        <p><strong>Release Date:</strong> <span className="text-gray-600">January 1, 2025</span></p>
                                    </div>
                                </div>

                                <div className="bg-white p-4 rounded-lg border border-gray-200">
                                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-lg">Environment Details</h3>
                                    <div className="space-y-2">
                                        <p><strong>Environment:</strong> <span className="text-blue-600">Production</span></p>
                                        <p><strong>Server Status:</strong> <span className="text-green-600">Active</span></p>
                                        <p><strong>Database:</strong> <span className="text-gray-600">PostgreSQL 15</span></p>
                                        <p><strong>Cache:</strong> <span className="text-gray-600">Redis 7.0</span></p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800/50">
                                <h3 className="font-semibold text-blue-900 mb-2">Version 1.0.0 Significance</h3>
                                <p className="text-blue-800 text-sm">Ye aapke platform ka first major release hai. Is version mein basic chatbot functionality, user management, aur admin panel implement ki gayi hai. Future versions mein advanced features add honge.</p>
                            </div>
                        </div>


                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Version History & Release Timeline</h2>
                        <div className="bg-green-50 p-6 rounded-lg">
                            <p className="text-green-800 mb-4">Aapke AI Agent platform ka complete development journey aur release history:</p>

                            <div className="space-y-4">
                                <div className="bg-white p-4 rounded-lg border border-green-200">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-semibold text-green-900">Version 1.0.0 - Initial Release</h3>
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            Stable
                                        </span>
                                    </div>
                                    <p className="text-green-700 text-sm mb-2">First production-ready release with core functionality</p>
                                    <div className="text-xs text-green-600">
                                        <p><strong>Release Date:</strong> January 1, 2025</p>
                                        <p><strong>Development Time:</strong> 6 months</p>
                                        <p><strong>Key Milestone:</strong> Production deployment</p>
                                    </div>
                                </div>

                                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800/50">
                                    <h3 className="font-semibold text-yellow-900 mb-2">Upcoming Releases</h3>
                                    <div className="space-y-2 text-sm text-yellow-800">
                                        <p>• <strong>Version 1.1.0:</strong> Enhanced NLP and conversation flow (Q2 2025)</p>
                                        <p>• <strong>Version 1.2.0:</strong> Advanced analytics and reporting (Q3 2025)</p>
                                        <p>• <strong>Version 2.0.0:</strong> AI-powered insights and automation (Q4 2025)</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Version 1.0.0 Features & Capabilities</h2>
                        <div className="bg-blue-50 p-6 rounded-lg">
                            <p className="text-blue-800 mb-4">Version 1.0.0 mein ye comprehensive features implement kiye gaye hain:</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div className="bg-white p-4 rounded-lg border border-blue-200">
                                    <h3 className="font-semibold text-blue-900 mb-3">Core Chatbot Features</h3>
                                    <ul className="text-blue-800 space-y-2 text-sm">
                                        <li>• <strong>Natural Language Processing:</strong> Basic conversation understanding</li>
                                        <li>• <strong>Response Generation:</strong> Automated replies based on knowledge base</li>
                                        <li>• <strong>Multi-language Support:</strong> Hindi and English language support</li>
                                        <li>• <strong>Context Awareness:</strong> Basic conversation flow management</li>
                                    </ul>
                                </div>

                                <div className="bg-white p-4 rounded-lg border border-blue-200">
                                    <h3 className="font-semibold text-blue-900 mb-3">User Management System</h3>
                                    <ul className="text-blue-800 space-y-2 text-sm">
                                        <li>• <strong>User Authentication:</strong> Secure login and registration</li>
                                        <li>• <strong>Role-based Access:</strong> Admin, User, and Guest roles</li>
                                        <li>• <strong>Profile Management:</strong> User profile customization</li>
                                        <li>• <strong>Session Management:</strong> Secure session handling</li>
                                    </ul>
                                </div>
                            </div>

                            <div className="bg-blue-100 p-4 rounded-lg border border-blue-300">
                                <h3 className="font-semibold text-blue-900 mb-2">Administrative Features</h3>
                                <ul className="text-blue-800 space-y-2 text-sm">
                                    <li>• <strong>Admin Dashboard:</strong> Complete system overview and control</li>
                                    <li>• <strong>Knowledge Base Management:</strong> File upload and organization</li>
                                    <li>• <strong>User Analytics:</strong> Basic usage statistics and reports</li>
                                    <li>• <strong>System Configuration:</strong> Platform settings and customization</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Technical Specifications & System Architecture</h2>
                        <div className="bg-gray-50 p-6 rounded-lg">
                            <p className="text-gray-700 mb-4">Aapke platform ki complete technical specifications aur system architecture details:</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div className="bg-white p-4 rounded-lg border border-gray-200">
                                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Build & Deployment Details</h3>
                                    <div className="space-y-2 text-sm">
                                        <p><strong>Build Number:</strong> <span className="font-mono text-blue-600">20250101.001</span></p>
                                        <p><strong>Git Commit:</strong> <span className="font-mono text-gray-600">abc123def456</span></p>
                                        <p><strong>Build Date:</strong> <span className="text-gray-600">January 1, 2025</span></p>
                                        <p><strong>Deployment Method:</strong> <span className="text-green-600">Docker Container</span></p>
                                    </div>
                                </div>

                                <div className="bg-white p-4 rounded-lg border border-gray-200">
                                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Frontend Technology Stack</h3>
                                    <div className="space-y-2 text-sm">
                                        <p><strong>Framework:</strong> <span className="text-blue-600">Next.js 14</span></p>
                                        <p><strong>UI Library:</strong> <span className="text-blue-600">React 18</span></p>
                                        <p><strong>Styling:</strong> <span className="text-blue-600">Tailwind CSS</span></p>
                                        <p><strong>State Management:</strong> <span className="text-blue-600">Zustand</span></p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div className="bg-white p-4 rounded-lg border border-gray-200">
                                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Backend Technology Stack</h3>
                                    <div className="space-y-2 text-sm">
                                        <p><strong>Runtime:</strong> <span className="text-green-600">Node.js 18+</span></p>
                                        <p><strong>Database:</strong> <span className="text-green-600">PostgreSQL 15</span></p>
                                        <p><strong>Cache:</strong> <span className="text-green-600">Redis 7.0</span></p>
                                        <p><strong>API Framework:</strong> <span className="text-green-600">Express.js</span></p>
                                    </div>
                                </div>

                                <div className="bg-white p-4 rounded-lg border border-gray-200">
                                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">AI & ML Components</h3>
                                    <div className="space-y-2 text-sm">
                                        <p><strong>NLP Engine:</strong> <span className="text-purple-600">OpenAI GPT-4</span></p>
                                        <p><strong>Language Support:</strong> <span className="text-purple-600">Hindi + English</span></p>
                                        <p><strong>Model Version:</strong> <span className="text-purple-600">GPT-4 Turbo</span></p>
                                        <p><strong>Training Data:</strong> <span className="text-purple-600">Custom Domain</span></p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800/50">
                                <h3 className="font-semibold text-blue-900 mb-2">System Requirements</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                    <div>
                                        <p className="font-semibold text-blue-900">Minimum Requirements</p>
                                        <p className="text-blue-700">RAM: 4GB, CPU: 2 cores, Storage: 20GB</p>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-blue-900">Recommended Requirements</p>
                                        <p className="text-blue-700">RAM: 8GB, CPU: 4 cores, Storage: 50GB</p>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-blue-900">Production Requirements</p>
                                        <p className="text-blue-700">RAM: 16GB, CPU: 8 cores, Storage: 100GB</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Version Number System & Release Strategy</h2>
                        <div className="bg-yellow-50 p-6 rounded-lg">
                            <p className="text-yellow-800 mb-4">Aapke platform ke version numbers ka complete system aur release strategy:</p>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                <div className="bg-white p-4 rounded-lg border border-yellow-200 text-center">
                                    <div className="text-3xl font-bold text-yellow-600 mb-2">1</div>
                                    <h3 className="font-semibold text-yellow-900 mb-2">Major Version</h3>
                                    <p className="text-yellow-700 text-sm">Breaking changes, major features, platform upgrades</p>
                                    <div className="mt-2 text-xs text-yellow-600">
                                        <p><strong>Examples:</strong></p>
                                        <p>• Complete UI redesign</p>
                                        <p>• New AI model integration</p>
                                        <p>• Database schema changes</p>
                                    </div>
                                </div>

                                <div className="bg-white p-4 rounded-lg border border-yellow-200 text-center">
                                    <div className="text-3xl font-bold text-yellow-600 mb-2">0</div>
                                    <h3 className="font-semibold text-yellow-900 mb-2">Minor Version</h3>
                                    <p className="text-yellow-700 text-sm">New features, enhancements, backward compatible</p>
                                    <div className="mt-2 text-xs text-yellow-600">
                                        <p><strong>Examples:</strong></p>
                                        <p>• New chatbot features</p>
                                        <p>• Enhanced analytics</p>
                                        <p>• Performance improvements</p>
                                    </div>
                                </div>

                                <div className="bg-white p-4 rounded-lg border border-yellow-200 text-center">
                                    <div className="text-3xl font-bold text-yellow-600 mb-2">0</div>
                                    <h3 className="font-semibold text-yellow-900 mb-2">Patch Version</h3>
                                    <p className="text-yellow-700 text-sm">Bug fixes, security updates, minor improvements</p>
                                    <div className="mt-2 text-xs text-yellow-600">
                                        <p><strong>Examples:</strong></p>
                                        <p>• Security patches</p>
                                        <p>• Bug fixes</p>
                                        <p>• Performance tweaks</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-yellow-100 p-4 rounded-lg border border-yellow-300">
                                <h3 className="font-semibold text-yellow-900 mb-2">Release Schedule & Strategy</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-yellow-800">
                                    <div>
                                        <p><strong>Major Releases:</strong> Every 6-12 months</p>
                                        <p><strong>Minor Releases:</strong> Every 2-3 months</p>
                                        <p><strong>Patch Releases:</strong> As needed (weekly/monthly)</p>
                                    </div>
                                    <div>
                                        <p><strong>Testing:</strong> Beta testing before production</p>
                                        <p><strong>Rollback:</strong> Quick rollback capability</p>
                                        <p><strong>Documentation:</strong> Complete release notes</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Update Process & Maintenance</h2>
                        <div className="bg-purple-50 p-6 rounded-lg">
                            <p className="text-purple-800 mb-4">Aapke platform ke updates aur maintenance ka complete process:</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div className="bg-white p-4 rounded-lg border border-purple-200">
                                    <h3 className="font-semibold text-purple-900 mb-3">Automatic Update System</h3>
                                    <ul className="text-purple-800 space-y-2 text-sm">
                                        <li>• <strong>Daily Checks:</strong> System automatically checks for updates</li>
                                        <li>• <strong>Version Monitoring:</strong> Real-time version tracking</li>
                                        <li>• <strong>Security Alerts:</strong> Immediate security update notifications</li>
                                        <li>• <strong>Dependency Updates:</strong> Automatic package updates</li>
                                    </ul>
                                </div>

                                <div className="bg-white p-4 rounded-lg border border-purple-200">
                                    <h3 className="font-semibold text-purple-900 mb-3">Manual Update Process</h3>
                                    <ul className="text-purple-800 space-y-2 text-sm">
                                        <li>• <strong>Admin Approval:</strong> Manual update initiation</li>
                                        <li>• <strong>Backup Creation:</strong> System backup before updates</li>
                                        <li>• <strong>Staged Deployment:</strong> Gradual rollout process</li>
                                        <li>• <strong>Health Monitoring:</strong> System health checks</li>
                                    </ul>
                                </div>
                            </div>

                            <div className="bg-purple-100 p-4 rounded-lg border border-purple-300">
                                <h3 className="font-semibold text-purple-900 mb-2">Update Safety Features</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-purple-800">
                                    <div>
                                        <p className="font-semibold text-purple-900">Rollback Capability</p>
                                        <p className="text-purple-700">Quick revert to previous version if issues arise</p>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-purple-900">Beta Testing</p>
                                        <p className="text-purple-700">Test updates in staging environment first</p>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-purple-900">Health Monitoring</p>
                                        <p className="text-purple-700">Continuous system performance tracking</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-4 rounded-lg border border-purple-200 mt-4">
                                <h3 className="font-semibold text-purple-900 mb-2">Maintenance Schedule</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-purple-800">
                                    <div>
                                        <p><strong>Weekly:</strong> Security patches and minor updates</p>
                                        <p><strong>Monthly:</strong> Feature updates and performance improvements</p>
                                        <p><strong>Quarterly:</strong> Major feature releases and system upgrades</p>
                                    </div>
                                    <div>
                                        <p><strong>Maintenance Window:</strong> Sundays 2:00 AM - 6:00 AM IST</p>
                                        <p><strong>Notification:</strong> 48 hours advance notice for planned maintenance</p>
                                        <p><strong>Emergency Updates:</strong> Immediate deployment for critical issues</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            )
        },
        'about-company': {
            title: 'Company Info',
            content: (
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">Company Information</h1>
                    <p className="text-gray-700 mb-6">Learn about Mobiloitte, our mission, values, and company overview.</p>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">About Mobiloitte</h2>
                        <div className="bg-blue-50 p-6 rounded-lg">
                            <p className="text-blue-800 mb-4">Mobiloitte is a leading technology company specializing in AI-powered solutions and digital transformation services.</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <h3 className="font-semibold text-blue-900 mb-2">Our Mission</h3>
                                    <p className="text-blue-700 text-sm">To empower businesses with innovative AI solutions that drive growth and efficiency.</p>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-blue-900 mb-2">Our Vision</h3>
                                    <p className="text-blue-700 text-sm">To be the global leader in AI-powered business solutions and digital innovation.</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Company Details</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-green-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-green-900 mb-3">Core Services</h3>
                                <ul className="text-green-800 space-y-2 text-sm">
                                    <li>• AI Agent Development</li>
                                    <li>• Chatbot Solutions</li>
                                    <li>• Digital Transformation</li>
                                    <li>• Custom Software Development</li>
                                    <li>• Cloud Solutions</li>
                                    <li>• Mobile App Development</li>
                                </ul>
                            </div>
                            <div className="bg-purple-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-purple-900 mb-3">Industries We Serve</h3>
                                <ul className="text-purple-800 space-y-2 text-sm">
                                    <li>• Healthcare</li>
                                    <li>• Finance & Banking</li>
                                    <li>• E-commerce</li>
                                    <li>• Education</li>
                                    <li>• Manufacturing</li>
                                    <li>• Real Estate</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Company Values</h2>
                        <div className="bg-yellow-50 p-6 rounded-lg">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="text-center">
                                    <div className="w-12 h-12 bg-yellow-500 rounded-lg flex items-center justify-center mx-auto mb-3">
                                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <h3 className="font-semibold text-yellow-900 mb-2">Innovation</h3>
                                    <p className="text-yellow-800 text-sm">Constantly pushing boundaries in technology</p>
                                </div>
                                <div className="text-center">
                                    <div className="w-12 h-12 bg-yellow-500 rounded-lg flex items-center justify-center mx-auto mb-3">
                                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <h3 className="font-semibold text-yellow-900 mb-2">Quality</h3>
                                    <p className="text-yellow-800 text-sm">Delivering excellence in every project</p>
                                </div>
                                <div className="text-center">
                                    <div className="w-12 h-12 bg-yellow-500 rounded-lg flex items-center justify-center mx-auto mb-3">
                                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <h3 className="font-semibold text-yellow-900 mb-2">Integrity</h3>
                                    <p className="text-yellow-800 text-sm">Building trust through honest practices</p>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            )
        },
        'about-team': {
            title: 'Team',
            content: (
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">Our Team</h1>
                    <p className="text-gray-700 mb-6">Meet the talented professionals behind Mobiloitte's success in AI and technology innovation.</p>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Leadership Team</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div className="bg-white p-6 rounded-lg border border-gray-200">
                                <div className="text-center">
                                    <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-10 h-10 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">CEO & Founder</h3>
                                    <p className="text-gray-600 text-sm">Leading strategic vision and company growth</p>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-lg border border-gray-200">
                                <div className="text-center">
                                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-10 h-10 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">CTO</h3>
                                    <p className="text-gray-600 text-sm">Driving technology innovation and development</p>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-lg border border-gray-200">
                                <div className="text-center">
                                    <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-10 h-10 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Head of AI</h3>
                                    <p className="text-gray-600 text-sm">Leading AI research and development</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Development Team</h2>
                        <div className="bg-blue-50 p-6 rounded-lg">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h3 className="text-lg font-semibold text-blue-900 mb-3">Frontend Developers</h3>
                                    <ul className="text-blue-800 space-y-2 text-sm">
                                        <li>• React.js specialists</li>
                                        <li>• Next.js experts</li>
                                        <li>• UI/UX focused</li>
                                        <li>• Responsive design</li>
                                    </ul>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-blue-900 mb-3">Backend Developers</h3>
                                    <ul className="text-blue-800 space-y-2 text-sm">
                                        <li>• Node.js developers</li>
                                        <li>• Database experts</li>
                                        <li>• API specialists</li>
                                        <li>• Security focused</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">AI & ML Team</h2>
                        <div className="bg-green-50 p-6 rounded-lg">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h3 className="text-lg font-semibold text-green-900 mb-3">Machine Learning Engineers</h3>
                                    <ul className="text-green-800 space-y-2 text-sm">
                                        <li>• Model development</li>
                                        <li>• Data preprocessing</li>
                                        <li>• Algorithm optimization</li>
                                        <li>• Performance tuning</li>
                                    </ul>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-green-900 mb-3">AI Researchers</h3>
                                    <ul className="text-green-800 space-y-2 text-sm">
                                        <li>• Natural language processing</li>
                                        <li>• Computer vision</li>
                                        <li>• Deep learning</li>
                                        <li>• AI ethics</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            )
        },
        'about-contact': {
            title: 'Contact',
            content: (
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">Contact Us</h1>
                    <p className="text-gray-700 mb-6">Get in touch with our team for inquiries, support, or collaboration opportunities.</p>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Contact Information</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-blue-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-blue-900 mb-3">General Inquiries</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center">
                                        <svg className="w-5 h-5 text-blue-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                                            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                                        </svg>
                                        <span className="text-blue-800">info@Mobiloitte.com</span>
                                    </div>
                                    <div className="flex items-center">
                                        <svg className="w-5 h-5 text-blue-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                                        </svg>
                                        <span className="text-blue-800">+1 (555) 123-4567</span>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-green-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-green-900 mb-3">Technical Support</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center">
                                        <svg className="w-5 h-5 text-green-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                                        </svg>
                                        <span className="text-green-800">support@Mobiloitte.com</span>
                                    </div>
                                    <div className="flex items-center">
                                        <svg className="w-5 h-5 text-green-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                        </svg>
                                        <span className="text-green-800">24/7 Support Available</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Office Locations</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-purple-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-purple-900 mb-3">Headquarters</h3>
                                <div className="space-y-2 text-purple-800">
                                    <p className="font-medium">Mobiloitte Technologies</p>
                                    <p className="text-sm">123 Innovation Drive</p>
                                    <p className="text-sm">Tech Valley, CA 94000</p>
                                    <p className="text-sm">United States</p>
                                </div>
                            </div>
                            <div className="bg-orange-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-orange-900 mb-3">Development Center</h3>
                                <div className="space-y-2 text-orange-800">
                                    <p className="font-medium">Mobiloitte India</p>
                                    <p className="text-sm">456 Tech Park</p>
                                    <p className="text-sm">Bangalore, KA 560001</p>
                                    <p className="text-sm">India</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Business Hours</h2>
                        <div className="bg-gray-50 p-6 rounded-lg">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Monday - Friday</h3>
                                    <p className="text-gray-700">9:00 AM - 6:00 PM (PST)</p>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Weekend Support</h3>
                                    <p className="text-gray-700">10:00 AM - 4:00 PM (PST)</p>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            )
        },
        'integration-connectors': {
            title: 'Connectors',
            content: (
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">Connectors</h1>
                    <p className="text-gray-700 mb-6">Connect your external services securely. Use Connect to authorize an integration or Remove to unlink it.</p>

                    <section className="mb-6">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Toolbar</h2>
                        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                            <li>• <strong>Add Integration:</strong> Opens a catalog to add new services.</li>
                            <li>• Existing cards show a short description with Connect and Remove actions.</li>
                        </ul>
                    </section>

                    <section className="mb-6">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">How "Connect" works</h2>
                        <ol className="list-decimal pl-6 text-sm text-gray-700 dark:text-gray-300 space-y-1">
                            <li><strong>Start:</strong> Click Connect on a card (e.g., Google Drive).</li>
                            <li><strong>Authorize:</strong> You are redirected to the provider (OAuth/API key). Grant the requested scopes.</li>
                            <li><strong>Finish:</strong> After success, the connection is saved and tokens are stored securely.</li>
                        </ol>
                        <p className="text-xs text-gray-500 mt-2">Tip: Grant only the minimum scopes (read vs write) you really need.</p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Available Connectors</h2>
                        <div className="bg-white rounded-lg border p-4">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Catalog (examples)</h3>
                            <ul className="text-sm text-gray-700 grid md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-1">
                                <li>• <strong>Mailchimp:</strong> Marketing email campaigns; import/export contact lists.</li>
                                <li>• <strong>Google Drive:</strong> Read documents for knowledge; optional file export.</li>
                                <li>• <strong>Asana:</strong> Create/read tasks for automation and reporting.</li>
                                <li>• <strong>Intercom:</strong> Sync users and conversations for unified support.</li>
                                <li>• <strong>Dropbox:</strong> Similar to Drive; read files for search/knowledge.</li>
                                <li>• <strong>Shopify:</strong> Orders/products sync for commerce workflows.</li>
                                <li>• <strong>WooCommerce:</strong> WordPress store data sync.</li>
                                <li>• <strong>AWS:</strong> Access S3 or other services via keys/roles.</li>
                                <li>• <strong>MongoDB:</strong> Read/write collections for app data.</li>
                            </ul>

                            <h3 className="font-semibold text-gray-900 mt-4 mb-2">Card actions</h3>
                            <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                                <li>• <strong>Connect:</strong> Starts OAuth or API‑key authorization to link the service.</li>
                                <li>• <strong>Remove:</strong> Revokes tokens and disconnects the service safely.</li>
                            </ul>
                        </div>
                    </section>

                    <section className="mb-6">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Manage connections</h2>
                        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                            <li>• <strong>Scopes & Roles:</strong> Adjust provider-side permissions if access is denied.</li>
                            <li>• <strong>Re‑authenticate:</strong> If a token expires, click Connect again to refresh.</li>
                            <li>• <strong>Data sync:</strong> Configure sync direction and schedule in each app's settings.</li>
                        </ul>
                    </section>

                    <section className="mb-6">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Troubleshooting</h2>
                        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                            <li>• Check provider status and your account role (Admin vs Member).</li>
                            <li>• Ensure redirects are allowed; clear ad‑blockers for OAuth popups.</li>
                            <li>• Verify API keys/secret values and IP allowlists where required.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Best practices</h2>
                        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                            <li>• Grant least‑privilege scopes when authorizing.</li>
                            <li>• Rotate API keys regularly and remove unused connections.</li>
                            <li>• Verify data sync direction and access (read vs write) before enabling.</li>
                            <li>• Use separate sandbox accounts to test changes safely.</li>
                        </ul>
                    </section>
                </div>
            )
        }
    };

    return (
        <div className={`h-screen overflow-hidden bg-gray-50 dark:bg-gray-900 ${inter.className} leading-7 text-gray-800 dark:text-gray-200 [&_code]:font-mono [&_h1]:tracking-tight [&_h1]:font-extrabold [&_h1]:text-4xl md:[&_h1]:text-5xl [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:text-xl [&_h3]:italic [&_h3]:text-gray-700 dark:[&_h3]:text-gray-300`}>
            {/* Mobile top bar */}
            <div className="md:hidden flex items-center justify-between px-3 py-2 border-b bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 sticky top-0 z-50">
                <button
                    aria-label="Toggle menu"
                    className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600"
                    onClick={() => setSidebarVisible(!sidebarVisible)}
                >
                    <svg className="w-6 h-6 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
                </button>
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">Documentation</div>
                <span className="w-6" />
            </div>

            {/* Mobile overlay when sidebar open */}
            {sidebarVisible && (
                <div className="fixed inset-0 bg-black/30 z-40 md:hidden" onClick={() => setSidebarVisible(false)} />
            )}

            {/* Desktop knowledge base style header */}
            <div className="hidden md:block sticky top-0 z-40 bg-white/80 dark:bg-gray-800/80 backdrop-blur border-b border-gray-200 dark:border-gray-700">
                <div className="max-w-7xl mx-auto px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                        {/* Brand removed per request */}
                        <div className="flex items-center gap-2" />
                        {/* Search */}
                        <div className="flex-1 max-w-2xl">
                            <input
                                type="text"
                                placeholder="Search documentation..."
                                aria-label="Search knowledge base"
                                className="w-full px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value)
                                    setIsSearchOpen(true)
                                    setActiveSuggestion(-1)
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        const q = searchQuery.trim().toLowerCase()
                                        if (!q) return
                                        const byTitle = suggestions.find(([key, val]: any) => (val?.title || key).toLowerCase().includes(q))
                                        const matchKey = (byTitle?.[0]) || (docEntries.find(([key]) => key.toLowerCase().includes(q))?.[0])
                                        if (isSearchOpen && activeSuggestion >= 0) {
                                            const keys = suggestions.map(([k]) => k as string)
                                            const sel = keys[activeSuggestion]
                                            if (sel) {
                                                handleSectionChange(sel)
                                                setIsSearchOpen(false)
                                                window.scrollTo({ top: 0, behavior: 'smooth' })
                                                return
                                            }
                                        } else if (matchKey) {
                                            handleSectionChange(matchKey)
                                            setIsSearchOpen(false)
                                            window.scrollTo({ top: 0, behavior: 'smooth' })
                                        }
                                    } else if (e.key === 'ArrowDown') {
                                        e.preventDefault()
                                        setIsSearchOpen(true)
                                        setActiveSuggestion((prev) => Math.min(prev + 1, Math.max(suggestions.length - 1, 0)))
                                    } else if (e.key === 'ArrowUp') {
                                        e.preventDefault()
                                        setActiveSuggestion((prev) => Math.max(prev - 1, -1))
                                    } else if (e.key === 'Escape') {
                                        setIsSearchOpen(false)
                                    }
                                }}
                            />
                            {isSearchOpen && searchQuery.trim() && (
                                <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-full max-w-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
                                    <ul className="max-h-64 overflow-y-auto">
                                        {suggestions.map(([key, val]: any, idx: number) => (
                                            <li key={key}>
                                                <button
                                                    className={`w-full text-left px-4 py-2.5 text-sm transition ${activeSuggestion === idx ? 'bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                                                    onMouseEnter={() => setActiveSuggestion(idx)}
                                                    onClick={() => {
                                                        handleSectionChange(key)
                                                        setIsSearchOpen(false)
                                                        window.scrollTo({ top: 0, behavior: 'smooth' })
                                                    }}
                                                >
                                                    <span className="font-medium text-gray-900 dark:text-gray-100">{val?.title || key}</span>
                                                    <span className="ml-2 text-xs text-gray-500">/{key}</span>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                        {/* Actions */}
                        {/* <div className="flex items-center gap-2">

                            <a href="/(full-width-pages)/(auth)/signin" className="inline-flex items-center h-[38px] px-3 rounded-full text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition">Sign In</a>
                            <button className="inline-flex items-center h-[38px] px-4 rounded-full bg-blue-600 text-white text-sm shadow-sm hover:bg-blue-700 transition">Sign Up Free</button>
                        </div> */}
                    </div>

                </div>
            </div>


            {/* Main Content */}
            <div className="max-w-7xl mx-auto flex h-full">
                {/* Left Sidebar - Fixed */}
                <aside className={`${sidebarVisible ? 'fixed z-50 left-0 top-0 h-full w-56 md:static md:w-52' : 'hidden md:block md:w-52'} bg-white dark:bg-gray-800 md:bg-transparent md:dark:bg-transparent overflow-y-auto shadow-xl md:shadow-xl [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden transition-all duration-300 ease-in-out dark:text-gray-100`} style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    <div className="p-4">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 tracking-wide">Documentation</h3>
                        <nav className="space-y-0">
                            {/* Home */}
                            <button
                                onClick={() => handleSectionChange('home')}
                                className={`w-full flex items-center px-1 py-1 text-sm font-medium rounded-none transition-colors border border-transparent ${activeSection === 'home'
                                        ? 'text-gray-900 dark:text-gray-100'
                                        : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:underline'
                                    }`}
                            >
                                <svg className="w-5 h-5 mr-2 text-gray-600 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                                </svg>
                                <span>Home</span>
                            </button>

                            {/* FAQ quick link */}
                            <button onClick={() => handleSectionChange('faq')} className={`w-full flex items-center px-1 py-1 text-sm font-medium rounded-none transition-colors border border-transparent ${activeSection === 'faq' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:underline'}`}>
                                <svg className="w-5 h-5 mr-2 text-gray-600 dark:text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                    <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9 8a1 1 0 112 0c0 .723-.38 1.104-1.2 1.6-.74.45-1.3.79-1.3 1.9V12h2v-.3c0-.38.16-.54.8-.93.99-.61 1.7-1.32 1.7-2.77a3 3 0 10-6 0h2zM9 14h2v2H9v-2z" />
                                </svg>
                                <span>FAQ</span>
                            </button>

                            {/* Dashboards - expanded */}
                            <div className="pt-0 space-y-0">
                                <div className="text-[11px] uppercase tracking-wider text-gray-900 dark:text-gray-100 pl-0 pr-2 font-bold flex items-center gap-1.5">
                                    <svg className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 3h5a1 1 0 011 1v5a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1zm7 0h5a1 1 0 011 1v2a1 1 0 01-1 1h-5a1 1 0 01-1-1V4a1 1 0 011-1zM3 12a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H4a1 1 0 01-1-1v-5zm8-1h5a1 1 0 011 1v5a1 1 0 01-1 1h-5a1 1 0 01-1-1v-5a1 1 0 011-1z" /></svg>
                                    <span>Dashboards</span>
                                </div>
                                <button onClick={() => handleSectionChange('dashboard-overview')} className={`w-full text-left px-2 py-1 text-sm rounded-none transition-colors before:content-['•'] before:text-gray-400 dark:before:text-gray-500 before:mr-1 before:inline-block ${activeSection === 'dashboard-overview' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:underline'}`}>Overview</button>
                                <button onClick={() => handleSectionChange('dashboard-leads')} className={`w-full text-left px-2 py-1 text-sm rounded-none transition-colors before:content-['•'] before:text-gray-400 dark:before:text-gray-500 before:mr-1 before:inline-block ${activeSection === 'dashboard-leads' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:underline'}`}>Leads Dashboard</button>
                                <button onClick={() => handleSectionChange('dashboard-recruitment')} className={`w-full text-left px-2 py-1 text-sm rounded-none transition-colors before:content-['•'] before:text-gray-400 dark:before:text-gray-500 before:mr-1 before:inline-block ${activeSection === 'dashboard-recruitment' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:underline'}`}>Recruitment Dashboard</button>
                                <button onClick={() => handleSectionChange('dashboard-chat')} className={`w-full text-left px-2 py-1 text-sm rounded-none transition-colors before:content-['•'] before:text-gray-400 dark:before:text-gray-500 before:mr-1 before:inline-block ${activeSection === 'dashboard-chat' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:underline'}`}>Chat Dashboard</button>
                                <button onClick={() => handleSectionChange('dashboard-helpdesk')} className={`w-full text-left px-2 py-1 text-sm rounded-none transition-colors before:content-['•'] before:text-gray-400 dark:before:text-gray-500 before:mr-1 before:inline-block ${activeSection === 'dashboard-helpdesk' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:underline'}`}>Helpdesk Dashboard</button>
                            </div>

                            {/* Knowledge Hub - expanded */}
                            <div className="pt-0 space-y-0">
                                <div className="text-[11px] uppercase tracking-wider text-gray-900 dark:text-gray-100 pl-0 pr-2 font-bold flex items-center gap-1.5">
                                    <svg className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path d="M2 5a2 2 0 012-2h6l2 2h4a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V5z" /></svg>
                                    <span>Knowledge Hub</span>
                                </div>
                                <button onClick={() => handleSectionChange('knowledge-guests')} className={`w-full text-left px-2 py-1 text-sm rounded-none transition-colors before:content-['•'] before:text-gray-400 dark:before:text-gray-500 before:mr-1 before:inline-block ${activeSection === 'knowledge-guests' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:underline'}`}>Guests</button>
                                <button onClick={() => handleSectionChange('knowledge-customer')} className={`w-full text-left px-2 py-1 text-sm rounded-none transition-colors before:content-['•'] before:text-gray-400 dark:before:text-gray-500 before:mr-1 before:inline-block ${activeSection === 'knowledge-customer' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:underline'}`}>Customer</button>
                                <button onClick={() => handleSectionChange('knowledge-employee')} className={`w-full text-left px-2 py-1 text-sm rounded-none transition-colors before:content-['•'] before:text-gray-400 dark:before:text-gray-500 before:mr-1 before:inline-block ${activeSection === 'knowledge-employee' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:underline'}`}>Employee</button>
                            </div>



                            {/* Lead Management - expanded */}
                            <div className="pt-0 space-y-0">
                                <div className="text-[11px] uppercase tracking-wider text-gray-900 dark:text-gray-100 pl-0 pr-2 font-bold flex items-center gap-1.5">
                                    <svg className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v3H3V4zm0 5h16v2H3V9zm0 4h10a1 1 0 010 2H3v-2z" /></svg>
                                    <span>Lead Management</span>
                                </div>
                                <button onClick={() => handleSectionChange('lead-management')} className={`w-full text-left px-2 py-1 text-sm rounded-none transition-colors before:content-['•'] before:text-gray-400 dark:before:text-gray-500 before:mr-1 before:inline-block ${activeSection === 'lead-management' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:underline'}`}>Leads</button>
                                <button onClick={() => handleSectionChange('lead-settings')} className={`w-full text-left px-2 py-1 text-sm rounded-none transition-colors before:content-['•'] before:text-gray-400 dark:before:text-gray-500 before:mr-1 before:inline-block ${activeSection === 'lead-settings' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:underline'}`}>Settings</button>
                            </div>

                            {/* Helpdesk - expanded */}
                            <div className="pt-0 space-y-0">
                                <div className="text-[11px] uppercase tracking-wider text-gray-900 dark:text-gray-100 pl-0 pr-2 font-bold flex items-center gap-1.5">
                                    <svg className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path d="M18 8a6 6 0 10-12 0v3a3 3 0 003 3h1v2a1 1 0 001.447.894L14 15h1a3 3 0 003-3V8zM8 8a4 4 0 118 0v3a1 1 0 01-1 1h-5a1 1 0 01-1-1V8z" /></svg>
                                    <span>Helpdesk</span>
                                </div>
                                <button onClick={() => handleSectionChange('helpdesk-customer')} className={`w-full text-left px-2 py-1 text-sm rounded-none transition-colors before:content-['•'] before:text-gray-400 dark:before:text-gray-500 before:mr-1 before:inline-block ${activeSection === 'helpdesk-customer' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:underline'}`}>Customer Ticket</button>
                                <button onClick={() => handleSectionChange('helpdesk-employee')} className={`w-full text-left px-2 py-1 text-sm rounded-none transition-colors before:content-['•'] before:text-gray-400 dark:before:text-gray-500 before:mr-1 before:inline-block ${activeSection === 'helpdesk-employee' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:underline'}`}>Employee Ticket</button>
                                <button onClick={() => handleSectionChange('helpdesk-settings')} className={`w-full text-left px-2 py-1 text-sm rounded-none transition-colors before:content-['•'] before:text-gray-400 dark:before:text-gray-500 before:mr-1 before:inline-block ${activeSection === 'helpdesk-settings' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:underline'}`}>Settings</button>
                            </div>

                            {/* Recruitment Center - expanded */}
                            <div className="pt-0 space-y-0">
                                <div className="text-[11px] uppercase tracking-wider text-gray-900 dark:text-gray-100 pl-0 pr-2 font-bold flex items-center gap-1.5">
                                    <svg className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3a3 3 0 110 6 3 3 0 010-6zM3 16a7 7 0 1114 0H3z" /></svg>
                                    <span>Recruitment Center</span>
                                </div>
                                <button onClick={() => handleSectionChange('recruitment-applications')} className={`w-full text-left px-2 py-1 text-sm rounded-none transition-colors before:content-['•'] before:text-gray-400 dark:before:text-gray-500 before:mr-1 before:inline-block ${activeSection === 'recruitment-applications' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:underline'}`}>Applicants</button>
                                <button onClick={() => handleSectionChange('recruitment-settings')} className={`w-full text-left px-2 py-1 text-sm rounded-none transition-colors before:content-['•'] before:text-gray-400 dark:before:text-gray-500 before:mr-1 before:inline-block ${activeSection === 'recruitment-settings' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:underline'}`}>Settings</button>
                            </div>

                            {/* Integration Center - expanded */}
                            <div className="pt-0 space-y-0">
                                <div className="text-[11px] uppercase tracking-wider text-gray-900 dark:text-gray-100 pl-0 pr-2 font-bold flex items-center gap-1.5">
                                    <svg className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path d="M7 3a3 3 0 000 6h6a3 3 0 100-6H7zm9 8H4a2 2 0 100 4h12a2 2 0 100-4z" /></svg>
                                    <span>Integration Center</span>
                                </div>
                                <button onClick={() => handleSectionChange('integration-connectors')} className={`w-full text-left px-2 py-1 text-sm rounded-none transition-colors before:content-['•'] before:text-gray-400 dark:before:text-gray-500 before:mr-1 before:inline-block ${activeSection === 'integration-connectors' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:underline'}`}>Connectors</button>
                                <button onClick={() => handleSectionChange('integration-whatsapp')} className={`w-full text-left px-2 py-1 text-sm rounded-none transition-colors before:content-['•'] before:text-gray-400 dark:before:text-gray-500 before:mr-1 before:inline-block ${activeSection === 'integration-whatsapp' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:underline'}`}>WhatsApp Integration</button>
                            </div>

                            {/* Controls - expanded */}
                            <div className="pt-0 space-y-0">
                                <div className="text-[11px] uppercase tracking-wider text-gray-900 dark:text-gray-100 pl-0 pr-2 font-bold flex items-center gap-1.5">
                                    <svg className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 6h12v2H4V6zm0 4h12v2H4v-2zm0 4h12v2H4v-2z" /></svg>
                                    <span>Controls</span>
                                </div>
                                <button onClick={() => handleSectionChange('controls-bot-settings')} className={`w-full text-left px-2 py-1 text-sm rounded-none transition-colors before:content-['•'] before:text-gray-400 dark:before:text-gray-500 before:mr-1 before:inline-block ${activeSection === 'controls-bot-settings' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:underline'}`}>Bot Settings</button>
                                <button onClick={() => handleSectionChange('controls-billing')} className={`w-full text-left px-2 py-1 text-sm rounded-none transition-colors before:content-['•'] before:text-gray-400 dark:before:text-gray-500 before:mr-1 before:inline-block ${activeSection === 'controls-billing' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:underline'}`}>Billing</button>
                                <button onClick={() => handleSectionChange('controls-email')} className={`w-full text-left px-2 py-1 text-sm rounded-none transition-colors before:content-['•'] before:text-gray-400 dark:before:text-gray-500 before:mr-1 before:inline-block ${activeSection === 'controls-email' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:underline'}`}>Email Settings</button>
                                <button onClick={() => handleSectionChange('controls-chat-inbox')} className={`w-full text-left px-2 py-1 text-sm rounded-none transition-colors before:content-['•'] before:text-gray-400 dark:before:text-gray-500 before:mr-1 before:inline-block ${activeSection === 'controls-chat-inbox' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:underline'}`}>Chat Inbox</button>
                                <button onClick={() => handleSectionChange('controls-prompts')} className={`w-full text-left px-2 py-1 text-sm rounded-none transition-colors before:content-['•'] before:text-gray-400 dark:before:text-gray-500 before:mr-1 before:inline-block ${activeSection === 'controls-prompts' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:underline'}`}>AI Prompts</button>
                                <button onClick={() => handleSectionChange('controls-status')} className={`w-full text-left px-2 py-1 text-sm rounded-none transition-colors before:content-['•'] before:text-gray-400 dark:before:text-gray-500 before:mr-1 before:inline-block ${activeSection === 'controls-status' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:underline'}`}>System Status</button>
                                <button onClick={() => handleSectionChange('controls-dashboard-settings')} className={`w-full text-left px-2 py-1 text-sm rounded-none transition-colors before:content-['•'] before:text-gray-400 dark:before:text-gray-500 before:mr-1 before:inline-block ${activeSection === 'controls-dashboard-settings' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:underline'}`}>Dashboard Settings</button>
                                <button onClick={() => handleSectionChange('controls-users')} className={`w-full text-left px-2 py-1 text-sm rounded-none transition-colors before:content-['•'] before:text-gray-400 dark:before:text-gray-500 before:mr-1 before:inline-block ${activeSection === 'controls-users' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:underline'}`}>Manage Users</button>
                            </div>

                            {/* Version - expanded */}
                            <div className="pt-0 space-y-0">
                                <div className="text-[11px] uppercase tracking-wider text-gray-900 dark:text-gray-100 pl-0 pr-2 font-bold flex items-center gap-1.5">
                                    <svg className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 4a1 1 0 10-2 0v4a1 1 0 00.293.707l2.5 2.5a1 1 0 101.414-1.414L11 9.586V6z" /></svg>
                                    <span>Version</span>
                                </div>
                                <button onClick={() => handleSectionChange('version')} className={`w-full text-left px-2 py-1 text-sm rounded-none transition-colors before:content-['•'] before:text-gray-400 dark:before:text-gray-500 before:mr-1 before:inline-block ${activeSection === 'version' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:underline'}`}>Version 1.0</button>
                            </div>

                            {/* About - expanded */}
                            <div className="pt-0 space-y-0">
                                <div className="text-[11px] uppercase tracking-wider text-gray-900 dark:text-gray-100 pl-0 pr-2 font-bold flex items-center gap-1.5">
                                    <svg className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11H9v-2h2v2zm0-4H9V5h2v4z" /></svg>
                                    <span>About</span>
                                </div>
                                <button onClick={() => handleSectionChange('about-company')} className={`w-full text-left px-2 py-1 text-sm rounded-none transition-colors before:content-['•'] before:text-gray-400 dark:before:text-gray-500 before:mr-1 before:inline-block ${activeSection === 'about-company' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:underline'}`}>Company Info</button>
                                <button onClick={() => handleSectionChange('about-team')} className={`w-full text-left px-2 py-1 text-sm rounded-none transition-colors before:content-['•'] before:text-gray-400 dark:before:text-gray-500 before:mr-1 before:inline-block ${activeSection === 'about-team' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:underline'}`}>Team</button>
                                <button onClick={() => handleSectionChange('about-contact')} className={`w-full text-left px-2 py-1 text-sm rounded-none transition-colors before:content-['•'] before:text-gray-400 dark:before:text-gray-500 before:mr-1 before:inline-block ${activeSection === 'about-contact' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:underline'}`}>Contact</button>
                            </div>
                        </nav>
                    </div>
                </aside>

                {/* Main Content Area */}
                <main
                    className="flex-1 overflow-y-auto no-scrollbar bg-white dark:bg-gray-900 dark:text-gray-100"
                >
                    <div id="doc-content" className="p-8 dark:text-gray-100 
                   dark:[&_p]:text-gray-200 dark:[&_li]:text-gray-200 dark:[&_ul]:text-gray-200 dark:[&_ol]:text-gray-200 dark:[&_small]:text-gray-400 
                   dark:[&_h1]:text-gray-100 dark:[&_h2]:text-gray-100 dark:[&_h3]:text-gray-100 dark:[&_h4]:text-gray-100 dark:[&_h5]:text-gray-100 dark:[&_h6]:text-gray-100 dark:[&_strong]:text-gray-100 
                   dark:[&_.bg-white]:!bg-gray-800 dark:[&_.bg-gray-50]:!bg-gray-800 dark:[&_.bg-gray-100]:!bg-gray-800 
                   dark:[&_.bg-blue-50]:!bg-blue-900/15 dark:[&_.text-blue-800]:!text-blue-200 dark:[&_.text-blue-900]:!text-blue-200 
                   dark:[&_.bg-green-50]:!bg-green-900/15 dark:[&_.text-green-800]:!text-green-200 dark:[&_.text-green-900]:!text-green-200 
                   dark:[&_.bg-yellow-50]:!bg-yellow-900/15 dark:[&_.text-yellow-800]:!text-yellow-200 dark:[&_.text-yellow-900]:!text-yellow-200 
                   dark:[&_.bg-red-50]:!bg-red-900/15 dark:[&_.text-red-800]:!text-red-200 dark:[&_.text-red-900]:!text-red-200 
                   dark:[&_.bg-purple-50]:!bg-purple-900/15 dark:[&_.text-purple-800]:!text-purple-200 dark:[&_.text-purple-900]:!text-purple-200 
                   dark:[&_.bg-pink-50]:!bg-pink-900/15 dark:[&_.text-pink-800]:!text-pink-200 dark:[&_.text-pink-900]:!text-pink-200 
                   dark:[&_.bg-indigo-50]:!bg-indigo-900/15 dark:[&_.text-indigo-800]:!text-indigo-200 dark:[&_.text-indigo-900]:!text-indigo-200 
                   dark:[&_.bg-orange-50]:!bg-orange-900/15 dark:[&_.text-orange-800]:!text-orange-200 dark:[&_.text-orange-900]:!text-orange-200 
                   dark:[&_.bg-teal-50]:!bg-teal-900/15 dark:[&_.text-teal-800]:!text-teal-200 dark:[&_.text-teal-900]:!text-teal-200 
                   dark:[&_.border-gray-200]:!border-gray-700 dark:[&_.border-gray-300]:!border-gray-700 dark:[&_.text-gray-600]:!text-gray-300 dark:[&_.text-gray-700]:!text-gray-200">
                        {(documentationContent as Record<string, { title: string; content: ReactNode }>)[activeSection]?.content || (
                            <div className="text-center text-gray-500 dark:text-gray-400 py-12">
                                <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Welcome to Documentation</h2>
                                <p>Select a section from the sidebar to view its documentation.</p>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    )
}
