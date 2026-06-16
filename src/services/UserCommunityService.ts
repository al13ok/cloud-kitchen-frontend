/**
 * User Community Service
 * API service for user-side community functionality
 */



const API_BASE_URL = 'https://py-mobiloitte.converiqo.ai/api/v1/community-forum';



// =============================================================================
// TYPES & INTERFACES
// =============================================================================



export interface UserJoinRequest {
  username: string;
  email: string;
  full_name: string;
  bio?: string;
  role?: string;
}



export interface UserPostRequest {
  title: string;
  content: string;
  category: 'problem' | 'question' | 'suggestion';
  author_id: string;
}



export interface CommunityUser {
  user_id: string;
  username: string;
  email: string;
  full_name: string;
  bio?: string;
  role: string;
  status: string;
  is_active: boolean;
  reputation_score: number;
  post_count: number;
  comment_count: number;
  join_date: string;
  created_at: string;
  updated_at: string;
  last_activity: string;
}



export interface CommunityPost {
  post_id: string;
  id?: string; // Alternative ID field
  title: string;
  content: string;
  author_id: string;
  author_name: string;
  author?: {
    full_name?: string;
    username?: string;
  };
  category: string;
  tags: string[];
  status: 'draft' | 'published' | 'archived' | 'deleted';
  upvotes: number;
  downvotes: number;
  view_count: number;
  comment_count: number;
  share_count: number;
  created_at: string;
  updated_at: string;
  ai_flags?: string[];
  image_url?: string;
  image?: string;
}



export interface PollOption {
  text?: string;
  option_text?: string;
  vote_count: number;
  votes?: number; // Backend compatibility field
}



export interface CommunityPoll {
  poll_id: string;
  title: string;
  description?: string;
  options: PollOption[];
  total_votes: number;
  status: string;
  created_at: string;
  end_date?: string;
  author?: {
    full_name?: string;
    username?: string;
  };
}



export interface VoteRequest {
  user_id: string;
  option_text: string;
}



export interface VoteResponse {
  success: boolean;
  message?: string;
  poll?: CommunityPoll;
}



export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
// =============================================================================
// API SERVICE CLASS
// =============================================================================



