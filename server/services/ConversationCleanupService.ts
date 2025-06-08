import { supabase } from "../db.js";
import { ConversationMemoryService } from "./ConversationMemoryService.js";
import cron from "node-cron";

export interface CleanupConfig {
  retentionDays: number;
  batchSize: number;
  enableSoftDelete: boolean;
  preserveSystemMessages: boolean;
  preserveErrorMessages: boolean;
  preserveSummaries: boolean;
  cleanupSchedule: string; // cron expression
}

export interface CleanupStats {
  messagesProcessed: number;
  messagesSoftDeleted: number;
  messagesHardDeleted: number;
  sessionsArchived: number;
  summariesGenerated: number;
  cacheEntriesCleared: number;
  executionTimeMs: number;
}

export class ConversationCleanupService {
  private conversationMemoryService: ConversationMemoryService;
  private config: CleanupConfig;
  private isRunning: boolean = false;
  private lastCleanup: Date | null = null;
  private cleanupTask: any = null;

  constructor() {
    this.conversationMemoryService = new ConversationMemoryService();
    this.config = this.getCleanupConfig();
    this.initializeScheduledCleanup();
  }

  /**
   * Get cleanup configuration from environment variables
   */
  private getCleanupConfig(): CleanupConfig {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    return {
      retentionDays: parseInt(process.env.CHAT_RETENTION_DAYS || (isDevelopment ? '30' : '180')), // 30 days dev, 6 months prod
      batchSize: parseInt(process.env.CLEANUP_BATCH_SIZE || '1000'),
      enableSoftDelete: process.env.ENABLE_SOFT_DELETE !== 'false',
      preserveSystemMessages: process.env.PRESERVE_SYSTEM_MESSAGES !== 'false',
      preserveErrorMessages: process.env.PRESERVE_ERROR_MESSAGES !== 'false',
      preserveSummaries: process.env.PRESERVE_SUMMARIES !== 'false',
      cleanupSchedule: process.env.CLEANUP_SCHEDULE || '0 2 * * *', // Daily at 2 AM
    };
  }

  /**
   * Initialize scheduled cleanup task
   */
  private initializeScheduledCleanup(): void {
    if (process.env.DISABLE_AUTO_CLEANUP === 'true') {
      console.log("🧹 Auto cleanup disabled via environment variable");
      return;
    }

    try {
      this.cleanupTask = cron.schedule(this.config.cleanupSchedule, async () => {
        console.log("🧹 Starting scheduled conversation cleanup...");
        await this.performCleanup();
      }, {
        scheduled: true,
        timezone: "UTC"
      });

      console.log(`🧹 Conversation cleanup scheduled: ${this.config.cleanupSchedule} (retention: ${this.config.retentionDays} days)`);
    } catch (error) {
      console.error("❌ Failed to schedule conversation cleanup:", error);
    }
  }

  /**
   * Perform comprehensive cleanup operation
   */
  async performCleanup(userId?: string): Promise<CleanupStats> {
    if (this.isRunning) {
      throw new Error("Cleanup operation already in progress");
    }

    this.isRunning = true;
    const startTime = Date.now();
    
    const stats: CleanupStats = {
      messagesProcessed: 0,
      messagesSoftDeleted: 0,
      messagesHardDeleted: 0,
      sessionsArchived: 0,
      summariesGenerated: 0,
      cacheEntriesCleared: 0,
      executionTimeMs: 0
    };

    try {
      console.log(`🧹 Starting conversation cleanup (retention: ${this.config.retentionDays} days)${userId ? ` for user: ${userId}` : ''}`);

      // Step 1: Generate summaries for conversations that will be cleaned
      if (this.config.preserveSummaries) {
        stats.summariesGenerated = await this.generateSummariesBeforeCleanup(userId);
      }

      // Step 2: Soft delete old messages
      if (this.config.enableSoftDelete) {
        stats.messagesSoftDeleted = await this.softDeleteOldMessages(userId);
      }

      // Step 3: Hard delete very old soft-deleted messages
      stats.messagesHardDeleted = await this.hardDeleteOldMessages(userId);

      // Step 4: Archive inactive sessions
      stats.sessionsArchived = await this.archiveInactiveSessions(userId);

      // Step 5: Clean expired cache
      stats.cacheEntriesCleared = await this.conversationMemoryService.cleanupExpiredCache();

      // Step 6: Update cleanup statistics
      await this.updateCleanupStats(stats);

      stats.executionTimeMs = Date.now() - startTime;
      this.lastCleanup = new Date();

      console.log(`✅ Cleanup completed in ${stats.executionTimeMs}ms:`, {
        messagesProcessed: stats.messagesProcessed,
        messagesSoftDeleted: stats.messagesSoftDeleted,
        messagesHardDeleted: stats.messagesHardDeleted,
        sessionsArchived: stats.sessionsArchived,
        summariesGenerated: stats.summariesGenerated,
        cacheEntriesCleared: stats.cacheEntriesCleared
      });

      return stats;
    } catch (error) {
      console.error("❌ Cleanup operation failed:", error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Generate conversation summaries before cleanup
   */
  private async generateSummariesBeforeCleanup(userId?: string): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

      // Find sessions with messages that will be deleted but don't have summaries
      let query = supabase
        .from('conversation_sessions')
        .select(`
          id,
          user_id,
          agent_type,
          context_summary,
          conversation_messages!inner(created_at)
        `)
        .lt('conversation_messages.created_at', cutoffDate.toISOString())
        .is('context_summary', null);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data: sessions, error } = await query;

      if (error) {
        console.error("Error finding sessions for summary generation:", error);
        return 0;
      }

      let summariesGenerated = 0;

      for (const session of sessions || []) {
        try {
          const summary = await this.conversationMemoryService.generateConversationSummary(
            session.user_id,
            session.agent_type,
            session.id
          );

          if (summary) {
            await supabase
              .from('conversation_sessions')
              .update({ context_summary: summary })
              .eq('id', session.id);

            summariesGenerated++;
          }
        } catch (error) {
          console.error(`Error generating summary for session ${session.id}:`, error);
        }
      }

      return summariesGenerated;
    } catch (error) {
      console.error("Error in generateSummariesBeforeCleanup:", error);
      return 0;
    }
  }

