import React, { useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import { FaDownload, FaUpload } from "react-icons/fa";

interface ContactUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

const ContactUploadModal: React.FC<ContactUploadModalProps> = ({ isOpen, onClose, onSuccess, onError }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("No file chosen");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleDownloadTemplate = async () => {
    try {
      const { contactService } = await import("../../services/contactService");
      const { blob, filename } = await contactService.downloadTemplate();
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = filename || "contacts_template.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(link.href);
      if (onSuccess) {
        onSuccess(`File downloaded: ${link.download}`);
      }
      onClose();
    } catch {
      if (onError) {
        onError("Failed to download contact template. Please try again.");
      }
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
    try {
      const { contactService } = await import("../../services/contactService");
      await contactService.uploadBulk(selectedFile);
      if (onSuccess) {
        onSuccess(`File uploaded: ${selectedFile.name}`);
      }
      setFileName("No file chosen");
      setSelectedFile(null);
      onClose();
    } catch {
      if (onError) {
        onError("Failed to upload contacts file. Please try again.");
      }
      onClose();
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    // accept only CSV
    if (!/\.csv$/i.test(file.name)) {
      if (onError) {
        onError("Please drop a CSV (.csv) file");
      }
      return;
    }
    setSelectedFile(file);
    setFileName(file.name);
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
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 text-center">Download Contact Template</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 text-center">
              Use this template to upload contact data to the CRM.
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
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center">Upload Contacts</h2>
            <label
              htmlFor="contacts-file-upload"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`w-full flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-4 cursor-pointer transition mb-4 ${
                isDragging ? 'border-blue-500 bg-blue-50/40 dark:border-blue-500 dark:bg-blue-900/20' : 'border-blue-200 dark:border-blue-700 hover:border-blue-400 dark:hover:border-blue-500'
              }`}
            >
              <input
                id="contacts-file-upload"
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".csv"
                className="hidden"
              />
              <span className="text-gray-500 dark:text-gray-400 text-sm mb-1">
                {fileName}
              </span>
              <span className="text-blue-500 dark:text-blue-400 text-xs">Drag & drop CSV here, or click to browse</span>
            </label>
            <Button
              onClick={handleUpload}
              className="w-full rounded-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-6 shadow-sm transition flex items-center justify-center text-base sm:text-lg"
              disabled={!selectedFile || uploading}
            >
              <FaUpload className="mr-2" /> {uploading ? "Uploading..." : "Upload"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ContactUploadModal;


