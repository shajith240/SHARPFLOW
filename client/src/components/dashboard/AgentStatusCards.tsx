import React from "react";
import { motion } from "framer-motion";
import {
  Search,
  Linkedin,
  Mail,
  Activity,
  Clock,
  CheckCircle,
  AlertCircle,
  Zap,
  TrendingUp,
  Settings,
  Play,
  Pause,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DashboardParallaxItem,
  DashboardStaggerContainer,
} from "@/components/ui/dashboard-parallax";

import {
  AgentStatus,
  SubscriptionPlan,
  PLAN_FEATURES,
} from "@/types/lead-generation";

interface AgentStatusCardsProps {
  agents: AgentStatus[];
  userPlan: SubscriptionPlan;
}

export function AgentStatusCards({ agents, userPlan }: AgentStatusCardsProps) {
  const planFeatures = PLAN_FEATURES[userPlan];

  const getAgentIcon = (agentName: AgentStatus["name"]) => {
    switch (agentName) {
      case "Falcon":
        return "/falcon.png";
      case "Sage":
        return "/sage.png";
      case "Sentinel":
        return "/sentinel.png";
      default:
        return null;
    }
  };

  const getStatusColor = (status: AgentStatus["status"]) => {
    switch (status) {
      case "active":
        return {
          bg: "bg-green-500/20",
          text: "text-green-400",
          border: "border-green-500/30",
          icon: CheckCircle,
        };
      case "processing":
        return {
          bg: "bg-blue-500/20",
          text: "text-blue-400",
          border: "border-blue-500/30",
          icon: Activity,
        };
      case "idle":
        return {
          bg: "bg-yellow-500/20",
          text: "text-yellow-400",
          border: "border-yellow-500/30",
          icon: Clock,
        };
      case "error":
        return {
          bg: "bg-red-500/20",
          text: "text-red-400",
          border: "border-red-500/30",
          icon: AlertCircle,
        };
      default:
        return {
          bg: "bg-gray-500/20",
          text: "text-gray-400",
          border: "border-gray-500/30",
          icon: Clock,
        };
    }
  };

  const getAgentDescription = (agentName: AgentStatus["name"]) => {
    switch (agentName) {
      case "Falcon":
        return "Discovering qualified prospects based on your targeting criteria";
      case "Sage":
        return "Analyzing LinkedIn profiles and generating detailed research reports";
      case "Sentinel":
        return "Automatically responding to sales inquiries with personalized messages";
      default:
        return "AI agent working on your behalf";
    }
  };

  const formatLastActivity = (lastActivity: string) => {
    const date = new Date(lastActivity);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const calculateProgress = (completed: number, inQueue: number) => {
    const total = completed + inQueue;
    return total > 0 ? (completed / total) * 100 : 0;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-dashboard-text-primary">
            AI Agent Status
          </h3>
          <p className="text-dashboard-text-secondary">
            Monitor your active AI agents and their performance
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-dashboard-border-primary text-dashboard-text-primary hover:bg-dashboard-interactive-hover"
        >
          <Settings className="w-4 h-4 mr-2" />
          Configure Agents
        </Button>
      </div>

      <DashboardStaggerContainer staggerDelay={0.1}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent, index) => {
            const agentImageSrc = getAgentIcon(agent.name);
            const statusConfig = getStatusColor(agent.status);
            const StatusIcon = statusConfig.icon;
            const progress = calculateProgress(
              agent.tasksCompleted,
              agent.tasksInQueue
            );

            return (
              <DashboardParallaxItem
                key={agent.name}
                direction="up"
                distance={20}
                delay={index * 0.1}
              >
                <Card className="bg-dashboard-bg-secondary/50 backdrop-blur-sm border-dashboard-border-primary hover:border-dashboard-primary/50 transition-all duration-300 group">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-dashboard-primary/10">
                          {agentImageSrc ? (
                            <img
                              src={agentImageSrc}
                              alt={`${agent.name} Agent`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Activity className="w-6 h-6 text-dashboard-primary" />
                            </div>
                          )}
                        </div>
                        <div>
                          <CardTitle className="text-dashboard-text-primary text-lg">
                            {agent.name}
                          </CardTitle>
                          <CardDescription className="text-dashboard-text-secondary text-sm">
                            {getAgentDescription(agent.name)}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge
                        className={`${statusConfig.bg} ${statusConfig.text} ${statusConfig.border} border`}
                      >
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {agent.status.charAt(0).toUpperCase() +
                          agent.status.slice(1)}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Performance Metrics */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-dashboard-secondary" />
                          <span className="text-sm text-dashboard-text-secondary">
                            Completed
                          </span>
                        </div>
                        <div className="text-xl font-bold text-dashboard-text-primary">
                          {agent.tasksCompleted.toLocaleString()}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-dashboard-primary" />
                          <span className="text-sm text-dashboard-text-secondary">
                            In Queue
                          </span>
                        </div>
                        <div className="text-xl font-bold text-dashboard-text-primary">
                          {agent.tasksInQueue}
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-dashboard-text-secondary">
                          Task Progress
                        </span>
                        <span className="text-dashboard-text-primary font-medium">
                          {progress.toFixed(1)}%
                        </span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>

                    {/* Uptime and Last Activity */}
                    <div className="space-y-3 pt-2 border-t border-dashboard-border-primary">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-dashboard-secondary" />
                          <span className="text-sm text-dashboard-text-secondary">
                            Uptime
                          </span>
                        </div>
                        <span className="text-sm font-medium text-dashboard-text-primary">
                          {agent.uptime}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Activity className="w-4 h-4 text-dashboard-primary" />
                          <span className="text-sm text-dashboard-text-secondary">
                            Last Activity
                          </span>
                        </div>
                        <span className="text-sm font-medium text-dashboard-text-primary">
                          {formatLastActivity(agent.lastActivity)}
                        </span>
                      </div>
                    </div>

                    {/* Agent Controls */}
                    <div className="flex items-center gap-2 pt-2">
                      {agent.status === "active" ||
                      agent.status === "processing" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 border-dashboard-border-primary text-dashboard-text-primary hover:bg-dashboard-interactive-hover"
                        >
                          <Pause className="w-3 h-3 mr-2" />
                          Pause
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 border-dashboard-border-primary text-dashboard-text-primary hover:bg-dashboard-interactive-hover"
                        >
                          <Play className="w-3 h-3 mr-2" />
                          Start
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-dashboard-border-primary text-dashboard-text-primary hover:bg-dashboard-interactive-hover"
                      >
                        <Settings className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </DashboardParallaxItem>
            );
          })}

          {/* Locked Agents for Lower Plans */}
          {planFeatures.agents.length < 3 && (
            <>
              {!planFeatures.researchReports && (
                <DashboardParallaxItem
                  direction="up"
                  distance={20}
                  delay={agents.length * 0.1}
                >
                  <Card className="bg-dashboard-bg-secondary/30 backdrop-blur-sm border-dashboard-border-primary border-dashed opacity-75 hover:opacity-90 transition-opacity">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-500/20">
                            <img
                              src="/sage.png"
                              alt="Sage Agent"
                              className="w-full h-full object-cover grayscale opacity-50"
                            />
                          </div>
                          <div>
                            <CardTitle className="text-gray-400 text-lg">
                              Sage
                            </CardTitle>
                            <CardDescription className="text-gray-500 text-sm">
                              Unlock with Professional plan
                            </CardDescription>
                          </div>
                        </div>
                        <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 border">
                          Locked
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-4">
                        <TrendingUp className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500 mb-4">
                          Generate detailed LinkedIn research reports
                        </p>
                        <Button
                          size="sm"
                          className="bg-dashboard-primary hover:bg-dashboard-primary/90"
                        >
                          Upgrade Plan
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </DashboardParallaxItem>
              )}

              {!planFeatures.emailAutomation && (
                <DashboardParallaxItem
                  direction="up"
                  distance={20}
                  delay={(agents.length + 1) * 0.1}
                >
                  <Card className="bg-dashboard-bg-secondary/30 backdrop-blur-sm border-dashboard-border-primary border-dashed opacity-75 hover:opacity-90 transition-opacity">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-500/20">
                            <img
                              src="/sentinel.png"
                              alt="Sentinel Agent"
                              className="w-full h-full object-cover grayscale opacity-50"
                            />
                          </div>
                          <div>
                            <CardTitle className="text-gray-400 text-lg">
                              Sentinel
                            </CardTitle>
                            <CardDescription className="text-gray-500 text-sm">
                              Unlock with Ultra plan
                            </CardDescription>
                          </div>
                        </div>
                        <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 border">
                          Locked
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-4">
                        <Zap className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500 mb-4">
                          Automate email responses and follow-ups
                        </p>
                        <Button
                          size="sm"
                          className="bg-dashboard-primary hover:bg-dashboard-primary/90"
                        >
                          Upgrade Plan
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </DashboardParallaxItem>
              )}
            </>
          )}
        </div>
      </DashboardStaggerContainer>
    </div>
  );
}
