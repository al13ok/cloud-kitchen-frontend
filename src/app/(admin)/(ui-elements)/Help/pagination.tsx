"use client";

type Props = {
  currentJobsCount: number;
  totalFilteredCount: number;
  rowsPerPage: number;
  setRowsPerPage: (n: number) => void;
  currentPage: number;
  setCurrentPage: (n: number | ((p: number) => number)) => void;
  totalPages: number;
};

export default function HelpPagination({
  currentJobsCount,
  totalFilteredCount,
  rowsPerPage,
  setRowsPerPage,
  currentPage,
  setCurrentPage,
  totalPages,
}: Props) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-4 sm:p-6 mt-6 sm:mt-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
        <div className="text-sm text-blue-700 dark:text-blue-300">
          <span className="font-medium">Showing {currentJobsCount}</span> of <span className="font-medium">{totalFilteredCount}</span> entries
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-blue-700 dark:text-blue-300">Show:</span>
            <select
              value={rowsPerPage}
              onChange={(e) => setRowsPerPage(Number(e.target.value))}
              className="border border-blue-400 dark:border-blue-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-blue-50 dark:bg-blue-800/50 text-blue-900 dark:text-white transition-colors duration-200"
            >
              {[10, 25, 50].map((n) => (
                <option key={n} value={n}>{n} per page</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, Number(p) - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 border border-blue-400 dark:border-blue-500 rounded-lg text-sm font-medium bg-blue-50 dark:bg-blue-800/50 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="hidden sm:inline">Previous</span>
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                if (page > totalPages) return null;
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      currentPage === page
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-blue-50 dark:bg-blue-800/50 text-blue-700 dark:text-blue-300 border border-blue-400 dark:border-blue-500 hover:bg-blue-100 dark:hover:bg-blue-700/50'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, Number(p) + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 border border-blue-400 dark:border-blue-500 rounded-lg text-sm font-medium bg-blue-50 dark:bg-blue-800/50 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-1"
            >
              <span className="hidden sm:inline">Next</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


