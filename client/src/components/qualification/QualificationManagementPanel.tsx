import React, { useState } from "react";
import { motion } from "framer-motion";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  Settings,
  Target,
  Brain,
  History,
  Save,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  Info,
  Zap,
  Clock,
} from "lucide-react";
import { Lead } from "@/types/lead-generation";
import { QualificationBadge } from "./QualificationBadge";

interface QualificationManagementPanelProps {
  className?: string;
  onSaveSettings?: (settings: QualificationSettings) => void;
  onManualOverride?: (leadId: string, rating: string, reasoning: string) => void;
}

interface QualificationSettings {
  autoQualificationEnabled: boolean;
  qualificationCriteria: {
    minScore: number;
    industryWeights: Record<string, number>;
    seniorityWeights: Record<string, number>;
    companySize: "any" | "startup" | "sme" | "enterprise";
    locationPreferences: string[];
  };
  thresholds: {
    highQuality: number;
    mediumQuality: number;
    lowQuality: number;
  };
  customPrompt?: string;
  requalificationInterval: number; // days
}

const defaultSettings: QualificationSettings = {
  autoQualificationEnabled: true,
  qualificationCriteria: {
    minScore: 60,
    industryWeights: {
      "Technology": 1.2,
      "Finance": 1.1,
      "Healthcare": 1.0,
      "Manufacturing": 0.9,
      "Retail": 0.8,
    },
    seniorityWeights: {
      "C-Level": 1.5,
      "VP": 1.3,
      "Director": 1.2,
      "Manager": 1.0,
      "Individual Contributor": 0.8,
    },
    companySize: "any",
    locationPreferences: [],
  },
  thresholds: {
    highQuality: 85,
    mediumQuality: 70,
    lowQuality: 50,
  },
  requalificationInterval: 30,
};

