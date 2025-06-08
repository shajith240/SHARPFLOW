import { EmailMonitoringManager } from "./EmailMonitoringManager.js";
import { GmailService } from "./GmailService.js";
import { GoogleCalendarService } from "./GoogleCalendarService.js";
import { NotificationService } from "./NotificationService.js";
import { supabase } from "../db.js";
import { v4 as uuidv4 } from "uuid";

export interface EmailMonitoringSetupConfig {
  userId: string;
  monitoring_enabled: boolean;
  check_interval: number; // in minutes
  filter_criteria?: {
    includeSpamTrash?: boolean;
    maxResults?: number;
    labelIds?: string[];
    query?: string;
  };
  notification_preferences?: {
    email_notifications: boolean;
    websocket_notifications: boolean;
    notification_sound: boolean;
  };
}

export interface SetupResult {
  success: boolean;
  message: string;
  configuration?: any;
  errors?: string[];
  warnings?: string[];
}

/**
 * Email Monitoring Setup Service
 * Handles the complete setup and configuration of email monitoring for users
 */
export class EmailMonitoringSetup {
  private emailManager: EmailMonitoringManager;
  private notificationService: NotificationService;

  constructor() {
    this.emailManager = EmailMonitoringManager.getInstance();
    this.notificationService = new NotificationService();
  }

