import { supabase } from "../db.js";
import { v4 as uuidv4 } from "uuid";
import OpenAI from "openai";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
// Dynamic import for pdf-parse to avoid startup issues

export interface CompanyDocument {
  id: string;
  userId: string;
  companyProfileId: string;
  originalFilename: string;
  filePath: string;
  fileSize: number;
  fileType: string;
  mimeType: string;
  documentType?:
    | "company_brochure"
    | "product_documentation"
    | "case_study"
    | "marketing_material"
    | "business_plan"
    | "other";
  description?: string;
  uploadStatus:
    | "uploading"
    | "uploaded"
    | "processing"
    | "processed"
    | "failed";
  analysisStatus: "pending" | "processing" | "completed" | "failed";
  extractedContent?: string;
  aiAnalysis: Record<string, any>;
  keyInsights: string[];
  terminologyFound: string[];
  productsServices: string[];
  targetMarketInfo: string[];
  processingStartedAt?: Date;
  processingCompletedAt?: Date;
  processingError?: string;
  openaiTokensUsed: number;
  virusScanStatus: "pending" | "clean" | "infected" | "failed";
  fileHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentAnalysisResult {
  success: boolean;
  document?: CompanyDocument;
  extractedInsights?: {
    companyDescription: string;
    productsServices: string[];
    targetMarket: string;
    valuePropositions: string[];
    industryTerminology: string[];
    competitiveAdvantages: string[];
    keyDifferentiators: string[];
    businessModel: string;
    customerSegments: string[];
  };
  error?: string;
  processingTimeMs: number;
  tokensUsed: number;
}

export interface ProcessingJob {
  id: string;
  userId: string;
  documentId: string;
  jobType: "text_extraction" | "ai_analysis" | "batch_analysis";
  jobStatus: "queued" | "processing" | "completed" | "failed" | "cancelled";
  priority: number;
  startedAt?: Date;
  completedAt?: Date;
  processingTimeMs?: number;
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;
  jobResults: Record<string, any>;
  tokensUsed: number;
  createdAt: Date;
  updatedAt: Date;
}

export class DocumentAnalysisService {
  private openai: OpenAI | null;

