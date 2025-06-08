import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User,
  Building,
  Mail,
  Calendar,
  Key,
  CheckCircle,
  Clock,
  AlertTriangle,
  ExternalLink,
  MessageSquare,
  Save,
} from "lucide-react";

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

interface PendingSetupsProps {
  setups: OwnerNotification[];
  onSetupComplete: (notificationId: string) => void;
  onRefresh: () => void;
}

export function PendingSetups({
  setups,
  onSetupComplete,
  onRefresh,
}: PendingSetupsProps) {
  const [selectedSetup, setSelectedSetup] = useState<OwnerNotification | null>(
    null
  );

  // Update selectedSetup when setups change to maintain reference
  React.useEffect(() => {
    if (selectedSetup) {
      const updatedSetup = setups.find(
        (setup) => setup.id === selectedSetup.id
      );
      if (updatedSetup && updatedSetup !== selectedSetup) {
        setSelectedSetup(updatedSetup);
      }
    }
  }, [setups, selectedSetup]);
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleConfigureApiKeys = async (agentName: string, taskId: string) => {
    if (!selectedSetup) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/owner/dashboard/update-api-keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: selectedSetup.userId,
          agentName,
          apiKeys,
          taskId,
        }),
      });

      if (response.ok) {
        setSuccess(`API keys configured successfully for ${agentName} agent`);
        setApiKeys({});
        onRefresh();
      } else {
        const errorData = await response.json();
        setError(errorData.message || "Failed to configure API keys");
      }
    } catch (err) {
      setError("Network error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleActivateUser = async (userId: string, notificationId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/owner/dashboard/activate-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          notificationId,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setSuccess(`User account activated successfully! Welcome email sent.`);
        onRefresh(); // Refresh the pending setups list
      } else {
        const errorData = await response.json();
        setError(errorData.message || "Failed to activate user account");
      }
    } catch (err) {
      setError("Network error occurred while activating user");
    } finally {
      setLoading(false);
    }
  };

  // Removed handleActivateCustomer - using manual workflow only

  const handleAddNote = async () => {
    if (!selectedSetup || !notes.trim()) return;

    try {
      const response = await fetch("/api/owner/dashboard/add-note", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: selectedSetup.userId,
          notificationId: selectedSetup.id,
          subject: "Setup Progress Note",
          content: notes,
          communicationType: "internal_note",
        }),
      });

      if (response.ok) {
        setSuccess("Note added successfully");
        setNotes("");
        onRefresh();
      }
    } catch (err) {
      console.error("Error adding note:", err);
    }
  };

  const getAgentApiKeys = (agentName: string) => {
    switch (agentName.toLowerCase()) {
      case "falcon":
        return ["openai_api_key", "apollo_api_key", "apify_api_key"];
      case "sage":
        return ["openai_api_key", "apify_api_key", "perplexity_api_key"];
      case "sentinel":
        return [
          "openai_api_key",
          "gmail_client_id",
          "gmail_client_secret",
          "gmail_refresh_token",
        ];
      default:
        return ["openai_api_key"];
    }
  };

  const getApiKeyLabel = (keyName: string) => {
    const labels = {
      openai_api_key: "OpenAI API Key",
      apollo_api_key: "Apollo.io API Key",
      apify_api_key: "Apify API Key",
      perplexity_api_key: "Perplexity API Key",
      gmail_client_id: "Gmail Client ID",
      gmail_client_secret: "Gmail Client Secret",
      gmail_refresh_token: "Gmail Refresh Token",
    };
    return labels[keyName as keyof typeof labels] || keyName.replace("_", " ");
  };

  // Check if API keys are actually configured (not test placeholders)
  const hasValidApiKeys = (task: any) => {
    console.log(`🔍 Checking API keys for ${task.agent_name}:`, {
      api_keys_configured: task.api_keys_configured,
      status: task.status,
    });

    if (
      !task.api_keys_configured ||
      Object.keys(task.api_keys_configured).length === 0
    ) {
      console.log(`❌ ${task.agent_name}: No API keys configured`);
      return false;
    }

    // Check if any API keys are test placeholders or empty
    const requiredKeys = getAgentApiKeys(task.agent_name);
    const configuredKeys = task.api_keys_configured;

    console.log(`🔑 ${task.agent_name} required keys:`, requiredKeys);
    console.log(
      `🔑 ${task.agent_name} configured keys:`,
      Object.keys(configuredKeys)
    );

    for (const keyName of requiredKeys) {
      const keyValue = configuredKeys[keyName];

      // Safe string handling for logging
      const safeKeyValue =
        keyValue && typeof keyValue === "string"
          ? keyValue.substring(0, 20) + "..."
          : String(keyValue || "null");

      console.log(`  - ${keyName}: ${safeKeyValue}`);

      // Consider key invalid if:
      // - Missing or empty
      // - Not a string
      // - Contains "test-encrypted:" prefix (placeholder)
      // - Is just whitespace
      if (
        !keyValue ||
        typeof keyValue !== "string" ||
        keyValue.trim() === "" ||
        keyValue.startsWith("test-encrypted:") ||
        keyValue === "null" ||
        keyValue === "undefined"
      ) {
        console.log(`❌ ${task.agent_name}: Invalid key ${keyName}`);
        return false;
      }
    }

    console.log(`✅ ${task.agent_name}: All keys valid`);
    return true;
  };

  // Get the actual status considering API key validity
  const getActualTaskStatus = (task: any) => {
    if (task.status === "completed" && hasValidApiKeys(task)) {
      return "completed";
    }
    return "pending";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending_setup":
        return "bg-red-500";
      case "api_keys_configured":
        return "bg-yellow-500";
      case "agents_activated":
        return "bg-blue-500";
      case "completed":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const getPriorityColor = (priority: string) => {
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

  if (setups.length === 0) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
            <h3 className="text-xl font-semibold text-green-400 mb-2">
              All Setups Complete! 🎉
            </h3>
            <p className="text-gray-400">
              No pending customer setups. Great job keeping up with the premium
              service!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Setup List */}
      <div className="lg:col-span-1">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-[#C1FF72] flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Setups ({setups.length})
            </CardTitle>
            <CardDescription>
              Click on a customer to configure their setup
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {setups.map((setup) => (
              <div
                key={setup.id}
                className={`p-4 border rounded-lg cursor-pointer transition-all hover:bg-gray-800 ${
                  selectedSetup?.id === setup.id
                    ? "border-[#C1FF72] bg-gray-800"
                    : `border-gray-700 ${getPriorityColor(setup.priority)}`
                }`}
                onClick={() => setSelectedSetup(setup)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">
                    {setup.userName || "Unknown User"}
                  </h4>
                  <Badge
                    className={`${getStatusColor(setup.status)} text-white`}
                  >
                    {setup.status?.replace("_", " ") || "Unknown Status"}
                  </Badge>
                </div>

                <p className="text-sm text-gray-400 mb-2">
                  {setup.userEmail || "No email"}
                </p>

                <div className="flex items-center justify-between">
                  <Badge variant="outline">
                    {setup.subscriptionPlan || "Unknown Plan"}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {setup.createdAt
                      ? new Date(setup.createdAt).toLocaleDateString()
                      : "Unknown Date"}
                  </span>
                </div>

                {setup.customerInfo?.companyName && (
                  <p className="text-xs text-gray-500 mt-1">
                    {setup.customerInfo.companyName}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Setup Details */}
      <div className="lg:col-span-2">
        {selectedSetup ? (
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-[#38B6FF] flex items-center gap-2">
                <User className="h-5 w-5" />
                Setup: {selectedSetup.userName || "Unknown User"}
              </CardTitle>
              <CardDescription>
                Configure API keys and activate customer agents
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert className="mb-4 border-red-800 bg-red-900/20">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-red-400">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="mb-4 border-green-800 bg-green-900/20">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription className="text-green-400">
                    {success}
                  </AlertDescription>
                </Alert>
              )}

              <Tabs defaultValue="customer-info" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-gray-800">
                  <TabsTrigger value="customer-info">Customer Info</TabsTrigger>
                  <TabsTrigger value="api-keys">API Keys</TabsTrigger>
                  <TabsTrigger value="notes">Notes</TabsTrigger>
                </TabsList>

                <TabsContent value="customer-info" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-400">Customer Details</Label>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span>
                            {selectedSetup.userName || "Unknown User"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span>{selectedSetup.userEmail || "No email"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span>
                            {selectedSetup.createdAt
                              ? new Date(
                                  selectedSetup.createdAt
                                ).toLocaleString()
                              : "Unknown Date"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-400">
                        Business Information
                      </Label>
                      <div className="space-y-2">
                        {selectedSetup.customerInfo?.companyName && (
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-gray-400" />
                            <span>
                              {selectedSetup.customerInfo.companyName}
                            </span>
                          </div>
                        )}
                        {selectedSetup.customerInfo?.industry && (
                          <p className="text-sm text-gray-400">
                            Industry: {selectedSetup.customerInfo.industry}
                          </p>
                        )}
                        {selectedSetup.customerInfo?.businessSize && (
                          <p className="text-sm text-gray-400">
                            Size: {selectedSetup.customerInfo.businessSize}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-400">
                      Subscription Details
                    </Label>
                    <div className="flex items-center gap-4">
                      <Badge className="bg-[#C1FF72] text-black">
                        {selectedSetup.subscriptionPlan || "Unknown Plan"}
                      </Badge>
                      <span className="text-sm text-gray-400">
                        PayPal ID: {selectedSetup.paypalCustomerId || "N/A"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-400">Required Agents</Label>
                    <div className="flex flex-wrap gap-2">
                      {selectedSetup.requiredAgents?.map((agent) => (
                        <Badge key={agent} variant="outline">
                          {agent}
                        </Badge>
                      )) || (
                        <span className="text-gray-500">
                          No agents specified
                        </span>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="api-keys" className="space-y-4">
                  {selectedSetup.setupTasks &&
                  selectedSetup.setupTasks.length > 0 ? (
                    selectedSetup.setupTasks.map((task) => (
                      <Card
                        key={task.id}
                        className="bg-gray-800 border-gray-700"
                      >
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center justify-between">
                            <span className="capitalize">
                              {task.agent_name} Agent
                            </span>
                            <Badge
                              className={
                                getActualTaskStatus(task) === "completed"
                                  ? "bg-green-500"
                                  : "bg-yellow-500"
                              }
                            >
                              {getActualTaskStatus(task) === "completed"
                                ? "Completed"
                                : "Pending"}
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {getAgentApiKeys(task.agent_name).map((keyName) => {
                            const currentValue =
                              task.api_keys_configured?.[keyName] || "";
                            const isTestKey =
                              typeof currentValue === "string" &&
                              currentValue.startsWith("test-encrypted:");
                            const displayValue = isTestKey ? "" : currentValue;

                            return (
                              <div key={keyName} className="space-y-2">
                                <Label className="text-sm text-gray-400 flex items-center justify-between">
                                  <span>{getApiKeyLabel(keyName)}</span>
                                  {currentValue && !isTestKey && (
                                    <span className="text-xs text-green-400">
                                      ✓ Configured
                                    </span>
                                  )}
                                  {isTestKey && (
                                    <span className="text-xs text-yellow-400">
                                      ⚠ Test Key
                                    </span>
                                  )}
                                </Label>
                                <div className="relative">
                                  <Input
                                    type="password"
                                    placeholder={
                                      currentValue && !isTestKey
                                        ? "••••••••••••••••"
                                        : `Enter ${getApiKeyLabel(keyName)}`
                                    }
                                    value={apiKeys[keyName] || ""}
                                    onChange={(e) =>
                                      setApiKeys((prev) => ({
                                        ...prev,
                                        [keyName]: e.target.value,
                                      }))
                                    }
                                    className="bg-gray-700 border-gray-600 text-white pr-20"
                                  />
                                  {currentValue && !isTestKey && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setApiKeys((prev) => ({
                                          ...prev,
                                          [keyName]: displayValue,
                                        }))
                                      }
                                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-blue-400 hover:text-blue-300"
                                    >
                                      Edit
                                    </button>
                                  )}
                                </div>
                                {currentValue &&
                                  !isTestKey &&
                                  typeof currentValue === "string" && (
                                    <p className="text-xs text-gray-500">
                                      Current: {currentValue.substring(0, 20)}
                                      ...
                                    </p>
                                  )}
                              </div>
                            );
                          })}

                          <div className="space-y-2">
                            <Button
                              onClick={() =>
                                handleConfigureApiKeys(task.agent_name, task.id)
                              }
                              disabled={loading}
                              className="w-full bg-[#C1FF72] text-black hover:bg-[#C1FF72]/80"
                            >
                              <Key className="h-4 w-4 mr-2" />
                              {getActualTaskStatus(task) === "completed"
                                ? "Update Keys"
                                : "Configure Keys"}
                            </Button>

                            {/* Show Activate User button if all tasks are completed */}
                            {selectedSetup &&
                              selectedSetup.setupTasks?.every(
                                (t) => getActualTaskStatus(t) === "completed"
                              ) && (
                                <Button
                                  onClick={() =>
                                    handleActivateUser(
                                      selectedSetup.userId,
                                      selectedSetup.id
                                    )
                                  }
                                  disabled={loading}
                                  className="w-full bg-green-600 text-white hover:bg-green-700"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Activate User Account
                                </Button>
                              )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <Card className="bg-gray-800 border-gray-700">
                      <CardContent className="pt-6">
                        <div className="text-center py-8">
                          <Key className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                          <h3 className="text-lg font-semibold text-gray-400 mb-2">
                            No Setup Tasks Found
                          </h3>
                          <p className="text-gray-500">
                            This customer doesn't have any setup tasks
                            configured yet.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {(() => {
                    // Only show completion message if there are tasks AND all are completed
                    const hasTasks =
                      selectedSetup.setupTasks &&
                      selectedSetup.setupTasks.length > 0;
                    const allCompleted =
                      hasTasks &&
                      selectedSetup.setupTasks.every(
                        (task) => getActualTaskStatus(task) === "completed"
                      );
                    console.log("🎯 All tasks completed check:");
                    console.log("   hasTasks:", hasTasks);
                    console.log("   allCompleted:", allCompleted);
                    console.log(
                      "   tasks:",
                      selectedSetup.setupTasks?.map((task) => ({
                        agent: task.agent_name,
                        dbStatus: task.status,
                        actualStatus: getActualTaskStatus(task),
                        hasKeys:
                          Object.keys(task.api_keys_configured || {}).length >
                          0,
                        apiKeys: task.api_keys_configured,
                      }))
                    );
                    console.log(
                      "   Will show completion message:",
                      allCompleted
                    );
                    return allCompleted;
                  })() && (
                    <Card className="bg-green-900/20 border-green-800">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                          <h3 className="text-lg font-semibold text-green-400 mb-2">
                            All API Keys Configured!
                          </h3>
                          <p className="text-gray-400 mb-4">
                            Customer setup is complete. API keys have been
                            configured for all agents.
                          </p>
                          <div className="space-y-2">
                            <p
                              key="falcon-status"
                              className="text-sm text-gray-500"
                            >
                              ✅ Falcon Agent: Lead Generation Ready
                            </p>
                            <p
                              key="sage-status"
                              className="text-sm text-gray-500"
                            >
                              ✅ Sage Agent: Research Ready
                            </p>
                            <p
                              key="sentinel-status"
                              className="text-sm text-gray-500"
                            >
                              ✅ Sentinel Agent: Email/Calendar Ready
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="notes" className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-gray-400">Add Setup Note</Label>
                    <Textarea
                      placeholder="Add notes about this customer's setup process..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="bg-gray-700 border-gray-600"
                      rows={4}
                    />
                    <Button
                      onClick={handleAddNote}
                      disabled={!notes.trim()}
                      variant="outline"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Add Note
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <User className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-semibold text-gray-400 mb-2">
                  Select a Customer
                </h3>
                <p className="text-gray-500">
                  Choose a customer from the list to configure their setup
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
