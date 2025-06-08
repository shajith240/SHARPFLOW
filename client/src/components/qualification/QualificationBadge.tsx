import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Star, AlertCircle, CheckCircle, Clock } from "lucide-react";

interface QualificationBadgeProps {
  rating?: "high" | "medium" | "low";
  score?: number;
  autoQualified?: boolean;
  className?: string;
  showScore?: boolean;
  size?: "sm" | "md" | "lg";
}

export function QualificationBadge({
  rating,
  score,
  autoQualified = false,
  className,
  showScore = false,
  size = "md",
}: QualificationBadgeProps) {
  // If no rating, show unqualified state
  if (!rating) {
    return (
      <Badge
        variant="outline"
        className={cn(
          "border-dashboard-border-primary text-dashboard-text-muted bg-dashboard-bg-tertiary/30",
          size === "sm" && "text-xs px-2 py-0.5",
          size === "md" && "text-sm px-2.5 py-1",
          size === "lg" && "text-base px-3 py-1.5",
          className
        )}
      >
        <Clock className="w-3 h-3 mr-1" />
        Unqualified
      </Badge>
    );
  }

  const getBadgeStyles = () => {
    switch (rating) {
      case "high":
        return {
          className:
            "border-[#C1FF72]/60 text-[#C1FF72] bg-[#C1FF72]/15 hover:bg-[#C1FF72]/25 shadow-[0_0_8px_rgba(193,255,114,0.2)]",
          icon: <Star className="w-3 h-3 mr-1 fill-current" />,
          label: "High Quality",
        };
      case "medium":
        return {
          className:
            "border-[#38B6FF]/60 text-[#38B6FF] bg-[#38B6FF]/15 hover:bg-[#38B6FF]/25 shadow-[0_0_8px_rgba(56,182,255,0.2)]",
          icon: <CheckCircle className="w-3 h-3 mr-1" />,
          label: "Medium Quality",
        };
      case "low":
        return {
          className:
            "border-yellow-400/60 text-yellow-400 bg-yellow-400/15 hover:bg-yellow-400/25 shadow-[0_0_8px_rgba(250,204,21,0.2)]",
          icon: <AlertCircle className="w-3 h-3 mr-1" />,
          label: "Low Quality",
        };
      default:
        return {
          className:
            "border-dashboard-border-primary text-dashboard-text-muted bg-dashboard-bg-tertiary/30",
          icon: <Clock className="w-3 h-3 mr-1" />,
          label: "Unqualified",
        };
    }
  };

  const badgeStyles = getBadgeStyles();

  return (
    <div className="flex items-center gap-2">
      <Badge
        variant="outline"
        className={cn(
          badgeStyles.className,
          "transition-all duration-200 apple-transition-fast",
          size === "sm" && "text-xs px-2 py-0.5",
          size === "md" && "text-sm px-2.5 py-1",
          size === "lg" && "text-base px-3 py-1.5",
          className
        )}
      >
        {badgeStyles.icon}
        {size === "sm" ? rating?.toUpperCase() : badgeStyles.label}
      </Badge>

      {showScore && score !== undefined && (
        <Badge
          variant="outline"
          className={cn(
            "border-dashboard-border-primary text-dashboard-text-secondary bg-dashboard-bg-secondary/50",
            size === "sm" && "text-xs px-1.5 py-0.5",
            size === "md" && "text-sm px-2 py-0.5",
            size === "lg" && "text-base px-2.5 py-1"
          )}
        >
          {score}/100
        </Badge>
      )}

      {autoQualified && (
        <Badge
          variant="outline"
          className={cn(
            "border-purple-400/50 text-purple-400 bg-purple-400/10",
            size === "sm" && "text-xs px-1.5 py-0.5",
            size === "md" && "text-sm px-2 py-0.5",
            size === "lg" && "text-base px-2.5 py-1"
          )}
        >
          AI
        </Badge>
      )}
    </div>
  );
}

// Qualification Score Indicator Component
interface QualificationScoreProps {
  score: number;
  className?: string;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

export function QualificationScore({
  score,
  className,
  showLabel = true,
  size = "md",
}: QualificationScoreProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-[#C1FF72]";
    if (score >= 60) return "text-[#38B6FF]";
    if (score >= 40) return "text-yellow-400";
    return "text-red-400";
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return "bg-[#C1FF72]/10";
    if (score >= 60) return "bg-[#38B6FF]/10";
    if (score >= 40) return "bg-yellow-400/10";
    return "bg-red-400/10";
  };

  const sizeClasses = {
    sm: "text-xs px-2 py-1",
    md: "text-sm px-3 py-1.5",
    lg: "text-base px-4 py-2",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border transition-all duration-200",
        getScoreColor(score),
        getScoreBg(score),
        "border-current/20",
        sizeClasses[size],
        className
      )}
    >
      <div className="flex items-center gap-1.5">
        <div
          className={cn(
            "w-2 h-2 rounded-full",
            score >= 80 && "bg-[#C1FF72]",
            score >= 60 && score < 80 && "bg-[#38B6FF]",
            score >= 40 && score < 60 && "bg-yellow-400",
            score < 40 && "bg-red-400"
          )}
        />
        <span className="font-medium">{score}</span>
        {showLabel && <span className="text-xs opacity-75">/100</span>}
      </div>
    </div>
  );
}

export default QualificationBadge;
