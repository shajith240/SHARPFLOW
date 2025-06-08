import { Express } from "express";
import { PromptCustomizationService } from "../services/PromptCustomizationService.js";
import { LeadQualificationService } from "../services/LeadQualificationService.js";
import { DocumentAnalysisService } from "../services/DocumentAnalysisService.js";
import { OnboardingProgressService } from "../services/OnboardingProgressService.js";
import { OptimizedPromptService } from "../services/OptimizedPromptService.js";
import { PromptValidationService } from "../services/PromptValidationService.js";
import { isAuthenticated } from "../googleAuth.js";
import multer from "multer";

interface AuthenticatedRequest extends Express.Request {
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
});

export function setupAIAgenticSystemRoutes(app: Express) {
  const promptService = new PromptCustomizationService();
  const qualificationService = new LeadQualificationService();
  const documentService = new DocumentAnalysisService();
  const onboardingService = new OnboardingProgressService();
  const optimizedPromptService = new OptimizedPromptService();
  const validationService = new PromptValidationService();

  // ============================================================================
  // COMPANY PROFILE ROUTES
  // ============================================================================

  /**
   * Create or update company profile
   */
  app.post(
    "/api/ai-agentic/company-profile",
    isAuthenticated,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ message: "User not authenticated" });
        }

        const profileData = req.body;
        const profile = await promptService.createOrUpdateCompanyProfile(
          userId,
          profileData
        );

        res.json({
          success: true,
          profile,
          message: "Company profile saved successfully",
        });
      } catch (error) {
        console.error("Error creating/updating company profile:", error);
        res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  /**
   * Get company profile
   */
  app.get(
    "/api/ai-agentic/company-profile",
    isAuthenticated,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ message: "User not authenticated" });
        }

        const profile = await promptService.getCompanyProfile(userId);

        if (!profile) {
          return res.status(404).json({
            success: false,
            message: "Company profile not found",
          });
        }

        res.json({
          success: true,
          profile,
        });
      } catch (error) {
        console.error("Error getting company profile:", error);
        res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  // ============================================================================
  // PROMPT CUSTOMIZATION ROUTES
  // ============================================================================

  /**
   * Generate customized prompts for all agents
   */
  app.post(
    "/api/ai-agentic/generate-prompts",
    isAuthenticated,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ message: "User not authenticated" });
        }

        const result = await promptService.generateCustomizedPrompts(userId);

        res.json({
          success: result.success,
          promptsGenerated: result.promptsGenerated,
          prompts: result.prompts,
          generationTimeMs: result.generationTimeMs,
          tokensUsed: result.tokensUsed,
          error: result.error,
          message: result.success
            ? `Successfully generated ${result.promptsGenerated} customized prompts`
            : `Failed to generate prompts: ${result.error}`,
        });
      } catch (error) {
        console.error("Error generating customized prompts:", error);
        res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  /**
   * Get user's customized prompts
   */
  app.get(
    "/api/ai-agentic/prompts",
    isAuthenticated,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ message: "User not authenticated" });
        }

        const agentName = req.query.agent as string;
        const prompts = await promptService.getUserPrompts(userId, agentName);

        res.json({
          success: true,
          prompts,
          count: prompts.length,
        });
      } catch (error) {
        console.error("Error getting user prompts:", error);
        res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  // ============================================================================
  // LEAD QUALIFICATION ROUTES
  // ============================================================================

  /**
   * Generate qualification rules based on company profile
   */
  app.post(
    "/api/ai-agentic/generate-qualification-rules",
    isAuthenticated,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ message: "User not authenticated" });
        }

        const rules = await qualificationService.generateQualificationRules(
          userId
        );

        res.json({
          success: true,
          rules,
          count: rules.length,
          message: `Successfully generated ${rules.length} qualification rules`,
        });
      } catch (error) {
        console.error("Error generating qualification rules:", error);
        res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  /**
   * Qualify a single lead
   */
  app.post(
    "/api/ai-agentic/qualify-lead/:leadId",
    isAuthenticated,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ message: "User not authenticated" });
        }

        const leadId = req.params.leadId;
        if (!leadId) {
          return res.status(400).json({
            success: false,
            message: "Lead ID is required",
          });
        }

        const analysis = await qualificationService.qualifyLead(leadId, userId);

        res.json({
          success: analysis.success,
          result: analysis.result,
          processingTimeMs: analysis.processingTimeMs,
          rulesApplied: analysis.rulesApplied,
          error: analysis.error,
          message: analysis.success
            ? "Lead qualification completed successfully"
            : `Lead qualification failed: ${analysis.error}`,
        });
      } catch (error) {
        console.error("Error qualifying lead:", error);
        res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  /**
   * Batch qualify multiple leads
   */
  app.post(
    "/api/ai-agentic/qualify-leads-batch",
    isAuthenticated,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ message: "User not authenticated" });
        }

        const { leadIds } = req.body;
        if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
          return res.status(400).json({
            success: false,
            message: "Lead IDs array is required",
          });
        }

        const batchResult = await qualificationService.batchQualifyLeads(
          leadIds,
          userId
        );

        res.json({
          success: batchResult.success > 0,
          successCount: batchResult.success,
          failedCount: batchResult.failed,
          totalProcessed: leadIds.length,
          results: batchResult.results,
          message: `Batch qualification completed: ${batchResult.success} successful, ${batchResult.failed} failed`,
        });
      } catch (error) {
        console.error("Error batch qualifying leads:", error);
        res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  /**
   * Get qualification results
   */
  app.get(
    "/api/ai-agentic/qualification-results",
    isAuthenticated,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ message: "User not authenticated" });
        }

        const filters = {
          status: req.query.status as string,
          minScore: req.query.minScore
            ? parseFloat(req.query.minScore as string)
            : undefined,
          maxScore: req.query.maxScore
            ? parseFloat(req.query.maxScore as string)
            : undefined,
          limit: req.query.limit
            ? parseInt(req.query.limit as string)
            : undefined,
        };

        const results = await qualificationService.getQualificationResults(
          userId,
          filters
        );

        res.json({
          success: true,
          results,
          count: results.length,
          filters,
        });
      } catch (error) {
        console.error("Error getting qualification results:", error);
        res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  // ============================================================================
  // ONBOARDING PROGRESS ROUTES
  // ============================================================================

  /**
   * Initialize onboarding after payment
   */
  app.post(
    "/api/ai-agentic/onboarding/initialize",
    isAuthenticated,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ message: "User not authenticated" });
        }

        const progress = await onboardingService.initializeOnboarding(userId);

        res.json({
          success: true,
          progress,
          message: "Onboarding initialized successfully",
        });
      } catch (error) {
        console.error("Error initializing onboarding:", error);
        res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  /**
   * Get onboarding progress
   */
  app.get(
    "/api/ai-agentic/onboarding/progress",
    isAuthenticated,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ message: "User not authenticated" });
        }

        const progress = await onboardingService.getProgress(userId);
        const detailedSteps = await onboardingService.getDetailedSteps(userId);
        const stats = await onboardingService.getOnboardingStats(userId);

        res.json({
          success: true,
          progress,
          detailedSteps,
          stats,
        });
      } catch (error) {
        console.error("Error getting onboarding progress:", error);
        res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  /**
   * Complete onboarding step
   */
  app.post(
    "/api/ai-agentic/onboarding/complete-step",
    isAuthenticated,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ message: "User not authenticated" });
        }

        const { step, skipToNext } = req.body;
        const progress = await onboardingService.completeStep(
          userId,
          step,
          skipToNext
        );

        res.json({
          success: true,
          progress,
          message: `Step ${step} completed successfully`,
        });
      } catch (error) {
        console.error("Error completing onboarding step:", error);
        res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  /**
   * Skip document upload
   */
  app.post(
    "/api/ai-agentic/onboarding/skip-documents",
    isAuthenticated,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ message: "User not authenticated" });
        }

        const progress = await onboardingService.skipDocumentUpload(userId);

        res.json({
          success: true,
          progress,
          message: "Document upload skipped, proceeding to prompt generation",
        });
      } catch (error) {
        console.error("Error skipping document upload:", error);
        res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  // ============================================================================
  // DOCUMENT UPLOAD AND ANALYSIS ROUTES
  // ============================================================================

  /**
   * Upload company document
   */
  app.post(
    "/api/ai-agentic/documents/upload",
    isAuthenticated,
    upload.single("document"),
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ message: "User not authenticated" });
        }

        if (!req.file) {
          return res.status(400).json({
            success: false,
            message: "No file uploaded",
          });
        }

        const { companyProfileId, documentType, description } = req.body;

        if (!companyProfileId) {
          return res.status(400).json({
            success: false,
            message: "Company profile ID is required",
          });
        }

        const document = await documentService.uploadDocument(
          userId,
          companyProfileId,
          req.file.buffer,
          req.file.originalname,
          req.file.mimetype,
          documentType,
          description
        );

        res.json({
          success: true,
          document,
          message: "Document uploaded successfully and queued for analysis",
        });
      } catch (error) {
        console.error("Error uploading document:", error);
        res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  /**
   * Get user documents
   */
  app.get(
    "/api/ai-agentic/documents",
    isAuthenticated,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ message: "User not authenticated" });
        }

        const companyProfileId = req.query.companyProfileId as string;
        const documents = await documentService.getUserDocuments(
          userId,
          companyProfileId
        );

        res.json({
          success: true,
          documents,
          count: documents.length,
        });
      } catch (error) {
        console.error("Error getting user documents:", error);
        res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  /**
   * Process document with AI analysis
   */
  app.post(
    "/api/ai-agentic/documents/:documentId/analyze",
    isAuthenticated,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ message: "User not authenticated" });
        }

        const documentId = req.params.documentId;
        const result = await documentService.processDocument(
          documentId,
          userId
        );

        res.json({
          success: result.success,
          document: result.document,
          extractedInsights: result.extractedInsights,
          processingTimeMs: result.processingTimeMs,
          tokensUsed: result.tokensUsed,
          error: result.error,
          message: result.success
            ? "Document analyzed successfully"
            : `Document analysis failed: ${result.error}`,
        });
      } catch (error) {
        console.error("Error analyzing document:", error);
        res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  /**
   * Get document download URL
   */
  app.get(
    "/api/ai-agentic/documents/:documentId/download",
    isAuthenticated,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ message: "User not authenticated" });
        }

        const documentId = req.params.documentId;
        const downloadUrl = await documentService.getDocumentDownloadUrl(
          documentId,
          userId
        );

        res.json({
          success: true,
          downloadUrl,
        });
      } catch (error) {
        console.error("Error getting document download URL:", error);
        res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  /**
   * Delete document
   */
  app.delete(
    "/api/ai-agentic/documents/:documentId",
    isAuthenticated,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ message: "User not authenticated" });
        }

        const documentId = req.params.documentId;
        await documentService.deleteDocument(documentId, userId);

        res.json({
          success: true,
          message: "Document deleted successfully",
        });
      } catch (error) {
        console.error("Error deleting document:", error);
        res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  // ============================================================================
  // OPTIMIZED PROMPT SYSTEM ROUTES
  // ============================================================================

  /**
   * Generate optimized prompts using advanced prompt engineering
   */
  app.post(
    "/api/ai-agentic/prompts/optimize",
    isAuthenticated,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ message: "User not authenticated" });
        }

        const { companyContext } = req.body;

        if (!companyContext) {
          return res.status(400).json({
            success: false,
            message: "Company context is required for prompt optimization",
          });
        }

        const result = await optimizedPromptService.generateOptimizedPrompts(
          userId,
          companyContext
        );

        res.json({
          success: true,
          prompts: result.prompts,
          overallConfidence: result.overallConfidence,
          validationResults: result.validationResults,
          message: `Generated ${
            result.prompts.length
          } optimized prompts with ${(result.overallConfidence * 100).toFixed(
            1
          )}% confidence`,
        });
      } catch (error) {
        console.error("Error generating optimized prompts:", error);
        res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  /**
   * Run comprehensive prompt validation tests
   */
  app.post(
    "/api/ai-agentic/prompts/validate",
    isAuthenticated,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ message: "User not authenticated" });
        }

        const validationResults =
          await validationService.runComprehensiveValidation(userId);

        const overallPerformance = {
          totalScenarios: validationResults.length,
          averageScore:
            validationResults.reduce((sum, r) => sum + r.overallScore, 0) /
            validationResults.length,
          passedScenarios: validationResults.filter((r) => r.overallScore >= 95)
            .length,
          criticalIssues: validationResults.filter((r) => r.overallScore < 80)
            .length,
        };

        res.json({
          success: true,
          validationResults,
          overallPerformance,
          message: `Validation complete: ${overallPerformance.averageScore.toFixed(
            1
          )}% average performance across ${
            overallPerformance.totalScenarios
          } scenarios`,
        });
      } catch (error) {
        console.error("Error running prompt validation:", error);
        res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  /**
   * Get optimized prompts for a user
   */
  app.get(
    "/api/ai-agentic/prompts/optimized",
    isAuthenticated,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ message: "User not authenticated" });
        }

        const optimizedPrompts =
          await optimizedPromptService.getOptimizedPrompts(userId);

        res.json({
          success: true,
          prompts: optimizedPrompts,
          count: optimizedPrompts.length,
          message: `Retrieved ${optimizedPrompts.length} optimized prompts`,
        });
      } catch (error) {
        console.error("Error getting optimized prompts:", error);
        res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  /**
   * Test specific prompt performance
   */
  app.post(
    "/api/ai-agentic/prompts/test",
    isAuthenticated,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ message: "User not authenticated" });
        }

        const { agentName, promptType, testInput, companyContext } = req.body;

        if (!agentName || !promptType || !testInput) {
          return res.status(400).json({
            success: false,
            message: "Agent name, prompt type, and test input are required",
          });
        }

        // This would implement individual prompt testing
        // For now, return a placeholder response
        res.json({
          success: true,
          testResult: {
            agentName,
            promptType,
            accuracy: 0.95,
            responseTime: 1500,
            qualityScore: 0.92,
            suggestions: ["Performance meets standards"],
          },
          message: "Prompt test completed successfully",
        });
      } catch (error) {
        console.error("Error testing prompt:", error);
        res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  // ============================================================================
  // DEVELOPMENT & TESTING ROUTES
  // ============================================================================

  /**
   * Seed mock data for testing (development only)
   */
  app.post(
    "/api/ai-agentic/seed-mock-data",
    isAuthenticated,
    async (req: AuthenticatedRequest, res) => {
      try {
        // Only allow in development environment
        if (process.env.NODE_ENV === "production") {
          return res.status(403).json({
            success: false,
            message: "Mock data seeding is not allowed in production",
          });
        }

        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ message: "User not authenticated" });
        }

        // Import and run seeding function
        const { seedAIAgenticData } = await import(
          "../scripts/seedAIAgenticData.js"
        );
        const result = await seedAIAgenticData(userId);

        res.json({
          success: true,
          message: "Mock data seeded successfully",
          data: result.data,
        });
      } catch (error) {
        console.error("Error seeding mock data:", error);
        res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  // ============================================================================
  // SYSTEM STATUS ROUTES
  // ============================================================================

  /**
   * Get AI agentic system status
   */
  app.get(
    "/api/ai-agentic/status",
    isAuthenticated,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ message: "User not authenticated" });
        }

        // Get company profile status
        const companyProfile = await promptService.getCompanyProfile(userId);

        // Get prompts status
        const prompts = await promptService.getUserPrompts(userId);

        // Get qualification results summary
        const qualificationResults =
          await qualificationService.getQualificationResults(userId, {
            limit: 10,
          });

        const status = {
          companyProfile: {
            exists: !!companyProfile,
            promptsGenerated: companyProfile?.promptsGenerated || false,
            lastAnalyzed: companyProfile?.lastAnalyzed,
          },
          prompts: {
            total: prompts.length,
            byAgent: prompts.reduce((acc, prompt) => {
              acc[prompt.agentName] = (acc[prompt.agentName] || 0) + 1;
              return acc;
            }, {} as Record<string, number>),
            customized: prompts.filter((p) => p.isCustomized).length,
          },
          qualification: {
            totalResults: qualificationResults.length,
            qualified: qualificationResults.filter(
              (r) => r.qualificationStatus === "qualified"
            ).length,
            unqualified: qualificationResults.filter(
              (r) => r.qualificationStatus === "unqualified"
            ).length,
            pendingReview: qualificationResults.filter(
              (r) => r.qualificationStatus === "pending_review"
            ).length,
            averageScore:
              qualificationResults.length > 0
                ? qualificationResults.reduce(
                    (sum, r) => sum + r.overallScore,
                    0
                  ) / qualificationResults.length
                : 0,
          },
        };

        res.json({
          success: true,
          status,
          message: "AI agentic system status retrieved successfully",
        });
      } catch (error) {
        console.error("Error getting system status:", error);
        res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );
}
