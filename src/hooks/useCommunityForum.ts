/**
 * Community Forum React Hook
 * Easy-to-use hook for all community forum operations
 */

import { useState, useEffect, useCallback } from 'react';
import { communityForumService, User, Post, Comment, Poll, Ticket, AnalyticsOverview, EngagementAnalytics, CommunityStats, UserCreate, PostCreate, CommentCreate, PollCreate, TicketCreate } from '@/services/CommunityForumService';

// =============================================================================
// HOOK INTERFACE
// =============================================================================

interface UseCommunityForumReturn {
  // Data
  users: User[];
  posts: Post[];
  comments: Comment[];
  polls: Poll[];
  tickets: Ticket[];
  analytics: AnalyticsOverview | null;
  engagement: EngagementAnalytics | null;
  stats: CommunityStats | null;
  
  // Loading states
  loading: {
    users: boolean;
    posts: boolean;
    comments: boolean;
    polls: boolean;
    tickets: boolean;
    analytics: boolean;
    engagement: boolean;
    stats: boolean;
  };
  
  // Error states
  errors: {
    users: string | null;
    posts: string | null;
    comments: string | null;
    polls: string | null;
    tickets: string | null;
    analytics: string | null;
    engagement: string | null;
    stats: string | null;
  };
  
  // Actions
  createUser: (userData: UserCreate) => Promise<unknown>;
  createPost: (postData: PostCreate, authorId: string) => Promise<unknown>;
  createComment: (postId: string, commentData: CommentCreate, authorId: string) => Promise<unknown>;
  createPoll: (pollData: PollCreate, authorId: string) => Promise<unknown>;
  createTicket: (ticketData: TicketCreate, userId: string) => Promise<unknown>;
  
  // Refresh functions
  refreshUsers: () => Promise<void>;
  refreshPosts: () => Promise<void>;
  refreshComments: (postId: string) => Promise<void>;
  refreshPolls: () => Promise<void>;
  refreshTickets: () => Promise<void>;
  refreshAnalytics: () => Promise<void>;
  refreshEngagement: () => Promise<void>;
  refreshStats: () => Promise<void>;
  refreshAll: () => Promise<void>;
  
  // Health check
  healthCheck: () => Promise<boolean>;
}

// =============================================================================
// MAIN HOOK
// =============================================================================