  /**
   * Complete setup of email monitoring for a user
   */
  async setupEmailMonitoring(config: EmailMonitoringSetupConfig): Promise<SetupResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    try {
      console.log(`🚀 Setting up email monitoring for user ${config.userId}`);

      // Step 1: Validate environment and dependencies
      const validationResult = await this.validateEnvironment();
      if (!validationResult.success) {
        return {
          success: false,
          message: "Environment validation failed",
          errors: validationResult.errors,
        };
      }

      if (validationResult.warnings) {
        warnings.push(...validationResult.warnings);
      }

      // Step 2: Test Gmail API connection
      const gmailTest = await this.testGmailConnection();
      if (!gmailTest.success) {
        errors.push(`Gmail API connection failed: ${gmailTest.error}`);
      }

      // Step 3: Test Google Calendar connection (optional)
      const calendarTest = await this.testCalendarConnection();
      if (!calendarTest.success) {
        warnings.push(`Google Calendar not configured: ${calendarTest.error}`);
      }

      // Step 4: Create monitoring configuration
      await this.emailManager.updateMonitoringConfig(config.userId, {
        monitoring_enabled: config.monitoring_enabled,
        check_interval: config.check_interval,
        filter_criteria: config.filter_criteria || {},
      });

      // Step 5: Start monitoring if enabled
      if (config.monitoring_enabled) {
        await this.emailManager.startUserMonitoring(config.userId);
      }

      // Step 6: Send setup completion notification
      await this.notificationService.createNotification({
        userId: config.userId,
        type: "system_notification",
        title: "Email Monitoring Setup Complete",
        message: `Sentinel email monitoring is now ${config.monitoring_enabled ? 'active' : 'configured but disabled'}`,
        agentName: "sentinel",
        metadata: {
          checkInterval: config.check_interval,
          gmailConnected: gmailTest.success,
          calendarConnected: calendarTest.success,
        },
      });

      const setupConfig = {
        monitoring_enabled: config.monitoring_enabled,
        check_interval: config.check_interval,
        gmail_connected: gmailTest.success,
        calendar_connected: calendarTest.success,
        filter_criteria: config.filter_criteria,
        notification_preferences: config.notification_preferences,
      };

      return {
        success: errors.length === 0,
        message: errors.length === 0 
          ? "✅ Email monitoring setup completed successfully"
          : "⚠️ Email monitoring setup completed with some issues",
        configuration: setupConfig,
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined,
      };

    } catch (error: any) {
      console.error("❌ Email monitoring setup failed:", error);
      
      return {
        success: false,
        message: `Email monitoring setup failed: ${error.message}`,
        errors: [error.message],
      };
    }
  }

  /**
   * Validate environment and dependencies
   */
  private async validateEnvironment(): Promise<{
    success: boolean;
    errors?: string[];
    warnings?: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required environment variables
    const requiredVars = [
      "SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
      "OPENAI_API_KEY",
      "GMAIL_CLIENT_ID",
      "GMAIL_CLIENT_SECRET", 
      "GMAIL_REFRESH_TOKEN",
    ];

    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      errors.push(`Missing environment variables: ${missingVars.join(", ")}`);
    }

    // Check Redis configuration
    if (!process.env.REDIS_URL && process.env.USE_REDIS !== "false") {
      warnings.push("Redis URL not configured, using in-memory queue for development");
    }

    // Check database connection
    try {
      const { error } = await supabase
        .from("email_monitoring_config")
        .select("count", { count: "exact" })
        .limit(1);

      if (error) {
        errors.push(`Database connection failed: ${error.message}`);
      }
    } catch (error: any) {
      errors.push(`Database validation failed: ${error.message}`);
    }

    return {
      success: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Test Gmail API connection
   */
  private async testGmailConnection(): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const gmailService = new GmailService({
        clientId: process.env.GMAIL_CLIENT_ID!,
        clientSecret: process.env.GMAIL_CLIENT_SECRET!,
        refreshToken: process.env.GMAIL_REFRESH_TOKEN!,
      });

      const connectionTest = await gmailService.testConnection();
      
      return {
        success: connectionTest.connected,
        error: connectionTest.error,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Test Google Calendar connection
   */
  private async testCalendarConnection(): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Check if calendar credentials are configured
      if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET || !process.env.GMAIL_REFRESH_TOKEN) {
        return {
          success: false,
          error: "Calendar credentials not configured",
        };
      }

      const calendarService = new GoogleCalendarService(
        process.env.GMAIL_CLIENT_ID,
        process.env.GMAIL_CLIENT_SECRET,
        process.env.GMAIL_REFRESH_TOKEN
      );

      // Test calendar availability check
      const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const endTime = new Date(Date.now() + 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString();
      
      await calendarService.checkAvailability(startTime, endTime);
      
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get monitoring status for a user
   */
  async getMonitoringStatus(userId: string): Promise<any> {
    try {
      const status = await this.emailManager.getUserMonitoringStatus(userId);
      
      // Add additional status information
      const gmailTest = await this.testGmailConnection();
      const calendarTest = await this.testCalendarConnection();

      return {
        ...status,
        gmail_connected: gmailTest.success,
        calendar_connected: calendarTest.success,
        system_health: {
          database: !!supabase,
          redis: process.env.USE_REDIS !== "false",
          openai: !!process.env.OPENAI_API_KEY,
        },
      };
    } catch (error: any) {
      return {
        monitoring_enabled: false,
        status: "error",
        error: error.message,
      };
    }
  }

  /**
   * Disable monitoring for a user
   */
  async disableMonitoring(userId: string): Promise<SetupResult> {
    try {
      await this.emailManager.updateMonitoringConfig(userId, {
        monitoring_enabled: false,
      });

      await this.notificationService.createNotification({
        userId,
        type: "system_notification",
        title: "Email Monitoring Disabled",
        message: "Sentinel email monitoring has been disabled",
        agentName: "sentinel",
      });

      return {
        success: true,
        message: "✅ Email monitoring disabled successfully",
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to disable monitoring: ${error.message}`,
        errors: [error.message],
      };
    }
  }

  /**
   * Update monitoring configuration
   */
  async updateConfiguration(
    userId: string, 
    updates: Partial<EmailMonitoringSetupConfig>
  ): Promise<SetupResult> {
    try {
      const currentStatus = await this.emailManager.getUserMonitoringStatus(userId);
      
      const newConfig = {
        monitoring_enabled: updates.monitoring_enabled ?? currentStatus.monitoring_enabled,
        check_interval: updates.check_interval ?? currentStatus.check_interval,
        filter_criteria: updates.filter_criteria ?? currentStatus.filter_criteria,
      };

      await this.emailManager.updateMonitoringConfig(userId, newConfig);

      return {
        success: true,
        message: "✅ Monitoring configuration updated successfully",
        configuration: newConfig,
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to update configuration: ${error.message}`,
        errors: [error.message],
      };
    }
  }
}
