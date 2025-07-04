import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { CustomTooltip } from "@/components/ui/custom-tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Search,
  Download,
  ExternalLink,
  Eye,
  Star,
  RefreshCw,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Globe,
  Linkedin,
  FileText,
  Edit,
  Trash2,
  MoreHorizontal,
  Calendar,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Target,
  BarChart3,
  Settings,
  Play,
  Loader2,
} from "lucide-react";
import { QualificationStatsWidget } from "@/components/qualification/QualificationStatsWidget";
import { QualificationProgressTracker } from "@/components/qualification/QualificationProgressTracker";
import { QualificationManagementPanel } from "@/components/qualification/QualificationManagementPanel";
import { useQualificationStats } from "@/hooks/useQualificationStats";
import { useBulkQualification } from "@/hooks/useBulkQualification";
import { transformDatabaseLeads } from "@/utils/leadTransforms";
import { Lead, SubscriptionPlan } from "@/types/lead-generation";

interface LeadsStats {
  totalLeads: number;
  newLeads: number;
  contactedLeads: number;
  qualifiedLeads: number;
  thisWeekLeads: number;
}

export default function LeadsDashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<LeadsStats>({
    totalLeads: 0,
    newLeads: 0,
    contactedLeads: 0,
    qualifiedLeads: 0,
    thisWeekLeads: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [activeTab, setActiveTab] = useState("leads");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const leadsPerPage = 10;

  // Qualification hooks
  const {
    stats: qualificationStats,
    loading: qualStatsLoading,
    refetch: refetchQualStats,
  } = useQualificationStats();
  const {
    jobs: qualificationJobs,
    startBulkQualification,
    cancelJob,
    retryJob,
    loading: bulkLoading,
  } = useBulkQualification({
    onJobComplete: () => {
      fetchLeads(); // Refresh leads when qualification completes
      refetchQualStats(); // Refresh qualification stats
    },
  });

  useEffect(() => {
    fetchLeads();
    fetchLeadsStats();
  }, []);

  const fetchLeads = async () => {
    try {
      setLoading(true);

      // Fetch all leads by requesting a large limit to get all data
      // Add cache-busting parameter to force fresh data
      const response = await fetch(
        `/api/leads?limit=1000&page=1&t=${Date.now()}`
      );

      if (response.ok) {
        const data = await response.json();
        console.log("Fetched leads data:", data); // Debug logging

        // Transform database leads to include qualification fields
        const transformedLeads = transformDatabaseLeads(data.leads || []);
        setLeads(transformedLeads);

        // Log the count for debugging
        console.log(`Total leads fetched: ${transformedLeads.length}`);
        console.log("Pagination info:", data.pagination);

        // Debug: Check if qualification data is present
        const qualifiedLeads = transformedLeads.filter(
          (lead) => lead.qualification_rating
        );
        console.log(
          `🔍 DEBUG - Qualified leads found: ${qualifiedLeads.length}`
        );
        if (qualifiedLeads.length > 0) {
          console.log("🔍 DEBUG - Sample qualified lead:", qualifiedLeads[0]);
          console.log("🔍 DEBUG - Qualification fields:", {
            rating: qualifiedLeads[0].qualification_rating,
            score: qualifiedLeads[0].qualification_score,
            auto_qualified: qualifiedLeads[0].auto_qualified,
          });
        } else {
          console.log(
            "🔍 DEBUG - No qualified leads found. Checking first 3 leads:"
          );
          transformedLeads.slice(0, 3).forEach((lead, index) => {
            console.log(`🔍 DEBUG - Lead ${index + 1}:`, {
              name: lead.full_name,
              rating: lead.qualification_rating,
              score: lead.qualification_score,
              hasRating: !!lead.qualification_rating,
            });
          });
        }
      } else {
        console.error(
          "Failed to fetch leads:",
          response.status,
          response.statusText
        );
        const errorData = await response.text();
        console.error("Error response:", errorData);
      }
    } catch (error) {
      console.error("Error fetching leads:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeadsStats = async () => {
    try {
      const response = await fetch("/api/leads/stats");
      if (response.ok) {
        const data = await response.json();
        console.log("Fetched stats data:", data); // Debug logging
        setStats(data);
      } else {
        console.error(
          "Failed to fetch stats:",
          response.status,
          response.statusText
        );
        const errorData = await response.text();
        console.error("Stats error response:", errorData);
      }
    } catch (error) {
      console.error("Error fetching leads stats:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      new: {
        color:
          "bg-dashboard-primary/10 text-dashboard-primary border-dashboard-primary/20",
        label: "New",
        icon: Star,
      },
      contacted: {
        color:
          "bg-dashboard-status-warning/10 text-dashboard-status-warning border-dashboard-status-warning/20",
        label: "Contacted",
        icon: Mail,
      },
      qualified: {
        color:
          "bg-dashboard-status-success/10 text-dashboard-status-success border-dashboard-status-success/20",
        label: "Qualified",
        icon: TrendingUp,
      },
      converted: {
        color:
          "bg-dashboard-secondary/10 text-dashboard-secondary border-dashboard-secondary/20",
        label: "Converted",
        icon: Star,
      },
      rejected: {
        color:
          "bg-dashboard-status-error/10 text-dashboard-status-error border-dashboard-status-error/20",
        label: "Rejected",
        icon: ExternalLink,
      },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || {
      color:
        "bg-dashboard-text-muted/10 text-dashboard-text-muted border-dashboard-text-muted/20",
      label: status,
      icon: Star,
    };

    const IconComponent = config.icon;

    return (
      <Badge
        variant="outline"
        className={`${config.color} font-medium status-badge`}
      >
        <IconComponent className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

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

  // Get qualification row styling for visual classification
  const getQualificationRowStyles = (lead: Lead) => {
    const rating = lead.qualification_rating;

    if (!rating) {
      // Unqualified leads - neutral styling with subtle left border
      return "border-b border-dashboard-border-primary hover:bg-dashboard-bg-accent/50 transition-colors border-l-2 border-l-gray-600/30";
    }

    // Qualified leads with flat design indicators
    switch (rating) {
      case "high":
        // High quality - flat design with subtle indicators
        return "border-b border-dashboard-border-primary hover:bg-dashboard-bg-accent/30 transition-all duration-200 bg-[#C1FF72]/3 border-l-3 border-l-[#C1FF72]/70";
      case "medium":
        // Medium quality - flat design with subtle indicators
        return "border-b border-dashboard-border-primary hover:bg-dashboard-bg-accent/30 transition-all duration-200 bg-[#38B6FF]/3 border-l-3 border-l-[#38B6FF]/70";
      case "low":
        // Low quality - flat design with subtle indicators
        return "border-b border-dashboard-border-primary hover:bg-dashboard-bg-accent/30 transition-all duration-200 bg-yellow-400/3 border-l-3 border-l-yellow-400/70";
      default:
        return "border-b border-dashboard-border-primary hover:bg-dashboard-bg-accent/30 transition-all duration-200 border-l-2 border-l-gray-500/20";
    }
  };

  const handleBulkQualification = async (leadIds: string[]) => {
    try {
      await startBulkQualification({ leadIds });
      console.log("✅ Bulk qualification started successfully!");
    } catch (error) {
      console.error("❌ Failed to start bulk qualification:", error);
    }
  };

  const handleTestQualification = async () => {
    try {
      // Get first 5 unqualified leads for testing
      const unqualifiedLeads = leads
        .filter((lead) => !lead.qualification_rating)
        .slice(0, 5)
        .map((lead) => lead.id);

      if (unqualifiedLeads.length === 0) {
        console.log("⚠️ No unqualified leads found to test with");
        return;
      }

      console.log(
        `🎯 Starting qualification for ${unqualifiedLeads.length} leads...`
      );
      await startBulkQualification({ leadIds: unqualifiedLeads });
      console.log(
        `✅ Started qualification for ${unqualifiedLeads.length} leads!`
      );
    } catch (error) {
      console.error("❌ Failed to start test qualification:", error);
    }
  };

  const handleQualificationSettings = async (settings: any) => {
    try {
      // Save qualification settings
      console.log("Saving qualification settings:", settings);
    } catch (error) {
      console.error("Failed to save qualification settings:", error);
    }
  };

  const handleManualOverride = async (
    leadId: string,
    rating: string,
    reasoning: string
  ) => {
    try {
      // Apply manual qualification override
      console.log("Applying manual override:", { leadId, rating, reasoning });
    } catch (error) {
      console.error("Failed to apply manual override:", error);
    }
  };

  // Function to standardize text capitalization
  const standardizeCapitalization = (
    text: string,
    type: "title" | "company" | "name"
  ) => {
    if (!text) return text;

    const cleanText = text.trim();

    switch (type) {
      case "title":
        // Convert job titles to proper title case
        return cleanText
          .toLowerCase()
          .split(" ")
          .map((word) => {
            // Handle common abbreviations and special cases
            const upperCaseWords = [
              "ceo",
              "cto",
              "cfo",
              "coo",
              "vp",
              "hr",
              "it",
              "ui",
              "ux",
              "api",
              "seo",
              "ppc",
            ];
            const lowerCaseWords = [
              "of",
              "and",
              "the",
              "in",
              "at",
              "for",
              "to",
              "with",
            ];

            if (upperCaseWords.includes(word.toLowerCase())) {
              return word.toUpperCase();
            } else if (
              lowerCaseWords.includes(word.toLowerCase()) &&
              cleanText.split(" ").indexOf(word) !== 0
            ) {
              return word.toLowerCase();
            } else {
              return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            }
          })
          .join(" ");

      case "company":
        // Preserve company name capitalization but fix obvious issues
        return cleanText
          .split(" ")
          .map((word) => {
            // Don't change words that are already properly capitalized
            if (word === word.toUpperCase() && word.length > 1) {
              // Handle all-caps company names
              return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            }
            return word;
          })
          .join(" ");

      case "name":
        // Proper name capitalization
        return cleanText
          .toLowerCase()
          .split(" ")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");

      default:
        return cleanText;
    }
  };

  // Function to check if job title is "Owner" (case insensitive)
  const isOwnerRole = (jobTitle: string) => {
    if (!jobTitle) return false;
    const normalized = jobTitle.toLowerCase().trim();
    return (
      normalized === "owner" ||
      normalized === "business owner" ||
      normalized === "company owner"
    );
  };

  // Function to clean text data and remove unwanted icons/emojis
  const cleanTextData = (text: string): string => {
    if (!text) return text;

    // Remove common unwanted emojis and icons
    const unwantedEmojis = [
      "🍽️",
      "🏢",
      "🏬",
      "🏭",
      "🏪",
      "🏫",
      "🏨",
      "🏦",
      "🏛️",
      "⛪",
      "🕌",
      "🏩",
      "🏰",
      "🏯",
      "🗼",
      "🗽",
      "🎪",
      "🎭",
      "🎨",
      "🎬",
      "🎤",
      "🎧",
      "🎼",
      "🎵",
      "🎶",
      "🎯",
      "🎲",
      "🎰",
      "🃏",
      "🀄",
      "🎴",
      "🔧",
      "🔨",
      "⚒️",
      "🛠️",
      "⚙️",
      "🔩",
      "⚡",
      "🔥",
      "💧",
      "❄️",
      "☀️",
      "🌙",
      "⭐",
      "🌟",
      "💫",
      "🌈",
      "☁️",
      "⛅",
      "⛈️",
      "🌤️",
      "🌦️",
      "🌧️",
      "⛆",
      "❄️",
      "☃️",
      "⛄",
      "🌬️",
      "💨",
      "🌪️",
      "🌊",
    ];

    let cleanedText = text;

    // Remove unwanted emojis
    unwantedEmojis.forEach((emoji) => {
      cleanedText = cleanedText.replace(new RegExp(emoji, "g"), "");
    });

    // Remove other common unwanted patterns
    cleanedText = cleanedText
      .replace(/[\u{1F300}-\u{1F5FF}]/gu, "") // Miscellaneous Symbols and Pictographs
      .replace(/[\u{1F600}-\u{1F64F}]/gu, "") // Emoticons
      .replace(/[\u{1F680}-\u{1F6FF}]/gu, "") // Transport and Map Symbols
      .replace(/[\u{1F700}-\u{1F77F}]/gu, "") // Alchemical Symbols
      .replace(/[\u{1F780}-\u{1F7FF}]/gu, "") // Geometric Shapes Extended
      .replace(/[\u{1F800}-\u{1F8FF}]/gu, "") // Supplemental Arrows-C
      .replace(/[\u{2600}-\u{26FF}]/gu, "") // Miscellaneous Symbols
      .replace(/[\u{2700}-\u{27BF}]/gu, "") // Dingbats
      .trim();

    // Keep only country flag emojis (Regional Indicator Symbols)
    // These are in the range U+1F1E6-U+1F1FF and should be preserved for country flags

    return cleanedText;
  };

  // Enhanced function to get country flag emoji with comprehensive mapping
  const getCountryFlag = (countryName: string) => {
    if (!countryName) return "🌍";

    const countryFlags: { [key: string]: string } = {
      // Major countries with multiple variations
      "united states": "🇺🇸",
      "united states of america": "🇺🇸",
      usa: "🇺🇸",
      us: "🇺🇸",
      america: "🇺🇸",
      "u.s.": "🇺🇸",
      "u.s.a.": "🇺🇸",
      canada: "🇨🇦",
      ca: "🇨🇦",
      "united kingdom": "🇬🇧",
      uk: "🇬🇧",
      britain: "🇬🇧",
      england: "🇬🇧",
      "great britain": "🇬🇧",
      gb: "🇬🇧",
      germany: "🇩🇪",
      deutschland: "🇩🇪",
      de: "🇩🇪",
      france: "🇫🇷",
      fr: "🇫🇷",
      italy: "🇮🇹",
      italia: "🇮🇹",
      it: "🇮🇹",
      spain: "🇪🇸",
      españa: "🇪🇸",
      es: "🇪🇸",
      netherlands: "🇳🇱",
      holland: "🇳🇱",
      nl: "🇳🇱",
      belgium: "🇧🇪",
      be: "🇧🇪",
      switzerland: "🇨🇭",
      ch: "🇨🇭",
      austria: "🇦🇹",
      at: "🇦🇹",
      sweden: "🇸🇪",
      se: "🇸🇪",
      norway: "🇳🇴",
      no: "🇳🇴",
      denmark: "🇩🇰",
      dk: "🇩🇰",
      finland: "🇫🇮",
      fi: "🇫🇮",
      poland: "🇵🇱",
      pl: "🇵🇱",
      "czech republic": "🇨🇿",
      czechia: "🇨🇿",
      cz: "🇨🇿",
      hungary: "🇭🇺",
      hu: "🇭🇺",
      romania: "🇷🇴",
      ro: "🇷🇴",
      bulgaria: "🇧🇬",
      bg: "🇧🇬",
      greece: "🇬🇷",
      gr: "🇬🇷",
      portugal: "🇵🇹",
      pt: "🇵🇹",
      ireland: "🇮🇪",
      ie: "🇮🇪",
      luxembourg: "🇱🇺",
      lu: "🇱🇺",
      malta: "🇲🇹",
      mt: "🇲🇹",
      cyprus: "🇨🇾",
      cy: "🇨🇾",
      estonia: "🇪🇪",
      ee: "🇪🇪",
      latvia: "🇱🇻",
      lv: "🇱🇻",
      lithuania: "🇱🇹",
      lt: "🇱🇹",
      slovenia: "🇸🇮",
      si: "🇸🇮",
      slovakia: "🇸🇰",
      sk: "🇸🇰",
      croatia: "🇭🇷",
      hr: "🇭🇷",

      // Asia Pacific
      china: "🇨🇳",
      "people's republic of china": "🇨🇳",
      prc: "🇨🇳",
      cn: "🇨🇳",
      japan: "🇯🇵",
      jp: "🇯🇵",
      "south korea": "🇰🇷",
      korea: "🇰🇷",
      "republic of korea": "🇰🇷",
      kr: "🇰🇷",
      india: "🇮🇳",
      in: "🇮🇳",
      singapore: "🇸🇬",
      sg: "🇸🇬",
      "hong kong": "🇭🇰",
      hk: "🇭🇰",
      taiwan: "🇹🇼",
      "republic of china": "🇹🇼",
      tw: "🇹🇼",
      thailand: "🇹🇭",
      th: "🇹🇭",
      malaysia: "🇲🇾",
      my: "🇲🇾",
      indonesia: "🇮🇩",
      id: "🇮🇩",
      philippines: "🇵🇭",
      ph: "🇵🇭",
      vietnam: "🇻🇳",
      vn: "🇻🇳",
      australia: "🇦🇺",
      au: "🇦🇺",
      "new zealand": "🇳🇿",
      nz: "🇳🇿",

      // Middle East & Africa
      israel: "🇮🇱",
      il: "🇮🇱",
      uae: "🇦🇪",
      "united arab emirates": "🇦🇪",
      ae: "🇦🇪",
      "saudi arabia": "🇸🇦",
      sa: "🇸🇦",
      turkey: "🇹🇷",
      tr: "🇹🇷",
      "south africa": "🇿🇦",
      za: "🇿🇦",
      egypt: "🇪🇬",
      eg: "🇪🇬",
      nigeria: "🇳🇬",
      ng: "🇳🇬",
      kenya: "🇰🇪",
      ke: "🇰🇪",
      morocco: "🇲🇦",
      ma: "🇲🇦",

      // Americas
      brazil: "🇧🇷",
      br: "🇧🇷",
      mexico: "🇲🇽",
      mx: "🇲🇽",
      argentina: "🇦🇷",
      ar: "🇦🇷",
      chile: "🇨🇱",
      cl: "🇨🇱",
      colombia: "🇨🇴",
      co: "🇨🇴",
      peru: "🇵🇪",
      pe: "🇵🇪",
      venezuela: "🇻🇪",
      ve: "🇻🇪",
      ecuador: "🇪🇨",
      ec: "🇪🇨",
      uruguay: "🇺🇾",
      uy: "🇺🇾",
      paraguay: "🇵🇾",
      py: "🇵🇾",
      bolivia: "🇧🇴",
      bo: "🇧🇴",

      // Others
      russia: "🇷🇺",
      "russian federation": "🇷🇺",
      ru: "🇷🇺",
      ukraine: "🇺🇦",
      ua: "🇺🇦",
      belarus: "🇧🇾",
      by: "🇧🇾",
      kazakhstan: "🇰🇿",
      kz: "🇰🇿",
    };

    // Normalize the country name for lookup
    const normalizedCountry = countryName
      .toLowerCase()
      .trim()
      .replace(/[.,]/g, "");

    // Try exact match first
    let flag = countryFlags[normalizedCountry];

    // If no exact match, try partial matching for common patterns
    if (!flag) {
      for (const [key, value] of Object.entries(countryFlags)) {
        if (
          normalizedCountry.includes(key) ||
          key.includes(normalizedCountry)
        ) {
          flag = value;
          break;
        }
      }
    }

    return flag || "🌍";
  };

  // Filter leads based on search and status
  const filteredLeads = leads.filter((lead) => {
    // Handle potential null/undefined values safely
    const fullName = lead.full_name || "";
    const emailAddress = lead.email_address || "";
    const companyName = lead.company_name || "";
    const jobTitle = lead.job_title || "";
    const industry = lead.industry || "";
    const location = lead.location || "";

    const matchesSearch =
      searchTerm === "" ||
      fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emailAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
      companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      jobTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      industry.toLowerCase().includes(searchTerm.toLowerCase()) ||
      location.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || lead.lead_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Debug logging for filtering
  React.useEffect(() => {
    console.log(`Total leads: ${leads.length}`);
    console.log(`Filtered leads: ${filteredLeads.length}`);
    console.log(`Search term: "${searchTerm}"`);
    console.log(`Status filter: "${statusFilter}"`);
    if (leads.length > 0 && filteredLeads.length === 0) {
      console.log("Sample lead for debugging:", leads[0]);
    }
  }, [leads.length, filteredLeads.length, searchTerm, statusFilter]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredLeads.length / leadsPerPage);
  const startIndex = (currentPage - 1) * leadsPerPage;
  const endIndex = startIndex + leadsPerPage;
  const paginatedLeads = filteredLeads.slice(startIndex, endIndex);

  // Export function - updated for 9 columns (removed Status and Seniority)
  const exportLeads = () => {
    const csvContent = [
      [
        "Full Name",
        "Email Address",
        "Phone Number",
        "Country",
        "Location",
        "Industry",
        "Company Name",
        "Job Title",
        "Website URL",
        "LinkedIn URL",
        "Research Report",
      ],
      ...filteredLeads.map((lead) => [
        lead.full_name,
        lead.email_address,
        lead.phone_number,
        lead.country,
        lead.location,
        lead.industry,
        lead.company_name,
        lead.job_title,
        lead.website_url,
        lead.linkedin_url,
        lead.research_report || "",
      ]),
    ]
      .map((row) =>
        row
          .map((field) => `"${String(field || "").replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sharpflow-leads-${
      new Date().toISOString().split("T")[0]
    }.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Reset to first page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
          <p className="mt-2 text-gray-600">Loading leads...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-fluid-3xl font-bold text-dashboard-text-primary">
            Leads Dashboard
          </h2>
          <p className="text-dashboard-text-secondary mt-1">
            Manage and analyze your generated leads with AI qualification
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={fetchLeads}
            variant="outline"
            size="sm"
            className="border-dashboard-border-primary text-dashboard-text-primary hover:bg-dashboard-bg-accent shadow-flat-subtle transition-all duration-200"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Leads
          </Button>
          <Button
            onClick={() => {
              console.log("🔄 Manual refresh triggered");
              fetchLeads();
            }}
            variant="default"
            size="sm"
            className="bg-[#38B6FF] hover:bg-[#38B6FF]/90 text-white shadow-flat-subtle transition-all duration-200"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Force Refresh
          </Button>
          <Button
            onClick={() => {
              console.log("🔍 DEBUG - Current leads data:", leads);
              const qualifiedLeads = leads.filter(
                (lead) => lead.qualification_rating
              );
              console.log(
                "🔍 DEBUG - Qualified leads in state:",
                qualifiedLeads.length
              );
              if (qualifiedLeads.length > 0) {
                console.log(
                  "🔍 DEBUG - First qualified lead:",
                  qualifiedLeads[0]
                );
              }
            }}
            variant="outline"
            size="sm"
            className="border-yellow-400/50 text-yellow-400 hover:bg-yellow-400/10 shadow-flat-subtle transition-all duration-200"
          >
            Debug Data
          </Button>
        </div>
      </div>

      {/* Enhanced Tabs with Qualification Features */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-4 bg-dashboard-bg-tertiary">
          <TabsTrigger
            value="leads"
            className="data-[state=active]:bg-dashboard-primary data-[state=active]:text-black"
          >
            <Users className="w-4 h-4 mr-2" />
            Leads
          </TabsTrigger>
          <TabsTrigger
            value="qualification"
            className="data-[state=active]:bg-dashboard-primary data-[state=active]:text-black"
          >
            <Target className="w-4 h-4 mr-2" />
            Qualification
          </TabsTrigger>
          <TabsTrigger
            value="progress"
            className="data-[state=active]:bg-dashboard-primary data-[state=active]:text-black"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Progress
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className="data-[state=active]:bg-dashboard-primary data-[state=active]:text-black"
          >
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Leads Tab - Original Content */}
        <TabsContent value="leads" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="static-card bg-dashboard-bg-secondary/50 backdrop-blur-sm border-dashboard-border-primary hover:border-dashboard-primary/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-dashboard-text-secondary flex items-center gap-2">
                  <Users className="w-4 h-4 text-dashboard-primary" />
                  Total Leads
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-dashboard-text-primary">
                  {stats.totalLeads.toLocaleString()}
                </div>
                <p className="text-xs text-dashboard-text-muted">All time</p>
              </CardContent>
            </Card>

            <Card className="static-card bg-dashboard-bg-secondary/50 backdrop-blur-sm border-dashboard-border-primary hover:border-dashboard-primary/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-dashboard-text-secondary flex items-center gap-2">
                  <Star className="w-4 h-4 text-dashboard-primary" />
                  New Leads
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-dashboard-text-primary">
                  {stats.newLeads.toLocaleString()}
                </div>
                <p className="text-xs text-dashboard-text-muted">Uncontacted</p>
              </CardContent>
            </Card>

            <Card className="static-card bg-dashboard-bg-secondary/50 backdrop-blur-sm border-dashboard-border-primary hover:border-dashboard-primary/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-dashboard-text-secondary flex items-center gap-2">
                  <Mail className="w-4 h-4 text-dashboard-status-warning" />
                  Contacted
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-dashboard-text-primary">
                  {stats.contactedLeads.toLocaleString()}
                </div>
                <p className="text-xs text-dashboard-text-muted">
                  Outreach sent
                </p>
              </CardContent>
            </Card>

            <Card className="static-card bg-dashboard-bg-secondary/50 backdrop-blur-sm border-dashboard-border-primary hover:border-dashboard-primary/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-dashboard-text-secondary flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-dashboard-status-success" />
                  Qualified
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-dashboard-text-primary">
                  {stats.qualifiedLeads.toLocaleString()}
                </div>
                <p className="text-xs text-dashboard-text-muted">
                  High potential
                </p>
              </CardContent>
            </Card>

            <Card className="static-card bg-dashboard-bg-secondary/50 backdrop-blur-sm border-dashboard-border-primary hover:border-dashboard-primary/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-dashboard-text-secondary flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-dashboard-secondary" />
                  This Week
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-dashboard-text-primary">
                  {stats.thisWeekLeads.toLocaleString()}
                </div>
                <p className="text-xs text-dashboard-text-muted">New leads</p>
              </CardContent>
            </Card>
          </div>

          {/* Flat Design Leads Table - Professional SaaS */}
          <div className="leads-table-container mx-auto my-6 w-full max-w-[98vw] lg:max-w-[96vw] xl:max-w-[94vw] 2xl:max-w-[92vw] bg-flat-surface border border-dashboard-border-primary shadow-flat-card">
            {/* Apple-Inspired Header Section */}
            <div className="leads-table-header px-6 py-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <h1 className="text-apple-title text-dashboard-text-primary flex items-center gap-3">
                    <Users className="w-5 h-5 text-dashboard-primary" />
                    Lead Management
                  </h1>
                  <p className="text-apple-body text-dashboard-text-secondary max-w-2xl">
                    Manage and track your leads with professional-grade tools
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={exportLeads}
                    variant="outline"
                    size="default"
                    className="leads-table-header-button border-dashboard-border-primary text-dashboard-text-primary hover:bg-dashboard-bg-accent shadow-flat-subtle"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </div>
            </div>

            {/* Flat Design Search Section */}
            <div className="leads-table-search-section px-6 py-4 border-b border-dashboard-border-primary bg-dashboard-bg-primary/30">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dashboard-text-secondary w-4 h-4" />
                    <Input
                      placeholder="Search leads by name, company, email, job title, industry, or location..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-dashboard-bg-primary border-dashboard-border-primary text-dashboard-text-primary placeholder:text-dashboard-text-muted focus:shadow-flat-focus focus:border-dashboard-primary transition-all duration-200"
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 min-w-fit">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[180px] bg-dashboard-bg-primary border-dashboard-border-primary text-dashboard-text-primary shadow-sm">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent className="bg-dashboard-bg-primary border-dashboard-border-primary">
                      <SelectItem
                        value="all"
                        className="text-dashboard-text-primary hover:bg-dashboard-bg-accent"
                      >
                        All Status
                      </SelectItem>
                      <SelectItem
                        value="new"
                        className="text-dashboard-text-primary hover:bg-dashboard-bg-accent"
                      >
                        New
                      </SelectItem>
                      <SelectItem
                        value="contacted"
                        className="text-dashboard-text-primary hover:bg-dashboard-bg-accent"
                      >
                        Contacted
                      </SelectItem>
                      <SelectItem
                        value="qualified"
                        className="text-dashboard-text-primary hover:bg-dashboard-bg-accent"
                      >
                        Qualified
                      </SelectItem>
                      <SelectItem
                        value="converted"
                        className="text-dashboard-text-primary hover:bg-dashboard-bg-accent"
                      >
                        Converted
                      </SelectItem>
                      <SelectItem
                        value="rejected"
                        className="text-dashboard-text-primary hover:bg-dashboard-bg-accent"
                      >
                        Rejected
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="leads-count-indicator flex items-center gap-2 text-dashboard-text-secondary">
                    <Users className="w-4 h-4" />
                    <span className="font-medium">
                      {filteredLeads.length} leads
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Professional Table Content */}
            <div className="leads-table-content">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-dashboard-border-primary hover:bg-transparent">
                    <TableHead className="h-11 px-4 text-left align-middle text-apple-caption text-dashboard-text-secondary">
                      Full Name
                    </TableHead>
                    <TableHead className="h-11 px-4 text-left align-middle text-apple-caption text-dashboard-text-secondary">
                      Email Address
                    </TableHead>
                    <TableHead className="h-11 px-4 text-left align-middle text-apple-caption text-dashboard-text-secondary">
                      Phone Number
                    </TableHead>
                    <TableHead className="h-11 px-4 text-center align-middle text-apple-caption text-dashboard-text-secondary">
                      Country
                    </TableHead>
                    <TableHead className="h-11 px-4 text-left align-middle text-apple-caption text-dashboard-text-secondary">
                      Location
                    </TableHead>
                    <TableHead className="h-11 px-4 text-left align-middle text-apple-caption text-dashboard-text-secondary">
                      Industry
                    </TableHead>
                    <TableHead className="h-11 px-4 text-left align-middle text-apple-caption text-dashboard-text-secondary">
                      Company Name
                    </TableHead>
                    <TableHead className="h-11 px-4 text-left align-middle text-apple-caption text-dashboard-text-secondary">
                      Job Title
                    </TableHead>
                    <TableHead className="h-11 px-4 text-left align-middle text-apple-caption text-dashboard-text-secondary">
                      Qualification
                    </TableHead>
                    <TableHead className="h-11 px-4 text-left align-middle text-apple-caption text-dashboard-text-secondary">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.length === 0 ? (
                    <TableRow className="border-b border-dashboard-border-primary">
                      <TableCell
                        colSpan={10}
                        className="p-4 align-middle text-center py-12 text-dashboard-text-muted"
                      >
                        <div className="flex flex-col items-center gap-4">
                          <Users className="w-16 h-16 text-dashboard-text-muted" />
                          <div>
                            <h3 className="text-lg font-semibold text-dashboard-text-primary mb-2">
                              No leads found
                            </h3>
                            <p className="text-dashboard-text-secondary">
                              {searchTerm || statusFilter !== "all"
                                ? "Try adjusting your filters to see more results"
                                : "Start generating leads with your Telegram bot"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedLeads.map((lead) => (
                      <TableRow
                        key={lead.id}
                        className={getQualificationRowStyles(lead)}
                      >
                        {/* Full Name - Apple-Inspired Typography */}
                        <TableCell className="p-4 align-middle">
                          <CustomTooltip
                            content={standardizeCapitalization(
                              lead.full_name,
                              "name"
                            )}
                            delay={200}
                            offset={{ x: 0, y: -12 }}
                          >
                            <span className="lead-primary-info cursor-help text-dashboard-text-primary inline-block">
                              {truncateText(
                                standardizeCapitalization(
                                  lead.full_name,
                                  "name"
                                ),
                                15
                              )}
                            </span>
                          </CustomTooltip>
                        </TableCell>

                        {/* Email Address - Professional Styling */}
                        <TableCell className="p-4 align-middle">
                          {lead.email_address ? (
                            <CustomTooltip
                              content={lead.email_address}
                              delay={200}
                              offset={{ x: 0, y: -12 }}
                            >
                              <a
                                href={`mailto:${lead.email_address}`}
                                className="lead-secondary-info text-dashboard-primary hover:text-dashboard-primary/80 flex items-center gap-1.5 transition-colors duration-200 inline-block"
                              >
                                <Mail className="w-3.5 h-3.5" />
                                {truncateText(lead.email_address, 22)}
                              </a>
                            </CustomTooltip>
                          ) : (
                            <span className="lead-meta-info text-dashboard-text-muted">
                              -
                            </span>
                          )}
                        </TableCell>

                        {/* Phone Number - Professional Styling */}
                        <TableCell className="p-4 align-middle">
                          {lead.phone_number ? (
                            <a
                              href={`tel:${lead.phone_number}`}
                              className="lead-secondary-info text-dashboard-primary hover:text-dashboard-primary/80 flex items-center gap-1.5 transition-colors duration-200"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              {truncateText(lead.phone_number, 14)}
                            </a>
                          ) : (
                            <span className="lead-meta-info text-dashboard-text-muted">
                              -
                            </span>
                          )}
                        </TableCell>

                        {/* Country Flag */}
                        <TableCell className="p-4 align-middle text-center">
                          {lead.country ? (
                            <CustomTooltip
                              content={lead.country}
                              delay={200}
                              offset={{ x: 0, y: -12 }}
                            >
                              <div className="flex items-center justify-center cursor-help inline-block">
                                <span
                                  className="text-2xl"
                                  title={lead.country}
                                  style={{
                                    fontFamily:
                                      '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Android Emoji", "EmojiSymbols", sans-serif',
                                    fontFeatureSettings: '"liga" off',
                                    textRendering: "optimizeLegibility",
                                  }}
                                >
                                  {getCountryFlag(lead.country)}
                                </span>
                              </div>
                            </CustomTooltip>
                          ) : (
                            <div className="flex items-center justify-center">
                              <span className="text-dashboard-text-muted text-lg">
                                🌍
                              </span>
                            </div>
                          )}
                        </TableCell>

                        {/* Location */}
                        <TableCell className="p-4 align-middle">
                          {lead.location ? (
                            <CustomTooltip
                              content={lead.location}
                              delay={200}
                              offset={{ x: 0, y: -12 }}
                            >
                              <div className="flex items-center gap-1 cursor-help inline-block">
                                <MapPin className="w-3 h-3 text-dashboard-text-secondary" />
                                <span className="text-dashboard-text-primary font-medium">
                                  {truncateText(lead.location, 14)}
                                </span>
                              </div>
                            </CustomTooltip>
                          ) : (
                            <span className="text-dashboard-text-muted">-</span>
                          )}
                        </TableCell>

                        {/* Industry - Flat Design Badge */}
                        <TableCell className="p-4 align-middle">
                          <div className="flex flex-wrap gap-1">
                            {lead.industry ? (
                              <span className="lead-badge-flat lead-badge-industry">
                                {truncateText(lead.industry, 12)}
                              </span>
                            ) : (
                              <span className="lead-meta-info text-dashboard-text-muted">
                                -
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* Company Name - Apple-Inspired Typography */}
                        <TableCell className="p-4 align-middle">
                          <CustomTooltip
                            content={standardizeCapitalization(
                              cleanTextData(lead.company_name),
                              "company"
                            )}
                            delay={200}
                            offset={{ x: 0, y: -12 }}
                          >
                            <span className="lead-primary-info text-dashboard-text-primary cursor-help inline-block">
                              {truncateText(
                                standardizeCapitalization(
                                  cleanTextData(lead.company_name),
                                  "company"
                                ),
                                20
                              )}
                            </span>
                          </CustomTooltip>
                        </TableCell>

                        {/* Job Title */}
                        <TableCell className="p-4 align-middle">
                          <div className="flex flex-wrap gap-1">
                            {lead.job_title ? (
                              <CustomTooltip
                                content={standardizeCapitalization(
                                  lead.job_title,
                                  "title"
                                )}
                                delay={200}
                                offset={{ x: 0, y: -12 }}
                              >
                                <span
                                  className={`lead-badge-flat lead-badge-job-title cursor-help inline-block ${
                                    isOwnerRole(lead.job_title)
                                      ? "lead-badge-owner"
                                      : ""
                                  }`}
                                >
                                  {truncateText(
                                    standardizeCapitalization(
                                      lead.job_title,
                                      "title"
                                    ),
                                    18
                                  )}
                                </span>
                              </CustomTooltip>
                            ) : (
                              <span className="lead-meta-info text-dashboard-text-muted">
                                -
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* Qualification - Flat Design */}
                        <TableCell className="p-4 align-middle">
                          {lead.qualification_rating ? (
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-2 h-2 rounded-full ${
                                  lead.qualification_rating === "high"
                                    ? "bg-[#C1FF72]"
                                    : lead.qualification_rating === "medium"
                                    ? "bg-[#38B6FF]"
                                    : "bg-yellow-400"
                                }`}
                              />
                              <div className="flex flex-col">
                                <span
                                  className={`lead-secondary-info ${
                                    lead.qualification_rating === "high"
                                      ? "text-[#C1FF72]"
                                      : lead.qualification_rating === "medium"
                                      ? "text-[#38B6FF]"
                                      : "text-yellow-400"
                                  }`}
                                >
                                  {lead.qualification_rating === "high"
                                    ? "High Quality"
                                    : lead.qualification_rating === "medium"
                                    ? "Medium Quality"
                                    : "Low Quality"}
                                </span>
                                {lead.qualification_score && (
                                  <span className="lead-meta-info text-dashboard-text-muted">
                                    {lead.qualification_score}/100
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-gray-400/60" />
                              <span className="lead-meta-info text-dashboard-text-muted">
                                Unqualified
                              </span>
                            </div>
                          )}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="p-4 align-middle">
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelectedLead(lead)}
                              className="hover:bg-dashboard-bg-accent"
                            >
                              <Eye className="size-4" />
                            </Button>
                            {lead.linkedin_url && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  window.open(lead.linkedin_url, "_blank")
                                }
                                className="hover:bg-dashboard-bg-accent"
                              >
                                <Linkedin className="size-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Flat Design Pagination Controls */}
            {filteredLeads.length > 0 && totalPages > 1 && (
              <div className="leads-table-pagination flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-dashboard-border-primary bg-dashboard-bg-primary/20">
                {/* Pagination Info */}
                <div className="lead-secondary-info text-dashboard-text-secondary">
                  Showing {startIndex + 1}-
                  {Math.min(endIndex, filteredLeads.length)} of{" "}
                  {filteredLeads.length} leads
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1}
                    className="leads-table-header-button border-dashboard-border-primary text-dashboard-text-primary hover:bg-dashboard-bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>

                  {/* Page Numbers */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let pageNumber;
                      if (totalPages <= 5) {
                        pageNumber = i + 1;
                      } else if (currentPage <= 3) {
                        pageNumber = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNumber = totalPages - 4 + i;
                      } else {
                        pageNumber = currentPage - 2 + i;
                      }

                      return (
                        <Button
                          key={pageNumber}
                          variant={
                            currentPage === pageNumber ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => handlePageChange(pageNumber)}
                          className={
                            currentPage === pageNumber
                              ? "leads-table-header-button bg-dashboard-primary text-dashboard-bg-primary hover:bg-dashboard-primary/90 shadow-flat-subtle"
                              : "leads-table-header-button border-dashboard-border-primary text-dashboard-text-primary hover:bg-dashboard-bg-accent"
                          }
                        >
                          {pageNumber}
                        </Button>
                      );
                    })}

                    {totalPages > 5 && currentPage < totalPages - 2 && (
                      <>
                        <span className="text-dashboard-text-muted px-2">
                          ...
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(totalPages)}
                          className="leads-table-header-button border-dashboard-border-primary text-dashboard-text-primary hover:bg-dashboard-bg-accent"
                        >
                          {totalPages}
                        </Button>
                      </>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className="leads-table-header-button border-dashboard-border-primary text-dashboard-text-primary hover:bg-dashboard-bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Qualification Tab */}
        <TabsContent value="qualification" className="space-y-6">
          {/* Test Qualification Button */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-dashboard-primary" />
                AI Lead Qualification System
              </CardTitle>
              <CardDescription>
                Test the AI qualification system with your real leads. This will
                analyze and score leads based on SharpFlow's SaaS business
                criteria.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Button
                  onClick={handleTestQualification}
                  disabled={bulkLoading || leads.length === 0}
                  className="bg-dashboard-primary hover:bg-dashboard-primary/90 text-white"
                >
                  {bulkLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Start AI Qualification (Test 5 Leads)
                    </>
                  )}
                </Button>
                <div className="text-sm text-dashboard-text-muted">
                  {leads.length} total leads •{" "}
                  {leads.filter((lead) => !lead.qualification_rating).length}{" "}
                  unqualified
                </div>
              </div>
            </CardContent>
          </Card>

          <QualificationStatsWidget
            stats={
              qualificationStats || {
                totalLeads: 0,
                qualifiedLeads: 0,
                highQualityLeads: 0,
                mediumQualityLeads: 0,
                lowQualityLeads: 0,
                unqualifiedLeads: 0,
                avgQualificationScore: 0,
                qualificationRate: 0,
              }
            }
            loading={qualStatsLoading}
          />
        </TabsContent>

        {/* Progress Tab */}
        <TabsContent value="progress" className="space-y-6">
          <QualificationProgressTracker
            jobs={qualificationJobs}
            onCancelJob={cancelJob}
            onRetryJob={retryJob}
          />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <QualificationManagementPanel
            onSaveSettings={handleQualificationSettings}
            onManualOverride={handleManualOverride}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
