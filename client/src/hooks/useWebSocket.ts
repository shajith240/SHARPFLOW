import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "./useAuth";

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
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { user } = useAuth();

  const connect = useCallback(async () => {
    if (!user) return;

    try {
      // For now, we'll use a simple user ID approach
      // In production, you'd want to implement proper JWT token authentication
      const wsUrl = `${
        process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3000"
      }/ws?userId=${user.id}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("WebSocket connected");
        setIsConnected(true);
        setConnectionError(null);

        // Send initial ping
        ws.send(JSON.stringify({ type: "ping" }));
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);

          // Handle specific message types
          switch (message.type) {
            case "connection_established":
              console.log("WebSocket connection established:", message.data);
              break;
            case "job_progress":
              console.log("Job progress update:", message.data);
              break;
            case "job_completed":
              console.log("Job completed:", message.data);
              break;
            case "job_failed":
              console.log("Job failed:", message.data);
              break;
            case "agent_status_update":
              console.log("Agent status update:", message.data);
              break;
            default:
              console.log("WebSocket message:", message);
          }
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };

      ws.onclose = (event) => {
        console.log("WebSocket disconnected:", event.code, event.reason);
        setIsConnected(false);
        wsRef.current = null;

        // Attempt to reconnect after 3 seconds if not a normal closure
        if (event.code !== 1000 && user) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log("Attempting to reconnect WebSocket...");
            connect();
          }, 3000);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setConnectionError("WebSocket connection error");
        setIsConnected(false);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error("Failed to connect WebSocket:", error);
      setConnectionError("Failed to establish WebSocket connection");
    }
  }, [user]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, "User disconnected");
      wsRef.current = null;
    }
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn("WebSocket not connected, cannot send message");
    }
  }, []);

  useEffect(() => {
    if (user) {
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

// Hook for real-time notifications
export function useRealTimeNotifications() {
  const { lastMessage } = useWebSocket();
  const [notifications, setNotifications] = useState<WebSocketMessage[]>([]);

  useEffect(() => {
    if (!lastMessage) return;

    const notificationTypes = [
      "job_completed",
      "job_failed",
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
