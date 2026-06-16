'use client';

import React from "react";
import { getCurrentVersion, getVersionHistory, getStatusDisplayText, getEnvironmentDisplayText } from "@/utils/version";
import DashboardHeader from '@/components/header/DashboardHeader';
import { Zap } from 'lucide-react';

 


 

export default function VersionPage() {
  // Get dynamic version information
  const currentVersion = getCurrentVersion();
  const versionHistory = getVersionHistory();

 

  // Format release date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Unknown';
    }
  };

 

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'stable':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300';
      case 'beta':
        return 'bg-blue-200 dark:bg-blue-800 text-blue-700 dark:text-blue-300';
      case 'alpha':
        return 'bg-blue-300 dark:bg-blue-700 text-blue-700 dark:text-blue-300';
      default:
        return 'bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300';
    }
  };

 

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Professional Header */}
      <div className="mb-8">
        <DashboardHeader
          variant="default"
          size="md"
          title="Version Management"
          subtitle="Stay updated with the latest version and release information"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Version', href: '/Version' }
          ]}
          icon={() => (
            <div className="relative">
              <Zap className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
              </div>
            </div>
          )}
        />
      </div>
      
      {/* Main Version Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 mb-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Chatbot Version</h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Stay updated with the latest version and release information
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8">
          {/* Current Version */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-6 border border-blue-200 dark:border-blue-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Current Version</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Latest stable release</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{currentVersion.version}</span>
              <span className={`px-3 py-1 ${getStatusBadgeColor(currentVersion.status)} text-xs font-semibold rounded-full`}>
                {getStatusDisplayText(currentVersion.status)}
              </span>
            </div>
            {currentVersion.buildNumber && (
              <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Build: {currentVersion.buildNumber}
              </div>
            )}
          </div>

 

          {/* Release Date */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-6 border border-blue-200 dark:border-blue-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Release Date</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">When this version was released</p>
              </div>
            </div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {formatDate(currentVersion.releaseDate)}
            </div>
            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Environment: {getEnvironmentDisplayText(currentVersion.environment)}
            </div>
          </div>
        </div>

 

        {/* Additional Version Info */}
        <div className="mt-6 grid md:grid-cols-3 gap-4">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Environment</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {getEnvironmentDisplayText(currentVersion.environment)}
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Status</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {getStatusDisplayText(currentVersion.status)}
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Build</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {currentVersion.buildNumber || 'N/A'}
            </div>
          </div>
        </div>
      </div>

 

      {/* Version History */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Version History</h2>
        
        {versionHistory.length === 1 ? (
          // Show message for initial release
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Initial Release</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              This is the first version of your chatbot. Future updates will appear here.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-sm">
              <span className="font-semibold">Version {currentVersion.version}</span>
              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                {getStatusDisplayText(currentVersion.status)}
              </span>
            </div>
          </div>
        ) : (
          // Show version history when there are multiple versions
          <div className="space-y-4">
            {versionHistory.map((version, index) => (
              <div 
                key={version.version} 
                className={`flex items-center justify-between p-4 rounded-lg ${
                  index === 0 
                    ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700' 
                    : 'bg-gray-50 dark:bg-gray-700 opacity-80'
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">{version.version}</span>
                  <span className={`px-3 py-1 ${getStatusBadgeColor(version.status)} text-xs font-semibold rounded-full`}>
                    {index === 0 ? 'Current' : getStatusDisplayText(version.status)}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {formatDate(version.releaseDate)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-500">
                    {version.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

 

      {/* Features for Current Version */}
      <div className="mt-8 bg-blue-50 dark:bg-blue-900/10 rounded-xl p-6 border border-blue-200 dark:border-blue-700">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-3">
          Features in Version {currentVersion.version}
        </h3>
        <div className="text-blue-800 dark:text-blue-200 space-y-2">
          {versionHistory[0]?.features.map((feature, index) => (
            <p key={index}>• {feature}</p>
          ))}
        </div>
      </div>

 

      {/* Build Information */}
      {currentVersion.commitHash && (
        <div className="mt-6 bg-gray-50 dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Build Information</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Commit Hash:</span>
              <span className="ml-2 font-mono text-gray-900 dark:text-white">{currentVersion.commitHash}</span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Build Number:</span>
              <span className="ml-2 font-mono text-gray-900 dark:text-white">{currentVersion.buildNumber || 'N/A'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}