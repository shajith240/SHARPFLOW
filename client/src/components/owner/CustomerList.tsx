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
import { Input } from "@/components/ui/input";
import {
  Users,
  Search,
  Mail,
  Calendar,
  Building,
  CheckCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";

interface Customer {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  subscription_plan: string;
  subscription_status: string;
  activation_status: string;
  created_at: string;
  user_agent_configs: Array<{
    agent_name: string;
    is_enabled: boolean;
  }>;
  owner_notifications: Array<{
    id: string;
    status: string;
    created_at: string;
  }>;
}

export function CustomerList() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await fetch("/api/owner/dashboard/customers");
      if (response.ok) {
        const data = await response.json();
        setCustomers(data);
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch =
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${customer.first_name} ${customer.last_name}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesFilter =
      filterStatus === "all" || customer.subscription_status === filterStatus;

    return matchesSearch && matchesFilter;
  });

  const getSetupStatus = (customer: Customer) => {
    // Check activation status first - this is the most important indicator
    if (customer.activation_status === "active") return "completed";

    const latestNotification = customer.owner_notifications[0];
    if (!latestNotification) return "pending_setup";
    return latestNotification.status;
  };

  const getStatusColor = (status: string) => {
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending_setup":
        return AlertTriangle;
      case "api_keys_configured":
        return Clock;
      case "completed":
        return CheckCircle;
      default:
        return Clock;
    }
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
    <div className="space-y-6">
      {/* Header and Filters */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-[#C1FF72] flex items-center gap-2">
            <Users className="h-5 w-5" />
            All Customers ({customers.length})
          </CardTitle>
          <CardDescription>
            Manage all your SharpFlow customers and their setup status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search customers by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-800 border-gray-700"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterStatus === "all" ? "default" : "outline"}
                onClick={() => setFilterStatus("all")}
                size="sm"
              >
                All
              </Button>
              <Button
                variant={filterStatus === "active" ? "default" : "outline"}
                onClick={() => setFilterStatus("active")}
                size="sm"
              >
                Active
              </Button>
              <Button
                variant={filterStatus === "inactive" ? "default" : "outline"}
                onClick={() => setFilterStatus("inactive")}
                size="sm"
              >
                Inactive
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customer List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCustomers.map((customer) => {
          const setupStatus = getSetupStatus(customer);
          const StatusIcon = getStatusIcon(setupStatus);

          return (
            <Card
              key={customer.id}
              className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-colors"
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {customer.first_name} {customer.last_name}
                  </CardTitle>
                  <Badge
                    className={`${getStatusColor(setupStatus)} text-white`}
                  >
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {setupStatus.replace("_", " ")}
                  </Badge>
                </div>
                <CardDescription className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {customer.email}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Subscription Info */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Plan:</span>
                    <Badge variant="outline" className="capitalize">
                      {customer.subscription_plan.replace("_", " ")}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Status:</span>
                    <Badge
                      variant={
                        customer.subscription_status === "active"
                          ? "default"
                          : "secondary"
                      }
                      className={
                        customer.subscription_status === "active"
                          ? "bg-green-600"
                          : ""
                      }
                    >
                      {customer.subscription_status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Activation:</span>
                    <Badge
                      variant={
                        customer.activation_status === "active"
                          ? "default"
                          : "secondary"
                      }
                      className={
                        customer.activation_status === "active"
                          ? "bg-[#C1FF72] text-black"
                          : "bg-yellow-600"
                      }
                    >
                      {customer.activation_status === "active"
                        ? "Active"
                        : "Pending"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Calendar className="h-4 w-4" />
                    Joined {new Date(customer.created_at).toLocaleDateString()}
                  </div>
                </div>

                {/* Agent Status */}
                <div className="space-y-2">
                  <span className="text-sm text-gray-400">Agents:</span>
                  <div className="flex flex-wrap gap-1">
                    {customer.user_agent_configs.map((config) => (
                      <Badge
                        key={config.agent_name}
                        variant={config.is_enabled ? "default" : "secondary"}
                        className={`text-xs ${
                          config.is_enabled
                            ? "bg-[#C1FF72] text-black"
                            : "bg-gray-700 text-gray-300"
                        }`}
                      >
                        {config.agent_name}
                      </Badge>
                    ))}
                    {customer.user_agent_configs.length === 0 && (
                      <span className="text-xs text-gray-500">
                        No agents configured
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() =>
                      window.open(`mailto:${customer.email}`, "_blank")
                    }
                  >
                    <Mail className="h-4 w-4 mr-1" />
                    Email
                  </Button>
                  {setupStatus !== "completed" && (
                    <Button
                      size="sm"
                      className="flex-1 bg-[#C1FF72] text-black hover:bg-[#C1FF72]/80"
                      onClick={() => {
                        // Navigate to pending setups with this customer selected
                        window.location.href = `/owner/dashboard?tab=pending&customer=${customer.id}`;
                      }}
                    >
                      Setup
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredCustomers.length === 0 && (
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Users className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-semibold text-gray-400 mb-2">
                No Customers Found
              </h3>
              <p className="text-gray-500">
                {searchTerm || filterStatus !== "all"
                  ? "Try adjusting your search or filter criteria"
                  : "No customers have subscribed yet"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
