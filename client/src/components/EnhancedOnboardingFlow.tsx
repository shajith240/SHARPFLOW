import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  CheckCircle, 
  Clock, 
  Upload, 
  FileText, 
  Brain, 
  Zap, 
  ArrowRight, 
  SkipForward,
  Loader2,
  AlertCircle,
  Download,
  Trash2
} from "lucide-react";

interface OnboardingStep {
  step: string;
  title: string;
  description: string;
  isCompleted: boolean;
  isActive: boolean;
  completedAt?: Date;
  estimatedTimeMinutes: number;
  requirements: string[];
  benefits: string[];
}

interface OnboardingProgress {
  id: string;
  userId: string;
  currentStep: string;
  stepsCompleted: string[];
  totalSteps: number;
  completionPercentage: number;
  skipDocumentUpload: boolean;
  autoGeneratePrompts: boolean;
}

interface OnboardingStats {
  totalSteps: number;
  completedSteps: number;
  remainingSteps: number;
  completionPercentage: number;
  estimatedTimeRemaining: number;
  currentStepInfo: OnboardingStep | null;
}

interface CompanyDocument {
  id: string;
  originalFilename: string;
  fileSize: number;
  documentType: string;
  description?: string;
  uploadStatus: string;
  analysisStatus: string;
  createdAt: Date;
  processingError?: string;
}

