import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Filter,
  Download,
  ExternalLink,
  Mail,
  Phone,
  MapPin,
  Building,
  Star,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Target,
  Zap,
  CheckSquare,
  Square,
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Lead,
  SubscriptionPlan,
  PLAN_FEATURES,
  QualificationFilter,
} from "@/types/lead-generation";
import {
  QualificationBadge,
  QualificationScore,
} from "@/components/qualification/QualificationBadge";
import { BulkQualificationDialog } from "@/components/qualification/BulkQualificationDialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";

interface LeadsTableProps {
  leads: Lead[];
  userPlan: SubscriptionPlan;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  industryFilter: string;
  onIndustryFilterChange: (value: string) => void;
  locationFilter: string;
  onLocationFilterChange: (value: string) => void;
  onBulkQualification?: (leadIds: string[]) => void;
}

export function LeadsTable({
  leads,
  userPlan,
  searchTerm,
  onSearchChange,
  industryFilter,
  onIndustryFilterChange,
  locationFilter,
  onLocationFilterChange,
  onBulkQualification,
}: LeadsTableProps) {
  const [sortField, setSortField] = useState<keyof Lead>("dateAdded");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Qualification-related state
  const [qualificationFilter, setQualificationFilter] =
    useState<QualificationFilter>({});
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  const planFeatures = PLAN_FEATURES[userPlan];

  // Get unique industries and locations for filters
  const industries = useMemo(
    () => Array.from(new Set(leads.map((lead) => lead.industry))).sort(),
    [leads]
  );

  const locations = useMemo(
    () =>
      Array.from(
        new Set(
          leads.map(
            (lead) => lead.location.split(",")[1]?.trim() || lead.location
          )
        )
      ).sort(),
    [leads]
  );

  // Selection handlers
  const handleSelectLead = (leadId: string, checked: boolean) => {
    if (checked) {
      setSelectedLeads((prev) => [...prev, leadId]);
    } else {
      setSelectedLeads((prev) => prev.filter((id) => id !== leadId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLeads(filteredLeads.map((lead) => lead.id));
    } else {
      setSelectedLeads([]);
    }
  };

  const handleBulkQualification = async (request: any) => {
    setBulkLoading(true);
    try {
      if (onBulkQualification) {
        await onBulkQualification(request.leadIds || selectedLeads);
      }
      setShowBulkDialog(false);
      setSelectedLeads([]);
    } catch (error) {
      console.error("Bulk qualification failed:", error);
    } finally {
      setBulkLoading(false);
    }
  };

  // Filter and sort leads with qualification filters
  const filteredLeads = useMemo(() => {
    let filtered = leads.filter((lead) => {
      const matchesSearch =
        !searchTerm ||
        lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesIndustry =
        industryFilter === "all" || lead.industry === industryFilter;
      const matchesLocation =
        locationFilter === "all" || lead.location.includes(locationFilter);

      // Qualification filters
      const matchesQualificationRating =
        !qualificationFilter.rating ||
        (qualificationFilter.rating === "unqualified"
          ? !lead.qualification_rating
          : lead.qualification_rating === qualificationFilter.rating);

      const matchesScoreRange =
        !qualificationFilter.scoreRange ||
        (lead.qualification_score !== undefined &&
          lead.qualification_score >= qualificationFilter.scoreRange.min &&
          lead.qualification_score <= qualificationFilter.scoreRange.max);

      const matchesAutoQualified =
        qualificationFilter.autoQualified === undefined ||
        lead.auto_qualified === qualificationFilter.autoQualified;

      return (
        matchesSearch &&
        matchesIndustry &&
        matchesLocation &&
        matchesQualificationRating &&
        matchesScoreRange &&
        matchesAutoQualified
      );
    });

    // Sort leads
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
  }, [
    leads,
    searchTerm,
    industryFilter,
    locationFilter,
    qualificationFilter,
    sortField,
    sortDirection,
  ]);

  // Pagination
  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);
  const paginatedLeads = filteredLeads.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSort = (field: keyof Lead) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getStatusBadge = (status: Lead["status"]) => {
    const statusConfig = {
      new: { color: "bg-blue-500/20 text-blue-400", label: "New" },
      contacted: {
        color: "bg-yellow-500/20 text-yellow-400",
        label: "Contacted",
      },
      qualified: {
        color: "bg-green-500/20 text-green-400",
        label: "Qualified",
      },
      converted: {
        color: "bg-purple-500/20 text-purple-400",
        label: "Converted",
      },
      rejected: { color: "bg-red-500/20 text-red-400", label: "Rejected" },
    };

    const config = status ? statusConfig[status] : statusConfig.new;
    return (
      <Badge className={`${config.color} border-none`}>{config.label}</Badge>
    );
  };

  const getScoreColor = (score: number | undefined) => {
    if (!score) return "text-gray-400";
    if (score >= 90) return "text-green-400";
    if (score >= 70) return "text-yellow-400";
    return "text-red-400";
  };

  // Get qualification row styling for visual classification - Apple-inspired flat design
  const getQualificationRowStyles = (lead: Lead) => {
    const rating = lead.qualification_rating;

    if (!rating) {
      // Unqualified leads - clean styling with subtle left border
      return "border-dashboard-border-primary transition-colors duration-200 border-l-2 border-l-gray-600/30 hover:bg-dashboard-bg-accent/40";
    }

    switch (rating) {
      case "high":
        // High quality - subtle lime green tint with enhanced left border
        return "bg-[#C1FF72]/5 border-[#C1FF72]/20 transition-colors duration-200 border-l-4 border-l-[#C1FF72] hover:bg-[#C1FF72]/15";
      case "medium":
        // Medium quality - subtle blue tint with enhanced left border
        return "bg-[#38B6FF]/5 border-[#38B6FF]/20 transition-colors duration-200 border-l-4 border-l-[#38B6FF] hover:bg-[#38B6FF]/15";
      case "low":
        // Low quality - subtle yellow tint with enhanced left border
        return "bg-yellow-400/5 border-yellow-400/20 transition-colors duration-200 border-l-4 border-l-yellow-400 hover:bg-yellow-400/15";
      default:
        return "border-dashboard-border-primary hover:bg-dashboard-bg-tertiary/30 transition-colors border-l-2 border-l-gray-600/30";
    }
  };

  const handleExport = () => {
    // Export functionality based on plan
    const exportData = filteredLeads.map((lead) => ({
      Name: lead.name,
      Company: lead.company,
      Title: lead.title,
      Location: lead.location,
      Industry: lead.industry,
      Status: lead.status,
      Score: lead.score,
      "Date Added": lead.dateAdded,
    }));

    const csv = [
      Object.keys(exportData[0]).join(","),
      ...exportData.map((row) => Object.values(row).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leads-export.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="bg-dashboard-bg-secondary/50 backdrop-blur-sm border-dashboard-border-primary">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-dashboard-text-primary text-xl">
              Lead Management
            </CardTitle>
            <CardDescription className="text-dashboard-text-secondary">
              {filteredLeads.length} of {leads.length} leads
              {leads.some((lead) => lead.qualification_rating) && (
                <span className="ml-2 text-xs">
                  • Visual qualification indicators active
                </span>
              )}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {selectedLeads.length > 0 && (
              <Button
                onClick={() => setShowBulkDialog(true)}
                variant="outline"
                size="sm"
                className="border-[#C1FF72]/50 text-[#C1FF72] hover:bg-[#C1FF72]/10"
                disabled={bulkLoading}
              >
                <Target className="w-4 h-4 mr-2" />
                Qualify Selected ({selectedLeads.length})
              </Button>
            )}
            <Button
              onClick={handleExport}
              variant="outline"
              size="sm"
              className="border-dashboard-border-primary text-dashboard-text-primary hover:bg-dashboard-interactive-hover"
            >
              <Download className="w-4 h-4 mr-2" />
              Export {planFeatures.exportFormats[0]}
            </Button>
            <Button
              size="sm"
              className="bg-dashboard-primary hover:bg-dashboard-primary/90"
            >
              Add Lead
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dashboard-text-secondary w-4 h-4" />
            <Input
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 bg-dashboard-bg-tertiary border-dashboard-border-primary text-dashboard-text-primary"
            />
          </div>

          {planFeatures.advancedFiltering && (
            <>
              <Select
                value={industryFilter}
                onValueChange={onIndustryFilterChange}
              >
                <SelectTrigger className="w-full sm:w-48 bg-dashboard-bg-tertiary border-dashboard-border-primary text-dashboard-text-primary">
                  <SelectValue placeholder="Industry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Industries</SelectItem>
                  {industries.map((industry) => (
                    <SelectItem key={industry} value={industry}>
                      {industry}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={locationFilter}
                onValueChange={onLocationFilterChange}
              >
                <SelectTrigger className="w-full sm:w-48 bg-dashboard-bg-tertiary border-dashboard-border-primary text-dashboard-text-primary">
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.map((location) => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Qualification Filter */}
              <Select
                value={qualificationFilter.rating || "all"}
                onValueChange={(value) =>
                  setQualificationFilter((prev) => ({
                    ...prev,
                    rating: value === "all" ? undefined : (value as any),
                  }))
                }
              >
                <SelectTrigger className="w-full sm:w-48 bg-dashboard-bg-tertiary border-dashboard-border-primary text-dashboard-text-primary">
                  <SelectValue placeholder="Qualification" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Qualifications</SelectItem>
                  <SelectItem value="high">High Quality</SelectItem>
                  <SelectItem value="medium">Medium Quality</SelectItem>
                  <SelectItem value="low">Low Quality</SelectItem>
                  <SelectItem value="unqualified">Unqualified</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div className="rounded-lg border border-dashboard-border-primary overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-dashboard-border-primary hover:bg-dashboard-bg-tertiary/50">
                <TableHead className="w-12">
                  <Checkbox
                    checked={
                      selectedLeads.length === filteredLeads.length &&
                      filteredLeads.length > 0
                    }
                    onCheckedChange={handleSelectAll}
                    className="border-dashboard-border-primary"
                  />
                </TableHead>
                <TableHead
                  className="text-dashboard-text-secondary cursor-pointer hover:text-dashboard-text-primary"
                  onClick={() => handleSort("name")}
                >
                  Lead
                </TableHead>
                <TableHead
                  className="text-dashboard-text-secondary cursor-pointer hover:text-dashboard-text-primary"
                  onClick={() => handleSort("company")}
                >
                  Company
                </TableHead>
                <TableHead
                  className="text-dashboard-text-secondary cursor-pointer hover:text-dashboard-text-primary"
                  onClick={() => handleSort("industry")}
                >
                  Industry
                </TableHead>
                <TableHead
                  className="text-dashboard-text-secondary cursor-pointer hover:text-dashboard-text-primary"
                  onClick={() => handleSort("location")}
                >
                  Location
                </TableHead>
                <TableHead
                  className="text-dashboard-text-secondary cursor-pointer hover:text-dashboard-text-primary"
                  onClick={() => handleSort("qualification_rating")}
                >
                  <div className="flex items-center gap-2">
                    Qualification
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3 h-3 text-dashboard-text-muted hover:text-dashboard-text-secondary cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="bg-dashboard-bg-tertiary border-dashboard-border-primary text-dashboard-text-primary max-w-xs">
                          <div className="space-y-2">
                            <p className="font-medium">
                              Lead Qualification Color Guide:
                            </p>
                            <div className="space-y-1 text-sm">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-[#C1FF72]"></div>
                                <span>High Quality (85-100 score)</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-[#38B6FF]"></div>
                                <span>Medium Quality (70-84 score)</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                                <span>Low Quality (50-69 score)</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                                <span>Unqualified (Not yet analyzed)</span>
                              </div>
                            </div>
                            <p className="text-xs text-dashboard-text-muted">
                              Row backgrounds are subtly tinted to match
                              qualification levels.
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </TableHead>
                <TableHead
                  className="text-dashboard-text-secondary cursor-pointer hover:text-dashboard-text-primary"
                  onClick={() => handleSort("score")}
                >
                  Score
                </TableHead>
                <TableHead
                  className="text-dashboard-text-secondary cursor-pointer hover:text-dashboard-text-primary"
                  onClick={() => handleSort("status")}
                >
                  Status
                </TableHead>
                <TableHead
                  className="text-dashboard-text-secondary cursor-pointer hover:text-dashboard-text-primary"
                  onClick={() => handleSort("dateAdded")}
                >
                  Date Added
                </TableHead>
                <TableHead className="text-dashboard-text-secondary">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedLeads.map((lead, index) => (
                <motion.tr
                  key={lead.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={getQualificationRowStyles(lead)}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedLeads.includes(lead.id)}
                      onCheckedChange={(checked) =>
                        handleSelectLead(lead.id, checked as boolean)
                      }
                      className="border-dashboard-border-primary"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium text-dashboard-text-primary">
                        {lead.name}
                      </div>
                      <div className="text-sm text-dashboard-text-secondary">
                        {lead.title}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-dashboard-text-secondary">
                        {lead.email && <Mail className="w-3 h-3" />}
                        {lead.phone && <Phone className="w-3 h-3" />}
                        {lead.linkedinUrl && (
                          <ExternalLink className="w-3 h-3" />
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-dashboard-text-secondary" />
                      <span className="text-dashboard-text-primary">
                        {lead.company}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="border-dashboard-border-primary text-dashboard-text-primary"
                    >
                      {lead.industry}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-dashboard-text-primary">
                      <MapPin className="w-3 h-3 text-dashboard-text-secondary" />
                      {lead.location}
                    </div>
                  </TableCell>
                  <TableCell>
                    <QualificationBadge
                      rating={lead.qualification_rating}
                      score={lead.qualification_score}
                      autoQualified={lead.auto_qualified}
                      showScore={true}
                      size="sm"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Star
                        className={`w-4 h-4 ${getScoreColor(lead.score)}`}
                      />
                      <span
                        className={`font-medium ${getScoreColor(lead.score)}`}
                      >
                        {lead.score || "N/A"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(lead.status)}</TableCell>
                  <TableCell className="text-dashboard-text-primary">
                    {lead.dateAdded
                      ? new Date(lead.dateAdded).toLocaleDateString()
                      : "N/A"}
                  </TableCell>
                  <TableCell>
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
                        <DropdownMenuItem className="text-dashboard-text-primary hover:bg-dashboard-interactive-hover">
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Lead
                        </DropdownMenuItem>
                        {lead.linkedinUrl && (
                          <DropdownMenuItem className="text-dashboard-text-primary hover:bg-dashboard-interactive-hover">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            View LinkedIn
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator className="bg-dashboard-border-primary" />
                        <DropdownMenuItem className="text-red-400 hover:bg-red-500/10">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Lead
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-dashboard-text-secondary">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, filteredLeads.length)} of{" "}
              {filteredLeads.length} leads
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="border-dashboard-border-primary text-dashboard-text-primary hover:bg-dashboard-interactive-hover"
              >
                Previous
              </Button>
              <span className="text-sm text-dashboard-text-primary">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage === totalPages}
                className="border-dashboard-border-primary text-dashboard-text-primary hover:bg-dashboard-interactive-hover"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      {/* Bulk Qualification Dialog */}
      <BulkQualificationDialog
        open={showBulkDialog}
        onOpenChange={setShowBulkDialog}
        leads={leads}
        selectedLeads={selectedLeads}
        onStartQualification={handleBulkQualification}
        loading={bulkLoading}
      />
    </Card>
  );
}
