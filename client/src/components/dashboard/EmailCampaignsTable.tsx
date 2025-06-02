import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { 
  Mail, 
  Play, 
  Pause, 
  Square, 
  Edit, 
  Copy,
  MoreHorizontal,
  Eye,
  BarChart3,
  Users,
  MousePointer,
  MessageSquare,
  TrendingUp,
  Calendar,
  Target
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";

import { EmailCampaign, SubscriptionPlan } from "@/types/lead-generation";

interface EmailCampaignsTableProps {
  campaigns: EmailCampaign[];
  userPlan: SubscriptionPlan;
}

export function EmailCampaignsTable({
  campaigns,
  userPlan,
}: EmailCampaignsTableProps) {
  const [sortField, setSortField] = useState<keyof EmailCampaign>("createdDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [statusFilter, setStatusFilter] = useState<"all" | EmailCampaign["status"]>("all");

  // Filter and sort campaigns
  const filteredCampaigns = useMemo(() => {
    let filtered = campaigns.filter(campaign => 
      statusFilter === "all" || campaign.status === statusFilter
    );

    // Sort campaigns
    filtered.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc" 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }
      
      return 0;
    });

    return filtered;
  }, [campaigns, statusFilter, sortField, sortDirection]);

  const handleSort = (field: keyof EmailCampaign) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getStatusBadge = (status: EmailCampaign["status"]) => {
    const statusConfig = {
      draft: { 
        color: "bg-gray-500/20 text-gray-400 border-gray-500/30", 
        label: "Draft",
        icon: Edit
      },
      active: { 
        color: "bg-green-500/20 text-green-400 border-green-500/30", 
        label: "Active",
        icon: Play
      },
      paused: { 
        color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", 
        label: "Paused",
        icon: Pause
      },
      completed: { 
        color: "bg-blue-500/20 text-blue-400 border-blue-500/30", 
        label: "Completed",
        icon: Square
      },
    };
    
    const config = statusConfig[status];
    const Icon = config.icon;
    
    return (
      <Badge className={`${config.color} border`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const handleCampaignAction = (campaign: EmailCampaign, action: "play" | "pause" | "stop") => {
    console.log(`${action} campaign ${campaign.id}`);
    // Implement campaign control logic
  };

  const getPerformanceColor = (rate: number, type: "open" | "response") => {
    const thresholds = type === "open" ? [20, 35] : [10, 20];
    if (rate >= thresholds[1]) return "text-green-400";
    if (rate >= thresholds[0]) return "text-yellow-400";
    return "text-red-400";
  };

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const totalRecipients = filteredCampaigns.reduce((sum, c) => sum + c.recipients, 0);
    const totalConversions = filteredCampaigns.reduce((sum, c) => sum + c.conversions, 0);
    const avgOpenRate = filteredCampaigns.length > 0 
      ? filteredCampaigns.reduce((sum, c) => sum + c.openRate, 0) / filteredCampaigns.length 
      : 0;
    const avgResponseRate = filteredCampaigns.length > 0 
      ? filteredCampaigns.reduce((sum, c) => sum + c.responseRate, 0) / filteredCampaigns.length 
      : 0;

    return {
      totalRecipients,
      totalConversions,
      avgOpenRate,
      avgResponseRate,
      conversionRate: totalRecipients > 0 ? (totalConversions / totalRecipients) * 100 : 0
    };
  }, [filteredCampaigns]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-dashboard-bg-secondary/50 backdrop-blur-sm border-dashboard-border-primary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-dashboard-text-secondary text-sm">Total Recipients</p>
                <p className="text-dashboard-text-primary text-2xl font-bold">
                  {summaryMetrics.totalRecipients.toLocaleString()}
                </p>
              </div>
              <Users className="w-8 h-8 text-dashboard-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-dashboard-bg-secondary/50 backdrop-blur-sm border-dashboard-border-primary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-dashboard-text-secondary text-sm">Avg Open Rate</p>
                <p className={`text-2xl font-bold ${getPerformanceColor(summaryMetrics.avgOpenRate, "open")}`}>
                  {summaryMetrics.avgOpenRate.toFixed(1)}%
                </p>
              </div>
              <MousePointer className="w-8 h-8 text-dashboard-secondary" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-dashboard-bg-secondary/50 backdrop-blur-sm border-dashboard-border-primary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-dashboard-text-secondary text-sm">Avg Response Rate</p>
                <p className={`text-2xl font-bold ${getPerformanceColor(summaryMetrics.avgResponseRate, "response")}`}>
                  {summaryMetrics.avgResponseRate.toFixed(1)}%
                </p>
              </div>
              <MessageSquare className="w-8 h-8 text-dashboard-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-dashboard-bg-secondary/50 backdrop-blur-sm border-dashboard-border-primary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-dashboard-text-secondary text-sm">Conversions</p>
                <p className="text-dashboard-text-primary text-2xl font-bold">
                  {summaryMetrics.totalConversions}
                </p>
              </div>
              <Target className="w-8 h-8 text-dashboard-secondary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns Table */}
      <Card className="bg-dashboard-bg-secondary/50 backdrop-blur-sm border-dashboard-border-primary">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-dashboard-text-primary text-xl flex items-center gap-2">
                <Mail className="w-5 h-5 text-dashboard-primary" />
                Email Campaigns
              </CardTitle>
              <CardDescription className="text-dashboard-text-secondary">
                {filteredCampaigns.length} campaigns configured
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 bg-dashboard-bg-tertiary border border-dashboard-border-primary rounded-md text-dashboard-text-primary text-sm"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
              </select>
              <Button 
                size="sm"
                className="bg-dashboard-primary hover:bg-dashboard-primary/90"
              >
                Create Campaign
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-lg border border-dashboard-border-primary overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-dashboard-border-primary hover:bg-dashboard-bg-tertiary/50">
                  <TableHead 
                    className="text-dashboard-text-secondary cursor-pointer hover:text-dashboard-text-primary"
                    onClick={() => handleSort("name")}
                  >
                    Campaign
                  </TableHead>
                  <TableHead 
                    className="text-dashboard-text-secondary cursor-pointer hover:text-dashboard-text-primary"
                    onClick={() => handleSort("recipients")}
                  >
                    Recipients
                  </TableHead>
                  <TableHead 
                    className="text-dashboard-text-secondary cursor-pointer hover:text-dashboard-text-primary"
                    onClick={() => handleSort("openRate")}
                  >
                    Open Rate
                  </TableHead>
                  <TableHead 
                    className="text-dashboard-text-secondary cursor-pointer hover:text-dashboard-text-primary"
                    onClick={() => handleSort("responseRate")}
                  >
                    Response Rate
                  </TableHead>
                  <TableHead 
                    className="text-dashboard-text-secondary cursor-pointer hover:text-dashboard-text-primary"
                    onClick={() => handleSort("conversions")}
                  >
                    Conversions
                  </TableHead>
                  <TableHead 
                    className="text-dashboard-text-secondary cursor-pointer hover:text-dashboard-text-primary"
                    onClick={() => handleSort("status")}
                  >
                    Status
                  </TableHead>
                  <TableHead 
                    className="text-dashboard-text-secondary cursor-pointer hover:text-dashboard-text-primary"
                    onClick={() => handleSort("createdDate")}
                  >
                    Created
                  </TableHead>
                  <TableHead className="text-dashboard-text-secondary">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCampaigns.map((campaign, index) => (
                  <motion.tr
                    key={campaign.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-dashboard-border-primary hover:bg-dashboard-bg-tertiary/30 transition-colors"
                  >
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium text-dashboard-text-primary">
                          {campaign.name}
                        </div>
                        <div className="text-sm text-dashboard-text-secondary">
                          {campaign.template}
                        </div>
                        {campaign.followUpSequence && (
                          <Badge variant="outline" className="text-xs border-dashboard-border-primary text-dashboard-text-secondary">
                            Follow-up Enabled
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-dashboard-text-secondary" />
                        <span className="text-dashboard-text-primary font-medium">
                          {campaign.recipients.toLocaleString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className={`font-medium ${getPerformanceColor(campaign.openRate, "open")}`}>
                          {campaign.openRate.toFixed(1)}%
                        </div>
                        <Progress 
                          value={campaign.openRate} 
                          className="h-1 w-16"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className={`font-medium ${getPerformanceColor(campaign.responseRate, "response")}`}>
                          {campaign.responseRate.toFixed(1)}%
                        </div>
                        <Progress 
                          value={campaign.responseRate} 
                          className="h-1 w-16"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-dashboard-secondary" />
                        <span className="text-dashboard-text-primary font-medium">
                          {campaign.conversions}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(campaign.status)}
                    </TableCell>
                    <TableCell className="text-dashboard-text-primary">
                      {new Date(campaign.createdDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {campaign.status === "active" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCampaignAction(campaign, "pause")}
                            className="border-dashboard-border-primary text-dashboard-text-primary hover:bg-dashboard-interactive-hover"
                          >
                            <Pause className="w-3 h-3" />
                          </Button>
                        ) : campaign.status === "paused" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCampaignAction(campaign, "play")}
                            className="border-dashboard-border-primary text-dashboard-text-primary hover:bg-dashboard-interactive-hover"
                          >
                            <Play className="w-3 h-3" />
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCampaignAction(campaign, "play")}
                            className="border-dashboard-border-primary text-dashboard-text-primary hover:bg-dashboard-interactive-hover"
                          >
                            <Play className="w-3 h-3" />
                          </Button>
                        )}
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-8 w-8 p-0 text-dashboard-text-secondary hover:text-dashboard-text-primary hover:bg-dashboard-interactive-hover"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-dashboard-bg-tertiary border-dashboard-border-primary">
                            <DropdownMenuItem className="text-dashboard-text-primary hover:bg-dashboard-interactive-hover">
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-dashboard-text-primary hover:bg-dashboard-interactive-hover">
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Campaign
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-dashboard-text-primary hover:bg-dashboard-interactive-hover">
                              <Copy className="mr-2 h-4 w-4" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-dashboard-text-primary hover:bg-dashboard-interactive-hover">
                              <BarChart3 className="mr-2 h-4 w-4" />
                              View Analytics
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-dashboard-border-primary" />
                            <DropdownMenuItem className="text-red-400 hover:bg-red-500/10">
                              <Square className="mr-2 h-4 w-4" />
                              Stop Campaign
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredCampaigns.length === 0 && (
            <div className="text-center py-12">
              <Mail className="w-16 h-16 mx-auto text-dashboard-text-secondary mb-4" />
              <h3 className="text-lg font-semibold text-dashboard-text-primary mb-2">
                No Email Campaigns
              </h3>
              <p className="text-dashboard-text-secondary mb-6">
                Create your first automated email campaign to start engaging with your leads.
              </p>
              <Button className="bg-dashboard-primary hover:bg-dashboard-primary/90">
                Create Campaign
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
