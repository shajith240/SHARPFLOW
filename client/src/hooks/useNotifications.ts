import { useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNotificationStore } from "../stores/notificationStore";
import { NotificationService } from "../services/notificationService";
import { useWebSocket } from "./useWebSocket";
import { toast } from "../hooks/use-toast";
import { useNotificationAudio } from "../components/notifications/NotificationAudio";

/**
 * Comprehensive notification hook that manages:
 * - Real-time WebSocket notifications
 * - Persistent notification storage
 * - API synchronization
 * - Toast notifications
 */
export function useNotifications() {
  const queryClient = useQueryClient();
  const { lastMessage } = useWebSocket();
  const { playNotificationSound } = useNotificationAudio();

  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    addNotification,
    markAsRead,
    markAllAsRead,
    markAsDismissed,
    clearAllNotifications,
    setNotifications,
    setUnreadCount,
    setLoading,
    setError,
  } = useNotificationStore();

  // Fetch notifications from API
  const { data: apiNotifications, isLoading: isLoadingApi } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => NotificationService.getNotifications({ limit: 50 }),
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  });

  // Fetch unread count from API
  const { data: apiUnreadCount } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: () => NotificationService.getUnreadCount(),
    refetchInterval: 15000, // Refetch every 15 seconds
    staleTime: 5000, // Consider data stale after 5 seconds
  });

  // Sync API data with store
  useEffect(() => {
    if (apiNotifications) {
      setNotifications(apiNotifications);
    }
  }, [apiNotifications, setNotifications]);

  useEffect(() => {
    if (typeof apiUnreadCount === "number") {
      setUnreadCount(apiUnreadCount);
    }
  }, [apiUnreadCount, setUnreadCount]);

  useEffect(() => {
    setLoading(isLoadingApi);
  }, [isLoadingApi, setLoading]);

  // Handle real-time WebSocket notifications
  useEffect(() => {
    if (!lastMessage) return;

    switch (lastMessage.type) {
      case "notification:new":
        if (lastMessage.data?.notification) {
          const notification = lastMessage.data.notification;
          addNotification(notification);

          // Show toast notification
          toast({
            title: notification.title,
            description: notification.message,
            duration: 5000,
          });

          // Play notification sound
          playNotificationSound(notification);

          // Invalidate queries to refresh data
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
        }
        break;

      case "job_completion_notification":
        if (lastMessage.data) {
          const notification = lastMessage.data;
          addNotification(notification);

          // Show enhanced toast notification for job completion
          toast({
            title: notification.title,
            description: notification.message,
            duration: 7000, // Longer duration for job completions
          });

          // Play notification sound
          playNotificationSound(notification);

          // Invalidate queries to refresh data
          queryClient.invalidateQueries({ queryKey: ["notifications"] });

          console.log(
            `🎉 Job completion notification received: ${notification.title}`
          );
        }
        break;

      case "notification:read":
        if (lastMessage.data?.notificationId) {
          markAsRead(lastMessage.data.notificationId);
        }
        break;

      case "notification:dismissed":
        if (lastMessage.data?.notificationId) {
          markAsDismissed(lastMessage.data.notificationId);
        }
        break;

      case "notification:all_read":
        markAllAsRead();
        break;

      case "notification:all_cleared":
        clearAllNotifications();
        break;

      // Legacy job completion events (for backward compatibility)
      case "job_completed":
      case "job_failed":
      case "job_started":
        // These should now be handled by the notification:new event
        // but we keep this for backward compatibility
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
        break;
    }
  }, [
    lastMessage,
    addNotification,
    markAsRead,
    markAllAsRead,
    markAsDismissed,
    clearAllNotifications,
    queryClient,
  ]);

  // Mutation for marking notification as read
  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) =>
      NotificationService.markAsRead(notificationId),
    onSuccess: (_, notificationId) => {
      markAsRead(notificationId);
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (error) => {
      console.error("Failed to mark notification as read:", error);
      setError("Failed to mark notification as read");
    },
  });

  // Mutation for marking notification as dismissed
  const markAsDismissedMutation = useMutation({
    mutationFn: (notificationId: string) =>
      NotificationService.markAsDismissed(notificationId),
    onSuccess: (_, notificationId) => {
      markAsDismissed(notificationId);
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (error) => {
      console.error("Failed to mark notification as dismissed:", error);
      setError("Failed to mark notification as dismissed");
    },
  });

  // Mutation for marking all notifications as read
  const markAllAsReadMutation = useMutation({
    mutationFn: () => NotificationService.markAllAsRead(),
    onSuccess: () => {
      markAllAsRead();
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (error) => {
      console.error("Failed to mark all notifications as read:", error);
      setError("Failed to mark all notifications as read");
    },
  });

  // Mutation for clearing all notifications
  const clearAllNotificationsMutation = useMutation({
    mutationFn: () => NotificationService.clearAllNotifications(),
    onSuccess: () => {
      clearAllNotifications();
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast({
        title: "Notifications Cleared",
        description: "All notifications have been cleared successfully.",
      });
    },
    onError: (error) => {
      console.error("Failed to clear all notifications:", error);
      setError("Failed to clear all notifications");
      toast({
        title: "Error",
        description: "Failed to clear all notifications. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Helper functions
  const handleMarkAsRead = useCallback(
    (notificationId: string) => {
      markAsReadMutation.mutate(notificationId);
    },
    [markAsReadMutation]
  );

  const handleMarkAsDismissed = useCallback(
    (notificationId: string) => {
      markAsDismissedMutation.mutate(notificationId);
    },
    [markAsDismissedMutation]
  );

  const handleMarkAllAsRead = useCallback(() => {
    markAllAsReadMutation.mutate();
  }, [markAllAsReadMutation]);

  const handleClearAllNotifications = useCallback(() => {
    clearAllNotificationsMutation.mutate();
  }, [clearAllNotificationsMutation]);

  // Get unread notifications
  const unreadNotifications = notifications.filter(
    (n) => !n.isRead && !n.isDismissed
  );

  // Get recent notifications (last 24 hours)
  const recentNotifications = notifications.filter((n) => {
    const notificationDate = new Date(n.createdAt);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return notificationDate > oneDayAgo;
  });

  return {
    // Data
    notifications,
    unreadNotifications,
    recentNotifications,
    unreadCount,
    isLoading,
    error,

    // Actions
    markAsRead: handleMarkAsRead,
    markAsDismissed: handleMarkAsDismissed,
    markAllAsRead: handleMarkAllAsRead,
    clearAllNotifications: handleClearAllNotifications,

    // Mutation states
    isMarkingAsRead: markAsReadMutation.isPending,
    isMarkingAsDismissed: markAsDismissedMutation.isPending,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
    isClearingAllNotifications: clearAllNotificationsMutation.isPending,
  };
}

/**
 * Hook for creating test notifications (development only)
 */
export function useTestNotifications() {
  const queryClient = useQueryClient();

  const createTestNotification = useMutation({
    mutationFn: (data: {
      type: string;
      title: string;
      message: string;
      agentName?: string;
    }) => NotificationService.createTestNotification(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast({
        title: "Test Notification Created",
        description: "A test notification has been created successfully.",
      });
    },
    onError: (error) => {
      console.error("Failed to create test notification:", error);
      toast({
        title: "Error",
        description: "Failed to create test notification.",
        variant: "destructive",
      });
    },
  });

  return {
    createTestNotification: createTestNotification.mutate,
    isCreating: createTestNotification.isPending,
  };
}
