"use client";

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/hooks/useAuth';
import { Users, RefreshCw, Bell } from 'lucide-react';
import DashboardHeader from '@/components/header/DashboardHeader';

const ESSPortalDashboard = dynamic(() => import('@/components/ess-portal/ESSPortalDashboard'), {
  ssr: false,
  loading: () => <div className="flex justify-center items-center h-64">Loading...</div>
});

// Custom CSS animations
const customStyles = `
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes slideInLeft {
    from {
      opacity: 0;
      transform: translateX(-50px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  @keyframes slideInRight {
    from {
      opacity: 0;
      transform: translateX(50px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  @keyframes bounceIn {
    0% {
      opacity: 0;
      transform: scale(0.3);
    }
    50% {
      opacity: 1;
      transform: scale(1.05);
    }
    70% {
      transform: scale(0.9);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }
  
  @keyframes float {
    0%, 100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-10px);
    }
  }
  
  @keyframes floatSlow {
    0%, 100% {
      transform: translateY(0px) translateX(0px);
    }
    50% {
      transform: translateY(-5px) translateX(5px);
    }
  }
  
  @keyframes floatReverse {
    0%, 100% {
      transform: translateY(0px) translateX(0px);
    }
    50% {
      transform: translateY(5px) translateX(-5px);
    }
  }
  
  @keyframes gradientShift {
    0%, 100% {
      background-position: 0% 50%;
    }
    50% {
      background-position: 100% 50%;
    }
  }
  
  .animate-fade-in-up {
    animation: fadeInUp 0.8s ease-out forwards;
  }
  
  .animate-slide-in-left {
    animation: slideInLeft 0.8s ease-out forwards;
  }
  
  .animate-slide-in-right {
    animation: slideInRight 0.8s ease-out forwards;
  }
  
  .animate-bounce-in {
    animation: bounceIn 0.8s ease-out forwards;
  }
  
  .animate-float {
    animation: float 3s ease-in-out infinite;
  }
  
  .animate-float-slow {
    animation: floatSlow 4s ease-in-out infinite;
  }
  
  .animate-float-reverse {
    animation: floatReverse 4s ease-in-out infinite;
  }
  
  .animate-gradient-shift {
    background-size: 200% 200%;
    animation: gradientShift 3s ease infinite;
  }
  
  .delay-300 {
    animation-delay: 0.3s;
  }
  
  .delay-500 {
    animation-delay: 0.5s;
  }
  
  .delay-700 {
    animation-delay: 0.7s;
  }
  
  .delay-1000 {
    animation-delay: 1s;
  }
`;

export default function ESSPortalPage() {
  const { isLoading } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);

  // Sample notifications data
  const notifications = [
    {
      id: 1,
      title: "Leave Request Approved",
      message: "Your annual leave request for Dec 15-20 has been approved by your manager.",
      time: "2 hours ago",
      type: "success"
    },
    {
      id: 2,
      title: "Payslip Available",
      message: "Your November 2024 payslip is now available for download.",
      time: "1 day ago",
      type: "info"
    },
    {
      id: 3,
      title: "Expense Claim Pending",
      message: "Your travel expense claim is pending manager approval.",
      time: "3 days ago",
      type: "warning"
    }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 border-2 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: customStyles }} />
      <div className="min-h-screen bg-gradient-to-br from-indigo-50/30 via-white to-sky-50/30 dark:from-black dark:via-black dark:to-black relative overflow-hidden">
        {/* Ultra-Modern Premium Background Elements */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-indigo-100/15 to-blue-100/15 rounded-full -translate-y-40 translate-x-40 animate-float-slow"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-sky-100/15 to-indigo-100/15 rounded-full translate-y-32 -translate-x-32 animate-float-reverse"></div>
        <div className="absolute top-1/3 left-1/4 w-32 h-32 bg-gradient-to-r from-blue-100/10 to-sky-100/10 rounded-full animate-float delay-500"></div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

          <DashboardHeader
            title="Employee Self Service Portal"
            subtitle="Advanced employee self-service system with intelligent workflow automation, comprehensive HR services management, and enterprise-grade security for multinational operations."
            icon={Users}
            variant="default"
            size="md"
            actions={
              <div className="flex items-center gap-4">
                {/* Notifications */}
                <div className="relative">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative p-3 bg-white/20 rounded-2xl backdrop-blur-sm border border-white/30 text-white hover:bg-white/30 transition-all duration-200 hover:scale-105"
                    title="Notifications"
                  >
                    <Bell className="w-5 h-5" />
                    {notifications.length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                        {notifications.length}
                      </span>
                    )}
                  </button>

                  {/* Notifications Dropdown */}
                  {showNotifications && (
                    <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 backdrop-blur-xl">
                      <div className="p-4 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.length > 0 ? (
                          notifications.map((notification) => (
                            <div key={notification.id} className="p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                              <div className="flex items-start gap-3">
                                <div className={`w-3 h-3 rounded-full mt-2 flex-shrink-0 ${notification.type === 'success' ? 'bg-green-500' :
                                  notification.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                                  }`} />
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-sm font-medium text-gray-900 truncate">{notification.title}</h4>
                                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">{notification.message}</p>
                                  <p className="text-xs text-gray-400 mt-2">{notification.time}</p>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-8 text-center">
                            <div className="text-gray-400 mb-3">
                              <Bell className="w-12 h-12 mx-auto" />
                            </div>
                            <p className="text-sm text-gray-500">No notifications yet</p>
                            <p className="text-xs text-gray-400 mt-1">You&apos;ll see updates here when they&apos;re available</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Refresh Button */}
                <button
                  onClick={() => window.location.reload()}
                  className="flex items-center px-4 py-3 bg-white/20 rounded-2xl backdrop-blur-sm border border-white/30 text-white hover:bg-white/30 transition-all duration-200 hover:scale-105"
                  title="Refresh Data"
                >
                  <RefreshCw className="w-5 h-5 mr-2" />
                  <span className="text-sm font-medium">Refresh</span>
                </button>
              </div>
            }
          />

          <ESSPortalDashboard />
        </div>
      </div>
    </>
  );
}
