import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Notification {
  id: string;
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
  metadata: Record<string, any>;
  isRead: boolean;
  isDismissed: boolean;
  createdAt: string;
  readAt?: string;
  dismissedAt?: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;

  // Actions
  addNotification: (notification: Notification) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  markAsDismissed: (notificationId: string) => void;
  removeNotification: (notificationId: string) => void;
  setNotifications: (notifications: Notification[]) => void;
  setUnreadCount: (count: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearNotifications: () => void;
  clearAllNotifications: () => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      error: null,

      addNotification: (notification) => {
        set((state) => {
          // Check if notification already exists
          const exists = state.notifications.some(
            (n) => n.id === notification.id
          );
          if (exists) return state;

          const newNotifications = [notification, ...state.notifications];
          const newUnreadCount = newNotifications.filter(
            (n) => !n.isRead && !n.isDismissed
          ).length;

          return {
            notifications: newNotifications,
            unreadCount: newUnreadCount,
          };
        });
      },

      markAsRead: (notificationId) => {
        set((state) => {
          const updatedNotifications = state.notifications.map((notification) =>
            notification.id === notificationId
              ? {
                  ...notification,
                  isRead: true,
                  readAt: new Date().toISOString(),
                }
              : notification
          );

          const newUnreadCount = updatedNotifications.filter(
            (n) => !n.isRead && !n.isDismissed
          ).length;

          return {
            notifications: updatedNotifications,
            unreadCount: newUnreadCount,
          };
        });
      },

      markAllAsRead: () => {
        set((state) => {
          const now = new Date().toISOString();
          const updatedNotifications = state.notifications.map(
            (notification) => ({
              ...notification,
              isRead: true,
              readAt: notification.readAt || now,
            })
          );

          return {
            notifications: updatedNotifications,
            unreadCount: 0,
          };
        });
      },

      markAsDismissed: (notificationId) => {
        set((state) => {
          const updatedNotifications = state.notifications.map((notification) =>
            notification.id === notificationId
              ? {
                  ...notification,
                  isDismissed: true,
                  dismissedAt: new Date().toISOString(),
                  isRead: true,
                  readAt: notification.readAt || new Date().toISOString(),
                }
              : notification
          );

          const newUnreadCount = updatedNotifications.filter(
            (n) => !n.isRead && !n.isDismissed
          ).length;

          return {
            notifications: updatedNotifications,
            unreadCount: newUnreadCount,
          };
        });
      },

      removeNotification: (notificationId) => {
        set((state) => {
          const updatedNotifications = state.notifications.filter(
            (n) => n.id !== notificationId
          );
          const newUnreadCount = updatedNotifications.filter(
            (n) => !n.isRead && !n.isDismissed
          ).length;

          return {
            notifications: updatedNotifications,
            unreadCount: newUnreadCount,
          };
        });
      },

      setNotifications: (notifications) => {
        const unreadCount = notifications.filter(
          (n) => !n.isRead && !n.isDismissed
        ).length;
        set({ notifications, unreadCount });
      },

      setUnreadCount: (count) => {
        set({ unreadCount: count });
      },

      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      setError: (error) => {
        set({ error });
      },

      clearNotifications: () => {
        set({ notifications: [], unreadCount: 0 });
      },

      clearAllNotifications: () => {
        set({ notifications: [], unreadCount: 0 });
      },
    }),
    {
      name: "notification-store",
      partialize: (state) => ({
        notifications: state.notifications.slice(0, 50), // Keep only last 50 notifications in storage
      }),
    }
  )
);

// Helper functions for notification management
export const getAgentDisplayName = (agentName?: string): string => {
  const displayNames = {
    falcon: "Falcon",
    sage: "Sage",
    sentinel: "Sentinel",
    prism: "Prism",
  };

  return (
    displayNames[agentName as keyof typeof displayNames] ||
    agentName ||
    "System"
  );
};

export const getAgentIcon = (agentName?: string): string => {
  const icons = {
    falcon: "🦅",
    sage: "🧠",
    sentinel: "🛡️",
    prism: "💎",
  };

  return icons[agentName as keyof typeof icons] || "🔔";
};

export const getNotificationTypeColor = (type: string): string => {
  const colors = {
    job_completed: "text-green-400",
    job_failed: "text-red-400",
    job_started: "text-blue-400",
    system_notification: "text-yellow-400",
    maintenance_notification: "text-orange-400",
  };

  return colors[type as keyof typeof colors] || "text-gray-400";
};

export const formatTimeAgo = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "Just now";
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}m ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}d ago`;
  }
};
