import { supabase } from "../db.js";
import { v4 as uuidv4 } from "uuid";
import { WebSocketManager } from "../websocket/WebSocketManager.js";

export interface NotificationData {
  userId: string;
  type:
    | "job_completed"
    | "job_failed"
    | "job_started"
    | "system_notification"
    | "maintenance_notification";
  title: string;
  message: string;
  agentName?: "prism" | "falcon" | "sage" | "sentinel";
  jobId?: string;
  jobType?: string;
  metadata?: Record<string, any>;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  agentName?: string;
  jobId?: string;
  jobType?: string;
  metadata: Record<string, any>;
  isRead: boolean;
  isDismissed: boolean;
  createdAt: string;
  readAt?: string;
  dismissedAt?: string;
}

export class NotificationService {
  constructor() {
    // WebSocketManager is now used as a static class
  }

  /**
   * Create and send a notification
   */
  async createNotification(
    data: NotificationData
  ): Promise<Notification | null> {
    try {
      const notificationId = uuidv4();
      const notification = {
        id: notificationId,
        user_id: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        agent_name: data.agentName || null,
        job_id: data.jobId || null,
        job_type: data.jobType || null,
        metadata: data.metadata || {},
        is_read: false,
        is_dismissed: false,
        created_at: new Date().toISOString(),
      };

      // Save to database
      const { data: savedNotification, error } = await supabase
        .from("notifications")
        .insert(notification)
        .select()
        .single();

      if (error) {
        console.error("Error saving notification to database:", error);
        return null;
      }

      // Convert database format to frontend format
      const formattedNotification: Notification = {
        id: savedNotification.id,
        userId: savedNotification.user_id,
        type: savedNotification.type,
        title: savedNotification.title,
        message: savedNotification.message,
        agentName: savedNotification.agent_name,
        jobId: savedNotification.job_id,
        jobType: savedNotification.job_type,
        metadata: savedNotification.metadata || {},
        isRead: savedNotification.is_read,
        isDismissed: savedNotification.is_dismissed,
        createdAt: savedNotification.created_at,
        readAt: savedNotification.read_at,
        dismissedAt: savedNotification.dismissed_at,
      };

      // Send real-time notification via WebSocket
      try {
        // Use the new job completion notification method for better handling
        if (
          formattedNotification.type === "job_completed" ||
          formattedNotification.type === "job_failed"
        ) {
          WebSocketManager.sendJobCompletionNotification(data.userId, {
            id: formattedNotification.id,
            title: formattedNotification.title,
            message: formattedNotification.message,
            agentName: formattedNotification.agentName || "unknown",
            jobId: formattedNotification.jobId || "unknown",
            jobType: formattedNotification.jobType || "unknown",
            type: formattedNotification.type,
            createdAt: formattedNotification.createdAt,
          });
        } else {
          // Fallback for other notification types
          WebSocketManager.broadcastToUser(data.userId, {
            type: "notification:new",
            data: { notification: formattedNotification },
          });
        }
      } catch (wsError) {
        console.error("Error sending WebSocket notification:", wsError);
      }

      console.log(
        `✅ Notification created and sent to user ${data.userId}: ${data.title}`
      );
      return formattedNotification;
    } catch (error) {
      console.error("Error creating notification:", error);
      return null;
    }
  }

