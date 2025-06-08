import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Brain,
  Target,
  Zap,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CompanyProfile {
  companyName: string;
  industry: string;
  subIndustry?: string;
  businessModel?: string;
  companySize?: string;
  annualRevenue?: string;
  targetMarket?: string;
  idealCustomerProfile?: string;
  geographicMarkets?: string[];
  valueProposition?: string;
  keyDifferentiators?: string[];
  competitiveAdvantages?: string;
  brandVoice?: string;
  communicationStyle?: string;
  industryTerminology?: string[];
}

interface SystemStatus {
  companyProfile: {
    exists: boolean;
    promptsGenerated: boolean;
    lastAnalyzed?: string;
  };
  prompts: {
    total: number;
    byAgent: Record<string, number>;
    customized: number;
  };
  qualification: {
    totalResults: number;
    qualified: number;
    unqualified: number;
    pendingReview: number;
    averageScore: number;
  };
}

export default function AIAgenticSetupPage() {
  const [profile, setProfile] = useState<CompanyProfile>({
    companyName: "",
    industry: "",
    subIndustry: "",
    businessModel: "",
    companySize: "",
    annualRevenue: "",
    targetMarket: "",
    idealCustomerProfile: "",
    geographicMarkets: [],
    valueProposition: "",
    keyDifferentiators: [],
    competitiveAdvantages: "",
    brandVoice: "",
    communicationStyle: "",
    industryTerminology: [],
  });

  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [generatingPrompts, setGeneratingPrompts] = useState(false);
  const [generatingRules, setGeneratingRules] = useState(false);
  const [seedingData, setSeedingData] = useState(false);
  const { toast } = useToast();

  // Load existing profile and status on mount
  useEffect(() => {
    loadSystemStatus();
    loadCompanyProfile();
  }, []);

  const loadSystemStatus = async () => {
    try {
      const response = await fetch("/api/ai-agentic/status", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setStatus(data.status);
      }
    } catch (error) {
      console.error("Error loading system status:", error);
    }
  };

  const loadCompanyProfile = async () => {
    try {
      const response = await fetch("/api/ai-agentic/company-profile", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        if (data.profile) {
          setProfile(data.profile);
        }
      }
    } catch (error) {
      console.error("Error loading company profile:", error);
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/ai-agentic/company-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(profile),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: "Company profile saved successfully",
        });
        await loadSystemStatus();
      } else {
        throw new Error(data.message || "Failed to save profile");
      }
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to save profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePrompts = async () => {
    setGeneratingPrompts(true);
    try {
      const response = await fetch("/api/ai-agentic/generate-prompts", {
        method: "POST",
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: `Generated ${data.promptsGenerated} customized prompts in ${data.generationTimeMs}ms`,
        });
        await loadSystemStatus();
      } else {
        throw new Error(data.message || "Failed to generate prompts");
      }
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to generate prompts",
        variant: "destructive",
      });
    } finally {
      setGeneratingPrompts(false);
    }
  };

  const handleGenerateQualificationRules = async () => {
    setGeneratingRules(true);
    try {
      const response = await fetch(
        "/api/ai-agentic/generate-qualification-rules",
        {
          method: "POST",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: `Generated ${data.count} qualification rules`,
        });
        await loadSystemStatus();
      } else {
        throw new Error(
          data.message || "Failed to generate qualification rules"
        );
      }
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to generate qualification rules",
        variant: "destructive",
      });
    } finally {
      setGeneratingRules(false);
    }
  };

  const handleSeedMockData = async () => {
    setSeedingData(true);
    try {
      const response = await fetch("/api/ai-agentic/seed-mock-data", {
        method: "POST",
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: `Mock data seeded successfully: ${data.data.companyProfiles} profiles, ${data.data.agentPrompts} prompts, ${data.data.qualificationRules} rules, ${data.data.leads} leads`,
        });
        await loadSystemStatus();
        await loadCompanyProfile();
      } else {
        throw new Error(data.message || "Failed to seed mock data");
      }
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to seed mock data",
        variant: "destructive",
      });
    } finally {
      setSeedingData(false);
    }
  };

  const handleArrayInput = (field: keyof CompanyProfile, value: string) => {
    const array = value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    setProfile((prev) => ({ ...prev, [field]: array }));
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-[#C1FF72] to-[#38B6FF] bg-clip-text text-transparent">
            AI Agentic System Setup
          </h1>
          <p className="text-gray-400 text-lg">
            Configure your company profile to enable AI-powered prompt
            customization and lead qualification
          </p>
        </div>

        {/* System Status */}
        {status && (
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-[#38B6FF]" />
                System Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-[#C1FF72]">
                    Company Profile
                  </h4>
                  <div className="flex items-center gap-2">
                    {status.companyProfile.exists ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                    )}
                    <span className="text-sm">
                      {status.companyProfile.exists
                        ? "Configured"
                        : "Not configured"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {status.companyProfile.promptsGenerated ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                    )}
                    <span className="text-sm">
                      {status.companyProfile.promptsGenerated
                        ? "Prompts generated"
                        : "Prompts not generated"}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-[#C1FF72]">Agent Prompts</h4>
                  <div className="text-sm space-y-1">
                    <div>Total: {status.prompts.total}</div>
                    <div>Customized: {status.prompts.customized}</div>
                    <div className="flex gap-2 flex-wrap">
                      {Object.entries(status.prompts.byAgent).map(
                        ([agent, count]) => (
                          <Badge
                            key={agent}
                            variant="outline"
                            className="text-xs"
                          >
                            {agent}: {count}
                          </Badge>
                        )
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-[#C1FF72]">
                    Lead Qualification
                  </h4>
                  <div className="text-sm space-y-1">
                    <div>
                      Total Results: {status.qualification.totalResults}
                    </div>
                    <div>Qualified: {status.qualification.qualified}</div>
                    <div>
                      Average Score:{" "}
                      {status.qualification.averageScore.toFixed(1)}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Company Profile Form */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-[#C1FF72]" />
              Company Profile
            </CardTitle>
            <CardDescription>
              Provide detailed information about your company to enable AI
              customization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name *</Label>
                <Input
                  id="companyName"
                  value={profile.companyName}
                  onChange={(e) =>
                    setProfile((prev) => ({
                      ...prev,
                      companyName: e.target.value,
                    }))
                  }
                  placeholder="Your company name"
                  className="bg-gray-800 border-gray-700"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="industry">Industry *</Label>
                <Input
                  id="industry"
                  value={profile.industry}
                  onChange={(e) =>
                    setProfile((prev) => ({
                      ...prev,
                      industry: e.target.value,
                    }))
                  }
                  placeholder="e.g., Technology, Healthcare, Finance"
                  className="bg-gray-800 border-gray-700"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessModel">Business Model</Label>
                <Select
                  value={profile.businessModel}
                  onValueChange={(value) =>
                    setProfile((prev) => ({ ...prev, businessModel: value }))
                  }
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700">
                    <SelectValue placeholder="Select business model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="B2B">B2B</SelectItem>
                    <SelectItem value="B2C">B2C</SelectItem>
                    <SelectItem value="B2B2C">B2B2C</SelectItem>
                    <SelectItem value="marketplace">Marketplace</SelectItem>
                    <SelectItem value="saas">SaaS</SelectItem>
                    <SelectItem value="ecommerce">E-commerce</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="companySize">Company Size</Label>
                <Select
                  value={profile.companySize}
                  onValueChange={(value) =>
                    setProfile((prev) => ({ ...prev, companySize: value }))
                  }
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700">
                    <SelectValue placeholder="Select company size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="startup">Startup (1-10)</SelectItem>
                    <SelectItem value="small">Small (11-50)</SelectItem>
                    <SelectItem value="medium">Medium (51-200)</SelectItem>
                    <SelectItem value="large">Large (201-1000)</SelectItem>
                    <SelectItem value="enterprise">
                      Enterprise (1000+)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="valueProposition">Value Proposition</Label>
              <Textarea
                id="valueProposition"
                value={profile.valueProposition}
                onChange={(e) =>
                  setProfile((prev) => ({
                    ...prev,
                    valueProposition: e.target.value,
                  }))
                }
                placeholder="What unique value does your company provide to customers?"
                className="bg-gray-800 border-gray-700"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetMarket">Target Market</Label>
              <Textarea
                id="targetMarket"
                value={profile.targetMarket}
                onChange={(e) =>
                  setProfile((prev) => ({
                    ...prev,
                    targetMarket: e.target.value,
                  }))
                }
                placeholder="Describe your ideal target market and customer segments"
                className="bg-gray-800 border-gray-700"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="geographicMarkets">Geographic Markets</Label>
                <Input
                  id="geographicMarkets"
                  value={profile.geographicMarkets?.join(", ") || ""}
                  onChange={(e) =>
                    handleArrayInput("geographicMarkets", e.target.value)
                  }
                  placeholder="US, EU, APAC (comma-separated)"
                  className="bg-gray-800 border-gray-700"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="keyDifferentiators">Key Differentiators</Label>
                <Input
                  id="keyDifferentiators"
                  value={profile.keyDifferentiators?.join(", ") || ""}
                  onChange={(e) =>
                    handleArrayInput("keyDifferentiators", e.target.value)
                  }
                  placeholder="AI-powered, Cost-effective (comma-separated)"
                  className="bg-gray-800 border-gray-700"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={handleSaveProfile}
                disabled={loading || !profile.companyName || !profile.industry}
                className="bg-[#C1FF72] text-black hover:bg-[#C1FF72]/90"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Company Profile
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Development Tools */}
        {process.env.NODE_ENV === "development" && (
          <Card className="bg-gray-900 border-gray-800 border-yellow-500/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-400">
                <Zap className="h-5 w-5" />
                Development Tools
              </CardTitle>
              <CardDescription>
                Testing utilities for development environment only
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleSeedMockData}
                disabled={seedingData}
                variant="outline"
                className="w-full border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
              >
                {seedingData && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Seed Mock Data for Testing
              </Button>
              <p className="text-xs text-gray-500 mt-2">
                Populates the database with sample company profiles, prompts,
                qualification rules, and leads for testing
              </p>
            </CardContent>
          </Card>
        )}

        {/* AI Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-[#38B6FF]" />
                Generate Custom Prompts
              </CardTitle>
              <CardDescription>
                Create AI-customized prompts for all agents based on your
                company profile
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleGeneratePrompts}
                disabled={generatingPrompts || !status?.companyProfile.exists}
                className="w-full bg-[#38B6FF] text-white hover:bg-[#38B6FF]/90"
              >
                {generatingPrompts && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Generate Custom Prompts
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-[#C1FF72]" />
                Generate Qualification Rules
              </CardTitle>
              <CardDescription>
                Create AI-powered lead qualification rules based on your
                business
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleGenerateQualificationRules}
                disabled={generatingRules || !status?.companyProfile.exists}
                className="w-full bg-[#C1FF72] text-black hover:bg-[#C1FF72]/90"
              >
                {generatingRules && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Generate Qualification Rules
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
