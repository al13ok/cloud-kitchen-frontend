'use client';

import AvatarSelector from "./AvatarSelector";
import SnippetActions from "./SnippetActions";
import { Bot } from "lucide-react";
import { useState } from "react";
import DashboardHeader from '@/components/header/DashboardHeader';

export default function AvatarPage() {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-blue-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-blue-900/10">
      {/* Professional Header */}
      <div className="mx-4 mt-4 sm:mx-6 sm:mt-6 lg:mx-8 lg:mt-8 mb-8">
        <DashboardHeader
          variant="default"
          size="lg"
          title="AI Agent Bot Controls"
          subtitle="Customize your AI assistant's avatar, welcome message, and theme. All changes are saved automatically."
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'AI Agent Bot Controls', href: '/avatars' }
          ]}
          icon={() => (
            <div className="relative">
              <Bot className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              <div className="absolute -top-2 -right-2 w-4 h-4 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
              </div>
            </div>
          )}
          showHelp={showHelp}
          onHelpToggle={() => setShowHelp(!showHelp)}
          helpContent={
            <ul className="space-y-2 text-white/80 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-blue-300 mt-0.5">•</span>
                <span>Select an avatar or upload your own custom image</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-300 mt-0.5">•</span>
                <span>Customize bot name and welcome message for personalized experience</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-300 mt-0.5">•</span>
                <span>Choose from 15+ color themes to match your brand</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-300 mt-0.5">•</span>
                <span>Preview changes in real-time on the right panel</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-300 mt-0.5">•</span>
                <span>Click Save to apply and store all your updates</span>
              </li>
            </ul>
          }
          actions={<SnippetActions />}
        />
      </div>

      {/* Content Section */}
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-[1920px] mx-auto">
          {/* Workspace Container */}
          <div className="bg-gray-50/50 dark:bg-gray-800/50 rounded-2xl p-6 shadow-sm border border-gray-200/50 dark:border-gray-700/50">
            {/* Main Content - Avatar Selector */}
            <AvatarSelector />
          </div>
        </div>
      </div>
    </div>
  );
}
