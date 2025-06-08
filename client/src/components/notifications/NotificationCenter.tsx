import React, { useState } from "react";
import {
  Bell,
  Check,
  X,
  MoreVertical,
  Trash2,
  CheckCheck,
  Trash,
  Settings,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { useNotifications } from "@/hooks/useNotifications";
import {
  getAgentDisplayName,
  getAgentIcon,
  getNotificationTypeColor,
  formatTimeAgo,
} from "@/stores/notificationStore";
import { cn } from "@/lib/utils";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { NotificationAudio } from "./NotificationAudio";
import { toast } from "@/hooks/use-toast";

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [showClearAllDialog, setShowClearAllDialog] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);

  const {
    notifications,
    unreadNotifications,
    unreadCount,
    markAsRead,
    markAsDismissed,
    markAllAsRead,
    clearAllNotifications,
    isLoading,
    isMarkingAsRead,
    isMarkingAsDismissed,
    isMarkingAllAsRead,
    isClearingAllNotifications,
  } = useNotifications();

  const handleNotificationClick = (notificationId: string, isRead: boolean) => {
    if (!isRead) {
      markAsRead(notificationId);
    }
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  const handleDismissNotification = (
    notificationId: string,
    event: React.MouseEvent
  ) => {
    event.stopPropagation();
    markAsDismissed(notificationId);
  };

  const handleClearAllNotifications = () => {
    setShowClearAllDialog(true);
  };

  const confirmClearAll = () => {
    clearAllNotifications();
    setShowClearAllDialog(false);
    setIsOpen(false);
  };

  const hasNotifications = notifications.length > 0;
  const hasUnreadNotifications = unreadCount > 0;

  return (
    <>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="relative h-9 w-9 rounded-full hover:bg-white/10 apple-transition-fast"
          >
            <Bell className="h-4 w-4 text-[#F5F5F5]" />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center bg-[#C1FF72] text-black border-0 font-medium"
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-96 p-0 bg-[#0A0A0A] border-white/20 shadow-2xl"
          align="end"
          sideOffset={8}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-[#F5F5F5] text-lg">
                Notifications
              </h3>
              {hasNotifications && (
                <Badge
                  variant="outline"
                  className="text-xs text-gray-400 border-gray-600 bg-transparent"
                >
                  {notifications.length}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1">
              {/* Audio Toggle */}
              <NotificationAudio
                enabled={audioEnabled}
                onToggle={setAudioEnabled}
                className="h-8 w-8"
              />

              {/* Actions Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-white/10 apple-transition-fast"
                  >
                    <Settings className="h-4 w-4 text-gray-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="bg-[#181818] border-white/20 min-w-[180px]"
                >
                  {hasUnreadNotifications && (
                    <DropdownMenuItem
                      onClick={handleMarkAllAsRead}
                      disabled={isMarkingAllAsRead}
                      className="text-[#F5F5F5] hover:bg-white/10 apple-transition-fast"
                    >
                      <CheckCheck className="h-4 w-4 mr-2 text-[#C1FF72]" />
                      Mark all as read
                    </DropdownMenuItem>
                  )}

                  {hasNotifications && (
                    <>
                      {hasUnreadNotifications && (
                        <DropdownMenuSeparator className="bg-white/10" />
                      )}
                      <DropdownMenuItem
                        onClick={handleClearAllNotifications}
                        disabled={isClearingAllNotifications}
                        className="text-red-400 hover:bg-red-400/10 apple-transition-fast"
                      >
                        <Trash className="h-4 w-4 mr-2" />
                        Clear all notifications
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Notification List */}
          <ScrollArea className="h-96">
            {isLoading ? (
              <div className="p-6 text-center">
                <div className="w-6 h-6 border-2 border-[#C1FF72] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-400 text-sm">
                  Loading notifications...
                </p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-[#181818] flex items-center justify-center mx-auto mb-4">
                  <Bell className="h-8 w-8 text-gray-600" />
                </div>
                <p className="text-[#F5F5F5] text-sm font-medium mb-1">
                  No notifications yet
                </p>
                <p className="text-gray-500 text-xs">
                  You'll see updates from your AI agents here
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {notifications.slice(0, 20).map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-4 hover:bg-[#181818] cursor-pointer apple-transition-fast relative group",
                      !notification.isRead &&
                        "bg-[#181818]/50 border-l-2 border-[#C1FF72]"
                    )}
                    onClick={() =>
                      handleNotificationClick(
                        notification.id,
                        notification.isRead
                      )
                    }
                  >
                    <div className="flex items-start gap-3">
                      {/* Agent Icon */}
                      <div className="flex-shrink-0 mt-0.5">
                        <div className="w-10 h-10 rounded-full bg-[#181818] flex items-center justify-center">
                          <span className="text-lg">
                            {getAgentIcon(notification.agentName)}
                          </span>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-sm font-medium text-[#F5F5F5] truncate">
                                {notification.title}
                              </p>
                              {!notification.isRead && (
                                <div className="w-2 h-2 bg-[#C1FF72] rounded-full flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                              {notification.message}
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 apple-transition-fast hover:bg-white/10 rounded-full"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreVertical className="h-3 w-3 text-gray-400" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="bg-[#181818] border-white/20"
                              >
                                {!notification.isRead && (
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      markAsRead(notification.id);
                                    }}
                                    disabled={isMarkingAsRead}
                                    className="text-[#F5F5F5] hover:bg-white/10 apple-transition-fast"
                                  >
                                    <Check className="h-3 w-3 mr-2 text-[#C1FF72]" />
                                    Mark as read
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={(e) =>
                                    handleDismissNotification(
                                      notification.id,
                                      e
                                    )
                                  }
                                  disabled={isMarkingAsDismissed}
                                  className="text-red-400 hover:bg-red-400/10 apple-transition-fast"
                                >
                                  <Trash2 className="h-3 w-3 mr-2" />
                                  Dismiss
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        {/* Metadata */}
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-2">
                            {notification.agentName && (
                              <Badge
                                variant="outline"
                                className="text-xs border-[#38B6FF]/30 text-[#38B6FF] bg-[#38B6FF]/5 font-medium"
                              >
                                {getAgentDisplayName(notification.agentName)}
                              </Badge>
                            )}
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs font-medium border-opacity-30",
                                notification.type === "job_completed" &&
                                  "border-green-400 text-green-400 bg-green-400/5",
                                notification.type === "job_failed" &&
                                  "border-red-400 text-red-400 bg-red-400/5",
                                notification.type === "job_started" &&
                                  "border-blue-400 text-blue-400 bg-blue-400/5",
                                notification.type === "system_notification" &&
                                  "border-yellow-400 text-yellow-400 bg-yellow-400/5"
                              )}
                            >
                              {notification.type.replace("_", " ")}
                            </Badge>
                          </div>

                          <span className="text-xs text-gray-500 font-medium">
                            {formatTimeAgo(notification.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          {notifications.length > 20 && (
            <div className="p-4 border-t border-white/10">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-[#38B6FF] hover:text-[#38B6FF]/80 hover:bg-[#38B6FF]/10 apple-transition-fast font-medium"
              >
                View all notifications ({notifications.length})
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Clear All Confirmation Dialog */}
      <ConfirmationDialog
        open={showClearAllDialog}
        onOpenChange={setShowClearAllDialog}
        title="Clear All Notifications"
        description="Are you sure you want to clear all notifications? This action cannot be undone and will remove all notifications from your list."
        confirmText="Clear All"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={confirmClearAll}
        loading={isClearingAllNotifications}
      />
    </>
  );
}

export default NotificationCenter;