  /**
   * Soft delete old messages (mark as deleted)
   */
  private async softDeleteOldMessages(userId?: string): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

      // Build conditions for messages to preserve
      const preserveConditions = [];
      
      if (this.config.preserveSystemMessages) {
        preserveConditions.push("message_type != 'system'");
      }
      
      if (this.config.preserveErrorMessages) {
        preserveConditions.push("message_type != 'error'");
      }

      let query = supabase
        .from('conversation_messages')
        .update({ 
          is_context_relevant: false,
          updated_at: new Date().toISOString()
        })
        .lt('created_at', cutoffDate.toISOString())
        .eq('is_context_relevant', true);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      // Add preserve conditions
      if (preserveConditions.length > 0) {
        preserveConditions.forEach(condition => {
          query = query.not(condition.split(' ')[0], condition.split(' ')[1], condition.split(' ')[2]);
        });
      }

      const { data, error } = await query.select('id');

      if (error) {
        console.error("Error soft deleting messages:", error);
        return 0;
      }

      return data?.length || 0;
    } catch (error) {
      console.error("Error in softDeleteOldMessages:", error);
      return 0;
    }
  }

  /**
   * Hard delete very old soft-deleted messages
   */
  private async hardDeleteOldMessages(userId?: string): Promise<number> {
    try {
      const hardDeleteCutoff = new Date();
      hardDeleteCutoff.setDate(hardDeleteCutoff.getDate() - (this.config.retentionDays * 2)); // Double retention for hard delete

      let query = supabase
        .from('conversation_messages')
        .delete()
        .lt('created_at', hardDeleteCutoff.toISOString())
        .eq('is_context_relevant', false);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query.select('id');

      if (error) {
        console.error("Error hard deleting messages:", error);
        return 0;
      }

      return data?.length || 0;
    } catch (error) {
      console.error("Error in hardDeleteOldMessages:", error);
      return 0;
    }
  }

  /**
   * Archive inactive sessions
   */
  private async archiveInactiveSessions(userId?: string): Promise<number> {
    try {
      const inactiveCutoff = new Date();
      inactiveCutoff.setDate(inactiveCutoff.getDate() - (this.config.retentionDays / 2)); // Archive after half retention period

      let query = supabase
        .from('conversation_sessions')
        .update({ 
          status: 'archived',
          updated_at: new Date().toISOString()
        })
        .lt('last_activity_at', inactiveCutoff.toISOString())
        .eq('status', 'active');

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query.select('id');

      if (error) {
        console.error("Error archiving sessions:", error);
        return 0;
      }

      return data?.length || 0;
    } catch (error) {
      console.error("Error in archiveInactiveSessions:", error);
      return 0;
    }
  }

  /**
   * Update cleanup statistics
   */
  private async updateCleanupStats(stats: CleanupStats): Promise<void> {
    try {
      await supabase
        .from('system_stats')
        .upsert({
          stat_key: 'last_conversation_cleanup',
          stat_value: JSON.stringify({
            timestamp: new Date().toISOString(),
            stats
          }),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'stat_key'
        });
    } catch (error) {
      console.error("Error updating cleanup stats:", error);
    }
  }

  /**
   * Get cleanup status and statistics
   */
  async getCleanupStatus(): Promise<{
    isRunning: boolean;
    lastCleanup: Date | null;
    config: CleanupConfig;
    nextScheduledRun: string | null;
  }> {
    return {
      isRunning: this.isRunning,
      lastCleanup: this.lastCleanup,
      config: this.config,
      nextScheduledRun: this.cleanupTask?.getStatus()?.next || null
    };
  }

  /**
   * Manually trigger cleanup for a specific user
   */
  async cleanupUserData(userId: string): Promise<CleanupStats> {
    return this.performCleanup(userId);
  }

  /**
   * Update retention settings for a user
   */
  async updateUserRetentionSettings(
    userId: string,
    agentType: 'falcon' | 'sage' | 'sentinel' | 'prism',
    retentionDays: number
  ): Promise<void> {
    try {
      await supabase
        .from('agent_memory_preferences')
        .upsert({
          user_id: userId,
          agent_type: agentType,
          retention_days: retentionDays,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,agent_type'
        });
    } catch (error) {
      console.error("Error updating user retention settings:", error);
      throw error;
    }
  }

  /**
   * Stop scheduled cleanup
   */
  stopScheduledCleanup(): void {
    if (this.cleanupTask) {
      this.cleanupTask.stop();
      console.log("🧹 Scheduled cleanup stopped");
    }
  }

  /**
   * Start scheduled cleanup
   */
  startScheduledCleanup(): void {
    if (this.cleanupTask) {
      this.cleanupTask.start();
      console.log("🧹 Scheduled cleanup started");
    }
  }
}
