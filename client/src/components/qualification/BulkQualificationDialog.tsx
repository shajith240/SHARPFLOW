import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Zap,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
  Target,
  Sparkles,
} from "lucide-react";
import { Lead, BulkQualificationRequest } from "@/types/lead-generation";

interface BulkQualificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leads: Lead[];
  selectedLeads: string[];
  onStartQualification: (request: BulkQualificationRequest) => Promise<void>;
  loading?: boolean;
}

export function BulkQualificationDialog({
  open,
  onOpenChange,
  leads,
  selectedLeads,
  onStartQualification,
  loading = false,
}: BulkQualificationDialogProps) {
  const [qualificationType, setQualificationType] = useState<"selected" | "filtered" | "all">("selected");
  const [priority, setPriority] = useState<number>(5);
  const [includeQualified, setIncludeQualified] = useState(false);
  const [filters, setFilters] = useState({
    industry: "",
    location: "",
    leadStatus: "",
  });

  const getLeadsToProcess = () => {
    switch (qualificationType) {
      case "selected":
        return selectedLeads.length;
      case "filtered":
        return leads.filter(lead => {
          if (!includeQualified && lead.qualification_rating) return false;
          if (filters.industry && lead.industry !== filters.industry) return false;
          if (filters.location && !lead.location.includes(filters.location)) return false;
          if (filters.leadStatus && lead.lead_status !== filters.leadStatus) return false;
          return true;
        }).length;
      case "all":
        return includeQualified ? leads.length : leads.filter(lead => !lead.qualification_rating).length;
      default:
        return 0;
    }
  };

  const handleStartQualification = async () => {
    const request: BulkQualificationRequest = {
      priority,
    };

    if (qualificationType === "selected") {
      request.leadIds = selectedLeads;
    } else if (qualificationType === "filtered") {
      request.filters = {
        ...filters,
        ...(filters.industry && { industry: filters.industry }),
        ...(filters.location && { location: filters.location }),
        ...(filters.leadStatus && { leadStatus: filters.leadStatus }),
      };
    }

    await onStartQualification(request);
  };

  const leadsToProcess = getLeadsToProcess();
  const estimatedTime = Math.ceil(leadsToProcess * 0.5); // Rough estimate: 30 seconds per lead
  const estimatedCost = leadsToProcess * 0.02; // Rough estimate: $0.02 per lead

  const uniqueIndustries = Array.from(new Set(leads.map(lead => lead.industry))).sort();
  const uniqueLocations = Array.from(new Set(leads.map(lead => lead.location.split(",")[1]?.trim() || lead.location))).sort();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-dashboard-bg-secondary border-dashboard-border-primary">
        <DialogHeader>
          <DialogTitle className="text-dashboard-text-primary flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#C1FF72]" />
            Bulk Lead Qualification
          </DialogTitle>
          <DialogDescription className="text-dashboard-text-secondary">
            Use AI to automatically qualify multiple leads based on your criteria.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Qualification Type Selection */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-dashboard-text-primary">Qualification Scope</h4>
            <div className="grid gap-3">
              <div
                className={cn(
                  "flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-all duration-200",
                  qualificationType === "selected"
                    ? "border-[#C1FF72]/50 bg-[#C1FF72]/10"
                    : "border-dashboard-border-primary hover:border-dashboard-border-primary/70"
                )}
                onClick={() => setQualificationType("selected")}
              >
                <Checkbox
                  checked={qualificationType === "selected"}
                  onChange={() => setQualificationType("selected")}
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-dashboard-text-primary">Selected Leads</div>
                  <div className="text-xs text-dashboard-text-secondary">
                    Qualify {selectedLeads.length} manually selected leads
                  </div>
                </div>
                <Badge variant="outline" className="border-[#C1FF72]/30 text-[#C1FF72]">
                  {selectedLeads.length}
                </Badge>
              </div>

              <div
                className={cn(
                  "flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-all duration-200",
                  qualificationType === "filtered"
                    ? "border-[#38B6FF]/50 bg-[#38B6FF]/10"
                    : "border-dashboard-border-primary hover:border-dashboard-border-primary/70"
                )}
                onClick={() => setQualificationType("filtered")}
              >
                <Checkbox
                  checked={qualificationType === "filtered"}
                  onChange={() => setQualificationType("filtered")}
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-dashboard-text-primary">Filtered Leads</div>
                  <div className="text-xs text-dashboard-text-secondary">
                    Qualify leads matching specific criteria
                  </div>
                </div>
                <Filter className="w-4 h-4 text-[#38B6FF]" />
              </div>

              <div
                className={cn(
                  "flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-all duration-200",
                  qualificationType === "all"
                    ? "border-yellow-400/50 bg-yellow-400/10"
                    : "border-dashboard-border-primary hover:border-dashboard-border-primary/70"
                )}
                onClick={() => setQualificationType("all")}
              >
                <Checkbox
                  checked={qualificationType === "all"}
                  onChange={() => setQualificationType("all")}
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-dashboard-text-primary">All Leads</div>
                  <div className="text-xs text-dashboard-text-secondary">
                    Qualify all unqualified leads in your database
                  </div>
                </div>
                <Users className="w-4 h-4 text-yellow-400" />
              </div>
            </div>
          </div>

          {/* Filters for filtered qualification */}
          <AnimatePresence>
            {qualificationType === "filtered" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3"
              >
                <h4 className="text-sm font-medium text-dashboard-text-primary">Filter Criteria</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Select value={filters.industry} onValueChange={(value) => setFilters(prev => ({ ...prev, industry: value }))}>
                    <SelectTrigger className="bg-dashboard-bg-tertiary border-dashboard-border-primary">
                      <SelectValue placeholder="Industry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Industries</SelectItem>
                      {uniqueIndustries.map(industry => (
                        <SelectItem key={industry} value={industry}>{industry}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={filters.location} onValueChange={(value) => setFilters(prev => ({ ...prev, location: value }))}>
                    <SelectTrigger className="bg-dashboard-bg-tertiary border-dashboard-border-primary">
                      <SelectValue placeholder="Location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Locations</SelectItem>
                      {uniqueLocations.map(location => (
                        <SelectItem key={location} value={location}>{location}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={filters.leadStatus} onValueChange={(value) => setFilters(prev => ({ ...prev, leadStatus: value }))}>
                    <SelectTrigger className="bg-dashboard-bg-tertiary border-dashboard-border-primary">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Statuses</SelectItem>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="qualified">Qualified</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Options */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-dashboard-text-primary">Options</h4>
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={includeQualified}
                onCheckedChange={setIncludeQualified}
              />
              <label className="text-sm text-dashboard-text-secondary">
                Re-qualify already qualified leads
              </label>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-dashboard-bg-tertiary/30 rounded-lg p-4 space-y-3">
            <h4 className="text-sm font-medium text-dashboard-text-primary flex items-center gap-2">
              <Target className="w-4 h-4" />
              Qualification Summary
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-dashboard-text-secondary">Leads to process:</span>
                <span className="ml-2 font-medium text-dashboard-text-primary">{leadsToProcess}</span>
              </div>
              <div>
                <span className="text-dashboard-text-secondary">Estimated time:</span>
                <span className="ml-2 font-medium text-dashboard-text-primary">{estimatedTime}min</span>
              </div>
            </div>
            {leadsToProcess === 0 && (
              <div className="flex items-center gap-2 text-yellow-400">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm">No leads match the selected criteria</span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-dashboard-border-primary text-dashboard-text-primary hover:bg-dashboard-interactive-hover"
          >
            Cancel
          </Button>
          <Button
            onClick={handleStartQualification}
            disabled={loading || leadsToProcess === 0}
            className="bg-[#C1FF72] text-black hover:bg-[#C1FF72]/90"
          >
            {loading ? (
              <>
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Start Qualification ({leadsToProcess} leads)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default BulkQualificationDialog;
