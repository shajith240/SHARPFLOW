import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";
import jwt from "jsonwebtoken";
import type {
  WebSocketEvent,
  ProgressUpdate,
  ChatMessage,
  AgentStatus,
} from "../types/index.js";

interface AuthenticatedSocket {
  id: string;
  userId: string;
  sessionId?: string;
  join: (room: string) => void;
  leave: (room: string) => void;
  emit: (event: string, data: any) => void;
  on: (event: string, callback: (data: any) => void) => void;
  disconnect: () => void;
}

export class WebSocketManager {
  private io: SocketIOServer;
  private connectedUsers: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds
  private socketUsers: Map<string, string> = new Map(); // socketId -> userId

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin:
          process.env.NODE_ENV === "production"
            ? process.env.FRONTEND_URL
            : ["http://localhost:3000", "http://localhost:5173"],
        methods: ["GET", "POST"],
        credentials: true,
      },
      transports: ["websocket", "polling"],
    });

    this.setupAuthentication();
    this.setupEventHandlers();
  }

  private setupAuthentication(): void {
    this.io.use((socket: any, next) => {
      try {
        const token =
          socket.handshake.auth.token || socket.handshake.query.token;
        const userId =
          socket.handshake.auth.userId || socket.handshake.query.userId;

        // For development, allow connection with just userId
        if (process.env.NODE_ENV === "development" && userId && !token) {
          socket.userId = userId;
          socket.sessionId = `session-${userId}-${Date.now()}`;
          console.log(`🔌 WebSocket connected (dev mode): ${socket.userId}`);
          return next();
        }

        if (!token) {
          return next(new Error("Authentication token required"));
        }

        // Verify JWT token
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || "fallback-secret"
        ) as any;

        socket.userId = decoded.userId || decoded.sub;
        socket.sessionId = decoded.sessionId;

        console.log(`🔌 WebSocket authenticated: ${socket.userId}`);
        next();
      } catch (error) {
        console.error("WebSocket authentication error:", error);
        next(new Error("Invalid authentication token"));
      }
    });
  }

  private setupEventHandlers(): void {
    this.io.on("connection", (socket: AuthenticatedSocket) => {
      const userId = socket.userId;
      const socketId = socket.id;

      console.log(`✅ User ${userId} connected via WebSocket (${socketId})`);

      // Track user connection
      if (!this.connectedUsers.has(userId)) {
        this.connectedUsers.set(userId, new Set());
      }
      this.connectedUsers.get(userId)!.add(socketId);
      this.socketUsers.set(socketId, userId);

      // Join user-specific room
      socket.join(`user:${userId}`);

      // Send connection confirmation
      socket.emit("connected", {
        message: "Connected to Prism AI Orchestrator",
        userId,
        timestamp: new Date().toISOString(),
      });

      // Handle chat messages
      socket.on("chat:message", (data) => {
        this.handleChatMessage(socket, data);
      });

      // Handle agent job requests
      socket.on("agent:start_job", (data) => {
        this.handleAgentJobRequest(socket, data);
      });

      // Handle agent status requests
      socket.on("agent:get_status", () => {
        this.handleAgentStatusRequest(socket);
      });

      // Handle job status requests
      socket.on("job:get_status", (data) => {
        this.handleJobStatusRequest(socket, data);
      });

      // Handle typing indicators
      socket.on("chat:typing", (data) => {
        this.handleTypingIndicator(socket, data);
      });

      // Handle session management
      socket.on("session:join", (sessionId) => {
        socket.sessionId = sessionId;
        socket.join(`session:${sessionId}`);
        console.log(`📝 User ${userId} joined session ${sessionId}`);
      });

      socket.on("session:leave", (sessionId) => {
        socket.leave(`session:${sessionId}`);
        console.log(`📝 User ${userId} left session ${sessionId}`);
      });

      // Handle disconnection
      socket.on("disconnect", () => {
        this.handleDisconnection(socket);
      });
    });
  }

  private handleChatMessage(socket: AuthenticatedSocket, data: any): void {
    console.log(`💬 Chat message from ${socket.userId}:`, data.message);

    // Emit to Prism orchestrator
    console.log(
      "🔍 DEBUG - WebSocketManager emitting chat:message event to AgentOrchestrator"
    );
    this.emit("chat:message", {
      userId: socket.userId,
      sessionId: socket.sessionId,
      message: data.message,
      timestamp: new Date(),
    });
    console.log(
      "🔍 DEBUG - WebSocketManager chat:message event emitted successfully"
    );

    // Acknowledge message received
    socket.emit("chat:message_received", {
      messageId: data.messageId,
      timestamp: new Date().toISOString(),
    });
  }

  private handleAgentJobRequest(socket: AuthenticatedSocket, data: any): void {
    console.log(`🤖 Agent job request from ${socket.userId}:`, data);

    this.emit("agent:job_request", {
      userId: socket.userId,
      sessionId: socket.sessionId,
      agentName: data.agentName,
      jobType: data.jobType,
      inputData: data.inputData,
      socketId: socket.id,
    });
  }

  private handleAgentStatusRequest(socket: AuthenticatedSocket): void {
    this.emit("agent:status_request", {
      userId: socket.userId,
      socketId: socket.id,
    });
  }

  private handleJobStatusRequest(socket: AuthenticatedSocket, data: any): void {
    this.emit("job:status_request", {
      userId: socket.userId,
      jobId: data.jobId,
      queueName: data.queueName,
      socketId: socket.id,
    });
  }

  private handleTypingIndicator(socket: AuthenticatedSocket, data: any): void {
    if (socket.sessionId) {
      socket.to(`session:${socket.sessionId}`).emit("chat:typing", {
        userId: socket.userId,
        isTyping: data.isTyping,
        timestamp: new Date().toISOString(),
      });
    }
  }

  private handleDisconnection(socket: AuthenticatedSocket): void {
    const userId = socket.userId;
    const socketId = socket.id;

    console.log(`❌ User ${userId} disconnected (${socketId})`);

    // Remove from tracking
    if (this.connectedUsers.has(userId)) {
      this.connectedUsers.get(userId)!.delete(socketId);

      if (this.connectedUsers.get(userId)!.size === 0) {
        this.connectedUsers.delete(userId);
      }
    }
    this.socketUsers.delete(socketId);
  }

  // Public methods for sending events

  public sendToUser(userId: string, event: string, data: any): void {
    this.io.to(`user:${userId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  public sendToSession(sessionId: string, event: string, data: any): void {
    this.io.to(`session:${sessionId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  public broadcastToAll(event: string, data: any): void {
    this.io.emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  public sendJobProgress(userId: string, progressUpdate: ProgressUpdate): void {
    this.sendToUser(userId, "job:progress", progressUpdate);
  }

  public sendJobCompleted(userId: string, jobData: any): void {
    // Ensure agent name is properly included
    const enhancedJobData = {
      ...jobData,
      agentName: jobData.agentName || "unknown",
      message: jobData.message || `Job ${jobData.jobId} completed successfully`,
    };

    console.log(
      `✅ Sending job completion to user ${userId}:`,
      enhancedJobData
    );
    this.sendToUser(userId, "job:completed", enhancedJobData);
  }

  public sendJobError(userId: string, errorData: any): void {
    // Ensure agent name is properly included in error messages
    const enhancedErrorData = {
      ...errorData,
      agentName: errorData.agentName || "unknown",
      error: errorData.error || errorData.message || "An error occurred",
    };

    console.log(`❌ Sending job error to user ${userId}:`, enhancedErrorData);
    this.sendToUser(userId, "job:error", enhancedErrorData);
  }

  public sendChatMessage(userId: string, message: ChatMessage): void {
    console.log("🔍 DEBUG - Sending chat message via WebSocket:", {
      userId,
      content: message.content,
      role: message.role,
      agentName: message.metadata?.agentName,
    });
    this.sendToUser(userId, "chat:message", message);
  }

  public sendAgentStatus(userId: string, statuses: AgentStatus[]): void {
    this.sendToUser(userId, "agent:status", { agents: statuses });
  }

  public sendJobStatus(userId: string, jobStatus: any): void {
    this.sendToUser(userId, "job:status", jobStatus);
  }

  // Utility methods

  public isUserConnected(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  public getUserConnectionCount(userId: string): number {
    return this.connectedUsers.get(userId)?.size || 0;
  }

  public getConnectedUserCount(): number {
    return this.connectedUsers.size;
  }

  public getConnectedUsers(): string[] {
    return Array.from(this.connectedUsers.keys());
  }

  public getTotalConnections(): number {
    let total = 0;
    for (const sockets of this.connectedUsers.values()) {
      total += sockets.size;
    }
    return total;
  }

  // Event emitter methods
  private eventHandlers: Map<string, Function[]> = new Map();

  public on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  public emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(
            `Error in WebSocket event handler for ${event}:`,
            error
          );
        }
      });
    }
  }

  public async cleanup(): Promise<void> {
    console.log("🧹 Cleaning up WebSocket connections...");

    // Disconnect all clients
    this.io.disconnectSockets();

    // Clear tracking maps
    this.connectedUsers.clear();
    this.socketUsers.clear();
    this.eventHandlers.clear();

    console.log("✅ WebSocket cleanup completed");
  }
}
