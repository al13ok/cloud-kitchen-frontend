import React, { useState } from "react";
import { FaInfoCircle, FaDownload } from "react-icons/fa";

 

 

 

interface DownloadTemplateProps {
  form: {
    fileFormat: string;
    startDate: string;
    endDate: string;
    month: string;
    specificDate: string;
  };
  setForm: React.Dispatch<React.SetStateAction<{
    fileFormat: string;
    startDate: string;
    endDate: string;
    month: string;
    specificDate: string;
  }>>;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  loading?: boolean;
  title?: string;
}

 

 

 

const DownloadTemplate: React.FC<DownloadTemplateProps> = ({ form, setForm, onSubmit, loading, title }) => {
  const [showFormatError, setShowFormatError] = useState(false);

 

 

 

  // Custom submit handler to check fileFormat
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!form.fileFormat) {
      e.preventDefault();
      setShowFormatError(true);
      return;
    }
    setShowFormatError(false);
    onSubmit(e);
  };

 

 

 

  return (
    <div className="w-full max-w-lg mx-auto bg-white dark:bg-gray-900 rounded-2xl p-3 sm:p-4 md:p-6 flex flex-col items-center transition-colors shadow-md sm:shadow-lg md:max-w-xl lg:max-w-2xl xl:max-w-3xl overflow-y-auto max-h-[90vh]">
      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
        {/* <FaFileAlt className="text-3xl text-blue-500" /> */}
        <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100">{title || 'Download Employee Data'}</h2>
      </div>
      <form onSubmit={handleSubmit} className="w-full space-y-2 sm:space-y-3">
        <div className="relative">
          <label className="block font-semibold text-gray-700 dark:text-gray-200 mb-1 flex items-center gap-1">
            File Format
            <span className="group relative">
              <FaInfoCircle className="text-blue-400 cursor-pointer" />
              <span className="absolute left-6 top-1/2 -translate-y-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-10">Choose Excel or CSV format</span>
            </span>
          </label>
          <select
            className="w-full px-3 sm:px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm sm:text-base"
            value={form.fileFormat}
            onChange={e => {
              setForm(f => ({ ...f, fileFormat: e.target.value }));
              setShowFormatError(false);
            }}
            required
          >
            <option value="" disabled>Select file format</option>
            <option value="excel">Excel (.xlsx)</option>
            <option value="csv">CSV (.csv)</option>
          </select>
          {showFormatError && (
            <div className="text-red-500 text-xs mt-1">Please select a file format before downloading.</div>
          )}
        </div>
        <div className="flex justify-center mt-4 sm:mt-6">
          <button
            type="submit"
            className="flex items-center justify-center gap-2 w-full px-6 sm:px-8 py-2 sm:py-3 rounded-lg font-semibold text-white bg-[#3641F5] hover:opacity-90 transition shadow text-base sm:text-lg disabled:opacity-60"
            disabled={loading}
          >
            <FaDownload className="text-lg" />
            {loading ? "Downloading..." : "Download"}
          </button>
        </div>
      </form>
    </div>
  );
};

 

 

 

export default DownloadTemplate;