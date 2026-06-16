import React, { useRef, useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import { FaDownload, FaUpload, FaCheckCircle, FaExclamationCircle, FaFileAlt } from "react-icons/fa";

interface EmployeeUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

const EmployeeUploadModal: React.FC<EmployeeUploadModalProps> = ({ isOpen, onClose, onUploadSuccess, onError }) => {
  const RAW_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';
  const BASE_URL = RAW_BASE_URL.replace(/\/+$/, '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("No file chosen");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error" | "info" | null; text: string }>({ type: null, text: "" });
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Function to truncate long filenames
  const truncateFileName = (name: string, maxLength: number = 25) => {
    if (name.length <= maxLength) return name;
    
    const extension = name.split('.').pop();
    const nameWithoutExt = name.substring(0, name.lastIndexOf('.'));
    const maxNameLength = maxLength - 3 - (extension ? extension.length : 0); // 3 for "..."
    
    if (maxNameLength <= 0) {
      return `...${extension ? '.' + extension : ''}`;
    }
    
    return `${nameWithoutExt.substring(0, maxNameLength)}...${extension ? '.' + extension : ''}`;
  };

  // Validate file format
  const validateFileFormat = (file: File): boolean => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
      'application/csv' // .csv alternative
    ];
    
    const allowedExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    return allowedTypes.includes(file.type) || allowedExtensions.includes(fileExtension);
  };

  const handleDownloadTemplate = async () => {
    const url = `${BASE_URL}/api/v1/template/employees/?format=excel`;
    try {
      const response = await fetch(url, { method: "GET", headers: { accept: "application/json" } });
      if (!response.ok) throw new Error("Failed to download template");
      const blob = await response.blob();
      // Generate timestamp in YYYYMMDD_HHMM
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
      const fileName = `CV_emp_list_${timestamp}.xlsx`;
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(link.href);
      if (onUploadSuccess) onUploadSuccess(`File downloaded: ${fileName}`); // alert for download only
      onClose();
    } catch {
      if (onError) onError("Failed to download employee template. Please try again.");
      onClose();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file format
      if (!validateFileFormat(file)) {
        if (onError) onError("Unsupported file format. Only CSV, XLS, and XLSX are allowed.");
        setMessage({ type: "error", text: "Unsupported file format. Allowed: .csv, .xls, .xlsx" });
        setFileName("No file chosen");
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      
      setFileName(file.name);
      setSelectedFile(file);
      setMessage({ type: "info", text: "File ready to upload" });
    } else {
      setFileName("No file chosen");
      setSelectedFile(null);
      setMessage({ type: null, text: "" });
    }
  };

  // Drag & Drop handlers
  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (!file) return;
    if (!validateFileFormat(file)) {
      if (onError) onError("Unsupported file format. Only CSV, XLS, and XLSX are allowed.");
      setMessage({ type: "error", text: "Unsupported file format. Allowed: .csv, .xls, .xlsx" });
      return;
    }
    setFileName(file.name);
    setSelectedFile(file);
    setMessage({ type: "info", text: "File ready to upload" });
  };

  // Handle modal close - refresh if upload was successful
  const handleClose = () => {
    // If upload was successful and we're closing manually, trigger refresh
    if (uploadSuccess && onUploadSuccess) {
      // Send message that matches parent's condition to trigger refresh
      onUploadSuccess("File uploaded: refresh");
    }
    // Reset upload success state
    setUploadSuccess(false);
    setMessage({ type: null, text: "" });
    setFileName("No file chosen");
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onClose();
  };

  // Reset upload success when modal opens
  useEffect(() => {
    if (isOpen) {
      setUploadSuccess(false);
      setMessage({ type: null, text: "" });
    }
  }, [isOpen]);

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    // Double-check file format validation
    if (!validateFileFormat(selectedFile)) {
      if (onError) onError("Unsupported file format. Only CSV, XLS, and XLSX are allowed.");
      return;
    }
    
    setUploading(true);
    const formData = new FormData();
    formData.append("file", selectedFile);
    
    try {
      const response = await fetch(
        `${BASE_URL}/api/v1/upload-employees/`,
        {
          method: "POST",
          body: formData,
        }
      );
      
      if (response.ok) {
        setMessage({ type: "success", text: "Upload successful" });
        setUploadSuccess(true);
        const uploadedFileName = selectedFile.name;
        // Reset file selection
        setFileName("No file chosen");
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        // Call onUploadSuccess which will handle refresh and close in parent
        if (onUploadSuccess) {
          onUploadSuccess(`File uploaded: ${uploadedFileName}`);
        } else {
          // If no callback, close after a delay to allow user to see success message
          setTimeout(() => {
            onClose();
          }, 1500);
        }
      } else {
        // Handle different error responses from backend
        let errorMessage = "Failed to upload employee file. Please try again.";
        
        try {
          const errorData = await response.json();
          
          // Check for specific error messages from backend
          if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.detail) {
            errorMessage = errorData.detail;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          }
          
          // Handle specific error cases for employees
          if (errorMessage.includes("Missing required columns") || 
              errorMessage.includes("department") || 
              errorMessage.includes("emp_id") || 
              errorMessage.includes("email") || 
              errorMessage.includes("full_name")) {
            errorMessage = "Missing required columns: department, emp_id, email, full_name";
          } else if (errorMessage.includes("Invalid emp_id format") || 
                     errorMessage.includes("emp_id must be alphanumeric")) {
            errorMessage = "Employee ID can contain letters, numbers, and hyphens (-)";
          } else if (errorMessage.includes("Unsupported file format") || 
                     errorMessage.includes("file format")) {
            errorMessage = "Unsupported file format. Only CSV, XLS, and XLSX are allowed.";
          }
        } catch {
          // If we can't parse the error response, use the status text
          if (response.statusText) {
            errorMessage = `Upload failed: ${response.statusText}`;
          }
        }
        
        if (onError) onError(errorMessage);
        setMessage({ type: "error", text: errorMessage });
      }
    } catch {
      if (onError) onError("Network error. Please check your connection and try again.");
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="w-full max-w-sm sm:max-w-[560px] md:max-w-[800px] mx-auto bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 px-8 py-6 relative">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-xl md:text-2xl font-semibold text-white mb-1">Employee Data Management</h1>
              <p className="text-blue-100 text-sm md:text-base">Download templates or upload employee data files</p>
            </div>
          </div>
        </div>

        {/* Content - Balanced two-column layout */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8">
            {/* Left: Download Card - 35% width */}
            <div className="flex flex-col">
              <div className="bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900 rounded-xl p-6 h-full flex flex-col items-center justify-center text-center space-y-6">
                {/* Icon */}
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                  <FaDownload className="text-white text-2xl" />
                </div>
                
                {/* Content */}
                <div className="space-y-3">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Download Master Template</h2>
                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                    Get the standardized template to ensure your employee data uploads are formatted correctly
                  </p>
                </div>

                {/* CTA Button */}
                <Button
                  onClick={handleDownloadTemplate}
                  className="w-full max-w-md mx-auto bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 hover:from-blue-700 hover:via-blue-800 hover:to-blue-900 text-white font-semibold h-11 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-400/50"
                >
                  <FaDownload className="mr-2 text-base" />
                  Download Template
                </Button>

                {/* Features */}
                <div className="flex items-center justify-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    <span>Excel & CSV</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    <span>Pre-formatted</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Upload Card - 65% width */}
            <div className="flex flex-col">
              <div className="bg-white dark:bg-gray-900 rounded-xl p-6 h-full flex flex-col">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                    <FaUpload className="text-white text-xl" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Upload File</h2>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">Upload your employee data file</p>
                  </div>
                </div>

                {/* Drag & Drop Zone */}
                <div className="flex-1 flex flex-col space-y-4">
                  <label
                    htmlFor="employee-file-upload"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-300 cursor-pointer group min-h-[200px] mx-auto w-full max-w-md ${
                      isDragging 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-105' 
                        : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    }`}
                    aria-label="Upload file by clicking or dragging and dropping"
                  >
                  <input
                    id="employee-file-upload"
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                  />
                  
                    {!selectedFile ? (
                      <div className="text-center space-y-4 flex flex-col items-center justify-center w-full h-full">
                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center group-hover:from-blue-100 group-hover:to-blue-200 dark:group-hover:from-blue-900/30 dark:group-hover:to-blue-800/30 transition-colors mx-auto">
                          <FaUpload className="text-gray-400 group-hover:text-blue-500 text-2xl" />
                        </div>
                        <div className="space-y-2">
                          <p className="text-base font-semibold text-gray-700 dark:text-gray-300">
                            Drag & drop your file here
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            or <span className="text-blue-600 dark:text-blue-400 font-medium">click to browse</span>
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            Supports Excel (.xlsx, .xls) and CSV (.csv) files
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <FaFileAlt className="text-blue-600 dark:text-blue-400 text-xl" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900 dark:text-white truncate" title={fileName}>
                              {truncateFileName(fileName, 35)}
                            </div>
                            <div className="mt-1 flex items-center flex-wrap gap-2 text-xs">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                                {(() => {
                                  const ext = selectedFile.name.split('.').pop()?.toLowerCase();
                                  if (ext === 'xlsx') return 'Excel (.xlsx)';
                                  if (ext === 'xls') return 'Excel (.xls)';
                                  if (ext === 'csv') return 'CSV (.csv)';
                                  return 'File';
                                })()}
                              </span>
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                                {(selectedFile.size / 1024).toFixed(1)} KB
                              </span>
                            </div>
                          </div>
                          <FaCheckCircle className="text-blue-500 text-xl" />
                        </div>
                      </div>
                    )}
                </label>

                  {/* Status Messages */}
                  {message.type && (
                    <div className={`p-4 rounded-xl flex items-center gap-3 ${
                      message.type === 'error' 
                        ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' 
                        : message.type === 'success' 
                        ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                        : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                    }`}>
                      {message.type === 'error' ? (
                        <FaExclamationCircle className="text-red-500 text-lg" />
                      ) : message.type === 'success' ? (
                        <FaCheckCircle className="text-blue-500 text-lg" />
                      ) : (
                        <FaFileAlt className="text-blue-500 text-lg" />
                      )}
                      <span className={`text-sm font-medium ${
                        message.type === 'error' 
                          ? 'text-red-700 dark:text-red-300' 
                          : message.type === 'success' 
                          ? 'text-blue-700 dark:text-blue-300'
                          : 'text-blue-700 dark:text-blue-300'
                      }`}>
                        {message.text}
                      </span>
                    </div>
                  )}

                  {/* Upload Button */}
                  <div className="flex justify-center">
                    <Button
                      onClick={handleUpload}
                      className={`w-full max-w-md h-11 px-6 rounded-xl font-semibold text-base transition-all duration-300 flex items-center justify-center ${
                        !selectedFile || uploading
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400'
                          : 'bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 hover:from-blue-700 hover:via-blue-800 hover:to-blue-900 text-white shadow-lg hover:shadow-xl'
                      }`}
                      disabled={!selectedFile || uploading}
                      aria-disabled={!selectedFile || uploading}
                    >
                      {uploading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Uploading...
                        </>
                      ) : (
                        <>
                          <FaUpload className="mr-2 text-base" />
                          Upload File
                        </>
                      )}
                    </Button>
                  </div>

                  {/* File Format Info */}
                  <div className="text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Supported formats: <span className="font-medium">.xlsx</span>, <span className="font-medium">.xls</span>, <span className="font-medium">.csv</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default EmployeeUploadModal;
