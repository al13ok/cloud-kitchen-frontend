/**
 * Community Forum Service
 * Complete API service for all community forum endpoints
 */







const API_BASE_URL = 'https://py-mobiloitte.converiqo.ai/api/v1/community-forum';







// =============================================================================
// TYPES & INTERFACES
// =============================================================================







export interface User {
  user_id: string;
  username: string;
  email: string;
  full_name: string;
  bio?: string;
  role: string;
  department?: string;
  phone_number?: string;
  location?: string;
  status: string;
  is_active: boolean;
  is_verified: boolean;
  reputation_score: number;
  post_count: number;
  comment_count: number;
  join_date: string;
  created_at: string;
  updated_at: string;
  last_activity: string;
  avatar_url?: string;
}







export interface UserUpdate {
  username?: string;
  email?: string;
  full_name?: string;
  bio?: string;
  role?: string;
  department?: string;
  phone_number?: string;
  location?: string;
  status?: string;
}







export interface UserCreate {
  username: string;
  email: string;
  full_name: string;
  bio?: string;
  role?: string;
  department?: string;
  phone_number?: string;
  location?: string;
  status?: string;
}







export interface Post {
  post_id: string;
  title: string;
  content: string;
  excerpt: string;
  author_id: string;
  author: {
    user_id: string;
    username: string;
    email: string;
    avatar_url?: string;
  };
  category: string;
  status: string;
  tags: string[];
  view_count: number;
  like_count: number;
  upvotes: number;
  downvotes: number;
  comment_count: number;
  share_count: number;
  is_pinned: boolean;
  is_featured: boolean;
  is_locked: boolean;
  ai_score?: number;
  featured_image?: string;
  attachments: string[];
  created_at: string;
  updated_at: string;
  published_at: string;
}







export interface PostCreate {
  title: string;
  content: string;
  category?: string;
  tags?: string[];
  featured_image?: string;
  attachments?: string[];
}







export interface Comment {
  comment_id: string;
  post_id: string;
  author_id: string;
  author: {
    user_id: string;
    username: string;
    email: string;
    avatar_url?: string;
  };
  content: string;
  parent_id?: string;
  like_count: number;
  is_approved: boolean;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
}







export interface CommentCreate {
  content: string;
  parent_id?: string;
}







export interface Poll {
  poll_id: string;
  title: string;
  description?: string;
  author_id: string;
  author: {
    user_id: string;
    username: string;
    email: string;
  };
  options: Array<{
    text: string;
    votes: number;
  }>;
  status: string;
  total_votes: number;
  allow_multiple_votes: boolean;
  is_anonymous: boolean;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}







export interface PollCreate {
  title: string;
  description?: string;
  options: string[];
  allow_multiple_votes?: boolean;
  is_anonymous?: boolean;
  expires_at?: string;
}







export interface Ticket {
  ticket_id: string;
  title: string;
  description: string;
  user_id: string;
  user: {
    user_id: string;
    username: string;
    email: string;
  };
  status: string;
  priority: string;
  category: string;
  assigned_to?: string;
  assigned_to_name?: string;
  tags: string[];
  response_time?: number;
  resolution_time?: number;
  created_at: string;
  updated_at: string;
}







export interface TicketCreate {
  title: string;
  description: string;
  priority?: string;
  category: string;
  tags?: string[];
}







export interface AnalyticsOverview {
  overview: {
    total_users: number;
    total_posts: number;
    total_comments: number;
    total_polls: number;
    open_tickets: number;
    last_updated: string;
  };
  recent_activity: {
    posts_last_7_days: number;
    new_users_last_7_days: number;
    active_polls: number;
    open_tickets: number;
  };
  last_updated: string;
}







export interface EngagementAnalytics {
  top_posts: Array<{
    post_id: string;
    title: string;
    like_count: number;
    comment_count: number;
    author: string;
  }>;
  active_users: Array<{
    user_id: string;
    username: string;
    post_count: number;
    reputation_score: number;
  }>;
  category_distribution: Record<string, number>;
}







export interface CommunityStats {
  total_users: number;
  total_posts: number;
  total_comments: number;
  total_polls: number;
  open_tickets: number;
  last_updated: string;
}







export interface UserStats {
  total_users: number;
  active_users: number;
  pending_users: number;
  admin_users: number;
  last_updated: string;
}







// =============================================================================
// API SERVICE CLASS
// =============================================================================







class CommunityForumService {
  private baseUrl: string;







  constructor() {
    this.baseUrl = API_BASE_URL;
  }







  // =============================================================================
  // USER MANAGEMENT
  // =============================================================================







