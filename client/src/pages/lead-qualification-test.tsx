import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Target, CheckCircle, XCircle, AlertCircle, Brain } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Lead {
  id: string;
  fullName: string;
  emailAddress?: string;
  companyName: string;
  jobTitle: string;
  industry: string;
  location: string;
  leadScore: number;
  leadStatus: string;
  tags: string[];
  notes?: string;
}

interface QualificationResult {
  id: string;
  leadId: string;
  overallScore: number;
  qualificationStatus: 'qualified' | 'unqualified' | 'pending_review' | 'requires_manual_review';
  confidence: number;
  qualificationReasoning: string;
  disqualificationReasons: string[];
  recommendedActions: string[];
  analyzedAt: string;
}

export default function LeadQualificationTestPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [qualificationResults, setQualificationResults] = useState<Record<string, QualificationResult>>({});
  const [loading, setLoading] = useState(false);
  const [qualifyingLeads, setQualifyingLeads] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    loadLeads();
    loadQualificationResults();
  }, []);

  const loadLeads = async () => {
    try {
      const response = await fetch("/api/leads", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setLeads(data.leads || []);
      }
    } catch (error) {
      console.error("Error loading leads:", error);
    }
  };

  const loadQualificationResults = async () => {
    try {
      const response = await fetch("/api/ai-agentic/qualification-results", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        const resultsMap = data.results.reduce((acc: Record<string, QualificationResult>, result: QualificationResult) => {
          acc[result.leadId] = result;
          return acc;
        }, {});
        setQualificationResults(resultsMap);
      }
    } catch (error) {
      console.error("Error loading qualification results:", error);
    }
  };

  const qualifyLead = async (leadId: string) => {
    setQualifyingLeads(prev => new Set(prev).add(leadId));
    
    try {
      const response = await fetch(`/api/ai-agentic/qualify-lead/${leadId}`, {
        method: "POST",
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok && data.result) {
        setQualificationResults(prev => ({
          ...prev,
          [leadId]: data.result
        }));
        
        toast({
          title: "Lead Qualified",
          description: `${data.result.qualificationStatus.toUpperCase()} - Score: ${data.result.overallScore.toFixed(1)}`,
        });
      } else {
        throw new Error(data.message || "Failed to qualify lead");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to qualify lead",
        variant: "destructive",
      });
    } finally {
      setQualifyingLeads(prev => {
        const newSet = new Set(prev);
        newSet.delete(leadId);
        return newSet;
      });
    }
  };

  const qualifyAllLeads = async () => {
    setLoading(true);
    
    try {
      const leadIds = leads.map(lead => lead.id);
      const response = await fetch("/api/ai-agentic/qualify-leads-batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ leadIds }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Batch Qualification Complete",
          description: `${data.successCount} leads qualified successfully, ${data.failedCount} failed`,
        });
        await loadQualificationResults();
      } else {
        throw new Error(data.message || "Failed to qualify leads");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to qualify leads",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'qualified':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'unqualified':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending_review':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'requires_manual_review':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'qualified':
        return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'unqualified':
        return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'pending_review':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'requires_manual_review':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-[#C1FF72] to-[#38B6FF] bg-clip-text text-transparent">
            Lead Qualification Testing
          </h1>
          <p className="text-gray-400 text-lg">
            Test the AI-powered lead qualification system with your existing leads
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-center">
          <Button
            onClick={qualifyAllLeads}
            disabled={loading || leads.length === 0}
            className="bg-[#38B6FF] text-white hover:bg-[#38B6FF]/90"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Brain className="mr-2 h-4 w-4" />
            Qualify All Leads ({leads.length})
          </Button>
        </div>

        {/* Leads Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {leads.map((lead) => {
            const result = qualificationResults[lead.id];
            const isQualifying = qualifyingLeads.has(lead.id);

            return (
              <Card key={lead.id} className="bg-gray-900 border-gray-800">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{lead.fullName}</CardTitle>
                      <CardDescription className="text-sm">
                        {lead.jobTitle} at {lead.companyName}
                      </CardDescription>
                    </div>
                    {result && (
                      <div className="flex items-center gap-2">
                        {getStatusIcon(result.qualificationStatus)}
                        <span className={`text-2xl font-bold ${getScoreColor(result.overallScore)}`}>
                          {result.overallScore.toFixed(0)}
                        </span>
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Lead Info */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-400">Industry:</span>
                      <span>{lead.industry}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-400">Location:</span>
                      <span>{lead.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-400">Current Score:</span>
                      <span>{lead.leadScore}</span>
                    </div>
                  </div>

                  {/* Tags */}
                  {lead.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {lead.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Qualification Status */}
                  {result ? (
                    <div className="space-y-3">
                      <Badge className={`${getStatusColor(result.qualificationStatus)} text-xs`}>
                        {result.qualificationStatus.replace('_', ' ').toUpperCase()}
                      </Badge>
                      
                      <div className="space-y-2">
                        <div className="text-sm">
                          <span className="text-gray-400">Confidence:</span>
                          <span className="ml-2">{(result.confidence * 100).toFixed(0)}%</span>
                        </div>
                        
                        <div className="text-sm">
                          <span className="text-gray-400">Reasoning:</span>
                          <p className="text-xs mt-1 text-gray-300 line-clamp-3">
                            {result.qualificationReasoning}
                          </p>
                        </div>

                        {result.recommendedActions.length > 0 && (
                          <div className="text-sm">
                            <span className="text-gray-400">Actions:</span>
                            <ul className="text-xs mt-1 text-gray-300 list-disc list-inside">
                              {result.recommendedActions.slice(0, 2).map((action, index) => (
                                <li key={index} className="line-clamp-1">{action}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="text-xs text-gray-500">
                          Analyzed: {new Date(result.analyzedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Button
                      onClick={() => qualifyLead(lead.id)}
                      disabled={isQualifying}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      {isQualifying && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                      <Target className="mr-2 h-3 w-3" />
                      Qualify Lead
                    </Button>
                  )}

                  {/* Notes */}
                  {lead.notes && (
                    <div className="text-xs text-gray-400 border-t border-gray-800 pt-2">
                      <span className="font-medium">Notes:</span>
                      <p className="mt-1 line-clamp-2">{lead.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Empty State */}
        {leads.length === 0 && (
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="text-center py-12">
              <Target className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-400 mb-2">No Leads Found</h3>
              <p className="text-gray-500 mb-4">
                You need some leads to test the qualification system.
              </p>
              <p className="text-sm text-gray-600">
                Try seeding mock data from the AI Agentic Setup page first.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
