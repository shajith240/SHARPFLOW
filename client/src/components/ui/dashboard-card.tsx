import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface DashboardCardProps {
  title?: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
  variant?: "default" | "elevated" | "glass" | "gradient";
  size?: "sm" | "md" | "lg";
  icon?: LucideIcon;
  iconColor?: string;
  hover?: boolean;
  loading?: boolean;
  delay?: number;
}

const getCardStyles = (variant: DashboardCardProps["variant"]) => {
  switch (variant) {
    case "elevated":
      return "bg-flat-elevated border-dashboard-border-primary shadow-flat-elevated";
    case "glass":
      return "bg-flat-surface border-dashboard-border-primary/50 shadow-flat-card";
    case "gradient":
      return "bg-flat-surface border-dashboard-border-primary shadow-flat-card";
    default:
      return "bg-flat-surface border-dashboard-border-primary shadow-flat-card";
  }
};

const getSizeStyles = (size: DashboardCardProps["size"]) => {
  switch (size) {
    case "sm":
      return "p-4";
    case "lg":
      return "p-8";
    default:
      return "p-6";
  }
};

export function DashboardCard({
  title,
  description,
  children,
  className,
  variant = "default",
  size = "md",
  icon: Icon,
  iconColor,
  hover = true,
  loading = false,
  delay = 0,
  ...props
}: DashboardCardProps) {
  const cardStyles = getCardStyles(variant);
  const sizeStyles = getSizeStyles(size);

  if (loading) {
    return (
      <Card className={cn(cardStyles, "animate-pulse", className)}>
        <CardContent className={sizeStyles}>
          <div className="space-y-3">
            <div className="h-4 bg-dashboard-border-primary rounded w-3/4"></div>
            <div className="h-3 bg-dashboard-border-primary rounded w-1/2"></div>
            <div className="h-20 bg-dashboard-border-primary rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="h-full transition-all duration-200">
      <Card
        className={cn(
          cardStyles,
          "h-full transition-all duration-200 focus:outline-none focus:ring-0 focus:border-inherit",
          hover &&
            "hover:border-dashboard-primary/50 hover:shadow-flat-elevated",
          className
        )}
        {...props}
      >
        {(title || description || Icon) && (
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {title && (
                  <CardTitle className="text-apple-subtitle text-dashboard-text-primary mb-1">
                    {title}
                  </CardTitle>
                )}
                {description && (
                  <CardDescription className="text-apple-body text-dashboard-text-secondary">
                    {description}
                  </CardDescription>
                )}
              </div>
              {Icon && (
                <div
                  className={cn(
                    "p-2 rounded-lg",
                    iconColor ? `bg-${iconColor}/10` : "bg-dashboard-primary/10"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5",
                      iconColor ? `text-${iconColor}` : "text-dashboard-primary"
                    )}
                  />
                </div>
              )}
            </div>
          </CardHeader>
        )}
        <CardContent
          className={cn(title || description || Icon ? "pt-0" : "", sizeStyles)}
        >
          {children}
        </CardContent>
      </Card>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: "increase" | "decrease";
    period?: string;
  };
  icon?: LucideIcon;
  iconColor?: string;
  className?: string;
  delay?: number;
}

export function MetricCard({
  title,
  value,
  change,
  icon: Icon,
  iconColor,
  className,
  delay = 0,
}: MetricCardProps) {
  return (
    <DashboardCard
      variant="default"
      hover={true}
      delay={delay}
      className={className}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-apple-caption text-dashboard-text-secondary mb-1">
            {title}
          </p>
          <p className="text-apple-title text-dashboard-text-primary mb-2">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          {change && (
            <div className="flex items-center space-x-1">
              <span
                className={cn(
                  "text-xs font-medium",
                  change.type === "increase"
                    ? "text-dashboard-status-success"
                    : "text-dashboard-status-error"
                )}
              >
                {change.type === "increase" ? "+" : "-"}
                {Math.abs(change.value)}%
              </span>
              {change.period && (
                <span className="text-dashboard-text-muted text-xs">
                  {change.period}
                </span>
              )}
            </div>
          )}
        </div>
        {Icon && (
          <div
            className={cn(
              "p-3 rounded-lg",
              iconColor ? `bg-${iconColor}/10` : "bg-dashboard-primary/10"
            )}
          >
            <Icon
              className={cn(
                "h-6 w-6",
                iconColor ? `text-${iconColor}` : "text-dashboard-primary"
              )}
            />
          </div>
        )}
      </div>
    </DashboardCard>
  );
}

interface StatusCardProps {
  title: string;
  status: "online" | "offline" | "warning" | "error";
  description?: string;
  lastUpdate?: string;
  className?: string;
  delay?: number;
}

export function StatusCard({
  title,
  status,
  description,
  lastUpdate,
  className,
  delay = 0,
}: StatusCardProps) {
  const getStatusColor = (status: StatusCardProps["status"]) => {
    switch (status) {
      case "online":
        return "text-dashboard-status-success";
      case "warning":
        return "text-dashboard-status-warning";
      case "error":
        return "text-dashboard-status-error";
      default:
        return "text-dashboard-text-muted";
    }
  };

  const getStatusBg = (status: StatusCardProps["status"]) => {
    switch (status) {
      case "online":
        return "bg-dashboard-status-success/10";
      case "warning":
        return "bg-dashboard-status-warning/10";
      case "error":
        return "bg-dashboard-status-error/10";
      default:
        return "bg-dashboard-text-muted/10";
    }
  };

  return (
    <DashboardCard
      variant="glass"
      hover={true}
      delay={delay}
      className={className}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-dashboard-text-primary font-semibold">{title}</h3>
        <div
          className={cn(
            "px-2 py-1 rounded-full text-xs font-medium",
            getStatusBg(status),
            getStatusColor(status)
          )}
        >
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </div>
      </div>
      {description && (
        <p className="text-dashboard-text-secondary text-sm mb-2">
          {description}
        </p>
      )}
      {lastUpdate && (
        <p className="text-dashboard-text-muted text-xs">
          Last updated: {lastUpdate}
        </p>
      )}
    </DashboardCard>
  );
}
