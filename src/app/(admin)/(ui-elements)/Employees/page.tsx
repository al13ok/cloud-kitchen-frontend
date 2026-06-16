"use client";

import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
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
      return <FaFileExcel className="text-blue-500" />;
    case "docx":
    case "doc":
      return <FaFileWord className="text-blue-500" />;
    default:
      return <FaFileAlt className="text-gray-500" />;
  }
};

export default function EmployeePage() {
  const RAW_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";
  const BASE_URL = RAW_BASE_URL ? RAW_BASE_URL.replace(/\/+$/, '') : "";
  const DUPLICATE_POLICY: 'deny' | 'replace' | 'version' = (process.env.NEXT_PUBLIC_DUPLICATE_POLICY as 'deny' | 'replace' | 'version') || 'replace';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [alert, setAlert] = useState<{ show: boolean; variant: 'success' | 'error'; title: string; message: string }>({ show: false, variant: 'success', title: '', message: '' });
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; doc_id: string; filename: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedFilenames, setSelectedFilenames] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  // Drag and drop states
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const MAX_FILES = 10;

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
      const haystack = [doc.name, doc.type, doc.downloadUrl].join(" ").toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [documents, normalizedQuery]);

  // Sort state and results
  const [sortOption, setSortOption] = useState<'date_desc' | 'date_asc' | 'name_asc' | 'name_desc'>('date_desc');
  const sortedFilteredDocuments = useMemo(() => {
    const items = [...filteredDocuments];
    items.sort((a, b) => {
      if (sortOption === 'name_asc') return a.name.localeCompare(b.name);
      if (sortOption === 'name_desc') return b.name.localeCompare(a.name);
      const ta = a.uploadedAt ? Date.parse(a.uploadedAt) : -Infinity;
      const tb = b.uploadedAt ? Date.parse(b.uploadedAt) : -Infinity;
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
    const timestamp = `${yyyy}${mm}${dd}_${hh}${min}`;
    const newName = `${base}_${timestamp}${ext}`;
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
      <div className="relative overflow-hidden rounded-2xl shadow-lg border transition-all duration-300 hover:shadow-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600">
        {/* Card Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                {getFileIcon(doc.fileType)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                  {doc.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                  {doc.size} • {doc.type || 'Document'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="inline-flex items-center justify-center px-3 py-2 border border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-400 dark:hover:border-red-500 transition-all duration-200 shadow-sm hover:shadow-md rounded-md text-sm font-medium"
                onClick={() => setDeleteConfirm({ id: doc.id, doc_id: doc.doc_id, filename: doc.name })}
                title="Delete file"
              >
                <FaTrash className="w-3 h-3" />
              </button>
              <button
                onClick={() => toggleRowExpansion(doc.name)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <svg
                  className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
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
          <div className="px-6 pb-6 space-y-4 animate-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">File Type</span>
                <p className="text-sm text-gray-900 dark:text-white font-medium">{doc.type || 'Document'}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Size</span>
                <p className="text-sm text-gray-900 dark:text-white font-medium">{doc.size}</p>
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Uploaded</span>
              <p className="text-sm text-gray-900 dark:text-white font-medium">{doc.uploadedAt}</p>
            </div>
            <div className="pt-2">
              <a
                href={`${BASE_URL}/api/v1/rag/documents/${doc.doc_id}/download`}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium transition-colors"
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

  const handleRefreshClick = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // Use RAG API endpoint for document listing
      const response = await fetch(`${BASE_URL}/api/v1/rag/documents?domain=tech_employee&status=active&limit=100`, {
        method: "GET",
        headers: {
          accept: "application/json",
        },
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
            return {
              id: idx + 1,
              doc_id: doc.doc_id,
              name: doc.original_name,
              type: doc.embedding_status || 'pending',
              size: `${doc.chunk_count} chunks`,
              fileType: doc.original_name.split('.').pop()?.toLowerCase() || '',
              downloadUrl: `/api/v1/rag/documents/${doc.doc_id}/download`,
              uploadedAt: doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleString() : '',
              status: doc.status,
              chunkCount: doc.chunk_count,
            };
          });
          formattedDocuments.sort((a: DocumentItem, b: DocumentItem) => {
            const ta = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
            const tb = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
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
      console.error("Error fetching files:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [BASE_URL]);

  useEffect(() => {
    // Debug log for environment variable
    console.log("BACKEND URL:", BASE_URL);
    handleRefreshClick();
  }, [BASE_URL, handleRefreshClick]);

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

  // handleRefreshClick defined above

  // Selection helpers
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
  const closeBulkDelete = () => setBulkDeleteOpen(false);
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
      closeBulkDelete();
    }
  };

  const handleConfirmUpload = async () => {
    if (selectedFiles.length > 0) {
      setIsLoading(true);
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append("files", file);
      });
      formData.append("domain", "tech_employee"); // RAG API requires domain
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
          handleRefreshClick(); // Refresh data after successful upload
        } else {
          const errorData = await response.json();
          showAlert('error', 'Upload Failed', errorData?.message || 'File upload failed. Please try again.');
          console.error("File upload failed:", response.status, response.statusText);
          console.error("Server error details:", errorData);
        }
      } catch (error) {
        showAlert('error', 'Upload Failed', 'An error occurred during file upload. Please try again.');
        console.error("Error during file upload:", error);
      } finally {
        setIsLoading(false);
        setShowConfirmModal(false);
        setSelectedFiles([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = ""; // Clear file input
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
    <div className="space-y-6">
      {/* Enhanced Control Bar */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700"></div>
        <div className="relative z-10 p-8">
          <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            {/* Search Section */}
            <div className="flex-1 max-w-lg">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <div className="w-5 h-5 bg-blue-600 rounded-lg flex items-center justify-center">
                    <FaSearch className="h-3 w-3 text-white" />
                  </div>
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search documents, files, and resources..."
                  className="block w-full pl-14 pr-6 py-4 border border-gray-300 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-lg hover:shadow-xl text-sm font-medium"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4 justify-start md:justify-end">
              {/* Sort Dropdown */}
              <div className="relative">
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as typeof sortOption)}
                  className="appearance-none px-5 py-3.5 pr-12 border border-gray-300 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-lg hover:shadow-xl text-sm font-medium"
                  aria-label="Sort files"
                >
                  <option value="date_desc">Newest First</option>
                  <option value="date_asc">Oldest First</option>
                  <option value="name_asc">Name (A-Z)</option>
                  <option value="name_desc">Name (Z-A)</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                  <div className="w-4 h-4 bg-blue-600 rounded flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* View Toggle */}
              <Button
                variant="outline"
                className="flex items-center gap-3 px-5 py-3.5 rounded-2xl border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                onClick={() => setIsMobileView(!isMobileView)}
                aria-label={isMobileView ? 'Switch to table view' : 'Switch to card view'}
              >
                <div className="w-4 h-4 bg-gradient-to-br from-gray-500 to-gray-600 rounded flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    {isMobileView ? (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    )}
                  </svg>
                </div>
                <span className="hidden sm:inline text-sm font-semibold">
                  {isMobileView ? 'Table View' : 'Card View'}
                </span>
              </Button>

              {/* Upload Button */}
              <Button
                className="flex items-center gap-3 px-5 py-3.5 bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 rounded-2xl"
                onClick={handleUploadClick}
                aria-label="Upload File"
              >
                <div className="w-4 h-4 bg-white/20 rounded flex items-center justify-center">
                  <FaUpload className="w-2.5 h-2.5 text-white" />
                </div>
                <span className="hidden sm:inline text-sm font-semibold">Upload File</span>
              </Button>

              {/* Hidden file input */}
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
                className="flex items-center gap-3 px-5 py-3.5 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 shadow-lg hover:shadow-xl rounded-2xl"
                variant="outline"
                onClick={handleRefreshClick}
                disabled={isRefreshing}
                aria-label="Refresh"
              >
                <div className="w-4 h-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded flex items-center justify-center">
                  {isRefreshing ? <Loader /> : <FaSync className="w-2.5 h-2.5 text-white" />}
                </div>
                <span className="hidden sm:inline text-sm font-semibold">Refresh</span>
              </Button>

              {/* Bulk Delete Button */}
              {selectedFilenames.size > 0 && (
                <Button
                  className="flex items-center gap-3 px-5 py-3.5 border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-400 dark:hover:border-red-500 transition-all duration-200 shadow-lg hover:shadow-xl rounded-2xl"
                  variant="outline"
                  onClick={() => setBulkDeleteOpen(true)}
                  aria-label="Delete selected"
                >
                  <div className="w-4 h-4 bg-gradient-to-br from-red-500 to-red-600 rounded flex items-center justify-center">
                    <FaTrash className="w-2.5 h-2.5 text-white" />
                  </div>
                  <span className="hidden sm:inline text-sm font-semibold">Delete Selected ({selectedFilenames.size})</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Table Container */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-white/80 via-blue-50/30 to-indigo-50/30 dark:from-gray-800/80 dark:via-blue-900/10 dark:to-indigo-900/10 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50"></div>
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
                      <input type="checkbox" aria-label={`Select ${doc.name}`} checked={selectedFilenames.has(doc.name)} onChange={() => toggleSelectOne(doc.name)} />
                    </div>
                    <FileCard doc={doc} />
                  </div>
                ))
              )}
            </div>
          ) : (
            /* Enhanced Desktop Table View */
            <div className="overflow-x-auto">
              <Table className="border-collapse bg-transparent">
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 border-b-2 border-gray-200 dark:border-gray-600">
                    <TableCell isHeader className="px-6 py-4 text-center">
                      <input
                        type="checkbox"
                        aria-label="Select all"
                        checked={isAllSelected}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                      />
                    </TableCell>
                    <TableCell isHeader className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-200 text-start text-sm">Name</TableCell>
                    <TableCell isHeader className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-200 text-start text-sm">Type</TableCell>
                    <TableCell isHeader className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-200 text-start text-sm">Size</TableCell>
                    <TableCell isHeader className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-200 text-start text-sm">Uploaded At</TableCell>
                    <TableCell isHeader className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-200 text-start text-sm">Actions</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {sortedFilteredDocuments.length === 0 ? (
                    <TableRow>
                      <TableCell className="py-16 text-center" colSpan={6}>
                        <div className="flex flex-col items-center">
                          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <span className="text-xl font-semibold text-gray-500 dark:text-gray-400 mb-2">
                            No documents found
                          </span>
                          <span className="text-sm text-gray-400 dark:text-gray-500">
                            Upload some documents to get started
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedFilteredDocuments.map((doc, idx) => (
                      <TableRow
                        key={doc.id}
                        className={`hover:bg-blue-50/50 dark:hover:bg-gray-700/50 transition-all duration-200 ${idx % 2 === 0 ? 'bg-white/50 dark:bg-gray-800/50' : 'bg-gray-50/30 dark:bg-gray-700/30'
                          }`}
                      >
                        <TableCell className="px-6 py-4 text-center">
                          <input
                            type="checkbox"
                            aria-label={`Select ${doc.name}`}
                            checked={selectedFilenames.has(doc.name)}
                            onChange={() => toggleSelectOne(doc.name)}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                          />
                        </TableCell>
                        <TableCell className="px-6 py-4 text-start">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                              {getFileIcon(doc.fileType)}
                            </div>
                            <a
                              href={`${BASE_URL}/domain/domain_1/file/${encodeURIComponent(doc.name)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              download
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors"
                            >
                              {doc.name}
                            </a>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-start">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                            {doc.type || 'Document'}
                          </span>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-gray-600 dark:text-gray-300 text-start text-sm">
                          {doc.size}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-gray-600 dark:text-gray-300 text-start text-sm">
                          {doc.uploadedAt}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-start">
                          <button
                            className="inline-flex items-center justify-center px-3 py-2 border border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-400 dark:hover:border-red-500 transition-all duration-200 shadow-sm hover:shadow-md rounded-md text-sm font-medium"
                            onClick={() => setDeleteConfirm({ id: doc.id, doc_id: doc.doc_id, filename: doc.name })}
                            title="Delete file"
                          >
                            <FaTrash className="w-3 h-3" />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
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
      {/* Modal and other content here, if any */}
      <Modal isOpen={showConfirmModal} onClose={handleCancelUpload}>
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
      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deleteConfirm} onClose={() => isDeleting ? undefined : setDeleteConfirm(null)}>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Confirm Delete</h3>
        <p className="text-gray-700 dark:text-gray-100">Are you sure you want to delete <span className="font-semibold text-gray-900 dark:text-white">{deleteConfirm?.filename}</span>?</p>
        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={() => setDeleteConfirm(null)} disabled={isDeleting} className="dark:bg-[#24303F]">Cancel</Button>
          <Button variant="danger" onClick={() => {
            if (deleteConfirm) handleDeleteDocument(deleteConfirm.doc_id);
          }} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700 dark:bg-red-600 dark:hover:bg-red-700 dark:border-red-600 dark:hover:border-red-700">{isDeleting ? 'Deleting...' : 'Delete'}</Button>
        </div>
      </Modal>
      {/* Bulk Delete Modal */}
      <Modal isOpen={bulkDeleteOpen} onClose={() => isDeleting ? undefined : setBulkDeleteOpen(false)}>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Delete Selected Files</h3>
        <p className="text-gray-700 dark:text-gray-100">Are you sure you want to delete <span className="font-semibold text-gray-900 dark:text-white">{selectedFilenames.size}</span> selected file(s)?</p>
        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={() => setBulkDeleteOpen(false)} disabled={isDeleting} className="dark:bg-[#24303F]">Cancel</Button>
          <Button variant="danger" onClick={handleBulkDelete} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700 dark:bg-red-600 dark:hover:bg-red-700 dark:border-red-600 dark:hover:border-red-700">{isDeleting ? 'Deleting...' : 'Delete Selected'}</Button>
        </div>
      </Modal>
      {/* Upload Modal */}
      <Modal isOpen={showUploadModal} onClose={handleCloseUploadModal}>
        <div className="w-full max-w-2xl">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 text-center">Upload File</h3>

          {/* Drag and Drop Upload Area */}
          <div className="mb-6 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 p-8 text-center transition-colors duration-200 hover:border-gray-400 dark:hover:border-gray-500">
            <div
              className={`relative ${isDragOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''}`}
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
              {selectedFiles.length > 0 ? `Upload ${selectedFiles.length} File${selectedFiles.length !== 1 ? 's' : ''}` : 'Select Files First'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Duplicate File Warning Modal */}
      <Modal isOpen={showDuplicateWarning} onClose={handleDuplicateCancel}>
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
    </div>
  );
}