export function QualificationManagementPanel({
  className,
  onSaveSettings,
  onManualOverride,
}: QualificationManagementPanelProps) {
  const [settings, setSettings] = useState<QualificationSettings>(defaultSettings);
  const [activeTab, setActiveTab] = useState("settings");
  const [saving, setSaving] = useState(false);
  const [manualOverride, setManualOverride] = useState({
    leadId: "",
    rating: "",
    reasoning: "",
  });

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      if (onSaveSettings) {
        await onSaveSettings(settings);
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleResetSettings = () => {
    setSettings(defaultSettings);
  };

  const handleManualOverrideSubmit = async () => {
    if (manualOverride.leadId && manualOverride.rating && onManualOverride) {
      await onManualOverride(
        manualOverride.leadId,
        manualOverride.rating,
        manualOverride.reasoning
      );
      setManualOverride({ leadId: "", rating: "", reasoning: "" });
    }
  };

  return (
    <Card className={cn(
      "bg-dashboard-bg-secondary/50 backdrop-blur-sm border-dashboard-border-primary",
      className
    )}>
      <CardHeader>
        <CardTitle className="text-dashboard-text-primary flex items-center gap-2">
          <Settings className="w-5 h-5 text-dashboard-primary" />
          Qualification Management
        </CardTitle>
        <CardDescription className="text-dashboard-text-secondary">
          Configure AI qualification settings and manage lead quality assessments
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-dashboard-bg-tertiary">
            <TabsTrigger 
              value="settings" 
              className="data-[state=active]:bg-dashboard-primary data-[state=active]:text-black"
            >
              <Target className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
            <TabsTrigger 
              value="criteria" 
              className="data-[state=active]:bg-dashboard-primary data-[state=active]:text-black"
            >
              <Brain className="w-4 h-4 mr-2" />
              Criteria
            </TabsTrigger>
            <TabsTrigger 
              value="override" 
              className="data-[state=active]:bg-dashboard-primary data-[state=active]:text-black"
            >
              <Zap className="w-4 h-4 mr-2" />
              Override
            </TabsTrigger>
            <TabsTrigger 
              value="history" 
              className="data-[state=active]:bg-dashboard-primary data-[state=active]:text-black"
            >
              <History className="w-4 h-4 mr-2" />
              History
            </TabsTrigger>
          </TabsList>

          {/* General Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-dashboard-text-primary">Auto Qualification</Label>
                  <p className="text-sm text-dashboard-text-secondary">
                    Automatically qualify new leads using AI analysis
                  </p>
                </div>
                <Switch
                  checked={settings.autoQualificationEnabled}
                  onCheckedChange={(checked) =>
                    setSettings(prev => ({ ...prev, autoQualificationEnabled: checked }))
                  }
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-dashboard-text-primary">High Quality Threshold</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={settings.thresholds.highQuality}
                    onChange={(e) =>
                      setSettings(prev => ({
                        ...prev,
                        thresholds: { ...prev.thresholds, highQuality: parseInt(e.target.value) }
                      }))
                    }
                    className="bg-dashboard-bg-tertiary border-dashboard-border-primary"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-dashboard-text-primary">Medium Quality Threshold</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={settings.thresholds.mediumQuality}
                    onChange={(e) =>
                      setSettings(prev => ({
                        ...prev,
                        thresholds: { ...prev.thresholds, mediumQuality: parseInt(e.target.value) }
                      }))
                    }
                    className="bg-dashboard-bg-tertiary border-dashboard-border-primary"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-dashboard-text-primary">Low Quality Threshold</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={settings.thresholds.lowQuality}
                    onChange={(e) =>
                      setSettings(prev => ({
                        ...prev,
                        thresholds: { ...prev.thresholds, lowQuality: parseInt(e.target.value) }
                      }))
                    }
                    className="bg-dashboard-bg-tertiary border-dashboard-border-primary"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-dashboard-text-primary">Re-qualification Interval (days)</Label>
                <Input
                  type="number"
                  min="1"
                  max="365"
                  value={settings.requalificationInterval}
                  onChange={(e) =>
                    setSettings(prev => ({ ...prev, requalificationInterval: parseInt(e.target.value) }))
                  }
                  className="bg-dashboard-bg-tertiary border-dashboard-border-primary"
                />
                <p className="text-xs text-dashboard-text-secondary">
                  How often to automatically re-qualify existing leads
                </p>
              </div>
            </div>
          </TabsContent>

          {/* Qualification Criteria Tab */}
          <TabsContent value="criteria" className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-dashboard-text-primary">Minimum Base Score</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={settings.qualificationCriteria.minScore}
                  onChange={(e) =>
                    setSettings(prev => ({
                      ...prev,
                      qualificationCriteria: {
                        ...prev.qualificationCriteria,
                        minScore: parseInt(e.target.value)
                      }
                    }))
                  }
                  className="bg-dashboard-bg-tertiary border-dashboard-border-primary"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-dashboard-text-primary">Company Size Preference</Label>
                <Select
                  value={settings.qualificationCriteria.companySize}
                  onValueChange={(value) =>
                    setSettings(prev => ({
                      ...prev,
                      qualificationCriteria: {
                        ...prev.qualificationCriteria,
                        companySize: value as any
                      }
                    }))
                  }
                >
                  <SelectTrigger className="bg-dashboard-bg-tertiary border-dashboard-border-primary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any Size</SelectItem>
                    <SelectItem value="startup">Startup (1-50)</SelectItem>
                    <SelectItem value="sme">SME (51-500)</SelectItem>
                    <SelectItem value="enterprise">Enterprise (500+)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-dashboard-text-primary">Custom Qualification Prompt</Label>
                <Textarea
                  placeholder="Enter custom AI prompt for lead qualification..."
                  value={settings.customPrompt || ""}
                  onChange={(e) =>
                    setSettings(prev => ({ ...prev, customPrompt: e.target.value }))
                  }
                  className="bg-dashboard-bg-tertiary border-dashboard-border-primary min-h-[100px]"
                />
                <p className="text-xs text-dashboard-text-secondary">
                  Optional: Customize the AI prompt used for lead qualification
                </p>
              </div>
            </div>
          </TabsContent>

          {/* Manual Override Tab */}
          <TabsContent value="override" className="space-y-6">
            <div className="space-y-4">
              <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-lg p-4">
                <div className="flex items-center gap-2 text-yellow-400 mb-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="font-medium">Manual Override</span>
                </div>
                <p className="text-sm text-yellow-300">
                  Use this to manually override AI qualification for specific leads. This will update the lead's qualification status immediately.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-dashboard-text-primary">Lead ID</Label>
                  <Input
                    placeholder="Enter lead ID..."
                    value={manualOverride.leadId}
                    onChange={(e) =>
                      setManualOverride(prev => ({ ...prev, leadId: e.target.value }))
                    }
                    className="bg-dashboard-bg-tertiary border-dashboard-border-primary"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-dashboard-text-primary">New Qualification Rating</Label>
                  <Select
                    value={manualOverride.rating}
                    onValueChange={(value) =>
                      setManualOverride(prev => ({ ...prev, rating: value }))
                    }
                  >
                    <SelectTrigger className="bg-dashboard-bg-tertiary border-dashboard-border-primary">
                      <SelectValue placeholder="Select rating..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High Quality</SelectItem>
                      <SelectItem value="medium">Medium Quality</SelectItem>
                      <SelectItem value="low">Low Quality</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-dashboard-text-primary">Reasoning</Label>
                  <Textarea
                    placeholder="Explain why you're overriding the qualification..."
                    value={manualOverride.reasoning}
                    onChange={(e) =>
                      setManualOverride(prev => ({ ...prev, reasoning: e.target.value }))
                    }
                    className="bg-dashboard-bg-tertiary border-dashboard-border-primary"
                  />
                </div>

                <Button
                  onClick={handleManualOverrideSubmit}
                  disabled={!manualOverride.leadId || !manualOverride.rating}
                  className="bg-[#C1FF72] text-black hover:bg-[#C1FF72]/90"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Apply Override
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-6">
            <div className="text-center py-8">
              <Clock className="w-12 h-12 text-dashboard-text-muted mx-auto mb-4" />
              <h3 className="text-lg font-medium text-dashboard-text-primary mb-2">
                Qualification History
              </h3>
              <p className="text-dashboard-text-secondary">
                View qualification history and audit trail here.
              </p>
            </div>
          </TabsContent>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-6 border-t border-dashboard-border-primary">
            <Button
              variant="outline"
              onClick={handleResetSettings}
              className="border-dashboard-border-primary text-dashboard-text-primary hover:bg-dashboard-interactive-hover"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset to Defaults
            </Button>

            <Button
              onClick={handleSaveSettings}
              disabled={saving}
              className="bg-[#C1FF72] text-black hover:bg-[#C1FF72]/90"
            >
              {saving ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default QualificationManagementPanel;
