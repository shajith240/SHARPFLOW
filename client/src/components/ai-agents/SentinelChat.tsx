import React, { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Send,
  Mail,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Bot,
} from "lucide-react";

interface EmailThread {
  id: string;
  threadId: string;
  subject: string;
  fromAddress: string;
  status: "pending" | "processing" | "approved" | "sent";
  classification: "sales" | "calendar" | "escalation";
  lastActivity: string;
  requiresApproval: boolean;
}

interface SentinelMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  metadata?: {
    type?: "email_notification" | "approval_request" | "status_update";
    emailThread?: EmailThread;
    responseContent?: string;
  };
}

interface SentinelChatProps {
  className?: string;
}

export function SentinelChat({ className }: SentinelChatProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<SentinelMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailThreads, setEmailThreads] = useState<EmailThread[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<number>(0);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    initializeWebSocket();
    loadConversationHistory();
    return () => {
      if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  };

  const loadConversationHistory = async () => {
    try {
      console.log("🔍 Loading conversation history for Sentinel...");

      const response = await fetch(
        "/api/ai-agents/conversations/history/sentinel",
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (!response.ok) {
        console.warn(
          "Failed to load conversation history:",
          response.statusText
        );
        return;
      }

      const data = await response.json();

      if (data.success && data.messages && data.messages.length > 0) {
        console.log(`✅ Loaded ${data.messages.length} previous messages`);

        // Transform and set messages, avoiding duplicates
        const historyMessages = data.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));

        // Filter out any messages that might already be in the current messages
        const existingMessageIds = new Set(messages.map((m) => m.id));
        const newMessages = historyMessages.filter(
          (msg: SentinelMessage) => !existingMessageIds.has(msg.id)
        );

        if (newMessages.length > 0) {
          setMessages((prev) => [...newMessages, ...prev]);
        }
      } else {
        console.log("📝 No previous conversation history found");
      }
    } catch (error) {
      console.error("Error loading conversation history:", error);
      // Don't show error to user as this is not critical
    }
  };

  const initializeWebSocket = async () => {
    try {
      const response = await fetch("/api/ai-agents/auth/websocket-token", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to get WebSocket token");
      }

      const { token } = await response.json();

      const newSocket = io({
        auth: { token },
        transports: ["websocket", "polling"],
        forceNew: true,
      });

      newSocket.on("connect", () => {
        console.log("✅ Connected to Sentinel WebSocket");
        setConnected(true);
        setSocket(newSocket);

        // Subscribe to Sentinel-specific events
        newSocket.emit("sentinel:subscribe");
      });

      newSocket.on("disconnect", () => {
        console.log("❌ Disconnected from Sentinel WebSocket");
        setConnected(false);
      });

      newSocket.on("connected", (data) => {
        addSystemMessage(
          "Sentinel Email Automation Agent is online. I can help you monitor emails, generate responses, and manage calendar bookings."
        );
      });

      // Sentinel-specific event handlers
      newSocket.on("sentinel:email_detected", (data) => {
        addEmailNotification(data);
      });

      newSocket.on("sentinel:approval_required", (data) => {
        addApprovalRequest(data);
      });

      newSocket.on("sentinel:response_sent", (data) => {
        addStatusUpdate(data, "success");
      });

      newSocket.on("sentinel:escalation", (data) => {
        addEscalationAlert(data);
      });
    } catch (error) {
      console.error("WebSocket initialization error:", error);
      addSystemMessage(
        "Failed to connect to Sentinel agent. Please refresh the page."
      );
    }
  };

  const addSystemMessage = (content: string) => {
    const message: SentinelMessage = {
      id: `sys_${Date.now()}`,
      role: "system",
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, message]);
  };

  const addEmailNotification = (data: any) => {
    const message: SentinelMessage = {
      id: `email_${Date.now()}`,
      role: "assistant",
      content: `📧 New email detected from ${data.fromAddress}: "${data.subject}"`,
      timestamp: new Date(),
      metadata: {
        type: "email_notification",
        emailThread: data.thread,
      },
    };
    setMessages((prev) => [...prev, message]);

    // Update email threads
    setEmailThreads((prev) => [data.thread, ...prev.slice(0, 9)]);
  };

  const addApprovalRequest = (data: any) => {
    const message: SentinelMessage = {
      id: `approval_${Date.now()}`,
      role: "assistant",
      content: `✋ Approval required for response to ${data.emailAddress}`,
      timestamp: new Date(),
      metadata: {
        type: "approval_request",
        emailThread: data.thread,
        responseContent: data.responseContent,
      },
    };
    setMessages((prev) => [...prev, message]);
    setPendingApprovals((prev) => prev + 1);
  };

  const addStatusUpdate = (data: any, type: "success" | "error") => {
    const icon = type === "success" ? "✅" : "❌";
    const message: SentinelMessage = {
      id: `status_${Date.now()}`,
      role: "assistant",
      content: `${icon} ${data.message}`,
      timestamp: new Date(),
      metadata: {
        type: "status_update",
      },
    };
    setMessages((prev) => [...prev, message]);
  };

  const addEscalationAlert = (data: any) => {
    const message: SentinelMessage = {
      id: `escalation_${Date.now()}`,
      role: "assistant",
      content: `🚨 Email from ${data.emailAddress} requires human attention: ${data.reason}`,
      timestamp: new Date(),
      metadata: {
        type: "email_notification",
        emailThread: data.thread,
      },
    };
    setMessages((prev) => [...prev, message]);
  };

  const sendMessage = () => {
    if (!socket || !connected || !inputMessage.trim()) return;

    const userMessage: SentinelMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      content: inputMessage.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    socket.emit("chat:message", {
      message: inputMessage.trim(),
      messageId: userMessage.id,
      agentContext: "sentinel",
    });

    setInputMessage("");
    setIsLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const approveResponse = (messageId: string) => {
    if (!socket) return;

    socket.emit("sentinel:approve_response", { messageId });
    setPendingApprovals((prev) => Math.max(0, prev - 1));
    addStatusUpdate({ message: "Response approved and sent" }, "success");
  };

  const rejectResponse = (messageId: string) => {
    if (!socket) return;

    socket.emit("sentinel:reject_response", { messageId });
    setPendingApprovals((prev) => Math.max(0, prev - 1));
    addStatusUpdate({ message: "Response rejected" }, "error");
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "processing":
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      case "approved":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "sent":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      default:
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getClassificationIcon = (classification: string) => {
    switch (classification) {
      case "sales":
        return <Mail className="h-4 w-4 text-blue-500" />;
      case "calendar":
        return <Calendar className="h-4 w-4 text-green-500" />;
      case "escalation":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Mail className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className={`flex flex-col h-full w-full max-h-full ${className}`}>
      {/* Header with Status */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-white/10 bg-black">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center">
              <img
                src="/close_up_short_sentinel.png"
                alt="Sentinel"
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Sentinel</h3>
              <p className="text-sm text-white/60">Email Automation Agent</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {pendingApprovals > 0 && (
              <Badge
                variant="destructive"
                className="bg-red-500/20 text-red-400 border-red-500/30"
              >
                {pendingApprovals} Pending
              </Badge>
            )}
            <Badge
              variant={connected ? "default" : "destructive"}
              className={
                connected
                  ? "bg-green-500/20 text-green-400 border-green-500/30"
                  : "bg-red-500/20 text-red-400 border-red-500/30"
              }
            >
              {connected ? "Online" : "Offline"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div
          ref={messagesContainerRef}
          className="h-full overflow-y-auto px-4 py-4 space-y-4 scroll-smooth"
        >
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start gap-3 ${
                message.role === "user" ? "flex-row-reverse" : ""
              }`}
            >
              <div
                className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full ${
                  message.role === "user"
                    ? "bg-[#38B6FF] text-white"
                    : message.role === "system"
                    ? "bg-gray-600 text-white"
                    : "bg-[#C1FF72] text-black"
                }`}
              >
                {message.role === "user" ? (
                  <User className="h-4 w-4" />
                ) : (
                  <Bot className="h-4 w-4" />
                )}
              </div>
              <div
                className={`flex-1 max-w-[80%] ${
                  message.role === "user" ? "text-right" : ""
                }`}
              >
                <div
                  className={`inline-block px-4 py-2 rounded-lg ${
                    message.role === "user"
                      ? "bg-[#38B6FF] text-white"
                      : message.role === "system"
                      ? "bg-gray-800 text-gray-200"
                      : "bg-white/10 text-white"
                  }`}
                >
                  <p className="text-sm">{message.content}</p>

                  {/* Approval buttons for approval requests */}
                  {message.metadata?.type === "approval_request" && (
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => approveResponse(message.id)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => rejectResponse(message.id)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        <XCircle className="h-3 w-3 mr-1" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-white/40 mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 px-4 py-4 border-t border-white/10 bg-black">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Input
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask Sentinel about email monitoring, responses, or calendar bookings..."
              disabled={!connected || isLoading}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-[#C1FF72] focus:ring-[#C1FF72]/20"
            />
            {!connected && (
              <p className="text-xs text-red-400 mt-1">
                ⚠️ Disconnected - Please refresh the page
              </p>
            )}
          </div>
          <Button
            onClick={sendMessage}
            disabled={!connected || !inputMessage.trim() || isLoading}
            className="bg-[#C1FF72] text-black hover:bg-[#A8E85A] disabled:bg-white/10 disabled:text-white/50"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
