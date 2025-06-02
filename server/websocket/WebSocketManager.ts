import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import { parse } from "url";
import jwt from "jsonwebtoken";

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  isAlive?: boolean;
}

export class WebSocketManager {
  private static instance: WebSocketManager;
  private wss: WebSocketServer;
  private userConnections = new Map<string, Set<AuthenticatedWebSocket>>();
  private heartbeatInterval: NodeJS.Timeout;

  constructor(server: any) {
    this.wss = new WebSocketServer({
      server,
      path: "/ws",
      verifyClient: this.verifyClient.bind(this),
    });

    this.setupWebSocket();
    this.startHeartbeat();
    WebSocketManager.instance = this;
  }

  private verifyClient(info: {
    origin: string;
    secure: boolean;
    req: IncomingMessage;
  }) {
    try {
      const url = parse(info.req.url || "", true);
      const token = url.query.token as string;

      if (!token) {
        return false;
      }

      // Verify JWT token
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "fallback-secret"
      ) as any;

      // Store userId in request for later use
      (info.req as any).userId = decoded.userId || decoded.sub;

      return true;
    } catch (error) {
      console.error("WebSocket authentication failed:", error);
      return false;
    }
  }

  private setupWebSocket() {
    this.wss.on(
      "connection",
      (ws: AuthenticatedWebSocket, request: IncomingMessage) => {
        const userId = (request as any).userId;

        if (!userId) {
          ws.close(1008, "Authentication required");
          return;
        }

        ws.userId = userId;
        ws.isAlive = true;

        // Add to user connections
        if (!this.userConnections.has(userId)) {
          this.userConnections.set(userId, new Set());
        }
        this.userConnections.get(userId)!.add(ws);

        console.log(`WebSocket connected for user: ${userId}`);

        // Send initial connection confirmation
        this.sendToSocket(ws, {
          type: "connection_established",
          data: {
            userId,
            timestamp: new Date().toISOString(),
            message: "Real-time updates enabled",
          },
        });

        // Handle incoming messages
        ws.on("message", (data: Buffer) => {
          try {
            const message = JSON.parse(data.toString());
            this.handleMessage(ws, message);
          } catch (error) {
            console.error("Failed to parse WebSocket message:", error);
          }
        });

        // Handle pong responses for heartbeat
        ws.on("pong", () => {
          ws.isAlive = true;
        });

        // Handle connection close
        ws.on("close", () => {
          console.log(`WebSocket disconnected for user: ${userId}`);
          const userSockets = this.userConnections.get(userId);
          if (userSockets) {
            userSockets.delete(ws);
            if (userSockets.size === 0) {
              this.userConnections.delete(userId);
            }
          }
        });

        // Handle errors
        ws.on("error", (error) => {
          console.error(`WebSocket error for user ${userId}:`, error);
        });
      }
    );
  }

  private handleMessage(ws: AuthenticatedWebSocket, message: any) {
    switch (message.type) {
      case "ping":
        this.sendToSocket(ws, {
          type: "pong",
          data: { timestamp: new Date().toISOString() },
        });
        break;

      case "subscribe_to_jobs":
        // Client wants to subscribe to job updates
        this.sendToSocket(ws, {
          type: "subscription_confirmed",
          data: { subscription: "job_updates" },
        });
        break;

      case "get_agent_status":
        // Client requesting current agent status
        this.sendAgentStatus(ws);
        break;

      default:
        console.log("Unknown WebSocket message type:", message.type);
    }
  }

  private async sendAgentStatus(ws: AuthenticatedWebSocket) {
    try {
      // Get current agent status (this would integrate with your queue system)
      const agentStatus = {
        leadgenAgent: {
          status: "active",
          activeJobs: 0,
          queuedJobs: 0,
          lastActivity: new Date().toISOString(),
          uptime: "99.5%",
        },
        researchAgent: {
          status: "active",
          activeJobs: 0,
          queuedJobs: 0,
          lastActivity: new Date().toISOString(),
          uptime: "98.2%",
        },
        emailAgent: {
          status: "idle",
          activeJobs: 0,
          queuedJobs: 0,
          lastActivity: new Date().toISOString(),
          uptime: "99.8%",
        },
      };

      this.sendToSocket(ws, {
        type: "agent_status_update",
        data: agentStatus,
      });
    } catch (error) {
      console.error("Failed to send agent status:", error);
    }
  }

  private sendToSocket(ws: AuthenticatedWebSocket, message: any) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.wss.clients.forEach((ws: AuthenticatedWebSocket) => {
        if (!ws.isAlive) {
          ws.terminate();
          return;
        }

        ws.isAlive = false;
        ws.ping();
      });
    }, 30000); // 30 seconds
  }

  // Static methods for external use
  static getInstance(): WebSocketManager {
    return WebSocketManager.instance;
  }

  static broadcastToUser(userId: string, message: any) {
    const instance = WebSocketManager.getInstance();
    if (!instance) {
      console.warn("WebSocketManager not initialized");
      return;
    }

    const userSockets = instance.userConnections.get(userId);
    if (!userSockets || userSockets.size === 0) {
      console.log(`No active WebSocket connections for user: ${userId}`);
      return;
    }

    const messageStr = JSON.stringify({
      ...message,
      timestamp: new Date().toISOString(),
    });

    userSockets.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
      }
    });

    console.log(
      `Broadcasted message to ${userSockets.size} connections for user: ${userId}`
    );
  }

  static broadcastToAll(message: any, planFilter?: string[]) {
    const instance = WebSocketManager.getInstance();
    if (!instance) {
      console.warn("WebSocketManager not initialized");
      return;
    }

    const messageStr = JSON.stringify({
      ...message,
      timestamp: new Date().toISOString(),
    });

    let sentCount = 0;
    instance.userConnections.forEach((sockets, userId) => {
      // TODO: Add plan filtering logic here if needed
      sockets.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(messageStr);
          sentCount++;
        }
      });
    });

    console.log(`Broadcasted message to ${sentCount} connections`);
  }

  static getConnectionCount(): number {
    const instance = WebSocketManager.getInstance();
    if (!instance) return 0;

    let count = 0;
    instance.userConnections.forEach((sockets) => {
      count += sockets.size;
    });
    return count;
  }

  static getUserConnectionCount(userId: string): number {
    const instance = WebSocketManager.getInstance();
    if (!instance) return 0;

    const userSockets = instance.userConnections.get(userId);
    return userSockets ? userSockets.size : 0;
  }

  static getConnectedUsers(): string[] {
    const instance = WebSocketManager.getInstance();
    if (!instance) return [];

    return Array.from(instance.userConnections.keys());
  }

  // Cleanup method
  static cleanup() {
    const instance = WebSocketManager.getInstance();
    if (!instance) return;

    if (instance.heartbeatInterval) {
      clearInterval(instance.heartbeatInterval);
    }

    instance.wss.clients.forEach((ws) => {
      ws.terminate();
    });

    instance.userConnections.clear();
  }

  // Method to send system notifications
  static sendSystemNotification(
    message: string,
    type: "info" | "warning" | "error" = "info"
  ) {
    this.broadcastToAll({
      type: "system_notification",
      data: {
        message,
        notificationType: type,
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Method to send maintenance notifications
  static sendMaintenanceNotification(message: string, scheduledTime?: string) {
    this.broadcastToAll({
      type: "maintenance_notification",
      data: {
        message,
        scheduledTime,
        timestamp: new Date().toISOString(),
      },
    });
  }
}

// Export singleton instance creator
export function createWebSocketManager(server: any): WebSocketManager {
  return new WebSocketManager(server);
}
