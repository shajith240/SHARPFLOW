import { supabase } from "../db";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

export class TelegramNotificationService {
  static async notifyLeadGenerationComplete(
    userId: string,
    leadsCount: number,
    searchCriteria: any
  ) {
    try {
      const telegramId = await this.getUserTelegramId(userId);
      if (!telegramId) return;

      const message =
        `🎉 **Lead Generation Complete!**\n\n` +
        `✅ Found **${leadsCount} new leads**\n\n` +
        `📍 **Search Criteria:**\n` +
        `• Locations: ${searchCriteria.locations.join(", ")}\n` +
        `• Industries: ${searchCriteria.businesses.join(", ")}\n` +
        `• Job Titles: ${searchCriteria.jobTitles.join(", ")}\n\n` +
        `🌐 **View Results:** https://sharpflow.com/dashboard\n\n` +
        `💡 Say "research profile" to generate detailed reports for your leads!`;

      await this.sendMessage(telegramId, message);
    } catch (error) {
      console.error("Failed to send lead generation notification:", error);
    }
  }

  static async notifyResearchReportComplete(
    userId: string,
    reportName: string,
    linkedinUrl: string
  ) {
    try {
      const telegramId = await this.getUserTelegramId(userId);
      if (!telegramId) return;

      const message =
        `📊 **Research Report Complete!**\n\n` +
        `✅ **Report:** ${reportName}\n` +
        `🔗 **Profile:** ${linkedinUrl}\n\n` +
        `📋 **Report includes:**\n` +
        `• Personal & company profile\n` +
        `• Pain points analysis\n` +
        `• Business opportunities\n` +
        `• Engagement recommendations\n\n` +
        `🌐 **View Report:** https://sharpflow.com/dashboard\n\n` +
        `💡 Use this research to craft personalized outreach messages!`;

      await this.sendMessage(telegramId, message);
    } catch (error) {
      console.error("Failed to send research report notification:", error);
    }
  }

  static async notifyJobFailed(
    userId: string,
    jobType: string,
    errorMessage: string
  ) {
    try {
      const telegramId = await this.getUserTelegramId(userId);
      if (!telegramId) return;

      const message =
        `❌ **${
          jobType.charAt(0).toUpperCase() + jobType.slice(1)
        } Failed**\n\n` +
        `Something went wrong with your request.\n\n` +
        `🔧 **What to try:**\n` +
        `• Check your plan limits\n` +
        `• Verify LinkedIn URL format\n` +
        `• Try again in a few minutes\n\n` +
        `💬 Need help? Contact support through your dashboard.\n\n` +
        `🌐 **Dashboard:** https://sharpflow.com/dashboard`;

      await this.sendMessage(telegramId, message);
    } catch (error) {
      console.error("Failed to send job failure notification:", error);
    }
  }

  static async notifyPlanLimitReached(
    userId: string,
    limitType: "leads" | "research" | "emails",
    current: number,
    limit: number
  ) {
    try {
      const telegramId = await this.getUserTelegramId(userId);
      if (!telegramId) return;

      const limitLabels = {
        leads: "Lead Generation",
        research: "Research Reports",
        emails: "Email Campaigns",
      };

      const message =
        `⚠️ **Plan Limit Reached**\n\n` +
        `You've reached your monthly ${limitLabels[limitType]} limit.\n\n` +
        `📊 **Usage:** ${current}/${limit}\n` +
        `📅 **Resets:** Next month\n\n` +
        `🚀 **Upgrade your plan** to continue:\n` +
        `• Starter: 100 leads/month\n` +
        `• Professional: 500 leads + 50 reports\n` +
        `• Ultra: 1000 leads + 100 reports + 2000 emails\n\n` +
        `💳 **Upgrade:** https://sharpflow.com/pricing`;

      await this.sendMessage(telegramId, message);
    } catch (error) {
      console.error("Failed to send plan limit notification:", error);
    }
  }

  static async notifyWelcome(userId: string, plan: string) {
    try {
      const telegramId = await this.getUserTelegramId(userId);
      if (!telegramId) return;

      const planFeatures = {
        starter: "• 100 leads per month\n• Basic lead filtering",
        professional:
          "• 500 leads per month\n• 50 research reports\n• Advanced filtering\n• LinkedIn research",
        ultra:
          "• 1000+ leads per month\n• 100 research reports\n• Email automation\n• All features included",
      };

      const message =
        `🎉 **Welcome to SharpFlow!**\n\n` +
        `Your Telegram bot is now connected to your ${
          plan.charAt(0).toUpperCase() + plan.slice(1)
        } plan.\n\n` +
        `🚀 **Your Plan Includes:**\n` +
        `${planFeatures[plan as keyof typeof planFeatures]}\n\n` +
        `💡 **Quick Start:**\n` +
        `• Say "generate leads" to find prospects\n` +
        `• Say "research profile" for detailed analysis\n` +
        `• Say "help" to see all commands\n\n` +
        `🌐 **Dashboard:** https://sharpflow.com/dashboard`;

      await this.sendMessage(telegramId, message);
    } catch (error) {
      console.error("Failed to send welcome notification:", error);
    }
  }

