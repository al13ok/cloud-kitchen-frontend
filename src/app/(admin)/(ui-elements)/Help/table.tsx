"use client";

 

import Link from 'next/link';

 

type Job = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
  issue_type?: string;
  issueType?: string; // Support both snake_case and camelCase
  business_id?: string;
  business_name?: string;
};

 

type Props = {
  loading: boolean;
  currentJobs: Job[];
  selected: string[];
  handleCheckboxChange: (id: string) => void;
  to12HourFormat: (d: string) => string;
  handleSelectAll: () => void;
};

 

export default function HelpTable({
  loading,
  currentJobs,
  selected,
  handleCheckboxChange,
  to12HourFormat,
  handleSelectAll,
}: Props) {
  return (
    <div className="overflow-x-auto">
      {loading && (
        <div className="flex justify-center items-center py-8">
          <div className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-lg px-6 py-4 shadow-xl">
            <div className="text-center">
              <div role="status">
                <svg aria-hidden="true" className="inline w-6 h-6 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
                  <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
                </svg>
                <span className="sr-only">Loading...</span>
              </div>
            </div>
            <span className="text-blue-700 dark:text-blue-400 font-medium">Loading tickets...</span>
          </div>
        </div>
      )}

 

      {/* Mobile Card View */}
      <div className="block lg:hidden space-y-4">
        {currentJobs.map((job) => (
          <div key={job.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-xl hover:shadow-2xl transition-all duration-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selected.includes(job.id)}
                  onChange={() => handleCheckboxChange(job.id)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2"
                />
                <div className="flex items-center gap-2">
                  <Link 
                    href={`/Help/id?jobId=${job.id}${job.status && job.status.toLowerCase() === 'assigned' ? '&openChat=true' : ''}`} 
                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-xs font-medium"
                  >
                    {job.id}
                  </Link>
                </div>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  job.status && job.status.toLowerCase() === 'solved' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                  job.status && job.status.toLowerCase() === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                  job.status && job.status.toLowerCase() === 'open' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                  'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                {job.status ? job.status.charAt(0).toUpperCase() + job.status.slice(1) : ''}
              </span>
            </div>

 

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold text-sm shadow-sm">
                  {(() => {
                    const parts = job.name.trim().split(' ');
                    if (parts.length === 1) return parts[0][0]?.toUpperCase() || '';
                    return (parts[0][0] + (parts[parts.length - 1][0] || '')).toUpperCase();
                  })()}
                </span>
                <div>
                  <span className="font-semibold text-gray-900 dark:text-white text-sm">{job.name}</span>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{job.email}</div>
                </div>
              </div>

 

              <div className="space-y-2">
                <div className="text-sm">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Issue Type:</span>
                  <span className="ml-2 text-gray-900 dark:text-white">
                    {/* Show issue_type (not category) - clean text without emojis */}
                    {(() => {
                      const issueType = job.issue_type || job.issueType || 'N/A';
                      // Remove emojis and extra spaces, keep only the text
                      return issueType.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim() || issueType;
                    })()}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Business ID:</span>
                  <span className="ml-2 text-gray-900 dark:text-white">{job.business_id || 'N/A'}</span>
                </div>
                <div className="text-sm">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Business Name:</span>
                  <span className="ml-2 text-gray-900 dark:text-white">{job.business_name || 'N/A'}</span>
                </div>
                <div className="text-sm">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Subject:</span>
                  <span className="ml-2 text-gray-900 dark:text-white">{job.subject}</span>
                </div>
                <div className="text-sm">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Message:</span>
                  <p className="mt-1 text-gray-900 dark:text-white text-xs leading-relaxed">
                    {job.message.length > 80 ? job.message.substring(0, 80) + '...' : job.message}
                  </p>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {to12HourFormat(job.created_at)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

 

      {/* Desktop Table View */}
      <div className="hidden lg:block w-full">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-x-auto w-full">
          <table className="min-w-max w-full">
            <thead className="bg-blue-50 dark:bg-blue-900/20">
              <tr>
                <th className="px-6 py-4 text-center">
                  <input
                    type="checkbox"
                    checked={selected.length === currentJobs.length && currentJobs.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2"
                  />
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-blue-800 dark:text-blue-200 uppercase tracking-wider">Ticket ID</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-blue-800 dark:text-blue-200 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-blue-800 dark:text-blue-200 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-blue-800 dark:text-blue-200 uppercase tracking-wider">Issue Type</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-blue-800 dark:text-blue-200 uppercase tracking-wider">Subject</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-blue-800 dark:text-blue-200 uppercase tracking-wider">Business</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-blue-800 dark:text-blue-200 uppercase tracking-wider">Created</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-blue-300 dark:divide-blue-600">
              {currentJobs.map((job) => (
                <tr key={job.id} className="hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors duration-150">
                  <td className="px-6 py-4 text-center">
                    <input
                      type="checkbox"
                      checked={selected.includes(job.id)}
                      onChange={() => handleCheckboxChange(job.id)}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link 
                      href={`/Help/id?jobId=${job.id}${job.status && job.status.toLowerCase() === 'assigned' ? '&openChat=true' : ''}`} 
                      className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium text-sm"
                    >
                      {job.id}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      job.status && job.status.toLowerCase() === 'solved' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                      job.status && job.status.toLowerCase() === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      job.status && job.status.toLowerCase() === 'open' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {job.status ? job.status.charAt(0).toUpperCase() + job.status.slice(1) : ''}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold text-sm shadow-sm">
                        {(() => {
                          const parts = job.name.trim().split(' ');
                          if (parts.length === 1) return parts[0][0]?.toUpperCase() || '';
                          return (parts[0][0] + (parts[parts.length - 1][0] || '')).toUpperCase();
                        })()}
                      </span>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white text-sm">{job.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{job.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white max-w-xs truncate" title={(() => {
                    // Use issue_type (not category) - this is what user selects in form
                    const issueType = job.issue_type || job.issueType || 'N/A';
                    // Remove emojis and extra spaces, keep only the text
                    return issueType.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim() || issueType;
                  })()}>
                    <span className="font-medium">
                      {/* Show issue_type (not category) - clean text without emojis */}
                      {(() => {
                        // Use issue_type (not category) - this is what user selects in form
                        const issueType = job.issue_type || job.issueType || 'N/A';
                        // Remove emojis and extra spaces, keep only the text
                        return issueType.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim() || issueType;
                      })()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white max-w-xs truncate" title={job.subject}>{job.subject}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">
                      <div className="font-medium text-gray-900 dark:text-white">{job.business_name || 'N/A'}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{job.business_id || 'N/A'}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{to12HourFormat(job.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}



 





