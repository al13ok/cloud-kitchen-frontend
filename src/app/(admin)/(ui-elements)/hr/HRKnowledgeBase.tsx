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
  name: string;
  type: string;
  size: string;
  fileType: string;
  downloadUrl: string;
  uploadedAt: string;
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


export default function HRKnowledgeBase() {
  const BASE_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || 'https://py-mobiloitte.converiqo.ai').replace(/\/+$/, '');
  const DUPLICATE_POLICY: 'deny' | 'replace' | 'version' = (process.env.NEXT_PUBLIC_DUPLICATE_POLICY as 'deny' | 'replace' | 'version') || 'replace';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [alert, setAlert] = useState<{ show: boolean; variant: 'success' | 'error'; title: string; message: string }>({ show: false, variant: 'success', title: '', message: '' });
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; filename: string } | null>(null);
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
                onClick={() => setDeleteConfirm({ id: doc.id, filename: doc.name })}
              >
                <FaTrash className="text-red-500 w-3 h-3" />
              </Button>
              <button
                onClick={() => toggleRowExpansion(doc.name)}
                className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                <svg
                  className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
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
                href={`${BASE_URL}/domain/domain_4/file/${encodeURIComponent(doc.name)}`}
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


  const handleRefreshClick = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch(`${BASE_URL}/domain/domain_4/files?page=1&page_size=10`, {
        method: "GET",
        headers: {
          accept: "application/json",
        },
      });
      if (response.ok) {
        const data = await response.json();
        if (data && Array.isArray(data.files)) {
          const formattedDocuments = data.files.map((file: {
            filename: string;
            size_bytes?: number;
            upload_date?: string;
            path: string;
            source?: string;
          }, idx: number) => {
            return {
              id: idx + 1, // Use index as id since API doesn't provide one
              name: file.filename,
              type: file.source || '',
              size: file.size_bytes ? `${(file.size_bytes / 1024).toFixed(2)} KB` : 'Unknown',
              fileType: file.filename.split('.').pop()?.toLowerCase() || '',
              downloadUrl: file.path,
              uploadedAt: file.upload_date ? new Date(file.upload_date).toLocaleString() : '',
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
  // Removed unused openBulkDelete (use inline setBulkDeleteOpen instead)
  const closeBulkDelete = () => setBulkDeleteOpen(false);
  const handleBulkDelete = async () => {
    if (selectedFilenames.size === 0) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`${BASE_URL}/domain/domain_4/files`, {
        method: "DELETE",
        headers: {
          accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ filenames: Array.from(selectedFilenames) }),
      });
      if (response.ok) {
        const data = await response.json();
        const deletedFiles = Array.isArray(data.deleted_files) ? data.deleted_files.join(', ') : '';
        showAlert('success', 'Delete Successful', `${data.message || 'Files deleted successfully.'}${deletedFiles ? `\nDeleted: ${deletedFiles}` : ''}`);
        setSelectedFilenames(new Set());
        handleRefreshClick();
      } else {
        const errorData = await response.json();
        showAlert('error', 'Delete Failed', errorData?.message || 'Failed to delete files.');
      }
    } catch {
      showAlert('error', 'Delete Failed', 'An error occurred while deleting the files.');
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
        formData.append("files", file); // Use 'files' as the field name
      });
      const uploadUrl = `${BASE_URL}/domain/domain_4/upload`;
      try {
        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: {
            accept: "application/json",
            // Do NOT set 'Content-Type'! The browser will set it with the correct boundary.
          },
          body: formData,
        });
        if (response.ok) {
          const data = await response.json();
          const uploadedFiles = Array.isArray(data.uploaded_files) ? data.uploaded_files.join(', ') : '';
          showAlert('success', 'Upload Successful', `${data.message || 'Files uploaded successfully.'}${uploadedFiles ? `\nUploaded: ${uploadedFiles}` : ''}`);
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
      fileInputRef.current.value = "";
    }
  };


  const handleDeleteDocument = async (id: number, filename: string) => {
    setIsDeleting(true);
    try {
      const response = await fetch(`${BASE_URL}/domain/domain_4/files`, {
        method: "DELETE",
        headers: {
          accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ filenames: [filename] }),
      });
      if (response.ok) {
        const data = await response.json();
        const deletedFiles = Array.isArray(data.deleted_files) ? data.deleted_files.join(', ') : '';
        showAlert('success', 'Delete Successful', `${data.message || 'File deleted successfully.'}${deletedFiles ? `\nDeleted: ${deletedFiles}` : ''}`);
        handleRefreshClick();
      } else {
        const errorData = await response.json();
        showAlert('error', 'Delete Failed', errorData?.message || 'Failed to delete file.');
        console.error("Failed to delete document");
      }
    } catch (error) {
      showAlert('error', 'Delete Failed', 'An error occurred while deleting the file.');
      console.error("Error deleting document:", error);
    } finally {
      setIsDeleting(false);
      setDeleteConfirm(null);
    }
  };


  return (
    <div>
      {/* Enhanced Section Start */}
      <div className="mb-6 rounded-lg border border-stroke px-6 py-6 shadow-lg flex flex-col gap-4 bg-[#F2F4F7] dark:bg-[#131d2b]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Left: Search */}
          <div className="w-full md:w-auto md:flex-1 md:max-w-md">
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-400"><FaSearch size={14} /></span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by"
                className="h-10 w-full rounded-md border border-gray-300 bg-white pl-10 pr-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
              />
            </div>
          </div>
          {/* Right: Actions */}
          <div className="flex flex-wrap justify-end items-center gap-3">
            <div className="relative inline-flex items-center">
              <span className="absolute left-2 text-gray-400"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M3 3a1 1 0 011-1h10a1 1 0 110 2H4a1 1 0 01-1-1zM3 7a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zM3 11a1 1 0 011-1h8a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h4a1 1 0 110 2H4a1 1 0 01-1-1z" /></svg></span>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as typeof sortOption)}
                className="h-10 appearance-none rounded-md border border-gray-300 bg-white pl-8 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 w-auto"
                aria-label="Sort files"
              >
                <option value="date_desc">Newest first</option>
                <option value="date_asc">Oldest first</option>
                <option value="name_asc">Filename (A-Z)</option>
                <option value="name_desc">Filename (Z-A)</option>
              </select>
              <span className="pointer-events-none absolute right-2 text-gray-400"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 011.08 1.04l-4.25 4.25a.75.75 0 01-1.06 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg></span>
            </div>
            <Button
              variant="outline"
              className="flex items-center gap-2 w-auto"
              onClick={() => setIsMobileView(!isMobileView)}
              aria-label={isMobileView ? 'Switch to table view' : 'Switch to card view'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                {isMobileView ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                )}
              </svg>
              <span className="hidden sm:inline">{isMobileView ? 'Table View' : 'Card View'}</span>
            </Button>
            <Button
              className="flex items-center gap-2 bg-[#3641F5] text-white hover:bg-[#2531d8] focus:bg-[#2531d8] dark:bg-[#3641F5] dark:text-white dark:hover:bg-[#2531d8] dark:focus:bg-[#2531d8]"
              variant="primary"
              onClick={handleUploadClick}
              aria-label="Upload Files"
            >
              <FaUpload />
              <span className="hidden sm:inline">Upload Files</span>
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              multiple
            />
            <Button className="flex items-center gap-2 dark:bg-[#24303F]" variant="outline" onClick={handleRefreshClick} disabled={isRefreshing} aria-label="Refresh">
              {isRefreshing ? <Loader /> : <FaSync />}
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            {selectedFilenames.size > 0 && (
              <Button
                className="flex items-center gap-2 bg-red-600 text-white hover:bg-red-700"
                variant="danger"
                onClick={() => setBulkDeleteOpen(true)}
                aria-label="Delete selected"
              >
                <FaTrash />
                <span className="hidden sm:inline">Delete Selected ({selectedFilenames.size})</span>
              </Button>
            )}
          </div>
        </div>
      </div>


      {/* Enhanced Section End */}
      <div className="rounded-sm border border-stroke bg-white dark:bg-[#131d2b] px-5 pt-7.5 pb-5 shadow-default dark:border-strokedark sm:px-7.5">
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
          /* Desktop Table View */
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:bg-gray-900 shadow-lg">
            <Table className="border-collapse bg-white dark:bg-gray-900">
              <TableHeader>
                <TableRow className="bg-gray-100 dark:bg-gray-800">
                  <TableCell isHeader className="px-3 py-3 text-start border-b border-gray-200 dark:border-gray-700">
                    <input type="checkbox" aria-label="Select all" checked={isAllSelected} onChange={toggleSelectAll} />
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-bold text-gray-700 dark:text-gray-200 text-start border-b border-gray-200 dark:border-gray-700">Name</TableCell>
                  <TableCell isHeader className="px-5 py-3 font-bold text-gray-700 text-start border-b border-gray-200">Type</TableCell>
                  <TableCell isHeader className="px-5 py-3 font-bold text-gray-700 text-start border-b border-gray-200">Size</TableCell>
                  <TableCell isHeader className="px-5 py-3 font-bold text-gray-700 text-start border-b border-gray-200">Uploaded At</TableCell>
                  <TableCell isHeader className="px-4 py-3 font-bold text-gray-700 text-start border-b border-gray-200">Actions</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedFilteredDocuments.map((doc, idx) => (
                  <React.Fragment key={doc.id}>
                    <TableRow className={idx % 2 === 0 ? "bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50" : "bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700/50"}>
                      <TableCell className="px-3 py-4 text-start border-b border-gray-100 dark:border-gray-800">
                        <input type="checkbox" aria-label={`Select ${doc.name}`} checked={selectedFilenames.has(doc.name)} onChange={() => toggleSelectOne(doc.name)} />
                      </TableCell>
                      <TableCell className="px-5 py-4 text-start border-b border-gray-100 dark:border-gray-800 dark:text-gray-200">
                        <div className="flex items-center gap-3">
                          {getFileIcon(doc.fileType)}
                          <a
                            href={`${BASE_URL}/domain/domain_4/file/${encodeURIComponent(doc.name)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            className="text-blue-600 hover:underline dark:text-blue-400"
                          >
                            {doc.name}
                          </a>
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-start border-b border-gray-100">{doc.type}</TableCell>
                      <TableCell className="px-5 py-4 text-start border-b border-gray-100">{doc.size}</TableCell>
                      <TableCell className="px-5 py-4 text-start border-b border-gray-100">{doc.uploadedAt}</TableCell>
                      <TableCell className="px-4 py-3 text-start border-b border-gray-100">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            className="border-red-500 text-red-500 hover:bg-red-50 hover:border-red-600 ml-2 dark:bg-[#24303F]"
                            onClick={() => setDeleteConfirm({ id: doc.id, filename: doc.name })}
                          >
                            <FaTrash className="text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                ))}
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
            if (deleteConfirm) handleDeleteDocument(deleteConfirm.id, deleteConfirm.filename);
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
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 text-center">Upload Files</h3>

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
                    {isDragOver ? 'Drop files here' : 'Upload Files'}
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

