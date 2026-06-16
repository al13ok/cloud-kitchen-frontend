"use client";

// import PageBreadcrumb from "@/components/common/PageBreadCrumb";
// Removed unused PageHeader import
import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import DashboardHeader from '@/components/header/DashboardHeader';
import { FaFileExcel, FaFilePdf, FaFileWord, FaFileAlt, FaUpload, FaSync, FaTrash, FaSearch, FaFilter, FaEdit, FaFolder, FaChartBar, FaCloud, FaClock, FaUsers, FaDatabase } from "react-icons/fa";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import Alert from "@/components/ui/alert/Alert";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { uploadFaqCsv, fetchFaqFiles } from "@/utils/api";
import Loader from "@/components/Loader";
import { deleteFaqCsv } from "@/utils/api";

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

interface FaqFile {
    filename: string;
    key: string;
    size_bytes: number;
    last_modified: string;
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


export default function OrganisationPage() {
    const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '');
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

    // Drag and drop states
    const [isDragOver, setIsDragOver] = useState(false);
    const [dragCounter, setDragCounter] = useState(0);
    const MAX_FILES = 10;

    // Add bulk selection state
    const [selectedFilenames, setSelectedFilenames] = useState<Set<string>>(new Set());
    const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

    // Add tab state
    const [activeTab, setActiveTab] = useState<'files' | 'faq' | 'analytics'>('files');

    // New states for enhanced features
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'name' | 'size' | 'date' | 'type'>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    // const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
    const [filterType, setFilterType] = useState<string>('all');
    const [showFilters, setShowFilters] = useState(false);

    // FAQ state
    const [faqUploading, setFaqUploading] = useState(false);
    const [fetchedFaqFiles, setFetchedFaqFiles] = useState<FaqFile[]>([]);
    const [isFaqLoading, setIsFaqLoading] = useState(false);
    const [isFaqRefreshing, setIsFaqRefreshing] = useState(false);
    const FAQ_DIRECTORY = 'tech_company';
    const [faqSelectedFilenames, setFaqSelectedFilenames] = useState<Set<string>>(new Set());

    const faqIsAllSelected = fetchedFaqFiles.length > 0 && fetchedFaqFiles.every(f => faqSelectedFilenames.has(f.filename));
    const faqToggleSelectAll = () => {
        setFaqSelectedFilenames(prev => {
            if (faqIsAllSelected) return new Set(prev);
            return new Set(fetchedFaqFiles.map(f => f.filename));
        });
    };
    const faqToggleSelectOne = (filename: string) => {
        setFaqSelectedFilenames(prev => {
            const next = new Set(prev);
            if (next.has(filename)) next.delete(filename); else next.add(filename);
            return next;
        });
    };

