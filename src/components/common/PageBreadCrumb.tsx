"use client";
import { Briefcase, ChartBar} from "lucide-react";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

interface BreadcrumbProps {
  pageTitle: string;
  description?: string;
  icon?: React.ReactNode;
  iconBgColor?: string;
  tips?: string[];
  breadcrumbs?: Array<{ label: string; href?: string }>;
  onConfigureClick?: () => void;
  onHelpClick?: () => void;
}

const PageBreadcrumb: React.FC<BreadcrumbProps> = ({ pageTitle, description = "",
  icon = <Briefcase className="w-6 h-6 text-white" />,
  iconBgColor = "bg-blue-600",
  tips = [
    "Use filters to find specific items",
    "Select multiple items for bulk actions",
    "Click on links to view or download files",
    "Use the search to find items by name or other attributes",
    "Export selected or all items to CSV/Excel"
  ],
  breadcrumbs,
  onConfigureClick,
  onHelpClick}) => {
    // Set default breadcrumbs based on pageTitle if not provided
    const defaultBreadcrumbs = [
      { label: "Home", href: "/" },
      { label: pageTitle }
    ];
    
    const finalBreadcrumbs = breadcrumbs || defaultBreadcrumbs;
    
    const [showTips, setShowTips] = useState(false);
    const router = useRouter();
  
    const handleBreadcrumbClick = (href: string) => {
      if (href) {
        router.push(href);
      }
    };

  return (
    <header className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow p-4 mb-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${iconBgColor} flex items-center justify-center`}>
            {icon}
          </div>
          <div>
                         <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
               {pageTitle}
               {onConfigureClick && (
                 <button
                   title="Configure Fit Score Weights"
                   className="ml-2 p-1 text-gray-400 hover:text-green-600 transition-colors"
                   onClick={onConfigureClick}
                 >
                   <ChartBar className="w-5 h-5" />
                 </button>
               )}

               <button
                 title="Toggle Quick Tips"
                 className="ml-2 p-1 text-gray-400 hover:text-blue-600 transition-colors"
                 onClick={() => setShowTips(!showTips)}
               >
                 <svg
                   xmlns="http://www.w3.org/2000/svg"
                   width="24"
                   height="24"
                   viewBox="0 0 24 24"
                   fill="none"
                   stroke="currentColor"
                   strokeWidth="2"
                   strokeLinecap="round"
                   strokeLinejoin="round"
                   className="w-5 h-5"
                   aria-hidden="true"
                 >
                   <circle cx="12" cy="12" r="10"></circle>
                   <path d="M12 16v-4"></path>
                   <path d="M12 8h.01"></path>
                 </svg>
               </button>

               {onHelpClick && (
                 <button
                   title="Help"
                   className="ml-2 p-1 text-gray-400 hover:text-blue-600 transition-colors"
                   onClick={onHelpClick}
                 >
                   <svg
                     xmlns="http://www.w3.org/2000/svg"
                     width="24"
                     height="24"
                     viewBox="0 0 24 24"
                     fill="none"
                     stroke="currentColor"
                     strokeWidth="2"
                     strokeLinecap="round"
                     strokeLinejoin="round"
                     className="w-5 h-5"
                     aria-hidden="true"
                   >
                     <circle cx="12" cy="12" r="10"></circle>
                     <path d="M12 16v-4"></path>
                     <path d="M12 8h.01"></path>
                   </svg>
                 </button>
               )}
             </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {description}
            </p>
          </div>
        </div>
        
        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
          {finalBreadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              {index > 0 && <span className="mx-2">&gt;</span>}
              {crumb.href ? (
                <button 
                  className="hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer transition-colors"
                  onClick={() => handleBreadcrumbClick(crumb.href!)}
                >
                  {crumb.label}
                </button>
              ) : (
                <span className="text-gray-700 dark:text-gray-300 font-medium">
                  {crumb.label}
                </span>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
      
             {showTips && (
         <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
           <div className="flex items-start gap-3">
             <svg
               xmlns="http://www.w3.org/2000/svg"
               width="24"
               height="24"
               viewBox="0 0 24 24"
               fill="none"
               stroke="currentColor"
               strokeWidth="2"
               strokeLinecap="round"
               strokeLinejoin="round"
               className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0"
               aria-hidden="true"
             >
               <circle cx="12" cy="12" r="10"></circle>
               <path d="M12 16v-4"></path>
               <path d="M12 8h.01"></path>
             </svg>
             <div className="text-sm text-blue-800 dark:text-blue-200">
               <h3 className="font-semibold mb-2">Quick Tips:</h3>
               <ul className="space-y-1">
                 {tips.map((tip, index) => (
                   <li key={index}>• {tip}</li>
                 ))}
               </ul>
             </div>
           </div>
         </div>
       )}
    </header>
  );
};

export default PageBreadcrumb;