export const useCommunityForum = (): UseCommunityForumReturn => {
  // State
  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [engagement, setEngagement] = useState<EngagementAnalytics | null>(null);
  const [stats, setStats] = useState<CommunityStats | null>(null);

  const [loading, setLoading] = useState({
    users: false,
    posts: false,
    comments: false,
    polls: false,
    tickets: false,
    analytics: false,
    engagement: false,
    stats: false,
  });

  const [errors, setErrors] = useState({
    users: null as string | null,
    posts: null as string | null,
    comments: null as string | null,
    polls: null as string | null,
    tickets: null as string | null,
    analytics: null as string | null,
    engagement: null as string | null,
    stats: null as string | null,
  });

  // =============================================================================
  // LOADING HELPERS
  // =============================================================================

  const setLoadingState = useCallback((key: keyof typeof loading, value: boolean) => {
    setLoading(prev => ({ ...prev, [key]: value }));
  }, []);

  const setError = useCallback((key: keyof typeof errors, error: string | null) => {
    setErrors(prev => ({ ...prev, [key]: error }));
  }, []);

  // =============================================================================
  // FETCH FUNCTIONS
  // =============================================================================

  const fetchUsers = useCallback(async () => {
    setLoadingState('users', true);
    setError('users', null);
    try {
      const data = await communityForumService.getUsers();
      setUsers(data);
    } catch (error) {
      setError('users', error instanceof Error ? error.message : 'Failed to fetch users');
    } finally {
      setLoadingState('users', false);
    }
  }, [setLoadingState, setError]);

  const fetchPosts = useCallback(async () => {
    setLoadingState('posts', true);
    setError('posts', null);
    try {
      const data = await communityForumService.getPosts();
      setPosts(data);
    } catch (error) {
      setError('posts', error instanceof Error ? error.message : 'Failed to fetch posts');
    } finally {
      setLoadingState('posts', false);
    }
  }, [setLoadingState, setError]);

  const fetchComments = useCallback(async (postId: string) => {
    setLoadingState('comments', true);
    setError('comments', null);
    try {
      const data = await communityForumService.getComments(postId);
      setComments(data);
    } catch (error) {
      setError('comments', error instanceof Error ? error.message : 'Failed to fetch comments');
    } finally {
      setLoadingState('comments', false);
    }
  }, [setLoadingState, setError]);

  const fetchPolls = useCallback(async () => {
    setLoadingState('polls', true);
    setError('polls', null);
    try {
      const data = await communityForumService.getPolls();
      setPolls(data);
    } catch (error) {
      setError('polls', error instanceof Error ? error.message : 'Failed to fetch polls');
    } finally {
      setLoadingState('polls', false);
    }
  }, [setLoadingState, setError]);

  const fetchTickets = useCallback(async () => {
    setLoadingState('tickets', true);
    setError('tickets', null);
    try {
      const data = await communityForumService.getTickets();
      setTickets(data);
    } catch (error) {
      setError('tickets', error instanceof Error ? error.message : 'Failed to fetch tickets');
    } finally {
      setLoadingState('tickets', false);
    }
  }, [setLoadingState, setError]);

  const fetchAnalytics = useCallback(async () => {
    setLoadingState('analytics', true);
    setError('analytics', null);
    try {
      const data = await communityForumService.getAnalyticsOverview();
      setAnalytics(data);
    } catch (error) {
      setError('analytics', error instanceof Error ? error.message : 'Failed to fetch analytics');
    } finally {
      setLoadingState('analytics', false);
    }
  }, [setLoadingState, setError]);

  const fetchEngagement = useCallback(async () => {
    setLoadingState('engagement', true);
    setError('engagement', null);
    try {
      const data = await communityForumService.getEngagementAnalytics();
      setEngagement(data);
    } catch (error) {
      setError('engagement', error instanceof Error ? error.message : 'Failed to fetch engagement');
    } finally {
      setLoadingState('engagement', false);
    }
  }, [setLoadingState, setError]);

  const fetchStats = useCallback(async () => {
    setLoadingState('stats', true);
    setError('stats', null);
    try {
      const data = await communityForumService.getCommunityStats();
      setStats(data);
    } catch (error) {
      setError('stats', error instanceof Error ? error.message : 'Failed to fetch stats');
    } finally {
      setLoadingState('stats', false);
    }
  }, [setLoadingState, setError]);

  // =============================================================================
  // CREATE FUNCTIONS
  // =============================================================================

  const createUser = useCallback(async (userData: UserCreate) => {
    try {
      const result = await communityForumService.createUser(userData);
      await fetchUsers(); // Refresh users list
      return result;
    } catch (error) {
      throw error;
    }
  }, [fetchUsers]);

  const createPost = useCallback(async (postData: PostCreate, authorId: string) => {
    try {
      const result = await communityForumService.createPost(postData, authorId);
      await fetchPosts(); // Refresh posts list
      return result;
    } catch (error) {
      throw error;
    }
  }, [fetchPosts]);

  const createComment = useCallback(async (postId: string, commentData: CommentCreate, authorId: string) => {
    try {
      const result = await communityForumService.createComment(postId, commentData, authorId);
      await fetchComments(postId); // Refresh comments for this post
      await fetchPosts(); // Refresh posts to update comment count
      return result;
    } catch (error) {
      throw error;
    }
  }, [fetchComments, fetchPosts]);

  const createPoll = useCallback(async (pollData: PollCreate, authorId: string) => {
    try {
      const result = await communityForumService.createPoll(pollData, authorId);
      await fetchPolls(); // Refresh polls list
      return result;
    } catch (error) {
      throw error;
    }
  }, [fetchPolls]);

  const createTicket = useCallback(async (ticketData: TicketCreate, userId: string) => {
    try {
      const result = await communityForumService.createTicket(ticketData, userId);
      await fetchTickets(); // Refresh tickets list
      return result;
    } catch (error) {
      throw error;
    }
  }, [fetchTickets]);

  // =============================================================================
  // REFRESH FUNCTIONS
  // =============================================================================

  const refreshUsers = useCallback(async () => {
    await fetchUsers();
  }, [fetchUsers]);

  const refreshPosts = useCallback(async () => {
    await fetchPosts();
  }, [fetchPosts]);

  const refreshComments = useCallback(async (postId: string) => {
    await fetchComments(postId);
  }, [fetchComments]);

  const refreshPolls = useCallback(async () => {
    await fetchPolls();
  }, [fetchPolls]);

  const refreshTickets = useCallback(async () => {
    await fetchTickets();
  }, [fetchTickets]);

  const refreshAnalytics = useCallback(async () => {
    await fetchAnalytics();
  }, [fetchAnalytics]);

  const refreshEngagement = useCallback(async () => {
    await fetchEngagement();
  }, [fetchEngagement]);

  const refreshStats = useCallback(async () => {
    await fetchStats();
  }, [fetchStats]);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      fetchUsers(),
      fetchPosts(),
      fetchPolls(),
      fetchTickets(),
      fetchAnalytics(),
      fetchEngagement(),
      fetchStats(),
    ]);
  }, [fetchUsers, fetchPosts, fetchPolls, fetchTickets, fetchAnalytics, fetchEngagement, fetchStats]);

  // =============================================================================
  // HEALTH CHECK
  // =============================================================================

  const healthCheck = useCallback(async (): Promise<boolean> => {
    try {
      await communityForumService.healthCheck();
      return true;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }, []);

  // =============================================================================
  // INITIAL LOAD
  // =============================================================================

  useEffect(() => {
    // Load initial data
    refreshAll();
  }, [refreshAll]);

  // =============================================================================
  // RETURN
  // =============================================================================

  return {
    // Data
    users,
    posts,
    comments,
    polls,
    tickets,
    analytics,
    engagement,
    stats,
    
    // Loading states
    loading,
    
    // Error states
    errors,
    
    // Actions
    createUser,
    createPost,
    createComment,
    createPoll,
    createTicket,
    
    // Refresh functions
    refreshUsers,
    refreshPosts,
    refreshComments,
    refreshPolls,
    refreshTickets,
    refreshAnalytics,
    refreshEngagement,
    refreshStats,
    refreshAll,
    
    // Health check
    healthCheck,
  };
};

export default useCommunityForum;