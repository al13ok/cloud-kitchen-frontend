// components/DashboardCard.tsx
import React from "react";
import Link from "next/link";

 

 

 

type DashboardCardProps = {
  label: string;
  count: number;
  icon: React.ReactNode;
  className?: string;
};

 

 

 
const DashboardCard: React.FC<DashboardCardProps> = ({ label, count, icon, className }) => {
  return (
    <div className={`group relative rounded-2xl bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900/50 p-6 shadow-lg border-0 hover:shadow-2xl hover:scale-105 transition-all duration-300 ease-out flex flex-col items-center justify-center text-center min-h-[140px] sm:min-h-[160px] md:min-h-[170px] overflow-hidden ${className || ""}`}>
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-blue-50/20 dark:to-blue-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      
      {/* Icon with enhanced styling */}
      <div className="relative z-10 mb-4 p-3 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 shadow-md group-hover:shadow-lg transition-all duration-300">
        <div className="text-3xl text-gray-700 dark:text-gray-200 group-hover:scale-110 transition-transform duration-300">{icon}</div>
      </div>
      
      {/* Count with enhanced typography */}
      <div className="relative z-10 text-3xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-200 bg-clip-text text-transparent mb-2 group-hover:scale-105 transition-transform duration-300">{count}</div>
      
      {/* Label with improved styling */}
      <div className="relative z-10 text-sm font-medium text-gray-600 dark:text-gray-300 text-center whitespace-normal break-words max-w-full leading-relaxed group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors duration-300">{label}</div>
      
      {/* Subtle animated border */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 blur-xl"></div>
    </div>
  );
};
 

 

 

export default DashboardCard;

 

// Dynamic grid for dashboard cards used across pages
export type DashboardCardItem = {
  label: string;
  count: number;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
  cardClassName?: string;
};

 

type DashboardCardGridProps = {
  items: DashboardCardItem[];
  gridClassName?: string;
  wrapperClassName?: string;
};

 

export const DashboardCardGrid: React.FC<DashboardCardGridProps> = ({
  items,
  gridClassName = "grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-4 md:gap-6 w-full max-w-screen-xl",
  wrapperClassName,
}) => {
  return (
    <div className={wrapperClassName}>
      <div className={gridClassName}>
        {items.map((item, idx) => {
          const card = (
            <DashboardCard
              key={`${item.label}-${idx}`}
              label={item.label}
              count={item.count}
              icon={item.icon}
              className={item.cardClassName}
            />
          );

 

          if (item.href) {
            return (
              <Link href={item.href} key={`${item.label}-${idx}`} style={{ cursor: "pointer" }}>
                {card}
              </Link>
            );
          }

 

          if (item.onClick) {
            return (
              <button key={`${item.label}-${idx}`} onClick={item.onClick} style={{ cursor: "pointer" }} className="text-left">
                {card}
              </button>
            );
          }

 

          return (
            <div key={`${item.label}-${idx}`} style={{ cursor: "default" }}>
              {card}
            </div>
          );
        })}
      </div>
    </div>
  );
};