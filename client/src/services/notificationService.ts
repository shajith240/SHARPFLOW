import type { Notification } from "../stores/notificationStore";

const API_BASE = "/api/notifications";

export interface NotificationResponse {
  notifications: Notification[];
}

export interface UnreadCountResponse {
  count: number;
}

export interface NotificationOptions {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
}

export class NotificationService {
  /**
   * Fetch user notifications
   */
  static async getNotifications(
    options: NotificationOptions = {}
  ): Promise<Notification[]> {
    try {
      const params = new URLSearchParams();

      if (options.limit) params.append("limit", options.limit.toString());
      if (options.offset) params.append("offset", options.offset.toString());
      if (options.unreadOnly) params.append("unreadOnly", "true");

      const response = await fetch(`${API_BASE}?${params.toString()}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch notifications: ${response.statusText}`
        );
      }

      const data: NotificationResponse = await response.json();
      return data.notifications;
    } catch (error) {
      console.error("Error fetching notifications:", error);
      throw error;
    }
  }

  /**
   * Get unread notification count
   */
  static async getUnreadCount(): Promise<number> {
    try {
      const response = await fetch(`${API_BASE}/unread-count`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch unread count: ${response.statusText}`);
      }

      const data: UnreadCountResponse = await response.json();
      return data.count;
    } catch (error) {
      console.error("Error fetching unread count:", error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/${notificationId}/read`, {
        method: "PATCH",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(
          `Failed to mark notification as read: ${response.statusText}`
        );
      }

      return true;
    } catch (error) {
      console.error("Error marking notification as read:", error);
      throw error;
    }
  }

  /**
   * Mark notification as dismissed
   */
  static async markAsDismissed(notificationId: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/${notificationId}/dismiss`, {
        method: "PATCH",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(
          `Failed to mark notification as dismissed: ${response.statusText}`
        );
      }

      return true;
    } catch (error) {
      console.error("Error marking notification as dismissed:", error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   */
  static async markAllAsRead(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/mark-all-read`, {
        method: "PATCH",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(
          `Failed to mark all notifications as read: ${response.statusText}`
        );
      }

      return true;
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      throw error;
    }
  }

  /**
   * Clear all notifications (dismiss all)
   */
  static async clearAllNotifications(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/clear-all`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(
          `Failed to clear all notifications: ${response.statusText}`
        );
      }

      return true;
    } catch (error) {
      console.error("Error clearing all notifications:", error);
      return false;
    }
  }

  /**
   * Create a test notification (for development)
   */
  static async createTestNotification(data: {
    type: string;
    title: string;
    message: string;
    agentName?: string;
  }): Promise<Notification | null> {
    try {
      const response = await fetch(`${API_BASE}/test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to create test notification: ${response.statusText}`
        );
      }

      const result = await response.json();
      return result.notification;
    } catch (error) {
      console.error("Error creating test notification:", error);
      throw error;
    }
  }
}

/**
 * Hook for managing notifications with React Query
 */
export const useNotifications = (options: NotificationOptions = {}) => {
  return {
    queryKey: ["notifications", options],
    queryFn: () => NotificationService.getNotifications(options),
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  };
};

export const useUnreadCount = () => {
  return {
    queryKey: ["notifications", "unread-count"],
    queryFn: () => NotificationService.getUnreadCount(),
    refetchInterval: 15000, // Refetch every 15 seconds
    staleTime: 5000, // Consider data stale after 5 seconds
  };
};
