import React from "react";

export type PaginationProps = {
  currentPage: number; // 1-based
  pageSize: number;
  totalItems: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void; // receives 1-based page
  onPageSizeChange: (pageSize: number) => void;
  label?: string; // defaults to "tickets"
  className?: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  pageSize,
  totalItems,
  pageSizeOptions = [10, 20, 30, 50, 100],
  onPageChange,
  onPageSizeChange,
  label = "tickets",
  className = "",
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / Math.max(1, pageSize)));
  const safePage = clamp(currentPage, 1, totalPages);
  const start = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, totalItems);

  return (
    <div className={`flex flex-wrap justify-between items-center px-4 py-3 ${className}`}>
      <div className="flex items-center gap-4">
        <label className="text-sm text-gray-600 dark:text-gray-400">Items per page:</label>
        <select
          className="border border-gray-300 dark:border-gray-600 px-2 py-1 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:border-[#3366CC] focus:outline-none focus:ring-2 focus:ring-[#3366CC]/50 dark:focus:ring-[#3366CC]/50 focus:border-[#3366CC] transition-colors"
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
        >
          {pageSizeOptions.map((opt) => (
            <option key={opt} value={opt} className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">{opt} </option>
          ))}
        </select>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {totalItems === 0
            ? `Showing 0 ${label}`
            : `Showing ${start} to ${end} of ${totalItems} ${label}`}
        </span>
      </div>
      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <button
          disabled={safePage === 1}
          className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 hover:bg-[#3366CC]/10 dark:hover:bg-[#3366CC]/20 hover:border-[#3366CC] dark:hover:border-[#3366CC] hover:text-[#3366CC] dark:hover:text-[#4a7dd9] transition-colors text-gray-700 dark:text-gray-300"
          onClick={() => onPageChange(clamp(safePage - 1, 1, totalPages))}
        >
          Prev
        </button>
        <span className="text-gray-700 dark:text-gray-300">
          {safePage} / {totalPages}
        </span>
        <button
          disabled={safePage === totalPages}
          className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 hover:bg-[#3366CC]/10 dark:hover:bg-[#3366CC]/20 hover:border-[#3366CC] dark:hover:border-[#3366CC] hover:text-[#3366CC] dark:hover:text-[#4a7dd9] transition-colors text-gray-700 dark:text-gray-300"
          onClick={() => onPageChange(clamp(safePage + 1, 1, totalPages))}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default Pagination; 