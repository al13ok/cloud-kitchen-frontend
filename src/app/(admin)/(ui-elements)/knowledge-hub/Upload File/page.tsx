"use client";

import DashboardHeader from "@/components/header/DashboardHeader";
import { UploadIcon } from "@/icons";
import { TrashBinIcon } from "@/icons";
import React, { useEffect, useState, useRef, useCallback } from "react";
import Button from "@/components/ui/button/Button";
import { Table, TableHeader, TableBody, TableCell, TableRow } from "@/components/ui/table";
import Alert from "@/components/ui/alert/Alert";
import { useAlert } from '@/context/AlertContext';
import { BACKEND_URL } from '@/utils/api';
import { Modal } from '@/components/ui/modal';
import { Upload } from "lucide-react";

// Client metadata alternative

interface FileInfo {
  filename: string;
  size_bytes: number;
  upload_date: string;
  path: string;
  domain: string;
}

interface ComponentState {
  documents: FileInfo[];
  isLoading: boolean;
  error: string | null;
  lastFetchTime: number;
  isUploading: boolean;
  isDeleting: boolean;
}

const CACHE_KEY = 'fileManagementPage_state';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

// Add this mapping at the top, after imports
const domainDisplayNames: Record<string, string> = {
  domain_1: 'Employee',
  domain_2: 'Customer',
  domain_3: 'Organisation',
};