  /**
   * Get notifications for a user
   */
  async getUserNotifications(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      unreadOnly?: boolean;
    } = {}
  ): Promise<Notification[]> {
    try {
      const { limit = 50, offset = 0, unreadOnly = false } = options;

      let query = supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (unreadOnly) {
        query = query.eq("is_read", false);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching notifications:", error);
        return [];
      }

      // Convert database format to frontend format
      return data.map((notification) => ({
        id: notification.id,
        userId: notification.user_id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        agentName: notification.agent_name,
        jobId: notification.job_id,
        jobType: notification.job_type,
        metadata: notification.metadata || {},
        isRead: notification.is_read,
        isDismissed: notification.is_dismissed,
        createdAt: notification.created_at,
        readAt: notification.read_at,
        dismissedAt: notification.dismissed_at,
      }));
    } catch (error) {
      console.error("Error fetching user notifications:", error);
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq("id", notificationId)
        .eq("user_id", userId);

      if (error) {
        console.error("Error marking notification as read:", error);
        return false;
      }

      // Send real-time update via WebSocket
      try {
        WebSocketManager.broadcastToUser(userId, {
          type: "notification:read",
          data: { notificationId },
        });
      } catch (wsError) {
        console.error("Error sending WebSocket read notification:", wsError);
      }

      return true;
    } catch (error) {
      console.error("Error marking notification as read:", error);
      return false;
    }
  }

  /**
   * Mark notification as dismissed
   */
  async markAsDismissed(
    notificationId: string,
    userId: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({
          is_dismissed: true,
          dismissed_at: new Date().toISOString(),
        })
        .eq("id", notificationId)
        .eq("user_id", userId);

      if (error) {
        console.error("Error marking notification as dismissed:", error);
        return false;
      }

      // Send real-time update via WebSocket
      try {
        WebSocketManager.broadcastToUser(userId, {
          type: "notification:dismissed",
          data: { notificationId },
        });
      } catch (wsError) {
        console.error(
          "Error sending WebSocket dismissed notification:",
          wsError
        );
      }

      return true;
    } catch (error) {
      console.error("Error marking notification as dismissed:", error);
      return false;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("is_read", false);

      if (error) {
        console.error("Error marking all notifications as read:", error);
        return false;
      }

      // Send real-time update via WebSocket
      try {
        WebSocketManager.broadcastToUser(userId, {
          type: "notification:all_read",
          data: {},
        });
      } catch (wsError) {
        console.error(
          "Error sending WebSocket all read notification:",
          wsError
        );
      }

      return true;
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      return false;
    }
  }

  /**
   * Clear all notifications for a user (mark as dismissed)
   */
  async clearAllNotifications(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({
          is_dismissed: true,
          dismissed_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("is_dismissed", false);

      if (error) {
        console.error("Error clearing all notifications:", error);
        return false;
      }

      // Send real-time update via WebSocket
      try {
        WebSocketManager.broadcastToUser(userId, {
          type: "notification:all_cleared",
          data: {},
        });
      } catch (wsError) {
        console.error(
          "Error sending WebSocket all cleared notification:",
          wsError
        );
      }

      return true;
    } catch (error) {
      console.error("Error clearing all notifications:", error);
      return false;
    }
  }

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false)
        .eq("is_dismissed", false);

      if (error) {
        console.error("Error getting unread notification count:", error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error("Error getting unread notification count:", error);
      return 0;
    }
  }

  /**
   * Helper method to create agent-specific job completion notifications
   */
  async notifyJobCompleted(
    userId: string,
    agentName: "falcon" | "sage" | "sentinel",
    jobId: string,
    jobType: string,
    result?: any
  ): Promise<Notification | null> {
    // Create job-type specific messages
    let title: string;
    let message: string;

    if (jobType === "calendar_booking") {
      title = "Calendar Booking Complete";
      if (result?.success) {
        message = `Meeting has been scheduled successfully for ${
          result.data?.eventDetails?.title || "your appointment"
        }`;
      } else {
        title = "Calendar Booking Failed";
        message =
          result?.data?.message ||
          "There was an issue scheduling your meeting. Please try again.";
      }
    } else if (jobType === "reminder") {
      title = "Reminder Set Successfully";
      if (result?.success) {
        // Use the personalized message from Sentinel Agent
        message =
          result.data?.message || `Your reminder has been set successfully`;
      } else {
        title = "Reminder Setup Failed";
        message =
          result?.data?.message ||
          "There was an issue setting up your reminder. Please try again.";
      }
    } else {
      // Default agent-specific messages
      const agentMessages = {
        falcon: {
          title: "Lead Generation Complete",
          message:
            "Falcon has successfully generated new leads for your business",
        },
        sage: {
          title: "Research Analysis Complete",
          message: "Sage has completed the research analysis you requested",
        },
        sentinel: {
          title: "Email Monitoring Complete",
          message:
            "Sentinel has finished processing your email automation tasks",
        },
      };

      const agentMessage = agentMessages[agentName];
      title = agentMessage.title;
      message = agentMessage.message;
    }

    return this.createNotification({
      userId,
      type: result?.success ? "job_completed" : "job_failed",
      title,
      message,
      agentName,
      jobId,
      jobType,
      metadata: { result },
    });
  }

  /**
   * Helper method to create job failure notifications
   */
  async notifyJobFailed(
    userId: string,
    agentName: "falcon" | "sage" | "sentinel",
    jobId: string,
    jobType: string,
    error: string
  ): Promise<Notification | null> {
    return this.createNotification({
      userId,
      type: "job_failed",
      title: `${
        agentName.charAt(0).toUpperCase() + agentName.slice(1)
      } Task Failed`,
      message: `There was an issue processing your ${jobType} request. Please try again.`,
      agentName,
      jobId,
      jobType,
      metadata: { error },
    });
  }
}
