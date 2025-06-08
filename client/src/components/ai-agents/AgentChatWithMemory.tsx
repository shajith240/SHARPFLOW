import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Send, User, Bot } from "lucide-react";
import { io, Socket } from "socket.io-client";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  metadata?: {
    agentName?: string;
    messageType?: string;
    [key: string]: any;
  };
}

interface AgentChatWithMemoryProps {
  agentType: 'falcon' | 'sage';
  agentName: string;
  agentDescription: string;
  agentImage: string;
  placeholder: string;
  className?: string;
}

export function AgentChatWithMemory({
  agentType,
  agentName,
  agentDescription,
  agentImage,
  placeholder,
  className = ""
}: AgentChatWithMemoryProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [processedMessageIds, setProcessedMessageIds] = useState<Set<string>>(new Set());
  
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
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  const loadConversationHistory = async () => {
    try {
      console.log(`🔍 Loading conversation history for ${agentName}...`);
      
      const response = await fetch(`/api/ai-agents/conversations/history/${agentType}`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        console.warn("Failed to load conversation history:", response.statusText);
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
        const existingMessageIds = new Set(messages.map(m => m.id));
        const newMessages = historyMessages.filter((msg: ChatMessage) => 
          !existingMessageIds.has(msg.id)
        );

        if (newMessages.length > 0) {
          setMessages(prev => [...newMessages, ...prev]);
          
          // Add message IDs to processed set to prevent duplicates
          const newMessageIds = newMessages.map((msg: ChatMessage) => msg.id);
          setProcessedMessageIds(prev => {
            const newSet = new Set(prev);
            newMessageIds.forEach(id => newSet.add(id));
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
        console.log(`✅ Connected to ${agentName} WebSocket`);
        setConnected(true);
        setSocket(newSocket);
      });

      newSocket.on("disconnect", () => {
        console.log(`❌ Disconnected from ${agentName} WebSocket`);
        setConnected(false);
      });

      newSocket.on("connected", (data) => {
        addSystemMessage(`${agentName} is online and ready to help!`);
      });

      // Handle chat messages
      newSocket.on("chat:message", (data) => {
        if (processedMessageIds.has(data.messageId)) {
          return; // Skip duplicate messages
        }

        const message: ChatMessage = {
          id: data.messageId || `msg_${Date.now()}`,
          role: "assistant",
          content: data.message,
          timestamp: new Date(),
          metadata: data.metadata || { agentName },
        };

        setMessages(prev => [...prev, message]);
        setProcessedMessageIds(prev => new Set(prev).add(message.id));
        setIsLoading(false);
      });

      // Handle typing indicators
      newSocket.on("chat:typing", (data) => {
        // Could implement typing indicator here
      });

    } catch (error) {
      console.error("WebSocket initialization error:", error);
      addSystemMessage(`Failed to connect to ${agentName}. Please refresh the page.`);
    }
  };

  const addSystemMessage = (content: string) => {
    const message: ChatMessage = {
      id: `sys_${Date.now()}`,
      role: "system",
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, message]);
  };

  const sendMessage = () => {
    if (!socket || !connected || !inputMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      content: inputMessage.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    socket.emit("chat:message", {
      message: inputMessage.trim(),
      messageId: userMessage.id,
    });

    setInputMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
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
                src={agentImage}
                alt={agentName}
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">{agentName}</h3>
              <p className="text-sm text-white/60">{agentDescription}</p>
            </div>
          </div>
          <Badge 
            variant={connected ? "default" : "destructive"}
            className={connected 
              ? "bg-green-500/20 text-green-400 border-green-500/30" 
              : "bg-red-500/20 text-red-400 border-red-500/30"
            }
          >
            {connected ? "Online" : "Offline"}
          </Badge>
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
                </div>
                <p className="text-xs text-white/40 mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-[#C1FF72] text-black">
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex-1 max-w-[80%]">
                <div className="inline-block px-4 py-2 rounded-lg bg-white/10 text-white">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                    <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
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
              placeholder={placeholder}
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
