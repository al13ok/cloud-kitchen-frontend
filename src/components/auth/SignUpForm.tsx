"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

export default function WelcomeScreen() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const router = useRouter();

  const UserOnboardingPage = dynamic(() => import("./useronboardingpage"), {
    loading: () => <div className="flex justify-center items-center h-full">Loading...</div>,
    ssr: false,
  });

  return (
    <div className="min-h-screen flex flex-col md:flex-row w-full">
      {/* Left side - 60% width on desktop, full width on mobile */}
      <div className="w-full bg-white scroll-auto">
        {showOnboarding ? (
          <UserOnboardingPage />
        ) : (
          <div className="flex items-center justify-center p-8 h-full">
                         <div className="max-w-md w-full text-center bg-white rounded-lg shadow-lg p-8">
              <div className="mb-6 w-full">
                {/* Heart Icon */}
                <svg
                  className="w-12 h-12 text-black mb-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="w-full max-w-lg text-left">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">
                  Welcome to our community!
                </h2>
                <p className="text-gray-600 mb-4">
                  We are excited to have you join us. Get started by completing your
                  profile, exploring our features, and connecting with other users.
                </p>
                <p className="text-gray-600 mb-4">
                  Have questions? Check out our FAQs or reach out to our support team
                  for assistance.
                </p>
                <p className="text-gray-600 mb-8">
                  Let&apos;s embark on this journey together!
                </p>
              </div>
              <div className="flex flex-col justify-center items-center space-y-5 w-full max-w-lg mt-2">
                <button
                  onClick={() => setShowOnboarding(true)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 w-full font-semibold"
                >
                  START
                </button>
                <div className="text-left w-full">
                  <span className="text-gray-600">Already a member? </span>
                  <button
                    onClick={() => router.push("/signin")}
                    className="text-blue-600 hover:text-blue-700 font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Sign-in
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Right side - 40% width on desktop, full width on mobile, branding section */}
      
      {/* Footer */}
      
    </div>
  );
} 