import React, { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Send, Bot, User, Loader2, CheckCircle, XCircle } from "lucide-react";
import { useProcessing } from "@/contexts/ProcessingContext";
import { AgentBeamVisualization } from "./AgentBeamVisualization";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  metadata?: {
    agentName?: string;
    jobId?: string;
    intent?: any;
  };
}

interface JobProgress {
  jobId: string;
  progress: number;
  message: string;
  stage: string;
  agentName?: string;
  estimatedTimeRemaining?: number;
}

interface AgentStatus {
  name: string;
  status: "active" | "processing" | "idle" | "error";
  tasksCompleted: number;
  tasksInQueue: number;
}

export default function AgentChat() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [jobProgress, setJobProgress] = useState<Map<string, JobProgress>>(
    new Map()
  );
  const [agentStatuses, setAgentStatuses] = useState<AgentStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [processedMessageIds, setProcessedMessageIds] = useState<Set<string>>(
    new Set()
  );

  // Use processing context
  const { updateProcessingState } = useProcessing();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Helper function to determine if message requires agent processing
  const requiresAgentProcessing = (message: string): boolean => {
    const lowerMessage = message.toLowerCase().trim();

    // Conversational/greeting patterns that don't need agent processing
    const conversationalPatterns = [
      /^(hi|hello|hey|good morning|good afternoon|good evening)$/,
      /^(how are you|what's up|how's it going)$/,
      /^(thanks|thank you|bye|goodbye|see you)$/,
      /^(yes|no|ok|okay|sure|alright)$/,
      /^(what can you do|help|what are your capabilities)$/,
      /^(test|testing)$/,
    ];

    // Check if message matches conversational patterns
    for (const pattern of conversationalPatterns) {
      if (pattern.test(lowerMessage)) {
        return false;
      }
    }

    // Task-oriented keywords that require agent processing
    const taskKeywords = [
      // Lead generation (Falcon)
      "find leads",
      "generate leads",
      "lead generation",
      "find companies",
      "find businesses",
      "apollo",
      "scrape leads",
      "contact information",
      "email addresses",
      "phone numbers",

      // Research (Sage)
      "research",
      "profile",
      "linkedin",
      "company research",
      "background check",
      "investigate",
      "analyze",
      "study",
      "examine",

      // Auto-reply (Sentinel)
      "auto reply",
      "respond to",
      "reply to",
      "send message",
      "outreach",
      "follow up",
      "email campaign",
      "message campaign",
    ];

    // Check if message contains task-oriented keywords
    return taskKeywords.some((keyword) => lowerMessage.includes(keyword));
  };

  // Helper function to determine which agent should handle the request
  const determineAgent = (
    message: string
  ): "falcon" | "sage" | "sentinel" | null => {
    if (!requiresAgentProcessing(message)) {
      return null;
    }

    const lowerMessage = message.toLowerCase();

    // Research-related keywords
    if (
      lowerMessage.includes("research") ||
      lowerMessage.includes("profile") ||
      lowerMessage.includes("linkedin") ||
      lowerMessage.includes("investigate") ||
      lowerMessage.includes("analyze") ||
      lowerMessage.includes("background")
    ) {
      return "sage";
    }

    // Reply-related keywords
    if (
      lowerMessage.includes("auto reply") ||
      lowerMessage.includes("respond to") ||
      lowerMessage.includes("reply to") ||
      lowerMessage.includes("outreach") ||
      lowerMessage.includes("follow up") ||
      lowerMessage.includes("campaign")
    ) {
      return "sentinel";
    }

    // Lead generation keywords (Falcon)
    if (
      lowerMessage.includes("find leads") ||
      lowerMessage.includes("generate leads") ||
      lowerMessage.includes("find companies") ||
      lowerMessage.includes("find businesses") ||
      lowerMessage.includes("apollo") ||
      lowerMessage.includes("scrape") ||
      lowerMessage.includes("contact information")
    ) {
      return "falcon";
    }

    // Default to null for ambiguous cases
    return null;
  };

  useEffect(() => {
    // Only initialize if we don't already have a connected socket
    if (!socket || !connected) {
      initializeWebSocket();
      loadConversationHistory();
    }

    return () => {
      if (socket) {
        socket.removeAllListeners(); // Remove all event listeners
        socket.disconnect();
      }
    };
  }, []); // Empty dependency array to run only once

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Also scroll when typing indicator changes
    if (isTyping) {
      scrollToBottom();
    }
  }, [isTyping]);

  const loadConversationHistory = async () => {
    try {
      console.log("🔍 Loading conversation history for Prism...");

      const response = await fetch(
        "/api/ai-agents/conversations/history/prism",
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
          (msg: ChatMessage) => !existingMessageIds.has(msg.id)
        );

        if (newMessages.length > 0) {
          setMessages((prev) => [...newMessages, ...prev]);

          // Add message IDs to processed set to prevent duplicates
          const newMessageIds = newMessages.map((msg: ChatMessage) => msg.id);
          setProcessedMessageIds((prev) => {
            const newSet = new Set(prev);
            newMessageIds.forEach((id) => newSet.add(id));
            return newSet;
          });
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
      // Prevent duplicate connections
      if (socket && connected) {
        console.log("🔍 WebSocket already connected, skipping initialization");
        return;
      }

      // Clean up existing socket if any
      if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
      }

      console.log("🔍 Initializing new WebSocket connection...");

      // Get WebSocket authentication token
      const response = await fetch("/api/ai-agents/auth/websocket-token", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to get WebSocket token");
      }

      const { token } = await response.json();

      // Initialize Socket.IO connection
      const newSocket = io({
        auth: { token },
        transports: ["websocket", "polling"],
        forceNew: true, // Force a new connection
      });

      newSocket.on("connect", () => {
        console.log("✅ Connected to AI Agents WebSocket");
        setConnected(true);
        setSocket(newSocket);

        // Request initial agent status
        newSocket.emit("agent:get_status");
      });

      newSocket.on("disconnect", () => {
        console.log("❌ Disconnected from AI Agents WebSocket");
        setConnected(false);
      });

      newSocket.on("connected", (data) => {
        console.log("🤖 AI Agents system ready:", data.message);
        addSystemMessage(
          "Hello! I'm Prism, your AI orchestrator for SharpFlow's lead generation platform. How can I assist you today?"
        );
      });

      newSocket.on("chat:message", (message: ChatMessage) => {
        // Prevent duplicate messages
        if (processedMessageIds.has(message.id)) {
          console.log("🔍 Duplicate message detected, skipping:", message.id);
          return;
        }

        // Add to processed messages
        setProcessedMessageIds((prev) => new Set(prev).add(message.id));

        setMessages((prev) => [
          ...prev,
          {
            ...message,
            timestamp: new Date(message.timestamp),
          },
        ]);
        setIsTyping(false);

        // Scroll to show the new agent message
        setTimeout(() => scrollToBottom(), 100);

        // Only update processing state if there's an active agentic process
        // (Regular chat responses don't need processing state updates)
      });

      newSocket.on("chat:typing", (data) => {
        setIsTyping(data.isTyping);
      });

      // Note: Removed redundant job:started handler to prevent duplicate messages
      // The Stage 1 acknowledgment messages from agents serve as job start notifications

      newSocket.on("job:progress", (progress: JobProgress) => {
        // Ensure agent name is properly included in progress
        const enhancedProgress = {
          ...progress,
          agentName: progress.agentName || "unknown",
        };

        setJobProgress(
          (prev) => new Map(prev.set(progress.jobId, enhancedProgress))
        );

        // Update processing state with job progress and agent assignment
        updateProcessingState({
          stage: progress.stage,
          progress: progress.progress,
          status: "processing",
          assignedAgent:
            (progress.agentName as "falcon" | "sage" | "sentinel") || null,
          isProcessing: true,
        });
      });

      // Note: Removed redundant job:completed handler to prevent duplicate messages
      // The Stage 2 OpenAI-generated completion messages from agents serve as completion notifications

      newSocket.on("job:error", (data) => {
        const agentDisplayName = getAgentDisplayName(data.agentName);
        const errorMessage = `❌ ${agentDisplayName} encountered an error: ${
          data.error || "Please try again."
        }`;

        addSystemMessage(errorMessage, {
          agentName: data.agentName,
          jobId: data.jobId,
          error: data.error,
          type: "error",
        });

        // Scroll to show the error message
        setTimeout(() => scrollToBottom(), 100);

        setJobProgress((prev) => {
          const newMap = new Map(prev);
          newMap.delete(data.jobId);
          return newMap;
        });

        // Update processing state to error
        updateProcessingState({
          stage: "Error",
          progress: 0,
          status: "error",
        });

        // Reset to idle after 3 seconds
        setTimeout(() => {
          updateProcessingState({
            isProcessing: false,
            currentRequest: "",
            assignedAgent: null,
            stage: "Idle",
            progress: 0,
            status: "idle",
          });
        }, 3000);
      });

      newSocket.on("agent:status", (data) => {
        setAgentStatuses(data.agents || []);
      });

      newSocket.on("chat:error", (data) => {
        addSystemMessage(`Error: ${data.message}`);
        // Scroll to show the error message
        setTimeout(() => scrollToBottom(), 100);
      });
    } catch (error) {
      console.error("WebSocket initialization error:", error);
      addSystemMessage(
        "Failed to connect to AI Agents. Please refresh the page."
      );
    }
  };

  const addSystemMessage = (content: string, metadata?: any) => {
    // Create a unique ID that includes content hash to prevent duplicates
    const contentHash = content.replace(/\s+/g, "").toLowerCase();
    const messageId = `system_${Date.now()}_${contentHash.slice(0, 10)}`;

    // Prevent duplicate system messages
    if (processedMessageIds.has(messageId)) {
      console.log(
        "🔍 Duplicate system message detected, skipping:",
        content.slice(0, 50)
      );
      return;
    }

    // Add to processed messages
    setProcessedMessageIds((prev) => new Set(prev).add(messageId));

    const systemMessage: ChatMessage = {
      id: messageId,
      role: "system",
      content,
      timestamp: new Date(),
      metadata: {
        ...metadata,
        // Mark Prism welcome messages
        isPrismMessage:
          content.includes("I'm Prism") ||
          content.includes("Prism AI Orchestrator"),
      },
    };
    setMessages((prev) => [...prev, systemMessage]);
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !socket || !connected) return;

    const messageText = inputMessage.trim();
    const assignedAgent = determineAgent(messageText);
    const requiresProcessing = requiresAgentProcessing(messageText);

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Immediately scroll to show the user's message
    setTimeout(() => scrollToBottom(), 100);

    // Only update processing state if this requires agent processing
    if (requiresProcessing && assignedAgent) {
      updateProcessingState({
        isProcessing: true,
        currentRequest: messageText,
        assignedAgent: assignedAgent,
        stage: "Analyzing Request",
        progress: 10,
        status: "processing",
      });
    }

    // Send message via WebSocket
    socket.emit("chat:message", {
      message: messageText,
      messageId: userMessage.id,
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

  const scrollToBottom = () => {
    // Use setTimeout to ensure DOM updates are complete
    setTimeout(() => {
      if (messagesContainerRef.current) {
        const container = messagesContainerRef.current;
        const scrollHeight = container.scrollHeight;
        const height = container.clientHeight;
        const maxScrollTop = scrollHeight - height;

        // Smooth scroll to bottom using scrollTo for better control
        container.scrollTo({
          top: maxScrollTop,
          behavior: "smooth",
        });
      }

      // Fallback to scrollIntoView for the end marker
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50); // Small delay to ensure DOM is updated
  };

  const getAgentIcon = (agentName?: string) => {
    switch (agentName?.toLowerCase()) {
      case "falcon":
        return (
          <img
            src="/close_up_short_falcon.png"
            alt="Falcon"
            className="w-5 h-5 object-contain"
          />
        );
      case "sage":
        return (
          <img
            src="/close_up_short_sage.png"
            alt="Sage"
            className="w-5 h-5 object-contain"
          />
        );
      case "sentinel":
        return (
          <img
            src="/close_up_short_sentinel.png"
            alt="Sentinel"
            className="w-5 h-5 object-contain"
          />
        );
      case "prism":
        return (
          <img
            src="/prism.svg"
            alt="Prism"
            className="w-5 h-5 object-contain"
          />
        );
      default:
        return "🤖";
    }
  };

  // Helper function to get agent profile image for chat avatars (larger, clean styling)
  const getAgentProfileImage = (agentName?: string) => {
    switch (agentName?.toLowerCase()) {
      case "falcon":
        return (
          <img
            src="/close_up_short_falcon.png"
            alt="Falcon"
            className="w-8 h-8 object-contain drop-shadow-[0_0_8px_rgba(193,255,114,0.3)]"
          />
        );
      case "sage":
        return (
          <img
            src="/close_up_short_sage.png"
            alt="Sage"
            className="w-8 h-8 object-contain drop-shadow-[0_0_8px_rgba(193,255,114,0.3)]"
          />
        );
      case "sentinel":
        return (
          <img
            src="/close_up_short_sentinel.png"
            alt="Sentinel"
            className="w-8 h-8 object-contain drop-shadow-[0_0_8px_rgba(193,255,114,0.3)]"
          />
        );
      case "prism":
        return (
          <img
            src="/prism.svg"
            alt="Prism"
            className="w-8 h-8 object-contain drop-shadow-[0_0_8px_rgba(193,255,114,0.3)]"
          />
        );
      default:
        return null;
    }
  };

  const getAgentDisplayName = (agentName?: string) => {
    switch (agentName?.toLowerCase()) {
      case "falcon":
        return "Falcon (Lead Generation)";
      case "sage":
        return "Sage (Lead Research)";
      case "sentinel":
        return "Sentinel (Auto Reply)";
      case "prism":
        return "Prism";
      default:
        return agentName || "AI Agent";
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex flex-col h-full w-full max-h-full">
      {/* Two-Column Layout Container - Responsive */}
      <div className="flex flex-col lg:flex-row h-full max-h-full gap-4">
        {/* Left Half - Chat Interface */}
        <div className="flex-1 flex flex-col h-full max-h-full bg-black border border-white/10 rounded-lg overflow-hidden shadow-2xl">
          {/* Header - Fixed height, never changes */}
          <div className="flex-shrink-0 px-3 sm:px-4 py-3 sm:py-4 border-b border-white/10 bg-black">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center">
                  <img
                    src="/prism.svg"
                    alt="Prism"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-base sm:text-lg">
                    Prism AI Orchestrator
                  </h3>
                  <p className="text-xs text-white/60 hidden sm:block">
                    Coordinating Falcon • Sage • Sentinel
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={connected ? "default" : "destructive"}
                  className={
                    connected
                      ? "bg-green-500/20 text-green-400 border-green-500/30 shadow-lg text-xs"
                      : "shadow-lg text-xs"
                  }
                >
                  <span className="hidden sm:inline">
                    {connected ? "🟢 Connected" : "🔴 Disconnected"}
                  </span>
                  <span className="sm:hidden">{connected ? "🟢" : "🔴"}</span>
                </Badge>
              </div>
            </div>
          </div>

          {/* Messages Area - Flexible height with internal scrolling */}
          <div className="flex-1 min-h-0 overflow-hidden relative">
            <div
              ref={messagesContainerRef}
              className="h-full overflow-y-auto px-4 py-4 space-y-4 scroll-smooth prism-chat-scrollbar"
            >
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex items-start gap-3 ${
                    message.role === "user" ? "flex-row-reverse" : ""
                  }`}
                >
                  <div
                    className={`flex-shrink-0 w-10 h-10 flex items-center justify-center ${
                      message.role === "user"
                        ? "rounded-full bg-[#38B6FF] text-white shadow-lg"
                        : message.role === "system"
                        ? message.metadata?.type === "completion"
                          ? "rounded-full bg-green-500 text-white shadow-lg"
                          : message.metadata?.type === "error"
                          ? "rounded-full bg-red-500 text-white shadow-lg"
                          : message.metadata?.isPrismMessage ||
                            message.metadata?.agentName
                          ? "" // No background styling for Prism or agent system messages
                          : "rounded-full bg-orange-500 text-white shadow-lg"
                        : message.metadata?.agentName?.toLowerCase() === "prism"
                        ? "" // No background styling for Prism
                        : "rounded-full bg-[#C1FF72] text-black shadow-lg"
                    }`}
                  >
                    {message.role === "user" ? (
                      <User className="h-5 w-5" />
                    ) : message.metadata?.type === "completion" ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : message.metadata?.type === "error" ? (
                      <XCircle className="h-5 w-5" />
                    ) : message.metadata?.isPrismMessage ? (
                      <img
                        src="/prism.svg"
                        alt="Prism"
                        className="w-8 h-8 object-contain drop-shadow-[0_0_8px_rgba(193,255,114,0.3)]"
                      />
                    ) : message.metadata?.agentName?.toLowerCase() ===
                      "prism" ? (
                      <img
                        src="/prism.svg"
                        alt="Prism"
                        className="w-8 h-8 object-contain drop-shadow-[0_0_8px_rgba(193,255,114,0.3)]"
                      />
                    ) : message.metadata?.agentName ? (
                      // Display agent profile image for system messages with agent names
                      getAgentProfileImage(message.metadata.agentName) || (
                        <span className="text-sm">
                          {getAgentIcon(message.metadata.agentName)}
                        </span>
                      )
                    ) : (
                      <span className="text-sm">
                        {getAgentIcon(message.metadata?.agentName)}
                      </span>
                    )}
                  </div>
                  <div
                    className={`flex-1 max-w-[90%] sm:max-w-[85%] lg:max-w-[80%] ${
                      message.role === "user" ? "text-right" : ""
                    }`}
                  >
                    <div
                      className={`inline-block p-4 rounded-xl shadow-sm ${
                        message.role === "user"
                          ? "bg-[#38B6FF] text-white"
                          : message.role === "system"
                          ? message.metadata?.type === "completion"
                            ? "bg-green-500/20 text-green-100 border border-green-500/30"
                            : message.metadata?.type === "error"
                            ? "bg-red-500/20 text-red-100 border border-red-500/30"
                            : "bg-white/10 text-white/90 border border-white/20"
                          : "bg-white/10 text-white/90 border border-white/20"
                      }`}
                    >
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">
                        {message.content}
                      </p>
                    </div>
                    <div className="text-xs text-white/60 mt-2 flex items-center gap-2">
                      <span>{formatTimestamp(message.timestamp)}</span>
                      {message.metadata?.agentName && (
                        <>
                          <span>•</span>
                          <Badge
                            variant="outline"
                            className="text-xs px-2 py-0.5 bg-white/10 border-white/20 text-white/80"
                          >
                            {getAgentDisplayName(message.metadata.agentName)}
                          </Badge>
                        </>
                      )}
                      {message.metadata?.jobId && (
                        <>
                          <span>•</span>
                          <span className="text-white/40">
                            Job: {message.metadata.jobId.slice(-8)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 flex items-center justify-center">
                    <img
                      src="/prism.svg"
                      alt="Prism"
                      className="w-8 h-8 object-contain drop-shadow-[0_0_8px_rgba(193,255,114,0.3)]"
                    />
                  </div>
                  <div className="bg-white/10 p-3 rounded-lg border border-white/20">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin text-[#C1FF72]" />
                      <span className="text-sm text-white/80">
                        Prism is thinking...
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area - Fixed at bottom, never scrolls */}
          <div className="flex-shrink-0 px-4 py-4 border-t border-white/10 bg-black">
            <div className="flex items-end gap-2 sm:gap-3">
              <div className="flex-1">
                <Input
                  ref={inputRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask Prism to coordinate lead generation, research, or auto-reply tasks..."
                  disabled={!connected || isLoading}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-[#C1FF72] focus:ring-[#C1FF72]/20 transition-all duration-200 rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-sm"
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
                size="lg"
                className="bg-[#C1FF72] text-black hover:bg-[#A8E85A] disabled:bg-white/10 disabled:text-white/50 transition-all duration-200 rounded-xl px-4 sm:px-6 py-2 sm:py-3 shadow-lg"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Right Half - Agent Beam Visualization */}
        <div className="flex-1 flex flex-col h-full max-h-full min-h-[300px] lg:min-h-0">
          <AgentBeamVisualization className="h-full" />
        </div>
      </div>
    </div>
  );
}
