"use client";
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';

// Component that uses useSearchParams
const AccessDeniedContent = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [countdown, setCountdown] = useState(10);

  const route = searchParams.get('route') || 'Unknown Route';
  const message = searchParams.get('message') || 'You do not have permission to view this page.';

  // Handle countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Handle navigation when countdown reaches 0
  useEffect(() => {
    if (countdown === 0) {
      router.push('/');
    }
  }, [countdown, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          {/* Access Denied Icon */}
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900">
            <svg
              className="h-8 w-8 text-red-600 dark:text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>

          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
            Access Denied
          </h2>
          
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {message}
          </p>
          
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Please check your credentials and try again.
          </p>

          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200">
              <strong>Route:</strong> {route}
            </p>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
              You don&apos;t have the required permissions to access this page.
            </p>
          </div>

          <div className="mt-6 space-y-4">
            <Link
              href="/"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Go to Home
            </Link>
            
            <button
              onClick={() => router.back()}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Go Back
            </button>
          </div>

          <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            Redirecting to home in {countdown} seconds...
          </div>
          
          <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
            Error Code: 403
          </div>
        </div>
      </div>
    </div>
  );
};

// Loading fallback component
const AccessDeniedLoading = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
    <div className="max-w-md w-full space-y-8 p-8">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900">
          <div className="h-8 w-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
          Loading...
        </h2>
      </div>
    </div>
  </div>
);

// Main component with Suspense boundary
const AccessDeniedPage = () => {
  return (
    <Suspense fallback={<AccessDeniedLoading />}>
      <AccessDeniedContent />
    </Suspense>
  );
};

export default AccessDeniedPage; 