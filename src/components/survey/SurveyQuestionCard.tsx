"use client";

import React, { ReactNode } from "react";
import { Info } from "lucide-react";

interface SurveyQuestionCardProps {
  title?: string;
  description?: string;
  children: ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
}

export const SurveyQuestionCard: React.FC<SurveyQuestionCardProps> = ({
  title,
  description,
  children,
  error,
  required = false,
  className = "",
}) => {
  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-5 transition-all duration-300 hover:shadow-md ${className}`}
    >
      <div className="space-y-3">
        {/* Title */}
        {title && (
          <div className="flex items-start gap-2">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white flex-1">
              {title}
              {required && (
                <span className="text-red-500 ml-1" aria-label="required">
                  *
                </span>
              )}
            </h3>
            {description && (
              <div className="group relative">
                <Info className="w-5 h-5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-help transition-colors" />
                <div className="absolute right-0 top-full mt-2 w-64 p-3 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                  {description}
                  <div className="absolute -top-1 right-4 w-2 h-2 bg-gray-900 dark:bg-gray-800 transform rotate-45" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Description */}
        {description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            {description}
          </p>
        )}

        {/* Content */}
        <div className="pt-2">{children}</div>

        {/* Error Message */}
        {error && (
          <div
            className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
            role="alert"
          >
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SurveyQuestionCard;

