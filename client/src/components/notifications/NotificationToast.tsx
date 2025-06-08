import React from "react";
import { CheckCircle, XCircle, AlertCircle, Info, Zap } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Notification } from "@/stores/notificationStore";
import {
  getAgentDisplayName,
  getAgentIcon,
} from "@/stores/notificationStore";

interface NotificationToastProps {
  notification: Notification;
  onDismiss?: () => void;
}

export function NotificationToast({ notification, onDismiss }: NotificationToastProps) {
  const getIcon = () => {
    switch (notification.type) {
      case "job_completed":
        return <CheckCircle className="h-5 w-5 text-green-400" />;
      case "job_failed":
        return <XCircle className="h-5 w-5 text-red-400" />;
      case "job_started":
        return <Zap className="h-5 w-5 text-blue-400" />;
      case "system_notification":
        return <Info className="h-5 w-5 text-yellow-400" />;
      case "maintenance_notification":
        return <AlertCircle className="h-5 w-5 text-orange-400" />;
      default:
        return <Info className="h-5 w-5 text-gray-400" />;
    }
  };

  const getVariant = () => {
    switch (notification.type) {
      case "job_failed":
        return "destructive";
      default:
        return "default";
    }
  };

  return (
    <div className="flex items-start gap-3 p-4">
      <div className="flex-shrink-0 mt-0.5">
        {notification.agentName ? (
          <span className="text-lg">{getAgentIcon(notification.agentName)}</span>
        ) : (
          getIcon()
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="text-sm font-semibold text-white">
            {notification.title}
          </h4>
          {notification.agentName && (
            <span className="text-xs text-[#C1FF72] bg-[#C1FF72]/10 px-2 py-0.5 rounded-full">
              {getAgentDisplayName(notification.agentName)}
            </span>
          )}
        </div>
        
        <p className="text-sm text-gray-300 leading-relaxed">
          {notification.message}
        </p>
        
        {notification.metadata?.result && (
          <div className="mt-2 text-xs text-gray-400">
            <span className="font-medium">Result:</span>{" "}
            {typeof notification.metadata.result === "string"
              ? notification.metadata.result
              : "Task completed successfully"}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Helper function to show notification toasts
 */
export function showNotificationToast(notification: Notification) {
  const getToastVariant = () => {
    switch (notification.type) {
      case "job_failed":
        return "destructive";
      default:
        return "default";
    }
  };

  const getDuration = () => {
    switch (notification.type) {
      case "job_completed":
        return 6000; // Show success notifications longer
      case "job_failed":
        return 8000; // Show error notifications even longer
      default:
        return 5000;
    }
  };

  toast({
    title: (
      <div className="flex items-center gap-2">
        <span className="text-base">
          {notification.agentName ? getAgentIcon(notification.agentName) : "🔔"}
        </span>
        <span>{notification.title}</span>
        {notification.agentName && (
          <span className="text-xs text-[#C1FF72] bg-[#C1FF72]/10 px-2 py-0.5 rounded-full ml-auto">
            {getAgentDisplayName(notification.agentName)}
          </span>
        )}
      </div>
    ),
    description: notification.message,
    variant: getToastVariant(),
    duration: getDuration(),
    className: cn(
      "border-white/20 bg-black/95 backdrop-blur-sm",
      notification.type === "job_completed" && "border-green-400/30",
      notification.type === "job_failed" && "border-red-400/30",
      notification.type === "job_started" && "border-blue-400/30"
    ),
  });
}

/**
 * Enhanced toast variants for different notification types
 */
export const notificationToastVariants = {
  success: {
    className: "border-green-400/30 bg-green-400/5",
    icon: <CheckCircle className="h-4 w-4 text-green-400" />,
  },
  error: {
    className: "border-red-400/30 bg-red-400/5",
    icon: <XCircle className="h-4 w-4 text-red-400" />,
  },
  info: {
    className: "border-blue-400/30 bg-blue-400/5",
    icon: <Info className="h-4 w-4 text-blue-400" />,
  },
  warning: {
    className: "border-yellow-400/30 bg-yellow-400/5",
    icon: <AlertCircle className="h-4 w-4 text-yellow-400" />,
  },
};

export default NotificationToast;
