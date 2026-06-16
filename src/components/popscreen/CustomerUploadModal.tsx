import React, { useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import { FaDownload, FaUpload } from "react-icons/fa";

 

 

 

interface CustomerUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

 

 

 

const CustomerUploadModal: React.FC<CustomerUploadModalProps> = ({ isOpen, onClose, onUploadSuccess, onError }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Use a unique ID per render to avoid collisions with other modals using the same input id
  const inputId = React.useId();
  const [fileName, setFileName] = useState("No file chosen");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

 

 

 

  const handleDownloadTemplate = async () => {
    const url = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/template/customers/?format=excel`;
    try {
      const response = await fetch(url, { method: "GET", headers: { accept: "application/json" } });
      if (!response.ok) throw new Error("Failed to download template");
      const blob = await response.blob();
      // Generate timestamp in DD-MM-YYYY_HH-MM-SS
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const timestamp = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
      const fileName = `Customer_Template_${timestamp}.xlsx`;
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
      if (onError) onError("Failed to download customer template. Please try again.");
      onClose();
    }
  };

 

 

 

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setSelectedFile(file);
    } else {
      setFileName("No file chosen");
      setSelectedFile(null);
    }
  };

 

 

 

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", selectedFile);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/upload-customers/`,
        {
          method: "POST",
          body: formData,
        }
      );
      if (response.ok) {
        if (onUploadSuccess) onUploadSuccess(`File uploaded: ${selectedFile.name}`); // alert for upload only
        setFileName("No file chosen");
        setSelectedFile(null);
        onClose();
      } else {
        if (onError) onError("Failed to upload customer file. Please try again.");
        onClose();
      }
    } catch {
      if (onError) onError("Failed to upload customer file. Please try again.");
      onClose();
    } finally {
      setUploading(false);
    }
  };
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="w-full max-w-2xl mx-auto bg-white dark:bg-[#181E2A] rounded-2xl flex flex-col md:flex-row overflow-hidden shadow-lg max-h-[90vh] md:max-h-[80vh]">
        {/* Left: Download Panel */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 bg-gradient-to-b from-blue-50/60 to-white dark:from-blue-900/30 dark:to-[#181E2A] min-h-[180px]">
          <div className="flex flex-col items-center w-full h-full justify-between">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900 mb-4">
              <FaDownload className="text-blue-500 text-3xl" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 text-center">Download Master Template</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 text-center">
              Use this template to upload customer data to the CRM.
            </p>
            <Button
              onClick={handleDownloadTemplate}
              className="w-full max-w-[240px] rounded-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-6 shadow-sm transition mb-0"
            >
              <FaDownload className="mr-2" /> Download Template
            </Button>
          </div>
        </div>
        {/* Right: Upload Panel */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 bg-white dark:bg-[#181E2A] border-t md:border-t-0 md:border-l border-gray-100 dark:border-gray-800 min-h-[180px]">
          <div className="flex flex-col items-center w-full">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900 mb-4">
              <FaUpload className="text-blue-500 text-3xl" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center">Upload File</h2>
            <label
              htmlFor={inputId}
              className="w-full flex flex-col items-center justify-center border-2 border-dashed border-blue-200 dark:border-blue-700 rounded-lg p-4 cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition mb-4"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                id={inputId}
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.xlsx,.csv,.txt"
                className="hidden"
              />
              <span className="text-gray-500 dark:text-gray-400 text-sm mb-1">
                {fileName}
              </span>
              <span className="text-blue-500 dark:text-blue-400 text-xs">Choose Excel (.xlsx) or CSV (.csv) file</span>
            </label>
            <Button
              onClick={handleUpload}
              className="w-full rounded-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-6 shadow-sm transition flex items-center justify-center text-base sm:text-lg"
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

 

 

 

export default CustomerUploadModal; 