    // Add responsive view state (like Employees page)
    const [isMobileView, setIsMobileView] = useState(false);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    // Enhanced search and filter logic
    const enhancedSortedFilteredDocuments = useMemo(() => {
        const filtered = documents.filter(doc => {
            const matchesSearch = !searchQuery ||
                doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                doc.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
                doc.fileType.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesType = filterType === 'all' || doc.fileType === filterType;

            return matchesSearch && matchesType;
        });

        filtered.sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case 'name':
                    comparison = a.name.localeCompare(b.name);
                    break;
                case 'size':
                    comparison = parseFloat(a.size) - parseFloat(b.size);
                    break;
                case 'date':
                    comparison = new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
                    break;
                case 'type':
                    comparison = a.fileType.localeCompare(b.fileType);
                    break;
            }
            return sortOrder === 'asc' ? comparison : -comparison;
        });

        return filtered;
    }, [documents, searchQuery, sortBy, sortOrder, filterType]);

    // Add duplicate file warning state
    const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
    const [duplicateFiles, setDuplicateFiles] = useState<{ file: File; existingFile: DocumentItem }[]>([]);

    // FAQ delete state
    const [faqDeleteConfirm, setFaqDeleteConfirm] = useState<{ filename: string; key: string } | null>(null);
    const [isFaqDeleting, setIsFaqDeleting] = useState(false);

    // Removed unused filteredDocuments and sortOption


    // Function to fetch FAQ file from API
    const fetchFaqs = useCallback(async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setIsFaqRefreshing(true);
            } else {
                setIsFaqLoading(true);
            }
            const response = await fetchFaqFiles(FAQ_DIRECTORY);
            // Use the files array directly from the new API response
            setFetchedFaqFiles(response.files || []);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to fetch FAQ file';
            showAlert('error', 'Error', message);
        } finally {
            setIsFaqLoading(false);
            setIsFaqRefreshing(false);
        }
    }, [FAQ_DIRECTORY]);

    // Function to delete FAQ CSV file
    const deleteFaqFile = useCallback(async (filename: string) => {
        setIsFaqDeleting(true);
        try {
            const data = await deleteFaqCsv(filename, FAQ_DIRECTORY);
            showAlert('success', 'Delete Successful', data.message || 'FAQ file deleted successfully.');
            // Refresh the FAQ list after successful deletion
            fetchFaqs(true);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'An error occurred while deleting the FAQ file.';
            showAlert('error', 'Delete Failed', message);
        } finally {
            setIsFaqDeleting(false);
            setFaqDeleteConfirm(null);
        }
    }, [FAQ_DIRECTORY, fetchFaqs]);

    // Fetch FAQ file on component mount
    useEffect(() => {
        if (activeTab === 'faq') {
            fetchFaqs();
        }
    }, [activeTab, fetchFaqs]);

    // Helper functions for FAQ display
    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
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

    // Removed unused handleFileChange function

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



    // Enhanced Mobile Card Component for Files
    const FileCard = ({ doc }: { doc: DocumentItem }) => {
        const isExpanded = expandedRows.has(doc.name);
        return (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
                <div className="p-6">
                    <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1 min-w-0">
                            <div className="flex-shrink-0 mt-1">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl flex items-center justify-center">
                                    {getFileIcon(doc.fileType)}
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                    {doc.name}
                                </h3>
                                <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mb-2">
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                        {doc.type.toUpperCase()}
                                    </span>
                                    <span>{doc.size}</span>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Uploaded {doc.uploadedAt}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                            <Button
                                variant="outline"
                                size="sm"
                                className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:border-red-700 transition-all duration-200"
                                onClick={() => setDeleteConfirm({ id: doc.id, doc_id: doc.doc_id, filename: doc.name })}
                            >
                                <FaTrash className="w-3 h-3" />
                            </Button>
                            <button
                                onClick={() => toggleRowExpansion(doc.name)}
                                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                <svg className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Download Button - Always Visible */}
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <a
                            href={`${BASE_URL}/api/v1/rag/documents/${doc.doc_id}/download`}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium px-3 py-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Download File
                        </a>
                    </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                    <div className="px-6 pb-6 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-100 dark:border-gray-600">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                            <div className="space-y-3">
                                <div>
                                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">File Type</span>
                                    <p className="text-sm text-gray-900 dark:text-white mt-1">{doc.type}</p>
                                </div>
                                <div>
                                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">File Size</span>
                                    <p className="text-sm text-gray-900 dark:text-white mt-1">{doc.size}</p>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div>
                                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Upload Date</span>
                                    <p className="text-sm text-gray-900 dark:text-white mt-1">{doc.uploadedAt}</p>
                                </div>
                                <div>
                                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Source</span>
                                    <p className="text-sm text-gray-900 dark:text-white mt-1">Organization File</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };







    const handleSelectFileClick = () => {
        console.log('Choose File button clicked'); // Debug log
        if (fileInputRef.current) {
            console.log('File input ref found, clicking...'); // Debug log
            // Reset value so selecting the same file again still triggers onChange
            try { fileInputRef.current.value = ""; } catch { }
            fileInputRef.current.click();
        } else {
            console.log('File input ref not found!'); // Debug log
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        console.log('File change event triggered', e.target.files); // Debug log
        if (e.target.files && e.target.files.length > 0) {
            console.log('Processing files:', e.target.files.length); // Debug log
            processFiles(e.target.files);
        }
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







    const handleRefreshClick = useCallback(async () => {
        setIsRefreshing(true);
        try {
            // Use RAG API endpoint for document listing
            const response = await fetch(BASE_URL + "/api/v1/rag/documents?domain=tech_company&status=active&limit=100", {
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
                    showAlert('error', 'Fetch Failed', 'Invalid files data format.');
                }
            } else {
                showAlert('error', 'Fetch Failed', 'Failed to fetch files: ' + response.statusText);
            }
        } catch {
            showAlert('error', 'Fetch Failed', 'Error fetching documents.');
        } finally {
            setIsRefreshing(false);
        }
    }, [BASE_URL]);

    // Bulk selection helpers
    const isAllSelected = enhancedSortedFilteredDocuments.length > 0 && selectedFilenames.size === enhancedSortedFilteredDocuments.length;
    const toggleSelectAll = () => {
        setSelectedFilenames(prev => {
            if (enhancedSortedFilteredDocuments.length === 0) return new Set();
            if (prev.size === enhancedSortedFilteredDocuments.length) return new Set();
            return new Set(enhancedSortedFilteredDocuments.map(d => d.name));
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
                formData.append("files", file); // Use 'files' as the field name
            });
            formData.append("domain", "tech_company"); // RAG API requires domain
            // Use RAG API ingest endpoint
            const uploadUrl = BASE_URL + "/api/v1/rag/ingest";
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
                    await response.json();
                    showAlert('success', 'Upload Successful', 'Files uploaded successfully.');
                    handleRefreshClick(); // Refresh data after successful upload
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

    useEffect(() => {
        handleRefreshClick();
    }, [handleRefreshClick]);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="mx-4 md:mx-6 mt-6 mb-8">
                <DashboardHeader
                    variant="default"
                    size="lg"
                    title="Guests"
                    subtitle="Centralize organizational assets and knowledge with powerful file management and FAQ systems."
                    icon={() => (
                        <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M20 6H4c-1.1 0-2 .9-2 2v10a2 2 0 002 2h16a2 2 0 002-2V8c0-1.1-.9-2-2-2zm-10 8H6v-2h4v2zm8 0h-6v-2h6v2zM18 4H6V2h12v2z" />
                        </svg>
                    )}
                    breadcrumbs={[
                        { label: 'Home', href: '/' },
                        { label: 'Organisation', href: '/organisation' }
                    ]}
                />
            </div>

            {/* Enhanced Tab Navigation */}
            <div className="relative mb-8 mx-4 md:mx-6">
                <div className="rounded-2xl p-2 shadow-xl border border-gray-200/60 dark:border-gray-700/60 bg-white dark:bg-gray-800">
                    <div className="inline-flex rounded-xl bg-white dark:bg-gray-800 border border-stroke dark:border-gray-700 p-1 shadow">
                        <button
                            type="button"
                            onClick={() => setActiveTab('files')}
                            className={`px-6 py-3 text-sm font-semibold rounded-lg transition-all duration-200 flex items-center gap-2 ${activeTab === 'files'
                                ? 'bg-blue-600 text-white shadow'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                        >
                            <FaFolder className="w-4 h-4" />
                            File
                            <span className="ml-2 px-2 py-1 text-xs bg-white/20 text-white rounded-full">
                                {documents.length}
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('faq')}
                            className={`px-6 py-3 text-sm font-semibold rounded-lg transition-all duration-200 flex items-center gap-2 ${activeTab === 'faq'
                                ? 'bg-blue-600 text-white shadow'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                        >
                            <FaEdit className="w-4 h-4" />
                            FAQ
                            <span className="ml-2 px-2 py-1 text-xs bg-white/20 text-white rounded-full">
                                {fetchedFaqFiles.length}
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('analytics')}
                            className={`px-6 py-3 text-sm font-semibold rounded-lg transition-all duration-200 flex items-center gap-2 ${activeTab === 'analytics'
                                ? 'bg-blue-600 text-white shadow'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                        >
                            <FaChartBar className="w-4 h-4" />
                            Analytics
                        </button>
                    </div>
                </div>
            </div>
            {/* Tab Content */}
            {activeTab === 'files' && (
                <div className="mx-4 md:mx-6">
                    {alert.show && (
                        <Alert
                            variant={alert.variant}
                            title={alert.title}
                            message={alert.message}
                            showCloseButton={true}
                            onClose={() => setAlert({ ...alert, show: false })}
                        />
                    )}

                    {/* Enhanced Control Bar */}
                    <div className="mb-8">
                        <div className="bg-gradient-to-br from-white via-white to-gray-50/30 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900/50 rounded-2xl p-6 shadow-xl border-0 overflow-hidden backdrop-blur-sm relative">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-full -translate-y-16 translate-x-16"></div>
                            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full translate-y-12 -translate-x-12"></div>
                            <div className="relative z-10">
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
                                                placeholder="Search file by name, type, or content..."
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

                                    {/* Action Buttons */}
                                    <div className="flex gap-3">
                                        {/* Filter Button (Blue) */}
                                        <button
                                            onClick={() => setShowFilters(!showFilters)}
                                            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200"
                                        >
                                            <FaFilter className="h-4 w-4" />
                                            <span className="font-medium">Filters</span>
                                        </button>

                                        {/* Upload Button (Blue) */}
                                        <button
                                            onClick={() => setShowUploadModal(true)}
                                            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200"
                                        >
                                            <FaUpload className="h-4 w-4" />
                                            <span className="font-medium">Upload File</span>
                                        </button>

                                        {/* Refresh Button (Blue) */}
                                        <button
                                            onClick={handleRefreshClick}
                                            disabled={isRefreshing}
                                            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50"
                                        >
                                            <FaSync className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                                            <span className="font-medium">Refresh</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Advanced Filters */}
                                {showFilters && (
                                    <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sort By</label>
                                                <select
                                                    value={sortBy}
                                                    onChange={(e) => setSortBy(e.target.value as 'name' | 'size' | 'date' | 'type')}
                                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                >
                                                    <option value="name">Name</option>
                                                    <option value="size">Size</option>
                                                    <option value="date">Date</option>
                                                    <option value="type">Type</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Order</label>
                                                <select
                                                    value={sortOrder}
                                                    onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                >
                                                    <option value="asc">Ascending</option>
                                                    <option value="desc">Descending</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">File Type</label>
                                                <select
                                                    value={filterType}
                                                    onChange={(e) => setFilterType(e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                >
                                                    <option value="all">All Types</option>
                                                    <option value="pdf">PDF</option>
                                                    <option value="docx">Word</option>
                                                    <option value="xlsx">Excel</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Enhanced Content Area */}
                    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
                        {isMobileView ? (
                            <div className="p-6">
                                <div className="space-y-4">
                                    {enhancedSortedFilteredDocuments.length === 0 ? (
                                        <div className="text-center py-20">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                                                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                </div>
                                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No file found</h3>
                                                <p className="text-gray-500 dark:text-gray-400 mb-6">Upload some file to get started with your organization</p>
                                                <Button
                                                    onClick={handleUploadClick}
                                                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                                                >
                                                    <FaUpload className="w-4 h-4 mr-2" />
                                                    Upload File
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        enhancedSortedFilteredDocuments.map((doc) => (
                                            <div key={doc.id} className="relative group">
                                                <div className="absolute left-4 top-4 z-10">
                                                    <input
                                                        type="checkbox"
                                                        aria-label={"Select " + doc.name}
                                                        checked={selectedFilenames.has(doc.name)}
                                                        onChange={() => toggleSelectOne(doc.name)}
                                                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                                    />
                                                </div>
                                                <FileCard doc={doc} />
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="overflow-hidden">
                                <div className="overflow-x-auto">
                                    <Table className="min-w-full">
                                        <TableHeader>
                                            <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 border-b border-gray-200 dark:border-gray-600">
                                                <TableCell isHeader className="px-6 py-4 text-left">
                                                    <input
                                                        type="checkbox"
                                                        aria-label="Select all"
                                                        checked={isAllSelected}
                                                        onChange={toggleSelectAll}
                                                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                                    />
                                                </TableCell>
                                                <TableCell isHeader className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                                                    File Name
                                                </TableCell>
                                                <TableCell isHeader className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                                                    Type
                                                </TableCell>
                                                <TableCell isHeader className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                                                    Size
                                                </TableCell>
                                                <TableCell isHeader className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                                                    Uploaded
                                                </TableCell>
                                                <TableCell isHeader className="px-6 py-4 text-center text-sm font-semibold text-gray-900 dark:text-white">
                                                    Actions
                                                </TableCell>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {enhancedSortedFilteredDocuments.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="px-6 py-20 text-center">
                                                        <div className="flex flex-col items-center justify-center">
                                                            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                                                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                </svg>
                                                            </div>
                                                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No file found</h3>
                                                            <p className="text-gray-500 dark:text-gray-400 mb-6">Upload some file to get started with your organization</p>
                                                            <Button
                                                                onClick={handleUploadClick}
                                                                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                                                            >
                                                                <FaUpload className="w-4 h-4 mr-2" />
                                                                Upload File
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                enhancedSortedFilteredDocuments.map((doc, idx) => (
                                                    <TableRow
                                                        key={doc.id}
                                                        className={`group hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200 ${idx % 2 === 0 ? "bg-white dark:bg-gray-800" : "bg-gray-50/50 dark:bg-gray-700/30"
                                                            }`}
                                                    >
                                                        <TableCell className="px-6 py-4">
                                                            <input
                                                                type="checkbox"
                                                                aria-label={"Select " + doc.name}
                                                                checked={selectedFilenames.has(doc.name)}
                                                                onChange={() => toggleSelectOne(doc.name)}
                                                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                                            />
                                                        </TableCell>
                                                        <TableCell className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex-shrink-0">
                                                                    {getFileIcon(doc.fileType)}
                                                                </div>
                                                                <div className="min-w-0 flex-1">
                                                                    <a
                                                                        href={BASE_URL + `/api/v1/rag/documents/${doc.doc_id}/download`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        download
                                                                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium text-sm truncate block hover:underline transition-colors"
                                                                    >
                                                                        {doc.name}
                                                                    </a>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="px-6 py-4">
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                                                {doc.type.toUpperCase()}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                                            {doc.size}
                                                        </TableCell>
                                                        <TableCell className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                                            {doc.uploadedAt}
                                                        </TableCell>
                                                        <TableCell className="px-6 py-4 text-center">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:border-red-700 transition-all duration-200"
                                                                onClick={() => setDeleteConfirm({ id: doc.id, doc_id: doc.doc_id, filename: doc.name })}
                                                            >
                                                                <FaTrash className="w-3 h-3" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        )}

                        {/* Loading State */}
                        {isRefreshing && (
                            <div className="flex flex-col items-center justify-center py-8 bg-gray-50/50 dark:bg-gray-700/30">
                                <Loader />
                                <span className="text-sm text-gray-500 dark:text-gray-400 mt-2">Refreshing file...</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
            {activeTab === 'faq' && (
                <div className="p-4">
                    {alert.show && (
                        <Alert
                            variant={alert.variant}
                            title={alert.title}
                            message={alert.message}
                            showCloseButton={true}
                            onClose={() => setAlert({ ...alert, show: false })}
                        />
                    )}

                    {/* Enhanced FAQ Control Bar */}
                    <div className="mb-8">
                        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-6">
                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                                {/* FAQ Stats */}
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                                            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">FAQ Management</h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                {fetchedFaqFiles.length} FAQ file{fetchedFaqFiles.length !== 1 ? 's' : ''} available
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* FAQ Actions */}
                                <div className="flex flex-wrap items-center gap-3">
                                    {/* View Toggle */}
                                    <Button
                                        variant="primary"
                                        className="flex items-center gap-2 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200"
                                        onClick={() => setIsMobileView(!isMobileView)}
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

                                    {/* Upload FAQ CSV */}
                                    <Button
                                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg transition-all duration-200"
                                        onClick={() => {
                                            const input = document.createElement('input');
                                            input.type = 'file';
                                            input.accept = '.csv,text/csv';
                                            input.onchange = async (e) => {
                                                const file = (e.target as HTMLInputElement).files?.[0];
                                                if (!file) return;
                                                try {
                                                    setFaqUploading(true);
                                                    // Use the new API with domain and rebuild_index parameters
                                                    const res = await uploadFaqCsv(file, FAQ_DIRECTORY, true);
                                                    showAlert('success', 'FAQ CSV Uploaded', res?.message || 'File uploaded successfully');
                                                    fetchFaqs(true);
                                                } catch (err) {
                                                    const msg = err instanceof Error ? err.message : 'Upload failed';
                                                    showAlert('error', 'Upload Failed', msg);
                                                } finally {
                                                    setFaqUploading(false);
                                                }
                                            };
                                            input.click();
                                        }}
                                        disabled={faqUploading}
                                    >
                                        {faqUploading ? <Loader /> : <FaUpload className="w-4 h-4" />}
                                        <span className="hidden sm:inline">{faqUploading ? 'Uploading...' : 'Upload FAQ CSV'}</span>
                                    </Button>

                                    {/* Refresh */}
                                    <Button
                                        variant="primary"
                                        className="flex items-center gap-2 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200"
                                        onClick={() => fetchFaqs(true)}
                                        disabled={isFaqRefreshing}
                                    >
                                        {isFaqRefreshing ? <Loader /> : <FaSync className="w-4 h-4" />}
                                        <span className="hidden sm:inline">Refresh</span>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Enhanced FAQ Content Area */}
                    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
                        {isMobileView ? (
                            <div className="p-6">
                                <div className="space-y-4">
                                    {isFaqLoading ? (
                                        <div className="text-center py-20">
                                            <div className="flex flex-col items-center justify-center">
                                                <Loader />
                                                <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">Loading FAQ file...</h3>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Please wait while we fetch your FAQ data</p>
                                            </div>
                                        </div>
                                    ) : fetchedFaqFiles.length === 0 ? (
                                        <div className="text-center py-20">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                                                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                </div>
                                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No FAQ file found</h3>
                                                <p className="text-gray-500 dark:text-gray-400 mb-6">Upload CSV files to manage your frequently asked questions</p>
                                                <Button
                                                    onClick={() => {
                                                        const input = document.createElement('input');
                                                        input.type = 'file';
                                                        input.accept = '.csv,text/csv';
                                                        input.click();
                                                    }}
                                                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                                                >
                                                    <FaUpload className="w-4 h-4 mr-2" />
                                                    Upload FAQ CSV
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        fetchedFaqFiles.map((file) => (
                                            <div key={file.key} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
                                                <div className="p-6">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex items-start gap-4 flex-1 min-w-0">
                                                            <div className="flex-shrink-0 mt-1">
                                                                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                                                                    <FaFileAlt className="text-blue-600 dark:text-blue-400" />
                                                                </div>
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                                    {file.filename}
                                                                </h3>
                                                                <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mb-2">
                                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                                                        CSV
                                                                    </span>
                                                                    <span>{formatFileSize(file.size_bytes)}</span>
                                                                </div>
                                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                                    Uploaded {formatDate(file.last_modified)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 ml-4">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:border-red-700 transition-all duration-200"
                                                                onClick={() => setFaqDeleteConfirm({ filename: file.filename, key: file.key })}
                                                            >
                                                                <FaTrash className="w-3 h-3" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="overflow-hidden">
                                <div className="overflow-x-auto">
                                    <Table className="min-w-full">
                                        <TableHeader>
                                            <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 border-b border-gray-200 dark:border-gray-600">
                                                <TableCell isHeader className="px-6 py-4 text-left">
                                                    <input
                                                        type="checkbox"
                                                        aria-label="Select all"
                                                        checked={faqIsAllSelected}
                                                        onChange={faqToggleSelectAll}
                                                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                                    />
                                                </TableCell>
                                                <TableCell isHeader className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                                                    File Name
                                                </TableCell>
                                                <TableCell isHeader className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                                                    Type
                                                </TableCell>
                                                <TableCell isHeader className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                                                    Size
                                                </TableCell>
                                                <TableCell isHeader className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                                                    Uploaded
                                                </TableCell>
                                                <TableCell isHeader className="px-6 py-4 text-center text-sm font-semibold text-gray-900 dark:text-white">
                                                    Actions
                                                </TableCell>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {isFaqLoading ? (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="px-6 py-20 text-center">
                                                        <div className="flex flex-col items-center">
                                                            <Loader />
                                                            <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">Loading FAQ file...</h3>
                                                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Please wait while we fetch your FAQ data</p>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ) : fetchedFaqFiles.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="px-6 py-20 text-center">
                                                        <div className="flex flex-col items-center">
                                                            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                                                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                </svg>
                                                            </div>
                                                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No FAQ file found</h3>
                                                            <p className="text-gray-500 dark:text-gray-400 mb-6">Upload CSV files to manage your frequently asked questions</p>
                                                            <Button
                                                                onClick={async () => {
                                                                    const input = document.createElement('input');
                                                                    input.type = 'file';
                                                                    input.accept = '.csv,text/csv';
                                                                    input.onchange = async (e) => {
                                                                        const file = (e.target as HTMLInputElement).files?.[0];
                                                                        if (!file) return;
                                                                        try {
                                                                            setFaqUploading(true);
                                                                            // Use the new API with domain and rebuild_index parameters
                                                                            const res = await uploadFaqCsv(file, FAQ_DIRECTORY, true);
                                                                            showAlert('success', 'FAQ CSV Uploaded', res?.message || 'File uploaded successfully');
                                                                            fetchFaqs(true);
                                                                        } catch (err) {
                                                                            const msg = err instanceof Error ? err.message : 'Upload failed';
                                                                            showAlert('error', 'Upload Failed', msg);
                                                                        } finally {
                                                                            setFaqUploading(false);
                                                                        }
                                                                    };
                                                                    input.click();
                                                                }}
                                                                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                                                            >
                                                                <FaUpload className="w-4 h-4 mr-2" />
                                                                Upload FAQ CSV
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                fetchedFaqFiles.map((file, idx) => (
                                                    <TableRow
                                                        key={file.key}
                                                        className={`group hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200 ${idx % 2 === 0 ? "bg-white dark:bg-gray-800" : "bg-gray-50/50 dark:bg-gray-700/30"
                                                            }`}
                                                    >
                                                        <TableCell className="px-6 py-4">
                                                            <input
                                                                type="checkbox"
                                                                aria-label={"Select " + file.filename}
                                                                checked={faqSelectedFilenames.has(file.filename)}
                                                                onChange={() => faqToggleSelectOne(file.filename)}
                                                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                                            />
                                                        </TableCell>
                                                        <TableCell className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex-shrink-0">
                                                                    <FaFileAlt className="text-blue-600 dark:text-blue-400" />
                                                                </div>
                                                                <div className="min-w-0 flex-1">
                                                                    <a
                                                                        href={BASE_URL + `/api/v1/faq/files/${encodeURIComponent(file.filename)}/download?domain=tech_company`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        download
                                                                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium text-sm truncate block hover:underline transition-colors"
                                                                    >
                                                                        {file.filename}
                                                                    </a>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="px-6 py-4">
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                                                CSV
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                                            {formatFileSize(file.size_bytes)}
                                                        </TableCell>
                                                        <TableCell className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                                            {formatDate(file.last_modified)}
                                                        </TableCell>
                                                        <TableCell className="px-6 py-4 text-center">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:border-red-700 transition-all duration-200"
                                                                onClick={() => setFaqDeleteConfirm({ filename: file.filename, key: file.key })}
                                                            >
                                                                <FaTrash className="w-3 h-3" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>

                                {/* Loading State */}
                                {isFaqRefreshing && (
                                    <div className="flex flex-col items-center justify-center py-8 bg-gray-50/50 dark:bg-gray-700/30">
                                        <Loader />
                                        <span className="text-sm text-gray-500 dark:text-gray-400 mt-2">Refreshing FAQ file...</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
                <div className="mx-4 md:mx-6">
                    {/* Analytics Header */}
                    <div className="mb-8">
                        <div className="rounded-2xl p-6 shadow-xl border border-gray-200/60 dark:border-gray-700/60 bg-white dark:bg-gray-800">
                            <div className="flex items-center gap-4 mb-2">
                                <div className="p-3 rounded-2xl bg-blue-100 dark:bg-blue-900/30">
                                    <FaChartBar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics Dashboard</h2>
                                    <p className="text-gray-600 dark:text-gray-400">Insights and statistics for your organization file</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Analytics Content */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* File Statistics */}
                        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <FaDatabase className="w-5 h-5 text-blue-600" />
                                File Statistics
                            </h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Total File</span>
                                    <span className="text-lg font-semibold text-gray-900 dark:text-white">{documents.length}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">PDF File</span>
                                    <span className="text-lg font-semibold text-gray-900 dark:text-white">
                                        {documents.filter(doc => doc.fileType === 'pdf').length}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Word Documents</span>
                                    <span className="text-lg font-semibold text-gray-900 dark:text-white">
                                        {documents.filter(doc => doc.fileType === 'docx' || doc.fileType === 'doc').length}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Excel File</span>
                                    <span className="text-lg font-semibold text-gray-900 dark:text-white">
                                        {documents.filter(doc => doc.fileType === 'xlsx' || doc.fileType === 'xls').length}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Storage Usage */}
                        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <FaCloud className="w-5 h-5 text-blue-600" />
                                Storage Usage
                            </h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Total Size</span>
                                    <span className="text-lg font-semibold text-gray-900 dark:text-white">
                                        {documents.reduce((total, doc) => {
                                            const size = parseFloat(doc.size) || 0;
                                            return total + size;
                                        }, 0).toFixed(2)} KB
                                    </span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Average File Size</span>
                                    <span className="text-lg font-semibold text-gray-900 dark:text-white">
                                        {documents.length > 0 ?
                                            (documents.reduce((total, doc) => {
                                                const size = parseFloat(doc.size) || 0;
                                                return total + size;
                                            }, 0) / documents.length).toFixed(2) : 0} KB
                                    </span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Storage Provider</span>
                                    <span className="text-lg font-semibold text-gray-900 dark:text-white">AWS S3</span>
                                </div>
                            </div>
                        </div>

                        {/* Recent Activity */}
                        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <FaClock className="w-5 h-5 text-orange-600" />
                                Recent Activity
                            </h3>
                            <div className="space-y-3">
                                {documents.slice(0, 5).map((doc) => (
                                    <div key={doc.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                        <div className="flex-shrink-0">
                                            {getFileIcon(doc.fileType)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                {doc.name}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                Uploaded {doc.uploadedAt}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                {documents.length === 0 && (
                                    <div className="text-center py-8">
                                        <p className="text-gray-500 dark:text-gray-400">No recent activity</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* FAQ Statistics */}
                        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <FaUsers className="w-5 h-5 text-indigo-600" />
                                FAQ Statistics
                            </h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Total FAQ File</span>
                                    <span className="text-lg font-semibold text-gray-900 dark:text-white">{fetchedFaqFiles.length}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Total FAQ Size</span>
                                    <span className="text-lg font-semibold text-gray-900 dark:text-white">
                                        {fetchedFaqFiles.reduce((total, file) => total + file.size_bytes, 0) > 0 ?
                                            formatFileSize(fetchedFaqFiles.reduce((total, file) => total + file.size_bytes, 0)) : '0 Bytes'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Average FAQ Size</span>
                                    <span className="text-lg font-semibold text-gray-900 dark:text-white">
                                        {fetchedFaqFiles.length > 0 ?
                                            formatFileSize(fetchedFaqFiles.reduce((total, file) => total + file.size_bytes, 0) / fetchedFaqFiles.length) : '0 Bytes'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Enhanced Upload Modal */}
            <Modal isOpen={showUploadModal} onClose={handleCloseUploadModal}>
                <div className="w-full max-w-3xl">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <FaUpload className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Upload File</h3>
                        <p className="text-gray-600 dark:text-gray-400">Add new file to your organization library</p>
                    </div>

                    {/* Enhanced Drag and Drop Upload Area */}
                    <div className="mb-8 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gradient-to-br from-gray-50 to-blue-50/30 dark:from-gray-800 dark:to-blue-900/20 p-12 text-center transition-all duration-300 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-lg">
                        <div
                            className={`relative transition-all duration-300 ${isDragOver ? 'scale-105 border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-xl' : ''}`}
                            onDragEnter={handleDragEnter}
                            onDragLeave={handleDragLeave}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                        >
                            <div className="flex flex-col items-center justify-center space-y-6">
                                <div className={`rounded-2xl p-6 transition-all duration-300 ${isDragOver ? 'bg-blue-100 dark:bg-blue-900/40 scale-110' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
                                    <FaUpload className={`w-12 h-12 text-blue-600 dark:text-blue-400 transition-all duration-300 ${isDragOver ? 'animate-bounce' : ''}`} />
                                </div>
                                <div className="space-y-3">
                                    <h4 className="text-xl font-semibold text-gray-900 dark:text-white">
                                        {isDragOver ? '🎉 Drop file here!' : '📁 Upload Your File'}
                                    </h4>
                                    <p className="text-gray-600 dark:text-gray-400 max-w-md">
                                        Drag and drop your file here, or click the button below to browse and select file
                                    </p>
                                    <div className="flex items-center justify-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                                        <span className="flex items-center gap-1">
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                            </svg>
                                            PDF, DOC, DOCX
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                            </svg>
                                            Max {MAX_FILES} file
                                        </span>
                                    </div>
                                </div>
                                <label htmlFor="file-upload-input" className="cursor-pointer">
                                    <Button
                                        onClick={handleSelectFileClick}
                                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                                    >
                                        <FaUpload className="w-4 h-4 mr-2" />
                                        Choose File
                                    </Button>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Hidden file input */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".pdf,.doc,.docx"
                        multiple
                        className="hidden"
                        id="file-upload-input"
                    />

                    {/* Enhanced Selected File Preview */}
                    {selectedFiles.length > 0 && (
                        <div className="mb-8 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg overflow-hidden">
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                                            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                                                Selected File
                                            </h4>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} ready for upload
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        onClick={clearAllFiles}
                                        variant="outline"
                                        className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20 dark:hover:border-red-700 transition-all duration-200"
                                    >
                                        <FaTrash className="w-4 h-4 mr-2" />
                                        Clear All
                                    </Button>
                                </div>
                            </div>
                            <div className="max-h-80 overflow-y-auto">
                                <div className="p-6 space-y-3">
                                    {selectedFiles.map((file, index) => (
                                        <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 group">
                                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                                <div className="flex-shrink-0">
                                                    <div className="w-10 h-10 bg-white dark:bg-gray-700 rounded-lg flex items-center justify-center shadow-sm">
                                                        {getFileIcon(file.name.split('.').pop() || '')}
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                        {file.name}
                                                    </p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        {(file.size / 1024).toFixed(2)} KB • {file.name.split('.').pop()?.toUpperCase()}
                                                    </p>
                                                </div>
                                            </div>
                                            <Button
                                                onClick={() => removeFile(index)}
                                                variant="outline"
                                                size="sm"
                                                className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20 dark:hover:border-red-700 transition-all duration-200 opacity-0 group-hover:opacity-100"
                                            >
                                                <FaTrash className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Enhanced Modal Actions */}
                    <div className="flex justify-end gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                        <Button
                            onClick={handleCloseUploadModal}
                            variant="outline"
                            className="px-6 py-3 rounded-xl border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={proceedToUpload}
                            disabled={selectedFiles.length === 0}
                            className={`px-8 py-3 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 ${selectedFiles.length > 0
                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl'
                                : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                                }`}
                        >
                            {selectedFiles.length > 0 ? (
                                <>
                                    <FaUpload className="w-4 h-4 mr-2" />
                                    Upload {selectedFiles.length} File{selectedFiles.length !== 1 ? 's' : ''}
                                </>
                            ) : (
                                'Select File First'
                            )}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Enhanced Upload Confirmation Modal */}
            <Modal isOpen={showConfirmModal} onClose={handleCancelUpload}>
                <div className="w-full max-w-2xl">
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            Confirm Upload
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                            Ready to upload {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} to your organization
                        </p>
                    </div>

                    {selectedFiles.length > 0 && !isLoading && (
                        <div className="mb-6 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg overflow-hidden">
                            <div className="bg-gradient-to-r from-gray-50 to-blue-50/30 dark:from-gray-800 dark:to-blue-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                                <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Files to Upload
                                </h4>
                            </div>
                            <div className="max-h-60 overflow-y-auto">
                                <div className="p-6 space-y-3">
                                    {selectedFiles.map((file, index) => (
                                        <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 group">
                                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                                <div className="flex-shrink-0">
                                                    <div className="w-10 h-10 bg-white dark:bg-gray-700 rounded-lg flex items-center justify-center shadow-sm">
                                                        {getFileIcon(file.name.split(".").pop() || "")}
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                        {file.name}
                                                    </p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        {(file.size / 1024).toFixed(2)} KB • {file.name.split('.').pop()?.toUpperCase()}
                                                    </p>
                                                </div>
                                            </div>
                                            <Button
                                                onClick={() => removeFile(index)}
                                                variant="outline"
                                                size="sm"
                                                className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20 dark:hover:border-red-700 transition-all duration-200 opacity-0 group-hover:opacity-100"
                                            >
                                                <FaTrash className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {isLoading && (
                        <div className="flex flex-col items-center justify-center py-12 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                            <Loader />
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mt-4">
                                Uploading Files...
                            </h4>
                            <p className="text-gray-600 dark:text-gray-400 mt-2">
                                Please wait while we upload {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} to your organization
                            </p>
                        </div>
                    )}

                    <div className="flex justify-end gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                        <Button
                            variant="outline"
                            onClick={handleCancelUpload}
                            disabled={isLoading}
                            className="px-6 py-3 rounded-xl border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleConfirmUpload}
                            disabled={isLoading}
                            className="px-8 py-3 rounded-xl font-medium bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                        >
                            {isLoading ? (
                                <>
                                    <Loader />
                                    <span className="ml-2">Uploading...</span>
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    Upload {selectedFiles.length} File{selectedFiles.length !== 1 ? 's' : ''}
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </Modal>
            {/* Enhanced Delete Confirmation Modal */}
            <Modal isOpen={!!deleteConfirm} onClose={() => isDeleting ? undefined : setDeleteConfirm(null)}>
                <div className="w-full max-w-md">
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-gradient-to-br from-red-100 to-pink-100 dark:from-red-900/30 dark:to-pink-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <FaTrash className="w-8 h-8 text-red-600 dark:text-red-400" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            Delete File
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                            This action cannot be undone
                        </p>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-6">
                        <div className="flex items-center gap-3">
                            <div className="flex-shrink-0">
                                <div className="w-10 h-10 bg-white dark:bg-gray-700 rounded-lg flex items-center justify-center shadow-sm">
                                    {getFileIcon(deleteConfirm?.filename.split('.').pop() || '')}
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                    {deleteConfirm?.filename}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Organization File
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-4">
                        <Button
                            variant="outline"
                            onClick={() => setDeleteConfirm(null)}
                            disabled={isDeleting}
                            className="px-6 py-3 rounded-xl border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="danger"
                            onClick={() => {
                                if (deleteConfirm) handleDeleteDocument(deleteConfirm.doc_id);
                            }}
                            disabled={isDeleting}
                            className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                        >
                            {isDeleting ? (
                                <>
                                    <Loader />
                                    <span className="ml-2">Deleting...</span>
                                </>
                            ) : (
                                <>
                                    <FaTrash className="w-4 h-4 mr-2" />
                                    Delete File
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Enhanced Bulk Delete Modal */}
            <Modal isOpen={bulkDeleteOpen} onClose={() => isDeleting ? undefined : setBulkDeleteOpen(false)}>
                <div className="w-full max-w-md">
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-gradient-to-br from-red-100 to-pink-100 dark:from-red-900/30 dark:to-pink-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <FaTrash className="w-8 h-8 text-red-600 dark:text-red-400" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            Delete Multiple Files
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                            This action cannot be undone
                        </p>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-6">
                        <div className="flex items-center gap-3">
                            <div className="flex-shrink-0">
                                <div className="w-10 h-10 bg-white dark:bg-gray-700 rounded-lg flex items-center justify-center shadow-sm">
                                    <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {selectedFilenames.size} file{selectedFilenames.size !== 1 ? 's' : ''} selected
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    All selected files will be permanently deleted
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-4">
                        <Button
                            variant="outline"
                            onClick={() => setBulkDeleteOpen(false)}
                            disabled={isDeleting}
                            className="px-6 py-3 rounded-xl border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="danger"
                            onClick={handleBulkDelete}
                            disabled={isDeleting}
                            className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                        >
                            {isDeleting ? (
                                <>
                                    <Loader />
                                    <span className="ml-2">Deleting...</span>
                                </>
                            ) : (
                                <>
                                    <FaTrash className="w-4 h-4 mr-2" />
                                    Delete Selected
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </Modal>
            {/* Enhanced Duplicate File Warning Modal */}
            <Modal isOpen={showDuplicateWarning} onClose={handleDuplicateCancel}>
                <div className="w-full max-w-2xl">
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-gradient-to-br from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            Duplicate Files Detected
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                            {duplicateFiles.length} file{duplicateFiles.length !== 1 ? 's' : ''} already exist{duplicateFiles.length === 1 ? 's' : ''} in your organization
                        </p>
                    </div>

                    <div className="mb-6 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg overflow-hidden">
                        <div className="bg-gradient-to-r from-yellow-50 to-orange-50/30 dark:from-yellow-900/20 dark:to-orange-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Conflicting Files
                            </h4>
                        </div>
                        <div className="max-h-60 overflow-y-auto">
                            <div className="p-6 space-y-3">
                                {duplicateFiles.map((df, index) => (
                                    <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                        <div className="flex-shrink-0">
                                            <div className="w-10 h-10 bg-white dark:bg-gray-700 rounded-lg flex items-center justify-center shadow-sm">
                                                {getFileIcon(df.file.name.split('.').pop() || '')}
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                {df.file.name}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                Existing: {df.existingFile.name}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 mb-6">
                        <div className="flex items-start gap-3">
                            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div>
                                <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                                    What would you like to do?
                                </h4>
                                <p className="text-sm text-blue-800 dark:text-blue-200">
                                    Choose how to handle the duplicate files
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-4">
                        <Button
                            variant="outline"
                            onClick={handleDuplicateCancel}
                            className="px-6 py-3 rounded-xl border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleDuplicateAllow}
                            className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                        >
                            Create Versions
                        </Button>
                        <Button
                            onClick={handleDuplicateUpload}
                            className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                        >
                            Replace Files
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Enhanced FAQ Delete Confirmation Modal */}
            <Modal isOpen={!!faqDeleteConfirm} onClose={() => isFaqDeleting ? undefined : setFaqDeleteConfirm(null)}>
                <div className="w-full max-w-md">
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-gradient-to-br from-red-100 to-pink-100 dark:from-red-900/30 dark:to-pink-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <FaTrash className="w-8 h-8 text-red-600 dark:text-red-400" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            Delete FAQ File
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                            This action cannot be undone
                        </p>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-6">
                        <div className="flex items-center gap-3">
                            <div className="flex-shrink-0">
                                <div className="w-10 h-10 bg-white dark:bg-gray-700 rounded-lg flex items-center justify-center shadow-sm">
                                    <FaFileAlt className="text-green-600 dark:text-green-400" />
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                    {faqDeleteConfirm?.filename}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    FAQ CSV File
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-4">
                        <Button
                            variant="outline"
                            onClick={() => setFaqDeleteConfirm(null)}
                            disabled={isFaqDeleting}
                            className="px-6 py-3 rounded-xl border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="danger"
                            onClick={() => {
                                if (faqDeleteConfirm) {
                                    deleteFaqFile(faqDeleteConfirm.filename);
                                }
                            }}
                            disabled={isFaqDeleting}
                            className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                        >
                            {isFaqDeleting ? (
                                <>
                                    <Loader />
                                    <span className="ml-2">Deleting...</span>
                                </>
                            ) : (
                                <>
                                    <FaTrash className="w-4 h-4 mr-2" />
                                    Delete FAQ File
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}