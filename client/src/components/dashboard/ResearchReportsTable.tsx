import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  MoreHorizontal,
  Linkedin,
  Building,
  Users,
  TrendingUp,
  ExternalLink,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

import { ResearchReport, SubscriptionPlan } from "@/types/lead-generation";
import { ReportViewer } from "./ReportViewer";

interface ResearchReportsTableProps {
  reports: ResearchReport[];
  userPlan: SubscriptionPlan;
}

export function ResearchReportsTable({
  reports,
  userPlan,
}: ResearchReportsTableProps) {
  const [sortField, setSortField] =
    useState<keyof ResearchReport>("generatedDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [statusFilter, setStatusFilter] = useState<
    "all" | ResearchReport["status"]
  >("all");
  const [selectedReport, setSelectedReport] = useState<ResearchReport | null>(
    null
  );
  const [isReportViewerOpen, setIsReportViewerOpen] = useState(false);

  // Filter and sort reports
  const filteredReports = useMemo(() => {
    let filtered = reports.filter(
      (report) => statusFilter === "all" || report.status === statusFilter
    );

    // Sort reports
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
  }, [reports, statusFilter, sortField, sortDirection]);

  const handleSort = (field: keyof ResearchReport) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getStatusBadge = (status: ResearchReport["status"]) => {
    const statusConfig = {
      pending: {
        color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
        label: "Pending",
        icon: Clock,
      },
      completed: {
        color: "bg-green-500/20 text-green-400 border-green-500/30",
        label: "Completed",
        icon: CheckCircle,
      },
      failed: {
        color: "bg-red-500/20 text-red-400 border-red-500/30",
        label: "Failed",
        icon: XCircle,
      },
      delivered: {
        color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
        label: "Delivered",
        icon: Mail,
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

  const handleViewReport = (report: ResearchReport) => {
    setSelectedReport(report);
    setIsReportViewerOpen(true);
  };

  const handleCloseReportViewer = () => {
    setIsReportViewerOpen(false);
    setSelectedReport(null);
  };

  const handleResendEmail = (report: ResearchReport) => {
    // Simulate email resend
    console.log(`Resending report ${report.id} via email`);
  };

  const getInsightIcon = (insight: keyof ResearchReport["insights"]) => {
    const icons = {
      companySize: Users,
      recentNews: TrendingUp,
      socialActivity: Linkedin,
      contactInfo: Mail,
      linkedinProfile: ExternalLink,
      companyWebsite: Building,
      industry: Building,
      location: Building,
    };
    return icons[insight] || Building;
  };

  return (
    <Card className="bg-dashboard-bg-secondary/50 backdrop-blur-sm border-dashboard-border-primary">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-dashboard-text-primary text-xl flex items-center gap-2">
              <Linkedin className="w-5 h-5 text-[#0077B5]" />
              LinkedIn Research Reports
            </CardTitle>
            <CardDescription className="text-dashboard-text-secondary">
              {filteredReports.length} research reports generated
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 bg-dashboard-bg-tertiary border border-dashboard-border-primary rounded-md text-dashboard-text-primary text-sm"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="delivered">Delivered</option>
              <option value="failed">Failed</option>
            </select>
            <Button
              size="sm"
              className="bg-dashboard-primary hover:bg-dashboard-primary/90"
            >
              Generate Report
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
                  onClick={() => handleSort("reportName")}
                >
                  Report
                </TableHead>
                <TableHead
                  className="text-dashboard-text-secondary cursor-pointer hover:text-dashboard-text-primary"
                  onClick={() => handleSort("leadName")}
                >
                  Lead
                </TableHead>
                <TableHead
                  className="text-dashboard-text-secondary cursor-pointer hover:text-dashboard-text-primary"
                  onClick={() => handleSort("generatedDate")}
                >
                  Generated
                </TableHead>
                <TableHead
                  className="text-dashboard-text-secondary cursor-pointer hover:text-dashboard-text-primary"
                  onClick={() => handleSort("status")}
                >
                  Status
                </TableHead>
                <TableHead className="text-dashboard-text-secondary">
                  Insights
                </TableHead>
                <TableHead className="text-dashboard-text-secondary">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReports.map((report, index) => (
                <motion.tr
                  key={report.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-dashboard-border-primary hover:bg-dashboard-bg-tertiary/30 transition-colors"
                >
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium text-dashboard-text-primary flex items-center gap-2">
                        <FileText className="w-4 h-4 text-dashboard-text-secondary" />
                        {report.reportName}
                      </div>
                      <div className="text-sm text-dashboard-text-secondary">
                        HTML Research Report
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-dashboard-text-primary">
                      {report.leadName}
                    </div>
                  </TableCell>
                  <TableCell className="text-dashboard-text-primary">
                    {new Date(report.generatedDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{getStatusBadge(report.status)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(report.insights).map(([key, value]) => {
                        const Icon = getInsightIcon(
                          key as keyof ResearchReport["insights"]
                        );
                        return (
                          <div
                            key={key}
                            className="flex items-center gap-1 px-2 py-1 bg-dashboard-bg-tertiary rounded text-xs text-dashboard-text-secondary"
                            title={`${key}: ${value}`}
                          >
                            <Icon className="w-3 h-3" />
                            {typeof value === "boolean"
                              ? value
                                ? "✓"
                                : "✗"
                              : value}
                          </div>
                        );
                      })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {report.status === "completed" ||
                      report.status === "delivered" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewReport(report)}
                          className="border-dashboard-border-primary text-dashboard-text-primary hover:bg-dashboard-interactive-hover"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View Report
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled
                          className="border-dashboard-border-primary text-dashboard-text-secondary opacity-50"
                        >
                          <Clock className="w-3 h-3 mr-1" />
                          Processing
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
                        <DropdownMenuContent
                          align="end"
                          className="bg-dashboard-bg-tertiary border-dashboard-border-primary"
                        >
                          <DropdownMenuItem className="text-dashboard-text-primary hover:bg-dashboard-interactive-hover">
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          {report.status === "completed" && (
                            <DropdownMenuItem
                              onClick={() => handleResendEmail(report)}
                              className="text-dashboard-text-primary hover:bg-dashboard-interactive-hover"
                            >
                              <Mail className="mr-2 h-4 w-4" />
                              Resend Email
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator className="bg-dashboard-border-primary" />
                          <DropdownMenuItem className="text-red-400 hover:bg-red-500/10">
                            <XCircle className="mr-2 h-4 w-4" />
                            Delete Report
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

        {filteredReports.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 mx-auto text-dashboard-text-secondary mb-4" />
            <h3 className="text-lg font-semibold text-dashboard-text-primary mb-2">
              No Research Reports
            </h3>
            <p className="text-dashboard-text-secondary mb-6">
              Generate your first LinkedIn research report to get detailed
              insights about your leads.
            </p>
            <Button className="bg-dashboard-primary hover:bg-dashboard-primary/90">
              Generate Report
            </Button>
          </div>
        )}
      </CardContent>

      {/* Report Viewer Modal */}
      <ReportViewer
        report={selectedReport}
        isOpen={isReportViewerOpen}
        onClose={handleCloseReportViewer}
      />
    </Card>
  );
}
