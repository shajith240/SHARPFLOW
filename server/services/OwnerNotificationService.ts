import { supabase } from "../db.js";
import { v4 as uuidv4 } from "uuid";

export interface NewSubscriptionNotification {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  subscriptionPlan: string;
  subscriptionId: string;
  paypalCustomerId: string;
  requiredAgents: string[];
  requiredApiKeys: string[];
  customerInfo: {
    companyName?: string;
    industry?: string;
    targetMarket?: string;
    businessSize?: string;
    primaryGoals?: string[];
  };
  status:
    | "pending_setup"
    | "api_keys_configured"
    | "agents_activated"
    | "completed";
  createdAt: Date;
  completedAt?: Date;
}

export class OwnerNotificationService {
  /**
   * Create notification when user subscribes
   */
  async notifyNewSubscription(
    userId: string,
    subscriptionData: {
      subscriptionPlan: string;
      subscriptionId: string;
      paypalCustomerId: string;
    }
  ): Promise<void> {
    try {
      // Get user details
      const { data: user } = await supabase
        .from("users")
        .select("email, first_name, last_name")
        .eq("id", userId)
        .single();

      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      // Get onboarding data if available
      const { data: onboarding } = await supabase
        .from("user_onboarding")
        .select("*")
        .eq("user_id", userId)
        .single();

      // Get required agents for this plan
      const { data: planFeatures } = await supabase
        .from("subscription_plan_features")
        .select("agent_name")
        .eq("plan_name", subscriptionData.subscriptionPlan)
        .eq("is_included", true);

      const requiredAgents = planFeatures?.map((f) => f.agent_name) || [];
      const requiredApiKeys = this.getRequiredApiKeys(requiredAgents);

      // Create owner notification
      const notification: NewSubscriptionNotification = {
        id: uuidv4(),
        userId,
        userEmail: user.email,
        userName: `${user.first_name || ""} ${user.last_name || ""}`.trim(),
        subscriptionPlan: subscriptionData.subscriptionPlan,
        subscriptionId: subscriptionData.subscriptionId,
        paypalCustomerId: subscriptionData.paypalCustomerId,
        requiredAgents,
        requiredApiKeys,
        customerInfo: {
          companyName: onboarding?.company_name,
          industry: onboarding?.industry,
          targetMarket: onboarding?.target_market,
          businessSize: onboarding?.business_size,
          primaryGoals: onboarding?.primary_goals,
        },
        status: "pending_setup",
        createdAt: new Date(),
      };

      // Save to owner notifications table
      const { error } = await supabase.from("owner_notifications").insert({
        id: notification.id,
        notification_type: "new_subscription",
        user_id: userId,
        data: notification,
        status: "pending_setup",
        created_at: new Date().toISOString(),
      });

      if (error) {
        throw error;
      }

      // Send real-time notification to owner dashboard
      await this.sendRealTimeNotification(notification);

      // Send email notification to owner
      await this.sendEmailNotification(notification);

      console.log(
        `✅ Owner notification created for new subscription: ${userId}`
      );
    } catch (error) {
      console.error("Error creating owner notification:", error);
      throw error;
    }
  }

  /**
   * Update notification status when owner completes setup
   */
  async updateSetupStatus(
    notificationId: string,
    status: NewSubscriptionNotification["status"],
    apiKeysConfigured?: Record<string, boolean>
  ): Promise<void> {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === "completed") {
        updateData.completed_at = new Date().toISOString();
      }

      if (apiKeysConfigured) {
        // Update the data field with API key status
        const { data: notification } = await supabase
          .from("owner_notifications")
          .select("data")
          .eq("id", notificationId)
          .single();

        if (notification) {
          const updatedData = {
            ...notification.data,
            apiKeysConfigured,
            lastUpdated: new Date().toISOString(),
          };
          updateData.data = updatedData;
        }
      }

      const { error } = await supabase
        .from("owner_notifications")
        .update(updateData)
        .eq("id", notificationId);

      if (error) {
        throw error;
      }

