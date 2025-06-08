import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  FileText,
  Search,
  RefreshCw,
  Eye,
  ExternalLink,
  Linkedin,
  Calendar,
  MoreHorizontal,
  Copy,
  Download,
  Trash2,
  Users,
  TrendingUp,
} from "lucide-react";

interface Report {
  id: string;
  report_title: string;
  report_content: string;
  report_type: string;
  created_at: string;
  user_id: string;
  // Derived fields from report_title
  lead_name?: string;
  linkedin_url?: string;
}

// Helper function to extract lead name from report title
const extractLeadNameFromTitle = (title: string): string => {
  if (!title) return "Unknown";
  // Extract name from "Research Report - [Name]" format
  const match = title.match(/Research Report - (.+)/);
  return match ? match[1].trim() : title;
};

// Helper function to extract LinkedIn URL from report content
const extractLinkedInUrlFromContent = (content: string): string => {
  if (!content) return "";
  // Look for LinkedIn URLs in the content
  const linkedinUrlMatch = content.match(
    /https:\/\/(?:www\.)?linkedin\.com\/in\/[^\s"<>]+/
  );
  return linkedinUrlMatch ? linkedinUrlMatch[0] : "";
};

export function ReportsSection() {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (user) {
      fetchReports();
    }
  }, [user]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/reports", {
        method: "GET",
        credentials: "include", // Include cookies for authentication
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Process reports to extract lead names from report titles
        const processedReports = (data.reports || []).map((report: any) => ({
          ...report,
          lead_name: extractLeadNameFromTitle(report.report_title),
          linkedin_url: extractLinkedInUrlFromContent(report.report_content),
        }));
        setReports(processedReports);
      } else {
        const errorData = await response.text();
        console.error(
          "Error fetching reports:",
          response.status,
          response.statusText,
          errorData
        );
      }
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = reports.filter((report) => {
    const searchableText = (
      report.lead_name ||
      report.report_title ||
      ""
    ).toLowerCase();
    return searchableText.includes(searchTerm.toLowerCase());
  });

  const truncateText = (text: string, maxLength: number = 30) => {
    if (!text) return "-";
    return text.length > maxLength
      ? `${text.substring(0, maxLength)}...`
      : text;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const handleViewReport = (report: Report) => {
    // Debug logging for report content
    console.log("🔍 DEBUG - handleViewReport called with:", {
      reportId: report.id,
      leadName: report.lead_name,
      contentLength: report.report_content?.length || 0,
      contentPreview: report.report_content?.substring(0, 100) || "No content",
      hasContent: !!report.report_content,
      fullReport: report,
    });

    // Open the HTML report in a new tab
    const newWindow = window.open("", "_blank");
    if (newWindow) {
      newWindow.document.write(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Research Report - ${report.lead_name || "Unknown"}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              max-width: 800px;
              margin: 0 auto;
              padding: 2rem;
              background: #0f172a;
              color: #e2e8f0;
              line-height: 1.6;
            }
            .report-header {
              text-align: center;
              margin-bottom: 2rem;
              padding-bottom: 1rem;
              border-bottom: 2px solid #38B6FF;
            }
            .report-header h1 {
              font-size: 2rem;
              font-weight: bold;
              color: #38B6FF;
              margin-bottom: 0.5rem;
            }
            .report-header h2 {
              font-size: 1.5rem;
              color: #C1FF72;
              margin-bottom: 0.5rem;
            }
            .report-date {
              color: #94a3b8;
              font-size: 0.9rem;
            }
            .report-section {
              margin-bottom: 2rem;
              padding: 1.5rem;
              background: rgba(255, 255, 255, 0.05);
              border-radius: 8px;
              border: 1px solid rgba(255, 255, 255, 0.1);
            }
            .report-section h3 {
              font-size: 1.25rem;
              font-weight: 600;
              color: #38B6FF;
              margin-bottom: 1rem;
              padding-bottom: 0.5rem;
              border-bottom: 1px solid rgba(56, 182, 255, 0.3);
            }
            .info-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
              gap: 1rem;
              margin-top: 1rem;
            }
            .info-item {
              padding: 0.75rem;
              background: rgba(255, 255, 255, 0.05);
              border-radius: 6px;
              border: 1px solid rgba(255, 255, 255, 0.1);
            }
            .info-item strong {
              color: #C1FF72;
            }
            a {
              color: #38B6FF;
              text-decoration: none;
            }
            a:hover {
              text-decoration: underline;
            }
            @media (max-width: 768px) {
              body {
                padding: 1rem;
              }
              .info-grid {
                grid-template-columns: 1fr;
              }
              .report-header h1 {
                font-size: 1.5rem;
              }
              .report-header h2 {
                font-size: 1.25rem;
              }
            }
          </style>
        </head>
        <body>
          <div class="report-header">
            <h1>SharpFlow Research Report</h1>
            <h2>${report.lead_name || "Unknown"}</h2>
            <div class="report-date">Generated on ${new Date(
              report.created_at
            ).toLocaleDateString()}</div>
          </div>
          ${
            report.report_content ||
            `<div style="text-align: center; padding: 2rem; color: #94a3b8;">
              <h3>⚠️ No Content Available</h3>
              <p>This report appears to be empty or the content could not be loaded.</p>
              <div style="margin-top: 1rem; font-size: 0.9rem; color: #64748b;">
                <p><strong>Debug Info:</strong></p>
                <p>Report ID: ${report.id}</p>
                <p>Content Length: ${
                  report.report_content?.length || 0
                } characters</p>
                <p>Has Content: ${!!report.report_content}</p>
              </div>
            </div>`
          }
        </body>
        </html>
      `);
      newWindow.document.close();
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    try {
      const response = await fetch(`/api/reports/${reportId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Refresh the reports list
        fetchReports();
      } else {
        console.error("Error deleting report:", response.statusText);
      }
    } catch (error) {
      console.error("Error deleting report:", error);
    }
  };

  const stats = {
    totalReports: reports.length,
    thisWeekReports: reports.filter(
      (report) =>
        new Date(report.created_at) >
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length,
  };

  return (
    <div className="space-y-6 w-full max-w-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h2 className="text-fluid-3xl font-bold text-dashboard-text-primary">
            Research Reports
          </h2>
          <p className="text-dashboard-text-secondary mt-1">
            View and manage your generated LinkedIn research reports
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={fetchReports}
            variant="outline"
            className="border-dashboard-border-primary text-dashboard-text-primary hover:bg-dashboard-bg-accent hover:text-dashboard-primary"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        <Card className="bg-dashboard-bg-secondary/50 backdrop-blur-sm border-dashboard-border-primary hover:border-dashboard-primary/50 transition-all duration-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-dashboard-text-secondary flex items-center gap-2">
              <FileText className="w-4 h-4 text-dashboard-primary" />
              Total Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-dashboard-text-primary">
              {stats.totalReports.toLocaleString()}
            </div>
            <p className="text-xs text-dashboard-text-muted">All time</p>
          </CardContent>
        </Card>

        <Card className="bg-dashboard-bg-secondary/50 backdrop-blur-sm border-dashboard-border-primary hover:border-dashboard-primary/50 transition-all duration-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-dashboard-text-secondary flex items-center gap-2">
              <Calendar className="w-4 h-4 text-dashboard-secondary" />
              This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-dashboard-text-primary">
              {stats.thisWeekReports.toLocaleString()}
            </div>
            <p className="text-xs text-dashboard-text-muted">New reports</p>
          </CardContent>
        </Card>

        <Card className="bg-dashboard-bg-secondary/50 backdrop-blur-sm border-dashboard-border-primary hover:border-dashboard-primary/50 transition-all duration-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-dashboard-text-secondary flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-dashboard-status-success" />
              Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-dashboard-text-primary">
              100%
            </div>
            <p className="text-xs text-dashboard-text-muted">Success rate</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Search and Filter */}
      <Card className="bg-dashboard-bg-secondary/50 backdrop-blur-sm border-dashboard-border-primary">
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dashboard-text-secondary w-4 h-4" />
                <Input
                  placeholder="Search reports by lead name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-dashboard-bg-tertiary border-dashboard-border-primary text-dashboard-text-primary placeholder:text-dashboard-text-muted focus:border-dashboard-primary focus:ring-dashboard-primary"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports Table */}
      <Card className="bg-dashboard-bg-secondary/50 backdrop-blur-sm border-dashboard-border-primary w-full max-w-full">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-dashboard-text-primary">
                <FileText className="w-5 h-5 text-dashboard-primary" />
                Reports ({filteredReports.length})
              </CardTitle>
              <CardDescription className="text-dashboard-text-secondary">
                LinkedIn research reports generated from your Telegram bot
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="border-dashboard-border-primary text-dashboard-text-secondary"
              >
                {filteredReports.length} of {reports.length} reports
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="text-center py-12"
            >
              <RefreshCw className="w-8 h-8 text-dashboard-text-muted mx-auto mb-4 animate-spin" />
              <p className="text-dashboard-text-secondary">
                Loading reports...
              </p>
            </motion.div>
          ) : filteredReports.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="text-center py-12"
            >
              <FileText className="w-16 h-16 text-dashboard-text-muted mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-dashboard-text-primary mb-2">
                No reports found
              </h3>
              <p className="text-dashboard-text-secondary mb-6">
                {searchTerm
                  ? "Try adjusting your search to see more results"
                  : "Generate your first research report by sending a LinkedIn URL to your Telegram bot"}
              </p>
              <div className="space-y-2 text-sm text-dashboard-text-muted">
                <p>📱 Send a LinkedIn URL to @Shajith240_bot</p>
                <p>🤖 The bot will generate a detailed research report</p>
                <p>📊 View your reports here once generated</p>
              </div>
            </motion.div>
          ) : (
            <div className="rounded-lg border border-dashboard-border-primary overflow-hidden w-full">
              <div className="overflow-x-auto leads-table-container w-full">
                <Table>
                  <TableHeader>
                    <TableRow className="border-dashboard-border-primary hover:bg-dashboard-bg-tertiary/50 bg-dashboard-bg-accent/30">
                      <TableHead className="text-dashboard-text-secondary font-semibold w-[200px] lg:w-[250px]">
                        Lead Name
                      </TableHead>
                      <TableHead className="text-dashboard-text-secondary font-semibold w-[250px] lg:w-[300px]">
                        LinkedIn URL
                      </TableHead>
                      <TableHead className="text-dashboard-text-secondary font-semibold w-[150px] lg:w-[180px]">
                        Generated Date
                      </TableHead>
                      <TableHead className="text-dashboard-text-secondary font-semibold w-[120px] lg:w-[150px]">
                        View Report
                      </TableHead>
                      <TableHead className="text-dashboard-text-secondary font-semibold w-[100px] lg:w-[120px]">
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
                        transition={{ delay: index * 0.05, duration: 0.3 }}
                        className="border-dashboard-border-primary hover:bg-dashboard-bg-tertiary/30 transition-all duration-200 group"
                      >
                        {/* Lead Name */}
                        <TableCell className="py-4">
                          <div className="space-y-1">
                            <div className="font-semibold text-dashboard-text-primary group-hover:text-dashboard-primary transition-colors">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="cursor-help">
                                      {truncateText(
                                        report.lead_name || "Unknown",
                                        25
                                      )}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-dashboard-bg-tertiary border-dashboard-border-primary text-dashboard-text-primary">
                                    <p>{report.lead_name || "Unknown"}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-dashboard-text-secondary" />
                              <span className="text-xs text-dashboard-text-secondary">
                                {new Date(
                                  report.created_at
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </TableCell>

                        {/* LinkedIn URL */}
                        <TableCell className="py-4">
                          <div className="flex items-center gap-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  {report.linkedin_url ? (
                                    <a
                                      href={report.linkedin_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-dashboard-primary hover:text-dashboard-secondary transition-colors font-medium flex items-center gap-1"
                                    >
                                      <Linkedin className="w-3 h-3" />
                                      {truncateText(report.linkedin_url, 35)}
                                    </a>
                                  ) : (
                                    <span className="text-dashboard-text-muted flex items-center gap-1">
                                      <Linkedin className="w-3 h-3" />
                                      No URL found
                                    </span>
                                  )}
                                </TooltipTrigger>
                                <TooltipContent className="bg-dashboard-bg-tertiary border-dashboard-border-primary text-dashboard-text-primary">
                                  <p>{report.linkedin_url || "No URL found"}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            {report.linkedin_url && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() =>
                                  copyToClipboard(report.linkedin_url!)
                                }
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>

                        {/* Generated Date */}
                        <TableCell className="py-4">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-dashboard-text-secondary" />
                            <span className="text-dashboard-text-primary font-medium">
                              {new Date(report.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </TableCell>

                        {/* View Report */}
                        <TableCell className="py-4">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-dashboard-border-primary text-dashboard-text-primary hover:bg-dashboard-bg-accent hover:text-dashboard-primary"
                            onClick={() => handleViewReport(report)}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View Report
                          </Button>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="py-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-dashboard-text-secondary hover:text-dashboard-primary hover:bg-dashboard-bg-accent"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                                <span className="sr-only">Open menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="bg-dashboard-bg-tertiary border-dashboard-border-primary"
                            >
                              <DropdownMenuItem
                                onClick={() => handleViewReport(report)}
                                className="text-dashboard-text-primary hover:bg-dashboard-bg-accent"
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                View Report
                              </DropdownMenuItem>
                              {report.linkedin_url && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      copyToClipboard(report.linkedin_url!)
                                    }
                                    className="text-dashboard-text-primary hover:bg-dashboard-bg-accent"
                                  >
                                    <Copy className="w-4 h-4 mr-2" />
                                    Copy LinkedIn URL
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      window.open(
                                        report.linkedin_url!,
                                        "_blank"
                                      )
                                    }
                                    className="text-dashboard-text-primary hover:bg-dashboard-bg-accent"
                                  >
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    Open LinkedIn
                                  </DropdownMenuItem>
                                </>
                              )}
                              <DropdownMenuSeparator className="bg-dashboard-border-primary" />
                              <DropdownMenuItem
                                onClick={() => handleDeleteReport(report.id)}
                                className="text-dashboard-status-error hover:bg-dashboard-status-error/10"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Report
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