  /**
   * Create a new user
   * POST /api/v1/community-forum/users
   */
  async createUser(userData: UserCreate): Promise<{ message: string; user_id: string; username: string; email: string; role: string }> {
    const response = await fetch(`${this.baseUrl}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });







    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || `HTTP ${response.status}: ${response.statusText}`);
    }







    return response.json();
  }







  /**
   * Get all users with pagination and filtering
   * GET /api/v1/community-forum/users
   */
  async getUsers(params?: {
    skip?: number;
    limit?: number;
    role?: string;
    status?: string;
    search?: string;
  }): Promise<User[]> {
    const queryParams = new URLSearchParams();
    if (params?.skip) queryParams.append('skip', params.skip.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.role) queryParams.append('role', params.role);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.search) queryParams.append('search', params.search);







    const url = `${this.baseUrl}/users${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await fetch(url);







    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || `HTTP ${response.status}: ${response.statusText}`);
    }







    return response.json();
  }







  /**
   * Get user by ID
   * GET /api/v1/community-forum/users/{user_id}
   */
  async getUser(userId: string): Promise<User> {
    const response = await fetch(`${this.baseUrl}/users/${userId}`);







    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || `HTTP ${response.status}: ${response.statusText}`);
    }







    return response.json();
  }







  /**
   * Update user information
   * PUT /api/v1/community-forum/users/{user_id}
   */
  async updateUser(userId: string, userData: UserUpdate): Promise<{ message: string; user_id: string; username: string }> {
    const response = await fetch(`${this.baseUrl}/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });







    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || `HTTP ${response.status}: ${response.statusText}`);
    }







    return response.json();
  }







  /**
   * Delete user
   * DELETE /api/v1/community-forum/users/{user_id}
   */
  async deleteUser(userId: string): Promise<{ message: string; user_id: string }> {
    const response = await fetch(`${this.baseUrl}/users/${userId}`, {
      method: 'DELETE',
    });







    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || `HTTP ${response.status}: ${response.statusText}`);
    }







    return response.json();
  }







  /**
   * Get user statistics summary
   * GET /api/v1/community-forum/analytics/overview
   */
  async getUserStats(): Promise<UserStats> {
    try {
      const response = await fetch(`${this.baseUrl}/analytics/overview`);







      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || `HTTP ${response.status}: ${response.statusText}`);
      }







      const data = await response.json();

      // Transform the response to match UserStats interface
      return {
        total_users: data.overview?.total_users || 0,
        active_users: data.overview?.total_users || 0,
        pending_users: 0, // Not available in current API response
        admin_users: 0, // Not available in current API response
        last_updated: data.last_updated || new Date().toISOString()
      };
    } catch (error) {
      console.warn('Failed to fetch user stats, returning default values:', error);
      // Return default values if API fails
      return {
        total_users: 0,
        active_users: 0,
        pending_users: 0,
        admin_users: 0,
        last_updated: new Date().toISOString()
      };
    }
  }



  /**
   * Refresh user activity counts
   * POST /api/v1/community-forum/users/refresh-activity-counts
   */
  async refreshUserActivityCounts(): Promise<{ message: string; updated_users: number; timestamp: string }> {
    const response = await fetch(`${this.baseUrl}/users/refresh-activity-counts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });



    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || `HTTP ${response.status}: ${response.statusText}`);
    }



    return response.json();
  }







  // =============================================================================
  // POST MANAGEMENT
  // =============================================================================







  /**
   * Create a new post
   * POST /api/v1/community-forum/posts
   */
  async createPost(postData: PostCreate, authorId: string): Promise<{ message: string; post_id: string; title: string; author: string }> {
    const response = await fetch(`${this.baseUrl}/posts?author_id=${authorId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(postData),
    });







    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || `HTTP ${response.status}: ${response.statusText}`);
    }







    return response.json();
  }







  /**
   * Get all posts with pagination and filtering
   * GET /api/v1/community-forum/posts
   */
  async getPosts(params?: {
    skip?: number;
    limit?: number;
    category?: string;
    status?: string;
    author_id?: string;
    search?: string;
  }): Promise<Post[]> {
    const queryParams = new URLSearchParams();
    if (params?.skip) queryParams.append('skip', params.skip.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.category) queryParams.append('category', params.category);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.author_id) queryParams.append('author_id', params.author_id);
    if (params?.search) queryParams.append('search', params.search);







    const url = `${this.baseUrl}/posts${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await fetch(url);







    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || `HTTP ${response.status}: ${response.statusText}`);
    }







    return response.json();
  }







  /**
   * Get post by ID
   * GET /api/v1/community-forum/posts/{post_id}
   */
  async getPost(postId: string): Promise<Post> {
    const response = await fetch(`${this.baseUrl}/posts/${postId}`);







    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || `HTTP ${response.status}: ${response.statusText}`);
    }







    return response.json();
  }

  /**
   * Update a post
   * PUT /api/v1/community-forum/posts/{post_id}
   */
  async updatePost(postId: string, postData: PostCreate): Promise<{ message: string; post_id: string; title: string }> {
    const response = await fetch(`${this.baseUrl}/posts/${postId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(postData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }







  // =============================================================================
  // COMMENT MANAGEMENT
  // =============================================================================







  /**
   * Create a comment on a post
   * POST /api/v1/community-forum/posts/{post_id}/comments
   */
  async createComment(postId: string, commentData: CommentCreate, authorId: string): Promise<{ message: string; comment_id: string; content: string }> {
    const response = await fetch(`${this.baseUrl}/posts/${postId}/comments?author_id=${authorId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commentData),
    });







    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || `HTTP ${response.status}: ${response.statusText}`);
    }







    return response.json();
  }







  /**
   * Get comments for a post
   * GET /api/v1/community-forum/posts/{post_id}/comments
   */
  async getComments(postId: string, params?: {
    skip?: number;
    limit?: number;
  }): Promise<Comment[]> {
    const queryParams = new URLSearchParams();
    if (params?.skip) queryParams.append('skip', params.skip.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());







    const url = `${this.baseUrl}/posts/${postId}/comments${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await fetch(url);







    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || `HTTP ${response.status}: ${response.statusText}`);
    }







    return response.json();
  }







  // =============================================================================
  // POLL MANAGEMENT
  // =============================================================================







  /**
   * Create a new poll
   * POST /api/v1/community-forum/polls
   */
  async createPoll(pollData: PollCreate, authorId: string): Promise<{ message: string; poll_id: string; title: string }> {
    const response = await fetch(`${this.baseUrl}/polls?author_id=${authorId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pollData),
    });







    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || `HTTP ${response.status}: ${response.statusText}`);
    }







    return response.json();
  }







  /**
   * Get all polls with pagination and filtering
   * GET /api/v1/community-forum/polls
   */
  async getPolls(params?: {
    skip?: number;
    limit?: number;
    status?: string;
    author_id?: string;
  }): Promise<Poll[]> {
    const queryParams = new URLSearchParams();
    if (params?.skip) queryParams.append('skip', params.skip.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.author_id) queryParams.append('author_id', params.author_id);







    const url = `${this.baseUrl}/polls${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await fetch(url);







    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || `HTTP ${response.status}: ${response.statusText}`);
    }







    return response.json();
  }







  // =============================================================================
  // TICKET MANAGEMENT
  // =============================================================================







  /**
   * Create a new ticket
   * POST /api/v1/community-forum/tickets
   */
  async createTicket(ticketData: TicketCreate, userId: string): Promise<{ message: string; ticket_id: string; title: string; status: string }> {
    const response = await fetch(`${this.baseUrl}/tickets?user_id=${userId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ticketData),
    });







    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || `HTTP ${response.status}: ${response.statusText}`);
    }







    return response.json();
  }







  /**
   * Get all tickets with pagination and filtering
   * GET /api/v1/community-forum/tickets
   */
  async getTickets(params?: {
    skip?: number;
    limit?: number;
    status?: string;
    priority?: string;
    user_id?: string;
  }): Promise<Ticket[]> {
    const queryParams = new URLSearchParams();
    if (params?.skip) queryParams.append('skip', params.skip.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.priority) queryParams.append('priority', params.priority);
    if (params?.user_id) queryParams.append('user_id', params.user_id);







    const url = `${this.baseUrl}/tickets${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await fetch(url);







    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || `HTTP ${response.status}: ${response.statusText}`);
    }







    return response.json();
  }







  // =============================================================================
  // ANALYTICS
  // =============================================================================







  /**
   * Get analytics overview
   * GET /api/v1/community-forum/analytics/overview
   */
  async getAnalyticsOverview(): Promise<AnalyticsOverview> {
    const response = await fetch(`${this.baseUrl}/analytics/overview`);







    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || `HTTP ${response.status}: ${response.statusText}`);
    }







    return response.json();
  }







  /**
   * Get engagement analytics
   * GET /api/v1/community-forum/analytics/engagement
   */
  async getEngagementAnalytics(): Promise<EngagementAnalytics> {
    const response = await fetch(`${this.baseUrl}/analytics/engagement`);







    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || `HTTP ${response.status}: ${response.statusText}`);
    }







    return response.json();
  }







  /**
   * Get community stats
   * GET /api/v1/community-forum/stats
   */
  async getCommunityStats(): Promise<CommunityStats> {
    const response = await fetch(`${this.baseUrl}/stats`);







    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || `HTTP ${response.status}: ${response.statusText}`);
    }







    return response.json();
  }







  // =============================================================================
  // UTILITY
  // =============================================================================







  /**
   * Health check
   * GET /api/v1/community-forum/health
   */
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const response = await fetch(`${this.baseUrl}/health`);







    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || `HTTP ${response.status}: ${response.statusText}`);
    }







    return response.json();
  }
}







// =============================================================================
// EXPORT SINGLETON INSTANCE
// =============================================================================







export const communityForumService = new CommunityForumService();
export default communityForumService;