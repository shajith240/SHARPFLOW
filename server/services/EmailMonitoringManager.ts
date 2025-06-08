import { EmailMonitoringScheduler } from "./EmailMonitoringScheduler.js";
import { supabase } from "../db.js";
import { NotificationService } from "./NotificationService.js";

export class EmailMonitoringManager {
  private scheduler: EmailMonitoringScheduler;
  private notificationService: NotificationService;
  private static instance: EmailMonitoringManager;

  constructor() {
    this.scheduler = new EmailMonitoringScheduler();
    this.notificationService = new NotificationService();
    
    // Setup event listeners
    this.setupEventListeners();
  }

  static getInstance(): EmailMonitoringManager {
    if (!EmailMonitoringManager.instance) {
      EmailMonitoringManager.instance = new EmailMonitoringManager();
    }
    return EmailMonitoringManager.instance;
  }

  private setupEventListeners(): void {
    // Listen for monitoring completion events
    this.scheduler.on("monitoring:completed", async (event) => {
      console.log(`📧 Email monitoring completed for user ${event.userId}`);
      
      // Send notification if emails were processed
      if (event.result?.emailsProcessed > 0) {
        await this.notificationService.createNotification({
          userId: event.userId,
          type: "job_completed",
          title: "New Emails Processed",
          message: `Sentinel processed ${event.result.emailsProcessed} new email(s)`,
          agentName: "sentinel",
          jobId: event.jobId,
          jobType: "email_monitoring",
          metadata: event.result,
        });
      }
    });

    // Listen for monitoring failure events
    this.scheduler.on("monitoring:failed", async (event) => {
      console.error(`❌ Email monitoring failed for user ${event.userId}:`, event.error);
      
      // Send error notification
      if (event.userId) {
        await this.notificationService.createNotification({
          userId: event.userId,
          type: "job_failed",
          title: "Email Monitoring Error",
          message: `Email monitoring failed: ${event.error}`,
          agentName: "sentinel",
          jobId: event.jobId,
          jobType: "email_monitoring",
          metadata: { error: event.error },
        });
      }
    });
  }

  /**
   * Start email monitoring for a user
   */
  async startUserMonitoring(userId: string): Promise<void> {
    try {
      await this.scheduler.startMonitoring(userId);
      console.log(`✅ Email monitoring started for user ${userId}`);
    } catch (error: any) {
      console.error(`❌ Failed to start email monitoring for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Stop email monitoring for a user
   */
  async stopUserMonitoring(userId: string): Promise<void> {
    try {
      await this.scheduler.stopMonitoring(userId);
      console.log(`✅ Email monitoring stopped for user ${userId}`);
    } catch (error: any) {
      console.error(`❌ Failed to stop email monitoring for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Update monitoring configuration for a user
   */
  async updateMonitoringConfig(
    userId: string,
    config: {
      monitoring_enabled: boolean;
      check_interval?: number;
      filter_criteria?: any;
    }
  ): Promise<void> {
    if (!supabase) {
      throw new Error("Supabase not configured");
    }

    try {
      // Update configuration in database
      const { error } = await supabase
        .from("email_monitoring_config")
        .upsert({
          user_id: userId,
          monitoring_enabled: config.monitoring_enabled,
          check_interval: config.check_interval || 1,
          filter_criteria: config.filter_criteria || {},
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      // Start or stop monitoring based on configuration
      if (config.monitoring_enabled) {
        await this.startUserMonitoring(userId);
      } else {
        await this.stopUserMonitoring(userId);
      }

      console.log(`✅ Monitoring configuration updated for user ${userId}`);
    } catch (error: any) {
      console.error(`❌ Failed to update monitoring config for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get monitoring status for a user
   */
  async getUserMonitoringStatus(userId: string): Promise<any> {
    if (!supabase) {
      return { monitoring_enabled: false, status: "database_not_configured" };
    }

    try {
      // Get configuration from database
      const { data: config, error } = await supabase
        .from("email_monitoring_config")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // No config found
          return { monitoring_enabled: false, status: "not_configured" };
        }
        throw error;
      }

      // Get active monitoring jobs
      const monitoringJobs = await this.scheduler.getMonitoringStatus();
      const userJob = monitoringJobs.find(job => job.userId === userId);

      return {
        monitoring_enabled: config.monitoring_enabled,
        check_interval: config.check_interval,
        last_check_at: config.last_check_at,
        filter_criteria: config.filter_criteria,
        status: userJob ? "active" : "inactive",
        next_check: userJob?.nextRun,
        created_at: config.created_at,
        updated_at: config.updated_at,
      };
    } catch (error: any) {
      console.error(`❌ Failed to get monitoring status for user ${userId}:`, error);
      return { monitoring_enabled: false, status: "error", error: error.message };
    }
  }

  /**
   * Get monitoring status for all users
   */
  async getAllMonitoringStatus(): Promise<any[]> {
    if (!supabase) {
      return [];
    }

    try {
      const { data: configs, error } = await supabase
        .from("email_monitoring_config")
        .select("*")
        .eq("monitoring_enabled", true);

      if (error) {
        throw error;
      }

      const monitoringJobs = await this.scheduler.getMonitoringStatus();

      return configs.map(config => {
        const userJob = monitoringJobs.find(job => job.userId === config.user_id);
        
        return {
          user_id: config.user_id,
          monitoring_enabled: config.monitoring_enabled,
          check_interval: config.check_interval,
          last_check_at: config.last_check_at,
          status: userJob ? "active" : "inactive",
          next_check: userJob?.nextRun,
        };
      });
    } catch (error: any) {
      console.error("❌ Failed to get all monitoring status:", error);
      return [];
    }
  }

  /**
   * Initialize monitoring for all enabled users
   */
  async initializeAllMonitoring(): Promise<void> {
    if (!supabase) {
      console.warn("⚠️ Supabase not configured, skipping monitoring initialization");
      return;
    }

    try {
      console.log("🚀 Initializing email monitoring for all enabled users...");

      const { data: configs, error } = await supabase
        .from("email_monitoring_config")
        .select("user_id")
        .eq("monitoring_enabled", true);

      if (error) {
        throw error;
      }

      if (!configs || configs.length === 0) {
        console.log("📧 No users have email monitoring enabled");
        return;
      }

      console.log(`📧 Found ${configs.length} users with email monitoring enabled`);

      // Start monitoring for each enabled user
      for (const config of configs) {
        try {
          await this.startUserMonitoring(config.user_id);
          console.log(`✅ Monitoring started for user ${config.user_id}`);
        } catch (error: any) {
          console.error(`❌ Failed to start monitoring for user ${config.user_id}:`, error);
        }
      }

      console.log("✅ Email monitoring initialization complete");
    } catch (error: any) {
      console.error("❌ Failed to initialize email monitoring:", error);
    }
  }

  /**
   * Shutdown the monitoring manager
   */
  async shutdown(): Promise<void> {
    console.log("🔄 Shutting down Email Monitoring Manager...");
    await this.scheduler.shutdown();
    console.log("✅ Email Monitoring Manager shutdown complete");
  }
}
