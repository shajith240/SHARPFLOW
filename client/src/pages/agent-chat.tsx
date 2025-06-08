import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import AgentChat from "@/components/ai-agents/AgentChat";

export default function AgentChatPage() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/sign-in");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto py-8 h-screen flex flex-col">
        <div className="mb-8 flex-shrink-0">
          <h1 className="text-3xl font-bold text-white mb-2">AI Agents</h1>
          <p className="text-gray-400">
            Chat with SharpFlow's AI agents for lead generation, research, and
            automation.
          </p>
        </div>

        <div className="flex-1 min-h-0">
          <AgentChat />
        </div>
      </div>
    </div>
  );
}
