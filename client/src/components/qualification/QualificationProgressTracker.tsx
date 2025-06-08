import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import { cn } from "@/lib/utils";
import {
  Clock,
  CheckCircle,
  XCircle,
  Zap,
  Pause,
  Play,
  Square,
  AlertTriangle,
  TrendingUp,
  Users,
  Target,
} from "lucide-react";
import { QualificationJob } from "@/types/lead-generation";

interface QualificationProgressTrackerProps {
  jobs: QualificationJob[];
  onCancelJob?: (jobId: string) => void;
  onRetryJob?: (jobId: string) => void;
  className?: string;
}

export function QualificationProgressTracker({
  jobs,
  onCancelJob,
  onRetryJob,
  className,
}: QualificationProgressTrackerProps) {
  const [expandedJob, setExpandedJob] = useState<string | null>(null);

  const getStatusIcon = (status: QualificationJob["jobStatus"]) => {
    switch (status) {
      case "queued":
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case "processing":
        return <Zap className="w-4 h-4 text-[#38B6FF] animate-pulse" />;
      case "completed":
        return <CheckCircle className="w-4 h-4 text-[#C1FF72]" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-400" />;
      case "cancelled":
        return <Square className="w-4 h-4 text-gray-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: QualificationJob["jobStatus"]) => {
    switch (status) {
      case "queued":
        return "border-yellow-400/30 bg-yellow-400/10 text-yellow-400";
      case "processing":
        return "border-[#38B6FF]/30 bg-[#38B6FF]/10 text-[#38B6FF]";
      case "completed":
        return "border-[#C1FF72]/30 bg-[#C1FF72]/10 text-[#C1FF72]";
      case "failed":
        return "border-red-400/30 bg-red-400/10 text-red-400";
      case "cancelled":
        return "border-gray-400/30 bg-gray-400/10 text-gray-400";
      default:
        return "border-gray-400/30 bg-gray-400/10 text-gray-400";
    }
  };

  const getProgress = (job: QualificationJob) => {
    if (job.jobStatus === "completed") return 100;
    if (job.jobStatus === "failed" || job.jobStatus === "cancelled") return 0;
    if (job.leadsToProcess === 0) return 0;
    return Math.round((job.leadsProcessed / job.leadsToProcess) * 100);
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return "N/A";
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return "Just now";
  };

  if (jobs.length === 0) {
    return (
      <Card className={cn("bg-dashboard-bg-secondary/50 backdrop-blur-sm border-dashboard-border-primary", className)}>
        <CardContent className="py-8 text-center">
          <Target className="w-12 h-12 text-dashboard-text-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-dashboard-text-primary mb-2">
            No Qualification Jobs
          </h3>
          <p className="text-dashboard-text-secondary">
            Start a bulk qualification to see progress tracking here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("bg-dashboard-bg-secondary/50 backdrop-blur-sm border-dashboard-border-primary", className)}>
      <CardHeader>
        <CardTitle className="text-dashboard-text-primary flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-dashboard-primary" />
          Qualification Progress
        </CardTitle>
        <CardDescription className="text-dashboard-text-secondary">
          Track your lead qualification jobs in real-time
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <AnimatePresence>
          {jobs.map((job, index) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.1 }}
              className="border border-dashboard-border-primary rounded-lg p-4 space-y-3"
            >
              {/* Job Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(job.jobStatus)}
                  <div>
                    <h4 className="text-sm font-medium text-dashboard-text-primary">
                      {job.jobType === "bulk_qualification" && "Bulk Qualification"}
                      {job.jobType === "single_lead" && "Single Lead Qualification"}
                      {job.jobType === "auto_qualification" && "Auto Qualification"}
                    </h4>
                    <p className="text-xs text-dashboard-text-secondary">
                      Started {formatTimeAgo(job.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn("text-xs", getStatusColor(job.jobStatus))}
                  >
                    {job.jobStatus.charAt(0).toUpperCase() + job.jobStatus.slice(1)}
                  </Badge>
                  
                  {job.jobStatus === "processing" && onCancelJob && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onCancelJob(job.id)}
                      className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-400/10"
                    >
                      <Square className="w-3 h-3" />
                    </Button>
                  )}

                  {job.jobStatus === "failed" && onRetryJob && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRetryJob(job.id)}
                      className="h-6 w-6 p-0 text-[#38B6FF] hover:text-[#38B6FF]/80 hover:bg-[#38B6FF]/10"
                    >
                      <Play className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              {(job.jobStatus === "processing" || job.jobStatus === "completed") && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-dashboard-text-secondary">
                      {job.leadsProcessed} of {job.leadsToProcess} leads processed
                    </span>
                    <span className="text-dashboard-text-primary font-medium">
                      {getProgress(job)}%
                    </span>
                  </div>
                  <Progress 
                    value={getProgress(job)} 
                    className="h-2 bg-dashboard-bg-tertiary"
                  />
                </div>
              )}

              {/* Job Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div className="text-center">
                  <div className="text-lg font-bold text-dashboard-text-primary">
                    {job.leadsQualified}
                  </div>
                  <div className="text-dashboard-text-secondary">Qualified</div>
                </div>

                <div className="text-center">
                  <div className="text-lg font-bold text-dashboard-text-primary">
                    {job.tokensUsed.toLocaleString()}
                  </div>
                  <div className="text-dashboard-text-secondary">Tokens</div>
                </div>

                <div className="text-center">
                  <div className="text-lg font-bold text-dashboard-text-primary">
                    {formatDuration(job.processingTimeMs)}
                  </div>
                  <div className="text-dashboard-text-secondary">Duration</div>
                </div>

                <div className="text-center">
                  <div className="text-lg font-bold text-dashboard-text-primary">
                    {job.priority}
                  </div>
                  <div className="text-dashboard-text-secondary">Priority</div>
                </div>
              </div>

              {/* Error Message */}
              {job.jobStatus === "failed" && job.errorMessage && (
                <div className="bg-red-400/10 border border-red-400/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-red-400">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm font-medium">Error</span>
                  </div>
                  <p className="text-xs text-red-300 mt-1">{job.errorMessage}</p>
                  {job.retryCount < job.maxRetries && (
                    <p className="text-xs text-red-300 mt-1">
                      Retry {job.retryCount + 1} of {job.maxRetries}
                    </p>
                  )}
                </div>
              )}

              {/* Expandable Details */}
              {expandedJob === job.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-dashboard-bg-tertiary/30 rounded-lg p-3 space-y-2"
                >
                  <h5 className="text-xs font-medium text-dashboard-text-primary">Job Details</h5>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-dashboard-text-secondary">Job ID:</span>
                      <span className="ml-2 font-mono text-dashboard-text-primary">{job.id}</span>
                    </div>
                    <div>
                      <span className="text-dashboard-text-secondary">Created:</span>
                      <span className="ml-2 text-dashboard-text-primary">
                        {new Date(job.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {job.startedAt && (
                      <div>
                        <span className="text-dashboard-text-secondary">Started:</span>
                        <span className="ml-2 text-dashboard-text-primary">
                          {new Date(job.startedAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {job.completedAt && (
                      <div>
                        <span className="text-dashboard-text-secondary">Completed:</span>
                        <span className="ml-2 text-dashboard-text-primary">
                          {new Date(job.completedAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Toggle Details Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpandedJob(expandedJob === job.id ? null : job.id)}
                className="w-full text-xs text-dashboard-text-secondary hover:text-dashboard-text-primary"
              >
                {expandedJob === job.id ? "Hide Details" : "Show Details"}
              </Button>
            </motion.div>
          ))}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

export default QualificationProgressTracker;
