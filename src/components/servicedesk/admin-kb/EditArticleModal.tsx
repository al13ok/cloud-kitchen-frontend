"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CloseIcon } from "@/icons";
import { faqAiBotService } from "@/services/faqAiBotService";
import type { FAQAIArticle } from "@/services/faqAiBotService";

interface EditArticleModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess: () => void;
  article: FAQAIArticle | null;
  categories: Array<{ id: string; name: string; is_active: boolean }>;
}

// Standard categories (defined outside component to avoid recreation)
const STANDARD_CATEGORIES = ["Public", "General", "Customer", "Employee"];

const EditArticleModal: React.FC<EditArticleModalProps> = ({
  show,
  onClose,
  onSuccess,
  article,
  // categories, // Unused
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchingContent, setFetchingContent] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [author, setAuthor] = useState("");
  const [contentText, setContentText] = useState("");
  // const [url, setUrl] = useState(""); // Unused
  
  // Populate form when article changes
  useEffect(() => {
    if (article && show) {
      setTitle(article.title);
      // Set category - use article's category if it's a standard one, otherwise empty
      const articleCategory = article.category || "";
      setCategory(STANDARD_CATEGORIES.includes(articleCategory) ? articleCategory : "");
      setTags(article.tags.join(", ") || "");
      setAuthor(article.author || "");
      // setUrl(article.source_url || ""); // Unused
      setContentText("");
    }
  }, [article, show]);

  const fetchArticleContent = useCallback(async () => {
    if (!article) return;
    
    try {
      setFetchingContent(true);
      const fileDetail = await faqAiBotService.getFile(article.id, {
        include_content: true,
      });
      
      if (fileDetail.content) {
        setContentText(fileDetail.content);
      }
    } catch (err) {
      console.error("Error fetching article content:", err);
      setError("Failed to load article content");
    } finally {
      setFetchingContent(false);
    }
  }, [article]);

  useEffect(() => {
    if (article && show && article.source === "Manual") {
      fetchArticleContent();
    }
  }, [article, show, fetchArticleContent]);

  const resetForm = () => {
    setTitle("");
    setCategory("");
    setTags("");
    setAuthor("");
    setContentText("");
    // setUrl(""); // Unused
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!article) return;

    setLoading(true);
    setError(null);

    try {
      const tagsArray = tags.split(",").map((t) => t.trim()).filter(Boolean);
      
      // Use updateArticle which handles different source types automatically
      await faqAiBotService.updateArticle(article.id, {
        title: title || undefined,
        content: article.source === "Manual" ? contentText : undefined,
        author: author || undefined,
        tags: tagsArray.length > 0 ? tagsArray : undefined,
        category: category.trim() || undefined,
        reprocess: false,
      });

      onSuccess();
      handleClose();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update article";
      setError(errorMessage);
      console.error("Error updating article:", err);
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = () => {
    return title.trim().length > 0;
  };

  if (!article) return null;

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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none"
          >
            <div 
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[95vh] flex flex-col overflow-hidden pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Edit Article
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Update article information and content
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

              {/* Form */}
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                <div className="p-6 space-y-6">
                  {/* Source Type Info */}
                  {article && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        <strong>Source Type:</strong> {article.source === "Manual" ? "Article (Manual Entry)" : article.source === "URL" ? "URL Content" : "Uploaded File"}
                      </p>
                      {article.source === "URL" && article.source_url && (
                        <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                          URL: <a href={article.source_url} target="_blank" rel="noopener noreferrer" className="underline">{article.source_url}</a>
                        </p>
                      )}
                    </div>
                  )}

                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                      placeholder="Enter article title"
                      required
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-900 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Category */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Category (Optional)
                      </label>
                      <select
                        value={category}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCategory(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-900 dark:text-white"
                      >
                        <option value="">None</option>
                        <option value="Public">Public</option>
                        <option value="General">General</option>
                        <option value="Customer">Customer</option>
                        <option value="Employee">Employee</option>
                      </select>
                      {article && article.category && !STANDARD_CATEGORIES.includes(article.category) && (
                        <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                          Current category: &quot;{article.category}&quot; (not a standard category, will be reset to None)
                        </p>
                      )}
                      {(!article || !article.category || STANDARD_CATEGORIES.includes(article.category || "")) && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Categories affect visibility to different user types (guest, customer, employee)
                        </p>
                      )}
                    </div>

                    {/* Author */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Author (Optional)
                      </label>
                      <input
                        type="text"
                        value={author}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAuthor(e.target.value)}
                        placeholder="Author name"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Tags (Optional, comma-separated)
                    </label>
                    <input
                      type="text"
                      value={tags}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTags(e.target.value)}
                      placeholder="tutorial, guide, troubleshooting"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-900 dark:text-white"
                    />
                  </div>

                  {/* Content - Only for Manual Articles */}
                  {article?.source === "Manual" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Content <span className="text-red-500">*</span>
                      </label>
                      {fetchingContent ? (
                        <div className="flex items-center justify-center py-8 border border-gray-300 dark:border-gray-600 rounded-lg">
                          <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-600"></div>
                          <span className="ml-3 text-sm text-gray-600 dark:text-gray-400">Loading content...</span>
                        </div>
                      ) : (
                        <textarea
                          value={contentText}
                          onChange={(e) => setContentText(e.target.value)}
                          placeholder="Article content..."
                          rows={12}
                          required
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-900 dark:text-white resize-y"
                          style={{ minHeight: '200px' }}
                        />
                      )}
                    </div>
                  )}

                  {/* Info message for non-manual articles */}
                  {article && article.source !== "Manual" && (
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        {article.source === "URL" 
                          ? "URL content cannot be edited directly. The content will be re-scraped when you update the URL."
                          : "File content cannot be edited directly. You can only update metadata (title, author, tags, category)."
                        }
                      </p>
                    </div>
                  )}

                  {/* Error Message */}
                  {error && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    </div>
                  )}
                </div>
              </form>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                <button 
                  onClick={handleClose} 
                  disabled={loading}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!isFormValid() || loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Updating...
                    </>
                  ) : (
                    "Update Article"
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default EditArticleModal;
