import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "./useAuth";
import { io, Socket } from "socket.io-client";

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

export interface WebSocketHookReturn {
  isConnected: boolean;
  lastMessage: WebSocketMessage | null;
  sendMessage: (message: any) => void;
  connectionError: string | null;
}

export function useWebSocket(): WebSocketHookReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { user } = useAuth();

  const connect = useCallback(async () => {
    if (!user) return;

    try {
      // Create Socket.IO connection
      const serverUrl = import.meta.env.VITE_WS_URL || "http://localhost:3000";

      // For now, we'll connect without authentication token
      // In production, you'd want to implement proper JWT token authentication
      const socket = io(serverUrl, {
        transports: ["websocket", "polling"],
        auth: {
          userId: user.id,
        },
        query: {
          userId: user.id,
        },
      });

      socket.on("connect", () => {
        console.log("Socket.IO connected");
        setIsConnected(true);
        setConnectionError(null);
      });

      socket.on("connected", (data) => {
        console.log("Socket.IO connection established:", data);
        setLastMessage({
          type: "connection_established",
          data,
          timestamp: new Date().toISOString(),
        });
      });

      // Handle job progress updates
      socket.on("job:progress", (data) => {
        console.log("Job progress update:", data);
        setLastMessage({
          type: "job_progress",
          data,
          timestamp: data.timestamp || new Date().toISOString(),
        });
      });

      // Handle job completion
      socket.on("job:completed", (data) => {
        console.log("Job completed:", data);
        setLastMessage({
          type: "job_completed",
          data,
          timestamp: data.timestamp || new Date().toISOString(),
        });
      });

      // Handle job errors
      socket.on("job:error", (data) => {
        console.log("Job failed:", data);
        setLastMessage({
          type: "job_failed",
          data,
          timestamp: data.timestamp || new Date().toISOString(),
        });
      });

      // Handle chat messages
      socket.on("chat:message", (data) => {
        console.log("Chat message received:", data);
        setLastMessage({
          type: "chat_message",
          data,
          timestamp: data.timestamp || new Date().toISOString(),
        });
      });

      // Handle agent status updates
      socket.on("agent:status", (data) => {
        console.log("Agent status update:", data);
        setLastMessage({
          type: "agent_status_update",
          data,
          timestamp: data.timestamp || new Date().toISOString(),
        });
      });

      socket.on("disconnect", (reason) => {
        console.log("Socket.IO disconnected:", reason);
        setIsConnected(false);
        socketRef.current = null;

        // Attempt to reconnect after 3 seconds if not a normal closure
        if (reason !== "io client disconnect" && user) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log("Attempting to reconnect Socket.IO...");
            connect();
          }, 3000);
        }
      });

      socket.on("connect_error", (error) => {
        console.error("Socket.IO connection error:", error);
        setConnectionError("Socket.IO connection error");
        setIsConnected(false);
      });

      socketRef.current = socket;
    } catch (error) {
      console.error("Failed to connect Socket.IO:", error);
      setConnectionError("Failed to establish Socket.IO connection");
    }
  }, [user]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (socketRef.current && socketRef.current.connected) {
      // Send message based on type
      switch (message.type) {
        case "chat:message":
          socketRef.current.emit("chat:message", message.data);
          break;
        case "agent:start_job":
          socketRef.current.emit("agent:start_job", message.data);
          break;
        case "agent:get_status":
          socketRef.current.emit("agent:get_status");
          break;
        case "job:get_status":
          socketRef.current.emit("job:get_status", message.data);
          break;
        default:
          socketRef.current.emit(message.type, message.data);
      }
    } else {
      console.warn("Socket.IO not connected, cannot send message");
    }
  }, []);

  useEffect(() => {
    // Temporarily disable auto-connect for development
    // TODO: Re-enable when WebSocket issues are resolved
    if (false && user) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [user, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    lastMessage,
    sendMessage,
    connectionError,
  };
}

// Hook for specific job progress tracking
export function useJobProgress(jobId: string | null) {
  const { lastMessage } = useWebSocket();
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<
    "pending" | "processing" | "completed" | "failed"
  >("pending");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!lastMessage || !jobId) return;

    const { type, data } = lastMessage;

    // Check if this message is for our job
    if (data.jobId !== jobId) return;

    switch (type) {
      case "job_progress":
        setProgress(data.progress || 0);
        setStatus(data.status || "processing");
        break;
      case "job_completed":
        setProgress(100);
        setStatus("completed");
        setResult(data.result);
        break;
      case "job_failed":
        setStatus("failed");
        setError(data.error);
        break;
    }
  }, [lastMessage, jobId]);

  return { progress, status, result, error };
}

// Hook for agent status monitoring
export function useAgentStatus() {
  const { lastMessage, sendMessage } = useWebSocket();
  const [agentStatus, setAgentStatus] = useState<any>(null);

  useEffect(() => {
    if (!lastMessage) return;

    if (lastMessage.type === "agent_status_update") {
      setAgentStatus(lastMessage.data);
    }
  }, [lastMessage]);

  // Request current agent status
  const requestAgentStatus = useCallback(() => {
    sendMessage({ type: "get_agent_status" });
  }, [sendMessage]);

  return { agentStatus, requestAgentStatus };
}

// Hook for real-time notifications with Zustand store integration
export function useRealTimeNotifications() {
  const { lastMessage } = useWebSocket();
  const [notifications, setNotifications] = useState<WebSocketMessage[]>([]);

  useEffect(() => {
    if (!lastMessage) return;

    const notificationTypes = [
      "notification:new",
      "notification:read",
      "notification:dismissed",
      "notification:all_read",
      "job_completed",
      "job_failed",
      "job_started",
      "system_notification",
      "maintenance_notification",
    ];

    if (notificationTypes.includes(lastMessage.type)) {
      setNotifications((prev) => [lastMessage, ...prev.slice(0, 9)]); // Keep last 10 notifications
    }
  }, [lastMessage]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const removeNotification = useCallback((index: number) => {
    setNotifications((prev) => prev.filter((_, i) => i !== index));
  }, []);

  return { notifications, clearNotifications, removeNotification };
}