  static async notifyDailyUsageSummary(userId: string) {
    try {
      const telegramId = await this.getUserTelegramId(userId);
      if (!telegramId) return;

      // Get today's usage
      const today = new Date().toISOString().split("T")[0];
      const { data: todayJobs } = await supabase
        .from("agent_jobs")
        .select("agent_type, status")
        .eq("user_id", userId)
        .gte("created_at", `${today}T00:00:00Z`)
        .lt("created_at", `${today}T23:59:59Z`);

      const stats = {
        leadgen:
          todayJobs?.filter(
            (j) => j.agent_type === "leadgen" && j.status === "completed"
          ).length || 0,
        research:
          todayJobs?.filter(
            (j) => j.agent_type === "research" && j.status === "completed"
          ).length || 0,
        email:
          todayJobs?.filter(
            (j) => j.agent_type === "email" && j.status === "completed"
          ).length || 0,
      };

      if (stats.leadgen === 0 && stats.research === 0 && stats.email === 0) {
        return; // Don't send if no activity
      }

      const message =
        `📊 **Daily Summary - ${new Date().toLocaleDateString()}**\n\n` +
        `✅ **Completed Today:**\n` +
        `• ${stats.leadgen} lead generation jobs\n` +
        `• ${stats.research} research reports\n` +
        `• ${stats.email} email campaigns\n\n` +
        `🌐 **View Details:** https://sharpflow.com/dashboard\n\n` +
        `💡 Keep the momentum going tomorrow!`;

      await this.sendMessage(telegramId, message);
    } catch (error) {
      console.error("Failed to send daily summary:", error);
    }
  }

  private static async getUserTelegramId(
    userId: string
  ): Promise<number | null> {
    try {
      const { data: user } = await supabase
        .from("users")
        .select("telegram_id")
        .eq("id", userId)
        .single();

      return user?.telegram_id || null;
    } catch (error) {
      console.error("Failed to get user Telegram ID:", error);
      return null;
    }
  }

  private static async sendMessage(telegramId: number, text: string) {
    try {
      const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: telegramId,
          text,
          parse_mode: "Markdown",
          disable_web_page_preview: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`Telegram API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Failed to send Telegram message:", error);
      throw error;
    }
  }

  // Utility method to link Telegram account
  static async linkTelegramAccount(
    userId: string,
    telegramId: number,
    username?: string
  ) {
    try {
      const { error } = await supabase
        .from("users")
        .update({
          telegram_id: telegramId,
          telegram_username: username,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (error) {
        throw error;
      }

      // Send welcome message
      const { data: user } = await supabase
        .from("users")
        .select("subscription_plan")
        .eq("id", userId)
        .single();

      await this.notifyWelcome(userId, user?.subscription_plan || "starter");

      return { success: true };
    } catch (error) {
      console.error("Failed to link Telegram account:", error);
      throw error;
    }
  }

  // Utility method to unlink Telegram account
  static async unlinkTelegramAccount(userId: string) {
    try {
      const { error } = await supabase
        .from("users")
        .update({
          telegram_id: null,
          telegram_username: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      console.error("Failed to unlink Telegram account:", error);
      throw error;
    }
  }

  // Method to broadcast system announcements
  static async broadcastAnnouncement(message: string, planFilter?: string[]) {
    try {
      let query = supabase
        .from("users")
        .select("telegram_id, subscription_plan")
        .not("telegram_id", "is", null);

      if (planFilter && planFilter.length > 0) {
        query = query.in("subscription_plan", planFilter);
      }

      const { data: users } = await query;

      if (!users || users.length === 0) {
        return { sent: 0 };
      }

      const promises = users.map((user) =>
        this.sendMessage(
          user.telegram_id,
          `📢 **SharpFlow Announcement**\n\n${message}`
        ).catch((error) =>
          console.error(`Failed to send to ${user.telegram_id}:`, error)
        )
      );

      await Promise.allSettled(promises);

      return { sent: users.length };
    } catch (error) {
      console.error("Failed to broadcast announcement:", error);
      throw error;
    }
  }
}
