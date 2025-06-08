import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Users,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Calendar,
} from "lucide-react";

interface DashboardSummary {
  pending_setups: number;
  todays_subscriptions: number;
  weekly_completions: number;
  avg_setup_time_hours: number;
  overdue_setups: number;
}

interface DashboardStatsProps {
  summary: DashboardSummary;
}

export function DashboardStats({ summary }: DashboardStatsProps) {
  const formatSetupTime = (hours: number) => {
    if (hours < 1) {
      return `${Math.round(hours * 60)}m`;
    } else if (hours < 24) {
      return `${Math.round(hours * 10) / 10}h`;
    } else {
      return `${Math.round((hours / 24) * 10) / 10}d`;
    }
  };

  const stats = [
    {
      title: "Pending Setups",
      value: summary.pending_setups,
      icon: Clock,
      color: summary.pending_setups > 0 ? "text-yellow-500" : "text-green-500",
      bgColor:
        summary.pending_setups > 0 ? "bg-yellow-500/10" : "bg-green-500/10",
      description:
        summary.overdue_setups > 0
          ? `${summary.overdue_setups} overdue`
          : "All up to date",
      badge: summary.pending_setups > 0 ? "urgent" : "good",
    },
    {
      title: "Today's Subscriptions",
      value: summary.todays_subscriptions,
      icon: Users,
      color: "text-[#C1FF72]",
      bgColor: "bg-[#C1FF72]/10",
      description: "New customers today",
      badge: summary.todays_subscriptions > 0 ? "active" : "none",
    },
    {
      title: "Weekly Completions",
      value: summary.weekly_completions,
      icon: CheckCircle,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      description: "Setups completed this week",
      badge: "success",
    },
    {
      title: "Avg Setup Time",
      value: summary.avg_setup_time_hours
        ? formatSetupTime(summary.avg_setup_time_hours)
        : "N/A",
      icon: TrendingUp,
      color: "text-[#38B6FF]",
      bgColor: "bg-[#38B6FF]/10",
      description: "Average completion time",
      badge: "info",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <Card
          key={index}
          className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-colors"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              {stat.title}
            </CardTitle>
            <div className={`p-2 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className={`text-2xl font-bold ${stat.color}`}>
                  {stat.value}
                </div>
                <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
              </div>

              {/* Status Badge */}
              {stat.badge === "urgent" && (
                <Badge variant="destructive" className="ml-2">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Urgent
                </Badge>
              )}

              {stat.badge === "active" && (
                <Badge className="ml-2 bg-[#C1FF72] text-black">
                  <Calendar className="h-3 w-3 mr-1" />
                  Active
                </Badge>
              )}

              {stat.badge === "success" && (
                <Badge
                  variant="outline"
                  className="ml-2 border-green-500 text-green-500"
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Good
                </Badge>
              )}

              {stat.badge === "info" && (
                <Badge
                  variant="outline"
                  className="ml-2 border-[#38B6FF] text-[#38B6FF]"
                >
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Trend
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Alert for overdue setups */}
      {summary.overdue_setups > 0 && (
        <Card className="md:col-span-2 lg:col-span-4 bg-red-900/20 border-red-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <p className="font-medium text-red-400">
                  {summary.overdue_setups} setup
                  {summary.overdue_setups > 1 ? "s" : ""} overdue
                </p>
                <p className="text-sm text-red-300">
                  These customers have been waiting more than 24 hours for setup
                  completion.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