  constructor() {
    // Initialize OpenAI client if API key is available
    this.openai = process.env.OPENAI_API_KEY
      ? new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        })
      : null;
  }

  /**
   * Get or create user's OpenAI client using their API keys
   */
  private async getUserOpenAIClient(userId: string): Promise<OpenAI | null> {
    try {
      // Get user's API keys from user_agent_configs
      const { data: configs, error } = await supabase
        .from("user_agent_configs")
        .select("api_keys")
        .eq("user_id", userId)
        .limit(1);

      if (error || !configs || configs.length === 0) {
        console.log(
          `No API keys found for user ${userId}, using development keys`
        );
        return this.openai; // Fallback to development OpenAI
      }

      const apiKeys = configs[0].api_keys;
      if (apiKeys?.openaiApiKey) {
        // Decrypt the API key if needed
        const { decrypt } = await import("../utils/encryption.js");
        const decryptedKey = decrypt(apiKeys.openaiApiKey);

        return new OpenAI({
          apiKey: decryptedKey,
        });
      }

      return this.openai; // Fallback to development OpenAI
    } catch (error) {
      console.error("Error getting user OpenAI client:", error);
      return this.openai; // Fallback to development OpenAI
    }
  }

  /**
   * Upload document to Supabase Storage and create database record
   */
  async uploadDocument(
    userId: string,
    companyProfileId: string,
    file: Buffer,
    filename: string,
    mimeType: string,
    documentType?: string,
    description?: string
  ): Promise<CompanyDocument> {
    try {
      // Validate file
      this.validateFile(file, filename, mimeType);

      // Generate file hash for integrity
      const fileHash = crypto.createHash("sha256").update(file).digest("hex");

      // Generate unique file path
      const fileExtension = path.extname(filename);
      const uniqueFilename = `${uuidv4()}${fileExtension}`;
      const filePath = `${userId}/${uniqueFilename}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("company-documents")
        .upload(filePath, file, {
          contentType: mimeType,
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Failed to upload file: ${uploadError.message}`);
      }

      // Create database record
      const documentId = uuidv4();
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from("company_documents")
        .insert({
          id: documentId,
          user_id: userId,
          company_profile_id: companyProfileId,
          original_filename: filename,
          file_path: filePath,
          file_size: file.length,
          file_type: "application/pdf",
          mime_type: mimeType,
          document_type: documentType || "other",
          description,
          upload_status: "uploaded",
          analysis_status: "pending",
          ai_analysis: {},
          key_insights: [],
          terminology_found: [],
          products_services: [],
          target_market_info: [],
          openai_tokens_used: 0,
          virus_scan_status: "pending",
          file_hash: fileHash,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (error) {
        // Clean up uploaded file if database insert fails
        await supabase.storage.from("company-documents").remove([filePath]);
        throw new Error(`Failed to create document record: ${error.message}`);
      }

      // Queue document for processing
      await this.queueDocumentProcessing(documentId, userId, "ai_analysis");

      return this.mapDatabaseToDocument(data);
    } catch (error) {
      console.error("Error uploading document:", error);
      throw error;
    }
  }

  /**
   * Validate uploaded file
   */
  private validateFile(file: Buffer, filename: string, mimeType: string): void {
    // Check file size (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.length > maxSize) {
      throw new Error("File size exceeds 50MB limit");
    }

    // Check file type
    if (mimeType !== "application/pdf") {
      throw new Error("Only PDF files are allowed");
    }

    // Check file extension
    const extension = path.extname(filename).toLowerCase();
    if (extension !== ".pdf") {
      throw new Error("File must have .pdf extension");
    }

    // Basic PDF header check
    const pdfHeader = file.slice(0, 4).toString();
    if (pdfHeader !== "%PDF") {
      throw new Error("Invalid PDF file format");
    }
  }

  /**
   * Queue document for background processing
   */
  private async queueDocumentProcessing(
    documentId: string,
    userId: string,
    jobType: "text_extraction" | "ai_analysis" | "batch_analysis",
    priority: number = 5
  ): Promise<ProcessingJob> {
    try {
      const jobId = uuidv4();
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from("document_processing_jobs")
        .insert({
          id: jobId,
          user_id: userId,
          document_id: documentId,
          job_type: jobType,
          job_status: "queued",
          priority,
          retry_count: 0,
          max_retries: 3,
          job_results: {},
          tokens_used: 0,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to queue processing job: ${error.message}`);
      }

      return this.mapDatabaseToProcessingJob(data);
    } catch (error) {
      console.error("Error queueing document processing:", error);
      throw error;
    }
  }

  /**
   * Process document with AI analysis
   */
  async processDocument(
    documentId: string,
    userId: string
  ): Promise<DocumentAnalysisResult> {
    const startTime = Date.now();
    let tokensUsed = 0;

    try {
      // Get document record
      const document = await this.getDocument(documentId, userId);
      if (!document) {
        throw new Error("Document not found");
      }

      // Update status to processing
      await this.updateDocumentStatus(documentId, "processing", "processing");

      // Get user's OpenAI client
      const userOpenAI = await this.getUserOpenAIClient(userId);
      if (!userOpenAI) {
        throw new Error("OpenAI not configured for this user");
      }

      // Extract text from PDF (placeholder - would use actual PDF parsing library)
      const extractedText = await this.extractTextFromPDF(document.filePath);

      // Perform AI analysis
      const analysisResult = await this.performAIAnalysis(
        userOpenAI,
        extractedText,
        document
      );
      tokensUsed = analysisResult.tokensUsed;

      // Update document with analysis results
      await this.updateDocumentWithAnalysis(
        documentId,
        extractedText,
        analysisResult
      );

      // Update company profile with extracted insights
      await this.updateCompanyProfileWithInsights(
        document.companyProfileId,
        analysisResult.extractedInsights
      );

      return {
        success: true,
        document: await this.getDocument(documentId, userId),
        extractedInsights: analysisResult.extractedInsights,
        processingTimeMs: Date.now() - startTime,
        tokensUsed,
      };
    } catch (error) {
      console.error("Error processing document:", error);

      // Update document status to failed
      await this.updateDocumentStatus(
        documentId,
        "failed",
        "failed",
        error instanceof Error ? error.message : "Unknown error"
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        processingTimeMs: Date.now() - startTime,
        tokensUsed,
      };
    }
  }

  /**
   * Extract text from PDF using pdf-parse library
   */
  private async extractTextFromPDF(filePath: string): Promise<string> {
    try {
      // Download file from Supabase Storage
      const { data, error } = await supabase.storage
        .from("company-documents")
        .download(filePath);

      if (error) {
        throw new Error(`Failed to download file: ${error.message}`);
      }

      // Convert blob to buffer
      const arrayBuffer = await data.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Extract text using pdf-parse (dynamic import)
      const pdfParse = (await import("pdf-parse")).default;
      const pdfData = await pdfParse(buffer);

      // Return extracted text, with fallback if empty
      const extractedText = pdfData.text.trim();
      if (!extractedText) {
        throw new Error("No text content found in PDF document");
      }

      return extractedText;
    } catch (error) {
      console.error("Error extracting text from PDF:", error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Failed to extract text from PDF");
    }
  }

  /**
   * Perform AI analysis on extracted text
   */
  private async performAIAnalysis(
    openai: OpenAI,
    extractedText: string,
    document: CompanyDocument
  ): Promise<{
    extractedInsights: any;
    aiAnalysis: any;
    keyInsights: string[];
    terminologyFound: string[];
    productsServices: string[];
    targetMarketInfo: string[];
    tokensUsed: number;
  }> {
    const systemPrompt = `You are an expert business analyst specializing in extracting key business information from company documents. Analyze the provided document text and extract structured business intelligence.

Extract the following information:
1. Company description and overview
2. Products and services offered
3. Target market and customer segments
4. Value propositions and key benefits
5. Industry-specific terminology
6. Competitive advantages and differentiators
7. Business model indicators
8. Customer pain points addressed

Respond in JSON format with detailed, actionable insights.`;

    const userPrompt = `Analyze this company document and extract key business information:

Document Type: ${document.documentType}
Original Filename: ${document.originalFilename}
Description: ${document.description || "Not provided"}

Document Content:
${extractedText}

Please provide a comprehensive analysis focusing on business intelligence that would be useful for customizing AI agent prompts and lead qualification criteria.`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 2000,
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(
        completion.choices[0]?.message?.content || "{}"
      );
      const tokensUsed = completion.usage?.total_tokens || 0;

      // Structure the extracted insights
      const extractedInsights = {
        companyDescription: result.companyDescription || "",
        productsServices: result.productsServices || [],
        targetMarket: result.targetMarket || "",
        valuePropositions: result.valuePropositions || [],
        industryTerminology: result.industryTerminology || [],
        competitiveAdvantages: result.competitiveAdvantages || [],
        keyDifferentiators: result.keyDifferentiators || [],
        businessModel: result.businessModel || "",
        customerSegments: result.customerSegments || [],
      };

      return {
        extractedInsights,
        aiAnalysis: result,
        keyInsights: result.keyInsights || [],
        terminologyFound: result.industryTerminology || [],
        productsServices: result.productsServices || [],
        targetMarketInfo: result.customerSegments || [],
        tokensUsed,
      };
    } catch (error) {
      console.error("Error performing AI analysis:", error);
      throw new Error("Failed to analyze document with AI");
    }
  }

  /**
   * Update document with analysis results
   */
  private async updateDocumentWithAnalysis(
    documentId: string,
    extractedContent: string,
    analysisResult: any
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from("company_documents")
        .update({
          extracted_content: extractedContent,
          ai_analysis: analysisResult.aiAnalysis,
          key_insights: analysisResult.keyInsights,
          terminology_found: analysisResult.terminologyFound,
          products_services: analysisResult.productsServices,
          target_market_info: analysisResult.targetMarketInfo,
          analysis_status: "completed",
          upload_status: "processed",
          processing_completed_at: new Date().toISOString(),
          openai_tokens_used: analysisResult.tokensUsed,
          updated_at: new Date().toISOString(),
        })
        .eq("id", documentId);

      if (error) {
        throw new Error(`Failed to update document: ${error.message}`);
      }
    } catch (error) {
      console.error("Error updating document with analysis:", error);
      throw error;
    }
  }

  /**
   * Update company profile with extracted insights
   */
  private async updateCompanyProfileWithInsights(
    companyProfileId: string,
    extractedInsights: any
  ): Promise<void> {
    try {
      // Get current company profile
      const { data: profile, error: fetchError } = await supabase
        .from("company_profiles")
        .select("*")
        .eq("id", companyProfileId)
        .single();

      if (fetchError) {
        throw new Error(
          `Failed to fetch company profile: ${fetchError.message}`
        );
      }

      // Merge extracted insights with existing data
      const updatedProfile = {
        // Update fields if they're empty or enhance existing ones
        company_name:
          profile.company_name ||
          extractedInsights.companyDescription?.split(" ")[0] ||
          profile.company_name,
        value_proposition:
          profile.value_proposition ||
          extractedInsights.valuePropositions?.join(". ") ||
          profile.value_proposition,
        target_market:
          profile.target_market ||
          extractedInsights.targetMarket ||
          profile.target_market,
        competitive_advantages:
          profile.competitive_advantages ||
          extractedInsights.competitiveAdvantages?.join(". ") ||
          profile.competitive_advantages,
        business_model:
          profile.business_model ||
          extractedInsights.businessModel ||
          profile.business_model,

        // Merge arrays
        key_differentiators: this.mergeArrays(
          profile.key_differentiators || [],
          extractedInsights.keyDifferentiators || []
        ),
        industry_terminology: this.mergeArrays(
          profile.industry_terminology || [],
          extractedInsights.industryTerminology || []
        ),

        // Document-specific fields
        ai_extracted_insights: extractedInsights,
        document_derived_terminology:
          extractedInsights.industryTerminology || [],
        extracted_products_services: extractedInsights.productsServices || [],
        extracted_target_customers: extractedInsights.customerSegments || [],
        document_analysis_status: "completed",
        document_analysis_completed_at: new Date().toISOString(),
        documents_uploaded: (profile.documents_uploaded || 0) + 1,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("company_profiles")
        .update(updatedProfile)
        .eq("id", companyProfileId);

      if (error) {
        throw new Error(`Failed to update company profile: ${error.message}`);
      }
    } catch (error) {
      console.error("Error updating company profile with insights:", error);
      throw error;
    }
  }

  /**
   * Merge two arrays and remove duplicates
   */
  private mergeArrays(existing: string[], newItems: string[]): string[] {
    const combined = [...existing, ...newItems];
    return [...new Set(combined.map((item) => item.toLowerCase()))].map(
      (item) =>
        combined.find((original) => original.toLowerCase() === item) || item
    );
  }

  /**
   * Update document status
   */
  private async updateDocumentStatus(
    documentId: string,
    uploadStatus: string,
    analysisStatus: string,
    errorMessage?: string
  ): Promise<void> {
    try {
      const updateData: any = {
        upload_status: uploadStatus,
        analysis_status: analysisStatus,
        updated_at: new Date().toISOString(),
      };

      if (uploadStatus === "processing") {
        updateData.processing_started_at = new Date().toISOString();
      }

      if (errorMessage) {
        updateData.processing_error = errorMessage;
      }

      const { error } = await supabase
        .from("company_documents")
        .update(updateData)
        .eq("id", documentId);

      if (error) {
        throw new Error(`Failed to update document status: ${error.message}`);
      }
    } catch (error) {
      console.error("Error updating document status:", error);
      throw error;
    }
  }

  /**
   * Get document by ID
   */
  async getDocument(
    documentId: string,
    userId: string
  ): Promise<CompanyDocument | null> {
    try {
      const { data, error } = await supabase
        .from("company_documents")
        .select("*")
        .eq("id", documentId)
        .eq("user_id", userId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return null; // Document not found
        }
        throw new Error(`Failed to get document: ${error.message}`);
      }

      return this.mapDatabaseToDocument(data);
    } catch (error) {
      console.error("Error getting document:", error);
      throw error;
    }
  }

  /**
   * Get all documents for a user
   */
  async getUserDocuments(
    userId: string,
    companyProfileId?: string
  ): Promise<CompanyDocument[]> {
    try {
      let query = supabase
        .from("company_documents")
        .select("*")
        .eq("user_id", userId);

      if (companyProfileId) {
        query = query.eq("company_profile_id", companyProfileId);
      }

      query = query.order("created_at", { ascending: false });

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to get user documents: ${error.message}`);
      }

      return data?.map(this.mapDatabaseToDocument) || [];
    } catch (error) {
      console.error("Error getting user documents:", error);
      throw error;
    }
  }

  /**
   * Delete document
   */
  async deleteDocument(documentId: string, userId: string): Promise<void> {
    try {
      // Get document to get file path
      const document = await this.getDocument(documentId, userId);
      if (!document) {
        throw new Error("Document not found");
      }

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("company-documents")
        .remove([document.filePath]);

      if (storageError) {
        console.error("Error deleting file from storage:", storageError);
        // Continue with database deletion even if storage deletion fails
      }

      // Delete from database
      const { error } = await supabase
        .from("company_documents")
        .delete()
        .eq("id", documentId)
        .eq("user_id", userId);

      if (error) {
        throw new Error(`Failed to delete document: ${error.message}`);
      }
    } catch (error) {
      console.error("Error deleting document:", error);
      throw error;
    }
  }

  /**
   * Get document download URL
   */
  async getDocumentDownloadUrl(
    documentId: string,
    userId: string
  ): Promise<string> {
    try {
      const document = await this.getDocument(documentId, userId);
      if (!document) {
        throw new Error("Document not found");
      }

      const { data, error } = await supabase.storage
        .from("company-documents")
        .createSignedUrl(document.filePath, 3600); // 1 hour expiry

      if (error) {
        throw new Error(`Failed to create download URL: ${error.message}`);
      }

      return data.signedUrl;
    } catch (error) {
      console.error("Error getting document download URL:", error);
      throw error;
    }
  }

  /**
   * Map database row to CompanyDocument interface
   */
  private mapDatabaseToDocument(data: any): CompanyDocument {
    return {
      id: data.id,
      userId: data.user_id,
      companyProfileId: data.company_profile_id,
      originalFilename: data.original_filename,
      filePath: data.file_path,
      fileSize: data.file_size,
      fileType: data.file_type,
      mimeType: data.mime_type,
      documentType: data.document_type,
      description: data.description,
      uploadStatus: data.upload_status,
      analysisStatus: data.analysis_status,
      extractedContent: data.extracted_content,
      aiAnalysis: data.ai_analysis || {},
      keyInsights: data.key_insights || [],
      terminologyFound: data.terminology_found || [],
      productsServices: data.products_services || [],
      targetMarketInfo: data.target_market_info || [],
      processingStartedAt: data.processing_started_at
        ? new Date(data.processing_started_at)
        : undefined,
      processingCompletedAt: data.processing_completed_at
        ? new Date(data.processing_completed_at)
        : undefined,
      processingError: data.processing_error,
      openaiTokensUsed: data.openai_tokens_used || 0,
      virusScanStatus: data.virus_scan_status,
      fileHash: data.file_hash,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  /**
   * Map database row to ProcessingJob interface
   */
  private mapDatabaseToProcessingJob(data: any): ProcessingJob {
    return {
      id: data.id,
      userId: data.user_id,
      documentId: data.document_id,
      jobType: data.job_type,
      jobStatus: data.job_status,
      priority: data.priority,
      startedAt: data.started_at ? new Date(data.started_at) : undefined,
      completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
      processingTimeMs: data.processing_time_ms,
      errorMessage: data.error_message,
      retryCount: data.retry_count,
      maxRetries: data.max_retries,
      jobResults: data.job_results || {},
      tokensUsed: data.tokens_used || 0,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }
}
