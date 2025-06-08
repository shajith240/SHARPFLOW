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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Bell,
  Users,
  Clock,
  CheckCircle,
  AlertTriangle,
  Settings,
  MessageSquare,
  Key,
  Activity,
} from "lucide-react";
import { PendingSetups } from "./PendingSetups";
import { CustomerList } from "./CustomerList";
import { DashboardStats } from "./DashboardStats";
import { NotificationCenter } from "./NotificationCenter";

interface DashboardSummary {
  pending_setups: number;
  todays_subscriptions: number;
  weekly_completions: number;
  avg_setup_time_hours: number;
  overdue_setups: number;
}

interface OwnerNotification {
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
  setupTasks?: SetupTask[];
}

interface SetupTask {
  id: string;
  agent_name: string;
  task_type: string;
  status: string;
  api_keys_required: string[];
  api_keys_configured: Record<string, boolean>;
  notes?: string;
  completed_by?: string;
  completed_at?: string;
}

export function OwnerDashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [pendingSetups, setPendingSetups] = useState<OwnerNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(
    null
  );

  // Auto-refresh every 30 seconds
  useEffect(() => {
    fetchDashboardData();

    const interval = setInterval(() => {
      fetchDashboardData();
    }, 30000);

    setRefreshInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Add cache-busting timestamp to ensure fresh data
      const timestamp = Date.now();

      // Fetch dashboard summary
      const summaryResponse = await fetch(
        `/api/owner/dashboard/summary?t=${timestamp}`,
        {
          cache: "no-cache",
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        }
      );
      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        setSummary(summaryData);
      }

      // Fetch pending setups
      const setupsResponse = await fetch(
        `/api/owner/dashboard/pending-setups?t=${timestamp}`,
        {
          cache: "no-cache",
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        }
      );
      if (setupsResponse.ok) {
        const setupsData = await setupsResponse.json();
        console.log("🔍 Raw API Response - Pending Setups:", setupsData);

        // Debug each setup
        setupsData.forEach((setup: any, index: number) => {
          console.log(`📋 Setup ${index + 1} (${setup.userEmail}):`, {
            setupTasks: setup.setupTasks?.map((task: any) => ({
              agent: task.agent_name,
              status: task.status,
              apiKeysCount: Object.keys(task.api_keys_configured || {}).length,
              apiKeys: task.api_keys_configured,
            })),
          });
        });

        setPendingSetups(setupsData);
      }

      setLoading(false);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError("Failed to load dashboard data");
      setLoading(false);
    }
  };

  const handleSetupComplete = (notificationId: string) => {
    // Refresh data after setup completion
    fetchDashboardData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#C1FF72]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-[95vw] xl:max-w-[90vw] 2xl:max-w-[85vw] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#C1FF72] to-[#38B6FF] bg-clip-text text-transparent">
              SharpFlow Owner Dashboard
            </h1>
            <p className="text-gray-400 mt-2">
              Manage customer setups and monitor your premium AI service
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Notification Bell */}
            <div className="relative">
              <Bell className="h-6 w-6 text-gray-400 hover:text-[#C1FF72] cursor-pointer" />
              {summary && summary.pending_setups > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                >
                  {summary.pending_setups}
                </Badge>
              )}
            </div>

            {/* Auto-refresh indicator */}
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Activity className="h-4 w-4" />
              <span>Auto-refresh: 30s</span>
            </div>
          </div>
        </div>

        {/* Dashboard Stats */}
        {summary && <DashboardStats summary={summary} />}

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-8">
          <TabsList className="grid w-full grid-cols-4 bg-gray-900">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-[#C1FF72] data-[state=active]:text-black"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="pending"
              className="data-[state=active]:bg-[#C1FF72] data-[state=active]:text-black"
            >
              Pending Setups ({summary?.pending_setups || 0})
            </TabsTrigger>
            <TabsTrigger
              value="customers"
              className="data-[state=active]:bg-[#C1FF72] data-[state=active]:text-black"
            >
              All Customers
            </TabsTrigger>
            <TabsTrigger
              value="notifications"
              className="data-[state=active]:bg-[#C1FF72] data-[state=active]:text-black"
            >
              Notifications
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Pending Setups */}
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-[#C1FF72] flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Recent Pending Setups
                  </CardTitle>
                  <CardDescription>
                    Latest customers waiting for setup
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C1FF72]"></div>
                    </div>
                  ) : pendingSetups && pendingSetups.length > 0 ? (
                    pendingSetups.slice(0, 3).map((setup) =>
                      setup ? (
                        <div
                          key={setup.id}
                          className="flex items-center justify-between p-3 border border-gray-800 rounded-lg mb-3"
                        >
                          <div>
                            <p className="font-medium">
                              {setup.userName || "Unknown User"}
                            </p>
                            <p className="text-sm text-gray-400">
                              {setup.userEmail || "No email"}
                            </p>
                            <Badge variant="outline" className="mt-1">
                              {setup.subscriptionPlan || "Unknown Plan"}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <Badge
                              variant={
                                setup.status === "pending_setup"
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {setup.status?.replace("_", " ") ||
                                "Unknown Status"}
                            </Badge>
                            <p className="text-xs text-gray-400 mt-1">
                              {setup.createdAt
                                ? new Date(setup.createdAt).toLocaleDateString()
                                : "Unknown Date"}
                            </p>
                          </div>
                        </div>
                      ) : null
                    )
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                      <p>All setups completed! 🎉</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-[#38B6FF] flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Quick Actions
                  </CardTitle>
                  <CardDescription>Common owner tasks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setActiveTab("pending")}
                  >
                    <Key className="h-4 w-4 mr-2" />
                    Configure Customer API Keys
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setActiveTab("customers")}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    View All Customers
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setActiveTab("notifications")}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Communication Center
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() =>
                      window.open("/api/owner/dashboard/export", "_blank")
                    }
                  >
                    <Activity className="h-4 w-4 mr-2" />
                    Export Customer Data
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="pending" className="mt-6">
            <PendingSetups
              setups={pendingSetups}
              onSetupComplete={handleSetupComplete}
              onRefresh={fetchDashboardData}
            />
          </TabsContent>

          <TabsContent value="customers" className="mt-6">
            <CustomerList />
          </TabsContent>

          <TabsContent value="notifications" className="mt-6">
            <NotificationCenter />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