class UserCommunityService {
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${API_BASE_URL}${endpoint}`;
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });



      if (!response.ok) {
        // Try to get error details from the response
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.detail) {
            // Handle Pydantic validation errors
            if (Array.isArray(errorData.detail)) {
              const validationErrors = errorData.detail.map((err: Record<string, unknown>) => {
                const field = err.loc && Array.isArray(err.loc) ? err.loc.join('.') : 'unknown';
                return `${field}: ${err.msg}`;
              }).join(', ');
              errorMessage = `Validation error: ${validationErrors}`;
            } else if (typeof errorData.detail === 'string') {
              errorMessage = errorData.detail;
            } else {
              errorMessage = JSON.stringify(errorData.detail);
            }
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch {
          // If we can't parse the error, use the status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }



      const data = await response.json();
      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }



  // =============================================================================
  // USER MANAGEMENT
  // =============================================================================



  /**
   * Join the community by creating a new user
   */
  async joinCommunity(userData: UserJoinRequest): Promise<ApiResponse<CommunityUser>> {
    const userPayload = {
      ...userData,
      role: 'member', // Default role for new users
      bio: userData.bio || 'New community member',
    };



    return this.makeRequest<CommunityUser>('/users', {
      method: 'POST',
      body: JSON.stringify(userPayload),
    });
  }



  /**
   * Get user profile by ID
   */
  async getUserProfile(userId: string): Promise<ApiResponse<CommunityUser>> {
    return this.makeRequest<CommunityUser>(`/users/${userId}`);
  }



  /**
   * Update user profile
   */
  async updateUserProfile(
    userId: string,
    updates: Partial<UserJoinRequest>
  ): Promise<ApiResponse<CommunityUser>> {
    return this.makeRequest<CommunityUser>(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }



  // =============================================================================
  // POST MANAGEMENT
  // =============================================================================



  /**
   * Create a new post
   */
  async createPost(postData: UserPostRequest): Promise<ApiResponse<CommunityPost>> {
    // Ensure title and content meet backend requirements
    const title = postData.title.trim();
    const content = postData.content.trim();

    if (title.length < 5 || title.length > 200) {
      return {
        success: false,
        error: 'Title must be between 5 and 200 characters',
      };
    }

    if (content.length < 10) {
      return {
        success: false,
        error: 'Content must be at least 10 characters long',
      };
    }

    const postPayload = {
      title: title,
      content: content,
      category: postData.category || 'general',
      tags: postData.category ? [postData.category] : [],
      attachments: []
    };

    // Add author_id as query parameter since the API expects it that way
    const endpoint = `/posts?author_id=${encodeURIComponent(postData.author_id)}`;

    return this.makeRequest<CommunityPost>(endpoint, {
      method: 'POST',
      body: JSON.stringify(postPayload),
    });
  }



  /**
   * Get user's posts
   */
  async getUserPosts(
    userId: string,
    options: {
      skip?: number;
      limit?: number;
      category?: string;
    } = {}
  ): Promise<ApiResponse<CommunityPost[]>> {
    const params = new URLSearchParams({
      author_id: userId,
      skip: (options.skip || 0).toString(),
      limit: (options.limit || 10).toString(),
    });



    if (options.category) {
      params.append('category', options.category);
    }



    return this.makeRequest<CommunityPost[]>(`/posts?${params.toString()}`);
  }



  /**
   * Get all posts (for browsing)
   */
  async getAllPosts(options: {
    skip?: number;
    limit?: number;
    category?: string;
    search?: string;
    author_email?: string;
  } = {}): Promise<ApiResponse<CommunityPost[]>> {
    const params = new URLSearchParams({
      skip: (options.skip || 0).toString(),
      limit: (options.limit || 20).toString(),
    });



    if (options.category) {
      params.append('category', options.category);
    }



    if (options.search) {
      params.append('search', options.search);
    }

    if (options.author_email) {
      params.append('author_email', options.author_email);
    }



    return this.makeRequest<CommunityPost[]>(`/posts?${params.toString()}`);
  }



  /**
   * Like a post
   */
  async likePost(postId: string): Promise<ApiResponse<{ upvotes: number }>> {
    return this.makeRequest<{ upvotes: number }>(`/posts/${postId}/like`, {
      method: 'POST',
    });
  }



  /**
   * Share a post
   */
  async sharePost(postId: string): Promise<ApiResponse<{ shares: number }>> {
    return this.makeRequest<{ shares: number }>(`/posts/${postId}/share`, {
      method: 'POST',
    });
  }



  /**
   * Bookmark a post
   */
  async bookmarkPost(postId: string): Promise<ApiResponse<{ message: string }>> {
    return this.makeRequest<{ message: string }>(`/posts/${postId}/bookmark`, {
      method: 'POST',
    });
  }



  // =============================================================================
  // UTILITY METHODS
  // =============================================================================



  /**
   * Check if the API is available
   */
  async checkApiHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }



  /**
   * Get community statistics (for display purposes)
   */
  async getCommunityStats(): Promise<ApiResponse<{
    total_users: number;
    total_posts: number;
    active_users: number;
  }>> {
    return this.makeRequest('/analytics/overview');
  }

  /**
   * Get all active polls
   */
  async getAllPolls(options: {
    skip?: number;
    limit?: number;
    status?: string;
  } = {}): Promise<ApiResponse<CommunityPoll[]>> {
    const params = new URLSearchParams({
      skip: (options.skip || 0).toString(),
      limit: (options.limit || 20).toString(),
    });



    if (options.status) {
      params.append('status', options.status);
    }



    return this.makeRequest<CommunityPoll[]>(`/polls?${params.toString()}`);
  }



  /**
   * Vote on a poll
   */
  async voteOnPoll(pollId: string, optionText: string, userId: string): Promise<ApiResponse<VoteResponse>> {
    console.log('Voting on poll:', { pollId, optionText, userId }); // Debug log

    const voteData = {
      user_id: userId,
      option_text: optionText
    };

    console.log('Vote payload:', voteData); // Debug log

    const response = await this.makeRequest<VoteResponse>(`/polls/${pollId}/vote`, {
      method: 'POST',
      body: JSON.stringify(voteData),
    });

    console.log('Vote response:', response); // Debug log
    return response;
  }



  /**
   * Get poll details
   */
  async getPollDetails(pollId: string): Promise<ApiResponse<CommunityPoll>> {
    return this.makeRequest<CommunityPoll>(`/polls/${pollId}`);
  }
}



// =============================================================================
// EXPORT SINGLETON INSTANCE
// =============================================================================



export const userCommunityService = new UserCommunityService();
export default userCommunityService;
