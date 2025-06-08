// AI Agents Type Definitions
export interface AgentJob {
  id: string;
  userId: string;
  agentName: string;
  jobType: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  inputData: any;
  resultData?: any;
  errorMessage?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface AgentResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    processingTime: number;
    recordsProcessed: number;
    [key: string]: any;
  };
}

export interface ChatMessage {
  id: string;
  userId: string;
  sessionId: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  metadata?: {
    agentName?: string;
    jobId?: string;
    [key: string]: any;
  };
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  status: "active" | "completed" | "archived";
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt?: Date;
}

export interface AgentStatus {
  name: string;
  status: "active" | "processing" | "idle" | "error";
  lastActivity: Date;
  tasksCompleted: number;
  tasksInQueue: number;
  uptime: number;
  version: string;
}

export interface LeadGenerationRequest {
  locations: string[];
  businesses: string[];
  jobTitles: string[];
  maxResults?: number;
}

export interface LeadResearchRequest {
  linkedinUrl: string;
  leadId?: string;
  includeCompanyAnalysis?: boolean;
  includeContactRecommendations?: boolean;
}

export interface AutoReplyRequest {
  leadId: string;
  messageType: "initial_outreach" | "follow_up" | "response";
  context?: string;
  tone?: "professional" | "casual" | "friendly";
}

export interface EmailMonitoringRequest {
  monitoringEnabled: boolean;
  checkInterval?: number; // in minutes
  filterCriteria?: {
    excludeDomains?: string[];
    includeDomains?: string[];
    keywords?: string[];
  };
}

export interface EmailResponseRequest {
  emailAddress: string;
  threadId: string;
  messageId: string;
  emailContent: string;
  previousContext?: string;
  responseType: "information" | "calendar" | "escalation";
}

export interface CalendarBookingRequest {
  emailAddress: string;
  threadId: string;
  messageId: string;
  requestedDateTime?: string;
  requestedDate?: string;
  eventType: "consultation" | "demo" | "meeting";
  duration?: number; // in minutes
}

// WebSocket Event Types
export interface WebSocketEvent {
  type: string;
  payload: any;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
}

export interface ProgressUpdate {
  jobId: string;
  progress: number;
  message: string;
  stage: string;
  agentName?: string;
  estimatedTimeRemaining?: number;
}

export interface AgentCapability {
  name: string;
  description: string;
  inputSchema: any;
  outputSchema: any;
  examples: string[];
}

// Intent Recognition Types
export interface UserIntent {
  type:
    | "lead_generation"
    | "lead_research"
    | "auto_reply"
    | "email_monitoring"
    | "email_automation"
    | "email_response"
    | "calendar_booking"
    | "reminder"
    | "data_export"
    | "platform_help"
    | "account_management"
    | "integration_setup"
    | "analytics_reporting"
    | "troubleshooting"
    | "general_query"
    | "help";
  confidence: number;
  parameters: Record<string, any>;
  requiredAgent: "falcon" | "sage" | "sentinel" | "prism";
}

export interface IntentRecognitionResult {
  intent: UserIntent;
  extractedEntities: Record<string, any>;
  suggestedActions: string[];
  requiresConfirmation: boolean;
  response?: string; // OpenAI generated response
}
