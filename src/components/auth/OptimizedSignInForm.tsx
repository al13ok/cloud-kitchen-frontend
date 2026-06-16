"use client";
import React, { useState, useEffect, Suspense, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
 

import { EyeCloseIcon, EyeIcon } from "@/icons";
import AuthService, { LoginCredentials } from "@/services/AuthService";
import RouteGuard from "@/services/RouteGuard";
import PerformanceMonitor from "@/components/common/PerformanceMonitor";

interface ValidationErrors {
  email?: string;
  password?: string;
  general?: string;
}

// Inline animated background component for better performance
const AnimatedBackground = React.memo(function AnimatedBackground() {
  const nodes = useMemo(() => 
    [...Array(4)].map((_, i) => (
      <div
        key={`node-${i}`}
        className="absolute w-2 h-2 bg-white/20 rounded-full animate-ping"
        style={{
          left: `${20 + (i * 20) % 60}%`,
          top: `${25 + (i * 15) % 50}%`,
          animationDelay: `${i * 1.2}s`,
          animationDuration: `${3 + i * 0.5}s`,
        }}
      />
    )), []
  );

  const particles = useMemo(() => 
    [...Array(6)].map((_, i) => (
      <div
        key={`particle-${i}`}
        className="absolute w-1 h-1 bg-white/30 rounded-full animate-bounce"
        style={{
          left: `${15 + i * 15}%`,
          top: `${35 + (i % 3) * 20}%`,
          animationDelay: `${i * 0.5}s`,
          animationDuration: `${2.5 + i * 0.3}s`,
        }}
      />
    )), []
  );

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-800 via-blue-900 to-indigo-900" />
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-blue-500/30 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-indigo-500/30 rounded-full blur-3xl" />
      </div>
      <div className="absolute inset-0">{nodes}</div>
      <div className="absolute inset-0">{particles}</div>
    </div>
  );
});

// Memoized Feature Card Component
const FeatureCard = React.memo(function FeatureCard({ icon, title, description, delay = 0 }: { 
  icon: React.ReactNode; 
  title: string; 
  description: string; 
  delay?: number;
}) {
  return (
    <div 
      className="group relative p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-blue-200/30 hover:bg-white/20 hover:border-blue-300/40 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/30"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 p-2 rounded-xl bg-gradient-to-br from-blue-500/30 to-cyan-500/20 group-hover:from-blue-500/40 group-hover:to-cyan-500/30 transition-all duration-300">
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="text-white font-semibold text-sm mb-1 group-hover:text-blue-200 transition-colors duration-300">
            {title}
          </h3>
          <p className="text-white/70 text-xs leading-relaxed">
            {description}
          </p>
        </div>
      </div>
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/15 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </div>
  );
});

