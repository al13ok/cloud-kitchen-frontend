"use client";

 

import { RefObject } from 'react';
import DateRangePicker from '@/components/DateRangePicker';


 

type Range = { start: Date | null; end: Date | null };

 

type Props = {
  // search
  filterField: 'id' | 'name' | 'email' | 'subject' | 'message' | 'date';
  setFilterField: (v: Props['filterField']) => void;
  filterQuery: string;
  setFilterQuery: (v: string) => void;

 

  // buttons
  showFilters: boolean;
  setShowFilters: (updater: (prev: boolean) => boolean) => void;
  handleDownload: () => void;
  fetchJobs: () => void | Promise<void>;
  loadingJobs: boolean;

 

  // create ticket
  showForm: boolean;
  setShowForm: (v: boolean) => void;
  setSuccess: (v: string) => void;
  setError: (v: string) => void;
  populateFormWithUserInfo: () => void | Promise<void>;

 

  // timeline / custom range
  timelineFilter: string;
  setTimelineFilter: (v: string) => void;
  customRange: Range;
  setCustomRange: (updater: (r: Range) => Range) => void;
  customDateRef: RefObject<HTMLDivElement | null>;

 

  // helpers from parent
  formatCustomRangeLabel: (range: Range) => string;
};

 

// (Inline DateRangePicker replaced by shared component)

 

export default function HelpFilter({
  filterField,
  setFilterField,
  filterQuery,
  setFilterQuery,
  showFilters,
  setShowFilters,
  handleDownload,
  fetchJobs,
  loadingJobs,
  showForm,
  setShowForm,
  setSuccess,
  setError,
  populateFormWithUserInfo,
  timelineFilter,
  setTimelineFilter,
  customRange,
  setCustomRange,
  customDateRef,
  formatCustomRangeLabel,
}: Props) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8">
      <div className="flex flex-col lg:flex-row gap-2 lg:items-center lg:justify-start w-full">
        {/* Search input row */}
        <div className="w-full lg:w-auto lg:flex-1 lg:max-w-2xl">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder={`Search by ${filterField}...`}
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 sm:py-4 border border-blue-400 dark:border-blue-500 rounded-lg bg-blue-50 dark:bg-blue-800/50 text-blue-900 dark:text-white placeholder-blue-600 dark:placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-xs sm:text-sm lg:text-base transition-colors duration-200"
            />
          </div>
        </div>

 

        {/* Action buttons row - responsive grid */}
        <div className="grid grid-cols-4 gap-2 sm:flex sm:items-center sm:gap-3 w-full lg:w-auto">
          {/* Filters button */}
          <button
            type="button"
            onClick={() => setShowFilters((prev) => !prev)}
            className="px-3 py-2.5 sm:py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center justify-center gap-1 sm:gap-2 font-medium text-xs sm:text-sm lg:text-base transition-all duration-200 shadow-sm"
          >
            <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
            </svg>
            <span className="hidden sm:inline">Filters</span>
            <svg className={`w-3 h-3 sm:w-4 sm:h-4 transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

 

          {/* Download button */}
          <button
            onClick={handleDownload}
            className="px-3 py-2.5 sm:py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center justify-center gap-1 sm:gap-2 font-medium text-xs sm:text-sm lg:text-base transition-all duration-200 shadow-sm"
            title="Download"
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-3 h-3 sm:w-4 sm:h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5V18a2.25 2.25 0 0 0 2.25 2.25h13.5A2.25 2.25 0 0 0 21 18v-1.5M7.5 12l4.5 4.5m0 0l4.5-4.5m-4.5 4.5V3" />
            </svg>
            <span className="hidden sm:inline">Download</span>
          </button>

 

          {/* Refresh button */}
          <button
            onClick={fetchJobs}
            disabled={loadingJobs}
            className={`px-3 py-2.5 sm:py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center justify-center gap-1 sm:gap-2 font-medium text-xs sm:text-sm lg:text-base transition-all duration-200 shadow-sm ${loadingJobs ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 dark:hover:bg-gray-600'}`}
            title="Refresh"
          >
            {loadingJobs ? (
              <div className="text-center">
                <div role="status">
                  <svg aria-hidden="true" className="inline w-3 h-3 sm:w-4 sm:h-4 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
                    <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
                  </svg>
                  <span className="sr-only">Loading...</span>
                </div>
              </div>
            ) : (
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-3 h-3 sm:w-4 sm:h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            )}
            <span className="hidden sm:inline">{loadingJobs ? 'Refreshing...' : 'Refresh'}</span>
          </button>

 

          {/* Create Ticket button */}
          {!showForm && (
            <button
              className="px-3 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-semibold text-xs sm:text-sm lg:text-base transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-1 sm:gap-2"
              onClick={async () => {
                setShowForm(true);
                setSuccess('');
                setError('');
                await populateFormWithUserInfo();
              }}
            >
              <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">Create Ticket</span>
            </button>
          )}
        </div>
      </div>

 

      {/* Additional filters (conditionally rendered) */}
      {showFilters && (
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
          {/* Field filter dropdown */}
          <select
            value={filterField}
            onChange={(e) => setFilterField(e.target.value as Props['filterField'])}
            className="px-4 py-2.5 sm:py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm lg:text-base transition-colors duration-200 shadow-sm w-full sm:w-auto"
          >
            <option value="id">Filter by ID</option>
            <option value="name">Filter by Name</option>
            <option value="email">Filter by Email</option>
            <option value="subject">Filter by Subject</option>
            <option value="message">Filter by Message</option>
            <option value="date">Filter by Date</option>
          </select>

 

          {/* Timeline filter dropdown */}
          <div style={{ position: 'relative' }} className="w-full sm:w-auto">
            <select
              value={timelineFilter === 'custom' && (customRange.start || customRange.end) ? 'custom-selected' : timelineFilter}
              onChange={e => {
                if (e.target.value === 'custom' || e.target.value === 'custom-selected') {
                  setTimelineFilter('custom');
                  setShowFilters(() => true);
                } else {
                  setTimelineFilter(e.target.value);
                }
              }}
              className="px-4 py-2.5 sm:py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm lg:text-base transition-colors duration-200 shadow-sm w-full"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last12hours">Last 12 hours</option>
              <option value="thisweek">This week</option>
              <option value="thismonth">This month</option>
              <option value="lastweek">Last week</option>
              <option value="lastmonth">Last month</option>
              <option value="last30days">Last 30 days</option>
              <option value="custom">Custom Range</option>
              {((customRange.start && customRange.end) || customRange.start) && (
                <option value="custom-selected">{formatCustomRangeLabel(customRange)}</option>
              )}
            </select>

 

            {timelineFilter === 'custom' && (
              <div ref={customDateRef} className="absolute left-0 mt-2 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl p-4 flex flex-col gap-3 w-80 sm:w-96" style={{ minWidth: '320px' }}>
                <DateRangePicker
                  value={[customRange.start, customRange.end]}
                  onChange={(dates) => {
                    const [start, end] = dates;
                    setCustomRange(() => ({ start, end }));
                    if (start && end) {
                      setTimeout(() => setTimelineFilter('custom-selected'), 0);
                    }
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}



 