      console.log(
        `✅ Owner notification updated: ${notificationId} -> ${status}`
      );
    } catch (error) {
      console.error("Error updating setup status:", error);
      throw error;
    }
  }

  /**
   * Get all pending setup notifications for owner dashboard
   */
  async getPendingSetups(): Promise<NewSubscriptionNotification[]> {
    try {
      const { data, error } = await supabase
        .from("owner_notifications")
        .select("*")
        .eq("notification_type", "new_subscription")
        .in("status", ["pending_setup", "api_keys_configured"])
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      return (
        data?.map((n) => ({
          ...(n.data as NewSubscriptionNotification),
          // Include the notification metadata
          id: n.id,
          userId: n.user_id,
          status: n.status,
          createdAt: n.created_at,
          completedAt: n.completed_at,
        })) || []
      );
    } catch (error) {
      console.error("Error getting pending setups:", error);
      return [];
    }
  }

  /**
   * Get required API keys based on agents
   */
  private getRequiredApiKeys(agents: string[]): string[] {
    const apiKeyMap: Record<string, string[]> = {
      falcon: ["OpenAI API Key", "Apollo.io API Key", "Apify API Key"],
      sage: ["OpenAI API Key", "Apify API Key", "Perplexity API Key"],
      sentinel: [
        "OpenAI API Key",
        "Gmail Client ID",
        "Gmail Client Secret",
        "Gmail Refresh Token",
        "Google Calendar Credentials",
      ],
    };

    const allKeys = new Set<string>();
    agents.forEach((agent) => {
      if (apiKeyMap[agent]) {
        apiKeyMap[agent].forEach((key) => allKeys.add(key));
      }
    });

    return Array.from(allKeys);
  }

  /**
   * Send real-time notification to owner dashboard
   */
  private async sendRealTimeNotification(
    notification: NewSubscriptionNotification
  ): Promise<void> {
    // This would integrate with your WebSocket system
    // For now, we'll just log it
    console.log("🔔 Real-time notification to owner:", {
      type: "new_subscription",
      user: notification.userEmail,
      plan: notification.subscriptionPlan,
      agents: notification.requiredAgents,
    });
  }

  /**
   * Send email notification to owner
   */
  private async sendEmailNotification(
    notification: NewSubscriptionNotification
  ): Promise<void> {
    // This would integrate with your email service
    console.log("📧 Email notification to owner:", {
      subject: `New SharpFlow Subscription: ${notification.userName} (${notification.subscriptionPlan})`,
      user: notification.userEmail,
      plan: notification.subscriptionPlan,
      company: notification.customerInfo.companyName,
      industry: notification.customerInfo.industry,
      requiredSetup: notification.requiredApiKeys,
    });
  }

  /**
   * Mark customer as ready after API keys are configured
   */
  async activateCustomerAgents(
    userId: string,
    notificationId: string
  ): Promise<void> {
    try {
      // Enable all configured agents for the user
      const { error: enableError } = await supabase
        .from("user_agent_configs")
        .update({
          is_enabled: true,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (enableError) {
        throw enableError;
      }

      // Activate user account (change activation_status to 'active')
      const { error: activateError } = await supabase
        .from("users")
        .update({
          activation_status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (activateError) {
        throw activateError;
      }

      // Update notification status
      await this.updateSetupStatus(notificationId, "completed");

      // Send welcome email to customer
      await this.sendCustomerWelcomeEmail(userId);

      console.log(
        `✅ Customer account and agents activated for user: ${userId}`
      );
    } catch (error) {
      console.error("Error activating customer agents:", error);
      throw error;
    }
  }

  /**
   * Send welcome email to customer when setup is complete
   */
  async sendCustomerWelcomeEmail(userId: string): Promise<void> {
    const { data: user } = await supabase
      .from("users")
      .select("email, first_name, subscription_plan")
      .eq("id", userId)
      .single();

    if (user) {
      console.log("📧 Welcome email to customer:", {
        to: user.email,
        subject: "Your SharpFlow AI Agents Are Ready!",
        message: `Hi ${user.first_name}, your ${user.subscription_plan} plan AI agents have been configured and are ready to use. You can now access your dashboard.`,
      });
    }
  }
}
