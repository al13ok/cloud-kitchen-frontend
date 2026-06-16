"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Link } from "lucide-react";
import { CloseIcon, FileIcon } from "@/icons";
import { faqAiBotService } from "@/services/faqAiBotService";
import { BACKEND_URL, getAuthHeaders } from "@/utils/api";

// Map lucide-react icons to match expected names
const TextIcon = FileText;
const LinkIcon = Link;

interface KBCategory {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
}

interface CreateArticleModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess: () => void;
  categories: KBCategory[];
}

type ContentMode = "text" | "file" | "url";

const CreateArticleModal: React.FC<CreateArticleModalProps> = ({
  show,
  onClose,
  onSuccess,
  // categories, // Unused
}) => {
  const [mode, setMode] = useState<ContentMode>("text");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Customer"); // Always default to Customer
  const [tags, setTags] = useState("");
  const [author, setAuthor] = useState("");
  const [modelNumber, setModelNumber] = useState("");
  const [contentText, setContentText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [autoProcess, setAutoProcess] = useState(true);

  const resetForm = () => {
    setTitle("");
    setCategory("Customer"); // Always reset to Customer
    setTags("");
    setAuthor("");
    setModelNumber("");
    setContentText("");
    setFile(null);
    setUrl("");
    setAutoProcess(true);
    setError(null);
  };

  const handleClose = () => {
    console.log('🔴 [CreateArticleModal] Closing modal');
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Double-check form validation
    if (!isFormValid()) {
      console.warn('⚠️ [CreateArticleModal] Form validation failed');
      setError("Please fill in all required fields");
      return;
    }
    
    console.log('🟢 [CreateArticleModal] Submit clicked');
    console.log('🟢 [CreateArticleModal] Form data:', { title, tags, mode, file: file?.name, url });
    setLoading(true);
    setError(null);

    try {
      const tagsArray = tags.split(",").map((t) => t.trim()).filter(Boolean);

      if (mode === "text") {
        // Create text article using FAQ AI Bot
        // Category is always "Customer" - set by the service
        await faqAiBotService.createArticle({
          title,
          content: contentText,
          author: author || undefined,
          tags: tagsArray.length > 0 ? tagsArray : undefined,
          auto_process: autoProcess,
        });
      } else if (mode === "file" && file) {
        // Upload file article
        console.log('📄 [CreateArticleModal] Preparing file upload...');
        console.log('   File:', file.name, file.type, file.size, 'bytes');
        
        await faqAiBotService.uploadFiles([file], autoProcess);
      } else if (mode === "url") {
        // Ingest from URL
        await faqAiBotService.ingestFromUrl({
          url,
          title: title || undefined,
          auto_process: autoProcess,
        });
      }

      onSuccess();
      handleClose();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create article";
      setError(errorMessage);
      console.error('❌ [CreateArticleModal] Error creating article:', err);
      if (err instanceof Error) {
        console.error('❌ [CreateArticleModal] Error details:', {
          message: err.message,
          stack: err.stack,
          name: err.name
        });
      }
      
      // Show alert for immediate feedback
      alert(`Error: ${errorMessage}\n\nCheck console for details.`);
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = () => {
    // Title is required for text and URL modes, optional for file mode (filename is used)
    if (mode !== "file" && !title.trim()) return false;
    if (mode === "text" && !contentText.trim()) return false;
    if (mode === "file" && !file) return false;
    if (mode === "url" && !url.trim()) return false;
    return true;
  };

  // Debug: Log when modal opens/closes and ensure category is always Customer
  React.useEffect(() => {
    if (show) {
      console.log('🟢 [CreateArticleModal] Modal opened - mode:', mode);
      // Always set category to Customer when modal opens
      setCategory("Customer");
      // Test backend connectivity (silently, don't block UI on error)
      testBackendConnection().catch(() => {
        // Silently fail - this is just for debugging
      });
    }
  }, [show, mode]);

  const testBackendConnection = async () => {
    try {
      // Use the same base URL logic as faqAiBotService
      // Don't force HTTPS on localhost (causes SSL errors)
      let apiBaseUrl = BACKEND_URL || process.env['NEXT_PUBLIC_API_URL'] || 'https://py-mobiloitte.converiqo.ai';
      if (apiBaseUrl && apiBaseUrl.startsWith('http://')) {
        // Only convert to HTTPS if it's not localhost
        const isLocalhost = apiBaseUrl.includes('localhost') || apiBaseUrl.includes('127.0.0.1');
        if (!isLocalhost) {
          apiBaseUrl = apiBaseUrl.replace('http://', 'https://');
        }
      }
      
      const url = `${apiBaseUrl}/api/v1/faq-ai/stats`;
      
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      try {
        const response = await fetch(url, {
          headers: getAuthHeaders(),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        console.log('🎯 [CreateArticleModal] Backend connectivity test:', response.status, response.ok ? '✅' : '❌');
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (error) {
      // Only log network errors, don't throw - this is just for debugging
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.warn('⚠️ [CreateArticleModal] Backend connectivity test failed - network error (this is expected if backend is unreachable)');
      } else if (error instanceof Error && error.name === 'AbortError') {
        console.warn('⚠️ [CreateArticleModal] Backend connectivity test timed out');
      } else {
        console.warn('⚠️ [CreateArticleModal] Backend connectivity test failed:', error);
      }
      // Don't re-throw - this is just for debugging, should not affect UI
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div 
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[95vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Create New Article
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Add content to your knowledge base
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  aria-label="Close modal"
                >
                  <CloseIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              {/* Content Mode Selector */}
              <div className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setMode("text")}
                    className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      mode === "text"
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    <TextIcon className="w-5 h-5" />
                    <span className="font-medium">Text Content</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("file")}
                    className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      mode === "file"
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    <FileIcon className="w-5 h-5" />
                    <span className="font-medium">Upload File</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("url")}
                    className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      mode === "url"
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    <LinkIcon className="w-5 h-5" />
                    <span className="font-medium">Import from URL</span>
                  </button>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Title {mode !== "file" && <span className="text-red-500">*</span>}
                      {mode === "file" && <span className="text-gray-500 text-xs">(Optional - filename will be used if not provided)</span>}
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={mode === "file" ? "Enter custom title (optional)" : "Enter article title"}
                      required={mode !== "file"}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-900 dark:text-white"
                    />
                  </div>

                  {/* Author */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Author (Optional)
                    </label>
                    <input
                      type="text"
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      placeholder="Author name"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-900 dark:text-white"
                    />
                  </div>

                  {/* Model Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Model Number (Optional)
                    </label>
                    <input
                      type="text"
                      value={modelNumber}
                      onChange={(e) => setModelNumber(e.target.value)}
                      placeholder="e.g., HP-1234, Dell-XPS-15"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-900 dark:text-white"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Product model number for product-specific articles
                    </p>
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800"
                      disabled
                    >
                      <option value="Customer">Customer</option>
                    </select>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Articles are automatically categorized as Customer
                    </p>
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Tags (Optional, comma-separated)
                    </label>
                    <input
                      type="text"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="tutorial, guide, troubleshooting"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-900 dark:text-white"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Separate multiple tags with commas
                    </p>
                  </div>

                  {/* Content based on mode */}
                  {mode === "text" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Content <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={contentText}
                        onChange={(e) => setContentText(e.target.value)}
                        placeholder="Write your article content here..."
                        rows={12}
                        minLength={10}
                        required
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-900 dark:text-white resize-y"
                        style={{ minHeight: '200px' }}
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Minimum 10 characters required
                      </p>
                      <div className="flex items-center gap-2 mt-4">
                        <input
                          type="checkbox"
                          id="auto-process-text"
                          checked={autoProcess}
                          onChange={(e) => setAutoProcess(e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="auto-process-text" className="text-sm text-gray-700 dark:text-gray-300">
                          Auto-process into chunks (for AI query)
                        </label>
                      </div>
                    </div>
                  )}

                  {mode === "file" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Upload File <span className="text-red-500">*</span>
                      </label>
                      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-blue-500 dark:hover:border-blue-400 transition-colors cursor-pointer">
                        <input
                          type="file"
                          onChange={(e) => setFile(e.target.files?.[0] || null)}
                          accept=".pdf,.doc,.docx,.txt,.md"
                          className="hidden"
                          id="file-upload"
                          required
                        />
                        <label
                          htmlFor="file-upload"
                          className="cursor-pointer flex flex-col items-center"
                        >
                          <FileIcon className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-3" />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {file ? (
                              <span className="text-blue-600 dark:text-blue-400">{file.name}</span>
                            ) : (
                              "Click to upload or drag and drop"
                            )}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            PDF, DOC, DOCX, TXT, or MD (max 10MB)
                          </span>
                        </label>
                      </div>
                      <div className="flex items-center gap-2 mt-4">
                        <input
                          type="checkbox"
                          id="auto-process-file"
                          checked={autoProcess}
                          onChange={(e) => setAutoProcess(e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="auto-process-file" className="text-sm text-gray-700 dark:text-gray-300">
                          Auto-process into chunks (for AI query)
                        </label>
                      </div>
                    </div>
                  )}

                  {mode === "url" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        URL <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://example.com/article"
                        required
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-900 dark:text-white"
                      />
                      <div className="flex items-center gap-2 mt-4">
                        <input
                          type="checkbox"
                          id="auto-process-url"
                          checked={autoProcess}
                          onChange={(e) => setAutoProcess(e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="auto-process-url" className="text-sm text-gray-700 dark:text-gray-300">
                          Auto-process into chunks (for AI query)
                        </label>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        We&apos;ll automatically extract content from this URL
                      </p>
                    </div>
                  )}

                </div>

                {/* Footer - Inside Form */}
                <div className="flex flex-col gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0">
                  {/* Error Message - Only show actual errors, not validation warnings */}
                  {error && (
                    <div className="flex items-start gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
                      <span className="text-red-600 dark:text-red-400 text-lg">❌</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-800 dark:text-red-200">
                          Error creating article
                        </p>
                        <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-3">
                    <button 
                      type="button"
                      onClick={handleClose} 
                      disabled={loading}
                      className="px-6 py-2.5 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      onClick={() => {
                        console.log('🔵 [CreateArticleModal] Button clicked');
                        console.log('🔵 [CreateArticleModal] Form valid:', isFormValid());
                        console.log('🔵 [CreateArticleModal] Loading:', loading);
                        console.log('🔵 [CreateArticleModal] Mode:', mode);
                        console.log('🔵 [CreateArticleModal] Title:', title);
                        console.log('🔵 [CreateArticleModal] File:', file?.name);
                        console.log('🔵 [CreateArticleModal] URL:', url);
                        console.log('🔵 [CreateArticleModal] Content length:', contentText.length);
                        
                        // Fallback: if form validation fails, try submitting anyway if basic checks pass
                        if (!isFormValid()) {
                          console.warn('⚠️ Form validation failed, but attempting submit anyway');
                        }
                      }}
                      disabled={loading || !isFormValid()}
                      className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-all font-medium shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center gap-2"
                    >
                      {loading ? (
                        <>
                          <span className="animate-spin">⏳</span>
                          <span>Submitting...</span>
                        </>
                      ) : (
                        <>
                          <span>✓</span>
                          <span>Submit</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CreateArticleModal;