export default function FileManagementPage() {
  const { showAlert } = useAlert();
  const [documents, setDocuments] = useState<FileInfo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const cachedData = sessionStorage.getItem(CACHE_KEY);
      if (cachedData) {
        const parsedData: ComponentState = JSON.parse(cachedData);
        return parsedData.isLoading;
      }
    }
    return true;
  });
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const cachedData = sessionStorage.getItem(CACHE_KEY);
      if (cachedData) {
        const parsedData: ComponentState = JSON.parse(cachedData);
        return parsedData.isUploading;
      }
    }
    return false;
  });
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New state variables for deletion
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState<boolean>(false);
  const [fileToDelete, setFileToDelete] = useState<{ filename: string, domain: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const cachedData = sessionStorage.getItem(CACHE_KEY);
      if (cachedData) {
        const parsedData: ComponentState = JSON.parse(cachedData);
        return parsedData.isDeleting;
      }
    }
    return false;
  });
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);

  // Add state for selected domain
  const [selectedDomain, setSelectedDomain] = useState('domain_1'); // default

  // Add new state for countdown
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Add new state for processing countdown
  const [processingCountdown, setProcessingCountdown] = useState<number | null>(null);
  const processingCountdownRef = useRef<NodeJS.Timeout | null>(null);

  // Add new state for documents loading countdown
  const [documentsCountdown, setDocumentsCountdown] = useState<number | null>(null);
  const documentsCountdownRef = useRef<NodeJS.Timeout | null>(null);

  // Add new state for delete processing countdown
  const [deleteProcessingCountdown, setDeleteProcessingCountdown] = useState<number | null>(null);
  const deleteProcessingCountdownRef = useRef<NodeJS.Timeout | null>(null);

  // Add state for upload spinner
  const [showUploadSpinner, setShowUploadSpinner] = useState(false);

  // Add state for preview
  const [previewFile, setPreviewFile] = useState<{ filename: string, domain: string } | null>(null);

  // Start documents countdown when isLoading becomes true
  useEffect(() => {
    if (isLoading) {
      setDocumentsCountdown(5);
    } else {
      setDocumentsCountdown(null);
      if (documentsCountdownRef.current) clearTimeout(documentsCountdownRef.current);
    }
  }, [isLoading]);

  useEffect(() => {
    if (documentsCountdown === null) return;
    if (documentsCountdown === 0) {
      setDocumentsCountdown(null);
      return;
    }
    documentsCountdownRef.current = setTimeout(() => {
      setDocumentsCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => {
      if (documentsCountdownRef.current) clearTimeout(documentsCountdownRef.current);
    };
  }, [documentsCountdown]);

  const fetchDocuments = useCallback(async (showLoadingState: boolean = true) => {
    try {
      if (showLoadingState) {
        setIsLoading(true);
      }

      // Fetch all domain files
      const response = await fetch(`${BACKEND_URL}/all-domains/files`, {
        headers: {
          'accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to fetch documents with status: ${response.status}`);
      }

      const data = await response.json(); // { domain_1: [...], domain_2: [...], ... }
      // Flatten all files into a single array, adding domain info
      const allFiles: FileInfo[] = [];
      for (const [domain, files] of Object.entries(data)) {
        (files as FileInfo[]).forEach(file => allFiles.push({ ...file, domain }));
      }
      setDocuments(allFiles);
      setError(null);
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsLoading(false);
    }
  }, []);

  // Load cached state on component mount
  useEffect(() => {
    const loadCachedState = () => {
      try {
        const cachedData = sessionStorage.getItem(CACHE_KEY);
        if (cachedData) {
          const parsedData: ComponentState = JSON.parse(cachedData);
          const now = Date.now();

          // Check if cache is still valid
          if (now - parsedData.lastFetchTime < CACHE_DURATION) {
            setDocuments(parsedData.documents);
            setError(parsedData.error);
            return true; // Cache loaded successfully
          }
        }
      } catch (err) {
        console.error('Error loading cached state:', err);
      }
      return false; // No valid cache found
    };

    // Try to load from cache first
    const cacheLoaded = loadCachedState();

    // If no valid cache, fetch fresh data
    if (!cacheLoaded) {
      fetchDocuments();
    } else {
      // If cache is loaded but we want to ensure freshness, 
      // we can still fetch in background without showing loading state
      fetchDocuments(false);
    }
  }, [fetchDocuments]);

  // Save state to cache whenever relevant state changes
  useEffect(() => {
    const stateToCache: ComponentState = {
      documents,
      isLoading,
      error,
      lastFetchTime: Date.now(),
      isUploading,
      isDeleting
    };

    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(stateToCache));
    } catch (err) {
      console.error('Error saving state to cache:', err);
    }
  }, [documents, isLoading, error, isUploading, isDeleting]);

  // Clear loading states when component unmounts
  useEffect(() => {
    return () => {
      // Don't clear loading states on unmount anymore
      // This allows them to persist across tab changes
    };
  }, []);

  // Add visibility change handler
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Refresh the state from sessionStorage when tab becomes visible
        const cachedData = sessionStorage.getItem(CACHE_KEY);
        if (cachedData) {
          const parsedData: ComponentState = JSON.parse(cachedData);
          setIsLoading(parsedData.isLoading);
          setIsUploading(parsedData.isUploading);
          setIsDeleting(parsedData.isDeleting);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Start delete processing countdown when isDeleting becomes true
  useEffect(() => {
    if (isDeleting) {
      setDeleteProcessingCountdown(5);
    } else {
      setDeleteProcessingCountdown(null);
      if (deleteProcessingCountdownRef.current) clearTimeout(deleteProcessingCountdownRef.current);
    }
  }, [isDeleting]);

  const actualDelete = useCallback(async () => {
    if (!fileToDelete) return;
    try {
      // Test connection first
      try {
        const healthResponse = await fetch(`${BACKEND_URL}/health`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        if (!healthResponse.ok) {
          throw new Error('Backend server is not responding. Please ensure the backend is running on port 8000.');
        }
      } catch {
        throw new Error('Cannot connect to backend server. Please ensure the backend is running on port 8000.');
      }

      // Use the correct domain for deletion
      const response = await fetch(`${BACKEND_URL}/domain/${fileToDelete.domain}/files`, {
        method: 'DELETE',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          filenames: [fileToDelete.filename]
        })
      });

      // If 404, treat as success (file already deleted)
      if (!response.ok && response.status !== 404) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Delete failed with status: ${response.status}`);
      }
      if (response.status === 404) {
        showAlert('File was already deleted.', 'info');
      }
      await fetchDocuments();
      setIsDeleting(false);
      setFileToDelete(null);
    } catch {
      setIsDeleting(false);
      // handle error
    }
  }, [fileToDelete, showAlert, fetchDocuments, setIsDeleting]);

  // Effect to handle delete processing countdown and trigger actual delete
  useEffect(() => {
    if (deleteProcessingCountdown === null) return;
    if (deleteProcessingCountdown === 0) {
      setDeleteProcessingCountdown(null);
      actualDelete(); // Call the real delete logic
      return;
    }
    deleteProcessingCountdownRef.current = setTimeout(() => {
      setDeleteProcessingCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => {
      if (deleteProcessingCountdownRef.current) clearTimeout(deleteProcessingCountdownRef.current);
    };
  }, [deleteProcessingCountdown, actualDelete]);

  // Clear cache when user manually refreshes or when needed
  const clearCache = useCallback(() => {
    try {
      sessionStorage.removeItem(CACHE_KEY);
      // Also clear any other related items
      sessionStorage.removeItem('uploadState');
      sessionStorage.removeItem('deleteState');
    } catch (err) {
      console.error('Error clearing cache:', err);
    }
  }, []);

  // Force refresh function
  const forceRefresh = () => {
    clearCache();
    fetchDocuments();
  };

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/pdf', // .pdf
      'text/plain', // .txt
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' // .xlsx
    ];

    if (!allowedTypes.includes(file.type)) {
      alert('Please upload only .docx, .pdf, .txt, or .xlsx files');
      return;
    }

    // Store the selected file without uploading it yet
    setSelectedFile(file);
    // Reset file input for future selections
    e.target.value = '';
  };

  const handleConfirmUpload = useCallback(() => {
    setShowModal(false);
    setProcessingCountdown(5); // Start countdown
    setShowUploadSpinner(false); // Reset spinner state
  }, []);

  const doActualUpload = useCallback(async () => {
    if (!selectedFile) return;
    try {
      const formData = new FormData();
      formData.append('files', selectedFile);

      console.log('Upload attempt - Domain:', selectedDomain);

      // Test connection first
      try {
        console.log('Testing health endpoint...');
        const healthResponse = await fetch(`${BACKEND_URL}/health`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        console.log('Health response status:', healthResponse.status);
        
        if (!healthResponse.ok) {
          throw new Error('Backend server is not responding. Please ensure the backend is running on port 8000.');
        }
      } catch {
        throw new Error('Cannot connect to backend server. Please ensure the backend is running on port 8000.');
      }

      console.log('Attempting file upload...');
      const response = await fetch(`${BACKEND_URL}/domain/${selectedDomain}/upload`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
        },
        body: formData
      });

      console.log('Upload response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Upload failed with status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Upload successful:', result);
      showAlert(result.message, 'success');
      setShowModal(true);
      setIsUploading(false);
      setShowUploadSpinner(false); // Hide spinner after upload
      setSelectedFile(null);
      clearCache();
      await fetchDocuments();
    } catch (err) {
      console.error('Error uploading file:', err);
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      showAlert(errorMessage, 'error');
      setIsUploading(false);
      setShowUploadSpinner(false); // Hide spinner on error
    }
  }, [selectedFile, selectedDomain, showAlert, clearCache, fetchDocuments]);

  // Effect to handle processing countdown and trigger actual upload
  useEffect(() => {
    if (processingCountdown === null) return;
    if (processingCountdown === 0) {
      setProcessingCountdown(null);
      setShowUploadSpinner(true); // Show spinner/loading message
      setIsUploading(true);
      doActualUpload(); // Call the real upload logic
      return;
    }
    processingCountdownRef.current = setTimeout(() => {
      setProcessingCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => {
      if (processingCountdownRef.current) clearTimeout(processingCountdownRef.current);
    };
  }, [processingCountdown, doActualUpload, setIsUploading, setShowUploadSpinner]);

  const handleStartCountdown = () => {
    setCountdown(15);
  };

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      setCountdown(null);
      handleConfirmUpload();
      return;
    }
    countdownRef.current = setTimeout(() => {
      setCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => {
      if (countdownRef.current) clearTimeout(countdownRef.current);
    };
  }, [countdown, handleConfirmUpload]);

  const handleCancelUpload = () => {
    setSelectedFile(null);
    setCountdown(null);
    if (countdownRef.current) clearTimeout(countdownRef.current);
  };

  const closeModal = () => {
    setShowModal(false);
    setUploadSuccess(null);
    setDeleteSuccess(null);
    setIsUploading(false);
    setIsDeleting(false);
    setFileToDelete(null);
    setSelectedFile(null);
    
    // Clear the cache to ensure states are reset
    clearCache();
  };

  // New functions for deletion
  const handleDeleteClick = (filename: string, domain: string) => {
    setFileToDelete({ filename, domain });
    setShowDeleteConfirmation(true);
  };

  const handleConfirmDelete = async () => {
    if (!fileToDelete) return;
    setShowDeleteConfirmation(false);
    setDeleteProcessingCountdown(5); // Start countdown
    setIsDeleting(true);
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirmation(false);
    setDeleteProcessingCountdown(null);
    setIsDeleting(false);
    setFileToDelete(null);
  };

  // Add a cleanup effect
  useEffect(() => {
    return () => {
      // Clear all states when component unmounts
      setIsUploading(false);
      setIsDeleting(false);
      setShowModal(false);
      setUploadSuccess(null);
      setDeleteSuccess(null);
      setFileToDelete(null);
      setSelectedFile(null);
      clearCache();
    };
  }, [clearCache]);

  return (
    <div>
      <div className="mb-6">
        <DashboardHeader
          title="Knowledge Hub"
          subtitle="Upload knowledge base files to the selected domain and monitor processing status."
          icon={Upload}
          gradientFrom="from-blue-900"
          gradientTo="to-indigo-800"
          actions={null}
        />
      </div>
      <div className="space-y-5 sm:space-y-6">
        {/* Success Alert */}
        {uploadSuccess && (
          <Alert
            variant="success"
            title="Success"
            message={uploadSuccess}
            showLink={false}
          />
        )}

        {/* Error Alert */}
        {error && (
          <Alert
            variant="error"
            title="Error"
            message={error}
            showLink={false}
          />
        )}

        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="px-6 py-5 flex flex-col gap-4 md:flex-row justify-between items-center">

            <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
              Uploaded Files
            </h3>
            <div className="flex items-center gap-2 mb-2">
              <label htmlFor="domain-select" className="mr-2 font-medium">Upload to Domain:</label>
              <select
                id="domain-select"
                value={selectedDomain}
                onChange={e => setSelectedDomain(e.target.value)}
                className="border rounded px-2 py-1"
              >
                <option value="domain_1">Employee</option>
                <option value="domain_2">Customer</option>
                <option value="domain_3">Organisation</option>
              </select>
              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".docx,.pdf,.txt,.xlsx"
                className="hidden"
              />
              <Button
                size="md"
                variant="primary"
                onClick={handleUploadClick}
                disabled={isUploading || !!selectedFile}
              >
                {isUploading ? 'Uploading...' : 'Select File'}
                {!isUploading && <UploadIcon className="w-5 h-4 text-white ml-2" />}
              </Button>
            </div>
            <Button
              size="md"
              variant="primary"
              onClick={forceRefresh}
              disabled={isLoading}
            >
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
          <div className="p-6 border-t border-gray-100 dark:border-gray-800 xl:p-10">
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
              <div className="max-w-full overflow-x-auto">
                <div className="min-w-[1102px]">
                  <Table>
                    {/* Table Header */}
                    <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                      <TableRow>
                        <TableCell
                          isHeader
                          className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                        >
                          Document Name
                        </TableCell>
                        <TableCell
                          isHeader
                          className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                        >
                          Type
                        </TableCell>
                        <TableCell
                          isHeader
                          className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                        >
                          Size
                        </TableCell>
                        <TableCell
                          isHeader
                          className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                        >
                          Domain
                        </TableCell>
                        <TableCell
                          isHeader
                          className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                        >
                          Actions
                        </TableCell>
                      </TableRow>
                    </TableHeader>

                    {/* Table Body */}
                    <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                      {isLoading ? (
                        <TableRow>
                          <TableCell className="px-5 py-4 text-center text-gray-500">
                            {documentsCountdown !== null
                              ? `Loading documents in ${documentsCountdown}s...`
                              : 'Loading documents...'}
                          </TableCell>
                          <TableCell className="px-5 py-4">{''}</TableCell>
                          <TableCell className="px-5 py-4">{''}</TableCell>
                          <TableCell className="px-5 py-4">{''}</TableCell>
                          <TableCell className="px-5 py-4">{''}</TableCell>
                        </TableRow>
                      ) : error ? (
                        <TableRow>
                          <TableCell className="px-5 py-4 text-center text-red-500">
                            Error: {error}
                          </TableCell>
                          <TableCell className="px-5 py-4">{''}</TableCell>
                          <TableCell className="px-5 py-4">{''}</TableCell>
                          <TableCell className="px-5 py-4">{''}</TableCell>
                          <TableCell className="px-5 py-4">{''}</TableCell>
                        </TableRow>
                      ) : documents.length === 0 ? (
                        <TableRow>
                          <TableCell className="px-5 py-4 text-center text-gray-500">
                            No documents available
                          </TableCell>
                          <TableCell className="px-5 py-4">{''}</TableCell>
                          <TableCell className="px-5 py-4">{''}</TableCell>
                          <TableCell className="px-5 py-4">{''}</TableCell>
                          <TableCell className="px-5 py-4">{''}</TableCell>
                        </TableRow>
                      ) : (
                        documents.map((doc, index) => (
                          <TableRow key={index}>
                            <TableCell className="px-5 py-4 sm:px-6 text-start">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-md bg-blue-100">
                                  <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                  </svg>
                                </div>
                                <span className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                                  {doc.filename}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                              {doc.filename.split('.').pop()?.toUpperCase() || 'Unknown'}
                            </TableCell>
                            <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                              {(doc.size_bytes / 1024).toFixed(2)} KB
                            </TableCell>
                            <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                              <span style={{
                                color: doc.domain === 'domain_1' ? '#2563eb' : doc.domain === 'domain_2' ? '#059669' : doc.domain === 'domain_3' ? '#d97706' : '#6b7280',
                                fontWeight: 'bold',
                              }}>
                                {domainDisplayNames[doc.domain] || doc.domain}
                              </span>
                            </TableCell>
                            <TableCell className="px-4 py-3 text-start">
                              <button
                                onClick={() => handleDeleteClick(doc.filename, doc.domain)}
                                className="p-2 text-red-500 hover:text-red-700 transition-colors duration-200"
                              >
                                <TrashBinIcon className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => setPreviewFile({ filename: doc.filename, domain: doc.domain })}
                                className="ml-2 p-2 text-blue-500 hover:text-blue-700 transition-colors duration-200"
                              >
                                Preview
                              </button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Upload Files Section - Only shown when a file is selected */}
      {selectedFile && (
        <div className="space-y-5 sm:space-y-6 mt-10">
          <div className="rounded-2xl border border-gray-200 bg-white  dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="px-6 py-5">
              <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
                Confirm Upload Files
              </h3>
            </div>
            <div className="p-6 border-t border-gray-100 dark:border-gray-800 xl:p-10 flex flex-col gap-8 md:flex-row items-center justify-between">
              <div className="flex items-center">
                <div className="p-2 rounded-md bg-blue-100 mr-3">
                  <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-800">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  size="md"
                  variant="outline"
                  onClick={handleCancelUpload}
                  disabled={isUploading}
                >
                  Cancel
                </Button>
                <Button
                  size="md"
                  variant="primary"
                  onClick={countdown === null ? handleStartCountdown : undefined}
                  disabled={isUploading || countdown !== null}
                >
                  {isUploading
                    ? 'Uploading...'
                    : countdown !== null
                      ? `Uploading in ${countdown}s...`
                      : 'Confirm Upload'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Processing Section */}
      {(processingCountdown !== null || showUploadSpinner) && (
        <div className="space-y-5 sm:space-y-6 mt-10">
          <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="px-6 py-5">
              <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
                Processing Upload
              </h3>
            </div>
            <div className="p-6 border-t border-gray-100 dark:border-gray-800 xl:p-10 flex flex-col items-center justify-center">
              {processingCountdown !== null ? (
                <>
                  <div className="w-16 h-16 border-4 border-t-blue-500 border-b-blue-500 border-l-gray-200 border-r-gray-200 rounded-full animate-spin mb-4"></div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Please wait</h4>
                  <p className="text-gray-600 text-center">
                    Upload will start in {processingCountdown}s...
                  </p>
                </>
              ) : showUploadSpinner ? (
                <>
                  <div className="w-16 h-16 border-4 border-t-blue-500 border-b-blue-500 border-l-gray-200 border-r-gray-200 rounded-full animate-spin mb-4"></div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Please wait</h4>
                  <p className="text-gray-600 text-center">
                    Your file is being prepared...
                  </p>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Delete Processing Section */}
      {isDeleting && (
        <div className="space-y-5 sm:space-y-6 mt-10">
          <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="px-6 py-5">
              <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
                Processing Deletion
              </h3>
            </div>
            <div className="p-6 border-t border-gray-100 dark:border-gray-800 xl:p-10 flex flex-col items-center justify-center">
              <div className="w-16 h-16 border-4 border-t-red-500 border-b-red-500 border-l-gray-200 border-r-gray-200 rounded-full animate-spin mb-4"></div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">Please wait</h4>
              {deleteProcessingCountdown !== null ? (
                <p className="text-gray-600 text-center">
                  Deletion will start in {deleteProcessingCountdown}s...
                </p>
              ) : (
                <p className="text-gray-600 text-center">
                  Your files are being processed...
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <div className="flex flex-col">
              <div className="flex items-center mb-4">
                <div className="rounded-full bg-red-100 p-2 mr-3">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900">Confirm Deletion</h3>
              </div>
              <p className="text-gray-600 mb-4">Are you sure you want to delete the file &quot;{fileToDelete?.filename}&quot;?</p>
              <div className="flex justify-end gap-3">
                <Button
                  size="md"
                  variant="outline"
                  onClick={handleCancelDelete}
                >
                  Cancel
                </Button>
                <Button
                  size="md"
                  variant="danger"
                  onClick={handleConfirmDelete}
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal (for both upload and delete) */}
      {showModal && (uploadSuccess || deleteSuccess) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <div className="flex flex-col">
              <div className="flex items-center mb-4">
                <div className="rounded-full bg-green-100 p-2 mr-3">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900">
                  {uploadSuccess ? 'Upload Successful' : 'Delete Successful'}
                </h3>
              </div>
              <p className="text-gray-600 mb-4">{uploadSuccess || deleteSuccess}</p>
              <div className="flex justify-end">
                <Button
                  size="md"
                  variant="primary"
                  onClick={closeModal}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewFile && (
        <Modal isOpen={!!previewFile} onClose={() => setPreviewFile(null)}>
          <div style={{ width: '80vw', height: '80vh' }}>
            <h3 className="text-lg font-medium mb-4">Preview: {previewFile.filename}</h3>
            {previewFile.filename.match(/\.(pdf|png|jpg|jpeg)$/i) ? (
              <iframe
                src={`${BACKEND_URL}/domain/${previewFile.domain}/file/${previewFile.filename}`}
                width="100%"
                height="600px"
                title={previewFile.filename}
                style={{ border: 'none' }}
              />
            ) : (
              <a
                href={`${BACKEND_URL}/domain/${previewFile.domain}/file/${previewFile.filename}`}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="text-blue-600 underline"
              >
                Download {previewFile.filename}
              </a>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
} 
