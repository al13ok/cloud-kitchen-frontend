"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CloseIcon, DownloadIcon } from "@/icons";
import Badge from "@/components/ui/badge/Badge";
import type { FAQAIArticle } from "@/services/faqAiBotService";
import { faqAiBotService } from "@/services/faqAiBotService";

interface ArticleViewModalProps {
  article: FAQAIArticle;
  onClose: () => void;
}

const ArticleViewModal: React.FC<ArticleViewModalProps> = ({
  article,
  onClose,
}) => {
  const [fullArticle, setFullArticle] = useState<FAQAIArticle>(article);
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState<string | null>(article.content || null);

  const fetchFullArticle = useCallback(async () => {
    try {
      setLoading(true);
      // Use file_name (which is the id) to fetch the file with content
      const fileDetail = await faqAiBotService.getFile(article.id, {
        include_content: true,
        include_chunks: false,
      });
      
      // Extract content from file detail
      if (fileDetail && fileDetail.content) {
        const fetchedContent = fileDetail.content;
        setContent(fetchedContent);
        // Update fullArticle with latest data including content
        const updatedArticle: FAQAIArticle = {
          ...article,
          content: fetchedContent,
        };
        setFullArticle(updatedArticle);
      } else {
        // If no content in response, keep existing or show message
        console.warn("No content returned from API for article:", article.id);
      }
    } catch (err) {
      console.error("Error fetching full article:", err);
    } finally {
      setLoading(false);
    }
  }, [article]);

  useEffect(() => {
    if (!article.content || !content) {
      fetchFullArticle();
    }
  }, [article.content, content, fetchFullArticle]);

  const handleDownload = async () => {
    try {
      // Download file using FAQ AI Bot service
      await faqAiBotService.downloadFile(article.id);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("Error downloading file:", err);
      alert(`Failed to download file: ${errorMessage}`);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { color: "light" as const, text: "Draft" },
      pending_review: { color: "warning" as const, text: "Pending Review" },
      published: { color: "success" as const, text: "Published" },
      archived: { color: "dark" as const, text: "Archived" },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return (
      <Badge variant="light" color={config.color} size="sm">
        {config.text}
      </Badge>
    );
  };

  const getSourceBadge = (source: string) => {
    const colors = {
      Upload: "info" as const,
      URL: "primary" as const,
      Manual: "success" as const,
    };
    return (
      <Badge variant="light" color={colors[source as keyof typeof colors] || "info"} size="sm">
        {source}
      </Badge>
    );
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal */}
        <div className="flex items-center justify-center min-h-screen p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-start justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
              <div className="flex-1 pr-4">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {fullArticle.title}
                  </h2>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
              >
                <CloseIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Article Metadata */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Status</div>
                  {getStatusBadge(fullArticle.status)}
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Source</div>
                  {getSourceBadge(fullArticle.source)}
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Category</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {fullArticle.category}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Author</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {fullArticle.author}
                  </div>
                </div>
              </div>


              {/* Tags */}
              {fullArticle.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {fullArticle.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600 dark:border-gray-700 dark:border-t-blue-400"></div>
                </div>
              ) : (
                <div className="prose dark:prose-invert max-w-none">
                  {content || fullArticle.content ? (
                    <div className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {content || fullArticle.content}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 dark:text-gray-400 py-12">
                      <p>No content available</p>
                      {fullArticle.source === "Upload" && (
                        <p className="text-sm mt-2">
                          This article was uploaded as a file. Content may not be directly viewable.
                        </p>
                      )}
                      {fullArticle.source === "URL" && fullArticle.source_url && (
                        <p className="text-sm mt-2">
                          <a 
                            href={fullArticle.source_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            View original source
                          </a>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              {fullArticle.source === "Upload" && (
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mr-3"
                >
                  <DownloadIcon className="w-4 h-4" />
                  Download File
                </button>
              )}
              <button
                onClick={onClose}
                className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};

export default ArticleViewModal;
