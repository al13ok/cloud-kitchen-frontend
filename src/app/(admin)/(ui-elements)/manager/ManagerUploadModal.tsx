import React, { useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import { FaDownload, FaUpload } from "react-icons/fa";

interface ManagerUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

const ManagerUploadModal: React.FC<ManagerUploadModalProps> = ({ isOpen, onClose, onUploadSuccess, onError }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

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
    const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/template/manager/?format=excel`;
    try {
      const response = await fetch(url, { method: "GET", headers: { accept: "application/json" } });
      if (!response.ok) throw new Error("Failed to download template");
      const blob = await response.blob();
      // Generate timestamp in YYYYMMDD_HHMM
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
      const fileName = `CV_manager_list_${timestamp}.xlsx`;
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(link.href);
      if (onUploadSuccess) onUploadSuccess(`File downloaded: ${fileName}`);
      onClose();
    } catch {
      if (onError) onError("Failed to download Manager template. Please try again.");
      onClose();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file format
      if (!validateFileFormat(file)) {
        if (onError) onError("Unsupported file format. Only CSV, XLS, and XLSX are allowed.");
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      
      setSelectedFile(file);
    } else {
      setSelectedFile(null);
    }
  };

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
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/upload-manager/`,
        {
          method: "POST",
          body: formData,
        }
      );
      
      if (response.ok) {
        if (onUploadSuccess) onUploadSuccess(`File uploaded: ${selectedFile.name}`);
        setSelectedFile(null);
        onClose();
      } else {
        // Handle different error responses from backend
        let errorMessage = "Failed to upload Manager file. Please try again.";
        
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
          
          // Handle specific error cases for Manager
          if (errorMessage.includes("Missing required columns") || 
              errorMessage.includes("department") || 
              errorMessage.includes("manager_id") || 
              errorMessage.includes("email") || 
              errorMessage.includes("full_name")) {
            errorMessage = "Missing required columns: department, manager_id, email, full_name";
          } else if (errorMessage.includes("Invalid manager_id format") || 
                     errorMessage.includes("manager_id must be alphanumeric")) {
            errorMessage = "Manager ID can contain letters, numbers, and hyphens (-)";
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
      }
    } catch {
      if (onError) onError("Network error. Please check your connection and try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="w-full max-w-2xl mx-auto bg-white dark:bg-[#181E2A] rounded-2xl flex flex-col md:flex-row overflow-hidden max-h-[90vh] md:max-h-[80vh]">
        {/* Left: Download Panel */}
        <div className="flex-1 flex flex-col items-center justify-between p-4 sm:p-8 bg-gradient-to-b from-blue-50/60 to-white dark:from-blue-900/30 dark:to-[#181E2A] min-h-[180px]">
          <div className="flex flex-col items-center w-full">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900 mb-4">
              <FaDownload className="text-blue-500 text-3xl" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center">Download Master Template</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 text-center">
              Use this template to upload Manager data to the CRM.
            </p>
          </div>
          <Button
            onClick={handleDownloadTemplate}
            className="w-full rounded-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-6 transition flex items-center justify-center"
          >
            <FaDownload className="mr-2" /> Download Template
          </Button>
        </div>
        {/* Right: Upload Panel */}
        <div className="flex-1 flex flex-col items-center justify-between p-4 sm:p-8 bg-white dark:bg-[#181E2A] border-t md:border-t-0 md:border-l border-gray-100 dark:border-gray-800 min-h-[180px]">
          <div className="flex flex-col items-center w-full">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900 mb-4">
              <FaUpload className="text-blue-500 text-3xl" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center">Upload File</h2>
            <label
              htmlFor="file-upload"
              className="w-full flex flex-col items-center justify-center border-2 border-dashed border-blue-200 dark:border-blue-700 rounded-lg p-4 cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition mb-4"
            >
              <input
                id="file-upload"
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".xlsx,.xls,.csv"
                className="hidden"
              />
              <span className="text-gray-500 dark:text-gray-400 text-sm mb-1 max-w-full truncate" title={selectedFile ? selectedFile.name : "No file chosen"}>
                {selectedFile ? truncateFileName(selectedFile.name) : "No file chosen"}
              </span>
              <span className="text-blue-500 dark:text-blue-400 text-xs">
                Choose Excel (.xlsx, .xls) or CSV (.csv) file
              </span>
            </label>
            <Button
              onClick={handleUpload}
              className="w-full rounded-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-6 transition flex items-center justify-center text-base sm:text-lg"
              disabled={!selectedFile || uploading}
            >
              <FaUpload className="mr-2" /> {uploading ? "Uploading..." : "Upload File"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ManagerUploadModal;

