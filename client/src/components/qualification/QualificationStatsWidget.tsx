import React from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Target,
  TrendingUp,
  Users,
  Star,
  CheckCircle,
  AlertCircle,
  Clock,
  BarChart3,
} from "lucide-react";
import { QualificationStats } from "@/types/lead-generation";

interface QualificationStatsWidgetProps {
  stats?: QualificationStats | null;
  className?: string;
  loading?: boolean;
}

export function QualificationStatsWidget({
  stats,
  className,
  loading = false,
}: QualificationStatsWidgetProps) {
  if (loading || !stats) {
    return (
      <Card
        className={cn(
          "bg-dashboard-bg-secondary/50 backdrop-blur-sm border-dashboard-border-primary",
          className
        )}
      >
        <CardHeader>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-dashboard-border-primary rounded w-3/4"></div>
            <div className="h-3 bg-dashboard-border-primary rounded w-1/2"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-dashboard-border-primary rounded"></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-16 bg-dashboard-border-primary rounded"></div>
              <div className="h-16 bg-dashboard-border-primary rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const qualificationRate =
    stats.totalLeads > 0
      ? Math.round((stats.qualifiedLeads / stats.totalLeads) * 100)
      : 0;

  const distributionData = [
    {
      label: "High Quality",
      count: stats.highQualityLeads,
      percentage:
        stats.qualifiedLeads > 0
          ? Math.round((stats.highQualityLeads / stats.qualifiedLeads) * 100)
          : 0,
      color: "#C1FF72",
      bgColor: "bg-[#C1FF72]/10",
      textColor: "text-[#C1FF72]",
      icon: Star,
    },
    {
      label: "Medium Quality",
      count: stats.mediumQualityLeads,
      percentage:
        stats.qualifiedLeads > 0
          ? Math.round((stats.mediumQualityLeads / stats.qualifiedLeads) * 100)
          : 0,
      color: "#38B6FF",
      bgColor: "bg-[#38B6FF]/10",
      textColor: "text-[#38B6FF]",
      icon: CheckCircle,
    },
    {
      label: "Low Quality",
      count: stats.lowQualityLeads,
      percentage:
        stats.qualifiedLeads > 0
          ? Math.round((stats.lowQualityLeads / stats.qualifiedLeads) * 100)
          : 0,
      color: "#fbbf24",
      bgColor: "bg-yellow-400/10",
      textColor: "text-yellow-400",
      icon: AlertCircle,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        className={cn(
          "bg-dashboard-bg-secondary/50 backdrop-blur-sm border-dashboard-border-primary hover:border-dashboard-primary/50 transition-all duration-200",
          className
        )}
      >
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-dashboard-text-primary flex items-center gap-2">
                <Target className="w-5 h-5 text-dashboard-primary" />
                Lead Qualification Overview
              </CardTitle>
              <CardDescription className="text-dashboard-text-secondary">
                AI-powered lead quality analysis
              </CardDescription>
            </div>
            <Badge
              variant="outline"
              className="border-dashboard-primary/30 text-dashboard-primary bg-dashboard-primary/10"
            >
              <BarChart3 className="w-3 h-3 mr-1" />
              {qualificationRate}% Qualified
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Main Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-dashboard-text-primary">
                {stats.totalLeads.toLocaleString()}
              </div>
              <div className="text-xs text-dashboard-text-secondary flex items-center justify-center gap-1">
                <Users className="w-3 h-3" />
                Total Leads
              </div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-[#C1FF72]">
                {stats.qualifiedLeads.toLocaleString()}
              </div>
              <div className="text-xs text-dashboard-text-secondary flex items-center justify-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Qualified
              </div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-dashboard-text-muted">
                {stats.unqualifiedLeads.toLocaleString()}
              </div>
              <div className="text-xs text-dashboard-text-secondary flex items-center justify-center gap-1">
                <Clock className="w-3 h-3" />
                Pending
              </div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-[#38B6FF]">
                {Math.round(stats.avgQualificationScore)}
              </div>
              <div className="text-xs text-dashboard-text-secondary flex items-center justify-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Avg Score
              </div>
            </div>
          </div>

          {/* Qualification Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-dashboard-text-secondary">
                Qualification Progress
              </span>
              <span className="text-dashboard-text-primary font-medium">
                {qualificationRate}%
              </span>
            </div>
            <Progress
              value={qualificationRate}
              className="h-2 bg-dashboard-bg-tertiary"
            />
          </div>

          {/* Quality Distribution */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-dashboard-text-primary">
              Quality Distribution
            </h4>
            <div className="grid gap-2">
              {distributionData.map((item, index) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border transition-all duration-200",
                    item.bgColor,
                    "border-current/20 hover:border-current/40"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className={cn("w-4 h-4", item.textColor)} />
                    <span className="text-sm font-medium text-dashboard-text-primary">
                      {item.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("text-sm font-bold", item.textColor)}>
                      {item.count}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs border-current/30",
                        item.textColor,
                        item.bgColor
                      )}
                    >
                      {item.percentage}%
                    </Badge>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default QualificationStatsWidget;
