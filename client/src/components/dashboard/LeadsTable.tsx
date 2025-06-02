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
  Trash2
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

import { Lead, SubscriptionPlan, PLAN_FEATURES } from "@/types/lead-generation";

interface LeadsTableProps {
  leads: Lead[];
  userPlan: SubscriptionPlan;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  industryFilter: string;
  onIndustryFilterChange: (value: string) => void;
  locationFilter: string;
  onLocationFilterChange: (value: string) => void;
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
}: LeadsTableProps) {
  const [sortField, setSortField] = useState<keyof Lead>("dateAdded");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const planFeatures = PLAN_FEATURES[userPlan];

  // Get unique industries and locations for filters
  const industries = useMemo(() => 
    Array.from(new Set(leads.map(lead => lead.industry))).sort(),
    [leads]
  );
  
  const locations = useMemo(() => 
    Array.from(new Set(leads.map(lead => lead.location.split(',')[1]?.trim() || lead.location))).sort(),
    [leads]
  );

  // Filter and sort leads
  const filteredLeads = useMemo(() => {
    let filtered = leads.filter(lead => {
      const matchesSearch = 
        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.title.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesIndustry = industryFilter === "all" || lead.industry === industryFilter;
      const matchesLocation = locationFilter === "all" || lead.location.includes(locationFilter);
      
      return matchesSearch && matchesIndustry && matchesLocation;
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
  }, [leads, searchTerm, industryFilter, locationFilter, sortField, sortDirection]);

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
      contacted: { color: "bg-yellow-500/20 text-yellow-400", label: "Contacted" },
      qualified: { color: "bg-green-500/20 text-green-400", label: "Qualified" },
      converted: { color: "bg-purple-500/20 text-purple-400", label: "Converted" },
      rejected: { color: "bg-red-500/20 text-red-400", label: "Rejected" },
    };
    
    const config = statusConfig[status];
    return (
      <Badge className={`${config.color} border-none`}>
        {config.label}
      </Badge>
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-400";
    if (score >= 70) return "text-yellow-400";
    return "text-red-400";
  };

  const handleExport = () => {
    // Export functionality based on plan
    const exportData = filteredLeads.map(lead => ({
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
      ...exportData.map(row => Object.values(row).join(","))
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
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
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
              <Select value={industryFilter} onValueChange={onIndustryFilterChange}>
                <SelectTrigger className="w-full sm:w-48 bg-dashboard-bg-tertiary border-dashboard-border-primary text-dashboard-text-primary">
                  <SelectValue placeholder="Industry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Industries</SelectItem>
                  {industries.map(industry => (
                    <SelectItem key={industry} value={industry}>
                      {industry}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={locationFilter} onValueChange={onLocationFilterChange}>
                <SelectTrigger className="w-full sm:w-48 bg-dashboard-bg-tertiary border-dashboard-border-primary text-dashboard-text-primary">
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.map(location => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
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
                <TableHead className="text-dashboard-text-secondary">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedLeads.map((lead, index) => (
                <motion.tr
                  key={lead.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-dashboard-border-primary hover:bg-dashboard-bg-tertiary/30 transition-colors"
                >
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
                        {lead.linkedinUrl && <ExternalLink className="w-3 h-3" />}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-dashboard-text-secondary" />
                      <span className="text-dashboard-text-primary">{lead.company}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-dashboard-border-primary text-dashboard-text-primary">
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
                    <div className="flex items-center gap-1">
                      <Star className={`w-4 h-4 ${getScoreColor(lead.score)}`} />
                      <span className={`font-medium ${getScoreColor(lead.score)}`}>
                        {lead.score}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(lead.status)}
                  </TableCell>
                  <TableCell className="text-dashboard-text-primary">
                    {new Date(lead.dateAdded).toLocaleDateString()}
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
                      <DropdownMenuContent align="end" className="bg-dashboard-bg-tertiary border-dashboard-border-primary">
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
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredLeads.length)} of {filteredLeads.length} leads
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
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="border-dashboard-border-primary text-dashboard-text-primary hover:bg-dashboard-interactive-hover"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
