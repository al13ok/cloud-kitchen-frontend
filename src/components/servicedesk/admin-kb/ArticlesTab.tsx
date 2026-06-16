"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Filter, Pencil, Trash2 } from "lucide-react";
import { EyeIcon } from "@/icons";
import Badge from "@/components/ui/badge/Badge";
import { formatDistanceToNow } from "date-fns";
import type { FAQAIArticle } from "@/services/faqAiBotService";
import { faqAiBotService } from "@/services/faqAiBotService";

// Map lucide-react icons to match the expected names
const SearchIcon = Search;
const FilterIcon = Filter;
const EditIcon = Pencil;
const TrashIcon = Trash2;

// Compatibility types
type KBArticle = FAQAIArticle & {
  file_name?: string;
};
type KBCategory = {
  id: string;
  name: string;
  description?: string;
  parent_id?: string;
  icon?: string;
  display_order: number;
  is_active: boolean;
  article_count?: number;
  created_at?: string;
};

interface ArticlesTabProps {
  articles: KBArticle[];
  categories: KBCategory[];
  onRefresh: () => void;
  onEdit: (article: KBArticle) => void;
  onDelete: (article: KBArticle) => void;
  onView: (article: KBArticle) => void;
}

const ArticlesTab: React.FC<ArticlesTabProps> = ({
  articles,
  // categories, // Unused
  onRefresh,
  onEdit,
  onDelete,
  onView,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceTypeFilter, setSourceTypeFilter] = useState<string>("all");
  const [fileFormatFilter, setFileFormatFilter] = useState<string>("all");
  const [processedFilter, setProcessedFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"recent" | "title" | "size" | "chunks">("recent");
  const [filteredArticles, setFilteredArticles] = useState<KBArticle[]>(articles);
  const [selectedArticles, setSelectedArticles] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkDeleteMessage, setBulkDeleteMessage] = useState<string | null>(null);
  const [bulkDeleteError, setBulkDeleteError] = useState<string | null>(null);

  // Debug: Log article data to check author field
  useEffect(() => {
    if (articles.length > 0) {
      console.log('📋 Articles data sample:', {
        total: articles.length,
        firstArticle: {
          id: articles[0].id,
          title: articles[0].title,
          author: articles[0].author,
          authorType: typeof articles[0].author,
          authorLength: articles[0].author?.length,
        }
      });
    }
  }, [articles]);

  // Filter and sort articles
  useEffect(() => {
    let filtered = [...articles];

    // Search filter - search in title, content preview, tags, and author
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (article) =>
          article.title.toLowerCase().includes(query) ||
          (article.content && article.content.toLowerCase().includes(query)) ||
          article.tags.some((tag) => tag.toLowerCase().includes(query)) ||
          (article.author && article.author.toLowerCase().includes(query))
      );
    }

    // Source type filter
    if (sourceTypeFilter !== "all") {
      filtered = filtered.filter((article) => {
        const source = article.source || "Upload";
        if (sourceTypeFilter === "manual") {
          return source === "Manual" || (source as string) === "Article";
        }
        return source === sourceTypeFilter;
      });
    }

    // File format filter
    if (fileFormatFilter !== "all") {
      filtered = filtered.filter((article) => {
        const contentType = getContentType(article);
        return contentType === fileFormatFilter;
      });
    }

    // Processed filter
    if (processedFilter !== "all") {
      filtered = filtered.filter((article) => {
        if (processedFilter === "processed") {
          return article.is_processed === true;
        } else {
          return article.is_processed !== true;
        }
      });
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "title":
          return a.title.localeCompare(b.title);
        case "size":
          const aSize = a.file_size || 0;
          const bSize = b.file_size || 0;
          return bSize - aSize;
        case "chunks":
          return (b.chunks_count || 0) - (a.chunks_count || 0);
        case "recent":
        default:
          const aDate = a.updated_at 
            ? new Date(a.updated_at as string).getTime() 
            : (a.created_at ? new Date(a.created_at as string).getTime() : 0);
          const bDate = b.updated_at 
            ? new Date(b.updated_at as string).getTime() 
            : (b.created_at ? new Date(b.created_at as string).getTime() : 0);
          return bDate - aDate;
      }
    });

    setFilteredArticles(filtered);
  }, [articles, searchQuery, sourceTypeFilter, fileFormatFilter, processedFilter, sortBy]);

  // Bulk action handlers
  const handleSelectAll = () => {
    if (selectedArticles.size === filteredArticles.length) {
      setSelectedArticles(new Set());
    } else {
      setSelectedArticles(new Set(filteredArticles.map(a => a.id)));
    }
  };

  const handleSelectArticle = (id: string) => {
    const newSelected = new Set(selectedArticles);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedArticles(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedArticles.size === 0 || bulkDeleting) {
      return;
    }

    const selectedArticleObjects = articles.filter(article => selectedArticles.has(article.id));
    if (selectedArticleObjects.length === 0) {
      return;
    }

    const confirmDelete = window.confirm(
      `Delete ${selectedArticleObjects.length} article${selectedArticleObjects.length > 1 ? 's' : ''}? This cannot be undone.`
    );
    if (!confirmDelete) {
      return;
    }

    setBulkDeleting(true);
    setBulkDeleteError(null);
    setBulkDeleteMessage(null);

    try {
      const results = await Promise.allSettled(
        selectedArticleObjects.map(article => {
          const fileIdentifier = article.file_name ?? article.id;
          return faqAiBotService.deleteFile(fileIdentifier, true);
        })
      );

      const failed = results.filter(result => result.status === "rejected");
      if (failed.length > 0) {
        setBulkDeleteError(`Failed to delete ${failed.length} article(s). Please try again.`);
      } else {
        setBulkDeleteMessage(`Deleted ${selectedArticleObjects.length} article${selectedArticleObjects.length > 1 ? 's' : ''} successfully.`);
      }

      setSelectedArticles(new Set());
      await onRefresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete selected articles.";
      setBulkDeleteError(message);
    } finally {
      setBulkDeleting(false);
      setTimeout(() => {
        setBulkDeleteMessage(null);
        setBulkDeleteError(null);
      }, 4000);
    }
  };

  const getContentType = (article: KBArticle): string => {
    // Check source type first - Manual articles
    if (article.source === "Manual") {
      return "Article";
    }
    
    // Check if URL source
    if (article.source === "URL" || article.source_url) {
      return "URL";
    }
    
    // Check file_type for uploaded files
    if (article.file_type) {
      const ext = article.file_type.toLowerCase();
      if (ext.includes("pdf")) return "PDF";
      if (ext.includes("docx") || ext.includes("doc")) return "DOCX";
      if (ext.includes("txt") || ext.includes("text")) return "TXT";
      if (ext.includes("md") || ext.includes("markdown")) return "Markdown";
      return ext.toUpperCase();
    }
    
    // Check source type
    if (article.source === "Upload") {
      return "File";
    }
    
    // Default fallback
    return "Unknown";
  };

  const formatFileSize = (bytes: number | undefined): string => {
    if (!bytes || bytes === 0) return "-";
    
    const kb = bytes / 1024;
    const mb = kb / 1024;
    const gb = mb / 1024;
    
    if (gb >= 1) {
      return `${gb.toFixed(2)} GB`;
    } else if (mb >= 1) {
      return `${mb.toFixed(2)} MB`;
    } else if (kb >= 1) {
      return `${kb.toFixed(2)} KB`;
    } else {
      return `${bytes} B`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Bulk Actions Bar */}
      {selectedArticles.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                {selectedArticles.size} article{selectedArticles.size !== 1 ? 's' : ''} selected
              </span>
              <button
                onClick={() => setSelectedArticles(new Set())}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Clear selection
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {bulkDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
          {(bulkDeleteMessage || bulkDeleteError) && (
            <div className="mt-3 text-sm">
              {bulkDeleteMessage && (
                <p className="text-green-700 dark:text-green-300">{bulkDeleteMessage}</p>
              )}
              {bulkDeleteError && (
                <p className="text-red-700 dark:text-red-300">{bulkDeleteError}</p>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* Filters Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="relative md:col-span-2">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by title, content, tags, or author..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              className="pl-10 w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-900 dark:text-white"
            />
          </div>

          {/* Source Type Filter */}
          <select
            value={sourceTypeFilter}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSourceTypeFilter(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-900 dark:text-white"
          >
            <option value="all">All Sources</option>
            <option value="Upload">Uploaded Files</option>
            <option value="URL">URL Content</option>
            <option value="manual">Manual Articles</option>
          </select>

          {/* File Format Filter */}
          <select
            value={fileFormatFilter}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFileFormatFilter(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-900 dark:text-white"
          >
            <option value="all">All Formats</option>
            <option value="Article">Article</option>
            <option value="PDF">PDF</option>
            <option value="DOCX">DOCX</option>
            <option value="TXT">TXT</option>
            <option value="URL">URL</option>
          </select>

          {/* Processed Filter */}
          <select 
            value={processedFilter}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setProcessedFilter(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="processed">Processed</option>
            <option value="unprocessed">Unprocessed</option>
          </select>
        </div>

        {/* Sort and Results Count */}
        <div className="mt-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">Sort by:</label>
            <select 
              value={sortBy} 
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSortBy(e.target.value as "recent" | "title" | "size" | "chunks")}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-900 dark:text-white"
            >
              <option value="recent">Most Recent</option>
              <option value="title">Title (A-Z)</option>
              <option value="size">File Size</option>
              <option value="chunks">Chunks Count</option>
            </select>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {filteredArticles.length} of {articles.length}{" "}
          articles
          </div>
        </div>
      </div>

      {/* Articles Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-4 text-left w-12">
                  <input
                    type="checkbox"
                    checked={selectedArticles.size === filteredArticles.length && filteredArticles.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Article
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Author
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  File Size
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Updated
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredArticles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                      <FilterIcon className="w-12 h-12 mb-3 opacity-50" />
                      <p className="text-lg font-medium">No articles found</p>
                      <p className="text-sm mt-1">Try adjusting your filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredArticles.map((article, index) => (
                  <motion.tr
                    key={`${article.id}-${index}-${article.title}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedArticles.has(article.id)}
                        onChange={() => handleSelectArticle(article.id)}
                        className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                              {article.title}
                            </h4>
                          </div>
                          {article.content && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                              {article.content.substring(0, 100)}{article.content.length > 100 ? "..." : ""}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="light" color="info" size="sm">
                        {getContentType(article)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {(() => {
                          const author = article.author;
                          // Check if author exists and is not empty/undefined/null
                          if (author && typeof author === 'string' && author.trim() !== '' && author.trim() !== 'Unknown') {
                            return author.trim();
                          }
                          return <span className="text-gray-400 dark:text-gray-500">-</span>;
                        })()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {article.file_size !== undefined && article.file_size !== null && article.file_size > 0
                          ? formatFileSize(article.file_size) 
                          : <span className="text-gray-400 dark:text-gray-500">-</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {article.updated_at && article.updated_at.trim() !== ""
                          ? formatDistanceToNow(new Date(article.updated_at), {
                              addSuffix: true,
                            })
                          : "recently"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onView(article)}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          title="View Article"
                        >
                          <EyeIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </button>
                        <button
                          onClick={() => onEdit(article)}
                          className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Edit Article"
                        >
                          <EditIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </button>
                        <button
                          onClick={() => onDelete(article)}
                          className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Delete Article"
                        >
                          <TrashIcon className="w-4 h-4 text-red-600 dark:text-red-400" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ArticlesTab;
