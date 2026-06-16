/**
 * FAQ AI Bot Service
 * Handles all API calls for FAQ AI Bot endpoints (knowledge base management)
 */

import { BACKEND_URL, getAuthHeaders } from '@/utils/api';

// Use BACKEND_URL directly - don't force HTTPS on localhost (causes SSL errors)
// Only convert to HTTPS if it's not localhost/127.0.0.1
let apiBaseUrl = BACKEND_URL || process.env['NEXT_PUBLIC_API_URL'] || 'https://py-mobiloitte.converiqo.ai';
if (apiBaseUrl && apiBaseUrl.startsWith('http://')) {
  // Only convert to HTTPS if it's not localhost
  const isLocalhost = apiBaseUrl.includes('localhost') || apiBaseUrl.includes('127.0.0.1');
  if (!isLocalhost) {
    apiBaseUrl = apiBaseUrl.replace('http://', 'https://');
  }
}

const FAQ_AI_BASE_URL = `${apiBaseUrl}/api/v1/faq-ai`;

// ============================================================================
// TYPES
// ============================================================================

export interface FAQAIFile {
  file_name: string;
  file_hash: string;
  content_type: string;
  source_url?: string;
  source_type: 'file' | 'url' | 'manual';
  source_type_label: string;
  title?: string;
  author?: string;
  tags?: string[];
  category?: string;
  file_size?: number;
  chunks_count: number;
  is_processed: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface FAQAIArticle {
  // Map from FAQAIFile to match KBArticle interface
  id: string; // file_name
  title: string;
  content?: string;
  author: string;
  category: string;
  tags: string[];
  source: 'Upload' | 'URL' | 'Manual';
  source_url?: string;
  file_type?: string;
  status: 'draft' | 'published' | 'archived'; // Always published for FAQ AI
  created_at?: string;
  updated_at?: string;
  view_count: number;
  helpful_count: number;
  not_helpful_count: number;
  file_size?: number;
  chunks_count: number;
  is_processed: boolean;
}

export interface FilesListResponse {
  files: FAQAIFile[];
  total_files: number;
}

export interface FileDetailResponse extends FAQAIFile {
  content?: string;
  chunks?: Array<{
    chunk_id: string;
    page_or_section: string;
    text_preview: string;
    text_length: number;
  }>;
}

export interface StatsResponse {
  total_files: number;
  total_chunks: number;
  files_by_type: {
    file: number;
    url: number;
    manual: number;
  };
  files_by_format: {
    pdf: number;
    docx: number;
    txt: number;
  };
  processed_files: number;
  unprocessed_files: number;
  total_file_size: number;
  average_chunks_per_file: number;
  last_upload?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function mapFileToArticle(file: FAQAIFile): FAQAIArticle {
  // For manual articles, always use the title field if available
  // Clean the title to remove any file extensions or unwanted suffixes
  let articleTitle = file.title;
  
  if (!articleTitle || articleTitle.trim() === '') {
    // Fallback: remove file extensions from file_name
    articleTitle = file.file_name;
  }
  
  // Clean the title: remove file extensions and trim whitespace
  articleTitle = articleTitle
    .replace(/\.txt$/i, '')
    .replace(/\.pdf$/i, '')
    .replace(/\.docx$/i, '')
    .replace(/\.doc$/i, '')
    .trim();
  
  return {
    id: file.file_name,
    title: articleTitle,
    author: file.author || 'Unknown',
    category: file.category || 'Uncategorized',
    tags: file.tags || [],
    source: file.source_type === 'file' ? 'Upload' : file.source_type === 'url' ? 'URL' : 'Manual',
    source_url: file.source_url,
    file_type: file.content_type,
    status: 'published',
    created_at: file.created_at,
    updated_at: file.updated_at,
    view_count: 0, // FAQ AI doesn't track views
    helpful_count: 0, // FAQ AI doesn't track feedback
    not_helpful_count: 0,
    file_size: file.file_size,
    chunks_count: file.chunks_count,
    is_processed: file.is_processed,
  };
}

// ============================================================================
// FAQ AI BOT SERVICE
// ============================================================================

export const faqAiBotService = {
  /**
   * Get all files (articles) with optional filtering
   */
  async getFiles(params?: {
    source_type?: 'file' | 'url' | 'manual';
  }): Promise<FilesListResponse> {
    const queryParams = new URLSearchParams();
    if (params?.source_type) {
      queryParams.append('source_type', params.source_type);
    }
    
    const url = `${FAQ_AI_BASE_URL}/files${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    try {
      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });
      
      if (!response.ok) {
        // Try to get error details from response
        let errorMessage = `Failed to fetch files: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch {
          // If JSON parsing fails, use the status text
        }
        throw new Error(errorMessage);
      }
      
      return response.json();
    } catch (error) {
      // Handle network errors (CORS, connection refused, etc.)
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Unable to connect to the server. Please check your connection or try again later.');
      }
      // Re-throw other errors
      throw error;
    }
  },

  /**
   * Get a single file by file_name
   */
  async getFile(
    file_name: string,
    options?: {
      include_content?: boolean;
      include_chunks?: boolean;
      debug?: boolean;
    }
  ): Promise<FileDetailResponse> {
    const queryParams = new URLSearchParams();
    if (options?.include_content) queryParams.append('include_content', 'true');
    if (options?.include_chunks) queryParams.append('include_chunks', 'true');
    if (options?.debug) queryParams.append('debug', 'true');
    
    const encodedName = encodeURIComponent(file_name);
    const url = `${FAQ_AI_BASE_URL}/files/${encodedName}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }
    
    return response.json();
  },

  /**
   * Download a file by file_name
   */
  async downloadFile(file_name: string): Promise<void> {
    const encodedName = encodeURIComponent(file_name);
    const url = `${FAQ_AI_BASE_URL}/files/${encodedName}/download`;
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }
    
    // Get filename from Content-Disposition header or use file_name
    const contentDisposition = response.headers.get('content-disposition');
    let filename = file_name;
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }
    
    // Get file content as blob
    const blob = await response.blob();
    
    // Create download link and trigger download
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  },

  /**
   * Create an article from text content (using form-data for multi-line support)
   * Always uses "Customer" as the category.
   */
  async createArticle(data: {
    title: string;
    content: string;
    author?: string;
    model_number?: string;
    tags?: string[];
    category?: string; // Deprecated - always uses "Customer"
    auto_process?: boolean;
  }): Promise<{
    file: string;
    status: string;
    title: string;
    chunks_created: number;
    content_length: number;
  }> {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('content', data.content);
    if (data.author) formData.append('author', data.author);
    if (data.model_number) formData.append('model_number', data.model_number);
    if (data.tags && data.tags.length > 0) {
      formData.append('tags', data.tags.join(','));
    }
    // Always use "Customer" as category
    formData.append('category', 'Customer');
    formData.append('auto_process', (data.auto_process ?? true).toString());
    
    const headers = getAuthHeaders();
    // Convert HeadersInit to plain object and remove Content-Type for FormData
    const formHeaders: Record<string, string> = {};
    if (headers instanceof Headers) {
      headers.forEach((value, key) => {
        if (key.toLowerCase() !== 'content-type') {
          formHeaders[key] = value;
        }
      });
    } else if (Array.isArray(headers)) {
      headers.forEach(([key, value]) => {
        if (key.toLowerCase() !== 'content-type') {
          formHeaders[key] = value;
        }
      });
    } else {
      Object.entries(headers).forEach(([key, value]) => {
        if (key.toLowerCase() !== 'content-type') {
          formHeaders[key] = value as string;
        }
      });
    }
    
    const response = await fetch(`${FAQ_AI_BASE_URL}/create-article/form`, {
      method: 'POST',
      headers: formHeaders,
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(`Failed to create article: ${errorData.detail || response.statusText}`);
    }
    
    return response.json();
  },

  /**
   * Upload files (PDF, DOCX, TXT)
   */
  async uploadFiles(
    files: File[],
    auto_process: boolean = false
  ): Promise<{
    results: Array<{
      file: string;
      status: string;
      chunks_created?: number;
      processing_error?: string;
    }>;
    errors: Array<{
      file: string;
      error: string;
      status_code: number;
    }>;
  }> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });
    formData.append('auto_process', auto_process.toString());
    
    const headers = getAuthHeaders();
    // Convert HeadersInit to plain object and remove Content-Type for FormData
    const formHeaders: Record<string, string> = {};
    if (headers instanceof Headers) {
      headers.forEach((value, key) => {
        if (key.toLowerCase() !== 'content-type') {
          formHeaders[key] = value;
        }
      });
    } else if (Array.isArray(headers)) {
      headers.forEach(([key, value]) => {
        if (key.toLowerCase() !== 'content-type') {
          formHeaders[key] = value;
        }
      });
    } else {
      Object.entries(headers).forEach(([key, value]) => {
        if (key.toLowerCase() !== 'content-type') {
          formHeaders[key] = value as string;
        }
      });
    }
    
    const response = await fetch(`${FAQ_AI_BASE_URL}/upload?auto_process=${auto_process}`, {
      method: 'POST',
      headers: formHeaders,
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(`Failed to upload files: ${errorData.detail || response.statusText}`);
    }
    
    return response.json();
  },

  /**
   * Ingest content from URL
   */
  async ingestFromUrl(data: {
    url: string;
    title?: string;
    auto_process?: boolean;
  }): Promise<{
    file: string;
    status: string;
    url: string;
    title: string;
    chunks_created: number;
    content_length: number;
  }> {
    const response = await fetch(`${FAQ_AI_BASE_URL}/ingest-url`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        url: data.url,
        title: data.title,
        auto_process: data.auto_process ?? true,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(`Failed to ingest URL: ${errorData.detail || response.statusText}`);
    }
    
    return response.json();
  },

  /**
   * Update an article
   */
  async updateArticle(
    file_name: string,
    data: {
      title?: string;
      content?: string;
      author?: string;
      tags?: string[];
      category?: string;
      reprocess?: boolean;
    }
  ): Promise<{
    file_name: string;
    status: string;
    title: string;
    chunks_regenerated?: boolean;
    new_chunks_count?: number;
    old_chunks_deleted?: number;
    content_length?: number;
  }> {
    // Determine which endpoint to use based on source_type
    const fileDetail = await this.getFile(file_name);
    
    if (fileDetail.source_type === 'manual') {
      // Use article update endpoint
      const response = await fetch(`${FAQ_AI_BASE_URL}/articles/${encodeURIComponent(file_name)}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title: data.title,
          content: data.content,
          author: data.author,
          tags: data.tags,
          category: data.category,
          reprocess: data.reprocess ?? false,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error(`Failed to update article: ${errorData.detail || response.statusText}`);
      }
      
      return response.json();
    } else {
      // Use file update endpoint
      const response = await fetch(`${FAQ_AI_BASE_URL}/files/${encodeURIComponent(file_name)}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title: data.title,
          author: data.author,
          tags: data.tags,
          category: data.category,
          reprocess: data.reprocess ?? false,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error(`Failed to update file: ${errorData.detail || response.statusText}`);
      }
      
      return response.json();
    }
  },

  /**
   * Delete a file/article
   */
  async deleteFile(
    file_name: string,
    delete_chunks: boolean = true
  ): Promise<{
    file_name: string;
    status: string;
    file_deleted: boolean;
    chunks_deleted: number;
  }> {
    const response = await fetch(
      `${FAQ_AI_BASE_URL}/delete/files/${encodeURIComponent(file_name)}?delete_chunks=${delete_chunks}`,
      {
        method: 'DELETE',
        headers: getAuthHeaders(),
      }
    );
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(`Failed to delete file: ${errorData.detail || response.statusText}`);
    }
    
    return response.json();
  },

  /**
   * Get statistics
   */
  async getStats(debug?: boolean): Promise<StatsResponse> {
    const url = `${FAQ_AI_BASE_URL}/stats${debug ? '?debug=true' : ''}`;
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch stats: ${response.statusText}`);
    }
    
    return response.json();
  },

  /**
   * Process files into chunks
   */
  async processFiles(): Promise<{
    chunks_inserted: number;
    files_processed: number;
    errors: Array<{
      file_name: string;
      error: string;
    }>;
  }> {
    const response = await fetch(`${FAQ_AI_BASE_URL}/process`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(`Failed to process files: ${errorData.detail || response.statusText}`);
    }
    
    return response.json();
  },

  // ============================================================================
  // MAPPED METHODS FOR COMPATIBILITY
  // ============================================================================

  /**
   * Get articles (mapped from files)
   */
  async getArticles(params?: {
    source_type?: 'file' | 'url' | 'manual';
  }): Promise<{
    articles: FAQAIArticle[];
    pagination: {
      total: number;
      page: number;
      size: number;
      total_pages: number;
    };
  }> {
    const filesResponse = await this.getFiles(params);
    const articles = filesResponse.files.map(mapFileToArticle);
    
    return {
      articles,
      pagination: {
        total: filesResponse.total_files,
        page: 1,
        size: filesResponse.total_files,
        total_pages: 1,
      },
    };
  },
};

export default faqAiBotService;