// Memoized Dark Mode Toggle
const DarkModeToggle = React.memo(function DarkModeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    
    setIsDark(shouldBeDark);
    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = useCallback(() => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    
    if (newTheme) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <button
        className="p-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all duration-300"
        aria-label="Toggle dark mode"
        suppressHydrationWarning
      >
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all duration-300"
      aria-label="Toggle dark mode"
    >
      {isDark ? (
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
});

// Main Sign-in Form Content
const OptimizedSignInFormContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authService = AuthService.getInstance();
  const routeGuard = RouteGuard.getInstance();

  const [formData, setFormData] = useState<LoginCredentials>({
    identifier: "",
    password: "",
    device_type: "Web",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [authState, setAuthState] = useState(authService.getState());

  // Subscribe to auth state changes
  useEffect(() => {
    const unsubscribe = authService.subscribe(setAuthState);
    return unsubscribe;
  }, [authService]);

  // Check if user is logging out
  useEffect(() => {
    const isLoggingOut = sessionStorage.getItem('isLoggingOut') === 'true';
    if (isLoggingOut) {
      sessionStorage.removeItem('isLoggingOut');
      // Do not wipe fields if user already started typing (prevents race on fast typing during load)
      setFormData(prev => {
        if (prev.identifier || prev.password) {
          return prev; // keep user input intact
        }
        return { identifier: "", password: "", device_type: "Web" };
      });
      setErrors({});
    }
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (authState.isAuthenticated && authState.user) {
      const handleRedirect = async () => {
        try {
          const fromParam = searchParams.get('from');
          const redirectTo = fromParam || await routeGuard.getDefaultRedirect();
          
          await new Promise(resolve => setTimeout(resolve, 100));
          router.replace(redirectTo);
        } catch {
          router.replace('/dashboard');
        }
      };
      handleRedirect();
    }
  }, [authState.isAuthenticated, authState.user, router, searchParams, routeGuard]);

  // Memoized validation functions
  const isValidEmail = useCallback((email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }, []);

  const validateForm = useCallback((): boolean => {
    const newErrors: ValidationErrors = {};

    if (!formData.identifier.trim()) {
      newErrors.email = "Email is required";
    } else if (!isValidEmail(formData.identifier.trim())) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData.identifier, formData.password, isValidEmail]);

  const handleInputChange = useCallback((field: keyof LoginCredentials, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (errors[field as keyof ValidationErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }, [errors]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});
    // Snapshot the latest input values at submit time to avoid race with late effects
    const identifierSnapshot = formData.identifier.trim();
    const passwordSnapshot = formData.password;
    const deviceTypeSnapshot = formData.device_type;

    try {
      await authService.login({
        identifier: identifierSnapshot,
        password: passwordSnapshot,
        device_type: deviceTypeSnapshot,
      });
      
      // Reduced delay for better UX
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (window.location.pathname === '/signin') {
        const fromParam = searchParams.get('from');
        const redirectTo = fromParam || '/';
        
        if (process.env.NODE_ENV === 'production') {
          window.location.href = redirectTo;
        } else {
          try {
            router.replace(redirectTo);
          } catch {
            window.location.href = redirectTo;
          }
        }
      }
      
    } catch (error) {
      setErrors({
        general: error instanceof Error ? error.message : 'Login failed. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  }, [validateForm, formData, authService, searchParams, router]);

  // Memoized feature cards data
  const featureCards = useMemo(() => [
    {
      icon: (
        <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      title: "AI-Powered Conversations",
      description: "Intelligent chat that understands context and delivers human-like responses",
      delay: 0
    },
    {
      icon: (
        <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      title: "Enterprise-Grade Security",
      description: "Bank-level encryption and compliance with global security standards",
      delay: 200
    },
    {
      icon: (
        <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: "24/7 Intelligent Support",
      description: "Round-the-clock assistance with instant response and escalation",
      delay: 400
    }
  ], []);

  return (
    <>
      <PerformanceMonitor />
      <div className="min-h-screen flex">
        {/* Left Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-100 dark:from-blue-900 dark:via-blue-800 dark:to-indigo-900 relative overflow-hidden">
        {/* Subtle blue pattern overlay */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 bg-blue-400 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-24 h-24 bg-indigo-400 rounded-full blur-2xl"></div>
          <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-cyan-400 rounded-full blur-xl"></div>
        </div>
        
        <div className="relative z-10 w-full max-w-md space-y-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border border-blue-200/50 dark:border-blue-700/50">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
              Welcome back
            </h1>
            <p className="text-blue-700 dark:text-blue-300 font-medium">
              Sign in to your Converiqo account
            </p>
          </div>

          {/* Login Form */}
          <div className="space-y-6">
            <form className="space-y-6" onSubmit={handleSubmit}>
              {errors.general && (
                <div className="rounded-xl bg-red-50 dark:bg-red-900/20 p-4 border border-red-200 dark:border-red-800">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                        {errors.general}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Email Input */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  required
                  value={formData.identifier}
                  onChange={(e) => handleInputChange("identifier", e.target.value)}
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                    errors.email 
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                      : 'border-blue-300 dark:border-blue-600 bg-blue-50/50 dark:bg-blue-900/20 text-gray-900 dark:text-white focus:border-blue-500'
                  }`}
                  placeholder="Enter your email"
                />
                {errors.email && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Password Input */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    inputMode="text"
                    required
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    className={`w-full px-4 py-3 pr-12 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                      errors.password 
                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                        : 'border-blue-300 dark:border-blue-600 bg-blue-50/50 dark:bg-blue-900/20 text-gray-900 dark:text-white focus:border-blue-500'
                    }`}
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors duration-200"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeCloseIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-colors duration-150"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-blue-700 dark:text-blue-300">
                    Remember me
                  </label>
                </div>
                <Link
                  href={`/forgot-password?email=${encodeURIComponent(formData.identifier)}`}
                  className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-200"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] shadow-lg shadow-blue-500/25"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Signing in...
                  </div>
                ) : (
                  "Sign in"
                )}
              </button>
            </form>

            {/* Demo Link */}
            <div className="text-center">
              <p className="text-sm text-blue-600 dark:text-blue-400">
                New to Converiqo?{" "}
                <Link
                  href="/demo"
                  className="font-medium text-blue-700 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200 transition-colors duration-200 underline"
                >
                  Try the demo
                </Link>
              </p>
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="text-center">
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
              Secured by SSL • GDPR Compliant
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Enhanced Brand Section */}
      <div className="hidden lg:flex lg:w-1/2 relative" suppressHydrationWarning>
        <AnimatedBackground />
        
        {/* Main Content */}
        <div className="relative z-10 flex flex-col items-center justify-center px-12 w-full">
          <div className="max-w-lg text-center">
            {/* Hero Section */}
            <div className="mb-8">
              {/* M Logo */}
              <div className="mb-6 flex justify-center" suppressHydrationWarning>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src="/images/logo/M-LOGO_1.png" 
                  alt="M Logo"
                  width={256}
                  height={64}
                  className="h-16 w-auto object-contain"
                  suppressHydrationWarning
                />
              </div>
              
              <h2 className="text-5xl font-bold text-white mb-4 leading-tight">
                Conversations<br />
                <span className="relative">
                  Re-imagined
                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-blue-300 via-blue-400 to-cyan-400 rounded-full opacity-90"></div>
                </span>
              </h2>
              <p className="text-xl text-white/90 leading-relaxed">
                Transform your customer interactions with AI-powered conversations that feel natural, intelligent, and human.
              </p>
            </div>

            {/* Feature Cards */}
            <div className="space-y-4 mb-8">
              {featureCards.map((card, index) => (
                <FeatureCard
                  key={index}
                  icon={card.icon}
                  title={card.title}
                  description={card.description}
                  delay={card.delay}
                />
              ))}
            </div>

            {/* Trust Indicators */}
            <div className="text-center">
              <p className="text-sm text-white/60 mb-2">Trusted by Enterprises Worldwide</p>
              <div className="flex justify-center items-center space-x-6 text-white/40">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-xs">SSL Secured</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span className="text-xs">GDPR Compliant</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                  <span className="text-xs">SOC 2 Certified</span>
                </div>
              </div>
              <p className="text-xs text-white/30 mt-4">
                Powered by{' '}
                <a 
                  href="https://converiqo.ai" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-white/50 hover:text-white/70 transition-colors duration-200 underline"
                >
                  converiqo.ai
                </a>
              </p>
            </div>
          </div>
        </div>
        
        
        {/* Dark Mode Toggle */}
        <div className="absolute top-6 right-6 z-20">
          <DarkModeToggle />
        </div>
      </div>
      </div>
    </>
  );
};

// Loading fallback component
const SignInLoading = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600 dark:text-gray-400">Loading...</p>
    </div>
  </div>
);

// Main component with Suspense boundary
export default function OptimizedSignInForm() {
  return (
    <Suspense fallback={<SignInLoading />}>
      <OptimizedSignInFormContent />
    </Suspense>
  );
}
