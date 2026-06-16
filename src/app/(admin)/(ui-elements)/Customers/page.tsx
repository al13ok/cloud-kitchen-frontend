"use client";

import React, { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { FaFileExcel, FaFilePdf, FaFileWord, FaFileAlt, FaUpload, FaSync, FaTrash, FaSearch } from "react-icons/fa";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import Alert from "@/components/ui/alert/Alert";
import Loader from "@/components/Loader";

interface DocumentItem {
  id: number;
  doc_id: string;  // RAG document ID for API operations
  name: string;
  type: string;
  size: string;
  fileType: string;
  downloadUrl: string;
  uploadedAt: string;
  uploadedTimeMs?: number;
  status: string;
  chunkCount: number;
}

const getFileIcon = (fileType: string | undefined) => {
  if (!fileType) return <FaFileAlt className="text-gray-500" />;

  switch (fileType.toLowerCase()) {
    case "pdf":
      return <FaFilePdf className="text-blue-500" />;
    case "xlsx":
    case "xls":
      return <FaFileExcel className="text-green-500" />;
    case "docx":
    case "doc":
      return <FaFileWord className="text-blue-500" />;
    default:
      return <FaFileAlt className="text-gray-500" />;
  }
};

export default function CustomerPage() {
  const RAW_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";
  const BASE_URL = RAW_BASE_URL ? RAW_BASE_URL.replace(/\/+$/, '') : "";
  const DUPLICATE_POLICY: 'deny' | 'replace' | 'version' = (process.env.NEXT_PUBLIC_DUPLICATE_POLICY as 'deny' | 'replace' | 'version') || 'replace';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; doc_id: string; filename: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [alert, setAlert] = useState<{ show: boolean; variant: 'success' | 'error'; title: string; message: string }>({ show: false, variant: 'success', title: '', message: '' });

  // Drag and drop states
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const MAX_FILES = 10;

  // Add bulk selection state
  const [selectedFilenames, setSelectedFilenames] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  // Add responsive view state
  const [isMobileView, setIsMobileView] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Add duplicate file warning state
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [duplicateFiles, setDuplicateFiles] = useState<{ file: File; existingFile: DocumentItem }[]>([]);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredDocuments = useMemo(() => {
    if (!normalizedQuery) return documents;
    return documents.filter((doc) => {
      // Title/Content/Filename proxy: using name (filename), type/source, and downloadUrl
      const haystack = [doc.name, doc.type, doc.downloadUrl].join(" ").toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [documents, normalizedQuery]);

  // Sort state and helpers
  const [sortOption, setSortOption] = useState<'date_desc' | 'date_asc' | 'name_asc' | 'name_desc'>('date_desc');
  const sortedFilteredDocuments = useMemo(() => {
    const items = [...filteredDocuments];
    items.sort((a, b) => {
      if (sortOption === 'name_asc') return a.name.localeCompare(b.name);
      if (sortOption === 'name_desc') return b.name.localeCompare(a.name);
      const ta = typeof a.uploadedTimeMs === 'number' ? a.uploadedTimeMs : (a.uploadedAt ? Date.parse(a.uploadedAt) : -Infinity);
      const tb = typeof b.uploadedTimeMs === 'number' ? b.uploadedTimeMs : (b.uploadedAt ? Date.parse(b.uploadedAt) : -Infinity);
      return sortOption === 'date_asc' ? ta - tb : tb - ta;
    });
    return items;
  }, [filteredDocuments, sortOption]);

  // Helper to show alert and auto-hide
  const showAlert = (variant: 'success' | 'error', title: string, message: string) => {
    setAlert({ show: true, variant, title, message });
    setTimeout(() => setAlert(a => ({ ...a, show: false })), 3000);
  };

  // Helper to create a versioned filename when policy is 'version'
  const createVersionedFile = (file: File): File => {
    const dotIndex = file.name.lastIndexOf('.');
    const base = dotIndex > 0 ? file.name.substring(0, dotIndex) : file.name;
    const ext = dotIndex > 0 ? file.name.substring(dotIndex) : '';
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const timestamp = yyyy + mm + dd + "_" + hh + min;
    const newName = base + "_" + timestamp + ext;
    return new File([file], newName, { type: file.type });
  };

  // Check screen size on mount and resize
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobileView(window.innerWidth < 768);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Toggle row expansion
  const toggleRowExpansion = (fileName: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileName)) {
        newSet.delete(fileName);
      } else {
        newSet.add(fileName);
      }
      return newSet;
    });
  };

  // Mobile Card Component
  const FileCard = ({ doc }: { doc: DocumentItem }) => {
    const isExpanded = expandedRows.has(doc.name);

    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg mb-3 overflow-hidden transition-all duration-200">
        {/* Card Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                {getFileIcon(doc.fileType)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {doc.name}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {doc.size} • {doc.type}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="border-red-500 text-red-500 hover:bg-red-50 hover:border-red-600 px-2 py-1"
                onClick={() => setDeleteConfirm({ id: doc.id, doc_id: doc.doc_id, filename: doc.name })}
              >
                <FaTrash className="text-red-500 w-3 h-3" />
              </Button>
              <button
                onClick={() => toggleRowExpansion(doc.name)}
                className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                <svg
                  className={"w-4 h-4 transition-transform " + (isExpanded ? 'rotate-180' : '')}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Collapsible Content */}
        {isExpanded && (
          <div className="px-4 pb-4 space-y-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="font-medium text-gray-600 dark:text-gray-400">File Type:</span>
                <p className="text-gray-900 dark:text-white">{doc.type}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600 dark:text-gray-400">Size:</span>
                <p className="text-gray-900 dark:text-white">{doc.size}</p>
              </div>
            </div>
            <div>
              <span className="font-medium text-gray-600 dark:text-gray-400">Uploaded:</span>
              <p className="text-gray-900 dark:text-white">{doc.uploadedAt}</p>
            </div>
            <div className="pt-2">
              <a
                href={`${BASE_URL}/api/v1/rag/documents/${doc.doc_id}/download`}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download File
              </a>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Process files for upload
  const processFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files);

    // Check file count limit
    if (fileArray.length > MAX_FILES) {
      showAlert('error', 'Too Many Files', `You can only upload up to ${MAX_FILES} files at once. Please select fewer files.`);
      return;
    }

    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    const allowedExtensions = ['pdf', 'doc', 'docx'];

    const validFiles: File[] = [];
    const invalidFiles: string[] = [];

    fileArray.forEach(file => {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension || '')) {
        invalidFiles.push(file.name);
      } else {
        validFiles.push(file);
      }
    });

    if (invalidFiles.length > 0) {
      showAlert('error', 'Invalid Files', `The following files are not supported: ${invalidFiles.join(', ')}. Only PDF and Word documents (.pdf, .doc, .docx) are allowed.`);
    }

    if (validFiles.length === 0) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Check for duplicates
    const duplicateFiles: { file: File; existingFile: DocumentItem }[] = [];
    const filesToUpload: File[] = [];

    validFiles.forEach(file => {
      const existingFile = documents.find(doc =>
        doc.name.toLowerCase() === file.name.toLowerCase() ||
        doc.name.toLowerCase() === file.name.toLowerCase().replace(/\s+/g, '_')
      );

      if (existingFile) {
        if (DUPLICATE_POLICY === 'deny') {
          showAlert('error', 'Duplicate File', `A file named ${file.name} already exists. Please rename your file before uploading.`);
          return;
        }
        duplicateFiles.push({ file, existingFile });
      } else {
        filesToUpload.push(file);
      }
    });

    if (duplicateFiles.length > 0 && DUPLICATE_POLICY === 'replace') {
      // Show duplicate warning for replace policy
      setDuplicateFiles(duplicateFiles);
      setShowDuplicateWarning(true);
      setSelectedFiles(filesToUpload); // Set non-duplicate files as selected
    } else if (duplicateFiles.length > 0 && DUPLICATE_POLICY === 'version') {
      const versionedFiles = duplicateFiles.map(df => createVersionedFile(df.file));
      setSelectedFiles([...filesToUpload, ...versionedFiles]);
    } else {
      setSelectedFiles(filesToUpload);
    }

    if (filesToUpload.length > 0 || duplicateFiles.length > 0) {
      setShowConfirmModal(true);
    }

    // Close upload modal after processing files
    setShowUploadModal(false);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      processFiles(event.target.files);
    }
  };

  // Handle duplicate file upload confirmation
  const handleDuplicateUpload = () => {
    if (duplicateFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...duplicateFiles.map(df => df.file)]);
      setShowConfirmModal(true);
      setShowDuplicateWarning(false);
      setDuplicateFiles([]);
    }
  };

  // New: Handle duplicate file allow (version and proceed)
  const handleDuplicateAllow = () => {
    if (duplicateFiles.length > 0) {
      const versionedFiles = duplicateFiles.map(df => createVersionedFile(df.file));
      setSelectedFiles(prev => [...prev, ...versionedFiles]);
      setShowConfirmModal(true);
      setShowDuplicateWarning(false);
      setDuplicateFiles([]);
    }
  };

  // Handle duplicate file upload cancellation
  const handleDuplicateCancel = () => {
    setShowDuplicateWarning(false);
    setDuplicateFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Clear file input
    }
  };

  const handleSelectFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleUploadClick = () => {
    setShowUploadModal(true);
  };

  const handleCloseUploadModal = () => {
    setShowUploadModal(false);
    setSelectedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev + 1);
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev - 1);
    if (dragCounter <= 1) {
      setIsDragOver(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setDragCounter(0);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  // Remove file from selection
  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Clear all selected files
  const clearAllFiles = () => {
    setSelectedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Proceed to upload confirmation
  const proceedToUpload = () => {
    if (selectedFiles.length > 0) {
      setShowConfirmModal(true);
      setShowUploadModal(false);
    }
  };

  const handleRefreshClick = useCallback(async () => {
    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    setIsRefreshing(true);
    try {
      // Use RAG API endpoint for document listing
      const response = await fetch(`${BASE_URL}/api/v1/rag/documents?domain=tech_customer&status=active&limit=100`, {
        method: "GET",
        headers: {
          accept: "application/json",
        },
        signal: abortControllerRef.current.signal,
      });
      if (response.ok) {
        const data = await response.json();
        if (data && Array.isArray(data)) {
          const formattedDocuments = data.map((doc: {
            doc_id: string;
            original_name: string;
            domain: string;
            status: string;
            uploaded_at: string;
            embedding_status: string;
            chunk_count: number;
            tags: string[];
            metadata: object;
          }, idx: number) => {
            const timeMs = doc.uploaded_at ? Date.parse(doc.uploaded_at) : undefined;
            return {
              id: idx + 1,
              doc_id: doc.doc_id,
              name: doc.original_name,
              type: doc.embedding_status || 'pending',
              size: `${doc.chunk_count} chunks`,
              fileType: doc.original_name.split('.').pop()?.toLowerCase() || '',
              downloadUrl: `/api/v1/rag/documents/${doc.doc_id}/download`,
              uploadedAt: typeof timeMs === 'number' ? new Date(timeMs).toLocaleString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : '',
              uploadedTimeMs: timeMs,
              status: doc.status,
              chunkCount: doc.chunk_count,
            };
          });
          formattedDocuments.sort((a: DocumentItem, b: DocumentItem) => {
            const ta = typeof a.uploadedTimeMs === 'number' ? a.uploadedTimeMs : -Infinity;
            const tb = typeof b.uploadedTimeMs === 'number' ? b.uploadedTimeMs : -Infinity;
            return tb - ta;
          });
          setDocuments(formattedDocuments);
        } else {
          console.error("Invalid files data format:", data);
        }
      } else {
        console.error("Failed to fetch files:", response.status, response.statusText);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Request was cancelled');
      } else {
        console.error("Error fetching files:", error);
      }
    } finally {
      setIsRefreshing(false);
      abortControllerRef.current = null;
    }
  }, [BASE_URL]);

  // Initial data fetch
  useEffect(() => {
    handleRefreshClick();
  }, [handleRefreshClick]);

  // Cleanup effect to cancel pending requests
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Bulk selection helpers (respect filtered view)
  const isAllSelected = sortedFilteredDocuments.length > 0 && sortedFilteredDocuments.every(d => selectedFilenames.has(d.name));
  const toggleSelectAll = () => {
    setSelectedFilenames(prev => {
      if (sortedFilteredDocuments.length === 0) return new Set();
      const allVisibleSelected = sortedFilteredDocuments.every(d => prev.has(d.name));
      if (allVisibleSelected) {
        const next = new Set(prev);
        sortedFilteredDocuments.forEach(d => next.delete(d.name));
        return next;
      }
      const next = new Set(prev);
      sortedFilteredDocuments.forEach(d => next.add(d.name));
      return next;
    });
  };

  const toggleSelectOne = (filename: string) => {
    setSelectedFilenames(prev => {
      const next = new Set(prev);
      if (next.has(filename)) next.delete(filename); else next.add(filename);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedFilenames.size === 0) return;
    setIsDeleting(true);
    try {
      // Get doc_ids for selected files
      const selectedDocs = documents.filter(d => selectedFilenames.has(d.name));
      let successCount = 0;
      let failCount = 0;

      // RAG API requires individual delete calls by doc_id
      for (const doc of selectedDocs) {
        try {
          const response = await fetch(`${BASE_URL}/api/v1/rag/documents/${doc.doc_id}?hard_delete=false`, {
            method: "DELETE",
            headers: {
              accept: "application/json",
            },
          });
          if (response.ok) {
            successCount++;
          } else {
            failCount++;
          }
        } catch {
          failCount++;
        }
      }

      if (successCount > 0) {
        showAlert('success', 'Delete Successful', `${successCount} document(s) archived successfully.`);
      }
      if (failCount > 0) {
        showAlert('error', 'Partial Failure', `Failed to delete ${failCount} document(s).`);
      }
      setSelectedFilenames(new Set());
      handleRefreshClick();
    } catch {
      showAlert('error', 'Delete Failed', 'An error occurred while deleting documents.');
    } finally {
      setIsDeleting(false);
      setBulkDeleteOpen(false);
    }
  };

  const handleConfirmUpload = async () => {
    if (selectedFiles.length > 0) {
      setIsLoading(true);
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append("files", file);
      });
      formData.append("domain", "tech_customer"); // RAG API requires domain
      // Use RAG API ingest endpoint
      const uploadUrl = `${BASE_URL}/api/v1/rag/ingest`;
      try {
        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: {
            accept: "application/json",
          },
          body: formData,
        });
        if (response.ok) {
          await response.json();
          showAlert('success', 'Upload Successful', 'Files uploaded successfully.');
          handleRefreshClick();
        } else {
          const errorData = await response.json();
          showAlert('error', 'Upload Failed', errorData?.message || 'File upload failed. Please try again.');
        }
      } catch {
        showAlert('error', 'Upload Failed', 'An error occurred during file upload. Please try again.');
      } finally {
        setIsLoading(false);
        setShowConfirmModal(false);
        setSelectedFiles([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    }
  };

  const handleCancelUpload = () => {
    setShowConfirmModal(false);
    setSelectedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Clear file input
    }
  };

  // Delete single document using RAG API (by doc_id)
  const handleDeleteDocument = async (doc_id: string) => {
    setIsDeleting(true);
    try {
      // Use RAG API delete endpoint with doc_id
      const response = await fetch(`${BASE_URL}/api/v1/rag/documents/${doc_id}?hard_delete=false`, {
        method: "DELETE",
        headers: {
          accept: "application/json",
        },
      });
      if (response.ok) {
        await response.json();
        showAlert('success', 'Delete Successful', 'Document archived successfully.');
        handleRefreshClick();
      } else {
        const errorData = await response.json();
        showAlert('error', 'Delete Failed', errorData?.detail || 'Failed to delete document.');
      }
    } catch {
      showAlert('error', 'Delete Failed', 'An error occurred while deleting the document.');
    } finally {
      setIsDeleting(false);
      setDeleteConfirm(null);
    }
  };

  return (
    <div>
      {/* Enhanced Control Bar */}
      <div className="mb-8">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Search Section */}
            <div className="flex-1 max-w-md">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FaSearch className="h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search documents, files, and resources..."
                  className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Actions Section */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Sort Dropdown */}
              <div className="relative">
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as typeof sortOption)}
                  className="appearance-none px-4 py-3 pr-10 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md text-sm"
                  aria-label="Sort files"
                >
                  <option value="date_desc">Newest First</option>
                  <option value="date_asc">Oldest First</option>
                  <option value="name_asc">Name (A-Z)</option>
                  <option value="name_desc">Name (Z-A)</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* View Toggle */}
              <Button
                variant="outline"
                className="flex items-center gap-2 px-4 py-3 rounded-xl border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
                onClick={() => setIsMobileView(!isMobileView)}
                aria-label={isMobileView ? 'Switch to table view' : 'Switch to card view'}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isMobileView ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  )}
                </svg>
                <span className="hidden sm:inline">{isMobileView ? 'Table View' : 'Card View'}</span>
              </Button>

              {/* Upload Button */}
              <Button
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                onClick={handleUploadClick}
                aria-label="Upload File"
              >
                <FaUpload className="w-4 h-4" />
                <span className="hidden sm:inline">Upload File</span>
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                multiple
              />

              {/* Refresh Button */}
              <Button
                className="flex items-center gap-2 px-6 py-3 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 shadow-lg hover:shadow-xl rounded-xl"
                variant="outline"
                onClick={handleRefreshClick}
                disabled={isRefreshing}
                aria-label="Refresh"
              >
                {isRefreshing ? <Loader /> : <FaSync className="w-4 h-4" />}
                <span className="hidden sm:inline">Refresh</span>
              </Button>

              {/* Bulk Delete Button */}
              {selectedFilenames.size > 0 && (
                <Button
                  className="flex items-center gap-2 px-4 py-3 border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-400 dark:hover:border-red-500 transition-all duration-200 shadow-lg hover:shadow-xl rounded-xl"
                  variant="outline"
                  onClick={() => setBulkDeleteOpen(true)}
                  aria-label="Delete selected"
                >
                  <FaTrash className="w-4 h-4" />
                  <span className="hidden sm:inline">Delete Selected ({selectedFilenames.size})</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Table Container */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white/90 via-blue-50/40 to-indigo-50/40 dark:from-gray-800/90 dark:via-blue-900/20 dark:to-indigo-900/20 backdrop-blur-md rounded-2xl shadow-xl border border-gray-200/60 dark:border-gray-700/60"></div>
        <div className="relative z-10 p-6">
          {alert.show && (
            <div style={{ position: 'fixed', top: 78, right: 24, zIndex: 9999, width: 350 }}>
              <Alert
                variant={alert.variant}
                title={alert.title}
                message={alert.message}
              />
            </div>
          )}
          {/* Mobile Card View */}
          {isMobileView ? (
            <div className="space-y-3">
              {sortedFilteredDocuments.length === 0 ? (
                <div className="text-center py-16">
                  <div className="flex flex-col items-center justify-center">
                    <span className="mt-2 text-xl font-semibold text-gray-500 dark:text-gray-400">
                      No files found.
                    </span>
                    <span className="text-sm text-gray-400 mt-1">
                      Upload some files to get started.
                    </span>
                  </div>
                </div>
              ) : (
                sortedFilteredDocuments.map((doc) => (
                  <div key={doc.id} className="relative">
                    <div className="absolute left-3 top-3 z-10">
                      <input type="checkbox" aria-label={"Select " + doc.name} checked={selectedFilenames.has(doc.name)} onChange={() => toggleSelectOne(doc.name)} />
                    </div>
                    <FileCard doc={doc} />
                  </div>
                ))
              )}
            </div>
          ) : (
            /* Enhanced Desktop Table View */
            <div className="overflow-x-auto">
              <div className="min-w-[700px]">
                <Table className="border-collapse bg-transparent">
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-700 dark:via-gray-800 dark:to-gray-700 border-b-2 border-blue-200 dark:border-gray-600">
                      <TableCell isHeader className="px-6 py-5 text-center">
                        <input
                          type="checkbox"
                          aria-label="Select all"
                          checked={isAllSelected}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                      </TableCell>
                      <TableCell isHeader className="px-6 py-5 font-bold text-gray-800 dark:text-gray-100 text-start text-sm uppercase tracking-wide">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Name
                        </div>
                      </TableCell>
                      <TableCell isHeader className="px-6 py-5 font-bold text-gray-800 dark:text-gray-100 text-start text-sm uppercase tracking-wide">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                          Type
                        </div>
                      </TableCell>
                      <TableCell isHeader className="px-6 py-5 font-bold text-gray-800 dark:text-gray-100 text-start text-sm uppercase tracking-wide">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m0 0V1a1 1 0 011-1h2a1 1 0 011 1v18a1 1 0 01-1 1H4a1 1 0 01-1-1V1a1 1 0 011-1h2a1 1 0 011 1v3m0 0h8" />
                          </svg>
                          Size
                        </div>
                      </TableCell>
                      <TableCell isHeader className="px-6 py-5 font-bold text-gray-800 dark:text-gray-100 text-start text-sm uppercase tracking-wide">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Uploaded At
                        </div>
                      </TableCell>
                      <TableCell isHeader className="px-6 py-5 font-bold text-gray-800 dark:text-gray-100 text-start text-sm uppercase tracking-wide">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Actions
                        </div>
                      </TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {sortedFilteredDocuments.length === 0 ? (
                      <TableRow>
                        <TableCell className="py-20 text-center" colSpan={6}>
                          <div className="flex flex-col items-center justify-center">
                            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-gray-700 dark:to-gray-600 rounded-full flex items-center justify-center mb-6">
                              <svg className="w-10 h-10 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-300 mb-2">
                              No documents found
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md text-center">
                              No documents match your current search criteria. Try adjusting your filters or upload some files to get started.
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedFilteredDocuments.map((doc, idx) => (
                        <TableRow
                          key={doc.id}
                          className={`group hover:bg-gradient-to-r hover:from-blue-50/80 hover:to-indigo-50/80 dark:hover:from-gray-700/80 dark:hover:to-gray-600/80 transition-all duration-300 ${idx % 2 === 0 ? 'bg-white/60 dark:bg-gray-800/60' : 'bg-gray-50/40 dark:bg-gray-700/40'
                            }`}
                        >
                          <TableCell className="px-6 py-5 text-center">
                            <input
                              type="checkbox"
                              aria-label={"Select " + doc.name}
                              checked={selectedFilenames.has(doc.name)}
                              onChange={() => toggleSelectOne(doc.name)}
                              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 transition-all duration-200"
                            />
                          </TableCell>
                          <TableCell className="px-6 py-5 text-start">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-lg flex items-center justify-center">
                                {getFileIcon(doc.fileType)}
                              </div>
                              <a
                                href={BASE_URL + "/domain/domain_2/file/" + encodeURIComponent(doc.name)}
                                target="_blank"
                                rel="noopener noreferrer"
                                download
                                className="text-blue-600 hover:underline dark:text-blue-400 font-medium text-sm"
                              >
                                {doc.name}
                              </a>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-5 text-start">
                            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 dark:from-gray-700 dark:to-gray-600 dark:text-gray-300 shadow-sm">
                              {doc.type}
                            </span>
                          </TableCell>
                          <TableCell className="px-6 py-5 text-start">
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m0 0V1a1 1 0 011-1h2a1 1 0 011 1v18a1 1 0 01-1 1H4a1 1 0 01-1-1V1a1 1 0 011-1h2a1 1 0 011 1v3m0 0h8" />
                              </svg>
                              <span className="text-gray-600 dark:text-gray-300 text-sm font-medium">
                                {doc.size}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-5 text-start">
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="text-gray-600 dark:text-gray-300 text-sm">
                                {doc.uploadedAt || '-'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-5 text-start">
                            <div className="flex items-center gap-2">
                              <button
                                className="inline-flex items-center justify-center px-3 py-2 border border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-400 dark:hover:border-red-500 transition-all duration-200 shadow-sm hover:shadow-md rounded-md text-sm font-medium"
                                onClick={() => setDeleteConfirm({ id: doc.id, doc_id: doc.doc_id, filename: doc.name })}
                                title="Delete file"
                              >
                                <FaTrash className="w-3 h-3" />
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          {/* Show reload icon and text only when refreshing */}
          {isRefreshing && (
            <div className="flex flex-col items-center mt-4">
              <Loader />
              <span className="text-xs text-gray-500 mt-1">Refreshing...</span>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <React.Fragment>
        {/* Delete Confirmation Modal */}
        <Modal isOpen={!!deleteConfirm} onClose={() => isDeleting ? undefined : setDeleteConfirm(null)} position="center">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Confirm Delete</h3>
          <p className="text-gray-700 dark:text-gray-100">Are you sure you want to delete <span className="font-semibold text-gray-900 dark:text-white">{deleteConfirm?.filename}</span>?</p>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} disabled={isDeleting}>Cancel</Button>
            <Button variant="danger" onClick={() => {
              if (deleteConfirm) handleDeleteDocument(deleteConfirm.doc_id);
            }} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </Modal>

        {/* Upload Modal */}
        <Modal isOpen={showUploadModal} onClose={handleCloseUploadModal}>
          <div className="w-full max-w-2xl">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 text-center">Upload File</h3>

            {/* Drag and Drop Upload Area */}
            <div className="mb-6 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 p-8 text-center transition-colors duration-200 hover:border-gray-400 dark:hover:border-gray-500">
              <div
                className={"relative " + (isDragOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : '')}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <div className="flex flex-col items-center justify-center space-y-4">
                  <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-4">
                    <FaUpload className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {isDragOver ? 'Drop files here' : 'Upload File'}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Drag and drop your files here, or click to select files
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      Supports PDF, DOC, DOCX files (Max {MAX_FILES} files)
                    </p>
                  </div>
                  <Button
                    onClick={handleSelectFileClick}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
                  >
                    Choose Files
                  </Button>
                </div>
              </div>
            </div>

            {/* Selected Files Preview */}
            {selectedFiles.length > 0 && (
              <div className="mb-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Selected Files ({selectedFiles.length})
                  </h4>
                  <Button
                    onClick={clearAllFiles}
                    variant="outline"
                    className="text-red-600 border-red-600 hover:bg-red-50 dark:text-red-400 dark:border-red-400 dark:hover:bg-red-900/20"
                  >
                    Clear All
                  </Button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getFileIcon(file.name.split('.').pop() || '')}
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{file.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {(file.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={() => removeFile(index)}
                        variant="outline"
                        className="text-red-600 border-red-600 hover:bg-red-50 dark:text-red-400 dark:border-red-400 dark:hover:bg-red-900/20 p-2"
                      >
                        <FaTrash className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex justify-end gap-3">
              <Button
                onClick={handleCloseUploadModal}
                variant="outline"
                className="dark:bg-gray-800"
              >
                Cancel
              </Button>
              <Button
                onClick={proceedToUpload}
                disabled={selectedFiles.length === 0}
                className="bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {selectedFiles.length > 0 ? 'Upload ' + selectedFiles.length + ' File' + (selectedFiles.length !== 1 ? 's' : '') : 'Select Files First'}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Confirm Upload Modal */}
        <Modal isOpen={showConfirmModal} onClose={handleCancelUpload} position="center">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 text-center">
            Confirm File Upload ({selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''})
          </h3>
          {selectedFiles.length > 0 && !isLoading && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  {getFileIcon(file.name.split(".").pop() || "")}
                  <div className="text-black dark:text-white flex-1">
                    <p className="font-medium text-sm">{file.name}</p>
                    <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                  </div>
                  <Button
                    onClick={() => removeFile(index)}
                    variant="outline"
                    className="text-red-600 border-red-600 hover:bg-red-50 dark:text-red-400 dark:border-red-400 dark:hover:bg-red-900/20 p-1"
                  >
                    <FaTrash className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          {isLoading && (
            <div className="flex flex-col items-center py-4">
              <Loader />
              <p className="font-medium mt-2 dark:text-white">Uploading {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''}... Please wait.</p>
            </div>
          )}
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={handleCancelUpload} disabled={isLoading} className="dark:bg-[#24303F]">Cancel</Button>
            <Button variant="primary" onClick={handleConfirmUpload} disabled={isLoading} className="bg-[#3641F5] text-white hover:bg-[#2531d8] dark:bg-[#3641F5] dark:text-white dark:hover:bg-[#2531d8]">
              Upload {selectedFiles.length} File{selectedFiles.length !== 1 ? 's' : ''}
            </Button>
          </div>
        </Modal>

        {/* Duplicate File Warning Modal */}
        <Modal isOpen={showDuplicateWarning} onClose={handleDuplicateCancel} position="center">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Duplicate Files Warning</h3>
          <p className="text-gray-700 dark:text-gray-100 mb-4">
            The following {duplicateFiles.length} file{duplicateFiles.length !== 1 ? 's' : ''} already exist{duplicateFiles.length === 1 ? 's' : ''}:
          </p>
          <div className="space-y-2 max-h-40 overflow-y-auto mb-4">
            {duplicateFiles.map((df, index) => (
              <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                {getFileIcon(df.file.name.split('.').pop() || '')}
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{df.file.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Existing: {df.existingFile.name}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-gray-700 dark:text-gray-100 mb-4">
            What would you like to do with these files?
          </p>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={handleDuplicateCancel} className="dark:bg-[#24303F]">Cancel</Button>
            <Button variant="primary" onClick={handleDuplicateAllow} className="bg-[#3641F5] text-white hover:bg-[#2531d8] dark:bg-[#3641F5] dark:text-white dark:hover:bg-[#2531d8]">Create Versions</Button>
            <Button variant="primary" onClick={handleDuplicateUpload} className="bg-[#3641F5] text-white hover:bg-[#2531d8] dark:bg-[#3641F5] dark:text-white dark:hover:bg-[#2531d8]">Replace</Button>
          </div>
        </Modal>

        {/* Bulk Delete Modal */}
        <Modal isOpen={bulkDeleteOpen} onClose={() => isDeleting ? undefined : setBulkDeleteOpen(false)} position="center">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Delete Selected Files</h3>
          <p className="text-gray-700 dark:text-gray-100">Are you sure you want to delete <span className="font-semibold text-gray-900 dark:text-white">{selectedFilenames.size}</span> selected file(s)?</p>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setBulkDeleteOpen(false)} disabled={isDeleting}>Cancel</Button>
            <Button variant="danger" onClick={handleBulkDelete} disabled={isDeleting}>{isDeleting ? 'Deleting...' : 'Delete Selected'}</Button>
          </div>
        </Modal>
      </React.Fragment>
    </div>
  );
}
