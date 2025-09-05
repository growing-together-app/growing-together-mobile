import { sanitizeObjectId } from '../utils/validation';
import apiService, { ApiResponse } from './apiService';

// Types
interface User {
  _id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
}

interface Comment {
  _id: string;
  content: string;
  targetType: 'promptResponse' | 'memory' | 'healthRecord' | 'growthRecord' | 'comment';
  targetId: string;
  user: User;
  parentComment?: string | null;
  replies?: Comment[];
  createdAt: string;
  updatedAt: string;
}

interface CreateCommentData {
  content: string;
  targetType: 'promptResponse' | 'memory' | 'healthRecord' | 'growthRecord' | 'comment';
  targetId: string;
  parentCommentId?: string | null;
}

interface UpdateCommentData {
  content: string;
}

interface CommentsResponse extends ApiResponse<Comment[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface CommentResponse extends ApiResponse<Comment> {
  // Extends ApiResponse<Comment> with additional properties if needed
  pagination?: {
    total: number;
    page: number;
    pages: number;
    limit: number;
  };
}

class CommentService {
  private static instance: CommentService;

  private constructor() {}

  static getInstance(): CommentService {
    if (!CommentService.instance) {
      CommentService.instance = new CommentService();
    }
    return CommentService.instance;
  }

  async createComment(data: CreateCommentData): Promise<Comment> {
    try {
      console.log('=== COMMENT SERVICE: Creating comment ===');
      console.log('Request data:', data);
      
      const response = await apiService.post('/comments', data) as any;
      
      console.log('API response:', response);
      
      // Handle nested response format from backend
      let commentData: Comment;
      if (response.success) {
        // Backend returns: { success: true, data: { data: commentData } }
        if (response.data?.data) {
          commentData = response.data.data;
        } else {
          commentData = response.data;
        }
      } else if (response.data) {
        // Direct data format
        commentData = response.data;
      } else {
        throw new Error(response.message || 'Failed to create comment');
      }
      
      console.log('Extracted comment data:', commentData);
      console.log('=== COMMENT SERVICE: Comment created successfully ===');
      
      return commentData;
    } catch (error: any) {
      console.error('=== COMMENT SERVICE: Error creating comment ===');
      console.error('Error details:', error);
      console.error('Error message:', error.message);
      console.error('Error response:', error.response);
      throw error;
    }
  }

  async getComments(
    targetType: string,
    targetId: string,
    page: number = 1,
    limit: number = 10,
    maxDepth: number = 5
  ): Promise<CommentsResponse> {
    try {
      console.log('=== COMMENT SERVICE: Fetching comments ===');
      console.log('Request params:', { targetType, targetId, page, limit, maxDepth });
      
      const response = await apiService.get(
        `/comments?targetType=${targetType}&targetId=${targetId}&page=${page}&limit=${limit}&maxDepth=${maxDepth}`
      ) as CommentsResponse;
      
      console.log('API response:', response);
      
      if (response.success) {
        console.log('Comments fetched successfully:', response.data?.length || 0);
        return response;
      } else {
        throw new Error(response.message || 'Failed to fetch comments');
      }
    } catch (error) {
      console.error('=== COMMENT SERVICE: Error fetching comments ===');
      console.error('Error details:', error);
      throw error;
    }
  }

  async updateComment(commentId: string, data: UpdateCommentData): Promise<Comment> {
    try {
      const sanitizedId = sanitizeObjectId(commentId);
      const response = await apiService.put(`/comments/${sanitizedId}`, data) as any;
      
      // Handle both response formats
      if (response.success) {
        return response.data;
      } else if (response.data) {
        // Backend returns: { data: commentData }
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to update comment');
      }
    } catch (error) {
      console.error('Error updating comment:', error);
      throw error;
    }
  }

  async deleteComment(commentId: string): Promise<void> {
    try {
      const sanitizedId = sanitizeObjectId(commentId);
      const response = await apiService.delete(`/comments/${sanitizedId}`) as ApiResponse;
      if (!response.success) {
        throw new Error(response.message || 'Failed to delete comment');
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      throw error;
    }
  }

  async getComment(commentId: string): Promise<Comment> {
    try {
      const sanitizedId = sanitizeObjectId(commentId);
      const response = await apiService.get(`/comments/${sanitizedId}`) as CommentResponse;
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to fetch comment');
      }
    } catch (error) {
      console.error('Error fetching comment:', error);
      throw error;
    }
  }
}

export const commentService = CommentService.getInstance();
export type { Comment, CommentResponse, CommentsResponse, CreateCommentData, UpdateCommentData };
