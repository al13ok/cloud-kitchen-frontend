"use client";
import React, { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Script from "next/script";

// Type declarations for chatbot widget
declare global {
  interface Window {
    MobiloliteWidgetNew?: new (config?: unknown) => {
      close: () => void;
    };
    mobiloliteWidgetNew?: {
      close: () => void;
    };
    MobiloliteConfigNew?: unknown;
    API_BASE_URL?: string;
  }
}

const DemoPage = () => {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const supportingRef = useRef<HTMLDivElement>(null);

  // Static taglines for display
  const taglines = [
    "Smarter Conversations. Stronger Connections.",
    "AI that Works for Your People and Your Business.",
    "One Agent. Infinite Possibilities.",
  ];

  // Feature data with icons
  const features = [
    {
      title: "Proactive Intelligence",
      description: "anticipates needs before you even ask.",
      icon: "💡"
    },
    {
      title: "For Everyone",
      description: "one AI agent serving employees, clients, customers, and guest users alike.",
      icon: "🌍"
    },
    {
      title: "Multimodal Power",
      description: "understands text, voice, and more to deliver natural, human-like interactions.",
      icon: "🎤"
    },
    {
      title: "Always On, Always Learning",
      description: "adapts to your business, grows with your conversations.",
      icon: "🔄"
    }
  ];

  // Demo prompts
  const demoPrompts = [
    "Ask about Pricing",
    "Explore Integrations",
    "Check Support",
    "Schedule a Demo"
  ];

  // Testimonials
  const testimonials = [
    {
      quote: "Converiqo reduced our response time by 40% and improved customer satisfaction significantly.",
      author: "Sarah Chen",
      role: "Head of Customer Success, TechCorp"
    },
    {
      quote: "The AI understands context like a human agent. Our team productivity has doubled.",
      author: "Michael Rodriguez",
      role: "VP Operations, InnovateLabs"
    },
    {
      quote: "Seamless integration with our existing systems. ROI was visible within the first month.",
      author: "Emily Watson",
      role: "CTO, DataFlow Solutions"
    }
  ];

  // How it works steps
  const howItWorks = [
    {
      step: "1",
      title: "Connect",
      description: "Integrate with your existing systems in minutes",
      icon: "🔗"
    },
    {
      step: "2",
      title: "Configure",
      description: "Customize AI responses to match your brand voice",
      icon: "⚙️"
    },
    {
      step: "3",
      title: "Go Live",
      description: "Deploy across all customer touchpoints instantly",
      icon: "🚀"
    }
  ];

  // Security features
  const securityFeatures = [
    { name: "GDPR Compliant", icon: "🛡️" },
    { name: "SOC 2 Certified", icon: "🔒" },
    { name: "SSO Integration", icon: "🔑" },
    { name: "End-to-End Encryption", icon: "🔐" }
  ];

  // Intersection Observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (heroRef.current) {
      observer.observe(heroRef.current);
    }
    if (featuresRef.current) {
      observer.observe(featuresRef.current);
    }
    if (supportingRef.current) {
      observer.observe(supportingRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Dark mode toggle
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  // Initialize chatbot widget after script loads
  useEffect(() => {
    if (pathname === '/demo' && window.MobiloliteWidgetNew && !window.mobiloliteWidgetNew) {
      // Initialize widget if script is loaded and widget not already initialized
      window.mobiloliteWidgetNew = new window.MobiloliteWidgetNew(window.MobiloliteConfigNew || {});
      console.log('Chatbot widget initialized');
    }

    // Cleanup function
    return () => {
      // Clean up widget instance on unmount
      if (window.mobiloliteWidgetNew) {
        try {
          window.mobiloliteWidgetNew.close();
        } catch (e) {
          console.warn('Error closing widget:', e);
        }
      }
      // Remove chatbot DOM elements
      const chatbotElements = document.querySelectorAll('[class*="mobilolite"]');
      chatbotElements.forEach(element => element.remove());
    };
  }, [pathname]);
  // Set API base URL for session tracker
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'https://py-mobiloitte.converiqo.ai';
      window.API_BASE_URL = apiBaseUrl.replace(/\/+$/, ''); // Remove trailing slashes

      // Also set as meta tag for session tracker
      let metaTag = document.querySelector('meta[name="api-base-url"]');
      if (!metaTag) {
        metaTag = document.createElement('meta');
        metaTag.setAttribute('name', 'api-base-url');
        document.head.appendChild(metaTag);
      }
      metaTag.setAttribute('content', window.API_BASE_URL);
    }
  }, []);

  return (
    <>
      {/* Set API base URL meta tag */}
      <meta name="api-base-url" content={process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'https://py-mobiloitte.converiqo.ai'} />

      {/* Load session tracker script - must load first */}
      {pathname === '/demo' && (
        <Script
          src="/enhanced-session-tracker.js"
          strategy="afterInteractive"
          onLoad={() => {
            console.log('Session tracker loaded successfully on demo page');
            console.log('API Endpoint:', window.API_BASE_URL || 'not set');
          }}
          onError={(error) => {
            console.error('Failed to load session tracker:', error);
          }}
        />
      )}
      {/* Load chatbot script using Next.js Script component */}
      {pathname === '/demo' && (
        <Script
          src="/chatbot-new.bundle.js"
          strategy="afterInteractive"
          onLoad={() => {
            console.log('Chatbot bundle loaded successfully on demo page');
            // Initialize widget if not already initialized
            if (window.MobiloliteWidgetNew && !window.mobiloliteWidgetNew) {
              window.mobiloliteWidgetNew = new window.MobiloliteWidgetNew(window.MobiloliteConfigNew || {});
            }
          }}
          onError={(error) => {
            console.error('Failed to load chatbot bundle:', error);
          }}
        />
      )}

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        @keyframes float-reverse {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(20px) rotate(-5deg); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(3deg); }
        }
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(30px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in-left {
          0% { opacity: 0; transform: translateX(-50px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes fade-in-right {
          0% { opacity: 0; transform: translateX(50px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.3); }
          50% { box-shadow: 0 0 40px rgba(59, 130, 246, 0.6), 0 0 60px rgba(59, 130, 246, 0.4); }
        }
        @keyframes particle-float {
          0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.4; }
          25% { transform: translateY(-30px) translateX(10px); opacity: 0.8; }
          50% { transform: translateY(-20px) translateX(-5px); opacity: 0.6; }
          75% { transform: translateY(-40px) translateX(15px); opacity: 0.9; }
        }
        
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-reverse { animation: float-reverse 8s ease-in-out infinite; }
        .animate-float-slow { animation: float-slow 10s ease-in-out infinite; }
        .animate-gradient-shift { 
          background-size: 200% 200%;
          animation: gradient-shift 8s ease infinite;
        }
        .animate-fade-in-up { animation: fade-in-up 1s ease-out; }
        .animate-fade-in-left { animation: fade-in-left 0.8s ease-out; }
        .animate-fade-in-right { animation: fade-in-right 0.8s ease-out; }
        .animate-pulse-glow { animation: pulse-glow 3s ease-in-out infinite; }
        .animate-particle-float { animation: particle-float 4s ease-in-out infinite; }
      `}</style>

      <div className={`min-h-screen relative overflow-hidden w-full transition-colors duration-500 font-['Inter'] ${isDarkMode ? 'dark' : ''}`}>
        {/* Animated Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900 animate-gradient-shift"></div>

        {/* Floating Background Elements */}
        <div className="absolute top-20 left-10 w-96 h-96 bg-blue-500/10 dark:bg-blue-400/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-purple-500/10 dark:bg-purple-400/20 rounded-full blur-3xl animate-float-reverse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-indigo-500/8 dark:bg-indigo-400/15 rounded-full blur-2xl animate-float-slow" style={{ animationDelay: '4s' }}></div>
        <div className="absolute top-1/3 right-1/4 w-48 h-48 bg-cyan-500/8 dark:bg-cyan-400/15 rounded-full blur-2xl animate-float-slow" style={{ animationDelay: '1s' }}></div>

        {/* Floating Particles */}
        <div className="absolute top-1/4 left-1/5 w-2 h-2 bg-blue-400/60 dark:bg-blue-300/80 rounded-full animate-particle-float"></div>
        <div className="absolute top-3/4 right-1/5 w-1 h-1 bg-purple-500/70 dark:bg-purple-400/90 rounded-full animate-particle-float" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 right-1/3 w-1.5 h-1.5 bg-indigo-500/50 dark:bg-indigo-400/70 rounded-full animate-particle-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-1/4 left-1/4 w-1 h-1 bg-cyan-500/60 dark:bg-cyan-400/80 rounded-full animate-particle-float" style={{ animationDelay: '3s' }}></div>

        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          className="fixed top-6 right-6 z-50 p-3 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-700 transition-all duration-300 shadow-lg"
        >
          {isDarkMode ? (
            <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>

        {/* Hero Section */}
        <section ref={heroRef} className="relative z-10 min-h-screen flex items-center justify-center px-8 py-16">
          <div className="max-w-7xl w-full">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Left Column - Text Content */}
              <div className="text-center lg:text-left">
                {/* Hero Headline */}
                <div className={`space-y-6 mb-8 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                  <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 dark:from-blue-400 dark:via-purple-400 dark:to-indigo-400 bg-clip-text text-transparent leading-tight animate-gradient-shift">
                    Converiqo: Where Every Chat Creates Value.
                  </h1>
                </div>

                {/* Sub-Headline */}
                <div className={`space-y-6 mb-12 transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                  <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-300 font-light leading-relaxed">
                    Converiqo is your true AI agent — proactive, intelligent, and multimodal — designed to engage seamlessly with guests, employees, clients, and customers.
                  </p>
                </div>

                {/* CTA Buttons */}
                <div className={`flex flex-col sm:flex-row gap-4 mb-8 transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                  <a
                    href="https://converiqo.ai/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 animate-pulse-glow"
                  >
                    Try the Demo
                    <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </a>
                  <a
                    href="https://converiqo.ai/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-gray-700 dark:text-gray-300 bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                  >
                    Book a Demo
                    <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </a>
                </div>

                {/* Back to Sign In Button */}
                <div className={`transition-all duration-1000 delay-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                  <Link
                    href="/signin"
                    className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors duration-300"
                  >
                    <svg className="mr-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to Sign In
                  </Link>
                </div>
              </div>

              {/* Right Column - Chatbot Preview */}
              <div className={`transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                <div className="relative">
                  {/* Chatbot Preview Window */}
                  <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {/* Chat Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-white rounded-full"></div>
                        <div className="w-3 h-3 bg-white/60 rounded-full"></div>
                        <div className="w-3 h-3 bg-white/60 rounded-full"></div>
                        <div className="ml-4 text-white font-semibold">Converiqo AI Assistant</div>
                      </div>
                    </div>

                    {/* Chat Messages */}
                    <div className="p-6 space-y-4 h-80 overflow-y-auto">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                          AI
                        </div>
                        <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl px-4 py-3 max-w-xs">
                          <p className="text-gray-800 dark:text-gray-200 text-sm">Hello! I&apos;m your AI assistant. How can I help you today?</p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3 justify-end">
                        <div className="bg-blue-600 text-white rounded-2xl px-4 py-3 max-w-xs">
                          <p className="text-sm">What can you help me with?</p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                          AI
                        </div>
                        <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl px-4 py-3 max-w-xs">
                          <p className="text-gray-800 dark:text-gray-200 text-sm">I can help with customer support, answer questions about your products, schedule meetings, and much more!</p>
                        </div>
                      </div>

                      {/* Typing Animation */}
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                          AI
                        </div>
                        <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl px-4 py-3">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Chat Input */}
                    <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                      <div className="flex items-center space-x-3">
                        <input
                          type="text"
                          placeholder="Type your message..."
                          className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled
                        />
                        <button className="bg-blue-600 text-white rounded-xl p-2 hover:bg-blue-700 transition-colors duration-200">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Floating Elements */}
                  <div className="absolute -top-4 -right-4 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-yellow-800 text-sm font-bold animate-bounce">
                    ✨
                  </div>
                  <div className="absolute -bottom-4 -left-4 w-6 h-6 bg-green-400 rounded-full flex items-center justify-center text-green-800 text-xs font-bold animate-pulse">
                    💬
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Cards Section */}
        <section ref={featuresRef} className="relative z-10 py-20 px-8">
          <div className="max-w-7xl mx-auto">
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              {features.map((feature, index) => (
                <div
                  key={index}
                  className={`group relative p-8 bg-white/60 dark:bg-gray-800/60 backdrop-blur-md rounded-3xl border border-white/20 dark:border-gray-700/30 hover:bg-white/80 dark:hover:bg-gray-800/80 hover:border-blue-300/50 dark:hover:border-blue-500/50 hover:scale-105 transition-all duration-500 shadow-lg hover:shadow-2xl hover:shadow-blue-500/20 dark:hover:shadow-blue-400/20 ${index % 2 === 0 ? 'animate-fade-in-left' : 'animate-fade-in-right'
                    }`}
                  style={{ animationDelay: `${index * 200}ms` }}
                >
                  {/* Icon */}
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center text-2xl mr-4 group-hover:scale-110 transition-transform duration-300">
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                      {feature.title}
                    </h3>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed mb-4">
                    {feature.description}
                  </p>

                  {/* Learn More Micro-copy */}
                  <div className="flex items-center text-blue-600 dark:text-blue-400 font-medium group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors duration-300">
                    <span className="text-sm">Learn More</span>
                    <svg className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>

                  {/* Hover Glow Effect */}
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Supporting Section */}
        <section ref={supportingRef} className="relative z-10 py-20 px-8">
          <div className="max-w-6xl mx-auto text-center">
            <div className={`space-y-8 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              {/* Main Heading with Gradient Accent */}
              <div className="relative">
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-800 dark:text-white mb-8">
                  From First Hello to Last Mile — AI That Delivers.
                </h2>
                <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500 rounded-full"></div>
              </div>

              {/* Divider */}
              <div className="flex justify-center items-center space-x-4 opacity-60">
                <div className="h-px w-24 bg-gradient-to-r from-transparent to-gray-400 dark:to-gray-600"></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <div className="w-1 h-1 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="w-1 h-1 bg-indigo-500 rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
                <div className="h-px w-24 bg-gradient-to-l from-transparent to-gray-400 dark:to-gray-600"></div>
              </div>

              {/* Taglines */}
              <div className="space-y-6">
                {taglines.map((tagline, index) => (
                  <p key={index} className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 font-light leading-relaxed">
                    {tagline}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Live Demo Preview Section */}
        <section className="relative z-10 py-20 px-8 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-800 dark:text-white mb-6">
                See Converiqo in Action
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
                Experience the power of AI conversations with our interactive demo
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Demo Prompts */}
              <div className="space-y-4">
                <h3 className="text-2xl font-semibold text-gray-800 dark:text-white mb-6">Try These Prompts:</h3>
                {demoPrompts.map((prompt, index) => (
                  <button
                    key={index}
                    className="w-full text-left p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-lg transition-all duration-300 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {prompt}
                      </span>
                      <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>

              {/* Demo Chat Window */}
              <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-white rounded-full"></div>
                    <div className="w-3 h-3 bg-white/60 rounded-full"></div>
                    <div className="w-3 h-3 bg-white/60 rounded-full"></div>
                    <div className="ml-4 text-white font-semibold">Live Demo</div>
                  </div>
                </div>

                <div className="p-6 space-y-4 h-64 overflow-y-auto">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      AI
                    </div>
                    <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl px-4 py-3 max-w-xs">
                      <p className="text-gray-800 dark:text-gray-200 text-sm">Hi! I&apos;m ready to help. What would you like to know?</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 justify-end">
                    <div className="bg-blue-600 text-white rounded-2xl px-4 py-3 max-w-xs">
                      <p className="text-sm">Ask about Pricing</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      AI
                    </div>
                    <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl px-4 py-3 max-w-xs">
                      <p className="text-gray-800 dark:text-gray-200 text-sm">Our pricing starts at $99/month for the starter plan. Would you like to see our full pricing structure?</p>
                    </div>
                  </div>

                  {/* Typing Animation */}
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      AI
                    </div>
                    <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl px-4 py-3">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trusted by Companies Section */}
        <section className="relative z-10 py-20 px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-white mb-6">
                Trusted by Leading Companies
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300">
                Join thousands of businesses already using Converiqo
              </p>
            </div>

            {/* Company Logos Placeholder */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 items-center justify-items-center mb-16">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="w-32 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <span className="text-gray-400 dark:text-gray-500 text-sm font-medium">Logo {i + 1}</span>
                </div>
              ))}
            </div>

            {/* Testimonials Carousel */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <div key={index} className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center mb-4">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                    &ldquo;{testimonial.quote}&rdquo;
                  </p>
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-white">{testimonial.author}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{testimonial.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="relative z-10 py-20 px-8 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-800 dark:text-white mb-6">
                How It Works
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
                Get started with Converiqo in three simple steps
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {howItWorks.map((step, index) => (
                <div key={index} className="text-center group">
                  <div className="relative mb-8">
                    <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-4xl mx-auto group-hover:scale-110 transition-transform duration-300">
                      {step.icon}
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-yellow-800 font-bold text-sm">
                      {step.step}
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Security & Reliability Section */}
        <section className="relative z-10 py-20 px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-800 dark:text-white mb-6">
                Security & Reliability
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
                Enterprise-grade compliance and security built in
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {securityFeatures.map((feature, index) => (
                <div key={index} className="text-center group">
                  <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                    {feature.name}
                  </h3>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Closing CTA Section */}
        <section className="relative z-10 py-20 px-8 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600">
          <div className="max-w-6xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-8">
              Experience AI Conversations that Deliver Value
            </h2>
            <p className="text-xl text-white/90 mb-12 max-w-3xl mx-auto">
              Join thousands of businesses already transforming their customer experience with Converiqo
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <a
                href="https://converiqo.ai/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-blue-600 bg-white hover:bg-gray-50 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
              >
                Try Free
                <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </a>
              <a
                href="https://converiqo.ai/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-white/20 hover:bg-white/30 border-2 border-white/30 hover:border-white/50 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
              >
                Talk to Sales
                <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </a>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default DemoPage;