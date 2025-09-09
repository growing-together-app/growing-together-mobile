import { sanitizeObjectId } from "../utils/validation";
import apiService from "./apiService";

export interface Notification {
  _id: string;
  recipient: string; // Thay vì userId
  sender:
    | string
    | { _id: string; firstName: string; lastName: string; avatar?: string };
  type?:
    | "comment"
    | "member_joined"
    | "member_left"
    | "member_removed"
    | "invitation_accepted"
    | "invitation_sent";
  title: string;
  message: string;
  targetType:
    | "memory"
    | "prompt_response"
    | "health_record"
    | "growth_record"
    | "family_group";
  targetId: string;
  childId?:
    | string
    | { _id: string; firstName?: string; lastName?: string; avatar?: string };
  familyGroupId: string | { _id: string; name: string };
  isRead: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PopulatedNotification {
  _id: string;
  recipient: string;
  sender: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    email?: string;
  };
  type:
    | "comment"
    | "member_joined"
    | "member_left"
    | "member_removed"
    | "invitation_accepted"
    | "invitation_sent";
  role?: string; // Role của thành viên trong nhóm
  title: string;
  message: string;
  targetType:
    | "memory"
    | "prompt_response"
    | "health_record"
    | "growth_record"
    | "family_group";
  targetId: string;
  childId?:
    | string
    | { _id: string; firstName?: string; lastName?: string; avatar?: string };
  familyGroupId: {
    _id: string;
    name: string;
  };
  isRead: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationResponse {
  success: boolean;
  message: string;
  data: Notification[];
  pagination: {
    total: number;
    page: number;
    pages: number;
    limit: number;
  };
}

export interface PopulatedNotificationResponse {
  success: boolean;
  message: string;
  data: {
    data: PopulatedNotification[];
    pagination: {
      total: number;
      page: number;
      pages: number;
      limit: number;
    };
  };
}

export interface UnreadCountResponse {
  success: boolean;
  message: string;
  data: {
    unreadCount: number;
  };
}

export interface MarkReadResponse {
  success: boolean;
  data: {
    _id: string;
    isRead: boolean;
    updatedAt: string;
  };
}

export interface MarkAllReadResponse {
  success: boolean;
  message: string;
  data: {
    modifiedCount: number;
  };
}

export interface DeleteNotificationResponse {
  success: boolean;
  message: string;
  data: {
    _id: string;
    isDeleted: boolean;
  };
}

class NotificationService {
  /**
   * Lấy danh sách thông báo với phân trang
   */
  async getNotifications(
    page: number = 1,
    limit: number = 20
  ): Promise<NotificationResponse> {
    try {
      const response = await apiService.get(
        `/notifications?page=${page}&limit=${limit}`
      );
      // Handle nested response format: { success: true, data: { data: [...], pagination: {...} } }
      if (response.data?.data?.data) {
        return {
          success: response.data.success,
          message: response.data.message,
          data: response.data.data.data,
          pagination: response.data.data.pagination
        };
      }
      return response.data;
    } catch (error: any) {
      // API error handled silently
      
      // If user is not authenticated, return empty data with default pagination
      if (error.status === 401 || error.message?.includes("Not authorized")) {
        return {
          success: true,
          message: "User not authenticated",
          data: [],
          pagination: {
            total: 0,
            page: 1,
            pages: 1,
            limit: limit
          }
        };
      }
      
      throw error;
    }
  }

  /**
   * Lấy số thông báo chưa đọc
   */
  async getUnreadCount(): Promise<UnreadCountResponse> {
    try {
      const response = await apiService.get("/notifications/unread-count");
      // Handle nested response format: { success: true, data: { unreadCount: 0 } }
      if (response.data?.data?.unreadCount !== undefined) {
        return {
          success: response.data.success,
          message: response.data.message,
          data: { unreadCount: response.data.data.unreadCount }
        };
      }
      return response.data;
    } catch (error: any) {
      // API error handled silently

      // If user is not authenticated, return 0 unread count
      if (error.status === 401 || error.message?.includes("Not authorized")) {
        return {
          success: true,
          message: "User not authenticated",
          data: {
            unreadCount: 0,
          },
        };
      }

      throw error;
    }
  }

  /**
   * Đánh dấu thông báo đã đọc
   */
  async markAsRead(notificationId: string): Promise<MarkReadResponse> {
    try {
      const sanitizedId = sanitizeObjectId(notificationId);
      const response = await apiService.post(
        `/notifications/${sanitizedId}/mark-read`
      );
      // Handle nested response format: { success: true, data: { _id, isRead, updatedAt } }
      if (response.data?.data) {
        return {
          success: response.data.success,
          data: response.data.data
        };
      }
      return response.data;
    } catch (error) {
      // API error handled silently
      throw error;
    }
  }

  /**
   * Đánh dấu tất cả thông báo đã đọc
   */
  async markAllAsRead(): Promise<MarkAllReadResponse> {
    try {
      const response = await apiService.post("/notifications/mark-all-read");
      // Handle nested response format: { success: true, message: "...", data: { modifiedCount: 0 } }
      if (response.data?.data) {
        return {
          success: response.data.success,
          message: response.data.message,
          data: response.data.data
        };
      }
      return response.data;
    } catch (error) {
      // API error handled silently
      throw error;
    }
  }

  /**
   * Xóa thông báo
   */
  async deleteNotification(
    notificationId: string
  ): Promise<DeleteNotificationResponse> {
    try {
      const sanitizedId = sanitizeObjectId(notificationId);
      const response = await apiService.delete(
        `/notifications/${sanitizedId}`
      );
      // Handle nested response format: { success: true, message: "...", data: { _id, isDeleted } }
      if (response.data?.data) {
        return {
          success: response.data.success,
          message: response.data.message,
          data: response.data.data
        };
      }
      return response.data;
    } catch (error) {
      // API error handled silently
      throw error;
    }
  }

  /**
   * Lấy thông báo theo ID
   */
  async getNotificationById(
    notificationId: string
  ): Promise<{ success: boolean; data: Notification }> {
    try {
      const sanitizedId = sanitizeObjectId(notificationId);
      const response = await apiService.get(`/notifications/${sanitizedId}`);
      return response.data;
    } catch (error) {
      // API error handled silently
      throw error;
    }
  }
}

export const notificationService = new NotificationService();
