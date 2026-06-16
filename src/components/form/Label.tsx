import React, { FC, ReactNode } from "react";
import { twMerge } from "tailwind-merge";
import { Tooltip } from "@/components/ui/tooltip";

interface LabelProps {
  htmlFor?: string;
  children: ReactNode;
  className?: string;
  required?: boolean;
  tooltip?: string;
}

const Label: FC<LabelProps> = ({ htmlFor, children, className, required, tooltip }) => {
  const labelContent = (
    <label
      htmlFor={htmlFor}
      className={twMerge(
        // Default classes that apply by default
        "mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400",
        // User-defined className that can override the default margin
        className
      )}
    >
      <div className="flex items-center gap-2">
        <span>
          {children}
          {required && <span className="text-red-500">*</span>}
        </span>
        {tooltip && (
          <Tooltip content={tooltip}>
            <svg
              className="w-4 h-4 text-gray-500 cursor-help"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              ></path>
            </svg>
          </Tooltip>
        )}
      </div>
    </label>
  );

  return labelContent;
};

export default Label;