export default function EnhancedOnboardingFlow() {
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [stats, setStats] = useState<OnboardingStats | null>(null);
  const [documents, setDocuments] = useState<CompanyDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [processingStep, setProcessingStep] = useState<string | null>(null);
  const { toast } = useToast();

  // Load onboarding data
  const loadOnboardingData = useCallback(async () => {
    try {
      const response = await fetch("/api/ai-agentic/onboarding/progress", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setProgress(data.progress);
        setSteps(data.detailedSteps || []);
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Error loading onboarding data:", error);
    }
  }, []);

  // Load documents
  const loadDocuments = useCallback(async () => {
    try {
      const response = await fetch("/api/ai-agentic/documents", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error("Error loading documents:", error);
    }
  }, []);

  useEffect(() => {
    loadOnboardingData();
    loadDocuments();
  }, [loadOnboardingData, loadDocuments]);

  // Complete a step
  const completeStep = async (step: string, skipToNext: boolean = true) => {
    setProcessingStep(step);
    try {
      const response = await fetch("/api/ai-agentic/onboarding/complete-step", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ step, skipToNext }),
      });

      if (response.ok) {
        await loadOnboardingData();
        toast({
          title: "Step Completed",
          description: `${step.replace('_', ' ')} completed successfully`,
        });
      } else {
        throw new Error("Failed to complete step");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to complete step",
        variant: "destructive",
      });
    } finally {
      setProcessingStep(null);
    }
  };

  // Skip document upload
  const skipDocumentUpload = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/ai-agentic/onboarding/skip-documents", {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        await loadOnboardingData();
        toast({
          title: "Documents Skipped",
          description: "Proceeding to prompt generation",
        });
      } else {
        throw new Error("Failed to skip documents");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to skip document upload",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    if (file.type !== 'application/pdf') {
      toast({
        title: "Invalid File",
        description: "Only PDF files are allowed",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "File size must be under 50MB",
        variant: "destructive",
      });
      return;
    }

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('companyProfileId', 'temp-profile-id'); // This should come from company profile
      formData.append('documentType', 'company_brochure');
      formData.append('description', `Uploaded during onboarding: ${file.name}`);

      const response = await fetch("/api/ai-agentic/documents/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (response.ok) {
        await loadDocuments();
        toast({
          title: "Document Uploaded",
          description: "Document uploaded and queued for AI analysis",
        });
        
        // Reset file input
        event.target.value = '';
      } else {
        const data = await response.json();
        throw new Error(data.message || "Failed to upload document");
      }
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload document",
        variant: "destructive",
      });
    } finally {
      setUploadingFile(false);
    }
  };

  // Delete document
  const deleteDocument = async (documentId: string) => {
    try {
      const response = await fetch(`/api/ai-agentic/documents/${documentId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        await loadDocuments();
        toast({
          title: "Document Deleted",
          description: "Document removed successfully",
        });
      } else {
        throw new Error("Failed to delete document");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive",
      });
    }
  };

  // Get step icon
  const getStepIcon = (step: OnboardingStep) => {
    if (step.isCompleted) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    if (step.isActive) {
      return <Clock className="h-5 w-5 text-[#38B6FF]" />;
    }
    return <div className="h-5 w-5 rounded-full border-2 border-gray-600" />;
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'processed':
        return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'processing':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      case 'failed':
        return 'bg-red-500/20 text-red-400 border-red-500/50';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!progress || !stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#38B6FF]" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-[#C1FF72] to-[#38B6FF] bg-clip-text text-transparent">
          Welcome to SharpFlow
        </h1>
        <p className="text-gray-400">
          Let's set up your AI-powered lead generation system
        </p>
      </div>

      {/* Progress Overview */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-[#C1FF72]" />
            Setup Progress
          </CardTitle>
          <CardDescription>
            {stats.completedSteps} of {stats.totalSteps} steps completed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{stats.completionPercentage}%</span>
            </div>
            <Progress value={stats.completionPercentage} className="h-2" />
          </div>
          
          {stats.estimatedTimeRemaining > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Clock className="h-4 w-4" />
              Estimated time remaining: {stats.estimatedTimeRemaining} minutes
            </div>
          )}
        </CardContent>
      </Card>

      {/* Steps */}
      <div className="space-y-4">
        {steps.map((step, index) => (
          <Card 
            key={step.step} 
            className={`bg-gray-900 border-gray-800 ${
              step.isActive ? 'ring-2 ring-[#38B6FF]/50' : ''
            }`}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStepIcon(step)}
                  <div>
                    <CardTitle className="text-lg">{step.title}</CardTitle>
                    <CardDescription>{step.description}</CardDescription>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {step.estimatedTimeMinutes > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {step.estimatedTimeMinutes} min
                    </Badge>
                  )}
                  {step.isCompleted && step.completedAt && (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                      Completed
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>

            {step.isActive && (
              <CardContent className="space-y-4">
                {/* Step-specific content */}
                {step.step === 'document_upload' && (
                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center">
                      <Upload className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                      <p className="text-sm text-gray-400 mb-4">
                        Upload company documents (PDF only, max 50MB)
                      </p>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={handleFileUpload}
                        disabled={uploadingFile}
                        className="hidden"
                        id="document-upload"
                      />
                      <label htmlFor="document-upload">
                        <Button 
                          variant="outline" 
                          disabled={uploadingFile}
                          className="cursor-pointer"
                          asChild
                        >
                          <span>
                            {uploadingFile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Choose Files
                          </span>
                        </Button>
                      </label>
                    </div>

                    {/* Uploaded Documents */}
                    {documents.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium">Uploaded Documents</h4>
                        {documents.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                            <div className="flex items-center gap-3">
                              <FileText className="h-4 w-4 text-gray-400" />
                              <div>
                                <p className="text-sm font-medium">{doc.originalFilename}</p>
                                <p className="text-xs text-gray-500">
                                  {formatFileSize(doc.fileSize)} • {doc.documentType}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Badge className={getStatusColor(doc.analysisStatus)}>
                                {doc.analysisStatus}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteDocument(doc.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        onClick={() => completeStep('document_upload')}
                        disabled={processingStep === 'document_upload'}
                        className="bg-[#38B6FF] text-white hover:bg-[#38B6FF]/90"
                      >
                        {processingStep === 'document_upload' && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Continue
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="outline"
                        onClick={skipDocumentUpload}
                        disabled={loading}
                      >
                        <SkipForward className="mr-2 h-4 w-4" />
                        Skip Documents
                      </Button>
                    </div>
                  </div>
                )}

                {/* Other step types can be added here */}
                {step.step !== 'document_upload' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2">Requirements</h4>
                        <ul className="text-sm text-gray-400 space-y-1">
                          {step.requirements.map((req, i) => (
                            <li key={i} className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 bg-[#C1FF72] rounded-full" />
                              {req}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2">Benefits</h4>
                        <ul className="text-sm text-gray-400 space-y-1">
                          {step.benefits.map((benefit, i) => (
                            <li key={i} className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 bg-[#38B6FF] rounded-full" />
                              {benefit}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <Button
                      onClick={() => completeStep(step.step)}
                      disabled={processingStep === step.step}
                      className="bg-[#38B6FF] text-white hover:bg-[#38B6FF]/90"
                    >
                      {processingStep === step.step && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Complete Step
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
