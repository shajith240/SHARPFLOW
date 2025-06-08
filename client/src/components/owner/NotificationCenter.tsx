import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Bell,
  MessageSquare,
  User,
  Calendar,
  Send,
  CheckCircle,
  AlertTriangle,
  Info,
} from "lucide-react";

interface Communication {
  id: string;
  user_id: string;
  notification_id?: string;
  communication_type: string;
  direction: "inbound" | "outbound" | "internal";
  subject?: string;
  content: string;
  created_by?: string;
  created_at: string;
}

interface NotificationWithUser {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  subscriptionPlan: string;
  subscriptionId: string;
  paypalCustomerId: string;
  requiredAgents: string[];
  requiredApiKeys: string[];
  customerInfo: {
    companyName?: string;
    industry?: string;
    targetMarket?: string;
    businessSize?: string;
  };
  status: string;
  createdAt: Date;
  completedAt?: Date;
  setupTasks?: any[];
  // Legacy fields for backward compatibility
  notification_type?: string;
  user_id?: string;
  priority?: string;
  created_at?: string;
  communications?: Communication[];
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<NotificationWithUser[]>(
    []
  );
  const [selectedNotification, setSelectedNotification] =
    useState<NotificationWithUser | null>(null);
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    if (selectedNotification) {
      fetchCommunications(
        selectedNotification.userId || selectedNotification.user_id || ""
      );
    }
  }, [selectedNotification]);

  const fetchNotifications = async () => {
    try {
      const response = await fetch("/api/owner/dashboard/pending-setups");
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCommunications = async (userId: string) => {
    try {
      const response = await fetch(
        `/api/owner/dashboard/customer-communications/${userId}`
      );
      if (response.ok) {
        const data = await response.json();
        setCommunications(data);
      }
    } catch (error) {
      console.error("Error fetching communications:", error);
    }
  };

  const sendMessage = async () => {
    if (!selectedNotification || !newMessage.trim()) return;

    setSending(true);
    try {
      const response = await fetch("/api/owner/dashboard/add-note", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: selectedNotification.userId || selectedNotification.user_id,
          notificationId: selectedNotification.id,
          subject: "Owner Communication",
          content: newMessage,
          communicationType: "internal_note",
        }),
      });

      if (response.ok) {
        setNewMessage("");
        fetchCommunications(
          selectedNotification.userId || selectedNotification.user_id || ""
        );
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSending(false);
    }
  };

  const getNotificationIcon = (type?: string) => {
    switch (type) {
      case "new_subscription":
        return User;
      case "payment_failed":
        return AlertTriangle;
      case "user_feedback":
        return MessageSquare;
      default:
        return Bell;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "pending_setup":
        return "bg-red-500";
      case "api_keys_configured":
        return "bg-yellow-500";
      case "completed":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "urgent":
        return "border-red-500";
      case "high":
        return "border-yellow-500";
      case "normal":
        return "border-blue-500";
      default:
        return "border-gray-500";
    }
  };

  const getCommunicationIcon = (type: string, direction: string) => {
    if (direction === "internal") return MessageSquare;
    if (direction === "outbound") return Send;
    return Info;
  };

  if (loading) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C1FF72]"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Notifications List */}
      <div className="lg:col-span-1">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-[#C1FF72] flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications ({notifications.length})
            </CardTitle>
            <CardDescription>
              Customer notifications and communications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C1FF72]"></div>
              </div>
            ) : notifications && notifications.length > 0 ? (
              notifications.map((notification) => {
                if (!notification) return null;

                const NotificationIcon = getNotificationIcon(
                  notification.notification_type
                );

                return (
                  <div
                    key={notification.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-all hover:bg-gray-800 ${
                      selectedNotification?.id === notification.id
                        ? "border-[#C1FF72] bg-gray-800"
                        : `border-gray-700 ${getPriorityColor(
                            notification.priority
                          )}`
                    }`}
                    onClick={() => setSelectedNotification(notification)}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <NotificationIcon className="h-4 w-4 text-[#38B6FF]" />
                      <span className="font-medium text-sm">
                        {notification.notification_type?.replace("_", " ") ||
                          "New Subscription"}
                      </span>
                      <Badge
                        className={`${getStatusColor(
                          notification.status
                        )} text-white ml-auto`}
                      >
                        {notification.status?.replace("_", " ") ||
                          "Unknown Status"}
                      </Badge>
                    </div>

                    <p className="text-sm font-medium">
                      {notification.userName || "Unknown User"}
                    </p>
                    <p className="text-xs text-gray-400">
                      {notification.userEmail || "No email"}
                    </p>

                    <div className="flex items-center justify-between mt-2">
                      <Badge variant="outline" className="text-xs">
                        {notification.subscriptionPlan || "Unknown Plan"}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {notification.createdAt
                          ? new Date(
                              notification.createdAt
                            ).toLocaleDateString()
                          : notification.created_at
                          ? new Date(
                              notification.created_at
                            ).toLocaleDateString()
                          : "Unknown Date"}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Bell className="h-12 w-12 mx-auto mb-4" />
                <p>No notifications</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Communication Center */}
      <div className="lg:col-span-2">
        {selectedNotification ? (
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-[#38B6FF] flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Communications:{" "}
                {selectedNotification.userName || "Unknown User"}
              </CardTitle>
              <CardDescription>
                Communication history and notes for this customer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Communication History */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {communications.map((comm) => {
                  const CommIcon = getCommunicationIcon(
                    comm.communication_type,
                    comm.direction
                  );

                  return (
                    <div
                      key={comm.id}
                      className="p-3 border border-gray-700 rounded-lg"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <CommIcon className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium">
                          {comm.subject ||
                            comm.communication_type?.replace("_", " ") ||
                            "Communication"}
                        </span>
                        <Badge
                          variant="outline"
                          className={`ml-auto text-xs ${
                            comm.direction === "internal"
                              ? "border-blue-500 text-blue-400"
                              : comm.direction === "outbound"
                              ? "border-green-500 text-green-400"
                              : "border-gray-500 text-gray-400"
                          }`}
                        >
                          {comm.direction}
                        </Badge>
                      </div>

                      <p className="text-sm text-gray-300 mb-2">
                        {comm.content}
                      </p>

                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>By: {comm.created_by || "System"}</span>
                        <span>
                          {new Date(comm.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {communications.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4" />
                    <p>No communications yet</p>
                  </div>
                )}
              </div>

              {/* New Message */}
              <div className="space-y-3 border-t border-gray-700 pt-4">
                <h4 className="font-medium text-gray-300">
                  Add Communication Note
                </h4>
                <Textarea
                  placeholder="Add a note about this customer's setup or communication..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="bg-gray-800 border-gray-600"
                  rows={3}
                />
                <Button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sending}
                  className="bg-[#C1FF72] text-black hover:bg-[#C1FF72]/80"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {sending ? "Sending..." : "Add Note"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-semibold text-gray-400 mb-2">
                  Select a Notification
                </h3>
                <p className="text-gray-500">
                  Choose a notification to view communication history
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
