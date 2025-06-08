import { Router } from "express";
import { NotificationService } from "../services/NotificationService.js";
import { isAuthenticated } from "../googleAuth.js";

const router = Router();
const notificationService = new NotificationService();

// Get user notifications
router.get("/", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { limit, offset, unreadOnly } = req.query;

    const notifications = await notificationService.getUserNotifications(
      userId,
      {
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
        unreadOnly: unreadOnly === "true",
      }
    );

    res.json({ notifications });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// Get unread notification count
router.get("/unread-count", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const count = await notificationService.getUnreadCount(userId);
    res.json({ count });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    res.status(500).json({ error: "Failed to fetch unread count" });
  }
});

// Mark notification as read
router.patch("/:id/read", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;
    const notificationId = req.params.id;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const success = await notificationService.markAsRead(
      notificationId,
      userId
    );

    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Notification not found or already read" });
    }
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ error: "Failed to mark notification as read" });
  }
});

// Mark notification as dismissed
router.patch("/:id/dismiss", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;
    const notificationId = req.params.id;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const success = await notificationService.markAsDismissed(
      notificationId,
      userId
    );

    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Notification not found" });
    }
  } catch (error) {
    console.error("Error marking notification as dismissed:", error);
    res.status(500).json({ error: "Failed to mark notification as dismissed" });
  }
});

// Mark all notifications as read
router.patch("/mark-all-read", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const success = await notificationService.markAllAsRead(userId);

    if (success) {
      res.json({ success: true });
    } else {
      res
        .status(500)
        .json({ error: "Failed to mark all notifications as read" });
    }
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({ error: "Failed to mark all notifications as read" });
  }
});

// Clear all notifications (dismiss all)
router.delete("/clear-all", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const success = await notificationService.clearAllNotifications(userId);

    if (success) {
      res.json({
        success: true,
        message: "All notifications cleared successfully",
      });
    } else {
      res.status(500).json({ error: "Failed to clear all notifications" });
    }
  } catch (error) {
    console.error("Error clearing all notifications:", error);
    res.status(500).json({ error: "Failed to clear all notifications" });
  }
});

// Create a test notification (for development/testing)
router.post("/test", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { type, title, message, agentName } = req.body;

    if (!type || !title || !message) {
      return res
        .status(400)
        .json({ error: "Missing required fields: type, title, message" });
    }

    const notification = await notificationService.createNotification({
      userId,
      type,
      title,
      message,
      agentName,
      metadata: { test: true },
    });

    if (notification) {
      res.json({ notification });
    } else {
      res.status(500).json({ error: "Failed to create test notification" });
    }
  } catch (error) {
    console.error("Error creating test notification:", error);
    res.status(500).json({ error: "Failed to create test notification" });
  }
});

export default router;
